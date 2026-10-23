import { ATTENDANCE_TODAY, employeeBranch } from '@/features/attendance/mock-data';
import { liveGeofences } from '@/features/attendance/services/geofence.service';
import { CORRECTION_WINDOW_DAYS } from '@/features/attendance/types';
import type {
  AttendanceDay,
  AttendanceSession,
  CaptureChannel,
  Correction,
  Geofence,
  Punch,
  PunchType,
  TapLocation,
  WorkArrangement,
} from '@/features/attendance/types';
import { TAP_ARRANGEMENTS } from '@/features/attendance/types';

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
  const rows = liveGeofences();
  return rows.find((row) => row.scopeRef === branch && row.isActive) ?? rows[0];
}

/**
 * Selfie diminta di awal tap in, SEBELUM tipe kerja dipilih. Keputusan tim dev (23 Okt 2026):
 * setelan selfie TIDAK dipisah per WFO/WFH dan akan diatur per karyawan — layar cukup membaca satu
 * flag "wajib selfie". Selama setelan itu belum ada, flag diturunkan dari matriks titik kerja.
 */
export function selfieRequiredAtTap(geofence: Geofence): boolean {
  return TAP_ARRANGEMENTS.some((arrangement) => geofence.rules[arrangement]?.selfie);
}

/** Jarak dua titik (haversine), meter. */
export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/**
 * Putusan radius: `null` bila tipe kerja ini tidak memeriksa radius atau lokasi tidak ada —
 * keduanya "tidak bisa dievaluasi", bukan pelanggaran.
 */
export function radiusVerdict(
  geofence: Geofence,
  arrangement: WorkArrangement,
  location: TapLocation | null,
): boolean | null {
  if (!geofence.rules[arrangement]?.radius || !location) return null;
  const center = { latitude: geofence.centerLatitude, longitude: geofence.centerLongitude };
  return distanceMeters(center, location) <= geofence.radiusMeters;
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
 * Hari masih di dalam jendela koreksi: jarak `workDate` → hari ini tidak melampaui
 * `CORRECTION_WINDOW_DAYS` (`0` = tanpa batas).
 */
export function withinCorrectionWindow(workDate: string, today = ATTENDANCE_TODAY): boolean {
  if (CORRECTION_WINDOW_DAYS === 0) return true;
  const days = (Date.parse(today) - Date.parse(workDate)) / 86_400_000;
  return days <= CORRECTION_WINDOW_DAYS;
}

/**
 * Hari yang masih boleh dikoreksi: di dalam jendela koreksi (422), satu koreksi
 * hidup per hari (409), dan EMPLOYEE hanya boleh harinya sendiri (404) sementara
 * HR_STAFF boleh atas nama.
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
    if (taken.includes(day.id) || !withinCorrectionWindow(day.workDate)) return false;
    return session.role === 'HR_STAFF' ? true : day.employeeId === session.employeeId;
  });
}

/** `Idempotency-Key` per percobaan tap, dipakai ulang apa adanya saat retry. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
