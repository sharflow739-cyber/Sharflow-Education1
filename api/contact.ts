import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const CONTACT_RECIPIENT = 'sharflow739@gmail.com';

const NAME_MIN = 2;
const NAME_MAX = 80;
const CONTACT_MIN = 5;
const CONTACT_MAX = 120;
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 1500;

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 3;
const RATE_COOLDOWN_MS = 30 * 1000;
const MAX_TRACKED_KEYS = 1000;

const ipSubmissionTimestamps = new Map<string, number[]>();

function stripUnsafeControlChars(value: string, preserveNewlines: boolean): string {
  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (preserveNewlines) {
    return withoutControls.replace(/\r\n?/g, '\n');
  }
  return withoutControls.replace(/[\r\n]+/g, ' ');
}

function isValidEmailOrPhone(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (emailRegex.test(value)) {
    return true;
  }

  if (!/^[+\d\s\-().]{7,25}$/.test(value)) {
    return false;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64);
  }
  if (Array.isArray(forwarded) && forwarded.length > 0 && forwarded[0].trim()) {
    return forwarded[0].split(',')[0].trim().slice(0, 64);
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim().slice(0, 64);
  }
  return req.socket?.remoteAddress?.slice(0, 64) || 'unknown';
}

function checkAndRecordRateLimit(key: string, now: number): { allowed: boolean; retryAfterSec?: number } {
  const existing = (ipSubmissionTimestamps.get(key) || []).filter((ts) => now - ts < RATE_WINDOW_MS);

  if (existing.length > 0) {
    const lastTs = existing[existing.length - 1];
    if (now - lastTs < RATE_COOLDOWN_MS) {
      ipSubmissionTimestamps.set(key, existing);
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((RATE_COOLDOWN_MS - (now - lastTs)) / 1000)),
      };
    }
  }

  if (existing.length >= RATE_MAX_REQUESTS) {
    const oldestTs = existing[0];
    ipSubmissionTimestamps.set(key, existing);
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - oldestTs)) / 1000)),
    };
  }

  if (ipSubmissionTimestamps.size >= MAX_TRACKED_KEYS) {
    const firstKey = ipSubmissionTimestamps.keys().next().value;
    if (firstKey !== undefined) {
      ipSubmissionTimestamps.delete(firstKey);
    }
  }

  existing.push(now);
  ipSubmissionTimestamps.set(key, existing);
  return { allowed: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'শুধুমাত্র POST মেথড গ্রহণযোগ্য' });
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'অবৈধ অনুরোধ ফরম্যাট।' });
  }

  const body = req.body as Record<string, unknown>;

  // Honeypot check: silently refuse without hitting SMTP or returning fake success
  const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
  if (honeypot.length > 0) {
    return res.status(400).json({ error: 'বার্তা গ্রহণ করা যায়নি।' });
  }

  const rawName = typeof body.name === 'string' ? stripUnsafeControlChars(body.name, false).trim() : '';
  const rawContact =
    typeof body.contact === 'string' ? stripUnsafeControlChars(body.contact, false).trim() : '';
  const rawMessage =
    typeof body.message === 'string' ? stripUnsafeControlChars(body.message, true).trim() : '';

  if (rawName.length < NAME_MIN || rawName.length > NAME_MAX) {
    return res.status(400).json({
      error: `অনুগ্রহ করে আপনার নাম (${NAME_MIN} থেকে ${NAME_MAX} অক্ষরের মধ্যে) লিখুন।`,
    });
  }

  if (
    rawContact.length < CONTACT_MIN ||
    rawContact.length > CONTACT_MAX ||
    !isValidEmailOrPhone(rawContact)
  ) {
    return res.status(400).json({
      error: 'সঠিক মোবাইল নম্বর অথবা ইমেইল ঠিকানা লিখুন।',
    });
  }

  if (rawMessage.length < MESSAGE_MIN || rawMessage.length > MESSAGE_MAX) {
    return res.status(400).json({
      error: `অনুগ্রহ করে আপনার বার্তা (${MESSAGE_MIN} থেকে ${MESSAGE_MAX} অক্ষরের মধ্যে) লিখুন।`,
    });
  }

  // Rate limit by client IP
  const clientIp = getClientIp(req);
  const rateCheck = checkAndRecordRateLimit(clientIp, Date.now());
  if (!rateCheck.allowed) {
    if (rateCheck.retryAfterSec) {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
    }
    return res.status(429).json({
      error: `অতিরিক্ত অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে ${rateCheck.retryAfterSec ?? 30} সেকেন্ড পর আবার চেষ্টা করুন।`,
    });
  }

  // SMTP configuration matching existing server-side conventions
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const parsedPort = Number(process.env.SMTP_PORT);
  const smtpPort = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 465;
  const isSecure = smtpPort === 465;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.error('Contact API SMTP configuration missing');
    return res.status(500).json({
      error: 'সার্ভার ইমেইল সেবা বর্তমানে কনফিগার করা নেই। অনুগ্রহ করে সরাসরি ইমেইলে যোগাযোগ করুন।',
    });
  }

  const siteName = stripUnsafeControlChars(
    process.env.SITE_NAME || 'অ্যাবাকাস Parent Training',
    false
  ).trim();
  const mailFrom = process.env.MAIL_FROM || `"${siteName}" <${smtpUser}>`;
  const fixedSubject = `[${siteName}] ওয়েবসাইট যোগাযোগ ফর্ম বার্তা`;

  const plainTextBody = [
    `${siteName} - ওয়েবসাইট যোগাযোগ ফর্ম থেকে নতুন বার্তা`,
    '--------------------------------------------------',
    `নাম: ${rawName}`,
    `যোগাযোগ (মোবাইল/ইমেইল): ${rawContact}`,
    `সময় (UTC): ${new Date().toISOString()}`,
    '',
    'বার্তা:',
    rawMessage,
  ].join('\n');

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: isSecure,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 10_000,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: mailFrom,
      to: CONTACT_RECIPIENT,
      subject: fixedSubject,
      text: plainTextBody,
    });

    const accepted = Array.isArray(info.accepted) && info.accepted.length > 0;
    if (!accepted) {
      console.error('Contact API SMTP rejected recipient');
      return res.status(502).json({
        error: 'ইমেইল সার্ভার বার্তাটি গ্রহণ করেনি। অনুগ্রহ করে সরাসরি ইমেইলে যোগাযোগ করুন।',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'আপনার বার্তা সফলভাবে পাঠানো হয়েছে।',
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err && typeof err.code === 'string'
        ? err.code
        : 'SMTP_ERROR';
    // Never log form contents or personal data
    console.error('Contact API SMTP send failure:', code);
    return res.status(502).json({
      error: 'সার্ভারের মাধ্যমে বার্তা পাঠানো যায়নি। অনুগ্রহ করে নিচের সরাসরি ইমেইল ব্যবহার করুন।',
    });
  }
}
