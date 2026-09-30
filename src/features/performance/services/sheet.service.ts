import { ApiError, api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  HR_LAST_CATCHER,
  PERF_ACTORS,
  SHEET_SEED,
  SUPERVISOR_OF,
  type SheetItemSeed,
  type SheetSeed,
} from '@/features/performance/mock-data';
import { kpiService } from '@/features/performance/services/kpi.service';
import { recordAccess } from '@/features/performance/services/access-log';
import { delay, uuidV7 } from '@/features/performance/services/ids';
import { readPerfNumber } from '@/features/performance/services/setup';
import { canListSheets, canReadHistoryAsHr, canScopeAllSheets, selfAssessmentOpen } from '@/features/performance/rules';
import {
  SHEET_EDITABLE,
  type ItemDraft,
  type ItemOrigin,
  type ItemPatch,
  type PerfActor,
  type SelfAssessment,
  type SheetDetail,
  type SheetItem,
  type SheetRow,
  type SheetSearch,
  type SheetStatus,
  type SubmitResult,
  type SupervisorHistoryRow,
  type TargetType,
} from '@/features/performance/types';

/**
 * Menu 3 — Lembar Penilaian (UIC-001-PERFORMANCE §4, `P3.01`–`P3.14`) + `P4.01` submit, yang
 * layarnya ada di sini walau kontraknya milik Menu 4. Store lembar juga dibaca Menu 4.
 * `404` = anti-enumerasi: tak ada maupun di luar cakupan pembaca dijawab sama.
 */

let store: SheetSeed[] = [];
let usedKeys = new Set<string>();

export function resetSheetMocks() {
  store = structuredClone(SHEET_SEED);
  usedKeys = new Set();
}
resetSheetMocks();

/** Akses mentah untuk Menu 4 (Persetujuan Nilai) — satu store, dua modul. */
export const sheetStore = {
  all: () => store,
  find: (id: string) => store.find((row) => row.id === id),
};

const notFound = () => new ApiError('Lembar penilaian tidak ditemukan.', 404, 'NOT_FOUND');
const phaseInvalid = (message: string) => new ApiError(message, 422, 'PERIOD_PHASE_INVALID');
const invalid = (message: string) => new ApiError(message, 422, 'VALIDATION_ERROR');
const TARGET_TYPES: TargetType[] = ['NUMERIC', 'NARRATIVE'];

function sheetOf(id: string): SheetSeed {
  const sheet = store.find((row) => row.id === id);
  if (!sheet) throw notFound();
  return sheet;
}

function itemOf(sheet: SheetSeed, itemId: string): SheetItemSeed {
  const item = sheet.items.find((row) => row.id === itemId && !row.deletedAt);
  if (!item) throw new ApiError('Baris nilai tidak ditemukan.', 404, 'NOT_FOUND');
  return item;
}

const live = (sheet: SheetSeed) => sheet.items.filter((row) => !row.deletedAt);
const isHolder = (actor: PerfActor, sheet: SheetSeed) => actor.employeeId === sheet.assessorId;
const isOwner = (actor: PerfActor, sheet: SheetSeed) => actor.employeeId === sheet.employeeId;

/** Rantai atasan di atas penilai — pembaca rezim `PF-10`. */
function chainAbove(assessorId: string): string[] {
  const chain: string[] = [];
  let next = SUPERVISOR_OF[assessorId] ?? null;
  while (next && !chain.includes(next)) {
    chain.push(next);
    next = SUPERVISOR_OF[next] ?? null;
  }
  return chain;
}

function canRead(actor: PerfActor, sheet: SheetSeed): boolean {
  if (actor.role === 'ROLE_SUPER_ADMIN' || canScopeAllSheets(actor.role)) return true;
  if (actor.role === 'ROLE_DEPT_MANAGER') return isHolder(actor, sheet) || chainAbove(sheet.assessorId).includes(actor.employeeId);
  return isOwner(actor, sheet);
}

