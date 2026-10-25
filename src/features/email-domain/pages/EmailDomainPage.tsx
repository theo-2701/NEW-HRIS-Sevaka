import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Info, Lock } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { TextField } from '@/components/form/TextField';
import { ToggleField } from '@/components/form/ToggleField';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { emailDomainService } from '@/features/email-domain/services/email-domain.service';
import { DOMAIN_NAME, canManageEmailDomain } from '@/features/email-domain/types';
import type { EmailDomain } from '@/features/email-domain/types';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const schema = Yup.object({
  domainName: Yup.string()
    .trim()
    .required('Enter the domain name.')
    .max(100, 'At most 100 characters.')
    .matches(DOMAIN_NAME, 'Letters, digits, hyphens and dots, for example company.co.id.'),
});

function useSaveEmailDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, domainName, isActive }: { id?: string; domainName: string; isActive: boolean }) =>
      id ? emailDomainService.update(id, { domainName, isActive }) : emailDomainService.create(domainName),
    onSuccess: (_row, { id }) => {
      toast(id ? 'The email domain was saved.' : 'The email domain was added.', 'ok');
      void queryClient.invalidateQueries({ queryKey: ['email-domain'] });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

/** ED-FORM — Add / Edit Email Domain. */
function EmailDomainForm({ editing, onClose }: { editing: EmailDomain | 'new' | null; onClose: () => void }) {
  const save = useSaveEmailDomain();
  const row = editing && editing !== 'new' ? editing : null;
  return (
    <Formik
      initialValues={{ domainName: row?.domainName ?? '', isActive: row?.isActive ?? true }}
      enableReinitialize
      validationSchema={schema}
      onSubmit={(values) => save.mutate({ id: row?.id, ...values }, { onSuccess: onClose })}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(editing)}
          onOpenChange={(next) => !next && onClose()}
          title={row ? 'Edit Email Domain' : 'Add Email Domain'}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <TextField
              name="domainName"
              label="Domain Name"
              required
              maxLength={100}
              placeholder="company.co.id"
              hint="Letters, digits, hyphens and dots, for example company.co.id. It is saved in lower case and must be unique."
            />
            {row && (
              <ToggleField name="isActive" label="Active" hint="A deactivated domain can no longer be chosen for new batches." />
            )}
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/**
 * Employee Directory › Email Domain — FSD-001-EMPLOYEE 0.83 §12. Domain email kantor per tenant; dipilih
 * checker Bulk Import saat Approve lalu mengusulkan `username@domain` di Create Employee.
 */
export function EmailDomainPage() {
  const role = useAuthStore((s) => s.user?.role);
  const manager = canManageEmailDomain(role);
  const canRead = manager || role === 'ROLE_HR_STAFF';

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const filter = useMemo(
    () => ({ keyword, isActive: status === 'ALL' ? undefined : status === 'ACTIVE' }),
    [keyword, status],
  );
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['email-domain', filter],
    queryFn: () => emailDomainService.search(filter),
  });
  const [editing, setEditing] = useState<EmailDomain | 'new' | null>(null);
  const filtered = keyword || status !== 'ALL';

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Email Domain' }]}
        title="Email Domain"
        description="Your company's email domains. When a Bulk Import batch is approved with a domain, each new employee's company email is suggested as username@domain."
        actions={manager && <Button onClick={() => setEditing('new')}>Add Email Domain</Button>}
      >
        {!canRead ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Staff, HR Manager and Super Admin.
          </Note>
        ) : (
          <div className="flex flex-col gap-4">
            {!manager && (
              <Note icon={<Info />}>You can view email domains. HR Manager and Super Admin add and change them.</Note>
            )}
            <Card>
              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
                      <SelectTrigger className="h-10 w-[160px]" aria-label="Status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Statuses</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  }
                  search={{ value: keyword, onChange: (value) => setKeyword(value.slice(0, 100)), placeholder: 'Search by domain name' }}
                />
                <DataTable<EmailDomain>
                  rows={rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty={
                    isError
                      ? 'The email domain list could not be loaded.'
                      : filtered
                        ? 'No email domains match the current filter.'
                        : 'No email domains yet.'
                  }
                  columns={[
                    { key: 'domain', header: 'Domain Name', strong: true, render: (row) => row.domainName },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge>
                      ),
                    },
                  ]}
                  actions={manager ? (row) => <RowButton onClick={() => setEditing(row)}>Edit</RowButton> : undefined}
                />
              </div>
            </Card>
          </div>
        )}
      </PageShell>
      <EmailDomainForm editing={editing} onClose={() => setEditing(null)} />
    </>
  );
}
