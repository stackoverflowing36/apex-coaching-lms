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
      <div className={`animate-pulse h-10 sm:h-11 bg-slate-100 rounded-xl border border-slate-200 ${className}`} />
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
          className="flex-1 w-full rounded-xl border-slate-200 text-base sm:text-xs focus:ring-orange-600 focus:border-orange-600 h-10 sm:h-11 px-3 bg-white"
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
          className="h-10 sm:h-11 px-4 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center justify-center shrink-0 shadow-sm"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCreating(false);
            setNewChapterTitle('');
          }}
          className="h-10 sm:h-11 px-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 transition-colors shrink-0"
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
        className="flex-1 w-full rounded-xl border-slate-200 text-base sm:text-xs focus:ring-orange-600 focus:border-orange-600 h-10 sm:h-11 px-3 bg-white"
      >
        <option value="none">No Chapter (General)</option>
        {chapters.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.title}
          </option>
        ))}
        <option value="create_new" className="font-bold text-orange-600">
          + Create New Chapter...
        </option>
      </select>
      <button
        type="button"
        onClick={() => setIsCreating(true)}
        title="Add Chapter / Module"
        className="h-10 sm:h-11 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0"
      >
        <PlusCircle className="h-3.5 w-3.5 text-orange-600" />
        <span className="inline">+ Chapter</span>
      </button>
    </div>
  );
}
