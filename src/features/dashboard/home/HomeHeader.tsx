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
 * Kepala Home. Nama sapaan datang dari `GET /auth/me`, bukan JWT (FSD-001-AUTH §2.9);
 * bila alamat itu belum menjawab, sapaan tetap tampil tanpa nama. Pintu Buka Kunci Akun
 * (FSD-001-AUTH §4) hanya dipasang untuk lapis HR/admin — `onUnlock` kosong berarti tersembunyi.
 */
export function HomeHeader({
  name,
  companyName,
  pendingCount,
  lockedCount,
  onUnlock,
  now,
}: {
  name: string | null;
  companyName: string;
  pendingCount: number | null;
  lockedCount: number | null;
  onUnlock?: () => void;
  now: Date;
}) {
  const navigate = useNavigate();
  const summary =
    pendingCount === null
      ? 'Ringkasan hari ini sedang dimuat.'
      : pendingCount === 0
        ? 'Tidak ada yang menunggu tindak lanjut Anda hari ini.'
        : `Ada ${pendingCount} hal yang menunggu tindak lanjut Anda hari ini.`;

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-1 pt-2">
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="t-label text-fg-3">
          {dayLine(now)} · {companyName}
        </span>
        <h1 className="m-0 font-display text-[30px] font-bold leading-[1.15] tracking-[-0.02em] text-fg-1">
          {greetingFor(now)}
          {name ? `, ${name}` : ''}.
        </h1>
        <p className="m-0 font-body text-sm font-medium text-fg-2">{summary}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onUnlock && (
          <Button variant="secondary" onClick={onUnlock}>
            Buka Kunci Akun
            {lockedCount ? (
              <span className="rounded-full bg-error-600 px-1.5 font-body text-[11px] font-bold leading-[18px] text-white tabular-nums">
                {lockedCount}
              </span>
            ) : null}
          </Button>
        )}
        <Button variant="secondary" onClick={() => navigate('/me/time/attendance')}>
          Attendance
        </Button>
        <Button variant="secondary" onClick={() => navigate('/me/time/time-off')}>
          Request Time Off
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">
              More Request
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuItem onSelect={() => navigate('/finance/benefit-reimbursement')}>Reimbursement</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/finance/cash-advance')}>Cash advance</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/me/time/overtime')}>Overtime</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/finance/loan')}>Loan</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
