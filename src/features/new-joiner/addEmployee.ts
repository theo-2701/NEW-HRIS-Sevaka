import * as Yup from 'yup';
import type { SelectOption } from '@/components/form/SelectField';

/**
 * Add Employee — wizard 4 langkah (port `_prototype/add-employee.html`).
 * Jalur manual: HR mengisi seluruh data karyawan sekaligus, tanpa alur
 * maker/checker New Joiner. Dipakai untuk migrasi data dan kasus khusus.
 */
export interface AddEmployeeValues {
  // Langkah 1 — data pribadi
  fullName: string;
  email: string;
  phone: string;
  additionalPhone: string;
  placeOfBirth: string;
  dateOfBirth: string;
  gender: string;
  maritalStatus: string;
  bloodType: string;
  religion: string;
  // Langkah 1 — identitas & alamat
  nik: string;
  passportNumber: string;
  passportExpiry: string;
  postalCode: string;
  idCardAddress: string;
  residentialSameAsIdCard: boolean;
  residentialAddress: string;
  // Langkah 2 — data kepegawaian
  employeeId: string;
  barcode: string;
  groupStructureId: string;
  employmentStatus: string;
  joinDate: string;
  branchId: string;
  organizationId: string;
  jobPositionId: string;
  jobLevelId: string;
  gradeId: string;
  classId: string;
  scheduleId: string;
  approvalLineId: string;
  managerId: string;
  sbus: { groupId: string; sbuId: string }[];
  // Langkah 3 — payroll
  basicSalary: string;
  salaryType: string;
  paymentSchedule: string;
  prorateSetting: string;
  overtimeAllowed: boolean;
  bankId: string;
  accountNumber: string;
  accountHolderName: string;
  npwp: string;
  ptkpStatus: string;
  taxMethod: string;
  taxSalary: string;
  taxableDate: string;
  employmentTaxStatus: string;
  beginningNetto: string;
  pph21Paid: string;
  bpjsEmploymentNumber: string;
  nppBpjsEmployment: string;
  bpjsEmploymentDate: string;
  bpjsHealthNumber: string;
  bpjsHealthFamily: string;
  bpjsHealthDate: string;
  bpjsHealthCost: string;
  jhtCost: string;
  pensionCost: string;
  pensionDate: string;
  // Langkah 4 — undangan
  inviteNow: boolean;
  startOnboarding: boolean;
}

export const EMPTY_EMPLOYEE: AddEmployeeValues = {
  fullName: '',
  email: '',
  phone: '',
  additionalPhone: '',
  placeOfBirth: '',
  dateOfBirth: '',
  gender: '',
  maritalStatus: '',
  bloodType: '',
  religion: '',
  nik: '',
  passportNumber: '',
  passportExpiry: '',
  postalCode: '',
  idCardAddress: '',
  residentialSameAsIdCard: true,
  residentialAddress: '',
  employeeId: '',
  barcode: '',
  groupStructureId: '',
  employmentStatus: '',
  joinDate: '',
  branchId: '',
  organizationId: '',
  jobPositionId: '',
  jobLevelId: '',
  gradeId: '',
  classId: '',
  scheduleId: '',
  approvalLineId: '',
  managerId: '',
  sbus: [{ groupId: '', sbuId: '' }],
  basicSalary: '',
  salaryType: 'MONTHLY',
  paymentSchedule: 'MONTHLY',
  prorateSetting: 'WORKING_DAY',
  overtimeAllowed: false,
  bankId: '',
  accountNumber: '',
  accountHolderName: '',
  npwp: '',
  ptkpStatus: '',
  taxMethod: 'GROSS',
  taxSalary: '',
  taxableDate: '',
  employmentTaxStatus: '',
  beginningNetto: '',
  pph21Paid: '',
  bpjsEmploymentNumber: '',
  nppBpjsEmployment: '',
  bpjsEmploymentDate: '',
  bpjsHealthNumber: '',
  bpjsHealthFamily: '',
  bpjsHealthDate: '',
  bpjsHealthCost: 'COMPANY',
  jhtCost: 'COMPANY',
  pensionCost: 'COMPANY',
  pensionDate: '',
  inviteNow: true,
  startOnboarding: false,
};

export const EMPLOYMENT_STATUS_OPTIONS: SelectOption[] = [
  { value: 'PERMANENT', label: 'Permanent' },
  { value: 'CONTRACT', label: 'Contract (PKWT)' },
  { value: 'PROBATION', label: 'Probation' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'OUTSOURCE', label: 'Outsource' },
];

