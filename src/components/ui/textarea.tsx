import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-[20px] border border-[#383838] bg-[#181818] px-3.5 py-2.5 text-sm text-white ring-offset-background placeholder:text-[#737373] focus-visible:outline-none focus-visible:border-[#a8f1e0] focus-visible:ring-1 focus-visible:ring-[#a8f1e0] disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
