import type {
  Branch,
  BranchGroup,
  CompanyActor,
  CompanySetup,
  CostCenter,
  CostCenterCategory,
  GroupLevel,
  GroupPosition,
  GroupStruct,
  JobGrade,
  ModuleGroupStructMap,
  PositionLog,
  Sbu,
  SbuGroup,
  Vendor,
} from '@/features/company/types';

/** Dataset contoh Settings › Company — nama dan kode mengikuti contoh di kontrak. */

const at = (date: string, time = '10:00') => `${date}T${time}:00+07:00`;

export const SETUP_SEED: CompanySetup = {
  branchHierarchyMode: 'ENABLED',
  costCenterAssignmentMode: 'ENABLED',
  sbuAssignmentMode: 'ENABLED',
};

/** Kode pos → provinsi, kota, zona waktu. Di server ini snapshot, bukan kolom tersendiri. */
export const ZIP_BOOK: Record<string, { province: string; city: string; timezone: string }> = {
  '40111': { province: 'Jawa Barat', city: 'Bandung', timezone: 'Asia/Jakarta' },
  '40115': { province: 'Jawa Barat', city: 'Bandung', timezone: 'Asia/Jakarta' },
  '10110': { province: 'DKI Jakarta', city: 'Jakarta Pusat', timezone: 'Asia/Jakarta' },
  '50131': { province: 'Jawa Tengah', city: 'Semarang', timezone: 'Asia/Jakarta' },
  '80228': { province: 'Bali', city: 'Denpasar', timezone: 'Asia/Makassar' },
};

export const BRANCH_GROUP_SEED: BranchGroup[] = [
  { id: 'bg-hq', name: 'Kantor Pusat', levelOrder: 1, canViewChildData: true, isActive: true, createdAt: at('2026-01-05') },
  { id: 'bg-regional', name: 'Regional', levelOrder: 2, canViewChildData: true, isActive: true, createdAt: at('2026-01-05') },
  { id: 'bg-cabang', name: 'Cabang', levelOrder: 3, canViewChildData: false, isActive: true, createdAt: at('2026-01-05') },
];

export const BRANCH_SEED: Branch[] = [
  {
    id: 'br-jkt',
    branchName: 'Kantor Pusat Jakarta',
    branchCode: 'BR-JKT-01',
    branchGroupId: 'bg-hq',
    parentId: null,
    parentInfo: null,
    address: 'Jl. Jenderal Sudirman No. 1',
    phone: '+62215551000',
    zip: { zip: '10110', timezone: 'Asia/Jakarta', province: 'DKI Jakarta', city: 'Jakarta Pusat' },
    regionalWage: 5396761,
    workDaysPerWeek: 5,
    workHoursPerDay: 8,
    lateToleranceMinutes: 15,
    latitude: -6.2,
    longitude: 106.82,
    taxNpwp: '01.234.567.8-901.000',
    taxNitku: '0012345678901000',
    taxKlu: '70209',
    attendanceRadius: 100,
    attendanceOnMobile: true,
    employeeCount: 18,
    createdAt: at('2026-01-06'),
  },
  {
    id: 'br-bdg',
    branchName: 'Cabang Bandung',
    branchCode: 'BR-BDG-01',
    branchGroupId: 'bg-regional',
    parentId: 'br-jkt',
    parentInfo: { branchId: 'br-jkt', branchName: 'Kantor Pusat Jakarta' },
    address: 'Jl. Merdeka No. 1',
    phone: '+62221234567',
    zip: { zip: '40111', timezone: 'Asia/Jakarta', province: 'Jawa Barat', city: 'Bandung' },
    regionalWage: 4209309,
    workDaysPerWeek: 5,
    workHoursPerDay: 8,
    lateToleranceMinutes: 15,
    latitude: -6.9,
    longitude: 107.6,
    taxNpwp: '02.345.678.9-012.000',
    taxNitku: null,
    taxKlu: '70209',
    attendanceRadius: 150,
    attendanceOnMobile: false,
    employeeCount: 9,
    createdAt: at('2026-01-08'),
  },
  {
    id: 'br-smg',
    branchName: 'Cabang Semarang',
    branchCode: 'BR-SMG-01',
    branchGroupId: 'bg-cabang',
    parentId: 'br-jkt',
    parentInfo: { branchId: 'br-jkt', branchName: 'Kantor Pusat Jakarta' },
    address: 'Jl. Pandanaran No. 20',
    phone: '+62247654321',
    zip: { zip: '50131', timezone: 'Asia/Jakarta', province: 'Jawa Tengah', city: 'Semarang' },
    regionalWage: 3243969,
    workDaysPerWeek: 5,
    workHoursPerDay: 8,
    lateToleranceMinutes: 10,
    latitude: -6.98,
    longitude: 110.41,
    taxNpwp: null,
    taxNitku: null,
    taxKlu: null,
    attendanceRadius: null,
    attendanceOnMobile: false,
    employeeCount: 7,
    createdAt: at('2026-02-02'),
  },
];

