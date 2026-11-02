import { ApiError, api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  ERROR_CODE_LIMIT,
  ERROR_CODE_PATTERN,
  HOUR,
  TRACE_ID_PATTERN,
  TRACE_LIMIT,
  errorCodeProblem,
} from '@/features/system-log/types';
import type { LogLevel, LogPage, LogRow, SystemLogRole } from '@/features/system-log/types';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

/** Mode dummy: trace ini mensimulasikan Loki lambat/putus (`503` `AUT-DEP-326`). */
export const UNAVAILABLE_TRACE = 'deadbeefdeadbeef';
export const DEMO_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';

const iso = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}+07:00`;
};

function seedLogs(now = Date.now()): LogRow[] {
  const at = (minutesAgo: number, seconds = 0) => iso(new Date(now - minutesAgo * 60_000 + seconds * 1000));
  const line = (
    minutesAgo: number,
    seconds: number,
    service: string,
    level: LogLevel,
    traceId: string | null,
    errorCode: string | null,
    message: string,
  ): LogRow => ({
    occurredAt: at(minutesAgo, seconds),
    service,
    instance: service === 'hris-auth-service' ? service : `${service}-c001`,
    level,
    traceId,
    errorCode,
    message,
  });
  const t2 = '9a1c3e5f7b2d4c6e';
  const t3 = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';
  return [
    line(42, 0, 'hris-auth-service', 'INFO', DEMO_TRACE, null, `[trace=${DEMO_TRACE}] POST /employees/emp-****/work-data token ok role=HR_MANAGER`),
    line(42, 1, 'employee', 'INFO', DEMO_TRACE, null, `[trace=${DEMO_TRACE}] PATCH work-data employee=emp-**** fields=[sbu,bank_code]`),
    line(42, 1, 'employee', 'WARN', DEMO_TRACE, null, `[trace=${DEMO_TRACE}] company-service slow 2.4s on GET /branches/br-****`),
    line(42, 3, 'employee', 'ERROR', DEMO_TRACE, 'EMP-DEP-725', `[trace=${DEMO_TRACE}] EMP-DEP-725 company-service unavailable, account=****1562`),
    line(18, 0, 'time', 'INFO', t2, null, `[trace=${t2}] POST /time-off/requests employee=emp-****`),
    line(18, 1, 'time', 'ERROR', t2, 'TIM-BIZ-620', `[trace=${t2}] TIM-BIZ-620 approver not found reason=PARENT_VACANT`),
    line(7, 0, 'employee', 'ERROR', t3, 'EMP-DEP-725', `[trace=${t3}] EMP-DEP-725 company-service unavailable, nik=****0051`),
    line(7, 2, 'hris-auth-service', 'INFO', t3, null, `[trace=${t3}] audit REVEAL_STANDING written`),
  ];
}

function requireSuperAdmin(role: SystemLogRole) {
  if (role !== 'SUPER_ADMIN') throw new ApiError('Only Super Admin can read system logs.', 403, 'AUT-AUZ-034');
}

const page = (rows: LogRow[], limit: number, rangeFrom: string, rangeTo: string): LogPage => ({
  rows: rows.slice(0, limit),
  total: Math.min(rows.length, limit),
  isTruncated: rows.length > limit,
  rangeFrom,
  rangeTo,
});

export const systemLogService = {
  /** `POST /system-log/trace/search` — 7 hari terakhir, waktu naik, maks 1.000 baris. */
  async searchTrace(role: SystemLogRole, traceId: string): Promise<LogPage> {
    const value = traceId.trim();
    if (!value) throw new ApiError('Enter a trace ID.', 422, 'AUT-VAL-318');
    if (!TRACE_ID_PATTERN.test(value)) throw new ApiError('A trace ID is 16 or 32 hexadecimal characters.', 422, 'AUT-VAL-319');
    if (MOCK) {
      await delay();
      requireSuperAdmin(role);
      if (value.toLowerCase() === UNAVAILABLE_TRACE) {
        throw new ApiError('The log store is temporarily unavailable.', 503, 'AUT-DEP-326');
      }
      const now = new Date();
      const rows = seedLogs(now.getTime())
        .filter((row) => row.traceId === value.toLowerCase())
        .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
      return page(rows, TRACE_LIMIT, iso(new Date(now.getTime() - 7 * 24 * HOUR)), iso(now));
    }
    const { data } = await api.post<{ data: LogPage }>('/system-log/trace/search', {
      filters: { trace_id: value.toLowerCase() },
      page: 1,
      size: TRACE_LIMIT,
      sort_by: 'occurred_at',
      sort_direction: 'ASC',
    });
    return data.data;
  },

  /** `POST /system-log/error-code/search` — rentang ≤ 24 jam, waktu turun, maks 500 baris. */
  async searchErrorCode(role: SystemLogRole, code: string, from: Date, to: Date): Promise<LogPage> {
    const problem = errorCodeProblem(code, from, to);
    if (problem) throw new ApiError(problem, 422, ERROR_CODE_PATTERN.test(code.trim()) ? 'AUT-VAL-322' : 'AUT-VAL-321');
    const value = code.trim().toUpperCase();
    if (MOCK) {
      await delay();
      requireSuperAdmin(role);
      const rows = seedLogs()
        .filter((row) => row.errorCode === value && row.occurredAt >= iso(from) && row.occurredAt <= iso(to))
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      return page(rows, ERROR_CODE_LIMIT, iso(from), iso(to));
    }
    const { data } = await api.post<{ data: LogPage }>('/system-log/error-code/search', {
      filters: { error_code: value, from: iso(from), to: iso(to) },
      page: 1,
      size: ERROR_CODE_LIMIT,
      sort_by: 'occurred_at',
      sort_direction: 'DESC',
    });
    return data.data;
  },
};
