import type { VercelRequest, VercelResponse } from '../types';

export function applyCors(req: VercelRequest, res: VercelResponse): boolean {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-telegram-init-data, x-telegram-id'
    );
  } catch (err) {
    console.error('Failed to set CORS headers:', err);
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true; // handled preflight
  }

  return false;
}
