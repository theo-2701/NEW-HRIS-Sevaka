import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const SIZES = {
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-16 text-[22px]',
  xl: 'size-24 text-[32px]',
} as const;

/** Avatar inisial — port `.avatar` (`css/app.css`). */
export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-primary-500 font-body font-bold leading-none text-white',
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
