export const CONTACT_FALLBACK_EMAIL = 'sharflow739@gmail.com';

export const CONTACT_LIMITS = {
  NAME_MIN: 2,
  NAME_MAX: 80,
  CONTACT_MIN: 5,
  CONTACT_MAX: 120,
  MESSAGE_MIN: 10,
  MESSAGE_MAX: 1500,
} as const;

export interface ContactPayloadInput {
  name: string;
  contact: string;
  message: string;
  website?: string;
}

export interface ValidatedContactPayload {
  name: string;
  contact: string;
  message: string;
}

function stripUnsafeControlChars(value: string, preserveNewlines: boolean): string {
  const withoutControls = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  if (preserveNewlines) {
    return withoutControls.replace(/\r\n?/g, '\n');
  }
  return withoutControls.replace(/[\r\n]+/g, ' ');
}

export function isValidContactIdentifier(value: string): boolean {
  const trimmed = value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (emailRegex.test(trimmed)) {
    return true;
  }

  if (!/^[+\d\s\-().]{7,25}$/.test(trimmed)) {
    return false;
  }

  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function validateContactForm(
  input: ContactPayloadInput
): { ok: true; value: ValidatedContactPayload } | { ok: false; error: string } {
  if (input.website && input.website.trim().length > 0) {
    return { ok: false, error: 'বার্তা গ্রহণ করা যায়নি।' };
  }

  const name = stripUnsafeControlChars(input.name || '', false).trim();
  if (name.length < CONTACT_LIMITS.NAME_MIN || name.length > CONTACT_LIMITS.NAME_MAX) {
    return {
      ok: false,
      error: `অনুগ্রহ করে আপনার নাম (${CONTACT_LIMITS.NAME_MIN} থেকে ${CONTACT_LIMITS.NAME_MAX} অক্ষরের মধ্যে) লিখুন।`,
    };
  }

  const contact = stripUnsafeControlChars(input.contact || '', false).trim();
  if (
    contact.length < CONTACT_LIMITS.CONTACT_MIN ||
    contact.length > CONTACT_LIMITS.CONTACT_MAX ||
    !isValidContactIdentifier(contact)
  ) {
    return {
      ok: false,
      error: 'সঠিক মোবাইল নম্বর অথবা ইমেইল ঠিকানা লিখুন।',
    };
  }

  const message = stripUnsafeControlChars(input.message || '', true).trim();
  if (message.length < CONTACT_LIMITS.MESSAGE_MIN || message.length > CONTACT_LIMITS.MESSAGE_MAX) {
    return {
      ok: false,
      error: `অনুগ্রহ করে আপনার বার্তা (${CONTACT_LIMITS.MESSAGE_MIN} থেকে ${CONTACT_LIMITS.MESSAGE_MAX} অক্ষরের মধ্যে) লিখুন।`,
    };
  }

  return {
    ok: true,
    value: { name, contact, message },
  };
}
