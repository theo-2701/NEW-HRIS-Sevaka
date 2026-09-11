/**
 * Time › On Call — kontrak FSD-001-TIME §10–§11 · UIC-001-TIME §11–§12.
 *
 * Satu sumber daya tulis (`emp_oncall_assignment`) dan satu layar baca.
 * Jendela siaga memberi otorisasi di muka: begitu SCHEDULED, kehadiran yang
 * jatuh di dalamnya melahirkan baris lembur otomatis sampai setinggi pagunya.
 * Layar Activity hanya membaca baris lembur itu — nol jalur tulis.
 */

export type OncallStatus = 'PENDING_APPROVAL' | 'SCHEDULED' | 'ACTIVE' | 'REJECTED' | 'CANCELLED';

export interface OncallAssignment {
  id: string;
  employeeId: string;
  /** ISO lengkap dengan offset zona karyawan. */
  standbyStartAt: string;
  standbyEndAt: string;
  /** Pagu jam per call-out; salinannya dibekukan ke baris lembur otomatis. */
  maxCalloutHours: number;
  oncallStatus: OncallStatus;
  /** Diturunkan server dari pagu — bukan field form. */
  requiresExtraApprovalReason: 'MAX_CALLOUT_EXCEEDS_DAILY_CAP' | null;
  assignmentNote: string;
  createdBy: string;
  approvedBy: string | null;
}

export interface OncallDraft {
  employeeId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  maxCalloutHours: string;
  assignmentNote: string;
}

export const ONCALL_STATUS_LABEL: Record<OncallStatus, string> = {
  PENDING_APPROVAL: 'Pending approval',
  SCHEDULED: 'Scheduled',
  ACTIVE: 'Active',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

/** Status yang masih memegang tempat di kalender siaga karyawan. */
export const LIVE_ONCALL_STATUSES: OncallStatus[] = ['PENDING_APPROVAL', 'SCHEDULED', 'ACTIVE'];
