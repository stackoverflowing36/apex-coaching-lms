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
    if (ext === 'pdf') return <FileType2 className="h-4 w-4 text-[#ffb956]" />;
    if (['jpg', 'jpeg', 'png'].includes(ext || ''))
      return <FileImage className="h-4 w-4 text-[#a8f1e0]" />;
    return <File className="h-4 w-4 text-[#b7b7b5]" />;
  }

  /** Resolves a stored course-material path to a browser-accessible URL. */
  function resolveFileUrl(url?: string | null) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gnoaegjqazibdchorpuo.supabase.co';
    return `${baseUrl}/storage/v1/object/public/course-materials/${url}`;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-[20px] bg-[#141414] border border-[#262626] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="font-display uppercase text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Grades, Feedback &amp; Attendance
        </h1>
        <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#b7b7b5] mt-1">
          {submissions.length} submission{submissions.length !== 1 ? 's' : ''} ·{' '}
          {gradedSubmissions.length} graded · Attendance Rate: {attendance.percentage}%
        </p>
      </div>

      {/* ========== OVERVIEW CARDS (Architectural 1px Studio Grid) ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-[#8e8e8e] font-bold uppercase font-condensed tracking-wider">Average Score</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-white">
            {gradedSubmissions.length > 0 ? `${averageScore}%` : '—'}
          </p>
        </div>

        <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[20px] bg-[#1c1c1c] text-[#ffb956] border border-[#383838] flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-[#8e8e8e] font-bold uppercase font-condensed tracking-wider">Highest Score</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-white">
            {gradedSubmissions.length > 0 ? highestScore : '—'}
          </p>
        </div>

        <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[20px] bg-[#1c1c1c] text-[#9ee4a0] border border-[#383838] flex items-center justify-center">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-[#8e8e8e] font-bold uppercase font-condensed tracking-wider">Attendance</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-white">
            {attendance.percentage}%
          </p>
        </div>

        <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[20px] bg-[#1c1c1c] text-[#9dc1ff] border border-[#383838] flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-[10px] text-[#8e8e8e] font-bold uppercase font-condensed tracking-wider">Pending Review</span>
          </div>
          <p className="font-display uppercase text-3xl font-bold text-white">
            {pendingSubmissions.length}
          </p>
        </div>
      </div>

      {/* ========== TABS: ASSIGNMENT GRADES VS ATTENDANCE REGISTER ========== */}
      <Tabs defaultValue="grades" className="space-y-6">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="bg-[#181818] p-1 rounded-[20px] border border-[#2e2e2e] inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="grades"
              className="rounded-[20px] text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2 text-[#b7b7b5] data-[state=active]:bg-[#a8f1e0] data-[state=active]:text-[#0c0c0c] data-[state=active]:shadow-sm transition-all"
            >
              <Award className="h-3.5 w-3.5 mr-1.5" />
              Evaluations ({submissions.length})
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="rounded-[20px] text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2 text-[#b7b7b5] data-[state=active]:bg-[#a8f1e0] data-[state=active]:text-[#0c0c0c] data-[state=active]:shadow-sm transition-all"
            >
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
              Attendance Record ({attendance.records.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: GRADES & FEEDBACK */}
        <TabsContent value="grades" className="space-y-4">
          {submissions.length === 0 ? (
            <div className="bg-[#141414] rounded-[20px] border border-[#262626] p-16 text-center">
              <FileText className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
              <p className="font-bold text-white">No submissions yet</p>
              <p className="text-xs text-[#8e8e8e] mt-1">
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
                    className="studio-card bg-[#141414] border border-[#262626] rounded-[20px] overflow-hidden transition-all duration-200"
                  >
                    {/* Row Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="w-full px-6 py-5 flex items-center justify-between gap-4 hover:bg-[#181818] transition-colors text-left"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Score Circle */}
                        <div
                          className={`shrink-0 w-12 h-12 rounded-[16px] flex items-center justify-center border border-[#383838] ${
                            isGraded
                              ? 'bg-[#1c1c1c] text-white'
                              : isNeedsResubmit
                              ? 'bg-[#e2bcc2] text-[#0c0c0c]'
                              : 'bg-[#181818] text-[#8e8e8e]'
                          }`}
                        >
                          {isGraded ? (
                            <span className="font-display text-xl font-bold uppercase text-white">
                              {s.marks_obtained}
                            </span>
                          ) : isNeedsResubmit ? (
                            <AlertCircle className="h-5 w-5 text-[#0c0c0c]" />
                          ) : (
                            <Clock className="h-5 w-5 text-[#8e8e8e]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-white truncate text-sm sm:text-base">
                            {s.assignments?.title || 'Assignment'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-bold text-[#a8f1e0] uppercase tracking-wider bg-[#1c1c1c] px-2 py-0.5 rounded-[20px] border border-[#333] font-condensed">
                              {s.assignments?.courses?.code}
                            </span>
                            {s.assignments?.course_chapters?.title && (
                              <Badge variant="rust" className="text-[10px] px-1.5 py-0 uppercase font-semibold">
                                {s.assignments.course_chapters.title}
                              </Badge>
                            )}
                            <span className="text-[#383838]">·</span>
                            <span className="text-xs text-[#8e8e8e] font-condensed">
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
                          <ChevronUp className="h-4 w-4 text-[#8e8e8e]" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-[#8e8e8e]" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-0 border-t border-[#262626] bg-[#0c0c0c]/40">
                        <div className="space-y-4 pt-4">
                          {/* Submitted File */}
                          {s.file_name && (
                            <div className="flex items-center justify-between gap-3 p-3.5 rounded-[20px] bg-[#181818] border border-[#383838]">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {getFileIcon(s.file_name)}
                                <p className="text-xs font-semibold text-white truncate">
                                  {s.file_name}
                                </p>
                              </div>
                              {s.file_url && (
                                <a
                                  href={resolveFileUrl(s.file_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-bold text-[#a8f1e0] hover:underline flex-shrink-0"
                                >
                                  View Submitted Paper
                                </a>
                              )}
                            </div>
                          )}

                          {/* Score Bar */}
                          {isGraded && (
                            <div>
                              <div className="flex items-center justify-between text-xs text-[#b7b7b5] mb-1.5">
                                <span>Score Obtained</span>
                                <span className="font-bold text-white">
                                  {s.marks_obtained} / {maxMarks} (
                                  {Math.round((s.marks_obtained / maxMarks) * 100)}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 bg-[#222222] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#a8f1e0] transition-all duration-500"
                                  style={{
                                    width: `${Math.round((s.marks_obtained / maxMarks) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Teacher Feedback Box */}
                          {s.feedback ? (
                            <div className="p-4 rounded-[20px] bg-[#181818] border border-[#383838]">
                              <div className="flex items-center gap-2 mb-1.5">
                                <MessageSquare className="h-4 w-4 text-[#a8f1e0]" />
                                <p className="text-xs font-bold text-[#a8f1e0] uppercase tracking-wider">
                                  Faculty Evaluation &amp; Feedback
                                </p>
                              </div>
                              <p className="text-xs sm:text-sm text-white whitespace-pre-line leading-relaxed">
                                {s.feedback}
                              </p>
                            </div>
                          ) : isGraded ? (
                            <p className="text-xs text-[#8e8e8e] italic">No remarks recorded by teacher.</p>
                          ) : (
                            <p className="text-xs text-[#8e8e8e] italic">
                              Submission uploaded. Your teacher is currently evaluating your solution sheet.
                            </p>
                          )}

                          {/* Action Banner if Resubmission Requested */}
                          {isNeedsResubmit && (
                            <div className="p-3.5 rounded-[20px] bg-[#2a1717] border border-[#522] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-[#e2bcc2] shrink-0" />
                                <p className="text-xs font-semibold text-[#e2bcc2]">
                                  Your instructor requested revisions. Please review the feedback and submit an updated copy.
                                </p>
                              </div>
                              {s.assignment_id && (
                                <Link
                                  href={`/student/assignments/${s.assignment_id}`}
                                  className="text-xs font-bold text-[#0c0c0c] bg-[#e2bcc2] hover:bg-[#d6aab1] px-3.5 py-1.5 rounded-[20px] shadow-sm shrink-0 transition-colors text-center"
                                >
                                  Resubmit Assignment →
                                </Link>
                              )}
                            </div>
                          )}

                          {/* Checked Copy with Ticks & Annotations */}
                          {(s.checked_copy_url || s.checkedCopyUrl) && (
                            <div className="p-4 rounded-[20px] bg-[#1c1c1c] border border-[#383838] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <Award className="h-5 w-5 text-[#ffb956] shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-white">
                                    Checked copy returned by faculty
                                  </p>
                                </div>
                              </div>

                              <a
                                href={resolveFileUrl(s.checked_copy_url || s.checkedCopyUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[20px] bg-[#ffb956] hover:bg-[#e5a64d] text-[#0c0c0c] font-bold text-xs shadow-sm transition-all shrink-0"
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
            <div className="bg-[#141414] rounded-[20px] border border-[#262626] p-16 text-center">
              <CalendarCheck className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
              <p className="font-bold text-white">No Attendance Records Yet</p>
              <p className="text-xs text-[#8e8e8e] mt-1">
                Your daily batch attendance marked by faculty will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-[#141414] rounded-[20px] border border-[#262626] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <h3 className="font-heading font-extrabold text-base text-white">
                  Recorded Sessions ({attendance.records.length})
                </h3>
                <span className="text-xs font-bold text-[#0c0c0c] bg-[#a8f1e0] px-3 py-1 rounded-[20px]">
                  Overall: {attendance.percentage}% Present
                </span>
              </div>

              <div className="divide-y divide-[#262626]">
                {attendance.records.map((rec) => (
                  <div
                    key={rec.id}
                    className="py-3.5 flex items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-white">
                        {rec.courses?.code} — {rec.courses?.title}
                      </div>
                      <div className="text-[#8e8e8e] text-[11px]">
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
                      variant={
                        rec.status === 'present'
                          ? 'mint'
                          : rec.status === 'absent'
                          ? 'rose'
                          : rec.status === 'late'
                          ? 'gold'
                          : 'lavender'
                      }
                      className="text-xs px-3 py-1 font-bold capitalize"
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
