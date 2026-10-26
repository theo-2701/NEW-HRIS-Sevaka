import { EMPLOYEES } from '@/features/time-off/mock-data';
import type {
  AttendanceDay,
  AttendanceSession,
  Correction,
  Geofence,
  Punch,
  WorkArrangement,
} from '@/features/attendance/types';

/**
 * Dataset Skenario Positif Attendance (UIC-001-TIME §6.1.1 / §6.2.1 / §6.3.1).
 * Barisnya disalin apa adanya dari kontrak — jangan mengarang baris baru di
 * sini; tambahkan lewat alur layar saja.
 */

/** "Hari ini" dataset kontrak, supaya konsol punch punya hari yang masuk akal. */
export const ATTENDANCE_TODAY = '2026-07-30';

/** Identitas percobaan — pengganti login sungguhan (GAP-TIME §5 #4). */
export const VIEWERS: AttendanceSession[] = [
  { employeeId: 'emp-rina', role: 'EMPLOYEE' },
  { employeeId: 'emp-sari', role: 'HR_STAFF' },
  { employeeId: 'emp-hendra', role: 'HR_MANAGER' },
  // Cabang Makassar (geo-3) tanpa selfie — memperlihatkan tap yang langsung ke langkah tipe kerja.
  { employeeId: 'emp-budi', role: 'DEPT_MANAGER' },
  // Kantor Cabang Bandung (geo-4): tanpa radius dan tanpa selfie — jalur tap yang selalu berhasil.
  { employeeId: 'emp-dewi', role: 'EMPLOYEE' },
];

const ALL_ARRANGEMENTS = (rule: Record<WorkArrangement, { radius: boolean; selfie: boolean }>) => rule;

export const GEOFENCES: Geofence[] = [
  // geo-1 = `geo-hq` §7.2: radius 150, MOBILE tanpa paksaan radius — titik yang
  // dirujuk contoh punch §6.1.1, jadi DELETE padanya adalah 409 yang terdokumentasi.
  {
    id: 'geo-1',
    geofenceName: 'Kantor Pusat Jakarta — Gedung A',
    scopeRef: 'br-1',
    centerLatitude: -6.2247,
    centerLongitude: 106.8092,
    radiusMeters: 150,
    isActive: true,
    usedByPunch: true,
    rules: ALL_ARRANGEMENTS({
      WFO: { radius: true, selfie: true },
      HYBRID: { radius: true, selfie: true },
      WFH: { radius: false, selfie: true },
      MOBILE: { radius: false, selfie: true },
    }),
  },
  {
    id: 'geo-2',
    geofenceName: 'Kantor Pusat Jakarta — Gedung B',
    scopeRef: 'br-1',
    centerLatitude: -6.2251,
    centerLongitude: 106.81,
    radiusMeters: 100,
    isActive: true,
    usedByPunch: false,
    rules: ALL_ARRANGEMENTS({
      WFO: { radius: true, selfie: true },
      HYBRID: { radius: true, selfie: true },
      WFH: { radius: false, selfie: true },
      MOBILE: { radius: false, selfie: true },
    }),
  },
  {
    id: 'geo-3',
    geofenceName: 'Kantor Cabang Makassar — Lobi Utama',
    scopeRef: 'br-4',
    centerLatitude: -5.1477,
    centerLongitude: 119.4327,
    radiusMeters: 100,
    isActive: true,
    usedByPunch: false,
    // Setelan admin contoh: cabang ini cukup radius, tanpa selfie.
    rules: ALL_ARRANGEMENTS({
      WFO: { radius: true, selfie: false },
      HYBRID: { radius: true, selfie: false },
      WFH: { radius: false, selfie: false },
      MOBILE: { radius: false, selfie: false },
    }),
  },
  {
    id: 'geo-4',
    geofenceName: 'Kantor Cabang Bandung',
    scopeRef: 'br-5',
    centerLatitude: -6.9175,
    centerLongitude: 107.6191,
    radiusMeters: 100,
    isActive: true,
    usedByPunch: false,
    // Setelan admin contoh: tanpa pemeriksaan radius dan tanpa selfie untuk semua tipe kerja.
    rules: ALL_ARRANGEMENTS({
      WFO: { radius: false, selfie: false },
      HYBRID: { radius: false, selfie: false },
      WFH: { radius: false, selfie: false },
      MOBILE: { radius: false, selfie: false },
    }),
  },
];

