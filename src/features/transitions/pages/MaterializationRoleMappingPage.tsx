import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { TableToolbar } from '@/components/TableToolbar';
import { RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMaterializeRoles, useSetMaterializeRole } from '@/features/transitions/hooks/useTransitionHub';
import type { MaterializeRole } from '@/features/transitions/setup-types';
import { formatDateTime } from '@/lib/format';

/**
 * Transition › Materialization Role Mapping (TSD-001-EMPLOYEE 0.212 §7.23.10):
 * role yang boleh memegang tugas materialisasi. Daftar role milik auth-service,
 * penandanya milik employee-service; tiap ubah tercatat di jejak audit.
 */
export function MaterializationRoleMappingPage() {
  const [role, setRole] = useState<'HR_MANAGER' | 'HR_STAFF'>('HR_MANAGER');
  const [keyword, setKeyword] = useState('');
  const roles = useMaterializeRoles();
  const toggle = useSetMaterializeRole(role);
  const writer = role === 'HR_MANAGER';

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return (roles.data ?? []).filter((row) => !q || row.accessName.toLowerCase().includes(q) || row.accessCode.toLowerCase().includes(q));
  }, [roles.data, keyword]);

  const table = (selected: boolean) => (
    <DataTable<MaterializeRole>
      rows={filtered.filter((row) => row.isMaterialize === selected)}
      rowKey={(row) => row.accessId}
      loading={roles.isLoading}
      empty={selected ? 'No role selected — handler pickers stay empty until you add one.' : 'Every role is selected.'}
      columns={[
        { key: 'name', header: 'Role', strong: true, render: (row) => row.accessName },
        { key: 'code', header: 'Code', muted: true, render: (row) => <span className="font-mono text-xs">{row.accessCode}</span> },
        { key: 'updated', header: 'Updated', nowrap: true, muted: true, render: (row) => formatDateTime(row.updatedAt) },
      ]}
      actions={
        writer
          ? (row) => (
              <RowButton disabled={toggle.isPending} onClick={() => toggle.mutate({ accessId: row.accessId, value: !selected })}>
                {selected ? 'Remove' : 'Add'}
              </RowButton>
            )
          : undefined
      }
    />
  );

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Transition' }, { label: 'Materialization Role Mapping' }]}
      title="Materialization Role Mapping"
      description="Only employees whose role is selected here can be picked as handlers or approvers in a Materialization setup. Removing a role takes its people off running lists at the next daily check."
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
        <TableToolbar search={{ value: keyword, onChange: setKeyword, placeholder: 'Search role' }} />
        <Card>
          <CardHead title="Selected" sub="Can handle or approve materialization tasks" />
          {table(true)}
        </Card>
        <Card>
          <CardHead title="Not selected" />
          {table(false)}
        </Card>
      </div>
    </PageShell>
  );
}
