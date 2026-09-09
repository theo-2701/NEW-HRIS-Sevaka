// SEVAKA HRIS — Finance Security (FT8 · KM-A2/A3/A4 · KM-B2/B3/B4 · KM-S1 · KM-S2)
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN;
  var holds = D.HOLDS.slice(), exps = D.EXPORT_LOGS.slice();
  var flt = { target: '', activeOnly: true, medEmp: '', medFrom: '', medTo: '', expFrom: '', expTo: '' };
  var hfType = null, hfTarget = null, releasing = null, exScope = null;
  var pgHold, pgExp, pgMed;

  // 'YYYY-MM-DD hh:mm' | 'YYYY-MM-DD'  vs  ISO day bounds
  function inRange(stamp, from, to) {
    var d = String(stamp).slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }

  var $ = function (id) { return document.getElementById(id); };
  function icons() { if (window.lucide) window.lucide.createIcons(); }

  // bind freshly rendered options of an already-wired .ctl--select (the ctl-level
  // click handler stays as wired once by flow-common; only options are re-bound)
  function bindOpts(ctl) { return D.bindOpts(ctl); }

  var TARGETS = {
    BENEFIT_CLAIM: D.CLAIMS.map(function (c) { return { id: c.id, no: c.request_no, who: D.emp(c.employee_id).name }; }),
    LOAN: D.LOANS.map(function (l) { return { id: l.id, no: l.request_no, who: D.emp(l.employee_id).name }; }),
    CASH_ADVANCE: D.ADVANCES.map(function (a) { return { id: a.id, no: a.request_no, who: D.emp(a.recipient_employee_id).name }; })
  };

  function renderHolds() {
    var all = holds.filter(function (h) {
      if (flt.target && h.target_type !== flt.target) return false;
      if (flt.activeOnly && !h.is_active) return false;
      return true;
    });
    var rows = pgHold.slice(all);
    $('cntHold').textContent = holds.filter(function (h) { return h.is_active; }).length;
    $('holdBody').innerHTML = rows.length ? rows.map(function (h) {
      var act = h.is_active
        ? '<button class="rowbtn" data-release="' + h.id + '">Release</button>'
        : '<button class="rowbtn" disabled>Released</button>';
      return '<tr><td>' + D.sb(h.target_type) + '</td>' +
        '<td><span class="cell-strong">' + h.target_request_no + '</span></td>' +
        '<td>' + (h.is_active ? '<span class="sb sb--orange"><span class="sb__dot"></span>ON HOLD</span>' : '<span class="sb sb--grey"><span class="sb__dot"></span>RELEASED</span>') + '</td>' +
        '<td>' + D.emp(h.created_by).name + '<div class="person__sub">' + D.emp(h.created_by).role + '</div></td>' +
        '<td>' + F.fmtDate(h.created_at) + '</td>' +
        '<td>' + (h.released_by ? D.emp(h.released_by).name + '<div class="person__sub">' + F.fmtDate(h.released_at) + '</div>' : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + act + '</span></td></tr>' +
        (h.released_reason_note ? '<tr><td colspan="7" style="padding-top:0"><span class="fld__hint">Release note — ' + h.released_reason_note + '</span></td></tr>' : '');
    }).join('') : '<tr><td colspan="7"><div class="tempty">No dispute hold matches the current filter.</div></td></tr>';
    pgHold.paint();
  }

  function renderExp() {
    var all = exps.filter(function (x) { return inRange(x.downloaded_at, flt.expFrom, flt.expTo); });
    var rows = pgExp.slice(all);
    $('cntExp').textContent = exps.length;
    $('expBody').innerHTML = rows.length ? rows.map(function (x) {
      return '<tr><td>' + D.sb(x.scope) + '</td>' +
        '<td><span class="cell-mono">' + x.filter_criteria + '</span></td>' +
        '<td class="ta-r"><span class="money money--dim">' + x.row_count + '</span></td>' +
        '<td>' + x.downloaded_at + '</td>' +
        '<td>' + D.emp(x.created_by).name + '<div class="person__sub">' + D.emp(x.created_by).role + '</div></td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="tempty">No download recorded in this period.</div></td></tr>';
    pgExp.paint();
  }

  function renderMed() {
    var all = D.MEDICAL_LOGS.filter(function (m) {
      if (flt.medEmp && m.employee_id !== flt.medEmp) return false;
      return inRange(m.accessed_at, flt.medFrom, flt.medTo);
    });
    var rows = pgMed.slice(all);
    $('cntMed').textContent = D.MEDICAL_LOGS.length;
    $('medBody').innerHTML = rows.length ? rows.map(function (m) {
      var by = D.emp(m.created_by);
      return '<tr><td><span class="cell-strong">' + m.claim_request_no + '</span></td>' +
        '<td>' + D.emp(m.employee_id).name + '</td>' +
        '<td><span class="cell-mono">' + m.claim_item_id + '</span></td>' +
        '<td><span class="cell-mono">' + m.document_id + '</span></td>' +
        '<td>' + m.accessed_at + '</td>' +
        '<td>' + by.name + '<div class="person__sub">' + by.role + '</div></td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty">No access recorded for this filter.</div></td></tr>';
    pgMed.paint();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('fltMedEmpDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All employees</div>' +
      D.EMPLOYEES.map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + '</div>'; }).join('');
    // every possible target is rendered once; the type filter only toggles visibility,
    // so the select stays wired exactly once
    $('hfTargetDd').innerHTML = '';
    F.wireSelects(document);
    D.bindOpts('fltMedEmp');
    pgHold = F.pager('pgHold', 10, function () { renderHolds(); icons(); }, 'holds');
    pgExp = F.pager('pgExp', 10, function () { renderExp(); icons(); }, 'downloads');
    pgMed = F.pager('pgMed', 10, function () { renderMed(); icons(); }, 'accesses');
    renderHolds(); renderExp(); renderMed(); icons();

    var h = (location.hash || '').replace('#', '');
    if (h) { var t = document.querySelector('.tabnav__tab[data-tab="' + h + '"]'); if (t) t.click(); }

    $('fltTarget').addEventListener('select', function (e) { flt.target = /^[A-Z_]+$/.test(e.detail.value) ? e.detail.value : ''; pgHold.reset(); renderHolds(); icons(); });
    $('fltActive').addEventListener('click', function () {
      this.classList.toggle('is-on');
      flt.activeOnly = this.classList.contains('is-on');
      pgHold.reset(); renderHolds(); icons();
    });
    $('fltMedEmp').addEventListener('select', function (e) { flt.medEmp = /^emp-/.test(e.detail.value) ? e.detail.value : ''; pgMed.reset(); renderMed(); icons(); });
    $('fltMedRange').addEventListener('rangechange', function (e) {
      flt.medFrom = e.detail.from; flt.medTo = e.detail.to;
      pgMed.reset(); renderMed(); icons();
    });
    $('fltExpRange').addEventListener('rangechange', function (e) {
      flt.expFrom = e.detail.from; flt.expTo = e.detail.to;
      pgExp.reset(); renderExp(); icons();
    });

    $('btnAsym').addEventListener('click', function () { F.openModal('asymModal'); });
    $('btnSod').addEventListener('click', function () { F.openModal('sodModal'); });

    // ---- place hold
    $('newHoldBtn').addEventListener('click', function () {
      hfType = null; hfTarget = null;
      var tv = $('hfType').querySelector('.ctl__value'); tv.textContent = 'Select target type'; tv.style.color = 'var(--fg-4)';
      var gv = $('hfTarget').querySelector('.ctl__value'); gv.textContent = 'Select target type first'; gv.style.color = 'var(--fg-4)';
      $('hfTargetDd').innerHTML = '';
      $('hfSave').disabled = true;
      F.openModal('holdForm');
    });
    $('hfType').addEventListener('select', function (e) {
      if (!/^[A-Z_]+$/.test(e.detail.value)) return;
      hfType = e.detail.value; hfTarget = null;
      $('hfTargetDd').innerHTML = (TARGETS[hfType] || []).map(function (t) {
        return '<div class="dropdown__opt" data-val="' + t.id + '|' + t.no + '">' + t.no + ' — ' + t.who + '</div>';
      }).join('');
      bindOpts($('hfTarget'));
      var gv = $('hfTarget').querySelector('.ctl__value'); gv.textContent = 'Select request'; gv.style.color = 'var(--fg-4)';
      $('hfSave').disabled = true;
    });
    $('hfTarget').addEventListener('select', function (e) {
      if (e.detail.value.indexOf('|') < 0) return;
      hfTarget = e.detail.value.split('|');
      $('hfSave').disabled = false;
    });
    $('hfSave').addEventListener('click', function () {
      if (holds.some(function (h) { return h.is_active && h.target_id === hfTarget[0]; })) {
        F.toast('409 FIN_DISPUTE_HOLD_ALREADY_ACTIVE — this target already carries an active hold.', 'danger'); return;
      }
      holds.unshift({ id: 'hold-' + Date.now(), target_type: hfType, target_id: hfTarget[0], target_request_no: hfTarget[1],
        is_active: true, created_by: 'emp-rahmat', created_at: new Date().toISOString().slice(0, 10),
        released_by: null, released_at: null, released_reason_note: null });
      F.closeModal('holdForm'); renderHolds(); icons();
      F.toast('201 Created — hold placed on ' + hfTarget[1] + ' with no reason recorded, by design.', 'ok');
    });

    // ---- release hold
    $('holdBody').addEventListener('click', function (e) {
      var r = e.target.closest('[data-release]');
      if (!r) return;
      releasing = holds.filter(function (x) { return x.id === r.getAttribute('data-release'); })[0];
      $('rlKv').innerHTML = '<div class="kv__k">Target type</div><div class="kv__v">' + releasing.target_type + '</div>' +
        '<div class="kv__k">Request no.</div><div class="kv__v">' + releasing.target_request_no + '</div>' +
        '<div class="kv__k">Placed by</div><div class="kv__v">' + D.emp(releasing.created_by).name + ' · ' + F.fmtDate(releasing.created_at) + '</div>' +
        '<div class="kv__k">Releasing as</div><div class="kv__v">Ari Wibowo · ROLE_HR_MANAGER</div>';
      $('rlNote').value = '';
      $('rlConfirm').disabled = true;
      F.openModal('releaseForm');
    });
    $('rlNote').addEventListener('input', function () { $('rlConfirm').disabled = !this.value.trim(); });
    $('rlConfirm').addEventListener('click', function () {
      if (!releasing) return;
      releasing.is_active = false;
      releasing.released_by = 'emp-ari';
      releasing.released_at = new Date().toISOString().slice(0, 10);
      releasing.released_reason_note = $('rlNote').value.trim();
      F.closeModal('releaseForm'); renderHolds(); icons();
      F.toast('200 OK — hold released by a different role than the one that placed it. The row leaves the active list but stays as history.', 'ok');
      releasing = null;
    });

    // ---- export
    $('newExportBtn').addEventListener('click', function () {
      exScope = null;
      var v = $('exScope').querySelector('.ctl__value'); v.textContent = 'Select scope'; v.style.color = 'var(--fg-4)';
      F.setDate($('exStart'), null); F.setDate($('exEnd'), null);
      $('exRun').disabled = true;
      F.openModal('exportForm');
    });
    function exCheck() { $('exRun').disabled = !(exScope && $('exStart').dataset.iso && $('exEnd').dataset.iso); }
    $('exScope').addEventListener('select', function (e) { exScope = e.detail.value; exCheck(); });
    ['exStart', 'exEnd'].forEach(function (id) { $(id).addEventListener('datechange', exCheck); });
    $('exRun').addEventListener('click', function () {
      var s = $('exStart').dataset.iso, en = $('exEnd').dataset.iso;
      var rows = Math.max(1, Math.round(Math.random() * 20) + 4);
      exps.unshift({ id: 'exp-' + Date.now(), scope: exScope,
        filter_criteria: '{"start_date":"' + s + '","end_date":"' + en + '"}', row_count: rows,
        downloaded_at: new Date().toISOString().slice(0, 10) + ' ' + new Date().toTimeString().slice(0, 5), created_by: 'emp-rahmat' });
      F.closeModal('exportForm'); renderExp(); icons();
      F.toast('File streamed as an attachment — ' + rows + ' rows, scope ' + exScope + '. The trail row was written in the same transaction.', 'ok');
    });
  });
})();
