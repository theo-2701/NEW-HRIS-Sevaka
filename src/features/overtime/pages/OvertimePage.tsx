import { useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import {
  OvertimeApproveModal,
  OvertimeDetailModal,
  OvertimeFormModal,
  OvertimeRejectModal,
  OvertimeWithdrawModal,
} from '@/features/overtime/components/OvertimeModals';
import { DailyFilterFields, RequestFilterFields } from '@/features/overtime/components/OvertimeFilters';
import {
  EMPTY_DAILY_FILTER,
  EMPTY_REQUEST_FILTER,
  countActive,
  summarizeDailyFilter,
  summarizeRequestFilter,
  type DailyFilterState,
  type RequestFilterState,
} from '@/features/overtime/overtimeFilters';
import { useOvertimeDaily, useOvertimeRequests } from '@/features/overtime/hooks/useOvertime';
import { VIEWERS, employeeName } from '@/features/overtime/mock-data';
import {
  EXTRA_REASON_LABEL,
  OVERTIME_CATEGORY_LABEL,
  OVERTIME_STATUS_LABEL,
  SUBMISSION_MODE_LABEL,
  canFileOvertime,
  isOvertimeApprover,
} from '@/features/overtime/types';
import type { OvertimeDaily, OvertimeRequest, OvertimeSession } from '@/features/overtime/types';
import { formatDate, formatNumber } from '@/lib/format';

type Tab = 'requests' | 'daily';

/** Angka jam — kosong berarti tidak ada, bukan nol. */
function Hours({ value, strong }: { value: number | null; strong?: boolean }) {
  if (value === null) return <span className="font-body text-[13px] font-medium text-fg-4">—</span>;
  return (
    <span className={`font-body text-[13px] tabular-nums text-fg-1 ${strong ? 'font-bold' : 'font-semibold'}`}>
      {formatNumber(value)}
    </span>
  );
}

function statusTone(row: OvertimeRequest) {
  if (row.overtimeStatus === 'APPROVED' || row.overtimeStatus === 'AUTO_APPROVED') return 'ok' as const;
  if (row.overtimeStatus === 'PENDING_APPROVAL') return 'warn' as const;
  if (row.overtimeStatus === 'REJECTED') return 'err' as const;
  return 'mute' as const;
}

/**
 * Time › Overtime — port `_prototype/time-overtime.html`
 * (FSD-001-TIME §7 · UIC-001-TIME §8).
 *
 * Tiga kewenangan berbeda hidup di satu layar: mengajukan hanya milik EMPLOYEE,
 * memutuskan hanya milik HR_MANAGER · DEPT_MANAGER, dan membaca lintas-karyawan
 * milik setiap peran non-ESS. Mode, kategori, dan pemicu lapis approval
 * diturunkan server — layar hanya mempratinjaunya.
 *
 * Ringkasan Harian nol tombol tulis: barisnya hanya lahir dari recompute atas
 * data punch, dan `payable_hours` adalah MIN(aktual, pagu yang disetujui).
 */
export function OvertimePage() {
  const [session, setSession] = useState<OvertimeSession>(VIEWERS[0]);
  const [tab, setTab] = useState<Tab>('requests');

  const [requestFilter, setRequestFilter] = useState<RequestFilterState>(EMPTY_REQUEST_FILTER);
  const [dailyFilter, setDailyFilter] = useState<DailyFilterState>(EMPTY_DAILY_FILTER);
  const [requestFilterOpen, setRequestFilterOpen] = useState(false);
  const [dailyFilterOpen, setDailyFilterOpen] = useState(false);
  const [requestSearch, setRequestSearch] = useState('');
  const [dailySearch, setDailySearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<OvertimeRequest | null>(null);
  const [detail, setDetail] = useState<OvertimeRequest | null>(null);
  const [approving, setApproving] = useState<OvertimeRequest | null>(null);
  const [rejecting, setRejecting] = useState<OvertimeRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState<OvertimeRequest | null>(null);

  const requestQuery = useMemo(
    () => ({
      overtimeStatus: requestFilter.overtimeStatus === 'ALL' ? undefined : requestFilter.overtimeStatus,
      submissionMode: requestFilter.submissionMode === 'ALL' ? undefined : requestFilter.submissionMode,
      overtimeCategory: requestFilter.overtimeCategory === 'ALL' ? undefined : requestFilter.overtimeCategory,
      from: requestFilter.from || undefined,
      to: requestFilter.to || undefined,
      employeeName: requestSearch.trim() || undefined,
    }),
    [requestFilter, requestSearch],
  );

  const dailyQuery = useMemo(
    () => ({
      overtimeCategory: dailyFilter.overtimeCategory === 'ALL' ? undefined : dailyFilter.overtimeCategory,
      from: dailyFilter.from || undefined,
      to: dailyFilter.to || undefined,
      employeeName: dailySearch.trim() || undefined,
    }),
    [dailyFilter, dailySearch],
  );

  const { data: requests = [], isLoading: requestsLoading } = useOvertimeRequests(session, requestQuery);
  const { data: daily = [], isLoading: dailyLoading } = useOvertimeDaily(session, dailyQuery);
  const { data: allRequests = [] } = useOvertimeRequests(session, {});

  const pagedRequests = usePagedRows(requests);
  const pagedDaily = usePagedRows(daily);

  const approver = isOvertimeApprover(session);
  const filer = canFileOvertime(session);

  const openForm = (row: OvertimeRequest | null) => {
    setEditing(row);
    setFormOpen(true);
  };

  const rowActions = (row: OvertimeRequest) => {
    // Baris yang lahir dari deteksi kehadiran on-call tidak punya permukaan tulis
    // di mana pun (K40) — hanya jalur baca.
    if (row.isAuto) {
      return (
        <div className="flex items-center gap-2">
          <span className="font-body text-xs font-medium text-fg-4">Automatic</span>
          <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>
        </div>
      );
    }

    const actions = [];
    if (row.overtimeStatus === 'PENDING_APPROVAL') {
      if (row.employeeId === session.employeeId && filer) {
        actions.push({ label: 'Edit', onSelect: () => openForm(row) });
        actions.push({ label: 'Withdraw', danger: true, onSelect: () => setWithdrawing(row) });
      } else if (approver) {
        actions.push({ label: 'Approve', onSelect: () => setApproving(row) });
        actions.push({ label: 'Reject', danger: true, onSelect: () => setRejecting(row) });
      }
    }
    if (!actions.length) return <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>;
    return <RowActions actions={[...actions, { label: 'View Detail', onSelect: () => setDetail(row) }]} />;
  };

  const filterButton = (active: number, onClick: () => void) => (
    <Button variant="secondary" onClick={onClick}>
      {active > 0 ? `Filter (${active})` : 'Filter'}
    </Button>
  );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Overtime' }]}
        title="Overtime"
        description="Mode pengajuan, kategori, dan pemicu lapis approval tidak pernah dikirim layar ini — ketiganya dihitung server. Pemicu lapis menaikkan sebuah pengajuan ke lapis berikutnya; ia bukan penolakan. Ringkasan harian adalah fakta mesin: jam terbayar selalu yang lebih kecil antara aktual dan pagu yang disetujui."
        actions={filer ? <Button onClick={() => openForm(null)}>Request overtime</Button> : undefined}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
            <Select
              value={session.employeeId}
              onValueChange={(value) => {
                const next = VIEWERS.find((row) => row.employeeId === value);
                if (next) {
                  setSession(next);
                  pagedRequests.resetPage();
                  pagedDaily.resetPage();
                }
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWERS.map((viewer) => (
                  <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                    {employeeName(viewer.employeeId)} — {viewer.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Note icon={<UserRound />}>
            {approver ? (
              <>
                <strong>Approver view ({session.role}).</strong> Seluruh antrean pending terdaftar. Baris milik Anda
                sendiri tidak punya aksi keputusan — pemisahan tugas ditegakkan di server (<code>403</code>), bukan
                sekadar disembunyikan di sini. Tombol mengajukan absen: <code>overtime-request:create</code> adalah
                scope <code>EMPLOYEE</code>, jadi lembur tidak pernah diajukan atas nama siapa pun.
              </>
            ) : session.role === 'HR_STAFF' ? (
              <>
                <strong>Reader view (HR_STAFF).</strong> <code>overtime-request:search</code> membuka seluruh antrean
                lintas karyawan, tetapi <code>overtime-request:approve</code> hanya dipegang <code>HR_MANAGER</code> ·{' '}
                <code>DEPT_MANAGER</code> dan <code>overtime-request:create</code> hanya <code>EMPLOYEE</code> — tidak
                ada permukaan keputusan maupun pengajuan untuk Anda di sini.
              </>
            ) : (
              <>
                <strong>ESS mode.</strong> Layar dan endpoint yang sama — barisnya dipersempit ke{' '}
                <strong>{employeeName(session.employeeId)}</strong> dari klaim identitas, dan tidak ada aksi keputusan
                untuk Anda sama sekali.
              </>
            )}
          </Note>

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'requests', label: 'Requests', count: requests.length },
              { value: 'daily', label: 'Daily Summary', count: daily.length },
            ]}
          />

          {tab === 'requests' && (
            <Card>
              <CardHead title="Overtime requests" sub="emp_overtime_request" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={filterButton(countActive(requestFilter), () => setRequestFilterOpen(true))}
                  summary={summarizeRequestFilter(requestFilter)}
                  search={{
                    value: requestSearch,
                    onChange: (value) => {
                      setRequestSearch(value);
                      pagedRequests.resetPage();
                    },
                    placeholder: 'Search employee name',
                  }}
                />

                <DataTable<OvertimeRequest>
                  rows={pagedRequests.rows}
                  rowKey={(row) => row.id}
                  loading={requestsLoading}
                  empty="No overtime request matches these filters."
                  columns={[
                    {
                      key: 'date',
                      header: 'Overtime Date',
                      strong: true,
                      nowrap: true,
                      render: (row) => (
                        <span className="inline-flex items-center gap-2">
                          {formatDate(row.overtimeDate)}
                          {row.submissionMode === 'RETROACTIVE' && <TmFlag>Retroactive</TmFlag>}
                        </span>
                      ),
                    },
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
                      key: 'mode',
                      header: 'Mode',
                      render: (row) => (
                        <StatusBadge tone={row.submissionMode === 'RETROACTIVE' ? 'warn' : 'info'}>
                          {SUBMISSION_MODE_LABEL[row.submissionMode]}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'category',
                      header: 'Category',
                      render: (row) => (
                        <StatusBadge tone="mute">{OVERTIME_CATEGORY_LABEL[row.overtimeCategory]}</StatusBadge>
                      ),
                    },
                    {
                      key: 'requested',
                      header: 'Hours Requested',
                      align: 'right',
                      render: (row) => <Hours value={row.requestedHours} />,
                    },
                    {
                      key: 'approved',
                      header: 'Hours Approved',
                      align: 'right',
                      render: (row) => <Hours value={row.approvedHours} />,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <StatusBadge tone={statusTone(row)}>{OVERTIME_STATUS_LABEL[row.overtimeStatus]}</StatusBadge>
                      ),
                    },
                    {
                      key: 'trigger',
                      header: 'Approval Layer',
                      muted: true,
                      render: (row) =>
                        row.requiresExtraApprovalReason
                          ? EXTRA_REASON_LABEL[row.requiresExtraApprovalReason]
                          : '—',
                    },
                  ]}
                  actions={rowActions}
                />

                <Pagination
                  page={pagedRequests.page}
                  pageSize={pagedRequests.pageSize}
                  total={pagedRequests.total}
                  noun="requests"
                  onPageChange={pagedRequests.setPage}
                  onPageSizeChange={pagedRequests.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'daily' && (
            <Card>
              <CardHead title="Daily summary" sub="emp_overtime_daily — fakta mesin, nol endpoint tulis" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={filterButton(countActive(dailyFilter), () => setDailyFilterOpen(true))}
                  summary={summarizeDailyFilter(dailyFilter)}
                  search={{
                    value: dailySearch,
                    onChange: (value) => {
                      setDailySearch(value);
                      pagedDaily.resetPage();
                    },
                    placeholder: 'Search employee name',
                  }}
                />

                <DataTable<OvertimeDaily>
                  rows={pagedDaily.rows}
                  rowKey={(row) => row.id}
                  loading={dailyLoading}
                  empty="No daily overtime fact recorded yet. A row is only born by recomputation — punch data on a date that carries an approved request."
                  columns={[
                    {
                      key: 'date',
                      header: 'Date',
                      strong: true,
                      nowrap: true,
                      render: (row) => formatDate(row.overtimeDate),
                    },
                    { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                    {
                      key: 'actual',
                      header: 'Actual Hours',
                      align: 'right',
                      render: (row) => <Hours value={row.actualHours} />,
                    },
                    {
                      key: 'ceiling',
                      header: 'Approved Ceiling',
                      align: 'right',
                      render: (row) => <Hours value={row.approvedHoursTotal} />,
                    },
                    {
                      key: 'payable',
                      header: 'Payable Hours',
                      align: 'right',
                      render: (row) => <Hours value={row.payableHours} strong />,
                    },
                    {
                      key: 'category',
                      header: 'Category',
                      render: (row) => (
                        <StatusBadge tone="mute">{OVERTIME_CATEGORY_LABEL[row.overtimeCategory]}</StatusBadge>
                      ),
                    },
                    {
                      key: 'provenance',
                      header: 'Request',
                      muted: true,
                      render: (row) => row.overtimeRequestId ?? '—',
                    },
                  ]}
                />

                <Pagination
                  page={pagedDaily.page}
                  pageSize={pagedDaily.pageSize}
                  total={pagedDaily.total}
                  noun="days"
                  onPageChange={pagedDaily.setPage}
                  onPageSizeChange={pagedDaily.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <FilterModal
        open={requestFilterOpen}
        title="Filter requests"
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setRequestFilterOpen}
        onReset={() => {
          setRequestFilter(EMPTY_REQUEST_FILTER);
          pagedRequests.resetPage();
        }}
      >
        <RequestFilterFields
          value={requestFilter}
          onChange={(next) => {
            setRequestFilter(next);
            pagedRequests.resetPage();
          }}
        />
      </FilterModal>

      <FilterModal
        open={dailyFilterOpen}
        title="Filter daily summary"
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setDailyFilterOpen}
        onReset={() => {
          setDailyFilter(EMPTY_DAILY_FILTER);
          pagedDaily.resetPage();
        }}
      >
        <DailyFilterFields
          value={dailyFilter}
          onChange={(next) => {
            setDailyFilter(next);
            pagedDaily.resetPage();
          }}
        />
      </FilterModal>

      <OvertimeFormModal
        open={formOpen}
        session={session}
        rows={allRequests}
        editing={editing}
        onClose={() => setFormOpen(false)}
      />
      <OvertimeApproveModal row={approving} session={session} onClose={() => setApproving(null)} />
      <OvertimeRejectModal row={rejecting} session={session} onClose={() => setRejecting(null)} />
      <OvertimeDetailModal row={detail} onClose={() => setDetail(null)} />
      <OvertimeWithdrawModal row={withdrawing} session={session} onClose={() => setWithdrawing(null)} />
    </>
  );
}
