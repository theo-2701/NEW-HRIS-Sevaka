/** Performance Management (FSD-001-PERFORMANCE 0.11 · UIC-001-PERFORMANCE 0.12). */

export const PERF_PATHS = {
  cycles: '/performance/cycles',
  cycleDetail: (id: string) => `/performance/cycles/detail?id=${id}`,
  kpiItems: '/performance/kpi-items',
  sheets: '/performance/sheets',
  sheetDetail: (id: string) => `/performance/sheets/detail?id=${id}`,
  approvals: '/performance/approvals',
  objections: '/performance/objections',
  reports: '/performance/reports',
};

export type PerfRole =
  | 'ROLE_HR_MANAGER'
  | 'ROLE_HR_STAFF'
  | 'ROLE_DEPT_MANAGER'
  | 'ROLE_EMPLOYEE'
  | 'ROLE_SUPER_ADMIN';

export interface PerfActor {
  employeeId: string;
  name: string;
  nik: string;
  role: PerfRole;
}

export const ROLE_LABEL: Record<PerfRole, string> = {
  ROLE_HR_MANAGER: 'HR Manager',
  ROLE_HR_STAFF: 'HR Staff',
  ROLE_DEPT_MANAGER: 'Dept Manager',
  ROLE_EMPLOYEE: 'Employee',
  ROLE_SUPER_ADMIN: 'Super Admin',
};

/** Objek audit yang diisi backend dari token (UIC §1.2). */
export interface AuditActor {
  employeeId: string;
  nama: string;
  nik: string;
  timezone: string;
}

// ---------- Menu 1 — Siklus & Setelan ----------

export type PeriodPhase = 'FILLING' | 'SIGNING' | 'CLOSED';

export const PHASE_LABEL: Record<PeriodPhase, string> = {
  FILLING: 'Filling',
  SIGNING: 'Signing',
  CLOSED: 'Closed',
};

export interface ReviewPeriod {
  id: string;
  periodName: string;
  phase: PeriodPhase;
  assessmentStructureId: string;
  /** Diresolusi hidup saat baca — nama boleh berubah, penunjuknya beku. */
  assessmentStructureNameSnapshot: string;
  scaleLength: number;
  closedAt: string | null;
  closedAtTimezone: string | null;
  createdBy: AuditActor;
  createdAt: string;
  updatedBy: AuditActor | null;
  updatedAt: string | null;
}

export interface PeriodSearch {
  phase?: PeriodPhase[];
  page: number;
  size: number;
  sortBy?: 'created_at' | 'period_name' | 'phase';
  sortDirection?: 'ASC' | 'DESC';
}

export type NotAssessableReason = 'NO_ASSESSOR_IN_STRUCTURE';
export type OutOfAssessmentReason = 'APPROVER_CHAIN_EXHAUSTED' | 'NOT_INCLUDED_MID_PERIOD';

export interface EligibilityEntry<R extends string> {
  employeeId: string;
  employeeNameSnapshot: string;
  reason: R;
}

export interface EligibilityGaps {
  assessmentStructureId: string;
  notAssessable: EligibilityEntry<NotAssessableReason>[];
  outOfAssessment: EligibilityEntry<OutOfAssessmentReason>[];
}

export interface EligibilitySummary {
  notAssessableCount: number;
  outOfAssessmentCount: number;
}

export const ELIGIBILITY_REASON_LABEL: Record<NotAssessableReason | OutOfAssessmentReason, string> = {
  NO_ASSESSOR_IN_STRUCTURE: 'Belum punya penilai di struktur',
  APPROVER_CHAIN_EXHAUSTED: 'Rantai penyetuju habis (puncak struktur)',
  NOT_INCLUDED_MID_PERIOD: 'Bergabung setelah periode dibuka',
};

// ---------- Menu 2 — Daftar Induk & Bobot ----------

export type TargetType = 'NUMERIC' | 'NARRATIVE';

export const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  NUMERIC: 'Numeric',
  NARRATIVE: 'Narrative',
};

/** Audit ringkas `{id, name}` — bentuk lokal Menu 2 (UIC §3). */
export interface ShortActor {
  id: string;
  name: string;
}

