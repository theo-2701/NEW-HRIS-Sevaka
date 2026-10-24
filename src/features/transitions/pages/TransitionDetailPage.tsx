import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, BadgeCheck, Briefcase, DoorOpen, Info, Lock, LogIn, LogOut, MoveRight } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card } from '@/components/Card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Card';
import {
  LifecycleSteps,
  Note,
  TaskCard,
  TaskGroupHead,
  TaskMeter,
  TransitionStatusBadge,
} from '@/features/transitions/components/TransitionBits';
import { WaiveTaskModal } from '@/features/transitions/components/WaiveTaskModal';
import { ClearanceModal } from '@/features/transitions/components/ClearanceModal';
import { RejectTaskModal } from '@/features/transitions/components/RejectTaskModal';
import { CURRENT_USER } from '@/features/manpower/types';
import {
  useApproveTask,
  useCompleteTask,
  useConfirmTask,
  useTransition,
  useTransitions,
} from '@/features/transitions/hooks/useTransitions';
import { LIFECYCLE_NOTE, SUBTYPE_LABEL, TYPE_LABEL, doneCount, isApprover, isTaskClosed } from '@/features/transitions/types';
import type { TaskSide, Transition, TransitionTask, TransitionType } from '@/features/transitions/types';
import { formatDate } from '@/lib/format';

const TYPE_ICON: Record<TransitionType, typeof LogIn> = {
  ONBOARDING: LogIn,
  TRANSFER: ArrowLeftRight,
  OFFBOARDING: LogOut,
};

const GROUPS: { key: TaskSide; label: string; description: string }[] = [
  { key: 'RELINQUISH', label: 'Out', description: 'Handover and asset return in the old unit.' },
  { key: 'PROVISION', label: 'In', description: 'Access and assets prepared in the new unit.' },
  { key: 'NONE', label: 'Tasks', description: '' },
];

/** Kepala ringkasan transisi — port `.td-hero`. */
function TransitionHero({ transition }: { transition: Transition }) {
  const Icon = TYPE_ICON[transition.type];

  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary-50 text-secondary-500 [&_svg]:size-5">
          <Icon />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-body text-[11px] font-bold uppercase tracking-[0.06em] text-fg-3">
              {TYPE_LABEL[transition.type]}
            </span>
            {transition.subtype && (
              <span className="inline-flex h-[22px] items-center rounded-pill bg-primary-200 px-2.5 font-body text-[10px] font-bold uppercase tracking-[0.06em] text-secondary-700">
                {SUBTYPE_LABEL[transition.subtype]}
              </span>
            )}
          </div>
          <h2 className="m-0 font-display text-xl font-bold text-fg-1">{transition.employee}</h2>
          <div className="flex flex-wrap items-center gap-2 font-body text-[13px] font-medium text-fg-2 [&_svg]:size-4 [&_svg]:text-fg-3">
            <span className="inline-flex items-center gap-1.5">
              <Briefcase />
              {transition.from}
            </span>
            <MoveRight />
            {transition.type === 'OFFBOARDING' ? (
              <span className="inline-flex items-center gap-1.5 text-error-600">
                <DoorOpen />
                {transition.detail}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck />
                <strong>{transition.to}</strong>
              </span>
            )}
          </div>
          <span className="font-body text-[13px] font-medium text-fg-3">
            Effective date · <strong className="text-fg-1">{formatDate(transition.effectiveDate)}</strong>
            {transition.requester && <> · Requested by {transition.requester}</>}
          </span>
        </div>
        <TransitionStatusBadge status={transition.status} />
      </div>

      <div className="border-t border-border-1 pt-4">
        <LifecycleSteps status={transition.status} />
      </div>

      <div className="border-t border-border-1 pt-4">
        <TaskMeter transition={transition} done={doneCount(transition)} />
      </div>
    </Card>
  );
}

/**
 * Transition › Detail — TR-DASHBOARD + TASK-CARD + TR-CLEARANCE (FSD-001-EMPLOYEE 0.83 §5). Transisi dipilih
 * lewat query `?tr=<id>`; tanpa itu, transisi teratas yang ditampilkan. Approve/Reject tampil bagi penyetuju
 * task; Confirm dua-pihak milik karyawan subjek (HR hanya bila alasan keluar Deceased).
 */
