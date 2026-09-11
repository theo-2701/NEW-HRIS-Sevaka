import type {
  BenefitClaim,
  BenefitPeriod,
  BenefitType,
  Beneficiary,
  DisputeHold,
  Entitlement,
  FamilyRelationshipRule,
  LedgerEntry,
  Payable,
  RejectionReason,
  Relative,
} from '@/features/benefit/types';

/**
 * Dataset skenario positif FSD/UIC-001-FINANCE 0.2 (company PTDIKA) — disalin
 * apa adanya. Jangan mengarang baris baru di sini.
 */

/** Identitas yang sedang login di layar ini (pengganti token). */
export const ME = 'emp-budi';

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

export const BENEFIT_TYPES: BenefitType[] = [
  { id: 'bt-rawat-jalan', name: 'Pengobatan Rawat Jalan', requiresReceipt: true, allowsFamilyClaim: true, containsHealthData: true, isActive: true },
  { id: 'bt-rawat-inap', name: 'Pengobatan Rawat Inap', requiresReceipt: true, allowsFamilyClaim: true, containsHealthData: true, isActive: true },
  { id: 'bt-kacamata', name: 'Kacamata', requiresReceipt: true, allowsFamilyClaim: false, containsHealthData: false, isActive: true },
  { id: 'bt-melahirkan', name: 'Melahirkan', requiresReceipt: true, allowsFamilyClaim: true, containsHealthData: true, isActive: true },
  { id: 'bt-fitness', name: 'Fitness Allowance', requiresReceipt: false, allowsFamilyClaim: false, containsHealthData: false, isActive: false },
];

export const ENTITLEMENTS: Entitlement[] = [
  { id: 'ent-1', benefitTypeId: 'bt-rawat-jalan', jobGradeId: 'jg-staff-2', annualAmount: 5_000_000 },
  { id: 'ent-2', benefitTypeId: 'bt-rawat-jalan', jobGradeId: 'jg-mgr-1', annualAmount: 9_000_000 },
  { id: 'ent-3', benefitTypeId: 'bt-rawat-inap', jobGradeId: 'jg-staff-2', annualAmount: 15_000_000 },
  { id: 'ent-4', benefitTypeId: 'bt-kacamata', jobGradeId: 'jg-staff-2', annualAmount: 1_500_000 },
  { id: 'ent-5', benefitTypeId: 'bt-melahirkan', jobGradeId: 'jg-staff-2', annualAmount: 12_000_000 },
];

export const FAMILY_RELATIONSHIP_RULES: FamilyRelationshipRule[] = [
  { id: 'fr-1', relationshipType: 'SPOUSE', isEligible: true },
  { id: 'fr-2', relationshipType: 'CHILD', isEligible: true },
  { id: 'fr-3', relationshipType: 'PARENT', isEligible: true },
  { id: 'fr-4', relationshipType: 'SIBLING', isEligible: false },
  { id: 'fr-5', relationshipType: 'OTHER', isEligible: false },
];

export const PERIODS: BenefitPeriod[] = [
  {
    periodId: 'bp-2026',
    label: 'Period 2026',
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    graceEnd: '2027-01-31',
    status: 'OPEN',
    balances: [
      { benefitTypeId: 'bt-rawat-jalan', benefitTypeName: 'Pengobatan Rawat Jalan', entitledAmount: 5_000_000, usedAmount: 850_000, reservedAmount: 1_250_000 },
      { benefitTypeId: 'bt-rawat-inap', benefitTypeName: 'Pengobatan Rawat Inap', entitledAmount: 15_000_000, usedAmount: 0, reservedAmount: 0 },
      { benefitTypeId: 'bt-kacamata', benefitTypeName: 'Kacamata', entitledAmount: 1_500_000, usedAmount: 1_500_000, reservedAmount: 0 },
      { benefitTypeId: 'bt-melahirkan', benefitTypeName: 'Melahirkan', entitledAmount: 12_000_000, usedAmount: 0, reservedAmount: 0 },
    ],
  },
  {
    periodId: 'bp-2025',
    label: 'Period 2025 (grace)',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    graceEnd: '2026-01-31',
    status: 'GRACE',
    balances: [
      { benefitTypeId: 'bt-rawat-jalan', benefitTypeName: 'Pengobatan Rawat Jalan', entitledAmount: 5_000_000, usedAmount: 4_100_000, reservedAmount: 0 },
      { benefitTypeId: 'bt-kacamata', benefitTypeName: 'Kacamata', entitledAmount: 1_500_000, usedAmount: 0, reservedAmount: 0 },
    ],
  },
];

