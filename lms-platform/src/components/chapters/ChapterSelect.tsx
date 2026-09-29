'use client';

import { useState, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { getCourseChapters, createCourseChapter } from '@/lib/supabase/queries';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Chapter {
  id: string;
  title: string;
}

interface ChapterSelectProps {
  supabase: SupabaseClient;
  courseId: string;
  value: string | null;
  onChange: (chapterId: string | null) => void;
  className?: string;
}

export function ChapterSelect({ supabase, courseId, value, onChange, className = '' }: ChapterSelectProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadChapters() {
      if (!courseId) return;
      setIsLoading(true);
      try {
        const data = await getCourseChapters(supabase, courseId);
        setChapters(data || []);
      } catch (err) {
        console.error('Error loading chapters:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadChapters();
  }, [supabase, courseId]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'create_new') {
      setIsCreating(true);
    } else {
      onChange(val === 'none' ? null : val);
    }
  };

  const handleCreateSubmit = async () => {
    if (!newChapterTitle.trim()) {
      setIsCreating(false);
      return;
    }
    setIsSubmitting(true);
    try {
      const newChapter = await createCourseChapter(supabase, {
        course_id: courseId,
        title: newChapterTitle.trim(),
      });
      setChapters((prev) => {
        if (prev.some((c) => c.id === newChapter.id)) return prev;
        return [...prev, newChapter];
      });
      onChange(newChapter.id);
      setIsCreating(false);
      setNewChapterTitle('');
      toast.success(`Chapter "${newChapter.title}" added!`);
    } catch (err: any) {
      console.error('Error creating chapter:', err);
      toast.error('Could not create chapter', { description: err?.message || 'Please try again' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`animate-pulse h-11 bg-stone-200 rounded-studio border border-stone-300 ${className}`} />
    );
  }

  if (isCreating) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <input
          type="text"
          value={newChapterTitle}
          onChange={(e) => setNewChapterTitle(e.target.value)}
          placeholder="New Chapter Title..."
          className="flex-1 w-full rounded-studio border border-stone-400 focus:border-[#a05120] focus:outline-none text-xs h-11 px-3.5 bg-white text-[#111111] placeholder:text-stone-400"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateSubmit();
            } else if (e.key === 'Escape') {
              setIsCreating(false);
              setNewChapterTitle('');
            }
          }}
        />
        <button
          type="button"
          onClick={handleCreateSubmit}
          disabled={isSubmitting || !newChapterTitle.trim()}
          className="h-11 px-4 rounded-studio bg-[#a8f1e0] text-[#111111] font-bold text-xs hover:bg-[#9ee4a0] disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 shadow-sm"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-[#111111]" /> : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCreating(false);
            setNewChapterTitle('');
          }}
          className="h-11 px-3 rounded-studio bg-stone-200 border border-stone-300 text-stone-500 hover:text-[#111111] font-bold text-xs transition-colors shrink-0"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={value || 'none'}
        onChange={handleSelectChange}
        className="flex-1 w-full rounded-studio border border-stone-400 text-xs focus:border-[#a05120] focus:outline-none h-11 px-3.5 bg-white text-[#111111]"
      >
        <option value="none" className="bg-white text-[#111111]">No Chapter (General)</option>
        {chapters.map((ch) => (
          <option key={ch.id} value={ch.id} className="bg-white text-[#111111]">
            {ch.title}
          </option>
        ))}
        <option value="create_new" className="font-bold text-[#a05120] bg-white">
          + Create New Chapter...
        </option>
      </select>
      <button
        type="button"
        onClick={() => setIsCreating(true)}
        title="Add Chapter / Module"
        className="h-11 px-3.5 rounded-studio bg-stone-200 hover:bg-stone-300 border border-stone-300 text-[#a05120] font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
      >
        <PlusCircle className="h-3.5 w-3.5 text-[#a05120]" />
        <span className="inline">+ Chapter</span>
      </button>
    </div>
  );
}
