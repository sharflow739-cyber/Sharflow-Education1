import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COURSE_CHAPTERS,
  UNCATEGORIZED_CHAPTER_KEY,
  buildClassesAccordionSections,
  computeClassOrderAfterMoveWithinGroup,
  getLearnerAccordionLabel,
  groupClassesByChapter,
  inferUnambiguousChapterId,
  reorderChaptersList,
  resolveClassChapterId,
} from '../courseChapters.ts';
import { ClassItem, CourseChapter } from '../../types.ts';

const SAMPLE_CLASSES: ClassItem[] = [
  {
    id: 'class-01',
    class_number: 1,
    title: 'অ্যাবাকাসের সাথে পরিচয়',
    description: 'মৌলিক ধারণা',
    video_url: '',
    is_published: true,
    is_free: true,
  },
  {
    id: 'class-04',
    class_number: 2,
    title: 'সরাসরি যোগ (Direct Addition)',
    description: 'সহজ যোগ',
    video_url: '',
    is_published: true,
    is_free: true,
  },
  {
    id: 'class-05',
    class_number: 3,
    title: 'সরাসরি বিয়োগ (Direct Subtraction)',
    description: 'সহজ বিয়োগ',
    video_url: '',
    is_published: true,
    is_free: false,
  },
  {
    id: 'class-06',
    class_number: 4,
    title: 'স্মল ফ্রেন্ডস যোগ (+4, +3, +2, +1)',
    description: '৫-এর পরিপূরক ব্যবহার করে যোগ',
    video_url: '',
    is_published: true,
    is_free: false,
  },
  {
    id: 'class-08',
    class_number: 5,
    title: 'মেন্টাল ম্যাথ ও মানসিকভাবে গণনা',
    description: 'মানসিক অনুশীলন',
    video_url: '',
    is_published: true,
    is_free: false,
  },
];

test('Default chapters match exact Bengali order and English equivalents', () => {
  assert.deepEqual(
    DEFAULT_COURSE_CHAPTERS.map((c) => [c.title, c.subtitle]),
    [
      ['সরাসরি যোগ-বিয়োগ', 'Without Complement'],
      ['৫-এর বন্ধু', 'Five Complement'],
      ['১০-এর বন্ধু', 'Ten Complement'],
      ['মিশ্র নিয়ম', 'Mixed Complement'],
    ]
  );
});

test('inferUnambiguousChapterId assigns unambiguous topics only and leaves intro/mental math as null', () => {
  assert.equal(inferUnambiguousChapterId(SAMPLE_CLASSES[0]), null); // অ্যাবাকাসের সাথে পরিচয় -> অন্যান্য
  assert.equal(inferUnambiguousChapterId(SAMPLE_CLASSES[1]), 'direct');
  assert.equal(inferUnambiguousChapterId(SAMPLE_CLASSES[2]), 'direct');
  assert.equal(inferUnambiguousChapterId(SAMPLE_CLASSES[3]), 'five-complement');
  assert.equal(inferUnambiguousChapterId(SAMPLE_CLASSES[4]), null); // মেন্টাল ম্যাথ -> অন্যান্য
  assert.equal(
    inferUnambiguousChapterId({ title: '১০-এর বন্ধু বিয়োগ', description: 'Big Friend' }),
    'ten-complement'
  );
  assert.equal(
    inferUnambiguousChapterId({ title: 'মিশ্র নিয়ম (+6 থেকে +9)', description: 'Mixed Complement' }),
    'mixed-complement'
  );
});

test('groupClassesByChapter respects stored null chapter_id when migration is active and keeps অন্যান্য visible', () => {
  const dbClasses: ClassItem[] = [
    { ...SAMPLE_CLASSES[0], chapter_id: null },
    { ...SAMPLE_CLASSES[1], chapter_id: 'direct' },
    { ...SAMPLE_CLASSES[2], chapter_id: 'direct' },
    { ...SAMPLE_CLASSES[3], chapter_id: 'five-complement' },
    { ...SAMPLE_CLASSES[4], chapter_id: null },
  ];

  // If admin intentionally clears chapter_id on class-05 -> goes to অন্যান্য
  const movedToUncategorized: ClassItem[] = dbClasses.map((c) =>
    c.id === 'class-05' ? { ...c, chapter_id: null } : c
  );
  assert.equal(
    resolveClassChapterId(movedToUncategorized[2], DEFAULT_COURSE_CHAPTERS, true),
    null
  );

  const groups = groupClassesByChapter(dbClasses, DEFAULT_COURSE_CHAPTERS, true);
  assert.deepEqual(
    groups.find((g) => g.key === 'direct')?.classes.map((c) => c.id),
    ['class-04', 'class-05']
  );
  assert.deepEqual(
    groups.find((g) => g.key === 'five-complement')?.classes.map((c) => c.id),
    ['class-06']
  );
  assert.deepEqual(
    groups.find((g) => g.key === UNCATEGORIZED_CHAPTER_KEY)?.classes.map((c) => c.id),
    ['class-01', 'class-08']
  );
});

