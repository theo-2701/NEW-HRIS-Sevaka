import type { BadgeTone } from '@/components/StatusBadge';
import type { TransferSubtype } from '@/features/transitions/types';
import type { RoleCode } from '@/features/role-grant/types';

/**
 * Materialization — paket task tiap transisi dan kepada siapa task dibangkitkan (FSD-001-EMPLOYEE 0.83 §17,
 * §21 · TSD 0.192 §7.23). Onboarding/Offboarding per cabang, Transfer per perusahaan; tiap jenis punya
 * company default (`branchId = null`).
 */
export type SetupType = 'ONBOARDING' | 'OFFBOARDING' | 'TRANSFER';
export type SetupSection = 'MAIN' | 'OUT' | 'IN';
export type SetupStatus = 'COMPLETE' | 'UNDERSTAFFED' | 'INCOMPLETE';
export type DeadlineClass = 'LEGAL' | 'OPERATIONAL';
export type InactiveReason = 'STATUS' | 'ROLE_ACCESS' | 'BRANCH';

export interface Assignee {
  employeeId: string;
  name: string;
  nik: string;
  branch: string;
  inactive?: InactiveReason;
}

export interface SetupTask {
  id: string;
  name: string;
  dueDays: number;
  deadlineClass: DeadlineClass;
  requiresApproval: boolean;
  handlers: Assignee[];
  approvers: Assignee[];
  /** "SEVAKA HRIS access" — selesai oleh materialisasi itu sendiri (TSU-D11). */
  locked?: boolean;
  /** Task fasilitas bawaan: lahir hanya bila catatan fasilitas di form transisi terisi (TSU-D9). */
  facility?: 'PROVIDED' | 'WITHDRAWN';
}

export interface Setup {
  id: string;
  type: SetupType;
  /** null = All subtypes. Hanya Transfer. */
  subtype: TransferSubtype | null;
  /** null = Company default. Transfer selalu per perusahaan. */
  branchId: string | null;
  version: number;
  updatedAt: string;
  updatedBy: string;
  /** Transfer: bagian In terbuka sesudah seluruh Out selesai dan disetujui (TSU-D5, bawaan menyala). */
  inOpensAfterOut: boolean;
  sections: Partial<Record<SetupSection, SetupTask[]>>;
}

export interface SetupHistory {
  version: number;
  savedAt: string;
  savedBy: string;
  action: 'Created' | 'Updated' | 'Auto-filled' | 'Marked inactive';
  /** Per task: nama petugas dan penyetuju (tanpa data pribadi lain). */
  snapshot: { task: string; handlers: string[]; approvers: string[] }[];
}

export interface SetupFilter {
  type?: SetupType;
  subtype?: TransferSubtype | 'ALL_SUBTYPES';
  branchId?: string;
  status?: SetupStatus;
}

export interface RoleMappingRow {
  roleCode: RoleCode;
  isMaterialize: boolean;
}

export const SETUP_TYPE_LABEL: Record<SetupType, string> = {
  ONBOARDING: 'Onboarding',
  OFFBOARDING: 'Offboarding',
  TRANSFER: 'Transfer',
};

export const SETUP_STATUS_LABEL: Record<SetupStatus, string> = {
  COMPLETE: 'Complete',
  UNDERSTAFFED: 'Understaffed',
  INCOMPLETE: 'Incomplete',
};

export const SETUP_STATUS_TONE: Record<SetupStatus, BadgeTone> = {
  COMPLETE: 'ok',
  UNDERSTAFFED: 'warn',
  INCOMPLETE: 'err',
};

export const INACTIVE_LABEL: Record<InactiveReason, string> = {
  STATUS: 'Status',
  ROLE_ACCESS: 'Role access',
  BRANCH: 'Branch',
};

export const SECTION_LABEL: Record<SetupSection, string> = { MAIN: 'Tasks', OUT: 'Out', IN: 'In' };

export const BRANCH_OPTIONS = [
  { value: 'br-jkt', label: 'HO-Jakarta' },
  { value: 'br-papua', label: 'BR-Papua' },
  { value: 'br-sby', label: 'BR-Surabaya' },
  { value: 'br-bdg', label: 'BR-Bandung' },
];

export const branchLabel = (id: string | null) => (id ? (BRANCH_OPTIONS.find((item) => item.value === id)?.label ?? id) : 'Company default');

export const MIN_PEOPLE = 2;

const active = (people: Assignee[]) => people.filter((person) => !person.inactive).length;

/** Status setup (MS7): kurang dari 2 orang terdaftar = Incomplete; terdaftar cukup tapi aktif < 2 = Understaffed. */
export function setupStatus(setup: Pick<Setup, 'sections'>): SetupStatus {
  const tasks = Object.values(setup.sections).flat().filter((task) => !task?.locked) as SetupTask[];
  if (tasks.length === 0) return 'INCOMPLETE';
  const lists = tasks.flatMap((task) => [task.handlers, ...(task.requiresApproval ? [task.approvers] : [])]);
  if (lists.some((list) => list.length < MIN_PEOPLE)) return 'INCOMPLETE';
  if (lists.some((list) => active(list) < MIN_PEOPLE)) return 'UNDERSTAFFED';
  return 'COMPLETE';
}

/** Tulis: HR Manager · Super Admin; baca saja: HR Staff · System Admin (TSU-D27). */
export const canWriteMaterialization = (role?: string) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
export const canReadMaterialization = (role?: string) =>
  canWriteMaterialization(role) || role === 'ROLE_HR_STAFF' || role === 'ROLE_SYSTEM_ADMIN';
