import { api } from '@/services/api';
import { MOCK } from '@/services/mock';
import { acknowledge } from '@/services/decision';
import type { DecisionAck } from '@/services/decision';
import { ATTENDANCE_TODAY, CORRECTIONS, DAILY, PUNCHES } from '@/features/attendance/mock-data';
import {
  nextPunchType,
  punchesToday,
  radiusVerdict,
  resolveGeofence,
  selfieRequiredAtTap,
  withinCorrectionWindow,
} from '@/features/attendance/rules';
import {
  CORRECTION_WINDOW_DAYS,
  EXCUSED_FROM_REASON,
  PUNCH_NOTE_MAX,
  canApproveCorrection,
  canCreateCorrection,
  canSearchPunch,
  isSelfScoped,
} from '@/features/attendance/types';
import type {
  AttendanceDay,
  AttendanceSession,
  Correction,
  CorrectionDraft,
  Punch,
  TapLocation,
  WorkArrangement,
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

export interface TapInput {
  idempotencyKey: string;
  selfieCaptured: boolean;
  /** Frame swafoto base64 tanpa prefiks data-URL (jalur API). */
  selfieBase64?: string;
  selfieContentType?: string;
  /** Wajib saat tap in; tap out mewarisi dari tap in. */
  workArrangement?: WorkArrangement;
  note?: string;
  location?: TapLocation | null;
  /** Jalur API: jenis tap yang dihitung layar dari keadaan hari. */
  punchType?: 'IN' | 'OUT';
  now?: Date;
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
  if (!row) throw new Error('404 — Correction not found.');
  return row;
}

export const attendanceService = {
  /** Tap hari ini milik sesi — selalu terbuka, bahkan untuk EMPLOYEE. */
  async todayPunches(session: AttendanceSession): Promise<Punch[]> {
    if (MOCK) {
      await delay(150);
      return punchesToday(session.employeeId, mockPunches).map((row) => ({ ...row }));
    }
    const { data } = await api.post<{ data: Punch[] }>('/attendance-punches/search', {
      filters: { employee_id: session.employeeId, start_date: ATTENDANCE_TODAY, end_date: ATTENDANCE_TODAY },
    });
    return data.data;
  },

  /**
   * Riwayat tap mentah. HR Manager = penyelidikan atas semua karyawan; EMPLOYEE = tap miliknya
   * sendiri, dan kriteria mock location dibuang (UIC-TIME 0.20 §6.1.3). Peran lain tidak memuat apa
   * pun di sini; barisnya bukan disembunyikan di klien, endpoint-nya memang tertutup.
   */
  async punches(session: AttendanceSession, filter: TapFilter = {}): Promise<Punch[]> {
    if (MOCK) {
      await delay();
      if (!canSearchPunch(session)) {
        throw new Error('403 — Your role can\'t view the tap history.');
      }
      const self = isSelfScoped(session);
      return mockPunches
        .filter((row) => {
          if (filter.punchType && row.punchType !== filter.punchType) return false;
          if (filter.geofence === 'IN' && row.isWithinGeofence !== true) return false;
          if (filter.geofence === 'OUT' && row.isWithinGeofence !== false) return false;
          if (filter.geofence === 'UNKNOWN' && row.isWithinGeofence !== null) return false;
          if (self) return row.employeeId === session.employeeId;
          if (filter.mockLocation === 'YES' && !row.isMockLocationSuspected) return false;
          if (filter.mockLocation === 'NO' && row.isMockLocationSuspected) return false;
          if (filter.employeeId && row.employeeId !== filter.employeeId) return false;
          return true;
        })
        .sort((a, b) => (a.punchAt < b.punchAt ? 1 : -1))
        .map((row) => ({ ...row }));
    }
    const filters = isSelfScoped(session) ? { ...filter, mockLocation: undefined, employeeId: undefined } : filter;
    const { data } = await api.post<{ data: Punch[] }>('/attendance-punches/search', { filters });
    return data.data;
  },

  /**
   * Ringkasan harian. EMPLOYEE memegang `attendance-summary:search` (UIC-TIME §6.2.2), tetapi
   * barisnya dipersempit ke hari miliknya sendiri dari klaim identitas.
   */
  async days(session: AttendanceSession, filter: DayFilter = {}): Promise<AttendanceDay[]> {
    if (MOCK) {
      await delay();
      return mockDays
        .filter((row) => {
          if (isSelfScoped(session) && row.employeeId !== session.employeeId) return false;
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
    const { data } = await api.post<{ data: AttendanceDay[] }>('/attendance-summaries/search', { filters: filter });
    return data.data;
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
    const { data } = await api.post<{ data: Correction[] }>('/attendance-corrections/search', { filters: filter });
    return data.data;
  },

  /**
   * Merekam satu tap. Jenisnya diturunkan dari keadaan hari, bukan dipilih layar. Tap in membawa
   * tipe kerja (WFO/WFH) + catatan; tap out mewarisi tipe kerja tap in. Koordinat perangkat
   * dikirim berpasangan bila tersedia — tanpa koordinat tap tetap lahir, radiusnya tak terevaluasi.
   */
  async recordPunch(session: AttendanceSession, input: TapInput): Promise<PunchResult> {
    const note = input.note?.trim() ?? '';
    if (note.length > PUNCH_NOTE_MAX) {
      throw new Error(`422 — The note can be at most ${PUNCH_NOTE_MAX} characters.`);
    }

    if (MOCK) {
      await delay(400);
      const keyScope = `${session.employeeId}:${input.idempotencyKey}`;
      const existingId = mockPunchKeys.get(keyScope);
      if (existingId) {
        const existing = mockPunches.find((row) => row.id === existingId)!;
        const geofence = resolveGeofence(session.employeeId);
        return { punch: { ...existing }, idempotencyKey: input.idempotencyKey, replayed: true, selfieRequired: selfieRequiredAtTap(geofence) };
      }

      // Punch append-only (UIC-TIME §6.1): tap berikutnya selalu direkam — yang
      // menilai sah-tidaknya adalah recompute, bukan penolakan di pintu tap.
      const todays = [...punchesToday(session.employeeId, mockPunches)].sort((a, b) => (a.punchAt < b.punchAt ? -1 : 1));
      const type = nextPunchType(session.employeeId, mockPunches) ?? (todays.at(-1)?.punchType === 'IN' ? 'OUT' : 'IN');
      const tappedIn = todays.find((row) => row.punchType === 'IN');
      const arrangement = type === 'IN' ? input.workArrangement : (tappedIn?.workArrangement ?? input.workArrangement);
      if (type === 'IN' && !arrangement) {
        throw new Error('422 — Choose a work type (WFO or WFH) before tapping in.');
      }

      const geofence = resolveGeofence(session.employeeId);
      const selfieRequired = selfieRequiredAtTap(geofence);
      if (selfieRequired && !input.selfieCaptured) {
        throw new Error('422 — A live selfie is required at this location. The tap was not recorded.');
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
        // Verdict radius dihitung server dari koordinat × aturan tipe kerja.
        isWithinGeofence: arrangement ? radiusVerdict(geofence, arrangement, input.location ?? null) : null,
        isMockLocationSuspected: false,
        isWorkArrangementUnknown: !arrangement,
        geofenceId: geofence.id,
        workArrangement: arrangement ?? null,
        note: note || null,
        latitude: input.location?.latitude ?? null,
        longitude: input.location?.longitude ?? null,
        gpsAccuracyMeters: input.location?.accuracyMeters ?? null,
      };
      mockPunches = [...mockPunches, punch];
      mockPunchKeys.set(keyScope, punch.id);
      return { punch, idempotencyKey: input.idempotencyKey, replayed: false, selfieRequired };
    }

    // UIC-TIME §6.1.1: koordinat berpasangan + swafoto `selfie_base64` (PROVISIONAL).
    // `work_arrangement` dan `note` = permintaan tambahan, BELUM ada di kontrak (GAP) — BE wajib menambahkannya.
    const now = input.now ?? new Date();
    const { data } = await api.post<Punch>(
      '/attendance-punches',
      {
        punch_type: input.punchType,
        punch_at: now.toISOString(),
        punch_at_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...(input.location
          ? {
              latitude: input.location.latitude,
              longitude: input.location.longitude,
              ...(input.location.accuracyMeters != null ? { gps_accuracy_meters: input.location.accuracyMeters } : {}),
            }
          : {}),
        ...(input.workArrangement ? { work_arrangement: input.workArrangement } : {}),
        ...(note ? { note } : {}),
        ...(input.selfieBase64
          ? { selfie_base64: input.selfieBase64, selfie_content_type: input.selfieContentType ?? 'image/jpeg' }
          : {}),
      },
      { headers: { 'Idempotency-Key': input.idempotencyKey } },
    );
    return { punch: data, idempotencyKey: input.idempotencyKey, replayed: false, selfieRequired: input.selfieCaptured };
  },

  async createCorrection(session: AttendanceSession, draft: CorrectionDraft): Promise<Correction> {
    if (MOCK) {
      await delay(350);
      if (!canCreateCorrection(session)) {
        throw new Error('403 — Your role can\'t submit corrections.');
      }
      if (!draft.attendanceDailyId || !draft.correctionReasonType) {
        throw new Error('422 — Choose the day and the correction reason.');
      }
      // TSD-TIME 0.82 §7.3.4: lingkup baris diperiksa atas PEMILIK hari lebih dulu — di luar lingkup
      // dijawab 404 TIM-NFD-014 supaya keberadaan hari orang lain tidak bocor.
      const day = mockDays.find((item) => item.id === draft.attendanceDailyId);
      if (!day) throw new Error('422 — The day to correct was not found.');
      if (isSelfScoped(session) && day.employeeId !== session.employeeId) {
        throw new Error('404 — The day was not found or is outside your access.');
      }
      if (!withinCorrectionWindow(day.workDate)) {
        throw new Error(`422 — That day is older than the ${CORRECTION_WINDOW_DAYS}-day correction window.`);
      }
      if (draft.correctionReasonType === 'OTHER' && !draft.reasonNote.trim()) {
        throw new Error('422 — A reason note is required when the reason is Other.');
      }
      if (!draft.requestedIn && !draft.requestedOut) {
        throw new Error('422 — Propose at least one time; a correction without either changes nothing.');
      }
      const live = mockCorrections.some(
        (row) => row.attendanceDailyId === draft.attendanceDailyId && row.correctionStatus === 'PENDING_APPROVAL',
      );
      if (live) {
        throw new Error('409 — That day already has a correction waiting for a decision. Only one per day.');
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
    const { data } = await api.post<Correction>('/attendance-corrections', draft);
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
  ): Promise<DecisionAck<Correction>> {
    if (MOCK) {
      await delay(400);
      const row = findCorrection(id);
      if (!canApproveCorrection(session)) {
        throw new Error('403 — Your role can\'t decide corrections.');
      }
      if (row.employeeId === session.employeeId) {
        throw new Error('403 — You can\'t decide a correction you filed yourself.');
      }
      if (row.correctionStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — This correction has already been decided.');
      }
      // K9: keputusan diterima (200); status & baris harian ditulis saat workflow selesai.
      return acknowledge(row);
    }
    const { data } = await api.post<DecisionAck<Correction>>(`/attendance-corrections/${id}/approval`, {
      decision: kind,
    });
    return data;
  },

  /** Mock saja — pengganti konsumsi `workflow.process.completed` koreksi (K9). */
  async completeCorrectionWorkflow(
    session: AttendanceSession,
    id: string,
    kind: 'APPROVED' | 'REJECTED',
  ): Promise<Correction> {
    await delay(150);
    const row = findCorrection(id);
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
  },

  /** Penarikan bukan penghapusan: barisnya tinggal sebagai Cancelled. */
  async withdrawCorrection(session: AttendanceSession, id: string): Promise<Correction> {
    if (MOCK) {
      await delay(250);
      const row = findCorrection(id);
      if (row.employeeId !== session.employeeId) {
        throw new Error('403 — Only the filer can withdraw this correction.');
      }
      if (row.correctionStatus !== 'PENDING_APPROVAL') {
        throw new Error('422 — Only a correction still waiting for a decision can be withdrawn.');
      }
      row.correctionStatus = 'CANCELLED';
      return { ...row };
    }
    const { data } = await api.delete<Correction>(`/attendance-corrections/${id}`);
    return data;
  },
};

export interface AttendanceMeMonthly {
  month: string;
  presentDays: number;
}

export interface AttendanceTodayOverview {
  workDate: string;
  presentCount: number;
  onLeaveCount: number;
}

/** #96 `GET /attendance-summaries/me-monthly` — hari hadir bulan berjalan: `attendance_status IN (PRESENT, LATE)`. */
export async function attendanceMeMonthly(
  employeeId: string,
  month = ATTENDANCE_TODAY.slice(0, 7),
): Promise<AttendanceMeMonthly> {
  if (MOCK) {
    await delay(150);
    const presentDays = mockDays.filter(
      (day) =>
        day.employeeId === employeeId &&
        day.workDate.startsWith(month) &&
        (day.attendanceStatus === 'PRESENT' || day.attendanceStatus === 'LATE'),
    ).length;
    return { month, presentDays };
  }
  const { data } = await api.get<AttendanceMeMonthly>('/attendance-summaries/me-monthly');
  return data;
}

/**
 * #97 `GET /attendance-summaries/today-overview` — satu alamat untuk kartu "Hadir Hari Ini"
 * dan "Sedang Cuti Hari Ini"; dilarang memulangkan baris perorangan. Sedang cuti =
 * `attendance_status IN (ON_LEAVE, SICK)` (D3).
 */
export async function attendanceTodayOverview(workDate = ATTENDANCE_TODAY): Promise<AttendanceTodayOverview> {
  if (MOCK) {
    await delay(150);
    const today = mockDays.filter((day) => day.workDate === workDate);
    return {
      workDate,
      presentCount: today.filter((day) => day.attendanceStatus === 'PRESENT' || day.attendanceStatus === 'LATE').length,
      onLeaveCount: today.filter((day) => day.attendanceStatus === 'ON_LEAVE' || day.attendanceStatus === 'SICK').length,
    };
  }
  const { data } = await api.get<AttendanceTodayOverview>('/attendance-summaries/today-overview');
  return data;
}
