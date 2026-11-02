import { ATTENDANCE_TODAY, GEOFENCES, PUNCH_PROFILES, employeeBranch } from '@/features/attendance/mock-data';
import type {
  AttendanceDay,
  AttendanceSession,
  CaptureChannel,
  Correction,
  Punch,
  PunchPolicy,
  PunchType,
  WorkArrangement,
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

/**
 * `GET /attendance-punches/policy` (UIC §6.1.4): kebijakan tap pemanggil dari
 * flag profilnya. Profil tak terbaca ⇒ default WFO dan swafoto opsional.
 */
export function punchPolicy(employeeId: string): PunchPolicy {
  const profile = PUNCH_PROFILES.find((row) => row.employeeId === employeeId);
  return {
    profileWorkArrangement: profile?.workArrangement ?? null,
    defaultWorkArrangement: profile?.workArrangement === 'WFH' ? 'WFH' : 'WFO',
    selfieRequired: profile?.isSelfie ?? false,
    radiusValidation: profile?.radiusValidation ?? false,
    wfhRequiresApproval: profile?.workArrangement === 'WFO',
  };
}

/**
 * Kanal capture tap = pilihan WFO/WFH × flag profil. Pilihan menang atas
 * profil: WFH tak dicek radius; WFO dicek bila `radiusValidation`. Swafoto
 * mengikuti `is_selfie` profil, bukan matriks titik (UIC §6.1.1 0.27).
 */
export function captureChannel(session: AttendanceSession, choice?: WorkArrangement): CaptureChannel {
  const policy = punchPolicy(session.employeeId);
  const arrangement = choice ?? policy.defaultWorkArrangement;
  return {
    geofence: resolveGeofence(session.employeeId),
    arrangement,
    radius: arrangement === 'WFO' && policy.radiusValidation,
    selfie: policy.selfieRequired,
    wfhRequiresApproval: arrangement === 'WFH' && policy.wfhRequiresApproval,
  };
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
