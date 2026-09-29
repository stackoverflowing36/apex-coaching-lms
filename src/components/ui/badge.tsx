import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-stone-200 bg-stone-100 text-stone-700',
        secondary: 'border-transparent bg-stone-100 text-stone-600',
        destructive: 'border border-red-200 bg-red-50 text-red-700',
        outline: 'border-stone-300 bg-white text-stone-600',
        rust: 'border-transparent bg-[#a05120] text-white font-semibold',
        earth: 'border-transparent bg-[#63200c] text-white font-semibold',
        mint: 'border-transparent bg-[#a8f1e0] text-[#111111] font-semibold',
        green: 'border-transparent bg-emerald-100 text-emerald-800 font-semibold',
        rose: 'border-transparent bg-rose-100 text-rose-800 font-semibold',
        gold: 'border-transparent bg-amber-100 text-amber-800 font-semibold',
        lavender: 'border-transparent bg-purple-100 text-purple-800 font-semibold',
        sky: 'border-transparent bg-blue-100 text-blue-800 font-semibold',
        stone: 'border-stone-200 bg-stone-50 text-stone-500 font-medium',
        dark: 'border border-stone-800 bg-stone-900 text-white font-medium',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
