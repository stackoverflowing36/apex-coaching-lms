'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  CalendarCheck,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Sparkles,
  Loader2,
  Save,
  CheckCheck,
  ChevronRight,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import {
  getCourses,
  getAllStudents,
  getAttendanceByDate,
  saveAttendanceBatch,
} from '@/lib/supabase/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export const dynamic = 'force-dynamic';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentRosterItem {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: AttendanceStatus;
  remarks: string;
}

export default function TeacherAttendancePage() {
  const supabase = createClient();
  const todayStr = new Date().toISOString().split('T')[0];

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavedPreviously, setIsSavedPreviously] = useState(false);

  const loadCourses = useCallback(async () => {
    try {
      setLoading(true);
      const coursesData = await getCourses(supabase);
      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourseId((prev) => prev || coursesData[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load courses', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Load roster and existing attendance when course or date changes
  const loadRosterAndAttendance = useCallback(async () => {
    if (!selectedCourseId) return;
    try {
      setLoading(true);
      const [allStudents, existingAttendance] = await Promise.all([
        getAllStudents(supabase),
        getAttendanceByDate(supabase, selectedCourseId, selectedDate),
      ]);

      const attendanceMap = new Map<string, { status: AttendanceStatus; remarks: string }>();
      existingAttendance.forEach((rec: any) => {
        attendanceMap.set(rec.student_id, {
          status: rec.status as AttendanceStatus,
          remarks: rec.remarks || '',
        });
      });

      setIsSavedPreviously(existingAttendance.length > 0);

      const mergedRoster: StudentRosterItem[] = allStudents.map((st: any) => {
        const existing = attendanceMap.get(st.id);
        return {
          id: st.id,
          full_name: st.full_name || 'Enrolled Student',
          email: st.email || '',
          avatar_url: st.avatar_url,
          status: existing ? existing.status : 'present',
          remarks: existing ? existing.remarks : '',
        };
      });

      setRoster(mergedRoster);
    } catch (err: any) {
      toast.error('Could not load attendance roster', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, selectedDate, supabase]);

  useEffect(() => {
    loadRosterAndAttendance();
  }, [loadRosterAndAttendance]);

  // Change individual student status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, status } : item))
    );
  };

  // Change individual remarks
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((item) => (item.id === studentId ? { ...item, remarks } : item))
    );
  };

  // Mark all present
  const handleMarkAll = (status: AttendanceStatus) => {
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
    toast.info(`Marked all students as ${status.toUpperCase()}`);
  };

  // Save Attendance to Supabase
  const handleSaveAttendance = async () => {
    if (!selectedCourseId || !selectedDate) {
      toast.error('Please choose a batch and date');
      return;
    }
    if (roster.length === 0) {
      toast.error('No students in this batch');
      return;
    }

    try {
      setIsSaving(true);
      const recordsToSave = roster.map((item) => ({
        course_id: selectedCourseId,
        student_id: item.id,
        date: selectedDate,
        status: item.status,
        remarks: item.remarks ? item.remarks.trim() : undefined,
      }));

      await saveAttendanceBatch(supabase, recordsToSave);
      setIsSavedPreviously(true);
      toast.success('Attendance register saved successfully!', {
        description: `${roster.length} student records synchronized.`,
      });
    } catch (err: any) {
      toast.error('Failed to save attendance', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Derived metrics
  const totalStudents = roster.length;
  const presentCount = roster.filter((r) => r.status === 'present').length;
  const absentCount = roster.filter((r) => r.status === 'absent').length;
  const lateCount = roster.filter((r) => r.status === 'late').length;
  const attendanceRate =
    totalStudents > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalStudents) * 100) : 0;

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-studio bg-stone-100 text-[#a05120] border border-stone-300 flex items-center justify-center">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <h1 className="font-display font-bold uppercase text-2xl sm:text-3xl text-[#111111] tracking-tight">
              Classroom Attendance Register
            </h1>
          </div>
          <p className="text-xs uppercase tracking-wider font-semibold font-condensed text-stone-500">
            Log daily batch attendance, record leaves/absences, and synchronize records across student profiles.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || loading || roster.length === 0}
            className="rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] font-condensed font-bold uppercase tracking-wider text-xs h-10 px-6 shadow-sm transition-all"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving to Database...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {isSavedPreviously ? 'Update Register' : 'Save Attendance'}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Control Filters Bar (Batch Selector + Date Picker) */}
      <div className="studio-card p-5 bg-white border border-stone-200 rounded-studio space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
          
          {/* Batch Selector */}
          <div className="sm:col-span-6 space-y-1.5">
            <Label htmlFor="batchSelect" className="text-[10px] font-bold uppercase tracking-wider font-condensed text-rose-700">
              Classroom Batch
            </Label>
            <select
              id="batchSelect"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full h-10 rounded-studio border border-stone-300 bg-stone-50 px-3.5 text-xs font-semibold uppercase tracking-wider text-[#111111] focus:border-[#a05120] focus:outline-none"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-stone-50 text-[#111111]">
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="sm:col-span-4 space-y-1.5">
            <Label htmlFor="dateSelect" className="text-[10px] font-bold uppercase tracking-wider font-condensed text-rose-700">
              Session Date
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <Input
                id="dateSelect"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-10 h-10 rounded-studio text-xs font-medium bg-stone-50 border-stone-300 text-[#111111] focus:border-[#a05120]"
              />
            </div>
          </div>

          {/* Quick All-Present Button */}
          <div className="sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleMarkAll('present')}
              className="w-full h-10 rounded-studio border-stone-300 bg-stone-50 text-[#a05120] hover:bg-[#a8f1e0] hover:text-[#111111] text-xs font-bold font-condensed uppercase tracking-wider transition-all"
            >
              <CheckCheck className="h-4 w-4 mr-1.5" />
              All Present
            </Button>
          </div>

        </div>
      </div>

      {/* KPI Stats Bar (Architectural 1px Studio Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="studio-card p-4 bg-white border border-stone-200 rounded-studio">
          <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider font-condensed">Enrolled Students</div>
          <div className="font-display font-bold uppercase text-3xl text-[#111111] mt-1">
            {totalStudents}
          </div>
        </div>

        <div className="studio-card p-4 bg-white border border-stone-200 rounded-studio">
          <div className="text-[10px] font-bold text-[#a05120] uppercase tracking-wider font-condensed">Present Today</div>
          <div className="font-display font-bold uppercase text-3xl text-[#111111] mt-1">
            {presentCount}
          </div>
        </div>

        <div className="studio-card p-4 bg-white border border-stone-200 rounded-studio">
          <div className="text-[10px] font-bold text-rose-700 uppercase tracking-wider font-condensed">Absent</div>
          <div className="font-display font-bold uppercase text-3xl text-[#111111] mt-1">
            {absentCount}
          </div>
        </div>

        <div className="studio-card p-4 bg-white border border-stone-200 rounded-studio">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider font-condensed">Batch Attendance Rate</div>
          <div className="font-display font-bold uppercase text-3xl text-[#111111] mt-1">
            {attendanceRate}%
          </div>
        </div>
      </div>

      {/* Student Attendance Roster Table */}
      <div className="studio-card overflow-hidden space-y-4 p-5 sm:p-6 bg-white border border-stone-200 rounded-studio">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-4">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold uppercase text-base text-[#111111] tracking-tight">
              Student Register — {currentCourse?.code || 'Batch'}
            </h3>
            <p className="text-xs uppercase tracking-wider font-condensed text-stone-500">
              Date: <span className="font-bold text-[#111111]">{new Date(selectedDate).toDateString()}</span>
              {isSavedPreviously && (
                <span className="ml-2 inline-flex items-center gap-1 text-[#111111] font-bold text-[10px] bg-[#a8f1e0] px-2 py-0.5 rounded-studio uppercase tracking-wider font-condensed">
                  <CheckCircle2 className="h-3 w-3" />
                  Saved in Database
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleMarkAll('absent')}
              className="text-[11px] text-stone-400 hover:text-red-600 h-7 px-3 rounded-studio uppercase tracking-wider font-condensed font-bold"
            >
              Reset to Absent
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
            <div className="w-8 h-8 border-2 border-stone-200 border-t-[#a8f1e0] rounded-full animate-spin" />
            <p className="text-xs font-semibold uppercase tracking-wider font-condensed">Loading batch roster...</p>
          </div>
        ) : roster.length === 0 ? (
          <div className="py-12 text-center text-stone-400 space-y-2">
            <Users className="h-8 w-8 mx-auto text-stone-400" />
            <p className="text-xs font-semibold uppercase tracking-wider font-condensed text-stone-500">No students registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roster.map((student, idx) => {
              const initials = student.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);

              return (
                <div
                  key={student.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-[16px] bg-stone-50 border border-stone-300 hover:border-[#a05120]/40 transition-colors"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <span className="text-xs font-bold font-condensed text-stone-400 w-5 text-center">
                      {idx + 1}
                    </span>
                    <Avatar className="h-9 w-9 border border-stone-300">
                      <AvatarImage src={student.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-stone-100 text-[#a05120] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5 overflow-hidden">
                      <div className="font-semibold text-xs sm:text-sm text-[#111111] truncate">
                        {student.full_name}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate font-condensed">
                        {student.email}
                      </div>
                    </div>
                  </div>

                  {/* Status Selection Pills */}
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-studio border border-stone-300">
                    {(['present', 'absent', 'late', 'excused'] as AttendanceStatus[]).map(
                      (st) => {
                        const isCurrent = student.status === st;
                        let activeStyles = '';
                        if (st === 'present')
                          activeStyles = 'bg-[#a8f1e0] text-[#111111] shadow-sm';
                        if (st === 'absent')
                          activeStyles = 'bg-[#e2bcc2] text-[#111111] shadow-sm';
                        if (st === 'late')
                          activeStyles = 'bg-[#ffb956] text-[#111111] shadow-sm';
                        if (st === 'excused')
                          activeStyles = 'bg-[#9dc1ff] text-[#111111] shadow-sm';

                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(student.id, st)}
                            className={`px-3 py-1 rounded-studio text-[11px] font-bold uppercase tracking-wider font-condensed transition-all ${
                              isCurrent
                                ? activeStyles
                                : 'text-stone-400 hover:text-[#111111] hover:bg-stone-100'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* Remarks Input */}
                  <div className="w-full md:w-64">
                    <Input
                      placeholder="Remarks (e.g. medical, leave)..."
                      value={student.remarks}
                      onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                      className="h-8 rounded-studio text-xs bg-white border-stone-300 text-[#111111] placeholder:text-stone-400 focus:border-[#a05120]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Save Trigger */}
        <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs uppercase tracking-wider font-condensed text-stone-400">
            Records update immediately in students&apos; attendance portal.
          </span>
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || loading || roster.length === 0}
            className="rounded-studio bg-[#a8f1e0] hover:bg-[#9ee4a0] text-[#111111] font-condensed font-bold uppercase tracking-wider text-xs h-10 px-6 shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save & Synchronize Attendance'}
          </Button>
        </div>

      </div>

    </div>
  );
}
