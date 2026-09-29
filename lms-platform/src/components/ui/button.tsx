import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-[20px] text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8f1e0] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-[#a8f1e0] text-[#0c0c0c] hover:bg-[#9ee4a0] font-bold shadow-sm',
        mint: 'bg-[#a8f1e0] text-[#0c0c0c] hover:bg-[#9ee4a0] font-bold shadow-sm',
        rust: 'bg-[#a05120] text-white hover:bg-[#854218] font-bold shadow-sm',
        dark: 'bg-[#111111] text-white border border-[#333333] hover:bg-[#1a1a1a] shadow-sm',
        studioOutline: 'border border-stone-300 bg-white text-stone-700 hover:border-[#a05120] hover:text-[#a05120]',
        destructive: 'bg-[#a05120] text-white hover:bg-[#854218] font-bold shadow-sm',
        outline:
          'border border-stone-300 bg-white text-stone-700 hover:border-[#a05120] hover:text-[#a05120]',
        secondary:
          'bg-stone-100 text-stone-700 hover:bg-stone-200',
        ghost: 'text-stone-500 hover:text-[#a05120] hover:bg-stone-50',
        link: 'text-[#a05120] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-6 py-2',
        sm: 'h-9 px-4',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
