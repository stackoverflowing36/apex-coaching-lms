'use client';

import React from 'react';
import { 
  CheckCircle2, 
  FileText, 
  Award, 
  Sparkles, 
  Clock, 
  UserCheck, 
  Check, 
  ArrowUpRight,
  Star,
  MessageSquare
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export function HeroFeatureCards() {
  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none flex flex-col items-center justify-center min-h-[480px] select-none">
      
      {/* SVG Connecting Flow Lines in the background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none -z-0 opacity-75 overflow-visible"
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M130 110 C 130 180, 360 160, 360 240 C 360 320, 160 320, 160 400"
          stroke="url(#flowGradient)"
          strokeWidth="3"
          strokeDasharray="6 6"
          className="animate-pulse"
        />
        {/* Glow node circles along the path */}
        <circle cx="130" cy="110" r="5" fill="#10B981" />
        <circle cx="360" cy="240" r="5" fill="#10B981" />
        <circle cx="160" cy="400" r="5" fill="#10B981" />
        
        <defs>
          <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#F97316" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Decorative Floating Metric Chip - Top Right */}
      <div className="absolute -top-4 -right-2 sm:right-4 z-20 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-lg shadow-slate-900/5 flex items-center gap-2 animate-bounce duration-1000">
        <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
          <Star className="h-3.5 w-3.5 fill-emerald-600" />
        </div>
        <span className="text-xs font-semibold text-slate-800">99.4% Student Satisfaction</span>
      </div>

      {/* Decorative Floating Metric Chip - Bottom Left */}
      <div className="absolute -bottom-2 -left-2 sm:left-2 z-20 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-full px-3.5 py-1.5 shadow-lg shadow-slate-900/5 flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
        <span className="text-xs font-semibold text-slate-800">Live AI Assistant Active</span>
      </div>

      {/* Stacked Cards Container */}
      <div className="relative z-10 w-full flex flex-col gap-4 sm:gap-5">
        
        {/* CARD 1: Assignment Submitted */}
        <div className="transform lg:-translate-x-4 hover:translate-x-0 transition-transform duration-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-900/10 border border-slate-100/90 relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Pastel Icon Block */}
              <div className="h-11 w-11 rounded-xl bg-violet-100/80 border border-violet-200/60 flex items-center justify-center text-violet-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-slate-900 text-sm sm:text-base">
                    Assignment Submitted
                  </h4>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    <Check className="h-3 w-3 stroke-[3]" /> On Time
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Applied Machine Learning — Module 4: Neural Networks
                </p>
              </div>
            </div>
            {/* Green Checkmark */}
            <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/30">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5 border border-white">
                <AvatarImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=face" />
                <AvatarFallback className="text-[10px] bg-slate-200">EM</AvatarFallback>
              </Avatar>
              <span className="font-medium text-slate-700">Elena Martinez</span>
            </div>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="h-3 w-3" /> 2m ago
            </span>
          </div>
        </div>

        {/* CARD 2: Grade Posted */}
        <div className="transform lg:translate-x-6 hover:translate-x-2 transition-transform duration-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-900/10 border border-slate-100/90 relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Pastel Icon Block */}
              <div className="h-11 w-11 rounded-xl bg-emerald-100/80 border border-emerald-200/60 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-slate-900 text-sm sm:text-base">
                    Grade Posted
                  </h4>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                    A+ (98/100)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instructor Dr. Aris reviewed with rubric breakdown
                </p>
              </div>
            </div>
            {/* Green Checkmark */}
            <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/30">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium italic">
              &ldquo;Exceptional architecture implementation!&rdquo;
            </span>
            <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              +50 XP
            </span>
          </div>
        </div>

        {/* CARD 3: Live Feedback & Discussion */}
        <div className="transform lg:-translate-x-1 hover:translate-x-1 transition-transform duration-300 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-900/10 border border-slate-100/90 relative overflow-hidden group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Pastel Icon Block */}
              <div className="h-11 w-11 rounded-xl bg-orange-100/80 border border-orange-200/60 flex items-center justify-center text-orange-600 flex-shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-heading font-bold text-slate-900 text-sm sm:text-base">
                    Feedback & Certificate Ready
                  </h4>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                    <Sparkles className="h-3 w-3" /> Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full Course Completion Credential unlocked
                </p>
              </div>
            </div>
            {/* Green Checkmark */}
            <div className="h-7 w-7 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-500/30">
              <Check className="h-4 w-4 stroke-[3]" />
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="font-medium text-slate-700">Course Certificate ID #8849</span>
            </div>
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
              Download PDF <ArrowUpRight className="h-3 w-3" />
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
