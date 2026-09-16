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

## 🎯 Current Focus: Production Upgrade of the Teacher Correction Pad

- **Target Component**: `src/components/grading/HandwrittenAnnotationCanvas.tsx` (and mirror in `lms-platform/`).
- **Target Page**: `src/app/teacher/grading/[submissionId]/page.tsx` (and mirror in `lms-platform/`).
- **Core Goals**:
  1. **Multi-layer Canvas**: Separate background (`bgCanvasRef`), committed annotations (`annotCanvasRef`), and active drawing (`activeCanvasRef` driven by `requestAnimationFrame`) to eliminate React re-render lag on pointer moves.
  2. **High-DPI Retina Scaling**: Multiply canvas buffer by `window.devicePixelRatio` (capped at 2) for crisp rendering.
  3. **Smooth Handwriting**: Midpoint Quadratic Bézier curve interpolation for natural, smooth pen strokes.
  4. **Multi-Page PDF Isolation**: Partition annotations per page (`Record<number, AnnotationStroke[]>`) so strokes on Page 1 do not bleed onto Page 2.
  5. **Pan & Zoom Engine**: Spacebar + drag (Hand tool), smooth zoom presets ("Fit Width", "Fit Page", 100%).
  6. **Power-User Hotkeys**: 1/V (Smart Check), 2/X (Cross), 3/P (Pen), 4/H (Highlighter), 5/E (Eraser), 6/T (Text Note), Space (Pan), Ctrl+Z/Y (Undo/Redo), Ctrl+S (Save).
  7. **Mirror & Build**: Sync changes to `lms-platform/` and run `npm run build`.

---

## 🛠️ Common Commands

- **Root Dev Server**: `npm run dev`
- **Build Verification**: `cd lms-platform && npm run build`
- **Type Check**: `npx tsc --noEmit`
- **Git Status**: `git status`
