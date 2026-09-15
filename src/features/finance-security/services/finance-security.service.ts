import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { benefitPayableSources, claimItemContext } from '@/features/benefit/services/benefit.service';
import { loanPayableSources } from '@/features/loan/services/loan.service';
import { advancePayableSources } from '@/features/cash-advance/services/cash-advance.service';
import { listMarks } from '@/features/disbursement/marks-store';
import { reasonError } from '@/features/finance-settings/rules';
import { EXPORT_LOGS, MEDICAL_LOGS } from '@/features/finance-security/mock-data';
import { appendHold, holdRows, resetHoldsStore } from '@/features/finance-security/holds-store';
import {
  EXPORT_SCOPES,
  HOLD_TARGET_TYPES,
  canAuditMedical,
  canExport,
  canManageHolds,
  canOpenMedical,
  inRange,
  toCsv,
} from '@/features/finance-security/rules';
import type {
  Actor,
  DisputeHoldRow,
  ExportInput,
  ExportLog,
  ExportLogFilter,
  ExportResult,
  ExportScope,
  HoldFilter,
  HoldTarget,
  HoldTargetType,
  MedicalAccessLog,
  MedicalAccessRow,
  MedicalDocumentAccess,
  MedicalLogFilter,
  PlaceHoldInput,
  ReleaseHoldInput,
  ReleaseHoldResult,
} from '@/features/finance-security/types';

