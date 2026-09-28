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
    { label: 'Digital Grading', href: '/login?role=teacher', icon: Layers },
    { label: 'Announcements', href: '/login?role=student', icon: Bell },
  ];

  return (
    <header className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 sm:px-6 pointer-events-none">
      <div className="w-full max-w-[1360px] bg-[#111111]/80 hover:bg-[#111111]/90 backdrop-blur-md border border-white/15 shadow-2xl rounded-pill px-5 sm:px-6 py-2.5 flex items-center justify-between pointer-events-auto transition-all duration-300">
        
        {/* Brand Logo - Inspired by example editorial logo style, branded as EduFlow */}
        <Link href="/" className="flex items-center gap-3 pl-1 group">
          <div className="h-8 w-8 rounded-pill bg-white text-[#111111] flex items-center justify-center font-display font-extrabold text-sm shadow-sm group-hover:bg-[#a05120] group-hover:text-white transition-colors">
            E
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold uppercase text-lg text-white tracking-wider flex items-center gap-1.5 leading-none">
              EduFlow
              <span className="h-1.5 w-1.5 rounded-full bg-[#a05120] inline-block"></span>
            </span>
            <span className="text-[9px] font-condensed font-semibold text-stone-400 uppercase tracking-widest mt-0.5">
              Coaching &amp; Academic LMS
            </span>
          </div>
        </Link>

        {/* Center Links with subtle dropdown carets like example website */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="px-3.5 py-1.5 text-xs font-condensed uppercase tracking-wider font-semibold text-stone-300 hover:text-white hover:bg-white/10 rounded-pill transition-colors flex items-center gap-1"
            >
              <span>{link.label}</span>
              <span className="text-[10px] text-stone-400 opacity-60">▾</span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link href="/login?role=student">
            <Button
              variant="outline"
              size="sm"
              className="rounded-pill border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white text-xs font-condensed font-bold uppercase tracking-wider px-4 h-9 backdrop-blur-sm"
            >
              Student Portal
            </Button>
          </Link>
          <Link href="/login?role=teacher">
            <Button
              size="sm"
              className="rounded-pill bg-[#a05120] hover:bg-[#864319] text-white text-xs font-condensed font-bold uppercase tracking-wider px-5 h-9 shadow-md transition-all"
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
              className="rounded-pill bg-[#a05120] hover:bg-[#864319] text-white text-xs font-condensed uppercase tracking-wider px-3 h-8"
            >
              Login
            </Button>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-x-4 top-16 bg-[#111111] border border-stone-800 rounded-studio p-5 shadow-2xl pointer-events-auto space-y-4 animate-in fade-in slide-in-from-top-4 duration-200 text-white">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2.5 text-xs font-condensed uppercase tracking-wider font-semibold text-stone-300 hover:text-white hover:bg-white/10 rounded-pill transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <link.icon className="h-4 w-4 text-[#a05120]" />
                  <span>{link.label}</span>
                </div>
                <span className="text-stone-500">→</span>
              </Link>
            ))}
          </div>
          <div className="pt-3 border-t border-stone-800 flex flex-col gap-2">
            <Link href="/login?role=student" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full rounded-pill border-stone-700 text-white hover:bg-white/10 text-xs font-condensed uppercase tracking-wider">
                Student Portal
              </Button>
            </Link>
            <Link href="/login?role=teacher" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full rounded-pill bg-[#a05120] hover:bg-[#864319] text-white text-xs font-condensed uppercase tracking-wider">
                Faculty Login
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