export const GROUP_STRUCT_SEED: GroupStruct[] = [
  {
    id: 'gs-main',
    name: 'Struktur Utama',
    isDefault: true,
    finalApproverInfo: { employeeId: 'emp-hesti', nama: 'Hesti Wulandari', nik: 'PTDIKA-0003' },
    isActive: true,
    createdAt: at('2026-01-10'),
  },
  {
    id: 'gs-proyek',
    name: 'Struktur Proyek',
    isDefault: false,
    finalApproverInfo: null,
    isActive: true,
    createdAt: at('2026-03-01'),
  },
];

export const GROUP_LEVEL_SEED: GroupLevel[] = [
  { id: 'lvl-direksi', groupStructId: 'gs-main', levelName: 'Direksi', levelOrder: 1, isActive: true, createdAt: at('2026-01-10') },
  { id: 'lvl-divisi', groupStructId: 'gs-main', levelName: 'Divisi', levelOrder: 2, isActive: true, createdAt: at('2026-01-10') },
  { id: 'lvl-unit', groupStructId: 'gs-main', levelName: 'Unit', levelOrder: 3, isActive: true, createdAt: at('2026-01-10') },
  { id: 'lvl-proyek', groupStructId: 'gs-proyek', levelName: 'Tim Proyek', levelOrder: 1, isActive: true, createdAt: at('2026-03-01') },
];

export const GROUP_POSITION_SEED: GroupPosition[] = [
  {
    id: 'pos-dirut',
    positionName: 'Direktur Utama',
    groupStructLevelId: 'lvl-direksi',
    employeeId: 'emp-hesti',
    employeeInfo: { employeeId: 'emp-hesti', nama: 'Hesti Wulandari', nik: 'PTDIKA-0003' },
    parentId: null,
    supervisorInfo: null,
    canSignLetter: true,
    createdAt: at('2026-01-10'),
  },
  {
    id: 'pos-hr',
    positionName: 'HR Manager',
    groupStructLevelId: 'lvl-divisi',
    employeeId: 'emp-maya',
    employeeInfo: { employeeId: 'emp-maya', nama: 'Maya Anggraini', nik: 'PTDIKA-0002' },
    parentId: 'pos-dirut',
    supervisorInfo: { employeeId: 'emp-hesti', nama: 'Hesti Wulandari', nik: 'PTDIKA-0003' },
    canSignLetter: false,
    createdAt: at('2026-01-10'),
  },
  {
    id: 'pos-payroll',
    positionName: 'Payroll Officer',
    groupStructLevelId: 'lvl-unit',
    employeeId: 'emp-rudi',
    employeeInfo: { employeeId: 'emp-rudi', nama: 'Rudi Hartono', nik: 'PTDIKA-0001' },
    parentId: 'pos-hr',
    supervisorInfo: { employeeId: 'emp-maya', nama: 'Maya Anggraini', nik: 'PTDIKA-0002' },
    canSignLetter: false,
    createdAt: at('2026-01-11'),
  },
  {
    id: 'pos-analis',
    positionName: 'Analis Data',
    groupStructLevelId: 'lvl-unit',
    employeeId: null,
    employeeInfo: null,
    parentId: 'pos-hr',
    supervisorInfo: { employeeId: 'emp-maya', nama: 'Maya Anggraini', nik: 'PTDIKA-0002' },
    canSignLetter: false,
    createdAt: at('2026-04-01'),
  },
];