export interface KpiItem {
  id: string;
  itemName: string;
  jobGradeId: string;
  /** Salinan nama saat baris terakhir ditetapkan golongannya — bukan cermin hidup. */
  jobGradeNameSnapshot: string;
  targetType: TargetType;
  /** `numeric(6,2)` — angka positif bebas, tidak wajib berjumlah 100. */
  rawWeight: number;
  isActive: boolean;
  createdBy: ShortActor;
  createdAt: string;
  updatedBy: ShortActor | null;
  updatedAt: string | null;
}

/** `P2.04` — satu-satunya bentuk yang membawa `used_in_sheet_count` (dihitung live). */
export interface KpiItemDetail extends KpiItem {
  usedInSheetCount: number;
}

export interface KpiSearch {
  jobGradeId?: string;
  targetType?: TargetType;
  isActive?: boolean;
  page: number;
  size: number;
  sortBy?: 'created_at' | 'job_grade_id' | 'is_active';
  sortDirection?: 'ASC' | 'DESC';
}

export interface KpiDraft {
  itemName: string;
  jobGradeId: string;
  targetType: TargetType;
  rawWeight: number;
  isActive: boolean;
}

export interface JobGradeOption {
  id: string;
  name: string;
}

// ---------- Menu 3 — Lembar Penilaian ----------

export type SheetStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RETURNED_TO_ASSESSOR' | 'APPROVED' | 'REJECTED_FINAL';

export const SHEET_STATUS_LABEL: Record<SheetStatus, string> = {
  IN_PROGRESS: 'Sedang diisi',
  PENDING_APPROVAL: 'Menunggu persetujuan',
  RETURNED_TO_ASSESSOR: 'Dikembalikan',
  APPROVED: 'Disetujui',
  REJECTED_FINAL: 'Ditolak final',
};

/** Status yang masih boleh diisi/disesuaikan atasan dan diajukan (UIC `P3.14`, `P4.01`). */
export const SHEET_EDITABLE: SheetStatus[] = ['IN_PROGRESS', 'RETURNED_TO_ASSESSOR'];

export type ItemOrigin = 'MASTER' | 'ADDITIONAL';

export const ORIGIN_LABEL: Record<ItemOrigin, string> = {
  MASTER: 'Master',
  ADDITIONAL: 'Tambahan',
};

/** Satu baris grid `P3.02`. */
export interface SheetRow {
  id: string;
  employeeId: string;
  employeeNameDisplay: string;
  reviewPeriodId: string;
  status: SheetStatus;
  assessorId: string;
  hasRevision: boolean;
}

/**
 * Baris nilai `P3.03`. `initialValue`/`submittedValue` tidak pernah dikirim ke karyawan (G5) —
 * yang tersisa hanya stempel waktu pengisian nilai awal, cukup untuk mengunci isian diri.
 */
export interface SheetItem {
  id: string;
  origin: ItemOrigin;
  itemNameSnapshot: string;
  targetTypeSnapshot: TargetType;
  rawWeight: number;
  /** NULL sampai lembar diajukan; ditulis sekali saat submit. */
  frozenWeightRatio: number | null;
  target: string;
  employeeReadAt: string | null;
  employeeReadResetCount: number;
  employeeObjectionNote: string | null;
  initialValueRecordedAt: string | null;
  initialValue?: string | null;
  submittedValue?: string | null;
}

export interface SheetDetail extends SheetRow {
  processInstanceId: string | null;
  selfAssessmentFilled: boolean;
  supervisorTransferred: boolean;
  items: SheetItem[];
}

export type SheetScope = 'ASSESSOR' | 'ALL';

export interface SheetSearch {
  reviewPeriodId?: string;
  dataScope: SheetScope;
  page: number;
  size: number;
  sortBy?: 'created_at' | 'review_period_id' | 'status';
  sortDirection?: 'ASC' | 'DESC';
}

export interface SelfAssessment {
  content: string;
  submittedAt: string;
}

export interface SupervisorHistoryRow {
  supervisorEmployeeId: string;
  supervisorNameDisplay: string;
  validFrom: string;
  validUntil: string | null;
  handoverNote: string | null;
}

export type ItemDraft =
  | { origin: 'MASTER'; masterItemId: string; target: string }
  | { origin: 'ADDITIONAL'; itemNameSnapshot: string; targetTypeSnapshot: TargetType; rawWeight: number; target: string };

export interface ItemPatch {
  target?: string;
  rawWeight?: number;
}

