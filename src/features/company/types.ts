/**
 * Settings › Company — kontrak FSD-001-COMPANY-0.9 §1–§6 · UIC-001-COMPANY-0.9 §2 ·
 * TSD-001-COMPANY-0.10 · ERD-001-COMPANY-0.5.
 *
 * Enam menu master data: Branch (+ Branch Group), Group Structure (Group/Level/Position),
 * Grade & Class, Cost Center (+ Category), SBU (+ Group), dan Vendor.
 */

/** Mode Company Setup yang mengendalikan tampilnya sebagian menu dan elemen. */
export type SetupMode = 'ENABLED' | 'DISABLED';

export interface CompanySetup {
  branchHierarchyMode: SetupMode;
  costCenterAssignmentMode: SetupMode;
  sbuAssignmentMode: SetupMode;
}

/** Snapshot `{zip, timezone}`; provinsi dan kota diturunkan darinya, bukan kolom sendiri. */
export interface ZipSnapshot {
  zip: string;
  timezone: string;
}

/** Snapshot identitas lintas service — disimpan apa adanya saat baris dibuat. */
export interface PersonSnapshot {
  employeeId: string;
  nama: string;
  nik: string;
}

/** `cnf_branch_group_struct` — kategori cabang, hanya saat hierarki menyala. */
export interface BranchGroup {
  id: string;
  name: string;
  levelOrder: number;
  canViewChildData: boolean;
  isActive: boolean;
  createdAt: string;
}

/** `mst_branch`. */
export interface Branch {
  id: string;
  branchName: string;
  /** Unik antar cabang aktif, dan tidak bisa diubah setelah dibuat. */
  branchCode: string;
  branchGroupId: string;
  parentId: string | null;
  /** Snapshot nama cabang induk saat baris dibuat. */
  parentInfo: { branchId: string; branchName: string } | null;
  address: string;
  phone: string;
  zip: ZipSnapshot;
  regionalWage: number;
  workDaysPerWeek: number;
  workHoursPerDay: number;
  lateToleranceMinutes: number;
  latitude: number | null;
  longitude: number | null;
  employeeCount: number;
  createdAt: string;
}

export interface BranchDraft {
  branchName: string;
  branchCode: string;
  branchGroupId: string;
  parentId: string;
  address: string;
  phone: string;
  zip: string;
  regionalWage: string;
  workDaysPerWeek: string;
  workHoursPerDay: string;
  lateToleranceMinutes: string;
  latitude: string;
  longitude: string;
}

export interface BranchGroupDraft {
  name: string;
  levelOrder: string;
  canViewChildData: boolean;
}

/** `cnf_group_struct_main` — satu struktur boleh menjadi holding area bawaan. */
export interface GroupStruct {
  id: string;
  name: string;
  isDefault: boolean;
  finalApproverInfo: PersonSnapshot | null;
  createdAt: string;
}

/** `cnf_group_struct_level`. */
export interface GroupLevel {
  id: string;
  groupStructId: string;
  levelName: string;
  levelOrder: number;
  createdAt: string;
}

/**
 * `cnf_group_struct_pos` — rantai persetujuan antar posisi.
 *
 * `parentId` menunjuk **posisi**, bukan karyawan; karyawan hanya pengisi, dan posisi tanpa
 * pengisi berstatus lowong.
 */
export interface GroupPosition {
  id: string;
  positionName: string;
  groupStructLevelId: string;
  employeeId: string | null;
  employeeInfo: PersonSnapshot | null;
  parentId: string | null;
  supervisorInfo: PersonSnapshot | null;
  createdAt: string;
}

/** `log_group_struct_pos` — jejak otomatis setiap perubahan posisi. */
export type PositionActivity = 'I' | 'U' | 'D';

export interface PositionLog {
  id: string;
  positionId: string;
  positionName: string;
  activity: PositionActivity;
  note: string;
  createdBy: string;
  createdAt: string;
}

/** `mst_job_grade` — self-ref dua tingkat: Grade di atas, Class di bawahnya. */
export interface JobGrade {
  id: string;
  name: string;
  gradeCode: string;
  parentId: string | null;
  salaryRangeFrom: number | null;
  salaryRangeTo: number | null;
  createdAt: string;
}

export interface JobGradeDraft {
  name: string;
  gradeCode: string;
  parentId: string;
  salaryRangeFrom: string;
  salaryRangeTo: string;
}

export interface CostCenterCategory {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

/** `mst_cost_center` — `code` unik antar baris aktif dan tidak bisa diubah. */
export interface CostCenter {
  id: string;
  code: string;
  name: string;
  costCenterCategoryId: string;
  parentId: string | null;
  responsibleEmployeeId: string | null;
  annualBudget: number | null;
  createdAt: string;
}

export interface CostCenterDraft {
  code: string;
  name: string;
  costCenterCategoryId: string;
  parentId: string;
  responsibleEmployeeId: string;
  annualBudget: string;
}

export interface SbuGroup {
  id: string;
  name: string;
  createdAt: string;
}

export interface Sbu {
  id: string;
  code: string;
  name: string;
  sbuGroupId: string;
  parentId: string | null;
  responsibleEmployeeId: string | null;
  createdAt: string;
}

export interface SbuDraft {
  code: string;
  name: string;
  sbuGroupId: string;
  parentId: string;
  responsibleEmployeeId: string;
}

/** Klasifikasi vendor dan jabatan PIC — dua daftar tertutup. */
export type VendorType = 'COMPANY' | 'INDIVIDUAL' | 'GOVERNMENT' | 'FOUNDATION';
export type PicPosition = 'SALES' | 'OWNER' | 'MANAGER' | 'STAFF' | 'OTHER';

/** `mst_vendor` — kontak vendor hanya telepon dan alamat; kontrak tidak punya kolom surel. */
export interface Vendor {
  id: string;
  vendorName: string;
  address: string;
  phone: string;
  telephone: string | null;
  vendorType: VendorType;
  picName: string | null;
  picPosition: PicPosition | null;
  isActive: boolean;
  createdAt: string;
}

export interface VendorDraft {
  vendorName: string;
  address: string;
  phone: string;
  telephone: string;
  vendorType: VendorType;
  picName: string;
  picPosition: PicPosition | '';
}

export const VENDOR_TYPES: VendorType[] = ['COMPANY', 'INDIVIDUAL', 'GOVERNMENT', 'FOUNDATION'];
export const PIC_POSITIONS: PicPosition[] = ['SALES', 'OWNER', 'MANAGER', 'STAFF', 'OTHER'];

export const VENDOR_TYPE_LABEL: Record<VendorType, string> = {
  COMPANY: 'Perusahaan',
  INDIVIDUAL: 'Perorangan',
  GOVERNMENT: 'Instansi pemerintah',
  FOUNDATION: 'Yayasan',
};

export const PIC_POSITION_LABEL: Record<PicPosition, string> = {
  SALES: 'Sales',
  OWNER: 'Pemilik',
  MANAGER: 'Manajer',
  STAFF: 'Staf',
  OTHER: 'Lainnya',
};

export const ACTIVITY_LABEL: Record<PositionActivity, string> = {
  I: 'Dibuat',
  U: 'Diubah',
  D: 'Dihapus',
};

/** Field yang muncul di rancangan layar tetapi belum punya kolom penyimpan (GAP). */
export const BRANCH_GAP_FIELDS = ['FAX', 'Tanda tangan / logo', 'Pajak (NPWP, NITKU, KLU)', 'Radius absensi mobile'];
