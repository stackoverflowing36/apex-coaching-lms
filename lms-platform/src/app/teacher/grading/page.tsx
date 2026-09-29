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
            <div className="h-8 w-8 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center">
              <CheckSquare className="h-4 w-4" />
            </div>
            <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-white tracking-tight">
              Evaluation &amp; Grading Station
            </h1>
          </div>
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#b7b7b5]">
            Review student assignment uploads in real-time, grade solutions in split-screen, and return tailored feedback.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards (Architectural 1px Studio Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px] flex items-center gap-4">
          <div className="w-11 h-11 rounded-[20px] bg-[#1c1c1c] text-[#ffb956] border border-[#383838] flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold uppercase text-3xl text-white">
              {loading ? '—' : pendingCount}
            </div>
            <div className="text-[10px] font-bold text-[#ffb956] uppercase tracking-wider font-condensed">
              Pending Evaluation
            </div>
          </div>
        </div>

        <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px] flex items-center gap-4">
          <div className="w-11 h-11 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold uppercase text-3xl text-white">
              {loading ? '—' : gradedCount}
            </div>
            <div className="text-[10px] font-bold text-[#a8f1e0] uppercase tracking-wider font-condensed">
              Graded &amp; Returned
            </div>
          </div>
        </div>

        <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px] flex items-center gap-4">
          <div className="w-11 h-11 rounded-[20px] bg-[#1c1c1c] text-[#9dc1ff] border border-[#383838] flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display font-bold uppercase text-3xl text-white">
              {loading ? '—' : totalCount}
            </div>
            <div className="text-[10px] font-bold text-[#9dc1ff] uppercase tracking-wider font-condensed">
              Total Submissions
            </div>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="studio-card p-4 sm:p-5 bg-[#141414] border border-[#262626] rounded-[20px] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e8e8e]" />
            <Input
              placeholder="Search by student name, assignment, or batch code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-[20px] text-xs bg-[#181818] border-[#383838] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
            />
          </div>

          {/* Status Tabs Filter */}
          <div className="sm:col-span-3 flex items-center bg-[#181818] border border-[#383838] rounded-[20px] p-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`flex-1 py-1.5 rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#a8f1e0] text-[#0c0c0c] shadow-sm'
                  : 'text-[#b7b7b5] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`flex-1 py-1.5 rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === 'pending'
                  ? 'bg-[#ffb956] text-[#0c0c0c] shadow-sm'
                  : 'text-[#b7b7b5] hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('graded')}
              className={`flex-1 py-1.5 rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === 'graded'
                  ? 'bg-[#9ee4a0] text-[#0c0c0c] shadow-sm'
                  : 'text-[#b7b7b5] hover:text-white'
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
              className="w-full h-10 rounded-[20px] border border-[#383838] bg-[#181818] px-3.5 text-xs font-semibold uppercase tracking-wider text-white focus:border-[#a8f1e0] focus:outline-none"
            >
              <option value="all" className="bg-[#181818] text-white">All Batches</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#181818] text-white">
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Submissions Table */}
      <div className="studio-card overflow-hidden bg-[#141414] border border-[#262626] rounded-[20px]">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-[#8e8e8e] gap-3">
            <div className="w-10 h-10 border-2 border-[#262626] border-t-[#a8f1e0] rounded-full animate-spin" />
            <p className="text-xs uppercase tracking-wider font-semibold font-condensed">Loading submissions queue...</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="h-10 w-10 text-[#8e8e8e] mx-auto" />
            <h3 className="font-display font-bold uppercase text-base text-white tracking-tight">
              No Submissions Matching Filters
            </h3>
            <p className="text-xs text-[#8e8e8e] max-w-sm mx-auto">
              Try adjusting your batch filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#181818] text-[10px] font-bold uppercase tracking-wider text-[#b7b7b5] font-condensed">
                  <th className="py-3.5 px-6">Student</th>
                  <th className="py-3.5 px-6">Assignment / Batch</th>
                  <th className="py-3.5 px-6">Submitted On</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Grade / Score</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-xs">
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
                      className="hover:bg-[#181818]/60 transition-colors group"
                    >
                      {/* Student Column */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 border border-[#383838]">
                            <AvatarImage src={sub.users?.avatar_url} />
                            <AvatarFallback className="bg-[#1c1c1c] text-[#a8f1e0] font-bold text-[10px]">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-white">{studentName}</div>
                            <div className="text-[10px] text-[#8e8e8e] truncate max-w-[150px] font-condensed">
                              {sub.users?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assignment Column */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-white">
                            {sub.assignments?.title || 'Practice Sheet'}
                          </div>
                          <Badge variant="stone" className="text-[10px] px-1.5 py-0 uppercase font-semibold">
                            {sub.assignments?.courses?.code || 'BATCH'}
                          </Badge>
                        </div>
                      </td>

                      {/* Submitted On Column */}
                      <td className="py-4 px-6 text-[#8e8e8e] font-condensed whitespace-nowrap">
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
                          variant={isGraded ? 'mint' : 'gold'}
                          className="text-[10px] px-2.5 py-0.5 uppercase font-semibold"
                        >
                          {isGraded ? 'Graded' : 'Needs Review'}
                        </Badge>
                      </td>

                      {/* Score Column */}
                      <td className="py-4 px-6">
                        {isGraded && sub.marks_obtained !== null ? (
                          <span className="font-bold text-xs text-white bg-[#1c1c1c] px-2.5 py-1 rounded-[20px] border border-[#383838] font-condensed">
                            {sub.marks_obtained} / {sub.assignments?.max_marks || 100}
                          </span>
                        ) : (
                          <span className="text-[#8e8e8e] font-medium">—</span>
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
                              className="p-1.5 rounded-[20px] bg-[#1c1c1c] text-[#ffb956] hover:bg-[#252525] border border-[#383838] transition-colors"
                              title="View Returned Checked Copy"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <Link href={`/teacher/grading/${sub.id}`}>
                            <button
                              className={`text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-[20px] transition-all ${
                                isGraded
                                  ? 'border border-[#383838] bg-[#181818] text-white hover:border-[#a8f1e0] hover:text-[#a8f1e0]'
                                  : 'bg-[#ffb956] text-[#0c0c0c] hover:bg-[#e5a64d]'
                              }`}
                            >
                              {isGraded ? 'Review & Edit' : 'Grade Paper'}
                            </button>
                          </Link>

                          {/* Delete Submission Action */}
                          <button
                            type="button"
                            onClick={() => setSubmissionToDelete(sub)}
                            className="p-1.5 rounded-[20px] text-[#8e8e8e] hover:text-[#ff6b6b] hover:bg-[#2a1717] border border-transparent hover:border-[#ff6b6b]/40 transition-colors"
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
        <DialogContent className="rounded-[20px] p-6 max-w-sm bg-[#141414] border border-[#383838] text-white">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading font-extrabold text-lg text-[#ff6b6b] flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Submission?
            </DialogTitle>
            <p className="text-xs text-[#b7b7b5] leading-relaxed">
              Are you sure you want to permanently delete the submission by{' '}
              <strong className="text-white">
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
              className="rounded-[20px] text-xs font-bold border border-[#383838] bg-[#181818] text-white hover:bg-[#222]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="rounded-[20px] text-xs font-bold bg-[#ff6b6b] hover:bg-[#e05555] text-white shadow-md shadow-red-600/20"
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
