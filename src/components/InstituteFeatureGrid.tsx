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
    <section id="batches" className="py-20 px-4 sm:px-6 lg:px-8 max-w-[1360px] mx-auto">
      
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-pill bg-[#a8f1e0] text-[#111111] text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-[#111111]" />
          <span>Core Academic Operations Engine</span>
        </div>

        <h2 className="font-display font-bold uppercase text-4xl sm:text-6xl text-[#111111] tracking-tight leading-[1.05]">
          Everything Needed for <br className="hidden sm:block" />
          <span className="text-[#a05120]">Daily Preparation</span> &amp; <span className="text-[#63200c]">Rank Advancement</span>
        </h2>

        <p className="text-base sm:text-lg text-stone-600 font-normal">
          Dedicated modules engineered for structured classroom delivery, daily practice problem evaluation, and national test series benchmarking.
        </p>
      </div>

      {/* 3-Column Visual Showcase Cards (CIID Split Studio style) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ============================================================
            CARD 1: Daily Lectures & Archives
            ============================================================ */}
        <div className="bg-white rounded-none sm:rounded-studio p-6 sm:p-7 border border-stone-200 shadow-studio flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="h-12 w-12 rounded-full bg-[#111111] text-[#fbfbfa] flex items-center justify-center">
                <Video className="h-6 w-6" />
              </div>
              <Badge className="rounded-pill bg-[#a8f1e0] text-[#111111] border-none font-semibold text-xs uppercase tracking-wider">
                HD Vault 1080p
              </Badge>
            </div>

            <h3 className="font-display font-bold uppercase text-2xl text-[#111111] mb-2 tracking-tight">
              Daily Lectures &amp; Archives
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
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
        <div className="bg-white rounded-none sm:rounded-studio p-6 sm:p-7 border border-stone-200 shadow-studio flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="h-12 w-12 rounded-full bg-[#a05120] text-white flex items-center justify-center">
                <UploadCloud className="h-6 w-6" />
              </div>
              <Badge className="rounded-pill bg-[#ffb956] text-[#111111] border-none font-semibold text-xs uppercase tracking-wider">
                DPP &amp; Worksheets
              </Badge>
            </div>

            <h3 className="font-display font-bold uppercase text-2xl text-[#111111] mb-2 tracking-tight">
              Assignment &amp; PDF Submission
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
              Upload Daily Practice Problems (DPP) with instant format validation, automated timestamp verification, and faculty feedback notes.
            </p>

            {/* Interactive File Dropzone Mockup */}
            <div className="rounded-studio border border-dashed border-[#a05120]/40 bg-[#f3f1ec]/50 p-4 text-center">
              <div className="h-10 w-10 mx-auto mb-2 rounded-full bg-[#a05120]/15 text-[#a05120] flex items-center justify-center">
                <FileCheck className="h-5 w-5" />
              </div>
              <div className="text-xs font-semibold text-[#111111]">
                DPP_Electrostatics_Set_02.pdf
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">
                Drag and drop your handwritten solution (.pdf, .jpg)
              </div>

              {/* Upload Status Simulation Pill */}
              <div className="mt-3 bg-white rounded-pill p-2.5 shadow-sm border border-stone-200 flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-[#a8f1e0] text-[#111111] flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold text-[#111111]">Uploaded &amp; Verified</div>
                    <div className="text-[10px] text-stone-400">Submitted 24 mins before deadline</div>
                  </div>
                </div>
                <Badge className="bg-[#a8f1e0] text-[#111111] border-none text-[10px] px-2.5 py-0.5 rounded-pill font-bold uppercase">
                  On Time
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#a05120]" />
              Rubric-based corrections
            </span>
            <span className="font-semibold text-[#111111]">Daily Evaluation</span>
          </div>
        </div>

        {/* ============================================================
            CARD 3: Performance & Test Analysis
            ============================================================ */}
        <div className="bg-white rounded-none sm:rounded-studio p-6 sm:p-7 border border-stone-200 shadow-studio flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="h-12 w-12 rounded-full bg-[#63200c] text-white flex items-center justify-center">
                <BarChart3 className="h-6 w-6" />
              </div>
              <Badge className="rounded-pill bg-[#e2bcc2] text-[#111111] border-none font-semibold text-xs uppercase tracking-wider">
                AIR Rank Predictor
              </Badge>
            </div>

            <h3 className="font-display font-bold uppercase text-2xl text-[#111111] mb-2 tracking-tight">
              Performance &amp; Test Analysis
            </h3>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
              Track mock test score trajectories, accuracy meters per subject, and comparative ranking graphs against institute toppers.
            </p>

            {/* Test Series Scorecard Simulation */}
            <div className="rounded-studio bg-[#fbfbfa] border border-stone-200 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#111111]">Major Test Series #04</span>
                <span className="font-bold text-[#111111] bg-[#ffb956] px-2.5 py-0.5 rounded-pill text-[11px]">
                  284 / 300
                </span>
              </div>

              {/* Subject mini progress bars */}
              <div className="space-y-2 text-[11px]">
                <div>
                  <div className="flex justify-between text-stone-700 font-medium mb-1">
                    <span>Physics (96/100)</span>
                    <span className="text-[#a05120] font-bold">96%</span>
                  </div>
                  <div className="h-2 rounded-pill bg-stone-200 overflow-hidden">
                    <div className="h-full bg-[#a05120] rounded-pill" style={{ width: '96%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-stone-700 font-medium mb-1">
                    <span>Chemistry (94/100)</span>
                    <span className="text-[#63200c] font-bold">94%</span>
                  </div>
                  <div className="h-2 rounded-pill bg-stone-200 overflow-hidden">
                    <div className="h-full bg-[#63200c] rounded-pill" style={{ width: '94%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-stone-700 font-medium mb-1">
                    <span>Mathematics (94/100)</span>
                    <span className="text-stone-900 font-bold">94%</span>
                  </div>
                  <div className="h-2 rounded-pill bg-stone-200 overflow-hidden">
                    <div className="h-full bg-[#111111] rounded-pill" style={{ width: '94%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-[#a05120]" />
              Negative mark breakdown
            </span>
            <span className="font-semibold text-[#111111]">Percentile 99.4%</span>
          </div>
        </div>

      </div>
    </section>
  );
}
