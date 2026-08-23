'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { BookOpen, Inbox, FileQuestion, Search } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

const defaultIcons: Record<string, React.ReactNode> = {
  courses: <BookOpen className="h-12 w-12 text-emerald-400" />,
  inbox: <Inbox className="h-12 w-12 text-blue-400" />,
  assignments: <FileQuestion className="h-12 w-12 text-amber-400" />,
  search: <Search className="h-12 w-12 text-slate-400" />,
};

/**
 * Polished empty state with icon, message, and optional action.
 * Uses the floating card aesthetic.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = 'default',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'default'
          ? 'rounded-2xl bg-white/80 p-12 shadow-card backdrop-blur-sm'
          : 'py-8',
        className
      )}
    >
      {/* Icon circle */}
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50">
        {icon || defaultIcons.courses}
      </div>

      <h3 className="mb-2 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-gray-500">{description}</p>

      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * Shorthand empty states for common scenarios.
 */
export function NoCourses({ action }: { action?: React.ReactNode }) {
  return (
    <EmptyState
      icon={defaultIcons.courses}
      title="No courses yet"
      description="You haven't enrolled in any courses yet. Browse the catalog to get started!"
      action={action}
    />
  );
}

export function NoAssignments() {
  return (
    <EmptyState
      icon={defaultIcons.assignments}
      title="All caught up!"
      description="You have no pending assignments. Great work staying on top of things!"
    />
  );
}

export function NoResults() {
  return (
    <EmptyState
      icon={defaultIcons.search}
      title="No results found"
      description="Try adjusting your search or filters to find what you're looking for."
      variant="compact"
    />
  );
}
