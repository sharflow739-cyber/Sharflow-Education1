import { ClassItem, CourseChapter } from '../types';

export const UNCATEGORIZED_CHAPTER_KEY = 'uncategorized';

export const DEFAULT_COURSE_CHAPTERS: CourseChapter[] = [
  {
    id: 'direct',
    title: 'সরাসরি যোগ-বিয়োগ',
    subtitle: 'Without Complement',
    sort_order: 1,
    is_default: true,
  },
  {
    id: 'five-complement',
    title: '৫-এর বন্ধু',
    subtitle: 'Five Complement',
    sort_order: 2,
    is_default: true,
  },
  {
    id: 'ten-complement',
    title: '১০-এর বন্ধু',
    subtitle: 'Ten Complement',
    sort_order: 3,
    is_default: true,
  },
  {
    id: 'mixed-complement',
    title: 'মিশ্র নিয়ম',
    subtitle: 'Mixed Complement',
    sort_order: 4,
    is_default: true,
  },
];

export function sortChapters(chapters: CourseChapter[]): CourseChapter[] {
  return [...chapters].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }
    return a.title.localeCompare(b.title);
  });
}

export function sortClassesByOrder(classes: ClassItem[]): ClassItem[] {
  return [...classes].sort((a, b) => {
    if (a.class_number !== b.class_number) {
      return a.class_number - b.class_number;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Infers a chapter ONLY when the class topic is unambiguous.
 * Foundational intro, number reading, or general mental math remain null (অন্যান্য).
 */
export function inferUnambiguousChapterId(
  cls: Pick<ClassItem, 'title' | 'description'>
): string | null {
  const title = (cls.title || '').toLowerCase();
  const description = (cls.description || '').toLowerCase();

  if (
    title.includes('সরাসরি যোগ') ||
    title.includes('সরাসরি বিয়োগ') ||
    title.includes('সরাসরি বিয়োগ') ||
    title.includes('without complement') ||
    title.includes('direct addition') ||
    title.includes('direct subtraction')
  ) {
    return 'direct';
  }

  if (
    title.includes('৫-এর বন্ধু') ||
    title.includes('৫ এর বন্ধু') ||
    title.includes('৫-এর পরিপূরক') ||
    title.includes('স্মল ফ্রেন্ড') ||
    title.includes('five complement') ||
    title.includes('small friend') ||
    description.includes('৫-এর পরিপূরক') ||
    description.includes('small friend')
  ) {
    return 'five-complement';
  }

  if (
    title.includes('১০-এর বন্ধু') ||
    title.includes('১০ এর বন্ধু') ||
    title.includes('১০-এর পরিপূরক') ||
    title.includes('বিগ ফ্রেন্ড') ||
    title.includes('ten complement') ||
    title.includes('big friend') ||
    description.includes('১০-এর পরিপূরক') ||
    description.includes('big friend')
  ) {
    return 'ten-complement';
  }

  if (
    title.includes('মিশ্র নিয়ম') ||
    title.includes('মিশ্র নিয়ম') ||
    title.includes('mixed complement') ||
    title.includes('combination')
  ) {
    return 'mixed-complement';
  }

  return null;
}

/**
 * Resolves the effective chapter ID for a class:
 * - When DB chapter persistence is active (chaptersSupported = true), trust stored cls.chapter_id directly
 *   (so explicit uncategorized NULL stays under অন্যান্য).
 * - When DB migration hasn't been applied yet, infer ONLY unambiguous topics safely.
 */
export function resolveClassChapterId(
  cls: ClassItem,
  chapters: CourseChapter[],
  chaptersSupported: boolean
): string | null {
  const validChapterIds = new Set(chapters.map((ch) => ch.id));

  if (chaptersSupported || Object.prototype.hasOwnProperty.call(cls, 'chapter_id')) {
    const rawId = (cls.chapter_id || '').trim();
    if (!rawId) return null;
    return validChapterIds.has(rawId) ? rawId : null;
  }

  const inferred = inferUnambiguousChapterId(cls);
  return inferred && validChapterIds.has(inferred) ? inferred : null;
}

export interface ChapterClassGroup {
  chapter: CourseChapter | null; // null represents অন্যান্য (uncategorized)
  key: string;
  title: string;
  subtitle?: string;
  classes: ClassItem[];
}

export function groupClassesByChapter(
  classes: ClassItem[],
  chapters: CourseChapter[],
  chaptersSupported: boolean
): ChapterClassGroup[] {
  const orderedChapters = sortChapters(chapters);
  const orderedClasses = sortClassesByOrder(classes);

  const buckets = new Map<string, ClassItem[]>();
  for (const ch of orderedChapters) {
    buckets.set(ch.id, []);
  }
  const uncategorized: ClassItem[] = [];

  for (const cls of orderedClasses) {
    const resolvedId = resolveClassChapterId(cls, orderedChapters, chaptersSupported);
    if (resolvedId && buckets.has(resolvedId)) {
      buckets.get(resolvedId)!.push(cls);
    } else {
      uncategorized.push(cls);
    }
  }

  const groups: ChapterClassGroup[] = orderedChapters.map((ch) => ({
    chapter: ch,
    key: ch.id,
    title: ch.title,
    subtitle: ch.subtitle,
    classes: buckets.get(ch.id) || [],
  }));

  if (uncategorized.length > 0) {
    groups.push({
      chapter: null,
      key: UNCATEGORIZED_CHAPTER_KEY,
      title: 'অন্যান্য',
      classes: uncategorized,
    });
  }

  return groups;
}

export interface ClassesAccordionSection {
  key: string;
  title: string;
  subtitle?: string;
  isFreeSection: boolean;
  classes: ClassItem[];
  emptyMessage: string;
}

/**
 * Builds the /classes full-width accordion bar list:
 * 1. "ফ্রি ক্লাস" bar containing all published free classes in admin order
 * 2. All configured course_chapters in admin sort_order (including empty states)
 * 3. "অন্যান্য" ONLY when unassigned published classes exist
 */
export function buildClassesAccordionSections(
  classes: ClassItem[],
  chapters: CourseChapter[],
  chaptersSupported: boolean
): ClassesAccordionSection[] {
  const publishedClasses = sortClassesByOrder(
    classes.filter((cls) => cls.is_published !== false)
  );
  const freeClasses = publishedClasses.filter((cls) => cls.is_free !== false);
  const chapterGroups = groupClassesByChapter(
    publishedClasses,
    sortChapters(chapters),
    chaptersSupported
  );

  const sections: ClassesAccordionSection[] = [
    {
      key: 'free-classes',
      title: 'ফ্রি ক্লাস',
      subtitle: 'Free Classes',
      isFreeSection: true,
      classes: freeClasses,
      emptyMessage: 'বর্তমানে কোনো প্রকাশকৃত ফ্রি ক্লাস নেই।',
    },
  ];

  for (const grp of chapterGroups) {
    sections.push({
      key: grp.key,
      title: grp.title,
      subtitle: grp.subtitle,
      isFreeSection: false,
      classes: grp.classes,
      emptyMessage: 'এই অধ্যায়ে এখনও কোনো প্রকাশকৃত ক্লাস যুক্ত হয়নি।',
    });
  }

  return sections;
}

/**
 * Computes updated chapter sort_order values after moving a chapter up or down.
 */
export function reorderChaptersList(
  chapters: CourseChapter[],
  chapterId: string,
  direction: 'up' | 'down'
): CourseChapter[] | null {
  const ordered = sortChapters(chapters);
  const index = ordered.findIndex((c) => c.id === chapterId);
  if (index === -1) return null;

  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= ordered.length) return null;

  const next = [...ordered];
  const current = next[index];
  next[index] = next[targetIndex];
  next[targetIndex] = current;

  return next.map((ch, idx) => ({
    ...ch,
    sort_order: idx + 1,
  }));
}

/**
 * Recomputes deterministic sequential class_number (1..N) across chapters in saved order
 * after reordering a lesson within a chapter (or moving a lesson to another chapter).
 * Returns only classes whose class_number or chapter_id changed.
 */
export function computeClassOrderAfterMoveWithinGroup(
  allClasses: ClassItem[],
  chapters: CourseChapter[],
  chaptersSupported: boolean,
  groupKey: string,
  classId: string,
  direction: 'up' | 'down'
): Array<{ id: string; class_number: number }> | null {
  const groups = groupClassesByChapter(allClasses, chapters, chaptersSupported);
  const targetGroup = groups.find((g) => g.key === groupKey);
  if (!targetGroup) return null;

  const idx = targetGroup.classes.findIndex((c) => c.id === classId);
  if (idx === -1) return null;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= targetGroup.classes.length) return null;

  const updatedGroupClasses = [...targetGroup.classes];
  const temp = updatedGroupClasses[idx];
  updatedGroupClasses[idx] = updatedGroupClasses[swapIdx];
  updatedGroupClasses[swapIdx] = temp;

  const flattened: ClassItem[] = [];
  for (const grp of groups) {
    if (grp.key === groupKey) {
      flattened.push(...updatedGroupClasses);
    } else {
      flattened.push(...grp.classes);
    }
  }

  const updates: Array<{ id: string; class_number: number }> = [];
  flattened.forEach((cls, index) => {
    const nextNum = index + 1;
    if (cls.class_number !== nextNum) {
      updates.push({ id: cls.id, class_number: nextNum });
    }
  });

  return updates;
}
