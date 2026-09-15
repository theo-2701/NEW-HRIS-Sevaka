import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { LEAVE_BALANCES, LEAVE_TYPES, LEDGER } from '@/features/time-off/mock-data';
import type {
  AdjustmentDraft,
  BalanceFilter,
  LeaveBalance,
  LedgerEntry,
  LedgerFilter,
  Session,
} from '@/features/time-off/types';

/**
 * API service Time Off Balance (FSD-001-TIME §3 · UIC-001-TIME §4).
 *
 * Endpoint kontrak:
 *   GET  /leave-balances                — B1 (grid saldo)
 *   GET  /leave-balance-ledger          — daftar mutasi
 *   POST /leave-balance-ledger          — HR adjustment (create-only)
 *
 * Aturan yang ditegakkan di sini:
 *  • Saldo **selalu dihitung ulang dari ledger**, tidak pernah ditulis langsung.
 *  • HR adjustment adalah satu-satunya mutasi bertangan manusia; sumbernya
 *    dikunci `HR_ADJUSTMENT` dan `refId` selalu kosong.
 *  • Delta wajib bertanda dan tidak boleh nol; alasan wajib.
 *  • Grid read-only dua arah — tidak ada update/delete baris ledger.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

let mockLedger: LedgerEntry[] = LEDGER.map((row) => ({ ...row }));

/**
 * Jalur mesin ledger (UIC-TIME §4.1): cuti disetujui menulis `LEAVE_TAKEN`,
 * penarikan/penolakan sakit menulis `LEAVE_REVERSED`. Dipanggil modul Time Off
 * Request — append-only, tidak pernah mengubah baris lama.
 */
export function appendLedgerEntry(entry: Omit<LedgerEntry, 'id'>): LedgerEntry {
  const row: LedgerEntry = { ...entry, id: `ledger-${newId().slice(0, 6)}` };
  mockLedger = [row, ...mockLedger];
  return row;
}

/**
 * Saldo = jumlah delta di ledger. Baris awal dari kontrak dipakai sebagai
 * angka pembuka (mutasi sebelum ledger ini dimulai), lalu ditambah seluruh
 * mutasi yang tercatat.
 */
function computeBalances(): LeaveBalance[] {
  const rows = LEAVE_BALANCES.map((row) => ({ ...row }));

  mockLedger
    .filter((entry) => !LEDGER.some((seed) => seed.id === entry.id))
    .forEach((entry) => {
      const existing = rows.find(
        (row) =>
          row.employeeId === entry.employeeId &&
          row.leaveTypeId === entry.leaveTypeId &&
          row.periodYear === entry.periodYear,
      );
      if (existing) {
        existing.balanceDays += entry.deltaDays;
        existing.projectedDays += entry.deltaDays;
        return;
      }
      rows.push({
        employeeId: entry.employeeId,
        leaveTypeId: entry.leaveTypeId,
        periodYear: entry.periodYear,
        balanceDays: entry.deltaDays,
        projectedDays: entry.deltaDays,
      });
    });

  return rows;
}

function matches(row: { employeeId: string; leaveTypeId: string; periodYear: number }, filter: BalanceFilter) {
  if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
  if (filter.leaveTypeId && row.leaveTypeId !== filter.leaveTypeId) return false;
  if (filter.periodYear && row.periodYear !== filter.periodYear) return false;
  return true;
}

export const balanceService = {
  async balances(filter: BalanceFilter = {}): Promise<LeaveBalance[]> {
    if (MOCK) {
      await delay();
      return computeBalances().filter((row) => matches(row, filter));
    }
    const { data } = await api.post<{ data: LeaveBalance[] }>('/leave-balances/search', { filters: filter });
    return data.data;
  },

  async ledger(filter: LedgerFilter = {}): Promise<LedgerEntry[]> {
    if (MOCK) {
      await delay();
      return mockLedger
        .filter((row) => matches(row, filter))
        .filter((row) => !filter.source || row.source === filter.source)
        .sort((a, b) => (a.mutationDate < b.mutationDate ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: LedgerEntry[] }>('/leave-balance-ledgers/search', { filters: filter });
    return data.data;
  },

  /** Menulis SATU baris baru. Tidak pernah mengubah baris yang sudah ada. */
  async createAdjustment(session: Session, draft: AdjustmentDraft): Promise<LedgerEntry> {
    if (MOCK) {
      await delay(400);
      if (!draft.employeeId || !draft.leaveTypeId || !draft.mutationDate || !draft.periodYear) {
        throw new Error('422 — karyawan, jenis cuti, tahun hak, dan tanggal mutasi wajib diisi.');
      }
      if (draft.periodYear < 2000 || draft.periodYear > 2999) {
        throw new Error('422 — tahun hak harus di antara 2000 dan 2999.');
      }
      if (!Number.isFinite(draft.deltaDays) || draft.deltaDays === 0) {
        throw new Error('422 — delta wajib diisi dan tidak boleh nol.');
      }
      if (!draft.reason.trim()) {
        throw new Error('422 — alasan wajib diisi untuk penyesuaian manual.');
      }

      const entry: LedgerEntry = {
        id: `ledger-${newId().slice(0, 6)}`,
        employeeId: draft.employeeId,
        leaveTypeId: draft.leaveTypeId,
        periodYear: draft.periodYear,
        mutationDate: draft.mutationDate,
        deltaDays: draft.deltaDays,
        // Dikunci server: jalur form hanya bisa melahirkan HR adjustment.
        source: 'HR_ADJUSTMENT',
        refId: null,
        reason: draft.reason.trim(),
        createdAt: new Date().toISOString(),
        createdBy: session.employeeId,
      };
      mockLedger = [entry, ...mockLedger];
      return entry;
    }

    const { data } = await api.post<LedgerEntry>('/leave-balance-ledgers', {
      employeeId: draft.employeeId,
      leaveTypeId: draft.leaveTypeId,
      periodYear: draft.periodYear,
      mutationDate: draft.mutationDate,
      deltaDays: draft.deltaDays,
      reason: draft.reason,
    });
    return data;
  },

  /** Tahun yang punya data — dipakai isi filter tahun. */
  async years(): Promise<number[]> {
    if (MOCK) {
      await delay(100);
      const set = new Set<number>([
        ...computeBalances().map((row) => row.periodYear),
        ...mockLedger.map((row) => row.periodYear),
      ]);
      return [...set].sort((a, b) => b - a);
    }
    const { data } = await api.get<{ years: number[] }>('/leave-balances/years');
    return data.years;
  },
};

export interface LeaveBalanceMeSummary {
  leaveCode: string;
  periodYear: number;
  /** `null` bila pemanggil belum punya baris saldo cuti tahunan. */
  balanceDays: number | null;
}

/** #95 `GET /leave-balances/me-summary` — saldo cuti tahunan saja (`leave_code='CUTI-TAHUNAN'`). */
export async function leaveBalanceMeSummary(employeeId: string, periodYear: number): Promise<LeaveBalanceMeSummary> {
  if (MOCK) {
    await delay(150);
    const annual = LEAVE_TYPES.find((row) => row.code === 'CUTI-TAHUNAN');
    const row = computeBalances().find(
      (item) => item.employeeId === employeeId && item.leaveTypeId === annual?.id && item.periodYear === periodYear,
    );
    return { leaveCode: 'CUTI-TAHUNAN', periodYear, balanceDays: row?.balanceDays ?? null };
  }
  const { data } = await api.get<LeaveBalanceMeSummary>('/leave-balances/me-summary');
  return data;
}
