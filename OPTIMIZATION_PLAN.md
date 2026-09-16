# OPTIMIZATION PLAN.md

## Phase 1 - Confirm Findings

### Task 1 [Critical — correctness bug + biggest perf win]
**File:** `src/lib/supabase/queries.ts`, function `deleteCourse`

[x] Task 1 — confirmed at src/lib/supabase/queries.ts:95-148; verified live DB table is attendance (attendance_records does not exist in schema cache), enrollments removed (no such table in schema). Manual cleanup grouped into Promise.all, try/catch removed. Confirmed at file edit.

### Task 2 [High — unscoped query runs on every page load]
**File:** `src/lib/supabase/queries.ts`, function `enrichListWithChapters`

[x] Task 2 — confirmed at src/lib/supabase/queries.ts:245-292; unfiltered select('id, title') on course_chapters scoped to courseIds via .in('course_id', idList). Only runs when courseIds is non-empty.

### Task 3 [High — N sequential writes instead of 1]
**File:** `src/lib/supabase/queries.ts`, function `reorderLectures`

[skipped] Task 3 — confirmed at src/lib/supabase/queries.ts:491-497; skipped because lectures table has title TEXT NOT NULL (no default) — partial upsert with only {id, order_index} risks nulling data or failing NOT NULL constraints on non-existing rows. Current Promise.all parallel approach kept as-is.

### Task 4 [Medium — duplicated retry logic in 3+ places]
**File:** `src/lib/supabase/queries.ts`, functions `createLecture`, `createAssignment`, `createQuizWithQuestions`

[x] Task 4 — confirmed at src/lib/supabase/queries.ts:402-449, 519-566, 977-1027 (found duplicate try/catch chapter_id fallback logic in 3 places)

### Task 5 [Medium — unbounded queries]
**File:** `src/lib/supabase/queries.ts`, functions `getAllStudents`, `getMySubmissions`, `getAllSubmissions`

[x] Task 5 — confirmed at src/lib/supabase/queries.ts:69-79 (getAllStudents), 614-631 (getMySubmissions), 702-753 (getAllSubmissions); added optional {limit?, offset?} params with .range() that defaults to unfetched (no change for existing callers).

### Task 6 [Low/Medium — redundant client-side refetching]
**File:** `src/components/chapters/ChapterSelect.tsx` and `src/lib/supabase/queries.ts` function `getCourseChapters`

[x] Task 6 — confirmed at src/components/chapters/ChapterSelect.tsx:22-43 (found useEffect calling getCourseChapters on every mount) and src/lib/supabase/queries.ts:294-322 (getCourseChapters function)

### Task 7 [Documented, not fixed — flag only]
**File:** `src/lib/supabase/queries.ts`, `chaptersMetadataCache`

[ ] Task 7 — confirmed at src/lib/supabase/queries.ts:166 (found module-level Map cache with no expiry)

## Phase 1 Additional Checks

**Task 1 Phase 1 additional checks:** No SQL files found in repo, so cannot confirm ON DELETE CASCADE constraints exist in the live database schema.