const anyInitial = (sheet: SheetSeed) => live(sheet).some((row) => row.initialValueRecordedAt);

function requireHolder(actor: PerfActor, sheet: SheetSeed) {
  if (!canRead(actor, sheet)) throw notFound();
  if (!isHolder(actor, sheet)) {
    throw new ApiError('Hanya penilai pemegang kursi lembar ini yang boleh melakukannya.', 403, 'FORBIDDEN');
  }
}

function requireOwner(actor: PerfActor, sheet: SheetSeed) {
  if (!canRead(actor, sheet)) throw notFound();
  if (!isOwner(actor, sheet)) {
    throw new ApiError('Hanya karyawan pemilik lembar yang boleh melakukannya.', 403, 'FORBIDDEN');
  }
}

function requireInProgress(sheet: SheetSeed) {
  if (sheet.status !== 'IN_PROGRESS') throw phaseInvalid('Baris nilai hanya dapat diubah selama lembar sedang diisi.');
}

function requireEditable(sheet: SheetSeed) {
  if (!SHEET_EDITABLE.includes(sheet.status)) throw phaseInvalid('Nilai sudah diajukan atau sudah sah — tidak dapat diubah.');
}

function claimKey(key: string) {
  if (usedKeys.has(key)) throw new ApiError('Permintaan yang sama sudah diproses.', 409, 'DUPLICATE_CONFLICT');
  usedKeys.add(key);
}

function checkWeight(weight: number) {
  const cents = weight * 100;
  if (!Number.isFinite(weight) || weight < 0 || weight > 9999.99 || Math.abs(Math.round(cents) - cents) > 1e-6) {
    throw invalid('Bobot mentah 0–9999.99, maksimal dua angka desimal.');
  }
}

function checkText(value: string | undefined, label: string, max = 1000): string {
  const text = value?.trim() ?? '';
  if (!text) throw invalid(`${label} wajib diisi.`);
  if (text.length > max) throw invalid(`${label} maksimal ${max} karakter.`);
  return text;
}

/** Porsi baris tambahan dihitung TERMASUK perubahan yang sedang dicoba (`P3.05`/`P3.06`). */
async function checkQuota(rows: { origin: ItemOrigin; rawWeight: number }[]) {
  const total = rows.reduce((sum, row) => sum + row.rawWeight, 0);
  const extra = rows.filter((row) => row.origin === 'ADDITIONAL').reduce((sum, row) => sum + row.rawWeight, 0);
  const ceiling = await readPerfNumber('performance.additional_item_max_ratio', 30);
  if (total > 0 && (extra / total) * 100 > ceiling + 1e-9) {
    throw new ApiError(
      `Porsi baris tambahan menjadi ${((extra / total) * 100).toFixed(1)}%, melewati batas ${ceiling}%.`,
      422,
      'ADDITIONAL_ITEM_QUOTA_EXCEEDED',
    );
  }
}

/** Efek samping `PF-31 k1`: tanda baca SELURUH baris direset tiap baris ditambah/diubah. */
function resetReads(sheet: SheetSeed) {
  for (const row of live(sheet)) {
    row.employeeReadAt = null;
    row.employeeReadResetCount += 1;
  }
}

const toRow = (sheet: SheetSeed): SheetRow => ({
  id: sheet.id,
  employeeId: sheet.employeeId,
  employeeNameDisplay: sheet.employeeNameDisplay,
  reviewPeriodId: sheet.reviewPeriodId,
  status: sheet.status,
  assessorId: sheet.assessorId,
  hasRevision: sheet.hasRevision,
});

/** Nilai atasan tidak pernah dikirim ke karyawan pemilik lembar (G5, TSD §4.3.9). */
function project(actor: PerfActor, sheet: SheetSeed): SheetDetail {
  const hideValues = isOwner(actor, sheet);
  return {
    ...toRow(sheet),
    processInstanceId: sheet.processInstanceId,
    selfAssessmentFilled: Boolean(sheet.selfAssessment),
    supervisorTransferred: sheet.history.length > 1,
    items: live(sheet).map(({ masterItemId: _master, deletedAt: _deleted, initialValue, submittedValue, ...rest }) =>
      hideValues ? rest : { ...rest, initialValue, submittedValue },
    ),
  };
}

