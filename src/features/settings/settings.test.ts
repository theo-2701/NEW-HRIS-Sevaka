import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetSettingsMocks, settingsService } from '@/features/settings/services/settings.service';
import { erasureService, resetErasureMocks } from '@/features/settings/services/erasure.service';
import { ASSIGNMENT_GAP, SETTING_SEED, SETTINGS_VIEWERS, VERSION_HISTORY } from '@/features/settings/mock-data';
import { belongsTo, deriveTabs, historyPrefixes, HISTORY_MODULES, SETTINGS_MENUS } from '@/features/settings/rules';
import { SettingsWriteError } from '@/features/settings/types';
import type { SettingsMenuId, SettingsRole } from '@/features/settings/types';
import { ApiError } from '@/services/api';

const as = (role: SettingsRole) => SETTINGS_VIEWERS.find((row) => row.role === role)!;
const HR_MANAGER = as('ROLE_HR_MANAGER');
const HR_STAFF = as('ROLE_HR_STAFF');
const EMPLOYEE = as('ROLE_EMPLOYEE');
const PAYROLL_OFFICER = as('ROLE_PAYROLL_OFFICER');

const codesOf = async (menu: SettingsMenuId) =>
  (await settingsService.read(HR_MANAGER)).filter((row) => belongsTo(menu, row.setupCode)).map((row) => row.setupCode);

const writeError = (promise: Promise<unknown>): Promise<SettingsWriteError> =>
  promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (err: unknown) => err as SettingsWriteError,
  );

beforeEach(() => {
  resetSettingsMocks();
  resetErasureMocks();
});
afterEach(() => {
  ASSIGNMENT_GAP.viewProvisioned = false;
});

describe('A1 — pintu baca', () => {
  it('kelas PENUH membaca 76 baris; cacah per Menu 26/27/8/7/2/2/3/1', async () => {
    const rows = await settingsService.read(HR_MANAGER);
    expect(rows).toHaveLength(76);
    const counts = SETTINGS_MENUS.map((menu) => rows.filter((row) => belongsTo(menu, row.setupCode)).length);
    expect(counts).toEqual([26, 27, 8, 7, 2, 2, 3, 1]);
  });

  it('baris terkunci absen; urutan setup_code menaik', async () => {
    const rows = await settingsService.read(HR_MANAGER);
    expect(rows.some((row) => row.setupCode === 'settings.identity_retention_days')).toBe(false);
    const codes = rows.map((row) => row.setupCode);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b)));
  });

  it('kelas R‡: hanya modul miliknya, penawaran & jangkauan DI-OMIT; nol akses → 403', async () => {
    const counts: [SettingsRole, number][] = [
      ['ROLE_HR_STAFF', 29],
      ['ROLE_FINANCE_OFFICER', 27],
      ['ROLE_PAYROLL_OFFICER', 8],
      ['ROLE_DEPARTMENT_MANAGER', 7],
      ['ROLE_SYSTEM_ADMIN', 3],
    ];
    for (const [role, count] of counts) {
      const rows = await settingsService.read(as(role));
      expect(rows).toHaveLength(count);
      expect(rows.every((row) => !('setupOptions' in row) && !('jangkauan' in row))).toBe(true);
      // Menu Dokumen nol punya kelas R‡.
      expect(rows.some((row) => belongsTo('document', row.setupCode))).toBe(false);
    }
    await expect(settingsService.read(EMPLOYEE)).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.status === 403,
    );
  });

  it('medan turunan: keadaan_nilai + pasangan_key (Penggajian), jangkauan kelas PENUH (Produktivitas)', async () => {
    const rows = await settingsService.read(HR_MANAGER);
    const percent = rows.find((row) => row.setupCode === 'payroll.suspension_pay_percent')!;
    expect(percent).toMatchObject({ keadaanNilai: 'WAJIB_BERSYARAT', pasanganKey: 'payroll.suspension_pay_mode' });
    expect(rows.find((row) => row.setupCode === 'payroll.bulk_change_escalation_count')?.keadaanNilai).toBe(
      'SENGAJA_KOSONG',
    );
    expect(rows.find((row) => row.setupCode === 'productivity.entry_window_days')?.jangkauan).toHaveLength(3);
    expect(rows.find((row) => row.setupCode === 'productivity.task_due_reminder_days')?.jangkauan).toHaveLength(2);
  });
});

