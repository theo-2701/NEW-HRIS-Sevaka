import { useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { DateField } from '@/components/form/DateField';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { EMPLOYEES, employeeName } from '@/features/time-off/mock-data';
import { JOB_GRADE_OPTIONS } from '@/features/new-joiner/types';
import { useInviteCandidate, useMaterializeCandidate } from '@/features/ats-bridge/hooks/useAtsBridge';
import { atsBridgeService } from '@/features/ats-bridge/services/ats-bridge.service';
import { ATS_TODAY } from '@/features/ats-bridge/mock-data';
import { ATS_STATUS_LABEL, ATS_STATUS_MEANING, SOURCE_LABEL } from '@/features/ats-bridge/types';
import type { AtsCandidate, AtsStatus, MaterializeDraft, MaterializeResult } from '@/features/ats-bridge/types';
import { formatDateTime } from '@/lib/format';
import { toast } from '@/store/ui.store';

const TONE: Record<AtsStatus, BadgeTone> = { WAITING_CANDIDATE: 'warn', COMPLETED: 'ok', USED: 'mute' };

export function AtsStatusBadge({ status }: { status: AtsStatus }) {
  return <StatusBadge tone={TONE[status]}>{ATS_STATUS_LABEL[status]}</StatusBadge>;
}

const inviteSchema = Yup.object({
  email: Yup.string().trim().required('Candidate email is required.').email('Enter a valid email address.'),
  requestor: Yup.string().required('Requestor is required.'),
});

export function InviteCandidateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const invite = useInviteCandidate();
  return (
    <Formik
      initialValues={{ email: '', requestor: '' }}
      validationSchema={inviteSchema}
      onSubmit={(values, helpers) =>
        invite.mutate(values, {
          onSuccess: () => {
            helpers.resetForm();
            onClose();
          },
        })
      }
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
            title="Invite candidate"
            description="The candidate receives a consent link and fills in their own data. Personal data never passes through this screen."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button onClick={submitForm} disabled={invite.isPending}>
                  {invite.isPending ? 'Sending…' : 'Send invitation'}
                </Button>
              </>
            }
          >
            <Form className="flex flex-col gap-4">
              <TextField name="email" label="Candidate email" required type="email" autoComplete="off" />
              <SelectField
                name="requestor"
                label="Requestor"
                required
                placeholder="Select employee"
                options={EMPLOYEES.map((row) => ({ value: row.id, label: `${row.name} · ${row.unit}` }))}
                hint="The employee who asked for this hire; their name is kept as a snapshot."
              />
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

export function AtsDetailModal({ row, onClose }: { row: AtsCandidate | null; onClose: () => void }) {
  if (!row) return null;
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={row.candidateName ?? row.candidateEmail}
      description="Personal data (ID card, passport, address) is not shown here by design."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <KeyValueList>
          <KeyValueRow label="Status">
            <AtsStatusBadge status={row.atsStatus} />
          </KeyValueRow>
          <KeyValueRow label="Email">{row.candidateEmail}</KeyValueRow>
          <KeyValueRow label="Source">{SOURCE_LABEL[row.source]}</KeyValueRow>
          <KeyValueRow label="Consent">{row.consentStatus === 'AGREED' ? 'Agreed' : row.consentStatus === 'DECLINED' ? 'Declined' : '—'}</KeyValueRow>
          <KeyValueRow label="Requestor">{employeeName(row.requestorEmployeeId)}</KeyValueRow>
          <KeyValueRow label="Link">
            {row.linkSentAt ? `Sent ${row.linkSendCount}× · last ${formatDateTime(row.linkSentAt)}` : '—'}
          </KeyValueRow>
          <KeyValueRow label="Valid until">{row.tokenExpiresAt ? formatDateTime(row.tokenExpiresAt) : '—'}</KeyValueRow>
          <KeyValueRow label="Completed">{row.completedAt ? formatDateTime(row.completedAt) : '—'}</KeyValueRow>
          {row.parentId && <KeyValueRow label="Replaces">Earlier record {row.parentId}</KeyValueRow>}
          {row.usedEmployeeId && <KeyValueRow label="Employee">{row.usedEmployeeId}</KeyValueRow>}
        </KeyValueList>
        <dl className="m-0 flex flex-col gap-2.5">
          {(Object.keys(ATS_STATUS_MEANING) as AtsStatus[]).map((status) => (
            <div key={status} className="flex flex-col gap-1">
              <dt>
                <AtsStatusBadge status={status} />
              </dt>
              <dd className="m-0 font-body text-[13px] font-medium leading-[1.5] text-fg-2">{ATS_STATUS_MEANING[status]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Modal>
  );
}

const materializeSchema = Yup.object({
  joinDate: Yup.string().required('Start date is required.'),
  jobGradeId: Yup.string().required('Grade is required.'),
  nik: Yup.string().trim().required('NIK is required.'),
  username: Yup.string().trim().matches(/^[a-z0-9.]*$/, 'Lowercase letters, digits, and dots only.'),
  companyEmail: Yup.string().trim().required('Company email is required.').email('Enter a valid email address.'),
});

/**
 * Create Employee (§7.4.12 #6): kandidat Bulk Import Completed menjadi karyawan tanpa
 * New Joiner. Sandi awal kotak surat ditampilkan SEKALI untuk tim IT support.
 */
export function MaterializeModal({ row, onClose }: { row: AtsCandidate | null; onClose: () => void }) {
  const materialize = useMaterializeCandidate();
  const [result, setResult] = useState<MaterializeResult | null>(null);
  const [key] = useState(() => crypto.randomUUID());
  if (!row) return null;

  const close = () => {
    setResult(null);
    onClose();
  };
  const suggestion = atsBridgeService.suggestion(row, 120);

  if (result) {
    return (
      <Modal
        open
        onOpenChange={(next) => !next && close()}
        title="Employee created"
        description="Copy the mailbox password now — it is shown only once and is not stored anywhere."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard?.writeText(result.mailboxInitialPassword).then(() => toast('Password copied.', 'ok'))
              }
            >
              Copy password
            </Button>
            <Button onClick={close}>Done</Button>
          </>
        }
      >
        <KeyValueList>
          <KeyValueRow label="Employee">{result.employeeId}</KeyValueRow>
          <KeyValueRow label="Username">{result.username}</KeyValueRow>
          <KeyValueRow label="Company email">{result.companyEmail ?? '—'}</KeyValueRow>
          <KeyValueRow label="Mailbox password">
            <span className="font-mono text-[13px]">{result.mailboxInitialPassword}</span>
          </KeyValueRow>
        </KeyValueList>
        <span className="font-body text-xs font-normal text-fg-3">
          The employee also joins the Email and Phone Verification queue to prove their company email and phone.
        </span>
      </Modal>
    );
  }

  return (
    <Formik<MaterializeDraft>
      initialValues={{ joinDate: '', jobGradeId: '', nik: suggestion.nik, username: suggestion.username, companyEmail: suggestion.companyEmail }}
      validationSchema={materializeSchema}
      onSubmit={(values) => materialize.mutate({ id: row.id, draft: values, key }, { onSuccess: setResult })}
    >
      {({ submitForm }) => (
        <Modal
          open
          onOpenChange={(next) => !next && close()}
          size="wide"
          title={`Create employee — ${row.candidateName ?? row.candidateEmail}`}
          description="Turns this Bulk Import candidate into an employee without a New Joiner request. Suggested values can be changed."
          footer={
            <>
              <Button variant="secondary" onClick={close}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={materialize.isPending}>
                {materialize.isPending ? 'Creating…' : 'Create employee'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <DateField name="joinDate" label="Start date" required min={ATS_TODAY} placeholder="Select date" />
              <SelectField name="jobGradeId" label="Grade (class)" required placeholder="Select grade" options={JOB_GRADE_OPTIONS} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="nik" label="NIK" required hint="Next number in sequence; change it if needed." />
              <TextField name="username" label="Username" hint="Derived from the email when left as suggested." />
            </div>
            <TextField
              name="companyEmail"
              label="Company email"
              required
              hint={row.emailDomain ? `Domain chosen at Bulk Import approval: ${row.emailDomain}` : undefined}
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}
