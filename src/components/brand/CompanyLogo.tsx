import { cn } from '@/lib/utils';

/**
 * Logo perusahaan pemakai — satu komponen untuk semua tenant.
 *
 * `framed` (bawaan): persegi panjang 2:1 berukuran tetap, sudut 10px, border tipis, latar putih; logo
 * dipasang UTUH (`object-contain`) di tengah. `framed={false}`: logo polos dengan batas lebar & tinggi
 * yang sama, tanpa bingkai. Tanpa logo, tampil inisial perusahaan di atas gradasi brand.
 *
 * Aset yang disarankan: PNG/SVG berlatar transparan, tepi kosongnya sudah dipangkas.
 */
const FRAMED = {
  sm: 'h-8 w-16 rounded-lg p-1 text-[11px]',
  md: 'h-12 w-24 rounded-[10px] p-1.5 text-sm',
  lg: 'h-16 w-32 rounded-xl p-2 text-lg',
} as const;

const PLAIN = {
  sm: 'max-h-8 w-16',
  md: 'max-h-10 w-24',
  lg: 'max-h-16 w-32',
} as const;

const initials = (name: string) =>
  name
    .replace(/^(PT|CV)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

export function CompanyLogo({
  name,
  src,
  size = 'md',
  framed = true,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof FRAMED;
  framed?: boolean;
  className?: string;
}) {
  if (src && !framed) {
    return <img src={src} alt={`Logo ${name}`} className={cn('shrink-0 object-contain', PLAIN[size], className)} />;
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden border border-border-1 shadow-card-sm',
        src ? 'bg-bg-surface' : 'bg-linear-135 from-secondary-700 to-secondary-500 font-body font-extrabold text-white',
        FRAMED[size],
        className,
      )}
    >
      {src ? <img src={src} alt={`Logo ${name}`} className="size-full object-contain" /> : initials(name)}
    </span>
  );
}
