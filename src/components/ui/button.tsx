import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-[#a05120] text-white hover:bg-[#854218] shadow-sm',
        rust: 'bg-[#a05120] text-white hover:bg-[#854218] shadow-sm',
        dark: 'bg-[#111111] text-[#fbfbfa] hover:bg-[#262626] shadow-sm',
        studioOutline: 'border border-[#988a79] bg-transparent text-[#111111] hover:bg-[#f3f1ec]',
        destructive: 'bg-[#63200c] text-white hover:bg-[#4a1708] shadow-sm',
        outline:
          'border border-stone-300 bg-white text-stone-800 hover:border-[#a05120] hover:text-[#a05120]',
        secondary:
          'bg-[#f3f1ec] text-[#111111] hover:bg-[#eae6df]',
        ghost: 'hover:bg-stone-100 text-stone-700',
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
