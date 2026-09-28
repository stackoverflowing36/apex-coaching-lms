'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Play, 
  PenTool, 
  Award, 
  CheckCircle2, 
  BookOpen, 
  Users 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface SlideItem {
  id: number;
  image: string;
  tag: string;
  title: string;
  subtitle: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
  badgeColor?: string;
}

const slides: SlideItem[] = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=2000&q=80',
    tag: 'CORE LEARNING METHODOLOGY',
    title: 'LISTEN. BUILD. TEST. REPEAT.',
    subtitle: 'Comprehensive competitive exam preparation through daily live problem-solving, structured derivations, and active classroom coaching.',
    primaryCtaText: 'Explore Classroom Batches',
    primaryCtaLink: '/login?role=student',
    secondaryCtaText: 'Faculty Portal',
    secondaryCtaLink: '/login?role=teacher',
    badgeColor: 'bg-[#a8f1e0] text-[#111111]',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=2000&q=80',
    tag: 'FACULTY EVALUATION STATION',
    title: 'EVALUATE. ANNOTATE. RETURN.',
    subtitle: 'High-DPI handwritten pen corrections on student PDF answer sheets with 1-click cloud sync and personalized student remarks.',
    primaryCtaText: 'Grading Station',
    primaryCtaLink: '/login?role=teacher',
    secondaryCtaText: 'View Evaluated Papers',
    secondaryCtaLink: '/login?role=student',
    badgeColor: 'bg-[#ffb956] text-[#111111]',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2000&q=80',
    tag: 'ADAPTIVE TEST SERIES',
    title: 'ATTEMPT. ANALYZE. EXCEL.',
    subtitle: 'Chapter-wise timed MCQ engines featuring official first-attempt locks, practice re-attempts, and instant percentile ranking.',
    primaryCtaText: 'Take Practice Quiz',
    primaryCtaLink: '/login?role=student',
    secondaryCtaText: 'Score Analytics',
    secondaryCtaLink: '/login?role=student',
    badgeColor: 'bg-[#a8f1e0] text-[#111111]',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=2000&q=80',
    tag: 'CAMPUS OPERATIONS',
    title: 'ATTEND. BROADCAST. ENGAGE.',
    subtitle: 'Real-time attendance registers with instant parent/student sync and institute-wide live bulletin broadcasts.',
    primaryCtaText: 'Daily Attendance',
    primaryCtaLink: '/login?role=teacher',
    secondaryCtaText: 'Campus Notices',
    secondaryCtaLink: '/login?role=student',
    badgeColor: 'bg-[#b39dff] text-[#111111]',
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=2000&q=80',
    tag: 'STUDY VAULT & ARCHIVES',
    title: 'RECORD. ARCHIVE. REVISIT.',
    subtitle: 'HD 1080p classroom recordings with timestamped topic navigation, downloadable blackboard PDFs, and syllabus roadmaps.',
    primaryCtaText: 'Browse Lecture Vault',
    primaryCtaLink: '/login?role=student',
    secondaryCtaText: 'Curriculum Roadmap',
    secondaryCtaLink: '/login?role=student',
    badgeColor: 'bg-[#e2bcc2] text-[#111111]',
  },
];

export function HeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  const goToSlide = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Auto-play interval
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(() => {
        nextSlide();
      }, 5500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, nextSlide]);

  return (
    <div 
      className="relative w-full h-[82vh] min-h-[600px] max-h-[850px] overflow-hidden bg-stone-950 text-white select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Slides */}
      {slides.map((slide, idx) => {
        const isActive = idx === currentIndex;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Background Image with subtle zoom */}
            <div
              className={`absolute inset-0 bg-cover bg-center transition-transform ease-out ${
                isActive ? 'scale-105' : 'scale-100'
              }`}
              style={{
                backgroundImage: `url(${slide.image})`,
                transitionDuration: '6000ms',
              }}
            />

            {/* Dark cinematic vignette overlays (ensuring text legibility) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/60" />
            <div className="absolute inset-0 bg-black/25" />
          </div>
        );
      })}

      {/* Hero Content Container */}
      <div className="relative z-20 h-full max-w-[1360px] mx-auto px-6 sm:px-8 lg:px-12 flex flex-col justify-center items-center text-center">
        
        {/* Animated Slide Content */}
        <div key={currentIndex} className="max-w-4xl space-y-5 animate-in fade-in zoom-in-95 duration-500">
          
          {/* Category Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill text-[11px] font-condensed font-bold uppercase tracking-widest shadow-md">
            <span className={`px-2.5 py-0.5 rounded-pill ${slides[currentIndex].badgeColor || 'bg-[#a8f1e0] text-[#111111]'}`}>
              {slides[currentIndex].tag}
            </span>
          </div>

          {/* Enormous All-Caps Headline (like LISTEN. BUILD. TEST. REPEAT.) */}
          <h1 className="font-display font-black uppercase text-5xl sm:text-7xl lg:text-[88px] tracking-tight leading-[0.96] text-white drop-shadow-md">
            {slides[currentIndex].title}
          </h1>

          {/* Subtitle stating the app feature */}
          <p className="text-sm sm:text-base lg:text-lg text-stone-200 font-sans max-w-2xl mx-auto leading-relaxed font-normal drop-shadow">
            {slides[currentIndex].subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={slides[currentIndex].primaryCtaLink}>
              <Button
                size="lg"
                className="rounded-pill bg-[#a05120] hover:bg-[#864319] text-white font-condensed font-bold uppercase tracking-wider text-xs sm:text-sm px-8 h-12 shadow-lg transition-all"
              >
                {slides[currentIndex].primaryCtaText}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href={slides[currentIndex].secondaryCtaLink}>
              <Button
                variant="outline"
                size="lg"
                className="rounded-pill border border-white/40 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm font-condensed font-bold uppercase tracking-wider text-xs sm:text-sm px-7 h-12 transition-all"
              >
                {slides[currentIndex].secondaryCtaText}
              </Button>
            </Link>
          </div>

        </div>

      </div>

      {/* Prev / Next Navigation Arrows */}
      <button
        onClick={prevSlide}
        aria-label="Previous slide"
        className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white/70 hover:text-white backdrop-blur-sm border border-white/10 transition-all"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next slide"
        className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 p-2.5 rounded-full bg-black/30 hover:bg-black/60 text-white/70 hover:text-white backdrop-blur-sm border border-white/10 transition-all"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Bottom Center Rectangular Pagination Indicators (exactly like the example website) */}
      <div className="absolute bottom-6 inset-x-0 z-30 flex items-center justify-center gap-2">
        {slides.map((_, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={idx}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-1.5 transition-all duration-300 rounded-full ${
                isActive 
                  ? 'w-10 bg-white shadow-sm' 
                  : 'w-4 bg-white/40 hover:bg-white/70'
              }`}
            />
          );
        })}
      </div>

    </div>
  );
}
