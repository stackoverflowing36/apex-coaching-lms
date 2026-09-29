import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[20px] border border-[#383838] bg-[#181818] px-4 py-2 text-sm text-white placeholder:text-[#737373] focus-visible:outline-none focus-visible:border-[#a8f1e0] focus-visible:ring-1 focus-visible:ring-[#a8f1e0] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
