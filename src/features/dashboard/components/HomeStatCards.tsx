import { useState } from 'react';
import type { ReactNode } from 'react';
import { CalendarCheck, CalendarDays, Palmtree, UserCheck, Users } from 'lucide-react';
import { Segmented } from '@/components/Segmented';
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

type Layer = 'me' | 'company';

const LAYER_KEY = 'sevaka-home-layer';

function readLayer(): Layer {
  try {
    return localStorage.getItem(LAYER_KEY) === 'company' ? 'company' : 'me';
  } catch {
    return 'me';
  }
}

function StatRow({
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
    <li className="flex items-center gap-3 border-b border-vapor py-3 first:pt-1 last:border-b-0 last:pb-0">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-secondary-700 [&_svg]:size-[18px]">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-body text-[13px] font-bold leading-tight text-fg-1">{label}</span>
        <span className="truncate font-body text-[11px] font-medium leading-tight text-fg-3">
          {empty ? 'Data belum tersedia' : foot}
        </span>
      </div>
      <span className="flex shrink-0 items-baseline gap-1">
        <span className="font-display text-2xl font-bold leading-none tracking-[-0.02em] text-fg-1">
          {loading ? '…' : empty ? '—' : value}
        </span>
        {unit && !loading && !empty && <span className="font-body text-xs font-medium text-fg-3">{unit}</span>}
      </span>
    </li>
  );
}

/**
 * Lima kartu angka HOME dua lapis (FSD-AUTH 0.7 §2.9), diringkas jadi satu panel di
 * kolom kanan supaya grafik ringkasan tetap di baris atas. Lapis **Milik Saya** tampil
 * untuk semua peran; peran HR/manajemen mendapat segmented untuk berpindah ke lapis
 * **Perusahaan** (pilihan terakhir diingat per browser). Nilai dari alamat agregat FINAL
 * `#95`–`#97` dan `employees/active-count`; kartu yang gagal dimuat tampil "—".
 */
export function HomeStatCards() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useHomeStats();
  const companyLayer = COMPANY_LAYER_ROLE.test(user?.role ?? '');
  const [picked, setPicked] = useState<Layer>(readLayer);
  const layer: Layer = companyLayer ? picked : 'me';
  const monthLabel = data ? `${MONTHS[Number(data.month.slice(5, 7)) - 1]} ${data.month.slice(0, 4)}` : 'bulan berjalan';

  const pick = (next: Layer) => {
    setPicked(next);
    try {
      localStorage.setItem(LAYER_KEY, next);
    } catch {
      /* penyimpanan browser tidak tersedia — pilihan hanya berlaku di sesi ini */
    }
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-1 bg-bg-surface px-5 py-[18px] shadow-card-sm">
      <header className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="m-0 font-display text-base font-bold leading-tight text-fg-1">Ringkasan</h4>
          <span className="font-body text-[11px] font-medium text-fg-3">
            {layer === 'me' ? 'Data milik Anda' : 'Seluruh perusahaan'}
          </span>
        </div>
        {companyLayer && (
          <Segmented<Layer>
            className="w-full self-stretch [&>button]:flex-1"
            value={layer}
            onChange={pick}
            options={[
              { value: 'me', label: 'Milik Saya' },
              { value: 'company', label: 'Perusahaan' },
            ]}
          />
        )}
      </header>

      <ul className="m-0 flex list-none flex-col p-0">
        {layer === 'me' ? (
          <>
            <StatRow
              icon={<Palmtree />}
              label="Sisa Cuti Saya"
              value={data?.leaveBalanceDays ?? null}
              unit="hari"
              foot={`Cuti tahunan · ${data?.periodYear ?? ''}`}
              loading={isLoading}
            />
            <StatRow
              icon={<CalendarCheck />}
              label="Kehadiran Saya"
              value={data?.presentDays ?? null}
              unit="hari"
              foot={`Hadir atau terlambat · ${monthLabel}`}
              loading={isLoading}
            />
          </>
        ) : (
          <>
            <StatRow
              icon={<Users />}
              label="Karyawan Aktif"
              value={data?.activeEmployees ?? null}
              foot="Status kerja Active"
              loading={isLoading}
            />
            <StatRow
              icon={<UserCheck />}
              label="Hadir Hari Ini"
              value={data?.presentToday ?? null}
              foot={data ? formatDate(data.workDate) : 'Hari ini'}
              loading={isLoading}
            />
            <StatRow
              icon={<CalendarDays />}
              label="Sedang Cuti Hari Ini"
              value={data?.onLeaveToday ?? null}
              foot="Cuti atau sakit"
              loading={isLoading}
            />
          </>
        )}
      </ul>
    </section>
  );
}
