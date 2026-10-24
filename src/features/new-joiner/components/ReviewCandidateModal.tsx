import { useEffect, useState } from 'react';
import { Info, Users } from 'lucide-react';
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
          ? 'Approving holds the seat and automatically rejects other candidates for the same position.'
          : undefined
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
              {approve.isPending ? 'Approving…' : 'Approve & Hold Seat'}
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
            <KeyValueRow label="Candidate">{candidate.name || '—'}</KeyValueRow>
            <KeyValueRow label="Email">{candidate.email}</KeyValueRow>
            <KeyValueRow label="Phone">{candidate.phone || '—'}</KeyValueRow>
            <KeyValueRow label="Position">{labelOf(POSITION_OPTIONS, candidate.positionId)}</KeyValueRow>
            <KeyValueRow label="Nationality">
              {candidate.nationality ? NATIONALITY_LABEL[candidate.nationality] : '—'}
            </KeyValueRow>
            <KeyValueRow label="Identity">
              {candidate.nationality === 'CITIZEN'
                ? `KTP •••• ${candidate.idCardLast4}`
                : candidate.nationality === 'FOREIGNER'
                  ? `Passport ${candidate.passportNumber} · Visa ${candidate.visaNumber}`
                  : '—'}
            </KeyValueRow>
            <KeyValueRow label="Requisition">{candidate.requisitionId}</KeyValueRow>
            <KeyValueRow label="Intended join">
              {candidate.intendedJoinDate ? formatDate(candidate.intendedJoinDate) : 'Not set yet'}
            </KeyValueRow>
            <KeyValueRow label="Maker">{candidate.maker}</KeyValueRow>
            <KeyValueRow label="Status">
              <CandidateStatusBadge status={candidate.status} />
            </KeyValueRow>
          </KeyValueList>

          {candidate.status === 'WAITING_CANDIDATE' && (
            <Note icon={<Info />}>
              Waiting for the candidate to fill in their data. Their name, phone and identity appear here once they
              submit the form from the invitation link.
            </Note>
          )}

          {canDecide && rivals > 0 && (
            <Note tone="warn" icon={<Users />}>
              <strong>{rivals} other candidate(s)</strong> for this position will be rejected automatically when you
              approve.
            </Note>
          )}

          {canDecide && (
          <div className="flex flex-col gap-1">
            <Label htmlFor="checker-note">Checker Note</Label>
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
