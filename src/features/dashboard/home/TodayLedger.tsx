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
}

function FigureCell({ figure, loading }: { figure: Figure; loading: boolean }) {
  const navigate = useNavigate();
  const empty = !loading && figure.value === null;

  return (
    <div className="flex min-w-0 flex-col gap-1 px-5 py-4">
      <span className="font-body text-[13px] font-semibold leading-tight text-fg-2">{figure.label}</span>
      <span className="font-display text-[34px] font-bold leading-none tracking-[-0.03em] text-fg-1 tabular-nums">
        {loading ? '…' : empty ? '—' : figure.value}
        {figure.unit && !loading && !empty && (
          <small className="ml-1.5 font-body text-sm font-medium tracking-normal text-fg-3">{figure.unit}</small>
        )}
      </span>
      <span className="font-body text-xs font-medium text-fg-3">{empty ? 'Data belum tersedia' : figure.foot}</span>
      <button
        type="button"
        onClick={() => navigate(figure.to)}
        className="mt-1 w-fit font-body text-[13px] font-semibold text-fg-link hover:text-fg-link-hover hover:underline"
      >
        {figure.cta}
      </button>
    </div>
  );
}

function Group({ title, figures, loading }: { title: string; figures: Figure[]; loading: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="t-label px-5 pt-3.5 text-fg-3">{title}</span>
      <div
        className="grid divide-y divide-border-1 sm:divide-x sm:divide-y-0"
        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))` }}
      >
        {figures.map((figure) => (
          <FigureCell key={figure.label} figure={figure} loading={loading} />
        ))}
      </div>
    </div>
  );
}

/**
 * Lima angka HOME dua lapis (FSD-001-AUTH §2.9) dalam satu pita: **Milik saya** untuk semua
 * peran, **Perusahaan** hanya HR/manajemen. Gagal-sebagian tampil "—", layar tidak ikut gagal.
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
    },
    {
      label: 'Kehadiran saya bulan ini',
      value: stats?.presentDays ?? null,
      unit: 'hari',
      foot: `Hadir atau terlambat · ${stats ? monthLabel(stats.month) : 'bulan berjalan'}`,
      cta: 'Lihat kehadiran',
      to: '/me/time/attendance',
    },
  ];

  const company: Figure[] = [
    {
      label: 'Karyawan aktif',
      value: stats?.activeEmployees ?? null,
      foot: 'Status kerja Active',
      cta: 'Lihat direktori',
      to: '/employees/directory',
    },
    {
      label: 'Hadir hari ini',
      value: stats?.presentToday ?? null,
      foot: stats ? formatDate(stats.workDate) : 'Hari ini',
      cta: 'Lihat kehadiran',
      to: '/time/attendance',
    },
    {
      label: 'Sedang cuti hari ini',
      value: stats?.onLeaveToday ?? null,
      foot: 'Cuti atau sakit',
      cta: 'Lihat pengajuan cuti',
      to: '/time/time-off/requests',
    },
  ];

  return (
    <section
      className={
        companyLayer
          ? 'grid rounded-xl border border-border-1 bg-bg-surface lg:grid-cols-[2fr_3fr] lg:divide-x lg:divide-border-1'
          : 'grid rounded-xl border border-border-1 bg-bg-surface'
      }
      aria-label="Ringkasan hari ini"
    >
      <Group title="Milik saya" figures={mine} loading={loading} />
      {companyLayer && (
        <div className="border-t border-border-1 lg:border-t-0">
          <Group title="Perusahaan" figures={company} loading={loading} />
        </div>
      )}
    </section>
  );
}
