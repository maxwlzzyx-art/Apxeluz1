import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeFetchJson } from './apiClient';

test('safeFetchJson successfully parses standard JSON responses', async () => {
  // Mock global fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: true, token: 'abc123token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const res = await safeFetchJson<{ success: boolean; token: string }>('/api/test');
    assert.equal(res.ok, true);
    assert.equal(res.status, 200);
    assert.equal(res.data?.success, true);
    assert.equal(res.data?.token, 'abc123token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetchJson handles Vercel 404 HTML response without throwing SyntaxError: Unexpected token', async () => {
  const originalFetch = globalThis.fetch;
  // Simulates Vercel's default 404 response
  globalThis.fetch = async () =>
    new Response('The page could not be found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });

  try {
    const res = await safeFetchJson('/api/missing-endpoint');
    assert.equal(res.ok, false);
    assert.equal(res.status, 404);
    assert.ok(res.error?.includes('404'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetchJson handles HTML error pages with <!doctype html> safely', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('<!doctype html><html><body>Error 500 Server Down</body></html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });

  try {
    const res = await safeFetchJson('/api/broken-endpoint');
    assert.equal(res.ok, false);
    assert.equal(res.status, 500);
    assert.equal(res.isHtml, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('safeFetchJson handles JSON error response gracefully', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Access Denied: unauthorized user' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const res = await safeFetchJson('/api/auth/google-login');
    assert.equal(res.ok, false);
    assert.equal(res.status, 403);
    assert.equal(res.error, 'Access Denied: unauthorized user');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
