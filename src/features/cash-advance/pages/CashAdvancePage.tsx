import { useMemo, useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RowActions, RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import {
  AdvanceStatusBadge,
  DifferenceStatusBadge,
  DifferenceTypeBadge,
  Money,
  SettlementStatusBadge,
  StageBadge,
} from '@/features/cash-advance/components/CashAdvanceBits';
import {
  AdvanceDetailModal,
  AdvanceExitModal,
  AdvanceFormModal,
} from '@/features/cash-advance/components/AdvanceModals';
import type { ExitMode } from '@/features/cash-advance/components/AdvanceModals';
import {
  DecisionModal,
  ReviewModal,
  SettlementFormModal,
  SurplusMethodModal,
} from '@/features/cash-advance/components/SettlementModals';
import {
  useAdvances,
  useApproveExtra,
  useDifferences,
  usePurposeTypes,
  useSettlements,
} from '@/features/cash-advance/hooks/useCashAdvance';
import { VIEWERS, employeeName, employeeOf } from '@/features/cash-advance/mock-data';
import { differenceOfAdvance, openSettlementOf } from '@/features/cash-advance/rules';
import { EMPTY_ADVANCE_FILTER, summarizeStatuses, toggleStatus } from '@/features/cash-advance/advanceFilters';
import type { AdvanceFilterState } from '@/features/cash-advance/advanceFilters';
import { ADVANCE_STATUS_LABEL, SETTLEMENT_METHOD_LABEL } from '@/features/cash-advance/types';
import type {
  Actor,
  CashAdvance,
  CashAdvanceStatus,
  Difference,
  SettlementView,
} from '@/features/cash-advance/types';
import type { RowAction } from '@/components/RowActions';
import { formatDate } from '@/lib/format';

type Tab = 'request' | 'settlement' | 'differences';

/**
 * Finance › Cash Advance — port `_prototype/finance-cash-advance.html`
 * (FSD §4 · UIC §5 · TSD §14.4 · ERD §6.6–§6.7).
 *
 * Pengajuan dua pintu → pertanggungjawaban dua tahap (petugas keuangan
 * menandai, atasan penerima memutus 202) → selisih di tahap penutup. Gerbang
 * peran ditegakkan service (403), jadi pemilih identitas di kanan atas
 * dipakai untuk memainkan setiap aktor uji UIC §1.7.
 */
export function CashAdvancePage() {
  const [tab, setTab] = useState<Tab>('request');
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);

  const [filter, setFilter] = useState<AdvanceFilterState>(EMPTY_ADVANCE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [purpose, setPurpose] = useState('ALL');
  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<CashAdvance | null>(null);
  const [exit, setExit] = useState<{ advance: CashAdvance; mode: ExitMode } | null>(null);
  const [settling, setSettling] = useState<CashAdvance | null>(null);
  const [reviewing, setReviewing] = useState<SettlementView | null>(null);
  const [deciding, setDeciding] = useState<SettlementView | null>(null);
  const [surplus, setSurplus] = useState<Difference | null>(null);

  const query = useMemo(
    () => ({
      statuses: filter.statuses.length ? filter.statuses : undefined,
      purposeTypeId: purpose === 'ALL' ? undefined : purpose,
      search: search.trim() || undefined,
    }),
    [filter, purpose, search],
  );

  const { data: advances = [], isLoading } = useAdvances(actor, query);
  const { data: purposes = [] } = usePurposeTypes();
  const { data: settlements = [] } = useSettlements();
  const { data: differences = [] } = useDifferences();
  const approveExtra = useApproveExtra();

  const pagedAdvances = usePagedRows(advances);
  const pagedSettlements = usePagedRows(settlements);
  const pagedDifferences = usePagedRows(differences);

  const advanceActions = (row: CashAdvance) => {
    const actions: RowAction[] = [{ label: 'View Detail', onSelect: () => setDetail(row) }];
    if (row.status === 'SUBMITTED') {
      actions.push({ label: 'Cancel request', danger: true, onSelect: () => setExit({ advance: row, mode: 'cancel' }) });
    }
    if (row.createdOnBehalfEmployeeId && !row.disbursementMarked && ['SUBMITTED', 'APPROVED'].includes(row.status)) {
      actions.push({ label: 'Repudiate', danger: true, onSelect: () => setExit({ advance: row, mode: 'repudiate' }) });
    }
    if (row.status === 'APPROVED' && !openSettlementOf(settlements, row.id) && !differenceOfAdvance(differences, row.id)) {
      actions.push({ label: 'Submit settlement', onSelect: () => setSettling(row) });
    }
    if (row.status === 'APPROVED' && row.isOfficialTravelSnapshot && !row.travelCancelledAt) {
      actions.push({ label: 'Cancel travel', onSelect: () => setExit({ advance: row, mode: 'travel' }) });
    }
    return actions.length > 1 ? (
      <RowActions actions={actions} />
    ) : (
      <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>
    );
  };

  const settlementAction = (row: SettlementView) => {
    if (row.status === 'SUBMITTED') return <RowButton onClick={() => setReviewing(row)}>Review</RowButton>;
    if (row.status === 'UNDER_REVIEW') return <RowButton onClick={() => setDeciding(row)}>Decide</RowButton>;
    return <RowButton onClick={() => setDeciding(row)}>View Detail</RowButton>;
  };

  const differenceAction = (row: Difference) => {
    if (row.differenceType === 'SURPLUS' && row.status !== 'SETTLED') {
      return <RowButton onClick={() => setSurplus(row)}>Set return method</RowButton>;
    }
    if (row.status === 'AWAITING_APPROVAL') {
      return (
        <RowActions
          actions={[
            {
              label: 'Approve extra layer',
              onSelect: () => approveExtra.mutate({ actor, id: row.id, decision: 'APPROVE', requestNo: row.requestNo }),
            },
            {
              label: 'Reject extra layer',
              danger: true,
              onSelect: () => approveExtra.mutate({ actor, id: row.id, decision: 'REJECT', requestNo: row.requestNo }),
            },
          ]}
        />
      );
    }
    return null;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Finance' }, { label: 'Cash Advance' }]}
        title="Cash Advance"
        description="Uang muka lewat dua pintu — karyawan sendiri atau dibuatkan Finance Officer atas nama — lalu dipertanggungjawabkan dua tahap: petugas keuangan menandai nota, atasan penerima memutus. Selisih hanya dihitung di tahap penutup."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={actor.employeeId}
              onValueChange={(value) => {
                const next = VIEWERS.find((row) => row.employeeId === value);
                if (next) setActor(next);
              }}
            >
              <SelectTrigger className="h-10 w-[260px]" aria-label="Viewing as">
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
            {tab === 'request' && <Button onClick={() => setFormOpen(true)}>New cash advance</Button>}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'request', label: 'All Request', count: advances.length },
              { value: 'settlement', label: 'Settlement', count: settlements.length },
              { value: 'differences', label: 'Differences', count: differences.length },
            ]}
          />

          {tab === 'request' && (
            <Card>
              <CardHead
                title="Cash advance requests"
                sub={actor.role === 'ROLE_EMPLOYEE' ? 'Baris milik Anda sebagai penerima — dipaksa server' : 'Seluruh company'}
              />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                        {summarizeStatuses(filter)}
                      </Button>
                      <Select
                        value={purpose}
                        onValueChange={(value) => {
                          setPurpose(value);
                          pagedAdvances.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All purposes</SelectItem>
                          {purposes.map((row) => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  }
                  search={{
                    value: search,
                    onChange: (value) => {
                      setSearch(value);
                      pagedAdvances.resetPage();
                    },
                    placeholder: 'Search request no.',
                  }}
                />

                <DataTable<CashAdvance>
                  rows={pagedAdvances.rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="No cash advance matches the current filter."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => (
                        <span className="flex flex-col gap-0.5">
                          <span className="font-mono text-xs">{row.requestNo}</span>
                          {row.createdOnBehalfEmployeeId && (
                            <span className="font-body text-[11px] font-medium text-fg-3">
                              on behalf · by {employeeName(row.createdOnBehalfEmployeeId)}
                            </span>
                          )}
                        </span>
                      ),
                    },
                    {
                      key: 'recipient',
                      header: 'Recipient',
                      render: (row) => {
                        const employee = employeeOf(row.recipientEmployeeId);
                        return (
                          <CellIdentity
                            name={employee?.name ?? '—'}
                            sub={employee?.unit}
                            leading={<Avatar name={employee?.name ?? '?'} size="sm" />}
                          />
                        );
                      },
                    },
                    {
                      key: 'purpose',
                      header: 'Purpose',
                      render: (row) => (
                        <span className="flex flex-col gap-0.5">
                          {row.purposeTypeName}
                          {row.isOfficialTravelSnapshot && (
                            <span className="font-body text-[11px] font-medium text-fg-3">Official travel</span>
                          )}
                        </span>
                      ),
                    },
                    {
                      key: 'amount',
                      header: 'Amount',
                      align: 'right',
                      render: (row) => (
                        <span className="flex flex-col items-end gap-0.5">
                          <Money value={row.amount} />
                          <span className="font-body text-[11px] font-medium text-fg-3">
                            max {row.maxAmountSnapshot === null ? '∞' : row.maxAmountSnapshot.toLocaleString('id-ID')}
                          </span>
                        </span>
                      ),
                    },
                    {
                      key: 'travel',
                      header: 'Travel Dates',
                      nowrap: true,
                      muted: true,
                      render: (row) =>
                        row.travelStartDate ? `${formatDate(row.travelStartDate)} – ${formatDate(row.travelEndDate)}` : '—',
                    },
                    { key: 'status', header: 'Status', render: (row) => <AdvanceStatusBadge status={row.status} /> },
                    { key: 'created', header: 'Created', nowrap: true, muted: true, render: (row) => formatDate(row.createdAt) },
                  ]}
                  actions={advanceActions}
                />

                <Pagination
                  page={pagedAdvances.page}
                  pageSize={pagedAdvances.pageSize}
                  total={pagedAdvances.total}
                  noun="advances"
                  onPageChange={pagedAdvances.setPage}
                  onPageSizeChange={pagedAdvances.setPageSize}
                />
              </div>

              <Note icon={<Info />}>
                Penerima adalah identitas yang menentukan — pengajuan atas nama menjadi milik penerima, bukan pembuatnya.
                Bantahan hanya milik penerima, hanya pada pengajuan atas nama yang belum ditandai cair.
              </Note>
              <Note tone="warn" icon={<TriangleAlert />}>
                <strong>Gap cakupan visual yang didokumentasikan.</strong> Perubahan tanggal pulang (5.7/5.8
                date-changes) berkontrak penuh tapi tidak punya frame di FSD — dicatat, tidak diimprovisasi.
              </Note>
            </Card>
          )}

          {tab === 'settlement' && (
            <Card>
              <CardHead title="Settlement stages" sub="Tahap 1 menandai (200 UNDER_REVIEW) · Tahap 2 memutus (202)" />

              <Note icon={<Info />}>
                <strong>CA-B0 adalah frame tambahan.</strong> Menyerahkan nota (5.9) berkontrak penuh di UIC tapi tidak
                punya frame di FSD — dibangun sebagai aksi baris <em>Submit settlement</em> pada uang muka APPROVED
                (FINANCE-GAP-NOTES).
              </Note>

              <div className="flex flex-col">
                <DataTable<SettlementView>
                  rows={pagedSettlements.rows}
                  rowKey={(row) => row.id}
                  empty="No settlement submitted yet."
                  columns={[
                    {
                      key: 'no',
                      header: 'Settlement No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.settlementNo}</span>,
                    },
                    { key: 'recipient', header: 'Recipient', render: (row) => employeeName(row.recipientEmployeeId) },
                    { key: 'advance', header: 'Advance', align: 'right', render: (row) => <Money value={row.advanceAmount} /> },
                    {
                      key: 'receipts',
                      header: 'Receipts',
                      align: 'right',
                      render: (row) => <Money value={row.items.reduce((sum, item) => sum + item.amount, 0)} tone="muted" />,
                    },
                    {
                      key: 'stage',
                      header: 'Stage',
                      render: (row) => <StageBadge isFinalStage={row.isFinalStage} isCorrection={row.isCorrection} />,
                    },
                    { key: 'status', header: 'Status', render: (row) => <SettlementStatusBadge status={row.status} /> },
                    { key: 'submitted', header: 'Submitted', nowrap: true, muted: true, render: (row) => formatDate(row.submittedAt) },
                  ]}
                  actions={settlementAction}
                />

                <Pagination
                  page={pagedSettlements.page}
                  pageSize={pagedSettlements.pageSize}
                  total={pagedSettlements.total}
                  noun="settlements"
                  onPageChange={pagedSettlements.setPage}
                  onPageSizeChange={pagedSettlements.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'differences' && (
            <Card>
              <CardHead
                title="Differences"
                sub="Dihitung hanya di tahap penutup — sisa butuh cara pengembalian; kekurangan dibayar lewat Pencairan & Piutang"
              />

              <div className="flex flex-col">
                <DataTable<Difference>
                  rows={pagedDifferences.rows}
                  rowKey={(row) => row.id}
                  empty="No difference recorded."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                    },
                    { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                    { key: 'type', header: 'Type', render: (row) => <DifferenceTypeBadge type={row.differenceType} /> },
                    {
                      key: 'amount',
                      header: 'Amount',
                      align: 'right',
                      render: (row) => <Money value={row.amount} tone={row.differenceType === 'SHORTFALL' ? 'minus' : 'plus'} />,
                    },
                    {
                      key: 'method',
                      header: 'Settlement Method',
                      muted: true,
                      render: (row) =>
                        row.settlementMethod
                          ? SETTLEMENT_METHOD_LABEL[row.settlementMethod]
                          : row.differenceType === 'SHORTFALL'
                            ? 'Via Disbursement'
                            : 'Not set',
                    },
                    { key: 'due', header: 'Due Date', nowrap: true, muted: true, render: (row) => formatDate(row.dueDate) },
                    {
                      key: 'extra',
                      header: 'Extra Layer',
                      render: (row) => (row.requiresExtraApproval ? 'Required' : '—'),
                    },
                    { key: 'status', header: 'Status', render: (row) => <DifferenceStatusBadge status={row.status} /> },
                  ]}
                  actions={differenceAction}
                />

                <Pagination
                  page={pagedDifferences.page}
                  pageSize={pagedDifferences.pageSize}
                  total={pagedDifferences.total}
                  noun="differences"
                  onPageChange={pagedDifferences.setPage}
                  onPageSizeChange={pagedDifferences.setPageSize}
                />
              </div>

              <Note icon={<Info />}>
                Memanggil cara pengembalian atas kekurangan ditolak 422 — jalurnya lewat Pencairan
                (payable_type = CASH_ADVANCE_SHORTFALL). Kekurangan besar butuh atasan berikutnya, beda dari pemutus tahap.
              </Note>
            </Card>
          )}
        </div>
      </PageShell>

      <AdvanceFormModal open={formOpen} actor={actor} onClose={() => setFormOpen(false)} />
      <AdvanceDetailModal advance={detail} settlements={settlements} onClose={() => setDetail(null)} />
      <AdvanceExitModal advance={exit?.advance ?? null} mode={exit?.mode ?? 'cancel'} actor={actor} onClose={() => setExit(null)} />
      <SettlementFormModal advance={settling} actor={actor} onClose={() => setSettling(null)} />
      <ReviewModal settlement={reviewing} actor={actor} onClose={() => setReviewing(null)} />
      <DecisionModal settlement={deciding} actor={actor} onClose={() => setDeciding(null)} />
      <SurplusMethodModal difference={surplus} actor={actor} onClose={() => setSurplus(null)} />

      <FilterModal
        open={filterOpen}
        title="Filter status"
        description="Status dikirim sebagai daftar IN — beberapa status boleh dipilih sekaligus."
        onOpenChange={setFilterOpen}
        onReset={() => setFilter(EMPTY_ADVANCE_FILTER)}
      >
        <div className="flex flex-col gap-2.5">
          {(Object.keys(ADVANCE_STATUS_LABEL) as CashAdvanceStatus[]).map((status) => (
            <label key={status} className="flex cursor-pointer items-center gap-3">
              <Checkbox
                checked={filter.statuses.includes(status)}
                onCheckedChange={() => {
                  setFilter((prev) => toggleStatus(prev, status));
                  pagedAdvances.resetPage();
                }}
              />
              <span className="font-body text-[13px] font-medium text-fg-2">{ADVANCE_STATUS_LABEL[status]}</span>
            </label>
          ))}
        </div>
      </FilterModal>
    </>
  );
}
