import { REQUEST_STATUS_LABEL } from '@/features/time-off/types';
import type { LeaveRequest } from '@/features/time-off/types';
import { OVERTIME_STATUS_LABEL } from '@/features/overtime/types';
import type { OvertimeRequest } from '@/features/overtime/types';
import { CLAIM_STATUS_LABEL } from '@/features/benefit/types';
import type { BenefitClaim } from '@/features/benefit/types';
import { ADVANCE_STATUS_LABEL } from '@/features/cash-advance/types';
import type { CashAdvance } from '@/features/cash-advance/types';
import { LOAN_STATUS_LABEL } from '@/features/loan/types';
import type { Loan } from '@/features/loan/types';
import type { MyRequest } from '@/features/dashboard/types';
import { formatCurrency } from '@/lib/format';
import { formatDateEn as formatDate, formatDateRangeEn as formatDateRange } from '@/features/dashboard/home/homeRules';

/** Route modul = tujuan yang sama dengan item "More Request" di hero. */
export const MY_REQUEST_ROUTES = {
  LEAVE: '/me/time/time-off',
  OVERTIME: '/me/time/overtime',
  CLAIM: '/finance/benefit-reimbursement',
  CASH_ADVANCE: '/finance/cash-advance',
  LOAN: '/finance/loan',
} as const;

type Shape = Pick<MyRequest, 'tone' | 'open'>;

const PENDING: Shape = { tone: 'warn', open: true };
const RUNNING: Shape = { tone: 'ok', open: true };
const DONE: Shape = { tone: 'ok', open: false };
const DENIED: Shape = { tone: 'err', open: false };
const VOID: Shape = { tone: 'mute', open: false };

/** Cuti & lembur berbagi lima status yang sama. */
const TIME_SHAPE: Record<LeaveRequest['status'], Shape> = {
  PENDING_APPROVAL: PENDING,
  AUTO_APPROVED: DONE,
  APPROVED: DONE,
  REJECTED: DENIED,
  CANCELLED: VOID,
};

const CLAIM_SHAPE: Record<BenefitClaim['status'], Shape> = {
  SUBMITTED: PENDING,
  AWAITING_RESUBMIT: PENDING,
  APPROVED: DONE,
  REJECTED: DENIED,
  CANCELLED: VOID,
};

/** Cash advance disetujui masih berjalan sampai dipertanggungjawabkan (SETTLED). */
const ADVANCE_SHAPE: Record<CashAdvance['status'], Shape> = {
  SUBMITTED: PENDING,
  APPROVED: RUNNING,
  SETTLED: DONE,
  REJECTED: DENIED,
  REPUDIATED: DENIED,
  CANCELLED: VOID,
};

/** Pinjaman disetujui/cair masih berjalan sampai lunas atau ditutup. */
const LOAN_SHAPE: Record<Loan['status'], Shape> = {
  SUBMITTED: PENDING,
  AWAITING_CALCULATION: PENDING,
  AWAITING_ACKNOWLEDGEMENT: PENDING,
  APPROVED: RUNNING,
  DISBURSED: RUNNING,
  SETTLED: DONE,
  CLOSED: DONE,
  REJECTED: DENIED,
  REJECTED_BY_EXTERNAL: DENIED,
  DECLINED_BY_EMPLOYEE: VOID,
  WITHDRAWN: VOID,
  CANCELLED: VOID,
};

/** `typeNames` = peta id → nama jenis cuti dari `timeOffService.leaveTypes()`. */
export const fromLeave = (row: LeaveRequest, typeNames: Record<string, string> = {}): MyRequest => ({
  id: `leave-${row.id}`,
  kind: 'LEAVE',
  title: typeNames[row.leaveTypeId] ?? 'Leave',
  detail: `${formatDateRange(row.startDate, row.endDate)} · ${row.totalDays} ${row.totalDays === 1 ? 'day' : 'days'}`,
  statusLabel: REQUEST_STATUS_LABEL[row.status],
  ...TIME_SHAPE[row.status],
  submittedAt: row.submittedAt,
  to: MY_REQUEST_ROUTES.LEAVE,
});

export const fromOvertime = (row: OvertimeRequest): MyRequest => ({
  id: `overtime-${row.id}`,
  kind: 'OVERTIME',
  title: 'Overtime',
  detail: `${formatDate(row.overtimeDate)}${row.requestedHours ? ` · ${row.requestedHours} h` : ''}`,
  statusLabel: OVERTIME_STATUS_LABEL[row.overtimeStatus],
  ...TIME_SHAPE[row.overtimeStatus],
  submittedAt: row.submittedAt,
  to: MY_REQUEST_ROUTES.OVERTIME,
});

export const fromClaim = (row: BenefitClaim): MyRequest => ({
  id: `claim-${row.id}`,
  kind: 'CLAIM',
  title: `Reimbursement · ${row.benefitTypeName}`,
  detail: `${row.requestNo} · ${formatCurrency(row.totalAmount)}`,
  statusLabel: CLAIM_STATUS_LABEL[row.status],
  ...CLAIM_SHAPE[row.status],
  submittedAt: row.submittedAt,
  to: MY_REQUEST_ROUTES.CLAIM,
  todo: row.status === 'AWAITING_RESUBMIT' ? 'RESUBMIT_CLAIM' : undefined,
});

export const fromAdvance = (row: CashAdvance): MyRequest => ({
  id: `advance-${row.id}`,
  kind: 'CASH_ADVANCE',
  title: `Cash advance · ${row.purposeTypeName}`,
  detail: `${row.requestNo} · ${formatCurrency(row.amount)}`,
  statusLabel: ADVANCE_STATUS_LABEL[row.status],
  ...ADVANCE_SHAPE[row.status],
  submittedAt: row.createdAt,
  to: MY_REQUEST_ROUTES.CASH_ADVANCE,
  todo: row.status === 'APPROVED' ? 'SETTLE_ADVANCE' : undefined,
});

export const fromLoan = (row: Loan): MyRequest => ({
  id: `loan-${row.id}`,
  kind: 'LOAN',
  title: 'Loan',
  detail: `${row.requestNo} · ${formatCurrency(row.principalAmount)} · ${row.tenorMonths} months`,
  statusLabel: LOAN_STATUS_LABEL[row.status],
  ...LOAN_SHAPE[row.status],
  submittedAt: row.submittedAt,
  to: MY_REQUEST_ROUTES.LOAN,
  todo: row.status === 'AWAITING_ACKNOWLEDGEMENT' ? 'ACK_LOAN' : undefined,
});

/** Jumlah baris di panel Pengajuan saya; sisanya dibuka lewat "Lihat semua". */
export const MY_REQUESTS_PANEL_LIMIT = 5;

/**
 * Yang masih berjalan di atas (terbaru dulu), lalu yang sudah final ≤ 30 hari terakhir.
 * Tanpa `limit` = seluruh daftar (dipakai modal "Lihat semua").
 */
export function arrangeMyRequests(rows: MyRequest[], now: Date, limit?: number): MyRequest[] {
  const cutoff = now.getTime() - 30 * 86_400_000;
  const newest = (a: MyRequest, b: MyRequest) => b.submittedAt.localeCompare(a.submittedAt);
  const open = rows.filter((row) => row.open).sort(newest);
  const recent = rows.filter((row) => !row.open && new Date(row.submittedAt).getTime() >= cutoff).sort(newest);
  return [...open, ...recent].slice(0, limit);
}
