import type {
  Actor,
  Finding,
  FindingTypeInfo,
  HistoryImport,
  ParamSnapshot,
  PayrollPeriod,
  Role,
  StateChange,
} from '@/features/salary-processing/types';

/**
 * Dataset skenario positif UIC-001-PAYROLL §1.6 (company PTDIKA). Rudi = Penjalan, Maya = Pemeriksa.
 * Dimas adalah Penjalan kedua di luar dataset kontrak — hanya agar jalur koreksi impor oleh
 * maker yang berbeda bisa dicoba.
 */

export interface PayrollEmployee {
  name: string;
  nik: string;
  position: string;
  branch: string;
}

export const EMPLOYEES: Record<string, PayrollEmployee> = {
  'pay-dewi': { name: 'Dewi Lestari', nik: '3273010101950002', position: 'Staff Marketing', branch: 'Bandung' },
  'pay-bambang': { name: 'Bambang Suryono', nik: '3273010101880007', position: 'Teknisi Lapangan', branch: 'Bandung' },
  'pay-agus': { name: 'Agus Salim', nik: '3174050203910011', position: 'Staff Gudang', branch: 'Jakarta Pusat' },
  'pay-indah': { name: 'Indah Permatasari', nik: '3174050512930004', position: 'Supervisor Keuangan', branch: 'Jakarta Pusat' },
  'pay-bayu': { name: 'Bayu Setiawan', nik: '3374011807940009', position: 'Staff Penjualan', branch: 'Semarang' },
  'pay-cahyo': { name: 'Cahyo Prasetyo', nik: '3174052209890015', position: 'Analis Data', branch: 'Jakarta Pusat' },
};

export const PEOPLE: Record<string, string> = {
  'emp-rudi': 'Rudi Hartono',
  'emp-maya': 'Maya Anggraini',
  'emp-dimas': 'Dimas Pratama',
  SYSTEM: 'Sistem',
};

export const ROLE_OF: Record<string, Role> = {
  'emp-rudi': 'ROLE_PAYROLL_OFFICER',
  'emp-maya': 'ROLE_HR_MANAGER',
  'emp-dimas': 'ROLE_PAYROLL_OFFICER',
};

export const VIEWERS: (Actor & { label: string })[] = [
  { employeeId: 'emp-rudi', role: 'ROLE_PAYROLL_OFFICER', label: 'Rudi Hartono · Payroll Officer' },
  { employeeId: 'emp-maya', role: 'ROLE_HR_MANAGER', label: 'Maya Anggraini · HR Manager' },
  { employeeId: 'emp-dimas', role: 'ROLE_PAYROLL_OFFICER', label: 'Dimas Pratama · Payroll Officer' },
];

export function employeeName(id: string | null): string {
  if (!id) return '—';
  return EMPLOYEES[id]?.name ?? PEOPLE[id] ?? id;
}

const at = (date: string, time = '09:00') => `${date}T${time}:00+07:00`;

