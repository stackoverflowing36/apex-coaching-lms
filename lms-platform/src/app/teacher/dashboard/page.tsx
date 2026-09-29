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
    <div className="max-w-[1360px] mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* ============================================================
          TOP WELCOME HERO BANNER (Split Studio Banner)
          ============================================================ */}
      <div className="relative rounded-[20px] bg-[#141414] p-8 sm:p-10 text-white border border-[#2a2a2a] shadow-xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#333333] text-xs font-semibold uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-[#a8f1e0]" />
              <span>Academic Operations • Faculty Studio</span>
            </div>
            <h1 className="font-display font-bold uppercase text-3xl sm:text-5xl tracking-tight leading-tight text-white">
              Welcome back, {firstName}
            </h1>
            <p className="text-[#b7b7b5] text-xs sm:text-sm leading-relaxed">
              Manage classroom batches, grade pending student submissions, publish interactive MCQ test series, and log daily batch attendance.
            </p>
          </div>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/teacher/grading">
              <button className="bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#0c0c0c] text-xs font-bold uppercase tracking-wider py-3 px-6 rounded-[20px] flex items-center gap-2 transition-all shadow-md">
                <CheckSquare className="h-4 w-4 text-[#0c0c0c]" />
                Grading Station
              </button>
            </Link>
            <Link href="/teacher/quizzes">
              <button className="bg-[#181818] hover:bg-[#222222] border border-[#383838] text-white hover:text-[#a8f1e0] hover:border-[#a8f1e0] text-xs font-semibold uppercase tracking-wider py-3 px-6 rounded-[20px] flex items-center gap-2 transition-all">
                <HelpCircle className="h-4 w-4 text-[#ffb956]" />
                New Quiz
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* ============================================================
          METRIC STAT CARDS (3 High-Contrast Studio Cards with 79px Numbers)
          ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Pending Grading */}
        <Link href="/teacher/grading" className="group">
          <div className="bg-[#141414] border border-[#2a2a2a] hover:border-[#383838] rounded-[20px] p-6 transition-all duration-300 h-full flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-[#ffb956]/15 text-[#ffb956] border border-[#ffb956]/30 flex items-center justify-center">
                <CheckSquare className="h-6 w-6" />
              </div>
              {stats.pendingToGrade > 0 ? (
                <span className="bg-[#ffb956] text-[#0c0c0c] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-[20px] shadow-xs">
                  {stats.pendingToGrade} Pending
                </span>
              ) : (
                <span className="bg-[#9ee4a0] text-[#0c0c0c] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-[20px] shadow-xs">
                  All Clear
                </span>
              )}
            </div>
            <div>
              <div className="font-display font-bold uppercase text-[79px] leading-none text-white tracking-tight">
                {loading ? '—' : stats.pendingToGrade}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#b7b7b5] font-semibold font-condensed mt-2">
                Assignments to Grade
              </div>
              <div className="text-xs text-[#a8f1e0] font-semibold pt-3 flex items-center gap-1 uppercase tracking-wider">
                <span>Evaluate Submissions</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 2: Active Quizzes */}
        <Link href="/teacher/quizzes" className="group">
          <div className="bg-[#141414] border border-[#2a2a2a] hover:border-[#383838] rounded-[20px] p-6 transition-all duration-300 h-full flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-[#a8f1e0]/15 text-[#a8f1e0] border border-[#a8f1e0]/30 flex items-center justify-center">
                <HelpCircle className="h-6 w-6" />
              </div>
              <span className="bg-[#a8f1e0] text-[#0c0c0c] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-[20px] shadow-xs">
                Active Quizzes
              </span>
            </div>
            <div>
              <div className="font-display font-bold uppercase text-[79px] leading-none text-white tracking-tight">
                {loading ? '—' : stats.totalQuizzes}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#b7b7b5] font-semibold font-condensed mt-2">
                Active Quizzes &amp; Tests
              </div>
              <div className="text-xs text-[#a8f1e0] font-semibold pt-3 flex items-center gap-1 uppercase tracking-wider">
                <span>Question Bank</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

        {/* Metric 3: Classroom Batches & Materials */}
        <Link href="/teacher/courses" className="group">
          <div className="bg-[#141414] border border-[#2a2a2a] hover:border-[#383838] rounded-[20px] p-6 transition-all duration-300 h-full flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-[16px] bg-[#9dc1ff]/15 text-[#9dc1ff] border border-[#9dc1ff]/30 flex items-center justify-center">
                <Layers className="h-6 w-6" />
              </div>
              <span className="bg-[#9dc1ff] text-[#0c0c0c] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-[20px] shadow-xs">
                {stats.totalMaterials} Notes &amp; PDFs
              </span>
            </div>
            <div>
              <div className="font-display font-bold uppercase text-[79px] leading-none text-white tracking-tight">
                {loading ? '—' : stats.totalCourses}
              </div>
              <div className="text-xs uppercase tracking-wider text-[#b7b7b5] font-semibold font-condensed mt-2">
                Enrolled Classrooms
              </div>
              <div className="text-xs text-[#a8f1e0] font-semibold pt-3 flex items-center gap-1 uppercase tracking-wider">
                <span>Manage Course Vault</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>

      </div>

      {/* ============================================================
          MAIN WORKSPACE SPLIT: RECENT SUBMISSIONS (7) & FAST TOOLS (5)
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Recent Student Submissions Activity Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-[12px] bg-[#1c1c1c] border border-[#2a2a2a] text-[#a8f1e0] flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="font-display uppercase text-lg font-bold text-white tracking-tight">
                Recent Submissions &amp; Quick Grading
              </h2>
            </div>
            <Link href="/teacher/grading" className="text-xs font-semibold uppercase tracking-wider text-[#a8f1e0] hover:text-[#9ee4a0] hover:underline flex items-center gap-1 transition-colors">
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="bg-[#141414] border border-[#2a2a2a] rounded-[20px] p-6 space-y-3.5 shadow-xl">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-[#8e8e8e] gap-3">
                <div className="w-8 h-8 border-2 border-[#262626] border-t-[#a8f1e0] rounded-full animate-spin" />
                <span className="text-xs uppercase tracking-wider font-condensed">Loading submission feed...</span>
              </div>
            ) : recentSubmissions.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-12 h-12 rounded-[16px] bg-[#1c1c1c] border border-[#2e2e2e] text-[#8e8e8e] flex items-center justify-center mx-auto mb-2">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-xs uppercase tracking-wider font-semibold text-white font-condensed">No submissions received yet</p>
                <p className="text-xs text-[#8e8e8e] max-w-sm mx-auto">
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[20px] bg-[#181818] hover:border-[#a8f1e0]/40 border border-[#2e2e2e] transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-[#383838]">
                        <AvatarImage src={sub.users?.avatar_url} />
                        <AvatarFallback className="bg-[#242424] text-white text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs sm:text-sm text-white">
                            {studentName}
                          </span>
                          {isGraded ? (
                            <span className="bg-[#9ee4a0] text-[#0c0c0c] text-[10px] px-2 py-0.5 rounded-[20px] uppercase font-bold">
                              Graded
                            </span>
                          ) : (
                            <span className="bg-[#ffb956] text-[#0c0c0c] text-[10px] px-2 py-0.5 rounded-[20px] uppercase font-bold">
                              Needs Grading
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#b7b7b5] truncate max-w-xs sm:max-w-md font-condensed">
                          {sub.assignments?.title} • <span className="text-[#a8f1e0] font-semibold">{sub.assignments?.courses?.code}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-[#262626]">
                      {isGraded && sub.marks_obtained !== null && (
                        <span className="text-xs font-bold text-white bg-[#222222] px-2.5 py-1 rounded-[20px] border border-[#383838] font-condensed">
                          {sub.marks_obtained} / {sub.assignments?.max_marks || 100}
                        </span>
                      )}
                      <Link href={`/teacher/grading/${sub.id}`}>
                        <button
                          className={`text-xs font-semibold uppercase tracking-wider py-1.5 px-4 rounded-[20px] border transition-all ${
                            isGraded
                              ? 'bg-[#1f1f1f] text-white hover:bg-[#282828] border-[#383838]'
                              : 'bg-[#a8f1e0] text-[#0c0c0c] font-bold hover:bg-[#9ee4a0] border-[#a8f1e0]'
                          }`}
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
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-[20px] p-6 space-y-4 shadow-xl">
            <h3 className="font-display uppercase text-base font-bold text-white flex items-center gap-2 tracking-tight">
              <Sparkles className="h-4 w-4 text-[#a8f1e0]" />
              Faculty Fast Tools
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Link href="/teacher/quizzes">
                <div className="p-4 rounded-[20px] bg-[#181818] border border-[#2e2e2e] hover:border-[#a8f1e0]/50 transition-all cursor-pointer space-y-1.5 text-left group">
                  <HelpCircle className="h-5 w-5 text-[#ffb956] group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-xs text-white group-hover:text-[#a8f1e0] transition-colors">Create Quiz</div>
                  <div className="text-[11px] text-[#8e8e8e] font-condensed">Add MCQs &amp; timers</div>
                </div>
              </Link>

              <Link href="/teacher/courses">
                <div className="p-4 rounded-[20px] bg-[#181818] border border-[#2e2e2e] hover:border-[#a8f1e0]/50 transition-all cursor-pointer space-y-1.5 text-left group">
                  <UploadCloud className="h-5 w-5 text-[#9dc1ff] group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-xs text-white group-hover:text-[#a8f1e0] transition-colors">Upload PDF</div>
                  <div className="text-[11px] text-[#8e8e8e] font-condensed">Syllabus &amp; Notes</div>
                </div>
              </Link>

              <Link href="/teacher/attendance">
                <div className="p-4 rounded-[20px] bg-[#181818] border border-[#2e2e2e] hover:border-[#a8f1e0]/50 transition-all cursor-pointer space-y-1.5 text-left group">
                  <CalendarCheck className="h-5 w-5 text-[#9ee4a0] group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-xs text-white group-hover:text-[#a8f1e0] transition-colors">Log Attendance</div>
                  <div className="text-[11px] text-[#8e8e8e] font-condensed">Batch daily register</div>
                </div>
              </Link>

              <Link href="/teacher/announcements">
                <div className="p-4 rounded-[20px] bg-[#181818] border border-[#2e2e2e] hover:border-[#a8f1e0]/50 transition-all cursor-pointer space-y-1.5 text-left group">
                  <Megaphone className="h-5 w-5 text-[#e2bcc2] group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-xs text-white group-hover:text-[#a8f1e0] transition-colors">Broadcast Notice</div>
                  <div className="text-[11px] text-[#8e8e8e] font-condensed">Notify batch students</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Active Batches Mini-List */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-[20px] p-6 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display uppercase text-base font-bold text-white tracking-tight">
                Assigned Batches
              </h3>
              <Link href="/teacher/courses" className="text-xs font-semibold uppercase tracking-wider text-[#a8f1e0] hover:text-[#9ee4a0] hover:underline transition-colors">
                Manage
              </Link>
            </div>

            <div className="space-y-2.5">
              {courses.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8e8e8e]">No batches assigned yet</div>
              ) : (
                courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/teacher/courses/${course.id}`}
                    className="flex items-center justify-between p-3.5 rounded-[20px] bg-[#181818] hover:border-[#a8f1e0]/40 border border-[#2e2e2e] transition-colors group"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-xs text-white group-hover:text-[#a8f1e0] transition-colors">
                        {course.title}
                      </div>
                      <div className="text-[11px] font-semibold text-[#8e8e8e] font-condensed uppercase tracking-wider">
                        Code: <span className="text-[#a8f1e0]">{course.code}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#8e8e8e] group-hover:text-[#a8f1e0] group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
