'use client';

import React from 'react';
import { cn, getStatusColor, getPriorityColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

/**
 * Pill-shaped status badge with contextual colors.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const displayText = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium',
        getStatusColor(status),
        className
      )}
    >
      {displayText}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

/**
 * Pill-shaped priority badge for announcements.
 */
export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const displayText = priority.charAt(0).toUpperCase() + priority.slice(1);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium',
        getPriorityColor(priority),
        className
      )}
    >
      {priority === 'urgent' && (
        <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
      )}
      {displayText}
    </span>
  );
}

interface LevelBadgeProps {
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  className?: string;
}

/**
 * Pill-shaped course level badge.
 */
export function LevelBadge({ level, className }: LevelBadgeProps) {
  const colors = {
    Beginner: 'bg-green-50 text-green-700',
    Intermediate: 'bg-blue-50 text-blue-700',
    Advanced: 'bg-purple-50 text-purple-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-medium',
        colors[level],
        className
      )}
    >
      {level}
    </span>
  );
}
