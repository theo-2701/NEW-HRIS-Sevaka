import { Card, CardHead } from '@/components/Card';
import { PlanStatusBadge } from '@/features/manpower/components/ManpowerBits';
import type { PlanStatus } from '@/features/manpower/types';

const MEANING: Record<PlanStatus, string> = {
  DRAFT: 'Being prepared. Target lines can still change; not counted in the summary.',
  ACTIVE: 'In force. Counted in the headcount summary; requisitions can be raised against it.',
  CLOSED: 'Period finished. Read only — shown under Planning History.',
  ARCHIVED: 'Kept for reference only. Read only — shown under Planning History.',
};

/** Papan "Plan states and what they mean" (CATATAN-PERUBAHAN 11 Okt 2026, iterasi 2). */
export function PlanStatusLegend({ states }: { states: PlanStatus[] }) {
  return (
    <Card>
      <CardHead title="Plan states and what they mean" />
      <dl className="m-0 grid gap-3 md:grid-cols-2">
        {states.map((status) => (
          <div key={status} className="flex flex-col gap-1.5">
            <dt>
              <PlanStatusBadge status={status} />
            </dt>
            <dd className="m-0 font-body text-[13px] font-medium leading-[1.5] text-fg-2">{MEANING[status]}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
