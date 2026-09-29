'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileCheck,
  CheckCircle2,
  Users,
  Award,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Eye,
  GraduationCap,
  Trash2,
  Loader2,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getAssignmentById,
  fetchAssignmentSubmissions,
  deleteSubmission,
  updateAssignment,
  getCourseChapters,
} from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export const dynamic = 'force-dynamic';

export default function TeacherAssignmentDetailsPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const router = useRouter();
  const supabase = createClient();

  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    due_date: '',
    max_marks: 0,
    chapter_id: '',
    attachment_url: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);

  const handleEditOpen = () => {
    const descriptionText = assignment?.description || '';
    const match = descriptionText.match(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/);
    setEditForm({
      title: assignment?.title || '',
      description: match
        ? descriptionText.replace(match[0], '').trim()
        : descriptionText.trim(),
      due_date: assignment?.due_date ? assignment.due_date.slice(0, 10) : '',
      max_marks: assignment?.max_marks || 0,
      chapter_id: assignment?.chapter_id || '',
      attachment_url: match?.[1] || '',
    });
    getCourseChapters(supabase, assignment?.course_id || '')
      .then((data) => setChapters(data ?? []))
      .catch(console.error);
    setIsEditing(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment) return;

    try {
      setIsSaving(true);
      const description = editForm.description.trim();
      const attachmentMarker = editForm.attachment_url
        ? `[ATTACHMENT:${editForm.attachment_url.trim()}]`
        : '';
      const updatedDescription = attachmentMarker
        ? `${description}${description ? '\n' : ''}${attachmentMarker}`
        : description;

      const updatedAssignment = await updateAssignment(supabase, assignment.id, {
        title: editForm.title.trim(),
        description: updatedDescription,
        due_date: editForm.due_date,
        max_marks: Number(editForm.max_marks),
        chapter_id: editForm.chapter_id || null,
      });

      setAssignment(updatedAssignment);
      setIsEditing(false);
      toast.success('Assignment updated successfully');
    } catch (err: any) {
      toast.error('Failed to update assignment', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

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
      const assignmentData = await getAssignmentById(supabase, assignmentId);
      const subs = await fetchAssignmentSubmissions(supabase, assignmentId);
      setAssignment(assignmentData);
      setSubmissions(subs);
    } catch (err: any) {
      toast.error('Failed to load assignment details', { description: err.message });
      router.push('/teacher/dashboard');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, router, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-[#8e8e8e] gap-3">
        <div className="w-10 h-10 border-2 border-[#262626] border-t-[#a8f1e0] rounded-full animate-spin" />
        <p className="text-xs font-semibold uppercase tracking-wider font-condensed">Loading assignment details...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-[#8e8e8e] gap-3">
        <AlertCircle className="h-10 w-10 text-[#ff6b6b]" />
        <p className="text-sm font-semibold uppercase tracking-wider text-white">Assignment not found</p>
      </div>
    );
  }

  // Parse Attachment
  let descriptionText = assignment.description || '';
  let attachmentUrl: string | null = null;
  const match = descriptionText.match(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/);
  if (match) {
    attachmentUrl = match[1];
    descriptionText = descriptionText.replace(match[0], '').trim();
  }

  const handleEditChange = (field: string, value: string | number) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  // Calculate Stats
  const totalSubmissions = submissions.length;
  const pendingSubmissions = submissions.filter(s => s.status !== 'graded').length;
  const gradedSubmissions = submissions.filter(s => s.status === 'graded');
  const averageScore = gradedSubmissions.length > 0 
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.marks_obtained || 0), 0) / gradedSubmissions.length) 
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Back Navigation */}
      <div>
        <Link
          href={`/teacher/courses/${assignment.course_id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#b7b7b5] hover:text-[#a8f1e0] transition-colors font-condensed"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Course
        </Link>
      </div>

      {/* Header Section (Studio Card) */}
      <div className="studio-card p-6 sm:p-8 relative overflow-hidden bg-[#141414] border border-[#262626] rounded-[20px]">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileCheck className="w-64 h-64 text-white rotate-12" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-white tracking-tight">
                {assignment.title}
              </h1>
              <Badge variant="mint" className="font-bold uppercase tracking-wider text-[10px]">
                {assignment.courses?.title || 'Unknown Batch'}
              </Badge>
              {assignment.course_chapters?.title && (
                <Badge variant="rust" className="font-bold uppercase tracking-wider text-[10px]">
                  Chapter: {assignment.course_chapters.title}
                </Badge>
              )}
            </div>
            <button
              onClick={handleEditOpen}
              className="rounded-[20px] border border-[#383838] bg-[#181818] text-white hover:border-[#a8f1e0] hover:text-[#a8f1e0] text-xs font-bold uppercase tracking-wider py-1.5 px-4 flex items-center gap-1.5 transition-all"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs uppercase tracking-wider font-condensed font-semibold">
            <span className="flex items-center gap-2 text-[#ffb956]">
              <Calendar className="h-4 w-4" />
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-2 text-[#a8f1e0]">
              <Award className="h-4 w-4" />
              {assignment.max_marks} Max Marks
            </span>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={(open) => !open && setIsEditing(false)}>
        <DialogContent className="rounded-[20px] p-6 max-w-2xl max-h-[90vh] overflow-y-auto bg-[#141414] border border-[#383838] text-white">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-[#a8f1e0]" />
              Edit Assignment
            </DialogTitle>
            <p className="text-xs text-[#b7b7b5]">
              Update assignment details, description, and settings
            </p>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-6 mt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="text-xs font-bold text-[#e2bcc2]">
                Title <span className="text-[#ff6b6b]">*</span>
              </Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => handleEditChange('title', e.target.value)}
                placeholder="Enter assignment title"
                required
                className="rounded-[20px] text-sm font-medium bg-[#181818] border-[#383838] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-xs font-bold text-[#e2bcc2]">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={editForm.description}
                onChange={(e) => handleEditChange('description', e.target.value)}
                placeholder="Enter assignment description"
                rows={4}
                className="resize-none rounded-[20px] text-sm font-medium bg-[#181818] border-[#383838] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
              />
            </div>

            {/* Row with Due Date and Max Marks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-due-date" className="text-xs font-bold text-[#e2bcc2]">
                  Due Date
                </Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={editForm.due_date}
                  onChange={(e) => handleEditChange('due_date', e.target.value)}
                  className="rounded-[20px] text-sm font-medium bg-[#181818] border-[#383838] text-white focus:border-[#a8f1e0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-marks" className="text-xs font-bold text-[#e2bcc2]">
                  Max Marks
                </Label>
                <Input
                  id="edit-max-marks"
                  type="number"
                  min="1"
                  value={editForm.max_marks}
                  onChange={(e) => handleEditChange('max_marks', Number(e.target.value))}
                  placeholder="e.g., 100"
                  className="rounded-[20px] text-sm font-medium bg-[#181818] border-[#383838] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
                />
              </div>
            </div>

            {/* Chapter */}
            <div className="space-y-2">
              <Label htmlFor="edit-chapter" className="text-xs font-bold text-[#e2bcc2]">
                Chapter (Optional)
              </Label>
              <select
                id="edit-chapter"
                value={editForm.chapter_id}
                onChange={(e) => handleEditChange('chapter_id', e.target.value)}
                className="flex h-10 w-full rounded-[20px] border border-[#383838] bg-[#181818] px-4 py-2 text-sm text-white focus:border-[#a8f1e0] focus:outline-none"
              >
                <option value="" className="bg-[#181818] text-white">No Chapter</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id} className="bg-[#181818] text-white">
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Attachment URL */}
            <div className="space-y-2">
              <Label htmlFor="edit-attachment" className="text-xs font-bold text-[#e2bcc2]">
                Attachment URL
              </Label>
              <Input
                id="edit-attachment"
                type="url"
                value={editForm.attachment_url}
                onChange={(e) => handleEditChange('attachment_url', e.target.value)}
                placeholder="https://example.com/document.pdf"
                className="rounded-[20px] text-sm font-medium bg-[#181818] border-[#383838] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
              />
              <p className="text-xs text-[#8e8e8e]">
                URL will be added to description as: [ATTACHMENT:url]
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="rounded-[20px] text-xs font-bold border border-[#383838] bg-[#181818] text-white hover:bg-[#222]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || !editForm.title.trim()}
                className="rounded-[20px] text-xs font-bold bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#0c0c0c] shadow-sm"
              >
                {isSaving ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Attachment */}
        <div className="lg:col-span-2 space-y-6">
          <div className="studio-card p-6 space-y-4 bg-[#141414] border border-[#262626] rounded-[20px]">
            <h2 className="font-display font-bold uppercase text-base text-white border-b border-[#262626] pb-3 tracking-tight">
              Instructions
            </h2>
            <div className="text-white whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {descriptionText || 'No additional instructions provided.'}
            </div>
            
            {attachmentUrl && (
              <div className="pt-4 border-t border-[#262626] space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#a8f1e0] flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" /> Attached Resource
                  </h3>
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold uppercase tracking-wider text-[#a8f1e0] hover:underline flex items-center gap-1 font-condensed"
                  >
                    Open in new tab <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
                
                <div className="rounded-[16px] overflow-hidden border border-[#383838] bg-[#181818] h-[400px]">
                  {attachmentUrl.toLowerCase().match(/\.(jpeg|jpg|gif|png|webp)$/) ? (
                    <img 
                      src={attachmentUrl} 
                      alt="Attachment" 
                      className="w-full h-full object-contain" 
                    />
                  ) : (
                    <iframe
                      src={attachmentUrl.includes('google.com') ? attachmentUrl : `https://docs.google.com/viewer?url=${encodeURIComponent(attachmentUrl)}&embedded=true`}
                      className="w-full h-full border-0"
                      title="Document Viewer"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Stats & Submissions */}
        <div className="space-y-6">
          {/* Stats Cards (Architectural 1px Studio Grid) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
              <div className="w-9 h-9 rounded-[16px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center mb-3">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold text-[#8e8e8e] uppercase tracking-wider mb-1 font-condensed">Total</p>
              <p className="font-display font-bold uppercase text-3xl text-white">{totalSubmissions}</p>
            </div>
            <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
              <div className="w-9 h-9 rounded-[16px] bg-[#1c1c1c] text-[#ffb956] border border-[#383838] flex items-center justify-center mb-3">
                <Clock className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold text-[#ffb956] uppercase tracking-wider mb-1 font-condensed">Pending</p>
              <p className="font-display font-bold uppercase text-3xl text-white">{pendingSubmissions}</p>
            </div>
            <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
              <div className="w-9 h-9 rounded-[16px] bg-[#1c1c1c] text-[#9ee4a0] border border-[#383838] flex items-center justify-center mb-3">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold text-[#9ee4a0] uppercase tracking-wider mb-1 font-condensed">Graded</p>
              <p className="font-display font-bold uppercase text-3xl text-white">{gradedSubmissions.length}</p>
            </div>
            <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px]">
              <div className="w-9 h-9 rounded-[16px] bg-[#1c1c1c] text-[#9dc1ff] border border-[#383838] flex items-center justify-center mb-3">
                <Award className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold text-[#9dc1ff] uppercase tracking-wider mb-1 font-condensed">Avg Score</p>
              <p className="font-display font-bold uppercase text-3xl text-white">{averageScore}</p>
            </div>
          </div>

          {/* Submissions List */}
          <div className="studio-card p-6 bg-[#141414] border border-[#262626] rounded-[20px]">
            <h3 className="font-display font-bold uppercase text-base text-white mb-4 flex items-center justify-between tracking-tight">
              Submissions
              <Badge variant="stone" className="font-bold uppercase tracking-wider text-[10px]">
                {submissions.length}
              </Badge>
            </h3>
            
            {submissions.length === 0 ? (
              <div className="text-center py-8 bg-[#181818] rounded-[16px] border border-[#383838] border-dashed">
                <FileCheck className="h-6 w-6 text-[#8e8e8e] mx-auto mb-2" />
                <p className="text-xs uppercase tracking-wider font-semibold text-[#8e8e8e] font-condensed">No submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <Link 
                    key={sub.id} 
                    href={`/teacher/grading/${sub.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-[16px] bg-[#181818] hover:border-[#a8f1e0]/60 border border-[#383838] transition-all">
                      <Avatar className="h-9 w-9 border border-[#383838] shrink-0">
                        <AvatarImage src={sub.users?.avatar_url || ''} alt={sub.users?.full_name || 'Student'} />
                        <AvatarFallback className="bg-[#1c1c1c] text-[#a8f1e0] font-bold text-xs">
                          {sub.users?.full_name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#a8f1e0] transition-colors">
                          {sub.users?.full_name || 'Unknown Student'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sub.status === 'graded' ? (
                            <Badge variant="mint" className="text-[10px] px-1.5 py-0 uppercase font-semibold">
                              Graded ({sub.marks_obtained})
                            </Badge>
                          ) : (
                            <Badge variant="gold" className="text-[10px] px-1.5 py-0 uppercase font-semibold">
                              Pending Evaluation
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSubmissionToDelete(sub);
                          }}
                          className="p-1.5 rounded-[20px] text-[#8e8e8e] hover:text-[#ff6b6b] hover:bg-[#2a1717] border border-transparent hover:border-[#ff6b6b]/40 transition-colors"
                          title="Delete submission"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="text-[#8e8e8e] group-hover:text-white transition-colors">
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
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
              </strong>?
              All marks and evaluations will be deleted. This action cannot be undone.
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
