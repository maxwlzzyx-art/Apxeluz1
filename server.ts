import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Item, Category, WebsiteSettings, AdminStats } from './src/types/admin';
import { PremiumGame, Order, PaymentLog, ProductAccess } from './src/types/premium';
import { formatFileSize, slugify } from './src/utils/adminValidation';
import { isValidHttpUrl } from './src/utils/urlValidation';
import { PRIMARY_ADMIN_EMAIL, isAuthorizedAdminEmail } from './src/lib/auth';
import { checkLoginLock, recordLoginFailure, recordLoginSuccess } from './src/lib/rateLimiter';
import {
  createQiosPayInvoice,
  verifyQiosPaySignature,
  generateDownloadAccessToken,
  verifyDownloadAccessToken,
  getQiosPayConfig,
} from './src/lib/qiospayService';

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
  orders: Order[];
  paymentLogs: PaymentLog[];
  productAccess: ProductAccess[];
}

function getDefaultSamplePremiumGames(): PremiumGame[] {
  return [
    {
      id: 'prem-gta-sa',
      title: 'Grand Theft Auto: San Andreas — Definitive HD Edition',
      slug: 'gta-san-andreas-definitive-hd',
      price: 35000,
      originalPrice: 65000,
      shortDescription: 'Visual remaster 60FPS dengan tekstur 4K HD, audio lossless, dan controller support penuh.',
      description: 'Nikmati petualangan Carl Johnson di Los Santos dengan grafis Definitive Edition yang telah dioptimasi khusus untuk perangkat Android ARM64. Menggunakan lighting shader modern, HD textures pack, dan kompatibilitas gamepad Bluetooth.',
      iconUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=256&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
      ],
      downloadUrl: 'https://apxeluz.my.id/downloads/premium/gta_sa_def_v2.0_full.apk',
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
      price: 25000,
      originalPrice: 50000,
      shortDescription: 'Port Android resmi komunitas dengan resolusi native 120Hz dan layar sentuh responsif.',
      description: 'Jelajahi Hallownest yang megah di genggaman Anda. Seluruh 4 paket konten ekspansi (Hidden Dreams, The Grimm Troupe, Lifeblood, Godmaster) terintegrasi dengan optimalisasi performa Snapdragon & Dimensity.',
      iconUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=256&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
      ],
      downloadUrl: 'https://apxeluz.my.id/downloads/premium/hollow_knight_voidheart.apk',
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
      price: 40000,
      originalPrice: 70000,
      shortDescription: 'Survival horror legendaris dengan texture modding HD dan kontrol modern over-the-shoulder.',
      description: 'Penyelamatan putri Presiden Ashley Graham kini lebih mendebarkan dengan audio 3D spasial, kontrol bidikan halus, dan mod grafis Definitive.',
      iconUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=256&q=80',
      coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
      screenshots: [
        'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      ],
      downloadUrl: 'https://apxeluz.my.id/downloads/premium/re4_remake_hd.apk',
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
    orders: [],
    paymentLogs: [],
    productAccess: [],
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
    // Ensure all array properties exist
    if (!parsed.premiumGames || parsed.premiumGames.length === 0) {
      parsed.premiumGames = getDefaultSamplePremiumGames();
    }
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.paymentLogs) parsed.paymentLogs = [];
    if (!parsed.productAccess) parsed.productAccess = [];
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
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (validateSession(token)) {
    return next();
  }

  // Check Supabase JWT token
  if (token && token.split('.').length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
      if (payload && payload.exp && payload.exp * 1000 > Date.now()) {
        const email = payload.email;
        if (isAuthorizedAdminEmail(email)) {
          return next();
        }
      }
    } catch {
      // Continue to unauthorized response
    }
  }

  return res.status(401).json({ error: 'Unauthorized: Valid admin session token required.' });
}