export const GROUP_STRUCTURE_OPTIONS: SelectOption[] = [
  { value: 'gs-hq', label: 'PT DIKA — Holding' },
  { value: 'gs-ops', label: 'PT DIKA Operasi' },
  { value: 'gs-tech', label: 'PT DIKA Teknologi' },
];

export const BRANCH_OPTIONS: SelectOption[] = [
  { value: 'br-hq', label: 'Head Office Jakarta' },
  { value: 'br-sby', label: 'BR-Surabaya' },
  { value: 'br-papua', label: 'BR-Papua' },
];

export const ORGANIZATION_OPTIONS: SelectOption[] = [
  { value: 'org-eng', label: 'Engineering' },
  { value: 'org-fin', label: 'Finance' },
  { value: 'org-hr', label: 'People Ops' },
  { value: 'org-sales', label: 'Sales' },
];

export const JOB_POSITION_OPTIONS: SelectOption[] = [
  { value: 'jp-be', label: 'Backend Engineer' },
  { value: 'jp-fin', label: 'Staff Finance' },
  { value: 'jp-hrbp', label: 'HR Business Partner' },
  { value: 'jp-sales', label: 'Sales Executive' },
];

export const JOB_LEVEL_OPTIONS: SelectOption[] = [
  { value: 'jl-staff', label: 'Staff' },
  { value: 'jl-spv', label: 'Supervisor' },
  { value: 'jl-mgr', label: 'Manager' },
];

export const GRADE_OPTIONS: SelectOption[] = [
  { value: 'gr-3', label: 'Grade III' },
  { value: 'gr-4', label: 'Grade IV' },
  { value: 'gr-5', label: 'Grade V' },
];

export const CLASS_OPTIONS: SelectOption[] = [
  { value: 'cl-a', label: 'Class A' },
  { value: 'cl-b', label: 'Class B' },
  { value: 'cl-c', label: 'Class C' },
];

export const SCHEDULE_OPTIONS: SelectOption[] = [
  { value: 'sc-office', label: 'Office 08.00–17.00' },
  { value: 'sc-shift', label: 'Shift 3 regu' },
  { value: 'sc-flexi', label: 'Flexi 40 jam/minggu' },
];

export const APPROVAL_LINE_OPTIONS: SelectOption[] = [
  { value: 'al-default', label: 'Default — atasan langsung' },
  { value: 'al-hr', label: 'HR Business Partner' },
  { value: 'al-dual', label: 'Dua tingkat (atasan + kepala unit)' },
];

export const MANAGER_OPTIONS: SelectOption[] = [
  { value: 'emp-tony', label: 'Tony Stark — Engineering' },
  { value: 'emp-rina', label: 'Rina Hartono — People Ops' },
  { value: 'emp-bagus', label: 'Bagus Pratama — Sales' },
];

export const SBU_GROUP_OPTIONS: SelectOption[] = [
  { value: 'sbg-a', label: 'SBU Group A' },
  { value: 'sbg-b', label: 'SBU Group B' },
];

export const SBU_OPTIONS: SelectOption[] = [
  { value: 'sbu-01', label: 'SBU 01' },
  { value: 'sbu-02', label: 'SBU 02' },
  { value: 'sbu-03', label: 'SBU 03' },
];

export const SALARY_TYPE_OPTIONS: SelectOption[] = [
  { value: 'MONTHLY', label: 'Bulanan' },
  { value: 'DAILY', label: 'Harian' },
  { value: 'HOURLY', label: 'Per jam' },
];

export const PAYMENT_SCHEDULE_OPTIONS: SelectOption[] = [
  { value: 'MONTHLY', label: 'Bulanan — akhir bulan' },
  { value: 'BIWEEKLY', label: 'Dua mingguan' },
  { value: 'WEEKLY', label: 'Mingguan' },
];

export const PRORATE_OPTIONS: SelectOption[] = [
  { value: 'WORKING_DAY', label: 'Berdasarkan hari kerja' },
  { value: 'CALENDAR_DAY', label: 'Berdasarkan hari kalender' },
  { value: 'BASE_DAY', label: 'Berdasarkan base day tetap' },
];

export const BANK_OPTIONS: SelectOption[] = [
  { value: 'bca', label: 'BCA' },
  { value: 'mandiri', label: 'Mandiri' },
  { value: 'bni', label: 'BNI' },
  { value: 'bri', label: 'BRI' },
];

