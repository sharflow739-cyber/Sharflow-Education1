import { ClassItem, Course, Announcement, WorksheetItem, QuizQuestion } from '../types';

export const DEFAULT_COURSE: Course = {
  id: 'abacus-parent-v1',
  title: 'অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম (লেভেল ১)',
  description: 'অভিভাবকদের জন্য তৈরি একটি সম্পূর্ণ নির্দেশিকা, যার মাধ্যমে আপনি আপনার সন্তানকে ঘরে বসেই প্রফেশনাল উপায়ে অ্যাবাকাস শেখাতে পারবেন।',
  total_classes: 8,
  badge: 'সার্টিফাইড পেরেন্ট কোচ',
};

export const DEFAULT_CLASSES: ClassItem[] = [
  {
    id: 'class-01',
    course_id: 'abacus-parent-v1',
    class_number: 1,
    title: 'অ্যাবাকাস পরিচিতি ও এর অসাধারণ উপকারিতা',
    title_en: 'Introduction to Soroban Abacus',
    short_intro: 'অ্যাবাকাস কী, কেন এটি শিশুর মস্তিষ্কের উভয় অংশের বিকাশ ঘটায় এবং কীভাবে আপনার সন্তানকে মানসিক গণিতে পারদর্শী করবেন তা এই ক্লাসে আলোচনা করা হয়েছে।',
    youtube_video_id: 'Cv36D883_3A', // Educational Abacus Intro video ID
    duration_minutes: 15,
    module_name: 'মডিউল ১: মৌলিক ধারণা ও ফ্রেম পরিচিতি',
    practice_instructions: [
      'অ্যাবাকাস ফ্রেমের চারটি প্রধান অংশ (আউটার ফ্রেম, বিম, আপার বিড, লোয়ার বিড) চিহ্নিত করুন।',
      'অ্যাবাকাস কীভাবে রিসেট করতে হয় (Clear position) তা সন্তানকে দেখান।',
      'তর্জনী ও বুড়ো আঙুলের সঠিক ব্যবহার শিখুন।'
    ],
    homework_title: 'হোমওয়ার্ক ১: অ্যাবাকাস ফ্রেম ও বিড চিহ্নিতকরণ',
    homework_instructions: 'আপনার অ্যাবাকাস টুলের ১ থেকে ৯ পর্যন্ত সংখ্যা বসিয়ে ছবি তুলুন অথবা নিচে লিখে জমা দিন যে কোন বিডের মান কত।',
    is_locked_by_default: false,
  },
  {
    id: 'class-02',
    course_id: 'abacus-parent-v1',
    class_number: 2,
    title: 'সোবান (Soroban) ফ্রেমে সংখ্যা ১-৯ গণনা ও বসানো',
    title_en: 'Counting Numbers 1-9 on Soroban',
    short_intro: 'সোবান অ্যাবাকাস ফ্রেমে ১ থেকে ৯ পর্যন্ত সংখ্যা কীভাবে সঠিক আঙুলের সাহায্যে তৈরি করতে হয় এবং বিড সরাতে হয় তা বিস্তারিত শিখুন।',
    youtube_video_id: 'd9L4v0z5X_c', // Abacus counting video
    duration_minutes: 18,
    module_name: 'মডিউল ১: মৌলিক ধারণা ও ফ্রেম পরিচিতি',
    practice_instructions: [
      'বুড়ো আঙুল (Thumb) দিয়ে নিচের বিডগুলো উপরে তুলুন (মান ১, ২, ৩, ৪)।',
      'তর্জনী (Index finger) দিয়ে উপরের বিড নিচে নামান (মান ৫)।',
      'বিম স্পর্শ না করলে মান শূন্য (0) হয় তা নিশ্চিত করুন।'
    ],
    homework_title: 'হোমওয়ার্ক ২: সংখ্যা ১-৯ গণনা অনুশীলন',
    homework_instructions: 'অ্যাবাকাসে ৩, ৫, ৭, এবং ৯ সংখ্যা তৈরি করে বিডের অবস্থান সংক্ষেপে বর্ণনা করুন।',
    is_locked_by_default: true,
  },
  {
    id: 'class-03',
    course_id: 'abacus-parent-v1',
    class_number: 3,
    title: 'দুই অঙ্কের সংখ্যা (১০ থেকে ৯৯) উপস্থাপন ও স্থানমান',
    title_en: 'Representing 10-99 on Abacus',
    short_intro: 'একক (Units) ও দশক (Tens) রড ব্যবহার করে দুই অঙ্কের যেকোনো সংখ্যা দ্রুত অ্যাবাকাস ফ্রেমে স্থাপন করার নিয়ম।',
    youtube_video_id: '1a511_xPqFw',
    duration_minutes: 20,
    module_name: 'মডিউল ২: দুই অঙ্কের সংখ্যা ও সরাসরি যোগ-বিয়োগ',
    practice_instructions: [
      'ডানদিকের প্রথম রডকে একক (Units rod) এবং এর বামদিকের রডকে দশক (Tens rod) হিসেবে ধরি।',
      'সংখ্যা ২৩ তৈরির জন্য দশক রডে ২টি নিচের বিড এবং একক রডে ৩টি নিচের বিড উঠান।',
      'সংখ্যা ৪৫ তৈরির জন্য দশক রডে ৪ এবং একক রডে ৫ বসান।'
    ],
    homework_title: 'হোমওয়ার্ক ৩: দুই অঙ্কের সংখ্যা অনুশীলন',
    homework_instructions: '১৫, ৪৭, ৬৮, ৮৯ সংখ্যাগুলো অ্যাবাকাস ফ্রেমে বসানোর ধাপগুলো বর্ণনা করে লিখুন।',
    is_locked_by_default: true,
  },
  {
    id: 'class-04',
    course_id: 'abacus-parent-v1',
    class_number: 4,
    title: 'সরাসরি যোগ (Direct Addition) পদ্ধতি',
    title_en: 'Direct Addition without Formula',
    short_intro: 'কোনো ফর্মুলা বা সূত্র ছাড়া সরাসরি বিড নাড়িয়ে কীভাবে সহজ যোগফল বের করতে হয়।',
    youtube_video_id: '3_QG05v7v7E',
    duration_minutes: 22,
    module_name: 'মডিউল ২: দুই অঙ্কের সংখ্যা ও সরাসরি যোগ-বিয়োগ',
    practice_instructions: [
      '১ + ২ = ৩ (সরাসরি ১ বিড উঠিয়ে তারপর আরো ২ বিড উঠানো)।',
      '৫ + ৩ = ৮ (উপরের ১টি বিড নামিয়ে এবং নিচের ৩টি বিড উঠিয়ে)।',
      '২১ + ৫২ = ৭৩ (একক ও দশক রডে আলাদা আলাদা বিড বসানো)।'
    ],
    homework_title: 'হোমওয়ার্ক ৪: সরাসরি যোগ প্র্যাকটিস',
    homework_instructions: 'নিচের যোগগুলো অ্যাবাকাসে করে উত্তর লিখুন: (ক) ১২ + ৫ (খ) ৩৩ + ৫৫ (গ) ১৪ + ৫০',
    is_locked_by_default: true,
  },
  {
    id: 'class-05',
    course_id: 'abacus-parent-v1',
    class_number: 5,
    title: 'সরাসরি বিয়োগ (Direct Subtraction) নিয়মাবলী',
    title_en: 'Direct Subtraction Techniques',
    short_intro: 'ফর্মুলা ছাড়া সরাসরি বিড সরিয়ে সহজ বিয়োগ করার সঠিক প্রসেস ও ফিঙ্গার মুভমেন্ট।',
    youtube_video_id: 'W_g_eJgK0q0',
    duration_minutes: 19,
    module_name: 'মডিউল ২: দুই অঙ্কের সংখ্যা ও সরাসরি যোগ-বিয়োগ',
    practice_instructions: [
      '৯ - ৪ = ৫ (নিচের ৪টি বিড তর্জনী দিয়ে নিচে নামিয়ে দিন)।',
      '৭ - ৫ = ২ (উপরের ৫ মানযুক্ত বিডকে উপরে সরিয়ে দিন)।',
      '৮৬ - ৩১ = ৫৫ (একক ও দশক উভয় স্থান থেকে সরাসরি বিয়োগ)।'
    ],
    homework_title: 'হোমওয়ার্ক ৫: সরাসরি বিয়োগ প্র্যাকটিস',
    homework_instructions: 'নিচের বিয়োগগুলো সমাধান করুন: (ক) ৯৮ - ৫৩ (খ) ৪৪ - ২২ (গ) ৮৭ - ৩৫',
    is_locked_by_default: true,
  },
  {
    id: 'class-06',
    course_id: 'abacus-parent-v1',
    class_number: 6,
    title: 'স্মল ফ্রেন্ডস সূত্র যোগ (Small Friends Addition: +4, +3, +2, +1)',
    title_en: 'Small Friends Addition (+4, +3, +2, +1)',
    short_intro: 'যখন সরাসরি বিড থাকে না, তখন ৫-এর পরিপূরক (Small Friends Formula) ব্যবহার করে যোগ করার নিয়ম।',
    youtube_video_id: 'Cv36D883_3A',
    duration_minutes: 25,
    module_name: 'মডিউল ৩: অ্যাডভান্সড ফর্মুলা (Small Friends)',
    practice_instructions: [
      '+4 এর সূত্র: +5 - 1 (Add 5, Subtract 1)',
      '+3 এর সূত্র: +5 - 2 (Add 5, Subtract 2)',
      '+2 এর সূত্র: +5 - 3 (Add 5, Subtract 3)',
      '+1 এর সূত্র: +5 - 4 (Add 5, Subtract 4)'
    ],
    homework_title: 'হোমওয়ার্ক ৬: স্মল ফ্রেন্ডস প্র্যাকটিস',
    homework_instructions: '৪ + ৪ কীভাবে স্মল ফ্রেন্ডস সূত্রের মাধ্যমে সম্পন্ন করতে হয় তা ধাপ আকারে ব্যাখ্যা করুন।',
    is_locked_by_default: true,
  },
  {
    id: 'class-07',
    course_id: 'abacus-parent-v1',
    class_number: 7,
    title: 'স্মল ফ্রেন্ডস সূত্র বিয়োগ (Small Friends Subtraction: -4, -3, -2, -1)',
    title_en: 'Small Friends Subtraction (-4, -3, -2, -1)',
    short_intro: 'স্মল ফ্রেন্ডস সূত্রের মাধ্যমে বিয়োগ করার নিয়ম ও অভিভাবক নির্দেশিকা।',
    youtube_video_id: 'd9L4v0z5X_c',
    duration_minutes: 24,
    module_name: 'মডিউল ৩: অ্যাডভান্সড ফর্মুলা (Small Friends)',
    practice_instructions: [
      '-4 এর সূত্র: -5 + 1 (Subtract 5, Add 1)',
      '-3 এর সূত্র: -5 + 2 (Subtract 5, Add 2)',
      '-2 এর সূত্র: -5 + 3 (Subtract 5, Add 3)',
      '-1 এর সূত্র: -5 + 4 (Subtract 5, Add 4)'
    ],
    homework_title: 'হোমওয়ার্ক ৭: স্মল ফ্রেন্ডস বিয়োগ প্র্যাকটিস',
    homework_instructions: '৫ - ৩ এবং ৬ - ৪ সমস্যা দুইটি স্মল ফ্রেন্ড সূত্রের সাহায্যে সমাধান করে লিখুন।',
    is_locked_by_default: true,
  },
  {
    id: 'class-08',
    course_id: 'abacus-parent-v1',
    class_number: 8,
    title: 'মেন্টাল ম্যাথ বা মানসিকভাবে অ্যাবাকাস অনুশীলনের কৌশল',
    title_en: 'Visualization & Mental Abacus Method',
    short_intro: 'শারীরিক অ্যাবাকাস টুল ছাড়া মনে মনে কাল্পনিক বিড সরিয়ে দ্রুততম সময়ে গণিত করার প্রফেশনাল টেকনিক।',
    youtube_video_id: '1a511_xPqFw',
    duration_minutes: 26,
    module_name: 'মডিউল ৪: মেন্টাল ম্যাথ ও মাস্টার ক্লাস',
    practice_instructions: [
      'চোখ বন্ধ করে বা সামনে কাল্পনিক অ্যাবাকাস ফ্রেম কল্পনা করুন (Visualization)।',
      'আঙুল দিয়ে বাতাসে বিড নাড়ানোর ভঙ্গি করুন (Anzan Technique)।',
      'প্রতিদিন ১০ মিনিট মানসিকভাবে দ্রুত গণিত প্র্যাকটিস করান।'
    ],
    homework_title: 'হোমওয়ার্ক ৮: চূড়ান্ত মেন্টাল ম্যাথ টেস্ট ও কোর্স রিভিউ',
    homework_instructions: 'আপনার সন্তানকে ৫টি সহজ যোগ মানসিকভাবে করতে দিন এবং তার প্রতিক্রিয়া বা অভিজ্ঞতার সংক্ষিপ্ত বিবরণ দিন।',
    is_locked_by_default: true,
  }
];

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-01',
    title: 'স্বাগতম! পেরেন্ট ট্রেনিং ওরিয়েন্টেশন নোটিশ',
    content: 'সকল সম্মানিত অভিভাবককে আমাদের অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রামে স্বাগতম। প্রতি সপ্তাহে আপনার সুবিধামতো ক্লাস সম্পন্ন করুন এবং হোমওয়ার্ক জমা দিন।',
    date: '২০২৬-০৮-০১',
    is_important: true,
  },
  {
    id: 'ann-02',
    title: 'লাইভ প্রশ্নোত্তর পর্ব আগামী শুক্রবার রাত ৮টায়',
    content: 'ক্লাস ৩ ও ৪ এর সমস্যাগুলো নিয়ে সরাসরি জুমে একটি লাইভ ডিসকাশন আয়োজিত হবে। লিংক ইমেইল ও ড্যাশবোর্ডে দেওয়া হবে।',
    date: '২০২৬-০৮-০৫',
    is_important: false,
  }
];

