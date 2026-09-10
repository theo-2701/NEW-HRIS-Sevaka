import { Form, Formik, useFormikContext } from 'formik';
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { TextField } from '@/components/form/TextField';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { AttendanceStatusBadge, CorrectionStatusBadge, DerivedBox } from '@/features/attendance/components/AttendanceBits';
import { employeeName } from '@/features/attendance/mock-data';
import { correctionSchema } from '@/features/attendance/validation';
import {
  ARRANGEMENT_LABEL,
  ATTENDANCE_STATUS_LABEL,
  CORRECTION_REASON_LABEL,
  EXCUSED_FROM_REASON,
  EXCUSED_REASON_LABEL,
} from '@/features/attendance/types';
import type {
  AttendanceDay,
  AttendanceSession,
  Correction,
  CorrectionDraft,
  CorrectionReasonType,
} from '@/features/attendance/types';
import { useCreateCorrection, useDecideCorrection, useWithdrawCorrection } from '@/features/attendance/hooks/useAttendance';
import { formatDate, formatDateTime } from '@/lib/format';

const REASON_OPTIONS = (Object.keys(CORRECTION_REASON_LABEL) as CorrectionReasonType[]).map((value) => ({
  value,
  label: CORRECTION_REASON_LABEL[value],
}));

const EMPTY: CorrectionDraft = {
  attendanceDailyId: '',
  correctionReasonType: '',
  reasonNote: '',
  requestedIn: '',
  requestedOut: '',
};

/** Snapshot hari yang akan dibaca approver — ikut nilai field, jadi di dalam Formik. */
function DaySnapshot({ days }: { days: AttendanceDay[] }) {
  const { values } = useFormikContext<CorrectionDraft>();
  const day = days.find((row) => row.id === values.attendanceDailyId);

  if (!day) {
    return (
      <DerivedBox
        heading="Frozen snapshot of the day being corrected"
        rows={[['Pilih hari untuk melihat snapshot yang akan dibaca approver.', '']]}
      />
    );
  }

  return (
    <DerivedBox
      heading="Frozen snapshot of the day being corrected"
      rows={[
        ['Day owner', employeeName(day.employeeId)],
        ['Current verdict', ATTENDANCE_STATUS_LABEL[day.attendanceStatus]],
        ['Expected hours', day.expectedIn ? `${day.expectedIn} – ${day.expectedOut}` : '—'],
        ['Applied tolerance', `${day.appliedLateToleranceMinutes} minutes`],
        ['Arrangement', ARRANGEMENT_LABEL[day.workArrangement]],
      ]}
    />
  );
}

/** Catatan alasan wajib hanya saat alasannya Other — bintangnya ikut pilihan. */
function ReasonNote() {
  const { values } = useFormikContext<CorrectionDraft>();
  return (
    <TextAreaField
      name="reasonNote"
      label="Reason note"
      required={values.correctionReasonType === 'OTHER'}
      rows={3}
      maxLength={500}
      placeholder="Input text here"
      hint="Mandatory only when the reason is Other; optional for the three named reasons."
    />
  );
}