export const PERIOD_SEED: PayrollPeriod[] = [
  {
    id: 'per-2026-09',
    periodYear: 2026,
    periodMonth: 9,
    status: 'CALCULATED',
    calculated: { employeeId: 'emp-rudi', at: at('2026-09-26') },
    reviewed: null,
    locked: null,
    handedOver: null,
    gate1TimeReconciliationCompletedAt: null,
    gate2FinanceDeductionPullCompletedAt: null,
    gate3ParamSnapshotComplete: true,
  },
  {
    id: 'per-2026-08',
    periodYear: 2026,
    periodMonth: 8,
    status: 'LOCKED',
    calculated: { employeeId: 'emp-rudi', at: at('2026-08-20') },
    reviewed: { employeeId: 'emp-maya', at: at('2026-08-21', '11:00') },
    locked: { employeeId: 'emp-maya', at: at('2026-08-22') },
    handedOver: null,
    gate1TimeReconciliationCompletedAt: at('2026-08-19', '17:00'),
    gate2FinanceDeductionPullCompletedAt: at('2026-08-19', '17:30'),
    gate3ParamSnapshotComplete: true,
  },
  {
    id: 'per-2026-07',
    periodYear: 2026,
    periodMonth: 7,
    status: 'HANDED_OVER',
    calculated: { employeeId: 'emp-rudi', at: at('2026-07-25') },
    reviewed: { employeeId: 'emp-rudi', at: at('2026-07-26') },
    locked: { employeeId: 'emp-maya', at: at('2026-07-27') },
    handedOver: { employeeId: 'emp-maya', at: at('2026-07-28') },
    gate1TimeReconciliationCompletedAt: at('2026-07-24', '17:00'),
    gate2FinanceDeductionPullCompletedAt: at('2026-07-24', '17:30'),
    gate3ParamSnapshotComplete: true,
  },
  {
    id: 'per-2026-06',
    periodYear: 2026,
    periodMonth: 6,
    status: 'HANDED_OVER',
    calculated: { employeeId: 'emp-rudi', at: at('2026-06-25') },
    reviewed: { employeeId: 'emp-rudi', at: at('2026-06-26') },
    locked: { employeeId: 'emp-maya', at: at('2026-06-29') },
    handedOver: { employeeId: 'emp-maya', at: at('2026-06-30') },
    gate1TimeReconciliationCompletedAt: at('2026-06-24', '17:00'),
    gate2FinanceDeductionPullCompletedAt: at('2026-06-24', '17:30'),
    gate3ParamSnapshotComplete: true,
  },
];

const change = (
  id: string,
  periodId: string,
  fromStatus: StateChange['fromStatus'],
  toStatus: StateChange['toStatus'],
  createdBy: string,
  createdAt: string,
  reason: string | null = null,
): StateChange => ({ id, periodId, fromStatus, toStatus, reason, createdBy, createdAt });

export const STATE_HISTORY_SEED: StateChange[] = [
  change('sc-09-1', 'per-2026-09', null, 'CALCULATED', 'emp-rudi', at('2026-09-26')),
  change('sc-08-1', 'per-2026-08', null, 'CALCULATED', 'emp-rudi', at('2026-08-20')),
  change('sc-08-2', 'per-2026-08', 'CALCULATED', 'REVIEWED', 'emp-rudi', at('2026-08-20', '10:00')),
  change('sc-08-3', 'per-2026-08', 'REVIEWED', 'LOCKED', 'emp-maya', at('2026-08-20', '15:00')),
  change(
    'sc-08-4',
    'per-2026-08',
    'LOCKED',
    'REVIEWED',
    'emp-maya',
    at('2026-08-21', '11:00'),
    'Ditemukan 1 karyawan (Yusuf Maulana) dengan fakta lembur susulan sebelum cutoff — dibuka untuk koreksi.',
  ),
  change('sc-08-5', 'per-2026-08', 'REVIEWED', 'LOCKED', 'emp-maya', at('2026-08-22')),
  change('sc-07-1', 'per-2026-07', null, 'CALCULATED', 'emp-rudi', at('2026-07-25')),
  change('sc-07-2', 'per-2026-07', 'CALCULATED', 'REVIEWED', 'emp-rudi', at('2026-07-26')),
  change('sc-07-3', 'per-2026-07', 'REVIEWED', 'LOCKED', 'emp-maya', at('2026-07-27')),
  change('sc-07-4', 'per-2026-07', 'LOCKED', 'HANDED_OVER', 'emp-maya', at('2026-07-28')),
  change('sc-06-1', 'per-2026-06', null, 'CALCULATED', 'emp-rudi', at('2026-06-25')),
  change('sc-06-2', 'per-2026-06', 'CALCULATED', 'REVIEWED', 'emp-rudi', at('2026-06-26')),
  change('sc-06-3', 'per-2026-06', 'REVIEWED', 'LOCKED', 'emp-maya', at('2026-06-29')),
  change('sc-06-4', 'per-2026-06', 'LOCKED', 'HANDED_OVER', 'emp-maya', at('2026-06-30')),
];

