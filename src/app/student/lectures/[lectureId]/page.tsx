'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Video,
  FileDown,
  BookOpen,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getLectureById, getLectures } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default function LectureViewerPage() {
  const params = useParams();
  const lectureId = params.lectureId as string;
  const supabase = createClient();

  const [lecture, setLecture] = useState<any>(null);
  const [siblingLectures, setSiblingLectures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const lectureData = await getLectureById(supabase, lectureId);
        setLecture(lectureData);

        if (lectureData?.course_id) {
          const siblings = await getLectures(supabase, lectureData.course_id);
          setSiblingLectures(siblings);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lectureId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="aspect-video rounded-2xl bg-white animate-pulse shadow-card" />
        <div className="h-32 rounded-2xl bg-white animate-pulse shadow-card" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 p-16 text-center">
        <Video className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="font-semibold text-slate-600">Lecture not found</p>
        <Link href="/student/lectures" className="text-emerald-600 text-sm font-medium mt-2 inline-block hover:underline">
          ← Back to Lectures
        </Link>
      </div>
    );
  }

  // Convert YouTube watch URLs to embed URLs
  function getEmbedUrl(url: string) {
    if (!url) return '';
    // Already an embed URL
    if (url.includes('/embed/')) return url;
    // YouTube watch URL
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Direct MP4 or other
    return url;
  }

  const videoUrl = getEmbedUrl(lecture.video_url || '');
  const isDirectVideo = videoUrl.endsWith('.mp4') || videoUrl.endsWith('.webm');

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Navigation */}
      <Link
        href="/student/lectures"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lecture Vault
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ========== MAIN VIDEO AREA ========== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Video Player */}
          <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl aspect-video relative">
            {isDirectVideo ? (
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-contain"
                poster=""
              />
            ) : videoUrl ? (
              <iframe
                src={videoUrl}
                title={lecture.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white/50">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Video not available</p>
                </div>
              </div>
            )}
          </div>

          {/* Lecture Info Card */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100/80">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="secondary"
                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold"
                  >
                    {lecture.courses?.code}
                  </Badge>
                  <span className="text-xs text-slate-400 font-medium">
                    Lecture {lecture.order_index}
                  </span>
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {lecture.title}
                </h1>
                <p className="text-sm text-slate-500 mt-1">{lecture.courses?.title}</p>
              </div>
            </div>

            {/* Resources */}
            {lecture.notes_url && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <h3 className="font-semibold text-sm text-slate-700 mb-3 flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-blue-500" />
                  Downloadable Resources
                </h3>
                <a
                  href={lecture.notes_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <span className="text-xs font-extrabold text-red-500">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      Lecture Notes — {lecture.title}
                    </p>
                    <p className="text-xs text-slate-400">Click to download</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR: COURSE LECTURES LIST ========== */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-card border border-slate-100/80 overflow-hidden sticky top-20">
            <div className="px-5 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                <h3 className="font-display text-sm font-bold text-slate-800">
                  Course Syllabus
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {siblingLectures.length} lecture{siblingLectures.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {siblingLectures.map((sl) => {
                const isActive = sl.id === lectureId;
                return (
                  <Link
                    key={sl.id}
                    href={`/student/lectures/${sl.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                      isActive
                        ? 'bg-emerald-50 border-l-2 border-emerald-500'
                        : 'hover:bg-slate-50 border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {sl.order_index}
                    </span>
                    <p
                      className={`text-sm font-medium truncate ${
                        isActive ? 'text-emerald-700' : 'text-slate-600'
                      }`}
                    >
                      {sl.title}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
