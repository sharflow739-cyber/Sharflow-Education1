import { MongoClient } from 'mongodb';
import crypto from 'node:crypto';

const BENGALI_TO_ASCII_DIGITS = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

const globalForMongo = globalThis;

function getMongoClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri || typeof uri !== 'string' || !uri.trim()) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (!globalForMongo.__abacusMongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 6000,
    });
    globalForMongo.__abacusMongoClientPromise = client.connect().catch((err) => {
      globalForMongo.__abacusMongoClientPromise = undefined;
      throw err;
    });
  }

  return globalForMongo.__abacusMongoClientPromise;
}

function normalizeDigits(value) {
  return String(value).replace(/[০-৯]/g, (ch) => BENGALI_TO_ASCII_DIGITS[ch] ?? ch);
}

function cleanString(value, maxLen = 120) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function isValidLeadPhone(rawPhone) {
  const normalized = normalizeDigits(cleanString(rawPhone, 32));
  if (!normalized || !/^[+\d\s\-().]{7,25}$/.test(normalized)) {
    return { valid: false, normalized: '' };
  }
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { valid: false, normalized: '' };
  }
  return { valid: true, normalized };
}

function getClientIp(req) {
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

function resolveSameOriginCors(req) {
  const requestOrigin = req.headers.origin;
  const secFetchSite = req.headers['sec-fetch-site'];

  if (typeof secFetchSite === 'string' && secFetchSite.toLowerCase() === 'cross-site') {
    return { allowed: false, originToAllow: null };
  }

  if (!requestOrigin || typeof requestOrigin !== 'string') {
    return { allowed: true, originToAllow: null };
  }

  const allowedOrigins = new Set();
  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  if (typeof forwardedHost === 'string' && forwardedHost.trim()) {
    const primaryHost = forwardedHost.split(',')[0].trim();
    allowedOrigins.add(`https://${primaryHost}`);
    allowedOrigins.add(`http://${primaryHost}`);
  }

  if (process.env.SITE_URL) {
    try {
      allowedOrigins.add(new URL(process.env.SITE_URL).origin);
    } catch {
      // Ignore invalid SITE_URL
    }
  }

  allowedOrigins.add('https://sharflowbd.com');
  allowedOrigins.add('https://www.sharflowbd.com');

  if (allowedOrigins.has(requestOrigin)) {
    return { allowed: true, originToAllow: requestOrigin };
  }

  return { allowed: false, originToAllow: null };
}

function extractUtmParams(body) {
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const utm = {};

  if (body.utm && typeof body.utm === 'object' && !Array.isArray(body.utm)) {
    for (const key of keys) {
      const val = cleanString(body.utm[key], 120);
      if (val) utm[key] = val;
    }
  }

  for (const key of keys) {
    const val = cleanString(body[key], 120);
    if (val) utm[key] = val;
  }

  return utm;
}

function resolveGaClientId(req, body) {
  const bodyClientId = cleanString(body.clientId, 80);
  if (bodyClientId && /^\d+\.\d+$/.test(bodyClientId)) {
    return bodyClientId;
  }

  const cookieHeader = req.headers.cookie;
  if (typeof cookieHeader === 'string') {
    const match = cookieHeader.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.([^;]+)/);
    if (match && match[1]) {
      return cleanString(match[1], 80);
    }
  }

  return crypto.randomUUID();
}

async function sendGa4LeadEvent({ measurementId, apiSecret, clientId, plan }) {
  if (!measurementId || !apiSecret) return;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const endpoint = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
      measurementId
    )}&api_secret=${encodeURIComponent(apiSecret)}`;

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        events: [
          {
            name: 'generate_lead',
            params: {
              value: 1,
              currency: 'SAR',
              plan,
            },
          },
        ],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');

  const { allowed, originToAllow } = resolveSameOriginCors(req);
  if (originToAllow) {
    res.setHeader('Access-Control-Allow-Origin', originToAllow);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (!allowed) {
    return res.status(403).json({ ok: false, error: 'Cross-origin requests are not permitted' });
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid JSON payload' });
    }
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: 'Invalid request body' });
  }

  const name = cleanString(body.name, 80);
  if (name.length < 2) {
    return res.status(400).json({ ok: false, error: 'অনুগ্রহ করে শিশুর সঠিক নাম লিখুন।' });
  }

  const phoneCheck = isValidLeadPhone(body.phone);
  if (!phoneCheck.valid) {
    return res
      .status(400)
      .json({ ok: false, error: 'অনুগ্রহ করে সঠিক WhatsApp মোবাইল নম্বর লিখুন।' });
  }

  const ageGroup = cleanString(body.ageGroup, 60);
  const plan = cleanString(body.plan, 80) || 'starter-package';
  const source = cleanString(body.source, 80) || 'enroll';
  const utmParams = extractUtmParams(body);

  const userAgent = cleanString(req.headers['user-agent'] || '', 300);
  const ip = getClientIp(req);

  const leadDocument = {
    name,
    phone: phoneCheck.normalized,
    plan,
    ageGroup,
    source,
    createdAt: new Date(),
    userAgent,
    ip,
    ...(Object.keys(utmParams).length > 0 ? { utm: utmParams } : {}),
  };

  try {
    const client = await getMongoClient();
    await client.db('abacus').collection('leads').insertOne(leadDocument);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database error';
    console.error('Enroll lead insert failed:', message.includes('MONGODB_URI') ? 'MONGODB_URI missing' : 'MONGO_ERROR');
    return res.status(500).json({ ok: false, error: 'তথ্য সংরক্ষণ করা যায়নি। অনুগ্রহ করে পরে আবার চেষ্টা করুন।' });
  }

  // Send server-side GA4 Measurement Protocol lead event without blocking or failing the response
  try {
    const measurementId = (process.env.GA_MEASUREMENT_ID || '').trim();
    const apiSecret = (process.env.GA_API_SECRET || '').trim();
    if (measurementId && apiSecret) {
      const clientId = resolveGaClientId(req, body);
      await sendGa4LeadEvent({
        measurementId,
        apiSecret,
        clientId,
        plan,
      });
    }
  } catch {
    // GA4 failure must never fail the lead capture
  }

  return res.status(200).json({ ok: true });
}