test('reorderChaptersList and computeClassOrderAfterMoveWithinGroup persist deterministic order', () => {
  const reorderedChapters = reorderChaptersList(DEFAULT_COURSE_CHAPTERS, 'five-complement', 'up');
  assert.ok(reorderedChapters);
  assert.deepEqual(
    reorderedChapters.map((c: CourseChapter) => [c.id, c.sort_order]),
    [
      ['five-complement', 1],
      ['direct', 2],
      ['ten-complement', 3],
      ['mixed-complement', 4],
    ]
  );

  const dbClasses: ClassItem[] = [
    { ...SAMPLE_CLASSES[1], chapter_id: 'direct', class_number: 1 },
    { ...SAMPLE_CLASSES[2], chapter_id: 'direct', class_number: 2 },
    { ...SAMPLE_CLASSES[3], chapter_id: 'five-complement', class_number: 3 },
  ];

  const updates = computeClassOrderAfterMoveWithinGroup(
    dbClasses,
    DEFAULT_COURSE_CHAPTERS,
    true,
    'direct',
    'class-05',
    'up'
  );
  assert.deepEqual(updates, [
    { id: 'class-05', class_number: 1 },
    { id: 'class-04', class_number: 2 },
  ]);
});

test('buildClassesAccordionSections includes free classes bar, preserves empty chapters, and shows অন্যান্য only for unassigned classes', () => {
  const dbClasses: ClassItem[] = [
    { ...SAMPLE_CLASSES[0], chapter_id: null, is_published: true, is_free: true },
    { ...SAMPLE_CLASSES[1], chapter_id: 'direct', is_published: true, is_free: true },
    { ...SAMPLE_CLASSES[2], chapter_id: 'direct', is_published: true, is_free: false },
    {
      id: 'draft-free',
      class_number: 99,
      title: 'অপ্রকাশিত ফ্রি ক্লাস',
      description: 'Draft',
      video_url: '',
      is_published: false,
      is_free: true,
      chapter_id: 'ten-complement',
    },
  ];

  const withUncategorized = buildClassesAccordionSections(
    dbClasses,
    DEFAULT_COURSE_CHAPTERS,
    true
  );

  assert.deepEqual(
    withUncategorized.map((s) => s.key),
    ['free-classes', 'direct', 'five-complement', 'ten-complement', 'mixed-complement', 'uncategorized']
  );
  assert.equal(withUncategorized[0].title, 'ফ্রি ক্লাস');
  assert.deepEqual(
    withUncategorized[0].classes.map((c) => c.id),
    ['class-01', 'class-04']
  );
  assert.deepEqual(
    withUncategorized.find((s) => s.key === 'five-complement')?.classes,
    []
  );
  assert.deepEqual(
    withUncategorized.find((s) => s.key === 'uncategorized')?.classes.map((c) => c.id),
    ['class-01']
  );

  // When no unassigned published classes remain, অন্যান্য disappears automatically
  const allAssigned = dbClasses
    .filter((c) => c.is_published)
    .map((c) => (c.id === 'class-01' ? { ...c, chapter_id: 'direct' } : c));
  const withoutUncategorized = buildClassesAccordionSections(
    allAssigned,
    DEFAULT_COURSE_CHAPTERS,
    true
  );
  assert.deepEqual(
    withoutUncategorized.map((s) => s.key),
    ['free-classes', 'direct', 'five-complement', 'ten-complement', 'mixed-complement']
  );
});

test('getLearnerAccordionLabel maps beginner-friendly Bengali labels without English Complement jargon', () => {
  const sections = buildClassesAccordionSections(
    [
      { ...SAMPLE_CLASSES[0], chapter_id: null, is_published: true, is_free: true },
      { ...SAMPLE_CLASSES[1], chapter_id: 'direct', is_published: true, is_free: true },
    ],
    [
      ...DEFAULT_COURSE_CHAPTERS,
      { id: 'extra-ch', title: 'অতিরিক্ত অনুশীলন', subtitle: 'Mixed Complement Practice', sort_order: 5 },
    ],
    true
  );

  assert.deepEqual(
    sections.map((s) => [s.key, getLearnerAccordionLabel(s)]),
    [
      ['free-classes', { title: 'শুরু করি', subtitle: 'ফ্রি ক্লাস' }],
      ['direct', { title: 'সহজ যোগ-বিয়োগ' }],
      ['five-complement', { title: '৫ দিয়ে যোগ-বিয়োগ' }],
      ['ten-complement', { title: '১০ দিয়ে যোগ-বিয়োগ' }],
      ['mixed-complement', { title: 'মিশ্র অনুশীলন' }],
      ['extra-ch', { title: 'অতিরিক্ত অনুশীলন' }],
      ['uncategorized', { title: 'অন্যান্য' }],
    ]
  );
});
