import { useEffect, useState } from 'react';
import { Clock, Info, ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { LoanStatusBadge, ReservationBadge } from '@/features/loan/components/LoanBits';
import { HOLDS, REJECTION_REASONS, employeeOf, gradeName } from '@/features/loan/mock-data';
import { activeHoldOn, reservationStateOf } from '@/features/loan/rules';
import {
  useApproveLoan,
  useCancelLoan,
  useRejectLoan,
  useWithdrawLoan,
} from '@/features/loan/hooks/useLoan';
import type { Loan } from '@/features/loan/types';
import { formatCurrency, formatDate } from '@/lib/format';

/** Ringkasan permintaan yang dipakai ulang modal keputusan dan penolakan. */
function LoanSummary({ loan, full }: { loan: Loan; full?: boolean }) {
  const employee = employeeOf(loan.employeeId);
  return (
    <KeyValueList>
      <KeyValueRow label="Employee">
        {employee ? `${employee.name} · ${gradeName(employee.gradeId)}` : '—'}
      </KeyValueRow>
      <KeyValueRow label="Principal">{formatCurrency(loan.principalAmount)}</KeyValueRow>
      <KeyValueRow label="Tenor">{loan.tenorMonths} months</KeyValueRow>
      {full && (
        <>
          <KeyValueRow label="Scheme">
            {loan.interestBearingSnapshot
              ? 'Interest-bearing — bunga datang dari pihak pemberi dana'
              : 'Interest-free'}
          </KeyValueRow>
          <KeyValueRow label="Cost center">
            {loan.costCenterIdSnapshot ?? (
              <span className="font-normal text-fg-3">null — snapshot diambil saat pengajuan (GAP-2)</span>
            )}
          </KeyValueRow>
          <KeyValueRow label="Reservation">
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {formatCurrency(loan.principalAmount)}
              <ReservationBadge state={reservationStateOf(loan.status)} />
            </span>
          </KeyValueRow>
          <KeyValueRow label="Submitted">{formatDate(loan.submittedAt)}</KeyValueRow>
          <KeyValueRow label="Status">
            <LoanStatusBadge status={loan.status} />
          </KeyValueRow>
        </>
      )}
    </KeyValueList>
  );
}

/**
 * Keputusan atasan (LN-B3). Diambil dengan token principal miliknya sendiri;
 * statusnya tidak ditulis di sini — kedua cabang kembali 202 Accepted.
 */
export function LoanDecisionModal({
  loan,
  onClose,
  onReject,
}: {
  loan: Loan | null;
  onClose: () => void;
  onReject: (loan: Loan) => void;
}) {
  const approve = useApproveLoan();
  const hold = loan ? activeHoldOn(HOLDS, loan.id) : undefined;

  return (
    <Modal
      open={Boolean(loan)}
      onOpenChange={(next) => !next && onClose()}
      title={loan ? `Decision — ${loan.requestNo}` : ''}
      description="Diambil dengan token principal Anda sendiri — token service ditolak 403."
      size="wide"
      footer={
        loan ? (
          <>
            <Button variant="secondary" onClick={() => onReject(loan)}>
              Reject
            </Button>
            <Button
              disabled={Boolean(hold) || approve.isPending}
              title={hold ? 'Diblokir penahanan sengketa yang masih aktif' : undefined}
              onClick={() => approve.mutate({ id: loan.id, status: loan.status }, { onSuccess: onClose })}
            >
              Approve
            </Button>
          </>
        ) : null
      }
    >
      {loan && (
        <div className="flex flex-col gap-4">
          {hold && (
            <Note tone="danger" icon={<ShieldAlert />}>
              Permintaan ini sedang ditahan sengketa ({hold.targetRequestNo}). Keputusan diblokir sampai penahanannya
              dilepas.
            </Note>
          )}

          <LoanSummary loan={loan} full />

          <Note icon={<Clock />}>
            <strong>Statusnya tidak ditulis di sini.</strong> Kedua cabang kembali 202 Accepted — "diteruskan, menunggu
            prosesnya".
          </Note>
        </div>
      )}
    </Modal>
  );
}

/** Penolakan berdiri sendiri: keputusan singkat dengan satu tujuan. */
export function LoanRejectModal({
  loan,
  onClose,
  onBack,
}: {
  loan: Loan | null;
  onClose: () => void;
  onBack: (loan: Loan) => void;
}) {
  const reject = useRejectLoan();
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (loan) {
      setReasonId('');
      setNote('');
    }
  }, [loan]);

  const reason = REJECTION_REASONS.find((row) => row.id === reasonId);
  const needsNote = Boolean(reason?.requiresFreeText);
  const ready = Boolean(reason) && (!needsNote || note.trim().length > 0);

  return (
    <Modal
      open={Boolean(loan)}
      onOpenChange={(next) => !next && onClose()}
      title={loan ? `Reject ${loan.requestNo}` : ''}
      description="Alasannya tercatat bersama keputusan, dan reservasinya dilepas saat prosesnya selesai."
      size="wide"
      footer={
        <>
          <Button variant="secondary" onClick={() => loan && onBack(loan)}>
            Back to decision
          </Button>
          <Button
            variant="danger"
            disabled={!ready || reject.isPending}
            onClick={() =>
              loan &&
              reason &&
              reject.mutate(
                { id: loan.id, reasonId, note, requestNo: loan.requestNo, reasonName: reason.name },
                { onSuccess: onClose },
              )
            }
          >
            Reject request
          </Button>
        </>
      }
    >
      {loan && (
        <div className="flex flex-col gap-4">
          <LoanSummary loan={loan} />

          <div className="flex flex-col gap-1">
            <Label>
              Rejection reason<em>*</em>
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
            <Label htmlFor="loanRejectNote">
              Note{needsNote ? <em>*</em> : <span className="ml-1.5 font-medium text-fg-4">(optional)</span>}
            </Label>
            <Textarea
              id="loanRejectNote"
              rows={3}
              maxLength={500}
              value={note}
              placeholder="Input text here"
              onChange={(event) => setNote(event.target.value)}
            />
            <span className="font-body text-xs font-normal text-fg-3">
              Wajib untuk alasan yang menuntut penjelasan bebas. Detail medis dilarang ada di catatan ini.
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}

/**
 * Pembatalan dan penarikan — dua pintu keluar milik pengaju yang berbeda
 * statusnya, jadi satu modal dengan satu maksud yang dipilih pemanggilnya.
 */
export function LoanExitModal({
  loan,
  mode,
  onClose,
}: {
  loan: Loan | null;
  mode: 'cancel' | 'withdraw';
  onClose: () => void;
}) {
  const cancel = useCancelLoan();
  const withdraw = useWithdrawLoan();
  const pending = cancel.isPending || withdraw.isPending;

  return (
    <Modal
      open={Boolean(loan)}
      onOpenChange={(next) => !next && onClose()}
      title={mode === 'cancel' ? 'Cancel loan request' : 'Withdraw loan request'}
      description={
        mode === 'cancel'
          ? 'Hanya berlaku selagi permintaannya masih SUBMITTED. Barisnya tetap tersimpan.'
          : 'Berlaku setelah permintaannya duduk di AWAITING_CALCULATION menunggu pihak pemberi dana.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="danger"
            disabled={pending}
            onClick={() => {
              if (!loan) return;
              const vars = { id: loan.id, requestNo: loan.requestNo };
              if (mode === 'cancel') cancel.mutate(vars, { onSuccess: onClose });
              else withdraw.mutate(vars, { onSuccess: onClose });
            }}
          >
            {mode === 'cancel' ? 'Cancel request' : 'Withdraw request'}
          </Button>
        </>
      }
    >
      {loan && (
        <div className="flex flex-col gap-4">
          <Note icon={<Info />}>
            Reservasinya dilepas begitu tersimpan, jadi ruang pinjam Anda kembali utuh.
          </Note>
          <KeyValueList>
            <KeyValueRow label="Request no.">{loan.requestNo}</KeyValueRow>
            <KeyValueRow label="Principal">{formatCurrency(loan.principalAmount)}</KeyValueRow>
            <KeyValueRow label="Status">
              <LoanStatusBadge status={loan.status} />
            </KeyValueRow>
          </KeyValueList>
        </div>
      )}
    </Modal>
  );
}
