import type { BadgeTone } from '@/components/StatusBadge';

/**
 * Temporary Assignment — FSD-001-EMPLOYEE 0.83 §10 · TSD 0.192 §7.18. Karyawan memegang kursi kosong
 * sementara (Rotation / Secondment) sambil tetap memegang kursinya sendiri; unit, cabang, cost center, dan
 * golongan tetap milik kursi asal (D2).
 */
export type AssignmentType = 'ROTATION' | 'SECONDMENT';
export type AssignmentStatus = 'IN_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'RETURNED' | 'REJECTED' | 'CANCELLED';
export type ReturnTrigger = 'RETURN_DATE' | 'EARLY' | 'OFFBOARDING';

export interface TemporaryAssignment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNik: string;
  homeSeat: string;
  assignmentType: AssignmentType;
  assignedSeatId: string;
  startDate: string;
  returnDate: string;
  reason: string;
  status: AssignmentStatus;
  returnTrigger: ReturnTrigger | null;
  approvedBy: string | null;
  approvedAt: string | null;
  returnedOn: string | null;
  createdAt: string;
  createdBy: string;
  /** employee_id pengaju (0.165) — layar menyembunyikan Approve/Reject bagi pengaju sendiri. */
  createdById: string;
}

export interface AssignmentDraft {
  employeeId: string;
  assignmentType: AssignmentType | '';
  unitId: string;
  assignedSeatId: string;
  startDate: string;
  returnDate: string;
  reason: string;
}

export interface AssignmentFilter {
  keyword?: string;
  statuses?: AssignmentStatus[];
  assignmentType?: AssignmentType;
}

/** Kursi penugasan per unit (dummy company-service, mode picker). */
export interface AssignmentSeat {
  id: string;
  code: string;
  name: string;
  unitId: string;
}

export const ASSIGNMENT_SEATS: AssignmentSeat[] = [
  { id: 'seat-eng-qa-02', code: 'ENG-QA-02', name: 'QA Engineer', unitId: 'unit-eng-hq' },
  { id: 'seat-eng-be-07', code: 'ENG-BE-07', name: 'Backend Engineer', unitId: 'unit-eng-hq' },
  { id: 'seat-ops-wh-07', code: 'OPS-WH-07', name: 'Warehouse Staff', unitId: 'unit-ops-jkt' },
  { id: 'seat-fin-ap-03', code: 'FIN-AP-03', name: 'AP Officer', unitId: 'unit-fin-papua' },
  { id: 'seat-sls-exe-11', code: 'SLS-EXE-11', name: 'Sales Executive', unitId: 'unit-sales-sby' },
];

export const seatLabel = (id: string) => {
  const seat = ASSIGNMENT_SEATS.find((item) => item.id === id);
  return seat ? `${seat.code} - ${seat.name}` : '—';
};

export const TYPE_LABEL: Record<AssignmentType, string> = { ROTATION: 'Rotation', SECONDMENT: 'Secondment' };

export const TYPE_HINT: Record<AssignmentType, string> = {
  ROTATION: 'Moves the employee to another seat in the company for a while, for example to learn another role.',
  SECONDMENT: 'Lends the employee to another unit or project that needs their skills for a while.',
};

export const STATUS_LABEL: Record<AssignmentStatus, string> = {
  IN_APPROVAL: 'Waiting for Approval',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  RETURNED: 'Returned',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const STATUS_TONE: Record<AssignmentStatus, BadgeTone> = {
  IN_APPROVAL: 'warn',
  APPROVED: 'info',
  ACTIVE: 'ok',
  RETURNED: 'mute',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

export const STATUS_MEANING: Record<AssignmentStatus, string> = {
  IN_APPROVAL: 'Submitted and waiting for HR Manager or Super Admin. No seat is touched yet.',
  APPROVED: 'Approved and waiting for the start date.',
  ACTIVE: 'The employee holds the assignment seat in addition to their own seat.',
  RETURNED: 'Ended. The assignment seat is free again.',
  REJECTED: 'Rejected. No seat was touched.',
  CANCELLED: 'Withdrawn before it started. No seat was touched.',
};

export const RETURN_TRIGGER_LABEL: Record<ReturnTrigger, string> = {
  RETURN_DATE: 'Returned on the return date',
  EARLY: 'Returned early',
  OFFBOARDING: 'Ended by offboarding',
};

/** Membuka layar & mengajukan: HR Staff · HR Manager · Super Admin; memutuskan: HR Manager · Super Admin. */
export const canOpenAssignments = (role?: string) =>
  role === 'ROLE_HR_STAFF' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
export const isAssignmentChecker = (role?: string) => role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';