export const DEFAULT_WORKSHEETS: WorksheetItem[] = [
  {
    id: 'ws-01',
    title: 'মডিউল ১: ১ থেকে ৫০ পর্যন্ত অ্যাবাকাস নাম্বার চার্ট',
    module_name: 'মডিউল ১: মৌলিক ধারণা',
    class_number: 1,
    file_format: 'PDF',
    file_size: '১.২ মেগাবাইট',
    description: 'শিশুদের সংখ্যা চেনার জন্য সম্পূর্ণ রঙিন প্রিন্টযোগ্য ওয়ার্কশিট।'
  },
  {
    id: 'ws-02',
    title: 'মডিউল ২: সরাসরি যোগ ও বিয়োগ অনুশীলন শিট (১০০টি প্রশ্ন)',
    module_name: 'মডিউল ২: সরাসরি যোগ-বিয়োগ',
    class_number: 4,
    file_format: 'PDF',
    file_size: '২.৫ মেগাবাইট',
    description: 'টাইমড প্র্যাকটিসের জন্য দৈনন্দিন ডাইরেক্ট এডিশন শিট।'
  },
  {
    id: 'ws-03',
    title: 'মডিউল ৩: স্মল ফ্রেন্ডস সূত্রের চার্ট ও প্র্যাকটিস সেট',
    module_name: 'মডিউল ৩: স্মল ফ্রেন্ডস',
    class_number: 6,
    file_format: 'PDF',
    file_size: '১.৮ মেগাবাইট',
    description: 'দেওয়ালে টাঙানোর উপযোগী স্মল ফ্রেন্ড ফর্মুলা চার্ট।'
  }
];

