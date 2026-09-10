import { describe, expect, it } from 'vitest';
import { evaluateGates, workingDays } from '@/features/time-off/gates';
import { timeOffService, sickWindowOpen } from '@/features/time-off/services/time-off.service';
import { LEAVE_REQUESTS, VIEWERS } from '@/features/time-off/mock-data';
import { DEMO_NOW } from '@/features/time-off/types';
import type { Session } from '@/features/time-off/types';

const HR: Session = VIEWERS[0]; // Hendra — HR_MANAGER
const ESS: Session = VIEWERS[2]; // Rina — EMPLOYEE

describe('Hari kerja bersih', () => {
  it('mengeluarkan akhir pekan dan hari libur yang disetujui', () => {
    // 17 Agu 2026 hari libur nasional; 15–16 Agu akhir pekan.
    expect(workingDays('emp-rina', '2026-08-14', '2026-08-18', 'FULL')).toBe(2);
  });

  it('setengah hari hanya berlaku pada rentang satu hari kerja', () => {
    expect(workingDays('emp-rina', '2026-08-10', '2026-08-10', 'HALF_AM')).toBe(0.5);
    expect(workingDays('emp-rina', '2026-08-10', '2026-08-11', 'HALF_AM')).toBe(2);
  });
});

describe('Empat gerbang submit', () => {
  const base = {
    employeeId: 'emp-rina',
    leaveTypeId: 'lt-annual',
    daySession: 'FULL' as const,
    existing: LEAVE_REQUESTS,
    now: DEMO_NOW,
  };

  it('gerbang 1 — blackout keras ditolak 422', () => {
    const result = evaluateGates({ ...base, leaveTypeId: 'lt-unpaid', startDate: '2027-12-29', endDate: '2027-12-30' });
    expect(result.errors.some((error) => /422.*blackout keras/.test(error))).toBe(true);
  });

  it('gerbang 1 — blackout lunak hanya menaikkan lapis tambahan', () => {
    const result = evaluateGates({ ...base, leaveTypeId: 'lt-unpaid', startDate: '2026-12-28', endDate: '2026-12-29' });
    expect(result.extra).toContain('SOFT_BLACKOUT');
    expect(result.errors.some((error) => error.includes('blackout'))).toBe(false);
  });

  it('gerbang 2 — tumpang tindih dengan pengajuan hidup sendiri ditolak 409', () => {
    const result = evaluateGates({ ...base, startDate: '2026-08-10', endDate: '2026-08-10' });
    expect(result.errors.some((error) => error.startsWith('409'))).toBe(true);
  });

  it('gerbang 3 — tenggang pengajuan minimum ditolak 422', () => {
    const result = evaluateGates({ ...base, startDate: '2026-07-25', endDate: '2026-07-25' });
    expect(result.errors.some((error) => /422.*hari di muka/.test(error))).toBe(true);
  });

  it('gerbang 4 — rentang tanpa hari kerja bersih ditolak 422', () => {
    // 15–16 Agustus 2026 jatuh Sabtu–Minggu.
    const result = evaluateGates({ ...base, startDate: '2026-08-15', endDate: '2026-08-16' });
    expect(result.totalDays).toBe(0);
    expect(result.errors.some((error) => /422.*hari kerja bersih/.test(error))).toBe(true);
  });

  it('lapis tambahan mengikuti pemicunya, bukan selalu LONG_DURATION', () => {
    const negative = evaluateGates({
      ...base,
      employeeId: 'emp-sari',
      startDate: '2026-09-07',
      endDate: '2026-09-08',
    });
    expect(negative.extra[0]).toBe('NEGATIVE_BALANCE');

    const unpaid = evaluateGates({ ...base, leaveTypeId: 'lt-unpaid', startDate: '2026-09-07', endDate: '2026-09-08' });
    expect(unpaid.extra).toContain('UNPAID_TYPE');
  });
});

