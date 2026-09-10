'use client';

import React, { useState } from 'react';
import { 
  Video, 
  FileText, 
  UploadCloud, 
  BarChart3, 
  Play, 
  Download, 
  CheckCircle2, 
  Clock, 
  Check, 
  AlertCircle, 
  Award, 
  TrendingUp,
  FileCheck,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function InstituteFeatureGrid() {
  const [selectedTab, setSelectedTab] = useState<'all' | 'physics' | 'chemistry' | 'math'>('all');

  return (
    <section id="batches" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Core Academic Operations Engine</span>
        </div>

        <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-slate-900 tracking-tight">
          Everything Needed for <br className="hidden sm:block" />
          <span className="text-emerald-600">Daily Preparation</span> &amp; <span className="text-orange-600">Rank Advancement</span>
        </h2>

        <p className="text-base sm:text-lg text-slate-600">
          Dedicated modules engineered for structured classroom delivery, daily practice problem evaluation, and national test series benchmarking.
        </p>
      </div>

      {/* 3-Column Visual Showcase Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ============================================================
            CARD 1: Daily Lectures & Archives
            ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xl shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="h-12 w-12 rounded-2xl bg-emerald-100/90 text-emerald-700 flex items-center justify-center">
                <Video className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="rounded-full border-emerald-300 bg-emerald-50 text-emerald-800 font-semibold text-xs">
                HD Vault 1080p
              </Badge>
            </div>

            <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">
              Daily Lectures &amp; Archives
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
              Stream live faculty classes and access past topic recordings with timestamped bookmarks and synchronized blackboard PDFs.
            </p>

            {/* Interactive Video Lecture Simulation Block */}
            <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-inner relative overflow-hidden group">
              <div className="flex items-center justify-between text-xs mb-3 text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Lecture #14 • Mechanics
                </span>
                <span className="font-mono">1h 15m / 1h 30m</span>
              </div>

              {/* Video preview thumbnail mockup */}
              <div className="relative h-28 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700/60 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent"></div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform cursor-pointer">
                  <Play className="h-4 w-4 fill-slate-950 ml-0.5" />
                </div>
                <div className="absolute bottom-2 left-3 text-[11px] font-medium text-slate-200">
                  Rotational Dynamics — Torque Equations
                </div>
              </div>

              {/* Downloadable PDF Attachment item */}
              <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-slate-300 text-[11px] font-medium truncate max-w-[150px]">
                    Board_Notes_Lecture14.pdf
                  </span>
                </div>
                <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:underline">
                  Download <Download className="h-3 w-3" />
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              2x playback &amp; offline cache
            </span>
            <span className="font-semibold text-slate-700">350+ Hours Vault</span>
          </div>
        </div>

        {/* ============================================================
            CARD 2: Assignment & PDF Submission
            ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xl shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="h-12 w-12 rounded-2xl bg-orange-100/90 text-orange-700 flex items-center justify-center">
                <UploadCloud className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="rounded-full border-orange-300 bg-orange-50 text-orange-800 font-semibold text-xs">
                DPP &amp; Worksheets
              </Badge>
            </div>

            <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">
              Assignment &amp; PDF Submission
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
              Upload Daily Practice Problems (DPP) with instant format validation, automated timestamp verification, and faculty feedback notes.
            </p>

            {/* Interactive File Dropzone Mockup */}
            <div className="rounded-2xl border-2 border-dashed border-orange-300/80 bg-orange-50/40 p-4 text-center">
              <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold text-slate-800">
                DPP_Electrostatics_Set_02.pdf
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Drag and drop your handwritten solution (.pdf, .jpg)
              </div>

              {/* Upload Status Simulation Pill */}
              <div className="mt-3 bg-white rounded-xl p-2.5 shadow-sm border border-orange-200/60 flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-slate-800">Uploaded &amp; Verified</div>
                    <div className="text-[10px] text-slate-400">Submitted 24 mins before deadline</div>
                  </div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  On Time
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-orange-500" />
              Rubric-based corrections
            </span>
            <span className="font-semibold text-slate-700">Daily Evaluation</span>
          </div>
        </div>

        {/* ============================================================
            CARD 3: Performance & Test Analysis
            ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xl shadow-slate-900/5 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="h-12 w-12 rounded-2xl bg-blue-100/90 text-blue-700 flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="rounded-full border-blue-300 bg-blue-50 text-blue-800 font-semibold text-xs">
                AIR Rank Predictor
              </Badge>
            </div>

            <h3 className="font-heading font-bold text-xl text-slate-900 mb-2">
              Performance &amp; Test Analysis
            </h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
              Track mock test score trajectories, accuracy meters per subject, and comparative ranking graphs against institute toppers.
            </p>

            {/* Test Series Scorecard Simulation */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Major Test Series #04</span>
                <span className="font-extrabold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full text-[11px]">
                  284 / 300
                </span>
              </div>

              {/* Subject mini progress bars */}
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-slate-600 font-medium mb-1">
                    <span>Physics (96/100)</span>
                    <span className="text-emerald-600 font-semibold">96%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '96%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 font-medium mb-1">
                    <span>Chemistry (94/100)</span>
                    <span className="text-blue-600 font-semibold">94%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 font-medium mb-1">
                    <span>Mathematics (94/100)</span>
                    <span className="text-purple-600 font-semibold">94%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              Negative mark breakdown
            </span>
            <span className="font-semibold text-slate-700">Percentile 99.4%</span>
          </div>
        </div>

      </div>
    </section>
  );
}
