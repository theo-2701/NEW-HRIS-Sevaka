import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { RowButton } from '@/components/RowActions';
import { StatusBadge, toneForStatus } from '@/components/StatusBadge';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/Card';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ContractRow } from '@/features/dashboard/types';

type TabId = 'announcement' | 'contract' | 'tasks';

const TABS: { id: TabId; label: string }[] = [
  { id: 'announcement', label: 'Announcement' },
  { id: 'contract', label: 'Contract & Probation' },
  { id: 'tasks', label: 'Tasks' },
];

/**
 * Kartu bertab di bawah banner — port `.table-card` + `.tabs-pills`.
 * Lebarnya mengikuti kolom banner (dipasang di stack yang sama).
 */
export function DashboardTabsCard({ contracts, loading }: { contracts: ContractRow[]; loading: boolean }) {
  const [tab, setTab] = useState<TabId>('contract');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contracts;
    return contracts.filter(
      (r) => r.employee.toLowerCase().includes(q) || r.employeeId.toLowerCase().includes(q),
    );
  }, [contracts, search]);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border-1 bg-bg-surface shadow-card-sm">
      <div className="flex gap-2 border-b border-border-1 px-6 pb-3.5 pt-[18px]">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'h-7 rounded-pill border px-3.5 font-body text-[10px] font-bold uppercase leading-none tracking-[0.08em] transition-[background,color,border-color] duration-200 ease-standard',
              t.id === tab
                ? 'border-secondary-500 bg-secondary-500 text-white'
                : 'border-border-1 bg-white text-fg-3 hover:border-secondary-200 hover:text-secondary-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-md border border-primary-200 bg-primary-100 px-4 py-3 font-body text-[13px] font-medium leading-normal text-secondary-900">
        <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-secondary-500 text-white">
          <Info className="size-3" />
        </span>
        <span>
          Introducing the Evaluation Review Cycle. Elevate your organization&apos;s success with the power of timely and
          data-driven review!{' '}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="font-bold text-secondary-700 underline"
          >
            Learn more
          </a>
        </span>
      </div>

      <div className="p-6 pt-4">
        {tab === 'contract' ? (
          <>
            <TableToolbar search={{ value: search, onChange: setSearch, placeholder: 'Search here' }} />

            <DataTable<ContractRow>
              rows={paged}
              loading={loading}
              rowKey={(row) => row.id}
              empty="Tidak ada kontrak yang akan berakhir."
              columns={[
                {
                  key: 'employee',
                  header: 'Employee',
                  render: (row) => (
                    <CellIdentity
                      name={
                        <Link to="/me/profile" className="text-fg-link hover:underline">
                          {row.employee}
                        </Link>
                      }
                      sub={row.employeeId}
                      leading={<Avatar name={row.employee} size="sm" />}
                    />
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  nowrap: true,
                  render: (row) => <StatusBadge tone={toneForStatus(row.status)}>{row.status}</StatusBadge>,
                },
                { key: 'endDate', header: 'End Date', muted: true, nowrap: true, render: (row) => formatDate(row.endDate) },
                { key: 'duration', header: 'Duration', muted: true, nowrap: true, render: (row) => row.duration },
              ]}
              actions={() => <RowButton>View Detail</RowButton>}
            />

            <Pagination
              page={page}
              pageSize={pageSize}
              total={filtered.length}
              noun="contracts"
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </>
        ) : (
          <EmptyState
            title={tab === 'announcement' ? 'Belum ada pengumuman' : 'Belum ada tugas'}
            description={
              tab === 'announcement'
                ? 'Pengumuman perusahaan akan tampil di sini setelah dipublikasikan.'
                : 'Tugas yang ditugaskan kepada Anda akan tampil di sini.'
            }
          />
        )}
      </div>
    </section>
  );
}
