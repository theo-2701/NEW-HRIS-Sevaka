import type {
  Actor,
  CashAdvance,
  CashAdvanceConfig,
  Difference,
  PurposeType,
  RejectionReason,
  Settlement,
} from '@/features/cash-advance/types';

/**
 * Dataset skenario positif FSD/UIC-001-FINANCE 0.2 (company PTDIKA) — disalin dari
 * `_prototype/js/finance-data.js`, dengan enum yang diluruskan ke ERD §6.6–§6.7:
 *  • status selisih `OUTSTANDING` di prototype bukan nilai ERD → `OPEN`;
 *  • `item.status = null` di prototype → `item_status` bawaan ERD `ACCEPTED`;
 *  • tahap pertanggungjawaban diberi `settlement_no`/`stage_no` sesuai ERD;
 *  • kekurangan `dif-78` berstatus `APPROVED` — dataset FT5 (UIC §6.2) masih memuatnya
 *    sebagai payable belum ditandai; `SETTLED` ditulis layar Pencairan & Piutang.
 */

export const EMPLOYEES = [
  { id: 'emp-budi', name: 'Budi Santoso', nik: '2019-0451', unit: 'Finance Operations', grade: 'Staff Grade 2' },
  { id: 'emp-sinta', name: 'Sinta Dewi', nik: '2016-0122', unit: 'Finance Operations', grade: 'Manager Grade 1' },
  { id: 'emp-rahmat', name: 'Rahmat Hidayat', nik: '2015-0087', unit: 'Corporate Finance', grade: 'Staff Grade 3' },
  { id: 'emp-ari', name: 'Ari Wibowo', nik: '2014-0033', unit: 'Human Capital', grade: 'Manager Grade 2' },
  { id: 'emp-maya', name: 'Maya Puspita', nik: '2018-0290', unit: 'Human Capital', grade: 'Staff Grade 2' },
];

/** Garis pelaporan: atasan langsung memutus tahap, atasan berikutnya lapis tambahan. */
export const MANAGER_OF: Record<string, string> = {
  'emp-budi': 'emp-sinta',
  'emp-sinta': 'emp-ari',
  'emp-maya': 'emp-ari',
  'emp-rahmat': 'emp-ari',
};

/** Aktor uji UIC §1.7 — pemilih identitas di layar. */
export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'emp-budi', role: 'ROLE_EMPLOYEE', label: 'Budi Santoso · Employee' },
  { employeeId: 'emp-rahmat', role: 'ROLE_FINANCE_OFFICER', label: 'Rahmat Hidayat · Finance Officer' },
  { employeeId: 'emp-sinta', role: 'ROLE_DEPT_MANAGER', label: 'Sinta Dewi · Dept Manager' },
  { employeeId: 'emp-ari', role: 'ROLE_HR_MANAGER', label: 'Ari Wibowo · HR Manager' },
];

/**
 * Setelan company skenario. TSD §16 membawakan `enabled=false` dan
 * `max_outstanding_count=1`; dataset menyalakan modul dan sudah memegang dua
 * uang muka terbuka untuk Budi, jadi batas skenario ini `3` (nilai prototype).
 */
export const CASH_ADVANCE_CFG: CashAdvanceConfig = {
  enabled: true,
  maxOutstandingCount: 3,
  secondStageDeadlineDays: 30,
};

export const PURPOSE_TYPES: PurposeType[] = [
  { id: 'pt-1', name: 'Dinas Luar Kota', isOfficialTravel: true, requiresReceipt: true, maxAmount: 5_000_000, isUnlimitedAck: false, isActive: true },
  { id: 'pt-2', name: 'Dinas Luar Negeri', isOfficialTravel: true, requiresReceipt: true, maxAmount: 25_000_000, isUnlimitedAck: false, isActive: true },
  { id: 'pt-3', name: 'Pengadaan Operasional', isOfficialTravel: false, requiresReceipt: true, maxAmount: 10_000_000, isUnlimitedAck: false, isActive: true },
  { id: 'pt-4', name: 'Kegiatan Sosial', isOfficialTravel: false, requiresReceipt: true, maxAmount: null, isUnlimitedAck: true, isActive: true },
  { id: 'pt-5', name: 'Biaya Tak Terduga', isOfficialTravel: false, requiresReceipt: false, maxAmount: null, isUnlimitedAck: false, isActive: true },
];

export const REJECTION_REASONS: RejectionReason[] = [
  { id: 'rr-1', name: 'Incomplete receipt evidence', requiresFreeText: false, isActive: true },
  { id: 'rr-2', name: 'Outside company policy', requiresFreeText: false, isActive: true },
  { id: 'rr-3', name: 'Exceeds the entitlement', requiresFreeText: false, isActive: true },
  { id: 'rr-4', name: 'Submitted data does not match', requiresFreeText: true, isActive: true },
  { id: 'rr-5', name: 'Other', requiresFreeText: true, isActive: true },
  { id: 'rr-6', name: 'Cost estimate is unreasonable', requiresFreeText: true, isActive: true },
];

const bca = { bankCode: 'BCA', accountNumber: '****4567', accountHolderName: 'Budi Santoso' };

