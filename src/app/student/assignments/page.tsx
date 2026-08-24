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
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
            <Award className="h-3 w-3 mr-1" />
            {sub?.marks_obtained}/{sub?.assignments?.max_marks || '—'}
          </Badge>
        );
      case 'submitted':
        return (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-semibold">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Submitted
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-50 text-red-600 border-red-200 font-semibold">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">
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
          <div key={i} className="h-28 rounded-2xl bg-white animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Assignments
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {assignments.length} total · {filtered.filter((a) => getStatus(a) === 'pending').length} pending
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedCourse
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCourse === c.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Assignment Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-600">No assignments found</p>
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
                <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-card border border-slate-100/80 hover:shadow-card-hover hover:border-emerald-200/60 transition-all duration-300">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {a.courses?.code}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400 font-medium">
                          Max {a.max_marks} marks
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors truncate text-base">
                        {a.title}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Calendar className="h-3 w-3" />
                          Due{' '}
                          {new Date(a.due_date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {status === 'pending' && (
                          <span className="text-xs font-medium text-amber-600">
                            {getTimeUntil(a.due_date)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {getStatusBadge(status, sub)}
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
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
