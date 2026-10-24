import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Info, Lock } from 'lucide-react';
import { Card, CardHead } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { PanelActionButton, RowActions } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { ToggleField } from '@/components/form/ToggleField';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { useSaveWorkStatus, useWorkStatuses } from '@/features/work-status/hooks/useWorkStatus';
import { TAX_CATEGORY_LABEL, canManageWorkStatus } from '@/features/work-status/types';
import type { TaxCategory, WorkStatus, WorkStatusInput } from '@/features/work-status/types';
import { useAuthStore } from '@/store/auth.store';

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const EMPTY: WorkStatusInput = {
  name: '',
  taxCategory: 'PEGAWAI_TETAP',
  requiresEndDate: false,
  deductBpjsTk: true,
  deductBpjsKs: true,
  eligibleForLeave: true,
  eligibleForOvertime: true,
  isActive: true,
};

const schema = Yup.object({
  name: Yup.string()
    .trim()
    .required('Enter the name.')
    .max(50, 'At most 50 characters.')
    .matches(/^[A-Za-z][A-Za-z0-9 ()-]*$/, 'Start with a letter; letters, digits, spaces, ( ) and - only.'),
  taxCategory: Yup.string().required('Choose the tax category.'),
});

const toInput = ({ id: _id, activeEmployeeCount: _count, ...input }: WorkStatus): WorkStatusInput => input;

/** "Employment · Health" dst. — dua flag sejenis dirangkum jadi satu sel supaya tabel tetap ringkas. */
function joinFlags(pairs: [boolean, string][]): string {
  const on = pairs.filter(([flag]) => flag).map(([, label]) => label);
  return on.length ? on.join(' · ') : 'None';
}

