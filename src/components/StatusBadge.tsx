import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Chip status — port `.sb` (`_prototype/css/employee-flows.css`):
 * tinggi 24px · padding 0 11px · radius pill · 10.5px/700 UPPERCASE
 * tracking .05em · titik 6px di depan label.
 */
const badgeVariants = cva(
  'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-pill px-[11px] align-middle font-body text-[10.5px] font-bold uppercase leading-none tracking-[0.05em]',
  {
    variants: {
      tone: {
        ok: 'bg-success-100 text-success-900',
        warn: 'bg-warning-100 text-warning-800',
        err: 'bg-error-100 text-error-800',
        info: 'bg-primary-200 text-secondary-800',
        mute: 'bg-vapor text-fg-3',
        brand: 'bg-secondary-500 text-white',
      },
    },
    defaultVariants: { tone: 'mute' },
  },
);

const dotVariants = cva('size-1.5 shrink-0 rounded-full', {
  variants: {
    tone: {
      ok: 'bg-success-500',
      warn: 'bg-warning-500',
      err: 'bg-error-500',
      info: 'bg-secondary-500',
      mute: 'bg-current opacity-85',
      brand: 'bg-current opacity-85',
    },
  },
  defaultVariants: { tone: 'mute' },
});

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>;

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  /** Titik status di depan label. Aktif secara default (standar `.sb__dot`). */
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ tone, dot = true, className, children }: StatusBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {dot && <span className={dotVariants({ tone })} />}
      {children}
    </span>
  );
}

/**
 * Pemetaan status kontrak → tone chip. Tambahkan status baru di sini supaya
 * seluruh modul memakai warna yang sama untuk status yang sama.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  DRAFT: 'mute',
  SUBMITTED: 'info',
  WAITING: 'warn',
  PENDING: 'warn',
  IN_REVIEW: 'warn',
  PROBATION: 'info',
  CONTRACT: 'info',
  APPROVED: 'ok',
  ACTIVE: 'ok',
  PERMANENT: 'ok',
  COMPLETED: 'ok',
  PAID: 'ok',
  REJECTED: 'err',
  CANCELLED: 'err',
  FAILED: 'err',
  EXPIRED: 'mute',
  INACTIVE: 'mute',
};

export function toneForStatus(status: string): BadgeTone {
  return STATUS_TONES[status.toUpperCase().replace(/[\s-]/g, '_')] ?? 'mute';
}
