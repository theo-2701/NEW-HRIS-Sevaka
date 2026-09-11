import type {
  DisputeHold,
  Installment,
  Loan,
  LoanConfig,
  LoanExposure,
  LoanStateRef,
  RejectionReason,
} from '@/features/loan/types';

/**
 * Dataset skenario positif FSD/UIC-001-FINANCE 0.2 (company PTDIKA) — disalin
 * apa adanya dari `_prototype/js/finance-data.js`. Jangan mengarang baris baru.
 */

/** Identitas yang sedang login di layar ini (pengganti token). */
export const ME = 'emp-budi';

/** Atasan langsung yang memegang antrean keputusan — tidak memutus barisnya sendiri. */
export const MGR = 'emp-sinta';

/** Batas pinjaman aktif per karyawan (`FIN_ACTIVE_LOAN_COUNT_EXCEEDED`). */
export const MAX_ACTIVE = 2;

export const EMPLOYEES = [
  { id: 'emp-budi', name: 'Budi Santoso', nik: '2019-0451', role: 'ROLE_EMPLOYEE', unit: 'Finance Operations', gradeId: 'jg-staff-2' },
  { id: 'emp-sinta', name: 'Sinta Dewi', nik: '2016-0122', role: 'ROLE_DEPT_MANAGER', unit: 'Finance Operations', gradeId: 'jg-mgr-1' },
  { id: 'emp-rahmat', name: 'Rahmat Hidayat', nik: '2015-0087', role: 'ROLE_FINANCE_OFFICER', unit: 'Corporate Finance', gradeId: 'jg-staff-3' },
  { id: 'emp-ari', name: 'Ari Wibowo', nik: '2014-0033', role: 'ROLE_HR_MANAGER', unit: 'Human Capital', gradeId: 'jg-mgr-2' },
  { id: 'emp-maya', name: 'Maya Puspita', nik: '2018-0290', role: 'ROLE_HEALTH_DATA_OFFICER', unit: 'Human Capital', gradeId: 'jg-staff-2' },
];

export const JOB_GRADES = [
  { id: 'jg-staff-1', name: 'Staff Grade 1' },
  { id: 'jg-staff-2', name: 'Staff Grade 2' },
  { id: 'jg-staff-3', name: 'Staff Grade 3' },
  { id: 'jg-spv-1', name: 'Supervisor Grade 1' },
  { id: 'jg-mgr-1', name: 'Manager Grade 1' },
  { id: 'jg-mgr-2', name: 'Manager Grade 2' },
];

export const LOAN_CFG: LoanConfig = {
  interestBearing: true,
  tenorMode: 'EMPLOYEE_CHOICE',
  tenorChoicePattern: 'MULTIPLE_OF_THREE',
  tenorMax: 24,
  enabled: true,
  earlySettlement: false,
};

export const EXPOSURE: LoanExposure = {
  employeeId: 'emp-budi',
  jobGradeId: 'jg-staff-2',
  limitAmount: 30_000_000,
  outstandingAmount: 0,
  reservedAmount: 0,
};

export const LOANS: Loan[] = [
  {
    id: 'loan-12',
    requestNo: 'LON-2026-000012',
    employeeId: 'emp-budi',
    principalAmount: 20_000_000,
    tenorMonths: 12,
    interestBearingSnapshot: true,
    scheduleSource: 'RECEIVED_FROM_EXTERNAL',
    interestAmount: 1_200_000,
    totalObligation: 21_200_000,
    status: 'APPROVED',
    submittedAt: '2026-06-15',
    workflowInstanceId: '8b00…0abc',
    bankAccountSnapshot: { bankCode: 'BCA', accountNumber: '****4567', accountHolderName: 'Budi Santoso' },
    costCenterIdSnapshot: null,
  },
  {
    id: 'loan-18',
    requestNo: 'LON-2026-000018',
    employeeId: 'emp-budi',
    principalAmount: 9_000_000,
    tenorMonths: 9,
    interestBearingSnapshot: true,
    scheduleSource: null,
    interestAmount: null,
    totalObligation: null,
    status: 'AWAITING_ACKNOWLEDGEMENT',
    submittedAt: '2026-07-18',
    workflowInstanceId: '8b00…0ade',
    acknowledgementOffer: { acknowledgedPrincipal: 9_000_000, acknowledgedInterest: 540_000, acknowledgedTenor: 9 },
    bankAccountSnapshot: { bankCode: 'BCA', accountNumber: '****4567', accountHolderName: 'Budi Santoso' },
    costCenterIdSnapshot: null,
  },
  {
    id: 'loan-21',
    requestNo: 'LON-2026-000021',
    employeeId: 'emp-rahmat',
    principalAmount: 25_000_000,
    tenorMonths: 24,
    interestBearingSnapshot: true,
    scheduleSource: null,
    interestAmount: null,
    totalObligation: null,
    status: 'AWAITING_CALCULATION',
    submittedAt: '2026-07-24',
    workflowInstanceId: '8b00…0af1',
    bankAccountSnapshot: { bankCode: 'BNI', accountNumber: '****2201', accountHolderName: 'Rahmat Hidayat' },
    costCenterIdSnapshot: null,
  },
  {
    id: 'loan-24',
    requestNo: 'LON-2026-000024',
    employeeId: 'emp-maya',
    principalAmount: 6_000_000,
    tenorMonths: 6,
    interestBearingSnapshot: true,
    scheduleSource: null,
    interestAmount: null,
    totalObligation: null,
    status: 'SUBMITTED',
    submittedAt: '2026-08-03',
    workflowInstanceId: '8b00…0b02',
    bankAccountSnapshot: { bankCode: 'MANDIRI', accountNumber: '****8812', accountHolderName: 'Maya Puspita' },
    costCenterIdSnapshot: null,
  },
];

