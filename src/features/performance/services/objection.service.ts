import { ApiError, api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { OBJECTION_SEED, REOPEN_SEED, type ObjectionSeed } from '@/features/performance/mock-data';
import { delay, uuidV7 } from '@/features/performance/services/ids';
import { readPerfNumber } from '@/features/performance/services/setup';
import { sheetStore } from '@/features/performance/services/sheet.service';
import { canReopenWindow, canSearchObjections, canSeeHrObjections } from '@/features/performance/rules';
import type {
  HolderContext,
  ObjectionAnswer,
  ObjectionDetail,
  ObjectionDraft,
  ObjectionRow,
  ObjectionSearch,
  ObjectionStatus,
  ObjectionSubject,
  PerfActor,
  ReopenWindow,
} from '@/features/performance/types';

/**
 * Menu 5 — Sanggahan (UIC-001-PERFORMANCE §6, `P5.01`–`P5.08`). Nol Update/Delete pada `objection`;
 * satu-satunya perubahan adalah jawaban yang menyetel `ANSWERED` dalam transaksi yang sama.
 * Eskalasi pemikul (`PF-42`) adalah job latar — tidak disimulasikan di layar.
 */

let objections: ObjectionSeed[] = [];
let windows: ReopenWindow[] = [];
let usedKeys = new Set<string>();

export function resetObjectionMocks() {
  objections = structuredClone(OBJECTION_SEED);
  windows = structuredClone(REOPEN_SEED);
  usedKeys = new Set();
}
resetObjectionMocks();

const notFound = () => new ApiError('Sanggahan tidak ditemukan.', 404, 'NOT_FOUND');
const invalid = (message: string) => new ApiError(message, 422, 'VALIDATION_ERROR');
const isHr = (actor: PerfActor) => actor.role === 'ROLE_SUPER_ADMIN' || canSeeHrObjections(actor.role);

function claimKey(key: string) {
  if (usedKeys.has(key)) throw new ApiError('Permintaan yang sama sudah diproses.', 409, 'DUPLICATE_CONFLICT');
  usedKeys.add(key);
}

/** §4.5.11 — 1–N karakter, bukan seluruhnya spasi, tanpa `<`/`>`. */
function checkNote(value: string, label: string, max: number, code = 'VALIDATION_ERROR'): string {
  const text = value.trim();
  if (!text) throw new ApiError(`${label} wajib diisi.`, 422, code);
  if (text.length > max) throw new ApiError(`${label} maksimal ${max} karakter.`, 422, 'VALIDATION_ERROR');
  if (/[<>]/.test(text)) throw new ApiError(`${label} tidak boleh memuat tanda < atau >.`, 422, 'VALIDATION_ERROR');
  return text;
}

const toRow = (row: ObjectionSeed): ObjectionRow => ({
  id: row.id,
  reviewSheetId: row.reviewSheetId,
  subjectType: row.subjectType,
  status: row.status,
  submittedByEmployeeId: row.submittedByEmployeeId,
  submittedAt: row.submittedAt,
  currentHolder: row.currentHolder,
});

const toDetail = (row: ObjectionSeed): ObjectionDetail => {
  const { holders: _holders, ...rest } = row;
  return rest;
};

/** Rezim baca berjenjang: pengaju (SELF), pemikul (sekarang atau sebelumnya), HR. */
const canRead = (actor: PerfActor, row: ObjectionSeed) =>
  isHr(actor) ||
  row.submittedByEmployeeId === actor.employeeId ||
  row.holders.some((holder) => holder.holderEmployeeId === actor.employeeId);

// ---------- api mappers ----------

type RawHolder = { holder_employee_id: string; holder_context?: HolderContext; assigned_at?: string };
type RawObjection = {
  id: string;
  review_sheet_id: string;
  approval_round_id?: string | null;
  via_reopen_window_id?: string | null;
  subject_type: ObjectionSubject;
  status: ObjectionStatus;
  submitted_by_employee_id: string;
  submission_note?: string;
  submitted_at: string;
  current_holder: RawHolder;
  answer?: { answered_by_employee_id: string; answer_text: string; answered_at: string } | null;
};
type RawWindow = {
  id: string;
  review_sheet_id: string;
  opened_by_employee_id: string;
  reason?: string;
  opened_at: string;
  new_deadline_at: string;
};

const fromRawRow = (raw: RawObjection): ObjectionRow => ({
  id: raw.id,
  reviewSheetId: raw.review_sheet_id,
  subjectType: raw.subject_type,
  status: raw.status,
  submittedByEmployeeId: raw.submitted_by_employee_id,
  submittedAt: raw.submitted_at,
  currentHolder: {
    holderEmployeeId: raw.current_holder.holder_employee_id,
    holderContext: raw.current_holder.holder_context ?? null,
    assignedAt: raw.current_holder.assigned_at ?? null,
  },
});

const fromRawDetail = (raw: RawObjection): ObjectionDetail => ({
  ...fromRawRow(raw),
  approvalRoundId: raw.approval_round_id ?? null,
  viaReopenWindowId: raw.via_reopen_window_id ?? null,
  submissionNote: raw.submission_note ?? '',
  answer: raw.answer
    ? { answeredByEmployeeId: raw.answer.answered_by_employee_id, answerText: raw.answer.answer_text, answeredAt: raw.answer.answered_at }
    : null,
});

const fromRawWindow = (raw: RawWindow): ReopenWindow => ({
  id: raw.id,
  reviewSheetId: raw.review_sheet_id,
  openedByEmployeeId: raw.opened_by_employee_id,
  reason: raw.reason ?? null,
  openedAt: raw.opened_at,
  newDeadlineAt: raw.new_deadline_at,
});

const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * 86_400_000).toISOString();

