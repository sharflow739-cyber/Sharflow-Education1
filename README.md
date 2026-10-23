# অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম (Abacus Parent Training)

অভিভাবকদের জন্য তৈরি একটি স্ট্রাকচার্ড অনলাইন ট্রেনিং প্ল্যাটফর্ম (React 19 + Vite + Tailwind 4 + Supabase on Vercel)।

---

## 🛠️ সেটআপ ও কনফিগারেশন চেকলিস্ট (Setup Checklist)

### ১. Supabase Authentication কনফিগারেশন
1. Supabase Dashboard → **Authentication** → **Providers** → **Email**:
   - **Confirm email: OFF রাখুন** (যাতে অভিভাবক সাইনআপ করার পর সরাসরি সেশন তৈরি হয় এবং সিস্টেম পেন্ডিং স্ক্রিনে নিয়ে যায়; কোনো Supabase কনফার্মেশন লিংকের প্রয়োজন নেই)।
2. Supabase Dashboard → **Authentication** → **URL Configuration**:
   - **Site URL**: আপনার Vercel প্রডাকশন ডোমেইন দিন (যেমন: `https://your-app.vercel.app`)।
   - **Redirect URLs**: আপনার প্রডাকশন ডোমেইন ও লোকাল টেস্ট URL যুক্ত করুন:
     - `https://your-app.vercel.app/**`
     - `http://localhost:3000/**`

### ২. ডাটাবেজ অবজেক্ট ও আরপিসি (Database Requirements)
Supabase SQL Editor-এ নিচের অবজেক্ট ও পলিসিগুলো কার্যকর থাকতে হবে:
- `profiles.enrollment_status` (`'pending' | 'approved' | 'rejected'`)
- `profiles.reviewed_at` (timestamptz)
- `profiles.reject_reason` (text)
- RPC: `set_student_status(target uuid, new_status text, reason text default null)`
- RPC: `decide_admin_request(req_id uuid, approve boolean)` এবং `request_admin_access()`
- RLS পলিসি: শুধুমাত্র অনুমোদিত (`enrollment_status = 'approved'`) অভিভাবকগণ পাবলিশড ক্লাস পড়তে পারবেন। পেন্ডিং বা প্রত্যাখ্যাত অবস্থায় সার্ভার থেকে খালি তালিকা ফেরত যাবে।
- এডমিনগণ সকল `profiles` দেখতে পারেন।

### ৩. Vercel Environment Variables
Vercel Dashboard → আপনার প্রজেক্ট → **Settings** → **Environment Variables** এ গিয়ে নিচের ভেরিয়েবলগুলো যুক্ত করুন:

| Variable Name | Description | Example / Note |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase প্রজেক্ট URL | `https://xxxx.supabase.co` (শেষে কোনো স্ল্যাশ থাকবে না) |
| `VITE_SUPABASE_ANON_KEY` | Supabase পাবলিক অ্যানন কি | `eyJhbGci...` |
| `VITE_OWNER_EMAIL` | প্রধান ওনার ইমেইল | `rssharifu@gmail.com` |
| `RESEND_API_KEY` | Resend সার্ভার API কি (সার্ভার সিক্রেট) | `re_123456789...` (**কখনই** `VITE_` প্রিফিক্স দেবেন না) |
| `MAIL_FROM` | প্রেরকের ইমেইল ফরম্যাট | `অ্যাবাকাস Parent Training <onboarding@resend.dev>` বা ভেরিফাইড ডোমেইন |
| `SITE_URL` | সাইটের মূল লাইভ URL | `https://your-app.vercel.app` |
| `SITE_NAME` | সাইটের নাম (ঐচ্ছিক) | `অ্যাবাকাস Parent Training` |

> ℹ️ **সার্ভারলেস ইমেইল ফাংশন:** `/api/send-email` একটি Vercel Node Runtime সার্ভারলেস ফাংশন। এটি Resend HTTP API-র মাধ্যমে স্বয়ংক্রিয়ভাবে স্বাগতম ইমেইল (`type: 'registered'`), ভর্তি অনুমোদন ইমেইল (`type: 'approved'`), এবং প্রত্যাখ্যান ইমেইল (`type: 'rejected'`) পাঠায়।

---

## 👨‍💼 প্রথম অ্যাকাউন্ট ও রোল নির্দেশিকা
1. **ওনার অ্যাকাউন্ট (`rssharifu@gmail.com`):**
   - সাইটে সর্বপ্রথম `rssharifu@gmail.com` ইমেইল দিয়ে রেজিস্টার বা লগইন করুন। ওনার ইমেইলটি স্বয়ংক্রিয়ভাবে `role = 'admin'` এবং `enrollment_status = 'approved'` হিসেবে সেট হবে।
   - লগইন করে এডমিন প্যানেলের "ক্লাস" ট্যাবে **"নমুনা ক্লাস ইমপোর্ট"** বাটনে ক্লিক করে পূর্ববর্তী ক্লাসগুলো ডাটাবেজে যুক্ত করে নিন।
2. **শিক্ষার্থী ভর্তি কিউ (Admin Panel):**
   - **Pending:** নতুন আবেদনসমূহ পর্যালোচনা করুন। "অনুমোদন" বাটনে ক্লিক করলে ডাটাবেজে স্ট্যাটাস আপডেট হবে এবং Resend-এর মাধ্যমে শিক্ষার্থীকে অভিনন্দন ইমেইল পাঠানো হবে।
   - **Reject:** কারণ উল্লেখ করে প্রত্যাখ্যান করতে পারেন।
   - **Approved:** অনুমোদিত শিক্ষার্থীদের তালিকা এবং প্রয়োজন হলে "ইমেইল আবার পাঠান" বাটন।
3. **অভিভাবক (Student Experience):**
   - সাইনআপের সাথে সাথে "রেজিস্ট্রেশন গ্রহণ করা হয়েছে ✅" পপআপ প্রদর্শিত হবে।
   - এরপর ২৪ ঘণ্টার পর্যালোচনার জন্য পেন্ডিং স্ক্রিনে অবস্থান করবে।
   - এডমিন অনুমোদন দেয়ার পর লগইন করলে সম্পূর্ণ কোর্স আনলক হবে।
