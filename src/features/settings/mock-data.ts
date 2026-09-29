import type {
  ErasureProgress,
  ErasureSubject,
  Jangkauan,
  KeadaanNilai,
  SettingRow,
  SettingsActor,
  SetupOptions,
  SetupValue,
} from '@/features/settings/types';

/**
 * Dataset contoh Settings — 76 baris (UIC §7: 26 Waktu + 27 Keuangan + 8 Penggajian + 7 Kinerja + 2 Produktivitas
 * + 2 Dokumen + 3 Organisasi + 1 Karyawan).
 *
 * Sumber kode & bawaan: Waktu `TSD-001-TIME-1.23`; Keuangan `TSD-001-FINANCE-0.45` §setelan (bawaan keputusan
 * USER); Penggajian FSD §3; Kinerja `TSD-001-PERFORMANCE-0.35` §14; Produktivitas FSD §5; Dokumen FSD §6 (nama
 * final `SET-51`); Organisasi UIC §2.4. Batas `min`/`max` hanya yang dinyatakan dokumen — sisanya dibiarkan
 * terbuka, bukan dikarang. `label` diisi sebagai asumsi tampilan (PROB-FRONTEND-034 — nilai kontrak menyusul).
 */
const I = (min?: number, max?: number, satuan?: string): SetupOptions => ({ jenis: 'INTERVAL', min, max, satuan });
const D = (...pilihan: string[]): SetupOptions => ({ jenis: 'DAFTAR', pilihan });
const BOOL = D('true', 'false');
/** Enum bernama yang pilihannya belum disusun pemilik makna — layar hanya merender nilai berlaku. */
const UNNAMED = D();

const row = (
  setupCode: string,
  setupValue: SettingRow['setupValue'],
  setupOptions: SetupOptions | null,
  label: string | null,
  description: string | null = null,
  extra: { keadaanNilai?: KeadaanNilai; pasanganKey?: string; jangkauan?: Jangkauan[] } = {},
): SettingRow => ({ setupCode, setupValue, setupOptions, label, description, isRetired: false, ...extra });

