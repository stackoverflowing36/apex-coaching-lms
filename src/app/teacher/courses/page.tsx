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
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  createCourse,
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header with Title & Add Batch Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Course Builder &amp; Syllabi
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Structure video modules, upload syllabus documents and formula sheets for each classroom batch.
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-5 shadow-lg shadow-orange-600/25">
              <Plus className="h-4 w-4 mr-1.5" />
              Add New Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
                Create Classroom Batch
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Define the curriculum code and title for this batch.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateCourse} className="space-y-4 pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-bold text-slate-700">
                  Course Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. Physics - Mechanics & Waves"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="rounded-2xl h-11 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-bold text-slate-700">
                  Batch Code (e.g. PHY-202)
                </Label>
                <Input
                  id="code"
                  placeholder="e.g. PHY-202"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="rounded-2xl h-11 text-xs uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="desc" className="text-xs font-bold text-slate-700">
                  Description / Objective
                </Label>
                <Textarea
                  id="desc"
                  placeholder="Target exams: JEE Advanced 2026, NEET UG..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="rounded-2xl min-h-[80px] text-xs resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-11 shadow-lg shadow-orange-600/25"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating Batch...
                  </span>
                ) : (
                  'Create Classroom Batch'
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading classroom batches...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-4">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="font-heading font-extrabold text-lg text-slate-900">No Batches Created Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click &quot;Add New Batch&quot; above to create your first classroom batch and start uploading modules and PDF study materials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:border-orange-200 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200/80 font-bold text-xs px-2.5 py-0.5 rounded-full">
                    {course.code}
                  </Badge>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {new Date(course.created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div>
                  <h3 className="font-heading font-extrabold text-lg text-slate-900 group-hover:text-orange-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {course.description || 'Comprehensive curriculum with video lectures and downloadable notes.'}
                  </p>
                </div>

                {/* Counts Summary */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50">
                    <Video className="h-4 w-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{course.lecturesCount}</div>
                      <div className="text-[10px] text-slate-400 font-medium">Lectures</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-50">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <div>
                      <div className="font-bold text-xs text-slate-900">{course.materialsCount}</div>
                      <div className="text-[10px] text-slate-400 font-medium">PDF Notes</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5 mt-2">
                <Link href={`/teacher/courses/${course.id}`}>
                  <Button className="w-full rounded-full bg-slate-900 hover:bg-orange-600 text-white font-bold text-xs h-10 shadow-md transition-all group-hover:bg-orange-600 flex items-center justify-between px-4">
                    <span>Manage Curriculum &amp; Uploads</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
