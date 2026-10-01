import { useEffect, useState } from 'react';
import { DatePicker, DateRangePicker } from '@/components/DatePicker';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { EmployeeRow, Field, SelectRow, TextRow } from '@/features/company/components/CompanyBits';
import { CorrectionBadge, ErrorBanner, Note, OriginBadge } from '@/features/productivity/components/ProdBits';
import {
  useAcceptSystemStop,
  useActivityTypes,
  useGrantWindow,
  useUpdateWorklog,
  useWorklogChanges,
} from '@/features/productivity/hooks/useTimesheet';
import { formatMinutes, nameOf, subordinatesOf } from '@/features/productivity/rules';
import { projectService } from '@/features/productivity/services/project.service';
import { PROD_EMPLOYEES, prodEmployeeSource } from '@/features/productivity/mock-data';
import type { ProdActor, Worklog, WorklogPatch } from '@/features/productivity/types';
import { formatDate, formatDateTime } from '@/lib/format';

const FIELD_LABEL: Record<string, string> = {
  duration_minutes: 'Duration (minutes)',
  activity_type_id: 'Activity type',
  task_id: 'Task',
  work_date: 'Work date',
  notes: 'Notes',
  deleted_at: 'Deleted',
};

function Facts({ row }: { row: Worklog }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2 font-body text-[13px]">
      <dt className="font-semibold text-fg-3">Owner</dt>
      <dd className="m-0 font-semibold text-fg-1">{nameOf(row.employeeId)}</dd>
      <dt className="font-semibold text-fg-3">Task</dt>
      <dd className="m-0 font-semibold text-fg-1">{projectService.taskRef(row.taskId)?.taskTitle ?? row.taskId}</dd>
      <dt className="font-semibold text-fg-3">Date</dt>
      <dd className="m-0 font-semibold text-fg-1">{formatDate(row.workDate)}</dd>
      <dt className="font-semibold text-fg-3">Duration</dt>
      <dd className="m-0 font-semibold text-fg-1">{formatMinutes(row.durationMinutes)}</dd>
      <dt className="font-semibold text-fg-3">Origin</dt>
      <dd className="m-0 flex flex-wrap gap-1.5">
        <OriginBadge value={row.origin} />
        <CorrectionBadge value={row.correctionMode} />
      </dd>
    </dl>
  );
}

/** Riwayat `log_worklog_change` (tanpa alasan — beda dari riwayat task) + jejak penerimaan atasan bila ada. */
function History({ actor, worklogId }: { actor: ProdActor; worklogId: string }) {
  const history = useWorklogChanges(actor, worklogId);
  const data = history.data;
  if (!data) return null;
  return (
    <Field label="History" hint="Corrections by the owner, and acceptance by a supervisor — newest first.">
      <div className="flex flex-col gap-2">
        {data.acceptance && (
          <div className="rounded-md border border-fog px-3 py-2 font-body text-[13px]">
            <span className="font-bold text-fg-1">Accepted as is</span>{' '}
            <span className="text-fg-3">
              by {data.acceptance.createdBy.name} · {formatDateTime(data.acceptance.createdAt)}
            </span>
          </div>
        )}
        {data.changes.map((row) => (
          <div key={row.id} className="rounded-md border border-fog px-3 py-2 font-body text-[13px]">
            <span className="font-bold text-fg-1">{FIELD_LABEL[row.changedField] ?? row.changedField}</span>{' '}
            <span className="text-fg-2">
              {row.oldValue ?? '—'} → {row.newValue ?? '—'}
            </span>
            <div className="text-xs font-medium text-fg-3">
              {row.createdBy.name} · {formatDateTime(row.createdAt)}
            </div>
          </div>
        ))}
        {!data.acceptance && data.changes.length === 0 && (
          <p className="m-0 font-body text-[13px] font-medium text-fg-3">No change recorded.</p>
        )}
      </div>
    </Field>
  );
}

/**
 * `AC-A3` — pemilik menyunting catatannya sendiri. Baris "Dihentikan Sistem" yang dikoreksi di sini menjadi
 * "Dikoreksi Pemilik" — asalnya tetap. Jendela: `entry_window_days` sejak tanggal kerja, kecuali ada grant.
 */
