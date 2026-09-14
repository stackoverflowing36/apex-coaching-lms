# CLAUDE_MEMORY.md — Optimization Progress & Context Memory

> **Purpose**: This memory checkpoint records the exact work, decisions, and code modifications performed by Claude Code on the `OPTIMIZATION_PLAN.md` tasks. Use this file as a lightweight memory prompt if Claude Code runs out of free context/tokens, allowing it to instantly resume where it left off without re-scanning or wasting tokens.

---

## 1. Execution Status Tracker

| Task | Priority | Target File / Area | Status | Summary of Action |
| :--- | :--- | :--- | :--- | :--- |
| **Task 1** | Critical | `queries.ts` (`deleteCourse`) | **COMPLETED & VERIFIED** | Fixed table names: verified and restored `attendance` (table `attendance_records` does not exist in schema cache), removed nonexistent `enrollments`, parallelized cascading ID fetches and child deletions with `Promise.all`. |
| **Task 2** | High | `queries.ts` (`enrichListWithChapters`) | **COMPLETED & VERIFIED** | Scoped previously unfiltered `course_chapters` query with `.in('course_id', idList)` so chapters are only loaded for active courses instead of loading the entire table. |
| **Task 3** | High | `queries.ts` (`reorderLectures`) | **SKIPPED (Intentional & Safe)** | Skipped because `lectures.title` has a `NOT NULL` constraint without default. Partial upsert with `{id, order_index}` fails constraints. Parallel `Promise.all` kept as-is. |
| **Task 4** | Medium | `queries.ts` (`createLecture`, `createAssignment`, `createQuizWithQuestions`) | **COMPLETED & VERIFIED** | Created reusable helper `insertWithChapterFallback`. Replaced duplicated retry blocks across `createLecture`, `createAssignment`, and `createQuizWithQuestions`. |
| **Task 5** | Medium | `queries.ts` (`getAllStudents`, `getMySubmissions`, `getAllSubmissions`) | **COMPLETED & VERIFIED** | Added optional `{ limit?: number; offset?: number }` parameter with `.range()` pagination support while preserving backwards-compatibility for existing callers. |
| **Task 6** | Low/Medium | `ChapterSelect.tsx` & `getCourseChapters` | **UP NEXT / PENDING** | Prevent redundant client-side refetches on every component mount. |
| **Task 7** | Info Only | `chaptersMetadataCache` | **FLAGGED** | Documented module-level `Map` cache behavior; no code changes required. |

---

## 2. Bug Fixes & Schema Verifications Applied

### 1. `attendance` Table Name in `deleteCourse`
- Verified live Supabase schema: Table `attendance` is the real database table used throughout the application. Table `attendance_records` does not exist.
- Restored `supabase.from('attendance').delete().eq('course_id', courseId)` in `deleteCourse` to prevent runtime crashes.

### 2. Dual-Directory Sync & Build Verification
- Changes from root `src/` were mirrored to `lms-platform/src/`.
- Production build verified with `npm run build` in `lms-platform/`: **20/20 static and dynamic routes compiled with 0 errors**.

---

## 3. Next Step Instructions for Claude Code

When resuming execution, prompt Claude Code with:
```text
Resume optimization plan from Task 6. Read CLAUDE_MEMORY.md and OPTIMIZATION_PLAN.md.
Tasks 1, 2, 3, 4, and 5 are fully implemented, verified, and compiling cleanly.
Proceed to Task 6: optimize ChapterSelect.tsx and getCourseChapters to prevent redundant client-side refetches.
Remember to mirror edits to lms-platform/src/ after finishing.
```
