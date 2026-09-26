import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from './lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const telegramId = String(req.query.telegram_id ?? '');
    if (!telegramId) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', telegramId);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data ?? []);
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Supabase unavailable' });
  }
}
