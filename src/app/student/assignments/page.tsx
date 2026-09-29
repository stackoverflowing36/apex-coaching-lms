'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Search,
  Award,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getAssignments, getMySubmissions, getCourses } from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default function AssignmentsPage() {
  const { user } = useAuthUser();
  const supabase = React.useMemo(() => createClient(), []);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [assignmentData, submissionData, courseData] = await Promise.all([
          getAssignments(supabase),
          getMySubmissions(supabase),
          getCourses(supabase),
        ]);
        setAssignments(assignmentData);
        setSubmissions(submissionData);
        setCourses(courseData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  const submittedMap = new Map(
    submissions.map((s: any) => [s.assignment_id, s])
  );

  const filtered = assignments.filter((a) => {
    const matchesCourse = selectedCourse ? a.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? a.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  function getStatus(assignment: any) {
    const sub = submittedMap.get(assignment.id);
    if (sub) {
      return sub.status === 'graded' ? 'graded' : 'submitted';
    }
    const isPastDue = new Date(assignment.due_date) < new Date();
    return isPastDue ? 'overdue' : 'pending';
  }

  function getStatusBadge(status: string, sub?: any) {
    switch (status) {
      case 'graded':
        return (
          <span className="bg-[#9ee4a0] text-[#0c0c0c] text-xs uppercase font-bold px-2.5 py-1 rounded-[20px] flex items-center shadow-xs">
            <Award className="h-3 w-3 mr-1" />
            {sub?.marks_obtained}/{sub?.assignments?.max_marks || '—'}
          </span>
        );
      case 'submitted':
        return (
          <span className="bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] text-xs uppercase font-bold px-2.5 py-1 rounded-[20px] flex items-center shadow-xs">
            <CheckCircle2 className="h-3 w-3 mr-1 text-[#a8f1e0]" />
            Submitted
          </span>
        );
      case 'overdue':
        return (
          <span className="bg-[#e2bcc2] text-[#0c0c0c] text-xs uppercase font-bold px-2.5 py-1 rounded-[20px] flex items-center shadow-xs">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="bg-[#ffb956] text-[#0c0c0c] text-xs uppercase font-bold px-2.5 py-1 rounded-[20px] flex items-center shadow-xs">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
    }
  }

  function getTimeUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) return 'Past due';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Due soon';
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-[20px] bg-[#141414] animate-pulse border border-[#2a2a2a]" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="font-display uppercase text-3xl sm:text-4xl font-bold text-white tracking-tight">
          Assignments
        </h1>
        <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#b7b7b5] mt-1">
          {assignments.length} total · {filtered.filter((a) => getStatus(a) === 'pending').length} pending evaluation
        </p>
      </div>

      {/* Filters (Capsule & Pills) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e8e8e]" />
          <input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 rounded-[20px] border border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0] focus:outline-none h-11 text-xs"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-[20px] text-xs font-semibold uppercase tracking-wider transition-all ${
              !selectedCourse
                ? 'bg-[#a8f1e0] text-[#0c0c0c] font-bold shadow-md'
                : 'bg-[#181818] text-[#b7b7b5] border border-[#2e2e2e] hover:border-[#a8f1e0] hover:text-white'
            }`}
          >
            All Batches
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
              className={`px-4 py-2 rounded-[20px] text-xs font-semibold uppercase tracking-wider transition-all ${
                selectedCourse === c.id
                  ? 'bg-[#a8f1e0] text-[#0c0c0c] font-bold shadow-md'
                  : 'bg-[#181818] text-[#b7b7b5] border border-[#2e2e2e] hover:border-[#a8f1e0] hover:text-white'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Cards (Studio Cards) */}
      {filtered.length === 0 ? (
        <div className="bg-[#141414] border border-[#2a2a2a] rounded-[20px] p-16 text-center shadow-xl">
          <FileText className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
          <p className="text-xs uppercase tracking-wider font-semibold text-white font-condensed">No assignments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const status = getStatus(a);
            const sub = submittedMap.get(a.id);
            return (
              <Link
                key={a.id}
                href={`/student/assignments/${a.id}`}
                className="group block"
              >
                <div className="bg-[#141414] border border-[#2a2a2a] hover:border-[#383838] rounded-[20px] p-5 sm:p-6 transition-all duration-300 shadow-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-[#a8f1e0] uppercase tracking-wider bg-[#1c1c1c] border border-[#333] px-2.5 py-0.5 rounded-[20px] font-condensed">
                          {a.courses?.code}
                        </span>
                        {a.course_chapters?.title && (
                          <span className="text-[10px] px-2 py-0.5 uppercase font-bold bg-[#242424] text-white border border-[#383838] rounded-[20px]">
                            Chapter: {a.course_chapters.title}
                          </span>
                        )}
                        <span className="text-[#383838]">·</span>
                        <span className="text-[11px] text-[#8e8e8e] font-condensed uppercase tracking-wider font-semibold">
                          Max {a.max_marks} marks
                        </span>
                      </div>
                      <p className="font-semibold text-sm sm:text-base text-white group-hover:text-[#a8f1e0] transition-colors truncate">
                        {a.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs text-[#8e8e8e] font-condensed">
                          <Calendar className="h-3.5 w-3.5 text-[#a8f1e0]" />
                          Due{' '}
                          {new Date(a.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {status === 'pending' && (
                          <span className="bg-[#ffb956] text-[#0c0c0c] text-[10px] px-2.5 py-0.5 uppercase font-bold rounded-[20px]">
                            {getTimeUntil(a.due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(status, sub)}
                      <ArrowRight className="h-4 w-4 text-[#8e8e8e] group-hover:text-[#a8f1e0] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
