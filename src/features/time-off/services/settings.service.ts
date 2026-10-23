import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
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
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,29}$/;
const EXPIRY_PATTERN = /^\d{2}-\d{2}$/;

let mockTypes: LeaveType[] = LEAVE_TYPES.map((row) => ({ ...row, allowsExtraApproval: row.id !== 'lt-sick' }));
let mockPolicies: AccrualPolicy[] = ACCRUAL_POLICIES.map((row) => ({ ...row }));
let mockBlackouts: Blackout[] = BLACKOUTS.map((row) => ({ ...row }));

function findType(id: string): LeaveType {
  const row = mockTypes.find((item) => item.id === id);
  if (!row) throw new Error('Leave type not found.');
  return row;
}

function validateType(draft: LeaveTypeDraft, selfId?: string) {
  if (!CODE_PATTERN.test(draft.code)) {
    throw new Error('422 — Code must be 2–30 characters: capital letters, digits and hyphens.');
  }
  const name = draft.name.trim();
  if (!name || name.length > 150) throw new Error('422 — Leave type name is required, maximum 150 characters.');
  if (!draft.isPaid && draft.affectsBalance) {
    throw new Error('422 — Unpaid and deducts balance cannot both be on; the same day would be charged twice.');
  }
  if (!Number.isInteger(draft.minAdvanceDays) || draft.minAdvanceDays < 0) {
    throw new Error('422 — Minimum advance days must be a whole number of 0 or more.');
  }
  const clash = mockTypes.some((row) => row.isActive && row.code === draft.code && row.id !== selfId);
  if (clash) throw new Error('409 — That code is already used by an active leave type.');
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
    const { data } = await api.post<{ data: LeaveType[] }>('/leave-types/search', { filters: {} });
    return data.data;
  },

  async saveLeaveType(draft: LeaveTypeDraft, id?: string): Promise<LeaveType> {
    if (MOCK) {
      await delay(350);
      if (id) {
        const existing = findType(id);
        // leave_code immutable pasca-insert untuk SEMUA jenis (UIC-TIME §5.1.3).
        if (draft.code !== existing.code) {
          throw new Error("422 — A leave type's code can't be changed after it is created.");
        }
        validateType(draft, id);
        Object.assign(existing, {
          code: existing.code,
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
      ? await api.put<LeaveType>(`/leave-types/${id}`, draft)
      : await api.post<LeaveType>('/leave-types', draft);
    return data;
  },

  /** Soft delete; statutory dan yang masih dirujuk ditolak. */
  async deleteLeaveType(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findType(id);
      if (row.isStatutory) {
        throw new Error("422 — Statutory leave types can't be deleted, not even softly. Turn off the Active flag instead.");
      }
      const referenced =
        mockPolicies.some((policy) => policy.leaveTypeId === id) ||
        LEAVE_REQUESTS.some((request) => request.leaveTypeId === id) ||
        LEDGER.some((entry) => entry.leaveTypeId === id);
      if (referenced) {
        throw new Error('409 — This type is still referenced by policies, requests or balance rows. Turn off Active to retire it.');
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
    const { data } = await api.post<{ data: AccrualPolicy[] }>('/leave-accrual-policies/search', { filters: {} });
    return data.data;
  },

  async createAccrualPolicy(draft: AccrualPolicyDraft): Promise<AccrualPolicy> {
    if (MOCK) {
      await delay(350);
      if (!draft.leaveTypeId || !draft.effectiveFrom) {
        throw new Error('422 — Leave type and start date are required.');
      }
      if (draft.isEligible && (draft.ratePerMonth === null || draft.ratePerMonth < 0)) {
        throw new Error('422 — An entitled policy needs a monthly rate of 0 or more.');
      }
      if (!draft.isEligible && draft.ratePerMonth !== null) {
        throw new Error('422 — Rate must be empty when the group is not entitled.');
      }
      if (draft.maxBalanceDays !== null && draft.maxBalanceDays <= 0) {
        throw new Error('422 — Balance cap must be greater than zero when filled.');
      }
      if (draft.carryOverPolicy === 'CARRY_CAPPED') {
        if (!draft.carryOverMaxDays || !draft.carryOverExpiry || !EXPIRY_PATTERN.test(draft.carryOverExpiry)) {
          throw new Error('422 — Carry capped needs a maximum number of days and an MM-DD expiry date.');
        }
      } else if (draft.carryOverMaxDays !== null || draft.carryOverExpiry) {
        throw new Error('422 — Carry-over fields must be empty unless the policy is carry capped.');
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
        throw new Error('409 — A live policy already exists for this leave type × employment type pair in an overlapping range.');
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
      if (!row) throw new Error('Policy not found.');
      if (!effectiveUntil) throw new Error('422 — Choose the date this policy stops applying.');
      if (effectiveUntil < row.effectiveFrom) {
        throw new Error("422 — End date can't be earlier than the start date.");
      }
      row.effectiveUntil = effectiveUntil;
      return;
    }
    await api.put(`/leave-accrual-policies/${id}`, { effective_until: effectiveUntil });
  },

  async blackouts(): Promise<Blackout[]> {
    if (MOCK) {
      await delay();
      return mockBlackouts.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: Blackout[] }>('/leave-blackout-periods/search', { filters: {} });
    return data.data;
  },

  async saveBlackout(draft: BlackoutDraft, id?: string): Promise<Blackout> {
    if (MOCK) {
      await delay(350);
      const blackoutName = draft.name.trim();
      if (!blackoutName || blackoutName.length > 150) {
        throw new Error('422 — Period name is required, maximum 150 characters.');
      }
      const reason = draft.reason.trim();
      if (reason.length > 300) throw new Error('422 — Reason can be at most 300 characters.');
      if (!draft.startDate || !draft.endDate) {
        throw new Error('422 — Start date and end date are both required.');
      }
      if (draft.endDate < draft.startDate) {
        throw new Error("422 — End date can't be earlier than the start date.");
      }

      if (id) {
        const row = mockBlackouts.find((item) => item.id === id);
        if (!row) throw new Error('Blackout period not found.');
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
      ? await api.put<Blackout>(`/leave-blackout-periods/${id}`, draft)
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
