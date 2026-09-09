// transition-dashboard.js — TR-DASHBOARD (single transition) + TASK-CARD + waive + clearance
(function () {
  'use strict';
  var F = window.Flow;
  var D = window.TR_DATA;
  var TYPE_ICON = { ONBOARDING: 'log-in', TRANSFER: 'arrow-left-right', OFFBOARDING: 'log-out' };

  var idx = (function () {
    var m = /[?&]tr=(\d+)/.exec(location.search);
    return m ? +m[1] : 0;
  })();
  var tr = D.transitions[idx] || D.transitions[0];

  function badge(map, k) { var b = map[k]; return '<span class="sb ' + b[0] + '"><span class="sb__dot"></span>' + b[1] + '</span>'; }

  var LIFE_NOTE = {
    TRANSFER: 'Two-sided move — the origin unit relinquishes, the destination provisions. The position moves atomically when the effective date arrives and all required tasks are done. Blocked if another structural transition is open (max one per employee).',
    ONBOARDING: 'Triggered after New Joiner materialisation (contract-signed). Tasks provision access and assets; employment status flips to active automatically on the start date — completing tasks does not change it directly.',
    OFFBOARDING: 'reason_category sets the path: resign / contract-end / retirement run a notice period (still paid to the leave date); termination-with-cause is immediate (access revoked). Clearance-blocking tasks hold the terminal state.'
  };

  // ---------- render summary hero ----------
  function renderHero() {
    document.getElementById('crumbId').textContent = tr.id;
    document.getElementById('heroIcon').setAttribute('data-lucide', TYPE_ICON[tr.type]);
    document.getElementById('heroKind').textContent = D.TYPE_LABEL[tr.type];
    document.getElementById('heroName').textContent = tr.emp;
    document.getElementById('heroStatus').innerHTML = badge(D.TR_BADGE, tr.status);

    var sub = document.getElementById('heroSub');
    if (tr.subtype) { sub.classList.remove('is-hidden'); document.getElementById('heroSubTxt').textContent = tr.subtype; }
    else sub.classList.add('is-hidden');

    var route = document.getElementById('heroRoute');
    if (tr.type === 'OFFBOARDING') {
      route.innerHTML = '<span class="pos"><i data-lucide="briefcase"></i>' + tr.from + '</span>' +
        '<span class="arrow"><i data-lucide="move-right"></i></span>' +
        '<span class="pos" style="color:var(--color-error-600)"><i data-lucide="door-open"></i>' + tr.reason + '</span>';
    } else {
      route.innerHTML = '<span class="pos"><i data-lucide="briefcase"></i>' + tr.from + '</span>' +
        '<span class="arrow"><i data-lucide="move-right"></i></span>' +
        '<span class="pos"><i data-lucide="badge-check"></i><b>' + tr.to + '</b></span>';
    }
    document.getElementById('heroEff').innerHTML = 'Effective date · <b>' + F.fmtDate(tr.date) + '</b>';
    document.getElementById('lifeNote').innerHTML = '<i data-lucide="info"></i><span>' + (LIFE_NOTE[tr.type] || '') + '</span>';
  }

  // ---------- stepper ----------
  function renderSteps() {
    var wrap = document.getElementById('steps');
    var cancelled = tr.status === 'CANCELLED';
    wrap.classList.toggle('is-cancelled', cancelled);
    var curIx = D.STEP_ORDER.indexOf(tr.status);
    if (cancelled) curIx = 1; // show approval done, cancelled at progress
    var SUBS = { IN_APPROVAL: 'Parent-chain review', IN_PROGRESS: 'Tasks running', COMPLETED: 'Move applied' };
    wrap.innerHTML = D.STEP_ORDER.map(function (s, i) {
      var cls = '', inner = (i + 1);
      if (i < curIx) { cls = 'is-done'; inner = '<i data-lucide="check"></i>'; }
      else if (i === curIx && !cancelled) { cls = 'is-active'; }
      var subTxt = SUBS[s];
      if (cancelled && i === 1) { subTxt = 'Cancelled before effective'; }
      return '<div class="td-step ' + cls + '">' +
        '<div class="td-step__node">' + inner + '</div>' +
        '<div class="td-step__label">' + s.replace('_', ' ') + '</div>' +
        '<div class="td-step__sub">' + subTxt + '</div>' +
      '</div>';
    }).join('');
  }

  // ---------- meter ----------
  function renderMeter() {
    var p = D.pct(tr), done = D.doneCount(tr), total = tr.tasks.length;
    document.getElementById('meterTxt').innerHTML = done + ' of ' + total + ' tasks done <span>· ' + (total - done) + ' remaining</span>';
    document.getElementById('meterBar').style.width = p + '%';
    document.getElementById('meterPct').textContent = p + '%';
  }

  // ---------- task cards, grouped by side ----------
  var GROUPS = [
    { key: 'RELINQUISH', tag: 'rel', label: 'Relinquish — origin unit', desc: 'Handover & asset return at the current unit.' },
    { key: 'PROVISION',  tag: 'pro', label: 'Provision — destination unit', desc: 'Access & assets set up at the new unit.' },
    { key: '',           tag: 'gen', label: 'Tasks', desc: '' }
  ];
  function cardHtml(t, gi, ti) {
    var m = D.TASK_META[t.status];
    var overdue = t.late && (t.status !== 'COMPLETED' && t.status !== 'WAIVED' && t.status !== 'SKIPPED') ? '<span class="overdue"><i data-lucide="alarm-clock"></i>Overdue</span>' : '';
    var blocking = t.blocking ? '<span class="tcard__row"><i data-lucide="shield-alert"></i><b>Clearance-blocking</b></span>' : '';
    var dep = t.dep ? '<span class="tcard__row"><i data-lucide="link"></i>Waits on: ' + t.dep + '</span>' : '';
    var skip = t.skip ? '<span class="tcard__row"><i data-lucide="info"></i>Reason: ' + t.skip + '</span>' : '';
    var owner = t.owner ? t.owner : '— (vacant seat)';
    var sched = (t.rel || t.due)
      ? '<span class="tcard__row"><i data-lucide="calendar"></i>' + (t.rel ? 'Released ' + F.fmtDate(t.rel) : 'Not released') + (t.due ? ' → due ' + F.fmtDate(t.due) : '') + '</span>'
      : '<span class="tcard__row"><i data-lucide="calendar-off"></i>No schedule</span>';
    var foot = '';
    if (t.status === 'RELEASED' || t.status === 'IN_PROGRESS') foot = '<button class="rowbtn" data-complete="' + gi + '-' + ti + '">Mark done (PIC)</button>';
    else if (t.status === 'AWAITING_CONFIRM') foot = '<button class="rowbtn" data-confirm="' + gi + '-' + ti + '">Confirm receipt (employee)</button>';
    var canWaive = t.status !== 'COMPLETED' && t.status !== 'WAIVED' && t.status !== 'SKIPPED';
    var waiveBtn = canWaive ? '<button class="rowbtn rowbtn--ghost" data-waive="' + gi + '-' + ti + '">Waive</button>' : '';
    var tbadge = '<span class="sb ' + m[1] + '"><span class="sb__dot"></span>' + m[2] + '</span>';
    return '<div class="tcard ' + m[0] + (overdue ? ' is-late' : '') + '">' +
      '<div class="tcard__top"><div class="tcard__title">' + t.t + '</div>' + tbadge + '</div>' +
      '<div class="tcard__meta"><span class="tcard__row"><i data-lucide="user"></i>' + owner + '</span>' + sched + blocking + dep + skip + '</div>' +
      (overdue || foot || waiveBtn ? '<div class="tcard__foot">' + overdue + foot + waiveBtn + '</div>' : '') +
    '</div>';
  }
  function renderTasks() {
    var host = document.getElementById('taskGroups');
    document.getElementById('taskCount').textContent = tr.tasks.length;
    if (!tr.tasks.length) {
      host.innerHTML = '<div class="muted-empty">No tasks yet — this transition is awaiting approval. Tasks spawn once the parent chain approves.</div>';
      return;
    }
    var hasSides = tr.tasks.some(function (t) { return t.side; });
    var html = '';
    if (hasSides) {
      GROUPS.forEach(function (g, gi) {
        var items = tr.tasks.filter(function (t) { return (t.side || '') === g.key; });
        if (!items.length) return;
        html += '<div class="td-group"><div class="td-group__head">' +
          '<span class="td-group__tag td-group__tag--' + g.tag + '">' + g.key + '</span>' +
          '<span class="td-group__desc">' + g.desc + '</span></div><div class="tcards">' +
          items.map(function (t) { return cardHtml(t, gi, tr.tasks.indexOf(t)); }).join('') + '</div></div>';
      });
    } else {
      html = '<div class="tcards">' + tr.tasks.map(function (t, ti) { return cardHtml(t, 2, ti); }).join('') + '</div>';
    }
    host.innerHTML = html;
    host.querySelectorAll('[data-complete]').forEach(function (b) { b.addEventListener('click', function () { completeTask(taskIx(b.dataset.complete)); }); });
    host.querySelectorAll('[data-confirm]').forEach(function (b) { b.addEventListener('click', function () { confirmTask(taskIx(b.dataset.confirm)); }); });
    host.querySelectorAll('[data-waive]').forEach(function (b) { b.addEventListener('click', function () { openWaive(taskIx(b.dataset.waive)); }); });
  }
  function taskIx(v) { return +v.split('-')[1]; }

  function refresh() {
    renderSteps(); renderMeter(); renderTasks();
    document.getElementById('heroStatus').innerHTML = badge(D.TR_BADGE, tr.status);
    document.getElementById('clearanceBtn').classList.toggle('is-hidden', tr.type !== 'OFFBOARDING' || tr.status === 'COMPLETED');
    if (window.lucide) window.lucide.createIcons();
  }

  function completeTask(ti) {
    var t = tr.tasks[ti];
    var twoParty = /return|receiv|equipment|asset|laptop/i.test(t.t);
    if (twoParty) { t.status = 'AWAITING_CONFIRM'; F.toast('Task marked done by PIC. Awaiting employee confirmation.', 'info'); }
    else { t.status = 'COMPLETED'; F.toast('Task completed.', 'ok'); }
    maybeComplete(); refresh();
  }
  function confirmTask(ti) { tr.tasks[ti].status = 'COMPLETED'; F.toast('Receipt confirmed. Task completed.', 'ok'); maybeComplete(); refresh(); }
  function maybeComplete() {
    if (D.pct(tr) === 100 && tr.status !== 'COMPLETED' && tr.type !== 'OFFBOARDING') {
      tr.status = 'COMPLETED';
      F.toast('All required tasks done — ' + tr.emp + '\u2019s move completes on the effective date.', 'ok');
    }
  }

  // ---------- waive (GAP PROB-FRONTEND-003) ----------
  var waiveTi = null, waiveClass = 'STANDARD';
  var waiveClassSeg = document.getElementById('waiveClass');
  var waiveReason = document.getElementById('waiveReason');
  var waiveBtnEl = document.getElementById('waiveBtn');
  function openWaive(ti) {
    waiveTi = ti; waiveClass = 'STANDARD';
    var t = tr.tasks[ti];
    document.getElementById('waiveDesc').textContent = 'Waiving \u201c' + t.t + '\u201d marks it WAIVED so it stops blocking the transition. Recorded to the audit log with your identity.';
    waiveClassSeg.querySelectorAll('.seg__opt').forEach(function (o) { o.classList.toggle('is-on', o.dataset.val === 'STANDARD'); });
    waiveReason.value = ''; waiveBtnEl.disabled = true;
    F.openModal('trWaive');
  }
  waiveClassSeg.querySelectorAll('.seg__opt').forEach(function (o) {
    o.addEventListener('click', function () { waiveClass = o.dataset.val; waiveClassSeg.querySelectorAll('.seg__opt').forEach(function (x) { x.classList.toggle('is-on', x === o); }); });
  });
  waiveReason.addEventListener('input', function () { waiveBtnEl.disabled = waiveReason.value.trim().length === 0; });
  waiveBtnEl.addEventListener('click', function () {
    var t = tr.tasks[waiveTi];
    t.status = 'WAIVED'; t.skip = waiveReason.value.trim(); t.waiveClass = waiveClass;
    F.closeModal('trWaive');
    F.toast('Task waived (' + waiveClass.toLowerCase() + ' control, audited).', 'warn');
    refresh();
  });

  // ---------- clearance ----------
  document.getElementById('clearanceBtn').addEventListener('click', function () {
    var blockers = tr.tasks.filter(function (t) { return t.blocking; });
    document.getElementById('clearBody').innerHTML = blockers.map(function (t) {
      var m = D.TASK_META[t.status];
      var done = t.status === 'COMPLETED' || t.status === 'WAIVED';
      return '<tr><td class="cell-strong">' + t.t + '</td><td class="cell-dim">' + t.owner + '</td>' +
        '<td>' + (done ? '<span class="sb sb--green"><span class="sb__dot"></span>Cleared</span>' : '<span class="sb sb--red"><span class="sb__dot"></span>Blocking</span>') + '</td>' +
        '<td><span class="sb ' + m[1] + '"><span class="sb__dot"></span>' + m[2] + '</span></td></tr>';
    }).join('') || '<tr><td colspan="4"><div class="muted-empty">No clearance-blocking tasks.</div></td></tr>';
    F.openModal('trClear');
    if (window.lucide) window.lucide.createIcons();
  });
  var forceReason = document.getElementById('forceReason');
  forceReason.addEventListener('input', function () { document.getElementById('forceBtn').disabled = forceReason.value.trim().length === 0; });
  document.getElementById('forceBtn').addEventListener('click', function () {
    tr.tasks.forEach(function (t) { if (t.blocking && t.status !== 'COMPLETED') t.status = 'COMPLETED'; });
    tr.status = 'COMPLETED';
    F.closeModal('trClear'); forceReason.value = ''; document.getElementById('forceBtn').disabled = true;
    F.toast('Clearance force-released (audited). ' + tr.emp + ' offboarding completed.', 'warn');
    refresh();
  });

  // init
  renderHero();
  refresh();
})();
