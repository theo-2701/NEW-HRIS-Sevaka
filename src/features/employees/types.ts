/**
 * Kontrak modul Employee Directory — FSD-001 §1 · UIC-001 §2.
 * Layar ini READ-ONLY: tidak ada mutasi data.
 */

/** Enam nilai `employment_status` di kontrak. */
export type EmploymentStatus =
  | 'WAITING'
  | 'ACTIVE'
  | 'OFFBOARDING'
  | 'SUSPENDED'
  | 'RESIGNED'
  | 'TERMINATED';

/** Empat nilai `work_arrangement` di kontrak. */
export type WorkArrangement = 'WFO' | 'WFH' | 'HYBRID' | 'MOBILE';

/**
 * Cakupan data aktor (granular scope `employee:directory:read`).
 * Menentukan masking: hanya HR yang melihat NIK penuh.
 */
export type ActorScope = 'HR' | 'DEPT' | 'SELF';

/** Baris grid — mengikuti DTO respons search (UIC §2.1). */
export interface EmployeeRow {
  id: string;
  nik: string;
  /** GAP PROB-FRONTEND-002: proyeksi join dari auth-service, bukan kolom employee. */
  name: string;
  employmentStatus: EmploymentStatus;
  workArrangement: WorkArrangement;
  branchId: string;
  /** GAP PROB-FRONTEND-002: proyeksi join dari company-service. */
  branchName: string;
  position: string;
  createdAt: string;
}

export interface EmployeeBankAccount {
  bankCode: string;
  accountNumber: string;
  accountHolderName: string;
}

/** Profil gabungan `GET /employees/{id}` — work data + bank + proyeksi identitas. */
export interface EmployeeDetail extends EmployeeRow {
  /** `contract_end_date` NULL ⇒ karyawan tetap. */
  contractEndDate: string | null;
  costCenter: string;
  sbu: string;
  /** Proyeksi rantai atasan via company-service. */
  supervisor: string | null;
  jobGrade: string;
  formalPosition: string;
  joinDate: string;
  /** NULL ⇒ masih bekerja. */
  leaveDate: string | null;
  bank: EmployeeBankAccount;
  email: string;
  phone: string;
}

/** Body `POST /employees/search` (search berkriteria, bukan query-string). */
export interface EmployeeSearchCriteria {
  keyword: string;
  branchId: string;
  /** `created_at` — batas bawah & atas (format ISO `yyyy-mm-dd`). */
  createdFrom: string;
  createdTo: string;
  /** Operator IN — multi pilih. */
  employmentStatus: EmploymentStatus[];
}

export type SortDirection = 'ASC' | 'DESC';

export interface EmployeeSearchRequest extends EmployeeSearchCriteria {
  page: number;
  size: number;
  sortBy: string;
  sortDir: SortDirection;
}

export interface EmployeeSearchResponse {
  rows: EmployeeRow[];
  total: number;
}

export const EMPTY_CRITERIA: EmployeeSearchCriteria = {
  keyword: '',
  branchId: '',
  createdFrom: '',
  createdTo: '',
  employmentStatus: [],
};

export const EMPLOYMENT_STATUS_LABEL: Record<EmploymentStatus, string> = {
  WAITING: 'Waiting',
  ACTIVE: 'Active',
  OFFBOARDING: 'Offboarding',
  SUSPENDED: 'Suspended',
  RESIGNED: 'Resigned',
  TERMINATED: 'Terminated',
};

export const EMPLOYMENT_STATUS_ORDER: EmploymentStatus[] = [
  'WAITING',
  'ACTIVE',
  'OFFBOARDING',
  'SUSPENDED',
  'RESIGNED',
  'TERMINATED',
];

/** Daftar unit/cabang — sementara statis, nantinya dari company-service. */
export const BRANCHES: { id: string; name: string }[] = [
  { id: 'br-papua', name: 'BR-Papua' },
  { id: 'br-jkt', name: 'HO-Jakarta' },
  { id: 'br-sby', name: 'BR-Surabaya' },
  { id: 'br-bdg', name: 'BR-Bandung' },
];
