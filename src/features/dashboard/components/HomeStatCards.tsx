import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useHomeStats } from '@/features/dashboard/hooks/useDashboard';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/format';

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

function StatCardShell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-xl border border-border-1 bg-bg-surface px-5 py-[18px] shadow-card-sm">
      <header className="flex items-baseline justify-between gap-2">
        <h4 className="m-0 font-display text-base font-bold leading-tight text-fg-1">{title}</h4>
        <span className="font-body text-[11px] font-medium text-fg-3">{sub}</span>
      </header>
      {children}
    </section>
  );
}

function StatSection({
  label,
  value,
  unit,
  foot,
  cta,
  to,
  loading,
}: {
  label: string;
  value: number | null;
  unit?: string;
  foot: string;
  cta: string;
  to: string;
  loading: boolean;
}) {
  const empty = !loading && value === null;
  return (
    <div className="flex flex-col gap-1.5 border-t border-border-1 pt-3.5 first-of-type:border-t-0 first-of-type:pt-0">
      <span className="font-body text-[13px] font-bold leading-tight text-fg-1">{label}</span>
      <span className="font-display text-[32px] font-bold leading-none tracking-[-0.02em] text-fg-1">
        {loading ? '…' : empty ? '—' : value}
        {unit && !loading && !empty && <small className="ml-1.5 font-body text-sm font-medium text-fg-3">{unit}</small>}
      </span>
      <span className="font-body text-xs font-medium text-fg-3">{empty ? 'Data belum tersedia' : foot}</span>
      <Link
        to={to}
        className="inline-flex w-fit items-center gap-1.5 font-body text-[13px] font-semibold text-secondary-600 hover:underline"
      >
        {cta}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

/**
 * Lima kartu angka HOME dua lapis (FSD-AUTH 0.7 §2.9) sebagai dua kartu di kolom kanan:
 * **Milik Saya** untuk semua peran, **Perusahaan** hanya untuk HR/manajemen. Nilai dari
 * alamat agregat FINAL `#95`–`#97` dan `employees/active-count`; yang gagal dimuat tampil "—".
 */
export function HomeStatCards() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useHomeStats();
  const companyLayer = COMPANY_LAYER_ROLE.test(user?.role ?? '');
  const monthLabel = data ? `${MONTHS[Number(data.month.slice(5, 7)) - 1]} ${data.month.slice(0, 4)}` : 'bulan berjalan';

  return (
    <>
      <StatCardShell title="Milik Saya" sub="Data pribadi Anda">
        <StatSection
          label="Sisa Cuti Saya"
          value={data?.leaveBalanceDays ?? null}
          unit="hari"
          foot={`Cuti tahunan · periode ${data?.periodYear ?? ''}`}
          cta="Ajukan cuti"
          to="/time/time-off/requests"
          loading={isLoading}
        />
        <StatSection
          label="Kehadiran Saya Bulan Berjalan"
          value={data?.presentDays ?? null}
          unit="hari"
          foot={`Hadir atau terlambat · ${monthLabel}`}
          cta="Lihat kehadiran"
          to="/time/attendance"
          loading={isLoading}
        />
      </StatCardShell>

      {companyLayer && (
        <StatCardShell title="Perusahaan" sub="HR & manajemen">
          <StatSection
            label="Jumlah Karyawan Aktif"
            value={data?.activeEmployees ?? null}
            foot="Status kerja Active"
            cta="Lihat direktori"
            to="/employees/directory"
            loading={isLoading}
          />
          <StatSection
            label="Hadir Hari Ini"
            value={data?.presentToday ?? null}
            foot={data ? formatDate(data.workDate) : 'Hari ini'}
            cta="Lihat kehadiran"
            to="/time/attendance"
            loading={isLoading}
          />
          <StatSection
            label="Sedang Cuti Hari Ini"
            value={data?.onLeaveToday ?? null}
            foot="Cuti atau sakit"
            cta="Lihat pengajuan cuti"
            to="/time/time-off/requests"
            loading={isLoading}
          />
        </StatCardShell>
      )}
    </>
  );
}
