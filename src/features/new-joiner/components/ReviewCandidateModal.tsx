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
import { useApproveCandidate } from '@/features/new-joiner/hooks/useNewJoiner';
import { NATIONALITY_LABEL, POSITION_OPTIONS, labelOf } from '@/features/new-joiner/types';
import type { Candidate } from '@/features/new-joiner/types';
import { formatDate } from '@/lib/format';

/**
 * Detail calon + NJ-APPROVE. `canDecide` = checker dan status SUBMITTED/IN_APPROVAL;
 * selain itu read-only. Checker **tidak punya Tolak** (FSD 0.17, TSD §7.4.9) — REJECTED
 * hanya otomatis untuk sibling. SoD maker ≠ checker ditegakkan server (409).
 */
export function ReviewCandidateModal({
  candidate,
  rivals,
  canDecide,
  onClose,
}: {
  candidate: Candidate | null;
  rivals: number;
  canDecide: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const approve = useApproveCandidate();

  useEffect(() => {
    if (candidate) setNote('');
  }, [candidate]);

  return (
    <Modal
      open={Boolean(candidate)}
      onOpenChange={(open) => !open && onClose()}
      size="wide"
      title={canDecide ? 'Review candidate' : 'Candidate detail'}
      description={
        canDecide
          ? 'Menyetujui akan menahan kursi dan menolak otomatis kandidat saingan di posisi yang sama.'
          : 'Read-only.'
      }
      footer={
        canDecide ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={approve.isPending}
              onClick={() =>
                candidate && approve.mutate({ id: candidate.id, name: candidate.name, note }, { onSuccess: onClose })
              }
            >
              {approve.isPending ? 'Memproses…' : 'Approve & reserve seat'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      {candidate && (
        <div className="flex flex-col gap-4">
          <KeyValueList>
            <KeyValueRow label="Kandidat">{candidate.name}</KeyValueRow>
            <KeyValueRow label="Email">{candidate.email}</KeyValueRow>
            <KeyValueRow label="No. HP">{candidate.phone}</KeyValueRow>
            <KeyValueRow label="Posisi">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
            <KeyValueRow label="Kewarganegaraan">{NATIONALITY_LABEL[candidate.nationality]}</KeyValueRow>
            <KeyValueRow label="Identitas">
              {candidate.nationality === 'CITIZEN'
                ? `KTP •••• ${candidate.idCardLast4}`
                : `Paspor ${candidate.passportNumber} · Visa ${candidate.visaNumber}`}
            </KeyValueRow>
            <KeyValueRow label="Requisition">{candidate.requisitionId}</KeyValueRow>
            <KeyValueRow label="Rencana masuk">{formatDate(candidate.intendedJoinDate)}</KeyValueRow>
            <KeyValueRow label="Maker">{candidate.maker}</KeyValueRow>
            <KeyValueRow label="Status">
              <CandidateStatusBadge status={candidate.status} />
            </KeyValueRow>
          </KeyValueList>

          {canDecide && rivals > 0 && (
            <Note tone="warn" icon={<Users />}>
              <strong>
                {rivals} kandidat saingan
              </strong>{' '}
              di posisi ini akan otomatis ditolak begitu Anda menyetujui.
            </Note>
          )}

          {canDecide && (
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
          )}
        </div>
      )}
    </Modal>
  );
}
