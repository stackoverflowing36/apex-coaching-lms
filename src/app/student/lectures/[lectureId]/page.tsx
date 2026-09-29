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
        <div className="aspect-video rounded-[20px] bg-[#141414] border border-[#262626] animate-pulse" />
        <div className="h-32 rounded-[20px] bg-[#141414] border border-[#262626] animate-pulse" />
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="bg-[#141414] rounded-[20px] border border-[#262626] p-16 text-center">
        <Video className="h-12 w-12 text-[#8e8e8e] mx-auto mb-4" />
        <p className="font-semibold text-white">Lecture not found</p>
        <Link href="/student/lectures" className="text-[#a8f1e0] text-sm font-medium mt-2 inline-block hover:underline">
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
        className="inline-flex items-center gap-2 text-sm text-[#b7b7b5] hover:text-[#a8f1e0] transition-colors font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Lecture Vault
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ========== MAIN VIDEO AREA ========== */}
        <div className="lg:col-span-3 space-y-5">
          {/* Video Player */}
          <div className="bg-[#0c0c0c] border border-[#262626] rounded-[20px] overflow-hidden shadow-2xl aspect-video relative">
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
                  <Video className="h-16 w-16 mx-auto mb-3 opacity-30 text-[#8e8e8e]" />
                  <p className="font-medium text-[#8e8e8e]">Video not available</p>
                </div>
              </div>
            )}
          </div>

          {/* Lecture Info Card */}
          <div className="bg-[#141414] rounded-[20px] p-6 border border-[#262626]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="shrink-0 w-7 h-7 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center font-black text-xs">
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
                  <span className="text-xs text-[#8e8e8e] font-medium font-condensed uppercase tracking-wider">
                    Lecture {siblingLectures.findIndex((l) => l.id === lecture.id) >= 0
                      ? siblingLectures.findIndex((l) => l.id === lecture.id) + 1
                      : lecture.order_index || 1}
                  </span>
                </div>
                <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {lecture.title}
                </h1>
                <p className="text-sm text-[#b7b7b5] mt-1">{lecture.courses?.title}</p>
              </div>
            </div>

            {/* Resources */}
            {lecture.notes_url && (
              <div className="mt-6 pt-5 border-t border-[#262626]">
                <h3 className="font-semibold text-sm text-[#d4d4d4] mb-3 flex items-center gap-2">
                  <FileDown className="h-4 w-4 text-[#a8f1e0]" />
                  Downloadable Resources
                </h3>
                <a
                  href={lecture.notes_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-[20px] bg-[#181818] border border-[#383838] hover:border-[#a8f1e0] hover:bg-[#202020] transition-all group"
                >
                  <div className="w-10 h-10 rounded-[14px] bg-[#1c1c1c] border border-[#383838] flex items-center justify-center">
                    <span className="text-xs font-extrabold text-[#ffb956]">PDF</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate group-hover:text-[#a8f1e0] transition-colors">
                      Lecture Notes — {lecture.title}
                    </p>
                    <p className="text-xs text-[#8e8e8e]">Click to download</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-[#8e8e8e] group-hover:text-[#a8f1e0] transition-colors" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ========== SIDEBAR: COURSE LECTURES LIST ========== */}
        <div className="lg:col-span-1">
          <div className="bg-[#141414] rounded-[20px] border border-[#262626] overflow-hidden sticky top-24">
            <div className="px-5 pt-5 pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[#a8f1e0]" />
                <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Course Syllabus
                </h3>
              </div>
              <p className="text-xs text-[#8e8e8e] mt-0.5">
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
                        ? 'bg-[#181818] border-l-2 border-[#a8f1e0]'
                        : 'hover:bg-[#181818] border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-8 h-8 rounded-[20px] flex items-center justify-center text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#a8f1e0] text-[#0c0c0c] shadow-sm'
                          : 'bg-[#1c1c1c] text-[#d4d4d4] border border-[#383838]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isActive ? 'text-[#a8f1e0]' : 'text-white'
                        }`}
                      >
                        {sl.title}
                      </p>
                      {sl.course_chapters?.title && (
                        <p className="text-[10px] font-bold text-[#ffb956] truncate mt-0.5">
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
