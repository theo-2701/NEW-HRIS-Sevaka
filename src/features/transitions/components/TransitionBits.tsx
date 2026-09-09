import type { ReactNode } from 'react';
import { AlarmClock, Calendar, CalendarOff, Check, Info, Link2, ShieldAlert, User } from 'lucide-react';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { RowButton } from '@/components/RowActions';
import {
  STEP_ORDER,
  STEP_SUB,
  TASK_STATUS_LABEL,
  TRANSITION_STATUS_LABEL,
  isTaskClosed,
} from '@/features/transitions/types';
import type { TaskStatus, Transition, TransitionStatus, TransitionTask } from '@/features/transitions/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const TRANSITION_TONE: Record<TransitionStatus, BadgeTone> = {
  IN_APPROVAL: 'info',
  IN_PROGRESS: 'warn',
  COMPLETED: 'ok',
  CANCELLED: 'mute',
};

const TASK_TONE: Record<TaskStatus, BadgeTone> = {
  PENDING: 'mute',
  RELEASED: 'info',
  IN_PROGRESS: 'info',
  AWAITING_CONFIRM: 'warn',
  COMPLETED: 'ok',
  WAIVED: 'brand',
  SKIPPED: 'mute',
};

export function TransitionStatusBadge({ status }: { status: TransitionStatus }) {
  return <StatusBadge tone={TRANSITION_TONE[status]}>{TRANSITION_STATUS_LABEL[status]}</StatusBadge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return <StatusBadge tone={TASK_TONE[status]}>{TASK_STATUS_LABEL[status]}</StatusBadge>;
}

/** Bilah progres task — port `.impact__bar`. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-block h-1.5 overflow-hidden rounded-pill bg-fog', className)}>
      <span
        className="block h-full rounded-pill bg-secondary-500 transition-[width] duration-300 ease-standard"
        style={{ width: `${value}%` }}
      />
    </span>
  );
}

/**
 * Stepper daur hidup transisi — port `.td-steps`. CANCELLED ditampilkan
 * sebagai berhenti di tahap kedua, bukan sebagai langkah tersendiri.
 */
