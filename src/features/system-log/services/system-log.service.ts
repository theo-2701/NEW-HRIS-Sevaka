import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { ERROR_CODE_LOGS, TRACE_LOGS, UNAVAILABLE_TRACE_ID } from '@/features/system-log/mock-data';
import { ERROR_CODE_LIMIT, RETENTION_DAYS, TRACE_LIMIT } from '@/features/system-log/types';
import type { LogEntry, LogGrid, LogLevel } from '@/features/system-log/types';

/**
 * Pembaca log sistem — UIC-AUTH 0.28 §8A (auth-service, Super Admin saja, bukan alamat tenant):
 *   POST /system-log/trace/search       · rentang tetap 7 hari, urut waktu naik, size 1000
 *   POST /system-log/error-code/search  · rentang ≤ 24 jam, terbaru dulu, size 500
 * Galat: `422` `AUT-VAL-318`..`325` di medan, `403` bukan Super Admin, `503` `AUT-DEP-326` penyimpan log mati.
 */
const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

interface LogRowDto {
  occurred_at: string;
  service: string;
  instance: string;
  level: LogLevel;
  trace_id: string | null;
  error_code: string | null;
  message: string;
}

interface LogGridDto {
  data: LogRowDto[];
  total_data: number;
  is_truncated: boolean;
  range_from: string;
  range_to: string;
}

const fromDto = (dto: LogGridDto): LogGrid => ({
  rows: dto.data.map((row, index) => ({
    id: `${row.occurred_at}-${index}`,
    occurredAt: row.occurred_at,
    service: row.service,
    instance: row.instance,
    level: row.level,
    errorCode: row.error_code,
    message: row.message,
    traceId: row.trace_id,
  })),
  totalData: dto.total_data,
  isTruncated: dto.is_truncated,
  rangeFrom: dto.range_from,
  rangeTo: dto.range_to,
});

function grid(rows: LogEntry[], limit: number, rangeFrom: Date, rangeTo: Date): LogGrid {
  return {
    rows: rows.slice(0, limit),
    totalData: Math.min(rows.length, limit),
    isTruncated: rows.length > limit,
    rangeFrom: rangeFrom.toISOString(),
    rangeTo: rangeTo.toISOString(),
  };
}

/** ISO-8601 dengan offset `+07:00` (UIC §8A.2). */
function withJakartaOffset(date: Date): string {
  const local = new Date(date.getTime() + 7 * 3_600_000).toISOString().slice(0, 19);
  return `${local}+07:00`;
}

export const systemLogService = {
  async traceSearch(traceId: string): Promise<LogGrid> {
    if (MOCK) {
      await delay();
      if (traceId === UNAVAILABLE_TRACE_ID) throw new Error('503 AUT-DEP-326 — The log store is unavailable.');
      const to = new Date();
      const from = new Date(to.getTime() - RETENTION_DAYS * 24 * 3_600_000);
      const rows = TRACE_LOGS.filter((row) => row.traceId === traceId).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      return grid(rows, TRACE_LIMIT, from, to);
    }
    const { data } = await api.post<LogGridDto>('/system-log/trace/search', {
      filters: { trace_id: traceId },
      page: 1,
      size: TRACE_LIMIT,
      sort_by: 'occurred_at',
      sort_direction: 'ASC',
    });
    return fromDto(data);
  },

  async errorCodeSearch(errorCode: string, from: Date, to: Date): Promise<LogGrid> {
    if (MOCK) {
      await delay();
      const rows = ERROR_CODE_LOGS.filter((row) => {
        const at = Date.parse(row.occurredAt);
        return row.errorCode === errorCode && at >= from.getTime() && at <= to.getTime();
      }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      return grid(rows, ERROR_CODE_LIMIT, from, to);
    }
    const { data } = await api.post<LogGridDto>('/system-log/error-code/search', {
      filters: { error_code: errorCode, from: withJakartaOffset(from), to: withJakartaOffset(to) },
      page: 1,
      size: ERROR_CODE_LIMIT,
      sort_by: 'occurred_at',
      sort_direction: 'DESC',
    });
    return fromDto(data);
  },
};
