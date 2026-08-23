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
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Megaphone className="h-5 w-5" />
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Academic Notice Broadcast
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Send real-time alerts, class schedule changes, and test reminders to enrolled batches and the portal ticker.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Broadcast Composer (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 shadow-xl border border-slate-100 space-y-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600">
              <Radio className="h-4 w-4 animate-pulse" />
              <span>Live Broadcast Console</span>
            </div>
            <h2 className="font-heading font-extrabold text-xl text-slate-900">
              New Notice Announcement
            </h2>
            <p className="text-xs text-slate-500">
              Dispatches instantly to student dashboards and the public landing page ticker.
            </p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-4">
            
            {/* Target Batch Selector */}
            <div className="space-y-1.5">
              <Label htmlFor="targetBatch" className="text-xs font-bold text-slate-700">
                Target Audience
              </Label>
              <select
                id="targetBatch"
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">📢 All Institute Batches &amp; Public Notice</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <Label htmlFor="noticeTitle" className="text-xs font-bold text-slate-700">
                Headline / Subject
              </Label>
              <Input
                id="noticeTitle"
                placeholder="e.g. Schedule Change for Physics Mechanics Class"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-2xl h-11 text-xs font-medium"
                required
              />
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <Label htmlFor="noticeBody" className="text-xs font-bold text-slate-700">
                Notice Content &amp; Details
              </Label>
              <Textarea
                id="noticeBody"
                placeholder="Write the full announcement message here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="rounded-2xl min-h-[120px] text-xs resize-none"
                required
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
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
                    className="w-full text-left text-[11px] text-slate-600 hover:text-orange-700 bg-slate-50 hover:bg-orange-50 p-2 rounded-xl border border-slate-200/60 transition-colors truncate block"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Broadcast CTA */}
            <Button
              type="submit"
              disabled={isBroadcasting}
              className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-12 shadow-xl shadow-orange-600/25 transition-all mt-2"
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
            </Button>

          </form>
        </div>

        {/* Right Column: History of Sent Announcements (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Bell className="h-4 w-4 text-orange-600" />
              Broadcast History ({announcements.length})
            </h3>
            <span className="text-xs text-slate-400">Real-time synchronized</span>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-8 h-8 border-3 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading notice history...</p>
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-100 space-y-3">
              <Megaphone className="h-10 w-10 text-slate-300 mx-auto" />
              <h4 className="font-heading font-extrabold text-base text-slate-900">
                No Broadcasts Sent Yet
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Use the broadcast console on the left to send notifications to enrolled batch students.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {announcements.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-100 hover:border-orange-200 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                          {item.courses?.code || 'ALL BATCHES'}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-400">
                          {new Date(item.posted_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="font-heading font-extrabold text-base text-slate-900">
                        {item.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Announcement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/50">
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
