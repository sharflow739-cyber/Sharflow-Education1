export type PaymentProvider = 'bkash' | 'nagad';
export type PaymentMethod = 'send_money' | 'payment' | 'cash_out';
export type PaymentClaimStatus = 'pending' | 'approved' | 'rejected';

export interface ManualPaymentProviderConfig {
  provider: PaymentProvider;
  is_enabled: boolean;
  price_bdt: number | null;
  recipient_number: string;
  payment_method: PaymentMethod | '';
  instructions: string;
  updated_by?: string | null;
  updated_at?: string;
}

export interface LearnerManualPaymentClaim {
  id: string;
  provider: PaymentProvider;
  payment_method: PaymentMethod;
  recipient_number: string;
  trx_id_normalized: string;
  payer_number: string;
  submitted_amount_bdt: number;
  expected_amount_bdt: number;
  status: PaymentClaimStatus;
  reject_reason?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManualPaymentClaim extends LearnerManualPaymentClaim {
  user_id: string;
  trx_id: string;
  verified_amount_bdt?: number | null;
  admin_note?: string | null;
  reviewed_by?: string | null;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    enrollment_status?: 'pending' | 'approved' | 'rejected';
  } | null;
}

export const PAYMENT_PROVIDER_LABELS: Record<PaymentProvider, string> = {
  bkash: 'বিকাশ (bKash)',
  nagad: 'নগদ (Nagad)',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  send_money: 'সেন্ড মানি (Send Money)',
  payment: 'পেমেন্ট / মার্চেন্ট (Payment)',
  cash_out: 'ক্যাশ আউট (Cash Out)',
};

export const PAYMENT_CLAIM_STATUS_LABELS: Record<PaymentClaimStatus, string> = {
  pending: 'যাচাইয়ের অপেক্ষায়',
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',
};

const BENGALI_TO_ASCII_DIGITS: Record<string, string> = {
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

export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (ch) => BENGALI_TO_ASCII_DIGITS[ch] ?? ch);
}

export function normalizeTrxId(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toUpperCase();
}

export function isValidTrxId(raw: string): boolean {
  const normalized = normalizeTrxId(raw);
  return /^[A-Z0-9]{6,32}$/.test(normalized);
}

export function normalizeBdMobile(raw: string): string | null {
  const ascii = toAsciiDigits(raw);
  const digits = ascii.replace(/\D/g, '');

  if (/^8801[3-9][0-9]{8}$/.test(digits)) {
    return digits.slice(2);
  }
  if (/^01[3-9][0-9]{8}$/.test(digits)) {
    return digits;
  }
  return null;
}

export function parsePositiveBdtAmount(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw > 0 ? raw : null;
  }
  const cleaned = toAsciiDigits(raw).replace(/[,\s৳]/g, '').trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isValidPaymentMethod(value: string | null | undefined): value is PaymentMethod {
  return value === 'send_money' || value === 'payment' || value === 'cash_out';
}

export function isProviderConfigured(config: ManualPaymentProviderConfig | null | undefined): boolean {
  if (!config || !config.is_enabled) return false;
  if (typeof config.price_bdt !== 'number' || !Number.isInteger(config.price_bdt) || config.price_bdt <= 0) {
    return false;
  }
  if (normalizeBdMobile(config.recipient_number) === null) {
    return false;
  }
  return isValidPaymentMethod(config.payment_method);
}

export function createEmptyProviderConfigs(): Record<PaymentProvider, ManualPaymentProviderConfig> {
  return {
    bkash: {
      provider: 'bkash',
      is_enabled: false,
      price_bdt: null,
      recipient_number: '',
      payment_method: '',
      instructions: '',
    },
    nagad: {
      provider: 'nagad',
      is_enabled: false,
      price_bdt: null,
      recipient_number: '',
      payment_method: '',
      instructions: '',
    },
  };
}

export function isPaymentsMigrationMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const errObj = error as { code?: string; message?: string };
  const code = (errObj.code || '').toUpperCase();
  const msg = (errObj.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42883' ||
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('could not find the function')
  );
}
