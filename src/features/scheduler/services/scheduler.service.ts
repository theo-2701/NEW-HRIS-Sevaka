import { api } from '@/services/api';
import { ASSIGNMENTS, ME, SHIFTS, SWAPS } from '@/features/scheduler/mock-data';
import { datesBetween } from '@/features/scheduler/rules';
import type {
  AssignmentDraft,
  BulkDraft,
  BulkPreview,
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
const MOCK = !import.meta.env.VITE_API_BASE_URL;
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
  if (!row) throw new Error('404 — pola shift tidak ditemukan.');
  return row;
}

function findAssignment(id: string): ShiftAssignment {
  const row = mockAssignments.find((item) => item.id === id);
  if (!row) throw new Error('404 — baris roster tidak ditemukan.');
  return row;
}

function findSwap(id: string): ShiftSwap {
  const row = mockSwaps.find((item) => item.id === id);
  if (!row) throw new Error('404 — permintaan tukar tidak ditemukan.');
  return row;
}

export const schedulerService = {
  async shifts(): Promise<Shift[]> {
    if (MOCK) {
      await delay();
      return mockShifts.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Shift[] }>('/shifts');
    return data.rows;
  },

  async saveShift(draft: ShiftDraft, id?: string): Promise<Shift> {
    if (MOCK) {
      await delay(350);
      const code = draft.shiftCode.trim().toUpperCase();
      const name = draft.shiftName.trim();
      const breakMinutes = Number(draft.breakMinutes);

      if (!code || !name || !draft.shiftType) {
        throw new Error('422 — kode, nama, dan tipe shift wajib diisi.');
      }
      if (draft.shiftType === 'FIXED' && (!draft.startTime || !draft.endTime)) {
        throw new Error('422 — pola tetap butuh jam mulai dan jam selesai sekaligus.');
      }
      if (draft.shiftType !== 'FIXED' && (draft.startTime || draft.endTime)) {
        throw new Error('422 — jam mulai dan selesai harus kosong untuk pola non-tetap.');
      }
      if (!Number.isInteger(breakMinutes) || breakMinutes < 0) {
        throw new Error('422 — jeda harus bilangan bulat menit, 0 atau lebih.');
      }
      if (draft.shiftType === 'CYCLE' && breakMinutes !== 0) {
        throw new Error('422 — pola siklus harus berjeda 0.');
      }
      if (draft.shiftType === 'CYCLE' && !draft.cycleDef.trim()) {
        throw new Error('422 — pola siklus butuh definisi siklusnya.');
      }
      if (draft.shiftType === 'FLEX' && !draft.flexBand.trim()) {
        throw new Error('422 — pola fleksibel butuh definisi band-nya.');
      }

      const clash = mockShifts.some((row) => row.isActive && row.shiftCode === code && row.id !== id);
      if (clash) throw new Error('409 — kode shift itu sudah dipakai pola yang aktif.');

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
      ? await api.patch<Shift>(`/shifts/${id}`, draft)
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
        throw new Error('409 — pola ini masih dirujuk baris roster; pensiunkan lewat Deactivate.');
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
    const { data } = await api.get<{ rows: ShiftAssignment[] }>('/shift-assignments', { params: filter });
    return data.rows;
  },

  async saveAssignment(draft: AssignmentDraft, id?: string): Promise<ShiftAssignment> {
    if (MOCK) {
      await delay(350);
      if (!draft.employeeId || !draft.workDate) {
        throw new Error('422 — karyawan dan tanggal kerja dua-duanya wajib diisi.');
      }
      if (!draft.isOffDay && !draft.shiftId) {
        throw new Error('422 — pilih pola shift, atau tandai tanggal itu sebagai hari libur terjadwal.');
      }
      const clash = mockAssignments.some(
        (row) => row.employeeId === draft.employeeId && row.workDate === draft.workDate && row.id !== id,
      );
      if (clash) throw new Error('409 — karyawan itu sudah punya baris roster pada tanggal ini.');

      const patch = {
        workDate: draft.workDate,
        isOffDay: draft.isOffDay,
        shiftId: draft.isOffDay ? null : draft.shiftId,
        // Sentuhan tangan selalu dicap individual — bulk berikutnya melangkahinya.
        assignmentSource: 'INDIVIDUAL' as const,
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
      ? await api.patch<ShiftAssignment>(`/shift-assignments/${id}`, draft)
      : await api.post<ShiftAssignment>('/shift-assignments', draft);
    return data;
  },

  async deleteAssignment(id: string): Promise<void> {
    if (MOCK) {
      await delay(250);
      const row = findAssignment(id);
      if (swapBusy(row.id)) {
        throw new Error('409 — baris ini bagian dari permintaan tukar yang belum diputuskan.');
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
        else if (existing.assignmentSource === 'INDIVIDUAL') skippedIndividual += 1;
        else if (existing.assignmentSource === 'SWAP' || swapBusy(existing.id)) skippedSwap += 1;
        else overwritten += 1;
      });
    });

    return { created, overwritten, skippedIndividual, skippedSwap, employees: draft.employeeIds.length, dates };
  },

  async runBulk(draft: BulkDraft): Promise<BulkResult> {
    if (MOCK) {
      await delay(450);
      if (!draft.employeeIds.length) throw new Error('422 — pilih minimal satu karyawan.');
      if (!draft.from || !draft.to) throw new Error('422 — kedua tanggal rentang wajib diisi.');
      if (draft.to < draft.from) throw new Error('422 — akhir rentang tidak boleh mendahului awalnya.');
      if (!draft.shiftId) throw new Error('422 — pilih pola shift yang akan diterapkan.');

      const preview = schedulerService.previewBulk(draft);

      draft.employeeIds.forEach((employeeId) => {
        preview.dates.forEach((iso) => {
          const existing = mockAssignments.find((row) => row.employeeId === employeeId && row.workDate === iso);
          if (existing) {
            // Dikunci tangan manusia atau swap → dilangkahi apa adanya.
            if (
              existing.assignmentSource === 'INDIVIDUAL' ||
              existing.assignmentSource === 'SWAP' ||
              swapBusy(existing.id)
            ) {
              return;
            }
            existing.shiftId = draft.shiftId;
            existing.isOffDay = false;
            existing.assignmentSource = 'BULK';
            return;
          }
          mockAssignments = [
            ...mockAssignments,
            {
              id: `as-${mockAssignments.length + 100}`,
              employeeId,
              workDate: iso,
              shiftId: draft.shiftId,
              isOffDay: false,
              assignmentSource: 'BULK',
            },
          ];
        });
      });

      return { ...preview, skipped: preview.skippedIndividual + preview.skippedSwap };
    }

    const { data } = await api.post<BulkResult>('/shift-assignments/bulk', draft);
    return data;
  },

  async swaps(): Promise<ShiftSwap[]> {
    if (MOCK) {
      await delay();
      return mockSwaps.map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: ShiftSwap[] }>('/shift-swaps');
    return data.rows;
  },

  async createSwap(requesterAssignmentId: string, counterpartAssignmentId: string): Promise<ShiftSwap> {
    if (MOCK) {
      await delay(350);
      if (!requesterAssignmentId || !counterpartAssignmentId) {
        throw new Error('422 — kedua baris roster wajib dipilih.');
      }
      if (requesterAssignmentId === counterpartAssignmentId) {
        throw new Error('422 — pasangannya harus baris yang berbeda.');
      }
      const mine = findAssignment(requesterAssignmentId);
      const other = findAssignment(counterpartAssignmentId);
      if (mine.workDate !== other.workDate) {
        throw new Error('422 — tukar shift hanya sah pada tanggal kerja yang sama.');
      }
      if (swapBusy(mine.id) || swapBusy(other.id)) {
        throw new Error('409 — salah satu baris masih terikat permintaan tukar yang belum diputuskan.');
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
    const { data } = await api.post<ShiftSwap>('/shift-swaps', {
      requesterAssignmentId,
      counterpartAssignmentId,
    });
    return data;
  },

  async decideSwap(id: string, kind: 'APPROVED' | 'REJECTED'): Promise<ShiftSwap> {
    if (MOCK) {
      await delay(400);
      const row = findSwap(id);
      if (row.swapStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — hanya permintaan yang masih menunggu keputusan yang bisa diputuskan.');
      }
      const requester = findAssignment(row.requesterAssignmentId);
      if (requester.employeeId === ME) {
        throw new Error('403 — pemisahan tugas: pengaju tidak pernah memutuskan tukarnya sendiri.');
      }

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
    const path = kind === 'APPROVED' ? 'approve' : 'reject';
    const { data } = await api.patch<ShiftSwap>(`/shift-swaps/${id}/${path}`);
    return data;
  },

  /** Penarikan menyisakan jejak; tidak ada roster yang tersentuh. */
  async withdrawSwap(id: string): Promise<ShiftSwap> {
    if (MOCK) {
      await delay(250);
      const row = findSwap(id);
      const requester = findAssignment(row.requesterAssignmentId);
      if (requester.employeeId !== ME) {
        throw new Error('403 — hanya pengaju yang bisa menarik permintaannya sendiri.');
      }
      if (row.swapStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — hanya permintaan yang masih menunggu keputusan yang bisa ditarik.');
      }
      row.swapStatus = 'CANCELLED';
      return { ...row };
    }
    const { data } = await api.patch<ShiftSwap>(`/shift-swaps/${id}/withdraw`);
    return data;
  },
};
