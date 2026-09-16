/**
 * Payroll › Salary Processing (Proses Gaji) — kontrak FSD-001-PAYROLL §1 · UIC-001-PAYROLL §2 ·
 * TSD-001-PAYROLL-0.25 §15.2 / §15.7 · ERD-001-PAYROLL §6.20 / §6.25.
 *
 * Penjalan (`ROLE_PAYROLL_OFFICER`) menjalankan dan meninjau periode, menutup temuan, dan
 * mengimpor riwayat penggajian; Pemeriksa (`ROLE_HR_MANAGER`) membaca dan memverifikasi impor.
 */

export type Role = 'ROLE_PAYROLL_OFFICER' | 'ROLE_HR_MANAGER';

export interface Actor {
  employeeId: string;
  role: Role;
}

/** `payroll_period_status` — menu ini hanya memproduksi CALCULATED dan REVIEWED. */
export type PeriodStatus = 'CALCULATED' | 'REVIEWED' | 'LOCKED' | 'HANDED_OVER';

export interface Stamp {
  employeeId: string;
  at: string;
}

/** `mst_payroll_period` + `gate_3_param_snapshot_complete` (derivasi, bukan kolom fisik). */
export interface PayrollPeriod {
  id: string;
  periodYear: number;
  periodMonth: number;
  status: PeriodStatus;
  calculated: Stamp;
  reviewed: Stamp | null;
  locked: Stamp | null;
  handedOver: Stamp | null;
  gate1TimeReconciliationCompletedAt: string | null;
  gate2FinanceDeductionPullCompletedAt: string | null;
  gate3ParamSnapshotComplete: boolean;
}

export interface PeriodFilter {
  statuses?: PeriodStatus[];
}

/** `log_payroll_period_state_change`. */
export interface StateChange {
  id: string;
  periodId: string;
  fromStatus: PeriodStatus | null;
  toStatus: PeriodStatus;
  reason: string | null;
  createdBy: string;
  createdAt: string;
}

/** `payroll_param_category`. */
export type ParamCategory = 'REGULATION' | 'COMPANY_SETTING' | 'COMPUTED_COMPOSITION';

/** `cnf_payroll_period_param_snapshot` — sepuluh baris per periode. */
export interface ParamSnapshot {
  paramKey: string;
  paramCategory: ParamCategory;
  paramValue: string;
  /** Hanya terisi bila `REGULATION`. */
  sourceEffectiveDate: string | null;
}

/** `finding_type` — daftar tertutup (ERD §6.25A). */
export type FindingType =
  | 'BELOW_UMP'
  | 'MISSING_COST_CENTER_OR_SBU'
  | 'ARRIVED_AFTER_LOCK'
  | 'EMPTY_HOURLY_BASIS'
  | 'NOT_ELIGIBLE_BUT_PAID'
  | 'RECONCILIATION_MISMATCH'
  | 'RECAP_NOT_APPROVED'
  | 'PRODUCTIVITY_LATE_ARRIVAL'
  | 'SCORE_REVISED'
  | 'ANNUAL_TAX_RECALC_SKIPPED'
  | 'JKK_ZERO_INDUSTRY_MISSING'
  | 'TAX_STATUS_ASSUMED'
  | 'PERIOD_NOT_PICKED_UP';

/** `finding_final_state` — NULL berarti masih terbuka. */
export type FinalState = 'DIPERBAIKI' | 'DITERIMA';
export type FinalStateFilter = FinalState | 'OPEN';

export type DetailValue = string | number | boolean | null;

/** `log_payroll_finding` + `repeat_count` (dihitung saat baca). */
export interface Finding {
  id: string;
  periodId: string;
  findingType: FindingType;
  /** NULL untuk temuan bersubjek periode (`PERIOD_NOT_PICKED_UP`). */
  employeeId: string | null;
  detail: Record<string, DetailValue>;
  relatedAttestationId: string | null;
  relatedHandoverId: string | null;
  finalState: FinalState | null;
  resolutionReason: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  repeatCount: number | null;
  createdAt: string;
}

export interface FindingFilter {
  findingTypes?: FindingType[];
  finalStates?: FinalStateFilter[];
  employeeId?: string;
}

export interface ResolveInput {
  finalState: FinalState | '';
  resolutionReason: string;
}

export interface BulkResolveResult {
  resolvedCount: number;
  resolvedIds: string[];
  skipped: { id: string; reason: 'ALREADY_RESOLVED' }[];
}

export interface FindingTypeInfo {
  type: FindingType;
  subject: string;
  bornWhen: string;
  meaning: string;
  schema: string;
}

/** `log_payroll_history_import`. */
export interface HistoryImport {
  id: string;
  employeeId: string;
  /** `YYYY-MM` */
  monthYear: string;
  grossTaxableIncomeAmount: number;
  pph21WithheldAmount: number;
  bpjsContributionAmount: number;
  sourceMarker: 'LEGACY_SYSTEM_IMPORT';
  isActive: boolean;
  submittedBy: string;
  submittedAt: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
}

export interface ImportFilter {
  employeeId?: string;
  isActive?: boolean;
  verified?: boolean;
}

export interface ImportDraft {
  employeeId: string;
  monthYear: string;
  grossTaxableIncomeAmount: string;
  pph21WithheldAmount: string;
  bpjsContributionAmount: string;
}

export interface ImportSubmitResult {
  row: HistoryImport;
  /** Terisi pada jalur koreksi — id baris lama yang kini `is_active=false`. */
  supersededId: string | null;
}

export interface RunInput {
  periodYear: number;
  periodMonth: number;
  idempotencyKey: string;
}

export interface RunResult {
  period: PayrollPeriod;
  branch: 'INSERT' | 'RECALCULATE';
  httpStatus: 201 | 200;
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const PERIOD_STATUSES: PeriodStatus[] = ['CALCULATED', 'REVIEWED', 'LOCKED', 'HANDED_OVER'];

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  CALCULATED: 'Calculated',
  REVIEWED: 'Reviewed',
  LOCKED: 'Locked',
  HANDED_OVER: 'Handed over',
};

export const FINAL_STATE_LABEL: Record<FinalStateFilter, string> = {
  OPEN: 'Terbuka',
  DIPERBAIKI: 'Diperbaiki',
  DITERIMA: 'Diterima',
};

export const PARAM_CATEGORY_LABEL: Record<ParamCategory, string> = {
  REGULATION: 'Regulation',
  COMPANY_SETTING: 'Company setting',
  COMPUTED_COMPOSITION: 'Computed composition',
};

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_PAYROLL_OFFICER: 'Payroll Officer',
  ROLE_HR_MANAGER: 'HR Manager',
};
