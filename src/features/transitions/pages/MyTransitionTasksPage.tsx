import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Card, CardHead } from '@/components/Card';
import { CellIdentity, DataTable } from '@/components/DataTable';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import type { RowAction } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TabMenu } from '@/components/TabMenu';
import { TableToolbar } from '@/components/TableToolbar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { formatDate } from '@/lib/format';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TaskStatusBadge } from '@/features/transitions/components/TransitionBits';
import { RejectTaskModal } from '@/features/transitions/components/RejectTaskModal';
import {
  useApproveTask,
  useCompleteTask,
  useEscalations,
  useMyTasks,
} from '@/features/transitions/hooks/useTransitions';
import type { MyTaskRow } from '@/features/transitions/services/transition.service';
import { ESCALATION_LABEL, SIDE_LABEL, TYPE_LABEL, isTaskClosed } from '@/features/transitions/types';
import type { EscalationReason, TaskStatus, Transition, TransitionType } from '@/features/transitions/types';
import { useAuthStore } from '@/store/auth.store';

type Tab = 'tasks' | 'approvals' | 'escalations';
type StatusFilter = 'ALL' | 'IN_PROGRESS' | 'AWAITING_CONFIRM' | 'AWAITING_APPROVAL' | 'COMPLETED';

const STATUS_FILTER: Record<Exclude<StatusFilter, 'ALL'>, { label: string; statuses: TaskStatus[] }> = {
  IN_PROGRESS: { label: 'In progress', statuses: ['PENDING', 'RELEASED', 'IN_PROGRESS'] },
  AWAITING_CONFIRM: { label: 'Awaiting confirmation', statuses: ['AWAITING_CONFIRM'] },
  AWAITING_APPROVAL: { label: 'Awaiting approval', statuses: ['AWAITING_APPROVAL'] },
  COMPLETED: { label: 'Completed', statuses: ['COMPLETED', 'WAIVED', 'SKIPPED'] },
};

const TYPES = Object.keys(TYPE_LABEL) as TransitionType[];

/**
 * Employee Management › My Transition Tasks — FSD-001-EMPLOYEE 0.83 §18. Kotak masuk tugas transisi bagi
 * petugas (My Tasks) dan penyetuju (My Approvals); Escalations hanya HR Manager · Super Admin. Server hanya
 * mengembalikan tugas milik orang yang login (MT1).
 */
