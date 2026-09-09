// ============================================================
// SEVAKA HRIS — Time › Overtime (emp_overtime_request + emp_overtime_daily)
// FSD-001-TIME §7 · UIC-001-TIME §8
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var OT = T.OT_REQ.map(function (o) { return Object.assign({}, o); });
  var OTD = T.OT_DAILY.map(function (o) { return Object.assign({}, o); });
  var TODAY = '2026-07-27';            // demo clock — UIC §8.1.1 submitted_at
  var RETRO_WINDOW_DAYS = 7;           // overtime.retroactive_window_days — value to be confirmed
  // Same screen, same endpoint; rows narrowed from the identity claim (Peta Menu TIME note #2).
  // Scopes UIC §8.1: create = EMPLOYEE only · approve = HR_MANAGER · DEPT_MANAGER · search = all five roles.
  var VIEWERS = [{ id: 'emp-rina', role: 'EMPLOYEE' }, { id: 'emp-budi', role: 'DEPT_MANAGER' }, { id: 'emp-sari', role: 'HR_STAFF' }, { id: 'emp-hendra', role: 'HR_MANAGER' }];
  var SESS = VIEWERS[0];
  var flt = { status: '', mode: '', cat: '', from: '', to: '', name: '' };
  var fltD = { cat: '', from: '', to: '', name: '' };
  var editOt = null, decOt = null, wdOt = null;
  var $ = function (id) { return document.getElementById(id); };
  var pgOt = F.pager('pgOt', 10, function () { drawOt(); }, 'requests');
  var pgOtd = F.pager('pgOtd', 10, function () { drawOtd(); }, 'days');

  function isApprover() { return SESS.role === 'HR_MANAGER' || SESS.role === 'DEPT_MANAGER'; }
  function canSearchAll() { return SESS.role !== 'EMPLOYEE'; }   // :search is cross-employee for every non-ESS role
  function canFile() { return SESS.role === 'EMPLOYEE'; }        // overtime-request:create — EMPLOYEE scope (§8.1.1)
  function roleLabel(v) { return T.emp(v.id).name + ' — ' + v.role; }
  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function hrs(n) { return n === null || n === undefined ? '<span class="cell-dim">—</span>' : '<span class="tm-num">' + T.num(n, 2) + '</span>'; }
  function shift(iso, days) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); }

  // ---------- server-derived preview: mode, category, extra approval layer ----------
  function approvedOn(empId, iso, skipId) {
    return OT.filter(function (x) {
      return x.employee_id === empId && x.overtime_date === iso && x.id !== skipId &&
        ['APPROVED', 'AUTO_APPROVED'].indexOf(x.overtime_status) >= 0;
    }).reduce(function (s, x) { return s + (x.approved_hours || 0); }, 0);
  }
  function derive(iso, hours, skipId) {
    var out = { mode: null, category: null, extra: null, already: 0 };
    if (!iso) return out;
    out.mode = iso < TODAY ? 'RETROACTIVE' : 'PRE';
    var wd = new Date(iso + 'T00:00:00').getDay();
    var hol = T.HOLIDAYS.filter(function (h) { return h.holiday_date === iso && h.approval_status === 'APPROVED' && h.holiday_type !== 'REGIONAL'; })[0];
    out.category = hol ? 'PUBLIC_HOLIDAY' : (wd === 0 || wd === 6) ? 'WEEKLY_REST' : 'WORKDAY';
    out.already = approvedOn(SESS.id, iso, skipId);
    if (hours && out.already + hours > T.DAILY_HOUR_CAP) out.extra = 'DAILY_CAP_EXCEEDED';
    return out;
  }

  // ---------- list ----------
  function viewBtn(o) { return '<div class="rowmenu"><button type="button" class="rowmenu__trigger" data-oview="' + o.id + '">View Detail</button></div>'; }
  function otActions(o) {
    // A row born from on-call attendance detection has no write surface anywhere (K40).
    if (o.is_auto) return '<div class="rowacts"><span class="cell-dim">Automatic</span>' + viewBtn(o) + '</div>';
    var items = [];
    if (o.overtime_status === 'PENDING_APPROVAL') {
      if (o.employee_id === SESS.id && canFile()) {
        items.push({ label: 'Edit', icon: 'pencil', attr: 'data-oedit="' + o.id + '"' });
        items.push({ label: 'Withdraw', icon: 'undo-2', attr: 'data-owd="' + o.id + '"', danger: true });
      } else if (isApprover()) {
        items.push({ label: 'Approve', icon: 'check', attr: 'data-oapr="' + o.id + '"' });
        items.push({ label: 'Reject', icon: 'x', attr: 'data-orej="' + o.id + '"', danger: true });
      }
    }
    if (!items.length) return viewBtn(o);
    items.push({ label: 'View Detail', icon: 'eye', attr: 'data-oview="' + o.id + '"' });
    return F.rowMenu(items);
  }

  function visibleOt() {
    return OT.filter(function (o) {
      if (!canSearchAll() && o.employee_id !== SESS.id) return false;
      if (flt.status && o.overtime_status !== flt.status) return false;
      if (flt.mode && o.submission_mode !== flt.mode) return false;
      if (flt.cat && o.overtime_category !== flt.cat) return false;
      if (flt.from && o.overtime_date < flt.from) return false;
      if (flt.to && o.overtime_date > flt.to) return false;
      if (flt.name && T.emp(o.employee_id).name.toLowerCase().indexOf(flt.name.toLowerCase()) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.overtime_date < b.overtime_date ? 1 : -1; });
  }

  function drawOt() {
    var all = visibleOt(), view = pgOt.slice(all);
    $('cntOt').textContent = all.length;
    $('otBody').innerHTML = view.length ? view.map(function (o) {
      return '<tr>' +
        '<td class="cell-strong">' + T.d(o.overtime_date) +
          (o.submission_mode === 'RETROACTIVE' ? ' <span class="tm-flag">Retroactive</span>' : '') + '</td>' +
        '<td>' + T.person(o.employee_id) + '</td>' +
        '<td>' + T.badge(o.submission_mode, T.LABEL.ot_mode) + '</td>' +
        '<td>' + T.badge(o.overtime_category, T.LABEL.ot_category) + '</td>' +
        '<td class="ta-r">' + hrs(o.requested_hours) + '</td>' +
        '<td class="ta-r">' + hrs(o.approved_hours) + '</td>' +
        '<td>' + T.badge(o.overtime_status, T.LABEL.ot_status) + '</td>' +
        '<td class="cell-dim">' + (o.requires_extra_approval_reason ? T.LABEL.extra_reason[o.requires_extra_approval_reason] : '—') + '</td>' +
        '<td>' + otActions(o) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="9"><div class="tempty"><div class="tempty__t">No overtime request matches these filters.</div></div></td></tr>';
    pgOt.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function drawOtd() {
    var all = OTD.filter(function (o) {
      if (!canSearchAll() && o.employee_id !== SESS.id) return false;
      if (fltD.cat && o.overtime_category !== fltD.cat) return false;
      if (fltD.from && o.overtime_date < fltD.from) return false;
      if (fltD.to && o.overtime_date > fltD.to) return false;
      if (fltD.name && T.emp(o.employee_id).name.toLowerCase().indexOf(fltD.name.toLowerCase()) < 0) return false;
      return true;
    })
      .sort(function (a, b) { return a.overtime_date < b.overtime_date ? 1 : -1; });
    var view = pgOtd.slice(all);
    $('cntOtd').textContent = all.length;
    $('otdBody').innerHTML = view.length ? view.map(function (o) {
      return '<tr>' +
        '<td class="cell-strong">' + T.d(o.overtime_date) + '</td>' +
        '<td>' + T.emp(o.employee_id).name + '</td>' +
        '<td class="ta-r">' + hrs(o.actual_hours) + '</td>' +
        '<td class="ta-r">' + hrs(o.approved_hours_total) + '</td>' +
        '<td class="ta-r"><span class="tm-num" style="font-weight:700">' + T.num(o.payable_hours, 2) + '</span></td>' +
        '<td>' + T.badge(o.overtime_category, T.LABEL.ot_category) + '</td>' +
        '<td class="cell-mono">' + (o.overtime_request_id || '<span class="cell-dim">—</span>') + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty"><div class="tempty__t">No daily overtime fact recorded yet.</div><div class="tempty__s">A row is only born by recomputation — punch data on a date that carries an approved request.</div></div></td></tr>';
    pgOtd.paint();
  }

  // ---------- form ----------
  function preview() {
    var iso = $('ofDate').dataset.iso, hours = parseFloat($('ofHours').value);
    var d = derive(iso, hours, editOt ? editOt.id : null);
    $('ofReasonStar').style.display = (iso && iso < TODAY) ? '' : 'none';
    $('ofDerived').innerHTML = '<div class="tm-derived__h">Server-derived preview</div>' +
      '<div class="tm-derived__r">Submission mode <b>' + (d.mode ? T.LABEL.ot_mode[d.mode] : '—') + '</b></div>' +
      '<div class="tm-derived__r">Category <b>' + (d.category ? T.LABEL.ot_category[d.category] : '—') + '</b></div>' +
      '<div class="tm-derived__r">Approval layer trigger <b>' + (d.extra ? T.LABEL.extra_reason[d.extra] : 'Not raised') + '</b>' +
        (d.extra ? ' <span style="color:var(--color-warning-600)">— ' + T.num(d.already, 2) + ' h already approved on this date + ' + T.num(hours || 0, 2) + ' h requested exceeds the ' + T.num(T.DAILY_HOUR_CAP, 2) + ' h daily cap. This <strong>lifts</strong> the request to another approval layer; it is never a refusal, and the excess is still recorded truthfully.</span>' : '') +
        '</div>' +
      '<div class="tm-derived__r" style="color:var(--fg-3)">Anything the client sends for these three fields is ignored entirely. The category here is an indication for the approver, not the final fact — the daily summary carries the final one and may differ if the day\u2019s status changes later.</div>';
    return d;
  }

  function openForm(o) {
    editOt = o || null;
    $('ofTitle').textContent = o ? 'Edit overtime request' : 'Request overtime';
    $('ofWho').value = T.emp(SESS.id).name;
    F.setDate($('ofDate'), o ? o.overtime_date : '');
    $('ofHours').value = o ? o.requested_hours : '';
    $('ofReason').value = o ? (o.request_reason || '') : '';
    $('ofSave').textContent = o ? 'Save changes' : 'Submit request';
    preview();
    F.openModal('otForm');
  }

  function save() {
    var iso = $('ofDate').dataset.iso, hours = parseFloat($('ofHours').value);
    var reason = $('ofReason').value.trim(), d = preview();
    if (editOt && editOt.overtime_status !== 'PENDING_APPROVAL') { F.toast('422 — the decision has already landed; editing is no longer lawful. File a new request instead.', 'danger'); return; }
    if (!iso) { F.toast('422 — the overtime date is required.', 'danger'); return; }
    if (isNaN(hours) || hours <= 0) { F.toast('422 — hours requested must be greater than zero.', 'danger'); return; }
    if (d.mode === 'RETROACTIVE' && !reason) { F.toast('422 — a retroactive request needs a written reason.', 'danger'); return; }
    if (d.mode === 'RETROACTIVE' && iso < shift(TODAY, -RETRO_WINDOW_DAYS)) { F.toast('422 — that date is outside the retroactive window of ' + RETRO_WINDOW_DAYS + ' days.', 'danger'); return; }
    var clash = OT.filter(function (x) {
      return x.employee_id === SESS.id && x.overtime_date === iso && x.overtime_status === 'PENDING_APPROVAL' && (!editOt || x.id !== editOt.id);
    })[0];
    if (clash) { F.toast('409 — a live pending request already exists on that date; two approvers must never decide the same day blind to each other.', 'danger'); return; }
    if (editOt) {
      Object.assign(editOt, { overtime_date: iso, submission_mode: d.mode, requested_hours: hours, request_reason: reason, overtime_category: d.category, requires_extra_approval_reason: d.extra });
      F.toast('200 — request updated; the approver now sees the recomputed figures, not the original ones.', 'ok');
    } else {
      OT.push({
        id: 'ot-' + (OT.length + 10), employee_id: SESS.id, overtime_date: iso,
        submission_mode: d.mode, overtime_category: d.category, requested_hours: hours,
        approved_hours: null, overtime_status: 'PENDING_APPROVAL',
        requires_extra_approval_reason: d.extra, request_reason: reason,
        submitted_at: TODAY + 'T14:00:00+07:00', approved_at: null, approved_by: null,
        workflow_instance_id: 'wf-ot-new', is_auto: false, oncall_assignment_id: null
      });
      F.toast('201 — request filed as Pending approval; the hours are not payable until a decision lands.', 'ok');
    }
    F.closeModal('otForm'); pgOt.reset(); drawOt();
  }

  // ---------- daily recompute (machine only) ----------
  function recomputeDaily(o) {
    var row = OTD.filter(function (x) { return x.employee_id === o.employee_id && x.overtime_date === o.overtime_date; })[0];
    var ceiling = approvedOn(o.employee_id, o.overtime_date, null);
    if (!row) return false; // no punch fact on that date yet — the projection row is not born by an approval alone
    row.approved_hours_total = ceiling;
    row.payable_hours = Math.min(row.actual_hours, ceiling);
    if (!row.overtime_request_id) row.overtime_request_id = o.id;
    drawOtd();
    return true;
  }

  function detailRows(o) {
    return [
      ['Employee', T.emp(o.employee_id).name], ['Overtime date', T.d(o.overtime_date)],
      ['Mode', T.LABEL.ot_mode[o.submission_mode]], ['Category (at submit)', T.LABEL.ot_category[o.overtime_category]],
      ['Hours requested', o.requested_hours === null ? 'None — born from on-call attendance detection' : T.num(o.requested_hours, 2)],
      ['Hours approved', o.approved_hours === null ? '—' : T.num(o.approved_hours, 2) +
        (o.is_auto ? ' <span class="cell-dim">— a frozen copy of the standby window\u2019s <code>max_callout_hours</code>, never re-read from config at recompute</span>' : '')],
      ['Reason', o.request_reason || '—'],
      ['On-call window', o.oncall_assignment_id || '—'],
      ['Workflow instance', o.workflow_instance_id || '<span class="cell-dim">— a call-out row runs no approval workflow; its authorisation was granted up front on the roster</span>'],
      ['Created by', o.is_auto ? 'SYSTEM <span class="cell-mono cell-dim">00000000-0000-0000-0000-000000000000</span>' : T.emp(o.employee_id).name],
      ['Approval layer trigger', o.requires_extra_approval_reason ? T.LABEL.extra_reason[o.requires_extra_approval_reason] : 'Not raised'],
      ['Status', T.badge(o.overtime_status, T.LABEL.ot_status)],
      ['Submitted', T.dt(o.submitted_at)],
      ['Decided by', o.approved_by ? T.emp(o.approved_by).name + ' · ' + T.dt(o.approved_at) : '—']
    ];
  }

  // ---------- filter summary (front shows one button; the fields live in a modal) ----------
  function sumTxt(parts) { return parts.length ? parts.join(' · ') : 'No filter applied'; }
  function paintSum() {
    var p = [];
    if (flt.status) p.push(T.LABEL.ot_status[flt.status]);
    if (flt.mode) p.push(T.LABEL.ot_mode[flt.mode]);
    if (flt.cat) p.push(T.LABEL.ot_category[flt.cat]);
    if (flt.from || flt.to) p.push((flt.from ? T.d(flt.from) : '…') + ' → ' + (flt.to ? T.d(flt.to) : '…'));
    if (flt.name) p.push('“' + flt.name + '”');
    $('fltSum').textContent = sumTxt(p);
    var q = [];
    if (fltD.cat) q.push(T.LABEL.ot_category[fltD.cat]);
    if (fltD.from || fltD.to) q.push((fltD.from ? T.d(fltD.from) : '…') + ' → ' + (fltD.to ? T.d(fltD.to) : '…'));
    if (fltD.name) q.push('“' + fltD.name + '”');
    $('fltDSum').textContent = sumTxt(q);
  }

  function resetFilters(which) {
    var sels = which === 'daily' ? ['fltDCat'] : ['fltStatus', 'fltMode', 'fltCat'];
    sels.forEach(function (id) {
      var el = $(id), first = el.querySelector('.dropdown__opt');
      el.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
      first.classList.add('is-sel');
      el.querySelector('.ctl__value').textContent = first.textContent;
    });
    (which === 'daily' ? ['fltDFrom', 'fltDTo'] : ['fltFrom', 'fltTo']).forEach(function (id) { F.setDate($(id), ''); });
    if (which === 'daily') { fltD.cat = ''; fltD.from = ''; fltD.to = ''; pgOtd.reset(); drawOtd(); }
    else { flt.status = ''; flt.mode = ''; flt.cat = ''; flt.from = ''; flt.to = ''; pgOt.reset(); drawOt(); }
    paintSum();
  }

  // ---------- session ----------
  function applySession() {
    $('essTxt').innerHTML = isApprover()
      ? '<strong>Approver view (' + SESS.role + ').</strong> The whole pending queue is listed (<code>ix_emp_overtime_request_pending</code>). Your own rows carry no decision action — separation of duties is enforced server-side (<code>403</code>), not merely hidden here. Filing is absent: <code>overtime-request:create</code> is an <code>EMPLOYEE</code> scope, so overtime is never filed on anyone\u2019s behalf.'
      : SESS.role === 'HR_STAFF'
        ? '<strong>Reader view (HR_STAFF).</strong> <code>overtime-request:search</code> opens the whole queue across employees, but <code>overtime-request:approve</code> is held only by <code>HR_MANAGER</code> · <code>DEPT_MANAGER</code> and <code>overtime-request:create</code> only by <code>EMPLOYEE</code> — neither a decision nor a filing surface exists for you here.'
        : '<strong>ESS mode.</strong> Same screen, same endpoint — the rows are narrowed to <strong>' + T.emp(SESS.id).name + '</strong> from the identity claim, and no decision action exists for you at all.';
    $('newOtBtn').classList.toggle('is-hidden', !canFile());
    pgOt.reset(); pgOtd.reset(); drawOt(); drawOtd(); paintSum();
  }

  document.addEventListener('DOMContentLoaded', function () {
    F.wireSelects(document);
    T.fillSelect('viewAs', VIEWERS.map(function (v, i) {
      return '<div class="dropdown__opt' + (i === 0 ? ' is-sel' : '') + '" data-val="' + v.id + '">' + roleLabel(v) + '</div>';
    }).join(''));
    applySession();

    $('viewAs').addEventListener('select', function (e) {
      var v = VIEWERS.filter(function (x) { return x.id === e.detail.value; })[0];
      if (v) { SESS = v; applySession(); }
    });
    $('fltStatus').addEventListener('select', function (e) { flt.status = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgOt.reset(); drawOt(); });
    $('fltMode').addEventListener('select', function (e) { flt.mode = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgOt.reset(); drawOt(); });
    $('fltCat').addEventListener('select', function (e) { flt.cat = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgOt.reset(); drawOt(); });
    $('fltFrom').addEventListener('datechange', function () { flt.from = this.dataset.iso || ''; pgOt.reset(); drawOt(); });
    $('fltTo').addEventListener('datechange', function () { flt.to = this.dataset.iso || ''; pgOt.reset(); drawOt(); });
    $('fltName').addEventListener('input', function () { flt.name = this.value.trim(); pgOt.reset(); drawOt(); });
    $('fltDCat').addEventListener('select', function (e) { fltD.cat = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgOtd.reset(); drawOtd(); });
    $('fltDFrom').addEventListener('datechange', function () { fltD.from = this.dataset.iso || ''; pgOtd.reset(); drawOtd(); });
    $('fltDTo').addEventListener('datechange', function () { fltD.to = this.dataset.iso || ''; pgOtd.reset(); drawOtd(); });
    $('fltDName').addEventListener('input', function () { fltD.name = this.value.trim(); pgOtd.reset(); drawOtd(); });
    document.addEventListener('change', paintSum);
    ['fltStatus', 'fltMode', 'fltCat', 'fltDCat'].forEach(function (id) { $(id).addEventListener('select', paintSum); });
    ['fltFrom', 'fltTo', 'fltDFrom', 'fltDTo'].forEach(function (id) { $(id).addEventListener('datechange', paintSum); });
    ['fltName', 'fltDName'].forEach(function (id) { $(id).addEventListener('input', paintSum); });

    var fmWhich = 'requests';
    function openFilter(which) {
      fmWhich = which;
      $('fmTitle').textContent = which === 'daily' ? 'Filter daily summary' : 'Filter requests';
      $('fgReq').classList.toggle('is-hidden', which === 'daily');
      $('fgDaily').classList.toggle('is-hidden', which !== 'daily');
      F.openModal('otFilter');
    }
    $('fltBtn').addEventListener('click', function () { openFilter('requests'); });
    $('fltDBtn').addEventListener('click', function () { openFilter('daily'); });
    $('fmReset').addEventListener('click', function () { resetFilters(fmWhich); });

    $('newOtBtn').addEventListener('click', function () { openForm(null); });
    $('ofSave').addEventListener('click', save);
    $('ofDate').addEventListener('datechange', preview);
    $('ofHours').addEventListener('input', preview);

    $('otBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-oview],[data-oedit],[data-oapr],[data-orej],[data-owd]'); if (!t) return;
      var id = t.getAttribute('data-oview') || t.getAttribute('data-oedit') || t.getAttribute('data-oapr') || t.getAttribute('data-orej') || t.getAttribute('data-owd');
      var o = T.byId(OT, id);
      if (t.hasAttribute('data-oedit')) { openForm(o); return; }
      if (t.hasAttribute('data-owd')) {
        wdOt = o;
        $('owKv').innerHTML = kv([['Request', o.id], ['Date', T.d(o.overtime_date)], ['Hours requested', T.num(o.requested_hours, 2)]]);
        F.openModal('otWithdraw'); return;
      }
      if (t.hasAttribute('data-oview')) {
        $('ovKv').innerHTML = kv(detailRows(o));
        F.openModal('otView'); return;
      }
      decOt = o;
      var sod = o.employee_id === SESS.id;
      var head = T.emp(o.employee_id).name + ' · ' + T.d(o.overtime_date) +
        (o.submission_mode === 'RETROACTIVE' ? ' (Retroactive)' : '') + ' · ' + T.num(o.requested_hours, 2) + ' h requested';
      var trigger = o.requires_extra_approval_reason
        ? '<div class="note note--warn"><i data-lucide="alert-triangle"></i><span>' + T.LABEL.extra_reason[o.requires_extra_approval_reason] + ' — the excess is recorded truthfully; the trigger lifts this request to another approval layer and is <strong>never</strong> in itself a reason to refuse it (O-3).</span></div>'
        : '';
      if (t.hasAttribute('data-oapr')) {
        $('oaHead').textContent = head;
        $('oaReason').textContent = o.request_reason ? '\u201C' + o.request_reason + '\u201D' : 'No written reason was given.';
        $('oaTrigger').innerHTML = trigger;
        $('oaHours').value = T.num(o.requested_hours, 2);
        $('oaNote').value = '';
        $('oaGo').disabled = sod;
        F.openModal('otApprove');
      } else {
        $('orHead').textContent = head;
        $('orReason').textContent = o.request_reason ? '\u201C' + o.request_reason + '\u201D' : 'No written reason was given.';
        $('orTrigger').innerHTML = trigger;
        $('orNote').value = '';
        $('orGo').disabled = sod;
        F.openModal('otReject');
      }
      if (window.lucide) window.lucide.createIcons();
    });

    function decide(kind, modal) {
      var o = decOt, approved = parseFloat($('oaHours').value);
      if (o.employee_id === SESS.id) { F.toast('403 — separation of duties: the approver may never be the requester.', 'danger'); return; }
      if (o.overtime_status !== 'PENDING_APPROVAL') { F.toast('422 — only a pending request can be decided.', 'danger'); return; }
      if (kind === 'APPROVED') {
        if (isNaN(approved) || approved <= 0) { F.toast('422 — the approved hours are required when approving.', 'danger'); return; }
        if (approved > o.requested_hours) { F.toast('422 — the approved hours may be trimmed below the request, never raised above it.', 'danger'); return; }
      }
      F.closeModal(modal);
      F.toast('200 — decision accepted and forwarded to the workflow engine.', 'info');
      setTimeout(function () {
        o.overtime_status = kind;
        o.approved_hours = kind === 'APPROVED' ? approved : null;
        o.approved_at = TODAY + 'T11:00:00+07:00';
        o.approved_by = SESS.id;
        drawOt();
        var recomputed = kind === 'APPROVED' ? recomputeDaily(o) : false;
        F.toast(kind === 'APPROVED'
          ? (recomputed
            ? 'Process finished — the daily summary was recomputed; payable hours is the lesser of actual and the approved ceiling.'
            : 'Process finished — approved. No daily fact exists for that date yet: the projection row is only born once punch data lands, never from an approval alone.')
          : 'Process finished — the request is rejected and those hours are never payable.', kind === 'APPROVED' ? 'ok' : 'warn');
      }, 1400);
    }
    $('oaGo').addEventListener('click', function () { decide('APPROVED', 'otApprove'); });
    $('orGo').addEventListener('click', function () { decide('REJECTED', 'otReject'); });
    $('owConfirm').addEventListener('click', function () {
      if (wdOt.overtime_status !== 'PENDING_APPROVAL') { F.toast('422 — the decision has already landed; a decided request cannot be withdrawn.', 'danger'); return; }
      wdOt.overtime_status = 'CANCELLED';
      F.closeModal('otWithdraw'); drawOt();
      F.toast('200 — request withdrawn (soft-delete: the row stays readable as Cancelled); hours already worked against it do not become payable overtime.', 'ok');
    });
  });
})();
