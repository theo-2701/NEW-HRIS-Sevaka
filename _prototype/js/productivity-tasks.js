// productivity-tasks.js — Tasks + Task Category sub-story (FT1.09–FT1.18)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var persona = 'DEDI';
  var tf = { title: '', status: '', prio: '', project: '', cat: '', assignee: 'DEDI', from: '', to: '', sort: 'created_at' };
  var pgT = F.pager('pgTsk', 10, drawTasks, 'tasks');

  // ---------------- persona ----------------
  document.getElementById('pvPersona').addEventListener('click', function (e) {
    var b = e.target.closest('[data-persona]');
    if (!b) return;
    this.querySelectorAll('[data-persona]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    persona = b.getAttribute('data-persona');
    document.getElementById('catNote').textContent = persona === 'HESTI'
      ? 'You are HR — the category master is writable.'
      : 'Read-only: only HR may create, rename or deactivate a category.';
    document.getElementById('catNewBtn').style.display = persona === 'HESTI' ? '' : 'none';
    drawCats();
    F.toast('Acting as ' + D.empName(persona) + ' (' + D.EMP[persona].role + ').', 'info');
  });

  // ---------------- tasks grid ----------------
  function taskRows() {
    var out = D.TASKS.slice();
    if (tf.title) out = out.filter(function (t) { return t.task_title.toLowerCase().indexOf(tf.title.toLowerCase()) > -1; });
    if (tf.status) out = out.filter(function (t) { return t.status === tf.status; });
    if (tf.prio) out = out.filter(function (t) { return t.priority === tf.prio; });
    if (tf.project === '__NONE__') out = out.filter(function (t) { return !t.project; });
    else if (tf.project) out = out.filter(function (t) { return t.project === tf.project; });
    if (tf.cat) out = out.filter(function (t) { return t.category === tf.cat; });
    if (tf.assignee) out = out.filter(function (t) { return t.assignee === tf.assignee; });
    if (tf.from) out = out.filter(function (t) { return t.due_date >= tf.from && t.due_date <= tf.to; });
    return out.sort(function (a, b) {
      var k = tf.sort === 'created_at' ? 'created_at' : tf.sort;
      return (a[k] || '') < (b[k] || '') ? -1 : 1;
    });
  }

  function drawTasks() {
    var all = taskRows(), view = pgT.slice(all);
    document.getElementById('tskBody').innerHTML = view.length ? view.map(function (t) {
      var st = D.TASK_STATUS[t.status];
      return '<tr>' +
        '<td class="cell-strong"><span class="pv-link" data-tdetail="' + t.code + '">' + t.task_title + '</span></td>' +
        '<td>' + (t.project ? D.projName(t.project) : '<span class="pv-tag">TANPA PROYEK</span>') + '</td>' +
        '<td>' + (t.category ? D.catName(t.category) : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + D.empName(t.assignee) + '</td>' +
        '<td>' + D.badge(D.PRIORITY[t.priority], t.priority) + '</td>' +
        '<td>' + D.stampDate(t.due_date) + (t.due_date !== t.original_due_date ? ' <span class="pv-tag">MOVED</span>' : '') + '</td>' +
        '<td>' + D.badge(st.tone, st.label) + '</td>' +
        '<td><span class="pv-tag">' + t.task_origin + '</span></td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" type="button" data-tdetail="' + t.code + '">View Detail</button></div></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="9"><div class="muted-empty">No task matches this filter.</div></td></tr>';
    pgT.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- filter wiring ----------------
  document.getElementById('tfStatusDD').innerHTML = D.opt('', 'All statuses') + Object.keys(D.TASK_STATUS).map(function (s) { return D.opt(s); }).join('');
  document.getElementById('tfPrioDD').innerHTML = D.opt('', 'All priorities') + Object.keys(D.PRIORITY).map(function (p) { return D.opt(p); }).join('');
  document.getElementById('tfProjectDD').innerHTML = D.opt('', 'All projects') + D.opt('__NONE__', 'Without project (has_project=false)') +
    D.PROJECTS.filter(function (p) { return p.state === 'AKTIF'; }).map(function (p) { return D.opt(p.code, p.project_name); }).join('');
  document.getElementById('tfCatDD').innerHTML = D.opt('', 'All categories') + D.CATEGORIES.map(function (c) { return D.opt(c.code, c.name); }).join('');
  document.getElementById('tfAssigneeDD').innerHTML = D.opt('DEDI', 'Dedi Kurniawan (self)') + D.opt('', 'Anyone I may read') +
    Object.keys(D.EMP).filter(function (k) { return k !== 'DEDI'; }).map(function (k) { return D.opt(k, D.EMP[k].name); }).join('');

  document.getElementById('tfTitle').addEventListener('input', function () { tf.title = this.value; pgT.reset(); drawTasks(); });
  [['tfStatus', 'status'], ['tfPrio', 'prio'], ['tfProject', 'project'], ['tfCat', 'cat'], ['tfAssignee', 'assignee'], ['tfSort', 'sort']].forEach(function (p) {
    document.getElementById(p[0]).addEventListener('select', function (e) { tf[p[1]] = e.detail.value; pgT.reset(); drawTasks(); });
  });
  document.getElementById('tfDue').addEventListener('rangechange', function (e) { tf.from = e.detail.from; tf.to = e.detail.to; pgT.reset(); drawTasks(); });
  document.getElementById('tfReset').addEventListener('click', function () {
    tf = { title: '', status: '', prio: '', project: '', cat: '', assignee: 'DEDI', from: '', to: '', sort: 'created_at' };
    document.getElementById('tfTitle').value = '';
    ['tfStatus', 'tfPrio', 'tfProject', 'tfCat', 'tfAssignee', 'tfSort'].forEach(function (id) {
      var c = document.getElementById(id);
      c.querySelector('.ctl__value').textContent = c.querySelector('.dropdown__opt').textContent;
    });
    pgT.reset(); drawTasks(); F.toast('Filter reset.', 'info');
  });

  // ---------------- create ----------------
  var nc = { assignee: '', project: '', cat: '', prio: 'SEDANG' };
  document.getElementById('ncAssigneeDD').innerHTML = Object.keys(D.EMP).map(function (k) {
    return D.opt(k, D.EMP[k].name + (k === persona ? ' (self)' : ''));
  }).join('');
  document.getElementById('ncProjectDD').innerHTML = D.opt('', 'Without project') +
    D.PROJECTS.filter(function (p) { return p.state !== '__DELETED__'; }).map(function (p) {
      return D.opt(p.code, p.project_name + (p.state === 'ARSIP' ? ' — ARSIP' : ''));
    }).join('');
  document.getElementById('ncCatDD').innerHTML = D.opt('', 'Unmapped (unpaid)') +
    D.CATEGORIES.filter(function (c) { return c.is_active; }).map(function (c) { return D.opt(c.code, c.name); }).join('');
  document.getElementById('ncPrioDD').innerHTML = Object.keys(D.PRIORITY).map(function (p) { return D.opt(p); }).join('');

  function ncSync() {
    var ok = document.getElementById('ncTitle').value.trim() && nc.assignee && document.getElementById('ncDue').dataset.iso;
    document.getElementById('ncSave').disabled = !ok;
    var origin = nc.assignee ? (nc.assignee === persona ? 'DIBUAT_SENDIRI' : 'DITUGASKAN') : '—';
    document.getElementById('ncOrigin').textContent = origin;
    document.getElementById('ncOriginHint').textContent = nc.assignee
      ? (origin === 'DITUGASKAN' ? 'DITUGASKAN — a notification request is emitted to the assignee.' : 'DIBUAT_SENDIRI — assigner stays NULL.')
      : 'Origin is derived from this field.';
  }
  document.getElementById('ncTitle').addEventListener('input', ncSync);
  document.getElementById('ncDue').addEventListener('datechange', ncSync);
  document.getElementById('ncAssignee').addEventListener('select', function (e) { nc.assignee = e.detail.value; ncSync(); });
  document.getElementById('ncProject').addEventListener('select', function (e) { nc.project = e.detail.value; document.getElementById('ncGate').style.display = 'none'; });
  document.getElementById('ncCat').addEventListener('select', function (e) { nc.cat = e.detail.value; });
  document.getElementById('ncPrio').addEventListener('select', function (e) { nc.prio = e.detail.value; });

  document.getElementById('tskNewBtn').addEventListener('click', function () {
    document.getElementById('ncTitle').value = '';
    document.getElementById('ncDesc').value = '';
    F.setDate('ncDue', '');
    nc = { assignee: '', project: '', cat: '', prio: 'SEDANG' };
    ['ncAssignee', 'ncProject', 'ncCat'].forEach(function (id) {
      var c = document.getElementById(id), v = c.querySelector('.ctl__value');
      v.textContent = id === 'ncAssignee' ? 'Select employee' : (id === 'ncProject' ? 'Without project' : 'Unmapped (unpaid)');
      v.style.color = 'var(--fg-4)';
    });
    document.getElementById('ncPrio').querySelector('.ctl__value').textContent = 'SEDANG';
    document.getElementById('ncGate').style.display = 'none';
    ncSync();
    F.openModal('tskCreate');
  });

  document.getElementById('ncSave').addEventListener('click', function () {
    if (nc.project) {
      var p = D.byCode(D.PROJECTS, nc.project);
      if (p && p.state === 'ARSIP') { document.getElementById('ncGate').style.display = ''; return; }
    }
    var n = D.TASKS.length + 1, code = 'TSK-' + ('000' + n).slice(-4);
    var due = document.getElementById('ncDue').dataset.iso;
    D.TASKS.push({
      code: code, task_title: document.getElementById('ncTitle').value.trim(),
      description: document.getElementById('ncDesc').value.trim() || null,
      project: nc.project || null, category: nc.cat || null,
      assignee: nc.assignee, assigner: nc.assignee === persona ? null : persona,
      task_origin: nc.assignee === persona ? 'DIBUAT_SENDIRI' : 'DITUGASKAN',
      status: 'BELUM_DIKERJAKAN', priority: nc.prio, due_date: due, original_due_date: due, created_at: '2026-08-13'
    });
    F.closeModal('tskCreate'); pgT.reset(); drawTasks();
    F.toast('201 Created — ' + code + ' saved as BELUM_DIKERJAKAN.', 'ok');
  });

  // ---------------- detail / edit ----------------
  var cur = null, td = {};
  document.getElementById('tdPrioDD').innerHTML = Object.keys(D.PRIORITY).map(function (p) { return D.opt(p); }).join('');
  document.getElementById('tdStatusDD').innerHTML = Object.keys(D.TASK_STATUS).map(function (s) { return D.opt(s); }).join('');

  function renderHistory() {
    var h = D.TASK_HISTORY[cur.code] || [];
    document.getElementById('tdHistCount').textContent = h.length;
    document.getElementById('tdHistBody').innerHTML = h.length ? h.map(function (r) {
      return '<tr><td class="cell-strong">' + r.changed_field + '</td><td>' + (r.old_value || '—') + '</td><td>' + (r.new_value || '—') + '</td>' +
        '<td>' + (r.change_reason || '<span class="cell-dim">—</span>') + '</td><td>' + D.empName(r.created_by) + '</td><td>' + D.stampTime(r.created_at) + '</td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="muted-empty">No change recorded — title, description and priority edits never write history.</div></td></tr>';
  }

  function openTask(code) {
    cur = D.byCode(D.TASKS, code);
    td = { cat: cur.category, prio: cur.priority, status: cur.status };
    document.getElementById('tdTitle').textContent = cur.task_title;
    document.getElementById('tdName').value = cur.task_title;
    document.getElementById('tdDescInput').value = cur.description || '';
    document.getElementById('tdCatDD').innerHTML = D.opt('', 'Unmapped (unpaid)') + D.CATEGORIES.map(function (c) { return D.opt(c.code, c.name + (c.is_active ? '' : ' — inactive')); }).join('');
    document.getElementById('tdCat').querySelector('.ctl__value').textContent = cur.category ? D.catName(cur.category) : 'Unmapped (unpaid)';
    document.getElementById('tdPrio').querySelector('.ctl__value').textContent = cur.priority;
    document.getElementById('tdStatus').querySelector('.ctl__value').textContent = cur.status;
    F.setDate('tdDue', cur.due_date);
    document.getElementById('tdDueHint').innerHTML = cur.task_origin === 'DITUGASKAN'
      ? 'Assigned task — only ' + D.empName(cur.assigner) + ' or a manager up the chain may move this date.'
      : 'Self-made task — the worker moves this date freely.';
    document.getElementById('tdStatusHint').textContent = 'Allowed from ' + cur.status + ': ' + (D.TASK_TRANSITIONS[cur.status] || []).join(' · ');
    document.getElementById('tdCode').textContent = cur.code;
    document.getElementById('tdOrigin').textContent = cur.task_origin;
    document.getElementById('tdActors').textContent = D.empName(cur.assignee) + ' · ' + (cur.assigner ? D.empName(cur.assigner) : 'NULL');
    document.getElementById('tdProject').textContent = cur.project ? D.projName(cur.project) : 'Tanpa proyek';
    document.getElementById('tdOrig').textContent = D.stampDate(cur.original_due_date);
    document.getElementById('tdGate').style.display = 'none';
    document.getElementById('tdReasonFld').style.display = 'none';
    document.getElementById('tdReason').value = '';
    renderHistory();
    F.wireSelects(document.getElementById('tskDetail'));
    F.setupDates(document.getElementById('tskDetail'));
    F.openModal('tskDetail');
  }

  document.getElementById('tskBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-tdetail]');
    if (b) openTask(b.getAttribute('data-tdetail'));
  });
  document.getElementById('tdCat').addEventListener('select', function (e) { td.cat = e.detail.value; });
  document.getElementById('tdPrio').addEventListener('select', function (e) { td.prio = e.detail.value; });
  document.getElementById('tdStatus').addEventListener('select', function (e) { td.status = e.detail.value; document.getElementById('tdGate').style.display = 'none'; });
  document.getElementById('tdDue').addEventListener('datechange', function (e) {
    var back = e.detail.iso > cur.due_date;
    document.getElementById('tdReasonFld').style.display = back ? '' : 'none';
  });

  document.getElementById('tdSave').addEventListener('click', function () {
    var name = document.getElementById('tdName').value.trim();
    if (!name) { F.toast('Task title cannot be blank.', 'warn'); return; }
    var newDue = document.getElementById('tdDue').dataset.iso || cur.due_date;
    var moved = newDue > cur.due_date;
    var reason = document.getElementById('tdReason').value.trim();
    if (moved && !reason) {
      F.toast('422 PROD_TASK_DUE_DATE_REASON_REQUIRED — a backwards due date needs a reason.', 'danger');
      document.getElementById('tdReasonFld').style.display = '';
      return;
    }
    if (td.status !== cur.status && (D.TASK_TRANSITIONS[cur.status] || []).indexOf(td.status) < 0) {
      document.getElementById('tdGateMsg').textContent = cur.status + ' → ' + td.status + ' is outside the frozen diagram. Allowed next states: ' + (D.TASK_TRANSITIONS[cur.status] || []).join(', ') + '.';
      document.getElementById('tdGate').style.display = '';
      return;
    }
    var hist = D.TASK_HISTORY[cur.code] || (D.TASK_HISTORY[cur.code] = []);
    var actor = cur.task_origin === 'DITUGASKAN' && cur.assigner ? cur.assigner : persona;
    if (td.cat !== cur.category) {
      hist.unshift({ changed_field: 'TASK_CATEGORY', old_value: cur.category ? D.catName(cur.category) : null, new_value: td.cat ? D.catName(td.cat) : null, change_reason: null, created_by: persona, created_at: '2026-08-13T09:40:00+07:00' });
      cur.category = td.cat || null;
    }
    if (newDue !== cur.due_date) {
      hist.unshift({ changed_field: 'DUE_DATE', old_value: cur.due_date, new_value: newDue, change_reason: reason || null, created_by: actor, created_at: '2026-08-13T09:40:00+07:00' });
      cur.due_date = newDue;
    }
    if (td.status !== cur.status) {
      var logs = td.status === 'TERTAHAN' || cur.status === 'TERTAHAN' || ['SELESAI', 'DIBATALKAN'].indexOf(cur.status) >= 0;
      if (logs) hist.unshift({ changed_field: 'STATUS', old_value: cur.status, new_value: td.status, change_reason: null, created_by: persona, created_at: '2026-08-13T09:40:00+07:00' });
      cur.status = td.status;
    }
    cur.task_title = name;
    cur.description = document.getElementById('tdDescInput').value.trim() || null;
    cur.priority = td.prio;
    F.closeModal('tskDetail'); drawTasks();
    F.toast('200 OK — ' + cur.code + ' updated.', 'ok');
  });

  // ---------------- category master ----------------
  function drawCats() {
    var hr = persona === 'HESTI';
    document.getElementById('catBody').innerHTML = D.CATEGORIES.map(function (c) {
      var acts;
      if (!hr) acts = '<div class="rowacts"><button class="rowbtn" type="button" disabled title="HR only">HR only</button></div>';
      else acts = F.rowMenu([
        { label: 'Edit', icon: 'pencil', attr: 'data-cedit="' + c.code + '"' },
        { label: c.is_active ? 'Deactivate' : 'Activate', icon: 'power', attr: 'data-ctoggle="' + c.code + '"' },
        { label: 'Delete', icon: 'trash-2', attr: 'data-cdel="' + c.code + '"', danger: true }
      ]);
      return '<tr>' +
        '<td class="cell-strong">' + c.name + '</td>' +
        '<td>' + D.badge(c.is_active ? 'green' : 'grey', c.is_active ? 'is_active=true' : 'is_active=false') + '</td>' +
        '<td>' + (c.used ? D.badge('blue', 'USED') : '<span class="cell-dim">never</span>') + '</td>' +
        '<td>' + D.stampDate(c.created_at) + '</td>' +
        '<td class="ta-r">' + acts + '</td></tr>';
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  var editing = null, cfActive = 1;
  var cfName = document.getElementById('cfName'), cfSave = document.getElementById('cfSave');
  cfName.addEventListener('input', function () {
    document.getElementById('cfCount').textContent = cfName.value.length;
    document.getElementById('cfDup').style.display = 'none';
    cfSave.disabled = !cfName.value.trim();
  });
  document.getElementById('cfActive').addEventListener('click', function (e) {
    var b = e.target.closest('[data-active]');
    if (!b) return;
    this.querySelectorAll('[data-active]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    cfActive = +b.getAttribute('data-active');
  });
  function openCat(code) {
    editing = code || null;
    var c = code ? D.byCode(D.CATEGORIES, code) : null;
    document.getElementById('cfTitle').textContent = c ? 'Edit ' + c.name : 'New category';
    cfName.value = c ? c.name : '';
    document.getElementById('cfCount').textContent = cfName.value.length;
    document.getElementById('cfActiveFld').style.display = c ? '' : 'none';
    cfActive = c ? (c.is_active ? 1 : 0) : 1;
    document.getElementById('cfActive').querySelectorAll('[data-active]').forEach(function (x) { x.classList.toggle('is-on', +x.getAttribute('data-active') === cfActive); });
    document.getElementById('cfDup').style.display = 'none';
    cfSave.disabled = !cfName.value.trim();
    F.openModal('catForm');
  }
  document.getElementById('catNewBtn').addEventListener('click', function () { openCat(null); });
  cfSave.addEventListener('click', function () {
    var name = cfName.value.trim();
    var dup = D.CATEGORIES.filter(function (c) { return c.is_active && c.name.toLowerCase() === name.toLowerCase() && c.code !== editing; }).length;
    if (dup) { document.getElementById('cfDup').style.display = ''; return; }
    if (editing) {
      var c = D.byCode(D.CATEGORIES, editing);
      c.name = name; c.is_active = cfActive === 1;
      F.closeModal('catForm'); drawCats();
      F.toast('200 OK — ' + name + ' updated (is_active=' + c.is_active + ').', 'ok');
    } else {
      var n = D.CATEGORIES.length + 1;
      D.CATEGORIES.push({ code: 'CAT-' + ('000' + n).slice(-4), name: name, is_active: true, used: false, created_at: '2026-08-13' });
      F.closeModal('catForm'); drawCats();
      F.toast('201 Created — category "' + name + '" added.', 'ok');
    }
  });

  document.getElementById('catBody').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-cedit]'), tg = e.target.closest('[data-ctoggle]'), dl = e.target.closest('[data-cdel]');
    if (ed) openCat(ed.getAttribute('data-cedit'));
    if (tg) {
      var c = D.byCode(D.CATEGORIES, tg.getAttribute('data-ctoggle'));
      c.is_active = !c.is_active; drawCats();
      F.toast('200 OK — ' + c.name + ' is_active=' + c.is_active + '.', c.is_active ? 'ok' : 'warn');
    }
    if (dl) {
      var k = D.byCode(D.CATEGORIES, dl.getAttribute('data-cdel'));
      if (k.used) {
        F.toast('409 PROD_TASK_CATEGORY_IN_USE — "' + k.name + '" has been used by a task. Deactivate it instead.', 'danger');
        return;
      }
      D.CATEGORIES.splice(D.CATEGORIES.indexOf(k), 1); drawCats();
      F.toast('200 OK — "' + k.name + '" soft-deleted (never used by a task).', 'ok');
    }
  });

  document.getElementById('catNewBtn').style.display = 'none';
  document.getElementById('catNote').textContent = 'Read-only: only HR may create, rename or deactivate a category.';
  drawTasks(); drawCats();
  if (window.lucide) window.lucide.createIcons();
})();
