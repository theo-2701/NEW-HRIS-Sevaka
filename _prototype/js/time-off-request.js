// ============================================================
// SEVAKA HRIS — Time › Time Off Request (+ Delegation, Medical access sub-view)
// FSD-001-TIME §2 · UIC-001-TIME §3
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var REQ = T.LEAVE_REQUESTS.map(function (r) { return Object.assign({}, r); });
  var DEL = T.DELEGATIONS.map(function (d) { return Object.assign({}, d); });
  var ACC = T.MEDICAL_ACCESS.map(function (a) { return Object.assign({}, a); });
  var NOW = new Date('2026-07-24T09:00:00+07:00'); // demo "today" — inside leave-2's reject window

  // The one place a developer wires the real login token (flow-common › SEVAKA_SESSION).
  // Row filtering is the ESS mechanism the contract describes: same screen, same endpoint,
  // rows narrowed from the identity claim — never a separate screen.
  var VIEWERS = [
    { id: 'emp-hendra', roles: ['ROLE_EMPLOYEE', 'ROLE_HR_MANAGER'] },
    { id: 'emp-budi', roles: ['ROLE_EMPLOYEE', 'ROLE_DEPT_MANAGER'] },
    { id: 'emp-rina', roles: ['ROLE_EMPLOYEE'] }
  ];
  var SESS = VIEWERS[0];
  function roleLabel(v) { return T.emp(v.id).name + ' — ' + v.roles[v.roles.length - 1].replace('ROLE_', ''); }
  function isApprover() { return SESS.roles.indexOf('ROLE_HR_MANAGER') >= 0 || SESS.roles.indexOf('ROLE_DEPT_MANAGER') >= 0; }
  function canOpenMedical() { return SESS.roles.indexOf('ROLE_HR_MANAGER') >= 0; } // + ROLE_HEALTH_DATA_OFFICER when it exists

  var flt = { status: '', type: '', name: '' };
  var editReq = null, decideReq = null, sickReq = null, wdReq = null, editDel = null, cancelDel = null, medReq = null;
  var accPurpose = '';
  var $ = function (id) { return document.getElementById(id); };
  var pgReq = F.pager('pgReq', 10, function () { drawReq(); }, 'requests');

  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function isMine(r) { return r.employee_id === SESS.id; }
  function windowOpen(r) { return r.request_status === 'AUTO_APPROVED' && r.reject_deadline_at && new Date(r.reject_deadline_at) > NOW; }

  // ---------------- working-day maths (four submit gates) ----------------
  function workingDays(empId, s, e, session) {
    if (!s || !e) return 0;
    var d1 = new Date(s), d2 = new Date(e), n = 0;
    for (var d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
      var wd = d.getDay();
      if (wd === 0 || wd === 6) continue;
      var iso = T.isoOf(d);
      var hol = T.HOLIDAYS.filter(function (h) { return h.holiday_date === iso && h.approval_status === 'APPROVED' && (h.holiday_type !== 'REGIONAL' || h.scope_ref === T.emp(empId).branch); })[0];
      if (hol) continue;
      n++;
    }
    if (session !== 'FULL' && n === 1) n = 0.5;
    return n;
  }
  function gates(empId, typeId, s, e, session, selfId) {
    var out = { total: 0, errors: [], extra: [], gate: [false, false, false, false] };
    if (!typeId || !s || !e) { out.errors.push('Leave type, start date and end date are required.'); return out; }
    if (e < s) { out.errors.push('The end date cannot precede the start date.'); return out; }
    if (session !== 'FULL' && s !== e) out.errors.push('422 — a half day is only valid when start and end are the same date.');
    var type = T.lt(typeId);
    // gate 1 — blackout period (hard = 422, the row is never created; soft = extra layer)
    T.BLACKOUTS.forEach(function (b) {
      if (s <= b.end_date && e >= b.start_date && !type.is_statutory) {
        if (b.blackout_mode === 'HARD') { out.errors.push('422 — the dates fall inside the hard blackout “' + b.blackout_name + '”.'); out.gate[0] = true; }
        else out.extra.push('SOFT_BLACKOUT');
      }
    });
    // gate 2 — overlap with a live request of my own (409)
    REQ.forEach(function (r) {
      if (r.employee_id !== empId || r.id === selfId) return;
      if (['PENDING_APPROVAL', 'APPROVED', 'AUTO_APPROVED'].indexOf(r.request_status) < 0) return;
      if (s <= r.end_date && e >= r.start_date) { out.errors.push('409 — these dates overlap your live request ' + r.id + '.'); out.gate[1] = true; }
    });
    // gate 3 — minimum advance notice (422)
    var lead = Math.round((new Date(s) - NOW) / 86400000);
    if (type.min_advance_days && lead < type.min_advance_days) {
      out.errors.push('422 — ' + type.leave_name + ' must be filed at least ' + type.min_advance_days + ' days ahead (this one is ' + lead + ').');
      out.gate[2] = true;
    }
    // gate 4 — net working days must not be zero (422)
    out.total = workingDays(empId, s, e, session);
    if (out.total === 0) { out.errors.push('422 — the range contains no net working day (holidays and weekly rest excluded).'); out.gate[3] = true; }
    // extra approval layer probes
    var bal = T.LEAVE_BALANCES.filter(function (b) { return b.employee_id === empId && b.leave_type_id === typeId && b.period_year === +s.slice(0, 4); })[0];
    if (type.affects_balance && bal && bal.balance_days - out.total < 0) out.extra.push('NEGATIVE_BALANCE');
    if (!type.is_paid) out.extra.push('UNPAID_TYPE');
    if (out.total > 5) out.extra.push('LONG_DURATION');
    return out;
  }

  // ---------------- request grid ----------------
  function visibleReq() {
    return REQ.filter(function (r) { return isApprover() || isMine(r); });
  }
  function reqRows() {
    return visibleReq().filter(function (r) {
      if (flt.status && r.request_status !== flt.status) return false;
      if (flt.type && r.leave_type_id !== flt.type) return false;
      if (flt.name && T.emp(r.employee_id).name.toLowerCase().indexOf(flt.name.toLowerCase()) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.submitted_at < b.submitted_at ? 1 : -1; });
  }
  function reqActions(r) {
    var items = [];
    if (isMine(r)) {
      if (r.request_status === 'PENDING_APPROVAL') items.push({ label: 'Edit', icon: 'pencil', attr: 'data-edit="' + r.id + '"' });
      if (['PENDING_APPROVAL', 'AUTO_APPROVED'].indexOf(r.request_status) >= 0 || (r.request_status === 'APPROVED' && r.start_date > T.isoOf(NOW))) {
        items.push({ label: 'Withdraw', icon: 'undo-2', attr: 'data-wd="' + r.id + '"', danger: true });
      }
    } else if (isApprover()) {
      if (r.request_status === 'PENDING_APPROVAL') items.push({ label: 'Review', icon: 'gavel', attr: 'data-decide="' + r.id + '"' });
      if (windowOpen(r)) items.push({ label: 'Reject sick leave', icon: 'ban', attr: 'data-sick="' + r.id + '"', danger: true });
    }
    if (!items.length) return '<div class="rowacts"><button class="rowbtn" data-view="' + r.id + '">View Detail</button></div>';
    items.push({ label: 'View Detail', icon: 'eye', attr: 'data-view="' + r.id + '"' });
    return F.rowMenu(items);
  }
  function drawReq() {
    var all = reqRows(), view = pgReq.slice(all), vis = visibleReq();
    $('cntReq').textContent = vis.length;
    $('kWait').textContent = vis.filter(function (r) { return r.request_status === 'PENDING_APPROVAL' && !isMine(r) && isApprover(); }).length;
    $('kSick').textContent = vis.filter(windowOpen).length;
    $('kExtra').textContent = vis.filter(function (r) { return !!r.requires_extra_approval_reason; }).length;
    $('kMine').textContent = REQ.filter(isMine).length;
    $('reqBody').innerHTML = view.length ? view.map(function (r) {
      var extra = r.requires_extra_approval_reason
        ? '<span class="tm-flag">' + (T.LABEL.extra_reason[r.requires_extra_approval_reason] || r.requires_extra_approval_reason) + '</span>'
        : '<span class="cell-dim">—</span>';
      return '<tr>' +
        '<td class="cell-mono">' + r.id + (isMine(r) ? ' <span class="tm-flag">Mine</span>' : '') + '</td>' +
        '<td>' + T.person(r.employee_id) + '</td>' +
        '<td>' + T.lt(r.leave_type_id).leave_name + (r.has_doctor_note ? ' <span class="tm-flag">Note</span>' : '') + '</td>' +
        '<td>' + T.range(r.start_date, r.end_date) + '</td>' +
        '<td class="cell-dim">' + T.LABEL.day_session[r.day_session] + '</td>' +
        '<td class="ta-r"><span class="tm-num">' + T.num(r.total_days, 2) + '</span></td>' +
        '<td>' + extra + '</td>' +
        '<td>' + T.badge(r.request_status, T.LABEL.request_status) + (windowOpen(r) ? ' <span class="tm-flag">Window open</span>' : '') + '</td>' +
        '<td>' + reqActions(r) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="9"><div class="tempty"><div class="tempty__t">No request matches these filters.</div></div></td></tr>';
    pgReq.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- delegation grid ----------------
  function visibleDel() {
    return DEL.filter(function (d) { return isApprover() || d.delegator_id === SESS.id || d.substitute_id === SESS.id; });
  }
  function drawDel() {
    var rows = visibleDel();
    $('cntDel').textContent = rows.length;
    $('newDelBtn').disabled = !isApprover();
    $('delNote').textContent = isApprover()
      ? 'Only filed by a requester who themselves holds an active approver role.'
      : 'You hold no approver role, so there is nothing to hand over — the register button is closed for you.';
    $('delBody').innerHTML = rows.length ? rows.map(function (d) {
      var parent = T.byId(REQ, d.leave_request_id);
      var own = d.delegator_id === SESS.id;
      var acts = (d.delegation_status === 'PENDING_APPROVAL' && own)
        ? F.rowMenu([
          { label: 'Change substitute', icon: 'user-cog', attr: 'data-dedit="' + d.id + '"' },
          { label: 'Cancel delegation', icon: 'x-circle', attr: 'data-dcan="' + d.id + '"', danger: true }
        ])
        : '<div class="rowacts"><button class="rowbtn" disabled>Change substitute</button></div>';
      return '<tr>' +
        '<td class="cell-mono">' + d.id + '</td>' +
        '<td>' + (parent ? T.range(parent.start_date, parent.end_date) + ' <span class="cell-dim">· ' + parent.id + '</span>' : '—') + '</td>' +
        '<td>' + T.emp(d.delegator_id).name + '</td>' +
        '<td>' + T.emp(d.substitute_id).name + '</td>' +
        '<td class="cell-dim">' + (d.delegation_scope ? '{ scope: "' + d.delegation_scope + '" }' : 'Not set — all held tasks') + '</td>' +
        '<td>' + T.badge(d.delegation_status, T.LABEL.delegation) + '</td>' +
        '<td>' + acts + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty"><div class="tempty__t">No delegation registered.</div></div></td></tr>';
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- medical access sub-view (inside Detail) ----------------
  function drawAcc() {
    var rows = medReq ? ACC.filter(function (a) { return a.leave_request_id === medReq.id; })
      .sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; }) : [];
    $('accBody').innerHTML = rows.length ? rows.map(function (a) {
      return '<tr>' +
        '<td class="cell-strong">' + T.dt(a.created_at) + '</td>' +
        '<td>' + T.person(a.accessed_by) + '</td>' +
        '<td>' + T.LABEL.purpose[a.access_purpose] + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="3"><div class="tempty"><div class="tempty__t">This note has never been opened.</div></div></td></tr>';
  }
  function paintMedGate() {
    var purged = medReq && medReq.doctor_note_purged;
    $('rdMedGateTxt').innerHTML = !canOpenMedical()
      ? 'Opening a doctor’s note is reserved for HR / the health-data officer. As <strong>' + roleLabel(SESS) + '</strong> the attempt is refused with <code>403</code> — and a refused attempt leaves no row in this log at all.'
      : purged
        ? 'This note is past its retention period and was permanently deleted — <code>410</code>. The fact of the sick leave stands; the content cannot be opened by anyone again.'
        : 'You hold the health-data role, so the note can be opened once a purpose is on record. As <strong>' + roleLabel(SESS) + '</strong> your name and the purpose you declare are written to the log below first.';
    $('accOpen').disabled = !(accPurpose && canOpenMedical() && !purged);
  }

  // ---------------- request form ----------------
  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || ''; v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }
  function derived() {
    var typeId = $('rfType').dataset.val, s = $('rfStart').dataset.iso, e = $('rfEnd').dataset.iso;
    var session = $('rfSession').dataset.val || 'FULL';
    var type = typeId ? T.lt(typeId) : null;
    $('rfReasonStar').style.display = (type && type.leave_code === 'SAKIT') ? 'none' : '';
    $('rfDocWrap').classList.toggle('is-hidden', !(type && type.requires_document));
    $('rfDocNote').classList.toggle('is-hidden', !(type && type.requires_document));
    $('rfTypeHint').textContent = type
      ? (type.requires_approval ? 'Requires approval — the request waits and changes nothing until it is decided.' : 'No approval required — it takes effect immediately and opens a reject window instead.')
      : 'Only active types appear here.';
    var g = gates(SESS.id, typeId, s, e, session, editReq ? editReq.id : null);
    var ready = !!(typeId && s && e);
    var rows = '<div class="tm-derived__h">Server-derived preview</div>' +
      '<div class="tm-derived__r">Total days (holidays &amp; weekly rest excluded) <b>' + (ready ? T.num(g.total, 2) : '—') + '</b></div>';
    ['Blackout period', 'Overlap with a live request', 'Minimum advance notice', 'Net working days not zero'].forEach(function (label, i) {
      var failed = g.gate[i];
      var tone = !ready ? 'var(--fg-3)' : failed ? 'var(--color-error-600)' : 'var(--color-success-700)';
      var verdict = !ready ? 'not evaluated' : failed ? 'blocked' : 'passed';
      rows += '<div class="tm-derived__r">Gate ' + (i + 1) + ' — ' + label + ' <b style="color:' + tone + '">' + verdict + '</b></div>';
    });
    var extraTxt = g.extra.map(function (c) { return T.LABEL.extra_reason[c] || c; }).join(' · ');
    rows += '<div class="tm-derived__r">Extra approval layer <b>' + (!ready ? 'not evaluated' : extraTxt || 'not raised') + '</b></div>';
    if (g.errors.length) rows += '<div class="tm-derived__r" style="color:var(--color-error-600)">' + g.errors[0] + '</div>';
    $('rfDerived').innerHTML = rows;
    return g;
  }
  function openReqForm(r) {
    editReq = r || null;
    $('rfTitle').textContent = r ? 'Edit request ' + r.id : 'New time off request';
    $('rfWho').value = T.emp(SESS.id).name + ' · ' + T.emp(SESS.id).nik;
    $('rfTypeLock').classList.toggle('is-hidden', !r);
    $('rfType').style.pointerEvents = r ? 'none' : '';
    $('rfType').style.opacity = r ? '.65' : '';
    if (r) {
      setSel('rfType', r.leave_type_id, T.lt(r.leave_type_id).leave_name);
      setSel('rfSession', r.day_session, T.LABEL.day_session[r.day_session]);
      F.setDate($('rfStart'), r.start_date); F.setDate($('rfEnd'), r.end_date);
      $('rfReason').value = r.request_reason || ''; $('rfDoc').checked = !!r.has_doctor_note;
      $('rfSubmit').textContent = 'Save changes';
    } else {
      setSel('rfType', '', 'Select leave type');
      setSel('rfSession', 'FULL', 'Full day');
      F.setDate($('rfStart'), ''); F.setDate($('rfEnd'), '');
      $('rfReason').value = ''; $('rfDoc').checked = false;
      $('rfSubmit').textContent = 'Submit request';
    }
    derived();
    F.openModal('reqForm');
  }
  function submitReq() {
    var typeId = $('rfType').dataset.val, s = $('rfStart').dataset.iso, e = $('rfEnd').dataset.iso;
    var session = $('rfSession').dataset.val || 'FULL', reason = $('rfReason').value.trim();
    var g = derived(), type = typeId ? T.lt(typeId) : null;
    if (g.errors.length) { F.toast(g.errors[0], 'danger'); return; }
    if (type && type.leave_code !== 'SAKIT' && !reason) { F.toast('422 — a reason is required for this leave type.', 'danger'); return; }
    if (type && type.requires_document && !$('rfDoc').checked) { F.toast('422 — this leave type requires a doctor\u2019s note.', 'danger'); return; }
    var extra = g.extra.length ? g.extra[0] : null;
    if (editReq) {
      Object.assign(editReq, { leave_type_id: typeId, start_date: s, end_date: e, day_session: session, request_reason: reason, total_days: g.total, has_doctor_note: $('rfDoc').checked, requires_extra_approval_reason: extra });
      F.toast('200 — request updated and the submit gates were re-run; total days recomputed.', 'ok');
    } else {
      var auto = type && !type.requires_approval;
      REQ.push({
        id: 'leave-' + (REQ.length + 10), employee_id: SESS.id, leave_type_id: typeId, day_session: session,
        start_date: s, end_date: e, total_days: g.total, request_reason: reason, has_doctor_note: $('rfDoc').checked,
        doctor_note_purged: false,
        request_status: auto ? 'AUTO_APPROVED' : 'PENDING_APPROVAL',
        requires_extra_approval_reason: extra,
        reject_deadline_at: auto ? new Date(NOW.getTime() + 2 * 86400000).toISOString() : null,
        reject_reason: null, submitted_at: NOW.toISOString(),
        approved_by: null, approved_at: auto ? NOW.toISOString() : null
      });
      F.toast(auto
        ? '201 — sick leave in force immediately; the balance is deducted now and the reject window is open.'
        : '201 — request submitted; nothing changes until a decision lands.', 'ok');
    }
    F.closeModal('reqForm'); pgReq.reset(); drawReq();
  }

  // ---------------- detail / decisions ----------------
  function openDetail(r) {
    medReq = r;
    $('rdTitle').textContent = 'Request detail';
    $('rdDesc').textContent = r.id + ' · ' + T.emp(r.employee_id).name + ' · read-only.';
    $('rdKv').innerHTML = kv([
      ['Employee', T.emp(r.employee_id).name], ['Leave type', T.lt(r.leave_type_id).leave_name],
      ['Dates', T.range(r.start_date, r.end_date)], ['Session', T.LABEL.day_session[r.day_session]],
      ['Total days', T.num(r.total_days, 2)], ['Reason', r.request_reason || '—'],
      ['Doctor\u2019s note', r.has_doctor_note ? 'Available' : '—'],
      ['Extra layer', r.requires_extra_approval_reason ? T.LABEL.extra_reason[r.requires_extra_approval_reason] : 'Not raised'],
      ['Status', T.badge(r.request_status, T.LABEL.request_status)],
      ['Submitted', T.dt(r.submitted_at)],
      ['Decided by', r.approved_by ? T.emp(r.approved_by).name : (r.request_status === 'AUTO_APPROVED' ? 'System — auto-approved' : '—')],
      ['Rejection reason', r.reject_reason || '—']
    ]);
    $('rdSod').classList.toggle('is-hidden', !(r.request_status === 'PENDING_APPROVAL' && isMine(r)));
    var w = r.request_status === 'AUTO_APPROVED';
    $('rdWindow').classList.toggle('is-hidden', !w);
    if (w) {
      $('rdWindowTxt').innerHTML = windowOpen(r)
        ? 'Reject window closes <strong>' + T.dt(r.reject_deadline_at) + '</strong> — frozen at submit time. Rejecting inside it reverses the balance and the day status.'
        : 'The reject window closed on <strong>' + T.dt(r.reject_deadline_at) + '</strong>. This sick leave is permanent — a later rejection is refused with <code>422</code>.';
    }
    // medical sub-view only exists where a note is attached (F3)
    $('rdMedBtn').style.display = r.has_doctor_note ? '' : 'none';
    document.querySelector('#reqDetail .subtabs').style.display = r.has_doctor_note ? '' : 'none';
    $('rdMedBtn').classList.remove('is-on');
    document.querySelector('#reqDetail [data-sub="detail"]').classList.add('is-on');
    document.querySelector('#reqDetail [data-subpanel="detail"]').classList.add('is-on');
    document.querySelector('#reqDetail [data-subpanel="medical"]').classList.remove('is-on');
    accPurpose = '';
    setSel('accPurpose', '', 'Select access purpose');
    paintMedGate(); drawAcc();
    F.openModal('reqDetail');
  }
  function decide(kind) {
    var note = $('dcNote').value.trim();
    if (kind === 'REJECTED' && !note) { F.toast('422 — a rejection reason is mandatory.', 'danger'); return; }
    var row = decideReq;
    F.closeModal('reqDecision');
    F.toast('200 — decision accepted and forwarded to the approval engine.', 'info');
    setTimeout(function () {
      row.request_status = kind; row.approved_by = SESS.id; row.approved_at = NOW.toISOString();
      if (kind === 'REJECTED') row.reject_reason = note;
      DEL.forEach(function (d) { if (d.leave_request_id === row.id && d.delegation_status === 'PENDING_APPROVAL') d.delegation_status = kind === 'APPROVED' ? 'APPROVED' : 'REJECTED'; });
      drawReq(); drawDel();
      F.toast(kind === 'APPROVED'
        ? 'Process finished — days closed as leave, balance deducted, ledger entry written.'
        : 'Process finished — the request is Rejected; those days stay assessed as absent.', kind === 'APPROVED' ? 'ok' : 'warn');
    }, 1400);
  }

  // ---------------- session switch ----------------
  function applySession() {
    $('essTxt').innerHTML = isApprover()
      ? 'Approver view — every request inside your span of control is listed. Your own rows carry no decision action: separation of duties is enforced server-side (<code>403</code>), not merely hidden here.'
      : 'ESS mode — this is the same screen and the same endpoint; the rows are narrowed to <strong>' + T.emp(SESS.id).name + '</strong> from the identity claim, and no decision action exists for you.';
    pgReq.reset(); drawReq(); drawDel();
  }

  // ---------------- wiring ----------------
  document.addEventListener('DOMContentLoaded', function () {
    T.fillSelect('viewAs', VIEWERS.map(function (v, i) {
      return '<div class="dropdown__opt' + (i === 0 ? ' is-sel' : '') + '" data-val="' + v.id + '">' + roleLabel(v) + '</div>';
    }).join(''));
    T.fillSelect('fltType', '<div class="dropdown__opt is-sel" data-val="">All leave types</div>' +
      T.LEAVE_TYPES.map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.leave_name + '</div>'; }).join(''));
    T.fillSelect('rfType', T.LEAVE_TYPES.filter(function (t) { return t.is_active; })
      .map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.leave_name + '</div>'; }).join(''));
    applySession(); drawAcc();

    $('viewAs').addEventListener('select', function (e) {
      var v = VIEWERS.filter(function (x) { return x.id === e.detail.value; })[0];
      if (v) { SESS = v; applySession(); }
    });
    $('fltStatus').addEventListener('select', function (e) { flt.status = e.detail.value === 'All statuses' ? '' : e.detail.value; pgReq.reset(); drawReq(); });
    $('fltType').addEventListener('select', function (e) { flt.type = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgReq.reset(); drawReq(); });
    $('fltName').addEventListener('input', function () { flt.name = this.value.trim(); pgReq.reset(); drawReq(); });

    $('newReqBtn').addEventListener('click', function () { openReqForm(null); });
    $('rfSubmit').addEventListener('click', submitReq);
    ['rfStart', 'rfEnd'].forEach(function (id) { $(id).addEventListener('datechange', derived); });
    $('rfType').addEventListener('select', function (e) { $('rfType').dataset.val = e.detail.value; derived(); });
    $('rfSession').addEventListener('select', function (e) { $('rfSession').dataset.val = e.detail.value; derived(); });

    $('reqBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-view],[data-edit],[data-decide],[data-sick],[data-wd]'); if (!t) return;
      var id = t.getAttribute('data-view') || t.getAttribute('data-edit') || t.getAttribute('data-decide') || t.getAttribute('data-sick') || t.getAttribute('data-wd');
      var r = T.byId(REQ, id);
      if (t.hasAttribute('data-view')) openDetail(r);
      else if (t.hasAttribute('data-edit')) openReqForm(r);
      else if (t.hasAttribute('data-decide')) {
        decideReq = r;
        $('dcTitle').textContent = 'Leave approval — ' + r.id;
        $('dcKv').innerHTML = kv([
          ['Employee', T.emp(r.employee_id).name], ['Leave type', T.lt(r.leave_type_id).leave_name],
          ['Dates', T.range(r.start_date, r.end_date)], ['Total days', T.num(r.total_days, 2)],
          ['Reason', r.request_reason || '—'],
          ['Extra layer', r.requires_extra_approval_reason ? T.LABEL.extra_reason[r.requires_extra_approval_reason] : 'Not raised'],
          ['Separation of duties', T.emp(SESS.id).name + ' ≠ ' + T.emp(r.employee_id).name + ' — decision available']
        ]);
        $('dcNote').value = '';
        F.openModal('reqDecision');
      } else if (t.hasAttribute('data-sick')) {
        sickReq = r;
        $('srKv').innerHTML = kv([
          ['Employee', T.emp(r.employee_id).name], ['Dates', T.range(r.start_date, r.end_date)],
          ['Doctor\u2019s note', r.has_doctor_note ? 'Available' : '—'],
          ['Window closes', T.dt(r.reject_deadline_at)]
        ]);
        $('srReason').value = '';
        F.openModal('sickReject');
      } else {
        wdReq = r;
        $('wdKv').innerHTML = kv([['Request', r.id], ['Dates', T.range(r.start_date, r.end_date)], ['Status', T.badge(r.request_status, T.LABEL.request_status)]]);
        F.openModal('reqWithdraw');
      }
    });

    $('dcApprove').addEventListener('click', function () { decide('APPROVED'); });
    $('dcReject').addEventListener('click', function () { decide('REJECTED'); });
    $('srConfirm').addEventListener('click', function () {
      var reason = $('srReason').value.trim();
      if (!reason) { F.toast('422 — a rejection reason is mandatory.', 'danger'); return; }
      var row = sickReq;
      F.closeModal('sickReject');
      F.toast('200 — rejection accepted and forwarded.', 'info');
      setTimeout(function () {
        row.request_status = 'REJECTED'; row.reject_reason = reason; row.approved_by = SESS.id;
        drawReq();
        F.toast('Process finished — the deducted balance is written back and the day falls to absent.', 'warn');
      }, 1400);
    });
    $('wdConfirm').addEventListener('click', function () {
      wdReq.request_status = 'CANCELLED';
      DEL.forEach(function (d) { if (d.leave_request_id === wdReq.id && d.delegation_status === 'PENDING_APPROVAL') d.delegation_status = 'CANCELLED'; });
      F.closeModal('reqWithdraw'); drawReq(); drawDel();
      F.toast('200 — status CANCELLED; balance restored where it had been deducted and any delegation cancelled with it.', 'ok');
    });

    // ---- delegation ----
    $('newDelBtn').addEventListener('click', function () {
      if (!isApprover()) { F.toast('You hold no approver role — there is no approval task to delegate.', 'warn'); return; }
      editDel = null;
      $('dfTitle').textContent = 'Register substitute';
      var mine = REQ.filter(function (r) {
        return isMine(r) && ['PENDING_APPROVAL', 'APPROVED'].indexOf(r.request_status) >= 0 &&
          !DEL.filter(function (d) { return d.leave_request_id === r.id && ['PENDING_APPROVAL', 'APPROVED'].indexOf(d.delegation_status) >= 0; }).length;
      });
      T.fillSelect('dfLeave', mine.map(function (r) { return '<div class="dropdown__opt" data-val="' + r.id + '">' + r.id + ' · ' + T.range(r.start_date, r.end_date) + ' · ' + T.num(r.total_days, 2) + ' d · ' + T.LABEL.request_status[r.request_status] + '</div>'; }).join('')
        || '<div class="dropdown__empty">You have no live request left to delegate.</div>');
      setSel('dfLeave', '', 'Select one of my live requests');
      setSel('dfSub', '', 'Select employee');
      setSel('dfScope', 'ALL_APPROVALS', '{ scope: "ALL_APPROVALS" }');
      T.fillSelect('dfSub', T.EMPLOYEES.filter(function (e) { return e.id !== 'emp-sys' && e.id !== SESS.id; })
        .map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + ' · ' + e.role + '</div>'; }).join(''));
      $('dfLeave').style.pointerEvents = ''; $('dfLeave').style.opacity = '';
      F.openModal('delForm');
    });
    $('delBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-dedit],[data-dcan]'); if (!t) return;
      var d = T.byId(DEL, t.getAttribute('data-dedit') || t.getAttribute('data-dcan'));
      if (t.hasAttribute('data-dedit')) {
        editDel = d;
        $('dfTitle').textContent = 'Change substitute';
        var p = T.byId(REQ, d.leave_request_id);
        T.fillSelect('dfLeave', '<div class="dropdown__opt is-sel" data-val="' + d.leave_request_id + '">' + d.leave_request_id + ' · ' + (p ? T.range(p.start_date, p.end_date) : '') + '</div>');
        setSel('dfLeave', d.leave_request_id, d.leave_request_id + (p ? ' · ' + T.range(p.start_date, p.end_date) : ''));
        $('dfLeave').style.pointerEvents = 'none'; $('dfLeave').style.opacity = '.65';
        T.fillSelect('dfSub', T.EMPLOYEES.filter(function (e) { return e.id !== 'emp-sys' && e.id !== d.delegator_id; })
          .map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + ' · ' + e.role + '</div>'; }).join(''));
        setSel('dfSub', d.substitute_id, T.emp(d.substitute_id).name + ' · ' + T.emp(d.substitute_id).role);
        setSel('dfScope', d.delegation_scope || '', d.delegation_scope ? '{ scope: "' + d.delegation_scope + '" }' : 'Not set — every held approval task');
        F.openModal('delForm');
      } else {
        cancelDel = d;
        $('dcanKv').innerHTML = kv([['Delegation', d.id], ['Substitute', T.emp(d.substitute_id).name], ['Parent leave', d.leave_request_id]]);
        F.openModal('delCancel');
      }
    });
    $('dfSave').addEventListener('click', function () {
      var leave = $('dfLeave').dataset.val, sub = $('dfSub').dataset.val, scope = $('dfScope').dataset.val || '';
      if (!leave || !sub) { F.toast('422 — both the delegated leave and the substitute are required.', 'danger'); return; }
      if (editDel) {
        if (editDel.delegation_status !== 'PENDING_APPROVAL') { F.toast('422 — an approved appointment is locked.', 'danger'); return; }
        if (sub === editDel.delegator_id) { F.toast('422 — the substitute must differ from the delegator.', 'danger'); return; }
        editDel.substitute_id = sub; editDel.delegation_scope = scope;
        F.toast('200 — substitute changed while the delegation is still pending.', 'ok');
      } else {
        if (sub === SESS.id) { F.toast('422 — you cannot delegate to yourself.', 'danger'); return; }
        if (DEL.filter(function (d) { return d.leave_request_id === leave && ['PENDING_APPROVAL', 'APPROVED'].indexOf(d.delegation_status) >= 0; }).length) {
          F.toast('409 — that request already has a live delegation.', 'danger'); return;
        }
        DEL.push({ id: 'deleg-' + (DEL.length + 10), leave_request_id: leave, delegator_id: SESS.id, substitute_id: sub, delegation_scope: scope, delegation_status: 'PENDING_APPROVAL', created_at: NOW.toISOString() });
        F.toast('201 — delegation registered; it follows the decision on its parent leave.', 'ok');
      }
      F.closeModal('delForm'); drawDel();
    });
    $('dcanConfirm').addEventListener('click', function () {
      cancelDel.delegation_status = 'CANCELLED';
      F.closeModal('delCancel'); drawDel();
      F.toast('200 — delegation cancelled.', 'ok');
    });
    $('dfLeave').addEventListener('select', function (e) { $('dfLeave').dataset.val = e.detail.value.split(' · ')[0]; });
    $('dfSub').addEventListener('select', function (e) { $('dfSub').dataset.val = e.detail.value; });
    $('dfScope').addEventListener('select', function (e) { $('dfScope').dataset.val = e.detail.value.indexOf('Not set') === 0 ? '' : 'ALL_APPROVALS'; });

    // ---- medical document access (sub-view of Detail) ----
    $('accPurpose').addEventListener('select', function (e) {
      accPurpose = e.detail.value;
      paintMedGate();
    });
    $('accOpen').addEventListener('click', function () {
      if (!canOpenMedical()) { F.toast('403 — only HR / the health-data officer may open a note. No audit row was written.', 'danger'); return; }
      if (medReq.doctor_note_purged) { F.toast('410 — the note was deleted at the end of its retention period.', 'danger'); return; }
      var row = { id: 'access-' + (ACC.length + 10), leave_request_id: medReq.id, accessed_by: SESS.id, access_purpose: accPurpose, created_at: NOW.toISOString() };
      ACC.push(row);
      drawAcc();
      $('dvKv').innerHTML = kv([
        ['Request', medReq.id], ['Employee', T.emp(medReq.employee_id).name],
        ['Leave dates', T.range(medReq.start_date, medReq.end_date)],
        ['Access purpose', T.LABEL.purpose[accPurpose]], ['Opened by', T.emp(SESS.id).name],
        ['Audit row written', T.dt(row.created_at)]
      ]);
      F.openModal('docViewer');
      F.toast('200 — audit row written first, then the note was released.', 'ok');
    });
    // the viewer sits on top of the open Detail modal — keep the page locked behind it
    $('docViewer').addEventListener('click', function () {
      setTimeout(function () {
        if ($('reqDetail').classList.contains('is-open')) document.body.style.overflow = 'hidden';
      }, 0);
    });
  });
})();
