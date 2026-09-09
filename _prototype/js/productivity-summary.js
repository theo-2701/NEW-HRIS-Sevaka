// productivity-summary.js — Summary: period recap, read + approval surface (#43/#45)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD, P = D.PERIOD;

  document.getElementById('smWho').textContent = D.empName(P.employee);
  document.getElementById('smRange').textContent = D.stampDate(P.period_start) + ' – ' + D.stampDate(P.period_end);
  document.getElementById('smLocked').textContent = D.stampTime(P.payroll_confirmed_at) + ' WIB';

  document.getElementById('stTotal').textContent = D.hours(P.total_minutes);
  document.getElementById('stTotalF').textContent = P.total_minutes + ' minutes, no rounding anywhere in the chain.';
  document.getElementById('stCancel').textContent = P.cancelled_task_minutes;
  document.getElementById('stPending').textContent = P.pending_system_stop_count;
  document.getElementById('stNear').textContent = P.near_daily_limit_flags.length;

  document.getElementById('smTaskBody').innerHTML = P.breakdown_by_task.map(function (b) {
    var t = D.byCode(D.TASKS, b.task);
    return '<tr><td class="cell-strong">' + D.taskName(b.task) + '</td>' +
      '<td>' + (t && t.project ? D.projName(t.project) : '<span class="pv-tag">TANPA PROYEK</span>') + '</td>' +
      '<td class="ta-r">' + b.total_minutes + '</td><td class="ta-r">' + D.hours(b.total_minutes) + '</td></tr>';
  }).join('');

  var tones = { DIUKUR_MESIN: 'var(--color-secondary-500)', DIKETIK_MANUSIA: 'var(--flow-indigo-dot, #6366f1)', DIHENTIKAN_SISTEM: 'var(--color-error-500)' };
  var comp = P.origin_composition, keys = Object.keys(comp);
  document.getElementById('smBar').innerHTML = keys.map(function (k) {
    return '<span class="pv-bar__seg" style="width:' + (comp[k] / P.total_minutes * 100).toFixed(1) + '%;background:' + tones[k] + '"></span>';
  }).join('');
  document.getElementById('smOriginRows').innerHTML = keys.map(function (k) {
    return '<div class="pv-row"><span class="pv-row__k">' + D.badge(D.ORIGIN[k].tone, k) + '</span>' +
      '<span class="pv-row__v">' + comp[k] + ' min · ' + D.hours(comp[k]) + '</span></div>';
  }).join('');

  document.getElementById('smSub').textContent = D.stampTime(P.submitted_at);
  document.getElementById('smApp').textContent = D.stampTime(P.approved_at);
  document.getElementById('smPay').textContent = D.stampTime(P.payroll_confirmed_at);

  document.getElementById('smStateBody').innerHTML = D.PERIOD_STATES.map(function (s) {
    return '<tr><td>' + D.badge(s.tone, s.state) + (s.state === P.state ? ' <span class="pv-tag">CURRENT</span>' : '') + '</td>' +
      '<td>' + s.meaning + '</td><td class="cell-dim">' + s.gate + '</td></tr>';
  }).join('');

  document.getElementById('smSubmit').addEventListener('click', function () {
    F.toast('Submit is closed — this period is already DISAHKAN and payroll-confirmed.', 'warn');
  });

  if (window.lucide) window.lucide.createIcons();
})();
