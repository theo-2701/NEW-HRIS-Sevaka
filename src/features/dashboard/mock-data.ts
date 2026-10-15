import { MY_REQUEST_ROUTES } from '@/features/dashboard/home/myRequestRules';
import type { MyRequest } from '@/features/dashboard/types';
import { REQUEST_STATUS_LABEL as LEAVE } from '@/features/time-off/types';
import { OVERTIME_STATUS_LABEL as OVERTIME } from '@/features/overtime/types';
import { CLAIM_STATUS_LABEL as CLAIM } from '@/features/benefit/types';
import { ADVANCE_STATUS_LABEL as ADVANCE } from '@/features/cash-advance/types';
import { LOAN_STATUS_LABEL as LOAN } from '@/features/loan/types';

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();

/**
 * Contoh "datanya banyak" untuk panel Pengajuan saya (mode dummy saja): 12 pengajuan tambahan lintas
 * lima jenis, supaya batas 5 baris + "Lihat semua (N)" + filter per jenis di modal terlihat.
 * Sengaja tanpa `todo`, jadi tidak menggeser angka "Perlu tindak lanjut".
 * ponytail: hapus file ini saat cabang api tersambung — data asli datang dari lima modul.
 */
export function demoMyRequests(now: Date): MyRequest[] {
  const row = (
    id: string,
    kind: MyRequest['kind'],
    title: string,
    detail: string,
    statusLabel: string,
    tone: MyRequest['tone'],
    open: boolean,
    days: number,
  ): MyRequest => ({ id: `demo-${id}`, kind, title, detail, statusLabel, tone, open, submittedAt: daysAgo(now, days), to: MY_REQUEST_ROUTES[kind] });

  return [
    row('l1', 'LEAVE', 'Annual Leave', '20–22 Oct 2026 · 3 days', LEAVE.PENDING_APPROVAL, 'warn', true, 1),
    row('o1', 'OVERTIME', 'Overtime', '13 Oct 2026 · 3 h', OVERTIME.PENDING_APPROVAL, 'warn', true, 2),
    row('c1', 'CLAIM', 'Reimbursement · Glasses', 'RB-2026-0412 · Rp850.000', CLAIM.SUBMITTED, 'warn', true, 3),
    row('a1', 'CASH_ADVANCE', 'Cash advance · Business trip', 'CA-2026-0118 · Rp2.500.000', ADVANCE.SUBMITTED, 'warn', true, 4),
    row('l2', 'LEAVE', 'Sick Leave', '6 Oct 2026 · 1 day', LEAVE.APPROVED, 'ok', false, 9),
    row('o2', 'OVERTIME', 'Overtime', '3 Oct 2026 · 2 h', OVERTIME.APPROVED, 'ok', false, 11),
    row('c2', 'CLAIM', 'Reimbursement · Outpatient', 'RB-2026-0398 · Rp420.000', CLAIM.APPROVED, 'ok', false, 13),
    row('n1', 'LOAN', 'Loan', 'LN-2026-0031 · Rp10.000.000 · 12 months', LOAN.REJECTED, 'err', false, 15),
    row('o3', 'OVERTIME', 'Overtime', '27 Sep 2026 · 4 h', OVERTIME.REJECTED, 'err', false, 17),
    row('l3', 'LEAVE', 'Annual Leave', '22 Sep 2026 · 1 day', LEAVE.CANCELLED, 'mute', false, 22),
    row('c3', 'CLAIM', 'Reimbursement · Dental', 'RB-2026-0377 · Rp600.000', CLAIM.APPROVED, 'ok', false, 25),
    // Lebih dari 30 hari & sudah final → tersaring oleh arrangeMyRequests, tidak tampil.
    row('a2', 'CASH_ADVANCE', 'Cash advance · Training', 'CA-2026-0090 · Rp1.200.000', ADVANCE.SETTLED, 'ok', false, 45),
  ];
}
