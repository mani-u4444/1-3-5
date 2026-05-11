import type { Concept } from './types';
import { nDaysAgo } from './dates';

const c = (
  title: string, notes: string, ago: number,
  r3: boolean, r7: boolean
): Concept => ({
  id: crypto.randomUUID(), title, notes,
  images: [],
  dateAdded: nDaysAgo(ago), reviewedDay3: r3, reviewedDay7: r7,
});

export const demoData = (): Concept[] => [
  c('React useCallback hook',
    'Memoizes a function reference between renders. Wrap callbacks passed to React.memo children.',
    0, false, false),
  c('CSS Grid fundamentals',
    'grid-template-columns/rows, gap, fr unit, auto-fill + minmax() for responsive layouts.',
    0, false, false),
  c('JavaScript Promises',
    'Promise.all() parallel, Promise.allSettled() when some can fail. async/await is sugar over .then().',
    1, false, false),
  c('Binary Search',
    'O(log n). Sorted array only. Two pointers l,r → mid = Math.floor((l+r)/2).',
    3, false, false),
  c('Stack vs Queue',
    'Stack = LIFO (undo history). Queue = FIFO (print queue). Both O(1) push/pop.',
    3, false, false),
  c('HTTP Methods',
    'GET read, POST create, PUT full update, PATCH partial, DELETE remove.',
    5, true, false),
  c('REST API Design',
    'Nouns not verbs: /users not /getUsers. Proper status codes. Consistent resource URLs.',
    5, true, false),
  c('SQL JOINs',
    'INNER = matching rows. LEFT = all left + matches. RIGHT = all right + matches.',
    7, true, false),
  c('Database Normalisation',
    '1NF: atomic values. 2NF: no partial deps. 3NF: no transitive deps.',
    7, true, false),
  c('Big O Notation',
    'O(1) constant, O(log n) logarithmic, O(n) linear, O(n²) quadratic.',
    10, true, true),
  c('Linked Lists',
    'Node has value + next pointer. Insert/delete head O(1). Search O(n). No random access.',
    10, true, true),
];