export const SETTING_SEED: SettingRow[] = [
  // ── Waktu · attendance. (5)
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
  // ── Waktu · leave. (5)
  row(
    'leave.approval_extra_tier_approver',
    null,
    D('HIGHER_MANAGER', 'HR', 'HIGHER_MANAGER,HR'),
    'Extra approval tier',
    'Siapa lapis approval tambahan saat pemicu menyala — HIGHER_MANAGER,HR merangkai dua lapis berurutan.',
  ),
  row('leave.approval_extra_tier_threshold_days', [5], I(0, undefined, 'hari'), 'Extra tier threshold'),
  row('leave.approval_sla_workdays', [3], I(1, undefined, 'hari kerja'), 'Leave approval deadline'),
  row('leave.joint_leave_deducts_annual', ['true'], BOOL, 'Joint leave deducts annual leave'),
  row('leave.max_negative_balance_days', [2], I(0, undefined, 'hari'), 'Maximum negative balance'),
  // ── Waktu · overtime. (6)
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
  // ── Waktu · sick. (4)
  row('sick.doctor_note_required', ['true'], BOOL, 'Doctor note required'),
  row('sick.doctor_note_retention_days', [730], I(1, undefined, 'hari'), 'Doctor note retention'),
  row('sick.doctor_note_threshold_days', [2], I(0, undefined, 'hari'), 'Doctor note threshold'),
  row('sick.reject_window_days', [3], I(1, undefined, 'hari'), 'Sick leave rejection window'),
  // ── Waktu · schedule. (3)
  row(
    'schedule.max_consecutive_work_days',
    [6],
    I(1, undefined, 'hari'),
    'Maximum consecutive work days',
    'Gerbang tukar shift — dasar UU Ketenagakerjaan (6+1 atau 5+2).',
  ),
  row('schedule.roster_materialization_horizon_days', [60], I(1, undefined, 'hari'), 'Roster materialization horizon'),
  row('schedule.swap_approval_sla_workdays', [2], I(1, undefined, 'hari kerja'), 'Swap approval deadline'),
  // ── Waktu · oncall. (2)
  row('oncall.max_callout_hours_default', [4], I(0.5, undefined, 'jam'), 'Default call-out cap'),
  row('oncall.roster_approval_sla_workdays', [1], I(1, undefined, 'hari kerja'), 'On-call roster approval deadline'),
  // ── Waktu · outbox. (1)
  row('outbox.published_retention_days', [7], I(1, undefined, 'hari'), null),

  // ── Keuangan · finance.benefit. (6) — keterangan belum diisi sapuan harian (FSD §2.2)
  row('finance.benefit.claim_backdate_limit_days', [90], I(undefined, undefined, 'hari'), 'Claim backdate limit'),
  row('finance.benefit.enabled', ['true'], BOOL, 'Benefit module enabled'),
  row('finance.benefit.grace_period_days', [14], I(undefined, undefined, 'hari'), 'Grace period after close'),
  row('finance.benefit.grade_change_recalc_enabled', ['false'], BOOL, 'Recalculate on grade change'),
  row(
    'finance.benefit.max_family_beneficiaries',
    [5],
    I(undefined, undefined, 'orang'),
    'Maximum family beneficiaries',
  ),
  row('finance.benefit.period_close_date', ['12-31'], I(undefined, undefined, 'MM-DD'), 'Benefit period close date'),
  // ── Keuangan · finance.loan. (14)
  row('finance.loan.arrears_treatment', ['SHIFT_BACKWARD'], UNNAMED, 'Arrears treatment'),
  row('finance.loan.early_settlement_allowed', ['true'], BOOL, 'Early settlement allowed'),
  row('finance.loan.early_settlement_fee_amount', [], I(), 'Early settlement fee amount'),
  row('finance.loan.early_settlement_fee_enabled', ['false'], BOOL, 'Early settlement fee'),
  row('finance.loan.early_settlement_fee_unit', [], UNNAMED, 'Early settlement fee unit'),
  row('finance.loan.enabled', ['true'], BOOL, 'Loan module enabled'),
  row('finance.loan.installment_start_point', ['NEAREST_PAYROLL'], UNNAMED, 'Installment start point'),
  row('finance.loan.interest_bearing', [], BOOL, 'Interest bearing'),
  row('finance.loan.max_active_count', [1], I(undefined, undefined, 'pinjaman'), 'Maximum active loans'),
  row('finance.loan.tenor_choice_pattern', [], UNNAMED, 'Tenor choice pattern'),
  row('finance.loan.tenor_custom_list', [6, 12], I(undefined, undefined, 'bulan'), 'Custom tenor list'),
  row('finance.loan.tenor_max_months', [24], I(undefined, undefined, 'bulan'), 'Longest tenor'),
  row('finance.loan.tenor_min_months', [6], I(undefined, undefined, 'bulan'), 'Shortest tenor'),
  row('finance.loan.tenor_mode', ['UNIFORM'], UNNAMED, 'Tenor mode'),
  // ── Keuangan · finance.cash_advance. (4)
  row('finance.cash_advance.enabled', ['false'], BOOL, 'Cash advance module enabled'),
  row('finance.cash_advance.max_outstanding_count', [1], I(undefined, undefined, 'uang muka'), 'Maximum outstanding'),
  row(
    'finance.cash_advance.second_stage_deadline_days',
    [30],
    I(undefined, undefined, 'hari'),
    'Second-stage deadline',
  ),
  row('finance.cash_advance.settlement_deadline_days', [14], I(undefined, undefined, 'hari'), 'Settlement deadline'),
  // ── Keuangan · finance. polos (3) — termasuk pengungsi `finance.retention.` (satu key, gugur jadi tab)
  row('finance.reinstate_outstanding_on_rehire', ['false'], BOOL, 'Reinstate outstanding on rehire'),
  row('finance.reminder_escalation_threshold_days', [3], I(undefined, undefined, 'hari'), 'Reminder escalation'),
  row('finance.retention.years', [2], I(undefined, undefined, 'tahun'), 'Finance data retention'),

  // ── Penggajian · payroll. (8) — label sudah terisi pemilik makna; `keadaan_nilai` dibaca apa adanya
  row('payroll.allow_lock_before_cutoff', ['false'], BOOL, 'Allow lock before cut-off', null, {
    keadaanNilai: 'BERLAKU',
  }),
  row(
    'payroll.bulk_change_escalation_count',
    [],
    I(0, undefined, 'perubahan'),
    'Bulk change escalation',
    'Eskalasi tidak berlaku selama kosong — keputusan, bukan ketiadaan.',
    { keadaanNilai: 'SENGAJA_KOSONG' },
  ),
  row(
    'payroll.closing_day_of_month',
    [21],
    I(1, 31, 'tanggal'),
    'Closing day of month',
    'Dibaca time, productivity, dan finance tiap permintaan.',
    { keadaanNilai: 'BERLAKU' },
  ),
  row('payroll.past_period_recheck_months', [3], I(undefined, undefined, 'bulan'), 'Past period recheck', null, {
    keadaanNilai: 'BERLAKU',
  }),
  row('payroll.prorate_basis', ['CALENDAR_DAYS'], UNNAMED, 'Proration basis', null, { keadaanNilai: 'BERLAKU' }),
  row('payroll.suspension_pay_mode', ['FULL'], D('FULL', 'PARTIAL', 'NONE'), 'Pay during suspension', null, {
    keadaanNilai: 'BERLAKU',
  }),
  row(
    'payroll.suspension_pay_percent',
    [],
    I(0, 100, '%'),
    'Suspension pay percent',
    'Dipakai hanya saat mode gaji skors PARTIAL.',
    { keadaanNilai: 'WAJIB_BERSYARAT', pasanganKey: 'payroll.suspension_pay_mode' },
  ),
  row('payroll.work_minutes_rounding', [0], I(undefined, undefined, 'menit'), 'Work minutes rounding', null, {
    keadaanNilai: 'BERLAKU',
  }),

  // ── Kinerja · performance. (7)
  row(
    'performance.additional_item_max_ratio',
    [30],
    I(undefined, undefined, '%'),
    'Additional item max ratio',
    'Ditolak di luar [0,100) — bukan dipaksa ke batas.',
  ),
  row(
    'performance.assessment_structure_id',
    ['7b3e9c10-0001-4c2a-9f00-000000000001'],
    null,
    'Assessment structure',
    'Penunjuk ke struktur penilaian — namanya hanya terbaca di Kelola Periode.',
  ),
  row('performance.objection_answer_deadline_days', [7], I(undefined, undefined, 'hari'), 'Objection answer deadline'),
  row('performance.objection_deadline_days', [14], I(undefined, undefined, 'hari'), 'Objection deadline'),
  row('performance.period_length_days', [365], I(undefined, undefined, 'hari'), 'Assessment period length', null, {
    keadaanNilai: 'BAWAAN_SEMENTARA',
  }),
  row('performance.return_quota', [1], I(undefined, undefined, 'kali'), 'Return quota'),
  row('performance.scale_length', [5], I(undefined, undefined, 'tingkat'), 'Scale length'),

  // ── Produktivitas · productivity. (2) — `jangkauan` medan kontrak sejak FRT-22
  row(
    'productivity.entry_window_days',
    [7],
    I(undefined, undefined, 'hari'),
    'Time entry window',
    'Batas mundur pengisian & penyuntingan catatan waktu.',
    {
      jangkauan: [
        { modul: 'Timesheet', gerbang: 'Batas mengisi-mundur catatan waktu' },
        { modul: 'Timesheet', gerbang: 'Batas menyunting catatan waktu' },
        { modul: 'Task', gerbang: 'Batas membuka-kembali task' },
      ],
    },
  ),
  row(
    'productivity.task_due_reminder_days',
    [3],
    I(undefined, undefined, 'hari'),
    'Task due reminder',
    'Jarak pengingat sebelum tenggat.',
    {
      jangkauan: [
        { modul: 'Task', gerbang: 'Pengingat sebelum tenggat task' },
        { modul: 'Forms & Survey', gerbang: 'Pengingat sebelum tenggat formulir wajib' },
      ],
    },
  ),

  // ── Dokumen · document. (2) — nilai & jenis penawaran belum tersusun (FSD §6 batas 3)
  row('document.storage_quota_bytes', [], null, 'Storage quota', 'Jatah penyimpanan berkas perusahaan, dalam byte.'),
  row(
    'document.storage_quota_warning_percent',
    [],
    null,
    'Storage quota warning',
    'Ambang peringatan pemakaian jatah penyimpanan.',
  ),

  // ── Organisasi (3) — seluruhnya DAFTAR; dua berpola R/O/D
  row('BRANCH_HIERARCHY_MODE', ['DISABLED'], D('ENABLED', 'DISABLED'), 'Branch hierarchy'),
  row('COST_CENTER_ASSIGNMENT_MODE', ['OPTIONAL'], D('REQUIRED', 'OPTIONAL', 'DISABLED'), 'Cost center assignment'),
  row('SBU_ASSIGNMENT_MODE', ['OPTIONAL'], D('REQUIRED', 'OPTIONAL', 'DISABLED'), 'SBU assignment'),

  // ── Karyawan (1) — enum milik employee-service, bukan pola R/O/D.
  row(
    'REPRIMAND_RULE',
    ['NON-ACTIVE'],
    D('ACTIVE', 'NON-ACTIVE'),
    'Reprimand rule',
    'Aktif/nonaktifnya mekanisme teguran di perusahaan ini.',
  ),
];

