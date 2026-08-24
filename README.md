# 🎓 Apex Institute LMS — Coaching & Academic Management Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

A modern, full-stack, enterprise-grade **Learning Management System (LMS)** custom-engineered for premier coaching institutes, test-prep academies (JEE, NEET, Foundations), and academic universities. Built with **Next.js 14 App Router**, **Supabase (PostgreSQL, Real-time & Storage Buckets)**, and **Tailwind CSS**.

---

## 🌟 Key Features

### 🎓 Student Portal (`/student`)
* **Academic Vault & Curated Video Lectures**: Stream high-definition recorded lectures, access topic-wise modules, and view embedded lesson resources.
* **Course Study Materials & Formula Books**: Direct download repository for syllabus guides, handwritten notes, and PDF modules.
* **Timed MCQ Practice Quizzes**: Complete batch-specific mock tests with real-time timers, automatic scoring, and comprehensive explanations.
* **Handwritten Assignment Submissions**: Drag-and-drop or camera-capture upload for scanned PDF/image assignments and daily practice problems (DPPs).
* **Digital Checked Copy Viewer**: Review evaluated answer sheets with **Teacher's Handwritten Corrections**, green ticks (✓), red crosses (✗), margin notes, and rubrics.
* **Real-time Attendance Register**: Live attendance percentage KPI, monthly breakdown, and date-wise attendance records.

---

### 👨‍🏫 Faculty / Teacher Portal (`/teacher`)
* **Faculty Command Center**: Real-time stats on pending homework submissions, active quizzes, batch rosters, and today's classroom attendance.
* **Split-Screen Digital Correction Station**:
  * **Left (60%) Interactive Canvas**: Digital Pen, Green Tick Stamp (✓), Red Cross Stamp (✗), Text Notes, and Highlighter with full stylus/touch/pointer support.
  * **Right (40%) Grading Panel**: Numerical score assigning, percentage presets, and rich feedback tags.
  * **1-Click Publish**: Automatically flattens annotations and uploads the checked copy directly to the student portal.
* **Course & Module Builder**: Organize lecture playlists, reorder chapters, and upload downloadable syllabus PDFs.
* **Interactive MCQ Quiz Engine**: Create multi-question tests with custom options, answer keys, time limits, and point weightings.
* **Classroom Attendance Register**: Fast attendance logging with 1-click "Mark All Present", date selection, and status tags (Present, Absent, Late, Excused).
* **Academic Notice Broadcaster**: Real-time announcement publisher supporting institute-wide or batch-specific targets.

---

### 📱 Full Mobile & Touch Screen Optimization
* **Responsive Architecture**: Fluid layouts, responsive navigation bars, and collapsible mobile drawers across all viewports.
* **Stylus & Touch Annotation**: Draw, highlight, and stamp marks directly on phones, iPads, tablets, or touch-screen laptops with pointer capture.
* **Adaptive Viewport**: Auto-scaling zoom controls for inspection on handheld devices.

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router, Server Components, TypeScript) |
| **Styling** | Tailwind CSS, Radix UI Primitives, Lucide Icons |
| **Notifications** | Sonner Toast System |
| **Backend & Database** | Supabase (PostgreSQL with Row Level Security) |
| **Authentication** | Supabase Auth (Google OAuth 2.0 + Email/Password) |
| **Storage Buckets** | Supabase Storage (`assignments`, `checked_copies`, `course_materials`) |
| **Realtime Engine** | Supabase Realtime Channels (PostgreSQL changes) |
| **Deployment** | Vercel (Edge & Serverless) |

---

## 🚀 Quick Start & Local Development

### Prerequisites
* [Node.js](https://nodejs.org/) (v18.17+ or v20+)
* [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/stackoverflowing36/apex-coaching-lms.git
cd apex-coaching-lms

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
```

### Environment Configuration (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://gnoaegjqazibdchorpuo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the portal.

---

## 🌐 Deploying to Vercel

1. Push your code to GitHub.
2. Import the repository into [Vercel](https://vercel.com/new).
3. In **Project Settings** $\rightarrow$ **Environment Variables**, add:
   * `NEXT_PUBLIC_SUPABASE_URL`
   * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy**.

### Supabase Google OAuth Setup (Production)
To allow students and teachers to log in from anywhere:
1. In the **Supabase Dashboard**, navigate to **Authentication** $\rightarrow$ **URL Configuration**.
2. Set **Site URL** to:
   ```
   https://apex-coaching-lms.vercel.app
   ```
3. Add the following to **Redirect URLs**:
   * `https://apex-coaching-lms.vercel.app/**`
   * `http://localhost:3000/**`
4. Save settings.

---

## 📂 Project Structure

```
apex-coaching-lms/
├── src/
│   ├── app/
│   │   ├── (auth)/login & signup    # Authentication pages
│   │   ├── auth/callback            # OAuth redirect handler
│   │   ├── student/                 # Student portal (Vault, Grades, Attendance, Tasks)
│   │   ├── teacher/                 # Teacher portal (Canvas grading, Quizzes, Register)
│   │   ├── layout.tsx               # Root application layout & viewport
│   │   └── page.tsx                 # Public landing page with live academic counters
│   ├── components/
│   │   ├── grading/                 # HandwrittenAnnotationCanvas (Pointer events & stamps)
│   │   ├── layout/                  # Navbar, BackgroundGrid, Hero cards
│   │   └── ui/                      # Radix UI primitives & custom buttons
│   ├── hooks/                       # useAuthUser hook & authentication listeners
│   └── lib/
│       └── supabase/                # Cached singleton clients, queries & storage helpers
├── public/                          # Static assets and icons
└── tailwind.config.ts               # Theme tokens and custom animations
```

---

## 📄 License
This project is licensed under the MIT License — designed for academic coaching institutes and educational institutions worldwide.
