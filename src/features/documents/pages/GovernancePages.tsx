import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { Modal } from '@/components/Modal';
import { AddButton, RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { EmployeeRow, Field, SelectRow } from '@/features/company/components/CompanyBits';
import { ClassBadge } from '@/features/documents/components/DocBits';
import {
  CreateCategoryModal,
  DecideCategoryModal,
  EditCategoryModal,
  ReadersModal,
} from '@/features/documents/components/CategoryModals';
import { GovActorPicker, GovError, GovNote, NoMenuRowBanner } from '@/features/documents/components/GovBits';
import { DOC_PEOPLE_SOURCE, GOV_VIEWERS } from '@/features/documents/governance-data';
import {
  useAccessTrail,
  useCategoryAdmin,
  useHandleMalware,
  useMalwareAlerts,
} from '@/features/documents/hooks/useGovernance';
import { accessTrailService } from '@/features/documents/services/document.service';
import { formatBytes } from '@/features/documents/rules';
import type {
  AccessGranularity,
  AccessTrailRow,
  CategoryAdmin,
  DocActor,
  MalwareAlert,
  MalwareAlertState,
} from '@/features/documents/types';
import { formatDateTime } from '@/lib/format';
import { ApiError } from '@/services/api';

const forbiddenOf = (error: unknown) => error instanceof ApiError && error.status === 403;

/**
 * Company Management › Files › Pengaturan Kategori — FSD-001-DOCUMENT-0.8 §7 · UIC §5 (`A6a`–`A6d`, `A7`).
 * Dua tuas keterbukaan (penanda kategori & peran pembaca) bermuara pada SATU pintu orang kedua dan SATU penanda
 * usulan tertahan. Belum punya baris menu (PROB-SERVICE-407).
 */
export function CategorySettingsPage() {
  const viewers = GOV_VIEWERS.categories;
  const [actor, setActor] = useState<DocActor>(viewers[0]);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAdmin | null>(null);
  const [readers, setReaders] = useState<CategoryAdmin | null>(null);
  const [deciding, setDeciding] = useState<CategoryAdmin | null>(null);
  const list = useCategoryAdmin(actor, includeInactive);
  const manager = actor.role === 'ROLE_HR_MANAGER';
  const superAdmin = actor.role === 'ROLE_SUPER_ADMIN';

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Files' }, { label: 'Category Settings' }]}
      title="Category Settings"
      description="Document categories and who can read them. Anything that opens files wider waits for a second person."
      actions={<GovActorPicker viewers={viewers} actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <NoMenuRowBanner problem="PROB-SERVICE-407" />
        {forbiddenOf(list.error) ? (
          <Card>
            <EmptyState title="403 — HR Manager and Super Admin only" description={list.error?.message} />
          </Card>
        ) : (
          <Card>
            <CardHead
              title="Categories"
              sub={
                superAdmin
                  ? 'You decide proposals made by the HR Manager.'
                  : 'Tightening applies now; loosening becomes a proposal.'
              }
            />
            <div>
              <TableToolbar
                filters={
                  <label className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
                    <Checkbox
                      checked={includeInactive}
                      onCheckedChange={(value) => setIncludeInactive(value === true)}
                    />
                    Show deactivated
                  </label>
                }
                actions={manager ? <AddButton onClick={() => setCreateOpen(true)}>New category</AddButton> : undefined}
              />
              <DataTable<CategoryAdmin>
                rows={list.data ?? []}
                rowKey={(row) => row.id}
                loading={list.isLoading}
                columns={[
                  {
                    key: 'name',
                    header: 'Category',
                    render: (row) => (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-bold text-fg-1">{row.categoryName}</span>
                        <span className="font-mono text-[11px] text-fg-3">{row.categoryCode}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'origin',
                    header: 'Origin',
                    render: (row) => (
                      <StatusBadge tone={row.categoryOrigin === 'INDUK' ? 'mute' : 'brand'}>
                        {row.categoryOrigin === 'INDUK' ? 'Platform' : 'Company'}
                      </StatusBadge>
                    ),
                  },
                  { key: 'class', header: 'Class', render: (row) => <ClassBadge value={row.confidentialityClass} /> },
                  {
                    key: 'retention',
                    header: 'Retention',
                    nowrap: true,
                    render: (row) => (row.retentionRegime === 'PERMANENT' ? 'Permanent' : `${row.retentionDays} days`),
                  },
                  {
                    key: 'size',
                    header: 'Max size',
                    nowrap: true,
                    align: 'right',
                    render: (row) => formatBytes(row.maxFileSizeBytes),
                  },
                  { key: 'readers', header: 'Readers', align: 'right', render: (row) => row.readerRoles.length },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <span className="flex flex-wrap gap-1.5">
                        <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>
                          {row.isActive ? 'Active' : 'Deactivated'}
                        </StatusBadge>
                        {row.hasPendingChange && <StatusBadge tone="warn">Awaiting approval</StatusBadge>}
                      </span>
                    ),
                  },
                ]}
                actions={(row) => {
                  if (superAdmin)
                    return row.hasPendingChange ? <RowButton onClick={() => setDeciding(row)}>Decide</RowButton> : null;
                  if (!manager) return null;
                  return (
                    <RowActions
                      actions={[
                        { label: 'Edit', disabled: row.hasPendingChange, onSelect: () => setEditing(row) },
                        {
                          label: 'Reader roles',
                          disabled: row.hasPendingChange || row.confidentialityClass === 'SENSITIF',
                          onSelect: () => setReaders(row),
                        },
                      ]}
                    />
                  );
                }}
              />
            </div>
          </Card>
        )}
      </div>
      <CreateCategoryModal actor={actor} open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditCategoryModal actor={actor} category={editing} onClose={() => setEditing(null)} />
      <ReadersModal actor={actor} category={readers} onClose={() => setReaders(null)} />
      <DecideCategoryModal actor={actor} category={deciding} onClose={() => setDeciding(null)} />
    </PageShell>
  );
}

