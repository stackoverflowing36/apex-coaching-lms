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
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getAssignmentById,
  getAssignmentSubmissions,
} from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

export default function TeacherAssignmentDetailsPage() {
  const params = useParams();
  const assignmentId = params.assignmentId as string;
  const router = useRouter();
  const supabase = createClient();

  const [assignment, setAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentData, submissionsData] = await Promise.all([
        getAssignmentById(supabase, assignmentId),
        getAssignmentSubmissions(supabase, assignmentId),
      ]);
      setAssignment(assignmentData);
      setSubmissions(submissionsData);
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
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading assignment details...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <AlertCircle className="h-10 w-10 text-red-300" />
        <p className="text-sm font-medium">Assignment not found</p>
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
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Course
        </Link>
      </div>

      {/* Header Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <FileCheck className="w-64 h-64 text-slate-900 rotate-12" />
        </div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900">
              {assignment.title}
            </h1>
            <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 font-bold">
              {assignment.courses?.title || 'Unknown Batch'}
            </Badge>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-600 font-medium">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Due: {new Date(assignment.due_date).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-2">
              <Award className="h-4 w-4 text-orange-400" />
              {assignment.max_marks} Max Marks
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Details & Attachment */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <h2 className="font-heading font-bold text-lg text-slate-900 border-b border-slate-100 pb-3">
              Instructions
            </h2>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap font-medium">
              {descriptionText || 'No additional instructions provided.'}
            </div>
            
            {attachmentUrl && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" /> Attached Resource
                  </h3>
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                  >
                    Open in new tab <ChevronRight className="h-3 w-3" />
                  </a>
                </div>
                
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 h-[400px]">
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
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total</p>
              <p className="text-2xl font-extrabold text-slate-900">{totalSubmissions}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-3">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl font-extrabold text-slate-900">{pendingSubmissions}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Graded</p>
              <p className="text-2xl font-extrabold text-slate-900">{gradedSubmissions.length}</p>
            </div>
            <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Award className="h-5 w-5" />
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Avg Score</p>
              <p className="text-2xl font-extrabold text-slate-900">{averageScore}</p>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
            <h3 className="font-heading font-bold text-base text-slate-900 mb-4 flex items-center justify-between">
              Submissions
              <Badge variant="secondary" className="font-bold">
                {submissions.length}
              </Badge>
            </h3>
            
            {submissions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                <FileCheck className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">No submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <Link 
                    key={sub.id} 
                    href={`/teacher/grading/${sub.id}`}
                    className="block group"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                      <Avatar className="h-10 w-10 border-2 border-white shadow-sm shrink-0">
                        <AvatarImage src={sub.users?.avatar_url || ''} alt={sub.users?.full_name || 'Student'} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
                          {sub.users?.full_name?.charAt(0) || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {sub.users?.full_name || 'Unknown Student'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {sub.status === 'graded' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                              <CheckCircle2 className="h-3 w-3" /> Graded ({sub.marks_obtained})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-sm">
                              <Clock className="h-3 w-3" /> Pending Evaluation
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-400 group-hover:text-orange-500 transition-colors shrink-0">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
