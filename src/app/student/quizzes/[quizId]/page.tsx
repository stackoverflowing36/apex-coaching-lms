'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getQuizWithQuestions } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params?.quizId as string;
  const supabase = createClient();

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
        setQuestions(data.quiz_questions || []);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId, supabase]);

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmit = () => {
    if (!confirm('Are you sure you want to submit your quiz?')) return;
    
    let calculatedScore = 0;
    questions.forEach((q) => {
      if (selectedOptions[q.id] === q.correct_option_index) {
        calculatedScore += q.marks || 1;
      }
    });
    
    setScore(calculatedScore);
    setIsSubmitted(true);
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading quiz...</p>
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
  const allAnswered = questions.length > 0 && questions.every(q => selectedOptions[q.id] !== undefined);

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
        <Badge className="bg-slate-900 text-white font-bold px-3 py-1 text-xs rounded-full">
          {quiz.courses?.code || 'PRACTICE'}
        </Badge>
      </div>

      {!isSubmitted ? (
        <>
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-slate-900 mb-2">
                {quiz.title}
              </h1>
              <p className="text-sm text-slate-500">{quiz.description}</p>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Questions</span>
                <span className="font-heading font-bold text-lg text-slate-800">{questions.length}</span>
              </div>
              <div className="w-px h-8 bg-slate-200"></div>
              <div className="flex flex-col items-center px-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Marks</span>
                <span className="font-heading font-bold text-lg text-slate-800">{quiz.total_marks}</span>
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
              variant="destructive"
              className="rounded-full px-6 h-10 text-xs font-bold shadow-md shadow-red-500/20"
            >
              End Attempt & Submit
            </Button>
          </div>

          {questions.length > 0 ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="font-heading font-bold text-lg text-slate-800">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <Badge className="bg-emerald-50 text-emerald-700 font-bold">
                  {currentQuestion.marks} Marks
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
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-emerald-500' : 'border-slate-300'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />}
                        </div>
                        <span className={`text-sm ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
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
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="rounded-full px-6 h-11 text-xs font-bold"
                >
                  Previous
                </Button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <Button
                    onClick={handleSubmit}
                    className={`rounded-full px-8 h-11 text-xs font-bold shadow-lg transition-all ${
                      allAnswered 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    }`}
                  >
                    Submit Quiz
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
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
              You have successfully completed the practice quiz for <span className="font-bold text-slate-700">{quiz.title}</span>.
            </p>
          </div>

          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200 inline-block min-w-[200px]">
            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Your Score</div>
            <div className="font-heading font-extrabold text-5xl text-emerald-600">
              {score} <span className="text-2xl text-slate-400">/ {quiz.total_marks}</span>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => router.push('/student/lectures')}
              className="rounded-full bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 font-bold w-full sm:w-auto"
            >
              Return to Course
            </Button>
            {quiz.description?.includes('[REATTEMPT_ALLOWED]') && (
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  setScore(0);
                  setSelectedOptions({});
                  setCurrentQuestionIndex(0);
                }}
                variant="outline"
                className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 h-12 px-8 font-bold w-full sm:w-auto"
              >
                Re-attempt Quiz
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
