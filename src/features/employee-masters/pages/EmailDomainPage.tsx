import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { AddButton, RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { ActiveBadge, ActiveFilterSelect, RolePicker } from '@/features/employee-masters/components/MasterBits';
import { EmailDomainFormModal } from '@/features/employee-masters/components/MasterModals';
import { useEmailDomains } from '@/features/employee-masters/hooks/useMasters';
import { canManageMaster } from '@/features/employee-masters/types';
import type { ActiveFilter, EmailDomain, MasterRole } from '@/features/employee-masters/types';

/**
 * Employee Directory › Email Domain (TSD-001-EMPLOYEE 0.212 §7.19, FSD-EMPLOYEE §12).
 * Satu tenant boleh banyak domain; nonaktif ≠ hapus; tanpa penjaga "dipakai".
 */
export function EmailDomainPage() {
  const [role, setRole] = useState<MasterRole>('HR_MANAGER');
  const [keyword, setKeyword] = useState('');
  const [active, setActive] = useState<ActiveFilter>('ALL');
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<EmailDomain | null>(null);

  const query = useEmailDomains({ keyword, active });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const paged = usePagedRows(rows);
  const writer = canManageMaster(role);

  const open = (row: EmailDomain | null) => {
    setEditing(row);
    setForm(true);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Email Domain' }]}
      title="Email Domain"
      description="Domains used to build company email addresses. A company may own several; an inactive domain stays listed but can no longer be picked."
    >
      <div className="flex flex-col gap-5">
        <RolePicker value={role} onChange={setRole} />
        <Card>
          <CardHead title="Domains" sub="Sorted by name, inactive domains included" />
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
                placeholder: 'Search domain',
              }}
              actions={writer ? <AddButton onClick={() => open(null)}>Add Domain</AddButton> : undefined}
            />
            <DataTable<EmailDomain>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={query.isLoading}
              empty={keyword || active !== 'ALL' ? 'No domain matches these criteria.' : 'No email domain yet.'}
              columns={[
                { key: 'name', header: 'Domain Name', strong: true, render: (row) => row.domainName },
                { key: 'status', header: 'Status', render: (row) => <ActiveBadge active={row.isActive} /> },
              ]}
              actions={writer ? (row) => <RowButton onClick={() => open(row)}>Edit</RowButton> : undefined}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="domains"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>
      <EmailDomainFormModal open={form} role={role} editing={editing} onClose={() => setForm(false)} />
    </PageShell>
  );
}
