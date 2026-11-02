import type { SelectOption } from '@/components/form/SelectField';

/**
 * Manpower & Requisition — rencana headcount per unit dan pengajuan posisi
 * lewat maker→checker (FSD §3 · UIC §3).
 *
 * Requisition **draft-first**: create → DRAFT, lalu Submit dan Approve adalah
 * dua aksi terpisah dengan SoD (checker ≠ maker). Requisition yang disetujui
 * menyiapkan kursi terbuka di hilir.
 */
export type RequisitionStatus = 'DRAFT' | 'IN_APPROVAL' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';

export interface Requisition {
  id: string;
  /**
   * Judul tampilan — sejak T2 (CATATAN 18 Okt 2026) diturunkan dari nama posisi yang
   * dicentang, bukan isian bebas `position_title`.
   */
  title: string;
  unitId: string;
  parentPositionId: string;
  /** Banyak posisi yang dibuka = `position_ids.length` (tanpa isian `headcount`). */
  headcount: number;
  /** `position_ids[]` — kursi kosong bawahan langsung supervisor. Baris lama boleh kosong. */
  positionIds: string[];
  /** `requestor_employee_id` — pemegang posisi di unit; nama ditampilkan. */
  requestor?: string;
  status: RequisitionStatus;
  maker: string;
  /** `emp_requisition.reason` — DTO `justification`→`reason` sejak TSD-EMPLOYEE 0.17 (audit 23 September 2026). */
  reason: string;
  planId?: string;
  checkerNote?: string;
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

/** Body `POST /requisitions` (T2): tanpa `position_title`/`headcount`. */
export interface RequisitionDraft {
  planId: string;
  unitId: string;
  parentPositionId: string;
  requestorId: string;
  positionIds: string[];
  reason: string;
}

/** Posisi struktur organisasi (company-service `group-struct-positions`) — `holder` null = kosong. */
export interface OrgPosition {
  id: string;
  title: string;
  unitId: string;
  parentId: string | null;
  holderId: string | null;
  holderName: string | null;
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

const pos = (id: string, title: string, unitId: string, parentId: string | null, holder: [string, string] | null = null): OrgPosition => ({
  id,
  title,
  unitId,
  parentId,
  holderId: holder?.[0] ?? null,
  holderName: holder?.[1] ?? null,
});

export const ORG_POSITIONS: OrgPosition[] = [
  pos('pos-fin-mgr', 'Finance Manager', 'unit-fin-papua', null, ['emp-yohanes', 'Yohanes Wenda']),
  pos('pos-fin-ar', 'AR Officer', 'unit-fin-papua', 'pos-fin-mgr', ['emp-maria', 'Maria Kogoya']),
  pos('pos-fin-staff-1', 'Staff Finance', 'unit-fin-papua', 'pos-fin-mgr'),
  pos('pos-fin-staff-2', 'Staff Finance', 'unit-fin-papua', 'pos-fin-mgr'),
  pos('pos-fin-ap', 'AP Officer', 'unit-fin-papua', 'pos-fin-mgr'),
  pos('pos-ops-lead', 'Operations Lead', 'unit-ops-jkt', null, ['emp-fajar', 'Fajar Nugroho']),
  pos('pos-ops-wh', 'Warehouse Staff', 'unit-ops-jkt', 'pos-ops-lead'),
  pos('pos-eng-mgr', 'Engineering Manager', 'unit-eng-hq', null, ['emp-andi', 'Andi Wijaya']),
  pos('pos-be-1', 'Backend Engineer', 'unit-eng-hq', 'pos-eng-mgr', ['emp-dimas', 'Dimas Prabowo']),
  pos('pos-be-2', 'Backend Engineer', 'unit-eng-hq', 'pos-eng-mgr'),
  pos('pos-fe-1', 'Frontend Engineer', 'unit-eng-hq', 'pos-eng-mgr'),
  pos('pos-head-people', 'Head of People', 'unit-people-hq', null, ['emp-dewi', 'Dewi Anggraini']),
  pos('pos-hrbp', 'HR Business Partner', 'unit-people-hq', 'pos-head-people'),
  pos('pos-sales-mgr', 'Sales Manager', 'unit-sales-sby', null, ['emp-bagus', 'Bagus Pratama']),
  pos('pos-sales-exec-1', 'Sales Executive', 'unit-sales-sby', 'pos-sales-mgr', ['emp-nadia', 'Nadia Rahman']),
  pos('pos-sales-exec-2', 'Sales Executive', 'unit-sales-sby', 'pos-sales-mgr'),
];

export const positionTitle = (id: string) => ORG_POSITIONS.find((row) => row.id === id)?.title ?? id;

/** Supervisor = posisi di unit yang punya bawahan langsung. */
export const supervisorOptions = (unitId: string): SelectOption[] =>
  ORG_POSITIONS.filter((row) => row.unitId === unitId && ORG_POSITIONS.some((child) => child.parentId === row.id)).map(
    (row) => ({ value: row.id, label: row.holderName ? `${row.title} — ${row.holderName}` : row.title }),
  );

/** Pemohon = pemegang posisi di unit; posisi tanpa pemegang tidak ditawarkan. */
export const requestorOptions = (unitId: string): SelectOption[] =>
  ORG_POSITIONS.filter((row) => row.unitId === unitId && row.holderId).map((row) => ({
    value: row.holderId!,
    label: `${row.holderName} — ${row.title}`,
  }));

/** Positions to Open = posisi KOSONG bawahan langsung supervisor. */
export const openPositions = (supervisorId: string) =>
  ORG_POSITIONS.filter((row) => row.parentId === supervisorId && !row.holderId);

export const requestorName = (employeeId: string) =>
  ORG_POSITIONS.find((row) => row.holderId === employeeId)?.holderName ?? employeeId;

/** Judul tampilan dari posisi tercentang: "Staff Finance ×2, AP Officer". */
export function titleOf(positionIds: string[]): string {
  const counts = new Map<string, number>();
  positionIds.forEach((id) => counts.set(positionTitle(id), (counts.get(positionTitle(id)) ?? 0) + 1));
  return [...counts].map(([title, n]) => (n > 1 ? `${title} ×${n}` : title)).join(', ');
}

/** Status requisition yang sudah tidak bergerak lagi. */
export const TERMINAL_REQUISITION: RequisitionStatus[] = ['REJECTED', 'FULFILLED', 'CANCELLED'];

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
