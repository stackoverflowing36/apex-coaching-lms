'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  FileCheck,
  Award,
  LogOut,
  ChevronDown,
  GraduationCap,
  ArrowRightLeft,
  Compass,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/queries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StudentNotificationBell } from '@/components/notifications/StudentNotificationBell';
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
export const useStudentUser = () => useContext(UserContext);

const navRoutes = [
  {
    label: 'Dashboard',
    href: '/student/dashboard',
    icon: LayoutDashboard,
    description: 'Overview & academic progress',
  },
  {
    label: 'Lecture Vault',
    href: '/student/lectures',
    icon: Video,
    description: 'Class recordings & study notes',
  },
  {
    label: 'Assignment Submissions',
    href: '/student/assignments',
    icon: FileCheck,
    description: 'Upload homework & track deadlines',
  },
  {
    label: 'Grades & Performance',
    href: '/student/grades',
    icon: Award,
    description: 'Evaluated copies & scorecards',
  },
];

export default function StudentLayout({
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
          router.push('/login?role=student');
          return;
        }
        setUser(profile);
      } catch {
        router.push('/login?role=student');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login?role=student');
  };

  // Determine current active page label
  const activeRoute = navRoutes.find((r) =>
    r.href === '/student/dashboard'
      ? pathname === '/student/dashboard'
      : pathname.startsWith(r.href)
  ) || navRoutes[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#262626] border-t-[#a8f1e0] rounded-full animate-spin" />
          <p className="text-xs uppercase tracking-wider text-[#b7b7b5] font-semibold font-condensed">
            Loading Student Studio...
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
      .slice(0, 2) || 'ST';

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-[#0c0c0c] text-white flex flex-col">
        {/* ========== TOP STUDIO TASKBAR (Dropdown Navigation) ========== */}
        <nav className="sticky top-0 z-50 h-20 bg-[#0c0c0c]/90 backdrop-blur-md border-b border-[#262626] px-4 sm:px-6 lg:px-8">
          <div className="max-w-[1360px] mx-auto h-full flex items-center justify-between gap-4">
            
            {/* Left Side: Logo + Portal Identity Badge */}
            <div className="flex items-center gap-3">
              <Link href="/student/dashboard" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[14px] bg-[#181818] border border-[#383838] flex items-center justify-center text-[#a8f1e0] shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-display font-bold uppercase text-xl text-white tracking-tight">
                  EduFlow
                </span>
              </Link>

              <div className="hidden sm:flex items-center gap-2 bg-[#1c1c1c] text-[#a8f1e0] border border-[#333] rounded-[20px] px-3 py-1 text-xs uppercase tracking-widest font-semibold">
                <span className="flex h-1.5 w-1.5 rounded-full bg-[#a8f1e0] animate-pulse" />
                <span>STUDENT STUDIO</span>
              </div>
            </div>

            {/* Right/Center Control Group */}
            <div className="flex items-center gap-3">
              
              {/* 1. Primary Navigation Dropdown Menu */}
              <DropdownMenu open={navOpen} onOpenChange={setNavOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="bg-[#181818] hover:bg-[#222222] text-white border border-[#383838] rounded-[20px] px-4 sm:px-5 py-2.5 flex items-center gap-2.5 sm:gap-3 transition-colors shadow-sm focus:outline-none focus:border-[#a8f1e0]"
                    aria-label="Navigation Menu"
                  >
                    <Compass className="h-4 w-4 text-[#a8f1e0] shrink-0" />
                    <span className="font-semibold text-xs sm:text-sm tracking-wide truncate max-w-[140px] sm:max-w-none">
                      Menu: {activeRoute.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#b7b7b5] transition-transform duration-200 shrink-0 ${
                        navOpen ? 'rotate-180 text-[#a8f1e0]' : ''
                      }`}
                    />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-72 bg-[#141414] border border-[#383838] rounded-[20px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#988a79]">
                    Student Navigation
                  </div>

                  <div className="space-y-1">
                    {navRoutes.map((item) => {
                      const isActive =
                        item.href === '/student/dashboard'
                          ? pathname === '/student/dashboard'
                          : pathname.startsWith(item.href);
                      const Icon = item.icon;

                      return (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            onClick={() => setNavOpen(false)}
                            className={`flex items-start gap-3 p-2.5 rounded-[16px] transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#222222] text-[#a8f1e0] border border-[#383838]'
                                : 'text-white hover:bg-[#1a1a1a] hover:text-[#a8f1e0]'
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 mt-0.5 shrink-0 ${
                                isActive ? 'text-[#a8f1e0]' : 'text-[#b7b7b5]'
                              }`}
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold text-white leading-tight">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-[#988a79] leading-tight">
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

              {/* 2. Switch to Faculty Console View */}
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden md:flex items-center gap-1.5 rounded-[20px] border-[#383838] text-[#d4d4d4] hover:text-white bg-[#181818] hover:bg-[#222222] h-10 px-4 text-xs font-semibold uppercase tracking-wider shadow-none transition-all"
                title="Switch to Faculty Console"
              >
                <Link href="/teacher/dashboard">
                  <ArrowRightLeft className="h-3.5 w-3.5 text-[#8e8e8e]" />
                  <span>Faculty Console</span>
                </Link>
              </Button>

              {/* 3. Notifications */}
              <StudentNotificationBell studentId={user?.id} />

              {/* 4. User Profile & Quick Logout */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-[20px] hover:bg-[#1a1a1a] transition-colors border border-transparent hover:border-[#383838] focus:outline-none">
                    <Avatar className="h-8 w-8 border border-[#383838]">
                      <AvatarImage src={user?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-[#1c1c1c] text-[#a8f1e0] font-bold text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block text-xs font-semibold text-white max-w-[120px] truncate">
                      {user?.full_name}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#b7b7b5] hidden lg:block" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-64 bg-[#141414] border border-[#383838] text-white rounded-[20px] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="px-3 py-2 border-b border-[#262626]">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white truncate">
                        {user?.full_name}
                      </p>
                      <Badge variant="mint" className="text-[9px] px-1.5 py-0">
                        Student
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[#8e8e8e] truncate mt-0.5">
                      {user?.email}
                    </p>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/student/assignments"
                        className="rounded-[12px] text-[#d4d4d4] hover:text-white hover:bg-[#1f1f1f] cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium"
                      >
                        <FileCheck className="h-4 w-4 text-[#a8f1e0]" />
                        <span>My Submissions</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/student/grades"
                        className="rounded-[12px] text-[#d4d4d4] hover:text-white hover:bg-[#1f1f1f] cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium"
                      >
                        <Award className="h-4 w-4 text-[#ffb956]" />
                        <span>Performance &amp; Grades</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="bg-[#262626]" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-[12px] text-red-400 hover:text-red-300 hover:bg-red-950/30 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-medium"
                  >
                    <LogOut className="h-4 w-4 mr-1 text-red-400" />
                    <span>Sign out of Student Studio</span>
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
