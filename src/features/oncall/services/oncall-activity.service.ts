import { overtimeService } from '@/features/overtime/services/overtime.service';
import { employeeName } from '@/features/oncall/mock-data';
import type { OvertimeRequest, OvertimeSession } from '@/features/overtime/types';

/**
 * API service On Call Activity (FSD-001-TIME §11 · UIC-001-TIME §12).
 *
 * Bukan sumber daya baru: ini bacaan tersaring atas baris lembur yang sama
 * dengan menu Overtime — hanya yang **lahir otomatis** dari kehadiran yang
 * jatuh di dalam jendela siaga yang disetujui. Nol jalur tulis di mana pun:
 * call-out yang benar-benar terjadi dicatat otomatis dari kehadiran, tidak
 * pernah diketik siapa pun, dan pintu keputusannya tetap satu di menu Overtime.
 */

/** Layar ini membaca lintas karyawan, jadi sesinya bukan mode ESS. */
const READER: OvertimeSession = { employeeId: 'emp-hendra', role: 'HR_MANAGER' };

export interface ActivityFilter {
  oncallAssignmentId?: string;
  overtimeStatus?: string;
  overtimeCategory?: string;
  from?: string;
  to?: string;
  employeeName?: string;
}

export const oncallActivityService = {
  async list(filter: ActivityFilter = {}): Promise<OvertimeRequest[]> {
    const rows = await overtimeService.requests(READER, {});
    return rows
      .filter((row) => row.isAuto && row.oncallAssignmentId)
      .filter((row) => {
        if (filter.oncallAssignmentId && row.oncallAssignmentId !== filter.oncallAssignmentId) return false;
        if (filter.overtimeStatus && row.overtimeStatus !== filter.overtimeStatus) return false;
        if (filter.overtimeCategory && row.overtimeCategory !== filter.overtimeCategory) return false;
        if (filter.from && row.overtimeDate < filter.from) return false;
        if (filter.to && row.overtimeDate > filter.to) return false;
        if (
          filter.employeeName &&
          !employeeName(row.employeeId).toLowerCase().includes(filter.employeeName.toLowerCase())
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  },
};
