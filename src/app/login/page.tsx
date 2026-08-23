'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  GraduationCap, 
  ArrowRight, 
  Lock, 
  Mail, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  BookOpen,
  Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { BackgroundGrid } from '@/components/layout/BackgroundGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'teacher' || roleParam === 'student') {
      setRole(roleParam);
    }
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    const errorParam = searchParams.get('error');
    if (errorParam === 'already_registered') {
      setErrorMessage('This email is already registered. Please sign in with your password or Google account.');
    } else if (errorParam) {
      setErrorMessage('Authentication failed. Please try again or sign in with email.');
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setErrorMessage(null);
    try {
      const dest = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${dest}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error('Google sign in error', { description: error.message });
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to initiate Google sign in.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMessage(error.message);
        toast.error('Authentication failed', {
          description: error.message,
        });
        return;
      }

      if (data?.user) {
        const dest = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
        toast.success('Welcome back!', {
          description: `Logged in as ${role === 'student' ? 'Student' : 'Faculty'}. Redirecting to dashboard...`,
        });
        router.push(dest);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
      toast.error('Login error', {
        description: 'Unable to sign in at this time.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-md bg-white rounded-[2rem] p-8 sm:p-10 shadow-2xl shadow-slate-900/8 border border-slate-200/80">
      
      <div className="text-center mb-6 space-y-2">
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
          Portal Access
        </h1>
        <p className="text-sm text-slate-500">
          Sign in to access your batch lectures, test series &amp; grades
        </p>
      </div>

      {/* Role Selection Toggle */}
      <div className="mb-5">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-full border border-slate-200/80">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
              role === 'student'
                ? 'bg-white text-emerald-700 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className={`h-3.5 w-3.5 ${role === 'student' ? 'text-emerald-600' : 'text-slate-400'}`} />
            Student Login
          </button>

          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-full text-xs font-bold transition-all duration-200 ${
              role === 'teacher'
                ? 'bg-white text-orange-600 shadow-md shadow-slate-900/5'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className={`h-3.5 w-3.5 ${role === 'teacher' ? 'text-orange-600' : 'text-slate-400'}`} />
            Faculty Login
          </button>
        </div>
      </div>

      {/* Error Alert Box */}
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 flex items-start gap-2.5 text-red-700 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="leading-snug">{errorMessage}</div>
        </div>
      )}

      {/* Google OAuth Button */}
      <div className="mb-5">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading || isLoading}
          className="w-full h-11 rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center"
        >
          {isGoogleLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              Connecting to Google...
            </span>
          ) : (
            <span className="flex items-center justify-center">
              <GoogleIcon />
              Sign in with Google
            </span>
          )}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="border-t border-slate-200 w-full absolute"></div>
        <span className="bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 relative z-10">
          or continue with email
        </span>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {role === 'student' ? 'Enrolled Student Email' : 'Faculty / Staff Email'}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              required
              placeholder={role === 'student' ? 'student@apex.edu' : 'faculty@apex.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Password
            </Label>
            <a href="#" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-11 rounded-2xl border-slate-200 focus-visible:ring-emerald-500 text-sm"
            />
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading || isGoogleLoading}
          className={`w-full h-11 rounded-full text-white font-semibold text-sm shadow-lg transition-all mt-2 ${
            role === 'student'
              ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/25'
              : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Authenticating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Sign In to {role === 'student' ? 'Student Portal' : 'Faculty Console'}
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>

      {/* Card Footer */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs sm:text-sm text-slate-600">
        New Student / Not registered?{' '}
        <Link
          href="/signup"
          className="font-bold text-orange-600 hover:text-orange-700 transition-colors"
        >
          Register Batch Enrolment
        </Link>
      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative selection:bg-emerald-100 selection:text-emerald-900 py-12">
      <BackgroundGrid />

      {/* Floating Logo Badge */}
      <div className="mb-6 z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight leading-none">
              Apex Institute
            </span>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Academic Portal
            </span>
          </div>
        </Link>
      </div>

      <Suspense fallback={
        <div className="w-full max-w-md bg-white rounded-[2rem] p-10 shadow-2xl border border-slate-200 text-center text-slate-500">
          Loading login portal...
        </div>
      }>
        <LoginForm />
      </Suspense>

      {/* Trust verification */}
      <div className="mt-6 z-10 flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span>Secured via Institute Supabase RLS Policy</span>
      </div>
    </div>
  );
}
