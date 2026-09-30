import { ApiError, api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  PERF_ACTORS,
  PERF_DIRECTORY,
  REPRIMAND_DISCLAIMER,
  SIGNAL_COMPUTED_AT,
  SIGNAL_SEED,
  SUPERVISOR_OF,
  type SnapshotSeed,
} from '@/features/performance/mock-data';
import { accessLogStore, recordAccess } from '@/features/performance/services/access-log';
import { delay } from '@/features/performance/services/ids';
import { kpiService } from '@/features/performance/services/kpi.service';
import { objectionStore } from '@/features/performance/services/objection.service';
import { periodService } from '@/features/performance/services/period.service';
import { readPerfNumber } from '@/features/performance/services/setup';
import { sheetStore } from '@/features/performance/services/sheet.service';
import { snapshotStore } from '@/features/performance/services/snapshot-store';
import {
  canReadAccessLog,
  canReadHrReports,
  canReadManagerReports,
  canReadOthersBoard,
  hasOwnBoard,
} from '@/features/performance/rules';
import type {
  AccessLogRow,
  AccessLogSearch,
  AdditionalRatioRow,
  BlankInputRow,
  InactiveKpiRow,
  PendingObjectionRow,
  PerfActor,
  ReasonRow,
  ReviewPeriod,
  SignalBoard,
  SignalGroup,
  SignalGroupKey,
  SnapshotDetail,
  SnapshotRow,
  TargetMixRow,
  TaskDistributionRow,
} from '@/features/performance/types';

/**
 * Menu 6 — Papan Pantau & Laporan (UIC-001-PERFORMANCE §7, `PL-01`–`PL-13` + `PL-11b`). Lapis
 * baca-dan-rakit murni: nol CRUD, nol penghitungan ulang sinyal, nol Idempotency-Key. Pembacaan atas
 * orang lain menulis tepat satu baris jejak akses; baca ditolak tidak menulis apa pun.
 */

/** Pembaca internal lintas-modul (cross-schema `SELECT`) — bukan identitas pemanggil. */
const SYSTEM = PERF_ACTORS[0];
const GROUP_ORDER: SignalGroupKey[] = ['ATTENDANCE', 'OVERTIME', 'TRANSITION', 'PRODUCTIVITY', 'PENDING_DECISION', 'REPRIMAND'];
const SEEDED_PERIOD = 'rp-2026-s1';

const toCamel = (key: string) => key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

/** Respons laporan (`PL-05`..`PL-12`) dipetakan snake_case → camelCase secara mekanis. */
function camelize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((item) => camelize(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [toCamel(key), camelize(item)])) as T;
  }
  return value as T;
}

/** Body laporan memakai ejaan kontrak apa adanya (`review-period-id`, dst.). */
async function report<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data } = await api.post<unknown>(`/performance/reports/${path}/search`, body);
  return camelize<T>(data);
}

const notFound = () => new ApiError('Data tidak ditemukan.', 404, 'NOT_FOUND');
const forbidden = () => new ApiError('Peran Anda tidak berhak atas laporan ini.', 403, 'FORBIDDEN');
const isSuper = (actor: PerfActor) => actor.role === 'ROLE_SUPER_ADMIN';
const isHr = (actor: PerfActor) => isSuper(actor) || canReadHrReports(actor.role);
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Bawahan pada rantai penilaian SEKARANG (`PF-45` k5), langsung maupun berjenjang. */
function chainBelow(supervisorId: string): string[] {
  const below: string[] = [];
  const walk = (id: string) => {
    for (const [employee, supervisor] of Object.entries(SUPERVISOR_OF)) {
      if (supervisor === id && !below.includes(employee)) {
        below.push(employee);
        walk(employee);
      }
    }
  };
  walk(supervisorId);
  return below;
}

/** Hak baca orang lain: HR seluruh company, atasan pada rantai; selebihnya 404 anti-enumerasi. */
function canReadOther(actor: PerfActor, employeeId: string) {
  if (actor.employeeId === employeeId) return false;
  if (isHr(actor)) return true;
  return actor.role === 'ROLE_DEPT_MANAGER' && chainBelow(actor.employeeId).includes(employeeId);
}