export function LifecycleSteps({ status }: { status: TransitionStatus }) {
  const cancelled = status === 'CANCELLED';
  const currentIndex = cancelled ? 1 : STEP_ORDER.indexOf(status);

  return (
    <ol className="flex flex-wrap gap-x-2 gap-y-4">
      {STEP_ORDER.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex && !cancelled;
        const last = index === STEP_ORDER.length - 1;
        const sub = cancelled && index === 1 ? 'Dibatalkan sebelum tanggal efektif' : STEP_SUB[step];

        return (
          <li key={step} className="flex min-w-[180px] flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full font-body text-xs font-bold',
                  done && 'bg-success-500 text-white',
                  active && 'bg-secondary-500 text-white',
                  cancelled && index === 1 && 'bg-error-500 text-white',
                  !done && !active && !(cancelled && index === 1) && 'bg-vapor text-fg-3',
                )}
              >
                {done ? <Check className="size-4" /> : index + 1}
              </span>
              {!last && <span className={cn('h-0.5 flex-1 rounded-pill', done ? 'bg-success-500' : 'bg-fog')} />}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-[13px] font-bold text-fg-1">{TRANSITION_STATUS_LABEL[step]}</span>
              <span className="font-body text-xs font-medium text-fg-3">{sub}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Catatan berkonteks — port `.note`. */
export function Note({
  tone = 'info',
  icon,
  children,
}: {
  tone?: 'info' | 'warn' | 'danger';
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-md border px-3.5 py-3 font-body text-[13px] font-medium leading-[1.5]',
        tone === 'info' && 'border-primary-200 bg-primary-50 text-secondary-800',
        tone === 'warn' && 'border-warning-200 bg-warning-100 text-warning-800',
        tone === 'danger' && 'border-error-200 bg-error-50 text-error-800',
      )}
    >
      <span className="mt-px [&_svg]:size-4">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 font-body text-xs font-medium text-fg-3 [&_svg]:size-3.5 [&_svg]:shrink-0">
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

/**
 * Kartu task — port `.tcard`. Tujuh status task dirender apa adanya (tidak
 * diratakan), dan `timedOut` hanya menempelkan tanda "lewat tenggat" tanpa
 * mengubah status.
 *
 * Kartu selalu setinggi barisnya (`h-full`) dan blok aksi didorong ke bawah
 * (`mt-auto`), jadi baris tombol seluruh kartu dalam satu baris grid sejajar.
 */
export function TaskCard({
  task,
  onComplete,
  onConfirm,
  onWaive,
  busy,
}: {
  task: TransitionTask;
  onComplete: () => void;
  onConfirm: () => void;
  onWaive: () => void;
  busy?: boolean;
}) {
  const closed = isTaskClosed(task);
  const overdue = Boolean(task.timedOut) && !closed;
  const schedule = task.releasedAt || task.dueAt;

  return (
    <article
      className={cn(
        'flex h-full flex-col gap-2.5 rounded-md border bg-bg-surface p-3.5',
        overdue ? 'border-error-200' : 'border-border-1',
        task.status === 'COMPLETED' && 'bg-cloud',
        (task.status === 'SKIPPED' || task.status === 'WAIVED') && 'bg-vapor',
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <h4 className="m-0 font-body text-[13px] font-bold leading-[1.35] text-fg-1">{task.name}</h4>
        <TaskStatusBadge status={task.status} />
      </header>

      <div className="flex flex-col gap-1.5">
        <MetaRow icon={<User />}>{task.owner || '— (kursi kosong)'}</MetaRow>
        {schedule ? (
          <MetaRow icon={<Calendar />}>
            {task.releasedAt ? `Rilis ${formatDate(task.releasedAt)}` : 'Belum dirilis'}
            {task.dueAt ? ` → tenggat ${formatDate(task.dueAt)}` : ''}
          </MetaRow>
        ) : (
          <MetaRow icon={<CalendarOff />}>Tanpa jadwal</MetaRow>
        )}
        {task.clearanceBlocking && (
          <MetaRow icon={<ShieldAlert />}>
            <strong>Clearance-blocking</strong>
          </MetaRow>
        )}
        {task.dependsOn && <MetaRow icon={<Link2 />}>Menunggu: {task.dependsOn}</MetaRow>}
        {task.skipReason && <MetaRow icon={<Info />}>Alasan: {task.skipReason}</MetaRow>}
      </div>

      {(overdue || !closed) && (
        <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-border-1 pt-2.5">
          {overdue && (
            <span className="inline-flex items-center gap-1 font-body text-[11.5px] font-bold text-error-600 [&_svg]:size-3.5">
              <AlarmClock />
              Lewat tenggat
            </span>
          )}
          {(task.status === 'RELEASED' || task.status === 'IN_PROGRESS') && (
            <RowButton onClick={onComplete} disabled={busy}>
              Mark done (PIC)
            </RowButton>
          )}
          {task.status === 'AWAITING_CONFIRM' && (
            <RowButton onClick={onConfirm} disabled={busy}>
              Confirm receipt
            </RowButton>
          )}
          {!closed && (
            <RowButton onClick={onWaive} disabled={busy}>
              Waive
            </RowButton>
          )}
        </footer>
      )}
    </article>
  );
}

/** Kepala grup task per sisi — port `.td-group__head`. */
export function TaskGroupHead({ side, description }: { side: string; description: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span
        className={cn(
          'inline-flex h-[22px] items-center rounded-pill px-2.5 font-body text-[10px] font-bold uppercase tracking-[0.06em]',
          side === 'RELINQUISH' ? 'bg-warning-100 text-warning-800' : 'bg-primary-200 text-secondary-700',
        )}
      >
        {side}
      </span>
      <span className="font-body text-xs font-medium text-fg-3">{description}</span>
    </div>
  );
}

/** Meter "x of y tasks done" — port `.td-meter`. */
export function TaskMeter({ transition, done }: { transition: Transition; done: number }) {
  const total = transition.tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-body text-[13px] font-medium text-fg-2">
        {done} dari {total} task selesai
        <span className="text-fg-3"> · {total - done} tersisa</span>
      </span>
      <ProgressBar value={pct} className="w-[180px] flex-1" />
      <span className="font-body text-[13px] font-bold text-fg-1">{pct}%</span>
    </div>
  );
}
