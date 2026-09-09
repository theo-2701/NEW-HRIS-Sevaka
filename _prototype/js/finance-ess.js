// SEVAKA HRIS — ESS Finance (Menu 7b · ESS-3/4/5)
// Read-only composite hub, zero new endpoints (FSD §7.2). Submission, cancel and the
// beneficiary list live on the Benefit Reimbursement page (BR-A3/A4/A5, BR-A6) and are
// never duplicated here; loan actions are referenced to the Loan page.
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN, ME = 'emp-budi';
  var claims = D.CLAIMS.slice(), bens = D.BENEFICIARIES.slice();
  var current = null, pgMine, pgLoan;

  var $ = function (id) { return document.getElementById(id); };
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function benName(id) { var b = bens.filter(function (x) { return x.id === id; })[0]; return b ? b.name : '—'; }
  function mine() { return claims.filter(function (c) { return c.employee_id === ME; }); }

  function renderClaims() {
    var all = mine(), rows = pgMine.slice(all);
    $('cntClaims').textContent = all.length;
    $('claimBody').innerHTML = rows.length ? rows.map(function (c) {
      return '<tr><td><button class="idlink" data-view="' + c.id + '">' + c.request_no + '</button></td>' +
        '<td>' + c.benefit_type_name + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(c.total_amount) + '</span></td>' +
        '<td>' + D.sb(c.status) + '</td>' +
        '<td>' + D.sb(c.reservation_state) + '</td>' +
        '<td>' + F.fmtDate(c.submitted_at) + '</td>' +
        '<td class="ta-r"><span class="rowacts"><button class="rowbtn" data-view="' + c.id + '">View Detail</button></span></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty"><span class="tempty__t">No claim in this period yet</span>Period 01 Jan 2026 – 31 Dec 2026 (grace until 31 Jan 2027). Submit one from the Benefit Reimbursement page.</div></td></tr>';
    pgMine.paint();
  }

  function renderLoans() {
    var all = D.LOANS.filter(function (l) { return l.employee_id === ME; }), rows = pgLoan.slice(all);
    $('cntLoans').textContent = all.length;
    $('loanBody').innerHTML = rows.length ? rows.map(function (l) {
      return '<tr><td><span class="cell-strong">' + l.request_no + '</span></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(l.principal_amount) + '</span></td>' +
        '<td class="ta-c">' + l.tenor_months + ' mo</td>' +
        '<td class="ta-r"><span class="money money--dim">' + (l.interest_amount === null ? '—' : D.rp(l.interest_amount)) + '</span></td>' +
        '<td class="ta-r"><span class="money">' + (l.total_obligation === null ? '—' : D.rp(l.total_obligation)) + '</span></td>' +
        '<td>' + D.sb(l.status) + '</td>' +
        '<td>' + F.fmtDate(l.submitted_at) + '</td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">No loan request yet.</div></td></tr>';
    pgLoan.paint();
  }

  function openClaim(id) {
    current = claims.filter(function (c) { return c.id === id; })[0];
    if (!current) return;
    var bank = current.bank_account_snapshot;
    $('cdTitle').textContent = 'Claim ' + current.request_no;
    $('cdKv').innerHTML =
      '<div class="kv__k">Benefit type</div><div class="kv__v">' + current.benefit_type_name + '</div>' +
      '<div class="kv__k">Period</div><div class="kv__v">' + current.period_id + '</div>' +
      '<div class="kv__k">Amount</div><div class="kv__v">' + D.rp(current.total_amount) + '</div>' +
      '<div class="kv__k">Status</div><div class="kv__v"><span class="badges">' + D.sb(current.status) + ' ' + D.sb(current.reservation_state) + '</span></div>' +
      '<div class="kv__k">Bank account</div><div class="kv__v">' + bank.bank_code + ' ' + bank.account_number + ' · ' + bank.account_holder_name + '</div>' +
      '<div class="kv__k">Submitted</div><div class="kv__v">' + F.fmtDate(current.submitted_at) + '</div>' +
      '<div class="kv__k">Decided</div><div class="kv__v">' + (current.decided_at ? F.fmtDate(current.decided_at) : '<span class="cell-dim">—</span>') + '</div>' +
      (current.reason_note ? '<div class="kv__k">Rejection note</div><div class="kv__v">' + current.reason_note + '</div>' : '');
    $('cdItems').innerHTML = current.items.map(function (it) {
      var who = it.beneficiary_kind === 'SELF' ? 'Myself' : benName(it.beneficiary_id) + ' · ' + it.beneficiary_relationship_snapshot;
      return '<tr><td>' + F.fmtDate(it.expense_date) + '</td><td>' + who + '</td>' +
        '<td><span class="cell-mono">' + (it.receipt_no || '—') + '</span></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(it.amount) + '</span></td>' +
        '<td class="ta-c"><button class="rowbtn" data-doc="' + it.document_id + '">Open</button></td></tr>';
    }).join('');
    icons();
    F.openModal('claimDetail');
  }

  document.addEventListener('DOMContentLoaded', function () {
    pgMine = F.pager('pgMine', 10, function () { renderClaims(); icons(); }, 'claims');
    pgLoan = F.pager('pgLoan', 10, function () { renderLoans(); icons(); }, 'loans');
    renderClaims(); renderLoans(); icons();
    var hash = (location.hash || '').replace('#', '');
    if (hash) { var t = document.querySelector('.tabnav__tab[data-tab="' + hash + '"]'); if (t) t.click(); }
    $('claimBody').addEventListener('click', function (e) {
      var v = e.target.closest('[data-view]');
      if (v) openClaim(v.getAttribute('data-view'));
    });
    $('claimDetail').addEventListener('click', function (e) {
      if (e.target.closest('[data-doc]')) F.toast('Attachment opened through document-service.', 'info');
    });
  });
})();
