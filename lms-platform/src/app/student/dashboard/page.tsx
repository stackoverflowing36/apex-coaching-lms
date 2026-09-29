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
          <div key={i} className="h-32 rounded-studio bg-white animate-pulse border border-stone-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ========== HERO GREETING (Split Studio Banner) ========== */}
      <div className="relative overflow-hidden rounded-studio bg-white p-8 sm:p-10 text-[#111111] border border-stone-200 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-studio bg-stone-100 text-[#a05120] border border-stone-300 text-xs font-semibold uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-[#a05120]" />
              <span>Academic Session 2026–27 • Student Studio</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#111111]">
              Welcome back, {firstName}
            </h1>
            <p className="text-stone-500 text-sm sm:text-base leading-relaxed">
              You have{' '}
              <span className="font-semibold text-[#111111] underline decoration-[#a8f1e0] decoration-2 underline-offset-4">
                {stats.pendingAssignments} pending assignment{stats.pendingAssignments !== 1 ? 's' : ''}
              </span>{' '}
              and{' '}
              <span className="font-semibold text-[#111111]">{stats.totalLectures} lectures</span>{' '}
              available in your vault.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/student/assignments">
              <button className="bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] text-xs font-bold uppercase tracking-wider py-3 px-6 rounded-studio shadow-md transition-all">
                View Assignments
              </button>
            </Link>
            <Link href="/student/lectures">
              <button className="bg-stone-50 hover:bg-stone-100 border border-stone-300 text-[#111111] hover:text-[#a05120] hover:border-[#a05120] text-xs font-semibold uppercase tracking-wider py-3 px-6 rounded-studio transition-all">
                Lecture Vault
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ========== METRIC CARDS (Architectural 1px Studio Grid) ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Lectures */}
        <div className="bg-white border border-stone-200 hover:border-stone-300 rounded-studio p-6 transition-all duration-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-[16px] bg-stone-100 border border-stone-200 flex items-center justify-center text-[#a05120]">
              <Video className="h-6 w-6" />
            </div>
            <span className="bg-stone-100 text-[#a05120] border border-stone-300 text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-studio">
              Live Vault
            </span>
          </div>
          <p className="font-display text-4xl sm:text-5xl font-bold uppercase text-[#111111] tracking-tight">
            {stats.totalLectures}
          </p>
          <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed mt-2">
            Lectures Available
          </p>
        </div>

        {/* Pending Assignments */}
        <div className="bg-white border border-stone-200 hover:border-stone-300 rounded-studio p-6 transition-all duration-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-[16px] bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
              <FileText className="h-6 w-6" />
            </div>
            {stats.pendingAssignments > 0 ? (
              <span className="bg-[#ffb956] text-[#111111] text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-studio">
                Action Required
              </span>
            ) : (
              <span className="bg-[#9ee4a0] text-[#111111] text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-studio">
                Up to Date
              </span>
            )}
          </div>
          <p className="font-display text-4xl sm:text-5xl font-bold uppercase text-[#111111] tracking-tight">
            {stats.pendingAssignments}
          </p>
          <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed mt-2">
            Pending Tasks
          </p>
        </div>

        {/* Average Score */}
        <div className="bg-white border border-stone-200 hover:border-stone-300 rounded-studio p-6 transition-all duration-300 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-[16px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Award className="h-6 w-6" />
            </div>
            {stats.gradedCount > 0 && (
              <span className="bg-[#9ee4a0] text-[#111111] text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-studio">
                {stats.gradedCount} Graded
              </span>
            )}
          </div>
          <p className="font-display text-4xl sm:text-5xl font-bold uppercase text-[#111111] tracking-tight">
            {stats.averageScore > 0 ? `${stats.averageScore}%` : '—'}
          </p>
          <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed mt-2">
            Average Score
          </p>
        </div>
      </div>

      {/* ========== TWO COLUMN: ANNOUNCEMENTS + DEADLINES ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Announcements Feed */}
        <div className="lg:col-span-3 bg-white border border-stone-200 rounded-studio overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-200">
            <div className="flex items-center gap-2.5">
              <Megaphone className="h-4 w-4 text-[#a05120]" />
              <h2 className="font-display uppercase text-lg font-bold text-[#111111] tracking-tight">
                Dispatches &amp; Notices
              </h2>
            </div>
            <span className="bg-stone-100 text-[#a05120] border border-stone-300 text-[10px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-studio">
              {announcements.length} active
            </span>
          </div>

          <div className="divide-y divide-[#222222]">
            {announcements.length === 0 ? (
              <div className="px-6 py-12 text-center text-xs uppercase tracking-wider text-stone-400 font-condensed font-semibold">
                No active announcements.
              </div>
            ) : (
              announcements.map((a) => (
                <div
                  key={a.id}
                  className="px-6 py-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-[#111111] truncate">{a.title}</p>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">{a.content}</p>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase font-bold bg-stone-100 text-[#a05120] border border-stone-300 px-2 py-0.5 rounded-studio">
                      {a.courses?.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 font-condensed uppercase tracking-wider mt-2.5">
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
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-studio overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-200">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-[#a05120]" />
              <h2 className="font-display uppercase text-lg font-bold text-[#111111] tracking-tight">
                Deadlines
              </h2>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            {upcomingAssignments.length === 0 ? (
              <div className="py-12 text-center text-xs uppercase tracking-wider text-stone-400 font-condensed font-semibold">
                All submissions up to date.
              </div>
            ) : (
              upcomingAssignments.map((a) => (
                <Link
                  key={a.id}
                  href={`/student/assignments/${a.id}`}
                  className="block group"
                >
                  <div className="rounded-studio border border-stone-200 p-4 hover:border-[#a05120]/40 transition-all duration-200 bg-stone-50">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#a05120] uppercase tracking-wider bg-stone-100 border border-stone-300 px-2 py-0.5 rounded-studio font-condensed">
                          {a.courses?.code}
                        </span>
                        {a.course_chapters?.title && (
                          <span className="text-[10px] px-2 py-0.5 font-bold uppercase rounded-studio bg-stone-100 text-[#111111] border border-stone-300">
                            {a.course_chapters.title}
                          </span>
                        )}
                      </div>
                      <span className="bg-[#ffb956] text-[#111111] text-[10px] px-2.5 py-0.5 uppercase tracking-wider font-bold rounded-studio">
                        {getTimeUntil(a.due_date)}
                      </span>
                    </div>
                    <p className="font-semibold text-sm text-[#111111] group-hover:text-[#a05120] transition-colors">
                      {a.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2.5 text-xs text-stone-400 font-condensed">
                      <Clock className="h-3 w-3" />
                      <span>
                        Due{' '}
                        {new Date(a.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      <span className="ml-auto text-[#a05120] font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity uppercase text-[10px] tracking-wider">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Link
          href="/student/lectures"
          className="group flex items-center gap-4 bg-white border border-stone-200 hover:border-[#a05120]/40 rounded-studio p-5 shadow-lg transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-[16px] bg-stone-100 border border-stone-200 flex items-center justify-center text-[#a05120] group-hover:scale-105 transition-transform">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#111111] group-hover:text-[#a05120] transition-colors">Lecture Vault</p>
            <p className="text-xs text-stone-400">Recordings &amp; study notes</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 ml-auto group-hover:text-[#a05120] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/assignments"
          className="group flex items-center gap-4 bg-white border border-stone-200 hover:border-[#a05120]/40 rounded-studio p-5 shadow-lg transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-[16px] bg-stone-100 border border-stone-200 flex items-center justify-center text-amber-700 group-hover:scale-105 transition-transform">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#111111] group-hover:text-[#a05120] transition-colors">Assignments</p>
            <p className="text-xs text-stone-400">Submit work &amp; feedback</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 ml-auto group-hover:text-[#a05120] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/grades"
          className="group flex items-center gap-4 bg-white border border-stone-200 hover:border-[#a05120]/40 rounded-studio p-5 shadow-lg transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-[16px] bg-stone-100 border border-stone-200 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#111111] group-hover:text-[#a05120] transition-colors">Studio Grades</p>
            <p className="text-xs text-stone-400">Performance &amp; marks</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-400 ml-auto group-hover:text-[#a05120] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
