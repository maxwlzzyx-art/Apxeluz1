export interface SecurityHeadersOptions {
  /**
   * Whether the server is running in Vite dev mode (requires inline style injection for Vite CSS HMR/dev modules
   * and preview frame-ancestors when embedded inside AI Studio).
   */
  isDev?: boolean;
  /**
   * Whether the request arrived over HTTPS (or behind a TLS-terminating proxy like Vercel / Cloud Run).
   */
  isHttps?: boolean;
  /**
   * Explicit Supabase project URL (e.g. https://tgkldegrzhtmcpojkygh.supabase.co).
   */
  supabaseUrl?: string;
  /**
   * Allow embedding in AI Studio preview iframe during development/preview.
   */
  allowPreviewFrame?: boolean;
}

const DEFAULT_SUPABASE_ORIGIN = 'https://tgkldegrzhtmcpojkygh.supabase.co';
const DEFAULT_UNSPLASH_ORIGIN = 'https://images.unsplash.com';
const IMAGEKIT_ORIGIN = 'https://ik.imagekit.io';
const PHOTOTOURL_ORIGIN = 'https://cdn.phototourl.com';
const GOOGLE_FONTS_STYLE_ORIGIN = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FONT_ORIGIN = 'https://fonts.gstatic.com';

/**
 * Normalizes an HTTP(S) URL into its strict origin (`https://host[:port]`)
 * plus corresponding WebSocket origin (`wss://host[:port]`) for Supabase Realtime.
 */
export function extractOriginPair(rawUrl?: string): { httpsOrigin: string; wssOrigin: string } {
  const candidate = (rawUrl || DEFAULT_SUPABASE_ORIGIN).trim();
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error('Unsupported protocol');
    }
    const httpsOrigin = parsed.origin;
    const wssOrigin =
      parsed.protocol === 'https:'
        ? `wss://${parsed.host}`
        : `ws://${parsed.host}`;
    return { httpsOrigin, wssOrigin };
  } catch {
    const fallback = new URL(DEFAULT_SUPABASE_ORIGIN);
    return {
      httpsOrigin: fallback.origin,
      wssOrigin: `wss://${fallback.host}`,
    };
  }
}

/**
 * Builds a least-privilege Content-Security-Policy header value tailored to APXELUZ
 * (React + Vite + Express + Supabase + Google Fonts + Unsplash + ImageKit + PhotoToURL).
 */
export function buildContentSecurityPolicy(options: SecurityHeadersOptions = {}): string {
  const {
    isDev = false,
    supabaseUrl,
    allowPreviewFrame = isDev,
  } = options;

  const { httpsOrigin: supabaseHttp, wssOrigin: supabaseWss } = extractOriginPair(supabaseUrl);

  const imgSources = Array.from(
    new Set([
      "'self'",
      'data:',
      'blob:',
      supabaseHttp,
      DEFAULT_UNSPLASH_ORIGIN,
      IMAGEKIT_ORIGIN,
      PHOTOTOURL_ORIGIN,
    ])
  );

  const connectSources = Array.from(
    new Set([
      "'self'",
      supabaseHttp,
      supabaseWss,
      ...(isDev ? ['ws://localhost:24678'] : []),
    ])
  );

  const styleSources = isDev
    ? ["'self'", "'unsafe-inline'", GOOGLE_FONTS_STYLE_ORIGIN]
    : ["'self'", GOOGLE_FONTS_STYLE_ORIGIN];

  const frameAncestors = allowPreviewFrame
    ? ["'self'", 'https://*.google.com', 'https://localhost.corp.google.com:26001']
    : ["'self'"];

  const directives = [
    `default-src 'self'`,
    `script-src 'self'`,
    `style-src ${styleSources.join(' ')}`,
    `img-src ${imgSources.join(' ')}`,
    `font-src 'self' ${GOOGLE_FONTS_FONT_ORIGIN}`,
    `connect-src ${connectSources.join(' ')}`,
    `frame-ancestors ${frameAncestors.join(' ')}`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ];

  return directives.join('; ');
}

/**
 * Builds the full set of baseline HTTP security headers for APXELUZ.
 */
export function buildSecurityHeaders(options: SecurityHeadersOptions = {}): Record<string, string> {
  const {
    isDev = false,
    isHttps = !isDev,
    allowPreviewFrame = isDev,
  } = options;

  const headers: Record<string, string> = {
    'Content-Security-Policy': buildContentSecurityPolicy(options),
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'Permissions-Policy':
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  };

  if (!allowPreviewFrame) {
    headers['X-Frame-Options'] = 'SAMEORIGIN';
  }

  if (isHttps) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}
