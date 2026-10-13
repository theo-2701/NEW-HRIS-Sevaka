import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { EmptyState, StatCard } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { Note } from '@/features/manpower/components/ManpowerBits';
import { PlanCard } from '@/features/manpower/components/PlanCard';
import { CreatePlanModal } from '@/features/manpower/components/CreatePlanModal';
import { useManpowerPlans } from '@/features/manpower/hooks/useManpower';
import { planTotals } from '@/features/manpower/types';
import type { PlanStatus } from '@/features/manpower/types';

const CURRENT: PlanStatus[] = ['ACTIVE', 'DRAFT'];
const PAST: PlanStatus[] = ['CLOSED', 'ARCHIVED'];

/**
 * Manpower Planning — dipisah dari Requisition (Notulen 12 Okt 2026 §2): planning menetapkan target
 * headcount per unit, layar menampilkan target · aktual · gap. `history` = rencana yang sudah ditutup
 * atau diarsipkan (menu Planning History).
 */
export function ManpowerPlanningPage({ history = false }: { history?: boolean }) {
  const { data: plans = [], isLoading } = useManpowerPlans();
  const [creating, setCreating] = useState(false);

  const shown = plans.filter((plan) => (history ? PAST : CURRENT).includes(plan.status));
  const activePlan = useMemo(() => plans.find((plan) => plan.status === 'ACTIVE'), [plans]);
  const totals = activePlan ? planTotals(activePlan) : null;

  return (
    <>
      <PageShell
        crumbs={[
          { label: 'Employee Management' },
          { label: 'Manpower Planning' },
          { label: history ? 'Planning History' : 'Overview' },
        ]}
        title={history ? 'Planning History' : 'Manpower Planning'}
        description={
          history
            ? 'Closed and archived headcount plans, kept for reference.'
            : 'Set the headcount target per unit for a period. Gaps between target and actual become requisitions.'
        }
        actions={!history && <Button onClick={() => setCreating(true)}>New plan</Button>}
      >
        <div className="flex flex-col gap-5">
          {!history && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active plan"
                value={activePlan ? activePlan.periodStart.slice(0, 4) : '—'}
                footer={activePlan ? activePlan.title : 'No active plan yet'}
              />
              <StatCard
                label="Target headcount"
                value={totals?.target ?? '—'}
                footer={activePlan ? `Across ${activePlan.lines.length} units` : 'Waiting for an active plan'}
              />
              <StatCard label="Actual" value={totals?.actual ?? '—'} footer="Filled positions in the structure" />
              <StatCard label="Gap" value={totals?.gap ?? '—'} footer="Target minus actual — open for requisition" />
            </div>
          )}

          {isLoading && <p className="py-6 text-center font-body text-[13px] font-medium text-fg-3">Loading plans…</p>}
          {!isLoading && shown.length === 0 && (
            <EmptyState
              title={history ? 'No past plans' : 'No plans yet'}
              description={history ? 'Closed or archived plans appear here.' : 'Create a plan to set unit targets.'}
            />
          )}
          {shown.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}

          {!history && (
            <Note icon={<Info />}>
              <strong>Actual</strong> and <strong>Gap</strong> are counted from filled positions in the organization
              structure.
            </Note>
          )}
        </div>
      </PageShell>

      <CreatePlanModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
