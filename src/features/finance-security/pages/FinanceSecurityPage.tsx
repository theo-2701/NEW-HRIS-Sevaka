import { useMemo, useState } from 'react';
import { Info, Lock, TriangleAlert } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { DatePicker } from '@/components/DatePicker';
import { StatusBadge } from '@/components/StatusBadge';
import { RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import {
  HoldDetailModal,
  NewExportModal,
  PlaceHoldModal,
  ReferenceModal,
  ReleaseHoldModal,
} from '@/features/finance-security/components/SecurityModals';
import type { ReferenceKind } from '@/features/finance-security/components/SecurityModals';
import {
  useExportLogs,
  useHolds,
  useMedicalLogs,
} from '@/features/finance-security/hooks/useFinanceSecurity';
import { EMPLOYEES, ROLE_OF, VIEWERS, employeeName } from '@/features/finance-security/mock-data';
import { HOLD_TARGET_TYPES, canExport, canManageHolds, describeCriteria } from '@/features/finance-security/rules';
import { EXPORT_SCOPE_LABEL, HOLD_TARGET_LABEL, ROLE_LABEL } from '@/features/finance-security/types';
import type {
  Actor,
  DisputeHoldRow,
  ExportLog,
  HoldTargetType,
  MedicalAccessRow,
  MedicalLogFilter,
} from '@/features/finance-security/types';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'holds' | 'export' | 'medical';

function Person({ id, stamp }: { id: string | null; stamp?: string | null }) {
  if (!id) return <span className="text-fg-4">—</span>;
  return (
    <span className="flex flex-col gap-0.5">
      {employeeName(id)}
      <span className="font-body text-[11px] font-medium text-fg-3">
        {stamp ? formatDateTime(stamp) : (ROLE_LABEL[ROLE_OF[id]] ?? '—')}
      </span>
    </span>
  );
}

interface MedicalFilterState {
  employeeId: string;
  startDate: string;
  endDate: string;
}

const EMPTY_MEDICAL: MedicalFilterState = { employeeId: 'ALL', startDate: '', endDate: '' };

/**
 * Finance › Finance Security — port `_prototype/finance-security.html`
 * (FSD §6 · UIC §7 · TSD §18.3–§18.5 · ERD §6.9).
 *
 * Dispute hold dikelola penuh (pasang tanpa sebab, cabut wajib bersebab); hold yang
 * dipasang di sini langsung terbaca Benefit, Loan, dan Pencairan & Piutang. Export Log
 * dan Medical Access Log adalah papan jejak — tulisnya terjadi saat mengunduh / membuka.
 */
export function FinanceSecurityPage() {
  const [tab, setTab] = useState<Tab>('holds');
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);
  const holdWriter = canManageHolds(actor.role);

  const [targetType, setTargetType] = useState<HoldTargetType | 'ALL'>('ALL');
  const [activeOnly, setActiveOnly] = useState(true);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [medicalFilter, setMedicalFilter] = useState<MedicalFilterState>(EMPTY_MEDICAL);
  const [medicalFilterOpen, setMedicalFilterOpen] = useState(false);

  const [placing, setPlacing] = useState(false);
  const [releasing, setReleasing] = useState<DisputeHoldRow | null>(null);
  const [detail, setDetail] = useState<DisputeHoldRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reference, setReference] = useState<ReferenceKind | null>(null);

  const holdFilter = useMemo(
    () => ({ targetType: targetType === 'ALL' ? undefined : targetType, activeOnly }),
    [targetType, activeOnly],
  );
  const exportFilter = useMemo(
    () => ({ startDate: exportFrom || undefined, endDate: exportTo || undefined }),
    [exportFrom, exportTo],
  );
  const medicalQuery = useMemo<MedicalLogFilter>(
    () => ({
      employeeId: medicalFilter.employeeId === 'ALL' ? undefined : medicalFilter.employeeId,
      startDate: medicalFilter.startDate || undefined,
      endDate: medicalFilter.endDate || undefined,
    }),
    [medicalFilter],
  );

  const holds = useHolds(actor, holdFilter);
  const activeHolds = useHolds(actor);
  const exportsLog = useExportLogs(actor, exportFilter);
  const medical = useMedicalLogs(actor, medicalQuery);

  const pagedHolds = usePagedRows(holds.data ?? []);
  const pagedExports = usePagedRows(exportsLog.data ?? []);
  const pagedMedical = usePagedRows(medical.data ?? []);

  const medicalSummary = [
    medicalFilter.employeeId === 'ALL' ? 'All employees' : employeeName(medicalFilter.employeeId),
    medicalFilter.startDate || medicalFilter.endDate
      ? `${medicalFilter.startDate ? formatDate(medicalFilter.startDate) : '…'} – ${medicalFilter.endDate ? formatDate(medicalFilter.endDate) : '…'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Finance' }, { label: 'Finance Security' }]}
        title="Finance Security"
        description="Tiga kontrol lintas modul yang tidak dimiliki satu modul transaksi: penandaan sengketa atas jenis pengajuan apa pun, jejak ekspor manual, dan jejak pembukaan lampiran medis."
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
            {tab === 'holds' && holdWriter && <Button onClick={() => setPlacing(true)}>Place dispute hold</Button>}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <Note tone="warn" icon={<TriangleAlert />}>
            <strong>GAP terdokumentasi — PROB-FRONTEND-014.</strong> Menu ini didukung penuh kontrak teknis, tetapi belum
            ditempatkan di peta navigasi dokumen arsitektur (SAD §4.6). Posisinya di sidebar bersifat sementara.
          </Note>

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'holds', label: 'Dispute Hold', count: activeHolds.data?.length ?? 0 },
              { value: 'export', label: 'Export Log', count: exportsLog.data?.length ?? 0 },
              { value: 'medical', label: 'Medical Access Log', count: medical.data?.length ?? 0 },
            ]}
          />

          {tab === 'holds' && (
            <Card>
              <CardHead title="Dispute holds" sub="Daftar kerja bawaan hanya hold aktif — baris yang dicabut tetap sebagai riwayat" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Select
                        value={targetType}
                        onValueChange={(value) => {
                          setTargetType(value as HoldTargetType | 'ALL');
                          pagedHolds.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[200px]" aria-label="Target type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All target types</SelectItem>
                          {HOLD_TARGET_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {HOLD_TARGET_LABEL[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <label className="flex h-10 cursor-pointer items-center gap-2.5">
                        <Checkbox
                          checked={activeOnly}
                          onCheckedChange={(checked) => {
                            setActiveOnly(checked === true);
                            pagedHolds.resetPage();
                          }}
                        />
                        <span className="font-body text-[13px] font-medium text-fg-2">Active holds only</span>
                      </label>
                    </>
                  }
                  actions={
                    <Button variant="secondary" onClick={() => setReference('asymmetry')}>
                      Place vs release
                    </Button>
                  }
                />

                {holds.error && (
                  <Note tone="danger" icon={<TriangleAlert />}>
                    {holds.error.message}
                  </Note>
                )}

                <DataTable<DisputeHoldRow>
                  rows={pagedHolds.rows}
                  rowKey={(row) => row.id}
                  loading={holds.isLoading}
                  empty="No dispute hold matches the current filter."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.targetRequestNo}</span>,
                    },
                    {
                      key: 'type',
                      header: 'Target Type',
                      render: (row) => (
                        <StatusBadge tone="info" dot={false}>
                          {HOLD_TARGET_LABEL[row.targetType]}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <StatusBadge tone={row.isActive ? 'warn' : 'mute'}>{row.isActive ? 'On hold' : 'Released'}</StatusBadge>
                      ),
                    },
                    { key: 'placed', header: 'Placed By', render: (row) => <Person id={row.createdBy} stamp={row.createdAt} /> },
                    { key: 'released', header: 'Released By', render: (row) => <Person id={row.releasedBy} stamp={row.releasedAt} /> },
                  ]}
                  actions={(row) =>
                    row.isActive && holdWriter ? (
                      <RowButton onClick={() => setReleasing(row)}>Release</RowButton>
                    ) : (
                      <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>
                    )
                  }
                />

                <Pagination
                  page={pagedHolds.page}
                  pageSize={pagedHolds.pageSize}
                  total={pagedHolds.total}
                  noun="holds"
                  onPageChange={pagedHolds.setPage}
                  onPageSizeChange={pagedHolds.setPageSize}
                />
              </div>

              <Note icon={<Info />}>
                Hold aktif menggerbang pencairan: menandai baris itu dibayar ditolak <strong>422 FIN_DISPUTE_HOLD_ACTIVE</strong>{' '}
                di Pencairan & Piutang, dan penandanya tampil di Benefit Reimbursement serta modal keputusan Loan. Hold aktif
                kedua atas target yang sama ditolak <strong>409</strong>. Endpoint cabut adalah PATCH /dispute-holds/{'{id}'},
                bukan …/release seperti jangkar Figma (PROB-FRONTEND-017).
              </Note>
            </Card>
          )}

          {tab === 'export' && (
            <Card>
              <CardHead title="Export download log" sub="Siapa · kapan · berapa baris · penyaring" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <DatePicker
                        className="w-[180px]"
                        placeholder="Downloaded from"
                        value={exportFrom}
                        max={exportTo || undefined}
                        onChange={(value) => {
                          setExportFrom(value);
                          pagedExports.resetPage();
                        }}
                      />
                      <DatePicker
                        className="w-[180px]"
                        placeholder="Downloaded until"
                        value={exportTo}
                        min={exportFrom || undefined}
                        onChange={(value) => {
                          setExportTo(value);
                          pagedExports.resetPage();
                        }}
                      />
                    </>
                  }
                  actions={
                    canExport(actor.role) ? (
                      <Button variant="secondary" onClick={() => setExporting(true)}>
                        New export
                      </Button>
                    ) : null
                  }
                />

                {exportsLog.error && (
                  <Note tone="danger" icon={<TriangleAlert />}>
                    {exportsLog.error.message}
                  </Note>
                )}

                <DataTable<ExportLog>
                  rows={pagedExports.rows}
                  rowKey={(row) => row.id}
                  loading={exportsLog.isLoading}
                  empty="No download recorded in this period."
                  columns={[
                    {
                      key: 'scope',
                      header: 'Scope',
                      render: (row) => (
                        <StatusBadge tone="info" dot={false}>
                          {EXPORT_SCOPE_LABEL[row.scope]}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'criteria',
                      header: 'Filter Criteria',
                      render: (row) => <span className="font-mono text-xs">{describeCriteria(row.filterCriteria)}</span>,
                    },
                    { key: 'rows', header: 'Rows', align: 'right', render: (row) => row.rowCount.toLocaleString('id-ID') },
                    { key: 'at', header: 'Downloaded At', nowrap: true, muted: true, render: (row) => formatDateTime(row.downloadedAt) },
                    { key: 'by', header: 'By', render: (row) => <Person id={row.createdBy} /> },
                  ]}
                />

                <Pagination
                  page={pagedExports.page}
                  pageSize={pagedExports.pageSize}
                  total={pagedExports.total}
                  noun="downloads"
                  onPageChange={pagedExports.setPage}
                  onPageSizeChange={pagedExports.setPageSize}
                />
              </div>

              <Note icon={<Lock />}>
                Hanya Finance Officer dan Super Admin — <strong>bukan</strong> HR Manager, karena ekspor adalah kewenangan
                kelas CRUD finance. Berkas turun langsung sebagai unduhan, bukan lewat document-service. Jejak berhenti di
                titik unduhan: HRIS tahu siapa mengunduh, bukan ke mana berkas pergi.
              </Note>
            </Card>
          )}

          {tab === 'medical' && (
            <Card>
              <CardHead title="Medical document access log" sub="Metadata jejak saja — isi lampiran tidak pernah dibuka dari layar ini" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Button variant="secondary" onClick={() => setMedicalFilterOpen(true)}>
                      {`Filter · ${medicalSummary}`}
                    </Button>
                  }
                  actions={
                    <Button variant="secondary" onClick={() => setReference('duties')}>
                      Separation of duties
                    </Button>
                  }
                />

                {medical.error && (
                  <Note tone="danger" icon={<TriangleAlert />}>
                    {medical.error.message}
                  </Note>
                )}

                <DataTable<MedicalAccessRow>
                  rows={pagedMedical.rows}
                  rowKey={(row) => row.id}
                  loading={medical.isLoading}
                  empty="No access recorded for this filter."
                  columns={[
                    {
                      key: 'claim',
                      header: 'Claim No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.claimRequestNo ?? '—'}</span>,
                    },
                    { key: 'subject', header: 'Subject Employee', render: (row) => employeeName(row.employeeId) },
                    { key: 'item', header: 'Claim Item', render: (row) => <span className="font-mono text-xs">{row.claimItemId}</span> },
                    { key: 'doc', header: 'Document', render: (row) => <span className="font-mono text-xs">{row.documentId}</span> },
                    { key: 'at', header: 'Accessed At', nowrap: true, muted: true, render: (row) => formatDateTime(row.accessedAt) },
                    { key: 'by', header: 'Opened By', render: (row) => <Person id={row.createdBy} /> },
                  ]}
                />

                <Pagination
                  page={pagedMedical.page}
                  pageSize={pagedMedical.pageSize}
                  total={pagedMedical.total}
                  noun="accesses"
                  onPageChange={pagedMedical.setPage}
                  onPageSizeChange={pagedMedical.setPageSize}
                />
              </div>

              <Note icon={<Info />}>
                Ditinjau HR Manager dan Super Admin. Health Data Officer membuka lampiran tetapi tidak mengaudit jejaknya
                (403), dan Finance Officer ditolak pada keduanya. Kolom <strong>Opened By</strong> adalah pelaku pembukaan,
                berbeda dari karyawan pemilik klaim.
              </Note>
            </Card>
          )}
        </div>
      </PageShell>

      <PlaceHoldModal actor={actor} open={placing} onClose={() => setPlacing(false)} />
      <ReleaseHoldModal actor={actor} hold={releasing} onClose={() => setReleasing(null)} />
      <HoldDetailModal hold={detail} onClose={() => setDetail(null)} />
      <NewExportModal actor={actor} open={exporting} onClose={() => setExporting(false)} />
      <ReferenceModal kind={reference} onClose={() => setReference(null)} />

      <FilterModal
        open={medicalFilterOpen}
        title="Filter medical access log"
        description="Karyawan pemilik klaim dan rentang waktu pembukaan."
        onOpenChange={setMedicalFilterOpen}
        onReset={() => {
          setMedicalFilter(EMPTY_MEDICAL);
          pagedMedical.resetPage();
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Subject employee</Label>
            <Select
              value={medicalFilter.employeeId}
              onValueChange={(employeeId) => {
                setMedicalFilter((prev) => ({ ...prev, employeeId }));
                pagedMedical.resetPage();
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
              <Label>Accessed from</Label>
              <DatePicker
                value={medicalFilter.startDate}
                max={medicalFilter.endDate || undefined}
                onChange={(startDate) => setMedicalFilter((prev) => ({ ...prev, startDate }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Accessed until</Label>
              <DatePicker
                value={medicalFilter.endDate}
                min={medicalFilter.startDate || undefined}
                onChange={(endDate) => setMedicalFilter((prev) => ({ ...prev, endDate }))}
              />
            </div>
          </div>
        </div>
      </FilterModal>
    </>
  );
}
