import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { GapValue, PlanStatusBadge } from '@/features/manpower/components/ManpowerBits';
import { UNIT_OPTIONS, labelOf, planTotals } from '@/features/manpower/types';
import type { ManpowerPlan, PlanLine } from '@/features/manpower/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * Satu rencana headcount — port baris `.plan-row` + `.unit-row` yang bisa
 * dibuka-tutup. Rencana ACTIVE terbuka secara default; sisanya menutup supaya
 * daftar tetap ringkas.
 */
export function PlanCard({ plan }: { plan: ManpowerPlan }) {
  const [open, setOpen] = useState(plan.status === 'ACTIVE');
  const totals = planTotals(plan);

  return (
    <Card className="gap-0 p-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="grid items-center gap-x-6 gap-y-3 px-5 py-4 text-left md:grid-cols-[minmax(0,1fr)_240px_96px]"
      >
        <span className="flex min-w-0 items-start gap-3">
          <ChevronRight
            className={cn(
              'mt-0.5 size-4 shrink-0 text-fg-3 transition-transform duration-200 ease-standard',
              open && 'rotate-90',
            )}
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-body text-sm font-bold text-fg-1">{plan.title}</span>
            <span className="font-body text-xs font-medium text-fg-3">
              {formatDate(plan.periodStart)} – {formatDate(plan.periodEnd)} · {plan.lines.length} unit · dibuat{' '}
              {plan.createdBy}
            </span>
          </span>
        </span>

        <FillProgress target={totals.target} actual={totals.actual} />

        <span className="flex md:justify-end">
          <PlanStatusBadge status={plan.status} />
        </span>
      </button>

      {open && (
        <div className="border-t border-border-1 px-5 pb-5 pt-4">
          <DataTable<PlanLine>
            rows={plan.lines}
            rowKey={(row) => row.unitId}
            empty="Rencana ini belum punya baris target."
            columns={[
              { key: 'unit', header: 'Unit', strong: true, render: (row) => labelOf(UNIT_OPTIONS, row.unitId) },
              { key: 'target', header: 'Target', align: 'right', render: (row) => row.target },
              {
                key: 'actual',
                header: 'Actual',
                align: 'right',
                muted: true,
                render: (row) => (row.actual === null ? '—' : row.actual),
              },
              {
                key: 'gap',
                header: 'Gap',
                align: 'right',
                render: (row) => <GapValue gap={row.actual === null ? null : row.target - row.actual} />,
              },
            ]}
          />
        </div>
      )}
    </Card>
  );
}

function FillProgress({ target, actual }: { target: number; actual: number | null }) {
  const gap = actual === null ? null : target - actual;
  const percent = actual === null || target === 0 ? 0 : Math.min(actual / target, 1) * 100;

  const status =
    gap === null
      ? { text: 'Belum berjalan', className: 'text-fg-4' }
      : gap > 0
        ? { text: `${gap} kursi kosong`, className: 'text-warning-800' }
        : gap === 0
          ? { text: 'Terpenuhi', className: 'text-success-800' }
          : { text: `Lebih ${-gap}`, className: 'text-fg-3' };

  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between gap-3 font-body text-xs font-medium tabular-nums">
        {actual === null ? (
          <span className="text-fg-3">
            Target <b className="font-bold text-fg-1">{target}</b>
          </span>
        ) : (
          <span className="text-fg-3">
            <b className="text-sm font-bold text-fg-1">{actual}</b> / {target} terisi
          </span>
        )}
        <span className={cn('font-semibold', status.className)}>{status.text}</span>
      </span>
      <span aria-hidden className="h-1.5 overflow-hidden rounded-pill bg-vapor">
        <span
          className="block h-full rounded-pill bg-secondary-500 transition-[width] duration-300 ease-standard"
          style={{ width: `${percent}%` }}
        />
      </span>
    </span>
  );
}
