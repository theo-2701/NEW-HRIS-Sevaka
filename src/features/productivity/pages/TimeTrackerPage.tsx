import { useEffect, useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { ErrorBanner, Note, OriginBadge, ProdActorPicker } from '@/features/productivity/components/ProdBits';
import { useTasks } from '@/features/productivity/hooks/useProjects';
import {
  useActivityTypes,
  useCreateManual,
  useRunningTimer,
  useStartTimer,
  useStopTimer,
  useWorklogs,
} from '@/features/productivity/hooks/useTimesheet';
import { formatMinutes } from '@/features/productivity/rules';
import { isoDate, prodClock } from '@/features/productivity/services/clock';
import { projectService } from '@/features/productivity/services/project.service';
import { useProdActor } from '@/features/productivity/store/prodActor.store';
import type { TimerStartResult, Worklog } from '@/features/productivity/types';
import { settingsService } from '@/features/settings/services/settings.service';
import { formatDate } from '@/lib/format';

const clockOf = (iso: string | null) => (iso ? new Date(iso).toTimeString().slice(0, 5) : '—');

function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState(() => prodClock.now().getTime());
  useEffect(() => {
    if (!startedAt) return;
    const timer = window.setInterval(() => setNow(prodClock.now().getTime()), 15000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000)) : 0;
}

/**
 * Productivity › Timesheet › Time Tracker — FSD-001-PRODUCTIVITY-0.2 §4 (`TT-A*` penghitung, `TT-B*` catat manual).
 *
 * Dua jalur setara ke satu tabel `emp_worklog`: penghitung (berjam, `DIUKUR_MESIN`) dan ketik manual (tanpa jam,
 * `DIKETIK_MANUSIA`). Penghitung lain yang masih berjalan dihentikan otomatis dan diberitahukan. Sunting/hapus
 * ada di Activities, bukan di sini.
 */
export function TimeTrackerPage() {
  const { actor } = useProdActor();
  const windowDays = settingsService.numberValue('productivity.entry_window_days', 7);
  const tasks = useTasks(actor, { scope: 'MINE' });
  const activities = useActivityTypes();
  const running = useRunningTimer(actor);
  const start = useStartTimer();
  const stop = useStopTimer();
  const manual = useCreateManual();
  const since = useMemo(() => {
    const d = prodClock.now();
    d.setDate(d.getDate() - 14);
    return isoDate(d);
  }, []);
  const recent = useWorklogs(actor, { workDateStart: since });
  const elapsed = useElapsed(running.data?.startedAt ?? null);

  const [timerTask, setTimerTask] = useState('');
  const [timerActivity, setTimerActivity] = useState('');
  const [autoStopped, setAutoStopped] = useState<TimerStartResult['autoStoppedPreviousTimer']>(null);
  const [form, setForm] = useState({
    taskId: '',
    activityTypeId: '',
    workDate: isoDate(prodClock.now()),
    duration: '',
    notes: '',
  });

  useEffect(() => {
    setAutoStopped(null);
    start.reset();
    manual.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset saat identitas berganti
  }, [actor.employeeId]);

  const eligible = (tasks.data ?? []).filter((row) => row.status !== 'DIBATALKAN');
  const taskOptions = eligible.map((row) => ({ value: row.id, label: `${row.code} ${row.taskTitle}` }));
  const activityOptions = (activities.data ?? [])
    .filter((row) => row.isActive)
    .map((row) => ({ value: row.id, label: row.activityName }));
  const earliest = (() => {
    const d = prodClock.now();
    d.setDate(d.getDate() - windowDays);
    return isoDate(d);
  })();

  return (
    <PageShell
      crumbs={[
        { label: 'Productivity' },
        { label: 'Project & Task' },
        { label: 'Timesheet' },
        { label: 'Time Tracker' },
      ]}
      title="Time Tracker"
      description="Record working time with the timer or by typing the duration. Edit or delete entries in Activities."
      actions={<ProdActorPicker />}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHead
              title="Timer"
              sub="Measured hours keep their start and stop time. Minutes are stored as measured — no rounding."
            />
            <div className="flex flex-col gap-4">
              {autoStopped && (
                <Note tone="warn">
                  <strong>Previous timer stopped automatically.</strong> {autoStopped.code} was still running and has
                  been saved with {formatMinutes(autoStopped.durationMinutes)} before the new timer started.
                </Note>
              )}
              <ErrorBanner error={start.error ?? stop.error} />
              {running.data ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-secondary-200 bg-secondary-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-secondary-600" />
                    <div className="flex flex-col gap-0.5">
                      <span className="font-body text-[13px] font-bold text-fg-1">
                        {projectService.taskRef(running.data.taskId)?.taskTitle ?? running.data.taskId}
                      </span>
                      <span className="font-body text-xs font-medium text-fg-3">
                        {running.data.code} · started {clockOf(running.data.startedAt)} · running{' '}
                        {formatMinutes(elapsed)}
                      </span>
                    </div>
                  </div>
                  <Button disabled={stop.isPending} onClick={() => stop.mutate({ actor })}>
                    {stop.isPending ? 'Stopping…' : 'Stop timer'}
                  </Button>
                </div>
              ) : (
                <p className="m-0 rounded-lg border border-dashed border-fog px-4 py-3 font-body text-[13px] font-medium text-fg-3">
                  No timer is running.
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectRow
                  label="Task"
                  required
                  placeholder="Choose task…"
                  value={timerTask}
                  onChange={setTimerTask}
                  options={taskOptions}
                />
                <SelectRow
                  label="Activity type"
                  allowEmpty
                  emptyLabel="Not set"
                  value={timerActivity}
                  onChange={setTimerActivity}
                  options={activityOptions}
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant={running.data ? 'secondary' : 'primary'}
                  disabled={!timerTask || start.isPending}
                  onClick={() =>
                    start.mutate(
                      { actor, taskId: timerTask, activityTypeId: timerActivity },
                      { onSuccess: (result) => setAutoStopped(result.autoStoppedPreviousTimer) },
                    )
                  }
                >
                  {running.data ? 'Start new timer (stops current)' : 'Start timer'}
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHead
              title="Log time manually"
              sub="Typed entries have no start or stop time — only the date and the duration."
            />
            <div className="flex flex-col gap-4">
              <ErrorBanner error={manual.error} />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <SelectRow
                  label="Task"
                  required
                  placeholder="Choose task…"
                  value={form.taskId}
                  onChange={(value) => setForm((prev) => ({ ...prev, taskId: value }))}
                  options={taskOptions}
                />
                <SelectRow
                  label="Activity type"
                  allowEmpty
                  emptyLabel="Not set"
                  value={form.activityTypeId}
                  onChange={(value) => setForm((prev) => ({ ...prev, activityTypeId: value }))}
                  options={activityOptions}
                />
                <Field label="Work date" required hint={`Up to ${windowDays} days back (Settings › Productivity).`}>
                  <DatePicker
                    value={form.workDate}
                    min={earliest}
                    clearable={false}
                    onChange={(value) => setForm((prev) => ({ ...prev, workDate: value }))}
                  />
                </Field>
                <Field
                  label="Duration (minutes)"
                  required
                  hint="All entries of one day together may not exceed 1,440 minutes."
                >
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.duration}
                    onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
                  />
                </Field>
                <div className="md:col-span-2">
                  <TextRow
                    label="Notes"
                    value={form.notes}
                    onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={!form.taskId || !form.workDate || form.duration === '' || manual.isPending}
                  onClick={() =>
                    manual.mutate(
                      {
                        actor,
                        draft: {
                          taskId: form.taskId,
                          activityTypeId: form.activityTypeId,
                          workDate: form.workDate,
                          durationMinutes: Number(form.duration),
                          notes: form.notes,
                        },
                      },
                      { onSuccess: () => setForm((prev) => ({ ...prev, duration: '', notes: '' })) },
                    )
                  }
                >
                  {manual.isPending ? 'Saving…' : 'Save entry'}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHead
            title="My entries — last 14 days"
            sub="Timer and typed entries side by side. Edit or delete them in Activities."
          />
          <DataTable<Worklog>
            rows={recent.data ?? []}
            rowKey={(row) => row.id}
            loading={recent.isLoading}
            empty="No time entry in the last 14 days."
            columns={[
              {
                key: 'code',
                header: 'Code',
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.code}</span>,
              },
              { key: 'date', header: 'Date', nowrap: true, render: (row) => formatDate(row.workDate) },
              {
                key: 'task',
                header: 'Task',
                render: (row) => projectService.taskRef(row.taskId)?.taskTitle ?? row.taskId,
              },
              {
                key: 'time',
                header: 'Time',
                nowrap: true,
                render: (row) =>
                  row.startedAt
                    ? `${clockOf(row.startedAt)}–${row.stoppedAt ? clockOf(row.stoppedAt) : 'running'}`
                    : '—',
              },
              {
                key: 'duration',
                header: 'Duration',
                align: 'right',
                nowrap: true,
                render: (row) => formatMinutes(row.durationMinutes),
              },
              { key: 'origin', header: 'Origin', render: (row) => <OriginBadge value={row.origin} /> },
            ]}
          />
        </Card>
      </div>
    </PageShell>
  );
}
