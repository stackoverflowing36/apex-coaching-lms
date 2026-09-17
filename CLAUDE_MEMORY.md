# CLAUDE_MEMORY.md — Context Memory, Daily Log & Production Roadmap

> **Purpose**: This memory checkpoint stores the architectural context, bug fixes, schema verifications, completed tasks, and exact implementation plans for **Claude Code**. When starting a new session or resuming work tomorrow, Claude Code reads this file to immediately pick up where it left off with zero context loss.
>
> **Last Updated**: End of Session — September 16, 2026

---

## 1. Core Repository Architecture & Rules

1. **Dual-Directory Structure (STRICT INVARIANT)**:
   - The workspace maintains two identical source trees: `src/` (root) and `lms-platform/src/`.
   - **MANDATORY**: Any change made in `src/` must be mirrored to `lms-platform/src/`.
   - Verification command: Run `npm run build` inside `lms-platform/` (all 20/20 routes must compile with 0 errors).
2. **Tech Stack**:
   - Framework: Next.js 14.2.5 (App Router, dynamic rendering, server/client components).
   - Database / Auth / Storage: Supabase (`@supabase/ssr`, Postgres, Storage bucket `course-materials`).
   - Styling & UI: Tailwind CSS, Radix UI primitives, Lucide React, Sonner (toasts).
3. **Git Branch & Remote**:
   - Active branch: `main`
   - Remote: `https://github.com/stackoverflowing36/apex-coaching-lms.git`
   - Latest commit: `d744575` (*"fix(grading): optimistic submission deletion & query optimizations"*) — clean working tree.

---

## 2. Completed Work & Changelog (Today's Session)

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

### C. Master Prompt & Architecture Design for Correction Pad
- Formulated the comprehensive production roadmap for the teacher correction pad (`HandwrittenAnnotationCanvas.tsx` & `[submissionId]/page.tsx`).

### D. Production-Grade Correction Pad Upgrade (COMPLETED — September 17, 2026)
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
- **API preserved**: `getExportBlob()`, `getStrokesCount()`, `getStrokes()`, `clearSavedDraft()` unchanged.

---

## 3. Tomorrow's Mission: Production-Grade Correction Pad Upgrade

### Target Files:
- `src/components/grading/HandwrittenAnnotationCanvas.tsx` <-> `lms-platform/src/components/grading/HandwrittenAnnotationCanvas.tsx`
- `src/app/teacher/grading/[submissionId]/page.tsx` <-> `lms-platform/src/app/teacher/grading/[submissionId]/page.tsx`

### Diagnosed Defects to Fix:
1. **React State Thrashing**:
   - `handlePointerMove` currently calls `setStrokes(...)` on every mouse/pointer event (60–120+ times/sec).
   - This triggers a React re-render cycle per move, which calls `redrawCanvas()`, clearing and repainting the entire document image and all historical strokes.
   - **Solution**: Multi-layer canvas architecture.
2. **Single-Layer Canvas Bottleneck**:
   - Document image, saved strokes, and the actively drawn stroke are all on one canvas.
   - **Solution**: Three-layer canvas architecture:
     - `bgCanvasRef` (Layer 1): Document background image / PDF page (only updates on doc/page load or pan/zoom).
     - `annotCanvasRef` (Layer 2): Committed annotations (renders finalized strokes; redraws only on undo/redo/page change).
     - `activeCanvasRef` (Layer 3): Active scratchpad canvas driven by `requestAnimationFrame`. Points stored in a mutable ref (`activePointsRef`), **zero React re-renders while dragging**.
3. **High-DPI / Retina Blurring**:
   - Fixed CSS pixel dimensions cause blurriness on Retina / Mac / 4K displays.
   - **Solution**: Scale canvas by `dpr = Math.min(window.devicePixelRatio || 1, 2)`.
4. **Multi-Page PDF Stroke Bleeding**:
   - Currently, a single flat `strokes` array is used across all PDF pages. Annotations on Page 1 appear on Page 2.
   - **Solution**: Per-page stroke map: `pageAnnotations: Record<number, AnnotationStroke[]>`. When switching pages (`pdfPage`), switch active stroke array and isolated undo/redo stacks.
5. **Jagged Polyline Handwriting**:
   - Lines use raw `lineTo()`.
   - **Solution**: Midpoint Quadratic Bézier curve interpolation (`ctx.quadraticCurveTo(p1.x, p1.y, midX, midY)`) with pointer pressure modulation.
6. **Viewport Navigation (Pan & Zoom)**:
   - Current zoom is primitive CSS width/height scaling.
   - **Solution**: Full pan/zoom engine with Spacebar + drag (Hand tool), two-finger drag/pinch on touchscreens, and "Fit Width" / "Fit Page" / "100%" presets.
7. **Storage Quota & Debounced Auto-Save**:
   - Avoid `QuotaExceededError` (5MB) by implementing debounced local storage saving (500ms) with point decimation (skipping redundant points closer than 2px).
8. **Teacher Productivity Shortcuts**:
   - `V` / `1`: Smart Check (✓ / ✗ toggle)
   - `X` / `2`: Red Cross (✗)
   - `P` / `3`: Pen
   - `H` / `4`: Highlighter
   - `E` / `5`: Eraser
   - `T` / `6`: Text Note
   - `Space` (hold): Pan / Hand tool
   - `Ctrl+Z` / `Cmd+Z`: Undo
   - `Ctrl+Y` / `Cmd+Shift+Z`: Redo
   - `[` / `]`: Decrease / Increase brush size
   - `Ctrl+S` / `Cmd+S`: Save annotations

---

## 4. Tomorrow's Resumption Checklist for Claude Code

When starting tomorrow's session, Claude Code should execute the following sequence:

1. **Review & Status Check**:
   - Run `git status` to ensure clean tree.
   - Confirm active branch is `main`.
2. **Implement Multi-Layer Canvas in `HandwrittenAnnotationCanvas.tsx`**:
   - Set up `bgCanvasRef`, `annotCanvasRef`, `activeCanvasRef`.
   - Implement RAF-driven drawing loop with Bézier smoothing.
   - Add High-DPI scaling (`devicePixelRatio`).
   - Implement `pageAnnotations: Record<number, AnnotationStroke[]>`.
   - Add Pan & Zoom engine (Hand tool, Spacebar drag, preset buttons).
   - Add keyboard shortcut listeners.
3. **Verify Integration in `[submissionId]/page.tsx`**:
   - Verify `canvasHandleRef.current.getExportBlob()` composites all layers into a crisp PNG blob.
   - Verify cloud upload via `uploadCheckedCopy` in `src/lib/supabase/queries.ts`.
4. **Mirror to `lms-platform/`**:
   - Copy `src/components/grading/HandwrittenAnnotationCanvas.tsx` -> `lms-platform/src/components/grading/HandwrittenAnnotationCanvas.tsx`.
   - Copy any modified files in `src/app/teacher/grading/...` -> `lms-platform/src/app/teacher/grading/...`.
5. **Build Verification**:
   - Run `cd lms-platform && npm run build` to verify 0 errors across all routes.
6. **Commit & Push**:
   - Stage, commit with conventional commit message, and push to GitHub.
