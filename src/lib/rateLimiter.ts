/**
 * Admin Login Security & Rate Limiting
 * Enforces 3-strike lockout for 30 minutes per identifier (IP + Email).
 * Does NOT lock other administrators.
 */

export interface RateLimitStatus {
  isLocked: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
  failedAttempts: number;
  remainingAttempts: number;
  lockedUntil: number | null;
}

interface AttemptRecord {
  failedCount: number;
  lockedUntil: number | null;
  history: Array<{ timestamp: number; success: boolean }>;
}

const MAX_CONSECUTIVE_FAILURES = 3;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

// In-memory tracker
const attemptStore = new Map<string, AttemptRecord>();

function getIdentifier(ip: string, email?: string): string {
  const cleanIp = (ip || '127.0.0.1').trim().replace(/^::ffff:/, '');
  const cleanEmail = (email || '').trim().toLowerCase();
  return cleanEmail ? `${cleanIp}_${cleanEmail}` : cleanIp;
}

/**
 * Check if the current IP/email combination is currently locked out.
 */
export function checkLoginLock(ip: string, email?: string): RateLimitStatus {
  const key = getIdentifier(ip, email);
  const record = attemptStore.get(key);

  const now = Date.now();

  if (!record) {
    return {
      isLocked: false,
      remainingMinutes: 0,
      remainingSeconds: 0,
      failedAttempts: 0,
      remainingAttempts: MAX_CONSECUTIVE_FAILURES,
      lockedUntil: null,
    };
  }

  // If locked, check if duration has elapsed
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingMs = record.lockedUntil - now;
    return {
      isLocked: true,
      remainingMinutes: Math.ceil(remainingMs / (60 * 1000)),
      remainingSeconds: Math.ceil(remainingMs / 1000),
      failedAttempts: record.failedCount,
      remainingAttempts: 0,
      lockedUntil: record.lockedUntil,
    };
  }

  // Lock expired, reset failed count
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.lockedUntil = null;
    record.failedCount = 0;
  }

  const remaining = Math.max(0, MAX_CONSECUTIVE_FAILURES - record.failedCount);

  return {
    isLocked: false,
    remainingMinutes: 0,
    remainingSeconds: 0,
    failedAttempts: record.failedCount,
    remainingAttempts: remaining,
    lockedUntil: null,
  };
}

/**
 * Record a failed login attempt. If failed count reaches 3, locks for 30 minutes.
 */
export function recordLoginFailure(ip: string, email?: string): RateLimitStatus {
  const key = getIdentifier(ip, email);
  let record = attemptStore.get(key);
  const now = Date.now();

  if (!record) {
    record = {
      failedCount: 0,
      lockedUntil: null,
      history: [],
    };
    attemptStore.set(key, record);
  }

  // If previous lock expired, reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    record.failedCount = 0;
    record.lockedUntil = null;
  }

  record.failedCount += 1;
  record.history.push({ timestamp: now, success: false });

  if (record.failedCount >= MAX_CONSECUTIVE_FAILURES) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    return {
      isLocked: true,
      remainingMinutes: 30,
      remainingSeconds: 30 * 60,
      failedAttempts: record.failedCount,
      remainingAttempts: 0,
      lockedUntil: record.lockedUntil,
    };
  }

  return {
    isLocked: false,
    remainingMinutes: 0,
    remainingSeconds: 0,
    failedAttempts: record.failedCount,
    remainingAttempts: MAX_CONSECUTIVE_FAILURES - record.failedCount,
    lockedUntil: null,
  };
}

/**
 * Record a successful login attempt, clearing failed counter for this IP/email.
 */
export function recordLoginSuccess(ip: string, email?: string): void {
  const key = getIdentifier(ip, email);
  const record = attemptStore.get(key);
  if (record) {
    record.failedCount = 0;
    record.lockedUntil = null;
    record.history.push({ timestamp: Date.now(), success: true });
  }
}

/**
 * Reset store (useful for unit testing).
 */
export function resetRateLimitStore(): void {
  attemptStore.clear();
}