export const BENEFICIARIES: Beneficiary[] = [
  { id: 'ben-siti', relativeId: 'rel-siti', name: 'Siti Aminah', relationshipType: 'SPOUSE', isActive: true, slotConsumed: true },
  { id: 'ben-aditya', relativeId: 'rel-adit', name: 'Aditya Santoso', relationshipType: 'CHILD', isActive: true, slotConsumed: false },
  { id: 'ben-sri', relativeId: 'rel-sri', name: 'Sri Wahyuni', relationshipType: 'PARENT', isActive: false, slotConsumed: false },
];

/** `employee_profile.mst_relative` milik karyawan yang login. */
export const RELATIVES: Relative[] = [
  { id: 'rel-siti', name: 'Siti Aminah', relationshipType: 'SPOUSE' },
  { id: 'rel-adit', name: 'Aditya Santoso', relationshipType: 'CHILD' },
  { id: 'rel-sri', name: 'Sri Wahyuni', relationshipType: 'PARENT' },
  { id: 'rel-yuni', name: 'Yuni Santoso', relationshipType: 'SIBLING' },
];

const BCA = { bankCode: 'BCA', accountNumber: '****4567', accountHolderName: 'Budi Santoso' };

export const CLAIMS: BenefitClaim[] = [
  {
    id: 'clm-45', requestNo: 'CLM-2026-000045', employeeId: 'emp-budi', benefitTypeId: 'bt-rawat-jalan',
    benefitTypeName: 'Pengobatan Rawat Jalan', periodId: 'bp-2026', totalAmount: 850_000, status: 'APPROVED',
    reservationState: 'CONSUMED', containsHealthDataSnapshot: true, submittedAt: '2026-07-10',
    decidedAt: '2026-07-12', decidedBy: 'emp-sinta', bankAccountSnapshot: BCA, costCenterIdSnapshot: null,
    items: [
      { id: 'ci-45-1', expenseDate: '2026-07-08', amount: 850_000, beneficiaryKind: 'FAMILY_MEMBER', beneficiaryId: 'ben-siti', beneficiaryRelationshipSnapshot: 'SPOUSE', receiptNo: 'RS-MELATI/2026/07/0231', documentId: 'doc-rs-melati-0231' },
    ],
    similarityWarnings: [],
  },
  {
    id: 'clm-46', requestNo: 'CLM-2026-000046', employeeId: 'emp-budi', benefitTypeId: 'bt-rawat-jalan',
    benefitTypeName: 'Pengobatan Rawat Jalan', periodId: 'bp-2026', totalAmount: 1_250_000, status: 'SUBMITTED',
    reservationState: 'HELD', containsHealthDataSnapshot: true, submittedAt: '2026-07-22',
    decidedAt: null, decidedBy: null, bankAccountSnapshot: BCA, costCenterIdSnapshot: null,
    items: [
      { id: 'ci-46-1', expenseDate: '2026-07-18', amount: 700_000, beneficiaryKind: 'SELF', beneficiaryId: null, beneficiaryRelationshipSnapshot: null, receiptNo: 'RS-MELATI/2026/07/0388', documentId: 'doc-rs-melati-0388' },
      { id: 'ci-46-2', expenseDate: '2026-07-20', amount: 550_000, beneficiaryKind: 'FAMILY_MEMBER', beneficiaryId: 'ben-aditya', beneficiaryRelationshipSnapshot: 'CHILD', receiptNo: 'KLN-SEHAT/2026/07/1102', documentId: 'doc-kln-sehat-1102' },
    ],
    similarityWarnings: [{ itemId: 'ci-46-1', matchedModule: 'CASH_ADVANCE', matchedDate: '2026-07-18', matchedAmount: 700_000 }],
  },
  {
    id: 'clm-41', requestNo: 'CLM-2026-000041', employeeId: 'emp-maya', benefitTypeId: 'bt-kacamata',
    benefitTypeName: 'Kacamata', periodId: 'bp-2026', totalAmount: 1_500_000, status: 'APPROVED',
    reservationState: 'CONSUMED', containsHealthDataSnapshot: false, submittedAt: '2026-06-03',
    decidedAt: '2026-06-05', decidedBy: 'emp-sinta',
    bankAccountSnapshot: { bankCode: 'MANDIRI', accountNumber: '****8812', accountHolderName: 'Maya Puspita' },
    costCenterIdSnapshot: null,
    items: [
      { id: 'ci-41-1', expenseDate: '2026-06-01', amount: 1_500_000, beneficiaryKind: 'SELF', beneficiaryId: null, beneficiaryRelationshipSnapshot: null, receiptNo: 'OPT-VISI/2026/06/0044', documentId: 'doc-opt-visi-0044' },
    ],
    similarityWarnings: [],
  },
  {
    id: 'clm-38', requestNo: 'CLM-2026-000038', employeeId: 'emp-budi', benefitTypeId: 'bt-rawat-jalan',
    benefitTypeName: 'Pengobatan Rawat Jalan', periodId: 'bp-2026', totalAmount: 420_000, status: 'REJECTED',
    reservationState: 'RELEASED', containsHealthDataSnapshot: true, submittedAt: '2026-05-14',
    decidedAt: '2026-05-16', decidedBy: 'emp-sinta', reasonId: 'rr-1',
    reasonNote: 'Nota tidak memuat nomor dan tanggal yang dapat diverifikasi.',
    bankAccountSnapshot: BCA, costCenterIdSnapshot: null,
    items: [
      { id: 'ci-38-1', expenseDate: '2026-05-12', amount: 420_000, beneficiaryKind: 'SELF', beneficiaryId: null, beneficiaryRelationshipSnapshot: null, receiptNo: 'APT-SEHAT/2026/05/0912', documentId: 'doc-apt-sehat-0912' },
    ],
    similarityWarnings: [],
  },
  {
    id: 'clm-33', requestNo: 'CLM-2026-000033', employeeId: 'emp-budi', benefitTypeId: 'bt-kacamata',
    benefitTypeName: 'Kacamata', periodId: 'bp-2026', totalAmount: 900_000, status: 'CANCELLED',
    reservationState: 'RELEASED', containsHealthDataSnapshot: false, submittedAt: '2026-04-02',
    decidedAt: null, decidedBy: null, bankAccountSnapshot: BCA, costCenterIdSnapshot: null,
    items: [
      { id: 'ci-33-1', expenseDate: '2026-04-01', amount: 900_000, beneficiaryKind: 'SELF', beneficiaryId: null, beneficiaryRelationshipSnapshot: null, receiptNo: 'OPT-VISI/2026/04/0011', documentId: 'doc-opt-visi-0011' },
    ],
    similarityWarnings: [],
  },
];

