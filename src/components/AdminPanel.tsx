import React, { useState, useEffect, useMemo } from 'react';
import { ClassItem, CourseChapter, UserProfile, AdminRequest, SiteSettings, ClassResource } from '../types';
import { supabase, isSupabaseConfigured, OWNER_EMAIL } from '../lib/supabase';
import {
  DEFAULT_COURSE_CHAPTERS,
  UNCATEGORIZED_CHAPTER_KEY,
  computeClassOrderAfterMoveWithinGroup,
  groupClassesByChapter,
  reorderChaptersList,
  resolveClassChapterId,
  sortChapters,
} from '../lib/courseChapters';
import { useSettings } from '../contexts/SettingsContext';
import { VideoPlayer } from './VideoPlayer';
import { AdminEbooksManager } from './AdminEbooksManager';
import { AdminManualPaymentsTab } from './AdminManualPaymentsTab';
import { DEFAULT_CLASSES } from '../data/defaultCourses';
import { sendStudentStatusEmail } from '../lib/studentEmail';
import { 
  Plus, Edit3, Trash2, ArrowUp, ArrowDown, 
  CheckCircle2, XCircle, ArrowLeft, Save, Video, Eye, EyeOff,
  Users, ShieldAlert, Settings, BookOpen, Search, AlertCircle,
  RotateCcw, Sparkles, Check, X, ShieldX, Info,
  GraduationCap, Mail, RefreshCw, Clock, Send, Download, FileText, FolderKanban, CreditCard
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserProfile;
  classes: ClassItem[];
  chapters?: CourseChapter[];
  chaptersSupported?: boolean;
  onReloadClasses: () => Promise<void>;
  onBackToDashboard: () => void;
  pendingRequestsCount: number;
  onRefreshPendingCount: () => Promise<void>;
  pendingStudentsCount?: number;
  onRefreshPendingStudentsCount?: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  classes,
  chapters = DEFAULT_COURSE_CHAPTERS,
  chaptersSupported = false,
  onReloadClasses,
  onBackToDashboard,
  pendingRequestsCount,
  onRefreshPendingCount,
  pendingStudentsCount: initialPendingStudentsCount,
  onRefreshPendingStudentsCount,
}) => {
  const isOwner = currentUser.email.toLowerCase() === OWNER_EMAIL;
  const { settings, updateSettings, resetSettingsGroup } = useSettings();

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'classes' | 'ebooks' | 'students' | 'payments' | 'requests' | 'users' | 'settings'>('classes');
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  // Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = React.useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ==========================================
  // TAB 1: CLASSES STATE & ACTIONS
  // ==========================================
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [importingClasses, setImportingClasses] = useState(false);
  // Chapter management state & computed groupings
  const orderedChapters = useMemo(() => sortChapters(chapters), [chapters]);
  const adminChapterGroups = useMemo(
    () => groupClassesByChapter(classes, orderedChapters, chaptersSupported),
    [classes, orderedChapters, chaptersSupported]
  );

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterSubtitle, setNewChapterSubtitle] = useState('');
  const [savingChapter, setSavingChapter] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterTitle, setEditingChapterTitle] = useState('');
  const [editingChapterSubtitle, setEditingChapterSubtitle] = useState('');
  const [confirmDeleteChapterId, setConfirmDeleteChapterId] = useState<string | null>(null);
  const [reorderingKey, setReorderingKey] = useState<string | null>(null);

  const [editingClass, setEditingClass] = useState<Partial<ClassItem>>({
    class_number: classes.length + 1,
    title: '',
    description: '',
    video_url: '',
    is_published: true,
    is_free: true,
    chapter_id: null,
  });

  // Resources state for class edit modal
  const [editingResources, setEditingResources] = useState<ClassResource[]>([]);
  const [newResourceTitle, setNewResourceTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const [addingResource, setAddingResource] = useState(false);
  const [customThumbnailFileName, setCustomThumbnailFileName] = useState('');

  const fetchClassResources = async (classId: string) => {
    if (!isSupabaseConfigured || !supabase || !classId) return;
    try {
      const { data, error } = await supabase
        .from('class_resources')
        .select('*')
        .eq('class_id', classId)
        .order('sort_order', { ascending: true });
      if (!error && data) {
        setEditingResources(data);
      }
    } catch (err) {
      console.error('Error fetching class resources:', err);
    }
  };

  const handleOpenAddClass = () => {
    const newId = `class-${Date.now()}`;
    setEditingClass({
      id: newId,
      class_number: classes.length + 1,
      title: '',
      description: '',
      video_url: '',
      is_published: true,
      is_free: true,
      chapter_id: null,
    });
    setCustomThumbnailFileName('');
    setEditingResources([]);
    setNewResourceTitle('');
    setNewResourceUrl('');
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = async (cls: ClassItem) => {
    const resolvedChapter = resolveClassChapterId(cls, orderedChapters, chaptersSupported);
    setEditingClass({
      ...cls,
      video_url: '',
      is_free: cls.is_free !== false,
      chapter_id: cls.chapter_id ?? resolvedChapter ?? null,
    });
    // Prefill with last path segment of thumbnail_url if not "thumbnail.jpg", otherwise empty
    let initialFileName = '';
    if (cls.thumbnail_url) {
      const segments = cls.thumbnail_url.split('/');
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment !== 'thumbnail.jpg') {
        initialFileName = lastSegment;
      }
    }
    setCustomThumbnailFileName(initialFileName);
    setEditingResources([]);
    setNewResourceTitle('');
    setNewResourceUrl('');
    setIsClassModalOpen(true);

    if (cls.id) {
      fetchClassResources(cls.id);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('class_videos')
          .select('video_url')
          .eq('class_id', cls.id)
          .maybeSingle();

        if (!error && data?.video_url) {
          setEditingClass((prev) => ({
            ...prev,
            video_url: data.video_url,
          }));
        }
      } catch (err) {
        console.error('Error fetching class video for edit:', err);
      }
    }
  };

  const handleAddResource = async () => {
    if (!editingClass.id || !newResourceTitle.trim() || !newResourceUrl.trim()) return;
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setAddingResource(true);
      const newRes = {
        class_id: editingClass.id,
        title: newResourceTitle.trim(),
        file_url: newResourceUrl.trim(),
        sort_order: editingResources.length + 1,
      };
      const { data, error } = await supabase
        .from('class_resources')
        .insert(newRes)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setEditingResources((prev) => [...prev, data]);
      }
      setNewResourceTitle('');
      setNewResourceUrl('');
      showToast('success', 'রিসোর্স যোগ করা হয়েছে');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিসোর্স যোগ করতে ব্যর্থ';
      showToast('error', msg);
    } finally {
      setAddingResource(false);
    }
  };

  const handleDeleteResource = async (resId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.from('class_resources').delete().eq('id', resId);
      if (error) throw error;
      setEditingResources((prev) => prev.filter((r) => r.id !== resId));
      showToast('success', 'রিসোর্স মুছে ফেলা হয়েছে');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মুছতে ব্যর্থ হয়েছে';
      showToast('error', msg);
    }
  };

  const handleSaveClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass.title || !editingClass.id) return;
    if (!isSupabaseConfigured || !supabase) {
      showToast('error', 'Supabase সক্রিয় নয়');
      return;
    }

    try {
      setSavingClass(true);
      const enteredVideoUrl = editingClass.video_url?.trim() || '';

      // Compute thumbnail_url from Bunny CDN host if matched
      const bunnyRegex = /mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-fA-F-]{36})/;
      const match = enteredVideoUrl.match(bunnyRegex);

      // Robustly sanitize cleanHost:
      // trim; remove a leading word "host" (case-insensitive) and all whitespace;
      // remove http:// or https://; cut everything from the first "/" onward;
      // validate against /^[a-z0-9-]+(\.[a-z0-9-]+)*\.b-cdn\.net$/i, else treat as empty.
      let rawHost = (settings.bunny_cdn_host || '').trim();
      rawHost = rawHost.replace(/^host\b/i, '');
      rawHost = rawHost.replace(/\s+/g, '');
      rawHost = rawHost.replace(/^https?:\/\//i, '');
      const firstSlashIdx = rawHost.indexOf('/');
      if (firstSlashIdx !== -1) {
        rawHost = rawHost.substring(0, firstSlashIdx);
      }
      const bCdnRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.b-cdn\.net$/i;
      const cleanHost = bCdnRegex.test(rawHost) ? rawHost : '';

      let computedThumbnailUrl: string | null = null;
      if (match && cleanHost) {
        const rawFileNameInput = customThumbnailFileName.trim();
        const fileName = rawFileNameInput || 'thumbnail.jpg';
        const fileNameRegex = /^[A-Za-z0-9._-]+\.(jpg|jpeg|png|webp)$/i;
        if (!fileNameRegex.test(fileName)) {
          showToast('error', 'থাম্বনেইল ফাইলের নাম ঠিক নয়।');
          setSavingClass(false);
          return;
        }
        computedThumbnailUrl = `https://${cleanHost}/${match[2]}/${fileName}`;
      }

      const record: ClassItem = {
        id: editingClass.id,
        class_number: Number(editingClass.class_number) || classes.length + 1,
        title: editingClass.title.trim(),
        description: editingClass.description?.trim() || '',
        video_url: '',
        is_published: editingClass.is_published ?? true,
        is_free: editingClass.is_free !== false,
        thumbnail_url: computedThumbnailUrl ?? null,
        ...(chaptersSupported ? { chapter_id: editingClass.chapter_id || null } : {}),
      };

      const { error } = await supabase.from('classes').upsert(record);
      if (error) throw error;

      // Upsert into class_videos table
      const { error: videoError } = await supabase.from('class_videos').upsert({
        class_id: editingClass.id,
        video_url: enteredVideoUrl,
        updated_at: new Date().toISOString(),
      });
      if (videoError) throw videoError;

      showToast('success', 'ক্লাস সফলভাবে সংরক্ষণ করা হয়েছে');
      setIsClassModalOpen(false);
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্লাস সংরক্ষণ ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setSavingClass(false);
    }
  };

  const handleToggleClassFree = async (cls: ClassItem, newIsFree: boolean) => {
    if (cls.is_free === newIsFree) return;
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_free: newIsFree })
        .eq('id', cls.id);
      if (error) throw error;
      showToast('success', newIsFree ? 'ক্লাসটিকে ফ্রি করা হয়েছে' : 'ক্লাসটিকে প্রিমিয়াম করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে';
      showToast('error', msg);
    }
  };

  const handleDeleteClass = async (classId: string, title: string) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${title}" ক্লাসটি মুছে ফেলতে চান?`)) return;
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;

      showToast('success', 'ক্লাস মুছে ফেলা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্লাস মুছতে ব্যর্থ হয়েছে';
      showToast('error', msg);
    }
  };

  const handleTogglePublished = async (cls: ClassItem) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase
        .from('classes')
        .update({ is_published: !cls.is_published })
        .eq('id', cls.id);

      if (error) throw error;
      showToast('success', cls.is_published ? 'ক্লাস আনপাবলিশ করা হয়েছে' : 'ক্লাস পাবলিশ করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে';
      showToast('error', msg);
    }
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim()) return;
    if (!isSupabaseConfigured || !supabase || !chaptersSupported) {
      showToast('error', 'অধ্যায় সংরক্ষণ করতে প্রথমে supabase-chapters-migration.sql রান করুন।');
      return;
    }

    try {
      setSavingChapter(true);
      const nextSortOrder =
        orderedChapters.reduce((max, ch) => Math.max(max, ch.sort_order), 0) + 1;
      const { error } = await supabase.from('course_chapters').insert({
        id: `chapter-${Date.now()}`,
        title: newChapterTitle.trim(),
        subtitle: newChapterSubtitle.trim(),
        sort_order: nextSortOrder,
        is_default: false,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;

      setNewChapterTitle('');
      setNewChapterSubtitle('');
      showToast('success', 'নতুন অধ্যায় তৈরি করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অধ্যায় তৈরি ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setSavingChapter(false);
    }
  };

  const handleSaveChapterRename = async (chapterId: string) => {
    if (!editingChapterTitle.trim()) return;
    if (!isSupabaseConfigured || !supabase || !chaptersSupported) {
      showToast('error', 'অধ্যায় সংরক্ষণ করতে প্রথমে supabase-chapters-migration.sql রান করুন।');
      return;
    }

    try {
      setSavingChapter(true);
      const { error } = await supabase
        .from('course_chapters')
        .update({
          title: editingChapterTitle.trim(),
          subtitle: editingChapterSubtitle.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', chapterId);
      if (error) throw error;

      setEditingChapterId(null);
      showToast('success', 'অধ্যায়ের নাম আপডেট করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অধ্যায়ের নাম পরিবর্তন ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setSavingChapter(false);
    }
  };

  const handleMoveChapter = async (chapterId: string, direction: 'up' | 'down') => {
    if (!isSupabaseConfigured || !supabase || !chaptersSupported) {
      showToast('error', 'অধ্যায় ক্রম সংরক্ষণ করতে প্রথমে supabase-chapters-migration.sql রান করুন।');
      return;
    }
    const nextChapters = reorderChaptersList(orderedChapters, chapterId, direction);
    if (!nextChapters) return;

    try {
      setReorderingKey(`ch-${chapterId}`);
      await Promise.all(
        nextChapters.map((ch) =>
          supabase
            .from('course_chapters')
            .update({ sort_order: ch.sort_order, updated_at: new Date().toISOString() })
            .eq('id', ch.id)
        )
      );

      // Keep global class_number aligned with reordered chapters cleanly
      const nextGroups = groupClassesByChapter(classes, nextChapters, chaptersSupported);
      const flattened = nextGroups.flatMap((g) => g.classes);
      const classOrderUpdates = flattened
        .map((cls, index) => ({ id: cls.id, class_number: index + 1, prev: cls.class_number }))
        .filter((u) => u.class_number !== u.prev);

      if (classOrderUpdates.length > 0) {
        await Promise.all(
          classOrderUpdates.map((u) =>
            supabase.from('classes').update({ class_number: u.class_number }).eq('id', u.id)
          )
        );
      }

      showToast('success', 'অধ্যায়ের ক্রম পরিবর্তন করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অধ্যায়ের ক্রম সংরক্ষণ ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setReorderingKey(null);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!isSupabaseConfigured || !supabase || !chaptersSupported) return;
    try {
      setSavingChapter(true);
      const { error } = await supabase.from('course_chapters').delete().eq('id', chapterId);
      if (error) throw error;

      const remaining = orderedChapters.filter((ch) => ch.id !== chapterId);
      await Promise.all(
        remaining.map((ch, idx) =>
          supabase
            .from('course_chapters')
            .update({ sort_order: idx + 1, updated_at: new Date().toISOString() })
            .eq('id', ch.id)
        )
      );

      setConfirmDeleteChapterId(null);
      showToast('success', 'অধ্যায় মুছে ফেলা হয়েছে এবং এর ক্লাসগুলো অন্যান্য বিভাগে রাখা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অধ্যায় মুছতে ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setSavingChapter(false);
    }
  };

  const handleMoveClassWithinGroup = async (
    groupKey: string,
    classId: string,
    direction: 'up' | 'down'
  ) => {
    if (!isSupabaseConfigured || !supabase) return;
    const updates = computeClassOrderAfterMoveWithinGroup(
      classes,
      orderedChapters,
      chaptersSupported,
      groupKey,
      classId,
      direction
    );
    if (!updates || updates.length === 0) return;

    try {
      setReorderingKey(`cls-${classId}`);
      const results = await Promise.all(
        updates.map((u) =>
          supabase.from('classes').update({ class_number: u.class_number }).eq('id', u.id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;

      showToast('success', 'ক্লাসের ক্রম পরিবর্তন করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্রম সংরক্ষণ ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setReorderingKey(null);
    }
  };

  const handleChangeClassChapter = async (cls: ClassItem, nextChapterId: string | null) => {
    if (!isSupabaseConfigured || !supabase || !chaptersSupported) {
      showToast('error', 'অধ্যায় পরিবর্তন সংরক্ষণ করতে প্রথমে supabase-chapters-migration.sql রান করুন।');
      return;
    }
    const normalizedNext = nextChapterId && nextChapterId.trim() ? nextChapterId.trim() : null;
    if ((cls.chapter_id || null) === normalizedNext) return;

    try {
      setReorderingKey(`move-${cls.id}`);
      const { error: chapterErr } = await supabase
        .from('classes')
        .update({ chapter_id: normalizedNext })
        .eq('id', cls.id);
      if (chapterErr) throw chapterErr;

      // Recompute deterministic sequential class_number across updated chapter groupings
      const simulated = classes.map((item) =>
        item.id === cls.id ? { ...item, chapter_id: normalizedNext } : item
      );
      const nextGroups = groupClassesByChapter(simulated, orderedChapters, true);
      const flattened = nextGroups.flatMap((g) => g.classes);
      const numUpdates = flattened
        .map((item, idx) => ({ id: item.id, class_number: idx + 1, prev: item.class_number }))
        .filter((u) => u.class_number !== u.prev);

      if (numUpdates.length > 0) {
        await Promise.all(
          numUpdates.map((u) =>
            supabase.from('classes').update({ class_number: u.class_number }).eq('id', u.id)
          )
        );
      }

      showToast('success', 'ক্লাসটির অধ্যায় পরিবর্তন করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অধ্যায় পরিবর্তন ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setReorderingKey(null);
    }
  };

  const handleImportSampleClasses = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    if (!window.confirm('আপনি কি পূর্বনির্ধারিত ৮টি নমুনা ক্লাস ডাটাবেজে ইমপোর্ট করতে চান?')) return;

    try {
      setImportingClasses(true);
      const { error } = await supabase.from('classes').upsert(DEFAULT_CLASSES);
      if (error) throw error;
      showToast('success', 'নমুনা ক্লাসগুলো সফলভাবে ইমপোর্ট করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ইমপোর্ট ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setImportingClasses(false);
    }
  };

  // ==========================================
  // TAB 2: MEMBERS (STUDENTS) STATE & ACTIONS
  // ==========================================
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchStudents = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setLoadingStudents(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'parent')
        .order('created_at', { ascending: false });

      if (error) {
        showToast('error', `সদস্যদের তালিকা লোড করতে ব্যর্থ: ${error.message}`);
        return;
      }
      setStudents(data || []);
      if (onRefreshPendingStudentsCount) {
        await onRefreshPendingStudentsCount();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'লোড ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('manual_payment_claims')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .then(({ count, error }) => {
          if (!error && typeof count === 'number') {
            setPendingPaymentsCount(count);
          }
        });
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab]);

  const handleSetMemberPremium = async (student: UserProfile) => {
    if (student.enrollment_status === 'approved') return;
    if (!window.confirm(`আপনি কি "${student.full_name}"-কে প্রিমিয়াম এক্সেস দিতে চান?`)) return;
    if (!isSupabaseConfigured || !supabase) return;

    try {
      setActionLoadingId(student.id);
      const { error: rpcErr } = await supabase.rpc('set_student_status', {
        target: student.id,
        new_status: 'approved',
        reason: null,
      });

      if (rpcErr) {
        showToast('error', `প্রিমিয়াম এক্সেস আপডেট ব্যর্থ: ${rpcErr.message}`);
        return;
      }

      showToast('success', 'প্রিমিয়াম এক্সেস আপডেট সম্পন্ন হয়েছে');

      // Attempt sending email
      const emailRes = await sendStudentStatusEmail(student.id, 'approved');
      if (!emailRes.success) {
        showToast('error', `প্রিমিয়াম এক্সেস কার্যকর হয়েছে কিন্তু ইমেইল পাঠানো যায়নি (${emailRes.error})`);
      } else {
        showToast('success', 'অনুমোদন ইমেইল সফলভাবে পাঠানো হয়েছে');
      }

      await fetchStudents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'কার্যক্রম সম্পন্ন করা যায়নি';
      showToast('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSetMemberFree = async (student: UserProfile) => {
    if (student.enrollment_status !== 'approved') return;
    if (!window.confirm(`আপনি কি "${student.full_name}"-কে ফ্রি এক্সেসে ফিরিয়ে নিতে চান?`)) return;
    if (!isSupabaseConfigured || !supabase) return;

    try {
      setActionLoadingId(student.id);
      const { error: rpcErr } = await supabase.rpc('set_student_status', {
        target: student.id,
        new_status: 'pending',
        reason: null,
      });

      if (rpcErr) {
        showToast('error', `ফ্রি এক্সেস আপডেট ব্যর্থ: ${rpcErr.message}`);
        return;
      }

      showToast('success', 'ফ্রি এক্সেসে ফিরিয়ে নেওয়া হয়েছে');
      await fetchStudents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'কার্যক্রম সম্পন্ন করা যায়নি';
      showToast('error', msg);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDownloadCsv = () => {
    const headers = ['নাম', 'ইমেইল', 'মোবাইল নম্বর', 'সন্তানের নাম', 'সন্তানের বয়স', 'নিবন্ধন তারিখ', 'স্ট্যাটাস'];
    const rows = students.map((s) => [
      `"${(s.full_name || '').replace(/"/g, '""')}"`,
      `"${(s.email || '').replace(/"/g, '""')}"`,
      `"${(s.phone || '').replace(/"/g, '""')}"`,
      `"${(s.child_name || '').replace(/"/g, '""')}"`,
      `"${s.child_age ?? ''}"`,
      `"${s.created_at ? new Date(s.created_at).toLocaleDateString('bn-BD') : ''}"`,
      `"${s.enrollment_status === 'approved' ? 'প্রিমিয়াম' : 'ফ্রি'}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `abacus_members_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ==========================================
  // TAB 3: ADMIN REQUESTS STATE & ACTIONS
  // ==========================================
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const fetchRequests = async () => {
    if (!isOwner || !isSupabaseConfigured || !supabase) return;
    try {
      setLoadingRequests(true);
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
      await onRefreshPendingCount();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    }
  }, [activeTab]);

  const handleDecideRequest = async (reqId: string, approve: boolean) => {
    if (!isOwner || !isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase.rpc('decide_admin_request', {
        req_id: reqId,
        approve,
      });

      if (error) throw error;
      showToast('success', approve ? 'অনুরোধ অনুমোদিত হয়েছে' : 'অনুরোধ প্রত্যাখ্যান/বাতিল করা হয়েছে');
      await fetchRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'কার্যক্রম সম্পন্ন করা যায়নি';
      showToast('error', msg);
    }
  };

  // ==========================================
  // TAB 3: USERS STATE & ACTIONS
  // ==========================================
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const fetchUsers = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const handleToggleUserStatus = async (user: UserProfile) => {
    if (user.email.toLowerCase() === OWNER_EMAIL) {
      showToast('error', 'প্রধান ওনার অ্যাকাউন্ট নিষ্ক্রিয় করা সম্ভব নয়');
      return;
    }
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const nextStatus = !user.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextStatus })
        .eq('id', user.id);

      if (error) throw error;
      showToast('success', nextStatus ? 'ব্যবহারকারী সক্রিয় করা হয়েছে' : 'ব্যবহারকারী নিষ্ক্রিয় করা হয়েছে');
      await fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ব্যবহারকারীর স্ট্যাটাস আপডেট ব্যর্থ হয়েছে';
      showToast('error', msg);
    }
  };

  // ==========================================
  // TAB 4: SITE SETTINGS FORM GROUPS
  // ==========================================
  const [formSettings, setFormSettings] = useState<SiteSettings>(settings);
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [savingSettingsGroup, setSavingSettingsGroup] = useState<string | null>(null);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  // Load demo video URL from authenticated-only demo_settings (or migrate legacy value once)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let cancelled = false;

    async function loadDemoSetting() {
      if (!supabase) return;
      try {
        const { data: demoRow, error: demoErr } = await supabase
          .from('demo_settings')
          .select('video_url')
          .eq('id', 1)
          .maybeSingle();

        if (!cancelled && !demoErr && demoRow && typeof demoRow.video_url === 'string' && demoRow.video_url.trim()) {
          setDemoVideoUrl(demoRow.video_url.trim());
          return;
        }

        // Check legacy location only inside authenticated AdminPanel
        const { data: siteRow, error: siteErr } = await supabase
          .from('site_settings')
          .select('data')
          .eq('id', 1)
          .maybeSingle();

        if (!cancelled && !siteErr && siteRow?.data && typeof siteRow.data === 'object') {
          const legacyUrl = (siteRow.data as Record<string, unknown>).public_demo_video_url;
          if (typeof legacyUrl === 'string' && legacyUrl.trim()) {
            setDemoVideoUrl(legacyUrl.trim());
            // Auto-migrate into demo_settings if table exists
            if (!demoErr) {
              await supabase.from('demo_settings').upsert({
                id: 1,
                video_url: legacyUrl.trim(),
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading demo setting in admin:', err);
      }
    }

    loadDemoSetting();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveGroup = async (groupName: string, keys: (keyof SiteSettings)[]) => {
    try {
      setSavingSettingsGroup(groupName);
      const patch: Partial<SiteSettings> = {};
      for (const k of keys) {
        // @ts-expect-error dynamic assign
        patch[k] = formSettings[k];
      }
      const res = await updateSettings(patch);
      if (!res.success) {
        showToast('error', res.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
        return;
      }

      if (groupName === 'লঞ্চ ও ভর্তি সেটিংস' && isSupabaseConfigured && supabase) {
        const { error: demoSaveErr } = await supabase.from('demo_settings').upsert({
          id: 1,
          video_url: demoVideoUrl.trim(),
          updated_at: new Date().toISOString(),
        });
        if (demoSaveErr) {
          showToast(
            'error',
            `ডেমো ভিডিও সংরক্ষণ ব্যর্থ (demo_settings টেবিলের জন্য supabase-schema.sql রান করুন): ${demoSaveErr.message}`
          );
          return;
        }
      }

      showToast('success', `${groupName} সফলভাবে সংরক্ষণ করা হয়েছে`);
    } finally {
      setSavingSettingsGroup(null);
    }
  };

  const handleResetGroup = async (groupName: string, keys: (keyof SiteSettings)[]) => {
    if (!window.confirm(`আপনি কি "${groupName}" ডিফল্ট মানে ফিরিয়ে নিতে চান?`)) return;
    try {
      setSavingSettingsGroup(groupName);
      const res = await resetSettingsGroup(keys);
      if (!res.success) {
        showToast('error', res.error || 'রিসেট ব্যর্থ হয়েছে');
        return;
      }

      if (groupName === 'লঞ্চ ও ভর্তি সেটিংস') {
        setDemoVideoUrl('');
        if (isSupabaseConfigured && supabase) {
          await supabase.from('demo_settings').upsert({
            id: 1,
            video_url: '',
            updated_at: new Date().toISOString(),
          });
        }
      }

      showToast('success', `${groupName} ডিফল্টে রিসেট করা হয়েছে`);
    } finally {
      setSavingSettingsGroup(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 max-w-sm transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
              : 'bg-rose-900 text-rose-100 border-rose-700'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" /> : <AlertCircle size={16} className="text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs text-slate-700 cursor-pointer"
            title="ক্লাস ড্যাশবোর্ডে ফিরে যান"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              অ্যাবাকাস এডমিন ম্যানেজমেন্ট
            </h1>
            <p className="text-xs text-slate-500">
              কোর্স কন্টেন্ট, এক্সেস অনুমতি এবং সাইট সেটিংস নিয়ন্ত্রণ করুন
            </p>
          </div>
        </div>

        {/* User Badge */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1 bg-slate-900 text-white rounded-lg font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {isOwner ? 'প্রধান ওনার (Owner)' : 'অনুমোদিত এডমিন'}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 pb-px">
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'classes'
              ? 'border-orange-500 text-orange-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen size={15} />
          <span>ক্লাস</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px]">
            {classes.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ebooks')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'ebooks'
              ? 'border-orange-500 text-orange-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText size={15} />
          <span>ই-বুক</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`relative px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'students'
              ? 'border-orange-500 text-orange-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap size={15} />
          <span>শিক্ষার্থী ভর্তি</span>
          {Boolean(initialPendingStudentsCount && initialPendingStudentsCount > 0) && (
            <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
              {initialPendingStudentsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`relative px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'payments'
              ? 'border-orange-500 text-orange-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard size={15} />
          <span>পেমেন্ট ও রিভিউ</span>
          {pendingPaymentsCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black">
              {pendingPaymentsCount}
            </span>
          )}
        </button>

        {isOwner && (
          <button
            onClick={() => setActiveTab('requests')}
            className={`relative px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'requests'
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert size={15} />
            <span>এডমিন অনুরোধ</span>
            {pendingRequestsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'users'
              ? 'border-orange-500 text-orange-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users size={15} />
          <span>ব্যবহারকারী</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === 'settings'
              ? 'border-orange-500 text-orange-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings size={15} />
          <span>সাইট সেটিংস</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CLASSES CRUD */}
      {/* ======================================================== */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              অভিভাবকদের জন্য অধ্যায়, ক্লাসের ক্রম, বিবরণ ও ভিডিও লিংক সম্পাদনা করুন।
            </p>
            <div className="flex items-center gap-2">
              {classes.length === 0 && (
                <button
                  onClick={handleImportSampleClasses}
                  disabled={importingClasses}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={14} className="text-amber-400" />
                  <span>{importingClasses ? 'ইমপোর্ট হচ্ছে...' : 'নমুনা ক্লাস ইমপোর্ট'}</span>
                </button>
              )}
              <button
                onClick={handleOpenAddClass}
                className="min-h-[40px] px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>নতুন ক্লাস যোগ করুন</span>
              </button>
            </div>
          </div>

          {!chaptersSupported && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5">
              <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold">অধ্যায় ডাটাবেজ মাইগ্রেশন বাকি আছে</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  নতুন অধ্যায় তৈরি, নাম পরিবর্তন, অধ্যায়ের ক্রম এবং ক্লাস অধ্যায় পরিবর্তনের স্থায়ী সংরক্ষণের জন্য Supabase SQL Editor-এ{' '}
                  <code className="px-1.5 py-0.5 bg-amber-100 rounded font-mono">
                    src/lib/supabase-chapters-migration.sql
                  </code>{' '}
                  ফাইলটি একবার রান করুন।
                </p>
              </div>
            </div>
          )}

          {/* Chapter Management Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderKanban size={18} className="text-orange-500 shrink-0" />
                <div>
                  <h2 className="font-extrabold text-slate-900 text-sm">
                    অধ্যায় ব্যবস্থাপনা (Course Chapters)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    সরাসরি যোগ-বিয়োগ (Without Complement), ৫-এর বন্ধু (Five Complement), ১০-এর বন্ধু (Ten Complement), মিশ্র নিয়ম (Mixed Complement) বা নতুন অধ্যায় পরিচালনা করুন।
                  </p>
                </div>
              </div>
            </div>

            {/* Create New Chapter Form */}
            <form onSubmit={handleCreateChapter} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="নতুন অধ্যায়ের বাংলা নাম *"
                required
                disabled={!chaptersSupported || savingChapter}
                className="sm:col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
              <input
                type="text"
                value={newChapterSubtitle}
                onChange={(e) => setNewChapterSubtitle(e.target.value)}
                placeholder="ইংরেজি নাম (ঐচ্ছিক, যেমন: Five Complement)"
                disabled={!chaptersSupported || savingChapter}
                className="sm:col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!chaptersSupported || savingChapter || !newChapterTitle.trim()}
                className="min-h-[40px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus size={14} />
                <span>অধ্যায় যোগ</span>
              </button>
            </form>

            {/* Existing Ordered Chapters List */}
            <div className="space-y-2">
              {orderedChapters.map((ch, cIdx) => {
                const count = adminChapterGroups.find((g) => g.key === ch.id)?.classes.length || 0;
                const isEditingThis = editingChapterId === ch.id;
                const isConfirmingDelete = confirmDeleteChapterId === ch.id;

                return (
                  <div
                    key={ch.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {isEditingThis ? (
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editingChapterTitle}
                          onChange={(e) => setEditingChapterTitle(e.target.value)}
                          placeholder="অধ্যায়ের বাংলা নাম"
                          className="px-3 py-2 bg-white border border-orange-300 rounded-lg text-xs font-bold focus:outline-none"
                        />
                        <input
                          type="text"
                          value={editingChapterSubtitle}
                          onChange={(e) => setEditingChapterSubtitle(e.target.value)}
                          placeholder="ইংরেজি নাম (ঐচ্ছিক)"
                          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 font-black text-xs inline-flex items-center justify-center shrink-0">
                          {cIdx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                              {ch.title}
                            </span>
                            {ch.subtitle && (
                              <span className="text-[11px] font-semibold text-slate-500">
                                ({ch.subtitle})
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {count}টি ক্লাস নির্ধারিত
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center shrink-0">
                      {isEditingThis ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleSaveChapterRename(ch.id)}
                            disabled={savingChapter || !editingChapterTitle.trim()}
                            className="min-h-[38px] px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Check size={14} />
                            <span>সংরক্ষণ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingChapterId(null)}
                            className="min-h-[38px] px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            বাতিল
                          </button>
                        </>
                      ) : isConfirmingDelete ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(ch.id)}
                            disabled={savingChapter}
                            className="min-h-[38px] px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            নিশ্চিত মুছুন
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteChapterId(null)}
                            className="min-h-[38px] px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            বাতিল
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMoveChapter(ch.id, 'up')}
                            disabled={!chaptersSupported || cIdx === 0 || reorderingKey === `ch-${ch.id}`}
                            aria-label={`${ch.title} অধ্যায় উপরে নিন`}
                            title="উপরে নিন"
                            className="min-h-[40px] min-w-[40px] p-2 text-slate-600 hover:text-slate-900 disabled:opacity-25 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                          >
                            <ArrowUp size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveChapter(ch.id, 'down')}
                            disabled={
                              !chaptersSupported ||
                              cIdx === orderedChapters.length - 1 ||
                              reorderingKey === `ch-${ch.id}`
                            }
                            aria-label={`${ch.title} অধ্যায় নিচে নিন`}
                            title="নিচে নিন"
                            className="min-h-[40px] min-w-[40px] p-2 text-slate-600 hover:text-slate-900 disabled:opacity-25 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                          >
                            <ArrowDown size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChapterId(ch.id);
                              setEditingChapterTitle(ch.title);
                              setEditingChapterSubtitle(ch.subtitle || '');
                              setConfirmDeleteChapterId(null);
                            }}
                            disabled={!chaptersSupported}
                            aria-label={`${ch.title} অধ্যায়ের নাম পরিবর্তন করুন`}
                            title="নাম পরিবর্তন"
                            className="min-h-[40px] px-2.5 py-2 text-orange-700 hover:bg-orange-50 bg-white border border-slate-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                          >
                            <Edit3 size={14} />
                            <span>নাম পরিবর্তন</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteChapterId(ch.id)}
                            disabled={!chaptersSupported}
                            aria-label={`${ch.title} অধ্যায় মুছে ফেলুন`}
                            title="মুছে ফেলুন"
                            className="min-h-[40px] min-w-[40px] p-2 text-rose-600 hover:bg-rose-50 bg-white border border-slate-200 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lessons Organized by Chapters */}
          {classes.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-4">
              <p className="text-xs text-slate-500">এখনও কোনো ক্লাস যোগ করা হয়নি।</p>
              <button
                onClick={handleImportSampleClasses}
                disabled={importingClasses}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>নমুনা ৮টি ক্লাস ইমপোর্ট করুন</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {adminChapterGroups.map((group) => (
                <section
                  key={group.key}
                  aria-label={group.title}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden"
                >
                  <div className="px-4 sm:px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3 className="font-black text-slate-900 text-sm sm:text-base">
                        {group.title}
                      </h3>
                      {group.subtitle && (
                        <span className="text-xs font-semibold text-slate-500">
                          ({group.subtitle})
                        </span>
                      )}
                      {group.key === UNCATEGORIZED_CHAPTER_KEY && (
                        <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          অধ্যায় নির্ধারিত নয়
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {group.classes.length}টি ক্লাস
                    </span>
                  </div>

                  {group.classes.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      এই অধ্যায়ে এখনো কোনো ক্লাস নেই। নিচের যেকোনো ক্লাসের ড্রপডাউন থেকে এই অধ্যায়ে সরাতে পারেন।
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {group.classes.map((cls, idx) => {
                        const assignedChapterId =
                          resolveClassChapterId(cls, orderedChapters, chaptersSupported) || '';
                        return (
                          <div
                            key={cls.id}
                            className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm shrink-0">
                                {cls.class_number}
                              </div>
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-slate-900 text-sm">
                                    {cls.title}
                                  </h4>
                                  {cls.is_published ? (
                                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold">
                                      পাবলিশড
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold">
                                      ড্রাফট (লুকানো)
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                                  {cls.description || 'কোনো বিবরণ দেওয়া হয়নি'}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
                              {/* Chapter Move Selector */}
                              <select
                                aria-label={`${cls.title} অধ্যায় পরিবর্তন`}
                                value={assignedChapterId}
                                disabled={!chaptersSupported || reorderingKey === `move-${cls.id}`}
                                onChange={(e) =>
                                  handleChangeClassChapter(cls, e.target.value || null)
                                }
                                className="min-h-[40px] max-w-[220px] px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                              >
                                <option value="">অন্যান্য (অনির্ধারিত)</option>
                                {orderedChapters.map((ch) => (
                                  <option key={ch.id} value={ch.id}>
                                    {ch.title}
                                    {ch.subtitle ? ` (${ch.subtitle})` : ''}
                                  </option>
                                ))}
                              </select>

                              {/* Segmented Control: ফ্রি | প্রিমিয়াম */}
                              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs font-bold shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleToggleClassFree(cls, true)}
                                  className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    cls.is_free !== false
                                      ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="ফ্রি ক্লাস নির্বাচন করুন"
                                >
                                  ফ্রি
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleClassFree(cls, false)}
                                  className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    cls.is_free === false
                                      ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  title="প্রিমিয়াম ক্লাস নির্বাচন করুন"
                                >
                                  প্রিমিয়াম
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveClassWithinGroup(group.key, cls.id, 'up')
                                }
                                disabled={idx === 0 || reorderingKey === `cls-${cls.id}`}
                                aria-label={`${cls.title} উপরে নিন`}
                                title="অধ্যায়ের ভেতরে উপরে নিন"
                                className="min-h-[40px] min-w-[40px] p-2 text-slate-600 hover:text-slate-900 disabled:opacity-25 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleMoveClassWithinGroup(group.key, cls.id, 'down')
                                }
                                disabled={
                                  idx === group.classes.length - 1 ||
                                  reorderingKey === `cls-${cls.id}`
                                }
                                aria-label={`${cls.title} নিচে নিন`}
                                title="অধ্যায়ের ভেতরে নিচে নিন"
                                className="min-h-[40px] min-w-[40px] p-2 text-slate-600 hover:text-slate-900 disabled:opacity-25 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                              >
                                <ArrowDown size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTogglePublished(cls)}
                                aria-label={cls.is_published ? `${cls.title} আনপাবলিশ করুন` : `${cls.title} পাবলিশ করুন`}
                                title={cls.is_published ? 'আনপাবলিশ করুন' : 'পাবলিশ করুন'}
                                className="min-h-[40px] min-w-[40px] p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg inline-flex items-center justify-center cursor-pointer"
                              >
                                {cls.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEditClass(cls)}
                                aria-label={`${cls.title} সম্পাদনা`}
                                title="সম্পাদনা"
                                className="min-h-[40px] min-w-[40px] p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border border-orange-200 rounded-lg inline-flex items-center justify-center cursor-pointer"
                              >
                                <Edit3 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClass(cls.id, cls.title)}
                                aria-label={`${cls.title} মুছে ফেলুন`}
                                title="মুছে ফেলুন"
                                className="min-h-[40px] min-w-[40px] p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg inline-flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1B: E-BOOKS MANAGEMENT */}
      {/* ======================================================== */}
      {activeTab === 'ebooks' && (
        <AdminEbooksManager currentUser={currentUser} showToast={showToast} />
      )}

      {/* ======================================================== */}
      {/* TAB 2B: MANUAL PAYMENTS CONFIG & REVIEW QUEUE */}
      {/* ======================================================== */}
      {activeTab === 'payments' && (
        <AdminManualPaymentsTab
          showToast={showToast}
          onPaymentApproved={fetchStudents}
          onPendingCountChange={setPendingPaymentsCount}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 2: MEMBERS (STUDENTS) */}
      {/* ======================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          
          {/* Header Bar with Counters, CSV Download, and Search */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Top Counters: মোট / প্রিমিয়াম / ফ্রি */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-slate-500 font-semibold">মোট:</span>
                  <span className="font-extrabold">{students.length}</span>
                </div>
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="text-amber-700 font-semibold">প্রিমিয়াম:</span>
                  <span className="font-extrabold">
                    {students.filter((s) => s.enrollment_status === 'approved').length}
                  </span>
                </div>
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <span className="text-emerald-700 font-semibold">ফ্রি:</span>
                  <span className="font-extrabold">
                    {students.filter((s) => s.enrollment_status !== 'approved').length}
                  </span>
                </div>
              </div>

              {/* CSV Download & Refresh */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCsv}
                  disabled={students.length === 0}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  title="লিড ডাটা এক্সেল/CSV আকারে ডাউনলোড করুন"
                >
                  <Download size={14} className="text-amber-400" />
                  <span>লিড CSV ডাউনলোড</span>
                </button>

                <button
                  onClick={fetchStudents}
                  disabled={loadingStudents}
                  className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="তালিকা রিফ্রেশ করুন"
                >
                  <RefreshCw size={14} className={loadingStudents ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="নাম, ইমেইল বা ফোন দিয়ে খুঁজুন..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {/* Members List */}
          {loadingStudents ? (
            <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
              সদস্যদের তথ্য লোড হচ্ছে...
            </div>
          ) : (
            <div className="space-y-3">
              {students
                .filter((s) => {
                  const q = studentSearch.toLowerCase().trim();
                  if (!q) return true;
                  return (
                    (s.full_name && s.full_name.toLowerCase().includes(q)) ||
                    (s.email && s.email.toLowerCase().includes(q)) ||
                    (s.phone && s.phone.toLowerCase().includes(q)) ||
                    (s.child_name && s.child_name.toLowerCase().includes(q))
                  );
                })
                .map((student) => {
                  const isProcessing = actionLoadingId === student.id;
                  const isPremium = student.enrollment_status === 'approved';

                  return (
                    <div
                      key={student.id}
                      className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-orange-200"
                    >
                      <div className="space-y-1.5 flex-1">
                        {/* Name and Segmented Control next to name */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                            {student.full_name}
                          </span>

                          {/* Segmented Control "ফ্রি" | "প্রিমিয়াম" */}
                          <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200 text-xs font-bold shrink-0">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleSetMemberFree(student)}
                              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                !isPremium
                                  ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              ফ্রি
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleSetMemberPremium(student)}
                              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                                isPremium
                                  ? 'bg-amber-500 text-slate-950 shadow-2xs font-extrabold'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              প্রিমিয়াম
                            </button>
                          </div>

                          {isProcessing && (
                            <RefreshCw size={13} className="animate-spin text-orange-500" />
                          )}
                        </div>

                        {/* Details: email, phone, child name/age, joined date */}
                        <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-0.5">
                          <span>
                            <strong className="text-slate-400 font-semibold">ইমেইল: </strong>
                            <span className="font-mono text-slate-700">{student.email}</span>
                          </span>
                          <span>
                            <strong className="text-slate-400 font-semibold">মোবাইল: </strong>
                            <span className="font-mono text-slate-700">{student.phone || 'দেওয়া হয়নি'}</span>
                          </span>
                          <span>
                            <strong className="text-slate-400 font-semibold">সন্তান: </strong>
                            {student.child_name || 'নাই'}{' '}
                            {student.child_age ? `(${student.child_age} বছর)` : ''}
                          </span>
                          {student.created_at && (
                            <span className="text-slate-400 text-[11px]">
                              নিবন্ধন: {new Date(student.created_at).toLocaleDateString('bn-BD')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {students.length === 0 && (
                <div className="bg-white p-12 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                  এখনো কোনো অভিভাবক নিবন্ধন করেননি।
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ADMIN REQUESTS (Owner Only) */}
      {/* ======================================================== */}
      {activeTab === 'requests' && isOwner && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              শুধুমাত্র প্রধান ওনার হিসেবে আপনি এডমিন এক্সেস অনুরোধ অনুমোদন বা প্রত্যাহার করতে পারেন।
            </p>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setRequestFilter(st)}
                  className={`px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    requestFilter === st ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {st === 'all' ? 'সবগুলো' : st === 'pending' ? 'অপেক্ষমাণ' : st === 'approved' ? 'অনুমোদিত' : 'প্রত্যাখ্যাত'}
                </button>
              ))}
            </div>
          </div>

          {loadingRequests ? (
            <div className="bg-white p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
              অনুরোধের তালিকা লোড হচ্ছে...
            </div>
          ) : (
            <div className="space-y-3">
              {requests
                .filter((r) => requestFilter === 'all' || r.status === requestFilter)
                .map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {req.full_name || 'অভিভাবক'}
                        </span>
                        <span className="text-xs font-mono text-slate-500">({req.email})</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            req.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status === 'pending'
                            ? 'অপেক্ষমাণ (Pending)'
                            : req.status === 'approved'
                            ? 'অনুমোদিত (Approved)'
                            : 'প্রত্যাখ্যাত (Rejected)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        অনুরোধের সময়: {new Date(req.created_at).toLocaleString('bn-BD')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleDecideRequest(req.id, true)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={14} /> অনুমোদন করুন
                          </button>
                          <button
                            onClick={() => handleDecideRequest(req.id, false)}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <X size={14} /> প্রত্যাখ্যান
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <button
                          onClick={() => handleDecideRequest(req.id, false)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <ShieldX size={14} /> এক্সেস বাতিল (Revoke)
                        </button>
                      )}
                      {req.status === 'rejected' && (
                        <button
                          onClick={() => handleDecideRequest(req.id, true)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <Check size={14} /> পুনরায় অনুমোদন দিন
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {requests.length === 0 && (
                <div className="bg-white p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
                  এখনো কোনো এডমিন অনুরোধ জমা পড়েনি।
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: USERS LIST & TOGGLE */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              নিবন্ধিত অভিভাবকদের তালিকা ও অ্যাকাউন্ট সক্রিয়/নিষ্ক্রিয় নিয়ন্ত্রণ।
            </p>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="bg-white p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-200">
              ব্যবহারকারীদের তালিকা লোড হচ্ছে...
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="p-3.5">ব্যবহারকারী</th>
                      <th className="p-3.5">যোগাযোগ</th>
                      <th className="p-3.5">সন্তানের তথ্য</th>
                      <th className="p-3.5">রোল</th>
                      <th className="p-3.5">স্ট্যাটাস</th>
                      <th className="p-3.5 text-right">পদক্ষেপ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter((u) => {
                        const q = userSearch.toLowerCase();
                        return (
                          u.full_name?.toLowerCase().includes(q) ||
                          u.email?.toLowerCase().includes(q) ||
                          u.phone?.includes(q)
                        );
                      })
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5">
                            <div className="font-extrabold text-slate-900">{u.full_name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-slate-600">
                            {u.phone || 'দেওয়া হয়নি'}
                          </td>
                          <td className="p-3.5">
                            {u.child_name ? (
                              <div>
                                <span className="font-bold text-slate-800">{u.child_name}</span>
                                {u.child_age && (
                                  <span className="text-[11px] text-slate-400 ml-1">
                                    ({u.child_age} বছর)
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.role === 'admin'
                                  ? 'bg-slate-900 text-white'
                                  : 'bg-orange-50 text-orange-700 border border-orange-200'
                              }`}
                            >
                              {u.role === 'admin' ? 'এডমিন' : 'অভিভাবক'}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                u.is_active
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {u.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            {u.email.toLowerCase() !== OWNER_EMAIL && (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  u.is_active
                                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {u.is_active ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: SITE SETTINGS (5 Groups) */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <p className="text-xs text-slate-500">
            সাইটের ব্র্যান্ডিং, টেক্সট, যোগাযোগ নম্বর ও ভিডিও প্লেয়ার আচরণ ডাটাবেজে লাইভ সংরক্ষণ করুন।
          </p>

          {/* GROUP 1: BRANDING */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                ১. ব্র্যান্ডিং ও পরিচিতি (Branding)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetGroup('ব্র্যান্ডিং', ['site_name', 'site_subtitle', 'logo_emoji', 'browser_title'])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('ব্র্যান্ডিং', ['site_name', 'site_subtitle', 'logo_emoji', 'browser_title'])}
                  disabled={savingSettingsGroup === 'ব্র্যান্ডিং'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'ব্র্যান্ডিং' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">সাইটের নাম (Site Name)</label>
                <input
                  type="text"
                  value={formSettings.site_name}
                  onChange={(e) => setFormSettings({ ...formSettings, site_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ট্যাগলাইন / সাবটাইটেল</label>
                <input
                  type="text"
                  value={formSettings.site_subtitle}
                  onChange={(e) => setFormSettings({ ...formSettings, site_subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">লোগো ইমোজি (Logo Emoji)</label>
                <input
                  type="text"
                  value={formSettings.logo_emoji}
                  onChange={(e) => setFormSettings({ ...formSettings, logo_emoji: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ব্রাউজার ট্যাব টাইটেল (document.title)</label>
                <input
                  type="text"
                  value={formSettings.browser_title}
                  onChange={(e) => setFormSettings({ ...formSettings, browser_title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* GROUP 2: LOGIN PAGE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                ২. লগইন পেজ সেটিংস (Login Page)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetGroup('লগইন পেজ', ['login_badge', 'login_headline', 'login_subtext', 'login_button_label', 'allow_registration'])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('লগইন পেজ', ['login_badge', 'login_headline', 'login_subtext', 'login_button_label', 'allow_registration'])}
                  disabled={savingSettingsGroup === 'লগইন পেজ'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'লগইন পেজ' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ব্যাজ টেক্সট</label>
                <input
                  type="text"
                  value={formSettings.login_badge}
                  onChange={(e) => setFormSettings({ ...formSettings, login_badge: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">হেডলাইন (Headline)</label>
                <input
                  type="text"
                  value={formSettings.login_headline}
                  onChange={(e) => setFormSettings({ ...formSettings, login_headline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">সাবটেক্সট (Subtext)</label>
                <textarea
                  rows={2}
                  value={formSettings.login_subtext}
                  onChange={(e) => setFormSettings({ ...formSettings, login_subtext: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">বাটন লেবেল</label>
                <input
                  type="text"
                  value={formSettings.login_button_label}
                  onChange={(e) => setFormSettings({ ...formSettings, login_button_label: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-3 pt-6">
                <input
                  type="checkbox"
                  id="allow_reg"
                  checked={formSettings.allow_registration}
                  onChange={(e) => setFormSettings({ ...formSettings, allow_registration: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="allow_reg" className="font-bold text-slate-700 cursor-pointer">
                  নতুন অ্যাকাউন্ট নিবন্ধন চালু রাখুন (Allow Registration)
                </label>
              </div>
            </div>
          </div>

          {/* GROUP 2.5: STUDENT ENROLLMENT MESSAGES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                ৩. শিক্ষার্থী নিবন্ধন ও অনুমোদন বার্তা (Student Registration & Approval)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetGroup('শিক্ষার্থী ভর্তি বার্তা', [
                    'register_success_title', 'register_success_text',
                    'welcome_popup_title', 'welcome_popup_text',
                    'pending_title', 'pending_text', 'rejected_text', 'review_hours'
                  ])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('শিক্ষার্থী ভর্তি বার্তা', [
                    'register_success_title', 'register_success_text',
                    'welcome_popup_title', 'welcome_popup_text',
                    'pending_title', 'pending_text', 'rejected_text', 'review_hours'
                  ])}
                  disabled={savingSettingsGroup === 'শিক্ষার্থী ভর্তি বার্তা'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'শিক্ষার্থী ভর্তি বার্তা' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">রেজিস্ট্রেশন গ্রহণ পপআপ টাইটেল</label>
                <input
                  type="text"
                  value={formSettings.register_success_title}
                  onChange={(e) => setFormSettings({ ...formSettings, register_success_title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">যাচাই সময়কাল (ঘণ্টা)</label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={formSettings.review_hours}
                  onChange={(e) => setFormSettings({ ...formSettings, review_hours: Number(e.target.value) || 24 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">রেজিস্ট্রেশন গ্রহণ পপআপ বার্তা</label>
                <textarea
                  rows={2}
                  value={formSettings.register_success_text}
                  onChange={(e) => setFormSettings({ ...formSettings, register_success_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">স্বাগতম পপআপ টাইটেল (Welcome Title)</label>
                <input
                  type="text"
                  value={formSettings.welcome_popup_title}
                  onChange={(e) => setFormSettings({ ...formSettings, welcome_popup_title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">স্বাগতম পপআপ বার্তা (Welcome Text)</label>
                <textarea
                  rows={2}
                  value={formSettings.welcome_popup_text}
                  onChange={(e) => setFormSettings({ ...formSettings, welcome_popup_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">অপেক্ষমাণ (Pending) পেজ টাইটেল</label>
                <input
                  type="text"
                  value={formSettings.pending_title}
                  onChange={(e) => setFormSettings({ ...formSettings, pending_title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">অপেক্ষমাণ (Pending) বার্তা</label>
                <textarea
                  rows={2}
                  value={formSettings.pending_text}
                  onChange={(e) => setFormSettings({ ...formSettings, pending_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">প্রত্যাখ্যান (Rejected) বার্তা</label>
                <textarea
                  rows={2}
                  value={formSettings.rejected_text}
                  onChange={(e) => setFormSettings({ ...formSettings, rejected_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* GROUP 3: DASHBOARD */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                ৩. ড্যাশবোর্ড সেটিংস (Dashboard)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetGroup('ড্যাশবোর্ড', ['dashboard_title', 'dashboard_subtitle', 'empty_classes_text'])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('ড্যাশবোর্ড', ['dashboard_title', 'dashboard_subtitle', 'empty_classes_text'])}
                  disabled={savingSettingsGroup === 'ড্যাশবোর্ড'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'ড্যাশবোর্ড' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">ড্যাশবোর্ড টাইটেল</label>
                <input
                  type="text"
                  value={formSettings.dashboard_title}
                  onChange={(e) => setFormSettings({ ...formSettings, dashboard_title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ড্যাশবোর্ড সাবটাইটেল</label>
                <input
                  type="text"
                  value={formSettings.dashboard_subtitle}
                  onChange={(e) => setFormSettings({ ...formSettings, dashboard_subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">খালি ক্লাসের বার্তা (Empty Text)</label>
                <input
                  type="text"
                  value={formSettings.empty_classes_text}
                  onChange={(e) => setFormSettings({ ...formSettings, empty_classes_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* GROUP 4: FOOTER & CONTACT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                ৪. ফুটার ও যোগাযোগ (Footer & Contact)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetGroup('ফুটার ও যোগাযোগ', [
                    'footer_description', 'contact_phone', 'contact_email', 'contact_hours',
                    'security_notice_title', 'security_notice_text', 'copyright_text', 'footer_tagline',
                    'show_secure_badge', 'secure_badge_label', 'show_certified_badge', 'certified_badge_label'
                  ])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('ফুটার ও যোগাযোগ', [
                    'footer_description', 'contact_phone', 'contact_email', 'contact_hours',
                    'security_notice_title', 'security_notice_text', 'copyright_text', 'footer_tagline',
                    'show_secure_badge', 'secure_badge_label', 'show_certified_badge', 'certified_badge_label'
                  ])}
                  disabled={savingSettingsGroup === 'ফুটার ও যোগাযোগ'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'ফুটার ও যোগাযোগ' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">ফুটার বিবরণ (Footer Description)</label>
                <textarea
                  rows={2}
                  value={formSettings.footer_description}
                  onChange={(e) => setFormSettings({ ...formSettings, footer_description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">হটলাইন নম্বর</label>
                <input
                  type="text"
                  value={formSettings.contact_phone}
                  onChange={(e) => setFormSettings({ ...formSettings, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">সাপোর্ট ইমেইল</label>
                <input
                  type="text"
                  value={formSettings.contact_email}
                  onChange={(e) => setFormSettings({ ...formSettings, contact_email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">যোগাযোগের সময়সূচী</label>
                <input
                  type="text"
                  value={formSettings.contact_hours}
                  onChange={(e) => setFormSettings({ ...formSettings, contact_hours: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">কপিরাইট টেক্সট</label>
                <input
                  type="text"
                  value={formSettings.copyright_text}
                  onChange={(e) => setFormSettings({ ...formSettings, copyright_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">সিকিউরিটি নোটিশ শিরোনাম</label>
                <input
                  type="text"
                  value={formSettings.security_notice_title}
                  onChange={(e) => setFormSettings({ ...formSettings, security_notice_title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">সিকিউরিটি নোটিশ বিবরণ</label>
                <textarea
                  rows={2}
                  value={formSettings.security_notice_text}
                  onChange={(e) => setFormSettings({ ...formSettings, security_notice_text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formSettings.show_secure_badge}
                    onChange={(e) => setFormSettings({ ...formSettings, show_secure_badge: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span>সুরক্ষিত এক্সেস ব্যাজ দেখান</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formSettings.show_certified_badge}
                    onChange={(e) => setFormSettings({ ...formSettings, show_certified_badge: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span>সার্টিফাইড কোর্স ব্যাজ দেখান</span>
                </label>
              </div>
            </div>
          </div>

          {/* GROUP 5: VIDEO SETTINGS */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                ৫. ভিডিও প্লেয়ার ও সিকিউরিটি সেটিংস (Video Settings)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetGroup('ভিডিও সেটিংস', [
                    'bunny_cdn_host', 'drive_hide_header', 'drive_header_offset', 'block_popout_overlay',
                    'watermark_enabled', 'watermark_mode', 'watermark_opacity', 'watermark_interval_seconds'
                  ])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('ভিডিও সেটিংস', [
                    'bunny_cdn_host', 'drive_hide_header', 'drive_header_offset', 'block_popout_overlay',
                    'watermark_enabled', 'watermark_mode', 'watermark_opacity', 'watermark_interval_seconds'
                  ])}
                  disabled={savingSettingsGroup === 'ভিডিও সেটিংস'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'ভিডিও সেটিংস' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <label className="block font-bold text-slate-700">
                  Bunny CDN হোস্ট (থাম্বনেইলের জন্য, যেমন vz-xxxx.b-cdn.net)
                </label>
                <input
                  type="text"
                  value={formSettings.bunny_cdn_host || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, bunny_cdn_host: e.target.value })}
                  placeholder="vz-xxxx.b-cdn.net"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium text-xs"
                />
                <p className="text-[11px] text-slate-400">
                  Bunny Stream ভিডিও লিংক যুক্ত করলে স্বয়ংক্রিয়ভাবে এই হোস্ট ব্যবহার করে থাম্বনেইল প্রস্তুত হবে।
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900">Google Drive উপরের ফাঁকা হেডার লুকান (Hide Drive Header)</div>
                  <div className="text-[11px] text-slate-500">Google Drive-এর শীর্ষ কালো টুলবারটি ফ্রেমের উপরে সরিয়ে ভিডিও পূর্ণাঙ্গ স্ক্রিনে দেখায়।</div>
                </div>
                <input
                  type="checkbox"
                  checked={formSettings.drive_hide_header}
                  onChange={(e) => setFormSettings({ ...formSettings, drive_hide_header: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                />
              </div>

              {formSettings.drive_hide_header && (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700">হেডার শিফট অফসেট (0 - 80 px)</label>
                    <span className="font-mono font-bold text-orange-600">{formSettings.drive_header_offset} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={formSettings.drive_header_offset}
                    onChange={(e) => setFormSettings({ ...formSettings, drive_header_offset: Number(e.target.value) })}
                    className="w-full accent-orange-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400">ডিফল্ট মান: ৫২ পিক্সেল (Google Drive প্রিভিউ হেডারের আদর্শ উচ্চতা)</p>
                </div>
              )}

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <div className="font-bold text-slate-900">পপ-আউট এক্সটার্নাল আইকন ক্লিক ব্লকার (Block Pop-out Overlay)</div>
                  <div className="text-[11px] text-slate-500">Google Drive-এর উপরের ডানপাশের এক্সটার্নাল ওপেন আইকনে ক্লিক ব্লক করে সাইটের ভেতরে রাখে।</div>
                </div>
                <input
                  type="checkbox"
                  checked={formSettings.block_popout_overlay}
                  onChange={(e) => setFormSettings({ ...formSettings, block_popout_overlay: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">ভিডিও স্ক্রিন রেকর্ড ও লিক প্রতিরোধক ডায়নামিক ওয়াটারমার্ক (Watermark)</div>
                    <div className="text-[11px] text-slate-500">ভিডিওর উপর দর্শকের পরিচয়যুক্ত ডায়নামিক মুভিং ওয়াটারমার্ক ভেসে বেড়াবে।</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSettings.watermark_enabled}
                    onChange={(e) => setFormSettings({ ...formSettings, watermark_enabled: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </div>

                {formSettings.watermark_enabled && (
                  <div className="pt-3 border-t border-slate-200 space-y-4">
                    {/* Mode selection */}
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="font-bold text-slate-700">ওয়াটারমার্ক মোড:</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="wm_mode"
                          value="email"
                          checked={formSettings.watermark_mode === 'email'}
                          onChange={() => setFormSettings({ ...formSettings, watermark_mode: 'email' })}
                          className="text-orange-600"
                        />
                        <span>ইমেইল</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="wm_mode"
                          value="phone"
                          checked={formSettings.watermark_mode === 'phone'}
                          onChange={() => setFormSettings({ ...formSettings, watermark_mode: 'phone' })}
                          className="text-orange-600"
                        />
                        <span>মোবাইল নম্বর</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="wm_mode"
                          value="both"
                          checked={formSettings.watermark_mode === 'both'}
                          onChange={() => setFormSettings({ ...formSettings, watermark_mode: 'both' })}
                          className="text-orange-600"
                        />
                        <span>উভয়টি (Email & Phone)</span>
                      </label>
                    </div>

                    {/* Opacity slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">ওয়াটারমার্ক অপাসিটি / দৃশ্যমানতা (১০% - ৬০%)</label>
                        <span className="font-mono font-bold text-orange-600">{formSettings.watermark_opacity ?? 30}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="60"
                        step="5"
                        value={formSettings.watermark_opacity ?? 30}
                        onChange={(e) => setFormSettings({ ...formSettings, watermark_opacity: Number(e.target.value) })}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-400">ডিফল্ট মান: ৩০% (কন্টেন্ট দেখতে কোনো সমস্যা না করে সহজে পাঠযোগ্য)</p>
                    </div>

                    {/* Movement interval slider */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="font-bold text-slate-700">স্থান পরিবর্তন ব্যবধান (৫ - ৬০ সেকেন্ড)</label>
                        <span className="font-mono font-bold text-orange-600">{formSettings.watermark_interval_seconds ?? 15} সেকেন্ড</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={formSettings.watermark_interval_seconds ?? 15}
                        onChange={(e) => setFormSettings({ ...formSettings, watermark_interval_seconds: Number(e.target.value) })}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                      <p className="text-[11px] text-slate-400">ডিফল্ট মান: ১৫ সেকেন্ড পরপর স্ক্রিনের নিরাপদ স্থানে সরে যায়</p>
                    </div>

                    {/* Live Watermark Interactive Preview */}
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Eye size={14} className="text-orange-500" />
                          ওয়াটারমার্ক লাইভ প্রিভিউ (Live Preview):
                        </span>
                        <span className="text-[11px] text-slate-500">
                          বর্তমান সেটিংস অনুযায়ী গতিশীল প্রিভিউ
                        </span>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-0 shadow-inner">
                        <VideoPlayer
                          videoUrl=""
                          title="ওয়াটারমার্ক লাইভ প্রিভিউ"
                          viewerEmail={currentUser.email || 'parent@example.com'}
                          viewerPhone={currentUser.phone || '01712345678'}
                          watermarkEnabled={formSettings.watermark_enabled}
                          watermarkMode={formSettings.watermark_mode}
                          watermarkOpacity={formSettings.watermark_opacity}
                          watermarkIntervalSeconds={formSettings.watermark_interval_seconds}
                          isLivePreview={true}
                        />
                      </div>

                      {/* Deterrent note */}
                      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed flex items-start gap-2">
                        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">সিকিউরিটি নির্দেশিকা:</span>{' '}
                          স্ক্রিন রেকর্ডিং কোনো ব্রাউজারে শতভাগ ব্লক করা সম্ভব নয়; দর্শকের পরিচয়যুক্ত ডায়নামিক মুভিং ওয়াটারমার্ক ভিডিও লিক বা রেকর্ড করার বিরুদ্ধে একটি শক্তিশালী প্রতিরোধক (deterrent) এবং লিক হলে উৎস শনাক্তযোগ্য (traceable) করে তোলে।
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>

          {/* GROUP 6: PUBLIC LAUNCH, DEMO & ENROLLMENT (November 12 Launch) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  ৬. পাবলিক হোমপেজ, ডেমো ও ভর্তি সেটিংস (Launch & Enrollment)
                </h3>
                <p className="text-[11px] text-slate-500">
                  ১২ নভেম্বরের পাবলিক লঞ্চের জন্য ফ্রি ডেমো লিংক, কোর্স ফি ও ভর্তির নীতিমালা কনফিগার করুন।
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResetGroup('লঞ্চ ও ভর্তি সেটিংস', [
                    'course_fee_bdt', 'course_duration_access',
                    'course_includes_text', 'refund_policy_text', 'terms_policy_text',
                    'privacy_policy_text', 'payment_instructions',
                    'public_welcome_video_url'
                  ])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('লঞ্চ ও ভর্তি সেটিংস', [
                    'course_fee_bdt', 'course_duration_access',
                    'course_includes_text', 'refund_policy_text', 'terms_policy_text',
                    'privacy_policy_text', 'payment_instructions',
                    'public_welcome_video_url'
                  ])}
                  disabled={savingSettingsGroup === 'লঞ্চ ও ভর্তি সেটিংস'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'লঞ্চ ও ভর্তি সেটিংস' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  পাবলিক ডেমো ক্লাস ভিডিও লিংক (/demo)
                </label>
                <input
                  type="text"
                  value={demoVideoUrl}
                  onChange={(e) => setDemoVideoUrl(e.target.value)}
                  placeholder="যেমন: Google Drive / YouTube / Bunny ভিডিও লিংক"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  এখানে দেওয়া ভিডিও লিংকটি লগইন ছাড়াই যেকোনো ভিজিটর /demo পেজে দেখতে পারবেন। লিংক ফাঁকা রাখলে “ডেমো ক্লাসের ভিডিও শীঘ্রই যুক্ত হবে।” বার্তা দেখানো হবে।
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  পাবলিক হোমপেজ স্বাগতম ভিডিও লিংক (ঐচ্ছিক, MP4/WebM)
                </label>
                <input
                  type="text"
                  value={formSettings.public_welcome_video_url || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, public_welcome_video_url: e.target.value })}
                  placeholder="https://.../welcome.mp4 (ফাঁকা রাখলে ডিফল্ট /sharflow-welcome-signup.mp4 ব্যবহৃত হবে)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ফাঁকা রাখলে সাইটের ডিফল্ট /sharflow-welcome-signup.mp4 (ফাইল আপলোড থাকলে) দেখানো হবে। এখানে নতুন URL দিলে সেটি ডিফল্ট ভিডিওটিকে ওভাররাইড করবে; ফাইল না থাকলে কোনো ভাঙা প্লেয়ার দেখাবে না।
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  কোর্স ফি (টাকায়)
                </label>
                <input
                  type="text"
                  value={formSettings.course_fee_bdt || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, course_fee_bdt: e.target.value })}
                  placeholder="যেমন: ১,৫০০ বা 1500"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">ফাঁকা রাখলে "শীঘ্রই নির্ধারণ করা হচ্ছে" দেখাবে।</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  কোর্স অ্যাক্সেসের সময়সীমা
                </label>
                <input
                  type="text"
                  value={formSettings.course_duration_access || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, course_duration_access: e.target.value })}
                  placeholder="যেমন: ৬ মাস / ১ বছর / আজীবন"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  কোর্সে কী অন্তর্ভুক্ত (Custom Includes)
                </label>
                <textarea
                  rows={3}
                  value={formSettings.course_includes_text || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, course_includes_text: e.target.value })}
                  placeholder="প্রতি লাইনে একটি করে সুযোগ-সুবিধা লিখতে পারেন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                />
                <p className="text-[11px] text-slate-400 mt-1">ফাঁকা রাখলে সিস্টেমের ডিফল্ট তালিকা প্রদর্শিত হবে।</p>
              </div>

              {/* bKash / Nagad Manual Payment Management Link & General Instructions */}
              <div className="sm:col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900">বিকাশ ও নগদ ম্যানুয়াল পেমেন্ট মাধ্যম</div>
                    <div className="text-[11px] text-slate-500">
                      প্রতিটি মাধ্যমের নির্ধারিত ফি (BDT), রিসিভার নম্বর ও সঠিক পদ্ধতি "পেমেন্ট ও রিভিউ" ট্যাব থেকে সেট করুন।
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <CreditCard size={14} />
                    <span>পেমেন্ট ও রিভিউ ট্যাবে যান</span>
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">সাধারণ ভর্তি ও পেমেন্ট নির্দেশিকা (ঐচ্ছিক)</label>
                  <textarea
                    rows={3}
                    value={formSettings.payment_instructions || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, payment_instructions: e.target.value })}
                    placeholder="ভর্তি পেজের পেমেন্ট অংশের নিচে প্রদর্শনের জন্য অতিরিক্ত কোনো সাধারণ নির্দেশনা লিখতে পারেন..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 font-medium text-xs"
                  />
                </div>
              </div>

              {/* Custom Policy Texts */}
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">কাস্টম রিফান্ড নীতিমালা (/refund)</label>
                <textarea
                  rows={2}
                  value={formSettings.refund_policy_text || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, refund_policy_text: e.target.value })}
                  placeholder="আপনার অনুমোদিত রিফান্ড নীতিমালা এখানে পেস্ট করতে পারেন (ফাঁকা রাখলে স্ট্যান্ডার্ড নীতিমালা দেখাবে)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">কাস্টম ব্যবহারের শর্তাবলি (/terms)</label>
                <textarea
                  rows={2}
                  value={formSettings.terms_policy_text || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, terms_policy_text: e.target.value })}
                  placeholder="আপনার নিজস্ব শর্তাবলি এখানে পেস্ট করতে পারেন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">কাস্টম গোপনীয়তা নীতি (/privacy)</label>
                <textarea
                  rows={2}
                  value={formSettings.privacy_policy_text || ''}
                  onChange={(e) => setFormSettings({ ...formSettings, privacy_policy_text: e.target.value })}
                  placeholder="আপনার নিজস্ব গোপনীয়তা নীতি এখানে পেস্ট করতে পারেন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-medium"
                />
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD / EDIT CLASS WITH LIVE VIDEO PREVIEW */}
      {/* ======================================================== */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-orange-100 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-orange-400" />
                <h3 className="font-extrabold text-sm">
                  {editingClass.title ? 'ক্লাস সম্পাদনা' : 'নতুন ক্লাস তৈরি'}
                </h3>
              </div>
              <button
                onClick={() => setIsClassModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Drive processing help box */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Google Drive ভিডিও আপলোড ও স্পষ্টতা নির্দেশিকা:</div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    ড্রাইভে ভিডিও আপলোডের পর প্রসেসিং শেষ হওয়া পর্যন্ত অপেক্ষা করুন (HD প্রসেস হতে সময় লাগে)। MP4 (H.264) ১০৮০p/৭২০p আপলোড করুন। drive.google.com এ সরাসরি খুললেও যদি ঝাপসা থাকে, তাহলে সমস্যা ড্রাইভের প্রসেসিংয়ে — ওয়েবসাইটে নয়।
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ক্লাস নম্বর *</label>
                  <input
                    type="number"
                    required
                    value={editingClass.class_number || 1}
                    onChange={(e) => setEditingClass({ ...editingClass, class_number: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">ক্লাসের শিরোনাম *</label>
                  <input
                    type="text"
                    required
                    value={editingClass.title || ''}
                    onChange={(e) => setEditingClass({ ...editingClass, title: e.target.value })}
                    placeholder="যেমন: সরাসরি যোগ ও বিয়োগ"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অধ্যায় (Chapter / Topic)
                </label>
                <select
                  value={editingClass.chapter_id || ''}
                  disabled={!chaptersSupported}
                  onChange={(e) =>
                    setEditingClass({ ...editingClass, chapter_id: e.target.value || null })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-60"
                >
                  <option value="">অন্যান্য (অনির্ধারিত)</option>
                  {orderedChapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.title}
                      {ch.subtitle ? ` (${ch.subtitle})` : ''}
                    </option>
                  ))}
                </select>
                {!chaptersSupported && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    অধ্যায় সংরক্ষণ সক্রিয় করতে প্রথমে supabase-chapters-migration.sql রান করুন।
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ভিডিও লিংক (Google Drive / YouTube / MP4 / Bunny)</label>
                <input
                  type="text"
                  value={editingClass.video_url || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, video_url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/.../view অথবা YouTube / Bunny লিংক"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">থাম্বনেইল ফাইলের নাম (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={customThumbnailFileName}
                  onChange={(e) => setCustomThumbnailFileName(e.target.value)}
                  placeholder="thumbnail_a880cb3b.jpg"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Bunny এ কাস্টম থাম্বনেইল দিলে ফাইলের নাম এখানে দিন। ফাঁকা রাখলে thumbnail.jpg ধরা হবে।
                </p>
              </div>

              {/* LIVE VIDEO PREVIEW */}
              {editingClass.video_url && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-600">লাইভ ভিডিও প্রিভিউ:</label>
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                    <VideoPlayer
                      videoUrl={editingClass.video_url}
                      title={editingClass.title || 'ক্লাস প্রিভিউ'}
                      viewerEmail={currentUser.email}
                      viewerPhone={currentUser.phone}
                      isLivePreview={true}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ক্লাস বিবরণ (Description)</label>
                <textarea
                  rows={3}
                  value={editingClass.description || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, description: e.target.value })}
                  placeholder="এই ক্লাসে কি কি শেখানো হয়েছে সংক্ষেপে লিখুন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              {/* RESOURCES / WORKSHEETS */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  রিসোর্স / ওয়ার্কশিট
                </label>

                {editingClass.id ? (
                  <div className="space-y-3">
                    {editingResources.length > 0 ? (
                      <div className="space-y-2">
                        {editingResources.map((res) => (
                          <div
                            key={res.id}
                            className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                              <div className="truncate">
                                <p className="font-bold text-slate-800 truncate">{res.title}</p>
                                <a
                                  href={res.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-blue-600 hover:underline truncate block"
                                >
                                  {res.file_url}
                                </a>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteResource(res.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 shrink-0 cursor-pointer"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">কোনো রিসোর্স বা ওয়ার্কশিট যোগ করা হয়নি।</p>
                    )}

                    {/* Add row */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <p className="text-xs font-bold text-slate-700">নতুন রিসোর্স যোগ করুন:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newResourceTitle}
                          onChange={(e) => setNewResourceTitle(e.target.value)}
                          placeholder="শিরোনাম (যেমন: ওয়ার্কশিট ০১)"
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                        <input
                          type="url"
                          value={newResourceUrl}
                          onChange={(e) => setNewResourceUrl(e.target.value)}
                          placeholder="ফাইলের URL (Google Drive / ডাউনলোড লিংক)"
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddResource}
                          disabled={addingResource || !newResourceTitle.trim() || !newResourceUrl.trim()}
                          className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {addingResource ? 'যোগ হচ্ছে...' : 'যোগ করুন'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
                    রিসোর্স / ওয়ার্কশিট যোগ করার জন্য প্রথমে ক্লাসটি সংরক্ষণ (Save) করুন। এরপর এডিট করে যুক্ত করুন।
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="free_check"
                  checked={editingClass.is_free ?? false}
                  onChange={(e) => setEditingClass({ ...editingClass, is_free: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                />
                <label htmlFor="free_check" className="text-xs font-bold text-slate-700 cursor-pointer">
                  ফ্রি ক্লাস (সবাই দেখতে পারবে)
                </label>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pub_check"
                  checked={editingClass.is_published ?? true}
                  onChange={(e) => setEditingClass({ ...editingClass, is_published: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                />
                <label htmlFor="pub_check" className="text-xs font-bold text-slate-700 cursor-pointer">
                  ক্লাসটি প্রকাশ করুন (Publish to Parents)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingClass}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {savingClass ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
