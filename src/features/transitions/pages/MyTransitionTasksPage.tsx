import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowActions } from '@/components/RowActions';
import { Segmented } from '@/components/Segmented';
import { TableToolbar } from '@/components/TableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { formatDate } from '@/lib/format';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TaskStatusBadge } from '@/features/transitions/components/TransitionBits';
import { WaiveTaskModal } from '@/features/transitions/components/WaiveTaskModal';
import { useCompleteTask, useConfirmTask, useTransitions } from '@/features/transitions/hooks/useTransitions';
import { TYPE_LABEL, isTaskClosed, type Transition, type TransitionTask } from '@/features/transitions/types';

interface MyTask {
  task: TransitionTask;
  transition: Transition;
}

type View = 'open' | 'done';

const SIDE_LABEL = { RELINQUISH: 'Release (origin unit)', PROVISION: 'Prepare (new unit)', NONE: '—' } as const;

/**
 * Employee Management › My Transition Tasks — task transisi yang PIC-nya saya, lintas transisi.
 * Aksi = kontrak yang sudah ada (UIC-EMPLOYEE §5.3 complete/confirm, TSD §7.6.4 waive).
 * GAP: kontrak belum punya alamat "task milik saya"; mode dummy menyaring task dari daftar transisi
 * berdasarkan unit PIC yang dipilih di "Viewing as".
 */
export function MyTransitionTasksPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useTransitions();
  const transitions = useMemo(() => data ?? [], [data]);

  const owners = useMemo(
    () => [...new Set(transitions.flatMap((row) => row.tasks.map((task) => task.owner)))].sort(),
    [transitions],
  );
  const [owner, setOwner] = useState('');
  const me = owner || owners.find((name) => name.startsWith('HR')) || owners[0] || '';
  const [view, setView] = useState<View>('open');

  const all = useMemo<MyTask[]>(
    () =>
      transitions
        .filter((transition) => transition.status !== 'CANCELLED')
        .flatMap((transition) => transition.tasks.filter((task) => task.owner === me).map((task) => ({ task, transition }))),
    [transitions, me],
  );
  const rows = useMemo(
    () =>
      all
        .filter(({ task }) => (view === 'open' ? !isTaskClosed(task) : isTaskClosed(task)))
        // Lewat tenggat dulu, lalu tenggat terdekat.
        .sort((a, b) => Number(Boolean(b.task.timedOut)) - Number(Boolean(a.task.timedOut)) || (a.task.dueAt || '9').localeCompare(b.task.dueAt || '9')),
    [all, view],
  );
  const paged = usePagedRows(rows);
  const openCount = all.filter(({ task }) => !isTaskClosed(task)).length;
  const overdue = all.filter(({ task }) => task.timedOut && !isTaskClosed(task)).length;

  const complete = useCompleteTask();
  const confirm = useConfirmTask();
  const [waiving, setWaiving] = useState<MyTask | null>(null);

  const actions = ({ task, transition }: MyTask) => {
    const list = [];
    if (task.status === 'RELEASED' || task.status === 'IN_PROGRESS') {
      list.push({ label: 'Mark as done', onSelect: () => complete.mutate({ transitionId: transition.id, taskId: task.id }) });
    }
    if (task.status === 'AWAITING_CONFIRM' && task.owner === 'Employee') {
      list.push({ label: 'Confirm received', onSelect: () => confirm.mutate({ transitionId: transition.id, taskId: task.id }) });
    }
    if (!isTaskClosed(task)) list.push({ label: 'Waive', danger: true, onSelect: () => setWaiving({ task, transition }) });
    list.push({ label: 'Open transition', onSelect: () => navigate(`/employees/transfer/dashboard?tr=${transition.id}`) });
    return <RowActions actions={list} />;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'My Transition Tasks' }]}
        title="My Transition Tasks"
        description="Onboarding, transfer and offboarding tasks assigned to you, across all transitions. Mark a task as done when your part is finished; overdue tasks are listed first."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-body text-xs font-medium text-fg-3">Viewing as</span>
            <Select
              value={me}
              onValueChange={(value) => {
                setOwner(value);
                paged.resetPage();
              }}
            >
              <SelectTrigger className="w-[260px]" aria-label="Viewing as">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {owners.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {overdue > 0 && view === 'open' && (
            <Note tone="warn" icon={<Info />}>
              {overdue} task{overdue === 1 ? ' is' : 's are'} past the due date. Overdue is a flag — the task stays open until
              you finish or waive it.
            </Note>
          )}

          <Card>
            <CardHead title="Tasks" sub={`${openCount} open`} />
            <div className="flex flex-col">
              <TableToolbar
                filters={
                  <Segmented<View>
                    value={view}
                    onChange={(next) => {
                      setView(next);
                      paged.resetPage();
                    }}
                    options={[
                      { value: 'open', label: 'Open' },
                      { value: 'done', label: 'Done' },
                    ]}
                  />
                }
              />
              <DataTable<MyTask>
                rows={paged.rows}
                rowKey={(row) => `${row.transition.id}:${row.task.id}`}
                loading={isLoading}
                empty={view === 'open' ? 'No open task for you. Nice.' : 'No finished task yet.'}
                columns={[
                  {
                    key: 'task',
                    header: 'Task',
                    strong: true,
                    render: ({ task }) => (
                      <span className="flex flex-col gap-0.5">
                        <span>{task.name}</span>
                        {task.dependsOn && (
                          <span className="font-body text-[11px] font-medium text-fg-3">After: {task.dependsOn}</span>
                        )}
                      </span>
                    ),
                  },
                  {
                    key: 'transition',
                    header: 'Transition',
                    render: ({ transition }) => (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold text-fg-1">{transition.employee}</span>
                        <span className="font-body text-[11px] font-medium text-fg-3">
                          {TYPE_LABEL[transition.type]} · effective {formatDate(transition.effectiveDate)}
                        </span>
                      </span>
                    ),
                  },
                  { key: 'side', header: 'Side', muted: true, render: ({ task }) => SIDE_LABEL[task.side] },
                  {
                    key: 'due',
                    header: 'Due',
                    nowrap: true,
                    render: ({ task }) =>
                      task.dueAt ? (
                        <span className={task.timedOut && !isTaskClosed(task) ? 'font-semibold text-warning-700' : undefined}>
                          {formatDate(task.dueAt)}
                          {task.timedOut && !isTaskClosed(task) && ' · overdue'}
                        </span>
                      ) : (
                        <span className="text-fg-4">Not released yet</span>
                      ),
                  },
                  { key: 'status', header: 'Status', render: ({ task }) => <TaskStatusBadge status={task.status} /> },
                ]}
                actions={actions}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="tasks"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        </div>
      </PageShell>

      <WaiveTaskModal
        transitionId={waiving?.transition.id ?? ''}
        task={waiving?.task ?? null}
        onClose={() => setWaiving(null)}
      />
    </>
  );
}