/** Baris milik platform — terkunci, TIDAK PERNAH ikut jawaban `A1` (FSD §1 `WKT-2`), tetapi tampil di Riwayat. */
export const LOCKED_CODES = ['settings.identity_retention_days'];

/** Judul Sub Menu dari `label_awalan`; urutan kunci = urutan tab peta menu beku. Bila null → awalan mentah. */
export const PREFIX_LABELS: Record<string, string | null> = {
  'attendance.': 'Attendance',
  'leave.': 'Leave',
  'overtime.': 'Overtime',
  'sick.': 'Sick leave',
  'schedule.': 'Schedule',
  'oncall.': 'On call',
  'outbox.': null,
  'finance.benefit.': 'Benefit',
  'finance.loan.': 'Loan',
  'finance.cash_advance.': 'Cash advance',
  'finance.': 'General',
};

/** Setelan berpola R/O/D — satu-satunya pemakai `confirm_transition` (UIC §2.4). */
export const ROD_CODES = ['COST_CENTER_ASSIGNMENT_MODE', 'SBU_ASSIGNMENT_MODE'];

/**
 * Deretan majemuk (chip berulang). Kontrak nol punya penanda cacah (PROB-FRONTEND-036); daftar ini dipegang
 * layar agar `[6,12,24]` tidak pernah dipipihkan jadi satu angka.
 */