/**
 * Company Management › Files › Jejak Akses Dokumen — FSD-001-DOCUMENT-0.8 §8 · UIC §6 (`A5`). Murni pengawasan,
 * tepat dua pembaca yang saling mengawasi. Dua bentuk baris (per pembukaan / per permintaan) tidak diratakan.
 */
export function AccessTrailPage() {
  const viewers = GOV_VIEWERS.trail;
  const [actor, setActor] = useState<DocActor>(viewers[0]);
  const [filters, setFilters] = useState<{
    actorId: string;
    granularity: '' | AccessGranularity;
    flagged: boolean;
    from: string;
    to: string;
  }>({ actorId: '', granularity: '', flagged: false, from: '', to: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const trail = useAccessTrail(actor, {
    actorEmployeeId: filters.actorId || undefined,
    accessGranularity: filters.granularity || undefined,
    flaggedUnreasonable: filters.flagged ? true : undefined,
    startDate: filters.from || undefined,
    endDate: filters.to || undefined,
  });
  const active = [filters.actorId, filters.granularity, filters.flagged, filters.from || filters.to].filter(
    Boolean,
  ).length;

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Files' }, { label: 'Document Access Trail' }]}
      title="Document Access Trail"
      description="Every time a file was opened, or a list of files was requested. Oversight only — nothing can be changed here."
      actions={<GovActorPicker viewers={viewers} actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <NoMenuRowBanner problem="PROB-SERVICE-407" />
        <GovNote tone="warn">
          Oversight here is mutual, not external: the HR Manager and the Super Admin watch each other, and their own
          opens are recorded too. If both agree, nobody inside the system sees it. Reading this trail is not itself
          recorded.
        </GovNote>
        {forbiddenOf(trail.error) ? (
          <Card>
            <EmptyState title="403 — HR Manager and Super Admin only" description={trail.error?.message} />
          </Card>
        ) : (
          <Card>
            <CardHead title="Access trail" sub="Newest first · owners opening their own files are recorded too" />
            <div>
              <TableToolbar
                filters={
                  <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                    {active ? `Filter (${active})` : 'Filter'}
                  </Button>
                }
              />
              <DataTable<AccessTrailRow>
                rows={trail.data ?? []}
                rowKey={(row) => row.id}
                loading={trail.isLoading}
                empty="No access matches this filter."
                columns={[
                  { key: 'at', header: 'Accessed at', nowrap: true, render: (row) => formatDateTime(row.accessedAt) },
                  {
                    key: 'who',
                    header: 'Actor',
                    render: (row) => (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold text-fg-1">{row.accessedBy.nama}</span>
                        <span className="text-xs text-fg-3">NIK {row.accessedBy.nik}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'grain',
                    header: 'Granularity',
                    render: (row) => (
                      <StatusBadge tone={row.accessGranularity === 'PER_PEMBUKAAN' ? 'info' : 'brand'}>
                        {row.accessGranularity === 'PER_PEMBUKAAN' ? 'Per open' : 'Per request'}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: 'doc',
                    header: 'Document',
                    render: (row) =>
                      row.accessGranularity === 'PER_PERMINTAAN' ? (
                        <span className="font-semibold">{row.documentCount} files</span>
                      ) : (
                        (accessTrailService.documentLabel(row.documentId, row.versionId) ?? (
                          <span className="text-fg-3">— file already swept</span>
                        ))
                      ),
                  },
                  { key: 'ip', header: 'Gateway address', muted: true, render: (row) => row.sourceIp },
                  {
                    key: 'flag',
                    header: 'Flag',
                    render: (row) =>
                      row.flaggedUnreasonable ? <StatusBadge tone="err">Unreasonable</StatusBadge> : '—',
                  },
                ]}
              />
            </div>
          </Card>
        )}
        <Card>
          <CardHead title="Reading the columns" sub="Two row shapes that must not be merged" />
          <div className="flex flex-col gap-3">
            <GovNote>
              <strong>Per open</strong> — one row per file opened, with its name and version.{' '}
              <strong>Per request</strong> — one row per list request, with only the number of files; the files are not
              listed row by row.
            </GovNote>
            <GovNote tone="warn">
              The address column is the gateway’s address, not the person’s device: client addresses are translated
              before the gateway, so one office shows as one address. The “unreasonable” flag is the main guard against
              mass viewing of Employee Files; its threshold has no setting yet.
            </GovNote>
          </div>
        </Card>
      </div>
      <FilterModal
        open={filterOpen}
        title="Filter access trail"
        onOpenChange={setFilterOpen}
        onReset={() => setFilters({ actorId: '', granularity: '', flagged: false, from: '', to: '' })}
      >
        <EmployeeRow
          label="Actor"
          lang="en"
          emptyLabel="Anyone"
          value={filters.actorId}
          onChange={(value) => setFilters((prev) => ({ ...prev, actorId: value }))}
          source={DOC_PEOPLE_SOURCE}
        />
        <SelectRow
          label="Granularity"
          allowEmpty
          emptyLabel="Both"
          value={filters.granularity}
          onChange={(value) => setFilters((prev) => ({ ...prev, granularity: value as '' | AccessGranularity }))}
          options={[
            { value: 'PER_PEMBUKAAN', label: 'Per open' },
            { value: 'PER_PERMINTAAN', label: 'Per request' },
          ]}
        />
        <label className="flex items-center gap-2 font-body text-[13px] font-semibold text-fg-1">
          <Checkbox
            checked={filters.flagged}
            onCheckedChange={(value) => setFilters((prev) => ({ ...prev, flagged: value === true }))}
          />
          Only rows flagged unreasonable
        </label>
        <Field label="Date range">
          <DateRangePicker
            value={{ from: filters.from, to: filters.to }}
            onChange={(range) => setFilters((prev) => ({ ...prev, ...range }))}
          />
        </Field>
      </FilterModal>
    </PageShell>
  );
}

const WARNING =
  'Marking an alert as handled permanently deletes the file. After that the file can no longer be examined by anyone, including its uploader.';

/**
 * Company Management › Files › Malware Alerts — FSD-001-DOCUMENT-0.8 §8A · UIC §6A (`A17`/`A18`). Satu tombol di sini
 * MENGHAPUS berkas permanen — kalimat peringatannya bagian kontrak, tampil dua kali. Nol nama berkas, nol orang kedua.
 */
export function MalwareAlertsPage() {
  const viewers = GOV_VIEWERS.malware;
  const [actor, setActor] = useState<DocActor>(viewers[0]);
  const [state, setState] = useState<'' | MalwareAlertState>('');
  const [uploader, setUploader] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [handling, setHandling] = useState<MalwareAlert | null>(null);
  const [note, setNote] = useState('');
  const alerts = useMalwareAlerts(actor, {
    malwareAlertState: state || undefined,
    uploaderEmployeeId: uploader || undefined,
    startDate: from || undefined,
    endDate: to || undefined,
  });
  const handle = useHandleMalware();
  const active = [state, uploader, from || to].filter(Boolean).length;
  const closeHandle = () => {
    setHandling(null);
    setNote('');
    handle.reset();
  };

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Files' }, { label: 'Malware Alerts' }]}
      title="Malware Alerts"
      description="Files the scanner found dangerous, waiting for a decision."
      actions={<GovActorPicker viewers={viewers} actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        {forbiddenOf(alerts.error) ? (
          <Card>
            <EmptyState
              title="403 — HR Manager and Super Admin only"
              description="Uploaders are notified separately and do not see this list; the Health Data Officer is overseen, not overseeing."
            />
          </Card>
        ) : (
          <Card>
            <CardHead title="Dangerous file alerts" sub="Newest detection first · file names are never shown" />
            <div className="flex flex-col gap-3">
              <GovNote tone="danger">{WARNING}</GovNote>
              <TableToolbar
                filters={
                  <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                    {active ? `Filter (${active})` : 'Filter'}
                  </Button>
                }
              />
              <DataTable<MalwareAlert>
                rows={alerts.data ?? []}
                rowKey={(row) => row.id}
                loading={alerts.isLoading}
                empty="No alert matches this filter."
                columns={[
                  { key: 'at', header: 'Detected', nowrap: true, render: (row) => formatDateTime(row.detectedAt) },
                  {
                    key: 'doc',
                    header: 'Document',
                    render: (row) => <span className="font-mono text-xs">{row.documentId}</span>,
                  },
                  {
                    key: 'ver',
                    header: 'Version',
                    render: (row) => <span className="font-mono text-xs">{row.versionId ?? '—'}</span>,
                  },
                  {
                    key: 'up',
                    header: 'Uploader',
                    render: (row) => <span className="font-mono text-xs">{row.uploaderEmployeeId}</span>,
                  },
                  {
                    key: 'state',
                    header: 'State',
                    render: (row) => (
                      <StatusBadge tone={row.malwareAlertState === 'AKTIF' ? 'err' : 'ok'}>
                        {row.malwareAlertState === 'AKTIF' ? 'Not handled' : 'Handled'}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: 'handling',
                    header: 'Handling',
                    render: (row) =>
                      row.handledAt ? (
                        <span className="flex max-w-[280px] flex-col gap-0.5 whitespace-normal">
                          <span className="text-xs text-fg-3">
                            {formatDateTime(row.handledAt)} · NIK {row.handledBy?.nik}
                          </span>
                          <span className="text-xs font-semibold text-fg-1">{row.handlingNote}</span>
                        </span>
                      ) : (
                        '—'
                      ),
                  },
                ]}
                actions={(row) =>
                  row.malwareAlertState === 'AKTIF' ? (
                    <RowButton onClick={() => setHandling(row)}>Mark handled</RowButton>
                  ) : null
                }
              />
            </div>
          </Card>
        )}
      </div>

      <FilterModal
        open={filterOpen}
        title="Filter alerts"
        onOpenChange={setFilterOpen}
        onReset={() => {
          setState('');
          setUploader('');
          setFrom('');
          setTo('');
        }}
      >
        <EmployeeRow
          label="Uploader"
          lang="en"
          emptyLabel="Anyone"
          value={uploader}
          onChange={setUploader}
          source={DOC_PEOPLE_SOURCE}
        />
        <SelectRow
          label="State"
          allowEmpty
          emptyLabel="Both"
          value={state}
          onChange={(value) => setState(value as '' | MalwareAlertState)}
          options={[
            { value: 'AKTIF', label: 'Not handled' },
            { value: 'DITANGANI', label: 'Handled' },
          ]}
        />
        <Field label="Detected">
          <DateRangePicker
            value={{ from, to }}
            onChange={(range) => {
              setFrom(range.from);
              setTo(range.to);
            }}
          />
        </Field>
      </FilterModal>

      <Modal
        open={Boolean(handling)}
        onOpenChange={(next) => !next && closeHandle()}
        title="Mark as handled"
        description={handling ? `Document ${handling.documentId} · version ${handling.versionId ?? '—'}` : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={closeHandle}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!note.trim() || handle.isPending}
              onClick={() => handling && handle.mutate({ actor, id: handling.id, note }, { onSuccess: closeHandle })}
            >
              {handle.isPending ? 'Deleting…' : 'Delete file & mark handled'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <GovNote tone="danger">{WARNING}</GovNote>
          <GovError error={handle.error} />
          <Field label="Action note" required hint={`${note.length}/1000 — what was done about this file.`}>
            <Textarea rows={3} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
        </div>
      </Modal>
    </PageShell>
  );
}
