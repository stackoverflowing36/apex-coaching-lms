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
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
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
      if (coursesData.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesData[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load quizzes', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, supabase]);

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
      setIsSubmitting(true);
      await createQuizWithQuestions(
        supabase,
        {
          course_id: selectedCourseId,
          title: quizTitle.trim(),
          description: quizDescription.trim() || undefined,
          time_limit_minutes: Number(timeLimitMinutes) || 30,
        },
        questions
      );

      toast.success('MCQ Quiz published successfully!');
      setIsCreateOpen(false);
      setQuizTitle('');
      setQuizDescription('');
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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Quiz &amp; MCQ Engine
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Author mock tests, daily practice quizzes (DPP), set correct answer keys, and configure timed assessments.
          </p>
        </div>

        {/* Create Quiz Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10 px-5 shadow-lg shadow-orange-600/25">
              <Plus className="h-4 w-4 mr-1.5" />
              Create MCQ Quiz
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="font-heading font-extrabold text-xl text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-600" />
                Build Timed MCQ Quiz
              </DialogTitle>
              <p className="text-xs text-slate-500">
                Configure quiz parameters, add questions, set options, and specify the correct answer keys.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateQuiz} className="space-y-6 pt-4">
              
              {/* Batch & Quiz Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="batchSelect" className="text-xs font-bold text-slate-700">
                    Target Classroom Batch
                  </Label>
                  <select
                    id="batchSelect"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-medium focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="timeLimit" className="text-xs font-bold text-slate-700">
                    Time Limit (Minutes)
                  </Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="5"
                    max="180"
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="rounded-2xl h-11 text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qTitle" className="text-xs font-bold text-slate-700">
                  Quiz Title
                </Label>
                <Input
                  id="qTitle"
                  placeholder="e.g. Weekly Speed Mock #4: Electrostatics & Potential"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="rounded-2xl h-11 text-xs font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="qDesc" className="text-xs font-bold text-slate-700">
                  Instructions / Description
                </Label>
                <Textarea
                  id="qDesc"
                  placeholder="Instructions for students: +4 for correct, -1 for incorrect..."
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  className="rounded-2xl min-h-[60px] text-xs resize-none"
                />
              </div>

              {/* Dynamic Questions Builder */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>Question Bank</span>
                    <Badge className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0 border-0">
                      {questions.length} Questions
                    </Badge>
                  </h3>

                  <Button
                    type="button"
                    onClick={handleAddQuestion}
                    variant="outline"
                    size="sm"
                    className="rounded-full border-orange-300 text-orange-700 hover:bg-orange-50 text-xs font-bold h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Question
                  </Button>
                </div>

                <div className="space-y-4">
                  {questions.map((q, qIndex) => (
                    <div
                      key={qIndex}
                      className="p-4 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold">
                            {qIndex + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700">Question #{qIndex + 1}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-500">Marks:</span>
                            <Input
                              type="number"
                              min="1"
                              max="20"
                              value={q.marks}
                              onChange={(e) => handleMarksChange(qIndex, Number(e.target.value))}
                              className="w-14 h-7 rounded-lg text-xs text-center"
                            />
                          </div>

                          {questions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(qIndex)}
                              className="p-1 rounded-full text-slate-400 hover:text-red-600"
                              title="Remove question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <Textarea
                        placeholder="Enter the question problem statement..."
                        value={q.question_text}
                        onChange={(e) => handleQuestionTextChange(qIndex, e.target.value)}
                        className="rounded-2xl min-h-[60px] text-xs bg-white resize-none"
                        required
                      />

                      {/* Options List */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Options (Select the radio button for the correct answer)
                        </span>

                        <div className="space-y-2">
                          {q.options.map((opt, optIndex) => {
                            const isCorrect = q.correct_option_index === optIndex;
                            return (
                              <div
                                key={optIndex}
                                className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-50/80 border-emerald-300'
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`correct_opt_${qIndex}`}
                                  checked={isCorrect}
                                  onChange={() => handleSetCorrectOption(qIndex, optIndex)}
                                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer ml-1"
                                />

                                <span className="text-xs font-bold text-slate-400 w-4">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>

                                <Input
                                  value={opt}
                                  onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                                  placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                                  className="rounded-xl h-8 text-xs bg-transparent border-0 focus-visible:ring-0 px-1"
                                  required
                                />

                                {isCorrect && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0 border-0 flex-shrink-0">
                                    Correct Answer Key
                                  </Badge>
                                )}

                                {q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(qIndex, optIndex)}
                                    className="p-1 text-slate-300 hover:text-red-500"
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
                            className="text-[11px] font-bold text-orange-600 hover:underline pt-1 inline-flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Another Option
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-11 shadow-lg shadow-orange-600/25"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Quiz to Supabase...
                  </span>
                ) : (
                  `Publish Quiz (${questions.length} Questions)`
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Batch Filter Pill Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          onClick={() => setSelectedCourseFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
            selectedCourseFilter === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {course.code} ({count})
            </button>
          );
        })}
      </div>

      {/* Quizzes List */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading quizzes...</p>
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-4">
          <HelpCircle className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="font-heading font-extrabold text-lg text-slate-900">
            No Quizzes Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &quot;Create MCQ Quiz&quot; to author timed mock tests with automated answer keys.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 hover:border-orange-200 transition-all flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-xs px-2.5 py-0.5 rounded-full">
                    {quiz.courses?.code || 'BATCH'}
                  </Badge>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                    <Clock className="h-3.5 w-3.5 text-orange-600" />
                    <span>{quiz.time_limit_minutes || 30} mins</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-heading font-extrabold text-base sm:text-lg text-slate-900">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {quiz.description || 'Timed practice assessment with instant answer evaluation.'}
                  </p>
                </div>

                {/* Question and Marks Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                  <div className="p-2.5 rounded-2xl bg-slate-50">
                    <div className="font-extrabold text-base text-slate-900">
                      {quiz.questions_count || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Questions</div>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-50">
                    <div className="font-extrabold text-base text-emerald-600">
                      {quiz.total_marks || 0}
                    </div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Marks</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleOpenPreview(quiz.id)}
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-full border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold h-9"
                >
                  <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Preview Key
                </Button>

                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
        <DialogContent className="rounded-3xl p-6 sm:p-8 max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading font-extrabold text-xl text-slate-900">
              {previewQuiz?.title || 'Quiz Preview'}
            </DialogTitle>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{previewQuiz?.courses?.code}</span>
              <span>•</span>
              <span>{previewQuiz?.time_limit_minutes} minutes</span>
            </div>
          </DialogHeader>

          {loadingPreview ? (
            <div className="py-12 flex justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {previewQuiz?.quiz_questions?.map((q: any, idx: number) => (
                <div key={q.id || idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">
                      Q{idx + 1}. {q.question_text}
                    </span>
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0 border-0">
                      {q.marks} Mark{q.marks > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const isCorrect = q.correct_option_index === optIdx;
                      return (
                        <div
                          key={optIdx}
                          className={`p-2 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-bold opacity-60">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          <span>{opt}</span>
                          {isCorrect && <Check className="h-3.5 w-3.5 ml-auto text-emerald-600" />}
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
