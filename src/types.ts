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
  created_at: string;
}

export interface ClassItem {
  id: string;
  course_id: string;
  class_number: number;
  title: string;
  title_en?: string;
  short_intro: string;
  youtube_video_id: string;
  duration_minutes: number;
  practice_instructions: string[];
  homework_title: string;
  homework_instructions: string;
  is_locked_by_default: boolean;
  module_name: string;
  created_at?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  total_classes: number;
  badge?: string;
}

export interface UserProgress {
  id?: string;
  user_id: string;
  class_id: string;
  is_completed: boolean;
  completed_at?: string;
  homework_submission?: string;
  updated_at?: string;
}

export interface HomeworkSubmission {
  id: string;
  user_id: string;
  user_name: string;
  class_id: string;
  class_title: string;
  class_number: number;
  answer_text: string;
  submitted_at: string;
  status: 'pending' | 'approved' | 'needs_revision';
  feedback?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  is_important: boolean;
}

export interface WorksheetItem {
  id: string;
  title: string;
  module_name: string;
  class_number: number;
  file_format: string;
  file_size: string;
  description: string;
}

export interface QuizQuestion {
  id: string;
  class_number: number;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}
