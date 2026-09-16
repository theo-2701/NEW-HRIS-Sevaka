import type {
  Actor,
  ChangeBatch,
  IndividualProposal,
  SalaryComponent,
} from '@/features/payroll-authorization/types';

/**
 * Dataset skenario positif UIC-001-PAYROLL §1.6 sisi Pemeriksa. Maya memutuskan, Rudi hanya
 * tampil sebagai pengaju, dan Hesti adalah penyetuju eskalasi `CD-013` untuk kumpulan massal.
 */

export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'emp-maya', role: 'ROLE_HR_MANAGER', label: 'Maya Anggraini · HR Manager' },
  { employeeId: 'emp-hesti', role: 'ROLE_ESCALATION_APPROVER', label: 'Hesti Wulandari · Penyetuju eskalasi' },
  { employeeId: 'emp-rudi', role: 'ROLE_PAYROLL_OFFICER', label: 'Rudi Hartono · Payroll Officer' },
];

export const ESCALATION_APPROVER_ID = 'emp-hesti';

const at = (date: string, time = '09:00') => `${date}T${time}:00+07:00`;

const component = (
  code: string,
  name: string,
  traits: { fixed: boolean; overtime: boolean; taxable: boolean; bpjs: boolean },
  usedByEmployees: number,
): SalaryComponent => ({
  id: code,
  componentCode: code,
  name,
  isFixed: traits.fixed,
  isOvertimeBasis: traits.overtime,
  isTaxable: traits.taxable,
  isBpjsBase: traits.bpjs,
  proposalState: 'AKTIF',
  proposedIsOvertimeBasis: null,
  proposedEffectiveFrom: null,
  proposedBy: null,
  proposedAt: null,
  approvedBy: null,
  approvedAt: null,
  usedByEmployees,
});

export const COMPONENT_SEED: SalaryComponent[] = [
  component('SC-001', 'Gaji Pokok', { fixed: true, overtime: true, taxable: true, bpjs: true }, 34),
  component('SC-002', 'Tunjangan Jabatan', { fixed: true, overtime: true, taxable: true, bpjs: true }, 12),
  {
    ...component('SC-003', 'Tunjangan Transport', { fixed: true, overtime: false, taxable: true, bpjs: false }, 28),
    proposalState: 'MENUNGGU_PERSETUJUAN',
    proposedIsOvertimeBasis: true,
    proposedEffectiveFrom: '2026-09-01',
    proposedBy: 'emp-rudi',
    proposedAt: at('2026-08-18'),
  },
  component('SC-004', 'Tunjangan Makan', { fixed: false, overtime: false, taxable: true, bpjs: false }, 30),
  component('SC-005', 'Uang Lembur', { fixed: false, overtime: false, taxable: true, bpjs: false }, 18),
  component('SC-006', 'Insentif Kinerja', { fixed: false, overtime: false, taxable: true, bpjs: false }, 9),
  component('SC-007', 'Tunjangan Komunikasi', { fixed: true, overtime: false, taxable: true, bpjs: false }, 7),
  component('SC-008', 'Tunjangan Shift', { fixed: false, overtime: false, taxable: true, bpjs: false }, 0),
];

export const PROPOSAL_SEED: IndividualProposal[] = [
  {
    id: 'PRP-0001',
    employeeId: 'pay-bayu',
    salaryComponentId: 'SC-001',
    amount: 4500000,
    effectiveFrom: '2026-09-01',
    sourceChannel: 'CHANGE',
    approvalState: 'MENUNGGU_PERSETUJUAN',
    createdBy: 'emp-rudi',
    createdAt: at('2026-08-25'),
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    previousAmount: 4300000,
  },
  {
    id: 'PRP-9001',
    employeeId: 'pay-indah',
    salaryComponentId: 'SC-001',
    amount: 5600000,
    effectiveFrom: '2026-01-01',
    sourceChannel: 'CHANGE',
    approvalState: 'DISETUJUI',
    createdBy: 'emp-rudi',
    createdAt: at('2025-12-28'),
    approvedBy: 'emp-maya',
    approvedAt: at('2026-01-02'),
    rejectionReason: null,
    previousAmount: 5000000,
  },
  {
    id: 'PRP-9002',
    employeeId: 'pay-dewi',
    salaryComponentId: 'SC-001',
    amount: 4600000,
    effectiveFrom: '2026-08-01',
    sourceChannel: 'CHANGE',
    approvalState: 'DITOLAK',
    createdBy: 'emp-rudi',
    createdAt: at('2026-07-12'),
    approvedBy: 'emp-maya',
    approvedAt: at('2026-07-15'),
    rejectionReason:
      'Nominal melebihi pagu kenaikan cabang Bandung semester ini — ajukan ulang pada siklus berikutnya.',
    previousAmount: 4000000,
  },
];

export const BATCH_SEED: ChangeBatch[] = [
  {
    id: 'BATCH-0001',
    batchName: 'Kenaikan Berkala Semester 2 2026',
    status: 'MENUNGGU_PERSETUJUAN',
    requiresEscalation: true,
    escalationApproverId: ESCALATION_APPROVER_ID,
    impactSummary: {
      affectedCount: 6,
      netCostShiftAmount: 900000,
      salaryDecreaseList: [],
      belowUmpAfterChangeList: [],
      missingCostCenterOrSbuList: ['Agus Salim'],
    },
    createdBy: 'emp-rudi',
    createdAt: at('2026-08-25', '00:00'),
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    items: [
      { employeeId: 'pay-dewi', salaryComponentId: 'SC-001', amountDelta: 200000 },
      { employeeId: 'pay-agus', salaryComponentId: 'SC-001', amountDelta: 150000 },
      { employeeId: 'pay-fajar', salaryComponentId: 'SC-001', amountDelta: 200000 },
      { employeeId: 'pay-yusuf', salaryComponentId: 'SC-001', amountDelta: 150000 },
      { employeeId: 'pay-rina', salaryComponentId: 'SC-001', amountDelta: 100000 },
      { employeeId: 'pay-bayu', salaryComponentId: 'SC-004', amountDelta: 100000 },
    ],
  },
  {
    id: 'BATCH-0002',
    batchName: 'Penyesuaian Tunjangan Komunikasi 2026',
    status: 'DRAFT',
    requiresEscalation: false,
    escalationApproverId: null,
    impactSummary: null,
    createdBy: null,
    createdAt: null,
    decidedBy: null,
    decidedAt: null,
    rejectionReason: null,
    items: [{ employeeId: 'pay-cahyo', salaryComponentId: 'SC-007', amountDelta: 150000 }],
  },
];

export const COMPONENT_NAME: Record<string, string> = Object.fromEntries(
  COMPONENT_SEED.map((row) => [row.componentCode, row.name]),
);
