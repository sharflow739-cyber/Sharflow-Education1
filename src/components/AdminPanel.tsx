import React, { useState, useEffect } from 'react';
import { ClassItem, UserProfile, AdminRequest, SiteSettings } from '../types';
import { supabase, isSupabaseConfigured, OWNER_EMAIL } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { VideoPlayer } from './VideoPlayer';
import { DEFAULT_CLASSES } from '../data/defaultCourses';
import { 
  Plus, Edit3, Trash2, ArrowUp, ArrowDown, 
  CheckCircle2, XCircle, ArrowLeft, Save, Video, Eye, EyeOff,
  Users, ShieldAlert, Settings, BookOpen, Search, AlertCircle,
  RotateCcw, Sparkles, Check, X, ShieldX, Info
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserProfile;
  classes: ClassItem[];
  onReloadClasses: () => Promise<void>;
  onBackToDashboard: () => void;
  pendingRequestsCount: number;
  onRefreshPendingCount: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  classes,
  onReloadClasses,
  onBackToDashboard,
  pendingRequestsCount,
  onRefreshPendingCount,
}) => {
  const isOwner = currentUser.email.toLowerCase() === OWNER_EMAIL;
  const { settings, updateSettings, resetSettingsGroup } = useSettings();

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'classes' | 'requests' | 'users' | 'settings'>('classes');

  // Toasts
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ==========================================
  // TAB 1: CLASSES STATE & ACTIONS
  // ==========================================
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [savingClass, setSavingClass] = useState(false);
  const [importingClasses, setImportingClasses] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<ClassItem>>({
    class_number: classes.length + 1,
    title: '',
    description: '',
    video_url: '',
    is_published: true,
  });

  const handleOpenAddClass = () => {
    setEditingClass({
      id: `class-${Date.now()}`,
      class_number: classes.length + 1,
      title: '',
      description: '',
      video_url: '',
      is_published: true,
    });
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: ClassItem) => {
    setEditingClass({ ...cls });
    setIsClassModalOpen(true);
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
      const record: ClassItem = {
        id: editingClass.id,
        class_number: Number(editingClass.class_number) || classes.length + 1,
        title: editingClass.title.trim(),
        description: editingClass.description?.trim() || '',
        video_url: editingClass.video_url?.trim() || '',
        is_published: editingClass.is_published ?? true,
      };

      const { error } = await supabase.from('classes').upsert(record);
      if (error) throw error;

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

  const handleMoveClass = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classes.length) return;
    if (!isSupabaseConfigured || !supabase) return;

    const list = [...classes];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const updated = list.map((item, idx) => ({
      ...item,
      class_number: idx + 1,
    }));

    try {
      const { error } = await supabase.from('classes').upsert(updated);
      if (error) throw error;
      showToast('success', 'ক্লাসের ক্রম পরিবর্তন করা হয়েছে');
      await onReloadClasses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্রম সংরক্ষণ ব্যর্থ হয়েছে';
      showToast('error', msg);
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
  // TAB 2: ADMIN REQUESTS STATE & ACTIONS
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
  const [savingSettingsGroup, setSavingSettingsGroup] = useState<string | null>(null);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const handleSaveGroup = async (groupName: string, keys: (keyof SiteSettings)[]) => {
    try {
      setSavingSettingsGroup(groupName);
      const patch: Partial<SiteSettings> = {};
      for (const k of keys) {
        // @ts-expect-error dynamic assign
        patch[k] = formSettings[k];
      }
      const res = await updateSettings(patch);
      if (res.success) {
        showToast('success', `${groupName} সফলভাবে সংরক্ষণ করা হয়েছে`);
      } else {
        showToast('error', res.error || 'সংরক্ষণ ব্যর্থ হয়েছে');
      }
    } finally {
      setSavingSettingsGroup(null);
    }
  };

  const handleResetGroup = async (groupName: string, keys: (keyof SiteSettings)[]) => {
    if (!window.confirm(`আপনি কি "${groupName}" ডিফল্ট মানে ফিরিয়ে নিতে চান?`)) return;
    try {
      setSavingSettingsGroup(groupName);
      const res = await resetSettingsGroup(keys);
      if (res.success) {
        showToast('success', `${groupName} ডিফল্টে রিসেট করা হয়েছে`);
      } else {
        showToast('error', res.error || 'রিসেট ব্যর্থ হয়েছে');
      }
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
          <span>ক্লাস (Classes)</span>
          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-full text-[10px]">
            {classes.length}
          </span>
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
            <span>এডমিন অনুরোধ (Admin requests)</span>
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
          <span>ব্যবহারকারী (Users)</span>
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
          <span>সাইট সেটিংস (Site settings)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CLASSES CRUD */}
      {/* ======================================================== */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              অভিভাবকদের জন্য ক্লাসের তালিকা, বিবরণ ও ভিডিও লিংক সম্পাদনা করুন।
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
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>নতুন ক্লাস যোগ করুন</span>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {classes.map((cls, idx) => (
              <div
                key={cls.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm shrink-0">
                    {cls.class_number}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        {cls.title}
                      </h3>
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
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-sm">
                      ভিডিও সোর্স: {cls.video_url || 'সংযুক্ত নেই'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleMoveClass(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="উপরে নিন"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    onClick={() => handleMoveClass(idx, 'down')}
                    disabled={idx === classes.length - 1}
                    className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title="নিচে নিন"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    onClick={() => handleTogglePublished(cls)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title={cls.is_published ? 'আনপাবলিশ করুন' : 'পাবলিশ করুন'}
                  >
                    {cls.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    onClick={() => handleOpenEditClass(cls)}
                    className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg cursor-pointer"
                    title="সম্পাদনা"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls.id, cls.title)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

            {classes.length === 0 && (
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
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ADMIN REQUESTS (Owner Only) */}
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
                    'drive_hide_header', 'drive_header_offset', 'block_popout_overlay',
                    'watermark_enabled', 'watermark_mode'
                  ])}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={12} /> ডিফল্টে ফিরুন
                </button>
                <button
                  onClick={() => handleSaveGroup('ভিডিও সেটিংস', [
                    'drive_hide_header', 'drive_header_offset', 'block_popout_overlay',
                    'watermark_enabled', 'watermark_mode'
                  ])}
                  disabled={savingSettingsGroup === 'ভিডিও সেটিংস'}
                  className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Save size={13} /> {savingSettingsGroup === 'ভিডিও সেটিংস' ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
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

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">ভিডিও স্ক্রিন রেকর্ড প্রতিরোধক ডায়নামিক ওয়াটারমার্ক (Watermark)</div>
                    <div className="text-[11px] text-slate-500">ভিডিওর উপর অভিভাবকের ইমেইল বা ফোন নম্বর অস্পষ্টভাবে ভেসে বেড়াবে।</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formSettings.watermark_enabled}
                    onChange={(e) => setFormSettings({ ...formSettings, watermark_enabled: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                  />
                </div>

                {formSettings.watermark_enabled && (
                  <div className="pt-2 border-t border-slate-200 flex items-center gap-4">
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
                      <span>উভয়টি</span>
                    </label>
                  </div>
                )}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">ভিডিও লিংক (Google Drive / YouTube / MP4)</label>
                <input
                  type="text"
                  value={editingClass.video_url || ''}
                  onChange={(e) => setEditingClass({ ...editingClass, video_url: e.target.value })}
                  placeholder="https://drive.google.com/file/d/.../view অথবা YouTube লিংক"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              {/* LIVE VIDEO PREVIEW */}
              {editingClass.video_url && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-600">লাইভ ভিডিও প্রিভিউ:</label>
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-black">
                    <VideoPlayer
                      videoUrl={editingClass.video_url}
                      title={editingClass.title || 'ক্লাস প্রিভিউ'}
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

              <div className="flex items-center gap-2 pt-2">
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
