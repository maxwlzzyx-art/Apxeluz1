import type { Request, Response } from 'express';

const PRIMARY_ADMIN_EMAIL = 'pindahserverezeer@gmail.com';

function isAuthorized(email?: string | null) {
  if (!email) return false;
  return email.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
}

export default function handler(req: any, res: any) {
  // Set CORS and JSON headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, name, photoURL, idToken } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: 'Google account email is required.' });
  }

  if (!isAuthorized(email)) {
    return res.status(403).json({
      error: `Access Denied: Google account "${email}" is not authorized for administrator access. Only authorized administrators (${PRIMARY_ADMIN_EMAIL}) are permitted.`,
    });
  }

  return res.status(200).json({
    success: true,
    token: idToken || `session-${Date.now()}`,
    user: {
      username: name || email,
      email,
      photoURL: photoURL || '',
      role: 'ADMIN',
    },
  });
}