/**
 * Aktor Group Structure — hanya `ROLE_SUPER_ADMIN`/`ROLE_SYSTEM_ADMIN` boleh menulis GS-11 dan
 * `can_sign_letter` (UIC §2.3.1/§2.3.2); dua lainnya baca-saja untuk mencoba gerbang perannya.
 */
export const COMPANY_VIEWERS: CompanyActor[] = [
  { employeeId: 'emp-hesti', label: 'Hesti Wulandari — Super Admin', role: 'ROLE_SUPER_ADMIN' },
  { employeeId: 'emp-rudi', label: 'Rudi Hartono — System Admin', role: 'ROLE_SYSTEM_ADMIN' },
  { employeeId: 'emp-maya', label: 'Maya Anggraini — HR Manager', role: 'ROLE_HR_MANAGER' },
  { employeeId: 'emp-dimas', label: 'Dimas Pratama — Department Manager', role: 'ROLE_DEPARTMENT_MANAGER' },
];

/** Employee yang bisa jadi Approver Kedua — harus berperan admin (UIC §2.3.2). */
export const COMPANY_ADMIN_EMPLOYEE_IDS = COMPANY_VIEWERS.filter((row) => row.role === 'ROLE_SUPER_ADMIN' || row.role === 'ROLE_SYSTEM_ADMIN').map(
  (row) => row.employeeId,
);

/**
 * GS-11 — `EMPLOYEE`/`TIME`/`FINANCE` sudah dipetakan ke Struktur Utama; sisanya sengaja
 * dikosongkan supaya baris "belum dipetakan" (dropdown kosong) juga terlihat di dummy.
 */
export const MODULE_GROUP_STRUCT_MAP_SEED: ModuleGroupStructMap[] = [
  { id: 'mgs-time', moduleCode: 'TIME', groupStructId: 'gs-main', createdAt: at('2026-09-17') },
  { id: 'mgs-finance', moduleCode: 'FINANCE', groupStructId: 'gs-main', createdAt: at('2026-09-17') },
  { id: 'mgs-employee', moduleCode: 'EMPLOYEE', groupStructId: 'gs-main', createdAt: at('2026-09-17') },
];

export const POSITION_LOG_SEED: PositionLog[] = [
  {
    id: 'log-0001',
    positionId: 'pos-analis',
    positionName: 'Analis Data',
    activity: 'I',
    note: 'Posisi dibuat dalam keadaan lowong.',
    createdBy: 'emp-maya',
    createdAt: at('2026-04-01'),
  },
];

/**
 * `gradeCode` mengikuti bentuk server-generated `<level>.<huruf>` (root level 1, huruf
 * peringkat `sortOrder` ASC) — lihat `computeGradeCode` di `rules.ts`. Duplikat kode lintas
 * subtree (mis. `2.A` pada Staff maupun Manager) memang disengaja kontrak.
 */
export const JOB_GRADE_SEED: JobGrade[] = [
  { id: 'jg-staff', name: 'Staff', gradeCode: '1.A', parentId: null, sortOrder: 1, salaryRangeFrom: null, salaryRangeTo: null, createdAt: at('2026-01-12') },
  { id: 'jg-manager', name: 'Manager', gradeCode: '1.B', parentId: null, sortOrder: 2, salaryRangeFrom: null, salaryRangeTo: null, createdAt: at('2026-01-12') },
  {
    id: 'jg-staff-1',
    name: 'Staff 1',
    gradeCode: '2.A',
    parentId: 'jg-staff',
    sortOrder: 1,
    salaryRangeFrom: 4000000,
    salaryRangeTo: 6000000,
    createdAt: at('2026-01-12'),
  },
  {
    id: 'jg-staff-2',
    name: 'Staff 2',
    gradeCode: '2.B',
    parentId: 'jg-staff',
    sortOrder: 2,
    salaryRangeFrom: 6000000,
    salaryRangeTo: 9000000,
    createdAt: at('2026-01-12'),
  },
  {
    id: 'jg-manager-1',
    name: 'Manager 1',
    gradeCode: '2.A',
    parentId: 'jg-manager',
    sortOrder: 1,
    salaryRangeFrom: 15000000,
    salaryRangeTo: 25000000,
    createdAt: at('2026-01-12'),
  },
];

