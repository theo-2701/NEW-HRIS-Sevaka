import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Segmented } from '@/components/Segmented';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { GateDots, PeriodStatusBadge } from '@/features/salary-processing/components/ProcessingBits';
import { PeriodDetailCard } from '@/features/salary-processing/components/PeriodDetailCard';
import { usePeriods } from '@/features/salary-processing/hooks/useSalaryProcessing';
import { employeeName } from '@/features/salary-processing/mock-data';
import { periodLabel, periodName } from '@/features/salary-processing/rules';
import type { PayrollPeriod } from '@/features/salary-processing/types';
import {
  AuthorizeHandoverModal,
  BatchDecisionModal,
  LockPeriodModal,
  ProposalDecisionModal,
  ReexportModal,
  ReopenPeriodModal,
  TraitDecisionModal,
} from '@/features/payroll-authorization/components/AuthorizationModals';
import {
  useBatches,
  useDecidedProposals,
  useHandoverPending,
  usePickupLog,
  useProposalQueue,
  useReexportLog,
  useTraitQueue,
} from '@/features/payroll-authorization/hooks/usePayrollAuthorization';
import { COMPONENT_NAME, VIEWERS } from '@/features/payroll-authorization/mock-data';
import {
  canAuthorize,
  canLock,
  canReopen,
  isChecker,
  traitDecided,
} from '@/features/payroll-authorization/rules';
import {
  APPROVAL_STATE_LABEL,
  BATCH_STATUS_LABEL,
  GATE_RESULT_LABEL,
} from '@/features/payroll-authorization/types';
import type {
  Actor,
  ChangeBatch,
  HandoverPending,
  IndividualProposal,
  PickupLog,
  ReexportLog,
  SalaryComponent,
} from '@/features/payroll-authorization/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';

type Tab = 'periods' | 'proposals' | 'handover';
type ProposalView = 'traits' | 'individual' | 'batches';

const LIFECYCLE = [
  { status: 'CALCULATED' as const, note: 'Dihitung Payroll Officer; masih bisa dihitung ulang.' },
  { status: 'REVIEWED' as const, note: 'Sudah ditinjau Payroll Officer dan menunggu dikunci.' },
  { status: 'LOCKED' as const, note: 'Angkanya beku. Bisa dibuka kembali oleh pemegang kuncinya.' },
  { status: 'HANDED_OVER' as const, note: 'Diserahkan ke sistem klien. Status ini permanen.' },
];

/**
 * Payroll › Authorization & Handover — port `_prototype/payroll-doc-authorization.html`
 * (FSD-001-PAYROLL §2 · UIC-001-PAYROLL §3 · TSD-0.25 §12 / §15.1 / §15.6).
 *
 * Pemeriksa mengunci dan menyerahkan periode yang sudah ditinjau di Salary Processing,
 * memutuskan tiga jenis usulan gaji, dan memantau tabel jembatan penyerahan.
 */
