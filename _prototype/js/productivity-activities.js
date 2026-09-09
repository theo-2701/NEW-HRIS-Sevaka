// productivity-activities.js — Activities: owner correction + manager acceptance (#27/#29/#31 + #47)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var persona = 'DEDI';
  // Narrative "now" for this menu: the dataset story settles WLG-0003/0004 on 24 Jul 2026
  // (log_system_stop_acceptance.created_at = 2026-07-24T08:30+07:00, UIC TS-15).
  var TODAY = '2026-07-24', WINDOW_DAYS = 7;
  // log_worklog_window_grant — Rina opened 18–19 Jul for Dedi (UIC TS-11)
  // Dates shifted from the UIC's literal 18–19 Jul so the grant sits OUTSIDE the plain
  // 7-day window (cutoff 17 Jul) — otherwise the grant branch is unreachable.
  var GRANTS = [{ target: 'DEDI', start: '2026-07-10', end: '2026-07-12', granted_by: 'RINA', reason: 'Dedi cuti mendadak, lupa isi worklog 2 hari' }];
  var ACCEPTANCES = [];
  function grantFor(emp, iso) { return GRANTS.filter(function (g) { return g.target === emp && iso >= g.start && iso <= g.end; })[0] || null; }
  function windowState(emp, iso) {
    var lim = new Date(TODAY); lim.setDate(lim.getDate() - WINDOW_DAYS);
    if (new Date(iso) >= lim) return { ok: true, why: 'inside' };
    var g = grantFor(emp, iso);
    return g ? { ok: true, why: 'grant', grant: g } : { ok: false, why: 'closed' };
  }
  function frozen(iso) {
    return iso >= D.PERIOD.period_start && iso <= D.PERIOD.period_end && D.PERIOD.approved_at && D.PERIOD.approved_at.slice(0, 10) <= TODAY;
  }
  function gate(msg) {
    var el = document.getElementById('acGate');
    document.getElementById('acGateMsg').innerHTML = msg;
    el.style.display = msg ? '' : 'none';
    if (window.lucide) window.lucide.createIcons();
  }
  var af = { task: '', origin: '', from: '', to: '', sort: 'work_date' };
  var pg = F.pager('pgAc', 10, redraw, 'records');

  function regime() {
    document.getElementById('acRegimeMsg').innerHTML = persona === 'DEDI'
      ? 'Owner regime — you may correct your own rows. Reading your own rows writes <strong>no</strong> access trail.'
      : 'Manager regime — read-only over ' + D.empName('DEDI') + '\u2019s rows, plus one decision: accept a <code>DIHENTIKAN_SISTEM</code> row as it stands. Each row returned writes exactly one <code>log_data_access</code> entry.';
  }

  document.getElementById('acPersona').addEventListener('click', function (e) {
    var b = e.target.closest('[data-persona]');
    if (!b) return;
    this.querySelectorAll('[data-persona]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    persona = b.getAttribute('data-persona');
    gate('');
    document.getElementById('acHistPanel').style.display = 'none';
    document.getElementById('acAccPanel').style.display = 'none';
    regime(); redraw();
    F.toast('Acting as ' + D.empName(persona) + ' (' + D.EMP[persona].role + ').', 'info');
  });

  document.getElementById('afTaskDD').innerHTML = D.opt('', 'All tasks') + D.TASKS.map(function (t) { return D.opt(t.code, t.code + ' — ' + t.task_title); }).join('');
  document.getElementById('afOriginDD').innerHTML = D.opt('', 'All origins') + Object.keys(D.ORIGIN).map(function (o) { return D.opt(o); }).join('');
  [['afTask', 'task'], ['afOrigin', 'origin'], ['afSort', 'sort']].forEach(function (p) {
    document.getElementById(p[0]).addEventListener('select', function (e) { af[p[1]] = e.detail.value; pg.reset(); redraw(); });
  });
  document.getElementById('afRange').addEventListener('rangechange', function (e) { af.from = e.detail.from; af.to = e.detail.to; pg.reset(); redraw(); });
  document.getElementById('afReset').addEventListener('click', function () {
    af = { task: '', origin: '', from: '', to: '', sort: 'work_date' };
    ['afTask', 'afOrigin', 'afSort'].forEach(function (id) {
      var c = document.getElementById(id);
      c.querySelector('.ctl__value').textContent = c.querySelector('.dropdown__opt').textContent;
    });
    pg.reset(); redraw(); F.toast('Filter reset.', 'info');
  });

  function rows() {
    var out = D.WORKLOGS.filter(function (w) { return w.employee === 'DEDI'; });
    if (af.task) out = out.filter(function (w) { return w.task === af.task; });
    if (af.origin) out = out.filter(function (w) { return w.origin === af.origin; });
    if (af.from) out = out.filter(function (w) { return w.work_date >= af.from && w.work_date <= af.to; });
    return out.sort(function (a, b) {
      if (af.sort === 'duration_minutes') return a.duration_minutes < b.duration_minutes ? 1 : -1;
      return a.work_date < b.work_date ? 1 : -1;
    });
  }

  function actionsFor(w) {
    var items = [], pending = w.origin === 'DIHENTIKAN_SISTEM' && !w.correction_mode;
    if (persona === w.employee) items.push({ label: 'Edit', icon: 'pencil', attr: 'data-edit="' + w.code + '"' });
    if (pending) items.push({ label: 'Accept as it stands', icon: 'check', attr: 'data-accept="' + w.code + '"' });
    if ((D.WORKLOG_HISTORY[w.code] || []).length) items.push({ label: 'Change history', icon: 'history', attr: 'data-hist="' + w.code + '"' });
    if (w.correction_mode === 'DITERIMA_ATASAN') items.push({ label: 'Acceptance trail', icon: 'stamp', attr: 'data-trail="' + w.code + '"' });
    if (!items.length) return '<div class="rowacts"><button class="rowbtn" type="button" disabled title="Owner-only row, nothing to settle">Owner only</button></div>';
    if (items.length === 1) return '<div class="rowacts"><button class="rowbtn" type="button" ' + items[0].attr + '>' + items[0].label + '</button></div>';
    return '<div class="rowacts">' + F.rowMenu(items) + '</div>';
  }

  function redraw() {
    var all = rows(), view = pg.slice(all);
    document.getElementById('acCount').textContent = all.length;
    document.getElementById('acBody').innerHTML = view.length ? view.map(function (w) {
      var o = D.ORIGIN[w.origin];
      return '<tr><td class="cell-dim">' + w.code + '</td><td>' + D.stampDate(w.work_date) + '</td>' +
        '<td class="cell-strong">' + D.taskName(w.task) + '</td><td>' + D.actName(w.activity) + '</td>' +
        '<td>' + (w.started_at ? w.started_at + '–' + w.stopped_at : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r">' + D.hours(w.duration_minutes) + ' <span class="cell-dim">(' + w.duration_minutes + 'm)</span></td>' +
        '<td>' + D.badge(o.tone, o.label) + '</td>' +
        '<td>' + (w.correction_mode ? D.badge(D.CORRECTION[w.correction_mode], w.correction_mode)
          : (w.origin === 'DIHENTIKAN_SISTEM' ? D.badge('amber', 'NEEDS SETTLING') : '<span class="cell-dim">—</span>')) + '</td>' +
        '<td class="ta-r">' + actionsFor(w) + '</td></tr>';
    }).join('') : '<tr><td colspan="9"><div class="muted-empty">No time record matches this filter.</div></td></tr>';
    pg.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------- owner edit ----------
  var cur = null, ae = {};
  document.getElementById('aeTaskDD').innerHTML = D.TASKS.map(function (t) { return D.opt(t.code, t.code + ' — ' + t.task_title); }).join('');
  document.getElementById('aeActDD').innerHTML = D.opt('', 'Unspecified') + D.ACTIVITY_TYPES.filter(function (a) { return a.is_active; }).map(function (a) { return D.opt(a.code, a.name); }).join('');
  document.getElementById('aeTask').addEventListener('select', function (e) { ae.task = e.detail.value; });
  document.getElementById('aeAct').addEventListener('select', function (e) { ae.act = e.detail.value; });

  function openEdit(code) {
    cur = D.byCode(D.WORKLOGS, code);
    ae = { task: cur.task, act: cur.activity };
    document.getElementById('aeTitle').textContent = 'Edit ' + cur.code;
    document.getElementById('aeTask').querySelector('.ctl__value').textContent = cur.code ? cur.task + ' — ' + D.taskName(cur.task) : '—';
    document.getElementById('aeAct').querySelector('.ctl__value').textContent = cur.activity ? D.actName(cur.activity) : 'Unspecified';
    F.setDate('aeDate', cur.work_date);
    document.getElementById('aeMin').value = cur.duration_minutes;
    document.getElementById('aeMinHint').textContent = 'Current value ' + cur.duration_minutes + ' minutes. A change is logged as old → new.';
    document.getElementById('aeNotes').value = cur.notes || '';
    document.getElementById('aeCorrNote').style.display = cur.origin === 'DIHENTIKAN_SISTEM' && !cur.correction_mode ? '' : 'none';
    paintWindow(cur.work_date);
    F.wireSelects(document.getElementById('acEdit'));
    F.setupDates(document.getElementById('acEdit'));
    F.openModal('acEdit');
  }

  function paintWindow(iso) {
    var st = windowState(cur.employee, iso), g = grantFor(cur.employee, iso);
    document.getElementById('aeWin').innerHTML = D.stampDate(iso) + ' — ' +
      (st.why === 'inside' ? 'inside the window, writable'
        : st.why === 'grant' ? 'outside the window, opened by a grant'
        : '<strong>outside the window</strong> — saving returns <code>422 PROD_ENTRY_WINDOW_CLOSED</code>');
    document.getElementById('aeGrant').textContent = g
      ? D.stampDate(g.start) + ' – ' + D.stampDate(g.end) + ' by ' + D.empName(g.granted_by)
      : 'None covering this date';
  }
  document.getElementById('aeDate').addEventListener('change', function () { if (cur) paintWindow(this.dataset.iso || this.value || cur.work_date); });

  document.getElementById('aeSave').addEventListener('click', function () {
    var min = +document.getElementById('aeMin').value;
    if (!(min >= 0)) { F.toast('Duration must be zero or more.', 'warn'); return; }
    var iso = document.getElementById('aeDate').dataset.iso || cur.work_date;
    if (frozen(iso)) {
      F.toast('422 PROD_PERIOD_ALREADY_APPROVED — ' + D.stampDate(iso) + ' sits inside an approved recap. Frozen permanently.', 'danger');
      return;
    }
    var st = windowState(cur.employee, iso);
    if (!st.ok) {
      F.toast('422 PROD_ENTRY_WINDOW_CLOSED — ' + D.stampDate(iso) + ' is more than ' + WINDOW_DAYS + ' days back and no window-grant covers it.', 'danger');
      return;
    }
    if (min !== cur.duration_minutes) {
      var h = D.WORKLOG_HISTORY[cur.code] || (D.WORKLOG_HISTORY[cur.code] = []);
      h.unshift({ changed_field: 'duration_minutes', old_value: String(cur.duration_minutes), new_value: String(min), activity: 'U', created_by: cur.employee, created_at: TODAY + 'T13:20:00+07:00' });
      cur.duration_minutes = min;
    }
    cur.work_date = iso;
    cur.task = ae.task || cur.task;
    cur.activity = ae.act === '' ? null : (ae.act || cur.activity);
    cur.notes = document.getElementById('aeNotes').value.trim() || null;
    if (cur.origin === 'DIHENTIKAN_SISTEM' && !cur.correction_mode) { cur.is_corrected = true; cur.correction_mode = 'DIKOREKSI_PEMILIK'; }
    F.closeModal('acEdit'); gate(''); redraw(); showHist(cur.code);
    F.toast('200 OK — ' + cur.code + ' corrected' + (cur.correction_mode === 'DIKOREKSI_PEMILIK' ? ', correction_mode=DIKOREKSI_PEMILIK.' : '.'), 'ok');
  });

  // ---------- manager accept ----------
  function openAccept(code) {
    cur = D.byCode(D.WORKLOGS, code);
    document.getElementById('aaCode').textContent = cur.code;
    document.getElementById('aaOwner').textContent = D.empName(cur.employee);
    document.getElementById('aaWhat').textContent = D.stampDate(cur.work_date) + ' · ' + D.taskName(cur.task);
    document.getElementById('aaOrigin').textContent = cur.origin;
    document.getElementById('aaMin').textContent = cur.duration_minutes + ' minutes (unchanged by this action)';
    F.openModal('acAccept');
  }

  document.getElementById('aaConfirm').addEventListener('click', function () {
    if (persona === cur.employee) {
      F.closeModal('acAccept');
      gate('<strong>403 PROD_SELF_ACCEPTANCE_FORBIDDEN</strong> — ' + D.empName(persona) + ' owns ' + cur.code +
        ' and may not accept it. Separation of duties is fail-closed: nothing is written, not even an access-trail row. Only a supervisor up the chain, or HR, can accept this row.');
      F.toast('403 PROD_SELF_ACCEPTANCE_FORBIDDEN — the approver may not be the owner of the row.', 'danger');
      return;
    }
    cur.correction_mode = 'DITERIMA_ATASAN';
    ACCEPTANCES.unshift({ worklog: cur.code, origin: cur.origin, minutes: cur.duration_minutes, created_by: persona, created_at: TODAY + 'T08:30:00+07:00' });
    F.closeModal('acAccept'); gate(''); redraw(); showTrail(cur.code);
    F.toast('200 OK — acceptance recorded by ' + D.empName(persona) + '. Duration untouched.', 'ok');
  });

  // ---------- inline trails (AC-A4 / AC-B4) ----------
  function showHist(code) {
    var h = D.WORKLOG_HISTORY[code] || [];
    document.getElementById('acAccPanel').style.display = 'none';
    document.getElementById('acHistCode').textContent = code;
    document.getElementById('acHistBody').innerHTML = h.length ? h.map(function (r) {
      return '<tr><td class="cell-strong">' + r.changed_field + '</td><td>' + r.old_value + '</td><td>' + r.new_value + '</td>' +
        '<td>' + r.activity + '</td><td>' + D.empName(r.created_by) + '</td><td>' + D.stampTime(r.created_at) + '</td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="muted-empty">No correction recorded on this row yet.</div></td></tr>';
    document.getElementById('acHistPanel').style.display = '';
  }
  function showTrail(code) {
    var rows = ACCEPTANCES.filter(function (a) { return a.worklog === code; });
    document.getElementById('acHistPanel').style.display = 'none';
    document.getElementById('acAccCode').textContent = code;
    document.getElementById('acAccBody').innerHTML = rows.length ? rows.map(function (a) {
      return '<tr><td class="cell-strong">' + a.worklog + '</td><td>' + D.badge(D.ORIGIN[a.origin].tone, D.ORIGIN[a.origin].label) + '</td>' +
        '<td class="ta-r">' + a.minutes + ' m <span class="cell-dim">(unchanged)</span></td><td>' + D.empName(a.created_by) + '</td><td>' + D.stampTime(a.created_at) + '</td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="muted-empty">This row was settled before the trail was seeded in this session.</div></td></tr>';
    document.getElementById('acAccPanel').style.display = '';
  }

  document.getElementById('acBody').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-edit]'), ac = e.target.closest('[data-accept]'),
        hi = e.target.closest('[data-hist]'), tr = e.target.closest('[data-trail]');
    if (ed) openEdit(ed.getAttribute('data-edit'));
    if (ac) openAccept(ac.getAttribute('data-accept'));
    if (hi) showHist(hi.getAttribute('data-hist'));
    if (tr) showTrail(tr.getAttribute('data-trail'));
  });

  regime(); redraw();
  if (window.lucide) window.lucide.createIcons();
})();
