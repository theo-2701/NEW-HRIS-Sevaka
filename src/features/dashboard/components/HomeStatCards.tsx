import type { ReactNode } from 'react';
import { CalendarCheck, CalendarDays, Palmtree, UserCheck, Users } from 'lucide-react';
import { useHomeStats } from '@/features/dashboard/hooks/useDashboard';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** Lapis Perusahaan hanya untuk peran HR/manajemen (FSD-AUTH §2.9, DS-5). */
const COMPANY_LAYER_ROLE = /admin|hr|manager|manajer/i;

function StatTile({
  icon,
  label,
  value,
  unit,
  foot,
  loading,
}: {
  icon: ReactNode;
  label: string;
  value: number | null;
  unit?: string;
  foot: string;
  loading: boolean;
}) {
  const empty = !loading && value === null;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-1 bg-bg-surface p-[18px] shadow-card-sm">
      <header className="flex items-center gap-2.5">
        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-50 text-secondary-700 [&_svg]:size-[18px]">
          {icon}
        </span>
        <h3 className="m-0 font-body text-sm font-bold leading-tight text-fg-1">{label}</h3>
      </header>
      <p className="m-0 flex items-baseline gap-1.5">
        <span className="font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-fg-1">
          {loading ? '…' : empty ? '—' : value}
        </span>
        {unit && !loading && !empty && <span className="font-body text-[13px] font-semibold text-fg-3">{unit}</span>}
      </p>
      <span className="font-body text-xs font-medium text-fg-3">{empty ? 'Data belum tersedia' : foot}</span>
    </section>
  );
}

function Layer({ title, sub, cols, children }: { title: string; sub: string; cols: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="m-0 font-body text-[13px] font-bold uppercase tracking-[0.06em] text-fg-2">{title}</h2>
        <span className="font-body text-xs font-medium text-fg-3">{sub}</span>
      </div>
      <div className={cn('grid gap-4', cols)}>{children}</div>
    </div>
  );
}

/**
 * Lima kartu angka HOME dua lapis (FSD-AUTH 0.7 §2.9) — menggantikan empat kartu
 * grafik prototype yang tidak punya backing kontrak. Nilai dari alamat agregat FINAL:
 * `leave-balances/me-summary` (#95), `attendance-summaries/me-monthly` (#96),
 * `employees/active-count` (§7.17), `attendance-summaries/today-overview` (#97).
 * Kartu yang gagal dimuat tampil "—" tanpa menggagalkan layar.
 */
export function HomeStatCards() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useHomeStats();
  const companyLayer = COMPANY_LAYER_ROLE.test(user?.role ?? '');
  const monthLabel = data ? `${MONTHS[Number(data.month.slice(5, 7)) - 1]} ${data.month.slice(0, 4)}` : 'bulan berjalan';

  return (
    <section className={cn('grid gap-4', companyLayer && 'xl:grid-cols-[2fr_3fr]')}>
      <Layer title="Milik Saya" sub="Seluruh peran" cols="sm:grid-cols-2">
        <StatTile
          icon={<Palmtree />}
          label="Sisa Cuti Saya"
          value={data?.leaveBalanceDays ?? null}
          unit="hari"
          foot={`Cuti tahunan · periode ${data?.periodYear ?? ''}`}
          loading={isLoading}
        />
        <StatTile
          icon={<CalendarCheck />}
          label="Kehadiran Saya Bulan Berjalan"
          value={data?.presentDays ?? null}
          unit="hari"
          foot={`Hadir atau terlambat · ${monthLabel}`}
          loading={isLoading}
        />
      </Layer>

      {companyLayer && (
        <Layer title="Perusahaan" sub="HR & manajemen" cols="sm:grid-cols-3">
          <StatTile
            icon={<Users />}
            label="Jumlah Karyawan Aktif"
            value={data?.activeEmployees ?? null}
            foot="Status kerja Active"
            loading={isLoading}
          />
          <StatTile
            icon={<UserCheck />}
            label="Hadir Hari Ini"
            value={data?.presentToday ?? null}
            foot={data ? formatDate(data.workDate) : 'Hari ini'}
            loading={isLoading}
          />
          <StatTile
            icon={<CalendarDays />}
            label="Sedang Cuti Hari Ini"
            value={data?.onLeaveToday ?? null}
            foot="Cuti atau sakit"
            loading={isLoading}
          />
        </Layer>
      )}
    </section>
  );
}
