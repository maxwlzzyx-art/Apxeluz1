import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidHttpUrl, getHostingProvider } from './urlValidation.js';

test('URL Validation - Allows valid HTTP and HTTPS URLs', () => {
  assert.equal(isValidHttpUrl('https://example.com/download/stardew-valley'), true);
  assert.equal(isValidHttpUrl('http://downloads.apxeluz.io/games/game.apk'), true);
  assert.equal(isValidHttpUrl('https://drive.google.com/file/d/12345/view'), true);
  assert.equal(isValidHttpUrl('https://www.mediafire.com/file/abcdef/game.apk'), true);
});

test('URL Validation - Strictly rejects dangerous and invalid schemes', () => {
  assert.equal(isValidHttpUrl('javascript:alert(1)'), false);
  assert.equal(isValidHttpUrl('javascript:void(0)'), false);
  assert.equal(isValidHttpUrl('data:text/html;base64,PHNjcmlwdD4='), false);
  assert.equal(isValidHttpUrl('blob:http://localhost:3000/uuid'), false);
  assert.equal(isValidHttpUrl('file:///etc/passwd'), false);
  assert.equal(isValidHttpUrl(''), false);
  assert.equal(isValidHttpUrl('   '), false);
  assert.equal(isValidHttpUrl(null), false);
  assert.equal(isValidHttpUrl(undefined), false);
  assert.equal(isValidHttpUrl('not-a-valid-url'), false);
});

test('Hosting Provider Detection', () => {
  assert.equal(getHostingProvider('https://drive.google.com/uc?id=123').type, 'drive');
  assert.equal(getHostingProvider('https://example.com', 'Google Drive Mirror').type, 'drive');
  assert.equal(getHostingProvider('https://mediafire.com/download/xyz').type, 'mediafire');
  assert.equal(getHostingProvider('https://mega.nz/folder/abc').type, 'mega');
  assert.equal(getHostingProvider('https://custom-server.com/file.apk').type, 'cloud');
});
