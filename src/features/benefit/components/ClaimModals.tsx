import { useEffect, useState } from 'react';
import { Info, Lock, ShieldAlert, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/DataTable';
import { RowButton } from '@/components/RowActions';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { ClaimStatusBadge, Money, ReservationBadge } from '@/features/benefit/components/BenefitBits';
import {
  REJECTION_REASONS,
  employeeOf,
  gradeName,
} from '@/features/benefit/mock-data';
import { activeHoldOn, balanceOf, remainingOf } from '@/features/benefit/rules';
import { useApproveClaim, useCancelClaim, useRejectClaim } from '@/features/benefit/hooks/useBenefit';
import { HOLDS } from '@/features/benefit/mock-data';
import { RELATIONSHIP_LABEL } from '@/features/benefit/types';
import type { BenefitClaim, ClaimItem } from '@/features/benefit/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from '@/store/ui.store';

/** Baris nota di dalam detail klaim. */
function ItemsTable({ claim }: { claim: BenefitClaim }) {
  return (
    <DataTable<ClaimItem>
      rows={claim.items}
      rowKey={(row) => row.id}
      columns={[
        { key: 'date', header: 'Expense Date', nowrap: true, render: (row) => formatDate(row.expenseDate) },
        {
          key: 'who',
          header: 'Claimed For',
          render: (row) =>
            row.beneficiaryKind === 'SELF'
              ? 'Self'
              : `${row.beneficiaryId ?? '—'} · ${row.beneficiaryRelationshipSnapshot ? RELATIONSHIP_LABEL[row.beneficiaryRelationshipSnapshot] : '—'}`,
        },
        {
          key: 'receipt',
          header: 'Receipt No.',
          muted: true,
          render: (row) => <span className="font-mono text-xs">{row.receiptNo || '—'}</span>,
        },
        { key: 'amount', header: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
        {
          key: 'attachment',
          header: 'Attachment',
          align: 'center',
          render: () =>
            claim.containsHealthDataSnapshot ? (
              // Lampiran data kesehatan hanya bisa dibuka peran tertentu, dan
              // setiap pembukaan ditulis ke jejak akses medis.
              <RowButton disabled title="Terkunci — HR Manager / Health Data Officer / Super Admin saja">
                Locked
              </RowButton>
            ) : (
              <RowButton
                onClick={() =>
                  toast(
                    'Lampiran dibuka lewat document-service. Klaim ini tidak membawa data kesehatan, jadi tidak ada baris jejak akses medis yang ditulis.',
                    'info',
                  )
                }
              >
                Open
              </RowButton>
            ),
        },
      ]}
    />
  );
}

export function ClaimDetailModal({
  claim,
  asApprover,
  onClose,
  onReject,
}: {
  claim: BenefitClaim | null;
  asApprover: boolean;
  onClose: () => void;
  onReject: (claim: BenefitClaim) => void;
}) {
  const approve = useApproveClaim();
  const hold = claim ? activeHoldOn(HOLDS, claim.id) : undefined;
  const employee = claim ? employeeOf(claim.employeeId) : undefined;
  const balance = claim ? balanceOf(claim.periodId, claim.benefitTypeId) : undefined;
  // Peringatan kemiripan adalah isyarat untuk approver — pengaju tidak melihatnya.
  const warnings = asApprover && claim ? claim.similarityWarnings : [];

  return (
    <Modal
      open={Boolean(claim)}
      onOpenChange={(next) => !next && onClose()}
      title={claim ? `${asApprover ? 'Claim approval' : 'Claim'} ${claim.requestNo}` : ''}
      description={
        asApprover
          ? 'Nota bersifat baca-saja bagi approver. Keputusan diteruskan ke proses approval dan kembali 202 Accepted — statusnya ditulis belakangan.'
          : 'Snapshot milik server yang dibekukan saat pengajuan dan saat keputusan.'
      }
      size="wide"
      footer={
        asApprover && claim ? (
          <>
            <Button variant="secondary" onClick={() => onReject(claim)}>
              Reject
            </Button>
            <Button
              disabled={Boolean(hold) || approve.isPending}
              title={hold ? 'Diblokir penahanan sengketa yang masih aktif' : undefined}
              onClick={() => approve.mutate({ id: claim.id }, { onSuccess: onClose })}
            >
              Approve
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {claim && (
        <div className="flex flex-col gap-4">
          {warnings.length > 0 && (
            <Note tone="warn" icon={<TriangleAlert />}>
              <strong>Similarity warning.</strong>{' '}
              {warnings.map((row) => (
                <span key={row.itemId}>
                  Nota bertanggal {formatDate(row.matchedDate)} sebesar {formatCurrency(row.matchedAmount)} mirip
                  dengan entri {row.matchedModule} yang sudah ada.{' '}
                </span>
              ))}
              Pengakuan wajib diberikan sebelum menolak.
            </Note>
          )}

          {hold && (
            <Note tone="danger" icon={<ShieldAlert />}>
              Klaim ini sedang ditahan sengketa ({hold.targetRequestNo}). Persetujuan diblokir sampai penahanannya
              dilepas.
            </Note>
          )}

          <KeyValueList>
            <KeyValueRow label="Applicant">
              {employee ? `${employee.name} · ${gradeName(employee.gradeId)} · ${employee.nik}` : '—'}
            </KeyValueRow>
            <KeyValueRow label="Benefit type">{claim.benefitTypeName}</KeyValueRow>
            <KeyValueRow label="Period">{claim.periodId}</KeyValueRow>
            <KeyValueRow label="Amount claimed">{formatCurrency(claim.totalAmount)}</KeyValueRow>
            <KeyValueRow label="Status">
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <ClaimStatusBadge status={claim.status} />
                <ReservationBadge state={claim.reservationState} />
              </span>
            </KeyValueRow>
            <KeyValueRow label="Bank account">
              {claim.bankAccountSnapshot.bankCode} {claim.bankAccountSnapshot.accountNumber} ·{' '}
              {claim.bankAccountSnapshot.accountHolderName}
            </KeyValueRow>
            <KeyValueRow label="Cost center">
              {claim.costCenterIdSnapshot ?? (
                <span className="font-normal text-fg-3">null — cost center bawaan belum diseed (GAP-2, diwarisi)</span>
              )}
            </KeyValueRow>
            <KeyValueRow label="Submitted">{formatDate(claim.submittedAt)}</KeyValueRow>
            {asApprover && balance && (
              <KeyValueRow label="Entitlement if approved">
                Entitled {formatCurrency(balance.entitledAmount)} · reserved (HELD) {formatCurrency(claim.totalAmount)} →
                used (CONSUMED) {formatCurrency(claim.totalAmount)} · remaining {formatCurrency(remainingOf(balance))}
              </KeyValueRow>
            )}
            {claim.reasonNote && <KeyValueRow label="Rejection note">{claim.reasonNote}</KeyValueRow>}
          </KeyValueList>

          {claim.containsHealthDataSnapshot && (
            <Note icon={<Lock />}>
              Klaim ini membawa data kesehatan: lampirannya hanya bisa dibuka HR Manager / Health Data Officer / Super
              Admin, dan setiap pembukaan ditulis ke jejak akses medis.
            </Note>
          )}

          <ItemsTable claim={claim} />
        </div>
      )}
    </Modal>
  );
}

export function ClaimRejectModal({
  claim,
  onClose,
  onBack,
}: {
  claim: BenefitClaim | null;
  onClose: () => void;
  onBack: (claim: BenefitClaim) => void;
}) {
  const reject = useRejectClaim();
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (claim) {
      setReasonId('');
      setNote('');
      setAcknowledged(false);
    }
  }, [claim]);

  const reason = REJECTION_REASONS.find((row) => row.id === reasonId);
  const needsNote = Boolean(reason?.requiresFreeText);
  const needsAck = Boolean(claim?.similarityWarnings.length);
  const ready = Boolean(reason) && (!needsNote || note.trim().length > 0) && (!needsAck || acknowledged);

  return (
    <Modal
      open={Boolean(claim)}
      onOpenChange={(next) => !next && onClose()}
      title={claim ? `Reject claim ${claim.requestNo}` : ''}
      description="Menolak adalah keputusan singkat dengan satu tujuan — alasannya tercatat dan reservasinya dilepas saat prosesnya selesai."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={() => claim && onBack(claim)}>
            Back to claim
          </Button>
          <Button
            variant="danger"
            disabled={!ready || reject.isPending}
            onClick={() =>
              claim &&
              reason &&
              reject.mutate(
                {
                  id: claim.id,
                  reasonId,
                  note,
                  similarityAcknowledged: acknowledged,
                  requestNo: claim.requestNo,
                  reasonName: reason.name,
                },
                { onSuccess: onClose },
              )
            }
          >
            Reject claim
          </Button>
        </>
      }
    >
      {claim && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Applicant">{employeeOf(claim.employeeId)?.name ?? '—'}</KeyValueRow>
            <KeyValueRow label="Benefit type">{claim.benefitTypeName}</KeyValueRow>
            <KeyValueRow label="Amount claimed">
              {formatCurrency(claim.totalAmount)} · {claim.items.length} nota
            </KeyValueRow>
          </KeyValueList>

          {needsAck && (
            <Note tone="warn" icon={<TriangleAlert />}>
              <strong>Similarity warning.</strong>{' '}
              {claim.similarityWarnings.map((row) => (
                <span key={row.itemId}>
                  Nota bertanggal {formatDate(row.matchedDate)} sebesar {formatCurrency(row.matchedAmount)} mirip
                  dengan entri {row.matchedModule} yang sudah ada.{' '}
                </span>
              ))}
            </Note>
          )}

          <div className="flex flex-col gap-1">
            <Label>
              Reason<em>*</em>
            </Label>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REJECTION_REASONS.filter((row) => row.isActive).map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="rejectNote">
              Note{needsNote ? <em>*</em> : <span className="ml-1.5 font-medium text-fg-4">(optional)</span>}
            </Label>
            <Textarea
              id="rejectNote"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Input text here"
            />
            <span className="font-body text-xs font-normal text-fg-3">
              Wajib untuk alasan yang menuntut penjelasan bebas.
            </span>
          </div>

          {needsAck && (
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={acknowledged} onCheckedChange={(next) => setAcknowledged(next === true)} />
              <span className="font-body text-[13px] font-medium leading-[1.5] text-fg-2">
                Saya sudah membaca peringatan kemiripan di atas dan tetap menolak klaim ini.
              </span>
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ClaimCancelModal({ claim, onClose }: { claim: BenefitClaim | null; onClose: () => void }) {
  const cancel = useCancelClaim();
  return (
    <Modal
      open={Boolean(claim)}
      onOpenChange={(next) => !next && onClose()}
      title="Cancel claim"
      description="Barisnya tetap tersimpan; yang dilepas adalah nominal yang tadinya ditahan terhadap hak Anda."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={cancel.isPending}
            onClick={() =>
              claim && cancel.mutate({ id: claim.id, requestNo: claim.requestNo }, { onSuccess: onClose })
            }
          >
            Cancel claim
          </Button>
        </>
      }
    >
      {claim && (
        <div className="flex flex-col gap-4">
          <Note icon={<Info />}>Reservasi dilepas begitu pembatalan tersimpan, jadi hak Anda kembali utuh.</Note>
          <KeyValueList>
            <KeyValueRow label="Request no.">{claim.requestNo}</KeyValueRow>
            <KeyValueRow label="Amount">{formatCurrency(claim.totalAmount)}</KeyValueRow>
            <KeyValueRow label="Status">
              <ClaimStatusBadge status={claim.status} />
            </KeyValueRow>
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}
