// manpower-requisition.js — MP-OVERVIEW + MP-CREATE + REQ-CREATE + REQ-APPROVE
// Runs after shell.js, dashboard.js, flow-common.js.
(function () {
  'use strict';
  var F = window.Flow;
  var ME = 'Tony Stark'; // current user (checker/maker context)

  var REQ_BADGE = {
    DRAFT:       ['sb--grey',  'Draft'],
    IN_APPROVAL: ['sb--blue',  'In approval'],
    APPROVED:    ['sb--green', 'Approved'],
    REJECTED:    ['sb--red',   'Rejected'],
    FULFILLED:   ['sb--green', 'Fulfilled'],
    CANCELLED:   ['sb--grey',  'Cancelled']
  };
  var TERMINAL = { REJECTED: 1, FULFILLED: 1, CANCELLED: 1 };

  // headcount (renamed from quantity — FSD 0.2 §3.1) · position_title required
  var reqs = [
    { id: 'REQ-0231', title: 'Staff Finance',          unit: 'Finance — BR-Papua',    parent: 'Finance Manager',    headcount: 2, status: 'IN_APPROVAL', maker: 'Rina Hartono',   note: 'Regional expansion in Papua; two finance staff to cover new branch ledger.' },
    { id: 'REQ-0230', title: 'Backend Engineer',       unit: 'Engineering — HQ',       parent: 'Engineering Manager', headcount: 1, status: 'APPROVED',    maker: 'Dewi Anggraini', note: 'Backfill for resigned backend engineer.' },
    { id: 'REQ-0229', title: 'HR Business Partner',    unit: 'People Ops — HQ',        parent: 'Head of People',     headcount: 1, status: 'APPROVED',    maker: 'Rina Hartono',   note: 'HRBP for growing Jakarta headcount.' },
    { id: 'REQ-0228', title: 'Sales Executive',        unit: 'Sales — BR-Surabaya',    parent: 'Operations Lead',    headcount: 3, status: 'FULFILLED',   maker: 'Bagus Pratama',  note: 'Q1 sales ramp — all three seats filled.' },
    { id: 'REQ-0227', title: 'Warehouse Coordinator',  unit: 'Operations — BR-Jakarta',parent: 'Operations Lead',    headcount: 1, status: 'DRAFT',        maker: 'Tony Stark',     note: 'Warehouse coordinator — pending justification sign-off.' },
    { id: 'REQ-0226', title: 'Staff Finance',          unit: 'Finance — BR-Papua',     parent: 'Finance Manager',    headcount: 1, status: 'REJECTED',     maker: 'Bagus Pratama',  note: 'Duplicate of REQ-0231 — rejected by checker.' }
  ];

  var planLines = [
    { unit: 'Finance — BR-Papua', target: 12 },
    { unit: 'Operations — BR-Jakarta', target: 24 },
    { unit: 'Engineering — HQ', target: 18 },
    { unit: 'People Ops — HQ', target: 8 },
    { unit: 'Sales — BR-Surabaya', target: 22 }
  ];

  // plan_title + period_start/period_end (renamed from period_year — FSD 0.2 §3.1)
  var plans = [
    { title: 'Rencana Headcount 2026', start: '2026-01-01', end: '2026-12-31', status: 'ACTIVE', by: 'Rina Hartono', lines: [
      { unit: 'Finance — BR-Papua', target: 12, actual: 10 },
      { unit: 'Operations — BR-Jakarta', target: 24, actual: 22 },
      { unit: 'Engineering — HQ', target: 18, actual: 18 },
      { unit: 'People Ops — HQ', target: 8, actual: 7 },
      { unit: 'Sales — BR-Surabaya', target: 22, actual: 20 }
    ] },
    { title: 'Rencana Headcount 2027', start: '2027-01-01', end: '2027-12-31', status: 'DRAFT', by: 'Rina Hartono', lines: [
      { unit: 'Engineering — HQ', target: 6, actual: null }
    ] },
    { title: 'Rencana Headcount 2025', start: '2025-01-01', end: '2025-12-31', status: 'CLOSED', by: 'Rina Hartono', lines: [
      { unit: 'Finance — BR-Papua', target: 10, actual: 10 },
      { unit: 'Operations — BR-Jakarta', target: 12, actual: 12 },
      { unit: 'Engineering — HQ', target: 8, actual: 8 },
      { unit: 'Sales — BR-Surabaya', target: 8, actual: 8 }
    ] },
    { title: 'Rencana Headcount 2024', start: '2024-01-01', end: '2024-12-31', status: 'ARCHIVED', by: 'Sari Melati', lines: [
      { unit: 'Finance — BR-Papua', target: 9, actual: 9 },
      { unit: 'Operations — BR-Jakarta', target: 12, actual: 12 },
      { unit: 'Engineering — HQ', target: 10, actual: 10 }
    ] }
  ];
  var PLAN_BADGE = { DRAFT: ['sb--grey','Draft'], ACTIVE: ['sb--green','Active'], CLOSED: ['sb--blue','Closed'], ARCHIVED: ['sb--grey','Archived'] };

  function badge(map, k) { var b = map[k] || ['sb--grey', k]; return '<span class="sb ' + b[0] + '"><span class="sb__dot"></span>' + b[1] + '</span>'; }

  var pgReq = F.pager('pgReq', 10, function () { renderReqs(); }, 'requisitions');
  function renderReqs() {
    var body = document.getElementById('reqBody');
    body.innerHTML = pgReq.slice(reqs).map(function (r) {
      var i = reqs.indexOf(r);
      var actionable = r.status === 'IN_APPROVAL';
      var btn = r.status === 'IN_APPROVAL'
        ? '<button class="rowbtn" data-review="' + i + '">Review</button>'
        : '<button class="rowbtn" data-review="' + i + '">View Detail</button>';
      return '<tr>' +
        '<td class="cell-strong">' + r.id + '</td>' +
        '<td>' + r.title + '</td>' +
        '<td>' + r.unit + '</td>' +
        '<td class="cell-dim">' + r.parent + '</td>' +
        '<td class="ta-c cell-strong">' + r.headcount + '</td>' +
        '<td>' + badge(REQ_BADGE, r.status) + '</td>' +
        '<td class="cell-dim">' + r.maker + '</td>' +
        '<td class="ta-r">' + btn + '</td>' +
      '</tr>';
    }).join('');
    document.getElementById('reqCount').textContent = reqs.length;
    pgReq.paint();
    body.querySelectorAll('[data-review]').forEach(function (b) {
      b.addEventListener('click', function () { openReview(+b.dataset.review); });
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function renderPlans() {
    var caretSvg = function (open) { return '<svg class="mp-caret' + (open ? ' is-open' : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'; };
    var gapCell = function (target, actual) {
      if (actual == null) return '<span class="cell-dim">—</span>';
      var g = target - actual;
      return '<span class="gapv ' + (g > 0 ? 'gapv--pos' : 'gapv--zero') + '">' + g + '</span>';
    };
    var html = '';
    plans.forEach(function (p) {
      var tT = 0, tA = 0, hasA = false;
      p.lines.forEach(function (l) { tT += l.target; if (l.actual != null) { tA += l.actual; hasA = true; } });
      var open = p.status === 'ACTIVE';
      var key = p.start;
      html +=
        '<tr class="plan-row is-click" data-plan="' + key + '">' +
          '<td class="cell-strong">' + caretSvg(open) + p.title +
            ' <span class="cell-dim" style="font-weight:500">· ' + F.fmtDate(p.start) + ' – ' + F.fmtDate(p.end) + ' · ' + p.lines.length + ' unit</span></td>' +
          '<td class="ta-r cell-strong">' + tT + '</td>' +
          '<td class="ta-r">' + (hasA ? tA : '<span class="cell-dim">—</span>') + '</td>' +
          '<td class="ta-r">' + (hasA ? gapCell(tT, tA) : '<span class="cell-dim">—</span>') + '</td>' +
          '<td>' + badge(PLAN_BADGE, p.status) + '</td>' +
        '</tr>';
      p.lines.forEach(function (l) {
        html +=
          '<tr class="unit-row" data-plan-child="' + key + '"' + (open ? '' : ' hidden') + '>' +
            '<td class="cell-dim">' + l.unit + '</td>' +
            '<td class="ta-r">' + l.target + '</td>' +
            '<td class="ta-r">' + (l.actual == null ? '<span class="cell-dim">—</span>' : l.actual) + '</td>' +
            '<td class="ta-r">' + gapCell(l.target, l.actual) + '</td>' +
            '<td></td>' +
          '</tr>';
      });
    });
    var body = document.getElementById('planBody');
    body.innerHTML = html;
    body.querySelectorAll('.plan-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var y = row.getAttribute('data-plan');
        var caret = row.querySelector('.mp-caret');
        var isOpen = caret.classList.toggle('is-open');
        body.querySelectorAll('.unit-row[data-plan-child="' + y + '"]').forEach(function (u) { u.hidden = !isOpen; });
      });
    });
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------- REQ-APPROVE ----------
  var reviewIdx = null;
  function openReview(i) {
    reviewIdx = i;
    var r = reqs[i];
    document.getElementById('reqApproveKv').innerHTML =
      row('Requisition', r.id) + row('Position title', r.title) + row('Unit', r.unit) + row('Reports to', r.parent) +
      row('Headcount', r.headcount + ' position(s)') + row('Status', badge(REQ_BADGE, r.status)) +
      row('Maker', r.maker) + row('Justification', r.note);
    var canDecide = r.status === 'IN_APPROVAL';
    document.getElementById('reqApproveBtn').style.display = canDecide ? '' : 'none';
    document.getElementById('reqRejectBtn').style.display = canDecide ? '' : 'none';
    F.openModal('reqApproveModal');
    if (window.lucide) window.lucide.createIcons();
  }
  function row(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  document.getElementById('reqApproveBtn').addEventListener('click', function () {
    var r = reqs[reviewIdx];
    if (r.maker === ME) { F.toast('409 — segregation of duties: you created this requisition and cannot approve it.', 'danger'); return; }
    r.status = 'APPROVED';
    F.closeModal('reqApproveModal'); renderReqs();
    F.toast(r.id + ' approved. An open seat is being provisioned for ' + r.unit + '.', 'ok');
  });
  document.getElementById('reqRejectBtn').addEventListener('click', function () {
    var r = reqs[reviewIdx];
    if (r.maker === ME) { F.toast('409 — segregation of duties: you created this requisition and cannot decide on it.', 'danger'); return; }
    r.status = 'REJECTED';
    F.closeModal('reqApproveModal'); renderReqs();
    F.toast(r.id + ' rejected.', 'warn');
  });

  // ---------- REQ-CREATE ----------
  var newReqBtn = document.getElementById('newReqBtn');
  newReqBtn.addEventListener('click', function () { F.openModal('reqModal'); });
  var reqNote = document.getElementById('reqNote');
  var submitReq = document.getElementById('submitReqBtn');
  var unitPicked = false, parentPicked = false;
  document.getElementById('reqUnit').addEventListener('select', function () { unitPicked = true; syncReq(); });
  document.getElementById('reqParent').addEventListener('select', function () { parentPicked = true; syncReq(); });
  reqNote.addEventListener('input', function () {
    document.getElementById('reqNoteCount').textContent = reqNote.value.length;
    syncReq();
  });
  var reqTitle = document.getElementById('reqTitle');
  function syncReq() {
    var qty = +document.getElementById('reqQty').value;
    submitReq.disabled = !(unitPicked && parentPicked && reqTitle.value.trim().length > 0 && qty >= 1 && reqNote.value.trim().length > 0);
  }
  document.getElementById('reqQty').addEventListener('input', syncReq);
  reqTitle.addEventListener('input', syncReq);
  function resetReqForm() {
    reqNote.value = ''; document.getElementById('reqNoteCount').textContent = '0';
    reqTitle.value = '';
    document.getElementById('reqQty').value = 1;
    unitPicked = parentPicked = false; syncReq();
    document.getElementById('reqUnit').querySelector('.ctl__value').textContent = 'Select unit';
    document.getElementById('reqUnit').querySelector('.ctl__value').style.color = 'var(--fg-4)';
    document.getElementById('reqParent').querySelector('.ctl__value').textContent = 'Select parent position';
    document.getElementById('reqParent').querySelector('.ctl__value').style.color = 'var(--fg-4)';
  }
  document.getElementById('saveReqDraftBtn').addEventListener('click', function () {
    var unit = unitPicked ? document.getElementById('reqUnit').querySelector('.ctl__value').textContent : '—';
    var parent = parentPicked ? document.getElementById('reqParent').querySelector('.ctl__value').textContent : '—';
    var qty = +document.getElementById('reqQty').value || 1;
    var n = String(232 + Math.floor(Math.random() * 40));
    reqs.unshift({ id: 'REQ-0' + n, title: reqTitle.value.trim() || '—', unit: unit, parent: parent, headcount: qty, status: 'DRAFT', maker: ME, note: reqNote.value.trim() });
    F.closeModal('reqModal'); renderReqs();
    F.toast('Requisition saved as draft. You can edit and submit it later.', 'ok');
    resetReqForm();
  });
  submitReq.addEventListener('click', function () {
    var unit = document.getElementById('reqUnit').querySelector('.ctl__value').textContent;
    var parent = document.getElementById('reqParent').querySelector('.ctl__value').textContent;
    var qty = +document.getElementById('reqQty').value;
    var n = String(232 + Math.floor(Math.random() * 40));
    reqs.unshift({ id: 'REQ-0' + n, title: reqTitle.value.trim(), unit: unit, parent: parent, headcount: qty, status: 'IN_APPROVAL', maker: ME, note: reqNote.value.trim() });
    F.closeModal('reqModal'); renderReqs();
    F.toast('Requisition submitted for approval. Awaiting a different HR Manager.', 'info');
    // reset
    reqNote.value = ''; document.getElementById('reqNoteCount').textContent = '0';
    reqTitle.value = '';
    document.getElementById('reqQty').value = 1;
    unitPicked = parentPicked = false; syncReq();
    document.getElementById('reqUnit').querySelector('.ctl__value').textContent = 'Select unit';
    document.getElementById('reqUnit').querySelector('.ctl__value').style.color = 'var(--fg-4)';
    document.getElementById('reqParent').querySelector('.ctl__value').textContent = 'Select parent position';
    document.getElementById('reqParent').querySelector('.ctl__value').style.color = 'var(--fg-4)';
  });

  // ---------- MP-CREATE ----------
  var UNITS = ['Finance — BR-Papua','Operations — BR-Jakarta','Engineering — HQ','People Ops — HQ','Sales — BR-Surabaya'];
  document.getElementById('newPlanBtn').addEventListener('click', function () {
    document.getElementById('planTitle').value = '';
    document.getElementById('lineList').innerHTML = '';
    addLine(); addLine();
    F.openModal('planModal');
  });
  document.getElementById('addLineBtn').addEventListener('click', addLine);
  function addLine() {
    var wrap = document.getElementById('lineList');
    var el = document.createElement('div');
    el.className = 'mp-line';
    el.innerHTML =
      '<div class="fld" style="margin:0"><div class="ctl ctl--select"><span class="ctl__value" style="color:var(--fg-4)">Select unit</span>' +
      '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
      '<div class="dropdown">' + UNITS.map(function (u) { return '<div class="dropdown__opt">' + u + '</div>'; }).join('') + '</div></div></div>' +
      '<div class="fld" style="margin:0"><div class="ctl"><input type="number" min="0" value="0" placeholder="Target"></div></div>' +
      '<button class="rowbtn rowbtn--ghost" title="Remove" style="height:42px"><i data-lucide="trash-2"></i></button>';
    el.querySelector('.rowbtn').addEventListener('click', function () { el.remove(); });
    wrap.appendChild(el);
    F.wireSelects(el);
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('savePlanBtn').addEventListener('click', function () {
    var title = document.getElementById('planTitle').value.trim();
    var sEl = document.getElementById('planStart'), eEl = document.getElementById('planEnd');
    var start = sEl.dataset.iso || sEl.value;
    var end = eEl.dataset.iso || eEl.value;
    if (!title) { F.toast('Plan title is required.', 'warn'); return; }
    if (!start || !end) { F.toast('Both period start and period end are required.', 'warn'); return; }
    if (end < start) { F.toast('Period end must be on or after period start.', 'warn'); return; }
    var rows = document.querySelectorAll('#lineList .mp-line');
    if (rows.length < 1) { F.toast('Add at least one target line.', 'warn'); return; }
    var lines = [];
    rows.forEach(function (el) {
      var unit = el.querySelector('.ctl__value').textContent;
      var target = +el.querySelector('input[type="number"]').value || 0;
      lines.push({ unit: unit, target: target, actual: null });
    });
    plans.unshift({ title: title, start: start, end: end, status: 'DRAFT', by: ME, lines: lines });
    F.closeModal('planModal'); renderPlans();
    F.toast(title + ' saved as draft with ' + lines.length + ' target line(s).', 'ok');
  });

  renderReqs(); renderPlans();
})();
