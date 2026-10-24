import { useState } from 'react';
import { Info, Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHead } from '@/components/Card';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { roleGrantService } from '@/features/role-grant/services/role-grant.service';
import { MANDATORY_ROLE, ROLE_LABEL } from '@/features/role-grant/types';
import type { RoleCode } from '@/features/role-grant/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

type Editable = 'ROLE_HR_MANAGER' | 'ROLE_HR_STAFF';
const GRANTORS: RoleCode[] = ['ROLE_SUPER_ADMIN', 'ROLE_HR_MANAGER', 'ROLE_HR_STAFF'];

/**
 * Employee Directory › Role Grant Rules — FSD-001-EMPLOYEE 0.83 §13 (TSD §7.4.13).
 *
 * Isi matriks sama dengan kontrak (pemberi × sebelas peran), tetapi tabelnya ditransposisi: satu baris per
 * peran, satu kolom per pemberi. Sebelas kolom kotak centang sulit dibaca HR; tiga kolom tidak.
 */
export function RoleGrantRulesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canRead = role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_HR_STAFF';
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['role-grant', 'matrix'], queryFn: () => roleGrantService.get(), enabled: canRead });
  // null = belum ada perubahan; tampilan membaca matriks tersimpan.
  const [edits, setEdits] = useState<Record<Editable, RoleCode[]> | null>(null);

  const saved = (grantor: Editable) => data?.rows.find((row) => row.grantorRole === grantor)?.grantableRoles ?? [];
  const draft = edits ?? { ROLE_HR_MANAGER: saved('ROLE_HR_MANAGER'), ROLE_HR_STAFF: saved('ROLE_HR_STAFF') };
  const reset = () => setEdits(null);

  const dirty = (['ROLE_HR_MANAGER', 'ROLE_HR_STAFF'] as Editable[]).some(
    (grantor) => [...draft[grantor]].sort().join() !== [...saved(grantor)].sort().join(),
  );

  const save = useMutation({
    mutationFn: () =>
      roleGrantService.save([
        { grantorRole: 'ROLE_HR_MANAGER', grantableRoles: draft.ROLE_HR_MANAGER },
        { grantorRole: 'ROLE_HR_STAFF', grantableRoles: draft.ROLE_HR_STAFF },
      ]),
    onSuccess: () => {
      toast('The role grant rules were saved.', 'ok');
      setEdits(null);
      void queryClient.invalidateQueries({ queryKey: ['role-grant'] });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });

  const toggle = (grantor: Editable, target: RoleCode) =>
    setEdits({
      ...draft,
      [grantor]: draft[grantor].includes(target) ? draft[grantor].filter((item) => item !== target) : [...draft[grantor], target],
    });

  const canEdit = Boolean(data?.canEdit);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Role Grant Rules' }]}
      title="Role Grant Rules"
      description="Who may give which role when a candidate becomes an employee (New Joiner and ATS Bridge). It does not change the roles of existing employees."
    >
      {!canRead ? (
        <Note tone="warn" icon={<Lock />}>
          This menu is available to HR Staff, HR Manager and Super Admin.
        </Note>
      ) : (
        <div className="flex flex-col gap-4">
          {!canEdit && <Note icon={<Info />}>You can view the rules. Only a Super Admin can change them.</Note>}
          <Card>
            <CardHead title="Roles each grantor may give" sub="Employee is always allowed · Super Admin always gives every role" />
            {isError ? (
              <Note tone="warn" icon={<Info />}>
                The rules could not be loaded.
              </Note>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border-1">
                <table className="w-full border-collapse font-body text-[13px]">
                  <thead>
                    <tr className="bg-cloud text-left">
                      <th className="px-4 py-3 font-bold text-fg-2">Role</th>
                      {GRANTORS.map((grantor) => (
                        <th key={grantor} className="w-[160px] px-4 py-3 text-center font-bold text-fg-2">
                          {ROLE_LABEL[grantor]}
                          {grantor === 'ROLE_SUPER_ADMIN' && (
                            <span className="block text-[11.5px] font-medium text-fg-3">Always every role</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.roles ?? []).map((target) => (
                      <tr key={target} className="border-t border-border-1">
                        <td className="px-4 py-2.5 font-semibold text-fg-1">{ROLE_LABEL[target]}</td>
                        {GRANTORS.map((grantor) => {
                          const locked = grantor === 'ROLE_SUPER_ADMIN' || target === MANDATORY_ROLE;
                          const checked = grantor === 'ROLE_SUPER_ADMIN' || draft[grantor as Editable].includes(target);
                          return (
                            <td key={grantor} className="px-4 py-2.5 text-center">
                              <Checkbox
                                aria-label={`${ROLE_LABEL[grantor]} may give ${ROLE_LABEL[target]}`}
                                checked={checked || target === MANDATORY_ROLE}
                                disabled={locked || !canEdit}
                                onCheckedChange={() => toggle(grantor as Editable, target)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {isLoading && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-fg-3">
                          Loading…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {canEdit && (
              <div className="flex flex-wrap justify-end gap-2 border-t border-border-1 pt-4">
                <Button variant="secondary" disabled={!dirty || save.isPending} onClick={reset}>
                  Discard Changes
                </Button>
                <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? 'Saving…' : 'Save Rules'}
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </PageShell>
  );
}
