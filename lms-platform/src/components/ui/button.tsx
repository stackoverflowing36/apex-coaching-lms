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
        dark: 'bg-[#141414] text-white border border-[#262626] hover:bg-[#1f1f1f] shadow-sm',
        studioOutline: 'border border-[#383838] bg-[#181818] text-white hover:bg-[#222222] hover:text-[#a8f1e0]',
        destructive: 'bg-[#63200c] text-white hover:bg-[#4a1708] font-bold shadow-sm',
        outline:
          'border border-[#383838] bg-[#181818] text-white hover:bg-[#222222] hover:text-[#a8f1e0] hover:border-[#a8f1e0]',
        secondary:
          'bg-[#262626] text-white hover:bg-[#333333]',
        ghost: 'text-[#b7b7b5] hover:text-white hover:bg-[#1f1f1f]',
        link: 'text-[#a8f1e0] underline-offset-4 hover:underline',
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
