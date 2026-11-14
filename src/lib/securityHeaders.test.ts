import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
  extractOriginPair,
} from './securityHeaders';

test('CSP Production: includes all 10 required directives with strict least-privilege', () => {
  const csp = buildContentSecurityPolicy({ isDev: false, allowPreviewFrame: false });

  const requiredDirectives = [
    'default-src',
    'script-src',
    'style-src',
    'img-src',
    'font-src',
    'connect-src',
    'frame-ancestors',
    'object-src',
    'base-uri',
    'form-action',
  ];

  for (const directive of requiredDirectives) {
    assert.ok(csp.includes(`${directive} `), `Missing directive: ${directive}`);
  }

  assert.ok(csp.includes("default-src 'self'"));
  assert.ok(csp.includes("script-src 'self'"));
  assert.ok(csp.includes("style-src 'self' https://fonts.googleapis.com"));
  assert.ok(csp.includes("img-src 'self' data: blob: https://tgkldegrzhtmcpojkygh.supabase.co https://images.unsplash.com https://ik.imagekit.io"));
  assert.ok(csp.includes("font-src 'self' https://fonts.gstatic.com"));
  assert.ok(csp.includes("frame-ancestors 'self'"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("base-uri 'self'"));
  assert.ok(csp.includes("form-action 'self'"));

  // Must NOT permit unsafe-inline, unsafe-eval, dev localhost WS, or wildcard '*' in production
  assert.equal(csp.includes("'unsafe-inline'"), false);
  assert.equal(csp.includes("'unsafe-eval'"), false);
  assert.equal(csp.includes('ws://localhost:24678'), false);
  assert.equal(/\s\*(?:;|$|\s)/.test(csp), false);
});

test('CSP Development: allows Vite inline dev style injection without unsafe-eval or script unsafe-inline', () => {
  const csp = buildContentSecurityPolicy({ isDev: true });
  assert.ok(csp.includes("script-src 'self';"));
  assert.ok(csp.includes("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;"));
  assert.ok(csp.includes('ws://localhost:24678'));
  assert.ok(csp.includes("frame-ancestors 'self' https://*.google.com"));
});

test('extractOriginPair: normalizes Supabase URL with trailing paths into exact origins', () => {
  const pair = extractOriginPair('https://customproject.supabase.co/rest/v1/');
  assert.equal(pair.httpsOrigin, 'https://customproject.supabase.co');
  assert.equal(pair.wssOrigin, 'wss://customproject.supabase.co');
});

test('buildSecurityHeaders: emits Referrer-Policy and additional security headers accurately', () => {
  const prodHeaders = buildSecurityHeaders({ isDev: false, isHttps: true, allowPreviewFrame: false });
  assert.equal(prodHeaders['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.equal(prodHeaders['X-Content-Type-Options'], 'nosniff');
  assert.equal(prodHeaders['X-Frame-Options'], 'SAMEORIGIN');
  assert.equal(prodHeaders['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains');
  assert.ok(prodHeaders['Permissions-Policy'].includes('camera=()'));
  assert.ok(prodHeaders['Permissions-Policy'].includes('geolocation=()'));

  // HTTP localhost dev should not emit HSTS
  const devHttpHeaders = buildSecurityHeaders({ isDev: true, isHttps: false });
  assert.equal(devHttpHeaders['Strict-Transport-Security'], undefined);
  assert.equal(devHttpHeaders['X-Frame-Options'], undefined);
  assert.equal(devHttpHeaders['Referrer-Policy'], 'strict-origin-when-cross-origin');
});
