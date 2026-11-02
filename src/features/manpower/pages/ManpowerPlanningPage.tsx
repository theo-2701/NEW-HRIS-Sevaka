import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, EmptyState, StatCard } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { GapValue } from '@/features/manpower/components/ManpowerBits';
import { PlanCard } from '@/features/manpower/components/PlanCard';
import { PlanStatusLegend } from '@/features/manpower/components/PlanStatusLegend';
import { CreatePlanModal } from '@/features/manpower/components/CreatePlanModal';
import { useActivatePlan, useManpowerPlans } from '@/features/manpower/hooks/useManpower';
import { planTotals } from '@/features/manpower/types';
import type { ManpowerPlan } from '@/features/manpower/types';

/**
 * Manpower Planning › Planning (menu `overview`, label Planning — TSD-001-EMPLOYEE
 * 0.212 §3). Hanya rencana Draft + Active; yang selesai pindah ke Planning History.
 * Ringkasan menjumlah SEMUA rencana Active (keputusan USER E4).
 */
export function ManpowerPlanningPage() {
  const { data = [], isLoading } = useManpowerPlans();
  const plans = useMemo(() => data.filter((row) => row.status === 'DRAFT' || row.status === 'ACTIVE'), [data]);
  const activate = useActivatePlan();
  const [creating, setCreating] = useState(false);
  const [activating, setActivating] = useState<ManpowerPlan | null>(null);

  const summary = useMemo(() => {
    const active = plans.filter((row) => row.status === 'ACTIVE').map(planTotals);
    const counted = active.filter((row) => row.actual !== null);
    const target = active.reduce((sum, row) => sum + row.target, 0);
    const actual = counted.length ? counted.reduce((sum, row) => sum + (row.actual ?? 0), 0) : null;
    return { count: active.length, target, actual, gap: actual === null ? null : target - actual };
  }, [plans]);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Manpower Planning' }, { label: 'Planning' }]}
      title="Planning"
      description="Headcount targets per unit. Actual counts filled seats; Gap is Target minus Actual and can be negative. Finished plans move to Planning History."
      actions={<Button onClick={() => setCreating(true)}>New plan</Button>}
    >
      <div className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active plans" value={summary.count} />
          <StatCard label="Total target" value={summary.target} />
          <StatCard label="Total actual" value={summary.actual ?? '—'} />
          <StatCard label="Total gap" value={<GapValue gap={summary.gap} />} />
        </div>

        {isLoading && <p className="py-6 text-center font-body text-[13px] font-medium text-fg-3">Loading plans…</p>}
        {!isLoading && !plans.length && (
          <Card>
            <EmptyState title="No draft or active plan" description="Create a plan to set headcount targets per unit." />
          </Card>
        )}
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            actions={
              plan.status === 'DRAFT' ? (
                <Button variant="secondary" onClick={() => setActivating(plan)}>
                  Activate
                </Button>
              ) : undefined
            }
          />
        ))}

        <PlanStatusLegend states={['DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED']} />
      </div>

      <CreatePlanModal open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        open={Boolean(activating)}
        title="Activate this plan?"
        description={
          activating
            ? `${activating.title} starts counting in the summary. Other drafts with the same unit in an overlapping period will be removed automatically.`
            : undefined
        }
        confirmLabel="Activate"
        cancelLabel="Cancel"
        tone="primary"
        loading={activate.isPending}
        onOpenChange={(next) => !next && setActivating(null)}
        onConfirm={() => activating && activate.mutate(activating.id, { onSettled: () => setActivating(null) })}
      />
    </PageShell>
  );
}
