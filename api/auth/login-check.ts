import { checkLoginLock } from '../../src/lib/rateLimiter';

export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1');
  const email = (req.query?.email as string) || (req.body?.email as string) || '';

  const status = checkLoginLock(ip, email);
  return res.status(200).json({ ip, email, ...status });
}
