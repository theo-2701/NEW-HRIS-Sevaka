// SEVAKA HRIS — Cash Advance (FT4 · CA-A2/A3/A4 · CA-B2/B3/B4 · CA-S1)
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN;
  var advances = D.ADVANCES.slice(), stls = D.SETTLEMENTS.slice(), difs = D.DIFFERENCES.slice();
  var ME = 'emp-budi';
  var flt = { status: '', purpose: '', no: '' };
  var afPurpose = null, afBehalf = false, afRecipient = null;
  var reviewing = null, deciding = null, methodRow = null, smPick = null, detailing = null, cancelling = null;
  var ssAdv = null, ssRows = [], ssFinal = true, ssSeq = 0;
  var flags = {};

  var pgAdv, pgStl, pgDif;
  var $ = function (id) { return document.getElementById(id); };
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  // Re-bind options injected after the initial wireSelects() (which early-returns on a
  // wired ctl). Never clear dataset.wired — that double-binds the ctl-level toggle.
  function bindOpts(ctl) { return D.bindOpts(ctl); }
  function selectable(p) { return p.is_active && !(p.max_amount === null && !p.is_unlimited_ack); }
  function itemsTotal(s) { return s.items.reduce(function (a, i) { return a + i.amount; }, 0); }
  function itemSb(i) {
    var st = i.flagged_reason_id ? 'REJECTED' : (i.status || 'PENDING');
    var cls = st === 'REJECTED' ? 'sb--red' : st === 'ACCEPTED' ? 'sb--green' : 'sb--grey';
    return '<span class="sb ' + cls + '"><span class="sb__dot"></span>' + st + '</span>';
  }
  function stlOf(advId) { return stls.filter(function (x) { return x.cash_advance_id === advId; })[0]; }

  // ---------------- CA-A2 ----------------
  function renderAdv() {
    var all = advances.filter(function (a) {
      if (flt.status && a.status !== flt.status) return false;
      if (flt.purpose && a.purpose_type_id !== flt.purpose) return false;
      if (flt.no && a.request_no.toLowerCase().indexOf(flt.no.toLowerCase()) < 0) return false;
      return true;
    });
    $('cntAdv').textContent = advances.length;
    var rows = pgAdv.slice(all);
    $('advBody').innerHTML = rows.length ? rows.map(function (a) {
      var e = D.emp(a.recipient_employee_id);
      var acts = [{ label: 'View Detail', icon: 'eye', attr: 'data-detail="' + a.id + '"' }];
      if (a.status === 'SUBMITTED') acts.push({ label: 'Cancel request', icon: 'x-circle', attr: 'data-cancel="' + a.id + '"', danger: true });
      if (a.status === 'SUBMITTED' && a.created_on_behalf_employee_id && a.recipient_employee_id === ME) acts.push({ label: 'Repudiate', icon: 'user-x', attr: 'data-repudiate="' + a.id + '"', danger: true });
      if (a.status === 'APPROVED' && !stlOf(a.id)) acts.push({ label: 'Submit settlement', icon: 'receipt', attr: 'data-settle="' + a.id + '"' });
      if (a.status === 'APPROVED' && a.is_official_travel_snapshot) acts.push({ label: 'Cancel travel', icon: 'plane', attr: 'data-travelcancel="' + a.id + '"' });
      var actHtml = acts.length >= 2 ? F.rowMenu(acts)
        : '<span class="rowacts">' + acts.map(function (x) {
            return '<button class="rowbtn' + (x.danger ? ' rowbtn--danger' : '') + '" ' + x.attr + '>' + x.label + '</button>';
          }).join('') + '</span>';
      var travel = a.travel_start_date ? F.fmtDate(a.travel_start_date) + ' – ' + F.fmtDate(a.travel_end_date) : '<span class="cell-dim">—</span>';
      return '<tr><td><button class="idlink" data-detail="' + a.id + '">' + a.request_no + '</button>' +
          (a.created_on_behalf_employee_id ? '<div class="person__sub">on behalf · created by ' + D.emp(a.created_on_behalf_employee_id).name + '</div>' : '') + '</td>' +
        '<td><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.unit + '</span></div></td>' +
        '<td>' + a.purpose_type_name + (a.is_official_travel_snapshot ? ' <span class="sb sb--blue"><span class="sb__dot"></span>OFFICIAL TRAVEL</span>' : '') + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(a.amount) + '</span><div class="person__sub">max ' + D.rp(a.max_amount_snapshot) + '</div></td>' +
        '<td>' + travel + '</td><td>' + D.sb(a.status) + '</td><td>' + F.fmtDate(a.created_at) + '</td>' +
        '<td class="ta-r">' + actHtml + '</td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tempty">No cash advance matches the current filter.</div></td></tr>';
    pgAdv.paint();
  }

  // ---------------- CA-B2 list ----------------
  function renderStl() {
    $('cntStl').textContent = stls.length;
    var srows = pgStl.slice(stls);
    $('stlBody').innerHTML = srows.length ? srows.map(function (s) {
      var e = D.emp(s.recipient_employee_id), total = itemsTotal(s);
      var act;
      if (s.status === 'SUBMITTED') act = '<button class="rowbtn" data-review="' + s.id + '">Review</button>';
      else if (s.status === 'UNDER_REVIEW') act = '<button class="rowbtn" data-decide="' + s.id + '">Decide</button>';
      else act = '<button class="rowbtn" data-decide="' + s.id + '">View Detail</button>';
      return '<tr><td><button class="idlink" data-open="' + s.id + '">' + s.request_no + '</button></td>' +
        '<td><div class="person__meta"><span class="person__name">' + e.name + '</span><span class="person__sub">' + e.unit + '</span></div></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(s.advance_amount) + '</span></td>' +
        '<td class="ta-r"><span class="money money--dim">' + D.rp(total) + '</span></td>' +
        '<td class="ta-c">' + (s.is_final_stage ? '<span class="sb sb--indigo"><span class="sb__dot"></span>CLOSING</span>' : '<span class="sb sb--grey"><span class="sb__dot"></span>PARTIAL</span>') + '</td>' +
        '<td>' + D.sb(s.status) + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + act + '</span></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">No settlement submitted yet.</div></td></tr>';
    pgStl.paint();
  }

  // ---------------- CA-S1 ----------------
  function renderDif() {
    $('cntDif').textContent = difs.length;
    var drows = pgDif.slice(difs);
    $('difBody').innerHTML = drows.length ? drows.map(function (d) {
      var e = D.emp(d.employee_id);
      var acts = '';
      if (d.difference_type === 'SURPLUS' && d.status !== 'SETTLED') acts = '<button class="rowbtn" data-method="' + d.id + '">Set return method</button>';
      else if (d.difference_type === 'SHORTFALL' && d.status === 'AWAITING_APPROVAL') acts = '<button class="rowbtn" data-extra="' + d.id + '">Approve extra layer</button>';
      return '<tr><td><span class="cell-strong">' + d.request_no + '</span></td>' +
        '<td>' + e.name + '</td><td>' + D.sb(d.difference_type) + '</td>' +
        '<td class="ta-r"><span class="money ' + (d.difference_type === 'SHORTFALL' ? 'money--neg' : 'money--pos') + '">' + D.rp(d.amount) + '</span></td>' +
        '<td>' + (d.settlement_method ? '<span class="cell-dim">' + d.settlement_method + '</span>' : '<span class="cell-dim">— not set</span>') + '</td>' +
        '<td>' + (d.due_date ? F.fmtDate(d.due_date) : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + D.sb(d.status) + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + acts + '</span></td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tempty">No difference recorded.</div></td></tr>';
    pgDif.paint();
  }

  // ---------------- CA-A3 ----------------
  function afCheck() {
    var amount = D.parseRp($('afAmount').value);
    var ok = !!afPurpose && amount > 0;
    if (afBehalf && !afRecipient) ok = false;
    if (afPurpose && afPurpose.is_official_travel && (!$('afStart').dataset.iso || !$('afEnd').dataset.iso)) ok = false;
    $('afSubmit').disabled = !ok;
  }
  function openAdvForm() {
    afPurpose = null; afBehalf = false; afRecipient = null;
    $('afBehalf').classList.remove('is-on');
    $('afRecipientWrap').style.display = 'none';
    $('afTravelWrap').style.display = 'none';
    $('afAmount').value = '';
    $('afMax').value = '—';
    $('afMaxHint').innerHTML = '&nbsp;';
    var pv = $('afPurpose').querySelector('.ctl__value'); pv.textContent = 'Select purpose'; pv.style.color = 'var(--fg-4)';
    var rv = $('afRecipient').querySelector('.ctl__value'); rv.textContent = 'Select employee'; rv.style.color = 'var(--fg-4)';
    F.setDate($('afStart'), null); F.setDate($('afEnd'), null);
    $('afSubmit').disabled = true;
    F.openModal('advForm');
  }

  // ---------------- CA-B0 — submit settlement (added frame) ----------------
  function ssRowHtml(r) {
    return '<div class="stl-row" data-row="' + r.key + '">' +
      '<div class="ctl ctl--date"><input type="text" data-f="date" placeholder="DD MMM YYYY">' +
        '<svg class="ctl__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>' +
      '<div class="ctl"><input type="text" data-f="no" placeholder="Receipt number" value="' + (r.receipt_no || '') + '"></div>' +
      '<div class="pp-money"><span class="pp-money__cur">RP</span><input type="text" data-f="amt" inputmode="numeric" placeholder="0" value="' + (r.amount ? D.thousands(String(r.amount)) : '') + '"></div>' +
      '<button type="button" class="stl-file' + (r.document_id ? ' is-set' : '') + '" data-f="doc"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12"/></svg>' +
        (r.document_id ? r.file_name : 'Choose file') + '</button>' +
      '<button type="button" class="pc-delrow" data-delrow="' + r.key + '" aria-label="Remove receipt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
      '</div>';
  }
  function ssPaint() {
    $('ssRows').innerHTML = ssRows.map(ssRowHtml).join('');
    ssRows.forEach(function (r) {
      var el = $('ssRows').querySelector('[data-row="' + r.key + '"] [data-f="date"]');
      if (r.expense_date) F.setDate(el, r.expense_date); else F.setDate(el, null);
    });
    F.setupDates($('ssRows'));
    ssSum();
    icons();
  }
  function ssSum() {
    var total = ssRows.reduce(function (a, r) { return a + (r.amount || 0); }, 0);
    var diff = total - (ssAdv ? ssAdv.amount : 0);
    $('ssSum').innerHTML = '<div class="sumbox__head"><i data-lucide="scale"></i>Projection</div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Advance received</span><span class="sumbox__v">' + D.rp(ssAdv ? ssAdv.amount : 0) + '</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Receipts entered</span><span class="sumbox__v">' + D.rp(total) + ' · ' + ssRows.length + ' item(s)</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Projected difference</span><span class="sumbox__v">' +
        (!ssFinal ? 'Not computed — partial stage' : diff === 0 ? 'None' : (diff < 0 ? 'SHORTFALL ' : 'SURPLUS ') + D.rp(Math.abs(diff))) + '</span></div>';
    var ok = ssRows.length > 0 && ssRows.every(function (r) { return r.expense_date && r.amount > 0 && r.document_id; });
    $('ssSubmit').disabled = !ok;
  }
  function ssAddRow() { ssRows.push({ key: 'r' + (++ssSeq), expense_date: null, receipt_no: '', amount: 0, document_id: null, file_name: '' }); ssPaint(); }
  function openSubmitStl(id) {
    ssAdv = advances.filter(function (a) { return a.id === id; })[0];
    if (!ssAdv) return;
    var e = D.emp(ssAdv.recipient_employee_id);
    ssRows = []; ssSeq = 0; ssFinal = true;
    $('ssFinal').classList.add('is-on');
    $('ssTitle').textContent = 'Submit settlement — ' + ssAdv.request_no;
    $('ssKv').innerHTML =
      '<div class="kv__k">Recipient</div><div class="kv__v">' + e.name + ' · ' + e.unit + '</div>' +
      '<div class="kv__k">Purpose</div><div class="kv__v">' + ssAdv.purpose_type_name + '</div>' +
      '<div class="kv__k">Advance amount</div><div class="kv__v">' + D.rp(ssAdv.amount) + '</div>' +
      '<div class="kv__k">Travel dates</div><div class="kv__v">' + (ssAdv.travel_start_date ? F.fmtDate(ssAdv.travel_start_date) + ' – ' + F.fmtDate(ssAdv.travel_end_date) : 'Not applicable') + '</div>';
    ssAddRow();
    F.openModal('submitStlModal');
  }

  // ---------------- CA-A4 detail ----------------
  function openDetail(id) {
    detailing = advances.filter(function (a) { return a.id === id; })[0];
    if (!detailing) return;
    var a = detailing, e = D.emp(a.recipient_employee_id), b = a.bank_account_snapshot || {};
    var s = stlOf(a.id);
    $('dtTitle').textContent = a.request_no;
    $('dtKv').innerHTML =
      '<div class="kv__k">Status</div><div class="kv__v">' + D.sb(a.status) + '</div>' +
      '<div class="kv__k">Recipient</div><div class="kv__v">' + e.name + ' · ' + e.unit + '</div>' +
      '<div class="kv__k">Submission door</div><div class="kv__v">' + (a.created_on_behalf_employee_id
        ? 'On behalf — created by ' + D.emp(a.created_on_behalf_employee_id).name + ' (the recipient may repudiate while not yet disbursed)'
        : 'By the employee — recipient and creator are the same person') + '</div>' +
      '<div class="kv__k">Purpose type</div><div class="kv__v">' + a.purpose_type_name + (a.is_official_travel_snapshot ? ' · official travel' : '') + '</div>' +
      '<div class="kv__k">Amount</div><div class="kv__v">' + D.rp(a.amount) + '</div>' +
      '<div class="kv__k">Maximum snapshot</div><div class="kv__v">' + (a.max_amount_snapshot === null ? 'No maximum — unlimited acknowledged' : D.rp(a.max_amount_snapshot)) + '</div>' +
      '<div class="kv__k">Travel dates</div><div class="kv__v">' + (a.travel_start_date ? F.fmtDate(a.travel_start_date) + ' – ' + F.fmtDate(a.travel_end_date) : 'Not applicable — the purpose is not official travel') + '</div>' +
      '<div class="kv__k">Bank account snapshot</div><div class="kv__v">' + (b.bank_code ? b.bank_code + ' · ' + b.account_number + ' · ' + b.account_holder_name : '—') + '</div>' +
      '<div class="kv__k">Cost center snapshot</div><div class="kv__v">' + (a.cost_center_id_snapshot || '— none recorded') + '</div>' +
      '<div class="kv__k">Created</div><div class="kv__v">' + F.fmtDate(a.created_at) + '</div>' +
      '<div class="kv__k">Settlement</div><div class="kv__v">' + (s ? s.status + ' · ' + D.rp(itemsTotal(s)) + ' in receipts across ' + s.items.length + ' item(s)' : 'No settlement submitted yet') + '</div>';
    $('dtGoSettlement').style.display = s ? '' : 'none';
    icons();
    F.openModal('detailModal');
  }

  // ---------------- CA-B2 modal ----------------
  function openReview(id) {
    reviewing = stls.filter(function (s) { return s.id === id; })[0];
    if (!reviewing) return;
    flags = {};
    var e = D.emp(reviewing.recipient_employee_id), total = itemsTotal(reviewing);
    $('rvTitle').textContent = 'Review receipts — ' + reviewing.request_no;
    $('rvKv').innerHTML =
      '<div class="kv__k">Recipient</div><div class="kv__v">' + e.name + ' · ' + e.unit + '</div>' +
      '<div class="kv__k">Advance amount</div><div class="kv__v">' + D.rp(reviewing.advance_amount) + '</div>' +
      '<div class="kv__k">Receipts total</div><div class="kv__v">' + D.rp(total) + '</div>' +
      '<div class="kv__k">Stage</div><div class="kv__v">' + (reviewing.is_final_stage ? 'Closing stage — the difference is computed on acceptance' : 'Partial stage') + '</div>';
    $('rvItems').innerHTML = reviewing.items.map(function (i) {
      return '<tr><td class="ta-c"><label class="fchk"><input type="checkbox" data-flag="' + i.id + '"><span class="fchk__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span></label></td>' +
        '<td>' + F.fmtDate(i.expense_date) + '</td>' +
        '<td><span class="cell-mono">' + (i.receipt_no || '<span class="cell-dim">no number</span>') + '</span></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(i.amount) + '</span></td>' +
        '<td>' + itemSb(i) + '</td>' +
        '<td class="ta-c"><button class="rowbtn" data-doc="' + i.document_id + '">Open</button></td></tr>';
    }).join('');
    var warn = reviewing.similarity_warnings || [];
    $('rvWarn').style.display = warn.length ? '' : 'none';
    if (warn.length) $('rvWarnTxt').innerHTML = '<strong>Similarity warning.</strong> ' + warn.map(function (w) {
      return 'A receipt on ' + F.fmtDate(w.matched_date) + ' for ' + D.rp(w.matched_amount) + ' matches another entry in date and amount with a different or missing number.';
    }).join(' ');
    $('rvAckWrap').style.display = warn.length ? 'flex' : 'none';
    $('rvAck').checked = false;
    $('rvReasonWrap').style.display = 'none';
    $('rvReasonDd').innerHTML = D.REJECTION_REASONS.filter(function (r) { return r.is_active; })
      .map(function (r) { return '<div class="dropdown__opt" data-val="' + r.id + '">' + r.name + '</div>'; }).join('');
    var rr = $('rvReason').querySelector('.ctl__value'); rr.textContent = 'Select reason'; rr.style.color = 'var(--fg-4)';
    F.wireSelects($('reviewModal'));
    bindOpts($('rvReason'));
    icons();
    F.openModal('reviewModal');
  }

  // ---------------- CA-B3 modal ----------------
  function openDecision(id) {
    deciding = stls.filter(function (s) { return s.id === id; })[0];
    if (!deciding) return;
    var e = D.emp(deciding.recipient_employee_id), total = itemsTotal(deciding), diff = total - deciding.advance_amount;
    $('dcTitle').textContent = 'Settlement — ' + deciding.request_no;
    $('dcSum').innerHTML = '<div class="sumbox__head"><i data-lucide="scale"></i>Summary</div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Recipient</span><span class="sumbox__v">' + e.name + '</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Advance received</span><span class="sumbox__v">' + D.rp(deciding.advance_amount) + '</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Receipts submitted</span><span class="sumbox__v">' + D.rp(total) + '</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Projected difference</span><span class="sumbox__v">' + (diff === 0 ? 'None' : (diff < 0 ? 'SHORTFALL ' : 'SURPLUS ') + D.rp(Math.abs(diff))) + '</span></div>' +
      '<div class="sumbox__row"><span class="sumbox__k">Status</span><span class="sumbox__v">' + deciding.status + '</span></div>';
    $('dcItems').innerHTML = deciding.items.map(function (i) {
      return '<tr><td>' + F.fmtDate(i.expense_date) + '</td>' +
        '<td><span class="cell-mono">' + (i.receipt_no || '—') + '</span></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(i.amount) + '</span></td>' +
        '<td>' + itemSb(i) + '</td></tr>';
    }).join('');
    var done = deciding.status === 'ACCEPTED' || deciding.status === 'REJECTED';
    var decidable = deciding.status === 'UNDER_REVIEW';
    $('dcAcceptBtn').style.display = decidable ? '' : 'none';
    $('dcRejectBtn').style.display = decidable ? '' : 'none';
    $('dcClose').style.display = decidable ? 'none' : '';
    $('dcNote').innerHTML = decidable
      ? '<strong>Closing stage.</strong> This settlement is marked final, so accepting it computes the surplus or shortfall against the advance amount.'
      : done
        ? '<strong>Already decided.</strong> The final status is ' + deciding.status + ' — a second decision on the same settlement is refused.'
        : '<strong>Stage 1 not done yet.</strong> The receipts have not been flagged by the finance officer, so the status is still <code>' + deciding.status + '</code>. A decision here would be refused — <code>decision</code> guards <code>UNDER_REVIEW</code>. This view is read-only.';
    icons();
    F.openModal('decisionModal');
  }

  document.addEventListener('DOMContentLoaded', function () {
    pgAdv = F.pager('pgadv', 10, function () { renderAdv(); icons(); }, 'advances');
    pgStl = F.pager('pgstl', 10, function () { renderStl(); icons(); }, 'settlements');
    pgDif = F.pager('pgdif', 10, function () { renderDif(); icons(); }, 'differences');
    $('fltPurposeDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All purposes</div>' +
      D.PURPOSE_TYPES.map(function (p) { return '<div class="dropdown__opt" data-val="' + p.id + '">' + p.name + '</div>'; }).join('');
    $('afPurposeDd').innerHTML = D.PURPOSE_TYPES.map(function (p) {
      return selectable(p)
        ? '<div class="dropdown__opt" data-val="' + p.id + '">' + p.name + '</div>'
        : '<div class="dropdown__opt" style="opacity:.45;pointer-events:none">' + p.name + ' — not selectable (no maximum set)</div>';
    }).join('');
    $('afRecipientDd').innerHTML = D.EMPLOYEES.filter(function (e) { return e.id !== 'emp-rahmat'; })
      .map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + ' — ' + e.unit + '</div>'; }).join('');
    F.wireSelects(document);
    ['fltPurpose', 'afPurpose', 'afRecipient'].forEach(D.bindOpts);
    renderAdv(); renderStl(); renderDif(); icons();

    var h = (location.hash || '').replace('#', '');
    if (h) { var t = document.querySelector('.tabnav__tab[data-tab="' + h + '"]'); if (t) t.click(); }

    // filters
    $('fltStatus').addEventListener('select', function (e) { flt.status = /^[A-Z_]+$/.test(e.detail.value) ? e.detail.value : ''; renderAdv(); icons(); });
    $('fltPurpose').addEventListener('select', function (e) { flt.purpose = /^pt-/.test(e.detail.value) ? e.detail.value : ''; renderAdv(); icons(); });
    $('fltNo').addEventListener('input', function () { flt.no = this.value.trim(); renderAdv(); icons(); });

    // ---- new request
    $('newAdvBtn').addEventListener('click', openAdvForm);
    $('afBehalf').addEventListener('click', function () {
      afBehalf = !afBehalf;
      this.classList.toggle('is-on', afBehalf);
      $('afRecipientWrap').style.display = afBehalf ? '' : 'none';
      afCheck();
    });
    $('afRecipient').addEventListener('select', function (e) { afRecipient = e.detail.value; afCheck(); });
    $('afPurpose').addEventListener('select', function (e) {
      afPurpose = D.PURPOSE_TYPES.filter(function (p) { return p.id === e.detail.value; })[0] || null;
      $('afTravelWrap').style.display = afPurpose && afPurpose.is_official_travel ? 'grid' : 'none';
      $('afMax').value = afPurpose ? (afPurpose.max_amount === null ? 'No maximum' : D.rp(afPurpose.max_amount)) : '—';
      $('afMaxHint').innerHTML = afPurpose
        ? (afPurpose.max_amount === null ? 'No maximum — unlimited acknowledged for this purpose.' : 'Maximum ' + D.rp(afPurpose.max_amount) + ' · above it the request is refused with <strong>422 FIN_CASH_ADVANCE_AMOUNT_EXCEEDED</strong>.')
        : '&nbsp;';
      afCheck();
    });
    $('afAmount').addEventListener('input', function () { this.value = D.thousands(this.value); afCheck(); });
    ['afStart', 'afEnd'].forEach(function (id) { $(id).addEventListener('datechange', afCheck); });
    $('afSubmit').addEventListener('click', function () {
      var amount = D.parseRp($('afAmount').value);
      if (afPurpose.max_amount !== null && amount > afPurpose.max_amount) {
        F.toast('422 FIN_CASH_ADVANCE_AMOUNT_EXCEEDED — above the ' + D.rp(afPurpose.max_amount) + ' limit for this purpose.', 'danger'); return;
      }
      var open = advances.filter(function (a) { return a.recipient_employee_id === (afBehalf ? afRecipient : ME) && /SUBMITTED|APPROVED/.test(a.status); }).length;
      if (open >= 3) { F.toast('422 FIN_CASH_ADVANCE_LIMIT_EXCEEDED — the open-advance allowance is full.', 'danger'); return; }
      var no = 'ADV-2026-' + String(84 + advances.length - 2).padStart(6, '0');
      advances.unshift({
        id: 'adv-' + Date.now(), request_no: no,
        recipient_employee_id: afBehalf ? afRecipient : ME,
        created_on_behalf_employee_id: afBehalf ? 'emp-rahmat' : null,
        purpose_type_id: afPurpose.id, purpose_type_name: afPurpose.name,
        is_official_travel_snapshot: afPurpose.is_official_travel, max_amount_snapshot: afPurpose.max_amount,
        amount: amount,
        travel_start_date: afPurpose.is_official_travel ? $('afStart').dataset.iso : null,
        travel_end_date: afPurpose.is_official_travel ? $('afEnd').dataset.iso : null,
        status: 'SUBMITTED', created_at: new Date().toISOString().slice(0, 10),
        bank_account_snapshot: { bank_code: 'BCA', account_number: '****4567', account_holder_name: 'Budi Santoso' }, cost_center_id_snapshot: null
      });
      F.closeModal('advForm'); renderAdv(); icons();
      F.toast('201 Created — ' + no + ' submitted (' + D.rp(amount) + '), status SUBMITTED.', 'ok');
    });

    // ---- row actions
    $('advBody').addEventListener('click', function (e) {
      var det = e.target.closest('[data-detail]'), can = e.target.closest('[data-cancel]'),
          rep = e.target.closest('[data-repudiate]'), tc = e.target.closest('[data-travelcancel]');
      var find = function (el, attr) { return advances.filter(function (a) { return a.id === el.getAttribute(attr); })[0]; };
      if (det) openDetail(det.getAttribute('data-detail'));
      if (can) {
        cancelling = find(can, 'data-cancel');
        $('cxKv').innerHTML = '<div class="kv__k">Request no.</div><div class="kv__v">' + cancelling.request_no + '</div>' +
          '<div class="kv__k">Amount</div><div class="kv__v">' + D.rp(cancelling.amount) + '</div>' +
          '<div class="kv__k">Status</div><div class="kv__v">' + cancelling.status + '</div>';
        F.openModal('cancelModal');
      }
      if (rep) { var r = find(rep, 'data-repudiate'); r.status = 'REPUDIATED'; renderAdv(); icons(); F.toast('200 OK — ' + r.request_no + ' repudiated by the recipient. The exit path for this state is still an open contract item.', 'info'); }
      if (tc) { var t2 = find(tc, 'data-travelcancel'); renderAdv(); icons(); F.toast('200 OK — travel cancelled for ' + t2.request_no + ' with no approval gate. The whole amount becomes a surplus at the closing stage.', 'info'); }
      var st = e.target.closest('[data-settle]');
      if (st) openSubmitStl(st.getAttribute('data-settle'));
    });

    // ---- CA-B0 submit settlement
    $('ssAdd').addEventListener('click', ssAddRow);
    $('ssFinal').addEventListener('click', function () { ssFinal = !ssFinal; this.classList.toggle('is-on', ssFinal); ssSum(); icons(); });
    function ssRow(el) { var w = el.closest('[data-row]'); return ssRows.filter(function (r) { return r.key === w.getAttribute('data-row'); })[0]; }
    $('ssRows').addEventListener('input', function (e) {
      var f = e.target.getAttribute('data-f');
      if (!f) return;
      var r = ssRow(e.target);
      if (f === 'no') r.receipt_no = e.target.value.trim();
      if (f === 'amt') { e.target.value = D.thousands(e.target.value); r.amount = D.parseRp(e.target.value); }
      ssSum(); icons();
    });
    $('ssRows').addEventListener('datechange', function (e) {
      var r = ssRow(e.target); r.expense_date = e.target.dataset.iso || null; ssSum(); icons();
    });
    $('ssRows').addEventListener('click', function (e) {
      var doc = e.target.closest('[data-f="doc"]'), del = e.target.closest('[data-delrow]');
      if (doc) {
        var r = ssRow(doc);
        r.document_id = 'doc-' + Date.now(); r.file_name = 'receipt-' + r.key + '.pdf';
        doc.classList.add('is-set');
        doc.innerHTML = doc.innerHTML.replace('Choose file', r.file_name);
        ssSum();
      }
      if (del) {
        if (ssRows.length === 1) { F.toast('A settlement needs at least one receipt.', 'info'); return; }
        var k = del.getAttribute('data-delrow');
        ssRows = ssRows.filter(function (r2) { return r2.key !== k; });
        ssPaint();
      }
    });
    $('ssSubmit').addEventListener('click', function () {
      var seen = {}, dup = null;
      stls.forEach(function (s) { s.items.forEach(function (i) { if (i.receipt_no) seen[i.receipt_no] = true; }); });
      ssRows.forEach(function (r) {
        if (!r.receipt_no) return;
        if (seen[r.receipt_no]) dup = r.receipt_no;
        seen[r.receipt_no] = true;
      });
      if (dup) { F.toast('409 FIN_DUPLICATE_RECEIPT — receipt no. ' + dup + ' is already recorded in another settlement.', 'danger'); return; }
      var newId = 'stl-' + Date.now();
      stls.unshift({
        id: newId, cash_advance_id: ssAdv.id, request_no: ssAdv.request_no,
        recipient_employee_id: ssAdv.recipient_employee_id, is_final_stage: ssFinal,
        status: 'SUBMITTED', submitted_at: new Date().toISOString().slice(0, 10),
        reviewed_by: null, decided_by: null, advance_amount: ssAdv.amount,
        items: ssRows.map(function (r, n) {
          return { id: newId + '-' + (n + 1), expense_date: r.expense_date, amount: r.amount, receipt_no: r.receipt_no, document_id: r.document_id, status: null, flagged_reason_id: null };
        }),
        similarity_warnings: []
      });
      F.closeModal('submitStlModal'); renderAdv(); renderStl(); icons();
      F.toast('201 Created — settlement submitted for ' + ssAdv.request_no + ' (' + ssRows.length + ' receipt(s)). Waiting for the finance officer to flag the receipts.', 'ok');
      document.querySelector('.tabnav__tab[data-tab="settlement"]').click();
    });

    $('cxConfirm').addEventListener('click', function () {
      if (!cancelling) return;
      if (cancelling.status !== 'SUBMITTED') { F.toast('409 FIN_ALREADY_DECIDED — the approval process has already produced a decision.', 'danger'); return; }
      cancelling.status = 'CANCELLED';
      F.closeModal('cancelModal'); renderAdv(); icons();
      F.toast('200 OK — ' + cancelling.request_no + ' cancelled while still SUBMITTED.', 'ok');
    });
    $('dtGoSettlement').addEventListener('click', function () {
      var s = detailing && stlOf(detailing.id);
      if (!s) return;
      F.closeModal('detailModal');
      document.querySelector('.tabnav__tab[data-tab="settlement"]').click();
      if (s.status === 'SUBMITTED') openReview(s.id); else openDecision(s.id);
    });

    // ---- review
    $('stlBody').addEventListener('click', function (e) {
      var rv = e.target.closest('[data-review]'), dc = e.target.closest('[data-decide]'), op = e.target.closest('[data-open]');
      if (rv) openReview(rv.getAttribute('data-review'));
      if (dc) openDecision(dc.getAttribute('data-decide'));
      if (op) {
        var s = stls.filter(function (x) { return x.id === op.getAttribute('data-open'); })[0];
        if (s && s.status === 'SUBMITTED') openReview(s.id); else if (s) openDecision(s.id);
      }
    });
    $('rvItems').addEventListener('change', function (e) {
      var box = e.target.closest('[data-flag]');
      if (!box) return;
      flags[box.getAttribute('data-flag')] = box.checked;
      var any = Object.keys(flags).some(function (k) { return flags[k]; });
      $('rvReasonWrap').style.display = any ? '' : 'none';
    });
    $('reviewModal').addEventListener('click', function (e) {
      if (e.target.closest('[data-doc]')) F.toast('Attachment opened via document-service. Existence is validated before the domain transaction starts.', 'info');
    });
    $('rvSubmit').addEventListener('click', function () {
      var any = Object.keys(flags).some(function (k) { return flags[k]; });
      if (any && !$('rvReason').querySelector('.dropdown__opt.is-sel')) { F.toast('422 — pick a reason for the flagged receipts.', 'danger'); return; }
      if ((reviewing.similarity_warnings || []).length && !$('rvAck').checked) { F.toast('422 — acknowledge the similarity warning before forwarding.', 'danger'); return; }
      var reasonId = (($('rvReason').querySelector('.dropdown__opt.is-sel') || {}).dataset || {}).val || null;
      reviewing.items.forEach(function (i) { i.flagged_reason_id = flags[i.id] ? reasonId : null; i.status = flags[i.id] ? 'REJECTED' : 'ACCEPTED'; });
      reviewing.status = 'UNDER_REVIEW'; reviewing.reviewed_by = 'emp-rahmat';
      F.closeModal('reviewModal'); renderStl(); icons();
      F.toast('200 OK — receipts marked, status UNDER_REVIEW. This is a marking, not a decision.', 'ok');
    });

    // ---- decision
    $('dcAcceptBtn').addEventListener('click', function () {
      if (!deciding) return;
      if (deciding.status !== 'UNDER_REVIEW') { F.toast('422 — the settlement is ' + deciding.status + '; a decision needs UNDER_REVIEW (the receipts must be flagged first).', 'danger'); return; }
      var total = itemsTotal(deciding), diff = total - deciding.advance_amount;
      deciding.status = 'ACCEPTED'; deciding.decided_by = 'emp-sinta';
      var adv = advances.filter(function (a) { return a.id === deciding.cash_advance_id; })[0];
      if (adv) adv.status = 'SETTLED';
      if (deciding.is_final_stage && diff !== 0) {
        var big = Math.abs(diff) >= 1000000;
        difs.unshift({
          id: 'dif-' + Date.now(), cash_advance_id: deciding.cash_advance_id, request_no: deciding.request_no,
          employee_id: deciding.recipient_employee_id,
          difference_type: diff < 0 ? 'SHORTFALL' : 'SURPLUS', amount: Math.abs(diff),
          settlement_method: null, requires_extra_approval: diff < 0 && big,
          due_date: diff > 0 ? '2026-09-15' : null,
          status: diff < 0 && big ? 'AWAITING_APPROVAL' : 'OUTSTANDING',
          closing_settlement_id: deciding.id
        });
      }
      F.closeModal('decisionModal'); renderAdv(); renderStl(); renderDif(); icons();
      F.toast('202 Accepted — decision forwarded. The final status and the ' + (diff < 0 ? 'shortfall' : 'surplus') + ' of ' + D.rp(Math.abs(diff)) + ' are written when the process completes.', 'info');
    });
    $('dcRejectBtn').addEventListener('click', function () {
      if (!deciding) return;
      if (deciding.status !== 'UNDER_REVIEW') { F.toast('422 — the settlement is ' + deciding.status + '; a decision needs UNDER_REVIEW (the receipts must be flagged first).', 'danger'); return; }
      deciding.status = 'REJECTED';
      F.closeModal('decisionModal'); renderStl(); icons();
      F.toast('202 Accepted — rejection forwarded to the approval process.', 'info');
    });

    // ---- surplus method / extra approval
    $('difBody').addEventListener('click', function (e) {
      var m = e.target.closest('[data-method]'), x = e.target.closest('[data-extra]');
      if (m) {
        methodRow = difs.filter(function (d) { return d.id === m.getAttribute('data-method'); })[0];
        smPick = null; $('smSave').disabled = true;
        var v = $('smMethod').querySelector('.ctl__value'); v.textContent = 'Select method'; v.style.color = 'var(--fg-4)';
        $('smKv').innerHTML = '<div class="kv__k">Request no.</div><div class="kv__v">' + methodRow.request_no + '</div>' +
          '<div class="kv__k">Type</div><div class="kv__v">' + methodRow.difference_type + '</div>' +
          '<div class="kv__k">Amount</div><div class="kv__v">' + D.rp(methodRow.amount) + '</div>';
        F.openModal('methodModal');
      }
      if (x) {
        var d = difs.filter(function (r) { return r.id === x.getAttribute('data-extra'); })[0];
        d.status = 'OUTSTANDING';
        renderDif(); icons();
        F.toast('202 Accepted — extra approval forwarded. This approver must differ from the one who decided the settlement.', 'info');
      }
    });
    $('smMethod').addEventListener('select', function (e) { smPick = e.detail.value; $('smSave').disabled = false; });
    $('smSave').addEventListener('click', function () {
      if (!methodRow) return;
      methodRow.settlement_method = smPick;
      methodRow.status = smPick === 'RETURNED_OUTSIDE_HRIS' ? 'SETTLED' : 'OUTSTANDING';
      F.closeModal('methodModal'); renderDif(); icons();
      F.toast('200 OK — return method set to ' + smPick + '.', 'ok');
    });
  });
})();