export const PTKP_OPTIONS: SelectOption[] = [
  { value: 'TK0', label: 'TK/0' },
  { value: 'TK1', label: 'TK/1' },
  { value: 'K0', label: 'K/0' },
  { value: 'K1', label: 'K/1' },
  { value: 'K2', label: 'K/2' },
  { value: 'K3', label: 'K/3' },
];

export const TAX_METHOD_OPTIONS: SelectOption[] = [
  { value: 'GROSS', label: 'Gross' },
  { value: 'GROSS_UP', label: 'Gross up' },
  { value: 'NETT', label: 'Nett' },
];

export const TAX_SALARY_OPTIONS: SelectOption[] = [
  { value: 'TAXABLE', label: 'Taxable' },
  { value: 'NON_TAXABLE', label: 'Non taxable' },
];

export const EMPLOYMENT_TAX_STATUS_OPTIONS: SelectOption[] = [
  { value: 'PERMANENT', label: 'Pegawai tetap' },
  { value: 'NON_PERMANENT', label: 'Pegawai tidak tetap' },
  { value: 'EXPATRIATE', label: 'Tenaga kerja asing' },
];

export const BPJS_FAMILY_OPTIONS: SelectOption[] = [
  { value: 'SELF', label: 'Hanya karyawan' },
  { value: 'SPOUSE', label: 'Karyawan + pasangan' },
  { value: 'FAMILY', label: 'Karyawan + pasangan + 3 anak' },
];

export const COST_BEARER_OPTIONS: SelectOption[] = [
  { value: 'COMPANY', label: 'Ditanggung perusahaan' },
  { value: 'EMPLOYEE', label: 'Ditanggung karyawan' },
  { value: 'SPLIT', label: 'Dibagi perusahaan & karyawan' },
];

/**
 * Validasi per langkah. Tombol "Next" hanya membuka langkah berikutnya bila
 * langkah sekarang lolos — jadi galat muncul di tempat datanya diisi.
 */
export const STEP_SCHEMAS = [
  Yup.object({
    fullName: Yup.string().trim().required('Nama lengkap wajib diisi.'),
    email: Yup.string().required('Email wajib diisi.').email('Format email tidak valid.'),
    phone: Yup.string().matches(/^[0-9+\-\s]*$/, 'Nomor telepon hanya boleh angka.'),
    additionalPhone: Yup.string().matches(/^[0-9+\-\s]*$/, 'Nomor telepon hanya boleh angka.'),
    dateOfBirth: Yup.string().required('Tanggal lahir wajib diisi.'),
    maritalStatus: Yup.string().required('Status pernikahan wajib dipilih.'),
    religion: Yup.string().required('Agama wajib dipilih.'),
    nik: Yup.string().matches(/^(\d{16})?$/, 'NIK harus 16 digit angka.'),
    postalCode: Yup.string()
      .required('Kode pos wajib diisi.')
      .matches(/^\d{5}$/, 'Kode pos harus 5 digit angka.'),
    residentialAddress: Yup.string().when('residentialSameAsIdCard', {
      is: false,
      then: (schema) => schema.required('Alamat domisili wajib diisi bila berbeda dari KTP.'),
      otherwise: (schema) => schema,
    }),
  }),
  Yup.object({
    employeeId: Yup.string().trim().required('Employee ID wajib diisi.'),
    employmentStatus: Yup.string().required('Status kepegawaian wajib dipilih.'),
    joinDate: Yup.string().required('Tanggal masuk wajib diisi.'),
    organizationId: Yup.string().required('Organisasi wajib dipilih.'),
    jobPositionId: Yup.string().required('Jabatan wajib dipilih.'),
    jobLevelId: Yup.string().required('Job level wajib dipilih.'),
    scheduleId: Yup.string().required('Jadwal kerja wajib dipilih.'),
  }),
  Yup.object({
    basicSalary: Yup.string()
      .required('Gaji pokok wajib diisi.')
      .matches(/^\d+$/, 'Gaji pokok hanya boleh angka, tanpa titik atau koma.'),
    accountNumber: Yup.string().matches(/^\d*$/, 'Nomor rekening hanya boleh angka.'),
    npwp: Yup.string(),
    ptkpStatus: Yup.string().required('Status PTKP wajib dipilih.'),
    taxSalary: Yup.string().required('Tax salary wajib dipilih.'),
    employmentTaxStatus: Yup.string().required('Status pajak kepegawaian wajib dipilih.'),
  }),
  Yup.object({}),
];

export const STEP_TITLES = ['Personal Data', 'Employment Data', 'Payroll', 'Invite Employee'];