async function resolvePeriod(periodId?: string): Promise<ReviewPeriod> {
  if (periodId) return periodService.get(SYSTEM, periodId).catch(() => {
    throw new ApiError('Periode tidak valid.', 422, 'VALIDATION_ERROR');
  });
  const { rows } = await periodService.search(SYSTEM, { page: 1, size: 50 });
  const active = rows.find((row) => row.phase !== 'CLOSED');
  const closed = rows.filter((row) => row.phase === 'CLOSED').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const period = active ?? closed;
  if (!period) throw new ApiError('Belum ada periode penilaian.', 422, 'VALIDATION_ERROR');
  return period;
}

function groupsFor(employeeId: string, periodId: string): SignalGroup[] {
  const seeded = periodId === SEEDED_PERIOD ? SIGNAL_SEED[employeeId] : undefined;
  return GROUP_ORDER.map(
    (key) =>
      seeded?.find((row) => row.groupKey === key) ?? {
        groupKey: key,
        recap: null,
        details: [],
        emptyState: key === 'REPRIMAND' ? 'NOT_AVAILABLE' : 'NO_RECORD',
      },
  );
}

async function board(employeeId: string, periodId?: string): Promise<SignalBoard> {
  const period = await resolvePeriod(periodId);
  return {
    reviewPeriodId: period.id,
    reviewPeriodName: period.periodName,
    reviewPeriodPhase: period.phase,
    employeeId,
    groups: structuredClone(groupsFor(employeeId, period.id)),
    reprimandDisclaimer: REPRIMAND_DISCLAIMER,
    computedAt: SIGNAL_COMPUTED_AT,
  };
}

function historyRows(employeeId: string, includeRevisions: boolean, withName: boolean): SnapshotRow[] {
  const all = snapshotStore
    .all()
    .filter((row) => row.employeeId === employeeId)
    .sort((a, b) => b.approvedAt.localeCompare(a.approvedAt));
  const latest = includeRevisions
    ? all
    : all.filter((row) => row === all.find((item) => item.reviewSheetId === row.reviewSheetId));
  return latest.map((row) => ({
    snapshotId: row.snapshotId,
    reviewSheetId: row.reviewSheetId,
    revisionNo: row.revisionNo,
    approvedAt: row.approvedAt,
    ...(withName
      ? { employeeName: PERF_DIRECTORY[row.employeeId] ?? row.employeeId }
      : { jobGradeNameSnapshot: row.jobGradeNameSnapshot }),
  }));
}

