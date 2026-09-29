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
import { FormattedQuestionText } from '@/components/quiz/FormattedQuestionText';

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
      <div className="py-24 flex flex-col items-center justify-center text-stone-400 gap-3">
        <div className="w-10 h-10 border-2 border-stone-200 border-t-[#a8f1e0] rounded-full animate-spin" />
        <p className="text-xs uppercase tracking-wider font-semibold font-condensed">Loading quiz &amp; attempts...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="studio-card p-16 text-center max-w-2xl mx-auto mt-10 space-y-4 bg-white border border-stone-200 rounded-studio">
        <AlertCircle className="h-12 w-12 text-stone-400 mx-auto" />
        <p className="font-display font-bold uppercase text-lg text-[#111111]">Quiz not found</p>
        <Button
          variant="outline"
          className="rounded-studio font-condensed uppercase tracking-wider text-xs border-stone-300 bg-stone-50 text-[#111111] hover:bg-stone-100"
          onClick={() => router.push('/student/lectures')}
        >
          Back to Vault
        </Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const allowReattempt = quiz.description?.includes('[REATTEMPT_ALLOWED]');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => router.push('/student/lectures')}
          className="text-stone-500 hover:text-[#111111] font-condensed uppercase tracking-wider text-xs h-9 px-4 rounded-studio border border-stone-300 bg-stone-50"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-2" />
          Back to Lectures
        </Button>
        <div className="flex items-center gap-2 flex-wrap">
          {allowReattempt && (
            <Badge className="bg-stone-100 text-[#a05120] border border-stone-300 font-condensed uppercase tracking-wider font-bold text-[10px] rounded-studio">
              Multiple Attempts Allowed
            </Badge>
          )}
          {quiz.course_chapters?.title && (
            <Badge variant="rust" className="font-condensed uppercase tracking-wider font-bold text-[10px] rounded-studio">
              Chapter: {quiz.course_chapters.title}
            </Badge>
          )}
          <Badge variant="mint" className="font-condensed uppercase tracking-wider font-bold px-3 py-1 text-[10px] rounded-studio">
            {quiz.courses?.code || 'PRACTICE'}
          </Badge>
        </div>
      </div>

      {!isSubmitted ? (
        <>
          <div className="studio-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white border border-stone-200 rounded-studio">
            <div>
              {quiz.course_chapters?.title && (
                <div className="mb-2">
                  <Badge variant="rust" className="font-condensed uppercase tracking-wider font-bold text-[10px]">
                    Chapter: {quiz.course_chapters.title}
                  </Badge>
                </div>
              )}
              <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-[#111111] mb-2 tracking-tight">
                {quiz.title}
              </h1>
              <p className="text-xs uppercase tracking-wider font-condensed text-stone-500">{quiz.description}</p>
              {attempts.length > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-studio bg-stone-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider font-condensed border border-stone-300">
                  <span>Re-attempting (Practice Mode)</span>
                  <span>•</span>
                  <span>Official score locked at {officialScore} / {totalQuizMarks}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 bg-stone-50 p-3 rounded-studio border border-stone-300">
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-condensed">Questions</span>
                <span className="font-display font-bold uppercase text-xl text-[#111111]">
                  {questions.length}
                </span>
              </div>
              <div className="w-px h-8 bg-[#383838]"></div>
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-condensed">Total Marks</span>
                <span className="font-display font-bold uppercase text-xl text-[#111111]">
                  {totalQuizMarks}
                </span>
              </div>
              <div className="w-px h-8 bg-[#383838]"></div>
              <div className="flex flex-col items-center px-4 text-amber-700">
                <span className="text-[10px] font-bold uppercase tracking-wider font-condensed flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Time
                </span>
                <span className="font-display font-bold uppercase text-xl">{quiz.time_limit_minutes}m</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmittingAttempt}
              className="rounded-studio px-6 h-10 text-xs font-bold font-condensed uppercase tracking-wider bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] shadow-sm"
            >
              {isSubmittingAttempt ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  Submitting Score...
                </>
              ) : (
                'End Attempt & Submit'
              )}
            </Button>
          </div>

          {questions.length > 0 ? (
            <div className="studio-card p-6 sm:p-8 space-y-6 bg-white border border-stone-200 rounded-studio">
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <h2 className="font-display font-bold uppercase text-base text-[#111111] tracking-tight">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <Badge variant="mint" className="font-condensed uppercase tracking-wider font-bold">
                  {currentQuestion.marks || 1} Marks
                </Badge>
              </div>

              <div className="space-y-6">
                <FormattedQuestionText
                  text={currentQuestion.question_text}
                  textClassName="text-base font-medium text-[#111111] leading-relaxed"
                />

                <div className="space-y-3">
                  {currentQuestion.options.map((option: string, idx: number) => {
                    const isSelected = selectedOptions[currentQuestion.id] === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(currentQuestion.id, idx)}
                        className={`p-4 rounded-studio border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#a05120] bg-amber-50/60 shadow-sm'
                            : 'border-stone-300 bg-stone-50 hover:border-[#a05120]/60'
                        } flex items-center gap-3`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-[#a05120]' : 'border-stone-400'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#a05120]" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            isSelected ? 'font-bold text-[#111111]' : 'text-stone-700'
                          }`}
                        >
                          {option}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-stone-200 mt-8">
                <Button
                  variant="outline"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="rounded-studio px-6 h-10 text-xs font-bold font-condensed uppercase tracking-wider border-stone-300 bg-stone-50 text-[#111111] hover:bg-stone-100"
                >
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmittingAttempt}
                    className="rounded-studio px-8 h-10 text-xs font-bold font-condensed uppercase tracking-wider bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] shadow-sm"
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
                    className="rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] px-8 h-10 text-xs font-bold font-condensed uppercase tracking-wider"
                  >
                    Next Question
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="studio-card p-16 text-center bg-white border border-stone-200 rounded-studio">
              <p className="text-xs uppercase tracking-wider font-condensed text-stone-400">No questions found for this quiz.</p>
            </div>
          )}
        </>
      ) : (
        /* RESULTS VIEW */
        <div className="studio-card p-8 sm:p-12 text-center space-y-8 max-w-2xl mx-auto bg-white border border-stone-200 rounded-studio">
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-studio bg-stone-100 text-[#a05120] flex items-center justify-center mx-auto mb-4 border border-stone-300">
              <CheckCircle2 className="h-10 w-10 text-[#a05120]" />
            </div>
            <h2 className="font-display font-bold uppercase text-3xl text-[#111111] tracking-tight">
              Quiz Completed!
            </h2>
            <p className="text-xs uppercase tracking-wider font-condensed text-stone-500">
              You have completed the quiz for{' '}
              <span className="font-bold text-[#111111]">{quiz.title}</span>. Your score has been saved.
            </p>
          </div>

          {/* Score Display Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {/* Official 1st Attempt Score */}
            <div className="bg-stone-50 rounded-studio p-6 border border-stone-300 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#a05120] uppercase tracking-wider font-condensed mb-2">
                <Award className="h-4 w-4 text-[#a05120]" />
                <span>Official Score (1st Attempt)</span>
              </div>
              <div className="font-display font-bold uppercase text-4xl text-[#111111]">
                {officialScore ?? score}{' '}
                <span className="text-xl text-stone-400">/ {totalQuizMarks}</span>
              </div>
              <div className="text-[11px] text-stone-500 mt-2 font-condensed font-semibold uppercase tracking-wider">
                {Math.round(((officialScore ?? score) / totalQuizMarks) * 100)}% Grade Saved
              </div>
            </div>

            {/* Total Attempts / Practice info */}
            <div className="bg-stone-50 rounded-studio p-6 border border-stone-300 flex flex-col items-center justify-center">
              <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-condensed mb-2">
                {attempts.length > 1 ? 'Latest Attempt' : 'Attempt Count'}
              </div>
              <div className="font-display font-bold uppercase text-4xl text-[#111111]">
                {attempts.length > 1 && latestAttemptScore !== null ? (
                  <>
                    {latestAttemptScore}{' '}
                    <span className="text-xl text-stone-400">/ {totalQuizMarks}</span>
                  </>
                ) : (
                  <>
                    {Math.max(1, attempts.length)}{' '}
                    <span className="text-xl text-stone-400">attempt</span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-stone-400 mt-2 font-condensed font-semibold uppercase tracking-wider">
                {attempts.length > 1 ? `Total attempts: ${attempts.length}` : 'First attempt locked as score'}
              </div>
            </div>
          </div>

          {allowReattempt && (
            <div className="p-4 rounded-studio bg-stone-100 border border-stone-300 text-xs text-stone-500 leading-relaxed max-w-lg mx-auto">
              ℹ️ <strong className="text-[#111111]">Multiple attempts enabled:</strong> You can re-take this quiz for further practice. Per grading policy, your <strong className="text-[#a05120]">1st attempt score ({officialScore ?? score}/{totalQuizMarks})</strong> is strictly preserved as your permanent grade.
            </div>
          )}

          <div className="pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push('/student/lectures')}
              className="rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] h-11 px-8 font-condensed font-bold uppercase tracking-wider text-xs w-full sm:w-auto"
            >
              Return to Vault
            </Button>
            {allowReattempt && (
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setSelectedOptions({});
                  setCurrentQuestionIndex(0);
                }}
                variant="outline"
                className="rounded-studio border-stone-300 bg-stone-50 text-[#111111] hover:border-[#a05120] hover:text-[#a05120] h-11 px-8 font-condensed font-bold uppercase tracking-wider text-xs w-full sm:w-auto flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4 text-stone-400" />
                <span>Re-attempt Quiz (Practice)</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
