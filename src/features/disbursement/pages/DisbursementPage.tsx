import { useMemo, useState } from 'react';
import { Info, ShieldAlert, TriangleAlert } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { DatePicker } from '@/components/DatePicker';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RowActions, RowButton } from '@/components/RowActions';
import type { RowAction } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { Money } from '@/features/cash-advance/components/CashAdvanceBits';
import {
  ClearanceStatusBadge,
  MarkSourceBadge,
  MarkStatusBadge,
  PayableTypeBadge,
  PaymentMethodBadge,
} from '@/features/disbursement/components/DisbursementBits';
import {
  ClearanceDetailModal,
  DeclareSettledModal,
  MarkPaidModal,
  PayableDetailModal,
  ReverseMarkModal,
} from '@/features/disbursement/components/DisbursementModals';
import { useClearances, usePayables } from '@/features/disbursement/hooks/useDisbursement';
import { EMPLOYEES, VIEWERS, employeeName, employeeOf } from '@/features/disbursement/mock-data';
import { canDeclareSettled, canMark, canRead, keyOf } from '@/features/disbursement/rules';
import {
  EMPTY_CLEARANCE_FILTER,
  EMPTY_PAYABLE_FILTER,
  summarizeClearanceFilter,
  summarizePayableFilter,
  togglePayableType,
} from '@/features/disbursement/disbursementFilters';
import type { ClearanceFilterState, PayableFilterState } from '@/features/disbursement/disbursementFilters';
import { CLEARANCE_STATUS_LABEL, MARK_STATUS_LABEL, PAYABLE_TYPE_LABEL } from '@/features/disbursement/types';
import type {
  Actor,
  ClearanceFilter,
  ClearanceSortBy,
  ClearanceStatus,
  MarkStatusFilter,
  OutstandingClearance,
  PayableFilter,
  PayableRow,
  PayableSortBy,
  PayableType,
  SortDirection,
} from '@/features/disbursement/types';
import { formatDate } from '@/lib/format';

type Tab = 'disbursement' | 'outstanding';

function toggleSort<K extends string>(prev: { by: K; dir: SortDirection }, key: K) {
  return prev.by === key ? { by: key, dir: prev.dir === 'ASC' ? ('DESC' as const) : ('ASC' as const) } : { by: key, dir: 'DESC' as const };
}

/**
 * Finance › Disbursement & Receivables — port `_prototype/finance-disbursement.html`
 * (FSD §5 · UIC §6.2 · TSD §6.5/§14.5 · ERD §6.8).
 *
 * Daftar Pencairan diturunkan hidup dari Benefit, Loan, dan Cash Advance: klaim
 * atau uang muka yang disetujui di layar modul itu langsung muncul di sini, dan
 * penandaan di sini langsung terbaca di sana. Gerbang peran ditegakkan service
 * (403), pemilih identitas dipakai untuk memainkan aktor uji UIC §1.7.
 */
