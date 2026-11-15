import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { EbookItem, EbookReadingProgress, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import {
  EBOOK_STORAGE_BUCKET,
  clampPageNumber,
  normalizeBookmarks,
  toggleBookmarkPage,
} from '../lib/ebooks';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Bookmark,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  BookOpen,
  Trash2,
  RotateCcw,
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface EbookReaderModalProps {
  ebook: EbookItem;
  currentUser: UserProfile;
  initialProgress?: EbookReadingProgress | null;
  onClose: () => void;
  onProgressSaved?: (progress: EbookReadingProgress) => void;
}

export const EbookReaderModal: React.FC<EbookReaderModalProps> = ({
  ebook,
  currentUser,
  initialProgress,
  onClose,
  onProgressSaved,
}) => {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [docError, setDocError] = useState<string | null>(null);

  const [numPages, setNumPages] = useState<number>(initialProgress?.total_pages || 0);
  const [currentPage, setCurrentPage] = useState<number>(initialProgress?.last_page || 1);
  const [pageInput, setPageInput] = useState<string>(String(initialProgress?.last_page || 1));
  const [bookmarks, setBookmarks] = useState<number[]>(
    normalizeBookmarks(initialProgress?.bookmarks)
  );
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [renderingPage, setRenderingPage] = useState(false);
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  // Keep latest state in refs for clean flush on close/unmount
  const latestStateRef = useRef({
    currentPage,
    numPages,
    bookmarks,
    ready: false,
  });

  useEffect(() => {
    latestStateRef.current.currentPage = currentPage;
    latestStateRef.current.numPages = numPages;
    latestStateRef.current.bookmarks = bookmarks;
  }, [currentPage, numPages, bookmarks]);

  const persistProgress = useCallback(
    async (pageToSave: number, totalToSave: number, bookmarksToSave: number[]) => {
      if (!supabase || !currentUser?.id || !ebook?.id) return;
      if (!totalToSave || totalToSave < 1) return;

      const cleanPage = clampPageNumber(pageToSave, totalToSave);
      const cleanBookmarks = normalizeBookmarks(bookmarksToSave, totalToSave);

      setSavingStatus('saving');
      try {
        const payload = {
          user_id: currentUser.id,
          ebook_id: ebook.id,
          last_page: cleanPage,
          total_pages: totalToSave,
          bookmarks: cleanBookmarks,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('ebook_reading_progress')
          .upsert(payload, { onConflict: 'user_id,ebook_id' })
          .select('*')
          .maybeSingle();

        if (!error) {
          setSavingStatus('saved');
          onProgressSaved?.({
            id: data?.id,
            user_id: currentUser.id,
            ebook_id: ebook.id,
            last_page: cleanPage,
            total_pages: totalToSave,
            bookmarks: cleanBookmarks,
            updated_at: data?.updated_at || payload.updated_at,
          });
        } else {
          setSavingStatus('idle');
        }
      } catch {
        setSavingStatus('idle');
      }
    },
    [currentUser.id, ebook.id, onProgressSaved]
  );

  // Load saved progress + fetch PDF securely via private storage signed URL
  useEffect(() => {
    let cancelled = false;
    let activeDoc: PDFDocumentProxy | null = null;
    let activeLoadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;

    async function loadEbook() {
      if (!supabase) {
        setDocError('ডাটাবেজ সংযোগ সক্রিয় নয়।');
        setLoadingDoc(false);
        return;
      }

      setLoadingDoc(true);
      setDocError(null);

      try {
        // 1. Fetch fresh per-account per-book progress
        const { data: progressRow } = await supabase
          .from('ebook_reading_progress')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('ebook_id', ebook.id)
          .maybeSingle();

        // 2. Request short-lived signed URL from private bucket
        const { data: signedData, error: signErr } = await supabase.storage
          .from(EBOOK_STORAGE_BUCKET)
          .createSignedUrl(ebook.pdf_storage_path, 3600);

        if (signErr || !signedData?.signedUrl) {
          throw new Error(signErr?.message || 'পিডিএফ লোড করার অনুমতি পাওয়া যায়নি।');
        }

        const response = await fetch(signedData.signedUrl, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('ই-বুক ফাইল লোড করতে সমস্যা হয়েছে।');
        }

        const pdfBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
        activeLoadingTask = loadingTask;
        const doc = await loadingTask.promise;

        if (cancelled) {
          await loadingTask.destroy().catch(() => {});
          return;
        }

        activeDoc = doc;
        const total = doc.numPages;
        const savedPage = clampPageNumber(
          progressRow?.last_page ?? initialProgress?.last_page ?? 1,
          total
        );
        const savedBookmarks = normalizeBookmarks(
          progressRow?.bookmarks ?? initialProgress?.bookmarks ?? [],
          total
        );

        latestStateRef.current = {
          currentPage: savedPage,
          numPages: total,
          bookmarks: savedBookmarks,
          ready: true,
        };

        setNumPages(total);
        setCurrentPage(savedPage);
        setPageInput(String(savedPage));
        setBookmarks(savedBookmarks);
        setPdfDoc(doc);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : 'ই-বুক খুলতে সমস্যা হয়েছে।';
          setDocError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingDoc(false);
        }
      }
    }

    loadEbook();

    return () => {
      cancelled = true;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      if (activeDoc) {
        activeDoc.cleanup().catch(() => {});
      }
      if (activeLoadingTask) {
        activeLoadingTask.destroy().catch(() => {});
      }
    };
  }, [ebook.id, ebook.pdf_storage_path, currentUser.id]);

  // Render active page to canvas cleanly
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || !stageRef.current) return;

    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    setRenderingPage(true);
    try {
      const safePage = clampPageNumber(currentPage, pdfDoc.numPages);
      const page = await pdfDoc.getPage(safePage);

      const containerWidth = Math.max(280, stageRef.current.clientWidth - 24);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const fitScale = Math.min(2.2, containerWidth / unscaledViewport.width);
      const effectiveScale = Math.max(0.4, fitScale * zoomScale);
      const viewport = page.getViewport({ scale: effectiveScale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const outputScale = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const task = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform,
      });
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      if (name !== 'RenderingCancelledException') {
        console.error('PDF page render error:', err);
      }
    } finally {
      setRenderingPage(false);
    }
  }, [pdfDoc, currentPage, zoomScale]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Re-fit on window resize
  useEffect(() => {
    const handleResize = () => {
      renderCurrentPage();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCurrentPage]);

  // Debounced auto-save when page changes
  useEffect(() => {
    if (!latestStateRef.current.ready || numPages < 1) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      persistProgress(currentPage, numPages, bookmarks);
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [currentPage, numPages, bookmarks, persistProgress]);

  const goToPage = useCallback(
    (targetPage: number) => {
      if (numPages < 1) return;
      const next = clampPageNumber(targetPage, numPages);
      setCurrentPage(next);
      setPageInput(String(next));
      stageRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    },
    [numPages]
  );

  // Keyboard navigation inside reader
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseReader();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleToggleBookmark = async () => {
    const nextBookmarks = toggleBookmarkPage(bookmarks, currentPage);
    setBookmarks(nextBookmarks);
    if (numPages > 0) {
      await persistProgress(currentPage, numPages, nextBookmarks);
    }
  };

  const handleRemoveBookmark = async (pageToRemove: number) => {
    const nextBookmarks = bookmarks.filter((p) => p !== pageToRemove);
    setBookmarks(nextBookmarks);
    if (numPages > 0) {
      await persistProgress(currentPage, numPages, nextBookmarks);
    }
  };

  const handleCloseReader = () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (latestStateRef.current.ready && latestStateRef.current.numPages > 0) {
      void persistProgress(
        latestStateRef.current.currentPage,
        latestStateRef.current.numPages,
        latestStateRef.current.bookmarks
      );
    }
    onClose();
  };

  const handlePageJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(pageInput, 10);
    if (Number.isFinite(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const isCurrentPageBookmarked = bookmarks.includes(currentPage);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col text-white select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Reader Toolbar */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={handleCloseReader}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <X size={15} />
            <span className="hidden sm:inline">লাইব্রেরিতে ফিরুন</span>
          </button>

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-extrabold text-white truncate flex items-center gap-1.5">
              <BookOpen size={15} className="text-orange-400 shrink-0" />
              <span className="truncate">{ebook.title}</span>
            </h2>
            {numPages > 0 && (
              <p className="text-[11px] text-slate-400 tabular-nums">
                পাতা {currentPage} / {numPages}
                {savingStatus === 'saving'
                  ? ' · সংরক্ষণ হচ্ছে...'
                  : savingStatus === 'saved'
                  ? ' · অগ্রগতি সংরক্ষিত'
                  : ''}
              </p>
            )}
          </div>
        </div>

        {/* Controls: Zoom + Bookmark */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:flex items-center bg-slate-800 border border-slate-700 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              title="জুম কমান"
            >
              <ZoomOut size={15} />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="px-2 text-[11px] font-bold text-slate-200 tabular-nums cursor-pointer"
              title="রিসেট জুম"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg cursor-pointer"
              title="জুম বাড়ান"
            >
              <ZoomIn size={15} />
            </button>
          </div>

          <button
            type="button"
            disabled={loadingDoc || numPages < 1}
            onClick={handleToggleBookmark}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
              isCurrentPageBookmarked
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
            }`}
          >
            {isCurrentPageBookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            <span className="hidden sm:inline">
              {isCurrentPageBookmarked ? 'বুকমার্ক করা' : 'বুকমার্ক করুন'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowBookmarksPanel((prev) => !prev)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer tabular-nums"
          >
            <span>বুকমার্ক ({bookmarks.length})</span>
          </button>
        </div>
      </header>

      {/* Main Stage + Optional Bookmarks Sidebar */}
      <div className="flex-1 flex min-h-0 relative">
        {/* PDF Page Canvas Stage */}
        <div
          ref={stageRef}
          className="flex-1 overflow-auto p-3 sm:p-6 flex flex-col items-center bg-slate-950"
        >
          {loadingDoc ? (
            <div className="my-auto flex flex-col items-center gap-3 text-slate-300 py-16">
              <Loader2 size={28} className="animate-spin text-orange-400" />
              <p className="text-xs font-bold">ই-বুক লোড হচ্ছে...</p>
            </div>
          ) : docError ? (
            <div className="my-auto max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center space-y-3">
              <AlertCircle size={30} className="text-rose-400 mx-auto" />
              <p className="text-sm font-bold text-white">{docError}</p>
              <button
                type="button"
                onClick={handleCloseReader}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                ফিরে যান
              </button>
            </div>
          ) : (
            <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden my-auto">
              <canvas ref={canvasRef} className="block max-w-none" />
              {renderingPage && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <Loader2 size={22} className="animate-spin text-orange-600" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bookmarks Drawer */}
        {showBookmarksPanel && (
          <aside className="w-72 max-w-[85vw] bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto shrink-0 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="text-xs font-extrabold text-white">সংরক্ষিত বুকমার্ক</h3>
              <button
                type="button"
                onClick={() => setShowBookmarksPanel(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {bookmarks.length === 0 ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                এখনো কোনো পাতা বুকমার্ক করা হয়নি। পছন্দের পাতায় গিয়ে &ldquo;বুকমার্ক করুন&rdquo; বোতামে ক্লিক করুন।
              </p>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((pageNum) => (
                  <div
                    key={pageNum}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${
                      pageNum === currentPage
                        ? 'bg-orange-500/20 border-orange-500/50 text-orange-200'
                        : 'bg-slate-800/70 border-slate-700 text-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => goToPage(pageNum)}
                      className="flex-1 text-left font-bold hover:text-orange-300 cursor-pointer tabular-nums"
                    >
                      পাতা {pageNum}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveBookmark(pageNum)}
                      className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="বুকমার্ক সরান"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Bottom Pagination & Quick Controls */}
      {!loadingDoc && !docError && numPages > 0 && (
        <footer className="bg-slate-900 border-t border-slate-800 px-3 sm:px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
              <span>আগের পাতা</span>
            </button>

            <button
              type="button"
              disabled={currentPage >= numPages}
              onClick={() => goToPage(currentPage + 1)}
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>পরের পাতা</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <form onSubmit={handlePageJumpSubmit} className="flex items-center gap-2 text-xs">
            <label htmlFor="ebook-page-jump" className="text-slate-400 font-medium">
              পাতা:
            </label>
            <input
              id="ebook-page-jump"
              type="number"
              min={1}
              max={numPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-center text-white font-bold tabular-nums focus:outline-none focus:border-orange-500"
            />
            <span className="text-slate-400 tabular-nums">/ {numPages}</span>
            <button
              type="submit"
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 cursor-pointer"
            >
              যান
            </button>
          </form>

          <div className="flex md:hidden items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))))}
              className="p-1.5 bg-slate-800 rounded-lg text-slate-200 cursor-pointer"
              aria-label="জুম কমান"
            >
              <ZoomOut size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              className="p-1.5 bg-slate-800 rounded-lg text-slate-200 cursor-pointer"
              aria-label="জুম রিসেট"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(2, Number((z + 0.15).toFixed(2))))}
              className="p-1.5 bg-slate-800 rounded-lg text-slate-200 cursor-pointer"
              aria-label="জুম বাড়ান"
            >
              <ZoomIn size={14} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
