import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Award,
  Bell,
  Briefcase,
  Check,
  ChevronDown,
  HelpCircle,
  LayoutGrid,
  LineChart,
  LogOut,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar } from '@/components/Avatar';
import { SevakaLogo } from '@/components/brand/SevakaLogo';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

interface ProductEntry {
  id: string;
  icon: typeof Users;
  name: string;
  desc: string;
  /** Tanpa route = produk belum tersedia (tampil sebagai "soon"). */
  route?: string;
}

/** Produk SEVAKA — port array `PRODUCTS` di `js/shell.js`. */
const PRODUCTS: ProductEntry[] = [
  { id: 'HRIS', icon: Users, name: 'HRIS', desc: 'Human Resource Information System', route: '/' },
  { id: 'Recruitment', icon: Briefcase, name: 'Recruitment', desc: 'Talent pipeline & assessments', route: '/recruitment' },
  {
    id: 'Performance',
    icon: Award,
    name: 'Performance Management',
    desc: 'Reviews, goals & calibration',
    route: '/performance/cycles',
  },
  { id: 'Insights', icon: LineChart, name: 'Insights', desc: 'AI workforce analytics' },
];

/** Topnav — port `topnavHTML()` (`js/shell.js`) + `.topnav` (`css/app.css`). */
export function Topnav() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [product, setProduct] = useState<string>('HRIS');

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-5 border-b border-border-1 bg-bg-surface px-6 shadow-card-sm">
      <Link to="/" aria-label="SEVAKA — Dashboard" className="flex shrink-0 items-center">
        <SevakaLogo size="md" />
      </Link>

      <span className="mx-1 h-8 w-px bg-border-1" />

      {/* ---- Product picker ---- */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-md px-2.5 transition-colors duration-200 ease-standard hover:bg-mist data-[state=open]:bg-mist"
          >
            <span className="font-body text-sm font-bold leading-none text-fg-1">{product}</span>
            <ChevronDown className="size-3.5 text-fg-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-80">
          <div className="px-2.5 pb-1.5 pt-2 t-label text-fg-4">SEVAKA products</div>
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            const soon = !p.route;
            return (
              <DropdownMenuItem
                key={p.id}
                disabled={soon}
                onSelect={() => {
                  if (!p.route) return;
                  setProduct(p.id);
                  navigate(p.route);
                }}
                className="gap-2.5 p-2.5"
              >
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-md',
                    soon ? 'bg-vapor text-fg-4' : 'bg-primary-200 text-secondary-700',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-body text-[13px] font-bold leading-tight text-fg-1">{p.name}</span>
                  <span className="font-body text-[11px] font-medium leading-snug text-fg-3">{p.desc}</span>
                </span>
                {p.id === product && <Check className="size-4 shrink-0 text-secondary-500" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* ---- Right cluster ---- */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1.5 rounded-pill px-3 font-body text-[10px] font-bold leading-none tracking-[0.02em] text-cloud shadow-[inset_0_2px_16px_0_rgba(0,0,0,.25)] transition-[filter] duration-200 ease-standard hover:brightness-110 [background:linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,.16)_100%),linear-gradient(var(--color-secondary-600)_0%,var(--color-primary-600)_50%,var(--color-primary-200)_75%,var(--color-primary-700)_100%)]"
        >
          <Sparkles className="size-3.5" />
          SUMMARIZE DATA
        </button>

        <IconButton label="Tambah">
          <Plus className="size-[18px]" />
        </IconButton>
        <IconButton label="Cari">
          <Search className="size-[18px]" />
        </IconButton>

        <Link
          to="/company-management/notifications"
          aria-label="Notifikasi"
          className="relative inline-flex size-9 items-center justify-center rounded-md text-fg-2 transition-colors duration-200 ease-standard hover:bg-mist hover:text-secondary-700"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-bg-surface bg-error-500" />
        </Link>

        <IconButton label="Aplikasi">
          <LayoutGrid className="size-[18px]" />
        </IconButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-mist">
              <Avatar name={user?.name ?? 'Tony Stark'} />
              <span className="flex flex-col text-left">
                <span className="font-body text-[13px] font-bold leading-tight text-fg-1">
                  {user?.name ?? 'Tony Stark'}
                </span>
                <span className="mt-0.5 font-body text-[11px] font-medium leading-tight text-fg-3">
                  {user?.role ?? 'Administrator'}
                </span>
              </span>
              <ChevronDown className="size-4 text-fg-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => navigate('/me/profile')}>
              <User />
              My profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate('/settings/configuration/employee')}>
              <Settings />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle />
              Help &amp; support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              danger
              onSelect={() => {
                clear();
                navigate('/auth/login');
              }}
            >
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

/**
 * Ikon topnav tanpa kotak: 36px area klik, latar transparan, hanya tint Mist
 * saat hover. Jangan mengembalikan `bg-cloud` + `shadow-inset-rim` di sini —
 * kotak itu khusus kontrol yang bisa diisi (search box, field).
 */
function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-md text-fg-2 transition-colors duration-200 ease-standard hover:bg-mist hover:text-secondary-700"
    >
      {children}
    </button>
  );
}
