'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Video,
  FileText,
  Award,
  LogOut,
  ChevronDown,
  GraduationCap,
  Menu,
  X,
  ArrowRightLeft,
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
import { StudentNotificationBell } from '@/components/notifications/StudentNotificationBell';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

const UserContext = createContext<UserProfile | null>(null);
export const useUser = () => useContext(UserContext);

const navLinks = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Lectures', href: '/student/lectures', icon: Video },
  { label: 'Assignments', href: '/student/assignments', icon: FileText },
  { label: 'Grades', href: '/student/grades', icon: Award },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUser(supabase);
        if (!profile) {
          router.push('/login');
          return;
        }
        setUser(profile);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading portal...</p>
        </div>
      </div>
    );
  }

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'ST';

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-[#fbfbfa] text-[#111111]">
        {/* ========== TOP NAVIGATION (Studio Shell) ========== */}
        <nav className="sticky top-0 z-50 bg-[#fbfbfa]/90 backdrop-blur-xl border-b border-stone-200">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo + Batch Indicator */}
              <div className="flex items-center gap-3">
                <Link href="/student/dashboard" className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#111111] flex items-center justify-center text-white shadow-sm">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                  <span className="font-display font-bold uppercase text-lg text-[#111111] hidden sm:block tracking-tight">
                    EduFlow
                  </span>
                </Link>
                <div className="hidden md:flex items-center gap-1.5 ml-2 px-3 py-0.5 rounded-pill bg-[#a8f1e0] text-[#111111]">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#111111] animate-pulse" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">Student Studio</span>
                </div>
              </div>

              {/* Desktop Nav Tabs (Capsule) */}
              <div className="hidden md:flex items-center gap-1 bg-[#f3f1ec] rounded-pill p-1 border border-stone-200">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || pathname.startsWith(link.href + '/');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-pill text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                        isActive
                          ? 'bg-[#111111] text-[#fbfbfa]'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-3">
                {/* Faculty Portal Switcher */}
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 rounded-pill border-stone-300 text-stone-800 bg-white hover:bg-stone-50 hover:border-[#a05120] hover:text-[#a05120] h-8 text-xs font-medium shadow-none transition-all"
                  title="Switch to Faculty Console"
                >
                  <Link href="/teacher/dashboard">
                    <ArrowRightLeft className="h-3 w-3" />
                    <span className="hidden sm:inline">Faculty Console</span>
                    <span className="sm:hidden">Faculty</span>
                  </Link>
                </Button>

                {/* Notifications */}
                <StudentNotificationBell studentId={user?.id} />

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-2 py-1.5 rounded-pill hover:bg-stone-100 transition-colors">
                      <Avatar className="h-8 w-8 border border-stone-300">
                        <AvatarImage src={user?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-[#111111] text-[#fbfbfa] font-semibold text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-xs font-medium text-stone-800 max-w-[120px] truncate">
                        {user?.full_name}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-stone-400 hidden sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-studio p-1.5 border border-stone-200 shadow-studio">
                    <div className="px-3 py-2">
                      <p className="text-sm font-semibold text-stone-900">{user?.full_name}</p>
                      <p className="text-xs text-stone-500 truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/teacher/dashboard"
                        className="rounded-pill text-[#a05120] focus:bg-[#a05120]/10 cursor-pointer flex items-center gap-2 px-3 py-2 text-xs font-bold"
                      >
                        <ArrowRightLeft className="h-4 w-4 text-[#a05120]" />
                        Switch to Faculty Console
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="rounded-pill text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100"
                >
                  {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-stone-200 bg-[#fbfbfa]">
              <div className="px-4 py-3 space-y-1">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href || pathname.startsWith(link.href + '/');
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-studio text-xs font-semibold uppercase tracking-wider transition-all ${
                        isActive
                          ? 'bg-[#111111] text-[#fbfbfa]'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
                <div className="pt-2 border-t border-stone-200">
                  <Link
                    href="/teacher/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-studio text-xs font-semibold uppercase tracking-wider text-[#a05120] bg-[#a05120]/10 hover:bg-[#a05120]/20 transition-all border border-[#a05120]/30"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Switch to Faculty Console
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* ========== PAGE CONTENT ========== */}
        <main className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </div>
    </UserContext.Provider>
  );
}
