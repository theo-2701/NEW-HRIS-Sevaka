import { useMemo } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, EmptyState } from '@/components/Card';
import { PlanCard } from '@/features/manpower/components/PlanCard';
import { PlanStatusLegend } from '@/features/manpower/components/PlanStatusLegend';
import { useManpowerPlans } from '@/features/manpower/hooks/useManpower';

/**
 * Manpower Planning › Planning History (TSD-001-EMPLOYEE 0.212 §3; CATATAN-PERUBAHAN
 * 18 Okt 2026 T1): rencana `CLOSED` + `ARCHIVED`, baca saja. Satu rencana tampil di
 * satu menu saja.
 */
export function PlanningHistoryPage() {
  const { data = [], isLoading } = useManpowerPlans();
  const plans = useMemo(() => data.filter((row) => row.status === 'CLOSED' || row.status === 'ARCHIVED'), [data]);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Manpower Planning' }, { label: 'Planning History' }]}
      title="Planning History"
      description="Plans whose period has finished. Read only — targets, actuals, and gaps as they stood."
    >
      <div className="flex flex-col gap-5">
        {isLoading && <p className="py-6 text-center font-body text-[13px] font-medium text-fg-3">Loading plans…</p>}
        {!isLoading && !plans.length && (
          <Card>
            <EmptyState title="No closed plan yet" description="Plans appear here once their period is closed or archived." />
          </Card>
        )}
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
        <PlanStatusLegend states={['CLOSED', 'ARCHIVED']} />
      </div>
    </PageShell>
  );
}
