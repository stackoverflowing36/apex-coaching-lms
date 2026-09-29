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
  const supabase = React.useMemo(() => createClient(), []);

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
  }, [lectureId, supabase]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="aspect-video rounded-studio bg-white border border-stone-200 animate-pulse" />
        <div className="h-32 rounded-studio bg-white border border-stone-200 animate-pulse" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="bg-white rounded-studio border border-stone-200 p-16 text-center">
        <Video className="h-12 w-12 text-stone-400 mx-auto mb-4" />
        <p className="font-semibold text-[#111111]">Lecture not found</p>
        <Link href="/student/lectures" className="text-[#a05120] text-sm font-medium mt-2 inline-block hover:underline">
          ← Back to Lectures
        </Link>
      </div>
    );
  }

  // Convert YouTube, Vimeo, Google Drive watch/share URLs to embed URLs
  function getEmbedUrl(url: string) {
    if (!url) return '';
    // Google Drive
    if (url.includes('drive.google.com')) {
      const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (driveMatch && driveMatch[1]) {
        return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
      }
      return url;
    }
    // Already an embed URL
    if (url.includes('/embed/') || url.includes('/preview')) return url;
    // YouTube watch URL
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    // Direct MP4, WebM or storage URL
    return url;
  }

  const videoUrl = getEmbedUrl(lecture.video_url || '');
  const isGoogleDrive = videoUrl.includes('drive.google.com');
  const isDirectVideo =
    !isGoogleDrive &&
    (/\.(mp4|webm|mov|mkv|ogg)(\?.*)?$/i.test(videoUrl) ||
      (videoUrl.includes('/course-materials/') && !videoUrl.includes('/preview')));

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Back Navigation */}
      <Link
        href="/student/lectures"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-[#a05120] transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lecture Vault
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ========== MAIN VIDEO AREA ========== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Video Player */}
          <div className="bg-[#fbfbfa] border border-stone-200 rounded-studio overflow-hidden shadow-2xl aspect-video relative">
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
              <div className="flex items-center justify-center h-full text-[#111111]/50">
                <div className="text-center">
                  <Video className="h-16 w-16 mx-auto mb-3 opacity-30 text-stone-400" />
                  <p className="font-medium text-stone-400">Video not available</p>
                </div>
              </div>
            )}
          </div>

          {/* Lecture Info Card */}
          <div className="bg-white rounded-studio p-6 border border-stone-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="shrink-0 w-7 h-7 rounded-studio bg-stone-100 text-[#a05120] border border-stone-300 flex items-center justify-center font-black text-xs">
                    {siblingLectures.findIndex((l) => l.id === lecture.id) >= 0
                      ? siblingLectures.findIndex((l) => l.id === lecture.id) + 1
                      : lecture.order_index || 1}
                  </span>
                  <Badge
                    variant="mint"
                    className="text-xs font-semibold"
                  >
                    {lecture.courses?.code}
                  </Badge>
                  {lecture.course_chapters?.title && (
                    <Badge variant="rust" className="text-xs font-bold shadow-none">
                      Chapter: {lecture.course_chapters.title}
                    </Badge>
                  )}
                  <span className="text-xs text-stone-400 font-medium font-condensed uppercase tracking-wider">
                    Lecture {siblingLectures.findIndex((l) => l.id === lecture.id) >= 0
                      ? siblingLectures.findIndex((l) => l.id === lecture.id) + 1
                      : lecture.order_index || 1}
                  </span>
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
                  {lecture.title}
                </h1>
                <p className="text-sm text-stone-500 mt-1">{lecture.courses?.title}</p>
              </div>
            </div>

            {/* Resources */}
            {lecture.notes_url && (
              <div className="mt-6 pt-5 border-t border-stone-200">
                <h3 className="font-semibold text-sm text-stone-600 mb-3 flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-[#a05120]" />
                  Downloadable Resources
                </h3>
                <a
                  href={lecture.notes_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-studio bg-stone-50 border border-stone-300 hover:border-[#a05120] hover:bg-stone-100 transition-all group"
                >
                  <div className="w-10 h-10 rounded-[14px] bg-stone-100 border border-stone-300 flex items-center justify-center">
                    <span className="text-xs font-extrabold text-amber-700">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111111] truncate group-hover:text-[#a05120] transition-colors">
                      Lecture Notes — {lecture.title}
                    </p>
                    <p className="text-xs text-stone-400">Click to download</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-stone-400 group-hover:text-[#a05120] transition-colors" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR: COURSE LECTURES LIST ========== */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-studio border border-stone-200 overflow-hidden sticky top-24">
            <div className="px-5 pt-5 pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#a05120]" />
                <h3 className="font-display text-sm font-bold text-[#111111] uppercase tracking-wider">
                  Course Syllabus
                </h3>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                {siblingLectures.length} lecture{siblingLectures.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="divide-y divide-[#262626] max-h-[60vh] overflow-y-auto">
              {siblingLectures.map((sl, idx) => {
                const isActive = sl.id === lectureId;
                return (
                  <Link
                    key={sl.id}
                    href={`/student/lectures/${sl.id}`}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${
                      isActive
                        ? 'bg-stone-50 border-l-2 border-[#a8f1e0]'
                        : 'hover:bg-stone-50 border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-8 h-8 rounded-studio flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#a8f1e0] text-[#111111] shadow-sm'
                          : 'bg-stone-100 text-stone-600 border border-stone-300'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? 'text-[#a05120]' : 'text-[#111111]'
                        }`}
                      >
                        {sl.title}
                      </p>
                      {sl.course_chapters?.title && (
                        <p className="text-[10px] font-bold text-amber-700 truncate mt-0.5">
                          Chapter: {sl.course_chapters.title}
                        </p>
                      )}
                    </div>
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
