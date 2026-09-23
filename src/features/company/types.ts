/**
 * Settings › Company — kontrak FSD-001-COMPANY-0.32 §1–§6 · UIC-001-COMPANY-0.22 §2 ·
 * TSD-001-COMPANY-0.39 · ERD-001-COMPANY-0.21 (audit 23 September 2026 — repo sebelumnya
 * memakai 0.9/0.9; lihat `docs/CONTRACT-AUDIT.md` §8/§9 untuk delta yang belum dikerjakan,
 * mis. GS-11 Pemetaan Modul→Struktur dan `can_sign_letter` di Group Structure).
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

/**
 * Snapshot `{zip, timezone, province, city}` — sejak `PROB-SERVICE-787` (ERD 0.47/UIC 0.11),
 * `province`/`city` adalah kunci snapshot sendiri yang dibekukan saat baris dibuat, BUKAN lagi
 * diturunkan dari `zip` setiap kali dibaca.
 */
export interface ZipSnapshot {
  zip: string;
  timezone: string;
  province: string;
  city: string;
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
  /** `RESOLVED PROB-FRONTEND-001` (ERD 0.3/0.8) — dipakai payroll/pajak, bukan lagi GAP. */
  taxNpwp: string | null;
  taxNitku: string | null;
  taxKlu: string | null;
  /** `RESOLVED PROB-FRONTEND-001` — radius (meter) toleransi lokasi absen; null = tak dibatasi. */
  attendanceRadius: number | null;
  attendanceOnMobile: boolean;
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
  taxNpwp: string;
  taxNitku: string;
  taxKlu: string;
  attendanceRadius: string;
  attendanceOnMobile: boolean;
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

/**
 * Peran yang dipakai gerbang Group Structure — `ROLE_SUPER_ADMIN`/`ROLE_SYSTEM_ADMIN` adalah
 * satu-satunya peran yang boleh menulis Pemetaan Modul dan `can_sign_letter` (UIC §2.3.1/§2.3.2).
 */
export type CompanyRole = 'ROLE_SUPER_ADMIN' | 'ROLE_SYSTEM_ADMIN' | 'ROLE_HR_MANAGER' | 'ROLE_DEPARTMENT_MANAGER' | 'ROLE_GA_STAFF';

export interface CompanyActor {
  employeeId: string;
  label: string;
  role: CompanyRole;
}

/** `module_code` — daftar TERTUTUP enam nilai (`ck_cnf_module_group_struct_map_module_code`). */
export type ModuleCode = 'TIME' | 'FINANCE' | 'PERFORMANCE' | 'PRODUCTIVITY' | 'DOCUMENT' | 'EMPLOYEE';
export const MODULE_CODES: ModuleCode[] = ['TIME', 'FINANCE', 'PERFORMANCE', 'PRODUCTIVITY', 'DOCUMENT', 'EMPLOYEE'];
export const MODULE_CODE_LABEL: Record<ModuleCode, string> = {
  TIME: 'Time',
  FINANCE: 'Finance',
  PERFORMANCE: 'Performance',
  PRODUCTIVITY: 'Productivity',
  DOCUMENT: 'Document',
  EMPLOYEE: 'Employee',
};

/**
 * `cnf_module_group_struct_map` — GS-11, menjawab "struktur mana yang memerintah modul ini".
 * Hanya jadi pemutus saat perusahaan punya >1 struktur aktif; baris kosong = struktur tunggal
 * dipakai untuk semua modul (mandatory damper). Balasan array FLAT — bukan amplop grid.
 */
export interface ModuleGroupStructMap {
  id: string;
  moduleCode: ModuleCode;
  groupStructId: string;
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
  /**
   * `RESOLVED PROB-SERVICE-351` — kewenangan menandatangani surat resmi, melekat pada posisi.
   * `false→true` butuh dua tangan (`second_approver_employee_id` wajib, tidak dipersistenkan —
   * murni penegak orang-kedua saat panggilan itu); `true→false` cukup satu tangan.
   */
  canSignLetter: boolean;
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

/**
 * `mst_job_grade` — self-ref dua tingkat: Grade di atas, Class di bawahnya.
 *
 * `gradeCode` **bukan input klien sejak `T49`** (TSD-COMPANY §7.3/§7.4, ERD §7.7.1) — server
 * men-generate `<level>.<huruf>` (level = kedalaman, root = 1; huruf = peringkat `sortOrder`
 * ASC basis-26 A…Z, AA…) dan menghitungnya ulang untuk SELURUH baris sesama induk tiap kali ada
 * baris dibuat/dipindah induk/diurutkan ulang/dihapus. Duplikat lintas subtree (mis. dua baris
 * `2.A` pada dua Grade berbeda) memang disengaja, bukan bug.
 */
export interface JobGrade {
  id: string;
  name: string;
  gradeCode: string;
  parentId: string | null;
  /** Peringkat di antara saudara sekandung (sesama `parentId`); unik per grup itu. */
  sortOrder: number;
  salaryRangeFrom: number | null;
  salaryRangeTo: number | null;
  createdAt: string;
}

export interface JobGradeDraft {
  name: string;
  parentId: string;
  sortOrder: string;
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

/** `mst_vendor` — `email` `RESOLVED PROB-FRONTEND-001` (ERD 0.3/0.8), opsional, varchar(254). */
export interface Vendor {
  id: string;
  vendorName: string;
  address: string;
  phone: string;
  telephone: string | null;
  email: string | null;
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
  email: string;
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

/**
 * Field Branch yang tetap tanpa kolom penyimpan (GAP) — audit 23 September 2026 (ERD 0.21 §5.6).
 * Tax (NPWP/NITKU/KLU) dan Attendance Radius/Mobile sudah RESOLVED sejak `0.3`, jadi tidak lagi
 * GAP. Tanda tangan/logo bukan lagi konsep milik Branch sama sekali — logo kini satu per
 * perusahaan (Auth/Company Setup) dan tanda tangan surat diresolusi dari pemegang posisi
 * ber-`can_sign_letter` di Group Structure (§7.3 ERD), bukan gambar milik cabang.
 */
export const BRANCH_GAP_FIELDS = ['FAX'];
