import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Segmented } from '@/components/Segmented';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import {
  BalanceCard,
  ClaimStatusBadge,
  LedgerTypeBadge,
  Money,
  PeriodStatusBadge,
  ReservationBadge,
  YesNo,
} from '@/features/benefit/components/BenefitBits';
import { ClaimCancelModal, ClaimDetailModal, ClaimRejectModal } from '@/features/benefit/components/ClaimModals';
import { ClaimFormModal } from '@/features/benefit/components/ClaimFormModal';
import {
  BeneficiaryFormModal,
  BenefitTypeFormModal,
} from '@/features/benefit/components/BenefitSettingsModals';
import {
  useBeneficiaries,
  useBenefitDisbursements,
  useBenefitLedger,
  useBenefitTypes,
  useClaims,
  useDeactivateBeneficiary,
} from '@/features/benefit/hooks/useBenefit';
import {
  ENTITLEMENTS,
  FAMILY_RELATIONSHIP_RULES,
  HOLDS,
  ME,
  PERIODS,
  benefitTypeName,
  employeeName,
  employeeOf,
  gradeName,
} from '@/features/benefit/mock-data';
import { activeHoldOn, withRunningBalance } from '@/features/benefit/rules';
import {
  CLAIM_STATUS_LABEL,
  MARK_SOURCE_LABEL,
  PAYMENT_METHOD_LABEL,
  RELATIONSHIP_LABEL,
} from '@/features/benefit/types';
import type {
  Beneficiary,
  BenefitClaim,
  BenefitType,
  ClaimStatus,
  Entitlement,
  FamilyRelationshipRule,
  Payable,
} from '@/features/benefit/types';
import type { LedgerRow } from '@/features/benefit/rules';
import { formatDate } from '@/lib/format';

type Tab = 'claims' | 'balance' | 'ledger' | 'disbursement' | 'beneficiaries' | 'settings';
type SettingsTab = 'types' | 'entitlements' | 'relationships';

/**
 * Finance › Benefit Reimbursement — port `_prototype/finance-benefit-reimbursement.html`
 * (FSD/UIC-001-FINANCE FT1 · FT2).
 *
 * Satu klaim menahan hak lebih dulu, lalu memakainya saat disetujui atau
 * melepasnya saat ditolak/dibatalkan. Keputusan approver dikirim ke proses
 * approval dan kembali 202 — statusnya ditulis belakangan, bukan seketika.
 */