/**
 * Jadwal angsuran hanya ada untuk pinjaman yang sudah `APPROVED` — ia terbit
 * dari jadwal pihak pemberi dana, bukan dihitung di layar.
 */
export const INSTALLMENTS: Record<string, Installment[]> = {
  'loan-12': Array.from({ length: 12 }, (_, index) => {
    const sequenceNo = index + 1;
    const month = 6 + sequenceNo;
    const year = 2026 + (month > 12 ? 1 : 0);
    const mm = month > 12 ? month - 12 : month;
    return {
      sequenceNo,
      payrollPeriodRef: `${year}-${String(mm).padStart(2, '0')}-25`,
      dueAmount: 21_200_000 / 12,
      status: sequenceNo === 1 ? ('CONFIRMED' as const) : ('PENDING' as const),
    };
  }),
};

export const LOAN_STATES: LoanStateRef[] = [
  { status: 'SUBMITTED', meaning: 'Reservasi HELD, instance workflow dimulai sinkron.', appearsIn: 'LN-A3 / LN-A4' },
  {
    status: 'AWAITING_CALCULATION',
    meaning: 'Disetujui pada company berbunga — menunggu jadwal dari pihak luar.',
    appearsIn: 'LN-S1 (baris tertahan)',
  },
  {
    status: 'AWAITING_ACKNOWLEDGEMENT',
    meaning: 'Jadwal masuk; karyawan wajib ACK/DECLINE di dalam aplikasi.',
    appearsIn: 'LN-C2',
  },
  { status: 'APPROVED', meaning: 'Jadwal disetujui/ACK — masuk daftar Pencairan (FT5).', appearsIn: 'LN-C3' },
  { status: 'REJECTED', meaning: 'Ditolak atasan; reservasi dilepas.', appearsIn: 'Dinarasikan (LN-B3 cabang Tolak)' },
  {
    status: 'REJECTED_BY_EXTERNAL',
    meaning: 'Pihak pemberi dana menolak; sebab kosong disimpan apa adanya.',
    appearsIn: 'Dinarasikan (pintu 4 integrasi)',
  },
  {
    status: 'CANCELLED',
    meaning: 'Dibatalkan pengaju sendiri saat masih SUBMITTED (POST .../cancel).',
    appearsIn: 'Dinarasikan — nol layar aksi',
  },
  {
    status: 'WITHDRAWN',
    meaning: 'Ditarik pengaju setelah ambang AWAITING_CALCULATION lewat (POST .../withdraw).',
    appearsIn: 'Dinarasikan — nol layar aksi',
  },
  {
    status: 'DECLINED_BY_EMPLOYEE',
    meaning: 'Karyawan menolak jadwal (DECLINE); reservasi dilepas, boleh ajukan ulang.',
    appearsIn: 'LN-C2 cabang DECLINE',
  },
  {
    status: 'CLOSED',
    meaning: 'Sisa kewajiban nol — lunas normal / pelunasan dipercepat / percepatan keluar.',
    appearsIn: 'Dinarasikan (POST .../early-settlement)',
  },
];

export const HOLDS: DisputeHold[] = [
  { id: 'hold-46', targetType: 'BENEFIT_CLAIM', targetId: 'clm-46', targetRequestNo: 'CLM-2026-000046', isActive: true },
  { id: 'hold-21', targetType: 'LOAN', targetId: 'loan-21', targetRequestNo: 'LON-2026-000021', isActive: true },
];

export const REJECTION_REASONS: RejectionReason[] = [
  { id: 'rr-1', name: 'Incomplete receipt evidence', requiresFreeText: false, isActive: true },
  { id: 'rr-2', name: 'Outside company policy', requiresFreeText: false, isActive: true },
  { id: 'rr-3', name: 'Exceeds the entitlement', requiresFreeText: false, isActive: true },
  { id: 'rr-4', name: 'Submitted data does not match', requiresFreeText: true, isActive: true },
  { id: 'rr-5', name: 'Other', requiresFreeText: true, isActive: true },
  { id: 'rr-6', name: 'Cost estimate is unreasonable', requiresFreeText: true, isActive: true },
];

export function employeeOf(id: string) {
  return EMPLOYEES.find((row) => row.id === id);
}

export function employeeName(id: string): string {
  return employeeOf(id)?.name ?? '—';
}

export function gradeName(id: string): string {
  return JOB_GRADES.find((row) => row.id === id)?.name ?? id;
}
