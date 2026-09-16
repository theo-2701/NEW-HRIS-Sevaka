import { MONTH_NAMES } from '@/features/salary-processing/types';
import type {
  Actor,
  Finding,
  FindingFilter,
  FinalState,
  PayrollPeriod,
} from '@/features/salary-processing/types';

/** `month_year` — sama dengan CHECK ERD §6.20. */
export const MONTH_YEAR_PATTERN = /^[0-9]{4}-(0[1-9]|1[0-2])$/;

const pad = (value: number) => String(value).padStart(2, '0');

/** Label tampilan komposit `PP-YYYY-MM` — dibentuk klien, bukan field server. */
export const periodLabel = (period: Pick<PayrollPeriod, 'periodYear' | 'periodMonth'>) =>
  `PP-${period.periodYear}-${pad(period.periodMonth)}`;

export const periodName = (period: Pick<PayrollPeriod, 'periodYear' | 'periodMonth'>) =>
  `${MONTH_NAMES[period.periodMonth - 1]} ${period.periodYear}`;

export const monthKey = (year: number, month: number) => `${year}-${pad(month)}`;

export const isPayrollOfficer = (actor: Actor) => actor.role === 'ROLE_PAYROLL_OFFICER';

/** Tinjau dan hitung ulang hanya sah pada CALCULATED, oleh Penjalan. */
export const canActOnCalculated = (actor: Actor, period: PayrollPeriod) =>
  isPayrollOfficer(actor) && period.status === 'CALCULATED';

/** Satu form, dua cabang server — atau terblokir bila periode sudah lewat CALCULATED. */
export function runBranch(
  periods: PayrollPeriod[],
  year: number,
  month: number,
): { branch: 'INSERT' | 'RECALCULATE' | 'BLOCKED'; existing: PayrollPeriod | null } {
  const existing = periods.find((row) => row.periodYear === year && row.periodMonth === month) ?? null;
  if (!existing) return { branch: 'INSERT', existing };
  return { branch: existing.status === 'CALCULATED' ? 'RECALCULATE' : 'BLOCKED', existing };
}

export function gateStates(period: PayrollPeriod) {
  return [
    { key: 'g1', label: 'Gate 1 · Time reconciliation', passed: Boolean(period.gate1TimeReconciliationCompletedAt), at: period.gate1TimeReconciliationCompletedAt },
    { key: 'g2', label: 'Gate 2 · Finance deduction pull', passed: Boolean(period.gate2FinanceDeductionPullCompletedAt), at: period.gate2FinanceDeductionPullCompletedAt },
    { key: 'g3', label: 'Gate 3 · Param snapshot', passed: period.gate3ParamSnapshotComplete, at: null },
  ];
}

export function matchesFinding(row: Finding, filter: FindingFilter): boolean {
  if (filter.findingTypes?.length && !filter.findingTypes.includes(row.findingType)) return false;
  if (filter.finalStates?.length && !filter.finalStates.includes(row.finalState ?? 'OPEN')) return false;
  if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
  return true;
}

/**
 * `repeat_count` (TSD §15.7.1.5): temuan DITERIMA lain pada periode SEBELUMNYA dengan karyawan dan
 * jenis identik, +1 untuk baris yang sedang ditutup DITERIMA. Selalu NULL bagi PERIOD_NOT_PICKED_UP.
 */
export function repeatCountFor(
  findings: Finding[],
  periods: PayrollPeriod[],
  target: Finding,
  finalState: FinalState,
): number | null {
  if (target.findingType === 'PERIOD_NOT_PICKED_UP' || finalState !== 'DITERIMA') return null;
  const keyOf = (periodId: string) => {
    const period = periods.find((row) => row.id === periodId);
    return period ? monthKey(period.periodYear, period.periodMonth) : '';
  };
  const current = keyOf(target.periodId);
  const earlier = findings.filter(
    (row) =>
      row.id !== target.id &&
      row.employeeId === target.employeeId &&
      row.findingType === target.findingType &&
      row.finalState === 'DITERIMA' &&
      keyOf(row.periodId) < current,
  ).length;
  return earlier + 1;
}

/** Bulan periode gaji pertama yang pernah dijalankan — impor hanya sah SEBELUM bulan ini. */
export function firstPeriodMonth(periods: PayrollPeriod[]): string | null {
  const keys = periods.map((row) => monthKey(row.periodYear, row.periodMonth)).sort();
  return keys[0] ?? null;
}

/** Nominal `numeric(18,2)` — digit, opsional dua desimal. */
export function parseAmount(value: string): number | null {
  const clean = value.trim().replace(/[.\s]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Number(clean);
}

export function newIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
