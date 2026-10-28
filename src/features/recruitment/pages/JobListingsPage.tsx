import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterModal } from '@/components/FilterModal';
import { Modal } from '@/components/Modal';
import { MultiSelect } from '@/components/MultiSelect';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { PanelActions, RowActions, type RowAction } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePagedRows } from '@/hooks/usePagedRows';
import { AvatarStack } from '@/features/recruitment/components/AvatarStack';
import { useDeleteJob, useDuplicateJob, useImportJobs, useJobListings, useSetJobStatus } from '@/features/recruitment/hooks/useRecruitment';
import { FILTER_OPTIONS, IMPORT_COLUMNS } from '@/features/recruitment/services/recruitment.service';
import { toast } from '@/store/ui.store';
import {
  JOB_STATUSES,
  JOB_STATUS_LABEL,
  JOB_STATUS_TONE,
  type JobFilter,
  type JobListing,
  type JobStatus,
} from '@/features/recruitment/types';
import { cn } from '@/lib/utils';

const DOT: Record<JobStatus, string> = {
  PUBLISHED: 'bg-success-500',
  DRAFT: 'bg-warning-500',
  UNPUBLISHED: 'bg-silver',
  CLOSED: 'bg-error-500',
};

type MultiKey = keyof typeof FILTER_OPTIONS;
const FILTER_FIELDS: { key: MultiKey; label: string; all: string }[] = [
  { key: 'branch', label: 'Branch', all: 'All branches' },
  { key: 'organization', label: 'Organization', all: 'All organizations' },
  { key: 'employmentStatus', label: 'Employment status', all: 'All employment statuses' },
  { key: 'workplaceType', label: 'Workplace type', all: 'All workplace types' },
  { key: 'platform', label: 'Publication platform', all: 'All platforms' },
  { key: 'hiringTeam', label: 'Hiring team', all: 'Anyone' },
];
type Picked = Record<MultiKey, string[]>;
const EMPTY: Picked = { branch: [], organization: [], employmentStatus: [], workplaceType: [], platform: [], hiringTeam: [] };

const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmt = (iso: string | null) => (iso ? date.format(new Date(iso)) : '—');
const candidates = (n: number) => (n ? `${n} ${n === 1 ? 'candidate' : 'candidates'}` : '—');

type SortKey = 'new' | 'published' | 'created';
const SORT_VALUE: Record<SortKey, (row: JobListing) => string | number> = {
  new: (row) => row.newCandidates,
  published: (row) => row.publishedAt ?? '',
  created: (row) => row.createdAt,
};

type Confirm = { row: JobListing; kind: 'UNPUBLISH' | 'CLOSE' | 'DELETE' };
const CONFIRM_TEXT: Record<Confirm['kind'], { title: string; body: string; label: string }> = {
  UNPUBLISH: { title: 'Unpublish this job listing?', body: 'It disappears from every platform. Candidates who already applied stay in the list.', label: 'Unpublish' },
  CLOSE: { title: 'Close this job listing?', body: 'Nobody can apply anymore. You can reopen it later.', label: 'Close Listing' },
  DELETE: { title: 'Delete this job listing?', body: 'The listing and its draft data are removed. This cannot be undone.', label: 'Delete' },
};

/** Templat CSV — kolom sama dengan yang dibaca `parseImport()`. */
function downloadTemplate() {
  const header = IMPORT_COLUMNS.join(',');
  const url = URL.createObjectURL(new Blob([`${header}\n`], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: 'template-import-job-listing.csv' }).click();
  URL.revokeObjectURL(url);
}

/** Import Job Listing — templat + unggah CSV maks 5 MB (`#importJobModal`). */
function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const upload = useImportJobs();
  const close = () => {
    setFile(null);
    onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Import Job Listing"
      description="Download the template, fill in your job listings, then upload it."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!file || upload.isPending}
            onClick={() =>
              file &&
              upload.mutate(file, {
                onSuccess: (log) => {
                  close();
                  if (log.status === 'FAILED') {
                    toast(`Import failed: ${log.errors.length} problem(s) found. Nothing was saved.`, 'danger');
                    navigate(`/recruitment/job-listings/import-logs/detail?id=${log.id}`);
                  } else toast(`${log.rows.length} job listing(s) imported as draft.`, 'ok');
                },
              })
            }
          >
            {upload.isPending ? 'Submitting…' : 'Submit'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <Button variant="secondary" onClick={downloadTemplate}>
            Download Template
          </Button>
        </div>
        <ul className="m-0 flex list-disc flex-col gap-1 pl-5 font-body text-[13px] leading-[1.5] text-fg-2">
          <li>Fill in every mandatory column defined in the template.</li>
          <li>Each row becomes one job listing saved as draft.</li>
        </ul>
        <div className="flex flex-col gap-1">
          <Label htmlFor="jl-file">
            Upload spreadsheet<em>*</em>
          </Label>
          <input
            key={file ? 'filled' : 'empty'}
            id="jl-file"
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="rounded-md border border-silver bg-cloud px-3 py-2.5 font-body text-[13px] font-medium text-fg-2 file:mr-3 file:rounded-md file:border-0 file:bg-vapor file:px-3 file:py-1.5 file:font-semibold file:text-fg-1"
          />
          <span className="font-body text-xs font-medium text-fg-3">CSV format, 5 MB at most.</span>
        </div>
      </div>
    </Modal>
  );
}

