import { MARKS } from '@/features/disbursement/mock-data';
import { activeMarks, keyOf } from '@/features/disbursement/rules';
import type { DisbursementMark, PayableKey } from '@/features/disbursement/types';

/**
 * Penyimpan `log_disbursement_mark` mode dummy (append-only).
 *
 * Dipisah dari `disbursement.service` supaya modul sumber (mis. tab Disbursement
 * History di Benefit) bisa membaca status tanda tanpa impor melingkar:
 * service Pencairan mengimpor service sumber, service sumber hanya mengimpor ini.
 */
let marks: DisbursementMark[] = MARKS.map((row) => ({ ...row }));

export function resetMarks() {
  marks = MARKS.map((row) => ({ ...row }));
}

export function listMarks(): DisbursementMark[] {
  return marks.map((row) => ({ ...row }));
}

export function activeMarkOf(key: PayableKey): DisbursementMark | null {
  const row = activeMarks(marks).find((item) => keyOf(item) === keyOf(key));
  return row ? { ...row } : null;
}

export function appendMarks(rows: DisbursementMark[]) {
  marks = [...marks, ...rows.map((row) => ({ ...row }))];
}