export function EditWorklogModal({
  actor,
  row,
  onClose,
}: {
  actor: ProdActor;
  row: Worklog | null;
  onClose: () => void;
}) {
  const update = useUpdateWorklog();
  const activities = useActivityTypes();
  const [form, setForm] = useState({ duration: '', activityTypeId: '', workDate: '', notes: '' });
  useEffect(() => {
    if (!row) return;
    setForm({
      duration: String(row.durationMinutes ?? ''),
      activityTypeId: row.activityTypeId ?? '',
      workDate: row.workDate,
      notes: row.notes ?? '',
    });
    update.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isi ulang saat baris berganti
  }, [row?.id]);
  if (!row) return null;
  const owner = row.employeeId === actor.employeeId;
  const patch: WorklogPatch = {};
  if (form.duration !== '' && Number(form.duration) !== row.durationMinutes)
    patch.durationMinutes = Number(form.duration);
  if ((form.activityTypeId || null) !== row.activityTypeId) patch.activityTypeId = form.activityTypeId || null;
  if (form.workDate !== row.workDate) patch.workDate = form.workDate;
  if ((form.notes.trim() || null) !== row.notes) patch.notes = form.notes.trim() || null;

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${row.code} · ${owner ? 'Edit time entry' : 'Time entry'}`}
      description={
        row.origin === 'DIHENTIKAN_SISTEM' && !row.correctionMode
          ? 'The system stopped this timer at the end of the day. Correct the duration, or ask your supervisor to accept it as is.'
          : undefined
      }
      size="wide"
      footer={
        owner ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!Object.keys(patch).length || update.isPending}
              onClick={() => update.mutate({ actor, id: row.id, patch }, { onSuccess: onClose })}
            >
              {update.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>Close</Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <ErrorBanner error={update.error} />
        <Facts row={row} />
        {owner ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Duration (minutes)"
              hint={row.durationMinutes !== null ? `Current ${row.durationMinutes} minutes` : undefined}
            >
              <Input
                type="number"
                min={0}
                value={form.duration}
                onChange={(event) => setForm((prev) => ({ ...prev, duration: event.target.value }))}
              />
            </Field>
            <SelectRow
              label="Activity type"
              allowEmpty
              emptyLabel="Not set"
              value={form.activityTypeId}
              onChange={(value) => setForm((prev) => ({ ...prev, activityTypeId: value }))}
              options={(activities.data ?? []).map((item) => ({ value: item.id, label: item.activityName }))}
            />
            <Field label="Work date">
              <DatePicker
                value={form.workDate}
                clearable={false}
                onChange={(value) => setForm((prev) => ({ ...prev, workDate: value }))}
              />
            </Field>
            <TextRow
              label="Notes"
              value={form.notes}
              onChange={(value) => setForm((prev) => ({ ...prev, notes: value }))}
            />
          </div>
        ) : (
          <Note>Only the owner can edit a time entry — supervisors and HR included.</Note>
        )}
        <History actor={actor} worklogId={row.id} />
      </div>
    </Modal>
  );
}

/** `AC-B3` — atasan menerima baris "Dihentikan Sistem" apa adanya; durasi TIDAK berubah. SoD: bukan baris sendiri. */
export function AcceptWorklogModal({
  actor,
  row,
  onClose,
}: {
  actor: ProdActor;
  row: Worklog | null;
  onClose: () => void;
}) {
  const accept = useAcceptSystemStop();
  if (!row) return null;
  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) {
          accept.reset();
          onClose();
        }
      }}
      title={`Accept ${row.code} as is`}
      description="Accepting keeps the duration exactly as the system recorded it, so the owner’s timesheet can be submitted."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={accept.isPending}
            onClick={() =>
              accept.mutate(
                { actor, id: row.id },
                {
                  onSuccess: () => {
                    accept.reset();
                    onClose();
                  },
                },
              )
            }
          >
            {accept.isPending ? 'Accepting…' : 'Accept as is'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={accept.error} />
        <Facts row={row} />
        <Note tone="warn">
          The duration will not change. Only a supervisor in the owner’s chain can accept — never the owner.
        </Note>
      </div>
    </Modal>
  );
}

/** `TS-11` — membuka jendela isi-mundur untuk bawahan; TIDAK menyunting catatan siapa pun. */
export function GrantWindowModal({ actor, open, onClose }: { actor: ProdActor; open: boolean; onClose: () => void }) {
  const grant = useGrantWindow();
  const targets =
    actor.role === 'ROLE_HR_MANAGER' || actor.role === 'ROLE_HR_STAFF'
      ? PROD_EMPLOYEES.filter((row) => row.employeeId !== actor.employeeId)
      : subordinatesOf(actor.employeeId);
  const [form, setForm] = useState({ targetEmployeeId: '', windowStartDate: '', windowEndDate: '', grantReason: '' });
  const close = () => {
    setForm({ targetEmployeeId: '', windowStartDate: '', windowEndDate: '', grantReason: '' });
    grant.reset();
    onClose();
  };
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Open entry window"
      description="Lets one employee add or correct their own entries for past dates. It does not change anyone’s entries."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={
              !form.targetEmployeeId ||
              !form.windowStartDate ||
              !form.windowEndDate ||
              !form.grantReason.trim() ||
              grant.isPending
            }
            onClick={() => grant.mutate({ actor, input: form }, { onSuccess: close })}
          >
            {grant.isPending ? 'Opening…' : 'Open window'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <ErrorBanner error={grant.error} />
        <EmployeeRow
          label="Employee"
          required
          lang="en"
          value={form.targetEmployeeId}
          onChange={(value) => setForm((prev) => ({ ...prev, targetEmployeeId: value }))}
          source={prodEmployeeSource(targets)}
        />
        <Field label="Window period" required>
          <DateRangePicker
            value={{ from: form.windowStartDate, to: form.windowEndDate }}
            onChange={(range) =>
              setForm((prev) => ({ ...prev, windowStartDate: range.from, windowEndDate: range.to }))
            }
          />
        </Field>
        <Field label="Reason" required>
          <Textarea
            rows={2}
            value={form.grantReason}
            onChange={(event) => setForm((prev) => ({ ...prev, grantReason: event.target.value }))}
          />
        </Field>
        <Note>The employee is not notified automatically — let them know.</Note>
      </div>
    </Modal>
  );
}
