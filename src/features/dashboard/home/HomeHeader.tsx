import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dayLine, greetingFor } from '@/features/dashboard/home/homeRules';

/**
 * Hero Home — sapaan, aksi cepat, dan kartu angka HOME (`children`) dalam satu panel biru "kaca".
 * Dasar `secondary-700` = warna tombol primary & tile Dashboard, jadi hero terasa satu keluarga
 * dengan komponen lain; makin terang ke kanan, pendar `primary` (sky), kilau putih di atas seperti
 * tombol primary. Sudut & bayangan mengikuti panel lain (rounded-xl, tanpa bayangan berat).
 *
 * Nama sapaan datang dari `GET /auth/me`, bukan JWT (FSD-001-AUTH §2.9); bila alamat itu belum
 * menjawab, sapaan tetap tampil tanpa nama. Pintu Buka Kunci Akun (FSD-001-AUTH §4) hanya dipasang
 * untuk lapis HR/admin — `onUnlock` kosong berarti tersembunyi.
 */
export function HomeHeader({
  name,
  companyName,
  pendingCount,
  lockedCount,
  onUnlock,
  now,
  children,
}: {
  name: string | null;
  companyName: string;
  pendingCount: number | null;
  lockedCount: number | null;
  onUnlock?: () => void;
  now: Date;
  children?: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <section
      className="relative isolate overflow-hidden rounded-xl bg-linear-120 from-secondary-700 via-secondary-600 to-secondary-500 px-5 py-6 text-white shadow-card-sm md:px-7 md:py-7"
      aria-label="Ringkasan hari ini"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-b from-white/12 to-transparent" />
        <div className="absolute -right-24 -top-36 size-[440px] rounded-full bg-primary-500/40 blur-3xl" />
        <div className="absolute -bottom-48 left-[22%] size-[380px] rounded-full bg-primary-200/20 blur-3xl" />
        <div className="absolute -right-44 -top-52 size-[600px] rounded-full border border-white/12" />
        <div className="absolute -right-20 -top-28 size-[400px] rounded-full border border-white/12" />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="w-fit rounded-full bg-white/12 px-3 py-1 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-white/85 ring-1 ring-inset ring-white/20 backdrop-blur-md">
            {dayLine(now)} · {companyName}
          </span>
          <h1 className="m-0 font-display text-[32px] font-bold leading-[1.12] tracking-[-0.02em] text-white">
            {greetingFor(now)}
            {name ? `, ${name}` : ''}.
          </h1>
          <p className="m-0 font-body text-sm font-medium text-white/75">
            {pendingCount === null ? (
              'Ringkasan hari ini sedang dimuat.'
            ) : pendingCount === 0 ? (
              'Tidak ada yang menunggu tindak lanjut Anda hari ini.'
            ) : (
              <>
                Ada{' '}
                <span className="rounded-full bg-white/15 px-2 py-0.5 font-bold text-white ring-1 ring-inset ring-white/20">
                  {pendingCount} hal
                </span>{' '}
                yang menunggu tindak lanjut Anda hari ini.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onUnlock && (
            <Button variant="secondary" onClick={onUnlock}>
              Buka Kunci Akun
              {lockedCount ? (
                <span className="rounded-full bg-error-500 px-1.5 font-body text-[11px] font-bold leading-[18px] text-white tabular-nums ring-2 ring-white">
                  {lockedCount}
                </span>
              ) : null}
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/me/time/attendance')}>
            Attendance
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                More Request
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuItem onSelect={() => navigate('/me/time/time-off')}>Time off</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/finance/benefit-reimbursement')}>
                Reimbursement
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/finance/cash-advance')}>Cash advance</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/me/time/overtime')}>Overtime</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/finance/loan')}>Loan</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}
