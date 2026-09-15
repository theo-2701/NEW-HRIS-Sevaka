import type { GenderSlice, JobLevelSlice, SeriesPoint } from '@/features/dashboard/types';
import { formatNumber } from '@/lib/format';

/**
 * Donut Gender Diversity — port `.donut-wrap`: donut 178px di tengah,
 * legenda vertikal di bawahnya.
 */
export function GenderDonut({ data }: { data: GenderSlice[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const circumference = 2 * Math.PI * 36;
  let offset = 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5">
      <svg viewBox="0 0 100 100" className="size-[178px]" role="img" aria-label="Diagram gender">
        {data.map((slice) => {
          const length = (slice.value / total) * circumference;
          const dash = `${length} ${circumference}`;
          const dashOffset = -offset;
          offset += length;
          return (
            <circle
              key={slice.label}
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke={slice.color}
              strokeWidth="18"
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
            />
          );
        })}
      </svg>

      <ul className="m-0 flex w-full list-none flex-col gap-1.5 p-0">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2 font-body text-xs font-medium leading-tight text-fg-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
            {slice.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Bar chart Staff Active — port `.barchart-wrap`: gridline + label sumbu Y. */
export function StaffActiveChart({ data }: { data: SeriesPoint[] }) {
  const ticks = [500, 400, 300, 200, 100];
  const max = 500;

  return (
    <div className="flex flex-1 flex-col gap-1">
      <svg viewBox="0 0 320 220" className="h-[220px] w-full" role="img" aria-label="Grafik staf aktif">
        <g fontFamily="Inter" fontSize="11" fill="var(--color-fg-4)">
          {ticks.map((tick, i) => (
            <g key={tick}>
              <text x="2" y={24 + i * 40}>
                {tick}
              </text>
              <line x1="28" y1={20 + i * 40} x2="320" y2={20 + i * 40} stroke="#eef3f7" />
            </g>
          ))}
          <text x="6" y="204">
            0
          </text>
        </g>

        <g fill="var(--color-secondary-500)">
          {data.map((point, i) => {
            const height = (point.value / max) * 180;
            return <rect key={point.label} x={38 + i * 46} y={200 - height} width="32" height={height} rx="3" />;
          })}
        </g>

        <g fontFamily="Inter" fontSize="11" fill="var(--color-fg-2)" textAnchor="middle">
          {data.map((point, i) => (
            <text key={point.label} x={54 + i * 46} y="216">
              {point.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/** Line chart Monthly Turnover — port `.linechart-wrap`: sumbu persen 0–10%. */
export function TurnoverChart({ data }: { data: SeriesPoint[] }) {
  const max = 10;
  const stepX = 234 / Math.max(data.length - 1, 1);
  const x = (i: number) => 42 + i * stepX;
  const y = (value: number) => 190 - (value / max) * 170;
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');

  return (
    <div className="flex flex-1 flex-col gap-1">
      <svg viewBox="0 0 320 220" className="h-[220px] w-full" role="img" aria-label="Grafik turnover bulanan">
        <g fontFamily="Inter" fontSize="11" fill="var(--color-fg-4)">
          {[10, 5, 0].map((tick) => (
            <g key={tick}>
              <text x="2" y={y(tick) + 4}>
                {tick}%
              </text>
              <line x1="34" y1={y(tick)} x2="320" y2={y(tick)} stroke="#eef3f7" />
            </g>
          ))}
        </g>

        <polyline
          points={points}
          fill="none"
          stroke="var(--color-secondary-500)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <circle
            key={d.label}
            cx={x(i)}
            cy={y(d.value)}
            r="4"
            fill="var(--color-bg-surface)"
            stroke="var(--color-secondary-500)"
            strokeWidth="2"
          />
        ))}

        <g fontFamily="Inter" fontSize="11" fill="var(--color-fg-2)" textAnchor="middle">
          {data.map((d, i) => (
            <text key={d.label} x={x(i)} y="216">
              {d.label}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * Job Level — port `.joblevel-*`: bar bertumpuk + tick 0/100%, baris Total,
 * lalu daftar level dengan swatch, jumlah, dan persentase.
 */
export function JobLevelBar({ data, total }: { data: JobLevelSlice[]; total: number }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-3 w-full overflow-hidden rounded-pill bg-vapor">
        {data.map((slice) => (
          <span key={slice.label} style={{ width: `${slice.percent}%`, background: slice.color }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-body text-[10px] font-medium leading-none text-fg-4">
        <span>0%</span>
        <span>100%</span>
      </div>

      <div className="mb-2 mt-3.5 flex justify-between font-body text-xs font-bold leading-none text-fg-1">
        <span>Total</span>
        <b className="tabular-nums">{formatNumber(total)}</b>
      </div>

      <ul className="m-0 flex flex-1 list-none flex-col justify-between p-0">
        {data.map((slice) => (
          <li
            key={slice.label}
            className="grid grid-cols-[14px_1fr_auto_auto] items-center gap-2 py-[3px] font-body text-xs font-medium leading-snug"
          >
            <span className="size-2.5 rounded-[3px]" style={{ background: slice.color }} />
            <span className="truncate text-fg-2">{slice.label}</span>
            <span className="font-semibold tabular-nums text-fg-1">{formatNumber(slice.count)}</span>
            <span className="w-9 text-right tabular-nums text-fg-3">{slice.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
