import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'শুধুমাত্র GET মেথড গ্রহণযোগ্য' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!accessToken) {
    return res.status(401).json({ error: 'লগইন প্রয়োজন' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'সার্ভার কনফিগারেশন ত্রুটি: Supabase পরিবেশ চলক অনুপস্থিত',
    });
  }

  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await userSupabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'অবৈধ বা মেয়াদোত্তীর্ণ সেশন' });
  }

  const { data: profile, error: profileErr } = await userSupabase
    .from('profiles')
    .select('id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile || !profile.is_active) {
    return res.status(403).json({ error: 'সক্রিয় অ্যাকাউন্ট প্রয়োজন' });
  }

  const { data: demoRow, error: demoErr } = await userSupabase
    .from('demo_settings')
    .select('video_url')
    .eq('id', 1)
    .maybeSingle();

  if (!demoErr && demoRow && typeof demoRow.video_url === 'string' && demoRow.video_url.trim()) {
    return res.status(200).json({ video_url: demoRow.video_url.trim() });
  }

  return res.status(200).json({ video_url: '' });
}
