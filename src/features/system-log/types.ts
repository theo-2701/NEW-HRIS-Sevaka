/** Company Management › System Log — FSD-AUTH 0.22–0.24 §7A/§7B · UIC-AUTH 0.28–0.30 §8A. */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

/** Satu baris log terpusat — teksnya sudah ter-mask di server dan ditampilkan apa adanya. */
export interface LogEntry {
  id: string;
  occurredAt: string;
  /** Nama service tanpa akhiran perusahaan (`employee`). */
  service: string;
  /** Nama instance utuh (`employee-c001`) — tampil saat kursor diarahkan. */
  instance: string;
  level: LogLevel;
  errorCode: string | null;
  message: string;
  traceId: string | null;
}

/** Jawaban grid `system-log/*\/search`: `total_data`, `is_truncated`, `range_from`, `range_to`. */
export interface LogGrid {
  rows: LogEntry[];
  totalData: number;
  isTruncated: boolean;
  rangeFrom: string;
  rangeTo: string;
}

/** Satu jawaban Trace ID memuat seluruh alur sekali (size 1000, urut waktu naik). */
export const TRACE_LIMIT = 1000;
/** Error Code: kejadian terbaru dulu, maks 500. */
export const ERROR_CODE_LIMIT = 500;
/** Masa simpan penyimpan log terpusat. */
export const RETENTION_DAYS = 7;
export const MAX_RANGE_HOURS = 24;