// ---------- api mappers ----------

type RawItem = {
  id: string;
  origin: ItemOrigin;
  item_name_snapshot: string;
  target_type_snapshot: TargetType;
  raw_weight: number;
  frozen_weight_ratio?: number | null;
  target: string;
  employee_read_at?: string | null;
  employee_read_reset_count?: number;
  employee_objection_note?: string | null;
  initial_value_recorded_at?: string | null;
  initial_value?: string | null;
  submitted_value?: string | null;
};

type RawSheet = {
  id: string;
  employee_id: string;
  employee_name_display?: string;
  review_period_id: string;
  status: SheetStatus;
  assessor_id: string;
  has_revision: boolean;
  process_instance_id?: string | null;
  self_assessment_filled?: boolean;
  supervisor_transferred?: boolean;
  items?: RawItem[];
};

const fromRawItem = (raw: RawItem): SheetItem => ({
  id: raw.id,
  origin: raw.origin,
  itemNameSnapshot: raw.item_name_snapshot,
  targetTypeSnapshot: raw.target_type_snapshot,
  rawWeight: raw.raw_weight,
  frozenWeightRatio: raw.frozen_weight_ratio ?? null,
  target: raw.target,
  employeeReadAt: raw.employee_read_at ?? null,
  employeeReadResetCount: raw.employee_read_reset_count ?? 0,
  employeeObjectionNote: raw.employee_objection_note ?? null,
  initialValueRecordedAt: raw.initial_value_recorded_at ?? null,
  ...(raw.initial_value !== undefined && { initialValue: raw.initial_value }),
  ...(raw.submitted_value !== undefined && { submittedValue: raw.submitted_value }),
});

const fromRawRow = (raw: RawSheet): SheetRow => ({
  id: raw.id,
  employeeId: raw.employee_id,
  employeeNameDisplay: raw.employee_name_display ?? '—',
  reviewPeriodId: raw.review_period_id,
  status: raw.status,
  assessorId: raw.assessor_id,
  hasRevision: raw.has_revision,
});

const fromRawSheet = (raw: RawSheet): SheetDetail => ({
  ...fromRawRow(raw),
  processInstanceId: raw.process_instance_id ?? null,
  selfAssessmentFilled: raw.self_assessment_filled ?? false,
  supervisorTransferred: raw.supervisor_transferred ?? false,
  items: (raw.items ?? []).map(fromRawItem),
});

const keyed = (key: string) => ({ headers: { 'Idempotency-Key': key } });
const base = (id: string) => `/performance/review-sheets/${id}`;

