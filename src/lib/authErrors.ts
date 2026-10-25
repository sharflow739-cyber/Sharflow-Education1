/**
 * Helper to explain Supabase Auth errors and provide client-side validation
 * in clear, actionable Bengali.
 */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function isValidBdPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(?:\+?8801|8801|01)[3-9]\d{8}$/.test(cleaned);
}

export function explainAuthError(err: unknown): string {
  console.error('Supabase Auth Error:', err);

  if (!err) {
    return 'অজানা ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।';
  }

  let code = '';
  let status = '';
  let message = '';

  if (typeof err === 'object' && err !== null) {
    const rec = err as Record<string, unknown>;
    if (rec.code !== undefined && rec.code !== null) code = String(rec.code);
    if (rec.status !== undefined && rec.status !== null) status = String(rec.status);
    if (rec.message !== undefined && rec.message !== null) message = String(rec.message);
  } else if (typeof err === 'string') {
    message = err;
  }

  const combined = `${code} ${status} ${message}`.toLowerCase();

  // 1. user_already_exists / "User already registered"
  if (
    code === 'user_already_exists' ||
    combined.includes('user already registered') ||
    combined.includes('user_already_exists')
  ) {
    return 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা আছে। লগইন করুন।';
  }

  // 2. weak_password / "Password should be at least"
  if (
    code === 'weak_password' ||
    combined.includes('weak_password') ||
    combined.includes('password should be at least')
  ) {
    return 'পাসওয়ার্ড দুর্বল। কমপক্ষে ৮ অক্ষর দিন (অক্ষর ও সংখ্যা মিলিয়ে)।';
  }

  // 3. invalid_credentials / "Invalid login credentials"
  if (
    code === 'invalid_credentials' ||
    combined.includes('invalid_credentials') ||
    combined.includes('invalid login credentials')
  ) {
    return 'ইমেইল বা পাসওয়ার্ড ভুল।';
  }

  // 4. email_not_confirmed / "Email not confirmed"
  if (
    code === 'email_not_confirmed' ||
    combined.includes('email_not_confirmed') ||
    combined.includes('email not confirmed')
  ) {
    return 'ইমেইল যাচাই হয়নি। আপনার ইমেইলে পাঠানো ভেরিফিকেশন কোডটি ব্যবহার করুন।';
  }

  // 5. email_address_invalid / "invalid format"
  if (
    code === 'email_address_invalid' ||
    combined.includes('email_address_invalid') ||
    combined.includes('invalid format') ||
    combined.includes('unable to validate email address')
  ) {
    return 'ইমেইলের ফরম্যাট ঠিক নয়।';
  }

  // 6. signup_disabled / "Signups not allowed"
  if (
    code === 'signup_disabled' ||
    combined.includes('signup_disabled') ||
    combined.includes('signups not allowed')
  ) {
    return 'নতুন রেজিস্ট্রেশন এখন বন্ধ আছে।';
  }

  // 7. over_email_send_rate_limit / "rate limit"
  if (
    code === 'over_email_send_rate_limit' ||
    combined.includes('over_email_send_rate_limit') ||
    combined.includes('rate limit')
  ) {
    return 'অল্প সময়ে অনেকবার চেষ্টা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
  }

  // 8. "Database error saving new user"
  if (combined.includes('database error saving new user')) {
    return 'সার্ভারে প্রোফাইল তৈরি হয়নি (ডাটাবেস সেটআপ সমস্যা)। এডমিনকে জানান।';
  }

  // 9. "Invalid path specified in request URL"
  if (combined.includes('invalid path specified in request url')) {
    return 'কনফিগারেশন ভুল: VITE_SUPABASE_URL ঠিক নয়। এটি https://<project-id>.supabase.co ফরম্যাটে হতে হবে, শেষে কোনো / বা পাথ থাকবে না।';
  }

  // 10. "Invalid API key" / "No API key found"
  if (
    combined.includes('invalid api key') ||
    combined.includes('no api key found')
  ) {
    return 'কনফিগারেশন ভুল: VITE_SUPABASE_ANON_KEY ঠিক নয়।';
  }

  // 11. "Failed to fetch" / "NetworkError"
  if (
    combined.includes('failed to fetch') ||
    combined.includes('networkerror') ||
    combined.includes('network error')
  ) {
    return 'ইন্টারনেট সংযোগ বা Supabase সার্ভারে সমস্যা।';
  }

  // Fallback: show "ত্রুটি: <err.message> (code: <err.code || err.status>)"
  const codeOrStatus = code || status;
  const rawMsg = message || 'অপ্রত্যাশিত ত্রুটি ঘটেছে।';
  return codeOrStatus ? `ত্রুটি: ${rawMsg} (code: ${codeOrStatus})` : `ত্রুটি: ${rawMsg}`;
}
