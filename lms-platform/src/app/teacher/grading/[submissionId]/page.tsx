'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckSquare,
  FileText,
  ExternalLink,
  Award,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCw,
  Maximize2,
  ChevronRight,
  Send,
  MessageSquare,
  PenTool,
  Layers,
  Check,
  X,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getSubmissionById,
  gradeSubmission,
  uploadCheckedCopy,
  createNotification,
  deleteSubmission,
} from '@/lib/supabase/queries';
import {
  HandwrittenAnnotationCanvas,
  HandwrittenAnnotationCanvasHandle,
} from '@/components/grading/HandwrittenAnnotationCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const feedbackQuickTags = [
  'Outstanding step-by-step derivations! 🌟',
  'Good conceptual clarity, verify calculation in Q3.',
  'Well-labeled circuit/ray diagrams.',
  'Formulas applied accurately. Excellent work!',
  'Please review standard units and error margins.',
];

export const dynamic = 'force-dynamic';

export default function SplitScreenGradingPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params?.submissionId as string;
  const supabase = createClient();

  const canvasHandleRef = useRef<HandwrittenAnnotationCanvasHandle | null>(null);
  const [submission, setSubmission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeViewerTab, setActiveViewerTab] = useState<'canvas' | 'checked_copy' | 'original'>('canvas');

  // Form State
  const [marks, setMarks] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<string>('');
  const [status, setStatus] = useState<'graded' | 'needs_resubmission'>('graded');
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

  // Deletion & Standalone Save State
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSavingAnnotations, setIsSavingAnnotations] = useState(false);

  const handleDeleteSubmission = async () => {
    if (!submissionId) return;
    try {
      setIsDeleting(true);
      await deleteSubmission(supabase, submissionId, submission?.file_url);
      toast.success('Student submission deleted successfully');
      setIsDeleteDialogOpen(false);
      router.push('/teacher/grading');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Failed to delete submission', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveAnnotationsOnly = async () => {
    if (!canvasHandleRef.current) return;
    try {
      setIsSavingAnnotations(true);
      toast.loading('Saving handwritten annotations & checked copy...', { id: 'save-anno' });

      let blobToUpload: Blob | null = null;
      try {
        blobToUpload = await canvasHandleRef.current.getExportBlob();
      } catch (e) {
        console.warn('Failed to extract blob:', e);
      }

      if (!blobToUpload) {
        toast.dismiss('save-anno');
        toast.error('No annotations found or unable to capture canvas');
        return;
      }

      let checkedUrl: string | null = null;
      try {
        checkedUrl = await uploadCheckedCopy(
          supabase,
          submissionId,
          blobToUpload,
          submission?.student_id,
          submission?.assignment_id
        );
      } catch (upErr: any) {
        console.warn('Storage upload error:', upErr);
        toast.dismiss('save-anno');
        toast.error('Cloud storage upload failed', { description: upErr.message });
        return;
      }

      if (checkedUrl) {
        await gradeSubmission(supabase, submissionId, {
          marks_obtained: marks === '' ? null : Number(marks),
          feedback: feedback.trim(),
          status: status,
          checked_copy_url: checkedUrl,
        });

        toast.dismiss('save-anno');
        toast.success('Checked copy with annotations saved successfully!');
        await loadSubmission();
        setActiveViewerTab('checked_copy');
      }
    } catch (err: any) {
      toast.dismiss('save-anno');
      toast.error('Failed to save annotations', { description: err.message });
    } finally {
      setIsSavingAnnotations(false);
    }
  };

  const loadSubmission = useCallback(async () => {
    if (!submissionId) return;
    try {
      setLoading(true);
      const data = await getSubmissionById(supabase, submissionId);
      setSubmission(data);
      if (data) {
        setMarks(data.marks_obtained ?? '');
        setFeedback(data.feedback ?? '');
        setStatus((data.status as any) === 'needs_resubmission' ? 'needs_resubmission' : 'graded');
      }
    } catch (err: any) {
      toast.error('Failed to load submission', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [submissionId, supabase]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const maxMarks = submission?.assignments?.max_marks || 100;

  // Preset percentage buttons
  const handleApplyPreset = (percent: number) => {
    const calculated = Math.round((percent / 100) * maxMarks);
    setMarks(calculated);
  };

  const handleAppendTag = (tag: string) => {
    setFeedback((prev) => (prev ? `${prev}\n${tag}` : tag));
  };

  // Submit Grade & Return Evaluated Copy
  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (marks === '') {
      toast.error('Please assign marks obtained');
      return;
    }
    if (Number(marks) < 0 || Number(marks) > maxMarks) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    try {
      setIsSubmitting(true);

      let checkedCopyPublicUrl = submission?.checked_copy_url || null;

      let blobToUpload = pendingBlob;
      if (canvasHandleRef.current) {
        try {
          const freshBlob = await canvasHandleRef.current.getExportBlob();
          if (freshBlob) {
            blobToUpload = freshBlob;
          }
        } catch (bErr) {
          console.warn('Failed to extract fresh blob from canvas:', bErr);
        }
      }

      if (blobToUpload) {
        toast.loading('Saving & uploading checked copy with annotations...', { id: 'upload-copy' });
        try {
          checkedCopyPublicUrl = await uploadCheckedCopy(
            supabase,
            submissionId,
            blobToUpload,
            submission?.student_id,
            submission?.assignment_id
          );
          toast.dismiss('upload-copy');
        } catch (storageErr: any) {
          toast.dismiss('upload-copy');
          console.warn('Storage upload error for checked copy:', storageErr);
          toast.warning('Could not store annotated image file in cloud bucket, but saving your marks and feedback...');
        }
      }

      await gradeSubmission(supabase, submissionId, {
        marks_obtained: Number(marks),
        feedback: feedback.trim(),
        status: status,
        checked_copy_url: checkedCopyPublicUrl,
      });

      try {
        await createNotification(supabase, {
          type: 'grading_completed',
          title: 'Assignment Graded',
          message: `The submission by ${submission?.users?.full_name || 'Student'} for "${submission?.assignments?.title || 'an assignment'}" has been graded.`,
          data: {
            submission_id: submissionId,
            student_id: submission?.student_id,
            assignment_id: submission?.assignment_id,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire grading notification:', notifErr);
      }

      toast.success('Grade & evaluation returned to student!', {
        description: `Score: ${marks}/${maxMarks} (${Math.round((Number(marks) / maxMarks) * 100)}%)`,
      });

      if (canvasHandleRef.current) {
        try { canvasHandleRef.current.clearSavedDraft(); } catch {}
      }
      try {
        localStorage.removeItem(`annotation_strokes_v2_${submissionId}`);
      } catch {}

      await loadSubmission();
      if (checkedCopyPublicUrl) {
        setActiveViewerTab('checked_copy');
      }
    } catch (err: any) {
      toast.dismiss('upload-copy');
      console.error('Grade submit error:', err);
      toast.error('Failed to save grade', { description: err.message || 'Please check your inputs' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !submission) {
    return (
      <div className="py-28 flex flex-col items-center justify-center text-[#8e8e8e] gap-3">
        <div className="w-10 h-10 border-2 border-[#262626] border-t-[#a8f1e0] rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-wider font-semibold font-condensed">Loading submission paper &amp; grading console...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="studio-card p-12 text-center max-w-lg mx-auto space-y-4 bg-[#141414] border border-[#262626] rounded-[20px]">
        <AlertCircle className="h-10 w-10 text-[#ff6b6b] mx-auto" />
        <h2 className="font-display font-bold uppercase text-xl text-white tracking-tight">
          Submission Not Found
        </h2>
        <Link href="/teacher/grading">
          <Button variant="outline" className="rounded-[20px] text-xs font-condensed uppercase tracking-wider border-[#383838] bg-[#181818] text-white hover:bg-[#222]">
            Return to Grading Station
          </Button>
        </Link>
      </div>
    );
  }

  const studentName = submission.users?.full_name || 'Enrolled Student';
  const studentEmail = submission.users?.email || '';
  const initials = studentName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const rawFileUrl = submission.file_url || '';
  const fileUrl = rawFileUrl.startsWith('http') 
    ? rawFileUrl 
    : supabase.storage.from('course-materials').getPublicUrl(rawFileUrl).data.publicUrl;
    
  const hasCheckedCopy = !!submission.checked_copy_url;
  const isPdf =
    submission.file_name?.toLowerCase().endsWith('.pdf') ||
    submission.file_type?.includes('pdf') ||
    fileUrl?.toLowerCase().includes('.pdf');

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Top Header Bar */}
      <div className="studio-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] border border-[#262626] rounded-[20px]">
        
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/grading"
            className="p-2 rounded-[20px] text-[#8e8e8e] hover:text-white hover:bg-[#181818] transition-colors"
            title="Back to submissions"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <Avatar className="h-10 w-10 border border-[#383838]">
            <AvatarImage src={submission.users?.avatar_url} />
            <AvatarFallback className="bg-[#1c1c1c] text-[#a8f1e0] font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold uppercase text-base sm:text-lg text-white leading-tight">
                {studentName}
              </h1>
              <Badge variant="mint" className="text-[10px] font-condensed font-bold uppercase tracking-wider px-2 py-0 rounded-[20px]">
                {submission.assignments?.courses?.code}
              </Badge>
            </div>
            <p className="text-xs font-condensed text-[#b7b7b5] truncate max-w-sm sm:max-w-md">
              {submission.assignments?.title} • {studentEmail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="text-right hidden sm:block">
            <div className="font-bold text-white uppercase tracking-wider font-condensed">
              Max Marks: {maxMarks}
            </div>
            <div className="text-[11px] text-[#8e8e8e] font-condensed">
              Submitted on {new Date(submission.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <Badge
            variant={submission.status === 'graded' ? 'mint' : 'gold'}
            className="text-[10px] px-3 py-1 font-condensed font-bold uppercase tracking-wider rounded-[20px]"
          >
            {submission.status === 'graded' ? 'Graded' : 'Pending Evaluation'}
          </Badge>

          {/* Faculty Delete Submission Action */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="rounded-[20px] text-[#ff6b6b] border-[#522] bg-[#2a1717] hover:bg-[#3a1d1d] h-8 px-3 text-xs font-bold font-condensed uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            title="Delete this student submission"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-[20px] p-6 max-w-sm bg-[#141414] border border-[#383838] text-white">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-display font-bold uppercase text-lg text-[#ff6b6b] flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Submission?
            </DialogTitle>
            <p className="text-xs text-[#b7b7b5] leading-relaxed font-condensed uppercase tracking-wider">
              Are you sure you want to permanently delete this submission by{' '}
              <strong className="text-white">{studentName}</strong>? All marks, feedback remarks, and checked copies will be deleted. This action cannot be undone.
            </p>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="rounded-[20px] text-xs font-condensed font-bold uppercase tracking-wider border border-[#383838] bg-[#181818] text-white hover:bg-[#222]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSubmission}
              disabled={isDeleting}
              className="rounded-[20px] text-xs font-condensed font-bold uppercase tracking-wider bg-[#ff6b6b] hover:bg-[#e05555] text-white shadow-sm"
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

      {/* ============================================================
          SPLIT SCREEN INTERFACE: 60% Left Viewer + 40% Right Grading
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Digital Correction Canvas / Document Viewer (60% width -> 7 cols) */}
        <div className="lg:col-span-7 studio-card overflow-hidden flex flex-col h-[520px] sm:h-[650px] lg:h-[780px] bg-[#141414] border border-[#262626] rounded-[20px]">
          
          {/* Viewer Mode Selector Header */}
          <div className="p-3 bg-[#181818] border-b border-[#262626] flex items-center justify-between">
            <div className="flex items-center gap-1 bg-[#141414] p-1 rounded-[20px] border border-[#383838] overflow-x-auto max-w-[80%]">
              <button
                type="button"
                onClick={() => setActiveViewerTab('canvas')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-[20px] text-xs font-condensed font-bold uppercase tracking-wider transition-all shrink-0 ${
                  activeViewerTab === 'canvas'
                    ? 'bg-[#a8f1e0] text-[#0c0c0c] shadow-sm'
                    : 'text-[#b7b7b5] hover:text-white'
                }`}
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Correction Pad</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('checked_copy')}
                disabled={!submission?.checked_copy_url}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-[20px] text-xs font-condensed font-bold uppercase tracking-wider transition-all shrink-0 ${
                  activeViewerTab === 'checked_copy'
                    ? 'bg-[#ffb956] text-[#0c0c0c] shadow-sm'
                    : submission?.checked_copy_url
                    ? 'text-[#ffb956] hover:bg-[#1c1c1c]'
                    : 'text-[#555] opacity-40 cursor-not-allowed'
                }`}
                title={submission?.checked_copy_url ? 'View evaluated checked copy' : 'No checked copy saved yet'}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Evaluated Copy</span>
                {submission?.checked_copy_url && (
                  <span className="w-2 h-2 rounded-full bg-[#ffb956] animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('original')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-[20px] text-xs font-condensed font-bold uppercase tracking-wider transition-all shrink-0 ${
                  activeViewerTab === 'original'
                    ? 'bg-[#9dc1ff] text-[#0c0c0c] shadow-sm'
                    : 'text-[#b7b7b5] hover:text-white'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Original File</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-condensed font-bold uppercase tracking-wider text-white hover:text-[#a8f1e0] bg-[#141414] border border-[#383838] px-3 py-1 rounded-[20px] shadow-sm transition-colors"
              >
                <span>Raw</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href={submission?.checked_copy_url || fileUrl}
                download
                className="p-1.5 rounded-[20px] text-[#8e8e8e] hover:text-white hover:bg-[#1c1c1c] transition-colors"
                title="Download file"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Viewer Body */}
          <div className="flex-1 overflow-hidden p-2 bg-[#0c0c0c]">
            {activeViewerTab === 'canvas' ? (
              <HandwrittenAnnotationCanvas
                ref={canvasHandleRef}
                imageUrl={fileUrl}
                isPdf={isPdf}
                checkedCopyUrl={submission.checked_copy_url}
                persistenceKey={submissionId}
                onExportBlob={(blob) => setPendingBlob(blob)}
                onSaveAnnotations={handleSaveAnnotationsOnly}
                isSavingAnnotations={isSavingAnnotations}
              />
            ) : activeViewerTab === 'checked_copy' ? (
              <div className="w-full h-full flex flex-col overflow-hidden bg-[#111111] rounded-[20px]">
                <div className="p-3 bg-[#181818] border-b border-[#262626] flex items-center justify-between text-xs text-[#d4d4d4]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#a8f1e0]" />
                    <span className="font-bold text-[#a8f1e0] uppercase font-condensed tracking-wider">Evaluated Copy with Handwritten Corrections</span>
                  </div>
                  <a
                    href={submission.checked_copy_url}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#ffb956] hover:bg-[#e5a64d] text-[#0c0c0c] font-condensed font-bold uppercase tracking-wider rounded-[20px] shadow-sm text-xs transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Copy
                  </a>
                </div>
                <div className="flex-1 overflow-auto flex items-start justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={submission.checked_copy_url}
                    alt="Evaluated checked copy"
                    className="max-w-full object-contain rounded-[16px] shadow-2xl border border-[#262626]"
                  />
                </div>
              </div>
            ) : isPdf ? (
              <iframe
                src={`${fileUrl}#toolbar=1`}
                className="w-full h-full rounded-[16px] bg-[#181818] border border-[#262626]"
                title="Student PDF Submission"
              />
            ) : (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-[#111111] rounded-[16px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt="Student handwritten answer sheet"
                  className="max-w-full max-h-full object-contain rounded-[16px] shadow-lg border border-[#262626]"
                />
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Grading Console & Return Panel (40% width -> 5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="studio-card p-6 sm:p-7 space-y-6 bg-[#141414] border border-[#262626] rounded-[20px]">
            
            <div className="flex items-center justify-between border-b border-[#262626] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display font-bold uppercase text-base text-white">
                    Evaluation &amp; Feedback
                  </h2>
                  <p className="text-[11px] font-condensed uppercase tracking-wider text-[#8e8e8e]">
                    Assign score &amp; return annotated copy
                  </p>
                </div>
              </div>

              {submission.checked_copy_url && (
                <Badge variant="mint" className="text-[10px] font-condensed font-bold uppercase tracking-wider rounded-[20px]">
                  ✓ Checked Copy Attached
                </Badge>
              )}
            </div>

            <form onSubmit={handleSubmitGrade} className="space-y-5">
              
              {/* Numerical Marks Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marks" className="text-[10px] font-bold text-[#e2bcc2] uppercase tracking-wider font-condensed">
                    Score Awarded
                  </Label>
                  <span className="text-xs font-bold text-[#8e8e8e] font-condensed uppercase tracking-wider">
                    out of {maxMarks} marks
                  </span>
                </div>

                <div className="relative">
                  <Input
                    id="marks"
                    type="number"
                    min={0}
                    max={maxMarks}
                    step={1}
                    required
                    placeholder={`0 - ${maxMarks}`}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-11 text-lg font-bold rounded-[20px] border-[#383838] bg-[#181818] text-white focus:border-[#a8f1e0] pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#8e8e8e] font-condensed">
                    / {maxMarks}
                  </div>
                </div>

                {/* Score Preset Percentage Chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-[#8e8e8e] uppercase tracking-wider font-condensed mr-1">
                    Presets:
                  </span>
                  {[100, 90, 75, 50, 0].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 rounded-[20px] text-[11px] font-condensed font-bold uppercase tracking-wider bg-[#181818] hover:border-[#a8f1e0] hover:text-white text-[#b7b7b5] transition-colors border border-[#383838]"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluation Status Toggle */}
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-[#e2bcc2] uppercase tracking-wider font-condensed">
                  Evaluation Verdict
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('graded')}
                    className={`py-2 px-3 rounded-[20px] text-xs font-condensed font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      status === 'graded'
                        ? 'bg-[#a8f1e0] border-[#a8f1e0] text-[#0c0c0c] shadow-sm'
                        : 'bg-[#181818] border-[#383838] text-[#b7b7b5] hover:bg-[#202020]'
                    }`}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${status === 'graded' ? 'text-[#0c0c0c]' : 'text-[#8e8e8e]'}`} />
                    Approved / Graded
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('needs_resubmission')}
                    className={`py-2 px-3 rounded-[20px] text-xs font-condensed font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5 ${
                      status === 'needs_resubmission'
                        ? 'bg-[#e2bcc2] border-[#e2bcc2] text-[#0c0c0c] shadow-sm'
                        : 'bg-[#181818] border-[#383838] text-[#b7b7b5] hover:bg-[#202020]'
                    }`}
                  >
                    <AlertCircle className={`h-4 w-4 ${status === 'needs_resubmission' ? 'text-[#0c0c0c]' : 'text-[#8e8e8e]'}`} />
                    Needs Revision
                  </button>
                </div>
              </div>

              {/* Rich Feedback Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedback" className="text-[10px] font-bold text-[#e2bcc2] uppercase tracking-wider font-condensed flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#a8f1e0]" />
                    Teacher&apos;s Feedback &amp; Remarks
                  </Label>
                  <span className="text-[10px] text-[#8e8e8e] font-condensed uppercase tracking-wider">
                    Visible to student
                  </span>
                </div>

                <Textarea
                  id="feedback"
                  rows={4}
                  placeholder="Provide step-by-step constructive feedback, formula corrections, and praise..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="rounded-[20px] border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0] text-xs leading-relaxed p-3.5"
                />

                {/* Quick Feedback Snippet Pills */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-[#8e8e8e] uppercase tracking-wider font-condensed">
                    Quick Suggestions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedbackQuickTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAppendTag(tag)}
                        className="text-[11px] text-[#d4d4d4] bg-[#181818] hover:border-[#a8f1e0] hover:text-white px-2.5 py-1 rounded-[20px] border border-[#383838] transition-colors text-left font-condensed"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit & Send Grade Action Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 rounded-[20px] bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#0c0c0c] font-condensed font-bold uppercase tracking-wider text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Evaluation &amp; Sending Copy...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Save Grade &amp; Return Checked Copy
                    </>
                  )}
                </Button>
              </div>

            </form>

          </div>

          {/* Student Info Card */}
          <div className="studio-card p-5 text-xs space-y-3 bg-[#141414] border border-[#262626] rounded-[20px]">
            <h3 className="font-display font-bold uppercase text-white tracking-tight">
              Batch &amp; Assignment Context
            </h3>
            <div className="space-y-2 text-[#b7b7b5] font-condensed">
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8e8e8e] uppercase tracking-wider">Target Batch:</span>
                <span className="font-semibold text-white">{submission.assignments?.courses?.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#262626]">
                <span className="text-[#8e8e8e] uppercase tracking-wider">Due Date:</span>
                <span className="font-medium text-white">
                  {new Date(submission.assignments?.due_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#8e8e8e] uppercase tracking-wider">Uploaded File Format:</span>
                <span className="font-mono text-white font-bold">{submission.file_type || 'scanned copy'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