describe('Penurunan Sub Menu', () => {
  it('Keuangan 27 key → 4 tab (retention. bersarang gugur ke finance.)', async () => {
    const tabs = deriveTabs(await codesOf('finance'));
    expect(tabs.map((tab) => [tab.prefix, tab.codes.length])).toEqual([
      ['finance.benefit.', 6],
      ['finance.loan.', 14],
      ['finance.cash_advance.', 4],
      ['finance.', 3],
    ]);
    expect(tabs[3].codes).toContain('finance.retention.years');
  });

  it('Waktu 7 tab; Penggajian/Organisasi/Karyawan nol tab', async () => {
    expect(deriveTabs(await codesOf('time'))).toHaveLength(7);
    expect(deriveTabs(await codesOf('payroll'))).toEqual([]);
    expect(deriveTabs(await codesOf('organization'))).toEqual([]);
    expect(deriveTabs(await codesOf('employee'))).toEqual([]);
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
    const error = await writeError(
      settingsService.write(HR_MANAGER, [
        { setupCode: 'settings.identity_retention_days', setupValue: [365] },
        { setupCode: 'attendance.late_tolerance_minutes', setupValue: [90] },
      ]),
    );
    expect(error).toBeInstanceOf(SettingsWriteError);
    expect(error.status).toBe(403);
    expect(error.code).toBe('SETUP_CODE_LOCKED');
    expect(error.errors.map((row) => row.code)).toEqual(['SETUP_CODE_LOCKED', 'SETUP_VALUE_NOT_OFFERED']);
    const rows = await settingsService.read(HR_MANAGER);
    expect(rows.find((row) => row.setupCode === 'attendance.late_tolerance_minutes')?.setupValue).toEqual([0]);
  });

  it('DAFTAR wajib anggota pilihan; kode tak dikenal 422; peran R‡ tidak bisa menulis', async () => {
    await expect(
      settingsService.write(HR_MANAGER, [{ setupCode: 'REPRIMAND_RULE', setupValue: ['MAYBE'] }]),
    ).rejects.toMatchObject({ code: 'SETUP_VALUE_NOT_OFFERED' });
    await expect(
      settingsService.write(HR_MANAGER, [{ setupCode: 'attendance.unknown_key', setupValue: [1] }]),
    ).rejects.toMatchObject({ code: 'SETUP_CODE_UNKNOWN', status: 422 });
    await expect(
      settingsService.write(HR_MANAGER, [{ setupCode: 'unknownmodule.key', setupValue: [1] }]),
    ).rejects.toMatchObject({ code: 'SETUP_PREFIX_UNREGISTERED', status: 422 });
    await expect(
      settingsService.write(PAYROLL_OFFICER, [{ setupCode: 'payroll.closing_day_of_month', setupValue: [20] }]),
    ).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 });
  });

  it('deretan majemuk tersimpan utuh; [] lolos hampa; kewajiban bersyarat diterima (GAJ-3/GAJ-5)', async () => {
    const [tenor] = await settingsService.write(HR_MANAGER, [
      { setupCode: 'finance.loan.tenor_custom_list', setupValue: [6, 12, 24] },
    ]);
    expect(tenor).toMatchObject({ setupValue: [6, 12, 24], changed: true });
    const [closing, mode] = await settingsService.write(HR_MANAGER, [
      { setupCode: 'payroll.closing_day_of_month', setupValue: [] },
      { setupCode: 'payroll.suspension_pay_mode', setupValue: ['PARTIAL'] },
    ]);
    expect(closing.changed && mode.changed).toBe(true);
  });

  it('gerbang R/O/D: confirm_transition hanya untuk CC/SBU, DISABLED wajib konfirmasi, REQUIRED hari ini 500', async () => {
    await expect(
      settingsService.write(HR_MANAGER, [
        { setupCode: 'BRANCH_HIERARCHY_MODE', setupValue: ['ENABLED'], confirmTransition: true },
      ]),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 422 });
    await expect(
      settingsService.write(HR_MANAGER, [{ setupCode: 'COST_CENTER_ASSIGNMENT_MODE', setupValue: ['DISABLED'] }]),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    const [disabled] = await settingsService.write(HR_MANAGER, [
      { setupCode: 'COST_CENTER_ASSIGNMENT_MODE', setupValue: ['DISABLED'], confirmTransition: true },
    ]);
    expect(disabled).toMatchObject({ changed: true, versionNumber: 4 });
    await expect(
      settingsService.write(HR_MANAGER, [{ setupCode: 'SBU_ASSIGNMENT_MODE', setupValue: ['REQUIRED'] }]),
    ).rejects.toMatchObject({ code: 'INTERNAL_ERROR', status: 500 });
  });

  it('proyeksi setelah VIEW gap digelar: CC gap 37 ditolak, SBU gap 0 lolos', async () => {
    ASSIGNMENT_GAP.viewProvisioned = true;
    const error = await writeError(
      settingsService.write(HR_MANAGER, [{ setupCode: 'COST_CENTER_ASSIGNMENT_MODE', setupValue: ['REQUIRED'] }]),
    );
    expect(error.code).toBe('ASSIGNMENT_GAP_BLOCKS_REQUIRED');
    expect(error.errors[0].message).toContain('37 karyawan aktif');
    const [sbu] = await settingsService.write(HR_MANAGER, [
      { setupCode: 'SBU_ASSIGNMENT_MODE', setupValue: ['REQUIRED'] },
    ]);
    expect(sbu.changed).toBe(true);
  });

  it('REPRIMAND_RULE yang diubah langsung terbaca layar Reprimand (satu sumber)', async () => {
    expect(await settingsService.reprimandRule()).toBe('NON-ACTIVE');
    await settingsService.write(HR_MANAGER, [{ setupCode: 'REPRIMAND_RULE', setupValue: ['ACTIVE'] }]);
    expect(await settingsService.reprimandRule()).toBe('ACTIVE');
  });
});