export function TransitionDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: list } = useTransitions();
  const requestedId = params.get('tr') ?? list?.[0]?.id;
  const { data: transition, isLoading } = useTransition(requestedId);

  const [waiving, setWaiving] = useState<TransitionTask | null>(null);
  const [rejecting, setRejecting] = useState<TransitionTask | null>(null);
  const approve = useApproveTask();
  const [clearanceOpen, setClearanceOpen] = useState(false);
  const complete = useCompleteTask();
  const confirm = useConfirmTask();

  const crumbs = [
    { label: 'Employee Management' },
    { label: 'Transition', to: '/employees/transition' },
    { label: transition?.id ?? 'Detail' },
  ];

  if (isLoading || !transition) {
    return (
      <PageShell crumbs={crumbs} title="Transition Detail">
        <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Loading the transition…</p>
      </PageShell>
    );
  }

  const busy = complete.isPending || confirm.isPending || approve.isPending;
  const outOpen = transition.tasks.some((task) => task.side === 'RELINQUISH' && !isTaskClosed(task));
  const card = (task: TransitionTask) => (
    <TaskCard
      key={task.id}
      task={task}
      busy={busy}
      canConfirm={transition.reason === 'DECEASED'}
      onComplete={() => complete.mutate({ transitionId: transition.id, taskId: task.id })}
      onConfirm={() => confirm.mutate({ transitionId: transition.id, taskId: task.id })}
      onWaive={() => setWaiving(task)}
      onApprove={isApprover(task, CURRENT_USER) ? () => approve.mutate({ transitionId: transition.id, taskId: task.id }) : undefined}
      onReject={isApprover(task, CURRENT_USER) ? () => setRejecting(task) : undefined}
    />
  );
  const showClearance = transition.type === 'OFFBOARDING' && transition.status !== 'COMPLETED';
  const hasSides = transition.tasks.some((task) => task.side !== 'NONE');

  return (
    <>
      <PageShell
        crumbs={crumbs}
        title="Transition Detail"
        description="Progress and tasks of one transition. A structural move happens on the effective date once every required task is done."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/employees/transition')}>
              Back to list
            </Button>
            {showClearance && (
              <Button variant="secondary" onClick={() => setClearanceOpen(true)}>
                Clearance Gate
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <TransitionHero transition={transition} />

          <Note icon={<Info />}>{LIFECYCLE_NOTE[transition.type]}</Note>

          {(transition.facilityProvided || transition.facilityWithdrawn) && (
            <Note icon={<Lock />}>
              {transition.facilityProvided && (
                <>
                  <strong>Facility provided:</strong> {transition.facilityProvided}
                  {transition.facilityWithdrawn && <br />}
                </>
              )}
              {transition.facilityWithdrawn && (
                <>
                  <strong>Facility withdrawn:</strong> {transition.facilityWithdrawn}
                </>
              )}
              <br />
              <span className="text-fg-3">Visible only to the task handlers, approvers, HR and the employee.</span>
            </Note>
          )}

          <Card>
            <header className="flex flex-wrap items-center gap-2 border-b border-border-1 pb-3">
              <h3 className="m-0 font-body text-sm font-bold text-fg-1">Task list</h3>
              <span className="font-body text-xs font-bold text-fg-3">{transition.tasks.length}</span>
            </header>

            <div className="flex flex-col gap-5 pt-4">
              {transition.tasks.length === 0 ? (
                <EmptyState
                  title="No tasks yet"
                  description={
                    transition.status === 'IN_APPROVAL'
                      ? 'This transition is waiting for approval. Tasks are created once the parent chain approves it.'
                      : 'No task package applies to this transition. Check its setup in Materialization.'
                  }
                />
              ) : hasSides ? (
                GROUPS.map((group) => {
                  const items = transition.tasks.filter((task) => task.side === group.key);
                  if (items.length === 0) return null;
                  return (
                    <section key={group.key} className="flex flex-col gap-3">
                      <TaskGroupHead side={group.label.toUpperCase()} description={group.description} />
                      {group.key === 'PROVISION' && transition.inOpensAfterOut && outOpen && (
                        <span className="font-body text-xs font-medium text-fg-3">Opens after the Out tasks are done.</span>
                      )}
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{items.map(card)}</div>
                    </section>
                  );
                })
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{transition.tasks.map(card)}</div>
              )}
            </div>
          </Card>
        </div>
      </PageShell>

      <WaiveTaskModal transitionId={transition.id} task={waiving} onClose={() => setWaiving(null)} />

      <ClearanceModal transition={transition} open={clearanceOpen} onClose={() => setClearanceOpen(false)} />
      <RejectTaskModal transitionId={transition.id} task={rejecting} onClose={() => setRejecting(null)} />
    </>
  );
}
