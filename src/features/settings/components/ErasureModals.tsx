import { useState } from 'react';
import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Field, SelectRow } from '@/features/company/components/CompanyBits';
import { Note } from '@/features/settings/components/SettingsBits';
import { useCreateErasure, useErasureDetail, useErasureSubjects } from '@/features/settings/hooks/useSettings';
import { ERASURE_TIMEZONES } from '@/features/settings/mock-data';
import { SERVICE_LABELS, summarizeProgress, validateErasureDraft } from '@/features/settings/rules';
import type {
  ErasureDetail,
  ErasureDraft,
  ErasureProgress,
  ErasureStatus,
  ProgressStatus,
  SettingsActor,
} from '@/features/settings/types';
import { formatDate, formatDateTime, toIsoDate } from '@/lib/format';
import { ApiError } from '@/services/api';

const STATUS_TONE: Record<ErasureStatus, 'info' | 'warn' | 'ok'> = {
  REQUESTED: 'info',
  IN_PROGRESS: 'warn',
  COMPLETED: 'ok',
};
const PROGRESS_TONE: Record<ProgressStatus, 'mute' | 'warn' | 'ok'> = {
  PENDING: 'mute',
  HELD: 'warn',
  COMPLETED: 'ok',
};

export const ErasureStatusBadge = ({ value }: { value: ErasureStatus }) => (
  <StatusBadge tone={STATUS_TONE[value]}>{value}</StatusBadge>
);

export function SubjectCell({ nama, nik }: { nama: string | null; nik: string | null }) {
  if (!nama && !nik) return <span className="text-xs font-medium text-fg-3">Identity not available</span>;
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-bold text-fg-1">{nama ?? '—'}</span>
      <span className="text-xs text-fg-3">NIK {nik ?? '—'}</span>
    </span>
  );
}

