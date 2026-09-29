'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  Clock,
  Award,
  CheckCircle2,
  BookOpen,
  Layers,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  getQuizzes,
  createQuizWithQuestions,
  deleteQuiz,
  getQuizWithQuestions,
  createNotification,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QuestionRichEditor } from '@/components/quiz/QuestionRichEditor';
import { FormattedQuestionText } from '@/components/quiz/FormattedQuestionText';
import { ChapterSelect } from '@/components/chapters/ChapterSelect';

export const dynamic = 'force-dynamic';

interface QuestionDraft {
  question_text: string;
  options: string[];
  correct_option_index: number;
  marks: number;
}

export default function TeacherQuizEnginePage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Quiz Creator Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [quizChapterId, setQuizChapterId] = useState<string | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [allowReattempt, setAllowReattempt] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      question_text: '',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correct_option_index: 0,
      marks: 1,
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quiz Preview Dialog State
  const [previewQuiz, setPreviewQuiz] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesData, quizzesData] = await Promise.all([
        getCourses(supabase),
        getQuizzes(supabase),
      ]);

      setCourses(coursesData);
      setQuizzes(quizzesData);
      if (coursesData.length > 0) {
        setSelectedCourseId((prev) => prev || coursesData[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load quizzes', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Question manipulation helpers
  const handleAddQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        question_text: '',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correct_option_index: 0,
        marks: 1,
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length === 1) {
      toast.error('A quiz must have at least 1 question');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[index].question_text = text;
      return next;
    });
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].options[optIndex] = text;
      return next;
    });
  };

  const handleAddOption = (qIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].options.push(`Option ${String.fromCharCode(65 + next[qIndex].options.length)}`);
      return next;
    });
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      if (next[qIndex].options.length <= 2) {
        toast.error('A multiple-choice question requires at least 2 options');
        return next;
      }
      next[qIndex].options.splice(optIndex, 1);
      if (next[qIndex].correct_option_index >= next[qIndex].options.length) {
        next[qIndex].correct_option_index = 0;
      }
      return next;
    });
  };

  const handleSetCorrectOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].correct_option_index = optIndex;
      return next;
    });
  };

  const handleMarksChange = (qIndex: number, marks: number) => {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex].marks = marks > 0 ? marks : 1;
      return next;
    });
  };

  // Submit Quiz Creation
  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle.trim()) {
      toast.error('Please specify a quiz title');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Please select a target batch');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].question_text.trim()) {
        toast.error(`Question #${i + 1} text cannot be empty`);
        return;
      }
      for (let j = 0; j < questions[i].options.length; j++) {
        if (!questions[i].options[j].trim()) {
          toast.error(`Option ${j + 1} in Question #${i + 1} is empty`);
          return;
        }
      }
    }

    try {
      const finalDescription = (quizDescription.trim() + (allowReattempt ? ' \n[REATTEMPT_ALLOWED]' : '')).trim();
      
      setIsSubmitting(true);
      const newQuiz = await createQuizWithQuestions(
        supabase,
        {
          course_id: selectedCourseId,
          title: quizTitle.trim(),
          description: finalDescription || undefined,
          time_limit_minutes: Number(timeLimitMinutes) || 30,
          chapter_id: quizChapterId,
        },
        questions
      );

      // Fire quiz_created notification
      try {
        const course = courses.find(c => c.id === selectedCourseId);
        await createNotification(supabase, {
          type: 'quiz_created',
          title: 'New Quiz Published',
          message: `A new quiz "${quizTitle.trim()}" has been published in ${course?.title || 'a batch'}.`,
          data: {
            quiz_id: newQuiz.id,
            course_id: selectedCourseId,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire quiz notification:', notifErr);
      }

      toast.success('MCQ Quiz published successfully!');
      setIsCreateOpen(false);
      setQuizTitle('');
      setQuizDescription('');
      setQuizChapterId(null);
      setAllowReattempt(false);
      setTimeLimitMinutes(30);
      setQuestions([
        {
          question_text: '',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correct_option_index: 0,
          marks: 1,
        },
      ]);
      loadData();
    } catch (err: any) {
      toast.error('Failed to create quiz', { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Quiz
  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz and its question bank?')) return;
    try {
      await deleteQuiz(supabase, quizId);
      toast.success('Quiz deleted');
      loadData();
    } catch (err: any) {
      toast.error('Failed to delete quiz', { description: err.message });
    }
  };

  // Open Preview
  const handleOpenPreview = async (quizId: string) => {
    try {
      setLoadingPreview(true);
      setIsPreviewOpen(true);
      const data = await getQuizWithQuestions(supabase, quizId);
      setPreviewQuiz(data);
    } catch (err: any) {
      toast.error('Could not load quiz preview', { description: err.message });
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredQuizzes =
    selectedCourseFilter === 'all'
      ? quizzes
      : quizzes.filter((q) => q.course_id === selectedCourseFilter);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[12px] bg-stone-100 border border-stone-200 text-[#a05120] flex items-center justify-center">
              <HelpCircle className="h-4 w-4" />
            </div>
            <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-[#111111] tracking-tight">
              Quiz &amp; MCQ Engine
            </h1>
          </div>
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-stone-500">
            Author mock tests, daily practice quizzes (DPP), set correct answer keys, and configure timed assessments.
          </p>
        </div>

        {/* Create Quiz Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-studio flex items-center gap-2 shadow-md transition-all">
              <Plus className="h-4 w-4 text-[#111111]" />
              Create MCQ Quiz
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-studio p-6 sm:p-8 max-w-2xl max-h-[90vh] overflow-y-auto bg-white border border-stone-300 text-[#111111] shadow-xl">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-heading font-extrabold text-xl text-[#111111] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#a05120]" />
                Build Timed MCQ Quiz
              </DialogTitle>
              <p className="text-xs text-stone-400">
                Configure quiz parameters, add questions, set options, and specify the correct answer keys.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateQuiz} className="space-y-6 pt-4">
              
              {/* Batch & Quiz Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="batchSelect" className="text-xs font-bold text-rose-700">
                    Target Classroom Batch
                  </Label>
                  <select
                    id="batchSelect"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full h-11 bg-stone-50 text-[#111111] placeholder:text-stone-400 border border-stone-300 focus:border-[#a05120] focus:outline-none rounded-studio px-3.5 text-xs font-medium"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id} className="bg-stone-50 text-[#111111]">
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timeLimit" className="text-xs font-bold text-rose-700">
                    Time Limit (Minutes)
                  </Label>
                  <input
                    id="timeLimit"
                    type="number"
                    min="5"
                    max="180"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="w-full h-11 bg-stone-50 text-[#111111] placeholder:text-stone-400 border border-stone-300 focus:border-[#a05120] focus:outline-none rounded-studio px-3.5 text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="qTitle" className="text-xs font-bold text-rose-700">
                    Quiz Title
                  </Label>
                  <input
                    id="qTitle"
                    placeholder="e.g. Weekly Speed Mock #4: Electrostatics & Potential"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    className="w-full h-11 bg-stone-50 text-[#111111] placeholder:text-stone-400 border border-stone-300 focus:border-[#a05120] focus:outline-none rounded-studio px-3.5 text-xs font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-rose-700">
                    Chapter / Module
                  </Label>
                  {selectedCourseId ? (
                    <ChapterSelect
                      supabase={supabase}
                      courseId={selectedCourseId}
                      value={quizChapterId}
                      onChange={setQuizChapterId}
                    />
                  ) : (
                    <div className="h-11 border border-stone-300 rounded-studio bg-stone-50 flex items-center px-3.5 text-xs text-stone-400">
                      Select a batch first...
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qDesc" className="text-xs font-bold text-rose-700">
                  Instructions / Description
                </Label>
                <textarea
                  id="qDesc"
                  placeholder="Instructions for students: +4 for correct, -1 for incorrect..."
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  className="w-full bg-stone-50 text-[#111111] placeholder:text-stone-400 border border-stone-300 focus:border-[#a05120] focus:outline-none rounded-studio p-3 text-xs min-h-[60px] resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allowReattempt"
                  checked={allowReattempt}
                  onChange={(e) => setAllowReattempt(e.target.checked)}
                  className="w-4 h-4 rounded border-stone-300 bg-stone-50 text-[#a05120] focus:ring-[#a05120] cursor-pointer"
                />
                <Label htmlFor="allowReattempt" className="text-xs font-bold text-[#111111] cursor-pointer">
                  Allow students to re-attempt this quiz multiple times
                </Label>
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-4 pt-3 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-extrabold text-sm text-[#111111] flex items-center gap-2">
                    <span>Question Bank</span>
                    <span className="bg-stone-100 text-[#a05120] border border-stone-300 text-[10px] px-2 py-0.5 rounded-studio font-bold">
                      {questions.length} Questions
                    </span>
                  </h3>

                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="border border-stone-300 bg-stone-100 text-[#111111] hover:border-[#a05120] hover:text-[#a05120] rounded-studio px-4 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      className="p-4 rounded-studio bg-stone-50 border border-stone-200 space-y-3"
                    >
                      {/* Rich Question Editor */}
                      <QuestionRichEditor
                        value={q.question_text}
                        onChange={(text) => handleQuestionTextChange(qIndex, text)}
                        qIndex={qIndex}
                        marks={q.marks}
                        onMarksChange={(marks) => handleMarksChange(qIndex, marks)}
                        onRemoveQuestion={() => handleRemoveQuestion(qIndex)}
                        canRemove={questions.length > 1}
                        supabase={supabase}
                      />

                      {/* Options List */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                          Options (Select the radio button for the correct answer)
                        </span>

                        <div className="space-y-2">
                          {q.options.map((opt, optIndex) => {
                            const isCorrect = q.correct_option_index === optIndex;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 p-2 rounded-[16px] border transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-[#a8f1e0]'
                                    : 'bg-white border-stone-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`correct_opt_${qIndex}`}
                                  checked={isCorrect}
                                  onChange={() => handleSetCorrectOption(qIndex, optIndex)}
                                  className="h-4 w-4 text-[#a05120] focus:ring-[#a05120] cursor-pointer ml-1"
                                />

                                <span className="text-xs font-bold text-stone-500 w-4">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>

                                <input
                                  value={opt}
                                  onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  className="rounded-[12px] h-8 text-xs bg-transparent text-[#111111] placeholder:text-stone-400 border-0 focus:outline-none flex-1 px-1"
                                  required
                                />

                                {isCorrect && (
                                  <span className="bg-[#a8f1e0] text-[#111111] text-[10px] font-bold px-2 py-0.5 rounded-studio flex-shrink-0">
                                    Correct Answer
                                  </span>
                                )}

                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(qIndex, optIndex)}
                                    className="p-1 text-stone-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(qIndex)}
                            className="border border-stone-300 bg-stone-100 text-[#111111] hover:border-[#a05120] hover:text-[#a05120] text-[11px] font-bold px-3 py-1.5 rounded-studio inline-flex items-center gap-1 transition-colors mt-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Option
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] font-bold text-xs h-12 shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#111111]" />
                    Saving Quiz to Supabase...
                  </span>
                ) : (
                  `Publish Quiz (${questions.length} Questions)`
                )}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batch Filter Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          onClick={() => setSelectedCourseFilter('all')}
          className={`px-4 py-2 rounded-studio text-xs font-semibold uppercase tracking-wider transition-all ${
            selectedCourseFilter === 'all'
              ? 'bg-[#a8f1e0] text-[#111111] font-bold shadow-md'
              : 'bg-stone-50 text-stone-500 hover:text-[#111111] hover:border-[#a05120] border border-stone-200'
          }`}
        >
          All Batches ({quizzes.length})
        </button>

        {courses.map((course) => {
          const count = quizzes.filter((q) => q.course_id === course.id).length;
          const isSelected = selectedCourseFilter === course.id;
          return (
            <button
              key={course.id}
              onClick={() => setSelectedCourseFilter(course.id)}
              className={`px-4 py-2 rounded-studio text-xs font-semibold uppercase tracking-wider transition-all ${
                isSelected
                  ? 'bg-[#a8f1e0] text-[#111111] font-bold shadow-md'
                  : 'bg-stone-50 text-stone-500 hover:text-[#111111] hover:border-[#a05120] border border-stone-200'
              }`}
            >
              {course.code} ({count})
            </button>
          );
        })}
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-stone-400 gap-3">
          <div className="w-10 h-10 border-2 border-stone-200 border-t-[#a8f1e0] rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed">Loading quizzes...</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-studio p-12 text-center space-y-4 shadow-xl">
          <HelpCircle className="h-12 w-12 text-stone-400 mx-auto" />
          <h3 className="font-display font-bold uppercase text-lg text-[#111111] tracking-tight">
            No Quizzes Found
          </h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            Click &quot;Create MCQ Quiz&quot; to author timed mock tests with automated answer keys.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white border border-stone-200 hover:border-stone-300 rounded-studio p-6 transition-all flex flex-col justify-between space-y-5 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="bg-stone-100 text-[#a05120] border border-stone-300 font-semibold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-studio">
                    {quiz.courses?.code || 'BATCH'}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 font-condensed font-semibold">
                    <Clock className="h-3.5 w-3.5 text-[#a05120]" />
                    <span>{quiz.time_limit_minutes || 30} mins</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-display font-bold uppercase text-base sm:text-lg text-[#111111] flex flex-wrap items-center gap-2 tracking-tight">
                    {quiz.title}
                    {quiz.course_chapters?.title && (
                      <span className="bg-[#ffb956] text-[#111111] text-[10px] px-2 py-0.5 font-bold uppercase rounded-studio">
                        {quiz.course_chapters.title}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                    {quiz.description || 'Timed practice assessment with instant answer evaluation.'}
                  </p>
                </div>

                {/* Question and Marks Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                  <div className="p-3 rounded-[16px] bg-stone-50 border border-stone-200">
                    <div className="font-display font-bold uppercase text-xl text-[#111111]">
                      {quiz.questions_count || 0}
                    </div>
                    <div className="text-[10px] text-stone-400 font-condensed uppercase tracking-wider font-semibold">Questions</div>
                  </div>

                  <div className="p-3 rounded-[16px] bg-stone-50 border border-stone-200">
                    <div className="font-display font-bold uppercase text-xl text-[#a05120]">
                      {quiz.total_marks || 0}
                    </div>
                    <div className="text-[10px] text-stone-400 font-condensed uppercase tracking-wider font-semibold">Total Marks</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenPreview(quiz.id)}
                  className="bg-stone-100 hover:bg-stone-100 text-[#111111] border border-stone-300 hover:border-[#a05120] text-xs font-semibold uppercase tracking-wider py-2.5 px-4 rounded-studio flex-1 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Eye className="h-3.5 w-3.5 text-[#a05120]" />
                  Preview Key
                </button>

                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="p-2.5 rounded-full text-stone-400 hover:text-red-600 hover:bg-stone-100 transition-colors"
                  title="Delete Quiz"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quiz Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="rounded-studio p-6 sm:p-8 max-w-2xl max-h-[85vh] overflow-y-auto bg-white border border-stone-300 text-[#111111] shadow-xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading font-extrabold text-xl text-[#111111]">
              {previewQuiz?.title || 'Quiz Preview'}
            </DialogTitle>
            <div className="flex items-center gap-3 text-xs text-stone-400">
              <span className="text-[#a05120] font-semibold">{previewQuiz?.courses?.code}</span>
              <span>•</span>
              <span>{previewQuiz?.time_limit_minutes} minutes</span>
            </div>
          </DialogHeader>

          {loadingPreview ? (
            <div className="py-12 flex justify-center text-stone-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#a05120]" />
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {previewQuiz?.quiz_questions?.map((q: any, idx: number) => (
                <div key={q.id || idx} className="p-4 rounded-studio bg-stone-50 border border-stone-200 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#a05120]">
                        Question #{idx + 1}
                      </span>
                      <FormattedQuestionText
                        text={q.question_text}
                        textClassName="text-sm font-semibold text-[#111111] leading-relaxed"
                      />
                    </div>
                    <span className="bg-stone-100 text-[#a05120] border border-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-studio shrink-0">
                      {q.marks} Mark{q.marks > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const isCorrect = q.correct_option_index === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-[14px] text-xs font-medium border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-50 border-[#a8f1e0] text-[#a05120] font-bold'
                              : 'bg-white border-stone-300 text-stone-600'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-70">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isCorrect && <Check className="h-3.5 w-3.5 text-[#a05120]" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