describe('A3 — Riwayat Perubahan', () => {
  it('riwayat awal konsisten dengan nilai berjalan', () => {
    Object.entries(VERSION_HISTORY).forEach(([code, history]) => {
      const seed = SETTING_SEED.find((row) => row.setupCode === code);
      if (seed) expect(history.at(-1)?.value).toEqual(seed.setupValue);
    });
  });

  it('peran ber-R‡ tetap 403 di gerbang', async () => {
    await expect(settingsService.searchVersions(PAYROLL_OFFICER, {})).rejects.toMatchObject({ status: 403 });
    await expect(settingsService.searchVersions(HR_STAFF, {})).rejects.toMatchObject({ status: 403 });
  });

  it('RIW-3: Penggajian · Juli 2026 · buang baris mesin ⇒ 1 baris', async () => {
    const page = await settingsService.searchVersions(HR_MANAGER, {
      setupCodePrefixes: historyPrefixes(['payroll']),
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      isSystemActor: false,
    });
    expect(page.totalData).toBe(1);
    expect(page.data[0]).toMatchObject({
      setupCode: 'payroll.closing_day_of_month',
      versionNumber: 2,
      previousSetupValue: [25],
      setupValue: [21],
      createdBy: { nama: 'Rina Amelia', nik: '20210715' },
    });
  });

  it('RIW-4/RIW-5: baris ANONIM tetap tampil saat mesin dibuang; baris TERKUNCI tampil berlencana', async () => {
    const human = await settingsService.searchVersions(HR_MANAGER, { isSystemActor: false, size: 100 });
    expect(human.data.some((row) => row.isAnonymizedActor)).toBe(true);
    expect(human.data.every((row) => !row.isSystemActor)).toBe(true);
    const locked = await settingsService.searchVersions(HR_MANAGER, { setupCode: 'settings.identity_retention_days' });
    expect(locked.data.map((row) => row.versionNumber)).toEqual([2, 1]);
    expect(locked.data.every((row) => row.isLocked)).toBe(true);
    expect(locked.data[1].previousSetupValue).toBeNull();
  });

  it('kesembilan modul dicentang ⇒ penyaring tidak dikirim; subset sah ≤ 16 anggota', () => {
    expect(historyPrefixes(HISTORY_MODULES)).toBeUndefined();
    expect(historyPrefixes([])).toBeUndefined();
    const allButPlatform = historyPrefixes(HISTORY_MODULES.filter((module) => module !== 'platform'))!;
    expect(allButPlatform).toHaveLength(16);
  });

  it('perubahan baru muncul paling atas dengan pelakunya', async () => {
    await settingsService.write(HR_MANAGER, [{ setupCode: 'productivity.entry_window_days', setupValue: [10] }]);
    const page = await settingsService.searchVersions(HR_MANAGER, { size: 1 });
    expect(page.data[0]).toMatchObject({
      setupCode: 'productivity.entry_window_days',
      previousSetupValue: [7],
      setupValue: [10],
      createdBy: { nama: 'Hesti Wulandari' },
    });
    const byHesti = await settingsService.searchVersions(HR_MANAGER, { createdByEmployeeId: 'emp-hesti', size: 100 });
    expect(byHesti.data.every((row) => row.createdBy.nama === 'Hesti Wulandari')).toBe(true);
  });
});

