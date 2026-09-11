import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info, TriangleAlert, Users } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RowActions, RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import {
  LoanStatusBadge,
  Money,
  ReservationCell,
  RoomCards,
} from '@/features/loan/components/LoanBits';
import { LoanFormModal } from '@/features/loan/components/LoanFormModal';
import {
  LoanDecisionModal,
  LoanExitModal,
  LoanRejectModal,
} from '@/features/loan/components/LoanDecisionModals';
import { LoanAckModal, LoanStatusReferenceModal } from '@/features/loan/components/LoanAckModal';
import {
  useLoanConfig,
  useLoanExposure,
  useLoans,
} from '@/features/loan/hooks/useLoan';
import { MAX_ACTIVE, ME, MGR, employeeOf, gradeName } from '@/features/loan/mock-data';
import { activeLoans, approvalQueue, offerTotal, roomOf } from '@/features/loan/rules';
import {
  EMPTY_LOAN_FILTER,
  countActive,
  summarizeLoanFilter,
  toggleStatus,
} from '@/features/loan/loanFilters';
import { LOAN_STATUS_LABEL, SCHEDULE_SOURCE_LABEL } from '@/features/loan/types';
import type { Loan, LoanStatus } from '@/features/loan/types';
import type { LoanFilterState } from '@/features/loan/loanFilters';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from '@/store/ui.store';

type Tab = 'request' | 'approval' | 'ack' | 'admin';

/**
 * Finance › Loan — port `_prototype/finance-loan.html` (FSD/UIC-001-FINANCE FT3).
 *
 * Empat muka untuk empat peran: karyawan mengirim pokok + tenor, atasan
 * langsung meneruskan keputusan (202), karyawan mengakui jadwal yang dikirim
 * pihak pemberi dana, dan back office memantau semuanya — termasuk baris yang
 * tertahan menunggu pihak luar itu.
 */
