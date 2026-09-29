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
        <div className="h-48 rounded-[20px] bg-[#141414] animate-pulse border border-[#2a2a2a]" />
        <div className="h-64 rounded-[20px] bg-[#141414] animate-pulse border border-[#2a2a2a]" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-[#141414] rounded-[20px] shadow-xl border border-[#2a2a2a] p-16 text-center text-white">
        <FileText className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
        <p className="font-semibold text-white">Assignment not found</p>
        <Link
          href="/student/assignments"
          className="text-[#a8f1e0] text-sm font-medium mt-2 inline-block hover:underline"
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
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#b7b7b5] hover:text-[#a8f1e0] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== ASSIGNMENT DETAILS ========== */}
        <div className="lg:col-span-2 space-y-5">
          {/* Info Card */}
          <div className="bg-[#141414] rounded-[20px] p-6 sm:p-8 shadow-xl border border-[#2a2a2a] text-white">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="bg-[#1c1c1c] text-[#a8f1e0] border border-[#333] text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-[20px]">
                    {assignment.courses?.code}
                  </span>
                  {assignment.course_chapters?.title && (
                    <span className="bg-[#242424] text-white border border-[#383838] text-xs font-bold uppercase px-3 py-1 rounded-[20px]">
                      Chapter: {assignment.course_chapters.title}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  {assignment.title}
                </h1>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-2xl font-extrabold text-[#a8f1e0]">
                  {assignment.max_marks}
                </p>
                <p className="text-xs text-[#8e8e8e] font-medium">max marks</p>
              </div>
            </div>

            {/* Deadline Info */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-[16px] bg-[#181818] border border-[#2e2e2e] mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#a8f1e0]" />
                <span className="text-sm font-medium text-[#d4d4d4]">
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
                <Clock className="h-4 w-4 text-[#ffb956]" />
                <span
                  className={`text-sm font-semibold ${
                    isPastDue ? 'text-red-400' : 'text-[#ffb956]'
                  }`}
                >
                  {getTimeUntil(assignment.due_date)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-sm text-white mb-2">Instructions</h3>
              <p className="text-sm text-[#b7b7b5] leading-relaxed whitespace-pre-line">
                {parsedDescription}
              </p>
              
              {attachmentUrl && (
                <div className="mt-4 space-y-4">
                  <div className="p-4 rounded-[16px] bg-[#181818] border border-[#2e2e2e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-[12px] bg-[#1c1c1c] border border-[#333] text-[#a8f1e0] flex items-center justify-center shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Assignment File</p>
                        <p className="text-xs text-[#8e8e8e]">Reference document for this assignment</p>
                      </div>
                    </div>
                    <a
                      href={attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 h-9 px-4 rounded-[20px] bg-[#1f1f1f] hover:bg-[#282828] border border-[#383838] text-white text-xs font-bold transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="h-4 w-4 text-[#a8f1e0]" />
                      Open Full Screen
                    </a>
                  </div>
                  
                  {/* Inline Preview */}
                  <div className="rounded-[16px] overflow-hidden border border-[#2e2e2e] bg-[#181818] h-[500px] w-full">
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
          <div className="bg-[#141414] rounded-[20px] p-6 sm:p-8 shadow-xl border border-[#2a2a2a] text-white">
            {hasSubmitted ? (
              /* Already Submitted */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#9ee4a0]" />
                    <h2 className="font-display text-lg font-bold text-white">
                      Submission Received
                    </h2>
                  </div>
                  <span
                    className={`text-xs font-bold uppercase px-3 py-1 rounded-[20px] ${
                      submission.status === 'graded'
                        ? 'bg-[#9ee4a0] text-[#0c0c0c]'
                        : 'bg-[#ffb956] text-[#0c0c0c]'
                    }`}
                  >
                    {submission.status === 'graded'
                      ? `Score: ${submission.marks_obtained}/${assignment.max_marks}`
                      : 'Pending Evaluation'}
                  </span>
                </div>

                <div className="rounded-[16px] border border-[#2e2e2e] bg-[#181818] p-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(submission.file_name || 'file')}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {submission.file_name || 'Submitted handwritten sheet'}
                      </p>
                      <p className="text-xs text-[#8e8e8e] mt-0.5">
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
                      className="px-3.5 py-1.5 rounded-[20px] text-xs font-bold text-white bg-[#1f1f1f] border border-[#383838] hover:border-[#a8f1e0] transition-colors"
                    >
                      View Original
                    </a>
                  </div>

                  {submission.feedback && (
                    <div className="mt-4 pt-4 border-t border-[#2e2e2e]">
                      <p className="text-xs font-semibold text-[#a8f1e0] mb-1.5 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" />
                        Teacher Feedback:
                      </p>
                      <p className="text-sm text-white leading-relaxed whitespace-pre-line bg-[#141414] p-3.5 rounded-[12px] border border-[#2e2e2e]">
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
                    <div className="rounded-[20px] border border-[#a8f1e0]/40 bg-[#181818] p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="bg-[#a8f1e0] text-[#0c0c0c] text-xs font-bold uppercase px-3 py-1 rounded-[20px]">
                            Checked Copy Returned
                          </span>
                        </div>

                        <a
                          href={checkedCopyUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-[20px] bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#0c0c0c] font-bold text-xs shadow-md transition-all shrink-0"
                        >
                          <Download className="h-3.5 w-3.5 text-[#0c0c0c]" />
                          Download Checked Copy
                        </a>
                      </div>

                      <div className="rounded-[16px] overflow-hidden border border-[#2e2e2e] bg-[#141414] max-h-96 overflow-y-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={checkedCopyUrl}
                          alt="Teacher evaluated and checked answer copy"
                          className="w-full object-contain"
                        />
                      </div>

                      {submission.file_url && (submission.file_name?.toLowerCase().endsWith('.pdf') || submission.file_url?.toLowerCase().endsWith('.pdf')) && (
                        <div className="mt-4 pt-4 border-t border-[#2e2e2e]">
                          <h4 className="text-xs font-bold text-[#b7b7b5] mb-2 uppercase tracking-wider">
                            Original Document (All Pages)
                          </h4>
                          <iframe
                            src={`${submission.file_url.startsWith('http') ? submission.file_url : supabase.storage.from('course-materials').getPublicUrl(submission.file_url).data.publicUrl}#toolbar=0`}
                            className="w-full h-[500px] rounded-[16px] border border-[#2e2e2e] bg-[#141414]"
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
                  <div className="mb-6 p-4 rounded-[20px] bg-[#2a1b1d] border border-rose-500/40 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Revisions Requested by Instructor
                        </h3>
                        <p className="text-xs text-[#b7b7b5]">
                          Your teacher requested revisions on your previous submission. Please review the feedback and submit an updated copy.
                        </p>
                      </div>
                    </div>

                    {submission.feedback && (
                      <div className="p-3 bg-[#181818] rounded-[12px] border border-rose-900/50 text-xs text-white">
                        <p className="font-semibold text-[#ffb956] mb-1 flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5" />
                          Teacher Feedback:
                        </p>
                        <p className="whitespace-pre-line leading-relaxed text-[#d4d4d4]">{submission.feedback}</p>
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
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[20px] bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#0c0c0c] font-bold text-xs shadow-sm transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-[#0c0c0c]" />
                          View Checked Copy (Teacher Corrections)
                        </a>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-white">
                      {isNeedsResubmit ? 'Upload Revised Assignment' : 'Upload Scanned Assignment'}
                    </h2>
                    <p className="text-xs text-[#8e8e8e]">
                      {isNeedsResubmit
                        ? 'Upload clear photos or PDF scans of your updated handwritten solutions'
                        : 'Upload clear photos or PDF scans of your handwritten work for faculty review'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-[20px] uppercase ${
                      isNeedsResubmit
                        ? 'bg-[#ffb956] text-[#0c0c0c]'
                        : 'bg-[#a8f1e0] text-[#0c0c0c]'
                    }`}
                  >
                    {isNeedsResubmit ? 'Resubmission' : 'Handwritten / PDF'}
                  </span>
                </div>

                {/* Accepted formats notice */}
                <div className="flex items-center gap-2 mb-4 text-xs text-[#8e8e8e]">
                  <AlertCircle className="h-3.5 w-3.5 text-[#a8f1e0]" />
                  <span>
                    Accepted: Clear Scans (PDF, JPG, PNG) · Max size: 10 MB
                  </span>
                </div>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative rounded-[20px] border-2 border-dashed p-10 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-[#a8f1e0] bg-[#1a2d24] scale-[1.01]'
                      : selectedFile
                      ? 'border-[#a8f1e0]/60 bg-[#181818]'
                      : 'border-[#383838] bg-[#181818] hover:border-[#a8f1e0]/50'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-4">
                      {getFileIcon(selectedFile.name)}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-white">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-[#8e8e8e]">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 rounded-full hover:bg-[#262626] text-[#8e8e8e] hover:text-red-400 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-[#a8f1e0] mx-auto mb-3" />
                      <p className="text-sm font-medium text-white mb-1">
                        Drag &amp; drop your handwritten scan here
                      </p>
                      <p className="text-xs text-[#8e8e8e] mb-4">or select photos from device / scanner</p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[20px] bg-[#1f1f1f] hover:bg-[#282828] border border-[#383838] hover:border-[#a8f1e0] text-white text-xs font-semibold cursor-pointer transition-colors">
                        <Upload className="h-4 w-4 text-[#a8f1e0]" />
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
                    <div className="flex items-center justify-between text-xs text-[#8e8e8e] mb-1.5">
                      <span>Uploading scan...</span>
                      <span className="text-[#a8f1e0] font-bold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#222222] rounded-full overflow-hidden">
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
                    className="mt-5 w-full rounded-[20px] bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#0c0c0c] font-bold h-12 text-sm shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 text-[#0c0c0c]" />
                    {isNeedsResubmit ? 'Submit Revision for Re-evaluation' : 'Submit Handwritten Work for Grading'}
                  </button>
                )}

                {isPastDue && !hasSubmitted && (
                  <p className="mt-4 text-center text-xs text-red-400 font-medium">
                    ⚠ This assignment is past its due date. Submissions may not be accepted.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR ========== */}
        <div className="lg:col-span-1">
          <div className="bg-[#141414] rounded-[20px] shadow-xl border border-[#2a2a2a] p-6 sticky top-24 space-y-5 text-white">
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">Assignment Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8e8e8e]">Course</span>
                <span className="font-semibold text-white">{assignment.courses?.code}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8e8e8e]">Max Marks</span>
                <span className="font-semibold text-[#a8f1e0]">{assignment.max_marks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8e8e8e]">Status</span>
                {hasSubmitted ? (
                  <span className="bg-[#9ee4a0] text-[#0c0c0c] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-[20px]">
                    Submitted
                  </span>
                ) : isNeedsResubmit ? (
                  <span className="bg-[#ffb956] text-[#0c0c0c] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-[20px]">
                    Revisions Requested
                  </span>
                ) : isPastDue ? (
                  <span className="bg-red-500 text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-[20px]">
                    Overdue
                  </span>
                ) : (
                  <span className="bg-[#ffb956] text-[#0c0c0c] text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-[20px]">
                    Pending
                  </span>
                )}
              </div>
              {hasSubmitted && submission.status === 'graded' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8e8e8e]">Score</span>
                  <span className="font-display font-extrabold text-[#a8f1e0] text-lg">
                    {submission.marks_obtained}/{assignment.max_marks}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-[#262626]">
              <Link
                href="/student/assignments"
                className="text-xs font-semibold text-[#a8f1e0] hover:text-[#9ee4a0] hover:underline flex items-center gap-1 transition-colors uppercase tracking-wider"
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
