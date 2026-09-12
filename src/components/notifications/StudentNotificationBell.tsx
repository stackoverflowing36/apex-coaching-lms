'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  GraduationCap,
  FileCheck,
  Layers,
  Sparkles,
  Clock,
  ExternalLink,
  Trash2,
  BookOpen,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getStudentNotifications,
  markNotificationsAsRead,
  deleteNotification,
  type NotificationItem,
} from '@/lib/supabase/queries';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
}

interface StudentNotificationBellProps {
  studentId?: string;
}

export function StudentNotificationBell({ studentId }: StudentNotificationBellProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedStudentId, setResolvedStudentId] = useState<string | undefined>(studentId);
  const supabase = React.useMemo(() => createClient(), []);

  // Resolve student id if not passed directly
  useEffect(() => {
    if (studentId) {
      setResolvedStudentId(studentId);
      return;
    }
    async function getSessionUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          setResolvedStudentId(session.user.id);
        }
      } catch (err) {
        console.warn('Could not resolve student user id for notifications:', err);
      }
    }
    getSessionUser();
  }, [studentId, supabase]);

  const fetchLatest = useCallback(async () => {
    try {
      const items = await getStudentNotifications(supabase, resolvedStudentId, 25);
      setNotifications(items);
    } catch (err) {
      console.warn('Error fetching student notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase, resolvedStudentId]);

  useEffect(() => {
    fetchLatest();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('student-notifications-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const newNotif = payload.new as NotificationItem;
          // Show if targeted to this student or broadcast (user_id is null)
          if (!newNotif.user_id || newNotif.user_id === resolvedStudentId) {
            setNotifications((prev) => [newNotif, ...prev]);

            toast.info(newNotif.title, {
              description: newNotif.message,
              icon: '🔔',
              duration: 6000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
        },
        (payload: any) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchLatest, resolvedStudentId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markNotificationsAsRead(supabase);
    toast.success('All notifications marked as read');
  };

  const handleDeleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(supabase, id);
    toast.success('Notification removed');
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
      await markNotificationsAsRead(supabase, [item.id]);
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'grading_completed':
        return (
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
            <FileCheck className="h-4 w-4" />
          </div>
        );
      case 'assignment_created':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="h-4 w-4" />
          </div>
        );
      case 'batch_enrolled':
        return (
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="h-4 w-4" />
          </div>
        );
      case 'quiz_created':
      case 'quiz_attempted':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
        );
      case 'lecture_created':
        return (
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-xs">
            <Video className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
            <Bell className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
          aria-label="Student Notifications"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-600 text-white text-[9px] font-extrabold items-center justify-center shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 rounded-2xl p-0 shadow-2xl border-slate-200/90 overflow-hidden bg-white z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-emerald-50/40 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-heading font-bold text-sm text-slate-900">Notifications</span>
            {unreadCount > 0 && (
              <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-700">No notifications yet</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Updates regarding your assignments, lectures, and grades will appear here.
              </p>
            </div>
          ) : (
            notifications.map((item) => {
              let targetHref: string | null = null;
              if (item.type === 'grading_completed' || item.type === 'assignment_created') {
                targetHref = '/student/assignments';
              } else if (item.type === 'quiz_created' || item.type === 'quiz_attempted') {
                targetHref = '/student/quizzes';
              } else if (item.type === 'lecture_created') {
                targetHref = '/student/lectures';
              } else if (item.type === 'batch_enrolled') {
                targetHref = '/student/courses';
              }

              const content = (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative flex items-start gap-3 p-3 transition-colors cursor-pointer text-left hover:bg-slate-50/80 ${
                    !item.is_read ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  {getItemIcon(item.type)}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs truncate ${
                          !item.is_read
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed line-clamp-2">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    {!item.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <button
                      type="button"
                      title="Delete notification"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDeleteNotification(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );

              return targetHref ? (
                <Link
                  key={item.id}
                  href={targetHref}
                  onClick={() => {
                    handleItemClick(item);
                    setIsOpen(false);
                  }}
                  className="block"
                >
                  {content}
                </Link>
              ) : (
                content
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time channel active</span>
          </div>
          <Link
            href="/student/assignments"
            onClick={() => setIsOpen(false)}
            className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>My Assignments</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