describe('Pengajuan & keputusan', () => {
  it('cuti sakit lahir AUTO_APPROVED dengan jendela tolak beku', async () => {
    const row = await timeOffService.create(
      ESS,
      {
        leaveTypeId: 'lt-sick',
        daySession: 'FULL',
        startDate: '2026-07-28',
        endDate: '2026-07-28',
        reason: '',
        hasDoctorNote: true,
      },
      DEMO_NOW,
    );
    expect(row.status).toBe('AUTO_APPROVED');
    expect(row.rejectDeadlineAt).toBeTruthy();
    // Pemohon selalu diri sendiri.
    expect(row.employeeId).toBe(ESS.employeeId);
  });

  it('cuti biasa menunggu keputusan', async () => {
    const row = await timeOffService.create(
      ESS,
      {
        leaveTypeId: 'lt-annual',
        daySession: 'FULL',
        startDate: '2026-10-12',
        endDate: '2026-10-13',
        reason: 'Urusan keluarga.',
        hasDoctorNote: false,
      },
      DEMO_NOW,
    );
    expect(row.status).toBe('PENDING_APPROVAL');
  });

  it('ESS tidak melihat baris milik orang lain', async () => {
    const rows = await timeOffService.requests(ESS);
    expect(rows.every((row) => row.employeeId === ESS.employeeId)).toBe(true);

    const hrRows = await timeOffService.requests(HR);
    expect(hrRows.some((row) => row.employeeId !== HR.employeeId)).toBe(true);
  });

  it('menolak keputusan atas pengajuan sendiri (403 SoD)', async () => {
    const rows = await timeOffService.requests(HR);
    const own = rows.find((row) => row.employeeId === HR.employeeId && row.status === 'PENDING_APPROVAL')!;
    await expect(timeOffService.decide(HR, own.id, 'APPROVED', '', DEMO_NOW)).rejects.toThrow(/403/);
  });

  it('menolak tanpa alasan ditolak 422', async () => {
    const rows = await timeOffService.requests(HR);
    const other = rows.find((row) => row.employeeId !== HR.employeeId && row.status === 'PENDING_APPROVAL')!;
    await expect(timeOffService.decide(HR, other.id, 'REJECTED', '  ', DEMO_NOW)).rejects.toThrow(/422/);
  });
});

describe('Cuti sakit — jendela tolak', () => {
  it('jendela leave-2 terbuka pada waktu demo', async () => {
    const rows = await timeOffService.requests(HR);
    const sick = rows.find((row) => row.id === 'leave-2')!;
    expect(sickWindowOpen(sick, DEMO_NOW)).toBe(true);
  });

  it('menolak cuti sakit di luar jendela ditolak 422', async () => {
    const rows = await timeOffService.requests(HR);
    const closed = rows.find((row) => row.id === 'leave-6')!;
    await expect(timeOffService.rejectSick(HR, closed.id, 'Alasan', DEMO_NOW)).rejects.toThrow(/422/);
  });
});

describe('Penarikan & delegasi', () => {
  it('penarikan mengubah status jadi CANCELLED, baris tetap ada', async () => {
    const before = await timeOffService.requests(ESS);
    const target = before.find((row) => row.id === 'leave-3')!;
    await timeOffService.withdraw(ESS, target.id, DEMO_NOW);
    const after = await timeOffService.requests(ESS);
    expect(after.find((row) => row.id === target.id)!.status).toBe('CANCELLED');
    expect(after).toHaveLength(before.length);
  });

  it('ESS tidak boleh mendaftarkan delegasi', async () => {
    await expect(
      timeOffService.saveDelegation(ESS, { leaveRequestId: 'leave-1', substituteId: 'emp-budi' }, DEMO_NOW),
    ).rejects.toThrow(/403/);
  });

  it('cuti yang sudah punya delegasi hidup ditolak 409', async () => {
    await expect(
      timeOffService.saveDelegation(HR, { leaveRequestId: 'leave-7', substituteId: 'emp-sari' }, DEMO_NOW),
    ).rejects.toThrow(/409/);
  });
});

describe('Akses surat dokter', () => {
  it('peran tanpa hak ditolak 403 dan tidak menulis jejak', async () => {
    const before = await timeOffService.medicalAccess();
    await expect(timeOffService.openDoctorNote(ESS, 'leave-2', 'VERIFICATION', DEMO_NOW)).rejects.toThrow(/403/);
    const after = await timeOffService.medicalAccess();
    expect(after).toHaveLength(before.length);
  });

  it('surat yang sudah dimusnahkan dijawab 410', async () => {
    await expect(timeOffService.openDoctorNote(HR, 'leave-6', 'AUDIT', DEMO_NOW)).rejects.toThrow(/410/);
  });

  it('HR Manager menulis jejak lebih dulu saat membuka surat', async () => {
    const before = await timeOffService.medicalAccess();
    const log = await timeOffService.openDoctorNote(HR, 'leave-2', 'VERIFICATION', DEMO_NOW);
    const after = await timeOffService.medicalAccess();
    expect(after).toHaveLength(before.length + 1);
    expect(log.accessedBy).toBe(HR.employeeId);
  });
});
