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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getMySubmissions, getStudentAttendanceSummary } from '@/lib/supabase/queries';
import { useUser } from '../layout';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function GradesPage() {
  const user = useUser();
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
        <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200/80">
          <TabsTrigger
            value="grades"
            className="rounded-full text-xs font-bold px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
          >
            <Award className="h-3.5 w-3.5 mr-1.5" />
            Assignment Evaluations ({submissions.length})
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="rounded-full text-xs font-bold px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm"
          >
            <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
            My Attendance History ({attendance.records.length})
          </TabsTrigger>
        </TabsList>

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
                          ) : (
                            <Clock className="h-5 w-5 text-slate-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate text-sm sm:text-base">
                            {s.assignments?.title || 'Assignment'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400 font-bold">
                              {s.assignments?.courses?.code}
                            </span>
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
                                  href={s.file_url}
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

                          {/* Checked Copy with Ticks & Annotations */}
                          {s.checked_copy_url && (
                            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Award className="h-5 w-5 text-orange-600 shrink-0" />
                                <div>
                                  <p className="text-xs font-extrabold text-orange-950">
                                    Teacher&apos;s Checked Copy Available
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    Includes handwritten ticks (✓), crosses (✗), and corrections
                                  </p>
                                </div>
                              </div>

                              <a
                                href={s.checked_copy_url}
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
