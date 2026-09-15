/**
 * Finance › Finance Security — kontrak FSD §6 · UIC §7 · TSD §18.3–§18.5 · ERD §6.9
 * (FT8 · KM-A2/A3/A4 · KM-B2/B3/B4 · KM-S1 · KM-S2).
 *
 * Tiga kontrol keamanan lintas modul: penandaan sengketa (dispute hold), jejak
 * unduhan ekspor, dan jejak pembukaan lampiran medis.
 */

export type Role =
  | 'ROLE_FINANCE_OFFICER'
  | 'ROLE_HR_MANAGER'
  | 'ROLE_SUPER_ADMIN'
  | 'ROLE_HEALTH_DATA_OFFICER'
  | 'ROLE_DEPT_MANAGER'
  | 'ROLE_EMPLOYEE';

export interface Actor {
  employeeId: string;
  role: Role;
}

/** ERD `dispute_hold_target_type`. */
export type HoldTargetType = 'BENEFIT_CLAIM' | 'LOAN' | 'CASH_ADVANCE';

/** `map_finance_dispute_hold` + `target_request_no` turunan (UIC F8.07). */
export interface DisputeHoldRow {
  id: string;
  targetType: HoldTargetType;
  targetId: string;
  targetRequestNo: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  /** Empat kolom pelepasan terisi bersamaan (`ck_map_finance_dispute_hold_release_pair`). */
  releasedBy: string | null;
  releasedAt: string | null;
  releasedAtTimezone: string | null;
  releasedReasonNote: string | null;
}

export interface HoldFilter {
  targetType?: HoldTargetType;
  /** Bawaan `true` — daftar kerja "sedang disengketakan". */
  activeOnly?: boolean;
}

/** Kandidat target pada form pasang hold. */
export interface HoldTarget {
  targetType: HoldTargetType;
  targetId: string;
  requestNo: string;
  employeeId: string;
  onHold: boolean;
}

export interface PlaceHoldInput {
  targetType: HoldTargetType | '';
  targetId: string;
}

export interface ReleaseHoldInput {
  /** Satu-satunya nilai sah `false`. */
  isActive: boolean;
  releasedReasonNote: string;
}

export interface ReleaseHoldResult {
  hold: DisputeHoldRow;
  /** Pelepas Finance Officer ⇒ HR Manager dikabari, bukan diminta persetujuan. */
  notifiesHrManager: boolean;
}

/** ERD `finance_export_download_scope`. */
export type ExportScope = 'BENEFIT_CLAIM' | 'LOAN' | 'CASH_ADVANCE' | 'DISBURSEMENT';

/** `log_export_download`. */
export interface ExportLog {
  id: string;
  scope: ExportScope;
  filterCriteria: Record<string, string>;
  rowCount: number;
  downloadedAt: string;
  downloadedAtTimezone: string;
  createdBy: string;
}

export interface ExportLogFilter {
  startDate?: string;
  endDate?: string;
}

export interface ExportInput {
  scope: ExportScope | '';
  startDate: string;
  endDate: string;
}

export interface ExportResult {
  log: ExportLog | null;
  fileName: string;
  csv: string;
}

/** `log_medical_document_access`. */
export interface MedicalAccessLog {
  id: string;
  /** Snapshot karyawan pengaju klaim — bukan pelaku pembukaan. */
  employeeId: string;
  claimItemId: string;
  documentId: string;
  accessedAt: string;
  accessedAtTimezone: string;
  /** Pelaku pembukaan. */
  createdBy: string;
}

export interface MedicalAccessRow extends MedicalAccessLog {
  claimRequestNo: string | null;
}

export interface MedicalLogFilter {
  employeeId?: string;
  claimItemId?: string;
  startDate?: string;
  endDate?: string;
}

/** Respons F8.01 — `access_url` tidak pernah disimpan ulang. */
export interface MedicalDocumentAccess {
  documentId: string;
  accessUrl: string;
  accessedAt: string;
  claimItemId: string;
}

export const HOLD_TARGET_LABEL: Record<HoldTargetType, string> = {
  BENEFIT_CLAIM: 'Benefit claim',
  LOAN: 'Loan',
  CASH_ADVANCE: 'Cash advance',
};

export const EXPORT_SCOPE_LABEL: Record<ExportScope, string> = {
  BENEFIT_CLAIM: 'Benefit claim',
  LOAN: 'Loan',
  CASH_ADVANCE: 'Cash advance',
  DISBURSEMENT: 'Disbursement',
};

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_FINANCE_OFFICER: 'Finance Officer',
  ROLE_HR_MANAGER: 'HR Manager',
  ROLE_SUPER_ADMIN: 'Super Admin',
  ROLE_HEALTH_DATA_OFFICER: 'Health Data Officer',
  ROLE_DEPT_MANAGER: 'Dept Manager',
  ROLE_EMPLOYEE: 'Employee',
};
