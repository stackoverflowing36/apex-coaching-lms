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
 * Get status color classes for assignment status badges (Dark Studio theme).
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-[#ffb956]/20 text-[#ffb956] border-[#ffb956]/30 font-semibold',
    submitted: 'bg-[#9dc1ff]/20 text-[#9dc1ff] border-[#9dc1ff]/30 font-semibold',
    graded: 'bg-[#9ee4a0]/20 text-[#9ee4a0] border-[#9ee4a0]/30 font-semibold',
    overdue: 'bg-[#ff6b6b]/20 text-[#ff6b6b] border-[#ff6b6b]/30 font-semibold',
    draft: 'bg-[#262626] text-[#b7b7b5] border-[#383838] font-semibold',
    published: 'bg-[#a8f1e0]/20 text-[#a8f1e0] border-[#a8f1e0]/30 font-semibold',
    archived: 'bg-[#262626] text-[#8e8e8e] border-[#383838] font-semibold',
  };
  return colors[status] || 'bg-[#262626] text-[#b7b7b5] border-[#383838] font-semibold';
}

/**
 * Get priority color classes for announcement priority badges (Dark Studio theme).
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    normal: 'bg-[#262626] text-[#b7b7b5] font-semibold',
    important: 'bg-[#ffb956]/20 text-[#ffb956] font-semibold',
    urgent: 'bg-[#ff6b6b]/20 text-[#ff6b6b] font-semibold',
  };
  return colors[priority] || 'bg-[#262626] text-[#b7b7b5] font-semibold';
}

