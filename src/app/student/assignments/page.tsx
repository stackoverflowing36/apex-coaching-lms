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
          <Badge variant="mint" className="text-xs uppercase font-semibold">
            <Award className="h-3 w-3 mr-1" />
            {sub?.marks_obtained}/{sub?.assignments?.max_marks || '—'}
          </Badge>
        );
      case 'submitted':
        return (
          <Badge variant="stone" className="text-xs uppercase font-semibold">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'overdue':
        return (
          <Badge variant="rust" className="text-xs uppercase font-semibold">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge variant="gold" className="text-xs uppercase font-semibold">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
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
          <div key={i} className="h-28 rounded-studio bg-stone-100 animate-pulse border border-stone-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="font-display uppercase text-3xl sm:text-4xl font-bold text-[#111111] tracking-tight">
          Assignments
        </h1>
        <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-stone-500 mt-1">
          {assignments.length} total · {filtered.filter((a) => getStatus(a) === 'pending').length} pending evaluation
        </p>
      </div>

      {/* Filters (CIID Capsule & Pills) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-pill border-stone-200 bg-white focus:border-stone-900 focus:ring-0 text-xs"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-pill text-xs font-semibold uppercase tracking-wider transition-all ${
              !selectedCourse
                ? 'bg-[#111111] text-[#fbfbfa] shadow-sm'
                : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-400'
            }`}
          >
            All Batches
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
              className={`px-4 py-2 rounded-pill text-xs font-semibold uppercase tracking-wider transition-all ${
                selectedCourse === c.id
                  ? 'bg-[#a05120] text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-[#a05120]'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Cards (CIID Studio Cards) */}
      {filtered.length === 0 ? (
        <div className="studio-card p-16 text-center">
          <FileText className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <p className="text-xs uppercase tracking-wider font-semibold text-stone-500 font-condensed">No assignments found</p>
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
                <div className="studio-card p-5 sm:p-6 hover:border-stone-900 transition-all duration-300">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-stone-700 uppercase tracking-wider bg-stone-200/70 px-2 py-0.5 rounded-pill font-condensed">
                          {a.courses?.code}
                        </span>
                        {a.course_chapters?.title && (
                          <Badge variant="stone" className="text-[10px] px-1.5 py-0 uppercase font-semibold">
                            Chapter: {a.course_chapters.title}
                          </Badge>
                        )}
                        <span className="text-stone-300">·</span>
                        <span className="text-[11px] text-stone-500 font-condensed uppercase tracking-wider font-semibold">
                          Max {a.max_marks} marks
                        </span>
                      </div>
                      <p className="font-semibold text-sm sm:text-base text-[#111111] group-hover:text-[#a05120] transition-colors truncate">
                        {a.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs text-stone-500 font-condensed">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          Due{' '}
                          {new Date(a.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {status === 'pending' && (
                          <Badge variant="gold" className="text-[10px] px-2 py-0 uppercase">
                            {getTimeUntil(a.due_date)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(status, sub)}
                      <ArrowRight className="h-4 w-4 text-stone-300 group-hover:text-[#111111] group-hover:translate-x-1 transition-all" />
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