/**
 * API service Keamanan Finance (TSD §18.3–§18.5 · UIC §7, 7 endpoint).
 *
 *  • Dispute hold: pasang & cabut Finance Officer · HR Manager · Super Admin (lintas
 *    peran). Pasang tanpa sebab; target wajib ada (404); hold aktif ganda ⇒ 409
 *    FIN_DISPUTE_HOLD_ALREADY_ACTIVE. Cabut: `is_active=true` ⇒ 422; sudah dicabut ⇒
 *    409 FIN_DISPUTE_HOLD_ALREADY_RELEASED; catatan wajib (FIN2).
 *  • Ekspor & jejaknya: Finance Officer · Super Admin (HR Manager 403); scope asing ⇒
 *    422 FIN_EXPORT_SCOPE_INVALID; jejak ditulis bersama penyusunan berkas.
 *  • Jejak medis: dibuka HR Manager · Health Data Officer · Super Admin (setiap buka
 *    menulis jejak; gagal 403 tidak menulis apa pun), ditinjau HR Manager · Super Admin.
 *
 * Koneksi antar modul: target & isi ekspor dibaca dari Benefit, Loan, Cash Advance, dan
 * penanda Pencairan; hold yang dipasang di sini langsung menggerbang mark-paid.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const TIMEZONE = 'Asia/Jakarta';
const nowIso = () => new Date().toISOString();
let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${++sequence}`;
const idempotency = () => ({ headers: { 'Idempotency-Key': crypto.randomUUID() } });

let mockExportLogs: ExportLog[] = EXPORT_LOGS.map((row) => ({ ...row, filterCriteria: { ...row.filterCriteria } }));
let mockMedicalLogs: MedicalAccessLog[] = MEDICAL_LOGS.map((row) => ({ ...row }));

export function resetFinanceSecurityMocks() {
  resetHoldsStore();
  mockExportLogs = EXPORT_LOGS.map((row) => ({ ...row, filterCriteria: { ...row.filterCriteria } }));
  mockMedicalLogs = MEDICAL_LOGS.map((row) => ({ ...row }));
}

function requireHolds(actor: Actor) {
  if (!canManageHolds(actor.role)) {
    throw new Error('403 — penandaan sengketa hanya untuk Finance Officer, HR Manager, dan Super Admin.');
  }
}

function requireExport(actor: Actor) {
  if (!canExport(actor.role)) {
    throw new Error('403 — ekspor dan jejaknya kelas CRUD finance: hanya Finance Officer dan Super Admin.');
  }
}

function targetSources() {
  return [...benefitPayableSources(), ...loanPayableSources(), ...advancePayableSources()];
}

const byNewest = <T>(stamp: (row: T) => string) => (a: T, b: T) => stamp(b).localeCompare(stamp(a));

export const financeSecurityService = {
  /** F8.07 — `POST /dispute-holds/search`, bawaan hanya aktif. */
  async holds(actor: Actor, filter: HoldFilter = {}): Promise<DisputeHoldRow[]> {
    const activeOnly = filter.activeOnly ?? true;
    if (MOCK) {
      await delay();
      requireHolds(actor);
      return holdRows()
        .filter((row) => (!activeOnly || row.isActive) && (!filter.targetType || row.targetType === filter.targetType))
        .sort(byNewest((row) => row.createdAt))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: DisputeHoldRow[] }>('/dispute-holds/search', {
      target_type: filter.targetType,
      is_active: activeOnly ? true : undefined,
    });
    return data.data;
  },

  /** Kandidat target form KM-A3 — dibaca dari tabel pengajuan modul sumber. */
  async holdTargets(actor: Actor, targetType: HoldTargetType): Promise<HoldTarget[]> {
    await delay(120);
    requireHolds(actor);
    return targetSources()
      .filter((row) => row.payableType === targetType)
      .map((row) => ({
        targetType,
        targetId: row.payableId,
        requestNo: row.requestNo,
        employeeId: row.employeeId,
        onHold: holdRows().some((hold) => hold.isActive && hold.targetType === targetType && hold.targetId === row.payableId),
      }));
  },

  /** F8.05 — `POST /dispute-holds` (201), tanpa field alasan. */
  async placeHold(actor: Actor, input: PlaceHoldInput): Promise<DisputeHoldRow> {
    if (MOCK) {
      await delay(350);
      requireHolds(actor);
      if (!HOLD_TARGET_TYPES.includes(input.targetType as HoldTargetType)) {
        throw new Error('422 — target_type wajib: BENEFIT_CLAIM, LOAN, atau CASH_ADVANCE.');
      }
      const targetType = input.targetType as HoldTargetType;
      const target = targetSources().find((row) => row.payableType === targetType && row.payableId === input.targetId);
      if (!target) throw new Error('404 — target tidak ditemukan pada company ini.');
      if (holdRows().some((row) => row.isActive && row.targetType === targetType && row.targetId === input.targetId)) {
        throw new Error(`409 FIN_DISPUTE_HOLD_ALREADY_ACTIVE — ${target.requestNo} sudah punya hold aktif.`);
      }
      const row: DisputeHoldRow = {
        id: nextId('hold'),
        targetType,
        targetId: input.targetId,
        targetRequestNo: target.requestNo,
        isActive: true,
        createdBy: actor.employeeId,
        createdAt: nowIso(),
        releasedBy: null,
        releasedAt: null,
        releasedAtTimezone: null,
        releasedReasonNote: null,
      };
      appendHold(row);
      return { ...row };
    }
    const { data } = await api.post<DisputeHoldRow>(
      '/dispute-holds',
      { target_type: input.targetType, target_id: input.targetId },
      idempotency(),
    );
    return data;
  },

  /** F8.06 — `PATCH /dispute-holds/{id}` (200), sebab wajib. */
  async releaseHold(actor: Actor, id: string, input: ReleaseHoldInput): Promise<ReleaseHoldResult> {
    const notifiesHrManager = actor.role === 'ROLE_FINANCE_OFFICER';
    if (MOCK) {
      await delay(350);
      requireHolds(actor);
      const row = holdRows().find((item) => item.id === id);
      if (!row) throw new Error('404 — penandaan sengketa tidak ditemukan.');
      if (input.isActive !== false) {
        throw new Error('422 — endpoint ini hanya mencabut; pasang ulang lewat POST /dispute-holds sebagai baris baru.');
      }
      if (!row.isActive) throw new Error('409 FIN_DISPUTE_HOLD_ALREADY_RELEASED — penandaan ini sudah dicabut.');
      const problem = reasonError(input.releasedReasonNote);
      if (problem) throw new Error(`422 — released_reason_note ${problem}.`);
      row.isActive = false;
      row.releasedBy = actor.employeeId;
      row.releasedAt = nowIso();
      row.releasedAtTimezone = TIMEZONE;
      row.releasedReasonNote = input.releasedReasonNote.trim();
      return { hold: { ...row }, notifiesHrManager };
    }
    const { data } = await api.patch<DisputeHoldRow>(`/dispute-holds/${id}`, {
      is_active: input.isActive,
      released_reason_note: input.releasedReasonNote,
    });
    return { hold: data, notifiesHrManager };
  },

  /** F8.04 — `POST /export-download-logs/search`. */
  async exportLogs(actor: Actor, filter: ExportLogFilter = {}): Promise<ExportLog[]> {
    if (MOCK) {
      await delay();
      requireExport(actor);
      return mockExportLogs
        .filter((row) => inRange(row.downloadedAt, filter.startDate, filter.endDate))
        .sort(byNewest((row) => row.downloadedAt))
        .map((row) => ({ ...row, filterCriteria: { ...row.filterCriteria } }));
    }
    const { data } = await api.post<{ data: ExportLog[] }>('/export-download-logs/search', {
      start_date: filter.startDate,
      end_date: filter.endDate,
    });
    return data.data;
  },

  /** F8.03 — `POST /exports`: berkas CSV + jejak dalam satu transaksi. */
  async runExport(actor: Actor, input: ExportInput): Promise<ExportResult> {
    const fileName = `${(input.scope || 'export').toLowerCase()}-export-${input.startDate || 'all'}_${input.endDate || 'all'}.csv`;
    if (MOCK) {
      await delay(450);
      requireExport(actor);
      if (!EXPORT_SCOPES.includes(input.scope as ExportScope)) {
        throw new Error('422 FIN_EXPORT_SCOPE_INVALID — scope tidak dikenali.');
      }
      if (input.startDate && input.endDate && input.startDate > input.endDate) {
        throw new Error('400 — start_date harus sebelum atau sama dengan end_date.');
      }
      const scope = input.scope as ExportScope;
      const within = (stamp: string) => inRange(stamp, input.startDate || undefined, input.endDate || undefined);

      let csv: string;
      let rowCount: number;
      if (scope === 'DISBURSEMENT') {
        const marks = listMarks().filter((mark) => within(mark.markedAt));
        rowCount = marks.length;
        csv = toCsv(
          ['request_no', 'payable_type', 'amount', 'payment_method', 'mark_source', 'marked_at', 'reversal_of_mark_id'],
          marks.map((mark) => [
            mark.requestNoSnapshot,
            mark.payableType,
            mark.amount,
            mark.paymentMethod,
            mark.markSource,
            mark.markedAt,
            mark.reversalOfMarkId,
          ]),
        );
      } else {
        const source =
          scope === 'BENEFIT_CLAIM' ? benefitPayableSources() : scope === 'LOAN' ? loanPayableSources() : advancePayableSources();
        const rows = source.filter((row) => within(row.submittedAt));
        rowCount = rows.length;
        csv = toCsv(
          ['request_no', 'employee_id', 'amount', 'submitted_at'],
          rows.map((row) => [row.requestNo, row.employeeId, row.amount, row.submittedAt]),
        );
      }

      const filterCriteria: Record<string, string> = {};
      if (input.startDate) filterCriteria.start_date = input.startDate;
      if (input.endDate) filterCriteria.end_date = input.endDate;
      const log: ExportLog = {
        id: nextId('exp'),
        scope,
        filterCriteria,
        rowCount,
        downloadedAt: nowIso(),
        downloadedAtTimezone: TIMEZONE,
        createdBy: actor.employeeId,
      };
      mockExportLogs = [...mockExportLogs, log];
      return { log: { ...log }, fileName, csv };
    }
    const { data } = await api.post<string>(
      '/exports',
      {
        scope: input.scope,
        filter_criteria: { start_date: input.startDate || undefined, end_date: input.endDate || undefined },
        start_date: input.startDate || undefined,
        end_date: input.endDate || undefined,
      },
      { ...idempotency(), responseType: 'text' },
    );
    return { log: null, fileName, csv: data };
  },

  /** F8.02 — `POST /medical-document-access-logs/search`. */
  async medicalAccessLogs(actor: Actor, filter: MedicalLogFilter = {}): Promise<MedicalAccessRow[]> {
    if (MOCK) {
      await delay();
      if (!canAuditMedical(actor.role)) {
        throw new Error('403 — jejak akses medis hanya ditinjau HR Manager dan Super Admin; pembuka lampiran bukan auditornya.');
      }
      return mockMedicalLogs
        .filter((row) => {
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          if (filter.claimItemId && row.claimItemId !== filter.claimItemId) return false;
          return inRange(row.accessedAt, filter.startDate, filter.endDate);
        })
        .sort(byNewest((row) => row.accessedAt))
        .map((row) => ({ ...row, claimRequestNo: claimItemContext(row.claimItemId)?.requestNo ?? null }));
    }
    const { data } = await api.post<{ data: MedicalAccessRow[] }>('/medical-document-access-logs/search', {
      employee_id: filter.employeeId,
      claim_item_id: filter.claimItemId,
      start_date: filter.startDate,
      end_date: filter.endDate,
    });
    return data.data;
  },

  /** F8.01 — `GET /benefit-claims/{claim-id}/items/{item-id}/medical-document`. */
  async openMedicalDocument(actor: Actor, claimId: string, claimItemId: string): Promise<MedicalDocumentAccess> {
    if (MOCK) {
      await delay(250);
      if (!canOpenMedical(actor.role)) {
        throw new Error('403 — isi lampiran medis hanya dibuka HR Manager, Health Data Officer, atau Super Admin.');
      }
      const context = claimItemContext(claimItemId);
      if (!context || context.claimId !== claimId || !context.containsHealthData || !context.documentId) {
        throw new Error('404 — nota ini tidak punya lampiran data kesehatan.');
      }
      const log: MedicalAccessLog = {
        id: nextId('mdl'),
        employeeId: context.employeeId,
        claimItemId,
        documentId: context.documentId,
        accessedAt: nowIso(),
        accessedAtTimezone: TIMEZONE,
        createdBy: actor.employeeId,
      };
      mockMedicalLogs = [...mockMedicalLogs, log];
      return {
        documentId: log.documentId,
        accessUrl: `mock://document-service/${log.documentId}`,
        accessedAt: log.accessedAt,
        claimItemId,
      };
    }
    const { data } = await api.get<MedicalDocumentAccess>(`/benefit-claims/${claimId}/items/${claimItemId}/medical-document`);
    return data;
  },
};
