import { DAILY_HOUR_CAP } from '@/features/overtime/mock-data';
import { formatDateTime } from '@/lib/format';
import { LIVE_ONCALL_STATUSES } from '@/features/oncall/types';
import type { OncallAssignment, OncallDraft } from '@/features/oncall/types';

/** Aturan murni On Call — dipakai pratinjau form dan service. */

/** Gabungkan tanggal + jam jadi timestamp berzona karyawan. */
export function stamp(date: string, time: string): string | null {
  return date && time ? `${date}T${time}:00+07:00` : null;
}

/** Panjang jendela dalam jam, dibulatkan dua desimal. */
export function windowHours(startAt: string | null, endAt: string | null): number | null {
  if (!startAt || !endAt) return null;
  const hours = (new Date(endAt).getTime() - new Date(startAt).getTime()) / 36e5;
  return Number.isFinite(hours) ? Math.round(hours * 100) / 100 : null;
}

/**
 * Lapis approval tambahan menyala saat pagu per call-out menembus plafon jam
 * harian company. Ia **menaikkan** jendela ke lapis berikutnya — bukan menolak.
 */
export function extraReasonFor(maxCalloutHours: number): 'MAX_CALLOUT_EXCEEDS_DAILY_CAP' | null {
  return maxCalloutHours > DAILY_HOUR_CAP ? 'MAX_CALLOUT_EXCEEDS_DAILY_CAP' : null;
}

/** Jendela hidup milik karyawan yang sama yang rentangnya bertindih. */
export function overlapping(
  rows: OncallAssignment[],
  employeeId: string,
  startAt: string,
  endAt: string,
  skipId?: string | null,
): OncallAssignment | undefined {
  return rows.find((row) => {
    if (row.id === skipId || row.employeeId !== employeeId) return false;
    if (!LIVE_ONCALL_STATUSES.includes(row.oncallStatus)) return false;
    return startAt < row.standbyEndAt && endAt > row.standbyStartAt;
  });
}

/** Pratinjau tiga nilai turunan server yang dibaca form. */
export function deriveOncall(draft: OncallDraft) {
  const startAt = stamp(draft.startDate, draft.startTime);
  const endAt = stamp(draft.endDate, draft.endTime);
  const cap = Number(draft.maxCalloutHours);
  return {
    startAt,
    endAt,
    hours: windowHours(startAt, endAt),
    extraReason: Number.isFinite(cap) ? extraReasonFor(cap) : null,
  };
}

/** Label satu jendela siaga — dipakai tabel, modal, dan ringkasan filter. */
export function windowLabel(row: OncallAssignment): string {
  return `${formatDateTime(row.standbyStartAt)} → ${formatDateTime(row.standbyEndAt)}`;
}
