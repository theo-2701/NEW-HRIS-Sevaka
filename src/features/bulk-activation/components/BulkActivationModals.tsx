import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { useUpdateAccount } from '@/features/bulk-activation/hooks/useBulkActivation';
import { INVITATION_LABEL, PHONE_PATTERN } from '@/features/bulk-activation/types';
import type { InvitationStatus, PendingAccount, SendSummary } from '@/features/bulk-activation/types';

const TONE: Record<InvitationStatus, BadgeTone> = {
  NOT_SENT: 'mute',
  SENDING: 'info',
  SENT: 'ok',
  FAILED: 'err',
  EXPIRED: 'warn',
};

/** Lencana status; Failed to send membawa alasannya sebagai keterangan yang bisa dibaca. */
export function InvitationBadge({ row }: { row: PendingAccount }) {
  return (
    <span className="inline-flex flex-col gap-1">
      <StatusBadge tone={TONE[row.invitationStatus]}>{INVITATION_LABEL[row.invitationStatus]}</StatusBadge>
      {row.invitationStatus === 'FAILED' && row.failureReason && (
        <span className="font-body text-[11px] font-medium text-error-800">{row.failureReason}</span>
      )}
    </span>
  );
}

const schema = Yup.object({
  email: Yup.string().trim().required('Email is required.').email('Enter a valid email address.'),
  phone: Yup.string()
    .trim()
    .required('Phone number is required.')
    .matches(PHONE_PATTERN, 'Start with +62 8 or 08, 9 to 14 digits.'),
});

/** Ubah email/HP undangan — Save langsung mengirim ulang tautan (undangan lama batal). */
export function EditAccountModal({ row, onClose }: { row: PendingAccount | null; onClose: () => void }) {
  const update = useUpdateAccount();
  if (!row) return null;

  return (
    <Formik
      initialValues={{ email: row.email, phone: row.phoneNumber }}
      validationSchema={schema}
      onSubmit={(values) => update.mutate({ id: row.employeeId, ...values }, { onSuccess: onClose })}
    >
      {({ submitForm }) => (
        <Modal
          open
          onOpenChange={(next) => !next && onClose()}
          title={`Edit invitation — ${row.name}`}
          description="Saving sends a fresh activation link right away; the previous link stops working."
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save and resend'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            {update.error && (
              <p role="alert" className="m-0 rounded-md bg-error-100 px-3 py-2 font-body text-[13px] font-medium text-error-800">
                {update.error.message}
              </p>
            )}
            <TextField name="email" label="Email" required type="email" autoComplete="off" />
            <TextField name="phone" label="Phone number" required inputMode="tel" hint="Saved as +62…" />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

export function SendSummaryModal({
  summary,
  names,
  onClose,
}: {
  summary: SendSummary | null;
  names: Record<string, string>;
  onClose: () => void;
}) {
  if (!summary) return null;
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`${summary.sent} sent, ${summary.skipped} skipped`}
      description="Statuses update automatically while invitations are being sent."
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className="m-0 flex max-h-[360px] list-none flex-col gap-2 overflow-y-auto p-0">
        {summary.results.map((row) => (
          <li key={row.employeeId} className="flex flex-wrap items-center justify-between gap-2 border-b border-border-1 pb-2 last:border-b-0">
            <span className="font-body text-[13px] font-semibold text-fg-1">{names[row.employeeId] ?? row.employeeId}</span>
            <StatusBadge tone={row.status === 'SENT' ? 'ok' : 'warn'}>{row.status === 'SENT' ? 'Sent' : row.reason}</StatusBadge>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