// In-memory download deduplication map to prevent manipulation: `${ip}_${itemId}` -> timestamp
const downloadDebounceMap = new Map<string, number>();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

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
      return res.json({ success: true, message: 'Login attempt recorded: SUCCESS' });
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
  // PREMIUM GAMES & QIOSPAY PAYMENT ENDPOINTS (Requirement 4, 5, 6, 7)
  // -------------------------------------------------------------

  // GET /api/v1/premium-games — Public catalog
  app.get('/api/v1/premium-games', (_req: Request, res: Response) => {
    const db = readDb();
    const activePublished = db.premiumGames.filter((g) => g.isActive && g.visibility !== 'draft');
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
    return res.json(game);
  });

  // POST /api/v1/checkout/create — Create Order & QiosPay Invoice
  app.post('/api/v1/checkout/create', async (req: Request, res: Response) => {
    try {
      const { gameId, customerName, customerEmail } = req.body;

      if (!gameId || !customerName || !customerEmail) {
        return res.status(400).json({ error: 'gameId, customerName, dan customerEmail wajib diisi.' });
      }

      // Validasi email
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        return res.status(400).json({ error: 'Alamat email tidak valid.' });
      }

      const db = readDb();
      // Server-side price validation: ALWAYS fetch true price from DB
      const game = db.premiumGames.find((g) => g.id === gameId || g.slug === gameId);
      if (!game) {
        return res.status(404).json({ error: 'Produk game premium tidak ditemukan.' });
      }

      const realAmount = Number(game.price);
      if (isNaN(realAmount) || realAmount <= 0) {
        return res.status(400).json({ error: 'Harga produk tidak valid.' });
      }

      // Create unique order ID
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // Call QiosPay Invoice API
      const invoiceResult = await createQiosPayInvoice({
        refId: orderId,
        amount: realAmount,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        productName: game.title,
        returnUrl: `${req.protocol}://${req.get('host')}/premium?order_id=${orderId}`,
        callbackUrl: `${req.protocol}://${req.get('host')}/api/v1/webhooks/qiospay`,
      });

      if (!invoiceResult.success) {
        return res.status(500).json({
          error: invoiceResult.error || 'Gagal membuat invoice pembayaran QiosPay.',
        });
      }

      const newOrder: Order = {
        id: orderId,
        gameId: game.id,
        gameTitle: game.title,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        amount: realAmount,
        status: 'PENDING',
        qiospayInvoiceId: invoiceResult.invoiceId,
        qiospayPaymentUrl: invoiceResult.paymentUrl,
        qiospayQrString: invoiceResult.qrString,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.orders.unshift(newOrder);
      writeDb(db);

      return res.status(201).json({
        success: true,
        orderId,
        invoiceId: invoiceResult.invoiceId,
        paymentUrl: invoiceResult.paymentUrl,
        qrString: invoiceResult.qrString,
        amount: realAmount,
        status: 'PENDING',
        gameTitle: game.title,
        isSandbox: invoiceResult.isSandbox,
      });
    } catch (err: any) {
      console.error('Checkout creation error:', err);
      return res.status(500).json({ error: 'Terjadi kesalahan sistem saat memproses checkout.' });
    }
  });

  // GET /api/v1/transactions/:id — Query order status
  app.get('/api/v1/transactions/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();
    const order = db.orders.find((o) => o.id === id || o.qiospayInvoiceId === id);

    if (!order) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }

    // Check if product access token already generated
    const access = db.productAccess.find((pa) => pa.orderId === order.id);
    const downloadToken = access ? access.downloadToken : order.downloadToken;

    return res.json({
      orderId: order.id,
      gameId: order.gameId,
      gameTitle: order.gameTitle,
      amount: order.amount,
      status: order.status,
      paymentUrl: order.qiospayPaymentUrl,
      qrString: order.qiospayQrString,
      invoiceId: order.qiospayInvoiceId,
      downloadToken,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
    });
  });

  // POST /api/v1/webhooks/qiospay — Secure QiosPay Callback with HMAC-SHA256 & TimingSafeEqual
  app.post('/api/v1/webhooks/qiospay', (req: Request, res: Response) => {
    try {
      const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
      const body = req.body || {};

      // Retrieve signature and timestamp from headers or payload
      const signature =
        (req.headers['x-signature'] as string) ||
        (req.headers['x-qiospay-signature'] as string) ||
        (req.headers['x-callback-signature'] as string) ||
        body.signature ||
        '';

      const timestamp =
        (req.headers['x-timestamp'] as string) ||
        (req.headers['x-qiospay-timestamp'] as string) ||
        (req.headers['x-callback-timestamp'] as string) ||
        body.timestamp ||
        Date.now();

      const ip = getClientIp(req);

      // Verify HMAC-SHA256 signature
      const verification = verifyQiosPaySignature({
        rawBody,
        timestamp,
        signature,
      });

      const db = readDb();

      // Log callback attempt
      const logEntry: PaymentLog = {
        id: `plog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        orderId: body.ref_id || body.order_id || 'unknown',
        invoiceId: body.invoice_id,
        eventType: body.event || 'unknown',
        status: body.status || 'unknown',
        amount: body.amount ? Number(body.amount) : undefined,
        ipAddress: ip,
        signatureValid: verification.isValid,
        createdAt: new Date().toISOString(),
      };
      db.paymentLogs.unshift(logEntry);

      if (!verification.isValid) {
        console.warn(`[QiosPay Webhook] Invalid signature from IP ${ip}: ${verification.reason}`);
        writeDb(db);
        return res.status(401).json({
          success: false,
          error: `Verifikasi tanda tangan webhook gagal: ${verification.reason}`,
        });
      }

      // Handle ping event
      if (body.event === 'ping') {
        writeDb(db);
        return res.json({ success: true, message: 'pong' });
      }

      const refId = body.ref_id || body.order_id;
      const order = db.orders.find((o) => o.id === refId || o.qiospayInvoiceId === body.invoice_id);

      if (!order) {
        writeDb(db);
        return res.status(404).json({ error: `Order ref_id "${refId}" tidak ditemukan di database.` });
      }

      // Idempotency: if order is already PAID, return 200 without duplicate processing
      if (order.status === 'PAID') {
        writeDb(db);
        return res.json({ success: true, message: 'Transaksi ini telah diproses sebelumnya (Idempotent).' });
      }

      // Verify nominal amount matches database order
      if (body.amount && Number(body.amount) !== Number(order.amount)) {
        console.error(`[QiosPay Webhook] Nominal mismatch: expected ${order.amount}, received ${body.amount}`);
        writeDb(db);
        return res.status(400).json({ error: 'Nominal transaksi tidak cocok dengan database.' });
      }

      // Event handling
      if (body.event === 'invoice.paid' || body.status === 'PAID') {
        order.status = 'PAID';
        order.paidAt = new Date().toISOString();
        order.paymentMethod = body.payment_method || 'QRIS';

        // Generate cryptographic, time-limited download access token
        const tokenInfo = generateDownloadAccessToken({
          orderId: order.id,
          gameId: order.gameId,
          customerEmail: order.customerEmail,
          expiresInHours: 48, // 48 hour download window
        });

        order.downloadToken = tokenInfo.token;

        const access: ProductAccess = {
          id: `pa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderId: order.id,
          gameId: order.gameId,
          customerEmail: order.customerEmail,
          downloadToken: tokenInfo.token,
          downloadCount: 0,
          expiresAt: tokenInfo.expiresAt,
          createdAt: new Date().toISOString(),
        };

        db.productAccess.unshift(access);
        writeDb(db);

        console.log(`[QiosPay Webhook] Order ${order.id} marked as PAID. Download token created.`);
        return res.json({
          success: true,
          message: 'Pembayaran terverifikasi dan hak akses download telah diberikan.',
          orderId: order.id,
        });
      } else if (body.event === 'invoice.expired' || body.status === 'EXPIRED') {
        order.status = 'EXPIRED';
        order.updatedAt = new Date().toISOString();
        writeDb(db);
        return res.json({ success: true, message: 'Status order diperbarui: EXPIRED' });
      } else if (body.event === 'invoice.cancelled' || body.status === 'CANCELLED') {
        order.status = 'CANCELLED';
        order.updatedAt = new Date().toISOString();
        writeDb(db);
        return res.json({ success: true, message: 'Status order diperbarui: CANCELLED' });
      }

      writeDb(db);
      return res.json({ success: true, message: 'Event diterima' });
    } catch (err: any) {
      console.error('QiosPay webhook processing error:', err);
      return res.status(500).json({ error: 'Internal webhook error' });
    }
  });

  // POST /api/v1/download/access — Verify token and grant download URL
  app.post('/api/v1/download/access', (req: Request, res: Response) => {
    const { token, orderId, email } = req.body;

    const db = readDb();

    // 1. Token verification route
    if (token) {
      const verifyResult = verifyDownloadAccessToken(token);
      if (!verifyResult.valid) {
        return res.status(403).json({
          error: verifyResult.reason || 'Token akses download tidak valid atau telah kedaluwarsa.',
        });
      }

      const game = db.premiumGames.find((g) => g.id === verifyResult.gameId);
      if (!game) {
        return res.status(404).json({ error: 'File game premium tidak ditemukan.' });
      }

      return res.json({
        success: true,
        downloadUrl: game.downloadUrl,
        gameTitle: game.title,
        version: game.version,
        fileSize: game.fileSize,
      });
    }

    // 2. Order ID + Email lookup route
    if (orderId && email) {
      const cleanEmail = email.trim().toLowerCase();
      const order = db.orders.find(
        (o) => o.id === orderId && o.customerEmail.toLowerCase() === cleanEmail
      );

      if (!order) {
        return res.status(404).json({ error: 'Pesanan tidak ditemukan atau email tidak sesuai.' });
      }

      if (order.status !== 'PAID') {
        return res.status(403).json({
          error: `Pesanan belum dibayar (Status: ${order.status}). Selesaikan pembayaran untuk mengunduh.`,
        });
      }

      const game = db.premiumGames.find((g) => g.id === order.gameId);
      if (!game) {
        return res.status(404).json({ error: 'File game premium tidak ditemukan.' });
      }

      return res.json({
        success: true,
        downloadUrl: game.downloadUrl,
        gameTitle: game.title,
        version: game.version,
        fileSize: game.fileSize,
        downloadToken: order.downloadToken,
      });
    }

    return res.status(400).json({ error: 'Token atau Order ID dan Email wajib disertakan.' });
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
  // ADMIN PREMIUM GAMES & ORDERS MANAGEMENT (Requirement 4 & 5)
  // -------------------------------------------------------------
  app.get('/api/admin/premium-games', requireAdmin, (_req: Request, res: Response) => {
    const db = readDb();
    return res.json(db.premiumGames);
  });

  app.post('/api/admin/premium-games', requireAdmin, (req: Request, res: Response) => {
    const data = req.body;
    const db = readDb();

    if (!data.title || !data.downloadUrl) {
      return res.status(400).json({ error: 'Judul dan Download URL wajib diisi.' });
    }

    const slug = slugify(data.slug || data.title);
    const existing = db.premiumGames.find((g) => g.slug === slug);
    if (existing) {
      return res.status(400).json({ error: `Game dengan slug "${slug}" sudah ada.` });
    }

    const price = Number(data.price || 0);

    const newPremiumGame: PremiumGame = {
      id: `prem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      slug,
      price,
      originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
      shortDescription: data.shortDescription || '',
      description: data.description || '',
      iconUrl: data.iconUrl || '',
      coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
      downloadUrl: data.downloadUrl.trim(),
      version: data.version || 'v1.0.0',
      fileSize: data.fileSize || '500 MB',
      features: Array.isArray(data.features) ? data.features : [],
      category: data.category || 'Games',
      developer: data.developer || 'Independent Developer',
      isActive: data.isActive !== false,
      visibility: data.visibility === 'draft' ? 'draft' : 'published',
      createdAt: new Date().toISOString(),
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

    const index = db.premiumGames.findIndex((g) => g.id === id);
    if (index === -1) {
      return res.status(404).json({ error: `Game premium dengan id "${id}" tidak ditemukan.` });
    }

    const current = db.premiumGames[index];
    const newSlug = data.slug ? slugify(data.slug) : current.slug;

    // Check collision
    const collision = db.premiumGames.find((g) => g.slug === newSlug && g.id !== id);
    if (collision) {
      return res.status(400).json({ error: `Slug "${newSlug}" sudah digunakan oleh game lain.` });
    }

    const updatedGame: PremiumGame = {
      ...current,
      ...data,
      slug: newSlug,
      price: data.price !== undefined ? Number(data.price) : current.price,
      originalPrice: data.originalPrice !== undefined ? Number(data.originalPrice) : current.originalPrice,
      updatedAt: new Date().toISOString(),
    };

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

  app.get('/api/admin/orders', requireAdmin, (_req: Request, res: Response) => {
    const db = readDb();
    return res.json({
      orders: db.orders,
      logs: db.paymentLogs.slice(0, 50),
    });
  });

  app.put('/api/admin/orders/:id/status', requireAdmin, (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;
    const db = readDb();

    const order = db.orders.find((o) => o.id === id);
    if (!order) {
      return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
    }

    if (!['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid.' });
    }

    order.status = status as any;
    order.updatedAt = new Date().toISOString();

    if (status === 'PAID' && !order.downloadToken) {
      order.paidAt = new Date().toISOString();
      const tokenInfo = generateDownloadAccessToken({
        orderId: order.id,
        gameId: order.gameId,
        customerEmail: order.customerEmail,
      });
      order.downloadToken = tokenInfo.token;

      db.productAccess.unshift({
        id: `pa-${Date.now()}`,
        orderId: order.id,
        gameId: order.gameId,
        customerEmail: order.customerEmail,
        downloadToken: tokenInfo.token,
        downloadCount: 0,
        expiresAt: tokenInfo.expiresAt,
        createdAt: new Date().toISOString(),
      });
    }

    writeDb(db);
    return res.json({ success: true, order });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`APXELUZ server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
