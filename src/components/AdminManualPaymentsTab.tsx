import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  createEmptyProviderConfigs,
  isPaymentsMigrationMissingError,
  isValidPaymentMethod,
  ManualPaymentClaim,
  ManualPaymentProviderConfig,
  normalizeBdMobile,
  parsePositiveBdtAmount,
  PAYMENT_CLAIM_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_PROVIDER_LABELS,
  PaymentClaimStatus,
  PaymentMethod,
  PaymentProvider,
} from '../lib/manualPayments';
import { sendStudentStatusEmail } from '../lib/studentEmail';
import { PaymentProviderLogo } from './PaymentProviderBadge';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

interface AdminManualPaymentsTabProps {
  showToast: (type: 'success' | 'error', message: string) => void;
  onPaymentApproved?: () => Promise<void>;
  onPendingCountChange?: (count: number) => void;
}

interface ProviderFormDraft {
  is_enabled: boolean;
  price_bdt: string;
  recipient_number: string;
  payment_method: PaymentMethod | '';
  instructions: string;
}

function configToDraft(cfg: ManualPaymentProviderConfig): ProviderFormDraft {
  return {
    is_enabled: Boolean(cfg.is_enabled),
    price_bdt: cfg.price_bdt ? String(cfg.price_bdt) : '',
    recipient_number: cfg.recipient_number || '',
    payment_method: cfg.payment_method || '',
    instructions: cfg.instructions || '',
  };
}

