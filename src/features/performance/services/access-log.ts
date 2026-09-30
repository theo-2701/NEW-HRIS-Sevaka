import { ACCESS_LOG_SEED } from '@/features/performance/mock-data';
import { uuidV7 } from '@/features/performance/services/ids';
import type { AccessLogRow, PerfActor } from '@/features/performance/types';

/**
 * `access_log` (§4.7.7) — append-only, milik Menu 6, ditulis oleh empat titik pemicu lintas-menu.
 * Menulis baris adalah prasyarat baca: baca ditolak ⇒ nol baris, baca berhasil ⇒ tepat satu baris.
 * Membaca data diri sendiri tidak pernah dicatat.
 */

let rows: AccessLogRow[] = [];

export function resetAccessLog() {
  rows = structuredClone(ACCESS_LOG_SEED);
}
resetAccessLog();

/** Ejaan peran di `created_by` mengikuti kontrak (`ROLE_DEPARTMENT_MANAGER`). */
const CONTRACT_ROLE: Record<string, string> = { ROLE_DEPT_MANAGER: 'ROLE_DEPARTMENT_MANAGER' };

export function recordAccess(reader: PerfActor, subjectEmployeeId: string) {
  if (reader.employeeId === subjectEmployeeId) return;
  rows = [
    {
      id: uuidV7(),
      readerEmployeeId: reader.employeeId,
      subjectEmployeeId,
      createdBy: { employeeId: reader.employeeId, name: reader.name, role: CONTRACT_ROLE[reader.role] ?? reader.role },
      createdAt: new Date().toISOString(),
      activity: 'I',
    },
    ...rows,
  ];
}

export const accessLogStore = { all: () => rows };
