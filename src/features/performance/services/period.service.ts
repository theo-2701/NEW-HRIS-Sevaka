import { ApiError, api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { settingsService } from '@/features/settings/services/settings.service';
import { SETTINGS_VIEWERS } from '@/features/settings/mock-data';
import {
  ASSESSMENT_STRUCTURES,
  CHAIN_EXHAUSTED,
  LATE_JOINERS,
  NOT_ASSESSABLE,
  PERIOD_SEED,
  toAudit,
} from '@/features/performance/mock-data';
import { canListPeriods, canManagePeriods, canViewEligibility, canViewPeriod } from '@/features/performance/rules';
import type {
  EligibilityGaps,
  EligibilitySummary,
  PerfActor,
  PeriodSearch,
  ReviewPeriod,
} from '@/features/performance/types';

/**
 * Menu 1 — Siklus & Setelan (UIC-001-PERFORMANCE §2, `P1.01`–`P1.07`). Nol Idempotency-Key.
 * Fase satu arah `FILLING → SIGNING → CLOSED`; hanya satu periode `FILLING` per company.
 */

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
let store: ReviewPeriod[] = PERIOD_SEED.map((row) => ({ ...row }));
let seq = 0;

export function resetPeriodMocks() {
  store = PERIOD_SEED.map((row) => ({ ...row }));
  seq = 0;
}

const forbidden = () => new ApiError('Peran Anda tidak berhak atas layar ini.', 403, 'FORBIDDEN');
const PHASE_ORDER = { FILLING: 0, SIGNING: 1, CLOSED: 2 } as const;

function find(id: string): ReviewPeriod {
  const row = store.find((item) => item.id === id);
  if (!row) throw new ApiError('Periode tidak ditemukan.', 404, 'NOT_FOUND');
  return row;
}

/** Setelan `performance.*` dibaca terkini dari modul Settings (cross-schema `SELECT`, nol REST). */
async function readSetup(): Promise<{ scaleLength: number | null; structureId: string | null }> {
  const rows = await settingsService.read(SETTINGS_VIEWERS[0]);
  const value = (code: string) => rows.find((row) => row.setupCode === code)?.setupValue?.[0] ?? null;
  const scale = value('performance.scale_length');
  const structure = value('performance.assessment_structure_id');
  return {
    scaleLength: typeof scale === 'number' ? scale : scale === null ? null : Number(scale),
    structureId: structure === null ? null : String(structure),
  };
}

/** Dihitung live tiap panggilan — tidak pernah disimpan. `periodCreatedAt` kosong = pratinjau sebelum buka. */
function computeGaps(structureId: string, periodCreatedAt?: string): EligibilityGaps {
  const lateJoiners = periodCreatedAt
    ? LATE_JOINERS.filter((row) => row.joinDate > periodCreatedAt.slice(0, 10)).map((row) => ({
        employeeId: row.employeeId,
        employeeNameSnapshot: row.employeeNameSnapshot,
        reason: 'NOT_INCLUDED_MID_PERIOD' as const,
      }))
    : [];
  return {
    assessmentStructureId: structureId,
    notAssessable: NOT_ASSESSABLE.map((row) => ({ ...row })),
    outOfAssessment: [...CHAIN_EXHAUSTED.map((row) => ({ ...row })), ...lateJoiners],
  };
}

type RawAudit = { employee_id: string; nama: string; nik: string; timezone: string };
type RawPeriod = {
  id: string;
  period_name: string;
  phase: ReviewPeriod['phase'];
  assessment_structure_id?: string;
  assessment_structure_name_snapshot?: string;
  scale_length: number;
  closed_at?: string | null;
  closed_at_timezone?: string | null;
  created_by?: RawAudit;
  created_at: string;
  updated_by?: RawAudit | null;
  updated_at?: string | null;
};
type RawEntry = { employee_id: string; employee_name_snapshot: string; reason: string };
type RawGaps = { assessment_structure_id: string; not_assessable: RawEntry[]; out_of_assessment: RawEntry[] };

const fromAudit = (raw: RawAudit) => ({ employeeId: raw.employee_id, nama: raw.nama, nik: raw.nik, timezone: raw.timezone });

const fromPeriod = (raw: RawPeriod): ReviewPeriod => ({
  id: raw.id,
  periodName: raw.period_name,
  phase: raw.phase,
  assessmentStructureId: raw.assessment_structure_id ?? '',
  assessmentStructureNameSnapshot: raw.assessment_structure_name_snapshot ?? '',
  scaleLength: raw.scale_length,
  closedAt: raw.closed_at ?? null,
  closedAtTimezone: raw.closed_at_timezone ?? null,
  createdBy: raw.created_by ? fromAudit(raw.created_by) : { employeeId: '', nama: '—', nik: '', timezone: 'Asia/Jakarta' },
  createdAt: raw.created_at,
  updatedBy: raw.updated_by ? fromAudit(raw.updated_by) : null,
  updatedAt: raw.updated_at ?? null,
});

const fromGaps = (raw: RawGaps): EligibilityGaps => ({
  assessmentStructureId: raw.assessment_structure_id,
  notAssessable: raw.not_assessable.map((row) => ({
    employeeId: row.employee_id,
    employeeNameSnapshot: row.employee_name_snapshot,
    reason: row.reason as EligibilityGaps['notAssessable'][number]['reason'],
  })),
  outOfAssessment: raw.out_of_assessment.map((row) => ({
    employeeId: row.employee_id,
    employeeNameSnapshot: row.employee_name_snapshot,
    reason: row.reason as EligibilityGaps['outOfAssessment'][number]['reason'],
  })),
});

export const periodService = {
  /** `P1.03` — grid; whitelist `phase` & `sort_by`. */
  async search(actor: PerfActor, query: PeriodSearch): Promise<{ rows: ReviewPeriod[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!canListPeriods(actor.role)) throw forbidden();
      const by = query.sortBy ?? 'created_at';
      const dir = query.sortDirection === 'ASC' ? 1 : -1;
      const rows = store
        .filter((row) => !query.phase?.length || query.phase.includes(row.phase))
        .sort((a, b) => {
          if (by === 'period_name') return a.periodName.localeCompare(b.periodName) * dir;
          if (by === 'phase') return (PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase]) * dir;
          return a.createdAt.localeCompare(b.createdAt) * dir;
        });
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size).map((row) => ({ ...row })), totalData: rows.length };
    }
    const { data } = await api.post<{ data: RawPeriod[]; total_data: number }>('/performance/review-periods/search', {
      phase: query.phase,
      page: query.page,
      size: query.size,
      sort_by: query.sortBy,
      sort_direction: query.sortDirection,
    });
    return { rows: data.data.map(fromPeriod), totalData: data.total_data };
  },

  /** `P1.02` — DM dibatasi lapis kueri ke periode yang menaungi lembarnya. */
  async get(actor: PerfActor, id: string): Promise<ReviewPeriod> {
    if (MOCK) {
      await delay(150);
      if (!canViewPeriod(actor.role)) throw forbidden();
      return { ...find(id) };
    }
    const { data } = await api.get<RawPeriod>(`/performance/review-periods/${id}`);
    return fromPeriod(data);
  },

  /** `P1.01` — satu field; skala & struktur dibekukan saat itu; ringkasan kelayakan dihitung, tidak disimpan. */
  async open(actor: PerfActor, periodName: string): Promise<{ period: ReviewPeriod; summary: EligibilitySummary }> {
    if (MOCK) {
      await delay();
      if (!canManagePeriods(actor.role)) throw forbidden();
      const holding = store.find((row) => row.phase === 'FILLING');
      if (holding) {
        throw new ApiError(`Periode "${holding.periodName}" masih berada pada fase FILLING.`, 422, 'PERIOD_PHASE_INVALID');
      }
      const name = periodName.trim();
      if (!name || name.length > 100) {
        throw new ApiError('Nama periode wajib diisi, maksimal 100 karakter.', 422, 'VALIDATION_ERROR');
      }
      const setup = await readSetup();
      if (setup.scaleLength === null || !setup.structureId) {
        throw new ApiError('Setelan Kinerja wajib belum lengkap.', 422, 'VALIDATION_ERROR');
      }
      if (setup.scaleLength < 2) {
        throw new ApiError('Panjang skala nilai minimal 2 tingkat.', 422, 'SCALE_LENGTH_INVALID');
      }
      const structureName = ASSESSMENT_STRUCTURES[setup.structureId];
      if (!structureName) {
        throw new ApiError('Struktur penilaian yang disetel tidak lagi ditemukan.', 422, 'VALIDATION_ERROR');
      }
      const now = new Date().toISOString();
      seq += 1;
      const period: ReviewPeriod = {
        id: `rp-new-${seq}`,
        periodName: name,
        phase: 'FILLING',
        assessmentStructureId: setup.structureId,
        assessmentStructureNameSnapshot: structureName,
        scaleLength: setup.scaleLength,
        closedAt: null,
        closedAtTimezone: null,
        createdBy: toAudit(actor),
        createdAt: now,
        updatedBy: null,
        updatedAt: null,
      };
      store = [period, ...store];
      const gaps = computeGaps(setup.structureId, now);
      return {
        period: { ...period },
        summary: { notAssessableCount: gaps.notAssessable.length, outOfAssessmentCount: gaps.outOfAssessment.length },
      };
    }
    const { data } = await api.post<RawPeriod & { eligibility_summary: { not_assessable_count: number; out_of_assessment_count: number } }>(
      '/performance/review-periods',
      { period_name: periodName.trim() },
    );
    return {
      period: fromPeriod(data),
      summary: {
        notAssessableCount: data.eligibility_summary.not_assessable_count,
        outOfAssessmentCount: data.eligibility_summary.out_of_assessment_count,
      },
    };
  },

  /** `P1.04` — pratinjau sebelum periode ada; tanpa `NOT_INCLUDED_MID_PERIOD`. */
  async eligibilityPreview(actor: PerfActor): Promise<EligibilityGaps> {
    if (MOCK) {
      await delay(150);
      if (!canViewEligibility(actor.role)) throw forbidden();
      const setup = await readSetup();
      if (!setup.structureId) throw new ApiError('Struktur penilaian belum disetel.', 422, 'VALIDATION_ERROR');
      return computeGaps(setup.structureId);
    }
    const { data } = await api.get<RawGaps>('/performance/review-periods/eligibility-preview');
    return fromGaps(data);
  },

  /** `P1.05` — dihitung ulang tiap panggilan atas periode yang sudah ada. */
  async eligibilityGaps(actor: PerfActor, id: string): Promise<EligibilityGaps> {
    if (MOCK) {
      await delay(150);
      if (!canViewEligibility(actor.role)) throw forbidden();
      const period = find(id);
      return computeGaps(period.assessmentStructureId, period.createdAt);
    }
    const { data } = await api.get<RawGaps>(`/performance/review-periods/${id}/eligibility-gaps`);
    return fromGaps(data);
  },

  /** `P1.06` — trigger eksplisit HR; tidak memeriksa kelengkapan nilai awal. */
  async startSigning(actor: PerfActor, id: string): Promise<void> {
    if (MOCK) {
      await delay();
      if (!canManagePeriods(actor.role)) throw forbidden();
      const period = find(id);
      if (period.phase !== 'FILLING') {
        throw new ApiError('Pengesahan hanya bisa dimulai dari fase FILLING.', 422, 'PERIOD_PHASE_INVALID');
      }
      Object.assign(period, { phase: 'SIGNING', updatedBy: toAudit(actor), updatedAt: new Date().toISOString() });
      return;
    }
    await api.post(`/performance/review-periods/${id}/start-signing`);
  },

  /** `P1.07` — terminal; memicu snapshot lembar; nol jalur membuka kembali. */
  async close(actor: PerfActor, id: string): Promise<void> {
    if (MOCK) {
      await delay();
      if (!canManagePeriods(actor.role)) throw forbidden();
      const period = find(id);
      if (period.phase !== 'SIGNING') {
        throw new ApiError('Periode hanya bisa ditutup dari fase SIGNING.', 422, 'PERIOD_PHASE_INVALID');
      }
      const now = new Date().toISOString();
      Object.assign(period, {
        phase: 'CLOSED',
        closedAt: now,
        closedAtTimezone: 'Asia/Jakarta',
        updatedBy: toAudit(actor),
        updatedAt: now,
      });
      return;
    }
    await api.post(`/performance/review-periods/${id}/close`);
  },
};
