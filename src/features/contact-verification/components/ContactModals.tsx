import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/Modal';
import { StatusBadge } from '@/components/StatusBadge';
import type { BadgeTone } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { useCancelAccess } from '@/features/contact-verification/hooks/useContactVerification';
import { contactVerificationService } from '@/features/contact-verification/services/contact-verification.service';
import { CANCEL_REASON_LABEL, CHANNEL_STATUS_LABEL, KIND_LABEL, SKIP_REASON_LABEL } from '@/features/contact-verification/types';
import type {
  CancelReason,
  ChannelStatus,
  ContactKind,
  ContactVerification,
  SendResult,
} from '@/features/contact-verification/types';
import { formatDate } from '@/lib/format';

const TONE: Record<ChannelStatus, BadgeTone> = {
  NOT_REQUIRED: 'mute',
  NOT_SENT: 'mute',
  LINK_SENT: 'info',
  LINK_EXPIRED: 'warn',
  VERIFIED: 'ok',
};

export function ChannelBadge({ status }: { status: ChannelStatus }) {
  return <StatusBadge tone={TONE[status]}>{CHANNEL_STATUS_LABEL[status]}</StatusBadge>;
}

/** Ringkasan hasil kirim: terkirim vs dilewati beserta alasannya. */
export function SendResultModal({
  result,
  kind,
  names,
  onClose,
}: {
  result: SendResult | null;
  kind: ContactKind;
  names: Record<string, string>;
  onClose: () => void;
}) {
  if (!result) return null;
  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={`${result.sent} sent, ${result.skipped} skipped`}
      description={`Each ${KIND_LABEL[kind]} is valid for 24 hours. Sending again kills the previous link at once.`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {result.results.map((row) => {
          const link = row.status === 'SENT' ? contactVerificationService.demoLink(row.id, kind) : undefined;
          return (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border-1 pb-2 last:border-b-0">
              <span className="font-body text-[13px] font-semibold text-fg-1">{names[row.id] ?? row.id}</span>
              <span className="flex items-center gap-2.5">
                {link && (
                  <Link to={link} className="font-body text-xs font-semibold text-secondary-700 underline">
                    Open demo link
                  </Link>
                )}
                <StatusBadge tone={row.status === 'SENT' ? 'ok' : 'warn'}>
                  {row.status === 'SENT' ? 'Sent' : SKIP_REASON_LABEL[row.reason!]}
                </StatusBadge>
              </span>
            </li>
          );
        })}
      </ul>
      <span className="font-body text-xs font-normal text-fg-3">
        Demo links exist only in dummy mode and open in this tab; the real link is delivered only to the owner.
      </span>
    </Modal>
  );
}

/** Dialog Cancel access (§7.21, FSD §14.4 EPV-CANCEL). */
export function CancelAccessModal({ row, onClose }: { row: ContactVerification | null; onClose: () => void }) {
  const cancel = useCancelAccess();
  const [reason, setReason] = useState<CancelReason | ''>('');
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setReason('');
    setText('');
    setTouched(false);
  }, [row]);

  if (!row) return null;
  const textRequired = reason === 'OTHER';
  const reasonError = touched && !reason ? 'Choose a reason.' : '';
  const textError = touched && textRequired && !text.trim() ? 'Describe the reason when choosing Other.' : '';

  const submit = () => {
    setTouched(true);
    if (!reason || (textRequired && !text.trim())) return;
    cancel.mutate({ row, reasonCode: reason, reasonText: text }, { onSuccess: onClose });
  };

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title="Cancel access?"
      description="Login access is revoked immediately and cannot be undone here. An offboarding request (cancelled before start) is opened for approval."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Back
          </Button>
          <Button variant="danger" disabled={cancel.isPending} onClick={submit}>
            {cancel.isPending ? 'Cancelling…' : 'Cancel access'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <KeyValueList>
          <KeyValueRow label="Employee">{row.employeeName}</KeyValueRow>
          <KeyValueRow label="Company email">{row.companyEmail ?? '—'}</KeyValueRow>
          <KeyValueRow label="Join date">{formatDate(row.joinDate)}</KeyValueRow>
        </KeyValueList>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cancel-reason">
            Reason<em>*</em>
          </Label>
          <Select value={reason} onValueChange={(value) => setReason(value as CancelReason)}>
            <SelectTrigger id="cancel-reason" aria-invalid={Boolean(reasonError)} aria-describedby="cancel-reason-desc">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CANCEL_REASON_LABEL) as CancelReason[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {CANCEL_REASON_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {reasonError && (
            <span id="cancel-reason-desc" role="alert" className="font-body text-xs font-medium text-error-800">
              {reasonError}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="cancel-text">
            Details{textRequired && <em>*</em>}
          </Label>
          <Textarea
            id="cancel-text"
            rows={3}
            maxLength={500}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={textRequired ? 'Required for Other' : 'Optional'}
            aria-invalid={Boolean(textError)}
            aria-describedby="cancel-text-desc"
          />
          {textError ? (
            <span id="cancel-text-desc" role="alert" className="font-body text-xs font-medium text-error-800">
              {textError}
            </span>
          ) : (
            <span id="cancel-text-desc" className="font-body text-xs font-normal text-fg-3">
              Up to 500 characters.
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
