// SEVAKA HRIS — Document Access Trail (A5)
(function () {
  'use strict';
  var F = window.Flow, D = window.DocData;
  var esc = D.esc, eb = D.enumBadge, dt = D.dt;
  var state = { actor:'', gran:'', flag:false, from:'', to:'' };
  var pager = null;

  function $(id) { return document.getElementById(id); }

  function render() {
    var rows = D.ACCESS.filter(function (r) {
      if (state.actor && r.accessed_by.id !== state.actor) return false;
      if (state.gran && r.access_granularity !== state.gran) return false;
      if (state.flag && !r.flagged_unreasonable) return false;
      if (state.from && r.accessed_at.slice(0, 10) < state.from) return false;
      if (state.to && r.accessed_at.slice(0, 10) > state.to) return false;
      return true;
    });
    var slice = pager ? pager.slice(rows) : rows;
    $('alBody').innerHTML = slice.length ? slice.map(function (r) {
      var docCell;
      if (r.access_granularity === 'PER_PERMINTAAN') {
        docCell = '<span class="cell-dim">' + r.document_count + ' files in one request</span><div class="cell-dim">document_ids[] — never itemised per row</div>';
      } else if (!r.document_id) {
        docCell = '<span class="cell-dim">\u2014</span><div class="cell-dim">document swept; empty is legitimate</div>';
      } else {
        docCell = esc(r.document_name) + ' <span class="cell-dim">v' + r.version_no + '</span>';
      }
      return '<tr' + (r.flagged_unreasonable ? ' style="background:var(--color-error-50,#fef2f2)"' : '') + '>' +
        '<td>' + dt(r.accessed_at, true) + '<div class="cell-dim">Asia/Jakarta</div></td>' +
        '<td>' + esc(r.accessed_by.nama) + (r.owner_open ? ' <span class="sb sb--blue"><span class="sb__dot"></span>owner</span>' : '') +
          '<div class="cell-dim">NIK ' + esc(r.accessed_by.nik) + ' \u00b7 ' + esc(r.accessed_by.role) + '</div></td>' +
        '<td>' + eb(r.access_granularity) + '</td>' +
        '<td>' + docCell + '</td>' +
        '<td class="cell-dim">' + r.document_count + '</td>' +
        '<td>' + (r.flagged_unreasonable ? D.sb('red', 'TAK WAJAR') : '\u2014') + '</td></tr>';
    }).join('') : '<tr><td colspan="6" class="tempty">No rows match. An empty grid is <code>200</code> with <code>data:[]</code> — this address never answers <code>404</code>.</td></tr>';
    if (pager) pager.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', function () {
    var actors = [D.EMP.e1, D.EMP.e4, D.EMP.e5, D.EMP.e7, D.EMP.e8];
    $('alActorDD').innerHTML = '<div class="dropdown__opt is-sel" data-val="">Any actor</div>' +
      actors.map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + esc(e.nama) + ' \u00b7 NIK ' + esc(e.nik) + '</div>'; }).join('');
    F.wireSelects();
    pager = F.pager('alFoot', 10, render, 'access rows');
    render();

    $('alActor').addEventListener('select', function (e) { state.actor = D.filterValue(this, e.detail.value); pager.reset(); render(); });
    $('alGran').addEventListener('select', function (e) { state.gran = (e.detail.value === 'Any granularity') ? '' : e.detail.value; pager.reset(); render(); });
    $('alFlag').addEventListener('change', function () { state.flag = this.checked; pager.reset(); render(); });
    $('alRange').addEventListener('rangechange', function (e) { state.from = e.detail.from; state.to = e.detail.to; pager.reset(); render(); });
  });
})();