export const DEFAULT_QUIZZES: QuizQuestion[] = [
  {
    id: 'q-01',
    class_number: 1,
    question: 'অ্যাবাকাস ফ্রেমে বিম স্পর্শ না করলে বিডের মান কত হয়?',
    options: ['১ (One)', '৫ (Five)', '০ (Zero)', '১০ (Ten)'],
    correct_index: 2,
    explanation: 'বিডগুলো বিম স্পর্শ না করা পর্যন্ত তাদের কোনো মান যোগ হয় না, তাই সে অবস্থায় মান হয় ০।'
  },
  {
    id: 'q-02',
    class_number: 2,
    question: 'সোবান অ্যাবাকাসের উপরের অংশে (Upper Deck) থাকা প্রতি বিডের মান কত?',
    options: ['১', '২', '৫', '১০'],
    correct_index: 2,
    explanation: 'সোবান অ্যাবাকাসের উপরের ডেকের প্রতিটি বিডের (Heaven Bead) মান হলো ৫।'
  },
  {
    id: 'q-03',
    class_number: 6,
    question: 'স্মল ফ্রেন্ডস নিয়মে +4 করার জন্য কোন সূত্রটি প্রযোজ্য?',
    options: ['+5 - 1', '+10 - 6', '+5 - 2', '+5 - 4'],
    correct_index: 0,
    explanation: '+4 এর স্মল ফ্রেন্ডস সূত্র হলো: +5 করুন এবং 1 বাদ দিন (+5 - 1)।'
  }
];
