// ============================================================
// SEVAKA HRIS — Time › On Call Schedule
// FSD-001-TIME §10 · UIC-001-TIME §12
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var OC = T.ONCALL.map(function (o) { return Object.assign({}, o); });
  var editOc = null, decideOc = null, cancelOc = null;
  // UIC §11.5 field search: employee_id(=), oncall_status(IN), standby_start_at(BETWEEN). Nothing beyond that.
  var flt = { status: '', from: '', to: '', name: '' };
  var $ = function (id) { return document.getElementById(id); };
  var pgOc = F.pager('pgOc', 10, function () { drawOc(); }, 'standby windows');

  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || ''; v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }
  function windowLabel(o) { return T.dt(o.standby_start_at) + ' → ' + T.dt(o.standby_end_at); }

  function ocActions(o) {
    var items = [];
    if (o.oncall_status === 'PENDING_APPROVAL') {
      items.push({ label: 'Edit', icon: 'pencil', attr: 'data-oedit="' + o.id + '"' });
      if (o.created_by !== T.ME) items.push({ label: 'Review', icon: 'gavel', attr: 'data-odec="' + o.id + '"' });
    }
    if (['PENDING_APPROVAL', 'SCHEDULED'].indexOf(o.oncall_status) >= 0) {
      items.push({ label: 'Cancel window', icon: 'x-circle', attr: 'data-ocan="' + o.id + '"', danger: true });
    }
    items.push({ label: 'View Detail', icon: 'eye', attr: 'data-oview="' + o.id + '"' });
    if (items.length === 1) return '<div class="rowacts"><button class="rowbtn" data-oview="' + o.id + '">View Detail</button></div>';
    return F.rowMenu(items);
  }

  function drawOc() {
    var all = OC.filter(function (o) {
      if (flt.status && o.oncall_status !== flt.status) return false;
      if (flt.from && o.standby_start_at.slice(0, 10) < flt.from) return false;
      if (flt.to && o.standby_start_at.slice(0, 10) > flt.to) return false;
      if (flt.name && T.emp(o.employee_id).name.toLowerCase().indexOf(flt.name.toLowerCase()) < 0) return false;
      return true;
    }).sort(function (a, b) { return a.standby_start_at < b.standby_start_at ? -1 : 1; });
    var view = pgOc.slice(all);
    $('ocBody').innerHTML = view.map(function (o) {
      return '<tr>' +
        '<td>' + T.person(o.employee_id) + '</td>' +
        '<td>' + windowLabel(o) + '</td>' +
        '<td class="ta-r"><span class="tm-num">' + T.num(o.max_callout_hours, 2) + '</span></td>' +
        '<td class="cell-dim">' + (o.requires_extra_approval_reason ? '<span class="tm-flag">' + T.LABEL.extra_reason[o.requires_extra_approval_reason] + '</span>' : '—') + '</td>' +
        '<td>' + T.badge(o.oncall_status, T.LABEL.oncall) + '</td>' +
        '<td class="cell-dim">' + T.emp(o.created_by).name + '</td>' +
        '<td class="cell-dim">' + (o.approved_by ? T.emp(o.approved_by).name : '—') + '</td>' +
        '<td>' + ocActions(o) + '</td>' +
        '</tr>';
    }).join('');
    pgOc.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- form ----------------
  function stamp(dateEl, timeEl) {
    var iso = $(dateEl).dataset.iso, t = $(timeEl).value;
    return iso && t ? iso + 'T' + t + ':00+07:00' : null;
  }
  function ofPreview() {
    var cap = parseFloat($('ofCap').value);
    var over = !isNaN(cap) && cap > T.DAILY_HOUR_CAP;
    $('ofCapWarn').classList.toggle('is-hidden', !over);
    $('ofCapVal').textContent = T.DAILY_HOUR_CAP;
    var s = stamp('ofStartDate', 'ofStartTime'), e = stamp('ofEndDate', 'ofEndTime');
    var hours = s && e ? Math.round((new Date(e) - new Date(s)) / 36e5 * 100) / 100 : null;
    $('ofDerived').innerHTML = '<div class="tm-derived__h">Server-derived</div>' +
      '<div class="tm-derived__r">Window length <b>' + (hours !== null && hours > 0 ? hours.toFixed(2) + ' hours' : '—') + '</b></div>' +
      '<div class="tm-derived__r">Extra approval layer <b>' + (over ? T.LABEL.extra_reason.MAX_CALLOUT_EXCEEDS_DAILY_CAP : 'Not raised') + '</b></div>' +
      '<div class="tm-derived__r">Initial status <b>Pending approval</b></div>' +
      '<div class="tm-derived__r" style="color:var(--fg-3)">Never a form field — the banner is recomputed on every keystroke of the ceiling, and the status only moves on an approver\u2019s decision or a cancellation.</div>';
  }
  function openForm(o) {
    editOc = o || null;
    $('ofTitle').textContent = o ? 'Edit standby window' : 'Schedule standby';
    $('ofEmpLock').classList.toggle('is-hidden', !o);
    $('ofEmp').style.pointerEvents = o ? 'none' : '';
    $('ofEmp').style.opacity = o ? '.65' : '';
    setSel('ofEmp', o ? o.employee_id : '', o ? T.emp(o.employee_id).name : 'Select employee');
    F.setDate($('ofStartDate'), o ? o.standby_start_at.slice(0, 10) : '');
    F.setDate($('ofEndDate'), o ? o.standby_end_at.slice(0, 10) : '');
    $('ofStartTime').value = o ? o.standby_start_at.slice(11, 16) : '';
    $('ofEndTime').value = o ? o.standby_end_at.slice(11, 16) : '';
    $('ofCap').value = o ? o.max_callout_hours : '';
    $('ofNote').value = o ? (o.assignment_note || '') : '';
    ofPreview();
    F.openModal('ocForm');
  }
  function save() {
    var emp = $('ofEmp').dataset.val;
    var s = stamp('ofStartDate', 'ofStartTime'), e = stamp('ofEndDate', 'ofEndTime');
    var cap = parseFloat($('ofCap').value), note = $('ofNote').value.trim();
    if (!emp || !s || !e) { F.toast('422 — employee and both ends of the standby window are required.', 'danger'); return; }
    if (new Date(e) <= new Date(s)) { F.toast('422 — the window must end after it starts.', 'danger'); return; }
    if (isNaN(cap) || cap <= 0) { F.toast('422 — the ceiling per call-out must be greater than zero.', 'danger'); return; }
    var clash = OC.filter(function (x) {
      if (x === editOc || x.employee_id !== emp) return false;
      if (['PENDING_APPROVAL', 'SCHEDULED', 'ACTIVE'].indexOf(x.oncall_status) < 0) return false;
      return new Date(s) < new Date(x.standby_end_at) && new Date(e) > new Date(x.standby_start_at);
    })[0];
    if (clash) { F.toast('409 — this employee already has a live standby window overlapping that range.', 'danger'); return; }
    var extra = cap > T.DAILY_HOUR_CAP ? 'MAX_CALLOUT_EXCEEDS_DAILY_CAP' : null;
    if (editOc) {
      if (editOc.oncall_status !== 'PENDING_APPROVAL') { F.toast('422 — a window can only be edited while it is still pending.', 'danger'); return; }
      Object.assign(editOc, { standby_start_at: s, standby_end_at: e, max_callout_hours: cap, assignment_note: note, requires_extra_approval_reason: extra });
      F.toast('200 — standby window updated.' + (extra ? ' The extra approval layer stays lit.' : ' The extra approval layer is out.'), 'ok');
    } else {
      OC.push({
        id: 'oc-' + (OC.length + 10), employee_id: emp, standby_start_at: s, standby_end_at: e,
        max_callout_hours: cap, oncall_status: 'PENDING_APPROVAL', requires_extra_approval_reason: extra,
        assignment_note: note, created_by: T.ME, approved_by: null
      });
      F.toast('201 — standby window saved as Pending approval.' + (extra ? ' Its ceiling passes the daily cap, so an HR layer is required.' : ''), 'ok');
    }
    F.closeModal('ocForm'); pgOc.reset(); drawOc();
  }

  function paintSum() {
    var p = [];
    if (flt.status) p.push(T.LABEL.oncall[flt.status]);
    if (flt.from || flt.to) p.push((flt.from ? T.d(flt.from) : '\u2026') + ' \u2192 ' + (flt.to ? T.d(flt.to) : '\u2026'));
    if (flt.name) p.push('\u201c' + flt.name + '\u201d');
    $('fltSum').textContent = p.length ? p.join(' \u00b7 ') : '';
  }

  document.addEventListener('DOMContentLoaded', function () {
    T.fillSelect('ofEmp', T.EMPLOYEES.filter(function (e) { return e.id !== 'emp-sys'; })
      .map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + '</div>'; }).join(''));
    drawOc();
    $('newOcBtn').addEventListener('click', function () { openForm(null); });
    $('fltBtn').addEventListener('click', function () { F.openModal('ocFilter'); });
    $('fltStatus').addEventListener('select', function (e) { flt.status = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgOc.reset(); drawOc(); paintSum(); });
    $('fltFrom').addEventListener('datechange', function () { flt.from = this.dataset.iso || ''; pgOc.reset(); drawOc(); paintSum(); });
    $('fltTo').addEventListener('datechange', function () { flt.to = this.dataset.iso || ''; pgOc.reset(); drawOc(); paintSum(); });
    $('fltName').addEventListener('input', function () { flt.name = this.value.trim(); pgOc.reset(); drawOc(); paintSum(); });
    $('fmReset').addEventListener('click', function () {
      var sel = $('fltStatus'), first = sel.querySelector('.dropdown__opt');
      sel.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o === first); });
      sel.querySelector('.ctl__value').textContent = first.textContent;
      ['fltFrom', 'fltTo'].forEach(function (id) { F.setDate($(id), ''); });
      $('fltName').value = '';
      flt = { status: '', from: '', to: '', name: '' };
      pgOc.reset(); drawOc(); paintSum();
    });
    $('ofSave').addEventListener('click', save);
    $('ofCap').addEventListener('input', ofPreview);
    ['ofStartDate', 'ofEndDate'].forEach(function (id) { $(id).addEventListener('datechange', ofPreview); });
    ['ofStartTime', 'ofEndTime'].forEach(function (id) { $(id).addEventListener('input', ofPreview); });
    $('ofEmp').addEventListener('select', function (e) { $('ofEmp').dataset.val = e.detail.value; });

    $('ocBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-oview],[data-oedit],[data-odec],[data-ocan]'); if (!t) return;
      var o = T.byId(OC, t.getAttribute('data-oview') || t.getAttribute('data-oedit') || t.getAttribute('data-odec') || t.getAttribute('data-ocan'));
      if (t.hasAttribute('data-oedit')) { openForm(o); return; }
      if (t.hasAttribute('data-ocan')) {
        cancelOc = o;
        $('ocKv').innerHTML = kv([['Employee', T.emp(o.employee_id).name], ['Window', windowLabel(o)], ['Status', T.badge(o.oncall_status, T.LABEL.oncall)]]);
        F.openModal('ocCancel');
        return;
      }
      decideOc = o;
      $('odKv').innerHTML = kv([
        ['On-call employee', T.emp(o.employee_id).name], ['Window', windowLabel(o)],
        ['Ceiling per call-out', T.num(o.max_callout_hours, 2) + ' hours'],
        ['Note', o.assignment_note || '—'],
        ['Status', T.badge(o.oncall_status, T.LABEL.oncall)],
        ['Drafted by', T.emp(o.created_by).name],
        ['Decided by', o.approved_by ? T.emp(o.approved_by).name : '—']
      ]);
      $('odExtra').classList.toggle('is-hidden', !o.requires_extra_approval_reason);
      $('odNote').value = '';
      var can = o.oncall_status === 'PENDING_APPROVAL' && o.created_by !== T.ME;
      $('odApprove').disabled = !can; $('odReject').disabled = !can;
      F.openModal('ocDecision');
    });

    function decide(kind) {
      var o = decideOc;
      F.closeModal('ocDecision');
      F.toast('200 — decision accepted and forwarded.', 'info');
      setTimeout(function () {
        o.oncall_status = kind === 'APPROVED' ? 'SCHEDULED' : 'REJECTED';
        o.approved_by = T.ME;
        drawOc();
        F.toast(kind === 'APPROVED'
          ? 'Process finished — the window is Scheduled and now authorises call-outs up to its ceiling.'
          : 'Process finished — the window is Rejected and will never issue a call-out.', kind === 'APPROVED' ? 'ok' : 'warn');
      }, 1400);
    }
    $('odApprove').addEventListener('click', function () { decide('APPROVED'); });
    $('odReject').addEventListener('click', function () { decide('REJECTED'); });
    $('ocConfirm').addEventListener('click', function () {
      cancelOc.oncall_status = 'CANCELLED';
      F.closeModal('ocCancel'); drawOc();
      F.toast('200 — window cancelled; the row stays in the record rather than disappearing.', 'ok');
    });
  });
})();
