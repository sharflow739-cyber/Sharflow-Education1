import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// In-memory rate limiting maps (ephemeral per lambda container)
const lastDecisionMap = new Map<string, number>(); // studentId -> timestamp
const lastWelcomeMap = new Map<string, number>();  // userId -> timestamp

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'শুধুমাত্র POST মেথড গ্রহণযোগ্য' });
  }

  // 1. Verify Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'অননুমোদিত অনুরোধ (Authorization Bearer Token প্রয়োজন)' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return res.status(401).json({ error: 'অ্যাক্সেস টোকেন পাওয়া যায়নি' });
  }

  // 2. Supabase Credentials
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'সার্ভার কনফিগারেশন ত্রুটি: VITE_SUPABASE_URL বা VITE_SUPABASE_ANON_KEY অনুপস্থিত',
    });
  }

  // Create client with caller's token to verify caller's identity
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

  // Verify caller identity via getUser
  const { data: { user: callerUser }, error: userAuthErr } = await userSupabase.auth.getUser(token);
  if (userAuthErr || !callerUser) {
    return res.status(401).json({ error: 'অবৈধ বা মেয়াদোত্তীর্ণ টোকেন (Invalid session)' });
  }

  // 3. Parse request body
  const { type, studentId, reason } = (req.body || {}) as {
    type?: 'registered' | 'approved' | 'rejected';
    studentId?: string;
    reason?: string;
  };

  if (!type || (type !== 'registered' && type !== 'approved' && type !== 'rejected')) {
    return res.status(400).json({
      error: 'ভুল প্যারামিটার: type ("registered", "approved" বা "rejected") আবশ্যক',
    });
  }

  // Resend API configuration
  const resendApiKey = process.env.RESEND_API_KEY;
  const mailFrom = process.env.MAIL_FROM || 'অ্যাবাকাস Parent Training <onboarding@resend.dev>';
  const siteName = process.env.SITE_NAME || 'অ্যাবাকাস Parent Training';
  let siteUrl = process.env.SITE_URL || '';
  if (!siteUrl && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    siteUrl = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (!siteUrl) {
    siteUrl = 'https://abacus-parent.vercel.app';
  }

  // ==========================================
  // CASE 1: TYPE === 'registered' (Welcome Email)
  // ==========================================
  if (type === 'registered') {
    // Caller only emails themselves
    const { data: callerProfile, error: profileErr } = await userSupabase
      .from('profiles')
      .select('id, email, full_name, enrollment_status, created_at')
      .eq('id', callerUser.id)
      .single();

    if (profileErr || !callerProfile) {
      return res.status(404).json({ error: 'প্রোফাইল পাওয়া যায়নি' });
    }

    // Safety checks:
    // 1. Enrollment status must be 'pending' (or default)
    // 2. Created within the last 15 minutes
    // 3. Not emailed in last 10 minutes (lastWelcomeMap)
    const now = Date.now();
    const createdAtMs = new Date(callerProfile.created_at || now).getTime();
    const isRecentlyCreated = now - createdAtMs <= 15 * 60 * 1000;
    const isPending = !callerProfile.enrollment_status || callerProfile.enrollment_status === 'pending';

    const lastWelcome = lastWelcomeMap.get(callerUser.id);
    const wasWelcomedRecently = lastWelcome && now - lastWelcome < 10 * 60 * 1000;

    if (!isRecentlyCreated || !isPending || wasWelcomedRecently) {
      // Idempotent return without sending duplicate email
      return res.status(200).json({
        skipped: true,
        message: 'স্বাগতম ইমেইল ইতিমধ্যে পাঠানো হয়েছে অথবা প্রোফাইল পর্যালোচনায় নেই।',
      });
    }

    if (!resendApiKey) {
      console.warn('RESEND_API_KEY is not set on Vercel.');
      return res.status(500).json({
        error: 'RESEND_API_KEY পরিবেশ চলক (Environment Variable) Vercel-এ কনফিগার করা নেই।',
      });
    }

    const safeName = escapeHtml(callerProfile.full_name || 'অভিভাবক');
    const safeSiteName = escapeHtml(siteName);
    const safeSiteUrl = escapeHtml(siteUrl);

    const subject = `[${siteName}] রেজিস্ট্রেশন সফল — আবেদন পর্যালোচনাধীন`;
    const text = `প্রিয় ${callerProfile.full_name || 'অভিভাবক'},\n\n` +
      `অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রামে আপনার রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে।\n\n` +
      `আমাদের টিম আপনার আবেদন পর্যালোচনা করছে (সাধারণত ২৪ ঘণ্টার মধ্যে)।\n` +
      `আবেদন অনুমোদিত হলে আপনি আরেকটি ইমেইল পাবেন এবং ক্লাসে প্রবেশ করতে পারবেন।\n\n` +
      `সাইট লিংক: ${siteUrl}\n\n` +
      `ধন্যবাদ,\n${siteName} টিম`;

    const html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fed7aa; padding: 32px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #ffedd5; color: #ea580c; width: 56px; height: 56px; line-height: 56px; border-radius: 16px; font-size: 28px;">🧮</div>
      <h2 style="color: #ea580c; margin: 12px 0 4px 0; font-size: 22px;">${safeSiteName}</h2>
      <p style="color: #64748b; margin: 0; font-size: 13px;">অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম</p>
    </div>
    
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
      <h3 style="color: #0f172a; font-size: 18px; margin-top: 0;">প্রিয় ${safeName},</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রামে আপনার রেজিস্ট্রেশন সফলভাবে সম্পন্ন হয়েছে। 
      </p>
      
      <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 14px 18px; border-radius: 8px; margin: 18px 0;">
        <strong style="color: #c2410c; font-size: 13px;">⏳ আবেদন পর্যালোচনাধীন:</strong>
        <p style="margin: 4px 0 0 0; color: #9a3412; font-size: 13px; line-height: 1.5;">
          আমাদের টিম আপনার আবেদন পর্যালোচনা করছে (সাধারণত ২৪ ঘণ্টার মধ্যে)। আবেদন অনুমোদিত হলে আপনি কনফার্মেশন ইমেইল পাবেন এবং কোর্স আনলক হবে।
        </p>
      </div>

      <div style="text-align: center; margin: 26px 0;">
        <a href="${safeSiteUrl}" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
          ওয়েবসাইট ভিজিট করুন &rarr;
        </a>
      </div>

      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
        বাটন কাজ না করলে এই লিংকটি ব্রাউজারে খুলুন:<br/>
        <a href="${safeSiteUrl}" style="color: #ea580c;">${safeSiteUrl}</a>
      </p>
    </div>
    
    <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} ${safeSiteName}. সর্বস্বত্ব সংরক্ষিত।
    </div>
  </div>
</body>
</html>
    `;

    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: mailFrom,
          to: [callerProfile.email],
          subject,
          html,
          text,
        }),
      });

      const resendData = await resendRes.json().catch(() => null);

      if (!resendRes.ok) {
        const errorMsg = resendData?.message || resendData?.error || `HTTP ${resendRes.status}`;
        console.error('Resend welcome email failed:', resendRes.status, errorMsg);
        return res.status(502).json({
          error: `Resend এরর (${resendRes.status}): ${errorMsg}`,
        });
      }

      lastWelcomeMap.set(callerUser.id, Date.now());

      return res.status(200).json({
        success: true,
        message: 'স্বাগতম ইমেইল সফলভাবে পাঠানো হয়েছে',
        id: resendData?.id,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অজানা নেটওয়ার্ক ত্রুটি';
      return res.status(502).json({
        error: `Resend API-তে সংযোগ করা যায়নি: ${msg}`,
      });
    }
  }

  // ==========================================
  // CASE 2: TYPE === 'approved' | 'rejected' (Admin Decision)
  // ==========================================
  if (!studentId) {
    return res.status(400).json({ error: 'ভুল প্যারামিটার: studentId আবশ্যক' });
  }

  // Check that caller is an admin
  try {
    const { data: isAdmin, error: adminErr } = await userSupabase.rpc('is_admin');
    if (adminErr || !isAdmin) {
      return res.status(403).json({
        error: 'অননুমোদিত: শুধুমাত্র অ্যাডমিনগণ শিক্ষার্থী স্ট্যাটাস ইমেইল পাঠাতে পারেন।',
      });
    }
  } catch (err) {
    console.error('Error verifying admin status:', err);
    return res.status(403).json({ error: 'অ্যাডমিন অধিকার যাচাই ব্যর্থ হয়েছে।' });
  }

  // Rate limit: 30 seconds per studentId
  const now = Date.now();
  const lastSent = lastDecisionMap.get(studentId);
  if (lastSent && now - lastSent < 30_000) {
    const waitSeconds = Math.ceil((30_000 - (now - lastSent)) / 1000);
    return res.status(429).json({
      error: `অল্প সময়ে একই শিক্ষার্থীর জন্য একাধিক ইমেইল পাঠানো সম্ভব নয়। অনুগ্রহ করে ${waitSeconds} সেকেন্ড পর চেষ্টা করুন।`,
    });
  }

  // Read student's profile
  const { data: student, error: fetchErr } = await userSupabase
    .from('profiles')
    .select('id, email, full_name, enrollment_status')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) {
    return res.status(404).json({ error: 'শিক্ষার্থীর প্রোফাইল ডাটাবেজে পাওয়া যায়নি।' });
  }

  // Check that DB enrollment_status matches requested type
  if (student.enrollment_status !== type) {
    return res.status(400).json({
      error: `ডাটাবেজ স্ট্যাটাস (${student.enrollment_status}) এবং অনুরোধকৃত স্ট্যাটাস (${type}) মেলেনি। আগে স্ট্যাটাস আপডেট করুন।`,
    });
  }

  if (!resendApiKey) {
    return res.status(500).json({
      error: 'RESEND_API_KEY পরিবেশ চলক (Environment Variable) Vercel-এ কনফিগার করা নেই।',
    });
  }

  const recipientName = student.full_name || 'অভিভাবক';
  const safeName = escapeHtml(recipientName);
  const safeSiteName = escapeHtml(siteName);
  const safeSiteUrl = escapeHtml(siteUrl);

  let subject = '';
  let html = '';
  let text = '';

  if (type === 'approved') {
    subject = `[${siteName}] আপনার ভর্তি অনুমোদিত হয়েছে 🎉`;
    text = `অভিনন্দন ${recipientName}!\n\n` +
      `আপনার ভর্তি অনুমোদিত হয়েছে। এখন লগইন করে ক্লাস দেখতে পারবেন।\n\n` +
      `লগইন লিংক: ${siteUrl}\n\n` +
      `ধন্যবাদ,\n${siteName} টিম`;

    html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fed7aa; padding: 32px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.08);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #ffedd5; color: #ea580c; width: 56px; height: 56px; line-height: 56px; border-radius: 16px; font-size: 28px;">🧮</div>
      <h2 style="color: #ea580c; margin: 12px 0 4px 0; font-size: 22px;">${safeSiteName}</h2>
      <p style="color: #64748b; margin: 0; font-size: 13px;">অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম</p>
    </div>
    
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
      <h3 style="color: #0f172a; font-size: 18px; margin-top: 0;">অভিনন্দন ${safeName}! 🎉</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        আপনার ভর্তি অনুমোদিত হয়েছে। এখন লগইন করে কোর্স ও সব ভিডিও ক্লাস দেখতে পারবেন।
      </p>
      
      <div style="text-align: center; margin: 28px 0;">
        <a href="${safeSiteUrl}" style="background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; display: inline-block;">
          লগইন করে ক্লাস দেখুন &rarr;
        </a>
      </div>
      
      <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
        বাটন কাজ না করলে এই লিংকটি ব্রাউজারে খুলুন:<br/>
        <a href="${safeSiteUrl}" style="color: #ea580c;">${safeSiteUrl}</a>
      </p>
    </div>
    
    <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} ${safeSiteName}. সর্বস্বত্ব সংরক্ষিত।
    </div>
  </div>
</body>
</html>
    `;
  } else {
    // Rejected
    subject = `[${siteName}] ভর্তি আবেদন সংক্রান্ত তথ্য`;
    const reasonText = reason ? `\n\nপ্রত্যাখ্যানের কারণ: ${reason}` : '';
    text = `দুঃখিত ${recipientName},\n\nআপনার আবেদন এই মুহূর্তে গ্রহণ করা সম্ভব হয়নি।${reasonText}\n\nকোনো প্রশ্ন থাকলে অনুগ্রহ করে আমাদের হেল্পডেস্কে যোগাযোগ করুন।\n\nওয়েবসাইট: ${siteUrl}\n\nধন্যবাদ,\n${siteName} টিম`;

    const safeReason = reason ? escapeHtml(reason) : '';

    html = `
<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #fee2e2; color: #dc2626; width: 56px; height: 56px; line-height: 56px; border-radius: 16px; font-size: 28px;">ℹ️</div>
      <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 22px;">${safeSiteName}</h2>
      <p style="color: #64748b; margin: 0; font-size: 13px;">অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম</p>
    </div>
    
    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px;">
      <h3 style="color: #0f172a; font-size: 18px; margin-top: 0;">প্রিয় ${safeName},</h3>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        দুঃখিত ${safeName}, আপনার ভর্তি আবেদন এই মুহূর্তে গ্রহণ করা সম্ভব হয়নি।
      </p>
      
      ${
        safeReason
          ? `<div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 8px; margin: 16px 0;">
              <strong style="color: #991b1b; font-size: 13px;">কারণ:</strong>
              <p style="margin: 4px 0 0 0; color: #7f1d1d; font-size: 13px;">${safeReason}</p>
            </div>`
          : ''
      }
      
      <p style="font-size: 13px; color: #475569; line-height: 1.5;">
        কোনো প্রশ্ন থাকলে বা পুনরায় আবেদনের তথ্য জানতে অনুগ্রহ করে আমাদের ওয়েবসাইটে থাকা নম্বরে বা ইমেইলে যোগাযোগ করুন।
      </p>
      
      <div style="text-align: center; margin: 24px 0;">
        <a href="${safeSiteUrl}" style="background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
          ওয়েবসাইট ভিজিট করুন
        </a>
      </div>
    </div>
    
    <div style="margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
      &copy; ${new Date().getFullYear()} ${safeSiteName}. সর্বস্বত্ব সংরক্ষিত।
    </div>
  </div>
</body>
</html>
    `;
  }

  // Send email via Resend HTTP API
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: mailFrom,
        to: [student.email],
        subject,
        html,
        text,
      }),
    });

    const resendData = await resendResponse.json().catch(() => null);

    if (!resendResponse.ok) {
      const errorMsg = resendData?.message || resendData?.error || `HTTP ${resendResponse.status}`;
      console.error('Resend email failed:', resendResponse.status, errorMsg);
      return res.status(502).json({
        error: `Resend এরর (${resendResponse.status}): ${errorMsg}`,
      });
    }

    // Update in-memory rate limit
    lastDecisionMap.set(studentId, Date.now());

    return res.status(200).json({
      success: true,
      message: 'ইমেইল সফলভাবে পাঠানো হয়েছে',
      id: resendData?.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'অজানা নেটওয়ার্ক ত্রুটি';
    console.error('Fetch to Resend failed:', msg);
    return res.status(502).json({
      error: `Resend API-তে সংযোগ করা যায়নি: ${msg}`,
    });
  }
}
