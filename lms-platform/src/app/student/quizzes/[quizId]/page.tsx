'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Award, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getQuizWithQuestions,
  getQuizAttempts,
  submitQuizAttempt,
  QuizAttemptRecord,
  createNotification,
} from '@/lib/supabase/queries';
import { useUser } from '@/app/student/layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;
  const supabase = createClient();
  const user = useUser();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);

  // Past Attempts State
  const [attempts, setAttempts] = useState<QuizAttemptRecord[]>([]);
  const [officialScore, setOfficialScore] = useState<number | null>(null);
  const [latestAttemptScore, setLatestAttemptScore] = useState<number | null>(null);

  // Quiz taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;
      try {
        setLoading(true);
        const data = await getQuizWithQuestions(supabase, quizId);
        setQuiz(data);
        setQuestions(data?.quiz_questions || []);

        // Load student's past attempts once authenticated user ID is available
        if (user?.id) {
          const pastAttempts = await getQuizAttempts(supabase, quizId, user.id);
          setAttempts(pastAttempts);

          if (pastAttempts.length > 0) {
            // 1st attempt score is always the official recorded score
            const firstScore = pastAttempts[0].score;
            setOfficialScore(firstScore);
            setLatestAttemptScore(pastAttempts[pastAttempts.length - 1].score);
            setScore(firstScore);
            setIsSubmitted(true);
          }
        }
      } catch (err: any) {
        console.error('Error loading quiz:', err);
        toast.error('Failed to load quiz');
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId, user?.id, supabase]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedOptions((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const totalQuizMarks =
    quiz?.total_marks ||
    questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0);

  const handleSubmit = async () => {
    if (!confirm('Are you sure you want to submit your quiz?')) return;

    if (!user?.id) {
      toast.error('Authentication required', {
        description: 'Please sign in to submit your quiz attempt.',
      });
      return;
    }

    let calculatedScore = 0;
    questions.forEach((q) => {
      if (selectedOptions[q.id] === q.correct_option_index) {
        calculatedScore += q.marks || 1;
      }
    });

    try {
      setIsSubmittingAttempt(true);
      const studentId = user.id;
      const allowReattempt = quiz?.description?.includes('[REATTEMPT_ALLOWED]') ?? false;

      const result = await submitQuizAttempt(supabase, {
        quiz_id: quizId,
        student_id: studentId,
        score: calculatedScore,
        total_marks: totalQuizMarks,
        answers: selectedOptions,
        allow_reattempt: allowReattempt,
      });

      setOfficialScore(result.officialScore);
      setLatestAttemptScore(calculatedScore);
      setScore(result.officialScore);
      setAttempts((prev) => [...prev, result.attempt]);
      setIsSubmitted(true);

      if (result.isFirstAttempt) {
        toast.success('Quiz submitted and score saved!', {
          description: `Official recorded score: ${calculatedScore} / ${totalQuizMarks}`,
        });
      } else {
        toast.success('Practice attempt finished!', {
          description: `Score: ${calculatedScore} / ${totalQuizMarks}. Official score remains ${result.firstAttemptScore} / ${totalQuizMarks} (1st attempt).`,
        });
      }

      // Fire quiz_attempted notification
      try {
        await createNotification(supabase, {
          type: 'quiz_attempted',
          title: 'Quiz Attempt Submitted',
          message: `${user?.full_name || 'A student'} attempted the quiz "${quiz?.title}" and scored ${calculatedScore}/${totalQuizMarks}.`,
          data: {
            quiz_id: quizId,
            student_id: studentId,
            score: calculatedScore,
            total_marks: totalQuizMarks,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire quiz attempt notification:', notifErr);
      }
    } catch (err: any) {
      console.error('Failed to save quiz attempt:', err);
      toast.error('Failed to save quiz score', {
        description: err.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading quiz &amp; attempts...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center max-w-2xl mx-auto mt-10">
        <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="font-semibold text-slate-600 text-lg">Quiz not found</p>
        <Button
          variant="outline"
          className="mt-6 rounded-full"
          onClick={() => router.push('/student/lectures')}
        >
          Back to Quizzes
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const allAnswered =
    questions.length > 0 && questions.every((q) => selectedOptions[q.id] !== undefined);
  const allowReattempt = quiz.description?.includes('[REATTEMPT_ALLOWED]');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/student/lectures')}
          className="text-slate-500 hover:text-emerald-600 font-medium h-9 px-3 rounded-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lectures
        </Button>
        <div className="flex items-center gap-2">
          {allowReattempt && (
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-xs rounded-full">
              Multiple Attempts Allowed
            </Badge>
          )}
          <Badge className="bg-slate-900 text-white font-bold px-3 py-1 text-xs rounded-full">
            {quiz.courses?.code || 'PRACTICE'}
          </Badge>
        </div>
      </div>

      {!isSubmitted ? (
        <>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">
                {quiz.title}
              </h1>
              <p className="text-sm text-slate-500">{quiz.description}</p>
              {attempts.length > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold border border-amber-200">
                  <span>Re-attempting (Practice Mode)</span>
                  <span>•</span>
                  <span>Official score locked at {officialScore} / {totalQuizMarks}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Questions</span>
                <span className="font-heading font-bold text-lg text-slate-800">
                  {questions.length}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Marks</span>
                <span className="font-heading font-bold text-lg text-slate-800">
                  {totalQuizMarks}
                </span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col items-center px-4 text-orange-600">
                <span className="text-[10px] font-bold uppercase flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Time
                </span>
                <span className="font-heading font-bold text-lg">{quiz.time_limit_minutes}m</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmittingAttempt}
              variant="destructive"
              className="rounded-full px-6 h-10 text-xs font-bold shadow-md shadow-red-500/20"
            >
              {isSubmittingAttempt ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Submitting &amp; Saving Score...
                </>
              ) : (
                'End Attempt & Submit'
              )}
            </Button>
          </div>

          {questions.length > 0 ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-heading font-bold text-lg text-slate-800">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <Badge className="bg-emerald-50 text-emerald-700 font-bold">
                  {currentQuestion.marks || 1} Marks
                </Badge>
              </div>

              <div className="space-y-6">
                <p className="text-lg font-medium text-slate-900">
                  {currentQuestion.question_text}
                </p>

                <div className="space-y-3">
                  {currentQuestion.options.map((option: string, idx: number) => {
                    const isSelected = selectedOptions[currentQuestion.id] === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(currentQuestion.id, idx)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        } flex items-center gap-3`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-emerald-500' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'
                          }`}
                        >
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100 mt-8">
                <Button
                  variant="outline"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="rounded-full px-6 h-11 text-xs font-bold"
                >
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmittingAttempt}
                    className={`rounded-full px-8 h-11 text-xs font-bold shadow-lg transition-all ${
                      allAnswered
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    {isSubmittingAttempt ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        Saving Score...
                      </>
                    ) : (
                      'Submit Quiz'
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-8 h-11 text-xs font-bold"
                  >
                    Next Question
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-16 text-center shadow-xl border border-slate-100">
              <p className="text-slate-500">No questions found for this quiz.</p>
            </div>
          )}
        </>
      ) : (
        /* RESULTS VIEW */
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-100 text-center space-y-8 max-w-2xl mx-auto">
          <div className="space-y-4">
            <div className="w-24 h-24 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-12 w-12" />
            </div>
            <h2 className="font-heading font-extrabold text-3xl text-slate-900">
              Quiz Completed!
            </h2>
            <p className="text-slate-500">
              You have completed the quiz for{' '}
              <span className="font-bold text-slate-700">{quiz.title}</span>. Your score has been saved.
            </p>
          </div>

          {/* Score Display Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {/* Official 1st Attempt Score */}
            <div className="bg-emerald-50/80 rounded-3xl p-6 border border-emerald-200 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 uppercase tracking-wider mb-2">
                <Award className="h-4 w-4 text-emerald-600" />
                <span>Official Score (1st Attempt)</span>
              </div>
              <div className="font-heading font-extrabold text-4xl text-emerald-700">
                {officialScore ?? score}{' '}
                <span className="text-xl text-emerald-500">/ {totalQuizMarks}</span>
              </div>
              <div className="text-[11px] text-emerald-600 mt-2 font-medium">
                {Math.round(((officialScore ?? score) / totalQuizMarks) * 100)}% Grade Saved
              </div>
            </div>

            {/* Total Attempts / Practice info */}
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 flex flex-col items-center justify-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                {attempts.length > 1 ? 'Latest Attempt' : 'Attempt Count'}
              </div>
              <div className="font-heading font-extrabold text-4xl text-slate-800">
                {attempts.length > 1 && latestAttemptScore !== null ? (
                  <>
                    {latestAttemptScore}{' '}
                    <span className="text-xl text-slate-400">/ {totalQuizMarks}</span>
                  </>
                ) : (
                  <>
                    {Math.max(1, attempts.length)}{' '}
                    <span className="text-xl text-slate-400">attempt</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-2 font-medium">
                {attempts.length > 1 ? `Total attempts: ${attempts.length}` : 'First attempt locked as score'}
              </div>
            </div>
          </div>

          {allowReattempt && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed max-w-lg mx-auto">
              ℹ️ <strong>Multiple attempts enabled:</strong> You can re-take this quiz for further practice. Per grading policy, your <strong>1st attempt score ({officialScore ?? score}/{totalQuizMarks})</strong> is strictly preserved as your permanent grade.
            </div>
          )}

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push('/student/lectures')}
              className="rounded-full bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 font-bold w-full sm:w-auto"
            >
              Return to Course
            </Button>
            {allowReattempt && (
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setSelectedOptions({});
                  setCurrentQuestionIndex(0);
                }}
                variant="outline"
                className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 h-12 px-8 font-bold w-full sm:w-auto flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4 text-slate-500" />
                <span>Re-attempt Quiz (Practice)</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
