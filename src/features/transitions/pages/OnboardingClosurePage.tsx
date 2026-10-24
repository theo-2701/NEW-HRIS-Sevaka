import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card } from '@/components/Card';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { formatDateTime } from '@/lib/format';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TaskStatusBadge } from '@/features/transitions/components/TransitionBits';
import { useCloseOnboarding, useClosureQueue } from '@/features/transitions/hooks/useTransitions';
import { CLOSURE_REASON_LABEL } from '@/features/transitions/types';
import type { Transition } from '@/features/transitions/types';
import { useAuthStore } from '@/store/auth.store';

/** OC-CLOSE — catatan opsional ≤ 500; dialog tidak tertutup lewat klik di luar. */
function CloseDialog({ row, onClose }: { row: Transition | null; onClose: () => void }) {
  const [note, setNote] = useState('');
  const close = useCloseOnboarding();
  const finish = () => {
    setNote('');
    onClose();
  };
  return (
    <Modal
      open={Boolean(row)}
      onOpenChange={() => undefined}
      dismissible={false}
      title="Close onboarding"
      description={row ? `${row.employee} · ${row.employeeNik ?? row.id}` : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={finish} disabled={close.isPending}>
            Back
          </Button>
          <Button
            disabled={close.isPending}
            onClick={() => row && close.mutate({ transitionId: row.id, note }, { onSuccess: finish })}
          >
            {close.isPending ? 'Closing…' : 'Close Onboarding'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="m-0 font-body text-[13px] leading-[1.5] text-fg-2">
          This marks every unfinished task of this employee as closed and removes the employee from the queue.
        </p>
        <div className="flex flex-col gap-1">
          <Label htmlFor="oc-note">Note</Label>
          <Textarea id="oc-note" rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
          <span className="font-body text-xs font-medium text-fg-3">Optional. Up to 500 characters.</span>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Employee Management › Onboarding › Onboarding Closure — FSD-001-EMPLOYEE 0.83 §16. Antrean HR Manager ·
 * Super Admin untuk menutup onboarding yang berakhir sebelum semua task selesai.
 */
export function OnboardingClosurePage() {
  const role = useAuthStore((s) => s.user?.role);
  const allowed = role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
  const { data = [], isLoading, isError, error } = useClosureQueue(allowed);
  const [closing, setClosing] = useState<Transition | null>(null);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Onboarding' }, { label: 'Onboarding Closure' }]}
        title="Onboarding Closure"
        description="Employees whose onboarding ended before every task was done. Review the unfinished tasks and close each employee's onboarding."
      >
        {!allowed ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Manager or Super Admin.
          </Note>
        ) : isError ? (
          <Note tone="warn" icon={<Lock />}>
            The queue could not be loaded. {(error as Error)?.message}
          </Note>
        ) : isLoading ? (
          <p className="py-10 text-center font-body text-[13px] text-fg-3">Loading…</p>
        ) : data.length === 0 ? (
          <Card>
            <p className="m-0 py-8 text-center font-body text-[13px] text-fg-3">No onboarding is waiting to be closed.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {data.map((row) => {
              const unfinished = row.tasks.filter((task) => task.status === 'SKIPPED');
              return (
                <Card key={row.id} className="gap-3">
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-body text-[11px] font-bold uppercase tracking-[0.06em] text-fg-3">Employee ID</span>
                      <Link to="/employees/directory" className="font-body text-sm font-bold text-secondary-700 underline-offset-2 hover:underline">
                        {row.employeeNik ?? row.id} · {row.employee}
                      </Link>
                      <span className="font-body text-xs font-medium text-fg-3">{unfinished.length} unfinished task(s)</span>
                    </div>
                    <Button onClick={() => setClosing(row)}>Close Onboarding</Button>
                  </header>
                  <ul className="m-0 flex list-none flex-col divide-y divide-border-1 rounded-md border border-border-1 p-0">
                    {unfinished.map((task) => (
                      <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                        <div className="flex flex-col gap-0.5 font-body text-[13px]">
                          <span className="font-semibold text-fg-1">
                            {task.name}
                            {task.code && <span className="ml-1.5 font-mono text-[11.5px] font-medium text-fg-3">{task.code}</span>}
                          </span>
                          <span className="text-fg-2">Skip reason: {task.skipReason ?? '—'}</span>
                          {row.closure && <span className="text-fg-2">Why it is here: {CLOSURE_REASON_LABEL[row.closure.reason]}</span>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <TaskStatusBadge status={task.status} />
                          {row.closure && (
                            <span className="font-body text-[11.5px] font-medium text-fg-3">Queued: {formatDateTime(row.closure.queuedAt)}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        )}
      </PageShell>
      <CloseDialog row={closing} onClose={() => setClosing(null)} />
    </>
  );
}
