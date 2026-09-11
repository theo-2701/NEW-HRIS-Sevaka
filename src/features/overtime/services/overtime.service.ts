import { api } from '@/services/api';
import { OT_DAILY, OT_REQUESTS, OVERTIME_TODAY, RETRO_WINDOW_DAYS, employeeName } from '@/features/overtime/mock-data';
import { approvedHoursOn, derive, payableHours, retroWindowStart } from '@/features/overtime/rules';
import { canFileOvertime, canSearchAllOvertime, isOvertimeApprover } from '@/features/overtime/types';
import type {
  OvertimeDaily,
  OvertimeDraft,
  OvertimeRequest,
  OvertimeSession,
} from '@/features/overtime/types';

/**
 * API service Overtime (FSD-001-TIME §7 · UIC-001-TIME §8).
 *
 * Endpoint kontrak:
 *   GET/POST /overtime-requests · GET/PATCH …/{id} · …/{id}/approve · /reject
 *   PATCH …/{id}/withdraw       · GET /overtime-daily (nol endpoint tulis)
 *
 * Aturan yang ditegakkan di sini:
 *  • `submission_mode`, `overtime_category`, `requires_extra_approval_reason`
 *    diturunkan server — kiriman klien diabaikan seluruhnya.
 *  • Susulan wajib beralasan tertulis dan harus di dalam jendela susulan (422).
 *  • Satu pengajuan PENDING hidup per karyawan × tanggal (409) — dua approver
 *    tidak boleh memutuskan hari yang sama tanpa saling tahu.
 *  • Ubah hanya selagi PENDING, dan mode + pemicu plafon dihitung ulang.
 *  • `approved_hours` wajib saat Setuju, boleh **dipangkas** di bawah permintaan
 *    dan tidak pernah dinaikkan di atasnya (422).
 *  • Pemutus tidak pernah boleh jadi pengaju (403).
 *  • `CANCELLED` adalah soft-delete: barisnya tetap terbaca.
 *  • Recompute harian jalan **setelah** keputusan dan hanya bila fakta punch
 *    tanggal itu memang ada — persetujuan saja tidak melahirkan baris proyeksi.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let mockRequests: OvertimeRequest[] = OT_REQUESTS.map((row) => ({ ...row }));
let mockDaily: OvertimeDaily[] = OT_DAILY.map((row) => ({ ...row }));

export function resetOvertimeMocks() {
  mockRequests = OT_REQUESTS.map((row) => ({ ...row }));
  mockDaily = OT_DAILY.map((row) => ({ ...row }));
}

export interface RequestFilter {
  overtimeStatus?: string;
  submissionMode?: string;
  overtimeCategory?: string;
  from?: string;
  to?: string;
  employeeName?: string;
}

export interface DailyFilter {
  overtimeCategory?: string;
  from?: string;
  to?: string;
  employeeName?: string;
}

export interface DecisionResult {
  row: OvertimeRequest;
  /** `false` bila belum ada fakta punch pada tanggal itu. */
  recomputed: boolean;
}

function findRequest(id: string): OvertimeRequest {
  const row = mockRequests.find((item) => item.id === id);
  if (!row) throw new Error('404 — pengajuan lembur tidak ditemukan.');
  return row;
}

function nameMatches(employeeId: string, query?: string) {
  if (!query) return true;
  return employeeName(employeeId).toLowerCase().includes(query.toLowerCase());
}

/** Recompute fakta harian. Pagu dibaca ulang dari seluruh baris yang disetujui. */
function recomputeDaily(row: OvertimeRequest): boolean {
  const fact = mockDaily.find(
    (item) => item.employeeId === row.employeeId && item.overtimeDate === row.overtimeDate,
  );
  if (!fact) return false;
  const ceiling = approvedHoursOn(mockRequests, row.employeeId, row.overtimeDate, null);
  fact.approvedHoursTotal = ceiling;
  fact.payableHours = payableHours(fact.actualHours, ceiling);
  // Provenance diisi sekali; ia bukan sumber pagu.
  if (!fact.overtimeRequestId) fact.overtimeRequestId = row.id;
  return true;
}

