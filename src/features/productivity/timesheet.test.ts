import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetProjectMocks } from '@/features/productivity/services/project.service';
import { resetTimesheetMocks, timesheetService } from '@/features/productivity/services/timesheet.service';
import { prodClock } from '@/features/productivity/services/clock';
import { PROD_ACTORS } from '@/features/productivity/mock-data';
import { resetSettingsMocks } from '@/features/settings/services/settings.service';

const actor = (id: string) => PROD_ACTORS.find((row) => row.employeeId === id)!;
const DEDI = actor('emp-dedi');
const RINA = actor('emp-rina-amelia');
const HESTI = actor('emp-hesti');
const FAJAR = actor('emp-fajar');
const TSK_1 = 'e2000000-0000-7000-8000-000000000001';
const TSK_3 = 'e2000000-0000-7000-8000-000000000003';
const WLG_7 = 'c1000000-0000-7000-8000-000000000007';
const WLG_2 = 'c1000000-0000-7000-8000-000000000002';
const CAT_DOK = 'f3000000-0000-7000-8000-000000000004';
const CAT_DEV = 'f3000000-0000-7000-8000-000000000001';
const PWG_1 = 'pwg10000-0000-7000-8000-000000000001';

beforeEach(() => {
  prodClock.set('2026-09-30T10:00:00+07:00');
  resetSettingsMocks();
  resetProjectMocks();
  resetTimesheetMocks();
});
afterAll(() => prodClock.set(null));

describe('Time Tracker', () => {
  it('penghitung baru menghentikan penghitung lama otomatis dan memberitahukannya', async () => {
    const first = await timesheetService.startTimer(DEDI, TSK_1, '');
    expect(first.autoStoppedPreviousTimer).toBeNull();
    prodClock.set('2026-09-30T10:45:00+07:00');
    const second = await timesheetService.startTimer(DEDI, TSK_3, '');
    expect(second.autoStoppedPreviousTimer).toMatchObject({ code: first.worklog.code, durationMinutes: 45 });
    prodClock.set('2026-09-30T11:07:30+07:00');
    const stopped = await timesheetService.stopTimer(DEDI);
    expect(stopped).toMatchObject({ origin: 'DIUKUR_MESIN', durationMinutes: 22 });
  });

  it('catat manual: jam kosong permanen; jendela 7 hari; batas 1440 menit per hari lintas-origin', async () => {
    const row = await timesheetService.createManual(DEDI, {
      taskId: TSK_3,
      activityTypeId: '',
      workDate: '2026-09-28',
      durationMinutes: 60,
      notes: '',
    });
    expect(row).toMatchObject({
      origin: 'DIKETIK_MANUSIA',
      startedAt: null,
      stoppedAt: null,
      paidWorkGroupIdSnapshot: null,
    });
    await expect(
      timesheetService.createManual(DEDI, {
        taskId: TSK_3,
        activityTypeId: '',
        workDate: '2026-09-10',
        durationMinutes: 30,
        notes: '',
      }),
    ).rejects.toMatchObject({ status: 422, code: 'PROD_ENTRY_WINDOW_CLOSED' });
    // 29 Sep sudah 600 menit (WLG-0007) ⇒ 900 lagi melewati 1440.
    await expect(
      timesheetService.createManual(DEDI, {
        taskId: TSK_1,
        activityTypeId: '',
        workDate: '2026-09-29',
        durationMinutes: 900,
        notes: '',
      }),
    ).rejects.toMatchObject({ status: 422, code: 'PROD_DAILY_DURATION_EXCEEDED' });
  });

  it('snapshot berbayar dibekukan dari pemetaan kategori saat pencatatan', async () => {
    const row = await timesheetService.createManual(DEDI, {
      taskId: TSK_1,
      activityTypeId: '',
      workDate: '2026-09-30',
      durationMinutes: 30,
      notes: '',
    });
    expect(row.paidWorkGroupIdSnapshot).toBe(PWG_1);
  });
});