/** Sepuluh parameter yang dibekukan saat periode dijalankan. */
export const PARAM_TEMPLATE: ParamSnapshot[] = [
  { paramKey: 'PTKP_ANNUAL_TABLE', paramCategory: 'REGULATION', paramValue: 'Table · 8 brackets (TK/0 … K/3)', sourceEffectiveDate: '2024-01-01' },
  { paramKey: 'TER_RATE_TABLE', paramCategory: 'REGULATION', paramValue: 'Table · 3 TER categories (A/B/C), 44 tiers', sourceEffectiveDate: '2024-01-01' },
  { paramKey: 'BPJS_KESEHATAN_EMPLOYEE_RATE', paramCategory: 'REGULATION', paramValue: '1.00 %', sourceEffectiveDate: '2015-07-01' },
  { paramKey: 'JHT_EMPLOYEE_RATE', paramCategory: 'REGULATION', paramValue: '2.00 %', sourceEffectiveDate: '2015-07-01' },
  { paramKey: 'JP_EMPLOYEE_RATE', paramCategory: 'REGULATION', paramValue: '1.00 %', sourceEffectiveDate: '2015-07-01' },
  { paramKey: 'JKK_RATE_BY_INDUSTRY', paramCategory: 'REGULATION', paramValue: 'Table · 5 risk groups', sourceEffectiveDate: '2015-07-01' },
  { paramKey: 'PAYROLL_CUTOFF_DAY', paramCategory: 'COMPANY_SETTING', paramValue: '25', sourceEffectiveDate: null },
  { paramKey: 'ALLOW_LOCK_BEFORE_CUTOFF', paramCategory: 'COMPANY_SETTING', paramValue: 'false', sourceEffectiveDate: null },
  { paramKey: 'PAST_PERIOD_RECHECK_MONTHS', paramCategory: 'COMPANY_SETTING', paramValue: '3', sourceEffectiveDate: null },
  { paramKey: 'OVERTIME_BASIS_COMPONENTS', paramCategory: 'COMPUTED_COMPOSITION', paramValue: 'List · SC-001, SC-002', sourceEffectiveDate: null },
];

