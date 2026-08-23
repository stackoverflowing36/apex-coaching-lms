'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Users,
  Award,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getAllSubmissions, getCourses } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function TeacherGradingHubPage() {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [subsData, coursesData] = await Promise.all([
        getAllSubmissions(supabase),
        getCourses(supabase),
      ]);

      setSubmissions(subsData);
      setCourses(coursesData);
    } catch (err: any) {
      toast.error('Failed to load submissions', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Subscribe to submission changes in real time
    const channel = supabase
      .channel('grading-hub-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  // Derived metrics
  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => s.status !== 'graded').length;
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;

  // Filtered List
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.assignments?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.assignments?.courses?.code?.toLowerCase().includes(searchQuery.toLowerCase());

    const isGraded = sub.status === 'graded';
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'graded'
        ? isGraded
        : !isGraded;

    const matchesCourse =
      courseFilter === 'all' ? true : sub.assignments?.courses?.id === courseFilter;

    return matchesSearch && matchesStatus && matchesCourse;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <CheckSquare className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Evaluation &amp; Grading Station
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Review student assignment uploads in real-time, grade solutions in split-screen, and return tailored feedback.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl text-slate-900">
              {loading ? '—' : pendingCount}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Evaluation
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl text-slate-900">
              {loading ? '—' : gradedCount}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Graded &amp; Returned
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="font-heading font-extrabold text-2xl text-slate-900">
              {loading ? '—' : totalCount}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Submissions
            </div>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100/80 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student name, assignment, or batch code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-2xl text-xs bg-slate-50 border-slate-200"
            />
          </div>

          {/* Status Tabs Filter */}
          <div className="sm:col-span-3 flex items-center bg-slate-100 rounded-2xl p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'pending'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('graded')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'graded'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Graded
            </button>
          </div>

          {/* Batch Selector Filter */}
          <div className="sm:col-span-3">
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full h-10 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Batches</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
            <p className="text-xs font-medium">Loading submissions queue...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              No Submissions Matching Filters
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Try adjusting your batch filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-6">Assignment / Batch</th>
                  <th className="py-3.5 px-6">Submitted On</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Grade / Score</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSubmissions.map((sub) => {
                  const isGraded = sub.status === 'graded';
                  const studentName = sub.users?.full_name || 'Enrolled Student';
                  const initials = studentName
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-orange-50/30 transition-colors group"
                    >
                      {/* Student Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-orange-200">
                            <AvatarImage src={sub.users?.avatar_url} />
                            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-[10px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900">{studentName}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                              {sub.users?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assignment Column */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800">
                            {sub.assignments?.title || 'Practice Sheet'}
                          </div>
                          <Badge className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0 border-0 font-semibold">
                            {sub.assignments?.courses?.code || 'BATCH'}
                          </Badge>
                        </div>
                      </td>

                      {/* Submitted On Column */}
                      <td className="py-4 px-6 text-slate-500 font-medium whitespace-nowrap">
                        {new Date(sub.submitted_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Status Column */}
                      <td className="py-4 px-6">
                        <Badge
                          className={`text-[10px] px-2.5 py-0.5 font-bold border-0 ${
                            isGraded
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-orange-100 text-orange-700 animate-pulse'
                          }`}
                        >
                          {isGraded ? 'Graded' : 'Needs Review'}
                        </Badge>
                      </td>

                      {/* Score Column */}
                      <td className="py-4 px-6">
                        {isGraded && sub.marks_obtained !== null ? (
                          <span className="font-heading font-extrabold text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {sub.marks_obtained} / {sub.assignments?.max_marks || 100}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Action Button Column */}
                      <td className="py-4 px-6 text-right">
                        <Link href={`/teacher/grading/${sub.id}`}>
                          <Button
                            size="sm"
                            className={`rounded-full font-bold text-xs h-8 px-4 shadow-sm transition-all ${
                              isGraded
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-600/20'
                            }`}
                          >
                            {isGraded ? 'Review & Edit' : 'Grade Paper'}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