function FactTable({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-2.5 font-body text-[13px]">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="font-semibold text-fg-3">{row.label}</dt>
          <dd className="m-0 font-semibold text-fg-1">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ProgressTable({ progress }: { progress: ErasureProgress[] }) {
  return (
    <DataTable<ErasureProgress>
      rows={progress}
      rowKey={(row) => row.serviceCode}
      columns={[
        {
          key: 'service',
          header: 'Service',
          render: (row) => (
            <span className="flex flex-col gap-0.5">
              <span className="font-bold text-fg-1">{SERVICE_LABELS[row.serviceCode] ?? row.serviceCode}</span>
              <span className="font-mono text-[11px] text-fg-3">{row.serviceCode}</span>
            </span>
          ),
        },
        {
          key: 'status',
          header: 'Status',
          render: (row) => <StatusBadge tone={PROGRESS_TONE[row.progressStatus]}>{row.progressStatus}</StatusBadge>,
        },
        { key: 'count', header: 'Broadcasts', align: 'right', render: (row) => row.broadcastCount },
        {
          key: 'last',
          header: 'Last broadcast',
          nowrap: true,
          muted: true,
          render: (row) => formatDateTime(row.lastBroadcastAt),
        },
        { key: 'done', header: 'Completed', nowrap: true, render: (row) => formatDateTime(row.completedAt) },
      ]}
    />
  );
}

const EMPTY_DRAFT: ErasureDraft = { employeeId: '', requestedAt: '', requestedAtTimezone: 'Asia/Jakarta' };

/**
 * PDH-1 (form kosong) → PDH-2 (201) atau cabang PDH-3 (409). Tiga medan saja: daftar service wajib hapus,
 * nama/NIK snapshot, dan status awal disusun server — sengaja tidak ada di form.
 */
export function ErasureFormModal({
  actor,
  open,
  onClose,
  onOpenDetail,
}: {
  actor: SettingsActor;
  open: boolean;
  onClose: () => void;
  onOpenDetail: (id: string) => void;
}) {
  const subjects = useErasureSubjects();
  const create = useCreateErasure();
  const [draft, setDraft] = useState<ErasureDraft>(EMPTY_DRAFT);
  const [touched, setTouched] = useState(false);
  const [created, setCreated] = useState<ErasureDetail | null>(null);
  const [conflict, setConflict] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});

  const errors = { ...validateErasureDraft(draft), ...serverErrors };
  const show = (field: keyof ErasureDraft) => (touched ? errors[field] : undefined);

  const close = () => {
    setDraft(EMPTY_DRAFT);
    setTouched(false);
    setCreated(null);
    setConflict(null);
    setServerErrors({});
    onClose();
  };

  const submit = () => {
    setTouched(true);
    if (Object.keys(validateErasureDraft(draft)).length) return;
    create.mutate(
      { actor, draft },
      {
        onSuccess: (detail) => setCreated(detail),
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) setConflict(error.message);
          else if (error instanceof ApiError && error.fieldErrors)
            setServerErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([key, list]) => [key, list[0]])));
          else setConflict(error.message);
        },
      },
    );
  };

  const set = <K extends keyof ErasureDraft>(key: K, value: ErasureDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setServerErrors({});
    setConflict(null);
  };

  if (created) {
    const summary = summarizeProgress(created.progress);
    return (
      <Modal
        open={open}
        onOpenChange={(next) => !next && close()}
        title="Erasure request recorded"
        description="The request is stored with one tracker row per service. Nothing is broadcast yet — the next scheduled sweep sends the first broadcast."
        size="wide"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Close
            </Button>
            <Button
              onClick={() => {
                const id = created.id;
                close();
                onOpenDetail(id);
              }}
            >
              View detail
            </Button>
          </>
        }
      >
        <FactTable
          rows={[
            { label: 'Subject', value: <SubjectCell nama={created.nama} nik={created.nik} /> },
            { label: 'Status', value: <ErasureStatusBadge value={created.requestStatus} /> },
            { label: 'Letter date', value: `${formatDate(created.requestedAt)} · ${created.requestedAtTimezone}` },
            {
              label: 'Recorded',
              value: `${formatDateTime(created.createdAt)} by ${created.createdBy.nama} (NIK ${created.createdBy.nik})`,
            },
            { label: 'Tracker', value: `${summary.totalService} services · all PENDING · 0 broadcasts` },
          ]}
        />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Record erasure request"
      description="Record a personal data erasure request received from a data subject, usually a former employee."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button disabled={create.isPending} onClick={submit}>
            {create.isPending ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {conflict && (
          <Note tone="warn" icon={<CircleAlert />}>
            <strong>409 — request already open.</strong> {conflict} A new request for the same subject can be recorded
            once the current one is completed.
          </Note>
        )}
        <SelectRow
          label="Data subject"
          required
          hint={
            show('employeeId') ? (
              <span className="text-error-700">{show('employeeId')}</span>
            ) : (
              'Former employees are included.'
            )
          }
          placeholder="Choose employee…"
          value={draft.employeeId}
          onChange={(value) => set('employeeId', value)}
          options={(subjects.data ?? []).map((row) => ({
            value: row.employeeId,
            label: `${row.nama} · ${row.nik} · ${row.employmentStatus}`,
          }))}
        />
        <Field
          label="Subject's letter date"
          required
          hint={
            show('requestedAt') ? (
              <span className="text-error-700">{show('requestedAt')}</span>
            ) : (
              'The date on the subject’s letter — not today’s date. The compliance deadline counts from here.'
            )
          }
        >
          <DatePicker
            value={draft.requestedAt}
            max={toIsoDate(new Date())}
            invalid={Boolean(show('requestedAt'))}
            onChange={(value) => set('requestedAt', value)}
          />
        </Field>
        <SelectRow
          label="Letter time zone"
          required
          hint={
            show('requestedAtTimezone') ? (
              <span className="text-error-700">{show('requestedAtTimezone')}</span>
            ) : undefined
          }
          value={draft.requestedAtTimezone}
          onChange={(value) => set('requestedAtTimezone', value)}
          options={ERASURE_TIMEZONES.map((zone) => ({ value: zone, label: zone }))}
        />
      </div>
    </Modal>
  );
}

/** PDH-5 — tanggal surat & pencatatan berdampingan + pelacak per service. Nol tombol "tandai selesai". */
export function ErasureDetailModal({
  actor,
  id,
  onClose,
}: {
  actor: SettingsActor;
  id: string | null;
  onClose: () => void;
}) {
  const detail = useErasureDetail(actor, id);
  const data = detail.data;
  const summary = data ? summarizeProgress(data.progress) : null;
  return (
    <Modal
      open={Boolean(id)}
      onOpenChange={(next) => !next && onClose()}
      title="Erasure request"
      description="Status moves only when services report back — there is no manual completion."
      size="wide"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {detail.isLoading || !data ? (
        <p className="font-body text-[13px] font-medium text-fg-3">
          {detail.error ? detail.error.message : 'Loading…'}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <FactTable
            rows={[
              { label: 'Subject', value: <SubjectCell nama={data.nama} nik={data.nik} /> },
              { label: 'Status', value: <ErasureStatusBadge value={data.requestStatus} /> },
              { label: 'Letter date', value: `${formatDate(data.requestedAt)} · ${data.requestedAtTimezone}` },
              {
                label: 'Recorded by',
                value: `${formatDateTime(data.createdAt)} · ${data.createdBy.nama} (NIK ${data.createdBy.nik})`,
              },
              { label: 'Completed', value: formatDateTime(data.completedAt) },
              {
                label: 'Services',
                value: `${summary?.completedService}/${summary?.totalService} completed · ${summary?.heldService} held`,
              },
            ]}
          />
          <ProgressTable progress={data.progress} />
        </div>
      )}
    </Modal>
  );
}
