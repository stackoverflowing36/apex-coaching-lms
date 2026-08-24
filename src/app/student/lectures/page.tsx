'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Play,
  Clock,
  BookOpen,
  ChevronRight,
  Search,
  Filter,
  FileText,
  HelpCircle,
  Download,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getLectures, getCourses, getCourseMaterials, getQuizzes } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default function LecturesPage() {
  const supabase = createClient();
  const [lectures, setLectures] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [lectureData, courseData, materialsData, quizzesData] = await Promise.all([
          getLectures(supabase),
          getCourses(supabase),
          getCourseMaterials(supabase),
          getQuizzes(supabase),
        ]);
        setLectures(lectureData);
        setCourses(courseData);
        setMaterials(materialsData);
        setQuizzes(quizzesData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  const filteredLectures = lectures.filter((l) => {
    const matchesCourse = selectedCourse ? l.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? l.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  const filteredMaterials = materials.filter((m) => {
    const matchesCourse = selectedCourse ? m.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? m.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  const filteredQuizzes = quizzes.filter((q) => {
    const matchesCourse = selectedCourse ? q.course_id === selectedCourse : true;
    const matchesSearch = searchQuery
      ? q.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCourse && matchesSearch;
  });

  // Group by course
  const groupedByCourse = filteredLectures.reduce((acc: Record<string, any[]>, lecture) => {
    const courseTitle = lecture.courses?.title || 'Uncategorized';
    if (!acc[courseTitle]) acc[courseTitle] = [];
    acc[courseTitle].push(lecture);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-white animate-pulse shadow-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Academic Vault &amp; Resources
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lectures.length} video lectures · {materials.length} PDF study materials · {quizzes.length} practice quizzes
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search lectures, syllabus PDFs, or tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-2xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400 text-xs h-11 bg-white"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
              !selectedCourse
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            All Batches
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedCourse === c.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
              }`}
            >
              {c.code}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Tabs */}
      <Tabs defaultValue="lectures" className="space-y-6">
        <div className="overflow-x-auto pb-1 -mb-1">
          <TabsList className="bg-slate-100 p-1 rounded-full border border-slate-200/80 inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="lectures"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Video Lectures ({filteredLectures.length})
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF Notes ({filteredMaterials.length})
            </TabsTrigger>
            <TabsTrigger
              value="quizzes"
              className="rounded-full text-xs font-bold px-4 sm:px-5 py-2 data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              Practice Quizzes ({filteredQuizzes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: LECTURES */}
        <TabsContent value="lectures" className="space-y-6">
          {Object.keys(groupedByCourse).length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <Video className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No lectures found</p>
              <p className="text-xs text-slate-400 mt-1">Try adjusting your batch filter or search query.</p>
            </div>
          ) : (
            Object.entries(groupedByCourse).map(([courseTitle, courseLectures]) => (
              <div key={courseTitle} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  <h2 className="font-heading text-base font-extrabold text-slate-800">
                    {courseTitle}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-slate-100 text-slate-600 text-xs font-bold"
                  >
                    {courseLectures.length} lectures
                  </Badge>
                </div>

                <div className="space-y-2">
                  {courseLectures.map((lecture: any) => (
                    <Link
                      key={lecture.id}
                      href={`/student/lectures/${lecture.id}`}
                      className="group block"
                    >
                      <div className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-emerald-200 transition-all flex items-center gap-4">
                        {/* Play Thumbnail */}
                        <div className="shrink-0 w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center relative overflow-hidden group-hover:bg-emerald-700 transition-colors">
                          <Play className="h-5 w-5 text-white ml-0.5" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                              Lecture {lecture.order_index}
                            </span>
                            <Badge className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0 border-0 font-bold">
                              {lecture.courses?.code}
                            </Badge>
                          </div>
                          <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate text-sm sm:text-base">
                            {lecture.title}
                          </p>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* TAB 2: COURSE MATERIALS / PDFS */}
        <TabsContent value="materials" className="space-y-4">
          {filteredMaterials.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No Study Materials Uploaded Yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Your teachers will upload formula sheets, notes PDFs, and reference materials here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-emerald-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 overflow-hidden">
                      <Badge className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0 border-0 font-bold mb-1">
                        {mat.courses?.code || 'BATCH'}
                      </Badge>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {mat.title}
                      </h4>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        Uploaded {new Date(mat.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <a
                    href={mat.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 py-2.5 rounded-2xl transition-colors"
                  >
                    <span>View / Download PDF</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: QUIZZES */}
        <TabsContent value="quizzes" className="space-y-4">
          {filteredQuizzes.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-16 text-center">
              <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="font-bold text-slate-700">No Active Practice Quizzes</p>
              <p className="text-xs text-slate-400 mt-1">
                Faculty-published timed tests and MCQ series will be listed here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="bg-white rounded-3xl p-5 shadow-xl border border-slate-100 hover:border-emerald-200 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-50 text-emerald-700 font-bold text-xs">
                        {quiz.courses?.code}
                      </Badge>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-orange-600" />
                        {quiz.time_limit_minutes || 30} mins
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">{quiz.title}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2">{quiz.description}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700">
                      {quiz.questions_count} Questions • {quiz.total_marks} Marks
                    </span>
                    <Badge className="bg-slate-900 text-white font-bold text-[10px] px-2.5 py-1 rounded-full">
                      Active Test
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
