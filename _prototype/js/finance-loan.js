// SEVAKA HRIS — Loan (FT3 · LN-A2/A3/A4 · LN-B2/B3/B4 · LN-C2/C3 · LN-S1)
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN;
  var loans = D.LOANS.slice(), ME = 'emp-budi';
  var flt = { status: [], no: '' }, deciding = null, acking = null, lfTenor = null;
  var STATES = D.LOAN_STATES.map(function (s) { return s[0]; });
  var MAX_ACTIVE = 2, MGR = 'emp-sinta';
  var HELD = ['SUBMITTED', 'AWAITING_CALCULATION', 'AWAITING_ACKNOWLEDGEMENT'];
  var CONSUMED = ['APPROVED', 'DISBURSED', 'SETTLED'];
  function resvState(l) { return HELD.indexOf(l.status) >= 0 ? 'HELD' : CONSUMED.indexOf(l.status) >= 0 ? 'CONSUMED' : 'RELEASED'; }
  function resvCell(l) {
    var s = resvState(l);
    return '<span class="money' + (s === 'HELD' ? '' : ' money--dim') + '">' + D.rp(l.principal_amount) + '</span>' +
      '<span class="cell-dim" style="display:block;font-size:11px">' + s + '</span>';
  }
  function activeCount() {
    return loans.filter(function (l) { return l.employee_id === ME && HELD.concat(CONSUMED).indexOf(l.status) >= 0; }).length;
  }

  var pgMine, pgAll, pgApr;
  // claim the status filter before flow-common's DOMContentLoaded wireSelects() runs
  (function () { var f = document.getElementById('fltStatus'); if (f) f.dataset.wired = '1'; })();
  var $ = function (id) { return document.getElementById(id); };
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function room() {
    var e = D.EXPOSURE;
    return e.limit_amount - e.outstanding_amount - e.reserved_amount;
  }

  function renderRoom() {
    var e = D.EXPOSURE;
    $('roomV').textContent = D.rp(room());
    $('limitV').textContent = D.rp(e.limit_amount);
    $('limitF').textContent = D.grade(e.job_grade_id) + ' — no active per-employee exception.';
    $('outV').textContent = D.rp(e.outstanding_amount);
    $('resV').textContent = D.rp(e.reserved_amount);
  }

  function tenorOptions() {
    var out = [];
    for (var t = 3; t <= D.LOAN_CFG.tenor_max; t += 3) out.push(t);
    return out;
  }

  function renderMine() {
    var all = loans.filter(function (l) { return l.employee_id === ME; });
    $('cntMine').textContent = all.length;
    var rows = pgMine.slice(all);
    $('mineBody').innerHTML = rows.length ? rows.map(function (l) {
      var items = [];
      if (l.status === 'AWAITING_ACKNOWLEDGEMENT') items.push({ label: 'Acknowledge', icon: 'check', attr: 'data-ack="' + l.id + '"' });
      items.push({ label: 'View Detail', icon: 'eye', href: 'finance-loan-detail.html?id=' + l.id });
      if (l.status === 'SUBMITTED') items.push({ label: 'Cancel', icon: 'x', attr: 'data-cancel="' + l.id + '"', danger: true });
      if (l.status === 'AWAITING_CALCULATION') items.push({ label: 'Withdraw', icon: 'undo-2', attr: 'data-withdraw="' + l.id + '"', danger: true });
      var acts = items.length > 1 ? F.rowMenu(items) : '<a class="rowbtn" href="finance-loan-detail.html?id=' + l.id + '">View Detail</a>';
      return '<tr><td><a class="idlink" href="finance-loan-detail.html?id=' + l.id + '">' + l.request_no + '</a></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(l.principal_amount) + '</span></td>' +
        '<td class="ta-c">' + l.tenor_months + ' mo</td>' +
        '<td class="ta-r"><span class="money money--dim">' + (l.interest_amount === null ? '—' : D.rp(l.interest_amount)) + '</span></td>' +
        '<td class="ta-r"><span class="money">' + (l.total_obligation === null ? '—' : D.rp(l.total_obligation)) + '</span></td>' +
        '<td>' + D.sb(l.status) + '</td><td>' + F.fmtDate(l.submitted_at) + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + acts + '</span></td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tempty">No loan request yet.</div></td></tr>';
    pgMine.paint();
  }

  function renderAck() {
    var rows = loans.filter(function (l) { return l.employee_id === ME && l.status === 'AWAITING_ACKNOWLEDGEMENT'; });
    $('cntAck').textContent = rows.length;
    $('ackWrap').innerHTML = rows.length ? rows.map(function (l) {
      var o = l.acknowledgement_offer || {};
      return '<div class="fcard" style="gap:14px"><span class="fcard__t">' + l.request_no + ' · schedule received from the funding party</span>' +
        '<div class="drawer__meta">' +
          '<div class="dmeta"><span class="dmeta__k">Principal</span><span class="dmeta__v">' + D.rp(o.acknowledged_principal) + '</span></div>' +
          '<div class="dmeta"><span class="dmeta__k">Interest</span><span class="dmeta__v">' + D.rp(o.acknowledged_interest) + '</span></div>' +
          '<div class="dmeta"><span class="dmeta__k">Tenor</span><span class="dmeta__v">' + o.acknowledged_tenor + ' months</span></div>' +
          '<div class="dmeta"><span class="dmeta__k">Total obligation</span><span class="dmeta__v">' + D.rp(o.acknowledged_principal + o.acknowledged_interest) + '</span></div>' +
        '</div>' +
        '<div style="display:flex;gap:10px"><button class="btn btn--secondary" data-ack="' + l.id + '">Review &amp; acknowledge</button></div></div>';
    }).join('') : '<div class="gapbox"><span class="gapbox__i"><i data-lucide="check"></i></span><div class="gapbox__t">Nothing to acknowledge</div><p class="gapbox__d">A row appears here only while a request sits at <code>AWAITING_ACKNOWLEDGEMENT</code> — that is, on an interest-bearing company after the funding party has returned principal, interest and tenor.</p></div>';
  }

  function renderApr() {
    var q = loans.filter(function (l) { return l.status === 'SUBMITTED' && l.employee_id !== MGR; });
    $('cntApr').textContent = q.length;
    var rows = pgApr.slice(q);
    $('aprBody').innerHTML = rows.length ? rows.map(function (l) {
      var e = D.emp(l.employee_id);
      return '<tr><td><button class="idlink" data-decide="' + l.id + '">' + l.request_no + '</button></td>' +
        '<td><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.unit + ' · ' + e.grade + '</span></div></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(l.principal_amount) + '</span></td>' +
        '<td class="ta-c">' + l.tenor_months + ' mo</td>' +
        '<td class="ta-r">' + resvCell(l) + '</td>' +
        '<td>' + D.sb(l.status) + '</td><td>' + F.fmtDate(l.submitted_at) + '</td>' +
        '<td class="ta-r"><span class="rowacts"><button class="rowbtn" data-decide="' + l.id + '">Review</button></span></td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tempty">Nothing awaiting your decision.</div></td></tr>';
    pgApr.paint();
  }

  function renderAll() {
    var all = loans.filter(function (l) {
      if (flt.status.length && flt.status.indexOf(l.status) < 0) return false;
      if (flt.no && l.request_no.toLowerCase().indexOf(flt.no.toLowerCase()) < 0) return false;
      return true;
    });
    $('cntAll').textContent = loans.length;
    var rows = pgAll.slice(all);
    $('allBody').innerHTML = rows.length ? rows.map(function (l) {
      var e = D.emp(l.employee_id);
      return '<tr><td><a class="idlink" href="finance-loan-detail.html?id=' + l.id + '">' + l.request_no + '</a></td>' +
        '<td><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.grade + '</span></div></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(l.principal_amount) + '</span></td>' +
        '<td class="ta-c">' + l.tenor_months + ' mo</td>' +
        '<td class="ta-r"><span class="money money--dim">' + (l.interest_amount === null ? '—' : D.rp(l.interest_amount)) + '</span></td>' +
        '<td class="ta-r"><span class="money">' + (l.total_obligation === null ? '—' : D.rp(l.total_obligation)) + '</span></td>' +
        '<td class="ta-r">' + resvCell(l) + '</td>' +
        '<td>' + D.sb(l.status) + '</td>' +
        '<td>' + (l.schedule_source ? '<span class="cell-dim">' + l.schedule_source + '</span>' : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r"><span class="rowacts"><a class="rowbtn" href="finance-loan-detail.html?id=' + l.id + '">View Detail</a></span></td></tr>';
    }).join('') : '<tr><td colspan="10"><div class="tempty">No loan matches the current filter.</div></td></tr>';
    pgAll.paint();
  }

  function renderRef() {
    $('refBody').innerHTML = D.LOAN_STATES.map(function (s) {
      return '<tr><td>' + D.sb(s[0]) + '</td><td>' + s[1] + '</td><td>' + s[2] + '</td></tr>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('fltStatusDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All status</div>' +
      STATES.map(function (s) { return '<div class="dropdown__opt" data-val="' + s + '">' + s + '</div>'; }).join('');
    $('lfTenorDd').innerHTML = tenorOptions().map(function (t) { return '<div class="dropdown__opt" data-val="' + t + '">' + t + ' months</div>'; }).join('');
    $('ldReasonDd').innerHTML = D.REJECTION_REASONS.filter(function (r) { return r.is_active; })
      .map(function (r) { return '<div class="dropdown__opt" data-val="' + r.id + '">' + r.name + '</div>'; }).join('');
    pgMine = F.pager('pgMine', 10, function () { renderMine(); icons(); }, 'requests');
    pgAll = F.pager('pgAll', 10, function () { renderAll(); icons(); }, 'loans');
    pgApr = F.pager('pgApr', 10, function () { renderApr(); icons(); }, 'requests');

    // status filter is multi-value (contract: status is an IN list) — wired locally
    var fs = $('fltStatus');
    function paintStatus() {
      fs.querySelectorAll('.dropdown__opt').forEach(function (o) {
        var v = o.dataset.val;
        o.classList.toggle('is-sel', v ? flt.status.indexOf(v) >= 0 : flt.status.length === 0);
      });
      fs.querySelector('.ctl__value').textContent = !flt.status.length ? 'All status'
        : flt.status.length === 1 ? flt.status[0] : flt.status.length + ' statuses selected';
    }
    fs.addEventListener('click', function (e) {
      var opt = e.target.closest('.dropdown__opt');
      if (opt) {
        e.stopPropagation();
        var v = opt.dataset.val;
        if (!v) flt.status = [];
        else { var i = flt.status.indexOf(v); if (i < 0) flt.status.push(v); else flt.status.splice(i, 1); }
        paintStatus(); renderAll(); icons();
        return;
      }
      e.stopPropagation();
      var open = fs.classList.contains('is-open');
      document.querySelectorAll('.ctl--select.is-open').forEach(function (o) { o.classList.remove('is-open'); });
      if (!open) fs.classList.add('is-open');
    });

    F.wireSelects(document);
    ['lfTenor', 'ldReason'].forEach(D.bindOpts);
    if (!D.LOAN_CFG.enabled) {
      var nb = $('newLoanBtn');
      nb.disabled = true;
      nb.title = 'Loan module is disabled for this company (403 FIN_MODULE_DISABLED).';
    }
    renderRoom(); renderMine(); renderAck(); renderApr(); renderAll(); renderRef(); icons();

    var h = (location.hash || '').replace('#', '');
    if (h) { var t = document.querySelector('.tabnav__tab[data-tab="' + h + '"]'); if (t) t.click(); }

    // ---- new request
    $('newLoanBtn').addEventListener('click', function () {
      if (!D.LOAN_CFG.enabled) { F.toast('403 FIN_MODULE_DISABLED — the loan module is switched off for this company.', 'danger'); return; }
      if (activeCount() >= MAX_ACTIVE) { F.toast('422 FIN_ACTIVE_LOAN_COUNT_EXCEEDED — ' + activeCount() + ' of ' + MAX_ACTIVE + ' allowed active loans are already running.', 'danger'); return; }
      lfTenor = null;
      $('lfAmount').value = '';
      var v = $('lfTenor').querySelector('.ctl__value'); v.textContent = 'Select tenor'; v.style.color = 'var(--fg-4)';
      $('lfLimit').textContent = D.rp(D.EXPOSURE.limit_amount);
      $('lfUsed').textContent = D.rp(D.EXPOSURE.outstanding_amount + D.EXPOSURE.reserved_amount);
      $('lfRoom').textContent = D.rp(room());
      $('lfSubmit').disabled = true;
      F.openModal('loanForm');
    });
    var lg = $('btnLegend'); if (lg) lg.addEventListener('click', function () { F.openModal('legendModal'); });
    function lfCheck() { $('lfSubmit').disabled = !(lfTenor && D.parseRp($('lfAmount').value) > 0); }
    $('lfAmount').addEventListener('input', function () { this.value = D.thousands(this.value); lfCheck(); });
    $('lfTenor').addEventListener('select', function (e) { lfTenor = +e.detail.value; lfCheck(); });
    $('lfSubmit').addEventListener('click', function () {
      var amount = D.parseRp($('lfAmount').value);
      if (amount > room()) { F.toast('422 FIN_LOAN_LIMIT_EXCEEDED — principal exceeds the available borrowing room (' + D.rp(room()) + ').', 'danger'); return; }
      var no = 'LON-2026-0000' + (24 + loans.length + 1);
      loans.unshift({ id: 'loan-' + Date.now(), request_no: no, employee_id: ME, principal_amount: amount, tenor_months: lfTenor,
        interest_bearing_snapshot: true, schedule_source: null, interest_amount: null, total_obligation: null,
        status: 'SUBMITTED', submitted_at: new Date().toISOString().slice(0, 10), workflow_instance_id: '8b00…' + Math.random().toString(16).slice(4, 7),
        bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null });
      D.EXPOSURE.reserved_amount += amount;
      F.closeModal('loanForm');
      renderRoom(); renderMine(); renderApr(); renderAll(); icons();
      F.toast('201 Created — ' + no + ' submitted (' + D.rp(amount) + ' · ' + lfTenor + ' months). Workflow instance started.', 'ok');
    });

    // ---- decision
    function openDecision(id) {
      deciding = loans.filter(function (l) { return l.id === id; })[0];
      if (!deciding) return;
      var e = D.emp(deciding.employee_id);
      $('ldTitle').textContent = 'Decision — ' + deciding.request_no;
      $('ldKv').innerHTML =
        '<div class="kv__k">Employee</div><div class="kv__v">' + e.name + ' · ' + e.grade + '</div>' +
        '<div class="kv__k">Principal</div><div class="kv__v">' + D.rp(deciding.principal_amount) + '</div>' +
        '<div class="kv__k">Tenor</div><div class="kv__v">' + deciding.tenor_months + ' months</div>' +
        '<div class="kv__k">Scheme</div><div class="kv__v">Interest-bearing — interest arrives from the funding party</div>' +
        '<div class="kv__k">Cost center</div><div class="kv__v">' + (deciding.cost_center_id_snapshot || 'null — snapshot taken at submission (GAP-2)') + '</div>' +
        '<div class="kv__k">Reservation</div><div class="kv__v">' + D.rp(deciding.principal_amount) + ' · ' + resvState(deciding) + '</div>' +
        '<div class="kv__k">Submitted</div><div class="kv__v">' + F.fmtDate(deciding.submitted_at) + '</div>' +
        '<div class="kv__k">Status</div><div class="kv__v">' + D.sb(deciding.status) + '</div>';
      $('ldReject').style.display = 'none';
      $('ldNote').value = '';
      var rv = $('ldReason').querySelector('.ctl__value'); rv.textContent = 'Select reason'; rv.style.color = 'var(--fg-4)';
      $('ldReason').querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
      F.openModal('loanDecision');
    }
    $('aprBody').addEventListener('click', function (e) {
      var d = e.target.closest('[data-decide]');
      if (d) openDecision(d.getAttribute('data-decide'));
    });
    $('ldApproveBtn').addEventListener('click', function () {
      F.closeModal('loanDecision');
      F.toast('202 Accepted — decision forwarded, awaiting the approval process. Status still ' + deciding.status + '.', 'info');
    });
    $('ldRejectBtn').addEventListener('click', function () {
      var block = $('ldReject');
      if (block.style.display === 'none') { block.style.display = 'flex'; F.toast('Select a rejection reason to continue.', 'info'); return; }
      if (!$('ldReason').querySelector('.dropdown__opt.is-sel')) { F.toast('422 — rejection reason is mandatory.', 'danger'); return; }
      F.closeModal('loanDecision');
      F.toast('202 Accepted — rejection forwarded to the approval process.', 'info');
    });

    // ---- acknowledgement
    function openAck(id) {
      acking = loans.filter(function (l) { return l.id === id; })[0];
      if (!acking) return;
      var o = acking.acknowledgement_offer || {};
      $('ackSum').innerHTML = '<div class="sumbox__head"><i data-lucide="file-text"></i>' + acking.request_no + ' — received schedule</div>' +
        '<div class="sumbox__row"><span class="sumbox__k">Principal</span><span class="sumbox__v">' + D.rp(o.acknowledged_principal) + '</span></div>' +
        '<div class="sumbox__row"><span class="sumbox__k">Interest</span><span class="sumbox__v">' + D.rp(o.acknowledged_interest) + '</span></div>' +
        '<div class="sumbox__row"><span class="sumbox__k">Tenor</span><span class="sumbox__v">' + o.acknowledged_tenor + ' months</span></div>' +
        '<div class="sumbox__row"><span class="sumbox__k">Total obligation</span><span class="sumbox__v">' + D.rp(o.acknowledged_principal + o.acknowledged_interest) + '</span></div>';
      icons();
      F.openModal('ackModal');
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-ack]');
      if (a) openAck(a.getAttribute('data-ack'));
    });
    $('ackConfirm').addEventListener('click', function () {
      if (!acking) return;
      var o = acking.acknowledgement_offer;
      acking.status = 'APPROVED'; acking.interest_amount = o.acknowledged_interest;
      acking.total_obligation = o.acknowledged_principal + o.acknowledged_interest;
      acking.schedule_source = 'RECEIVED_FROM_EXTERNAL';
      D.INSTALLMENTS[acking.id] = (function () {
        var rows = [], due = acking.total_obligation / acking.tenor_months;
        for (var i = 1; i <= acking.tenor_months; i++) {
          var m = 8 + i, y = 2026 + (m > 12 ? 1 : 0), mm = m > 12 ? m - 12 : m;
          rows.push({ sequence_no: i, payroll_period_ref: y + '-' + String(mm).padStart(2, '0') + '-25', due_amount: due, status: 'PENDING' });
        }
        return rows;
      })();
      F.closeModal('ackModal');
      renderMine(); renderAck(); renderApr(); renderAll(); icons();
      F.toast('200 OK — schedule acknowledged. ' + acking.request_no + ' is now APPROVED and enters the disbursement list.', 'ok');
    });
    $('ackDecline').addEventListener('click', function () {
      if (!acking) return;
      acking.status = 'DECLINED_BY_EMPLOYEE';
      F.closeModal('ackModal');
      renderMine(); renderAck(); renderApr(); renderAll(); icons();
      F.toast('200 OK — schedule declined. The reservation is released; you may submit a new request.', 'info');
    });

    // ---- my list actions
    $('mineBody').addEventListener('click', function (e) {
      var c = e.target.closest('[data-cancel]'), w = e.target.closest('[data-withdraw]');
      if (c) {
        var l = loans.filter(function (x) { return x.id === c.getAttribute('data-cancel'); })[0];
        l.status = 'CANCELLED';
        D.EXPOSURE.reserved_amount = Math.max(0, D.EXPOSURE.reserved_amount - l.principal_amount);
        renderRoom(); renderMine(); renderApr(); renderAll(); icons();
        F.toast('200 OK — ' + l.request_no + ' cancelled while still SUBMITTED. The reservation is released.', 'ok');
      }
      if (w) {
        var lw = loans.filter(function (x) { return x.id === w.getAttribute('data-withdraw'); })[0];
        lw.status = 'WITHDRAWN';
        D.EXPOSURE.reserved_amount = Math.max(0, D.EXPOSURE.reserved_amount - lw.principal_amount);
        renderRoom(); renderMine(); renderApr(); renderAll(); icons();
        F.toast('200 OK — ' + lw.request_no + ' withdrawn after the AWAITING_CALCULATION threshold. The reservation is released.', 'ok');
      }
    });

    // ---- admin filters + drawer
    $('fltNo').addEventListener('input', function () { flt.no = this.value.trim(); renderAll(); icons(); });
  });
})();