export const MULTI_VALUE_CODES = ['finance.loan.tenor_custom_list'];

/** Penunjuk — seharusnya PICKER, hari ini isian bebas (PROB-FRONTEND-038). */
export const POINTER_CODES = ['performance.assessment_structure_id'];

/**
 * Keterangan TURUNAN dokumen sumber, bukan medan kontrak `A1` (FSD §4.2 & §5.2) — dirender sebagai badge
 * berlabel asal agar tidak dikira jawaban server.
 */
export const SCREEN_NOTES: Record<string, { label: string; tone: 'brand' | 'info' | 'warn' | 'mute' }[]> = {
  'performance.assessment_structure_id': [{ label: 'Pointer', tone: 'brand' }],
  'performance.period_length_days': [{ label: 'Frozen when a period opens', tone: 'info' }],
  'performance.scale_length': [{ label: 'Frozen when a period opens', tone: 'info' }],
  'performance.objection_deadline_days': [
    { label: 'Temporary value', tone: 'warn' },
    { label: 'Frozen when a score is approved', tone: 'info' },
  ],
  'performance.objection_answer_deadline_days': [
    { label: 'Temporary value', tone: 'warn' },
    { label: 'Frozen when a score is approved', tone: 'info' },
  ],
  'productivity.entry_window_days': [{ label: 'Default fixed', tone: 'mute' }],
  'productivity.task_due_reminder_days': [{ label: 'Temporary value', tone: 'warn' }],
};