export function LoanPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('request');

  const [filter, setFilter] = useState<LoanFilterState>(EMPTY_LOAN_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [deciding, setDeciding] = useState<Loan | null>(null);
  const [rejecting, setRejecting] = useState<Loan | null>(null);
  const [acking, setAcking] = useState<Loan | null>(null);
  const [exiting, setExiting] = useState<{ loan: Loan; mode: 'cancel' | 'withdraw' } | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const { data: config } = useLoanConfig();
  const { data: exposure } = useLoanExposure();
  const { data: loans = [], isLoading } = useLoans();

  const adminRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return loans.filter((row) => {
      if (filter.statuses.length && !filter.statuses.includes(row.status)) return false;
      if (query && !row.requestNo.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [loans, filter, search]);

  const mine = useMemo(() => loans.filter((row) => row.employeeId === ME), [loans]);
  const ackRows = useMemo(
    () => mine.filter((row) => row.status === 'AWAITING_ACKNOWLEDGEMENT'),
    [mine],
  );
  const queue = useMemo(() => approvalQueue(loans, MGR), [loans]);

  const pagedMine = usePagedRows(mine);
  const pagedQueue = usePagedRows(queue);
  const pagedAdmin = usePagedRows(adminRows);

  const room = exposure ? roomOf(exposure) : 0;
  const running = activeLoans(loans, ME).length;

  const openForm = () => {
    if (!config?.enabled) {
      toast('403 FIN_MODULE_DISABLED — modul pinjaman dimatikan untuk company ini.', 'danger');
      return;
    }
    if (running >= MAX_ACTIVE) {
      toast(
        `422 FIN_ACTIVE_LOAN_COUNT_EXCEEDED — ${running} dari ${MAX_ACTIVE} pinjaman aktif yang diizinkan sudah berjalan.`,
        'danger',
      );
      return;
    }
    setFormOpen(true);
  };

  const openDetail = (loan: Loan) => navigate(`/finance/loan/detail?id=${loan.id}`);

  const mineActions = (row: Loan) => {
    const actions = [{ label: 'View Detail', onSelect: () => openDetail(row) }];
    if (row.status === 'AWAITING_ACKNOWLEDGEMENT') {
      actions.unshift({ label: 'Acknowledge', onSelect: () => setAcking(row) });
    }
    if (row.status === 'SUBMITTED') {
      actions.push({
        label: 'Cancel',
        danger: true,
        onSelect: () => setExiting({ loan: row, mode: 'cancel' }),
      } as (typeof actions)[number]);
    }
    if (row.status === 'AWAITING_CALCULATION') {
      actions.push({
        label: 'Withdraw',
        danger: true,
        onSelect: () => setExiting({ loan: row, mode: 'withdraw' }),
      } as (typeof actions)[number]);
    }
    return actions.length > 1 ? (
      <RowActions actions={actions} />
    ) : (
      <RowButton onClick={() => openDetail(row)}>View Detail</RowButton>
    );
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Finance' }, { label: 'Loan' }]}
        title="Loan"
        description="Empat layar melayani empat peran: karyawan mengirim pokok + tenor, atasan langsung meneruskan keputusan, karyawan mengakui jadwal yang dikirim pihak pemberi dana, dan back office memantau setiap permintaan — termasuk yang tertahan menunggu pihak luar itu."
        actions={tab === 'request' ? <Button onClick={openForm}>New loan request</Button> : undefined}
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'request', label: 'Loan Request', count: mine.length },
              { value: 'approval', label: 'Loan Approval', count: queue.length },
              { value: 'ack', label: 'Schedule Acknowledgement', count: ackRows.length },
              { value: 'admin', label: 'Loan Administration', count: loans.length },
            ]}
          />

          {tab === 'request' && (
            <>
              {exposure && (
                <RoomCards
                  items={[
                    {
                      label: 'Available borrowing room',
                      value: formatCurrency(room),
                      foot: 'Limit grade − berjalan − ditahan. Pengecualian per karyawan, bila ada, menggantikan baris grade.',
                      hero: true,
                    },
                    {
                      label: 'Grade limit',
                      value: formatCurrency(exposure.limitAmount),
                      foot: `${gradeName(exposure.jobGradeId)} — tanpa pengecualian per karyawan yang aktif.`,
                    },
                    {
                      label: 'Outstanding',
                      value: formatCurrency(exposure.outstandingAmount),
                      foot: 'Kewajiban berjalan di seluruh pinjaman aktif.',
                    },
                    {
                      label: 'Reserved',
                      value: formatCurrency(exposure.reservedAmount),
                      foot: 'Ditahan permintaan yang masih menunggu hasil.',
                    },
                  ]}
                />
              )}

              {config && (
                <Note icon={<Info />}>
                  Skema company ini: <strong>interest-bearing</strong> · mode tenor <code>{config.tenorMode}</code>{' '}
                  dengan pola <code>{config.tenorChoicePattern}</code> (3, 6, 9 … {config.tenorMax}). Tenor selalu
                  dikirim klien; bunga <strong>tidak pernah dihitung HRIS</strong> pada company berbunga — ia datang
                  dari pihak pemberi dana.
                </Note>
              )}

              <Card>
                <CardHead title="My requests" sub="emp_loan — baris milik Anda sendiri" />

                <div className="flex flex-col">
                  <DataTable<Loan>
                    rows={pagedMine.rows}
                    rowKey={(row) => row.id}
                    loading={isLoading}
                    empty="No loan request yet."
                    columns={[
                      {
                        key: 'no',
                        header: 'Request No.',
                        strong: true,
                        nowrap: true,
                        render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                      },
                      {
                        key: 'principal',
                        header: 'Principal',
                        align: 'right',
                        render: (row) => <Money value={row.principalAmount} />,
                      },
                      { key: 'tenor', header: 'Tenor', align: 'center', render: (row) => `${row.tenorMonths} mo` },
                      {
                        key: 'interest',
                        header: 'Interest',
                        align: 'right',
                        render: (row) => <Money value={row.interestAmount} muted />,
                      },
                      {
                        key: 'total',
                        header: 'Total Obligation',
                        align: 'right',
                        render: (row) => <Money value={row.totalObligation} />,
                      },
                      { key: 'status', header: 'Status', render: (row) => <LoanStatusBadge status={row.status} /> },
                      {
                        key: 'submitted',
                        header: 'Submitted',
                        muted: true,
                        nowrap: true,
                        render: (row) => formatDate(row.submittedAt),
                      },
                    ]}
                    actions={mineActions}
                  />

                  <Pagination
                    page={pagedMine.page}
                    pageSize={pagedMine.pageSize}
                    total={pagedMine.total}
                    noun="requests"
                    onPageChange={pagedMine.setPage}
                    onPageSizeChange={pagedMine.setPageSize}
                  />
                </div>
              </Card>
            </>
          )}

          {tab === 'approval' && (
            <Card>
              <CardHead title="Approval queue" sub="Antrean atasan langsung — disaring ke SUBMITTED saja" />

              <Note icon={<Users />}>
                Antrean <strong>atasan langsung</strong> — layarnya sendiri, berisi permintaan yang menunggu keputusan
                Anda. Keputusan diambil dengan token principal Anda sendiri; token service ditolak 403. Back office
                tidak pernah memegang pintu ini.
              </Note>

              <div className="flex flex-col">
                <DataTable<Loan>
                  rows={pagedQueue.rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="Nothing awaiting your decision."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                    },
                    {
                      key: 'employee',
                      header: 'Employee',
                      render: (row) => {
                        const employee = employeeOf(row.employeeId);
                        return (
                          <CellIdentity
                            name={employee?.name ?? '—'}
                            sub={employee ? `${employee.unit} · ${gradeName(employee.gradeId)}` : undefined}
                            leading={<Avatar name={employee?.name ?? '?'} size="sm" />}
                          />
                        );
                      },
                    },
                    {
                      key: 'principal',
                      header: 'Principal',
                      align: 'right',
                      render: (row) => <Money value={row.principalAmount} />,
                    },
                    { key: 'tenor', header: 'Tenor', align: 'center', render: (row) => `${row.tenorMonths} mo` },
                    {
                      key: 'reservation',
                      header: 'Reservation',
                      align: 'right',
                      render: (row) => <ReservationCell amount={row.principalAmount} status={row.status} />,
                    },
                    { key: 'status', header: 'Status', render: (row) => <LoanStatusBadge status={row.status} /> },
                    {
                      key: 'submitted',
                      header: 'Submitted',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.submittedAt),
                    },
                  ]}
                  actions={(row) => <RowButton onClick={() => setDeciding(row)}>Review</RowButton>}
                />

                <Pagination
                  page={pagedQueue.page}
                  pageSize={pagedQueue.pageSize}
                  total={pagedQueue.total}
                  noun="requests"
                  onPageChange={pagedQueue.setPage}
                  onPageSizeChange={pagedQueue.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'ack' && (
            <Card>
              <CardHead
                title="Schedule acknowledgement"
                sub="Satu endpoint, dua hasil — ACK menyetujui pinjaman, DECLINE melepas reservasinya"
              />

              <Note tone="warn" icon={<TriangleAlert />}>
                Pengakuan diberikan <strong>di dalam aplikasi setelah login penuh</strong> — tidak pernah dari tautan di
                notifikasi. Setiap panggilan menambah baris baru; DECLINE melepas reservasi dan Anda boleh mengajukan
                permintaan baru.
              </Note>

              {ackRows.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {ackRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-col gap-3 rounded-lg border border-border-1 bg-bg-surface px-4 py-3.5 shadow-card-sm"
                    >
                      <span className="font-body text-[11px] font-bold uppercase tracking-[0.05em] text-fg-3">
                        {row.requestNo} · jadwal diterima dari pihak pemberi dana
                      </span>
                      <KeyValueList>
                        <KeyValueRow label="Principal">
                          {formatCurrency(row.acknowledgementOffer?.acknowledgedPrincipal ?? 0)}
                        </KeyValueRow>
                        <KeyValueRow label="Interest">
                          {formatCurrency(row.acknowledgementOffer?.acknowledgedInterest ?? 0)}
                        </KeyValueRow>
                        <KeyValueRow label="Tenor">
                          {row.acknowledgementOffer?.acknowledgedTenor ?? 0} months
                        </KeyValueRow>
                        <KeyValueRow label="Total obligation">{formatCurrency(offerTotal(row) ?? 0)}</KeyValueRow>
                      </KeyValueList>
                      <div>
                        <Button variant="secondary" onClick={() => setAcking(row)}>
                          Review &amp; acknowledge
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Nothing to acknowledge"
                  description="Baris muncul di sini hanya selagi sebuah permintaan duduk di AWAITING_ACKNOWLEDGEMENT — yaitu, pada company berbunga setelah pihak pemberi dana mengembalikan pokok, bunga dan tenor."
                />
              )}
            </Card>
          )}

          {tab === 'admin' && (
            <Card>
              <CardHead
                title="Loan administration"
                sub="Seluruh company — baca saja"
                action={
                  <Button variant="secondary" onClick={() => setLegendOpen(true)}>
                    Status reference
                  </Button>
                }
              />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                      {countActive(filter) > 0 ? `Filter (${countActive(filter)})` : 'Filter'}
                    </Button>
                  }
                  summary={summarizeLoanFilter(filter)}
                  search={{
                    value: search,
                    onChange: (value) => {
                      setSearch(value);
                      pagedAdmin.resetPage();
                    },
                    placeholder: 'Search request no.',
                  }}
                />

                <DataTable<Loan>
                  rows={pagedAdmin.rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="No loan matches the current filter."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                    },
                    {
                      key: 'employee',
                      header: 'Employee',
                      render: (row) => {
                        const employee = employeeOf(row.employeeId);
                        return (
                          <CellIdentity
                            name={employee?.name ?? '—'}
                            sub={employee ? gradeName(employee.gradeId) : undefined}
                            leading={<Avatar name={employee?.name ?? '?'} size="sm" />}
                          />
                        );
                      },
                    },
                    {
                      key: 'principal',
                      header: 'Principal',
                      align: 'right',
                      render: (row) => <Money value={row.principalAmount} />,
                    },
                    { key: 'tenor', header: 'Tenor', align: 'center', render: (row) => `${row.tenorMonths} mo` },
                    {
                      key: 'interest',
                      header: 'Interest',
                      align: 'right',
                      render: (row) => <Money value={row.interestAmount} muted />,
                    },
                    {
                      key: 'total',
                      header: 'Total Obligation',
                      align: 'right',
                      render: (row) => <Money value={row.totalObligation} />,
                    },
                    {
                      key: 'reservation',
                      header: 'Reservation',
                      align: 'right',
                      render: (row) => <ReservationCell amount={row.principalAmount} status={row.status} />,
                    },
                    { key: 'status', header: 'Status', render: (row) => <LoanStatusBadge status={row.status} /> },
                    {
                      key: 'source',
                      header: 'Schedule Source',
                      muted: true,
                      nowrap: true,
                      render: (row) => (row.scheduleSource ? SCHEDULE_SOURCE_LABEL[row.scheduleSource] : '—'),
                    },
                  ]}
                  actions={(row) => <RowButton onClick={() => openDetail(row)}>View Detail</RowButton>}
                />

                <Pagination
                  page={pagedAdmin.page}
                  pageSize={pagedAdmin.pageSize}
                  total={pagedAdmin.total}
                  noun="loans"
                  onPageChange={pagedAdmin.setPage}
                  onPageSizeChange={pagedAdmin.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      {config && exposure && (
        <LoanFormModal open={formOpen} config={config} exposure={exposure} onClose={() => setFormOpen(false)} />
      )}

      <LoanDecisionModal
        loan={deciding}
        onClose={() => setDeciding(null)}
        onReject={(loan) => {
          setDeciding(null);
          setRejecting(loan);
        }}
      />

      <LoanRejectModal
        loan={rejecting}
        onClose={() => setRejecting(null)}
        onBack={(loan) => {
          setRejecting(null);
          setDeciding(loan);
        }}
      />

      <LoanAckModal loan={acking} onClose={() => setAcking(null)} />

      <LoanExitModal loan={exiting?.loan ?? null} mode={exiting?.mode ?? 'cancel'} onClose={() => setExiting(null)} />

      <LoanStatusReferenceModal open={legendOpen} onClose={() => setLegendOpen(false)} />

      <FilterModal
        open={filterOpen}
        title="Filter loans"
        description="Status dikirim sebagai daftar IN — beberapa status boleh dipilih sekaligus."
        onOpenChange={setFilterOpen}
        onReset={() => setFilter(EMPTY_LOAN_FILTER)}
      >
        <div className="flex flex-col gap-2.5">
          {(Object.keys(LOAN_STATUS_LABEL) as LoanStatus[]).map((status) => (
            <label key={status} className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={filter.statuses.includes(status)}
                onCheckedChange={() => {
                  setFilter((prev) => toggleStatus(prev, status));
                  pagedAdmin.resetPage();
                }}
              />
              <span className="font-body text-[13px] font-medium text-fg-2">{LOAN_STATUS_LABEL[status]}</span>
            </label>
          ))}
        </div>
      </FilterModal>
    </>
  );
}


