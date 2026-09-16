import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import {
  FINDING_SEED,
  IMPORT_SEED,
  PARAM_TEMPLATE,
  PERIOD_SEED,
  STATE_HISTORY_SEED,
} from '@/features/salary-processing/mock-data';
import {
  MONTH_YEAR_PATTERN,
  firstPeriodMonth,
  matchesFinding,
  monthKey,
  parseAmount,
  periodLabel,
  repeatCountFor,
  runBranch,
} from '@/features/salary-processing/rules';
import type {
  Actor,
  BulkResolveResult,
  Finding,
  FindingFilter,
  HistoryImport,
  ImportDraft,
  ImportFilter,
  ImportSubmitResult,
  ParamSnapshot,
  PayrollPeriod,
  PeriodFilter,
  ResolveInput,
  RunInput,
  RunResult,
  StateChange,
} from '@/features/salary-processing/types';

/**
 * API service Proses Gaji (UIC-001-PAYROLL §2, TSD-001-PAYROLL-0.25 §15.2 / §15.7).
 *
 * Endpoint kontrak:
 *   POST /payroll/periods/run · POST …/periods/{id}/review · GET …/periods/{id}
 *   POST …/periods/search · GET …/{id}/state-history · GET …/{id}/param-snapshot
 *   POST …/periods/{period_id}/findings/search · GET …/findings/{id}
 *   PATCH …/findings/{id}/resolve · POST …/findings/bulk-resolve
 *   POST …/history-imports · POST …/{id}/verify · POST …/search · GET …/{id}
 */
const delay = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

let periods: PayrollPeriod[] = [];
let history: StateChange[] = [];
let params: Record<string, ParamSnapshot[]> = {};
let findings: Finding[] = [];
let imports: HistoryImport[] = [];
let runReplays = new Map<string, RunResult>();
let sequence = 0;

export function resetSalaryProcessingMocks() {
  periods = PERIOD_SEED.map((row) => ({ ...row }));
  history = STATE_HISTORY_SEED.map((row) => ({ ...row }));
  params = Object.fromEntries(PERIOD_SEED.map((row) => [row.id, PARAM_TEMPLATE.map((param) => ({ ...param }))]));
  findings = FINDING_SEED.map((row) => ({ ...row, detail: { ...row.detail } }));
  imports = IMPORT_SEED.map((row) => ({ ...row }));
  runReplays = new Map();
  sequence = 0;
}
resetSalaryProcessingMocks();

