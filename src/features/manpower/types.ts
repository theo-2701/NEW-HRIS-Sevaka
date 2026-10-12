import type { SelectOption } from '@/components/form/SelectField';

/**
 * Manpower & Requisition — rencana headcount per unit dan pengajuan posisi
 * lewat maker→checker (FSD §3 · UIC §3).
 *
 * Requisition lahir langsung IN_APPROVAL (FSD 0.24 §3.1, TSD §15 K2 — DRAFT ada
 * di enum tapi tidak diekspos, tanpa tombol Ajukan). Checker ≠ maker (SoD).
 * APPROVED ditutup maker lewat dialog alasan → CLOSED.
 */
export type RequisitionStatus =
  | 'DRAFT'
  | 'IN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'FULFILLED'
  | 'CANCELLED'
  | 'CLOSED';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface Requisition {
  id: string;
  /** `position_title` — wajib, maksimal 150 karakter (FSD 0.2 §3.1). */
  title: string;
  unitId: string;
  parentPositionId: string;
  /** `headcount` (dulu bernama `quantity`). */
  headcount: number;
  status: RequisitionStatus;
  maker: string;
  /** `emp_requisition.reason` — DTO `justification`→`reason` sejak TSD-EMPLOYEE 0.17 (audit 23 September 2026). */
  reason: string;
  planId?: string;
  checkerNote?: string;
  /** `active_from` – `active_until` (yyyy-MM-dd), wajib sejak FSD 0.22. */
  activeFrom: string;
  activeUntil: string;
  /** `filled_count` — kursi yang sudah terisi; FULFILLED saat penuh. */
  filledCount: number;
  closedReason?: string;
  closedByName?: string;
  closedAt?: string;
}

export interface PlanLine {
  unitId: string;
  target: number;
  /**
   * Jumlah posisi aktual dari company-service. `null` = belum terhitung —
   * employee-service tidak menyimpan kolom kapasitas (PROB-FRONTEND-005).
   */
  actual: number | null;
}

export interface ManpowerPlan {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: PlanStatus;
  createdBy: string;
  lines: PlanLine[];
}

export interface RequisitionDraft {
  planId: string;
  unitId: string;
  parentPositionId: string;
  title: string;
  headcount: number;
  reason: string;
  activeFrom: string;
  activeUntil: string;
}

export interface PlanDraft {
  title: string;
  periodStart: string;
  periodEnd: string;
  lines: { unitId: string; target: number }[];
}

export const REQUISITION_STATUS_LABEL: Record<RequisitionStatus, string> = {
  DRAFT: 'Draft',
  IN_APPROVAL: 'In approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
  CLOSED: 'Closed',
};

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  CLOSED: 'Closed',
  ARCHIVED: 'Archived',
};

export const UNIT_OPTIONS: SelectOption[] = [
  { value: 'unit-fin-papua', label: 'Finance — BR-Papua' },
  { value: 'unit-ops-jkt', label: 'Operations — BR-Jakarta' },
  { value: 'unit-eng-hq', label: 'Engineering — HQ' },
  { value: 'unit-people-hq', label: 'People Ops — HQ' },
  { value: 'unit-sales-sby', label: 'Sales — BR-Surabaya' },
];

export const PARENT_POSITION_OPTIONS: SelectOption[] = [
  { value: 'pos-fin-mgr', label: 'Finance Manager' },
  { value: 'pos-ops-lead', label: 'Operations Lead' },
  { value: 'pos-eng-mgr', label: 'Engineering Manager' },
  { value: 'pos-head-people', label: 'Head of People' },
];

/** Status requisition yang sudah tidak bergerak lagi. */
export const TERMINAL_REQUISITION: RequisitionStatus[] = ['REJECTED', 'FULFILLED', 'CANCELLED', 'CLOSED'];

/** Maker = HR Staff · HR Manager · Super Admin; checker = HR Manager · Super Admin (FSD 0.24 §3.1). */
export const isRequisitionMaker = (role?: string) =>
  role === 'ROLE_HR_STAFF' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
export const isRequisitionChecker = (role?: string) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';

export function labelOf(options: SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function planTotals(plan: ManpowerPlan): { target: number; actual: number | null; gap: number | null } {
  const target = plan.lines.reduce((sum, line) => sum + line.target, 0);
  const counted = plan.lines.filter((line) => line.actual !== null);
  if (counted.length === 0) return { target, actual: null, gap: null };
  const actual = counted.reduce((sum, line) => sum + (line.actual ?? 0), 0);
  return { target, actual, gap: target - actual };
}

/** Aktor yang sedang login — dipakai untuk aturan SoD maker ≠ checker. */
export const CURRENT_USER = 'Tony Stark';