/** Recruitment › Job Listings — port `_prototype/recruitment-job-listings.html` (tanpa dokumen kontrak). */
export function JobListingsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<JobStatus>('PUBLISHED');
  const [keyword, setKeyword] = useState('');
  const [picked, setPicked] = useState<Picked>(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [sort, setSort] = useState<{ by: SortKey; dir: 'ASC' | 'DESC' }>({ by: 'created', dir: 'DESC' });
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  // Satu permintaan tanpa status: kartu status menghitung dari hasil yang sama dengan tabel.
  const query: JobFilter = useMemo(() => ({ keyword, ...picked }), [keyword, picked]);
  const { data = [], isLoading } = useJobListings(query);
  const rows = useMemo(() => {
    const value = SORT_VALUE[sort.by];
    const sign = sort.dir === 'ASC' ? 1 : -1;
    return data.filter((row) => row.status === status).sort((a, b) => (value(a) > value(b) ? sign : value(a) < value(b) ? -sign : 0));
  }, [data, status, sort]);
  const paged = usePagedRows(rows);

  const setJobStatus = useSetJobStatus();
  const duplicate = useDuplicateJob();
  const remove = useDeleteJob();

  const active = FILTER_FIELDS.filter((field) => picked[field.key].length > 0);
  const summary = active.map((field) => `${field.label}: ${picked[field.key].join(', ')}`).join(' · ') || undefined;

  const detail = (row: JobListing) => navigate(`/recruitment/job-listings/detail?id=${row.id}`);
  const edit = (row: JobListing) => navigate(`/recruitment/job-listings/create?id=${row.id}`);
  const move = (row: JobListing, next: JobStatus) => setJobStatus.mutate({ id: row.id, status: next });

  const actions = (row: JobListing) => {
    const view: RowAction = { label: 'View Detail', onSelect: () => detail(row) };
    const editItem: RowAction = { label: 'Edit', onSelect: () => edit(row) };
    const copy: RowAction = { label: 'Duplicate', onSelect: () => duplicate.mutate(row.id) };
    const del: RowAction = { label: 'Delete', danger: true, onSelect: () => setConfirm({ row, kind: 'DELETE' }) };
    const byStatus: Record<JobStatus, RowAction[]> = {
      PUBLISHED: [view, editItem, copy, { label: 'Unpublish', onSelect: () => setConfirm({ row, kind: 'UNPUBLISH' }) }, { label: 'Close', danger: true, onSelect: () => setConfirm({ row, kind: 'CLOSE' }) }],
      DRAFT: [view, editItem, { label: 'Submit', onSelect: () => move(row, 'PUBLISHED') }, del],
      UNPUBLISHED: [view, editItem, { label: 'Publish', onSelect: () => move(row, 'PUBLISHED') }, del],
      CLOSED: [view, copy, { label: 'Reopen', onSelect: () => move(row, 'PUBLISHED') }],
    };
    return <RowActions actions={byStatus[row.status]} />;
  };

  const columns: Column<JobListing>[] = [
    {
      key: 'title',
      header: 'Job Listing Title',
      render: (row) => (
        <span className="flex flex-col gap-[3px]">
          <button type="button" onClick={() => detail(row)} className="text-left font-body text-sm font-bold text-fg-link hover:underline">
            {row.title}
          </button>
          <span className="whitespace-nowrap font-body text-xs font-medium text-fg-3">
            #{row.id} | {row.branch} | {row.hired}/{row.headcount} Headcount
          </span>
        </span>
      ),
    },
    { key: 'position', header: 'Job Position', nowrap: true, render: (row) => row.position },
    { key: 'org', header: 'Organization', nowrap: true, render: (row) => row.organization },
    { key: 'new', header: 'New Candidates', sortKey: 'new', nowrap: true, render: (row) => candidates(row.newCandidates) },
    { key: 'process', header: 'Candidate In Process', nowrap: true, render: (row) => candidates(row.inProcess) },
    {
      key: 'status',
      header: 'Publication Status',
      render: (row) => <StatusBadge tone={JOB_STATUS_TONE[row.status]}>{JOB_STATUS_LABEL[row.status]}</StatusBadge>,
    },
    { key: 'platform', header: 'Publication Platform', muted: true, nowrap: true, render: (row) => row.platform ?? '—' },
    { key: 'published', header: 'Publication Date', sortKey: 'published', muted: true, nowrap: true, render: (row) => fmt(row.publishedAt) },
    {
      key: 'duration',
      header: 'Publication Duration',
      muted: true,
      nowrap: true,
      render: (row) => (row.durationDays == null || !row.publishedAt ? '—' : `${row.durationDays} Days`),
    },
    { key: 'created', header: 'Created Date', sortKey: 'created', muted: true, nowrap: true, render: (row) => fmt(row.createdAt) },
    { key: 'team', header: 'Hiring Team', render: (row) => <AvatarStack names={row.hiringTeam} max={3} /> },
  ];

  const counts = Object.fromEntries(JOB_STATUSES.map((value) => [value, data.filter((row) => row.status === value).length])) as Record<JobStatus, number>;

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Recruitment' }, { label: 'Job Listings' }]}
        title="Job Listings"
        actions={
          <>
            <PanelActions
              label="Import"
              actions={[
                { label: 'Import Job Listing', onSelect: () => setImportOpen(true) },
                { label: 'Import Logs', onSelect: () => navigate('/recruitment/job-listings/import-logs') },
              ]}
            />
            <Button onClick={() => navigate('/recruitment/job-listings/create')}>Create Job Listing</Button>
          </>
        }
      >
        <Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="group" aria-label="Publication status">
            {JOB_STATUSES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value);
                  paged.resetPage();
                }}
                className={cn(
                  'rounded-xl border px-[18px] py-4 text-left transition-[border-color,box-shadow,background] duration-200 hover:border-primary-500 hover:shadow-card',
                  status === value ? 'border-primary-500 bg-primary-100 shadow-[inset_0_0_0_1px_var(--color-primary-500)]' : 'border-border-1 bg-white',
                )}
              >
                <span className="block font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-fg-1">{isLoading ? '…' : counts[value]}</span>
                <span className="mt-2 flex items-center gap-[7px] font-body text-[13px] font-semibold text-fg-2">
                  <span className={cn('size-2 rounded-full', DOT[value])} />
                  {JOB_STATUS_LABEL[value]}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col">
            <TableToolbar
              filters={
                <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                  {active.length ? `Filter (${active.length})` : 'Filter'}
                </Button>
              }
              summary={summary}
              search={{
                value: keyword,
                onChange: (value) => {
                  setKeyword(value);
                  paged.resetPage();
                },
                placeholder: 'Search title, ID or position',
              }}
            />
            <DataTable<JobListing>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty={`No ${JOB_STATUS_LABEL[status].toLowerCase()} job listing matches these criteria.`}
              sort={sort}
              onSortChange={(key) =>
                setSort((prev) => ({ by: key as SortKey, dir: prev.by === key && prev.dir === 'DESC' ? 'ASC' : 'DESC' }))
              }
              columns={columns}
              actions={actions}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="rows"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </PageShell>

      {/* ponytail: filter tanggal tayang/tutup dan Creator dari prototype dilewati — tambah bila datanya ada di backend. */}
      <FilterModal
        open={filterOpen}
        title="All Filter"
        description="Narrow the job listings by job, publication and hiring team."
        onOpenChange={setFilterOpen}
        onReset={() => {
          setPicked(EMPTY);
          paged.resetPage();
        }}
      >
        {FILTER_FIELDS.map((field) => (
          <div key={field.key} className="flex flex-col gap-1">
            <Label>{field.label}</Label>
            <MultiSelect<string>
              value={picked[field.key]}
              onChange={(value) => {
                setPicked({ ...picked, [field.key]: value });
                paged.resetPage();
              }}
              options={FILTER_OPTIONS[field.key].map((value) => ({ value, label: value }))}
              placeholder={field.all}
            />
          </div>
        ))}
      </FilterModal>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm ? CONFIRM_TEXT[confirm.kind].title : ''}
        description={confirm ? `${confirm.row.title} (#${confirm.row.id}). ${CONFIRM_TEXT[confirm.kind].body}` : undefined}
        confirmLabel={confirm ? CONFIRM_TEXT[confirm.kind].label : undefined}
        loading={setJobStatus.isPending || remove.isPending}
        onConfirm={() => {
          if (!confirm) return;
          const done = { onSuccess: () => setConfirm(null) };
          if (confirm.kind === 'DELETE') remove.mutate(confirm.row.id, done);
          else setJobStatus.mutate({ id: confirm.row.id, status: confirm.kind === 'CLOSE' ? 'CLOSED' : 'UNPUBLISHED' }, done);
        }}
        onOpenChange={(open) => !open && setConfirm(null)}
      />
    </>
  );
}