export const AdminManualPaymentsTab: React.FC<AdminManualPaymentsTabProps> = ({
  showToast,
  onPaymentApproved,
  onPendingCountChange,
}) => {
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingProvider, setSavingProvider] = useState<PaymentProvider | null>(null);
  const [drafts, setDrafts] = useState<Record<PaymentProvider, ProviderFormDraft>>(() => {
    const empty = createEmptyProviderConfigs();
    return {
      bkash: configToDraft(empty.bkash),
      nagad: configToDraft(empty.nagad),
    };
  });

  const [claims, setClaims] = useState<ManualPaymentClaim[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentClaimStatus>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Per-claim verification / rejection inputs
  const [verifiedAmounts, setVerifiedAmounts] = useState<Record<string, string>>({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [rejectingClaimId, setRejectingClaimId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [processingClaimId, setProcessingClaimId] = useState<string | null>(null);

  const loadPaymentData = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [providersRes, claimsRes] = await Promise.all([
        supabase.from('manual_payment_providers').select('*'),
        supabase
          .from('manual_payment_claims')
          .select(
            '*, profile:profiles!manual_payment_claims_user_id_fkey(id, full_name, email, phone, enrollment_status)'
          )
          .order('created_at', { ascending: false }),
      ]);

      if (providersRes.error) {
        if (isPaymentsMigrationMissingError(providersRes.error)) {
          setMigrationMissing(true);
          return;
        }
        throw providersRes.error;
      }

      if (claimsRes.error) {
        if (isPaymentsMigrationMissingError(claimsRes.error)) {
          setMigrationMissing(true);
          return;
        }
        throw claimsRes.error;
      }

      setMigrationMissing(false);
      const baseConfigs = createEmptyProviderConfigs();
      for (const row of (providersRes.data || []) as ManualPaymentProviderConfig[]) {
        if (row.provider === 'bkash' || row.provider === 'nagad') {
          baseConfigs[row.provider] = row;
        }
      }
      setDrafts({
        bkash: configToDraft(baseConfigs.bkash),
        nagad: configToDraft(baseConfigs.nagad),
      });

      const loadedClaims = (claimsRes.data || []) as ManualPaymentClaim[];
      setClaims(loadedClaims);
      const pendingCount = loadedClaims.filter((c) => c.status === 'pending').length;
      onPendingCountChange?.(pendingCount);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'পেমেন্ট তথ্য লোড করতে ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [onPendingCountChange, showToast]);

  useEffect(() => {
    loadPaymentData();
  }, [loadPaymentData]);

  const handleSaveProvider = async (provider: PaymentProvider) => {
    if (!isSupabaseConfigured || !supabase) return;
    const draft = drafts[provider];
    const parsedPrice = draft.price_bdt.trim() ? parsePositiveBdtAmount(draft.price_bdt) : null;
    const normalizedPhone = draft.recipient_number.trim()
      ? normalizeBdMobile(draft.recipient_number)
      : '';

    if (draft.recipient_number.trim() && !normalizedPhone) {
      showToast(
        'error',
        `${PAYMENT_PROVIDER_LABELS[provider]}: সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)।`
      );
      return;
    }

    if (draft.price_bdt.trim() && parsedPrice === null) {
      showToast(
        'error',
        `${PAYMENT_PROVIDER_LABELS[provider]}: সঠিক পূর্ণ সংখ্যায় টাকা (BDT) দিন।`
      );
      return;
    }

    if (draft.is_enabled) {
      if (!parsedPrice) {
        showToast('error', `${PAYMENT_PROVIDER_LABELS[provider]} চালু করতে নির্ধারিত BDT মূল্য দিন।`);
        return;
      }
      if (!normalizedPhone) {
        showToast('error', `${PAYMENT_PROVIDER_LABELS[provider]} চালু করতে রিসিভার নম্বর দিন।`);
        return;
      }
      if (!isValidPaymentMethod(draft.payment_method)) {
        showToast(
          'error',
          `${PAYMENT_PROVIDER_LABELS[provider]} চালু করতে সঠিক পেমেন্ট পদ্ধতি (Send Money / Payment / Cash Out) নির্বাচন করুন।`
        );
        return;
      }
    }

    try {
      setSavingProvider(provider);
      const { error } = await supabase.from('manual_payment_providers').upsert({
        provider,
        is_enabled: draft.is_enabled,
        price_bdt: parsedPrice,
        recipient_number: normalizedPhone || '',
        payment_method: isValidPaymentMethod(draft.payment_method) ? draft.payment_method : '',
        instructions: draft.instructions.trim(),
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;
      showToast('success', `${PAYMENT_PROVIDER_LABELS[provider]} সেটিংস সংরক্ষণ করা হয়েছে`);
      await loadPaymentData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সংরক্ষণ ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setSavingProvider(null);
    }
  };

  const handleApproveClaim = async (claim: ManualPaymentClaim) => {
    if (!isSupabaseConfigured || !supabase) return;

    const rawAmount = verifiedAmounts[claim.id] || '';
    const parsedVerifiedAmount = parsePositiveBdtAmount(rawAmount);
    if (!parsedVerifiedAmount) {
      showToast('error', 'অনুমোদনের আগে লেজারে প্রাপ্ত টাকার পরিমাণ (BDT) সঠিকভাবে লিখুন।');
      return;
    }

    if (parsedVerifiedAmount !== claim.expected_amount_bdt) {
      showToast(
        'error',
        `ভেরিফায়েড পরিমাণ (৳${parsedVerifiedAmount}) নির্ধারিত ফি (৳${claim.expected_amount_bdt}) এর সাথে মিলছে না।`
      );
      return;
    }

    try {
      setProcessingClaimId(claim.id);
      const { error } = await supabase.rpc('approve_manual_payment_claim', {
        p_claim_id: claim.id,
        p_verified_amount_bdt: parsedVerifiedAmount,
        p_admin_note: (adminNotes[claim.id] || '').trim() || null,
      });

      if (error) {
        showToast('error', error.message || 'পেমেন্ট অনুমোদন ব্যর্থ হয়েছে');
        return;
      }

      showToast('success', `TrxID ${claim.trx_id_normalized} অনুমোদিত হয়েছে এবং কোর্স এক্সেস চালু করা হয়েছে।`);

      // Non-blocking notification email
      if (claim.user_id) {
        const emailRes = await sendStudentStatusEmail(claim.user_id, 'approved');
        if (!emailRes.success) {
          showToast(
            'error',
            `পেমেন্ট ও এক্সেস অনুমোদিত হয়েছে, তবে ইমেইল পাঠানো যায়নি (${emailRes.error})`
          );
        }
      }

      await loadPaymentData();
      if (onPaymentApproved) {
        await onPaymentApproved();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুমোদন প্রক্রিয়ায় ত্রুটি হয়েছে';
      showToast('error', msg);
    } finally {
      setProcessingClaimId(null);
    }
  };

  const handleRejectClaim = async (claim: ManualPaymentClaim) => {
    if (!isSupabaseConfigured || !supabase) return;

    const reason = (rejectReasons[claim.id] || '').trim();
    if (!reason) {
      showToast('error', 'প্রত্যাখ্যানের কারণ উল্লেখ করুন।');
      return;
    }

    try {
      setProcessingClaimId(claim.id);
      const { error } = await supabase.rpc('reject_manual_payment_claim', {
        p_claim_id: claim.id,
        p_reject_reason: reason,
        p_admin_note: (adminNotes[claim.id] || '').trim() || null,
      });

      if (error) {
        showToast('error', error.message || 'প্রত্যাখ্যান ব্যর্থ হয়েছে');
        return;
      }

      setRejectingClaimId(null);
      showToast('success', `TrxID ${claim.trx_id_normalized} প্রত্যাখ্যান করা হয়েছে।`);
      await loadPaymentData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'প্রত্যাখ্যান প্রক্রিয়ায় ত্রুটি হয়েছে';
      showToast('error', msg);
    } finally {
      setProcessingClaimId(null);
    }
  };

  const counts = useMemo(() => {
    return {
      total: claims.length,
      pending: claims.filter((c) => c.status === 'pending').length,
      approved: claims.filter((c) => c.status === 'approved').length,
      rejected: claims.filter((c) => c.status === 'rejected').length,
    };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return claims.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.trx_id_normalized.toLowerCase().includes(q) ||
        c.payer_number.toLowerCase().includes(q) ||
        c.recipient_number.toLowerCase().includes(q) ||
        (c.profile?.full_name || '').toLowerCase().includes(q) ||
        (c.profile?.email || '').toLowerCase().includes(q)
      );
    });
  }, [claims, searchQuery, statusFilter]);

  if (migrationMissing) {
    return (
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-2">
        <div className="font-extrabold flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <span>ম্যানুয়াল পেমেন্ট ডাটাবেজ মাইগ্রেশন বাকি আছে</span>
        </div>
        <p className="text-amber-900 leading-relaxed">
          বিকাশ ও নগদ ম্যানুয়াল পেমেন্ট কনফিগারেশন, আবেদন সংরক্ষণ এবং অ্যাটমিক এডমিন অনুমোদন সিস্টেম চালু করতে Supabase SQL Editor-এ{' '}
          <code className="px-1.5 py-0.5 bg-amber-100 rounded font-mono">
            src/lib/supabase-manual-payments-migration.sql
          </code>{' '}
          ফাইলটি একবার রান করুন।
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Provider Configs */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm">
              ১. বিকাশ ও নগদ পেমেন্ট সেটিংস (প্রতি মাধ্যম অনুযায়ী)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              যে মাধ্যমের মূল্য (BDT), নম্বর ও সঠিক পেমেন্ট পদ্ধতি সেট করে সক্রিয় করবেন কেবল সেটিই /enroll পেজে খোলা থাকবে। কনফিগার না করা মাধ্যম বন্ধ থাকবে।
            </p>
          </div>
          <button
            type="button"
            onClick={loadPaymentData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['bkash', 'nagad'] as PaymentProvider[]).map((provider) => {
            const draft = drafts[provider];
            const isSaving = savingProvider === provider;
            const accentBorder =
              provider === 'bkash'
                ? 'border-pink-200 bg-pink-50/30'
                : 'border-orange-200 bg-orange-50/30';

            return (
              <div
                key={provider}
                className={`p-4 sm:p-5 rounded-2xl border ${accentBorder} space-y-4`}
              >
                <div className="flex items-center justify-between gap-3">
                  <PaymentProviderLogo provider={provider} size="md" />
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={draft.is_enabled}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], is_enabled: e.target.checked },
                        }))
                      }
                      className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                    />
                    <span>{draft.is_enabled ? 'সক্রিয় (চালু)' : 'বন্ধ'}</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      নির্ধারিত ফি (BDT টাকায়) *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={draft.price_bdt}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], price_bdt: e.target.value },
                        }))
                      }
                      placeholder="যেমন: 2650"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      রিসিভার নম্বর (১১ সংখ্যা) *
                    </label>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={draft.recipient_number}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], recipient_number: e.target.value },
                        }))
                      }
                      placeholder="01XXXXXXXXX"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      সঠিক পেমেন্ট পদ্ধতি (Method) *
                    </label>
                    <select
                      value={draft.payment_method}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [provider]: {
                            ...prev[provider],
                            payment_method: e.target.value as PaymentMethod | '',
                          },
                        }))
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-bold"
                    >
                      <option value="">-- পদ্ধতি নির্বাচন করুন --</option>
                      <option value="send_money">{PAYMENT_METHOD_LABELS.send_money}</option>
                      <option value="payment">{PAYMENT_METHOD_LABELS.payment}</option>
                      <option value="cash_out">{PAYMENT_METHOD_LABELS.cash_out}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      অতিরিক্ত নির্দেশনা (ঐচ্ছিক)
                    </label>
                    <textarea
                      rows={2}
                      value={draft.instructions}
                      onChange={(e) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [provider]: { ...prev[provider], instructions: e.target.value },
                        }))
                      }
                      placeholder="শিক্ষার্থীর জন্য অতিরিক্ত কোনো নির্দেশনা থাকলে লিখুন..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveProvider(provider)}
                    className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : `${PAYMENT_PROVIDER_LABELS[provider]} সংরক্ষণ`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Payment Claims Review Queue */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <ShieldCheck size={17} className="text-emerald-600 shrink-0" />
              <span>২. ম্যানুয়াল পেমেন্ট রিভিউ কিউ</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              আপনার বিকাশ/নগদ অ্যাপ বা স্টেটমেন্টে প্রাপ্ত টাকা ও TrxID মিলিয়ে ভেরিফায়েড পরিমাণ লিখে অনুমোদন করুন।
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold text-slate-700">
              মোট: {counts.total}
            </span>
            <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg font-bold text-amber-900">
              অপেক্ষমাণ: {counts.pending}
            </span>
            <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg font-bold text-emerald-900">
              অনুমোদিত: {counts.approved}
            </span>
            <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 rounded-lg font-bold text-rose-900">
              প্রত্যাখ্যাত: {counts.rejected}
            </span>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: 'pending', label: `অপেক্ষমাণ (${counts.pending})` },
                { key: 'approved', label: `অনুমোদিত (${counts.approved})` },
                { key: 'rejected', label: `প্রত্যাখ্যাত (${counts.rejected})` },
                { key: 'all', label: `সব (${counts.total})` },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-72">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="TrxID, নম্বর, নাম বা ইমেইল..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Claims List */}
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">
            পেমেন্ট আবেদন লোড হচ্ছে...
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            এই ক্যাটাগরিতে কোনো পেমেন্ট আবেদন পাওয়া যায়নি।
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClaims.map((claim) => {
              const isBusy = processingClaimId === claim.id;
              const isRejectOpen = rejectingClaimId === claim.id;

              return (
                <div
                  key={claim.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <PaymentProviderLogo provider={claim.provider} size="sm" />
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-bold text-slate-700">
                          {PAYMENT_METHOD_LABELS[claim.payment_method] || claim.payment_method}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            claim.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : claim.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {claim.status === 'approved' ? (
                            <CheckCircle2 size={12} />
                          ) : claim.status === 'rejected' ? (
                            <XCircle size={12} />
                          ) : (
                            <Clock size={12} />
                          )}
                          {PAYMENT_CLAIM_STATUS_LABELS[claim.status]}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 pt-1">
                        <strong className="text-slate-900">
                          {claim.profile?.full_name || 'অভিভাবক'}
                        </strong>{' '}
                        <span className="text-slate-500 font-mono">
                          ({claim.profile?.email || claim.user_id})
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <div className="font-black text-slate-900 text-base tabular-nums">
                        ৳ {claim.submitted_amount_bdt}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        নির্ধারিত: ৳ {claim.expected_amount_bdt}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 bg-white rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">TrxID</span>
                      <span className="font-mono font-black text-slate-900 select-all">
                        {claim.trx_id_normalized}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">প্রেরকের নম্বর</span>
                      <span className="font-mono font-bold text-slate-800 select-all">
                        {claim.payer_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">প্রাপক নম্বর</span>
                      <span className="font-mono font-bold text-slate-700">
                        {claim.recipient_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">জমা দেওয়ার সময়</span>
                      <span className="font-medium text-slate-700">
                        {new Date(claim.created_at).toLocaleString('bn-BD')}
                      </span>
                    </div>
                  </div>

                  {/* Review Controls for Pending Claims */}
                  {claim.status === 'pending' && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">
                            লেজারে প্রাপ্ত পরিমাণ (৳) *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={verifiedAmounts[claim.id] || ''}
                            onChange={(e) =>
                              setVerifiedAmounts((prev) => ({
                                ...prev,
                                [claim.id]: e.target.value,
                              }))
                            }
                            placeholder={`যেমন: ${claim.expected_amount_bdt}`}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold focus:outline-none focus:border-emerald-600"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-bold text-slate-700 mb-1">
                            এডমিন নোট (ঐচ্ছিক)
                          </label>
                          <input
                            type="text"
                            value={adminNotes[claim.id] || ''}
                            onChange={(e) =>
                              setAdminNotes((prev) => ({
                                ...prev,
                                [claim.id]: e.target.value,
                              }))
                            }
                            placeholder="অভ্যন্তরীণ রেফারেন্স নোট..."
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-slate-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApproveClaim(claim)}
                          className="min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 size={15} />
                          <span>{isBusy ? 'প্রক্রিয়াধীন...' : 'যাচাই ও অনুমোদন করুন'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            setRejectingClaimId((prev) => (prev === claim.id ? null : claim.id))
                          }
                          className="min-h-[40px] px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-extrabold rounded-xl inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <XCircle size={15} />
                          <span>প্রত্যাখ্যান করুন</span>
                        </button>
                      </div>

                      {isRejectOpen && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 text-xs">
                          <label className="block font-bold text-rose-900">
                            প্রত্যাখ্যানের কারণ (ব্যবহারকারীকে দেখানো হবে) *
                          </label>
                          <input
                            type="text"
                            value={rejectReasons[claim.id] || ''}
                            onChange={(e) =>
                              setRejectReasons((prev) => ({
                                ...prev,
                                [claim.id]: e.target.value,
                              }))
                            }
                            placeholder="যেমন: প্রদত্ত TrxID বা টাকার পরিমাণ মেলেনি"
                            className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl font-medium focus:outline-none focus:border-rose-600"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleRejectClaim(claim)}
                              className="min-h-[36px] px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                            >
                              প্রত্যাখ্যান নিশ্চিত করুন
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingClaimId(null)}
                              className="min-h-[36px] px-3 py-1.5 bg-white text-slate-700 border border-slate-200 font-bold rounded-lg cursor-pointer"
                            >
                              বাতিল
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outcome Details for Reviewed Claims */}
                  {claim.status === 'approved' && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <strong>ভেরিফায়েড লেজার পরিমাণ:</strong> ৳ {claim.verified_amount_bdt ?? claim.submitted_amount_bdt}
                        {claim.admin_note ? ` · নোট: ${claim.admin_note}` : ''}
                      </span>
                      {claim.reviewed_at && (
                        <span className="text-[11px] text-emerald-700">
                          অনুমোদিত: {new Date(claim.reviewed_at).toLocaleString('bn-BD')}
                        </span>
                      )}
                    </div>
                  )}

                  {claim.status === 'rejected' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <strong>প্রত্যাখ্যানের কারণ:</strong> {claim.reject_reason || 'উল্লেখ নেই'}
                        </span>
                        {claim.reviewed_at && (
                          <span className="text-[11px] text-rose-700">
                            তারিখ: {new Date(claim.reviewed_at).toLocaleString('bn-BD')}
                          </span>
                        )}
                      </div>
                      {claim.admin_note && (
                        <div className="text-[11px] text-rose-800">অ্যাডমিন নোট: {claim.admin_note}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
