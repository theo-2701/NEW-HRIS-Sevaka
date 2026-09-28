import { describe, expect, it } from 'vitest';
import { essTimeService } from '@/features/ess-time/services/ess-time.service';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';

const RINA = ESS_VIEWERS[0];
const BUDI = ESS_VIEWERS[1];
const SARI = ESS_VIEWERS[2];

describe('ESS Time — cakupan selalu milik pemanggil', () => {
  it('pengajuan cuti hanya memulangkan baris pemanggil, walau identitasnya juga approver', async () => {
    const mine = await essTimeService.myLeaveRequests(RINA);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((row) => row.employeeId === RINA.employeeId)).toBe(true);

    // Budi memegang peran approver di layar HR; lewat jalur ESS ia tetap hanya melihat miliknya.
    const budi = await essTimeService.myLeaveRequests(BUDI);
    expect(budi.every((row) => row.employeeId === BUDI.employeeId)).toBe(true);
  });

  it('riwayat mutasi saldo mengikuti pola me-search — nol baris milik orang lain', async () => {
    const ledger = await essTimeService.myLedger(RINA);
    expect(ledger.every((row) => row.employeeId === RINA.employeeId)).toBe(true);
  });

  it('kehadiran dan lembur juga tersaring ke pemanggil', async () => {
    const days = await essTimeService.myAttendanceDays(RINA);
    expect(days.every((row) => row.employeeId === RINA.employeeId)).toBe(true);

    const overtime = await essTimeService.myOvertime(RINA);
    expect(overtime.every((row) => row.employeeId === RINA.employeeId)).toBe(true);
  });

  it('delegasi ESS hanya yang SAYA titipkan (employee_id pemberi, UIC-TIME 0.14 §3.2.4)', async () => {
    // Sari hanya penerima titipan di dataset — menu ESS-nya kosong, bukan menampilkan titipan orang lain.
    expect(await essTimeService.myDelegations(SARI)).toEqual([]);
    const hendra = ESS_VIEWERS.find((row) => row.employeeId === 'emp-hendra')!;
    const given = await essTimeService.myDelegations(hendra);
    expect(given.length).toBeGreaterThan(0);
    expect(given.every((row) => row.delegatorId === 'emp-hendra')).toBe(true);
  });
});
