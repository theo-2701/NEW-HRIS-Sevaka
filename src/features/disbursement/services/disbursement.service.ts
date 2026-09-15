import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { listHolds } from '@/features/finance-security/holds-store';
import { benefitPayableSources } from '@/features/benefit/services/benefit.service';
import { loanPayableSources, loanPayrollConfirmed } from '@/features/loan/services/loan.service';
import {
  advancePayableSources,
  markAdvanceDisbursed,
  settleShortfallByDisbursement,
  shortfallPayableSources,
} from '@/features/cash-advance/services/cash-advance.service';
import { CLEARANCES } from '@/features/disbursement/mock-data';
import { appendMarks, listMarks, resetMarks } from '@/features/disbursement/marks-store';
import {
  PAYMENT_METHODS,
  REQUEST_NO_FILTER_PATTERN,
  buildPayableRows,
  canDeclareSettled,
  canMark,
  canRead,
  filterClearances,
  filterPayables,
  keyOf,
  noteError,
  reversedIds,
  sortPayables,
} from '@/features/disbursement/rules';
import type {
  Actor,
  ClearanceFilter,
  DisbursementMark,
  MarkPaidInput,
  MarkPaidResult,
  MarkPreview,
  OutstandingClearance,
  PayableDetail,
  PayableFilter,
  PayableKey,
  PayableRow,
  PayableSource,
  PaymentMethod,
  UnresolvedItem,
} from '@/features/disbursement/types';

/**
 * API service Pencairan & Piutang (TSD §14.5 · UIC §6.2 — 8 endpoint UI manusia).
 * Empat pintu integrasi mesin (UIC §6.3) server-to-server, nol UI, tidak dimock.
 *
 * Gerbang yang ditegakkan:
 *  • search/detail: Finance Officer, HR Manager (R), Super Admin — selain itu 403.
 *  • preview/mark-paid/reverse: Finance Officer & Super Admin — HR Manager 403.
 *  • mark-paid (TSD §3.3): sengketa aktif ⇒ 422 FIN_DISPUTE_HOLD_ACTIVE;
 *    WITH_PAYROLL hanya untuk LOAN yang potongannya sudah dikonfirmasi payroll ⇒
 *    422 FIN_PAYROLL_CONFIRMATION_REQUIRED; catatan wajib; satu metode per
 *    tindakan; atomik — satu baris gagal ⇒ tidak ada yang ditulis.
 *  • reverse (§3.5): target sudah dibalik ⇒ 409 FIN_REVERSAL_TARGET_ALREADY_REVERSED;
 *    pembalik mewarisi payable_type/payable_id; catatan wajib.
 *  • declare-settled (§3.4): Finance Officer & HR Manager; bukan OUTSTANDING ⇒
 *    409 FIN_OUTSTANDING_ALREADY_RESOLVED; catatan kosong ⇒ 422.
 *
 * Koneksi antar modul (tanpa HTTP): daftar diturunkan dari tabel sumber Benefit,
 * Loan, Cash Advance; menandai CASH_ADVANCE mengisi `disbursementMarked` uang muka
 * (menutup jendela bantahan), menandai CASH_ADVANCE_SHORTFALL mentransisikan
 * selisih APPROVED → SETTLED dalam tindakan yang sama (§3.3 poin 4).
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const TIMEZONE = 'Asia/Jakarta';
const nowIso = () => new Date().toISOString();
const idempotency = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } });

const cloneClearance = (row: OutstandingClearance): OutstandingClearance => ({ ...row });

let mockClearances: OutstandingClearance[] = CLEARANCES.map(cloneClearance);
let actionSequence = 0;

export function resetDisbursementMocks() {
  resetMarks();
  mockClearances = CLEARANCES.map(cloneClearance);
  actionSequence = 0;
}

function payableSources(): PayableSource[] {
  return [...benefitPayableSources(), ...loanPayableSources(), ...advancePayableSources(), ...shortfallPayableSources()];
}

function currentRows(): PayableRow[] {
  return buildPayableRows(payableSources(), listMarks());
}

function requireRead(actor: Actor) {
  if (!canRead(actor.role)) {
    throw new Error('403 — Pencairan & Piutang hanya untuk Finance Officer, HR Manager, dan Super Admin.');
  }
}

function requireMark(actor: Actor) {
  if (!canMark(actor.role)) {
    throw new Error(
      actor.role === 'ROLE_HR_MANAGER'
        ? '403 — HR Manager hanya membaca daftar Pencairan; penandaan milik Finance Officer.'
        : '403 — penandaan hanya untuk Finance Officer atau Super Admin.',
    );
  }
}

/** `map_finance_dispute_hold` dibaca read-only (tabel milik FT8). */
function holdActive(key: PayableKey) {
  return listHolds().some((hold) => hold.isActive && hold.targetType === key.payableType && hold.targetId === key.payableId);
}

