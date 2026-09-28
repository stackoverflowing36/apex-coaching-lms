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
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getAllSubmissions, getCourses, deleteSubmission } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const dynamic = 'force-dynamic';

export default function TeacherGradingHubPage() {
  const supabase = createClient();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');

  // Deletion State
  const [submissionToDelete, setSubmissionToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!submissionToDelete) return;
    const idToDelete = submissionToDelete.id;
    const previousSubmissions = [...submissions];
    try {
      setIsDeleting(true);

      await deleteSubmission(supabase, idToDelete, submissionToDelete.file_url);

      setSubmissions((prev) => prev.filter((s) => s.id !== idToDelete));
      setSubmissionToDelete(null);
      toast.success('Submission deleted successfully');

      // Background reload to ensure consistency
      loadData().catch(console.error);
    } catch (err: any) {
      setSubmissions(previousSubmissions);
      toast.error('Failed to delete submission', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

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
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-pill bg-[#a05120]/10 text-[#a05120] flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
            <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-[#111111] tracking-tight">
              Evaluation &amp; Grading Station
            </h1>
          </div>
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-stone-500">
            Review student assignment uploads in real-time, grade solutions in split-screen, and return tailored feedback.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards (Architectural 1px Studio Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <div className="studio-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-pill bg-[#a05120]/10 text-[#a05120] flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold uppercase text-3xl text-[#111111]">
              {loading ? '—' : pendingCount}
            </div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-condensed">
              Pending Evaluation
            </div>
          </div>
        </div>

        <div className="studio-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-pill bg-[#a8f1e0]/30 text-stone-800 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold uppercase text-3xl text-[#111111]">
              {loading ? '—' : gradedCount}
            </div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-condensed">
              Graded &amp; Returned
            </div>
          </div>
        </div>

        <div className="studio-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-pill bg-stone-100 text-stone-800 flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold uppercase text-3xl text-[#111111]">
              {loading ? '—' : totalCount}
            </div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-condensed">
              Total Submissions
            </div>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="studio-card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search by student name, assignment, or batch code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-pill text-xs bg-[#fbfbfa] border-stone-200 focus:border-stone-900"
            />
          </div>

          {/* Status Tabs Filter */}
          <div className="sm:col-span-3 flex items-center bg-stone-100 rounded-pill p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex-1 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === 'pending'
                  ? 'bg-[#a05120] text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('graded')}
              className={`flex-1 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === 'graded'
                  ? 'bg-[#111111] text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
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
              className="w-full h-10 rounded-pill border border-stone-200 bg-[#fbfbfa] px-3.5 text-xs font-semibold uppercase tracking-wider text-stone-700 focus:border-stone-900"
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
      <div className="studio-card overflow-hidden">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-stone-400 gap-3">
            <div className="w-10 h-10 border-2 border-stone-200 border-t-[#a05120] rounded-full animate-spin" />
            <p className="text-xs uppercase tracking-wider font-semibold font-condensed">Loading submissions queue...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="h-10 w-10 text-stone-300 mx-auto" />
            <h3 className="font-display font-bold uppercase text-base text-[#111111] tracking-tight">
              No Submissions Matching Filters
            </h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Try adjusting your batch filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/70 text-[10px] font-bold uppercase tracking-wider text-stone-500 font-condensed">
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-6">Assignment / Batch</th>
                  <th className="py-3.5 px-6">Submitted On</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Grade / Score</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs">
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
                      className="hover:bg-stone-50 transition-colors group"
                    >
                      {/* Student Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-stone-300">
                            <AvatarImage src={sub.users?.avatar_url} />
                            <AvatarFallback className="bg-[#111111] text-[#fbfbfa] font-bold text-[10px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-stone-900">{studentName}</div>
                            <div className="text-[10px] text-stone-400 truncate max-w-[150px] font-condensed">
                              {sub.users?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assignment Column */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-stone-800">
                            {sub.assignments?.title || 'Practice Sheet'}
                          </div>
                          <Badge variant="stone" className="text-[10px] px-1.5 py-0 uppercase font-semibold">
                            {sub.assignments?.courses?.code || 'BATCH'}
                          </Badge>
                        </div>
                      </td>

                      {/* Submitted On Column */}
                      <td className="py-4 px-6 text-stone-500 font-condensed whitespace-nowrap">
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
                          variant={isGraded ? 'mint' : 'rust'}
                          className="text-[10px] px-2.5 py-0.5 uppercase font-semibold"
                        >
                          {isGraded ? 'Graded' : 'Needs Review'}
                        </Badge>
                      </td>

                      {/* Score Column */}
                      <td className="py-4 px-6">
                        {isGraded && sub.marks_obtained !== null ? (
                          <span className="font-bold text-xs text-stone-900 bg-stone-100 px-2.5 py-1 rounded-pill border border-stone-200 font-condensed">
                            {sub.marks_obtained} / {sub.assignments?.max_marks || 100}
                          </span>
                        ) : (
                          <span className="text-stone-400 font-medium">—</span>
                        )}
                      </td>

                      {/* Action Button Column */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(sub.checked_copy_url || sub.checkedCopyUrl) && (
                            <a
                              href={sub.checked_copy_url || sub.checkedCopyUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="View Returned Checked Copy"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <Link href={`/teacher/grading/${sub.id}`}>
                            <button
                              className={`btn-pill text-xs font-semibold uppercase tracking-wider py-1.5 px-4 transition-all ${
                                isGraded
                                  ? 'btn-studio-outline border-stone-300 text-stone-700 hover:border-stone-900'
                                  : 'btn-rust'
                              }`}
                            >
                              {isGraded ? 'Review & Edit' : 'Grade Paper'}
                            </button>
                          </Link>

                          {/* Delete Submission Action */}
                          <button
                            type="button"
                            onClick={() => setSubmissionToDelete(sub)}
                            className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors"
                            title="Delete student submission"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Submission Confirmation Modal */}
      <Dialog open={!!submissionToDelete} onOpenChange={(open) => !open && setSubmissionToDelete(null)}>
        <DialogContent className="rounded-3xl p-6 max-w-sm">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Submission?
            </DialogTitle>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete the submission by{' '}
              <strong className="text-slate-800">
                {submissionToDelete?.users?.full_name || 'this student'}
              </strong>{' '}
              for &quot;{submissionToDelete?.assignments?.title || 'Assignment'}&quot;?
              This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSubmissionToDelete(null)}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-full text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete Submission'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
