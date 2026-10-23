import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { acknowledge } from '@/services/decision';
import type { DecisionAck } from '@/services/decision';
import { ASSIGNMENTS, ME, SHIFTS, SWAPS } from '@/features/scheduler/mock-data';
import { canBulkAssign, datesBetween } from '@/features/scheduler/rules';
import type {
  AssignmentDraft,
  BulkDraft,
  BulkPreview,
  SchedulerRole,
  Shift,
  ShiftAssignment,
  ShiftDraft,
  ShiftSwap,
} from '@/features/scheduler/types';

/**
 * API service Scheduler (FSD-001-TIME §8–§9 · UIC-001-TIME §10).
 *
 * Endpoint kontrak:
 *   GET/POST/PATCH/DELETE /shifts · PATCH …/{id}/toggle-active
 *   GET/POST/PATCH/DELETE /shift-assignments · POST …/bulk
 *   GET/POST /shift-swaps · PATCH …/{id}/approve · /reject · /withdraw
 *
 * Aturan yang ditegakkan di sini:
 *  • Kode shift unik di antara pola **aktif** (409); pola FIXED wajib punya
 *    jam mulai dan selesai, pola non-FIXED wajib kosong jamnya; CYCLE selalu
 *    berjeda 0 dan tidak pernah bisa dipilih di roster.
 *  • `crosses_midnight` diturunkan server dari jam, tidak pernah diketik.
 *  • Pola yang masih dirujuk roster tidak bisa dihapus (409) — pensiunkan lewat
 *    Deactivate; baris roster yang menunjuknya tetap sah.
 *  • Satu baris roster per karyawan × tanggal (409).
 *  • Bulk melangkahi baris yang sudah dikunci penyesuaian individual atau swap,
 *    dan menulis ulang baris yang hanya hasil bulk sebelumnya.
 *  • Baris roster yang sedang terikat swap belum diputuskan tidak bisa dihapus
 *    (409).
 *  • Swap: roster tidak bergerak sebelum keputusan; saat disetujui kedua baris
 *    bertukar pola sebagai **satu paket** dan dicap `SWAP`. Pengaju tidak
 *    pernah memutuskan swap-nya sendiri (403); penarikan menyisakan jejak
 *    `CANCELLED`.
 */
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let mockShifts: Shift[] = SHIFTS.map((row) => ({ ...row }));
let mockAssignments: ShiftAssignment[] = ASSIGNMENTS.map((row) => ({ ...row }));
let mockSwaps: ShiftSwap[] = SWAPS.map((row) => ({ ...row }));

export function resetSchedulerMocks() {
  mockShifts = SHIFTS.map((row) => ({ ...row }));
  mockAssignments = ASSIGNMENTS.map((row) => ({ ...row }));
  mockSwaps = SWAPS.map((row) => ({ ...row }));
}

export interface AssignmentFilter {
  from?: string;
  to?: string;
  assignmentSource?: string;
  employeeId?: string;
}

export interface BulkResult extends BulkPreview {
  skipped: number;
}

/** Apakah baris roster sedang terikat swap yang belum diputuskan? */
function swapBusy(assignmentId: string): boolean {
  return mockSwaps.some(
    (row) =>
      row.swapStatus === 'PENDING_APPROVAL' &&
      (row.requesterAssignmentId === assignmentId || row.counterpartAssignmentId === assignmentId),
  );
}

function findShift(id: string): Shift {
  const row = mockShifts.find((item) => item.id === id);
  if (!row) throw new Error('404 — Shift pattern not found.');
  return row;
}

function findAssignment(id: string): ShiftAssignment {
  const row = mockAssignments.find((item) => item.id === id);
  if (!row) throw new Error('404 — Roster row not found.');
  return row;
}

function findSwap(id: string): ShiftSwap {
  const row = mockSwaps.find((item) => item.id === id);
  if (!row) throw new Error('404 — Swap request not found.');
  return row;
}

/** Roster satu karyawan pada satu tanggal + shift-nya (`null` = tidak ada baris roster). */
export interface ShiftOn {
  assignment: ShiftAssignment;
  /** `null` saat hari libur roster. */
  shift: Shift | null;
}

/**
 * Shift karyawan pada satu tanggal — dipakai kartu tap Attendance. Dua pintu yang sudah ada:
 * `POST /shift-assignments/search` (UIC-TIME §9.2, EMPLOYEE dipersempit ke miliknya) lalu
 * `GET /shifts/{shift-id}` (§10.1.2, keenam peran).
 */
