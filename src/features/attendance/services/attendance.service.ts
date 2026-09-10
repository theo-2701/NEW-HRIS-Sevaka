import { api } from '@/services/api';
import { ATTENDANCE_TODAY, CORRECTIONS, DAILY, PUNCHES } from '@/features/attendance/mock-data';
import { captureChannel, nextPunchType, punchesToday } from '@/features/attendance/rules';
import {
  EXCUSED_FROM_REASON,
  canApproveCorrection,
  canCreateCorrection,
  canSearchPunch,
  canSearchSummary,
} from '@/features/attendance/types';
import type {
  AttendanceDay,
  AttendanceSession,
  Correction,
  CorrectionDraft,
  Punch,
} from '@/features/attendance/types';

/**
 * API service Attendance (FSD-001-TIME §5 · UIC-001-TIME §6).
 *
 * Endpoint kontrak:
 *   POST /attendance/punches            · GET /attendance/punches (investigatif)
 *   GET  /attendance/daily              (nol endpoint tulis — putusan mesin)
 *   POST /attendance/corrections        · PATCH …/{id}/approve · …/{id}/reject
 *   PATCH /attendance/corrections/{id}/withdraw
 *
 * Yang ditegakkan di sini:
 *  • Tap append-only — tidak ada update dan tidak ada delete sama sekali.
 *  • `Idempotency-Key` di-scope ke (karyawan, key): tekan dua kali di koneksi
 *    lambat tidak pernah melahirkan baris kedua.
 *  • Kanal yang mewajibkan selfie menolak tap tanpa frame — `422`, baris tak lahir.
 *  • Ringkasan harian tidak pernah ditulis layar; approval koreksi hanya
 *    menyalakan `isExcused` + `excusedReason`, menit mentah tetap apa adanya.
 *  • Pengaju koreksi tidak pernah boleh jadi penyetujunya — `403`.
 *  • Satu koreksi hidup per hari — `409`.
 */
const MOCK = !import.meta.env.VITE_API_BASE_URL;
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

let mockPunches: Punch[] = PUNCHES.map((row) => ({ ...row }));
let mockDays: AttendanceDay[] = DAILY.map((row) => ({ ...row }));
let mockCorrections: Correction[] = CORRECTIONS.map((row) => ({ ...row }));
/** (karyawan, Idempotency-Key) → id tap yang sudah lahir. */
let mockPunchKeys = new Map<string, string>();

/** Dipakai pengujian supaya setiap berkas uji mulai dari dataset kontrak. */
export function resetAttendanceMocks() {
  mockPunches = PUNCHES.map((row) => ({ ...row }));
  mockDays = DAILY.map((row) => ({ ...row }));
  mockCorrections = CORRECTIONS.map((row) => ({ ...row }));
  mockPunchKeys = new Map();
}

export interface DayFilter {
  attendanceStatus?: string;
  dayType?: string;
  excused?: 'YES' | 'NO';
  employeeId?: string;
}

export interface TapFilter {
  punchType?: string;
  geofence?: 'IN' | 'OUT' | 'UNKNOWN';
  mockLocation?: 'YES' | 'NO';
  employeeId?: string;
}

export interface CorrectionFilter {
  correctionStatus?: string;
  correctionReasonType?: string;
  employeeId?: string;
}

export interface PunchResult {
  punch: Punch;
  idempotencyKey: string;
  /** `true` bila kunci itu sudah pernah dipakai — retry, bukan baris baru. */
  replayed: boolean;
  selfieRequired: boolean;
}

function findCorrection(id: string): Correction {
  const row = mockCorrections.find((item) => item.id === id);
  if (!row) throw new Error('404 — koreksi tidak ditemukan.');
  return row;
}

