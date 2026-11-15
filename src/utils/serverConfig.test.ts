import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwtPayload, resolveServerPort } from './serverConfig';

test('resolveServerPort avoids NGINX_PORT collision and uses DEFAULT_APP_PORT or 3000', () => {
  assert.equal(
    resolveServerPort([], { PORT: '8080', NGINX_PORT: '8080', DEFAULT_APP_PORT: '3000' }),
    3000
  );
  assert.equal(
    resolveServerPort([], { PORT: '8080', NGINX_PORT: '8080' }),
    3000
  );
  assert.equal(
    resolveServerPort([], { PORT: '4000', NGINX_PORT: '8080' }),
    4000
  );
  assert.equal(
    resolveServerPort(['--port', '3050'], { PORT: '8080', DEFAULT_APP_PORT: '3000' }),
    3050
  );
});

test('decodeJwtPayload decodes base64url JWT claims cleanly', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ email: 'maxwlzzyx@gmail.com', role: 'authenticated' })
  ).toString('base64url');
  const token = `${header}.${payload}.signature`;

  const decoded = decodeJwtPayload(token);
  assert.equal(decoded?.email, 'maxwlzzyx@gmail.com');
  assert.equal(decoded?.role, 'authenticated');
  assert.equal(decodeJwtPayload('invalid.token'), null);
});