export function CorrectionFormModal({
  open,
  session,
  days,
  onClose,
}: {
  open: boolean;
  session: AttendanceSession;
  days: AttendanceDay[];
  onClose: () => void;
}) {
  const create = useCreateCorrection(session);

  const dayOptions = days.map((day) => ({
    value: day.id,
    label: `${formatDate(day.workDate)} · ${employeeName(day.employeeId)} · ${ATTENDANCE_STATUS_LABEL[day.attendanceStatus]}`,
  }));

  return (
    <Formik<CorrectionDraft>
      initialValues={EMPTY}
      validationSchema={correctionSchema}
      enableReinitialize
      onSubmit={async (values, helpers) => {
        await create.mutateAsync(values);
        helpers.resetForm();
        onClose();
      }}
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            title="New attendance correction"
            description="The corrected day stays exactly as it is while this waits — nothing about it moves before a decision lands."
            size="wide"
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={create.isPending || !dayOptions.length}>
                  {create.isPending ? 'Mengirim…' : 'Submit correction'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="filedBy">
                  Filed by
                  <span className="ml-1.5 inline-flex items-center gap-1 align-middle font-body text-[10px] font-bold uppercase tracking-[0.05em] text-fg-4 [&_svg]:size-3">
                    <Lock />
                    terkunci
                  </span>
                </Label>
                <Input id="filedBy" readOnly tabIndex={-1} value={`${employeeName(session.employeeId)} — ${session.role}`} />
                <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
                  Read from the token, never typed. The filer and the owner of the day may be two different people — the
                  pair is kept apart precisely so the separation of duties can be audited.
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectField
                  name="attendanceDailyId"
                  label="Day to correct"
                  required
                  placeholder={dayOptions.length ? 'Select day' : 'Tidak ada hari yang memenuhi syarat'}
                  options={dayOptions}
                  disabled={!dayOptions.length}
                  hint="Days that already carry a pending correction drop out of this list until that one is decided or withdrawn."
                />
                <SelectField
                  name="correctionReasonType"
                  label="Correction reason"
                  required
                  placeholder="Select reason"
                  options={REASON_OPTIONS}
                  hint="Locked once submitted."
                />
              </div>

              <ReasonNote />

              <div className="grid gap-4 md:grid-cols-2">
                <TextField
                  name="requestedIn"
                  type="time"
                  label="Proposed clock-in"
                  hint="Kosongkan bila yang salah hanya jam pulang."
                />
                <TextField
                  name="requestedOut"
                  type="time"
                  label="Proposed clock-out"
                  hint="Minimal salah satu jam harus diusulkan."
                />
              </div>

              <DaySnapshot days={days} />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

/** Baris ringkas yang sama dipakai drawer keputusan dan modal detail. */
function CorrectionSummary({ correction, day }: { correction: Correction; day: AttendanceDay | undefined }) {
  return (
    <KeyValueList>
      <KeyValueRow label="Filed by">{employeeName(correction.employeeId)}</KeyValueRow>
      <KeyValueRow label="Day owner">{day ? employeeName(day.employeeId) : '—'}</KeyValueRow>
      <KeyValueRow label="Corrected day">{day ? formatDate(day.workDate) : '—'}</KeyValueRow>
      <KeyValueRow label="Current verdict">
        {day ? <AttendanceStatusBadge status={day.attendanceStatus} /> : '—'}
      </KeyValueRow>
      <KeyValueRow label="Expected (snapshot)">
        {day?.expectedIn ? `${day.expectedIn} – ${day.expectedOut}` : '—'}
      </KeyValueRow>
      <KeyValueRow label="Reason">{CORRECTION_REASON_LABEL[correction.correctionReasonType]}</KeyValueRow>
      <KeyValueRow label="Reason note">{correction.reasonNote || '—'}</KeyValueRow>
      <KeyValueRow label="Proposed in">{correction.requestedIn ?? '—'}</KeyValueRow>
      <KeyValueRow label="Proposed out">{correction.requestedOut ?? '—'}</KeyValueRow>
      <KeyValueRow label="Excused reason it would carry">
        {EXCUSED_REASON_LABEL[EXCUSED_FROM_REASON[correction.correctionReasonType]]}
      </KeyValueRow>
      <KeyValueRow label="Status">
        <CorrectionStatusBadge status={correction.correctionStatus} />
      </KeyValueRow>
      <KeyValueRow label="Submitted">{formatDateTime(correction.submittedAt)}</KeyValueRow>
    </KeyValueList>
  );
}

export function CorrectionDecisionModal({
  correction,
  kind,
  day,
  session,
  onClose,
}: {
  correction: Correction | null;
  kind: 'APPROVED' | 'REJECTED';
  day: AttendanceDay | undefined;
  session: AttendanceSession;
  onClose: () => void;
}) {
  const decide = useDecideCorrection(session);
  const approving = kind === 'APPROVED';

  return (
    <Modal
      open={Boolean(correction)}
      onOpenChange={(next) => !next && onClose()}
      title={approving ? 'Approve correction' : 'Reject correction'}
      description={
        approving
          ? 'Approving marks the day excused with the reason derived from the correction type — the raw minutes are left exactly as the machine measured them.'
          : 'Rejecting leaves the day completely untouched; nothing has to be restored because nothing ever changed.'
      }
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={approving ? 'primary' : 'danger'}
            disabled={decide.isPending}
            onClick={async () => {
              if (!correction) return;
              await decide.mutateAsync({ id: correction.id, kind });
              onClose();
            }}
          >
            {approving ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      {correction && (
        <div className="flex flex-col gap-4">
          <Note icon={<ShieldCheck />}>
            Separation of duties — a correction can never be approved by the person who filed it. The refusal is a{' '}
            <code>403</code> at the server, not a hidden button.
          </Note>
          <CorrectionSummary correction={correction} day={day} />
        </div>
      )}
    </Modal>
  );
}

export function CorrectionDetailModal({
  correction,
  day,
  onClose,
}: {
  correction: Correction | null;
  day: AttendanceDay | undefined;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(correction)}
      onOpenChange={(next) => !next && onClose()}
      title="Correction detail"
      description="Read-only — the reason is immutable once submitted."
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      {correction && <CorrectionSummary correction={correction} day={day} />}
    </Modal>
  );
}

export function WithdrawCorrectionModal({
  correction,
  day,
  session,
  onClose,
}: {
  correction: Correction | null;
  day: AttendanceDay | undefined;
  session: AttendanceSession;
  onClose: () => void;
}) {
  const withdraw = useWithdrawCorrection(session);

  return (
    <Modal
      open={Boolean(correction)}
      onOpenChange={(next) => !next && onClose()}
      title="Withdraw correction"
      description="Only a correction still waiting for a decision can be withdrawn — and withdrawing is not deleting: the row stays as Cancelled."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={withdraw.isPending}
            onClick={async () => {
              if (!correction) return;
              await withdraw.mutateAsync({ id: correction.id });
              onClose();
            }}
          >
            Withdraw
          </Button>
        </>
      }
    >
      {correction && (
        <div className="flex flex-col gap-4">
          <Note tone="warn" icon={<TriangleAlert />}>
            Barisnya tetap ada sebagai <strong>Cancelled</strong>, dan harinya kembali bebas dikoreksi.
          </Note>
          <KeyValueList>
            <KeyValueRow label="Correction">{correction.id}</KeyValueRow>
            <KeyValueRow label="Corrected day">{day ? formatDate(day.workDate) : '—'}</KeyValueRow>
            <KeyValueRow label="Reason">{CORRECTION_REASON_LABEL[correction.correctionReasonType]}</KeyValueRow>
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}
