'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Video,
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  FileCheck,
  Sparkles,
  BookOpen,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourseById,
  getLectures,
  createLecture,
  deleteLecture,
  reorderLectures,
  getCourseMaterials,
  uploadCourseMaterial,
  deleteCourseMaterial,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default function CourseBuilderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.courseId as string;
  const supabase = createClient();

  const [course, setCourse] = useState<any>(null);
  const [lectures, setLectures] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Lecture Dialog State
  const [isLectureDialogOpen, setIsLectureDialogOpen] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [lectureVideoUrl, setLectureVideoUrl] = useState('');
  const [lectureNotesUrl, setLectureNotesUrl] = useState('');
  const [isAddingLecture, setIsAddingLecture] = useState(false);

  // Upload Material State
  const [isUploading, setIsUploading] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const [courseData, lecturesData, materialsData] = await Promise.all([
        getCourseById(supabase, courseId),
        getLectures(supabase, courseId),
        getCourseMaterials(supabase, courseId),
      ]);

      setCourse(courseData);
      setLectures(lecturesData);
      setMaterials(materialsData);
    } catch (err: any) {
      toast.error('Failed to load course details', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [courseId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Add Lecture
  const handleAddLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lectureTitle.trim()) {
      toast.error('Please enter lecture title');
      return;
    }

    try {
      setIsAddingLecture(true);
      const newOrderIndex = lectures.length + 1;
      await createLecture(supabase, {
        course_id: courseId,
        title: lectureTitle.trim(),
        video_url: lectureVideoUrl.trim() || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        notes_url: lectureNotesUrl.trim() || undefined,
        order_index: newOrderIndex,
      });

      toast.success('Lecture module added!');
      setLectureTitle('');
      setLectureVideoUrl('');
      setLectureNotesUrl('');
      setIsLectureDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error('Failed to add lecture', { description: err.message });
    } finally {
      setIsAddingLecture(false);
    }
  };

  // Handle Delete Lecture
  const handleDeleteLecture = async (lectureId: string) => {
    if (!confirm('Are you sure you want to remove this lecture?')) return;
    try {
      await deleteLecture(supabase, lectureId);
      toast.success('Lecture removed');
      loadData();
    } catch (err: any) {
      toast.error('Failed to remove lecture', { description: err.message });
    }
  };

  // Handle Move Lecture Up / Down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lectures.length) return;

    const newLectures = [...lectures];
    const temp = newLectures[index];
    newLectures[index] = newLectures[targetIndex];
    newLectures[targetIndex] = temp;

    // Update order_index in state immediately
    const updates = newLectures.map((l, i) => ({ id: l.id, order_index: i + 1 }));
    setLectures(newLectures);

    try {
      await reorderLectures(supabase, updates);
      toast.success('Lectures reordered');
    } catch (err: any) {
      toast.error('Failed to save order', { description: err.message });
      loadData();
    }
  };

  // Handle Material Upload
  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    try {
      setIsUploading(true);
      await uploadCourseMaterial(
        supabase,
        courseId,
        selectedFile,
        materialTitle.trim() || selectedFile.name
      );

      toast.success('Syllabus PDF / Material uploaded successfully!');
      setSelectedFile(null);
      setMaterialTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadData();
    } catch (err: any) {
      toast.error('Upload failed', { description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Material Delete
  const handleDeleteMaterial = async (materialId: string, fileUrl: string) => {
    if (!confirm('Delete this study material?')) return;
    try {
      // Extract path if possible
      let filePath = '';
      try {
        const urlObj = new URL(fileUrl);
        filePath = urlObj.pathname.split('course-materials/')[1] || '';
      } catch {}

      await deleteCourseMaterial(supabase, materialId, filePath);
      toast.success('Material deleted');
      loadData();
    } catch (err: any) {
      toast.error('Could not delete material', { description: err.message });
    }
  };

  if (loading && !course) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
        <p className="text-xs font-medium">Loading course builder...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Link
            href="/teacher/courses"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to All Batches
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              {course?.title || 'Classroom Batch'}
            </h1>
            <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-extrabold text-xs px-2.5 py-0.5 rounded-full">
              {course?.code}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            {course?.description || 'Manage lecture video links, notes documents, and syllabus PDFs for enrolled students.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/student/lectures" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-slate-300 text-slate-700 text-xs font-semibold h-9"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              Preview as Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs for Lecture Modules vs Syllabus Materials */}
      <Tabs defaultValue="lectures" className="space-y-6">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200/80 inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="lectures"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm"
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Lecture Modules ({lectures.length})
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-orange-700 data-[state=active]:shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF Notes &amp; Syllabus ({materials.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================================
            TAB 1: LECTURE MODULES MANAGER
            ============================================================ */}
        <TabsContent value="lectures" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-heading font-extrabold text-lg text-slate-900">
                Course Video Modules
              </h2>
              <p className="text-xs text-slate-500">
                Organize the order of recorded lectures and interactive video archives.
              </p>
            </div>

            <Dialog open={isLectureDialogOpen} onOpenChange={setIsLectureDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-9 px-4 shadow-md shadow-orange-600/20">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Lecture Module
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-md">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
                    Add Lecture to {course?.code}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Provide the video URL (YouTube, Vimeo, MP4) and notes link.
                  </p>
                </DialogHeader>

                <form onSubmit={handleAddLecture} className="space-y-4 pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lecTitle" className="text-xs font-bold text-slate-700">
                      Lecture Title
                    </Label>
                    <Input
                      id="lecTitle"
                      placeholder="e.g. Chapter 4: Electric Potential & Capacitance"
                      value={lectureTitle}
                      onChange={(e) => setLectureTitle(e.target.value)}
                      className="rounded-2xl h-11 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="vidUrl" className="text-xs font-bold text-slate-700">
                      Video Stream URL
                    </Label>
                    <Input
                      id="vidUrl"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={lectureVideoUrl}
                      onChange={(e) => setLectureVideoUrl(e.target.value)}
                      className="rounded-2xl h-11 text-xs"
                    />
                    <p className="text-[10px] text-slate-400">
                      Leave empty to use test institute stream.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notesUrl" className="text-xs font-bold text-slate-700">
                      Accompanying Handout / Notes URL (Optional)
                    </Label>
                    <Input
                      id="notesUrl"
                      placeholder="https://drive.google.com/... or Supabase PDF link"
                      value={lectureNotesUrl}
                      onChange={(e) => setLectureNotesUrl(e.target.value)}
                      className="rounded-2xl h-11 text-xs"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isAddingLecture}
                    className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-11 shadow-lg shadow-orange-600/25"
                  >
                    {isAddingLecture ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Lecture...
                      </span>
                    ) : (
                      'Save & Publish Lecture'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {lectures.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-xl border border-slate-100 space-y-3">
              <Video className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="font-heading font-extrabold text-base text-slate-900">
                No Lectures in this Batch
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click &quot;Add Lecture Module&quot; above to create your first class video entry.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {lectures.map((lecture, idx) => (
                <div
                  key={lecture.id}
                  className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl border border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-orange-200 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Move Up/Down Controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMove(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 'down')}
                        disabled={idx === lectures.length - 1}
                        className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold text-xs">
                      #{idx + 1}
                    </div>

                    <div className="space-y-0.5">
                      <div className="font-heading font-bold text-sm sm:text-base text-slate-900">
                        {lecture.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="truncate max-w-[200px] sm:max-w-xs text-slate-400">
                          {lecture.video_url || 'Embedded stream'}
                        </span>
                        {lecture.notes_url && (
                          <a
                            href={lecture.notes_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-600 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <FileText className="h-3 w-3" />
                            PDF Notes
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    <button
                      onClick={() => handleDeleteLecture(lecture.id)}
                      className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Lecture"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ============================================================
            TAB 2: PDF & STUDY MATERIAL UPLOADER
            ============================================================ */}
        <TabsContent value="materials" className="space-y-8">
          
          {/* Stylized Dropzone Upload Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100/80 space-y-6">
            <div className="space-y-1">
              <h2 className="font-heading font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-orange-600" />
                Upload Syllabus PDFs &amp; Formula Handouts
              </h2>
              <p className="text-xs text-slate-500">
                Uploaded files are stored in the secure Supabase storage bucket &quot;course-materials&quot; and made available to all enrolled batch students.
              </p>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              
              {/* Dropzone Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      setSelectedFile(file);
                      if (!materialTitle) setMaterialTitle(file.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <FileCheck className="h-10 w-10 text-emerald-600 mx-auto" />
                    <div className="font-bold text-sm text-slate-900">{selectedFile.name}</div>
                    <div className="text-xs text-slate-500 font-medium">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload
                    </div>
                    <span className="text-[11px] font-bold text-orange-600 hover:underline">
                      Click to choose another file
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="h-10 w-10 text-orange-500 mx-auto" />
                    <div className="font-bold text-sm text-slate-800">
                      Drag &amp; drop syllabus PDF here, or click to browse
                    </div>
                    <div className="text-xs text-slate-400">
                      Supports PDF, DOCX, PNG, JPG (Max 50MB)
                    </div>
                  </div>
                )}
              </div>

              {/* Title Input & Upload CTA */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-8 space-y-1.5">
                  <Label htmlFor="matTitle" className="text-xs font-bold text-slate-700">
                    Document Title / Label
                  </Label>
                  <Input
                    id="matTitle"
                    placeholder="e.g. Complete Mechanics Formula Sheet 2026"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    className="rounded-2xl h-11 text-xs"
                  />
                </div>

                <div className="sm:col-span-4">
                  <Button
                    type="submit"
                    disabled={!selectedFile || isUploading}
                    className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-11 shadow-lg shadow-orange-600/25 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading PDF...
                      </span>
                    ) : (
                      'Upload Material'
                    )}
                  </Button>
                </div>
              </div>

            </form>
          </div>

          {/* Uploaded Materials Repository */}
          <div className="space-y-4">
            <h3 className="font-heading font-extrabold text-base text-slate-900">
              Uploaded Study Materials ({materials.length})
            </h3>

            {materials.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 text-center shadow-xl border border-slate-100 text-slate-400 text-xs">
                No syllabus documents or reference files uploaded for this batch yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-orange-200 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {mat.title}
                        </h4>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {mat.file_type?.toUpperCase() || 'PDF'} • {new Date(mat.uploaded_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <a
                        href={mat.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                      >
                        <span>Open Document</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>

                      <button
                        onClick={() => handleDeleteMaterial(mat.id, mat.file_url)}
                        className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Material"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </TabsContent>
      </Tabs>

    </div>
  );
}
