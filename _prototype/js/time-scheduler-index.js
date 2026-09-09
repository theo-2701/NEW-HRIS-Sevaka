// ============================================================
// SEVAKA HRIS — Time › Scheduler Index (read-only roster projection)
// FSD-001-TIME §8 · UIC-001-TIME §10
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var weekStart = '2026-07-27', fltSource = '';
  var $ = function (id) { return document.getElementById(id); };
  var pgRows = F.pager('pgRows', 10, function () { drawRows(); }, 'roster rows');

  function weekDates() {
    var out = [], base = new Date(weekStart);
    for (var i = 0; i < 7; i++) {
      var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      out.push(T.isoOf(d));
    }
    return out;
  }
  function rows() {
    var dates = weekDates();
    return T.ASSIGN.filter(function (a) {
      if (dates.indexOf(a.work_date) < 0) return false;
      if (fltSource && a.assignment_source !== fltSource) return false;
      return true;
    });
  }
  function cell(a) {
    if (!a) return '<span class="cell-dim tm-cell--na">— not assigned</span>';
    if (a.is_off_day) return '<span class="tm-cell tm-cell--off" title="Scheduled off day · ' + T.LABEL.assign_source[a.assignment_source] + '">OFF</span>';
    var s = T.byId(T.SHIFTS, a.shift_id);
    if (!s) return '<span class="tm-cell tm-cell--none">—</span>';
    return '<span class="tm-cell ' + (s.crosses_midnight ? 'tm-cell--night' : 'tm-cell--shift') + '" title="' + s.shift_name + ' · ' + T.LABEL.assign_source[a.assignment_source] + '">' + s.shift_code + '</span>';
  }
  function drawLegend() {
    var act = T.SHIFTS.filter(function (s) { return s.is_active; });
    $('shiftLegend').innerHTML = act.map(function (s) {
      var sw = s.crosses_midnight
        ? 'background:#e0e7ff;border-color:#c7d2fe'
        : 'background:var(--color-secondary-50);border-color:var(--color-secondary-200)';
      return '<span class="tm-key__it"><i class="tm-key__sw" style="' + sw + '"></i><b>' + s.shift_code + '</b>' +
        (s.start_time ? ' ' + s.start_time + '\u2013' + s.end_time : ' no fixed hours') + '</span>';
    }).join('') +
      '<span class="tm-key__it"><i class="tm-key__sw" style="background:var(--color-vapor)"></i><b>OFF</b></span>' +
      '<span class="tm-key__it"><i class="tm-key__sw" style="background:#fff"></i>not assigned</span>';

    $('legendBody').innerHTML = '<div class="tm-key__rows">' + act.map(function (s) {
      return '<div class="tm-key__row"><span class="tm-cell ' + (s.crosses_midnight ? 'tm-cell--night' : 'tm-cell--shift') + '">' + s.shift_code + '</span><span>' + s.shift_name +
        (s.start_time ? ' \u00b7 ' + s.start_time + '\u2013' + s.end_time : ' \u00b7 no fixed hours') +
        (s.crosses_midnight ? ' <span class="tm-flag">crosses midnight</span>' : '') + '</span></div>';
    }).join('') +
      '<div class="tm-key__row"><span class="tm-cell tm-cell--off">OFF</span><span>Scheduled off day \u2014 a roster row exists and says the person does not work.</span></div>' +
      '<div class="tm-key__row"><span class="cell-dim tm-cell--na">\u2014</span><span>Not assigned \u2014 no roster row at all for that person on that date. This is <em>not</em> an off day.</span></div>' +
      '</div>';
    if (window.lucide) window.lucide.createIcons();
  }
  function drawGrid() {
    var dates = weekDates(), live = rows();
    var people = T.EMPLOYEES.filter(function (e) { return e.id !== 'emp-sys'; });
    var head = '<tr><th>Employee</th>' + dates.map(function (iso) {
      var d = new Date(iso);
      return '<th>' + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()] + '<br>' + T.d(iso).slice(0, 6) + '</th>';
    }).join('') + '</tr>';
    var body = people.map(function (p) {
      return '<tr><th>' + p.name + '<br><span class="cell-dim" style="font-weight:500">' + p.unit + '</span></th>' +
        dates.map(function (iso) {
          var a = live.filter(function (x) { return x.employee_id === p.id && x.work_date === iso; })[0];
          return '<td>' + cell(a) + '</td>';
        }).join('') + '</tr>';
    }).join('');
    $('rosterGrid').innerHTML = '<table><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
  }
  function drawRows() {
    var all = rows().slice().sort(function (a, b) {
      return a.work_date === b.work_date ? (a.employee_id < b.employee_id ? -1 : 1) : (a.work_date < b.work_date ? -1 : 1);
    });
    var view = pgRows.slice(all);
    $('rowsBody').innerHTML = view.length ? view.map(function (a) {
      var s = T.byId(T.SHIFTS, a.shift_id);
      return '<tr>' +
        '<td class="cell-strong">' + T.d(a.work_date) + '</td>' +
        '<td>' + T.emp(a.employee_id).name + '</td>' +
        '<td>' + (s ? s.shift_name + ' <span class="cell-dim">· ' + s.shift_code + '</span>' : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + (s && s.start_time ? s.start_time + ' – ' + s.end_time + (s.crosses_midnight ? ' <span class="tm-flag">Crosses midnight</span>' : '') : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + (a.is_off_day ? '<span class="tm-flag">Off day</span>' : '<span class="cell-dim">No</span>') + '</td>' +
        '<td>' + T.badge(a.assignment_source, T.LABEL.assign_source) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty"><div class="tempty__t">No roster row in this week.</div></div></td></tr>';
    pgRows.paint();
  }

  document.addEventListener('DOMContentLoaded', function () {
    F.wireSelects(document);
    drawLegend(); drawGrid(); drawRows();
    $('legendBtn').addEventListener('click', function () { F.openModal('legendModal'); });
    $('fltWeek').addEventListener('select', function (e) {
      weekStart = e.detail.value; pgRows.reset(); drawGrid(); drawRows();
    });
    $('fltSource').addEventListener('select', function (e) {
      fltSource = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value;
      pgRows.reset(); drawGrid(); drawRows();
    });
  });
})();
