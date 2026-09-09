// ============================================================
// SEVAKA HRIS — Time Management service: shared dataset
// Sourced from FSD-001-TIME-0.1 / UIC-001-TIME-0.1 / ERD-001-TIME-0.4
// (Dataset Skenario Positif — identities & values are taken from the
// contract examples; nothing invented beyond documented extensions).
// ============================================================
(function () {
  'use strict';

  var EMPLOYEES = [
    { id: 'emp-rina',   name: 'Rina Wulandari', nik: '3175056001990002', unit: 'Finance',     branch: 'br-1', role: 'Staff' },
    { id: 'emp-hendra', name: 'Hendra Kusuma',  nik: '3175056203850001', unit: 'Finance',     branch: 'br-1', role: 'HR Manager' },
    { id: 'emp-sari',   name: 'Sari Kartika',   nik: '3175054503920007', unit: 'Operations',  branch: 'br-1', role: 'Staff' },
    { id: 'emp-budi',   name: 'Budi Santoso',   nik: '3175051105870004', unit: 'Operations',  branch: 'br-4', role: 'Supervisor' },
    { id: 'emp-sys',    name: 'SYSTEM',         nik: '-',                unit: '-',           branch: '-',    role: 'System' }
  ];

  var BRANCHES = [
    { id: 'br-1', name: 'Kantor Pusat Jakarta' },
    { id: 'br-4', name: 'Kantor Cabang Makassar' }
  ];

  var UNITS = [
    { id: 'unit-fin', name: 'Finance' },
    { id: 'unit-ops', name: 'Operations' }
  ];

  var LEAVE_TYPES = [
    { id: 'lt-annual', leave_code: 'CUTI-TAHUNAN', leave_name: 'Cuti Tahunan', is_statutory: true,  is_paid: true,  affects_balance: true,  requires_document: false, requires_approval: true, requires_extra_approval: true,  min_advance_days: 3, is_active: true },
    { id: 'lt-sick',   leave_code: 'SAKIT',        leave_name: 'Sakit',        is_statutory: true,  is_paid: true,  affects_balance: true,  requires_document: true,  requires_approval: false, requires_extra_approval: false, min_advance_days: 0, is_active: true },
    { id: 'lt-unpaid', leave_code: 'UNPAID',       leave_name: 'Cuti Tanpa Gaji', is_statutory: false, is_paid: false, affects_balance: false, requires_document: false, requires_approval: true, requires_extra_approval: true, min_advance_days: 3, is_active: true }
  ];

  var HOLIDAYS = [
    { id: 'hol-1', holiday_date: '2026-08-17', holiday_name: 'Hari Kemerdekaan RI ke-81', holiday_type: 'NATIONAL', scope_level: null, scope_ref: null, is_joint_leave: false, is_system: true,  source: 'Keppres RI No. 12/2026', approval_status: 'APPROVED', created_by: 'emp-sys' },
    { id: 'hol-2', holiday_date: '2026-12-24', holiday_name: 'Cuti Bersama Natal',        holiday_type: 'NATIONAL', scope_level: null, scope_ref: null, is_joint_leave: true,  is_system: true,  source: 'SKB 3 Menteri 2026', approval_status: 'APPROVED', created_by: 'emp-sys' },
    { id: 'hol-3', holiday_date: '2026-12-26', holiday_name: 'Cuti Bersama Natal (Internal)', holiday_type: 'COMPANY', scope_level: null, scope_ref: null, is_joint_leave: false, is_system: false, source: 'SE Direksi No. 08/2026', approval_status: 'APPROVED', created_by: 'emp-hendra', approved_by: 'emp-hendra', approved_at: '2026-11-01T10:00:00+07:00' },
    { id: 'hol-4', holiday_date: '2026-08-18', holiday_name: 'Anniversary Cabang Jakarta', holiday_type: 'REGIONAL', scope_level: 'LOCATION', scope_ref: 'br-1', is_joint_leave: false, is_system: false, source: 'SE HR Cabang Jakarta', approval_status: 'PENDING_APPROVAL', created_by: 'emp-rina' },
    { id: 'hol-7', holiday_date: '2026-10-05', holiday_name: 'HUT Perusahaan', holiday_type: 'COMPANY', scope_level: null, scope_ref: null, is_joint_leave: false, is_system: false, source: 'SE Direksi No. 11/2026', approval_status: 'PENDING_APPROVAL', created_by: 'emp-hendra' },
    { id: 'hol-5', holiday_date: '2026-09-01', holiday_name: 'HUT Unit Operations',        holiday_type: 'REGIONAL', scope_level: 'UNIT', scope_ref: 'unit-ops', is_joint_leave: false, is_system: false, source: '', approval_status: 'DRAFT', created_by: 'emp-hendra' },
    { id: 'hol-6', holiday_date: '2026-06-01', holiday_name: 'Family Gathering Makassar',  holiday_type: 'REGIONAL', scope_level: 'LOCATION', scope_ref: 'br-4', is_joint_leave: false, is_system: false, source: 'Nota Dinas 14/VI/2026', approval_status: 'REJECTED', created_by: 'emp-hendra', approved_by: 'emp-hendra' }
  ];

  var WORK_CALENDARS = [
    { id: 'wc-1', calendar_name: 'Kantor Pusat Senin-Jumat', scope_level: 'COMPANY',  scope_ref: null,   working_days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }, effective_from: '2026-01-01', effective_until: null,        created_by: 'emp-sys' },
    { id: 'wc-2', calendar_name: 'Operations 6 Hari Kerja',  scope_level: 'UNIT',     scope_ref: 'unit-ops', working_days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: true, sun: false }, effective_from: '2026-03-01', effective_until: null,        created_by: 'emp-hendra' },
    { id: 'wc-3', calendar_name: 'Cabang Makassar 2025',     scope_level: 'LOCATION', scope_ref: 'br-4', working_days: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }, effective_from: '2025-01-01', effective_until: '2025-12-31', created_by: 'emp-hendra' }
  ];

  var LEAVE_REQUESTS = [
    { id: 'leave-1', employee_id: 'emp-rina', leave_type_id: 'lt-annual', day_session: 'FULL', start_date: '2026-07-20', end_date: '2026-07-21', total_days: 2, request_reason: 'Menghadiri pernikahan saudara di Yogyakarta.', has_doctor_note: false, request_status: 'APPROVED', requires_extra_approval_reason: null, reject_deadline_at: null, reject_reason: null, submitted_at: '2026-07-15T10:00:00+07:00', approved_by: 'emp-hendra', approved_at: '2026-07-16T14:00:00+07:00' },
    { id: 'leave-2', employee_id: 'emp-rina', leave_type_id: 'lt-sick', day_session: 'FULL', start_date: '2026-07-24', end_date: '2026-07-24', total_days: 1, request_reason: '', has_doctor_note: true, doctor_note_purged: false, request_status: 'AUTO_APPROVED', requires_extra_approval_reason: null, reject_deadline_at: '2026-07-25T23:59:59+07:00', reject_reason: null, submitted_at: '2026-07-24T07:30:00+07:00', approved_by: null, approved_at: '2026-07-24T07:30:00+07:00' },
    { id: 'leave-3', employee_id: 'emp-rina', leave_type_id: 'lt-annual', day_session: 'HALF_AM', start_date: '2026-08-10', end_date: '2026-08-10', total_days: 0.5, request_reason: 'Mengurus dokumen keluarga.', has_doctor_note: false, request_status: 'PENDING_APPROVAL', requires_extra_approval_reason: null, reject_deadline_at: null, reject_reason: null, submitted_at: '2026-07-27T08:30:00+07:00', approved_by: null, approved_at: null },
    { id: 'leave-4', employee_id: 'emp-hendra', leave_type_id: 'lt-annual', day_session: 'FULL', start_date: '2026-08-03', end_date: '2026-08-05', total_days: 3, request_reason: 'Cuti tahunan bersama keluarga.', has_doctor_note: false, request_status: 'APPROVED', requires_extra_approval_reason: null, reject_deadline_at: null, reject_reason: null, submitted_at: '2026-07-17T09:00:00+07:00', approved_by: 'emp-budi', approved_at: '2026-07-19T11:00:00+07:00' },
    { id: 'leave-8', employee_id: 'emp-sari', leave_type_id: 'lt-annual', day_session: 'HALF_AM', start_date: '2026-08-05', end_date: '2026-08-05', total_days: 0.5, request_reason: 'Mengurus administrasi sekolah anak.', has_doctor_note: false, request_status: 'PENDING_APPROVAL', requires_extra_approval_reason: 'NEGATIVE_BALANCE', reject_deadline_at: null, reject_reason: null, submitted_at: '2026-07-22T09:10:00+07:00', approved_by: null, approved_at: null },
    { id: 'leave-5', employee_id: 'emp-budi', leave_type_id: 'lt-unpaid', day_session: 'FULL', start_date: '2026-07-06', end_date: '2026-07-08', total_days: 3, request_reason: 'Keperluan keluarga di luar kota.', has_doctor_note: false, request_status: 'REJECTED', requires_extra_approval_reason: 'UNPAID_TYPE', reject_deadline_at: null, reject_reason: 'Beban tim minggu tersebut tidak dapat ditinggalkan.', submitted_at: '2026-06-28T11:00:00+07:00', approved_by: 'emp-hendra', approved_at: '2026-06-29T09:00:00+07:00' },
    { id: 'leave-7', employee_id: 'emp-hendra', leave_type_id: 'lt-annual', day_session: 'FULL', start_date: '2026-09-14', end_date: '2026-09-16', total_days: 3, request_reason: 'Cuti tahunan — perjalanan keluarga.', has_doctor_note: false, request_status: 'PENDING_APPROVAL', requires_extra_approval_reason: null, reject_deadline_at: null, reject_reason: null, submitted_at: '2026-07-20T08:00:00+07:00', approved_by: null, approved_at: null },
    { id: 'leave-6', employee_id: 'emp-sari', leave_type_id: 'lt-sick', day_session: 'FULL', start_date: '2026-07-13', end_date: '2026-07-14', total_days: 2, request_reason: '', has_doctor_note: true, doctor_note_purged: true, request_status: 'CANCELLED', requires_extra_approval_reason: null, reject_deadline_at: '2026-07-15T23:59:59+07:00', reject_reason: null, submitted_at: '2026-07-13T07:15:00+07:00', approved_by: null, approved_at: '2026-07-13T07:15:00+07:00' }
  ];

  var DELEGATIONS = [
    { id: 'deleg-1', leave_request_id: 'leave-4', delegator_id: 'emp-hendra', substitute_id: 'emp-sari', delegation_scope: 'ALL_APPROVALS', delegation_status: 'APPROVED', created_at: '2026-07-18T10:05:00+07:00' },
    { id: 'deleg-2', leave_request_id: 'leave-7', delegator_id: 'emp-hendra', substitute_id: 'emp-budi', delegation_scope: 'ALL_APPROVALS', delegation_status: 'PENDING_APPROVAL', created_at: '2026-07-21T09:00:00+07:00' }
  ];

  var MEDICAL_ACCESS = [
    { id: 'access-1', leave_request_id: 'leave-2', accessed_by: 'emp-hendra', access_purpose: 'VERIFICATION', created_at: '2026-07-24T10:15:00+07:00' },
    { id: 'access-2', leave_request_id: 'leave-6', accessed_by: 'emp-hendra', access_purpose: 'AUDIT',        created_at: '2026-07-14T16:05:00+07:00' }
  ];

  var LEAVE_BALANCES = [
    { id: 'bal-rina-annual-2026',  employee_id: 'emp-rina',  leave_type_id: 'lt-annual', period_year: 2026, balance_days: 11.00, projected_days: 16.00 },
    { id: 'bal-rina-sick-2026',    employee_id: 'emp-rina',  leave_type_id: 'lt-sick',   period_year: 2026, balance_days: 10.00, projected_days: 10.00 },
    { id: 'bal-sari-annual-2026',  employee_id: 'emp-sari',  leave_type_id: 'lt-annual', period_year: 2026, balance_days: -1.50, projected_days: 3.50 },
    { id: 'bal-budi-annual-2026',  employee_id: 'emp-budi',  leave_type_id: 'lt-annual', period_year: 2026, balance_days: 7.00,  projected_days: 12.00 },
    { id: 'bal-hendra-annual-2026', employee_id: 'emp-hendra', leave_type_id: 'lt-annual', period_year: 2026, balance_days: 14.00, projected_days: 19.00 }
  ];

  var LEDGER = [
    { id: 'ledger-1', employee_id: 'emp-rina', leave_type_id: 'lt-annual', period_year: 2026, mutation_date: '2026-07-01', delta_days: 1.00,  mutation_source: 'ACCRUAL_MONTHLY', ref_id: null,      reason: 'Accrual bulanan Juli 2026', created_at: '2026-07-01T01:00:00+07:00', created_by: 'emp-sys' },
    { id: 'ledger-2', employee_id: 'emp-rina', leave_type_id: 'lt-annual', period_year: 2026, mutation_date: '2026-07-20', delta_days: -2.00, mutation_source: 'LEAVE_TAKEN',      ref_id: 'leave-1', reason: 'Menghadiri pernikahan saudara di Yogyakarta.', created_at: '2026-07-16T14:00:05+07:00', created_by: 'emp-sys' },
    { id: 'ledger-3', employee_id: 'emp-sari', leave_type_id: 'lt-annual', period_year: 2026, mutation_date: '2026-07-01', delta_days: 1.00,  mutation_source: 'ACCRUAL_MONTHLY', ref_id: null,      reason: 'Accrual bulanan Juli 2026', created_at: '2026-07-01T01:00:00+07:00', created_by: 'emp-sys' },
    { id: 'ledger-4', employee_id: 'emp-sari', leave_type_id: 'lt-annual', period_year: 2026, mutation_date: '2026-06-30', delta_days: -3.00, mutation_source: 'LEAVE_TAKEN',      ref_id: null,      reason: 'Cuti tahunan Juni 2026.', created_at: '2026-06-25T10:00:00+07:00', created_by: 'emp-sys' },
    { id: 'ledger-5', employee_id: 'emp-budi', leave_type_id: 'lt-annual', period_year: 2026, mutation_date: '2026-01-01', delta_days: 6.00,  mutation_source: 'YEAR_END_CARRY_OVER', ref_id: null,    reason: 'Carry-over sisa jatah 2025 (dibatasi 6 hari).', created_at: '2026-01-01T02:00:00+07:00', created_by: 'emp-sys' },
    { id: 'ledger-6', employee_id: 'emp-rina', leave_type_id: 'lt-annual', period_year: 2026, mutation_date: '2026-12-24', delta_days: -1.00, mutation_source: 'JOINT_LEAVE',      ref_id: 'hol-2',   reason: 'Cuti bersama Natal 2026.', created_at: '2026-07-05T03:00:00+07:00', created_by: 'emp-sys' }
  ];

  var ACCRUAL_POLICIES = [
    { id: 'policy-annual-tetap', leave_type_id: 'lt-annual', work_status: 'Tetap', is_eligible: true, rate_per_month: 1.00, max_balance_days: 24, carry_over_policy: 'CARRY_CAPPED', carry_over_max_days: 6, carry_over_expiry_month_day: '03-31', effective_from: '2026-01-01', effective_until: null },
    { id: 'policy-annual-2025',  leave_type_id: 'lt-annual', work_status: 'Tetap', is_eligible: true, rate_per_month: 1.00, max_balance_days: 24, carry_over_policy: 'CARRY_FULL',   carry_over_max_days: null, carry_over_expiry_month_day: null, effective_from: '2025-01-01', effective_until: '2025-12-31' },
    { id: 'policy-sick-tetap',   leave_type_id: 'lt-sick',   work_status: 'Tetap', is_eligible: true, rate_per_month: 0.00, max_balance_days: 12, carry_over_policy: 'FORFEIT',      carry_over_max_days: null, carry_over_expiry_month_day: null, effective_from: '2026-01-01', effective_until: null }
  ];

  var BLACKOUTS = [
    { id: 'blackout-1', blackout_name: 'Blackout Akhir Tahun Fiskal', blackout_reason: 'Periode tutup buku — cuti tahunan ditahan kecuali darurat.', start_date: '2026-12-28', end_date: '2026-12-31', blackout_mode: 'SOFT', scope_ref: null },
    { id: 'blackout-2', blackout_name: 'Tutup Buku Akhir Tahun 2027', blackout_reason: 'Beban closing keuangan tak boleh ditinggalkan', start_date: '2027-12-29', end_date: '2027-12-31', blackout_mode: 'HARD', scope_ref: null }
  ];

  // ---------- attendance ----------
  var GEOFENCES = [
    // geo-1 = `geo-hq` of the UIC positive-scenario dataset (§7.2): radius 150, MOBILE enforce_radius false,
    // the same point the punch example §6.1.1 references — so DELETE on it is the documented 409 refusal.
    { id: 'geo-1', geofence_name: 'Kantor Pusat Jakarta — Gedung A', scope_ref: 'br-1', center_latitude: -6.224700, center_longitude: 106.809200, radius_meters: 150, is_active: true, used_by_punch: true,
      rules: { WFO: { radius: true, selfie: true }, HYBRID: { radius: true, selfie: true }, WFH: { radius: false, selfie: true }, MOBILE: { radius: false, selfie: true } } },
    { id: 'geo-2', geofence_name: 'Kantor Pusat Jakarta — Gedung B', scope_ref: 'br-1', center_latitude: -6.225100, center_longitude: 106.810000, radius_meters: 100, is_active: true, used_by_punch: false,
      rules: { WFO: { radius: true, selfie: true }, HYBRID: { radius: true, selfie: true }, WFH: { radius: false, selfie: true }, MOBILE: { radius: false, selfie: true } } },
    // geo-3 = `geo-mks-1`, the create-demo row of UIC §7.1 — never referenced by a tap, so DELETE succeeds on it.
    { id: 'geo-3', geofence_name: 'Kantor Cabang Makassar — Lobi Utama', scope_ref: 'br-4', center_latitude: -5.147700, center_longitude: 119.432700, radius_meters: 100, is_active: true, used_by_punch: false,
      rules: { WFO: { radius: true, selfie: true }, HYBRID: { radius: true, selfie: true }, WFH: { radius: false, selfie: true }, MOBILE: { radius: false, selfie: true } } }
  ];

  var PUNCHES = [
    { id: 'pun-1', employee_id: 'emp-hendra', punch_type: 'IN',  punch_at: '2026-07-27T08:02:00+07:00', work_date: '2026-07-27', is_within_geofence: true,  is_mock_location_suspected: false, is_work_arrangement_unknown: false, geofence_id: 'geo-1' },
    { id: 'pun-2', employee_id: 'emp-hendra', punch_type: 'OUT', punch_at: '2026-07-27T17:41:00+07:00', work_date: '2026-07-27', is_within_geofence: true,  is_mock_location_suspected: false, is_work_arrangement_unknown: false, geofence_id: 'geo-1' },
    { id: 'pun-3', employee_id: 'emp-hendra', punch_type: 'IN',  punch_at: '2026-07-28T08:47:00+07:00', work_date: '2026-07-28', is_within_geofence: false, is_mock_location_suspected: false, is_work_arrangement_unknown: false, geofence_id: 'geo-1' },
    { id: 'pun-4', employee_id: 'emp-hendra', punch_type: 'OUT', punch_at: '2026-07-28T17:12:00+07:00', work_date: '2026-07-28', is_within_geofence: true,  is_mock_location_suspected: false, is_work_arrangement_unknown: false, geofence_id: 'geo-1' },
    { id: 'pun-5', employee_id: 'emp-hendra', punch_type: 'IN',  punch_at: '2026-07-29T08:05:00+07:00', work_date: '2026-07-29', is_within_geofence: null,  is_mock_location_suspected: true,  is_work_arrangement_unknown: true,  geofence_id: null },
    { id: 'pun-6', employee_id: 'emp-sari',   punch_type: 'IN',  punch_at: '2026-07-29T09:20:00+07:00', work_date: '2026-07-29', is_within_geofence: true,  is_mock_location_suspected: false, is_work_arrangement_unknown: false, geofence_id: 'geo-1' }
  ];

  var DAILY = [
    { id: 'day-1', employee_id: 'emp-hendra', work_date: '2026-07-27', day_type: 'WORKDAY', work_arrangement: 'WFO',    expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'PRESENT',    worked_minutes: 519, late_minutes: 0,  undertime_minutes: 0,  is_excused: false, excused_reason: null },
    { id: 'day-2', employee_id: 'emp-hendra', work_date: '2026-07-28', day_type: 'WORKDAY', work_arrangement: 'WFO',    expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'LATE',       worked_minutes: 445, late_minutes: 32, undertime_minutes: 0,  is_excused: false, excused_reason: null },
    { id: 'day-3', employee_id: 'emp-hendra', work_date: '2026-07-29', day_type: 'WORKDAY', work_arrangement: 'HYBRID', expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'INCOMPLETE', worked_minutes: 0,   late_minutes: 0,  undertime_minutes: 0,  is_excused: false, excused_reason: null },
    { id: 'day-4', employee_id: 'emp-hendra', work_date: '2026-07-30', day_type: 'WORKDAY', work_arrangement: 'WFO',    expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'ABSENT',     worked_minutes: 0,   late_minutes: 0,  undertime_minutes: 480, is_excused: false, excused_reason: null },
    { id: 'day-rina-27', employee_id: 'emp-rina', work_date: '2026-07-27', day_type: 'WORKDAY', work_arrangement: 'WFO', expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'PRESENT', worked_minutes: 547, late_minutes: 5, undertime_minutes: 0, is_excused: true, excused_reason: 'APP_ERROR' },
    { id: 'day-rina-26', employee_id: 'emp-rina', work_date: '2026-07-26', day_type: 'WORKDAY', work_arrangement: 'WFO', expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'ABSENT', worked_minutes: 0, late_minutes: 0, undertime_minutes: 540, is_excused: false, excused_reason: null },
    { id: 'day-5', employee_id: 'emp-rina',   work_date: '2026-07-23', day_type: 'WORKDAY', work_arrangement: 'WFO',    expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'SICK',       worked_minutes: 0,   late_minutes: 0,  undertime_minutes: 0,  is_excused: false, excused_reason: null },
    { id: 'day-6', employee_id: 'emp-rina',   work_date: '2026-07-20', day_type: 'WORKDAY', work_arrangement: 'WFO',    expected_in: '08:00', expected_out: '17:00', applied_late_tolerance_minutes: 15, attendance_status: 'ON_LEAVE',   worked_minutes: 0,   late_minutes: 0,  undertime_minutes: 0,  is_excused: false, excused_reason: null },
    { id: 'day-7', employee_id: 'emp-sari',   work_date: '2026-07-26', day_type: 'WEEKLY_REST', work_arrangement: 'WFO', expected_in: null,   expected_out: null,    applied_late_tolerance_minutes: 0,  attendance_status: 'NOT_SCHEDULED', worked_minutes: 0, late_minutes: 0, undertime_minutes: 0, is_excused: false, excused_reason: null }
  ];

  var CORRECTIONS = [
    { id: 'cor-1', attendance_daily_id: 'day-rina-27', employee_id: 'emp-rina', correction_reason_type: 'FORGOT_PUNCH',  reason_note: 'Lupa tap pulang tanggal 26 Juli, HP mati baterai di perjalanan.', requested_in: null, requested_out: '17:05', correction_status: 'PENDING_APPROVAL', submitted_at: '2026-07-27T09:00:00+07:00', decided_by: null },
    { id: 'cor-2', attendance_daily_id: 'day-3', employee_id: 'emp-sari',   correction_reason_type: 'APP_ERROR',      reason_note: 'Aplikasi gagal mengirim tap keluar.', requested_in: null, requested_out: '17:30', correction_status: 'PENDING_APPROVAL', submitted_at: '2026-07-29T19:10:00+07:00', decided_by: null },
    { id: 'cor-3', attendance_daily_id: 'day-1', employee_id: 'emp-sari',   correction_reason_type: 'OFFICIAL_TRAVEL', reason_note: '', requested_in: '07:30', requested_out: '16:30', correction_status: 'APPROVED',  submitted_at: '2026-07-27T18:20:00+07:00', decided_by: 'emp-hendra' },
    { id: 'cor-4', attendance_daily_id: 'day-4', employee_id: 'emp-sari',   correction_reason_type: 'OTHER',          reason_note: 'Perjalanan dinas mendadak tanpa akses aplikasi.', requested_in: '09:00', requested_out: null, correction_status: 'CANCELLED', submitted_at: '2026-07-30T20:00:00+07:00', decided_by: null }
  ];

  // ---------- overtime ----------
  var OT_REQ = [
    // Dataset Skenario Positif UIC §8.1.1/§8.1.2/§8.1.4 — ot-1..ot-4 verbatim.
    { id: 'ot-1', employee_id: 'emp-rina',   overtime_date: '2026-07-29', submission_mode: 'PRE',         overtime_category: 'WORKDAY',     requested_hours: 2.00, approved_hours: 2.00, overtime_status: 'APPROVED',        requires_extra_approval_reason: null,                 request_reason: 'Menyelesaikan laporan bulanan.', submitted_at: '2026-07-27T09:00:00+07:00', approved_at: '2026-07-27T11:00:00+07:00', approved_by: 'emp-hendra', workflow_instance_id: 'wf-ot-1', is_auto: false, oncall_assignment_id: null },
    { id: 'ot-2', employee_id: 'emp-hendra', overtime_date: '2026-07-27', submission_mode: 'PRE',         overtime_category: 'WEEKLY_REST', requested_hours: null, approved_hours: 4.00, overtime_status: 'AUTO_APPROVED',   requires_extra_approval_reason: null,                 request_reason: null,                             submitted_at: '2026-07-27T22:00:00+07:00', approved_at: null, approved_by: null, workflow_instance_id: null, is_auto: true, oncall_assignment_id: 'oncall-1' },
    { id: 'ot-3', employee_id: 'emp-rina',   overtime_date: '2026-07-30', submission_mode: 'PRE',         overtime_category: 'WORKDAY',     requested_hours: 3.00, approved_hours: null, overtime_status: 'PENDING_APPROVAL', requires_extra_approval_reason: null,                request_reason: 'Persiapan tutup buku bulanan.',  submitted_at: '2026-07-27T14:00:00+07:00', approved_at: null, approved_by: null, workflow_instance_id: 'wf-ot-3', is_auto: false, oncall_assignment_id: null },
    { id: 'ot-4', employee_id: 'emp-rina',   overtime_date: '2026-07-25', submission_mode: 'RETROACTIVE', overtime_category: 'WORKDAY',     requested_hours: 6.00, approved_hours: null, overtime_status: 'PENDING_APPROVAL', requires_extra_approval_reason: 'DAILY_CAP_EXCEEDED', request_reason: 'Perbaikan mendadak sistem line produksi 2 — padam sejak sore.', submitted_at: '2026-07-27T13:00:00+07:00', approved_at: null, approved_by: null, workflow_instance_id: 'wf-ot-4', is_auto: false, oncall_assignment_id: null }
  ];

  var OT_DAILY = [
    { id: 'otd-hendra-0727', employee_id: 'emp-hendra', overtime_date: '2026-07-27', actual_hours: 3.50, approved_hours_total: 4.00, payable_hours: 3.50, overtime_category: 'WEEKLY_REST', overtime_request_id: 'ot-2' }
  ];

  // ---------- scheduler ----------
  var SHIFTS = [
    { id: 'sh-1', shift_code: 'PAGI',  shift_name: 'Shift Pagi',      shift_type: 'FIXED',  start_time: '08:00', end_time: '17:00', crosses_midnight: false, break_minutes: 60, is_active: true,  used_by_roster: true },
    { id: 'sh-2', shift_code: 'MALAM', shift_name: 'Shift Malam',     shift_type: 'FIXED',  start_time: '22:00', end_time: '06:00', crosses_midnight: true,  break_minutes: 45, is_active: true,  used_by_roster: true },
    { id: 'sh-3', shift_code: 'FLEX',  shift_name: 'Jam Fleksibel',   shift_type: 'FLEX',   start_time: null,    end_time: null,    crosses_midnight: false, break_minutes: 60, is_active: true,  used_by_roster: false },
    { id: 'sh-4', shift_code: 'ROT-3', shift_name: 'Rotasi 3 Hari',   shift_type: 'CYCLE',  start_time: null,    end_time: null,    crosses_midnight: false, break_minutes: 0,  is_active: false, used_by_roster: false }
  ];

  var ASSIGN = [
    { id: 'as-1', employee_id: 'emp-rina',   work_date: '2026-07-27', shift_id: 'sh-1', is_off_day: false, assignment_source: 'INDIVIDUAL' },
    { id: 'as-2', employee_id: 'emp-rina',   work_date: '2026-07-28', shift_id: 'sh-1', is_off_day: false, assignment_source: 'BULK' },
    { id: 'as-3', employee_id: 'emp-rina',   work_date: '2026-07-29', shift_id: null,   is_off_day: true,  assignment_source: 'BULK' },
    { id: 'as-4', employee_id: 'emp-sari',   work_date: '2026-07-27', shift_id: 'sh-2', is_off_day: false, assignment_source: 'BULK' },
    { id: 'as-5', employee_id: 'emp-sari',   work_date: '2026-07-28', shift_id: 'sh-2', is_off_day: false, assignment_source: 'BULK' },
    { id: 'as-6', employee_id: 'emp-sari',   work_date: '2026-07-29', shift_id: 'sh-1', is_off_day: false, assignment_source: 'SWAP' },
    { id: 'as-7', employee_id: 'emp-budi',   work_date: '2026-07-27', shift_id: 'sh-1', is_off_day: false, assignment_source: 'BULK' },
    { id: 'as-8', employee_id: 'emp-budi',   work_date: '2026-07-28', shift_id: null,   is_off_day: true,  assignment_source: 'INDIVIDUAL' },
    { id: 'as-9', employee_id: 'emp-hendra', work_date: '2026-07-27', shift_id: 'sh-1', is_off_day: false, assignment_source: 'BULK' }
  ];

  var SWAPS = [
    { id: 'sw-1', requester_assignment_id: 'as-1', counterpart_assignment_id: 'as-4', swap_status: 'PENDING_APPROVAL', submitted_at: '2026-07-24T10:00:00+07:00', approved_by: null },
    { id: 'sw-2', requester_assignment_id: 'as-2', counterpart_assignment_id: 'as-5', swap_status: 'APPROVED',         submitted_at: '2026-07-22T09:00:00+07:00', approved_by: 'emp-hendra' },
    { id: 'sw-3', requester_assignment_id: 'as-7', counterpart_assignment_id: 'as-9', swap_status: 'REJECTED',         submitted_at: '2026-07-21T14:00:00+07:00', approved_by: 'emp-hendra' }
  ];

  // ---------- on call ----------
  var ONCALL = [
    // Seed UIC-001-TIME §11.1 verbatim (oncall-1/2) + contoh gerbang pagu K38 (oncall-3).
    { id: 'oncall-1', employee_id: 'emp-hendra', standby_start_at: '2026-07-27T21:00:00+07:00', standby_end_at: '2026-07-28T06:00:00+07:00', max_callout_hours: 4.00, oncall_status: 'ACTIVE',           requires_extra_approval_reason: null, assignment_note: 'Month-end payroll system standby.', created_by: 'emp-hendra', approved_by: 'emp-sari' },
    { id: 'oncall-2', employee_id: 'emp-sari',   standby_start_at: '2026-08-03T21:00:00+07:00', standby_end_at: '2026-08-04T06:00:00+07:00', max_callout_hours: 3.50, oncall_status: 'PENDING_APPROVAL', requires_extra_approval_reason: null, assignment_note: 'Weekly network standby — next rotation.', created_by: 'emp-hendra', approved_by: null },
    { id: 'oncall-3', employee_id: 'emp-rina',   standby_start_at: '2026-08-10T21:00:00+07:00', standby_end_at: '2026-08-11T06:00:00+07:00', max_callout_hours: 5.00, oncall_status: 'PENDING_APPROVAL', requires_extra_approval_reason: 'MAX_CALLOUT_EXCEEDS_DAILY_CAP', assignment_note: 'Database migration standby — weekend window.', created_by: 'emp-hendra', approved_by: null },
    { id: 'oncall-4', employee_id: 'emp-budi',   standby_start_at: '2026-08-15T20:00:00+07:00', standby_end_at: '2026-08-16T06:00:00+07:00', max_callout_hours: 3.00, oncall_status: 'SCHEDULED',        requires_extra_approval_reason: null, assignment_note: 'Weekend infrastructure standby.', created_by: 'emp-hendra', approved_by: 'emp-sari' }
  ];

  var DAILY_HOUR_CAP = 4; // FSD §7.3 skenario: 2,00 + 3,00 jam menembus plafon harian 4 jam

  // ---------- labels ----------
  var LABEL = {
    holiday_type:   { NATIONAL: 'National', REGIONAL: 'Regional', COMPANY: 'Company' },
    scope_level:    { COMPANY: 'Company', UNIT: 'Unit', LOCATION: 'Location' },
    approval:       { DRAFT: 'Draft', PENDING_APPROVAL: 'Pending approval', APPROVED: 'Approved', REJECTED: 'Rejected' },
    request_status: { PENDING_APPROVAL: 'Pending approval', AUTO_APPROVED: 'Auto-approved', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled — withdrawn' },
    delegation:     { PENDING_APPROVAL: 'Pending approval', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled' },
    day_session:    { FULL: 'Full day', HALF_AM: 'Half day — morning', HALF_PM: 'Half day — afternoon' },
    purpose:        { VERIFICATION: 'Verification', AUDIT: 'Audit', DISPUTE: 'Dispute', DATA_SUBJECT_REQUEST: 'Data subject request' },
    mutation:       { ACCRUAL_MONTHLY: 'Monthly accrual', LEAVE_TAKEN: 'Leave taken', LEAVE_REVERSED: 'Leave reversed', JOINT_LEAVE: 'Joint leave', YEAR_END_CARRY_OVER: 'Year-end carry-over', YEAR_END_FORFEIT: 'Year-end forfeit', CARRY_OVER_EXPIRY: 'Carry-over expiry', HR_ADJUSTMENT: 'HR adjustment' },
    carry:          { FORFEIT: 'Forfeit', CARRY_CAPPED: 'Carry capped', CARRY_FULL: 'Carry full' },
    blackout_mode:  { HARD: 'Machine-rejected', SOFT: 'Extra approval' },
    extra_reason:   { NEGATIVE_BALANCE: 'Balance goes negative', SOFT_BLACKOUT: 'Soft blackout period', TEAM_QUOTA: 'Team quota', DAILY_CAP_EXCEEDED: 'Daily hour cap exceeded', MAX_CALLOUT_EXCEEDS_DAILY_CAP: 'Call-out ceiling exceeds daily cap', UNPAID_TYPE: 'Unpaid leave type', LONG_DURATION: 'Duration over threshold', OVER_DAILY_CAP: 'Over the daily hour cap' },
    arrangement:    { WFO: 'Work from office', HYBRID: 'Hybrid', WFH: 'Work from home', MOBILE: 'Mobile / field' },
    attendance:     { PRESENT: 'Present', LATE: 'Late', INCOMPLETE: 'Incomplete', ABSENT: 'Absent', ON_LEAVE: 'On leave', SICK: 'Sick', NOT_SCHEDULED: 'Not scheduled' },
    correction:     { PENDING_APPROVAL: 'Pending approval', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled' },
    corr_reason:    { FORGOT_PUNCH: 'Forgot to punch', APP_ERROR: 'App or device error', OFFICIAL_TRAVEL: 'Official travel', OTHER: 'Other' },
    excused:        { APPROVED_CORRECTION: 'Approved correction', APP_ERROR: 'App or device error', OFFICIAL_TRAVEL: 'Official travel' },
    day_type:       { WORKDAY: 'Workday', WEEKLY_REST: 'Weekly rest', PUBLIC_HOLIDAY: 'Public holiday' },
    ot_status:      { PENDING_APPROVAL: 'Pending approval', AUTO_APPROVED: 'Auto-approved', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Cancelled — withdrawn' },
    ot_mode:        { PRE: 'Filed in advance (PRE)', RETROACTIVE: 'Retroactive' },
    ot_category:    { WORKDAY: 'Workday', WEEKLY_REST: 'Weekly rest', PUBLIC_HOLIDAY: 'Public holiday' },
    shift_type:     { FIXED: 'Fixed', CYCLE: 'Cycle', FLEX: 'Flexible' },
    assign_source:  { INDIVIDUAL: 'Individual adjustment', BULK: 'Bulk per unit', SWAP: 'Shift swap', SYSTEM: 'System cycle' },
    swap:           { PENDING_APPROVAL: 'Pending approval', APPROVED: 'Approved', REJECTED: 'Rejected', CANCELLED: 'Withdrawn' },
    oncall:         { PENDING_APPROVAL: 'Pending approval', SCHEDULED: 'Scheduled', ACTIVE: 'Active', REJECTED: 'Rejected', CANCELLED: 'Cancelled' }
  };

  var TONE = {
    DRAFT: 'grey', PENDING_APPROVAL: 'amber', APPROVED: 'green', REJECTED: 'red',
    AUTO_APPROVED: 'blue', WITHDRAWN: 'grey', CANCELLED: 'grey',
    ACCRUAL_MONTHLY: 'blue', LEAVE_TAKEN: 'amber', LEAVE_REVERSED: 'green', JOINT_LEAVE: 'indigo',
    YEAR_END_CARRY_OVER: 'green', YEAR_END_FORFEIT: 'red', CARRY_OVER_EXPIRY: 'red', HR_ADJUSTMENT: 'orange',
    PRESENT: 'green', LATE: 'amber', INCOMPLETE: 'orange', ABSENT: 'red', ON_LEAVE: 'blue', SICK: 'indigo', NOT_SCHEDULED: 'grey',
    SCHEDULED: 'blue', ACTIVE: 'green',
    WORKDAY: 'blue', WEEKLY_REST: 'indigo', PUBLIC_HOLIDAY: 'orange',
    ADVANCE: 'blue', RETROACTIVE: 'orange', AUTO: 'indigo',
    FIXED: 'blue', CYCLE: 'indigo', FLEX: 'orange',
    INDIVIDUAL: 'orange', BULK: 'blue', SWAP: 'indigo', SYSTEM: 'grey', CANCELLED: 'grey'
  };

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function emp(id) { return byId(EMPLOYEES, id) || { name: '—', nik: '—' }; }
  function lt(id) { return byId(LEAVE_TYPES, id) || { leave_name: '—', leave_code: '—' }; }
  function scopeName(level, ref) {
    if (!level || level === 'COMPANY') return 'Company-wide';
    var src = level === 'UNIT' ? UNITS : BRANCHES, r = byId(src, ref);
    return (r ? r.name : ref || '—');
  }
  function d(iso) {
    if (!iso) return '—';
    var p = String(iso).slice(0, 10).split('-');
    if (p.length !== 3) return iso;
    return String(+p[2]).padStart(2, '0') + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0];
  }
  function dt(iso) {
    if (!iso) return '—';
    return d(iso) + ' · ' + String(iso).slice(11, 16);
  }
  function range(a, b) { return a === b ? d(a) : d(a) + ' – ' + d(b); }
  function num(n, dec) { return (n === null || n === undefined) ? '—' : Number(n).toFixed(dec === undefined ? 2 : dec); }
  function badge(value, map) {
    var text = (map && map[value]) || value || '—';
    return '<span class="sb sb--' + (TONE[value] || 'grey') + '"><span class="sb__dot"></span>' + text + '</span>';
  }
  function person(id) {
    var e = emp(id);
    return '<div class="person"><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.nik + '</span></div></div>';
  }
  function days(wd) {
    var K = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], L = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return '<span class="tm-days">' + K.map(function (k, i) {
      return '<span class="tm-days__d' + (wd[k] ? ' is-on' : '') + '" title="' + k + '">' + L[i] + '</span>';
    }).join('') + '</span>';
  }
  // Fill a custom select's option list AFTER flow-common has already stamped the control
  // as wired. flow-common's wireSelects() runs on its own DOMContentLoaded (before any page
  // script) and skips anything already stamped, so options injected later would never get a
  // click handler. Bind them here instead of re-wiring the control (which would double up the
  // open/close listener on the trigger).
  function fillSelect(ctlId, html) {
    var ctl = document.getElementById(ctlId);
    if (!ctl) return;
    var dd = ctl.querySelector('.dropdown');
    if (!dd) return;
    dd.removeAttribute('data-searchable');
    dd.innerHTML = html;
    if (!ctl.dataset.wired) { if (window.Flow) window.Flow.wireSelects(document); return; }
    var value = ctl.querySelector('.ctl__value');
    dd.querySelectorAll('.dropdown__opt').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        dd.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
        opt.classList.add('is-sel');
        if (value) { value.textContent = opt.textContent; value.style.color = 'var(--fg-1)'; }
        document.querySelectorAll('.ctl--select.is-open').forEach(function (c) {
          c.classList.remove('is-open');
          var fx = c.querySelector('.dropdown--fixed');
          if (fx) { fx.classList.remove('dropdown--fixed'); fx.removeAttribute('style'); }
        });
        ctl.dispatchEvent(new CustomEvent('select', { detail: { value: opt.dataset.val || opt.textContent, opt: opt }, bubbles: true }));
      });
    });
  }

  function today() { return new Date(); }
  function isoOf(dd) { return dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'); }

  window.TimeData = {
    EMPLOYEES: EMPLOYEES, BRANCHES: BRANCHES, UNITS: UNITS, LEAVE_TYPES: LEAVE_TYPES,
    GEOFENCES: GEOFENCES, PUNCHES: PUNCHES, DAILY: DAILY, CORRECTIONS: CORRECTIONS,
    OT_REQ: OT_REQ, OT_DAILY: OT_DAILY, SHIFTS: SHIFTS, ASSIGN: ASSIGN, SWAPS: SWAPS,
    ONCALL: ONCALL, DAILY_HOUR_CAP: DAILY_HOUR_CAP,
    HOLIDAYS: HOLIDAYS, WORK_CALENDARS: WORK_CALENDARS, LEAVE_REQUESTS: LEAVE_REQUESTS,
    DELEGATIONS: DELEGATIONS, MEDICAL_ACCESS: MEDICAL_ACCESS, LEAVE_BALANCES: LEAVE_BALANCES,
    LEDGER: LEDGER, ACCRUAL_POLICIES: ACCRUAL_POLICIES, BLACKOUTS: BLACKOUTS,
    LABEL: LABEL, TONE: TONE, MONTHS: MONTHS,
    byId: byId, emp: emp, lt: lt, scopeName: scopeName, d: d, dt: dt, range: range,
    num: num, badge: badge, person: person, days: days, today: today, isoOf: isoOf, fillSelect: fillSelect,
    // session actor — the signed-in user for SoD checks (Tony Stark → HR admin persona)
    ME: 'emp-hendra'
  };
})();