export async function shiftOn(employeeId: string, workDate: string): Promise<ShiftOn | null> {
  if (MOCK) {
    await delay(150);
    const assignment = mockAssignments.find((row) => row.employeeId === employeeId && row.workDate === workDate);
    if (!assignment) return null;
    const shift = mockShifts.find((row) => row.id === assignment.shiftId) ?? null;
    return { assignment: { ...assignment }, shift: shift && { ...shift } };
  }
  const { data } = await api.post<{ data: ShiftAssignment[] }>('/shift-assignments/search', {
    filters: { employee_id: employeeId, start_date: workDate, end_date: workDate },
  });
  const assignment = data.data[0];
  if (!assignment) return null;
  if (assignment.isOffDay || !assignment.shiftId) return { assignment, shift: null };
  const { data: shift } = await api.get<Shift>(`/shifts/${assignment.shiftId}`);
  return { assignment, shift };
}

export const schedulerService = {
  async shifts(): Promise<Shift[]> {
    if (MOCK) {
      await delay();
      return mockShifts.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: Shift[] }>('/shifts/search', { filters: {} });
    return data.data;
  },

  async saveShift(draft: ShiftDraft, id?: string): Promise<Shift> {
    if (MOCK) {
      await delay(350);
      const code = draft.shiftCode.trim().toUpperCase();
      const name = draft.shiftName.trim();
      const breakMinutes = Number(draft.breakMinutes);

      if (!code || !name || !draft.shiftType) {
        throw new Error('422 — Shift code, name and type are required.');
      }
      if (draft.shiftType === 'FIXED' && (!draft.startTime || !draft.endTime)) {
        throw new Error('422 — A fixed pattern needs both a start time and an end time.');
      }
      if (draft.shiftType !== 'FIXED' && (draft.startTime || draft.endTime)) {
        throw new Error('422 — Start and end times must be empty for a non-fixed pattern.');
      }
      if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
        throw new Error('422 — Break must be a whole number of minutes, 0 or more.');
      }
      if (draft.shiftType === 'ROTATING' && breakMinutes !== 0) {
        throw new Error('422 — A cycle pattern must have a 0-minute break.');
      }
      if (draft.shiftType === 'ROTATING' && !draft.cycleDef.trim()) {
        throw new Error('422 — A cycle pattern needs its cycle definition.');
      }
      if (draft.shiftType === 'FLEXIBLE' && !draft.flexBand.trim()) {
        throw new Error('422 — A flexible pattern needs its band definition.');
      }

      const clash = mockShifts.some((row) => row.isActive && row.shiftCode === code && row.id !== id);
      if (clash) throw new Error('409 — That shift code is already used by an active pattern.');

      const patch = {
        shiftCode: code,
        shiftName: name,
        shiftType: draft.shiftType,
        startTime: draft.shiftType === 'FIXED' ? draft.startTime : null,
        endTime: draft.shiftType === 'FIXED' ? draft.endTime : null,
        // Diturunkan server dari jamnya, tidak pernah diketik.
        crossesMidnight: draft.shiftType === 'FIXED' && draft.endTime < draft.startTime,
        breakMinutes,
      };

      if (id) {
        const row = findShift(id);
        // Tipe shift beku setelah tersimpan.
        Object.assign(row, patch, { shiftType: row.shiftType });
        return { ...row };
      }

      const row: Shift = { id: `sh-${mockShifts.length + 10}`, isActive: true, usedByRoster: false, ...patch };
      mockShifts = [...mockShifts, row];
      return { ...row };
    }

    const { data } = id
      ? await api.put<Shift>(`/shifts/${id}`, draft)
      : await api.post<Shift>('/shifts', draft);
    return data;
  },

  /** Memensiunkan pola: baris roster yang menunjuknya tetap sah. */
  async toggleShift(id: string): Promise<Shift> {
    if (MOCK) {
      await delay(200);
      const row = findShift(id);
      row.isActive = !row.isActive;
      return { ...row };
    }
    const { data } = await api.patch<Shift>(`/shifts/${id}/toggle-active`);
    return data;
  },

  async deleteShift(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findShift(id);
      const used = mockAssignments.some((item) => item.shiftId === row.id);
      if (used) {
        throw new Error('409 — This pattern is still referenced by roster rows; retire it with Deactivate.');
      }
      mockShifts = mockShifts.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/shifts/${id}`);
  },

  async assignments(filter: AssignmentFilter = {}): Promise<ShiftAssignment[]> {
    if (MOCK) {
      await delay();
      return mockAssignments
        .filter((row) => {
          if (filter.from && row.workDate < filter.from) return false;
          if (filter.to && row.workDate > filter.to) return false;
          if (filter.assignmentSource && row.assignmentSource !== filter.assignmentSource) return false;
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          return true;
        })
        .sort((a, b) => (a.workDate < b.workDate ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: ShiftAssignment[] }>('/shift-assignments/search', { filters: filter });
    return data.data;
  },

  async saveAssignment(draft: AssignmentDraft, id?: string): Promise<ShiftAssignment> {
    if (MOCK) {
      await delay(350);
      if (!draft.employeeId || !draft.workDate) {
        throw new Error('422 — Employee and work date are both required.');
      }
      if (!draft.isOffDay && !draft.shiftId) {
        throw new Error('422 — Choose a shift pattern, or mark the date as a scheduled day off.');
      }
      if (!draft.isOffDay && !findShift(draft.shiftId).isActive) {
        throw new Error('422 — That shift pattern is no longer active; choose an active one.');
      }
      const clash = mockAssignments.some(
        (row) => row.employeeId === draft.employeeId && row.workDate === draft.workDate && row.id !== id,
      );
      if (clash) throw new Error('409 — That employee already has a roster row on this date.');

      const patch = {
        workDate: draft.workDate,
        isOffDay: draft.isOffDay,
        shiftId: draft.isOffDay ? null : draft.shiftId,
        // Sentuhan tangan selalu dicap individual — bulk berikutnya melangkahinya.
        assignmentSource: 'INDIVIDUAL_OVERRIDE' as const,
      };

      if (id) {
        const row = findAssignment(id);
        Object.assign(row, patch);
        return { ...row };
      }

      const row: ShiftAssignment = {
        id: `as-${mockAssignments.length + 10}`,
        employeeId: draft.employeeId,
        ...patch,
      };
      mockAssignments = [...mockAssignments, row];
      return { ...row };
    }

    const { data } = id
      ? await api.put<ShiftAssignment>(`/shift-assignments/${id}`, draft)
      : await api.post<ShiftAssignment>('/shift-assignments', draft);
    return data;
  },

  async deleteAssignment(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findAssignment(id);
      if (swapBusy(row.id)) {
        throw new Error('409 — This row is part of an undecided swap request.');
      }
      mockAssignments = mockAssignments.filter((item) => item.id !== id);
      return;
    }
    await api.delete(`/shift-assignments/${id}`);
  },

  /** Hitungan kering: tidak ada satu baris pun yang bergerak. */
  previewBulk(draft: BulkDraft): BulkPreview {
    const dates = draft.from && draft.to && draft.to >= draft.from ? datesBetween(draft.from, draft.to) : [];
    let created = 0;
    let overwritten = 0;
    let skippedIndividual = 0;
    let skippedSwap = 0;

    draft.employeeIds.forEach((employeeId) => {
      dates.forEach((iso) => {
        const existing = mockAssignments.find((row) => row.employeeId === employeeId && row.workDate === iso);
        if (!existing) created += 1;
        else if (existing.assignmentSource === 'INDIVIDUAL_OVERRIDE') skippedIndividual += 1;
        else if (existing.assignmentSource === 'SWAP' || swapBusy(existing.id)) skippedSwap += 1;
        else overwritten += 1;
      });
    });

    return { created, overwritten, skippedIndividual, skippedSwap, employees: draft.employeeIds.length, dates };
  },

  /** `shift-assignment:bulk` — hanya SUPER_ADMIN/HR_MANAGER; HR_STAFF 403 (FSD-TIME 0.5 §9.5). */
  async runBulk(draft: BulkDraft, role: SchedulerRole = 'ROLE_HR_MANAGER'): Promise<BulkResult> {
    if (MOCK) {
      await delay(450);
      if (!canBulkAssign(role)) {
        throw new Error('403 — Bulk assign is only for Super Admin and HR Manager.');
      }
      if (!draft.employeeIds.length) throw new Error('422 — Choose at least one employee.');
      if (!draft.from || !draft.to) throw new Error('422 — Both range dates are required.');
      if (draft.to < draft.from) throw new Error("422 — The end of the range can't be earlier than its start.");
      if (!draft.shiftId && !draft.isOffDay) throw new Error('422 — Choose the shift pattern to apply.');
      const shiftId = draft.isOffDay ? null : draft.shiftId;
      const isOffDay = Boolean(draft.isOffDay);

      const preview = schedulerService.previewBulk(draft);

      draft.employeeIds.forEach((employeeId) => {
        preview.dates.forEach((iso) => {
          const existing = mockAssignments.find((row) => row.employeeId === employeeId && row.workDate === iso);
          if (existing) {
            // Dikunci tangan manusia atau swap → dilangkahi apa adanya.
            if (
              existing.assignmentSource === 'INDIVIDUAL_OVERRIDE' ||
              existing.assignmentSource === 'SWAP' ||
              swapBusy(existing.id)
            ) {
              return;
            }
            existing.shiftId = shiftId;
            existing.isOffDay = isOffDay;
            existing.assignmentSource = 'BULK_UNIT';
            return;
          }
          mockAssignments = [
            ...mockAssignments,
            {
              id: `as-${mockAssignments.length + 100}`,
              employeeId,
              workDate: iso,
              shiftId,
              isOffDay,
              assignmentSource: 'BULK_UNIT',
            },
          ];
        });
      });

      return { ...preview, skipped: preview.skippedIndividual + preview.skippedSwap };
    }

    // Tepat satu bentuk cakupan: layar ini selalu mengirim daftar eksplisit `employee_ids[]`.
    const { data } = await api.post<BulkResult>('/shift-assignments/bulk', {
      employee_ids: draft.employeeIds,
      start_date: draft.from,
      end_date: draft.to || undefined,
      ...(draft.isOffDay ? { is_off_day: true } : { shift_id: draft.shiftId, is_off_day: false }),
    });
    return data;
  },

  async swaps(): Promise<ShiftSwap[]> {
    if (MOCK) {
      await delay();
      return mockSwaps.map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: ShiftSwap[] }>('/shift-swap-requests/search', { filters: {} });
    return data.data;
  },

  async createSwap(requesterAssignmentId: string, counterpartAssignmentId: string): Promise<ShiftSwap> {
    if (MOCK) {
      await delay(350);
      if (!requesterAssignmentId || !counterpartAssignmentId) {
        throw new Error('422 — Both roster rows are required.');
      }
      if (requesterAssignmentId === counterpartAssignmentId) {
        throw new Error('422 — The pair must be different rows.');
      }
      const mine = findAssignment(requesterAssignmentId);
      const other = findAssignment(counterpartAssignmentId);
      if (mine.workDate !== other.workDate) {
        throw new Error('422 — A shift swap is only valid on the same work date.');
      }
      if (swapBusy(mine.id) || swapBusy(other.id)) {
        throw new Error('409 — One of the rows is still tied to an undecided swap request.');
      }

      const row: ShiftSwap = {
        id: `sw-${mockSwaps.length + 10}`,
        requesterAssignmentId,
        counterpartAssignmentId,
        swapStatus: 'PENDING_APPROVAL',
        submittedAt: new Date().toISOString(),
        approvedBy: null,
      };
      mockSwaps = [...mockSwaps, row];
      return { ...row };
    }
    const { data } = await api.post<ShiftSwap>('/shift-swap-requests', {
      requesterAssignmentId,
      counterpartAssignmentId,
    });
    return data;
  },

  async decideSwap(id: string, kind: 'APPROVED' | 'REJECTED'): Promise<DecisionAck<ShiftSwap>> {
    if (MOCK) {
      await delay(400);
      const row = findSwap(id);
      if (row.swapStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — Only a request awaiting a decision can be decided.');
      }
      const requester = findAssignment(row.requesterAssignmentId);
      if (requester.employeeId === ME) {
        throw new Error('403 — Separation of duties: the requester never decides their own swap.');
      }
      // K9 (UIC-TIME §10.3.4): keputusan diterima; roster bergerak saat workflow selesai.
      void kind;
      return acknowledge(row);
    }
    const { data } = await api.post<DecisionAck<ShiftSwap>>(`/shift-swap-requests/${id}/approval`, {
      decision: kind,
    });
    return data;
  },

  /** Mock saja — pengganti konsumsi `workflow.process.completed` tukar shift. */
  async completeSwapWorkflow(id: string, kind: 'APPROVED' | 'REJECTED'): Promise<ShiftSwap> {
    await delay(150);
    {
      const row = findSwap(id);
      const requester = findAssignment(row.requesterAssignmentId);
      if (kind === 'APPROVED') {
        const counterpart = findAssignment(row.counterpartAssignmentId);
        // Satu paket: pola kedua baris bertukar sekaligus, lalu dicap SWAP.
        const packed = { shiftId: requester.shiftId, isOffDay: requester.isOffDay };
        requester.shiftId = counterpart.shiftId;
        requester.isOffDay = counterpart.isOffDay;
        requester.assignmentSource = 'SWAP';
        counterpart.shiftId = packed.shiftId;
        counterpart.isOffDay = packed.isOffDay;
        counterpart.assignmentSource = 'SWAP';
      }

      row.swapStatus = kind;
      row.approvedBy = ME;
      return { ...row };
    }
  },

  /** Penarikan menyisakan jejak; tidak ada roster yang tersentuh. */
  async withdrawSwap(id: string): Promise<ShiftSwap> {
    if (MOCK) {
      await delay(250);
      const row = findSwap(id);
      const requester = findAssignment(row.requesterAssignmentId);
      if (requester.employeeId !== ME) {
        throw new Error('403 — Only the requester can withdraw their own request.');
      }
      if (row.swapStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — Only a request awaiting a decision can be withdrawn.');
      }
      row.swapStatus = 'CANCELLED';
      return { ...row };
    }
    const { data } = await api.delete<ShiftSwap>(`/shift-swap-requests/${id}`);
    return data;
  },
};
