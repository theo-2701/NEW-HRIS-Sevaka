import { useMemo, useState } from 'react';
import { Info, Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHead } from '@/components/Card';
import { PageShell } from '@/components/PageShell';
import { TableToolbar } from '@/components/TableToolbar';
import { cn } from '@/lib/utils';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { materializationService } from '@/features/materialization/services/materialization.service';
import { canReadMaterialization, canWriteMaterialization } from '@/features/materialization/types';
import type { RoleMappingRow } from '@/features/materialization/types';
import { ROLE_LABEL } from '@/features/role-grant/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

function Switch({ on, disabled, label, onChange }: { on: boolean; disabled: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-pill transition-colors duration-200 ease-standard',
        on ? 'bg-secondary-500' : 'bg-border-2',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className={cn('absolute top-0.5 size-5 rounded-full bg-white shadow-card-sm transition-[left] duration-200 ease-standard', on ? 'left-[22px]' : 'left-0.5')} />
    </button>
  );
}

/**
 * Materialization › Materialization Role Mapping — FSD-001-EMPLOYEE 0.83 §21. Hanya karyawan ber-role yang
 * saklarnya menyala yang muncul di pemilih petugas Materialization.
 */
export function RoleMappingPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canRead = canReadMaterialization(role);
  const canWrite = canWriteMaterialization(role);
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState('');
  const { data = [], isLoading, isError } = useQuery({ queryKey: ['materialization', 'roles'], queryFn: () => materializationService.roles(), enabled: canRead });
  const toggle = useMutation({
    mutationFn: (row: RoleMappingRow) => materializationService.setRole(row.roleCode, !row.isMaterialize),
    onSuccess: (_r, row) => {
      toast(row.isMaterialize ? `${ROLE_LABEL[row.roleCode]} is no longer selected.` : `${ROLE_LABEL[row.roleCode]} is now selected.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: ['materialization'] });
    },
    onError: (error: Error) => toast(error.message || 'The role could not be updated.', 'danger'),
  });

  const filtered = useMemo(() => {
    const word = keyword.trim().toLowerCase();
    return data
      .filter((row) => !word || `${ROLE_LABEL[row.roleCode]} ${row.roleCode}`.toLowerCase().includes(word))
      .sort((a, b) => ROLE_LABEL[a.roleCode].localeCompare(ROLE_LABEL[b.roleCode]));
  }, [data, keyword]);
  const selected = filtered.filter((row) => row.isMaterialize);
  const others = filtered.filter((row) => !row.isMaterialize);

  const group = (title: string, rows: RoleMappingRow[], empty: string) => (
    <Card>
      <CardHead title={`${title} (${rows.length})`} />
      {rows.length === 0 ? (
        <p className="m-0 font-body text-[13px] text-fg-3">{keyword ? 'No role matches the search.' : empty}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border-1 p-0">
          {rows.map((row) => (
            <li key={row.roleCode} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex flex-col">
                <span className="font-body text-[13px] font-semibold text-fg-1">{ROLE_LABEL[row.roleCode]}</span>
                <span className="font-mono text-[11.5px] text-fg-3">{row.roleCode}</span>
              </span>
              <Switch on={row.isMaterialize} disabled={!canWrite || toggle.isPending} label={ROLE_LABEL[row.roleCode]} onChange={() => toggle.mutate(row)} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Materialization', to: '/employees/materialization' }, { label: 'Materialization Role Mapping' }]}
      title="Materialization Role Mapping"
      description="Only employees whose role is selected here can be picked as handlers or approvers in Materialization setups."
    >
      {!canRead ? (
        <Note tone="warn" icon={<Lock />}>
          This menu is available to HR Manager, Super Admin, HR Staff and System Admin.
        </Note>
      ) : (
        <div className="flex flex-col gap-4">
          {!canWrite && <Note icon={<Info />}>You can view this list. Only the HR Manager or Super Admin can change it.</Note>}
          {isError && (
            <Note tone="warn" icon={<Info />}>
              The roles could not be loaded.
            </Note>
          )}
          <TableToolbar search={{ value: keyword, onChange: (value) => setKeyword(value.slice(0, 50)), placeholder: 'Search role name or code' }} />
          {isLoading ? (
            <p className="py-6 text-center font-body text-[13px] text-fg-3">Loading…</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {group('Selected', selected, 'No role is selected yet. Turn on a role to make its employees selectable.')}
              {group('Not selected', others, 'Every role is selected.')}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
