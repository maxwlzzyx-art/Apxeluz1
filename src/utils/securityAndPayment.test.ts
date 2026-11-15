import test from 'node:test';
import assert from 'node:assert/strict';
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
