import React, { useState, useEffect, useCallback } from 'react';
import { EbookItem, EbookReadingProgress, UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EBOOK_STORAGE_BUCKET, formatFileSize, normalizeBookmarks } from '../lib/ebooks';
import { EbookReaderModal } from './EbookReaderModal';
import {
  BookOpen,
  ArrowLeft,
  Lock,
  UserPlus,
  LogIn,
  Loader2,
  Bookmark,
  AlertCircle,
} from 'lucide-react';

interface EbookLibraryProps {
  currentUser: UserProfile | null;
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const EbookLibrary: React.FC<EbookLibraryProps> = ({
  currentUser,
  onNavigate,
  onOpenAuth,
}) => {
  const isAuthenticatedActive = Boolean(currentUser && currentUser.is_active);
  const [ebooks, setEbooks] = useState<EbookItem[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [progressMap, setProgressMap] = useState<Record<string, EbookReadingProgress>>({});
  const [loading, setLoading] = useState<boolean>(isAuthenticatedActive);
  const [error, setError] = useState<string | null>(null);
  const [activeBook, setActiveBook] = useState<EbookItem | null>(null);

  const fetchLibrary = useCallback(async () => {
    if (!isAuthenticatedActive || !currentUser?.id || !isSupabaseConfigured || !supabase) {
      setEbooks([]);
      setCoverUrls({});
      setProgressMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: booksData, error: booksErr } = await supabase
        .from('ebooks')
        .select('*')
        .eq('is_published', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (booksErr) {
        throw booksErr;
      }

      const bookList: EbookItem[] = booksData || [];
      setEbooks(bookList);

      // Load per-account reading progress across all listed books
      const { data: progressRows } = await supabase
        .from('ebook_reading_progress')
        .select('*')
        .eq('user_id', currentUser.id);

      const nextProgressMap: Record<string, EbookReadingProgress> = {};
      for (const row of progressRows || []) {
        nextProgressMap[row.ebook_id] = {
          ...row,
          bookmarks: normalizeBookmarks(row.bookmarks, row.total_pages),
        };
      }
      setProgressMap(nextProgressMap);

      // Resolve signed URLs for private cover images
      const coverEntries = await Promise.all(
        bookList
          .filter((b) => Boolean(b.cover_storage_path))
          .map(async (b) => {
            if (!supabase || !b.cover_storage_path) return [b.id, ''] as const;
            const { data: signed } = await supabase.storage
              .from(EBOOK_STORAGE_BUCKET)
              .createSignedUrl(b.cover_storage_path, 3600);
            return [b.id, signed?.signedUrl || ''] as const;
          })
      );

      const nextCoverMap: Record<string, string> = {};
      for (const [id, url] of coverEntries) {
        if (url) nextCoverMap[id] = url;
      }
      setCoverUrls(nextCoverMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ই-বুক লাইব্রেরি লোড করতে সমস্যা হয়েছে।';
      setError(msg);
      setEbooks([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticatedActive, currentUser?.id]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  const handleProgressSaved = useCallback((saved: EbookReadingProgress) => {
    setProgressMap((prev) => ({
      ...prev,
      [saved.ebook_id]: saved,
    }));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{currentUser ? 'ড্যাশবোর্ডে ফিরে যান' : 'মূল পাতায় ফিরে যান'}</span>
        </button>

        <span className="text-xs font-bold text-orange-700">
          সদস্যদের ই-বুক লাইব্রেরি
        </span>
      </div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-4 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          ই-বুক লাইব্রেরি
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          সোরোবান অ্যাবাকাস শেখার বাংলা ই-বুক ও গাইড সরাসরি সাইটের ভেতরে পড়ুন। আপনার শেষ পড়া পাতা ও বুকমার্ক অ্যাকাউন্টে সংরক্ষিত থাকবে।
        </p>
      </div>

      {/* Auth Gate for Signed-Out Visitors */}
      {!isAuthenticatedActive ? (
        <div className="p-8 sm:p-10 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-xl text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-400/30 text-orange-300 mx-auto flex items-center justify-center">
            <Lock size={28} />
          </div>

          <div className="space-y-2 max-w-lg mx-auto">
            <h2 className="text-xl sm:text-2xl font-black text-white">
              ই-বুক লাইব্রেরি দেখতে অ্যাকাউন্টে লগইন করুন
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              নতুন ফ্রি অ্যাকাউন্ট নিবন্ধন করুন অথবা আপনার নিবন্ধিত ইমেইল দিয়ে লগইন করে ই-বুকগুলো পড়ুন।
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>ফ্রি অ্যাকাউন্ট খুলুন</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/20 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn size={16} />
              <span>লগইন করুন</span>
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
          <Loader2 size={26} className="animate-spin text-orange-500" />
          <span className="text-xs font-medium">ই-বুক তালিকা লোড হচ্ছে...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2 text-rose-900">
          <AlertCircle size={26} className="text-rose-500 mx-auto" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      ) : ebooks.length === 0 ? (
        <div className="p-10 bg-white rounded-3xl border border-slate-200 text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 mx-auto flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">
            এখনো কোনো ই-বুক প্রকাশ করা হয়নি
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            এডমিন প্যানেল থেকে নতুন ই-বুক আপলোড ও প্রকাশ করা হলে এখানে দেখতে পারবেন।
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ebooks.map((book) => {
            const progress = progressMap[book.id];
            const coverUrl = coverUrls[book.id];
            const lastPage = progress?.last_page || 0;
            const totalPages = progress?.total_pages || 0;
            const bookmarkCount = progress?.bookmarks?.length || 0;
            const fileSizeText = formatFileSize(book.file_size_bytes);

            return (
              <div
                key={book.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-orange-300 hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                {/* Book Cover */}
                <div className="relative aspect-[3/4] max-h-64 w-full bg-slate-100 overflow-hidden">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-50 via-amber-50 to-slate-100 flex flex-col items-center justify-center p-6 text-center gap-2">
                      <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                        <BookOpen size={28} />
                      </div>
                      <span className="text-sm font-extrabold text-slate-800 line-clamp-2">
                        {book.title}
                      </span>
                    </div>
                  )}
                </div>

                {/* Book Info & Reading Progress */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-extrabold text-slate-900 text-base leading-snug line-clamp-2">
                      {book.title}
                    </h3>
                    {book.description && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {book.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 pt-1 tabular-nums">
                      {lastPage > 0 && (
                        <span>
                          শেষ পড়া: পাতা {lastPage}
                          {totalPages > 0 ? ` / ${totalPages}` : ''}
                        </span>
                      )}
                      {lastPage > 0 && bookmarkCount > 0 && <span aria-hidden="true">·</span>}
                      {bookmarkCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-orange-700 font-semibold">
                          <Bookmark size={11} />
                          {bookmarkCount} বুকমার্ক
                        </span>
                      )}
                      {(lastPage > 0 || bookmarkCount > 0) && fileSizeText && (
                        <span aria-hidden="true">·</span>
                      )}
                      {fileSizeText && <span>{fileSizeText}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveBook(book)}
                    className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen size={15} />
                    <span>{lastPage > 1 ? 'পড়া চালিয়ে যান' : 'এখনই পড়ুন'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-Site PDF.js Reader Modal */}
      {activeBook && currentUser && (
        <EbookReaderModal
          ebook={activeBook}
          currentUser={currentUser}
          initialProgress={progressMap[activeBook.id] || null}
          onClose={() => setActiveBook(null)}
          onProgressSaved={handleProgressSaved}
        />
      )}
    </div>
  );
};
