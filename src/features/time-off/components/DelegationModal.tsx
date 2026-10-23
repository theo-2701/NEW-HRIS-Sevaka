import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { useDelegations, useLeaveRequests, useSaveDelegation } from '@/features/time-off/hooks/useTimeOff';
import { EMPLOYEES, employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
import { LIVE_STATUS } from '@/features/time-off/types';
import type { Delegation, Session } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';

/**
 * Delegasi persetujuan (§3.2). Cuti yang didelegasikan datang dari konteks dan
 * tidak bisa diubah; penggantinya masih boleh diganti selagi delegasi menunggu.
 */
export function DelegationModal({
  open,
  session,
  editing,
  onClose,
}: {
  open: boolean;
  session: Session;
  editing: Delegation | null;
  onClose: () => void;
}) {
  const { data: requests = [] } = useLeaveRequests(session);
  const { data: delegations = [] } = useDelegations();
  const save = useSaveDelegation(session);

  const [leaveRequestId, setLeaveRequestId] = useState('');
  const [substituteId, setSubstituteId] = useState('');

  useEffect(() => {
    if (!open) return;
    setLeaveRequestId(editing?.leaveRequestId ?? '');
    setSubstituteId(editing?.substituteId ?? '');
  }, [open, editing]);

  /** Cuti hidup milik sendiri yang belum punya delegasi hidup — cegah 409. */
  const delegatable = requests.filter((row) => {
    if (row.employeeId !== session.employeeId) return false;
    if (!LIVE_STATUS.includes(row.status)) return false;
    return !delegations.some(
      (deleg) =>
        deleg.leaveRequestId === row.id &&
        (deleg.status === 'PENDING_APPROVAL' || deleg.status === 'APPROVED'),
    );
  });

  const substitutes = EMPLOYEES.filter((row) => row.id !== session.employeeId);
  const editingLeave = editing ? requests.find((row) => row.id === editing.leaveRequestId) : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title={editing ? 'Change substitute' : 'Register substitute'}
      description="The delegated leave comes from context and cannot be changed; the substitute can still be changed while the delegation awaits approval."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending || !substituteId || (!editing && !leaveRequestId)}
            onClick={() =>
              save.mutate(
                { id: editing?.id, leaveRequestId: editing?.leaveRequestId ?? leaveRequestId, substituteId },
                { onSuccess: onClose },
              )
            }
          >
            {save.isPending ? 'Menyimpan…' : 'Save delegation'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {editing ? (
          <KeyValueList>
            <KeyValueRow label="Delegation">{editing.id}</KeyValueRow>
            <KeyValueRow label="Leave">
              {editingLeave
                ? `${editingLeave.id} · ${formatDate(editingLeave.startDate)} – ${formatDate(editingLeave.endDate)}`
                : editing.leaveRequestId}
            </KeyValueRow>
            <KeyValueRow label="Pendelegasi">{employeeName(editing.delegatorId)}</KeyValueRow>
          </KeyValueList>
        ) : (
          <div className="flex flex-col gap-1">
            <Label htmlFor="deleg-leave">
              Delegated leave<em>*</em>
            </Label>
            <Select value={leaveRequestId} onValueChange={setLeaveRequestId}>
              <SelectTrigger id="deleg-leave">
                <SelectValue placeholder="Select one of your live leaves" />
              </SelectTrigger>
              <SelectContent>
                {delegatable.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {row.id} · {leaveTypeOf(row.leaveTypeId)?.name} · {formatDate(row.startDate)} –{' '}
                    {formatDate(row.endDate)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="font-body text-xs font-normal leading-[1.4] text-fg-3">
              Only your live leaves without a live delegation appear here.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor="deleg-substitute">
            Substitute<em>*</em>
          </Label>
          <Select value={substituteId} onValueChange={setSubstituteId}>
            <SelectTrigger id="deleg-substitute">
              <SelectValue placeholder="Select substitute" />
            </SelectTrigger>
            <SelectContent>
              {substitutes.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name} — {row.role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Note icon={<Info />}>
          The delegation covers all approvals. Without one, all your approval tasks are held during your leave.
        </Note>
      </div>
    </Modal>
  );
}