describe('Activities', () => {
  it('pemilik mengoreksi baris DIHENTIKAN_SISTEM → DIKOREKSI_PEMILIK, origin tetap, riwayat tercatat', async () => {
    const row = await timesheetService.update(DEDI, WLG_7, { durationMinutes: 300 });
    expect(row).toMatchObject({
      origin: 'DIHENTIKAN_SISTEM',
      correctionMode: 'DIKOREKSI_PEMILIK',
      isCorrected: true,
      durationMinutes: 300,
    });
    const { changes } = await timesheetService.changes(DEDI, WLG_7);
    expect(changes[0]).toMatchObject({ changedField: 'duration_minutes', oldValue: '600', newValue: '300' });
  });

  it('hanya pemilik yang menyunting — atasan & HR ditolak; periode disahkan beku', async () => {
    await expect(timesheetService.update(RINA, WLG_7, { durationMinutes: 10 })).rejects.toMatchObject({ status: 403 });
    await expect(timesheetService.update(HESTI, WLG_7, { durationMinutes: 10 })).rejects.toMatchObject({ status: 403 });
    await expect(timesheetService.update(DEDI, WLG_2, { durationMinutes: 10 })).rejects.toMatchObject({
      status: 422,
      code: 'PROD_PERIOD_ALREADY_APPROVED',
    });
  });

  it('atasan menerima apa adanya (durasi tetap); SoD menolak pemilik; sudah dikoreksi ditolak', async () => {
    await expect(timesheetService.acceptSystemStop(DEDI, WLG_7)).rejects.toMatchObject({
      status: 403,
      code: 'PROD_SELF_ACCEPTANCE_FORBIDDEN',
    });
    await expect(timesheetService.acceptSystemStop(FAJAR, WLG_7)).rejects.toMatchObject({
      code: 'PROD_NOT_IN_SUPERVISION_CHAIN',
    });
    await timesheetService.acceptSystemStop(RINA, WLG_7);
    const [row] = await timesheetService.search(RINA, {
      employeeId: 'emp-dedi',
      workDateStart: '2026-09-29',
      workDateEnd: '2026-09-29',
    });
    expect(row).toMatchObject({ correctionMode: 'DITERIMA_ATASAN', durationMinutes: 600 });
    await expect(timesheetService.update(DEDI, WLG_7, { durationMinutes: 300 })).resolves.toMatchObject({
      correctionMode: 'DITERIMA_ATASAN',
    });
  });

  it('rezim baca: di luar rantai atasan 403 (bukan hasil kosong); grant membuka jendela pemilik', async () => {
    await expect(timesheetService.search(FAJAR, { employeeId: 'emp-dedi' })).rejects.toMatchObject({ status: 403 });
    await timesheetService.grantWindow(RINA, {
      targetEmployeeId: 'emp-dedi',
      windowStartDate: '2026-09-10',
      windowEndDate: '2026-09-11',
      grantReason: 'Cuti mendadak, lupa isi worklog',
    });
    await expect(
      timesheetService.createManual(DEDI, {
        taskId: TSK_3,
        activityTypeId: '',
        workDate: '2026-09-10',
        durationMinutes: 30,
        notes: '',
      }),
    ).resolves.toMatchObject({ workDate: '2026-09-10' });
    await expect(
      timesheetService.grantWindow(RINA, {
        targetEmployeeId: 'emp-dedi',
        windowStartDate: '2026-07-01',
        windowEndDate: '2026-07-02',
        grantReason: 'x',
      }),
    ).rejects.toMatchObject({ code: 'PROD_PERIOD_ALREADY_APPROVED' });
  });
});

