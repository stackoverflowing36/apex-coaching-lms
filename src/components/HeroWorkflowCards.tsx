'use client';

import React from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Award, 
  Video, 
  Check, 
  Download, 
  ArrowUpRight, 
  Clock, 
  Sparkles,
  TrendingUp,
  Calendar,
  Users
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function HeroWorkflowCards() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none flex flex-col items-center justify-center min-h-[490px] select-none">
      
      {/* SVG Connecting Flow Lines in the background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none -z-0 opacity-80 overflow-visible"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M130 110 C 130 180, 370 160, 370 245 C 370 330, 150 325, 150 410"
          stroke="url(#coachingFlowGradient)"
          strokeWidth="3"
          strokeDasharray="6 6"
          className="animate-pulse"
        />
        {/* Glow node circles along the path */}
        <circle cx="130" cy="110" r="5" fill="#10B981" />
        <circle cx="370" cy="245" r="5" fill="#3B82F6" />
        <circle cx="150" cy="410" r="5" fill="#8B5CF6" />
        
        <defs>
          <linearGradient id="coachingFlowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>

      {/* Decorative Floating Metric Chip - Top Right */}
      <div className="absolute -top-4 -right-2 sm:right-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-lg shadow-slate-900/5 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <TrendingUp className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-semibold text-slate-800">Batch Average: 92.4%</span>
      </div>

      {/* Decorative Floating Metric Chip - Bottom Left */}
      <div className="absolute -bottom-3 -left-2 sm:left-2 z-20 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-lg shadow-slate-900/5 flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
        <span className="text-xs font-semibold text-slate-800">JEE/NEET Test Series Live</span>
      </div>

      {/* Stacked Cards Container */}
      <div className="relative z-10 w-full flex flex-col gap-4 sm:gap-5">
        
        {/* CARD 1: Physics Module 04: Thermodynamics Notes (PDF) */}
        <div className="transform lg:-translate-x-4 hover:translate-x-0 transition-transform duration-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-900/8 border border-slate-100/90 relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Pastel Teal Icon Block */}
              <div className="h-11 w-11 rounded-xl bg-teal-100/80 border border-teal-200/60 flex items-center justify-center text-teal-700 flex-shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    Physics Module 04: Thermodynamics Notes (PDF)
                  </h4>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    Uploaded by H.O.D. Physics • 28 Pages (14.2 MB)
                  </span>
                </div>
              </div>
            </div>
            {/* Green Checkmark Badge */}
            <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/30" title="Verified Material">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 font-semibold border border-teal-200/50">
                JEE Target 2026
              </span>
              <span className="text-slate-400">Class Room Study Material</span>
            </div>
            <Link href="/login?role=student" className="text-emerald-600 font-semibold flex items-center gap-1 hover:underline">
              Download PDF <Download className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* CARD 2: Mock Test #3: Rank & Grade Published */}
        <div className="transform lg:translate-x-6 hover:translate-x-2 transition-transform duration-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-900/8 border border-slate-100/90 relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Pastel Blue Icon Block */}
              <div className="h-11 w-11 rounded-xl bg-blue-100/80 border border-blue-200/60 flex items-center justify-center text-blue-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    Mock Test #3: Rank &amp; Grade Published
                  </h4>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                    AIR #4 (Institute Rank 1)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full Syllabus Practice Test — Score: <strong className="text-slate-900 font-bold">96/100 (99.2%ile)</strong>
                </p>
              </div>
            </div>
            {/* Blue Rank Tag */}
            <div className="h-7 w-7 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/30">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">
              Percentile breakdown: Physics (99.8%), Chemistry (98.4%)
            </span>
            <Link href="/login?role=student" className="font-semibold text-blue-600 flex items-center gap-0.5 hover:underline">
              Analysis Sheet <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* CARD 3: Live Doubt Session: Chemistry Batch A at 5:00 PM */}
        <div className="transform lg:-translate-x-1 hover:translate-x-1 transition-transform duration-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-900/8 border border-slate-100/90 relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Pastel Purple Icon Block */}
              <div className="h-11 w-11 rounded-xl bg-purple-100/80 border border-purple-200/60 flex items-center justify-center text-purple-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    Live Doubt Session: Chemistry Batch A
                  </h4>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/60">
                    <Clock className="h-3 w-3" /> Today 5:00 PM
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Organic Chemistry Reaction Mechanisms • Instructor: Dr. V. Sharma
                </p>
              </div>
            </div>
            {/* Green checkmark indicator */}
            <div className="h-7 w-7 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-purple-500/30">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-slate-700">Digital Classroom Link Activated</span>
            </div>
            <Link href="/login?role=student" className="text-purple-600 font-semibold flex items-center gap-0.5 hover:underline">
              Join Stream <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