export const overtimeService = {
  async requests(session: OvertimeSession, filter: RequestFilter = {}): Promise<OvertimeRequest[]> {
    if (MOCK) {
      await delay();
      return mockRequests
        .filter((row) => {
          if (!canSearchAllOvertime(session) && row.employeeId !== session.employeeId) return false;
          if (filter.overtimeStatus && row.overtimeStatus !== filter.overtimeStatus) return false;
          if (filter.submissionMode && row.submissionMode !== filter.submissionMode) return false;
          if (filter.overtimeCategory && row.overtimeCategory !== filter.overtimeCategory) return false;
          if (filter.from && row.overtimeDate < filter.from) return false;
          if (filter.to && row.overtimeDate > filter.to) return false;
          return nameMatches(row.employeeId, filter.employeeName);
        })
        .sort((a, b) => (a.overtimeDate < b.overtimeDate ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: OvertimeRequest[] }>('/overtime-requests', { params: filter });
    return data.rows;
  },

  async daily(session: OvertimeSession, filter: DailyFilter = {}): Promise<OvertimeDaily[]> {
    if (MOCK) {
      await delay();
      return mockDaily
        .filter((row) => {
          if (!canSearchAllOvertime(session) && row.employeeId !== session.employeeId) return false;
          if (filter.overtimeCategory && row.overtimeCategory !== filter.overtimeCategory) return false;
          if (filter.from && row.overtimeDate < filter.from) return false;
          if (filter.to && row.overtimeDate > filter.to) return false;
          return nameMatches(row.employeeId, filter.employeeName);
        })
        .sort((a, b) => (a.overtimeDate < b.overtimeDate ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: OvertimeDaily[] }>('/overtime-daily', { params: filter });
    return data.rows;
  },

  async save(session: OvertimeSession, draft: OvertimeDraft, editingId?: string): Promise<OvertimeRequest> {
    if (MOCK) {
      await delay(350);
      if (!canFileOvertime(session)) {
        throw new Error('403 — overtime-request:create adalah scope EMPLOYEE; lembur tidak pernah diajukan atas nama orang lain.');
      }
      const hours = Number(draft.requestedHours);
      const reason = draft.requestReason.trim();

      if (editingId) {
        const existing = findRequest(editingId);
        if (existing.overtimeStatus !== 'PENDING_APPROVAL') {
          throw new Error('422 — keputusan sudah turun; mengubah tidak lagi sah. Ajukan pengajuan baru.');
        }
      }
      if (!draft.overtimeDate) throw new Error('422 — tanggal lembur wajib diisi.');
      if (!Number.isFinite(hours) || hours <= 0) throw new Error('422 — jam yang diminta harus lebih besar dari nol.');

      const derived = derive(mockRequests, session.employeeId, draft.overtimeDate, hours, editingId ?? null);
      if (derived.submissionMode === 'RETROACTIVE') {
        if (!reason) throw new Error('422 — pengajuan susulan butuh alasan tertulis.');
        if (draft.overtimeDate < retroWindowStart()) {
          throw new Error(`422 — tanggal itu di luar jendela susulan ${RETRO_WINDOW_DAYS} hari.`);
        }
      }

      const clash = mockRequests.some(
        (row) =>
          row.employeeId === session.employeeId &&
          row.overtimeDate === draft.overtimeDate &&
          row.overtimeStatus === 'PENDING_APPROVAL' &&
          row.id !== editingId,
      );
      if (clash) {
        throw new Error('409 — sudah ada pengajuan menunggu keputusan pada tanggal itu; dua approver tidak boleh memutuskan hari yang sama tanpa saling tahu.');
      }

      if (editingId) {
        const row = findRequest(editingId);
        Object.assign(row, {
          overtimeDate: draft.overtimeDate,
          submissionMode: derived.submissionMode,
          overtimeCategory: derived.overtimeCategory,
          requestedHours: hours,
          requestReason: reason || null,
          requiresExtraApprovalReason: derived.extraApprovalReason,
        });
        return { ...row };
      }

      const row: OvertimeRequest = {
        id: `ot-${mockRequests.length + 10}`,
        employeeId: session.employeeId,
        overtimeDate: draft.overtimeDate,
        submissionMode: derived.submissionMode!,
        overtimeCategory: derived.overtimeCategory!,
        requestedHours: hours,
        approvedHours: null,
        overtimeStatus: 'PENDING_APPROVAL',
        requiresExtraApprovalReason: derived.extraApprovalReason,
        requestReason: reason || null,
        submittedAt: `${OVERTIME_TODAY}T14:00:00+07:00`,
        approvedAt: null,
        approvedBy: null,
        workflowInstanceId: 'wf-ot-new',
        isAuto: false,
        oncallAssignmentId: null,
      };
      mockRequests = [...mockRequests, row];
      return row;
    }

    const { data } = editingId
      ? await api.patch<OvertimeRequest>(`/overtime-requests/${editingId}`, draft)
      : await api.post<OvertimeRequest>('/overtime-requests', draft);
    return data;
  },

  async decide(
    session: OvertimeSession,
    id: string,
    kind: 'APPROVED' | 'REJECTED',
    approvedHours?: number,
  ): Promise<DecisionResult> {
    if (MOCK) {
      await delay(400);
      const row = findRequest(id);
      if (!isOvertimeApprover(session)) {
        throw new Error('403 — overtime-request:approve tidak dipegang peran ini.');
      }
      if (row.employeeId === session.employeeId) {
        throw new Error('403 — pemisahan tugas: pemutus tidak pernah boleh jadi pengaju.');
      }
      if (row.overtimeStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — hanya pengajuan yang masih menunggu keputusan yang bisa diputuskan.');
      }
      if (kind === 'APPROVED') {
        if (!Number.isFinite(approvedHours) || (approvedHours ?? 0) <= 0) {
          throw new Error('422 — jam yang disetujui wajib diisi saat menyetujui.');
        }
        if ((approvedHours ?? 0) > (row.requestedHours ?? 0)) {
          throw new Error('422 — jam yang disetujui boleh dipangkas di bawah permintaan, tidak pernah dinaikkan di atasnya.');
        }
      }

      row.overtimeStatus = kind;
      row.approvedHours = kind === 'APPROVED' ? approvedHours! : null;
      row.approvedAt = `${OVERTIME_TODAY}T11:00:00+07:00`;
      row.approvedBy = session.employeeId;

      const recomputed = kind === 'APPROVED' ? recomputeDaily(row) : false;
      return { row: { ...row }, recomputed };
    }

    const path = kind === 'APPROVED' ? 'approve' : 'reject';
    const { data } = await api.patch<OvertimeRequest>(`/overtime-requests/${id}/${path}`, { approvedHours });
    return { row: data, recomputed: false };
  },

  /** Soft-delete: barisnya tetap terbaca sebagai Cancelled. */
  async withdraw(session: OvertimeSession, id: string): Promise<OvertimeRequest> {
    if (MOCK) {
      await delay(250);
      const row = findRequest(id);
      if (row.employeeId !== session.employeeId) {
        throw new Error('403 — hanya pengaju yang bisa menarik pengajuannya sendiri.');
      }
      if (row.overtimeStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — keputusan sudah turun; pengajuan yang sudah diputuskan tidak bisa ditarik.');
      }
      row.overtimeStatus = 'CANCELLED';
      return { ...row };
    }
    const { data } = await api.patch<OvertimeRequest>(`/overtime-requests/${id}/withdraw`);
    return data;
  },
};
