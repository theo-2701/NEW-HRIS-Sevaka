import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, StatCard } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { ProgressBar, TransitionStatusBadge } from '@/features/transitions/components/TransitionBits';
import { CreateTransitionModal } from '@/features/transitions/components/CreateTransitionModal';
import { useTransitions } from '@/features/transitions/hooks/useTransitions';
import { useApproveTransition } from '@/features/transitions/hooks/useTransitionHub';
import { REQUEST_KIND_LABEL, TRANSITION_STATUS_LABEL, TYPE_LABEL, doneCount, isTaskClosed, progressPct } from '@/features/transitions/types';
import type { RequestKind, Transition, TransitionStatus, TransitionType } from '@/features/transitions/types';
import { formatDate } from '@/lib/format';

export const TRANSITION_DETAIL_PATH = '/employees/transition/detail';

/**
 * Transition (TSD-001-EMPLOYEE 0.212 §7.25) — satu menu menggantikan Employee Transfer
 * dan dua dashboard Onboarding/Offboarding. Ajukan Offboarding, Mutation, Promotion,
 * atau Demotion; onboarding lahir dari materialisasi New Joiner.
 */
export function TransitionsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useTransitions();
  const [creating, setCreating] = useState<RequestKind | null>(null);
  const [approving, setApproving] = useState<Transition | null>(null);
  const [type, setType] = useState<TransitionType | 'ALL'>('ALL');
  const [status, setStatus] = useState<TransitionStatus | 'ALL'>('ALL');
  const [keyword, setKeyword] = useState('');
  const approve = useApproveTransition();

  const all = useMemo(() => data ?? [], [data]);
  const rows = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return all.filter(
      (row) =>
        (type === 'ALL' || row.type === type) &&
        (status === 'ALL' || row.status === status) &&
        (!q || row.employee.toLowerCase().includes(q) || row.id.toLowerCase().includes(q)),
    );
  }, [all, type, status, keyword]);
  const paged = usePagedRows(rows);

  const running = all.filter((row) => row.status === 'IN_APPROVAL' || row.status === 'IN_PROGRESS').length;
  const awaitingEmployee = all.reduce((n, row) => n + row.tasks.filter((t) => t.status === 'AWAITING_CONFIRM').length, 0);
  const awaitingApproval = all.reduce((n, row) => n + row.tasks.filter((t) => t.status === 'AWAITING_APPROVAL').length, 0);
  const overdue = all.reduce((n, row) => n + row.tasks.filter((t) => t.timedOut && !isTaskClosed(t)).length, 0);

  const open = (row: Transition) => navigate(`${TRANSITION_DETAIL_PATH}?tr=${row.id}`);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Transition' }, { label: 'Transition' }]}
        title="Transition"
        description="Onboarding, offboarding, mutation, promotion, and demotion in one list. Each transition runs the tasks of its Materialization setup; the seat and grade move only after every task is done."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                New request
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(REQUEST_KIND_LABEL) as RequestKind[]).map((kind) => (
                <DropdownMenuItem key={kind} onSelect={() => setCreating(kind)}>
                  {REQUEST_KIND_LABEL[kind]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Running transitions" value={running} />
            <StatCard label="Awaiting approval" value={awaitingApproval} />
            <StatCard label="Awaiting employee" value={awaitingEmployee} />
            <StatCard label="Overdue tasks" value={overdue} />
          </div>

          <Card>
            <CardHead title="Transitions" sub="Rotation is managed in Temporary Assignment" />
            <div className="flex flex-col">
              <TableToolbar
                filters={
                  <>
                    <Select value={type} onValueChange={(value) => { setType(value as TransitionType | 'ALL'); paged.resetPage(); }}>
                      <SelectTrigger className="w-[170px]" aria-label="Type filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All types</SelectItem>
                        {(Object.keys(TYPE_LABEL) as TransitionType[]).map((value) => (
                          <SelectItem key={value} value={value}>
                            {TYPE_LABEL[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={status} onValueChange={(value) => { setStatus(value as TransitionStatus | 'ALL'); paged.resetPage(); }}>
                      <SelectTrigger className="w-[170px]" aria-label="Status filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        {(Object.keys(TRANSITION_STATUS_LABEL) as TransitionStatus[]).map((value) => (
                          <SelectItem key={value} value={value}>
                            {TRANSITION_STATUS_LABEL[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                }
                search={{ value: keyword, onChange: (next) => { setKeyword(next); paged.resetPage(); }, placeholder: 'Search employee or ID' }}
              />
              <DataTable<Transition>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty={keyword || type !== 'ALL' || status !== 'ALL' ? 'No transition matches these criteria.' : 'No transition yet.'}
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) => <CellIdentity name={row.employee} sub={row.id} leading={<Avatar name={row.employee} size="sm" />} />,
                  },
                  {
                    key: 'type',
                    header: 'Type',
                    render: (row) => (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold text-fg-1">{TYPE_LABEL[row.type]}</span>
                        <span className="max-w-[260px] truncate text-xs text-fg-3" title={row.detail}>
                          {row.detail}
                        </span>
                      </span>
                    ),
                  },
                  { key: 'effective', header: 'Effective', muted: true, nowrap: true, render: (row) => formatDate(row.effectiveDate) },
                  {
                    key: 'progress',
                    header: 'Tasks',
                    render: (row) => (
                      <span className="flex items-center gap-2">
                        <ProgressBar value={progressPct(row)} className="w-20" />
                        <span className="font-body text-xs font-medium text-fg-3">
                          {doneCount(row)}/{row.tasks.length}
                        </span>
                      </span>
                    ),
                  },
                  { key: 'status', header: 'Status', render: (row) => <TransitionStatusBadge status={row.status} /> },
                ]}
                actions={(row) =>
                  row.status === 'IN_APPROVAL' ? (
                    <RowActions
                      actions={[
                        { label: 'Approve request', onSelect: () => setApproving(row) },
                        { label: 'View Detail', onSelect: () => open(row) },
                      ]}
                    />
                  ) : (
                    <RowButton onClick={() => open(row)}>View Detail</RowButton>
                  )
                }
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="transitions"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        </div>
      </PageShell>

      <CreateTransitionModal kind={creating} onClose={() => setCreating(null)} />
      <ConfirmDialog
        open={Boolean(approving)}
        title="Approve this request?"
        description={
          approving
            ? `${approving.employee} — ${approving.detail}. The tasks of the matching Materialization setup are created and assigned now. (Dummy mode stands in for the parent-chain approval workflow.)`
            : undefined
        }
        confirmLabel="Approve"
        cancelLabel="Cancel"
        tone="primary"
        loading={approve.isPending}
        onOpenChange={(next) => !next && setApproving(null)}
        onConfirm={() => approving && approve.mutate(approving.id, { onSettled: () => setApproving(null) })}
      />
    </>
  );
}
