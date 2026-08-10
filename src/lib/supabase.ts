/// <reference types="vite/client" />
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, UserProgress, ClassItem } from '../types';
import { DEFAULT_CLASSES } from '../data/defaultCourses';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-supabase-url')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// LOCAL STORAGE PERSISTENCE FALLBACK LOGIC FOR PREVIEW/DEMO MODE
const STORAGE_KEYS = {
  CURRENT_USER: 'abacus_parent_current_user',
  ALL_USERS: 'abacus_parent_all_users',
  PROGRESS: 'abacus_parent_progress_v2',
  CLASSES: 'abacus_parent_classes_v2',
};

// INITIAL DEMO USERS
const INITIAL_DEMO_USERS: UserProfile[] = [
  {
    id: 'user-parent-01',
    email: 'parent@abacus.bd',
    full_name: 'রাশেদুল হাসান',
    phone: '01712345678',
    role: 'parent',
    is_active: true,
    child_name: 'আরিয়ান হাসান',
    child_age: 7,
    created_at: new Date().toISOString(),
  },
  {
    id: 'user-admin-01',
    email: 'admin@abacus.bd',
    full_name: 'অধ্যাপক মো: শাহরিয়ার (প্রধান ট্রেইনার)',
    phone: '01899990000',
    role: 'admin',
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

// Helper: Get stored users or set initial
export function getStoredUsers(): UserProfile[] {
  const data = localStorage.getItem(STORAGE_KEYS.ALL_USERS);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(INITIAL_DEMO_USERS));
    return INITIAL_DEMO_USERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_DEMO_USERS;
  }
}

export function saveStoredUsers(users: UserProfile[]) {
  localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
}

// Helper: Get classes or initial
export function getStoredClasses(): ClassItem[] {
  const data = localStorage.getItem(STORAGE_KEYS.CLASSES);
  if (!data) {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(DEFAULT_CLASSES));
    return DEFAULT_CLASSES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_CLASSES;
  }
}

export function saveStoredClasses(classes: ClassItem[]) {
  localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
}

// Helper: User Progress in LocalStorage
export function getStoredProgress(userId: string): Record<string, UserProgress> {
  const data = localStorage.getItem(`${STORAGE_KEYS.PROGRESS}_${userId}`);
  if (!data) {
    const initial: Record<string, UserProgress> = {
      'class-01': {
        user_id: userId,
        class_id: 'class-01',
        is_completed: false,
      }
    };
    localStorage.setItem(`${STORAGE_KEYS.PROGRESS}_${userId}`, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

export function saveStoredProgress(userId: string, progressRecord: Record<string, UserProgress>) {
  localStorage.setItem(`${STORAGE_KEYS.PROGRESS}_${userId}`, JSON.stringify(progressRecord));
}

// Get Current Logged In User
export function getCurrentUser(): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
}

