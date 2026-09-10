import type {
  AccrualPolicy,
  Blackout,
  Delegation,
  Employee,
  Holiday,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
  LedgerEntry,
  MedicalAccessLog,
  OrgUnit,
  Session,
} from '@/features/time-off/types';

/**
 * Dataset Skenario Positif dari kontrak Time Management
 * (FSD-001-TIME 0.1 · UIC-001-TIME 0.1 · ERD-001-TIME 0.4).
 *
 * Identitas dan angkanya diambil apa adanya dari contoh kontrak — jangan
 * mengarang baris baru di sini; tambahkan lewat alur layar saja.
 */
export const EMPLOYEES: Employee[] = [
  { id: 'emp-rina', name: 'Rina Wulandari', unit: 'Finance', branch: 'br-1', role: 'Staff' },
  { id: 'emp-hendra', name: 'Hendra Kusuma', unit: 'Finance', branch: 'br-1', role: 'HR Manager' },
  { id: 'emp-sari', name: 'Sari Kartika', unit: 'Operations', branch: 'br-1', role: 'Staff' },
  { id: 'emp-budi', name: 'Budi Santoso', unit: 'Operations', branch: 'br-4', role: 'Supervisor' },
];

/** Identitas yang bisa dipakai untuk mencoba layar — pengganti login sungguhan. */
export const VIEWERS: Session[] = [
  { employeeId: 'emp-hendra', roles: ['ROLE_EMPLOYEE', 'ROLE_HR_MANAGER'] },
  { employeeId: 'emp-budi', roles: ['ROLE_EMPLOYEE', 'ROLE_DEPT_MANAGER'] },
  { employeeId: 'emp-rina', roles: ['ROLE_EMPLOYEE'] },
];

export const LEAVE_TYPES: LeaveType[] = [
  {
    id: 'lt-annual',
    code: 'CUTI-TAHUNAN',
    name: 'Cuti Tahunan',
    isStatutory: true,
    isPaid: true,
    affectsBalance: true,
    requiresDocument: false,
    requiresApproval: true,
    minAdvanceDays: 3,
    isActive: true,
  },
  {
    id: 'lt-sick',
    code: 'SAKIT',
    name: 'Sakit',
    isStatutory: true,
    isPaid: true,
    affectsBalance: true,
    requiresDocument: true,
    // Berlaku seketika: tidak menunggu keputusan, tapi bisa ditolak di jendela.
    requiresApproval: false,
    minAdvanceDays: 0,
    isActive: true,
  },
  {
    id: 'lt-unpaid',
    code: 'UNPAID',
    name: 'Cuti Tanpa Gaji',
    isStatutory: false,
    isPaid: false,
    affectsBalance: false,
    requiresDocument: false,
    requiresApproval: true,
    minAdvanceDays: 3,
    isActive: true,
  },
];

export const HOLIDAYS: Holiday[] = [
  { id: 'hol-1', date: '2026-08-17', name: 'Hari Kemerdekaan RI ke-81', type: 'NATIONAL', scopeRef: null, approvalStatus: 'APPROVED' },
  { id: 'hol-2', date: '2026-12-24', name: 'Cuti Bersama Natal', type: 'NATIONAL', scopeRef: null, approvalStatus: 'APPROVED' },
  { id: 'hol-3', date: '2026-12-26', name: 'Cuti Bersama Natal (Internal)', type: 'COMPANY', scopeRef: null, approvalStatus: 'APPROVED' },
  { id: 'hol-4', date: '2026-08-18', name: 'Anniversary Cabang Jakarta', type: 'REGIONAL', scopeRef: 'br-1', approvalStatus: 'PENDING_APPROVAL' },
  { id: 'hol-7', date: '2026-10-05', name: 'HUT Perusahaan', type: 'COMPANY', scopeRef: null, approvalStatus: 'PENDING_APPROVAL' },
];

export const BLACKOUTS: Blackout[] = [
  {
    id: 'blackout-1',
    name: 'Blackout Akhir Tahun Fiskal',
    reason: 'Periode tutup buku — cuti tahunan ditahan kecuali darurat.',
    startDate: '2026-12-28',
    endDate: '2026-12-31',
    mode: 'SOFT',
  },
  {
    id: 'blackout-2',
    name: 'Tutup Buku Akhir Tahun 2027',
    reason: 'Beban closing keuangan tak boleh ditinggalkan.',
    startDate: '2027-12-29',
    endDate: '2027-12-31',
    mode: 'HARD',
  },
];

