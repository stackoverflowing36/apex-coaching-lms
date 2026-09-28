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

## 🎨 Design System: CIID (Copenhagen Institute of Interaction Design)

The entire application UI has been upgraded to the **CIID Design System**:
- **Typography**:
  - `font-display` / `font-condensed`: Google Font `Barlow_Condensed` (uppercase titles, tight tracking, editorial hierarchy).
  - `font-sans`: Google Font `Barlow` (clean, high-legibility body copy).
- **Studio Color Palette**:
  - Deep Studio Dark: `#111111` / `#1c1b18` (primary text, dark mode surfaces, capsule chips).
  - Cream Backgrounds: `#fbfbfa` / `#f3f1ec` (editorial page canvases).
  - Earthy Foundation: Rust/Terracotta `#a05120`, Stone `#988a79`, Concrete `#b7b7b5`.
  - Interactive Pastels: Mint `#a8f1e0` (success/active), Rose `#e2bcc2` (alerts/absences), Gold `#ffb956` (warnings/deadlines), Lavender `#b39dff` (announcements/practice).
- **Macrostructure**:
  - Split Studio layouts (`grid-cols-12` split screens).
  - 1px architectural borders (`border-stone-200`).
  - Studio cards (`.studio-card`), pill buttons (`.btn-pill`, `rounded-pill`), rust buttons (`.btn-rust`).
  - Max container width: `max-w-[1360px]`.

---

## 🛠️ Common Commands

- **Root Dev Server**: `npm run dev`
- **Build Verification**: `cd lms-platform && npm run build`
- **Root Build Verification**: `npm run build`
- **Type Check**: `npx tsc --noEmit`
- **Git Status**: `git status`
