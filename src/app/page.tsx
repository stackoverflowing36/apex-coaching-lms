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
            <span className="font-heading font-extrabold text-slate-900">Apex Institute LMS</span>
            <span className="text-xs text-slate-400 pl-2">© 2026 Academic Operations. All rights reserved.</span>
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
