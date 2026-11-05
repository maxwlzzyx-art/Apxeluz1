import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyQiosPaySignature,
  generateQiosPaySignature,
  generateDownloadAccessToken,
  verifyDownloadAccessToken,
} from '../lib/qiospayService';
import {
  checkLoginLock,
  recordLoginFailure,
  recordLoginSuccess,
  resetRateLimitStore,
} from '../lib/rateLimiter';

test('Rate Limiter: Allows first and second failed attempt, locks on 3rd attempt for 30 minutes', () => {
  resetRateLimitStore();
  const testIp = '192.168.1.100';
  const testEmail = 'attacker@test.com';

  // 0. Initial state
  const initial = checkLoginLock(testIp, testEmail);
  assert.equal(initial.isLocked, false);
  assert.equal(initial.remainingAttempts, 3);
  assert.equal(initial.failedAttempts, 0);

  // 1. First failure
  const first = recordLoginFailure(testIp, testEmail);
  assert.equal(first.isLocked, false);
  assert.equal(first.remainingAttempts, 2);
  assert.equal(first.failedAttempts, 1);

  // 2. Second failure
  const second = recordLoginFailure(testIp, testEmail);
  assert.equal(second.isLocked, false);
  assert.equal(second.remainingAttempts, 1);
  assert.equal(second.failedAttempts, 2);

  // 3. Third failure -> 30-minute lockout triggered
  const third = recordLoginFailure(testIp, testEmail);
  assert.equal(third.isLocked, true);
  assert.equal(third.remainingAttempts, 0);
  assert.equal(third.failedAttempts, 3);
  assert.equal(third.remainingMinutes, 30);

  // Check state persists
  const check = checkLoginLock(testIp, testEmail);
  assert.equal(check.isLocked, true);
  assert.equal(check.remainingAttempts, 0);

  // Check that other users/IPs are NOT locked
  const otherUser = checkLoginLock('10.0.0.1', 'innocent@test.com');
  assert.equal(otherUser.isLocked, false);
  assert.equal(otherUser.remainingAttempts, 3);

  // Test success clears record
  recordLoginSuccess(testIp, testEmail);
  const cleared = checkLoginLock(testIp, testEmail);
  assert.equal(cleared.isLocked, false);
  assert.equal(cleared.remainingAttempts, 3);
});

test('QiosPay Webhook: Validates HMAC-SHA256 signature using timingSafeEqual', () => {
  const testPrivateKey = 'test_secret_private_key_qiospay_2026';
  const rawBody = JSON.stringify({
    event: 'invoice.paid',
    ref_id: 'ORD-12345678',
    invoice_id: 'QP-INV-999',
    amount: 50000,
    status: 'PAID',
  });
  const timestamp = Date.now();

  const validSignature = generateQiosPaySignature(rawBody, timestamp, testPrivateKey);

  // 1. Valid signature passes
  const verificationResult = verifyQiosPaySignature({
    rawBody,
    timestamp,
    signature: validSignature,
    privateKey: testPrivateKey,
  });
  assert.equal(verificationResult.isValid, true);

  // 2. Tampered body fails
  const tamperedBody = JSON.stringify({
    event: 'invoice.paid',
    ref_id: 'ORD-12345678',
    invoice_id: 'QP-INV-999',
    amount: 1000, // tampered amount
    status: 'PAID',
  });
  const tamperedResult = verifyQiosPaySignature({
    rawBody: tamperedBody,
    timestamp,
    signature: validSignature,
    privateKey: testPrivateKey,
  });
  assert.equal(tamperedResult.isValid, false);

  // 3. Outdated timestamp (>10 minutes) fails
  const oldTimestamp = Date.now() - 15 * 60 * 1000;
  const oldSignature = generateQiosPaySignature(rawBody, oldTimestamp, testPrivateKey);
  const expiredResult = verifyQiosPaySignature({
    rawBody,
    timestamp: oldTimestamp,
    signature: oldSignature,
    privateKey: testPrivateKey,
  });
  assert.equal(expiredResult.isValid, false);
  assert.match(expiredResult.reason || '', /tolerance/i);
});

test('Download Token: Signs and verifies temporary download access tokens', () => {
  const tokenData = generateDownloadAccessToken({
    orderId: 'ORD-12345',
    gameId: 'game-prem-1',
    customerEmail: 'buyer@apxeluz.my.id',
    expiresInHours: 24,
  });

  assert.ok(tokenData.token);
  assert.ok(tokenData.expiresAt);

  // Verify valid token
  const verified = verifyDownloadAccessToken(tokenData.token);
  assert.equal(verified.valid, true);
  assert.equal(verified.orderId, 'ORD-12345');
  assert.equal(verified.gameId, 'game-prem-1');
  assert.equal(verified.customerEmail, 'buyer@apxeluz.my.id');

  // Verify tampered token fails
  const tampered = tokenData.token.substring(0, tokenData.token.length - 4) + 'AAAA';
  const tamperedCheck = verifyDownloadAccessToken(tampered);
  assert.equal(tamperedCheck.valid, false);
});
