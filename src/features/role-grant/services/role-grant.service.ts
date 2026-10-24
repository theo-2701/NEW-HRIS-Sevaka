import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { useAuthStore } from '@/store/auth.store';
import { MANDATORY_ROLE, ROLES } from '@/features/role-grant/types';
import type { RoleCode, RoleGrantMatrix, RoleGrantRow } from '@/features/role-grant/types';

/**
 * API service Role Grant Rules (TSD-001-EMPLOYEE 0.192 §7.4.13):
 *   GET /role-grant-rules            — matriks + `can_edit` (Super Admin saja)
 *   PUT /role-grant-rules            — maks 2 baris (HR Manager, HR Staff); Employee wajib ada
 *   GET /role-grant-rules/grantable  — peran yang boleh diberikan pemanggil (pilihan Role materialisasi)
 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

const BASIC: RoleCode[] = [
  'ROLE_EMPLOYEE',
  'ROLE_DEPARTMENT_MANAGER',
  'ROLE_GA_STAFF',
  'ROLE_FINANCE_OFFICER',
  'ROLE_PAYROLL_OFFICER',
  'ROLE_PAYROLL_AUDITOR',
  'ROLE_HEALTH_DATA_OFFICER',
];

/** Seed berjenjang: HR Staff 7 peran biasa, HR Manager ditambah HR Staff. */
let stored: Record<'ROLE_HR_MANAGER' | 'ROLE_HR_STAFF', RoleCode[]> = {
  ROLE_HR_MANAGER: [...BASIC, 'ROLE_HR_STAFF'],
  ROLE_HR_STAFF: [...BASIC],
};

const canonical = (roles: RoleCode[]) => ROLES.filter((role) => roles.includes(role));
const callerRole = () => useAuthStore.getState().user?.role;

function matrix(): RoleGrantMatrix {
  const rows: RoleGrantRow[] = [
    { grantorRole: 'ROLE_SUPER_ADMIN', grantableRoles: [...ROLES], locked: true },
    { grantorRole: 'ROLE_HR_MANAGER', grantableRoles: canonical(stored.ROLE_HR_MANAGER), locked: false },
    { grantorRole: 'ROLE_HR_STAFF', grantableRoles: canonical(stored.ROLE_HR_STAFF), locked: false },
  ];
  return { roles: [...ROLES], rows, canEdit: callerRole() === 'ROLE_SUPER_ADMIN' };
}

/** Mode dummy: penegakan di materialisasi NJ/ATS — peran di luar hak pemanggil `403`. */
export function assertGrantable(roleCode: string) {
  if (!(ROLES as readonly string[]).includes(roleCode)) throw new Error('422 — role_code is not one of the eleven roles.');
  if (!grantableFor(callerRole()).includes(roleCode as RoleCode)) {
    throw new Error('403 — You are not allowed to give this role. Check Employee Directory > Role Grant Rules.');
  }
}

function grantableFor(role?: string): RoleCode[] {
  if (role === 'ROLE_SUPER_ADMIN') return [...ROLES];
  if (role === 'ROLE_HR_MANAGER' || role === 'ROLE_HR_STAFF') return canonical(stored[role]);
  return [];
}

export const roleGrantService = {
  async get(): Promise<RoleGrantMatrix> {
    if (MOCK) {
      await delay();
      return matrix();
    }
    const { data } = await api.get<RoleGrantMatrix>('/employee/role-grant-rules');
    return data;
  },

  async save(rows: { grantorRole: 'ROLE_HR_MANAGER' | 'ROLE_HR_STAFF'; grantableRoles: RoleCode[] }[]): Promise<RoleGrantMatrix> {
    if (MOCK) {
      await delay(350);
      if (callerRole() !== 'ROLE_SUPER_ADMIN') throw new Error('403 — Only a Super Admin can change the role grant rules.');
      for (const row of rows) {
        if (!row.grantableRoles.includes(MANDATORY_ROLE)) throw new Error('422 — Employee must stay allowed for every grantor.');
      }
      stored = { ...stored, ...Object.fromEntries(rows.map((row) => [row.grantorRole, canonical(row.grantableRoles)])) };
      return matrix();
    }
    const { data } = await api.put<RoleGrantMatrix>('/employee/role-grant-rules', {
      rows: rows.map((row) => ({ grantor_role: row.grantorRole, grantable_roles: row.grantableRoles })),
    });
    return data;
  },

  async grantable(): Promise<RoleCode[]> {
    if (MOCK) {
      await delay(150);
      return grantableFor(callerRole());
    }
    const { data } = await api.get<{ role_code: RoleCode }[]>('/employee/role-grant-rules/grantable');
    return data.map((row) => row.role_code);
  },
};