describe('A5/A6/A7 — Permintaan Penghapusan Data', () => {
  const SARI = 'c8a1f2b3-0009-4a10-9c00-000000000009';
  const BAMBANG = 'c8a1f2b3-0011-4a10-9c00-000000000011';

  it('daftar berisi ringkasan angka; subjek tersamarkan terbaca ANONYMIZED', async () => {
    const page = await erasureService.search(HR_MANAGER, {});
    expect(page.totalData).toBe(3);
    const sari = page.data.find((row) => row.employeeId === SARI)!;
    expect(sari).toMatchObject({ requestStatus: 'IN_PROGRESS', totalService: 14, completedService: 7, heldService: 1 });
    expect(page.data.some((row) => row.nama === 'ANONYMIZED')).toBe(true);
    const done = await erasureService.search(HR_MANAGER, { requestStatus: 'COMPLETED' });
    expect(done.data.every((row) => row.completedAt)).toBe(true);
  });

  it('catat permintaan: 14 pelacak PENDING, nol siaran; subjek terbuka → 409; tuntas boleh lagi', async () => {
    await expect(
      erasureService.create(HR_MANAGER, {
        employeeId: SARI,
        requestedAt: '2026-09-01',
        requestedAtTimezone: 'Asia/Jakarta',
      }),
    ).rejects.toMatchObject({ status: 409, code: 'ERASURE_REQUEST_ALREADY_OPEN' });
    const created = await erasureService.create(HR_MANAGER, {
      employeeId: BAMBANG,
      requestedAt: '2026-09-01',
      requestedAtTimezone: 'Asia/Jakarta',
    });
    expect(created.requestStatus).toBe('REQUESTED');
    expect(created.progress).toHaveLength(14);
    expect(created.progress.every((row) => row.progressStatus === 'PENDING' && row.broadcastCount === 0)).toBe(true);
    expect(created.createdBy).toEqual({ nama: 'Hesti Wulandari', nik: '20220301' });
  });

  it('tanggal surat masa depan 422; peran lain 403; id tak dikenal 404', async () => {
    await expect(
      erasureService.create(HR_MANAGER, {
        employeeId: BAMBANG,
        requestedAt: '2999-01-01',
        requestedAtTimezone: 'Asia/Jakarta',
      }),
    ).rejects.toMatchObject({ status: 422 });
    await expect(erasureService.search(HR_STAFF, {})).rejects.toMatchObject({ status: 403 });
    await expect(erasureService.detail(HR_MANAGER, 'missing')).rejects.toMatchObject({ status: 404 });
  });
});