/** Field HIDUP menempel saat dibaca — tidak pernah disalin ke snapshot. */
async function withLiveFields(row: SnapshotSeed): Promise<SnapshotDetail> {
  const { reviewPeriodId, ...frozen } = row;
  const latest = objectionStore
    .all()
    .filter((item) => item.reviewSheetId === row.reviewSheetId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  const period = await periodService.get(SYSTEM, reviewPeriodId).catch(() => null);
  return {
    ...structuredClone(frozen),
    objectionSummary: latest ? { status: latest.status, objectionId: latest.id } : null,
    currentIncidentRecapAvailable: period ? period.phase !== 'CLOSED' : false,
  };
}

/** Penilai (pemegang kursi) yang punya lembar pada periode itu. */
function assessorSheets(periodId: string) {
  const bySupervisor = new Map<string, ReturnType<typeof sheetStore.all>>();
  for (const sheet of sheetStore.all().filter((row) => row.reviewPeriodId === periodId)) {
    bySupervisor.set(sheet.assessorId, [...(bySupervisor.get(sheet.assessorId) ?? []), sheet]);
  }
  return bySupervisor;
}

export const monitorService = {
  /** Karyawan yang papan/riwayatnya boleh dibuka pemanggil (roster Company, tanpa diri sendiri). */
  async roster(actor: PerfActor): Promise<{ employeeId: string; name: string }[]> {
    await delay(100);
    const ids = isHr(actor)
      ? Object.keys(SIGNAL_SEED)
      : actor.role === 'ROLE_DEPT_MANAGER'
        ? chainBelow(actor.employeeId)
        : [];
    return ids
      .filter((id) => id !== actor.employeeId)
      .map((id) => ({ employeeId: id, name: PERF_DIRECTORY[id] ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  /** `PL-01` (SELF, tanpa jejak akses) / `PL-02` (orang lain, menulis satu baris jejak akses). */
  async signalBoard(actor: PerfActor, employeeId: string | null, periodId?: string): Promise<SignalBoard> {
    if (MOCK) {
      await delay();
      if (!employeeId) {
        if (!hasOwnBoard(actor.role)) throw new ApiError('Papan pantau diri hanya untuk karyawan.', 403, 'FORBIDDEN');
        return board(actor.employeeId, periodId);
      }
      if (!canReadOthersBoard(actor.role) && !isSuper(actor)) throw notFound();
      if (!canReadOther(actor, employeeId)) throw notFound();
      const result = await board(employeeId, periodId);
      recordAccess(actor, employeeId);
      return result;
    }
    const url = employeeId ? `/performance/employees/${employeeId}/signal-board` : '/performance/me/signal-board';
    const { data } = await api.get<{
      review_period_id: string;
      review_period_name: string;
      review_period_phase: ReviewPeriod['phase'];
      employee_id: string;
      groups: { group_key: SignalGroupKey; recap: Record<string, number> | null; details: SignalGroup['details']; empty_state: SignalGroup['emptyState'] }[];
      reprimand_disclaimer: string;
      computed_at: string;
    }>(url, { params: { 'review-period-id': periodId } });
    return {
      reviewPeriodId: data.review_period_id,
      reviewPeriodName: data.review_period_name,
      reviewPeriodPhase: data.review_period_phase,
      employeeId: data.employee_id,
      groups: data.groups.map((row) => ({ groupKey: row.group_key, recap: row.recap, details: row.details, emptyState: row.empty_state })),
      reprimandDisclaimer: data.reprimand_disclaimer,
      computedAt: data.computed_at,
    };
  },

  /** `PL-03` (SELF) / `PL-04` (rantai SEKARANG atau HR, menulis jejak akses) — revisi terbaru per lembar. */
  async reviewHistory(
    actor: PerfActor,
    employeeId: string | null,
    includeRevisions = false,
  ): Promise<{ rows: SnapshotRow[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!employeeId) {
        if (!hasOwnBoard(actor.role)) throw new ApiError('Riwayat diri hanya untuk karyawan.', 403, 'FORBIDDEN');
        const rows = historyRows(actor.employeeId, includeRevisions, false);
        return { rows, totalData: rows.length };
      }
      if (!canReadOther(actor, employeeId)) throw notFound();
      const rows = historyRows(employeeId, includeRevisions, true);
      recordAccess(actor, employeeId);
      return { rows, totalData: rows.length };
    }
    const url = employeeId ? `/performance/employees/${employeeId}/review-history` : '/performance/me/review-history';
    const { data } = await api.get<{
      data: { snapshot_id: string; review_sheet_id: string; revision_no: number; approved_at: string; job_grade_name_snapshot?: string; employee_name?: string }[];
      total_data: number;
    }>(url, { params: { page: 1, size: 50, 'include-revisions': includeRevisions } });
    return {
      rows: data.data.map((row) => ({
        snapshotId: row.snapshot_id,
        reviewSheetId: row.review_sheet_id,
        revisionNo: row.revision_no,
        approvedAt: row.approved_at,
        jobGradeNameSnapshot: row.job_grade_name_snapshot,
        employeeName: row.employee_name,
      })),
      totalData: data.total_data,
    };
  },

  /** `PL-05` — pemilik, HR, atau rantai sekarang; pembacaan atas orang lain tercatat. */
  async snapshot(actor: PerfActor, snapshotId: string): Promise<SnapshotDetail> {
    if (MOCK) {
      await delay(150);
      const row = snapshotStore.find(snapshotId);
      if (!row) throw notFound();
      const own = row.employeeId === actor.employeeId;
      if (!own && !canReadOther(actor, row.employeeId)) throw notFound();
      const detail = await withLiveFields(row);
      if (!own) recordAccess(actor, row.employeeId);
      return detail;
    }
    const { data } = await api.get<unknown>(`/performance/review-history/${snapshotId}`);
    return camelize<SnapshotDetail>(data);
  },

  // ---------- Laporan HR (PL-06..PL-12) — urutan tetap, tanpa sort_by ----------

  /** `PL-06` — seluruh bawahan tampil, termasuk yang "dilewati"; `null` ≠ 0. DM dipaksa = dirinya. */
  async taskDistribution(actor: PerfActor, periodId: string, supervisorId?: string): Promise<TaskDistributionRow[]> {
    if (!MOCK) {
      return report('task-distribution', { 'review-period-id': periodId, 'supervisor-employee-id': supervisorId });
    }
    await delay();
    const dm = actor.role === 'ROLE_DEPT_MANAGER';
    if (!isHr(actor) && !dm) throw forbidden();
    if (dm && supervisorId && supervisorId !== actor.employeeId) throw notFound();
    const target = dm ? actor.employeeId : supervisorId;
    const supervisors = [...new Set(Object.values(SUPERVISOR_OF).filter((id): id is string => Boolean(id)))].filter(
      (id) => !target || id === target,
    );
    return supervisors.map((supervisor) => ({
      supervisorEmployeeId: supervisor,
      subordinates: Object.entries(SUPERVISOR_OF)
        .filter(([, boss]) => boss === supervisor)
        .map(([employeeId]) => {
          const productivity = groupsFor(employeeId, periodId).find((row) => row.groupKey === 'PRODUCTIVITY');
          return {
            employeeId,
            employeeName: PERF_DIRECTORY[employeeId] ?? employeeId,
            assignedTaskCount: productivity?.recap?.productivity_task_assigned_count ?? null,
          };
        }),
    }));
  },

  /** `PL-07` — `COUNT ... GROUP BY` golongan atas daftar induk. */
  async targetTypeMix(actor: PerfActor, periodId: string): Promise<TargetMixRow[]> {
    if (!MOCK) return report('kpi-item-target-type-mix', { 'review-period-id': periodId });
    await delay();
    if (!isHr(actor)) throw forbidden();
    const { rows } = await kpiService.search(SYSTEM, { page: 1, size: 1000 });
    const byGrade = new Map<string, TargetMixRow>();
    for (const row of rows) {
      const entry = byGrade.get(row.jobGradeNameSnapshot) ?? { jobGradeNameSnapshot: row.jobGradeNameSnapshot, numericCount: 0, narrativeCount: 0 };
      if (row.targetType === 'NUMERIC') entry.numericCount += 1;
      else entry.narrativeCount += 1;
      byGrade.set(row.jobGradeNameSnapshot, entry);
    }
    return [...byGrade.values()];
  },

  /** `PL-08` — HR Manager saja; sengaja tanpa `item_name` (fokus `is_active`). */
  async inactiveKpi(actor: PerfActor, query: { jobGradeId?: string; page: number; size: number }): Promise<{ rows: InactiveKpiRow[]; totalData: number }> {
    if (!MOCK) {
      const data = await report<{ data: InactiveKpiRow[]; totalData: number }>('kpi-item-inactive', {
        'job-grade-id': query.jobGradeId,
        page: query.page,
        size: query.size,
      });
      return { rows: data.data, totalData: data.totalData };
    }
    await delay();
    if (!isSuper(actor) && !canReadManagerReports(actor.role)) throw forbidden();
    const { rows } = await kpiService.search(SYSTEM, { jobGradeId: query.jobGradeId, isActive: false, page: 1, size: 1000 });
    const mapped = rows.map((row) => ({ jobGradeNameSnapshot: row.jobGradeNameSnapshot, isActive: row.isActive }));
    const start = (query.page - 1) * query.size;
    return { rows: mapped.slice(start, start + query.size), totalData: mapped.length };
  },

  /** `PL-09` — porsi BOBOT tambahan per atasan; pagar hanya keterangan. */
  async additionalRatio(actor: PerfActor, periodId: string): Promise<AdditionalRatioRow[]> {
    if (!MOCK) return report('additional-item-ratio', { 'review-period-id': periodId });
    await delay();
    if (!isHr(actor)) throw forbidden();
    const threshold = await readPerfNumber('performance.additional_item_max_ratio', 30);
    return [...assessorSheets(periodId).entries()].map(([supervisor, sheets]) => {
      const items = sheets.flatMap((sheet) => sheet.items.filter((row) => !row.deletedAt));
      const total = items.reduce((sum, row) => sum + row.rawWeight, 0);
      const extra = items.filter((row) => row.origin === 'ADDITIONAL').reduce((sum, row) => sum + row.rawWeight, 0);
      return { supervisorEmployeeId: supervisor, additionalWeightRatio: total ? round1((extra / total) * 100) : 0, maxRatioThreshold: threshold };
    });
  },

  /** `PL-10` — HR Manager saja. */
  async notYetAssessable(actor: PerfActor, periodId: string): Promise<ReasonRow[]> {
    if (!MOCK) return report('not-yet-assessable', { 'review-period-id': periodId });
    await delay();
    if (!isSuper(actor) && !canReadManagerReports(actor.role)) throw forbidden();
    const gaps = await periodService.eligibilityGaps(SYSTEM, periodId);
    return gaps.notAssessable.map((row) => ({ employeeId: row.employeeId, employeeName: row.employeeNameSnapshot, reason: row.reason }));
  },

  /** `PL-11` — dua sebab struktural; tidak dapat disanggah. */
  async excluded(actor: PerfActor, periodId: string): Promise<ReasonRow[]> {
    if (!MOCK) return report('excluded-from-assessment', { 'review-period-id': periodId });
    await delay();
    if (!isHr(actor)) throw forbidden();
    const gaps = await periodService.eligibilityGaps(SYSTEM, periodId);
    return gaps.outOfAssessment.map((row) => ({ employeeId: row.employeeId, employeeName: row.employeeNameSnapshot, reason: row.reason }));
  },

  /** `PL-11b` — dua proporsi independen, netral, bukan gerbang. */
  async blankInput(actor: PerfActor, periodId: string): Promise<BlankInputRow[]> {
    if (!MOCK) return report('blank-input-ratio', { 'review-period-id': periodId });
    await delay();
    if (!isHr(actor)) throw forbidden();
    return [...assessorSheets(periodId).entries()].map(([supervisor, sheets]) => {
      const items = sheets.flatMap((sheet) => sheet.items.filter((row) => !row.deletedAt));
      return {
        supervisorEmployeeId: supervisor,
        blankSelfAssessmentRatio: round1((sheets.filter((sheet) => !sheet.selfAssessment).length / sheets.length) * 100),
        unreadItemRatio: items.length ? round1((items.filter((row) => !row.employeeReadAt).length / items.length) * 100) : 0,
      };
    });
  },

  /** `PL-12` — HR, atau pemikul saat ini untuk dirinya sendiri. */
  async pendingObjections(actor: PerfActor, holderId?: string): Promise<PendingObjectionRow[]> {
    if (!MOCK) return report('pending-objections', { 'holder-employee-id': holderId });
    await delay();
    const holder = isHr(actor) ? holderId : holderId ?? actor.employeeId;
    if (!isHr(actor) && (actor.role !== 'ROLE_DEPT_MANAGER' || holder !== actor.employeeId)) throw forbidden();
    const now = Date.now();
    return objectionStore
      .all()
      .filter((row) => row.status === 'SUBMITTED' && (!holder || row.currentHolder.holderEmployeeId === holder))
      .map((row) => ({
        objectionId: row.id,
        currentHolderEmployeeId: row.currentHolder.holderEmployeeId,
        currentHolderContext: row.currentHolder.holderContext ?? 'PENILAI_ASLI',
        daysSinceSubmitted: Math.floor((now - new Date(row.submittedAt).getTime()) / 86_400_000),
      }));
  },

  /** `PL-13` — HR saja, tiga filter persis kontrak, urut `created_at` DESC tetap. */
  async accessLogs(actor: PerfActor, query: AccessLogSearch): Promise<{ rows: AccessLogRow[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!isSuper(actor) && !canReadAccessLog(actor.role)) {
        throw new ApiError('Jejak akses hanya untuk HR.', 403, 'FORBIDDEN');
      }
      const rows = accessLogStore
        .all()
        .filter((row) => !query.subjectEmployeeId || row.subjectEmployeeId === query.subjectEmployeeId)
        .filter((row) => !query.readerEmployeeId || row.readerEmployeeId === query.readerEmployeeId)
        .filter((row) => !query.startDate || new Date(row.createdAt) >= new Date(`${query.startDate}T00:00:00+07:00`))
        .filter((row) => !query.endDate || new Date(row.createdAt) <= new Date(`${query.endDate}T23:59:59+07:00`))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size), totalData: rows.length };
    }
    const { data } = await api.post<{
      data: { id: string; reader_employee_id: string; subject_employee_id: string; created_by: { employee_id: string; name: string; role: string }; created_at: string; activity: 'I' }[];
      total_data: number;
    }>('/performance/access-logs/search', {
      subject_employee_id: query.subjectEmployeeId,
      reader_employee_id: query.readerEmployeeId,
      start_date: query.startDate,
      end_date: query.endDate,
      page: query.page,
      size: query.size,
      sort_by: 'created_at',
      sort_direction: 'DESC',
    });
    return {
      rows: data.data.map((row) => ({
        id: row.id,
        readerEmployeeId: row.reader_employee_id,
        subjectEmployeeId: row.subject_employee_id,
        createdBy: { employeeId: row.created_by.employee_id, name: row.created_by.name, role: row.created_by.role },
        createdAt: row.created_at,
        activity: row.activity,
      })),
      totalData: data.total_data,
    };
  },
};
