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
  'DRAFT' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED' | 'CLOSED';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export type PositionMode = 'NEW' | 'EXISTING';

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
  /** ID pembuat — SoD dicocokkan lewat ID, bukan snapshot nama (Notulen 12 Okt 2026 §3). */
  makerId: string;
  /** Waktu diajukan (ISO) — antrean persetujuan diurutkan terlama dulu. */
  submittedAt: string;
  /**
   * Kursi baru (`NEW`) atau tambah kursi pada posisi yang sudah ada (`EXISTING`, Notulen 12 Okt 2026
   * keputusan #2). `positionId` terisi untuk `EXISTING`.
   */
  positionMode: PositionMode;
  positionId?: string;
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
  positionMode: PositionMode;
  /** Wajib bila `positionMode = EXISTING`. */
  positionId: string;
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
export const CURRENT_USER_ID = 'usr-tony-stark';

/** Pembuat = akun login, dicocokkan lewat ID (bukan nama snapshot). */
export const isOwnRequisition = (row: Pick<Requisition, 'makerId'>) => row.makerId === CURRENT_USER_ID;

/** Posisi (kursi) yang sudah ada di struktur — sumber pilihan requisition `EXISTING` (dummy company-service). */
export interface ExistingPosition {
  id: string;
  title: string;
  unitId: string;
  parentPositionId: string;
  filled: number;
  seats: number;
}

export const EXISTING_POSITIONS: ExistingPosition[] = [
  {
    id: 'pos-fin-staff-papua',
    title: 'Staff Finance',
    unitId: 'unit-fin-papua',
    parentPositionId: 'pos-fin-mgr',
    filled: 10,
    seats: 10,
  },
  {
    id: 'pos-ops-wh-jkt',
    title: 'Warehouse Staff',
    unitId: 'unit-ops-jkt',
    parentPositionId: 'pos-ops-lead',
    filled: 14,
    seats: 15,
  },
  {
    id: 'pos-eng-be-hq',
    title: 'Backend Engineer',
    unitId: 'unit-eng-hq',
    parentPositionId: 'pos-eng-mgr',
    filled: 6,
    seats: 6,
  },
  {
    id: 'pos-people-hrbp-hq',
    title: 'HR Business Partner',
    unitId: 'unit-people-hq',
    parentPositionId: 'pos-head-people',
    filled: 2,
    seats: 2,
  },
  {
    id: 'pos-sales-exec-sby',
    title: 'Sales Executive',
    unitId: 'unit-sales-sby',
    parentPositionId: 'pos-ops-lead',
    filled: 12,
    seats: 12,
  },
];

export const POSITION_MODE_LABEL: Record<PositionMode, string> = {
  NEW: 'New position',
  EXISTING: 'Existing position (add seats)',
};

/** Arti tiap status — isi modal legend di header kolom Status. */
export const REQUISITION_STATUS_MEANING: Record<RequisitionStatus, string> = {
  DRAFT: 'Not used on screen — a requisition is created directly as In approval.',
  IN_APPROVAL: 'Waiting for a checker other than the maker. The maker can still edit or cancel it.',
  APPROVED: 'Seats are open and ready to be filled through New Joiner. The maker can close it with a reason.',
  REJECTED: 'Declined by the checker. Read-only.',
  FULFILLED: 'Every requested seat has been filled. Read-only.',
  CANCELLED: 'Cancelled by the maker before a decision. Read-only.',
  CLOSED: 'Closed by the maker while approved; reason, actor and time are recorded. Read-only.',
};
