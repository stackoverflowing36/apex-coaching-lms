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
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getAssignmentById,
  getSubmissionForAssignment,
  createSubmission,
  uploadSubmissionFile,
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
  const supabase = createClient();

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
  }, [assignmentId, user]);

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

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error('Invalid file', { description: error });
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  }, []);

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
        <div className="h-48 rounded-2xl bg-white animate-pulse shadow-card" />
        <div className="h-64 rounded-2xl bg-white animate-pulse shadow-card" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="font-semibold text-slate-600">Assignment not found</p>
        <Link
          href="/student/assignments"
          className="text-emerald-600 text-sm font-medium mt-2 inline-block hover:underline"
        >
          ← Back to Assignments
        </Link>
      </div>
    );
  }

  const isPastDue = new Date(assignment.due_date) < new Date();
  const hasSubmitted = !!submission;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back */}
      <Link
        href="/student/assignments"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Assignments
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ========== ASSIGNMENT DETAILS ========== */}
        <div className="lg:col-span-2 space-y-5">
          {/* Info Card */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-slate-100/80">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold mb-3"
                >
                  {assignment.courses?.code}
                </Badge>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {assignment.title}
                </h1>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-2xl font-extrabold text-emerald-600">
                  {assignment.max_marks}
                </p>
                <p className="text-xs text-slate-400 font-medium">max marks</p>
              </div>
            </div>

            {/* Deadline Info */}
            <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/60 mb-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">
                  Due:{' '}
                  {new Date(assignment.due_date).toLocaleDateString('en-IN', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <span
                  className={`text-sm font-semibold ${
                    isPastDue ? 'text-red-600' : 'text-amber-600'
                  }`}
                >
                  {getTimeUntil(assignment.due_date)}
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-2">Instructions</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {assignment.description || 'No additional instructions provided.'}
              </p>
            </div>
          </div>

          {/* ========== FILE UPLOAD / SUBMISSION ========== */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-card border border-slate-100/80">
            {hasSubmitted ? (
              /* Already Submitted */
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Submission Received
                    </h2>
                  </div>
                  <Badge
                    className={
                      submission.status === 'graded'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    }
                  >
                    {submission.status === 'graded'
                      ? `Score: ${submission.marks_obtained}/${assignment.max_marks}`
                      : 'Pending Evaluation'}
                  </Badge>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4">
                  <div className="flex items-center gap-3">
                    {getFileIcon(submission.file_name || 'file')}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {submission.file_name || 'Submitted handwritten sheet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
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
                      href={submission.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      View Original
                    </a>
                  </div>

                  {submission.feedback && (
                    <div className="mt-4 pt-4 border-t border-emerald-200/60">
                      <p className="text-xs font-semibold text-emerald-800 mb-1 flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5 text-emerald-600" />
                        Teacher Feedback:
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-white/70 p-3 rounded-xl border border-emerald-100">
                        {submission.feedback}
                      </p>
                    </div>
                  )}
                </div>

                {/* Teacher's Checked Copy (with Ticks and Corrections) */}
                {submission.checked_copy_url && (
                  <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-orange-600 text-white border-0 text-xs font-bold px-2.5 py-0.5">
                            Checked Copy Available
                          </Badge>
                          <span className="text-xs font-bold text-orange-950">
                            Evaluated with Teacher Corrections &amp; Ticks
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          The teacher has marked your handwritten derivations with ticks, crosses, and remarks.
                        </p>
                      </div>

                      <a
                        href={submission.checked_copy_url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 transition-all shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Checked Copy
                      </a>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-orange-200/80 bg-white shadow-md max-h-96 overflow-y-auto">
                      <img
                        src={submission.checked_copy_url}
                        alt="Teacher evaluated and checked answer copy"
                        className="w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Upload Area for Scanned Handwritten Work */
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-900">
                      Upload Scanned Assignment
                    </h2>
                    <p className="text-xs text-slate-500">
                      Upload clear photos or PDF scans of your handwritten work for faculty review
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50">
                    Handwritten / PDF
                  </Badge>
                </div>

                {/* Accepted formats notice */}
                <div className="flex items-center gap-2 mb-4 text-xs text-slate-400">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>
                    Accepted: Clear Scans (PDF, JPG, PNG) · Max size: 10 MB
                  </span>
                </div>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
                    isDragging
                      ? 'border-emerald-400 bg-emerald-50/50 scale-[1.01]'
                      : selectedFile
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                  }`}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-4">
                      {getFileIcon(selectedFile.name)}
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-800">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1.5 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm font-medium text-slate-600 mb-1">
                        Drag &amp; drop your handwritten scan here
                      </p>
                      <p className="text-xs text-slate-400 mb-4">or select photos from device / scanner</p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold cursor-pointer hover:bg-slate-800 transition-colors">
                        <Upload className="h-4 w-4" />
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
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                      <span>Uploading scan...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                {selectedFile && !uploading && (
                  <Button
                    onClick={handleUpload}
                    disabled={isPastDue}
                    className="mt-5 w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-semibold h-12 text-base shadow-xl shadow-orange-600/20"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Submit Handwritten Work for Grading
                  </Button>
                )}

                {isPastDue && !hasSubmitted && (
                  <p className="mt-4 text-center text-sm text-red-500 font-medium">
                    ⚠ This assignment is past its due date. Submissions may not be accepted.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR ========== */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-6 sticky top-20 space-y-5">
            <h3 className="font-display text-sm font-bold text-slate-800">Assignment Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Course</span>
                <span className="font-semibold text-slate-800">{assignment.courses?.code}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Max Marks</span>
                <span className="font-semibold text-slate-800">{assignment.max_marks}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Status</span>
                {hasSubmitted ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    Submitted
                  </Badge>
                ) : isPastDue ? (
                  <Badge className="bg-red-50 text-red-600 border-red-200 text-xs">
                    Overdue
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                    Pending
                  </Badge>
                )}
              </div>
              {hasSubmitted && submission.status === 'graded' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Score</span>
                  <span className="font-display font-extrabold text-emerald-600 text-lg">
                    {submission.marks_obtained}/{assignment.max_marks}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/student/assignments"
                className="text-sm text-emerald-600 font-medium hover:underline flex items-center gap-1"
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
