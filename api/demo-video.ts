import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'শুধুমাত্র GET মেথড গ্রহণযোগ্য' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'অননুমোদিত অনুরোধ: লগইন প্রয়োজন' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'অ্যাক্সেস টোকেন পাওয়া যায়নি' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'সার্ভার কনফিগারেশন ত্রুটি: Supabase পরিবেশ চলক অনুপস্থিত',
    });
  }

  const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
    },
  });

  // Verify caller session
  const { data: { user }, error: authErr } = await userSupabase.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'অবৈধ বা মেয়াদোত্তীর্ণ সেশন' });
  }

  // Verify user has an active profile
  const { data: profile, error: profileErr } = await userSupabase
    .from('profiles')
    .select('id, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profileErr || !profile || !profile.is_active) {
    return res.status(403).json({ error: 'অ্যাক্সেস অনুমোদিত নয় বা অ্যাকাউন্ট নিষ্ক্রিয়' });
  }

  // Primary source: authenticated-only demo_settings table
  const { data: demoRow, error: demoErr } = await userSupabase
    .from('demo_settings')
    .select('video_url')
    .eq('id', 1)
    .maybeSingle();

  if (!demoErr && demoRow && typeof demoRow.video_url === 'string' && demoRow.video_url.trim()) {
    return res.status(200).json({ video_url: demoRow.video_url.trim() });
  }

  // Authenticated server-side fallback if demo_settings hasn't been populated yet
  const { data: siteRow, error: siteErr } = await userSupabase
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
