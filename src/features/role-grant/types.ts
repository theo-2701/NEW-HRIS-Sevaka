/**
 * Role Grant Rules — siapa boleh memberi peran apa saat materialisasi
 * (FSD-001-EMPLOYEE 0.83 §13 · TSD 0.192 §7.4.13). Berjenjang secara bawaan; hanya Super Admin mengubah.
 */

/** Sebelas peran kanonik, urutan `GET /roles` (TSD §7.13.1). */
export const ROLES = [
  'ROLE_SUPER_ADMIN',
  'ROLE_HR_MANAGER',
  'ROLE_HR_STAFF',
  'ROLE_SYSTEM_ADMIN',
  'ROLE_FINANCE_OFFICER',
  'ROLE_PAYROLL_OFFICER',
  'ROLE_DEPARTMENT_MANAGER',
  'ROLE_EMPLOYEE',
  'ROLE_GA_STAFF',
  'ROLE_HEALTH_DATA_OFFICER',
  'ROLE_PAYROLL_AUDITOR',
] as const;

export type RoleCode = (typeof ROLES)[number];

export const ROLE_LABEL: Record<RoleCode, string> = {
  ROLE_SUPER_ADMIN: 'Super Admin',
  ROLE_HR_MANAGER: 'HR Manager',
  ROLE_HR_STAFF: 'HR Staff',
  ROLE_SYSTEM_ADMIN: 'System Admin',
  ROLE_FINANCE_OFFICER: 'Finance Officer',
  ROLE_PAYROLL_OFFICER: 'Payroll Officer',
  ROLE_DEPARTMENT_MANAGER: 'Department Manager',
  ROLE_EMPLOYEE: 'Employee',
  ROLE_GA_STAFF: 'GA Staff',
  ROLE_HEALTH_DATA_OFFICER: 'Health Data Officer',
  ROLE_PAYROLL_AUDITOR: 'Payroll Auditor',
};

export const MANDATORY_ROLE: RoleCode = 'ROLE_EMPLOYEE';

export interface RoleGrantRow {
  grantorRole: RoleCode;
  grantableRoles: RoleCode[];
  /** Baris Super Admin: selalu seluruh peran, tidak disimpan. */
  locked: boolean;
}

export interface RoleGrantMatrix {
  roles: RoleCode[];
  rows: RoleGrantRow[];
  canEdit: boolean;
}
