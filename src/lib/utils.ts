import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with clsx for conditional class composition.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string into a human-readable format.
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string into a relative time (e.g., "2 days ago").
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

/**
 * Get initials from a full name.
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text to a given length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '…';
}

/**
 * Generate a placeholder gradient for course thumbnails.
 */
export function getCourseGradient(index: number): string {
  const gradients = [
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-orange-400 to-red-500',
    'from-cyan-400 to-blue-500',
  ];
  return gradients[index % gradients.length];
}

/**
 * Get status color classes for assignment status badges.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    submitted: 'bg-blue-50 text-blue-700 border-blue-200',
    graded: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    overdue: 'bg-red-50 text-red-700 border-red-200',
    draft: 'bg-gray-50 text-gray-600 border-gray-200',
    published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    archived: 'bg-slate-50 text-slate-600 border-slate-200',
  };
  return colors[status] || 'bg-gray-50 text-gray-600 border-gray-200';
}

/**
 * Get priority color classes for announcement priority badges.
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    normal: 'bg-slate-100 text-slate-600',
    important: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
  };
  return colors[priority] || 'bg-slate-100 text-slate-600';
}
