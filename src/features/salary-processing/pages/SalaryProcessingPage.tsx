import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Segmented } from '@/components/Segmented';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  FinalStateBadge,
  FindingTypeTag,
  GateDots,
  Money,
  PeriodStatusBadge,
} from '@/features/salary-processing/components/ProcessingBits';
import {
  BulkResolveModal,
  FindingDetailModal,
  ImportDetailModal,
  ImportFormModal,
  ResolveFindingModal,
  ReviewPeriodModal,
  RunPeriodModal,
} from '@/features/salary-processing/components/ProcessingModals';
import { PeriodDetailCard } from '@/features/salary-processing/components/PeriodDetailCard';
import { useFindings, useImports, usePeriods } from '@/features/salary-processing/hooks/useSalaryProcessing';
import { EMPLOYEES, FINDING_TYPE_INFO, VIEWERS, employeeName } from '@/features/salary-processing/mock-data';
import { firstPeriodMonth, isPayrollOfficer, periodLabel, periodName } from '@/features/salary-processing/rules';
import { FINAL_STATE_LABEL, PERIOD_STATUSES, PERIOD_STATUS_LABEL } from '@/features/salary-processing/types';
import type {
  Actor,
  FinalStateFilter,
  Finding,
  FindingType,
  FindingTypeInfo,
  HistoryImport,
  ImportFilter,
  PayrollPeriod,
  PeriodStatus,
} from '@/features/salary-processing/types';
import { formatDate } from '@/lib/format';

type Tab = 'periods' | 'findings' | 'imports';
type FindingView = 'list' | 'types';
type ImportStatus = 'ACTIVE' | 'UNVERIFIED' | 'VERIFIED' | 'SUPERSEDED';

interface FindingFilterState {
  findingTypes: FindingType[];
  finalStates: FinalStateFilter[];
  employeeId: string;
}

const EMPTY_FINDING_FILTER: FindingFilterState = { findingTypes: [], finalStates: [], employeeId: 'ALL' };

const IMPORT_STATUS_LABEL: Record<ImportStatus, string> = {
  ACTIVE: 'Active rows',
  UNVERIFIED: 'Waiting verification',
  VERIFIED: 'Verified',
  SUPERSEDED: 'Superseded',
};

const importFilterOf = (employeeId: string, status: ImportStatus): ImportFilter => ({
  employeeId: employeeId === 'ALL' ? undefined : employeeId,
  isActive: status === 'SUPERSEDED' ? false : true,
  verified: status === 'UNVERIFIED' ? false : status === 'VERIFIED' ? true : undefined,
});

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

/**
 * Payroll › Salary Processing — port `_prototype/payroll-doc-processing.html`
 * (FSD-001-PAYROLL §1 · UIC-001-PAYROLL §2 · TSD-001-PAYROLL-0.25 §15.2 / §15.7).
 *
 * Penjalan menjalankan dan meninjau periode, menutup temuan, dan mengimpor riwayat penggajian.
 * Mengunci, membuka kembali, dan mengotorisasi penyerahan milik menu Authorization & Handover.
 */
