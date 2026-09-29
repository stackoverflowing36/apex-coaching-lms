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
  CheckCircle2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getLectures,
  getCourses,
  getCourseMaterials,
  getQuizzes,
  getStudentQuizAttempts,
} from '@/lib/supabase/queries';
import { useUser } from '@/app/student/layout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const dynamic = 'force-dynamic';

export default function LecturesPage() {
  const supabase = createClient();
  const user = useUser();
  const [lectures, setLectures] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studentAttempts, setStudentAttempts] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const studentId = user?.id || 'demo-student';
        const [lectureData, courseData, materialsData, quizzesData, attemptsData] = await Promise.all([
          getLectures(supabase),
          getCourses(supabase),
          getCourseMaterials(supabase),
          getQuizzes(supabase),
          getStudentQuizAttempts(supabase, studentId),
        ]);
        setLectures(lectureData);
        setCourses(courseData);
        setMaterials(materialsData);
        setQuizzes(quizzesData);
        setStudentAttempts(attemptsData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase, user?.id]);

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
          <div key={i} className="h-24 rounded-[20px] bg-[#141414] border border-[#262626] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display uppercase text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Academic Vault &amp; Resources
          </h1>
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#b7b7b5] mt-1">
            {lectures.length} video lectures · {materials.length} PDF study materials · {quizzes.length} practice quizzes
          </p>
        </div>
      </div>

      {/* Filters (Capsule & Pills) */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e8e8e]" />
          <Input
            placeholder="Search lectures, syllabus PDFs, or tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-[20px] border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0] focus:ring-0 text-xs h-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button
            onClick={() => setSelectedCourse(null)}
            className={`px-4 py-2 rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all ${
              !selectedCourse
                ? 'bg-[#a8f1e0] text-[#0c0c0c] shadow-sm'
                : 'bg-[#181818] text-[#b7b7b5] border border-[#383838] hover:border-[#a8f1e0] hover:text-white'
            }`}
          >
            All Batches
          </button>
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCourse(c.id === selectedCourse ? null : c.id)}
              className={`px-4 py-2 rounded-[20px] text-xs font-bold uppercase tracking-wider transition-all ${
                selectedCourse === c.id
                  ? 'bg-[#a8f1e0] text-[#0c0c0c] shadow-sm'
                  : 'bg-[#181818] text-[#b7b7b5] border border-[#383838] hover:border-[#a8f1e0] hover:text-white'
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
          <TabsList className="bg-[#181818] p-1 rounded-[20px] border border-[#2e2e2e] inline-flex flex-nowrap min-w-max">
            <TabsTrigger
              value="lectures"
              className="rounded-[20px] text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2 text-[#b7b7b5] data-[state=active]:bg-[#a8f1e0] data-[state=active]:text-[#0c0c0c] data-[state=active]:shadow-sm transition-all"
            >
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Lectures ({filteredLectures.length})
            </TabsTrigger>
            <TabsTrigger
              value="materials"
              className="rounded-[20px] text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2 text-[#b7b7b5] data-[state=active]:bg-[#a8f1e0] data-[state=active]:text-[#0c0c0c] data-[state=active]:shadow-sm transition-all"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              PDF Notes ({filteredMaterials.length})
            </TabsTrigger>
            <TabsTrigger
              value="quizzes"
              className="rounded-[20px] text-xs font-bold uppercase tracking-wider px-4 sm:px-5 py-2 text-[#b7b7b5] data-[state=active]:bg-[#a8f1e0] data-[state=active]:text-[#0c0c0c] data-[state=active]:shadow-sm transition-all"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              Quizzes ({filteredQuizzes.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: LECTURES */}
        <TabsContent value="lectures" className="space-y-6">
          {Object.keys(groupedByCourse).length === 0 ? (
            <div className="bg-[#141414] rounded-[20px] border border-[#262626] p-16 text-center">
              <Video className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
              <p className="font-bold text-white">No lectures found</p>
              <p className="text-xs text-[#8e8e8e] mt-1">Try adjusting your batch filter or search query.</p>
            </div>
          ) : (
            Object.entries(groupedByCourse).map(([courseTitle, courseLectures]) => (
              <div key={courseTitle} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <BookOpen className="h-4 w-4 text-[#a8f1e0]" />
                  <h2 className="font-heading text-base font-extrabold text-white">
                    {courseTitle}
                  </h2>
                  <Badge
                    variant="secondary"
                    className="bg-[#1c1c1c] text-[#d4d4d4] border border-[#333] text-xs font-bold"
                  >
                    {courseLectures.length} lectures
                  </Badge>
                </div>

                <div className="space-y-2">
                  {courseLectures.map((lecture: any, idx: number) => (
                    <Link
                      key={lecture.id}
                      href={`/student/lectures/${lecture.id}`}
                      className="group block"
                    >
                      <div className="studio-card p-5 bg-[#141414] border border-[#262626] rounded-[20px] hover:border-[#a8f1e0]/60 transition-all flex items-center gap-4">
                        {/* Number Indicator */}
                        <div className="shrink-0 w-11 h-11 rounded-[16px] bg-[#1c1c1c] text-white flex items-center justify-center font-display font-bold text-sm sm:text-base border border-[#383838] group-hover:border-[#a8f1e0] group-hover:text-[#a8f1e0] transition-all">
                          {idx + 1}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[10px] font-bold text-[#a8f1e0] uppercase tracking-wider bg-[#1c1c1c] px-2.5 py-0.5 rounded-[20px] border border-[#333] font-condensed">
                              Lecture {idx + 1}
                            </span>
                            <Badge variant="stone" className="text-[10px] px-2 py-0.5 uppercase font-semibold">
                              {lecture.courses?.code}
                            </Badge>
                            {lecture.course_chapters?.title && (
                              <Badge variant="rust" className="text-[10px] px-2 py-0.5 uppercase font-semibold">
                                Chapter: {lecture.course_chapters.title}
                              </Badge>
                            )}
                          </div>
                          <p className="font-semibold text-white group-hover:text-[#a8f1e0] transition-colors truncate text-sm sm:text-base">
                            {lecture.title}
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="shrink-0 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-[20px] bg-[#1c1c1c] border border-[#383838] flex items-center justify-center text-[#a8f1e0] group-hover:bg-[#a8f1e0] group-hover:text-[#0c0c0c] transition-colors">
                            <Play className="h-3.5 w-3.5 ml-0.5 fill-current" />
                          </div>
                          <ChevronRight className="h-4 w-4 text-[#8e8e8e] group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </div>
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
            <div className="bg-[#141414] rounded-[20px] border border-[#262626] p-16 text-center">
              <FileText className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
              <p className="font-bold text-white">No Study Materials Uploaded Yet</p>
              <p className="text-xs text-[#8e8e8e] mt-1">
                Your teachers will upload formula sheets, notes PDFs, and reference materials here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-[#141414] rounded-[20px] p-5 border border-[#262626] hover:border-[#a8f1e0]/60 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-[16px] bg-[#1c1c1c] text-[#ffb956] border border-[#383838] flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 overflow-hidden flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <Badge className="bg-[#1c1c1c] text-[#d4d4d4] border border-[#333] text-[10px] px-2 py-0 font-bold">
                          {mat.courses?.code || 'BATCH'}
                        </Badge>
                        {mat.course_chapters?.title && (
                          <Badge variant="rust" className="text-[10px] px-2 py-0.5 font-bold">
                            Chapter: {mat.course_chapters.title}
                          </Badge>
                        )}
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                        {mat.title}
                      </h4>
                      <div className="text-[10px] font-semibold text-[#8e8e8e] uppercase">
                        Uploaded {new Date(mat.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <a
                    href={mat.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#0c0c0c] bg-[#a8f1e0] hover:bg-[#9ee4a0] py-2.5 rounded-[20px] transition-colors"
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
            <div className="bg-[#141414] rounded-[20px] border border-[#262626] p-16 text-center">
              <HelpCircle className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
              <p className="font-bold text-white">No Active Practice Quizzes</p>
              <p className="text-xs text-[#8e8e8e] mt-1">
                Faculty-published timed tests and MCQ series will be listed here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuizzes.map((quiz) => {
                const attemptsForQuiz = studentAttempts.filter((a) => a.quiz_id === quiz.id);
                const firstAttempt =
                  attemptsForQuiz.length > 0
                    ? attemptsForQuiz.find((a) => a.attempt_number === 1) ||
                      attemptsForQuiz[attemptsForQuiz.length - 1]
                    : null;

                return (
                  <Link key={quiz.id} href={`/student/quizzes/${quiz.id}`}>
                    <div
                      className="bg-[#141414] rounded-[20px] p-5 border border-[#262626] hover:border-[#a8f1e0]/60 transition-all flex flex-col justify-between space-y-4 h-full cursor-pointer group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="mint" className="font-bold text-xs">
                              {quiz.courses?.code}
                            </Badge>
                            {quiz.course_chapters?.title && (
                              <Badge variant="rust" className="font-bold text-[10px] px-2 py-0">
                                Chapter: {quiz.course_chapters.title}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-bold text-[#ffb956] flex items-center gap-1 shrink-0">
                            <Clock className="h-3.5 w-3.5 text-[#ffb956]" />
                            {quiz.time_limit_minutes || 30} mins
                          </span>
                        </div>

                        <h4 className="font-bold text-sm text-white group-hover:text-[#a8f1e0] transition-colors">{quiz.title}</h4>
                        <p className="text-xs text-[#b7b7b5] line-clamp-2">{quiz.description}</p>
                      </div>

                      <div className="pt-2 border-t border-[#262626] flex items-center justify-between">
                        <span className="text-xs font-bold text-[#d4d4d4]">
                          {quiz.questions_count} Questions • {quiz.total_marks} Marks
                        </span>
                        {firstAttempt ? (
                          <Badge variant="mint" className="font-bold text-[10px] px-2.5 py-1 rounded-[20px] flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Score: {firstAttempt.score}/{quiz.total_marks}</span>
                          </Badge>
                        ) : (
                          <Badge variant="sky" className="font-bold text-[10px] px-2.5 py-1 rounded-[20px]">
                            Active Test
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