/** `log_benefit_balance_ledger` — saldo berjalan dihitung di layar, bukan kolom tersimpan. */
export const LEDGER: LedgerEntry[] = [
  { id: 'lg-1', createdAt: '2026-04-02', entryType: 'RESERVATION', amount: 900_000, benefitTypeName: 'Kacamata', sourceClaimId: 'clm-33', requestNo: 'CLM-2026-000033' },
  { id: 'lg-2', createdAt: '2026-04-05', entryType: 'RELEASE', amount: 900_000, benefitTypeName: 'Kacamata', sourceClaimId: 'clm-33', requestNo: 'CLM-2026-000033' },
  { id: 'lg-3', createdAt: '2026-05-14', entryType: 'RESERVATION', amount: 420_000, benefitTypeName: 'Pengobatan Rawat Jalan', sourceClaimId: 'clm-38', requestNo: 'CLM-2026-000038' },
  { id: 'lg-4', createdAt: '2026-05-16', entryType: 'RELEASE', amount: 420_000, benefitTypeName: 'Pengobatan Rawat Jalan', sourceClaimId: 'clm-38', requestNo: 'CLM-2026-000038' },
  { id: 'lg-5', createdAt: '2026-07-10', entryType: 'RESERVATION', amount: 850_000, benefitTypeName: 'Pengobatan Rawat Jalan', sourceClaimId: 'clm-45', requestNo: 'CLM-2026-000045' },
  { id: 'lg-6', createdAt: '2026-07-12', entryType: 'USAGE', amount: 850_000, benefitTypeName: 'Pengobatan Rawat Jalan', sourceClaimId: 'clm-45', requestNo: 'CLM-2026-000045' },
  { id: 'lg-7', createdAt: '2026-07-22', entryType: 'RESERVATION', amount: 1_250_000, benefitTypeName: 'Pengobatan Rawat Jalan', sourceClaimId: 'clm-46', requestNo: 'CLM-2026-000046' },
];

