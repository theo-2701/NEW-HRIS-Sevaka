// transition-data.js — shared seed for the Transition list + dashboard pages.
// Single source of truth so transition.html (list) and transition-dashboard.html
// (detail) read the same transitions by index.
(function () {
  'use strict';

  var TYPE_LABEL = { ONBOARDING: 'Onboarding', TRANSFER: 'Transfer', OFFBOARDING: 'Offboarding' };

  // emp_transition.status — 4 variants (FSD §5.4)
  var TR_BADGE = {
    IN_APPROVAL: ['sb--blue', 'In approval'],
    IN_PROGRESS: ['sb--amber', 'In progress'],
    COMPLETED:   ['sb--green', 'Completed'],
    CANCELLED:   ['sb--grey', 'Cancelled']
  };

  // emp_transition_task.task_status — 7 card variants (FSD §5.4)
  var TASK_META = {
    PENDING:          ['tcard--pending',  'sb--grey',   'Pending'],
    RELEASED:         ['tcard--released', 'sb--blue',   'Released'],
    IN_PROGRESS:      ['tcard--progress', 'sb--blue',   'In progress'],
    AWAITING_CONFIRM: ['tcard--confirm',  'sb--amber',  'Awaiting confirm'],
    COMPLETED:        ['tcard--done',     'sb--green',  'Completed'],
    WAIVED:           ['tcard--waived',   'sb--indigo', 'Waived'],
    SKIPPED:          ['tcard--skipped',  'sb--grey',   'Skipped']
  };

  // The lifecycle order used by the stepper.
  var STEP_ORDER = ['IN_APPROVAL', 'IN_PROGRESS', 'COMPLETED'];

  function mkTasks(kind) {
    if (kind === 'ONBOARDING') return [
      { t: 'Create IT accounts',            owner: 'IT Jakarta HQ',   side: 'PROVISION', status: 'COMPLETED',   rel: '2026-07-02', due: '2026-07-10' },
      { t: 'Assign laptop & access card',   owner: 'GA Jakarta HQ',   side: 'PROVISION', status: 'IN_PROGRESS', rel: '2026-07-02', due: '2026-07-12' },
      { t: 'Payroll & tax registration',    owner: 'HR Jakarta HQ',   side: 'PROVISION', status: 'RELEASED',    rel: '2026-07-02', due: '2026-07-14' },
      { t: 'Confirm equipment received',    owner: 'Employee',        side: 'PROVISION', status: 'PENDING',     rel: '',           due: '2026-07-15', dep: 'Assign laptop & access card' }
    ];
    if (kind === 'TRANSFER') return [
      { t: 'Handover open work',            owner: 'Supervisor Finance Papua', side: 'RELINQUISH', status: 'COMPLETED',       rel: '2026-12-02', due: '2026-12-05' },
      { t: 'Return regional assets (laptop)', owner: 'GA Papua',              side: 'RELINQUISH', status: 'AWAITING_CONFIRM', rel: '2026-12-02', due: '2026-12-06' },
      { t: 'Verify identity in new unit',   owner: 'HR Jakarta HQ',           side: 'PROVISION',  status: 'IN_PROGRESS',      rel: '2026-12-02', due: '2026-12-04', late: true },
      { t: 'Provision system access',       owner: 'IT Jakarta HQ',           side: 'PROVISION',  status: 'PENDING',          rel: '',           due: '',           dep: 'Verify identity in new unit' },
      { t: 'Prepare desk & new assets',     owner: 'GA Jakarta HQ',           side: 'PROVISION',  status: 'RELEASED',         rel: '2026-12-02', due: '2026-12-08' },
      { t: 'Relocation approver seat',      owner: '', side: 'PROVISION', status: 'SKIPPED', rel: '', due: '', skip: 'VACANT' }
    ];
    // OFFBOARDING
    return [
      { t: 'Knowledge handover',            owner: 'Manager Ops',     side: 'RELINQUISH', status: 'COMPLETED',   rel: '2026-07-02', due: '2026-07-09' },
      { t: 'Return company laptop',         owner: 'GA Jakarta',      side: 'RELINQUISH', status: 'IN_PROGRESS', rel: '2026-07-02', due: '2026-07-10', late: true, blocking: true },
      { t: 'Revoke building access',        owner: 'GA Jakarta',      side: 'RELINQUISH', status: 'RELEASED',    rel: '2026-07-02', due: '2026-07-12', blocking: true },
      { t: 'Exit interview',                owner: 'HR — Dewi',       side: 'RELINQUISH', status: 'WAIVED',      rel: '2026-07-02', due: '2026-07-08', skip: 'Employee declined' },
      { t: 'Parking permit return',         owner: 'GA',              side: 'RELINQUISH', status: 'SKIPPED',     rel: '', due: '', skip: 'OPTIONAL' }
    ];
  }

  var transitions = [
    {
      id: 'TR-2026-0417', emp: 'Eka Saputra', init: 'ES', type: 'TRANSFER', subtype: 'PROMOTION',
      from: 'Staff Finance — Papua', to: 'Senior Finance — Jakarta HQ',
      detail: 'Promotion → Senior Finance, Jakarta HQ', date: '2027-01-01',
      status: 'IN_PROGRESS', tasks: mkTasks('TRANSFER')
    },
    {
      id: 'TR-2026-0411', emp: 'Fajar Nugroho', init: 'FN', type: 'OFFBOARDING', reason: 'Resignation (voluntary)',
      from: 'Ops Coordinator — BR-Jakarta', to: '—',
      detail: 'Resignation (voluntary)', date: '2026-07-20',
      status: 'IN_PROGRESS', tasks: mkTasks('OFFBOARDING')
    },
    {
      id: 'TR-2026-0405', emp: 'Maya Kusuma', init: 'MK', type: 'ONBOARDING',
      from: '—', to: 'Backend Engineer — Jakarta HQ',
      detail: 'New joiner onboarding', date: '2026-07-16',
      status: 'IN_PROGRESS', tasks: mkTasks('ONBOARDING')
    },
    {
      id: 'TR-2026-0398', emp: 'Dimas Prabowo', init: 'DP', type: 'TRANSFER', subtype: 'LATERAL',
      from: 'Backend Engineer — HQ', to: 'Team Lead Ops — BR-Jakarta',
      detail: 'Lateral → Team Lead Ops, BR-Jakarta', date: '2026-08-01',
      status: 'IN_APPROVAL', tasks: []
    },
    {
      id: 'TR-2026-0362', emp: 'Rina Melati', init: 'RM', type: 'OFFBOARDING', reason: 'Retirement',
      from: 'Warehouse Supervisor — BR-Surabaya', to: '—',
      detail: 'Retirement', date: '2026-06-30',
      status: 'COMPLETED', tasks: mkTasks('OFFBOARDING').map(function (t) { return Object.assign({}, t, { status: 'COMPLETED' }); })
    }
  ];

  function pct(tr) {
    if (!tr.tasks.length) return 0;
    var done = tr.tasks.filter(function (t) { return t.status === 'COMPLETED' || t.status === 'WAIVED' || t.status === 'SKIPPED'; }).length;
    return Math.round(done / tr.tasks.length * 100);
  }
  function doneCount(tr) {
    return tr.tasks.filter(function (t) { return t.status === 'COMPLETED' || t.status === 'WAIVED' || t.status === 'SKIPPED'; }).length;
  }

  window.TR_DATA = {
    TYPE_LABEL: TYPE_LABEL, TR_BADGE: TR_BADGE, TASK_META: TASK_META, STEP_ORDER: STEP_ORDER,
    transitions: transitions, mkTasks: mkTasks, pct: pct, doneCount: doneCount
  };
})();
