/**
 * Penugasan sementara — rotasi/secondment (TSD-001-EMPLOYEE 0.212 §7.18).
 * Kursi asal tetap dipegang; unit kerja (payroll, absensi) tetap unit asal.
 * Satu penugasan terbuka (IN_APPROVAL/APPROVED/ACTIVE) per pegawai.
 */
export type TaStatus = 'IN_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'RETURNED' | 'REJECTED' | 'CANCELLED';
export type AssignmentType = 'ROTATION' | 'SECONDMENT';
export type ReturnTrigger = 'SCHEDULE' | 'EARLY' | 'OFFBOARDING';
export type TaRole = 'HR_STAFF' | 'HR_MANAGER';

export interface TaSession {
  employeeId: string;
  role: TaRole;
}

export interface OrgUnit {
  id: string;
  name: string;
}

export interface Seat {
  id: string;
  name: string;
  orgUnitId: string;
  occupantId: string | null;
}

export interface TempAssignment {
  id: string;
  employeeId: string;
  assignmentType: AssignmentType;
  homePosId: string | null;
  assignedPosId: string;
  startDate: string;
  returnDate: string;
  status: TaStatus;
  reason: string;
  returnTrigger: ReturnTrigger | null;
  approvedBy: string | null;
  approvedAt: string | null;
  returnedAt: string | null;
  createdAt: string;
  /** Pembuat — dipakai menyembunyikan Approve/Reject darinya; server tetap 409. */
  createdByEmployeeId: string;
}

export interface TaDraft {
  employeeId: string;
  assignmentType: AssignmentType | '';
  orgUnitId: string;
  assignedPosId: string;
  startDate: string;
  returnDate: string;
  reason: string;
}

export const OPEN_STATUSES: TaStatus[] = ['IN_APPROVAL', 'APPROVED', 'ACTIVE'];

export const TA_STATUS_LABEL: Record<TaStatus, string> = {
  IN_APPROVAL: 'In approval',
  APPROVED: 'Approved',
  ACTIVE: 'Active',
  RETURNED: 'Returned',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const TA_TYPE_LABEL: Record<AssignmentType, string> = {
  ROTATION: 'Rotation',
  SECONDMENT: 'Secondment',
};

export const RETURN_TRIGGER_LABEL: Record<ReturnTrigger, string> = {
  SCHEDULE: 'On schedule',
  EARLY: 'Returned early',
  OFFBOARDING: 'Offboarding',
};

export const isChecker = (session: TaSession) => session.role === 'HR_MANAGER';

export type TaAction = 'approve' | 'reject' | 'cancel' | 'return' | 'extend';

/** Aksi sah menurut status + peran (§7.18.2–§7.18.3); server tetap penegak akhir. */
export function allowedActions(row: TempAssignment, session: TaSession): TaAction[] {
  const checker = isChecker(session);
  const maker = row.createdByEmployeeId === session.employeeId;
  const actions: TaAction[] = [];
  if (row.status === 'IN_APPROVAL' && checker && !maker) actions.push('approve', 'reject');
  if ((row.status === 'IN_APPROVAL' || row.status === 'APPROVED') && (checker || maker)) actions.push('cancel');
  if (row.status === 'ACTIVE' && checker) actions.push('return');
  if ((row.status === 'APPROVED' || row.status === 'ACTIVE') && checker) actions.push('extend');
  return actions;
}