function nextActionId(actor: Actor) {
  actionSequence += 1;
  return `act-${actor.employeeId.replace('emp-', '')}-${String(actionSequence).padStart(3, '0')}`;
}

/** Gerbang kelayakan §3.1–§3.3 per baris; duplikat dalam satu payload digabung. */
function previewOf(items: PayableKey[]): MarkPreview {
  const sources = payableSources();
  const rows = currentRows();
  const seen = new Set<string>();
  const resolvedItems: PayableRow[] = [];
  const unresolvedItems: UnresolvedItem[] = [];

  items.forEach((item) => {
    const key = keyOf(item);
    if (seen.has(key)) return;
    seen.add(key);
    const source = sources.find((row) => keyOf(row) === key);
    const row = rows.find((candidate) => keyOf(candidate) === key);
    const reject = (rejectReason: string) =>
      unresolvedItems.push({ payableType: item.payableType, payableId: item.payableId, rejectReason });

    if (!source) reject('Payable tidak dikenal');
    else if (row?.markStatus === 'MARKED') reject('Sudah ditandai — tanda aktif belum dibalik');
    else if (!source.eligible || !row) reject('Status sumber tidak layak (bukan APPROVED)');
    else if (holdActive(item)) reject('FIN_DISPUTE_HOLD_ACTIVE');
    else resolvedItems.push(row);
  });

  return {
    resolvedItems,
    unresolvedItems,
    totalCount: resolvedItems.length,
    totalAmount: resolvedItems.reduce((sum, row) => sum + row.amount, 0),
  };
}