export const COST_CENTER_CATEGORY_SEED: CostCenterCategory[] = [
  { id: 'ccc-ops', name: 'Operasional', description: 'Biaya operasional rutin', createdAt: at('2026-01-15') },
  { id: 'ccc-adm', name: 'Administrasi', description: 'Biaya kantor dan administrasi', createdAt: at('2026-01-15') },
];

export const COST_CENTER_SEED: CostCenter[] = [
  {
    id: 'cc-ops-01',
    code: 'CC-OPS-01',
    name: 'Operasional Jakarta',
    costCenterCategoryId: 'ccc-ops',
    parentId: null,
    responsibleEmployeeId: 'emp-maya',
    annualBudget: 1200000000,
    createdAt: at('2026-01-16'),
  },
  {
    id: 'cc-ops-02',
    code: 'CC-OPS-02',
    name: 'Operasional Bandung',
    costCenterCategoryId: 'ccc-ops',
    parentId: 'cc-ops-01',
    responsibleEmployeeId: null,
    annualBudget: 450000000,
    createdAt: at('2026-01-16'),
  },
  {
    id: 'cc-adm-01',
    code: 'CC-ADM-01',
    name: 'Administrasi Pusat',
    costCenterCategoryId: 'ccc-adm',
    parentId: null,
    responsibleEmployeeId: 'emp-rudi',
    annualBudget: 300000000,
    createdAt: at('2026-01-16'),
  },
];

export const SBU_GROUP_SEED: SbuGroup[] = [
  { id: 'sg-utama', name: 'Lini Utama', createdAt: at('2026-01-18') },
  { id: 'sg-pendukung', name: 'Lini Pendukung', createdAt: at('2026-01-18') },
];

export const SBU_SEED: Sbu[] = [
  {
    id: 'sbu-retail',
    code: 'SBU-RETAIL',
    name: 'Retail',
    sbuGroupId: 'sg-utama',
    parentId: null,
    responsibleEmployeeId: 'emp-maya',
    createdAt: at('2026-01-19'),
  },
  {
    id: 'sbu-korporat',
    code: 'SBU-KORPORAT',
    name: 'Korporat',
    sbuGroupId: 'sg-utama',
    parentId: null,
    responsibleEmployeeId: null,
    createdAt: at('2026-01-19'),
  },
];

export const VENDOR_SEED: Vendor[] = [
  {
    id: 'vd-sumber',
    vendorName: 'PT Sumber Jaya',
    address: 'Jl. Industri No. 5',
    phone: '081234500000',
    telephone: '0222000000',
    email: 'kontak@sumberjaya.co.id',
    vendorType: 'COMPANY',
    picName: 'Andi',
    picPosition: 'SALES',
    isActive: true,
    createdAt: at('2026-02-10'),
  },
  {
    id: 'vd-mitra',
    vendorName: 'CV Mitra Sejahtera',
    address: 'Jl. Cikapundung No. 12',
    phone: '081200011122',
    telephone: null,
    email: null,
    vendorType: 'COMPANY',
    picName: 'Sinta',
    picPosition: 'OWNER',
    isActive: true,
    createdAt: at('2026-03-04'),
  },
];

/** Karyawan yang bisa ditunjuk sebagai penanggung jawab atau pengisi posisi. */
export const PEOPLE: Record<string, { nama: string; nik: string }> = {
  'emp-rudi': { nama: 'Rudi Hartono', nik: 'PTDIKA-0001' },
  'emp-maya': { nama: 'Maya Anggraini', nik: 'PTDIKA-0002' },
  'emp-hesti': { nama: 'Hesti Wulandari', nik: 'PTDIKA-0003' },
  'emp-dimas': { nama: 'Dimas Pratama', nik: 'PTDIKA-0004' },
};

export const personName = (id: string | null) => (id ? (PEOPLE[id]?.nama ?? id) : '—');
