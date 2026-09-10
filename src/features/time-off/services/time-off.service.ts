import { api } from '@/services/api';
import { evaluateGates, primaryExtraReason } from '@/features/time-off/gates';
import {
  DELEGATIONS,
  LEAVE_REQUESTS,
  LEAVE_TYPES,
  MEDICAL_ACCESS,
  leaveTypeOf,
} from '@/features/time-off/mock-data';
import { LIVE_STATUS, canOpenMedical, isApprover } from '@/features/time-off/types';
import type {
  AccessPurpose,
  Delegation,
  LeaveRequest,
  LeaveType,
  MedicalAccessLog,
  RequestDraft,
  Session,
} from '@/features/time-off/types';

/**
 * API service Time Off Request.
 *
 * Endpoint kontrak (FSD-001-TIME §2 · UIC-001-TIME §3):
 *   GET    /leave-requests                       — A2 (approver) / D2 (ESS)
 *   POST   /leave-requests                       — empat gerbang submit
 *   PATCH  /leave-requests/{id}                  — hanya selagi PENDING_APPROVAL
 *   POST   /leave-requests/{id}/decision         — 200 diterima (asinkron)
 *   POST   /leave-requests/{id}/reject-sick      — hanya di dalam jendela tolak
 *   POST   /leave-requests/{id}/withdraw         — status → CANCELLED
 *   GET/POST/PATCH/DELETE /leave-delegations     — §3.2
 *   POST   /leave-requests/{id}/medical-access   — jejak dulu, isi menyusul
 *
 * Baris disaring dari klaim identitas: **layar dan endpoint yang sama**, bukan
 * layar terpisah untuk ESS.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const newId = () => crypto.randomUUID();

let mockRequests: LeaveRequest[] = LEAVE_REQUESTS.map((row) => ({ ...row }));
let mockDelegations: Delegation[] = DELEGATIONS.map((row) => ({ ...row }));
let mockAccess: MedicalAccessLog[] = MEDICAL_ACCESS.map((row) => ({ ...row }));

function findRequest(id: string): LeaveRequest {
  const row = mockRequests.find((item) => item.id === id);
  if (!row) throw new Error('Pengajuan cuti tidak ditemukan.');
  return row;
}

/** Jendela tolak cuti sakit masih terbuka? */
export function sickWindowOpen(row: LeaveRequest, now: Date): boolean {
  return row.status === 'AUTO_APPROVED' && Boolean(row.rejectDeadlineAt) && new Date(row.rejectDeadlineAt!) > now;
}

