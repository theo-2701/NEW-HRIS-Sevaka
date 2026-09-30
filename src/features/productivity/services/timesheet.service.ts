import { api, ApiError } from '@/services/api';
import { MOCK } from '@/services/mock';
import { settingsService } from '@/features/settings/services/settings.service';
import { projectService } from '@/features/productivity/services/project.service';
import { isoDate, prodClock } from '@/features/productivity/services/clock';
import { camelize, snakeize } from '@/features/productivity/services/wire';
import type { WirePage } from '@/features/productivity/services/wire';
import {
  ACCEPTANCE_SEED,
  ACTIVITY_TYPE_SEED,
  MAPPING_SEED,
  PAID_GROUP_SEED,
  PERIOD_SEED,
  WORKLOG_CHANGE_SEED,
  WORKLOG_SEED,
} from '@/features/productivity/timesheet-data';
import { employeeOf, isHr, isSupervisorOf, nameOf, withinWindow } from '@/features/productivity/rules';
import type {
  ActivityType,
  CategoryMapping,
  ManualWorklogDraft,
  PaidWorkGroup,
  ProdActor,
  SystemStopAcceptance,
  TimerStartResult,
  TimesheetPeriod,
  Worklog,
  WorklogChange,
  WorklogOrigin,
  WorklogPatch,
  WorklogSearch,
  WindowGrant,
} from '@/features/productivity/types';

/**
 * API service Timesheet + Group for Payroll — UIC-001-PRODUCTIVITY-0.4 §3 (`TS-01`–`TS-15`) & §4 (`36`–`42`).
 *
 * Satu tabel `emp_worklog` untuk dua jalur pencatatan (mesin/manual) + nilai ketiga `DIHENTIKAN_SISTEM` dari sapuan.
 * Seluruh angka = menit apa adanya; nol nominal uang.
 */
const delay = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));
const DAILY_LIMIT = 1440;
/** Ambang penanda "mendekati batas harian" — asumsi tampilan (90% dari 1440), tidak disebut dokumen. */
const NEAR_LIMIT = 1296;

type StoredWorklog = Worklog & { deletedAt: string | null };
type StoredPeriod = (typeof PERIOD_SEED)[number];
type StoredMapping = (typeof MAPPING_SEED)[number];

let worklogs: StoredWorklog[] = [];
let worklogChanges: WorklogChange[] = [];
let acceptances: SystemStopAcceptance[] = [];
let grants: WindowGrant[] = [];
let periods: StoredPeriod[] = [];
let groups: PaidWorkGroup[] = [];
let mappings: StoredMapping[] = [];
let activityTypes: ActivityType[] = [];
let seq = { worklog: 8, change: 1, acceptance: 1, grant: 0, period: 4, group: 3, mapping: 3 };

export function resetTimesheetMocks() {
  worklogs = WORKLOG_SEED.map((row) => ({ ...row, deletedAt: null }));
  worklogChanges = WORKLOG_CHANGE_SEED.map((row) => ({ ...row, createdBy: { ...row.createdBy } }));
  acceptances = ACCEPTANCE_SEED.map((row) => ({ ...row, createdBy: { ...row.createdBy } }));
  grants = [];
  periods = PERIOD_SEED.map((row) => ({ ...row }));
  groups = PAID_GROUP_SEED.map((row) => ({ ...row }));
  mappings = MAPPING_SEED.map((row) => ({ ...row }));
  activityTypes = ACTIVITY_TYPE_SEED.map((row) => ({ ...row }));
  seq = { worklog: 8, change: 1, acceptance: 1, grant: 0, period: 4, group: 3, mapping: 3 };
}
resetTimesheetMocks();

const fail = (status: number, code: string, message: string): never => {
  throw new ApiError(message, status, code);
};
const pad = (n: number) => String(n).padStart(4, '0');
const uuid = (prefix: string, n: number) => `${prefix}-0000-7000-8000-${String(n).padStart(12, '0')}`;
const nowIso = () => prodClock.now().toISOString();
const today = () => isoDate(prodClock.now());
const windowDays = () => settingsService.numberValue('productivity.entry_window_days', 7);
const me = (actor: ProdActor) => ({ employeeId: actor.employeeId, name: nameOf(actor.employeeId) });
const plain = (row: StoredWorklog): Worklog => {
  const { deletedAt: _deleted, ...rest } = row;
  void _deleted;
  return rest;
};
const live = () => worklogs.filter((row) => !row.deletedAt);

/** Rezim baca worklog: self · atasan berjenjang · HR — BUKAN anggota Project (beda dari task). */
const canRead = (actor: ProdActor, employeeId: string) =>
  employeeId === actor.employeeId || isSupervisorOf(actor.employeeId, employeeId) || isHr(actor.role);

