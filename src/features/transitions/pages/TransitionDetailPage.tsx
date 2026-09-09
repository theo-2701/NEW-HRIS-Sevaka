import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, BadgeCheck, Briefcase, DoorOpen, Info, LogIn, LogOut, MoveRight } from 'lucide-react';
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
import {
  useCompleteTask,
  useConfirmTask,
  useTransition,
  useTransitions,
} from '@/features/transitions/hooks/useTransitions';
import { LIFECYCLE_NOTE, TYPE_LABEL, doneCount } from '@/features/transitions/types';
import type { TaskSide, Transition, TransitionTask, TransitionType } from '@/features/transitions/types';
import { formatDate } from '@/lib/format';

const TYPE_ICON: Record<TransitionType, typeof LogIn> = {
  ONBOARDING: LogIn,
  TRANSFER: ArrowLeftRight,
  OFFBOARDING: LogOut,
};

const GROUPS: { key: TaskSide; label: string; description: string }[] = [
  { key: 'RELINQUISH', label: 'Relinquish', description: 'Serah terima & pengembalian aset di unit asal.' },
  { key: 'PROVISION', label: 'Provision', description: 'Akses & aset disiapkan di unit tujuan.' },
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
                {transition.subtype}
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
            Tanggal efektif · <strong className="text-fg-1">{formatDate(transition.effectiveDate)}</strong>
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
 * Transfer Dashboard — port `_prototype/transition-dashboard.html`
 * (TR-DASHBOARD + TASK-CARD + TR-CLEARANCE). Transisi dipilih lewat query
 * `?tr=<id>`; tanpa itu, transisi teratas yang ditampilkan.
 */
export function TransitionDetailPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: list } = useTransitions();
  const requestedId = params.get('tr') ?? list?.[0]?.id;
  const { data: transition, isLoading } = useTransition(requestedId);

  const [waiving, setWaiving] = useState<TransitionTask | null>(null);
  const [clearanceOpen, setClearanceOpen] = useState(false);
  const complete = useCompleteTask();
  const confirm = useConfirmTask();

  const crumbs = [
    { label: 'Employee Management' },
    { label: 'Employee Transfer', to: '/employees/transfer' },
    { label: transition?.id ?? 'Detail' },
  ];

  if (isLoading || !transition) {
    return (
      <PageShell crumbs={crumbs} title="Transfer Dashboard">
        <p className="py-10 text-center font-body text-[13px] font-medium text-fg-3">Memuat transisi…</p>
      </PageShell>
    );
  }

  const busy = complete.isPending || confirm.isPending;
  const showClearance = transition.type === 'OFFBOARDING' && transition.status !== 'COMPLETED';
  const hasSides = transition.tasks.some((task) => task.side !== 'NONE');

  return (
    <>
      <PageShell
        crumbs={crumbs}
        title="Transfer Dashboard"
        description="Progres & daftar task untuk satu transisi. Perpindahan struktural terjadi atomik pada tanggal efektif setelah task wajib selesai."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/employees/transfer')}>
              Back to list
            </Button>
            {showClearance && (
              <Button variant="secondary" onClick={() => setClearanceOpen(true)}>
                Clearance gate
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <TransitionHero transition={transition} />

          <Note icon={<Info />}>{LIFECYCLE_NOTE[transition.type]}</Note>

          <Card>
            <header className="flex flex-wrap items-center gap-2 border-b border-border-1 pb-3">
              <h3 className="m-0 font-body text-sm font-bold text-fg-1">Task list</h3>
              <span className="font-body text-xs font-bold text-fg-3">{transition.tasks.length}</span>
            </header>

            <div className="flex flex-col gap-5 pt-4">
              {transition.tasks.length === 0 ? (
                <EmptyState
                  title="Belum ada task"
                  description="Transisi ini masih menunggu persetujuan. Task lahir setelah parent chain menyetujui."
                />
              ) : hasSides ? (
                GROUPS.map((group) => {
                  const items = transition.tasks.filter((task) => task.side === group.key);
                  if (items.length === 0) return null;
                  return (
                    <section key={group.key} className="flex flex-col gap-3">
                      <TaskGroupHead side={group.label.toUpperCase()} description={group.description} />
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {items.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            busy={busy}
                            onComplete={() => complete.mutate({ transitionId: transition.id, taskId: task.id })}
                            onConfirm={() => confirm.mutate({ transitionId: transition.id, taskId: task.id })}
                            onWaive={() => setWaiving(task)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {transition.tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      busy={busy}
                      onComplete={() => complete.mutate({ transitionId: transition.id, taskId: task.id })}
                      onConfirm={() => confirm.mutate({ transitionId: transition.id, taskId: task.id })}
                      onWaive={() => setWaiving(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </PageShell>

      <WaiveTaskModal transitionId={transition.id} task={waiving} onClose={() => setWaiving(null)} />

      <ClearanceModal transition={transition} open={clearanceOpen} onClose={() => setClearanceOpen(false)} />
    </>
  );
}
