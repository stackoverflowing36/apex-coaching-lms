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
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {a.courses?.code}
                      </span>
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
