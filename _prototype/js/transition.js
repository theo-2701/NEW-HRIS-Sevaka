// transition.js — TR list page (TR-DASHBOARD list) + TR-CREATE (ONB/TRF/OFF).
// Task detail lives on transition-dashboard.html; data is shared via window.TR_DATA.
(function () {
  'use strict';
  var F = window.Flow;
  var D = window.TR_DATA;
  var transitions = D.transitions;
  var TYPE_LABEL = D.TYPE_LABEL, TR_BADGE = D.TR_BADGE;

  var AVCOL = ['#026395', '#0284c7', '#0369a1', '#075985', '#7ab9d4'];
  function badge(map, k) { var b = map[k]; return '<span class="sb ' + b[0] + '"><span class="sb__dot"></span>' + b[1] + '</span>'; }

  var pgTr = F.pager('pgTr', 10, function () { renderTable(); }, 'transitions');
  function renderTable() {
    document.getElementById('trBody').innerHTML = pgTr.slice(transitions).map(function (tr) {
      var i = transitions.indexOf(tr);
      var p = D.pct(tr);
      return '<tr>' +
        '<td><div class="person"><span class="avatar avatar--sm" style="background:' + AVCOL[i % AVCOL.length] + '">' + tr.init + '</span><div class="person__meta"><span class="person__name">' + tr.emp + '</span></div></div></td>' +
        '<td>' + TYPE_LABEL[tr.type] + '</td>' +
        '<td class="cell-dim">' + tr.detail + '</td>' +
        '<td class="cell-dim">' + F.fmtDate(tr.date) + '</td>' +
        '<td><div style="display:flex;align-items:center;gap:8px"><div class="impact__bar" style="width:80px"><span style="width:' + p + '%"></span></div><span class="cell-dim">' + p + '%</span></div></td>' +
        '<td>' + badge(TR_BADGE, tr.status) + '</td>' +
        '<td class="ta-r"><a class="rowbtn" href="transition-dashboard.html?tr=' + i + '">View Detail</a></td>' +
      '</tr>';
    }).join('');
    document.getElementById('trCount').textContent = transitions.length;
    pgTr.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------- NEW TRANSITION MENU ----------
  var menu = document.getElementById('newTrMenu');
  document.getElementById('newTrBtn').addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('is-open'); });
  document.addEventListener('click', function () { menu.classList.remove('is-open'); });
  menu.addEventListener('click', function (e) { e.stopPropagation(); });

  var FLOW_NOTE = {
    ONBOARDING: 'Spawns IT, GA and HR tasks. Employee confirms equipment receipt to close two-party tasks.',
    TRANSFER: 'Spawns two-sided tasks — relinquish at the origin unit and provision at the destination. Blocked if another structural transition is open.',
    OFFBOARDING: 'Runs clearance tasks. The terminal state is held until clearance-blocking tasks clear or an elevated approver force-releases.'
  };
  var createType = null;
  menu.querySelectorAll('.menu__item').forEach(function (it) {
    it.addEventListener('click', function () { menu.classList.remove('is-open'); openCreate(it.dataset.type); });
  });
  function openCreate(type) {
    createType = type;
    document.getElementById('trCreateTitle').textContent = 'New ' + TYPE_LABEL[type].toLowerCase();
    document.getElementById('trCreateDesc').textContent = type === 'TRANSFER' ? 'Two-sided move — origin relinquishes, destination provisions.' : (type === 'OFFBOARDING' ? 'Notice-based unless terminated with cause.' : 'Provision access and assets for the new hire.');
    document.getElementById('trfBlock').classList.toggle('is-hidden', type !== 'TRANSFER');
    document.getElementById('offBlock').classList.toggle('is-hidden', type !== 'OFFBOARDING');
    document.getElementById('trFlowNote').textContent = FLOW_NOTE[type];
    document.getElementById('offImmediate').classList.add('is-hidden');
    empPicked = subPicked = destPicked = reasonPicked = gradePicked = false;
    resetSel('trEmp', 'Select employee'); resetSel('trSub', 'Select sub-type'); resetSel('trDest', 'Select position'); resetSel('trReason', 'Select reason'); resetSel('trGrade', 'Select target job grade');
    document.getElementById('trGradeFld').classList.add('is-hidden');
    gradeNeeded = false;
    document.getElementById('trDate').value = '';
    syncCreate();
    F.openModal('trCreate');
  }
  function resetSel(id, ph) { var v = document.getElementById(id).querySelector('.ctl__value'); v.textContent = ph; v.style.color = 'var(--fg-4)'; document.getElementById(id).querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); }); }

  var empPicked = false, subPicked = false, destPicked = false, reasonPicked = false, gradePicked = false, gradeNeeded = false;
  document.getElementById('trEmp').addEventListener('select', function () { empPicked = true; syncCreate(); });
  document.getElementById('trSub').addEventListener('select', function () {
    subPicked = true;
    var sub = document.getElementById('trSub').querySelector('.ctl__value').textContent.trim().toUpperCase();
    gradeNeeded = sub === 'PROMOTION' || sub === 'DEMOTION';
    document.getElementById('trGradeFld').classList.toggle('is-hidden', !gradeNeeded);
    syncCreate();
  });
  document.getElementById('trGrade').addEventListener('select', function () { gradePicked = true; syncCreate(); });
  document.getElementById('trDest').addEventListener('select', function () { destPicked = true; syncCreate(); });
  document.getElementById('trReason').addEventListener('select', function (e) {
    reasonPicked = true;
    document.getElementById('offImmediate').classList.toggle('is-hidden', e.detail.value !== 'TERMINATION');
    syncCreate();
  });
  document.getElementById('trDate').addEventListener('change', syncCreate);
  function syncCreate() {
    var ok = empPicked && document.getElementById('trDate').value;
    if (createType === 'TRANSFER') ok = ok && subPicked && destPicked && (!gradeNeeded || gradePicked);
    if (createType === 'OFFBOARDING') ok = ok && reasonPicked;
    document.getElementById('trSubmit').disabled = !ok;
  }
  document.getElementById('trSubmit').addEventListener('click', function () {
    var emp = document.getElementById('trEmp').querySelector('.ctl__value').textContent.split(' — ')[0];
    var init = emp.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    var detail, status, tasks, extra = {};
    if (createType === 'TRANSFER') {
      var sub = document.getElementById('trSub').querySelector('.ctl__value').textContent;
      var dest = document.getElementById('trDest').querySelector('.ctl__value').textContent;
      detail = sub + ' → ' + dest; status = 'IN_APPROVAL'; tasks = [];
      extra = { subtype: sub.toUpperCase(), from: '—', to: dest };
      if (gradeNeeded) {
        var tg = document.getElementById('trGrade').querySelector('.ctl__value').textContent;
        detail = sub + ' → ' + dest + ' · ' + tg;
        extra.target_job_grade = tg;
      }
    } else if (createType === 'OFFBOARDING') {
      detail = document.getElementById('trReason').querySelector('.ctl__value').textContent;
      status = 'IN_PROGRESS'; tasks = D.mkTasks('OFFBOARDING');
      extra = { reason: detail, from: '—', to: '—' };
    } else { detail = 'New joiner onboarding'; status = 'IN_PROGRESS'; tasks = D.mkTasks('ONBOARDING'); extra = { from: '—', to: '—' }; }
    var seq = 500 - transitions.length;
    transitions.unshift(Object.assign({ id: 'TR-2026-0' + seq, emp: emp, init: init, type: createType, detail: detail, date: document.getElementById('trDate').value, status: status, tasks: tasks }, extra));
    F.closeModal('trCreate'); renderTable();
    F.toast(TYPE_LABEL[createType] + ' created for ' + emp + (status === 'IN_APPROVAL' ? ' — awaiting parent-chain approval.' : ' — tasks spawned.'), 'ok');
  });

  renderTable();
})();
