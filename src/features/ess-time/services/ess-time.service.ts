import { timeOffService } from '@/features/time-off/services/time-off.service';
import { balanceService } from '@/features/time-off/services/balance.service';
import { attendanceService } from '@/features/attendance/services/attendance.service';
import { overtimeService } from '@/features/overtime/services/overtime.service';
import type { EssActor } from '@/features/ess-time/types';
import type { Delegation, LeaveRequest, LedgerEntry } from '@/features/time-off/types';
import type { AttendanceDay, Punch } from '@/features/attendance/types';
import type { OvertimeRequest } from '@/features/overtime/types';

/**
 * Jalur ESS — setiap panggilan memakai peran `ROLE_EMPLOYEE`/`EMPLOYEE` saja, sehingga
 * penyaringan milik-sendiri ditegakkan service (bukan disaring belakangan di layar). Nol
 * resource baru: ini pembungkus tipis di atas service Time yang sudah ada.
 */
export const essTimeService = {
  /** Cuti/sakit milik sendiri (UIC-TIME §3.1.5, kriteria ESS nol memuat pemilih karyawan). */
  async myLeaveRequests(actor: EssActor): Promise<LeaveRequest[]> {
    return timeOffService.requests({ employeeId: actor.employeeId, roles: ['ROLE_EMPLOYEE'] });
  },

  /**
   * Delegasi yang menyentuh pemanggil, dua arah: yang ia titipkan saat cuti (`delegatorId`) dan
   * yang dititipkan kepadanya (`substituteId` — menu ESS "kewenangan apa saja yang sedang
   * dititipkan kepada saya", UIC §3.2.4).
   */
  async myDelegations(actor: EssActor): Promise<{ given: Delegation[]; received: Delegation[] }> {
    const rows = await timeOffService.delegations();
    return {
      given: rows.filter((row) => row.delegatorId === actor.employeeId),
      received: rows.filter((row) => row.substituteId === actor.employeeId),
    };
  },

  /** Riwayat mutasi saldo milik sendiri — padanan `POST /leave-balance-ledgers/me-search` (§4.1.3). */
  async myLedger(actor: EssActor, periodYear?: number): Promise<LedgerEntry[]> {
    return balanceService.ledger({ employeeId: actor.employeeId, periodYear });
  },

  /** Saldo cuti milik sendiri, untuk kartu ringkas di layar Time Off Taken. */
  async myBalances(actor: EssActor, periodYear?: number) {
    return balanceService.balances({ employeeId: actor.employeeId, periodYear });
  },

  async myAttendanceDays(actor: EssActor): Promise<AttendanceDay[]> {
    return attendanceService.days({ employeeId: actor.employeeId, role: 'EMPLOYEE' });
  },

  async myPunchesToday(actor: EssActor): Promise<Punch[]> {
    return attendanceService.todayPunches({ employeeId: actor.employeeId, role: 'EMPLOYEE' });
  },

  async myOvertime(actor: EssActor): Promise<OvertimeRequest[]> {
    return overtimeService.requests({ employeeId: actor.employeeId, role: 'EMPLOYEE' });
  },
};
