import type {
  User,
  Course,
  Module,
  Assignment,
  Submission,
  Announcement,
  DashboardStats,
  TeacherDashboardStats,
} from './types';

// ============================================================
// USERS
// ============================================================

export const users: User[] = [
  {
    id: 'user-teacher-1',
    name: 'Dr. Sarah Chen',
    email: 'sarah.chen@eduflow.com',
    role: 'teacher',
    avatar: '/avatars/sarah.jpg',
    bio: 'Associate Professor of Computer Science with 12 years of industry experience at Google and Meta. Passionate about making complex topics accessible.',
    createdCourseIds: ['course-1', 'course-2', 'course-4'],
    joinedAt: '2024-01-15',
  },
  {
    id: 'user-teacher-2',
    name: 'Prof. Marcus Webb',
    email: 'marcus.webb@eduflow.com',
    role: 'teacher',
    avatar: '/avatars/marcus.jpg',
    bio: 'UX Design lead with a background in cognitive psychology. Former Design Director at Spotify.',
    createdCourseIds: ['course-3'],
    joinedAt: '2024-02-20',
  },
  {
    id: 'user-student-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@student.eduflow.com',
    role: 'student',
    avatar: '/avatars/alex.jpg',
    bio: 'Computer Science junior interested in full-stack development and machine learning.',
    enrolledCourseIds: ['course-1', 'course-2', 'course-3'],
    joinedAt: '2024-03-10',
  },
  {
    id: 'user-student-2',
    name: 'Jordan Park',
    email: 'jordan.park@student.eduflow.com',
    role: 'student',
    avatar: '/avatars/jordan.jpg',
    bio: 'Graduate student in Data Science. Loves building data-driven products.',
    enrolledCourseIds: ['course-2', 'course-4'],
    joinedAt: '2024-03-22',
  },
  {
    id: 'user-student-3',
    name: 'Priya Sharma',
    email: 'priya.sharma@student.eduflow.com',
    role: 'student',
    avatar: '/avatars/priya.jpg',
    bio: 'Aspiring mobile developer with a keen interest in cross-platform frameworks.',
    enrolledCourseIds: ['course-1', 'course-4'],
    joinedAt: '2024-04-05',
  },
];

export const currentStudent = users.find((u) => u.id === 'user-student-1')!;
export const currentTeacher = users.find((u) => u.id === 'user-teacher-1')!;

// ============================================================
// COURSES
// ============================================================

