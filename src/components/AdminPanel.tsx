import React, { useState } from 'react';
import { UserProfile, ClassItem, UserProgress, HomeworkSubmission } from '../types';
import { 
  Users, BookOpen, Plus, Edit3, Trash2, Check, Lock, Unlock, 
  ShieldCheck, ArrowLeft, Search, CheckCircle2, XCircle, FileCode, Database, Save, Eye
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserProfile;
  allUsers: UserProfile[];
  classes: ClassItem[];
  userProgressMap: Record<string, UserProgress>;
  homeworks: HomeworkSubmission[];
  onToggleUserActive: (userId: string) => void;
  onSaveClass: (cls: ClassItem) => void;
  onDeleteClass: (classId: string) => void;
  onOpenDbSetupModal: () => void;
  onBackToDashboard: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  allUsers,
  classes,
  userProgressMap,
  homeworks,
  onToggleUserActive,
  onSaveClass,
  onDeleteClass,
  onOpenDbSetupModal,
  onBackToDashboard,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'progress' | 'homework'>('users');
  const [userSearch, setUserSearch] = useState('');
  
  // Class Modal / Form state
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<ClassItem>>({
    class_number: classes.length + 1,
    title: '',
    short_intro: '',
    youtube_video_id: '',
    duration_minutes: 15,
    module_name: 'মডিউল ১: অ্যাবাকাস পরিচিতি',
    practice_instructions: ['বিড সোজা ফ্রেম বসানো শিখুন'],
    homework_title: 'হোমওয়ার্ক',
    homework_instructions: 'অনুশীলন সম্পন্ন করুন',
    is_locked_by_default: true,
  });

  const filteredUsers = allUsers.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setIsEditingClass(true);
  };

  const handleAddNewClass = () => {
    setEditingClass({
      id: `class-0${classes.length + 1}`,
      course_id: 'abacus-parent-v1',
      class_number: classes.length + 1,
      title: '',
      short_intro: '',
      youtube_video_id: '',
      duration_minutes: 20,
      module_name: 'নতুন ট্রেনিং মডিউল',
      practice_instructions: ['ধাপ ১: নতুন প্র্যাকটিস নোটস'],
      homework_title: 'হোমওয়ার্ক টাস্ক',
      homework_instructions: 'টাস্ক সম্পন্ন করুন',
      is_locked_by_default: true,
    });
    setIsEditingClass(true);
  };

  const handleSaveClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass.title || !editingClass.youtube_video_id) return;

    const fullClassItem: ClassItem = {
      id: editingClass.id || `class-${Date.now()}`,
      course_id: editingClass.course_id || 'abacus-parent-v1',
      class_number: editingClass.class_number || classes.length + 1,
      title: editingClass.title || 'নতুন ক্লাস',
      short_intro: editingClass.short_intro || '',
      youtube_video_id: editingClass.youtube_video_id || '',
      duration_minutes: Number(editingClass.duration_minutes) || 15,
      module_name: editingClass.module_name || 'সাধারণ মডিউল',
      practice_instructions: editingClass.practice_instructions || [],
      homework_title: editingClass.homework_title || 'হোমওয়ার্ক',
      homework_instructions: editingClass.homework_instructions || '',
      is_locked_by_default: editingClass.is_locked_by_default ?? true,
    };

    onSaveClass(fullClassItem);
    setIsEditingClass(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 text-slate-600 hover:text-orange-600 bg-white border border-slate-200 rounded-xl transition-all shadow-2xs"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-orange-500 text-white font-extrabold text-[10px] rounded uppercase tracking-wider">
                ADMIN PORTAL
              </span>
              <h1 className="text-xl font-extrabold text-slate-900">
                এডমিন ম্যানেজমেন্ট প্যানেল
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              অভিভাবকদের অ্যাকাউন্ট সক্রিয়করণ, ক্লাসের কনটেন্ট পরিচালনা ও অগ্রগতির রিপোর্ট।
            </p>
          </div>
        </div>

        <button
          onClick={onOpenDbSetupModal}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <Database size={15} className="text-orange-400" />
          <span>Supabase SQL স্কিমা কোড</span>
        </button>
      </div>

      {/* Admin Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1.5 border shadow-2xs gap-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'users'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={16} />
          অভিভাবক তালিকা ({allUsers.length})
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'classes'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen size={16} />
          ক্লাস ম্যানেজমেন্ট ({classes.length})
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'homework'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 size={16} />
          হোমওয়ার্ক সাবমিশন ({homeworks.length})
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-extrabold text-slate-800 text-base">
              নিবন্ধিত অভিভাবক/ইউজার তালিকা
            </h2>

            <div className="relative min-w-[240px]">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                <tr>
                  <th className="p-3">অভিভাবকের নাম</th>
                  <th className="p-3">ইমেইল ও ফোন</th>
                  <th className="p-3">সন্তানের তথ্য</th>
                  <th className="p-3">রোল (Role)</th>
                  <th className="p-3">স্ট্যাটাস (Status)</th>
                  <th className="p-3 text-right">একশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900">
                      {u.full_name}
                    </td>
                    <td className="p-3">
                      <div>{u.email}</div>
                      <div className="text-[10px] text-slate-400">{u.phone || 'ফোন নম্বর নেই'}</div>
                    </td>
                    <td className="p-3">
                      {u.child_name ? (
                        <span>{u.child_name} ({u.child_age || '?'} বছর)</span>
                      ) : (
                        <span className="text-slate-400">তথ্য নেই</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.role === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {u.role === 'admin' ? 'এডমিন' : 'অভিভাবক'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.is_active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {u.is_active ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Disabled)'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onToggleUserActive(u.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          u.is_active
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CLASS MANAGEMENT */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-800 text-base">
                ট্রেনিং ক্লাস তালিকা ও লিংক এডিটর
              </h2>
              <p className="text-xs text-slate-500">
                ইউটিউব আনলিস্টেড ভিডিও আইডি, টাইটেল, ও প্র্যাকটিস নির্দেশাবলী পরিবর্তন করুন
              </p>
            </div>

            <button
              onClick={handleAddNewClass}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
            >
              <Plus size={16} />
              নতুন ক্লাস যোগ করুন
            </button>
          </div>

          <div className="space-y-3">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded font-bold text-xs">
                      Class 0{cls.class_number}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{cls.module_name}</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{cls.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{cls.short_intro}</p>
                  <div className="text-[11px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 inline-block">
                    YouTube Video ID: {cls.youtube_video_id}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 border-t md:border-0 border-slate-200 pt-2 md:pt-0">
                  <button
                    onClick={() => handleEditClass(cls)}
                    className="px-3 py-1.5 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-600 border border-slate-200 hover:border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Edit3 size={14} />
                    সম্পাদনা (Edit)
                  </button>

                  <button
                    onClick={() => onDeleteClass(cls.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="ক্লাস মুছুন"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: HOMEWORK SUBMISSIONS */}
      {activeTab === 'homework' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-extrabold text-slate-800 text-base">
            অভিভাবকদের জমা দেওয়া হোমওয়ার্ক খাতা
          </h2>

          {homeworks.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              এখনও কোনো হোমওয়ার্ক উত্তরপত্র জমা পড়েনি।
            </div>
          ) : (
            <div className="space-y-3">
              {homeworks.map((hw) => (
                <div key={hw.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{hw.user_name}</span>
                    <span className="text-slate-400">{hw.submitted_at}</span>
                  </div>
                  <div className="text-xs font-semibold text-orange-600">
                    Class 0{hw.class_number}: {hw.class_title}
                  </div>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                    "{hw.answer_text}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT / CREATE CLASS MODAL */}
      {isEditingClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            
            <div className="p-4 bg-orange-500 text-white font-extrabold text-sm flex items-center justify-between">
              <span>ক্লাস তথ্য সম্পাদনা (Edit Class Details)</span>
              <button
                onClick={() => setIsEditingClass(false)}
                className="text-white hover:bg-white/20 p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClassSubmit} className="p-6 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ক্লাস নম্বর ও মডিউল নাম
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    value={editingClass.class_number}
                    onChange={(e) => setEditingClass({ ...editingClass, class_number: Number(e.target.value) })}
                    className="p-2 border border-slate-200 rounded-lg font-bold text-slate-800"
                  />
                  <input
                    type="text"
                    value={editingClass.module_name}
                    onChange={(e) => setEditingClass({ ...editingClass, module_name: e.target.value })}
                    placeholder="মডিউল নাম"
                    className="col-span-2 p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ক্লাস শিরোনাম (Class Title in Bengali) *
                </label>
                <input
                  type="text"
                  required
                  value={editingClass.title}
                  onChange={(e) => setEditingClass({ ...editingClass, title: e.target.value })}
                  placeholder="যেমন: সোবান ফ্রেমে সংখ্যা ১-৯ গণনা"
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  সংক্ষিপ্ত পরিচিতি (Short Intro)
                </label>
                <textarea
                  rows={2}
                  value={editingClass.short_intro}
                  onChange={(e) => setEditingClass({ ...editingClass, short_intro: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  YouTube Unlisted Video ID or URL *
                </label>
                <input
                  type="text"
                  required
                  value={editingClass.youtube_video_id}
                  onChange={(e) => setEditingClass({ ...editingClass, youtube_video_id: e.target.value })}
                  placeholder="উদাহরণ: Cv36D883_3A অথবা সম্পূর্ণ লিংক"
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  হোমওয়ার্ক নির্দেশাবলী
                </label>
                <textarea
                  rows={2}
                  value={editingClass.homework_instructions}
                  onChange={(e) => setEditingClass({ ...editingClass, homework_instructions: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingClass(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1"
                >
                  <Save size={15} /> সংরক্ষণ করুন
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
