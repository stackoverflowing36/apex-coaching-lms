'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Bell,
  Clock,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
  Layers,
  AlertCircle,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const noticePresets = [
  '🚨 Extra Doubts & Problem Solving Session scheduled for tomorrow at 5 PM.',
  '📅 Mock Test Series #3 syllabus uploaded. Please review the formula sheet.',
  '⚠️ Homework assignment submission deadline extended till Sunday 11:59 PM.',
  '📢 Next week classroom timings updated for Advanced Batch.',
];

export const dynamic = 'force-dynamic';

export default function TeacherAnnouncementsPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [targetCourseId, setTargetCourseId] = useState<string>('all');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesData, announcementsData] = await Promise.all([
        getCourses(supabase),
        getAnnouncements(supabase),
      ]);

      setCourses(coursesData);
      setAnnouncements(announcementsData);
    } catch (err: any) {
      toast.error('Failed to load announcements', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();

    // Subscribe to announcements real-time
    const channel = supabase
      .channel('teacher-announcements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData, supabase]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Please enter announcement title and notice message');
      return;
    }

    try {
      setIsBroadcasting(true);
      await createAnnouncement(supabase, {
        course_id: targetCourseId === 'all' ? null : targetCourseId,
        title: title.trim(),
        content: content.trim(),
      });

      toast.success('Announcement broadcasted live to students & portal!');
      setTitle('');
      setContent('');
      loadData();
    } catch (err: any) {
      toast.error('Failed to broadcast notice', { description: err.message });
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;
    try {
      await deleteAnnouncement(supabase, id);
      toast.success('Notice deleted');
      loadData();
    } catch (err: any) {
      toast.error('Could not delete notice', { description: err.message });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[20px] bg-[#1c1c1c] text-[#a8f1e0] border border-[#383838] flex items-center justify-center">
              <Megaphone className="h-4 w-4" />
            </div>
            <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-white tracking-tight">
              Academic Notice Broadcast
            </h1>
          </div>
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#b7b7b5]">
            Send real-time alerts, class schedule changes, and test reminders to enrolled batches and the portal ticker.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Broadcast Composer (5 cols) */}
        <div className="lg:col-span-5 studio-card p-6 sm:p-7 bg-[#141414] border border-[#262626] rounded-[20px] space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#a8f1e0]">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Live Broadcast Console</span>
            </div>
            <h2 className="font-display font-bold uppercase text-xl text-white tracking-tight">
              New Notice Announcement
            </h2>
            <p className="text-xs text-[#b7b7b5] font-condensed">
              Dispatches instantly to student dashboards and the public landing page ticker.
            </p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            
            {/* Target Batch Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="targetBatch" className="text-xs font-semibold uppercase tracking-wider text-[#e2bcc2] font-condensed">
                Target Audience
              </Label>
              <select
                id="targetBatch"
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full h-10 rounded-[20px] border border-[#383838] bg-[#181818] px-3.5 text-xs font-semibold uppercase tracking-wider text-white focus:border-[#a8f1e0] focus:outline-none"
              >
                <option value="all" className="bg-[#181818] text-white">📢 All Institute Batches &amp; Public Notice</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#181818] text-white">
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <Label htmlFor="noticeTitle" className="text-xs font-semibold uppercase tracking-wider text-[#e2bcc2] font-condensed">
                Headline / Subject
              </Label>
              <Input
                id="noticeTitle"
                placeholder="e.g. Schedule Change for Physics Mechanics Class"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-[20px] h-10 text-xs border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
                required
              />
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="noticeBody" className="text-xs font-semibold uppercase tracking-wider text-[#e2bcc2] font-condensed">
                Notice Content &amp; Details
              </Label>
              <Textarea
                id="noticeBody"
                placeholder="Write the full announcement message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-[20px] min-h-[120px] text-xs resize-none border-[#383838] bg-[#181818] text-white placeholder:text-[#737373] focus:border-[#a8f1e0]"
                required
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-[#8e8e8e] uppercase tracking-wider font-condensed">
                Quick Template Inserts:
              </span>
              <div className="space-y-1">
                {noticePresets.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      if (!title) setTitle(preset.slice(2, 40) + '...');
                      setContent(preset);
                    }}
                    className="w-full text-left text-[11px] text-[#d4d4d4] hover:text-white bg-[#181818] hover:bg-[#202020] p-2.5 rounded-[16px] border border-[#383838] hover:border-[#a8f1e0]/50 transition-colors truncate block"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast CTA */}
            <button
              type="submit"
              disabled={isBroadcasting}
              className="w-full bg-[#a8f1e0] text-[#0c0c0c] hover:bg-[#9ee4a0] rounded-[20px] text-xs font-bold uppercase tracking-wider py-3 flex items-center justify-center gap-2 mt-2 transition-all"
            >
              {isBroadcasting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Broadcasting to Portal...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" />
                  Broadcast Live Notice
                </span>
              )}
            </button>

          </form>
        </div>

        {/* Right Column: History of Sent Announcements (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold uppercase text-base text-white flex items-center gap-2 tracking-tight">
              <Bell className="h-4 w-4 text-[#a8f1e0]" />
              Broadcast History ({announcements.length})
            </h3>
            <span className="text-xs uppercase tracking-wider font-semibold font-condensed text-[#8e8e8e]">Real-time synchronized</span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#8e8e8e] gap-3">
              <div className="w-8 h-8 border-2 border-[#262626] border-t-[#a8f1e0] rounded-full animate-spin" />
              <p className="text-xs uppercase tracking-wider font-semibold font-condensed">Loading notice history...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="studio-card p-12 text-center space-y-3 bg-[#141414] border border-[#262626] rounded-[20px]">
              <Megaphone className="h-10 w-10 text-[#8e8e8e] mx-auto" />
              <h4 className="font-display font-bold uppercase text-base text-white tracking-tight">
                No Broadcasts Sent Yet
              </h4>
              <p className="text-xs text-[#8e8e8e] max-w-sm mx-auto">
                Use the broadcast console on the left to send notifications to enrolled batch students.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="studio-card p-5 sm:p-6 bg-[#141414] border border-[#262626] rounded-[20px] hover:border-[#a8f1e0]/40 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="mint" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                          {item.courses?.code || 'ALL BATCHES'}
                        </Badge>
                        <span className="text-[10px] font-semibold text-[#8e8e8e] font-condensed uppercase tracking-wider">
                          {new Date(item.posted_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="font-display font-bold uppercase text-base text-white tracking-tight">
                        {item.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-[20px] text-[#8e8e8e] hover:text-[#ff6b6b] hover:bg-[#2a1717] transition-colors"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-white whitespace-pre-line leading-relaxed bg-[#181818] p-3.5 rounded-[16px] border border-[#383838]">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