export const courses: Course[] = [
  {
    id: 'course-1',
    title: 'Full-Stack Web Development',
    description:
      'Master modern web development from front to back. Build real-world apps with React, Next.js, Node.js, and PostgreSQL.',
    longDescription:
      'This comprehensive course takes you from HTML & CSS fundamentals to deploying production-ready full-stack applications. You will learn React, Next.js App Router, RESTful APIs, database design with PostgreSQL, authentication patterns, and deployment to Vercel. Each module includes hands-on projects reviewed by the instructor.',
    instructor: 'Dr. Sarah Chen',
    instructorId: 'user-teacher-1',
    instructorAvatar: '/avatars/sarah.jpg',
    thumbnail: '/courses/webdev.jpg',
    category: 'Development',
    tags: ['React', 'Next.js', 'Node.js', 'PostgreSQL'],
    enrolledCount: 284,
    moduleCount: 8,
    duration: '12 weeks',
    level: 'Intermediate',
    progress: 65,
    rating: 4.8,
    reviewCount: 142,
    status: 'published',
    createdAt: '2024-01-20',
    updatedAt: '2024-08-15',
  },
  {
    id: 'course-2',
    title: 'Data Science Fundamentals',
    description:
      'Learn Python for data analysis, visualization, and machine learning. No prior experience required.',
    longDescription:
      'Start your data science journey with Python. This course covers NumPy, Pandas, Matplotlib, Seaborn, and scikit-learn. You will work with real-world datasets, learn statistical analysis, and build your first ML models. Ideal for beginners transitioning into data roles.',
    instructor: 'Dr. Sarah Chen',
    instructorId: 'user-teacher-1',
    instructorAvatar: '/avatars/sarah.jpg',
    thumbnail: '/courses/datascience.jpg',
    category: 'Data Science',
    tags: ['Python', 'Pandas', 'Machine Learning', 'Statistics'],
    enrolledCount: 412,
    moduleCount: 10,
    duration: '14 weeks',
    level: 'Beginner',
    progress: 32,
    rating: 4.9,
    reviewCount: 238,
    status: 'published',
    createdAt: '2024-02-01',
    updatedAt: '2024-08-10',
  },
  {
    id: 'course-3',
    title: 'UX Design Masterclass',
    description:
      'Design intuitive digital products. From user research and wireframing to high-fidelity prototypes in Figma.',
    longDescription:
      'A design-thinking-first approach to UX. You will learn user research methods, information architecture, interaction design, visual design principles, and prototyping in Figma. The capstone project involves designing a complete mobile app from scratch with real user testing.',
    instructor: 'Prof. Marcus Webb',
    instructorId: 'user-teacher-2',
    instructorAvatar: '/avatars/marcus.jpg',
    thumbnail: '/courses/uxdesign.jpg',
    category: 'Design',
    tags: ['Figma', 'User Research', 'Wireframing', 'Prototyping'],
    enrolledCount: 198,
    moduleCount: 6,
    duration: '8 weeks',
    level: 'Beginner',
    progress: 88,
    rating: 4.7,
    reviewCount: 96,
    status: 'published',
    createdAt: '2024-03-15',
    updatedAt: '2024-07-28',
  },
  {
    id: 'course-4',
    title: 'Mobile App Development with React Native',
    description:
      'Build cross-platform mobile apps for iOS and Android using React Native and Expo.',
    longDescription:
      'Go from zero to published app. This course covers React Native fundamentals, Expo workflow, navigation, state management with Zustand, native device APIs, push notifications, and App Store / Play Store deployment. Includes 5 mini-projects and a capstone.',
    instructor: 'Dr. Sarah Chen',
    instructorId: 'user-teacher-1',
    instructorAvatar: '/avatars/sarah.jpg',
    thumbnail: '/courses/mobile.jpg',
    category: 'Development',
    tags: ['React Native', 'Expo', 'iOS', 'Android'],
    enrolledCount: 156,
    moduleCount: 7,
    duration: '10 weeks',
    level: 'Intermediate',
    progress: 12,
    rating: 4.6,
    reviewCount: 64,
    status: 'published',
    createdAt: '2024-04-10',
    updatedAt: '2024-08-01',
  },
  {
    id: 'course-5',
    title: 'Advanced System Design',
    description:
      'Learn to design large-scale distributed systems. Covers caching, load balancing, database sharding, and microservices.',
    instructor: 'Dr. Sarah Chen',
    instructorId: 'user-teacher-1',
    instructorAvatar: '/avatars/sarah.jpg',
    thumbnail: '/courses/sysdesign.jpg',
    category: 'Development',
    tags: ['System Design', 'Microservices', 'AWS', 'Architecture'],
    enrolledCount: 0,
    moduleCount: 5,
    duration: '8 weeks',
    level: 'Advanced',
    rating: undefined,
    reviewCount: 0,
    status: 'draft',
    createdAt: '2024-08-01',
    updatedAt: '2024-08-18',
  },
];

// ============================================================
// MODULES & LESSONS
// ============================================================

