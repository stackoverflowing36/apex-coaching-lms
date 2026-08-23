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
import { useTeacherUser } from '@/app/teacher/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function TeacherDashboardPage() {
  const user = useTeacherUser();
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
              <span>Apex Institute Academic Operations</span>
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
