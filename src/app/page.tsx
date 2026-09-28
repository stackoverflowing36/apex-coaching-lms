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
import { HeroSlider } from '@/components/HeroSlider';
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
      
      {/* Editorial Floating Navbar */}
      <Navbar />

      {/* ============================================================
          HERO CAROUSEL SLIDER (Full Bleed with Photographic Slides)
          Stating the app features with high-impact bold typography
          ============================================================ */}
      <HeroSlider />

      {/* ============================================================
          EDITORIAL FEATURE OVERVIEW SECTION
          (Directly inspired by the 2-column layout in the example website)
          ============================================================ */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto border-b border-stone-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          
          {/* Left Column: Editorial Announcement & Mission Statement */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill bg-[#a8f1e0] text-[#111111] text-xs font-condensed font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-[#111111]" />
                <span>Next-Gen Academic Coaching Architecture</span>
              </div>

              <h2 className="font-display font-black uppercase text-3xl sm:text-5xl lg:text-[46px] text-[#111111] tracking-tight leading-[1.06]">
                Structured Classroom Delivery &amp; Continuous Digital Evaluation
              </h2>

              <p className="text-stone-600 text-sm sm:text-base leading-relaxed font-sans">
                EduFlow is built on the rigorous philosophy of continuous evaluation, active problem derivation, and structured mentoring. Every lecture is recorded in high definition, every homework submission receives line-by-line handwritten feedback, and every mock test mirrors real competitive exam pressures.
              </p>
            </div>

            {/* CTAs */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href="/login?role=student">
                <Button
                  size="lg"
                  className="rounded-pill bg-[#a05120] hover:bg-[#864319] text-white font-condensed font-bold uppercase tracking-wider text-xs px-8 h-12 shadow-sm transition-all"
                >
                  Enter Student Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/login?role=teacher">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-pill border-stone-300 bg-white hover:bg-stone-100 text-stone-800 font-condensed font-bold uppercase tracking-wider text-xs px-7 h-12 transition-all"
                >
                  Faculty Evaluation Hub
                </Button>
              </Link>
            </div>

            {/* Live Real-time Academic Counters (1px Architectural Grid) */}
            <div className="pt-6 border-t border-stone-200 grid grid-cols-3 gap-3 text-left">
              <div className="p-3.5 border border-stone-200 bg-white rounded-studio">
                <div className="font-display font-bold text-2xl sm:text-3xl text-[#111111] leading-none">
                  {isLoaded ? `${stats.batchesCount} ACTIVE` : '—'}
                </div>
                <div className="text-[10px] text-stone-500 font-condensed font-bold uppercase tracking-wider mt-1.5">Classroom Batches</div>
              </div>
              <div className="p-3.5 border border-stone-200 bg-white rounded-studio">
                <div className="font-display font-bold text-2xl sm:text-3xl text-[#a05120] leading-none">
                  {isLoaded ? recordedHoursLabel.toUpperCase() : '—'}
                </div>
                <div className="text-[10px] text-stone-500 font-condensed font-bold uppercase tracking-wider mt-1.5">Recorded Archives</div>
              </div>
              <div className="p-3.5 border border-stone-200 bg-white rounded-studio">
                <div className="font-display font-bold text-2xl sm:text-3xl text-stone-900 leading-none">
                  {isLoaded ? `${stats.assignmentsCount} ACTIVE` : '—'}
                </div>
                <div className="text-[10px] text-stone-500 font-condensed font-bold uppercase tracking-wider mt-1.5">Live DPPs &amp; Tasks</div>
              </div>
            </div>

          </div>

          {/* Right Column: High-Impact Promo Card (Inspired by example website's graphic card) */}
          <div className="lg:col-span-5 relative group">
            <div className="relative h-full min-h-[380px] rounded-studio overflow-hidden border border-stone-800 shadow-2xl p-8 sm:p-10 flex flex-col justify-between bg-stone-950 text-white">
              
              {/* Background Photography with Warm Tone */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:scale-105 transition-transform duration-700 ease-out"
                style={{
                  backgroundImage: `url('https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80')`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/80 to-stone-950/50" />

              {/* Card Header Content */}
              <div className="relative z-10 space-y-4">
                <Badge className="bg-[#ffb956] text-[#111111] border-none font-condensed font-extrabold uppercase tracking-widest text-[11px] px-3 py-1 rounded-pill">
                  Admissions Open
                </Badge>
                
                <h3 className="font-display font-black uppercase text-3xl sm:text-4xl text-white tracking-tight leading-[0.98]">
                  SUMMER 2026-27 FOUNDATION BATCHES
                </h3>
                
                <p className="text-stone-300 text-xs sm:text-sm leading-relaxed font-sans">
                  Comprehensive academic curriculum for JEE Advanced, NEET-UG, and Olympiads. Starting April 23rd. Limited to 35 students per batch for personalized mentoring.
                </p>

                <div className="space-y-1.5 text-xs font-condensed uppercase tracking-wider text-stone-300 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#a8f1e0]" />
                    <span>Printed Daily Practice Problem (DPP) Books</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#a8f1e0]" />
                    <span>Line-by-line Handwritten Digital Corrections</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#a8f1e0]" />
                    <span>Weekly All-India Computer Based Tests (CBT)</span>
                  </div>
                </div>
              </div>

              {/* Card Footer Button */}
              <div className="relative z-10 pt-6">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="w-full rounded-pill bg-[#a05120] hover:bg-[#864319] text-white font-condensed font-bold uppercase tracking-wider text-xs h-11 shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Reserve Your Seat Online</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ============================================================
          LIVE REAL-TIME NOTICE TICKER
          ============================================================ */}
      {stats.announcements && stats.announcements.length > 0 && (
        <section id="curriculum" className="py-3.5 border-b border-stone-200 bg-[#f3f1ec]/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <span className="flex h-2.5 w-2.5 rounded-full bg-[#a05120] animate-pulse"></span>
                <span className="text-xs font-condensed font-bold uppercase tracking-wider text-[#111111] flex items-center gap-1.5 font-display">
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
                      {announcement.courses?.code || 'Notice'}:
                    </span>
                    <span className="truncate max-w-[280px] sm:max-w-md text-stone-600">
                      {announcement.title}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/login?role=student" className="text-xs font-condensed font-bold text-[#a05120] hover:text-[#864319] flex items-center gap-1 uppercase tracking-wider">
                Full Bulletin <ChevronRight className="h-3.5 w-3.5" />
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
          STUDENT & FACULTY PORTAL ACCESS BANNER
          ============================================================ */}
      <section id="announcements" className="py-16 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto">
        <div className="relative rounded-studio bg-[#111111] border border-stone-800 p-8 sm:p-12 text-[#fbfbfa] overflow-hidden">
          
          <div className="relative z-10 max-w-2xl space-y-5 text-center sm:text-left">
            <Badge className="bg-[#a8f1e0] text-[#111111] border-none rounded-pill px-4 py-1 font-condensed font-bold text-xs tracking-wider uppercase">
              Enrolled Institute Members
            </Badge>
            <h2 className="font-display font-black uppercase text-3xl sm:text-5xl tracking-tight leading-tight">
              Ready to access your batch lectures and test series?
            </h2>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Login with your institute account to view your personalized classroom feed, submit homework sheets, and track your AIR mock test percentiles.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link href="/login?role=student" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto rounded-pill bg-[#a05120] hover:bg-[#864319] text-white font-condensed font-bold uppercase tracking-wider text-xs px-8 h-12 shadow-sm"
                >
                  Student Portal Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto rounded-pill border-stone-700 bg-transparent text-[#fbfbfa] hover:bg-stone-900 font-condensed font-bold uppercase tracking-wider text-xs px-7 h-12"
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
            <div className="h-8 w-8 rounded-pill bg-[#111111] flex items-center justify-center text-white font-display font-extrabold text-sm">
              E
            </div>
            <span className="font-display font-bold uppercase text-lg text-[#111111]">EduFlow LMS</span>
            <span className="text-xs text-stone-500 pl-2">© 2026 EduFlow Coaching Academy. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-3 font-condensed text-xs font-semibold uppercase tracking-wider">
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
              <Button size="sm" className="rounded-pill bg-[#a05120] hover:bg-[#864319] text-white text-xs px-4">
                Register
              </Button>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
