// ============================================================
// SEVAKA HRIS — Time › On Call Activity (read-only projection)
// FSD-001-TIME §11 · UIC-001-TIME §12
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var $ = function (id) { return document.getElementById(id); };
  var pgAct = F.pager('pgAct', 10, function () { draw(); }, 'call-outs');
  // UIC §12.2 → §8.1.4 field search: employee_id(=), overtime_date(BETWEEN), overtime_status(IN),
  // overtime_category(=), plus oncall_assignment_id(=) — the filter that serves this menu.
  var flt = { win: '', status: '', cat: '', from: '', to: '', name: '' };
  function windowLabel(o) { return T.dt(o.standby_start_at) + ' \u2192 ' + T.dt(o.standby_end_at); }

  function draw() {
    var all = T.OT_REQ.filter(function (r) { return r.is_auto && r.oncall_assignment_id; })
      .filter(function (r) {
        if (flt.win && r.oncall_assignment_id !== flt.win) return false;
        if (flt.status && r.overtime_status !== flt.status) return false;
        if (flt.cat && r.overtime_category !== flt.cat) return false;
        if (flt.from && r.overtime_date < flt.from) return false;
        if (flt.to && r.overtime_date > flt.to) return false;
        if (flt.name && T.emp(r.employee_id).name.toLowerCase().indexOf(flt.name.toLowerCase()) < 0) return false;
        return true;
      })
      .sort(function (a, b) { return a.submitted_at < b.submitted_at ? 1 : -1; });
    var rows = pgAct.slice(all);
    $('actBody').innerHTML = rows.length ? rows.map(function (r) {
      var w = T.byId(T.ONCALL, r.oncall_assignment_id);
      return '<tr>' +
        '<td>' + T.person(r.employee_id) + '</td>' +
        '<td class="cell-strong">' + T.d(r.overtime_date) + '</td>' +
        '<td>' + T.badge(r.overtime_category, T.LABEL.ot_category) + '</td>' +
        '<td class="cell-dim">' + (w ? windowLabel(w) : '\u2014') + '</td>' +
        '<td class="ta-r"><span class="cell-dim">\u2014</span></td>' +
        '<td class="ta-r"><span class="tm-num">' + T.num(r.approved_hours, 2) + '</span></td>' +
        '<td>' + T.badge(r.overtime_status, T.LABEL.ot_status) + '</td>' +
        '<td class="cell-dim">' + (r.requires_extra_approval_reason ? T.LABEL.extra_reason[r.requires_extra_approval_reason] : '\u2014') + '</td>' +
        '<td class="cell-dim">' + T.dt(r.submitted_at) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="9"><div class="tempty"><div class="tempty__t">No call-out has been issued from any standby window yet.</div><span>A window with no call-out has no row here at all.</span></div></td></tr>';
    pgAct.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function paintSum() {
    var p = [];
    if (flt.win) { var w = T.byId(T.ONCALL, flt.win); if (w) p.push(T.emp(w.employee_id).name + ' \u00b7 ' + windowLabel(w)); }
    if (flt.status) p.push(T.LABEL.ot_status[flt.status]);
    if (flt.cat) p.push(T.LABEL.ot_category[flt.cat]);
    if (flt.from || flt.to) p.push((flt.from ? T.d(flt.from) : '\u2026') + ' \u2192 ' + (flt.to ? T.d(flt.to) : '\u2026'));
    if (flt.name) p.push('\u201c' + flt.name + '\u201d');
    $('fltSum').textContent = p.length ? p.join(' \u00b7 ') : '';
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('fltWindowDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All standby windows</div>' +
      T.ONCALL.map(function (o) { return '<div class="dropdown__opt" data-val="' + o.id + '">' + T.emp(o.employee_id).name + ' \u00b7 ' + windowLabel(o) + '</div>'; }).join('');
    draw();
    $('fltBtn').addEventListener('click', function () { F.openModal('actFilter'); });
    $('fltWindow').addEventListener('select', function (e) { flt.win = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgAct.reset(); draw(); paintSum(); });
    $('fltStatus').addEventListener('select', function (e) { flt.status = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgAct.reset(); draw(); paintSum(); });
    $('fltCat').addEventListener('select', function (e) { flt.cat = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgAct.reset(); draw(); paintSum(); });
    $('fltFrom').addEventListener('datechange', function () { flt.from = this.dataset.iso || ''; pgAct.reset(); draw(); paintSum(); });
    $('fltTo').addEventListener('datechange', function () { flt.to = this.dataset.iso || ''; pgAct.reset(); draw(); paintSum(); });
    $('fltName').addEventListener('input', function () { flt.name = this.value.trim(); pgAct.reset(); draw(); paintSum(); });
    $('fmReset').addEventListener('click', function () {
      ['fltWindow', 'fltStatus', 'fltCat'].forEach(function (id) {
        var sel = $(id), first = sel.querySelector('.dropdown__opt');
        sel.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o === first); });
        sel.querySelector('.ctl__value').textContent = first.textContent;
      });
      ['fltFrom', 'fltTo'].forEach(function (id) { F.setDate($(id), ''); });
      $('fltName').value = '';
      flt = { win: '', status: '', cat: '', from: '', to: '', name: '' };
      pgAct.reset(); draw(); paintSum();
    });
  });
})();
