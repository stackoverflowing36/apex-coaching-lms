'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

/**
 * Animated pulse skeleton for loading states.
 */
export function Skeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:200%_100%]',
        className
      )}
    />
  );
}

/**
 * Course card skeleton.
 */
export function CourseCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <Skeleton className="mb-4 h-40 w-full rounded-xl" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-3 h-4 w-full" />
      <Skeleton className="mb-3 h-4 w-5/6" />
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

/**
 * Stats card skeleton.
 */
export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-card">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Table row skeleton.
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === 0 ? 'w-8' : i === 1 ? 'w-48' : 'w-24')}
        />
      ))}
    </div>
  );
}

/**
 * Dashboard loading skeleton — a full grid of stats + course cards.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      {/* Course grid */}
      <div>
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
