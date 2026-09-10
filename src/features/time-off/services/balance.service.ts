import { api } from '@/services/api';
import { LEAVE_BALANCES, LEDGER } from '@/features/time-off/mock-data';
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
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

let mockLedger: LedgerEntry[] = LEDGER.map((row) => ({ ...row }));

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
    const { data } = await api.get<{ rows: LeaveBalance[] }>('/leave-balances', { params: filter });
    return data.rows;
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
    const { data } = await api.get<{ rows: LedgerEntry[] }>('/leave-balance-ledger', { params: filter });
    return data.rows;
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

    const { data } = await api.post<LedgerEntry>('/leave-balance-ledger', {
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
