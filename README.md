# অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম (Abacus Parent Training)

অভিভাবকদের জন্য স্ট্রাকচার্ড অনলাইন ট্রেনিং প্ল্যাটফর্ম।

## Supabase ও Vercel সেটআপ নির্দেশিকা

১. **Supabase ইমেইল ভেরিফিকেশন চালু করুন:**
   - Supabase Dashboard → **Authentication** → **Providers** → **Email**:
   - `Confirm email` অপশনটি **ON** করুন (যাতে কেউ অনুমোদন ছাড়া `rssharifu@gmail.com` ইমেইল দাবি করতে না পারে)।

২. **URL Configuration সেট করুন:**
   - Supabase Dashboard → **Authentication** → **URL Configuration**:
   - `Site URL` হিসেবে আপনার Vercel অ্যাপের ডোমেইন দিন।
   - `Redirect URLs` এও একই ডোমেইন যুক্ত করুন (পাসওয়ার্ড রিসেটের জন্য প্রয়োজনীয়)।

৩. **SQL স্কিমা রান করুন:**
   - `src/lib/supabase-schema.sql` ফাইলের পুরো কোডটি কপি করুন।
   - Supabase Dashboard → **SQL Editor** এ গিয়ে পেস্ট করে **Run** করুন।
   - এরপর `rssharifu@gmail.com` দিয়ে ওয়েবসাইটে একবার রেজিস্ট্রেশন/লগইন করুন (এটি স্বয়ংক্রিয়ভাবে প্রধান এডমিন হিসেবে সেট হবে)।

৪. **Vercel Environment Variables যোগ করুন:**
   - Vercel Dashboard → Project → **Settings** → **Environment Variables**:
     - `VITE_SUPABASE_URL` = (আপনার Supabase Project URL)
     - `VITE_SUPABASE_ANON_KEY` = (আপনার Supabase Project Anon Public Key)
     - `VITE_OWNER_EMAIL` = `rssharifu@gmail.com` (ঐচ্ছিক)
   - ভেরিয়েবল সেট করে Vercel-এ **Redeploy** করুন।

৫. **নমুনা ক্লাস ইমপোর্ট করুন:**
   - `rssharifu@gmail.com` দিয়ে লগইন করে এডমিন প্যানেলের "ক্লাস" ট্যাবে যান।
   - সেখানে প্রদর্শিত **"নমুনা ক্লাস ইমপোর্ট"** বাটনে ক্লিক করলেই পূর্বের ৮টি ক্লাস ডাটাবেজে যুক্ত হয়ে যাবে।