// ---------- Menu 4 — Persetujuan Nilai ----------

export type RoundOutcome = 'APPROVED' | 'RETURNED' | 'REJECTED_FINAL';

export interface NamedEmployee {
  employeeId: string;
  name: string;
}

export interface ApprovalRound {
  id: string;
  cycleNo: number;
  roundNo: number;
  approver: NamedEmployee;
  outcome: RoundOutcome | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export const OUTCOME_LABEL: Record<RoundOutcome, string> = {
  APPROVED: 'Disetujui',
  RETURNED: 'Dikembalikan',
  REJECTED_FINAL: 'Ditolak final',
};

/** Dikutip dari Menu 6 (`PF-25`) — layar persetujuan hanya menampilkan, tidak menghitung. */
export interface ScoreDistribution {
  ratedCount: number;
  totalCount: number;
  averageScore: number | null;
}

/** Satu baris `P4.04` — identitas penyetuju dari token, nol parameter identitas. */
export interface PendingApproval {
  approvalRoundId: string;
  reviewSheetId: string;
  employee: NamedEmployee;
  cycleNo: number;
  roundNo: number;
  assessorScoreDistribution: ScoreDistribution;
  submittedAt: string;
}

export interface DecisionDraft {
  decision: RoundOutcome;
  decisionReason?: string;
}

/** Respons `202` `P4.02` — outcome & status lembar BELUM berubah (pola `K9`). */
export interface DecisionForwarded {
  status: 'FORWARDED';
  message: string;
}

// ---------- Menu 5 — Sanggahan ----------

export type ObjectionSubject = 'VALUE' | 'REJECTED_FINAL';
export type ObjectionStatus = 'SUBMITTED' | 'ANSWERED';
/** Klasifikasi pemikul kewajiban menjawab — perpindahannya job latar (`PF-42`), nol layar. */
export type HolderContext = 'PENILAI_ASLI' | 'NAIK_RANTAI' | 'PENADAH_HR';

export const SUBJECT_LABEL: Record<ObjectionSubject, string> = {
  VALUE: 'Nilai disahkan',
  REJECTED_FINAL: 'Tolak final',
};

export const OBJECTION_STATUS_LABEL: Record<ObjectionStatus, string> = {
  SUBMITTED: 'Belum dijawab',
  ANSWERED: 'Dijawab',
};

export const HOLDER_CONTEXT_LABEL: Record<HolderContext, string> = {
  PENILAI_ASLI: 'Pemikul pertama',
  NAIK_RANTAI: 'Naik rantai',
  PENADAH_HR: 'Penadah HR',
};

export interface ObjectionHolder {
  holderEmployeeId: string;
  holderContext: HolderContext | null;
  assignedAt: string | null;
}

export interface ObjectionAnswer {
  answeredByEmployeeId: string;
  answerText: string;
  answeredAt: string;
}

/** Baris grid `P5.03`/`P5.04`. */
export interface ObjectionRow {
  id: string;
  reviewSheetId: string;
  subjectType: ObjectionSubject;
  status: ObjectionStatus;
  submittedByEmployeeId: string;
  submittedAt: string;
  currentHolder: ObjectionHolder;
}

export interface ObjectionDetail extends ObjectionRow {
  approvalRoundId: string | null;
  viaReopenWindowId: string | null;
  submissionNote: string;
  answer: ObjectionAnswer | null;
}

export interface ObjectionDraft {
  reviewSheetId: string;
  subjectType: ObjectionSubject;
  approvalRoundId?: string;
  submissionNote: string;
}

export interface ObjectionSearch {
  status?: ObjectionStatus;
  /** Diabaikan server untuk DM (dipaksa = pemanggil); HR boleh kosong = company-wide. */
  holderEmployeeId?: string;
  page: number;
  size: number;
  sortBy?: 'submitted_at' | 'status';
  sortDirection?: 'ASC' | 'DESC';
}

export interface ReopenWindow {
  id: string;
  reviewSheetId: string;
  openedByEmployeeId: string;
  reason: string | null;
  openedAt: string;
  newDeadlineAt: string;
}

// ---------- Menu 6 — Papan Pantau & Laporan ----------

export type SignalGroupKey = 'ATTENDANCE' | 'OVERTIME' | 'TRANSITION' | 'PRODUCTIVITY' | 'PENDING_DECISION' | 'REPRIMAND';

export const SIGNAL_GROUP_LABEL: Record<SignalGroupKey, string> = {
  ATTENDANCE: 'Kehadiran',
  OVERTIME: 'Lembur',
  TRANSITION: 'Perpindahan',
  PRODUCTIVITY: 'Ketepatan tugas',
  PENDING_DECISION: 'Keputusan tertunda',
  REPRIMAND: 'Teguran berjalan',
};

/** Empat bentuk kosong (§4.7.1.1) — "tanpa kunci" (0 dari N) adalah `null` dengan rekap terisi. */
export type SignalEmptyState = 'NOT_AVAILABLE' | 'NO_TASK_ASSIGNED' | 'NO_RECORD';

export interface SignalGroup {
  groupKey: SignalGroupKey;
  /** Kolom rekap apa adanya dari `signal_recap` — nama kolom kontrak, nilai hitungan murni. */
  recap: Record<string, number> | null;
  details: Record<string, string | number | boolean>[];
  emptyState: SignalEmptyState | null;
}

export interface SignalBoard {
  reviewPeriodId: string;
  reviewPeriodName: string;
  reviewPeriodPhase: PeriodPhase;
  employeeId: string;
  groups: SignalGroup[];
  reprimandDisclaimer: string;
  computedAt: string;
}

export interface SnapshotRow {
  snapshotId: string;
  reviewSheetId: string;
  revisionNo: number;
  approvedAt: string;
  jobGradeNameSnapshot?: string;
  employeeName?: string;
}

export interface ReprimandState {
  state: string;
  standingLevel: string;
  activePoints: number;
  policyVersionId?: string;
}

/** `PL-05` — empat field BEKU + dua field HIDUP yang menempel, tidak disalin. */
export interface SnapshotDetail {
  snapshotId: string;
  reviewSheetId: string;
  revisionNo: number;
  employeeId: string;
  jobGradeNameSnapshot: string;
  scaleLength: number;
  objectionDeadlineDaysFrozen: number;
  reprimandStateSnapshot: ReprimandState | null;
  approvedAt: string;
  approvedAtTimezone: string;
  objectionSummary: { status: ObjectionStatus; objectionId: string } | null;
  currentIncidentRecapAvailable: boolean;
}

export type ReportKey =
  | 'task-distribution'
  | 'kpi-item-target-type-mix'
  | 'kpi-item-inactive'
  | 'additional-item-ratio'
  | 'not-yet-assessable'
  | 'excluded-from-assessment'
  | 'blank-input-ratio'
  | 'pending-objections';

export interface TaskDistributionRow {
  supervisorEmployeeId: string;
  subordinates: { employeeId: string; employeeName: string; assignedTaskCount: number | null }[];
}
export interface TargetMixRow {
  jobGradeNameSnapshot: string;
  numericCount: number;
  narrativeCount: number;
}
export interface InactiveKpiRow {
  jobGradeNameSnapshot: string;
  isActive: boolean;
}
export interface AdditionalRatioRow {
  supervisorEmployeeId: string;
  additionalWeightRatio: number;
  maxRatioThreshold: number;
}
export interface ReasonRow {
  employeeId: string;
  employeeName: string;
  reason: NotAssessableReason | OutOfAssessmentReason;
}
export interface BlankInputRow {
  supervisorEmployeeId: string;
  blankSelfAssessmentRatio: number;
  unreadItemRatio: number;
}
export interface PendingObjectionRow {
  objectionId: string;
  currentHolderEmployeeId: string;
  currentHolderContext: HolderContext;
  daysSinceSubmitted: number;
}

export interface AccessLogRow {
  id: string;
  readerEmployeeId: string;
  subjectEmployeeId: string;
  createdBy: { employeeId: string; name: string; role: string };
  createdAt: string;
  activity: 'I';
}

export interface AccessLogSearch {
  subjectEmployeeId?: string;
  readerEmployeeId?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  size: number;
}

/** Respons `200` `P4.01` — instans alur kerja sudah terisi karena dimulai sinkron. */
export interface SubmitResult {
  reviewSheetId: string;
  status: SheetStatus;
  approvalRoundId: string;
  cycleNo: number;
  roundNo: number;
  workflowProcessInstanceId: string;
  approver: NamedEmployee;
}
