import { useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { BANK_OPTIONS } from '@/features/new-joiner/addEmployee';
import { BRANCHES } from '@/features/employees/types';
import type { EmployeeDetail, WorkDataPatch } from '@/features/employees/types';
import {
  COST_CENTER_OPTIONS,
  SBU_OPTIONS,
  changeEmployeeRole,
  employeeRole,
  updateWorkData,
} from '@/features/employees/services/employee.service';
import { workStatusService } from '@/features/work-status/services/work-status.service';
import { roleGrantService } from '@/features/role-grant/services/role-grant.service';
import { ROLE_LABEL } from '@/features/role-grant/types';
import type { RoleCode } from '@/features/role-grant/types';
import { toast } from '@/store/ui.store';

type WorkDataValues = Required<WorkDataPatch>;

const workDataSchema = Yup.object({
  accountNumber: Yup.string()
    .max(50, 'At most 50 characters.')
    .test('bank', 'Choose the bank first.', function (value) {
      return !value || Boolean((this.parent as WorkDataValues).bankCode);
    }),
  accountHolderName: Yup.string()
    .max(100, 'At most 100 characters.')
    .test('bank', 'Choose the bank first.', function (value) {
      return !value || Boolean((this.parent as WorkDataValues).bankCode);
    }),
});

/**
 * EMP-WORKDATA (FSD-001-EMPLOYEE 0.83 §1, TSD §7.2.5). Hanya medan yang diubah yang dikirim; nomor rekening
 * selalu kosong — nilai lama hanya tampil sebagai empat digit akhir.
 */
export function EditWorkDataModal({ employee, open, onClose }: { employee: EmployeeDetail; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: workStatuses = [] } = useQuery({
    queryKey: ['work-status', { isActive: true }],
    queryFn: () => workStatusService.search({ isActive: true }),
    enabled: open,
  });
  const save = useMutation({
    mutationFn: (patch: WorkDataPatch) => updateWorkData(employee.id, patch),
    onSuccess: () => {
      toast('The work data was saved.', 'ok');
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
  const initial: WorkDataValues = {
    workStatusId: employee.workStatusId ?? '',
    branchId: employee.branchId,
    costCenter: employee.costCenter,
    sbu: employee.sbu,
    bankCode: '',
    accountNumber: '',
    accountHolderName: '',
  };

  return (
    <Formik<WorkDataValues>
      initialValues={initial}
      enableReinitialize
      validationSchema={workDataSchema}
      onSubmit={(values) => {
        const patch: WorkDataPatch = {};
        (Object.keys(values) as (keyof WorkDataValues)[]).forEach((key) => {
          if (values[key] && values[key] !== initial[key]) patch[key] = values[key];
        });
        if (Object.keys(patch).length === 0) {
          toast('No changes to save.', 'info');
          return;
        }
        save.mutate(patch);
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={open}
          onOpenChange={(next) => !next && onClose()}
          size="wide"
          title="Edit Work Data"
          description={`${employee.name} · only the fields you change are saved.`}
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
              <SelectField
                name="workStatusId"
                label="Employment Type"
                placeholder="Select an employment type"
                options={workStatuses.map((row) => ({ value: row.id, label: row.name }))}
              />
              {employee.seatBranched ? (
                <FormField name="branch" label="Branch" hint="The branch follows the position; use Transfer to change it.">
                  <Input id="branch" value={employee.branchName} readOnly disabled />
                </FormField>
              ) : (
                <SelectField name="branchId" label="Branch" options={BRANCHES.map((row) => ({ value: row.id, label: row.name }))} />
              )}
              <SelectField name="costCenter" label="Cost Center" options={COST_CENTER_OPTIONS} />
              <SelectField name="sbu" label="SBU" options={SBU_OPTIONS} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField name="bankCode" label="Bank" placeholder="Keep the current bank" options={BANK_OPTIONS} />
              <TextField
                name="accountNumber"
                label="Account Number"
                inputMode="numeric"
                maxLength={50}
                autoComplete="off"
                hint={`Current: •••• ${employee.bank.accountNumber.slice(-4)}`}
              />
              <TextField name="accountHolderName" label="Account Holder Name" maxLength={100} />
            </div>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** CR-DIALOG (FSD-001-EMPLOYEE 0.83 §15) — peran baru dibatasi Role Grant Rules; tidak tertutup lewat klik di luar. */
export function ChangeRoleModal({ employee, open, onClose }: { employee: EmployeeDetail; open: boolean; onClose: () => void }) {
  const [next, setNext] = useState<RoleCode | ''>('');
  const current = useQuery({ queryKey: ['employees', 'role', employee.id], queryFn: () => employeeRole(employee.id), enabled: open });
  const { data: grantable = [] } = useQuery({ queryKey: ['role-grant', 'grantable'], queryFn: () => roleGrantService.grantable(), enabled: open });
  const queryClient = useQueryClient();
  const change = useMutation({
    mutationFn: (roleCode: RoleCode) => changeEmployeeRole(employee.id, roleCode),
    onSuccess: (changed) => {
      toast(changed ? 'The role was changed. The employee must sign in again.' : 'The employee already has this role.', 'ok');
      void queryClient.invalidateQueries({ queryKey: ['employees', 'role', employee.id] });
      close();
    },
    onError: (error: Error) => toast(error.message || 'The role could not be changed.', 'danger'),
  });
  const close = () => {
    setNext('');
    onClose();
  };
  const same = next !== '' && next === current.data;

  return (
    <Modal
      open={open}
      onOpenChange={() => undefined}
      dismissible={false}
      title="Change Role"
      description={employee.name}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={change.isPending}>
            Cancel
          </Button>
          <Button disabled={!next || same || !current.data || change.isPending} onClick={() => next && change.mutate(next)}>
            {change.isPending ? 'Changing…' : 'Change Role'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 font-body text-[13px] leading-[1.5] text-fg-2">
          Change the role of this employee. The employee must sign in again to use the new role. You can only change roles within the roles you are allowed to give.
        </p>
        <div className="flex flex-col gap-1">
          <Label>Current role</Label>
          <span className="font-body text-[13px] font-semibold text-fg-1">
            {current.isLoading ? 'Loading the current role…' : current.isError ? 'The current role could not be loaded.' : ROLE_LABEL[current.data!]}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="new-role">
            New role<em>*</em>
          </Label>
          <Select value={next} onValueChange={(value) => setNext(value as RoleCode)}>
            <SelectTrigger id="new-role" aria-label="New role">
              <SelectValue placeholder="Select the new role" />
            </SelectTrigger>
            <SelectContent>
              {grantable.map((code) => (
                <SelectItem key={code} value={code}>
                  {ROLE_LABEL[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {same && <span className="font-body text-xs font-medium text-error-700">Select a role different from the current role.</span>}
        </div>
      </div>
    </Modal>
  );
}
