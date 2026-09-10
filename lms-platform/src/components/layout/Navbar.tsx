'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  GraduationCap, 
  Menu, 
  X, 
  Layers, 
  BookOpen, 
  Video, 
  Bell, 
  LogIn,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Batches', href: '/login?role=student', icon: Layers },
    { label: 'Curriculum', href: '/login?role=student', icon: BookOpen },
    { label: 'Lecture Vault', href: '/login?role=student', icon: Video },
    { label: 'Announcements', href: '/login?role=student', icon: Bell },
  ];

  return (
    <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="w-full max-w-5xl bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-sm shadow-slate-900/5 rounded-full px-4 py-2 flex items-center justify-between pointer-events-auto transition-all duration-300">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 pl-2 group">
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-extrabold text-base text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
              EduFlow
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
              Academic LMS
            </span>
          </div>
        </Link>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 rounded-full transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link href="/login?role=student">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-xs font-semibold px-4 h-9"
            >
              Student Portal
            </Button>
          </Link>
          <Link href="/login?role=teacher">
            <Button
              size="sm"
              className="rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-4.5 h-9 shadow-sm shadow-orange-600/20"
            >
              Faculty Login
            </Button>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex sm:hidden items-center gap-2">
          <Link href="/login">
            <Button
              size="sm"
              className="rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 h-8"
            >
              Login
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-x-4 top-20 bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl pointer-events-auto space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-2xl transition-colors flex items-center gap-2.5"
              >
                <link.icon className="h-4 w-4 text-slate-400" />
                {link.label}
              </Link>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link href="/login?role=student" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full rounded-full text-slate-700 border-slate-300 text-xs">
                Student Portal
              </Button>
            </Link>
            <Link href="/login?role=teacher" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white text-xs">
                Faculty Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