const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(sequence += 1)}`;

function requireOfficer(actor: Actor, action: string) {
  if (actor.role !== 'ROLE_PAYROLL_OFFICER') {
    throw new Error(`403 — ${action} hanya untuk Payroll Officer (Penjalan).`);
  }
}

function findPeriod(id: string): PayrollPeriod {
  const row = periods.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — periode tidak ditemukan.');
  return row;
}

function findFinding(id: string): Finding {
  const row = findings.find((item) => item.id === id);
  if (!row) throw new Error('404 NOT_FOUND — temuan tidak ditemukan.');
  return row;
}

const byMonthDesc = (a: PayrollPeriod, b: PayrollPeriod) =>
  monthKey(b.periodYear, b.periodMonth).localeCompare(monthKey(a.periodYear, a.periodMonth));

export const salaryProcessingService = {
  async searchPeriods(filter: PeriodFilter = {}): Promise<PayrollPeriod[]> {
    if (MOCK) {
      await delay();
      return periods
        .filter((row) => !filter.statuses?.length || filter.statuses.includes(row.status))
        .sort(byMonthDesc)
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: PayrollPeriod[] }>('/payroll/periods/search', filter);
    return data.data;
  },

  async period(id: string): Promise<PayrollPeriod> {
    if (MOCK) {
      await delay(120);
      return { ...findPeriod(id) };
    }
    const { data } = await api.get<PayrollPeriod>(`/payroll/periods/${id}`);
    return data;
  },

  async stateHistory(id: string): Promise<StateChange[]> {
    if (MOCK) {
      await delay(120);
      findPeriod(id);
      return history.filter((row) => row.periodId === id).map((row) => ({ ...row }));
    }
    const { data } = await api.get<StateChange[]>(`/payroll/periods/${id}/state-history`);
    return data;
  },

  async paramSnapshot(id: string): Promise<ParamSnapshot[]> {
    if (MOCK) {
      await delay(120);
      findPeriod(id);
      return (params[id] ?? []).map((row) => ({ ...row }));
    }
    const { data } = await api.get<ParamSnapshot[]>(`/payroll/periods/${id}/param-snapshot`);
    return data;
  },

  /**
   * `#25` — satu endpoint dua cabang: 201 Insert bila (tahun, bulan) belum ada, 200 Recalculate bila
   * sudah ada dan masih CALCULATED. Status lain ⇒ 422. Kunci idempotensi yang sama mengembalikan
   * hasil pertama tanpa menjalankan ulang.
   */
  async runPeriod(actor: Actor, input: RunInput): Promise<RunResult> {
    if (MOCK) {
      await delay(350);
      requireOfficer(actor, 'Menjalankan periode');
      const replay = runReplays.get(input.idempotencyKey);
      if (replay) return { ...replay, period: { ...findPeriod(replay.period.id) } };
      if (!Number.isInteger(input.periodMonth) || input.periodMonth < 1 || input.periodMonth > 12) {
        throw new Error('422 VALIDATION_ERROR — period_month harus 1–12.');
      }
      const { branch, existing } = runBranch(periods, input.periodYear, input.periodMonth);
      const stamp = { employeeId: actor.employeeId, at: now() };
      let result: RunResult;

      if (branch === 'BLOCKED' && existing) {
        throw new Error(
          `422 — ${periodLabel(existing)} sudah berstatus ${existing.status}; hitung ulang hanya sah selagi CALCULATED.`,
        );
      }
      if (existing) {
        existing.calculated = stamp;
        params[existing.id] = PARAM_TEMPLATE.map((param) => ({ ...param }));
        result = { period: { ...existing }, branch: 'RECALCULATE', httpStatus: 200 };
      } else {
        const row: PayrollPeriod = {
          id: `per-${monthKey(input.periodYear, input.periodMonth)}`,
          periodYear: input.periodYear,
          periodMonth: input.periodMonth,
          status: 'CALCULATED',
          calculated: stamp,
          reviewed: null,
          locked: null,
          handedOver: null,
          gate1TimeReconciliationCompletedAt: null,
          gate2FinanceDeductionPullCompletedAt: null,
          gate3ParamSnapshotComplete: true,
        };
        periods.push(row);
        params[row.id] = PARAM_TEMPLATE.map((param) => ({ ...param }));
        history.push({
          id: nextId('sc'),
          periodId: row.id,
          fromStatus: null,
          toStatus: 'CALCULATED',
          reason: null,
          createdBy: actor.employeeId,
          createdAt: stamp.at,
        });
        result = { period: { ...row }, branch: 'INSERT', httpStatus: 201 };
      }
      runReplays.set(input.idempotencyKey, result);
      return result;
    }
    const response = await api.post<PayrollPeriod>(
      '/payroll/periods/run',
      { period_year: input.periodYear, period_month: input.periodMonth },
      { headers: { 'Idempotency-Key': input.idempotencyKey } },
    );
    return {
      period: response.data,
      branch: response.status === 201 ? 'INSERT' : 'RECALCULATE',
      httpStatus: response.status === 201 ? 201 : 200,
    };
  },

  /** `#26` — transisi murni CALCULATED → REVIEWED. */
  async reviewPeriod(actor: Actor, id: string): Promise<PayrollPeriod> {
    if (MOCK) {
      await delay(300);
      requireOfficer(actor, 'Meninjau periode');
      const row = findPeriod(id);
      if (row.status !== 'CALCULATED') {
        throw new Error(`422 — ${periodLabel(row)} berstatus ${row.status}; tinjau hanya sah dari CALCULATED.`);
      }
      const stamp = { employeeId: actor.employeeId, at: now() };
      row.status = 'REVIEWED';
      row.reviewed = stamp;
      history.push({
        id: nextId('sc'),
        periodId: row.id,
        fromStatus: 'CALCULATED',
        toStatus: 'REVIEWED',
        reason: null,
        createdBy: actor.employeeId,
        createdAt: stamp.at,
      });
      return { ...row };
    }
    const { data } = await api.post<PayrollPeriod>(`/payroll/periods/${id}/review`, {});
    return data;
  },

  async searchFindings(periodId: string, filter: FindingFilter = {}): Promise<Finding[]> {
    if (MOCK) {
      await delay();
      findPeriod(periodId);
      return findings
        .filter((row) => row.periodId === periodId && matchesFinding(row, filter))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
        .map((row) => ({ ...row, detail: { ...row.detail } }));
    }
    const { data } = await api.post<{ data: Finding[] }>(`/payroll/periods/${periodId}/findings/search`, {
      finding_type: filter.findingTypes,
      final_state: filter.finalStates,
      employee_id: filter.employeeId,
    });
    return data.data;
  },

  async finding(id: string): Promise<Finding> {
    if (MOCK) {
      await delay(120);
      const row = findFinding(id);
      return { ...row, detail: { ...row.detail } };
    }
    const { data } = await api.get<Finding>(`/payroll/findings/${id}`);
    return data;
  },

  /** `#53` — tutup satu temuan. */
  async resolveFinding(actor: Actor, id: string, input: ResolveInput): Promise<Finding> {
    if (MOCK) {
      await delay(260);
      requireOfficer(actor, 'Menutup temuan');
      const row = findFinding(id);
      if (!input.finalState) throw new Error('422 VALIDATION_ERROR — final_state wajib dipilih.');
      if (row.finalState) {
        throw new Error(`409 PAY_FINDING_ALREADY_RESOLVED — ${row.id} sudah ${row.finalState}.`);
      }
      if (input.finalState === 'DITERIMA' && !input.resolutionReason.trim()) {
        throw new Error('422 PAY_FINDING_RESOLUTION_REASON_REQUIRED — alasan wajib diisi untuk Diterima.');
      }
      if (row.findingType === 'PERIOD_NOT_PICKED_UP' && input.finalState === 'DIPERBAIKI') {
        throw new Error(
          '422 PAY_FINDING_PERIOD_NOT_PICKED_UP_MANUAL_FIX — Diperbaiki hanya sah otomatis saat sistem klien mengambil periode.',
        );
      }
      row.repeatCount = repeatCountFor(findings, periods, row, input.finalState);
      row.finalState = input.finalState;
      row.resolutionReason = input.finalState === 'DITERIMA' ? input.resolutionReason.trim() : null;
      row.resolvedBy = actor.employeeId;
      row.resolvedAt = now();
      return { ...row, detail: { ...row.detail } };
    }
    const { data } = await api.patch<Finding>(`/payroll/findings/${id}/resolve`, {
      final_state: input.finalState,
      resolution_reason: input.resolutionReason || undefined,
    });
    return data;
  },

  /** `#54` — borongan hanya DITERIMA, satu periode; baris tertutup dikeluarkan ke `skipped`. */
  async bulkResolve(actor: Actor, ids: string[], resolutionReason: string): Promise<BulkResolveResult> {
    if (MOCK) {
      await delay(300);
      requireOfficer(actor, 'Menutup temuan');
      if (!ids.length) throw new Error('422 VALIDATION_ERROR — pilih minimal satu temuan.');
      const rows = ids.map(findFinding);
      if (new Set(rows.map((row) => row.periodId)).size > 1) {
        throw new Error('422 PAY_BULK_RESOLVE_CROSS_PERIOD — seluruh temuan harus dari periode yang sama.');
      }
      if (!resolutionReason.trim()) {
        throw new Error('422 PAY_FINDING_RESOLUTION_REASON_REQUIRED — alasan bersama wajib diisi.');
      }
      const result: BulkResolveResult = { resolvedCount: 0, resolvedIds: [], skipped: [] };
      const stampAt = now();
      for (const row of rows) {
        if (row.finalState) {
          result.skipped.push({ id: row.id, reason: 'ALREADY_RESOLVED' });
          continue;
        }
        row.repeatCount = repeatCountFor(findings, periods, row, 'DITERIMA');
        row.finalState = 'DITERIMA';
        row.resolutionReason = resolutionReason.trim();
        row.resolvedBy = actor.employeeId;
        row.resolvedAt = stampAt;
        result.resolvedIds.push(row.id);
      }
      result.resolvedCount = result.resolvedIds.length;
      return result;
    }
    const { data } = await api.post<BulkResolveResult>('/payroll/findings/bulk-resolve', {
      finding_ids: ids,
      final_state: 'DITERIMA',
      resolution_reason: resolutionReason,
    });
    return data;
  },

  async searchImports(filter: ImportFilter = {}): Promise<HistoryImport[]> {
    if (MOCK) {
      await delay();
      return imports
        .filter((row) => {
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          if (filter.isActive !== undefined && row.isActive !== filter.isActive) return false;
          if (filter.verified !== undefined && Boolean(row.verifiedBy) !== filter.verified) return false;
          return true;
        })
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.monthYear.localeCompare(a.monthYear))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: HistoryImport[] }>('/payroll/history-imports/search', {
      employee_id: filter.employeeId,
      is_active: filter.isActive,
      verified: filter.verified,
    });
    return data.data;
  },

  /**
   * `#56` — jalur baru atau koreksi. Bulan pada/sesudah periode gaji pertama ⇒ 422; koreksi oleh
   * `submitted_by` baris aktif ⇒ 403. Koreksi menulis baris baru dan menonaktifkan baris lama.
   */
  async submitImport(actor: Actor, draft: ImportDraft): Promise<ImportSubmitResult> {
    const gross = parseAmount(draft.grossTaxableIncomeAmount);
    const pph = parseAmount(draft.pph21WithheldAmount);
    const bpjs = parseAmount(draft.bpjsContributionAmount);
    if (MOCK) {
      await delay(280);
      requireOfficer(actor, 'Mengimpor riwayat penggajian');
      if (!draft.employeeId) throw new Error('422 VALIDATION_ERROR — karyawan wajib dipilih.');
      if (!MONTH_YEAR_PATTERN.test(draft.monthYear)) {
        throw new Error('422 VALIDATION_ERROR — format bulan harus YYYY-MM.');
      }
      if (gross === null || pph === null || bpjs === null) {
        throw new Error('422 VALIDATION_ERROR — ketiga nominal wajib berupa angka.');
      }
      const first = firstPeriodMonth(periods);
      if (first && draft.monthYear >= first) {
        throw new Error(
          `422 PAY_HISTORY_IMPORT_MONTH_ALREADY_RUN — ${draft.monthYear} jatuh pada/sesudah periode gaji pertama (${first}).`,
        );
      }
      const active = imports.find(
        (row) => row.employeeId === draft.employeeId && row.monthYear === draft.monthYear && row.isActive,
      );
      if (active && active.submittedBy === actor.employeeId) {
        throw new Error('403 PAY_MAKER_CHECKER_VIOLATION — koreksi wajib diajukan maker yang berbeda dari pengimpor asal.');
      }
      const row: HistoryImport = {
        id: nextId('HIM'),
        employeeId: draft.employeeId,
        monthYear: draft.monthYear,
        grossTaxableIncomeAmount: gross,
        pph21WithheldAmount: pph,
        bpjsContributionAmount: bpjs,
        sourceMarker: 'LEGACY_SYSTEM_IMPORT',
        isActive: true,
        submittedBy: actor.employeeId,
        submittedAt: now(),
        verifiedBy: null,
        verifiedAt: null,
      };
      if (active) active.isActive = false;
      imports.push(row);
      return { row: { ...row }, supersededId: active?.id ?? null };
    }
    const { data } = await api.post<HistoryImport & { superseded_id?: string }>('/payroll/history-imports', {
      employee_id: draft.employeeId,
      month_year: draft.monthYear,
      gross_taxable_income_amount: gross,
      pph21_withheld_amount: pph,
      bpjs_contribution_amount: bpjs,
    });
    return { row: data, supersededId: data.superseded_id ?? null };
  },

  /** `#57` — checker ≠ submitted_by (403), sekali saja (409). */
  async verifyImport(actor: Actor, id: string): Promise<HistoryImport> {
    if (MOCK) {
      await delay(240);
      const row = imports.find((item) => item.id === id);
      if (!row) throw new Error('404 NOT_FOUND — baris impor tidak ditemukan.');
      if (actor.role !== 'ROLE_HR_MANAGER') {
        throw new Error('403 — verifikasi impor riwayat milik pemeriksa (HR Manager).');
      }
      if (row.submittedBy === actor.employeeId) {
        throw new Error('403 PAY_MAKER_CHECKER_VIOLATION — pemeriksa tidak boleh memverifikasi impornya sendiri.');
      }
      if (row.verifiedBy) {
        throw new Error('409 PAY_HISTORY_IMPORT_ALREADY_VERIFIED — baris ini sudah diverifikasi.');
      }
      row.verifiedBy = actor.employeeId;
      row.verifiedAt = now();
      return { ...row };
    }
    const { data } = await api.post<HistoryImport>(`/payroll/history-imports/${id}/verify`, {});
    return data;
  },
};
