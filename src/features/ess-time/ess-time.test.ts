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

  it('delegasi dipisah dua arah: yang dititipkan ke saya dan yang saya titipkan', async () => {
    const sari = await essTimeService.myDelegations(SARI);
    expect(sari.received.every((row) => row.substituteId === SARI.employeeId)).toBe(true);
    expect(sari.given.every((row) => row.delegatorId === SARI.employeeId)).toBe(true);

    // Dataset contoh menitipkan kewenangan kepada Sari, jadi sisi "received"-nya tidak kosong.
    expect(sari.received.length).toBeGreaterThan(0);
  });
});
