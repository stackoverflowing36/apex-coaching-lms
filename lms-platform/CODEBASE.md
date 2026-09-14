# Apex LMS — Complete Codebase Reference for Claude Code

> **Notice for Claude Code**: This document provides a complete, token-optimized representation of the Apex LMS (Next.js 14 App Router + Supabase) codebase. It includes architecture, database schema, data queries, all application pages, and core custom components.

## Table of Contents
- [1. Architecture & Technical Overview](#1-architecture--technical-overview)
- [2. Database Schema & Supabase Models](#2-database-schema--supabase-models)
- [3. Configuration & Root Infrastructure](#3-configuration--root-infrastructure)
- [4. Supabase Data Layer & Queries](#4-supabase-data-layer--queries)
- [5. Hooks & Utilities](#5-hooks--utilities)
- [6. Domain Components](#6-domain-components)
- [7. UI Components (shadcn/ui) Reference](#7-ui-components-shadcnui-reference)
- [8. Student Portal Routes](#8-student-portal-routes)
- [9. Teacher Portal Routes](#9-teacher-portal-routes)
- [10. Authentication & Root Routes](#10-authentication--root-routes)

---

## 1. Architecture & Technical Overview

### Tech Stack
- **Framework**: Next.js 14 (App Router, Server & Client Components)
- **Language**: TypeScript / React 18
- **Styling**: Tailwind CSS, Lucide React icons, Tailwind Typography
- **Backend / Database**: Supabase (PostgreSQL, Auth with RLS, Storage)
- **Deployment**: Vercel / Node.js
- **Canvas / PDF**: PDF-lib, Lucide React, HTML5 Canvas annotation engine

### Architectural Patterns
1. **Dual-Role Navigation**:
   - `/student/*` layout with student nav (Dashboard, Lectures & Materials, Assignments, Grades, Attendance, Notifications).
   - `/teacher/*` layout with faculty nav (Dashboard, Course/Batch Manager, Quizzes, Grading Suite, Attendance, Announcements, Notifications).
2. **Storage-Backed Metadata Fallback (Chapter System)**:
   - When PostgREST schema cache lacks the `chapter_id` column on dynamic tables, the platform utilizes `course-materials/{courseId}/_chapters_metadata.json` in Supabase Storage as a high-availability fallback.
   - All query loaders (`getLectures`, `getCourseMaterials`, `getQuizzes`, `getAssignments`) run through `enrichListWithChapters` to seamlessly attach `course_chapters: { title: string }`.
3. **Sequential Numbering & Re-Indexing**:
   - Lectures are indexed sequentially (`1, 2, 3...`) inside styled green circle badges.
   - Deleting a lecture triggers an optimistic update and an immediate database re-indexing with `reorderLectures(supabase, updates)` to prevent skipped numbers or gaps.
4. **Homework Annotation Engine**:
   - Digital evaluation canvas allowing faculty to draw annotations, add checkmarks/crosses, write text scores, and export merged evaluation PDFs directly into Supabase Storage.


---

## 2. Database Schema & Supabase Models

```sql
-- Courses (Batches)
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  title TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Course Chapters (Optional table with Storage metadata fallback)
CREATE TABLE course_chapters (
  id TEXT PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lectures
CREATE TABLE lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT,
  notes_url TEXT,
  order_index INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Course Materials (PDFs, formula sheets, notes)
CREATE TABLE course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INT DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Quiz Questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- string[]
  correct_option_index INT NOT NULL,
  marks INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Student Quiz Attempts
CREATE TABLE student_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  score INT NOT NULL,
  total_marks INT NOT NULL,
  answers JSONB,
  attempt_number INT DEFAULT 1,
  completed_at TIMESTAMPTZ DEFAULT now()
);

-- Assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  max_marks INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Submissions
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'submitted' | 'graded' | 'needs_resubmission'
  marks_obtained INT,
  feedback TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ
);

-- Attendance Records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL, -- 'present' | 'absent' | 'late'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  posted_at TIMESTAMPTZ DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_string(),
  user_id TEXT, -- student_id or faculty_id, null for broadcast
  type TEXT NOT NULL, -- 'assignment_submitted' | 'quiz_attempted' | 'grade_posted' | etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```


---

## 3. Configuration & Root Infrastructure

### `package.json`
```json
{
  "name": "eduflow-lms",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-scroll-area": "^1.1.0",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@supabase/ssr": "^0.12.4",
    "@supabase/supabase-js": "^2.112.3",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.1",
    "lucide-react": "^0.424.0",
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "sonner": "^1.5.0",
    "tailwind-merge": "^2.4.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.5.4",
    "eslint": "^8",
    "eslint-config-next": "14.2.5",
    "postcss": "^8",
    "tailwindcss": "^3.4.1",
    "typescript": "^5"
  }
}

```

### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

```

### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          emerald: '#10b981',
          'emerald-dark': '#059669',
          'emerald-light': '#ecfdf5',
          orange: '#ea580c',
          red: '#dc2626',
        },
        // shadcn/ui theme overrides
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      boxShadow: {
        card: '0 8px 30px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 12px 40px rgba(0, 0, 0, 0.12)',
        float: '0 20px 60px rgba(0, 0, 0, 0.1)',
        'float-lg': '0 25px 80px rgba(0, 0, 0, 0.12)',
        glow: '0 0 40px rgba(16, 185, 129, 0.15)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'float-delayed-2': 'float 7s ease-in-out 4s infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in-up-delayed': 'fadeInUp 0.6s ease-out 0.2s forwards',
        'fade-in-up-delayed-2': 'fadeInUp 0.6s ease-out 0.4s forwards',
        'slide-in-right': 'slideInRight 0.5s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;

```

### `src/middleware.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2FlZ2pxYXppYmRjaG9ycHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzM3NTAsImV4cCI6MjEwMzA0OTc1MH0.YJhqRTU_TZAa0l3W8qFxK-_66yYnDbXtOQRDMcLyJmo';

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

```

### `src/app/layout.tsx`
```tsx
import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
  weight: ['700', '800'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'EduFlow — Coaching & Academic Management Portal',
  description:
    'EduFlow LMS makes it easy to manage classes, live and recorded lectures, assignments, digital grading, and assessments.',
  keywords: ['EduFlow', 'LMS', 'Coaching Institute', 'IIT-JEE', 'NEET', 'Lectures', 'Assignments'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen font-sans">
        {children}

        {/* Global toast notifications — floating card style */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '1rem',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
            },
          }}
          richColors
          closeButton
        />
      </body>
    </html>
  );
}

```

### `src/app/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  BookOpen, 
  Video, 
  Calendar, 
  Award, 
  GraduationCap, 
  Bell, 
  Clock, 
  Users,
  Layers,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Navbar } from '@/components/layout/Navbar';
import { BackgroundGrid } from '@/components/layout/BackgroundGrid';
import { HeroWorkflowCards } from '@/components/HeroWorkflowCards';
import { InstituteFeatureGrid } from '@/components/InstituteFeatureGrid';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LiveStats {
  batchesCount: number;
  lecturesCount: number;
  assignmentsCount: number;
  announcements: any[];
}

export default function LandingPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<LiveStats>({
    batchesCount: 0,
    lecturesCount: 0,
    assignmentsCount: 0,
    announcements: [],
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchLiveStats = useCallback(async () => {
    try {
      const [coursesRes, lecturesRes, assignmentsRes, announcementsRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact', head: true }),
        supabase.from('lectures').select('id', { count: 'exact', head: true }),
        supabase.from('assignments').select('id', { count: 'exact', head: true }),
        supabase
          .from('announcements')
          .select('id, title, content, posted_at, courses(code, title)')
          .order('posted_at', { ascending: false })
          .limit(3),
      ]);

      setStats({
        batchesCount: coursesRes.count ?? 0,
        lecturesCount: lecturesRes.count ?? 0,
        assignmentsCount: assignmentsRes.count ?? 0,
        announcements: announcementsRes.data ?? [],
      });
    } catch (err) {
      console.error('Error fetching live portal stats:', err);
    } finally {
      setIsLoaded(true);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLiveStats();

    // Subscribe to real-time changes in all core academic tables
    const channel = supabase
      .channel('landing-realtime-stats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'courses' }, () => {
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lectures' }, () => {
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, () => {
        fetchLiveStats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        fetchLiveStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLiveStats, supabase]);

  // Dynamic hours of recorded archives calculation
  const recordedHoursLabel =
    stats.lecturesCount === 0
      ? '0 Hrs'
      : stats.lecturesCount === 1
      ? '1.5 Hrs'
      : `${Math.round(stats.lecturesCount * 1.5)}+ Hrs`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-emerald-100 selection:text-emerald-900 relative overflow-x-hidden font-sans">
      {/* Subtle Intersecting Grid Background */}
      <BackgroundGrid />

      {/* Centered Floating Pill Navbar */}
      <Navbar />

      {/* ============================================================
          HERO SECTION (Coaching Institute Layout)
          ============================================================ */}
      <section className="relative pt-32 sm:pt-36 lg:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Small Top Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs sm:text-sm font-semibold shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>✦ Institute Academic Portal 2026</span>
            </div>

            {/* Headline with tight tracking and emerald accent */}
            <h1 className="font-heading font-extrabold text-4xl sm:text-6xl lg:text-[68px] tracking-tight leading-[1.08] text-slate-900">
              Master the Syllabus.
              <span className="block text-emerald-600 mt-1">
                Excel in Every Exam.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Access daily live lectures, submitted assignment feedback, batch schedules, and curated study materials in one centralized portal.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Link href="/login?role=student" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full bg-orange-600 hover:bg-orange-700 text-white font-semibold px-8 h-13 text-base shadow-xl shadow-orange-600/25 transition-all group"
                >
                  Enter Student Portal
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link href="/login?role=teacher" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full border-2 border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 font-semibold px-7 h-13 text-base"
                >
                  Faculty Dashboard
                </Button>
              </Link>
            </div>

            {/* Live Real-time Academic Counters */}
            <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-left">
              <div>
                <div className="font-heading font-extrabold text-xl sm:text-2xl text-slate-900">
                  {isLoaded ? `${stats.batchesCount} Active` : '—'}
                </div>
                <div className="text-xs text-slate-500 font-medium">Classroom Batches</div>
              </div>
              <div>
                <div className="font-heading font-extrabold text-xl sm:text-2xl text-emerald-600">
                  {isLoaded ? recordedHoursLabel : '—'}
                </div>
                <div className="text-xs text-slate-500 font-medium">Recorded Archives</div>
              </div>
              <div>
                <div className="font-heading font-extrabold text-xl sm:text-2xl text-orange-600">
                  {isLoaded ? `${stats.assignmentsCount} Active` : '—'}
                </div>
                <div className="text-xs text-slate-500 font-medium">Live DPPs &amp; Tasks</div>
              </div>
            </div>

          </div>

          {/* Hero Right Column: Floating Stacked Coaching Cards */}
          <div className="lg:col-span-5 relative">
            <HeroWorkflowCards />
          </div>

        </div>
      </section>

      {/* ============================================================
          UPCOMING BATCH SCHEDULE & LIVE REAL-TIME NOTICE TICKER
          (Rendered ONLY if live announcements exist, otherwise stays blank)
          ============================================================ */}
      {stats.announcements && stats.announcements.length > 0 && (
        <section id="curriculum" className="py-6 border-y border-slate-200/80 bg-white/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-emerald-600" />
                  Live Academic Notice:
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-slate-700">
                {stats.announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200/60"
                  >
                    <span className="font-bold text-slate-900">
                      {announcement.courses?.code || 'Institute'}:
                    </span>
                    <span className="truncate max-w-[280px] sm:max-w-md">
                      {announcement.title}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/login?role=student" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                Full Schedule <ChevronRight className="h-3.5 w-3.5" />
              </Link>

            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          VISUAL FEATURE SHOWCASE SECTION (No generic SaaS fluff)
          ============================================================ */}
      <InstituteFeatureGrid />

      {/* ============================================================
          STUDENT & FACULTY PORTAL ACCESS BANNER
          ============================================================ */}
      <section id="announcements" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="relative rounded-[2.5rem] bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-8 sm:p-12 text-white overflow-hidden shadow-2xl">
          
          <div className="relative z-10 max-w-2xl space-y-6 text-center sm:text-left">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 rounded-full px-4 py-1 font-semibold text-xs">
              Enrolled Institute Members
            </Badge>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight leading-tight">
              Ready to access your batch lectures and test series?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Login with your institute email to view your personalized classroom feed, submit homework sheets, and track your AIR mock test percentiles.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
              <Link href="/login?role=student" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 h-12 text-sm shadow-lg shadow-orange-600/30"
                >
                  Student Portal Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-full border-slate-700 bg-slate-800/80 text-white hover:bg-slate-700/80 font-medium px-7 h-12 text-sm"
                >
                  Register New Enrolment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          ACADEMIC PORTAL FOOTER
          ============================================================ */}
      <footer className="py-10 border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-heading font-extrabold text-slate-900">EduFlow LMS</span>
            <span className="text-xs text-slate-400 pl-2">© 2026 EduFlow Academic Operations. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login?role=student">
              <Button variant="ghost" size="sm" className="rounded-full text-slate-600 text-xs">
                Student Access
              </Button>
            </Link>
            <Link href="/login?role=teacher">
              <Button variant="ghost" size="sm" className="rounded-full text-slate-600 text-xs">
                Faculty Access
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs px-4">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

```


---

## 4. Supabase Data Layer & Queries

### `src/lib/supabase/client.ts`
```typescript
import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (client) return client;

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2FlZ2pxYXppYmRjaG9ycHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzM3NTAsImV4cCI6MjEwMzA0OTc1MH0.YJhqRTU_TZAa0l3W8qFxK-_66yYnDbXtOQRDMcLyJmo';

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}

```

### `src/lib/supabase/server.ts`
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const DEFAULT_SUPABASE_URL = 'https://gnoaegjqazibdchorpuo.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2FlZ2pxYXppYmRjaG9ycHVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NzM3NTAsImV4cCI6MjEwMzA0OTc1MH0.YJhqRTU_TZAa0l3W8qFxK-_66yYnDbXtOQRDMcLyJmo';

export function createClient() {
  const cookieStore = cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // The `set` method was called from a Server Component.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // The `delete` method was called from a Server Component.
          }
        },
      },
    }
  );
}

```

### `src/lib/supabase/queries.ts`
```typescript
import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// User Queries
// ============================================================

export async function getCurrentUser(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) return profile;

    // If profile not yet created in table (e.g., OAuth direct login), build from metadata
    const newProfile = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      role: user.user_metadata?.role || 'student',
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      batch_name: user.user_metadata?.batch_name || 'General Batch',
    };

    await supabase.from('users').upsert(newProfile);
    return newProfile;
  } catch (err) {
    console.error('Error fetching/creating profile:', err);
    return {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
      role: user.user_metadata?.role || 'student',
      avatar_url: user.user_metadata?.avatar_url || null,
    };
  }
}

export async function getAllStudents(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Course Queries
// ============================================================

export async function getCourses(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCourseById(supabase: SupabaseClient, courseId: string) {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (error) throw error;
  return data;
}

export async function createCourse(
  supabase: SupabaseClient,
  course: { title: string; code: string; description?: string }
) {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCourse(supabase: SupabaseClient, courseId: string): Promise<boolean> {
  try {
    // 1. Delete submissions for all assignments in this course
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('course_id', courseId);

    if (assignments && assignments.length > 0) {
      const assignmentIds = assignments.map((a: any) => a.id);
      await supabase.from('submissions').delete().in('assignment_id', assignmentIds);
    }

    // 2. Delete assignments
    await supabase.from('assignments').delete().eq('course_id', courseId);

    // 3. Delete quizzes and their attempts & questions
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('course_id', courseId);

    if (quizzes && quizzes.length > 0) {
      const quizIds = quizzes.map((q: any) => q.id);
      await supabase.from('quiz_attempts').delete().in('quiz_id', quizIds);
      await supabase.from('quiz_questions').delete().in('quiz_id', quizIds);
    }
    await supabase.from('quizzes').delete().eq('course_id', courseId);

    // 4. Delete lectures
    await supabase.from('lectures').delete().eq('course_id', courseId);

    // 5. Delete course materials
    await supabase.from('course_materials').delete().eq('course_id', courseId);

    // 6. Delete enrollments
    await supabase.from('enrollments').delete().eq('course_id', courseId);

    // 7. Delete attendance
    await supabase.from('attendance').delete().eq('course_id', courseId);

    // 8. Delete announcements
    await supabase.from('announcements').delete().eq('course_id', courseId);

    // 9. Delete course row
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Failed to delete course and associated records:', err);
    throw err;
  }
}

// ============================================================
// Chapter Queries & Resilient Metadata Persistence
// ============================================================

interface ChapterMetaItem {
  id: string;
  course_id: string;
  title: string;
  created_at?: string;
}

interface ChaptersMetadata {
  chapters: ChapterMetaItem[];
  mappings: Record<string, string>; // itemId -> chapterId
}

const chaptersMetadataCache = new Map<string, ChaptersMetadata>();

export async function getStorageChaptersMetadata(supabase: SupabaseClient, courseId: string): Promise<ChaptersMetadata> {
  if (chaptersMetadataCache.has(courseId)) {
    return chaptersMetadataCache.get(courseId)!;
  }
  try {
    const filePath = `${courseId}/_chapters_metadata.json`;
    const { data, error } = await supabase.storage
      .from('course-materials')
      .download(filePath);
    if (!error && data) {
      const text = await data.text();
      const parsed = JSON.parse(text);
      const meta: ChaptersMetadata = {
        chapters: Array.isArray(parsed?.chapters)
          ? parsed.chapters
          : Array.isArray(parsed)
          ? parsed
          : [],
        mappings: parsed?.mappings && typeof parsed.mappings === 'object' ? parsed.mappings : {},
      };
      chaptersMetadataCache.set(courseId, meta);
      return meta;
    }
  } catch (err) {
    // console.warn('Could not read chapters metadata from storage:', err);
  }
  const defaultMeta: ChaptersMetadata = { chapters: [], mappings: {} };
  chaptersMetadataCache.set(courseId, defaultMeta);
  return defaultMeta;
}

export async function saveStorageChaptersMetadata(
  supabase: SupabaseClient,
  courseId: string,
  metadata: ChaptersMetadata
): Promise<void> {
  chaptersMetadataCache.set(courseId, metadata);
  try {
    const filePath = `${courseId}/_chapters_metadata.json`;
    const content = JSON.stringify(metadata, null, 2);
    const blob = typeof Blob !== 'undefined'
      ? new Blob([content], { type: 'application/json' })
      : Buffer.from(content);
    await supabase.storage
      .from('course-materials')
      .upload(filePath, blob, {
        contentType: 'application/json',
        upsert: true,
      });
  } catch (err) {
    console.warn('Could not save chapters metadata to storage:', err);
  }
}

export async function recordItemChapterMapping(
  supabase: SupabaseClient,
  courseId: string,
  itemId: string,
  chapterId: string | null | undefined
) {
  if (!courseId || !itemId || !chapterId) return;
  try {
    const meta = await getStorageChaptersMetadata(supabase, courseId);
    meta.mappings = meta.mappings || {};
    meta.mappings[itemId] = chapterId;
    await saveStorageChaptersMetadata(supabase, courseId, meta);
  } catch (err) {
    console.warn('Failed to record item chapter mapping:', err);
  }
}

export async function enrichListWithChapters(
  supabase: SupabaseClient,
  items: any[],
  courseId?: string
) {
  if (!items || items.length === 0) return items;

  const courseIds = new Set<string>();
  if (courseId) {
    courseIds.add(courseId);
  } else {
    items.forEach((it) => {
      const cId = it.course_id || it.courses?.id;
      if (cId) courseIds.add(cId);
    });
  }

  const chaptersMap = new Map<string, string>(); // chapterId -> chapterTitle
  const mappingsMap = new Map<string, string>(); // itemId -> chapterId

  try {
    const { data } = await supabase.from('course_chapters').select('id, title');
    if (data) {
      data.forEach((c: any) => chaptersMap.set(c.id, c.title));
    }
  } catch {}

  for (const cId of courseIds) {
    try {
      const meta = await getStorageChaptersMetadata(supabase, cId);
      if (meta.chapters) {
        meta.chapters.forEach((c) => chaptersMap.set(c.id, c.title));
      }
      if (meta.mappings) {
        Object.entries(meta.mappings).forEach(([itemId, chId]) => {
          mappingsMap.set(itemId, chId);
        });
      }
    } catch {}
  }

  return items.map((item) => {
    const chapterId = item.chapter_id || mappingsMap.get(item.id) || null;
    const existingTitle = item.course_chapters?.title;
    const resolvedTitle = (chapterId && chaptersMap.has(chapterId) ? chaptersMap.get(chapterId) : null) || existingTitle || null;
    return {
      ...item,
      chapter_id: chapterId,
      course_chapters: resolvedTitle
        ? { title: resolvedTitle }
        : null,
    };
  });
}

export async function getCourseChapters(supabase: SupabaseClient, courseId: string) {
  let dbChapters: any[] = [];
  try {
    const { data, error } = await supabase
      .from('course_chapters')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });
    if (!error && data && data.length > 0) {
      dbChapters = data;
    }
  } catch (e) {
    // ignore
  }

  const meta = await getStorageChaptersMetadata(supabase, courseId);
  const metaChapters = meta.chapters || [];

  const map = new Map<string, any>();
  for (const ch of dbChapters) {
    map.set(ch.id, ch);
  }
  for (const ch of metaChapters) {
    if (!map.has(ch.id)) {
      map.set(ch.id, ch);
    }
  }

  return Array.from(map.values());
}

export async function createCourseChapter(
  supabase: SupabaseClient,
  chapter: { course_id: string; title: string }
) {
  const generatedId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'ch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const chapterObj = {
    id: generatedId,
    course_id: chapter.course_id,
    title: chapter.title.trim(),
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('course_chapters')
      .insert({
        id: chapterObj.id,
        course_id: chapterObj.course_id,
        title: chapterObj.title,
      })
      .select()
      .single();

    if (!error && data) {
      chapterObj.id = data.id;
    }
  } catch (e) {
    // PostgREST schema cache or missing table: fallback to storage
  }

  const meta = await getStorageChaptersMetadata(supabase, chapter.course_id);
  const existingIndex = meta.chapters.findIndex(
    (c) => c.id === chapterObj.id || c.title.toLowerCase() === chapterObj.title.toLowerCase()
  );
  if (existingIndex >= 0) {
    return meta.chapters[existingIndex];
  }

  meta.chapters.push(chapterObj);
  await saveStorageChaptersMetadata(supabase, chapter.course_id, meta);

  return chapterObj;
}

// ============================================================
// Lecture Queries
// ============================================================

export async function getLectures(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('lectures').select('*, courses(title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('order_index', { ascending: true });
  if (error) throw error;
  
  return enrichListWithChapters(supabase, data ?? [], courseId);
}

export async function getLectureById(supabase: SupabaseClient, lectureId: string) {
  const { data, error } = await supabase
    .from('lectures')
    .select('*, courses(title, code)')
    .eq('id', lectureId)
    .single();

  if (error) throw error;
  const enriched = await enrichListWithChapters(supabase, [data], data?.course_id);
  return enriched[0];
}

export async function createLecture(
  supabase: SupabaseClient,
  lecture: {
    course_id: string;
    title: string;
    video_url?: string;
    notes_url?: string;
    order_index?: number;
    chapter_id?: string | null;
  }
) {
  let result: any = null;
  const { data, error } = await supabase
    .from('lectures')
    .insert(lecture)
    .select()
    .single();

  if (error) {
    const isSchemaOrCol =
      error.message?.toLowerCase().includes('chapter_id') ||
      error.message?.toLowerCase().includes('schema cache') ||
      error.code === 'PGRST204';

    if (isSchemaOrCol) {
      console.warn("Retrying lecture insert without chapter_id...");
      const { chapter_id, ...fallbackLecture } = lecture;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('lectures')
        .insert(fallbackLecture)
        .select()
        .single();
      
      if (fallbackError) throw fallbackError;
      result = fallbackData;
    } else {
      throw error;
    }
  } else {
    result = data;
  }

  if (result && lecture.chapter_id) {
    result.chapter_id = lecture.chapter_id;
    await recordItemChapterMapping(supabase, lecture.course_id, result.id, lecture.chapter_id);
  }

  return result;
}

export async function updateLecture(
  supabase: SupabaseClient,
  lectureId: string,
  updates: Partial<{
    title: string;
    video_url: string;
    notes_url: string;
    order_index: number;
  }>
) {
  const { data, error } = await supabase
    .from('lectures')
    .update(updates)
    .eq('id', lectureId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLecture(supabase: SupabaseClient, lectureId: string) {
  const { error } = await supabase.from('lectures').delete().eq('id', lectureId);
  if (error) throw error;
  return true;
}

export async function reorderLectures(
  supabase: SupabaseClient,
  items: { id: string; order_index: number }[]
) {
  const promises = items.map((item) =>
    supabase.from('lectures').update({ order_index: item.order_index }).eq('id', item.id)
  );
  await Promise.all(promises);
  return true;
}

// ============================================================
// Assignment Queries
// ============================================================

export async function getAssignments(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('assignments').select('*, courses(title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('due_date', { ascending: true });
  if (error) throw error;
  
  return enrichListWithChapters(supabase, data ?? [], courseId);
}

export async function getAssignmentById(supabase: SupabaseClient, assignmentId: string) {
  const { data, error } = await supabase
    .from('assignments')
    .select('*, courses(title, code)')
    .eq('id', assignmentId)
    .single();

  if (error) throw error;
  const enriched = await enrichListWithChapters(supabase, [data], data?.course_id);
  return enriched[0];
}

export async function createAssignment(
  supabase: SupabaseClient,
  assignment: {
    course_id: string;
    title: string;
    description: string;
    due_date: string;
    max_marks: number;
    chapter_id?: string | null;
  }
) {
  let result: any = null;
  const { data, error } = await supabase
    .from('assignments')
    .insert(assignment)
    .select()
    .single();

  if (error) {
    const isSchemaOrCol =
      error.message?.toLowerCase().includes('chapter_id') ||
      error.message?.toLowerCase().includes('schema cache') ||
      error.code === 'PGRST204';

    if (isSchemaOrCol) {
      console.warn("Retrying assignment insert without chapter_id...");
      const { chapter_id, ...fallbackAssignment } = assignment;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('assignments')
        .insert(fallbackAssignment)
        .select()
        .single();
      
      if (fallbackError) throw fallbackError;
      result = fallbackData;
    } else {
      throw error;
    }
  } else {
    result = data;
  }

  if (result && assignment.chapter_id) {
    result.chapter_id = assignment.chapter_id;
    await recordItemChapterMapping(supabase, assignment.course_id, result.id, assignment.chapter_id);
  }

  return result;
}

export async function deleteAssignment(supabase: SupabaseClient, assignmentId: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw error;
  return true;
}

// ============================================================
// Submission & Grading Queries
// ============================================================

// Helper to extract checked_copy_url and clean feedback from raw string
export function parseSubmissionFeedback(raw: any) {
  if (!raw) return raw;
  let feedbackText = raw.feedback || '';
  let checkedCopyUrl: string | null = null;

  if (typeof feedbackText === 'string') {
    const match = feedbackText.match(/\[CHECKED_COPY:(https?:\/\/[^\]]+)\]/);
    if (match) {
      checkedCopyUrl = match[1];
      feedbackText = feedbackText.replace(/\[CHECKED_COPY:(https?:\/\/[^\]]+)\]/, '').trim();
    } else if (feedbackText.trim().startsWith('{') && feedbackText.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(feedbackText);
        feedbackText = parsed.text || parsed.feedback || '';
        checkedCopyUrl = parsed.checked_copy_url || null;
      } catch {}
    }
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';

  // Ensure file_url has a fully qualified URL to avoid 404s when clicked
  let resolvedFileUrl = raw.file_url || '';
  if (resolvedFileUrl && !resolvedFileUrl.startsWith('http') && !resolvedFileUrl.startsWith('data:')) {
    resolvedFileUrl = `${supabaseUrl}/storage/v1/object/public/course-materials/${resolvedFileUrl}`;
  }

  // Ensure checked_copy_url has a fully qualified URL
  let resolvedCheckedUrl = checkedCopyUrl || raw.checked_copy_url || raw.checkedCopyUrl || null;
  if (resolvedCheckedUrl && !resolvedCheckedUrl.startsWith('http') && !resolvedCheckedUrl.startsWith('data:')) {
    resolvedCheckedUrl = `${supabaseUrl}/storage/v1/object/public/course-materials/${resolvedCheckedUrl}`;
  }

  return {
    ...raw,
    file_url: resolvedFileUrl || raw.file_url,
    feedback: feedbackText,
    checked_copy_url: resolvedCheckedUrl,
    checkedCopyUrl: resolvedCheckedUrl,
  };
}

export async function getMySubmissions(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*, assignments(id, title, max_marks, due_date, course_id, courses(title, code))')
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  const parsed = (data ?? []).map(parseSubmissionFeedback);

  try {
    const assignmentItems = parsed.map((p: any) => p.assignments).filter(Boolean);
    if (assignmentItems.length > 0) {
      const enrichedAssignments = await enrichListWithChapters(supabase, assignmentItems);
      const map = new Map(enrichedAssignments.map((a: any) => [a.id, a]));
      parsed.forEach((p: any) => {
        if (p.assignments?.id && map.has(p.assignments.id)) {
          p.assignments = map.get(p.assignments.id);
        }
      });
    }
  } catch {}

  return parsed;
}

export async function getSubmissionForAssignment(
  supabase: SupabaseClient,
  assignmentId: string,
  studentId: string
) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (error) throw error;
  return data ? parseSubmissionFeedback(data) : null;
}

export async function createSubmission(
  supabase: SupabaseClient,
  submission: {
    assignment_id: string;
    student_id: string;
    file_url: string;
    file_name: string;
    file_type: string;
  }
) {
  // Check if an existing submission exists (e.g. records with status needs_resubmission)
  const { data: existing } = await supabase
    .from('submissions')
    .select('id, status')
    .eq('assignment_id', submission.assignment_id)
    .eq('student_id', submission.student_id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('submissions')
      .update({
        file_url: submission.file_url,
        file_name: submission.file_name,
        file_type: submission.file_type,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw error;
    return parseSubmissionFeedback(data);
  }

  const { data, error } = await supabase
    .from('submissions')
    .insert(submission)
    .select()
    .single();

  if (error) throw error;
  return parseSubmissionFeedback(data);
}

export async function getAllSubmissions(
  supabase: SupabaseClient,
  filterCourseId?: string,
  filterStatus?: string
) {
  let query = supabase.from('submissions').select(
    `
      id,
      assignment_id,
      student_id,
      file_url,
      file_name,
      file_type,
      marks_obtained,
      feedback,
      status,
      submitted_at,
      assignments:assignment_id (
        id,
        title,
        max_marks,
        due_date,
        courses:course_id (
          id,
          title,
          code
        )
      ),
      users:student_id (
        id,
        full_name,
        email,
        avatar_url
      )
    `
  );

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus);
  }

  const { data, error } = await query.order('submitted_at', { ascending: false });
  if (error) throw error;

  let results = data ?? [];
  if (filterCourseId && filterCourseId !== 'all') {
    results = results.filter((item: any) => item.assignments?.courses?.id === filterCourseId);
  }

  return results.map(parseSubmissionFeedback);
}

export async function getSubmissionById(supabase: SupabaseClient, submissionId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `
        id,
        assignment_id,
        student_id,
        file_url,
        file_name,
        file_type,
        marks_obtained,
        feedback,
        status,
        submitted_at,
        assignments:assignment_id (
          id,
          title,
          description,
          max_marks,
          due_date,
          courses:course_id (
            id,
            title,
            code
          )
        ),
        users:student_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `
    )
    .eq('id', submissionId)
    .single();

  if (error) throw error;
  return parseSubmissionFeedback(data);
}

export async function fetchAssignmentSubmissions(supabase: SupabaseClient, assignmentId: string) {
  const { data, error } = await supabase
    .from('submissions')
    .select(
      `
        id,
        assignment_id,
        student_id,
        file_url,
        file_name,
        file_type,
        marks_obtained,
        feedback,
        status,
        submitted_at,
        users:student_id (
          id,
          full_name,
          email,
          avatar_url
        )
      `
    )
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(parseSubmissionFeedback);
}

export async function uploadCheckedCopy(
  supabase: SupabaseClient,
  submissionId: string,
  blob: Blob,
  studentId?: string,
  assignmentId?: string
) {
  // Determine authenticated teacher/user ID or folder to comply with storage RLS
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id || studentId || 'evaluator';
  const filePath = `${currentUserId}/${assignmentId || 'checked-copies'}/${submissionId}_${Date.now()}.png`;

  try {
    const { data, error } = await supabase.storage
      .from('course-materials')
      .upload(filePath, blob, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.warn('User folder upload failed, attempting fallback path:', error.message);
      const fallbackPath = `checked_${submissionId}_${Date.now()}.png`;
      const { data: fbData, error: fbError } = await supabase.storage
        .from('course-materials')
        .upload(fallbackPath, blob, {
          contentType: 'image/png',
          upsert: true,
        });

      if (fbError) throw fbError;
      const {
        data: { publicUrl },
      } = supabase.storage.from('course-materials').getPublicUrl(fbData.path);
      return publicUrl;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('course-materials').getPublicUrl(data.path);

    return publicUrl;
  } catch (err: any) {
    console.error('All storage upload attempts failed:', err);
    throw err;
  }
}

export async function gradeSubmission(
  supabase: SupabaseClient,
  submissionId: string,
  gradeData: {
    marks_obtained: number | null;
    feedback: string;
    status: string;
    checked_copy_url?: string | null;
  }
) {
  let combinedFeedback = gradeData.feedback || '';
  if (gradeData.checked_copy_url) {
    combinedFeedback = `${combinedFeedback}\n\n[CHECKED_COPY:${gradeData.checked_copy_url}]`.trim();
  }

  const finalStatus = gradeData.status || 'graded';

  const { data, error } = await supabase
    .from('submissions')
    .update({
      marks_obtained: gradeData.marks_obtained,
      feedback: combinedFeedback,
      status: finalStatus,
    })
    .eq('id', submissionId)
    .select();

  if (error) throw error;
  return data && data[0] ? parseSubmissionFeedback(data[0]) : { id: submissionId, ...gradeData };
}

// ============================================================
// Quiz Engine Queries
// ============================================================

export async function getQuizzes(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('quizzes').select(
    `
      *,
      courses:course_id (
        id,
        title,
        code
      ),
      quiz_questions (
        id,
        marks
      )
    `
  );

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  const enriched = await enrichListWithChapters(supabase, data ?? [], courseId);
  return enriched.map((quiz: any) => ({
    ...quiz,
    questions_count: quiz.quiz_questions?.length ?? 0,
    total_marks:
      quiz.quiz_questions?.reduce((sum: number, q: any) => sum + (q.marks ?? 1), 0) ?? 0,
  }));
}

export async function getQuizWithQuestions(supabase: SupabaseClient, quizId: string) {
  const { data, error } = await supabase
    .from('quizzes')
    .select(
      `
        *,
        courses:course_id (
          id,
          title,
          code
        ),
        quiz_questions (
          id,
          question_text,
          options,
          correct_option_index,
          marks
        )
      `
    )
    .eq('id', quizId)
    .single();

  if (error) throw error;
  const enriched = await enrichListWithChapters(supabase, [data], data?.course_id);
  return enriched[0];
}

export async function createQuizWithQuestions(
  supabase: SupabaseClient,
  quiz: {
    course_id: string;
    title: string;
    description?: string;
    time_limit_minutes?: number;
    chapter_id?: string | null;
  },
  questions: {
    question_text: string;
    options: string[];
    correct_option_index: number;
    marks: number;
  }[]
) {
  // 1. Insert Quiz
  const { data: quizData, error: quizError } = await supabase
    .from('quizzes')
    .insert(quiz)
    .select()
    .single();

  let finalQuizData = quizData;

  if (quizError) {
    const isSchemaOrCol =
      quizError.message?.toLowerCase().includes('chapter_id') ||
      quizError.message?.toLowerCase().includes('schema cache') ||
      quizError.code === 'PGRST204';

    if (isSchemaOrCol) {
      console.warn("Retrying quiz insert without chapter_id...");
      const { chapter_id, ...fallbackQuiz } = quiz;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('quizzes')
        .insert(fallbackQuiz)
        .select()
        .single();
      
      if (fallbackError) throw fallbackError;
      finalQuizData = fallbackData;
    } else {
      throw quizError;
    }
  }

  if (finalQuizData && quiz.chapter_id) {
    finalQuizData.chapter_id = quiz.chapter_id;
    await recordItemChapterMapping(supabase, quiz.course_id, finalQuizData.id, quiz.chapter_id);
  }

  // 2. Insert Questions
  if (questions.length > 0 && finalQuizData) {
    const questionsToInsert = questions.map((q) => ({
      quiz_id: finalQuizData.id,
      question_text: q.question_text,
      options: q.options,
      correct_option_index: q.correct_option_index,
      marks: q.marks,
    }));

    const { error: questionsError } = await supabase
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) throw questionsError;
  }

  return finalQuizData;
}

export async function deleteQuiz(supabase: SupabaseClient, quizId: string) {
  const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
  if (error) throw error;
  return true;
}

export interface QuizAttemptRecord {
  id?: string;
  quiz_id: string;
  student_id: string;
  score: number;
  total_marks: number;
  answers: Record<string, number>;
  attempt_number: number;
  completed_at?: string;
  created_at?: string;
}

// Local storage helper for resilient fallback
function getLocalQuizAttempts(quizId: string, studentId: string): QuizAttemptRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`lms_quiz_attempts_${quizId}_${studentId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalQuizAttempt(attempt: QuizAttemptRecord): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = `lms_quiz_attempts_${attempt.quiz_id}_${attempt.student_id}`;
    const existing = getLocalQuizAttempts(attempt.quiz_id, attempt.student_id);
    const exists = existing.some(
      (a) => (a.id && a.id === attempt.id) || a.attempt_number === attempt.attempt_number
    );
    const updated = exists
      ? existing.map((a) =>
          (a.id && a.id === attempt.id) || a.attempt_number === attempt.attempt_number ? attempt : a
        )
      : [...existing, attempt];
    localStorage.setItem(key, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to save local quiz attempt:', err);
    return false;
  }
}

export async function getQuizAttempts(
  supabase: SupabaseClient,
  quizId: string,
  studentId: string
): Promise<QuizAttemptRecord[]> {
  const localAttempts = getLocalQuizAttempts(quizId, studentId);
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', studentId)
      .order('attempt_number', { ascending: true });

    if (error) {
      console.warn('Supabase getQuizAttempts error, returning local attempts:', error.message);
      return localAttempts;
    }

    const dbAttempts = data || [];
    if (localAttempts.length === 0) {
      return dbAttempts;
    }

    // Merge and deduplicate database and local attempts
    const attemptsMap = new Map<string | number, QuizAttemptRecord>();
    dbAttempts.forEach((att) => {
      const key = att.id || att.attempt_number;
      attemptsMap.set(key, att);
    });

    localAttempts.forEach((att) => {
      const key = att.id || att.attempt_number;
      if (!attemptsMap.has(key)) {
        attemptsMap.set(key, att);
      }
    });

    const merged = Array.from(attemptsMap.values());
    merged.sort((a, b) => (a.attempt_number || 0) - (b.attempt_number || 0));
    return merged;
  } catch (err) {
    console.warn('Exception in getQuizAttempts, returning local attempts:', err);
    return localAttempts;
  }
}

export async function getStudentQuizAttempts(
  supabase: SupabaseClient,
  studentId: string
): Promise<QuizAttemptRecord[]> {
  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.warn('Supabase getStudentQuizAttempts error:', error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function submitQuizAttempt(
  supabase: SupabaseClient,
  payload: {
    quiz_id: string;
    student_id: string;
    score: number;
    total_marks: number;
    answers: Record<string, number>;
    allow_reattempt?: boolean;
  }
): Promise<{
  attempt: QuizAttemptRecord;
  officialScore: number;
  firstAttemptScore: number;
  isFirstAttempt: boolean;
}> {
  const { quiz_id, student_id, score, total_marks, answers } = payload;

  // 1. Fetch prior attempts to determine attempt order
  const existingAttempts = await getQuizAttempts(supabase, quiz_id, student_id);
  const isFirstAttempt = existingAttempts.length === 0;
  const nextAttemptNumber = isFirstAttempt ? 1 : existingAttempts.length + 1;

  // Rule: Save the score of the 1st attempt for multiple attempts option selected!
  // The first attempt's score is the permanent official score.
  const firstAttemptScore = isFirstAttempt ? score : existingAttempts[0].score;
  const officialScore = firstAttemptScore;

  const newAttempt: QuizAttemptRecord = {
    quiz_id,
    student_id,
    score,
    total_marks,
    answers,
    attempt_number: nextAttemptNumber,
    completed_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert(newAttempt)
      .select()
      .single();

    if (error) {
      console.warn('Supabase quiz_attempts insert failed, attempting local storage fallback:', error.message);
      const savedLocally = saveLocalQuizAttempt(newAttempt);
      if (!savedLocally) {
        throw new Error(
          `Failed to persist quiz attempt: database error (${error.message}) and local storage failed.`
        );
      }
      return {
        attempt: newAttempt,
        officialScore,
        firstAttemptScore,
        isFirstAttempt,
      };
    }

    saveLocalQuizAttempt(data);
    return {
      attempt: data,
      officialScore,
      firstAttemptScore,
      isFirstAttempt,
    };
  } catch (err: any) {
    console.warn('Network / DB exception in submitQuizAttempt, attempting local storage fallback:', err);
    const savedLocally = saveLocalQuizAttempt(newAttempt);
    if (!savedLocally) {
      throw new Error(
        `Failed to persist quiz attempt: ${err?.message || 'persistence failed on both database and local storage'}`
      );
    }
    return {
      attempt: newAttempt,
      officialScore,
      firstAttemptScore,
      isFirstAttempt,
    };
  }
}

// ============================================================
// Course Materials Queries
// ============================================================

export async function getCourseMaterials(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('course_materials').select('*, courses(id, title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('uploaded_at', { ascending: false });
  if (error) throw error;
  
  return enrichListWithChapters(supabase, data ?? [], courseId);
}

export async function uploadCourseMaterial(
  supabase: SupabaseClient,
  courseId: string,
  file: File,
  title: string,
  chapterId?: string | null
) {
  const sanitizedFileName = (file.name || 'document').replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${courseId}/${Date.now()}_${sanitizedFileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(uploadData.path);

  const fileType = file.type || file.name.split('.').pop() || 'unknown';

  let materialData: any = null;
  const insertPayload: any = {
    course_id: courseId,
    title: title.trim() || file.name,
    file_url: publicUrl,
    file_type: fileType,
  };
  if (chapterId) {
    insertPayload.chapter_id = chapterId;
  }

  const { data, error: insertError } = await supabase
    .from('course_materials')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    const isSchemaOrCol =
      insertError.message?.toLowerCase().includes('chapter_id') ||
      insertError.message?.toLowerCase().includes('schema cache') ||
      insertError.code === 'PGRST204';

    if (isSchemaOrCol) {
      console.warn("Retrying course_materials insert without chapter_id...");
      delete insertPayload.chapter_id;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('course_materials')
        .insert(insertPayload)
        .select()
        .single();

      if (fallbackError) throw fallbackError;
      materialData = fallbackData;
    } else {
      throw insertError;
    }
  } else {
    materialData = data;
  }

  if (materialData && chapterId) {
    materialData.chapter_id = chapterId;
    await recordItemChapterMapping(supabase, courseId, materialData.id, chapterId);
  }

  return materialData;
}

export async function deleteCourseMaterial(
  supabase: SupabaseClient,
  materialId: string,
  filePath?: string
) {
  if (filePath) {
    await supabase.storage.from('course-materials').remove([filePath]);
  }
  const { error } = await supabase.from('course_materials').delete().eq('id', materialId);
  if (error) throw error;
  return true;
}

// ============================================================
// Attendance Queries
// ============================================================

export async function getAttendanceByDate(
  supabase: SupabaseClient,
  courseId: string,
  date: string
) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, users(id, full_name, email, avatar_url)')
    .eq('course_id', courseId)
    .eq('date', date);

  if (error) throw error;
  return data ?? [];
}

export async function saveAttendanceBatch(
  supabase: SupabaseClient,
  records: {
    course_id: string;
    student_id: string;
    date: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    remarks?: string;
  }[]
) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, {
      onConflict: 'course_id,student_id,date',
    })
    .select();

  if (error) throw error;
  return data;
}

export async function getStudentAttendanceSummary(
  supabase: SupabaseClient,
  studentId: string
) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, courses(title, code)')
    .eq('student_id', studentId)
    .order('date', { ascending: false });

  if (error) throw error;

  const records = data ?? [];
  const total = records.length;
  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const lateCount = records.filter((r) => r.status === 'late').length;
  const percentage = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 100;

  return {
    records,
    total,
    presentCount,
    absentCount,
    lateCount,
    percentage,
  };
}

export async function getAttendanceOverview(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('attendance')
    .select('id, status, date, course_id')
    .eq('date', today);

  if (error) throw error;
  return data ?? [];
}

// ============================================================
// Announcement Queries
// ============================================================

export async function getAnnouncements(supabase: SupabaseClient, courseId?: string) {
  let query = supabase.from('announcements').select('*, courses(title, code)');

  if (courseId) {
    query = query.eq('course_id', courseId);
  }

  const { data, error } = await query.order('posted_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAnnouncement(
  supabase: SupabaseClient,
  announcement: {
    course_id?: string | null;
    title: string;
    content: string;
  }
) {
  const payload = {
    course_id: announcement.course_id ? announcement.course_id : null,
    title: announcement.title,
    content: announcement.content,
  };

  const { data, error } = await supabase
    .from('announcements')
    .insert(payload)
    .select('*, courses(title, code)')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAnnouncement(supabase: SupabaseClient, id: string) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// ============================================================
// File Upload Helper (Student Submissions)
// ============================================================

export async function uploadSubmissionFile(
  supabase: SupabaseClient,
  studentId: string,
  assignmentId: string,
  file: File
) {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${studentId}/${assignmentId}/${Date.now()}_${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}

// ============================================================
// Teacher Dashboard Stats
// ============================================================

export async function getTeacherDashboardStats(supabase: SupabaseClient) {
  const today = new Date().toISOString().split('T')[0];

  const [
    coursesRes,
    quizzesRes,
    materialsRes,
    submissionsRes,
    pendingSubmissionsRes,
    todayAttendanceRes,
  ] = await Promise.all([
    supabase.from('courses').select('id', { count: 'exact', head: true }),
    supabase.from('quizzes').select('id', { count: 'exact', head: true }),
    supabase.from('course_materials').select('id', { count: 'exact', head: true }),
    supabase.from('submissions').select('id', { count: 'exact', head: true }),
    supabase
      .from('submissions')
      .select('id', { count: 'exact', head: true })
      .or('status.eq.submitted,status.eq.pending,status.is.null'),
    supabase
      .from('attendance')
      .select('id', { count: 'exact', head: true })
      .eq('date', today),
  ]);

  return {
    totalCourses: coursesRes.count ?? 0,
    totalQuizzes: quizzesRes.count ?? 0,
    totalMaterials: materialsRes.count ?? 0,
    totalSubmissions: submissionsRes.count ?? 0,
    pendingToGrade: pendingSubmissionsRes.count ?? 0,
    todayAttendanceCount: todayAttendanceRes.count ?? 0,
  };
}

// ============================================================
// Student Dashboard Stats
// ============================================================

export async function getDashboardStats(supabase: SupabaseClient, studentId: string) {
  const [lecturesRes, assignmentsRes, submissionsRes, materialsRes] = await Promise.all([
    supabase.from('lectures').select('id', { count: 'exact' }),
    supabase.from('assignments').select('id', { count: 'exact' }),
    supabase
      .from('submissions')
      .select('marks_obtained, status, assignments(max_marks)')
      .eq('student_id', studentId),
    supabase.from('course_materials').select('id', { count: 'exact' }),
  ]);

  const totalLectures = lecturesRes.count ?? 0;
  const totalAssignments = assignmentsRes.count ?? 0;
  const totalMaterials = materialsRes.count ?? 0;
  const submissions = submissionsRes.data ?? [];
  const submittedCount = submissions.length;
  const pendingAssignments = totalAssignments - submittedCount;

  const gradedSubmissions = submissions.filter(
    (s) => s.status === 'graded' && s.marks_obtained !== null
  );
  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce((sum, s) => sum + (s.marks_obtained ?? 0), 0) /
            gradedSubmissions.length
        )
      : 0;

  return {
    totalLectures,
    totalAssignments,
    totalMaterials,
    pendingAssignments: Math.max(0, pendingAssignments),
    submittedCount,
    averageScore,
    gradedCount: gradedSubmissions.length,
  };
}

// ============================================================
// Notification Queries (Faculty alerts for signups & batch joins)
// ============================================================

export interface NotificationItem {
  id: string;
  user_id?: string | null;
  type: 'student_signup' | 'batch_enrolled' | 'submission_created' | string;
  title: string;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

export async function getNotifications(supabase: SupabaseClient, limit = 20): Promise<NotificationItem[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Could not fetch notifications:', error.message);
      return [];
    }
    return (data ?? []) as NotificationItem[];
  } catch (err) {
    console.warn('Notification fetch error:', err);
    return [];
  }
}

export async function createNotification(
  supabase: SupabaseClient,
  notification: {
    type: string;
    title: string;
    message: string;
    data?: any;
    user_id?: string | null;
  }
): Promise<NotificationItem | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        ...notification,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn('Failed to insert notification:', error.message);
      return null;
    }
    return data as NotificationItem;
  } catch (err) {
    console.warn('Notification insert error:', err);
    return null;
  }
}

export async function markNotificationsAsRead(supabase: SupabaseClient, ids?: string[]) {
  try {
    let query = supabase.from('notifications').update({ is_read: true });
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    } else {
      query = query.eq('is_read', false);
    }
    const { error } = await query;
    if (error) console.warn('Failed to mark notifications as read:', error.message);
    return true;
  } catch {
    return false;
  }
}

export async function deleteNotification(supabase: SupabaseClient, id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Failed to delete notification:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error deleting notification:', err);
    return false;
  }
}

export async function getStudentNotifications(
  supabase: SupabaseClient,
  studentId?: string,
  limit = 25
): Promise<NotificationItem[]> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (studentId) {
      query = query.or(`user_id.eq.${studentId},user_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Could not fetch student notifications:', error.message);
      return [];
    }
    return (data ?? []) as NotificationItem[];
  } catch (err) {
    console.warn('Student notification fetch error:', err);
    return [];
  }
}

export async function deleteSubmission(
  supabase: SupabaseClient,
  submissionId: string,
  fileUrl?: string
): Promise<boolean> {
  // If file exists in storage, attempt cleanup
  if (fileUrl && !fileUrl.startsWith('data:')) {
    try {
      let pathToRemove = fileUrl;
      if (fileUrl.includes('course-materials/')) {
        pathToRemove = fileUrl.split('course-materials/')[1];
      }
      if (pathToRemove && !pathToRemove.startsWith('http')) {
        await supabase.storage.from('course-materials').remove([pathToRemove]);
      }
    } catch (sErr) {
      console.warn('Storage file cleanup failed during submission delete:', sErr);
    }
  }

  const { error } = await supabase
    .from('submissions')
    .delete()
    .eq('id', submissionId);

  if (error) throw error;
  return true;
}

export async function uploadLectureVideo(
  supabase: SupabaseClient,
  courseId: string,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${courseId}/lectures/${Date.now()}_${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}

export async function uploadQuizAttachment(
  supabase: SupabaseClient,
  file: File
): Promise<{ path: string; publicUrl: string }> {
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `quiz-attachments/${Date.now()}_${sanitizedFileName}`;

  const { data, error } = await supabase.storage
    .from('course-materials')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from('course-materials').getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}



```

### `src/lib/types.ts`
```typescript
// ============================================================
// LMS Core Types
// ============================================================

export type UserRole = 'student' | 'teacher' | 'admin';
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';
export type LessonType = 'video' | 'reading' | 'quiz';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  bio?: string;
  enrolledCourseIds?: string[];
  createdCourseIds?: string[];
  joinedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  instructor: string;
  instructorId: string;
  instructorAvatar: string;
  thumbnail: string;
  category: string;
  tags: string[];
  enrolledCount: number;
  moduleCount: number;
  duration: string;
  level: CourseLevel;
  progress?: number;
  rating?: number;
  reviewCount?: number;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  duration: string;
  content?: string;
  videoUrl?: string;
  completed?: boolean;
  order: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  status: AssignmentStatus;
  score?: number;
  feedback?: string;
  submittedAt?: string;
  attachments?: string[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  submittedAt: string;
  fileUrl?: string;
  fileName?: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'needs_resubmission' | 'pending';
  checkedCopyUrl?: string | null;
  checked_copy_url?: string | null;
}

export interface Announcement {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  priority: AnnouncementPriority;
}

export interface DashboardStats {
  totalCourses: number;
  completedLessons: number;
  pendingAssignments: number;
  averageScore: number;
}

export interface TeacherDashboardStats {
  totalCourses: number;
  totalStudents: number;
  pendingGrading: number;
  averageRating: number;
}

// Navigation
export interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

// Toast action simulation
export interface ToastAction {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}

```

### `src/lib/utils.ts`
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx for conditional class composition.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string into a human-readable format.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string into a relative time (e.g., "2 days ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/**
 * Get initials from a full name.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text to a given length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Generate a placeholder gradient for course thumbnails.
 */
export function getCourseGradient(index: number): string {
  const gradients = [
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-orange-400 to-red-500',
    'from-cyan-400 to-blue-500',
  ];
  return gradients[index % gradients.length];
}

/**
 * Get status color classes for assignment status badges.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    graded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return colors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

/**
 * Get priority color classes for announcement priority badges.
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    normal: 'bg-slate-100 text-slate-600',
    important: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
  };
  return colors[priority] || 'bg-slate-100 text-slate-600';
}

```


---

## 5. Hooks & Utilities

### `src/hooks/useAuthUser.ts`
```typescript
'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/queries';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  batch_name?: string | null;
}

export function useAuthUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const profile = await getCurrentUser(supabase);
        if (mounted) {
          setUser(profile);
        }
      } catch (err) {
        console.error('Failed to fetch auth user:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      if (session?.user) {
        const profile = await getCurrentUser(supabase);
        if (mounted) setUser(profile);
      } else {
        if (mounted) setUser(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return { user, loading };
}

```

### `src/hooks/useToastAction.ts`
```typescript
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

/**
 * Hook to simulate CRUD operations with toast notifications.
 * Wraps any action with a loading delay and success/error toasts
 * styled as floating cards.
 */
export function useToastAction() {
  const execute = useCallback(
    async ({
      action,
      loadingMessage,
      successMessage,
      errorMessage,
      delay = 800,
    }: {
      action?: () => void | Promise<void>;
      loadingMessage?: string;
      successMessage: string;
      errorMessage?: string;
      delay?: number;
    }) => {
      const toastId = loadingMessage
        ? toast.loading(loadingMessage, {
            description: 'Please wait...',
          })
        : undefined;

      try {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, delay));

        if (action) {
          await action();
        }

        if (toastId) {
          toast.success(successMessage, {
            id: toastId,
            description: 'Changes saved successfully.',
          });
        } else {
          toast.success(successMessage, {
            description: 'Changes saved successfully.',
          });
        }
      } catch {
        const msg = errorMessage || 'Something went wrong. Please try again.';
        if (toastId) {
          toast.error(msg, { id: toastId });
        } else {
          toast.error(msg);
        }
      }
    },
    []
  );

  return { execute };
}

```


---

## 6. Domain Components

### `src/components/chapters/ChapterSelect.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getCourseChapters, createCourseChapter } from '@/lib/supabase/queries';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Chapter {
  id: string;
  title: string;
}

interface ChapterSelectProps {
  supabase: SupabaseClient;
  courseId: string;
  value: string | null;
  onChange: (chapterId: string | null) => void;
  className?: string;
}

export function ChapterSelect({ supabase, courseId, value, onChange, className = '' }: ChapterSelectProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadChapters() {
      if (!courseId) return;
      setIsLoading(true);
      try {
        const data = await getCourseChapters(supabase, courseId);
        setChapters(data || []);
      } catch (err) {
        console.error('Error loading chapters:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadChapters();
  }, [supabase, courseId]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'create_new') {
      setIsCreating(true);
    } else {
      onChange(val === 'none' ? null : val);
    }
  };

  const handleCreateSubmit = async () => {
    if (!newChapterTitle.trim()) {
      setIsCreating(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const newChapter = await createCourseChapter(supabase, {
        course_id: courseId,
        title: newChapterTitle.trim(),
      });
      setChapters((prev) => {
        if (prev.some((c) => c.id === newChapter.id)) return prev;
        return [...prev, newChapter];
      });
      onChange(newChapter.id);
      setIsCreating(false);
      setNewChapterTitle('');
      toast.success(`Chapter "${newChapter.title}" added!`);
    } catch (err: any) {
      console.error('Error creating chapter:', err);
      toast.error('Could not create chapter', { description: err?.message || 'Please try again' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse h-10 sm:h-11 bg-slate-100 rounded-xl border border-slate-200 ${className}`} />
    );
  }

  if (isCreating) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          type="text"
          value={newChapterTitle}
          onChange={(e) => setNewChapterTitle(e.target.value)}
          placeholder="New Chapter Title..."
          className="flex-1 w-full rounded-xl border-slate-200 text-base sm:text-xs focus:ring-orange-600 focus:border-orange-600 h-10 sm:h-11 px-3 bg-white"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateSubmit();
            } else if (e.key === 'Escape') {
              setIsCreating(false);
              setNewChapterTitle('');
            }
          }}
        />
        <button
          type="button"
          onClick={handleCreateSubmit}
          disabled={isSubmitting || !newChapterTitle.trim()}
          className="h-10 sm:h-11 px-4 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 shadow-sm"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCreating(false);
            setNewChapterTitle('');
          }}
          className="h-10 sm:h-11 px-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={value || 'none'}
        onChange={handleSelectChange}
        className="flex-1 w-full rounded-xl border-slate-200 text-base sm:text-xs focus:ring-orange-600 focus:border-orange-600 h-10 sm:h-11 px-3 bg-white"
      >
        <option value="none">No Chapter (General)</option>
        {chapters.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.title}
          </option>
        ))}
        <option value="create_new" className="font-bold text-orange-600">
          + Create New Chapter...
        </option>
      </select>
      <button
        type="button"
        onClick={() => setIsCreating(true)}
        title="Add Chapter / Module"
        className="h-10 sm:h-11 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
      >
        <PlusCircle className="h-3.5 w-3.5 text-orange-600" />
        <span className="inline">+ Chapter</span>
      </button>
    </div>
  );
}

```

### `src/components/notifications/StudentNotificationBell.tsx`
```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  GraduationCap,
  FileCheck,
  Layers,
  Sparkles,
  Clock,
  ExternalLink,
  Trash2,
  BookOpen,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getStudentNotifications,
  markNotificationsAsRead,
  deleteNotification,
  type NotificationItem,
} from '@/lib/supabase/queries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

interface StudentNotificationBellProps {
  studentId?: string;
}

export function StudentNotificationBell({ studentId }: StudentNotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedStudentId, setResolvedStudentId] = useState<string | undefined>(studentId);
  const supabase = React.useMemo(() => createClient(), []);

  // Resolve student id if not passed directly
  useEffect(() => {
    if (studentId) {
      setResolvedStudentId(studentId);
      return;
    }
    async function getSessionUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setResolvedStudentId(session.user.id);
        }
      } catch (err) {
        console.warn('Could not resolve student user id for notifications:', err);
      }
    }
    getSessionUser();
  }, [studentId, supabase]);

  const fetchLatest = useCallback(async () => {
    try {
      const items = await getStudentNotifications(supabase, resolvedStudentId, 25);
      setNotifications(items);
    } catch (err) {
      console.warn('Error fetching student notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, resolvedStudentId]);

  useEffect(() => {
    fetchLatest();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('student-notifications-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const newNotif = payload.new as NotificationItem;
          // Show if targeted to this student or broadcast (user_id is null)
          if (!newNotif.user_id || newNotif.user_id === resolvedStudentId) {
            setNotifications((prev) => [newNotif, ...prev]);

            toast.info(newNotif.title, {
              description: newNotif.message,
              icon: '🔔',
              duration: 6000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLatest, resolvedStudentId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markNotificationsAsRead(supabase);
    toast.success('All notifications marked as read');
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(supabase, id);
    toast.success('Notification removed');
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      await markNotificationsAsRead(supabase, [item.id]);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'grading_completed':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
            <FileCheck className="h-4 w-4" />
          </div>
        );
      case 'assignment_created':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="h-4 w-4" />
          </div>
        );
      case 'batch_enrolled':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
        );
      case 'quiz_created':
      case 'quiz_attempted':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
        );
      case 'lecture_created':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
            <Video className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
          aria-label="Student Notifications"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600 text-white text-[9px] font-extrabold items-center justify-center shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 rounded-2xl p-0 shadow-2xl border-slate-200/90 overflow-hidden bg-white z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-sm text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Updates regarding your assignments, lectures, and grades will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              let targetHref: string | null = null;
              if (item.type === 'grading_completed' || item.type === 'assignment_created') {
                targetHref = '/student/assignments';
              } else if (item.type === 'quiz_created' || item.type === 'quiz_attempted') {
                targetHref = '/student/quizzes';
              } else if (item.type === 'lecture_created') {
                targetHref = '/student/lectures';
              } else if (item.type === 'batch_enrolled') {
                targetHref = '/student/courses';
              }

              const content = (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer text-left hover:bg-slate-50/80 ${
                    !item.is_read ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  {getItemIcon(item.type)}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !item.is_read
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <button
                      type="button"
                      title="Delete notification"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteNotification(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );

              return targetHref ? (
                <Link
                  key={item.id}
                  href={targetHref}
                  onClick={() => {
                    handleItemClick(item);
                    setIsOpen(false);
                  }}
                  className="block"
                >
                  {content}
                </Link>
              ) : (
                content
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time channel active</span>
          </div>
          <Link
            href="/student/assignments"
            onClick={() => setIsOpen(false)}
            className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>My Assignments</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

```

### `src/components/notifications/FacultyNotificationBell.tsx`
```tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  GraduationCap,
  FileCheck,
  Layers,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getNotifications,
  markNotificationsAsRead,
  deleteNotification,
  type NotificationItem,
} from '@/lib/supabase/queries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export function FacultyNotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const supabase = React.useMemo(() => createClient(), []);

  const fetchLatest = useCallback(async () => {
    try {
      const items = await getNotifications(supabase, 20);
      setNotifications(items);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchLatest();

    // Subscribe to real-time notification inserts
    const channel = supabase
      .channel('faculty-notifications-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const newNotif = payload.new as NotificationItem;
          setNotifications((prev) => [newNotif, ...prev]);

          // Show realtime sonner toast alert to faculty
          toast.info(newNotif.title, {
            description: newNotif.message,
            icon: '🔔',
            duration: 6000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLatest]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markNotificationsAsRead(supabase);
    toast.success('All notifications marked as read');
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(supabase, id);
    toast.success('Notification removed');
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      await markNotificationsAsRead(supabase, [item.id]);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'student_signup':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <GraduationCap className="h-4 w-4" />
          </div>
        );
      case 'batch_enrolled':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4" />
          </div>
        );
      case 'submission_created':
      case 'assignment_created':
        return (
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
            <FileCheck className="h-4 w-4" />
          </div>
        );
      case 'grading_completed':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <FileCheck className="h-4 w-4" />
          </div>
        );
      case 'quiz_created':
      case 'quiz_attempted':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Bell className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
          aria-label="Faculty Notifications"
          title="Notifications"
          onClick={() => setHasInteracted(true)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-orange-600 text-white text-[9px] font-extrabold items-center justify-center shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 rounded-2xl p-0 shadow-2xl border-slate-200/90 overflow-hidden bg-white z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-orange-50/40 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-sm text-slate-900">Faculty Alerts</span>
            {unreadCount > 0 && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No alerts yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                You will be notified here when students register or submit work.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              let targetHref = null;
              if (item.type === 'submission_created' && item.data?.submission_id) {
                targetHref = `/teacher/grading/${item.data.submission_id}`;
              } else if (item.type === 'assignment_created' && item.data?.assignment_id) {
                targetHref = `/teacher/assignments/${item.data.assignment_id}`;
              } else if (item.type === 'grading_completed' && item.data?.submission_id) {
                targetHref = `/teacher/grading/${item.data.submission_id}`;
              } else if (item.type === 'quiz_created' || item.type === 'quiz_attempted') {
                targetHref = '/teacher/quizzes';
              } else if (item.type === 'student_signup' || item.type === 'batch_enrolled') {
                targetHref = '/teacher/attendance';
              }

              const content = (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer text-left hover:bg-slate-50/80 ${
                    !item.is_read ? 'bg-orange-50/30' : ''
                  }`}
                >
                  {getItemIcon(item.type)}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !item.is_read
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                    )}
                    <button
                      type="button"
                      title="Delete notification"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteNotification(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );

              return targetHref ? (
                <Link
                  key={item.id}
                  href={targetHref}
                  onClick={() => {
                    handleItemClick(item);
                    setIsOpen(false);
                  }}
                  className="block"
                >
                  {content}
                </Link>
              ) : (
                content
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time channel active</span>
          </div>
          <Link
            href="/teacher/grading"
            onClick={() => setIsOpen(false)}
            className="font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Grading Station</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

```

### `src/components/quiz/FormattedQuestionText.tsx`
```tsx
'use client';

import React, { useState } from 'react';
import { ExternalLink, ZoomIn, X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface FormattedQuestionTextProps {
  text: string;
  className?: string;
  textClassName?: string;
}

interface ParsedQuestion {
  cleanText: string;
  imageUrls: string[];
  fileAttachments: string[];
}

/**
 * Extracts [IMAGE:url], [ATTACHMENT:url], and ![alt](url) from raw question text
 */
function extractAttachments(rawText: string): ParsedQuestion {
  if (!rawText) {
    return { cleanText: '', imageUrls: [], fileAttachments: [] };
  }

  const imageUrls: string[] = [];
  const fileAttachments: string[] = [];

  // Match [IMAGE:https://...] or [IMAGE:http://...]
  let workingText = rawText.replace(/\[IMAGE:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
    imageUrls.push(url.trim());
    return '';
  });

  // Match markdown images: ![alt](url)
  workingText = workingText.replace(/!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/gi, (_, _alt, url) => {
    imageUrls.push(url.trim());
    return '';
  });

  // Match [ATTACHMENT:https://...]
  workingText = workingText.replace(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/gi, (_, url) => {
    const trimmed = url.trim();
    if (/\.(jpe?g|png|webp|gif|svg)(\?.*)?$/i.test(trimmed)) {
      imageUrls.push(trimmed);
    } else {
      fileAttachments.push(trimmed);
    }
    return '';
  });

  return {
    cleanText: workingText.trim(),
    imageUrls,
    fileAttachments,
  };
}

/**
 * Parses markdown/tags like **bold**, *italic*, <u>underline</u>, `code`, and [font=...] into React nodes
 */
function renderRichContent(text: string): React.ReactNode[] {
  if (!text) return [];

  // Lines split to preserve paragraphs
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Regex matching tokens:
    // 1. [font=(serif|mono|math|sans|heading)](.*?)[/font]
    // 2. **bold** or <b>bold</b> or <strong>bold</strong>
    // 3. *italic* or <i>italic</i> or <em>italic</em>
    // 4. <u>underline</u>
    // 5. `code`
    // 6. [size=(lg|xl|sm)](.*?)[/size]
    const tokenRegex =
      /(\[font=(serif|mono|math|sans|heading)\](.*?)\[\/font\]|\*\*(.*?)\*\*|<b>(.*?)<\/b>|<strong>(.*?)<\/strong>|\*(.*?)\*|<i>(.*?)<\/i>|<em>(.*?)<\/em>|<u>(.*?)<\/u>|`(.*?)`|\[size=(lg|xl|sm)\](.*?)\[\/size\])/gi;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      const matchIndex = match.index;

      // Push raw text preceding this match
      if (matchIndex > lastIndex) {
        elements.push(line.substring(lastIndex, matchIndex));
      }

      const fullMatch = match[0];

      if (fullMatch.startsWith('[font=')) {
        const fontType = match[2]?.toLowerCase();
        const content = match[3];
        let fontClass = 'font-sans';
        if (fontType === 'serif') fontClass = 'font-serif tracking-wide';
        else if (fontType === 'mono') fontClass = 'font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800';
        else if (fontType === 'math') fontClass = 'font-mono text-indigo-900 bg-indigo-50/80 px-1.5 py-0.5 rounded font-medium';
        else if (fontType === 'heading') fontClass = 'font-heading font-extrabold text-slate-900';

        elements.push(
          <span key={`font-${lineIdx}-${matchIndex}`} className={fontClass}>
            {content}
          </span>
        );
      } else if (fullMatch.startsWith('**') || fullMatch.startsWith('<b>') || fullMatch.startsWith('<strong>')) {
        const boldText = match[4] || match[5] || match[6] || '';
        elements.push(
          <strong key={`bold-${lineIdx}-${matchIndex}`} className="font-extrabold text-slate-900">
            {boldText}
          </strong>
        );
      } else if (fullMatch.startsWith('*') || fullMatch.startsWith('<i>') || fullMatch.startsWith('<em>')) {
        const italicText = match[7] || match[8] || match[9] || '';
        elements.push(
          <em key={`italic-${lineIdx}-${matchIndex}`} className="italic text-slate-800">
            {italicText}
          </em>
        );
      } else if (fullMatch.startsWith('<u>')) {
        const underlineText = match[10] || '';
        elements.push(
          <span key={`u-${lineIdx}-${matchIndex}`} className="underline underline-offset-2 decoration-slate-400">
            {underlineText}
          </span>
        );
      } else if (fullMatch.startsWith('`')) {
        const codeText = match[11] || '';
        elements.push(
          <code
            key={`code-${lineIdx}-${matchIndex}`}
            className="font-mono text-[0.9em] bg-slate-100 text-orange-600 px-1.5 py-0.5 rounded border border-slate-200"
          >
            {codeText}
          </code>
        );
      } else if (fullMatch.startsWith('[size=')) {
        const size = match[12]?.toLowerCase();
        const sizeText = match[13] || '';
        let sizeClass = 'text-base';
        if (size === 'lg') sizeClass = 'text-lg font-semibold';
        if (size === 'xl') sizeClass = 'text-xl font-bold';
        if (size === 'sm') sizeClass = 'text-xs text-slate-500';

        elements.push(
          <span key={`size-${lineIdx}-${matchIndex}`} className={sizeClass}>
            {sizeText}
          </span>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    // Push trailing raw text
    if (lastIndex < line.length) {
      elements.push(line.substring(lastIndex));
    }

    return (
      <span key={`line-${lineIdx}`} className="block min-h-[1.25em]">
        {elements.length > 0 ? elements : <br />}
      </span>
    );
  });
}

export function FormattedQuestionText({
  text,
  className = '',
  textClassName = 'text-base sm:text-lg font-medium text-slate-900 leading-relaxed',
}: FormattedQuestionTextProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const { cleanText, imageUrls, fileAttachments } = extractAttachments(text);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Formatted Question Text */}
      <div className={textClassName}>{renderRichContent(cleanText)}</div>

      {/* Image / Diagram Attachments */}
      {imageUrls.length > 0 && (
        <div className="space-y-3 pt-2">
          {imageUrls.map((imgUrl, i) => (
            <div
              key={i}
              className="group relative inline-block max-w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm hover:shadow-md transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl}
                alt={`Question diagram ${i + 1}`}
                className="max-h-80 sm:max-h-96 w-auto object-contain rounded-2xl cursor-pointer"
                onClick={() => setZoomedImage(imgUrl)}
              />
              <button
                type="button"
                onClick={() => setZoomedImage(imgUrl)}
                className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-[11px] font-semibold backdrop-blur-sm"
                title="Click to expand diagram"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                <span>Zoom</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Non-Image Attachments (e.g. PDF/DOCX link) */}
      {fileAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {fileAttachments.map((fileUrl, i) => (
            <a
              key={i}
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-800 text-xs font-bold transition-all shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-orange-600" />
              <span>Reference Attachment #{i + 1}</span>
            </a>
          ))}
        </div>
      )}

      {/* Zoom Lightbox Modal */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-slate-950/95 border-slate-800 rounded-3xl overflow-hidden">
          <div className="relative p-2 flex items-center justify-center min-h-[300px]">
            {zoomedImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={zoomedImage}
                alt="Enlarged question diagram"
                className="max-h-[80vh] w-auto object-contain rounded-2xl shadow-2xl"
              />
            )}
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```

### `src/components/quiz/QuestionRichEditor.tsx`
```tsx
'use client';

import React, { useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Type,
  Image as ImageIcon,
  Paperclip,
  Code,
  Trash2,
  Eye,
  Edit3,
  Loader2,
  X,
  Sparkles,
  Link2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { SupabaseClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormattedQuestionText } from './FormattedQuestionText';

interface QuestionRichEditorProps {
  value: string;
  onChange: (val: string) => void;
  qIndex: number;
  marks: number;
  onMarksChange: (marks: number) => void;
  onRemoveQuestion?: () => void;
  canRemove?: boolean;
  supabase: SupabaseClient;
}

const COMMON_SYMBOLS = [
  '²', '³', '₁', '₂', '√', 'π', 'θ', '±', 'Δ', 'α', 'β', 'γ', 'Ω', 'λ', 'μ', '°', '→', '∞', '≤', '≥', '≠', '≈', '∫', '∑'
];

export function QuestionRichEditor({
  value,
  onChange,
  qIndex,
  marks,
  onMarksChange,
  onRemoveQuestion,
  canRemove,
  supabase,
}: QuestionRichEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isPreview, setIsPreview] = useState(false);
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [attachmentUrlInput, setAttachmentUrlInput] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);

  // Helper to wrap selected text in textarea
  const wrapSelection = (before: string, after: string, placeholder = 'text') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);

    const replacement = selected ? `${before}${selected}${after}` : `${before}${placeholder}${after}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    // Restore focus and cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selected
        ? start + replacement.length
        : start + before.length;
      textarea.setSelectionRange(
        newCursorPos,
        selected ? newCursorPos : newCursorPos + placeholder.length
      );
    }, 10);
  };

  const insertAtCursor = (insertion: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChange(value + insertion);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + insertion.length;
      textarea.setSelectionRange(nextPos, nextPos);
    }, 10);
  };

  // Upload local image file to Supabase Storage
  const handleUploadImageFile = async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Unsupported image format', {
        description: 'Please upload a JPG, PNG, WEBP, or SVG file.',
      });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Image too large (max 20 MB)');
      return;
    }

    try {
      setIsUploadingImage(true);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `quiz-attachments/${Date.now()}_${sanitizedName}`;

      const { data, error } = await supabase.storage
        .from('course-materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('course-materials')
        .getPublicUrl(data.path);

      // Append [IMAGE:url] to question text
      const newText = value ? `${value.trim()}\n\n[IMAGE:${publicUrl}]` : `[IMAGE:${publicUrl}]`;
      onChange(newText);
      toast.success('Diagram attachment added to question');
      setIsAttachDialogOpen(false);
      setAttachmentUrlInput('');
    } catch (err: any) {
      console.error('Attachment upload failed:', err);
      toast.error('Failed to upload image: ' + (err.message || 'Storage error'));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Add image by URL or Google Drive
  const handleAddImageUrl = () => {
    let raw = attachmentUrlInput.trim();
    if (!raw) {
      toast.error('Please enter an image URL');
      return;
    }

    // Google Drive share link converter
    const gDriveMatch = raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gDriveMatch && gDriveMatch[1]) {
      raw = `https://drive.google.com/uc?export=view&id=${gDriveMatch[1]}`;
    }

    const newText = value ? `${value.trim()}\n\n[IMAGE:${raw}]` : `[IMAGE:${raw}]`;
    onChange(newText);
    toast.success('Attachment linked to question');
    setIsAttachDialogOpen(false);
    setAttachmentUrlInput('');
  };

  // Remove existing attachment from question text
  const handleRemoveAttachment = (url: string) => {
    let updated = value.replace(`[IMAGE:${url}]`, '').replace(`![](${url})`, '');
    updated = updated.replace(/\n{3,}/g, '\n\n').trim();
    onChange(updated);
    toast.success('Attachment removed');
  };

  // Extract current attachments for thumbnail preview
  const attachedImages: string[] = [];
  const imageRegex = /\[IMAGE:(https?:\/\/[^\]]+)\]|!\[[^\]]*\]\((https?:\/\/[^)]+)\)/gi;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = imageRegex.exec(value)) !== null) {
    const matchedUrl = imgMatch[1] || imgMatch[2];
    if (matchedUrl && !attachedImages.includes(matchedUrl)) {
      attachedImages.push(matchedUrl);
    }
  }

  return (
    <div className="space-y-3">
      {/* Question Header & Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold shadow-sm">
            {qIndex + 1}
          </span>
          <span className="text-xs font-bold text-slate-800">Question #{qIndex + 1}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Marks input */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Marks:</span>
            <Input
              type="number"
              min="1"
              max="20"
              value={marks}
              onChange={(e) => onMarksChange(Number(e.target.value))}
              className="w-14 h-7 rounded-lg text-xs text-center font-bold"
            />
          </div>

          {/* Preview toggle */}
          <button
            type="button"
            onClick={() => setIsPreview(!isPreview)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              isPreview
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title="Toggle Student Preview"
          >
            {isPreview ? <Edit3 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            <span>{isPreview ? 'Edit' : 'Preview'}</span>
          </button>

          {/* Remove Question */}
          {canRemove && onRemoveQuestion && (
            <button
              type="button"
              onClick={onRemoveQuestion}
              className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Remove question"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      {isPreview ? (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-inner min-h-[110px]">
          <FormattedQuestionText
            text={value || '*(No question text entered yet)*'}
            textClassName="text-sm font-medium text-slate-900 leading-relaxed"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
          {/* Google Forms-style Formatting Toolbar */}
          <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-slate-50 border-b border-slate-200/80 text-slate-700">
            {/* Bold */}
            <button
              type="button"
              onClick={() => wrapSelection('**', '**', 'bold text')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 font-bold transition-colors"
              title="Bold (**text**)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>

            {/* Italic */}
            <button
              type="button"
              onClick={() => wrapSelection('*', '*', 'italic text')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 italic transition-colors"
              title="Italic (*text*)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>

            {/* Underline */}
            <button
              type="button"
              onClick={() => wrapSelection('<u>', '</u>', 'underlined text')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 underline transition-colors"
              title="Underline (<u>text</u>)"
            >
              <Underline className="h-3.5 w-3.5" />
            </button>

            {/* Code / Formula inline */}
            <button
              type="button"
              onClick={() => wrapSelection('`', '`', 'formula/code')}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors font-mono"
              title="Inline Code or Formula (`code`)"
            >
              <Code className="h-3.5 w-3.5" />
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Font Style Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  title="Change Font Family / Style"
                >
                  <Type className="h-3.5 w-3.5" />
                  <span>Font</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="rounded-xl shadow-xl border-slate-200 text-xs z-50">
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=sans]', '[/font]', 'Standard text')}
                  className="font-sans"
                >
                  Default Sans
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=serif]', '[/font]', 'Classic editorial text')}
                  className="font-serif tracking-wide"
                >
                  Classic Serif
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=mono]', '[/font]', 'Monospace code')}
                  className="font-mono text-slate-800"
                >
                  Monospace (Code)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=math]', '[/font]', 'E = mc²')}
                  className="font-mono text-indigo-900 font-semibold"
                >
                  Math Formula
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => wrapSelection('[font=heading]', '[/font]', 'Prominent Question Header')}
                  className="font-extrabold text-slate-900"
                >
                  Heading Style
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Math Symbols Toggle */}
            <button
              type="button"
              onClick={() => setShowSymbols(!showSymbols)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                showSymbols ? 'bg-orange-100 text-orange-800 font-bold' : 'hover:bg-slate-200 text-slate-700'
              }`}
              title="Insert Math/Physics formula symbols"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Symbols</span>
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1" />

            {/* Image / Attachment Button */}
            <button
              type="button"
              onClick={() => setIsAttachDialogOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-100/70 hover:bg-orange-100 text-orange-800 text-xs font-bold transition-colors ml-auto shadow-xs"
              title="Add Image or Diagram Attachment"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              <span>Add Diagram</span>
            </button>
          </div>

          {/* Quick Symbols Ribbon (when toggled open) */}
          {showSymbols && (
            <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-orange-50/50 border-b border-orange-100 animate-in fade-in duration-200">
              <span className="text-[10px] font-bold text-orange-900 uppercase tracking-wider mr-1">
                Quick Insert:
              </span>
              {COMMON_SYMBOLS.map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => insertAtCursor(sym)}
                  className="w-6 h-6 rounded bg-white hover:bg-orange-200 border border-orange-200/80 text-xs font-mono font-bold text-slate-800 flex items-center justify-center transition-all shadow-2xs hover:scale-110"
                  title={`Insert ${sym}`}
                >
                  {sym}
                </button>
              ))}
            </div>
          )}

          {/* Main Question Textarea */}
          <textarea
            ref={textareaRef}
            placeholder="Type question problem statement here (e.g. In the given circuit diagram, find the equivalent resistance...)"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none min-h-[80px] resize-y bg-transparent"
            required
          />

          {/* Attached Images Mini-Viewer (inside editor card) */}
          {attachedImages.length > 0 && (
            <div className="px-3.5 pb-3 pt-1 border-t border-slate-100 flex flex-wrap gap-3 items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Attached Diagram{attachedImages.length > 1 ? 's' : ''}:
              </span>
              {attachedImages.map((url, idx) => (
                <div
                  key={idx}
                  className="relative group rounded-xl border border-slate-200 bg-slate-50 p-1 flex items-center gap-2 shadow-2xs"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Question Diagram"
                    className="h-10 w-14 object-cover rounded-lg"
                  />
                  <span className="text-[10px] text-slate-600 font-mono max-w-[100px] truncate">
                    Attachment #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(url)}
                    className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Attachment Upload Dialog */}
      <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
        <DialogContent className="rounded-3xl p-6 max-w-md">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-orange-600" />
              Attach Diagram or Figure to Question #{qIndex + 1}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Upload a circuit diagram, geometry figure, physics setup, or paste an image URL.
            </p>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Option 1: File Upload from device */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">
                Option 1: Upload from your device
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadImageFile(file);
                }}
              />
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50/70 hover:bg-orange-50/30 rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
                    <span className="text-xs font-bold text-slate-700">Uploading diagram...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-orange-500" />
                    <span className="text-xs font-bold text-slate-700">
                      Choose image / diagram file
                    </span>
                    <span className="text-[10px] text-slate-400">
                      PNG, JPG, WEBP, or SVG (up to 20 MB)
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">OR</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            {/* Option 2: Image URL / Google Drive */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Option 2: Paste Web Image or Google Drive Link
              </span>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="https://... or Google Drive image share link"
                  value={attachmentUrlInput}
                  onChange={(e) => setAttachmentUrlInput(e.target.value)}
                  className="rounded-2xl h-10 text-xs flex-1"
                />
                <Button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="rounded-full bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold px-4 h-10 shadow-xs"
                >
                  Attach
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Google Drive links are automatically converted into direct embeddable previews.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```

### `src/components/layout/Navbar.tsx`
```tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Menu, 
  X, 
  Layers, 
  BookOpen, 
  Video, 
  Bell, 
  LogIn,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Batches', href: '/login?role=student', icon: Layers },
    { label: 'Curriculum', href: '/login?role=student', icon: BookOpen },
    { label: 'Lecture Vault', href: '/login?role=student', icon: Video },
    { label: 'Announcements', href: '/login?role=student', icon: Bell },
  ];

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-sm shadow-slate-900/5 rounded-full px-4 py-2 flex items-center justify-between pointer-events-auto transition-all duration-300">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 pl-2 group">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
              EduFlow
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Academic LMS
            </span>
          </div>
        </Link>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link href="/login?role=student">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold px-4 h-9"
            >
              Student Portal
            </Button>
          </Link>
          <Link href="/login?role=teacher">
            <Button
              size="sm"
              className="rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4.5 h-9 shadow-sm shadow-orange-600/20"
            >
              Faculty Login
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link href="/login">
            <Button
              size="sm"
              className="rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 h-8"
            >
              Login
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-x-4 top-20 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl pointer-events-auto space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors flex items-center gap-2.5"
              >
                <link.icon className="h-4 w-4 text-slate-400" />
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link href="/login?role=student" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full rounded-full text-slate-700 border-slate-300 text-xs">
                Student Portal
              </Button>
            </Link>
            <Link href="/login?role=teacher" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs">
                Faculty Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

```


---

## 7. UI Components (shadcn/ui) Reference

The project uses standard shadcn/ui primitives styled with Tailwind CSS in `src/components/ui/`:
- `Button`: `<Button variant="default|outline|ghost|destructive|secondary" size="default|sm|lg|icon">`
- `Badge`: `<Badge variant="default|secondary|outline|destructive">`
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`
- `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`
- `Input`: Standard styled input with ring focus
- `Label`: Standard accessible label
- `ScrollArea`: Custom scroll container
- `Separator`: Horizontal/vertical divider
- `Sheet`, `SheetTrigger`, `SheetContent`
- `Skeleton`: Shimmer placeholder
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- `Textarea`: Multiline textarea


---

## 8. Student Portal Routes

### `src/app/student/layout.tsx`
```tsx
'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  FileText,
  Award,
  LogOut,
  ChevronDown,
  GraduationCap,
  Menu,
  X,
  ArrowRightLeft,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/queries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StudentNotificationBell } from '@/components/notifications/StudentNotificationBell';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

const UserContext = createContext<UserProfile | null>(null);
export const useUser = () => useContext(UserContext);

const navLinks = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Lectures', href: '/student/lectures', icon: Video },
  { label: 'Assignments', href: '/student/assignments', icon: FileText },
  { label: 'Grades', href: '/student/grades', icon: Award },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUser(supabase);
        if (!profile) {
          router.push('/login');
          return;
        }
        setUser(profile);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading portal...</p>
        </div>
      </div>
    );
  }

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'ST';

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-slate-50/80">
        {/* ========== TOP NAVIGATION ========== */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo + Batch Indicator */}
              <div className="flex items-center gap-3">
                <Link href="/student/dashboard" className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-display font-extrabold text-lg text-slate-900 hidden sm:block tracking-tight">
                    EduFlow
                  </span>
                </Link>
                <div className="hidden md:flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-emerald-700">Student Portal</span>
                </div>
              </div>

              {/* Desktop Nav Tabs */}
              <div className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-full p-1">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || pathname.startsWith(link.href + '/');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                {/* Faculty Portal Switcher (Always accessible) */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 rounded-full border-orange-200 text-orange-700 bg-orange-50/70 hover:bg-orange-100 hover:border-orange-300 h-8 text-xs font-bold shadow-sm transition-all"
                  title="Switch to Faculty Console"
                >
                  <Link href="/teacher/dashboard">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Faculty Console</span>
                    <span className="sm:hidden">Faculty</span>
                  </Link>
                </Button>

                {/* Notifications */}
                <StudentNotificationBell studentId={user?.id} />

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
                      <Avatar className="h-8 w-8 border-2 border-emerald-200">
                        <AvatarImage src={user?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
                        {user?.full_name}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-slate-900">{user?.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/teacher/dashboard"
                        className="rounded-lg text-orange-700 focus:bg-orange-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-bold"
                      >
                        <ArrowRightLeft className="h-4 w-4 text-orange-600" />
                        Switch to Faculty Console
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-lg text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200/60 bg-white/95 backdrop-blur-xl">
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || pathname.startsWith(link.href + '/');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    href="/teacher/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 transition-all border border-orange-200"
                  >
                    <ArrowRightLeft className="h-5 w-5" />
                    Switch to Faculty Console
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* ========== PAGE CONTENT ========== */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}

```

### `src/app/student/dashboard/page.tsx`
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Video,
  FileText,
  Award,
  ArrowRight,
  Clock,
  Megaphone,
  BookOpen,
  TrendingUp,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getDashboardStats,
  getAnnouncements,
  getAssignments,
  getMySubmissions,
} from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function StudentDashboard() {
  const { user } = useAuthUser();
  const supabase = React.useMemo(() => createClient(), []);

  const [stats, setStats] = useState({
    totalLectures: 0,
    totalAssignments: 0,
    pendingAssignments: 0,
    submittedCount: 0,
    averageScore: 0,
    gradedCount: 0,
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      if (!user) return;
      try {
        const [statsData, announcementsData, assignmentsData, submissionsData] = await Promise.all([
          getDashboardStats(supabase, user.id),
          getAnnouncements(supabase),
          getAssignments(supabase),
          getMySubmissions(supabase),
        ]);

        setStats(statsData);
        setAnnouncements(announcementsData.slice(0, 5));

        // Filter to upcoming (not yet submitted) assignments
        const submittedAssignmentIds = new Set(
          submissionsData.map((s: any) => s.assignment_id)
        );
        const upcoming = assignmentsData
          .filter((a: any) => !submittedAssignmentIds.has(a.id))
          .filter((a: any) => new Date(a.due_date) > new Date())
          .slice(0, 4);
        setUpcomingAssignments(upcoming);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [user, supabase]);

  function getTimeUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Due soon';
  }

  function getUrgencyColor(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days <= 1) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 3) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Student';

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ========== HERO GREETING ========== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-8 sm:p-10 text-white shadow-2xl shadow-emerald-600/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4 blur-xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-emerald-200" />
            <span className="text-sm font-medium text-emerald-100">Academic Session 2026–27</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {firstName}!
          </h1>
          <p className="mt-2 text-emerald-100 text-base sm:text-lg max-w-lg">
            You have{' '}
            <span className="font-bold text-white">
              {stats.pendingAssignments} pending assignment{stats.pendingAssignments !== 1 ? 's' : ''}
            </span>{' '}
            and{' '}
            <span className="font-bold text-white">{stats.totalLectures} lectures</span>{' '}
            available in your vault.
          </p>
        </div>
      </div>

      {/* ========== METRIC CARDS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Lectures */}
        <div className="group bg-white rounded-2xl p-6 shadow-card border border-slate-100/80 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
              <Video className="h-5 w-5 text-blue-600" />
            </div>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.totalLectures}
          </p>
          <p className="text-sm text-slate-500 font-medium mt-1">Lectures Available</p>
        </div>

        {/* Pending Assignments */}
        <div className="group bg-white rounded-2xl p-6 shadow-card border border-slate-100/80 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-amber-600" />
            </div>
            {stats.pendingAssignments > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                Action
              </span>
            )}
          </div>
          <p className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.pendingAssignments}
          </p>
          <p className="text-sm text-slate-500 font-medium mt-1">Pending Assignments</p>
        </div>

        {/* Average Score */}
        <div className="group bg-white rounded-2xl p-6 shadow-card border border-slate-100/80 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
            {stats.gradedCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                {stats.gradedCount} graded
              </span>
            )}
          </div>
          <p className="font-display text-3xl font-extrabold text-slate-900 tracking-tight">
            {stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}
          </p>
          <p className="text-sm text-slate-500 font-medium mt-1">Average Score</p>
        </div>
      </div>

      {/* ========== TWO COLUMN: ANNOUNCEMENTS + DEADLINES ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Announcements Feed */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-orange-500" />
              <h2 className="font-display text-lg font-bold text-slate-900">Announcements</h2>
            </div>
            <Badge
              variant="secondary"
              className="bg-orange-50 text-orange-600 border-orange-200 font-semibold"
            >
              {announcements.length} new
            </Badge>
          </div>

          <div className="divide-y divide-slate-100">
            {announcements.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-400">
                No announcements yet.
              </div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.id}
                  className="px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{a.title}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{a.content}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className="shrink-0 text-xs bg-slate-50 text-slate-600 border-slate-200"
                    >
                      {a.courses?.code}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {new Date(a.posted_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-violet-500" />
              <h2 className="font-display text-lg font-bold text-slate-900">Upcoming Deadlines</h2>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-3">
            {upcomingAssignments.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                🎉 All caught up! No pending deadlines.
              </div>
            ) : (
              upcomingAssignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/student/assignments/${a.id}`}
                  className="block group"
                >
                  <div className="rounded-xl border border-slate-200/80 p-4 hover:border-emerald-300 hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                          {a.courses?.code}
                        </span>
                        {a.course_chapters?.title && (
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] px-1.5 py-0 font-bold shadow-none">
                            {a.course_chapters.title}
                          </Badge>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getUrgencyColor(
                          a.due_date
                        )}`}
                      >
                        {getTimeUntil(a.due_date)}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-slate-800 group-hover:text-emerald-700 transition-colors">
                      {a.title}
                    </p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>
                        Due{' '}
                        {new Date(a.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="ml-auto text-emerald-500 font-medium flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Submit <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ========== QUICK LINKS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/student/lectures"
          className="group flex items-center gap-4 bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <BookOpen className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Lecture Vault</p>
            <p className="text-xs text-slate-500">Watch recordings & download notes</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/assignments"
          className="group flex items-center gap-4 bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
            <FileText className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Assignments</p>
            <p className="text-xs text-slate-500">Submit work & view feedback</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/grades"
          className="group flex items-center gap-4 bg-white rounded-2xl p-5 shadow-card border border-slate-100/80 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
            <Award className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">My Grades</p>
            <p className="text-xs text-slate-500">Track performance & scores</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 ml-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}

```

### `src/app/student/lectures/page.tsx`
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Play,
  Clock,
  BookOpen,
  ChevronRight,
  Search,
  Filter,
  FileText,
  HelpCircle,
  Download,
  ExternalLink,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getLectures,
  getCourses,
  getCourseMaterials,
  getQuizzes,
  getStudentQuizAttempts,
} from '@/lib/supabase/queries';
import { useUser } from '@/app/student/layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default function LecturesPage() {
  const supabase = createClient();
  const user = useUser();
  const [lectures, setLectures] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const studentId = user?.id || 'demo-student';
        const [lectureData, courseData, materialsData, quizzesData, attemptsData] = await Promise.all([
          getLectures(supabase),
          getCourses(supabase),
          getCourseMaterials(supabase),
          getQuizzes(supabase),
          getStudentQuizAttempts(supabase, studentId),
        ]);
        setLectures(lectureData);
        setCourses(courseData);
        setMaterials(materialsData);
        setQuizzes(quizzesData);
        setStudentAttempts(attemptsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase, user?.id]);

  const filteredLectures = lectures.filter((l) => {
    const matchesCourse = selectedCourse ? l.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? l.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  const filteredMaterials = materials.filter((m) => {
    const matchesCourse = selectedCourse ? m.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? m.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesCourse = selectedCourse ? q.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? q.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  // Group by course
  const groupedByCourse = filteredLectures.reduce((acc: Record<string, any[]>, lecture) => {
    const courseTitle = lecture.courses?.title || 'Uncategorized';
    if (!acc[courseTitle]) acc[courseTitle] = [];
    acc[courseTitle].push(lecture);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Academic Vault &amp; Resources
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lectures.length} video lectures · {materials.length} PDF study materials · {quizzes.length} practice quizzes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search lectures, syllabus PDFs, or tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400 text-xs h-11 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              !selectedCourse
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All Batches
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedCourse === c.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Tabs */}
      <Tabs defaultValue="lectures" className="space-y-6">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200/80 inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="lectures"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Video Lectures ({filteredLectures.length})
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF Notes ({filteredMaterials.length})
            </TabsTrigger>
            <TabsTrigger
              value="quizzes"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              Practice Quizzes ({filteredQuizzes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: LECTURES */}
        <TabsContent value="lectures" className="space-y-6">
          {Object.keys(groupedByCourse).length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <Video className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No lectures found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your batch filter or search query.</p>
            </div>
          ) : (
            Object.entries(groupedByCourse).map(([courseTitle, courseLectures]) => (
              <div key={courseTitle} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <h2 className="font-heading text-base font-extrabold text-slate-800">
                    {courseTitle}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-600 text-xs font-bold"
                  >
                    {courseLectures.length} lectures
                  </Badge>
                </div>

                <div className="space-y-2">
                  {courseLectures.map((lecture: any, idx: number) => (
                    <Link
                      key={lecture.id}
                      href={`/student/lectures/${lecture.id}`}
                      className="group block"
                    >
                      <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-emerald-200 transition-all flex items-center gap-4">
                        {/* Green Circle Lecture Number */}
                        <div className="shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-50 text-emerald-700 border-2 border-emerald-400/60 flex items-center justify-center font-black text-sm sm:text-base shadow-sm group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all">
                          {idx + 1}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Lecture {idx + 1}
                            </span>
                            <Badge className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 border-0 font-bold">
                              {lecture.courses?.code}
                            </Badge>
                            {lecture.course_chapters?.title && (
                              <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] px-2.5 py-0.5 font-bold shadow-none">
                                Chapter: {lecture.course_chapters.title}
                              </Badge>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate text-sm sm:text-base">
                            {lecture.title}
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="shrink-0 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* TAB 2: COURSE MATERIALS / PDFS */}
        <TabsContent value="materials" className="space-y-4">
          {filteredMaterials.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No Study Materials Uploaded Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Your teachers will upload formula sheets, notes PDFs, and reference materials here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-emerald-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0 border-0 font-bold">
                          {mat.courses?.code || 'BATCH'}
                        </Badge>
                        {mat.course_chapters?.title && (
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] px-2 py-0.5 font-bold">
                            Chapter: {mat.course_chapters.title}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {mat.title}
                      </h4>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        Uploaded {new Date(mat.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <a
                    href={mat.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2.5 rounded-2xl transition-colors"
                  >
                    <span>View / Download PDF</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: QUIZZES */}
        <TabsContent value="quizzes" className="space-y-4">
          {filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No Active Practice Quizzes</p>
              <p className="text-xs text-slate-400 mt-1">
                Faculty-published timed tests and MCQ series will be listed here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => {
                // Find student's attempts for this quiz (records are sorted descending by completed_at)
                const attemptsForQuiz = studentAttempts.filter((a) => a.quiz_id === quiz.id);
                const firstAttempt =
                  attemptsForQuiz.length > 0
                    ? attemptsForQuiz.find((a) => a.attempt_number === 1) ||
                      attemptsForQuiz[attemptsForQuiz.length - 1]
                    : null;

                return (
                  <Link key={quiz.id} href={`/student/quizzes/${quiz.id}`}>
                    <div
                      className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-emerald-200 transition-all flex flex-col justify-between space-y-4 h-full cursor-pointer hover:shadow-2xl"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-emerald-50 text-emerald-700 font-bold text-xs">
                              {quiz.courses?.code}
                            </Badge>
                            {quiz.course_chapters?.title && (
                              <Badge className="bg-orange-100 text-orange-800 border border-orange-200 font-bold text-[10px] px-2 py-0">
                                Chapter: {quiz.course_chapters.title}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
                            <Clock className="h-3.5 w-3.5 text-orange-600" />
                            {quiz.time_limit_minutes || 30} mins
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-slate-900">{quiz.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-2">{quiz.description}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-700">
                          {quiz.questions_count} Questions • {quiz.total_marks} Marks
                        </span>
                        {firstAttempt ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Score: {firstAttempt.score}/{quiz.total_marks}</span>
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded-full">
                            Active Test
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

```

### `src/app/student/lectures/[lectureId]/page.tsx`
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Video,
  FileDown,
  BookOpen,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getLectureById, getLectures } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function LectureViewerPage() {
  const params = useParams();
  const lectureId = params.lectureId as string;
  const supabase = React.useMemo(() => createClient(), []);

  const [lecture, setLecture] = useState<any>(null);
  const [siblingLectures, setSiblingLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const lectureData = await getLectureById(supabase, lectureId);
        setLecture(lectureData);

        if (lectureData?.course_id) {
          const siblings = await getLectures(supabase, lectureData.course_id);
          setSiblingLectures(siblings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lectureId, supabase]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="aspect-video rounded-2xl bg-white animate-pulse shadow-card" />
        <div className="h-32 rounded-2xl bg-white animate-pulse shadow-card" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
        <Video className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="font-semibold text-slate-600">Lecture not found</p>
        <Link href="/student/lectures" className="text-emerald-600 text-sm font-medium mt-2 inline-block hover:underline">
          ← Back to Lectures
        </Link>
      </div>
    );
  }

  // Convert YouTube, Vimeo, Google Drive watch/share URLs to embed URLs
  function getEmbedUrl(url: string) {
    if (!url) return '';
    // Google Drive
    if (url.includes('drive.google.com')) {
      const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      }
      return url;
    }
    // Already an embed URL
    if (url.includes('/embed/') || url.includes('/preview')) return url;
    // YouTube watch URL
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Direct MP4, WebM or storage URL
    return url;
  }

  const videoUrl = getEmbedUrl(lecture.video_url || '');
  const isGoogleDrive = videoUrl.includes('drive.google.com');
  const isDirectVideo =
    !isGoogleDrive &&
    (/\.(mp4|webm|mov|mkv|ogg)(\?.*)?$/i.test(videoUrl) ||
      (videoUrl.includes('/course-materials/') && !videoUrl.includes('/preview')));

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Navigation */}
      <Link
        href="/student/lectures"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lecture Vault
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ========== MAIN VIDEO AREA ========== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Video Player */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl aspect-video relative">
            {isDirectVideo ? (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                poster=""
              />
            ) : videoUrl ? (
              <iframe
                src={videoUrl}
                title={lecture.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/50">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Video not available</p>
                </div>
              </div>
            )}
          </div>

          {/* Lecture Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center justify-center font-black text-xs">
                    {siblingLectures.findIndex((l) => l.id === lecture.id) >= 0
                      ? siblingLectures.findIndex((l) => l.id === lecture.id) + 1
                      : lecture.order_index || 1}
                  </span>
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold"
                  >
                    {lecture.courses?.code}
                  </Badge>
                  {lecture.course_chapters?.title && (
                    <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold shadow-none">
                      Chapter: {lecture.course_chapters.title}
                    </Badge>
                  )}
                  <span className="text-xs text-slate-400 font-medium">
                    Lecture {siblingLectures.findIndex((l) => l.id === lecture.id) >= 0
                      ? siblingLectures.findIndex((l) => l.id === lecture.id) + 1
                      : lecture.order_index || 1}
                  </span>
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {lecture.title}
                </h1>
                <p className="text-sm text-slate-500 mt-1">{lecture.courses?.title}</p>
              </div>
            </div>

            {/* Resources */}
            {lecture.notes_url && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-blue-500" />
                  Downloadable Resources
                </h3>
                <a
                  href={lecture.notes_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <span className="text-xs font-extrabold text-red-500">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      Lecture Notes — {lecture.title}
                    </p>
                    <p className="text-xs text-slate-400">Click to download</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR: COURSE LECTURES LIST ========== */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden sticky top-20">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display text-sm font-bold text-slate-800">
                  Course Syllabus
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {siblingLectures.length} lecture{siblingLectures.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {siblingLectures.map((sl, idx) => {
                const isActive = sl.id === lectureId;
                return (
                  <Link
                    key={sl.id}
                    href={`/student/lectures/${sl.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                      isActive
                        ? 'bg-emerald-50 border-l-2 border-emerald-500'
                        : 'hover:bg-slate-50 border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                        isActive
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? 'text-emerald-800' : 'text-slate-700'
                        }`}
                      >
                        {sl.title}
                      </p>
                      {sl.course_chapters?.title && (
                        <p className="text-[10px] font-bold text-orange-600 truncate mt-0.5">
                          Chapter: {sl.course_chapters.title}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

```

### `src/app/student/assignments/page.tsx`
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Search,
  Award,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAssignments, getMySubmissions, getCourses } from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default function AssignmentsPage() {
  const { user } = useAuthUser();
  const supabase = React.useMemo(() => createClient(), []);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [assignmentData, submissionData, courseData] = await Promise.all([
          getAssignments(supabase),
          getMySubmissions(supabase),
          getCourses(supabase),
        ]);
        setAssignments(assignmentData);
        setSubmissions(submissionData);
        setCourses(courseData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  const submittedMap = new Map(
    submissions.map((s: any) => [s.assignment_id, s])
  );

  const filtered = assignments.filter((a) => {
    const matchesCourse = selectedCourse ? a.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? a.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  function getStatus(assignment: any) {
    const sub = submittedMap.get(assignment.id);
    if (sub) {
      return sub.status === 'graded' ? 'graded' : 'submitted';
    }
    const isPastDue = new Date(assignment.due_date) < new Date();
    return isPastDue ? 'overdue' : 'pending';
  }

  function getStatusBadge(status: string, sub?: any) {
    switch (status) {
      case 'graded':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
            <Award className="h-3 w-3 mr-1" />
            {sub?.marks_obtained}/{sub?.assignments?.max_marks || '—'}
          </Badge>
        );
      case 'submitted':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-50 text-red-600 border-red-200 font-semibold">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  }

  function getTimeUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) return 'Past due';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Due soon';
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Assignments
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {assignments.length} total · {filtered.filter((a) => getStatus(a) === 'pending').length} pending
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedCourse
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCourse === c.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const status = getStatus(a);
            const sub = submittedMap.get(a.id);
            return (
              <Link
                key={a.id}
                href={`/student/assignments/${a.id}`}
                className="group block"
              >
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-slate-100/80 hover:shadow-card-hover hover:border-emerald-200/60 transition-all duration-300">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                          {a.courses?.code}
                        </span>
                        {a.course_chapters?.title && (
                          <Badge className="bg-orange-100 text-orange-800 border border-orange-200 font-bold text-[10px] px-2 py-0.5 shadow-none">
                            Chapter: {a.course_chapters.title}
                          </Badge>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400 font-medium">
                          Max {a.max_marks} marks
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate text-base">
                        {a.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          Due{' '}
                          {new Date(a.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {status === 'pending' && (
                          <span className="text-xs font-medium text-amber-600">
                            {getTimeUntil(a.due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(status, sub)}
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

```

### `src/app/student/assignments/[assignmentId]/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  AlertCircle,
  File,
  X,
  Loader2,
  Award,
  FileImage,
  FileType2,
  ExternalLink,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getAssignmentById,
  getSubmissionForAssignment,
  createSubmission,
  uploadSubmissionFile,
  createNotification,
} from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function AssignmentDetailPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const { user } = useAuthUser();
  const supabase = React.useMemo(() => createClient(), []);

  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [assignmentData, submissionData] = await Promise.all([
          getAssignmentById(supabase, assignmentId),
          getSubmissionForAssignment(supabase, assignmentId, user.id),
        ]);
        setAssignment(assignmentData);
        setSubmission(submissionData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assignmentId, user, supabase]);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Accepted: PDF, JPG, PNG`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 10 MB`;
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error('Invalid file', { description: error });
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !user || !assignment) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 15, 85));
    }, 200);

    try {
      const { path } = await uploadSubmissionFile(
        supabase,
        user.id,
        assignment.id,
        selectedFile
      );

      setUploadProgress(95);

      const newSubmission = await createSubmission(supabase, {
        assignment_id: assignment.id,
        student_id: user.id,
        file_url: path,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
      });

      setUploadProgress(100);
      setSubmission(newSubmission);
      setSelectedFile(null);

      // Notify faculty in real-time
      try {
        await createNotification(supabase, {
          type: 'submission_created',
          title: 'New Assignment Submission',
          message: `${user.full_name || 'A student'} submitted for "${assignment.title}"`,
          data: {
            assignment_id: assignment.id,
            assignment_title: assignment.title,
            student_id: user.id,
            submission_id: newSubmission.id,
          },
        });
      } catch (notifErr) {
        console.warn('Failed to notify faculty of submission:', notifErr);
      }

      toast.success('Assignment submitted!', {
        description: 'Your file has been uploaded successfully.',
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  function getTimeUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) return 'Past due';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    return 'Due very soon';
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileType2 className="h-5 w-5 text-red-500" />;
    if (['jpg', 'jpeg', 'png'].includes(ext || ''))
      return <FileImage className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-2xl bg-white animate-pulse shadow-card" />
        <div className="h-64 rounded-2xl bg-white animate-pulse shadow-card" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="font-semibold text-slate-600">Assignment not found</p>
        <Link
          href="/student/assignments"
          className="text-emerald-600 text-sm font-medium mt-2 inline-block hover:underline"
        >
          ← Back to Assignments
        </Link>
      </div>
    );
  }

  const isPastDue = new Date(assignment.due_date) < new Date();
  const isNeedsResubmit = submission?.status === 'needs_resubmission';
  const hasSubmitted = !!submission && !isNeedsResubmit;

  // Parse attachment from description
  let parsedDescription = assignment.description || 'No additional instructions provided.';
  let attachmentUrl: string | null = null;
  const attachmentMatch = parsedDescription.match(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/);
  if (attachmentMatch) {
    attachmentUrl = attachmentMatch[1];
    parsedDescription = parsedDescription.replace(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/, '').trim();
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back */}
      <Link
        href="/student/assignments"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== ASSIGNMENT DETAILS ========== */}
        <div className="lg:col-span-2 space-y-5">
          {/* Info Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-slate-100/80">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold"
                  >
                    {assignment.courses?.code}
                  </Badge>
                  {assignment.course_chapters?.title && (
                    <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-xs font-bold shadow-none">
                      Chapter: {assignment.course_chapters.title}
                    </Badge>
                  )}
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {assignment.title}
                </h1>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-2xl font-extrabold text-emerald-600">
                  {assignment.max_marks}
                </p>
                <p className="text-xs text-slate-400 font-medium">max marks</p>
              </div>
            </div>

            {/* Deadline Info */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60 mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  Due:{' '}
                  {new Date(assignment.due_date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span
                  className={`text-sm font-semibold ${
                    isPastDue ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  {getTimeUntil(assignment.due_date)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-2">Instructions</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {parsedDescription}
              </p>
              
              {attachmentUrl && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Assignment File</p>
                        <p className="text-xs text-slate-500">Reference document for this assignment</p>
                      </div>
                    </div>
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Full Screen
                    </a>
                  </div>
                  
                  {/* Inline Preview */}
                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-[500px] w-full">
                    {attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                      <iframe 
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(attachmentUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title="Assignment Preview"
                      />
                    ) : attachmentUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={attachmentUrl} 
                        alt="Assignment Preview" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <iframe 
                        src={attachmentUrl}
                        className="w-full h-full border-0"
                        title="Assignment Preview"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== FILE UPLOAD / SUBMISSION ========== */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-slate-100/80">
            {hasSubmitted ? (
              /* Already Submitted */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Submission Received
                    </h2>
                  </div>
                  <Badge
                    className={
                      submission.status === 'graded'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }
                  >
                    {submission.status === 'graded'
                      ? `Score: ${submission.marks_obtained}/${assignment.max_marks}`
                      : 'Pending Evaluation'}
                  </Badge>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(submission.file_name || 'file')}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {submission.file_name || 'Submitted handwritten sheet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Submitted on{' '}
                        {new Date(submission.submitted_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <a
                      href={submission.file_url?.startsWith('http') ? submission.file_url : supabase.storage.from('course-materials').getPublicUrl(submission.file_url).data.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      View Original
                    </a>
                  </div>

                  {submission.feedback && (
                    <div className="mt-4 pt-4 border-t border-emerald-200/60">
                      <p className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-emerald-600" />
                        Teacher Feedback:
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-white/70 p-3 rounded-xl border border-emerald-100">
                        {submission.feedback}
                      </p>
                    </div>
                  )}
                </div>

                {/* Teacher's Checked Copy (with Ticks and Corrections) */}
                {(() => {
                  const rawCheckedCopy = submission.checked_copy_url || submission.checkedCopyUrl;
                  const checkedCopyUrl = rawCheckedCopy
                    ? (rawCheckedCopy.startsWith('http')
                        ? rawCheckedCopy
                        : supabase.storage.from('course-materials').getPublicUrl(rawCheckedCopy).data.publicUrl)
                    : null;

                  if (!checkedCopyUrl) return null;

                  return (
                    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-orange-600 text-white border-0 text-xs font-bold px-2.5 py-0.5">
                              Checked copy returned
                            </Badge>
                          </div>
                        </div>

                        <a
                          href={checkedCopyUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all shrink-0"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Checked Copy
                        </a>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-orange-200/80 bg-white shadow-md max-h-96 overflow-y-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={checkedCopyUrl}
                          alt="Teacher evaluated and checked answer copy"
                          className="w-full object-contain"
                        />
                      </div>

                      {submission.file_url && (submission.file_name?.toLowerCase().endsWith('.pdf') || submission.file_url?.toLowerCase().endsWith('.pdf')) && (
                        <div className="mt-4 pt-4 border-t border-orange-200/60">
                          <h4 className="text-xs font-bold text-orange-950 mb-2">
                            Original Document (All Pages)
                          </h4>
                          <iframe
                            src={`${submission.file_url.startsWith('http') ? submission.file_url : supabase.storage.from('course-materials').getPublicUrl(submission.file_url).data.publicUrl}#toolbar=0`}
                            className="w-full h-[500px] rounded-xl border border-slate-200 bg-white shadow-sm"
                            title="Original Document"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Upload Area for Scanned Handwritten Work */
              <div>
                {isNeedsResubmit && submission && (
                  <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-rose-950">
                          Revisions Requested by Instructor
                        </h3>
                        <p className="text-xs text-rose-700">
                          Your teacher requested revisions on your previous submission. Please review the feedback and submit an updated copy.
                        </p>
                      </div>
                    </div>

                    {submission.feedback && (
                      <div className="p-3 bg-white/90 rounded-xl border border-rose-100 text-xs text-slate-700">
                        <p className="font-semibold text-rose-900 mb-1 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-rose-600" />
                          Teacher Feedback:
                        </p>
                        <p className="whitespace-pre-line leading-relaxed">{submission.feedback}</p>
                      </div>
                    )}

                    {(() => {
                      const rawChecked = submission.checked_copy_url || submission.checkedCopyUrl;
                      const checkedUrl = rawChecked
                        ? (rawChecked.startsWith('http')
                            ? rawChecked
                            : supabase.storage.from('course-materials').getPublicUrl(rawChecked).data.publicUrl)
                        : null;
                      if (!checkedUrl) return null;
                      return (
                        <a
                          href={checkedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Checked Copy (Teacher Corrections)
                        </a>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      {isNeedsResubmit ? 'Upload Revised Assignment' : 'Upload Scanned Assignment'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isNeedsResubmit
                        ? 'Upload clear photos or PDF scans of your updated handwritten solutions'
                        : 'Upload clear photos or PDF scans of your handwritten work for faculty review'}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      isNeedsResubmit
                        ? 'border-rose-200 text-rose-700 bg-rose-50'
                        : 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    }`}
                  >
                    {isNeedsResubmit ? 'Resubmission' : 'Handwritten / PDF'}
                  </Badge>
                </div>

                {/* Accepted formats notice */}
                <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>
                    Accepted: Clear Scans (PDF, JPG, PNG) · Max size: 10 MB
                  </span>
                </div>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-50/50 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-4">
                      {getFileIcon(selectedFile.name)}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600 mb-1">
                        Drag &amp; drop your handwritten scan here
                      </p>
                      <p className="text-xs text-slate-400 mb-4">or select photos from device / scanner</p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold cursor-pointer hover:bg-slate-800 transition-colors">
                        <Upload className="h-4 w-4" />
                        Browse Scanned Pages
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                        />
                      </label>
                    </>
                  )}
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>Uploading scan...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                {selectedFile && !uploading && (
                  <Button
                    onClick={handleUpload}
                    disabled={isPastDue}
                    className="mt-5 w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-semibold h-12 text-base shadow-xl shadow-orange-600/20"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isNeedsResubmit ? 'Submit Revision for Re-evaluation' : 'Submit Handwritten Work for Grading'}
                  </Button>
                )}

                {isPastDue && !hasSubmitted && (
                  <p className="mt-4 text-center text-sm text-red-500 font-medium">
                    ⚠ This assignment is past its due date. Submissions may not be accepted.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR ========== */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-6 sticky top-20 space-y-5">
            <h3 className="font-display text-sm font-bold text-slate-800">Assignment Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Course</span>
                <span className="font-semibold text-slate-800">{assignment.courses?.code}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Max Marks</span>
                <span className="font-semibold text-slate-800">{assignment.max_marks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                {hasSubmitted ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    Submitted
                  </Badge>
                ) : isNeedsResubmit ? (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                    Revisions Requested
                  </Badge>
                ) : isPastDue ? (
                  <Badge className="bg-red-50 text-red-600 border-red-200 text-xs">
                    Overdue
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    Pending
                  </Badge>
                )}
              </div>
              {hasSubmitted && submission.status === 'graded' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Score</span>
                  <span className="font-display font-extrabold text-emerald-600 text-lg">
                    {submission.marks_obtained}/{assignment.max_marks}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/student/assignments"
                className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                View All Assignments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

```

### `src/app/student/quizzes/[quizId]/page.tsx`
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Award, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getQuizWithQuestions,
  getQuizAttempts,
  submitQuizAttempt,
  QuizAttemptRecord,
  createNotification,
} from '@/lib/supabase/queries';
import { useUser } from '@/app/student/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FormattedQuestionText } from '@/components/quiz/FormattedQuestionText';

export const dynamic = 'force-dynamic';

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;
  const supabase = createClient();
  const user = useUser();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);

  // Past Attempts State
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [officialScore, setOfficialScore] = useState<number | null>(null);
  const [latestAttemptScore, setLatestAttemptScore] = useState<number | null>(null);

  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;
      try {
        setLoading(true);
        const data = await getQuizWithQuestions(supabase, quizId);
        setQuiz(data);
        setQuestions(data?.quiz_questions || []);

        // Load student's past attempts once authenticated user ID is available
        if (user?.id) {
          const pastAttempts = await getQuizAttempts(supabase, quizId, user.id);
          setAttempts(pastAttempts);

          if (pastAttempts.length > 0) {
            // 1st attempt score is always the official recorded score
            const firstScore = pastAttempts[0].score;
            setOfficialScore(firstScore);
            setLatestAttemptScore(pastAttempts[pastAttempts.length - 1].score);
            setScore(firstScore);
            setIsSubmitted(true);
          }
        }
      } catch (err: any) {
        console.error('Error loading quiz:', err);
        toast.error('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId, user?.id, supabase]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedOptions((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const totalQuizMarks =
    quiz?.total_marks ||
    questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit your quiz?')) return;

    if (!user?.id) {
      toast.error('Authentication required', {
        description: 'Please sign in to submit your quiz attempt.',
      });
      return;
    }

    let calculatedScore = 0;
    questions.forEach((q) => {
      if (selectedOptions[q.id] === q.correct_option_index) {
        calculatedScore += q.marks || 1;
      }
    });

    try {
      setIsSubmittingAttempt(true);
      const studentId = user.id;
      const allowReattempt = quiz?.description?.includes('[REATTEMPT_ALLOWED]') ?? false;

      const result = await submitQuizAttempt(supabase, {
        quiz_id: quizId,
        student_id: studentId,
        score: calculatedScore,
        total_marks: totalQuizMarks,
        answers: selectedOptions,
        allow_reattempt: allowReattempt,
      });

      setOfficialScore(result.officialScore);
      setLatestAttemptScore(calculatedScore);
      setScore(result.officialScore);
      setAttempts((prev) => [...prev, result.attempt]);
      setIsSubmitted(true);

      if (result.isFirstAttempt) {
        toast.success('Quiz submitted and score saved!', {
          description: `Official recorded score: ${calculatedScore} / ${totalQuizMarks}`,
        });
      } else {
        toast.success('Practice attempt finished!', {
          description: `Score: ${calculatedScore} / ${totalQuizMarks}. Official score remains ${result.firstAttemptScore} / ${totalQuizMarks} (1st attempt).`,
        });
      }

      // Fire quiz_attempted notification
      try {
        await createNotification(supabase, {
          type: 'quiz_attempted',
          title: 'Quiz Attempt Submitted',
          message: `${user?.full_name || 'A student'} attempted the quiz "${quiz?.title}" and scored ${calculatedScore}/${totalQuizMarks}.`,
          data: {
            quiz_id: quizId,
            student_id: studentId,
            score: calculatedScore,
            total_marks: totalQuizMarks,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire quiz attempt notification:', notifErr);
      }
    } catch (err: any) {
      console.error('Failed to save quiz attempt:', err);
      toast.error('Failed to save quiz score', {
        description: err.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading quiz &amp; attempts...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center max-w-2xl mx-auto mt-10">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="font-semibold text-slate-600 text-lg">Quiz not found</p>
        <Button
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => router.push('/student/lectures')}
        >
          Back to Quizzes
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const allAnswered =
    questions.length > 0 && questions.every((q) => selectedOptions[q.id] !== undefined);
  const allowReattempt = quiz.description?.includes('[REATTEMPT_ALLOWED]');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/student/lectures')}
          className="text-slate-500 hover:text-emerald-600 font-medium h-9 px-3 rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lectures
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {allowReattempt && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs rounded-full">
              Multiple Attempts Allowed
            </Badge>
          )}
          {quiz.course_chapters?.title && (
            <Badge className="bg-orange-100 text-orange-800 border border-orange-200 font-bold text-xs rounded-full shadow-none">
              Chapter: {quiz.course_chapters.title}
            </Badge>
          )}
          <Badge className="bg-slate-900 text-white font-bold px-3 py-1 text-xs rounded-full">
            {quiz.courses?.code || 'PRACTICE'}
          </Badge>
        </div>
      </div>

      {!isSubmitted ? (
        <>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {quiz.course_chapters?.title && (
                <div className="mb-2">
                  <Badge className="bg-orange-50 text-orange-700 border border-orange-200 font-bold text-xs">
                    Chapter: {quiz.course_chapters.title}
                  </Badge>
                </div>
              )}
              <h1 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">
                {quiz.title}
              </h1>
              <p className="text-sm text-slate-500">{quiz.description}</p>
              {attempts.length > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                  <span>Re-attempting (Practice Mode)</span>
                  <span>•</span>
                  <span>Official score locked at {officialScore} / {totalQuizMarks}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Questions</span>
                <span className="font-heading font-bold text-lg text-slate-800">
                  {questions.length}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Marks</span>
                <span className="font-heading font-bold text-lg text-slate-800">
                  {totalQuizMarks}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col items-center px-4 text-orange-600">
                <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Time
                </span>
                <span className="font-heading font-bold text-lg">{quiz.time_limit_minutes}m</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmittingAttempt}
              variant="destructive"
              className="rounded-full px-6 h-10 text-xs font-bold shadow-md shadow-red-500/20"
            >
              {isSubmittingAttempt ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Submitting &amp; Saving Score...
                </>
              ) : (
                'End Attempt & Submit'
              )}
            </Button>
          </div>

          {questions.length > 0 ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-heading font-bold text-lg text-slate-800">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <Badge className="bg-emerald-50 text-emerald-700 font-bold">
                  {currentQuestion.marks || 1} Marks
                </Badge>
              </div>

              <div className="space-y-6">
                <FormattedQuestionText
                  text={currentQuestion.question_text}
                  textClassName="text-lg font-medium text-slate-900 leading-relaxed"
                />

                <div className="space-y-3">
                  {currentQuestion.options.map((option: string, idx: number) => {
                    const isSelected = selectedOptions[currentQuestion.id] === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(currentQuestion.id, idx)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        } flex items-center gap-3`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
                <Button
                  variant="outline"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="rounded-full px-6 h-11 text-xs font-bold"
                >
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmittingAttempt}
                    className={`rounded-full px-8 h-11 text-xs font-bold shadow-lg transition-all ${
                      allAnswered
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {isSubmittingAttempt ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        Saving Score...
                      </>
                    ) : (
                      'Submit Quiz'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-8 h-11 text-xs font-bold"
                  >
                    Next Question
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-16 text-center shadow-xl border border-slate-100">
              <p className="text-slate-500">No questions found for this quiz.</p>
            </div>
          )}
        </>
      ) : (
        /* RESULTS VIEW */
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 text-center space-y-8 max-w-2xl mx-auto">
          <div className="space-y-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="font-heading font-extrabold text-3xl text-slate-900">
              Quiz Completed!
            </h2>
            <p className="text-slate-500">
              You have completed the quiz for{' '}
              <span className="font-bold text-slate-700">{quiz.title}</span>. Your score has been saved.
            </p>
          </div>

          {/* Score Display Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {/* Official 1st Attempt Score */}
            <div className="bg-emerald-50/80 rounded-3xl p-6 border border-emerald-200 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-2">
                <Award className="h-4 w-4 text-emerald-600" />
                <span>Official Score (1st Attempt)</span>
              </div>
              <div className="font-heading font-extrabold text-4xl text-emerald-700">
                {officialScore ?? score}{' '}
                <span className="text-xl text-emerald-500">/ {totalQuizMarks}</span>
              </div>
              <div className="text-[11px] text-emerald-600 mt-2 font-medium">
                {Math.round(((officialScore ?? score) / totalQuizMarks) * 100)}% Grade Saved
              </div>
            </div>

            {/* Total Attempts / Practice info */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col items-center justify-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {attempts.length > 1 ? 'Latest Attempt' : 'Attempt Count'}
              </div>
              <div className="font-heading font-extrabold text-4xl text-slate-800">
                {attempts.length > 1 && latestAttemptScore !== null ? (
                  <>
                    {latestAttemptScore}{' '}
                    <span className="text-xl text-slate-400">/ {totalQuizMarks}</span>
                  </>
                ) : (
                  <>
                    {Math.max(1, attempts.length)}{' '}
                    <span className="text-xl text-slate-400">attempt</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-2 font-medium">
                {attempts.length > 1 ? `Total attempts: ${attempts.length}` : 'First attempt locked as score'}
              </div>
            </div>
          </div>

          {allowReattempt && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed max-w-lg mx-auto">
              ℹ️ <strong>Multiple attempts enabled:</strong> You can re-take this quiz for further practice. Per grading policy, your <strong>1st attempt score ({officialScore ?? score}/{totalQuizMarks})</strong> is strictly preserved as your permanent grade.
            </div>
          )}

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push('/student/lectures')}
              className="rounded-full bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 font-bold w-full sm:w-auto"
            >
              Return to Course
            </Button>
            {allowReattempt && (
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setSelectedOptions({});
                  setCurrentQuestionIndex(0);
                }}
                variant="outline"
                className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 h-12 px-8 font-bold w-full sm:w-auto flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" />
                <span>Re-attempt Quiz (Practice)</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

```

### `src/app/student/grades/page.tsx`
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
  Award,
  Clock,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  FileImage,
  FileType2,
  File,
  TrendingUp,
  BarChart3,
  CalendarCheck,
  Calendar,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getMySubmissions, getStudentAttendanceSummary } from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default function GradesPage() {
  const { user } = useAuthUser();
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{
    records: any[];
    total: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    percentage: number;
  }>({
    records: [],
    total: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    percentage: 100,
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [subsData, attData] = await Promise.all([
          getMySubmissions(supabase),
          getStudentAttendanceSummary(supabase, user.id),
        ]);
        setSubmissions(subsData);
        setAttendance(attData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, supabase]);

  const gradedSubmissions = submissions.filter((s) => s.status === 'graded');
  const pendingSubmissions = submissions.filter((s) => s.status === 'submitted' || s.status === 'pending');

  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce((sum, s) => sum + (s.marks_obtained ?? 0), 0) /
            gradedSubmissions.length
        )
      : 0;

  const highestScore =
    gradedSubmissions.length > 0
      ? Math.max(...gradedSubmissions.map((s) => s.marks_obtained ?? 0))
      : 0;

  function getFileIcon(fileName: string) {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileType2 className="h-4 w-4 text-red-500" />;
    if (['jpg', 'jpeg', 'png'].includes(ext || ''))
      return <FileImage className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-slate-500" />;
  }

  function getScoreColor(marks: number, maxMarks: number) {
    const pct = (marks / maxMarks) * 100;
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 60) return 'text-blue-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-red-600';
  }

  /** Resolves a stored course-material path to a browser-accessible URL. */
  function resolveFileUrl(url?: string | null) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';
    return `${baseUrl}/storage/v1/object/public/course-materials/${url}`;
  }

  function getScoreBg(marks: number, maxMarks: number) {
    const pct = (marks / maxMarks) * 100;
    if (pct >= 80) return 'bg-emerald-50 border-emerald-200';
    if (pct >= 60) return 'bg-blue-50 border-blue-200';
    if (pct >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Grades, Feedback &amp; Attendance
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''} ·{' '}
          {gradedSubmissions.length} graded · Attendance Rate: {attendance.percentage}%
        </p>
      </div>

      {/* ========== OVERVIEW CARDS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-xs text-slate-500 font-bold uppercase">Average Score</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-slate-900">
            {gradedSubmissions.length > 0 ? `${averageScore}%` : '—'}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Award className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs text-slate-500 font-bold uppercase">Highest Score</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-slate-900">
            {gradedSubmissions.length > 0 ? highestScore : '—'}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xs text-slate-500 font-bold uppercase">Attendance</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-purple-700">
            {attendance.percentage}%
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-xs text-slate-500 font-bold uppercase">Pending Review</span>
          </div>
          <p className="font-display text-3xl font-extrabold text-slate-900">
            {pendingSubmissions.length}
          </p>
        </div>
      </div>

      {/* ========== TABS: ASSIGNMENT GRADES VS ATTENDANCE REGISTER ========== */}
      <Tabs defaultValue="grades" className="space-y-6">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200/80 inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="grades"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <Award className="h-3.5 w-3.5 mr-1.5" />
              Assignment Evaluations ({submissions.length})
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
              My Attendance History ({attendance.records.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: GRADES & FEEDBACK */}
        <TabsContent value="grades" className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No submissions yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Submit your homework sheets from the Assignments tab to receive grades and detailed teacher feedback.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.map((s) => {
                const isExpanded = expandedId === s.id;
                const maxMarks = s.assignments?.max_marks || 100;
                const isGraded = s.status === 'graded';
                const isNeedsResubmit = s.status === 'needs_resubmission';

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transition-all duration-200"
                  >
                    {/* Row Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="w-full px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Score Circle */}
                        <div
                          className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border ${
                            isGraded
                              ? getScoreBg(s.marks_obtained ?? 0, maxMarks)
                              : isNeedsResubmit
                              ? 'bg-rose-50 border-rose-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {isGraded ? (
                            <span
                              className={`font-heading text-lg font-extrabold ${getScoreColor(
                                s.marks_obtained ?? 0,
                                maxMarks
                              )}`}
                            >
                              {s.marks_obtained}
                            </span>
                          ) : isNeedsResubmit ? (
                            <AlertCircle className="h-5 w-5 text-rose-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate text-sm sm:text-base">
                            {s.assignments?.title || 'Assignment'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                              {s.assignments?.courses?.code}
                            </span>
                            {s.assignments?.course_chapters?.title && (
                              <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px] px-1.5 py-0 font-bold shadow-none">
                                {s.assignments.course_chapters.title}
                              </Badge>
                            )}
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-400">
                              Submitted {new Date(s.submitted_at).toLocaleDateString(undefined, {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {isGraded ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {s.marks_obtained}/{maxMarks}
                          </Badge>
                        ) : isNeedsResubmit ? (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-bold text-xs">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            Resubmission Required
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Awaiting Grade
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-0 border-t border-slate-100 bg-slate-50/40">
                        <div className="space-y-4 pt-4">
                          {/* Submitted File */}
                          {s.file_name && (
                            <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200/60">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {getFileIcon(s.file_name)}
                                <p className="text-xs font-semibold text-slate-800 truncate">
                                  {s.file_name}
                                </p>
                              </div>
                              {s.file_url && (
                                <a
                                  href={resolveFileUrl(s.file_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-emerald-600 hover:underline flex-shrink-0"
                                >
                                  View Submitted Paper
                                </a>
                              )}
                            </div>
                          )}

                          {/* Score Bar */}
                          {isGraded && (
                            <div>
                              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                <span>Score Obtained</span>
                                <span className="font-extrabold text-slate-900">
                                  {s.marks_obtained} / {maxMarks} (
                                  {Math.round((s.marks_obtained / maxMarks) * 100)}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                  style={{
                                    width: `${Math.round((s.marks_obtained / maxMarks) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Teacher Feedback Box */}
                          {s.feedback ? (
                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                              <div className="flex items-center gap-2 mb-1.5">
                                <MessageSquare className="h-4 w-4 text-emerald-600" />
                                <p className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                                  Faculty Evaluation &amp; Feedback
                                </p>
                              </div>
                              <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                {s.feedback}
                              </p>
                            </div>
                          ) : isGraded ? (
                            <p className="text-xs text-slate-400 italic">No remarks recorded by teacher.</p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              Submission uploaded. Your teacher is currently evaluating your solution sheet.
                            </p>
                          )}

                          {/* Action Banner if Resubmission Requested */}
                          {isNeedsResubmit && (
                            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                <p className="text-xs font-semibold text-rose-900">
                                  Your instructor requested revisions. Please review the feedback and submit an updated copy.
                                </p>
                              </div>
                              {s.assignment_id && (
                                <Link
                                  href={`/student/assignments/${s.assignment_id}`}
                                  className="text-xs font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-full shadow-sm shrink-0 transition-colors text-center"
                                >
                                  Resubmit Assignment →
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Checked Copy with Ticks & Annotations */}
                          {(s.checked_copy_url || s.checkedCopyUrl) && (
                            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Award className="h-5 w-5 text-orange-600 shrink-0" />
                                <div>
                                  <p className="text-xs font-extrabold text-orange-950">
                                    Checked copy returned
                                  </p>
                                </div>
                              </div>

                              <a
                                href={resolveFileUrl(s.checked_copy_url || s.checkedCopyUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition-all shrink-0"
                              >
                                View Checked Copy
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: ATTENDANCE HISTORY */}
        <TabsContent value="attendance" className="space-y-4">
          {attendance.records.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <CalendarCheck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No Attendance Records Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Your daily batch attendance marked by faculty will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-heading font-extrabold text-base text-slate-900">
                  Recorded Sessions ({attendance.records.length})
                </h3>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                  Overall: {attendance.percentage}% Present
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {attendance.records.map((rec) => (
                  <div
                    key={rec.id}
                    className="py-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        {rec.courses?.code} — {rec.courses?.title}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {new Date(rec.date).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {rec.remarks && ` • Remark: ${rec.remarks}`}
                      </div>
                    </div>

                    <Badge
                      className={`text-xs px-3 py-1 font-bold border-0 capitalize ${
                        rec.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.status === 'absent'
                          ? 'bg-red-100 text-red-800'
                          : rec.status === 'late'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {rec.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

```


---

## 9. Teacher Portal Routes

### `src/app/teacher/layout.tsx`
```tsx
'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  HelpCircle,
  CalendarCheck,
  Megaphone,
  LogOut,
  ChevronDown,
  GraduationCap,
  Sparkles,
  Menu,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/queries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FacultyNotificationBell } from '@/components/notifications/FacultyNotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

const UserContext = createContext<UserProfile | null>(null);
export const useTeacherUser = () => useContext(UserContext);

const navLinks = [
  { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Course Builder', href: '/teacher/courses', icon: Layers },
  { label: 'Grading Station', href: '/teacher/grading', icon: CheckSquare },
  { label: 'Quiz Engine', href: '/teacher/quizzes', icon: HelpCircle },
  { label: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck },
  { label: 'Announcements', href: '/teacher/announcements', icon: Megaphone },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUser(supabase);
        if (!profile) {
          router.push('/login?role=teacher');
          return;
        }
        setUser(profile);
      } catch {
        router.push('/login?role=teacher');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login?role=teacher');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Opening Faculty Console...</p>
        </div>
      </div>
    );
  }

  const initials =
    user?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'FC';

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-slate-50/80">
        {/* ========== TOP NAVIGATION ========== */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm shadow-slate-900/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Logo + Faculty Console Badge */}
              <div className="flex items-center gap-3">
                <Link href="/teacher/dashboard" className="flex items-center gap-2.5 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-heading font-extrabold text-base text-slate-900 leading-none flex items-center gap-1.5">
                      EduFlow
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block"></span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                      Faculty Portal
                    </span>
                  </div>
                </Link>

                <div className="hidden lg:flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80">
                  <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-xs font-bold text-orange-700">Faculty / Admin Mode</span>
                </div>
              </div>

              {/* Desktop Nav Tabs */}
              <div className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-full p-1 border border-slate-200/50">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || (pathname.startsWith(link.href + '/') && link.href !== '/teacher');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-orange-700 shadow-sm shadow-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                {/* Switch to Student Portal - Only on Dashboard */}
                {pathname === '/teacher/dashboard' && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-full border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 text-xs font-semibold h-8 px-3 gap-1 hidden sm:flex mr-2"
                  >
                    <Link href="/student/dashboard">
                      <span>Student View</span>
                      <ExternalLink className="h-3 w-3 text-slate-400" />
                    </Link>
                  </Button>
                )}

                {/* Real-time Faculty Notification Bell */}
                <FacultyNotificationBell />

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-100 transition-colors">
                      <Avatar className="h-8 w-8 border-2 border-orange-300">
                        <AvatarImage src={user?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-xs font-bold text-slate-800 max-w-[110px] truncate">
                        {user?.full_name || 'Faculty Member'}
                      </span>
                      <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 shadow-xl border-slate-200">
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{user?.full_name}</p>
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0 border-orange-200">
                          Faculty
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/student/dashboard"
                        className="rounded-xl text-slate-700 focus:bg-slate-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                      >
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                        Switch to Student View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/teacher/courses"
                        className="rounded-xl text-slate-700 focus:bg-slate-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                      >
                        <Layers className="h-4 w-4 text-orange-600" />
                        Manage Course Syllabus
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-xl text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign out of Faculty Console
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Toggle navigation"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl">
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || (pathname.startsWith(link.href + '/') && link.href !== '/teacher');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    href="/student/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50"
                  >
                    <span>Switch to Student View</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* ========== MAIN CONTENT CONTAINER ========== */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}

```

### `src/app/teacher/dashboard/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  HelpCircle,
  Layers,
  CalendarCheck,
  Megaphone,
  UploadCloud,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
  AlertCircle,
  CheckCircle2,
  Users,
  ChevronRight,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getTeacherDashboardStats,
  getAllSubmissions,
  getAnnouncements,
  getCourses,
} from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

export default function TeacherDashboardPage() {
  const { user } = useAuthUser();
  const supabase = createClient();

  const [stats, setStats] = useState({
    totalCourses: 0,
    totalQuizzes: 0,
    totalMaterials: 0,
    totalSubmissions: 0,
    pendingToGrade: 0,
    todayAttendanceCount: 0,
  });
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, submissionsData, announcementsData, coursesData] = await Promise.all([
        getTeacherDashboardStats(supabase),
        getAllSubmissions(supabase),
        getAnnouncements(supabase),
        getCourses(supabase),
      ]);

      setStats(statsData);
      setRecentSubmissions(submissionsData.slice(0, 5));
      setAnnouncements(announcementsData.slice(0, 3));
      setCourses(coursesData);
    } catch (err) {
      console.error('Error loading teacher dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Subscribe to real-time submission updates so when student submits, counter updates instantly
    const channel = supabase
      .channel('teacher-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quizzes' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  const firstName = user?.full_name?.split(' ')[0] || 'Professor';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* ============================================================
          TOP WELCOME HERO BANNER
          ============================================================ */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 p-8 sm:p-10 text-white shadow-2xl overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>EduFlow Academic Operations</span>
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight leading-tight">
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Manage classroom batches, grade pending homework sheets, publish MCQ test series, and log daily batch attendance.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/teacher/grading">
              <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-5 shadow-lg shadow-orange-600/30">
                <CheckSquare className="h-4 w-4 mr-1.5" />
                Grading Station
              </Button>
            </Link>
            <Link href="/teacher/quizzes">
              <Button variant="outline" className="rounded-full border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-white font-semibold text-xs h-10 px-4">
                <HelpCircle className="h-4 w-4 mr-1.5 text-orange-400" />
                New Quiz
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================
          METRIC STAT CARDS
          ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Pending Grading */}
        <Link href="/teacher/grading" className="group">
          <div className={`h-full bg-white rounded-3xl p-6 shadow-xl border transition-all duration-300 group-hover:-translate-y-1 ${
            stats.pendingToGrade > 0
              ? 'border-orange-200 shadow-orange-500/5 ring-2 ring-orange-500/20'
              : 'border-slate-100'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                stats.pendingToGrade > 0
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                <CheckSquare className="h-6 w-6" />
              </div>
              {stats.pendingToGrade > 0 && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                </span>
              )}
            </div>
            <div className="space-y-1">
              <div className="font-heading font-extrabold text-3xl text-slate-900">
                {loading ? '—' : stats.pendingToGrade}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Assignments to Grade
              </div>
              <div className="text-[11px] text-orange-600 font-semibold pt-1 flex items-center gap-1">
                <span>Evaluate submissions</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 2: Active Quizzes */}
        <Link href="/teacher/quizzes" className="group">
          <div className="h-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 transition-all duration-300 group-hover:-translate-y-1 hover:border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <HelpCircle className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-heading font-extrabold text-3xl text-slate-900">
                {loading ? '—' : stats.totalQuizzes}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Active Quizzes &amp; Tests
              </div>
              <div className="text-[11px] text-emerald-600 font-semibold pt-1 flex items-center gap-1">
                <span>Manage question bank</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 3: Classroom Batches */}
        <Link href="/teacher/courses" className="group">
          <div className="h-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 transition-all duration-300 group-hover:-translate-y-1 hover:border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-heading font-extrabold text-3xl text-slate-900">
                {loading ? '—' : stats.totalCourses}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Classroom Batches
              </div>
              <div className="text-[11px] text-blue-600 font-semibold pt-1 flex items-center gap-1">
                <span>{stats.totalMaterials} Syllabus PDFs uploaded</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 4: Today's Attendance */}
        <Link href="/teacher/attendance" className="group">
          <div className="h-full bg-white rounded-3xl p-6 shadow-xl border border-slate-100 transition-all duration-300 group-hover:-translate-y-1 hover:border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CalendarCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-heading font-extrabold text-3xl text-slate-900">
                {loading ? '—' : stats.todayAttendanceCount}
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Attendance Marked Today
              </div>
              <div className="text-[11px] text-purple-600 font-semibold pt-1 flex items-center gap-1">
                <span>Record batch attendance</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

      </div>

      {/* ============================================================
          TWO COLUMN SECTION: RECENT SUBMISSIONS & QUICK ACTIONS
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Recent Student Submissions Activity Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="font-heading font-extrabold text-lg text-slate-900">
                Recent Student Submissions
              </h2>
            </div>
            <Link href="/teacher/grading" className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
              View All Submissions <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-100/80 space-y-3.5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
                <span className="text-xs">Loading submission feed...</span>
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No submissions received yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  When students submit their assignment solutions or test papers, they will appear here in real-time for evaluation.
                </p>
              </div>
            ) : (
              recentSubmissions.map((sub) => {
                const isGraded = sub.status === 'graded';
                const studentName = sub.users?.full_name || 'Enrolled Student';
                const initials = studentName
                  .split(' ')
                  .map((n: string) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div
                    key={sub.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/80 hover:bg-orange-50/40 border border-slate-200/60 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-orange-200">
                        <AvatarImage src={sub.users?.avatar_url} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {studentName}
                          </span>
                          <Badge
                            className={`text-[10px] px-2 py-0 font-bold border-0 ${
                              isGraded
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-orange-100 text-orange-700'
                            }`}
                          >
                            {isGraded ? 'Graded' : 'Needs Grading'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-md">
                          {sub.assignments?.title} • <span className="text-slate-700 font-semibold">{sub.assignments?.courses?.code}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-200/60">
                      {isGraded && sub.marks_obtained !== null && (
                        <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          {sub.marks_obtained} / {sub.assignments?.max_marks || 100}
                        </span>
                      )}
                      <Link href={`/teacher/grading/${sub.id}`}>
                        <Button
                          size="sm"
                          className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-8 px-3.5 shadow-sm shadow-orange-600/20"
                        >
                          {isGraded ? 'Review' : 'Grade Paper'}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Quick Action Hub & Batch Overview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Actions Card */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100/80 space-y-4">
            <h3 className="font-heading font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-600" />
              Faculty Fast Tools
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/teacher/quizzes">
                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-100 hover:bg-orange-100/70 transition-all cursor-pointer space-y-1 text-left">
                  <HelpCircle className="h-5 w-5 text-orange-600" />
                  <div className="font-bold text-xs text-slate-900">Create Quiz</div>
                  <div className="text-[10px] text-slate-500">Add MCQs &amp; timers</div>
                </div>
              </Link>

              <Link href="/teacher/courses">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 hover:bg-emerald-100/70 transition-all cursor-pointer space-y-1 text-left">
                  <UploadCloud className="h-5 w-5 text-emerald-600" />
                  <div className="font-bold text-xs text-slate-900">Upload PDF</div>
                  <div className="text-[10px] text-slate-500">Syllabus &amp; Notes</div>
                </div>
              </Link>

              <Link href="/teacher/attendance">
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 hover:bg-purple-100/70 transition-all cursor-pointer space-y-1 text-left">
                  <CalendarCheck className="h-5 w-5 text-purple-600" />
                  <div className="font-bold text-xs text-slate-900">Log Attendance</div>
                  <div className="text-[10px] text-slate-500">Batch daily register</div>
                </div>
              </Link>

              <Link href="/teacher/announcements">
                <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 hover:bg-blue-100/70 transition-all cursor-pointer space-y-1 text-left">
                  <Megaphone className="h-5 w-5 text-blue-600" />
                  <div className="font-bold text-xs text-slate-900">Broadcast Notice</div>
                  <div className="text-[10px] text-slate-500">Notify batch students</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Active Batches Mini-List */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                Assigned Batches
              </h3>
              <Link href="/teacher/courses" className="text-xs font-bold text-orange-600 hover:text-orange-700">
                Manage
              </Link>
            </div>

            <div className="space-y-2.5">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/teacher/courses/${course.id}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 transition-colors group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-900 group-hover:text-orange-600 transition-colors">
                      {course.title}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-400">
                      Code: {course.code}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

```

### `src/app/teacher/courses/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Video,
  FileText,
  UploadCloud,
  ChevronRight,
  BookOpen,
  Sparkles,
  Loader2,
  Calendar,
  Settings2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  createCourse,
  deleteCourse,
  getLectures,
  getCourseMaterials,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface CourseWithCounts {
  id: string;
  title: string;
  code: string;
  description: string;
  created_at: string;
  lecturesCount: number;
  materialsCount: number;
}

export default function TeacherCoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<CourseWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  // New Course Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Course State
  const [courseToDelete, setCourseToDelete] = useState<CourseWithCounts | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const rawCourses = await getCourses(supabase);
      const [allLectures, allMaterials] = await Promise.all([
        getLectures(supabase),
        getCourseMaterials(supabase),
      ]);

      const enriched: CourseWithCounts[] = rawCourses.map((c) => ({
        ...c,
        lecturesCount: allLectures.filter((l) => l.course_id === c.id).length,
        materialsCount: allMaterials.filter((m) => m.course_id === c.id).length,
      }));

      setCourses(enriched);
    } catch (err: any) {
      toast.error('Failed to load courses', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) {
      toast.error('Please enter course title and code');
      return;
    }

    try {
      setIsSubmitting(true);
      await createCourse(supabase, {
        title: newTitle.trim(),
        code: newCode.trim().toUpperCase(),
        description: newDescription.trim(),
      });

      toast.success('Classroom batch created successfully!');
      setNewTitle('');
      setNewCode('');
      setNewDescription('');
      setIsDialogOpen(false);
      loadCourses();
    } catch (err: any) {
      toast.error('Could not create batch', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCourse(supabase, courseToDelete.id);
      toast.success(`Classroom batch "${courseToDelete.title}" deleted successfully`);
      setCourseToDelete(null);
      loadCourses();
    } catch (err: any) {
      toast.error('Failed to delete classroom batch', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header with Title & Add Batch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Course Builder &amp; Syllabi
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Structure video modules, upload syllabus documents and formula sheets for each classroom batch.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-5 shadow-lg shadow-orange-600/25">
              <Plus className="h-4 w-4 mr-1.5" />
              Add New Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
                Create Classroom Batch
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Define the curriculum code and title for this batch.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateCourse} className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-700">
                  Course Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Physics - Mechanics & Waves"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-2xl h-11 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-bold text-slate-700">
                  Batch Code (e.g. PHY-202)
                </Label>
                <Input
                  id="code"
                  placeholder="e.g. PHY-202"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="rounded-2xl h-11 text-xs uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-bold text-slate-700">
                  Description / Objective
                </Label>
                <Textarea
                  id="desc"
                  placeholder="Target exams: JEE Advanced 2026, NEET UG..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="rounded-2xl min-h-[80px] text-xs resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-11 shadow-lg shadow-orange-600/25"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Batch...
                  </span>
                ) : (
                  'Create Classroom Batch'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading classroom batches...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-4">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="font-heading font-extrabold text-lg text-slate-900">No Batches Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &quot;Add New Batch&quot; above to create your first classroom batch and start uploading modules and PDF study materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:border-orange-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-50 text-orange-700 border-orange-200/80 font-bold text-xs px-2.5 py-0.5 rounded-full">
                      {course.code}
                    </Badge>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {new Date(course.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCourseToDelete(course);
                    }}
                    className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="Delete classroom batch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h3 className="font-heading font-extrabold text-lg text-slate-900 group-hover:text-orange-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {course.description || 'Comprehensive curriculum with video lectures and downloadable notes.'}
                  </p>
                </div>

                {/* Counts Summary */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50">
                    <Video className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{course.lecturesCount}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Lectures</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{course.materialsCount}</div>
                      <div className="text-[10px] text-slate-400 font-medium">PDF Notes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-2">
                <Link href={`/teacher/courses/${course.id}`}>
                  <Button className="w-full rounded-full bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs h-10 shadow-md transition-all group-hover:bg-orange-600 flex items-center justify-between px-4">
                    <span>Manage Curriculum &amp; Uploads</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Batch Confirmation Dialog */}
      <Dialog
        open={!!courseToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setCourseToDelete(null);
        }}
      >
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-1">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
              Delete Classroom Batch?
            </DialogTitle>
            <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-bold">{courseToDelete?.title}</strong>{' '}
                <span className="text-orange-600 font-bold">({courseToDelete?.code})</span>?
              </p>
              <div className="rounded-2xl bg-red-50/90 border border-red-200 p-3 text-red-800 text-[11px] space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-red-900">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Final Confirmation Required</span>
                </p>
                <p className="leading-normal">
                  This will permanently erase all video lectures, PDF syllabi & notes, quizzes, student assignments, submissions, and attendance records associated with this batch.
                </p>
                <p className="font-bold text-red-700">
                  This action is irreversible and cannot be undone.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCourseToDelete(null)}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 px-4 h-9"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting Batch...
                </span>
              ) : (
                'Yes, Permanently Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

```

### `src/app/teacher/courses/[courseId]/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Video,
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  FileCheck,
  Sparkles,
  BookOpen,
  Eye,
  AlertCircle,
  Clock,
  X,
  Upload,
  HardDrive,
  Link2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourseById,
  deleteCourse,
  getLectures,
  createLecture,
  deleteLecture,
  reorderLectures,
  getCourseMaterials,
  uploadCourseMaterial,
  deleteCourseMaterial,
  getAssignments,
  createAssignment,
  deleteAssignment,
  createNotification,
  uploadLectureVideo,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChapterSelect } from '@/components/chapters/ChapterSelect';

export const dynamic = 'force-dynamic';

export default function CourseBuilderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  const supabase = createClient();

  const [course, setCourse] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete Batch State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);

  // New Lecture Dialog State
  const [isLectureDialogOpen, setIsLectureDialogOpen] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureVideoSource, setLectureVideoSource] = useState<'upload' | 'gdrive' | 'url'>('upload');
  const [lectureVideoUrl, setLectureVideoUrl] = useState('');
  const [lectureGDriveUrl, setLectureGDriveUrl] = useState('');
  const [lectureVideoFile, setLectureVideoFile] = useState<File | null>(null);
  const [lectureNotesUrl, setLectureNotesUrl] = useState('');
  const [lectureChapterId, setLectureChapterId] = useState<string | null>(null);
  const [isAddingLecture, setIsAddingLecture] = useState(false);
  const lectureFileInputRef = useRef<HTMLInputElement>(null);

  const handleLectureFileSelect = (file: File) => {
    const validExts = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.avi', '.m4v'];
    const lower = file.name.toLowerCase();
    const isValid = validExts.some((ext) => lower.endsWith(ext)) || file.type.startsWith('video/');
    if (!isValid) {
      toast.error('Unsupported video format', {
        description: 'Please upload an MP4, WebM, MOV, or MKV video file.',
      });
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum video upload size is 500 MB. For larger videos, use Google Drive or YouTube.',
      });
      return;
    }
    setLectureVideoFile(file);
    setLectureTitle((prev) => {
      if (!prev.trim()) {
        return file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return prev;
    });
    toast.success(`Selected video: ${file.name}`);
  };

  // Upload Material State
  const [isUploading, setIsUploading] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [materialChapterId, setMaterialChapterId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Assignment State
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState(100);
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [assignmentChapterId, setAssignmentChapterId] = useState<string | null>(null);
  const assignmentFileInputRef = useRef<HTMLInputElement>(null);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [isAssignmentDragging, setIsAssignmentDragging] = useState(false);
  const [isTabDragging, setIsTabDragging] = useState(false);

  const handleAssignmentFileDrop = useCallback((file: File) => {
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.doc'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isValid) {
      toast.error('Unsupported file format', {
        description: 'Please upload a PDF document or JPG/PNG scan image.',
      });
      return false;
    }
    if (file.size > 30 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'Maximum file size allowed is 30 MB.',
      });
      return false;
    }
    setAssignmentFile(file);
    setAssignmentTitle((prevTitle) => {
      if (!prevTitle.trim()) {
        return file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[_-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return prevTitle;
    });
    toast.success(`Attached question paper: ${file.name}`);
    return true;
  }, []);

  const loadData = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const [courseData, lecturesData, materialsData, assignmentsData] = await Promise.all([
        getCourseById(supabase, courseId),
        getLectures(supabase, courseId),
        getCourseMaterials(supabase, courseId),
        getAssignments(supabase, courseId),
      ]);

      setCourse(courseData);
      setLectures(lecturesData);
      setMaterials(materialsData);
      setAssignments(assignmentsData);
    } catch (err: any) {
      toast.error('Failed to load course details', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [courseId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Lecture
  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureTitle.trim()) {
      toast.error('Please enter lecture title');
      return;
    }

    let finalVideoUrl = '';

    if (lectureVideoSource === 'upload') {
      if (!lectureVideoFile) {
        toast.error('Please choose a video file from your device');
        return;
      }
      try {
        setIsAddingLecture(true);
        toast.info('Uploading lecture video to cloud storage... Please keep this page open.');
        const { publicUrl } = await uploadLectureVideo(supabase, courseId, lectureVideoFile);
        finalVideoUrl = publicUrl;
      } catch (upErr: any) {
        toast.error('Video upload failed', {
          description: upErr.message || 'Storage error while saving video',
        });
        setIsAddingLecture(false);
        return;
      }
    } else if (lectureVideoSource === 'gdrive') {
      if (!lectureGDriveUrl.trim()) {
        toast.error('Please enter Google Drive video share link');
        return;
      }
      const rawUrl = lectureGDriveUrl.trim();
      const driveMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        finalVideoUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      } else {
        finalVideoUrl = rawUrl;
      }
    } else {
      if (!lectureVideoUrl.trim()) {
        toast.error('Please enter video URL');
        return;
      }
      finalVideoUrl = lectureVideoUrl.trim();
    }

    try {
      setIsAddingLecture(true);
      const newOrderIndex = lectures.length + 1;
      await createLecture(supabase, {
        course_id: courseId,
        title: lectureTitle.trim(),
        video_url: finalVideoUrl,
        notes_url: lectureNotesUrl.trim() || undefined,
        order_index: newOrderIndex,
        chapter_id: lectureChapterId,
      });

      // Send notification to students
      try {
        await createNotification(supabase, {
          type: 'lecture_created',
          title: `New Lecture: ${lectureTitle.trim()}`,
          message: `A new video lecture has been added to ${course?.code || 'your course'}.`,
        });
      } catch {
        // notification non-blocking
      }

      toast.success('Lecture module added successfully!');
      setLectureTitle('');
      setLectureVideoUrl('');
      setLectureGDriveUrl('');
      setLectureVideoFile(null);
      setLectureNotesUrl('');
      setIsLectureDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Failed to add lecture', { description: err.message });
    } finally {
      setIsAddingLecture(false);
    }
  };

  // Handle Delete Lecture
  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm('Are you sure you want to remove this lecture?')) return;
    
    // 1. Optimistically update local state immediately so the faculty sees the list updated
    const remaining = lectures.filter((l) => l.id !== lectureId);
    const reindexed = remaining.map((l, i) => ({ ...l, order_index: i + 1 }));
    setLectures(reindexed);

    try {
      // 2. Delete lecture from database
      await deleteLecture(supabase, lectureId);
      
      // 3. Persist reordered sequential indices (1, 2, 3...) to database
      if (reindexed.length > 0) {
        const updates = reindexed.map((l, i) => ({ id: l.id, order_index: i + 1 }));
        await reorderLectures(supabase, updates);
      }
      
      toast.success('Lecture removed');
      loadData();
    } catch (err: any) {
      toast.error('Failed to remove lecture', { description: err.message });
      loadData();
    }
  };

  // Handle Delete Entire Classroom Batch
  const handleDeleteCourse = async () => {
    if (!courseId) return;
    try {
      setIsDeletingCourse(true);
      await deleteCourse(supabase, courseId);
      toast.success(`Classroom batch "${course?.title || 'Batch'}" deleted successfully`);
      router.push('/teacher/courses');
    } catch (err: any) {
      toast.error('Failed to delete classroom batch', { description: err.message });
      setIsDeletingCourse(false);
    }
  };

  // Handle Move Lecture Up / Down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lectures.length) return;

    const newLectures = [...lectures];
    const temp = newLectures[index];
    newLectures[index] = newLectures[targetIndex];
    newLectures[targetIndex] = temp;

    // Update order_index in state immediately
    const updates = newLectures.map((l, i) => ({ id: l.id, order_index: i + 1 }));
    setLectures(newLectures);

    try {
      await reorderLectures(supabase, updates);
      toast.success('Lectures reordered');
    } catch (err: any) {
      toast.error('Failed to save order', { description: err.message });
      loadData();
    }
  };

  // Handle Material Upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      await uploadCourseMaterial(
        supabase,
        courseId,
        selectedFile,
        materialTitle.trim() || selectedFile.name,
        materialChapterId
      );

      toast.success('Syllabus PDF / Material uploaded successfully!');
      setSelectedFile(null);
      setMaterialTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
    } catch (err: any) {
      toast.error('Upload failed', { description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Material Delete
  const handleDeleteMaterial = async (materialId: string, fileUrl: string) => {
    if (!confirm('Delete this study material?')) return;
    try {
      // Extract path if possible
      let filePath = '';
      try {
        const urlObj = new URL(fileUrl);
        filePath = urlObj.pathname.split('course-materials/')[1] || '';
      } catch {}

      await deleteCourseMaterial(supabase, materialId, filePath);
      toast.success('Material deleted');
      loadData();
    } catch (err: any) {
      toast.error('Could not delete material', { description: err.message });
    }
  };

  // Handle Create Assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentTitle.trim()) {
      toast.error('Please enter an assignment title');
      return;
    }

    try {
      setIsCreatingAssignment(true);
      let finalDescription = assignmentDescription.trim();

      // Safe date parsing with 7-day fallback if malformed
      let parsedDueDate: string;
      try {
        if (!assignmentDueDate) throw new Error('Due date required');
        const d = new Date(assignmentDueDate);
        if (isNaN(d.getTime())) throw new Error('Invalid date');
        parsedDueDate = d.toISOString();
      } catch {
        const fallback = new Date();
        fallback.setDate(fallback.getDate() + 7);
        parsedDueDate = fallback.toISOString();
      }

      const safeMarks = Number(assignmentMaxMarks) > 0 ? Number(assignmentMaxMarks) : 100;

      // Handle optional file attachment upload
      if (assignmentFile) {
        try {
          const sanitizedFileName = assignmentFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const filePath = `assignments/${courseId}/${Date.now()}_${sanitizedFileName}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('course-materials')
            .upload(filePath, assignmentFile, {
              cacheControl: '3600',
              upsert: true,
            });

          if (uploadError) {
            console.warn('Assignment attachment upload warning:', uploadError.message);
            toast.warning('Attachment upload issue, continuing with assignment creation...');
          } else if (uploadData?.path) {
            const { data: { publicUrl } } = supabase.storage
              .from('course-materials')
              .getPublicUrl(uploadData.path);
            finalDescription += `\n\n[ATTACHMENT:${publicUrl}]`;
          }
        } catch (uploadErr: any) {
          console.warn('Attachment upload failed:', uploadErr);
        }
      }

      const newAssignment = await createAssignment(supabase, {
        course_id: courseId,
        title: assignmentTitle.trim(),
        description: finalDescription,
        due_date: parsedDueDate,
        max_marks: safeMarks,
        chapter_id: assignmentChapterId,
      });

      // Fire assignment_created notification
      try {
        await createNotification(supabase, {
          type: 'assignment_created',
          title: 'New Assignment Published',
          message: `A new assignment "${assignmentTitle.trim()}" has been published in ${course?.title || 'a batch'}.`,
          data: {
            assignment_id: newAssignment.id,
            course_id: courseId,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire assignment notification:', notifErr);
      }

      toast.success('Assignment created successfully!');
      setAssignmentTitle('');
      setAssignmentDescription('');
      setAssignmentDueDate('');
      setAssignmentMaxMarks(100);
      setAssignmentFile(null);
      setIsAssignmentDialogOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Assignment create error:', err);
      toast.error('Failed to create assignment', {
        description: err.message || 'Please check your inputs and permissions',
      });
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  // Handle Delete Assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await deleteAssignment(supabase, assignmentId);
      toast.success('Assignment deleted');
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete assignment', { description: err.message });
    }
  };

  if (loading && !course) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading course builder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href="/teacher/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to All Batches
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {course?.title || 'Classroom Batch'}
            </h1>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
              {course?.code}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {course?.description || 'Manage lecture video links, notes documents, and syllabus PDFs for enrolled students.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/student/lectures" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-slate-300 text-slate-700 text-xs font-semibold h-9"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              Preview as Student
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs font-semibold h-9 shadow-xs"
            title="Delete Classroom Batch"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete Batch
          </Button>
        </div>
      </div>

      {/* Tabs for Lecture Modules vs Syllabus Materials */}
      <Tabs defaultValue="lectures" className="space-y-6">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200/80 inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="lectures"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm"
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Lecture Modules ({lectures.length})
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF Notes &amp; Syllabus ({materials.length})
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm"
            >
              <FileCheck className="h-3.5 w-3.5 mr-1.5" />
              Assignments ({assignments.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================
            TAB 1: LECTURE MODULES MANAGER
            ============================================================ */}
        <TabsContent value="lectures" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading font-extrabold text-lg text-slate-900">
                Course Video Modules
              </h2>
              <p className="text-xs text-slate-500">
                Organize the order of recorded lectures and interactive video archives.
              </p>
            </div>

            <Dialog open={isLectureDialogOpen} onOpenChange={setIsLectureDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 shadow-md shadow-orange-600/20">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Lecture Module
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl p-5 sm:p-8 max-w-lg max-h-[88dvh] overflow-y-auto w-[calc(100%-1.5rem)] sm:w-full">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
                    Add Lecture to {course?.code}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Add video content from your device, Google Drive, or streaming links.
                  </p>
                </DialogHeader>

                <form onSubmit={handleAddLecture} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="lecTitle" className="text-xs font-bold text-slate-700">
                      Lecture Title
                    </Label>
                    <Input
                      id="lecTitle"
                      placeholder="e.g. Chapter 4: Electric Potential & Capacitance"
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      className="rounded-2xl h-11 text-base sm:text-xs"
                      required
                    />
                  </div>

                  {/* Video Source Selector */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700">
                      Video Source
                    </Label>
                    <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setLectureVideoSource('upload')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                          lectureVideoSource === 'upload'
                            ? 'bg-white text-orange-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        <span>Local Device</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLectureVideoSource('gdrive')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                          lectureVideoSource === 'gdrive'
                            ? 'bg-white text-orange-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <HardDrive className="h-3.5 w-3.5" />
                        <span>Google Drive</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLectureVideoSource('url')}
                        className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
                          lectureVideoSource === 'url'
                            ? 'bg-white text-orange-700 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        <span>Web URL</span>
                      </button>
                    </div>

                    {/* Tab 1: Local Device File Upload */}
                    {lectureVideoSource === 'upload' && (
                      <div className="space-y-2 pt-1">
                        <input
                          id="lecture-video-input"
                          ref={lectureFileInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv,video/*"
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLectureFileSelect(file);
                          }}
                        />
                        {lectureVideoFile ? (
                          <div className="flex items-center justify-between p-3 bg-orange-50/50 border border-orange-200 rounded-2xl">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                                <Video className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {lectureVideoFile.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {(lectureVideoFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to upload
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLectureVideoFile(null);
                                if (lectureFileInputRef.current) lectureFileInputRef.current.value = '';
                              }}
                              className="text-slate-400 hover:text-red-600 h-8 w-8 p-0 rounded-full"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <label
                            htmlFor="lecture-video-input"
                            className="block border-2 border-dashed border-slate-200 hover:border-orange-400 bg-slate-50/50 hover:bg-orange-50/20 rounded-2xl p-5 text-center cursor-pointer transition-all active:bg-orange-50/40"
                          >
                            <Upload className="h-7 w-7 text-orange-500 mx-auto mb-1.5" />
                            <p className="text-xs font-bold text-slate-700">
                              Tap here to choose video from device
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              MP4, WebM, MOV, or MKV (up to 500 MB)
                            </p>
                          </label>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Google Drive */}
                    {lectureVideoSource === 'gdrive' && (
                      <div className="space-y-2 pt-1">
                        <Input
                          placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                          value={lectureGDriveUrl}
                          onChange={(e) => setLectureGDriveUrl(e.target.value)}
                          className="rounded-2xl h-11 text-base sm:text-xs"
                          required={lectureVideoSource === 'gdrive'}
                        />
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-2.5 text-[11px] text-blue-700 leading-relaxed">
                          <p className="font-bold flex items-center gap-1 mb-0.5">
                            <HardDrive className="h-3 w-3 shrink-0" /> Google Drive Link Sharing
                          </p>
                          Ensure file permission in Google Drive is set to <strong>&ldquo;Anyone with the link can view&rdquo;</strong>. The URL is automatically converted to an embeddable player for students.
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Web URL / YouTube / Vimeo */}
                    {lectureVideoSource === 'url' && (
                      <div className="space-y-2 pt-1">
                        <Input
                          placeholder="https://www.youtube.com/watch?v=... or Vimeo / direct MP4 link"
                          value={lectureVideoUrl}
                          onChange={(e) => setLectureVideoUrl(e.target.value)}
                          className="rounded-2xl h-11 text-base sm:text-xs"
                          required={lectureVideoSource === 'url'}
                        />
                        <p className="text-[10px] text-slate-400">
                          Supports YouTube, Vimeo, Loom, or direct .mp4 streaming links.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Chapter / Module
                    </Label>
                    <ChapterSelect
                      supabase={supabase}
                      courseId={courseId}
                      value={lectureChapterId}
                      onChange={setLectureChapterId}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notesUrl" className="text-xs font-bold text-slate-700">
                      Accompanying Handout / Notes URL (Optional)
                    </Label>
                    <Input
                      id="notesUrl"
                      placeholder="https://drive.google.com/... or Supabase PDF link"
                      value={lectureNotesUrl}
                      onChange={(e) => setLectureNotesUrl(e.target.value)}
                      className="rounded-2xl h-11 text-base sm:text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isAddingLecture}
                    className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm h-11 sm:h-12 shadow-lg shadow-orange-600/25"
                  >
                    {isAddingLecture ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {lectureVideoSource === 'upload' ? 'Uploading Video & Saving...' : 'Saving Lecture...'}
                      </span>
                    ) : (
                      'Save & Publish Lecture'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {lectures.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-xl border border-slate-100 space-y-3">
              <Video className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                No Lectures in this Batch
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click &quot;Add Lecture Module&quot; above to create your first class video entry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lectures.map((lecture, idx) => (
                <div
                  key={lecture.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Move Up/Down Controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === lectures.length - 1}
                        className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 border-2 border-emerald-400/60 flex items-center justify-center font-black text-sm shadow-sm shrink-0">
                      {idx + 1}
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-heading font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        {lecture.title}
                        {lecture.course_chapters?.title && (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0 border-orange-200 shadow-none font-bold">
                            {lecture.course_chapters.title}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="truncate max-w-[200px] sm:max-w-xs text-slate-400">
                          {lecture.video_url || 'Embedded stream'}
                        </span>
                        {lecture.notes_url && (
                          <a
                            href={lecture.notes_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-600 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <FileText className="h-3 w-3" />
                            PDF Notes
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <button
                      onClick={() => handleDeleteLecture(lecture.id)}
                      className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Lecture"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================================
            TAB 2: PDF & STUDY MATERIAL UPLOADER
            ============================================================ */}
        <TabsContent value="materials" className="space-y-8">
          
          {/* Stylized Dropzone Upload Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100/80 space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-orange-600" />
                Upload Syllabus PDFs &amp; Formula Handouts
              </h2>
              <p className="text-xs text-slate-500">
                Uploaded files are stored in the secure Supabase storage bucket &quot;course-materials&quot; and made available to all enrolled batch students.
              </p>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              
              {/* Dropzone Box with Native Label Trigger for Mobile */}
              <label
                htmlFor="course-material-upload"
                className={`block border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all active:bg-orange-50/40 ${
                  selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50/20'
                }`}
              >
                <input
                  id="course-material-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  className="sr-only"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setSelectedFile(file);
                      if (!materialTitle) setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <FileCheck className="h-10 w-10 text-emerald-600 mx-auto" />
                    <div className="font-bold text-sm sm:text-base text-slate-900 break-all">{selectedFile.name}</div>
                    <div className="text-xs text-slate-500 font-medium">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                    </div>
                    <span className="inline-block text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full hover:underline">
                      Tap to choose another file
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <UploadCloud className="h-10 w-10 text-orange-500 mx-auto" />
                    <div>
                      <div className="font-bold text-sm sm:text-base text-slate-800">
                        Tap here to select PDF, Notes or Photo from your device
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Supports PDF, DOCX, PNG, JPG (Max 50MB)
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-600 text-white font-bold text-xs shadow-sm hover:bg-orange-700 transition-colors">
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Browse Device / Mobile Files</span>
                    </div>
                  </div>
                )}
              </label>

              {/* Title Input & Upload CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4 space-y-1.5">
                  <Label htmlFor="matTitle" className="text-xs font-bold text-slate-700">
                    Document Title / Label
                  </Label>
                  <Input
                    id="matTitle"
                    placeholder="e.g. Complete Mechanics Formula Sheet 2026"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    className="rounded-2xl h-11 text-base sm:text-xs"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Chapter / Module
                  </Label>
                  <ChapterSelect
                    supabase={supabase}
                    courseId={courseId}
                    value={materialChapterId}
                    onChange={setMaterialChapterId}
                    className="h-11"
                  />
                </div>

                <div className="sm:col-span-4">
                  <Button
                    type="submit"
                    disabled={!selectedFile || isUploading}
                    className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm h-11 sm:h-12 shadow-lg shadow-orange-600/25 disabled:opacity-50 transition-all"
                  >
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading PDF...
                      </span>
                    ) : (
                      'Upload Material'
                    )}
                  </Button>
                </div>
              </div>

            </form>
          </div>

          {/* Uploaded Materials Repository */}
          <div className="space-y-4">
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              Uploaded Study Materials ({materials.length})
            </h3>

            {materials.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-100 text-slate-400 text-xs">
                No syllabus documents or reference files uploaded for this batch yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-orange-200 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate flex items-center gap-2">
                          {mat.title}
                          {mat.course_chapters?.title && (
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0 border-orange-200 shadow-none font-bold">
                              {mat.course_chapters.title}
                            </Badge>
                          )}
                        </h4>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {mat.file_type?.toUpperCase() || 'PDF'} • {new Date(mat.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <a
                        href={mat.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      <button
                        onClick={() => handleDeleteMaterial(mat.id, mat.file_url)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Material"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </TabsContent>

        {/* ============================================================
            TAB 3: ASSIGNMENTS
            ============================================================ */}
        <TabsContent value="assignments" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading font-extrabold text-lg text-slate-900">
                Assignments
              </h2>
              <p className="text-xs text-slate-500">
                Create assignments and upload attachments for students to complete.
              </p>
            </div>

            <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 shadow-md shadow-orange-600/20">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Create Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl p-5 sm:p-8 max-w-lg max-h-[88dvh] overflow-y-auto w-[calc(100%-1.5rem)] sm:w-full">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
                    Create Assignment
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Set a due date, max marks, and upload an optional attachment.
                  </p>
                </DialogHeader>

                <form onSubmit={handleCreateAssignment} className="space-y-4 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="assignTitle" className="text-xs font-bold text-slate-700">
                      Title
                    </Label>
                    <Input
                      id="assignTitle"
                      placeholder="e.g. Chapter 4 Practice Sheet"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      className="rounded-2xl h-11 text-base sm:text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">
                      Chapter / Module
                    </Label>
                    <ChapterSelect
                      supabase={supabase}
                      courseId={courseId}
                      value={assignmentChapterId}
                      onChange={setAssignmentChapterId}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="assignDesc" className="text-xs font-bold text-slate-700">
                      Instructions
                    </Label>
                    <textarea
                      id="assignDesc"
                      placeholder="Instructions for the assignment..."
                      value={assignmentDescription}
                      onChange={(e) => setAssignmentDescription(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base sm:text-xs h-24 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="assignDueDate" className="text-xs font-bold text-slate-700">
                        Due Date
                      </Label>
                      <Input
                        id="assignDueDate"
                        type="datetime-local"
                        value={assignmentDueDate}
                        onChange={(e) => setAssignmentDueDate(e.target.value)}
                        className="rounded-2xl h-11 text-base sm:text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="assignMaxMarks" className="text-xs font-bold text-slate-700">
                        Max Marks
                      </Label>
                      <Input
                        id="assignMaxMarks"
                        type="number"
                        min="1"
                        value={assignmentMaxMarks}
                        onChange={(e) => setAssignmentMaxMarks(Number(e.target.value))}
                        className="rounded-2xl h-11 text-base sm:text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Question Paper / Attachment (PDF or Image)</span>
                      <span className="text-[10px] font-medium text-slate-400">
                        Optional
                      </span>
                    </Label>

                    {/* Drag and Drop Zone with Native Label for Mobile */}
                    <label
                      htmlFor="assignment-paper-file"
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAssignmentDragging(true);
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAssignmentDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAssignmentDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAssignmentDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleAssignmentFileDrop(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`block relative border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 active:bg-orange-50/40 ${
                        isAssignmentDragging
                          ? 'border-orange-500 bg-orange-50/90 scale-[1.01] shadow-md shadow-orange-500/10'
                          : assignmentFile
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-slate-200 bg-slate-50/60 hover:border-orange-300 hover:bg-orange-50/25'
                      }`}
                    >
                      <input
                        id="assignment-paper-file"
                        ref={assignmentFileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx,application/pdf,image/*"
                        className="sr-only"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleAssignmentFileDrop(e.target.files[0]);
                          }
                        }}
                      />

                      {assignmentFile ? (
                        <div className="flex items-center justify-between gap-3 text-left">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <FileCheck className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {assignmentFile.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-medium">
                                {(assignmentFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to attach
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              Attached
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setAssignmentFile(null);
                                if (assignmentFileInputRef.current) {
                                  assignmentFileInputRef.current.value = '';
                                }
                              }}
                              className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title="Remove attachment"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5 py-2">
                          <UploadCloud
                            className={`h-8 w-8 mx-auto transition-colors ${
                              isAssignmentDragging
                                ? 'text-orange-600 animate-bounce'
                                : 'text-slate-400'
                            }`}
                          />
                          <p className="text-xs font-bold text-slate-800">
                            Tap to attach question paper or assignment document
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Supports PDF, DOCX, PNG, JPG (up to 30MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  <Button
                    type="submit"
                    disabled={isCreatingAssignment}
                    className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs sm:text-sm h-11 sm:h-12 shadow-lg shadow-orange-600/25 mt-2"
                  >
                    {isCreatingAssignment ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </span>
                    ) : (
                      'Create Assignment'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Quick Drag & Drop Zone to Create Assignment */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsTabDragging(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsTabDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsTabDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsTabDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                const ok = handleAssignmentFileDrop(e.dataTransfer.files[0]);
                if (ok) {
                  setIsAssignmentDialogOpen(true);
                }
              }
            }}
            onClick={() => setIsAssignmentDialogOpen(true)}
            className={`border-2 border-dashed rounded-3xl p-5 sm:p-6 text-center cursor-pointer transition-all duration-200 ${
              isTabDragging
                ? 'border-orange-500 bg-orange-50/90 scale-[1.01] shadow-xl shadow-orange-500/15'
                : 'border-slate-200/90 bg-white hover:border-orange-300 hover:bg-orange-50/20 shadow-sm'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-left">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform shrink-0 ${
                    isTabDragging
                      ? 'bg-orange-600 text-white scale-110 shadow-lg shadow-orange-600/30'
                      : 'bg-orange-100 text-orange-600'
                  }`}
                >
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-heading font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                    {isTabDragging ? 'Release to Create Assignment!' : 'Drag & Drop Question Paper (PDF / Image)'}
                    <span className="hidden sm:inline-block text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      Drag &amp; Drop
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Drop a question paper PDF or scanned worksheet here to automatically open the assignment creator
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-orange-200 text-orange-700 hover:bg-orange-50 text-xs font-bold h-9 px-3.5"
                >
                  <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                  Drop or Browse
                </Button>
              </div>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-xl border border-slate-100 space-y-3">
              <FileCheck className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                No Assignments Created
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Create assignments with PDF or image attachments for students to submit.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="font-heading font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                        {assignment.title}
                        {assignment.course_chapters?.title && (
                          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0 border-orange-200 shadow-none font-bold">
                            {assignment.course_chapters.title}
                          </Badge>
                        )}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>{assignment.max_marks} Marks</span>
                        {assignment.description?.includes('[ATTACHMENT:') && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />
                              Has Attachment
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <Link
                      href={`/teacher/assignments/${assignment.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDeleteAssignment(assignment.id)}
                      className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Assignment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Batch Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isDeletingCourse) setIsDeleteDialogOpen(false);
        }}
      >
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mb-1">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
              Delete Classroom Batch?
            </DialogTitle>
            <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-slate-900 font-bold">{course?.title}</strong>{' '}
                <span className="text-orange-600 font-bold">({course?.code})</span>?
              </p>
              <div className="rounded-2xl bg-red-50/90 border border-red-200 p-3 text-red-800 text-[11px] space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-red-900">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Final Confirmation Required</span>
                </p>
                <p className="leading-normal">
                  This will permanently erase all video lectures, PDF syllabi & notes, quizzes, student assignments, submissions, and attendance records associated with this batch.
                </p>
                <p className="font-bold text-red-700">
                  This action is irreversible and cannot be undone.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingCourse}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteCourse}
              disabled={isDeletingCourse}
              className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 px-4 h-9"
            >
              {isDeletingCourse ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting Batch...
                </span>
              ) : (
                'Yes, Permanently Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

```

### `src/app/teacher/assignments/[assignmentId]/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileCheck,
  CheckCircle2,
  Users,
  Award,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  GraduationCap,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getAssignmentById,
  fetchAssignmentSubmissions,
  deleteSubmission,
} from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const dynamic = 'force-dynamic';

export default function TeacherAssignmentDetailsPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const router = useRouter();
  const supabase = createClient();

  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Deletion State
  const [submissionToDelete, setSubmissionToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!submissionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteSubmission(supabase, submissionToDelete.id, submissionToDelete.file_url);
      toast.success('Submission deleted successfully');
      setSubmissionToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error('Failed to delete submission', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const assignmentData = await getAssignmentById(supabase, assignmentId);
      const subs = await fetchAssignmentSubmissions(supabase, assignmentId);
      setAssignment(assignmentData);
      setSubmissions(subs);
    } catch (err: any) {
      toast.error('Failed to load assignment details', { description: err.message });
      router.push('/teacher/dashboard');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, router, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading assignment details...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <AlertCircle className="h-10 w-10 text-red-300" />
        <p className="text-sm font-medium">Assignment not found</p>
      </div>
    );
  }

  // Parse Attachment
  let descriptionText = assignment.description || '';
  let attachmentUrl: string | null = null;
  const match = descriptionText.match(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/);
  if (match) {
    attachmentUrl = match[1];
    descriptionText = descriptionText.replace(match[0], '').trim();
  }

  // Calculate Stats
  const totalSubmissions = submissions.length;
  const pendingSubmissions = submissions.filter(s => s.status !== 'graded').length;
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  const averageScore = gradedSubmissions.length > 0 
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.marks_obtained || 0), 0) / gradedSubmissions.length) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Back Navigation */}
      <div>
        <Link
          href={`/teacher/courses/${assignment.course_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Course
        </Link>
      </div>

      {/* Header Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileCheck className="w-64 h-64 text-slate-900 rotate-12" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
              {assignment.title}
            </h1>
            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 font-bold">
              {assignment.courses?.title || 'Unknown Batch'}
            </Badge>
            {assignment.course_chapters?.title && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-200 font-bold shadow-none">
                Chapter: {assignment.course_chapters.title}
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600 font-medium">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-400" />
              {assignment.max_marks} Max Marks
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Attachment */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <h2 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3">
              Instructions
            </h2>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap font-medium">
              {descriptionText || 'No additional instructions provided.'}
            </div>
            
            {attachmentUrl && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" /> Attached Resource
                  </h3>
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    Open in new tab <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
                
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-[400px]">
                  {attachmentUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) ? (
                    <img 
                      src={attachmentUrl} 
                      alt="Attachment" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <iframe
                      src={attachmentUrl.includes('google.com') ? attachmentUrl : `https://docs.google.com/viewer?url=${encodeURIComponent(attachmentUrl)}&embedded=true`}
                      className="w-full h-full border-0"
                      title="Document Viewer"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Submissions */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalSubmissions}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl font-extrabold text-slate-900">{pendingSubmissions}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Graded</p>
              <p className="text-2xl font-extrabold text-slate-900">{gradedSubmissions.length}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Award className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Score</p>
              <p className="text-2xl font-extrabold text-slate-900">{averageScore}</p>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-4 flex items-center justify-between">
              Submissions
              <Badge variant="secondary" className="font-bold">
                {submissions.length}
              </Badge>
            </h3>
            
            {submissions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <FileCheck className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <Link 
                    key={sub.id} 
                    href={`/teacher/grading/${sub.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                        <AvatarImage src={sub.users?.avatar_url || ''} alt={sub.users?.full_name || 'Student'} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
                          {sub.users?.full_name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {sub.users?.full_name || 'Unknown Student'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sub.status === 'graded' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                              <CheckCircle2 className="h-3 w-3" /> Graded ({sub.marks_obtained})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-sm">
                              <Clock className="h-3 w-3" /> Pending Evaluation
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSubmissionToDelete(sub);
                          }}
                          className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                          title="Delete submission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="text-slate-400 group-hover:text-orange-500 transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Delete Submission Confirmation Modal */}
      <Dialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <DialogContent className="rounded-3xl p-6 max-w-sm">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Submission?
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete the submission by{' '}
              <strong className="text-slate-800">
                {submissionToDelete?.users?.full_name || 'this student'}
              </strong>?
              All marks and evaluations will be deleted. This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSubmissionToDelete(null)}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Submission'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

```

### `src/app/teacher/quizzes/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  Clock,
  Award,
  CheckCircle2,
  BookOpen,
  Layers,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  getQuizzes,
  createQuizWithQuestions,
  deleteQuiz,
  getQuizWithQuestions,
  createNotification,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QuestionRichEditor } from '@/components/quiz/QuestionRichEditor';
import { FormattedQuestionText } from '@/components/quiz/FormattedQuestionText';
import { ChapterSelect } from '@/components/chapters/ChapterSelect';

export const dynamic = 'force-dynamic';

interface QuestionDraft {
  question_text: string;
  options: string[];
  correct_option_index: number;
  marks: number;
}

export default function TeacherQuizEnginePage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Quiz Creator Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [quizChapterId, setQuizChapterId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [allowReattempt, setAllowReattempt] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      question_text: '',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_option_index: 0,
      marks: 1,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quiz Preview Dialog State
  const [previewQuiz, setPreviewQuiz] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesData, quizzesData] = await Promise.all([
        getCourses(supabase),
        getQuizzes(supabase),
      ]);

      setCourses(coursesData);
      setQuizzes(quizzesData);
      if (coursesData.length > 0) {
        setSelectedCourseId((prev) => prev || coursesData[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load quizzes', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Question manipulation helpers
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_option_index: 0,
        marks: 1,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) {
      toast.error('A quiz must have at least 1 question');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index].question_text = text;
      return next;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].options[optIndex] = text;
      return next;
    });
  };

  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].options.push(`Option ${String.fromCharCode(65 + next[qIndex].options.length)}`);
      return next;
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[qIndex].options.length <= 2) {
        toast.error('A multiple-choice question requires at least 2 options');
        return next;
      }
      next[qIndex].options.splice(optIndex, 1);
      if (next[qIndex].correct_option_index >= next[qIndex].options.length) {
        next[qIndex].correct_option_index = 0;
      }
      return next;
    });
  };

  const handleSetCorrectOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].correct_option_index = optIndex;
      return next;
    });
  };

  const handleMarksChange = (qIndex: number, marks: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].marks = marks > 0 ? marks : 1;
      return next;
    });
  };

  // Submit Quiz Creation
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      toast.error('Please specify a quiz title');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Please select a target batch');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        toast.error(`Question #${i + 1} text cannot be empty`);
        return;
      }
      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].trim()) {
          toast.error(`Option ${j + 1} in Question #${i + 1} is empty`);
          return;
        }
      }
    }

    try {
      const finalDescription = (quizDescription.trim() + (allowReattempt ? ' \n[REATTEMPT_ALLOWED]' : '')).trim();
      
      setIsSubmitting(true);
      const newQuiz = await createQuizWithQuestions(
        supabase,
        {
          course_id: selectedCourseId,
          title: quizTitle.trim(),
          description: finalDescription || undefined,
          time_limit_minutes: Number(timeLimitMinutes) || 30,
          chapter_id: quizChapterId,
        },
        questions
      );

      // Fire quiz_created notification
      try {
        const course = courses.find(c => c.id === selectedCourseId);
        await createNotification(supabase, {
          type: 'quiz_created',
          title: 'New Quiz Published',
          message: `A new quiz "${quizTitle.trim()}" has been published in ${course?.title || 'a batch'}.`,
          data: {
            quiz_id: newQuiz.id,
            course_id: selectedCourseId,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire quiz notification:', notifErr);
      }

      toast.success('MCQ Quiz published successfully!');
      setIsCreateOpen(false);
      setQuizTitle('');
      setQuizDescription('');
      setQuizChapterId(null);
      setAllowReattempt(false);
      setTimeLimitMinutes(30);
      setQuestions([
        {
          question_text: '',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_option_index: 0,
          marks: 1,
        },
      ]);
      loadData();
    } catch (err: any) {
      toast.error('Failed to create quiz', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz and its question bank?')) return;
    try {
      await deleteQuiz(supabase, quizId);
      toast.success('Quiz deleted');
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete quiz', { description: err.message });
    }
  };

  // Open Preview
  const handleOpenPreview = async (quizId: string) => {
    try {
      setLoadingPreview(true);
      setIsPreviewOpen(true);
      const data = await getQuizWithQuestions(supabase, quizId);
      setPreviewQuiz(data);
    } catch (err: any) {
      toast.error('Could not load quiz preview', { description: err.message });
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredQuizzes =
    selectedCourseFilter === 'all'
      ? quizzes
      : quizzes.filter((q) => q.course_id === selectedCourseFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Quiz &amp; MCQ Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Author mock tests, daily practice quizzes (DPP), set correct answer keys, and configure timed assessments.
          </p>
        </div>

        {/* Create Quiz Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-5 shadow-lg shadow-orange-600/25">
              <Plus className="h-4 w-4 mr-1.5" />
              Create MCQ Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-heading font-extrabold text-xl text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-600" />
                Build Timed MCQ Quiz
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Configure quiz parameters, add questions, set options, and specify the correct answer keys.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateQuiz} className="space-y-6 pt-4">
              
              {/* Batch & Quiz Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="batchSelect" className="text-xs font-bold text-slate-700">
                    Target Classroom Batch
                  </Label>
                  <select
                    id="batchSelect"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-base sm:text-xs font-medium focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timeLimit" className="text-xs font-bold text-slate-700">
                    Time Limit (Minutes)
                  </Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="5"
                    max="180"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="rounded-2xl h-11 text-base sm:text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="qTitle" className="text-xs font-bold text-slate-700">
                    Quiz Title
                  </Label>
                  <Input
                    id="qTitle"
                    placeholder="e.g. Weekly Speed Mock #4: Electrostatics & Potential"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="rounded-2xl h-11 text-base sm:text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">
                    Chapter / Module
                  </Label>
                  {selectedCourseId ? (
                    <ChapterSelect
                      supabase={supabase}
                      courseId={selectedCourseId}
                      value={quizChapterId}
                      onChange={setQuizChapterId}
                    />
                  ) : (
                    <div className="h-11 border border-slate-200 rounded-xl bg-slate-50 flex items-center px-3 text-xs text-slate-400">
                      Select a batch first...
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qDesc" className="text-xs font-bold text-slate-700">
                  Instructions / Description
                </Label>
                <Textarea
                  id="qDesc"
                  placeholder="Instructions for students: +4 for correct, -1 for incorrect..."
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  className="rounded-2xl min-h-[60px] text-base sm:text-xs resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowReattempt"
                  checked={allowReattempt}
                  onChange={(e) => setAllowReattempt(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                />
                <Label htmlFor="allowReattempt" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Allow students to re-attempt this quiz multiple times
                </Label>
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Question Bank</span>
                    <Badge className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0 border-0">
                      {questions.length} Questions
                    </Badge>
                  </h3>

                  <Button
                    type="button"
                    onClick={handleAddQuestion}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-orange-300 text-orange-700 hover:bg-orange-50 text-xs font-bold h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3"
                    >
                      {/* Rich Question Editor with Google Forms-like formatting toolbar & attachments */}
                      <QuestionRichEditor
                        value={q.question_text}
                        onChange={(text) => handleQuestionTextChange(qIndex, text)}
                        qIndex={qIndex}
                        marks={q.marks}
                        onMarksChange={(marks) => handleMarksChange(qIndex, marks)}
                        onRemoveQuestion={() => handleRemoveQuestion(qIndex)}
                        canRemove={questions.length > 1}
                        supabase={supabase}
                      />

                      {/* Options List */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Options (Select the radio button for the correct answer)
                        </span>

                        <div className="space-y-2">
                          {q.options.map((opt, optIndex) => {
                            const isCorrect = q.correct_option_index === optIndex;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-50/80 border-emerald-300'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`correct_opt_${qIndex}`}
                                  checked={isCorrect}
                                  onChange={() => handleSetCorrectOption(qIndex, optIndex)}
                                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer ml-1"
                                />

                                <span className="text-xs font-bold text-slate-400 w-4">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>

                                <Input
                                  value={opt}
                                  onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  className="rounded-xl h-8 text-xs bg-transparent border-0 focus-visible:ring-0 px-1"
                                  required
                                />

                                {isCorrect && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0 border-0 flex-shrink-0">
                                    Correct Answer Key
                                  </Badge>
                                )}

                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(qIndex, optIndex)}
                                    className="p-1 text-slate-300 hover:text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIndex)}
                            className="text-[11px] font-bold text-orange-600 hover:underline pt-1 inline-flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Another Option
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-11 shadow-lg shadow-orange-600/25"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Quiz to Supabase...
                  </span>
                ) : (
                  `Publish Quiz (${questions.length} Questions)`
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batch Filter Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          onClick={() => setSelectedCourseFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            selectedCourseFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
          }`}
        >
          All Batches ({quizzes.length})
        </button>

        {courses.map((course) => {
          const count = quizzes.filter((q) => q.course_id === course.id).length;
          const isSelected = selectedCourseFilter === course.id;
          return (
            <button
              key={course.id}
              onClick={() => setSelectedCourseFilter(course.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {course.code} ({count})
            </button>
          );
        })}
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading quizzes...</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-4">
          <HelpCircle className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="font-heading font-extrabold text-lg text-slate-900">
            No Quizzes Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Create MCQ Quiz&quot; to author timed mock tests with automated answer keys.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:border-orange-200 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-xs px-2.5 py-0.5 rounded-full">
                    {quiz.courses?.code || 'BATCH'}
                  </Badge>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                    <span>{quiz.time_limit_minutes || 30} mins</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 flex flex-wrap items-center gap-2">
                    {quiz.title}
                    {quiz.course_chapters?.title && (
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0 border-orange-200 shadow-none font-bold">
                        {quiz.course_chapters.title}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {quiz.description || 'Timed practice assessment with instant answer evaluation.'}
                  </p>
                </div>

                {/* Question and Marks Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="p-2.5 rounded-2xl bg-slate-50">
                    <div className="font-extrabold text-base text-slate-900">
                      {quiz.questions_count || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Questions</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-50">
                    <div className="font-extrabold text-base text-emerald-600">
                      {quiz.total_marks || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Marks</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleOpenPreview(quiz.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold h-9"
                >
                  <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Preview Key
                </Button>

                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Delete Quiz"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
              {previewQuiz?.title || 'Quiz Preview'}
            </DialogTitle>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{previewQuiz?.courses?.code}</span>
              <span>•</span>
              <span>{previewQuiz?.time_limit_minutes} minutes</span>
            </div>
          </DialogHeader>

          {loadingPreview ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {previewQuiz?.quiz_questions?.map((q: any, idx: number) => (
                <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        Question #{idx + 1}
                      </span>
                      <FormattedQuestionText
                        text={q.question_text}
                        textClassName="text-sm font-semibold text-slate-900 leading-relaxed"
                      />
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0 border-0 shrink-0">
                      {q.marks} Mark{q.marks > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const isCorrect = q.correct_option_index === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-60">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{opt}</span>
                          {isCorrect && <Check className="h-3.5 w-3.5 ml-auto text-emerald-600" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

```

### `src/app/teacher/grading/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Users,
  Award,
  ArrowUpDown,
  Sparkles,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getAllSubmissions, getCourses, deleteSubmission } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const dynamic = 'force-dynamic';

export default function TeacherGradingHubPage() {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Deletion State
  const [submissionToDelete, setSubmissionToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!submissionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteSubmission(supabase, submissionToDelete.id, submissionToDelete.file_url);
      toast.success('Submission deleted successfully');
      setSubmissionToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error('Failed to delete submission', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [subsData, coursesData] = await Promise.all([
        getAllSubmissions(supabase),
        getCourses(supabase),
      ]);

      setSubmissions(subsData);
      setCourses(coursesData);
    } catch (err: any) {
      toast.error('Failed to load submissions', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Subscribe to submission changes in real time
    const channel = supabase
      .channel('grading-hub-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  // Derived metrics
  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.status !== 'graded').length;
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  // Filtered List
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.assignments?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.assignments?.courses?.code?.toLowerCase().includes(searchQuery.toLowerCase());

    const isGraded = sub.status === 'graded';
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'graded'
        ? isGraded
        : !isGraded;

    const matchesCourse =
      courseFilter === 'all' ? true : sub.assignments?.courses?.id === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Evaluation &amp; Grading Station
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Review student assignment uploads in real-time, grade solutions in split-screen, and return tailored feedback.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl text-slate-900">
              {loading ? '—' : pendingCount}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Evaluation
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl text-slate-900">
              {loading ? '—' : gradedCount}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Graded &amp; Returned
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl text-slate-900">
              {loading ? '—' : totalCount}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Submissions
            </div>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student name, assignment, or batch code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-2xl text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Status Tabs Filter */}
          <div className="sm:col-span-3 flex items-center bg-slate-100 rounded-2xl p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('graded')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'graded'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Graded
            </button>
          </div>

          {/* Batch Selector Filter */}
          <div className="sm:col-span-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Batches</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
            <p className="text-xs font-medium">Loading submissions queue...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              No Submissions Matching Filters
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your batch filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-6">Assignment / Batch</th>
                  <th className="py-3.5 px-6">Submitted On</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Grade / Score</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSubmissions.map((sub) => {
                  const isGraded = sub.status === 'graded';
                  const studentName = sub.users?.full_name || 'Enrolled Student';
                  const initials = studentName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-orange-50/30 transition-colors group"
                    >
                      {/* Student Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-orange-200">
                            <AvatarImage src={sub.users?.avatar_url} />
                            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-[10px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900">{studentName}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {sub.users?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assignment Column */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800">
                            {sub.assignments?.title || 'Practice Sheet'}
                          </div>
                          <Badge className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0 border-0 font-semibold">
                            {sub.assignments?.courses?.code || 'BATCH'}
                          </Badge>
                        </div>
                      </td>

                      {/* Submitted On Column */}
                      <td className="py-4 px-6 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Status Column */}
                      <td className="py-4 px-6">
                        <Badge
                          className={`text-[10px] px-2.5 py-0.5 font-bold border-0 ${
                            isGraded
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700 animate-pulse'
                          }`}
                        >
                          {isGraded ? 'Graded' : 'Needs Review'}
                        </Badge>
                      </td>

                      {/* Score Column */}
                      <td className="py-4 px-6">
                        {isGraded && sub.marks_obtained !== null ? (
                          <span className="font-heading font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {sub.marks_obtained} / {sub.assignments?.max_marks || 100}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Action Button Column */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(sub.checked_copy_url || sub.checkedCopyUrl) && (
                            <a
                              href={sub.checked_copy_url || sub.checkedCopyUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="View Returned Checked Copy"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <Link href={`/teacher/grading/${sub.id}`}>
                            <Button
                              size="sm"
                              className={`rounded-full font-bold text-xs h-8 px-4 shadow-sm transition-all ${
                                isGraded
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
                              }`}
                            >
                              {isGraded ? 'Review & Edit' : 'Grade Paper'}
                            </Button>
                          </Link>

                          {/* Delete Submission Action */}
                          <button
                            type="button"
                            onClick={() => setSubmissionToDelete(sub)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                            title="Delete student submission"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Submission Confirmation Modal */}
      <Dialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <DialogContent className="rounded-3xl p-6 max-w-sm">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Submission?
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete the submission by{' '}
              <strong className="text-slate-800">
                {submissionToDelete?.users?.full_name || 'this student'}
              </strong>{' '}
              for &quot;{submissionToDelete?.assignments?.title || 'Assignment'}&quot;?
              This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSubmissionToDelete(null)}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Submission'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

```

### `src/app/teacher/grading/[submissionId]/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckSquare,
  FileText,
  ExternalLink,
  Award,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCw,
  Maximize2,
  ChevronRight,
  Send,
  MessageSquare,
  PenTool,
  Layers,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getSubmissionById,
  gradeSubmission,
  uploadCheckedCopy,
  createNotification,
  deleteSubmission,
} from '@/lib/supabase/queries';
import {
  HandwrittenAnnotationCanvas,
  HandwrittenAnnotationCanvasHandle,
} from '@/components/grading/HandwrittenAnnotationCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const feedbackQuickTags = [
  'Outstanding step-by-step derivations! 🌟',
  'Good conceptual clarity, verify calculation in Q3.',
  'Well-labeled circuit/ray diagrams.',
  'Formulas applied accurately. Excellent work!',
  'Please review standard units and error margins.',
];

export const dynamic = 'force-dynamic';

export default function SplitScreenGradingPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params?.submissionId as string;
  const supabase = createClient();

  const canvasHandleRef = useRef<HandwrittenAnnotationCanvasHandle | null>(null);
  const [submission, setSubmission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeViewerTab, setActiveViewerTab] = useState<'canvas' | 'checked_copy' | 'original'>('canvas');

  // Form State
  const [marks, setMarks] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<string>('');
  const [status, setStatus] = useState<'graded' | 'needs_resubmission'>('graded');
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

  // Deletion & Standalone Save State
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSavingAnnotations, setIsSavingAnnotations] = useState(false);

  const handleDeleteSubmission = async () => {
    if (!submissionId) return;
    try {
      setIsDeleting(true);
      await deleteSubmission(supabase, submissionId, submission?.file_url);
      toast.success('Student submission deleted successfully');
      setIsDeleteDialogOpen(false);
      router.push('/teacher/grading');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Failed to delete submission', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveAnnotationsOnly = async () => {
    if (!canvasHandleRef.current) return;
    try {
      setIsSavingAnnotations(true);
      toast.loading('Saving handwritten annotations & checked copy...', { id: 'save-anno' });

      let blobToUpload: Blob | null = null;
      try {
        blobToUpload = await canvasHandleRef.current.getExportBlob();
      } catch (e) {
        console.warn('Failed to extract blob:', e);
      }

      if (!blobToUpload) {
        toast.dismiss('save-anno');
        toast.error('No annotations found or unable to capture canvas');
        return;
      }

      let checkedUrl: string | null = null;
      try {
        checkedUrl = await uploadCheckedCopy(
          supabase,
          submissionId,
          blobToUpload,
          submission?.student_id,
          submission?.assignment_id
        );
      } catch (upErr: any) {
        console.warn('Storage upload error:', upErr);
        toast.dismiss('save-anno');
        toast.error('Cloud storage upload failed', { description: upErr.message });
        return;
      }

      if (checkedUrl) {
        await gradeSubmission(supabase, submissionId, {
          marks_obtained: marks === '' ? null : Number(marks),
          feedback: feedback.trim(),
          status: status,
          checked_copy_url: checkedUrl,
        });

        toast.dismiss('save-anno');
        toast.success('Checked copy with annotations saved successfully!');
        await loadSubmission();
        setActiveViewerTab('checked_copy');
      }
    } catch (err: any) {
      toast.dismiss('save-anno');
      toast.error('Failed to save annotations', { description: err.message });
    } finally {
      setIsSavingAnnotations(false);
    }
  };


  const loadSubmission = useCallback(async () => {
    if (!submissionId) return;
    try {
      setLoading(true);
      const data = await getSubmissionById(supabase, submissionId);
      setSubmission(data);
      if (data) {
        setMarks(data.marks_obtained ?? '');
        setFeedback(data.feedback ?? '');
        setStatus((data.status as any) === 'needs_resubmission' ? 'needs_resubmission' : 'graded');
      }
    } catch (err: any) {
      toast.error('Failed to load submission', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [submissionId, supabase]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const maxMarks = submission?.assignments?.max_marks || 100;

  // Preset percentage buttons
  const handleApplyPreset = (percent: number) => {
    const calculated = Math.round((percent / 100) * maxMarks);
    setMarks(calculated);
  };

  const handleAppendTag = (tag: string) => {
    setFeedback((prev) => (prev ? `${prev}\n${tag}` : tag));
  };

  // Submit Grade & Return Evaluated Copy
  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (marks === '') {
      toast.error('Please assign marks obtained');
      return;
    }
    if (Number(marks) < 0 || Number(marks) > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    try {
      setIsSubmitting(true);

      let checkedCopyPublicUrl = submission?.checked_copy_url || null;

      // Extract the latest canvas blob directly from the canvas ref
      let blobToUpload = pendingBlob;
      if (canvasHandleRef.current) {
        try {
          const freshBlob = await canvasHandleRef.current.getExportBlob();
          if (freshBlob) {
            blobToUpload = freshBlob;
          }
        } catch (bErr) {
          console.warn('Failed to extract fresh blob from canvas:', bErr);
        }
      }

      // If an annotated canvas copy is ready to upload
      if (blobToUpload) {
        toast.loading('Saving & uploading checked copy with annotations...', { id: 'upload-copy' });
        try {
          checkedCopyPublicUrl = await uploadCheckedCopy(
            supabase,
            submissionId,
            blobToUpload,
            submission?.student_id,
            submission?.assignment_id
          );
          toast.dismiss('upload-copy');
        } catch (storageErr: any) {
          toast.dismiss('upload-copy');
          console.warn('Storage upload error for checked copy:', storageErr);
          toast.warning('Could not store annotated image file in cloud bucket, but saving your marks and feedback...');
        }
      }

      await gradeSubmission(supabase, submissionId, {
        marks_obtained: Number(marks),
        feedback: feedback.trim(),
        status: status,
        checked_copy_url: checkedCopyPublicUrl,
      });

      // Fire grading_completed notification
      try {
        await createNotification(supabase, {
          type: 'grading_completed',
          title: 'Assignment Graded',
          message: `The submission by ${submission?.users?.full_name || 'Student'} for "${submission?.assignments?.title || 'an assignment'}" has been graded.`,
          data: {
            submission_id: submissionId,
            student_id: submission?.student_id,
            assignment_id: submission?.assignment_id,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire grading notification:', notifErr);
      }

      toast.success('Grade & evaluation returned to student!', {
        description: `Score: ${marks}/${maxMarks} (${Math.round((Number(marks) / maxMarks) * 100)}%)`,
      });

      // Clear locally-saved strokes draft now that they've been exported and uploaded
      if (canvasHandleRef.current) {
        try { canvasHandleRef.current.clearSavedDraft(); } catch {}
      }
      try {
        localStorage.removeItem(`annotation_strokes_v2_${submissionId}`);
      } catch {}

      // Reload to ensure state is synchronized
      await loadSubmission();
      if (checkedCopyPublicUrl) {
        setActiveViewerTab('checked_copy');
      }
    } catch (err: any) {
      toast.dismiss('upload-copy');
      console.error('Grade submit error:', err);
      toast.error('Failed to save grade', { description: err.message || 'Please check your inputs' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !submission) {
    return (
      <div className="py-28 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading submission paper &amp; grading console...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="font-heading font-extrabold text-xl text-slate-900">
          Submission Not Found
        </h2>
        <Link href="/teacher/grading">
          <Button variant="outline" className="rounded-full text-xs">
            Return to Grading Station
          </Button>
        </Link>
      </div>
    );
  }

  const studentName = submission.users?.full_name || 'Enrolled Student';
  const studentEmail = submission.users?.email || '';
  const initials = studentName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const rawFileUrl = submission.file_url || '';
  const fileUrl = rawFileUrl.startsWith('http') 
    ? rawFileUrl 
    : supabase.storage.from('course-materials').getPublicUrl(rawFileUrl).data.publicUrl;
    
  const hasCheckedCopy = !!submission.checked_copy_url;
  const isPdf =
    submission.file_name?.toLowerCase().endsWith('.pdf') ||
    submission.file_type?.includes('pdf') ||
    fileUrl?.toLowerCase().includes('.pdf');
  const canvasIsPdf = !hasCheckedCopy && isPdf;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Top Header Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/grading"
            className="p-2 rounded-full text-slate-400 hover:text-orange-600 hover:bg-slate-100 transition-colors"
            title="Back to submissions"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <Avatar className="h-10 w-10 border-2 border-orange-200">
            <AvatarImage src={submission.users?.avatar_url} />
            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                {studentName}
              </h1>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-bold px-2 py-0">
                {submission.assignments?.courses?.code}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-sm sm:max-w-md">
              {submission.assignments?.title} • {studentEmail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right hidden sm:block">
            <div className="font-bold text-slate-800">
              Max Marks: {maxMarks}
            </div>
            <div className="text-[11px] text-slate-400">
              Submitted on {new Date(submission.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <Badge
            className={`text-xs px-3 py-1 font-bold border-0 ${
              submission.status === 'graded'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {submission.status === 'graded' ? 'Graded' : 'Pending Evaluation'}
          </Badge>

          {/* Faculty Delete Submission Action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="rounded-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 px-3 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Delete this student submission"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete Submission</span>
          </Button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-3xl p-6 max-w-sm">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Submission?
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete this submission by{' '}
              <strong className="text-slate-800">{studentName}</strong>? All marks, feedback remarks, and checked copies will be deleted. This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSubmission}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Submission'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          SPLIT SCREEN INTERFACE: 60% Left Viewer + 40% Right Grading
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Digital Correction Canvas / Document Viewer (60% width -> 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col h-[520px] sm:h-[650px] lg:h-[780px]">
          
          {/* Viewer Mode Selector Header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200 shadow-sm overflow-x-auto max-w-[80%]">
              <button
                type="button"
                onClick={() => setActiveViewerTab('canvas')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                  activeViewerTab === 'canvas'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Correction Pad</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('checked_copy')}
                disabled={!submission?.checked_copy_url}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                  activeViewerTab === 'checked_copy'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : submission?.checked_copy_url
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-slate-300 opacity-40 cursor-not-allowed'
                }`}
                title={submission?.checked_copy_url ? 'View evaluated checked copy' : 'No checked copy saved yet'}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Evaluated Copy</span>
                {submission?.checked_copy_url && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('original')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                  activeViewerTab === 'original'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Original File</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-orange-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm"
              >
                <span>Raw</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href={submission?.checked_copy_url || fileUrl}
                download
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                title="Download file"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Viewer Body */}
          <div className="flex-1 overflow-hidden p-2 bg-slate-100">
            {activeViewerTab === 'canvas' ? (
              <HandwrittenAnnotationCanvas
                ref={canvasHandleRef}
                imageUrl={fileUrl}
                isPdf={canvasIsPdf}
                checkedCopyUrl={submission.checked_copy_url}
                persistenceKey={submissionId}
                onExportBlob={(blob) => setPendingBlob(blob)}
                onSaveAnnotations={handleSaveAnnotationsOnly}
                isSavingAnnotations={isSavingAnnotations}
              />
            ) : activeViewerTab === 'checked_copy' ? (
              <div className="w-full h-full flex flex-col overflow-hidden bg-slate-950 rounded-2xl">
                <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="font-bold text-emerald-300">Evaluated Copy with Handwritten Corrections</span>
                  </div>
                  <a
                    href={submission.checked_copy_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Copy
                  </a>
                </div>
                <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={submission.checked_copy_url}
                    alt="Evaluated checked copy"
                    className="max-w-full object-contain rounded-xl shadow-2xl border border-slate-700"
                  />
                </div>
              </div>
            ) : isPdf ? (
              <iframe
                src={`${fileUrl}#toolbar=1`}
                className="w-full h-full rounded-2xl bg-white border border-slate-200"
                title="Student PDF Submission"
              />
            ) : (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-white rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt="Student handwritten answer sheet"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200"
                />
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Grading Console & Return Panel (40% width -> 5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-100 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-heading font-extrabold text-base text-slate-900">
                    Evaluation &amp; Feedback
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Assign numerical score &amp; return annotated copy
                  </p>
                </div>
              </div>

              {submission.checked_copy_url && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  ✓ Checked Copy Attached
                </Badge>
              )}
            </div>

            <form onSubmit={handleSubmitGrade} className="space-y-5">
              
              {/* Numerical Marks Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marks" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Score Awarded
                  </Label>
                  <span className="text-xs font-bold text-slate-500">
                    out of {maxMarks} marks
                  </span>
                </div>

                <div className="relative">
                  <Input
                    id="marks"
                    type="number"
                    min={0}
                    max={maxMarks}
                    step={1}
                    required
                    placeholder={`0 - ${maxMarks}`}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-12 text-lg font-bold rounded-2xl border-slate-200 focus-visible:ring-orange-500 pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    / {maxMarks}
                  </div>
                </div>

                {/* Score Preset Percentage Chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Presets:
                  </span>
                  {[100, 90, 75, 50, 0].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition-colors border border-slate-200/60"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluation Status Toggle */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Evaluation Verdict
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('graded')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      status === 'graded'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${status === 'graded' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    Approved / Graded
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('needs_resubmission')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      status === 'needs_resubmission'
                        ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertCircle className={`h-4 w-4 ${status === 'needs_resubmission' ? 'text-red-500' : 'text-slate-400'}`} />
                    Needs Revision
                  </button>
                </div>
              </div>

              {/* Rich Feedback Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedback" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-orange-600" />
                    Teacher&apos;s Feedback &amp; Remarks
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    Visible to student
                  </span>
                </div>

                <Textarea
                  id="feedback"
                  rows={4}
                  placeholder="Provide step-by-step constructive feedback, formula corrections, and praise..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="rounded-2xl border-slate-200 focus-visible:ring-orange-500 text-sm leading-relaxed p-3.5"
                />

                {/* Quick Feedback Snippet Pills */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Suggestions (Click to append):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedbackQuickTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAppendTag(tag)}
                        className="text-[11px] text-slate-600 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 px-2.5 py-1 rounded-full border border-slate-200/60 transition-colors text-left"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit & Send Grade Action Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-xl shadow-orange-600/25 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Evaluation &amp; Sending Copy...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Save Grade &amp; Return Checked Copy
                    </>
                  )}
                </Button>
              </div>

            </form>

          </div>

          {/* Student Info Card */}
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 text-xs space-y-3">
            <h3 className="font-heading font-bold text-slate-800">
              Batch &amp; Assignment Context
            </h3>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Target Batch:</span>
                <span className="font-semibold text-slate-800">{submission.assignments?.courses?.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Due Date:</span>
                <span className="font-medium text-slate-700">
                  {new Date(submission.assignments?.due_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Uploaded File Format:</span>
                <span className="font-mono text-slate-700 font-bold">{submission.file_type || 'scanned copy'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

```

### `src/app/teacher/attendance/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarCheck,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  Loader2,
  Save,
  CheckCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  getAllStudents,
  getAttendanceByDate,
  saveAttendanceBatch,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentRosterItem {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: AttendanceStatus;
  remarks: string;
}

export default function TeacherAttendancePage() {
  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedPreviously, setIsSavedPreviously] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const coursesData = await getCourses(supabase);
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourseId((prev) => prev || coursesData[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load courses', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Load roster and existing attendance when course or date changes
  const loadRosterAndAttendance = useCallback(async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const [allStudents, existingAttendance] = await Promise.all([
        getAllStudents(supabase),
        getAttendanceByDate(supabase, selectedCourseId, selectedDate),
      ]);

      const attendanceMap = new Map<string, { status: AttendanceStatus; remarks: string }>();
      existingAttendance.forEach((rec: any) => {
        attendanceMap.set(rec.student_id, {
          status: rec.status as AttendanceStatus,
          remarks: rec.remarks || '',
        });
      });

      setIsSavedPreviously(existingAttendance.length > 0);

      const mergedRoster: StudentRosterItem[] = allStudents.map((st: any) => {
        const existing = attendanceMap.get(st.id);
        return {
          id: st.id,
          full_name: st.full_name || 'Enrolled Student',
          email: st.email || '',
          avatar_url: st.avatar_url,
          status: existing ? existing.status : 'present',
          remarks: existing ? existing.remarks : '',
        };
      });

      setRoster(mergedRoster);
    } catch (err: any) {
      toast.error('Could not load attendance roster', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, selectedDate, supabase]);

  useEffect(() => {
    loadRosterAndAttendance();
  }, [loadRosterAndAttendance]);

  // Change individual student status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, status } : item))
    );
  };

  // Change individual remarks
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, remarks } : item))
    );
  };

  // Mark all present
  const handleMarkAll = (status: AttendanceStatus) => {
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
    toast.info(`Marked all students as ${status.toUpperCase()}`);
  };

  // Save Attendance to Supabase
  const handleSaveAttendance = async () => {
    if (!selectedCourseId || !selectedDate) {
      toast.error('Please choose a batch and date');
      return;
    }
    if (roster.length === 0) {
      toast.error('No students in this batch');
      return;
    }

    try {
      setIsSaving(true);
      const recordsToSave = roster.map((item) => ({
        course_id: selectedCourseId,
        student_id: item.id,
        date: selectedDate,
        status: item.status,
        remarks: item.remarks ? item.remarks.trim() : undefined,
      }));

      await saveAttendanceBatch(supabase, recordsToSave);
      setIsSavedPreviously(true);
      toast.success('Attendance register saved successfully!', {
        description: `${roster.length} student records synchronized.`,
      });
    } catch (err: any) {
      toast.error('Failed to save attendance', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Derived metrics
  const totalStudents = roster.length;
  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const lateCount = roster.filter((r) => r.status === 'late').length;
  const attendanceRate =
    totalStudents > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalStudents) * 100) : 0;

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Classroom Attendance Register
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Log daily batch attendance, record leaves/absences, and synchronize records across student profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || loading || roster.length === 0}
            className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-6 shadow-lg shadow-orange-600/25 transition-all"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving to Database...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isSavedPreviously ? 'Update Register' : 'Save Attendance'}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Control Filters Bar (Batch Selector + Date Picker) */}
      <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          
          {/* Batch Selector */}
          <div className="sm:col-span-6 space-y-1.5">
            <Label htmlFor="batchSelect" className="text-xs font-bold text-slate-700">
              Classroom Batch
            </Label>
            <select
              id="batchSelect"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="sm:col-span-4 space-y-1.5">
            <Label htmlFor="dateSelect" className="text-xs font-bold text-slate-700">
              Session Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="dateSelect"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 h-11 rounded-2xl text-xs font-medium bg-slate-50 border-slate-200"
              />
            </div>
          </div>

          {/* Quick All-Present Button */}
          <div className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleMarkAll('present')}
              className="w-full h-11 rounded-2xl border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold"
            >
              <CheckCheck className="h-4 w-4 mr-1.5 text-emerald-600" />
              All Present
            </Button>
          </div>

        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
          <div className="text-xs font-bold text-slate-400 uppercase">Enrolled Students</div>
          <div className="font-heading font-extrabold text-2xl text-slate-900 mt-1">
            {totalStudents}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
          <div className="text-xs font-bold text-emerald-600 uppercase">Present Today</div>
          <div className="font-heading font-extrabold text-2xl text-emerald-700 mt-1">
            {presentCount}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
          <div className="text-xs font-bold text-red-500 uppercase">Absent</div>
          <div className="font-heading font-extrabold text-2xl text-red-600 mt-1">
            {absentCount}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 shadow-xl border border-slate-100">
          <div className="text-xs font-bold text-orange-600 uppercase">Batch Attendance Rate</div>
          <div className="font-heading font-extrabold text-2xl text-orange-700 mt-1">
            {attendanceRate}%
          </div>
        </div>
      </div>

      {/* Student Attendance Roster Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden space-y-4 p-5 sm:p-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              Student Register — {currentCourse?.code || 'Batch'}
            </h3>
            <p className="text-xs text-slate-500">
              Date: <span className="font-semibold text-slate-700">{new Date(selectedDate).toDateString()}</span>
              {isSavedPreviously && (
                <span className="ml-2 inline-flex items-center gap-1 text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved in Supabase
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAll('absent')}
              className="text-[11px] text-slate-500 hover:text-red-600 h-7 px-2.5 rounded-full"
            >
              Reset to Absent
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
            <p className="text-xs font-medium">Loading batch roster...</p>
          </div>
        ) : roster.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Users className="h-8 w-8 mx-auto text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">No students registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roster.map((student, idx) => {
              const initials = student.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={student.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 transition-colors"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-xs font-extrabold text-slate-400 w-5 text-center">
                      {idx + 1}
                    </span>
                    <Avatar className="h-9 w-9 border border-orange-200">
                      <AvatarImage src={student.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {student.full_name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {student.email}
                      </div>
                    </div>
                  </div>

                  {/* Status Selection Pills */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(
                      (st) => {
                        const isCurrent = student.status === st;
                        let activeStyles = '';
                        if (st === 'present')
                          activeStyles = 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30';
                        if (st === 'absent')
                          activeStyles = 'bg-red-600 text-white shadow-sm shadow-red-600/30';
                        if (st === 'late')
                          activeStyles = 'bg-orange-500 text-white shadow-sm shadow-orange-500/30';
                        if (st === 'excused')
                          activeStyles = 'bg-blue-600 text-white shadow-sm shadow-blue-600/30';

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(student.id, st)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                              isCurrent
                                ? activeStyles
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* Remarks Input */}
                  <div className="w-full md:w-64">
                    <Input
                      placeholder="Remarks (e.g. medical, left early)"
                      value={student.remarks}
                      onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                      className="h-9 rounded-xl text-xs bg-white border-slate-200"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Save Trigger */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Records update immediately in students&apos; attendance portal.
          </span>
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || loading || roster.length === 0}
            className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-6 shadow-lg shadow-orange-600/25"
          >
            {isSaving ? 'Saving...' : 'Save & Synchronize Attendance'}
          </Button>
        </div>

      </div>

    </div>
  );
}

```

### `src/app/teacher/announcements/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Bell,
  Clock,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Layers,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const noticePresets = [
  '🚨 Extra Doubts & Problem Solving Session scheduled for tomorrow at 5 PM.',
  '📅 Mock Test Series #3 syllabus uploaded. Please review the formula sheet.',
  '⚠️ Homework assignment submission deadline extended till Sunday 11:59 PM.',
  '📢 Next week classroom timings updated for Advanced Batch.',
];

export const dynamic = 'force-dynamic';

export default function TeacherAnnouncementsPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [targetCourseId, setTargetCourseId] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesData, announcementsData] = await Promise.all([
        getCourses(supabase),
        getAnnouncements(supabase),
      ]);

      setCourses(coursesData);
      setAnnouncements(announcementsData);
    } catch (err: any) {
      toast.error('Failed to load announcements', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Subscribe to announcements real-time
    const channel = supabase
      .channel('teacher-announcements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please enter announcement title and notice message');
      return;
    }

    try {
      setIsBroadcasting(true);
      await createAnnouncement(supabase, {
        course_id: targetCourseId === 'all' ? null : targetCourseId,
        title: title.trim(),
        content: content.trim(),
      });

      toast.success('Announcement broadcasted live to students & portal!');
      setTitle('');
      setContent('');
      loadData();
    } catch (err: any) {
      toast.error('Failed to broadcast notice', { description: err.message });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteAnnouncement(supabase, id);
      toast.success('Notice deleted');
      loadData();
    } catch (err: any) {
      toast.error('Could not delete notice', { description: err.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Academic Notice Broadcast
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Send real-time alerts, class schedule changes, and test reminders to enrolled batches and the portal ticker.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Broadcast Composer (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-100 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600">
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Live Broadcast Console</span>
            </div>
            <h2 className="font-heading font-extrabold text-xl text-slate-900">
              New Notice Announcement
            </h2>
            <p className="text-xs text-slate-500">
              Dispatches instantly to student dashboards and the public landing page ticker.
            </p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            
            {/* Target Batch Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="targetBatch" className="text-xs font-bold text-slate-700">
                Target Audience
              </Label>
              <select
                id="targetBatch"
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">📢 All Institute Batches &amp; Public Notice</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <Label htmlFor="noticeTitle" className="text-xs font-bold text-slate-700">
                Headline / Subject
              </Label>
              <Input
                id="noticeTitle"
                placeholder="e.g. Schedule Change for Physics Mechanics Class"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl h-11 text-xs font-medium"
                required
              />
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="noticeBody" className="text-xs font-bold text-slate-700">
                Notice Content &amp; Details
              </Label>
              <Textarea
                id="noticeBody"
                placeholder="Write the full announcement message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-2xl min-h-[120px] text-xs resize-none"
                required
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Quick Template Inserts:
              </span>
              <div className="space-y-1">
                {noticePresets.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!title) setTitle(preset.slice(2, 40) + '...');
                      setContent(preset);
                    }}
                    className="w-full text-left text-[11px] text-slate-600 hover:text-orange-700 bg-slate-50 hover:bg-orange-50 p-2 rounded-xl border border-slate-200/60 transition-colors truncate block"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast CTA */}
            <Button
              type="submit"
              disabled={isBroadcasting}
              className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-12 shadow-xl shadow-orange-600/25 transition-all mt-2"
            >
              {isBroadcasting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Broadcasting to Portal...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  Broadcast Live Notice
                </span>
              )}
            </Button>

          </form>
        </div>

        {/* Right Column: History of Sent Announcements (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-600" />
              Broadcast History ({announcements.length})
            </h3>
            <span className="text-xs text-slate-400">Real-time synchronized</span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading notice history...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-3">
              <Megaphone className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="font-heading font-extrabold text-base text-slate-900">
                No Broadcasts Sent Yet
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Use the broadcast console on the left to send notifications to enrolled batch students.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-100 hover:border-orange-200 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {item.courses?.code || 'ALL BATCHES'}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {new Date(item.posted_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="font-heading font-extrabold text-base text-slate-900">
                        {item.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/50">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

```


---

## 10. Authentication & Root Routes

### `src/app/login/page.tsx`
```tsx
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  GraduationCap, 
  ArrowRight, 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  BookOpen,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { BackgroundGrid } from '@/components/layout/BackgroundGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'teacher' || roleParam === 'student') {
      setRole(roleParam);
    }
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    const errorParam = searchParams.get('error');
    if (errorParam === 'already_registered') {
      setErrorMessage('This email is already registered. Please sign in with your password or Google account.');
    } else if (errorParam) {
      setErrorMessage('Authentication failed. Please try again or sign in with email.');
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const dest = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${dest}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error('Google sign in error', { description: error.message });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initiate Google sign in.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error('Authentication failed', {
          description: error.message,
        });
        return;
      }

      if (data?.user) {
        const dest = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
        toast.success('Welcome back!', {
          description: `Logged in as ${role === 'student' ? 'Student' : 'Faculty'}. Redirecting to dashboard...`,
        });
        router.push(dest);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
      toast.error('Login error', {
        description: 'Unable to sign in at this time.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-slate-900/8 border border-slate-200/80">
      
      <div className="text-center mb-6 space-y-2">
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Portal Access
        </h1>
        <p className="text-sm text-slate-500">
          Sign in to access your batch lectures, test series &amp; grades
        </p>
      </div>

      {/* Role Selection Toggle */}
      <div className="mb-5">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-full border border-slate-200/80">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
              role === 'student'
                ? 'bg-white text-emerald-700 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className={`h-3.5 w-3.5 ${role === 'student' ? 'text-emerald-600' : 'text-slate-400'}`} />
            Student Login
          </button>

          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
              role === 'teacher'
                ? 'bg-white text-orange-600 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className={`h-3.5 w-3.5 ${role === 'teacher' ? 'text-orange-600' : 'text-slate-400'}`} />
            Faculty Login
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Google OAuth Button */}
      <div className="mb-5">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
          className="w-full h-11 rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center"
        >
          {isGoogleLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              Connecting to Google...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <GoogleIcon />
              Sign in with Google
            </span>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="border-t border-slate-200 w-full absolute"></div>
        <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 relative z-10">
          or continue with email
        </span>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {role === 'student' ? 'Enrolled Student Email' : 'Faculty / Staff Email'}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              required
              placeholder={role === 'student' ? 'student@eduflow.edu' : 'faculty@eduflow.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </Label>
            <a href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className={`w-full h-11 rounded-full text-white font-semibold text-sm shadow-lg transition-all mt-2 ${
            role === 'student'
              ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/25'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Authenticating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Sign In to {role === 'student' ? 'Student Portal' : 'Faculty Console'}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Card Footer */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-600">
        New Student / Not registered?{' '}
        <Link
          href="/signup"
          className="font-bold text-orange-600 hover:text-orange-700 transition-colors"
        >
          Register Batch Enrolment
        </Link>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative selection:bg-emerald-100 selection:text-emerald-900 py-12">
      <BackgroundGrid />

      {/* Floating Logo Badge */}
      <div className="mb-6 z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight leading-none">
              EduFlow
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Academic Portal
            </span>
          </div>
        </Link>
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md bg-white rounded-[2rem] p-10 shadow-2xl border border-slate-200 text-center text-slate-500">
          Loading login portal...
        </div>
      }>
        <LoginForm />
      </Suspense>

      {/* Trust verification */}
      <div className="mt-6 z-10 flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>Secured via Institute Supabase RLS Policy</span>
      </div>
    </div>
  );
}

```

### `src/app/signup/page.tsx`
```tsx
'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  BookOpen, 
  Briefcase,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getCourses, createNotification } from '@/lib/supabase/queries';
import { BackgroundGrid } from '@/components/layout/BackgroundGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [availableBatches, setAvailableBatches] = useState<{ id: string; code: string; title: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  React.useEffect(() => {
    async function loadBatches() {
      try {
        const courses = await getCourses(supabase);
        setAvailableBatches(courses);
        if (courses.length > 0) {
          setSelectedBatches([courses[0].code]);
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }
    }
    loadBatches();
  }, [supabase]);

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error('Google sign up error', { description: error.message });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initiate Google sign up.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check if email already exists in users table
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.trim())
        .maybeSingle();

      if (existingUser) {
        toast.info('Email already registered', {
          description: 'This email is already associated with an institute account. Redirecting to login...',
        });
        router.push(`/login?email=${encodeURIComponent(email.trim())}&error=already_registered`);
        return;
      }

      // 2. Attempt signup
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
            batch_name: role === 'student' ? selectedBatches.join(', ') : 'Faculty Staff',
          },
        },
      });

      if (error) {
        // If Supabase Auth detects user already registered
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists') ||
          error.message.toLowerCase().includes('duplicate')
        ) {
          toast.info('Email already registered', {
            description: 'This email is already associated with an institute account. Redirecting to login...',
          });
          router.push(`/login?email=${encodeURIComponent(email.trim())}&error=already_registered`);
          return;
        }

        setErrorMessage(error.message);
        toast.error('Registration failed', {
          description: error.message,
        });
        return;
      }

      // If user identities is empty (Supabase returns empty identities for existing user)
      if (data?.user && data.user.identities && data.user.identities.length === 0) {
        toast.info('Email already registered', {
          description: 'This email is already associated with an institute account. Redirecting to login...',
        });
        router.push(`/login?email=${encodeURIComponent(email.trim())}&error=already_registered`);
        return;
      }

      if (data?.user) {
        const assignedBatch =
          role === 'student'
            ? selectedBatches.length > 0
              ? selectedBatches.join(', ')
              : 'Standard Batch'
            : 'Faculty Staff';

        if (data.session) {
          await supabase.from('users').upsert({
            id: data.user.id,
            email: email.trim(),
            full_name: fullName.trim(),
            role: role,
            batch_name: assignedBatch,
          });
        }

        // Notify faculty of new student enrolment
        if (role === 'student') {
          try {
            await createNotification(supabase, {
              type: 'student_signup',
              title: 'New Student Enrolled',
              message: `${fullName.trim() || 'A new student'} joined batch: ${assignedBatch}`,
              data: {
                student_id: data.user.id,
                student_name: fullName.trim(),
                student_email: email.trim(),
                batch_name: assignedBatch,
              },
            });
          } catch (notifErr) {
            console.warn('Failed to notify faculty of student signup:', notifErr);
          }
        }

        toast.success('Registration successful!', {
          description: `Welcome to EduFlow, ${fullName.trim()}! Redirecting to dashboard...`,
        });

        const dest = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
        router.push(dest);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during enrolment.');
      toast.error('Signup error', {
        description: 'Unable to complete registration.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-slate-900/8 border border-slate-200/80">
      
      <div className="text-center mb-6 space-y-2">
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Register Enrolment
        </h1>
        <p className="text-sm text-slate-500">
          Join your coaching institute batch and access study modules
        </p>
      </div>

      {/* Google OAuth Button */}
      <div className="mb-5">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignUp}
          disabled={isGoogleLoading || isLoading}
          className="w-full h-11 rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center"
        >
          {isGoogleLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              Connecting to Google...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <GoogleIcon />
              Sign up with Google
            </span>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="border-t border-slate-200 w-full absolute"></div>
        <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 relative z-10">
          or register with institute credentials
        </span>
      </div>

      {/* Role Selection Toggle */}
      <div className="mb-5">
        <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
          Enrolment Type
        </Label>
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-full border border-slate-200/80">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
              role === 'student'
                ? 'bg-white text-emerald-700 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className={`h-3.5 w-3.5 ${role === 'student' ? 'text-emerald-600' : 'text-slate-400'}`} />
            Student
          </button>

          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
              role === 'teacher'
                ? 'bg-white text-orange-600 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className={`h-3.5 w-3.5 ${role === 'teacher' ? 'text-orange-600' : 'text-slate-400'}`} />
            Faculty
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        
        {/* Full Name Field */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Student / Faculty Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="fullName"
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Email Address Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              required
              placeholder="student@eduflow.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Batch Selection for Student */}
        {role === 'student' && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              Target Coaching Batches (Select all that apply)
            </Label>
            <div className="max-h-48 overflow-y-auto space-y-2 p-3 rounded-2xl border border-slate-200 bg-slate-50/50">
              {availableBatches.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-2">Loading batches...</div>
              ) : (
                availableBatches.map((batch) => {
                  const isChecked = selectedBatches.includes(batch.code);
                  return (
                    <label
                      key={batch.id}
                      className={`flex items-center gap-3 p-2 rounded-xl border cursor-pointer transition-colors ${
                        isChecked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBatches([...selectedBatches, batch.code]);
                          } else {
                            setSelectedBatches(selectedBatches.filter(b => b !== batch.code));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{batch.code}</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{batch.title}</span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
            {selectedBatches.length === 0 && (
              <p className="text-[10px] text-amber-600 font-medium">Please select at least one batch.</p>
            )}
          </div>
        )}

        {/* Password Field */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type="password"
              required
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className="w-full h-11 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-lg shadow-orange-600/25 transition-all mt-2"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Enrolment...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Complete Batch Enrolment
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Card Footer */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-600">
        Already have an institute account?{' '}
        <Link
          href="/login"
          className="font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
        >
          Sign In Here
        </Link>
      </div>

    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative py-12 selection:bg-emerald-100 selection:text-emerald-900">
      <BackgroundGrid />

      {/* Floating Logo Badge */}
      <div className="mb-6 z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight leading-none">
              EduFlow
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Academic Portal
            </span>
          </div>
        </Link>
      </div>

      <Suspense fallback={<div className="w-full max-w-md bg-white rounded-[2rem] p-10 text-center">Loading...</div>}>
        <SignupForm />
      </Suspense>

      {/* Trust pill */}
      <div className="mt-6 z-10 flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>Batch assignments protected by Supabase RLS</span>
      </div>
    </div>
  );
}

```

### `src/app/onboarding/page.tsx`
```tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, GraduationCap, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getCourses, createNotification, getCurrentUser } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesData, user] = await Promise.all([
        getCourses(supabase),
        getCurrentUser(supabase)
      ]);
      setCourses(coursesData);
      setUserProfile(user);

      // If user is not student or somehow already properly onboarded, redirect
      if (user && user.role !== 'student') {
        router.replace('/teacher/dashboard');
      }
    } catch (err: any) {
      toast.error('Failed to load batches', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async () => {
    if (!selectedBatch || !userProfile) return;

    try {
      setIsEnrolling(true);
      const course = courses.find((c) => c.id === selectedBatch);

      // Update user's batch in the database
      const { error } = await supabase
        .from('users')
        .update({ batch_name: course?.title })
        .eq('id', userProfile.id);

      if (error) throw error;

      // Fire notification for faculty
      try {
        await createNotification(supabase, {
          type: 'batch_enrolled',
          title: 'Student Enrolled in Batch',
          message: `${userProfile.full_name} has enrolled in ${course?.title || 'a batch'}.`,
          data: {
            student_id: userProfile.id,
            student_name: userProfile.full_name,
            course_id: course?.id,
            batch_name: course?.title,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire batch enrollment notification:', notifErr);
      }

      toast.success(`Successfully enrolled in ${course?.title}!`);
      router.push('/student/dashboard');
    } catch (err: any) {
      toast.error('Enrollment failed', { description: err.message });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading available batches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <GraduationCap className="w-48 h-48 text-white rotate-12" />
          </div>
          <div className="relative z-10 space-y-3 text-white">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl">
              Choose Your Batch
            </h1>
            <p className="text-orange-50 font-medium text-sm sm:text-base max-w-md mx-auto">
              Welcome aboard, {userProfile?.full_name?.split(' ')[0] || 'Student'}! Select the batch you want to enroll in to get started.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 sm:p-12 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p>No active batches available.</p>
                <p className="text-xs mt-1">Please contact your administrator.</p>
              </div>
            ) : (
              courses.map((course) => {
                const isSelected = selectedBatch === course.id;
                return (
                  <div
                    key={course.id}
                    onClick={() => setSelectedBatch(course.id)}
                    className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative overflow-hidden ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 shadow-md scale-[1.02]'
                        : 'border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 text-orange-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <h3 className={`font-heading font-bold text-lg mb-1 ${isSelected ? 'text-orange-900' : 'text-slate-900'}`}>
                      {course.title}
                    </h3>
                    <p className={`text-xs font-semibold ${isSelected ? 'text-orange-700' : 'text-slate-500'}`}>
                      {course.code || 'Standard Batch'}
                    </p>
                    {course.description && (
                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-8 border-t border-slate-100">
            <Button
              onClick={handleEnroll}
              disabled={!selectedBatch || isEnrolling}
              className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  Complete Registration <ChevronRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

```

### `src/app/api/proxy-file/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing "url" parameter', { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (EduFlow LMS File Proxy)',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch target file: ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (err: any) {
    console.error('File proxy error:', err);
    return new NextResponse(`Error proxying file: ${err.message}`, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

```

### `src/app/auth/callback/route.ts`
```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/student/dashboard';

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data?.user) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      const user = data.user;
      
      // Check if user profile exists in database
      const { data: profile } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        const role = user.user_metadata?.role || 'student';
        const studentName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
        await supabase.from('users').insert({
          id: user.id,
          email: user.email,
          full_name: studentName,
          role: role,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        });

        if (role === 'student') {
          try {
            await supabase.from('notifications').insert({
              type: 'student_signup',
              title: 'New Student Registered (Google)',
              message: `${studentName} registered via Google and joined the student portal`,
              data: {
                student_id: user.id,
                student_name: studentName,
                student_email: user.email,
              },
              is_read: false,
              created_at: new Date().toISOString(),
            });
          } catch (notifErr) {
            console.warn('OAuth notification failed:', notifErr);
          }
        }

        if (next === '/dashboard' || next === '/') {
          next = role === 'teacher' ? '/teacher/dashboard' : '/onboarding';
        }
      } else if (next === '/dashboard' || next === '/') {
        next = profile.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
      }

      const redirectUrl = isLocalEnv 
        ? `${origin}${next}`
        : forwardedHost 
          ? `https://${forwardedHost}${next}` 
          : `${origin}${next}`;

      return NextResponse.redirect(redirectUrl);
    }
  }

  // Return to login with error query param if exchange fails
  return NextResponse.redirect(`${origin}/login?error=oauth_error`);
}

```