/**
 * Gerbang REQUIRED membaca VIEW `setup.vw_employee_assignment_gap`. Keadaan HARI INI: VIEW belum digelar di
 * perusahaan mana pun ⇒ transisi ke REQUIRED selalu `500` (FSD `ORG-6`). Angka gap = proyeksi setelah digelar.
 */
export const ASSIGNMENT_GAP = {
  viewProvisioned: false,
  activeEmployees: 240,
  gaps: { COST_CENTER_ASSIGNMENT_MODE: 37, SBU_ASSIGNMENT_MODE: 0 } as Record<string, number>,
};

export const SETTINGS_VIEWERS: SettingsActor[] = [
  {
    id: 'emp-hesti',
    label: 'Hesti Wulandari — HR Manager',
    role: 'ROLE_HR_MANAGER',
    nama: 'Hesti Wulandari',
    nik: '20220301',
  },
  {
    id: 'emp-rina-amelia',
    label: 'Rina Amelia — Super Admin',
    role: 'ROLE_SUPER_ADMIN',
    nama: 'Rina Amelia',
    nik: '20210715',
  },
  { id: 'hr-staff', label: 'HR Staff (read only)', role: 'ROLE_HR_STAFF', nama: 'HR Staff', nik: '-' },
  {
    id: 'emp-budi',
    label: 'Budi Santoso — Finance Officer',
    role: 'ROLE_FINANCE_OFFICER',
    nama: 'Budi Santoso',
    nik: '20190112',
  },
  {
    id: 'emp-dedi',
    label: 'Dedi Kurniawan — Payroll Officer',
    role: 'ROLE_PAYROLL_OFFICER',
    nama: 'Dedi Kurniawan',
    nik: '20200903',
  },
  {
    id: 'emp-agung',
    label: 'Agung Nugroho — Department Manager',
    role: 'ROLE_DEPARTMENT_MANAGER',
    nama: 'Agung Nugroho',
    nik: '20220815',
  },
  { id: 'system-admin', label: 'System Admin (read only)', role: 'ROLE_SYSTEM_ADMIN', nama: 'System Admin', nik: '-' },
  {
    id: 'emp-yanti',
    label: 'Yanti Prasetya — Employee (no access)',
    role: 'ROLE_EMPLOYEE',
    nama: 'Yanti Prasetya',
    nik: '20230411',
  },
];

/* ── Riwayat Perubahan — baris versi awal ────────────────────────────────────────────────────── */

export const DEPLOYED_AT = '2026-01-05T02:00:00+07:00';

export type HistoryActor = { kind: 'SYSTEM' } | { kind: 'ANONYMIZED' } | { kind: 'HUMAN'; employeeId: string };

/**
 * Setelan yang nilainya sudah bergeser sejak digelar. Entri pertama = versi 1; nilai terakhir wajib sama dengan
 * `SETTING_SEED` (dicek di pengujian). Setelan lain hanya punya versi 1 (SISTEM, saat penggelaran).
 */
