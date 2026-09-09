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
        className="flex flex-wrap items-center gap-3 px-5 py-4 text-left"
      >
        <ChevronRight
          className={cn('size-4 shrink-0 text-fg-3 transition-transform duration-200 ease-standard', open && 'rotate-90')}
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-body text-sm font-bold text-fg-1">{plan.title}</span>
          <span className="font-body text-xs font-medium text-fg-3">
            {formatDate(plan.periodStart)} – {formatDate(plan.periodEnd)} · {plan.lines.length} unit · dibuat{' '}
            {plan.createdBy}
          </span>
        </span>

        <span className="ml-auto flex flex-wrap items-center gap-5">
          <Metric label="Target" value={totals.target} />
          <Metric label="Actual" value={totals.actual ?? '—'} />
          <span className="flex flex-col items-end gap-0.5">
            <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.05em] text-fg-3">Gap</span>
            <GapValue gap={totals.gap} />
          </span>
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className="font-body text-[10.5px] font-bold uppercase tracking-[0.05em] text-fg-3">{label}</span>
      <span className="font-body text-sm font-bold text-fg-1">{value}</span>
    </span>
  );
}
