import { api } from '@/services/api';
import { ACCRUAL_POLICIES, BLACKOUTS, LEAVE_REQUESTS, LEAVE_TYPES, LEDGER } from '@/features/time-off/mock-data';
import type {
  AccrualPolicy,
  AccrualPolicyDraft,
  Blackout,
  BlackoutDraft,
  LeaveType,
  LeaveTypeDraft,
} from '@/features/time-off/types';

/**
 * API service Time Off Settings (FSD-001-TIME §4 · UIC-001-TIME §5).
 *
 * Endpoint kontrak:
 *   GET/POST/PATCH/DELETE /leave-types
 *   GET/POST /leave-accrual-policies   · PATCH …/{id}/end
 *   GET/POST/PATCH/DELETE /leave-blackout-periods
 *
 * Aturan yang ditegakkan di sini:
 *  • Jenis statutory: kode & status statutory terkunci, tidak bisa dihapus —
 *    pensiunkan lewat flag Active.
 *  • `unpaid + deducts balance` ditolak — hari yang sama akan tercharge dua kali.
 *  • Kode unik di antara baris aktif (409).
 *  • Satu kebijakan hidup per (jenis cuti × jenis kepegawaian); rentang yang
 *    bertindih ditolak 409.
 *  • Menghentikan kebijakan hanya lewat pengisian tanggal akhir — bukan dengan
 *    mengubah rate/cap baris yang sedang berjalan.
 *  • Blackout wajib bertanggal awal DAN akhir; tanpa akhir itu larangan permanen.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,29}$/;
const EXPIRY_PATTERN = /^\d{2}-\d{2}$/;

let mockTypes: LeaveType[] = LEAVE_TYPES.map((row) => ({ ...row, allowsExtraApproval: row.id !== 'lt-sick' }));
let mockPolicies: AccrualPolicy[] = ACCRUAL_POLICIES.map((row) => ({ ...row }));
let mockBlackouts: Blackout[] = BLACKOUTS.map((row) => ({ ...row }));

function findType(id: string): LeaveType {
  const row = mockTypes.find((item) => item.id === id);
  if (!row) throw new Error('Jenis cuti tidak ditemukan.');
  return row;
}

function validateType(draft: LeaveTypeDraft, selfId?: string) {
  if (!CODE_PATTERN.test(draft.code)) {
    throw new Error('422 — kode harus 2–30 karakter huruf kapital, angka, dan tanda hubung.');
  }
  if (draft.name.trim().length < 3) throw new Error('422 — nama jenis cuti minimal 3 karakter.');
  if (!draft.isPaid && draft.affectsBalance) {
    throw new Error('422 — tidak dibayar dan memotong saldo tidak boleh menyala bersamaan; hari yang sama akan tercharge dua kali.');
  }
  if (!Number.isInteger(draft.minAdvanceDays) || draft.minAdvanceDays < 0) {
    throw new Error('422 — minimum advance days harus bilangan bulat 0 atau lebih.');
  }
  const clash = mockTypes.some((row) => row.isActive && row.code === draft.code && row.id !== selfId);
  if (clash) throw new Error('409 — kode itu sudah dipakai jenis cuti yang aktif.');
}

/** Apakah kebijakan masih hidup pada rentang tertentu? */
function overlaps(a: { from: string; until: string | null }, b: { from: string; until: string | null }) {
  const aUntil = a.until ?? '9999-12-31';
  const bUntil = b.until ?? '9999-12-31';
  return a.from <= bUntil && b.from <= aUntil;
}

