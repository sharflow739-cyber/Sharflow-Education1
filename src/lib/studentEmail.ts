import { supabase } from './supabase';

/**
 * Calls the Vercel serverless function /api/send-email
 * with type: 'approved' | 'rejected' to notify the student via SMTP (nodemailer).
 */
export async function sendStudentStatusEmail(
  studentId: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { success: false, error: 'Supabase ক্লায়েন্ট সক্রিয় নয়।' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      return { success: false, error: 'অ্যাডমিন অ্যাক্সেস টোকেন পাওয়া যায়নি।' };
    }

    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: status,
        studentId,
        reason,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errMsg = data?.error || `সার্ভার রেসপন্স কোড: ${response.status}`;
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'নেটওয়ার্ক সংযোগ ত্রুটি';
    return { success: false, error: msg };
  }
}
