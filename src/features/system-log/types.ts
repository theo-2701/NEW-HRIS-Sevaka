/**
 * System Log (TSD-AUTH 0.167 §14.6, CATATAN 25 Okt LNT-2610242255 T5/T9). Pembaca log Loki
 * lewat auth-service; hanya `ROLE_SUPER_ADMIN`. Teks layar Inggris.
 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogRow {
  /** `yyyy-MM-ddTHH:mm:ss` + offset, tanpa pecahan detik. */
  occurredAt: string;
  service: string;
  instance: string;
  level: LogLevel;
  traceId: string | null;
  errorCode: string | null;
  /** Sudah di-mask server (§14.6.5); tampil apa adanya. */
  message: string;
}

export interface LogPage {
  rows: LogRow[];
  total: number;
  isTruncated: boolean;
  rangeFrom: string;
  rangeTo: string;
}

export type SystemLogRole = 'SUPER_ADMIN' | 'HR_MANAGER';

export const TRACE_ID_PATTERN = /^[0-9a-fA-F]{16}([0-9a-fA-F]{16})?$/;
export const ERROR_CODE_PATTERN = /^[A-Za-z]{3}-[A-Za-z]{3}-[0-9]{3}$/;
export const TRACE_LIMIT = 1000;
export const ERROR_CODE_LIMIT = 500;
export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

/** Validasi Error Code di klien — kode galat sama dengan server (§14.6.2). */
export function errorCodeProblem(code: string, from: Date, to: Date, now = new Date()): string | null {
  if (!code.trim()) return 'Enter an error code.';
  if (!ERROR_CODE_PATTERN.test(code.trim())) return 'Use the form ABC-DEF-123.';
  if (!(from < to)) return '"From" must be before "To".';
  if (to.getTime() - from.getTime() > DAY) return 'The range can be at most 24 hours.';
  if (from.getTime() < now.getTime() - 7 * DAY) return '"From" cannot be older than 7 days.';
  if (to.getTime() > now.getTime() + 5 * 60 * 1000) return '"To" cannot be in the future.';
  return null;
}
