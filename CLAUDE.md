# CLAUDE.md — Claude Code Project Guidelines & Active Memory

Welcome back! This file is automatically loaded by **Claude Code** on every session startup.

---

## 🚨 Non-Negotiable Project Invariant: Dual-Directory Architecture

This repository has a dual-directory setup:
- Root source: `src/`
- Platform mirror: `lms-platform/src/`

**Every single change made to `src/` must also be mirrored to `lms-platform/src/`**.
Before finishing any task, run `npm run build` inside `lms-platform/` to verify 0 errors across all 20+ routes.

---

## 🧠 Active State & Memory

Detailed progress, schema verifications, bug fixes from previous sessions, and implementation roadmaps are maintained in **`CLAUDE_MEMORY.md`**.

👉 **Read `CLAUDE_MEMORY.md` at the beginning of your session to see the active task list and detailed implementation specs.**

---

## 🎯 Current Focus: Faculty Assignment Editing (Due Date & Parameters)

- **Target Files**:
  - `src/lib/supabase/queries.ts` (and mirror in `lms-platform/`).
  - `src/app/teacher/assignments/[assignmentId]/page.tsx` (and mirror in `lms-platform/`).
  - `src/app/teacher/courses/[courseId]/page.tsx` (and mirror in `lms-platform/`).
- **Core Goals**:
  1. **`updateAssignment` Query**: Implement in `queries.ts` supporting `title`, `description`, `due_date`, `max_marks`, and `chapter_id` with schema fallback.
  2. **Edit Modal in Assignment Details**: Add "Edit Assignment" button & dialog in `[assignmentId]/page.tsx` pre-filled with existing values.
  3. **Course Assignment List Action**: Add "Edit" button in `courses/[courseId]/page.tsx`.
  4. **Mirror & Build**: Maintain dual-directory parity with `lms-platform/` and ensure `npx tsc --noEmit` passes with 0 errors.

---

## 🛠️ Common Commands

- **Root Dev Server**: `npm run dev`
- **Build Verification**: `cd lms-platform && npm run build`
- **Type Check**: `npx tsc --noEmit`
- **Git Status**: `git status`
