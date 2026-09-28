import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-stone-100 text-stone-900',
        secondary:
          'border-transparent bg-[#f3f1ec] text-stone-800',
        destructive:
          'border-transparent bg-red-100 text-red-700',
        outline: 'border-stone-300 text-stone-800',
        rust: 'border-transparent bg-[#a05120]/15 text-[#a05120] font-semibold',
        mint: 'border-transparent bg-[#a8f1e0] text-[#111111] font-medium',
        rose: 'border-transparent bg-[#e2bcc2] text-[#111111] font-medium',
        gold: 'border-transparent bg-[#ffb956] text-[#111111] font-medium',
        lavender: 'border-transparent bg-[#b39dff] text-[#111111] font-medium',
        stone: 'border-transparent bg-[#988a79]/20 text-[#111111] font-medium',
        dark: 'border-transparent bg-[#111111] text-[#fbfbfa] font-medium',
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
