// SEVAKA HRIS — Disbursement & Receivables (FT5 · DP-A2/A3/A4 · DP-B2/B3/B4)
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN;
  var payables = D.PAYABLES.slice(), outs = D.OUTSTANDING.slice();
  var role = 'FIN';                              // HR Manager is read-only on Disbursement
  var flt = { mark: 'UNMARKED', type: '', no: '', sort: 'created_at' }, oflt = { status: '', emp: '' };
  var picked = {}, markSet = [], reversing = null, settling = null, mkMethod = null;
  var pgPay = null, pgOut = null;

  var $ = function (id) { return document.getElementById(id); };
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function key(p) { return p.payable_type + '|' + p.payable_id; }
  function canWrite() { return role === 'FIN'; }

  function visible() {
    return payables.filter(function (p) {
      if (flt.mark !== 'ALL' && p.mark_status !== flt.mark) return false;
      if (flt.type && p.payable_type !== flt.type) return false;
      if (flt.no && p.request_no.toLowerCase().indexOf(flt.no.toLowerCase()) < 0) return false;
      return true;
    });
  }

  function sortPay(rows) {
    var s = flt.sort;
    return rows.slice().sort(function (a, b) {
      if (s === 'amount') return b.amount - a.amount;
      if (s === 'request_no') return a.request_no.localeCompare(b.request_no);
      if (s === 'marked_at') return String((b.mark && b.mark.marked_at) || '').localeCompare(String((a.mark && a.mark.marked_at) || ''));
      return String(b.submitted_at).localeCompare(String(a.submitted_at));
    });
  }

  function renderPay() {
    var all = sortPay(visible());
    var rows = pgPay ? pgPay.slice(all) : all;
    $('cntPay').textContent = payables.filter(function (p) { return p.mark_status === 'UNMARKED'; }).length;
    $('payBody').innerHTML = rows.length ? rows.map(function (p) {
      var e = D.emp(p.employee_id), k = key(p);
      var machine = p.mark && p.mark.mark_source === 'CLIENT_SYSTEM';
      var box = (p.mark_status === 'UNMARKED' && canWrite())
        ? '<label class="fchk"><input type="checkbox" data-pick="' + k + '"' + (picked[k] ? ' checked' : '') + '><span class="fchk__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span></label>'
        : '';
      var acts = [];
      if (p.mark_status === 'UNMARKED' && canWrite()) acts.push({ label: 'Mark Paid', icon: 'badge-check', attr: 'data-mark="' + k + '"' });
      if (p.mark_status === 'MARKED' && canWrite() && !machine) acts.push({ label: 'Reverse Mark', icon: 'undo-2', attr: 'data-reverse="' + k + '"', danger: true });
      acts.push({ label: 'View Detail', icon: 'eye', attr: 'data-view="' + k + '"' });
      var act = acts.length > 1 ? F.rowMenu(acts) : '<button class="rowbtn" data-view="' + k + '">View Detail</button>';
      var method = p.mark
        ? D.sb(p.mark.payment_method) + ' ' + D.sb(p.mark.mark_source) + '<div class="person__sub">marked ' + F.fmtDate(p.mark.marked_at) + ' · ' + p.mark.action_id + '</div>'
        : '<span class="cell-dim">—</span>';
      return '<tr><td class="ta-c">' + box + '</td>' +
        '<td>' + D.sb(p.payable_type) + '</td>' +
        '<td><span class="cell-strong">' + p.request_no + '</span>' + (p.blocked ? '<div class="person__sub" style="color:var(--color-error-700)">' + p.blocked + '</div>' : '') + '</td>' +
        '<td><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.unit + '</span></div></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(p.amount) + '</span></td>' +
        '<td>' + F.fmtDate(p.submitted_at) + '</td>' +
        '<td>' + D.sb(p.mark_status) + '</td>' +
        '<td>' + method + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + act + '</span></td></tr>';
    }).join('') : '<tr><td colspan="9"><div class="tempty">No payable matches the current filter.</div></td></tr>';
    var pickable = rows.some(function (p) { return p.mark_status === 'UNMARKED' && canWrite(); });
    $('payTable').classList.toggle('dtable--nopick', !pickable);
    $('payWrap').classList.toggle('dtable-wrap--noleft', !pickable);
    if (pgPay) pgPay.paint();
    syncBulk();
  }

  function syncBulk() {
    var n = Object.keys(picked).filter(function (k) { return picked[k]; }).length;
    var b = $('bulkMarkBtn'), bar = $('selBar');
    bar.hidden = !(n && canWrite());
    $('selTxt').textContent = n + (n === 1 ? ' row selected' : ' rows selected');
    b.disabled = !(n && canWrite());
  }

  function renderOut() {
    var all = outs.filter(function (o) {
      if (oflt.status && o.status !== oflt.status) return false;
      if (oflt.emp && o.employee_id !== oflt.emp) return false;
      return true;
    });
    var rows = pgOut ? pgOut.slice(all) : all;
    $('cntOut').textContent = outs.filter(function (o) { return o.status === 'OUTSTANDING'; }).length;
    $('outBody').innerHTML = rows.length ? rows.map(function (o) {
      var e = D.emp(o.employee_id);
      var oacts = [];
      if (o.status === 'OUTSTANDING') oacts.push({ label: 'Declare Settled', icon: 'gavel', attr: 'data-settle="' + o.id + '"' });
      oacts.push({ label: 'View Detail', icon: 'eye', attr: 'data-oview="' + o.id + '"' });
      var act = oacts.length > 1 ? F.rowMenu(oacts) : '<button class="rowbtn" data-oview="' + o.id + '">View Detail</button>';
      return '<tr><td><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.unit + ' · ' + e.nik + '</span></div></td>' +
        '<td>' + F.fmtDate(o.exit_date) + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(o.outstanding_amount) + '</span><div class="person__sub">loan + cash advance combined</div></td>' +
        '<td>' + D.sb(o.status) + '</td>' +
        '<td>' + F.fmtDate(o.created_at) + '</td>' +
        '<td>' + (o.resolved_at ? F.fmtDate(o.resolved_at) : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + act + '</span></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">No clearance row matches the current filter.</div></td></tr>';
    if (pgOut) pgOut.paint();
  }

  function openPayDetail(p) {
    var e = D.emp(p.employee_id), m = p.mark;
    var rows = '<div class="kv__k">Request no.</div><div class="kv__v">' + p.request_no + '</div>' +
      '<div class="kv__k">Payable type</div><div class="kv__v">' + p.payable_type + '</div>' +
      '<div class="kv__k">Payable id</div><div class="kv__v">' + p.payable_id + '</div>' +
      '<div class="kv__k">Employee</div><div class="kv__v">' + e.name + ' · ' + e.nik + '</div>' +
      '<div class="kv__k">Amount</div><div class="kv__v">' + D.rp(p.amount) + '</div>' +
      '<div class="kv__k">Submitted</div><div class="kv__v">' + F.fmtDate(p.submitted_at) + '</div>' +
      '<div class="kv__k">Mark status</div><div class="kv__v">' + p.mark_status + (p.blocked ? ' · gate ' + p.blocked : '') + '</div>';
    rows += m
      ? '<div class="kv__k">Mark id</div><div class="kv__v">' + m.disbursement_mark_id + '</div>' +
        '<div class="kv__k">Marked at</div><div class="kv__v">' + F.fmtDate(m.marked_at) + '</div>' +
        '<div class="kv__k">Mark source</div><div class="kv__v">' + m.mark_source + '</div>' +
        '<div class="kv__k">Payment method</div><div class="kv__v">' + m.payment_method + '</div>' +
        '<div class="kv__k">Action id</div><div class="kv__v">' + m.action_id + '</div>' +
        '<div class="kv__k">Reason note</div><div class="kv__v">' + (m.reason_note || '— (client-system mark: no note required)') + '</div>'
      : '<div class="kv__k">Mark</div><div class="kv__v">— not marked yet</div>';
    rows += '<div class="kv__k">Actual paid at</div><div class="kv__v">' + (p.actual_paid_at ? F.fmtDate(p.actual_paid_at) : '—') + '<div class="person__sub">Informational only — never an input to any calculation in this contract.</div></div>';
    $('pdKv').innerHTML = rows;
    icons();
    F.openModal('payDetail');
  }

  // ---------- DP-A3 preview + mark ----------
  function openMark(keys) {
    markSet = payables.filter(function (p) { return keys.indexOf(key(p)) > -1; });
    var resolved = markSet.filter(function (p) { return !p.blocked; });
    var unresolved = markSet.filter(function (p) { return !!p.blocked; });
    var total = resolved.reduce(function (a, p) { return a + p.amount; }, 0);
    $('mkSum').innerHTML = '<div class="sumbox__head"><i data-lucide="eye"></i>Preview — mark-paid gate check</div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Rows selected</span><span class="sumbox__v">' + markSet.length + '</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Resolved</span><span class="sumbox__v">' + resolved.length + ' · ' + D.rp(total) + '</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Unresolved</span><span class="sumbox__v">' + unresolved.length + '</span></div>';
    $('mkResolved').innerHTML = resolved.length ? resolved.map(function (p) {
      return '<tr><td>' + D.sb(p.payable_type) + '</td><td>' + p.request_no + '</td><td>' + D.emp(p.employee_id).name + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(p.amount) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="tempty">Every selected row fails a gate.</div></td></tr>';
    $('mkUnresolvedWrap').style.display = unresolved.length ? '' : 'none';
    $('mkUnresolved').innerHTML = unresolved.map(function (p) {
      return '<tr><td>' + p.request_no + '</td><td>' + D.emp(p.employee_id).name + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(p.amount) + '</span></td>' +
        '<td><span class="sb sb--red"><span class="sb__dot"></span>' + p.blocked + '</span></td></tr>';
    }).join('');
    mkMethod = null;
    var v = $('mkMethod').querySelector('.ctl__value'); v.textContent = 'Select method'; v.style.color = 'var(--fg-4)';
    $('mkMethod').querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
    $('mkNote').value = '';
    $('mkConfirm').disabled = true;
    icons();
    F.openModal('markModal');
  }
  function mkCheck() { $('mkConfirm').disabled = !(mkMethod && $('mkNote').value.trim().length > 0); }

  document.addEventListener('DOMContentLoaded', function () {
    $('fltEmpDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All employees</div>' +
      D.EMPLOYEES.map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + '</div>'; }).join('');
    F.wireSelects(document);
    D.bindOpts('fltEmp');
    pgPay = F.pager('pgPay', 10, function () { renderPay(); icons(); }, 'payables');
    pgOut = F.pager('pgOut', 10, function () { renderOut(); icons(); }, 'clearance rows');
    renderPay(); renderOut(); icons();

    var h = (location.hash || '').replace('#', '');
    if (h) { var t = document.querySelector('.tabnav__tab[data-tab="' + h + '"]'); if (t) t.click(); }

    $('roleSeg').addEventListener('segchange', function (e) {
      role = e.detail.value;
      picked = {};
      renderPay(); icons();
      F.toast(role === 'HR'
        ? 'Viewing as HR Manager — read only on Disbursement: the mark buttons are hidden, not disabled. Declare Settled stays available.'
        : 'Viewing as Finance Officer — the only human role that may mark a payable as paid.', 'info');
    });

    $('fltMark').addEventListener('select', function (e) { flt.mark = e.detail.value; picked = {}; renderPay(); icons(); });
    $('fltType').addEventListener('select', function (e) { flt.type = /^[A-Z_]+$/.test(e.detail.value) ? e.detail.value : ''; renderPay(); icons(); });
    $('fltNo').addEventListener('input', function () { flt.no = this.value.trim(); renderPay(); icons(); });
    $('fltSort').addEventListener('select', function (e) { flt.sort = e.detail.value; renderPay(); icons(); });
    $('exportBtn').addEventListener('click', function () {
      F.toast('Export queued for scope DISBURSEMENT over the current date range — the file is returned as a direct download and the download is logged in the same transaction.', 'ok');
    });
    $('fltOut').addEventListener('select', function (e) { oflt.status = /^[A-Z_]+$/.test(e.detail.value) ? e.detail.value : ''; renderOut(); icons(); });
    $('fltEmp').addEventListener('select', function (e) { oflt.emp = /^emp-/.test(e.detail.value) ? e.detail.value : ''; renderOut(); icons(); });

    $('payBody').addEventListener('change', function (e) {
      var b = e.target.closest('[data-pick]');
      if (!b) return;
      picked[b.getAttribute('data-pick')] = b.checked;
      syncBulk();
    });
    $('payBody').addEventListener('click', function (e) {
      var m = e.target.closest('[data-mark]'), r = e.target.closest('[data-reverse]'), v = e.target.closest('[data-view]');
      if (v) { var pv = payables.filter(function (p) { return key(p) === v.getAttribute('data-view'); })[0]; if (pv) openPayDetail(pv); return; }
      if (m) openMark([m.getAttribute('data-mark')]);
      if (r) {
        reversing = payables.filter(function (p) { return key(p) === r.getAttribute('data-reverse'); })[0];
        $('rvKv').innerHTML = '<div class="kv__k">Request no.</div><div class="kv__v">' + reversing.request_no + '</div>' +
          '<div class="kv__k">Payable type</div><div class="kv__v">' + reversing.payable_type + '</div>' +
          '<div class="kv__k">Amount</div><div class="kv__v">' + D.rp(reversing.amount) + '</div>' +
          '<div class="kv__k">Mark id</div><div class="kv__v">' + reversing.mark.disbursement_mark_id + '</div>';
        $('rvNote').value = '';
        F.openModal('reverseModal');
      }
    });
    $('bulkMarkBtn').addEventListener('click', function () {
      openMark(Object.keys(picked).filter(function (k) { return picked[k]; }));
    });

    $('mkMethod').addEventListener('select', function (e) { mkMethod = e.detail.value; mkCheck(); });
    $('mkNote').addEventListener('input', mkCheck);
    $('mkConfirm').addEventListener('click', function () {
      var resolved = markSet.filter(function (p) { return !p.blocked; });
      if (!resolved.length) { F.toast('422 — every selected row fails a gate; nothing can be marked.', 'danger'); return; }
      if (mkMethod === 'WITH_PAYROLL' && resolved.some(function (p) { return p.payable_type === 'LOAN'; })) {
        F.toast('422 FIN_PAYROLL_CONFIRMATION_REQUIRED — a loan cannot be marked WITH_PAYROLL before payroll confirms.', 'danger'); return;
      }
      var actionId = 'act-rahmat-' + new Date().toISOString().slice(5, 10).replace('-', '');
      var total = 0;
      resolved.forEach(function (p) {
        total += p.amount;
        p.mark_status = 'MARKED';
        p.mark = { disbursement_mark_id: 'mark-' + p.payable_id + '-1', marked_at: new Date().toISOString().slice(0, 10),
          mark_source: 'MANUAL', payment_method: mkMethod, action_id: actionId, reason_note: $('mkNote').value.trim() };
      });
      var blocked = markSet.length - resolved.length;
      picked = {};
      F.closeModal('markModal'); renderPay(); icons();
      F.toast('201 Created — ' + resolved.length + ' row(s) marked, ' + D.rp(total) + ' · action ' + actionId +
        (blocked ? '. ' + blocked + ' row(s) left untouched behind an active gate.' : '. Rows leave the unmarked list from this point.'), 'ok');
    });

    $('rvConfirm').addEventListener('click', function () {
      if (!reversing) return;
      if (!$('rvNote').value.trim()) { F.toast('422 — a reason note is required for a reversal.', 'danger'); return; }
      reversing.mark_status = 'UNMARKED';
      reversing.mark = null;
      F.closeModal('reverseModal'); renderPay(); icons();
      F.toast('201 Created — reversing row written; the payable returns to the unmarked list. A second reversal of the same target is refused with 409.', 'ok');
      reversing = null;
    });

    $('outBody').addEventListener('click', function (e) {
      var ov = e.target.closest('[data-oview]');
      if (ov) {
        var o = outs.filter(function (x) { return x.id === ov.getAttribute('data-oview'); })[0];
        var oe = D.emp(o.employee_id);
        $('odKv').innerHTML = '<div class="kv__k">Clearance id</div><div class="kv__v">' + o.id + '</div>' +
          '<div class="kv__k">Employee</div><div class="kv__v">' + oe.name + ' · ' + oe.nik + '</div>' +
          '<div class="kv__k">Exit date</div><div class="kv__v">' + F.fmtDate(o.exit_date) + '</div>' +
          '<div class="kv__k">Outstanding amount</div><div class="kv__v">' + D.rp(o.outstanding_amount) + '<div class="person__sub">Loan and cash advance combined, snapshotted at exit.</div></div>' +
          '<div class="kv__k">Status</div><div class="kv__v">' + o.status + '</div>' +
          '<div class="kv__k">Recorded</div><div class="kv__v">' + F.fmtDate(o.created_at) + '</div>' +
          '<div class="kv__k">Resolved</div><div class="kv__v">' + (o.resolved_at ? F.fmtDate(o.resolved_at) + ' · Asia/Jakarta' : '— not resolved') + '</div>' +
          '<div class="kv__k">Settlement note</div><div class="kv__v">' + (o.settled_reason_note || (o.status === 'CLEARED_BY_REPAYMENT' ? '— stays empty: cleared by the repayment watcher, not by a human' : '—')) + '</div>';
        icons();
        F.openModal('outDetail');
        return;
      }
      var s = e.target.closest('[data-settle]');
      if (!s) return;
      settling = outs.filter(function (o) { return o.id === s.getAttribute('data-settle'); })[0];
      var em = D.emp(settling.employee_id);
      $('dsKv').innerHTML = '<div class="kv__k">Employee</div><div class="kv__v">' + em.name + ' · ' + em.nik + '</div>' +
        '<div class="kv__k">Outstanding</div><div class="kv__v">' + D.rp(settling.outstanding_amount) + '</div>' +
        '<div class="kv__k">Status</div><div class="kv__v">' + settling.status + '</div>' +
        '<div class="kv__k">Exit date</div><div class="kv__v">' + F.fmtDate(settling.exit_date) + '</div>';
      $('dsNote').value = '';
      $('dsConfirm').disabled = true;
      F.openModal('settleModal');
    });
    $('dsNote').addEventListener('input', function () { $('dsConfirm').disabled = !this.value.trim(); });
    $('dsConfirm').addEventListener('click', function () {
      if (!settling) return;
      settling.status = 'DECLARED_SETTLED';
      settling.resolved_at = new Date().toISOString().slice(0, 10);
      settling.settled_reason_note = $('dsNote').value.trim();
      F.closeModal('settleModal'); renderOut(); icons();
      F.toast('200 OK — declared settled. Terminal state; the resolution date anchors the retention window.', 'ok');
      settling = null;
    });
  });
})();
