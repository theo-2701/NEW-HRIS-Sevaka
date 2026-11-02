import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CandidateStatusBadge,
  KeyValueList,
  KeyValueRow,
  Note,
} from '@/features/new-joiner/components/CandidateBits';
import { useApproveCandidate, useRejectCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { NATIONALITY_LABEL, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import type { Candidate } from '@/features/new-joiner/types';
import { formatDate } from '@/lib/format';

/**
 * NJ-APPROVE — checker memutuskan. Menyetujui menahan kursi dan otomatis
 * menolak kandidat saingan di posisi yang sama (FSD §4.2). Maker tidak boleh
 * memutuskan pengajuannya sendiri (SoD) — ditolak service dengan 409.
 */
export function ReviewCandidateModal({
  candidate,
  rivals,
  readOnly = false,
  onClose,
}: {
  candidate: Candidate | null;
  rivals: number;
  /** Pembuat pengajuan hanya melihat (T56; SoD tetap ditegakkan service 409). */
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const approve = useApproveCandidate();
  const reject = useRejectCandidate();

  useEffect(() => {
    if (candidate) setNote('');
  }, [candidate]);

  const decide = (mutation: typeof approve | typeof reject) => {
    if (!candidate) return;
    mutation.mutate({ id: candidate.id, name: candidate.name, note }, { onSuccess: onClose });
  };

  const pending = approve.isPending || reject.isPending;

  return (
    <Modal
      open={Boolean(candidate)}
      onOpenChange={(open) => !open && onClose()}
      size="wide"
      title={readOnly ? 'Candidate submission' : 'Review candidate'}
      description={
        readOnly
          ? 'You submitted this candidate, so another HR decides.'
          : 'Approving holds the seat and automatically rejects rival candidates for the same position.'
      }
      footer={
        readOnly ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : (
        <>
          <Button variant="danger" onClick={() => decide(reject)} disabled={pending}>
            Reject
          </Button>
          <Button onClick={() => decide(approve)} disabled={pending}>
            {approve.isPending ? 'Processing…' : 'Approve & reserve seat'}
          </Button>
        </>
        )
      }
    >
      {candidate && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Candidate">{candidate.name}</KeyValueRow>
            <KeyValueRow label="Email">{candidate.email}</KeyValueRow>
            <KeyValueRow label="Phone">{candidate.phone}</KeyValueRow>
            <KeyValueRow label="Position">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
            <KeyValueRow label="Nationality">{NATIONALITY_LABEL[candidate.nationality]}</KeyValueRow>
            <KeyValueRow label="Identity">
              {candidate.nationality === 'CITIZEN'
                ? `ID card •••• ${candidate.idCardLast4}`
                : `Passport ${candidate.passportNumber}`}
            </KeyValueRow>
            <KeyValueRow label="Intended join">{candidate.intendedJoinDate ? formatDate(candidate.intendedJoinDate) : '—'}</KeyValueRow>
            <KeyValueRow label="Maker">{candidate.maker}</KeyValueRow>
            <KeyValueRow label="Status">
              <CandidateStatusBadge status={candidate.status} />
            </KeyValueRow>
          </KeyValueList>

          {rivals > 0 && !readOnly && (
            <Note tone="warn" icon={<Users />}>
              <strong>
                {rivals} rival candidate(s)
              </strong>{' '}
              for this position are rejected automatically once you approve.
            </Note>
          )}

          {!readOnly && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="checker-note">Checker note</Label>
            <Textarea
              id="checker-note"
              rows={2}
              maxLength={150}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Saved with the decision"
            />
          </div>
          )}
        </div>
      )}
    </Modal>
  );
}