export const PAYABLES: Payable[] = [
  {
    payableType: 'BENEFIT_CLAIM', payableId: 'clm-45', requestNo: 'CLM-2026-000045', employeeId: 'emp-budi',
    amount: 850_000, submittedAt: '2026-07-10', markStatus: 'MARKED',
    mark: { disbursementMarkId: 'mark-claim-000045-1', markedAt: '2026-07-13', markSource: 'MANUAL', paymentMethod: 'BANK_TRANSFER', actionId: 'act-rahmat-0713', reasonNote: 'Transfer batch mingguan 13 Jul 2026' },
  },
  {
    payableType: 'BENEFIT_CLAIM', payableId: 'clm-41', requestNo: 'CLM-2026-000041', employeeId: 'emp-maya',
    amount: 1_500_000, submittedAt: '2026-06-03', markStatus: 'UNMARKED', mark: null,
  },
];

export const HOLDS: DisputeHold[] = [
  { id: 'hold-46', targetType: 'BENEFIT_CLAIM', targetId: 'clm-46', targetRequestNo: 'CLM-2026-000046', isActive: true },
  { id: 'hold-21', targetType: 'LOAN', targetId: 'loan-21', targetRequestNo: 'LON-2026-000021', isActive: true },
];

export const REJECTION_REASONS: RejectionReason[] = [
  { id: 'rr-1', name: 'Incomplete receipt evidence', requiresFreeText: false, isSystemDefault: true, isActive: true },
  { id: 'rr-2', name: 'Outside company policy', requiresFreeText: false, isSystemDefault: true, isActive: true },
  { id: 'rr-3', name: 'Exceeds the entitlement', requiresFreeText: false, isSystemDefault: true, isActive: true },
  { id: 'rr-4', name: 'Submitted data does not match', requiresFreeText: true, isSystemDefault: true, isActive: true },
  { id: 'rr-5', name: 'Other', requiresFreeText: true, isSystemDefault: true, isActive: true },
  { id: 'rr-6', name: 'Cost estimate is unreasonable', requiresFreeText: true, isSystemDefault: false, isActive: true },
];

export function employeeName(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.name ?? '—';
}

export function employeeOf(id: string) {
  return EMPLOYEES.find((row) => row.id === id);
}

export function gradeName(id: string): string {
  return JOB_GRADES.find((row) => row.id === id)?.name ?? id;
}

export function benefitTypeName(id: string): string {
  return BENEFIT_TYPES.find((row) => row.id === id)?.name ?? id;
}
