import { useMemo, useState } from 'react';
import { Info, Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { ActivityFilterFields } from '@/features/oncall/components/OncallFilters';
import {
  EMPTY_ACTIVITY_FILTER,
  countActive,
  summarizeActivityFilter,
  type ActivityFilterState,
} from '@/features/oncall/oncallFilters';
import { useOncallActivity, useOncallAssignments } from '@/features/oncall/hooks/useOncall';
import { employeeName } from '@/features/oncall/mock-data';
import { windowLabel } from '@/features/oncall/rules';
import { OVERTIME_CATEGORY_LABEL, OVERTIME_STATUS_LABEL } from '@/features/overtime/types';
import type { OvertimeRequest } from '@/features/overtime/types';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';

/**
 * Time › On Call Activity — port `_prototype/time-oncall-activity.html`
 * (FSD-001-TIME §11 · UIC-001-TIME §12).
 *
 * Bacaan tersaring atas baris lembur yang sama dengan menu Overtime — hanya
 * yang lahir otomatis dari kehadiran di dalam jendela siaga yang disetujui.
 * Layar terminal: nol tambah manual, dan pintu keputusannya tetap satu di menu
 * Overtime, tidak diduplikasi di sini.
 */
export function OncallActivityPage() {
  const [filter, setFilter] = useState<ActivityFilterState>(EMPTY_ACTIVITY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');

  const query = useMemo(
    () => ({
      oncallAssignmentId: filter.oncallAssignmentId === 'ALL' ? undefined : filter.oncallAssignmentId,
      overtimeStatus: filter.overtimeStatus === 'ALL' ? undefined : filter.overtimeStatus,
      overtimeCategory: filter.overtimeCategory === 'ALL' ? undefined : filter.overtimeCategory,
      from: filter.from || undefined,
      to: filter.to || undefined,
      employeeName: search.trim() || undefined,
    }),
    [filter, search],
  );

  const { data: rows = [], isLoading } = useOncallActivity(query);
  const { data: windows = [] } = useOncallAssignments({});
  const paged = usePagedRows(rows);

  const labelOf = (id: string) => {
    const row = windows.find((item) => item.id === id);
    return row ? `${employeeName(row.employeeId)} · ${formatDateTime(row.standbyStartAt)}` : id;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'On Call' }, { label: 'On Call Activity' }]}
        title="On Call Activity"
        description="Bacaan tersaring atas baris lembur yang sama dengan menu Overtime — hanya yang lahir otomatis dari kehadiran yang jatuh di dalam jendela siaga yang disetujui. Layar terminal: tidak ada apa pun di sini yang menuntun ke tempat lain."
      >
        <div className="flex flex-col gap-5">
          <Note icon={<Lock />}>
            Baca-saja, tanpa tambah manual di mana pun. Call-out yang benar-benar terjadi dicatat otomatis dari
            kehadiran — tidak pernah diketik siapa pun. Menyetujui atau menolak call-out juga tidak diduplikasi di
            sini: permukaan itu tetap satu pintu di menu Overtime.
          </Note>

          <Card>
            <CardHead title="Call-outs" sub="Lembur otomatis yang terbit dari jendela siaga" />

            <div className="flex flex-col">
              <TableToolbar
                filters={
                  <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                    {countActive(filter) > 0 ? `Filter (${countActive(filter)})` : 'Filter'}
                  </Button>
                }
                summary={summarizeActivityFilter(filter, labelOf)}
                search={{
                  value: search,
                  onChange: (value) => {
                    setSearch(value);
                    paged.resetPage();
                  },
                  placeholder: 'Search employee name',
                }}
              />

              <DataTable<OvertimeRequest>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty="Belum ada call-out yang terbit dari jendela siaga mana pun. Jendela tanpa call-out memang tidak punya baris di sini."
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) => (
                      <CellIdentity
                        name={employeeName(row.employeeId)}
                        leading={<Avatar name={employeeName(row.employeeId)} size="sm" />}
                      />
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Overtime Date',
                    strong: true,
                    nowrap: true,
                    render: (row) => formatDate(row.overtimeDate),
                  },
                  {
                    key: 'category',
                    header: 'Category',
                    render: (row) => (
                      <StatusBadge tone="mute">{OVERTIME_CATEGORY_LABEL[row.overtimeCategory]}</StatusBadge>
                    ),
                  },
                  {
                    key: 'window',
                    header: 'Standby Window',
                    muted: true,
                    nowrap: true,
                    render: (row) => {
                      const found = windows.find((item) => item.id === row.oncallAssignmentId);
                      return found ? windowLabel(found) : '—';
                    },
                  },
                  {
                    key: 'requested',
                    header: 'Requested',
                    align: 'right',
                    // Sisi permintaan selalu kosong: baris ini lahir otomatis dan
                    // tidak pernah melewati pengajuan jam tertulis.
                    render: () => <span className="font-body text-[13px] font-medium text-fg-4">—</span>,
                  },
                  {
                    key: 'approved',
                    header: 'Approved',
                    align: 'right',
                    render: (row) => (
                      <span className="font-body text-[13px] font-semibold tabular-nums text-fg-1">
                        {formatNumber(row.approvedHours ?? 0)}
                      </span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <StatusBadge tone="ok">{OVERTIME_STATUS_LABEL[row.overtimeStatus]}</StatusBadge>,
                  },
                  {
                    key: 'recorded',
                    header: 'Recorded',
                    muted: true,
                    nowrap: true,
                    render: (row) => formatDateTime(row.submittedAt),
                  },
                ]}
              />

              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="call-outs"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>

          <Note icon={<Info />}>
            Jendela yang tidak pernah menerbitkan call-out sekadar tidak punya baris di sini — bukan baris kosong.
            Sisi <strong>Requested</strong> selalu kosong: baris ini lahir otomatis dan tidak pernah melewati
            pengajuan jam tertulis. Sisi <strong>Approved</strong> adalah salinan pagu jendelanya, dan mengalir ke
            ringkasan harian lembur yang sama dengan pengajuan manusia.
          </Note>
        </div>
      </PageShell>

      <FilterModal
        open={filterOpen}
        title="Filter call-outs"
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setFilterOpen}
        onReset={() => {
          setFilter(EMPTY_ACTIVITY_FILTER);
          paged.resetPage();
        }}
      >
        <ActivityFilterFields
          value={filter}
          windows={windows}
          onChange={(next) => {
            setFilter(next);
            paged.resetPage();
          }}
        />
      </FilterModal>
    </>
  );
}
