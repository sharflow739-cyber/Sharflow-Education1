import React, { useState } from 'react';
import { ClassItem, UserProfile } from '../types';
import { 
  Plus, Edit3, Trash2, ArrowUp, ArrowDown, 
  CheckCircle2, XCircle, ArrowLeft, Save, Video, Eye, EyeOff
} from 'lucide-react';

interface AdminPanelProps {
  currentUser: UserProfile;
  classes: ClassItem[];
  onSaveClass: (cls: ClassItem) => void;
  onDeleteClass: (classId: string) => void;
  onReorderClasses: (reordered: ClassItem[]) => void;
  onBackToDashboard: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  classes,
  onSaveClass,
  onDeleteClass,
  onReorderClasses,
  onBackToDashboard,
}) => {
  // Modal / Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Partial<ClassItem>>({
    class_number: classes.length + 1,
    title: '',
    description: '',
    video_url: '',
    is_published: true,
  });

  // Open Edit Modal
  const handleEditClass = (cls: ClassItem) => {
    setEditingClass(cls);
    setIsModalOpen(true);
  };

  // Open Add Modal
  const handleAddNewClass = () => {
    setEditingClass({
      id: `class-${Date.now()}`,
      class_number: classes.length + 1,
      title: '',
      description: '',
      video_url: '',
      is_published: true,
    });
    setIsModalOpen(true);
  };

  // Save Class Handler
  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass.title) return;

    const fullClass: ClassItem = {
      id: editingClass.id || `class-${Date.now()}`,
      class_number: Number(editingClass.class_number) || classes.length + 1,
      title: editingClass.title,
      description: editingClass.description || '',
      video_url: editingClass.video_url || '',
      is_published: editingClass.is_published ?? true,
    };

    onSaveClass(fullClass);
    setIsModalOpen(false);
  };

  // Move Up
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newClasses = [...classes];
    const temp = newClasses[index - 1];
    newClasses[index - 1] = newClasses[index];
    newClasses[index] = temp;

    // Recalculate class_numbers
    const updated = newClasses.map((item, idx) => ({
      ...item,
      class_number: idx + 1,
    }));

    onReorderClasses(updated);
  };

  // Move Down
  const handleMoveDown = (index: number) => {
    if (index >= classes.length - 1) return;
    const newClasses = [...classes];
    const temp = newClasses[index + 1];
    newClasses[index + 1] = newClasses[index];
    newClasses[index] = temp;

    // Recalculate class_numbers
    const updated = newClasses.map((item, idx) => ({
      ...item,
      class_number: idx + 1,
    }));

    onReorderClasses(updated);
  };

  // Toggle Published Status
  const handleTogglePublished = (cls: ClassItem) => {
    const updated = {
      ...cls,
      is_published: !cls.is_published,
    };
    onSaveClass(updated);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="p-2 text-slate-600 hover:text-orange-600 bg-white border border-slate-200 rounded-xl transition-all shadow-2xs"
            title="ওয়েবসাইটে ফিরে যান"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-orange-500 text-white font-extrabold text-[10px] rounded uppercase tracking-wider">
                ADMIN PANEL
              </span>
              <h1 className="text-xl font-extrabold text-slate-900">
                ক্লাস এডমিন প্যানেল
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              ক্লাস তথ্য, ভিডিও ইউআরএল ও প্রকাশনা স্ট্যাটাস পরিচালনা করুন।
            </p>
          </div>
        </div>

        <button
          onClick={handleAddNewClass}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
        >
          <Plus size={16} />
          <span>নতুন ক্লাস যোগ করুন</span>
        </button>
      </div>

      {/* Class List */}
      <div className="space-y-3">
        {classes.map((cls, index) => {
          const classNumDisplay = cls.class_number < 10 
            ? `0${cls.class_number}` 
            : `${cls.class_number}`;

          return (
            <div
              key={cls.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-slate-900 text-white font-bold text-xs rounded">
                    Class {classNumDisplay}
                  </span>
                  
                  {/* Status Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      cls.is_published
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {cls.is_published ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                    {cls.is_published ? 'Published' : 'Unpublished'}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">
                  {cls.title}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2">
                  {cls.description || cls.short_intro || 'কোনো বিবরণ নেই'}
                </p>

                <div className="text-[11px] font-mono text-slate-600 bg-slate-50 px-2.5 py-1 rounded border border-slate-200 inline-flex items-center gap-1.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
                  <Video size={13} className="text-orange-500 shrink-0" />
                  <span>Video URL: {cls.video_url || cls.youtube_video_id || 'ইউআরএল দেওয়া হয়নি'}</span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 border-t sm:border-0 border-slate-100 pt-3 sm:pt-0">
                {/* Move Up/Down */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    className="p-1.5 text-slate-600 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-slate-600 rounded transition-colors"
                    title="উপরে সরান"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    disabled={index === classes.length - 1}
                    onClick={() => handleMoveDown(index)}
                    className="p-1.5 text-slate-600 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-slate-600 rounded transition-colors"
                    title="নিচে সরান"
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>

                {/* Publish Toggle */}
                <button
                  onClick={() => handleTogglePublished(cls)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                    cls.is_published
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  {cls.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{cls.is_published ? 'Unpublish' : 'Publish'}</span>
                </button>

                {/* Edit */}
                <button
                  onClick={() => handleEditClass(cls)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDeleteClass(cls.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition-colors"
                  title="ক্লাস মুছুন"
                >
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          );
        })}

        {classes.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            কোনো ক্লাস পাওয়া যায়নি। 'নতুন ক্লাস যোগ করুন' বোতামে ক্লিক করুন।
          </div>
        )}
      </div>

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            
            <div className="p-4 bg-orange-500 text-white font-extrabold text-sm flex items-center justify-between">
              <span>{editingClass.id ? 'ক্লাস তথ্য সম্পাদনা (Edit Class)' : 'নতুন ক্লাস যোগ করুন (Add Class)'}</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:bg-white/20 px-2 py-0.5 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ক্লাস নম্বর (Class Number)
                </label>
                <input
                  type="number"
                  required
                  value={editingClass.class_number}
                  onChange={(e) => setEditingClass({ ...editingClass, class_number: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ক্লাস টাইটেল (Title) *
                </label>
                <input
                  type="text"
                  required
                  value={editingClass.title}
                  onChange={(e) => setEditingClass({ ...editingClass, title: e.target.value })}
                  placeholder="যেমন: অ্যাবাকাসের সাথে পরিচয়"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  সংক্ষিপ্ত বিবরণ (Description)
                </label>
                <textarea
                  rows={3}
                  value={editingClass.description}
                  onChange={(e) => setEditingClass({ ...editingClass, description: e.target.value })}
                  placeholder="ক্লাসের সংক্ষিপ্ত আলোচনা..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ভিডিও ইউআরএল (Video URL) *
                </label>
                <input
                  type="text"
                  value={editingClass.video_url}
                  onChange={(e) => setEditingClass({ ...editingClass, video_url: e.target.value })}
                  placeholder="Google Drive, TeraBox, YouTube বা যেকোনো ভিডিও ইউআরএল পেস্ট করুন"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * ইউটিউব, গুগল ড্রাইভ, টেরাবক্স বা ডাইরেক্ট ভিডিও লিংক পেস্ট করতে পারেন।
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={Boolean(editingClass.is_published)}
                  onChange={(e) => setEditingClass({ ...editingClass, is_published: e.target.checked })}
                  className="h-4 w-4 text-orange-600 rounded border-slate-300"
                />
                <label htmlFor="is_published" className="font-bold text-slate-700 cursor-pointer">
                  ওয়েবসাইটে প্রকাশ করুন (Published)
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-2xs flex items-center gap-1.5"
                >
                  <Save size={15} />
                  <span>সংরক্ষণ করুন</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
