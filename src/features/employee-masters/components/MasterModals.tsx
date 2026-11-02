import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/form/TextField';
import { SelectField } from '@/components/form/SelectField';
import { ToggleField } from '@/components/form/ToggleField';
import { CheckboxField } from '@/components/form/CheckboxField';
import { useSaveEmailDomain, useSaveWorkStatus } from '@/features/employee-masters/hooks/useMasters';
import { DOMAIN_PATTERN, TAX_CATEGORY_LABEL, WORK_STATUS_PATTERN } from '@/features/employee-masters/types';
import type {
  EmailDomain,
  EmailDomainDraft,
  MasterRole,
  TaxCategory,
  WorkStatus,
  WorkStatusDraft,
} from '@/features/employee-masters/types';

const domainSchema = Yup.object({
  domainName: Yup.string()
    .trim()
    .required('Domain name is required.')
    .max(100, 'At most 100 characters.')
    .matches(DOMAIN_PATTERN, 'Invalid domain, for example ptdika.co.id'),
});

/** Satu isian Domain Name (huruf kecil) + saklar Aktif hanya saat ubah (§7.19). */
export function EmailDomainFormModal({
  open,
  role,
  editing,
  onClose,
}: {
  open: boolean;
  role: MasterRole;
  editing: EmailDomain | null;
  onClose: () => void;
}) {
  const save = useSaveEmailDomain(role);
  const initial: EmailDomainDraft = { domainName: editing?.domainName ?? '', isActive: editing?.isActive ?? true };

  return (
    <Formik<EmailDomainDraft>
      initialValues={initial}
      enableReinitialize
      validationSchema={domainSchema}
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: values, id: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            title={editing ? 'Edit email domain' : 'Add email domain'}
            description="Used to build company email addresses (username@domain) on materialization and Bulk Import."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
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
                label="Domain name"
                required
                maxLength={100}
                placeholder="ptdika.co.id"
                autoComplete="off"
                hint="Saved in lowercase. At least two parts separated by a dot."
              />
              {editing && (
                <ToggleField
                  name="isActive"
                  label="Active"
                  hint="An inactive domain stays listed but cannot be picked when approving a Bulk Import."
                />
              )}
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}

const statusSchema = Yup.object({
  workStatusName: Yup.string()
    .trim()
    .required('Work status name is required.')
    .max(50, 'At most 50 characters.')
    .matches(WORK_STATUS_PATTERN, 'Start with a letter; letters, digits, spaces, brackets, and hyphens only.'),
  taxCategoryCode: Yup.string().required('Tax category is required.'),
});

const EMPTY_STATUS: WorkStatusDraft = {
  workStatusName: '',
  requiresEndDate: false,
  taxCategoryCode: 'PEGAWAI_TETAP',
  deductBpjsTk: true,
  deductBpjsKs: true,
  eligibleForLeave: true,
  eligibleForOvertime: true,
  isActive: true,
};

/** Form status kerja — enam flag wajib eksplisit (§7.13.3). */
export function WorkStatusFormModal({
  open,
  role,
  editing,
  onClose,
}: {
  open: boolean;
  role: MasterRole;
  editing: WorkStatus | null;
  onClose: () => void;
}) {
  const save = useSaveWorkStatus(role);
  const initial: WorkStatusDraft = editing
    ? {
        workStatusName: editing.workStatusName,
        requiresEndDate: editing.requiresEndDate,
        taxCategoryCode: editing.taxCategoryCode,
        deductBpjsTk: editing.deductBpjsTk,
        deductBpjsKs: editing.deductBpjsKs,
        eligibleForLeave: editing.eligibleForLeave,
        eligibleForOvertime: editing.eligibleForOvertime,
        isActive: editing.isActive,
      }
    : EMPTY_STATUS;

  return (
    <Formik<WorkStatusDraft>
      initialValues={initial}
      enableReinitialize
      validationSchema={statusSchema}
      onSubmit={(values, helpers) =>
        save.mutate(
          { draft: values, id: editing?.id },
          {
            onSuccess: () => {
              helpers.resetForm();
              onClose();
            },
          },
        )
      }
    >
      {({ submitForm, resetForm }) => {
        const close = () => {
          resetForm();
          onClose();
        };
        return (
          <Modal
            open={open}
            onOpenChange={(next) => !next && close()}
            size="wide"
            title={editing ? 'Edit work status' : 'Add work status'}
            description="Payroll (tax, BPJS) and Time (leave, overtime) read these rules directly."
            footer={
              <>
                <Button variant="secondary" onClick={close}>
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
                <TextField name="workStatusName" label="Work status name" required maxLength={50} placeholder="Probation" />
                <SelectField
                  name="taxCategoryCode"
                  label="Tax category"
                  required
                  options={(Object.keys(TAX_CATEGORY_LABEL) as TaxCategory[]).map((value) => ({
                    value,
                    label: TAX_CATEGORY_LABEL[value],
                  }))}
                />
              </div>
              <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
                <legend className="mb-1 font-body text-base font-bold text-fg-1">Rules</legend>
                <CheckboxField name="requiresEndDate">Requires end date (contract or probation end)</CheckboxField>
                <CheckboxField name="deductBpjsTk">Deduct BPJS Ketenagakerjaan</CheckboxField>
                <CheckboxField name="deductBpjsKs">Deduct BPJS Kesehatan</CheckboxField>
                <CheckboxField name="eligibleForLeave">Eligible for leave</CheckboxField>
                <CheckboxField name="eligibleForOvertime">Eligible for overtime</CheckboxField>
              </fieldset>
            </Form>
          </Modal>
        );
      }}
    </Formik>
  );
}
