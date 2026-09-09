// SEVAKA HRIS — Loan detail (LN-S1 detail view · GET /loans/{id})
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN;
  var HELD = ['SUBMITTED', 'AWAITING_CALCULATION', 'AWAITING_ACKNOWLEDGEMENT'];
  var CONSUMED = ['APPROVED', 'DISBURSED', 'SETTLED'];
  function resv(s) { return HELD.indexOf(s) >= 0 ? 'HELD' : CONSUMED.indexOf(s) >= 0 ? 'CONSUMED' : 'RELEASED'; }
  function kv(k, v) { return '<div class="dmeta"><span class="dmeta__k">' + k + '</span><span class="dmeta__v">' + v + '</span></div>'; }

  document.addEventListener('DOMContentLoaded', function () {
    var id = (location.search.match(/[?&]id=([^&]+)/) || [])[1] || '';
    var l = D.LOANS.filter(function (x) { return x.id === decodeURIComponent(id); })[0];
    var mount = document.getElementById('body');
    if (!l) {
      mount.innerHTML = '<div class="gapbox"><span class="gapbox__i"><i data-lucide="search-x"></i></span><div class="gapbox__t">Request not found</div>' +
        '<p class="gapbox__d">This detail view is opened from a row in the Loan page \u2014 requests created during this session live only in that page\u2019s memory.</p>' +
        '<a class="btn btn--secondary" href="finance-loan.html" style="margin-top:12px">Back to list</a></div>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    var e = D.emp(l.employee_id), bank = l.bank_account_snapshot || {}, inst = D.INSTALLMENTS[l.id] || [];
    document.getElementById('crName').textContent = l.request_no;
    document.getElementById('ttl').textContent = l.request_no;
    document.getElementById('sub').textContent = e.name + ' \u00b7 ' + e.unit + ' \u00b7 ' + e.grade +
      ' \u2014 read-only view of the request as submitted, plus the installment plan.';

    var due = inst.length ? inst.map(function (r) {
      return '<tr><td class="ta-c">' + r.sequence_no + '</td><td>' + F.fmtDate(r.payroll_period_ref) + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(r.due_amount) + '</span></td><td>' + D.sb(r.status) + '</td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="tempty">No installment plan yet \u2014 the schedule is issued once the loan reaches APPROVED.</div></td></tr>';

    mount.innerHTML =
      '<div class="fin-cards">' +
        '<div class="fcard fcard--hero"><span class="fcard__t">Principal</span><span class="fcard__v">' + D.rp(l.principal_amount) + '</span><span class="fcard__f">Tenor ' + l.tenor_months + ' months \u00b7 reservation ' + resv(l.status) + '</span></div>' +
        '<div class="fcard"><span class="fcard__t">Interest</span><span class="fcard__v">' + (l.interest_amount === null ? '\u2014' : D.rp(l.interest_amount)) + '</span><span class="fcard__f">Never computed by HRIS \u2014 it arrives from the funding party.</span></div>' +
        '<div class="fcard"><span class="fcard__t">Total obligation</span><span class="fcard__v">' + (l.total_obligation === null ? '\u2014' : D.rp(l.total_obligation)) + '</span><span class="fcard__f">Principal + interest as acknowledged.</span></div>' +
        '<div class="fcard"><span class="fcard__t">Status</span><span class="fcard__v" style="font-size:20px">' + D.sb(l.status) + '</span><span class="fcard__f">Set by the approval process, not edited here.</span></div>' +
      '</div>' +
      '<div class="drawer" style="margin-top:18px"><div class="drawer__head"><span class="drawer__t">Request Information</span><span class="sec-head__note">Recorded at submission and no longer changes.</span></div>' +
      '<div class="drawer__meta">' +
        kv('Employee', e.name + ' \u00b7 ' + e.nik) +
        kv('Submitted', F.fmtDate(l.submitted_at)) +
        kv('Scheme', l.interest_bearing_snapshot ? 'Interest-bearing' : 'Interest-free') +
        kv('Schedule source', l.schedule_source || '\u2014') +
        kv('Bank account', (bank.bank_code || '\u2014') + ' ' + (bank.account_number || '') + '<br><span class="cell-dim">' + (bank.account_holder_name || '') + '</span>') +
        kv('Cost center', l.cost_center_id_snapshot || '\u2014') +
        kv('Reservation', D.rp(l.principal_amount) + ' \u00b7 ' + resv(l.status)) +
      '</div></div>' +
      '<div class="sec-head" style="margin-top:26px"><span class="sec-head__t">Installment plan</span><span class="sec-head__sp"></span><span class="sec-head__note">Ordered by installment sequence. Start date and arrears handling follow the schedule and cannot be changed here.</span></div>' +
      '<div class="dtable-wrap" style="margin-top:10px"><table class="dtable"><thead><tr><th class="ta-c">#</th><th>Payroll Period</th><th class="ta-r">Due Amount</th><th>Status</th></tr></thead><tbody>' + due + '</tbody></table></div>' +
      '<div class="note note--info" style="margin-top:16px"><i data-lucide="lock"></i><span><strong>Read only.</strong> A finance officer cannot alter principal or tenor here, and cannot cancel or withdraw on an employee\u2019s behalf \u2014 Loan has no on-behalf door.</span></div>';
    if (window.lucide) window.lucide.createIcons();
  });
})();
