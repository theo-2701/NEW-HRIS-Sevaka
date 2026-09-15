import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building,
  CalendarClock,
  FileStack,
  FileText,
  GraduationCap,
  Lightbulb,
  Puzzle,
  Repeat,
  ShieldCheck,
  User,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Kartu Keamanan Akun — port `.security-card`. */
export function SecurityCard({ lockedCount, onUnlock }: { lockedCount: number; onUnlock: () => void }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-xl border border-border-1 bg-bg-surface p-5 shadow-card-sm">
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-200 text-secondary-700">
          <ShieldCheck className="size-5" />
        </span>
        <div className="min-w-0">
          <h4 className="m-0 font-display text-base font-bold leading-tight text-fg-1">Keamanan Akun</h4>
          <span className="font-body text-[11px] font-medium leading-snug text-fg-3">
            Akses SUPER_ADMIN / HR Manager
          </span>
        </div>
      </header>

      <p className="m-0 font-body text-[13px] font-medium leading-normal text-fg-3">
        Akun karyawan terkunci otomatis setelah 5× gagal login. Buka kembali tanpa menunggu auto-unlock 15 menit.
      </p>

      <span className="inline-flex w-fit items-center gap-2 rounded-pill bg-error-50 px-3 py-1.5 font-body text-xs font-bold text-error-800">
        <span className="size-2 rounded-full bg-error-500" />
        {lockedCount} akun terkunci
      </span>

      {/* Tombol memakai <Button> standar (36px) — jangan bikin tinggi sendiri. */}
      <Button className="w-full" onClick={onUnlock}>
        Buka Kunci Akun
      </Button>
    </section>
  );
}

const QUICK_LINKS = [
  { label: 'Employee Profile', to: '/me/profile', icon: User },
  { label: 'Employee Transfer', to: '/employees/transfer', icon: Repeat },
  { label: 'Company Settings', to: '/company/branch', icon: Building },
  { label: 'Integrations', to: '/settings/configuration/organization', icon: Puzzle },
];

const APPLICATION_LINKS = [
  { label: 'Forms', to: '/productivity/forms', icon: FileText },
  { label: 'Performance Review', to: '/performance/cycles', icon: Award },
  { label: 'Talent Management', to: '/employees/directory', icon: UsersRound },
  { label: 'Insight', to: '/', icon: Lightbulb },
  { label: 'Timesheet', to: '/productivity/timesheet/tracker', icon: CalendarClock },
  { label: 'Document Template', to: '/company-management/files/templates', icon: FileStack },
  { label: 'Training', to: '/', icon: GraduationCap },
];

/** Kartu Quick Links + Application — port `.qlinks`. */
export function QuickLinksCard() {
  return (
    <aside className="flex flex-1 flex-col gap-3 rounded-xl border border-border-1 bg-bg-surface p-5 shadow-card-sm">
      <QuickLinkGroup heading="Quick Links" items={QUICK_LINKS} />
      <QuickLinkGroup heading="Application" items={APPLICATION_LINKS} />
    </aside>
  );
}

function QuickLinkGroup({
  heading,
  items,
}: {
  heading: string;
  items: { label: string; to: string; icon: typeof User }[];
}) {
  return (
    <div>
      <h4 className="m-0 mb-2 font-body text-[13px] font-bold leading-tight text-fg-1">{heading}</h4>
      <div className="flex flex-col">
        {items.map(({ label, to, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-2.5 rounded-md px-1.5 py-2 font-body text-[13px] font-medium text-fg-2 transition-colors duration-200 ease-standard hover:bg-mist hover:text-secondary-700"
          >
            <Icon className="size-4 shrink-0 text-fg-3" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Banner promosi berputar — port `.banner`. */
export function PromoBanner() {
  return (
    <section className="relative grid min-h-[260px] grid-cols-[220px_1fr] items-center gap-7 overflow-hidden rounded-xl bg-[linear-gradient(135deg,#e8f4fb_0%,#cee9f5_70%,#b3dcef_100%)] px-9 py-7">
      <div className="flex items-center justify-center" aria-hidden>
        <img src="/dashboard-banner.png" alt="" draggable={false} className="w-full max-w-[220px]" />
      </div>

      <div className="flex flex-col gap-4">
        <p className="m-0 max-w-[520px] font-display text-xl font-bold leading-snug text-secondary-900">
          Pantau kehadiran tim secara real-time dan setujui permintaan cuti dengan lebih cepat melalui sistem HRIS.
        </p>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="inline-flex w-fit items-center gap-2 font-body text-sm font-bold text-secondary-700 hover:underline"
        >
          Pelajari Selengkapnya
          <ArrowRight className="size-4" />
        </a>
      </div>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            className={
              i === 0
                ? 'h-1.5 w-6 rounded-pill bg-secondary-500'
                : 'size-1.5 rounded-pill bg-secondary-500/25 transition-colors hover:bg-secondary-500/50'
            }
          />
        ))}
      </div>
    </section>
  );
}
