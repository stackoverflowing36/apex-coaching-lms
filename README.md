# Apex Institute LMS — Coaching & Academic Management Platform

A full-stack, enterprise-grade Learning Management System (LMS) custom-engineered for premier coaching institutes and academic academies (JEE, NEET, Foundations, & Advanced batches). Built with **Next.js 14 App Router**, **Supabase (PostgreSQL, Auth & Storage)**, and modern **Tailwind CSS**.

---

## 🌟 Key Features

### 🎓 Student Portal (`/student`)
- **Academic Vault**: Access enrolled batches, syllabus roadmaps, and watch curated video lectures with test previews.
- **Course Study Materials**: Direct download repository for formula books, syllabus PDFs, and faculty notes.
- **Timed MCQ Practice Tests**: Batch-specific quizzes with instant results and point calculations.
- **Scanned Assignment Submissions**: Upload clear camera photos and PDF scans of handwritten derivations and problem sheets.
- **Grades & Correction Review**: View teacher evaluations, feedback remarks, and **Teacher's Checked Copies** with marked ticks (✓), crosses (✗), and corrections.
- **Live Attendance Tracker**: Real-time batch attendance percentage KPI and full date-wise register history.

### 👨‍🏫 Faculty / Teacher Portal (`/teacher`)
- **Faculty Command Center**: Real-time counters for pending submissions, active tests, batch rosters, and today's attendance.
- **Course & Module Builder**: Organize lectures with drag-and-drop order indexing and dropzone syllabus PDF uploader.
- **Split-Screen Digital Correction Station**:
  - **Left (60%)**: Interactive annotation canvas with **Digital Pen**, **Green Tick Stamp (✓)**, **Red Cross Stamp (✗)**, **Typed Remarks**, and **Highlighter**.
  - **Right (40%)**: Numerical grading panel, percentage presets (100%, 90%, 75%, 50%, 0%), and rich feedback tag suggestions.
  - **1-Click Send**: Automatically flattens annotations and uploads the checked copy directly to the student portal.
- **Timed MCQ Authoring Engine**: Create multi-question tests with custom options, answer keys, time limits, and point weightings.
- **Classroom Attendance Register**: 1-click "Mark All Present" batch attendance logger with date selector and absent/late/excused tags.
- **Academic Notice Broadcaster**: Real-time announcement publisher supporting institute-wide or batch-specific targets.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components, TypeScript)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Storage Buckets)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: Radix UI primitives, Lucide Icons, Sonner Toasts
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Deploying to Vercel

### Step 1: Push to GitHub
Import this repository into your Vercel account.

### Step 2: Configure Environment Variables
In your Vercel Project Settings $\rightarrow$ **Environment Variables**, add:

| Key | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Public Anon Key | `eyJhbGciOiJIUzI1NiIsIn...` |

### Step 3: Deploy
Click **Deploy**. Vercel will automatically build and deploy the Next.js application globally on Edge/Serverless.

---

## 💻 Local Development

```bash
# 1. Clone repository
git clone https://github.com/stackoverflowing36/apex-lms.git

# 2. Install dependencies
npm install

# 3. Configure .env.local
cp .env.example .env.local
# (Fill in your Supabase URL & Anon Key)

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 📄 License
MIT License. Built for Coaching Academies & Academic Institutions.
