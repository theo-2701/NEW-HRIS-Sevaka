// SEVAKA HRIS — Payroll (document version) shared dataset + cell helpers.
// Grounded on FSD-001-PAYROLL-0.1 / UIC-001-PAYROLL-0.2 / ERD-001-PAYROLL-0.2 dataset examples.
(function () {
  var EMP = {
    E1: { name: 'Dewi Lestari', nik: '3273010101950002', pos: 'Staff Marketing', branch: 'Bandung', cc: 'CC-MKT-01 · Pemasaran', sbu: 'SBU Retail' },
    E2: { name: 'Bambang Suryono', nik: '3273010101880007', pos: 'Teknisi Lapangan', branch: 'Bandung', cc: 'CC-OPS-02 · Operasional Lapangan', sbu: 'SBU Retail' },
    E3: { name: 'Agus Salim', nik: '3174050203910011', pos: 'Staff Gudang', branch: 'Jakarta Pusat', cc: null, sbu: null },
    E4: { name: 'Indah Permatasari', nik: '3174050512930004', pos: 'Supervisor Keuangan', branch: 'Jakarta Pusat', cc: 'CC-FIN-01 · Keuangan', sbu: 'SBU Korporat' },
    E5: { name: 'Bayu Setiawan', nik: '3374011807940009', pos: 'Staff Penjualan', branch: 'Semarang', cc: null, sbu: 'SBU Retail' },
    E6: { name: 'Cahyo Prasetyo', nik: '3174052209890015', pos: 'Analis Data', branch: 'Jakarta Pusat', cc: 'CC-FIN-01 · Keuangan', sbu: 'SBU Korporat' },
    E7: { name: 'Fajar Nugroho', nik: '3174050904920021', pos: 'Staff Logistik', branch: 'Jakarta Pusat', cc: 'CC-OPS-01 · Operasional', sbu: 'SBU Korporat' },
    E8: { name: 'Yusuf Maulana', nik: '3273011511960013', pos: 'Teknisi Lapangan', branch: 'Bandung', cc: 'CC-OPS-02 · Operasional Lapangan', sbu: 'SBU Retail' },
    E9: { name: 'Rina Wijayanti', nik: '3374012703950018', pos: 'Staff Administrasi', branch: 'Semarang', cc: 'CC-ADM-01 · Administrasi', sbu: 'SBU Retail' }
  };
  var ACTOR = {
    RUDI: { name: 'Rudi Hartono', role: 'ROLE_PAYROLL_OFFICER' },
    MAYA: { name: 'Maya Anggraini', role: 'ROLE_HR_MANAGER' },
    HESTI: { name: 'Hesti Wulandari', role: 'Escalation approver — Direktur SDM' },
    SYS: { name: 'Sistem klien', role: 'Machine identity' }
  };

  // ---------- periods (mst_payroll_period) ----------
  var PERIODS = [
    { id: 'p9', y: 2026, m: 9, status: 'CALCULATED', g1: null, g2: null, employees: 34,
      calc: ['RUDI', '2026-09-26'], rev: null, lock: null, hand: null, openFindings: 8 },
    { id: 'p8', y: 2026, m: 8, status: 'LOCKED', g1: '2026-08-19', g2: '2026-08-19', employees: 33,
      calc: ['RUDI', '2026-08-20'], rev: ['RUDI', '2026-08-20'], lock: ['MAYA', '2026-08-22'], hand: null, openFindings: 0 },
    { id: 'p7', y: 2026, m: 7, status: 'HANDED_OVER', g1: '2026-07-24', g2: '2026-07-24', employees: 32,
      calc: ['RUDI', '2026-07-25'], rev: ['RUDI', '2026-07-26'], lock: ['MAYA', '2026-07-27'], hand: ['MAYA', '2026-07-28'], openFindings: 1 },
    { id: 'p6', y: 2026, m: 6, status: 'HANDED_OVER', g1: '2026-06-24', g2: '2026-06-24', employees: 32,
      calc: ['RUDI', '2026-06-25'], rev: ['RUDI', '2026-06-26'], lock: ['MAYA', '2026-06-29'], hand: ['MAYA', '2026-06-30'], openFindings: 0 }
  ];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function plabel(p) { return 'PP-' + p.y + '-' + String(p.m).padStart(2, '0'); }
  function pname(p) { return MONTHS[p.m - 1] + ' ' + p.y; }
  function period(id) { for (var i = 0; i < PERIODS.length; i++) if (PERIODS[i].id === id) return PERIODS[i]; return null; }

  // gate 3 = gate_3_param_snapshot_complete (UIC §2.3 derivation, not a physical column):
  // the ten parameter rows are frozen in the same transaction as the run, so a period that
  // exists always carries a complete snapshot.
  function gate3() { return true; }

  // ---------- state history (GET /periods/{id}/state-history) ----------
  var HISTORY = {
    p9: [{ from: null, to: 'CALCULATED', by: 'RUDI', at: '2026-09-26', reason: null }],
    p8: [
      { from: null, to: 'CALCULATED', by: 'RUDI', at: '2026-08-20', reason: null },
      { from: 'CALCULATED', to: 'REVIEWED', by: 'RUDI', at: '2026-08-20', reason: null },
      { from: 'REVIEWED', to: 'LOCKED', by: 'MAYA', at: '2026-08-20', reason: null },
      { from: 'LOCKED', to: 'REVIEWED', by: 'MAYA', at: '2026-08-21', reason: 'Koreksi nominal tunjangan transport dua karyawan cabang Semarang sebelum penyerahan.' },
      { from: 'REVIEWED', to: 'LOCKED', by: 'MAYA', at: '2026-08-22', reason: null }
    ],
    p7: [
      { from: null, to: 'CALCULATED', by: 'RUDI', at: '2026-07-25', reason: null },
      { from: 'CALCULATED', to: 'REVIEWED', by: 'RUDI', at: '2026-07-26', reason: null },
      { from: 'REVIEWED', to: 'LOCKED', by: 'MAYA', at: '2026-07-27', reason: null },
      { from: 'LOCKED', to: 'HANDED_OVER', by: 'MAYA', at: '2026-07-28', reason: null }
    ],
    p6: [
      { from: null, to: 'CALCULATED', by: 'RUDI', at: '2026-06-25', reason: null },
      { from: 'CALCULATED', to: 'REVIEWED', by: 'RUDI', at: '2026-06-26', reason: null },
      { from: 'REVIEWED', to: 'LOCKED', by: 'MAYA', at: '2026-06-29', reason: null },
      { from: 'LOCKED', to: 'HANDED_OVER', by: 'MAYA', at: '2026-06-30', reason: null }
    ]
  };

  // ---------- frozen parameters (10 rows, 3 categories) ----------
  var PARAMS = [
    { k: 'PTKP_ANNUAL_TABLE', c: 'REGULATION', v: 'tabel · 8 golongan (TK/0 … K/3)', src: '2024-01-01' },
    { k: 'TER_RATE_TABLE', c: 'REGULATION', v: 'tabel · 3 kategori TER (A/B/C), 44 lapis', src: '2024-01-01' },
    { k: 'BPJS_KESEHATAN_EMPLOYEE_RATE', c: 'REGULATION', v: '1,00 %', src: '2015-07-01' },
    { k: 'JHT_EMPLOYEE_RATE', c: 'REGULATION', v: '2,00 %', src: '2015-07-01' },
    { k: 'JP_EMPLOYEE_RATE', c: 'REGULATION', v: '1,00 %', src: '2015-07-01' },
    { k: 'JKK_RATE_BY_INDUSTRY', c: 'REGULATION', v: 'tabel · 5 kelompok risiko', src: '2015-07-01' },
    { k: 'PAYROLL_CUTOFF_DAY', c: 'COMPANY_SETTING', v: '25', src: null },
    { k: 'ALLOW_LOCK_BEFORE_CUTOFF', c: 'COMPANY_SETTING', v: 'false', src: null },
    { k: 'PAST_PERIOD_RECHECK_MONTHS', c: 'COMPANY_SETTING', v: '3', src: null },
    { k: 'OVERTIME_BASIS_COMPONENTS', c: 'COMPUTED_COMPOSITION', v: 'daftar · SC-001, SC-002', src: null }
  ];

  // ---------- 13 finding types (closed list, ERD §6.25A) ----------
  var FTYPES = [
    { t: 'BELOW_UMP', subj: 'Employee', born: 'Period is run', mean: 'Basic salary + fixed components sit below the branch minimum wage (UMP).', schema: 'regional_wage_compared · salary_base_compared · attestation_id' },
    { t: 'MISSING_COST_CENTER_OR_SBU', subj: 'Employee', born: 'Period is run', mean: 'Employee has no cost center and/or SBU assigned and the company default does not exist yet.', schema: 'missing_cost_center · missing_sbu · branch_id' },
    { t: 'ARRIVED_AFTER_LOCK', subj: 'Employee', born: 'Period locked before cut-off', mean: 'A fact arrived between the lock moment and the closing date.', schema: 'fact_type · fact_arrived_at · locked_at' },
    { t: 'EMPTY_HOURLY_BASIS', subj: 'Employee', born: 'Period is run', mean: 'Zero components feed the overtime basis, so the hourly wage computes to nil.', schema: 'overtime_hours · hourly_basis_amount' },
    { t: 'NOT_ELIGIBLE_BUT_PAID', subj: 'Employee', born: 'Period is run', mean: 'Overtime / unpaid-leave facts arrived for an employee who is not entitled.', schema: 'work_status_code · eligible_flag · fact_type' },
    { t: 'RECONCILIATION_MISMATCH', subj: 'Employee', born: 'Just before the period is locked', mean: 'The payroll fact list disagrees with the time-service source.', schema: 'payroll_hours · time_service_hours · delta_hours' },
    { t: 'RECAP_NOT_APPROVED', subj: 'Employee', born: 'Period is run', mean: 'The productivity recap was not yet approved when the period was calculated.', schema: 'recap_id · recap_state' },
    { t: 'PRODUCTIVITY_LATE_ARRIVAL', subj: 'Employee', born: 'Backward sweep', mean: 'A recap was approved after its origin period had already been calculated.', schema: 'origin_period · approved_at · delta_amount' },
    { t: 'SCORE_REVISED', subj: 'Employee', born: 'Backward sweep', mean: 'A performance score changed after the period had been calculated.', schema: 'score_before · score_after · delta_amount' },
    { t: 'ANNUAL_TAX_RECALC_SKIPPED', subj: 'Employee', born: 'December period', mean: 'The annual PPh21 recalculation was skipped because the January-onward history is incomplete.', schema: 'missing_months[] · reason' },
    { t: 'JKK_ZERO_INDUSTRY_MISSING', subj: 'Employee', born: 'Period is run', mean: 'The company industry_id is empty, so the JKK rate resolves to zero.', schema: 'industry_id · jkk_rate_used' },
    { t: 'TAX_STATUS_ASSUMED', subj: 'Employee', born: 'Period is run', mean: 'No emp_ptkp_period row (or a gap in it), so the tax status had to be assumed.', schema: 'assumed_ptkp_code · gap_from · gap_until' },
    { t: 'PERIOD_NOT_PICKED_UP', subj: 'Period (employee_id NULL)', born: 'Bridge row not picked up by the client', mean: 'The period was handed over but the client system has not collected it. A manual DIPERBAIKI is rejected.', schema: 'handover_id · handed_over_at · days_waiting' }
  ];

  // ---------- findings (log_payroll_finding) ----------
  var FINDINGS = [
    { id: 'FND-0001', p: 'p9', t: 'BELOW_UMP', e: 'E1', at: '2026-09-26', fs: null, reason: null,
      detail: { regional_wage_compared: 4209309, salary_base_compared: 4000000, attestation_id: 'ATT-0002' } },
    { id: 'FND-0002', p: 'p9', t: 'MISSING_COST_CENTER_OR_SBU', e: 'E3', at: '2026-09-26', fs: null, reason: null,
      detail: { missing_cost_center: true, missing_sbu: true, branch_id: 'BR-JKT-01' } },
    { id: 'FND-0003', p: 'p9', t: 'MISSING_COST_CENTER_OR_SBU', e: 'E5', at: '2026-09-26', fs: null, reason: null,
      detail: { missing_cost_center: true, missing_sbu: false, branch_id: 'BR-SMG-01' } },
    { id: 'FND-0004', p: 'p9', t: 'EMPTY_HOURLY_BASIS', e: 'E2', at: '2026-09-26', fs: null, reason: null,
      detail: { overtime_hours: 12.5, hourly_basis_amount: 0 } },
    { id: 'FND-0005', p: 'p9', t: 'RECONCILIATION_MISMATCH', e: 'E4', at: '2026-09-26', fs: null, reason: null,
      detail: { payroll_hours: 8, time_service_hours: 10.5, delta_hours: 2.5 } },
    { id: 'FND-0006', p: 'p9', t: 'RECAP_NOT_APPROVED', e: 'E6', at: '2026-09-26', fs: null, reason: null,
      detail: { recap_id: 'RCP-2026-09-014', recap_state: 'MENUNGGU_PENGESAHAN' } },
    { id: 'FND-0007', p: 'p9', t: 'TAX_STATUS_ASSUMED', e: 'E2', at: '2026-09-26', fs: null, reason: null,
      detail: { assumed_ptkp_code: 'TK/0', gap_from: '2026-08-01', gap_until: '2026-09-30' } },
    { id: 'FND-0008', p: 'p9', t: 'JKK_ZERO_INDUSTRY_MISSING', e: 'E1', at: '2026-09-26', fs: null, reason: null,
      detail: { industry_id: null, jkk_rate_used: 0 } },
    { id: 'FND-0009', p: 'p8', t: 'BELOW_UMP', e: 'E1', at: '2026-08-20', fs: 'DIPERBAIKI', reason: null, by: 'RUDI', rat: '2026-08-21',
      detail: { regional_wage_compared: 4209309, salary_base_compared: 4000000, attestation_id: 'ATT-0001' } },
    { id: 'FND-0010', p: 'p8', t: 'MISSING_COST_CENTER_OR_SBU', e: 'E3', at: '2026-08-20', fs: 'DITERIMA', by: 'RUDI', rat: '2026-08-21',
      reason: 'Cabang Jakarta Pusat belum memiliki default cost center — dijadwalkan pada penataan struktur Q4 2026.',
      detail: { missing_cost_center: true, missing_sbu: true, branch_id: 'BR-JKT-01' } },
    { id: 'FND-0011', p: 'p7', t: 'NOT_ELIGIBLE_BUT_PAID', e: 'E2', at: '2026-07-25', fs: 'DITERIMA', by: 'RUDI', rat: '2026-07-26',
      reason: 'Fakta lembur sah dari on-call darurat — status kerja SUSPENDED tidak dicabut, nominal tetap disiapkan.',
      detail: { work_status_code: 'SUSPENDED', eligible_flag: false, fact_type: 'OVERTIME' } },
    { id: 'FND-0013', p: 'p7', t: 'PERIOD_NOT_PICKED_UP', e: null, at: '2026-08-05', fs: null, reason: null,
      detail: { handover_id: 'HO-2026-07', handed_over_at: '2026-07-28', days_waiting: 17 } }
  ];

  // ---------- payroll history import (log_payroll_history_import) ----------
  var IMPORTS = [
    { id: 'HIM-0001', e: 'E6', my: '2026-01', gross: 5800000, pph: 174000, bpjs: 174000, sub: ['RUDI', '2026-05-25'], ver: ['MAYA', '2026-05-26'] },
    { id: 'HIM-0002', e: 'E6', my: '2026-02', gross: 5800000, pph: 174000, bpjs: 174000, sub: ['RUDI', '2026-05-25'], ver: ['MAYA', '2026-05-26'] },
    { id: 'HIM-0003', e: 'E6', my: '2026-03', gross: 6000000, pph: 180000, bpjs: 180000, sub: ['RUDI', '2026-05-25'], ver: ['MAYA', '2026-05-26'] },
    { id: 'HIM-0004', e: 'E6', my: '2026-04', gross: 6000000, pph: 180000, bpjs: 180000, sub: ['RUDI', '2026-05-25'], ver: ['MAYA', '2026-05-26'] },
    { id: 'HIM-0005', e: 'E6', my: '2026-05', gross: 6200000, pph: 186000, bpjs: 186000, sub: ['RUDI', '2026-05-25'], ver: ['MAYA', '2026-05-26'] }
  ];

  // ---------- salary component catalog (mst_salary_component) ----------
  var COMPONENTS = [
    { id: 'SC-001', code: 'SC-001', name: 'Gaji Pokok', fixed: true, ot: true, tax: true, bpjs: true, ps: 'AKTIF', used: 34 },
    { id: 'SC-002', code: 'SC-002', name: 'Tunjangan Jabatan', fixed: true, ot: true, tax: true, bpjs: true, ps: 'AKTIF', used: 12 },
    { id: 'SC-003', code: 'SC-003', name: 'Tunjangan Transport', fixed: true, ot: false, tax: true, bpjs: false, ps: 'MENUNGGU_PERSETUJUAN', used: 28,
      prop: { ot: true, by: 'RUDI', at: '2026-08-18', eff: '2026-09-01' } },
    { id: 'SC-004', code: 'SC-004', name: 'Tunjangan Makan', fixed: false, ot: false, tax: true, bpjs: false, ps: 'AKTIF', used: 30 },
    { id: 'SC-005', code: 'SC-005', name: 'Uang Lembur', fixed: false, ot: false, tax: true, bpjs: false, ps: 'AKTIF', used: 18 },
    { id: 'SC-006', code: 'SC-006', name: 'Insentif Kinerja', fixed: false, ot: false, tax: true, bpjs: false, ps: 'AKTIF', used: 9 },
    { id: 'SC-007', code: 'SC-007', name: 'Tunjangan Komunikasi', fixed: true, ot: false, tax: true, bpjs: false, ps: 'AKTIF', used: 7 },
    { id: 'SC-008', code: 'SC-008', name: 'Tunjangan Shift', fixed: false, ot: false, tax: true, bpjs: false, ps: 'AKTIF', used: 0 }
  ];

  // ---------- per-employee values (ver_emp_salary_component) ----------
  var EMPVALS = [
    { id: 'EV-0001', e: 'E4', c: 'SC-001', amt: 5000000, from: '2025-01-01', until: '2025-12-31', st: 'DISETUJUI', ch: 'ONBOARDING' },
    { id: 'EV-0002', e: 'E4', c: 'SC-001', amt: 5600000, from: '2026-01-01', until: null, st: 'DISETUJUI', ch: 'CHANGE' },
    { id: 'EV-0003', e: 'E4', c: 'SC-002', amt: 750000, from: '2026-01-01', until: null, st: 'DISETUJUI', ch: 'CHANGE' }
  ];

  // ---------- individual proposals (queue + decided history) ----------
  var PROPOSALS = [
    { id: 'PRP-0001', e: 'E5', c: 'SC-001', amt: 4500000, from: '2026-09-01', st: 'MENUNGGU_PERSETUJUAN', by: 'RUDI', at: '2026-08-25', prev: null },
    { id: 'PRP-9001', e: 'E4', c: 'SC-001', amt: 5600000, from: '2026-01-01', st: 'DISETUJUI', by: 'RUDI', at: '2025-12-28', dec: ['MAYA', '2026-01-02'], prev: 5000000 },
    { id: 'PRP-9002', e: 'E1', c: 'SC-001', amt: 4600000, from: '2026-08-01', st: 'DITOLAK', by: 'RUDI', at: '2026-07-12', dec: ['MAYA', '2026-07-15'], prev: 4000000,
      rej: 'Nominal melebihi pagu kenaikan cabang Bandung semester ini — ajukan ulang pada siklus berikutnya.' }
  ];

  // ---------- bulk change batch (emp_salary_change_batch) ----------
  var BATCH = {
    id: 'BATCH-0001', name: 'Kenaikan Berkala Semester 2 2026', status: 'MENUNGGU_PERSETUJUAN',
    esc: true, escApprover: 'HESTI', by: 'RUDI', at: '2026-08-25',
    // impact_summary — the five fields the contract freezes at submit (UIC §3.8). No derived extras.
    impact: { affected_count: 6, net_cost_shift_amount: 900000, salary_decrease_list: [], below_ump_after_change_list: [], missing_cost_center_or_sbu_list: ['Agus Salim'] },
    // items carry amount_delta only — the contract response has no before/after pair.
    members: [
      { e: 'E1', c: 'SC-001', delta: 200000 },
      { e: 'E3', c: 'SC-001', delta: 150000 },
      { e: 'E7', c: 'SC-001', delta: 200000 },
      { e: 'E8', c: 'SC-001', delta: 150000 },
      { e: 'E9', c: 'SC-001', delta: 100000 },
      { e: 'E5', c: 'SC-004', delta: 100000 }
    ]
  };

  // A DRAFT batch is still being assembled: impact_summary NULL, proposed_by NULL (ERD §6.4 checks).
  var BATCH_DRAFT = { id: 'BATCH-0002', name: 'Penyesuaian Tunjangan Komunikasi 2026', status: 'DRAFT',
    esc: false, escApprover: null, by: null, at: null, impact: null,
    members: [{ e: 'E6', c: 'SC-007', delta: 150000 }] };
  var BATCHES = [BATCH_DRAFT, BATCH];

  // ---------- branch minimum wage (company.mst_branch.regional_wage — read, never stored here) ----------
  var UMP = { 'Bandung': 4209309, 'Jakarta Pusat': 5396761, 'Semarang': 3243969 };
  // Closed list, ERD §6.3 ck_log_salary_ump_attestation_selected_reason.
  var UMP_REASONS = ['USAHA_MIKRO_KECIL', 'PESERTA_PEMAGANGAN', 'PEKERJA_PARUH_WAKTU', 'LAINNYA'];

  // ---------- UMP attestation log (log_salary_ump_attestation) ----------
  var ATTEST = [
    { id: 'ATT-0001', e: 'E1', cp: 'PENETAPAN_ATAU_PERUBAHAN', below: true, ump: 4209309, base: 4000000, reason: 'LAINNYA',
      note: 'Karyawan dalam masa penyesuaian jabatan — kenaikan dijadwalkan pada kumpulan perubahan semester 2.', at: '2026-07-12', by: 'RUDI', p: null },
    { id: 'ATT-0002', e: 'E1', cp: 'PERIODE_DIJALANKAN', below: true, ump: 4209309, base: 4000000, reason: null, note: null, at: '2026-09-26', by: 'RUDI', p: 'p9' }
  ];

  // ---------- handover ----------
  // GET /handover/pending — period_id · employee_count · created_at, nothing else (UIC §3.11).
  var HO_PENDING = [{ p: 'p7', count: 10, at: '2026-07-29' }];
  // pickup-log — created_by is always NULL, the actor is the client machine identity (UIC §3.12).
  var HO_PICKUP = [
    { p: 'p6', mach: 'CLIENT-PAYROLL-SYS-01', count: 10, at: '2026-07-01 09:10', re: false },
    { p: 'p6', mach: 'CLIENT-PAYROLL-SYS-01', count: 10, at: '2026-07-06 08:45', re: true }
  ];
  var HO_REEXPORT = [
    { id: 'RX-0001', p: 'p6', by: 'MAYA', at: '2026-07-05 14:20', gate: 'DISETUJUI',
      reason: 'Klien melaporkan file rusak, memerlukan pengiriman ulang.' }
  ];

  // ---------- payroll results / payslips ----------
  var RESULTS = {
    p7: [
      { e: 'E1', net: 4488500, openFinding: false, mode: 'PREPARED_FULL' },
      { e: 'E2', net: 2960500, openFinding: true, mode: 'PREPARED_PARTIAL' }
    ]
  };
  var SLIPS = {
    'p7-E1': {
      mode: 'PREPARED_FULL', prorate: null, net: 4488500,
      groups: [
        { k: 'group_penghasilan', label: 'Earnings', rows: [
          { n: 'Gaji Pokok', a: 4000000, d: 'PLUS', c: null },
          { n: 'Tunjangan Jabatan', a: 500000, d: 'PLUS', c: null },
          { n: 'Tunjangan Transport', a: 200000, d: 'PLUS', c: null }
        ] },
        { k: 'group_potongan', label: 'Deductions', rows: [
          { n: 'BPJS Kesehatan (1%)', a: 47000, d: 'MINUS', c: 'Computed from the wage base frozen for this period.' },
          { n: 'JHT (2%)', a: 80000, d: 'MINUS', c: null },
          { n: 'Jaminan Pensiun (1%)', a: 40000, d: 'MINUS', c: null },
          { n: 'PPh21 (TER kategori A)', a: 44500, d: 'MINUS', c: 'Tax status TK/0, from the PTKP row covering this period.' }
        ] },
        { k: 'group_urusan_lain', label: 'Other Matters', rows: [] },
        { k: 'group_koreksi_bulan_lain', label: 'Prior-Month Corrections', rows: [] }
      ]
    },
    'p7-E2': {
      mode: 'PREPARED_PARTIAL', prorate: 50, net: 2960500,
      groups: [
        { k: 'group_penghasilan', label: 'Earnings', rows: [
          { n: 'Gaji Pokok', a: 2900000, d: 'PLUS', c: 'Prepared at 50% — work status SUSPENDED since 16 July 2026.' },
          { n: 'Tunjangan Makan', a: 100000, d: 'PLUS', c: 'Follows the attendance days recorded.' },
          { n: 'Uang Lembur', a: 100000, d: 'PLUS', c: 'Emergency on-call overtime fact — carried in the NOT_ELIGIBLE_BUT_PAID finding list.' }
        ] },
        { k: 'group_potongan', label: 'Deductions', rows: [
          { n: 'BPJS Kesehatan (1%)', a: 31000, d: 'MINUS', c: null },
          { n: 'JHT (2%)', a: 62000, d: 'MINUS', c: null },
          { n: 'Jaminan Pensiun (1%)', a: 31000, d: 'MINUS', c: null },
          { n: 'PPh21 (TER kategori A)', a: 15500, d: 'MINUS', c: 'Tax status assumed TK/0 — the PTKP row is incomplete (TAX_STATUS_ASSUMED).' }
        ] },
        { k: 'group_urusan_lain', label: 'Other Matters', rows: [] },
        { k: 'group_koreksi_bulan_lain', label: 'Prior-Month Corrections', rows: [] }
      ]
    }
  };
  var ACCESSLOG = [];

  // ---------- cell helpers ----------
  function rp(n) {
    if (n === null || n === undefined) return '—';
    var s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (n < 0 ? '−Rp' : 'Rp') + s;
  }
  var TONE = {
    CALCULATED: 'grey', REVIEWED: 'blue', LOCKED: 'indigo', HANDED_OVER: 'green',
    AKTIF: 'green', MENUNGGU_PERSETUJUAN: 'amber', DISETUJUI: 'green', DITOLAK: 'red', DRAFT: 'grey',
    DIPERBAIKI: 'green', DITERIMA: 'indigo', OPEN: 'amber', Terbuka: 'amber',
    REGULATION: 'blue', COMPANY_SETTING: 'indigo', COMPUTED_COMPOSITION: 'grey',
    ONBOARDING: 'blue', CHANGE: 'indigo', HISTORY_IMPORT: 'grey', BULK_CHANGE: 'amber',
    PENETAPAN_ATAU_PERUBAHAN: 'indigo', PERIODE_DIJALANKAN: 'blue',
    LAYAR: 'blue', UNDUHAN: 'indigo', DISETUJUI_GATE: 'green',
    PREPARED_FULL: 'green', PREPARED_PARTIAL: 'amber',
    VERIFIED: 'green', UNVERIFIED: 'amber', ACTIVE: 'green'
  };
  var LABEL = {
    CALCULATED: 'CALCULATED', REVIEWED: 'REVIEWED', LOCKED: 'LOCKED', HANDED_OVER: 'HANDED OVER',
    MENUNGGU_PERSETUJUAN: 'MENUNGGU PERSETUJUAN', PENETAPAN_ATAU_PERUBAHAN: 'PENETAPAN / PERUBAHAN',
    PERIODE_DIJALANKAN: 'PERIODE DIJALANKAN', PREPARED_FULL: 'PREPARED FULL', PREPARED_PARTIAL: 'PREPARED PARTIAL'
  };
  function badge(tone, label) { return '<span class="sb sb--' + tone + '"><span class="sb__dot"></span>' + label + '</span>'; }
  function sb(v) { return badge(TONE[v] || 'grey', LABEL[v] || v); }
  function fstate(v) { return v ? sb(v) : badge('amber', 'TERBUKA'); }
  var OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  var NO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  function gate(ok, label) {
    return '<span class="pd-gate pd-gate--' + (ok ? 'ok' : 'no') + '">' + (ok ? OK : NO) + label + '</span>';
  }
  function chk(ok, text) {
    return '<div class="pd-check__i pd-check__i--' + (ok ? 'ok' : 'no') + '">' + (ok ? OK : NO) + '<span>' + text + '</span></div>';
  }
  function actor(k) { return k ? ACTOR[k].name : '<span class="cell-dim">—</span>'; }
  function stamp(pair) {
    if (!pair) return '<span class="cell-dim">—</span>';
    return ACTOR[pair[0]].name + '<div class="person__sub">' + window.Flow.fmtDate(pair[1]) + '</div>';
  }
  // impact_summary as the contract freezes it: two scalars + three name lists (UIC §3.8).
  function impactBlock(im) {
    function list(label, arr, why) {
      return '<tr><td class="cell-strong">' + label + '</td><td>' +
        (arr.length ? arr.join(' · ') : '<span class="cell-dim">empty — ' + why + '</span>') + '</td></tr>';
    }
    return '<div class="pd-grid pd-grid--2">' +
      '<div class="pd-stat"><div class="pd-stat__k">Affected employees</div><div class="pd-stat__v">' + im.affected_count + '</div></div>' +
      '<div class="pd-stat"><div class="pd-stat__k">Net cost shift</div><div class="pd-stat__v">' + rp(im.net_cost_shift_amount) + '</div><div class="pd-stat__n">per month, frozen at submit</div></div>' +
      '</div>' +
      '<div class="dtable-wrap" style="margin-top:14px"><table class="dtable">' +
      '<thead><tr><th>Frozen list</th><th>Contents</th></tr></thead><tbody>' +
      list('salary_decrease_list', im.salary_decrease_list, 'nobody loses salary') +
      list('below_ump_after_change_list', im.below_ump_after_change_list, 'everyone stays above the branch UMP') +
      list('missing_cost_center_or_sbu_list', im.missing_cost_center_or_sbu_list, 'every member carries a cost center and SBU') +
      '</tbody></table></div>';
  }
  function emp(k) { return EMP[k]; }
  function empCell(k) {
    var e = EMP[k];
    if (!e) return '<span class="cell-dim">— (period-level subject)</span>';
    return '<span class="cell-strong">' + e.name + '</span><div class="person__sub">' + e.nik + '</div>';
  }
  function json(o) { return '<div class="pd-json">' + JSON.stringify(o, null, 2) + '</div>'; }
  function my(s) { var p = s.split('-'); return MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0]; }

  window.PD = {
    EMP: EMP, ACTOR: ACTOR, PERIODS: PERIODS, MONTHS: MONTHS, HISTORY: HISTORY, PARAMS: PARAMS,
    FTYPES: FTYPES, FINDINGS: FINDINGS, IMPORTS: IMPORTS, COMPONENTS: COMPONENTS, EMPVALS: EMPVALS,
    PROPOSALS: PROPOSALS, BATCH: BATCH, BATCHES: BATCHES, UMP: UMP, UMP_REASONS: UMP_REASONS, ATTEST: ATTEST, HO_PENDING: HO_PENDING, HO_PICKUP: HO_PICKUP,
    HO_REEXPORT: HO_REEXPORT, RESULTS: RESULTS, SLIPS: SLIPS, ACCESSLOG: ACCESSLOG,
    plabel: plabel, pname: pname, period: period, gate3: gate3,
    rp: rp, badge: badge, sb: sb, fstate: fstate, gate: gate, chk: chk, actor: actor, stamp: stamp, impactBlock: impactBlock,
    emp: emp, empCell: empCell, json: json, my: my, OK: OK, NO: NO
  };
})();
