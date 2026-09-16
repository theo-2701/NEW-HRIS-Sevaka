import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { EMPLOYEES, employeeName } from '@/features/salary-processing/mock-data';
import type { BatchItem, ChangeBatch, SalaryComponent } from '@/features/payroll-authorization/types';
import { BATCH_STATUS_LABEL } from '@/features/payroll-authorization/types';
import {
  BatchFormModal,
  BatchItemModal,
  ComponentFormModal,
  SubmitBatchModal,
  TraitProposalModal,
  ValueProposalModal,
} from '@/features/salary-settings/components/SettingsModals';
import {
  useComponents,
  useDeleteBatch,
  useDeleteComponent,
  useEmployeeValues,
  useRemoveBatchItem,
  useSettingsBatches,
  useUmpAttestations,
} from '@/features/salary-settings/hooks/useSalarySettings';
import { BULK_ESCALATION_THRESHOLD, VIEWERS } from '@/features/salary-settings/mock-data';
import { canEditBatch, isMaker, regionalWageOf } from '@/features/salary-settings/rules';
import {
  CHECK_POINT_LABEL,
  SOURCE_CHANNEL_LABEL,
  UMP_REASON_LABEL,
} from '@/features/salary-settings/types';
import type {
  Actor,
  EmployeeValueRow,
  UmpAttestation,
  UmpCheckPoint,
} from '@/features/salary-settings/types';
import { formatCurrency, formatDate } from '@/lib/format';

type Tab = 'catalog' | 'values' | 'batches' | 'ump';

const YES_NO = (value: boolean) => (value ? 'Ya' : 'Tidak');

/**
 * Payroll › Salary Settings — port `_prototype/payroll-doc-settings.html`
 * (FSD-001-PAYROLL §3 · UIC-001-PAYROLL §4 · TSD-0.25 §15.1).
 *
 * Menu Penjalan: menyusun katalog komponen, mengajukan perubahan nilai per karyawan, dan
 * menyusun kumpulan perubahan massal. Keputusan atas semua usulan itu ada di menu
 * Authorization & Handover.
 */
