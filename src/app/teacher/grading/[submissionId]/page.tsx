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
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getSubmissionById, gradeSubmission, uploadCheckedCopy } from '@/lib/supabase/queries';
import { HandwrittenAnnotationCanvas } from '@/components/grading/HandwrittenAnnotationCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  const [submission, setSubmission] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeViewerTab, setActiveViewerTab] = useState<'canvas' | 'original'>('canvas');

  // Form State
  const [marks, setMarks] = useState<number | ''>('');
  const [feedback, setFeedback] = useState<string>('');
  const [status, setStatus] = useState<'graded' | 'needs_resubmission'>('graded');
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);

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

  // Submit Grade
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

      // If an annotated canvas copy is ready to upload
      if (pendingBlob) {
        toast.loading('Uploading checked copy with annotations...', { id: 'upload-copy' });
        checkedCopyPublicUrl = await uploadCheckedCopy(supabase, submissionId, pendingBlob);
        toast.dismiss('upload-copy');
      }

      await gradeSubmission(supabase, submissionId, {
        marks_obtained: Number(marks),
        feedback: feedback.trim(),
        status: status,
        checked_copy_url: checkedCopyPublicUrl,
      });

      toast.success('Grade & checked copy sent to student!', {
        description: `Score: ${marks}/${maxMarks} (${Math.round((Number(marks) / maxMarks) * 100)}%)`,
      });

      // Reload to ensure state is synchronized
      loadSubmission();
    } catch (err: any) {
      toast.dismiss('upload-copy');
      toast.error('Failed to save grade', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !submission) {
    return (
      <div className="py-28 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading submission paper &amp; grading console...</p>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-4">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="font-heading font-extrabold text-xl text-slate-900">
          Submission Not Found
        </h2>
        <Link href="/teacher/grading">
          <Button variant="outline" className="rounded-full text-xs">
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

  const fileUrl = submission.file_url;
  const isPdf =
    submission.file_name?.toLowerCase().endsWith('.pdf') ||
    submission.file_type?.includes('pdf') ||
    fileUrl?.toLowerCase().includes('.pdf');

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      
      {/* Top Header Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/grading"
            className="p-2 rounded-full text-slate-400 hover:text-orange-600 hover:bg-slate-100 transition-colors"
            title="Back to submissions"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <Avatar className="h-10 w-10 border-2 border-orange-200">
            <AvatarImage src={submission.users?.avatar_url} />
            <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                {studentName}
              </h1>
              <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-bold px-2 py-0">
                {submission.assignments?.courses?.code}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 truncate max-w-sm sm:max-w-md">
              {submission.assignments?.title} • {studentEmail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right hidden sm:block">
            <div className="font-bold text-slate-800">
              Max Marks: {maxMarks}
            </div>
            <div className="text-[11px] text-slate-400">
              Submitted on {new Date(submission.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <Badge
            className={`text-xs px-3 py-1 font-bold border-0 ${
              submission.status === 'graded'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {submission.status === 'graded' ? 'Graded' : 'Pending Evaluation'}
          </Badge>
        </div>

      </div>

      {/* ============================================================
          SPLIT SCREEN INTERFACE: 60% Left Viewer + 40% Right Grading
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Digital Correction Canvas / Document Viewer (60% width -> 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col h-[780px]">
          
          {/* Viewer Mode Selector Header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-full border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setActiveViewerTab('canvas')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  activeViewerTab === 'canvas'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="h-3.5 w-3.5" />
                <span>Correction Pad (Pen &amp; Ticks)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewerTab('original')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  activeViewerTab === 'original'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
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
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-orange-600 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm"
              >
                <span>Raw File</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <a
                href={submission.checked_copy_url || fileUrl}
                download
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
                title="Download file"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Viewer Body */}
          <div className="flex-1 overflow-hidden p-2 bg-slate-100">
            {activeViewerTab === 'canvas' ? (
              <HandwrittenAnnotationCanvas
                imageUrl={fileUrl}
                isPdf={isPdf}
                checkedCopyUrl={submission.checked_copy_url}
                onExportBlob={(blob) => setPendingBlob(blob)}
              />
            ) : isPdf ? (
              <iframe
                src={`${fileUrl}#toolbar=1`}
                className="w-full h-full rounded-2xl bg-white border border-slate-200"
                title="Student PDF Submission"
              />
            ) : (
              <div className="w-full h-full overflow-auto flex items-center justify-center p-4 bg-white rounded-2xl">
                <img
                  src={fileUrl}
                  alt="Student handwritten answer sheet"
                  className="max-w-full max-h-full object-contain rounded-xl shadow-lg border border-slate-200"
                />
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Grading Console & Return Panel (40% width -> 5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-100 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-heading font-extrabold text-base text-slate-900">
                    Evaluation &amp; Feedback
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Assign numerical score &amp; return annotated copy
                  </p>
                </div>
              </div>

              {submission.checked_copy_url && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                  ✓ Checked Copy Attached
                </Badge>
              )}
            </div>

            <form onSubmit={handleSubmitGrade} className="space-y-5">
              
              {/* Numerical Marks Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marks" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Score Awarded
                  </Label>
                  <span className="text-xs font-bold text-slate-500">
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
                    className="h-12 text-lg font-bold rounded-2xl border-slate-200 focus-visible:ring-orange-500 pr-16"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    / {maxMarks}
                  </div>
                </div>

                {/* Score Preset Percentage Chips */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Presets:
                  </span>
                  {[100, 90, 75, 50, 0].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-600 transition-colors border border-slate-200/60"
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Evaluation Status Toggle */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Evaluation Verdict
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('graded')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      status === 'graded'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${status === 'graded' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    Approved / Graded
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('needs_resubmission')}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      status === 'needs_resubmission'
                        ? 'bg-red-50 border-red-300 text-red-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertCircle className={`h-4 w-4 ${status === 'needs_resubmission' ? 'text-red-500' : 'text-slate-400'}`} />
                    Needs Revision
                  </button>
                </div>
              </div>

              {/* Rich Feedback Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="feedback" className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-orange-600" />
                    Teacher&apos;s Feedback &amp; Remarks
                  </Label>
                  <span className="text-[11px] text-slate-400">
                    Visible to student
                  </span>
                </div>

                <Textarea
                  id="feedback"
                  rows={4}
                  placeholder="Provide step-by-step constructive feedback, formula corrections, and praise..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="rounded-2xl border-slate-200 focus-visible:ring-orange-500 text-sm leading-relaxed p-3.5"
                />

                {/* Quick Feedback Snippet Pills */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Suggestions (Click to append):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedbackQuickTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAppendTag(tag)}
                        className="text-[11px] text-slate-600 bg-slate-100 hover:bg-orange-100 hover:text-orange-700 px-2.5 py-1 rounded-full border border-slate-200/60 transition-colors text-left"
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
                  className="w-full h-12 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-xl shadow-orange-600/25 transition-all flex items-center justify-center gap-2"
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
          <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 text-xs space-y-3">
            <h3 className="font-heading font-bold text-slate-800">
              Batch &amp; Assignment Context
            </h3>
            <div className="space-y-2 text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Target Batch:</span>
                <span className="font-semibold text-slate-800">{submission.assignments?.courses?.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-400">Due Date:</span>
                <span className="font-medium text-slate-700">
                  {new Date(submission.assignments?.due_date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Uploaded File Format:</span>
                <span className="font-mono text-slate-700 font-bold">{submission.file_type || 'scanned copy'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
