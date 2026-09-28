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
    <div className="min-h-screen bg-[#fbfbfa] text-[#111111] selection:bg-[#a05120]/20 selection:text-[#63200c] relative overflow-x-hidden font-sans">
      {/* Subtle Intersecting Grid Background */}
      <BackgroundGrid />

      {/* Centered Floating Pill Navbar */}
      <Navbar />

      {/* ============================================================
          HERO SECTION (CIID Split Studio Architecture)
          ============================================================ */}
      <section className="relative pt-32 sm:pt-36 lg:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Hero Left Column */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Small Top Pill Badge (CIID Mint & Studio Capsule) */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-[#a8f1e0] text-[#111111] text-xs sm:text-sm font-medium border border-[#a8f1e0]/80 shadow-studio animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="flex h-2 w-2 rounded-full bg-[#111111] animate-ping"></span>
              <Sparkles className="h-4 w-4 text-[#111111]" />
              <span className="font-semibold tracking-wide">CIID ACADEMIC STUDIO 2026</span>
            </div>

            {/* Headline with tight tracking and Rust Terracotta accent */}
            <h1 className="font-display font-bold uppercase text-5xl sm:text-6xl lg:text-[76px] tracking-tight leading-[1.02] text-[#111111]">
              Master the Syllabus.
              <span className="block text-[#a05120] mt-1">
                Excel in Every Exam.
              </span>
            </h1>

            {/* Subtext */}
            <p className="text-base sm:text-lg lg:text-xl text-stone-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Access daily live lectures, submitted assignment feedback, batch schedules, and curated study materials in one centralized studio portal.
            </p>

            {/* CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5">
              <Link href="/login?role=student" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-pill bg-[#a05120] hover:bg-[#854218] text-white font-medium px-8 h-12 text-sm shadow-sm transition-all group"
                >
                  Enter Student Portal
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              
              <Link href="/login?role=teacher" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-pill border border-[#988a79] bg-transparent text-[#111111] hover:bg-[#f3f1ec] font-medium px-7 h-12 text-sm"
                >
                  Faculty Dashboard
                </Button>
              </Link>
            </div>

            {/* Live Real-time Academic Counters (Studio 1px architectural grid) */}
            <div className="pt-6 border-t border-stone-200/80 grid grid-cols-3 gap-3 text-left">
              <div className="p-3.5 border border-stone-200/90 bg-white">
                <div className="font-display font-bold text-2xl sm:text-3xl text-[#111111] leading-none">
                  {isLoaded ? `${stats.batchesCount} ACTIVE` : '—'}
                </div>
                <div className="text-[11px] text-stone-500 font-medium uppercase tracking-wider mt-1">Classroom Batches</div>
              </div>
              <div className="p-3.5 border border-stone-200/90 bg-white">
                <div className="font-display font-bold text-2xl sm:text-3xl text-[#a05120] leading-none">
                  {isLoaded ? recordedHoursLabel.toUpperCase() : '—'}
                </div>
                <div className="text-[11px] text-stone-500 font-medium uppercase tracking-wider mt-1">Recorded Archives</div>
              </div>
              <div className="p-3.5 border border-stone-200/90 bg-white">
                <div className="font-display font-bold text-2xl sm:text-3xl text-[#63200c] leading-none">
                  {isLoaded ? `${stats.assignmentsCount} ACTIVE` : '—'}
                </div>
                <div className="text-[11px] text-stone-500 font-medium uppercase tracking-wider mt-1">Live DPPs &amp; Tasks</div>
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
          ============================================================ */}
      {stats.announcements && stats.announcements.length > 0 && (
        <section id="curriculum" className="py-4 border-y border-stone-200 bg-[#f3f1ec]/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#a05120] animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5 font-display">
                  <Bell className="h-4 w-4 text-[#a05120]" />
                  Live Academic Notice:
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-stone-700">
                {stats.announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-pill border border-stone-200 shadow-sm"
                  >
                    <span className="font-bold text-[#111111]">
                      {announcement.courses?.code || 'Studio'}:
                    </span>
                    <span className="truncate max-w-[280px] sm:max-w-md">
                      {announcement.title}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/login?role=student" className="text-xs font-bold text-[#a05120] hover:text-[#63200c] flex items-center gap-1 uppercase tracking-wider font-display">
                Full Schedule <ChevronRight className="h-3.5 w-3.5" />
              </Link>

            </div>
          </div>
        </section>
      )}

      {/* ============================================================
          VISUAL FEATURE SHOWCASE SECTION
          ============================================================ */}
      <InstituteFeatureGrid />

      {/* ============================================================
          STUDENT & FACULTY PORTAL ACCESS BANNER (CIID Studio Dark)
          ============================================================ */}
      <section id="announcements" className="py-16 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto">
        <div className="relative bg-[#111111] border border-stone-800 p-8 sm:p-12 text-[#fbfbfa] overflow-hidden">
          
          <div className="relative z-10 max-w-2xl space-y-6 text-center sm:text-left">
            <Badge className="bg-[#a8f1e0] text-[#111111] border-none rounded-pill px-4 py-1 font-semibold text-xs tracking-wider uppercase">
              Enrolled Institute Members
            </Badge>
            <h2 className="font-display font-bold uppercase text-3xl sm:text-5xl tracking-tight leading-tight">
              Ready to access your batch lectures and test series?
            </h2>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              Login with your institute email to view your personalized classroom feed, submit homework sheets, and track your AIR mock test percentiles.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
              <Link href="/login?role=student" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-pill bg-[#a05120] hover:bg-[#854218] text-white font-medium px-8 h-12 text-sm shadow-sm"
                >
                  Student Portal Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-pill border-stone-600 bg-transparent text-[#fbfbfa] hover:bg-stone-900 font-medium px-7 h-12 text-sm"
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
      <footer className="py-10 border-t border-stone-200 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#111111] flex items-center justify-center text-white">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="font-display font-bold uppercase text-lg text-[#111111]">EduFlow LMS</span>
            <span className="text-xs text-stone-500 pl-2">© 2026 EduFlow Academic Studio. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login?role=student">
              <Button variant="ghost" size="sm" className="rounded-pill text-stone-700 hover:text-stone-900 text-xs">
                Student Access
              </Button>
            </Link>
            <Link href="/login?role=teacher">
              <Button variant="ghost" size="sm" className="rounded-pill text-stone-700 hover:text-stone-900 text-xs">
                Faculty Access
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-pill bg-[#a05120] hover:bg-[#854218] text-white text-xs px-4">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
