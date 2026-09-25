import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarCheck, CalendarDays, Palmtree, UserCheck, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { monthLabel } from '@/features/dashboard/home/homeRules';
import type { HomeStats } from '@/features/dashboard/types';
import { formatDate } from '@/lib/format';

interface Figure {
  label: string;
  value: number | null;
  unit?: string;
  foot: string;
  cta: string;
  to: string;
  icon: LucideIcon;
}

/** Satu kartu kaca: seluruh kartu bisa diklik menuju layar rinciannya. */
function FigureCard({ figure, loading }: { figure: Figure; loading: boolean }) {
  const navigate = useNavigate();
  const empty = !loading && figure.value === null;
  const Icon = figure.icon;

  return (
    <button
      type="button"
      onClick={() => navigate(figure.to)}
      className="group flex min-w-0 flex-col gap-1 rounded-xl bg-linear-to-b from-white/16 to-white/6 p-4 text-left ring-1 ring-inset ring-white/20 backdrop-blur-md transition duration-200 ease-standard hover:-translate-y-0.5 hover:from-white/22 hover:to-white/10 hover:ring-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-body text-[13px] font-semibold leading-tight text-white/80">{figure.label}</span>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-inset ring-white/20">
          <Icon className="size-4 text-white" strokeWidth={1.75} />
        </span>
      </span>
      <span className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-white tabular-nums">
        {loading ? '…' : empty ? '—' : figure.value}
        {figure.unit && !loading && !empty && (
          <small className="ml-1.5 font-body text-sm font-medium tracking-normal text-white/70">{figure.unit}</small>
        )}
      </span>
      <span className="font-body text-xs font-medium text-white/65">{empty ? 'Data belum tersedia' : figure.foot}</span>
      <span className="mt-1.5 inline-flex w-fit items-center gap-1 font-body text-[13px] font-semibold text-primary-200 transition-colors group-hover:text-white">
        {figure.cta}
        <ArrowRight
          className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={1.75}
        />
      </span>
    </button>
  );
}

function Group({
  title,
  figures,
  loading,
  columns,
}: {
  title: string;
  figures: Figure[];
  loading: boolean;
  columns: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span className="flex items-center gap-3 font-body text-[11px] font-bold uppercase tracking-[0.08em] text-white/70">
        {title}
        <span className="h-px flex-1 bg-white/15" />
      </span>
      <div className={`grid gap-3 ${columns}`}>
        {figures.map((figure) => (
          <FigureCard key={figure.label} figure={figure} loading={loading} />
        ))}
      </div>
    </div>
  );
}

/**
 * Lima angka HOME dua lapis (FSD-001-AUTH §2.9) sebagai kartu kaca di dalam hero: **Milik saya**
 * untuk semua peran, **Perusahaan** hanya HR/manajemen. Gagal-sebagian tampil "—", layar tidak ikut gagal.
 */
export function TodayLedger({
  stats,
  loading,
  companyLayer,
}: {
  stats: HomeStats | undefined;
  loading: boolean;
  companyLayer: boolean;
}) {
  const mine: Figure[] = [
    {
      label: 'Sisa cuti saya',
      value: stats?.leaveBalanceDays ?? null,
      unit: 'hari',
      foot: `Cuti tahunan · periode ${stats?.periodYear ?? ''}`,
      cta: 'Ajukan cuti',
      to: '/me/time/time-off',
      icon: CalendarDays,
    },
    {
      label: 'Kehadiran saya bulan ini',
      value: stats?.presentDays ?? null,
      unit: 'hari',
      foot: `Hadir atau terlambat · ${stats ? monthLabel(stats.month) : 'bulan berjalan'}`,
      cta: 'Lihat kehadiran',
      to: '/me/time/attendance',
      icon: CalendarCheck,
    },
  ];

  const company: Figure[] = [
    {
      label: 'Karyawan aktif',
      value: stats?.activeEmployees ?? null,
      foot: 'Status kerja Active',
      cta: 'Lihat direktori',
      to: '/employees/directory',
      icon: Users,
    },
    {
      label: 'Hadir hari ini',
      value: stats?.presentToday ?? null,
      foot: stats ? formatDate(stats.workDate) : 'Hari ini',
      cta: 'Lihat kehadiran',
      to: '/time/attendance',
      icon: UserCheck,
    },
    {
      label: 'Sedang cuti hari ini',
      value: stats?.onLeaveToday ?? null,
      foot: 'Cuti atau sakit',
      cta: 'Lihat pengajuan cuti',
      to: '/time/time-off/requests',
      icon: Palmtree,
    },
  ];

  return (
    <div className={companyLayer ? 'grid gap-5 lg:grid-cols-[2fr_3fr]' : 'grid gap-5'}>
      <Group title="Milik saya" figures={mine} loading={loading} columns="sm:grid-cols-2" />
      {companyLayer && <Group title="Perusahaan" figures={company} loading={loading} columns="sm:grid-cols-3" />}
    </div>
  );
}