/** WS-FORM — Add / Edit Work Status. */
function WorkStatusForm({ editing, onClose }: { editing: WorkStatus | 'new' | null; onClose: () => void }) {
  const save = useSaveWorkStatus();
  const row = editing && editing !== 'new' ? editing : null;
  return (
    <Formik<WorkStatusInput>
      initialValues={row ? toInput(row) : EMPTY}
      enableReinitialize
      validationSchema={schema}
      onSubmit={(input) => save.mutate({ id: row?.id, input }, { onSuccess: onClose })}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(editing)}
          onOpenChange={(next) => !next && onClose()}
          size="wide"
          title={row ? 'Edit Work Status' : 'Add Work Status'}
          description="Payroll and Time read these settings on their next calculation."
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
            <div className="grid gap-4 md:grid-cols-2">
              <TextField name="name" label="Name" required maxLength={50} placeholder="e.g. Contract" />
              <SelectField
                name="taxCategory"
                label="Tax Category"
                required
                options={(Object.keys(TAX_CATEGORY_LABEL) as TaxCategory[]).map((value) => ({
                  value,
                  label: TAX_CATEGORY_LABEL[value],
                }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField
                name="requiresEndDate"
                label="Requires an end date"
                hint="Turn on for fixed-term types such as Contract or Probation."
              />
              <ToggleField name="deductBpjsTk" label="Deduct BPJS Employment" />
              <ToggleField name="deductBpjsKs" label="Deduct BPJS Health" />
              <ToggleField name="eligibleForLeave" label="Eligible for leave" />
              <ToggleField name="eligibleForOvertime" label="Eligible for overtime" />
              {row && (
                <ToggleField
                  name="isActive"
                  label="Active"
                  hint="An inactive type is no longer offered as an employment type."
                />
              )}
            </div>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/**
 * Employee Directory › Work Status — FSD-001-EMPLOYEE 0.83 §11. Master jenis status kerja; tidak pernah
 * dihapus. HR Staff membaca; HR Manager · Super Admin mengelola.
 */
export function WorkStatusPage() {
  const role = useAuthStore((s) => s.user?.role);
  const manager = canManageWorkStatus(role);
  const canRead = manager || role === 'ROLE_HR_STAFF';

  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const filter = useMemo(
    () => ({ keyword, isActive: status === 'ALL' ? undefined : status === 'ACTIVE' }),
    [keyword, status],
  );
  const { data: rows = [], isLoading, isError } = useWorkStatuses(filter);
  const save = useSaveWorkStatus();
  const [editing, setEditing] = useState<WorkStatus | 'new' | null>(null);
  const [toggling, setToggling] = useState<WorkStatus | null>(null);
  const filtered = keyword || status !== 'ALL';

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Work Status' }]}
        title="Work Status"
        description="The employment types your company uses, with the tax and benefit settings Payroll and Time read. Types are never deleted: deactivate the ones you no longer use."
      >
        {!canRead ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Staff, HR Manager and Super Admin.
          </Note>
        ) : (
          <div className="flex flex-col gap-4">
            {!manager && (
              <Note icon={<Info />}>You can view work statuses. HR Manager and Super Admin add and change them.</Note>
            )}
            <Card>
              <CardHead
                title="Work statuses"
                sub={`${rows.length} types`}
                action={manager ? <PanelActionButton onClick={() => setEditing('new')}>Add Work Status</PanelActionButton> : undefined}
              />
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
                  search={{ value: keyword, onChange: (value) => setKeyword(value.slice(0, 50)), placeholder: 'Search by name' }}
                />
                <DataTable<WorkStatus>
                  rows={rows}
                  rowKey={(row) => row.id}
                  loading={isLoading}
                  empty={
                    isError
                      ? 'The work status list could not be loaded.'
                      : filtered
                        ? 'No work statuses match the current filter.'
                        : 'No work statuses yet.'
                  }
                  columns={[
                    { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
                    { key: 'tax', header: 'Tax Category', muted: true, render: (row) => TAX_CATEGORY_LABEL[row.taxCategory] },
                    { key: 'end', header: 'End Date Required', align: 'center', render: (row) => (row.requiresEndDate ? 'Yes' : 'No') },
                    {
                      key: 'bpjs',
                      header: 'BPJS Deduction',
                      render: (row) => joinFlags([[row.deductBpjsTk, 'Employment'], [row.deductBpjsKs, 'Health']]),
                    },
                    {
                      key: 'leave',
                      header: 'Leave and Overtime',
                      render: (row) => joinFlags([[row.eligibleForLeave, 'Leave'], [row.eligibleForOvertime, 'Overtime']]),
                    },
                    { key: 'count', header: 'Employees', align: 'center', render: (row) => row.activeEmployeeCount },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => (
                        <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>{row.isActive ? 'Active' : 'Inactive'}</StatusBadge>
                      ),
                    },
                  ]}
                  actions={
                    manager
                      ? (row) => (
                          <RowActions
                            actions={[
                              { label: 'Edit', onSelect: () => setEditing(row) },
                              { label: row.isActive ? 'Deactivate' : 'Activate', danger: row.isActive, onSelect: () => setToggling(row) },
                            ]}
                          />
                        )
                      : undefined
                  }
                />
              </div>
            </Card>
          </div>
        )}
      </PageShell>

      <WorkStatusForm editing={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(toggling)}
        title={toggling?.isActive ? 'Deactivate this work status?' : 'Activate this work status?'}
        description={
          toggling?.isActive
            ? `${toggling.name} will no longer be offered as an employment type. A type that employees still hold cannot be deactivated.`
            : `${toggling?.name ?? ''} will be offered again as an employment type.`
        }
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        tone={toggling?.isActive ? 'danger' : 'primary'}
        loading={save.isPending}
        onOpenChange={(open) => !open && setToggling(null)}
        onConfirm={() =>
          toggling &&
          save.mutate(
            { id: toggling.id, input: { ...toInput(toggling), isActive: !toggling.isActive } },
            { onSettled: () => setToggling(null) },
          )
        }
      />
    </>
  );
}
