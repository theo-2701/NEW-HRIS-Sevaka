/**
 * Time › Attendance — kontrak FSD-001-TIME §5 · UIC-001-TIME §6.
 *
 * Tiga tabel, tiga sifat yang berbeda:
 *  • `log_attendance_punch`   — append-only. Tidak ada ubah, tidak ada hapus.
 *  • `emp_attendance_daily`   — putusan mesin. NOL endpoint tulis dari layar.
 *  • `emp_attendance_correction` — satu-satunya jalur sah menggeser penilaian
 *    hari, dan pengajunya tidak pernah boleh jadi penyetujunya.
 */

/** Peran yang dipakai layar ini; scope-nya berbeda dari peran Time Off. */
export type AttendanceRole = 'EMPLOYEE' | 'HR_STAFF' | 'DEPT_MANAGER' | 'HR_MANAGER';

export interface AttendanceSession {
  employeeId: string;
  role: AttendanceRole;
}

export type PunchType = 'IN' | 'OUT';
export type WorkArrangement = 'WFO' | 'HYBRID' | 'WFH' | 'MOBILE';
export type DayType = 'WORKDAY' | 'WEEKLY_REST' | 'PUBLIC_HOLIDAY';

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'INCOMPLETE'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'SICK'
  | 'NOT_SCHEDULED';

export type CorrectionStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type CorrectionReasonType = 'FORGOT_PUNCH' | 'APP_ERROR' | 'OFFICIAL_TRAVEL' | 'OTHER';

/**
 * Enum turunan sistem, bukan pilihan approver (UIC §6.3.4).
 * Hari `ON_LEAVE`/`SICK` sengaja `isExcused: false` — statusnya sendiri yang
 * membawa fakta itu; kontrak belum menyebut nilai resmi untuk hari cuti
 * (GAP-TIME §5 "perlu dikonfirmasi" #6).
 */
export type ExcusedReason = 'APPROVED_CORRECTION' | 'APP_ERROR' | 'OFFICIAL_TRAVEL';

/** Aturan kanal capture per titik × pengaturan kerja. */
export interface GeofenceRule {
  radius: boolean;
  selfie: boolean;
}

export interface Geofence {
  id: string;
  geofenceName: string;
  /** Cabang yang dilayani titik ini. */
  scopeRef: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusMeters: number;
  isActive: boolean;
  usedByPunch: boolean;
  rules: Record<WorkArrangement, GeofenceRule>;
}

export interface Punch {
  id: string;
  employeeId: string;
  punchType: PunchType;
  /** ISO lengkap dengan offset zona karyawan — bukan zona server. */
  punchAt: string;
  /** Diturunkan server dari `punchAt`, tidak pernah dikirim klien. */
  workDate: string;
  /** `null` = tidak bisa dievaluasi (izin lokasi ditolak), bukan pelanggaran. */
  isWithinGeofence: boolean | null;
  isMockLocationSuspected: boolean;
  isWorkArrangementUnknown: boolean;
  geofenceId: string | null;
}

export interface AttendanceDay {
  id: string;
  employeeId: string;
  workDate: string;
  dayType: DayType;
  workArrangement: WorkArrangement;
  /** Snapshot jadwal saat hari dinilai — bukan jadwal yang berlaku hari ini. */
  expectedIn: string | null;
  expectedOut: string | null;
  appliedLateToleranceMinutes: number;
  attendanceStatus: AttendanceStatus;
  workedMinutes: number;
  lateMinutes: number;
  undertimeMinutes: number;
  isExcused: boolean;
  excusedReason: ExcusedReason | null;
}

export interface Correction {
  id: string;
  attendanceDailyId: string;
  /** Pengaju — boleh berbeda dari pemilik hari (§6.3.1). */
  employeeId: string;
  correctionReasonType: CorrectionReasonType;
  reasonNote: string;
  requestedIn: string | null;
  requestedOut: string | null;
  correctionStatus: CorrectionStatus;
  submittedAt: string;
  decidedBy: string | null;
}

export interface CorrectionDraft {
  attendanceDailyId: string;
  correctionReasonType: CorrectionReasonType | '';
  reasonNote: string;
  requestedIn: string;
  requestedOut: string;
}

/** Kanal capture hasil persilangan pengaturan kerja × aturan titik geofence. */
export interface CaptureChannel {
  geofence: Geofence;
  arrangement: WorkArrangement;
  radius: boolean;
  selfie: boolean;
}

export const ARRANGEMENT_LABEL: Record<WorkArrangement, string> = {
  WFO: 'Work from office',
  HYBRID: 'Hybrid',
  WFH: 'Work from home',
  MOBILE: 'Mobile / field',
};

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  WORKDAY: 'Workday',
  WEEKLY_REST: 'Weekly rest',
  PUBLIC_HOLIDAY: 'Public holiday',
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  INCOMPLETE: 'Incomplete',
  ABSENT: 'Absent',
  ON_LEAVE: 'On leave',
  SICK: 'Sick',
  NOT_SCHEDULED: 'Not scheduled',
};

export const CORRECTION_STATUS_LABEL: Record<CorrectionStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

export const CORRECTION_REASON_LABEL: Record<CorrectionReasonType, string> = {
  FORGOT_PUNCH: 'Forgot to punch',
  APP_ERROR: 'App or device error',
  OFFICIAL_TRAVEL: 'Official travel',
  OTHER: 'Other',
};

export const EXCUSED_REASON_LABEL: Record<ExcusedReason, string> = {
  APPROVED_CORRECTION: 'Approved correction',
  APP_ERROR: 'App or device error',
  OFFICIAL_TRAVEL: 'Official travel',
};

/**
 * Peta alasan koreksi → `excused_reason` (UIC §6.3.4). Approver tidak pernah
 * memilihnya; drawer keputusan hanya memperlihatkan nilai yang akan terisi.
 */
export const EXCUSED_FROM_REASON: Record<CorrectionReasonType, ExcusedReason> = {
  FORGOT_PUNCH: 'APPROVED_CORRECTION',
  OTHER: 'APPROVED_CORRECTION',
  APP_ERROR: 'APP_ERROR',
  OFFICIAL_TRAVEL: 'OFFICIAL_TRAVEL',
};

/** `attendance-correction:create` — HR_STAFF · EMPLOYEE (§6.3.1). */
export function canCreateCorrection(session: AttendanceSession): boolean {
  return session.role === 'EMPLOYEE' || session.role === 'HR_STAFF';
}

/** `attendance-correction:approve` — HR_MANAGER · DEPT_MANAGER (§6.3.3). */
export function canApproveCorrection(session: AttendanceSession): boolean {
  return session.role === 'HR_MANAGER' || session.role === 'DEPT_MANAGER';
}

/** `attendance-summary:search` bukan scope EMPLOYEE (§6.2.2). */
export function canSearchSummary(session: AttendanceSession): boolean {
  return session.role !== 'EMPLOYEE';
}

/**
 * `attendance-punch:search` adalah kewenangan penyelidikan (§6.1.3):
 * SUPER_ADMIN · HR_MANAGER saja — DEPT_MANAGER pemegang `:read` pun tidak.
 */
export function canSearchPunch(session: AttendanceSession): boolean {
  return session.role === 'HR_MANAGER';
}
