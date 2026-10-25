# অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম (Abacus Parent Training)

অভিভাবকদের জন্য তৈরি একটি স্ট্রাকচার্ড অনলাইন ট্রেনিং প্ল্যাটফর্ম (React 19 + Vite + Tailwind 4 + Supabase on Vercel)।

---

## 🛠️ সেটআপ ও কনফিগারেশন চেকলিস্ট (Setup Checklist)

### ১. Supabase Authentication কনফিগারেশন (OTP ভেরিফিকেশন কোড)
1. Supabase Dashboard → **Authentication** → **Providers** → **Email**:
   - **Confirm email: ON রাখুন**।
2. Supabase Dashboard → **Authentication** → **Email Templates** → **Confirm signup**:
   - টেমপ্লেটে লিংকের বদলে OTP কোড টোকেন `{{ .Token }}` বসান (কোনো লিংক থাকবে না)।
   - ব্যবহারকারী নিবন্ধনের পর সরাসরি মোডালের ভেতর ৬ সংখ্যার কোড প্রবেশ করিয়ে অ্যাকাউন্ট ভেরিফাই করবেন।
3. Supabase Dashboard → **Authentication** → **URL Configuration**:
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
| `SMTP_HOST` | SMTP সার্ভার হোস্ট | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP পোর্ট (SSL/TLS) | `465` |
| `SMTP_USER` | আপনার Gmail বা SMTP ইউজারনেম | `rssharifu@gmail.com` |
| `SMTP_PASS` | Gmail 16-অক্ষরের App Password | `xxxx xxxx xxxx xxxx` |
| `MAIL_FROM` | প্রেরকের ইমেইল ফরম্যাট | `অ্যাবাকাস Parent Training <rssharifu@gmail.com>` |
| `SITE_URL` | সাইটের মূল লাইভ URL | `https://your-app.vercel.app` |
| `SITE_NAME` | সাইটের নাম (ঐচ্ছিক) | `অ্যাবাকাস Parent Training` |

> ℹ️ **সার্ভারলেস ইমেইল ফাংশন:** `/api/send-email` একটি Vercel Node Runtime সার্ভারলেস ফাংশন। এটি `nodemailer` ও SMTP-এর মাধ্যমে শুধুমাত্র এডমিন অনুমোদনে ভর্তি নিশ্চিতকরণ ইমেইল (`type: 'approved'`) এবং প্রত্যাখ্যান ইমেইল (`type: 'rejected'`) পাঠায়।

---

## 🛡️ ভিডিও সিকিউরিটি ও ওয়াটারমার্ক নীতি
> **গুরুত্বপূর্ণ সিকিউরিটি বাস্তবতা:** স্ক্রিন রেকর্ডিং কোনো ব্রাউজারে শতভাগ ব্লক করা সম্ভব নয়; দর্শকের পরিচয়যুক্ত ডায়নামিক মুভিং ওয়াটারমার্ক ভিডিও লিক বা রেকর্ড করার বিরুদ্ধে একটি শক্তিশালী প্রতিরোধক (deterrent) এবং লিক হলে উৎস শনাক্তযোগ্য (traceable) করে তোলে।

- **ডায়নামিক ওয়াটারমার্ক:** ভিডিও চলাকালীন অভিভাবকের ইমেইল/ফোন নম্বর স্ক্রিনের নিরাপদ স্থানে নিয়মিত অবস্থান পরিবর্তন করে।
- **দৃশ্যমানতা ও গতিশীলতা:** সেটিংস থেকে অপাসিটি (১০-৬০%) ও স্থান পরিবর্তনের সেকেন্ড (৫-৬০ সেকেন্ড) লাইভ পরিবর্তন ও প্রিভিউ করা যায়।
- **ফুলস্ক্রিন সুরক্ষা:** আইফ্রেমের নিজস্ব ফুলস্ক্রিন বন্ধ রাখা হয়েছে এবং কাস্টম ফুলস্ক্রিন র্যাপার ব্যবহারের ফলে ফুলস্ক্রিন মোডেও ওয়াটারমার্ক অটুট থাকে।
- **ট্যাম্পার ডিটারেন্ট:** ব্রাউজার দেবটুলস বা ইন্সপেক্ট করে ওয়াটারমার্ক মোছার বা লুকানোর চেষ্টা করা হলে প্লেয়ার তাৎক্ষণিকভাবে ভিডিও ব্লাঙ্ক করে সতর্কবার্তা প্রদর্শন করে।

---

## 👨‍💼 প্রথম অ্যাকাউন্ট ও রোল নির্দেশিকা
1. **ওনার অ্যাকাউন্ট (`rssharifu@gmail.com`):**
   - সাইটে সর্বপ্রথম `rssharifu@gmail.com` ইমেইল দিয়ে রেজিস্টার করুন। ইমেইলে প্রাপ্ত ওটিপি কোডটি প্রবেশ করালে ওনার ইমেইলটি স্বয়ংক্রিয়ভাবে `role = 'admin'` এবং `enrollment_status = 'approved'` হিসেবে সেট হবে।
   - লগইন করে এডমিন প্যানেলের "ক্লাস" ট্যাবে **"নমুনা ক্লাস ইমপোর্ট"** বাটনে ক্লিক করে পূর্ববর্তী ক্লাসগুলো ডাটাবেজে যুক্ত করে নিন।
2. **শিক্ষার্থী ভর্তি কিউ (Admin Panel):**
   - **Pending:** নতুন আবেদনসমূহ পর্যালোচনা করুন। "Approve" বাটনে ক্লিক করলে ডাটাবেজে স্ট্যাটাস আপডেট হবে এবং SMTP-এর মাধ্যমে শিক্ষার্থীকে অভিনন্দন ও লগইন লিংক ইমেইল পাঠানো হবে।
   - **Reject:** কারণ উল্লেখ করে (বা কুইক রিজন বাটন দিয়ে) প্রত্যাখ্যান করতে পারেন।
   - **Approved:** অনুমোদিত শিক্ষার্থীদের তালিকা এবং প্রয়োজন হলে "ইমেইল আবার পাঠান" বাটন।
3. **অভিভাবক (Student Experience):**
   - সাইনআপ করার পর মডালের ভেতরেই ওটিপি কোড প্রবেশ করানোর স্ক্রিন আসবে।
   - কোড যাচাই হওয়ার সাথে সাথে স্বাগতম পপআপ প্রদর্শিত হবে এবং পেন্ডিং স্ক্রিনে নিয়ে যাবে।
   - এডমিন অনুমোদন দেয়ার পর লগইন করলে সম্পূর্ণ কোর্স আনলক হবে।
