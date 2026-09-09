// ============================================================
// SEVAKA HRIS — Time › Attendance (punch · daily summary · correction)
// FSD-001-TIME §5 · UIC-001-TIME §6
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var PUN = T.PUNCHES.map(function (p) { return Object.assign({}, p); });
  var DAY = T.DAILY.map(function (d) { return Object.assign({}, d); });
  var COR = T.CORRECTIONS.map(function (c) { return Object.assign({}, c); });
  var TODAY = '2026-07-30';
  // UIC §6.3.4 — the approver never picks the excused reason; it is derived from the reason type.
  var EXCUSED_MAP = { FORGOT_PUNCH: 'APPROVED_CORRECTION', OTHER: 'APPROVED_CORRECTION', APP_ERROR: 'APP_ERROR', OFFICIAL_TRAVEL: 'OFFICIAL_TRAVEL' };

  // Scope holders per UIC §6: create = HR_STAFF · EMPLOYEE; approve = HR_MANAGER · DEPT_MANAGER;
  // summary:search excludes EMPLOYEE; punch:search is investigative (SUPER_ADMIN · HR_MANAGER).
  var VIEWERS = [
    { id: 'emp-rina', role: 'EMPLOYEE' },
    { id: 'emp-sari', role: 'HR_STAFF' },
    { id: 'emp-hendra', role: 'HR_MANAGER' }
  ];
  var SESS = VIEWERS[0];
  function roleLabel(v) { return T.emp(v.id).name + ' — ' + v.role; }
  function canCreate() { return SESS.role === 'EMPLOYEE' || SESS.role === 'HR_STAFF'; }
  function canApprove() { return SESS.role === 'HR_MANAGER' || SESS.role === 'DEPT_MANAGER'; }
  function canSearchSummary() { return SESS.role !== 'EMPLOYEE'; }
  function canSearchPunch() { return SESS.role === 'HR_MANAGER'; }

  var fltDay = { status: '', day_type: '', excused: '', name: '' };
  var fltTap = { type: '', geo: '', mock: '', name: '' };
  var fltCor = { status: '', reason: '', name: '' };
  var decideCor = null, decideKind = 'APPROVED', wdCor = null, selfieShot = null, camStream = null;
  var $ = function (id) { return document.getElementById(id); };
  var pgDay = F.pager('pgDay', 10, function () { drawDay(); }, 'days');
  var pgTap = F.pager('pgTap', 10, function () { drawTap(); }, 'taps');
  var pgCor = F.pager('pgCor', 10, function () { drawCor(); }, 'corrections');

  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function hm(iso) { return String(iso).slice(11, 16); }
  function hit(id, q) { return !q || T.emp(id).name.toLowerCase().indexOf(q.toLowerCase()) >= 0; }
  function radiusCell(p) {
    if (p.is_within_geofence === true) return '<span class="sb sb--green"><span class="sb__dot"></span>Inside radius</span>';
    if (p.is_within_geofence === false) return '<span class="sb sb--red"><span class="sb__dot"></span>Outside radius</span>';
    return '<span class="sb sb--grey"><span class="sb__dot"></span>Could not be evaluated</span>';
  }
  function flagsCell(p) {
    var out = [];
    if (p.is_mock_location_suspected) out.push('<span class="tm-flag">Mock location suspected</span>');
    if (p.is_work_arrangement_unknown) out.push('<span class="tm-flag">Arrangement unreadable</span>');
    return out.length ? '<div class="tm-flags">' + out.join('') + '</div>' : '<span class="cell-dim">—</span>';
  }
  function mins(n) { return n ? '<span class="tm-num">' + n + '</span>' : '<span class="cell-dim">0</span>'; }
  function excusedCell(d) {
    if (!d.is_excused) return '<span class="cell-dim">—</span>';
    return '<span class="tm-flag">' + (T.LABEL.excused[d.excused_reason] || d.excused_reason) + '</span>';
  }

  // ---------------- session ----------------
  function applySession() {
    $('essTxt').innerHTML = SESS.role === 'EMPLOYEE'
      ? '<strong>ESS mode.</strong> Rows are narrowed from the identity claim, not by a second screen. <code>attendance-summary:search</code> is not an EMPLOYEE scope, so the daily grid shows only your own days; the tap audit search is investigative and closed to you altogether — today\u2019s taps are visible on the Punch tab.'
      : SESS.role === 'HR_STAFF'
        ? '<strong>HR staff.</strong> May file a correction on behalf of a field employee and read the daily summary grid — but holds neither the approval scope nor the investigative tap audit search.'
        : '<strong>Checker.</strong> Holds the approval scope and the investigative tap audit. <code>attendance-correction:create</code> is not an HR_MANAGER scope, so filing is unavailable in this session.';
    $('newCorrBtn').textContent = SESS.role === 'HR_STAFF' ? 'File on behalf' : 'New correction';
    var gate = $('tapGate');
    gate.classList.toggle('is-hidden', canSearchPunch());
    gate.querySelector('span').innerHTML = 'The raw tap audit (<code>attendance-punch:search</code>) is an investigative authority held by HR_MANAGER and SUPER_ADMIN only — a DEPT_MANAGER holding <code>:read</code> still does not hold it. Nothing is loaded here in this session.';
    $('tapWrap').classList.toggle('is-hidden', !canSearchPunch());
    drawPunch(); pgDay.reset(); drawDay(); pgTap.reset(); drawTap(); pgCor.reset(); drawCor();
    syncNewBtn();
  }
  function syncNewBtn() {
    var onCor = document.querySelector('.tabnav__tab.is-on');
    var isCor = onCor && onCor.dataset.tab === 'correction';
    $('newCorrBtn').classList.toggle('is-hidden', !(isCor && canCreate()));
  }

  // ---------------- punch ----------------
  function myArrangement() {
    var row = DAY.filter(function (d) { return d.employee_id === SESS.id && d.work_date === TODAY; })[0];
    return row ? row.work_arrangement : 'WFO';
  }
  function myPoint() {
    var branch = T.emp(SESS.id).branch;
    return T.GEOFENCES.filter(function (g) { return g.scope_ref === branch && g.is_active; })[0] || T.GEOFENCES[0];
  }
  function channel() {
    var g = myPoint(), arr = myArrangement(), r = (g.rules || {})[arr] || { radius: false, selfie: false };
    return { g: g, arr: arr, radius: r.radius, selfie: r.selfie };
  }
  function drawChannel() {
    var c = channel();
    $('pnChannel').querySelector('span').innerHTML = 'Capture channel — <strong>' + T.LABEL.arrangement[c.arr] + '</strong> × <strong>' + c.g.geofence_name + '</strong> (radius ' + c.g.radius_meters + ' m): ' +
      (c.radius ? 'inside the radius is required' : 'no radius requirement') + ', ' + (c.selfie ? 'a selfie is required' : 'no selfie required') + '. The crossing is the rule, not the button.';
    $('pnSelfieFld').classList.toggle('is-hidden', !c.selfie);
  }
  function todayPunches() { return PUN.filter(function (p) { return p.employee_id === SESS.id && p.work_date === TODAY; }); }
  function nextType() {
    var t = todayPunches();
    if (!t.filter(function (p) { return p.punch_type === 'IN'; }).length) return 'IN';
    if (!t.filter(function (p) { return p.punch_type === 'OUT'; }).length) return 'OUT';
    return null;
  }
  function drawPunch() {
    drawChannel();
    var type = nextType(), rows = todayPunches();
    $('pnBtn').textContent = type === 'IN' ? 'TAP IN' : type === 'OUT' ? 'TAP OUT' : 'DAY COMPLETE';
    $('pnBtn').disabled = !type;
    $('pnState').textContent = !rows.length
      ? 'No tap recorded today.'
      : type === 'OUT'
        ? 'Tapped in at ' + hm(rows[0].punch_at) + ' — the day is still open.'
        : 'Both taps recorded. Punch is append-only: there is no edit and no delete here.';
    $('pnBody').innerHTML = rows.length ? rows.map(function (p) {
      return '<tr>' +
        '<td class="cell-strong">' + (p.punch_type === 'IN' ? 'Tap in' : 'Tap out') + '</td>' +
        '<td>' + hm(p.punch_at) + '</td>' +
        '<td>' + T.d(p.work_date) + '</td>' +
        '<td>' + radiusCell(p) + '</td>' +
        '<td>' + flagsCell(p) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="5"><div class="tempty"><div class="tempty__t">Nothing tapped yet today.</div></div></td></tr>';
  }
  function tick() {
    var now = new Date();
    $('pnClock').textContent = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(function (n) { return String(n).padStart(2, '0'); }).join(':');
    $('pnDate').textContent = T.d(TODAY) + ' · Asia/Jakarta (WIB)';
  }

  // ---------------- daily summary ----------------
  function dayRows() {
    return DAY.filter(function (d) {
      if (!canSearchSummary() && d.employee_id !== SESS.id) return false;
      if (fltDay.status && d.attendance_status !== fltDay.status) return false;
      if (fltDay.day_type && d.day_type !== fltDay.day_type) return false;
      if (fltDay.excused === 'YES' && !d.is_excused) return false;
      if (fltDay.excused === 'NO' && d.is_excused) return false;
      return hit(d.employee_id, fltDay.name);
    }).sort(function (a, b) { return a.work_date < b.work_date ? 1 : -1; });
  }
  function drawDay() {
    var all = dayRows(), view = pgDay.slice(all);
    $('cntDay').textContent = all.length;
    $('dayBody').innerHTML = view.length ? view.map(function (d) {
      return '<tr>' +
        '<td class="cell-strong">' + T.d(d.work_date) + '</td>' +
        '<td>' + T.emp(d.employee_id).name + '</td>' +
        '<td class="cell-dim">' + (T.LABEL.day_type[d.day_type] || '—') + '</td>' +
        '<td class="cell-dim">' + T.LABEL.arrangement[d.work_arrangement] + '</td>' +
        '<td>' + (d.expected_in ? d.expected_in + ' – ' + d.expected_out : '<span class="cell-dim">Not scheduled</span>') + '</td>' +
        '<td class="ta-r">' + mins(d.applied_late_tolerance_minutes) + '</td>' +
        '<td>' + T.badge(d.attendance_status, T.LABEL.attendance) + '</td>' +
        '<td class="ta-r">' + mins(d.worked_minutes) + '</td>' +
        '<td class="ta-r">' + (d.late_minutes ? '<span class="tm-num tm-num--neg">' + d.late_minutes + '</span>' : '<span class="cell-dim">0</span>') + '</td>' +
        '<td class="ta-r">' + (d.undertime_minutes ? '<span class="tm-num tm-num--neg">' + d.undertime_minutes + '</span>' : '<span class="cell-dim">0</span>') + '</td>' +
        '<td>' + excusedCell(d) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="11"><div class="tempty"><div class="tempty__t">No day matches these criteria.</div></div></td></tr>';
    pgDay.paint();
  }
  function tapRows() {
    return PUN.filter(function (p) {
      if (fltTap.type && p.punch_type !== fltTap.type) return false;
      if (fltTap.geo === 'IN' && p.is_within_geofence !== true) return false;
      if (fltTap.geo === 'OUT' && p.is_within_geofence !== false) return false;
      if (fltTap.geo === 'NULL' && p.is_within_geofence !== null) return false;
      if (fltTap.mock === 'YES' && !p.is_mock_location_suspected) return false;
      if (fltTap.mock === 'NO' && p.is_mock_location_suspected) return false;
      return hit(p.employee_id, fltTap.name);
    }).sort(function (a, b) { return a.punch_at < b.punch_at ? 1 : -1; });
  }
  function drawTap() {
    if (!canSearchPunch()) { $('tapBody').innerHTML = ''; return; }
    var all = tapRows(), view = pgTap.slice(all);
    $('tapBody').innerHTML = view.length ? view.map(function (p) {
      return '<tr>' +
        '<td class="cell-strong">' + T.dt(p.punch_at) + '</td>' +
        '<td>' + T.emp(p.employee_id).name + '</td>' +
        '<td>' + (p.punch_type === 'IN' ? 'Tap in' : 'Tap out') + '</td>' +
        '<td>' + T.d(p.work_date) + '</td>' +
        '<td>' + radiusCell(p) + '</td>' +
        '<td>' + flagsCell(p) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty"><div class="tempty__t">No tap matches these criteria.</div></div></td></tr>';
    pgTap.paint();
  }

  // ---------------- correction ----------------
  function corRows() {
    return COR.filter(function (c) {
      if (SESS.role === 'EMPLOYEE' && c.employee_id !== SESS.id) return false;
      if (fltCor.status && c.correction_status !== fltCor.status) return false;
      if (fltCor.reason && c.correction_reason_type !== fltCor.reason) return false;
      return hit(c.employee_id, fltCor.name);
    }).sort(function (a, b) { return a.submitted_at < b.submitted_at ? 1 : -1; });
  }
  function corActions(c) {
    var items = [];
    if (c.correction_status === 'PENDING_APPROVAL') {
      if (c.employee_id === SESS.id) items.push({ label: 'Withdraw', icon: 'undo-2', attr: 'data-cwd="' + c.id + '"', danger: true });
      else if (canApprove()) {
        items.push({ label: 'Approve', icon: 'check', attr: 'data-capp="' + c.id + '"' });
        items.push({ label: 'Reject', icon: 'x', attr: 'data-crej="' + c.id + '"', danger: true });
      }
    }
    items.push({ label: 'View Detail', icon: 'eye', attr: 'data-cview="' + c.id + '"' });
    if (items.length === 1) return '<div class="rowacts"><button class="rowbtn rowbtn--ghost" data-cview="' + c.id + '">View Detail</button></div>';
    return F.rowMenu(items);
  }
  function drawCor() {
    var all = corRows(), view = pgCor.slice(all);
    $('cntCor').textContent = all.length;
    $('corBody').innerHTML = view.length ? view.map(function (c) {
      var day = T.byId(DAY, c.attendance_daily_id);
      return '<tr>' +
        '<td class="cell-mono">' + c.id + '</td>' +
        '<td>' + T.emp(c.employee_id).name + '</td>' +
        '<td>' + (day ? T.d(day.work_date) + ' <span class="cell-dim">· ' + T.LABEL.attendance[day.attendance_status] + '</span>' : '—') + '</td>' +
        '<td class="cell-dim">' + (day ? T.emp(day.employee_id).name : '—') + '</td>' +
        '<td>' + T.LABEL.corr_reason[c.correction_reason_type] + '</td>' +
        '<td>' + (c.requested_in || '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + (c.requested_out || '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + T.badge(c.correction_status, T.LABEL.correction) + '</td>' +
        '<td>' + corActions(c) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="9"><div class="tempty"><div class="tempty__t">No correction matches these criteria.</div></div></td></tr>';
    pgCor.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || ''; v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }
  function eligibleDays() {
    var taken = COR.filter(function (c) { return c.correction_status === 'PENDING_APPROVAL'; })
      .map(function (c) { return c.attendance_daily_id; });
    return DAY.filter(function (d) {
      if (taken.indexOf(d.id) >= 0) return false;
      return SESS.role === 'HR_STAFF' ? true : d.employee_id === SESS.id;
    });
  }
  function corDerived() {
    var dayId = $('cfDay').dataset.val, day = dayId ? T.byId(DAY, dayId) : null;
    $('cfDerived').innerHTML = '<div class="tm-derived__h">Frozen snapshot of the day being corrected</div>' +
      (day
        ? '<div class="tm-derived__r">Day owner <b>' + T.emp(day.employee_id).name + '</b></div>' +
          '<div class="tm-derived__r">Current verdict <b>' + T.LABEL.attendance[day.attendance_status] + '</b></div>' +
          '<div class="tm-derived__r">Expected hours <b>' + (day.expected_in ? day.expected_in + ' – ' + day.expected_out : '—') + '</b></div>' +
          '<div class="tm-derived__r">Applied tolerance <b>' + day.applied_late_tolerance_minutes + ' minutes</b></div>' +
          '<div class="tm-derived__r">Arrangement <b>' + T.LABEL.arrangement[day.work_arrangement] + '</b></div>'
        : '<div class="tm-derived__r" style="color:var(--fg-3)">Pick a day to see the snapshot the approver will read.</div>');
  }
  function corKv(c) {
    var day = T.byId(DAY, c.attendance_daily_id);
    return [
      ['Filed by', T.emp(c.employee_id).name],
      ['Day owner', day ? T.emp(day.employee_id).name : '—'],
      ['Corrected day', day ? T.d(day.work_date) : '—'],
      ['Current verdict', day ? T.LABEL.attendance[day.attendance_status] : '—'],
      ['Expected (snapshot)', day && day.expected_in ? day.expected_in + ' – ' + day.expected_out : '—'],
      ['Reason', T.LABEL.corr_reason[c.correction_reason_type]],
      ['Reason note', c.reason_note || '—'],
      ['Proposed in', c.requested_in || '—'], ['Proposed out', c.requested_out || '—'],
      ['Excused reason it would carry', T.LABEL.excused[EXCUSED_MAP[c.correction_reason_type]]],
      ['Status', T.badge(c.correction_status, T.LABEL.correction)],
      ['Submitted', T.dt(c.submitted_at)]
    ];
  }

  document.addEventListener('DOMContentLoaded', function () {
    F.wireSelects(document);
    T.fillSelect('viewAs', VIEWERS.map(function (v, i) {
      return '<div class="dropdown__opt' + (i === 0 ? ' is-sel' : '') + '" data-val="' + v.id + '">' + roleLabel(v) + '</div>';
    }).join(''));
    applySession(); tick();
    setInterval(tick, 1000);

    $('viewAs').addEventListener('select', function (e) {
      var v = VIEWERS.filter(function (x) { return x.id === e.detail.value; })[0];
      if (v) { SESS = v; applySession(); }
    });
    $('attTabs').addEventListener('tabchange', function () { syncNewBtn(); });

    // filters
    function bindSel(id, apply) {
      $(id).addEventListener('select', function (e) { apply(e.detail.value); });
    }
    bindSel('fltStatus', function (v) { fltDay.status = v; pgDay.reset(); drawDay(); });
    bindSel('fltDayType', function (v) { fltDay.day_type = v; pgDay.reset(); drawDay(); });
    bindSel('fltExcused', function (v) { fltDay.excused = v; pgDay.reset(); drawDay(); });
    $('fltDayName').addEventListener('input', function () { fltDay.name = this.value; pgDay.reset(); drawDay(); });
    bindSel('fltPType', function (v) { fltTap.type = v; pgTap.reset(); drawTap(); });
    bindSel('fltGeo', function (v) { fltTap.geo = v; pgTap.reset(); drawTap(); });
    bindSel('fltMock', function (v) { fltTap.mock = v; pgTap.reset(); drawTap(); });
    $('fltTapName').addEventListener('input', function () { fltTap.name = this.value; pgTap.reset(); drawTap(); });
    bindSel('fltCStatus', function (v) { fltCor.status = v; pgCor.reset(); drawCor(); });
    bindSel('fltCReason', function (v) { fltCor.reason = v; pgCor.reset(); drawCor(); });
    $('fltCName').addEventListener('input', function () { fltCor.name = this.value; pgCor.reset(); drawCor(); });

    function paintSelfie() {
      var thumb = $('pnSelfieThumb');
      thumb.classList.toggle('is-hidden', !selfieShot);
      thumb.innerHTML = selfieShot ? '<img src="' + selfieShot + '" alt="Selfie preview">' : '';
      $('pnSelfieBtnT').textContent = selfieShot ? 'Retake' : 'Take selfie';
      $('pnSelfieSt').textContent = selfieShot ? 'Frame ready — camera source' : '';
      if (window.lucide) window.lucide.createIcons();
    }
    function stopCam() {
      if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
      $('scVideo').srcObject = null;
    }
    function shoot(sim) {
      if (sim) {
        var s = document.createElement('canvas'); s.width = 360; s.height = 270;
        var sx = s.getContext('2d');
        sx.fillStyle = '#0f2f45'; sx.fillRect(0, 0, 360, 270);
        sx.fillStyle = 'rgba(255,255,255,.72)'; sx.font = '600 15px Inter, sans-serif'; sx.textAlign = 'center';
        sx.fillText('SIMULATED FRAME', 180, 128); sx.font = '500 12px Inter, sans-serif';
        sx.fillText('preview environment only', 180, 150);
        selfieShot = s.toDataURL('image/jpeg', 0.8);
      } else {
        var v = $('scVideo');
        if (!camStream || !v.videoWidth) { $('scErr').textContent = 'No live frame yet — the camera is not streaming.'; return; }
        var cv = document.createElement('canvas');
        cv.width = 360; cv.height = Math.round(360 * v.videoHeight / v.videoWidth);
        cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        selfieShot = cv.toDataURL('image/jpeg', 0.8);
      }
      stopCam(); F.closeModal('selfieCam'); paintSelfie();
      F.toast(sim
        ? 'Simulated frame stamped — the real client accepts a live camera frame only, never a file.'
        : 'Frame captured — it uploads with the tap and becomes selfie_document_id.', sim ? 'info' : 'ok');
    }
    function camBlocked(msg) {
      $('scErr').textContent = msg;
      $('scShoot').classList.add('is-hidden');
      $('scSim').classList.remove('is-hidden');
    }
    $('pnSelfieBtn').addEventListener('click', function () {
      $('scErr').textContent = '';
      $('scShoot').classList.remove('is-hidden');
      $('scSim').classList.add('is-hidden');
      F.openModal('selfieCam');
      var policyBlocked = document.featurePolicy && document.featurePolicy.allowsFeature && !document.featurePolicy.allowsFeature('camera');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || policyBlocked) {
        camBlocked('This preview frame has no camera permission, so no live capture is possible here. The real client accepts a camera frame only — never a file picker.');
        return;
      }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        .then(function (s) { camStream = s; $('scVideo').srcObject = s; })
        .catch(function (err) {
          camBlocked((err && err.name === 'NotFoundError')
            ? 'No camera device is available on this machine. The real client accepts a camera frame only — never a file picker.'
            : 'The camera is blocked in this environment or was refused. The real client accepts a camera frame only — never a file picker.');
        });
    });
    $('scShoot').addEventListener('click', function () { shoot(false); });
    $('scSim').addEventListener('click', function () { shoot(true); });
    $('selfieCam').addEventListener('click', function (e) { if (e.target.closest('[data-close]')) stopCam(); });
    paintSelfie();

    $('pnBtn').addEventListener('click', function () {
      var type = nextType(); if (!type) return;
      var c = channel();
      if (c.selfie && !selfieShot) {
        F.toast('422 — this channel requires a live selfie and none is captured; the row is never born.', 'danger');
        return;
      }
      var now = new Date();
      var row = {
        id: 'pun-' + (PUN.length + 10), employee_id: SESS.id, punch_type: type,
        punch_at: TODAY + 'T' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':00+07:00',
        work_date: TODAY, is_within_geofence: c.radius ? true : null, is_mock_location_suspected: false,
        is_work_arrangement_unknown: false, geofence_id: c.g.id
      };
      PUN.push(row);
      selfieShot = null; paintSelfie();
      drawPunch(); pgTap.reset(); drawTap();
      $('psKv').innerHTML = kv([
        ['Type', type === 'IN' ? 'Tap in' : 'Tap out'], ['Tap time', T.dt(row.punch_at)],
        ['Idempotency-Key', '<span class="cell-mono">3f1c8a90-0000-4000-8000-' + String(Date.now()).slice(-12) + '</span>'],
        ['Timezone', 'Asia/Jakarta (WIB) — the employee\u2019s zone, not the server\u2019s'],
        ['Work date (server-derived)', T.d(row.work_date)],
        ['Radius verdict', radiusCell(row)],
        ['Selfie', c.selfie ? 'Required by this channel — captured live, camera source' : 'Not required by this channel']
      ]);
      F.openModal('punchSaved');
      F.toast('201 — tap saved. The daily summary recompute runs outside this transaction.', 'ok');
    });

    $('newCorrBtn').addEventListener('click', function () {
      if (!canCreate()) { F.toast('403 — attendance-correction:create is not held by this role.', 'danger'); return; }
      var days = eligibleDays();
      $('cfFiler').value = T.emp(SESS.id).name + ' — ' + SESS.role;
      T.fillSelect('cfDay', days.length
        ? days.map(function (d) {
            return '<div class="dropdown__opt" data-val="' + d.id + '">' + T.d(d.work_date) + ' · ' + T.emp(d.employee_id).name + ' · ' + T.LABEL.attendance[d.attendance_status] + '</div>';
          }).join('')
        : '<div class="dropdown__empty">Every eligible day already carries a pending correction.</div>');
      setSel('cfDay', '', 'Select day'); setSel('cfReason', '', 'Select reason');
      $('cfNote').value = ''; $('cfIn').value = ''; $('cfOut').value = '';
      $('cfNoteStar').style.display = 'none';
      corDerived();
      F.openModal('corForm');
    });
    $('cfDay').addEventListener('select', function (e) {
      $('cfDay').dataset.val = e.detail.value; corDerived();
    });
    $('cfReason').addEventListener('select', function (e) {
      $('cfReason').dataset.val = e.detail.value;
      $('cfNoteStar').style.display = e.detail.value === 'OTHER' ? '' : 'none';
    });
    $('cfSave').addEventListener('click', function () {
      var day = $('cfDay').dataset.val, reason = $('cfReason').dataset.val;
      var note = $('cfNote').value.trim(), tin = $('cfIn').value, tout = $('cfOut').value;
      if (!day || !reason) { F.toast('422 — pick the day and the correction reason.', 'danger'); return; }
      if (reason === 'OTHER' && !note) { F.toast('422 — the reason note is mandatory when the reason is Other.', 'danger'); return; }
      if (!tin && !tout) { F.toast('422 — propose at least one time; a correction with neither corrects nothing.', 'danger'); return; }
      if (COR.filter(function (c) { return c.attendance_daily_id === day && c.correction_status === 'PENDING_APPROVAL'; }).length) {
        F.toast('409 — that day already carries a pending correction; one live correction per day.', 'danger'); return;
      }
      COR.push({
        id: 'cor-' + (COR.length + 10), attendance_daily_id: day, employee_id: SESS.id,
        correction_reason_type: reason, reason_note: note, requested_in: tin || null, requested_out: tout || null,
        correction_status: 'PENDING_APPROVAL', submitted_at: new Date().toISOString(), decided_by: null
      });
      F.closeModal('corForm'); pgCor.reset(); drawCor();
      F.toast('201 — correction submitted. The day keeps its current verdict until a decision lands.', 'ok');
    });

    $('corBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-cview],[data-capp],[data-crej],[data-cwd]'); if (!t) return;
      var id = t.getAttribute('data-cview') || t.getAttribute('data-capp') || t.getAttribute('data-crej') || t.getAttribute('data-cwd');
      var c = T.byId(COR, id), day = T.byId(DAY, c.attendance_daily_id);
      if (t.hasAttribute('data-cwd')) {
        wdCor = c;
        $('cwKv').innerHTML = kv([['Correction', c.id], ['Corrected day', day ? T.d(day.work_date) : '—'], ['Reason', T.LABEL.corr_reason[c.correction_reason_type]]]);
        F.openModal('corWithdraw');
        return;
      }
      if (t.hasAttribute('data-cview')) {
        $('cvKv').innerHTML = kv(corKv(c));
        F.openModal('corDetail');
        return;
      }
      decideCor = c; decideKind = t.hasAttribute('data-capp') ? 'APPROVED' : 'REJECTED';
      $('cdTitle').textContent = decideKind === 'APPROVED' ? 'Approve correction' : 'Reject correction';
      $('cdDesc').textContent = decideKind === 'APPROVED'
        ? 'Approving marks the day excused with the reason derived from the correction type — the raw minutes are left exactly as the machine measured them.'
        : 'Rejecting leaves the day completely untouched; nothing has to be restored because nothing ever changed.';
      $('cdGo').textContent = decideKind === 'APPROVED' ? 'Approve' : 'Reject';
      $('cdGo').className = 'btn ' + (decideKind === 'APPROVED' ? 'btn--primary' : 'btn--danger');
      $('cdKv').innerHTML = kv(corKv(c)); $('cdNote').value = '';
      F.openModal('corDecision');
    });

    $('cdGo').addEventListener('click', function () {
      var c = decideCor, kind = decideKind;
      if (c.employee_id === SESS.id) { F.toast('403 — the filer of a correction can never be its approver.', 'danger'); return; }
      F.closeModal('corDecision');
      F.toast('200 — decision accepted and forwarded.', 'info');
      setTimeout(function () {
        c.correction_status = kind; c.decided_by = SESS.id;
        if (kind === 'APPROVED') {
          var day = T.byId(DAY, c.attendance_daily_id);
          // UIC §6.3.4 + §1.7 — only the verdict is withheld; worked/late/undertime stay as measured.
          if (day) { day.is_excused = true; day.excused_reason = EXCUSED_MAP[c.correction_reason_type]; }
        }
        drawCor(); drawDay();
        F.toast(kind === 'APPROVED'
          ? 'Process finished — the day is now excused as ' + T.LABEL.excused[EXCUSED_MAP[c.correction_reason_type]] + '; its measured minutes are unchanged.'
          : 'Process finished — the correction is rejected and the day keeps its original verdict.', kind === 'APPROVED' ? 'ok' : 'warn');
      }, 1400);
    });
    $('cwConfirm').addEventListener('click', function () {
      wdCor.correction_status = 'CANCELLED';
      F.closeModal('corWithdraw'); drawCor();
      F.toast('200 — correction withdrawn; the row stays as Cancelled and the day is free to be corrected again.', 'ok');
    });
  });
})();
