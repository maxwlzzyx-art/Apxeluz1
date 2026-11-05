import { checkLoginLock, recordLoginFailure, recordLoginSuccess } from '../../src/lib/rateLimiter';

export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1');
  const { email, success } = req.body || {};

  const currentLock = checkLoginLock(ip, email);
  if (currentLock.isLocked && !success) {
    return res.status(429).json({
      error: `Percobaan login diblokir karena 3 kali kesalahan berturut-turut. Coba lagi dalam ${currentLock.remainingMinutes} menit.`,
      ...currentLock,
    });
  }

  if (success) {
    recordLoginSuccess(ip, email);
    return res.status(200).json({ success: true, message: 'Login attempt recorded: SUCCESS' });
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
}
