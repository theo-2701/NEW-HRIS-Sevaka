import type { ReactNode } from 'react';
import { ChartColumn } from 'lucide-react';
import { Panel } from '@/features/dashboard/home/Panel';
import type { DashboardSummary, GenderSlice, JobLevelSlice, SeriesPoint } from '@/features/dashboard/types';
import { cn } from '@/lib/utils';

const number = (value: number) => value.toLocaleString('id-ID');
const percent = (value: number) => `${value.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`;

function Block({
  title,
  value,
  note,
  children,
}: {
  title: string;
  value: ReactNode;
  note: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-body text-[13px] font-semibold text-fg-2">{title}</span>
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-fg-1 tabular-nums">
            {value}
          </span>
          <span className="font-body text-xs font-medium text-fg-3">{note}</span>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Batang tipis satu warna; bulan terakhir ditonjolkan, sisanya konteks. */
function HeadcountBars({ data }: { data: SeriesPoint[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const slot = 100 / data.length;
  const barWidth = slot * 0.46;

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="none"
        className="min-h-[88px] w-full flex-1"
        role="img"
        aria-label={`Karyawan aktif per bulan: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}
      >
        <line
          x1="0"
          x2="100"
          y1="59.5"
          y2="59.5"
          className="stroke-border-2"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const h = (d.value / max) * 54;
          const x = i * slot + (slot - barWidth) / 2;
          const last = i === data.length - 1;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={59 - h}
                width={barWidth}
                height={h}
                rx="1.2"
                className={last ? 'fill-series-1' : 'fill-secondary-200'}
              />
              <rect x={i * slot} y="0" width={slot} height="60" className="fill-transparent">
                <title>{`${d.label}: ${number(d.value)} karyawan`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div
        className="grid font-body text-[11px] font-medium text-fg-3"
        style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}
      >
        {data.map((d, i) => (
          <span key={d.label} className={cn('text-center', i === data.length - 1 && 'font-semibold text-fg-1')}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Garis 2px + garis rata-rata putus-putus; titik terakhir diberi penanda 8px. */
function TurnoverLine({ data, average }: { data: SeriesPoint[]; average: number }) {
  const max = Math.max(...data.map((d) => d.value), average) * 1.25 || 1;
  const x = (i: number) => 6 + (i * 88) / Math.max(data.length - 1, 1);
  const y = (value: number) => 56 - (value / max) * 50;
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const lastIndex = data.length - 1;

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="relative min-h-[88px] flex-1">
        <svg
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full"
          role="img"
          aria-label={`Turnover bulanan: ${data.map((d) => `${d.label} ${d.value}%`).join(', ')}`}
        >
          <line
            x1="0"
            x2="100"
            y1="59.5"
            y2="59.5"
            className="stroke-border-2"
            strokeWidth="0.5"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            x2="100"
            y1={y(average)}
            y2={y(average)}
            className="stroke-silver"
            strokeWidth="1"
            strokeDasharray="3 3"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={points}
            fill="none"
            className="stroke-series-1"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* Titik hover sebagai HTML supaya tetap bundar walau SVG diregangkan. */}
        {data.map((d, i) => (
          <span
            key={d.label}
            title={`${d.label}: ${percent(d.value)}`}
            className="absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${x(i)}%`, top: `${(y(d.value) / 60) * 100}%` }}
          >
            {i === lastIndex && (
              <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-series-1 ring-2 ring-bg-surface" />
            )}
          </span>
        ))}
      </div>
      <div
        className="grid font-body text-[11px] font-medium text-fg-3"
        style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}
      >
        {data.map((d, i) => (
          <span key={d.label} className={cn('text-center', i === lastIndex && 'font-semibold text-fg-1')}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const GENDER_FILL: Record<string, string> = {
  Female: 'bg-series-1',
  Male: 'bg-series-2',
};

const GENDER_STROKE: Record<string, string> = {
  Female: 'stroke-series-1',
  Male: 'stroke-series-2',
};

/**
 * Donut komposisi — celah tipis antar-irisan; "Not Filled" = data kosong → abu netral, bukan
 * warna kategori. Bentuk donut dipilih supaya tinggi blok setara grafik lain di baris yang sama.
 */
function GenderDonut({ data }: { data: GenderSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const radius = 15.915; // keliling ≈ 100 → panjang dash langsung dalam persen
  const gap = data.length > 1 ? 1.2 : 0;
  let offset = 25; // mulai dari jam 12

  return (
    <div className="flex flex-1 items-center gap-5">
      <svg
        viewBox="0 0 42 42"
        className="size-[120px] shrink-0 -rotate-0"
        role="img"
        aria-label={data.map((d) => `${d.label} ${d.value}%`).join(', ')}
      >
        <circle cx="21" cy="21" r={radius} fill="none" className="stroke-vapor" strokeWidth="5" />
        {data.map((d) => {
          const share = (d.value / total) * 100;
          const segment = (
            <circle
              key={d.label}
              cx="21"
              cy="21"
              r={radius}
              fill="none"
              className={GENDER_STROKE[d.label] ?? 'stroke-silver'}
              strokeWidth="5"
              strokeDasharray={`${Math.max(share - gap, 0)} ${100 - Math.max(share - gap, 0)}`}
              strokeDashoffset={offset}
            >
              <title>{`${d.label}: ${percent(share)}`}</title>
            </circle>
          );
          offset -= share;
          return segment;
        })}
      </svg>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 font-body text-xs">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2 whitespace-nowrap">
            <span className={cn('size-2.5 rounded-full', GENDER_FILL[d.label] ?? 'bg-silver')} />
            <span className="font-medium text-fg-2">{d.label}</span>
            <span className="font-semibold text-fg-1 tabular-nums">{percent((d.value / total) * 100)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Peringkat jenjang — satu warna, panjang = jumlah; tidak butuh delapan warna kategori. */
function JobLevelRanks({ data }: { data: JobLevelSlice[] }) {
  const rows = [...data].sort((a, b) => b.count - a.count);
  const max = Math.max(...rows.map((d) => d.count), 1);
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {rows.map((d) => (
        <li
          key={d.label}
          title={`${d.label}: ${number(d.count)} karyawan (${percent(d.percent)})`}
          className="grid grid-cols-[64px_minmax(0,1fr)_30px_38px] items-center gap-2 font-body text-xs"
        >
          <span className="truncate font-medium text-fg-2">{d.label}</span>
          <span className="h-1.5 overflow-hidden rounded-pill bg-vapor">
            <span className="block h-full rounded-pill bg-series-1" style={{ width: `${(d.count / max) * 100}%` }} />
          </span>
          <span className="text-right font-semibold text-fg-1 tabular-nums">{number(d.count)}</span>
          <span className="text-right font-medium text-fg-3 tabular-nums">{percent(d.percent)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Tenaga kerja — empat bacaan ringkas dalam satu panel memanjang, menggantikan empat kartu grafik lama. */
export function WorkforcePanel({ summary }: { summary: DashboardSummary | undefined }) {
  if (!summary) {
    return (
      <Panel title="Tenaga kerja" icon={ChartColumn}>
        <p className="m-0 py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat data…</p>
      </Panel>
    );
  }

  const staff = summary.staffActive;
  const latest = staff.at(-1)?.value ?? 0;
  const previous = staff.at(-2)?.value ?? latest;
  const delta = latest - previous;
  const turnover = summary.turnover;
  const average = turnover.reduce((sum, d) => sum + d.value, 0) / Math.max(turnover.length, 1);

  return (
    <Panel title="Tenaga kerja" icon={ChartColumn} meta={`${staff[0]?.label ?? ''} – ${staff.at(-1)?.label ?? ''}`}>
      {/* Empat bacaan memanjang ke samping; di layar sempit turun jadi 2 lalu 1 kolom. */}
      <div className="grid gap-y-8 md:grid-cols-2 md:gap-x-10 xl:grid-cols-[1fr_1fr_1fr_1.15fr] xl:gap-x-0 xl:divide-x xl:divide-border-1 [&>*]:xl:px-6 [&>*:first-child]:xl:pl-0 [&>*:last-child]:xl:pr-0">
        <Block
          title="Karyawan aktif"
          value={number(latest)}
          note={
            delta === 0
              ? 'sama dengan bulan lalu'
              : `${delta > 0 ? '+' : '−'}${number(Math.abs(delta))} dari bulan lalu`
          }
        >
          <HeadcountBars data={staff} />
        </Block>

        <Block
          title="Turnover bulanan"
          value={percent(turnover.at(-1)?.value ?? 0)}
          note={`rata-rata 6 bulan ${percent(average)}`}
        >
          <TurnoverLine data={turnover} average={average} />
        </Block>

        <Block
          title="Komposisi gender"
          value={percent(summary.gender[0]?.value ?? 0)}
          note={`${summary.gender[0]?.label ?? ''} dari karyawan aktif`}
        >
          <GenderDonut data={summary.gender} />
        </Block>

        <Block title="Jenjang jabatan" value={number(summary.totalEmployees)} note="total karyawan">
          <JobLevelRanks data={summary.jobLevels} />
        </Block>
      </div>
    </Panel>
  );
}