describe('Summary', () => {
  it('rekap Juli 2026 sesuai dataset: 780 menit, komposisi asal, terkunci payroll', async () => {
    const periods = await timesheetService.periods(DEDI, 'emp-dedi');
    const july = periods.find((row) => row.periodStart === '2026-07-01')!;
    expect(july).toMatchObject({ state: 'DISAHKAN', totalMinutes: 780, pendingSystemStopCount: 0 });
    expect(july.originComposition).toEqual({ DIUKUR_MESIN: 240, DIKETIK_MANUSIA: 60, DIHENTIKAN_SISTEM: 480 });
    await expect(timesheetService.reopenPeriod(HESTI, july.id, 'cek ulang')).rejects.toMatchObject({
      status: 403,
      code: 'PROD_PAYROLL_LOCKED',
    });
  });

  it('pengajuan digerbangi baris menggantung; lolos setelah diselesaikan; reopen atasan langsung beralasan', async () => {
    const sept = (await timesheetService.periods(DEDI, 'emp-dedi')).find((row) => row.periodStart === '2026-09-01')!;
    expect(sept.pendingSystemStopCount).toBe(1);
    await expect(timesheetService.submitPeriod(DEDI, sept.id)).rejects.toMatchObject({
      code: 'PROD_PENDING_SYSTEM_STOP',
    });
    await timesheetService.acceptSystemStop(RINA, WLG_7);
    await expect(timesheetService.submitPeriod(DEDI, sept.id)).resolves.toMatchObject({ state: 'MENUNGGU_PENGESAHAN' });
    await expect(timesheetService.submitPeriod(DEDI, sept.id)).rejects.toMatchObject({ status: 409 });

    const aug = (await timesheetService.periods(DEDI, 'emp-dedi')).find((row) => row.periodStart === '2026-08-01')!;
    await expect(timesheetService.reopenPeriod(FAJAR, aug.id, 'x')).rejects.toMatchObject({
      code: 'PROD_REOPEN_NOT_AUTHORIZED',
    });
    await expect(timesheetService.reopenPeriod(RINA, aug.id, ' ')).rejects.toMatchObject({ status: 422 });
    await expect(timesheetService.reopenPeriod(RINA, aug.id, 'Jam 5 Agustus keliru')).resolves.toMatchObject({
      state: 'DIKEMBALIKAN',
      reopenReason: 'Jam 5 Agustus keliru',
    });
  });

  it('Tracker Report hanya atasan/HR', async () => {
    await expect(timesheetService.trackerReport(DEDI, {})).rejects.toMatchObject({ status: 403 });
    const rows = await timesheetService.trackerReport(RINA, {});
    expect(rows.every((row) => row.employeeId !== 'emp-rina-amelia')).toBe(true);
    expect(rows.length).toBe(8);
  });
});

describe('Group for Payroll', () => {
  it('satu kategori satu pemetaan aktif; nonaktifkan lalu petakan ulang', async () => {
    await expect(timesheetService.createMapping(HESTI, CAT_DEV, PWG_1)).rejects.toMatchObject({
      code: 'PROD_MAPPING_CATEGORY_ALREADY_ACTIVE',
    });
    const group = await timesheetService.saveGroup(HESTI, { groupName: 'Kelompok Berbayar — Lapangan' });
    expect(group.code).toBe('PWG-0004');
    await timesheetService.createMapping(HESTI, CAT_DOK, group.id);
    const active = await timesheetService.mappings(true);
    expect(active.find((row) => row.taskCategoryId === CAT_DOK)?.paidWorkGroupName).toBe(
      'Kelompok Berbayar — Lapangan',
    );
    await expect(timesheetService.createMapping(DEDI, CAT_DOK, group.id)).rejects.toMatchObject({ status: 403 });
  });

  it('nama kelompok unik; menonaktifkan kelompok tidak men-cascade pemetaan', async () => {
    await expect(timesheetService.saveGroup(HESTI, { groupName: 'kelompok berbayar — teknis' })).rejects.toMatchObject({
      code: 'PROD_PAID_WORK_GROUP_NAME_DUPLICATE',
    });
    await timesheetService.saveGroup(HESTI, { groupName: 'Kelompok Berbayar — Teknis', isActive: false }, PWG_1);
    const active = await timesheetService.mappings(true);
    expect(active.filter((row) => row.paidWorkGroupId === PWG_1)).toHaveLength(2);
  });
});
