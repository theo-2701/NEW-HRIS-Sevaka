import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { ExternalLink, Info, Lock, TriangleAlert } from 'lucide-react';
import { Card, CardHead } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { FilterModal } from '@/components/FilterModal';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowActions } from '@/components/RowActions';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { DateField } from '@/components/form/DateField';
import { EmployeeSelectField } from '@/components/form/EmployeeSelectField';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { createLocalEmployeeSource, type EmployeeOption } from '@/lib/employeeSource';
import { formatDate, formatDateTime } from '@/lib/format';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { employeeService } from '@/features/employees/services/employee.service';
import { JOB_GRADE_OPTIONS } from '@/features/new-joiner/types';
import {
  useAtsBridge,
  useAtsBridges,
  useDeleteCandidate,
  useInviteCandidate,
  useMaterializeCandidate,
  useResendLink,
} from '@/features/ats-bridge/hooks/useAtsBridge';
import { previewLink } from '@/features/ats-bridge/services/ats-bridge.service';
import {
  ATS_SOURCE_LABEL,
  ATS_STATUS_LABEL,
  ATS_STATUS_MEANING,
  CONSENT_LABEL,
  canDeleteAts,
  isAtsManager,
  type AtsBridge,
  type AtsSource,
  type AtsStatus,
  type ConsentStatus,
} from '@/features/ats-bridge/types';
import { MOCK } from '@/services/mock';
import { useAuthStore } from '@/store/auth.store';

const STATUS_TONE: Record<AtsStatus, BadgeTone> = {
  WAITING_CANDIDATE: 'info',
  COMPLETED: 'ok',
  INACTIVE: 'mute',
  USED: 'brand',
};

const STATUSES = Object.keys(ATS_STATUS_LABEL) as AtsStatus[];
const SOURCES = Object.keys(ATS_SOURCE_LABEL) as AtsSource[];

/** Pemohon = karyawan tenant (nama + NIK disimpan sebagai snapshot). */
const REQUESTORS = createLocalEmployeeSource('ats-requestor', async () => {
  const { rows } = await employeeService.search({
    keyword: '',
    branchId: '',
    createdFrom: '',
    createdTo: '',
    employmentStatus: [],
    page: 1,
    size: 500,
    sortBy: 'name',
    sortDir: 'ASC',
  });
  return rows.map((row) => ({ id: row.id, name: row.name, nik: row.nik, unit: row.position }));
});

function AtsStatusBadge({ status }: { status: AtsStatus }) {
  return <StatusBadge tone={STATUS_TONE[status]}>{ATS_STATUS_LABEL[status]}</StatusBadge>;
}

const consentText = (value: ConsentStatus | null) => (value ? CONSENT_LABEL[value] : CONSENT_LABEL.NONE);

interface FilterState {
  atsStatus: AtsStatus | 'ALL';
  source: AtsSource | 'ALL';
  consent: ConsentStatus | 'ALL';
}
const EMPTY_FILTER: FilterState = { atsStatus: 'ALL', source: 'ALL', consent: 'ALL' };

