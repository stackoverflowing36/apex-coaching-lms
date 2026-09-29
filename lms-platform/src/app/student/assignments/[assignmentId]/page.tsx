'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Clock,
  Upload,
  CheckCircle2,
  AlertCircle,
  File,
  X,
  Loader2,
  Award,
  FileImage,
  FileType2,
  ExternalLink,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getAssignmentById,
  getSubmissionForAssignment,
  createSubmission,
  uploadSubmissionFile,
  createNotification,
} from '@/lib/supabase/queries';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function AssignmentDetailPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const { user } = useAuthUser();
  const supabase = React.useMemo(() => createClient(), []);

  const [assignment, setAssignment] = useState<any>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [assignmentData, submissionData] = await Promise.all([
          getAssignmentById(supabase, assignmentId),
          getSubmissionForAssignment(supabase, assignmentId, user.id),
        ]);
        setAssignment(assignmentData);
        setSubmission(submissionData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [assignmentId, user, supabase]);

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }
    if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Accepted: PDF, JPG, PNG`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size: 10 MB`;
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error('Invalid file', { description: error });
      return;
    }
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !user || !assignment) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 15, 85));
    }, 200);

    try {
      const { path } = await uploadSubmissionFile(
        supabase,
        user.id,
        assignment.id,
        selectedFile
      );

      setUploadProgress(95);

      const newSubmission = await createSubmission(supabase, {
        assignment_id: assignment.id,
        student_id: user.id,
        file_url: path,
        file_name: selectedFile.name,
        file_type: selectedFile.type,
      });

      setUploadProgress(100);
      setSubmission(newSubmission);
      setSelectedFile(null);

      // Notify faculty in real-time
      try {
        await createNotification(supabase, {
          type: 'submission_created',
          title: 'New Assignment Submission',
          message: `${user.full_name || 'A student'} submitted for "${assignment.title}"`,
          data: {
            assignment_id: assignment.id,
            assignment_title: assignment.title,
            student_id: user.id,
            submission_id: newSubmission.id,
          },
        });
      } catch (notifErr) {
        console.warn('Failed to notify faculty of submission:', notifErr);
      }

      toast.success('Assignment submitted!', {
        description: 'Your file has been uploaded successfully.',
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Upload failed', {
        description: err?.message || 'Please try again.',
      });
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  function getTimeUntil(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff < 0) return 'Past due';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    return 'Due very soon';
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileType2 className="h-5 w-5 text-red-500" />;
    if (['jpg', 'jpeg', 'png'].includes(ext || ''))
      return <FileImage className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-studio bg-white animate-pulse border border-stone-200" />
        <div className="h-64 rounded-studio bg-white animate-pulse border border-stone-200" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-white rounded-studio shadow-xl border border-stone-200 p-16 text-center text-[#111111]">
        <FileText className="h-12 w-12 text-stone-400 mx-auto mb-4" />
        <p className="font-semibold text-[#111111]">Assignment not found</p>
        <Link
          href="/student/assignments"
          className="text-[#a05120] text-sm font-medium mt-2 inline-block hover:underline"
        >
          ← Back to Assignments
        </Link>
      </div>
    );
  }

  const isPastDue = new Date(assignment.due_date) < new Date();
  const isNeedsResubmit = submission?.status === 'needs_resubmission';
  const hasSubmitted = !!submission && !isNeedsResubmit;

  // Parse attachment from description
  let parsedDescription = assignment.description || 'No additional instructions provided.';
  let attachmentUrl: string | null = null;
  const attachmentMatch = parsedDescription.match(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/);
  if (attachmentMatch) {
    attachmentUrl = attachmentMatch[1];
    parsedDescription = parsedDescription.replace(/\[ATTACHMENT:(https?:\/\/[^\]]+)\]/, '').trim();
  }

  return (
    <div className="max-w-[1360px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Back */}
      <Link
        href="/student/assignments"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 hover:text-[#a05120] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== ASSIGNMENT DETAILS ========== */}
        <div className="lg:col-span-2 space-y-5">
          {/* Info Card */}
          <div className="bg-white rounded-studio p-6 sm:p-8 shadow-xl border border-stone-200 text-[#111111]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="bg-stone-100 text-[#a05120] border border-stone-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-studio">
                    {assignment.courses?.code}
                  </span>
                  {assignment.course_chapters?.title && (
                    <span className="bg-stone-100 text-[#111111] border border-stone-300 text-xs font-bold uppercase px-3 py-1 rounded-studio">
                      Chapter: {assignment.course_chapters.title}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
                  {assignment.title}
                </h1>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-2xl font-extrabold text-[#a05120]">
                  {assignment.max_marks}
                </p>
                <p className="text-xs text-stone-400 font-medium">max marks</p>
              </div>
            </div>

            {/* Deadline Info */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-[16px] bg-stone-50 border border-stone-200 mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#a05120]" />
                <span className="text-sm font-medium text-stone-600">
                  Due:{' '}
                  {new Date(assignment.due_date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <span className="text-[#383838]">|</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-700" />
                <span
                  className={`text-sm font-semibold ${
                    isPastDue ? 'text-red-600' : 'text-amber-700'
                  }`}
                >
                  {getTimeUntil(assignment.due_date)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-sm text-[#111111] mb-2">Instructions</h3>
              <p className="text-sm text-stone-500 leading-relaxed whitespace-pre-line">
                {parsedDescription}
              </p>
              
              {attachmentUrl && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-[16px] bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-[12px] bg-stone-100 border border-stone-300 text-[#a05120] flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#111111]">Assignment File</p>
                        <p className="text-xs text-stone-400">Reference document for this assignment</p>
                      </div>
                    </div>
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-studio bg-stone-100 hover:bg-stone-100 border border-stone-300 text-[#111111] text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="h-4 w-4 text-[#a05120]" />
                      Open Full Screen
                    </a>
                  </div>
                  
                  {/* Inline Preview */}
                  <div className="rounded-[16px] overflow-hidden border border-stone-200 bg-stone-50 h-[500px] w-full">
                    {attachmentUrl.toLowerCase().endsWith('.pdf') ? (
                      <iframe 
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(attachmentUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title="Assignment Preview"
                      />
                    ) : attachmentUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={attachmentUrl} 
                        alt="Assignment Preview" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <iframe 
                        src={attachmentUrl} 
                        className="w-full h-full border-0"
                        title="Assignment Preview"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== FILE UPLOAD / SUBMISSION ========== */}
          <div className="bg-white rounded-studio p-6 sm:p-8 shadow-xl border border-stone-200 text-[#111111]">
            {hasSubmitted ? (
              /* Already Submitted */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                    <h2 className="font-display text-lg font-bold text-[#111111]">
                      Submission Received
                    </h2>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase px-3 py-1 rounded-studio ${
                      submission.status === 'graded'
                        ? 'bg-[#9ee4a0] text-[#111111]'
                        : 'bg-[#ffb956] text-[#111111]'
                    }`}
                  >
                    {submission.status === 'graded'
                      ? `Score: ${submission.marks_obtained}/${assignment.max_marks}`
                      : 'Pending Evaluation'}
                  </span>
                </div>

                <div className="rounded-[16px] border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(submission.file_name || 'file')}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111111] truncate">
                        {submission.file_name || 'Submitted handwritten sheet'}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        Submitted on{' '}
                        {new Date(submission.submitted_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <a
                      href={submission.file_url?.startsWith('http') ? submission.file_url : supabase.storage.from('course-materials').getPublicUrl(submission.file_url).data.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-studio text-xs font-bold text-[#111111] bg-stone-100 border border-stone-300 hover:border-[#a05120] transition-colors"
                    >
                      View Original
                    </a>
                  </div>

                  {submission.feedback && (
                    <div className="mt-4 pt-4 border-t border-stone-200">
                      <p className="text-xs font-semibold text-[#a05120] mb-1.5 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" />
                        Teacher Feedback:
                      </p>
                      <p className="text-sm text-[#111111] leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-[12px] border border-stone-200">
                        {submission.feedback}
                      </p>
                    </div>
                  )}
                </div>

                {/* Teacher's Checked Copy */}
                {(() => {
                  const rawCheckedCopy = submission.checked_copy_url || submission.checkedCopyUrl;
                  const checkedCopyUrl = rawCheckedCopy
                    ? (rawCheckedCopy.startsWith('http')
                        ? rawCheckedCopy
                        : supabase.storage.from('course-materials').getPublicUrl(rawCheckedCopy).data.publicUrl)
                    : null;

                  if (!checkedCopyUrl) return null;

                  return (
                    <div className="rounded-studio border border-[#a8f1e0]/40 bg-stone-50 p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#a8f1e0] text-[#111111] text-xs font-bold uppercase px-3 py-1 rounded-studio">
                            Checked Copy Returned
                          </span>
                        </div>

                        <a
                          href={checkedCopyUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] font-bold text-xs shadow-md transition-all shrink-0"
                        >
                          <Download className="h-3.5 w-3.5 text-[#111111]" />
                          Download Checked Copy
                        </a>
                      </div>

                      <div className="rounded-[16px] overflow-hidden border border-stone-200 bg-white max-h-96 overflow-y-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={checkedCopyUrl}
                          alt="Teacher evaluated and checked answer copy"
                          className="w-full object-contain"
                        />
                      </div>

                      {submission.file_url && (submission.file_name?.toLowerCase().endsWith('.pdf') || submission.file_url?.toLowerCase().endsWith('.pdf')) && (
                        <div className="mt-4 pt-4 border-t border-stone-200">
                          <h4 className="text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider">
                            Original Document (All Pages)
                          </h4>
                          <iframe
                            src={`${submission.file_url.startsWith('http') ? submission.file_url : supabase.storage.from('course-materials').getPublicUrl(submission.file_url).data.publicUrl}#toolbar=0`}
                            className="w-full h-[500px] rounded-[16px] border border-stone-200 bg-white"
                            title="Original Document"
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Upload Area for Scanned Handwritten Work */
              <div>
                {isNeedsResubmit && submission && (
                  <div className="mb-6 p-4 rounded-studio bg-rose-50 border border-rose-200 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-[#111111]">
                          Revisions Requested by Instructor
                        </h3>
                        <p className="text-xs text-stone-600">
                          Your teacher requested revisions on your previous submission. Please review the feedback and submit an updated copy.
                        </p>
                      </div>
                    </div>

                    {submission.feedback && (
                      <div className="p-3 bg-white rounded-[12px] border border-rose-200 text-xs text-[#111111]">
                        <p className="font-semibold text-amber-700 mb-1 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5" />
                          Teacher Feedback:
                        </p>
                        <p className="whitespace-pre-line leading-relaxed text-stone-600">{submission.feedback}</p>
                      </div>
                    )}

                    {(() => {
                      const rawChecked = submission.checked_copy_url || submission.checkedCopyUrl;
                      const checkedUrl = rawChecked
                        ? (rawChecked.startsWith('http')
                            ? rawChecked
                            : supabase.storage.from('course-materials').getPublicUrl(rawChecked).data.publicUrl)
                        : null;
                      if (!checkedUrl) return null;
                      return (
                        <a
                          href={checkedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] font-bold text-xs shadow-sm transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-[#111111]" />
                          View Checked Copy (Teacher Corrections)
                        </a>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#111111]">
                      {isNeedsResubmit ? 'Upload Revised Assignment' : 'Upload Scanned Assignment'}
                    </h2>
                    <p className="text-xs text-stone-400">
                      {isNeedsResubmit
                        ? 'Upload clear photos or PDF scans of your updated handwritten solutions'
                        : 'Upload clear photos or PDF scans of your handwritten work for faculty review'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-studio uppercase ${
                      isNeedsResubmit
                        ? 'bg-[#ffb956] text-[#111111]'
                        : 'bg-[#a8f1e0] text-[#111111]'
                    }`}
                  >
                    {isNeedsResubmit ? 'Resubmission' : 'Handwritten / PDF'}
                  </span>
                </div>

                {/* Accepted formats notice */}
                <div className="flex items-center gap-2 mb-4 text-xs text-stone-400">
                  <AlertCircle className="h-3.5 w-3.5 text-[#a05120]" />
                  <span>
                    Accepted: Clear Scans (PDF, JPG, PNG) · Max size: 10 MB
                  </span>
                </div>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative rounded-studio border-2 border-dashed p-10 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-[#a8f1e0] bg-emerald-50 scale-[1.01]'
                      : selectedFile
                      ? 'border-[#a8f1e0]/60 bg-stone-50'
                      : 'border-stone-300 bg-stone-50 hover:border-[#a05120]/50'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-4">
                      {getFileIcon(selectedFile.name)}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-[#111111]">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-stone-400">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 rounded-full hover:bg-stone-100 text-stone-400 hover:text-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-[#a05120] mx-auto mb-3" />
                      <p className="text-sm font-medium text-[#111111] mb-1">
                        Drag &amp; drop your handwritten scan here
                      </p>
                      <p className="text-xs text-stone-400 mb-4">or select photos from device / scanner</p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-studio bg-stone-100 hover:bg-stone-100 border border-stone-300 hover:border-[#a05120] text-[#111111] text-xs font-semibold cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-[#a05120]" />
                        Browse Scanned Pages
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(file);
                          }}
                        />
                      </label>
                    </>
                  )}
                </div>

                {/* Upload Progress */}
                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                      <span>Uploading scan...</span>
                      <span className="text-[#a05120] font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#a8f1e0] rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                {selectedFile && !uploading && (
                  <button
                    onClick={handleUpload}
                    disabled={isPastDue}
                    className="mt-5 w-full rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] font-bold h-12 text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 text-[#111111]" />
                    {isNeedsResubmit ? 'Submit Revision for Re-evaluation' : 'Submit Handwritten Work for Grading'}
                  </button>
                )}

                {isPastDue && !hasSubmitted && (
                  <p className="mt-4 text-center text-xs text-red-600 font-medium">
                    ⚠ This assignment is past its due date. Submissions may not be accepted.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR ========== */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-studio shadow-xl border border-stone-200 p-6 sticky top-24 space-y-5 text-[#111111]">
            <h3 className="font-display text-sm font-bold text-[#111111] uppercase tracking-wider">Assignment Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Course</span>
                <span className="font-semibold text-[#111111]">{assignment.courses?.code}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Max Marks</span>
                <span className="font-semibold text-[#a05120]">{assignment.max_marks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-400">Status</span>
                {hasSubmitted ? (
                  <span className="bg-[#9ee4a0] text-[#111111] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-studio">
                    Submitted
                  </span>
                ) : isNeedsResubmit ? (
                  <span className="bg-[#ffb956] text-[#111111] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-studio">
                    Revisions Requested
                  </span>
                ) : isPastDue ? (
                  <span className="bg-red-500 text-[#111111] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-studio">
                    Overdue
                  </span>
                ) : (
                  <span className="bg-[#ffb956] text-[#111111] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-studio">
                    Pending
                  </span>
                )}
              </div>
              {hasSubmitted && submission.status === 'graded' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-400">Score</span>
                  <span className="font-display font-extrabold text-[#a05120] text-lg">
                    {submission.marks_obtained}/{assignment.max_marks}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-200">
              <Link
                href="/student/assignments"
                className="text-xs font-semibold text-[#a05120] hover:text-emerald-700 hover:underline flex items-center gap-1 transition-colors uppercase tracking-wider"
              >
                <ArrowLeft className="h-3 w-3" />
                View All Assignments
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
