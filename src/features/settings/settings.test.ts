import { beforeEach, describe, expect, it } from 'vitest';
import { resetSettingsMocks, settingsService } from '@/features/settings/services/settings.service';
import { SETTINGS_VIEWERS } from '@/features/settings/mock-data';
import { belongsTo } from '@/features/settings/rules';
import { SettingsWriteError } from '@/features/settings/types';
import type { SettingsRole } from '@/features/settings/types';
import { ApiError } from '@/services/api';

const as = (role: SettingsRole) => SETTINGS_VIEWERS.find((row) => row.role === role)!;
const HR_MANAGER = as('ROLE_HR_MANAGER');
const HR_STAFF = as('ROLE_HR_STAFF');
const EMPLOYEE = as('ROLE_EMPLOYEE');

beforeEach(() => resetSettingsMocks());

describe('A1 — pintu baca', () => {
  it('Menu Waktu berisi 26 setelan dalam 7 awalan; Menu Karyawan satu REPRIMAND_RULE', async () => {
    const rows = await settingsService.read(HR_MANAGER);
    const time = rows.filter((row) => belongsTo('time', row.setupCode));
    expect(time).toHaveLength(26);
    expect(new Set(time.map((row) => row.setupCode.split('.')[0])).size).toBe(7);
    expect(rows.filter((row) => belongsTo('employee', row.setupCode)).map((row) => row.setupCode)).toEqual([
      'REPRIMAND_RULE',
    ]);
  });

  it('baris terkunci absen; urutan setup_code menaik', async () => {
    const rows = await settingsService.read(HR_MANAGER);
    expect(rows.some((row) => row.setupCode === 'settings.identity_retention_days')).toBe(false);
    const codes = rows.map((row) => row.setupCode);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
  });

  it('kelas R‡ (HR Staff): penawaran DI-OMIT, bukan null; nol akses → 403', async () => {
    const rows = await settingsService.read(HR_STAFF);
    expect(rows.length).toBe(27);
    expect(rows.every((row) => !('setupOptions' in row))).toBe(true);
    await expect(settingsService.read(EMPLOYEE)).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.status === 403,
    );
  });
});

describe('A2 — pintu tulis', () => {
  it('nilai berubah melahirkan versi; nilai sama → changed:false, versi null', async () => {
    const result = await settingsService.write(HR_MANAGER, [
      { setupCode: 'attendance.late_tolerance_minutes', setupValue: [15] },
      { setupCode: 'overtime.max_hours_per_day', setupValue: [4] },
    ]);
    expect(result[0]).toMatchObject({ changed: true, versionNumber: 2 });
    expect(result[1]).toMatchObject({ changed: false, versionNumber: null });
    expect(settingsService.versionsOf('attendance.late_tolerance_minutes')).toHaveLength(1);
  });

  it('semua baris dinilai; satu ditolak ⇒ nol berubah, kode paling keras menang', async () => {
    const error = await settingsService
      .write(HR_MANAGER, [
        { setupCode: 'settings.identity_retention_days', setupValue: [365] },
        { setupCode: 'attendance.late_tolerance_minutes', setupValue: [90] },
      ])
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(SettingsWriteError);
    const writeError = error as SettingsWriteError;
    expect(writeError.status).toBe(403);
    expect(writeError.code).toBe('SETUP_CODE_LOCKED');
    expect(writeError.errors.map((row) => row.code)).toEqual(['SETUP_CODE_LOCKED', 'SETUP_VALUE_NOT_OFFERED']);
    const rows = await settingsService.read(HR_MANAGER);
    expect(rows.find((row) => row.setupCode === 'attendance.late_tolerance_minutes')?.setupValue).toEqual([0]);
  });

  it('DAFTAR wajib anggota pilihan; kode tak dikenal 422; HR Staff tidak bisa menulis', async () => {
    await expect(
      settingsService.write(HR_MANAGER, [{ setupCode: 'REPRIMAND_RULE', setupValue: ['MAYBE'] }]),
    ).rejects.toMatchObject({ code: 'SETUP_VALUE_NOT_OFFERED' });
    await expect(
      settingsService.write(HR_MANAGER, [{ setupCode: 'attendance.unknown_key', setupValue: [1] }]),
    ).rejects.toMatchObject({ code: 'SETUP_CODE_UNKNOWN', status: 422 });
    await expect(
      settingsService.write(HR_STAFF, [{ setupCode: 'REPRIMAND_RULE', setupValue: ['ACTIVE'] }]),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('REPRIMAND_RULE yang diubah langsung terbaca layar Reprimand (satu sumber)', async () => {
    expect(await settingsService.reprimandRule()).toBe('NON-ACTIVE');
    await settingsService.write(HR_MANAGER, [{ setupCode: 'REPRIMAND_RULE', setupValue: ['ACTIVE'] }]);
    expect(await settingsService.reprimandRule()).toBe('ACTIVE');
  });
});
