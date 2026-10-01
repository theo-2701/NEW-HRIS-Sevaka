import { useState } from 'react';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, EmptyState, StatCard } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { InfoButton } from '@/components/InfoButton';
import { Modal } from '@/components/Modal';
import { Segmented } from '@/components/Segmented';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field } from '@/features/company/components/CompanyBits';
import {
  ErrorBanner,
  Note,
  OriginBadge,
  PeriodStateBadge,
  ProdActorPicker,
} from '@/features/productivity/components/ProdBits';
import { usePeriods, useReopenPeriod, useSubmitPeriod } from '@/features/productivity/hooks/useTimesheet';
import { PROD_EMPLOYEES } from '@/features/productivity/mock-data';
import { employeeOf, formatMinutes, isHr, PERIOD_STATE_META, subordinatesOf } from '@/features/productivity/rules';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { TimesheetPeriodState, WorklogOrigin } from '@/features/productivity/types';
import { formatDate, formatDateTime } from '@/lib/format';
import { ApiError } from '@/services/api';

const monthLabel = (start: string) =>
  new Date(`${start}T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

type Detail = 'task' | 'origin';

/**
 * Productivity › Timesheet › Summary — FSD-001-PRODUCTIVITY-0.2 §6 (`SM-A2`/`SM-A3`).
 *
 * Layar baca + pengesahan: rekap periode (agregat menit), status `timesheet_period_state`, pengajuan oleh pemilik
 * (gerbang: nol baris "Dihentikan Sistem" menggantung), dan pembukaan-kembali oleh atasan langsung/HR selama payroll
 * belum mengonfirmasi. Nol perbandingan absensi, nol nominal uang (PD-34/PD-41).
 */
export function SummaryPage() {
  const { actor } = useProdActor();
  const people = isHr(actor.role)
    ? PROD_EMPLOYEES
    : [employeeOf(actor.employeeId)!, ...subordinatesOf(actor.employeeId)].filter(Boolean);
  const [employeeId, setEmployeeId] = useState(actor.employeeId);
  const target = people.some((row) => row.employeeId === employeeId) ? employeeId : actor.employeeId;
  const periods = usePeriods(actor, target);
  const [periodId, setPeriodId] = useState('');
  const period = periods.data?.find((row) => row.id === periodId) ?? periods.data?.[0];
  const submit = useSubmitPeriod();
  const reopen = useReopenPeriod();
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState<Detail>('task');
  const [legendOpen, setLegendOpen] = useState(false);

  const owner = target === actor.employeeId;
  const canReopen =
    period?.state === 'DISAHKAN' && (employeeOf(target)?.supervisorId === actor.employeeId || isHr(actor.role));
  const canSubmit = owner && (period?.state === 'BELUM_DIAJUKAN' || period?.state === 'DIKEMBALIKAN');
  const forbidden = periods.error instanceof ApiError && periods.error.status === 403;

  return (
    <PageShell
      crumbs={[{ label: 'Productivity' }, { label: 'Project & Task' }, { label: 'Timesheet' }, { label: 'Summary' }]}
      title="Summary"
      description="Monthly timesheet totals and their approval status. Hours only — no attendance comparison and no pay amounts."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <ProdActorPicker
            onChange={() => {
              setEmployeeId('');
              setPeriodId('');
            }}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {people.length > 1 && (
            <Select
              value={target}
              onValueChange={(value) => {
                setEmployeeId(value);
                setPeriodId('');
                submit.reset();
              }}
            >
              <SelectTrigger className="h-10 w-[240px]" aria-label="Employee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {people.map((row) => (
                  <SelectItem key={row.employeeId} value={row.employeeId}>
                    {row.employeeId === actor.employeeId ? `${row.name} (me)` : row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(periods.data ?? []).length > 0 && period && (
            <Select
              value={period.id}
              onValueChange={(value) => {
                setPeriodId(value);
                submit.reset();
              }}
            >
              <SelectTrigger className="h-10 w-[200px]" aria-label="Period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(periods.data ?? []).map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {monthLabel(row.periodStart)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {period && <PeriodStateBadge value={period.state} />}
          <InfoButton label="Timesheet status reference" onClick={() => setLegendOpen(true)} />
          <div className="ml-auto flex gap-2">
            {canReopen && (
              <Button variant="secondary" onClick={() => setReopenOpen(true)}>
                Reopen
              </Button>
            )}
            {owner && period && (
              <Button disabled={!canSubmit || submit.isPending} onClick={() => submit.mutate({ actor, id: period.id })}>
                {submit.isPending
                  ? 'Submitting…'
                  : period.state === 'DIKEMBALIKAN'
                    ? 'Submit again'
                    : 'Submit timesheet'}
              </Button>
            )}
          </div>
        </div>

        {forbidden ? (
          <Card>
            <EmptyState title="403 — outside your supervision chain" description={periods.error?.message} />
          </Card>
        ) : !period ? (
          <Card>
            <EmptyState
              title={periods.isLoading ? 'Loading…' : 'No timesheet yet'}
              description="Hours appear here once time is recorded."
            />
          </Card>
        ) : (
          <>
            <ErrorBanner error={submit.error} />
            {period.payrollConfirmedAt && (
              <Note tone="warn" icon={<Lock />}>
                <strong>PROD_PAYROLL_LOCKED</strong> — payroll confirmed these hours on{' '}
                {formatDateTime(period.payrollConfirmedAt)}. The period is permanent and cannot be reopened by anyone,
                HR included.
              </Note>
            )}
            {period.state === 'DIKEMBALIKAN' && period.reopenReason && (
              <Note tone="warn">
                Returned for correction: “{period.reopenReason}”. Fix the entries in Activities, then submit again.
              </Note>
            )}
            {period.state === 'MENUNGGU_PENGESAHAN' && (
              <Note>
                Submitted {formatDateTime(period.submittedAt)} — waiting for the approval process. Entries of this month
                are frozen.
              </Note>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total hours"
                value={formatMinutes(period.totalMinutes)}
                footer="All entries of the month"
              />
              <StatCard
                label="Cancelled task hours"
                value={formatMinutes(period.cancelledTaskMinutes)}
                footer="Still part of the total, shown separately"
              />
              <StatCard
                label="Waiting correction"
                value={period.pendingSystemStopCount}
                footer="System-stopped entries not yet corrected or accepted"
              />
              <StatCard
                label="Near daily limit"
                value={period.nearDailyLimitFlags.length}
                footer={
                  period.nearDailyLimitFlags.length
                    ? period.nearDailyLimitFlags.map(formatDate).join(', ')
                    : 'Days close to 1,440 minutes'
                }
              />
            </div>
            <Card>
              {/* Ringkasan di atas (kartu angka), rincian di bawahnya dipisah segmented — satu tabel tampil. */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented<Detail>
                  value={detail}
                  onChange={setDetail}
                  options={[
                    { value: 'task', label: 'Hours by task' },
                    { value: 'origin', label: 'How the hours were recorded' },
                  ]}
                />
                <span className="font-body text-xs font-medium text-fg-3">
                  {detail === 'task'
                    ? `${formatDate(period.periodStart)} – ${formatDate(period.periodEnd)}`
                    : 'Measured, typed, and stopped by the system — added up the same way'}
                </span>
              </div>
              {detail === 'task' ? (
                <DataTable
                  rows={period.breakdownByTask}
                  rowKey={(row) => row.taskId}
                  empty="No hours this month."
                  columns={[
                    { key: 'task', header: 'Task', strong: true, render: (row) => row.taskName },
                    {
                      key: 'minutes',
                      header: 'Hours',
                      align: 'right',
                      render: (row) => formatMinutes(row.totalMinutes),
                    },
                  ]}
                />
              ) : (
                <DataTable
                  rows={(Object.keys(period.originComposition) as WorklogOrigin[]).map((origin) => ({
                    origin,
                    minutes: period.originComposition[origin],
                  }))}
                  rowKey={(row) => row.origin}
                  columns={[
                    { key: 'origin', header: 'Origin', render: (row) => <OriginBadge value={row.origin} /> },
                    { key: 'minutes', header: 'Hours', align: 'right', render: (row) => formatMinutes(row.minutes) },
                  ]}
                />
              )}
            </Card>
          </>
        )}
      </div>

      <Modal
        open={legendOpen}
        onOpenChange={setLegendOpen}
        size="wide"
        title="Timesheet status reference"
        description="Approval and rejection come only from the approval process; there is no button for them here."
        footer={
          <Button variant="secondary" onClick={() => setLegendOpen(false)}>
            Close
          </Button>
        }
      >
        <DataTable<{ state: TimesheetPeriodState }>
          rows={(Object.keys(PERIOD_STATE_META) as TimesheetPeriodState[]).map((state) => ({ state }))}
          rowKey={(row) => row.state}
          columns={[
            { key: 'state', header: 'Status', render: (row) => <PeriodStateBadge value={row.state} /> },
            {
              key: 'meaning',
              header: 'Meaning',
              render: (row) => <span className="block whitespace-normal">{PERIOD_STATE_META[row.state].meaning}</span>,
            },
          ]}
        />
      </Modal>

      <Modal
        open={reopenOpen && Boolean(period)}
        onOpenChange={(next) => {
          if (!next) {
            setReopenOpen(false);
            reopen.reset();
          }
        }}
        title={`Reopen ${period ? monthLabel(period.periodStart) : ''}`}
        description="The timesheet goes back to its owner as Returned. Approving it again follows the normal submission."
        footer={
          <>
            <Button variant="secondary" onClick={() => setReopenOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!reason.trim() || reopen.isPending}
              onClick={() =>
                period &&
                reopen.mutate(
                  { actor, id: period.id, reason },
                  {
                    onSuccess: () => {
                      setReopenOpen(false);
                      setReason('');
                    },
                  },
                )
              }
            >
              {reopen.isPending ? 'Reopening…' : 'Reopen'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <ErrorBanner error={reopen.error} />
          <Field label="Reason" required>
            <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
          </Field>
        </div>
      </Modal>
    </PageShell>
  );
}
