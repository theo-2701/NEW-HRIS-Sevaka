/* SEVAKA HRIS — Settings Service dataset (FSD-001-SETTINGS-0.2 / UIC-001-SETTINGS-0.2 /
   TSD-001-SETTINGS-0.3 / ERD-001-SETTINGS-0.4).

   HONEST-SOURCE RULE. The corpus fixes the row count of every menu (76 = 26+27+8+7+2+2+3+1)
   but only NAMES part of them. Rows below carry ONLY setup_code values that appear verbatim
   in a source document. Where a menu's contract count exceeds the named rows, the difference
   is rendered as an "unnamed rows" strip carrying the count — never as invented key names
   (the documents forbid it). Same for values and offer bounds: `val:null` = the positive
   scenario dataset does not quote a value, `opt.min/max` absent = the guardian file has not
   been generated. Descriptions are quoted verbatim (server data, Indonesian in the source). */
window.SettingsData = (function () {
  var I = function (min, max, unit) { var o = { jenis: 'INTERVAL' }; if (min !== undefined) { o.min = min; o.max = max; } if (unit) o.satuan = unit; return o; };
  var BOOL = { jenis: 'DAFTAR', pilihan: ['true', 'false'] };
  var D = function (list) { return { jenis: 'DAFTAR', pilihan: list || null }; };
  var T = function (unit) { var o = { jenis: 'TEKS' }; if (unit) o.satuan = unit; return o; };

  /* Defaults below are quoted from the OWNING service's document, not invented here:
     finance TSD-001-FINANCE-0.3 §16.2.1–16.2.4 · payroll TSD-001-PAYROLL-0.3 §13.2.1 ·
     productivity TSD-001-PRODUCTIVITY-0.2 §12. Where the tenant PTDIKA has since moved off
     the default (A3 version history, UIC §3.1), the tenant value is shown and the default is
     named in the row note. `val:[]` = the document says the default is deliberately empty. */

  var MENUS = [
    { id: 'time', label: 'Time', owner: 'time-service', count: 26, rClass: 'ROLE_HR_STAFF',
      subs: [
        { key: 'attendance.', count: 5, rows: [
          { code: 'attendance.late_tolerance_minutes', val: [0], opt: I(0, 60, 'menit'), desc: 'Toleransi keterlambatan sebelum tercatat sebagai TERLAMBAT.' },
          { code: 'attendance.evidence_retention_days', val: [90], opt: I(1, 3650, 'hari'), desc: null },
          { code: 'attendance.correction_window_days', val: null, opt: I(undefined, undefined, 'hari'), desc: null }
        ] },
        { key: 'leave.', count: 5, rows: [
          { code: 'leave.approval_extra_tier_approver', val: null, opt: D(null), desc: null, note: 'Single row with no default in the time-service table — PROB-SERVICE-371 questions whether it is a setting at all.' },
          { code: 'leave.carryover_max_days', val: null, opt: I(undefined, undefined, 'hari'), desc: null },
          { code: 'leave.carryover_mode', val: null, opt: D(null), desc: null },
          { code: 'leave.joint_leave_deducts_annual', val: null, opt: BOOL, desc: null },
          { code: 'leave.max_negative_balance_days', val: [2], opt: I(undefined, undefined, 'hari'), desc: null }
        ] },
        { key: 'overtime.', count: 6, rows: [
          { code: 'overtime.max_hours_per_day', val: [4], opt: I(undefined, undefined, 'jam'), desc: null },
          { code: 'overtime.max_hours_per_week', val: null, opt: I(undefined, undefined, 'jam'), desc: null },
          { code: 'overtime.retroactive_window_days', val: null, opt: I(undefined, undefined, 'hari'), desc: null }
        ] },
        { key: 'sick.', count: 4, rows: [
          { code: 'sick.doctor_note_required', val: null, opt: BOOL, desc: null },
          { code: 'sick.reject_window_days', val: null, opt: I(undefined, undefined, 'hari'), desc: null }
        ] },
        { key: 'schedule.', count: 3, rows: [] },
        { key: 'oncall.', count: 2, rows: [] },
        { key: 'outbox.', count: 1, rows: [] }
      ] },

    { id: 'finance', label: 'Finance', owner: 'finance-service', count: 27, rClass: 'ROLE_FINANCE_OFFICER',
      subs: [
        { key: 'finance.benefit.', count: 6, rows: [
          { code: 'finance.benefit.claim_backdate_limit_days', val: [90], opt: I(undefined, undefined, 'hari'), desc: null },
          { code: 'finance.benefit.enabled', val: [true], opt: BOOL, desc: null },
          { code: 'finance.benefit.grace_period_days', val: [14], opt: I(undefined, undefined, 'hari'), desc: null },
          { code: 'finance.benefit.grade_change_recalc_enabled', val: [false], opt: BOOL, desc: null },
          { code: 'finance.benefit.max_family_beneficiaries', val: [5], opt: I(undefined, undefined, 'orang'), desc: null },
          { code: 'finance.benefit.period_close_date', val: ['12-31'], opt: T('MM-DD'), desc: null, note: 'The one finance key whose value is a date, not a number — a bounded number box cannot hold it (TSD-FINANCE §16.2.1).' }
        ] },
        { key: 'finance.loan.', count: 14, rows: [
          { code: 'finance.loan.arrears_treatment', val: ['SHIFT_BACKWARD'], opt: D(['SHIFT_BACKWARD']), desc: null, note: 'Two values exist (shift backward / chase in the next period); only the first is named in code form anywhere in the corpus, so only that one is offered.' },
          { code: 'finance.loan.early_settlement_allowed', val: [true], opt: BOOL, desc: null },
          { code: 'finance.loan.early_settlement_fee_amount', val: [], opt: I(), desc: null, badges: [{ t: 'EMPTY — DENY BY DEFAULT', k: 'green' }], note: 'Fee switched on with the amount still empty means the setting is incomplete — early settlement is refused rather than charged at zero.' },
          { code: 'finance.loan.early_settlement_fee_enabled', val: [false], opt: BOOL, desc: null },
          { code: 'finance.loan.early_settlement_fee_unit', val: [], opt: D(null), desc: null, note: 'Percentage of the whole remaining obligation, or a fixed amount — neither is named in code form. Does not apply while the fee is off.' },
          { code: 'finance.loan.enabled', val: null, opt: BOOL, desc: null, badges: [{ t: 'NO DEFAULT YET', k: 'red' }], note: 'FD-120 gives all three finance modules a per-company flag but writes a default only for benefit (true) and cash advance (false).' },
          { code: 'finance.loan.installment_start_point', val: ['NEAREST_PAYROLL'], opt: D(['NEAREST_PAYROLL']), desc: null, note: 'Two named values (nearest payroll / next payroll); only the default is written in code form.' },
          { code: 'finance.loan.interest_bearing', val: [], opt: BOOL, desc: null, badges: [{ t: 'EMPTY — DENY BY DEFAULT', k: 'green' }], note: 'Empty means interest-free, and that is a decision: this one flag switches the whole behaviour of the loan module.' },
          { code: 'finance.loan.max_active_count', val: [1], opt: I(undefined, undefined, 'pinjaman'), desc: null },
          { code: 'finance.loan.tenor_choice_pattern', val: [], opt: D(null), desc: null, note: 'Three values (every month · multiples of three · own list); does not apply while tenor_mode is UNIFORM.' },
          { code: 'finance.loan.tenor_custom_list', val: [6, 12, 24], opt: I(undefined, undefined, 'bulan'), desc: null, multi: true },
          { code: 'finance.loan.tenor_max_months', val: [24], opt: I(undefined, undefined, 'bulan'), desc: null, note: 'Default 12; this company runs 24. Shortest ≤ longest is refused at save time.' },
          { code: 'finance.loan.tenor_min_months', val: [6], opt: I(undefined, undefined, 'bulan'), desc: null, note: 'Default 1 (no lower bound in practice); this company runs 6.' },
          { code: 'finance.loan.tenor_mode', val: ['UNIFORM'], opt: D(['UNIFORM', 'INPUT']), desc: null }
        ] },
        { key: 'finance.cash_advance.', count: 4, rows: [
          { code: 'finance.cash_advance.enabled', val: [false], opt: BOOL, desc: null, note: 'The only finance module where money leaves before any evidence exists — off by default, deliberately.' },
          { code: 'finance.cash_advance.max_outstanding_count', val: [1], opt: I(undefined, undefined, 'uang muka'), desc: null },
          { code: 'finance.cash_advance.second_stage_deadline_days', val: [30], opt: I(undefined, undefined, 'hari'), desc: null, note: 'Counted from the moment the first deadline lapses, not from the anchor date.' },
          { code: 'finance.cash_advance.settlement_deadline_days', val: [14], opt: I(undefined, undefined, 'hari'), desc: null }
        ] },
        { key: 'finance.', count: 3, rows: [
          { code: 'finance.reinstate_outstanding_on_rehire', val: [false], opt: BOOL, desc: null },
          { code: 'finance.reminder_escalation_threshold_days', val: [3], opt: I(1, 14, 'hari'), desc: null, note: 'One number for every finance decision point — the only finance key whose bounds the owning document does state.' },
          { code: 'finance.retention.years', val: [2], opt: I(2, undefined, 'tahun'), desc: null, badges: [{ t: 'NESTED PREFIX, DROPPED', k: 'blue' }], note: 'Two years is both the default and the floor: anything lower is refused at save time. Raising it is free.' }
        ] }
      ] },

    { id: 'payroll', label: 'Payroll', owner: 'payroll-proxy-service', count: 8, rClass: 'ROLE_PAYROLL_OFFICER',
      subs: [{ key: null, count: 8, rows: [
        { code: 'payroll.allow_lock_before_cutoff', val: [false], opt: BOOL, desc: null },
        { code: 'payroll.bulk_change_escalation_count', val: [], opt: I(), desc: null, badges: [{ t: 'EMPTY — VALID', k: 'green' }] },
        { code: 'payroll.closing_day_of_month', val: [21], opt: I(1, 31, 'tanggal'), desc: null, note: 'Default 25; this company moved to 21 on 14 July 2026 (version 2). In months without that date it falls to the last day of the month.' },
        { code: 'payroll.past_period_recheck_months', val: null, opt: I(undefined, undefined, 'bulan'), desc: null, badges: [{ t: 'DEFAULT DISPUTED', k: 'red' }], note: 'The payroll document writes a default of 3 months; the settings side carries no value at all. Two final documents, two answers — PROB-SERVICE-441.' },
        { code: 'payroll.prorate_basis', val: ['CALENDAR_DAYS'], opt: D(['CALENDAR_DAYS', 'WORKING_DAYS', 'FIXED_30']), desc: null, note: 'The settings dataset names only the value in force; the payroll document names all three. The offer follows the owning document.' },
        { code: 'payroll.suspension_pay_mode', val: ['FULL'], opt: D(['FULL', 'PARTIAL', 'NONE']), desc: null, note: 'The payroll document calls the same three values PREPARED_FULL / PREPARED_PARTIAL / CALCULATED_ZERO. Same setting, two vocabularies — PROB-SERVICE-441.' },
        { code: 'payroll.suspension_pay_percent', val: null, opt: I(0, 100, '%'), desc: null, badges: [{ t: 'EMPTY — CONDITIONAL', k: 'amber' }], note: 'Valid while suspension_pay_mode is not PARTIAL. Becomes mandatory the second PARTIAL is picked.' },
        { code: 'payroll.work_minutes_rounding', val: null, opt: I(undefined, undefined, 'menit'), desc: null, badges: [{ t: 'DEFAULT DISPUTED', k: 'red' }], note: 'The payroll document writes a default of 0 (no rounding); the settings side carries no value — PROB-SERVICE-441.' }
      ] }] },

    { id: 'performance', label: 'Performance', owner: 'performance-service', count: 7, rClass: 'ROLE_DEPT_MANAGER',
      subs: [{ key: null, count: 7, rows: [
        { code: 'performance.additional_item_max_ratio', val: [30], opt: I(undefined, undefined, '%'), desc: null },
        { code: 'performance.assessment_structure_id', val: ['b1c2d3e4-0001-4a10-9c00-000000000001'], opt: T(), desc: null, badges: [{ t: 'POINTER', k: 'indigo' }],
          note: 'A uuid pointing at a company-service structure row. Settings has no field that carries the pointed-at name, and the control is a free text box where a named picker belongs — PROB-FRONTEND-038.' },
        { code: 'performance.objection_answer_deadline_days', val: [7], opt: I(undefined, undefined, 'hari'), desc: null, badges: [{ t: 'FROZEN PER SHEET', k: 'amber' }] },
        { code: 'performance.objection_deadline_days', val: [14], opt: I(undefined, undefined, 'hari'), desc: null, badges: [{ t: 'FROZEN PER SHEET', k: 'amber' }] },
        { code: 'performance.period_length_days', val: [180], opt: I(undefined, undefined, 'hari'), desc: null, badges: [{ t: 'FROZEN PER PERIOD', k: 'amber' }] },
        { code: 'performance.return_quota', val: [1], opt: I(undefined, undefined, 'kali'), desc: null },
        { code: 'performance.scale_length', val: [5], opt: I(undefined, undefined, 'tingkat'), desc: null, badges: [{ t: 'FROZEN PER PERIOD', k: 'amber' }] }
      ] }] },

    { id: 'productivity', label: 'Productivity', owner: 'productivity-service', count: 2, rClass: 'ROLE_HR_STAFF',
      subs: [{ key: null, count: 2, rows: [
        { code: 'productivity.entry_window_days', val: [7], opt: I(undefined, undefined, 'hari'), desc: null,
          badges: [{ t: 'DEFAULT SETTLED', k: 'green' }, { t: '3 GATES', k: 'blue' }], note: 'Bounds not generated yet. Drives back-dating a worklog, editing a worklog and re-opening a task — three gates, one refusal code.' },
        { code: 'productivity.task_due_reminder_days', val: [3], opt: I(undefined, undefined, 'hari'), desc: null,
          badges: [{ t: 'PROVISIONAL', k: 'amber' }, { t: 'RIDES 2 MODULES', k: 'blue' }], note: 'Bounds left open by the owning document. Reminder distance for task deadlines AND mandatory form deadlines — one key, two modules.' }
      ] }] },

    { id: 'document', label: 'Document', owner: 'document-service', count: 2, rClass: null,
      subs: [{ key: null, count: 2, rows: [
        { code: 'document.storage_quota_gb', val: null, opt: null, desc: null, badges: [{ t: 'PROVISIONAL NAME', k: 'red' }],
          note: 'One half of the old <code>document.storage_quota</code>. The split is decided, the name is not locked in any document (DUMMY-CONFIG-002) — quoting it as final contract is forbidden.' },
        { code: 'document.storage_quota_warning_percent', val: null, opt: null, desc: null, badges: [{ t: 'PROVISIONAL NAME', k: 'red' }],
          note: 'The other half of the same split. Neither the value nor the kind of offer has been drawn up by document-service, so no control shape can legally be rendered yet.' }
      ] }] },

    { id: 'organization', label: 'Organization', owner: 'company-service', count: 3, rClass: 'ROLE_SYSTEM_ADMIN',
      subs: [{ key: null, count: 3, rows: [
        { code: 'BRANCH_HIERARCHY_MODE', val: ['DISABLED'], opt: D(['ENABLED', 'DISABLED']), desc: null,
          note: 'Not an R/O/D setting even though one of its values is named DISABLED. Sending confirm_transition on this row is refused 422.' },
        { code: 'COST_CENTER_ASSIGNMENT_MODE', val: ['OPTIONAL'], opt: D(['REQUIRED', 'OPTIONAL', 'DISABLED']), desc: null, rod: true, gap: 37, active: 240,
          note: 'Gap today: <strong>37 of 240 active employees</strong> hold no Cost Center. Once the gap view is deployed that refuses a move to REQUIRED (422 ASSIGNMENT_GAP_BLOCKS_REQUIRED); today the same move answers 500. Moving to DISABLED keeps the historical assignments.' },
        { code: 'SBU_ASSIGNMENT_MODE', val: ['OPTIONAL'], opt: D(['REQUIRED', 'OPTIONAL', 'DISABLED']), desc: null, rod: true, gap: 0, active: 240,
          note: 'Gap today: <strong>0</strong> — the only row in the menu projected to pass a move to REQUIRED. That projection still cannot be reached today: the gap view is not provisioned anywhere.' }
      ] }] },

    { id: 'employee', label: 'Employee', owner: 'employee-service', count: 1, rClass: 'ROLE_HR_STAFF',
      subs: [{ key: null, count: 1, rows: [
        { code: 'REPRIMAND_RULE', val: ['NON-ACTIVE'], opt: D(['ACTIVE', 'NON-ACTIVE']), desc: null,
          note: 'The employee-service screen rp-type-setting hard-codes ACTIVE for this company while the probed value here is NON-ACTIVE — PROB-FRONTEND-042. This screen shows the probed value as it stands — <a href="reprimand-type-setting.html">open the employee-service screen</a> to compare.' }
      ] }] }
  ];

  var ROLES = [
    { id: 'ROLE_SUPER_ADMIN', person: 'Rina Amelia', cls: 'FULL', rows: 76, menus: null },
    { id: 'ROLE_HR_MANAGER', person: 'Hesti Wulandari', cls: 'FULL', rows: 76, menus: null },
    { id: 'ROLE_HR_STAFF', person: null, cls: 'R', rows: 29, menus: ['time', 'productivity', 'employee'] },
    { id: 'ROLE_FINANCE_OFFICER', person: 'Budi Santoso', cls: 'R', rows: 27, menus: ['finance'] },
    { id: 'ROLE_PAYROLL_OFFICER', person: 'Dedi Kurniawan', cls: 'R', rows: 8, menus: ['payroll'] },
    { id: 'ROLE_DEPT_MANAGER', person: null, cls: 'R', rows: 7, menus: ['performance'] },
    { id: 'ROLE_SYSTEM_ADMIN', person: null, cls: 'R', rows: 3, menus: ['organization'] },
    { id: 'ROLE_EMPLOYEE', person: 'Yanti Prasetya', cls: 'NONE', rows: 0, menus: [] }
  ];

  /* A3 — setup.ver_company_setup. RIW-1 renders 8 rows, created_at DESC. */
  var VERSIONS = [
    { id: '0198fb00-0001', code: 'COST_CENTER_ASSIGNMENT_MODE', ver: 5, after: ['DISABLED'], before: ['OPTIONAL'], at: '2026-08-08T10:04:12+07:00', by: { nama: 'Rina Amelia', nik: '20210715' }, sys: false, anon: false },
    { id: '0198fb00-0002', code: 'attendance.late_tolerance_minutes', ver: 2, after: [15], before: [0], at: '2026-08-06T09:12:44+07:00', by: { nama: 'Hesti Wulandari', nik: '20190310' }, sys: false, anon: false },
    { id: '0198fb00-0003', code: 'finance.loan.tenor_custom_list', ver: 2, after: [6, 12, 24], before: [6, 12], at: '2026-07-30T14:02:10+07:00', by: { nama: 'Hesti Wulandari', nik: '20190310' }, sys: false, anon: false },
    { id: '0198fb00-0004', code: 'payroll.closing_day_of_month', ver: 2, after: [21], before: [25], at: '2026-07-14T10:32:11+07:00', by: { nama: 'Rina Amelia', nik: '20210715' }, sys: false, anon: false },
    { id: '0198fb00-0005', code: 'settings.identity_retention_days', ver: 3, after: [730], before: [365], at: '2026-06-02T02:00:00+07:00', by: { nama: 'SYSTEM', nik: 'SYSTEM' }, sys: true, anon: false, locked: true },
    { id: '0198fb00-0006', code: 'document.storage_quota_gb', ver: 1, after: [], before: null, at: '2026-05-20T02:00:00+07:00', by: { nama: 'SYSTEM', nik: 'SYSTEM' }, sys: true, anon: false },
    { id: '0198fb00-0007', code: 'leave.max_negative_balance_days', ver: 2, after: [2], before: [0], at: '2026-03-11T08:45:00+07:00', by: { nama: 'ANONYMIZED', nik: 'ANONYMIZED' }, sys: false, anon: true },
    { id: '0198fb00-0008', code: 'productivity.entry_window_days', ver: 1, after: [7], before: null, at: '2026-01-05T02:00:00+07:00', by: { nama: 'SYSTEM', nik: 'SYSTEM' }, sys: true, anon: false }
  ];

  /* Module filter — 9 prefixes offered as checkboxes on RIW-1. */
  var PREFIXES = [
    { p: 'attendance.', label: 'Time — attendance.' }, { p: 'leave.', label: 'Time — leave.' },
    { p: 'overtime.', label: 'Time — overtime.' }, { p: 'sick.', label: 'Time — sick.' },
    { p: 'finance.', label: 'Finance' }, { p: 'payroll.', label: 'Payroll' },
    { p: 'performance.', label: 'Performance' }, { p: 'productivity.', label: 'Productivity' },
    { p: 'document.', label: 'Document' }
  ];

  /* A5/A6/A7 — personal data erasure. Nine depositary services (notification-service is the ninth). */
  var ERASURE = [
    { id: 'e5f6a7b8-0001-4a10-9c00-000000000001', employee_id: 'c8a1f2b3-0009-4a10-9c00-000000000009',
      nama: 'Sari Lestari', nik: '20180405', request_status: 'IN_PROGRESS',
      requested_at: '2026-08-08T00:00:00+07:00', requested_at_timezone: 'Asia/Jakarta',
      recorded_at: '2026-08-12T09:20:00+07:00', recorded_by: { nama: 'Hesti Wulandari', nik: '20190310' },
      completed_at: null, completed_at_timezone: null,
      progress: [
        { service_code: 'time-service', progress_status: 'COMPLETED', broadcast_count: 3, last_broadcast_at: '2026-08-15T02:00:00+07:00', completed_at: '2026-08-15T04:12:00+07:00' },
        { service_code: 'finance-service', progress_status: 'COMPLETED', broadcast_count: 3, last_broadcast_at: '2026-08-15T02:00:00+07:00', completed_at: '2026-08-15T05:40:00+07:00' },
        { service_code: 'payroll-proxy', progress_status: 'HELD', broadcast_count: 9, last_broadcast_at: '2026-08-21T02:00:00+07:00', completed_at: null },
        { service_code: 'performance-service', progress_status: 'COMPLETED', broadcast_count: 4, last_broadcast_at: '2026-08-16T02:00:00+07:00', completed_at: '2026-08-16T03:05:00+07:00' },
        { service_code: 'productivity-service', progress_status: 'COMPLETED', broadcast_count: 3, last_broadcast_at: '2026-08-15T02:00:00+07:00', completed_at: '2026-08-15T06:20:00+07:00' },
        { service_code: 'document-service', progress_status: 'COMPLETED', broadcast_count: 5, last_broadcast_at: '2026-08-17T02:00:00+07:00', completed_at: '2026-08-17T09:30:00+07:00' },
        { service_code: 'employee-service', progress_status: 'COMPLETED', broadcast_count: 3, last_broadcast_at: '2026-08-15T02:00:00+07:00', completed_at: '2026-08-15T04:55:00+07:00' },
        { service_code: 'notification-service', progress_status: 'PENDING', broadcast_count: 0, last_broadcast_at: null, completed_at: null },
        { service_code: 'settings-service', progress_status: 'PENDING', broadcast_count: 12, last_broadcast_at: '2026-08-24T02:00:00+07:00', completed_at: null }
      ] }
  ];

  /* Former employees offered by the employee-service picker (global_status IN — leavers included). */
  var SUBJECTS = [
    { id: 'c8a1f2b3-0009-4a10-9c00-000000000009', nama: 'Sari Lestari', nik: '20180405', status: 'Former employee' },
    { id: 'c8a1f2b3-0011-4a10-9c00-000000000011', nama: 'Agus Prabowo', nik: '20170112', status: 'Former employee' },
    { id: 'c8a1f2b3-0012-4a10-9c00-000000000012', nama: 'Nadia Karlina', nik: '20190822', status: 'Former employee' },
    { id: 'c8a1f2b3-0013-4a10-9c00-000000000013', nama: 'Yanti Prasetya', nik: '20200203', status: 'Active' }
  ];

  var TZ = ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'];

  function menu(id) { return MENUS.filter(function (m) { return m.id === id; })[0]; }
  function rowsOf(m) { var out = []; m.subs.forEach(function (s) { s.rows.forEach(function (r) { r._sub = s.key; out.push(r); }); }); return out; }
  function menuOfCode(code) {
    for (var i = 0; i < MENUS.length; i++) { var m = MENUS[i]; for (var j = 0; j < m.subs.length; j++) { for (var k = 0; k < m.subs[j].rows.length; k++) { if (m.subs[j].rows[k].code === code) return m.label; } } }
    if (code.indexOf('settings.') === 0) return 'Platform (locked)';
    return '—';
  }

  return { COMPANY: 'PTDIKA', MENUS: MENUS, ROLES: ROLES, VERSIONS: VERSIONS, PREFIXES: PREFIXES,
    ERASURE: ERASURE, SUBJECTS: SUBJECTS, TZ: TZ, menu: menu, rowsOf: rowsOf, menuOfCode: menuOfCode,
    LOCKED_CODE: 'settings.identity_retention_days' };
})();