const monthBounds = (date: string) => {
  const [y, m] = date.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${date.slice(0, 7)}-01`, end: `${date.slice(0, 7)}-${String(last).padStart(2, '0')}` };
};

const periodOf = (employeeId: string, date: string) =>
  periods.find((row) => row.employeeId === employeeId && row.periodStart <= date && row.periodEnd >= date);

/** Pemetaan aktif kategori task → kelompok berbayar; nol pemetaan = null (fail-closed, PD-95). */
function paidSnapshot(taskId: string) {
  const categoryId = projectService.taskRef(taskId)?.taskCategoryId;
  return mappings.find((row) => row.taskCategoryId === categoryId && row.isActive)?.paidWorkGroupId ?? null;
}

const hasGrant = (employeeId: string, date: string) =>
  grants.some((row) => row.targetEmployeeId === employeeId && row.windowStartDate <= date && row.windowEndDate >= date);

/** Gerbang tulis worklog: periode beku, jendela mundur (kecuali grant), batas harian lintas-origin. */
function guardWrite(employeeId: string, workDate: string, minutes: number, ignoreId?: string) {
  const period = periodOf(employeeId, workDate);
  if (period?.state === 'DISAHKAN')
    fail(
      422,
      'PROD_PERIOD_ALREADY_APPROVED',
      `Rekap ${period.periodStart.slice(0, 7)} sudah disahkan — catatan waktunya beku permanen.`,
    );
  if (period?.state === 'MENUNGGU_PENGESAHAN')
    fail(
      422,
      'PROD_ENTRY_WINDOW_CLOSED',
      `Rekap ${period.periodStart.slice(0, 7)} sedang menunggu pengesahan — catatan waktunya beku.`,
    );
  if (!withinWindow(workDate, windowDays(), prodClock.now()) && !hasGrant(employeeId, workDate))
    fail(
      422,
      'PROD_ENTRY_WINDOW_CLOSED',
      `Tanggal ${workDate} di luar jendela ${windowDays()} hari. Minta atasan atau HR membuka jendela untuk tanggal itu.`,
    );
  const sameDay = live()
    .filter((row) => row.employeeId === employeeId && row.workDate === workDate && row.id !== ignoreId)
    .reduce((sum, row) => sum + (row.durationMinutes ?? 0), 0);
  if (sameDay + minutes > DAILY_LIMIT)
    fail(
      422,
      'PROD_DAILY_DURATION_EXCEEDED',
      `Total ${workDate} menjadi ${sameDay + minutes} menit — melewati batas ${DAILY_LIMIT} menit per hari.`,
    );
}

function logWorklog(
  actor: ProdActor,
  id: string,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  activity: 'U' | 'D',
) {
  seq.change += 1;
  worklogChanges.push({
    id: `wc-${pad(seq.change)}`,
    worklogId: id,
    changedField: field,
    oldValue: oldValue === null || oldValue === undefined ? null : String(oldValue),
    newValue: newValue === null || newValue === undefined ? null : String(newValue),
    activity,
    createdBy: me(actor),
    createdAt: nowIso(),
  });
}

function buildPeriod(row: StoredPeriod): TimesheetPeriod {
  const rows = live().filter(
    (item) => item.employeeId === row.employeeId && item.workDate >= row.periodStart && item.workDate <= row.periodEnd,
  );
  const minutes = (item: StoredWorklog) => item.durationMinutes ?? 0;
  const byTask = new Map<string, number>();
  const byDay = new Map<string, number>();
  rows.forEach((item) => {
    byTask.set(item.taskId, (byTask.get(item.taskId) ?? 0) + minutes(item));
    byDay.set(item.workDate, (byDay.get(item.workDate) ?? 0) + minutes(item));
  });
  const composition: Record<WorklogOrigin, number> = { DIUKUR_MESIN: 0, DIKETIK_MANUSIA: 0, DIHENTIKAN_SISTEM: 0 };
  rows.forEach((item) => {
    composition[item.origin] += minutes(item);
  });
  return {
    ...row,
    totalMinutes: rows.reduce((sum, item) => sum + minutes(item), 0),
    breakdownByTask: [...byTask.entries()].map(([taskId, totalMinutes]) => ({
      taskId,
      taskName: projectService.taskRef(taskId)?.taskTitle ?? taskId,
      totalMinutes,
    })),
    cancelledTaskMinutes: rows
      .filter((item) => projectService.taskRef(item.taskId)?.status === 'DIBATALKAN')
      .reduce((sum, item) => sum + minutes(item), 0),
    originComposition: composition,
    pendingSystemStopCount: rows.filter((item) => item.origin === 'DIHENTIKAN_SISTEM' && !item.correctionMode).length,
    nearDailyLimitFlags: [...byDay.entries()].filter(([, total]) => total >= NEAR_LIMIT).map(([day]) => day),
  };
}

function ensurePeriod(employeeId: string, date: string) {
  const existing = periodOf(employeeId, date);
  if (existing) return existing;
  const { start, end } = monthBounds(date);
  seq.period += 1;
  const row: StoredPeriod = {
    id: uuid('d2000000', seq.period),
    employeeId,
    periodStart: start,
    periodEnd: end,
    state: 'BELUM_DIAJUKAN',
    submittedAt: null,
    approvedAt: null,
    payrollConfirmedAt: null,
    reopenReason: null,
  };
  periods.push(row);
  return row;
}

export const timesheetService = {
  /* ── Master jenis kegiatan (`TS-01`) ─────────────────────────────────────── */
  async activityTypes(): Promise<ActivityType[]> {
    if (MOCK) {
      await delay(100);
      return activityTypes.map((row) => ({ ...row }));
    }
    const { data } = await api.get('/activity-types');
    return camelize<WirePage<ActivityType>>(data).data;
  },

  /* ── Time Tracker (`TS-02`–`TS-05`) ──────────────────────────────────────── */

  /** `TS-04` — nol penghitung = null, bukan 404. */
  async runningTimer(actor: ProdActor): Promise<Worklog | null> {
    if (MOCK) {
      await delay(120);
      const row = live().find(
        (item) => item.employeeId === actor.employeeId && item.origin === 'DIUKUR_MESIN' && !item.stoppedAt,
      );
      return row ? plain(row) : null;
    }
    const { data } = await api.get('/worklogs/timer/running');
    return camelize<{ data: Worklog | null }>(data).data;
  },

  /** `TS-02` — penghitung lain yang masih berjalan dihentikan otomatis & DIBERITAHUKAN (PD-26). */
  async startTimer(actor: ProdActor, taskId: string, activityTypeId: string): Promise<TimerStartResult> {
    if (MOCK) {
      await delay(250);
      const task = projectService.taskRef(taskId);
      if (!task || task.status === 'DIBATALKAN' || task.assigneeEmployeeId !== actor.employeeId)
        fail(422, 'PROD_TASK_NOT_ELIGIBLE', 'Task tidak ditemukan, dibatalkan, atau bukan milik Anda.');
      const now = prodClock.now();
      let autoStopped: TimerStartResult['autoStoppedPreviousTimer'] = null;
      const running = live().find(
        (item) => item.employeeId === actor.employeeId && item.origin === 'DIUKUR_MESIN' && !item.stoppedAt,
      );
      if (running) {
        running.stoppedAt = now.toISOString();
        running.durationMinutes = Math.max(
          0,
          Math.floor((now.getTime() - new Date(running.startedAt!).getTime()) / 60000),
        );
        autoStopped = { id: running.id, code: running.code, durationMinutes: running.durationMinutes };
      }
      seq.worklog += 1;
      const row: StoredWorklog = {
        id: uuid('c1000000', seq.worklog),
        code: `WLG-${pad(seq.worklog)}`,
        employeeId: actor.employeeId,
        taskId,
        activityTypeId: activityTypeId || null,
        origin: 'DIUKUR_MESIN',
        startedAt: now.toISOString(),
        stoppedAt: null,
        workDate: isoDate(now),
        durationMinutes: null,
        notes: null,
        isCorrected: false,
        correctionMode: null,
        paidWorkGroupIdSnapshot: paidSnapshot(taskId),
        createdAt: now.toISOString(),
        deletedAt: null,
      };
      worklogs.push(row);
      ensurePeriod(actor.employeeId, row.workDate);
      return { worklog: plain(row), autoStoppedPreviousTimer: autoStopped };
    }
    const { data } = await api.post(
      '/worklogs/timer/start',
      snakeize({ taskId, activityTypeId: activityTypeId || undefined }),
    );
    const result = camelize<Worklog & { autoStoppedPreviousTimer: TimerStartResult['autoStoppedPreviousTimer'] }>(data);
    return { worklog: result, autoStoppedPreviousTimer: result.autoStoppedPreviousTimer };
  },

  /** `TS-03` — menit apa adanya, nol pembulatan (PD-25). */
  async stopTimer(actor: ProdActor): Promise<Worklog> {
    if (MOCK) {
      await delay(250);
      const running =
        live().find(
          (item) => item.employeeId === actor.employeeId && item.origin === 'DIUKUR_MESIN' && !item.stoppedAt,
        ) ?? fail(404, 'NOT_FOUND', 'Tidak ada penghitung yang sedang berjalan.');
      const now = prodClock.now();
      running.stoppedAt = now.toISOString();
      running.durationMinutes = Math.max(
        0,
        Math.floor((now.getTime() - new Date(running.startedAt!).getTime()) / 60000),
      );
      return plain(running);
    }
    const { data } = await api.post('/worklogs/timer/stop');
    return camelize<Worklog>(data);
  },

  /** `TS-05` — jam mulai/selesai WAJIB null; gerbang jendela & batas 1440 menit per hari lintas-origin. */
  async createManual(actor: ProdActor, draft: ManualWorklogDraft): Promise<Worklog> {
    if (MOCK) {
      await delay(280);
      if (!draft.taskId) fail(422, 'VALIDATION_ERROR', 'Task wajib dipilih.');
      if (!draft.workDate) fail(422, 'VALIDATION_ERROR', 'Tanggal wajib diisi.');
      if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 0)
        fail(422, 'VALIDATION_ERROR', 'Durasi harus bilangan menit ≥ 0.');
      const task = projectService.taskRef(draft.taskId);
      if (!task || task.assigneeEmployeeId !== actor.employeeId)
        fail(422, 'PROD_TASK_NOT_ELIGIBLE', 'Task tidak ditemukan atau bukan milik Anda.');
      guardWrite(actor.employeeId, draft.workDate, draft.durationMinutes);
      seq.worklog += 1;
      const row: StoredWorklog = {
        id: uuid('c1000000', seq.worklog),
        code: `WLG-${pad(seq.worklog)}`,
        employeeId: actor.employeeId,
        taskId: draft.taskId,
        activityTypeId: draft.activityTypeId || null,
        origin: 'DIKETIK_MANUSIA',
        startedAt: null,
        stoppedAt: null,
        workDate: draft.workDate,
        durationMinutes: draft.durationMinutes,
        notes: draft.notes.trim() || null,
        isCorrected: false,
        correctionMode: null,
        paidWorkGroupIdSnapshot: paidSnapshot(draft.taskId),
        createdAt: nowIso(),
        deletedAt: null,
      };
      worklogs.push(row);
      ensurePeriod(actor.employeeId, row.workDate);
      return plain(row);
    }
    const { data } = await api.post(
      '/worklogs/manual',
      snakeize({ ...draft, activityTypeId: draft.activityTypeId || undefined, notes: draft.notes || undefined }),
    );
    return camelize<Worklog>(data);
  },

  /* ── Activities (`TS-06`–`TS-08`, `TS-11`, `TS-15`) ──────────────────────── */

  /** `TS-06` — `employee_id` kosong = self; di luar rezim baca = 403 fail-closed (bukan hasil kosong). */
  async search(actor: ProdActor, search: WorklogSearch): Promise<Worklog[]> {
    if (MOCK) {
      await delay();
      const target = search.employeeId || actor.employeeId;
      if (target !== 'ALL' && !canRead(actor, target))
        fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Karyawan ini di luar rantai atasan Anda.');
      return live()
        .filter((row) => (target === 'ALL' ? canRead(actor, row.employeeId) : row.employeeId === target))
        .filter((row) => !search.taskId || row.taskId === search.taskId)
        .filter((row) => !search.origin || row.origin === search.origin)
        .filter((row) => !search.activityTypeId || row.activityTypeId === search.activityTypeId)
        .filter((row) => !search.workDateStart || row.workDate >= search.workDateStart)
        .filter((row) => !search.workDateEnd || row.workDate <= search.workDateEnd)
        .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.createdAt.localeCompare(a.createdAt))
        .map(plain);
    }
    const { data } = await api.post('/worklogs/search', snakeize({ filters: search, sortBy: 'work_date' }));
    return camelize<WirePage<Worklog>>(data).data;
  },

  /** `TS-10` — atasan berjenjang · HR saja; baris detail, bukan agregat (PD-23). */
  async trackerReport(actor: ProdActor, search: WorklogSearch): Promise<Worklog[]> {
    if (MOCK) {
      await delay();
      const supervises = live().some((row) => isSupervisorOf(actor.employeeId, row.employeeId));
      if (!isHr(actor.role) && !supervises)
        fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Tracker Report hanya untuk atasan berjenjang dan HR.');
      if (search.employeeId && !isHr(actor.role) && !isSupervisorOf(actor.employeeId, search.employeeId))
        fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Karyawan ini di luar rantai atasan Anda.');
      return live()
        .filter((row) => row.employeeId !== actor.employeeId || isHr(actor.role))
        .filter((row) => isHr(actor.role) || isSupervisorOf(actor.employeeId, row.employeeId))
        .filter((row) => !search.employeeId || row.employeeId === search.employeeId)
        .filter((row) => !search.origin || row.origin === search.origin)
        .filter((row) => !search.activityTypeId || row.activityTypeId === search.activityTypeId)
        .filter((row) => !search.workDateStart || row.workDate >= search.workDateStart)
        .filter((row) => !search.workDateEnd || row.workDate <= search.workDateEnd)
        .sort((a, b) => b.workDate.localeCompare(a.workDate))
        .map(plain);
    }
    const { data } = await api.post('/worklogs/tracker-report/search', snakeize({ filters: search }));
    return camelize<WirePage<Worklog>>(data).data;
  },

  /**
   * `TS-07` PUT — pemilik SAJA (nol pengecualian atasan/HR, PD-29/PD-30). Mengoreksi baris DIHENTIKAN_SISTEM yang
   * belum diselesaikan menandainya DIKOREKSI_PEMILIK; origin tetap selamanya.
   */
  async update(actor: ProdActor, id: string, patch: WorklogPatch): Promise<Worklog> {
    if (MOCK) {
      await delay(260);
      const row = live().find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Catatan waktu tidak ditemukan.');
      if (row.employeeId !== actor.employeeId)
        fail(
          403,
          'PROD_NOT_OBJECT_OWNER',
          'Hanya pemilik catatan waktu yang dapat menyuntingnya — termasuk terhadap atasan dan HR.',
        );
      if (!row.stoppedAt && row.origin === 'DIUKUR_MESIN')
        fail(422, 'VALIDATION_ERROR', 'Hentikan penghitung sebelum menyunting.');
      if (
        patch.durationMinutes !== undefined &&
        (!Number.isInteger(patch.durationMinutes) || patch.durationMinutes < 0)
      )
        fail(422, 'VALIDATION_ERROR', 'Durasi harus bilangan menit ≥ 0.');
      guardWrite(row.employeeId, row.workDate, 0, row.id);
      const nextDate = patch.workDate ?? row.workDate;
      guardWrite(row.employeeId, nextDate, patch.durationMinutes ?? row.durationMinutes ?? 0, row.id);
      const fields: [keyof WorklogPatch, keyof Worklog, string][] = [
        ['durationMinutes', 'durationMinutes', 'duration_minutes'],
        ['activityTypeId', 'activityTypeId', 'activity_type_id'],
        ['taskId', 'taskId', 'task_id'],
        ['workDate', 'workDate', 'work_date'],
        ['notes', 'notes', 'notes'],
      ];
      fields.forEach(([key, column, wire]) => {
        if (patch[key] === undefined || patch[key] === row[column]) return;
        logWorklog(actor, row.id, wire, row[column], patch[key], 'U');
        (row as unknown as Record<string, unknown>)[column] = patch[key];
      });
      if (row.origin === 'DIHENTIKAN_SISTEM' && !row.correctionMode) {
        row.isCorrected = true;
        row.correctionMode = 'DIKOREKSI_PEMILIK';
      }
      return plain(row);
    }
    const { data } = await api.put(`/worklogs/${id}`, snakeize(patch));
    return camelize<Worklog>(data);
  },

  /** `TS-07` DELETE — syarat identik PUT; soft-delete, riwayat `activity='D'`. */
  async remove(actor: ProdActor, id: string): Promise<void> {
    if (MOCK) {
      await delay(220);
      const row = live().find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Catatan waktu tidak ditemukan.');
      if (row.employeeId !== actor.employeeId)
        fail(403, 'PROD_NOT_OBJECT_OWNER', 'Hanya pemilik catatan waktu yang dapat menghapusnya.');
      guardWrite(row.employeeId, row.workDate, 0, row.id);
      row.deletedAt = nowIso();
      logWorklog(actor, row.id, 'deleted_at', null, row.deletedAt, 'D');
      return;
    }
    await api.delete(`/worklogs/${id}`);
  },

  /** `TS-08` — riwayat per baris + jejak penerimaan atasan (tabel milik FT3). */
  async changes(
    actor: ProdActor,
    id: string,
  ): Promise<{ changes: WorklogChange[]; acceptance: SystemStopAcceptance | null }> {
    if (MOCK) {
      await delay(150);
      const row = worklogs.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Catatan waktu tidak ditemukan.');
      if (!canRead(actor, row.employeeId)) fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Di luar rezim baca Anda.');
      return {
        changes: worklogChanges
          .filter((item) => item.worklogId === id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((item) => ({ ...item })),
        acceptance: acceptances.find((item) => item.worklogId === id) ?? null,
      };
    }
    const { data } = await api.get(`/worklogs/${id}/changes`);
    return { changes: camelize<WorklogChange[]>(data), acceptance: null };
  },

  /**
   * `TS-15` — atasan berjenjang menerima baris DIHENTIKAN_SISTEM bawahan APA ADANYA: durasi tidak berubah.
   * SoD: penyetuju ≠ pemilik baris (403). Dua jalan penyelesaian saling meniadakan.
   */
  async acceptSystemStop(actor: ProdActor, id: string): Promise<SystemStopAcceptance> {
    if (MOCK) {
      await delay(260);
      const row = live().find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Catatan waktu tidak ditemukan.');
      if (row.employeeId === actor.employeeId)
        fail(403, 'PROD_SELF_ACCEPTANCE_FORBIDDEN', 'Anda tidak dapat menerima catatan waktu milik Anda sendiri.');
      if (!isSupervisorOf(actor.employeeId, row.employeeId))
        fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Hanya atasan berjenjang pemilik baris yang dapat menerimanya.');
      if (row.origin !== 'DIHENTIKAN_SISTEM')
        fail(422, 'PROD_NOT_SYSTEM_STOPPED_WORKLOG', 'Hanya baris "Dihentikan Sistem" yang dapat diterima apa adanya.');
      if (acceptances.some((item) => item.worklogId === id))
        fail(409, 'DUPLICATE_CONFLICT', 'Baris ini sudah diterima.');
      if (row.correctionMode) fail(422, 'PROD_ALREADY_CORRECTED', 'Baris ini sudah dikoreksi pemiliknya.');
      seq.acceptance += 1;
      const acceptance: SystemStopAcceptance = {
        id: uuid('h4000000', seq.acceptance),
        worklogId: id,
        createdBy: me(actor),
        createdAt: nowIso(),
      };
      acceptances.push(acceptance);
      row.correctionMode = 'DITERIMA_ATASAN';
      return { ...acceptance };
    }
    const { data } = await api.post(`/worklogs/${id}/system-stop-acceptance`);
    return camelize<SystemStopAcceptance>(data);
  },

  /** `TS-11` — atasan berjenjang/HR membuka jendela; TIDAK menyunting worklog siapa pun (P-3). */
  async grantWindow(
    actor: ProdActor,
    input: { targetEmployeeId: string; windowStartDate: string; windowEndDate: string; grantReason: string },
  ): Promise<WindowGrant> {
    if (MOCK) {
      await delay(250);
      if (!isHr(actor.role) && !isSupervisorOf(actor.employeeId, input.targetEmployeeId))
        fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Hanya atasan berjenjang atau HR yang dapat membuka jendela.');
      if (!input.windowStartDate || !input.windowEndDate || input.windowEndDate < input.windowStartDate)
        fail(422, 'VALIDATION_ERROR', 'Rentang tanggal tidak sah.');
      if (!input.grantReason.trim()) fail(422, 'VALIDATION_ERROR', 'Alasan wajib diisi.');
      const approved = periods.find(
        (row) =>
          row.employeeId === input.targetEmployeeId &&
          row.state === 'DISAHKAN' &&
          row.periodStart <= input.windowEndDate &&
          row.periodEnd >= input.windowStartDate,
      );
      if (approved)
        fail(
          422,
          'PROD_PERIOD_ALREADY_APPROVED',
          `Rentang menyentuh rekap ${approved.periodStart.slice(0, 7)} yang sudah disahkan.`,
        );
      seq.grant += 1;
      const grant: WindowGrant = {
        id: uuid('m1000000', seq.grant),
        ...input,
        grantReason: input.grantReason.trim(),
        grantedBy: me(actor),
        createdAt: nowIso(),
      };
      grants.push(grant);
      return { ...grant };
    }
    const { data } = await api.post('/worklogs/window-grants', snakeize(input));
    return camelize<WindowGrant>(data);
  },

  /* ── Summary (`TS-12`–`TS-14`) ───────────────────────────────────────────── */

  /** `TS-12` search — rekap periode milik karyawan; di luar rantai = 403. */
  async periods(actor: ProdActor, employeeId: string): Promise<TimesheetPeriod[]> {
    if (MOCK) {
      await delay();
      if (!canRead(actor, employeeId))
        fail(403, 'PROD_NOT_IN_SUPERVISION_CHAIN', 'Karyawan ini di luar rantai atasan Anda.');
      ensurePeriod(employeeId, today());
      return periods
        .filter((row) => row.employeeId === employeeId)
        .sort((a, b) => b.periodStart.localeCompare(a.periodStart))
        .map(buildPeriod);
    }
    const { data } = await api.post('/timesheet-periods/search', snakeize({ filters: { employeeId } }));
    return camelize<WirePage<TimesheetPeriod>>(data).data;
  },

  /** `TS-13` — pemilik saja; gerbang: nol baris DIHENTIKAN_SISTEM menggantung (PD-50). */
  async submitPeriod(actor: ProdActor, id: string): Promise<TimesheetPeriod> {
    if (MOCK) {
      await delay(300);
      const row = periods.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Rekap tidak ditemukan.');
      if (row.employeeId !== actor.employeeId)
        fail(403, 'PROD_NOT_OBJECT_OWNER', 'Hanya pemilik rekap yang dapat mengajukannya.');
      if (row.state === 'MENUNGGU_PENGESAHAN') fail(409, 'PROD_PERIOD_ALREADY_SUBMITTED', 'Rekap ini sudah diajukan.');
      if (row.state === 'DISAHKAN')
        fail(422, 'PROD_INVALID_STATE_TRANSITION', 'Rekap yang sudah disahkan tidak dapat diajukan ulang.');
      const built = buildPeriod(row);
      if (built.pendingSystemStopCount > 0)
        fail(
          422,
          'PROD_PENDING_SYSTEM_STOP',
          `${built.pendingSystemStopCount} baris "Dihentikan Sistem" belum dikoreksi/diterima — selesaikan dulu sebelum mengajukan.`,
        );
      row.state = 'MENUNGGU_PENGESAHAN';
      row.submittedAt = nowIso();
      return buildPeriod(row);
    }
    const { data } = await api.post(`/timesheet-periods/${id}/submit`);
    return camelize<TimesheetPeriod>(data);
  },

  /**
   * `TS-14` — urutan gerbang: state ≠ DISAHKAN (422) · payroll sudah konfirmasi (403, terkeras, termasuk HR) ·
   * bukan atasan langsung/HR (403) · alasan kosong (422). Hanya MEMBUKA — pengesahan ulang lewat siklus normal.
   */
  async reopenPeriod(actor: ProdActor, id: string, reason: string): Promise<TimesheetPeriod> {
    if (MOCK) {
      await delay(300);
      const row = periods.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Rekap tidak ditemukan.');
      if (row.state !== 'DISAHKAN')
        fail(422, 'PROD_INVALID_STATE_TRANSITION', 'Hanya rekap berstatus DISAHKAN yang dapat dibuka kembali.');
      if (row.payrollConfirmedAt)
        fail(
          403,
          'PROD_PAYROLL_LOCKED',
          'Periode sudah dikonfirmasi payroll — tidak dapat dibuka kembali oleh peran apa pun.',
        );
      const direct = employeeOf(row.employeeId)?.supervisorId === actor.employeeId;
      if (!direct && !isHr(actor.role))
        fail(403, 'PROD_REOPEN_NOT_AUTHORIZED', 'Hanya atasan langsung atau HR yang dapat membuka kembali rekap.');
      if (!reason.trim()) fail(422, 'VALIDATION_ERROR', 'Alasan pembukaan kembali wajib diisi.');
      row.state = 'DIKEMBALIKAN';
      row.reopenReason = reason.trim();
      return buildPeriod(row);
    }
    const { data } = await api.post(`/timesheet-periods/${id}/reopen`, { reason });
    return camelize<TimesheetPeriod>(data);
  },

  /* ── Group for Payroll (`36`–`42`) ───────────────────────────────────────── */

  async groups(): Promise<PaidWorkGroup[]> {
    if (MOCK) {
      await delay(150);
      return groups.map((row) => ({ ...row })).sort((a, b) => a.groupName.localeCompare(b.groupName));
    }
    const { data } = await api.post('/paid-work-groups/search', {});
    return camelize<WirePage<PaidWorkGroup>>(data).data;
  },

  /** `38`/`39` — HR saja; nama unik; `is_active=false` TIDAK cascade ke pemetaan (Anti-Kompresi). */
  async saveGroup(
    actor: ProdActor,
    input: { groupName: string; isActive?: boolean },
    id?: string,
  ): Promise<PaidWorkGroup> {
    if (MOCK) {
      await delay(250);
      if (!isHr(actor.role)) fail(403, 'FORBIDDEN', 'Hanya HR yang dapat mengelola kelompok berbayar.');
      const name = input.groupName.trim();
      if (!name) fail(422, 'VALIDATION_ERROR', 'Nama kelompok wajib diisi.');
      if (name.length > 60) fail(422, 'VALIDATION_ERROR', 'Nama kelompok maksimal 60 karakter.');
      if (groups.some((row) => row.id !== id && row.groupName.toLowerCase() === name.toLowerCase()))
        fail(422, 'PROD_PAID_WORK_GROUP_NAME_DUPLICATE', `Nama "${name}" sudah dipakai kelompok lain.`);
      if (id) {
        const row = groups.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Kelompok tidak ditemukan.');
        row.groupName = name;
        if (input.isActive !== undefined) row.isActive = input.isActive;
        return { ...row };
      }
      seq.group += 1;
      const row: PaidWorkGroup = {
        id: uuid('pwg10000', seq.group),
        code: `PWG-${pad(seq.group)}`,
        groupName: name,
        isActive: true,
        createdAt: nowIso(),
      };
      groups.push(row);
      return { ...row };
    }
    const { data } = id
      ? await api.put(`/paid-work-groups/${id}`, snakeize(input))
      : await api.post('/paid-work-groups', snakeize(input));
    return camelize<PaidWorkGroup>(data);
  },

  /** `40` — nama kategori & kelompok dijoin saat baca (snapshot tampilan, bukan kolom tersimpan). */
  async mappings(activeOnly: boolean): Promise<CategoryMapping[]> {
    if (MOCK) {
      await delay(150);
      return mappings
        .filter((row) => !activeOnly || row.isActive)
        .map((row) => ({
          ...row,
          taskCategoryName: projectService.categoryRef(row.taskCategoryId)?.categoryName ?? row.taskCategoryId,
          paidWorkGroupName: groups.find((group) => group.id === row.paidWorkGroupId)?.groupName ?? row.paidWorkGroupId,
        }))
        .sort((a, b) => a.taskCategoryName.localeCompare(b.taskCategoryName));
    }
    const { data } = await api.post(
      '/paid-work-group-category-mappings/search',
      snakeize({ filters: activeOnly ? { isActive: true } : {} }),
    );
    return camelize<WirePage<CategoryMapping>>(data).data;
  },

  /** `41` — satu kategori satu pemetaan aktif (422 menyebut pemetaan yang menghalangi). */
  async createMapping(actor: ProdActor, taskCategoryId: string, paidWorkGroupId: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      if (!isHr(actor.role)) fail(403, 'FORBIDDEN', 'Hanya HR yang dapat memetakan kategori.');
      if (!taskCategoryId || !paidWorkGroupId) fail(422, 'VALIDATION_ERROR', 'Kategori dan kelompok wajib dipilih.');
      const clash = mappings.find((row) => row.taskCategoryId === taskCategoryId && row.isActive);
      if (clash) {
        const group = groups.find((row) => row.id === clash.paidWorkGroupId)?.groupName;
        fail(
          422,
          'PROD_MAPPING_CATEGORY_ALREADY_ACTIVE',
          `Kategori sudah dipetakan aktif ke "${group}" — nonaktifkan pemetaan itu dulu sebelum memetakan ke kelompok lain.`,
        );
      }
      if (!groups.find((row) => row.id === paidWorkGroupId)?.isActive)
        fail(422, 'VALIDATION_ERROR', 'Kelompok berbayar tujuan tidak aktif.');
      seq.mapping += 1;
      mappings.push({
        id: uuid('map10000', seq.mapping),
        taskCategoryId,
        paidWorkGroupId,
        isActive: true,
        deactivationReason: null,
        createdAt: nowIso(),
        deactivatedAt: null,
      });
      return;
    }
    await api.post('/paid-work-group-category-mappings', snakeize({ taskCategoryId, paidWorkGroupId }));
  },

  /** `42` — bukan Delete: baris tetap ada; jam yang sudah tercatat NOL berubah (PD-43 konsekuensi 5). */
  async deactivateMapping(actor: ProdActor, id: string, reason: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      if (!isHr(actor.role)) fail(403, 'FORBIDDEN', 'Hanya HR yang dapat menonaktifkan pemetaan.');
      const row = mappings.find((item) => item.id === id) ?? fail(404, 'NOT_FOUND', 'Pemetaan tidak ditemukan.');
      if (!row.isActive) fail(422, 'VALIDATION_ERROR', 'Pemetaan sudah nonaktif.');
      row.isActive = false;
      row.deactivationReason = reason.trim() || null;
      row.deactivatedAt = nowIso();
      return;
    }
    await api.patch(`/paid-work-group-category-mappings/${id}/deactivate`, {
      deactivation_reason: reason || undefined,
    });
  },
};
