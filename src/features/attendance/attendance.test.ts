import { beforeEach, describe, expect, it } from 'vitest';
import { attendanceService, resetAttendanceMocks } from '@/features/attendance/services/attendance.service';
import { captureChannel, eligibleDays, nextPunchType } from '@/features/attendance/rules';
import { DAILY, VIEWERS } from '@/features/attendance/mock-data';
import type { AttendanceSession } from '@/features/attendance/types';

const RINA: AttendanceSession = { employeeId: 'emp-rina', role: 'EMPLOYEE' };
const SARI: AttendanceSession = { employeeId: 'emp-sari', role: 'HR_STAFF' };
const HENDRA: AttendanceSession = { employeeId: 'emp-hendra', role: 'HR_MANAGER' };

const draft = {
  attendanceDailyId: 'day-rina-26',
  correctionReasonType: 'FORGOT_PUNCH' as const,
  reasonNote: '',
  requestedIn: '',
  requestedOut: '17:05',
};

beforeEach(() => {
  resetAttendanceMocks();
});

describe('Punch — append-only dan bergantung keadaan hari', () => {
  it('kanal WFO × geo-1 mewajibkan selfie, tap tanpa frame ditolak 422', async () => {
    const channel = captureChannel(RINA, DAILY);
    expect(channel.selfie).toBe(true);
    await expect(
      attendanceService.recordPunch(RINA, { selfieCaptured: false, idempotencyKey: 'key-1' }),
    ).rejects.toThrow(/422/);
  });

  it('tap pertama lahir sebagai IN, tap berikutnya OUT', async () => {
    const first = await attendanceService.recordPunch(RINA, { selfieCaptured: true, idempotencyKey: 'key-in' });
    expect(first.punch.punchType).toBe('IN');
    const second = await attendanceService.recordPunch(RINA, { selfieCaptured: true, idempotencyKey: 'key-out' });
    expect(second.punch.punchType).toBe('OUT');
    const rows = await attendanceService.todayPunches(RINA);
    expect(nextPunchType(RINA.employeeId, rows)).toBeNull();
  });

  it('kunci idempotensi yang sama tidak pernah melahirkan baris kedua', async () => {
    const first = await attendanceService.recordPunch(RINA, { selfieCaptured: true, idempotencyKey: 'same-key' });
    const retry = await attendanceService.recordPunch(RINA, { selfieCaptured: true, idempotencyKey: 'same-key' });
    expect(retry.replayed).toBe(true);
    expect(retry.punch.id).toBe(first.punch.id);
    expect(await attendanceService.todayPunches(RINA)).toHaveLength(1);
  });

  it('audit tap mentah tertutup untuk peran tanpa kewenangan penyelidikan', async () => {
    await expect(attendanceService.punches(SARI)).rejects.toThrow(/403/);
    await expect(attendanceService.punches(HENDRA)).resolves.toHaveLength(6);
  });
});

describe('Daily summary — putusan mesin', () => {
  it('sesi EMPLOYEE hanya melihat harinya sendiri', async () => {
    const rows = await attendanceService.days(RINA);
    expect(rows.every((row) => row.employeeId === 'emp-rina')).toBe(true);
  });

  it('sesi non-EMPLOYEE melihat seluruh hari', async () => {
    const rows = await attendanceService.days(SARI);
    expect(rows.length).toBe(DAILY.length);
  });

  it('filter excused menyaring hari yang sudah dimaafkan', async () => {
    const rows = await attendanceService.days(HENDRA, { excused: 'YES' });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('day-rina-27');
  });
});