export const modules: Module[] = [
  // Course 1 — Full-Stack Web Dev
  {
    id: 'mod-1-1',
    courseId: 'course-1',
    title: 'HTML, CSS & Responsive Design',
    description: 'Build a strong foundation with semantic HTML and modern CSS layouts.',
    order: 1,
    lessons: [
      { id: 'les-1-1-1', moduleId: 'mod-1-1', title: 'Semantic HTML5 Elements', type: 'video', duration: '18 min', completed: true, order: 1 },
      { id: 'les-1-1-2', moduleId: 'mod-1-1', title: 'CSS Flexbox & Grid Deep Dive', type: 'video', duration: '32 min', completed: true, order: 2 },
      { id: 'les-1-1-3', moduleId: 'mod-1-1', title: 'Responsive Design Patterns', type: 'reading', duration: '15 min', completed: true, order: 3 },
      { id: 'les-1-1-4', moduleId: 'mod-1-1', title: 'Module 1 Quiz', type: 'quiz', duration: '10 min', completed: true, order: 4 },
    ],
  },
  {
    id: 'mod-1-2',
    courseId: 'course-1',
    title: 'JavaScript & TypeScript Essentials',
    description: 'Modern JavaScript features and TypeScript for type-safe development.',
    order: 2,
    lessons: [
      { id: 'les-1-2-1', moduleId: 'mod-1-2', title: 'ES6+ Features & Async/Await', type: 'video', duration: '28 min', completed: true, order: 1 },
      { id: 'les-1-2-2', moduleId: 'mod-1-2', title: 'TypeScript Fundamentals', type: 'video', duration: '35 min', completed: true, order: 2 },
      { id: 'les-1-2-3', moduleId: 'mod-1-2', title: 'Generics & Advanced Types', type: 'reading', duration: '20 min', completed: false, order: 3 },
    ],
  },
  {
    id: 'mod-1-3',
    courseId: 'course-1',
    title: 'React & Next.js',
    description: 'Component-driven UI development with React and the Next.js App Router.',
    order: 3,
    lessons: [
      { id: 'les-1-3-1', moduleId: 'mod-1-3', title: 'React Component Patterns', type: 'video', duration: '40 min', completed: false, order: 1 },
      { id: 'les-1-3-2', moduleId: 'mod-1-3', title: 'State Management with Hooks', type: 'video', duration: '30 min', completed: false, order: 2 },
      { id: 'les-1-3-3', moduleId: 'mod-1-3', title: 'Next.js App Router & Server Components', type: 'video', duration: '45 min', completed: false, order: 3 },
      { id: 'les-1-3-4', moduleId: 'mod-1-3', title: 'Data Fetching Patterns', type: 'reading', duration: '18 min', completed: false, order: 4 },
    ],
  },
  // Course 2 — Data Science
  {
    id: 'mod-2-1',
    courseId: 'course-2',
    title: 'Python for Data Analysis',
    description: 'Core Python skills for data manipulation and analysis.',
    order: 1,
    lessons: [
      { id: 'les-2-1-1', moduleId: 'mod-2-1', title: 'Python Refresher', type: 'video', duration: '22 min', completed: true, order: 1 },
      { id: 'les-2-1-2', moduleId: 'mod-2-1', title: 'NumPy Arrays & Operations', type: 'video', duration: '30 min', completed: true, order: 2 },
      { id: 'les-2-1-3', moduleId: 'mod-2-1', title: 'Pandas DataFrames', type: 'video', duration: '38 min', completed: false, order: 3 },
    ],
  },
  {
    id: 'mod-2-2',
    courseId: 'course-2',
    title: 'Data Visualization',
    description: 'Create compelling charts and plots with Matplotlib and Seaborn.',
    order: 2,
    lessons: [
      { id: 'les-2-2-1', moduleId: 'mod-2-2', title: 'Matplotlib Basics', type: 'video', duration: '25 min', completed: false, order: 1 },
      { id: 'les-2-2-2', moduleId: 'mod-2-2', title: 'Seaborn Statistical Plots', type: 'video', duration: '28 min', completed: false, order: 2 },
      { id: 'les-2-2-3', moduleId: 'mod-2-2', title: 'Interactive Dashboards', type: 'reading', duration: '15 min', completed: false, order: 3 },
    ],
  },
  {
    id: 'mod-2-3',
    courseId: 'course-2',
    title: 'Intro to Machine Learning',
    description: 'Build your first ML models with scikit-learn.',
    order: 3,
    lessons: [
      { id: 'les-2-3-1', moduleId: 'mod-2-3', title: 'Supervised vs Unsupervised Learning', type: 'video', duration: '20 min', completed: false, order: 1 },
      { id: 'les-2-3-2', moduleId: 'mod-2-3', title: 'Linear Regression in Practice', type: 'video', duration: '35 min', completed: false, order: 2 },
      { id: 'les-2-3-3', moduleId: 'mod-2-3', title: 'Model Evaluation & Metrics', type: 'quiz', duration: '12 min', completed: false, order: 3 },
    ],
  },
  // Course 3 — UX Design
  {
    id: 'mod-3-1',
    courseId: 'course-3',
    title: 'User Research Methods',
    description: 'Discover what users actually need through interviews and surveys.',
    order: 1,
    lessons: [
      { id: 'les-3-1-1', moduleId: 'mod-3-1', title: 'Conducting User Interviews', type: 'video', duration: '25 min', completed: true, order: 1 },
      { id: 'les-3-1-2', moduleId: 'mod-3-1', title: 'Survey Design Best Practices', type: 'reading', duration: '12 min', completed: true, order: 2 },
      { id: 'les-3-1-3', moduleId: 'mod-3-1', title: 'Creating Personas', type: 'video', duration: '20 min', completed: true, order: 3 },
    ],
  },
  {
    id: 'mod-3-2',
    courseId: 'course-3',
    title: 'Wireframing & Prototyping',
    description: 'Transform ideas into tangible prototypes.',
    order: 2,
    lessons: [
      { id: 'les-3-2-1', moduleId: 'mod-3-2', title: 'Low-Fi Wireframing Techniques', type: 'video', duration: '22 min', completed: true, order: 1 },
      { id: 'les-3-2-2', moduleId: 'mod-3-2', title: 'Figma Fundamentals', type: 'video', duration: '40 min', completed: true, order: 2 },
      { id: 'les-3-2-3', moduleId: 'mod-3-2', title: 'Interactive Prototypes', type: 'video', duration: '35 min', completed: true, order: 3 },
    ],
  },
  {
    id: 'mod-3-3',
    courseId: 'course-3',
    title: 'Usability Testing',
    description: 'Validate your designs with real users.',
    order: 3,
    lessons: [
      { id: 'les-3-3-1', moduleId: 'mod-3-3', title: 'Planning a Usability Test', type: 'video', duration: '18 min', completed: true, order: 1 },
      { id: 'les-3-3-2', moduleId: 'mod-3-3', title: 'Analyzing Test Results', type: 'reading', duration: '14 min', completed: false, order: 2 },
      { id: 'les-3-3-3', moduleId: 'mod-3-3', title: 'Iteration & Redesign', type: 'quiz', duration: '10 min', completed: false, order: 3 },
    ],
  },
  // Course 4 — Mobile Dev
  {
    id: 'mod-4-1',
    courseId: 'course-4',
    title: 'React Native & Expo Setup',
    description: 'Get your development environment ready and build your first screen.',
    order: 1,
    lessons: [
      { id: 'les-4-1-1', moduleId: 'mod-4-1', title: 'Environment Setup & Expo Go', type: 'video', duration: '15 min', completed: true, order: 1 },
      { id: 'les-4-1-2', moduleId: 'mod-4-1', title: 'Core Components Overview', type: 'video', duration: '28 min', completed: false, order: 2 },
      { id: 'les-4-1-3', moduleId: 'mod-4-1', title: 'Styling with StyleSheet', type: 'reading', duration: '12 min', completed: false, order: 3 },
    ],
  },
  {
    id: 'mod-4-2',
    courseId: 'course-4',
    title: 'Navigation & State',
    description: 'Implement navigation flows and manage app state.',
    order: 2,
    lessons: [
      { id: 'les-4-2-1', moduleId: 'mod-4-2', title: 'React Navigation Setup', type: 'video', duration: '30 min', completed: false, order: 1 },
      { id: 'les-4-2-2', moduleId: 'mod-4-2', title: 'Stack, Tab & Drawer Navigators', type: 'video', duration: '35 min', completed: false, order: 2 },
      { id: 'les-4-2-3', moduleId: 'mod-4-2', title: 'State Management with Zustand', type: 'video', duration: '25 min', completed: false, order: 3 },
    ],
  },
];