function Choice<V extends string>({
  label,
  value,
  allLabel,
  options,
  onChange,
}: {
  label: string;
  value: V | 'ALL';
  allLabel: string;
  options: { value: V; label: string }[];
  onChange: (value: V | 'ALL') => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Select value={value} onValueChange={(next) => onChange(next as V | 'ALL')}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

const inviteSchema = Yup.object({
  candidateEmail: Yup.string().trim().email('Enter a valid email address.').required('Candidate email is required.'),
  requestorEmployeeId: Yup.string().required('Choose the requestor.'),
});

/** ATS-INVITE — undang kandidat lewat email (tautan sekali-pakai 24 jam). */
function InviteModal({ open, onClose, onSent }: { open: boolean; onClose: () => void; onSent: (id: string) => void }) {
  const invite = useInviteCandidate();
  const [requestor, setRequestor] = useState<EmployeeOption | null>(null);
  return (
    <Formik
      initialValues={{ candidateEmail: '', requestorEmployeeId: '' }}
      validationSchema={inviteSchema}
      onSubmit={(values, helpers) =>
        invite.mutate(
          {
            candidateEmail: values.candidateEmail,
            requestorEmployeeId: values.requestorEmployeeId,
            requestorName: requestor?.name ?? '',
            requestorNik: requestor?.nik ?? '',
          },
          {
            onSuccess: (row) => {
              helpers.resetForm();
              onSent(row.id);
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => (
        <Modal
          open={open}
          onOpenChange={(next) => {
            if (!next) {
              resetForm();
              onClose();
            }
          }}
          title="Invite Candidate"
          description="The candidate receives a one-time link, valid for 24 hours, to agree to the consent and fill in their own data."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={invite.isPending}>
                {invite.isPending ? 'Sending…' : 'Send Invitation'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <TextField name="candidateEmail" type="email" label="Candidate Email" required placeholder="name@example.com" />
            <EmployeeSelectField
              name="requestorEmployeeId"
              lang="en"
              label="Requestor"
              required
              source={REQUESTORS}
              onSelect={setRequestor}
              hint="The employee who asked for this hire. Their name and NIK are kept with the record."
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** ATS-DETAIL — tanpa data pribadi (KTP, paspor, alamat). */
function DetailModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data } = useAtsBridge(id);
  const link = id && MOCK ? previewLink(id) : null;
  return (
    <Modal
      open={Boolean(id)}
      onOpenChange={(next) => !next && onClose()}
      title="Candidate detail"
      description={data ? data.candidateEmail : undefined}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {data && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Status">
              <AtsStatusBadge status={data.atsStatus} />
            </KeyValueRow>
            <KeyValueRow label="Name">{data.candidateName ?? '—'}</KeyValueRow>
            <KeyValueRow label="Source">{ATS_SOURCE_LABEL[data.source]}</KeyValueRow>
            <KeyValueRow label="Consent">{consentText(data.consentStatus)}</KeyValueRow>
            <KeyValueRow label="Documents">
              {[data.cvUploaded && 'CV', data.idPhotoUploaded && 'ID card photo'].filter(Boolean).join(' · ') || 'Not uploaded yet'}
            </KeyValueRow>
            <KeyValueRow label="Requestor">
              {data.requestorName} · {data.requestorNik}
            </KeyValueRow>
            <KeyValueRow label="Link sent">
              {data.linkSentAt ? `${formatDateTime(data.linkSentAt)} · ${data.linkSendCount}×` : '—'}
            </KeyValueRow>
            <KeyValueRow label="Completed">{data.completedAt ? formatDateTime(data.completedAt) : '—'}</KeyValueRow>
            {data.parentId && <KeyValueRow label="Replaces">Earlier record {data.parentId}</KeyValueRow>}
          </KeyValueList>
          {link && (
            <Note icon={<ExternalLink />}>
              Dummy mode only — the real link exists only in the candidate&rsquo;s email.{' '}
              <a href={`#${link}`} onClick={(event) => { event.preventDefault(); window.open(link, '_blank'); }} className="font-semibold text-fg-link underline">
                Open the candidate page
              </a>
            </Note>
          )}
        </div>
      )}
    </Modal>
  );
}

const materializeSchema = Yup.object({
  joinDate: Yup.string().required('Enter the start date.'),
  jobGradeId: Yup.string().required('Choose a grade.'),
  nik: Yup.string().trim().max(50, 'At most 50 characters.').required('Enter the NIK.'),
  username: Yup.string().trim(),
  companyEmail: Yup.string().trim().email('Enter a valid email address.'),
});

/** ATS-MATERIALIZE — kandidat asal Bulk Import yang `COMPLETED` langsung jadi karyawan. */
function MaterializeModal({ row, onClose }: { row: AtsBridge | null; onClose: () => void }) {
  const { data } = useAtsBridge(row?.id ?? null);
  const materialize = useMaterializeCandidate();
  const [done, setDone] = useState<{ email: string; nikAlsoUsed: boolean; nik: string } | null>(null);
  const [key] = useState(() => crypto.randomUUID());

  if (done) {
    return (
      <Modal
        open
        onOpenChange={(next) => {
          if (!next) {
            setDone(null);
            onClose();
          }
        }}
        title="Employee created"
        footer={
          <Button
            onClick={() => {
              setDone(null);
              onClose();
            }}
          >
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="m-0 font-body text-[13px] leading-[1.5] text-fg-2">
            {done.email} is now an employee. The employee receives an activation link to set a password.
          </p>
          {done.nikAlsoUsed && (
            <Note tone="warn" icon={<TriangleAlert />}>
              NIK {done.nik} is also used by another employee. Check that this is intended.
            </Note>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Formik
      initialValues={{
        joinDate: '',
        jobGradeId: '',
        nik: data?.materializeSuggestion?.nik ?? '',
        username: data?.materializeSuggestion?.username ?? '',
        companyEmail: '',
      }}
      enableReinitialize
      validationSchema={materializeSchema}
      onSubmit={(values) => {
        if (!row) return;
        materialize.mutate(
          { id: row.id, input: values, key },
          { onSuccess: (result) => setDone({ email: row.candidateEmail, nikAlsoUsed: result.nikAlsoUsed, nik: values.nik }) },
        );
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(row)}
          onOpenChange={(next) => !next && onClose()}
          title="Create Employee"
          description={row ? `${row.candidateName ?? '—'} · ${row.candidateEmail}` : undefined}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={materialize.isPending}>
                {materialize.isPending ? 'Creating…' : 'Create Employee'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <DateField name="joinDate" label="Start Date" required placeholder="Select a date" />
              <SelectField
                name="jobGradeId"
                label="Grade"
                required
                placeholder="Select a grade"
                options={JOB_GRADE_OPTIONS}
              />
            </div>
            <TextField
              name="nik"
              label="NIK"
              required
              maxLength={50}
              hint="Suggested next number. Free format and not forced to be unique — you get a warning if it is already used."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="username" label="Username" hint="Optional. Left empty, the system derives one." />
              <TextField name="companyEmail" type="email" label="Company Email" hint="Optional. No mailbox password is asked or stored." />
            </div>
            <Note icon={<Info />}>
              No contract document and no New Joiner row are needed for a Bulk Import candidate. The employee starts as
              Waiting with an Onboarding transition.
            </Note>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

function StatusReferenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Candidate statuses"
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <DataTable<{ status: AtsStatus }>
        rows={STATUSES.map((status) => ({ status }))}
        rowKey={(item) => item.status}
        columns={[
          { key: 'status', header: 'Status', nowrap: true, render: (item) => <AtsStatusBadge status={item.status} /> },
          { key: 'meaning', header: 'Meaning', render: (item) => ATS_STATUS_MEANING[item.status] },
        ]}
      />
    </Modal>
  );
}

/**
 * Manpower Planning › ATS Bridge — FSD-001-EMPLOYEE 0.46 §4A. Satu grid untuk kandidat dari tiga
 * pintu (ATS Bridge, New Joiner, Bulk Import). Aktor: HR Staff · HR Manager · Super Admin;
 * hapus: HR Manager · Super Admin.
 */
export function AtsBridgePage() {
  const role = useAuthStore((s) => s.user?.role);
  const manager = isAtsManager(role);

  const [keyword, setKeyword] = useState('');
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const query = useMemo(
    () => ({
      keyword,
      atsStatus: filter.atsStatus === 'ALL' ? undefined : filter.atsStatus,
      source: filter.source === 'ALL' ? undefined : filter.source,
      consentStatus: filter.consent === 'ALL' ? undefined : filter.consent,
    }),
    [keyword, filter],
  );
  const { data, isLoading } = useAtsBridges(query);
  const rows = useMemo(() => data ?? [], [data]);
  const paged = usePagedRows(rows);

  const [inviting, setInviting] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [resending, setResending] = useState<AtsBridge | null>(null);
  const [deleting, setDeleting] = useState<AtsBridge | null>(null);
  const [materializing, setMaterializing] = useState<AtsBridge | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const resend = useResendLink();
  const remove = useDeleteCandidate();

  const active = Object.values(filter).filter((value) => value !== 'ALL').length;
  const summary =
    [
      filter.atsStatus !== 'ALL' && ATS_STATUS_LABEL[filter.atsStatus],
      filter.source !== 'ALL' && ATS_SOURCE_LABEL[filter.source],
      filter.consent !== 'ALL' && `Consent: ${CONSENT_LABEL[filter.consent]}`,
    ]
      .filter(Boolean)
      .join(' · ') || 'No filter';

  const rowActions = (row: AtsBridge) => {
    const actions = [{ label: 'View Detail', onSelect: () => setDetailId(row.id) }];
    if (manager && row.atsStatus === 'WAITING_CANDIDATE') actions.push({ label: 'Resend Link', onSelect: () => setResending(row) });
    if (manager && row.source === 'BULK_IMPORT' && row.atsStatus === 'COMPLETED') {
      actions.push({ label: 'Create Employee', onSelect: () => setMaterializing(row) });
    }
    const list = actions.map((action) => ({ ...action, danger: false }));
    if (canDeleteAts(role) && row.atsStatus !== 'USED') list.push({ label: 'Delete', danger: true, onSelect: () => setDeleting(row) });
    return <RowActions actions={list} />;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Manpower Planning' }, { label: 'ATS Bridge' }]}
        title="ATS Bridge"
        description="Invite candidates by email, follow who has agreed to the consent and filled in their data, resend links, and remove records that are not used. Candidates from ATS Bridge, New Joiner and Bulk Import are listed together."
        actions={manager && <Button onClick={() => setInviting(true)}>Invite Candidate</Button>}
      >
        {!manager ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Staff, HR Manager and Super Admin.
          </Note>
        ) : (
          <Card>
            <CardHead title="Candidates" sub={`${rows.length} records · newest first`} />
            <div className="flex flex-col">
              <TableToolbar
                filters={
                  <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                    {active > 0 ? `Filter (${active})` : 'Filter'}
                  </Button>
                }
                summary={summary}
                search={{
                  value: keyword,
                  onChange: (value) => {
                    setKeyword(value);
                    paged.resetPage();
                  },
                  placeholder: 'Search email or name',
                }}
              />
              <DataTable<AtsBridge>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty="No candidate matches these criteria."
                columns={[
                  {
                    key: 'candidate',
                    header: 'Candidate',
                    strong: true,
                    render: (row) => (
                      <span className="flex flex-col gap-0.5">
                        <span>{row.candidateName ?? row.candidateEmail}</span>
                        <span className="font-body text-[11px] font-medium text-fg-3">
                          {row.candidateName ? row.candidateEmail : 'Name not filled in yet'}
                          {row.parentId && ' · Replaces earlier record'}
                        </span>
                      </span>
                    ),
                  },
                  { key: 'source', header: 'Source', muted: true, render: (row) => ATS_SOURCE_LABEL[row.source] },
                  {
                    key: 'status',
                    header: 'Status',
                    info: { label: 'Status reference', onClick: () => setLegendOpen(true) },
                    render: (row) => <AtsStatusBadge status={row.atsStatus} />,
                  },
                  { key: 'consent', header: 'Consent', render: (row) => consentText(row.consentStatus) },
                  {
                    key: 'requestor',
                    header: 'Requestor',
                    render: (row) => (
                      <span className="flex flex-col gap-0.5">
                        <span>{row.requestorName}</span>
                        <span className="font-body text-[11px] font-medium text-fg-3">{row.requestorNik}</span>
                      </span>
                    ),
                  },
                  {
                    key: 'link',
                    header: 'Link',
                    nowrap: true,
                    muted: true,
                    render: (row) =>
                      row.atsStatus === 'WAITING_CANDIDATE' && row.tokenExpiresAt
                        ? `Valid until ${formatDateTime(row.tokenExpiresAt)}`
                        : row.completedAt
                          ? `Completed ${formatDate(row.completedAt)}`
                          : '—',
                  },
                ]}
                actions={rowActions}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="candidates"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        )}
      </PageShell>

      <FilterModal
        open={filterOpen}
        title="Filter candidates"
        description="Narrow the list with the criteria below."
        onOpenChange={setFilterOpen}
        onReset={() => {
          setFilter(EMPTY_FILTER);
          paged.resetPage();
        }}
      >
        <Choice
          label="Status"
          value={filter.atsStatus}
          allLabel="All statuses"
          options={STATUSES.map((value) => ({ value, label: ATS_STATUS_LABEL[value] }))}
          onChange={(atsStatus) => {
            setFilter({ ...filter, atsStatus });
            paged.resetPage();
          }}
        />
        <Choice
          label="Source"
          value={filter.source}
          allLabel="All sources"
          options={SOURCES.map((value) => ({ value, label: ATS_SOURCE_LABEL[value] }))}
          onChange={(source) => {
            setFilter({ ...filter, source });
            paged.resetPage();
          }}
        />
        <Choice<ConsentStatus>
          label="Consent"
          value={filter.consent}
          allLabel="Any consent"
          options={[
            { value: 'AGREED', label: CONSENT_LABEL.AGREED },
            { value: 'DECLINED', label: CONSENT_LABEL.DECLINED },
          ]}
          onChange={(consent) => {
            setFilter({ ...filter, consent });
            paged.resetPage();
          }}
        />
      </FilterModal>

      <InviteModal open={inviting} onClose={() => setInviting(false)} onSent={setDetailId} />
      <DetailModal id={detailId} onClose={() => setDetailId(null)} />
      <MaterializeModal row={materializing} onClose={() => setMaterializing(null)} />
      <StatusReferenceModal open={legendOpen} onClose={() => setLegendOpen(false)} />

      <ConfirmDialog
        open={Boolean(resending)}
        title="Resend link?"
        description={resending ? `A new 24-hour link will be sent to ${resending.candidateEmail}. The old link stops working.` : undefined}
        confirmLabel="Resend Link"
        tone="primary"
        loading={resend.isPending}
        onConfirm={() => resending && resend.mutate(resending.id, { onSuccess: () => setResending(null) })}
        onOpenChange={(open) => !open && setResending(null)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this candidate?"
        description={
          deleting
            ? `${deleting.candidateName ?? deleting.candidateEmail} and the data they filled in will be removed. A candidate still linked to an active New Joiner cannot be deleted.`
            : undefined
        }
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </>
  );
}
