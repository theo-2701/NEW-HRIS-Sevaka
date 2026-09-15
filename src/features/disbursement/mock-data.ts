import type { Actor, DisbursementMark, OutstandingClearance } from '@/features/disbursement/types';

/**
 * Dataset skenario positif FSD/UIC-001-FINANCE 0.2 (company PTDIKA) untuk FT5.
 *
 * Baris "belum ditandai" **tidak** diseed di sini: daftar Pencairan diturunkan
 * hidup dari tabel sumber modul Benefit, Loan, dan Cash Advance (TSD §3.1), jadi
 * klaim yang disetujui di layar Benefit langsung muncul di layar ini. Yang diseed
 * hanya penanda yang sudah ada di dataset (UIC §6.2 contoh 1).
 *
 * Kolom `exit_date` di prototype bukan kolom `emp_outstanding_clearance` (ERD §6.8)
 * — tidak dibawa.
 */

export { EMPLOYEES, employeeName, employeeOf } from '@/features/cash-advance/mock-data';

/** Aktor uji UIC §1.7 — Budi disertakan untuk memperlihatkan nol akses (403). */
export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER', label: 'Rahmat Hidayat · Finance Officer' },
  { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER', label: 'Ari Wibowo · HR Manager' },
  { employeeId: 'emp-budi', role: 'ROLE_EMPLOYEE', label: 'Budi Santoso · Employee' },
];

export const MARKS: DisbursementMark[] = [
  {
    id: 'mark-claim-000045-1', actionId: 'act-rahmat-0713', payableType: 'BENEFIT_CLAIM', payableId: 'clm-45',
    requestNoSnapshot: 'CLM-2026-000045', amount: 850_000, paymentMethod: 'BANK_TRANSFER', markSource: 'MANUAL',
    markedAt: '2026-07-13T10:00:00+07:00', markedAtTimezone: 'Asia/Jakarta', actualPaidAt: null,
    reasonNote: 'Transfer batch mingguan 13 Jul 2026', reversalOfMarkId: null, createdBy: 'emp-rahmat',
  },
  {
    id: 'mark-loan-000012-1', actionId: 'act-payroll-0725', payableType: 'LOAN', payableId: 'loan-12',
    requestNoSnapshot: 'LON-2026-000012', amount: 20_000_000, paymentMethod: 'WITH_PAYROLL', markSource: 'CLIENT_SYSTEM',
    markedAt: '2026-07-25T00:05:00+07:00', markedAtTimezone: 'Asia/Jakarta', actualPaidAt: null,
    reasonNote: null, reversalOfMarkId: null, createdBy: 'CLIENT_SYSTEM',
  },
];

export const CLEARANCES: OutstandingClearance[] = [
  {
    id: 'oc-budi-santoso-1', employeeId: 'emp-budi', outstandingAmount: 19_433_333, status: 'OUTSTANDING',
    settledReasonNote: null, resolvedAt: null, resolvedAtTimezone: null, createdAt: '2026-07-28', updatedBy: null,
  },
  {
    id: 'oc-maya-1', employeeId: 'emp-maya', outstandingAmount: 2_100_000, status: 'CLEARED_BY_REPAYMENT',
    settledReasonNote: null, resolvedAt: '2026-06-28', resolvedAtTimezone: 'Asia/Jakarta', createdAt: '2026-05-30',
    updatedBy: 'SYSTEM',
  },
  {
    id: 'oc-rahmat-1', employeeId: 'emp-rahmat', outstandingAmount: 640_000, status: 'DECLARED_SETTLED',
    settledReasonNote: 'Dihapusbukukan, nominal di bawah ambang penagihan', resolvedAt: '2026-04-02',
    resolvedAtTimezone: 'Asia/Jakarta', createdAt: '2026-03-14', updatedBy: 'emp-ari',
  },
];