// ============================================================
// ASSIGNMENTS
// ============================================================

export const assignments: Assignment[] = [
  {
    id: 'assign-1',
    courseId: 'course-1',
    courseTitle: 'Full-Stack Web Development',
    title: 'Build a Responsive Portfolio Site',
    description:
      'Create a fully responsive personal portfolio website using HTML, CSS Grid, and Flexbox. Must include a projects section, about page, and contact form.',
    dueDate: '2024-09-15',
    maxScore: 100,
    status: 'graded',
    score: 92,
    feedback: 'Excellent work! Clean code structure and great responsive design. Consider adding CSS animations for a polished feel.',
    submittedAt: '2024-09-13',
  },
  {
    id: 'assign-2',
    courseId: 'course-1',
    courseTitle: 'Full-Stack Web Development',
    title: 'React Todo App with TypeScript',
    description:
      'Build a todo application using React and TypeScript. Implement CRUD operations, local storage persistence, and filtering functionality.',
    dueDate: '2024-09-28',
    maxScore: 100,
    status: 'submitted',
    submittedAt: '2024-09-26',
  },
  {
    id: 'assign-3',
    courseId: 'course-2',
    courseTitle: 'Data Science Fundamentals',
    title: 'Exploratory Data Analysis Report',
    description:
      'Perform EDA on the provided Titanic dataset. Include data cleaning, visualization of key patterns, and a written analysis of survival factors.',
    dueDate: '2024-09-20',
    maxScore: 100,
    status: 'graded',
    score: 88,
    feedback: 'Good analysis overall. Your visualizations are clear but could benefit from more detailed statistical testing.',
    submittedAt: '2024-09-19',
  },
  {
    id: 'assign-4',
    courseId: 'course-2',
    courseTitle: 'Data Science Fundamentals',
    title: 'Build a Classification Model',
    description:
      'Train a classification model to predict customer churn. Use at least two different algorithms and compare their performance using appropriate metrics.',
    dueDate: '2024-10-05',
    maxScore: 100,
    status: 'pending',
  },
  {
    id: 'assign-5',
    courseId: 'course-3',
    courseTitle: 'UX Design Masterclass',
    title: 'Mobile App Wireframe Set',
    description:
      'Create a complete set of wireframes for a food delivery mobile app. Include at least 8 screens covering the core user journey from browse to checkout.',
    dueDate: '2024-09-10',
    maxScore: 100,
    status: 'graded',
    score: 95,
    feedback: 'Outstanding wireframes! Your user flow is intuitive and the annotation quality is professional-grade.',
    submittedAt: '2024-09-08',
  },
  {
    id: 'assign-6',
    courseId: 'course-4',
    courseTitle: 'Mobile App Development with React Native',
    title: 'Navigation Challenge',
    description:
      'Implement a multi-screen React Native app with stack navigation, bottom tabs, and at least one modal screen. Include proper header customization.',
    dueDate: '2024-10-12',
    maxScore: 100,
    status: 'pending',
  },
  {
    id: 'assign-7',
    courseId: 'course-1',
    courseTitle: 'Full-Stack Web Development',
    title: 'REST API with Express & PostgreSQL',
    description:
      'Build a RESTful API for a blog platform. Implement CRUD endpoints, input validation, error handling, and database migrations.',
    dueDate: '2024-08-30',
    maxScore: 100,
    status: 'overdue',
  },
];