export const LEAVE_BALANCES: LeaveBalance[] = [
  { employeeId: 'emp-rina', leaveTypeId: 'lt-annual', periodYear: 2026, balanceDays: 11, projectedDays: 16 },
  { employeeId: 'emp-rina', leaveTypeId: 'lt-sick', periodYear: 2026, balanceDays: 10, projectedDays: 10 },
  { employeeId: 'emp-sari', leaveTypeId: 'lt-annual', periodYear: 2026, balanceDays: -1.5, projectedDays: 3.5 },
  { employeeId: 'emp-budi', leaveTypeId: 'lt-annual', periodYear: 2026, balanceDays: 7, projectedDays: 12 },
  { employeeId: 'emp-hendra', leaveTypeId: 'lt-annual', periodYear: 2026, balanceDays: 14, projectedDays: 19 },
];

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: 'leave-1',
    employeeId: 'emp-rina',
    leaveTypeId: 'lt-annual',
    daySession: 'FULL',
    startDate: '2026-07-20',
    endDate: '2026-07-21',
    totalDays: 2,
    reason: 'Menghadiri pernikahan saudara di Yogyakarta.',
    hasDoctorNote: false,
    status: 'APPROVED',
    extraApprovalReason: null,
    rejectDeadlineAt: null,
    rejectReason: null,
    submittedAt: '2026-07-15T10:00:00+07:00',
    approvedBy: 'emp-hendra',
    approvedAt: '2026-07-16T14:00:00+07:00',
  },
  {
    id: 'leave-2',
    employeeId: 'emp-rina',
    leaveTypeId: 'lt-sick',
    daySession: 'FULL',
    startDate: '2026-07-24',
    endDate: '2026-07-24',
    totalDays: 1,
    reason: '',
    hasDoctorNote: true,
    doctorNotePurged: false,
    status: 'AUTO_APPROVED',
    extraApprovalReason: null,
    rejectDeadlineAt: '2026-07-25T23:59:59+07:00',
    rejectReason: null,
    submittedAt: '2026-07-24T07:30:00+07:00',
    approvedBy: null,
    approvedAt: '2026-07-24T07:30:00+07:00',
  },
  {
    id: 'leave-3',
    employeeId: 'emp-rina',
    leaveTypeId: 'lt-annual',
    daySession: 'HALF_AM',
    startDate: '2026-08-10',
    endDate: '2026-08-10',
    totalDays: 0.5,
    reason: 'Mengurus dokumen keluarga.',
    hasDoctorNote: false,
    status: 'PENDING_APPROVAL',
    extraApprovalReason: null,
    rejectDeadlineAt: null,
    rejectReason: null,
    submittedAt: '2026-07-27T08:30:00+07:00',
    approvedBy: null,
    approvedAt: null,
  },
  {
    id: 'leave-4',
    employeeId: 'emp-hendra',
    leaveTypeId: 'lt-annual',
    daySession: 'FULL',
    startDate: '2026-08-03',
    endDate: '2026-08-05',
    totalDays: 3,
    reason: 'Cuti tahunan bersama keluarga.',
    hasDoctorNote: false,
    status: 'APPROVED',
    extraApprovalReason: null,
    rejectDeadlineAt: null,
    rejectReason: null,
    submittedAt: '2026-07-17T09:00:00+07:00',
    approvedBy: 'emp-budi',
    approvedAt: '2026-07-19T11:00:00+07:00',
  },
  {
    id: 'leave-8',
    employeeId: 'emp-sari',
    leaveTypeId: 'lt-annual',
    daySession: 'HALF_AM',
    startDate: '2026-08-05',
    endDate: '2026-08-05',
    totalDays: 0.5,
    reason: 'Mengurus administrasi sekolah anak.',
    hasDoctorNote: false,
    status: 'PENDING_APPROVAL',
    extraApprovalReason: 'NEGATIVE_BALANCE',
    rejectDeadlineAt: null,
    rejectReason: null,
    submittedAt: '2026-07-22T09:10:00+07:00',
    approvedBy: null,
    approvedAt: null,
  },
  {
    id: 'leave-5',
    employeeId: 'emp-budi',
    leaveTypeId: 'lt-unpaid',
    daySession: 'FULL',
    startDate: '2026-07-06',
    endDate: '2026-07-08',
    totalDays: 3,
    reason: 'Keperluan keluarga di luar kota.',
    hasDoctorNote: false,
    status: 'REJECTED',
    extraApprovalReason: 'UNPAID_TYPE',
    rejectDeadlineAt: null,
    rejectReason: 'Beban tim minggu tersebut tidak dapat ditinggalkan.',
    submittedAt: '2026-06-28T11:00:00+07:00',
    approvedBy: 'emp-hendra',
    approvedAt: '2026-06-29T09:00:00+07:00',
  },
  {
    id: 'leave-7',
    employeeId: 'emp-hendra',
    leaveTypeId: 'lt-annual',
    daySession: 'FULL',
    startDate: '2026-09-14',
    endDate: '2026-09-16',
    totalDays: 3,
    reason: 'Cuti tahunan — perjalanan keluarga.',
    hasDoctorNote: false,
    status: 'PENDING_APPROVAL',
    extraApprovalReason: null,
    rejectDeadlineAt: null,
    rejectReason: null,
    submittedAt: '2026-07-20T08:00:00+07:00',
    approvedBy: null,
    approvedAt: null,
  },
  {
    id: 'leave-6',
    employeeId: 'emp-sari',
    leaveTypeId: 'lt-sick',
    daySession: 'FULL',
    startDate: '2026-07-13',
    endDate: '2026-07-14',
    totalDays: 2,
    reason: '',
    hasDoctorNote: true,
    // Surat dokternya sudah dimusnahkan — jalur 410 bisa dicoba dari baris ini.
    doctorNotePurged: true,
    status: 'CANCELLED',
    extraApprovalReason: null,
    rejectDeadlineAt: '2026-07-15T23:59:59+07:00',
    rejectReason: null,
    submittedAt: '2026-07-13T07:15:00+07:00',
    approvedBy: null,
    approvedAt: '2026-07-13T07:15:00+07:00',
  },
];

