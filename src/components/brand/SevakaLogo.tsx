import { cn } from '@/lib/utils';

/**
 * Aset merek SEVAKA.
 *
 *   `/brand/sevaka-mark.svg`  burung (satu warna, latar transparan)
 *   wordmark                  TEKS, bukan gambar — lihat `LOGO_TEXT`
 *
 * Mark dibersihkan dari `_design-system/assets/logo-dummy/LOGO_NEWEST (1).svg`:
 * 68 path noise hasil trace dibuang, sisanya diseragamkan ke satu warna brand,
 * viewBox dipotong pas artwork, presisi koordinat dipangkas 2 desimal.
 *
 * Wordmark sengaja dirender sebagai teks (Plus Jakarta Sans Bold), bukan SVG
 * hasil trace: hasilnya tajam di semua ukuran dan bisa diwarnai lewat class.
 *
 * CATATAN: logo ini dummy/sementara. Tagline "Human Resource Information
 * System" untuk sementara TIDAK ditampilkan.
 */

const MARK_SRC = '/brand/sevaka-mark.svg';

/** Wordmark memakai huruf Yunani Λ menggantikan A — ini disengaja. */
export const LOGO_TEXT = 'SEVΛKΛ';

/** Burung SEVAKA saja — favicon, ruang sempit, avatar aplikasi. */
export function SevakaMark({ className }: { className?: string }) {
  return <img src={MARK_SRC} alt="SEVAKA" draggable={false} className={cn('block h-9 w-auto', className)} />;
}

/** Tulisan "SEVΛKΛ" saja. */
export function SevakaWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-xl font-bold leading-none tracking-[0.02em] text-brand select-none',
        className,
      )}
    >
      {LOGO_TEXT}
    </span>
  );
}

interface SevakaLogoProps {
  /** `md` untuk topnav, `lg` untuk kartu auth / layar besar. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { mark: 'h-7', text: 'text-base', gap: 'gap-2' },
  md: { mark: 'h-10', text: 'text-[22px]', gap: 'gap-2.5' },
  lg: { mark: 'h-14', text: 'text-3xl', gap: 'gap-3.5' },
} as const;

/** Lockup horizontal: burung + wordmark. */
export function SevakaLogo({ size = 'md', className }: SevakaLogoProps) {
  const s = SIZES[size];

  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      <img src={MARK_SRC} alt="" aria-hidden draggable={false} className={cn('block w-auto shrink-0', s.mark)} />
      <SevakaWordmark className={s.text} />
    </span>
  );
}
