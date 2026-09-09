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
  onClose,
}: {
  candidate: Candidate | null;
  rivals: number;
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
      title="Review candidate"
      description="Menyetujui akan menahan kursi dan menolak otomatis kandidat saingan di posisi yang sama."
      footer={
        <>
          <Button variant="danger" onClick={() => decide(reject)} disabled={pending}>
            Reject
          </Button>
          <Button onClick={() => decide(approve)} disabled={pending}>
            {approve.isPending ? 'Memproses…' : 'Approve & reserve seat'}
          </Button>
        </>
      }
    >
      {candidate && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Kandidat">{candidate.name}</KeyValueRow>
            <KeyValueRow label="Email">{candidate.email}</KeyValueRow>
            <KeyValueRow label="Posisi">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
            <KeyValueRow label="Kewarganegaraan">{NATIONALITY_LABEL[candidate.nationality]}</KeyValueRow>
            <KeyValueRow label="Identitas">
              {candidate.nationality === 'CITIZEN'
                ? `KTP •••• ${candidate.idCardLast4}`
                : `Paspor ${candidate.passportNumber}`}
            </KeyValueRow>
            <KeyValueRow label="Rencana masuk">{formatDate(candidate.intendedJoinDate)}</KeyValueRow>
            <KeyValueRow label="Maker">{candidate.maker}</KeyValueRow>
            <KeyValueRow label="Status">
              <CandidateStatusBadge status={candidate.status} />
            </KeyValueRow>
          </KeyValueList>

          {rivals > 0 && (
            <Note tone="warn" icon={<Users />}>
              <strong>
                {rivals} kandidat saingan
              </strong>{' '}
              di posisi ini akan otomatis ditolak begitu Anda menyetujui.
            </Note>
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor="checker-note">Catatan checker</Label>
            <Textarea
              id="checker-note"
              rows={2}
              maxLength={150}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Tersimpan bersama keputusan"
            />
          </div>
        </div>
      )}
    </Modal>
  );
}
