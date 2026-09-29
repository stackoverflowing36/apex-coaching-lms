import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[#1f1f1f] text-white',
        secondary: 'border-transparent bg-[#2a2a2a] text-[#d4d4d4]',
        destructive: 'border border-red-500/40 bg-red-950/60 text-red-200',
        outline: 'border-[#383838] bg-[#141414] text-[#d4d4d4]',
        rust: 'border-transparent bg-[#a05120] text-white font-semibold',
        earth: 'border-transparent bg-[#63200c] text-white font-semibold',
        mint: 'border-transparent bg-[#a8f1e0] text-[#0c0c0c] font-semibold',
        green: 'border-transparent bg-[#9ee4a0] text-[#0c0c0c] font-semibold',
        rose: 'border-transparent bg-[#e2bcc2] text-[#0c0c0c] font-semibold',
        gold: 'border-transparent bg-[#ffb956] text-[#0c0c0c] font-semibold',
        lavender: 'border-transparent bg-[#b39dff] text-[#0c0c0c] font-semibold',
        sky: 'border-transparent bg-[#9dc1ff] text-[#0c0c0c] font-semibold',
        stone: 'border-transparent bg-[#222222] text-[#b7b7b5] font-medium border border-[#333333]',
        dark: 'border border-[#383838] bg-[#181818] text-white font-medium',
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
