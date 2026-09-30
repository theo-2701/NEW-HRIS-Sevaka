/** Performance Management (FSD-001-PERFORMANCE 0.11 · UIC-001-PERFORMANCE 0.12). */

export const PERF_PATHS = {
  cycles: '/performance/cycles',
  cycleDetail: (id: string) => `/performance/cycles/detail?id=${id}`,
  kpiItems: '/performance/kpi-items',
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
