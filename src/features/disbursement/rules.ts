import type {
  ClearanceFilter,
  DisbursementMark,
  MarkSummary,
  OutstandingClearance,
  PayableFilter,
  PayableKey,
  PayableRow,
  PayableSortBy,
  PayableSource,
  Role,
  SortDirection,
} from '@/features/disbursement/types';

/** Batas `reason_note` / `settled_reason_note` (TSD §14.5.8). */
export const NOTE_MAX = 500;

/** Whitelist karakter filter `request_no` sebelum dirangkai LIKE (TSD §14.5.8). */
export const REQUEST_NO_FILTER_PATTERN = /^[A-Za-z0-9-]{0,30}$/;

export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH', 'WITH_PAYROLL'] as const;

/** TSD §6.5.1 — Employee & Dept Manager nol akses pada kedua sub-layar. */
const READ_ROLES: Role[] = ['ROLE_FINANCE_OFFICER', 'ROLE_HR_MANAGER', 'ROLE_SUPER_ADMIN'];
/** Preview, mark-paid, reverse — HR Manager hanya membaca. */
const MARK_ROLES: Role[] = ['ROLE_FINANCE_OFFICER', 'ROLE_SUPER_ADMIN'];
/** declare-settled — dua peran, FD-112 (Super Admin tidak termasuk). */
const SETTLE_ROLES: Role[] = ['ROLE_FINANCE_OFFICER', 'ROLE_HR_MANAGER'];

export const canRead = (role: Role) => READ_ROLES.includes(role);
export const canMark = (role: Role) => MARK_ROLES.includes(role);
export const canDeclareSettled = (role: Role) => SETTLE_ROLES.includes(role);

export const keyOf = (item: PayableKey) => `${item.payableType}|${item.payableId}`;

/** Wajib non-kosong setelah trim, maks 500 karakter. `null` = sah. */
export function noteError(note: string): string | null {
  const trimmed = note.trim();
  if (!trimmed) return 'wajib diisi';
  if (trimmed.length > NOTE_MAX) return `maksimal ${NOTE_MAX} karakter`;
  return null;
}

/** Id baris yang sudah menjadi target `reversal_of_mark_id` baris lain. */
export function reversedIds(marks: DisbursementMark[]): Set<string> {
  return new Set(marks.flatMap((row) => (row.reversalOfMarkId ? [row.reversalOfMarkId] : [])));
}

/** Tanda aktif = bukan baris pembalik dan belum dibalik (anti-join dua tingkat TSD §3.2). */
export function activeMarks(marks: DisbursementMark[]): DisbursementMark[] {
  const reversed = reversedIds(marks);
  return marks.filter((row) => row.reversalOfMarkId === null && !reversed.has(row.id));
}

export function summarizeMark(mark: DisbursementMark): MarkSummary {
  return {
    disbursementMarkId: mark.id,
    markedAt: mark.markedAt,
    markSource: mark.markSource,
    paymentMethod: mark.paymentMethod,
    actionId: mark.actionId,
  };
}

/**
 * Menyusun grid Pencairan dari tabel sumber + penanda:
 *  • punya tanda aktif ⇒ MARKED, `request_no`/nominal dari snapshot tanda;
 *  • tanpa tanda aktif dan status sumber layak ⇒ UNMARKED;
 *  • selain itu tidak tampil.
 */
export function buildPayableRows(sources: PayableSource[], marks: DisbursementMark[]): PayableRow[] {
  const active = activeMarks(marks);
  return sources.flatMap((source): PayableRow[] => {
    const base = {
      payableType: source.payableType,
      payableId: source.payableId,
      requestNo: source.requestNo,
      employeeId: source.employeeId,
      amount: source.amount,
      submittedAt: source.submittedAt,
    };
    const mark = active.find((row) => keyOf(row) === keyOf(source));
    if (mark) {
      return [
        { ...base, requestNo: mark.requestNoSnapshot, amount: mark.amount, markStatus: 'MARKED', mark: summarizeMark(mark) },
      ];
    }
    return source.eligible ? [{ ...base, markStatus: 'UNMARKED', mark: null }] : [];
  });
}

const day = (value: string | null | undefined) => (value ?? '').slice(0, 10);

/**
 * Filter grid. Rentang tanggal menyasar `marked_at` bila `mark_status=MARKED`,
 * dan tanggal pengajuan sumber bila `UNMARKED`/`ALL` (TSD §7.1 poin 5).
 */
export function filterPayables(rows: PayableRow[], filter: PayableFilter): PayableRow[] {
  const markStatus = filter.markStatus ?? 'UNMARKED';
  const query = filter.requestNo?.trim().toLowerCase();
  return rows.filter((row) => {
    if (markStatus !== 'ALL' && row.markStatus !== markStatus) return false;
    if (filter.payableTypes?.length && !filter.payableTypes.includes(row.payableType)) return false;
    if (query && !row.requestNo.toLowerCase().includes(query)) return false;
    if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
    const target = markStatus === 'MARKED' ? day(row.mark?.markedAt) : day(row.submittedAt);
    if (filter.startDate && target < filter.startDate) return false;
    if (filter.endDate && target > filter.endDate) return false;
    return true;
  });
}

export function sortPayables(
  rows: PayableRow[],
  sortBy: PayableSortBy = 'created_at',
  direction: SortDirection = 'DESC',
): PayableRow[] {
  const sign = direction === 'ASC' ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (sortBy === 'amount') return sign * (a.amount - b.amount);
    if (sortBy === 'request_no') return sign * a.requestNo.localeCompare(b.requestNo);
    if (sortBy === 'marked_at') return sign * (a.mark?.markedAt ?? '').localeCompare(b.mark?.markedAt ?? '');
    return sign * a.submittedAt.localeCompare(b.submittedAt);
  });
}

export function filterClearances(rows: OutstandingClearance[], filter: ClearanceFilter): OutstandingClearance[] {
  const sign = filter.sortDirection === 'ASC' ? 1 : -1;
  return rows
    .filter((row) => {
      if (filter.status && row.status !== filter.status) return false;
      if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
      if (filter.startDate && day(row.createdAt) < filter.startDate) return false;
      if (filter.endDate && day(row.createdAt) > filter.endDate) return false;
      return true;
    })
    .sort((a, b) => {
      if (filter.sortBy === 'outstanding_amount') return sign * (a.outstandingAmount - b.outstandingAmount);
      if (filter.sortBy === 'resolved_at') return sign * (a.resolvedAt ?? '').localeCompare(b.resolvedAt ?? '');
      return sign * a.createdAt.localeCompare(b.createdAt);
    });
}