export const sheetService = {
  /** `P3.02` — DM selalu `ASSESSOR` (dipaksa server), HR boleh `ALL`. */
  async search(actor: PerfActor, query: SheetSearch): Promise<{ rows: SheetRow[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!canListSheets(actor.role)) throw new ApiError('Peran Anda tidak memiliki antrean lembar.', 403, 'FORBIDDEN');
      const scope = canScopeAllSheets(actor.role) ? query.dataScope : 'ASSESSOR';
      const dir = query.sortDirection === 'ASC' ? 1 : -1;
      const by = query.sortBy ?? 'created_at';
      const rows = store
        .filter((row) => scope === 'ALL' || row.assessorId === actor.employeeId)
        .filter((row) => !query.reviewPeriodId || row.reviewPeriodId === query.reviewPeriodId)
        .sort((a, b) => {
          if (by === 'status') return a.status.localeCompare(b.status) * dir;
          if (by === 'review_period_id') return a.reviewPeriodId.localeCompare(b.reviewPeriodId) * dir;
          return (a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)) * dir;
        });
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size).map(toRow), totalData: rows.length };
    }
    const { data } = await api.post<{ data: RawSheet[]; total_data: number }>('/performance/review-sheets/search', {
      review_period_id: query.reviewPeriodId,
      data_scope: query.dataScope,
      page: query.page,
      size: query.size,
      sort_by: query.sortBy,
      sort_direction: query.sortDirection,
    });
    return { rows: data.data.map(fromRawRow), totalData: data.total_data };
  },

  /**
   * Karyawan tidak punya route daftar (`#14`); `D1` dibuka dengan id dari tautan notifikasi.
   * Mode dummy meniru tautan itu dengan mencari lembar terbaru milik pemanggil.
   */
  async resolveMine(actor: PerfActor): Promise<string | null> {
    if (MOCK) {
      await delay(100);
      const mine = store
        .filter((row) => row.employeeId === actor.employeeId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return mine?.id ?? null;
    }
    return null;
  },

  /** `P3.03` — nilai atasan dibuang untuk karyawan pemilik; rantai di atas penilai boleh membaca. */
  async get(actor: PerfActor, id: string): Promise<SheetDetail> {
    if (MOCK) {
      await delay(150);
      const sheet = sheetOf(id);
      if (!canRead(actor, sheet)) throw notFound();
      /* Titik pemicu jejak akses: HR/rantai membuka lembar orang lain; pemegang kursi & pemilik tidak. */
      if (!isOwner(actor, sheet) && !isHolder(actor, sheet)) recordAccess(actor, sheet.employeeId);
      return project(actor, sheet);
    }
    const { data } = await api.get<RawSheet>(base(id));
    return fromRawSheet(data);
  },

  /** `P3.04` — HR dan penilai pemegang kursi saat ini; urut `valid_from`. */
  async supervisorHistory(actor: PerfActor, id: string): Promise<SupervisorHistoryRow[]> {
    if (MOCK) {
      await delay(150);
      const sheet = sheetOf(id);
      const allowed = actor.role === 'ROLE_SUPER_ADMIN' || canReadHistoryAsHr(actor.role) || isHolder(actor, sheet);
      if (!allowed) throw notFound();
      return [...sheet.history].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    }
    const { data } = await api.get<
      {
        supervisor_employee_id: string;
        supervisor_name_display: string;
        valid_from: string;
        valid_until: string | null;
        handover_note: string | null;
      }[]
    >(`${base(id)}/supervisor-history`);
    return data.map((row) => ({
      supervisorEmployeeId: row.supervisor_employee_id,
      supervisorNameDisplay: row.supervisor_name_display,
      validFrom: row.valid_from,
      validUntil: row.valid_until,
      handoverNote: row.handover_note,
    }));
  },

  /** `P3.05` — atasan pemegang, lembar `IN_PROGRESS`. MASTER disalin sistem, bobotnya terkunci. */
  async addItem(actor: PerfActor, sheetId: string, draft: ItemDraft, idempotencyKey: string): Promise<SheetItem> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireHolder(actor, sheet);
      requireInProgress(sheet);
      let row: SheetItemSeed;
      if (draft.origin === 'MASTER') {
        if (!draft.masterItemId) throw invalid('Baris MASTER wajib merujuk satu item daftar induk.');
        const master = await kpiService.get(actor, draft.masterItemId).catch(() => null);
        if (!master || !master.isActive) throw invalid('Item daftar induk tidak ditemukan atau tidak aktif.');
        row = {
          id: uuidV7(),
          origin: 'MASTER',
          masterItemId: master.id,
          itemNameSnapshot: master.itemName,
          targetTypeSnapshot: master.targetType,
          rawWeight: master.rawWeight,
          target: checkText(draft.target, 'Target', 500),
          frozenWeightRatio: null,
          employeeReadAt: null,
          employeeReadResetCount: 0,
          employeeObjectionNote: null,
          initialValue: null,
          initialValueRecordedAt: null,
          submittedValue: null,
          deletedAt: null,
        };
      } else {
        if (!TARGET_TYPES.includes(draft.targetTypeSnapshot)) throw invalid('Jenis target harus Numeric atau Narrative.');
        checkWeight(draft.rawWeight);
        row = {
          id: uuidV7(),
          origin: 'ADDITIONAL',
          masterItemId: null,
          itemNameSnapshot: checkText(draft.itemNameSnapshot, 'Nama item', 255),
          targetTypeSnapshot: draft.targetTypeSnapshot,
          rawWeight: draft.rawWeight,
          target: checkText(draft.target, 'Target', 500),
          frozenWeightRatio: null,
          employeeReadAt: null,
          employeeReadResetCount: 0,
          employeeObjectionNote: null,
          initialValue: null,
          initialValueRecordedAt: null,
          submittedValue: null,
          deletedAt: null,
        };
        await checkQuota([...live(sheet), row]);
      }
      claimKey(idempotencyKey);
      resetReads(sheet);
      sheet.items.push(row);
      const { masterItemId: _master, deletedAt: _deleted, ...rest } = row;
      return rest;
    }
    const body =
      draft.origin === 'MASTER'
        ? { origin: 'MASTER', master_item_id: draft.masterItemId, target: draft.target }
        : {
            origin: 'ADDITIONAL',
            item_name_snapshot: draft.itemNameSnapshot,
            target_type_snapshot: draft.targetTypeSnapshot,
            raw_weight: draft.rawWeight,
            target: draft.target,
          };
    const { data } = await api.post<RawItem>(`${base(sheetId)}/items`, body, keyed(idempotencyKey));
    return fromRawItem(data);
  },

  /** `P3.06` — MASTER hanya target; bobot MASTER → `403 MASTER_WEIGHT_LOCKED`. */
  async updateItem(actor: PerfActor, sheetId: string, itemId: string, patch: ItemPatch, idempotencyKey: string): Promise<void> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireHolder(actor, sheet);
      requireInProgress(sheet);
      const item = itemOf(sheet, itemId);
      if (patch.target === undefined && patch.rawWeight === undefined) throw invalid('Minimal satu field wajib dikirim.');
      if (patch.rawWeight !== undefined && item.origin === 'MASTER') {
        throw new ApiError('Bobot baris MASTER dikunci HR — hanya target yang boleh diubah.', 403, 'MASTER_WEIGHT_LOCKED');
      }
      const target = patch.target !== undefined ? checkText(patch.target, 'Target', 500) : item.target;
      if (patch.rawWeight !== undefined) {
        checkWeight(patch.rawWeight);
        if (patch.rawWeight > item.rawWeight) {
          await checkQuota(live(sheet).map((row) => (row.id === item.id ? { ...row, rawWeight: patch.rawWeight! } : row)));
        }
      }
      item.target = target;
      if (patch.rawWeight !== undefined) item.rawWeight = patch.rawWeight;
      resetReads(sheet);
      return;
    }
    await api.put(
      `${base(sheetId)}/items/${itemId}`,
      { target: patch.target, raw_weight: patch.rawWeight },
      keyed(idempotencyKey),
    );
  },

  /** `P3.07` — soft-delete; secara kontrak hanya untuk baris ADDITIONAL. */
  async deleteItem(actor: PerfActor, sheetId: string, itemId: string, idempotencyKey: string): Promise<void> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireHolder(actor, sheet);
      requireInProgress(sheet);
      const item = itemOf(sheet, itemId);
      if (item.origin === 'MASTER') throw invalid('Baris MASTER tidak dapat dihapus.');
      item.deletedAt = new Date().toISOString();
      return;
    }
    await api.delete(`${base(sheetId)}/items/${itemId}`, keyed(idempotencyKey));
  },

  /** `P3.08` — tanda sudah dibaca, bukan persetujuan (`PF-21 k6`). */
  async markRead(actor: PerfActor, sheetId: string, itemId: string, idempotencyKey: string): Promise<void> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireOwner(actor, sheet);
      const item = itemOf(sheet, itemId);
      item.employeeReadAt ??= new Date().toISOString();
      return;
    }
    await api.post(`${base(sheetId)}/items/${itemId}/read-mark`, {}, keyed(idempotencyKey));
  },

  /** `P3.09` — catatan keberatan per baris; tidak menahan apa pun (beda dari Sanggahan). */
  async saveObjectionNote(actor: PerfActor, sheetId: string, itemId: string, note: string, idempotencyKey: string): Promise<void> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireOwner(actor, sheet);
      const item = itemOf(sheet, itemId);
      item.employeeObjectionNote = checkText(note, 'Catatan keberatan');
      return;
    }
    await api.post(`${base(sheetId)}/items/${itemId}/objection`, { note }, keyed(idempotencyKey));
  },

  /**
   * `P3.12` (atasan membaca, gerbang lapis kueri) — pemilik lembar selalu membaca isiannya sendiri.
   * `null` = belum pernah ditulis.
   */
  async readSelfAssessment(actor: PerfActor, sheetId: string): Promise<SelfAssessment | null> {
    if (MOCK) {
      await delay(150);
      const sheet = sheetOf(sheetId);
      if (!canRead(actor, sheet)) throw notFound();
      if (isOwner(actor, sheet)) return sheet.selfAssessment;
      if (!isHolder(actor, sheet)) {
        throw new ApiError('Isian diri hanya terbaca oleh penilai pemegang kursi.', 403, 'FORBIDDEN');
      }
      if (!selfAssessmentOpen(live(sheet))) {
        throw new ApiError(
          'Seluruh baris nilai awal wajib terisi sebelum isian karyawan dapat dibaca.',
          403,
          'INITIAL_VALUE_LOCKED',
        );
      }
      return sheet.selfAssessment;
    }
    const { data } = await api.get<{ content: string; submitted_at: string } | null>(`${base(sheetId)}/self-assessment`);
    return data ? { content: data.content, submittedAt: data.submitted_at } : null;
  },

  /** `P3.10` (pertama) / `P3.11` (ubah) — terkunci begitu satu nilai awal tercatat (`PF-37 k8d`). */
  async saveSelfAssessment(actor: PerfActor, sheetId: string, content: string, idempotencyKey: string): Promise<void> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireOwner(actor, sheet);
      if (anyInitial(sheet)) {
        throw new ApiError(
          'Isian diri terkunci karena atasan sudah mencatat nilai awal pada lembar ini.',
          403,
          'INITIAL_VALUE_LOCKED',
        );
      }
      const text = checkText(content, 'Isian penilaian diri', 5000);
      claimKey(idempotencyKey);
      sheet.selfAssessment = { content: text, submittedAt: new Date().toISOString() };
      return;
    }
    const exists = await sheetService.get(actor, sheetId).then((row) => row.selfAssessmentFilled);
    const call = exists ? api.put : api.post;
    await call(`${base(sheetId)}/self-assessment`, { content }, keyed(idempotencyKey));
  },

  /** `P3.13` — nilai awal BUTA; tidak pernah dapat ditimpa (`PF-37 k1`). */
  async setInitialValue(actor: PerfActor, sheetId: string, itemId: string, value: string, idempotencyKey: string): Promise<void> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireHolder(actor, sheet);
      requireEditable(sheet);
      const item = itemOf(sheet, itemId);
      if (item.initialValueRecordedAt) {
        throw new ApiError('Nilai awal sudah tercatat dan tidak dapat ditimpa.', 403, 'INITIAL_VALUE_LOCKED');
      }
      item.initialValue = checkText(value, 'Nilai awal', 500);
      item.initialValueRecordedAt = new Date().toISOString();
      return;
    }
    await api.put(`${base(sheetId)}/items/${itemId}/initial-value`, { value }, keyed(idempotencyKey));
  },

  /** `P3.14` — penyesuaian tanpa batas selama lembar belum diajukan/sah; nilai awal tetap terbaca. */
  async setSubmittedValue(actor: PerfActor, sheetId: string, itemId: string, value: string, idempotencyKey: string): Promise<void> {
    if (MOCK) {
      await delay();
      const sheet = sheetOf(sheetId);
      requireHolder(actor, sheet);
      requireEditable(sheet);
      const item = itemOf(sheet, itemId);
      item.submittedValue = checkText(value, 'Nilai penyesuaian', 500);
      return;
    }
    await api.put(`${base(sheetId)}/items/${itemId}/submitted-value`, { value }, keyed(idempotencyKey));
  },

  /**
   * `P4.01` — kontrak milik Menu 4, tombolnya di layar ini. `WEIGHT_SUM_ZERO` diperiksa sebelum rantai
   * di-resolve; porsi bobot dibekukan permanen; instans alur kerja dimulai sinkron.
   */
  async submit(actor: PerfActor, sheetId: string): Promise<SubmitResult> {
    if (MOCK) {
      await delay(400);
      const sheet = sheetOf(sheetId);
      requireHolder(actor, sheet);
      if (!SHEET_EDITABLE.includes(sheet.status)) {
        throw phaseInvalid('Lembar hanya dapat diajukan saat sedang diisi atau dikembalikan.');
      }
      const rows = live(sheet);
      const total = rows.reduce((sum, row) => sum + row.rawWeight, 0);
      if (total <= 0) {
        throw new ApiError('Total bobot baris berlaku = 0, lembar tidak dapat diajukan.', 422, 'WEIGHT_SUM_ZERO');
      }
      const supervisor = SUPERVISOR_OF[sheet.assessorId] ?? null;
      const approverActor = supervisor ? PERF_ACTORS.find((row) => row.employeeId === supervisor) : null;
      const approver = approverActor ? { employeeId: approverActor.employeeId, name: approverActor.name } : HR_LAST_CATCHER;
      if (!approver) {
        throw new ApiError('Tidak ada penyetuju yang sah: rantai persetujuan telah habis.', 403, 'FORBIDDEN');
      }
      const last = sheet.rounds[sheet.rounds.length - 1];
      const cycleNo = !last ? 1 : sheet.status === 'RETURNED_TO_ASSESSOR' ? last.cycleNo : last.cycleNo + 1;
      const roundNo = last && sheet.status === 'RETURNED_TO_ASSESSOR' ? last.roundNo + 1 : 1;
      for (const row of rows) row.frozenWeightRatio = Math.round((row.rawWeight / total) * 10000) / 100;
      const round = {
        id: uuidV7(),
        cycleNo,
        roundNo,
        approver,
        outcome: null,
        decisionReason: null,
        decidedAt: null,
        createdAt: new Date().toISOString(),
      };
      sheet.rounds.push(round);
      sheet.status = 'PENDING_APPROVAL';
      sheet.processInstanceId = uuidV7();
      return {
        reviewSheetId: sheet.id,
        status: sheet.status,
        approvalRoundId: round.id,
        cycleNo,
        roundNo,
        workflowProcessInstanceId: sheet.processInstanceId,
        approver,
      };
    }
    const { data } = await api.post<{
      review_sheet_id: string;
      status: SheetStatus;
      approval_round_id: string;
      cycle_no: number;
      round_no: number;
      workflow_process_instance_id: string;
      approver: { employee_id: string; name: string };
    }>(`${base(sheetId)}/submit`, {});
    return {
      reviewSheetId: data.review_sheet_id,
      status: data.status,
      approvalRoundId: data.approval_round_id,
      cycleNo: data.cycle_no,
      roundNo: data.round_no,
      workflowProcessInstanceId: data.workflow_process_instance_id,
      approver: { employeeId: data.approver.employee_id, name: data.approver.name },
    };
  },
};
