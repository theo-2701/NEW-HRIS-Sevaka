import { ApiError, api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { companyService } from '@/features/company/services/company.service';
import { KPI_SEED, KPI_USAGE } from '@/features/performance/mock-data';
import { delay, uuidV7 } from '@/features/performance/services/ids';
import { canReadKpi, canWriteKpi } from '@/features/performance/rules';
import type {
  JobGradeOption,
  KpiDraft,
  KpiItem,
  KpiItemDetail,
  KpiSearch,
  PerfActor,
  TargetType,
} from '@/features/performance/types';

/**
 * Menu 2 — Daftar Induk & Bobot (UIC-001-PERFORMANCE §3, `P2.01`–`P2.06`).
 * Idempotency-Key wajib hanya pada create. Satu endpoint search melayani grid HR dan Browsing atasan.
 */

interface StoredKpi extends KpiItem {
  deletedBy: { id: string; name: string } | null;
  deletedAt: string | null;
}

let store: StoredKpi[] = [];
let usedKeys = new Set<string>();

export function resetKpiMocks() {
  store = KPI_SEED.map((row) => ({ ...row, deletedBy: null, deletedAt: null }));
  usedKeys = new Set();
}
resetKpiMocks();

const forbidden = () => new ApiError('Hanya HR Manager yang boleh mengubah daftar induk.', 403, 'FORBIDDEN');
const TARGET_TYPES: TargetType[] = ['NUMERIC', 'NARRATIVE'];
const short = (actor: PerfActor) => ({ id: actor.employeeId, name: actor.name });

function live(id: string): StoredKpi {
  const row = store.find((item) => item.id === id && !item.deletedAt);
  if (!row) throw new ApiError('Item daftar induk tidak ditemukan.', 404, 'NOT_FOUND');
  return row;
}

const strip = (row: StoredKpi): KpiItem => {
  const { deletedBy: _deletedBy, deletedAt: _deletedAt, ...rest } = row;
  return { ...rest };
};

/** Golongan dibaca dari company (`mst_job_grade`) — cross-schema DB tenant yang sama. */
async function gradeName(jobGradeId: string): Promise<string> {
  const grade = (await companyService.jobGrades()).find((row) => row.id === jobGradeId);
  if (!grade) throw new ApiError('Golongan jabatan tidak ditemukan.', 422, 'VALIDATION_ERROR');
  return grade.name;
}

function validate(patch: Partial<KpiDraft>) {
  if (patch.itemName !== undefined && (!patch.itemName.trim() || patch.itemName.trim().length > 255)) {
    throw new ApiError('Nama item wajib diisi, maksimal 255 karakter.', 422, 'VALIDATION_ERROR');
  }
  if (patch.targetType !== undefined && !TARGET_TYPES.includes(patch.targetType)) {
    throw new ApiError('Jenis target harus Numeric atau Narrative.', 422, 'VALIDATION_ERROR');
  }
  if (patch.rawWeight !== undefined) {
    const weight = patch.rawWeight;
    const cents = weight * 100;
    if (!Number.isFinite(weight) || weight < 0 || weight > 9999.99 || Math.abs(Math.round(cents) - cents) > 1e-6) {
      throw new ApiError('Bobot mentah 0–9999.99, maksimal dua angka desimal.', 422, 'VALIDATION_ERROR');
    }
  }
}

type RawKpi = {
  id: string;
  item_name: string;
  job_grade_id: string;
  job_grade_name_snapshot: string;
  target_type: TargetType;
  raw_weight: number;
  is_active: boolean;
  used_in_sheet_count?: number;
  created_by?: { id: string; name: string };
  created_at: string;
  updated_by?: { id: string; name: string } | null;
  updated_at?: string | null;
};

const fromRaw = (raw: RawKpi): KpiItemDetail => ({
  id: raw.id,
  itemName: raw.item_name,
  jobGradeId: raw.job_grade_id,
  jobGradeNameSnapshot: raw.job_grade_name_snapshot,
  targetType: raw.target_type,
  rawWeight: Number(raw.raw_weight),
  isActive: raw.is_active,
  createdBy: raw.created_by ?? { id: '', name: '—' },
  createdAt: raw.created_at,
  updatedBy: raw.updated_by ?? null,
  updatedAt: raw.updated_at ?? null,
  usedInSheetCount: raw.used_in_sheet_count ?? 0,
});

const toBody = (patch: Partial<KpiDraft>) => ({
  item_name: patch.itemName?.trim(),
  job_grade_id: patch.jobGradeId,
  target_type: patch.targetType,
  raw_weight: patch.rawWeight,
  is_active: patch.isActive,
});

export const kpiService = {
  /** `P2.05` — HR tanpa filter status; Browsing atasan selalu mengirim `is_active=true`. */
  async search(actor: PerfActor, query: KpiSearch): Promise<{ rows: KpiItem[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!canReadKpi(actor.role)) throw new ApiError('Peran Anda tidak berhak atas daftar induk.', 403, 'FORBIDDEN');
      const by = query.sortBy ?? 'created_at';
      const dir = query.sortDirection === 'ASC' ? 1 : -1;
      const rows = store
        .filter((row) => !row.deletedAt)
        .filter((row) => !query.jobGradeId || row.jobGradeId === query.jobGradeId)
        .filter((row) => !query.targetType || row.targetType === query.targetType)
        .filter((row) => query.isActive === undefined || row.isActive === query.isActive)
        .sort((a, b) => {
          if (by === 'job_grade_id') return a.jobGradeId.localeCompare(b.jobGradeId) * dir;
          if (by === 'is_active') return (Number(a.isActive) - Number(b.isActive)) * dir;
          return a.createdAt.localeCompare(b.createdAt) * dir;
        });
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size).map(strip), totalData: rows.length };
    }
    const { data } = await api.post<{ data: RawKpi[]; total_data: number }>('/performance/kpi-items/search', {
      job_grade_id: query.jobGradeId,
      target_type: query.targetType,
      is_active: query.isActive,
      page: query.page,
      size: query.size,
      sort_by: query.sortBy,
      sort_direction: query.sortDirection,
    });
    return { rows: data.data.map(fromRaw), totalData: data.total_data };
  },

  /** `P2.04` — dipakai modal Ubah/Nonaktifkan untuk `used_in_sheet_count` terkini. */
  async get(actor: PerfActor, id: string): Promise<KpiItemDetail> {
    if (MOCK) {
      await delay(150);
      if (!canReadKpi(actor.role)) throw new ApiError('Peran Anda tidak berhak atas daftar induk.', 403, 'FORBIDDEN');
      return { ...strip(live(id)), usedInSheetCount: KPI_USAGE[id] ?? 0 };
    }
    const { data } = await api.get<RawKpi>(`/performance/kpi-items/${id}`);
    return fromRaw(data);
  },

  /** `P2.01` — snapshot golongan ditulis server; `Idempotency-Key` yang sama diproses ulang → 409. */
  async create(actor: PerfActor, draft: KpiDraft, idempotencyKey: string): Promise<KpiItemDetail> {
    if (MOCK) {
      await delay();
      if (!canWriteKpi(actor.role)) throw forbidden();
      if (usedKeys.has(idempotencyKey)) {
        throw new ApiError('Permintaan yang sama sudah diproses.', 409, 'DUPLICATE_CONFLICT');
      }
      validate(draft);
      const snapshot = await gradeName(draft.jobGradeId);
      usedKeys.add(idempotencyKey);
      const row: StoredKpi = {
        id: uuidV7(),
        itemName: draft.itemName.trim(),
        jobGradeId: draft.jobGradeId,
        jobGradeNameSnapshot: snapshot,
        targetType: draft.targetType,
        rawWeight: draft.rawWeight,
        isActive: draft.isActive,
        createdBy: short(actor),
        createdAt: new Date().toISOString(),
        updatedBy: null,
        updatedAt: null,
        deletedBy: null,
        deletedAt: null,
      };
      store = [row, ...store];
      return { ...strip(row), usedInSheetCount: 0 };
    }
    const { data } = await api.post<RawKpi>('/performance/kpi-items', toBody(draft), {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return fromRaw(data);
  },

  /** `P2.02` — parsial; minimal satu field. Snapshot golongan disentuh hanya bila golongan ikut dikirim. */
  async update(actor: PerfActor, id: string, patch: Partial<KpiDraft>): Promise<void> {
    if (MOCK) {
      await delay();
      if (!canWriteKpi(actor.role)) throw forbidden();
      const row = live(id);
      const sent = Object.entries(patch).filter(([, value]) => value !== undefined);
      if (sent.length === 0) throw new ApiError('Minimal satu field wajib dikirim.', 422, 'VALIDATION_ERROR');
      validate(patch);
      const snapshot = patch.jobGradeId !== undefined ? await gradeName(patch.jobGradeId) : row.jobGradeNameSnapshot;
      Object.assign(row, {
        ...(patch.itemName !== undefined && { itemName: patch.itemName.trim() }),
        ...(patch.jobGradeId !== undefined && { jobGradeId: patch.jobGradeId, jobGradeNameSnapshot: snapshot }),
        ...(patch.targetType !== undefined && { targetType: patch.targetType }),
        ...(patch.rawWeight !== undefined && { rawWeight: patch.rawWeight }),
        ...(patch.isActive !== undefined && { isActive: patch.isActive }),
        updatedBy: short(actor),
        updatedAt: new Date().toISOString(),
      });
      return;
    }
    await api.put(`/performance/kpi-items/${id}`, toBody(patch));
  },

  /** `P2.03` — soft-delete; pemakaian di lembar informasional, bukan gerbang; hapus dobel → 404. */
  async deactivate(actor: PerfActor, id: string): Promise<void> {
    if (MOCK) {
      await delay();
      if (!canWriteKpi(actor.role)) throw forbidden();
      const row = live(id);
      row.deletedBy = short(actor);
      row.deletedAt = new Date().toISOString();
      return;
    }
    await api.delete(`/performance/kpi-items/${id}`);
  },

  /** `P2.06` — daftar golongan penuh untuk dropdown (HRM/HRS/DM). */
  async jobGrades(actor: PerfActor): Promise<JobGradeOption[]> {
    if (MOCK) {
      await delay(100);
      if (!canReadKpi(actor.role)) throw new ApiError('Peran Anda tidak berhak atas daftar golongan.', 403, 'FORBIDDEN');
      return (await companyService.jobGrades())
        .map((row) => ({ id: row.id, name: row.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }
    const { data } = await api.get<JobGradeOption[]>('/performance/job-grades/lookup');
    return data;
  },
};