export const FINDING_TYPE_INFO: FindingTypeInfo[] = [
  { type: 'BELOW_UMP', subject: 'Employee', bornWhen: 'Period is run', meaning: 'Basic salary plus fixed components sit below the branch minimum wage (UMP).', schema: 'regional_wage_compared · salary_base_compared · attestation_id' },
  { type: 'MISSING_COST_CENTER_OR_SBU', subject: 'Employee', bornWhen: 'Period is run', meaning: 'The employee has no cost center and/or SBU, and the company default does not exist yet.', schema: 'missing_cost_center · missing_sbu · branch_id' },
  { type: 'ARRIVED_AFTER_LOCK', subject: 'Employee', bornWhen: 'Period locked before cut-off', meaning: 'A fact arrived between the lock moment and the closing date.', schema: 'fact_type · fact_arrived_at · locked_at' },
  { type: 'EMPTY_HOURLY_BASIS', subject: 'Employee', bornWhen: 'Period is run', meaning: 'No component feeds the overtime basis, so the hourly wage computes to nil.', schema: 'overtime_hours · hourly_basis_amount' },
  { type: 'NOT_ELIGIBLE_BUT_PAID', subject: 'Employee', bornWhen: 'Period is run', meaning: 'Overtime or unpaid-leave facts arrived for an employee who is not entitled to them.', schema: 'work_status_code · eligible_flag · fact_type' },
  { type: 'RECONCILIATION_MISMATCH', subject: 'Employee', bornWhen: 'Just before the period is locked', meaning: 'The payroll fact list disagrees with the attendance source.', schema: 'payroll_hours · time_service_hours · delta_hours' },
  { type: 'RECAP_NOT_APPROVED', subject: 'Employee', bornWhen: 'Period is run', meaning: 'The productivity recap was not approved yet when the period was calculated.', schema: 'recap_id · recap_state' },
  { type: 'PRODUCTIVITY_LATE_ARRIVAL', subject: 'Employee', bornWhen: 'Backward sweep', meaning: 'A recap was approved after its origin period had already been calculated.', schema: 'origin_period · approved_at · delta_amount' },
  { type: 'SCORE_REVISED', subject: 'Employee', bornWhen: 'Backward sweep', meaning: 'A performance score changed after the period had been calculated.', schema: 'score_before · score_after · delta_amount' },
  { type: 'ANNUAL_TAX_RECALC_SKIPPED', subject: 'Employee', bornWhen: 'December period', meaning: 'The annual PPh21 recalculation was skipped because the January-onward history is incomplete.', schema: 'missing_months[] · reason' },
  { type: 'JKK_ZERO_INDUSTRY_MISSING', subject: 'Employee', bornWhen: 'Period is run', meaning: 'The company industry is empty, so the JKK rate resolves to zero.', schema: 'industry_id · jkk_rate_used' },
  { type: 'TAX_STATUS_ASSUMED', subject: 'Employee', bornWhen: 'Period is run', meaning: 'No PTKP row covers the period, so the tax status had to be assumed.', schema: 'assumed_ptkp_code · gap_from · gap_until' },
  { type: 'PERIOD_NOT_PICKED_UP', subject: 'Period', bornWhen: 'Handover not collected by the client system', meaning: 'The period was handed over but the client system has not collected it yet. It closes as Diperbaiki automatically once collected.', schema: 'handover_id · handed_over_at · days_waiting' },
];

const open = { finalState: null, resolutionReason: null, resolvedBy: null, resolvedAt: null, repeatCount: null };

