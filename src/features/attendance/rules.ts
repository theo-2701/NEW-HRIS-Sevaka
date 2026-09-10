import { ATTENDANCE_TODAY, GEOFENCES, employeeBranch } from '@/features/attendance/mock-data';
import type {
  AttendanceDay,
  AttendanceSession,
  CaptureChannel,
  Correction,
  Punch,
  PunchType,
} from '@/features/attendance/types';

/**
 * Aturan murni Attendance — tidak menyentuh jaringan, jadi bisa diuji apa
 * adanya dan dipakai layar untuk pratinjau sebelum menembak service.
 */

/**
 * Titik geofence yang dipakai saat tap: cabang karyawan × `isActive`.
 * Kontrak menyatakan `geofence_id` diturunkan server tanpa merinci aturan
 * pemilihan bila satu cabang punya beberapa titik (GAP-TIME §5 #7) — di sini
 * titik aktif pertama pada cabang itu yang dipakai.
 */
export function resolveGeofence(employeeId: string) {
  const branch = employeeBranch(employeeId);
  return GEOFENCES.find((row) => row.scopeRef === branch && row.isActive) ?? GEOFENCES[0];
}

/** Pengaturan kerja hari ini menurut baris harian; default WFO bila belum ada. */
export function arrangementToday(employeeId: string, days: AttendanceDay[]) {
  const row = days.find((item) => item.employeeId === employeeId && item.workDate === ATTENDANCE_TODAY);
  return row?.workArrangement ?? 'WFO';
}

/**
 * Kanal capture = persilangan pengaturan kerja × aturan titik.
 * Persilangannya yang jadi aturan, bukan tombolnya.
 */
export function captureChannel(session: AttendanceSession, days: AttendanceDay[]): CaptureChannel {
  const geofence = resolveGeofence(session.employeeId);
  const arrangement = arrangementToday(session.employeeId, days);
  const rule = geofence.rules[arrangement] ?? { radius: false, selfie: false };
  return { geofence, arrangement, radius: rule.radius, selfie: rule.selfie };
}

/** Tap milik sesi ini pada hari berjalan. */
export function punchesToday(employeeId: string, punches: Punch[]): Punch[] {
  return punches.filter((row) => row.employeeId === employeeId && row.workDate === ATTENDANCE_TODAY);
}

/**
 * Tombol mana yang muncul ditentukan keadaan hari, bukan pilihan:
 * belum ada IN → Tap in · sudah IN tanpa OUT → Tap out · dua-duanya → habis.
 */
export function nextPunchType(employeeId: string, punches: Punch[]): PunchType | null {
  const rows = punchesToday(employeeId, punches);
  if (!rows.some((row) => row.punchType === 'IN')) return 'IN';
  if (!rows.some((row) => row.punchType === 'OUT')) return 'OUT';
  return null;
}

/**
 * Hari yang masih boleh dikoreksi: satu koreksi hidup per hari (409), dan
 * EMPLOYEE hanya boleh harinya sendiri sementara HR_STAFF boleh atas nama.
 */
export function eligibleDays(
  session: AttendanceSession,
  days: AttendanceDay[],
  corrections: Correction[],
): AttendanceDay[] {
  const taken = corrections
    .filter((row) => row.correctionStatus === 'PENDING_APPROVAL')
    .map((row) => row.attendanceDailyId);
  return days.filter((day) => {
    if (taken.includes(day.id)) return false;
    return session.role === 'HR_STAFF' ? true : day.employeeId === session.employeeId;
  });
}

/** `Idempotency-Key` per percobaan tap, dipakai ulang apa adanya saat retry. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