export function SalarySettingsPage() {
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);
  const maker = isMaker(actor);
  const [tab, setTab] = useState<Tab>('catalog');

  const [search, setSearch] = useState('');
  const [componentForm, setComponentForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [proposingTrait, setProposingTrait] = useState<SalaryComponent | null>(null);
  const [deletingComponent, setDeletingComponent] = useState<SalaryComponent | null>(null);

  const [employeeId, setEmployeeId] = useState('pay-indah');
  const [valueFormOpen, setValueFormOpen] = useState(false);

  const [batchForm, setBatchForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [addingMemberTo, setAddingMemberTo] = useState<ChangeBatch | null>(null);
  const [submittingBatch, setSubmittingBatch] = useState<ChangeBatch | null>(null);
  const [deletingBatch, setDeletingBatch] = useState<ChangeBatch | null>(null);

  const [checkPoint, setCheckPoint] = useState<UmpCheckPoint | 'ALL'>('ALL');

  const componentFilter = useMemo(() => ({ search: search.trim() || undefined }), [search]);
  const components = useComponents(componentFilter);
  const allComponents = useComponents();
  const values = useEmployeeValues(employeeId);
  const batches = useSettingsBatches();
  const umpFilter = useMemo(() => (checkPoint === 'ALL' ? {} : { checkPoint }), [checkPoint]);
  const attestations = useUmpAttestations(umpFilter);

  const removeItem = useRemoveBatchItem();
  const deleteComponent = useDeleteComponent();
  const deleteBatch = useDeleteBatch();

  const batchList = batches.data ?? [];
  const selectedBatch = batchList.find((row) => row.id === selectedBatchId) ?? null;

  const pagedComponents = usePagedRows(components.data ?? []);
  const pagedAttestations = usePagedRows(attestations.data ?? []);

  const componentActions = (row: SalaryComponent) => {
    if (!maker) return <RowButton disabled>Action</RowButton>;
    const actions = [
      { label: 'Rename', onSelect: () => {
        setEditingComponent(row);
        setComponentForm(true);
      } },
      { label: 'Propose trait change', onSelect: () => setProposingTrait(row) },
      { label: 'Delete', danger: true, onSelect: () => setDeletingComponent(row) },
    ];
    return <RowActions actions={actions} />;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Payroll' }, { label: 'Salary Settings' }]}
        title="Salary Settings"
        description="Susun katalog komponen gaji, ajukan perubahan nilai per karyawan, dan siapkan kumpulan perubahan massal. Semua usulan di sini diputuskan HR Manager di menu Authorization & Handover."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={actor.employeeId}
              onValueChange={(value) => {
                const next = VIEWERS.find((row) => row.employeeId === value);
                if (next) setActor(next);
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
            {maker && tab === 'catalog' && (
              <Button
                onClick={() => {
                  setEditingComponent(null);
                  setComponentForm(true);
                }}
              >
                New component
              </Button>
            )}
            {maker && tab === 'values' && <Button onClick={() => setValueFormOpen(true)}>Propose change</Button>}
            {maker && tab === 'batches' && <Button onClick={() => setBatchForm(true)}>New bulk change</Button>}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'catalog', label: 'Component Catalog', count: components.data?.length ?? 0 },
              { value: 'values', label: 'Per-employee Values' },
              { value: 'batches', label: 'Bulk Changes', count: batchList.length },
              { value: 'ump', label: 'UMP Attestation Log', count: attestations.data?.length ?? 0 },
            ]}
          />

          {tab === 'catalog' && (
            <Card>
              <CardHead
                title="Salary components"
                sub="Nama bisa diubah langsung; keempat sifatnya hanya lewat pengajuan usulan"
              />
              <div className="flex flex-col">
                <TableToolbar
                  search={{
                    value: search,
                    onChange: (value) => {
                      setSearch(value);
                      pagedComponents.resetPage();
                    },
                    placeholder: 'Search code or name',
                  }}
                />
                <DataTable<SalaryComponent>
                  rows={pagedComponents.rows}
                  rowKey={(row) => row.id}
                  loading={components.isLoading}
                  empty="Belum ada komponen gaji."
                  columns={[
                    {
                      key: 'code',
                      header: 'Code',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.componentCode}</span>,
                    },
                    { key: 'name', header: 'Name', render: (row) => row.name },
                    { key: 'fixed', header: 'Tetap', align: 'center', render: (row) => YES_NO(row.isFixed) },
                    { key: 'overtime', header: 'Dasar Lembur', align: 'center', render: (row) => YES_NO(row.isOvertimeBasis) },
                    { key: 'tax', header: 'Kena Pajak', align: 'center', render: (row) => YES_NO(row.isTaxable) },
                    { key: 'bpjs', header: 'Kena BPJS', align: 'center', render: (row) => YES_NO(row.isBpjsDeductible) },
                    {
                      key: 'state',
                      header: 'Proposal',
                      render: (row) =>
                        row.proposalState === 'AKTIF' ? (
                          <StatusBadge tone="ok">AKTIF</StatusBadge>
                        ) : (
                          <StatusBadge tone="warn">MENUNGGU PERSETUJUAN</StatusBadge>
                        ),
                    },
                    { key: 'used', header: 'Dipakai', align: 'center', muted: true, render: (row) => row.usedByEmployees },
                  ]}
                  actions={componentActions}
                />
                <Pagination
                  page={pagedComponents.page}
                  pageSize={pagedComponents.pageSize}
                  total={pagedComponents.total}
                  noun="components"
                  onPageChange={pagedComponents.setPage}
                  onPageSizeChange={pagedComponents.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'values' && (
            <Card>
              <CardHead title="Per-employee values" sub="Riwayat nilai gaji beserta usulan yang sedang menunggu" />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Select value={employeeId} onValueChange={setEmployeeId}>
                      <SelectTrigger className="h-10 w-[240px]" aria-label="Employee">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(EMPLOYEES).map(([id, employee]) => (
                          <SelectItem key={id} value={id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                  summary={`Upah minimum cabang ${formatCurrency(regionalWageOf(employeeId))}`}
                />
                <DataTable<EmployeeValueRow>
                  rows={values.data ?? []}
                  rowKey={(row) => row.id}
                  loading={values.isLoading}
                  empty="Karyawan ini belum punya nilai gaji tercatat."
                  columns={[
                    {
                      key: 'component',
                      header: 'Component',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.salaryComponentId}</span>,
                    },
                    {
                      key: 'amount',
                      header: 'Amount',
                      align: 'right',
                      render: (row) => <span className="tabular-nums">{formatCurrency(row.amount)}</span>,
                    },
                    { key: 'from', header: 'Effective From', nowrap: true, render: (row) => formatDate(row.effectiveFrom) },
                    {
                      key: 'until',
                      header: 'Until',
                      nowrap: true,
                      muted: true,
                      render: (row) => (row.effectiveUntil ? formatDate(row.effectiveUntil) : '—'),
                    },
                    {
                      key: 'state',
                      header: 'Status',
                      render: (row) =>
                        row.approvalState === 'DISETUJUI' ? (
                          <StatusBadge tone={row.isCurrent ? 'ok' : 'mute'}>
                            {row.isCurrent ? 'BERLAKU' : 'RIWAYAT'}
                          </StatusBadge>
                        ) : row.approvalState === 'DITOLAK' ? (
                          <StatusBadge tone="err">DITOLAK</StatusBadge>
                        ) : (
                          <StatusBadge tone="warn">MENUNGGU PERSETUJUAN</StatusBadge>
                        ),
                    },
                    {
                      key: 'channel',
                      header: 'Channel',
                      muted: true,
                      render: (row) => SOURCE_CHANNEL_LABEL[row.sourceChannel],
                    },
                  ]}
                />
              </div>
            </Card>
          )}

          {tab === 'batches' && (
            <div className="flex flex-col gap-5">
              <Card>
                <CardHead
                  title="Bulk salary changes"
                  sub={`Kumpulan dengan lebih dari ${BULK_ESCALATION_THRESHOLD} karyawan perlu penyetuju eskalasi`}
                />
                <DataTable<ChangeBatch>
                  rows={batchList}
                  rowKey={(row) => row.id}
                  loading={batches.isLoading}
                  empty="Belum ada kumpulan perubahan."
                  columns={[
                    { key: 'name', header: 'Batch', strong: true, render: (row) => row.batchName },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <StatusBadge
                          tone={
                            row.status === 'DISETUJUI'
                              ? 'ok'
                              : row.status === 'DITOLAK'
                                ? 'err'
                                : row.status === 'DRAFT'
                                  ? 'mute'
                                  : 'warn'
                          }
                        >
                          {BATCH_STATUS_LABEL[row.status]}
                        </StatusBadge>
                      ),
                    },
                    { key: 'members', header: 'Members', align: 'center', render: (row) => row.items.length },
                    {
                      key: 'delta',
                      header: 'Monthly Change',
                      align: 'right',
                      render: (row) => (
                        <span className="tabular-nums">
                          {formatCurrency(row.items.reduce((total, item) => total + item.amountDelta, 0))}
                        </span>
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
                      key: 'created',
                      header: 'Created',
                      muted: true,
                      nowrap: true,
                      render: (row) => (row.createdAt ? formatDate(row.createdAt) : '—'),
                    },
                  ]}
                  actions={(row) => {
                    if (!maker || !canEditBatch(row)) {
                      return <RowButton onClick={() => setSelectedBatchId(row.id)}>View Detail</RowButton>;
                    }
                    return (
                      <RowActions
                        actions={[
                          { label: 'Open draft', onSelect: () => setSelectedBatchId(row.id) },
                          { label: 'Add member', onSelect: () => setAddingMemberTo(row) },
                          { label: 'Lock & submit', onSelect: () => setSubmittingBatch(row) },
                          { label: 'Delete draft', danger: true, onSelect: () => setDeletingBatch(row) },
                        ]}
                      />
                    );
                  }}
                />
              </Card>

              {selectedBatch && (
                <Card>
                  <CardHead
                    title={selectedBatch.batchName}
                    sub={
                      selectedBatch.status === 'DRAFT'
                        ? 'Masih draft — anggotanya masih bisa diubah'
                        : 'Sudah dikunci; ringkasan dampaknya dibekukan saat diajukan'
                    }
                    action={
                      maker && canEditBatch(selectedBatch) ? (
                        <div className="flex flex-wrap items-center gap-2.5">
                          <Button variant="secondary" onClick={() => setAddingMemberTo(selectedBatch)}>
                            Add member
                          </Button>
                          <Button onClick={() => setSubmittingBatch(selectedBatch)}>Lock &amp; submit</Button>
                        </div>
                      ) : undefined
                    }
                  />

                  {selectedBatch.impactSummary && (
                    <KeyValueList>
                      <KeyValueRow label="Affected">{selectedBatch.impactSummary.affectedCount} karyawan</KeyValueRow>
                      <KeyValueRow label="Net cost shift">
                        {formatCurrency(selectedBatch.impactSummary.netCostShiftAmount)} / bulan
                      </KeyValueRow>
                      <KeyValueRow label="Gaji turun">
                        {selectedBatch.impactSummary.salaryDecreaseList.join(', ') || 'Tidak ada'}
                      </KeyValueRow>
                      <KeyValueRow label="Di bawah UMP setelah perubahan">
                        {selectedBatch.impactSummary.belowUmpAfterChangeList.join(', ') || 'Tidak ada'}
                      </KeyValueRow>
                      <KeyValueRow label="Tanpa cost center / SBU">
                        {selectedBatch.impactSummary.missingCostCenterOrSbuList.join(', ') || 'Tidak ada'}
                      </KeyValueRow>
                    </KeyValueList>
                  )}

                  <DataTable<BatchItem>
                    rows={selectedBatch.items}
                    rowKey={(row) => `${row.employeeId}-${row.salaryComponentId}`}
                    empty="Kumpulan ini belum punya anggota."
                    columns={[
                      { key: 'employee', header: 'Employee', strong: true, render: (row) => employeeName(row.employeeId) },
                      {
                        key: 'component',
                        header: 'Component',
                        render: (row) => <span className="font-mono text-xs">{row.salaryComponentId}</span>,
                      },
                      {
                        key: 'delta',
                        header: 'Monthly Change',
                        align: 'right',
                        render: (row) => <span className="tabular-nums">{formatCurrency(row.amountDelta)}</span>,
                      },
                    ]}
                    actions={
                      maker && canEditBatch(selectedBatch)
                        ? (row) => (
                            <RowButton
                              variant="danger"
                              disabled={removeItem.isPending}
                              onClick={() =>
                                removeItem.mutate({
                                  actor,
                                  id: selectedBatch.id,
                                  employeeId: row.employeeId,
                                  componentId: row.salaryComponentId,
                                })
                              }
                            >
                              Remove
                            </RowButton>
                          )
                        : undefined
                    }
                  />
                </Card>
              )}
            </div>
          )}

          {tab === 'ump' && (
            <Card>
              <CardHead
                title="UMP attestation log"
                sub="Baca saja — barisnya lahir otomatis saat pengajuan atau saat periode dijalankan"
              />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Select
                      value={checkPoint}
                      onValueChange={(value) => {
                        setCheckPoint(value as UmpCheckPoint | 'ALL');
                        pagedAttestations.resetPage();
                      }}
                    >
                      <SelectTrigger className="h-10 w-[240px]" aria-label="Check point">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua titik pemeriksaan</SelectItem>
                        <SelectItem value="PENETAPAN_ATAU_PERUBAHAN">Penetapan / perubahan</SelectItem>
                        <SelectItem value="PERIODE_DIJALANKAN">Periode dijalankan</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                />
                <DataTable<UmpAttestation>
                  rows={pagedAttestations.rows}
                  rowKey={(row) => row.id}
                  loading={attestations.isLoading}
                  empty="Belum ada pemeriksaan UMP."
                  columns={[
                    { key: 'employee', header: 'Employee', strong: true, render: (row) => employeeName(row.employeeId) },
                    {
                      key: 'check',
                      header: 'Check Point',
                      render: (row) => (
                        <StatusBadge tone={row.checkPoint === 'PENETAPAN_ATAU_PERUBAHAN' ? 'info' : 'mute'}>
                          {CHECK_POINT_LABEL[row.checkPoint]}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'wage',
                      header: 'Branch UMP',
                      align: 'right',
                      render: (row) => <span className="tabular-nums">{formatCurrency(row.regionalWageCompared)}</span>,
                    },
                    {
                      key: 'base',
                      header: 'Salary Base',
                      align: 'right',
                      render: (row) => <span className="tabular-nums">{formatCurrency(row.salaryBaseCompared)}</span>,
                    },
                    {
                      key: 'below',
                      header: 'Below UMP',
                      align: 'center',
                      render: (row) =>
                        row.isBelowUmp ? <StatusBadge tone="warn">Ya</StatusBadge> : <StatusBadge tone="ok">Tidak</StatusBadge>,
                    },
                    {
                      key: 'reason',
                      header: 'Reason',
                      render: (row) => (row.selectedReason ? UMP_REASON_LABEL[row.selectedReason] : '—'),
                    },
                    {
                      key: 'created',
                      header: 'Recorded',
                      muted: true,
                      nowrap: true,
                      render: (row) => `${employeeName(row.createdBy)} · ${formatDate(row.createdAt)}`,
                    },
                  ]}
                />
                <Pagination
                  page={pagedAttestations.page}
                  pageSize={pagedAttestations.pageSize}
                  total={pagedAttestations.total}
                  noun="records"
                  onPageChange={pagedAttestations.setPage}
                  onPageSizeChange={pagedAttestations.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <ComponentFormModal
        actor={actor}
        open={componentForm}
        editing={editingComponent}
        onClose={() => {
          setComponentForm(false);
          setEditingComponent(null);
        }}
      />
      <TraitProposalModal actor={actor} component={proposingTrait} onClose={() => setProposingTrait(null)} />
      <ConfirmDialog
        open={Boolean(deletingComponent)}
        title="Hapus komponen gaji?"
        description={`${deletingComponent?.componentCode ?? ''} akan dihapus. Komponen yang sudah dipakai nilai gaji karyawan tidak bisa dihapus.`}
        loading={deleteComponent.isPending}
        onOpenChange={(open) => !open && setDeletingComponent(null)}
        onConfirm={() =>
          deletingComponent &&
          deleteComponent.mutate(
            { actor, id: deletingComponent.id },
            { onSuccess: () => setDeletingComponent(null), onError: () => setDeletingComponent(null) },
          )
        }
      />

      <ValueProposalModal
        actor={actor}
        open={valueFormOpen}
        employeeId={employeeId}
        components={allComponents.data ?? []}
        onClose={() => setValueFormOpen(false)}
      />

      <BatchFormModal actor={actor} open={batchForm} onClose={() => setBatchForm(false)} />
      <BatchItemModal
        actor={actor}
        batch={addingMemberTo}
        components={allComponents.data ?? []}
        onClose={() => setAddingMemberTo(null)}
      />
      <SubmitBatchModal actor={actor} batch={submittingBatch} onClose={() => setSubmittingBatch(null)} />
      <ConfirmDialog
        open={Boolean(deletingBatch)}
        title="Batalkan kumpulan draft?"
        description={`${deletingBatch?.batchName ?? ''} akan dihapus beserta anggotanya.`}
        loading={deleteBatch.isPending}
        onOpenChange={(open) => !open && setDeletingBatch(null)}
        onConfirm={() =>
          deletingBatch &&
          deleteBatch.mutate(
            { actor, id: deletingBatch.id },
            {
              onSuccess: () => {
                if (selectedBatchId === deletingBatch.id) setSelectedBatchId(null);
                setDeletingBatch(null);
              },
              onError: () => setDeletingBatch(null),
            },
          )
        }
      />
    </>
  );
}
