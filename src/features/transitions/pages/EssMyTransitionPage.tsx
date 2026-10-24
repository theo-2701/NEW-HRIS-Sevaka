import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Card } from '@/components/Card';
import { PageShell } from '@/components/PageShell';
import { RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/format';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TaskStatusBadge, TransitionStatusBadge } from '@/features/transitions/components/TransitionBits';
import { useConfirmTask, useMyTransitions } from '@/features/transitions/hooks/useTransitions';
import { SUBTYPE_LABEL, TYPE_LABEL, doneCount, isTaskClosed } from '@/features/transitions/types';
import type { TaskSide, Transition } from '@/features/transitions/types';

/** Mode dummy: karyawan contoh yang punya transisi (di produksi = karyawan yang login). */
const VIEWERS = ['Eka Saputra', 'Fajar Nugroho', 'Maya Kusuma'];

const PARTS: { side: TaskSide; title: string }[] = [
  { side: 'RELINQUISH', title: 'Out' },
  { side: 'PROVISION', title: 'In' },
  { side: 'NONE', title: 'Tasks' },
];

function TransitionDetail({ transition }: { transition: Transition }) {
  const confirm = useConfirmTask();
  const outOpen = transition.tasks.some((task) => task.side === 'RELINQUISH' && !isTaskClosed(task));
  return (
    <div className="flex flex-col gap-4 border-t border-border-1 pt-4">
      {(transition.facilityProvided || transition.facilityWithdrawn) && (
        <Note icon={<Lock />}>
          {transition.facilityProvided && <>Facility provided: {transition.facilityProvided} </>}
          {transition.facilityWithdrawn && <>Facility withdrawn: {transition.facilityWithdrawn}</>}
        </Note>
      )}
      {PARTS.map(({ side, title }) => {
        const items = transition.tasks.filter((task) => task.side === side);
        if (items.length === 0) return null;
        return (
          <section key={side} className="flex flex-col gap-2">
            <h3 className="m-0 font-body text-[13px] font-bold text-fg-1">{title}</h3>
            {side === 'PROVISION' && transition.inOpensAfterOut && outOpen && (
              <span className="font-body text-xs font-medium text-fg-3">Opens after the Out tasks are done.</span>
            )}
            <ul className="m-0 flex list-none flex-col divide-y divide-border-1 rounded-md border border-border-1 p-0">
              {items.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col gap-0.5 font-body text-[13px]">
                    <span className="font-semibold text-fg-1">{task.name}</span>
                    <span className="text-fg-3">
                      Handled by {task.handlers?.[0] ?? task.owner ?? '—'}
                      {task.dueAt && ` · due ${formatDate(task.dueAt)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskStatusBadge status={task.status} />
                    {task.status === 'AWAITING_CONFIRM' && (
                      <RowButton
                        disabled={confirm.isPending}
                        onClick={() => confirm.mutate({ transitionId: transition.id, taskId: task.id })}
                      >
                        Confirm
                      </RowButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/**
 * Employee Self Service › My Transition — FSD-001-EMPLOYEE 0.83 §20 (MYT-LIST + MYT-DETAIL). Karyawan melihat
 * administrasi transisinya sendiri dan mengonfirmasi task dua-pihak. Kartu beranda (HOME-MYT-CARD) belum.
 */
export function EssMyTransitionPage() {
  const [viewer, setViewer] = useState(VIEWERS[0]);
  const { data = [], isLoading, isError } = useMyTransitions(viewer);
  const [openId, setOpenId] = useState<string | null>(null);
  const running = data.filter((row) => row.status !== 'COMPLETED');
  const history = data.filter((row) => row.status === 'COMPLETED');

  const cardFor = (row: Transition) => {
    const waiting = row.tasks.filter((task) => task.status === 'AWAITING_CONFIRM').length;
    return (
      <Card key={row.id} className="gap-3">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-body text-sm font-bold text-fg-1">
              {TYPE_LABEL[row.type]}
              {row.subtype && ` · ${SUBTYPE_LABEL[row.subtype]}`}
            </span>
            <span className="font-body text-xs font-medium text-fg-3">
              Effective {formatDate(row.effectiveDate)} · {doneCount(row)} of {row.tasks.length} tasks done
              {waiting > 0 && ` · ${waiting} task(s) waiting for you`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TransitionStatusBadge status={row.status} />
            <RowButton onClick={() => setOpenId(openId === row.id ? null : row.id)}>{openId === row.id ? 'Hide' : 'Open'}</RowButton>
          </div>
        </header>
        {openId === row.id && <TransitionDetail transition={row} />}
      </Card>
    );
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self Service' }, { label: 'My Transition' }]}
      title="My Transition"
      description="Your own onboarding, transfer or offboarding: who to meet for each task, by when, and the tasks you need to confirm."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Viewing as (demo)</span>
          <Select
            value={viewer}
            onValueChange={(value) => {
              setViewer(value);
              setOpenId(null);
            }}
          >
            <SelectTrigger className="w-[220px]" aria-label="Viewing as">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWERS.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isError ? (
          <Note tone="warn" icon={<Lock />}>
            Your transition could not be loaded.
          </Note>
        ) : isLoading ? (
          <p className="py-10 text-center font-body text-[13px] text-fg-3">Loading…</p>
        ) : running.length === 0 && history.length === 0 ? (
          <Card>
            <p className="m-0 py-8 text-center font-body text-[13px] text-fg-3">You have no transition in progress.</p>
          </Card>
        ) : (
          <>
            {running.map(cardFor)}
            {history.length > 0 && <h2 className="m-0 mt-2 font-body text-sm font-bold text-fg-2">History</h2>}
            {history.map(cardFor)}
          </>
        )}
      </div>
    </PageShell>
  );
}
