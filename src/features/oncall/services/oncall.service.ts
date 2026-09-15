import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { ONCALL, employeeName } from '@/features/oncall/mock-data';
import type { OncallSession } from '@/features/oncall/mock-data';
import { deriveOncall, overlapping } from '@/features/oncall/rules';
import type { OncallAssignment, OncallDraft } from '@/features/oncall/types';

/**
 * API service On Call Schedule (FSD-001-TIME §10 · UIC-001-TIME §11).
 *
 * Endpoint kontrak:
 *   GET/POST/PATCH /oncall-assignments · PATCH …/{id}/approve · /reject · /cancel
 *
 * Aturan yang ditegakkan di sini:
 *  • Jendela wajib berakhir setelah ia mulai (422) dan pagu per call-out harus
 *    lebih besar dari nol (422).
 *  • Satu karyawan tidak boleh punya dua jendela hidup yang rentangnya
 *    bertindih (409) — PENDING_APPROVAL, SCHEDULED, dan ACTIVE sama-sama hidup.
 *  • `requires_extra_approval_reason` diturunkan server dari pagu; ia
 *    **menaikkan** jendela ke lapis approval berikutnya, tidak pernah menolak.
 *  • Ubah hanya sah selagi jendela masih menunggu keputusan (422).
 *  • Pembuat tidak pernah memutuskan jendelanya sendiri (403).
 *  • Menyetujui memindahkan status ke SCHEDULED — sejak itu jendela
 *    mengotorisasi call-out sampai setinggi pagunya. Menolak → REJECTED, dan
 *    jendela itu tidak akan pernah menerbitkan call-out.
 *  • Membatalkan menyisakan barisnya di catatan, bukan menghilangkannya.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let mockRows: OncallAssignment[] = ONCALL.map((row) => ({ ...row }));

export function resetOncallMocks() {
  mockRows = ONCALL.map((row) => ({ ...row }));
}

export interface OncallFilter {
  oncallStatus?: string;
  from?: string;
  to?: string;
  employeeName?: string;
}

function findRow(id: string): OncallAssignment {
  const row = mockRows.find((item) => item.id === id);
  if (!row) throw new Error('404 — jendela siaga tidak ditemukan.');
  return row;
}

export const oncallService = {
  async list(filter: OncallFilter = {}): Promise<OncallAssignment[]> {
    if (MOCK) {
      await delay();
      return mockRows
        .filter((row) => {
          if (filter.oncallStatus && row.oncallStatus !== filter.oncallStatus) return false;
          if (filter.from && row.standbyStartAt.slice(0, 10) < filter.from) return false;
          if (filter.to && row.standbyStartAt.slice(0, 10) > filter.to) return false;
          if (
            filter.employeeName &&
            !employeeName(row.employeeId).toLowerCase().includes(filter.employeeName.toLowerCase())
          ) {
            return false;
          }
          return true;
        })
        .sort((a, b) => (a.standbyStartAt < b.standbyStartAt ? -1 : 1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: OncallAssignment[] }>('/on-call-assignments/search', { filters: filter });
    return data.data;
  },

  async save(session: OncallSession, draft: OncallDraft, id?: string): Promise<OncallAssignment> {
    if (MOCK) {
      await delay(350);
      const { startAt, endAt, extraReason } = deriveOncall(draft);
      const cap = Number(draft.maxCalloutHours);

      if (!draft.employeeId || !startAt || !endAt) {
        throw new Error('422 — karyawan dan kedua ujung jendela siaga wajib diisi.');
      }
      if (new Date(endAt) <= new Date(startAt)) {
        throw new Error('422 — jendela harus berakhir setelah ia mulai.');
      }
      if (!Number.isFinite(cap) || cap <= 0) {
        throw new Error('422 — pagu per call-out harus lebih besar dari nol.');
      }

      if (id) {
        const existing = findRow(id);
        if (existing.oncallStatus !== 'PENDING_APPROVAL') {
          throw new Error('422 — jendela hanya bisa diubah selagi masih menunggu keputusan.');
        }
      }

      const clash = overlapping(mockRows, draft.employeeId, startAt, endAt, id ?? null);
      if (clash) {
        throw new Error('409 — karyawan ini sudah punya jendela siaga hidup yang bertindih dengan rentang itu.');
      }

      const patch = {
        standbyStartAt: startAt,
        standbyEndAt: endAt,
        maxCalloutHours: cap,
        assignmentNote: draft.assignmentNote.trim(),
        requiresExtraApprovalReason: extraReason,
      };

      if (id) {
        const row = findRow(id);
        Object.assign(row, patch);
        return { ...row };
      }

      const row: OncallAssignment = {
        id: `oncall-${mockRows.length + 10}`,
        employeeId: draft.employeeId,
        // Status hanya bergerak lewat keputusan approver atau pembatalan.
        oncallStatus: 'PENDING_APPROVAL',
        createdBy: session.employeeId,
        approvedBy: null,
        ...patch,
      };
      mockRows = [...mockRows, row];
      return { ...row };
    }

    const { data } = id
      ? await api.put<OncallAssignment>(`/on-call-assignments/${id}`, draft)
      : await api.post<OncallAssignment>('/on-call-assignments', draft);
    return data;
  },

  async decide(session: OncallSession, id: string, kind: 'APPROVED' | 'REJECTED'): Promise<OncallAssignment> {
    if (MOCK) {
      await delay(400);
      const row = findRow(id);
      // UIC-TIME §11.6: SoD (penyusun = pemutus) dijawab 422, bukan 403.
      if (row.createdBy === session.employeeId) {
        throw new Error('422 — pemisahan tugas: pembuat tidak pernah memutuskan jendelanya sendiri.');
      }
      if (row.oncallStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — hanya jendela yang masih menunggu keputusan yang bisa diputuskan.');
      }
      // K9: keputusan diterima; status ditulis saat workflow selesai.
      return { ...row };
    }
    const { data } = await api.post<OncallAssignment>(`/on-call-assignments/${id}/approval`, {
      decision: kind === 'APPROVED' ? 'SCHEDULED' : 'REJECTED',
    });
    return data;
  },

  /** Mock saja — pengganti konsumsi `workflow.process.completed` roster siaga. */
  async completeOncallWorkflow(
    session: OncallSession,
    id: string,
    kind: 'APPROVED' | 'REJECTED',
  ): Promise<OncallAssignment> {
    await delay(150);
    const row = findRow(id);
    row.oncallStatus = kind === 'APPROVED' ? 'SCHEDULED' : 'REJECTED';
    row.approvedBy = session.employeeId;
    return { ...row };
  },

  /** Barisnya tetap tinggal di catatan, bukan menghilang. */
  async cancel(id: string): Promise<OncallAssignment> {
    if (MOCK) {
      await delay(250);
      const row = findRow(id);
      if (row.oncallStatus !== 'PENDING_APPROVAL' && row.oncallStatus !== 'SCHEDULED') {
        throw new Error('422 — hanya jendela yang menunggu keputusan atau sudah terjadwal yang bisa dibatalkan.');
      }
      row.oncallStatus = 'CANCELLED';
      return { ...row };
    }
    const { data } = await api.delete<OncallAssignment>(`/on-call-assignments/${id}`);
    return data;
  },
};