export const FINDING_SEED: Finding[] = [
  { id: 'FND-0001', periodId: 'per-2026-09', findingType: 'BELOW_UMP', employeeId: 'pay-dewi', detail: { regional_wage_compared: 4209309, salary_base_compared: 4000000, attestation_id: 'ATT-0002' }, relatedAttestationId: 'ATT-0002', relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:05') },
  { id: 'FND-0002', periodId: 'per-2026-09', findingType: 'MISSING_COST_CENTER_OR_SBU', employeeId: 'pay-agus', detail: { missing_cost_center: true, missing_sbu: true, branch_id: 'BR-JKT-01' }, relatedAttestationId: null, relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:05') },
  { id: 'FND-0003', periodId: 'per-2026-09', findingType: 'MISSING_COST_CENTER_OR_SBU', employeeId: 'pay-bayu', detail: { missing_cost_center: true, missing_sbu: false, branch_id: 'BR-SMG-01' }, relatedAttestationId: null, relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:05') },
  { id: 'FND-0004', periodId: 'per-2026-09', findingType: 'EMPTY_HOURLY_BASIS', employeeId: 'pay-bambang', detail: { overtime_hours: 12.5, hourly_basis_amount: 0 }, relatedAttestationId: null, relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:06') },
  { id: 'FND-0005', periodId: 'per-2026-09', findingType: 'RECONCILIATION_MISMATCH', employeeId: 'pay-indah', detail: { payroll_hours: 8, time_service_hours: 10.5, delta_hours: 2.5 }, relatedAttestationId: null, relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:06') },
  { id: 'FND-0006', periodId: 'per-2026-09', findingType: 'RECAP_NOT_APPROVED', employeeId: 'pay-cahyo', detail: { recap_id: 'RCP-2026-09-014', recap_state: 'MENUNGGU_PENGESAHAN' }, relatedAttestationId: null, relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:07') },
  { id: 'FND-0007', periodId: 'per-2026-09', findingType: 'TAX_STATUS_ASSUMED', employeeId: 'pay-bambang', detail: { assumed_ptkp_code: 'TK/0', gap_from: '2026-08-01', gap_until: '2026-09-30' }, relatedAttestationId: null, relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:07') },
  { id: 'FND-0008', periodId: 'per-2026-09', findingType: 'JKK_ZERO_INDUSTRY_MISSING', employeeId: 'pay-dewi', detail: { industry_id: null, jkk_rate_used: 0 }, relatedAttestationId: null, relatedHandoverId: null, ...open, createdAt: at('2026-09-26', '09:08') },
  { id: 'FND-0009', periodId: 'per-2026-08', findingType: 'BELOW_UMP', employeeId: 'pay-dewi', detail: { regional_wage_compared: 4209309, salary_base_compared: 4000000, attestation_id: 'ATT-0001' }, relatedAttestationId: 'ATT-0001', relatedHandoverId: null, finalState: 'DIPERBAIKI', resolutionReason: null, resolvedBy: 'emp-rudi', resolvedAt: at('2026-08-21'), repeatCount: null, createdAt: at('2026-08-20', '09:05') },
  { id: 'FND-0010', periodId: 'per-2026-08', findingType: 'MISSING_COST_CENTER_OR_SBU', employeeId: 'pay-agus', detail: { missing_cost_center: true, missing_sbu: true, branch_id: 'BR-JKT-01' }, relatedAttestationId: null, relatedHandoverId: null, finalState: 'DITERIMA', resolutionReason: 'Cabang Jakarta Pusat belum memiliki default cost center — dijadwalkan pada penataan struktur Q4 2026.', resolvedBy: 'emp-rudi', resolvedAt: at('2026-08-21', '10:00'), repeatCount: 1, createdAt: at('2026-08-20', '09:05') },
  { id: 'FND-0011', periodId: 'per-2026-07', findingType: 'NOT_ELIGIBLE_BUT_PAID', employeeId: 'pay-bambang', detail: { work_status_code: 'SUSPENDED', eligible_flag: false, fact_type: 'OVERTIME' }, relatedAttestationId: null, relatedHandoverId: null, finalState: 'DITERIMA', resolutionReason: 'Fakta lembur sah dari on-call darurat — status kerja SUSPENDED tidak dicabut, nominal tetap disiapkan.', resolvedBy: 'emp-rudi', resolvedAt: at('2026-07-26'), repeatCount: 1, createdAt: at('2026-07-25', '09:05') },
  { id: 'FND-0013', periodId: 'per-2026-07', findingType: 'PERIOD_NOT_PICKED_UP', employeeId: null, detail: { handover_id: 'HO-2026-07', handed_over_at: '2026-07-28', days_waiting: 17 }, relatedAttestationId: null, relatedHandoverId: 'HO-2026-07', ...open, createdAt: at('2026-08-05', '06:00') },
];

const imported = (id: string, monthYear: string, gross: number, pph: number, bpjs: number): HistoryImport => ({
  id,
  employeeId: 'pay-cahyo',
  monthYear,
  grossTaxableIncomeAmount: gross,
  pph21WithheldAmount: pph,
  bpjsContributionAmount: bpjs,
  sourceMarker: 'LEGACY_SYSTEM_IMPORT',
  isActive: true,
  submittedBy: 'emp-rudi',
  submittedAt: at('2026-05-25'),
  verifiedBy: 'emp-maya',
  verifiedAt: at('2026-05-26', '10:00'),
});

export const IMPORT_SEED: HistoryImport[] = [
  imported('HIM-0001', '2026-01', 5800000, 174000, 174000),
  imported('HIM-0002', '2026-02', 5800000, 174000, 174000),
  imported('HIM-0003', '2026-03', 6000000, 180000, 180000),
  imported('HIM-0004', '2026-04', 6000000, 180000, 180000),
  imported('HIM-0005', '2026-05', 6200000, 186000, 186000),
];
