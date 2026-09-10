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
  Sparkles,
  Menu,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/queries';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
export const useTeacherUser = () => useContext(UserContext);

const navLinks = [
  { label: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Course Builder', href: '/teacher/courses', icon: Layers },
  { label: 'Grading Station', href: '/teacher/grading', icon: CheckSquare },
  { label: 'Quiz Engine', href: '/teacher/quizzes', icon: HelpCircle },
  { label: 'Attendance', href: '/teacher/attendance', icon: CalendarCheck },
  { label: 'Announcements', href: '/teacher/announcements', icon: Megaphone },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Opening Faculty Console...</p>
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
      <div className="min-h-screen bg-slate-50/80">
        {/* ========== TOP NAVIGATION ========== */}
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm shadow-slate-900/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              
              {/* Logo + Faculty Console Badge */}
              <div className="flex items-center gap-3">
                <Link href="/teacher/dashboard" className="flex items-center gap-2.5 group">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-heading font-extrabold text-base text-slate-900 leading-none flex items-center gap-1.5">
                      EduFlow
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block"></span>
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                      Faculty Portal
                    </span>
                  </div>
                </Link>

                <div className="hidden lg:flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80">
                  <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-xs font-bold text-orange-700">Faculty / Admin Mode</span>
                </div>
              </div>

              {/* Desktop Nav Tabs */}
              <div className="hidden md:flex items-center gap-1 bg-slate-100/80 rounded-full p-1 border border-slate-200/50">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || (pathname.startsWith(link.href + '/') && link.href !== '/teacher');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-orange-700 shadow-sm shadow-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                {/* Switch to Student Portal */}
                <Link href="/student/dashboard" className="hidden sm:block">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 text-xs font-semibold h-8 gap-1.5"
                  >
                    <span>Student View</span>
                    <ExternalLink className="h-3 w-3 text-slate-400" />
                  </Button>
                </Link>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1 rounded-full hover:bg-slate-100 transition-colors">
                      <Avatar className="h-8 w-8 border-2 border-orange-300">
                        <AvatarImage src={user?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 font-bold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-xs font-bold text-slate-800 max-w-[110px] truncate">
                        {user?.full_name || 'Faculty Member'}
                      </span>
                      <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 shadow-xl border-slate-200">
                    <div className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{user?.full_name}</p>
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 text-[10px] px-1.5 py-0 border-orange-200">
                          Faculty
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/student/dashboard"
                        className="rounded-xl text-slate-700 focus:bg-slate-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                      >
                        <GraduationCap className="h-4 w-4 text-emerald-600" />
                        Switch to Student View
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/teacher/courses"
                        className="rounded-xl text-slate-700 focus:bg-slate-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                      >
                        <Layers className="h-4 w-4 text-orange-600" />
                        Manage Course Syllabus
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-xl text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-semibold"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
                      Sign out of Faculty Console
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                  aria-label="Toggle navigation"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl">
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || (pathname.startsWith(link.href + '/') && link.href !== '/teacher');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-orange-50 text-orange-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-slate-100">
                  <Link
                    href="/student/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50"
                  >
                    <span>Switch to Student View</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* ========== MAIN CONTENT CONTAINER ========== */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}