export function SalaryProcessingPage() {
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);
  const officer = isPayrollOfficer(actor);
  const [tab, setTab] = useState<Tab>('periods');

  const [statusFilter, setStatusFilter] = useState<PeriodStatus | 'ALL'>('ALL');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [runOpen, setRunOpen] = useState(false);
  const [recalculating, setRecalculating] = useState<PayrollPeriod | null>(null);
  const [reviewing, setReviewing] = useState<PayrollPeriod | null>(null);

  const [findingView, setFindingView] = useState<FindingView>('list');
  const [findingPeriodId, setFindingPeriodId] = useState<string | null>(null);
  const [findingFilter, setFindingFilter] = useState<FindingFilterState>(EMPTY_FINDING_FILTER);
  const [findingFilterOpen, setFindingFilterOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [findingDetail, setFindingDetail] = useState<Finding | null>(null);
  const [resolving, setResolving] = useState<Finding | null>(null);
  const [bulkRows, setBulkRows] = useState<Finding[]>([]);

  const [importEmployee, setImportEmployee] = useState('ALL');
  const [importStatus, setImportStatus] = useState<ImportStatus>('ACTIVE');
  const [importFormOpen, setImportFormOpen] = useState(false);
  const [correcting, setCorrecting] = useState<HistoryImport | null>(null);
  const [importDetail, setImportDetail] = useState<HistoryImport | null>(null);

  const allPeriods = usePeriods();
  const periodFilter = useMemo(() => (statusFilter === 'ALL' ? {} : { statuses: [statusFilter] }), [statusFilter]);
  const periods = usePeriods(periodFilter);

  const periodList = useMemo(() => allPeriods.data ?? [], [allPeriods.data]);
  const selectedPeriod = periodList.find((row) => row.id === selectedPeriodId) ?? null;
  const activeFindingPeriod = findingPeriodId ?? periodList[0]?.id ?? null;

  const findingQuery = useMemo(
    () => ({
      findingTypes: findingFilter.findingTypes.length ? findingFilter.findingTypes : undefined,
      finalStates: findingFilter.finalStates.length ? findingFilter.finalStates : undefined,
      employeeId: findingFilter.employeeId === 'ALL' ? undefined : findingFilter.employeeId,
    }),
    [findingFilter],
  );
  const findings = useFindings(activeFindingPeriod, findingQuery);
  const openFindingsCount = useFindings(activeFindingPeriod, { finalStates: ['OPEN'] }).data?.length ?? 0;
  const importQuery = useMemo(() => importFilterOf(importEmployee, importStatus), [importEmployee, importStatus]);
  const imports = useImports(importQuery);

  const pagedPeriods = usePagedRows(periods.data ?? []);
  const pagedFindings = usePagedRows(findings.data ?? []);
  const pagedImports = usePagedRows(imports.data ?? []);

  useEffect(() => {
    setPicked([]);
  }, [activeFindingPeriod, findingQuery, actor]);

  const findingRows = findings.data ?? [];
  const pickedRows = findingRows.filter((row) => picked.includes(row.id));
  const filterCount =
    findingFilter.findingTypes.length + findingFilter.finalStates.length + (findingFilter.employeeId === 'ALL' ? 0 : 1);
  const filterSummary = [
    findingFilter.findingTypes.length ? `${findingFilter.findingTypes.length} types` : null,
    findingFilter.finalStates.map((state) => FINAL_STATE_LABEL[state]).join(', ') || null,
    findingFilter.employeeId === 'ALL' ? null : employeeName(findingFilter.employeeId),
  ]
    .filter(Boolean)
    .join(' · ');

  const periodText = (periodId: string) => {
    const period = periodList.find((row) => row.id === periodId);
    return period ? `${periodLabel(period)} · ${periodName(period)}` : periodId;
  };

  const importActions = (row: HistoryImport) => {
    const actions = [{ label: 'View Detail', onSelect: () => setImportDetail(row) }];
    if (actor.role === 'ROLE_HR_MANAGER' && !row.verifiedBy) {
      actions.unshift({ label: 'Verify', onSelect: () => setImportDetail(row) });
    }
    if (officer && row.isActive) {
      actions.push({
        label: 'Correct',
        onSelect: () => {
          setCorrecting(row);
          setImportFormOpen(true);
        },
      });
    }
    return actions.length > 1 ? (
      <RowActions actions={actions} />
    ) : (
      <RowButton onClick={() => setImportDetail(row)}>View Detail</RowButton>
    );
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Payroll' }, { label: 'Salary Processing' }]}
        title="Salary Processing"
        description="Jalankan dan tinjau periode gaji, tutup temuan, dan impor riwayat penggajian dari sistem lama. Payroll menyiapkan angka — penguncian dan penyerahan dilakukan HR Manager di menu Authorization & Handover."
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
            {officer && tab === 'periods' && <Button onClick={() => setRunOpen(true)}>Run period</Button>}
            {officer && tab === 'imports' && (
              <Button
                onClick={() => {
                  setCorrecting(null);
                  setImportFormOpen(true);
                }}
              >
                Submit import
              </Button>
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'periods', label: 'Run & Review Period', count: periodList.length },
              { value: 'findings', label: 'Findings', count: openFindingsCount },
              { value: 'imports', label: 'Payroll History Import', count: imports.data?.length ?? 0 },
            ]}
          />

          {tab === 'periods' && (
            <>
              <Card>
                <CardHead title="Payroll periods" sub="Terbaru di atas" />
                <div className="flex flex-col">
                  <TableToolbar
                    filters={
                      <Select
                        value={statusFilter}
                        onValueChange={(value) => {
                          setStatusFilter(value as PeriodStatus | 'ALL');
                          pagedPeriods.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[200px]" aria-label="Status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All status</SelectItem>
                          {PERIOD_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {PERIOD_STATUS_LABEL[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                  <DataTable<PayrollPeriod>
                    rows={pagedPeriods.rows}
                    rowKey={(row) => row.id}
                    loading={periods.isLoading}
                    empty="No payroll period matches the filter."
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
                        header: 'Calculated',
                        muted: true,
                        nowrap: true,
                        render: (row) => `${employeeName(row.calculated.employeeId)} · ${formatDate(row.calculated.at)}`,
                      },
                      {
                        key: 'reviewed',
                        header: 'Reviewed',
                        muted: true,
                        nowrap: true,
                        render: (row) => (row.reviewed ? formatDate(row.reviewed.at) : '—'),
                      },
                      {
                        key: 'locked',
                        header: 'Locked',
                        muted: true,
                        nowrap: true,
                        render: (row) => (row.locked ? formatDate(row.locked.at) : '—'),
                      },
                      {
                        key: 'handed',
                        header: 'Handed Over',
                        muted: true,
                        nowrap: true,
                        render: (row) => (row.handedOver ? formatDate(row.handedOver.at) : '—'),
                      },
                    ]}
                    actions={(row) => <RowButton onClick={() => setSelectedPeriodId(row.id)}>View Detail</RowButton>}
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
                  actor={actor}
                  period={selectedPeriod}
                  onRecalculate={() => setRecalculating(selectedPeriod)}
                  onReview={() => setReviewing(selectedPeriod)}
                  onOpenFindings={() => {
                    setFindingPeriodId(selectedPeriod.id);
                    setFindingView('list');
                    setTab('findings');
                  }}
                />
              )}
            </>
          )}

          {tab === 'findings' && (
            <div className="flex flex-col gap-5">
              <Segmented<FindingView>
                value={findingView}
                onChange={setFindingView}
                options={[
                  { value: 'list', label: 'Finding list' },
                  { value: 'types', label: 'The 13 finding types' },
                ]}
              />

              {findingView === 'list' && (
                <Card>
                  <CardHead title="Findings" sub="Satu periode sekali lihat — pilih periodenya di filter" />
                  <div className="flex flex-col">
                    <TableToolbar
                      filters={
                        <>
                          <Select
                            value={activeFindingPeriod ?? ''}
                            onValueChange={(value) => {
                              setFindingPeriodId(value);
                              pagedFindings.resetPage();
                            }}
                          >
                            <SelectTrigger className="h-10 w-[220px]" aria-label="Period">
                              <SelectValue placeholder="Select period" />
                            </SelectTrigger>
                            <SelectContent>
                              {periodList.map((row) => (
                                <SelectItem key={row.id} value={row.id}>
                                  {periodLabel(row)} · {periodName(row)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="secondary" onClick={() => setFindingFilterOpen(true)}>
                            Filter{filterCount ? ` (${filterCount})` : ''}
                          </Button>
                        </>
                      }
                      summary={filterSummary || undefined}
                      actions={
                        officer && pickedRows.length > 0 ? (
                          <Button onClick={() => setBulkRows(pickedRows)}>Resolve selected ({pickedRows.length})</Button>
                        ) : undefined
                      }
                    />
                    <DataTable<Finding>
                      rows={pagedFindings.rows}
                      rowKey={(row) => row.id}
                      loading={findings.isLoading}
                      empty="No finding matches the filter."
                      columns={[
                        ...(officer
                          ? [
                              {
                                key: 'pick',
                                header: '',
                                render: (row: Finding) =>
                                  row.finalState ? null : (
                                    <Checkbox
                                      aria-label={`Select ${row.id}`}
                                      checked={picked.includes(row.id)}
                                      onCheckedChange={() => setPicked((current) => toggle(current, row.id))}
                                    />
                                  ),
                              },
                            ]
                          : []),
                        {
                          key: 'id',
                          header: 'ID',
                          strong: true,
                          nowrap: true,
                          render: (row) => <span className="font-mono text-xs">{row.id}</span>,
                        },
                        { key: 'type', header: 'Finding Type', render: (row) => <FindingTypeTag type={row.findingType} /> },
                        {
                          key: 'subject',
                          header: 'Subject',
                          render: (row) => (row.employeeId ? employeeName(row.employeeId) : 'Period-level'),
                        },
                        { key: 'state', header: 'Final State', render: (row) => <FinalStateBadge state={row.finalState} /> },
                        {
                          key: 'resolved',
                          header: 'Resolved',
                          muted: true,
                          nowrap: true,
                          render: (row) =>
                            row.resolvedAt ? `${employeeName(row.resolvedBy)} · ${formatDate(row.resolvedAt)}` : '—',
                        },
                        {
                          key: 'created',
                          header: 'Created',
                          muted: true,
                          nowrap: true,
                          render: (row) => formatDate(row.createdAt),
                        },
                      ]}
                      actions={(row) =>
                        officer && !row.finalState ? (
                          <RowActions
                            actions={[
                              { label: 'Resolve', onSelect: () => setResolving(row) },
                              { label: 'View Detail', onSelect: () => setFindingDetail(row) },
                            ]}
                          />
                        ) : (
                          <RowButton onClick={() => setFindingDetail(row)}>View Detail</RowButton>
                        )
                      }
                    />
                    <Pagination
                      page={pagedFindings.page}
                      pageSize={pagedFindings.pageSize}
                      total={pagedFindings.total}
                      noun="findings"
                      onPageChange={pagedFindings.setPage}
                      onPageSizeChange={pagedFindings.setPageSize}
                    />
                  </div>
                </Card>
              )}

              {findingView === 'types' && (
                <Card>
                  <CardHead
                    title="The 13 finding types"
                    sub="Setiap temuan berakhir Diperbaiki atau Diterima — keduanya final, tanpa jalan kembali."
                  />
                  <DataTable<FindingTypeInfo>
                    rows={FINDING_TYPE_INFO}
                    rowKey={(row) => row.type}
                    columns={[
                      { key: 'type', header: 'Finding Type', render: (row) => <FindingTypeTag type={row.type} /> },
                      { key: 'subject', header: 'Subject', render: (row) => row.subject },
                      { key: 'born', header: 'Raised When', muted: true, render: (row) => row.bornWhen },
                      { key: 'meaning', header: 'Meaning', render: (row) => row.meaning },
                      {
                        key: 'schema',
                        header: 'Detail Fields',
                        muted: true,
                        render: (row) => <span className="font-mono text-[11px]">{row.schema}</span>,
                      },
                    ]}
                  />
                </Card>
              )}
            </div>
          )}

          {tab === 'imports' && (
            <Card>
              <CardHead title="Payroll history import" sub="Ringkasan bulanan karyawan migrasi dari sistem lama" />
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Select
                        value={importEmployee}
                        onValueChange={(value) => {
                          setImportEmployee(value);
                          pagedImports.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[220px]" aria-label="Employee">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All employees</SelectItem>
                          {Object.entries(EMPLOYEES).map(([id, employee]) => (
                            <SelectItem key={id} value={id}>
                              {employee.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={importStatus}
                        onValueChange={(value) => {
                          setImportStatus(value as ImportStatus);
                          pagedImports.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[220px]" aria-label="Verification">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(IMPORT_STATUS_LABEL) as ImportStatus[]).map((status) => (
                            <SelectItem key={status} value={status}>
                              {IMPORT_STATUS_LABEL[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  }
                />
                <DataTable<HistoryImport>
                  rows={pagedImports.rows}
                  rowKey={(row) => row.id}
                  loading={imports.isLoading}
                  empty="No history import matches the filter."
                  columns={[
                    { key: 'employee', header: 'Employee', strong: true, render: (row) => employeeName(row.employeeId) },
                    { key: 'month', header: 'Month', nowrap: true, render: (row) => <span className="font-mono text-xs">{row.monthYear}</span> },
                    { key: 'gross', header: 'Gross Taxable', align: 'right', render: (row) => <Money value={row.grossTaxableIncomeAmount} /> },
                    { key: 'pph', header: 'PPh21 Withheld', align: 'right', render: (row) => <Money value={row.pph21WithheldAmount} /> },
                    { key: 'bpjs', header: 'BPJS', align: 'right', render: (row) => <Money value={row.bpjsContributionAmount} /> },
                    {
                      key: 'verification',
                      header: 'Verification',
                      render: (row) =>
                        row.verifiedBy ? (
                          <StatusBadge tone="ok">Verified</StatusBadge>
                        ) : (
                          <StatusBadge tone="warn">Unverified</StatusBadge>
                        ),
                    },
                    {
                      key: 'active',
                      header: 'Active',
                      render: (row) =>
                        row.isActive ? <StatusBadge tone="info">Active</StatusBadge> : <StatusBadge tone="mute">Superseded</StatusBadge>,
                    },
                    {
                      key: 'submitted',
                      header: 'Submitted',
                      muted: true,
                      nowrap: true,
                      render: (row) => `${employeeName(row.submittedBy)} · ${formatDate(row.submittedAt)}`,
                    },
                  ]}
                  actions={importActions}
                />
                <Pagination
                  page={pagedImports.page}
                  pageSize={pagedImports.pageSize}
                  total={pagedImports.total}
                  noun="imports"
                  onPageChange={pagedImports.setPage}
                  onPageSizeChange={pagedImports.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <RunPeriodModal
        actor={actor}
        open={runOpen || Boolean(recalculating)}
        initial={recalculating ? { year: recalculating.periodYear, month: recalculating.periodMonth } : null}
        periods={periodList}
        onClose={() => {
          setRunOpen(false);
          setRecalculating(null);
        }}
        onDone={(period) => setSelectedPeriodId(period.id)}
      />
      <ReviewPeriodModal actor={actor} period={reviewing} onClose={() => setReviewing(null)} />

      <FindingDetailModal
        finding={findingDetail}
        periodText={findingDetail ? periodText(findingDetail.periodId) : ''}
        onClose={() => setFindingDetail(null)}
      />
      <ResolveFindingModal actor={actor} finding={resolving} onClose={() => setResolving(null)} />
      <BulkResolveModal actor={actor} findings={bulkRows} onClose={() => setBulkRows([])} onDone={() => setPicked([])} />

      <FilterModal
        open={findingFilterOpen}
        onOpenChange={setFindingFilterOpen}
        title="Filter findings"
        onReset={() => setFindingFilter(EMPTY_FINDING_FILTER)}
      >
        <div className="flex flex-col gap-2">
          <Label>Final state</Label>
          <div className="flex flex-wrap gap-4">
            {(Object.keys(FINAL_STATE_LABEL) as FinalStateFilter[]).map((state) => (
              <label key={state} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={findingFilter.finalStates.includes(state)}
                  onCheckedChange={() =>
                    setFindingFilter((current) => ({ ...current, finalStates: toggle(current.finalStates, state) }))
                  }
                />
                <span className="font-body text-[13px] font-medium text-fg-2">{FINAL_STATE_LABEL[state]}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label>Employee</Label>
          <Select
            value={findingFilter.employeeId}
            onValueChange={(value) => setFindingFilter((current) => ({ ...current, employeeId: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All employees</SelectItem>
              {Object.entries(EMPLOYEES).map(([id, employee]) => (
                <SelectItem key={id} value={id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label>Finding type</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {FINDING_TYPE_INFO.map((info) => (
              <label key={info.type} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={findingFilter.findingTypes.includes(info.type)}
                  onCheckedChange={() =>
                    setFindingFilter((current) => ({ ...current, findingTypes: toggle(current.findingTypes, info.type) }))
                  }
                />
                <span className="font-mono text-[11px] font-semibold text-fg-2">{info.type}</span>
              </label>
            ))}
          </div>
        </div>
      </FilterModal>

      <ImportFormModal
        actor={actor}
        open={importFormOpen}
        correcting={correcting}
        firstMonth={firstPeriodMonth(periodList)}
        onClose={() => {
          setImportFormOpen(false);
          setCorrecting(null);
        }}
      />
      <ImportDetailModal actor={actor} row={importDetail} onClose={() => setImportDetail(null)} />
    </>
  );
}