export const objectionService = {
  /**
   * `P5.01` — dua entry-point: `VALUE` (lembar `APPROVED`, penjawab = penilai) dan `REJECTED_FINAL`
   * (putaran tolak, penjawab = penyetuju putaran itu). Gerbang tenggat kecuali ada jendela dibuka ulang.
   */
  async create(actor: PerfActor, draft: ObjectionDraft, idempotencyKey: string): Promise<ObjectionDetail> {
    if (MOCK) {
      await delay();
      const sheet = sheetStore.find(draft.reviewSheetId);
      if (!sheet || sheet.employeeId !== actor.employeeId) throw new ApiError('Lembar tidak ditemukan.', 404, 'NOT_FOUND');
      const note = checkNote(draft.submissionNote, 'Isi sanggahan', 4000);
      let anchor: string | null;
      let holder: string;
      if (draft.subjectType === 'VALUE') {
        if (sheet.status !== 'APPROVED') throw invalid('Sanggahan nilai hanya untuk lembar yang sudah disetujui.');
        anchor = [...sheet.rounds].reverse().find((row) => row.outcome === 'APPROVED')?.decidedAt ?? null;
        holder = sheet.assessorId;
      } else if (draft.subjectType === 'REJECTED_FINAL') {
        const round = sheet.rounds.find((row) => row.id === draft.approvalRoundId);
        if (!round || round.outcome !== 'REJECTED_FINAL') {
          throw invalid('Sanggahan tolak final wajib merujuk putaran yang berakhir Ditolak final.');
        }
        anchor = round.decidedAt;
        holder = round.approver.employeeId;
      } else {
        throw invalid('Jenis sanggahan tidak dikenal.');
      }
      const now = new Date().toISOString();
      const days = await readPerfNumber('performance.objection_deadline_days', 14);
      const open = windows.find((row) => row.reviewSheetId === sheet.id && row.newDeadlineAt > now);
      if (anchor && addDays(anchor, days) < now && !open) {
        throw new ApiError(
          'Tenggat sanggahan sudah lewat dan tidak ada jendela yang dibuka kembali untuk lembar ini.',
          422,
          'OBJECTION_DEADLINE_PASSED',
        );
      }
      claimKey(idempotencyKey);
      const first = { holderEmployeeId: holder, holderContext: 'PENILAI_ASLI' as const, assignedAt: now };
      const row: ObjectionSeed = {
        id: uuidV7(),
        reviewSheetId: sheet.id,
        approvalRoundId: draft.subjectType === 'REJECTED_FINAL' ? draft.approvalRoundId! : null,
        viaReopenWindowId: open?.id ?? null,
        subjectType: draft.subjectType,
        status: 'SUBMITTED',
        submittedByEmployeeId: actor.employeeId,
        submissionNote: note,
        submittedAt: now,
        currentHolder: first,
        holders: [first],
        answer: null,
      };
      objections = [row, ...objections];
      return toDetail(row);
    }
    const { data } = await api.post<RawObjection>(
      '/performance/objections',
      {
        review_sheet_id: draft.reviewSheetId,
        subject_type: draft.subjectType,
        approval_round_id: draft.approvalRoundId,
        submission_note: draft.submissionNote,
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return fromRawDetail(data);
  },

  /** `P5.02` — `404` di luar cakupan (anti-enumerasi). */
  async get(actor: PerfActor, id: string): Promise<ObjectionDetail> {
    if (MOCK) {
      await delay(150);
      const row = objections.find((item) => item.id === id);
      if (!row || !canRead(actor, row)) throw notFound();
      return toDetail(row);
    }
    const { data } = await api.get<RawObjection>(`/performance/objections/${id}`);
    return fromRawDetail(data);
  },

  /** `P5.03` — DM dipaksa holder = dirinya (anti-IDOR); HR boleh tanpa filter (company-wide). */
  async search(actor: PerfActor, query: ObjectionSearch): Promise<{ rows: ObjectionRow[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!canSearchObjections(actor.role)) throw new ApiError('Peran Anda tidak memiliki daftar sanggahan.', 403, 'FORBIDDEN');
      const holder = isHr(actor) ? query.holderEmployeeId : actor.employeeId;
      const dir = query.sortDirection === 'ASC' ? 1 : -1;
      const rows = objections
        .filter((row) => !holder || row.currentHolder.holderEmployeeId === holder)
        .filter((row) => !query.status || row.status === query.status)
        .sort((a, b) =>
          query.sortBy === 'status' ? a.status.localeCompare(b.status) * dir : a.submittedAt.localeCompare(b.submittedAt) * dir,
        );
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size).map(toRow), totalData: rows.length };
    }
    const { data } = await api.post<{ data: RawObjection[]; total_data: number }>('/performance/objections/search', {
      status: query.status,
      holder_employee_id: query.holderEmployeeId,
      page: query.page,
      size: query.size,
      sort_by: query.sortBy,
      sort_direction: query.sortDirection,
    });
    return { rows: data.data.map(fromRawRow), totalData: data.total_data };
  },

  /** `P5.04` — milik sendiri, identitas dari token. */
  async mine(actor: PerfActor): Promise<ObjectionRow[]> {
    if (MOCK) {
      await delay(150);
      return objections
        .filter((row) => row.submittedByEmployeeId === actor.employeeId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .map(toRow);
    }
    const { data } = await api.get<RawObjection[]>('/performance/me/objections');
    return data.map(fromRawRow);
  },

  /** `P5.05` — hanya pemikul teraktif; jawaban 1:1, status `ANSWERED` dalam transaksi yang sama. */
  async answer(actor: PerfActor, id: string, text: string, idempotencyKey: string): Promise<ObjectionAnswer> {
    if (MOCK) {
      await delay();
      const row = objections.find((item) => item.id === id);
      if (!row || !canRead(actor, row)) throw notFound();
      if (row.currentHolder.holderEmployeeId !== actor.employeeId) {
        throw new ApiError('Hanya pemikul kewajiban saat ini yang boleh menjawab.', 403, 'OBJECTION_ANSWER_FORBIDDEN');
      }
      if (row.status === 'ANSWERED') throw new ApiError('Sanggahan ini sudah dijawab.', 409, 'DUPLICATE_CONFLICT');
      const answerText = checkNote(text, 'Jawaban', 4000);
      claimKey(idempotencyKey);
      row.answer = { answeredByEmployeeId: actor.employeeId, answerText, answeredAt: new Date().toISOString() };
      row.status = 'ANSWERED';
      return row.answer;
    }
    const { data } = await api.post<{ answered_by_employee_id: string; answer_text: string; answered_at: string }>(
      `/performance/objections/${id}/answer`,
      { answer_text: text },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return { answeredByEmployeeId: data.answered_by_employee_id, answerText: data.answer_text, answeredAt: data.answered_at };
  },

  /** Setelan `performance.objection_deadline_days` — UI tidak boleh menulis 14 sebagai konstanta. */
  async deadlineDays(): Promise<number> {
    return readPerfNumber('performance.objection_deadline_days', 14);
  },

  /** `P5.06` — jangka penuh sejak dibuka, bukan perpanjangan sisa tenggat lama. Nol batas jumlah. */
  async reopen(actor: PerfActor, reviewSheetId: string, reason: string, idempotencyKey: string): Promise<ReopenWindow> {
    if (MOCK) {
      await delay();
      if (!(actor.role === 'ROLE_SUPER_ADMIN' || canReopenWindow(actor.role))) {
        throw new ApiError('Hanya HR Manager yang boleh membuka kembali jendela sanggah.', 403, 'FORBIDDEN');
      }
      const text = checkNote(reason, 'Alasan', 1000, 'REOPEN_WINDOW_REASON_REQUIRED');
      if (!sheetStore.find(reviewSheetId)) throw new ApiError('Lembar tidak ditemukan.', 404, 'NOT_FOUND');
      claimKey(idempotencyKey);
      const openedAt = new Date().toISOString();
      const row: ReopenWindow = {
        id: uuidV7(),
        reviewSheetId,
        openedByEmployeeId: actor.employeeId,
        reason: text,
        openedAt,
        newDeadlineAt: addDays(openedAt, await objectionService.deadlineDays()),
      };
      windows = [row, ...windows];
      return row;
    }
    const { data } = await api.post<RawWindow>(
      '/performance/reopen-windows',
      { review_sheet_id: reviewSheetId, reason },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return fromRawWindow(data);
  },

  /** `P5.08` — riwayat pembukaan, HR baca. */
  async reopenSearch(actor: PerfActor, query: { page: number; size: number }): Promise<{ rows: ReopenWindow[]; totalData: number }> {
    if (MOCK) {
      await delay();
      if (!isHr(actor)) throw new ApiError('Riwayat jendela sanggah hanya untuk HR.', 403, 'FORBIDDEN');
      const rows = [...windows].sort((a, b) => b.openedAt.localeCompare(a.openedAt));
      const start = (query.page - 1) * query.size;
      return { rows: rows.slice(start, start + query.size), totalData: rows.length };
    }
    const { data } = await api.post<{ data: RawWindow[]; total_data: number }>('/performance/reopen-windows/search', query);
    return { rows: data.data.map(fromRawWindow), totalData: data.total_data };
  },
};
