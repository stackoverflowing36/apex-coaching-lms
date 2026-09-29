'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Video,
  FileText,
  UploadCloud,
  ChevronRight,
  BookOpen,
  Sparkles,
  Loader2,
  Calendar,
  Settings2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  createCourse,
  deleteCourse,
  getLectures,
  getCourseMaterials,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

interface CourseWithCounts {
  id: string;
  title: string;
  code: string;
  description: string;
  created_at: string;
  lecturesCount: number;
  materialsCount: number;
}

export default function TeacherCoursesPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<CourseWithCounts[]>([]);
  const [loading, setLoading] = useState(true);

  // New Course Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Course State
  const [courseToDelete, setCourseToDelete] = useState<CourseWithCounts | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const rawCourses = await getCourses(supabase);
      const [allLectures, allMaterials] = await Promise.all([
        getLectures(supabase),
        getCourseMaterials(supabase),
      ]);

      const enriched: CourseWithCounts[] = rawCourses.map((c) => ({
        ...c,
        lecturesCount: allLectures.filter((l) => l.course_id === c.id).length,
        materialsCount: allMaterials.filter((m) => m.course_id === c.id).length,
      }));

      setCourses(enriched);
    } catch (err: any) {
      toast.error('Failed to load courses', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) {
      toast.error('Please enter course title and code');
      return;
    }

    try {
      setIsSubmitting(true);
      await createCourse(supabase, {
        title: newTitle.trim(),
        code: newCode.trim().toUpperCase(),
        description: newDescription.trim(),
      });

      toast.success('Classroom batch created successfully!');
      setNewTitle('');
      setNewCode('');
      setNewDescription('');
      setIsDialogOpen(false);
      loadCourses();
    } catch (err: any) {
      toast.error('Could not create batch', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCourse(supabase, courseToDelete.id);
      toast.success(`Classroom batch "${courseToDelete.title}" deleted successfully`);
      setCourseToDelete(null);
      loadCourses();
    } catch (err: any) {
      toast.error('Failed to delete classroom batch', { description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header with Title & Add Batch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center">
              <Layers className="h-4 w-4" />
            </div>
            <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-white tracking-tight">
              Course Builder &amp; Syllabi
            </h1>
          </div>
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#b7b7b5]">
            Structure video modules, upload syllabus documents and formula sheets for each classroom batch.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="bg-[#a8f1e0] text-[#0c0c0c] hover:bg-[#9ee4a0] rounded-[20px] text-xs font-bold uppercase tracking-wider py-2.5 px-5 flex items-center gap-1.5 shadow-sm transition-all">
              <Plus className="h-4 w-4" />
              Add New Batch
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-[20px] p-6 sm:p-8 max-w-md border border-[#383838] bg-[#141414] text-white shadow-2xl">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-display font-bold uppercase text-xl text-white tracking-tight">
                Create Classroom Batch
              </DialogTitle>
              <p className="text-xs text-[#b7b7b5] font-condensed">
                Define the curriculum code and title for this batch.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateCourse} className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-[#e2bcc2] font-condensed">
                  Course Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Physics - Mechanics & Waves"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-[20px] h-10 text-xs border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold uppercase tracking-wider text-[#e2bcc2] font-condensed">
                  Batch Code (e.g. PHY-202)
                </Label>
                <Input
                  id="code"
                  placeholder="e.g. PHY-202"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="rounded-[20px] h-10 text-xs uppercase border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-semibold uppercase tracking-wider text-[#e2bcc2] font-condensed">
                  Description / Objective
                </Label>
                <Textarea
                  id="desc"
                  placeholder="Target exams: JEE Advanced 2026, NEET UG..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="rounded-[20px] min-h-[80px] text-xs resize-none border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#a8f1e0] text-[#0c0c0c] hover:bg-[#9ee4a0] rounded-[20px] text-xs font-bold uppercase tracking-wider py-3 flex items-center justify-center gap-2 transition-all mt-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Batch...
                  </span>
                ) : (
                  'Create Classroom Batch'
                )}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-[#8e8e8e] gap-3">
          <div className="w-10 h-10 border-2 border-[#262626] border-t-[#a8f1e0] rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed">Loading classroom batches...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="studio-card p-12 text-center space-y-4 bg-[#141414] border border-[#262626] rounded-[20px]">
          <BookOpen className="h-12 w-12 text-[#8e8e8e] mx-auto" />
          <h3 className="font-display font-bold uppercase text-lg text-white tracking-tight">No Batches Created Yet</h3>
          <p className="text-xs text-[#b7b7b5] max-w-md mx-auto">
            Click &quot;Add New Batch&quot; above to create your first classroom batch and start uploading modules and PDF study materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="studio-card p-6 bg-[#141414] border border-[#262626] rounded-[20px] hover:border-[#a8f1e0]/60 transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="mint" className="font-bold uppercase tracking-wider text-[10px]">
                      {course.code}
                    </Badge>
                    <span className="text-[10px] font-semibold text-[#8e8e8e] font-condensed uppercase tracking-wider">
                      {new Date(course.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCourseToDelete(course);
                    }}
                    className="p-1.5 rounded-[20px] text-[#8e8e8e] hover:text-[#ff6b6b] hover:bg-[#2a1717] transition-colors"
                    title="Delete classroom batch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h3 className="font-display font-bold uppercase text-lg text-white group-hover:text-[#a8f1e0] transition-colors tracking-tight">
                    {course.title}
                  </h3>
                  <p className="text-xs text-[#b7b7b5] mt-1 line-clamp-2 leading-relaxed">
                    {course.description || 'Comprehensive curriculum with video lectures and downloadable notes.'}
                  </p>
                </div>

                {/* Counts Summary */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262626]">
                  <div className="flex items-center gap-2 p-2.5 rounded-[16px] bg-[#181818] border border-[#383838]">
                    <Video className="h-4 w-4 text-[#a8f1e0]" />
                    <div>
                      <div className="font-bold text-xs text-white">{course.lecturesCount}</div>
                      <div className="text-[10px] text-[#8e8e8e] font-condensed uppercase tracking-wider font-semibold">Lectures</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-[16px] bg-[#181818] border border-[#383838]">
                    <FileText className="h-4 w-4 text-[#ffb956]" />
                    <div>
                      <div className="font-bold text-xs text-white">{course.materialsCount}</div>
                      <div className="text-[10px] text-[#8e8e8e] font-condensed uppercase tracking-wider font-semibold">PDF Notes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-2">
                <Link href={`/teacher/courses/${course.id}`}>
                  <button className="w-full rounded-[20px] border border-[#383838] bg-[#181818] text-white hover:border-[#a8f1e0] hover:text-[#a8f1e0] text-xs font-bold uppercase tracking-wider py-2.5 px-4 flex items-center justify-between transition-all">
                    <span>Manage Curriculum &amp; Uploads</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Batch Confirmation Dialog */}
      <Dialog
        open={!!courseToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setCourseToDelete(null);
        }}
      >
        <DialogContent className="rounded-[20px] p-6 sm:p-8 max-w-md bg-[#141414] border border-[#383838] text-white">
          <DialogHeader className="space-y-2 text-left">
            <div className="w-12 h-12 rounded-[20px] bg-[#2a1717] text-[#ff6b6b] border border-[#522] flex items-center justify-center mb-1">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="font-heading font-extrabold text-xl text-white">
              Delete Classroom Batch?
            </DialogTitle>
            <div className="space-y-2 text-xs text-[#b7b7b5] leading-relaxed">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-white font-bold">{courseToDelete?.title}</strong>{' '}
                <span className="text-[#ffb956] font-bold">({courseToDelete?.code})</span>?
              </p>
              <div className="rounded-[16px] bg-[#2a1717] border border-[#522] p-3 text-[#e2bcc2] text-[11px] space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-[#ff6b6b]">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Final Confirmation Required</span>
                </p>
                <p className="leading-normal">
                  This will permanently erase all video lectures, PDF syllabi & notes, quizzes, student assignments, submissions, and attendance records associated with this batch.
                </p>
                <p className="font-bold text-[#ff6b6b]">
                  This action is irreversible and cannot be undone.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2.5 pt-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCourseToDelete(null)}
              disabled={isDeleting}
              className="rounded-[20px] text-xs font-bold border border-[#383838] bg-[#181818] text-white hover:bg-[#222]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteCourse}
              disabled={isDeleting}
              className="rounded-[20px] text-xs font-bold bg-[#ff6b6b] hover:bg-[#e05555] text-white shadow-lg shadow-red-600/25 px-4 h-9"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting Batch...
                </span>
              ) : (
                'Yes, Permanently Delete'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
