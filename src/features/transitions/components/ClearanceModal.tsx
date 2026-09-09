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

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      size="wide"
      title="Clearance gate"
      description="Status terminal ditahan sampai setiap task clearance-blocking bersih — kecuali approver elevated melakukan force-release."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
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
            {force.isPending ? 'Memproses…' : 'Force-release & complete'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <DataTable<TransitionTask>
          rows={blockers}
          rowKey={(row) => row.id}
          empty="Tidak ada task clearance-blocking."
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

        <Note tone="danger" icon={<ShieldAlert />}>
          <strong>Force-release</strong> menembus gerbang untuk semua task yang masih memblokir. Aksi ini elevated
          dan ditulis ke audit log bersama identitas serta alasan Anda.
        </Note>

        <div className="flex flex-col gap-1">
          <Label htmlFor="force-reason">
            Alasan force-release<em>*</em>
          </Label>
          <Textarea
            id="force-reason"
            rows={2}
            maxLength={150}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Kenapa gerbang clearance ditembus?"
          />
        </div>
      </div>
    </Modal>
  );
}