export function DisbursementPage() {
  const [tab, setTab] = useState<Tab>('disbursement');
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);
  const readable = canRead(actor.role);
  const writable = canMark(actor.role);
  const settler = canDeclareSettled(actor.role);

  const [payableFilter, setPayableFilter] = useState<PayableFilterState>(EMPTY_PAYABLE_FILTER);
  const [payableFilterOpen, setPayableFilterOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [payableSort, setPayableSort] = useState<{ by: PayableSortBy; dir: SortDirection }>({ by: 'created_at', dir: 'DESC' });
  const [picked, setPicked] = useState<string[]>([]);

  const [clearanceFilter, setClearanceFilter] = useState<ClearanceFilterState>(EMPTY_CLEARANCE_FILTER);
  const [clearanceFilterOpen, setClearanceFilterOpen] = useState(false);
  const [clearanceSort, setClearanceSort] = useState<{ by: ClearanceSortBy; dir: SortDirection }>({
    by: 'created_at',
    dir: 'DESC',
  });

  const [detail, setDetail] = useState<PayableRow | null>(null);
  const [marking, setMarking] = useState<PayableRow[] | null>(null);
  const [reversing, setReversing] = useState<PayableRow | null>(null);
  const [clearanceDetail, setClearanceDetail] = useState<OutstandingClearance | null>(null);
  const [settling, setSettling] = useState<OutstandingClearance | null>(null);

  const payableQuery = useMemo<PayableFilter>(
    () => ({
      markStatus: payableFilter.markStatus,
      payableTypes: payableFilter.payableTypes.length ? payableFilter.payableTypes : undefined,
      requestNo: search.trim() || undefined,
      startDate: payableFilter.startDate || undefined,
      endDate: payableFilter.endDate || undefined,
      sortBy: payableSort.by,
      sortDirection: payableSort.dir,
    }),
    [payableFilter, search, payableSort],
  );

  const clearanceQuery = useMemo<ClearanceFilter>(
    () => ({
      status: clearanceFilter.status === 'ALL' ? undefined : clearanceFilter.status,
      employeeId: clearanceFilter.employeeId === 'ALL' ? undefined : clearanceFilter.employeeId,
      startDate: clearanceFilter.startDate || undefined,
      endDate: clearanceFilter.endDate || undefined,
      sortBy: clearanceSort.by,
      sortDirection: clearanceSort.dir,
    }),
    [clearanceFilter, clearanceSort],
  );

  const payables = usePayables(actor, payableQuery, readable);
  const unmarked = usePayables(actor, { markStatus: 'UNMARKED' }, readable);
  const clearances = useClearances(actor, clearanceQuery, readable);
  const outstanding = useClearances(actor, { status: 'OUTSTANDING' }, readable);

  const payableRows = useMemo(() => payables.data ?? [], [payables.data]);
  const pagedPayables = usePagedRows(payableRows);
  const pagedClearances = usePagedRows(clearances.data ?? []);

  const pickedRows = payableRows.filter((row) => row.markStatus === 'UNMARKED' && picked.includes(keyOf(row)));

  const resetPicked = () => {
    setPicked([]);
    pagedPayables.resetPage();
  };

  const payableActions = (row: PayableRow) => {
    const actions: RowAction[] = [];
    if (writable && row.markStatus === 'UNMARKED') actions.push({ label: 'Mark as paid', onSelect: () => setMarking([row]) });
    // Tanda CLIENT_SYSTEM tampil baca saja — tidak diwire dari layar ini (FSD §5.3.1).
    if (writable && row.mark?.markSource === 'MANUAL') {
      actions.push({ label: 'Reverse mark', danger: true, onSelect: () => setReversing(row) });
    }
    actions.push({ label: 'View Detail', onSelect: () => setDetail(row) });
    return actions.length > 1 ? (
      <RowActions actions={actions} />
    ) : (
      <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>
    );
  };

  const clearanceActions = (row: OutstandingClearance) =>
    settler && row.status === 'OUTSTANDING' ? (
      <RowActions
        actions={[
          { label: 'Declare settled', onSelect: () => setSettling(row) },
          { label: 'View Detail', onSelect: () => setClearanceDetail(row) },
        ]}
      />
    ) : (
      <RowButton onClick={() => setClearanceDetail(row)}>View Detail</RowButton>
    );

  const accessGate = (
    <Note tone="danger" icon={<ShieldAlert />}>
      <strong>Tidak ada akses.</strong> Peran Anda tidak memiliki akses ke menu Pencairan & Piutang.
    </Note>
  );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Finance' }, { label: 'Disbursement & Receivables' }]}
        title="Disbursement & Receivables"
        description="Penanda pembayaran atas klaim benefit, pinjaman, dan uang muka. Menu ini mencatat bahwa sesuatu sudah dibayar — bukan instruksi transfer."
        actions={
          <Select
            value={actor.employeeId}
            onValueChange={(value) => {
              const next = VIEWERS.find((row) => row.employeeId === value);
              if (next) {
                setActor(next);
                setPicked([]);
              }
            }}
          >
            <SelectTrigger className="h-10 w-[280px]" aria-label="Viewing as">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEWERS.map((viewer) => (
                <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                  {viewer.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'disbursement', label: 'Disbursement', count: unmarked.data?.length ?? 0 },
              { value: 'outstanding', label: 'Outstanding Clearance', count: outstanding.data?.length ?? 0 },
            ]}
          />

          {tab === 'disbursement' && (
            <Card>
              <CardHead
                title="Payables"
                sub={
                  writable
                    ? 'Satu atau banyak baris, satu tindakan — pilih baris belum ditandai untuk menandai sekaligus'
                    : 'HR Manager membaca saja — tombol penandaan disembunyikan, bukan dinonaktifkan'
                }
              />

              {!readable ? (
                accessGate
              ) : (
                <div className="flex flex-col">
                  <TableToolbar
                    filters={
                      <Button variant="secondary" onClick={() => setPayableFilterOpen(true)}>
                        {summarizePayableFilter(payableFilter)}
                      </Button>
                    }
                    search={{
                      value: search,
                      onChange: (value) => {
                        setSearch(value);
                        resetPicked();
                      },
                      placeholder: 'Search request no.',
                    }}
                    actions={
                      writable && pickedRows.length > 0 ? (
                        <Button onClick={() => setMarking(pickedRows)}>Mark selected as paid ({pickedRows.length})</Button>
                      ) : null
                    }
                  />

                  {payables.error && (
                    <Note tone="danger" icon={<TriangleAlert />}>
                      {payables.error.message}
                    </Note>
                  )}

                  <DataTable<PayableRow>
                    rows={pagedPayables.rows}
                    rowKey={(row) => keyOf(row)}
                    loading={payables.isLoading}
                    empty="No payable matches the current filter."
                    sort={payableSort}
                    onSortChange={(key) => setPayableSort((prev) => toggleSort(prev, key as PayableSortBy))}
                    columns={[
                      {
                        key: 'no',
                        header: 'Request No.',
                        strong: true,
                        nowrap: true,
                        sortKey: 'request_no',
                        render: (row) => (
                          <span className="flex items-center gap-3">
                            {writable && row.markStatus === 'UNMARKED' && (
                              <Checkbox
                                aria-label={`Select ${row.requestNo}`}
                                checked={picked.includes(keyOf(row))}
                                onCheckedChange={() =>
                                  setPicked((prev) =>
                                    prev.includes(keyOf(row)) ? prev.filter((item) => item !== keyOf(row)) : [...prev, keyOf(row)],
                                  )
                                }
                              />
                            )}
                            <span className="font-mono text-xs">{row.requestNo}</span>
                          </span>
                        ),
                      },
                      { key: 'type', header: 'Type', render: (row) => <PayableTypeBadge type={row.payableType} /> },
                      {
                        key: 'employee',
                        header: 'Employee',
                        render: (row) => {
                          const employee = employeeOf(row.employeeId);
                          return (
                            <CellIdentity
                              name={employee?.name ?? row.employeeId}
                              sub={employee?.unit}
                              leading={<Avatar name={employee?.name ?? '?'} size="sm" />}
                            />
                          );
                        },
                      },
                      {
                        key: 'amount',
                        header: 'Amount',
                        align: 'right',
                        sortKey: 'amount',
                        render: (row) => <Money value={row.amount} />,
                      },
                      {
                        key: 'submitted',
                        header: 'Submitted',
                        nowrap: true,
                        muted: true,
                        sortKey: 'created_at',
                        render: (row) => formatDate(row.submittedAt),
                      },
                      { key: 'mark', header: 'Mark Status', render: (row) => <MarkStatusBadge status={row.markStatus} /> },
                      {
                        key: 'method',
                        header: 'Method / Source',
                        render: (row) =>
                          row.mark ? (
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              <PaymentMethodBadge method={row.mark.paymentMethod} />
                              <MarkSourceBadge source={row.mark.markSource} />
                            </span>
                          ) : (
                            <span className="text-fg-4">—</span>
                          ),
                      },
                      {
                        key: 'marked',
                        header: 'Marked At',
                        nowrap: true,
                        muted: true,
                        sortKey: 'marked_at',
                        render: (row) =>
                          row.mark ? (
                            <span className="flex flex-col gap-0.5">
                              {formatDate(row.mark.markedAt)}
                              <span className="font-body text-[11px] font-medium text-fg-3">{row.mark.actionId}</span>
                            </span>
                          ) : (
                            '—'
                          ),
                      },
                    ]}
                    actions={payableActions}
                  />

                  <Pagination
                    page={pagedPayables.page}
                    pageSize={pagedPayables.pageSize}
                    total={pagedPayables.total}
                    noun="payables"
                    onPageChange={pagedPayables.setPage}
                    onPageSizeChange={pagedPayables.setPageSize}
                  />
                </div>
              )}
            </Card>
          )}

          {tab === 'outstanding' && (
            <Card>
              <CardHead
                title="Outstanding clearance"
                sub={
                  settler
                    ? 'Declare settled terbuka untuk Finance Officer dan HR Manager (FD-112)'
                    : 'Baca saja untuk peran ini'
                }
              />

              {!readable ? (
                accessGate
              ) : (
                <div className="flex flex-col">
                  <TableToolbar
                    filters={
                      <Button variant="secondary" onClick={() => setClearanceFilterOpen(true)}>
                        {summarizeClearanceFilter(clearanceFilter, employeeName)}
                      </Button>
                    }
                  />

                  {clearances.error && (
                    <Note tone="danger" icon={<TriangleAlert />}>
                      {clearances.error.message}
                    </Note>
                  )}

                  <DataTable<OutstandingClearance>
                    rows={pagedClearances.rows}
                    rowKey={(row) => row.id}
                    loading={clearances.isLoading}
                    empty="No clearance row matches the current filter."
                    sort={clearanceSort}
                    onSortChange={(key) => setClearanceSort((prev) => toggleSort(prev, key as ClearanceSortBy))}
                    columns={[
                      {
                        key: 'employee',
                        header: 'Employee',
                        render: (row) => {
                          const employee = employeeOf(row.employeeId);
                          return (
                            <CellIdentity
                              name={employee?.name ?? row.employeeId}
                              sub={employee ? `${employee.unit} · ${employee.nik}` : undefined}
                              leading={<Avatar name={employee?.name ?? '?'} size="sm" />}
                            />
                          );
                        },
                      },
                      {
                        key: 'amount',
                        header: 'Outstanding Amount',
                        align: 'right',
                        sortKey: 'outstanding_amount',
                        render: (row) => (
                          <span className="flex flex-col items-end gap-0.5">
                            <Money value={row.outstandingAmount} />
                            <span className="font-body text-[11px] font-medium text-fg-3">loan + cash advance combined</span>
                          </span>
                        ),
                      },
                      { key: 'status', header: 'Status', render: (row) => <ClearanceStatusBadge status={row.status} /> },
                      {
                        key: 'recorded',
                        header: 'Recorded',
                        nowrap: true,
                        muted: true,
                        sortKey: 'created_at',
                        render: (row) => formatDate(row.createdAt),
                      },
                      {
                        key: 'resolved',
                        header: 'Resolved',
                        nowrap: true,
                        muted: true,
                        sortKey: 'resolved_at',
                        render: (row) => (row.resolvedAt ? formatDate(row.resolvedAt) : '—'),
                      },
                    ]}
                    actions={clearanceActions}
                  />

                  <Pagination
                    page={pagedClearances.page}
                    pageSize={pagedClearances.pageSize}
                    total={pagedClearances.total}
                    noun="clearance rows"
                    onPageChange={pagedClearances.setPage}
                    onPageSizeChange={pagedClearances.setPageSize}
                  />
                </div>
              )}

              <Note icon={<Info />}>
                Outstanding amount adalah <strong>satu angka gabungan</strong> pinjaman dan uang muka, dicatat saat karyawan keluar dan tidak berubah sesudahnya.
              </Note>
            </Card>
          )}
        </div>
      </PageShell>

      <PayableDetailModal actor={actor} row={detail} onClose={() => setDetail(null)} />
      <MarkPaidModal actor={actor} rows={marking} onClose={() => setMarking(null)} onMarked={() => setPicked([])} />
      <ReverseMarkModal actor={actor} row={reversing} onClose={() => setReversing(null)} />
      <ClearanceDetailModal clearance={clearanceDetail} onClose={() => setClearanceDetail(null)} />
      <DeclareSettledModal actor={actor} clearance={settling} onClose={() => setSettling(null)} />

      <FilterModal
        open={payableFilterOpen}
        title="Filter payables"
        description="Mark status bawaan Unmarked. Rentang tanggal menyasar tanggal tanda bila Marked, dan tanggal pengajuan sumber bila Unmarked atau All."
        onOpenChange={setPayableFilterOpen}
        onReset={() => {
          setPayableFilter(EMPTY_PAYABLE_FILTER);
          resetPicked();
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Mark status</Label>
            <Select
              value={payableFilter.markStatus}
              onValueChange={(value) => {
                setPayableFilter((prev) => ({ ...prev, markStatus: value as MarkStatusFilter }));
                resetPicked();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MARK_STATUS_LABEL) as MarkStatusFilter[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {MARK_STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2.5">
            <Label>Payable type</Label>
            {(Object.keys(PAYABLE_TYPE_LABEL) as PayableType[]).map((type) => (
              <label key={type} className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={payableFilter.payableTypes.includes(type)}
                  onCheckedChange={() => {
                    setPayableFilter((prev) => togglePayableType(prev, type));
                    resetPicked();
                  }}
                />
                <span className="font-body text-[13px] font-medium text-fg-2">{PAYABLE_TYPE_LABEL[type]}</span>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>From</Label>
              <DatePicker
                value={payableFilter.startDate}
                max={payableFilter.endDate || undefined}
                onChange={(startDate) => {
                  setPayableFilter((prev) => ({ ...prev, startDate }));
                  resetPicked();
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>To</Label>
              <DatePicker
                value={payableFilter.endDate}
                min={payableFilter.startDate || undefined}
                onChange={(endDate) => {
                  setPayableFilter((prev) => ({ ...prev, endDate }));
                  resetPicked();
                }}
              />
            </div>
          </div>
        </div>
      </FilterModal>

      <FilterModal
        open={clearanceFilterOpen}
        title="Filter outstanding clearance"
        description="Rentang tanggal menyasar tanggal baris dicatat."
        onOpenChange={setClearanceFilterOpen}
        onReset={() => {
          setClearanceFilter(EMPTY_CLEARANCE_FILTER);
          pagedClearances.resetPage();
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Status</Label>
            <Select
              value={clearanceFilter.status}
              onValueChange={(value) => {
                setClearanceFilter((prev) => ({ ...prev, status: value as ClearanceStatus | 'ALL' }));
                pagedClearances.resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                {(Object.keys(CLEARANCE_STATUS_LABEL) as ClearanceStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {CLEARANCE_STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Employee</Label>
            <Select
              value={clearanceFilter.employeeId}
              onValueChange={(employeeId) => {
                setClearanceFilter((prev) => ({ ...prev, employeeId }));
                pagedClearances.resetPage();
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All employees</SelectItem>
                {EMPLOYEES.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label>From</Label>
              <DatePicker
                value={clearanceFilter.startDate}
                max={clearanceFilter.endDate || undefined}
                onChange={(startDate) => setClearanceFilter((prev) => ({ ...prev, startDate }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>To</Label>
              <DatePicker
                value={clearanceFilter.endDate}
                min={clearanceFilter.startDate || undefined}
                onChange={(endDate) => setClearanceFilter((prev) => ({ ...prev, endDate }))}
              />
            </div>
          </div>
        </div>
      </FilterModal>
    </>
  );
}