export function PayrollAuthorizationPage() {
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);
  const checker = isChecker(actor);
  const [tab, setTab] = useState<Tab>('periods');
  const [proposalView, setProposalView] = useState<ProposalView>('traits');

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [locking, setLocking] = useState<PayrollPeriod | null>(null);
  const [reopening, setReopening] = useState<PayrollPeriod | null>(null);
  const [authorizing, setAuthorizing] = useState<PayrollPeriod | null>(null);

  const [decidingTrait, setDecidingTrait] = useState<SalaryComponent | null>(null);
  const [decidingProposal, setDecidingProposal] = useState<IndividualProposal | null>(null);
  const [decidingBatch, setDecidingBatch] = useState<ChangeBatch | null>(null);
  const [reexportOpen, setReexportOpen] = useState(false);

  const periods = usePeriods();
  const traits = useTraitQueue();
  const proposals = useProposalQueue();
  const decided = useDecidedProposals();
  const batches = useBatches();
  const pending = useHandoverPending();
  const pickups = usePickupLog();
  const reexports = useReexportLog();

  const periodList = useMemo(() => periods.data ?? [], [periods.data]);
  const selectedPeriod = periodList.find((row) => row.id === selectedPeriodId) ?? null;
  const pendingIds = (pending.data ?? []).map((row) => row.periodId);

  const pagedPeriods = usePagedRows(periodList);
  const pagedProposals = usePagedRows(proposals.data ?? []);
  const pagedDecided = usePagedRows(decided.data ?? []);

  const periodActions = (row: PayrollPeriod) => {
    const actions = [{ label: 'View Detail', onSelect: () => setSelectedPeriodId(row.id) }];
    if (canLock(row, actor)) actions.unshift({ label: 'Lock', onSelect: () => setLocking(row) });
    if (canAuthorize(row, actor)) actions.unshift({ label: 'Authorize handover', onSelect: () => setAuthorizing(row) });
    if (canReopen(row, actor)) actions.push({ label: 'Reopen', onSelect: () => setReopening(row) });
    return actions.length > 1 ? (
      <RowActions actions={actions} />
    ) : (
      <RowButton onClick={() => setSelectedPeriodId(row.id)}>View Detail</RowButton>
    );
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Payroll' }, { label: 'Authorization & Handover' }]}
        title="Authorization & Handover"
        description="Kunci periode yang sudah ditinjau, putuskan usulan perubahan gaji, dan pantau penyerahan angka ke sistem klien. Perhitungan dan penutupan temuan dilakukan Payroll Officer di menu Salary Processing."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={actor.employeeId}
              onValueChange={(value) => {
                const next = VIEWERS.find((row) => row.employeeId === value);
                if (next) setActor(next);
              }}
            >
              <SelectTrigger className="h-10 w-[300px]" aria-label="Viewing as">
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
            {checker && tab === 'handover' && <Button onClick={() => setReexportOpen(true)}>Request re-export</Button>}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'periods', label: 'Period', count: periodList.length },
              {
                value: 'proposals',
                label: 'Salary Proposals',
                count: (traits.data?.length ?? 0) + (proposals.data?.length ?? 0) + (batches.data?.filter((row) => row.status === 'MENUNGGU_PERSETUJUAN').length ?? 0),
              },
              { value: 'handover', label: 'Handover', count: pending.data?.length ?? 0 },
            ]}
          />

          {tab === 'periods' && (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHead title="Period lifecycle" sub="Empat status, dengan satu jalan mundur lewat buka kembali" />
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {LIFECYCLE.map((step) => (
                      <li key={step.status} className="flex items-start gap-3">
                        <PeriodStatusBadge status={step.status} />
                        <span className="font-body text-[13px] font-medium leading-normal text-fg-2">{step.note}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Card>
                  <CardHead title="Lock gates" sub="Dievaluasi berurutan setiap kali penguncian diminta" />
                  <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
                    <li className="font-body text-[13px] font-medium leading-normal text-fg-2">
                      <strong className="text-fg-1">Gate 1 · Time reconciliation</strong> — data kehadiran periode ini
                      cocok dengan sumbernya.
                    </li>
                    <li className="font-body text-[13px] font-medium leading-normal text-fg-2">
                      <strong className="text-fg-1">Gate 2 · Finance deduction pull</strong> — potongan dari Finance
                      sudah tertarik utuh.
                    </li>
                    <li className="font-body text-[13px] font-medium leading-normal text-fg-2">
                      <strong className="text-fg-1">Gate 3 · Param snapshot</strong> — sepuluh parameter periode sudah
                      dibekukan.
                    </li>
                    <li className="font-body text-[13px] font-medium leading-normal text-fg-3">
                      Pengunci juga wajib orang yang berbeda dari yang menjalankan perhitungan.
                    </li>
                  </ol>
                </Card>
              </div>

              <Card>
                <CardHead title="Payroll periods" sub="Aksi menyesuaikan status tiap baris" />
                <div className="flex flex-col">
                  <DataTable<PayrollPeriod>
                    rows={pagedPeriods.rows}
                    rowKey={(row) => row.id}
                    loading={periods.isLoading}
                    empty="Belum ada periode gaji."
                    columns={[
                      {
                        key: 'period',
                        header: 'Period',
                        strong: true,
                        nowrap: true,
                        render: (row) => (
                          <span className="flex flex-col gap-0.5">
                            <span className="font-mono text-xs">{periodLabel(row)}</span>
                            <span className="font-body text-[11px] font-medium text-fg-3">{periodName(row)}</span>
                          </span>
                        ),
                      },
                      { key: 'status', header: 'Status', render: (row) => <PeriodStatusBadge status={row.status} /> },
                      { key: 'gates', header: 'Gates 1 · 2 · 3', render: (row) => <GateDots period={row} /> },
                      {
                        key: 'calculated',
                        header: 'Calculated By',
                        muted: true,
                        nowrap: true,
                        render: (row) => `${employeeName(row.calculated.employeeId)} · ${formatDate(row.calculated.at)}`,
                      },
                      {
                        key: 'locked',
                        header: 'Locked By',
                        muted: true,
                        nowrap: true,
                        render: (row) => (row.locked ? `${employeeName(row.locked.employeeId)} · ${formatDate(row.locked.at)}` : '—'),
                      },
                      {
                        key: 'handed',
                        header: 'Handed Over',
                        muted: true,
                        nowrap: true,
                        render: (row) => (row.handedOver ? formatDate(row.handedOver.at) : '—'),
                      },
                    ]}
                    actions={periodActions}
                  />
                  <Pagination
                    page={pagedPeriods.page}
                    pageSize={pagedPeriods.pageSize}
                    total={pagedPeriods.total}
                    noun="periods"
                    onPageChange={pagedPeriods.setPage}
                    onPageSizeChange={pagedPeriods.setPageSize}
                  />
                </div>
              </Card>

              {selectedPeriod && (
                <PeriodDetailCard
                  actor={{ employeeId: actor.employeeId, role: 'ROLE_HR_MANAGER' }}
                  period={selectedPeriod}
                  onRecalculate={() => undefined}
                  onReview={() => undefined}
                  onOpenFindings={() => undefined}
                />
              )}
            </>
          )}

          {tab === 'proposals' && (
            <div className="flex flex-col gap-5">
              <Segmented<ProposalView>
                value={proposalView}
                onChange={setProposalView}
                options={[
                  { value: 'traits', label: 'Component traits' },
                  { value: 'individual', label: 'Individual' },
                  { value: 'batches', label: 'Bulk batches' },
                ]}
              />

              {proposalView === 'traits' && (
                <Card>
                  <CardHead
                    title="Trait proposals"
                    sub="Menyetujui mencatat keputusan; sifat barunya berlaku pada tanggal yang diusulkan"
                  />
                  <DataTable<SalaryComponent>
                    rows={traits.data ?? []}
                    rowKey={(row) => row.id}
                    loading={traits.isLoading}
                    empty="Tidak ada usulan sifat komponen yang menunggu keputusan."
                    columns={[
                      {
                        key: 'component',
                        header: 'Component',
                        strong: true,
                        render: (row) => `${row.componentCode} · ${row.name}`,
                      },
                      {
                        key: 'change',
                        header: 'Proposed Change',
                        render: (row) =>
                          `Dasar lembur: ${row.isOvertimeBasis ? 'Ya' : 'Tidak'} → ${row.proposedIsOvertimeBasis ? 'Ya' : 'Tidak'}`,
                      },
                      {
                        key: 'effective',
                        header: 'Effective From',
                        nowrap: true,
                        render: (row) => (row.proposedEffectiveFrom ? formatDate(row.proposedEffectiveFrom) : '—'),
                      },
                      {
                        key: 'proposed',
                        header: 'Proposed By',
                        muted: true,
                        nowrap: true,
                        render: (row) => `${employeeName(row.proposedBy)} · ${row.proposedAt ? formatDate(row.proposedAt) : '—'}`,
                      },
                      {
                        key: 'state',
                        header: 'Decision',
                        render: (row) =>
                          traitDecided(row) ? (
                            <StatusBadge tone="ok">Disetujui, menunggu tanggal berlaku</StatusBadge>
                          ) : (
                            <StatusBadge tone="warn">Menunggu keputusan</StatusBadge>
                          ),
                      },
                    ]}
                    actions={(row) =>
                      checker && !traitDecided(row) ? (
                        <RowButton onClick={() => setDecidingTrait(row)}>Decide</RowButton>
                      ) : (
                        <RowButton disabled>Decide</RowButton>
                      )
                    }
                  />
                </Card>
              )}

              {proposalView === 'individual' && (
                <div className="flex flex-col gap-5">
                  <Card>
                    <CardHead title="Waiting for decision" sub="Usulan nilai gaji per karyawan" />
                    <div className="flex flex-col">
                      <DataTable<IndividualProposal>
                        rows={pagedProposals.rows}
                        rowKey={(row) => row.id}
                        loading={proposals.isLoading}
                        empty="Tidak ada usulan yang menunggu keputusan."
                        columns={[
                          { key: 'id', header: 'ID', strong: true, nowrap: true, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
                          { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                          {
                            key: 'component',
                            header: 'Component',
                            render: (row) => `${row.salaryComponentId} · ${COMPONENT_NAME[row.salaryComponentId] ?? '—'}`,
                          },
                          {
                            key: 'amount',
                            header: 'Proposed Amount',
                            align: 'right',
                            render: (row) => <span className="tabular-nums">{formatCurrency(row.amount)}</span>,
                          },
                          { key: 'effective', header: 'Effective From', nowrap: true, render: (row) => formatDate(row.effectiveFrom) },
                          {
                            key: 'proposed',
                            header: 'Proposed By',
                            muted: true,
                            nowrap: true,
                            render: (row) => `${employeeName(row.createdBy)} · ${formatDate(row.createdAt)}`,
                          },
                        ]}
                        actions={(row) =>
                          checker ? (
                            <RowButton onClick={() => setDecidingProposal(row)}>Decide</RowButton>
                          ) : (
                            <RowButton disabled>Decide</RowButton>
                          )
                        }
                      />
                      <Pagination
                        page={pagedProposals.page}
                        pageSize={pagedProposals.pageSize}
                        total={pagedProposals.total}
                        noun="proposals"
                        onPageChange={pagedProposals.setPage}
                        onPageSizeChange={pagedProposals.setPageSize}
                      />
                    </div>
                  </Card>

                  <Card>
                    <CardHead title="Decided proposals" sub="Riwayat usulan yang sudah disetujui atau ditolak" />
                    <div className="flex flex-col">
                      <DataTable<IndividualProposal>
                        rows={pagedDecided.rows}
                        rowKey={(row) => row.id}
                        loading={decided.isLoading}
                        empty="Belum ada usulan yang diputuskan."
                        columns={[
                          { key: 'id', header: 'ID', strong: true, nowrap: true, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
                          { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                          {
                            key: 'amount',
                            header: 'Amount',
                            align: 'right',
                            render: (row) => <span className="tabular-nums">{formatCurrency(row.amount)}</span>,
                          },
                          {
                            key: 'state',
                            header: 'Decision',
                            render: (row) => (
                              <StatusBadge tone={row.approvalState === 'DISETUJUI' ? 'ok' : 'err'}>
                                {APPROVAL_STATE_LABEL[row.approvalState]}
                              </StatusBadge>
                            ),
                          },
                          {
                            key: 'decided',
                            header: 'Decided By',
                            muted: true,
                            nowrap: true,
                            render: (row) => `${employeeName(row.approvedBy)} · ${row.approvedAt ? formatDate(row.approvedAt) : '—'}`,
                          },
                          {
                            key: 'reason',
                            header: 'Rejection Reason',
                            muted: true,
                            render: (row) => row.rejectionReason ?? '—',
                          },
                        ]}
                      />
                      <Pagination
                        page={pagedDecided.page}
                        pageSize={pagedDecided.pageSize}
                        total={pagedDecided.total}
                        noun="proposals"
                        onPageChange={pagedDecided.setPage}
                        onPageSizeChange={pagedDecided.setPageSize}
                      />
                    </div>
                  </Card>
                </div>
              )}

              {proposalView === 'batches' && (
                <Card>
                  <CardHead
                    title="Bulk salary changes"
                    sub="Ringkasan dampaknya dibekukan saat kumpulan diajukan, bukan dihitung ulang"
                  />
                  <DataTable<ChangeBatch>
                    rows={batches.data ?? []}
                    rowKey={(row) => row.id}
                    loading={batches.isLoading}
                    empty="Tidak ada kumpulan perubahan gaji."
                    columns={[
                      { key: 'name', header: 'Batch', strong: true, render: (row) => row.batchName },
                      {
                        key: 'status',
                        header: 'Status',
                        render: (row) => (
                          <StatusBadge
                            tone={row.status === 'DISETUJUI' ? 'ok' : row.status === 'DITOLAK' ? 'err' : 'warn'}
                          >
                            {BATCH_STATUS_LABEL[row.status]}
                          </StatusBadge>
                        ),
                      },
                      {
                        key: 'escalation',
                        header: 'Escalation',
                        render: (row) =>
                          row.requiresEscalation ? (
                            <StatusBadge tone="warn">Perlu penyetuju eskalasi</StatusBadge>
                          ) : (
                            <span className="text-fg-4">—</span>
                          ),
                      },
                      {
                        key: 'affected',
                        header: 'Affected',
                        align: 'center',
                        render: (row) => row.impactSummary?.affectedCount ?? row.items.length,
                      },
                      {
                        key: 'cost',
                        header: 'Net Cost Shift',
                        align: 'right',
                        render: (row) => (
                          <span className="tabular-nums">{formatCurrency(row.impactSummary?.netCostShiftAmount ?? 0)}</span>
                        ),
                      },
                      {
                        key: 'proposed',
                        header: 'Proposed By',
                        muted: true,
                        nowrap: true,
                        render: (row) => (row.createdBy ? `${employeeName(row.createdBy)} · ${formatDate(row.createdAt ?? '')}` : '—'),
                      },
                    ]}
                    actions={(row) =>
                      row.status === 'MENUNGGU_PERSETUJUAN' ? (
                        <RowButton onClick={() => setDecidingBatch(row)}>Decide</RowButton>
                      ) : (
                        <RowButton disabled>Decide</RowButton>
                      )
                    }
                  />
                </Card>
              )}
            </div>
          )}

          {tab === 'handover' && (
            <div className="flex flex-col gap-5">
              <Card>
                <CardHead title="Waiting to be collected" sub="Baris jembatan yang belum diambil sistem klien" />
                <DataTable<HandoverPending>
                  rows={pending.data ?? []}
                  rowKey={(row) => row.periodId}
                  loading={pending.isLoading}
                  empty="Tidak ada baris yang menunggu diambil."
                  columns={[
                    {
                      key: 'period',
                      header: 'Period',
                      strong: true,
                      nowrap: true,
                      render: (row) => {
                        const period = periodList.find((item) => item.id === row.periodId);
                        return period ? `${periodLabel(period)} · ${periodName(period)}` : row.periodId;
                      },
                    },
                    { key: 'count', header: 'Employees', align: 'center', render: (row) => row.employeeCount },
                    {
                      key: 'created',
                      header: 'Available Since',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDateTime(row.createdAt),
                    },
                  ]}
                />
              </Card>

              <Card>
                <CardHead title="Pickup history" sub="Diambil sistem klien, bukan oleh orang" />
                <DataTable<PickupLog>
                  rows={pickups.data ?? []}
                  rowKey={(row) => row.id}
                  loading={pickups.isLoading}
                  empty="Belum ada pengambilan."
                  columns={[
                    {
                      key: 'period',
                      header: 'Period',
                      strong: true,
                      nowrap: true,
                      render: (row) => {
                        const period = periodList.find((item) => item.id === row.periodId);
                        return period ? periodLabel(period) : row.periodId;
                      },
                    },
                    {
                      key: 'machine',
                      header: 'Client System',
                      render: (row) => <span className="font-mono text-xs">{row.clientMachineIdentity}</span>,
                    },
                    { key: 'count', header: 'Employees', align: 'center', render: (row) => row.employeeCountPicked },
                    {
                      key: 'at',
                      header: 'Collected At',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDateTime(row.createdAt),
                    },
                  ]}
                />
              </Card>

              <Card>
                <CardHead title="Re-export history" sub="Alasan tetap tercatat meski permintaannya ditolak gerbang" />
                <DataTable<ReexportLog>
                  rows={reexports.data ?? []}
                  rowKey={(row) => row.id}
                  loading={reexports.isLoading}
                  empty="Belum ada permintaan ekspor ulang."
                  columns={[
                    { key: 'id', header: 'ID', strong: true, nowrap: true, render: (row) => <span className="font-mono text-xs">{row.id}</span> },
                    {
                      key: 'period',
                      header: 'Period',
                      nowrap: true,
                      render: (row) => {
                        const period = periodList.find((item) => item.id === row.periodId);
                        return period ? periodLabel(period) : row.periodId;
                      },
                    },
                    {
                      key: 'gate',
                      header: 'Result',
                      render: (row) => (
                        <StatusBadge tone={row.gateResult === 'DISETUJUI' ? 'ok' : 'err'}>
                          {GATE_RESULT_LABEL[row.gateResult]}
                        </StatusBadge>
                      ),
                    },
                    { key: 'reason', header: 'Reason', render: (row) => row.reasonText },
                    {
                      key: 'by',
                      header: 'Requested By',
                      muted: true,
                      nowrap: true,
                      render: (row) => `${employeeName(row.createdBy)} · ${formatDate(row.createdAt)}`,
                    },
                  ]}
                />
              </Card>

              <Card>
                <CardHead title="How a handover ends" sub="Tiga langkah, dua di antaranya dilakukan sistem klien" />
                <KeyValueList>
                  <KeyValueRow label="1 · Diotorisasi">
                    Pemeriksa menyerahkan periode, lalu barisnya muncul di daftar menunggu.
                  </KeyValueRow>
                  <KeyValueRow label="2 · Diambil">
                    Sistem klien menarik barisnya; barisnya hilang dari daftar menunggu dan tercatat di riwayat.
                  </KeyValueRow>
                  <KeyValueRow label="3 · Ekspor ulang">
                    Hanya bila klien memintanya, dan hanya setelah barisnya diambil.
                  </KeyValueRow>
                </KeyValueList>
              </Card>
            </div>
          )}
        </div>
      </PageShell>

      <LockPeriodModal actor={actor} period={locking} onClose={() => setLocking(null)} />
      <ReopenPeriodModal actor={actor} period={reopening} onClose={() => setReopening(null)} />
      <AuthorizeHandoverModal actor={actor} period={authorizing} onClose={() => setAuthorizing(null)} />

      <TraitDecisionModal actor={actor} component={decidingTrait} onClose={() => setDecidingTrait(null)} />
      <ProposalDecisionModal actor={actor} proposal={decidingProposal} onClose={() => setDecidingProposal(null)} />
      <BatchDecisionModal actor={actor} batch={decidingBatch} onClose={() => setDecidingBatch(null)} />

      <ReexportModal
        actor={actor}
        open={reexportOpen}
        periods={periodList}
        pendingPeriodIds={pendingIds}
        onClose={() => setReexportOpen(false)}
      />
    </>
  );
}
