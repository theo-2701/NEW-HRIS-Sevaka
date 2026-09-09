// productivity-tracker-report.js — Tracker Report, read-only supervisor grid (#33)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var rf = { emp: '', task: '', act: '', origin: '', from: '', to: '' };
  var pg = F.pager('pgTr', 10, redraw, 'rows');

  document.getElementById('rfEmpDD').innerHTML = D.opt('', 'Everyone in my chain') + D.opt('DEDI', 'Dedi Kurniawan');
  document.getElementById('rfTaskDD').innerHTML = D.opt('', 'All tasks') + D.TASKS.map(function (t) { return D.opt(t.code, t.code + ' — ' + t.task_title); }).join('');
  document.getElementById('rfActDD').innerHTML = D.opt('', 'All activity types') + D.ACTIVITY_TYPES.map(function (a) { return D.opt(a.code, a.name); }).join('');
  document.getElementById('rfOriginDD').innerHTML = D.opt('', 'All origins') + Object.keys(D.ORIGIN).map(function (o) { return D.opt(o); }).join('');
  [['rfEmp', 'emp'], ['rfTask', 'task'], ['rfAct', 'act'], ['rfOrigin', 'origin']].forEach(function (p) {
    document.getElementById(p[0]).addEventListener('select', function (e) { rf[p[1]] = e.detail.value; pg.reset(); redraw(); });
  });
  document.getElementById('rfRange').addEventListener('rangechange', function (e) { rf.from = e.detail.from; rf.to = e.detail.to; pg.reset(); redraw(); });
  document.getElementById('rfReset').addEventListener('click', function () {
    rf = { emp: '', task: '', act: '', origin: '', from: '', to: '' };
    ['rfEmp', 'rfTask', 'rfAct', 'rfOrigin'].forEach(function (id) {
      var c = document.getElementById(id);
      c.querySelector('.ctl__value').textContent = c.querySelector('.dropdown__opt').textContent;
    });
    pg.reset(); redraw(); F.toast('Filter reset.', 'info');
  });

  function rows() {
    var out = D.WORKLOGS.filter(function (w) { return w.employee === 'DEDI'; }); // supervision chain of Rina
    if (rf.emp) out = out.filter(function (w) { return w.employee === rf.emp; });
    if (rf.task) out = out.filter(function (w) { return w.task === rf.task; });
    if (rf.act) out = out.filter(function (w) { return w.activity === rf.act; });
    if (rf.origin) out = out.filter(function (w) { return w.origin === rf.origin; });
    if (rf.from) out = out.filter(function (w) { return w.work_date >= rf.from && w.work_date <= rf.to; });
    return out.sort(function (a, b) { return a.work_date < b.work_date ? 1 : -1; });
  }

  function redraw() {
    var all = rows(), view = pg.slice(all);
    document.getElementById('trCount').textContent = all.length;
    document.getElementById('trBody').innerHTML = view.length ? view.map(function (w) {
      var o = D.ORIGIN[w.origin];
      return '<tr><td class="cell-dim">' + w.code + '</td><td class="cell-strong">' + D.empName(w.employee) + '</td>' +
        '<td>' + D.stampDate(w.work_date) + '</td><td>' + D.taskName(w.task) + '</td><td>' + D.actName(w.activity) + '</td>' +
        '<td class="ta-r">' + D.hours(w.duration_minutes) + ' <span class="cell-dim">(' + w.duration_minutes + 'm)</span></td>' +
        '<td>' + D.badge(o.tone, o.label) + '</td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="muted-empty">No row matches this filter.</div></td></tr>';
    pg.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  document.getElementById('trDownload').addEventListener('click', function () {
    F.toast('Export format is a presentation-layer decision — wire it to the real CSV/XLSX writer.', 'info');
  });

  redraw();
  if (window.lucide) window.lucide.createIcons();
})();
