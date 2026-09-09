import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, StatCard } from '@/components/Card';
import { CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  ProgressBar,
  TransitionStatusBadge,
} from '@/features/transitions/components/TransitionBits';
import { CreateTransitionModal } from '@/features/transitions/components/CreateTransitionModal';
import { useTransitions } from '@/features/transitions/hooks/useTransitions';
import { TYPE_LABEL, isTaskClosed, progressPct } from '@/features/transitions/types';
import type { Transition, TransitionType } from '@/features/transitions/types';
import { formatDate } from '@/lib/format';

const CREATE_MENU: { type: TransitionType; label: string }[] = [
  { type: 'ONBOARDING', label: 'Onboarding' },
  { type: 'TRANSFER', label: 'Transfer / Promotion' },
  { type: 'OFFBOARDING', label: 'Offboarding' },
];

/**
 * Employee Transfer (Transition) — port `_prototype/transition.html`
 * (FSD §5 · UIC §5). Satu kerangka untuk onboarding, transfer, dan
 * offboarding; detail task ada di halaman Transfer Dashboard.
 */
export function TransitionsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useTransitions();
  const rows = useMemo(() => data ?? [], [data]);
  const [creating, setCreating] = useState<TransitionType | null>(null);

  const paged = usePagedRows(rows);

  const active = rows.filter((row) => row.status === 'IN_APPROVAL' || row.status === 'IN_PROGRESS').length;
  const openTasks = rows.reduce(
    (total, row) => total + row.tasks.filter((task) => task.status === 'IN_PROGRESS' || task.status === 'RELEASED').length,
    0,
  );
  const awaitingEmployee = rows.reduce(
    (total, row) => total + row.tasks.filter((task) => task.status === 'AWAITING_CONFIRM').length,
    0,
  );
  const overdue = rows.reduce(
    (total, row) => total + row.tasks.filter((task) => task.timedOut && !isTaskClosed(task)).length,
    0,
  );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Transfer' }]}
        title="Employee Transfer"
        description="Satu kerangka untuk onboarding, transfer, dan offboarding. Setiap transisi melahirkan task ber-PIC; perpindahan struktural terjadi atomik pada tanggal efektif setelah task wajib selesai."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Caret = satu-satunya ikon yang boleh menempel di tombol. */}
              <Button>
                New transition
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {CREATE_MENU.map((item) => (
                <DropdownMenuItem key={item.type} onSelect={() => setCreating(item.type)}>
                  {item.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active transitions" value={active} footer={<Foot>Dalam persetujuan &amp; berjalan</Foot>} />
            <StatCard label="Tasks in progress" value={openTasks} footer={<Foot>Di seluruh transisi</Foot>} />
            <StatCard label="Awaiting employee" value={awaitingEmployee} footer={<Foot>Konfirmasi dua pihak</Foot>} />
            <StatCard label="Overdue tasks" value={overdue} footer={<Foot>Lewat tenggat — masih terbuka</Foot>} />
          </div>

          <Card>
            <CardHead title="Transitions" sub={`${rows.length} transisi`} />

            <div className="flex flex-col">
              <DataTable<Transition>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty="Belum ada transisi."
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) => (
                      <CellIdentity name={row.employee} sub={row.id} leading={<Avatar name={row.employee} size="sm" />} />
                    ),
                  },
                  { key: 'type', header: 'Type', render: (row) => TYPE_LABEL[row.type] },
                  { key: 'detail', header: 'Detail', muted: true, render: (row) => row.detail },
                  {
                    key: 'effective',
                    header: 'Effective',
                    muted: true,
                    nowrap: true,
                    render: (row) => formatDate(row.effectiveDate),
                  },
                  {
                    key: 'progress',
                    header: 'Progress',
                    render: (row) => (
                      <span className="flex items-center gap-2">
                        <ProgressBar value={progressPct(row)} className="w-20" />
                        <span className="font-body text-xs font-medium text-fg-3">{progressPct(row)}%</span>
                      </span>
                    ),
                  },
                  { key: 'status', header: 'Status', render: (row) => <TransitionStatusBadge status={row.status} /> },
                ]}
                actions={(row) => (
                  <RowButton onClick={() => navigate(`/employees/transfer/dashboard?tr=${row.id}`)}>
                    View Detail
                  </RowButton>
                )}
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

      <CreateTransitionModal type={creating} onClose={() => setCreating(null)} />
    </>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11.5px] font-medium leading-[1.4] text-fg-3">{children}</span>;
}