export const DELEGATIONS: Delegation[] = [
  {
    id: 'deleg-1',
    leaveRequestId: 'leave-4',
    delegatorId: 'emp-hendra',
    substituteId: 'emp-sari',
    scope: 'ALL_APPROVALS',
    status: 'APPROVED',
    createdAt: '2026-07-18T10:05:00+07:00',
  },
  {
    id: 'deleg-2',
    leaveRequestId: 'leave-7',
    delegatorId: 'emp-hendra',
    substituteId: 'emp-budi',
    scope: 'ALL_APPROVALS',
    status: 'PENDING_APPROVAL',
    createdAt: '2026-07-21T09:00:00+07:00',
  },
];

export const MEDICAL_ACCESS: MedicalAccessLog[] = [
  {
    id: 'access-1',
    leaveRequestId: 'leave-2',
    accessedBy: 'emp-hendra',
    purpose: 'VERIFICATION',
    createdAt: '2026-07-24T10:15:00+07:00',
  },
  {
    id: 'access-2',
    leaveRequestId: 'leave-6',
    accessedBy: 'emp-hendra',
    purpose: 'AUDIT',
    createdAt: '2026-07-14T16:05:00+07:00',
  },
];

export function employeeName(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.name ?? id;
}

export function leaveTypeOf(id: string): LeaveType | undefined {
  return LEAVE_TYPES.find((row) => row.id === id);
}

