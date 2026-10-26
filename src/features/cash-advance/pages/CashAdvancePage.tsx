import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
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
  useRestartExtraApproval,
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

const ALL_ADVANCES = {};

/**
 * Daftar uang muka + aksi penerima/pembuat (UIC-FINANCE Menu 4 `5.1`–`5.13`). Dipakai tab All Request di
 * Finance › Cash Advance dan tab `ESS-6` hub ESS Finance (FSD-FINANCE 0.34) — layar dan aksinya sama, ESS
 * tanpa tab petugas. `openId` = pendarat tautan surel (`state.viewId`, UIC-FINANCE §12): detailnya dibuka
 * sekali begitu daftar termuat.
 */
export function CashAdvanceRequests({
  actor,
  variant,
  openId = null,
}: {
  actor: Actor;
  variant: 'finance' | 'ess';
  openId?: string | null;
}) {
  const [filter, setFilter] = useState<AdvanceFilterState>(EMPTY_ADVANCE_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const [purpose, setPurpose] = useState('ALL');
  const [search, setSearch] = useState('');

  const [detail, setDetail] = useState<CashAdvance | null>(null);
  const [exit, setExit] = useState<{ advance: CashAdvance; mode: ExitMode } | null>(null);
  const [settling, setSettling] = useState<CashAdvance | null>(null);

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
  const pagedAdvances = usePagedRows(advances);

  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!openId || opened.current === openId) return;
    const row = advances.find((item) => item.id === openId);
    if (!row) return;
    opened.current = openId;
    setDetail(row);
  }, [openId, advances]);

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

  return (
    <>
      <Card>
        <CardHead
          title={variant === 'ess' ? 'My cash advances' : 'Cash advance requests'}
          sub={actor.role === 'ROLE_EMPLOYEE' ? 'Requests where you are the recipient' : 'All requests in the company'}
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
            empty={variant === 'ess' ? 'You have no cash advance yet.' : 'No cash advance matches the current filter.'}
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
                  // UIC-FINANCE 0.34: `recipient_name` dari respons finance; kosong ⇒ «—».
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
          The recipient owns the request — one made on their behalf belongs to the recipient, not the maker. Only the
          recipient can repudiate it, and only before it is marked as disbursed.
        </Note>
      </Card>

      <AdvanceDetailModal advance={detail} settlements={settlements} onClose={() => setDetail(null)} />
      <AdvanceExitModal advance={exit?.advance ?? null} mode={exit?.mode ?? 'cancel'} actor={actor} onClose={() => setExit(null)} />
      <SettlementFormModal advance={settling} actor={actor} onClose={() => setSettling(null)} />

      <FilterModal
        open={filterOpen}
        title="Filter status"
        description="Pick one or more statuses."
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
  const viewId = (useLocation().state as { viewId?: string } | null)?.viewId ?? null;
  const [tab, setTab] = useState<Tab>('request');
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);

  const [formOpen, setFormOpen] = useState(false);
  const [reviewing, setReviewing] = useState<SettlementView | null>(null);
  const [deciding, setDeciding] = useState<SettlementView | null>(null);
  const [surplus, setSurplus] = useState<Difference | null>(null);
  const [restarting, setRestarting] = useState<Difference | null>(null);
  const [restartError, setRestartError] = useState('');

  const { data: advances = [] } = useAdvances(actor, ALL_ADVANCES);
  const { data: settlements = [] } = useSettlements();
  const { data: differences = [] } = useDifferences();
  const approveExtra = useApproveExtra();
  const restartExtra = useRestartExtraApproval();

  const pagedSettlements = usePagedRows(settlements);
  const pagedDifferences = usePagedRows(differences);

  const settlementAction = (row: SettlementView) => {
    if (row.status === 'SUBMITTED') return <RowButton onClick={() => setReviewing(row)}>Review</RowButton>;
    if (row.status === 'UNDER_REVIEW') return <RowButton onClick={() => setDeciding(row)}>Decide</RowButton>;
    return <RowButton onClick={() => setDeciding(row)}>View Detail</RowButton>;
  };

  const differenceAction = (row: Difference) => {
    // Lapis tambahan berhenti tanpa putusan: hanya Finance Officer yang memulai ulang; tak ada keputusan untuk diambil.
    if (row.awaitingRestart) {
      return actor.role === 'ROLE_FINANCE_OFFICER' ? (
        <RowButton
          onClick={() => {
            setRestartError('');
            setRestarting(row);
          }}
        >
          Restart Approval
        </RowButton>
      ) : null;
    }
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
        description="Cash advances for yourself or made by a Finance Officer on an employee's behalf, settled in two stages: Finance checks the receipts, then the recipient's manager decides. Differences are counted only at the closing stage."
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

          {tab === 'request' && <CashAdvanceRequests actor={actor} variant="finance" openId={viewId} />}

          {tab === 'settlement' && (
            <Card>
              <CardHead title="Settlement stages" sub="Stage 1 checked by Finance · Stage 2 decided by the recipient's manager" />

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
                sub="Counted only at the closing stage — a surplus needs a return method; a shortfall is paid through Disbursement & Receivables"
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
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <DifferenceStatusBadge status={row.status} awaitingRestart={row.awaitingRestart} />,
                    },
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
                Shortfalls are paid through Disbursement &amp; Receivables. A large shortfall also needs the next-level
                manager&rsquo;s approval.
              </Note>
            </Card>
          )}
        </div>
      </PageShell>

      <AdvanceFormModal open={formOpen} actor={actor} onClose={() => setFormOpen(false)} />
      <ReviewModal settlement={reviewing} actor={actor} onClose={() => setReviewing(null)} />
      <DecisionModal settlement={deciding} actor={actor} onClose={() => setDeciding(null)} />
      <SurplusMethodModal difference={surplus} actor={actor} onClose={() => setSurplus(null)} />
      <ConfirmDialog
        open={Boolean(restarting)}
        title="Restart Additional Approval"
        description={
          <p className="m-0 font-body text-[13px] font-medium leading-normal text-fg-2">
            The additional approval for <strong>{restarting?.requestNo}</strong> ended without a decision. Restarting sends it
            to the next-level manager again.
            {restartError && <span className="mt-2 block text-error-600">{restartError}</span>}
          </p>
        }
        confirmLabel="Restart Approval"
        tone="primary"
        loading={restartExtra.isPending}
        onOpenChange={(open) => !open && setRestarting(null)}
        onConfirm={() =>
          restarting &&
          restartExtra.mutate(
            { actor, id: restarting.id, requestNo: restarting.requestNo },
            { onSuccess: () => setRestarting(null), onError: (error) => setRestartError(error.message) },
          )
        }
      />
    </>
  );
}
