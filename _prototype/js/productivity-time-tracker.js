// productivity-time-tracker.js — Time Tracker (endpoints #23–#26)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var ME = 'DEDI', TODAY = '2026-08-13';
  var pg = F.pager('pgTt', 10, redraw, 'entries');
  // one running counter at most (uq_emp_worklog_one_running_timer) — seeded as already running
  var running = { task: 'TSK-0003', act: 'ACT-0002', startedMs: Date.now() - 30 * 60000 };
  var pick = { ttTask: 'TSK-0001', ttAct: 'ACT-0001', mnTask: '', mnAct: '' };
  var tick = null;

  var eligible = D.TASKS.filter(function (t) { return t.status !== 'DIBATALKAN'; });
  document.getElementById('ttTaskDD').innerHTML = eligible.map(function (t) { return D.opt(t.code, t.code + ' — ' + t.task_title); }).join('');
  document.getElementById('mnTaskDD').innerHTML = eligible.map(function (t) { return D.opt(t.code, t.code + ' — ' + t.task_title); }).join('');
  var acts = D.ACTIVITY_TYPES.filter(function (a) { return a.is_active; });
  document.getElementById('ttActDD').innerHTML = D.opt('', 'Unspecified') + acts.map(function (a) { return D.opt(a.code, a.name); }).join('');
  document.getElementById('mnActDD').innerHTML = D.opt('', 'Unspecified') + acts.map(function (a) { return D.opt(a.code, a.name); }).join('');
  ['ttTask', 'ttAct', 'mnTask', 'mnAct'].forEach(function (id) {
    document.getElementById(id).addEventListener('select', function (e) { pick[id] = e.detail.value; });
  });
  function setSel(id, code, label) {
    var c = document.getElementById(id), v = c.querySelector('.ctl__value');
    v.textContent = label; v.style.color = code ? 'var(--fg-1)' : 'var(--fg-4)';
  }
  setSel('ttTask', 'TSK-0001', 'TSK-0001 — Perbaikan bug checkout');
  setSel('ttAct', 'ACT-0001', 'Mengerjakan');

  function mine() { return D.WORKLOGS.filter(function (w) { return w.employee === ME; }); }
  function dayTotal(date) {
    return mine().filter(function (w) { return w.work_date === date; })
      .reduce(function (s, w) { return s + w.duration_minutes; }, 0);
  }

  function paintClock() {
    var st = document.getElementById('ttState'), el = document.getElementById('ttElapsed'), meta = document.getElementById('ttMeta');
    document.getElementById('ttStop').disabled = !running;
    document.getElementById('ttStart').textContent = running ? 'Start another counter' : 'Start counter';
    if (!running) {
      st.textContent = 'No counter running';
      el.textContent = '00:00:00';
      meta.textContent = 'A day with zero running counter is a valid state — the invariant caps the count at one, it does not require one.';
      return;
    }
    st.textContent = 'Counter running';
    var s = Math.floor((Date.now() - running.startedMs) / 1000);
    var hh = ('0' + Math.floor(s / 3600)).slice(-2), mm = ('0' + Math.floor(s / 60) % 60).slice(-2), ss = ('0' + s % 60).slice(-2);
    el.textContent = hh + ':' + mm + ':' + ss;
    meta.innerHTML = D.taskName(running.task) + ' · ' + (running.act ? D.actName(running.act) : 'Unspecified') +
      '<br>origin <strong>DIUKUR_MESIN</strong> · started_at set · stopped_at and duration_minutes stay NULL until you stop it.';
  }

  function redraw() {
    var all = mine().slice().sort(function (a, b) { return a.work_date < b.work_date ? 1 : -1; });
    var view = pg.slice(all);
    document.getElementById('ttCount').textContent = all.length;
    document.getElementById('mnDayTotal').textContent = dayTotal(document.getElementById('mnDate').dataset.iso || TODAY);
    document.getElementById('ttBody').innerHTML = view.map(function (w) {
      var o = D.ORIGIN[w.origin];
      return '<tr><td class="cell-dim">' + w.code + '</td><td>' + D.stampDate(w.work_date) + '</td>' +
        '<td class="cell-strong">' + D.taskName(w.task) + '</td><td>' + D.actName(w.activity) + '</td>' +
        '<td>' + (w.started_at ? w.started_at + '–' + w.stopped_at : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r">' + D.hours(w.duration_minutes) + ' <span class="cell-dim">(' + w.duration_minutes + 'm)</span></td>' +
        '<td>' + D.badge(o.tone, o.label) + '</td></tr>';
    }).join('');
    pg.paint();
    paintClock();
    if (window.lucide) window.lucide.createIcons();
  }

  document.getElementById('ttStart').addEventListener('click', function () {
    if (!pick.ttTask) { F.toast('Pick a task first.', 'warn'); return; }
    if (running) {
      var mins = Math.max(1, Math.round((Date.now() - running.startedMs) / 60000));
      document.getElementById('ttAutoMsg').textContent = D.taskName(running.task) + ' ran for ' + mins + ' minutes and was saved as it stood.';
      document.getElementById('ttAuto').style.display = '';
      pushRow(running, mins, 'DIUKUR_MESIN');
    } else {
      document.getElementById('ttAuto').style.display = 'none';
    }
    running = { task: pick.ttTask, act: pick.ttAct, startedMs: Date.now() };
    F.toast('201 Created — counter running on ' + D.taskName(running.task) + '.', 'ok');
    redraw();
    if (window.lucide) window.lucide.createIcons();
  });

  function pushRow(r, mins, origin) {
    var n = D.WORKLOGS.length + 1;
    var start = new Date(r.startedMs), end = new Date(r.startedMs + mins * 60000);
    function hm(d) { return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
    D.WORKLOGS.push({
      code: 'WLG-' + ('000' + n).slice(-4), employee: ME, task: r.task, activity: r.act || null, work_date: TODAY,
      started_at: hm(start), stopped_at: hm(end), duration_minutes: mins, origin: origin,
      is_corrected: false, correction_mode: null, paid_group: null, notes: null
    });
  }

  document.getElementById('ttStop').addEventListener('click', function () {
    var mins = Math.max(1, Math.round((Date.now() - running.startedMs) / 60000));
    pushRow(running, mins, 'DIUKUR_MESIN');
    running = null;
    redraw();
    F.toast('200 OK — counter stopped, ' + mins + ' minutes saved with no rounding.', 'ok');
  });

  document.getElementById('mnOpen').addEventListener('click', function () { F.openModal('mnForm'); });
  document.getElementById('mnDate').addEventListener('datechange', function () { redraw(); });
  document.getElementById('mnSave').addEventListener('click', function () {
    var iso = document.getElementById('mnDate').dataset.iso;
    var min = +document.getElementById('mnMin').value;
    if (!pick.mnTask || !iso || !(min > 0)) { F.toast('Task, work date and a positive duration are required.', 'warn'); return; }
    var limit = new Date(TODAY); limit.setDate(limit.getDate() - 7);
    if (new Date(iso) < limit) {
      F.toast('422 PROD_ENTRY_WINDOW_CLOSED — ' + D.stampDate(iso) + ' is outside the 7-day window. A supervisor window-grant is the only way in.', 'danger');
      return;
    }
    if (dayTotal(iso) + min > 1440) {
      F.toast('422 PROD_DAILY_DURATION_EXCEEDED — ' + D.stampDate(iso) + ' already holds ' + dayTotal(iso) + ' minutes across all origins.', 'danger');
      return;
    }
    var n = D.WORKLOGS.length + 1;
    D.WORKLOGS.push({
      code: 'WLG-' + ('000' + n).slice(-4), employee: ME, task: pick.mnTask, activity: pick.mnAct || null, work_date: iso,
      started_at: null, stopped_at: null, duration_minutes: min, origin: 'DIKETIK_MANUSIA',
      is_corrected: false, correction_mode: null, paid_group: null,
      notes: document.getElementById('mnNotes').value.trim() || null
    });
    document.getElementById('mnMin').value = '';
    document.getElementById('mnNotes').value = '';
    F.closeModal('mnForm');
    redraw();
    F.toast('201 Created — manual entry saved, clock fields stay NULL.', 'ok');
  });

  redraw();
  tick = setInterval(paintClock, 1000);
  if (window.lucide) window.lucide.createIcons();
})();
