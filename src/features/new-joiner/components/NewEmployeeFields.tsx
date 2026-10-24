import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SelectField } from '@/components/form/SelectField';
import { TextField } from '@/components/form/TextField';
import { BANK_OPTIONS } from '@/features/new-joiner/addEmployee';
import { roleGrantService } from '@/features/role-grant/services/role-grant.service';
import { ROLE_LABEL } from '@/features/role-grant/types';
import { workStatusService } from '@/features/work-status/services/work-status.service';

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="m-0 border-b border-border-1 pb-1.5 font-body text-[13px] font-bold text-fg-1">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

/**
 * Isian akun & data kerja karyawan baru — dipakai NJ-MATERIALIZE dan ATS "Create Employee"
 * supaya kedua layar identik (FSD-001-EMPLOYEE 0.83 §4.1 · §4A.1).
 */
export function NewEmployeeFields({ companyEmailHint }: { companyEmailHint?: string }) {
  const { data: roles = ['ROLE_EMPLOYEE' as const] } = useQuery({
    queryKey: ['role-grant', 'grantable'],
    queryFn: () => roleGrantService.grantable(),
  });
  const { data: workStatuses = [] } = useQuery({
    queryKey: ['work-status', { isActive: true }],
    queryFn: () => workStatusService.search({ isActive: true }),
  });

  return (
    <>
      <Group title="Account">
        <TextField
          name="nik"
          label="NIK"
          required
          maxLength={50}
          hint="Suggested next number. Free format — you get a warning if it is already used."
        />
        <TextField
          name="username"
          label="Username"
          required
          maxLength={100}
          hint="Suggested from the email. Lower-case letters, digits, dots and underscores."
        />
        <TextField
          name="companyEmail"
          type="email"
          label="Company Email"
          required
          placeholder="name@company.co.id"
          hint={companyEmailHint ?? 'Typed by HR; HRIS does not create the mailbox. No mailbox password is asked or stored.'}
        />
        <SelectField
          name="roleCode"
          label="Role"
          options={roles.map((role) => ({ value: role, label: ROLE_LABEL[role] }))}
          hint="The role the new employee gets when signing in. Only roles you may give are listed (Role Grant Rules)."
        />
      </Group>
      <Group title="Employment and bank (optional)">
        <SelectField
          name="workStatusId"
          label="Employment Type"
          placeholder="Select an employment type"
          options={workStatuses.map((row) => ({ value: row.id, label: row.name }))}
          hint="Can also be set later in Edit Work Data."
        />
        <SelectField name="bankCode" label="Bank" placeholder="Select a bank" options={BANK_OPTIONS} />
        <TextField name="accountNumber" label="Account Number" inputMode="numeric" maxLength={20} placeholder="Digits only" />
        <TextField name="accountHolderName" label="Account Holder Name" maxLength={100} />
      </Group>
    </>
  );
}
