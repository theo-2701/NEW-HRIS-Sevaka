import { useState } from 'react';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Segmented } from '@/components/Segmented';
import { Button } from '@/components/ui/button';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import {
  FinalStateBadge,
  FindingTypeTag,
  ParamCategoryBadge,
  PeriodStatusBadge,
} from '@/features/salary-processing/components/ProcessingBits';
import { useFindings, useParamSnapshot, useStateHistory } from '@/features/salary-processing/hooks/useSalaryProcessing';
import { employeeName } from '@/features/salary-processing/mock-data';
import { canActOnCalculated, gateStates, periodLabel, periodName } from '@/features/salary-processing/rules';
import type { Actor, Finding, ParamSnapshot, PayrollPeriod, Stamp } from '@/features/salary-processing/types';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

type Sub = 'params' | 'findings' | 'history';

function StampText({ stamp }: { stamp: Stamp | null }) {
  if (!stamp) return <span className="text-fg-4">—</span>;
  return (
    <>
      {employeeName(stamp.employeeId)} · {formatDateTime(stamp.at)}
    </>
  );
}

/** A3 + A5/A6/A7 — satu kartu detail, satu tabel tampil sekaligus lewat sub-tab. */
export function PeriodDetailCard({
  actor,
  period,
  onRecalculate,
  onReview,
  onOpenFindings,
}: {
  actor: Actor;
  period: PayrollPeriod;
  onRecalculate: () => void;
  onReview: () => void;
  onOpenFindings: () => void;
}) {
  const [sub, setSub] = useState<Sub>('params');
  const params = useParamSnapshot(period.id);
  const findings = useFindings(period.id);
  const history = useStateHistory(period.id);
  const actionable = canActOnCalculated(actor, period);
  const summary = (findings.data ?? []).slice(0, 3);

  return (
    <Card>
      <CardHead
        title={`${periodLabel(period)} · ${periodName(period)}`}
        sub="Detail periode yang dipilih"
        action={
          actionable ? (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button variant="secondary" onClick={onRecalculate}>
                Recalculate
              </Button>
              <Button onClick={onReview}>Review</Button>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <KeyValueList>
          <KeyValueRow label="Status">
            <PeriodStatusBadge status={period.status} />
          </KeyValueRow>
          <KeyValueRow label="Calculated">
            <StampText stamp={period.calculated} />
          </KeyValueRow>
          <KeyValueRow label="Reviewed">
            <StampText stamp={period.reviewed} />
          </KeyValueRow>
          <KeyValueRow label="Locked">
            <StampText stamp={period.locked} />
          </KeyValueRow>
          <KeyValueRow label="Handed over">
            <StampText stamp={period.handedOver} />
          </KeyValueRow>
        </KeyValueList>

        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {gateStates(period).map((gate) => (
            <li
              key={gate.key}
              className={cn(
                'flex flex-col gap-0.5 rounded-lg border px-3.5 py-2.5',
                gate.passed ? 'border-success-200 bg-success-50' : 'border-border-1 bg-mist',
              )}
            >
              <span className="font-body text-[13px] font-bold text-fg-1">{gate.label}</span>
              <span className="font-body text-xs font-medium text-fg-3">
                {gate.key === 'g3'
                  ? gate.passed
                    ? '10 of 10 parameters frozen'
                    : 'Snapshot incomplete'
                  : gate.passed
                    ? `Passed · ${formatDateTime(gate.at ?? '')}`
                    : 'Not yet — checked when the period is locked'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <Segmented<Sub>
        value={sub}
        onChange={setSub}
        options={[
          { value: 'params', label: 'Frozen parameters' },
          { value: 'findings', label: 'Findings summary' },
          { value: 'history', label: 'Status history' },
        ]}
      />

      {sub === 'params' && (
        <DataTable<ParamSnapshot>
          rows={params.data ?? []}
          rowKey={(row) => row.paramKey}
          loading={params.isLoading}
          empty="No parameter snapshot."
          columns={[
            {
              key: 'key',
              header: 'Parameter',
              strong: true,
              render: (row) => <span className="font-mono text-xs">{row.paramKey}</span>,
            },
            { key: 'category', header: 'Category', render: (row) => <ParamCategoryBadge category={row.paramCategory} /> },
            { key: 'value', header: 'Value', render: (row) => row.paramValue },
            {
              key: 'effective',
              header: 'Effective Since',
              muted: true,
              nowrap: true,
              render: (row) => (row.sourceEffectiveDate ? formatDate(row.sourceEffectiveDate) : '—'),
            },
          ]}
        />
      )}

      {sub === 'findings' && (
        <div className="flex flex-col gap-3">
          <DataTable<Finding>
            rows={summary}
            rowKey={(row) => row.id}
            loading={findings.isLoading}
            empty="This period has no finding."
            columns={[
              { key: 'id', header: 'ID', strong: true, nowrap: true, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
              { key: 'type', header: 'Finding Type', render: (row) => <FindingTypeTag type={row.findingType} /> },
              { key: 'subject', header: 'Subject', render: (row) => (row.employeeId ? employeeName(row.employeeId) : 'Period-level') },
              { key: 'state', header: 'Final State', render: (row) => <FinalStateBadge state={row.finalState} /> },
            ]}
          />
          <span className="font-body text-xs font-medium text-fg-3">
            Showing {summary.length} of {findings.data?.length ?? 0} findings.{' '}
            <button type="button" onClick={onOpenFindings} className="font-semibold text-secondary-600 hover:underline">
              Open the findings list
            </button>
          </span>
        </div>
      )}

      {sub === 'history' && (
        <ol className="m-0 flex list-none flex-col gap-0 p-0">
          {(history.data ?? []).map((row) => (
            <li key={row.id} className="relative flex gap-3 pb-4 pl-1 last:pb-0">
              <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-secondary-500" />
              <div className="flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-1.5 font-body text-[13px] font-semibold text-fg-1">
                  {row.fromStatus ? <PeriodStatusBadge status={row.fromStatus} /> : 'Created'}
                  <span className="text-fg-4">→</span>
                  <PeriodStatusBadge status={row.toStatus} />
                </span>
                <span className="font-body text-xs font-medium text-fg-3">
                  {employeeName(row.createdBy)} · {formatDateTime(row.createdAt)}
                </span>
                {row.reason && (
                  <span className="rounded-md bg-warning-50 px-2.5 py-1.5 font-body text-xs font-medium text-warning-900">
                    {row.reason}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
