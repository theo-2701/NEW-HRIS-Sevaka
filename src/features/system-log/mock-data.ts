import type { LogEntry } from '@/features/system-log/types';

/**
 * Dataset contoh System Log — relatif terhadap jam sekarang supaya bawaan "satu jam terakhir" layar
 * Error Code langsung menemukan baris. Teks pesan sudah ter-mask seperti keluaran server.
 */
const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

/** Alur contoh: buka Detail pegawai dari layar Company → employee-service menolak karena aturan setup cabang. */
export const DEMO_TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';
/** Alur lain yang ikut tercatat dengan kode yang sama. */
const OTHER_TRACE_ID = '9c1d7e52a0b84f13';
/** Mode dummy: trace nol semua memperagakan penyimpan log tak tersedia (`503` `AUT-DEP-326`). */
export const UNAVAILABLE_TRACE_ID = '0000000000000000';

const row = (entry: Omit<LogEntry, 'id'>, index: number): LogEntry => ({ id: `log-${index}`, ...entry });

const TRACE_SEED: Omit<LogEntry, 'id'>[] = [
  { occurredAt: ago(42.6), service: 'gateway', instance: 'gateway-c001', level: 'INFO', errorCode: null, traceId: DEMO_TRACE_ID,
    message: 'GET /api/v1/COMPANY001/employee/employees/emp-•••••/detail — routed to employee-service' },
  { occurredAt: ago(42.58), service: 'company', instance: 'company-c001', level: 'INFO', errorCode: null, traceId: DEMO_TRACE_ID,
    message: 'Branch setup read for branch br-•••• — level 2, parent required' },
  { occurredAt: ago(42.55), service: 'employee', instance: 'employee-c001', level: 'INFO', errorCode: null, traceId: DEMO_TRACE_ID,
    message: 'Detail request by ROLE_HR_STAFF for employee NIK 3175••••••••0001' },
  { occurredAt: ago(42.53), service: 'employee', instance: 'employee-c001', level: 'WARN', errorCode: null, traceId: DEMO_TRACE_ID,
    message: 'Branch of caller is not an ancestor of the target branch — evaluating branch setup rule' },
  { occurredAt: ago(42.52), service: 'employee', instance: 'employee-c001', level: 'ERROR', errorCode: 'EMP-AUZ-724', traceId: DEMO_TRACE_ID,
    message: 'Access denied by branch setup rule (EMP-AUZ-724) — email r•••@ptdika.co.id, phone +62•••••••0002' },
  { occurredAt: ago(42.5), service: 'gateway', instance: 'gateway-c001', level: 'INFO', errorCode: null, traceId: DEMO_TRACE_ID,
    message: 'Response 403 in 61 ms' },
];
export const TRACE_LOGS: LogEntry[] = TRACE_SEED.map(row);

const ERROR_CODE_SEED: Omit<LogEntry, 'id'>[] = [
  { occurredAt: ago(12), service: 'employee', instance: 'employee-c001', level: 'ERROR', errorCode: 'EMP-AUZ-724', traceId: OTHER_TRACE_ID,
    message: 'Access denied by branch setup rule (EMP-AUZ-724) — employee NIK 3273••••••••0417' },
  { occurredAt: ago(42.52), service: 'employee', instance: 'employee-c001', level: 'ERROR', errorCode: 'EMP-AUZ-724', traceId: DEMO_TRACE_ID,
    message: 'Access denied by branch setup rule (EMP-AUZ-724) — email r•••@ptdika.co.id, phone +62•••••••0002' },
  { occurredAt: ago(58), service: 'employee', instance: 'employee-c002', level: 'ERROR', errorCode: 'EMP-AUZ-724', traceId: null,
    message: 'Access denied by branch setup rule (EMP-AUZ-724) — scheduled export, no request trace' },
];
export const ERROR_CODE_LOGS: LogEntry[] = ERROR_CODE_SEED.map((entry, index) => row(entry, 100 + index));
