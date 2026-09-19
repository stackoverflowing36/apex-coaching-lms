# CLAUDE_MEMORY.md — Context Memory, Daily Log & Production Roadmap

> **Purpose**: This memory checkpoint stores the architectural context, bug fixes, schema verifications, completed tasks, and exact implementation plans for **Claude Code**. When starting a new session or resuming work tomorrow, Claude Code reads this file to immediately pick up where it left off with zero context loss.
> **Last Updated**: September 19, 2026

---

## 1. Core Repository Architecture & Rules

1. **Dual-Directory Structure (STRICT INVARIANT)**:
   - The workspace maintains two identical source trees: `src/` (root) and `lms-platform/src/`.
   - **MANDATORY**: Any change made in `src/` must be mirrored to `lms-platform/src/`.
   - Verification command: Run `npx tsc --noEmit` and `npm run build` inside `lms-platform/` (all routes must compile with 0 errors).
2. **Tech Stack**:
   - Framework: Next.js 14.2.5 (App Router, dynamic rendering, server/client components).
   - Database / Auth / Storage: Supabase (`@supabase/ssr`, Postgres, Storage bucket `course-materials`).
   - Styling & UI: Tailwind CSS, Radix UI primitives, Lucide React, Sonner (toasts).
3. **Git Branch & Remote**:
   - Active branch: `main`
   - Remote: `https://github.com/stackoverflowing36/apex-coaching-lms.git`
   - Latest commit: `ca42d46` (*"fix(grading): resolve TypeScript errors in HandwrittenAnnotationCanvas"*) — clean working tree.

---

## 2. Completed Work & Changelog

### A. Database Queries & Schema Hardening (`queries.ts`)
- **`deleteCourse`**: Verified live schema: the real database table is `attendance` (table `attendance_records` does not exist). Safely removed nonexistent `enrollments` table deletion. Parallelized child deletion promises with `Promise.all`.
- **`enrichListWithChapters`**: Scoped chapter queries with `.in('course_id', idList)` so chapters are only fetched for active courses instead of scanning the whole table.
- **`reorderLectures`**: Intentionally preserved safe `Promise.all` update pattern; partial upsert skipped because `lectures.title` has a `NOT NULL` constraint without default value.
- **`insertWithChapterFallback`**: Created reusable fallback helper for handling missing or newly added `chapter_id` column without crashing on schema cache mismatch. Applied to `createLecture`, `createAssignment`, `createQuizWithQuestions`, and `uploadCourseMaterial`.
- **Pagination**: Added optional `{ limit?: number; offset?: number }` parameter to `getAllStudents`, `getMySubmissions`, and `getAllSubmissions` using `.range()`.
- **Query Caching**: Implemented a 30-second TTL cache (`chaptersCache`) and concurrent promise deduplication (`chaptersPromiseCache`) in `getCourseChapters`.

### B. Student Submission Deletion (Optimistic UI & RLS Safety)
- **Problem Solved**: When a faculty member clicked "Delete Submission" in `/teacher/grading` or `/teacher/assignments/[assignmentId]`, the submission remained in the list until hard refresh because state wasn't updated optimistically.
- **Fix Applied**:
  - `src/app/teacher/grading/page.tsx`: Added immediate optimistic state filter `setSubmissions((prev) => prev.filter(...))` before awaiting network response.
  - `src/app/teacher/assignments/[assignmentId]/page.tsx`: Added identical optimistic filter.
  - `deleteSubmission` in `queries.ts`: Added `.select('id')` and an explicit check throwing an error if 0 rows were affected (preventing silent RLS failures).
  - All changes mirrored to `lms-platform/`.

### C. Submission Deletion Schema Cache & Fallback Fix (`queries.ts`)
- **Bug Fixed**: `Could not delete submission: Could not find the 'checked_copy_url' column of 'submissions' in the schema cache`
- **Root Cause**: `deleteSubmission` attempted an update on `checked_copy_url`, which does not exist as a separate column on `submissions` (checked copy URL is embedded in `feedback` as `[CHECKED_COPY:<url>]`).
- **Fix Applied**:
  - Cleaned up storage file first if `file_url` exists.
  - Attempted direct hard delete via `.from('submissions').delete().eq('id', submissionId)`.
  - If a foreign key constraint or RLS blocks deletion, safely falls back to soft delete (`status = 'cancelled'`, `marks_obtained = null`, `feedback = null`).
  - Added proper error throwing instead of returning `true` on failure.
  - Handled rollback in `teacher/grading/page.tsx` and `teacher/assignments/[assignmentId]/page.tsx` if delete fails.

