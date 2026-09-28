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
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getMySubmissions, getStudentAttendanceSummary } from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default function GradesPage() {
  const { user } = useAuthUser();
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

  /** Resolves a stored course-material path to a browser-accessible URL. */
  function resolveFileUrl(url?: string | null) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';
    return `${baseUrl}/storage/v1/object/public/course-materials/${url}`;
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
        <h1 className="font-display uppercase text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
          Grades, Feedback &amp; Attendance
        </h1>
        <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-stone-500 mt-1">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''} ·{' '}
          {gradedSubmissions.length} graded · Attendance Rate: {attendance.percentage}%
        </p>
      </div>

      {/* ========== OVERVIEW CARDS (Architectural 1px Studio Grid) ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="studio-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-pill bg-[#a8f1e0]/30 text-stone-800 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-stone-500 font-bold uppercase font-condensed tracking-wider">Average Score</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-[#111111]">
            {gradedSubmissions.length > 0 ? `${averageScore}%` : '—'}
          </p>
        </div>

        <div className="studio-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-pill bg-stone-100 text-stone-800 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-stone-500 font-bold uppercase font-condensed tracking-wider">Highest Score</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-[#111111]">
            {gradedSubmissions.length > 0 ? highestScore : '—'}
          </p>
        </div>

        <div className="studio-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-pill bg-stone-100 text-stone-800 flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-stone-500 font-bold uppercase font-condensed tracking-wider">Attendance</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-[#111111]">
            {attendance.percentage}%
          </p>
        </div>

        <div className="studio-card p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-pill bg-[#a05120]/10 text-[#a05120] flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-stone-500 font-bold uppercase font-condensed tracking-wider">Pending Review</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-[#111111]">
            {pendingSubmissions.length}
          </p>
        </div>
      </div>

      {/* ========== TABS: ASSIGNMENT GRADES VS ATTENDANCE REGISTER ========== */}
      <Tabs defaultValue="grades" className="space-y-6">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="bg-[#f3f1ec] p-1 rounded-pill border border-stone-200 inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="grades"
              className="rounded-pill text-xs font-semibold uppercase tracking-wider px-4 sm:px-5 py-2 data-[state=active]:bg-[#111111] data-[state=active]:text-[#fbfbfa] data-[state=active]:shadow-sm text-stone-600"
            >
              <Award className="h-3.5 w-3.5 mr-1.5" />
              Evaluations ({submissions.length})
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="rounded-pill text-xs font-semibold uppercase tracking-wider px-4 sm:px-5 py-2 data-[state=active]:bg-[#111111] data-[state=active]:text-[#fbfbfa] data-[state=active]:shadow-sm text-stone-600"
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
              Attendance Record ({attendance.records.length})
            </TabsTrigger>
          </TabsList>
        </div>

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
                const isNeedsResubmit = s.status === 'needs_resubmission';

                return (
                  <div
                    key={s.id}
                    className="studio-card overflow-hidden transition-all duration-200"
                  >
                    {/* Row Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="w-full px-6 py-5 flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Score Circle */}
                        <div
                          className={`shrink-0 w-12 h-12 rounded-studio flex items-center justify-center border border-stone-200 ${
                            isGraded
                              ? 'bg-stone-100 text-stone-900'
                              : isNeedsResubmit
                              ? 'bg-[#e2bcc2]/30 text-rose-700'
                              : 'bg-stone-50 text-stone-400'
                          }`}
                        >
                          {isGraded ? (
                            <span className="font-display text-xl font-bold uppercase text-[#111111]">
                              {s.marks_obtained}
                            </span>
                          ) : isNeedsResubmit ? (
                            <AlertCircle className="h-5 w-5 text-rose-500" />
                          ) : (
                            <Clock className="h-5 w-5 text-stone-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900 truncate text-sm sm:text-base">
                            {s.assignments?.title || 'Assignment'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider bg-stone-200/70 px-2 py-0.5 rounded-pill font-condensed">
                              {s.assignments?.courses?.code}
                            </span>
                            {s.assignments?.course_chapters?.title && (
                              <Badge variant="stone" className="text-[10px] px-1.5 py-0 uppercase font-semibold">
                                {s.assignments.course_chapters.title}
                              </Badge>
                            )}
                            <span className="text-stone-300">·</span>
                            <span className="text-xs text-stone-500 font-condensed">
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
                          <Badge variant="mint" className="text-xs uppercase font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            {s.marks_obtained}/{maxMarks}
                          </Badge>
                        ) : isNeedsResubmit ? (
                          <Badge variant="rose" className="text-xs uppercase font-semibold">
                            <AlertCircle className="h-3.5 w-3.5 mr-1" />
                            Resubmit
                          </Badge>
                        ) : (
                          <Badge variant="gold" className="text-xs uppercase font-semibold">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Awaiting Grade
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-stone-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-stone-400" />
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
                                  href={resolveFileUrl(s.file_url)}
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

                          {/* Action Banner if Resubmission Requested */}
                          {isNeedsResubmit && (
                            <div className="p-3.5 rounded-2xl bg-rose-50/80 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                                <p className="text-xs font-semibold text-rose-900">
                                  Your instructor requested revisions. Please review the feedback and submit an updated copy.
                                </p>
                              </div>
                              {s.assignment_id && (
                                <Link
                                  href={`/student/assignments/${s.assignment_id}`}
                                  className="text-xs font-bold text-rose-700 bg-white hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-full shadow-sm shrink-0 transition-colors text-center"
                                >
                                  Resubmit Assignment →
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Checked Copy with Ticks & Annotations */}
                          {(s.checked_copy_url || s.checkedCopyUrl) && (
                            <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Award className="h-5 w-5 text-orange-600 shrink-0" />
                                <div>
                                  <p className="text-xs font-extrabold text-orange-950">
                                    Checked copy returned
                                  </p>
                                </div>
                              </div>

                              <a
                                href={resolveFileUrl(s.checked_copy_url || s.checkedCopyUrl)}
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
