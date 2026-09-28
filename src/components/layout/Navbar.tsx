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
      <div className="w-full max-w-[1360px] bg-[#fbfbfa]/90 backdrop-blur-md border border-stone-200/80 shadow-studio rounded-pill px-5 py-2.5 flex items-center justify-between pointer-events-auto transition-all duration-300">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 pl-1 group">
          <div className="h-9 w-9 rounded-full bg-[#111111] flex items-center justify-center text-[#fbfbfa] shadow-sm group-hover:bg-[#a05120] transition-colors">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold uppercase text-lg text-[#111111] tracking-tight flex items-center gap-1.5 leading-none">
              EduFlow
              <span className="h-1.5 w-1.5 rounded-full bg-[#a05120] inline-block"></span>
            </span>
            <span className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mt-0.5">
              Academic Studio
            </span>
          </div>
        </Link>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-4 py-1.5 text-xs sm:text-sm font-medium text-stone-600 hover:text-[#111111] hover:bg-[#f3f1ec] rounded-pill transition-colors"
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
              className="rounded-pill border-stone-300 bg-transparent text-stone-800 hover:border-[#a05120] hover:text-[#a05120] text-xs font-medium px-4 h-9"
            >
              Student Portal
            </Button>
          </Link>
          <Link href="/login?role=teacher">
            <Button
              size="sm"
              className="rounded-pill bg-[#a05120] hover:bg-[#854218] text-white text-xs font-medium px-5 h-9 shadow-sm"
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
              className="rounded-pill bg-[#a05120] hover:bg-[#854218] text-white text-xs font-medium px-3.5 h-8"
            >
              Login
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-stone-700 hover:text-stone-900 rounded-full hover:bg-stone-100"
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
