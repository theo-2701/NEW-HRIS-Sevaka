import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { useUpdateWorkData } from '@/features/employees/hooks/useEmployees';
import { useWorkStatuses } from '@/features/employee-masters/hooks/useMasters';
import { maskAccountHolder, maskAccountNumber } from '@/features/employees/masking';
import { BANKS, BRANCHES, COST_CENTERS, SBUS } from '@/features/employees/types';
import type { EmployeeDetail, WorkDataPatch } from '@/features/employees/types';

interface Values {
  workStatusId: string;
  branchId: string;
  costCenter: string;
  sbu: string;
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
}

const schema = Yup.object({
  accountNumber: Yup.string()
    .trim()
    .matches(/^\d{6,20}$/, { message: 'Account number must be 6–20 digits.', excludeEmptyString: true }),
  accountHolderName: Yup.string().trim().max(150, 'At most 150 characters.'),
  bankCode: Yup.string().when(['accountNumber', 'accountHolderName'], {
    is: (number?: string, holder?: string) => Boolean(number?.trim() || holder?.trim()),
    then: (rule) => rule.required('Pick a bank for the account number.'),
  }),
});

/** Hanya medan yang berubah; rekening/nama yang diketik selalu membawa `bankCode`. */
function diff(values: Values, row: EmployeeDetail): WorkDataPatch {
  const patch: WorkDataPatch = {};
  if (values.workStatusId && values.workStatusId !== (row.workStatusId ?? '')) patch.workStatusId = values.workStatusId;
  if (values.branchId !== row.branchId) patch.branchId = values.branchId;
  if (values.costCenter !== row.costCenter) patch.costCenter = values.costCenter;
  if (values.sbu !== row.sbu) patch.sbu = values.sbu;
  const number = values.accountNumber.trim();
  const holder = values.accountHolderName.trim();
  if (number) patch.accountNumber = number;
  if (holder) patch.accountHolderName = holder;
  if (values.bankCode !== row.bank.bankCode || number || holder) patch.bankCode = values.bankCode;
  return patch;
}

/**
 * Edit Work Data (CATATAN 20 Okt 2026, T31) — HR (`SUPER_ADMIN`/`HR_MANAGER`/`HR_STAFF`).
 * Kotak rekening & nama pemilik selalu kosong; nilai lama hanya tampil tersamar sebagai petunjuk.
 */
export function EditWorkDataModal({
  employee,
  role,
  onClose,
}: {
  employee: EmployeeDetail | null;
  role: string;
  onClose: () => void;
}) {
  const update = useUpdateWorkData();
  const { data: statuses = [] } = useWorkStatuses({ active: 'ACTIVE' });
  if (!employee) return null;

  const initial: Values = {
    workStatusId: employee.workStatusId ?? '',
    branchId: employee.branchId,
    costCenter: employee.costCenter,
    sbu: employee.sbu,
    bankCode: employee.bank.bankCode,
    accountNumber: '',
    accountHolderName: '',
  };

  return (
    <Formik<Values>
      initialValues={initial}
      validationSchema={schema}
      onSubmit={(values) => {
        const patch = diff(values, employee);
        if (!Object.keys(patch).length) return onClose();
        update.mutate({ id: employee.id, patch, role }, { onSuccess: onClose });
      }}
    >
      {({ submitForm }) => (
        <Modal
          open
          onOpenChange={(next) => !next && onClose()}
          size="wide"
          title="Edit work data"
          description={`${employee.name} · only the fields you change are sent.`}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                name="workStatusId"
                label="Employment Type"
                placeholder="Select employment type"
                options={statuses.map((row) => ({ value: row.id, label: row.workStatusName }))}
              />
              <SelectField
                name="branchId"
                label="Branch"
                options={BRANCHES.map((row) => ({ value: row.id, label: row.name }))}
              />
              <SelectField
                name="costCenter"
                label="Cost Center"
                options={COST_CENTERS.map((value) => ({ value, label: value }))}
              />
              <SelectField name="sbu" label="SBU" options={SBUS.map((value) => ({ value, label: value }))} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                name="bankCode"
                label="Bank"
                placeholder="Select bank"
                options={BANKS.map((row) => ({ value: row.code, label: `${row.code} — ${row.name}` }))}
              />
              <TextField
                name="accountNumber"
                label="Account Number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Leave empty to keep"
                hint={`Current: ${maskAccountNumber(employee.bank.accountNumber, false)}`}
              />
              <TextField
                name="accountHolderName"
                label="Account Holder Name"
                autoComplete="off"
                placeholder="Leave empty to keep"
                hint={`Current: ${maskAccountHolder(employee.bank.accountHolderName, false)}`}
              />
            </div>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}