export const attendanceService = {
  /** Tap hari ini milik sesi — selalu terbuka, bahkan untuk EMPLOYEE. */
  async todayPunches(session: AttendanceSession): Promise<Punch[]> {
    if (MOCK) {
      await delay(150);
      return punchesToday(session.employeeId, mockPunches).map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Punch[] }>('/attendance/punches', {
      params: { employeeId: session.employeeId, workDate: ATTENDANCE_TODAY },
    });
    return data.rows;
  },

  /**
   * Audit tap mentah — kewenangan penyelidikan. Peran lain tidak memuat apa pun
   * di sini; barisnya bukan disembunyikan di klien, endpoint-nya memang tertutup.
   */
  async punches(session: AttendanceSession, filter: TapFilter = {}): Promise<Punch[]> {
    if (MOCK) {
      await delay();
      if (!canSearchPunch(session)) {
        throw new Error('403 — attendance-punch:search adalah kewenangan penyelidikan yang tidak dipegang peran ini.');
      }
      return mockPunches
        .filter((row) => {
          if (filter.punchType && row.punchType !== filter.punchType) return false;
          if (filter.geofence === 'IN' && row.isWithinGeofence !== true) return false;
          if (filter.geofence === 'OUT' && row.isWithinGeofence !== false) return false;
          if (filter.geofence === 'UNKNOWN' && row.isWithinGeofence !== null) return false;
          if (filter.mockLocation === 'YES' && !row.isMockLocationSuspected) return false;
          if (filter.mockLocation === 'NO' && row.isMockLocationSuspected) return false;
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          return true;
        })
        .sort((a, b) => (a.punchAt < b.punchAt ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Punch[] }>('/attendance/punches', { params: filter });
    return data.rows;
  },

  /**
   * Ringkasan harian. `attendance-summary:search` bukan scope EMPLOYEE, jadi
   * sesi EMPLOYEE dipersempit ke hari miliknya sendiri dari klaim identitas.
   */
  async days(session: AttendanceSession, filter: DayFilter = {}): Promise<AttendanceDay[]> {
    if (MOCK) {
      await delay();
      return mockDays
        .filter((row) => {
          if (!canSearchSummary(session) && row.employeeId !== session.employeeId) return false;
          if (filter.attendanceStatus && row.attendanceStatus !== filter.attendanceStatus) return false;
          if (filter.dayType && row.dayType !== filter.dayType) return false;
          if (filter.excused === 'YES' && !row.isExcused) return false;
          if (filter.excused === 'NO' && row.isExcused) return false;
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          return true;
        })
        .sort((a, b) => (a.workDate < b.workDate ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: AttendanceDay[] }>('/attendance/daily', { params: filter });
    return data.rows;
  },

  async corrections(session: AttendanceSession, filter: CorrectionFilter = {}): Promise<Correction[]> {
    if (MOCK) {
      await delay();
      return mockCorrections
        .filter((row) => {
          if (session.role === 'EMPLOYEE' && row.employeeId !== session.employeeId) return false;
          if (filter.correctionStatus && row.correctionStatus !== filter.correctionStatus) return false;
          if (filter.correctionReasonType && row.correctionReasonType !== filter.correctionReasonType) return false;
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          return true;
        })
        .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const { data } = await api.get<{ rows: Correction[] }>('/attendance/corrections', { params: filter });
    return data.rows;
  },

  /**
   * Merekam satu tap. Jenisnya diturunkan dari keadaan hari, bukan dikirim
   * layar; waktu, zona, koordinat, dan detail perangkat ikut di latar.
   */
  async recordPunch(
    session: AttendanceSession,
    input: { selfieCaptured: boolean; idempotencyKey: string; now?: Date },
  ): Promise<PunchResult> {
    if (MOCK) {
      await delay(400);
      const keyScope = `${session.employeeId}:${input.idempotencyKey}`;
      const existingId = mockPunchKeys.get(keyScope);
      if (existingId) {
        const existing = mockPunches.find((row) => row.id === existingId)!;
        const channel = captureChannel(session, mockDays);
        return { punch: { ...existing }, idempotencyKey: input.idempotencyKey, replayed: true, selfieRequired: channel.selfie };
      }

      const type = nextPunchType(session.employeeId, mockPunches);
      if (!type) throw new Error('409 — hari ini sudah punya tap masuk dan tap keluar.');

      const channel = captureChannel(session, mockDays);
      if (channel.selfie && !input.selfieCaptured) {
        throw new Error('422 — kanal ini mewajibkan selfie langsung dan tidak ada frame yang terlampir; barisnya tidak pernah lahir.');
      }

      const now = input.now ?? new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const punch: Punch = {
        id: `pun-${mockPunches.length + 10}`,
        employeeId: session.employeeId,
        punchType: type,
        // Zona karyawan, bukan zona server; waktu masa depan ditolak server.
        punchAt: `${ATTENDANCE_TODAY}T${hh}:${mm}:00+07:00`,
        workDate: ATTENDANCE_TODAY,
        // Verdict radius dihitung server; kosong berarti tidak bisa dievaluasi.
        isWithinGeofence: channel.radius ? true : null,
        isMockLocationSuspected: false,
        isWorkArrangementUnknown: false,
        geofenceId: channel.geofence.id,
      };
      mockPunches = [...mockPunches, punch];
      mockPunchKeys.set(keyScope, punch.id);
      return { punch, idempotencyKey: input.idempotencyKey, replayed: false, selfieRequired: channel.selfie };
    }

    const { data } = await api.post<Punch>(
      '/attendance/punches',
      { selfieCaptured: input.selfieCaptured },
      { headers: { 'Idempotency-Key': input.idempotencyKey } },
    );
    return { punch: data, idempotencyKey: input.idempotencyKey, replayed: false, selfieRequired: input.selfieCaptured };
  },

  async createCorrection(session: AttendanceSession, draft: CorrectionDraft): Promise<Correction> {
    if (MOCK) {
      await delay(350);
      if (!canCreateCorrection(session)) {
        throw new Error('403 — attendance-correction:create tidak dipegang peran ini.');
      }
      if (!draft.attendanceDailyId || !draft.correctionReasonType) {
        throw new Error('422 — pilih hari dan alasan koreksinya.');
      }
      if (draft.correctionReasonType === 'OTHER' && !draft.reasonNote.trim()) {
        throw new Error('422 — catatan alasan wajib diisi bila alasannya Other.');
      }
      if (!draft.requestedIn && !draft.requestedOut) {
        throw new Error('422 — usulkan minimal satu jam; koreksi tanpa keduanya tidak mengoreksi apa pun.');
      }
      const live = mockCorrections.some(
        (row) => row.attendanceDailyId === draft.attendanceDailyId && row.correctionStatus === 'PENDING_APPROVAL',
      );
      if (live) {
        throw new Error('409 — hari itu sudah membawa koreksi yang menunggu keputusan; satu koreksi hidup per hari.');
      }

      const row: Correction = {
        id: `cor-${mockCorrections.length + 10}`,
        attendanceDailyId: draft.attendanceDailyId,
        // Dibaca dari token, tidak pernah diketik; pengaju boleh ≠ pemilik hari.
        employeeId: session.employeeId,
        correctionReasonType: draft.correctionReasonType,
        reasonNote: draft.reasonNote.trim(),
        requestedIn: draft.requestedIn || null,
        requestedOut: draft.requestedOut || null,
        correctionStatus: 'PENDING_APPROVAL',
        submittedAt: new Date().toISOString(),
        decidedBy: null,
      };
      mockCorrections = [...mockCorrections, row];
      return row;
    }
    const { data } = await api.post<Correction>('/attendance/corrections', draft);
    return data;
  },

  /**
   * Keputusan checker. Setuju hanya menandai hari sebagai excused dengan alasan
   * turunan — `workedMinutes`, `lateMinutes`, dan `undertimeMinutes` tidak
   * pernah ditulis ulang. Tolak tidak menyentuh hari sama sekali.
   */
  async decideCorrection(
    session: AttendanceSession,
    id: string,
    kind: 'APPROVED' | 'REJECTED',
  ): Promise<Correction> {
    if (MOCK) {
      await delay(400);
      const row = findCorrection(id);
      if (!canApproveCorrection(session)) {
        throw new Error('403 — attendance-correction:approve tidak dipegang peran ini.');
      }
      if (row.employeeId === session.employeeId) {
        throw new Error('403 — pengaju koreksi tidak pernah bisa jadi penyetujunya.');
      }
      if (row.correctionStatus !== 'PENDING_APPROVAL') {
        throw new Error('409 — koreksi ini sudah diputuskan.');
      }

      row.correctionStatus = kind;
      row.decidedBy = session.employeeId;
      if (kind === 'APPROVED') {
        const day = mockDays.find((item) => item.id === row.attendanceDailyId);
        if (day) {
          day.isExcused = true;
          day.excusedReason = EXCUSED_FROM_REASON[row.correctionReasonType];
        }
      }
      return { ...row };
    }
    const path = kind === 'APPROVED' ? 'approve' : 'reject';
    const { data } = await api.patch<Correction>(`/attendance/corrections/${id}/${path}`);
    return data;
  },

  /** Penarikan bukan penghapusan: barisnya tinggal sebagai Cancelled. */
  async withdrawCorrection(session: AttendanceSession, id: string): Promise<Correction> {
    if (MOCK) {
      await delay(250);
      const row = findCorrection(id);
      if (row.employeeId !== session.employeeId) {
        throw new Error('403 — hanya pengaju yang bisa menarik koreksinya sendiri.');
      }
      if (row.correctionStatus !== 'PENDING_APPROVAL') {
        throw new Error('409 — hanya koreksi yang masih menunggu keputusan yang bisa ditarik.');
      }
      row.correctionStatus = 'CANCELLED';
      return { ...row };
    }
    const { data } = await api.patch<Correction>(`/attendance/corrections/${id}/withdraw`);
    return data;
  },
};
