import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TabMenu } from '@/components/TabMenu';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Modal } from '@/components/Modal';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { EMPLOYEES, employeeName } from '@/features/time-off/mock-data';
import { TaskStatusBadge } from '@/features/transitions/components/TransitionBits';
import { useCompleteTask } from '@/features/transitions/hooks/useTransitions';
import { useApproveTask, useCloseQueue, useEscalations, useMyTasks, useRejectTask } from '@/features/transitions/hooks/useTransitionHub';
import { EMPLOYEE_ROLE } from '@/features/transitions/services/setup.service';
import type { Escalation, MyTask } from '@/features/transitions/services/transition.service';
import { HR_QUEUE_REASON_LABEL, TYPE_LABEL } from '@/features/transitions/types';
import { TRANSITION_DETAIL_PATH } from '@/features/transitions/pages/TransitionsPage';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'tasks' | 'approvals' | 'escalations';

const sideLabel = (side: string) => (side === 'RELINQUISH' ? 'Out' : side === 'PROVISION' ? 'In' : '—');

/**
 * My Transition Tasks (TSD-001-EMPLOYEE 0.212 §7.24): inbox petugas dan penyetuju,
 * plus antrean eskalasi HR Manager (§7.22). Server menyaring per orang login.
 */
export function MyTransitionTasksPage() {
  const [viewer, setViewer] = useState('emp-sari');
  const [tab, setTab] = useState<Tab>('tasks');
  const [completing, setCompleting] = useState<MyTask | null>(null);
  const [approving, setApproving] = useState<MyTask | null>(null);
  const [rejecting, setRejecting] = useState<MyTask | null>(null);
  const [reason, setReason] = useState('');
  const [closing, setClosing] = useState<Escalation | null>(null);
  const [note, setNote] = useState('');

  const hrManager = EMPLOYEE_ROLE[viewer] === 'ROLE_HR_MANAGER';
  const handler = useMyTasks(viewer, 'handler');
  const approver = useMyTasks(viewer, 'approver');
  const escalations = useEscalations(hrManager);
  const complete = useCompleteTask();
  const approve = useApproveTask(viewer);
  const reject = useRejectTask(viewer);
  const closeQueue = useCloseQueue();

  const taskRows = tab === 'tasks' ? (handler.data ?? []) : (approver.data ?? []);
  const pagedTasks = usePagedRows(taskRows);
  const pagedEsc = usePagedRows(escalations.data ?? []);

  const taskColumns = [
    { key: 'task', header: 'Task', strong: true, render: (row: MyTask) => row.task.name },
    { key: 'side', header: 'Side', muted: true, render: (row: MyTask) => sideLabel(row.task.side) },
    {
      key: 'subject',
      header: 'Employee',
      render: (row: MyTask) => (
        <Link className="font-semibold text-secondary-700 underline" to={`${TRANSITION_DETAIL_PATH}?tr=${row.transitionId}`}>
          {row.subjectName}
        </Link>
      ),
    },
    { key: 'type', header: 'Transition', muted: true, render: (row: MyTask) => TYPE_LABEL[row.transitionType] },
    {
      key: 'due',
      header: 'Due',
      nowrap: true,
      render: (row: MyTask) =>
        row.task.dueAt ? (
          <span className="inline-flex items-center gap-1.5">
            {formatDate(row.task.dueAt)}
            {row.isOverdue && <StatusBadge tone="err">Overdue</StatusBadge>}
          </span>
        ) : (
          '—'
        ),
    },
    { key: 'status', header: 'Status', render: (row: MyTask) => <TaskStatusBadge status={row.task.status} /> },
  ];

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Transition' }, { label: 'My Transition Tasks' }]}
      title="My Transition Tasks"
      description="Tasks you handle and tasks waiting for your approval. Waiting for the employee or an approver never counts as late."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
          <Select
            value={viewer}
            onValueChange={(value) => {
              setViewer(value);
              setTab('tasks');
            }}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYEES.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name} — {EMPLOYEE_ROLE[row.id]?.replace('ROLE_', '').replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'tasks', label: 'My Tasks', count: handler.data?.length },
            { value: 'approvals', label: 'My Approvals', count: approver.data?.length },
            ...(hrManager ? [{ value: 'escalations' as const, label: 'Escalations', count: escalations.data?.length }] : []),
          ]}
        />

        {tab !== 'escalations' && (
          <Card>
            <CardHead
              title={tab === 'tasks' ? 'Tasks I handle' : 'Tasks waiting for my approval'}
              sub={tab === 'tasks' ? 'Open tasks only' : 'Approve, or send back with a reason'}
            />
            <div className="flex flex-col">
              <DataTable<MyTask>
                rows={pagedTasks.rows}
                rowKey={(row) => row.task.id}
                loading={tab === 'tasks' ? handler.isLoading : approver.isLoading}
                empty={tab === 'tasks' ? 'Nothing to handle right now.' : 'Nothing waiting for your approval.'}
                columns={taskColumns}
                actions={(row) => {
                  if (tab === 'approvals') {
                    return (
                      <RowActions
                        actions={[
                          { label: 'Approve', onSelect: () => setApproving(row) },
                          { label: 'Send back', danger: true, onSelect: () => { setReason(''); setRejecting(row); } },
                        ]}
                      />
                    );
                  }
                  const canComplete = row.task.status === 'RELEASED' || row.task.status === 'IN_PROGRESS';
                  return canComplete ? (
                    <RowButton onClick={() => setCompleting(row)}>Mark done</RowButton>
                  ) : (
                    <RowButton onClick={() => undefined} disabled>
                      {row.task.status === 'AWAITING_CONFIRM' ? 'Waiting for employee' : 'Waiting for approver'}
                    </RowButton>
                  );
                }}
              />
              <Pagination
                page={pagedTasks.page}
                pageSize={pagedTasks.pageSize}
                total={pagedTasks.total}
                noun="tasks"
                onPageChange={pagedTasks.setPage}
                onPageSizeChange={pagedTasks.setPageSize}
              />
            </div>
          </Card>
        )}

        {tab === 'escalations' && hrManager && (
          <Card>
            <CardHead title="Escalations" sub="Tasks no one can take, and onboarding closed by a newer transition" />
            <div className="flex flex-col">
              <DataTable<Escalation>
                rows={pagedEsc.rows}
                rowKey={(row) => row.transitionId}
                loading={escalations.isLoading}
                empty="No escalation. Every task has an eligible handler."
                columns={[
                  { key: 'employee', header: 'Employee', strong: true, render: (row) => row.employee },
                  { key: 'type', header: 'Transition', render: (row) => TYPE_LABEL[row.type] },
                  { key: 'tasks', header: 'Tasks', render: (row) => row.tasks.map((t) => t.name).join(', ') },
                  {
                    key: 'reason',
                    header: 'Reason',
                    muted: true,
                    render: (row) => HR_QUEUE_REASON_LABEL[row.tasks[0].hrQueue!.reason],
                  },
                  { key: 'since', header: 'Since', nowrap: true, muted: true, render: (row) => formatDateTime(row.tasks[0].hrQueue!.at) },
                ]}
                actions={(row) =>
                  row.type === 'ONBOARDING' ? (
                    <RowButton onClick={() => { setNote(''); setClosing(row); }}>Close onboarding</RowButton>
                  ) : (
                    <RowButton onClick={() => undefined} disabled>
                      Clears when assigned
                    </RowButton>
                  )
                }
              />
              <Pagination
                page={pagedEsc.page}
                pageSize={pagedEsc.pageSize}
                total={pagedEsc.total}
                noun="escalations"
                onPageChange={pagedEsc.setPage}
                onPageSizeChange={pagedEsc.setPageSize}
              />
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(completing)}
        title="Mark this task as done?"
        description={
          completing
            ? `${completing.task.name} — ${completing.subjectName}. ${completing.task.twoParty ? 'The employee confirms next.' : completing.task.approvalRequired ? 'The approver reviews next.' : 'The task closes now.'}`
            : undefined
        }
        confirmLabel="Mark done"
        cancelLabel="Cancel"
        tone="primary"
        loading={complete.isPending}
        onOpenChange={(next) => !next && setCompleting(null)}
        onConfirm={() =>
          completing &&
          complete.mutate({ transitionId: completing.transitionId, taskId: completing.task.id }, { onSettled: () => setCompleting(null) })
        }
      />
      <ConfirmDialog
        open={Boolean(approving)}
        title="Approve this task?"
        description={approving ? `${approving.task.name} for ${approving.subjectName}, handled by ${employeeName(approving.task.handlerId ?? '')}.` : undefined}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        tone="primary"
        loading={approve.isPending}
        onOpenChange={(next) => !next && setApproving(null)}
        onConfirm={() =>
          approving &&
          approve.mutate({ transitionId: approving.transitionId, taskId: approving.task.id }, { onSettled: () => setApproving(null) })
        }
      />
      {rejecting && (
        <Modal
          open
          onOpenChange={(next) => !next && setRejecting(null)}
          title="Send this task back?"
          description="The handler reworks it; a two-party task asks the employee to confirm again."
          footer={
            <>
              <Button variant="secondary" onClick={() => setRejecting(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={!reason.trim() || reject.isPending}
                onClick={() =>
                  reject.mutate({ transitionId: rejecting.transitionId, taskId: rejecting.task.id, reason }, { onSuccess: () => setRejecting(null) })
                }
              >
                Send back
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="reject-task-reason">
              Reason<em>*</em>
            </Label>
            <Textarea id="reject-task-reason" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={Boolean(closing)}
        title="Close this onboarding?"
        description={closing ? `${closing.employee}: ${closing.tasks.length} unfinished task(s) are closed with your note.` : undefined}
        confirmLabel="Close onboarding"
        cancelLabel="Cancel"
        tone="primary"
        loading={closeQueue.isPending}
        onOpenChange={(next) => !next && setClosing(null)}
        onConfirm={() => closing && closeQueue.mutate({ transitionId: closing.transitionId, note }, { onSettled: () => setClosing(null) })}
      >
        <div className="flex flex-col gap-1">
          <Label htmlFor="close-queue-note">Note</Label>
          <Textarea id="close-queue-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
      </ConfirmDialog>
    </PageShell>
  );
}
