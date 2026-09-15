import type { ExportScope, HoldTargetType, Role } from '@/features/finance-security/types';

export const HOLD_TARGET_TYPES: HoldTargetType[] = ['BENEFIT_CLAIM', 'LOAN', 'CASH_ADVANCE'];
export const EXPORT_SCOPES: ExportScope[] = ['BENEFIT_CLAIM', 'LOAN', 'CASH_ADVANCE', 'DISBURSEMENT'];

/** Pasang & cabut hold — peran sama, termasuk lintas peran (FD-112). */
const HOLD_ROLES: Role[] = ['ROLE_FINANCE_OFFICER', 'ROLE_HR_MANAGER', 'ROLE_SUPER_ADMIN'];
/** Ekspor & jejaknya — kelas CRUD finance, bukan HR Manager (§18.4). */
const EXPORT_ROLES: Role[] = ['ROLE_FINANCE_OFFICER', 'ROLE_SUPER_ADMIN'];
/** Auditor jejak medis — bukan Health Data Officer (§18.3.3). */
const AUDIT_ROLES: Role[] = ['ROLE_HR_MANAGER', 'ROLE_SUPER_ADMIN'];
/** Pembuka isi lampiran medis — Finance Officer & Dept Manager dilarang (§18.3.4). */
const OPEN_ROLES: Role[] = ['ROLE_HR_MANAGER', 'ROLE_HEALTH_DATA_OFFICER', 'ROLE_SUPER_ADMIN'];

export const canManageHolds = (role: Role) => HOLD_ROLES.includes(role);
export const canExport = (role: Role) => EXPORT_ROLES.includes(role);
export const canAuditMedical = (role: Role) => AUDIT_ROLES.includes(role);
export const canOpenMedical = (role: Role) => OPEN_ROLES.includes(role);

/** Rentang tanggal inklusif atas bagian `YYYY-MM-DD` sebuah timestamp. */
export function inRange(stamp: string, startDate?: string, endDate?: string): boolean {
  const day = stamp.slice(0, 10);
  if (startDate && day < startDate) return false;
  if (endDate && day > endDate) return false;
  return true;
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: (string | number | null)[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function describeCriteria(criteria: Record<string, string>): string {
  const entries = Object.entries(criteria);
  return entries.length ? JSON.stringify(criteria) : '{}';
}