export const VERSION_HISTORY: Record<string, { value: SetupValue[]; at: string; by: HistoryActor }[]> = {
  'payroll.closing_day_of_month': [
    { value: [25], at: DEPLOYED_AT, by: { kind: 'SYSTEM' } },
    { value: [21], at: '2026-07-14T10:32:11+07:00', by: { kind: 'HUMAN', employeeId: 'emp-rina-amelia' } },
  ],
  'leave.max_negative_balance_days': [
    { value: [0], at: DEPLOYED_AT, by: { kind: 'SYSTEM' } },
    { value: [2], at: '2026-03-11T08:45:00+07:00', by: { kind: 'ANONYMIZED' } },
  ],
  'overtime.max_hours_per_week': [
    { value: [14], at: DEPLOYED_AT, by: { kind: 'SYSTEM' } },
    { value: [18], at: '2026-02-10T13:20:00+07:00', by: { kind: 'HUMAN', employeeId: 'emp-rina-amelia' } },
  ],
  COST_CENTER_ASSIGNMENT_MODE: [
    { value: ['OPTIONAL'], at: DEPLOYED_AT, by: { kind: 'SYSTEM' } },
    { value: ['DISABLED'], at: '2026-04-02T09:05:00+07:00', by: { kind: 'HUMAN', employeeId: 'emp-hesti' } },
    { value: ['OPTIONAL'], at: '2026-04-20T15:40:00+07:00', by: { kind: 'HUMAN', employeeId: 'emp-hesti' } },
  ],
  REPRIMAND_RULE: [
    { value: ['ACTIVE'], at: DEPLOYED_AT, by: { kind: 'SYSTEM' } },
    { value: ['NON-ACTIVE'], at: '2026-05-18T11:12:00+07:00', by: { kind: 'HUMAN', employeeId: 'emp-hesti' } },
  ],
  'productivity.task_due_reminder_days': [
    { value: [2], at: DEPLOYED_AT, by: { kind: 'SYSTEM' } },
    { value: [3], at: '2026-08-05T01:00:00+07:00', by: { kind: 'SYSTEM' } },
  ],
  // Baris terkunci — perubahan platform atas dirinya tetap tampil bagi dua peran tertinggi (RIW-5).
  'settings.identity_retention_days': [
    { value: [365], at: DEPLOYED_AT, by: { kind: 'SYSTEM' } },
    { value: [730], at: '2026-06-01T01:00:00+07:00', by: { kind: 'SYSTEM' } },
  ],
};

/* ── Permintaan Penghapusan Data ─────────────────────────────────────────────────────────────── */

/** Daftar tertutup empat belas penitip rezim `CD-047` (TSD §15.1, disegarkan SET-155). */
export const ERASURE_SERVICES = [
  'workflow',
  'time',
  'finance',
  'productivity',
  'performance',
  'payroll',
  'document',
  'settings',
  'notification',
  'insight',
  'company',
  'employee',
  'employee-profile',
  'auth',
];

export const ERASURE_TIMEZONES = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura', 'Asia/Singapore', 'UTC'];

/** PICKER `POST /employee/employees/search` berpenyaring `employment_status IN` — mantan karyawan ikut. */
export const ERASURE_SUBJECTS: ErasureSubject[] = [
  {
    employeeId: 'c8a1f2b3-0009-4a10-9c00-000000000009',
    nama: 'Sari Lestari',
    nik: '20180405',
    employmentStatus: 'RESIGNED',
  },
  {
    employeeId: 'c8a1f2b3-0011-4a10-9c00-000000000011',
    nama: 'Bambang Hartono',
    nik: '20170822',
    employmentStatus: 'RESIGNED',
  },
  {
    employeeId: 'c8a1f2b3-0014-4a10-9c00-000000000014',
    nama: 'Dewi Anggraini',
    nik: '20190310',
    employmentStatus: 'TERMINATED',
  },
  {
    employeeId: 'c8a1f2b3-0017-4a10-9c00-000000000017',
    nama: 'Rudi Hermawan',
    nik: '20200617',
    employmentStatus: 'ACTIVE',
  },
  {
    employeeId: 'c8a1f2b3-0021-4a10-9c00-000000000021',
    nama: 'Nur Aisyah',
    nik: '20160128',
    employmentStatus: 'RESIGNED',
  },
];

