import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-studio bg-stone-200', className)}
      {...props}
    />
  );
}

export { Skeleton };
