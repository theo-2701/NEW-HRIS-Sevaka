import type { Finding, PayrollPeriod } from '@/features/salary-processing/types';
import type { Actor, ChangeBatch, SalaryComponent } from '@/features/payroll-authorization/types';

/** `reason` buka-kembali — regex kontrak `^.{10,2000}$`. */
export const REOPEN_REASON_PATTERN = /^[\s\S]{10,2000}$/;

export const isChecker = (actor: Actor) => actor.role === 'ROLE_HR_MANAGER';

/** Tiga gerbang kunci (TSD §12.4) dievaluasi berurutan, masing-masing dengan kodenya sendiri. */
export interface LockGate {
  key: 'time' | 'finance' | 'param';
  label: string;
  code: string;
  passed: boolean;
}

export function lockGates(period: PayrollPeriod): LockGate[] {
  return [
    {
      key: 'time',
      label: 'Gate 1 · Time reconciliation',
      code: 'PAY_LOCK_BLOCKED_TIME_MISMATCH',
      passed: Boolean(period.gate1TimeReconciliationCompletedAt),
    },
    {
      key: 'finance',
      label: 'Gate 2 · Finance deduction pull',
      code: 'PAY_LOCK_BLOCKED_FINANCE_INCOMPLETE',
      passed: Boolean(period.gate2FinanceDeductionPullCompletedAt),
    },
    {
      key: 'param',
      label: 'Gate 3 · Param snapshot',
      code: 'PAY_LOCK_BLOCKED_NO_PARAM_SNAPSHOT',
      passed: period.gate3ParamSnapshotComplete,
    },
  ];
}

/** Maker-checker penguncian: pengunci tidak boleh orang yang menjalankan perhitungan. */
export const lockMakerCheckerOk = (period: PayrollPeriod, actor: Actor) =>
  period.calculated.employeeId !== actor.employeeId;

export const canLock = (period: PayrollPeriod, actor: Actor) => isChecker(actor) && period.status === 'REVIEWED';

/**
 * Buka kembali hanya ditawarkan dari `LOCKED`: kontrak mensyaratkan pemanggil identik dengan
 * `locked_by` baris itu, sehingga baris yang tidak pernah terkunci tidak punya pemanggil yang sah.
 */
export const canReopen = (period: PayrollPeriod, actor: Actor) =>
  isChecker(actor) && period.status === 'LOCKED' && period.locked?.employeeId === actor.employeeId;

export const canAuthorize = (period: PayrollPeriod, actor: Actor) => isChecker(actor) && period.status === 'LOCKED';

export const reopenTargets = (period: PayrollPeriod): ('REVIEWED' | 'CALCULATED')[] =>
  period.status === 'LOCKED' ? ['REVIEWED', 'CALCULATED'] : [];

/**
 * Gerbang pra-otorisasi: temuan bersubjek karyawan yang masih terbuka menahan penyerahan.
 * `PERIOD_NOT_PICKED_UP` bersubjek periode, jadi tidak ikut dihitung.
 */
export function blockingFindings(findings: Finding[]): Finding[] {
  return findings.filter((row) => row.finalState === null && row.employeeId !== null);
}

/** Antrean usulan sifat = katalog komponen yang difilter, bukan endpoint tersendiri. */
export const traitQueueOf = (components: SalaryComponent[]) =>
  components.filter((row) => row.proposalState === 'MENUNGGU_PERSETUJUAN');

export const traitDecided = (component: SalaryComponent) => Boolean(component.approvedBy);

/**
 * Asimetri gerbang eskalasi: jalur setuju atas kumpulan `requires_escalation` hanya sah bagi
 * penyetuju eskalasi; jalur tolak tetap milik Pemeriksa biasa.
 */
export function canApproveBatch(batch: ChangeBatch, actor: Actor): boolean {
  if (batch.status !== 'MENUNGGU_PERSETUJUAN') return false;
  if (batch.createdBy === actor.employeeId) return false;
  if (batch.requiresEscalation) return actor.employeeId === batch.escalationApproverId;
  return isChecker(actor);
}

export const canRejectBatch = (batch: ChangeBatch, actor: Actor) =>
  batch.status === 'MENUNGGU_PERSETUJUAN' && isChecker(actor) && batch.createdBy !== actor.employeeId;

export const batchTotalDelta = (batch: ChangeBatch) =>
  batch.items.reduce((total, item) => total + item.amountDelta, 0);
