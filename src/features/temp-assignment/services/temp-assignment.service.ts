import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { SEATS, TA_TODAY, TEMP_ASSIGNMENTS } from '@/features/temp-assignment/mock-data';
import { OPEN_STATUSES, allowedActions } from '@/features/temp-assignment/types';
import type { Seat, TaAction, TaDraft, TaSession, TaStatus, TempAssignment } from '@/features/temp-assignment/types';

/**
 * Endpoint kontrak (TSD-001-EMPLOYEE 0.212 §7.18):
 *   POST /temporary-assignments (Idempotency-Key) · POST …/search · GET …/{id}
 *   POST …/{id}/approve · /reject · /cancel · /return · /extend
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let rows: TempAssignment[] = TEMP_ASSIGNMENTS.map((row) => ({ ...row }));
let seats: Seat[] = SEATS.map((row) => ({ ...row }));

export function resetTempAssignmentMocks() {
  rows = TEMP_ASSIGNMENTS.map((row) => ({ ...row }));
  seats = SEATS.map((row) => ({ ...row }));
}

export interface TaFilter {
  status?: TaStatus;
  keyword?: string;
}

function find(id: string): TempAssignment {
  const row = rows.find((item) => item.id === id);
  if (!row) throw new Error('404 EMP-NFD-612 — penugasan tidak ditemukan.');
  return row;
}

function guard(row: TempAssignment, session: TaSession, action: TaAction) {
  if (allowedActions(row, session).includes(action)) return;
  if ((action === 'approve' || action === 'reject') && row.createdByEmployeeId === session.employeeId) {
    throw new Error('409 — pembuat pengajuan tidak bisa memutuskannya sendiri.');
  }
  if (session.role !== 'HR_MANAGER' && action !== 'cancel') throw new Error('403 — aksi ini milik HR Manager.');
  throw new Error(`422 — aksi tidak sah untuk status ${row.status}.`);
}

/** Aktivasi: kursi penugasan diduduki sebagai tambahan (kursi asal tetap). */
function activate(row: TempAssignment) {
  const seat = seats.find((item) => item.id === row.assignedPosId);
  // Kursi sudah diambil orang lain ⇒ tetap APPROVED (log ASSIGNMENT_SEAT_TAKEN).
  if (!seat || (seat.occupantId && seat.occupantId !== row.employeeId)) return;
  seat.occupantId = row.employeeId;
  row.status = 'ACTIVE';
}

const today = () => TA_TODAY;

/** Nama kursi untuk tampilan (backend: `home_pos_name`/`assigned_pos_name`). */
export const seatName = (id: string | null) => (id ? (seats.find((row) => row.id === id)?.name ?? id) : '—');

