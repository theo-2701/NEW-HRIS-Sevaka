import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/input';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Note, TaskStatusBadge } from '@/features/transitions/components/TransitionBits';
import { useForceRelease } from '@/features/transitions/hooks/useTransitions';
import { useAuthStore } from '@/store/auth.store';
import { isTaskClosed } from '@/features/transitions/types';
import type { Transition, TransitionTask } from '@/features/transitions/types';

/**
 * TR-CLEARANCE — status terminal offboarding ditahan sampai semua task
 * clearance-blocking bersih. Force-release bersifat elevated dan tercatat di
 * audit log bersama identitas dan alasannya.
 */
export function ClearanceModal({
  transition,
  open,
  onClose,
}: {
  transition: Transition;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const force = useForceRelease();
  const blockers = transition.tasks.filter((task) => task.clearanceBlocking);
  // FSD 0.24 §5.1: Force-release (Waive ELEVATED) hanya peran checker; peran lain disembunyikan (L1).
  const role = useAuthStore((s) => s.user?.role);
  const checker = role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Clearance gate"
      description="The final status waits until every clearance-blocking task is cleared, unless an HR Manager or Super Admin force-releases it."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {checker && (
          <Button
            variant="danger"
            disabled={reason.trim().length === 0 || force.isPending}
            onClick={() =>
              force.mutate(
                { transitionId: transition.id, employee: transition.employee, reason: reason.trim() },
                { onSuccess: onClose },
              )
            }
          >
            {force.isPending ? 'Releasing…' : 'Force-release & Complete'}
          </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <DataTable<TransitionTask>
          rows={blockers}
          rowKey={(row) => row.id}
          empty="No clearance-blocking task."
          columns={[
            { key: 'task', header: 'Clearance task', strong: true, render: (row) => row.name },
            { key: 'owner', header: 'Owner', muted: true, render: (row) => row.owner || '—' },
            {
              key: 'blocking',
              header: 'Blocking',
              render: (row) =>
                isTaskClosed(row) ? (
                  <StatusBadge tone="ok">Cleared</StatusBadge>
                ) : (
                  <StatusBadge tone="err">Blocking</StatusBadge>
                ),
            },
            { key: 'status', header: 'Status', render: (row) => <TaskStatusBadge status={row.status} /> },
          ]}
        />

        {checker && (
        <>
        <Note tone="danger" icon={<ShieldAlert />}>
          <strong>Force-release</strong> clears every task that still blocks. It is an elevated action and is written
          to the audit log with your name and reason.
        </Note>

        <div className="flex flex-col gap-1">
          <Label htmlFor="force-reason">
            Reason<em>*</em>
          </Label>
          <Textarea
            id="force-reason"
            rows={2}
            maxLength={150}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why is the clearance gate released?"
          />
        </div>
        </>
        )}
      </div>
    </Modal>
  );
}