export const PUNCHES: Punch[] = [
  { id: 'pun-1', employeeId: 'emp-hendra', punchType: 'IN', punchAt: '2026-07-27T08:02:00+07:00', workDate: '2026-07-27', isWithinGeofence: true, isMockLocationSuspected: false, isWorkArrangementUnknown: false, geofenceId: 'geo-1' },
  { id: 'pun-2', employeeId: 'emp-hendra', punchType: 'OUT', punchAt: '2026-07-27T17:41:00+07:00', workDate: '2026-07-27', isWithinGeofence: true, isMockLocationSuspected: false, isWorkArrangementUnknown: false, geofenceId: 'geo-1' },
  { id: 'pun-3', employeeId: 'emp-hendra', punchType: 'IN', punchAt: '2026-07-28T08:47:00+07:00', workDate: '2026-07-28', isWithinGeofence: false, isMockLocationSuspected: false, isWorkArrangementUnknown: false, geofenceId: 'geo-1' },
  { id: 'pun-4', employeeId: 'emp-hendra', punchType: 'OUT', punchAt: '2026-07-28T17:12:00+07:00', workDate: '2026-07-28', isWithinGeofence: true, isMockLocationSuspected: false, isWorkArrangementUnknown: false, geofenceId: 'geo-1' },
  { id: 'pun-5', employeeId: 'emp-hendra', punchType: 'IN', punchAt: '2026-07-29T08:05:00+07:00', workDate: '2026-07-29', isWithinGeofence: null, isMockLocationSuspected: true, isWorkArrangementUnknown: true, geofenceId: null },
  { id: 'pun-6', employeeId: 'emp-sari', punchType: 'IN', punchAt: '2026-07-29T09:20:00+07:00', workDate: '2026-07-29', isWithinGeofence: true, isMockLocationSuspected: false, isWorkArrangementUnknown: false, geofenceId: 'geo-1' },
  // punch-1/punch-2 contoh UIC-TIME §6.1.3 — riwayat tap milik Rina yang dibaca layar ESS (0.20).
  { id: 'pun-rina-1', employeeId: 'emp-rina', punchType: 'IN', punchAt: '2026-07-27T08:05:00+07:00', workDate: '2026-07-27', isWithinGeofence: true, isMockLocationSuspected: false, isWorkArrangementUnknown: false, geofenceId: 'geo-1' },
  { id: 'pun-rina-2', employeeId: 'emp-rina', punchType: 'OUT', punchAt: '2026-07-27T17:12:00+07:00', workDate: '2026-07-27', isWithinGeofence: true, isMockLocationSuspected: false, isWorkArrangementUnknown: false, geofenceId: 'geo-1' },
];

