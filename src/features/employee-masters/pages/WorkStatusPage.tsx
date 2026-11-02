import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AddButton, RowActions } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { ActiveBadge, ActiveFilterSelect, RolePicker } from '@/features/employee-masters/components/MasterBits';
import { WorkStatusFormModal } from '@/features/employee-masters/components/MasterModals';
import { useSaveWorkStatus, useWorkStatuses } from '@/features/employee-masters/hooks/useMasters';
import { TAX_CATEGORY_LABEL, canManageMaster } from '@/features/employee-masters/types';
import type { ActiveFilter, MasterRole, WorkStatus } from '@/features/employee-masters/types';

const yesNo = (value: boolean) => (value ? 'Yes' : 'No');

/**
 * Employee Directory › Work Status (TSD-001-EMPLOYEE 0.212 §7.13.3, FSD-EMPLOYEE §11).
 * Menonaktifkan baris yang masih dipegang pegawai aktif ditolak 409.
 */
export function WorkStatusPage() {
  const [role, setRole] = useState<MasterRole>('HR_MANAGER');
  const [keyword, setKeyword] = useState('');
  const [active, setActive] = useState<ActiveFilter>('ALL');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<WorkStatus | null>(null);
  const [toggling, setToggling] = useState<WorkStatus | null>(null);

  const query = useWorkStatuses({ keyword, active });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const paged = usePagedRows(rows);
  const save = useSaveWorkStatus(role);
  const writer = canManageMaster(role);

  const open = (row: WorkStatus | null) => {
    setEditing(row);
    setForm(true);
  };

  const confirmToggle = () => {
    if (!toggling) return;
    const { id, activeEmployeeCount: _count, ...draft } = toggling;
    save.mutate({ draft: { ...draft, isActive: !toggling.isActive }, id }, { onSettled: () => setToggling(null) });
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Work Status' }]}
      title="Work Status"
      description="Employment types such as Permanent, Contract, Probation, or Intern. Payroll and Time read each row's tax, BPJS, leave, and overtime rules directly."
    >
      <div className="flex flex-col gap-5">
        <RolePicker value={role} onChange={setRole} />
        <Card>
          <CardHead title="Work statuses" sub="Deactivating never deletes a row" />
          <div className="flex flex-col">
            <TableToolbar
              filters={
                <ActiveFilterSelect
                  value={active}
                  onChange={(next) => {
                    setActive(next);
                    paged.resetPage();
                  }}
                />
              }
              search={{
                value: keyword,
                onChange: (next) => {
                  setKeyword(next);
                  paged.resetPage();
                },
                placeholder: 'Search work status',
              }}
              actions={writer ? <AddButton onClick={() => open(null)}>Add Work Status</AddButton> : undefined}
            />
            <DataTable<WorkStatus>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={query.isLoading}
              empty={keyword || active !== 'ALL' ? 'No work status matches these criteria.' : 'No work status yet.'}
              columns={[
                { key: 'name', header: 'Work Status', strong: true, render: (row) => row.workStatusName },
                { key: 'tax', header: 'Tax Category', render: (row) => TAX_CATEGORY_LABEL[row.taxCategoryCode] },
                { key: 'end', header: 'End Date', muted: true, render: (row) => (row.requiresEndDate ? 'Required' : '—') },
                { key: 'leave', header: 'Leave', muted: true, render: (row) => yesNo(row.eligibleForLeave) },
                { key: 'ot', header: 'Overtime', muted: true, render: (row) => yesNo(row.eligibleForOvertime) },
                {
                  key: 'count',
                  header: 'Employees',
                  align: 'right',
                  render: (row) => <span className="tabular-nums">{row.activeEmployeeCount}</span>,
                },
                { key: 'status', header: 'Status', render: (row) => <ActiveBadge active={row.isActive} /> },
              ]}
              actions={
                writer
                  ? (row) => (
                      <RowActions
                        actions={[
                          { label: 'Edit', onSelect: () => open(row) },
                          {
                            label: row.isActive ? 'Deactivate' : 'Activate',
                            danger: row.isActive,
                            onSelect: () => setToggling(row),
                          },
                        ]}
                      />
                    )
                  : undefined
              }
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="work statuses"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>

      <WorkStatusFormModal open={form} role={role} editing={editing} onClose={() => setForm(false)} />
      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.isActive ? 'Deactivate this work status?' : 'Activate this work status?'}
        description={
          toggling?.isActive
            ? `${toggling.workStatusName} can no longer be assigned. It is refused while ${toggling.activeEmployeeCount} active employee(s) still hold it.`
            : toggling
              ? `${toggling.workStatusName} becomes selectable again.`
              : undefined
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        tone={toggling?.isActive ? 'danger' : 'primary'}
        loading={save.isPending}
        onOpenChange={(next) => !next && setToggling(null)}
        onConfirm={confirmToggle}
      />
    </PageShell>
  );
}
