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
          TOP WELCOME HERO BANNER (Split Studio Banner)
          ============================================================ */}
      <div className="relative rounded-studio bg-[#1c1b18] p-8 sm:p-10 text-[#fbfbfa] border border-stone-800 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill bg-[#a05120] text-white text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5" />
              <span>EduFlow Academic Operations • Faculty Console</span>
            </div>
            <h1 className="font-display font-bold uppercase text-3xl sm:text-5xl tracking-tight leading-tight text-[#fbfbfa]">
              Welcome back, {firstName}
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              Manage classroom batches, grade pending homework sheets, publish MCQ test series, and log daily batch attendance.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/teacher/grading">
              <button className="btn-pill btn-rust text-xs font-semibold uppercase tracking-wider py-2.5 px-5 flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4" />
                Grading Station
              </button>
            </Link>
            <Link href="/teacher/quizzes">
              <button className="btn-pill btn-studio-outline border-stone-700 text-stone-200 hover:bg-stone-800 text-xs font-semibold uppercase tracking-wider py-2.5 px-5 flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-[#ffb956]" />
                New Quiz
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================
          METRIC STAT CARDS (Architectural 1px Studio Grid)
          ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Pending Grading */}
        <Link href="/teacher/grading" className="group">
          <div className="studio-card p-6 hover:border-stone-400 transition-all duration-300 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-pill bg-[#a05120]/10 text-[#a05120] flex items-center justify-center">
                <CheckSquare className="h-5 w-5" />
              </div>
              {stats.pendingToGrade > 0 ? (
                <Badge variant="rust" className="text-[10px] uppercase font-semibold">
                  Action Required
                </Badge>
              ) : (
                <Badge variant="mint" className="text-[10px] uppercase font-semibold">
                  Cleared
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="font-display font-bold uppercase text-4xl sm:text-5xl text-[#111111] tracking-tight">
                {loading ? '—' : stats.pendingToGrade}
              </div>
              <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed">
                Assignments to Grade
              </div>
              <div className="text-[11px] text-[#a05120] font-semibold pt-2 flex items-center gap-1 uppercase tracking-wider">
                <span>Evaluate submissions</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 2: Active Quizzes */}
        <Link href="/teacher/quizzes" className="group">
          <div className="studio-card p-6 hover:border-stone-400 transition-all duration-300 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-pill bg-[#ffb956]/20 text-stone-900 flex items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <Badge variant="gold" className="text-[10px] uppercase font-semibold">
                Quizzes
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="font-display font-bold uppercase text-4xl sm:text-5xl text-[#111111] tracking-tight">
                {loading ? '—' : stats.totalQuizzes}
              </div>
              <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed">
                Active Quizzes &amp; Tests
              </div>
              <div className="text-[11px] text-stone-700 font-semibold pt-2 flex items-center gap-1 uppercase tracking-wider">
                <span>Question Bank</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 3: Classroom Batches */}
        <Link href="/teacher/courses" className="group">
          <div className="studio-card p-6 hover:border-stone-400 transition-all duration-300 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-pill bg-[#a8f1e0]/30 text-stone-900 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <Badge variant="mint" className="text-[10px] uppercase font-semibold">
                Batches
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="font-display font-bold uppercase text-4xl sm:text-5xl text-[#111111] tracking-tight">
                {loading ? '—' : stats.totalCourses}
              </div>
              <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed">
                Classroom Batches
              </div>
              <div className="text-[11px] text-stone-700 font-semibold pt-2 flex items-center gap-1 uppercase tracking-wider">
                <span>{stats.totalMaterials} Notes &amp; PDFs</span>
                <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 4: Today's Attendance */}
        <Link href="/teacher/attendance" className="group">
          <div className="studio-card p-6 hover:border-stone-400 transition-all duration-300 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-pill bg-stone-100 text-stone-900 flex items-center justify-center">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <Badge variant="stone" className="text-[10px] uppercase font-semibold">
                Today
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="font-display font-bold uppercase text-4xl sm:text-5xl text-[#111111] tracking-tight">
                {loading ? '—' : stats.todayAttendanceCount}
              </div>
              <div className="text-xs uppercase tracking-wider text-stone-500 font-semibold font-condensed">
                Attendance Marked Today
              </div>
              <div className="text-[11px] text-stone-700 font-semibold pt-2 flex items-center gap-1 uppercase tracking-wider">
                <span>Daily Register</span>
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
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-pill bg-stone-100 text-[#111111] flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="font-display uppercase text-lg font-bold text-[#111111] tracking-tight">
                Recent Student Submissions
              </h2>
            </div>
            <Link href="/teacher/grading" className="text-xs font-semibold uppercase tracking-wider text-[#a05120] hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="studio-card p-5 sm:p-6 space-y-3.5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
                <div className="w-8 h-8 border-2 border-stone-200 border-t-[#a05120] rounded-full animate-spin" />
                <span className="text-xs uppercase tracking-wider font-condensed">Loading submission feed...</span>
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <FileText className="h-8 w-8 text-stone-300 mx-auto" />
                <p className="text-xs uppercase tracking-wider font-semibold text-stone-700 font-condensed">No submissions received yet</p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-studio bg-[#fbfbfa] hover:border-stone-900 border border-stone-200 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-stone-300">
                        <AvatarImage src={sub.users?.avatar_url} />
                        <AvatarFallback className="bg-[#111111] text-[#fbfbfa] text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-[#111111]">
                            {studentName}
                          </span>
                          <Badge
                            variant={isGraded ? 'mint' : 'rust'}
                            className="text-[10px] px-2 py-0 uppercase font-semibold"
                          >
                            {isGraded ? 'Graded' : 'Needs Grading'}
                          </Badge>
                        </div>
                        <p className="text-xs text-stone-500 truncate max-w-xs sm:max-w-md font-condensed">
                          {sub.assignments?.title} • <span className="text-stone-800 font-semibold">{sub.assignments?.courses?.code}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-stone-200">
                      {isGraded && sub.marks_obtained !== null && (
                        <span className="text-xs font-bold text-stone-900 bg-stone-100 px-2.5 py-1 rounded-pill border border-stone-200 font-condensed">
                          {sub.marks_obtained} / {sub.assignments?.max_marks || 100}
                        </span>
                      )}
                      <Link href={`/teacher/grading/${sub.id}`}>
                        <button
                          className="btn-pill btn-dark text-xs font-semibold uppercase tracking-wider py-1.5 px-4"
                        >
                          {isGraded ? 'Review' : 'Grade Paper'}
                        </button>
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
          <div className="studio-card p-6 space-y-4">
            <h3 className="font-display uppercase text-base font-bold text-[#111111] flex items-center gap-2 tracking-tight">
              <Sparkles className="h-4 w-4 text-[#a05120]" />
              Faculty Fast Tools
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/teacher/quizzes">
                <div className="p-3.5 rounded-studio bg-[#fbfbfa] border border-stone-200 hover:border-stone-900 transition-all cursor-pointer space-y-1 text-left">
                  <HelpCircle className="h-5 w-5 text-[#a05120]" />
                  <div className="font-semibold text-xs text-[#111111]">Create Quiz</div>
                  <div className="text-[10px] text-stone-500 font-condensed">Add MCQs &amp; timers</div>
                </div>
              </Link>

              <Link href="/teacher/courses">
                <div className="p-3.5 rounded-studio bg-[#fbfbfa] border border-stone-200 hover:border-stone-900 transition-all cursor-pointer space-y-1 text-left">
                  <UploadCloud className="h-5 w-5 text-stone-800" />
                  <div className="font-semibold text-xs text-[#111111]">Upload PDF</div>
                  <div className="text-[10px] text-stone-500 font-condensed">Syllabus &amp; Notes</div>
                </div>
              </Link>

              <Link href="/teacher/attendance">
                <div className="p-3.5 rounded-studio bg-[#fbfbfa] border border-stone-200 hover:border-stone-900 transition-all cursor-pointer space-y-1 text-left">
                  <CalendarCheck className="h-5 w-5 text-stone-800" />
                  <div className="font-semibold text-xs text-[#111111]">Log Attendance</div>
                  <div className="text-[10px] text-stone-500 font-condensed">Batch daily register</div>
                </div>
              </Link>

              <Link href="/teacher/announcements">
                <div className="p-3.5 rounded-studio bg-[#fbfbfa] border border-stone-200 hover:border-stone-900 transition-all cursor-pointer space-y-1 text-left">
                  <Megaphone className="h-5 w-5 text-[#a05120]" />
                  <div className="font-semibold text-xs text-[#111111]">Broadcast Notice</div>
                  <div className="text-[10px] text-stone-500 font-condensed">Notify batch students</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Active Batches Mini-List */}
          <div className="studio-card p-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display uppercase text-base font-bold text-[#111111] tracking-tight">
                Assigned Batches
              </h3>
              <Link href="/teacher/courses" className="text-xs font-semibold uppercase tracking-wider text-[#a05120] hover:underline">
                Manage
              </Link>
            </div>

            <div className="space-y-2.5">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/teacher/courses/${course.id}`}
                  className="flex items-center justify-between p-3.5 rounded-studio bg-[#fbfbfa] hover:border-stone-900 border border-stone-200 transition-colors group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-[#111111] group-hover:text-[#a05120] transition-colors">
                      {course.title}
                    </div>
                    <div className="text-[10px] font-semibold text-stone-500 font-condensed uppercase tracking-wider">
                      Code: {course.code}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
