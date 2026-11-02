import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { employeeName } from '@/features/time-off/mock-data';
import { ProgressBar, TaskStatusBadge, TransitionStatusBadge } from '@/features/transitions/components/TransitionBits';
import { useConfirmTask } from '@/features/transitions/hooks/useTransitions';
import { useMyTransitions } from '@/features/transitions/hooks/useTransitionHub';
import { TYPE_LABEL, doneCount, progressPct } from '@/features/transitions/types';
import type { Transition, TransitionTask } from '@/features/transitions/types';
import { formatDate } from '@/lib/format';

/** Identitas percobaan ESS — subjek transisi contoh. */
const ESS_VIEWERS = [
  { id: 'emp-eka', name: 'Eka Saputra' },
  { id: 'emp-fajar', name: 'Fajar Nugroho' },
  { id: 'emp-maya-k', name: 'Maya Kusuma' },
];

/**
 * Employee Profile › My Transition (TSD-001-EMPLOYEE 0.212 §7.26): transisi milik
 * karyawan login, berjalan dan riwayat. Karyawan mengonfirmasi tugas dua pihak
 * (mis. fasilitas diterima/dikembalikan).
 */
export function EssMyTransitionPage() {
  const [viewer, setViewer] = useState(ESS_VIEWERS[0].id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ tr: Transition; task: TransitionTask } | null>(null);
  const mine = useMyTransitions(viewer);
  const confirm = useConfirmTask();
  const rows = mine.data ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];

  return (
    <PageShell
      crumbs={[{ label: 'Employee Profile' }, { label: 'My Transition' }]}
      title="My Transition"
      description="Your onboarding, transfer, or offboarding and the tasks around it. Confirm when you have received or returned a facility."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
          <Select value={viewer} onValueChange={(value) => { setViewer(value); setSelectedId(null); }}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESS_VIEWERS.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!mine.isLoading && !rows.length && (
          <Card>
            <EmptyState title="No transition" description="You have no onboarding, transfer, or offboarding on record." />
          </Card>
        )}

        {rows.length > 0 && (
          <Card>
            <CardHead title="My transitions" sub="Running and past" />
            <DataTable<Transition>
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                { key: 'type', header: 'Type', strong: true, render: (row) => TYPE_LABEL[row.type] },
                { key: 'detail', header: 'Detail', muted: true, render: (row) => row.detail },
                { key: 'effective', header: 'Effective', nowrap: true, render: (row) => formatDate(row.effectiveDate) },
                {
                  key: 'progress',
                  header: 'Tasks',
                  render: (row) => (
                    <span className="flex items-center gap-2">
                      <ProgressBar value={progressPct(row)} className="w-20" />
                      <span className="font-body text-xs font-medium text-fg-3">
                        {doneCount(row)}/{row.tasks.length}
                      </span>
                    </span>
                  ),
                },
                { key: 'status', header: 'Status', render: (row) => <TransitionStatusBadge status={row.status} /> },
              ]}
              actions={(row) => <RowButton onClick={() => setSelectedId(row.id)}>View tasks</RowButton>}
            />
          </Card>
        )}

        {selected && (
          <Card>
            <CardHead title={`${TYPE_LABEL[selected.type]} tasks`} sub={`${selected.id} · effective ${formatDate(selected.effectiveDate)}`} />
            <DataTable<TransitionTask>
              rows={selected.tasks}
              rowKey={(row) => row.id}
              empty="No task yet — tasks appear once the request is approved."
              columns={[
                { key: 'name', header: 'Task', strong: true, render: (row) => row.name },
                { key: 'side', header: 'Part', muted: true, render: (row) => (row.side === 'RELINQUISH' ? 'Out' : row.side === 'PROVISION' ? 'In' : '—') },
                { key: 'handler', header: 'Handled By', render: (row) => (row.handlerId ? employeeName(row.handlerId) : '—') },
                { key: 'due', header: 'Due', nowrap: true, muted: true, render: (row) => (row.dueAt ? formatDate(row.dueAt) : '—') },
                { key: 'status', header: 'Status', render: (row) => <TaskStatusBadge status={row.status} /> },
              ]}
              actions={(row) =>
                row.status === 'AWAITING_CONFIRM' ? (
                  <RowButton onClick={() => setConfirming({ tr: selected, task: row })}>Confirm</RowButton>
                ) : (
                  <span className="font-body text-[13px] font-medium text-fg-4" aria-label="No action needed">
                    —
                  </span>
                )
              }
            />
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirming)}
        title="Confirm this task?"
        description={confirming ? `${confirming.task.name} — confirm only if it really happened. This cannot be undone.` : undefined}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        tone="primary"
        loading={confirm.isPending}
        onOpenChange={(next) => !next && setConfirming(null)}
        onConfirm={() =>
          confirming &&
          confirm.mutate({ transitionId: confirming.tr.id, taskId: confirming.task.id }, { onSettled: () => setConfirming(null) })
        }
      />
    </PageShell>
  );
}