export const tempAssignmentService = {
  async list(filter: TaFilter = {}, names: (id: string) => string = (id) => id): Promise<TempAssignment[]> {
    if (MOCK) {
      await delay(150);
      const keyword = filter.keyword?.trim().toLowerCase() ?? '';
      return rows
        .filter((row) => !filter.status || row.status === filter.status)
        .filter((row) => !keyword || names(row.employeeId).toLowerCase().includes(keyword))
        .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: TempAssignment[] }>('/temporary-assignments/search', {
      status_in: filter.status ? [filter.status] : undefined,
      sort_by: 'start_date',
      sort_direction: 'DESC',
    });
    return data.data;
  },

  /** Kursi kosong pada satu unit — mode picker company. */
  async vacantSeats(orgUnitId: string): Promise<Seat[]> {
    if (MOCK) {
      await delay(100);
      return seats.filter((row) => row.orgUnitId === orgUnitId && !row.occupantId).map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: Seat[] }>('/group-struct-positions/search', {
      group_struct_id: orgUnitId,
      vacant_only: true,
    });
    return data.data;
  },

  async create(session: TaSession, draft: TaDraft, idempotencyKey: string): Promise<TempAssignment> {
    if (MOCK) {
      await delay(350);
      if (!draft.employeeId || !draft.assignmentType || !draft.assignedPosId || !draft.startDate || !draft.returnDate) {
        throw new Error('422 EMP-VAL-576 — lengkapi pegawai, jenis, kursi, dan tanggal.');
      }
      if (draft.startDate < today()) throw new Error('422 EMP-VAL-584 — tanggal mulai tidak boleh lampau.');
      if (draft.returnDate <= draft.startDate) throw new Error('422 EMP-VAL-585 — tanggal kembali harus setelah tanggal mulai.');
      if (rows.some((row) => row.employeeId === draft.employeeId && OPEN_STATUSES.includes(row.status))) {
        throw new Error('409 EMP-CNF-580 — pegawai ini masih punya penugasan terbuka.');
      }
      const seat = seats.find((row) => row.id === draft.assignedPosId);
      const home = seats.find((row) => row.occupantId === draft.employeeId && row.id !== draft.assignedPosId);
      if (seat?.occupantId === draft.employeeId) throw new Error('422 EMP-BIZ-582 — kursi itu sudah dipegang pegawai ini.');
      if (!seat || seat.occupantId) throw new Error('422 EMP-BIZ-583 — kursi penugasan harus kosong.');

      const row: TempAssignment = {
        id: `ta-${crypto.randomUUID().slice(0, 6)}`,
        employeeId: draft.employeeId,
        assignmentType: draft.assignmentType,
        homePosId: home?.id ?? null,
        assignedPosId: draft.assignedPosId,
        startDate: draft.startDate,
        returnDate: draft.returnDate,
        status: 'IN_APPROVAL',
        reason: draft.reason.trim(),
        returnTrigger: null,
        approvedBy: null,
        approvedAt: null,
        returnedAt: null,
        createdAt: new Date().toISOString(),
        createdByEmployeeId: session.employeeId,
      };
      rows = [row, ...rows];
      return { ...row };
    }
    const { data } = await api.post<TempAssignment>(
      '/temporary-assignments',
      {
        employee_id: draft.employeeId,
        assignment_type: draft.assignmentType,
        assigned_pos_id: draft.assignedPosId,
        start_date: draft.startDate,
        return_date: draft.returnDate,
        reason: draft.reason.trim() || undefined,
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return data;
  },

  async act(session: TaSession, id: string, action: Exclude<TaAction, 'extend'>): Promise<TempAssignment> {
    if (MOCK) {
      await delay(300);
      const row = find(id);
      guard(row, session, action);
      const now = new Date().toISOString();
      if (action === 'approve') {
        row.status = 'APPROVED';
        row.approvedBy = session.employeeId;
        row.approvedAt = now;
        // start_date ≤ hari ini ⇒ langsung aktif di transaksi yang sama.
        if (row.startDate <= today()) activate(row);
      } else if (action === 'reject') {
        row.status = 'REJECTED';
      } else if (action === 'cancel') {
        row.status = 'CANCELLED';
      } else {
        row.status = 'RETURNED';
        row.returnTrigger = 'EARLY';
        row.returnedAt = now;
        const seat = seats.find((item) => item.id === row.assignedPosId && item.occupantId === row.employeeId);
        if (seat) seat.occupantId = null;
      }
      return { ...row };
    }
    const { data } = await api.post<TempAssignment>(`/temporary-assignments/${id}/${action}`);
    return data;
  },

  async extend(session: TaSession, id: string, returnDate: string): Promise<TempAssignment> {
    if (MOCK) {
      await delay(300);
      const row = find(id);
      guard(row, session, 'extend');
      if (!returnDate || returnDate <= row.returnDate || returnDate <= today()) {
        throw new Error('422 EMP-VAL-606 — tanggal kembali baru harus setelah tanggal berjalan dan setelah hari ini.');
      }
      row.returnDate = returnDate;
      return { ...row };
    }
    const { data } = await api.post<TempAssignment>(`/temporary-assignments/${id}/extend`, { return_date: returnDate });
    return data;
  },
};
