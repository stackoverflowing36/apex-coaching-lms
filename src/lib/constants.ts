import type { NavLink } from './types';

// ============================================================
// APP CONFIG
// ============================================================

export const APP_NAME = 'EduFlow';
export const APP_TAGLINE = 'Transform your learning experience.';
export const APP_DESCRIPTION =
  'EduFlow makes it easy to create, manage, and deliver engaging online courses. Built for educators and learners who demand excellence.';

// ============================================================
// NAVIGATION
// ============================================================

export const landingNavLinks: NavLink[] = [
  { label: 'Features', href: '#features' },
  { label: 'Courses', href: '#courses' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'About', href: '#about' },
];

export const studentNavLinks: NavLink[] = [
  { label: 'Dashboard', href: '/student', icon: 'LayoutDashboard' },
  { label: 'My Courses', href: '/student/courses', icon: 'BookOpen' },
  { label: 'Assignments', href: '/student/assignments', icon: 'ClipboardList' },
  { label: 'Schedule', href: '/student/schedule', icon: 'Calendar' },
  { label: 'Messages', href: '/student/messages', icon: 'MessageSquare' },
];

export const teacherNavLinks: NavLink[] = [
  { label: 'Dashboard', href: '/teacher', icon: 'LayoutDashboard' },
  { label: 'Courses', href: '/teacher/courses', icon: 'BookOpen' },
  { label: 'Grading', href: '/teacher/grading', icon: 'CheckSquare' },
  { label: 'Announcements', href: '/teacher/announcements', icon: 'Megaphone' },
  { label: 'Analytics', href: '/teacher/analytics', icon: 'BarChart3' },
];

// ============================================================
// CATEGORIES
// ============================================================

export const courseCategories = [
  'All',
  'Development',
  'Data Science',
  'Design',
  'Business',
  'Marketing',
] as const;

// ============================================================
// LANDING PAGE FLOATING CARDS
// ============================================================

export const heroFloatingCards = [
  {
    icon: 'Upload',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    title: 'Lecture Uploaded',
    subtitle: 'React & Next.js — Module 3',
    hasCheck: true,
  },
  {
    icon: 'ClipboardCheck',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Assignment Graded',
    subtitle: 'Portfolio Site — 92/100',
    hasCheck: true,
  },
  {
    icon: 'TrendingUp',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    title: 'Progress Updated',
    subtitle: 'Course completion: 87%',
    hasCheck: false,
  },
  {
    icon: 'Bell',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    title: 'New Announcement',
    subtitle: 'Mid-semester guidelines posted',
    hasCheck: false,
  },
];

// ============================================================
// FEATURES
// ============================================================

export const features = [
  {
    icon: 'GraduationCap',
    title: 'Interactive Learning',
    description:
      'Engage students with video lectures, quizzes, and hands-on assignments that make learning active and effective.',
  },
  {
    icon: 'BarChart3',
    title: 'Progress Analytics',
    description:
      'Track student performance in real-time with intuitive dashboards, completion rates, and grade distributions.',
  },
  {
    icon: 'Users',
    title: 'Collaborative Spaces',
    description:
      'Foster discussion with course forums, peer reviews, and group projects that build community.',
  },
  {
    icon: 'Shield',
    title: 'Secure & Reliable',
    description:
      'Enterprise-grade security with role-based access, encrypted data, and 99.9% uptime guarantee.',
  },
  {
    icon: 'Smartphone',
    title: 'Mobile Friendly',
    description:
      'Learn anywhere with a fully responsive design that works beautifully on phones, tablets, and desktops.',
  },
  {
    icon: 'Zap',
    title: 'Instant Feedback',
    description:
      'Auto-grading for quizzes and real-time notifications keep students informed and instructors efficient.',
  },
];
