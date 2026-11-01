import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Item, Category, WebsiteSettings, AdminStats } from './src/types/admin';
import { formatFileSize, slugify, validatePasswordStrength } from './src/utils/adminValidation';
import { isValidHttpUrl } from './src/utils/urlValidation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'database.json');
const UPLOADS_DIR = path.resolve(__dirname, 'uploads');

// Ensure data and uploads directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Password hashing helper
const SALT = 'apxeluz_secure_salt_2026';
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(SALT + password).digest('hex');
}

interface DatabaseSchema {
  admin: {
    username: string;
    passwordHash: string;
  };
  items: Item[];
  categories: Category[];
  settings: WebsiteSettings;
}

// Initial DB state (default credentials axeluf / axeluf123 per requirement 4)
function getInitialDb(): DatabaseSchema {
  return {
    admin: {
      username: process.env.ADMIN_USER || 'axeluf',
      passwordHash: hashPassword(process.env.ADMIN_PASS || 'axeluf123'),
    },
    items: [],
    categories: [],
    settings: {
      siteName: 'APXELUZ',
      siteDescription: 'App & Mod Repository with Apple Liquid Glass Design',
      announcement: '',
      enableDownloads: true,
      maintenanceMode: false,
      defaultArchitecture: 'ARM64',
    },
  };
}

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed reading database, returning default', err);
    return getInitialDb();
  }
}

function writeDb(db: DatabaseSchema): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed writing database', err);
  }
}

// In-memory active session tokens: token -> { username, expiresAt }
const activeSessions = new Map<string, { username: string; expiresAt: number }>();

function createSession(username: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  activeSessions.set(token, { username, expiresAt });
  return token;
}

function validateSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