export const DAILY: AttendanceDay[] = [
  { id: 'day-1', employeeId: 'emp-hendra', workDate: '2026-07-27', dayType: 'WORKDAY', workArrangement: 'WFO', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'PRESENT', workedMinutes: 519, lateMinutes: 0, undertimeMinutes: 0, isExcused: false, excusedReason: null },
  { id: 'day-2', employeeId: 'emp-hendra', workDate: '2026-07-28', dayType: 'WORKDAY', workArrangement: 'WFO', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'LATE', workedMinutes: 445, lateMinutes: 32, undertimeMinutes: 0, isExcused: false, excusedReason: null },
  { id: 'day-3', employeeId: 'emp-hendra', workDate: '2026-07-29', dayType: 'WORKDAY', workArrangement: 'HYBRID', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'INCOMPLETE', workedMinutes: 0, lateMinutes: 0, undertimeMinutes: 0, isExcused: false, excusedReason: null },
  // 30 Juli Hendra cuti disetujui (leave-today) — status mengikuti cuti, bukan ABSENT.
  { id: 'day-4', employeeId: 'emp-hendra', workDate: '2026-07-30', dayType: 'WORKDAY', workArrangement: 'WFO', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'ON_LEAVE', workedMinutes: 0, lateMinutes: 0, undertimeMinutes: 0, isExcused: false, excusedReason: null },
  // §6.2.1/§6.2.2 — 27 Juli sudah excused; 26 Juli sengaja bersih sebagai jalur demo pengajuan baru.
  { id: 'day-rina-27', employeeId: 'emp-rina', workDate: '2026-07-27', dayType: 'WORKDAY', workArrangement: 'WFO', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'PRESENT', workedMinutes: 547, lateMinutes: 5, undertimeMinutes: 0, isExcused: true, excusedReason: 'APPROVED_CORRECTION' },
  { id: 'day-rina-26', employeeId: 'emp-rina', workDate: '2026-07-26', dayType: 'WORKDAY', workArrangement: 'WFO', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'ABSENT', workedMinutes: 0, lateMinutes: 0, undertimeMinutes: 540, isExcused: false, excusedReason: null },
  { id: 'day-5', employeeId: 'emp-rina', workDate: '2026-07-23', dayType: 'WORKDAY', workArrangement: 'WFO', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'SICK', workedMinutes: 0, lateMinutes: 0, undertimeMinutes: 0, isExcused: false, excusedReason: null },
  { id: 'day-6', employeeId: 'emp-rina', workDate: '2026-07-20', dayType: 'WORKDAY', workArrangement: 'WFO', expectedIn: '08:00', expectedOut: '17:00', appliedLateToleranceMinutes: 15, attendanceStatus: 'ON_LEAVE', workedMinutes: 0, lateMinutes: 0, undertimeMinutes: 0, isExcused: false, excusedReason: null },
  { id: 'day-7', employeeId: 'emp-sari', workDate: '2026-07-26', dayType: 'WEEKLY_REST', workArrangement: 'WFO', expectedIn: null, expectedOut: null, appliedLateToleranceMinutes: 0, attendanceStatus: 'NOT_SCHEDULED', workedMinutes: 0, lateMinutes: 0, undertimeMinutes: 0, isExcused: false, excusedReason: null },
];

export const CORRECTIONS: Correction[] = [
  { id: 'cor-1', attendanceDailyId: 'day-rina-27', employeeId: 'emp-rina', correctionReasonType: 'FORGOT_PUNCH', reasonNote: 'Forgot to tap out on 26 July, phone battery died on the way.', requestedIn: null, requestedOut: '17:05', correctionStatus: 'APPROVED', submittedAt: '2026-07-27T09:00:00+07:00', decidedBy: 'emp-hendra' },
  // Pengaju ≠ pemilik hari: Sari (HR_STAFF) memfilekan koreksi atas hari milik Hendra.
  { id: 'cor-2', attendanceDailyId: 'day-3', employeeId: 'emp-sari', correctionReasonType: 'APP_ERROR', reasonNote: 'The app failed to send the tap out.', requestedIn: null, requestedOut: '17:30', correctionStatus: 'PENDING_APPROVAL', submittedAt: '2026-07-29T19:10:00+07:00', decidedBy: null },
  { id: 'cor-3', attendanceDailyId: 'day-1', employeeId: 'emp-sari', correctionReasonType: 'OFFICIAL_TRAVEL', reasonNote: '', requestedIn: '07:30', requestedOut: '16:30', correctionStatus: 'APPROVED', submittedAt: '2026-07-27T18:20:00+07:00', decidedBy: 'emp-hendra' },
  { id: 'cor-4', attendanceDailyId: 'day-4', employeeId: 'emp-sari', correctionReasonType: 'OTHER', reasonNote: 'Sudden business trip without app access.', requestedIn: '09:00', requestedOut: null, correctionStatus: 'CANCELLED', submittedAt: '2026-07-30T20:00:00+07:00', decidedBy: null },
];

export function employeeName(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.name ?? '—';
}

export function employeeBranch(id: string): string {
  return EMPLOYEES.find((row) => row.id === id)?.branch ?? 'br-1';
}

/** Katalog cabang — dibaca dari service perusahaan, tidak disimpan di modul ini. */
export const BRANCHES = [
  { id: 'br-1', name: 'Kantor Pusat Jakarta' },
  { id: 'br-4', name: 'Kantor Cabang Makassar' },
  { id: 'br-5', name: 'Kantor Cabang Bandung' },
];

export function branchName(id: string): string {
  return BRANCHES.find((row) => row.id === id)?.name ?? id;
}
