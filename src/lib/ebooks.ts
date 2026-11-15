export const EBOOK_STORAGE_BUCKET = 'ebooks';
export const MAX_EBOOK_PDF_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_EBOOK_COVER_BYTES = 10 * 1024 * 1024; // 10 MB

export function clampPageNumber(page: number, totalPages?: number | null): number {
  const numericPage = Number.isFinite(page) ? Math.floor(page) : 1;
  const minClamped = Math.max(1, numericPage);
  if (totalPages && Number.isFinite(totalPages) && totalPages >= 1) {
    return Math.min(Math.floor(totalPages), minClamped);
  }
  return minClamped;
}

export function normalizeBookmarks(bookmarks: unknown, totalPages?: number | null): number[] {
  if (!Array.isArray(bookmarks)) return [];
  const valid = new Set<number>();
  for (const item of bookmarks) {
    const n = typeof item === 'number' ? Math.floor(item) : Number(item);
    if (!Number.isInteger(n) || n < 1) continue;
    if (totalPages && Number.isFinite(totalPages) && totalPages >= 1 && n > Math.floor(totalPages)) {
      continue;
    }
    valid.add(n);
  }
  return Array.from(valid).sort((a, b) => a - b);
}

export function toggleBookmarkPage(bookmarks: number[], page: number): number[] {
  const cleanPage = Math.floor(page);
  if (!Number.isInteger(cleanPage) || cleanPage < 1) {
    return normalizeBookmarks(bookmarks);
  }
  const normalized = normalizeBookmarks(bookmarks);
  if (normalized.includes(cleanPage)) {
    return normalized.filter((p) => p !== cleanPage);
  }
  return [...normalized, cleanPage].sort((a, b) => a - b);
}

export function sanitizeStorageFileName(fileName: string, fallbackExt: string): string {
  const trimmed = fileName.trim().toLowerCase();
  const lastDot = trimmed.lastIndexOf('.');
  const rawBase = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const rawExt = lastDot > 0 ? trimmed.slice(lastDot + 1) : fallbackExt;

  const cleanBase = rawBase.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  const cleanExt = rawExt.replace(/[^a-z0-9]+/g, '') || fallbackExt;
  return `${cleanBase.slice(0, 60)}.${cleanExt}`;
}

export function validateEbookPdfFile(file: File | null | undefined): string | null {
  if (!file) return 'অনুগ্রহ করে একটি PDF ফাইল নির্বাচন করুন।';
  const isPdfType =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfType) {
    return 'শুধুমাত্র PDF (.pdf) ফাইল আপলোড করা যাবে।';
  }
  if (file.size <= 0) {
    return 'ফাইলটি খালি হতে পারে না।';
  }
  if (file.size > MAX_EBOOK_PDF_BYTES) {
    return 'PDF ফাইলের আকার ৫০ মেগাবাইটের বেশি হতে পারবে না।';
  }
  return null;
}

export function validateEbookCoverFile(file: File | null | undefined): string | null {
  if (!file) return null;
  const validMime = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
  const validExt = /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!validMime && !validExt) {
    return 'কভার ছবির ফরম্যাট JPG, PNG অথবা WebP হতে হবে।';
  }
  if (file.size > MAX_EBOOK_COVER_BYTES) {
    return 'কভার ছবির আকার ১০ মেগাবাইটের বেশি হতে পারবে না।';
  }
  return null;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