// ============================================================
// SUBMISSIONS (Teacher View)
// ============================================================

export const submissions: Submission[] = [
  {
    id: 'sub-1',
    assignmentId: 'assign-2',
    studentId: 'user-student-1',
    studentName: 'Alex Rivera',
    studentAvatar: '/avatars/alex.jpg',
    submittedAt: '2024-09-26T14:30:00Z',
    fileName: 'todo-app-alex.zip',
    status: 'submitted',
  },
  {
    id: 'sub-2',
    assignmentId: 'assign-2',
    studentId: 'user-student-3',
    studentName: 'Priya Sharma',
    studentAvatar: '/avatars/priya.jpg',
    submittedAt: '2024-09-27T09:15:00Z',
    fileName: 'react-todo-priya.zip',
    status: 'submitted',
  },
  {
    id: 'sub-3',
    assignmentId: 'assign-4',
    studentId: 'user-student-2',
    studentName: 'Jordan Park',
    studentAvatar: '/avatars/jordan.jpg',
    submittedAt: '2024-10-03T16:45:00Z',
    fileName: 'churn-model-jordan.ipynb',
    score: 91,
    feedback: 'Great model comparison. Your feature engineering was particularly clever.',
    status: 'graded',
  },
  {
    id: 'sub-4',
    assignmentId: 'assign-6',
    studentId: 'user-student-2',
    studentName: 'Jordan Park',
    studentAvatar: '/avatars/jordan.jpg',
    submittedAt: '2024-10-11T11:20:00Z',
    fileName: 'nav-challenge-jordan.zip',
    status: 'submitted',
  },
  {
    id: 'sub-5',
    assignmentId: 'assign-6',
    studentId: 'user-student-3',
    studentName: 'Priya Sharma',
    studentAvatar: '/avatars/priya.jpg',
    submittedAt: '2024-10-10T08:50:00Z',
    fileName: 'navigation-priya.zip',
    status: 'submitted',
  },
];

// ============================================================
// ANNOUNCEMENTS
// ============================================================

