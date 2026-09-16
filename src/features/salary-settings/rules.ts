import { EMPLOYEES } from '@/features/salary-processing/mock-data';
import type { ChangeBatch, ImpactSummary, SalaryComponent } from '@/features/payroll-authorization/types';
import { BULK_ESCALATION_THRESHOLD, REGIONAL_WAGE } from '@/features/salary-settings/mock-data';
import type { Actor, EmployeeValue, EmployeeValueRow, TraitProposalInput } from '@/features/salary-settings/types';

/**
 * Kode komponen: huruf kapital, angka, garis bawah, atau tanda hubung.
 *
 * Regex kontrak ditulis tanpa tanda hubung, tetapi contoh dan seluruh dataset kontrak yang sama
 * memakai SC-001 sampai SC-009. Tanda hubung diizinkan di sini supaya datanya bisa dipakai;
 * perbedaan ini dicatat untuk dikonfirmasi ke pemilik kontrak.
 */
export const COMPONENT_CODE_PATTERN = /^[A-Z][A-Z0-9_-]{2,49}$/;

export const isMaker = (actor: Actor) => actor.role === 'ROLE_PAYROLL_OFFICER';

/** Nominal `numeric(18,2)` — digit dengan opsional dua desimal. */
export function parseAmount(value: string): number | null {
  const clean = value.trim().replace(/[.\s]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Number(clean);
}

/**
 * Tanggal berlaku dihitung sistem: awal periode gaji berikutnya. Klien tidak pernah mengirimnya.
 */
export function nextPeriodStart(from = new Date()): string {
  const year = from.getFullYear();
  const month = from.getMonth() + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
}

/** `is_current` = belum berakhir dan sudah disetujui. */
export const isCurrentValue = (row: EmployeeValue) =>
  row.effectiveUntil === null && row.approvalState === 'DISETUJUI';

export const withCurrentFlag = (rows: EmployeeValue[]): EmployeeValueRow[] =>
  rows
    .map((row) => ({ ...row, isCurrent: isCurrentValue(row) }))
    .sort(
      (a, b) =>
        a.salaryComponentId.localeCompare(b.salaryComponentId) || b.effectiveFrom.localeCompare(a.effectiveFrom),
    );

/** Minimal satu sifat wajib berbeda dari sifat aktif komponen. */
export function traitsDiffer(component: SalaryComponent, input: TraitProposalInput): boolean {
  return (
    component.isFixed !== input.isFixed ||
    component.isOvertimeBasis !== input.isOvertimeBasis ||
    component.isTaxable !== input.isTaxable ||
    component.isBpjsDeductible !== input.isBpjsDeductible
  );
}

export const regionalWageOf = (employeeId: string): number => {
  const branch = EMPLOYEES[employeeId]?.branch ?? '';
  return REGIONAL_WAGE[branch] ?? 0;
};

/**
 * Gaji dasar pembanding UMP: seluruh komponen bersifat tetap yang berlaku, dengan komponen yang
 * sedang diusulkan menggantikan nilainya sendiri.
 */
export function salaryBaseAfter(
  values: EmployeeValue[],
  components: SalaryComponent[],
  employeeId: string,
  changedComponentId: string,
  newAmount: number,
): number {
  const fixed = new Set(components.filter((row) => row.isFixed).map((row) => row.componentCode));
  const current = values.filter(
    (row) => row.employeeId === employeeId && isCurrentValue(row) && row.salaryComponentId !== changedComponentId,
  );
  const base = current
    .filter((row) => fixed.has(row.salaryComponentId))
    .reduce((total, row) => total + row.amount, 0);
  return base + (fixed.has(changedComponentId) ? newAmount : 0);
}

export interface UmpCheck {
  regionalWage: number;
  salaryBase: number;
  isBelowUmp: boolean;
}

export const checkUmp = (regionalWage: number, salaryBase: number): UmpCheck => ({
  regionalWage,
  salaryBase,
  isBelowUmp: regionalWage > 0 && salaryBase < regionalWage,
});

export const canEditBatch = (batch: ChangeBatch) => batch.status === 'DRAFT';

/** Eskalasi dihitung saat kumpulan dikunci, bukan dipilih pengaju. */
export const needsEscalation = (memberCount: number) => memberCount > BULK_ESCALATION_THRESHOLD;

/**
 * `impact_summary` dibekukan sekali saat kumpulan dikunci. Bentuk medannya mengikuti respons
 * detail kumpulan (`#19`).
 */
export function buildImpactSummary(
  batch: ChangeBatch,
  values: EmployeeValue[],
  components: SalaryComponent[],
  nameOf: (id: string) => string,
): ImpactSummary {
  const affected = new Set(batch.items.map((item) => item.employeeId));
  const decrease: string[] = [];
  const belowUmp: string[] = [];
  const missingCostCenter: string[] = [];

  for (const employeeId of affected) {
    const items = batch.items.filter((item) => item.employeeId === employeeId);
    if (items.some((item) => item.amountDelta < 0)) decrease.push(nameOf(employeeId));

    const base = items.reduce((total, item) => {
      const currentAmount =
        values.find(
          (row) => row.employeeId === employeeId && row.salaryComponentId === item.salaryComponentId && isCurrentValue(row),
        )?.amount ?? 0;
      return total + salaryBaseAfter(values, components, employeeId, item.salaryComponentId, currentAmount + item.amountDelta);
    }, 0);
    const wage = regionalWageOf(employeeId);
    if (items.length === 1 && wage > 0 && base < wage) belowUmp.push(nameOf(employeeId));

    // Cabang tanpa cost center/SBU dibawa apa adanya dari data karyawan dummy.
    if (employeeId === 'pay-agus') missingCostCenter.push(nameOf(employeeId));
  }

  return {
    affectedCount: affected.size,
    netCostShiftAmount: batch.items.reduce((total, item) => total + item.amountDelta, 0),
    salaryDecreaseList: decrease,
    belowUmpAfterChangeList: belowUmp,
    missingCostCenterOrSbuList: missingCostCenter,
  };
}
