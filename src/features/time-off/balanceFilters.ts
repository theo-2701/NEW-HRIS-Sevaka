import { employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
import { MUTATION_SOURCE_LABEL } from '@/features/time-off/types';
import type { MutationSource } from '@/features/time-off/types';

/**
 * Keadaan filter grid saldo & ledger. Dipisah dari komponennya supaya file
 * komponen hanya mengekspor komponen (syarat fast-refresh).
 *
 * `'ALL'` berarti filter tidak aktif — bukan string kosong, supaya nilainya
 * bisa dipakai langsung sebagai value `<Select>`.
 */
export interface BalanceFilterState {
  employeeId: string;
  leaveTypeId: string;
  periodYear: string;
}

export interface LedgerFilterState extends BalanceFilterState {
  source: string;
}

export const EMPTY_BALANCE_FILTER: BalanceFilterState = {
  employeeId: 'ALL',
  leaveTypeId: 'ALL',
  periodYear: 'ALL',
};

export const EMPTY_LEDGER_FILTER: LedgerFilterState = { ...EMPTY_BALANCE_FILTER, source: 'ALL' };

/** Ringkasan filter aktif untuk toolbar — kosong berarti "tanpa filter". */
export function summarizeFilter(value: LedgerFilterState | BalanceFilterState): string {
  const parts: string[] = [];
  if (value.employeeId !== 'ALL') parts.push(employeeName(value.employeeId));
  if ('source' in value && value.source !== 'ALL') {
    parts.push(MUTATION_SOURCE_LABEL[value.source as MutationSource]);
  }
  if (value.leaveTypeId !== 'ALL') parts.push(leaveTypeOf(value.leaveTypeId)?.name ?? value.leaveTypeId);
  if (value.periodYear !== 'ALL') parts.push(value.periodYear);
  return parts.length ? parts.join(' · ') : 'Tanpa filter';
}

export function countActive(value: LedgerFilterState | BalanceFilterState): number {
  return Object.values(value).filter((item) => item !== 'ALL').length;
}