export const ADVANCES: CashAdvance[] = [
  {
    id: 'adv-78', requestNo: 'ADV-2026-000078', recipientEmployeeId: 'emp-budi', createdOnBehalfEmployeeId: null,
    purposeTypeId: 'pt-1', purposeTypeName: 'Dinas Luar Kota', isOfficialTravelSnapshot: true, maxAmountSnapshot: 5_000_000,
    amount: 3_000_000, travelStartDate: '2026-07-14', travelEndDate: '2026-07-17', status: 'SETTLED', createdAt: '2026-07-10',
    workflowInstanceId: '8c00…0078', bankAccountSnapshot: bca, costCenterIdSnapshot: null,
    travelCancelledAt: null, travelCancelReason: null, disbursementMarked: true,
  },
  {
    id: 'adv-81', requestNo: 'ADV-2026-000081', recipientEmployeeId: 'emp-maya', createdOnBehalfEmployeeId: 'emp-rahmat',
    purposeTypeId: 'pt-3', purposeTypeName: 'Pengadaan Operasional', isOfficialTravelSnapshot: false, maxAmountSnapshot: 10_000_000,
    amount: 4_500_000, travelStartDate: null, travelEndDate: null, status: 'APPROVED', createdAt: '2026-07-21',
    workflowInstanceId: '8c00…0081', bankAccountSnapshot: { bankCode: 'MANDIRI', accountNumber: '****8812', accountHolderName: 'Maya Puspita' },
    costCenterIdSnapshot: null, travelCancelledAt: null, travelCancelReason: null, disbursementMarked: false,
  },
  {
    id: 'adv-84', requestNo: 'ADV-2026-000084', recipientEmployeeId: 'emp-budi', createdOnBehalfEmployeeId: null,
    purposeTypeId: 'pt-2', purposeTypeName: 'Dinas Luar Negeri', isOfficialTravelSnapshot: true, maxAmountSnapshot: 25_000_000,
    amount: 18_000_000, travelStartDate: '2026-08-10', travelEndDate: '2026-08-16', status: 'SUBMITTED', createdAt: '2026-08-01',
    workflowInstanceId: '8c00…0084', bankAccountSnapshot: bca, costCenterIdSnapshot: null,
    travelCancelledAt: null, travelCancelReason: null, disbursementMarked: false,
  },
  {
    id: 'adv-86', requestNo: 'ADV-2026-000086', recipientEmployeeId: 'emp-budi', createdOnBehalfEmployeeId: null,
    purposeTypeId: 'pt-1', purposeTypeName: 'Dinas Luar Kota', isOfficialTravelSnapshot: true, maxAmountSnapshot: 5_000_000,
    amount: 2_000_000, travelStartDate: '2026-08-24', travelEndDate: '2026-08-26', status: 'APPROVED', createdAt: '2026-08-04',
    workflowInstanceId: '8c00…0086', bankAccountSnapshot: bca, costCenterIdSnapshot: null,
    travelCancelledAt: null, travelCancelReason: null, disbursementMarked: false,
  },
];

export const SETTLEMENTS: Settlement[] = [
  {
    id: 'stl-78', cashAdvanceId: 'adv-78', settlementNo: 'ADV-2026-000078#1', stageNo: 1, isFinalStage: true, isCorrection: false,
    status: 'ACCEPTED', submittedAt: '2026-07-18', reviewedBy: 'emp-rahmat', decidedBy: 'emp-sinta',
    items: [
      { id: 'sti-1', expenseDate: '2026-07-14', amount: 1_500_000, receiptNo: 'HTL-CIWALK/2026/0098', documentId: 'doc-uuid-1', itemStatus: 'ACCEPTED', flaggedReasonId: null },
      { id: 'sti-2', expenseDate: '2026-07-16', amount: 1_350_000, receiptNo: 'GRB-TRX-8820134', documentId: 'doc-uuid-2', itemStatus: 'ACCEPTED', flaggedReasonId: null },
    ],
    similarityWarnings: [],
  },
  {
    id: 'stl-81', cashAdvanceId: 'adv-81', settlementNo: 'ADV-2026-000081#1', stageNo: 1, isFinalStage: true, isCorrection: false,
    status: 'SUBMITTED', submittedAt: '2026-08-02', reviewedBy: null, decidedBy: null,
    items: [
      { id: 'sti-3', expenseDate: '2026-07-28', amount: 2_600_000, receiptNo: 'TB-MAKMUR/2026/07/0231', documentId: 'doc-uuid-3', itemStatus: 'ACCEPTED', flaggedReasonId: null },
      { id: 'sti-4', expenseDate: '2026-07-29', amount: 1_400_000, receiptNo: '', documentId: 'doc-uuid-4', itemStatus: 'ACCEPTED', flaggedReasonId: null },
      { id: 'sti-5', expenseDate: '2026-07-29', amount: 1_400_000, receiptNo: 'TB-MAKMUR/2026/07/0244', documentId: 'doc-uuid-5', itemStatus: 'ACCEPTED', flaggedReasonId: null },
    ],
    similarityWarnings: [{ itemId: 'sti-5', matchedModule: 'CASH_ADVANCE', matchedDate: '2026-07-29', matchedAmount: 1_400_000 }],
  },
];

export const DIFFERENCES: Difference[] = [
  {
    id: 'dif-78', cashAdvanceId: 'adv-78', closingSettlementId: 'stl-78', requestNo: 'ADV-2026-000078', employeeId: 'emp-budi',
    differenceType: 'SHORTFALL', amount: 150_000, settlementMethod: null, requiresExtraApproval: false, dueDate: null,
    status: 'APPROVED', settlementDecidedBy: 'emp-sinta',
  },
  {
    id: 'dif-72', cashAdvanceId: 'adv-72', closingSettlementId: 'stl-72', requestNo: 'ADV-2026-000072', employeeId: 'emp-maya',
    differenceType: 'SURPLUS', amount: 320_000, settlementMethod: null, requiresExtraApproval: false, dueDate: '2026-08-15',
    status: 'OPEN', settlementDecidedBy: 'emp-ari',
  },
];

export function employeeOf(id: string | null | undefined) {
  return EMPLOYEES.find((row) => row.id === id);
}

export function employeeName(id: string | null | undefined): string {
  return employeeOf(id)?.name ?? '—';
}
