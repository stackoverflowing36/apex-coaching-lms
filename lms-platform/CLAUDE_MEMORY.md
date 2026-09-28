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

### G. Complete CIID Design System UI Overhaul — COMPLETED
- **Scope**: Re-engineered the complete user interface across Public Landing, Authentication, Student Portal, and Teacher Portal.
- **Design Tokens**:
  - Fonts: `Barlow_Condensed` (headings, badges, uppercase editorial labels), `Barlow` (body).
  - Palette: Deep Studio Dark (`#111111`), Cream (`#fbfbfa` / `#f3f1ec`), Rust (`#a05120`), Mint (`#a8f1e0`), Rose (`#e2bcc2`), Gold (`#ffb956`), Lavender (`#b39dff`), Stone (`#988a79`).
  - Architecture: Split Studio `grid-cols-12`, 1px architectural borders (`border-stone-200`), rounded pill capsule actions (`rounded-pill`), rounded studio cards (`studio-card`, `rounded-studio`).
- **Refactored Files**:
  1. `src/app/layout.tsx` (Google Fonts Barlow & Barlow_Condensed)
  2. `tailwind.config.ts` (CIID colors, font families, radius tokens)
  3. `src/app/globals.css` (CIID utility classes: `.studio-card`, `.btn-pill`, `.btn-rust`, `.btn-dark`, `.btn-studio-outline`)
  4. `src/components/ui/badge.tsx` & `src/components/ui/button.tsx` (CIID variants)
  5. `src/components/layout/Navbar.tsx` & `src/app/page.tsx` (Split Studio landing page & 1px metric ticker)
  6. `src/components/InstituteFeatureGrid.tsx` (Pastel badge feature matrix)
  7. `src/app/login/page.tsx` & `src/app/signup/page.tsx` (Studio auth split panels)
  8. `src/app/student/layout.tsx` & `src/app/teacher/layout.tsx` (Capsule navbar, pill switcher, studio dropdowns)
  9. `src/app/student/dashboard/page.tsx` & `src/app/teacher/dashboard/page.tsx` (Split Studio dashboards, 1px metric grids, feeds)
  10. `src/app/teacher/assignments/[assignmentId]/page.tsx` (Assignment manager, stats, edit modal, submission queue)
  11. `src/app/student/assignments/page.tsx` (Capsule batch pills, search, studio submission cards)
  12. `src/app/student/grades/page.tsx` (KPI overview cards, capsule evaluation tabs, studio grade list)
  13. `src/app/student/lectures/page.tsx` (Vault header, capsule tabs, studio lecture cards)
  14. `src/app/teacher/courses/page.tsx` (Course builder, modal, studio batch cards)
  15. `src/app/teacher/announcements/page.tsx` (Live broadcast console and announcement feed)
  16. `src/app/teacher/quizzes/page.tsx` (MCQ engine header, batch filter pills, studio quiz cards)
  17. `src/app/teacher/attendance/page.tsx` (Register, KPI stat boxes, roster table with pastel status pills)
  18. `src/app/student/quizzes/[quizId]/page.tsx` (Quiz player, question card, results view with pastel scores)
  19. `src/app/teacher/grading/[submissionId]/page.tsx` (Split-screen grading console, canvas header, marks input, verdict pills)
- **Dual-Directory Parity**: Mirrored all changes to `lms-platform/`.
- **Validation**: `npx tsc --noEmit` exits with 0 errors in both root and `lms-platform/`. Next.js `npm run build` succeeds across all 20+ routes with 0 errors.

---

## 3. Active Mission: Production Stability & Cloudflare DNS Configuration

### Target Files:
- Repository root & `lms-platform/`
- Production DNS setup for domain (Eduflow LMS)

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
