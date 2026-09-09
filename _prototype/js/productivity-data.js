// productivity-data.js — Productivity Service seed (Dataset Skenario Positif, company PTDIKA)
// Contract: FSD-001-PRODUCTIVITY-0.1 · UIC-001-PRODUCTIVITY-0.1. Menit only — zero money fields (PD-78/PD-41).
(function () {
  'use strict';

  var EMP = {
    DEDI:  { id: 'b7f4c9a2-0001', name: 'Dedi Kurniawan',   role: 'ROLE_EMPLOYEE',     position: 'Backend Engineer' },
    RINA:  { id: 'b7f4c9a2-0002', name: 'Rina Amelia',      role: 'ROLE_DEPT_MANAGER', position: 'Engineering Manager' },
    HESTI: { id: 'b7f4c9a2-0003', name: 'Hesti Wulandari',  role: 'ROLE_HR_MANAGER',   position: 'HR Manager' },
    FAJAR: { id: 'b7f4c9a2-0004', name: 'Fajar Setiawan',   role: 'ROLE_EMPLOYEE',     position: 'Field Technician' },
    SARI:  { id: 'b7f4c9a2-0005', name: 'Sari Handayani',   role: 'ROLE_HR_STAFF',     position: 'HR Staff' }
  };

  // ---------- Project & Task (FT1) ----------
  var PROJECTS = [
    { code: 'PRJ-0001', id: 'c1000000-0001', project_name: 'Migrasi Server Q3',      state: 'AKTIF', owner: 'DEDI',  created_at: '2026-06-10', archived_at: null },
    { code: 'PRJ-0002', id: 'c1000000-0002', project_name: 'Onboarding Portal 2025', state: 'ARSIP', owner: 'DEDI',  created_at: '2025-11-02', archived_at: '2026-06-15T10:00:00+07:00' },
    { code: 'PRJ-0003', id: 'c1000000-0003', project_name: 'Refactor Payroll Engine', state: 'AKTIF', owner: 'RINA', created_at: '2026-06-22', archived_at: null },
    { code: 'PRJ-0004', id: 'c1000000-0004', project_name: 'Audit Kepatuhan Data',   state: 'AKTIF', owner: 'HESTI', created_at: '2026-07-01', archived_at: null },
    { code: 'PRJ-0005', id: 'c1000000-0005', project_name: 'Rollout Absensi Cabang', state: 'AKTIF', owner: 'DEDI',  created_at: '2026-07-14', archived_at: null },
    { code: 'PRJ-0006', id: 'c1000000-0006', project_name: 'Migrasi Data Vendor',    state: 'ARSIP', owner: 'RINA',  created_at: '2025-09-08', archived_at: '2026-04-30T16:20:00+07:00' }
  ];

  // map_project_member — only is_active=true rows are rendered (FT1.07)
  var MEMBERS = {
    'PRJ-0001': [{ emp: 'DEDI', owner: true, is_active: true }, { emp: 'RINA', owner: false, is_active: true }],
    'PRJ-0003': [{ emp: 'RINA', owner: true, is_active: true }, { emp: 'DEDI', owner: false, is_active: true }],
    'PRJ-0004': [{ emp: 'HESTI', owner: true, is_active: true }],
    'PRJ-0005': [{ emp: 'DEDI', owner: true, is_active: true }],
    'PRJ-0002': [{ emp: 'DEDI', owner: true, is_active: true }],
    'PRJ-0006': [{ emp: 'RINA', owner: true, is_active: true }]
  };

  var CATEGORIES = [
    { code: 'CAT-0001', name: 'Pengembangan',             is_active: true,  used: true,  created_at: '2026-01-05' },
    { code: 'CAT-0002', name: 'Pemeliharaan & Perbaikan', is_active: true,  used: false, created_at: '2026-01-05' },
    { code: 'CAT-0003', name: 'Rapat & Koordinasi',       is_active: true,  used: true,  created_at: '2026-01-05' },
    { code: 'CAT-0004', name: 'Dokumentasi',              is_active: true,  used: true,  created_at: '2026-01-05' },
    { code: 'CAT-0005', name: 'Dukungan Pengguna',        is_active: true,  used: false, created_at: '2026-01-05' },
    { code: 'CAT-0006', name: 'Lain-lain',                is_active: false, used: false, created_at: '2026-01-05' }
  ];

  var TASKS = [
    { code: 'TSK-0001', task_title: 'Perbaikan bug checkout', description: 'Checkout gagal saat kupon kedaluwarsa dipakai bersamaan dengan poin loyalitas.',
      project: 'PRJ-0001', category: 'CAT-0001', assignee: 'DEDI', assigner: 'RINA', task_origin: 'DITUGASKAN',
      status: 'SEDANG_DIKERJAKAN', priority: 'TINGGI', due_date: '2026-08-12', original_due_date: '2026-08-10', created_at: '2026-06-12' },
    { code: 'TSK-0002', task_title: 'Update dokumentasi API', description: 'Menyegarkan koleksi endpoint publik pada portal developer.',
      project: null, category: 'CAT-0004', assignee: 'DEDI', assigner: null, task_origin: 'DIBUAT_SENDIRI',
      status: 'SELESAI', priority: 'SEDANG', due_date: '2026-07-30', original_due_date: '2026-07-30', created_at: '2026-07-02' },
    { code: 'TSK-0003', task_title: 'Rapat koordinasi mingguan', description: 'Sinkronisasi lintas tim setiap Senin.',
      project: 'PRJ-0001', category: 'CAT-0003', assignee: 'DEDI', assigner: null, task_origin: 'DIBUAT_SENDIRI',
      status: 'TERTAHAN', priority: 'RENDAH', due_date: '2026-08-05', original_due_date: '2026-08-05', created_at: '2026-07-06' },
    { code: 'TSK-0004', task_title: 'Uji beban modul absensi', description: 'Skenario 5.000 tap serentak pada jam masuk.',
      project: 'PRJ-0005', category: 'CAT-0002', assignee: 'DEDI', assigner: 'RINA', task_origin: 'DITUGASKAN',
      status: 'BELUM_DIKERJAKAN', priority: 'MENDESAK', due_date: '2026-08-20', original_due_date: '2026-08-20', created_at: '2026-07-20' },
    { code: 'TSK-0005', task_title: 'Bersihkan data vendor ganda', description: null,
      project: null, category: 'CAT-0005', assignee: 'DEDI', assigner: null, task_origin: 'DIBUAT_SENDIRI',
      status: 'DIBATALKAN', priority: 'RENDAH', due_date: '2026-07-18', original_due_date: '2026-07-18', created_at: '2026-07-09' }
  ];

  // log_task_change — sort created_at DESC (FT1.13)
  var TASK_HISTORY = {
    'TSK-0001': [
      { changed_field: 'DUE_DATE', old_value: '2026-08-10', new_value: '2026-08-12', change_reason: 'Menunggu konfirmasi vendor pembayaran pihak ke-3', created_by: 'RINA', created_at: '2026-08-02T09:00:00+07:00' },
      { changed_field: 'STATUS', old_value: 'TERTAHAN', new_value: 'SEDANG_DIKERJAKAN', change_reason: null, created_by: 'DEDI', created_at: '2026-07-28T10:15:00+07:00' },
      { changed_field: 'TASK_CATEGORY', old_value: 'Pemeliharaan & Perbaikan', new_value: 'Pengembangan', change_reason: null, created_by: 'RINA', created_at: '2026-06-20T11:00:00+07:00' }
    ],
    'TSK-0003': [
      { changed_field: 'STATUS', old_value: 'SEDANG_DIKERJAKAN', new_value: 'TERTAHAN', change_reason: null, created_by: 'DEDI', created_at: '2026-07-27T16:40:00+07:00' }
    ]
  };

  // ---------- Timesheet (FT2) ----------
  var ACTIVITY_TYPES = [
    { code: 'ACT-0001', name: 'Mengerjakan', is_active: true },
    { code: 'ACT-0002', name: 'Rapat', is_active: true },
    { code: 'ACT-0003', name: 'Peninjauan Kode', is_active: true },
    { code: 'ACT-0004', name: 'Dukungan', is_active: true },
    { code: 'ACT-0005', name: 'Pelatihan', is_active: true },
    { code: 'ACT-0006', name: 'Lain-lain', is_active: false }
  ];

  var WORKLOGS = [
    { code: 'WLG-0001', employee: 'DEDI', task: 'TSK-0001', activity: 'ACT-0001', work_date: '2026-07-20', started_at: '09:00', stopped_at: '13:00',
      duration_minutes: 240, origin: 'DIUKUR_MESIN', is_corrected: false, correction_mode: null, paid_group: 'PWG-0001', notes: null },
    { code: 'WLG-0002', employee: 'DEDI', task: 'TSK-0003', activity: 'ACT-0002', work_date: '2026-07-21', started_at: null, stopped_at: null,
      duration_minutes: 60, origin: 'DIKETIK_MANUSIA', is_corrected: false, correction_mode: null, paid_group: null, notes: 'Rapat koordinasi mingguan' },
    { code: 'WLG-0003', employee: 'DEDI', task: 'TSK-0001', activity: 'ACT-0001', work_date: '2026-07-22', started_at: '08:30', stopped_at: '23:59',
      duration_minutes: 480, origin: 'DIHENTIKAN_SISTEM', is_corrected: false, correction_mode: null, paid_group: 'PWG-0001', notes: null },
    { code: 'WLG-0004', employee: 'DEDI', task: 'TSK-0001', activity: 'ACT-0003', work_date: '2026-07-23', started_at: '14:00', stopped_at: '23:59',
      duration_minutes: 180, origin: 'DIHENTIKAN_SISTEM', is_corrected: false, correction_mode: null, paid_group: 'PWG-0001', notes: null }
  ];

  // log_worklog_change — zero change_reason column (contrast with log_task_change)
  // Empty on load: WLG-0003 still reads 480 minutes and correction_mode IS NULL — the
  // 480→300 entry is written by the Activities correction flow itself (FSD §5.1 AC-A4).
  var WORKLOG_HISTORY = {};

  var PERIOD = {
    code: 'PER-JUL2026', employee: 'DEDI', period_start: '2026-07-01', period_end: '2026-07-31', state: 'DISAHKAN',
    total_minutes: 960, cancelled_task_minutes: 0, pending_system_stop_count: 0, near_daily_limit_flags: [],
    breakdown_by_task: [
      { task: 'TSK-0001', total_minutes: 900 },
      { task: 'TSK-0003', total_minutes: 60 }
    ],
    origin_composition: { DIUKUR_MESIN: 240, DIKETIK_MANUSIA: 60, DIHENTIKAN_SISTEM: 660 },
    submitted_at: '2026-08-01T17:00:00+07:00', approved_at: '2026-08-01T19:00:00+07:00', payroll_confirmed_at: '2026-08-02T06:00:00+07:00'
  };

  var PERIOD_STATES = [
    { state: 'BELUM_DIAJUKAN',      tone: 'grey',  meaning: 'Period exists, owner has not submitted it yet.', gate: 'Submit is open once every DIHENTIKAN_SISTEM row is settled.' },
    { state: 'MENUNGGU_PENGESAHAN', tone: 'amber', meaning: 'Submitted; a workflow instance is running.', gate: 'Only workflow.process.completed / .cancelled moves it (zero client endpoint).' },
    { state: 'DIKEMBALIKAN',        tone: 'orange', meaning: 'Returned to the owner — reachable from two directions.', gate: 'workflow.process.cancelled OR reopen from DISAHKAN (PD-82).' },
    { state: 'DISAHKAN',            tone: 'green', meaning: 'Approved recap.', gate: 'Reopen allowed only while payroll_confirmed_at is NULL — after that it is permanent.' }
  ];

  // ---------- Group for Payroll (FT3) ----------
  var PAID_GROUPS = [
    { code: 'PWG-0001', group_name: 'Kelompok Berbayar — Teknis',   is_active: true,  created_at: '2026-07-15', created_by: 'HESTI', mapped: true },
    { code: 'PWG-0002', group_name: 'Kelompok Berbayar — Lapangan', is_active: true,  created_at: '2026-08-03', created_by: 'HESTI', mapped: true },
    { code: 'PWG-0003', group_name: 'Kelompok Berbayar — Proyek',   is_active: false, created_at: '2026-05-11', created_by: 'HESTI', mapped: false }
  ];

  var MAPPINGS = [
    { code: 'MAP-0001', category: 'CAT-0001', group: 'PWG-0001', is_active: true,  created_at: '2026-07-15', created_by: 'HESTI', deactivation_reason: null },
    { code: 'MAP-0002', category: 'CAT-0004', group: 'PWG-0002', is_active: true,  created_at: '2026-08-03', created_by: 'HESTI', deactivation_reason: null },
    { code: 'MAP-0003', category: 'CAT-0002', group: 'PWG-0001', is_active: false, created_at: '2026-06-02', created_by: 'HESTI', deactivation_reason: 'Kategori dipindah ke Kelompok Berbayar — Lapangan' }
  ];

  // ---------- Forms & Survey (FT4) ----------
  var FORMS = [
    { code: 'FRM-0001', form_title: 'Survei Kepuasan Kerja Q3', identity_mode: 'BER_IDENTITAS', obligation: 'SUKARELA',
      audience_scope: 'SELURUH_KARYAWAN', audience_positions: [], is_sensitive: false, response_due_date: null, retention_months: null,
      state: 'TERBUKA', submission_count: 5, attributes_locked: true, created_at: '2026-07-18', affordance: 'AGGREGATE',
      questions: [
        { order: 1, question_type: 'PILIHAN_SATU', question_text: 'Seberapa puas Anda bekerja bulan ini? (1-5)', question_choices: ['1', '2', '3', '4', '5'] },
        { order: 2, question_type: 'ISIAN_TEKS', question_text: 'Saran perbaikan?', question_choices: [] }
      ],
      aggregate: [{ answered_count: 5, aggregate: { '1': 0, '2': 0, '3': 1, '4': 3, '5': 1 } }, { answered_count: 5, aggregate: { count: 5 } }],
      respondent_count: 5 },
    { code: 'FRM-0002', form_title: 'Update Data Kontak Darurat', identity_mode: 'BER_IDENTITAS', obligation: 'WAJIB',
      audience_scope: 'PER_BAGIAN', audience_positions: ['Engineering', 'Field Operations'], is_sensitive: false, response_due_date: '2026-08-15', retention_months: null,
      state: 'TERBUKA', submission_count: 1, attributes_locked: true, created_at: '2026-07-20', affordance: 'DETAIL',
      questions: [
        { order: 1, question_type: 'ISIAN_TEKS', question_text: 'Nama kontak darurat', question_choices: [] },
        { order: 2, question_type: 'ISIAN_TEKS', question_text: 'Nomor telepon kontak darurat', question_choices: [] },
        { order: 3, question_type: 'PILIHAN_SATU', question_text: 'Hubungan', question_choices: ['Pasangan', 'Orang tua', 'Saudara', 'Lainnya'] }
      ],
      submissions: [{ code: 'SUB-0002', respondent: 'DEDI', submitted_at: '2026-07-26T09:12:00+07:00', item_count: 3 }],
      pending: [{ emp: 'FAJAR' }, { emp: 'RINA' }],
      grants: [{ target: 'FAJAR', grant_reason: 'Fajar cuti sakit saat jendela pengisian ditutup', granted_by: 'HESTI', granted_at: '2026-08-05T10:00:00+07:00' }] },
    { code: 'FRM-0003', form_title: 'Survei Anonim Kepuasan Fasilitas Kantor', identity_mode: 'ANONIM', obligation: 'SUKARELA',
      audience_scope: 'SELURUH_KARYAWAN', audience_positions: [], is_sensitive: false, response_due_date: null, retention_months: null,
      state: 'TERBUKA', submission_count: 3, attributes_locked: true, created_at: '2026-07-22', affordance: 'ANON',
      questions: [
        { order: 1, question_type: 'PILIHAN_BANYAK', question_text: 'Fasilitas mana yang perlu diperbaiki?', question_choices: ['Pendingin ruangan', 'Pantry', 'Ruang rapat', 'Parkir'] },
        { order: 2, question_type: 'ISIAN_TEKS', question_text: 'Catatan tambahan', question_choices: [] }
      ],
      submissions: [
        { code: null, respondent: null, submitted_at: '2026-07-24T11:02:00+07:00', item_count: 2 },
        { code: null, respondent: null, submitted_at: '2026-07-25T15:41:00+07:00', item_count: 2 },
        { code: null, respondent: null, submitted_at: '2026-07-28T08:19:00+07:00', item_count: 2 }
      ] }
  ];

  // Self surface (My Submissions) — anonymous forms never appear in the list
  var MY_SUBMISSIONS = [
    { code: 'SUB-0001', form: 'FRM-0001', already_submitted: true, window_granted: false, submitted_at: '2026-07-25T14:00:00+07:00',
      items: [
        { question_text_snapshot: 'Seberapa puas Anda bekerja bulan ini? (1-5)', question_type_snapshot: 'PILIHAN_SATU', question_choices_snapshot: ['1', '2', '3', '4', '5'], answer_value: '4' },
        { question_text_snapshot: 'Saran perbaikan?', question_type_snapshot: 'ISIAN_TEKS', question_choices_snapshot: [], answer_value: 'Perlu waktu fokus tanpa rapat pada pagi hari.' }
      ],
      changes: [{ changed_field: 'answer_value', old_value: 'Rapat terlalu sering', new_value: 'Perlu waktu fokus tanpa rapat pada pagi hari.', created_at: '2026-07-29T10:20:00+07:00' }] },
    { code: 'SUB-0002', form: 'FRM-0002', already_submitted: true, window_granted: false, submitted_at: '2026-07-26T09:12:00+07:00',
      items: [
        { question_text_snapshot: 'Nama kontak darurat', question_type_snapshot: 'ISIAN_TEKS', question_choices_snapshot: [], answer_value: 'Sri Kurniawan' },
        { question_text_snapshot: 'Nomor telepon kontak darurat', question_type_snapshot: 'ISIAN_TEKS', question_choices_snapshot: [], answer_value: '0812-3344-5566' },
        { question_text_snapshot: 'Hubungan', question_type_snapshot: 'PILIHAN_SATU', question_choices_snapshot: ['Pasangan', 'Orang tua', 'Saudara', 'Lainnya'], answer_value: 'Pasangan' }
      ],
      changes: [] }
  ];

  // ---------- lookup + presentation helpers ----------
  function byCode(list, code) { for (var i = 0; i < list.length; i++) if (list[i].code === code) return list[i]; return null; }
  function empName(k) { return EMP[k] ? EMP[k].name : '—'; }
  function catName(code) { var c = byCode(CATEGORIES, code); return c ? c.name : '—'; }
  function projName(code) { var p = byCode(PROJECTS, code); return p ? p.project_name : null; }
  function taskName(code) { var t = byCode(TASKS, code); return t ? t.task_title : '—'; }
  function actName(code) { var a = byCode(ACTIVITY_TYPES, code); return a ? a.name : '—'; }
  function groupName(code) { var g = byCode(PAID_GROUPS, code); return g ? g.group_name : '—'; }

  var TASK_STATUS = {
    BELUM_DIKERJAKAN:  { tone: 'grey',   label: 'BELUM_DIKERJAKAN' },
    SEDANG_DIKERJAKAN: { tone: 'blue',   label: 'SEDANG_DIKERJAKAN' },
    TERTAHAN:          { tone: 'amber',  label: 'TERTAHAN' },
    SELESAI:           { tone: 'green',  label: 'SELESAI' },
    DIBATALKAN:        { tone: 'red',    label: 'DIBATALKAN' }
  };
  // frozen transition diagram (FSD §3.3) — anything outside is 422 PROD_TASK_STATUS_TRANSITION_INVALID
  var TASK_TRANSITIONS = {
    BELUM_DIKERJAKAN:  ['SEDANG_DIKERJAKAN', 'DIBATALKAN'],
    SEDANG_DIKERJAKAN: ['TERTAHAN', 'SELESAI', 'DIBATALKAN'],
    TERTAHAN:          ['SEDANG_DIKERJAKAN', 'SELESAI', 'DIBATALKAN'],
    SELESAI:           ['SEDANG_DIKERJAKAN'],
    DIBATALKAN:        ['SEDANG_DIKERJAKAN']
  };
  var PRIORITY = { RENDAH: 'grey', SEDANG: 'blue', TINGGI: 'orange', MENDESAK: 'red' };
  var ORIGIN = {
    DIUKUR_MESIN:      { tone: 'blue',   label: 'DIUKUR_MESIN' },
    DIKETIK_MANUSIA:   { tone: 'indigo', label: 'DIKETIK_MANUSIA' },
    DIHENTIKAN_SISTEM: { tone: 'red',    label: 'DIHENTIKAN_SISTEM' }
  };
  var CORRECTION = { DIKOREKSI_PEMILIK: 'green', DITERIMA_ATASAN: 'blue' };

  function badge(tone, label) { return '<span class="sb sb--' + tone + '"><span class="sb__dot"></span>' + label + '</span>'; }
  function hours(min) { var h = Math.floor(min / 60), m = min % 60; return h + 'h' + (m ? ' ' + m + 'm' : ''); }
  function stampDate(iso) {
    if (!iso) return '—';
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var d = iso.split('T')[0].split('-');
    return String(+d[2]) + ' ' + M[+d[1] - 1] + ' ' + d[0];
  }
  function stampTime(iso) {
    if (!iso) return '—';
    var t = iso.split('T')[1];
    return stampDate(iso) + ' · ' + (t ? t.slice(0, 5) : '');
  }
  function opt(val, label) { return '<div class="dropdown__opt" data-val="' + val + '">' + (label || val) + '</div>'; }
  function selectHTML(id, placeholder, options) {
    return '<div class="ctl ctl--select" id="' + id + '"><span class="ctl__value" style="color:var(--fg-4)">' + placeholder + '</span>' +
      '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
      '<div class="dropdown">' + options.join('') + '</div></div>';
  }

  window.PROD = {
    EMP: EMP, PROJECTS: PROJECTS, MEMBERS: MEMBERS, CATEGORIES: CATEGORIES, TASKS: TASKS, TASK_HISTORY: TASK_HISTORY,
    ACTIVITY_TYPES: ACTIVITY_TYPES, WORKLOGS: WORKLOGS, WORKLOG_HISTORY: WORKLOG_HISTORY, PERIOD: PERIOD, PERIOD_STATES: PERIOD_STATES,
    PAID_GROUPS: PAID_GROUPS, MAPPINGS: MAPPINGS, FORMS: FORMS, MY_SUBMISSIONS: MY_SUBMISSIONS,
    TASK_STATUS: TASK_STATUS, TASK_TRANSITIONS: TASK_TRANSITIONS, PRIORITY: PRIORITY, ORIGIN: ORIGIN, CORRECTION: CORRECTION,
    byCode: byCode, empName: empName, catName: catName, projName: projName, taskName: taskName, actName: actName, groupName: groupName,
    badge: badge, hours: hours, stampDate: stampDate, stampTime: stampTime, opt: opt, selectHTML: selectHTML
  };
})();
