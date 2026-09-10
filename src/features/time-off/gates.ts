import { toIsoDate } from '@/lib/format';
import { BLACKOUTS, EMPLOYEES, HOLIDAYS, LEAVE_BALANCES, leaveTypeOf } from '@/features/time-off/mock-data';
import { LIVE_STATUS } from '@/features/time-off/types';
import type { DaySession, ExtraApprovalReason, LeaveRequest } from '@/features/time-off/types';

/**
 * Empat gerbang submit Time Off (UIC §3.1.1).
 *
 * Gerbang menahan pembuatan baris; **lapis persetujuan tambahan** tidak — ia
 * hanya mengangkat pengajuan ke approver berikutnya. Perhitungan ini ditulis
 * terpisah dari service supaya bisa diuji sebagai fungsi murni dan dipakai
 * langsung oleh form untuk pratinjau.
 */
export interface GateResult {
  /** Hari kerja bersih setelah akhir pekan dan hari libur dikeluarkan. */
  totalDays: number;
  /** Galat yang membatalkan submit — teks sudah membawa kode HTTP-nya. */
  errors: string[];
  /** Pemicu lapis persetujuan tambahan yang terangkat. */
  extra: ExtraApprovalReason[];
}

/** Hari libur yang berlaku untuk seorang karyawan pada tanggal tertentu. */
function holidayOn(iso: string, branch: string | undefined): boolean {
  return HOLIDAYS.some(
    (holiday) =>
      holiday.date === iso &&
      holiday.approvalStatus === 'APPROVED' &&
      (holiday.type !== 'REGIONAL' || holiday.scopeRef === branch),
  );
}

/**
 * Hari kerja bersih: akhir pekan dan hari libur yang disetujui tidak dihitung.
 * Setengah hari hanya sah kalau rentangnya satu hari kerja.
 */
export function workingDays(employeeId: string, start: string, end: string, session: DaySession): number {
  if (!start || !end || end < start) return 0;
  const branch = EMPLOYEES.find((row) => row.id === employeeId)?.branch;
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  let days = 0;

  while (cursor <= last) {
    const weekday = cursor.getDay();
    const iso = toIsoDate(cursor);
    if (weekday !== 0 && weekday !== 6 && !holidayOn(iso, branch)) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  if (session !== 'FULL' && days === 1) return 0.5;
  return days;
}

export function evaluateGates(input: {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  daySession: DaySession;
  /** Pengajuan hidup milik karyawan yang sama — untuk gerbang tumpang tindih. */
  existing: LeaveRequest[];
  /** Id pengajuan yang sedang diubah, supaya tidak bentrok dengan dirinya. */
  selfId?: string;
  now: Date;
}): GateResult {
  const { employeeId, leaveTypeId, startDate, endDate, daySession, existing, selfId, now } = input;
  const result: GateResult = { totalDays: 0, errors: [], extra: [] };

  const type = leaveTypeOf(leaveTypeId);
  if (!type || !startDate || !endDate) {
    result.errors.push('Jenis cuti, tanggal mulai, dan tanggal selesai wajib diisi.');
    return result;
  }
  if (endDate < startDate) {
    result.errors.push('Tanggal selesai tidak boleh mendahului tanggal mulai.');
    return result;
  }
  if (daySession !== 'FULL' && startDate !== endDate) {
    result.errors.push('422 — setengah hari hanya sah bila tanggal mulai dan selesai sama.');
  }

  // Gerbang 1 — blackout. HARD menolak 422; SOFT hanya menaikkan lapis.
  BLACKOUTS.forEach((blackout) => {
    const overlaps = startDate <= blackout.endDate && endDate >= blackout.startDate;
    if (!overlaps || type.isStatutory) return;
    if (blackout.mode === 'HARD') {
      result.errors.push(`422 — tanggalnya masuk blackout keras "${blackout.name}".`);
    } else {
      result.extra.push('SOFT_BLACKOUT');
    }
  });

  // Gerbang 2 — tumpang tindih dengan pengajuan hidup milik sendiri (409).
  existing.forEach((row) => {
    if (row.employeeId !== employeeId || row.id === selfId) return;
    if (!LIVE_STATUS.includes(row.status)) return;
    if (startDate <= row.endDate && endDate >= row.startDate) {
      result.errors.push(`409 — tanggalnya bertabrakan dengan pengajuan hidup ${row.id}.`);
    }
  });

  // Gerbang 3 — tenggang pengajuan minimum (422).
  const lead = Math.round((new Date(`${startDate}T00:00:00`).getTime() - now.getTime()) / 86_400_000);
  if (type.minAdvanceDays && lead < type.minAdvanceDays) {
    result.errors.push(
      `422 — ${type.name} harus diajukan minimal ${type.minAdvanceDays} hari di muka (yang ini ${lead} hari).`,
    );
  }

  // Gerbang 4 — hari kerja bersih tidak boleh nol (422).
  result.totalDays = workingDays(employeeId, startDate, endDate, daySession);
  if (result.totalDays === 0) {
    result.errors.push('422 — rentangnya tidak memuat hari kerja bersih (libur dan akhir pekan dikeluarkan).');
  }

  // Lapis persetujuan tambahan — mengangkat, bukan memblokir.
  const balance = LEAVE_BALANCES.find(
    (row) =>
      row.employeeId === employeeId &&
      row.leaveTypeId === leaveTypeId &&
      row.periodYear === Number(startDate.slice(0, 4)),
  );
  if (type.affectsBalance && balance && balance.balanceDays - result.totalDays < 0) {
    result.extra.push('NEGATIVE_BALANCE');
  }
  if (!type.isPaid) result.extra.push('UNPAID_TYPE');
  if (result.totalDays > 5) result.extra.push('LONG_DURATION');

  return result;
}

/**
 * Alasan lapis tambahan yang dicatat di baris — mengikuti pemicu pertamanya,
 * bukan selalu `LONG_DURATION` seperti build lama.
 */
export function primaryExtraReason(extra: ExtraApprovalReason[]): ExtraApprovalReason | null {
  return extra[0] ?? null;
}
