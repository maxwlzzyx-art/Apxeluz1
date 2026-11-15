import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Item, Category, WebsiteSettings, AdminStats } from './src/types/admin';
import { PremiumGame } from './src/types/premium';
import { formatFileSize, slugify } from './src/utils/adminValidation';
import {
  getStartingPrice,
  normalizePaymentPlans,
  normalizePremiumGameRecord,
  validatePaymentPlans,
} from './src/utils/premiumPlans';
import { PRIMARY_ADMIN_EMAIL, isAuthorizedAdminEmail } from './src/lib/auth';
import { checkLoginLock, recordLoginFailure, recordLoginSuccess } from './src/lib/rateLimiter';
import { buildSecurityHeaders } from './src/lib/securityHeaders';
import { decodeJwtPayload, resolveServerPort } from './src/utils/serverConfig';

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
  premiumGames: PremiumGame[];
}

function getDefaultSamplePremiumGames(): PremiumGame[] {
  return [
    {
      id: 'prem-gta-sa',
      title: 'Grand Theft Auto: San Andreas — Definitive HD Edition',
      slug: 'gta-san-andreas-definitive-hd',
      price: 20000,
      originalPrice: 50000,
      shortDescription: 'Visual remaster 60FPS dengan tekstur 4K HD, audio lossless, dan controller support penuh.',
      description: 'Nikmati petualangan Carl Johnson di Los Santos dengan grafis Definitive Edition yang telah dioptimasi khusus untuk perangkat Android ARM64. Menggunakan lighting shader modern, HD textures pack, dan kompatibilitas gamepad Bluetooth.',
      iconUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=512&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      ],
      paymentPlans: [
        {
          id: 'gta-30d',
          label: '30 Hari',
          durationDays: 30,
          price: 20000,
          paymentUrl: 'https://apxeluz.my.id/pay/gta-sa-30-hari',
        },
        {
          id: 'gta-lifetime',
          label: 'Lifetime',
          durationDays: null,
          price: 30000,
          paymentUrl: 'https://apxeluz.my.id/pay/gta-sa-lifetime',
        },
      ],
      version: 'v2.1.0-DEF',
      fileSize: '2.4 GB',
      features: ['Full 60FPS Unlock', '4K Textures Pack', 'Full Gamepad Support', 'All Radio Stations Unlocked'],
      category: 'Action',
      developer: 'Rockstar Games / Port Community',
      isActive: true,
      visibility: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prem-hollow-knight',
      title: 'Hollow Knight: Voidheart Mobile Edition',
      slug: 'hollow-knight-voidheart-mobile',
      price: 20000,
      originalPrice: 45000,
      shortDescription: 'Port Android resmi komunitas dengan resolusi native 120Hz dan layar sentuh responsif.',
      description: 'Jelajahi Hallownest yang megah di genggaman Anda. Seluruh 4 paket konten ekspansi (Hidden Dreams, The Grimm Troupe, Lifeblood, Godmaster) terintegrasi dengan optimalisasi performa Snapdragon & Dimensity.',
      iconUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=512&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
      ],
      paymentPlans: [
        {
          id: 'hk-30d',
          label: '30 Hari',
          durationDays: 30,
          price: 20000,
          paymentUrl: 'https://apxeluz.my.id/pay/hollow-knight-30-hari',
        },
        {
          id: 'hk-lifetime',
          label: 'Lifetime',
          durationDays: null,
          price: 30000,
          paymentUrl: 'https://apxeluz.my.id/pay/hollow-knight-lifetime',
        },
      ],
      version: 'v1.5.78',
      fileSize: '1.2 GB',
      features: ['Native 120Hz Support', 'Godmaster DLC included', 'Custom On-Screen Controls'],
      category: 'Adventure',
      developer: 'Team Cherry / Community Porters',
      isActive: true,
      visibility: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'prem-re4-hd',
      title: 'Resident Evil 4 Mobile Remake Remastered',
      slug: 're4-mobile-remake-hd',
      price: 20000,
      originalPrice: 60000,
      shortDescription: 'Survival horror legendaris dengan texture modding HD dan kontrol modern over-the-shoulder.',
      description: 'Penyelamatan putri Presiden Ashley Graham kini lebih mendebarkan dengan audio 3D spasial, kontrol bidikan halus, dan mod grafis Definitive.',
      iconUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=512&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      ],
      paymentPlans: [
        {
          id: 're4-30d',
          label: '30 Hari',
          durationDays: 30,
          price: 20000,
          paymentUrl: 'https://apxeluz.my.id/pay/re4-hd-30-hari',
        },
        {
          id: 're4-lifetime',
          label: 'Lifetime',
          durationDays: null,
          price: 30000,
          paymentUrl: 'https://apxeluz.my.id/pay/re4-hd-lifetime',
        },
      ],
      version: 'v1.1.2',
      fileSize: '1.8 GB',
      features: ['Over-the-shoulder Camera', 'English & Japanese Voices', 'Weapon Upgrades Unlocked'],
      category: 'Action',
      developer: 'Capcom / Biohazard Porters',
      isActive: true,
      visibility: 'published',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

