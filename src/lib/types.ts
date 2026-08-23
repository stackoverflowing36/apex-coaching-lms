// ============================================================
// LMS Core Types
// ============================================================

export type UserRole = 'student' | 'teacher' | 'admin';
export type CourseLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type AssignmentStatus = 'pending' | 'submitted' | 'graded' | 'overdue';
export type LessonType = 'video' | 'reading' | 'quiz';
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  bio?: string;
  enrolledCourseIds?: string[];
  createdCourseIds?: string[];
  joinedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  longDescription?: string;
  instructor: string;
  instructorId: string;
  instructorAvatar: string;
  thumbnail: string;
  category: string;
  tags: string[];
  enrolledCount: number;
  moduleCount: number;
  duration: string;
  level: CourseLevel;
  progress?: number;
  rating?: number;
  reviewCount?: number;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  duration: string;
  content?: string;
  videoUrl?: string;
  completed?: boolean;
  order: number;
}

export interface Assignment {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
  status: AssignmentStatus;
  score?: number;
  feedback?: string;
  submittedAt?: string;
  attachments?: string[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  studentAvatar: string;
  submittedAt: string;
  fileUrl?: string;
  fileName?: string;
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded';
}

export interface Announcement {
  id: string;
  courseId: string;
  courseTitle: string;
  title: string;
  content: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string;
  priority: AnnouncementPriority;
}

export interface DashboardStats {
  totalCourses: number;
  completedLessons: number;
  pendingAssignments: number;
  averageScore: number;
}

export interface TeacherDashboardStats {
  totalCourses: number;
  totalStudents: number;
  pendingGrading: number;
  averageRating: number;
}

// Navigation
export interface NavLink {
  label: string;
  href: string;
  icon?: string;
}

// Toast action simulation
export interface ToastAction {
  title: string;
  description: string;
  variant?: 'default' | 'destructive';
}
