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
          <div key={i} className="h-32 rounded-studio bg-stone-100 animate-pulse border border-stone-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* ========== HERO GREETING (Split Studio Banner) ========== */}
      <div className="relative overflow-hidden rounded-studio bg-[#1c1b18] p-8 sm:p-10 text-[#fbfbfa] border border-stone-800 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-[#a8f1e0] text-[#111111] text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Academic Session 2026–27 • Student Studio</span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#fbfbfa]">
              Welcome back, {firstName}
            </h1>
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
              You have{' '}
              <span className="font-semibold text-white underline decoration-[#a05120] decoration-2 underline-offset-4">
                {stats.pendingAssignments} pending assignment{stats.pendingAssignments !== 1 ? 's' : ''}
              </span>{' '}
              and{' '}
              <span className="font-semibold text-white">{stats.totalLectures} lectures</span>{' '}
              available in your vault.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/student/assignments">
              <button className="btn-pill btn-rust text-xs font-semibold uppercase tracking-wider py-2.5 px-5">
                View Assignments
              </button>
            </Link>
            <Link href="/student/lectures">
              <button className="btn-pill btn-studio-outline border-stone-700 text-stone-200 hover:bg-stone-800 text-xs font-semibold uppercase tracking-wider py-2.5 px-5">
                Lecture Vault
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ========== METRIC CARDS (Architectural 1px Studio Grid) ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Lectures */}
        <div className="studio-card p-6 hover:border-stone-400 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-pill bg-stone-100 flex items-center justify-center text-stone-800">
              <Video className="h-5 w-5" />
            </div>
            <Badge variant="stone" className="text-[10px] uppercase font-semibold">
              Live Vault
            </Badge>
          </div>
          <p className="font-display text-4xl sm:text-5xl font-bold uppercase text-[#111111] tracking-tight">
            {stats.totalLectures}
          </p>
          <p className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed mt-2">
            Lectures Available
          </p>
        </div>

        {/* Pending Assignments */}
        <div className="studio-card p-6 hover:border-stone-400 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-pill bg-[#a05120]/10 flex items-center justify-center text-[#a05120]">
              <FileText className="h-5 w-5" />
            </div>
            {stats.pendingAssignments > 0 ? (
              <Badge variant="rust" className="text-[10px] uppercase font-semibold">
                Action Required
              </Badge>
            ) : (
              <Badge variant="mint" className="text-[10px] uppercase font-semibold">
                Up to Date
              </Badge>
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
        <div className="studio-card p-6 hover:border-stone-400 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-pill bg-[#a8f1e0]/30 flex items-center justify-center text-stone-800">
              <Award className="h-5 w-5" />
            </div>
            {stats.gradedCount > 0 && (
              <Badge variant="mint" className="text-[10px] uppercase font-semibold">
                {stats.gradedCount} graded
              </Badge>
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
        <div className="lg:col-span-3 studio-card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <Megaphone className="h-4 w-4 text-[#a05120]" />
              <h2 className="font-display uppercase text-lg font-bold text-[#111111] tracking-tight">
                Dispatches & Notices
              </h2>
            </div>
            <Badge variant="rust" className="text-[10px] uppercase tracking-wider font-semibold">
              {announcements.length} active
            </Badge>
          </div>

          <div className="divide-y divide-stone-100">
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
                      <p className="text-xs text-stone-600 mt-1 line-clamp-2 leading-relaxed">{a.content}</p>
                    </div>
                    <Badge variant="stone" className="shrink-0 text-[10px] uppercase font-semibold">
                      {a.courses?.code}
                    </Badge>
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
        <div className="lg:col-span-2 studio-card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4 w-4 text-stone-700" />
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
                  <div className="rounded-studio border border-stone-200 p-4 hover:border-stone-900 transition-all duration-200 bg-[#fbfbfa]">
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider bg-stone-200/70 px-2 py-0.5 rounded-pill font-condensed">
                          {a.courses?.code}
                        </span>
                        {a.course_chapters?.title && (
                          <Badge variant="stone" className="text-[10px] px-1.5 py-0">
                            {a.course_chapters.title}
                          </Badge>
                        )}
                      </div>
                      <Badge variant="gold" className="text-[10px] px-2 py-0.5 uppercase tracking-wider">
                        {getTimeUntil(a.due_date)}
                      </Badge>
                    </div>
                    <p className="font-semibold text-sm text-[#111111] group-hover:text-[#a05120] transition-colors">
                      {a.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2.5 text-xs text-stone-500 font-condensed">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/student/lectures"
          className="group flex items-center gap-4 studio-card p-5 hover:border-stone-900 transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-studio bg-stone-100 flex items-center justify-center text-stone-900 group-hover:bg-[#111111] group-hover:text-white transition-colors">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#111111]">Lecture Vault</p>
            <p className="text-xs text-stone-500">Recordings & study notes</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-300 ml-auto group-hover:text-[#111111] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/assignments"
          className="group flex items-center gap-4 studio-card p-5 hover:border-stone-900 transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-studio bg-stone-100 flex items-center justify-center text-stone-900 group-hover:bg-[#111111] group-hover:text-white transition-colors">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#111111]">Assignments</p>
            <p className="text-xs text-stone-500">Submit work & feedback</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-300 ml-auto group-hover:text-[#111111] group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/student/grades"
          className="group flex items-center gap-4 studio-card p-5 hover:border-stone-900 transition-all duration-300"
        >
          <div className="w-11 h-11 rounded-studio bg-stone-100 flex items-center justify-center text-stone-900 group-hover:bg-[#111111] group-hover:text-white transition-colors">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[#111111]">Studio Grades</p>
            <p className="text-xs text-stone-500">Performance & marks</p>
          </div>
          <ArrowRight className="h-4 w-4 text-stone-300 ml-auto group-hover:text-[#111111] group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}
