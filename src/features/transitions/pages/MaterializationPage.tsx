import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/transitions/components/TransitionBits';
import { EditSetupModal, SetupHistoryModal } from '@/features/transitions/components/SetupModals';
import { handlerSummary } from '@/features/transitions/setup-format';
import { useMaterializeRoles, useSetups } from '@/features/transitions/hooks/useTransitionHub';
import { SETUP_STATUS_LABEL } from '@/features/transitions/setup-types';
import type { MaterializationSetup, SetupStatus } from '@/features/transitions/setup-types';
import { TYPE_LABEL } from '@/features/transitions/types';
import { formatDateTime } from '@/lib/format';

const TONE: Record<SetupStatus, 'ok' | 'warn' | 'err'> = { COMPLETE: 'ok', UNDERSTAFFED: 'warn', INCOMPLETE: 'err' };
const ACTOR: Record<'HR_MANAGER' | 'HR_STAFF', string> = { HR_MANAGER: 'emp-hendra', HR_STAFF: 'emp-sari' };

/**
 * Transition › Materialization (TSD-001-EMPLOYEE 0.212 §7.23): paket tugas per jenis,
 * subtipe, dan cabang. Baca: HR Staff; tulis: HR Manager / Super Admin.
 */
export function MaterializationPage() {
  const [role, setRole] = useState<'HR_MANAGER' | 'HR_STAFF'>('HR_MANAGER');
  const [editing, setEditing] = useState<MaterializationSetup | null>(null);
  const [history, setHistory] = useState<MaterializationSetup | null>(null);
  const setups = useSetups();
  const roles = useMaterializeRoles();
  const rows = setups.data ?? [];
  const paged = usePagedRows(rows);
  const understaffed = rows.filter((row) => row.status === 'UNDERSTAFFED');
  const noRoles = roles.data && !roles.data.some((row) => row.isMaterialize);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Transition' }, { label: 'Materialization' }]}
      title="Materialization"
      description="The task package each onboarding, offboarding, or transfer runs: what is done, by whom, in what order, and who approves. Rotation is managed in Temporary Assignment."
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
          <Select value={role} onValueChange={(value) => setRole(value as 'HR_MANAGER' | 'HR_STAFF')}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HR_MANAGER">HR Manager — read and write</SelectItem>
              <SelectItem value="HR_STAFF">HR Staff — read only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {noRoles && (
          <Note tone="warn" icon={<TriangleAlert />}>
            No role is marked for materialization yet. Mark roles in Materialization Role Mapping before picking handlers.
          </Note>
        )}
        {understaffed.length > 0 && (
          <Note tone="warn" icon={<TriangleAlert />}>
            {understaffed.length} setup(s) have fewer than two active handlers or approvers on a task. New transitions still
            run with who is left; add people so a single absence does not stop a task.
          </Note>
        )}

        <Card>
          <CardHead title="Setups" sub="One setup per type, subtype, and branch; the company default covers the rest" />
          <div className="flex flex-col">
            <DataTable<MaterializationSetup>
              rows={paged.rows}
              rowKey={(row) => row.setupId}
              loading={setups.isLoading}
              empty="No setup yet."
              columns={[
                { key: 'type', header: 'Type', strong: true, render: (row) => TYPE_LABEL[row.type] },
                { key: 'subtype', header: 'Subtype', muted: true, render: (row) => row.subtype ?? 'All subtypes' },
                { key: 'branch', header: 'Branch', render: (row) => row.branch ?? 'Company default' },
                { key: 'tasks', header: 'Tasks', align: 'right', render: (row) => <span className="tabular-nums">{row.tasks.length}</span> },
                { key: 'handlers', header: 'Handlers', muted: true, render: handlerSummary },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge tone={TONE[row.status]}>{SETUP_STATUS_LABEL[row.status]}</StatusBadge> },
                { key: 'version', header: 'Version', align: 'right', render: (row) => <span className="tabular-nums">{row.version}</span> },
                { key: 'updated', header: 'Updated', nowrap: true, muted: true, render: (row) => `${formatDateTime(row.updatedAt)} · ${row.updatedBy}` },
              ]}
              actions={(row) =>
                role === 'HR_MANAGER' ? (
                  <RowActions
                    actions={[
                      { label: 'Edit', onSelect: () => setEditing(row) },
                      { label: 'History', onSelect: () => setHistory(row) },
                    ]}
                  />
                ) : (
                  <RowButton onClick={() => setHistory(row)}>History</RowButton>
                )
              }
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="setups"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>

      <EditSetupModal setup={editing} role={role} actor={ACTOR[role]} onClose={() => setEditing(null)} />
      <SetupHistoryModal setup={history} onClose={() => setHistory(null)} />
    </PageShell>
  );
}
