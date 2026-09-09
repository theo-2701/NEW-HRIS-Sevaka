import { useNavigate } from 'react-router-dom';
import { Briefcase, CalendarPlus, ChevronDown, Clock, FileText, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth.store';
import { formatDateLong } from '@/lib/format';

const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** Hero dashboard — port `.dash-hero` (`css/dashboard.css`). */
export function DashboardHero() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const today = new Date();

  return (
    /* Tinggi hero mengikuti `--dash-hero-h` (308px) di `css/dashboard.css`. */
    <section className="relative flex min-h-[308px] items-center justify-between gap-6 overflow-hidden rounded-xl bg-[linear-gradient(var(--color-primary-600)_0%,var(--color-secondary-800)_100%)] px-8 py-6 text-cloud">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="m-0 font-display text-[32px] font-bold leading-tight tracking-[-0.02em] text-white">
            Selamat Datang,
            <br />
            {user?.name ?? 'Budi Santoso'}!
          </h1>
          <span className="mt-1.5 block font-body text-[13px] font-medium text-primary-200">
            {DAYS[today.getDay()]}, {formatDateLong(today)}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <HeroPill onClick={() => navigate('/time/attendance')}>Live Attendance</HeroPill>
          <HeroPill onClick={() => navigate('/time/time-off/requests')}>Request Time Off</HeroPill>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="light">
                More Request
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[220px]">
              <DropdownMenuItem onSelect={() => navigate('/finance/benefit-reimbursement')}>
                <FileText />
                Reimbursement
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/finance/cash-advance')}>
                <Briefcase />
                Business trip
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/time/overtime')}>
                <CalendarPlus />
                Overtime
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/time/scheduler/schedule')}>
                <Clock />
                Shift change
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/employees/new-joiner/add')}>
                <UserPlus />
                New employee
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <HeroArt />

      <span className="pointer-events-none absolute -right-32 -top-24 size-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,.14),transparent_60%)]" />
    </section>
  );
}

/** Tombol di atas hero — varian `light` dari `<Button>` (36px, sama seperti tombol lain). */
function HeroPill({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <Button variant="light" onClick={onClick}>
      {children}
    </Button>
  );
}

/**
 * Ilustrasi hero — versi ringkas dari artwork SVG prototype
 * (`index.html`, blok `.dash-hero__art`). Dekoratif, aman diganti.
 */
function HeroArt() {
  return (
    <svg
      viewBox="0 0 380 260"
      className="hidden h-[220px] w-[380px] shrink-0 lg:block"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="heroCard" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#e8f4fb" stopOpacity="0.92" />
        </linearGradient>
      </defs>

      <rect x="60" y="40" width="250" height="170" rx="16" fill="url(#heroCard)" />
      <rect x="80" y="62" width="96" height="10" rx="5" fill="#0284c7" opacity="0.85" />
      <rect x="80" y="80" width="150" height="8" rx="4" fill="#94a3b8" opacity="0.6" />

      <g>
        <rect x="80" y="106" width="46" height="72" rx="6" fill="#87ceeb" />
        <rect x="136" y="128" width="46" height="50" rx="6" fill="#0284c7" />
        <rect x="192" y="94" width="46" height="84" rx="6" fill="#026a9f" />
        <rect x="248" y="140" width="42" height="38" rx="6" fill="#fde68a" />
      </g>

      <g>
        <rect x="18" y="150" width="120" height="44" rx="12" fill="#ffffff" opacity="0.95" />
        <circle cx="42" cy="172" r="11" fill="#34d399" />
        <rect x="60" y="164" width="62" height="7" rx="3.5" fill="#334155" opacity="0.7" />
        <rect x="60" y="176" width="42" height="6" rx="3" fill="#94a3b8" opacity="0.7" />
      </g>

      <g>
        <rect x="256" y="18" width="104" height="52" rx="12" fill="#ffffff" opacity="0.95" />
        <rect x="270" y="32" width="34" height="8" rx="4" fill="#0284c7" />
        <rect x="270" y="46" width="70" height="7" rx="3.5" fill="#94a3b8" opacity="0.75" />
      </g>
    </svg>
  );
}