export const announcements: Announcement[] = [
  {
    id: 'ann-1',
    courseId: 'course-1',
    courseTitle: 'Full-Stack Web Development',
    title: 'Mid-Semester Project Guidelines Released',
    content:
      'The mid-semester project guidelines are now available in the Resources section. You will be building a full-stack e-commerce application. Teams of 2-3 are allowed. Please review the rubric carefully and reach out during office hours if you have questions.',
    authorName: 'Dr. Sarah Chen',
    authorAvatar: '/avatars/sarah.jpg',
    createdAt: '2024-09-01T10:00:00Z',
    priority: 'important',
  },
  {
    id: 'ann-2',
    courseId: 'course-2',
    courseTitle: 'Data Science Fundamentals',
    title: 'Guest Lecture: ML at Scale by Google Engineer',
    content:
      'We have a special guest lecture next Thursday at 3 PM. A senior ML engineer from Google will discuss how machine learning models are deployed and monitored at scale. Attendance is optional but highly recommended. A recording will be made available.',
    authorName: 'Dr. Sarah Chen',
    authorAvatar: '/avatars/sarah.jpg',
    createdAt: '2024-09-05T14:30:00Z',
    priority: 'normal',
  },
  {
    id: 'ann-3',
    courseId: 'course-3',
    courseTitle: 'UX Design Masterclass',
    title: 'Deadline Extension for Wireframe Assignment',
    content:
      'Due to the university holiday on Monday, I am extending the wireframe assignment deadline by 3 days. The new due date is September 13th. Quality over speed — take the extra time to polish your work.',
    authorName: 'Prof. Marcus Webb',
    authorAvatar: '/avatars/marcus.jpg',
    createdAt: '2024-09-06T09:00:00Z',
    priority: 'urgent',
  },
  {
    id: 'ann-4',
    courseId: 'course-1',
    courseTitle: 'Full-Stack Web Development',
    title: 'Office Hours Schedule Change',
    content:
      'Starting next week, my office hours will move from Tuesday 2-4 PM to Wednesday 3-5 PM. Virtual office hours via Zoom remain unchanged on Friday mornings.',
    authorName: 'Dr. Sarah Chen',
    authorAvatar: '/avatars/sarah.jpg',
    createdAt: '2024-09-08T11:15:00Z',
    priority: 'normal',
  },
  {
    id: 'ann-5',
    courseId: 'course-4',
    courseTitle: 'Mobile App Development with React Native',
    title: 'Expo SDK 51 Migration Required',
    content:
      'Expo has released SDK 51 with breaking changes. Please update your projects by following the migration guide linked in the Resources section. If you encounter issues, post in the course discussion forum.',
    authorName: 'Dr. Sarah Chen',
    authorAvatar: '/avatars/sarah.jpg',
    createdAt: '2024-09-10T16:00:00Z',
    priority: 'important',
  },
];

// ============================================================
// DASHBOARD STATS
// ============================================================

export const studentDashboardStats: DashboardStats = {
  totalCourses: 3,
  completedLessons: 18,
  pendingAssignments: 3,
  averageScore: 91.7,
};

export const teacherDashboardStats: TeacherDashboardStats = {
  totalCourses: 4,
  totalStudents: 534,
  pendingGrading: 4,
  averageRating: 4.77,
};

// ============================================================
// HELPER: Get data by ID or relationship
// ============================================================

export function getCourseById(id: string): Course | undefined {
  return courses.find((c) => c.id === id);
}

export function getModulesByCourseId(courseId: string): Module[] {
  return modules.filter((m) => m.courseId === courseId).sort((a, b) => a.order - b.order);
}

export function getAssignmentsByCourseId(courseId: string): Assignment[] {
  return assignments.filter((a) => a.courseId === courseId);
}

export function getAnnouncementsByCourseId(courseId: string): Announcement[] {
  return announcements.filter((a) => a.courseId === courseId);
}

export function getSubmissionsByAssignmentId(assignmentId: string): Submission[] {
  return submissions.filter((s) => s.assignmentId === assignmentId);
}

export function getStudentCourses(studentId: string): Course[] {
  const user = users.find((u) => u.id === studentId);
  if (!user?.enrolledCourseIds) return [];
  return courses.filter((c) => user.enrolledCourseIds!.includes(c.id));
}

export function getTeacherCourses(teacherId: string): Course[] {
  const user = users.find((u) => u.id === teacherId);
  if (!user?.createdCourseIds) return [];
  return courses.filter((c) => user.createdCourseIds!.includes(c.id));
}
