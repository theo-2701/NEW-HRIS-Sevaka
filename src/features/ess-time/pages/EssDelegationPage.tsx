import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { AddButton, RowActions } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { DelegationModal } from '@/features/time-off/components/DelegationModal';
import { useCancelDelegation } from '@/features/time-off/hooks/useTimeOff';
import { essDelegationSession } from '@/features/ess-time/types';
import { useMyDelegations } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS, essName } from '@/features/ess-time/mock-data';
import { DELEGATION_STATUS_LABEL } from '@/features/time-off/types';
import type { Delegation, DelegationStatus } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';

const TONE: Record<DelegationStatus, 'ok' | 'warn' | 'err' | 'mute'> = {
  PENDING_APPROVAL: 'warn',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

/**
 * ESS › Time Management › Time Off › Delegation — penitipan kewenangan approval (UIC-TIME §3.2).
 *
 * Menu ini = "kewenangan apa saja yang sedang SAYA TITIPKAN kepada orang lain" — filter `employee_id`
 * (pemberi), bukan arah sebaliknya (dikoreksi UIC-TIME 0.14 §3.2.4). Status di sini adalah status **persetujuan penunjukan**, bukan aktif-tidaknya: delegasi
 * dan cuti induknya diputuskan bersamaan, tanpa jalur menyetujui delegasi terpisah. Masa berlaku
 * mengikuti tanggal cuti induknya — resource ini memang tidak punya kolom periode sendiri.
 */
export function EssDelegationPage() {
  const [actor, setActor] = useState(ESS_VIEWERS.find((row) => row.employeeId === 'emp-hendra') ?? ESS_VIEWERS[1]);
  const delegations = useMyDelegations(actor);
  /* Menitipkan kewenangan hanya sah bagi pemegang peran approver (§3.2) — sesi tulis memakai peran asli. */
  const session = essDelegationSession(actor);
  const cancel = useCancelDelegation();
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<Delegation | null>(null);
  const [cancelling, setCancelling] = useState<Delegation | null>(null);

  const rows = delegations.data ?? [];

  return (
    <PageShell
      crumbs={[
        { label: 'Employee Self-Service' },
        { label: 'Time Management' },
        { label: 'Time Off' },
        { label: 'Delegation' },
      ]}
      title="Delegation"
      description="Approval authority handed over while the delegator is on leave."
      actions={<EssActorPicker actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <Card>
          <CardHead
            title="Authority I have delegated"
            sub="Validity follows the parent leave dates; the status here is the approval status of the appointment"
          />
          <TableToolbar
            actions={
              <AddButton disabled={!actor.isApprover} onClick={() => setForm(true)}>
                Delegate authority
              </AddButton>
            }
          />
          <DataTable<Delegation>
            rows={rows}
            rowKey={(row) => row.id}
            loading={delegations.isLoading}
            empty="You haven't delegated any approval authority."
            columns={[
              {
                key: 'counterpart',
                header: 'Substitute',
                strong: true,
                render: (row) => essName(row.substituteId),
              },
              {
                key: 'leave',
                header: 'Parent leave',
                muted: true,
                nowrap: true,
                render: (row) => <span className="font-mono text-xs">{row.leaveRequestId}</span>,
              },
              { key: 'scope', header: 'Cakupan', render: () => 'All approval tasks' },
              {
                key: 'status',
                header: 'Appointment status',
                render: (row) => <StatusBadge tone={TONE[row.status]}>{DELEGATION_STATUS_LABEL[row.status]}</StatusBadge>,
              },
              { key: 'created', header: 'Submitted', muted: true, nowrap: true, render: (row) => formatDate(row.createdAt) },
            ]}
            actions={(row) =>
              row.status === 'PENDING_APPROVAL' ? (
                <RowActions
                  actions={[
                    {
                      label: 'Change substitute',
                      onSelect: () => {
                        setEditing(row);
                        setForm(true);
                      },
                    },
                    { label: 'Cancel', danger: true, onSelect: () => setCancelling(row) },
                  ]}
                />
              ) : null
            }
          />
          {!actor.isApprover && (
            <p className="mt-2 font-body text-xs font-medium text-fg-4">
              You don't hold an approver role, so you never need to delegate authority — this list is empty for this identity.
            </p>
          )}
        </Card>
      </div>

      <DelegationModal
        open={form}
        session={session}
        editing={editing}
        onClose={() => {
          setForm(false);
          setEditing(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Cancel this delegation?"
        description="Cancelling is only valid while the appointment awaits approval; once approved, it is locked."
        confirmLabel="Cancel"
        loading={cancel.isPending}
        onOpenChange={(open) => !open && setCancelling(null)}
        onConfirm={() => cancelling && cancel.mutate({ id: cancelling.id }, { onSuccess: () => setCancelling(null) })}
      />
    </PageShell>
  );
}
