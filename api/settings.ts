export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    siteName: 'APXELUZ',
    siteDescription: 'App & Mod Repository with Apple Liquid Glass Design',
    announcement: '',
    enableDownloads: true,
    maintenanceMode: false,
    defaultArchitecture: 'ARM64',
  });
}