describe('Correction — pengajuan', () => {
  it('menolak pengaju tanpa scope create', async () => {
    await expect(attendanceService.createCorrection(HENDRA, draft)).rejects.toThrow(/403/);
  });

  it('menolak alasan Other tanpa catatan', async () => {
    await expect(
      attendanceService.createCorrection(RINA, { ...draft, correctionReasonType: 'OTHER' }),
    ).rejects.toThrow(/422/);
  });

  it('menolak koreksi tanpa satu pun jam usulan', async () => {
    await expect(
      attendanceService.createCorrection(RINA, { ...draft, requestedOut: '' }),
    ).rejects.toThrow(/422/);
  });

  it('menolak hari yang sudah punya koreksi menunggu keputusan', async () => {
    await expect(
      attendanceService.createCorrection(RINA, { ...draft, attendanceDailyId: 'day-rina-27' }),
    ).rejects.toThrow(/409/);
  });

  it('hari dengan koreksi hidup keluar dari daftar pilihan', async () => {
    const rows = eligibleDays(RINA, DAILY, await attendanceService.corrections(SARI));
    expect(rows.map((row) => row.id)).toContain('day-rina-26');
    expect(rows.map((row) => row.id)).not.toContain('day-rina-27');
  });

  it('HR_STAFF boleh mengajukan atas nama pemilik hari yang berbeda', async () => {
    const row = await attendanceService.createCorrection(SARI, { ...draft, attendanceDailyId: 'day-2' });
    expect(row.employeeId).toBe('emp-sari');
    expect(row.correctionStatus).toBe('PENDING_APPROVAL');
  });
});

describe('Correction — keputusan', () => {
  it('pengaju tidak pernah bisa jadi penyetuju', async () => {
    const filer: AttendanceSession = { employeeId: 'emp-sari', role: 'HR_MANAGER' };
    await expect(attendanceService.decideCorrection(filer, 'cor-2', 'APPROVED')).rejects.toThrow(/403/);
  });

  it('peran tanpa scope approve ditolak 403', async () => {
    await expect(attendanceService.decideCorrection(SARI, 'cor-1', 'APPROVED')).rejects.toThrow(/403/);
  });

  it('setuju hanya menyalakan excused; menit terukur tidak berubah', async () => {
    const before = (await attendanceService.days(HENDRA)).find((row) => row.id === 'day-3')!;
    await attendanceService.decideCorrection(HENDRA, 'cor-2', 'APPROVED');
    const after = (await attendanceService.days(HENDRA)).find((row) => row.id === 'day-3')!;

    expect(after.isExcused).toBe(true);
    expect(after.excusedReason).toBe('APP_ERROR');
    expect(after.attendanceStatus).toBe(before.attendanceStatus);
    expect(after.workedMinutes).toBe(before.workedMinutes);
    expect(after.lateMinutes).toBe(before.lateMinutes);
    expect(after.undertimeMinutes).toBe(before.undertimeMinutes);
  });

  it('tolak tidak menyentuh hari sama sekali', async () => {
    const before = (await attendanceService.days(HENDRA)).find((row) => row.id === 'day-3')!;
    await attendanceService.decideCorrection(HENDRA, 'cor-2', 'REJECTED');
    const after = (await attendanceService.days(HENDRA)).find((row) => row.id === 'day-3')!;
    expect(after).toEqual(before);
  });

  it('koreksi yang sudah diputuskan tidak bisa diputuskan lagi', async () => {
    await expect(attendanceService.decideCorrection(HENDRA, 'cor-3', 'APPROVED')).rejects.toThrow(/409/);
  });
});

describe('Correction — penarikan', () => {
  it('hanya pengaju yang bisa menarik', async () => {
    await expect(attendanceService.withdrawCorrection(SARI, 'cor-1')).rejects.toThrow(/403/);
  });

  it('penarikan bukan penghapusan — barisnya tinggal sebagai Cancelled', async () => {
    const row = await attendanceService.withdrawCorrection(RINA, 'cor-1');
    expect(row.correctionStatus).toBe('CANCELLED');
    const rows = await attendanceService.corrections(RINA);
    expect(rows.find((item) => item.id === 'cor-1')).toBeTruthy();
  });

  it('hari itu bebas dikoreksi lagi setelah penarikan', async () => {
    await attendanceService.withdrawCorrection(RINA, 'cor-1');
    const row = await attendanceService.createCorrection(RINA, { ...draft, attendanceDailyId: 'day-rina-27' });
    expect(row.correctionStatus).toBe('PENDING_APPROVAL');
  });
});

describe('Scope pemilik baris', () => {
  it('sesi EMPLOYEE hanya melihat koreksi yang ia ajukan', async () => {
    const rows = await attendanceService.corrections(RINA);
    expect(rows.every((row) => row.employeeId === 'emp-rina')).toBe(true);
  });

  it('identitas percobaan mengikuti dataset kontrak', () => {
    expect(VIEWERS.map((row) => row.role)).toEqual(['EMPLOYEE', 'HR_STAFF', 'HR_MANAGER']);
  });
});
