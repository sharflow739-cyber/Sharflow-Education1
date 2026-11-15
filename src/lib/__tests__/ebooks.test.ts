import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPageNumber,
  normalizeBookmarks,
  toggleBookmarkPage,
  sanitizeStorageFileName,
  validateEbookPdfFile,
  validateEbookCoverFile,
} from '../ebooks.ts';

test('clampPageNumber keeps page within [1, totalPages]', () => {
  assert.equal(clampPageNumber(0, 12), 1);
  assert.equal(clampPageNumber(-5, 12), 1);
  assert.equal(clampPageNumber(7, 12), 7);
  assert.equal(clampPageNumber(99, 12), 12);
  assert.equal(clampPageNumber(3.9, 12), 3);
});

test('normalizeBookmarks and toggleBookmarkPage maintain sorted unique valid page numbers', () => {
  assert.deepEqual(normalizeBookmarks([5, 1, 5, 0, -2, 14, '3'], 10), [1, 3, 5]);
  assert.deepEqual(toggleBookmarkPage([1, 5], 3), [1, 3, 5]);
  assert.deepEqual(toggleBookmarkPage([1, 3, 5], 3), [1, 5]);
  assert.deepEqual(toggleBookmarkPage([1, 5], 0), [1, 5]);
});

test('sanitizeStorageFileName normalizes filenames safely', () => {
  assert.equal(sanitizeStorageFileName('Ghore Ghore Soroban (Final).PDF', 'pdf'), 'ghore-ghore-soroban-final.pdf');
  assert.equal(sanitizeStorageFileName('ঘরে ঘরে সোরোবান.pdf', 'pdf'), 'file.pdf');
  assert.equal(sanitizeStorageFileName('cover_01.webp', 'jpg'), 'cover_01.webp');
});

test('validateEbookPdfFile and validateEbookCoverFile enforce type and size limits', () => {
  const validPdf = new File([new Uint8Array([1, 2, 3])], 'book.pdf', { type: 'application/pdf' });
  assert.equal(validateEbookPdfFile(validPdf), null);

  const nonPdf = new File([new Uint8Array([1, 2, 3])], 'notes.txt', { type: 'text/plain' });
  assert.ok(validateEbookPdfFile(nonPdf));

  const validCover = new File([new Uint8Array([1, 2, 3])], 'cover.png', { type: 'image/png' });
  assert.equal(validateEbookCoverFile(validCover), null);

  const invalidCover = new File([new Uint8Array([1, 2, 3])], 'cover.svg', { type: 'image/svg+xml' });
  assert.ok(validateEbookCoverFile(invalidCover));
});