/** Subjek yang identitasnya sudah disamarkan — nama/NIK terbaca `ANONYMIZED` (hasil benar, bukan galat). */
export const ANONYMIZED_SUBJECT_ID = 'c8a1f2b3-0003-4a10-9c00-000000000003';

const done = (serviceCode: string, count: number, broadcast: string, completed: string): ErasureProgress => ({
  serviceCode,
  progressStatus: 'COMPLETED',
  broadcastCount: count,
  lastBroadcastAt: broadcast,
  completedAt: completed,
});
const open = (serviceCode: string, status: 'PENDING' | 'HELD', count: number, broadcast: string | null) => ({
  serviceCode,
  progressStatus: status,
  broadcastCount: count,
  lastBroadcastAt: broadcast,
  completedAt: null,
});

export interface ErasureSeed {
  id: string;
  employeeId: string;
  requestedAt: string;
  requestedAtTimezone: string;
  createdAt: string;
  createdByEmployeeId: string;
  progress: ErasureProgress[];
}

export const ERASURE_SEED: ErasureSeed[] = [
  {
    id: 'e5f6a7b8-0001-4a10-9c00-000000000001',
    employeeId: 'c8a1f2b3-0009-4a10-9c00-000000000009',
    requestedAt: '2026-08-08T00:00:00+07:00',
    requestedAtTimezone: 'Asia/Jakarta',
    createdAt: '2026-08-12T09:28:00+07:00',
    createdByEmployeeId: 'emp-hesti',
    progress: [
      done('workflow', 3, '2026-08-15T02:00:00+07:00', '2026-08-15T04:12:00+07:00'),
      done('time', 3, '2026-08-15T02:00:00+07:00', '2026-08-15T04:55:00+07:00'),
      done('finance', 3, '2026-08-15T02:00:00+07:00', '2026-08-15T05:40:00+07:00'),
      done('productivity', 3, '2026-08-15T02:00:00+07:00', '2026-08-15T06:20:00+07:00'),
      done('performance', 4, '2026-08-16T02:00:00+07:00', '2026-08-16T03:05:00+07:00'),
      open('payroll', 'HELD', 9, '2026-08-21T02:00:00+07:00'),
      done('document', 5, '2026-08-17T02:00:00+07:00', '2026-08-17T09:30:00+07:00'),
      open('settings', 'PENDING', 12, '2026-08-24T02:00:00+07:00'),
      open('notification', 'PENDING', 0, null),
      done('insight', 1, '2026-08-13T02:00:00+07:00', '2026-08-13T02:00:00+07:00'),
      open('company', 'PENDING', 0, null),
      open('employee', 'PENDING', 0, null),
      open('employee-profile', 'PENDING', 0, null),
      open('auth', 'PENDING', 2, '2026-08-24T02:00:00+07:00'),
    ],
  },
  {
    id: 'e5f6a7b8-0002-4a10-9c00-000000000002',
    employeeId: 'c8a1f2b3-0011-4a10-9c00-000000000011',
    requestedAt: '2026-05-02T00:00:00+07:00',
    requestedAtTimezone: 'Asia/Jakarta',
    createdAt: '2026-05-04T10:15:00+07:00',
    createdByEmployeeId: 'emp-rina-amelia',
    progress: ERASURE_SERVICES.map((code, index) =>
      done(code, 2, '2026-05-10T02:00:00+07:00', `2026-05-${String(10 + (index % 9)).padStart(2, '0')}T06:00:00+07:00`),
    ),
  },
  {
    id: 'e5f6a7b8-0003-4a10-9c00-000000000003',
    employeeId: ANONYMIZED_SUBJECT_ID,
    requestedAt: '2026-02-10T00:00:00+07:00',
    requestedAtTimezone: 'Asia/Makassar',
    createdAt: '2026-02-11T08:02:00+07:00',
    createdByEmployeeId: 'emp-hesti',
    progress: ERASURE_SERVICES.map((code) => done(code, 1, '2026-02-15T02:00:00+07:00', '2026-03-01T02:30:00+07:00')),
  },
];