export const timeOffService = {
  async leaveTypes(): Promise<LeaveType[]> {
    if (MOCK) {
      await delay(150);
      return LEAVE_TYPES.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: LeaveType[] }>('/leave-types');
    return data.rows;
  },

  /** Approver melihat span-of-control-nya; peran lain hanya barisnya sendiri. */
  async requests(session: Session): Promise<LeaveRequest[]> {
    if (MOCK) {
      await delay(200);
      const rows = isApprover(session)
        ? mockRequests
        : mockRequests.filter((row) => row.employeeId === session.employeeId);
      return rows.map((row) => ({ ...row })).sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
    }
    const { data } = await api.get<{ rows: LeaveRequest[] }>('/leave-requests');
    return data.rows;
  },

  async delegations(): Promise<Delegation[]> {
    if (MOCK) {
      await delay(150);
      return mockDelegations.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Delegation[] }>('/leave-delegations');
    return data.rows;
  },

  async medicalAccess(): Promise<MedicalAccessLog[]> {
    if (MOCK) {
      await delay(150);
      return mockAccess.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: MedicalAccessLog[] }>('/medical-document-access');
    return data.rows;
  },

  /**
   * Membuat pengajuan. Empat gerbang dijalankan lebih dulu — kalau ada yang
   * jatuh, baris tidak pernah dibuat. Cuti sakit langsung AUTO_APPROVED dengan
   * jendela tolak yang dibekukan di sini.
   */
  async create(session: Session, draft: RequestDraft, now: Date): Promise<LeaveRequest> {
    if (MOCK) {
      await delay();
      const gate = evaluateGates({
        employeeId: session.employeeId,
        leaveTypeId: draft.leaveTypeId,
        startDate: draft.startDate,
        endDate: draft.endDate,
        daySession: draft.daySession,
        existing: mockRequests,
        now,
      });
      if (gate.errors.length > 0) throw new Error(gate.errors[0]);

      const type = leaveTypeOf(draft.leaveTypeId)!;
      const autoApproved = !type.requiresApproval;
      const deadline = new Date(`${draft.endDate}T23:59:59+07:00`);
      deadline.setDate(deadline.getDate() + 1);

      const row: LeaveRequest = {
        id: `leave-${newId().slice(0, 6)}`,
        // Pemohon diambil dari sesi, tidak pernah dari form.
        employeeId: session.employeeId,
        leaveTypeId: draft.leaveTypeId,
        daySession: draft.daySession,
        startDate: draft.startDate,
        endDate: draft.endDate,
        totalDays: gate.totalDays,
        reason: draft.reason.trim(),
        hasDoctorNote: draft.hasDoctorNote,
        status: autoApproved ? 'AUTO_APPROVED' : 'PENDING_APPROVAL',
        extraApprovalReason: primaryExtraReason(gate.extra),
        rejectDeadlineAt: autoApproved ? deadline.toISOString() : null,
        rejectReason: null,
        submittedAt: now.toISOString(),
        approvedBy: null,
        approvedAt: autoApproved ? now.toISOString() : null,
      };
      mockRequests = [row, ...mockRequests];
      return row;
    }
    const { data } = await api.post<LeaveRequest>('/leave-requests', draft);
    return data;
  },

  /** Ubah pengajuan — hanya milik sendiri dan hanya selagi PENDING_APPROVAL. */
  async update(session: Session, id: string, draft: RequestDraft, now: Date): Promise<void> {
    if (MOCK) {
      await delay();
      const row = findRequest(id);
      if (row.employeeId !== session.employeeId) throw new Error('403 — pengajuan ini bukan milik Anda.');
      if (row.status !== 'PENDING_APPROVAL') {
        throw new Error('409 — pengajuan hanya bisa diubah selagi menunggu persetujuan.');
      }
      const gate = evaluateGates({
        employeeId: session.employeeId,
        leaveTypeId: draft.leaveTypeId,
        startDate: draft.startDate,
        endDate: draft.endDate,
        daySession: draft.daySession,
        existing: mockRequests,
        selfId: id,
        now,
      });
      if (gate.errors.length > 0) throw new Error(gate.errors[0]);

      Object.assign(row, {
        leaveTypeId: draft.leaveTypeId,
        daySession: draft.daySession,
        startDate: draft.startDate,
        endDate: draft.endDate,
        reason: draft.reason.trim(),
        hasDoctorNote: draft.hasDoctorNote,
        totalDays: gate.totalDays,
        extraApprovalReason: primaryExtraReason(gate.extra),
      });
      return;
    }
    await api.patch(`/leave-requests/${id}`, draft);
  },

  /**
   * Keputusan approver. Jawaban kontraknya **200 diterima** — status final
   * ditulis setelah proses persetujuan selesai, jadi di sini pun dua tahap.
   */
  async decide(
    session: Session,
    id: string,
    decision: 'APPROVED' | 'REJECTED',
    note: string,
    now: Date,
  ): Promise<void> {
    if (MOCK) {
      await delay();
      const row = findRequest(id);
      if (row.employeeId === session.employeeId) {
        throw new Error('403 — pemisahan tugas: Anda tidak bisa memutuskan pengajuan sendiri.');
      }
      if (!isApprover(session)) throw new Error('403 — Anda tidak memegang peran approver.');
      if (row.status !== 'PENDING_APPROVAL') throw new Error('409 — pengajuan ini sudah tidak menunggu keputusan.');
      if (decision === 'REJECTED' && !note.trim()) throw new Error('422 — alasan penolakan wajib diisi.');

      row.status = decision;
      row.approvedBy = session.employeeId;
      row.approvedAt = now.toISOString();
      if (decision === 'REJECTED') row.rejectReason = note.trim();

      // Delegasi yang menempel ikut mengikuti keputusan induknya.
      mockDelegations.forEach((deleg) => {
        if (deleg.leaveRequestId === row.id && deleg.status === 'PENDING_APPROVAL') {
          deleg.status = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
        }
      });
      return;
    }
    await api.post(`/leave-requests/${id}/decision`, { decision, note });
  },

  /** Tolak cuti sakit — hanya di dalam jendela beku; di luar itu 422. */
  async rejectSick(session: Session, id: string, reason: string, now: Date): Promise<void> {
    if (MOCK) {
      await delay();
      const row = findRequest(id);
      if (!isApprover(session)) throw new Error('403 — Anda tidak memegang peran approver.');
      if (row.employeeId === session.employeeId) {
        throw new Error('403 — pemisahan tugas: Anda tidak bisa memutuskan pengajuan sendiri.');
      }
      if (!sickWindowOpen(row, now)) {
        throw new Error('422 — jendela tolak sudah tertutup; cuti sakit ini permanen.');
      }
      if (!reason.trim()) throw new Error('422 — alasan penolakan wajib diisi.');

      row.status = 'REJECTED';
      row.rejectReason = reason.trim();
      row.approvedBy = session.employeeId;
      row.approvedAt = now.toISOString();
      return;
    }
    await api.post(`/leave-requests/${id}/reject-sick`, { reason });
  },

  /** Penarikan = transisi status ke CANCELLED, bukan penghapusan baris. */
  async withdraw(session: Session, id: string, now: Date): Promise<void> {
    if (MOCK) {
      await delay();
      const row = findRequest(id);
      if (row.employeeId !== session.employeeId) throw new Error('403 — pengajuan ini bukan milik Anda.');

      const todayIso = now.toISOString().slice(0, 10);
      const withdrawable =
        row.status === 'PENDING_APPROVAL' ||
        row.status === 'AUTO_APPROVED' ||
        (row.status === 'APPROVED' && row.startDate > todayIso);
      if (!withdrawable) throw new Error('409 — pengajuan ini sudah tidak bisa ditarik.');

      row.status = 'CANCELLED';
      mockDelegations.forEach((deleg) => {
        if (deleg.leaveRequestId === row.id && deleg.status === 'PENDING_APPROVAL') deleg.status = 'CANCELLED';
      });
      return;
    }
    await api.post(`/leave-requests/${id}/withdraw`);
  },

  /**
   * Membuka surat dokter. Jejak akses ditulis **sebelum** isinya ditampilkan;
   * peran tanpa hak dijawab 403 dan tidak menghasilkan baris jejak sama sekali.
   */
  async openDoctorNote(
    session: Session,
    id: string,
    purpose: AccessPurpose,
    now: Date,
  ): Promise<MedicalAccessLog> {
    if (MOCK) {
      await delay();
      const row = findRequest(id);
      if (!canOpenMedical(session)) {
        throw new Error('403 — hanya HR Manager (health data officer) yang boleh membuka surat dokter.');
      }
      if (!row.hasDoctorNote) throw new Error('404 — pengajuan ini tidak punya surat dokter.');
      if (row.doctorNotePurged) throw new Error('410 — surat dokter sudah dimusnahkan sesuai masa simpan.');
      if (!purpose) throw new Error('422 — tujuan akses wajib dipilih.');

      const log: MedicalAccessLog = {
        id: `access-${newId().slice(0, 6)}`,
        leaveRequestId: id,
        accessedBy: session.employeeId,
        purpose,
        createdAt: now.toISOString(),
      };
      mockAccess = [log, ...mockAccess];
      return log;
    }
    const { data } = await api.post<MedicalAccessLog>(`/leave-requests/${id}/medical-access`, { purpose });
    return data;
  },

  /**
   * Delegasi persetujuan — hanya untuk pemegang peran approver, hanya atas cuti
   * hidup miliknya sendiri yang belum punya delegasi hidup (§3.2).
   */
  async saveDelegation(
    session: Session,
    payload: { id?: string; leaveRequestId: string; substituteId: string },
    now: Date,
  ): Promise<void> {
    if (MOCK) {
      await delay();
      if (!isApprover(session)) {
        throw new Error('403 — Anda tidak memegang peran approver, jadi tidak ada task yang bisa didelegasikan.');
      }
      if (session.employeeId === payload.substituteId) {
        throw new Error('422 — pengganti harus orang lain.');
      }

      if (payload.id) {
        const row = mockDelegations.find((item) => item.id === payload.id);
        if (!row) throw new Error('Delegasi tidak ditemukan.');
        if (row.status !== 'PENDING_APPROVAL') {
          throw new Error('409 — pengganti hanya bisa diganti selagi delegasi masih menunggu persetujuan.');
        }
        row.substituteId = payload.substituteId;
        return;
      }

      const leave = findRequest(payload.leaveRequestId);
      if (leave.employeeId !== session.employeeId) throw new Error('403 — cuti itu bukan milik Anda.');
      if (!LIVE_STATUS.includes(leave.status)) throw new Error('409 — cuti itu sudah tidak hidup.');
      const duplicate = mockDelegations.some(
        (row) =>
          row.leaveRequestId === payload.leaveRequestId &&
          (row.status === 'PENDING_APPROVAL' || row.status === 'APPROVED'),
      );
      if (duplicate) throw new Error('409 — cuti itu sudah punya delegasi yang hidup.');

      mockDelegations = [
        {
          id: `deleg-${newId().slice(0, 6)}`,
          leaveRequestId: payload.leaveRequestId,
          delegatorId: session.employeeId,
          substituteId: payload.substituteId,
          scope: 'ALL_APPROVALS',
          status: 'PENDING_APPROVAL',
          createdAt: now.toISOString(),
        },
        ...mockDelegations,
      ];
      return;
    }
    if (payload.id) {
      await api.patch(`/leave-delegations/${payload.id}`, { substituteId: payload.substituteId });
      return;
    }
    await api.post('/leave-delegations', payload);
  },

  async cancelDelegation(id: string): Promise<void> {
    if (MOCK) {
      await delay(200);
      const row = mockDelegations.find((item) => item.id === id);
      if (!row) throw new Error('Delegasi tidak ditemukan.');
      if (row.status !== 'PENDING_APPROVAL') {
        throw new Error('409 — delegasi hanya bisa dibatalkan selagi masih menunggu persetujuan.');
      }
      row.status = 'CANCELLED';
      return;
    }
    await api.delete(`/leave-delegations/${id}`);
  },
};
