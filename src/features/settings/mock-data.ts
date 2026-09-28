import type { SettingRow, SettingsActor, SetupOptions } from '@/features/settings/types';

/**
 * Dataset contoh Settings. Kode, default, dan domain nilai 26 setelan Waktu diambil dari katalog
 * `TSD-001-TIME-1.23` (tabel `setup_code | Nilai | Default`); nilai tenant PTDIKA yang sudah bergeser
 * mengikuti dataset UIC (`attendance.late_tolerance_minutes` 0 → 15 di riwayat, `leave.max_negative_balance_days` 2).
 * Batas `min`/`max` hanya yang dinyatakan dokumen — sisanya dibiarkan terbuka, bukan dikarang.
 */
const I = (min?: number, max?: number, satuan?: string): SetupOptions => ({ jenis: 'INTERVAL', min, max, satuan });
const BOOL: SetupOptions = { jenis: 'DAFTAR', pilihan: ['true', 'false'] };

const row = (
  setupCode: string,
  setupValue: SettingRow['setupValue'],
  setupOptions: SetupOptions | null,
  label: string | null,
  description: string | null = null,
): SettingRow => ({ setupCode, setupValue, setupOptions, label, description, isRetired: false });

export const SETTING_SEED: SettingRow[] = [
  // attendance. (5)
  row(
    'attendance.correction_approval_sla_workdays',
    [2],
    I(1, undefined, 'hari kerja'),
    'Correction approval deadline',
  ),
  row('attendance.correction_window_days', [7], I(0, undefined, 'hari'), 'Correction request window'),
  row('attendance.evidence_retention_days', [730], I(1, 3650, 'hari'), 'Attendance evidence retention'),
  row(
    'attendance.late_tolerance_minutes',
    [0],
    I(0, 60, 'menit'),
    'Late tolerance',
    'Toleransi keterlambatan sebelum tercatat sebagai TERLAMBAT.',
  ),
  row('attendance.reconciliation_lookback_days', [7], I(1, undefined, 'hari'), null),
  // leave. (5)
  row(
    'leave.approval_extra_tier_approver',
    null,
    { jenis: 'DAFTAR', pilihan: ['HIGHER_MANAGER', 'HR', 'HIGHER_MANAGER,HR'] },
    'Extra approval tier',
    'Siapa lapis approval tambahan saat pemicu menyala — HIGHER_MANAGER,HR merangkai dua lapis berurutan.',
  ),
  row('leave.approval_extra_tier_threshold_days', [5], I(0, undefined, 'hari'), 'Extra tier threshold'),
  row('leave.approval_sla_workdays', [3], I(1, undefined, 'hari kerja'), 'Leave approval deadline'),
  row('leave.joint_leave_deducts_annual', ['true'], BOOL, 'Joint leave deducts annual leave'),
  row('leave.max_negative_balance_days', [2], I(0, undefined, 'hari'), 'Maximum negative balance'),
  // overtime. (6)
  row('overtime.approval_sla_workdays', [1], I(1, undefined, 'hari kerja'), 'Overtime approval deadline'),
  row(
    'overtime.max_hours_per_day',
    [4],
    I(0.5, undefined, 'jam'),
    'Daily overtime cap',
    'Plafon lembur harian (PP 35/2021).',
  ),
  row(
    'overtime.max_hours_per_week',
    [18],
    I(0.5, undefined, 'jam'),
    'Weekly overtime cap',
    'Plafon lembur mingguan (PP 35/2021).',
  ),
  row('overtime.min_minutes', [15], I(0, undefined, 'menit'), 'Minimum overtime'),
  row('overtime.retroactive_window_days', [2], I(0, undefined, 'hari'), 'Retroactive request window'),
  row('overtime.rounding_minutes', [15], I(1, undefined, 'menit'), 'Paid hours rounding'),
  // sick. (4)
  row('sick.doctor_note_required', ['true'], BOOL, 'Doctor note required'),
  row('sick.doctor_note_retention_days', [730], I(1, undefined, 'hari'), 'Doctor note retention'),
  row('sick.doctor_note_threshold_days', [2], I(0, undefined, 'hari'), 'Doctor note threshold'),
  row('sick.reject_window_days', [3], I(1, undefined, 'hari'), 'Sick leave rejection window'),
  // schedule. (3)
  row(
    'schedule.max_consecutive_work_days',
    [6],
    I(1, undefined, 'hari'),
    'Maximum consecutive work days',
    'Gerbang tukar shift — dasar UU Ketenagakerjaan (6+1 atau 5+2).',
  ),
  row('schedule.roster_materialization_horizon_days', [60], I(1, undefined, 'hari'), 'Roster materialization horizon'),
  row('schedule.swap_approval_sla_workdays', [2], I(1, undefined, 'hari kerja'), 'Swap approval deadline'),
  // oncall. (2)
  row('oncall.max_callout_hours_default', [4], I(0.5, undefined, 'jam'), 'Default call-out cap'),
  row('oncall.roster_approval_sla_workdays', [1], I(1, undefined, 'hari kerja'), 'On-call roster approval deadline'),
  // outbox. (1)
  row('outbox.published_retention_days', [7], I(1, undefined, 'hari'), null),
  // Karyawan (1) — enum milik employee-service, bukan pola R/O/D.
  row(
    'REPRIMAND_RULE',
    ['NON-ACTIVE'],
    { jenis: 'DAFTAR', pilihan: ['ACTIVE', 'NON-ACTIVE'] },
    'Reprimand rule',
    'Aktif/nonaktifnya mekanisme teguran di perusahaan ini.',
  ),
];

/** Baris milik platform — terkunci, TIDAK PERNAH ikut jawaban `A1` (FSD §1 `WKT-2`). */
export const LOCKED_CODES = ['settings.identity_retention_days'];

/** Judul tab dari `label_awalan`; bila kosong layar memakai awalan mentah (FSD §1.2). */
export const PREFIX_LABELS: Record<string, string | null> = {
  'attendance.': 'Attendance',
  'leave.': 'Leave',
  'overtime.': 'Overtime',
  'sick.': 'Sick leave',
  'schedule.': 'Schedule',
  'oncall.': 'On call',
  'outbox.': null,
};

export const SETTINGS_VIEWERS: SettingsActor[] = [
  { id: 'emp-hesti', label: 'Hesti Wulandari — HR Manager', role: 'ROLE_HR_MANAGER' },
  { id: 'emp-rina-amelia', label: 'Rina Amelia — Super Admin', role: 'ROLE_SUPER_ADMIN' },
  { id: 'hr-staff', label: 'HR Staff (read only)', role: 'ROLE_HR_STAFF' },
  { id: 'emp-budi', label: 'Budi Santoso — Finance Officer', role: 'ROLE_FINANCE_OFFICER' },
  { id: 'emp-yanti', label: 'Yanti Prasetya — Employee (no access)', role: 'ROLE_EMPLOYEE' },
];