// Auth Middleware to protect admin routes
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!validateSession(token)) {
    return res.status(401).json({ error: 'Unauthorized: Valid admin session token required.' });
  }
  next();
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // JSON body parser with 15MB limit for image uploads
  app.use(express.json({ limit: '15mb' }));

  // Static uploads directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Initialize DB if needed
  readDb();

  // -------------------------------------------------------------
  // AUTH ROUTES
  // -------------------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const db = readDb();
    const inputHash = hashPassword(password);

    if (username.trim() === db.admin.username && inputHash === db.admin.passwordHash) {
      const token = createSession(db.admin.username);
      return res.json({
        success: true,
        token,
        user: { username: db.admin.username },
      });
    }

    return res.status(401).json({ error: 'Invalid administrator username or password.' });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const isValid = validateSession(token);

    if (!isValid) {
      return res.json({ authenticated: false });
    }

    const session = activeSessions.get(token!);
    return res.json({
      authenticated: true,
      user: { username: session?.username },
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (token) {
      activeSessions.delete(token);
    }
    return res.json({ success: true });
  });

  app.post('/api/auth/change-credentials', requireAdmin, (req: Request, res: Response) => {
    const { currentPassword, newUsername, newPassword } = req.body;
    const db = readDb();

    if (hashPassword(currentPassword) !== db.admin.passwordHash) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    if (newPassword) {
      const strength = validatePasswordStrength(newPassword);
      if (!strength.isValid) {
        return res.status(400).json({ error: strength.message });
      }
      db.admin.passwordHash = hashPassword(newPassword);
    }

    if (newUsername && newUsername.trim().length >= 3) {
      db.admin.username = newUsername.trim();
    }

    writeDb(db);
    return res.json({ success: true, message: 'Administrator credentials updated successfully.' });
  });

  // -------------------------------------------------------------
  // PUBLIC READ-ONLY ROUTES
  // -------------------------------------------------------------
  app.get('/api/items', (_req: Request, res: Response) => {
    const db = readDb();
    // Visitors only see published items
    const published = db.items.filter((item) => item.visibility !== 'draft');
    return res.json(published);
  });

  app.get('/api/items/:slug', (req: Request, res: Response) => {
    const { slug } = req.params;
    const db = readDb();
    const item = db.items.find((i) => i.slug.toLowerCase() === slug.toLowerCase());

    if (!item || item.visibility === 'draft') {
      return res.status(404).json({ error: `Item with slug "${slug}" not found.` });
    }
    return res.json(item);
  });

  app.get('/api/categories', (_req: Request, res: Response) => {
    const db = readDb();
    const categories = [...db.categories].sort((a, b) => a.order - b.order);
    return res.json(categories);
  });

  app.get('/api/settings', (_req: Request, res: Response) => {
    const db = readDb();
    return res.json(db.settings);
  });

  // Track download mirror click without downloading files on server
  app.post('/api/items/:id/download', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const item = db.items.find((i) => i.id === id || i.slug === id);
    if (item) {
      item.downloadCount = (item.downloadCount || 0) + 1;
      item.downloads = String(item.downloadCount);
      writeDb(db);
      return res.json({ success: true, downloadCount: item.downloadCount });
    }
    return res.status(404).json({ error: 'Item not found' });
  });

  // -------------------------------------------------------------
  // PROTECTED ADMIN ROUTES (CRUD & Storage)
  // -------------------------------------------------------------
  app.get('/api/admin/stats', requireAdmin, (_req: Request, res: Response) => {
    const db = readDb();
    const totalGames = db.items.filter((i) => i.type === 'game').length;
    const totalMods = db.items.filter((i) => i.type === 'mod').length;
    const totalApps = db.items.filter((i) => i.type === 'app').length;
    const totalCategories = db.categories.length;
    const totalDownloads = db.items.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
    const recentItems = [...db.items]
      .sort((a, b) => new Date(b.updatedDate || b.releaseDate).getTime() - new Date(a.updatedDate || a.releaseDate).getTime())
      .slice(0, 5);

    const stats: AdminStats = {
      totalGames,
      totalMods,
      totalApps,
      totalCategories,
      totalDownloads,
      recentItems,
    };
    return res.json(stats);
  });

  app.get('/api/admin/items', requireAdmin, (_req: Request, res: Response) => {
    const db = readDb();
    return res.json(db.items);
  });

  app.post('/api/admin/items', requireAdmin, (req: Request, res: Response) => {
    const data = req.body;
    const db = readDb();

    // Check slug uniqueness
    const slug = slugify(data.slug || data.title);
    if (!slug) {
      return res.status(400).json({ error: 'A valid title or slug is required.' });
    }

    const existing = db.items.find((i) => i.slug === slug);
    if (existing) {
      return res.status(400).json({ error: `An item with slug "${slug}" already exists.` });
    }

    const fileSizeValue = data.fileSizeValue || 100;
    const fileSizeUnit = data.fileSizeUnit === 'GB' ? 'GB' : 'MB';
    const formattedFileSize = formatFileSize(fileSizeValue, fileSizeUnit);

    const newItem: Item = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: data.type || 'game',
      title: data.title.trim(),
      slug,
      version: data.version?.trim() || 'v1.0.0',
      status: data.status === 'Official' ? 'Official' : 'Unofficial',
      category: data.category?.trim() || 'Action',
      tags: Array.isArray(data.tags) ? data.tags : (data.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean),
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      developer: data.developer?.trim() || 'Independent Developer',
      porter: data.porter?.trim() || '',
      platform: data.platform || 'Android',
      minAndroid: data.minAndroid || 'Android 8.0+',
      architecture: data.architecture || 'ARM64',
      obbRequired: Boolean(data.obbRequired),
      fileSizeValue,
      fileSizeUnit,
      formattedFileSize,
      iconUrl: data.iconUrl || '',
      coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
      bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
      downloadLinks: Array.isArray(data.downloadLinks) ? data.downloadLinks : [
        {
          id: 'dl-1',
          name: 'Primary Mirror',
          url: data.downloadUrl || 'https://example.com/download.apk',
          isPrimary: true,
          version: data.version || 'v1.0.0',
          notes: data.downloadNotes || '',
        }
      ],
      rating: 5.0,
      ratingCount: 1,
      downloads: '0',
      downloadCount: 0,
      releaseDate: data.releaseDate || new Date().toISOString().split('T')[0],
      updatedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isNewlyAdded: true,
      isFeatured: Boolean(data.isFeatured),
      isPopular: false,
      visibility: data.visibility === 'draft' ? 'draft' : 'published',
      changelog: Array.isArray(data.changelog) ? data.changelog : [
        { version: data.version || 'v1.0.0', date: 'Initial Release', changes: ['Initial release published'] }
      ],
      sha256: data.sha256 || crypto.randomBytes(32).toString('hex'),
    };

    db.items.unshift(newItem);

    // Update category item count
    const cat = db.categories.find((c) => c.name.toLowerCase() === newItem.category.toLowerCase());
    if (cat) {
      cat.itemCount = (cat.itemCount || 0) + 1;
    }

    writeDb(db);
    return res.status(201).json(newItem);
  });

  app.put('/api/admin/items/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    const db = readDb();

    const index = db.items.findIndex((i) => i.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Item with id "${id}" not found.` });
    }

    const current = db.items[index];
    const newSlug = data.slug ? slugify(data.slug) : current.slug;

    // Check slug collision with other items
    const collision = db.items.find((i) => i.slug === newSlug && i.id !== id);
    if (collision) {
      return res.status(400).json({ error: `Slug "${newSlug}" is already in use by another item.` });
    }

    const fileSizeValue = data.fileSizeValue !== undefined ? data.fileSizeValue : current.fileSizeValue;
    const fileSizeUnit = data.fileSizeUnit || current.fileSizeUnit;
    const formattedFileSize = formatFileSize(fileSizeValue, fileSizeUnit);

    const updatedItem: Item = {
      ...current,
      ...data,
      slug: newSlug,
      fileSizeValue,
      fileSizeUnit,
      formattedFileSize,
      updatedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    db.items[index] = updatedItem;
    writeDb(db);
    return res.json(updatedItem);
  });

  app.delete('/api/admin/items/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();

    const index = db.items.findIndex((i) => i.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Item with id "${id}" not found.` });
    }

    const [deleted] = db.items.splice(index, 1);

    // Decrement category item count
    const cat = db.categories.find((c) => c.name.toLowerCase() === deleted.category.toLowerCase());
    if (cat && cat.itemCount > 0) {
      cat.itemCount -= 1;
    }

    writeDb(db);
    return res.json({ success: true, message: `Item "${deleted.title}" deleted.` });
  });

  // -------------------------------------------------------------
  // CATEGORIES CRUD
  // -------------------------------------------------------------
  app.post('/api/admin/categories', requireAdmin, (req: Request, res: Response) => {
    const { name, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required.' });
    }

    const db = readDb();
    const slug = slugify(name);
    const existing = db.categories.find((c) => c.slug === slug);
    if (existing) {
      return res.status(400).json({ error: `Category "${name}" already exists.` });
    }

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      slug,
      icon: icon || 'Sparkles',
      order: db.categories.length + 1,
      itemCount: 0,
    };

    db.categories.push(newCat);
    writeDb(db);
    return res.status(201).json(newCat);
  });

  app.put('/api/admin/categories/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, icon, order } = req.body;
    const db = readDb();

    const cat = db.categories.find((c) => c.id === id);
    if (!cat) {
      return res.status(404).json({ error: `Category with id "${id}" not found.` });
    }

    if (name) {
      cat.name = name.trim();
      cat.slug = slugify(name);
    }
    if (icon) cat.icon = icon;
    if (order !== undefined) cat.order = order;

    writeDb(db);
    return res.json(cat);
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();

    const index = db.categories.findIndex((c) => c.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Category with id "${id}" not found.` });
    }

    db.categories.splice(index, 1);
    writeDb(db);
    return res.json({ success: true });
  });

  app.put('/api/admin/categories/reorder', requireAdmin, (req: Request, res: Response) => {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds array is required.' });
    }

    const db = readDb();
    orderedIds.forEach((id: string, index: number) => {
      const cat = db.categories.find((c) => c.id === id);
      if (cat) cat.order = index + 1;
    });

    writeDb(db);
    return res.json({ success: true, categories: db.categories });
  });

  // -------------------------------------------------------------
  // WEBSITE SETTINGS
  // -------------------------------------------------------------
  app.get('/api/admin/settings', requireAdmin, (_req: Request, res: Response) => {
    const db = readDb();
    return res.json(db.settings);
  });

  app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
    const db = readDb();
    db.settings = {
      ...db.settings,
      ...req.body,
    };
    writeDb(db);
    return res.json(db.settings);
  });

  // -------------------------------------------------------------
  // IMAGE FILE UPLOAD (Requirement 6)
  // -------------------------------------------------------------
  app.post('/api/admin/upload-image', requireAdmin, (req: Request, res: Response) => {
    const { filename, base64Data } = req.body;
    if (!filename || !base64Data) {
      return res.status(400).json({ error: 'filename and base64Data are required.' });
    }

    // Extract base64 payload
    const matches = base64Data.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data URI format.' });
    }

    const mimeType = matches[1];
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowedMime.includes(mimeType.toLowerCase())) {
      return res.status(400).json({ error: 'Unsupported image type. Only JPEG, PNG, WEBP, and SVG are allowed.' });
    }

    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds maximum 8MB limit.' });
    }

    const ext = path.extname(filename) || (mimeType === 'image/png' ? '.png' : '.jpg');
    const safeBase = slugify(path.basename(filename, ext)) || 'upload';
    const uniqueFilename = `${safeBase}-${Date.now()}${ext}`;
    const destinationPath = path.resolve(UPLOADS_DIR, uniqueFilename);

    try {
      fs.writeFileSync(destinationPath, buffer);
      const publicUrl = `/uploads/${uniqueFilename}`;
      return res.json({
        success: true,
        url: publicUrl,
        filename: uniqueFilename,
        sizeBytes: buffer.length,
      });
    } catch (err) {
      console.error('Failed saving image upload', err);
      return res.status(500).json({ error: 'Failed to write uploaded image to disk.' });
    }
  });

  // -------------------------------------------------------------
  // VITE DEV SERVER INTEGRATION
  // -------------------------------------------------------------
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`APXELUZ server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
