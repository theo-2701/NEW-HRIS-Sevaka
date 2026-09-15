import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { JOB_GRADES } from '@/features/finance-settings/mock-data';
import { settingsState } from '@/features/finance-settings/settings-store';
import {
  PURPOSE_NAME_MAX,
  REASON_NAME_MAX,
  canReadCatalogue,
  canReadHistory,
  canWriteSettings,
  nameError,
  normalizeName,
  reasonError,
} from '@/features/finance-settings/rules';
import { parseAmount } from '@/features/cash-advance/rules';
import type {
  Actor,
  LoanLimit,
  LoanLimitDraft,
  LoanLimitFilter,
  LoanLimitPatch,
  PurposeTypeHistory,
  PurposeTypeInput,
  PurposeTypePatch,
  PurposeTypeRow,
  RejectionReason,
  RejectionReasonInput,
  RejectionReasonPatch,
} from '@/features/finance-settings/types';

/**
 * API service Pengaturan Finance Lintas-Modul (TSD §14.1 · UIC §2).
 *
 *  • Tulis seluruh resource: Finance Officer & Super Admin — selain itu 403.
 *  • `/loan-limits`: `job_grade_id` unik antar baris belum dihapus ⇒ 409; nominal
 *    `≥0`; `job_grade_id` tidak diubah saat `PUT`; tanpa riwayat. Perubahan tidak
 *    berlaku surut — Loan membaca plafon aktif saat pengajuan.
 *  • `/cash-advance-purpose-types`: nama `FIN1` ≤150, `max_amount > 0` atau kosong;
 *    `reason` wajib hanya bila `is_official_travel` berubah ⇒ 422 FIN_REASON_REQUIRED;
 *    setiap perubahan menulis `log_advance_purpose_type_history`.
 *  • `/rejection-reasons`: `is_system_default` selalu `false` untuk baris baru dan
 *    diabaikan saat `PUT`; menghapus baris bawaan ⇒ 422 FIN_REJECTION_REASON_SYSTEM_DEFAULT.
 *
 * Akses baca `ROLE_EMPLOYEE` atas `/loan-limits` kontradiktif di TSD (PROB-FRONTEND-018)
 * — mock mengikuti tabel ringkasan §6.1.5 (R), sama seperti prototype & Figma.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const nowIso = () => new Date().toISOString();
let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${++sequence}`;

const gradeOrder = (id: string) => JOB_GRADES.findIndex((grade) => grade.id === id);

function requireWrite(actor: Actor) {
  if (!canWriteSettings(actor.role)) {
    throw new Error('403 — data induk finance hanya diubah Finance Officer atau Super Admin.');
  }
}

function requireCatalogue(actor: Actor) {
  if (!canReadCatalogue(actor.role)) throw new Error('403 — data induk bukan objek persetujuan Dept Manager.');
}

function findLimit(id: string): LoanLimit {
  const row = settingsState().limits.find((item) => item.id === id && !item.deletedAt);
  if (!row) throw new Error('404 — plafon pinjaman tidak ditemukan.');
  return row;
}

function findPurpose(id: string): PurposeTypeRow {
  const row = settingsState().purposes.find((item) => item.id === id && !item.deletedAt);
  if (!row) throw new Error('404 — jenis keperluan tidak ditemukan.');
  return row;
}

function findReason(id: string): RejectionReason {
  const row = settingsState().reasons.find((item) => item.id === id && !item.deletedAt);
  if (!row) throw new Error('404 — sebab penolakan tidak ditemukan.');
  return row;
}

function requireAmount(value: string, field: string): number {
  if (!value.trim() || !/\d/.test(value)) throw new Error(`422 — ${field} wajib diisi.`);
  return parseAmount(value);
}

function logPurpose(
  actor: Actor,
  purposeTypeId: string,
  activity: PurposeTypeHistory['activity'],
  changedField: string,
  before: unknown,
  after: unknown,
  reasonNote: string | null,
) {
  const state = settingsState();
  state.purposeHistory = [
    ...state.purposeHistory,
    {
      id: nextId('pth'),
      purposeTypeId,
      changedField,
      valueBefore: before === undefined || before === null ? null : String(before),
      valueAfter: after === undefined || after === null ? null : String(after),
      reasonNote,
      activity,
      createdAt: nowIso(),
      createdBy: actor.employeeId,
    },
  ];
}

export const financeSettingsService = {
  /** F1.29 — `POST /loan-limits/search`. */
  async loanLimits(actor: Actor, filter: LoanLimitFilter = {}): Promise<LoanLimit[]> {
    if (MOCK) {
      await delay();
      requireCatalogue(actor);
      return settingsState()
        .limits.filter((row) => {
          if (row.deletedAt) return false;
          if (filter.jobGradeId && row.jobGradeId !== filter.jobGradeId) return false;
          if (filter.isActive !== undefined && row.isActive !== filter.isActive) return false;
          return true;
        })
        .sort((a, b) => gradeOrder(a.jobGradeId) - gradeOrder(b.jobGradeId))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: LoanLimit[] }>('/loan-limits/search', {
      job_grade_id: filter.jobGradeId ? [filter.jobGradeId] : undefined,
      is_active: filter.isActive,
    });
    return data.data;
  },

  /** F1.25 — `POST /loan-limits` (201). */
  async createLoanLimit(actor: Actor, draft: LoanLimitDraft): Promise<LoanLimit> {
    if (MOCK) {
      await delay(350);
      requireWrite(actor);
      if (!JOB_GRADES.some((grade) => grade.id === draft.jobGradeId)) throw new Error('422 — job_grade_id wajib dipilih.');
      const limitAmount = requireAmount(draft.limitAmount, 'limit_amount');
      const state = settingsState();
      if (state.limits.some((row) => !row.deletedAt && row.jobGradeId === draft.jobGradeId)) {
        throw new Error('409 — golongan ini sudah punya baris plafon; ubah baris yang ada, bukan menambah.');
      }
      const row: LoanLimit = {
        id: nextId('ll'),
        jobGradeId: draft.jobGradeId,
        limitAmount,
        isActive: true,
        createdAt: nowIso(),
        updatedAt: null,
        deletedAt: null,
      };
      state.limits = [...state.limits, row];
      return { ...row };
    }
    const { data } = await api.post<LoanLimit>('/loan-limits', {
      job_grade_id: draft.jobGradeId,
      limit_amount: parseAmount(draft.limitAmount),
    });
    return data;
  },

  /** F1.27 — `PUT /loan-limits/{id}` (200), nominal & status saja. */
  async updateLoanLimit(actor: Actor, id: string, patch: LoanLimitPatch): Promise<LoanLimit> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findLimit(id);
      row.limitAmount = requireAmount(patch.limitAmount, 'limit_amount');
      row.isActive = patch.isActive;
      row.updatedAt = nowIso();
      return { ...row };
    }
    const { data } = await api.put<LoanLimit>(`/loan-limits/${id}`, {
      limit_amount: parseAmount(patch.limitAmount),
      is_active: patch.isActive,
    });
    return data;
  },

  /** F1.28 — `DELETE /loan-limits/{id}` (soft-delete). */
  async deleteLoanLimit(actor: Actor, id: string): Promise<void> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      findLimit(id).deletedAt = nowIso();
      return;
    }
    await api.delete(`/loan-limits/${id}`);
  },

  /** F1.40 — `POST /cash-advance-purpose-types/search`. */
  async purposeTypes(actor: Actor): Promise<PurposeTypeRow[]> {
    if (MOCK) {
      await delay();
      requireCatalogue(actor);
      return settingsState()
        .purposes.filter((row) => !row.deletedAt)
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: PurposeTypeRow[] }>('/cash-advance-purpose-types/search', {});
    return data.data;
  },

  /** F1.36 — `POST /cash-advance-purpose-types` (201). */
  async createPurposeType(actor: Actor, input: PurposeTypeInput): Promise<PurposeTypeRow> {
    if (MOCK) {
      await delay(350);
      requireWrite(actor);
      const problem = nameError(input.name, PURPOSE_NAME_MAX);
      if (problem) throw new Error(`422 — ${problem}.`);
      const name = normalizeName(input.name);
      if (input.maxAmount !== null && input.maxAmount <= 0) throw new Error('422 — max_amount harus lebih dari 0 atau dikosongkan.');
      const state = settingsState();
      if (state.purposes.some((row) => !row.deletedAt && row.isActive && row.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('409 — nama jenis keperluan sudah dipakai baris aktif.');
      }
      const row: PurposeTypeRow = { id: nextId('pt'), ...input, name, isActive: true, deletedAt: null };
      state.purposes = [...state.purposes, row];
      logPurpose(actor, row.id, 'I', 'name', null, name, null);
      return { ...row };
    }
    const { data } = await api.post<PurposeTypeRow>('/cash-advance-purpose-types', {
      name: input.name,
      is_official_travel: input.isOfficialTravel,
      requires_receipt: input.requiresReceipt,
      max_amount: input.maxAmount,
      is_unlimited_ack: input.isUnlimitedAck,
    });
    return data;
  },

  /** F1.38 — `PUT /cash-advance-purpose-types/{id}`; `reason` kondisional. */
  async updatePurposeType(actor: Actor, id: string, patch: PurposeTypePatch): Promise<PurposeTypeRow> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findPurpose(id);
      if (patch.name !== undefined) {
        const problem = nameError(patch.name, PURPOSE_NAME_MAX);
        if (problem) throw new Error(`422 — ${problem}.`);
      }
      if (patch.maxAmount !== undefined && patch.maxAmount !== null && patch.maxAmount <= 0) {
        throw new Error('422 — max_amount harus lebih dari 0 atau dikosongkan.');
      }
      const travelChanged = patch.isOfficialTravel !== undefined && patch.isOfficialTravel !== row.isOfficialTravel;
      if (travelChanged && reasonError(patch.reason)) {
        throw new Error('422 FIN_REASON_REQUIRED — mengubah penanda perjalanan dinas wajib disertai sebab.');
      }
      const reasonNote = patch.reason?.trim() || null;
      const next = { ...patch, name: patch.name === undefined ? undefined : normalizeName(patch.name) };
      (['name', 'isOfficialTravel', 'requiresReceipt', 'maxAmount', 'isUnlimitedAck', 'isActive'] as const).forEach((field) => {
        const value = next[field];
        if (value === undefined || value === row[field]) return;
        logPurpose(actor, row.id, 'U', field, row[field], value, reasonNote);
        Object.assign(row, { [field]: value });
      });
      return { ...row };
    }
    const { data } = await api.put<PurposeTypeRow>(`/cash-advance-purpose-types/${id}`, {
      name: patch.name,
      is_official_travel: patch.isOfficialTravel,
      requires_receipt: patch.requiresReceipt,
      max_amount: patch.maxAmount,
      is_unlimited_ack: patch.isUnlimitedAck,
      is_active: patch.isActive,
      reason: patch.reason,
    });
    return data;
  },

  /** F1.39 — `DELETE /cash-advance-purpose-types/{id}` (soft-delete). */
  async deletePurposeType(actor: Actor, id: string): Promise<void> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findPurpose(id);
      row.deletedAt = nowIso();
      logPurpose(actor, row.id, 'D', 'deleted_at', null, row.deletedAt, null);
      return;
    }
    await api.delete(`/cash-advance-purpose-types/${id}`);
  },

  /** F1.41 — `GET /cash-advance-purpose-types/{id}/history`; nol akses Employee. */
  async purposeTypeHistory(actor: Actor, id: string): Promise<PurposeTypeHistory[]> {
    if (MOCK) {
      await delay(150);
      if (!canReadHistory(actor.role)) throw new Error('403 — riwayat data induk bukan untuk peran ini.');
      return settingsState()
        .purposeHistory.filter((row) => row.purposeTypeId === id)
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ data: PurposeTypeHistory[] }>(`/cash-advance-purpose-types/${id}/history`);
    return data.data;
  },

  /** F1.47 — `POST /rejection-reasons/search`. */
  async rejectionReasons(actor: Actor): Promise<RejectionReason[]> {
    if (MOCK) {
      await delay();
      requireCatalogue(actor);
      return settingsState()
        .reasons.filter((row) => !row.deletedAt)
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: RejectionReason[] }>('/rejection-reasons/search', {});
    return data.data;
  },

  /** F1.43 — `POST /rejection-reasons` (201), `is_system_default` selalu `false`. */
  async createRejectionReason(actor: Actor, input: RejectionReasonInput): Promise<RejectionReason> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const problem = nameError(input.name, REASON_NAME_MAX);
      if (problem) throw new Error(`422 — ${problem}.`);
      const row: RejectionReason = {
        id: nextId('rr'),
        name: normalizeName(input.name),
        requiresFreeText: input.requiresFreeText,
        isSystemDefault: false,
        isActive: true,
        deletedAt: null,
      };
      const state = settingsState();
      state.reasons = [...state.reasons, row];
      return { ...row };
    }
    const { data } = await api.post<RejectionReason>('/rejection-reasons', {
      name: input.name,
      requires_free_text: input.requiresFreeText,
    });
    return data;
  },

  /** F1.45 — `PUT /rejection-reasons/{id}`; `is_system_default` diabaikan. */
  async updateRejectionReason(actor: Actor, id: string, patch: RejectionReasonPatch): Promise<RejectionReason> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findReason(id);
      if (patch.name !== undefined) {
        const problem = nameError(patch.name, REASON_NAME_MAX);
        if (problem) throw new Error(`422 — ${problem}.`);
        row.name = normalizeName(patch.name);
      }
      if (patch.requiresFreeText !== undefined) row.requiresFreeText = patch.requiresFreeText;
      if (patch.isActive !== undefined) row.isActive = patch.isActive;
      return { ...row };
    }
    const { data } = await api.put<RejectionReason>(`/rejection-reasons/${id}`, {
      name: patch.name,
      requires_free_text: patch.requiresFreeText,
      is_active: patch.isActive,
    });
    return data;
  },

  /** F1.46 — `DELETE /rejection-reasons/{id}`. */
  async deleteRejectionReason(actor: Actor, id: string): Promise<void> {
    if (MOCK) {
      await delay(300);
      requireWrite(actor);
      const row = findReason(id);
      if (row.isSystemDefault) {
        throw new Error('422 FIN_REJECTION_REASON_SYSTEM_DEFAULT — sebab bawaan sistem tidak dapat dihapus.');
      }
      row.deletedAt = nowIso();
      return;
    }
    await api.delete(`/rejection-reasons/${id}`);
  },
};
