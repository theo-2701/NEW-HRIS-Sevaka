// SEVAKA HRIS — Benefit Reimbursement (FT2 · BR-A2/BR-B2..B4 · BR-C2..D4 · BR-S1..S3)
// This page owns submission (BR-A3 "+ New Claim" -> BR-A4 form -> BR-A5 toast), the
// applicant cancel (UIC 3.1 #10) and the beneficiary list (proposed frame BR-A6), per
// FSD 2.2 / 7.2.1. The ESS hub only links here — it never duplicates the form.
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN, ME = 'emp-budi';
  var claims = D.CLAIMS.slice(), bens = D.BENEFICIARIES.slice(), types = D.BENEFIT_TYPES.slice();
  var flt = { q: '', status: '', type: '' };
  var current = null, editingType = null, cancelling = null, bfPick = null, rejecting = null;
  var cfItems = [], cfType = null;
  // employee_profile.mst_relative of the signed-in employee — the source list the
  // beneficiary picker reads from. Ids match the seeded beneficiaries above.
  var RELATIVES = [
    { id: 'rel-siti', name: 'Siti Aminah', relationship_type: 'SPOUSE' },
    { id: 'rel-adit', name: 'Aditya Santoso', relationship_type: 'CHILD' },
    { id: 'rel-sri', name: 'Sri Wahyuni', relationship_type: 'PARENT' },
    { id: 'rel-yuni', name: 'Yuni Santoso', relationship_type: 'SIBLING' }
  ];
  var pgAll, pgLedger, pgDisb;

  var $ = function (id) { return document.getElementById(id); };
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  function dt(iso) { return iso ? F.fmtDate(iso) : '<span class="cell-dim">—</span>'; }
  function tc(s) { return s.charAt(0) + s.slice(1).toLowerCase(); }
  function benName(id) { var b = bens.filter(function (x) { return x.id === id; })[0]; return b ? b.name : '—'; }
  function yn(v) { return v ? 'Yes' : '<span class="cell-dim">No</span>'; }
  function holdOf(id) { return D.HOLDS.filter(function (h) { return h.is_active && h.target_type === 'BENEFIT_CLAIM' && h.target_id === id; })[0] || null; }

  // ---------------- BR-A2 / BR-B2 — one grid, server-scoped rows ----------------
  function filtered() {
    var q = flt.q.toLowerCase();
    return claims.filter(function (c) {
      if (flt.status && c.status !== flt.status) return false;
      if (flt.type && c.benefit_type_id !== flt.type) return false;
      if (q) {
        var e = D.emp(c.employee_id);
        if ((c.request_no + ' ' + (e ? e.name : '')).toLowerCase().indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function renderClaims() {
    var all = filtered(), rows = pgAll.slice(all);
    $('cntClaims').textContent = claims.length;
    $('claimBody').innerHTML = rows.length ? rows.map(function (c) {
      var e = D.emp(c.employee_id), hold = holdOf(c.id);
      var acts;
      if (c.status === 'SUBMITTED') {
        var menu = [{ label: 'Review', icon: 'gavel', attr: 'data-review="' + c.id + '"' }, { label: 'View Detail', icon: 'eye', attr: 'data-view="' + c.id + '"' }];
        if (c.employee_id === ME) menu.push({ label: 'Cancel', icon: 'x-circle', attr: 'data-cancel="' + c.id + '"', danger: true });
        acts = F.rowMenu(menu);
      } else acts = '<button class="rowbtn" data-view="' + c.id + '">View Detail</button>';
      return '<tr><td><button class="idlink" data-view="' + c.id + '">' + c.request_no + '</button></td>' +
        '<td><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.unit + ' · ' + e.nik + '</span></div></td>' +
        '<td>' + c.benefit_type_name + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(c.total_amount) + '</span></td>' +
        '<td><span class="badges">' + D.sb(c.status) + (hold ? ' <span class="sb sb--indigo"><span class="sb__dot"></span>DISPUTE HOLD</span>' : '') + '</span></td>' +
        '<td>' + D.sb(c.reservation_state) + '</td>' +
        '<td>' + dt(c.submitted_at) + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + acts + '</span></td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tempty"><span class="tempty__t">No claim matches the current filter</span>Clear the filter or widen the submitted-date range.</div></td></tr>';
    pgAll.paint();
  }

  // ---------------- BR-S1 — balance overview (one period at a time) ----------------
  var balPeriod = 0;
  function renderBalance() {
    var segs = D.PERIODS.map(function (p, i) {
      return '<button class="seg__btn' + (i === balPeriod ? ' is-on' : '') + '" type="button" data-per="' + i + '">' +
        '<i data-lucide="' + (p.status === 'OPEN' ? 'calendar-check' : 'calendar-clock') + '"></i>' + p.label + '</button>';
    }).join('');
    var p = D.PERIODS[balPeriod];
    var cards = p.balances.map(function (b) {
      var left = b.entitled_amount - b.used_amount - b.reserved_amount;
      var pu = Math.round(b.used_amount / b.entitled_amount * 100), pr = Math.round(b.reserved_amount / b.entitled_amount * 100);
      return '<div class="fcard"><span class="fcard__t">' + b.benefit_type_name + '</span>' +
        '<span class="fcard__v">' + D.rp(left) + '<small>remaining</small></span>' +
        '<div class="ubar"><span class="ubar__seg--used" style="width:' + pu + '%"></span><span class="ubar__seg--res" style="width:' + pr + '%"></span></div>' +
        '<div class="ulegend"><span><i class="i--used"></i>Used ' + D.rp(b.used_amount) + '</span><span><i class="i--res"></i>Reserved ' + D.rp(b.reserved_amount) + '</span><span><i class="i--left"></i>Entitled ' + D.rp(b.entitled_amount) + '</span></div></div>';
    }).join('');
    $('balanceWrap').innerHTML =
      '<div class="sec-head"><span class="seg">' + segs + '</span>' + D.sb(p.status) +
      '<span class="sec-head__sp"></span><span class="sec-head__note">' + F.fmtDate(p.period_start) + ' – ' + F.fmtDate(p.period_end) + ' · grace ends ' + F.fmtDate(p.grace_end) + '</span></div>' +
      '<div class="fin-cards">' + cards + '</div>';
  }

  // ---------------- BR-S2 — ledger ----------------
  function renderLedger() {
    var remaining = {};
    D.PERIODS[0].balances.forEach(function (b) { remaining[b.benefit_type_name] = b.entitled_amount; });
    var withRunning = D.LEDGER.map(function (l) {
      var delta = l.entry_type === 'RESERVATION' ? -l.amount : (/RELEASE/.test(l.entry_type) ? l.amount : 0);
      remaining[l.benefit_type_name] = (remaining[l.benefit_type_name] || 0) + delta;
      return { l: l, delta: delta, after: remaining[l.benefit_type_name] };
    });
    $('cntLedger').textContent = withRunning.length;
    var rows = pgLedger.slice(withRunning);
    $('ledgerBody').innerHTML = rows.length ? rows.map(function (r) {
      var l = r.l;
      return '<tr><td>' + D.sb(l.entry_type) + '</td>' +
        '<td><span class="cell-mono">' + l.request_no + '</span></td>' +
        '<td>' + l.benefit_type_name + '</td>' +
        '<td class="ta-r"><span class="money' + (r.delta < 0 ? ' money--neg' : (r.delta > 0 ? ' money--pos' : ' money--dim')) + '">' + (r.delta === 0 ? D.rp(l.amount) : (r.delta < 0 ? '−' : '+') + ' ' + D.rp(l.amount)) + '</span></td>' +
        '<td>' + F.fmtDate(l.created_at) + '</td>' +
        '<td class="ta-r"><span class="money money--dim">' + D.rp(r.after) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty">No ledger entry in this period.</div></td></tr>';
    pgLedger.paint();
  }

  // ---------------- BR-S3 — disbursement history (payable_type=BENEFIT_CLAIM) ----------------
  function renderDisb() {
    var all = D.PAYABLES.filter(function (p) {
      if (p.payable_type !== 'BENEFIT_CLAIM') return false;
      var c = D.CLAIMS.filter(function (x) { return x.id === p.payable_id; })[0];
      return !c || c.status === 'APPROVED';   // a payable exists only after approval
    });
    $('cntDisb').textContent = all.length;
    var rows = pgDisb.slice(all);
    $('disbBody').innerHTML = rows.length ? rows.map(function (p) {
      var e = D.emp(p.employee_id), m = p.mark;
      return '<tr><td><span class="cell-strong">' + p.request_no + '</span></td>' +
        '<td>' + (e ? e.name : '—') + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(p.amount) + '</span></td>' +
        '<td>' + (m ? D.sb(m.payment_method) : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + (m ? D.sb(m.mark_source) : D.sb('UNMARKED')) + '</td>' +
        '<td>' + (m ? F.fmtDate(m.marked_at) : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + (m ? F.fmtDate(m.marked_at) : '<span class="cell-dim">not paid yet</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">No approved claim has reached disbursement yet.</div></td></tr>';
    pgDisb.paint();
  }

  // ---------------- settings (cross-reference FT1) ----------------
  function renderTypes() {
    $('typeBody').innerHTML = types.map(function (t) {
      return '<tr><td class="cell-strong">' + t.name + '</td>' +
        '<td>' + yn(t.requires_receipt) + '</td>' +
        '<td>' + yn(t.allows_family_claim) + '</td>' +
        '<td>' + (t.contains_health_data ? '<span class="sb sb--red"><span class="sb__dot"></span>SENSITIVE</span>' : '<span class="sb sb--grey"><span class="sb__dot"></span>STANDARD</span>') + '</td>' +
        '<td>' + D.sb(t.is_active ? 'ACTIVE' : 'INACTIVE') + '</td>' +
        '<td class="ta-r"><span class="rowacts"><button class="rowbtn" data-etype="' + t.id + '">Edit</button></span></td></tr>';
    }).join('');
  }
  function renderEnt() {
    $('entBody').innerHTML = D.ENTITLEMENTS.map(function (e) {
      return '<tr><td class="cell-strong">' + D.grade(e.job_grade_id) + '</td><td>' + D.btype(e.benefit_type_id) + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(e.annual_amount) + '</span></td></tr>';
    }).join('');
  }
  function renderRels() {
    $('relBody').innerHTML = D.FAMILY_RELS.map(function (r) {
      return '<tr><td class="cell-strong">' + r.relationship_type + '</td>' +
        '<td>' + (r.is_eligible ? '<span class="sb sb--green"><span class="sb__dot"></span>ELIGIBLE</span>' : '<span class="sb sb--grey"><span class="sb__dot"></span>NOT ELIGIBLE</span>') + '</td>' +
        '<td><span class="cell-dim">employee-profile · mst_relative.relationship_type</span></td></tr>';
    }).join('');
  }

  // ---------------- BR-A3 detail / BR-B3 decision ----------------
  function projection(c) {
    var b = D.PERIODS[0].balances.filter(function (x) { return x.benefit_type_id === c.benefit_type_id; })[0];
    if (!b) return '';
    var left = b.entitled_amount - b.used_amount - b.reserved_amount;
    return 'Entitled ' + D.rp(b.entitled_amount) + ' · reserved (HELD) ' + D.rp(c.total_amount) +
      ' → used (CONSUMED) ' + D.rp(c.total_amount) + ' · remaining ' + D.rp(left);
  }
  function openClaim(id, asApprover) {
    current = claims.filter(function (c) { return c.id === id; })[0];
    if (!current) return;
    var e = D.emp(current.employee_id), bank = current.bank_account_snapshot, hold = holdOf(current.id);
    $('cdTitle').textContent = (asApprover ? 'Claim approval ' : 'Claim ') + current.request_no;
    $('cdDesc').textContent = asApprover
      ? 'Receipts are read-only for the approver. A decision is forwarded to the approval process and returns 202 Accepted — the status is written asynchronously.'
      : 'Server-authoritative snapshots frozen at submission and approval time.';
    $('cdKv').innerHTML =
      '<div class="kv__k">Applicant</div><div class="kv__v">' + e.name + ' · ' + D.grade(e.job_grade_id || 'jg-staff-2') + ' · ' + e.nik + '</div>' +
      '<div class="kv__k">Benefit type</div><div class="kv__v">' + current.benefit_type_name + '</div>' +
      '<div class="kv__k">Period</div><div class="kv__v">' + current.period_id + '</div>' +
      '<div class="kv__k">Amount claimed</div><div class="kv__v">' + D.rp(current.total_amount) + '</div>' +
      '<div class="kv__k">Status</div><div class="kv__v"><span class="badges">' + D.sb(current.status) + ' ' + D.sb(current.reservation_state) + (hold ? ' <span class="sb sb--indigo"><span class="sb__dot"></span>DISPUTE HOLD</span>' : '') + '</span></div>' +
      '<div class="kv__k">Bank account</div><div class="kv__v">' + bank.bank_code + ' ' + bank.account_number + ' · ' + bank.account_holder_name + '</div>' +
      '<div class="kv__k">Cost center</div><div class="kv__v">' + (current.cost_center_id_snapshot || '<span class="cell-dim">null — default cost center not seeded (GAP-2, inherited)</span>') + '</div>' +
      '<div class="kv__k">Submitted</div><div class="kv__v">' + F.fmtDate(current.submitted_at) + '</div>' +
      (asApprover ? '<div class="kv__k">Entitlement if approved</div><div class="kv__v">' + projection(current) + '</div>' : '') +
      (current.reason_note ? '<div class="kv__k">Rejection note</div><div class="kv__v">' + current.reason_note + '</div>' : '');

    var warn = asApprover ? current.similarity_warnings : [];   // FD-83 k5 — never shown to the employee
    $('cdWarn').style.display = warn.length ? '' : 'none';
    if (warn.length) {
      $('cdWarnTxt').innerHTML = '<strong>Similarity warning.</strong> ' + warn.map(function (w) {
        return 'A receipt dated ' + F.fmtDate(w.matched_date) + ' for ' + D.rp(w.matched_amount) + ' resembles an existing ' + w.matched_module + ' entry.';
      }).join(' ') + ' Acknowledgement is required before rejecting.';
    }
    $('cdHold').style.display = hold ? '' : 'none';
    $('cdItems').innerHTML = current.items.map(function (it) {
      var who = it.beneficiary_kind === 'SELF' ? 'Self' : benName(it.beneficiary_id) + ' · ' + it.beneficiary_relationship_snapshot;
      var att = current.contains_health_data_snapshot
        ? '<button class="rowbtn" disabled title="Locked — HR Manager / Health Data Officer / Super Admin only (§18.3)">Locked</button>'
        : '<button class="rowbtn" data-doc="' + it.document_id + '">Open</button>';
      return '<tr><td>' + F.fmtDate(it.expense_date) + '</td><td>' + who + '</td>' +
        '<td><span class="cell-mono">' + (it.receipt_no || '—') + '</span></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(it.amount) + '</span></td>' +
        '<td class="ta-c">' + att + '</td></tr>';
    }).join('');

    $('cdFoot').innerHTML = asApprover
      ? '<button class="btn btn--secondary btn--danger-text" id="cdRejectBtn">Reject</button><button class="btn btn--primary" id="cdApproveBtn"' + (hold ? ' disabled title="Blocked by an active dispute hold"' : '') + '>Approve</button>'
      : '<button class="btn btn--secondary" data-close>Close</button>';
    icons();
    F.openModal('claimDetail');
  }

  // ---------------- BR-B4 — reject in its own modal ----------------
  // The reason used to be an inline block revealed by a first click on Reject: the button
  // meant two different things depending on state, and the fields appeared below the fold
  // of a long claim. Rejecting is a short transactional decision, so it gets its own modal
  // (project standard) — one click, one purpose, and "Back to claim" returns to the review.
  function openReject() {
    if (!current) return;
    rejecting = current;
    var e = D.emp(rejecting.employee_id);
    F.closeModal('claimDetail');
    $('crTitle').textContent = 'Reject claim ' + rejecting.request_no;
    $('crKv').innerHTML =
      '<div class="kv__k">Applicant</div><div class="kv__v">' + e.name + ' · ' + e.nik + '</div>' +
      '<div class="kv__k">Benefit type</div><div class="kv__v">' + rejecting.benefit_type_name + '</div>' +
      '<div class="kv__k">Amount claimed</div><div class="kv__v">' + D.rp(rejecting.total_amount) + ' · ' + rejecting.items.length + ' receipt' + (rejecting.items.length > 1 ? 's' : '') + '</div>';
    var warn = rejecting.similarity_warnings || [];
    $('crWarn').style.display = warn.length ? '' : 'none';
    if (warn.length) {
      $('crWarnTxt').innerHTML = '<strong>Similarity warning.</strong> ' + warn.map(function (w) {
        return 'A receipt dated ' + F.fmtDate(w.matched_date) + ' for ' + D.rp(w.matched_amount) + ' resembles an existing ' + w.matched_module + ' entry.';
      }).join(' ');
    }
    $('crAckWrap').style.display = warn.length ? 'flex' : 'none';
    $('crAck').checked = false;
    $('crNote').value = '';
    $('crReasonDd').innerHTML = D.REJECTION_REASONS.filter(function (r) { return r.is_active; })
      .map(function (r) { return '<div class="dropdown__opt" data-val="' + r.id + '" data-free="' + (r.requires_free_text ? '1' : '') + '">' + r.name + '</div>'; }).join('');
    var rv = $('crReason').querySelector('.ctl__value'); rv.textContent = 'Select reason'; rv.style.color = 'var(--fg-4)';
    crReason = null;
    crCheck();
    F.wireSelects($('claimReject'));
    D.bindOpts($('crReason'));
    icons();
    F.openModal('claimReject');
  }
  var crReason = null;
  function crCheck() {
    var free = !!(crReason && crReason.requires_free_text);
    $('crNoteLbl').innerHTML = free
      ? 'Note <span class="req">*</span>'
      : 'Note <span style="font-weight:500;color:var(--fg-4)">(optional)</span>';
    var ok = !!crReason &&
      (!free || $('crNote').value.trim().length > 0) &&
      ($('crAckWrap').style.display === 'none' || $('crAck').checked);
    $('crConfirm').disabled = !ok;
  }

  // ---------------- BR-C3 / BR-D3 — benefit type form ----------------
  function openTypeForm(id) {
    editingType = id ? types.filter(function (t) { return t.id === id; })[0] : null;
    $('tfTitle').textContent = editingType ? 'Edit benefit type' : 'New benefit type';
    $('tfName').value = editingType ? editingType.name : '';
    $('tfReceipt').classList.toggle('is-on', editingType ? editingType.requires_receipt : true);
    $('tfFamily').classList.toggle('is-on', editingType ? editingType.allows_family_claim : false);
    $('tfHealth').classList.toggle('is-on', editingType ? editingType.contains_health_data : false);
    $('tfActive').classList.toggle('is-on', editingType ? editingType.is_active : true);
    $('tfActiveWrap').style.display = editingType ? '' : 'none';
    $('tfReasonWrap').style.display = 'none';
    $('tfReason').value = '';
    tfCheck();
    F.openModal('typeForm');
  }
  function tfHealthChanged() {
    return !!editingType && editingType.contains_health_data !== $('tfHealth').classList.contains('is-on');
  }
  function tfCheck() {
    var changed = tfHealthChanged();
    $('tfReasonWrap').style.display = changed ? '' : 'none';
    $('tfHealthChg').style.display = changed ? '' : 'none';
    if (changed) $('tfHealthChg').textContent = 'CHANGED: ' + (editingType.contains_health_data ? 'Yes → No' : 'No → Yes');
    $('tfSave').disabled = !($('tfName').value.trim().length >= 2 && (!changed || $('tfReason').value.trim().length > 0));
  }

  // ---------------- BR-A6 — beneficiaries of the signed-in employee ----------------
  function renderBens() {
    $('cntBens').textContent = bens.length;
    $('benBody').innerHTML = bens.length ? bens.map(function (b) {
      // ROLE_EMPLOYEE† may only PATCH is_active=false (UIC §3.3). Flipping it back is a
      // "koreksi" reserved for ROLE_FINANCE_OFFICER / ROLE_SUPER_ADMIN, and the unique key
      // (employee_id, period_id, relative_id) forbids a second row for the same relative —
      // so an inactive row has no employee-side action at all.
      var act = b.is_active
        ? '<button class="rowbtn rowbtn--danger" data-benoff="' + b.id + '">Deactivate</button>'
        : '<button class="rowbtn" disabled title="Re-activation is a finance-officer correction — not available to your role">Deactivate</button>';
      return '<tr><td class="cell-strong">' + b.name + '</td>' +
        '<td>' + b.relationship_type + '</td>' +
        '<td>' + (b.slot_consumed ? '<span class="sb sb--amber"><span class="sb__dot"></span>CONSUMED</span>' : '<span class="cell-dim">Not yet</span>') + '</td>' +
        '<td>' + D.sb(b.is_active ? 'ACTIVE' : 'INACTIVE') + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + act + '</span></td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="tempty">No beneficiary registered for this period.</div></td></tr>';
  }
  // Relatives from employee_profile.mst_relative. A relative that already holds a row in
  // this period — active or not — is not offered: uq_emp_benefit_beneficiary_employee_id_
  // period_id_relative_id makes a second row impossible.
  function openBenForm() {
    bfPick = null; $('bfSave').disabled = true;
    var taken = bens.map(function (b) { return b.relative_id; });
    var offer = RELATIVES.filter(function (r) { return taken.indexOf(r.id) < 0; });
    $('bfRelDd').innerHTML = offer.length
      ? offer.map(function (r) { return '<div class="dropdown__opt" data-val="' + r.id + '|' + r.relationship_type + '">' + r.name + ' — ' + tc(r.relationship_type) + '</div>'; }).join('')
      : '<div class="dropdown__empty">Every registered relative already has a row in this period.</div>';
    var v = $('bfRel').querySelector('.ctl__value');
    v.textContent = 'Select relative'; v.style.color = 'var(--fg-4)';
    F.wireSelects($('benForm'));
    D.bindOpts($('bfRel'));
    F.openModal('benForm');
  }

  // ---------------- BR-A4 — claim form ----------------
  function balanceOf(typeId) {
    return D.PERIODS[0].balances.filter(function (b) { return b.benefit_type_id === typeId; })[0] || null;
  }
  function itemHtml(it, i) {
    var t = cfType || {}, fam = t.allows_family_claim;
    return '<div class="item" data-i="' + i + '">' +
      '<div class="item__head"><span class="item__n">Receipt ' + (i + 1) + '</span>' +
      (i > 0 ? '<button type="button" class="item__del" data-rm="' + i + '" aria-label="Remove receipt"><i data-lucide="trash-2"></i></button>' : '') + '</div>' +
      '<div class="item__grid">' +
        '<div class="fld"><label class="fld__label">Expense date <span class="req">*</span></label>' +
          '<div class="ctl ctl--date"><input type="text" data-f="date" data-i="' + i + '" placeholder="DD MMM YYYY">' +
          '<svg class="ctl__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div></div>' +
        '<div class="fld"><label class="fld__label">Amount <span class="req">*</span></label>' +
          '<div class="pp-money"><span class="pp-money__cur">RP</span><input type="text" data-f="amount" data-i="' + i + '" placeholder="0" inputmode="numeric" value="' + (it.amount ? D.thousands(String(it.amount)) : '') + '"></div></div>' +
      '</div>' +
      '<div class="fld"><label class="fld__label">Claimed for <span class="req">*</span></label>' +
        '<div class="radio-row">' +
          '<label class="radio"><input type="radio" name="cfben' + i + '" data-f="kind" data-i="' + i + '" value="SELF"' + (it.kind === 'SELF' ? ' checked' : '') + '><span class="radio__dot"></span>Myself</label>' +
          '<label class="radio"><input type="radio" name="cfben' + i + '" data-f="kind" data-i="' + i + '" value="FAMILY_MEMBER"' + (it.kind === 'FAMILY_MEMBER' ? ' checked' : '') + (fam ? '' : ' disabled') + '><span class="radio__dot"></span>Family member</label>' +
        '</div>' +
        (fam ? '' : '<span class="fld__hint">This benefit type does not allow family claims.</span>') + '</div>' +
      '<div class="item__sub" data-famwrap="' + i + '" style="' + (it.kind === 'FAMILY_MEMBER' ? '' : 'display:none') + '">' +
        '<div class="fld"><label class="fld__label">Family member <span class="req">*</span></label>' +
          '<div class="ctl ctl--select" data-fam="' + i + '"><span class="ctl__value" style="color:var(--fg-4)">Select beneficiary</span>' +
          '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
          '<div class="dropdown">' + bens.filter(function (b) { return b.is_active; }).map(function (b) { return '<div class="dropdown__opt" data-val="' + b.id + '">' + b.name + ' — ' + b.relationship_type + '</div>'; }).join('') + '</div></div>' +
          '<span class="fld__hint">From your beneficiary list — add one in the Beneficiaries tab first.</span></div>' +
      '</div>' +
      (t.requires_receipt ? '<div class="item__grid">' +
        '<div class="fld"><label class="fld__label">Receipt no. <span class="req">*</span></label>' +
          '<div class="ctl"><input type="text" data-f="receipt" data-i="' + i + '" maxlength="60" placeholder="RS-MELATI/2026/07/0231" value="' + (it.receipt || '') + '"></div></div>' +
        '<div class="fld"><label class="fld__label">Attachment <span class="req">*</span></label>' +
          '<label class="file-ctl"><span class="file-ctl__btn">Choose File</span><span class="file-ctl__name" data-fn="' + i + '">' + (it.doc || 'No file selected') + '</span><input type="file" hidden data-f="doc" data-i="' + i + '"></label></div>' +
      '</div>' : '<span class="fld__hint">This benefit type requires no receipt evidence.</span>') +
      (t.contains_health_data ? '<div class="note note--warn" style="margin-top:12px"><i data-lucide="shield-alert"></i><span><strong>Health data — access is restricted once the claim is stored.</strong> This attachment can only be opened by HR Manager / Health Data Officer / Super Admin, and every open is written to the medical access log.</span></div>' : '') +
    '</div>';
  }
  function renderItems() {
    $('cfItems').innerHTML = cfItems.map(itemHtml).join('');
    F.wireSelects($('cfItems')); F.setupDates($('cfItems'));
    icons(); cfTotal();
  }
  function cfTotal() {
    var sum = cfItems.reduce(function (a, i) { return a + (i.amount || 0); }, 0);
    $('cfTotal').textContent = D.rp(sum);
    $('cfCount').textContent = cfItems.length + ' receipt' + (cfItems.length > 1 ? 's' : '');
    $('cfSubmit').disabled = !(!!cfType && cfItems.length > 0 && cfItems.every(function (i) {
      if (!i.date || !i.amount) return false;
      if (i.kind === 'FAMILY_MEMBER' && !i.beneficiary) return false;
      if (cfType.requires_receipt && (!i.receipt || !i.doc)) return false;
      return true;
    }));
  }
  function openClaimForm() {
    cfType = null; cfItems = [{ kind: 'SELF' }];
    var v = $('cfType').querySelector('.ctl__value'); v.textContent = 'Select benefit type'; v.style.color = 'var(--fg-4)';
    $('cfTypeDd').innerHTML = types.filter(function (t) { return t.is_active; })
      .map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.name + '</div>'; }).join('');
    $('cfBalance').style.display = 'none';
    renderItems();
    F.wireSelects($('claimForm'));
    D.bindOpts($('cfType'));
    F.openModal('claimForm');
  }

  // ---------------- breadcrumb follows the active tab ----------------
  var TAB_LABEL = { all: 'All Request', balance: 'Balance Overview', ledger: 'Transaction History', disbursement: 'Disbursement History', bens: 'Beneficiaries', settings: 'Settings' };
  var SUB_LABEL = { types: 'Benefit Type', ent: 'Entitlement per Grade', rel: 'Family Relationship Whitelist' };
  function crumb() {
    var tab = (document.querySelector('.tabnav__tab.is-on') || {}).getAttribute ? document.querySelector('.tabnav__tab.is-on').getAttribute('data-tab') : 'all';
    var txt = 'Benefit Reimbursement › ' + (TAB_LABEL[tab] || '');
    if (tab === 'settings') {
      var p = document.querySelector('#setTabs [data-sub].is-on');
      if (p) txt += ' › ' + SUB_LABEL[p.getAttribute('data-sub')];
    }
    $('crumbNow').textContent = txt;
  }

  // ---------------- wiring ----------------
  document.addEventListener('DOMContentLoaded', function () {
    pgAll = F.pager('pgAll', 10, function () { renderClaims(); icons(); }, 'claims');
    pgLedger = F.pager('pgLedger', 10, function () { renderLedger(); icons(); }, 'entries');
    pgDisb = F.pager('pgDisb', 10, function () { renderDisb(); icons(); }, 'payables');

    $('fltTypeDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All benefit types</div>' +
      types.map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.name + '</div>'; }).join('');
    F.wireSelects(document);
    D.bindOpts('fltType');
    renderClaims(); renderBalance(); renderLedger(); renderDisb(); renderBens(); renderTypes(); renderEnt(); renderRels(); crumb(); icons();

    // deep-link: #balance / #ledger / #disbursement / #settings
    var h = (location.hash || '').replace('#', '');
    if (h === 'new') { openClaimForm(); }
    else if (h) { var t = document.querySelector('.tabnav__tab[data-tab="' + h + '"]'); if (t) t.click(); }

    $('brTabs').addEventListener('tabchange', crumb);
    $('balanceWrap').addEventListener('click', function (e) {
      var b = e.target.closest('[data-per]');
      if (!b) return;
      balPeriod = +b.getAttribute('data-per');
      renderBalance(); icons();
    });
    $('setTabs').addEventListener('subchange', function (e) {
      $('newTypeBtn').style.display = e.detail.value === 'types' ? '' : 'none';
      crumb();
    });

    // ---- filters
    $('fltQ').addEventListener('input', function () { flt.q = this.value.trim(); pgAll.reset(); renderClaims(); icons(); });
    $('fltStatus').addEventListener('select', function (e) { flt.status = /^[A-Z_]+$/.test(e.detail.value) ? e.detail.value : ''; pgAll.reset(); renderClaims(); icons(); });
    $('fltType').addEventListener('select', function (e) { flt.type = /^bt-/.test(e.detail.value) ? e.detail.value : ''; pgAll.reset(); renderClaims(); icons(); });
    $('fltReset').addEventListener('click', function () {
      flt = { q: '', status: '', type: '' };
      $('fltQ').value = '';
      ['fltStatus', 'fltType'].forEach(function (id) { var v = $(id).querySelector('.ctl__value'); v.textContent = id === 'fltStatus' ? 'All status' : 'All benefit types'; });
      F.setDate($('fltFrom'), null); F.setDate($('fltTo'), null);
      pgAll.reset(); renderClaims(); icons();
    });
    $('expBtn').addEventListener('click', function () {
      F.toast('Export queued — every download is written to the finance export log with its filter criteria and row count.', 'info');
    });

    // ---- grid row actions: View Detail (any row) · Review (SUBMITTED only)
    $('claimBody').addEventListener('click', function (e) {
      var r = e.target.closest('[data-review]'), v = e.target.closest('[data-view]'), x = e.target.closest('[data-cancel]');
      if (r) return openClaim(r.getAttribute('data-review'), true);
      if (x) {
        cancelling = claims.filter(function (c) { return c.id === x.getAttribute('data-cancel'); })[0];
        $('ccKv').innerHTML = '<div class="kv__k">Request no.</div><div class="kv__v">' + cancelling.request_no + '</div>' +
          '<div class="kv__k">Amount</div><div class="kv__v">' + D.rp(cancelling.total_amount) + '</div>' +
          '<div class="kv__k">Status</div><div class="kv__v">' + cancelling.status + '</div>';
        return F.openModal('claimCancel');
      }
      if (v) return openClaim(v.getAttribute('data-view'), false);
    });
    $('ccConfirm').addEventListener('click', function () {
      if (!cancelling) return;
      cancelling.status = 'CANCELLED'; cancelling.reservation_state = 'RELEASED';
      F.closeModal('claimCancel'); renderClaims(); icons();
      F.toast('200 OK — ' + cancelling.request_no + ' cancelled. The row is kept; the reservation is released.', 'ok');
      cancelling = null;
    });

    // ---- BR-A3 "+ New Claim" -> BR-A4 form -> BR-A5 toast
    $('newClaimBtn').addEventListener('click', openClaimForm);
    $('cfType').addEventListener('select', function (e) {
      cfType = types.filter(function (t) { return t.id === e.detail.value; })[0] || null;
      var b = cfType ? balanceOf(cfType.id) : null;
      $('cfBalance').style.display = b ? '' : 'none';
      if (b) {
        $('cfEnt').textContent = D.rp(b.entitled_amount);
        $('cfUsed').textContent = D.rp(b.used_amount);
        $('cfRes').textContent = D.rp(b.reserved_amount);
        $('cfLeft').textContent = D.rp(b.entitled_amount - b.used_amount - b.reserved_amount);
      }
      cfItems = cfItems.map(function (i) { return cfType && cfType.allows_family_claim ? i : { kind: 'SELF', date: i.date, amount: i.amount, receipt: i.receipt, doc: i.doc }; });
      renderItems();
    });
    $('cfAddItem').addEventListener('click', function () { cfItems.push({ kind: 'SELF' }); renderItems(); });
    $('cfItems').addEventListener('click', function (e) {
      var rm = e.target.closest('[data-rm]');
      if (rm) { cfItems.splice(+rm.getAttribute('data-rm'), 1); renderItems(); }
    });
    $('cfItems').addEventListener('input', function (e) {
      var el = e.target, i = +el.getAttribute('data-i'), f = el.getAttribute('data-f');
      if (f === 'amount') { el.value = D.thousands(el.value); cfItems[i].amount = D.parseRp(el.value); }
      if (f === 'receipt') cfItems[i].receipt = el.value;
      cfTotal();
    });
    $('cfItems').addEventListener('change', function (e) {
      var el = e.target;
      if (el.getAttribute('data-f') === 'kind' && el.checked) {
        var k = +el.getAttribute('data-i');
        cfItems[k].kind = el.value;
        var w = $('cfItems').querySelector('[data-famwrap="' + k + '"]');
        if (w) w.style.display = el.value === 'FAMILY_MEMBER' ? '' : 'none';
        if (el.value === 'SELF') cfItems[k].beneficiary = null;
        cfTotal();
        return;
      }
      if (el.getAttribute('data-f') === 'doc') {
        var i = +el.getAttribute('data-i');
        cfItems[i].doc = (el.files && el.files[0]) ? el.files[0].name : '';
        $('cfItems').querySelector('[data-fn="' + i + '"]').textContent = cfItems[i].doc || 'No file selected';
        cfTotal();
      }
    });
    $('cfItems').addEventListener('select', function (e) {
      var ctl = e.target.closest('[data-fam]');
      if (ctl) { cfItems[+ctl.getAttribute('data-fam')].beneficiary = e.detail.value; cfTotal(); }
    });
    $('cfItems').addEventListener('datechange', function (e) {
      var i = +e.target.getAttribute('data-i');
      cfItems[i].date = e.detail.iso; cfTotal();
    });
    $('cfItems').addEventListener('segchange', function (e) {
      var i = +e.target.getAttribute('data-i');
      cfItems[i].kind = e.detail.value;
      var wrap = $('cfItems').querySelector('[data-famwrap="' + i + '"]');
      if (wrap) wrap.style.display = e.detail.value === 'FAMILY_MEMBER' ? '' : 'none';
      if (e.detail.value === 'SELF') cfItems[i].beneficiary = null;
      cfTotal();
    });
    $('cfSubmit').addEventListener('click', function () {
      var total = cfItems.reduce(function (a, i) { return a + i.amount; }, 0);
      var no = 'CLM-2026-0000' + (47 + claims.filter(function (c) { return /^CLM-2026/.test(c.request_no); }).length - 5);
      claims.unshift({
        id: 'clm-' + Date.now(), request_no: no, employee_id: ME, benefit_type_id: cfType.id, benefit_type_name: cfType.name,
        period_id: 'bp-2026', total_amount: total, status: 'SUBMITTED', reservation_state: 'HELD',
        contains_health_data_snapshot: cfType.contains_health_data, submitted_at: new Date().toISOString().slice(0, 10),
        decided_at: null, decided_by: null,
        bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null,
        items: cfItems.map(function (i, n) {
          return { id: 'ci-new-' + n, expense_date: i.date, amount: i.amount, beneficiary_kind: i.kind, beneficiary_id: i.beneficiary || null,
            beneficiary_relationship_snapshot: i.beneficiary ? (bens.filter(function (b) { return b.id === i.beneficiary; })[0] || {}).relationship_type : null,
            receipt_no: i.receipt || '', document_id: i.doc || '' };
        }),
        similarity_warnings: []
      });
      F.closeModal('claimForm'); pgAll.reset(); renderClaims(); icons();
      F.toast('201 Created — ' + no + ' submitted, ' + D.rp(total) + ' reserved against your entitlement.', 'ok');
    });

    // ---- BR-A6 beneficiaries
    $('addBenBtn').addEventListener('click', function () { openBenForm(); });
    $('bfRel').addEventListener('select', function (e) { bfPick = e.detail; $('bfSave').disabled = false; });
    $('bfSave').addEventListener('click', function () {
      var parts = (bfPick.value || '').split('|'), name = bfPick.opt.textContent.split(' — ')[0];
      var rel = D.FAMILY_RELS.filter(function (r) { return r.relationship_type === parts[1]; })[0];
      if (!rel || !rel.is_eligible) { F.toast('422 — ' + parts[1] + ' is not on the company family-relationship whitelist.', 'danger'); return; }
      bens.push({ id: 'ben-' + Date.now(), relative_id: parts[0], name: name, relationship_type: parts[1], is_active: true, slot_consumed: false });
      F.closeModal('benForm'); renderBens(); icons();
      F.toast('201 Created — ' + name + ' added as beneficiary.', 'ok');
    });
    $('benBody').addEventListener('click', function (e) {
      var off = e.target.closest('[data-benoff]');
      if (!off) return;
      var b = bens.filter(function (x) { return x.id === off.getAttribute('data-benoff'); })[0];
      var used = claims.some(function (c) { return c.status === 'SUBMITTED' && c.items.some(function (i) { return i.beneficiary_id === b.id; }); });
      if (used) { F.toast('422 — this beneficiary is still referenced by a claim awaiting a decision.', 'danger'); return; }
      b.is_active = false; renderBens(); icons();
      F.toast('200 OK — beneficiary deactivated (PATCH is_active=false, written to log_benefit_beneficiary_history). Rows are never hard-deleted, and your role cannot set it back to true.', 'ok');
    });

    // ---- decision footer (re-rendered per claim, so delegate)
    $('cdFoot').addEventListener('click', function (e) {
      if (e.target.closest('#cdApproveBtn')) {
        F.closeModal('claimDetail');
        F.toast('202 Accepted — decision forwarded to the approval process. The status is written when the workflow completion event is consumed.', 'info');
      }
      if (e.target.closest('#cdRejectBtn')) openReject();
    });

    // ---- BR-B4 reject modal
    $('crReason').addEventListener('select', function (e) {
      crReason = D.REJECTION_REASONS.filter(function (r) { return r.id === e.detail.value; })[0] || null;
      crCheck();
    });
    $('crNote').addEventListener('input', crCheck);
    $('crAck').addEventListener('change', crCheck);
    $('crBack').addEventListener('click', function () {
      F.closeModal('claimReject');
      if (rejecting) openClaim(rejecting.id, true);
    });
    $('crConfirm').addEventListener('click', function () {
      if (!rejecting || !crReason) return;
      F.closeModal('claimReject');
      F.toast('202 Accepted — ' + rejecting.request_no + ' rejected for “' + crReason.name + '”. The decision is forwarded to the approval process and the reservation is released when it completes.', 'info');
      rejecting = null;
    });
    $('claimDetail').addEventListener('click', function (e) {
      if (e.target.closest('[data-doc]')) F.toast('Attachment opened through document-service. This claim carries no health data, so no medical access log row is written.', 'info');
    });

    // ---- benefit type form
    $('newTypeBtn').addEventListener('click', function () { openTypeForm(null); });
    $('typeBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-etype]');
      if (t) openTypeForm(t.getAttribute('data-etype'));
    });
    ['tfReceipt', 'tfFamily', 'tfHealth', 'tfActive'].forEach(function (id) {
      $(id).addEventListener('click', function () { this.classList.toggle('is-on'); tfCheck(); });
    });
    $('tfName').addEventListener('input', tfCheck);
    $('tfReason').addEventListener('input', tfCheck);
    $('tfSave').addEventListener('click', function () {
      var payload = {
        name: $('tfName').value.trim(),
        requires_receipt: $('tfReceipt').classList.contains('is-on'),
        allows_family_claim: $('tfFamily').classList.contains('is-on'),
        contains_health_data: $('tfHealth').classList.contains('is-on'),
        is_active: editingType ? $('tfActive').classList.contains('is-on') : true
      };
      if (editingType) {
        var changed = tfHealthChanged();
        Object.keys(payload).forEach(function (k) { editingType[k] = payload[k]; });
        F.closeModal('typeForm'); renderTypes(); icons();
        F.toast('200 OK — ' + payload.name + ' updated' + (changed ? ' · the health-data change is recorded with its reason.' : '.'), 'ok');
      } else {
        payload.id = 'bt-' + Date.now();
        types.push(payload);
        F.closeModal('typeForm'); renderTypes(); icons();
        F.toast('201 Created — benefit type ' + payload.name + ' added.', 'ok');
      }
    });
  });
})();
