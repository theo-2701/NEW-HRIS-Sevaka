// ============================================================
// SEVAKA HRIS — Finance service: shared dataset + helpers.
// Values follow the positive-scenario dataset in FSD/UIC-001-FINANCE-0.2
// (company PTDIKA — Budi Santoso, Sinta Dewi, Rahmat Hidayat, Ari Wibowo,
// Maya Puspita). Loaded before each finance page script.
// ============================================================
(function () {
  'use strict';

  function rp(n) {
    if (n === null || n === undefined || n === '') return '—';
    var s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '-Rp ' : 'Rp ') + s;
  }
  function num(v) { return String(v || '').replace(/[^\d]/g, ''); }
  function parseRp(v) { var d = num(v); return d ? parseInt(d, 10) : 0; }
  function thousands(v) { var d = num(v); return d ? d.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''; }

  // status badge tone per enum value (documented enums only — no invented states)
  var TONE = {
    // shared
    ACTIVE: 'green', INACTIVE: 'grey',
    // benefit claim
    SUBMITTED: 'blue', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'grey', AWAITING_RESUBMIT: 'amber',
    // benefit period
    OPEN: 'green', GRACE: 'amber', CLOSED: 'grey',
    // ledger entry type
    RESERVATION: 'indigo', USAGE: 'blue', RELEASE: 'grey', ADJUSTMENT: 'amber',
    // loan
    AWAITING_CALCULATION: 'amber', AWAITING_ACKNOWLEDGEMENT: 'orange', REJECTED_BY_EXTERNAL: 'red',
    WITHDRAWN: 'grey', DECLINED_BY_EMPLOYEE: 'grey',
    // installment
    PENDING: 'grey', CONFIRMED: 'green', PARTIAL: 'amber', WAIVED: 'indigo',
    // cash advance
    UNDER_REVIEW: 'amber', SETTLED: 'green', REPUDIATED: 'red', ACCEPTED: 'green',
    PENDING_APPROVAL: 'amber', AWAITING_APPROVAL: 'amber', APPLIED: 'green',
    // difference
    SURPLUS: 'indigo', SHORTFALL: 'orange',
    // disbursement
    UNMARKED: 'amber', MARKED: 'green', MANUAL: 'blue', CLIENT_SYSTEM: 'indigo',
    BANK_TRANSFER: 'blue', CASH: 'grey', WITH_PAYROLL: 'indigo',
    BENEFIT_CLAIM: 'blue', LOAN: 'indigo', CASH_ADVANCE: 'orange', CASH_ADVANCE_SHORTFALL: 'amber',
    DISBURSEMENT: 'green',
    // outstanding clearance
    OUTSTANDING: 'orange', CLEARED_BY_REPAYMENT: 'green', DECLARED_SETTLED: 'blue',
    // family relationship
    SPOUSE: 'blue', CHILD: 'indigo', PARENT: 'amber', SIBLING: 'grey', OTHER: 'grey'
  };
  function sb(value, tone) {
    if (!value) return '<span class="cell-dim">—</span>';
    return '<span class="sb sb--' + (tone || TONE[value] || 'grey') + '"><span class="sb__dot"></span>' + value + '</span>';
  }
  var TICK_ON = '<span class="tick"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>';
  var TICK_OFF = '<span class="tick tick--no"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span>';
  function tick(on) { return on ? TICK_ON : TICK_OFF; }

  var EMPLOYEES = [
    { id: 'emp-budi',   name: 'Budi Santoso',   nik: '2019-0451', role: 'ROLE_EMPLOYEE',            unit: 'Finance Operations', grade: 'Staff Grade 2' },
    { id: 'emp-sinta',  name: 'Sinta Dewi',     nik: '2016-0122', role: 'ROLE_DEPT_MANAGER',        unit: 'Finance Operations', grade: 'Manager Grade 1' },
    { id: 'emp-rahmat', name: 'Rahmat Hidayat', nik: '2015-0087', role: 'ROLE_FINANCE_OFFICER',     unit: 'Corporate Finance',  grade: 'Staff Grade 3' },
    { id: 'emp-ari',    name: 'Ari Wibowo',     nik: '2014-0033', role: 'ROLE_HR_MANAGER',          unit: 'Human Capital',      grade: 'Manager Grade 2' },
    { id: 'emp-maya',   name: 'Maya Puspita',   nik: '2018-0290', role: 'ROLE_HEALTH_DATA_OFFICER', unit: 'Human Capital',      grade: 'Staff Grade 2' }
  ];
  function emp(id) { return EMPLOYEES.filter(function (e) { return e.id === id; })[0] || { name: id, nik: '', unit: '' }; }

  var JOB_GRADES = [
    { id: 'jg-staff-1', name: 'Staff Grade 1' }, { id: 'jg-staff-2', name: 'Staff Grade 2' },
    { id: 'jg-staff-3', name: 'Staff Grade 3' }, { id: 'jg-spv-1', name: 'Supervisor Grade 1' },
    { id: 'jg-mgr-1', name: 'Manager Grade 1' }, { id: 'jg-mgr-2', name: 'Manager Grade 2' }
  ];

  // ---- FT1 · master data -------------------------------------------------
  var BENEFIT_TYPES = [
    { id: 'bt-rawat-jalan', name: 'Pengobatan Rawat Jalan', requires_receipt: true,  allows_family_claim: true,  contains_health_data: true,  is_active: true },
    { id: 'bt-rawat-inap',  name: 'Pengobatan Rawat Inap',  requires_receipt: true,  allows_family_claim: true,  contains_health_data: true,  is_active: true },
    { id: 'bt-kacamata',    name: 'Kacamata',               requires_receipt: true,  allows_family_claim: false, contains_health_data: false, is_active: true },
    { id: 'bt-melahirkan',  name: 'Melahirkan',             requires_receipt: true,  allows_family_claim: true,  contains_health_data: true,  is_active: true },
    { id: 'bt-fitness',     name: 'Fitness Allowance',      requires_receipt: false, allows_family_claim: false, contains_health_data: false, is_active: false }
  ];
  var ENTITLEMENTS = [
    { id: 'ent-1', benefit_type_id: 'bt-rawat-jalan', job_grade_id: 'jg-staff-2', annual_amount: 5000000 },
    { id: 'ent-2', benefit_type_id: 'bt-rawat-jalan', job_grade_id: 'jg-mgr-1',   annual_amount: 9000000 },
    { id: 'ent-3', benefit_type_id: 'bt-rawat-inap',  job_grade_id: 'jg-staff-2', annual_amount: 15000000 },
    { id: 'ent-4', benefit_type_id: 'bt-kacamata',    job_grade_id: 'jg-staff-2', annual_amount: 1500000 },
    { id: 'ent-5', benefit_type_id: 'bt-melahirkan',  job_grade_id: 'jg-staff-2', annual_amount: 12000000 }
  ];
  var FAMILY_RELS = [
    { id: 'fr-1', relationship_type: 'SPOUSE',  is_eligible: true },
    { id: 'fr-2', relationship_type: 'CHILD',   is_eligible: true },
    { id: 'fr-3', relationship_type: 'PARENT',  is_eligible: true },
    { id: 'fr-4', relationship_type: 'SIBLING', is_eligible: false },
    { id: 'fr-5', relationship_type: 'OTHER',   is_eligible: false }
  ];
  var LOAN_LIMITS = [
    { id: 'll-1', job_grade_id: 'jg-staff-1', limit_amount: 15000000, is_active: true },
    { id: 'll-2', job_grade_id: 'jg-staff-2', limit_amount: 30000000, is_active: true },
    { id: 'll-3', job_grade_id: 'jg-staff-3', limit_amount: 40000000, is_active: true },
    { id: 'll-4', job_grade_id: 'jg-spv-1',   limit_amount: 60000000, is_active: true },
    { id: 'll-5', job_grade_id: 'jg-mgr-1',   limit_amount: 90000000, is_active: false }
  ];
  var PURPOSE_TYPES = [
    { id: 'pt-1', name: 'Dinas Luar Kota',        is_official_travel: true,  requires_receipt: true,  max_amount: 5000000,  is_unlimited_ack: false, is_active: true },
    { id: 'pt-2', name: 'Dinas Luar Negeri',      is_official_travel: true,  requires_receipt: true,  max_amount: 25000000, is_unlimited_ack: false, is_active: true },
    { id: 'pt-3', name: 'Pengadaan Operasional',  is_official_travel: false, requires_receipt: true,  max_amount: 10000000, is_unlimited_ack: false, is_active: true },
    { id: 'pt-4', name: 'Kegiatan Sosial',        is_official_travel: false, requires_receipt: true,  max_amount: null,     is_unlimited_ack: true,  is_active: true },
    { id: 'pt-5', name: 'Biaya Tak Terduga',      is_official_travel: false, requires_receipt: false, max_amount: null,     is_unlimited_ack: false, is_active: true }
  ];
  var REJECTION_REASONS = [
    { id: 'rr-1', name: 'Incomplete receipt evidence',   requires_free_text: false, is_system_default: true,  is_active: true },
    { id: 'rr-2', name: 'Outside company policy',        requires_free_text: false, is_system_default: true,  is_active: true },
    { id: 'rr-3', name: 'Exceeds the entitlement',       requires_free_text: false, is_system_default: true,  is_active: true },
    { id: 'rr-4', name: 'Submitted data does not match', requires_free_text: true,  is_system_default: true,  is_active: true },
    { id: 'rr-5', name: 'Other',                         requires_free_text: true,  is_system_default: true,  is_active: true },
    { id: 'rr-6', name: 'Cost estimate is unreasonable', requires_free_text: true,  is_system_default: false, is_active: true }
  ];

  // ---- FT2 · benefit reimbursement --------------------------------------
  var PERIODS = [
    { period_id: 'bp-2026', label: 'Period 2026', period_start: '2026-01-01', period_end: '2026-12-31', grace_end: '2027-01-31', status: 'OPEN',
      balances: [
        { benefit_type_id: 'bt-rawat-jalan', benefit_type_name: 'Pengobatan Rawat Jalan', entitled_amount: 5000000,  used_amount: 850000, reserved_amount: 1250000 },
        { benefit_type_id: 'bt-rawat-inap',  benefit_type_name: 'Pengobatan Rawat Inap',  entitled_amount: 15000000, used_amount: 0,       reserved_amount: 0 },
        { benefit_type_id: 'bt-kacamata',    benefit_type_name: 'Kacamata',               entitled_amount: 1500000,  used_amount: 1500000, reserved_amount: 0 },
        { benefit_type_id: 'bt-melahirkan',  benefit_type_name: 'Melahirkan',             entitled_amount: 12000000, used_amount: 0,       reserved_amount: 0 }
      ] },
    { period_id: 'bp-2025', label: 'Period 2025 (grace)', period_start: '2025-01-01', period_end: '2025-12-31', grace_end: '2026-01-31', status: 'GRACE',
      balances: [
        { benefit_type_id: 'bt-rawat-jalan', benefit_type_name: 'Pengobatan Rawat Jalan', entitled_amount: 5000000, used_amount: 4100000, reserved_amount: 0 },
        { benefit_type_id: 'bt-kacamata',    benefit_type_name: 'Kacamata',               entitled_amount: 1500000, used_amount: 0,       reserved_amount: 0 }
      ] }
  ];
  var BENEFICIARIES = [
    { id: 'ben-siti',  relative_id: 'rel-siti',  name: 'Siti Aminah',    relationship_type: 'SPOUSE', is_active: true,  slot_consumed: true },
    { id: 'ben-aditya', relative_id: 'rel-adit', name: 'Aditya Santoso', relationship_type: 'CHILD',  is_active: true,  slot_consumed: false },
    { id: 'ben-sri',   relative_id: 'rel-sri',   name: 'Sri Wahyuni',    relationship_type: 'PARENT', is_active: false, slot_consumed: false }
  ];
  var CLAIMS = [
    { id: 'clm-45', request_no: 'CLM-2026-000045', employee_id: 'emp-budi', benefit_type_id: 'bt-rawat-jalan', benefit_type_name: 'Pengobatan Rawat Jalan',
      period_id: 'bp-2026', total_amount: 850000, status: 'APPROVED', reservation_state: 'CONSUMED', contains_health_data_snapshot: true,
      submitted_at: '2026-07-10', decided_at: '2026-07-12', decided_by: 'emp-sinta',
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null,
      items: [ { id: 'ci-45-1', expense_date: '2026-07-08', amount: 850000, beneficiary_kind: 'FAMILY_MEMBER', beneficiary_id: 'ben-siti', beneficiary_relationship_snapshot: 'SPOUSE', receipt_no: 'RS-MELATI/2026/07/0231', document_id: 'doc-rs-melati-0231' } ],
      similarity_warnings: [] },
    { id: 'clm-46', request_no: 'CLM-2026-000046', employee_id: 'emp-budi', benefit_type_id: 'bt-rawat-jalan', benefit_type_name: 'Pengobatan Rawat Jalan',
      period_id: 'bp-2026', total_amount: 1250000, status: 'SUBMITTED', reservation_state: 'HELD', contains_health_data_snapshot: true,
      submitted_at: '2026-07-22', decided_at: null, decided_by: null,
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null,
      items: [
        { id: 'ci-46-1', expense_date: '2026-07-18', amount: 700000, beneficiary_kind: 'SELF', beneficiary_id: null, beneficiary_relationship_snapshot: null, receipt_no: 'RS-MELATI/2026/07/0388', document_id: 'doc-rs-melati-0388' },
        { id: 'ci-46-2', expense_date: '2026-07-20', amount: 550000, beneficiary_kind: 'FAMILY_MEMBER', beneficiary_id: 'ben-aditya', beneficiary_relationship_snapshot: 'CHILD', receipt_no: 'KLN-SEHAT/2026/07/1102', document_id: 'doc-kln-sehat-1102' } ],
      similarity_warnings: [ { item_id: 'ci-46-1', matched_module: 'CASH_ADVANCE', matched_date: '2026-07-18', matched_amount: 700000 } ] },
    { id: 'clm-41', request_no: 'CLM-2026-000041', employee_id: 'emp-maya', benefit_type_id: 'bt-kacamata', benefit_type_name: 'Kacamata',
      period_id: 'bp-2026', total_amount: 1500000, status: 'APPROVED', reservation_state: 'CONSUMED', contains_health_data_snapshot: false,
      submitted_at: '2026-06-03', decided_at: '2026-06-05', decided_by: 'emp-sinta',
      bank_account_snapshot: { bank_code: 'MANDIRI', account_number: '****8812', account_holder_name: 'Maya Puspita' }, cost_center_id_snapshot: null,
      items: [ { id: 'ci-41-1', expense_date: '2026-06-01', amount: 1500000, beneficiary_kind: 'SELF', beneficiary_id: null, beneficiary_relationship_snapshot: null, receipt_no: 'OPT-VISI/2026/06/0044', document_id: 'doc-opt-visi-0044' } ],
      similarity_warnings: [] },
    { id: 'clm-38', request_no: 'CLM-2026-000038', employee_id: 'emp-budi', benefit_type_id: 'bt-rawat-jalan', benefit_type_name: 'Pengobatan Rawat Jalan',
      period_id: 'bp-2026', total_amount: 420000, status: 'REJECTED', reservation_state: 'RELEASED', contains_health_data_snapshot: true,
      submitted_at: '2026-05-14', decided_at: '2026-05-16', decided_by: 'emp-sinta', reason_id: 'rr-1', reason_note: 'Nota tidak memuat nomor dan tanggal yang dapat diverifikasi.',
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null,
      items: [ { id: 'ci-38-1', expense_date: '2026-05-12', amount: 420000, beneficiary_kind: 'SELF', beneficiary_id: null, beneficiary_relationship_snapshot: null, receipt_no: 'APT-SEHAT/2026/05/0912', document_id: 'doc-apt-sehat-0912' } ],
      similarity_warnings: [] },
    { id: 'clm-33', request_no: 'CLM-2026-000033', employee_id: 'emp-budi', benefit_type_id: 'bt-kacamata', benefit_type_name: 'Kacamata',
      period_id: 'bp-2026', total_amount: 900000, status: 'CANCELLED', reservation_state: 'RELEASED', contains_health_data_snapshot: false,
      submitted_at: '2026-04-02', decided_at: null, decided_by: null,
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null,
      items: [ { id: 'ci-33-1', expense_date: '2026-04-01', amount: 900000, beneficiary_kind: 'SELF', beneficiary_id: null, beneficiary_relationship_snapshot: null, receipt_no: 'OPT-VISI/2026/04/0011', document_id: 'doc-opt-visi-0011' } ],
      similarity_warnings: [] }
  ];
  // log_benefit_balance_ledger — running balance is derived client-side (no stored column)
  var LEDGER = [
    { id: 'lg-1', created_at: '2026-04-02', entry_type: 'RESERVATION', amount: 900000,  benefit_type_name: 'Kacamata',               source_claim_id: 'clm-33', request_no: 'CLM-2026-000033' },
    { id: 'lg-2', created_at: '2026-04-05', entry_type: 'RELEASE',     amount: 900000,  benefit_type_name: 'Kacamata',               source_claim_id: 'clm-33', request_no: 'CLM-2026-000033' },
    { id: 'lg-3', created_at: '2026-05-14', entry_type: 'RESERVATION', amount: 420000,  benefit_type_name: 'Pengobatan Rawat Jalan', source_claim_id: 'clm-38', request_no: 'CLM-2026-000038' },
    { id: 'lg-4', created_at: '2026-05-16', entry_type: 'RELEASE',     amount: 420000,  benefit_type_name: 'Pengobatan Rawat Jalan', source_claim_id: 'clm-38', request_no: 'CLM-2026-000038' },
    { id: 'lg-5', created_at: '2026-07-10', entry_type: 'RESERVATION', amount: 850000,  benefit_type_name: 'Pengobatan Rawat Jalan', source_claim_id: 'clm-45', request_no: 'CLM-2026-000045' },
    { id: 'lg-6', created_at: '2026-07-12', entry_type: 'USAGE',       amount: 850000,  benefit_type_name: 'Pengobatan Rawat Jalan', source_claim_id: 'clm-45', request_no: 'CLM-2026-000045' },
    { id: 'lg-7', created_at: '2026-07-22', entry_type: 'RESERVATION', amount: 1250000, benefit_type_name: 'Pengobatan Rawat Jalan', source_claim_id: 'clm-46', request_no: 'CLM-2026-000046' }
  ];

  // ---- FT3 · loan -------------------------------------------------------
  var LOAN_CFG = { interest_bearing: true, tenor_mode: 'EMPLOYEE_CHOICE', tenor_choice_pattern: 'MULTIPLE_OF_THREE', tenor_max: 24, enabled: true, early_settlement: false };
  var EXPOSURE = { employee_id: 'emp-budi', job_grade_id: 'jg-staff-2', limit_amount: 30000000, outstanding_amount: 0, reserved_amount: 0 };
  var LOANS = [
    { id: 'loan-12', request_no: 'LON-2026-000012', employee_id: 'emp-budi', principal_amount: 20000000, tenor_months: 12,
      interest_bearing_snapshot: true, schedule_source: 'RECEIVED_FROM_EXTERNAL', interest_amount: 1200000, total_obligation: 21200000,
      status: 'APPROVED', submitted_at: '2026-06-15', workflow_instance_id: '8b00…0abc',
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null, early_settlement_terms_snapshot: null },
    { id: 'loan-18', request_no: 'LON-2026-000018', employee_id: 'emp-budi', principal_amount: 9000000, tenor_months: 9,
      interest_bearing_snapshot: true, schedule_source: null, interest_amount: null, total_obligation: null,
      status: 'AWAITING_ACKNOWLEDGEMENT', submitted_at: '2026-07-18', workflow_instance_id: '8b00…0ade',
      acknowledgement_offer: { acknowledged_principal: 9000000, acknowledged_interest: 540000, acknowledged_tenor: 9 },
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null },
    { id: 'loan-21', request_no: 'LON-2026-000021', employee_id: 'emp-rahmat', principal_amount: 25000000, tenor_months: 24,
      interest_bearing_snapshot: true, schedule_source: null, interest_amount: null, total_obligation: null,
      status: 'AWAITING_CALCULATION', submitted_at: '2026-07-24', workflow_instance_id: '8b00…0af1',
      bank_account_snapshot: { bank_code: 'BNI', account_number: '****2201', account_holder_name: 'Rahmat Hidayat' }, cost_center_id_snapshot: null },
    { id: 'loan-24', request_no: 'LON-2026-000024', employee_id: 'emp-maya', principal_amount: 6000000, tenor_months: 6,
      interest_bearing_snapshot: true, schedule_source: null, interest_amount: null, total_obligation: null,
      status: 'SUBMITTED', submitted_at: '2026-08-03', workflow_instance_id: '8b00…0b02',
      bank_account_snapshot: { bank_code: 'MANDIRI', account_number: '****8812', account_holder_name: 'Maya Puspita' }, cost_center_id_snapshot: null }
  ];
  var INSTALLMENTS = {
    'loan-12': (function () {
      var rows = [], due = 21200000 / 12;
      for (var i = 1; i <= 12; i++) {
        var m = 6 + i, y = 2026 + (m > 12 ? 1 : 0), mm = m > 12 ? m - 12 : m;
        rows.push({ sequence_no: i, payroll_period_ref: y + '-' + String(mm).padStart(2, '0') + '-25', due_amount: due, status: i === 1 ? 'CONFIRMED' : 'PENDING' });
      }
      return rows;
    })()
  };
  var LOAN_STATES = [
    ['SUBMITTED', 'Reservasi HELD, instance workflow dimulai sinkron.', 'LN-A3 / LN-A4'],
    ['AWAITING_CALCULATION', 'Disetujui pada company berbunga — menunggu jadwal dari pihak luar.', 'LN-S1 (baris tertahan)'],
    ['AWAITING_ACKNOWLEDGEMENT', 'Jadwal masuk; karyawan wajib ACK/DECLINE di dalam aplikasi.', 'LN-C2'],
    ['APPROVED', 'Jadwal disetujui/ACK — masuk daftar Pencairan (FT5).', 'LN-C3'],
    ['REJECTED', 'Ditolak atasan; reservasi dilepas.', 'Dinarasikan (LN-B3 cabang Tolak)'],
    ['REJECTED_BY_EXTERNAL', 'Pihak pemberi dana menolak; sebab kosong disimpan apa adanya.', 'Dinarasikan (pintu 4 integrasi)'],
    ['CANCELLED', 'Dibatalkan pengaju sendiri saat masih SUBMITTED (POST .../cancel).', 'Dinarasikan — nol layar aksi'],
    ['WITHDRAWN', 'Ditarik pengaju setelah ambang AWAITING_CALCULATION lewat (POST .../withdraw).', 'Dinarasikan — nol layar aksi'],
    ['DECLINED_BY_EMPLOYEE', 'Karyawan menolak jadwal (DECLINE); reservasi dilepas, boleh ajukan ulang.', 'LN-C2 cabang DECLINE'],
    ['CLOSED', 'Sisa kewajiban nol — lunas normal / pelunasan dipercepat / percepatan keluar.', 'Dinarasikan (POST .../early-settlement)']
  ];

  // ---- FT4 · cash advance ----------------------------------------------
  var ADVANCES = [
    { id: 'adv-78', request_no: 'ADV-2026-000078', recipient_employee_id: 'emp-budi', created_on_behalf_employee_id: null,
      purpose_type_id: 'pt-1', purpose_type_name: 'Dinas Luar Kota', is_official_travel_snapshot: true, max_amount_snapshot: 5000000,
      amount: 3000000, travel_start_date: '2026-07-14', travel_end_date: '2026-07-17', status: 'SETTLED', created_at: '2026-07-10',
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null },
    { id: 'adv-81', request_no: 'ADV-2026-000081', recipient_employee_id: 'emp-maya', created_on_behalf_employee_id: 'emp-rahmat',
      purpose_type_id: 'pt-3', purpose_type_name: 'Pengadaan Operasional', is_official_travel_snapshot: false, max_amount_snapshot: 10000000,
      amount: 4500000, travel_start_date: null, travel_end_date: null, status: 'APPROVED', created_at: '2026-07-21',
      bank_account_snapshot: { bank_code: 'MANDIRI', account_number: '****8812', account_holder_name: 'Maya Puspita' }, cost_center_id_snapshot: null },
    { id: 'adv-84', request_no: 'ADV-2026-000084', recipient_employee_id: 'emp-budi', created_on_behalf_employee_id: null,
      purpose_type_id: 'pt-2', purpose_type_name: 'Dinas Luar Negeri', is_official_travel_snapshot: true, max_amount_snapshot: 25000000,
      amount: 18000000, travel_start_date: '2026-08-10', travel_end_date: '2026-08-16', status: 'SUBMITTED', created_at: '2026-08-01',
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null },
    { id: 'adv-86', request_no: 'ADV-2026-000086', recipient_employee_id: 'emp-budi', created_on_behalf_employee_id: null,
      purpose_type_id: 'pt-1', purpose_type_name: 'Dinas Luar Kota', is_official_travel_snapshot: true, max_amount_snapshot: 5000000,
      amount: 2000000, travel_start_date: '2026-08-24', travel_end_date: '2026-08-26', status: 'APPROVED', created_at: '2026-08-04',
      bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null }
  ];
  var SETTLEMENTS = [
    { id: 'stl-78', cash_advance_id: 'adv-78', request_no: 'ADV-2026-000078', recipient_employee_id: 'emp-budi', is_final_stage: true,
      status: 'ACCEPTED', submitted_at: '2026-07-18', reviewed_by: 'emp-rahmat', decided_by: 'emp-sinta', advance_amount: 3000000,
      items: [
        { id: 'sti-1', expense_date: '2026-07-14', amount: 1500000, receipt_no: 'HTL-CIWALK/2026/0098', document_id: 'doc-uuid-1', status: 'ACCEPTED', flagged_reason_id: null },
        { id: 'sti-2', expense_date: '2026-07-16', amount: 1350000, receipt_no: 'GRB-TRX-8820134', document_id: 'doc-uuid-2', status: 'ACCEPTED', flagged_reason_id: null } ],
      similarity_warnings: [] },
    { id: 'stl-81', cash_advance_id: 'adv-81', request_no: 'ADV-2026-000081', recipient_employee_id: 'emp-maya', is_final_stage: true,
      status: 'SUBMITTED', submitted_at: '2026-08-02', reviewed_by: null, decided_by: null, advance_amount: 4500000,
      items: [
        { id: 'sti-3', expense_date: '2026-07-28', amount: 2600000, receipt_no: 'TB-MAKMUR/2026/07/0231', document_id: 'doc-uuid-3', status: null, flagged_reason_id: null },
        { id: 'sti-4', expense_date: '2026-07-29', amount: 1400000, receipt_no: '', document_id: 'doc-uuid-4', status: null, flagged_reason_id: null },
        { id: 'sti-5', expense_date: '2026-07-29', amount: 1400000, receipt_no: 'TB-MAKMUR/2026/07/0244', document_id: 'doc-uuid-5', status: null, flagged_reason_id: null } ],
      similarity_warnings: [ { item_id: 'sti-5', matched_module: 'CASH_ADVANCE', matched_date: '2026-07-29', matched_amount: 1400000 } ] }
  ];
  var DIFFERENCES = [
    { id: 'dif-78', cash_advance_id: 'adv-78', request_no: 'ADV-2026-000078', employee_id: 'emp-budi', difference_type: 'SHORTFALL', amount: 150000,
      settlement_method: 'PAYROLL_DEDUCTION', requires_extra_approval: false, due_date: null, status: 'SETTLED', closing_settlement_id: 'stl-78' },
    { id: 'dif-72', cash_advance_id: 'adv-72', request_no: 'ADV-2026-000072', employee_id: 'emp-maya', difference_type: 'SURPLUS', amount: 320000,
      settlement_method: null, requires_extra_approval: false, due_date: '2026-08-15', status: 'OUTSTANDING', closing_settlement_id: 'stl-72' }
  ];

  // ---- FT5 · disbursement & receivables --------------------------------
  var PAYABLES = [
    { payable_type: 'BENEFIT_CLAIM', payable_id: 'clm-45', request_no: 'CLM-2026-000045', employee_id: 'emp-budi', amount: 850000,
      submitted_at: '2026-07-10', mark_status: 'MARKED',
      mark: { disbursement_mark_id: 'mark-claim-000045-1', marked_at: '2026-07-13', mark_source: 'MANUAL', payment_method: 'BANK_TRANSFER', action_id: 'act-rahmat-0713', reason_note: 'Transfer batch mingguan 13 Jul 2026' } },
    { payable_type: 'LOAN', payable_id: 'loan-12', request_no: 'LON-2026-000012', employee_id: 'emp-budi', amount: 20000000,
      submitted_at: '2026-06-15', mark_status: 'MARKED',
      mark: { disbursement_mark_id: 'mark-loan-000012-1', marked_at: '2026-07-25', mark_source: 'CLIENT_SYSTEM', payment_method: 'WITH_PAYROLL', action_id: 'act-payroll-0725', reason_note: null } },
    { payable_type: 'CASH_ADVANCE', payable_id: 'adv-81', request_no: 'ADV-2026-000081', employee_id: 'emp-maya', amount: 4500000,
      submitted_at: '2026-07-21', mark_status: 'UNMARKED', mark: null },
    { payable_type: 'CASH_ADVANCE_SHORTFALL', payable_id: 'dif-78', request_no: 'ADV-2026-000078', employee_id: 'emp-budi', amount: 150000,
      submitted_at: '2026-07-18', mark_status: 'UNMARKED', mark: null },
    { payable_type: 'BENEFIT_CLAIM', payable_id: 'clm-41', request_no: 'CLM-2026-000041', employee_id: 'emp-maya', amount: 1500000,
      submitted_at: '2026-06-03', mark_status: 'UNMARKED', mark: null },
    { payable_type: 'BENEFIT_CLAIM', payable_id: 'clm-46', request_no: 'CLM-2026-000046', employee_id: 'emp-budi', amount: 1250000,
      submitted_at: '2026-07-22', mark_status: 'UNMARKED', mark: null, blocked: 'FIN_DISPUTE_HOLD_ACTIVE' }
  ];
  var OUTSTANDING = [
    { id: 'oc-budi-1', employee_id: 'emp-budi', outstanding_amount: 19433333, status: 'OUTSTANDING', created_at: '2026-07-28', resolved_at: null, settled_reason_note: null, exit_date: '2026-07-25' },
    { id: 'oc-maya-1', employee_id: 'emp-maya', outstanding_amount: 2100000, status: 'CLEARED_BY_REPAYMENT', created_at: '2026-05-30', resolved_at: '2026-06-28', settled_reason_note: null, exit_date: '2026-05-28' },
    { id: 'oc-rahmat-1', employee_id: 'emp-rahmat', outstanding_amount: 640000, status: 'DECLARED_SETTLED', created_at: '2026-03-14', resolved_at: '2026-04-02', settled_reason_note: 'Dihapusbukukan, nominal di bawah ambang penagihan', exit_date: '2026-03-10' }
  ];

  // ---- FT8 · finance security ------------------------------------------
  var HOLDS = [
    { id: 'hold-46', target_type: 'BENEFIT_CLAIM', target_id: 'clm-46', target_request_no: 'CLM-2026-000046', is_active: true,
      created_by: 'emp-rahmat', created_at: '2026-07-15', released_by: null, released_at: null, released_reason_note: null },
    { id: 'hold-21', target_type: 'LOAN', target_id: 'loan-21', target_request_no: 'LON-2026-000021', is_active: true,
      created_by: 'emp-ari', created_at: '2026-07-29', released_by: null, released_at: null, released_reason_note: null },
    { id: 'hold-72', target_type: 'CASH_ADVANCE', target_id: 'adv-72', target_request_no: 'ADV-2026-000072', is_active: false,
      created_by: 'emp-rahmat', created_at: '2026-06-11', released_by: 'emp-ari', released_at: '2026-06-20',
      released_reason_note: 'Clarified with the employee — the original receipt was found' }
  ];
  var EXPORT_LOGS = [
    { id: 'exp-1', scope: 'DISBURSEMENT', filter_criteria: '{"start_date":"2026-07-01","end_date":"2026-07-31"}', row_count: 12, downloaded_at: '2026-07-31 16:04', created_by: 'emp-rahmat' },
    { id: 'exp-2', scope: 'BENEFIT_CLAIM', filter_criteria: '{"start_date":"2026-06-01","end_date":"2026-06-30"}', row_count: 34, downloaded_at: '2026-07-01 09:12', created_by: 'emp-rahmat' },
    { id: 'exp-3', scope: 'LOAN', filter_criteria: '{"start_date":"2026-01-01","end_date":"2026-06-30"}', row_count: 8, downloaded_at: '2026-07-02 11:40', created_by: 'emp-rahmat' }
  ];
  var MEDICAL_LOGS = [
    { id: 'mdl-1', employee_id: 'emp-budi', claim_request_no: 'CLM-2026-000045', claim_item_id: 'ci-45-1', document_id: 'doc-rs-melati-0231', accessed_at: '2026-07-11 13:20', created_by: 'emp-maya' },
    { id: 'mdl-2', employee_id: 'emp-budi', claim_request_no: 'CLM-2026-000046', claim_item_id: 'ci-46-2', document_id: 'doc-kln-sehat-1102', accessed_at: '2026-07-23 08:41', created_by: 'emp-ari' },
    { id: 'mdl-3', employee_id: 'emp-budi', claim_request_no: 'CLM-2026-000038', claim_item_id: 'ci-38-1', document_id: 'doc-apt-sehat-0912', accessed_at: '2026-05-15 15:02', created_by: 'emp-maya' }
  ];

  // Bind options injected AFTER flow-common's wireSelects() already ran (it registers its
  // DOMContentLoaded listener first, so a ctl populated in a page script is wired with zero
  // options). Never clear dataset.wired — that double-binds the ctl toggle.
  function bindOpts(ctl) {
    if (typeof ctl === 'string') ctl = document.getElementById(ctl);
    if (!ctl) return;
    var value = ctl.querySelector('.ctl__value');
    ctl.querySelectorAll('.dropdown__opt').forEach(function (opt) {
      if (opt.dataset.bound) return;
      opt.dataset.bound = '1';
      opt.addEventListener('click', function (ev) {
        ev.stopPropagation();
        ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
        opt.classList.add('is-sel');
        if (value) { value.textContent = opt.textContent; value.style.color = 'var(--fg-1)'; }
        ctl.classList.remove('is-open');
        ctl.dispatchEvent(new CustomEvent('select', { detail: { value: opt.dataset.val || opt.textContent, opt: opt }, bubbles: true }));
      });
    });
  }

  window.FIN = {
    rp: rp, bindOpts: bindOpts, parseRp: parseRp, thousands: thousands, sb: sb, tick: tick, TONE: TONE,
    EMPLOYEES: EMPLOYEES, emp: emp, JOB_GRADES: JOB_GRADES,
    BENEFIT_TYPES: BENEFIT_TYPES, ENTITLEMENTS: ENTITLEMENTS, FAMILY_RELS: FAMILY_RELS,
    LOAN_LIMITS: LOAN_LIMITS, PURPOSE_TYPES: PURPOSE_TYPES, REJECTION_REASONS: REJECTION_REASONS,
    PERIODS: PERIODS, BENEFICIARIES: BENEFICIARIES, CLAIMS: CLAIMS, LEDGER: LEDGER,
    LOAN_CFG: LOAN_CFG, EXPOSURE: EXPOSURE, LOANS: LOANS, INSTALLMENTS: INSTALLMENTS, LOAN_STATES: LOAN_STATES,
    ADVANCES: ADVANCES, SETTLEMENTS: SETTLEMENTS, DIFFERENCES: DIFFERENCES,
    PAYABLES: PAYABLES, OUTSTANDING: OUTSTANDING,
    HOLDS: HOLDS, EXPORT_LOGS: EXPORT_LOGS, MEDICAL_LOGS: MEDICAL_LOGS,
    grade: function (id) { var g = JOB_GRADES.filter(function (x) { return x.id === id; })[0]; return g ? g.name : id; },
    btype: function (id) { var b = BENEFIT_TYPES.filter(function (x) { return x.id === id; })[0]; return b ? b.name : id; }
  };
})();
