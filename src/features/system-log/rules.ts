import { MAX_RANGE_HOURS, RETENTION_DAYS } from '@/features/system-log/types';
import type { LogGrid } from '@/features/system-log/types';

/**
 * Aturan murni System Log (FSD-AUTH §7A.1/§7B.1). Galat lokal memakai kalimat yang sama dengan `422`
 * server (`AUT-VAL-318`..`325`) supaya layar tidak berganti kata bergantung siapa yang menolak.
 */

const REQUIRED = 'This field is required.';
const HOUR = 3_600_000;

export const normalizeTraceId = (value: string) => value.trim().toLowerCase();
export const normalizeErrorCode = (value: string) => value.trim().toUpperCase();

/** 16 atau 32 karakter `0–9`/`a–f` (huruf besar diterima, dikirim huruf kecil). */
export function traceIdError(value: string): string | null {
  const id = normalizeTraceId(value);
  if (!id) return REQUIRED;
  return /^(?:[0-9a-f]{16}|[0-9a-f]{32})$/.test(id) ? null : 'Enter 16 or 32 characters using only 0–9 and a–f.';
}

/** Bentuk `ABC-DEF-123` (huruf kecil diterima, dikirim huruf besar). */
export function errorCodeError(value: string): string | null {
  const code = normalizeErrorCode(value);
  if (!code) return REQUIRED;
  return /^[A-Z]{3}-[A-Z]{3}-\d{3}$/.test(code) ? null : 'Use the format ABC-DEF-123.';
}

/** Rentang Error Code: ≤ 24 jam, dalam 7 hari terakhir, tidak di masa depan. */
export function rangeErrors(from: Date, to: Date, now = new Date()): { from?: string; to?: string } {
  const errors: { from?: string; to?: string } = {};
  if (from.getTime() < now.getTime() - RETENTION_DAYS * 24 * HOUR) errors.from = 'The start time cannot be more than 7 days ago.';
  if (to.getTime() <= from.getTime()) errors.to = 'The end time must be after the start time.';
  else if (to.getTime() - from.getTime() > MAX_RANGE_HOURS * HOUR) errors.to = 'The time range can be at most 24 hours.';
  else if (to.getTime() > now.getTime() + 60_000) errors.to = 'The end time cannot be in the future.';
  return errors;
}

/** Nilai `<input type="datetime-local">` (jam perangkat, menit bulat). */
export function toLocalInput(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Bawaan Error Code: satu jam terakhir. */
export function defaultRange(now = new Date()) {
  const to = new Date(now);
  to.setSeconds(0, 0);
  return { from: toLocalInput(new Date(to.getTime() - HOUR)), to: toLocalInput(to) };
}

/** Waktu log tanpa pecahan detik, zona UTC+07:00. */
export function logTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(new Date(iso));
}

/** `N log entries between <from> and <to> (UTC+07:00).` */
export function rangeSummary(grid: LogGrid): string {
  const noun = grid.totalData === 1 ? 'log entry' : 'log entries';
  return `${grid.totalData} ${noun} between ${logTime(grid.rangeFrom)} and ${logTime(grid.rangeTo)} (UTC+07:00).`;
}

/** Galat muat = selain `403`/`422` (termasuk `429`/`500`/`503`) — spanduk + Try again, tanpa teks kosong. */
export function isLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return !/^(403|422)\b/.test(error.message);
}
