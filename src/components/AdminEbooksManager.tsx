import React, { useState, useEffect, useCallback } from 'react';
import { EbookItem, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  EBOOK_STORAGE_BUCKET,
  formatFileSize,
  sanitizeStorageFileName,
  validateEbookCoverFile,
  validateEbookPdfFile,
} from '../lib/ebooks';
import {
  BookOpen,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';

interface AdminEbooksManagerProps {
  currentUser: UserProfile;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export const AdminEbooksManager: React.FC<AdminEbooksManagerProps> = ({
  currentUser,
  showToast,
}) => {
  const [ebooks, setEbooks] = useState<EbookItem[]>([]);
  const [coverPreviewUrls, setCoverPreviewUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBook, setEditingBook] = useState<EbookItem | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [isPublished, setIsPublished] = useState<boolean>(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [localCoverPreview, setLocalCoverPreview] = useState<string | null>(null);
  const [removeExistingCover, setRemoveExistingCover] = useState(false);

  const loadEbooks = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('ebooks')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list: EbookItem[] = data || [];
      setEbooks(list);

      const coverEntries = await Promise.all(
        list
          .filter((b) => Boolean(b.cover_storage_path))
          .map(async (b) => {
            if (!supabase || !b.cover_storage_path) return [b.id, ''] as const;
            const { data: signed } = await supabase.storage
              .from(EBOOK_STORAGE_BUCKET)
              .createSignedUrl(b.cover_storage_path, 3600);
            return [b.id, signed?.signedUrl || ''] as const;
          })
      );

      const map: Record<string, string> = {};
      for (const [id, url] of coverEntries) {
        if (url) map[id] = url;
      }
      setCoverPreviewUrls(map);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ই-বুক লোড করতে সমস্যা হয়েছে';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEbooks();
  }, [loadEbooks]);

  useEffect(() => {
    return () => {
      if (localCoverPreview) {
        URL.revokeObjectURL(localCoverPreview);
      }
    };
  }, [localCoverPreview]);

  const resetModalForm = () => {
    setEditingBook(null);
    setTitle('');
    setDescription('');
    setSortOrder(ebooks.length + 1);
    setIsPublished(true);
    setPdfFile(null);
    setCoverFile(null);
    if (localCoverPreview) {
      URL.revokeObjectURL(localCoverPreview);
      setLocalCoverPreview(null);
    }
    setRemoveExistingCover(false);
  };

  const handleOpenCreate = () => {
    resetModalForm();
    setSortOrder(ebooks.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (book: EbookItem) => {
    resetModalForm();
    setEditingBook(book);
    setTitle(book.title);
    setDescription(book.description || '');
    setSortOrder(book.sort_order ?? 1);
    setIsPublished(book.is_published);
    setIsModalOpen(true);
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setPdfFile(null);
      return;
    }
    const err = validateEbookPdfFile(file);
    if (err) {
      showToast('error', err);
      e.target.value = '';
      setPdfFile(null);
      return;
    }
    setPdfFile(file);
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setCoverFile(null);
      return;
    }
    const err = validateEbookCoverFile(file);
    if (err) {
      showToast('error', err);
      e.target.value = '';
      setCoverFile(null);
      return;
    }
    if (localCoverPreview) {
      URL.revokeObjectURL(localCoverPreview);
    }
    setLocalCoverPreview(URL.createObjectURL(file));
    setCoverFile(file);
    setRemoveExistingCover(false);
  };

  const handleSaveEbook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured || !supabase) {
      showToast('error', 'Supabase সক্রিয় নয়');
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToast('error', 'বইয়ের শিরোনাম লিখুন।');
      return;
    }

    if (!editingBook) {
      const pdfErr = validateEbookPdfFile(pdfFile);
      if (pdfErr) {
        showToast('error', pdfErr);
        return;
      }
    } else if (pdfFile) {
      const pdfErr = validateEbookPdfFile(pdfFile);
      if (pdfErr) {
        showToast('error', pdfErr);
        return;
      }
    }

    if (coverFile) {
      const coverErr = validateEbookCoverFile(coverFile);
      if (coverErr) {
        showToast('error', coverErr);
        return;
      }
    }

    setSaving(true);
    const newlyUploadedPaths: string[] = [];

    try {
      const bookId = editingBook?.id || crypto.randomUUID();
      let pdfStoragePath = editingBook?.pdf_storage_path || '';
      let fileSizeBytes = editingBook?.file_size_bytes ?? null;
      let coverStoragePath = removeExistingCover ? null : editingBook?.cover_storage_path ?? null;

      // 1. Direct PDF upload to private bucket
      if (pdfFile) {
        const cleanPdfName = sanitizeStorageFileName(pdfFile.name, 'pdf');
        const nextPdfPath = `pdfs/${bookId}/${Date.now()}-${cleanPdfName}`;
        const { error: uploadPdfErr } = await supabase.storage
          .from(EBOOK_STORAGE_BUCKET)
          .upload(nextPdfPath, pdfFile, {
            contentType: 'application/pdf',
            upsert: false,
          });
        if (uploadPdfErr) throw uploadPdfErr;
        newlyUploadedPaths.push(nextPdfPath);
        pdfStoragePath = nextPdfPath;
        fileSizeBytes = pdfFile.size;
      }

      // 2. Direct Cover image upload to private bucket (optional)
      if (coverFile) {
        const cleanCoverName = sanitizeStorageFileName(coverFile.name, 'jpg');
        const nextCoverPath = `covers/${bookId}/${Date.now()}-${cleanCoverName}`;
        const { error: uploadCoverErr } = await supabase.storage
          .from(EBOOK_STORAGE_BUCKET)
          .upload(nextCoverPath, coverFile, {
            contentType: coverFile.type || 'image/jpeg',
            upsert: false,
          });
        if (uploadCoverErr) throw uploadCoverErr;
        newlyUploadedPaths.push(nextCoverPath);
        coverStoragePath = nextCoverPath;
      }

      // 3. Upsert metadata row in public.ebooks
      const payload = {
        id: bookId,
        title: trimmedTitle,
        description: description.trim(),
        pdf_storage_path: pdfStoragePath,
        cover_storage_path: coverStoragePath,
        file_size_bytes: fileSizeBytes,
        is_published: isPublished,
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
        created_by: editingBook?.created_by ?? currentUser.id,
        updated_at: new Date().toISOString(),
      };

      const { error: dbErr } = await supabase.from('ebooks').upsert(payload);
      if (dbErr) throw dbErr;

      // 4. Clean up replaced storage files after DB save succeeded
      const pathsToRemove: string[] = [];
      if (pdfFile && editingBook?.pdf_storage_path && editingBook.pdf_storage_path !== pdfStoragePath) {
        pathsToRemove.push(editingBook.pdf_storage_path);
      }
      if (
        (coverFile || removeExistingCover) &&
        editingBook?.cover_storage_path &&
        editingBook.cover_storage_path !== coverStoragePath
      ) {
        pathsToRemove.push(editingBook.cover_storage_path);
      }
      if (pathsToRemove.length > 0) {
        await supabase.storage.from(EBOOK_STORAGE_BUCKET).remove(pathsToRemove);
      }

      showToast('success', editingBook ? 'ই-বুক আপডেট করা হয়েছে' : 'নতুন ই-বুক আপলোড ও সংরক্ষণ করা হয়েছে');
      setIsModalOpen(false);
      resetModalForm();
      await loadEbooks();
    } catch (err: unknown) {
      if (newlyUploadedPaths.length > 0 && supabase) {
        await supabase.storage.from(EBOOK_STORAGE_BUCKET).remove(newlyUploadedPaths).catch(() => {});
      }
      const msg = err instanceof Error ? err.message : 'ই-বুক সংরক্ষণ ব্যর্থ হয়েছে';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (book: EbookItem) => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { error } = await supabase
        .from('ebooks')
        .update({ is_published: !book.is_published, updated_at: new Date().toISOString() })
        .eq('id', book.id);
      if (error) throw error;
      showToast('success', book.is_published ? 'ই-বুক ড্রাফটে নেওয়া হয়েছে' : 'ই-বুক প্রকাশ করা হয়েছে');
      await loadEbooks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে';
      showToast('error', msg);
    }
  };

  const handleDeleteBook = async (book: EbookItem) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${book.title}" ই-বুকটি মুছে ফেলতে চান?`)) return;
    if (!isSupabaseConfigured || !supabase) return;

    try {
      const { error } = await supabase.from('ebooks').delete().eq('id', book.id);
      if (error) throw error;

      const pathsToRemove = [book.pdf_storage_path, book.cover_storage_path].filter(
        (p): p is string => Boolean(p)
      );
      if (pathsToRemove.length > 0) {
        await supabase.storage.from(EBOOK_STORAGE_BUCKET).remove(pathsToRemove);
      }

      showToast('success', 'ই-বুক মুছে ফেলা হয়েছে');
      await loadEbooks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ই-বুক মুছতে ব্যর্থ হয়েছে';
      showToast('error', msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          সদস্যদের ই-বুক লাইব্রেরির জন্য সরাসরি PDF ও কভার ছবি প্রাইভেট স্টোরেজে আপলোড ও প্রকাশ করুন।
        </p>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={15} />
          <span>নতুন ই-বুক আপলোড করুন</span>
        </button>
      </div>

      {loadError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 flex items-start gap-2.5">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">ই-বুক টেবিল বা স্টোরেজ লোড করা যায়নি: {loadError}</p>
            <p className="text-[11px] text-amber-800">
              Supabase SQL Editor-এ স্ট্যান্ডঅ্যালোন অ্যাডিটিভ মাইগ্রেশন (<code className="font-mono">src/lib/supabase-ebooks-migration.sql</code>) রান করুন (গ্লোবাল স্কিমা পুনরায় রান করার প্রয়োজন নেই)।
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 size={18} className="animate-spin text-orange-500" />
          <span>ই-বুক তালিকা লোড হচ্ছে...</span>
        </div>
      ) : ebooks.length === 0 ? (
        <div className="bg-white p-10 text-center rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <p className="text-xs text-slate-500">
            এখনো কোনো ই-বুক আপলোড করা হয়নি। ওপরের বাটনে ক্লিক করে সরাসরি PDF আপলোড করুন।
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ebooks.map((book) => {
            const coverUrl = coverPreviewUrls[book.id];
            const sizeLabel = formatFileSize(book.file_size_bytes);

            return (
              <div
                key={book.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={book.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <BookOpen size={20} className="text-orange-500" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        {book.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          book.is_published
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {book.is_published ? 'প্রকাশিত' : 'ড্রাফট (লুকানো)'}
                      </span>
                    </div>

                    {book.description && (
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-xl">
                        {book.description}
                      </p>
                    )}

                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 tabular-nums">
                      <span>ক্রম: {book.sort_order}</span>
                      {sizeLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{sizeLabel}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePublish(book)}
                    className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                    title={book.is_published ? 'আনপাবলিশ করুন' : 'প্রকাশ করুন'}
                  >
                    {book.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(book)}
                    className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg cursor-pointer"
                    title="সম্পাদনা"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBook(book)}
                    className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-orange-100 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-orange-400" />
                <h3 className="font-extrabold text-sm">
                  {editingBook ? 'ই-বুক সম্পাদনা' : 'নতুন ই-বুক আপলোড'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEbook} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">বইয়ের শিরোনাম *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="যেমন: ঘরে ঘরে সোরোবান"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ক্রম</label>
                  <input
                    type="number"
                    min={0}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">বিবরণ (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="বইয়ের বিষয়বস্তু সম্পর্কে সংক্ষেপে লিখুন..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Direct PDF Upload */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-orange-600" />
                  <span>PDF ফাইল {editingBook ? '(পরিবর্তন করতে চাইলে নির্বাচন করুন)' : '*'}</span>
                </label>

                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-orange-50/60 border border-dashed border-orange-300 rounded-xl cursor-pointer transition-colors">
                  <Upload size={15} className="text-orange-600" />
                  <span className="font-bold text-slate-700">
                    {pdfFile
                      ? `${pdfFile.name} (${formatFileSize(pdfFile.size)})`
                      : editingBook
                      ? 'নতুন PDF ফাইল আপলোড করে প্রতিস্থাপন করুন'
                      : 'কম্পিউটার বা ফোন থেকে PDF বেছে নিন'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handlePdfChange}
                    className="sr-only"
                  />
                </label>
                <p className="text-[11px] text-slate-500">
                  সরাসরি প্রাইভেট স্টোরেজে আপলোড হবে (সর্বোচ্চ ৫০ MB)।
                </p>
              </div>

              {/* Direct Cover Image Upload (Optional) */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-orange-600" />
                    <span>কভার ছবি (ঐচ্ছিক)</span>
                  </label>
                  {editingBook?.cover_storage_path && !removeExistingCover && !coverFile && (
                    <button
                      type="button"
                      onClick={() => setRemoveExistingCover(true)}
                      className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      কভার সরান
                    </button>
                  )}
                </div>

                {(localCoverPreview ||
                  (editingBook && coverPreviewUrls[editingBook.id] && !removeExistingCover)) && (
                  <div className="w-24 h-32 rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={localCoverPreview || (editingBook ? coverPreviewUrls[editingBook.id] : '')}
                      alt="কভার প্রিভিউ"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer transition-colors">
                  <ImageIcon size={14} className="text-slate-600" />
                  <span className="font-bold text-slate-700">
                    {coverFile ? coverFile.name : 'কভার ছবি নির্বাচন করুন (JPG/PNG/WebP)'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleCoverChange}
                    className="sr-only"
                  />
                </label>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded cursor-pointer"
                />
                <span>ই-বুকটি প্রকাশ করুন (লগইন করা সদস্যরা পড়তে পারবেন)</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <span>{saving ? 'আপলোড হচ্ছে...' : 'সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
