'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  HelpCircle,
  CalendarCheck,
  Megaphone,
  LogOut,
  ChevronDown,
  GraduationCap,
  ExternalLink,
  Compass,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/queries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { FacultyNotificationBell } from '@/components/notifications/FacultyNotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

const UserContext = createContext<UserProfile | null>(null);
export const useUser = () => useContext(UserContext);
export const useTeacherUser = () => useContext(UserContext);

const navRoutes = [
  {
    label: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
    description: 'Real-time operations & metrics',
  },
  {
    label: 'Course & PDF Builder',
    href: '/teacher/courses',
    icon: Layers,
    description: 'Manage syllabus & study assets',
  },
  {
    label: 'Grading Station',
    href: '/teacher/grading',
    icon: CheckSquare,
    description: 'Evaluate student submissions',
  },
  {
    label: 'Quiz Engine',
    href: '/teacher/quizzes',
    icon: HelpCircle,
    description: 'Author & publish mock tests',
  },
  {
    label: 'Announcements',
    href: '/teacher/announcements',
    icon: Megaphone,
    description: 'Broadcast classroom alerts',
  },
  {
    label: 'Attendance Register',
    href: '/teacher/attendance',
    icon: CalendarCheck,
    description: 'Daily batch attendance register',
  },
];

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUser(supabase);
        if (!profile) {
          router.push('/login?role=teacher');
          return;
        }
        setUser(profile);
      } catch {
        router.push('/login?role=teacher');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login?role=teacher');
  };

  // Determine current active page label
  const activeRoute = navRoutes.find((r) =>
    r.href === '/teacher/dashboard'
      ? pathname === '/teacher/dashboard'
      : pathname.startsWith(r.href)
  ) || navRoutes[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbfa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-stone-200 border-t-[#a05120] rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-stone-400 font-semibold font-condensed">
            Opening Faculty Studio...
          </p>
        </div>
      </div>
    );
  }

  const initials =
    user?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'FC';

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-[#fbfbfa] text-[#111111] flex flex-col">
        {/* ========== TOP EDITORIAL TASKBAR (Dropdown Navigation) ========== */}
        <nav className="sticky top-0 z-50 h-20 bg-white/90 backdrop-blur-md border-b border-stone-200 px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1360px] mx-auto h-full flex items-center justify-between gap-4">
            
            {/* Left Side: Logo + Portal Identity Badge */}
            <div className="flex items-center gap-3">
              <Link href="/teacher/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[14px] bg-stone-900 flex items-center justify-center text-white shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-display font-bold uppercase text-xl text-[#111111] tracking-tight">
                  EduFlow
                </span>
              </Link>

              <div className="hidden sm:flex items-center gap-2 bg-[#a8f1e0] text-[#111111] rounded-pill px-3 py-1 text-xs uppercase tracking-widest font-semibold">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#111111] animate-pulse" />
                <span>FACULTY STUDIO</span>
              </div>
            </div>

            {/* Right/Center Control Group */}
            <div className="flex items-center gap-3">
              
              {/* 1. Primary Navigation Dropdown Menu */}
              <DropdownMenu open={navOpen} onOpenChange={setNavOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="bg-white hover:bg-stone-50 text-[#111111] border border-stone-300 rounded-pill px-4 sm:px-5 py-2.5 flex items-center gap-2.5 sm:gap-3 transition-colors shadow-sm focus:outline-none focus:border-[#a05120]"
                    aria-label="Navigation Menu"
                  >
                    <Compass className="h-4 w-4 text-[#a05120] shrink-0" />
                    <span className="font-semibold text-xs sm:text-sm tracking-wide truncate max-w-[140px] sm:max-w-none">
                      Menu: {activeRoute.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-stone-400 transition-transform duration-200 shrink-0 ${
                        navOpen ? 'rotate-180 text-[#a05120]' : ''
                      }`}
                    />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-72 bg-white border border-stone-200 rounded-studio shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Faculty Navigation
                  </div>

                  <div className="space-y-1">
                    {navRoutes.map((item) => {
                      const isActive =
                        item.href === '/teacher/dashboard'
                          ? pathname === '/teacher/dashboard'
                          : pathname.startsWith(item.href);
                      const Icon = item.icon;

                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            onClick={() => setNavOpen(false)}
                            className={`flex items-start gap-3 p-2.5 rounded-[16px] transition-all cursor-pointer ${
                              isActive
                                ? 'bg-stone-100 text-[#a05120] border border-stone-200'
                                : 'text-stone-700 hover:bg-stone-50 hover:text-[#a05120]'
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 mt-0.5 shrink-0 ${
                                isActive ? 'text-[#a05120]' : 'text-stone-400'
                              }`}
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-[#111111] leading-tight">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-stone-400 leading-tight">
                                {item.description}
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 2. Switch to Student Portal View */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-1.5 rounded-pill border-stone-300 text-stone-600 hover:text-[#a05120] bg-white hover:bg-stone-50 h-10 px-4 text-xs font-semibold uppercase tracking-wider shadow-none transition-all"
              >
                <Link href="/student/dashboard">
                  <span>Student View</span>
                  <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
                </Link>
              </Button>

              {/* 3. Real-time Faculty Notification Bell */}
              <FacultyNotificationBell />

              {/* 4. User Profile & Quick Logout */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-pill hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 focus:outline-none">
                    <Avatar className="h-8 w-8 border border-stone-200">
                      <AvatarImage src={user?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-stone-100 text-[#a05120] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block text-xs font-semibold text-[#111111] max-w-[110px] truncate">
                      {user?.full_name || 'Faculty Member'}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-stone-400 hidden lg:block" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-white border border-stone-200 text-stone-800 rounded-studio shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-[#111111] truncate">
                        {user?.full_name || 'Faculty Member'}
                      </p>
                      <Badge variant="rust" className="text-[9px] px-1.5 py-0">
                        Faculty
                      </Badge>
                    </div>
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/student/dashboard"
                        className="rounded-[12px] text-stone-600 hover:text-[#a05120] hover:bg-stone-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium"
                      >
                        <GraduationCap className="h-4 w-4 text-[#a05120]" />
                        <span>Switch to Student View</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/teacher/courses"
                        className="rounded-[12px] text-stone-600 hover:text-[#a05120] hover:bg-stone-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium"
                      >
                        <Layers className="h-4 w-4 text-stone-400" />
                        <span>Course &amp; PDF Builder</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="bg-stone-200" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-[12px] text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium"
                  >
                    <LogOut className="h-4 w-4 mr-1 text-red-500" />
                    <span>Sign out of Faculty Studio</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </nav>

        {/* ========== PAGE CONTENT ========== */}
        <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}