export function MyTransitionTasksPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const hrManager = role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';

  const [tab, setTab] = useState<Tab>('tasks');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [type, setType] = useState<TransitionType | 'ALL'>('ALL');
  const tasks = useMyTasks('tasks');
  const approvals = useMyTasks('approvals');
  const escalations = useEscalations(hrManager);

  const source = tab === 'approvals' ? approvals : tasks;
  const rows = useMemo(
    () =>
      (source.data ?? [])
        .filter(({ task }) => status === 'ALL' || STATUS_FILTER[status].statuses.includes(task.status))
        .filter(({ transition }) => type === 'ALL' || transition.type === type)
        // Lewat tenggat dulu, lalu tenggat terdekat.
        .sort(
          (a, b) =>
            Number(Boolean(b.task.timedOut && !isTaskClosed(b.task))) - Number(Boolean(a.task.timedOut && !isTaskClosed(a.task))) ||
            (a.task.dueAt || '9').localeCompare(b.task.dueAt || '9'),
        ),
    [source.data, status, type],
  );
  const paged = usePagedRows(rows);

  const complete = useCompleteTask();
  const approve = useApproveTask();
  const [rejecting, setRejecting] = useState<MyTaskRow | null>(null);

  const openTasks = (tasks.data ?? []).filter(({ task }) => !isTaskClosed(task)).length;
  const waitingApproval = (approvals.data ?? []).filter(({ task }) => task.status === 'AWAITING_APPROVAL').length;
  const overdue = (tasks.data ?? []).filter(({ task }) => task.timedOut && !isTaskClosed(task)).length;
  const openTransition = (transition: Transition) => navigate(`/employees/transition/detail?tr=${transition.id}`);

  const actionsFor = ({ task, transition }: MyTaskRow) => {
    const list: RowAction[] = [];
    if (tab === 'tasks' && (task.status === 'RELEASED' || task.status === 'IN_PROGRESS')) {
      // Tugas asset selesai otomatis dari event serah-terima/pengembalian di menu Asset (TSU-D31).
      list.push(
        task.asset
          ? { label: 'Open Asset', onSelect: () => navigate('/company-management/assets/assigned') }
          : { label: 'Complete', onSelect: () => complete.mutate({ transitionId: transition.id, taskId: task.id }) },
      );
    }
    if (tab === 'approvals' && task.status === 'AWAITING_APPROVAL') {
      list.push({ label: 'Approve', onSelect: () => approve.mutate({ transitionId: transition.id, taskId: task.id }) });
      list.push({ label: 'Reject', danger: true, onSelect: () => setRejecting({ task, transition }) });
    }
    list.push({ label: 'Open Transition', onSelect: () => openTransition(transition) });
    if (list.length === 1) return <RowButton onClick={list[0].onSelect}>{list[0].label}</RowButton>;
    return <RowActions actions={list} />;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'My Transition Tasks' }]}
        title="My Transition Tasks"
        description="Transition tasks you handle or approve. Two-party tasks wait for the employee's confirmation after you complete them; that waiting time is not counted against you."
      >
        <div className="flex flex-col gap-4">
          <TabMenu<Tab>
            value={tab}
            onChange={(next) => {
              setTab(next);
              paged.resetPage();
            }}
            items={[
              { value: 'tasks', label: 'My Tasks', count: openTasks },
              { value: 'approvals', label: 'My Approvals', count: waitingApproval },
              ...(hrManager ? [{ value: 'escalations' as const, label: 'Escalations', count: escalations.data?.length ?? 0 }] : []),
            ]}
          />

          {tab === 'tasks' && overdue > 0 && (
            <Note tone="warn" icon={<Info />}>
              {overdue} task{overdue === 1 ? ' is' : 's are'} past the due date. Overdue is a flag — the task stays open until it is done or waived.
            </Note>
          )}

          {tab === 'escalations' ? (
            <Card>
              <CardHead title="Escalations" sub="Transitions that need an HR Manager" />
              <DataTable<{ transition: Transition; reason: EscalationReason }>
                rows={escalations.data ?? []}
                rowKey={(row) => row.transition.id}
                loading={escalations.isLoading}
                empty={escalations.isError ? 'The tasks could not be loaded.' : 'No escalations.'}
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: ({ transition }) => <CellIdentity name={transition.employee} sub={transition.employeeNik ?? transition.id} />,
                  },
                  { key: 'type', header: 'Type', render: ({ transition }) => TYPE_LABEL[transition.type] },
                  { key: 'effective', header: 'Effective Date', muted: true, nowrap: true, render: ({ transition }) => formatDate(transition.effectiveDate) },
                  { key: 'reason', header: 'Why It Is Here', render: ({ reason }) => ESCALATION_LABEL[reason] },
                ]}
                actions={({ transition }) => <RowButton onClick={() => openTransition(transition)}>Open Transition</RowButton>}
              />
            </Card>
          ) : (
            <Card>
              <CardHead title={tab === 'tasks' ? 'My tasks' : 'Waiting for my approval'} sub={`${rows.length} tasks`} />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Select
                        value={status}
                        onValueChange={(value) => {
                          setStatus(value as StatusFilter);
                          paged.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[210px]" aria-label="Status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All statuses</SelectItem>
                          {(Object.keys(STATUS_FILTER) as Exclude<StatusFilter, 'ALL'>[]).map((value) => (
                            <SelectItem key={value} value={value}>
                              {STATUS_FILTER[value].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={type}
                        onValueChange={(value) => {
                          setType(value as TransitionType | 'ALL');
                          paged.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[160px]" aria-label="Type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All types</SelectItem>
                          {TYPES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {TYPE_LABEL[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  }
                />
                <DataTable<MyTaskRow>
                  rows={paged.rows}
                  rowKey={(row) => `${row.transition.id}:${row.task.id}`}
                  loading={source.isLoading}
                  empty={
                    source.isError
                      ? 'The tasks could not be loaded.'
                      : tab === 'tasks'
                        ? 'You have no tasks.'
                        : 'Nothing is waiting for your approval.'
                  }
                  columns={[
                    {
                      key: 'task',
                      header: 'Task',
                      strong: true,
                      render: ({ task }) => (
                        <span className="flex flex-col gap-0.5">
                          <span>{task.name}</span>
                          {task.rejectReason && <span className="font-body text-[11px] font-medium text-error-700">Returned: {task.rejectReason}</span>}
                          {task.dependsOn && !task.rejectReason && (
                            <span className="font-body text-[11px] font-medium text-fg-3">After: {task.dependsOn}</span>
                          )}
                        </span>
                      ),
                    },
                    { key: 'type', header: 'Transition', render: ({ transition }) => TYPE_LABEL[transition.type] },
                    { key: 'part', header: 'Part', muted: true, render: ({ task }) => SIDE_LABEL[task.side] },
                    { key: 'subject', header: 'Employee', render: ({ transition }) => transition.employee },
                    {
                      key: 'due',
                      header: 'Due',
                      nowrap: true,
                      render: ({ task }) => (task.dueAt ? formatDate(task.dueAt) : <span className="text-fg-4">Not released yet</span>),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: ({ task }) => (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <TaskStatusBadge status={task.status} />
                          {task.timedOut && !isTaskClosed(task) && <StatusBadge tone="err">Overdue</StatusBadge>}
                        </span>
                      ),
                    },
                  ]}
                  actions={actionsFor}
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
          )}
        </div>
      </PageShell>

      <RejectTaskModal transitionId={rejecting?.transition.id ?? ''} task={rejecting?.task ?? null} onClose={() => setRejecting(null)} />
    </>
  );
}
