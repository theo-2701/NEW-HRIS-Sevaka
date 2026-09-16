/**
 * Payroll › Authorization & Handover (Otorisasi & Penyerahan) — kontrak FSD-001-PAYROLL §2 ·
 * UIC-001-PAYROLL §3 · TSD-001-PAYROLL-0.25 §12 / §15.1 / §15.6 · ERD §6.1–§6.4 / §6.23.
 *
 * Pemeriksa (`ROLE_HR_MANAGER`) mengunci, membuka kembali, dan mengotorisasi penyerahan periode;
 * memutuskan tiga jenis usulan gaji; dan memantau tabel jembatan penyerahan.
 */

export type Role = 'ROLE_HR_MANAGER' | 'ROLE_PAYROLL_OFFICER' | 'ROLE_ESCALATION_APPROVER';

export interface Actor {
  employeeId: string;
  role: Role;
}

/** `proposal_state` usulan sifat komponen (ERD §6.1). */
export type ProposalState = 'AKTIF' | 'MENUNGGU_PERSETUJUAN';

/** `approval_state` nilai per karyawan dan status kumpulan (ERD §6.2 / §6.4). */
export type ApprovalState = 'MENUNGGU_PERSETUJUAN' | 'DISETUJUI' | 'DITOLAK';
export type BatchStatus = 'DRAFT' | ApprovalState;

/** `mst_salary_component` — sifat aktif + usulan perubahan sifat yang menunggu keputusan. */
export interface SalaryComponent {
  id: string;
  componentCode: string;
  name: string;
  isFixed: boolean;
  isOvertimeBasis: boolean;
  isTaxable: boolean;
  isBpjsBase: boolean;
  proposalState: ProposalState;
  proposedIsOvertimeBasis: boolean | null;
  proposedEffectiveFrom: string | null;
  proposedBy: string | null;
  proposedAt: string | null;
  /**
   * Keputusan setuju dicatat di sini; sifat aktif baru dipromosikan penjadwal harian pada
   * `proposedEffectiveFrom`, jadi `proposalState` sengaja tetap `MENUNGGU_PERSETUJUAN`.
   */
  approvedBy: string | null;
  approvedAt: string | null;
  usedByEmployees: number;
}

/** `ver_emp_salary_component` — usulan nilai gaji per karyawan. */
export interface IndividualProposal {
  id: string;
  employeeId: string;
  salaryComponentId: string;
  amount: number;
  effectiveFrom: string;
  sourceChannel: 'ONBOARDING' | 'CHANGE' | 'BULK_CHANGE';
  approvalState: ApprovalState;
  createdBy: string;
  createdAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  /** Nilai berjalan sebelum usulan ini — tampil di modal keputusan, bukan di antrean. */
  previousAmount: number | null;
}

/** `impact_summary` — lima medan yang dibekukan saat kumpulan diajukan. */
export interface ImpactSummary {
  affectedCount: number;
  netCostShiftAmount: number;
  salaryDecreaseList: string[];
  belowUmpAfterChangeList: string[];
  missingCostCenterOrSbuList: string[];
}

export interface BatchItem {
  employeeId: string;
  salaryComponentId: string;
  amountDelta: number;
}

/** `emp_salary_change_batch`. */
export interface ChangeBatch {
  id: string;
  batchName: string;
  status: BatchStatus;
  requiresEscalation: boolean;
  escalationApproverId: string | null;
  impactSummary: ImpactSummary | null;
  createdBy: string | null;
  createdAt: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  rejectionReason: string | null;
  items: BatchItem[];
}

/** `map_payroll_handover` — baris jembatan yang menunggu diambil sistem klien. */
export interface HandoverPending {
  periodId: string;
  employeeCount: number;
  createdAt: string;
}

/** `log_payroll_handover_pickup` — `createdBy` selalu null karena pelakunya identitas mesin. */
export interface PickupLog {
  id: string;
  periodId: string;
  clientMachineIdentity: string;
  employeeCountPicked: number;
  createdBy: null;
  createdAt: string;
}

/** `handover_reexport_gate_result` (ERD §6.23A). */
export type ReexportGateResult =
  | 'DISETUJUI'
  | 'DITOLAK_PERIODE_BELUM_DISERAHKAN'
  | 'DITOLAK_BARIS_BELUM_KOSONG';

/** `log_payroll_handover_reexport` — dicatat apa pun hasil gerbangnya. */
export interface ReexportLog {
  id: string;
  periodId: string;
  gateResult: ReexportGateResult;
  reasonText: string;
  createdBy: string;
  createdAt: string;
}

export interface ReopenInput {
  targetStatus: 'REVIEWED' | 'CALCULATED' | '';
  reason: string;
}

export const PROPOSAL_STATE_LABEL: Record<ProposalState, string> = {
  AKTIF: 'AKTIF',
  MENUNGGU_PERSETUJUAN: 'MENUNGGU PERSETUJUAN',
};

export const APPROVAL_STATE_LABEL: Record<ApprovalState, string> = {
  MENUNGGU_PERSETUJUAN: 'MENUNGGU PERSETUJUAN',
  DISETUJUI: 'DISETUJUI',
  DITOLAK: 'DITOLAK',
};

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  DRAFT: 'DRAFT',
  ...APPROVAL_STATE_LABEL,
};

export const GATE_RESULT_LABEL: Record<ReexportGateResult, string> = {
  DISETUJUI: 'DISETUJUI',
  DITOLAK_PERIODE_BELUM_DISERAHKAN: 'DITOLAK · PERIODE BELUM DISERAHKAN',
  DITOLAK_BARIS_BELUM_KOSONG: 'DITOLAK · BARIS BELUM KOSONG',
};

export const ROLE_LABEL: Record<Role, string> = {
  ROLE_HR_MANAGER: 'HR Manager',
  ROLE_PAYROLL_OFFICER: 'Payroll Officer',
  ROLE_ESCALATION_APPROVER: 'Escalation approver',
};
