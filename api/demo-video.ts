import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'শুধুমাত্র GET মেথড গ্রহণযোগ্য' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const effectiveKey = supabaseServiceKey || supabaseAnonKey;

  if (!supabaseUrl || !effectiveKey) {
    return res.status(500).json({
      error: 'সার্ভার কনফিগারেশন ত্রুটি: Supabase পরিবেশ চলক অনুপস্থিত',
    });
  }

  const publicSupabase = createClient(supabaseUrl, effectiveKey, {
    auth: {
      persistSession: false,
    },
  });

  // Primary source: designated demo_settings table (never returns gated classes/ebooks)
  const { data: demoRow, error: demoErr } = await publicSupabase
    .from('demo_settings')
    .select('video_url')
    .eq('id', 1)
    .maybeSingle();

  if (!demoErr && demoRow && typeof demoRow.video_url === 'string' && demoRow.video_url.trim()) {
    return res.status(200).json({ video_url: demoRow.video_url.trim() });
  }

  // Fallback if legacy demo URL exists in site_settings
  const { data: siteRow, error: siteErr } = await publicSupabase
    .from('site_settings')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (!siteErr && siteRow?.data && typeof siteRow.data === 'object') {
    const legacyUrl = (siteRow.data as Record<string, unknown>).public_demo_video_url;
    if (typeof legacyUrl === 'string' && legacyUrl.trim()) {
      return res.status(200).json({ video_url: legacyUrl.trim() });
    }
  }

  return res.status(200).json({ video_url: '' });
}
