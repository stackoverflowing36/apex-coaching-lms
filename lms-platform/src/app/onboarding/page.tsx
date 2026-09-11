'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, GraduationCap, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getCourses, createNotification, getCurrentUser } from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesData, user] = await Promise.all([
        getCourses(supabase),
        getCurrentUser(supabase)
      ]);
      setCourses(coursesData);
      setUserProfile(user);

      // If user is not student or somehow already properly onboarded, redirect
      if (user && user.role !== 'student') {
        router.replace('/teacher/dashboard');
      }
    } catch (err: any) {
      toast.error('Failed to load batches', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async () => {
    if (!selectedBatch || !userProfile) return;

    try {
      setIsEnrolling(true);
      const course = courses.find((c) => c.id === selectedBatch);

      // Update user's batch in the database
      const { error } = await supabase
        .from('users')
        .update({ batch_name: course?.title })
        .eq('id', userProfile.id);

      if (error) throw error;

      // Fire notification for faculty
      try {
        await createNotification(supabase, {
          type: 'batch_enrolled',
          title: 'Student Enrolled in Batch',
          message: `${userProfile.full_name} has enrolled in ${course?.title || 'a batch'}.`,
          data: {
            student_id: userProfile.id,
            student_name: userProfile.full_name,
            course_id: course?.id,
            batch_name: course?.title,
          }
        });
      } catch (notifErr) {
        console.warn('Failed to fire batch enrollment notification:', notifErr);
      }

      toast.success(`Successfully enrolled in ${course?.title}!`);
      router.push('/student/dashboard');
    } catch (err: any) {
      toast.error('Enrollment failed', { description: err.message });
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading available batches...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-500">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-500 p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <GraduationCap className="w-48 h-48 text-white rotate-12" />
          </div>
          <div className="relative z-10 space-y-3 text-white">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30">
              <Layers className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl">
              Choose Your Batch
            </h1>
            <p className="text-orange-50 font-medium text-sm sm:text-base max-w-md mx-auto">
              Welcome aboard, {userProfile?.full_name?.split(' ')[0] || 'Student'}! Select the batch you want to enroll in to get started.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 sm:p-12 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p>No active batches available.</p>
                <p className="text-xs mt-1">Please contact your administrator.</p>
              </div>
            ) : (
              courses.map((course) => {
                const isSelected = selectedBatch === course.id;
                return (
                  <div
                    key={course.id}
                    onClick={() => setSelectedBatch(course.id)}
                    className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative overflow-hidden ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 shadow-md scale-[1.02]'
                        : 'border-slate-100 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 text-orange-600">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                    )}
                    <h3 className={`font-heading font-bold text-lg mb-1 ${isSelected ? 'text-orange-900' : 'text-slate-900'}`}>
                      {course.title}
                    </h3>
                    <p className={`text-xs font-semibold ${isSelected ? 'text-orange-700' : 'text-slate-500'}`}>
                      {course.code || 'Standard Batch'}
                    </p>
                    {course.description && (
                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="pt-8 border-t border-slate-100">
            <Button
              onClick={handleEnroll}
              disabled={!selectedBatch || isEnrolling}
              className="w-full h-14 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isEnrolling ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enrolling...
                </>
              ) : (
                <>
                  Complete Registration <ChevronRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
