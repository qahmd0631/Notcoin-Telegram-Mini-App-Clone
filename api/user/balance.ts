import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { telegram_id, points } = req.body ?? {};
    if (!telegram_id || points === undefined) {
      return res.status(400).json({ error: 'telegram_id and points are required' });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .update({ points: Number(points), updated_at: new Date().toISOString() })
      .eq('telegram_id', String(telegram_id))
      .select('*')
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ user: data ?? null });
  } catch (error) {
    return res.status(503).json({ error: error instanceof Error ? error.message : 'Supabase unavailable' });
  }
}