/** Ledger awal — mutasi otomatis dari kontrak; HR adjustment ditulis dari layar. */
export const LEDGER: LedgerEntry[] = [
  {
    id: 'ledger-1',
    employeeId: 'emp-rina',
    leaveTypeId: 'lt-annual',
    periodYear: 2026,
    mutationDate: '2026-07-01',
    deltaDays: 1,
    source: 'ACCRUAL_MONTHLY',
    refId: null,
    reason: 'Accrual bulanan Juli 2026',
    createdAt: '2026-07-01T01:00:00+07:00',
    createdBy: 'emp-sys',
  },
  {
    id: 'ledger-2',
    employeeId: 'emp-rina',
    leaveTypeId: 'lt-annual',
    periodYear: 2026,
    mutationDate: '2026-07-20',
    deltaDays: -2,
    source: 'LEAVE_TAKEN',
    refId: 'leave-1',
    reason: 'Menghadiri pernikahan saudara di Yogyakarta.',
    createdAt: '2026-07-16T14:00:05+07:00',
    createdBy: 'emp-sys',
  },
  {
    id: 'ledger-3',
    employeeId: 'emp-sari',
    leaveTypeId: 'lt-annual',
    periodYear: 2026,
    mutationDate: '2026-07-01',
    deltaDays: 1,
    source: 'ACCRUAL_MONTHLY',
    refId: null,
    reason: 'Accrual bulanan Juli 2026',
    createdAt: '2026-07-01T01:00:00+07:00',
    createdBy: 'emp-sys',
  },
  {
    id: 'ledger-4',
    employeeId: 'emp-sari',
    leaveTypeId: 'lt-annual',
    periodYear: 2026,
    mutationDate: '2026-06-30',
    deltaDays: -3,
    source: 'LEAVE_TAKEN',
    refId: null,
    reason: 'Cuti tahunan Juni 2026.',
    createdAt: '2026-06-25T10:00:00+07:00',
    createdBy: 'emp-sys',
  },
  {
    id: 'ledger-5',
    employeeId: 'emp-budi',
    leaveTypeId: 'lt-annual',
    periodYear: 2026,
    mutationDate: '2026-01-01',
    deltaDays: 6,
    source: 'YEAR_END_CARRY_OVER',
    refId: null,
    reason: 'Carry-over sisa jatah 2025 (dibatasi 6 hari).',
    createdAt: '2026-01-01T02:00:00+07:00',
    createdBy: 'emp-sys',
  },
  {
    id: 'ledger-6',
    employeeId: 'emp-rina',
    leaveTypeId: 'lt-annual',
    periodYear: 2026,
    mutationDate: '2026-12-24',
    deltaDays: -1,
    source: 'JOINT_LEAVE',
    refId: 'hol-2',
    reason: 'Cuti bersama Natal 2026.',
    createdAt: '2026-07-05T03:00:00+07:00',
    createdBy: 'emp-sys',
  },
];

/** Unit organisasi — dipakai membatasi cakupan blackout. */
export const UNITS: OrgUnit[] = [
  { id: 'unit-fin', name: 'Finance' },
  { id: 'unit-ops', name: 'Operations' },
];

/** Jenis kepegawaian yang diekspos tenant ini (katalognya milik personnel service). */
export const EMPLOYMENT_TYPES = ['Tetap'];

export const ACCRUAL_POLICIES: AccrualPolicy[] = [
  {
    id: 'policy-annual-tetap',
    leaveTypeId: 'lt-annual',
    employmentType: 'Tetap',
    isEligible: true,
    ratePerMonth: 1,
    maxBalanceDays: 24,
    carryOverPolicy: 'CARRY_CAPPED',
    carryOverMaxDays: 6,
    carryOverExpiry: '03-31',
    effectiveFrom: '2026-01-01',
    effectiveUntil: null,
  },
  {
    id: 'policy-annual-2025',
    leaveTypeId: 'lt-annual',
    employmentType: 'Tetap',
    isEligible: true,
    ratePerMonth: 1,
    maxBalanceDays: 24,
    carryOverPolicy: 'CARRY_FULL',
    carryOverMaxDays: null,
    carryOverExpiry: null,
    effectiveFrom: '2025-01-01',
    effectiveUntil: '2025-12-31',
  },
  {
    id: 'policy-sick-tetap',
    leaveTypeId: 'lt-sick',
    employmentType: 'Tetap',
    isEligible: true,
    ratePerMonth: 0,
    maxBalanceDays: 12,
    carryOverPolicy: 'FORFEIT',
    carryOverMaxDays: null,
    carryOverExpiry: null,
    effectiveFrom: '2026-01-01',
    effectiveUntil: null,
  },
];
