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
}

export interface ClassItem {
  id: string;
  class_number: number;
  title: string;
  description: string;
  video_url: string;
  is_published: boolean;
  // Optional backward compatibility fields
  youtube_video_id?: string;
  short_intro?: string;
  created_at?: string;
}

export interface UserProgress {
  id?: string;
  user_id: string;
  class_id: string;
  is_completed: boolean;
  completed_at?: string;
  updated_at?: string;
}