### D. Production-Grade Correction Pad Upgrade (COMPLETED)
- **Component**: `src/components/grading/HandwrittenAnnotationCanvas.tsx` (mirrored to `lms-platform/`)
- **Commit**: `066ba58` — "feat(canvas): 3-layer canvas architecture with DPR, Bézier RAF drawing, per-page strokes, pan/zoom, hotkeys"
- **Implemented**:
  1. **3-layer canvas**: `bgCanvasRef` (document image), `annotCanvasRef` (committed strokes), `activeCanvasRef` (RAF scratchpad).
  2. **High-DPI**: Canvas buffers scaled by `dpr = Math.min(window.devicePixelRatio || 1, 2)`.
  3. **Smooth handwriting**: Midpoint quadratic Bézier interpolation via `requestAnimationFrame` with mutable `activePointsRef` — zero React re-renders during drag.
  4. **Multi-page PDF isolation**: `Record<number, AnnotationStroke[]>` with per-page undo/redo stacks.
  5. **Pan & Zoom**: Spacebar + drag panning, wheel zoom (cursor-anchored), Fit Width / Fit Page / 100% presets.
  6. **Hotkeys**: 1/V (Smart Check), 2/X (Cross), 3/P (Pen), 4/H (Highlighter), 5/E (Eraser), 6/T (Text), Ctrl+Z/Y (Undo/Redo), Ctrl+S (Save), [ / ] (brush size).
  7. **Storage**: Debounced 500ms localStorage save with point decimation and 4MB quota guard.
- **Verification**: `npm run build` in `lms-platform/` passed with 0 errors across all 20 routes.

### E. TypeScript Compiler Fixes (`HandwrittenAnnotationCanvas.tsx`)
- **Commit**: `ca42d46` — "fix(grading): resolve TypeScript errors in HandwrittenAnnotationCanvas"
- **Resolved 3 Errors**:
  1. `No overload matches this call` & `'count' is of type 'unknown'` (lines 222-226): Added `parsed as Record<string, AnnotationStroke[]>` to `Object.values()` so `arr` in `.reduce()` is typed as `AnnotationStroke[]`.
  2. `Element implicitly has an 'any' type because index expression is not of type 'number'` (line 431): Cast `out[Number(page)] = ...` since `page` from `Object.entries(data)` is a `string`.
- **Verification**: `npx tsc --noEmit` exits with 0 errors across both `src/` and `lms-platform/src/`.

### F. Faculty Assignment Editing (Due Date & Parameters)
- **Component / Pages**:
  - `src/lib/supabase/queries.ts` (and mirror in `lms-platform/`): Added `updateAssignment(supabase, assignmentId, updates)`.
  - `src/app/teacher/assignments/[assignmentId]/page.tsx` (and mirror in `lms-platform/`): Added "Edit Assignment" button and full modal dialog allowing faculty to edit title, due date, max marks, chapter, instructions, and attachments.
- **Verification**: Mirrored to `lms-platform/`.


---

## 3. Active Mission: Faculty Assignment Editing (Due Date & Parameters)

### Target Files:
- `src/lib/supabase/queries.ts` <-> `lms-platform/src/lib/supabase/queries.ts`
- `src/app/teacher/assignments/[assignmentId]/page.tsx` <-> `lms-platform/src/app/teacher/assignments/[assignmentId]/page.tsx`
- `src/app/teacher/courses/[courseId]/page.tsx` <-> `lms-platform/src/app/teacher/courses/[courseId]/page.tsx`

### Requirements:
1. **Backend Query**:
   - Add `updateAssignment(supabase, assignmentId, updates)` in `queries.ts`.
   - Support updating `title`, `description`, `due_date`, `max_marks`, `chapter_id`.
   - Include schema fallback for `chapter_id` in case `assignments` table does not have the column in the cache (use `recordItemChapterMapping`).
2. **Assignment Details Page (`[assignmentId]/page.tsx`)**:
   - Add an **"Edit Assignment"** button in the header section.
   - Open an Edit Modal/Dialog pre-populated with current values:
     - Title (`Input`)
     - Due Date & Time (`Input type="datetime-local"` or formatted date)
     - Max Marks (`Input type="number"`)
     - Chapter (`Select` dropdown if course has chapters)
     - Description / Instructions (`Textarea`)
     - Attached Resource URL (`Input`, handling `[ATTACHMENT:<url>]` in description)
   - On submit, call `updateAssignment`, show toast notifications, and update state locally.
3. **Course Assignments Tab (`courses/[courseId]/page.tsx`)**:
   - Add an "Edit" action button in the assignments list next to "View Details" and "Delete".
4. **Dual-Directory Parity**:
   - Always copy changes to `lms-platform/`.
   - Run `npx tsc --noEmit` and ensure 0 errors.