export const settingsService = {
  async leaveTypes(): Promise<LeaveType[]> {
    if (MOCK) {
      await delay();
      return mockTypes.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: LeaveType[] }>('/leave-types');
    return data.rows;
  },

  async saveLeaveType(draft: LeaveTypeDraft, id?: string): Promise<LeaveType> {
    if (MOCK) {
      await delay(350);
      if (id) {
        const existing = findType(id);
        // Statutory: kode terkunci, sisanya masih boleh diubah.
        if (existing.isStatutory && draft.code !== existing.code) {
          throw new Error('422 — kode jenis cuti statutory tidak bisa diubah.');
        }
        validateType(draft, id);
        Object.assign(existing, {
          code: existing.isStatutory ? existing.code : draft.code,
          name: draft.name.trim(),
          isPaid: draft.isPaid,
          affectsBalance: draft.affectsBalance,
          requiresDocument: draft.requiresDocument,
          requiresApproval: draft.requiresApproval,
          allowsExtraApproval: draft.allowsExtraApproval,
          isActive: draft.isActive,
          minAdvanceDays: draft.minAdvanceDays,
        });
        return { ...existing };
      }

      validateType(draft);
      const row: LeaveType = {
        id: `lt-${newId().slice(0, 6)}`,
        code: draft.code,
        name: draft.name.trim(),
        // Statutory hanya lahir dari penyemaian sistem, tidak pernah dari form.
        isStatutory: false,
        isPaid: draft.isPaid,
        affectsBalance: draft.affectsBalance,
        requiresDocument: draft.requiresDocument,
        requiresApproval: draft.requiresApproval,
        allowsExtraApproval: draft.allowsExtraApproval,
        minAdvanceDays: draft.minAdvanceDays,
        isActive: draft.isActive,
      };
      mockTypes = [...mockTypes, row];
      return row;
    }

    const { data } = id
      ? await api.patch<LeaveType>(`/leave-types/${id}`, draft)
      : await api.post<LeaveType>('/leave-types', draft);
    return data;
  },

  /** Soft delete; statutory dan yang masih dirujuk ditolak. */
  async deleteLeaveType(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findType(id);
      if (row.isStatutory) {
        throw new Error('422 — jenis cuti statutory tidak bisa dihapus, bahkan secara lunak. Matikan flag Active saja.');
      }
      const referenced =
        mockPolicies.some((policy) => policy.leaveTypeId === id) ||
        LEAVE_REQUESTS.some((request) => request.leaveTypeId === id) ||
        LEDGER.some((entry) => entry.leaveTypeId === id);
      if (referenced) {
        throw new Error('409 — jenis ini masih dirujuk kebijakan, pengajuan, atau baris saldo. Matikan Active untuk memensiunkannya.');
      }
      mockTypes = mockTypes.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/leave-types/${id}`);
  },

  async accrualPolicies(): Promise<AccrualPolicy[]> {
    if (MOCK) {
      await delay();
      return mockPolicies.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: AccrualPolicy[] }>('/leave-accrual-policies');
    return data.rows;
  },

  async createAccrualPolicy(draft: AccrualPolicyDraft): Promise<AccrualPolicy> {
    if (MOCK) {
      await delay(350);
      if (!draft.leaveTypeId || !draft.effectiveFrom) {
        throw new Error('422 — jenis cuti dan tanggal mulai wajib diisi.');
      }
      if (draft.isEligible && (draft.ratePerMonth === null || draft.ratePerMonth < 0)) {
        throw new Error('422 — kebijakan yang entitled butuh rate per bulan 0 atau lebih.');
      }
      if (!draft.isEligible && draft.ratePerMonth !== null) {
        throw new Error('422 — rate harus kosong bila kelompok itu tidak entitled.');
      }
      if (draft.maxBalanceDays !== null && draft.maxBalanceDays <= 0) {
        throw new Error('422 — balance cap harus lebih besar dari nol bila diisi.');
      }
      if (draft.carryOverPolicy === 'CARRY_CAPPED') {
        if (!draft.carryOverMaxDays || !draft.carryOverExpiry || !EXPIRY_PATTERN.test(draft.carryOverExpiry)) {
          throw new Error('422 — carry capped butuh jumlah hari maksimum dan tanggal kedaluwarsa MM-DD.');
        }
      } else if (draft.carryOverMaxDays !== null || draft.carryOverExpiry) {
        throw new Error('422 — field carry-over harus kosong kecuali kebijakannya carry capped.');
      }

      const clash = mockPolicies.some(
        (policy) =>
          policy.leaveTypeId === draft.leaveTypeId &&
          policy.employmentType === draft.employmentType &&
          overlaps(
            { from: policy.effectiveFrom, until: policy.effectiveUntil },
            { from: draft.effectiveFrom, until: null },
          ),
      );
      if (clash) {
        throw new Error('409 — sudah ada kebijakan hidup untuk pasangan jenis cuti × jenis kepegawaian pada rentang yang bertindih.');
      }

      const row: AccrualPolicy = {
        id: `policy-${newId().slice(0, 6)}`,
        ...draft,
        effectiveUntil: null,
      };
      mockPolicies = [row, ...mockPolicies];
      return row;
    }
    const { data } = await api.post<AccrualPolicy>('/leave-accrual-policies', draft);
    return data;
  },

  /** Satu-satunya cara sah menghentikan kebijakan yang sedang berjalan. */
  async endAccrualPolicy(id: string, effectiveUntil: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = mockPolicies.find((item) => item.id === id);
      if (!row) throw new Error('Kebijakan tidak ditemukan.');
      if (!effectiveUntil) throw new Error('422 — pilih tanggal kebijakan ini berhenti berlaku.');
      if (effectiveUntil < row.effectiveFrom) {
        throw new Error('422 — tanggal akhir tidak boleh mendahului tanggal mulai.');
      }
      row.effectiveUntil = effectiveUntil;
      return;
    }
    await api.patch(`/leave-accrual-policies/${id}/end`, { effectiveUntil });
  },

  async blackouts(): Promise<Blackout[]> {
    if (MOCK) {
      await delay();
      return mockBlackouts.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Blackout[] }>('/leave-blackout-periods');
    return data.rows;
  },

  async saveBlackout(draft: BlackoutDraft, id?: string): Promise<Blackout> {
    if (MOCK) {
      await delay(350);
      if (draft.name.trim().length < 3) throw new Error('422 — nama periode minimal 3 karakter.');
      const reason = draft.reason.trim();
      if (reason && (reason.length < 5 || reason.length > 300)) {
        throw new Error('422 — alasan harus 5–300 karakter bila diisi.');
      }
      if (!draft.startDate || !draft.endDate) {
        throw new Error('422 — tanggal mulai dan tanggal akhir dua-duanya wajib diisi.');
      }
      if (draft.endDate < draft.startDate) {
        throw new Error('422 — tanggal akhir tidak boleh mendahului tanggal mulai.');
      }

      if (id) {
        const row = mockBlackouts.find((item) => item.id === id);
        if (!row) throw new Error('Periode blackout tidak ditemukan.');
        Object.assign(row, {
          name: draft.name.trim(),
          reason,
          startDate: draft.startDate,
          endDate: draft.endDate,
          mode: draft.mode,
        });
        return { ...row };
      }

      const row: Blackout = {
        id: `blackout-${newId().slice(0, 6)}`,
        name: draft.name.trim(),
        reason,
        startDate: draft.startDate,
        endDate: draft.endDate,
        mode: draft.mode,
      };
      mockBlackouts = [...mockBlackouts, row];
      return row;
    }

    const { data } = id
      ? await api.patch<Blackout>(`/leave-blackout-periods/${id}`, draft)
      : await api.post<Blackout>('/leave-blackout-periods', draft);
    return data;
  },

  async deleteBlackout(id: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      mockBlackouts = mockBlackouts.filter((row) => row.id !== id);
      return;
    }
    await api.delete(`/leave-blackout-periods/${id}`);
  },
};
