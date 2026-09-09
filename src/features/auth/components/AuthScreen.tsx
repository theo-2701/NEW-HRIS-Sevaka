import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Judul + lead sebuah layar auth — port `.auth-screen__title` / `__lead`. */
export function AuthHeading({
  title,
  lead,
  size = 'lg',
  center = false,
}: {
  title: string;
  lead?: ReactNode;
  size?: 'lg' | 'sm';
  center?: boolean;
}) {
  return (
    <div className={cn(center && 'text-center')}>
      <h1
        className={cn(
          'm-0 font-display font-bold leading-[1.15] tracking-[-0.02em] text-obsidian',
          size === 'lg' ? 'text-[32px]' : 'text-[26px]',
        )}
      >
        {title}
      </h1>
      {lead && (
        <p className="mt-3 font-body text-sm font-normal leading-normal text-fg-3 [&_b]:font-bold [&_b]:text-fg-2">
          {lead}
        </p>
      )}
    </div>
  );
}

/**
 * Tombol submit lebar penuh (`.auth-submit`) — tetap memakai `<Button>` standar
 * supaya tingginya sama dengan tombol lain (36px), hanya dibuat full-width.
 */
export function AuthSubmit({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button className={cn('w-full tracking-[0.04em]', className)} {...props}>
      {children}
    </Button>
  );
}

/** Pemisah "atau masuk dengan" — port `.auth-or`. */
export function AuthOr({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3.5 font-body text-[13px] font-medium leading-none text-fg-3 before:h-px before:flex-1 before:bg-border-1 before:content-[''] after:h-px after:flex-1 after:bg-border-1 after:content-['']">
      {children}
    </div>
  );
}

/** Tombol kanal alternatif — port `.auth-btn` (varian sekunder, 36px). */
export function AuthAltLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Button variant="secondary" asChild className="w-full">
      <Link to={to}>{children}</Link>
    </Button>
  );
}

/** Tautan kecil di bawah kartu — port `.auth-foot-link`. */
export function AuthFootLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <div className="mt-6 text-center">
      <Link to={to} className="font-body text-[13px] font-semibold text-secondary-600 hover:underline">
        {children}
      </Link>
    </div>
  );
}