export function BenefitReimbursementPage() {
  const [tab, setTab] = useState<Tab>('claims');
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('types');
  const [periodIndex, setPeriodIndex] = useState(0);

  const [status, setStatus] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [claimForm, setClaimForm] = useState(false);
  const [detail, setDetail] = useState<{ claim: BenefitClaim; asApprover: boolean } | null>(null);
  const [rejecting, setRejecting] = useState<BenefitClaim | null>(null);
  const [cancelling, setCancelling] = useState<BenefitClaim | null>(null);
  const [typeForm, setTypeForm] = useState(false);
  const [editingType, setEditingType] = useState<BenefitType | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState(false);

  const filter = useMemo(
    () => ({
      status: status === 'ALL' ? undefined : status,
      benefitTypeId: typeFilter === 'ALL' ? undefined : typeFilter,
      search: search.trim() || undefined,
    }),
    [status, typeFilter, search],
  );

  const { data: claims = [], isLoading } = useClaims(filter);
  const { data: types = [] } = useBenefitTypes();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: ledger = [] } = useBenefitLedger();
  const { data: payables = [] } = useBenefitDisbursements();

  const ledgerRows = useMemo(() => withRunningBalance(ledger), [ledger]);

  const pagedClaims = usePagedRows(claims);
  const pagedLedger = usePagedRows(ledgerRows);
  const pagedPayables = usePagedRows(payables);

  const deactivate = useDeactivateBeneficiary();
  const period = PERIODS[periodIndex];

  const claimActions = (row: BenefitClaim) => {
    if (row.status !== 'SUBMITTED') {
      return <RowButton onClick={() => setDetail({ claim: row, asApprover: false })}>View Detail</RowButton>;
    }
    const actions = [
      { label: 'Review', onSelect: () => setDetail({ claim: row, asApprover: true }) },
      { label: 'View Detail', onSelect: () => setDetail({ claim: row, asApprover: false }) },
    ];
    // Membatalkan hanya milik pengaju sendiri.
    if (row.employeeId === ME) {
      actions.push({ label: 'Cancel', danger: true, onSelect: () => setCancelling(row) } as (typeof actions)[number]);
    }
    return <RowActions actions={actions} />;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Finance' }, { label: 'Benefit Reimbursement' }]}
        title="Benefit Reimbursement"
        description="Satu klaim menahan hak Anda lebih dulu, memakainya saat disetujui, dan melepasnya saat ditolak atau dibatalkan. Keputusan approver diteruskan ke proses approval dan kembali 202 Accepted — statusnya ditulis saat prosesnya selesai, bukan seketika di layar ini."
        actions={
          tab === 'claims' ? (
            <Button onClick={() => setClaimForm(true)}>New claim</Button>
          ) : tab === 'beneficiaries' ? (
            <Button onClick={() => setBeneficiaryForm(true)}>Add beneficiary</Button>
          ) : tab === 'settings' && settingsTab === 'types' ? (
            <Button
              onClick={() => {
                setEditingType(null);
                setTypeForm(true);
              }}
            >
              New benefit type
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'claims', label: 'All Request', count: claims.length },
              { value: 'balance', label: 'Balance Overview' },
              { value: 'ledger', label: 'Transaction History', count: ledgerRows.length },
              { value: 'disbursement', label: 'Disbursement History', count: payables.length },
              { value: 'beneficiaries', label: 'Beneficiaries', count: beneficiaries.length },
              { value: 'settings', label: 'Settings' },
            ]}
          />

          {tab === 'claims' && (
            <Card>
              <CardHead title="Claims" sub="emp_benefit_claim — baris yang boleh Anda lihat disaring server" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-10 w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All status</SelectItem>
                          {(Object.keys(CLAIM_STATUS_LABEL) as ClaimStatus[]).map((item) => (
                            <SelectItem key={item} value={item}>
                              {CLAIM_STATUS_LABEL[item]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="h-10 w-[240px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All benefit types</SelectItem>
                          {types.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
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
                      pagedClaims.resetPage();
                    },
                    placeholder: 'Search request no. or name',
                  }}
                />

                <DataTable<BenefitClaim>
                  rows={pagedClaims.rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty="No claim matches the current filter."
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
                      header: 'Applicant',
                      render: (row) => {
                        const employee = employeeOf(row.employeeId);
                        return (
                          <CellIdentity
                            name={employee?.name ?? '—'}
                            sub={employee ? `${employee.unit} · ${employee.nik}` : undefined}
                            leading={<Avatar name={employee?.name ?? '?'} size="sm" />}
                          />
                        );
                      },
                    },
                    { key: 'type', header: 'Benefit Type', render: (row) => row.benefitTypeName },
                    {
                      key: 'amount',
                      header: 'Amount',
                      align: 'right',
                      render: (row) => <Money value={row.totalAmount} />,
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <ClaimStatusBadge status={row.status} />
                          {activeHoldOn(HOLDS, row.id) && <TmFlag>Dispute hold</TmFlag>}
                        </span>
                      ),
                    },
                    {
                      key: 'reservation',
                      header: 'Reservation',
                      render: (row) => <ReservationBadge state={row.reservationState} />,
                    },
                    {
                      key: 'submitted',
                      header: 'Submitted',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.submittedAt),
                    },
                  ]}
                  actions={claimActions}
                />

                <Pagination
                  page={pagedClaims.page}
                  pageSize={pagedClaims.pageSize}
                  total={pagedClaims.total}
                  noun="claims"
                  onPageChange={pagedClaims.setPage}
                  onPageSizeChange={pagedClaims.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'balance' && (
            <Card>
              <CardHead title="Balance overview" sub="Satu periode sekali lihat" />

              <div className="flex flex-wrap items-center gap-3">
                <Segmented<string>
                  value={String(periodIndex)}
                  onChange={(value) => setPeriodIndex(Number(value))}
                  options={PERIODS.map((row, index) => ({ value: String(index), label: row.label }))}
                />
                <PeriodStatusBadge status={period.status} />
                <span className="font-body text-xs font-medium text-fg-3">
                  {formatDate(period.periodStart)} – {formatDate(period.periodEnd)} · grace berakhir{' '}
                  {formatDate(period.graceEnd)}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {period.balances.map((balance) => (
                  <BalanceCard key={balance.benefitTypeId} balance={balance} />
                ))}
              </div>
            </Card>
          )}

          {tab === 'ledger' && (
            <Card>
              <CardHead
                title="Transaction history"
                sub="log_benefit_balance_ledger — saldo berjalan dihitung saat dibaca"
              />

              <div className="flex flex-col">
                <TableToolbar summary="Reservasi mengurangi, pelepasan mengembalikan; pemakaian tidak menggeser saldo karena sudah ditahan sejak reservasi" />

                <DataTable<LedgerRow>
                  rows={pagedLedger.rows}
                  rowKey={(row) => row.entry.id}
                  empty="No ledger entry in this period."
                  columns={[
                    {
                      key: 'type',
                      header: 'Entry Type',
                      render: (row) => <LedgerTypeBadge type={row.entry.entryType} />,
                    },
                    {
                      key: 'no',
                      header: 'Request No.',
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.entry.requestNo}</span>,
                    },
                    { key: 'benefit', header: 'Benefit Type', render: (row) => row.entry.benefitTypeName },
                    {
                      key: 'delta',
                      header: 'Delta',
                      align: 'right',
                      render: (row) => (
                        <Money
                          value={row.entry.amount}
                          signed={row.delta < 0 ? 'minus' : row.delta > 0 ? 'plus' : undefined}
                          muted={row.delta === 0}
                        />
                      ),
                    },
                    {
                      key: 'date',
                      header: 'Created',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.entry.createdAt),
                    },
                    {
                      key: 'after',
                      header: 'Balance After',
                      align: 'right',
                      render: (row) => <Money value={row.runningBalance} muted />,
                    },
                  ]}
                />

                <Pagination
                  page={pagedLedger.page}
                  pageSize={pagedLedger.pageSize}
                  total={pagedLedger.total}
                  noun="entries"
                  onPageChange={pagedLedger.setPage}
                  onPageSizeChange={pagedLedger.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'disbursement' && (
            <Card>
              <CardHead title="Disbursement history" sub="Payable hanya lahir setelah klaimnya disetujui" />

              <div className="flex flex-col">
                <DataTable<Payable>
                  rows={pagedPayables.rows}
                  rowKey={(row) => row.payableId}
                  empty="No approved claim has reached disbursement yet."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                    },
                    { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                    { key: 'amount', header: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
                    {
                      key: 'method',
                      header: 'Payment Method',
                      render: (row) =>
                        row.mark ? (
                          <StatusBadge tone="info">{PAYMENT_METHOD_LABEL[row.mark.paymentMethod]}</StatusBadge>
                        ) : (
                          <span className="text-fg-4">—</span>
                        ),
                    },
                    {
                      key: 'source',
                      header: 'Mark Source',
                      render: (row) =>
                        row.mark ? (
                          <StatusBadge tone="mute">{MARK_SOURCE_LABEL[row.mark.markSource]}</StatusBadge>
                        ) : (
                          <StatusBadge tone="warn">Unmarked</StatusBadge>
                        ),
                    },
                    {
                      key: 'paid',
                      header: 'Paid At',
                      muted: true,
                      nowrap: true,
                      render: (row) =>
                        row.mark ? formatDate(row.mark.markedAt) : <span className="text-fg-4">not paid yet</span>,
                    },
                  ]}
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
            </Card>
          )}

          {tab === 'beneficiaries' && (
            <Card>
              <CardHead title="Beneficiaries" sub="Satu baris per kerabat per periode — tidak pernah dihapus keras" />

              <DataTable<Beneficiary>
                rows={beneficiaries}
                rowKey={(row) => row.id}
                empty="No beneficiary registered for this period."
                columns={[
                  { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
                  {
                    key: 'relationship',
                    header: 'Relationship',
                    render: (row) => RELATIONSHIP_LABEL[row.relationshipType],
                  },
                  {
                    key: 'slot',
                    header: 'Slot',
                    render: (row) =>
                      row.slotConsumed ? <TmFlag>Consumed</TmFlag> : <span className="text-fg-4">Not yet</span>,
                  },
                  {
                    key: 'active',
                    header: 'Status',
                    render: (row) => (
                      <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    ),
                  },
                ]}
                actions={(row) => (
                  <RowButton
                    variant="danger"
                    disabled={!row.isActive || deactivate.isPending}
                    title={
                      row.isActive
                        ? undefined
                        : 'Menyalakan kembali adalah koreksi finance officer — bukan aksi peran Anda'
                    }
                    onClick={() => deactivate.mutate({ id: row.id })}
                  >
                    Deactivate
                  </RowButton>
                )}
              />

              <Note icon={<Info />}>
                Baris beneficiary tidak pernah dihapus keras: menonaktifkan ditulis ke riwayatnya, dan menyalakannya
                kembali adalah koreksi milik finance officer. Kerabat yang sudah punya baris di periode ini tidak bisa
                didaftarkan dua kali.
              </Note>
            </Card>
          )}

          {tab === 'settings' && (
            <div className="flex flex-col gap-5">
              <Segmented<SettingsTab>
                value={settingsTab}
                onChange={setSettingsTab}
                options={[
                  { value: 'types', label: 'Benefit Type' },
                  { value: 'entitlements', label: 'Entitlement per Grade' },
                  { value: 'relationships', label: 'Family Relationship Whitelist' },
                ]}
              />

              {settingsTab === 'types' && (
                <Card>
                  <CardHead title="Benefit type" sub="cnf_benefit_type" />
                  <DataTable<BenefitType>
                    rows={types}
                    rowKey={(row) => row.id}
                    columns={[
                      { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
                      { key: 'receipt', header: 'Requires Receipt', render: (row) => <YesNo value={row.requiresReceipt} /> },
                      { key: 'family', header: 'Family Claim', render: (row) => <YesNo value={row.allowsFamilyClaim} /> },
                      {
                        key: 'health',
                        header: 'Health Data',
                        render: (row) => (
                          <StatusBadge tone={row.containsHealthData ? 'err' : 'mute'}>
                            {row.containsHealthData ? 'Sensitive' : 'Standard'}
                          </StatusBadge>
                        ),
                      },
                      {
                        key: 'active',
                        header: 'Status',
                        render: (row) => (
                          <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>
                            {row.isActive ? 'Active' : 'Inactive'}
                          </StatusBadge>
                        ),
                      },
                    ]}
                    actions={(row) => (
                      <RowButton
                        onClick={() => {
                          setEditingType(row);
                          setTypeForm(true);
                        }}
                      >
                        Edit
                      </RowButton>
                    )}
                  />
                </Card>
              )}

              {settingsTab === 'entitlements' && (
                <Card>
                  <CardHead title="Entitlement per grade" sub="cnf_benefit_entitlement — hak tahunan per golongan" />
                  <DataTable<Entitlement>
                    rows={ENTITLEMENTS}
                    rowKey={(row) => row.id}
                    columns={[
                      { key: 'grade', header: 'Job Grade', strong: true, render: (row) => gradeName(row.jobGradeId) },
                      { key: 'type', header: 'Benefit Type', render: (row) => benefitTypeName(row.benefitTypeId) },
                      {
                        key: 'amount',
                        header: 'Annual Amount',
                        align: 'right',
                        render: (row) => <Money value={row.annualAmount} />,
                      },
                    ]}
                  />
                </Card>
              )}

              {settingsTab === 'relationships' && (
                <Card>
                  <CardHead
                    title="Family relationship whitelist"
                    sub="Menentukan kerabat mana yang boleh jadi beneficiary"
                  />
                  <DataTable<FamilyRelationshipRule>
                    rows={FAMILY_RELATIONSHIP_RULES}
                    rowKey={(row) => row.id}
                    columns={[
                      {
                        key: 'relationship',
                        header: 'Relationship',
                        strong: true,
                        render: (row) => RELATIONSHIP_LABEL[row.relationshipType],
                      },
                      {
                        key: 'eligible',
                        header: 'Eligibility',
                        render: (row) => (
                          <StatusBadge tone={row.isEligible ? 'ok' : 'mute'}>
                            {row.isEligible ? 'Eligible' : 'Not eligible'}
                          </StatusBadge>
                        ),
                      },
                      {
                        key: 'source',
                        header: 'Source',
                        muted: true,
                        render: () => 'employee-profile · mst_relative.relationship_type',
                      },
                    ]}
                  />
                </Card>
              )}
            </div>
          )}
        </div>
      </PageShell>

      <ClaimFormModal open={claimForm} onClose={() => setClaimForm(false)} />

      <ClaimDetailModal
        claim={detail?.claim ?? null}
        asApprover={detail?.asApprover ?? false}
        onClose={() => setDetail(null)}
        onReject={(claim) => {
          setDetail(null);
          setRejecting(claim);
        }}
      />

      <ClaimRejectModal
        claim={rejecting}
        onClose={() => setRejecting(null)}
        onBack={(claim) => {
          setRejecting(null);
          setDetail({ claim, asApprover: true });
        }}
      />

      <ClaimCancelModal claim={cancelling} onClose={() => setCancelling(null)} />

      <BenefitTypeFormModal open={typeForm} editing={editingType} onClose={() => setTypeForm(false)} />
      <BeneficiaryFormModal open={beneficiaryForm} onClose={() => setBeneficiaryForm(false)} />
    </>
  );
}