export const disbursementService = {
  /** 1 — `POST /disbursements/search`, bawaan `mark_status=UNMARKED`. */
  async search(actor: Actor, filter: PayableFilter = {}): Promise<PayableRow[]> {
    if (MOCK) {
      await delay();
      requireRead(actor);
      if (filter.requestNo && !REQUEST_NO_FILTER_PATTERN.test(filter.requestNo.trim())) {
        throw new Error('400 — request_no hanya menerima huruf, angka, dan tanda hubung.');
      }
      if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
        throw new Error('400 — start_date harus sebelum atau sama dengan end_date.');
      }
      return sortPayables(filterPayables(currentRows(), filter), filter.sortBy, filter.sortDirection);
    }
    const { data } = await api.post<{ data: PayableRow[] }>('/disbursements/search', {
      mark_status: filter.markStatus ?? 'UNMARKED',
      payable_types: filter.payableTypes,
      request_no: filter.requestNo,
      employee_id: filter.employeeId,
      start_date: filter.startDate,
      end_date: filter.endDate,
      sort_by: filter.sortBy,
      sort_direction: filter.sortDirection,
    });
    return data.data;
  },

  /** 2 — `GET /disbursements/{id}`; mock menyertakan seluruh jejak tanda payable itu. */
  async detail(actor: Actor, key: PayableKey): Promise<PayableDetail> {
    if (MOCK) {
      await delay(150);
      requireRead(actor);
      const row = currentRows().find((item) => keyOf(item) === keyOf(key));
      if (!row) throw new Error('404 — payable tidak ditemukan di daftar Pencairan.');
      const marks = listMarks();
      const history = marks
        .filter((mark) => keyOf(mark) === keyOf(key))
        .map((mark) => ({ ...mark, reversedBy: marks.find((other) => other.reversalOfMarkId === mark.id)?.id ?? null }));
      return { ...row, history };
    }
    const row = (await disbursementService.search(actor, { markStatus: 'ALL' })).find((item) => keyOf(item) === keyOf(key));
    if (!row) throw new Error('404 — payable tidak ditemukan di daftar Pencairan.');
    if (!row.mark) return { ...row, history: [] };
    const { data } = await api.get<PayableDetail['history'][number]>(`/disbursements/${row.mark.disbursementMarkId}`);
    return { ...row, history: [data] };
  },

  /** 3 — `POST /disbursements/mark-paid/preview`, nol tulis. */
  async preview(actor: Actor, items: PayableKey[]): Promise<MarkPreview> {
    if (MOCK) {
      await delay(200);
      requireMark(actor);
      if (!items.length) throw new Error('422 — items wajib berisi minimal satu payable.');
      return previewOf(items);
    }
    const { data } = await api.post<MarkPreview>('/disbursements/mark-paid/preview', {
      items: items.map((item) => ({ payable_type: item.payableType, payable_id: item.payableId })),
    });
    return data;
  },

  /** 4 — `POST /disbursements/mark-paid` (201), satu transaksi atomik. */
  async markPaid(actor: Actor, input: MarkPaidInput): Promise<MarkPaidResult> {
    if (MOCK) {
      await delay(400);
      requireMark(actor);
      if (!input.items.length) throw new Error('422 — items wajib berisi minimal satu payable.');
      if (!PAYMENT_METHODS.includes(input.paymentMethod as PaymentMethod)) {
        throw new Error('422 — payment_method wajib dipilih: satu nilai untuk seluruh baris dalam tindakan ini.');
      }
      const method = input.paymentMethod as PaymentMethod;
      const noteProblem = noteError(input.reasonNote);
      if (noteProblem) throw new Error(`422 — reason_note ${noteProblem}; penandaan manual selalu bersebab.`);

      const preview = previewOf(input.items);
      const sources = payableSources();
      const requestNoOf = (key: PayableKey) => sources.find((row) => keyOf(row) === keyOf(key))?.requestNo ?? key.payableId;
      const held = preview.unresolvedItems.find((item) => item.rejectReason === 'FIN_DISPUTE_HOLD_ACTIVE');
      if (held) {
        throw new Error(
          `422 FIN_DISPUTE_HOLD_ACTIVE — ${requestNoOf(held)} sedang disengketakan; seluruh tindakan dibatalkan.`,
        );
      }
      if (preview.unresolvedItems.length) {
        throw new Error(
          `422 — ${preview.unresolvedItems.map(requestNoOf).join(', ')} gagal gerbang kelayakan; tindakan atomik, tidak ada yang ditandai.`,
        );
      }
      if (method === 'WITH_PAYROLL') {
        const blocked = preview.resolvedItems.find(
          (row) => row.payableType !== 'LOAN' || !loanPayrollConfirmed(row.payableId),
        );
        if (blocked) {
          throw new Error(
            `422 FIN_PAYROLL_CONFIRMATION_REQUIRED — ${blocked.requestNo}: WITH_PAYROLL hanya sah untuk pinjaman yang potongannya sudah dikonfirmasi payroll.`,
          );
        }
      }

      const actionId = nextActionId(actor);
      const markedAt = nowIso();
      const existing = listMarks();
      const rows: DisbursementMark[] = preview.resolvedItems.map((row) => ({
        id: `mark-${row.payableId}-${existing.filter((mark) => mark.payableId === row.payableId).length + 1}`,
        actionId,
        payableType: row.payableType,
        payableId: row.payableId,
        requestNoSnapshot: row.requestNo,
        amount: row.amount,
        paymentMethod: method,
        markSource: 'MANUAL',
        markedAt,
        markedAtTimezone: TIMEZONE,
        actualPaidAt: null,
        reasonNote: input.reasonNote.trim(),
        reversalOfMarkId: null,
        createdBy: actor.employeeId,
      }));
      appendMarks(rows);
      rows.forEach((row) => {
        if (row.payableType === 'CASH_ADVANCE') markAdvanceDisbursed(row.payableId, true);
        if (row.payableType === 'CASH_ADVANCE_SHORTFALL') settleShortfallByDisbursement(row.payableId);
      });

      return {
        actionId,
        markedCount: rows.length,
        totalAmount: preview.totalAmount,
        marks: rows.map((row) => ({ disbursementMarkId: row.id, payableType: row.payableType, payableId: row.payableId })),
      };
    }
    const { data } = await api.post<MarkPaidResult>(
      '/disbursements/mark-paid',
      {
        items: input.items.map((item) => ({ payable_type: item.payableType, payable_id: item.payableId })),
        payment_method: input.paymentMethod,
        reason_note: input.reasonNote,
      },
      idempotency(),
    );
    return data;
  },

  /** 5 — `POST /disbursements/{id}/reverse` (201), baris lawan-arah. */
  async reverseMark(actor: Actor, markId: string, reasonNote: string): Promise<DisbursementMark> {
    if (MOCK) {
      await delay(350);
      requireMark(actor);
      const marks = listMarks();
      const target = marks.find((row) => row.id === markId);
      if (!target) throw new Error('404 — tanda pencairan tidak ditemukan.');
      if (target.reversalOfMarkId) {
        throw new Error('422 — baris pembalik tidak dapat dibalik lagi; rantai pembatalan dicegah.');
      }
      if (reversedIds(marks).has(target.id)) {
        throw new Error('409 FIN_REVERSAL_TARGET_ALREADY_REVERSED — tanda ini sudah pernah dibalik.');
      }
      const noteProblem = noteError(reasonNote);
      if (noteProblem) throw new Error(`422 — reason_note ${noteProblem}.`);

      const row: DisbursementMark = {
        ...target,
        id: `${target.id}-rev`,
        actionId: nextActionId(actor),
        markSource: 'MANUAL',
        markedAt: nowIso(),
        markedAtTimezone: TIMEZONE,
        actualPaidAt: null,
        reasonNote: reasonNote.trim(),
        reversalOfMarkId: target.id,
        createdBy: actor.employeeId,
      };
      appendMarks([row]);
      if (target.payableType === 'CASH_ADVANCE') markAdvanceDisbursed(target.payableId, false);
      return { ...row };
    }
    const { data } = await api.post<DisbursementMark>(
      `/disbursements/${markId}/reverse`,
      { reason_note: reasonNote },
      idempotency(),
    );
    return data;
  },

  /** 6 — `POST /outstanding-clearances/search`. */
  async clearances(actor: Actor, filter: ClearanceFilter = {}): Promise<OutstandingClearance[]> {
    if (MOCK) {
      await delay();
      requireRead(actor);
      if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) {
        throw new Error('400 — start_date harus sebelum atau sama dengan end_date.');
      }
      return filterClearances(mockClearances, filter).map(cloneClearance);
    }
    const { data } = await api.post<{ data: OutstandingClearance[] }>('/outstanding-clearances/search', {
      status: filter.status,
      employee_id: filter.employeeId,
      start_date: filter.startDate,
      end_date: filter.endDate,
      sort_by: filter.sortBy,
      sort_direction: filter.sortDirection,
    });
    return data.data;
  },

  /** 7 — `GET /outstanding-clearances/{id}`. */
  async clearance(actor: Actor, id: string): Promise<OutstandingClearance> {
    if (MOCK) {
      await delay(150);
      requireRead(actor);
      const row = mockClearances.find((item) => item.id === id);
      if (!row) throw new Error('404 — status tanggungan tidak ditemukan.');
      return cloneClearance(row);
    }
    const { data } = await api.get<OutstandingClearance>(`/outstanding-clearances/${id}`);
    return data;
  },

  /** 8 — `POST /outstanding-clearances/{id}/declare-settled` (200), tanpa Idempotency-Key. */
  async declareSettled(actor: Actor, id: string, settledReasonNote: string): Promise<OutstandingClearance> {
    if (MOCK) {
      await delay(350);
      if (!canDeclareSettled(actor.role)) {
        throw new Error('403 — pernyataan tuntas hanya untuk Finance Officer dan HR Manager (FD-112).');
      }
      const row = mockClearances.find((item) => item.id === id);
      if (!row) throw new Error('404 — status tanggungan tidak ditemukan.');
      if (row.status !== 'OUTSTANDING') {
        throw new Error(`409 FIN_OUTSTANDING_ALREADY_RESOLVED — baris ini sudah ${row.status}; status akhir terminal.`);
      }
      const noteProblem = noteError(settledReasonNote);
      if (noteProblem) throw new Error(`422 — settled_reason_note ${noteProblem}.`);
      row.status = 'DECLARED_SETTLED';
      row.settledReasonNote = settledReasonNote.trim();
      row.resolvedAt = nowIso();
      row.resolvedAtTimezone = TIMEZONE;
      row.updatedBy = actor.employeeId;
      return cloneClearance(row);
    }
    const { data } = await api.post<OutstandingClearance>(`/outstanding-clearances/${id}/declare-settled`, {
      settled_reason_note: settledReasonNote,
    });
    return data;
  },
};