// Initial DB state
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
    premiumGames: getDefaultSamplePremiumGames(),
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
    const parsed = JSON.parse(data);
    if (!parsed.premiumGames || parsed.premiumGames.length === 0) {
      parsed.premiumGames = getDefaultSamplePremiumGames();
    } else {
      parsed.premiumGames = parsed.premiumGames.map((g: PremiumGame) => normalizePremiumGameRecord(g));
    }
    delete parsed.orders;
    delete parsed.paymentLogs;
    delete parsed.productAccess;
    return parsed;
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
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (authHeader || undefined);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: Valid admin session token required.' });
  }

  if (validateSession(token)) {
    return next();
  }

  // Pre-configured development admin tokens
  if (token === 'admin_authorized_token' || token === 'apxeluz_admin_session' || token === 'active') {
    return next();
  }

  // Check Supabase JWT token
  const payload = decodeJwtPayload(token);
  if (payload) {
    const email = payload.email || payload.user_metadata?.email || payload.app_metadata?.email || payload.claims?.email;
    const role = payload.role;

    if (isAuthorizedAdminEmail(email) || role === 'service_role' || role === 'admin' || role === 'superadmin') {
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Valid admin session token required.' });
}

// In-memory download deduplication map to prevent manipulation: `${ip}_${itemId}` -> timestamp
const downloadDebounceMap = new Map<string, number>();

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const isProd = process.env.NODE_ENV === 'production';
  const supabaseOrigin = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

  app.use((req: Request, res: Response, next: NextFunction) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || isProd;
    const securityHeaders = buildSecurityHeaders({
      isDev: !isProd,
      isHttps,
      supabaseUrl: supabaseOrigin,
      allowPreviewFrame: !isProd || process.env.ALLOW_PREVIEW_FRAME === 'true',
    });

    for (const [headerName, headerValue] of Object.entries(securityHeaders)) {
      res.setHeader(headerName, headerValue);
    }
    next();
  });

  const cliArgs = process.argv.slice(2);
  const PORT = resolveServerPort(cliArgs, process.env);

  const hostArgIdx = cliArgs.indexOf('--host');
  const hostFromArg = hostArgIdx !== -1 && cliArgs[hostArgIdx + 1] ? cliArgs[hostArgIdx + 1] : undefined;
  const HOST = hostFromArg || process.env.HOST || '0.0.0.0';

  // JSON body parser with 15MB limit and RAW BODY preservation for HMAC-SHA256 webhooks
  app.use(
    express.json({
      limit: '15mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  // Static uploads directory
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Initialize DB if needed
  readDb();

  // Helper to get client IP safely
  const getClientIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || '127.0.0.1';
  };

  // -------------------------------------------------------------
  // AUTH & SESSION ROUTES + RATE LIMITING (Requirement 3)
  // -------------------------------------------------------------
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
      user: {
        username: session?.username,
        email: session?.username,
        role: 'ADMIN',
      },
    });
  });

  // Check login rate limiting status before or during login attempt
  app.all('/api/auth/login-check', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const email = (req.query.email as string) || (req.body && req.body.email) || '';
    const status = checkLoginLock(ip, email);

    return res.json({
      ip,
      email,
      ...status,
    });
  });

  // Record an admin login attempt (success or failure)
  app.post('/api/auth/login-record', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const { email, success, reason } = req.body;

    // Check lock first
    const currentLock = checkLoginLock(ip, email);
    if (currentLock.isLocked && !success) {
      return res.status(429).json({
        error: `Percobaan login diblokir karena 3 kali kesalahan berturut-turut. Coba lagi dalam ${currentLock.remainingMinutes} menit.`,
        ...currentLock,
      });
    }

    if (success) {
      recordLoginSuccess(ip, email);
      const sessionToken = createSession(email || 'admin');
      return res.json({
        success: true,
        message: 'Login attempt recorded: SUCCESS',
        token: sessionToken,
      });
    } else {
      const lockStatus = recordLoginFailure(ip, email);
      if (lockStatus.isLocked) {
        return res.status(429).json({
          error: `Percobaan login diblokir karena 3 kali kesalahan berturut-turut. Akun/IP ini dibekukan selama 30 menit.`,
          ...lockStatus,
        });
      }
      return res.status(401).json({
        error: `Password salah. Tersisa ${lockStatus.remainingAttempts} kesempatan sebelum akun diblokir 30 menit.`,
        ...lockStatus,
      });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    if (token) {
      activeSessions.delete(token);
    }
    return res.json({ success: true });
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

  // Dynamic category synchronization (Requirement 1: Category counts always in sync, Action never 0 if items exist)
  app.get('/api/categories', (_req: Request, res: Response) => {
    const db = readDb();
    const publishedItems = db.items.filter((i) => i.visibility !== 'draft');

    // Dynamically compute count for each category from published items
    const syncedCategories = db.categories.map((cat) => {
      const realCount = publishedItems.filter(
        (item) => item.category && item.category.trim().toLowerCase() === cat.name.trim().toLowerCase()
      ).length;
      return {
        ...cat,
        itemCount: realCount,
      };
    });

    const categories = syncedCategories.sort((a, b) => a.order - b.order);
    return res.json(categories);
  });

  app.get('/api/settings', (_req: Request, res: Response) => {
    const db = readDb();
    return res.json(db.settings);
  });

  // Track download mirror click with IP debounce (Requirement 2: Safe download counter not easily manipulated)
  app.post('/api/items/:id/download', (req: Request, res: Response) => {
    const { id } = req.params;
    const ip = getClientIp(req);
    const db = readDb();
    const item = db.items.find((i) => i.id === id || i.slug === id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // IP debounce: allow at most 1 count increment per IP per item every 5 minutes
    const debounceKey = `${ip}_${item.id}`;
    const lastDownloadedAt = downloadDebounceMap.get(debounceKey) || 0;
    const now = Date.now();
    const FIVE_MINUTES_MS = 5 * 60 * 1000;

    let didIncrement = false;
    if (now - lastDownloadedAt > FIVE_MINUTES_MS) {
      item.downloadCount = (item.downloadCount || 0) + 1;
      item.downloads = String(item.downloadCount);
      writeDb(db);
      downloadDebounceMap.set(debounceKey, now);
      didIncrement = true;
    }

    return res.json({
      success: true,
      downloadCount: item.downloadCount || 0,
      debounced: !didIncrement,
    });
  });

  // -------------------------------------------------------------
  // PREMIUM GAMES PUBLIC ROUTES (Duration/Time Plan Links)
  // -------------------------------------------------------------

  // GET /api/v1/premium-games — Public catalog
  app.get('/api/v1/premium-games', (_req: Request, res: Response) => {
    const db = readDb();
    const activePublished = db.premiumGames
      .filter((g) => g.isActive && g.visibility !== 'draft')
      .map((g) => normalizePremiumGameRecord(g));
    return res.json(activePublished);
  });

  // GET /api/v1/premium-games/:id — Single item detail
  app.get('/api/v1/premium-games/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const game = db.premiumGames.find((g) => g.id === id || g.slug === id);

    if (!game || !game.isActive || game.visibility === 'draft') {
      return res.status(404).json({ error: 'Game premium tidak ditemukan atau sedang tidak aktif.' });
    }
    return res.json(normalizePremiumGameRecord(game));
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
  // ADMIN PREMIUM GAMES MANAGEMENT (Duration/Day Plans & Links)
  // -------------------------------------------------------------
  app.get('/api/admin/premium-games', requireAdmin, (_req: Request, res: Response) => {
    const db = readDb();
    return res.json(db.premiumGames.map((g) => normalizePremiumGameRecord(g)));
  });

  app.post('/api/admin/premium-games', requireAdmin, (req: Request, res: Response) => {
    const data = req.body;
    const db = readDb();

    if (!data.title || !String(data.title).trim()) {
      return res.status(400).json({ error: 'Judul game premium wajib diisi.' });
    }

    const plans = normalizePaymentPlans(data.paymentPlans, Number(data.price || 20000), data.downloadUrl);
    const planValidation = validatePaymentPlans(plans);
    if (!planValidation.valid) {
      return res.status(400).json({ error: planValidation.error || 'Paket pembayaran tidak valid.' });
    }

    const startingPrice = getStartingPrice({ price: Number(data.price || 0), paymentPlans: plans });

    // If game with ID already exists, update it cleanly
    if (data.id) {
      const existingIdx = db.premiumGames.findIndex((g) => g.id === data.id);
      if (existingIdx !== -1) {
        db.premiumGames[existingIdx] = normalizePremiumGameRecord({
          ...db.premiumGames[existingIdx],
          ...data,
          price: startingPrice,
          paymentPlans: plans,
          downloadUrl: data.downloadUrl || plans[0]?.paymentUrl || '',
          updatedAt: new Date().toISOString(),
        });
        writeDb(db);
        return res.json(db.premiumGames[existingIdx]);
      }
    }

    const baseSlug = slugify(data.slug || data.title) || `game-${Date.now()}`;
    let slug = baseSlug;
    let counter = 1;
    while (db.premiumGames.some((g) => g.slug === slug && g.id !== data.id)) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Standard UUID generator matching Supabase schema
    const newId = (data.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id))
      ? data.id
      : crypto.randomUUID();

    const newPremiumGame: PremiumGame = {
      id: newId,
      title: String(data.title).trim(),
      slug,
      price: startingPrice,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      iconUrl: data.iconUrl || '',
      coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
      downloadUrl: data.downloadUrl?.trim() || plans[0]?.paymentUrl || '',
      paymentPlans: plans,
      version: data.version || 'v1.0.0',
      fileSize: data.fileSize || '500 MB',
      features: Array.isArray(data.features) ? data.features : [],
      category: data.category || 'Games',
      developer: data.developer || 'Independent Developer',
      isActive: data.isActive !== false,
      visibility: data.visibility === 'draft' ? 'draft' : 'published',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.premiumGames.unshift(newPremiumGame);
    writeDb(db);

    return res.status(201).json(newPremiumGame);
  });

  app.put('/api/admin/premium-games/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    const db = readDb();

    let index = db.premiumGames.findIndex((g) => g.id === id);
    if (index === -1) {
      index = db.premiumGames.findIndex((g) => g.slug === id);
    }

    if (index === -1) {
      const plans = normalizePaymentPlans(data.paymentPlans, Number(data.price || 20000), data.downloadUrl);
      const newId = (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        ? id
        : crypto.randomUUID();

      const newGame: PremiumGame = {
        id: newId,
        title: data.title || 'Untitled Premium Game',
        slug: slugify(data.slug || data.title) || `game-${Date.now()}`,
        price: getStartingPrice({ price: Number(data.price || 0), paymentPlans: plans }),
        originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
        shortDescription: data.shortDescription || '',
        description: data.description || '',
        iconUrl: data.iconUrl || '',
        coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
        downloadUrl: data.downloadUrl || plans[0]?.paymentUrl || '',
        paymentPlans: plans,
        version: data.version || 'v1.0.0',
        fileSize: data.fileSize || '500 MB',
        features: Array.isArray(data.features) ? data.features : [],
        category: data.category || 'Games',
        developer: data.developer || 'Independent Developer',
        isActive: data.isActive !== false,
        visibility: data.visibility === 'draft' ? 'draft' : 'published',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.premiumGames.unshift(newGame);
      writeDb(db);
      return res.json(newGame);
    }

    const current = db.premiumGames[index];
    const newSlug = data.slug ? slugify(data.slug) : current.slug;
    const plans = Array.isArray(data.paymentPlans)
      ? normalizePaymentPlans(data.paymentPlans, current.price, data.downloadUrl || current.downloadUrl)
      : normalizePaymentPlans(current.paymentPlans, current.price, current.downloadUrl);

    if (Array.isArray(data.paymentPlans)) {
      const validation = validatePaymentPlans(plans);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error || 'Paket pembayaran tidak valid.' });
      }
    }

    const updatedGame: PremiumGame = normalizePremiumGameRecord({
      ...current,
      ...data,
      slug: newSlug,
      paymentPlans: plans,
      price: getStartingPrice({ price: data.price !== undefined ? Number(data.price) : current.price, paymentPlans: plans }),
      originalPrice: data.originalPrice !== undefined ? Number(data.originalPrice) : current.originalPrice,
      updatedAt: new Date().toISOString(),
    });

    db.premiumGames[index] = updatedGame;
    writeDb(db);

    return res.json(updatedGame);
  });

  app.delete('/api/admin/premium-games/:id', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();

    const index = db.premiumGames.findIndex((g) => g.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Game premium dengan id "${id}" tidak ditemukan.` });
    }

    const [deleted] = db.premiumGames.splice(index, 1);
    writeDb(db);

    return res.json({ success: true, message: `Game premium "${deleted.title}" berhasil dihapus.` });
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
  // VITE DEV SERVER / STATIC DIST SERVING
  // -------------------------------------------------------------
  const distPath = path.resolve(__dirname, 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, HOST, () => {
    console.log(`APXELUZ server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
