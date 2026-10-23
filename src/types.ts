export type UserRole = 'parent' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  is_active: boolean;
  child_name?: string;
  child_age?: number;
  created_at?: string;
  enrollment_status?: 'pending' | 'approved' | 'rejected';
  reviewed_at?: string | null;
  reject_reason?: string | null;
}

export interface ClassItem {
  id: string;
  class_number: number;
  title: string;
  description: string;
  video_url: string;
  is_published: boolean;
  created_at?: string;
  // Optional backward compatibility fields
  youtube_video_id?: string;
  short_intro?: string;
}

export interface AdminRequest {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  decided_at?: string;
}

export interface SiteSettings {
  // Branding
  site_name: string;
  site_subtitle: string;
  logo_emoji: string;
  browser_title: string;

  // Login page & Registration
  login_badge: string;
  login_headline: string;
  login_subtext: string;
  login_button_label: string;
  allow_registration: boolean;

  // Student Registration & Approval texts
  register_success_title: string;
  register_success_text: string;
  pending_title: string;
  pending_text: string;
  rejected_text: string;
  review_hours: number;

  // Dashboard
  dashboard_title: string;
  dashboard_subtitle: string;
  empty_classes_text: string;

  // Footer / contact
  footer_description: string;
  contact_phone: string;
  contact_email: string;
  contact_hours: string;
  security_notice_title: string;
  security_notice_text: string;
  copyright_text: string;
  footer_tagline: string;
  show_secure_badge: boolean;
  secure_badge_label: string;
  show_certified_badge: boolean;
  certified_badge_label: string;

  // Video
  drive_hide_header: boolean;
  drive_header_offset: number; // 0-80 px
  block_popout_overlay: boolean;
  watermark_enabled: boolean;
  watermark_mode: 'email' | 'phone' | 'both';
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  // Branding
  site_name: 'অ্যাবাকাস Parent Training',
  site_subtitle: 'অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম',
  logo_emoji: '🧮',
  browser_title: 'অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম | Abacus Parent Training',

  // Login page & Registration
  login_badge: 'অ্যাবাকাস Parent Training',
  login_headline: 'আপনার সন্তানকে ঘরে বসেই প্রফেশনাল উপায়ে অ্যাবাকাস শেখান',
  login_subtext: 'কোর্স কন্টেন্ট ও ভিডিও লেসন দেখতে আপনার নিবন্ধিত অ্যাকাউন্ট দিয়ে লগইন করুন।',
  login_button_label: 'লগইন করুন',
  allow_registration: true,

  // Student Registration & Approval texts
  register_success_title: 'রেজিস্ট্রেশন গ্রহণ করা হয়েছে ✅',
  register_success_text: 'আপনার আবেদন আমরা পেয়েছি। আপনার তথ্য যাচাই করে ২৪ ঘণ্টার মধ্যে ইমেইলের মাধ্যমে জানানো হবে। অনুগ্রহ করে ইমেইলে পাঠানো লিংকে ক্লিক করে আপনার ইমেইল যাচাই করুন।',
  pending_title: 'অনুমোদনের অপেক্ষায় (Pending)',
  pending_text: 'আপনার আবেদনটি পর্যালোচনার জন্য অপেক্ষমাণ রয়েছে। সাধারণত ২৪ ঘণ্টার মধ্যে তথ্য যাচাই করে ইমেইলের মাধ্যমে এক্সেস উন্মুক্ত করা হয়।',
  rejected_text: 'আপনার ভর্তি আবেদন এই মুহূর্তে গ্রহণ করা সম্ভব হয়নি। বিস্তারিত জানতে আমাদের সাপোর্টে যোগাযোগ করুন।',
  review_hours: 24,

  // Dashboard
  dashboard_title: 'অ্যাবাকাস Parent Training',
  dashboard_subtitle: 'ক্লাস নির্বাচন করে ট্রেনিং ভিডিও শুরু করুন।',
  empty_classes_text: 'এখনও কোনো প্রকাশকৃত ক্লাস নেই।',

  // Footer / contact
  footer_description: 'অভিভাবকদের জন্য তৈরি একটি স্ট্রাকচার্ড অনলাইন ট্রেনিং প্ল্যাটফর্ম। বিজ্ঞানসম্মত অ্যাবাকাস পদ্ধতির মাধ্যমে আপনার সন্তানকে মানসিকভাবে দ্রুত ও নির্ভুল গণিতে পারদর্শী করে তুলুন।',
  contact_phone: '+880 1712-345678',
  contact_email: 'support@abacus.bd',
  contact_hours: 'সকাল ১০:০০ - রাত ৯:০০ (প্রতিদিন)',
  security_notice_title: 'কোর্স সিকিউরিটি তথ্য',
  security_notice_text: 'এই কোর্সের সকল ভিডিও কনটেন্ট নিবন্ধিত অভিভাবকের ব্যক্তিগত শিক্ষার উদ্দেশ্যে তৈরি। ভিডিও ডাউনলোড বা অনুমতি ব্যতীত প্রচার সম্পূর্ণ নিষিদ্ধ।',
  copyright_text: 'Abacus Parent Training Program. সর্বস্বত্ব সংরক্ষিত।',
  footer_tagline: 'শিক্ষার্থীদের ভবিষ্যতের জন্য তৈরি',
  show_secure_badge: true,
  secure_badge_label: 'সুরক্ষিত এক্সেস',
  show_certified_badge: true,
  certified_badge_label: 'সার্টিফাইড কোর্স',

  // Video
  drive_hide_header: true,
  drive_header_offset: 52,
  block_popout_overlay: true,
  watermark_enabled: false,
  watermark_mode: 'email',
};
