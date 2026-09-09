// SEVAKA HRIS — Payroll › Authorization & Handover (document version). Actor: Maya Anggraini, ROLE_HR_MANAGER.
(function () {
  var F = window.Flow, D = window.PD;
  var ME = 'MAYA', TODAY = '2026-09-28';

  // ---------------------------------------------------------------- periods
  var perF = { status: 'ALL', q: '' }, actId = null;
  var pgPer = F.pager('pgPer', 10, drawPeriods, 'periods');
  var pgTrait = F.pager('pgTrait', 10, drawTrait, 'proposals');
  var pgQueue = F.pager('pgQueue', 10, drawQueue, 'proposals');
  var pgHist = F.pager('pgHist', 10, drawQueue, 'decided rows');
  var pgBatch = F.pager('pgBatch', 10, drawBatch, 'batches');
  var pgPend = F.pager('pgPend', 10, drawHandover, 'periods');
  var pgPick = F.pager('pgPick', 10, drawHandover, 'pickups');
  var pgRex = F.pager('pgRex', 10, drawHandover, 'requests');

  function openFindings(pid) { return D.FINDINGS.filter(function (f) { return f.p === pid && !f.fs; }); }
  function blockingFindings(pid) { return openFindings(pid).filter(function (f) { return f.t !== 'PERIOD_NOT_PICKED_UP'; }); }
  function gatesOk(p) { return !!p.g1 && !!p.g2 && D.gate3(p); }

  function perActions(p) {
    var items = [];
    if (p.status === 'REVIEWED') items.push({ label: 'Lock', icon: 'lock', attr: 'data-lock="' + p.id + '"' });
    if (p.status === 'LOCKED') {
      items.push({ label: 'Authorise handover', icon: 'send', attr: 'data-auth="' + p.id + '"' });
      items.push({ label: 'Reopen', icon: 'unlock', attr: 'data-reopen="' + p.id + '"' });
    }
    items.push({ label: 'View Detail', icon: 'eye', attr: 'data-pdet="' + p.id + '"' });
    if (items.length === 1) return '<div class="rowacts"><button class="rowbtn" data-pdet="' + p.id + '">View Detail</button></div>';
    return F.rowMenu(items);
  }
  function drawPeriods() {
    var all = D.PERIODS.filter(function (p) {
      if (perF.status !== 'ALL' && p.status !== perF.status) return false;
      if (perF.q && (D.plabel(p) + ' ' + D.pname(p)).toLowerCase().indexOf(perF.q) < 0) return false;
      return true;
    });
    pgPer.total = all.length;
    var view = pgPer.slice(all);
    document.getElementById('perBody').innerHTML = view.length ? view.map(function (p) {
      var open = openFindings(p.id).length;
      return '<tr><td class="cell-mono">' + D.plabel(p) + '<div class="person__sub">' + D.pname(p) + '</div></td>' +
        '<td class="ta-c">' + D.sb(p.status) + '</td>' +
        '<td>' + D.gate(!!p.g1, p.g1 ? F.fmtDate(p.g1) : 'Not yet') + '</td>' +
        '<td>' + D.gate(!!p.g2, p.g2 ? F.fmtDate(p.g2) : 'Not yet') + '</td>' +
        '<td>' + D.gate(D.gate3(p), '10/10 frozen') + '</td>' +
        '<td class="ta-c">' + (open ? D.badge('amber', open + ' OPEN') : D.badge('green', 'NONE')) + '</td>' +
        '<td>' + D.stamp(p.calc) + '</td>' +
        '<td>' + D.stamp(p.lock || p.hand) + '</td>' +
        '<td class="ta-r">' + perActions(p) + '</td></tr>';
    }).join('') : '<tr><td colspan="9"><div class="tempty">No period matches the filter.</div></td></tr>';
    document.getElementById('cntPer').textContent = D.PERIODS.length;
    pgPer.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function timeline(pid) {
    return (D.HISTORY[pid] || []).map(function (h) {
      return '<div class="pd-tl__i"><div class="pd-tl__d">' + F.fmtDate(h.at) + '<div>' + D.ACTOR[h.by].name + '</div></div>' +
        '<div><div class="pd-tl__b">' + (h.from ? h.from + ' → ' + h.to : 'Period created → ' + h.to) + '</div>' +
        (h.reason ? '<div class="pd-tl__r">Reopen reason — ' + h.reason + '</div>' : '') + '</div></div>';
    }).join('');
  }
  function drawDetail(id) {
    var p = D.period(id);
    document.getElementById('detailTitle').textContent = 'Period detail — ' + D.plabel(p) + ' · ' + D.pname(p);
    document.getElementById('detailBody').innerHTML =
      '<div class="kv"><div class="kv__k">Current status</div><div class="kv__v">' + D.sb(p.status) + '</div></div>' +
      '<div class="subtabs" style="margin-top:14px"><span class="seg">' +
        '<button class="seg__btn is-on" type="button" data-sub="his">Status history</button>' +
        '<button class="seg__btn" type="button" data-sub="par">Frozen parameters</button>' +
      '</span></div>' +
      '<div class="subpanel is-on" data-subpanel="his"><div style="margin-top:10px">' + timeline(p.id) + '</div></div>' +
      '<div class="subpanel" data-subpanel="par"><div class="dtable-wrap" style="margin-top:12px"><table class="dtable">' +
        '<thead><tr><th>Parameter</th><th>Category</th><th>Value</th><th>Source effective date</th></tr></thead><tbody>' +
        D.PARAMS.map(function (r) {
          return '<tr><td class="cell-mono">' + r.k + '</td><td>' + D.sb(r.c) + '</td><td class="cell-strong">' + r.v + '</td>' +
            '<td>' + (r.src ? F.fmtDate(r.src) : '<span class="cell-dim">— (not a REGULATION row)</span>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="pd-card__s" style="margin-top:10px">Ten rows, fixed — a short read-only list, so it is not paginated.</div></div>';
    if (window.lucide) window.lucide.createIcons();
    F.openModal('mDetail');
  }

  // ---------------------------------------------------------------- proposals
  function drawTrait() {
    var all = D.COMPONENTS.filter(function (c) { return c.ps === 'MENUNGGU_PERSETUJUAN' && c.prop && !c.prop.decided; });
    var rows = pgTrait.slice(all);
    document.getElementById('traitBody').innerHTML = rows.length ? rows.map(function (c) {
      var chg = [];
      if (c.prop.fixed !== undefined) chg.push('is_fixed: ' + (c.fixed ? 'yes' : 'no') + ' → ' + (c.prop.fixed ? 'yes' : 'no'));
      if (c.prop.ot !== undefined) chg.push('is_overtime_basis: ' + (c.ot ? 'yes' : 'no') + ' → ' + (c.prop.ot ? 'yes' : 'no'));
      if (c.prop.tax !== undefined) chg.push('is_taxable: ' + (c.tax ? 'yes' : 'no') + ' → ' + (c.prop.tax ? 'yes' : 'no'));
      if (c.prop.bpjs !== undefined) chg.push('is_bpjs_deductible: ' + (c.bpjs ? 'yes' : 'no') + ' → ' + (c.prop.bpjs ? 'yes' : 'no'));
      return '<tr><td class="cell-mono">' + c.code + '</td><td class="cell-strong">' + c.name + '</td>' +
        '<td>' + chg.join('<br>') + '</td><td>' + F.fmtDate(c.prop.eff) + '</td>' +
        '<td>' + D.ACTOR[c.prop.by].name + '<div class="person__sub">' + F.fmtDate(c.prop.at) + '</div></td>' +
        '<td class="ta-c">' + D.sb(c.ps) + '</td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" data-trait="' + c.id + '">Review</button></div></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">No trait proposal awaiting a decision.</div></td></tr>';
    pgTrait.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function drawQueue() {
    var rows = pgQueue.slice(D.PROPOSALS.filter(function (p) { return p.st === 'MENUNGGU_PERSETUJUAN'; }));
    document.getElementById('queueBody').innerHTML = rows.length ? rows.map(function (p) {
      return '<tr><td class="cell-mono">' + p.id + '</td><td>' + D.empCell(p.e) + '</td><td>' + p.c + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(p.amt) + '</span></td>' +
        '<td>' + F.fmtDate(p.from) + '</td>' +
        '<td>' + D.ACTOR[p.by].name + '<div class="person__sub">' + F.fmtDate(p.at) + '</div></td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" data-indiv="' + p.id + '">Review</button></div></td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">Nothing awaiting your decision.</div></td></tr>';
    pgQueue.paint();
    var hist = pgHist.slice(D.PROPOSALS.filter(function (p) { return p.st !== 'MENUNGGU_PERSETUJUAN'; }));
    document.getElementById('histBody').innerHTML = hist.length ? hist.map(function (p) {
      return '<tr><td class="cell-mono">' + p.id + '</td><td>' + D.empCell(p.e) + '</td><td>' + p.c + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(p.amt) + '</span></td>' +
        '<td class="ta-c">' + D.sb(p.st) + '</td>' +
        '<td>' + (p.dec ? D.ACTOR[p.dec[0]].name + '<div class="person__sub">' + F.fmtDate(p.dec[1]) + '</div>' : '—') + '</td>' +
        '<td>' + (p.rej ? p.rej : '<span class="cell-dim">—</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">No decided proposal yet.</div></td></tr>';
    pgHist.paint();
    document.getElementById('cntProp').textContent =
      D.COMPONENTS.filter(function (c) { return c.ps === 'MENUNGGU_PERSETUJUAN' && c.prop && !c.prop.decided; }).length +
      D.PROPOSALS.filter(function (p) { return p.st === 'MENUNGGU_PERSETUJUAN'; }).length +
      (D.BATCH.status === 'MENUNGGU_PERSETUJUAN' ? 1 : 0);
  }
  function drawBatch() {
    var b = D.BATCH;
    var rows = pgBatch.slice([b]);
    document.getElementById('batchBody').innerHTML = rows.map(function (b) {
      return '<tr><td class="cell-mono">' + b.id + '</td><td class="cell-strong">' + b.name + '</td>' +
      '<td class="ta-c">' + D.sb(b.status) + '</td><td class="ta-r">' + b.impact.affected_count + '</td>' +
      '<td class="ta-c">' + (b.esc ? D.badge('amber', 'ESCALATION REQUIRED') : D.badge('grey', 'NOT REQUIRED')) + '</td>' +
      '<td>' + D.ACTOR[b.by].name + '<div class="person__sub">' + F.fmtDate(b.at) + '</div></td>' +
      '<td class="ta-r"><div class="rowacts"><button class="rowbtn" data-bdet="1">View Detail</button></div></td></tr>';
    }).join('');
    pgBatch.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function drawBatchDetail() {
    var b = D.BATCH, im = b.impact;
    document.getElementById('batchDetTitle').textContent = b.id + ' · ' + b.name;
    document.getElementById('batchDetDecide').style.display = b.status === 'MENUNGGU_PERSETUJUAN' ? '' : 'none';
    document.getElementById('batchDetBody').innerHTML =
      '<div class="kv"><div class="kv__k">Status</div><div class="kv__v">' + D.sb(b.status) + '</div>' +
      '<div class="kv__k">Submitted by</div><div class="kv__v">' + D.ACTOR[b.by].name + ' · ' + F.fmtDate(b.at) + '</div></div>' +
      '<div style="margin-top:14px">' + D.impactBlock(im) + '</div>' +
      '<div class="dtable-wrap" style="margin-top:14px"><table class="dtable">' +
      '<thead><tr><th>Employee</th><th>Component</th><th class="ta-r">Increase</th></tr></thead><tbody>' +
      b.members.map(function (m) {
        return '<tr><td>' + D.empCell(m.e) + '</td><td>' + m.c + '</td>' +
          '<td class="ta-r"><span class="money">+ ' + D.rp(m.delta) + '</span></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="pd-card__s" style="margin-top:12px">Each row is an <code>amount_delta</code> — the increase, not the resulting salary. The contract response carries no before/after pair, and the member list is fixed at submit, so it is not paginated.</div>';
    if (window.lucide) window.lucide.createIcons();
    F.openModal('mBatchDet');
  }

  // ---------------------------------------------------------------- handover
  function drawHandover() {
    var pend = pgPend.slice(D.HO_PENDING);
    document.getElementById('pendBody').innerHTML = pend.length ? pend.map(function (h) {
      var p = D.period(h.p);
      var fnd = D.FINDINGS.filter(function (f) { return f.p === h.p && f.t === 'PERIOD_NOT_PICKED_UP' && !f.fs; })[0];
      return '<tr><td class="cell-mono">' + D.plabel(p) + '<div class="person__sub">' + D.pname(p) + '</div></td>' +
        '<td class="ta-r">' + h.count + '</td><td>' + F.fmtDate(h.at) + '</td>' +
        '<td>' + (fnd ? D.badge('amber', fnd.id + ' · PERIOD_NOT_PICKED_UP') : '<span class="cell-dim">—</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="tempty">Nothing is waiting for pickup.</div></td></tr>';
    pgPend.paint();
    var pick = pgPick.slice(D.HO_PICKUP);
    document.getElementById('pickBody').innerHTML = pick.map(function (r) {
      return '<tr><td class="cell-mono">' + D.plabel(D.period(r.p)) + '</td><td>' + r.at + ' <span class="pv-tag">WIB</span></td>' +
        '<td class="ta-r">' + r.count + '</td><td class="cell-mono">' + r.mach + '</td>' +
        '<td><span class="cell-dim">— (NULL by design)</span></td>' +
        '<td>' + (r.re ? 'Second collection, after re-export RX-0001' : 'First collection') + '</td></tr>';
    }).join('');
    pgPick.paint();
    var rex = pgRex.slice(D.HO_REEXPORT);
    document.getElementById('rexBody').innerHTML = rex.length ? rex.map(function (r) {
      return '<tr><td class="cell-mono">' + r.id + '</td><td>' + D.plabel(D.period(r.p)) + '</td>' +
        '<td>' + D.ACTOR[r.by].name + '</td><td>' + r.at + ' <span class="pv-tag">WIB</span></td>' +
        '<td class="ta-c">' + (r.gate === 'DISETUJUI' ? D.badge('green', 'DISETUJUI') : D.badge('red', r.gate)) + '</td>' +
        '<td style="max-width:360px">' + r.reason + '</td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty">No re-export requested yet.</div></td></tr>';
    pgRex.paint();
    document.getElementById('cntHand').textContent = D.HO_PENDING.length;
  }

  // ---------------------------------------------------------------- re-export gates
  var rexPid = 'p6';
  function paintRexGates() {
    var p = D.period(rexPid);
    var g1 = p.status === 'HANDED_OVER';
    var g2 = D.HO_PICKUP.some(function (r) { return r.p === rexPid; });
    document.getElementById('rexGates').innerHTML = '<div class="pd-check">' +
      D.chk(g1, 'Gate i — the period has been handed over. ' + (g1 ? '' : 'Otherwise <code>422 PAY_HANDOVER_NOT_YET_SUBMITTED</code>.')) +
      D.chk(g2, 'Gate ii — the bridge rows have already been picked up by the client. ' + (g2 ? '' : 'Rows are still waiting, so the request is refused with <code>422 PAY_HANDOVER_ALREADY_DONE</code>.')) +
      '</div>' +
      (g1 && g2 ? '' : '<div class="note note--info" style="margin-top:4px"><i data-lucide="info"></i><span>Both gates are evaluated synchronously by the server. Even a refusal writes its <code>reason_text</code> and <code>gate_result</code> into <code>log_payroll_handover_reexport</code> — the attempt is never silent. The button stays disabled here so the checker is not sent into a known refusal.</span></div>');
    if (window.lucide) window.lucide.createIcons();
    document.getElementById('rexGo').disabled = !(g1 && g2);
  }

  // ---------------------------------------------------------------- init
  document.addEventListener('DOMContentLoaded', function () {
    drawPeriods(); drawTrait(); drawQueue(); drawBatch(); drawHandover();

    document.getElementById('refOpen').addEventListener('click', function () { F.openModal('mRef'); });
    document.getElementById('perStatus').addEventListener('select', function (e) {
      perF.status = e.detail.value === 'All statuses' ? 'ALL' : e.detail.value; drawPeriods();
    });
    document.getElementById('perSearch').addEventListener('input', function (e) { perF.q = e.target.value.toLowerCase(); drawPeriods(); });

    // ---- lock
    function openLock(id) {
      actId = id;
      var p = D.period(id);
      var maker = p.calc && p.calc[0] !== ME;
      document.getElementById('lockBody').innerHTML =
        '<div class="kv"><div class="kv__k">Period</div><div class="kv__v">' + D.plabel(p) + ' · ' + D.pname(p) + '</div>' +
        '<div class="kv__k">Current status</div><div class="kv__v">' + D.sb(p.status) + '</div></div>' +
        '<div class="pd-card__s" style="margin:16px 0 10px">Four conditions</div><div class="pd-check">' +
        D.chk(!!p.g1, 'Gate 1 — time reconciliation completed' + (p.g1 ? ' on ' + F.fmtDate(p.g1) : ' — not yet, <code>422 PAY_LOCK_BLOCKED_TIME_MISMATCH</code>')) +
        D.chk(!!p.g2, 'Gate 2 — finance deduction pull completed in full' + (p.g2 ? ' on ' + F.fmtDate(p.g2) : ' — not yet, <code>422 PAY_LOCK_BLOCKED_FINANCE_INCOMPLETE</code>')) +
        D.chk(D.gate3(p), 'Gate 3 — all ten <code>cnf_payroll_period_param_snapshot</code> rows are frozen (10/10). Otherwise <code>422 PAY_LOCK_BLOCKED_NO_PARAM_SNAPSHOT</code>.') +
        D.chk(maker, 'Maker–checker — the officer who calculated it (' + (p.calc ? D.ACTOR[p.calc[0]].name : '—') + ') is not you. Otherwise <code>403 PAY_MAKER_CHECKER_VIOLATION</code>.') +
        '</div>' +
        '<div class="note note--info" style="margin-top:12px"><i data-lucide="info"></i><span>The three gates are evaluated <strong>in order</strong>, so the server reports the first one that fails. <code>payroll.allow_lock_before_cutoff</code> only permits an earlier lock <em>moment</em> — it never waives a gate.</span></div>';
      document.getElementById('lockGo').disabled = !(gatesOk(p) && maker);
      if (window.lucide) window.lucide.createIcons();
      F.openModal('mLock');
    }
    document.getElementById('lockGo').addEventListener('click', function () {
      var p = D.period(actId);
      p.status = 'LOCKED'; p.lock = [ME, TODAY];
      D.HISTORY[p.id].push({ from: 'REVIEWED', to: 'LOCKED', by: ME, at: TODAY, reason: null });
      F.closeModal('mLock'); F.toast(D.plabel(p) + ' locked.', 'ok'); drawPeriods();
    });

    // ---- reopen
    var reopenTarget = 'REVIEWED';
    document.getElementById('reopenTarget').addEventListener('select', function (e) { reopenTarget = e.detail.value; });
    document.getElementById('reopenGo').addEventListener('click', function () {
      var reason = document.getElementById('reopenReason').value.trim();
      if (reason.length < 10) { F.toast('422 — the reason must be at least 10 characters.', 'error'); return; }
      var p = D.period(actId);
      if (p.lock && p.lock[0] !== ME) { F.toast('403 — only the holder of the lock may reopen this period.', 'error'); return; }
      D.HISTORY[p.id].push({ from: 'LOCKED', to: reopenTarget, by: ME, at: TODAY, reason: reason });
      p.status = reopenTarget; p.lock = null;
      if (reopenTarget === 'CALCULATED') p.rev = null;
      document.getElementById('reopenReason').value = '';
      F.closeModal('mReopen'); F.toast(D.plabel(p) + ' reopened to ' + reopenTarget + '.', 'ok'); drawPeriods();
    });

    // ---- authorize handover
    function openAuth(id) {
      actId = id;
      var p = D.period(id);
      var blocking = blockingFindings(id), retention = openFindings(id).filter(function (f) { return f.t === 'PERIOD_NOT_PICKED_UP'; });
      var scoped = D.FINDINGS.filter(function (f) { return f.p === id && f.t !== 'PERIOD_NOT_PICKED_UP'; });
      document.getElementById('authBody').innerHTML =
        '<div class="kv"><div class="kv__k">Period</div><div class="kv__v">' + D.plabel(p) + ' · ' + D.pname(p) + '</div>' +
        '<div class="kv__k">Current status</div><div class="kv__v">' + D.sb(p.status) + '</div>' +
        '<div class="kv__k">After this step</div><div class="kv__v">HANDED_OVER — permanent, no way back</div></div>' +
        '<div class="pd-card__s" style="margin:16px 0 8px">Pre-authorisation gate — the twelve employee-subject finding types on this period</div>' +
        (scoped.length
          ? '<div class="dtable-wrap"><table class="dtable"><thead><tr><th>Finding</th><th>Employee</th><th class="ta-c">Final state</th></tr></thead><tbody>' +
            scoped.map(function (f) {
              return '<tr><td class="cell-mono">' + f.id + '<div class="person__sub">' + f.t + '</div></td>' +
                '<td>' + D.empCell(f.e) + '</td><td class="ta-c">' + D.fstate(f.fs) + '</td></tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="tempty">This period produced no employee-subject finding at all.</div>') +
        '<div class="pd-check" style="margin-top:14px">' +
        D.chk(blocking.length === 0, blocking.length === 0
          ? 'Zero rows with <code>final_state IS NULL</code> — the gate passes.'
          : blocking.length + ' finding(s) still open — <code>422 PAY_OPEN_FINDING_BLOCKS_HANDOVER</code>: ' + blocking.map(function (f) { return f.id; }).join(', ')) +
        '</div>' +
        (retention.length ? '<div class="note note--info" style="margin-top:12px"><i data-lucide="info"></i><span>' + retention.length + ' <code>PERIOD_NOT_PICKED_UP</code> row is open but deliberately not counted — its subject is the period, so it is a retention gate on an already handed-over period, not an authorisation gate.</span></div>' : '');
      document.getElementById('authGo').disabled = blocking.length > 0;
      if (window.lucide) window.lucide.createIcons();
      F.openModal('mAuth');
    }
    document.getElementById('authGo').addEventListener('click', function () {
      var p = D.period(actId);
      p.status = 'HANDED_OVER'; p.hand = [ME, TODAY];
      D.HISTORY[p.id].push({ from: 'LOCKED', to: 'HANDED_OVER', by: ME, at: TODAY, reason: null });
      D.HO_PENDING.push({ p: p.id, count: p.employees, at: TODAY });
      F.closeModal('mAuth'); F.toast(D.plabel(p) + ' handed over — the bridge table is waiting for the client system.', 'ok');
      drawPeriods(); drawHandover();
    });

    // ---- delegated
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-pdet],[data-lock],[data-reopen],[data-auth],[data-trait],[data-indiv],[data-bdet],[data-bdecide]');
      if (!t) return;
      if (t.hasAttribute('data-pdet')) { drawDetail(t.getAttribute('data-pdet')); return; }
      if (t.hasAttribute('data-lock')) { openLock(t.getAttribute('data-lock')); return; }
      if (t.hasAttribute('data-auth')) { openAuth(t.getAttribute('data-auth')); return; }
      if (t.hasAttribute('data-reopen')) {
        actId = t.getAttribute('data-reopen');
        var p = D.period(actId);
        document.getElementById('reopenInfo').innerHTML =
          '<div class="kv"><div class="kv__k">Period</div><div class="kv__v">' + D.plabel(p) + '</div>' +
          '<div class="kv__k">Locked by</div><div class="kv__v">' + (p.lock ? D.ACTOR[p.lock[0]].name + ' · ' + F.fmtDate(p.lock[1]) : '—') + '</div></div>';
        F.openModal('mReopen'); return;
      }
      if (t.hasAttribute('data-trait')) {
        actId = t.getAttribute('data-trait');
        var c = null; D.COMPONENTS.forEach(function (x) { if (x.id === actId) c = x; });
        var sameMaker = c.prop.by === ME;
        document.getElementById('traitTitle').textContent = 'Decide trait proposal · ' + c.code;
        document.getElementById('traitBodyM').innerHTML =
          '<div class="kv"><div class="kv__k">Component</div><div class="kv__v">' + c.code + ' · ' + c.name + '</div>' +
          '<div class="kv__k">Proposed change</div><div class="kv__v"><code>is_overtime_basis</code>: ' + (c.ot ? 'yes' : 'no') + ' → ' + (c.prop.ot ? 'yes' : 'no') + '<div class="person__sub">The other three traits are untouched — <code>is_fixed</code>, <code>is_taxable</code>, <code>is_bpjs_deductible</code>.</div></div>' +
          '<div class="kv__k">Effective from</div><div class="kv__v">' + F.fmtDate(c.prop.eff) + ' — computed by the system, not typed in</div>' +
          '<div class="kv__k">Proposed by</div><div class="kv__v">' + D.ACTOR[c.prop.by].name + ' · ' + F.fmtDate(c.prop.at) + '</div>' +
          '<div class="kv__k">Employees affected</div><div class="kv__v">' + c.used + '</div></div>' +
          '<div class="note note--' + (sameMaker ? 'danger' : 'info') + '" style="margin-top:14px"><i data-lucide="' + (sameMaker ? 'alert-triangle' : 'info') + '"></i><span>' +
          (sameMaker ? 'You proposed this change — deciding it yourself returns <code>403 PAY_MAKER_CHECKER_VIOLATION</code>.'
                     : 'Approving does <strong>not</strong> flip the active traits: <code>proposal_state</code> stays <code>MENUNGGU_PERSETUJUAN</code> and the daily scheduler promotes <code>proposed_*</code> on ' + F.fmtDate(c.prop.eff) + '. Rejecting clears <code>proposed_*</code> to NULL and takes no reason field.') + '</span></div>';
        document.getElementById('traitApprove').disabled = sameMaker;
        if (window.lucide) window.lucide.createIcons();
        F.openModal('mTrait'); return;
      }
      if (t.hasAttribute('data-indiv')) {
        actId = t.getAttribute('data-indiv');
        var pr = null; D.PROPOSALS.forEach(function (x) { if (x.id === actId) pr = x; });
        var same = pr.by === ME;
        document.getElementById('indivTitle').textContent = 'Decide salary proposal · ' + pr.id;
        document.getElementById('indivBody').innerHTML =
          '<div class="kv"><div class="kv__k">Employee</div><div class="kv__v">' + D.emp(pr.e).name + ' · ' + D.emp(pr.e).nik + '</div>' +
          '<div class="kv__k">Component</div><div class="kv__v">' + pr.c + '</div>' +
          '<div class="kv__k">Current amount</div><div class="kv__v">' + (pr.prev ? D.rp(pr.prev) : 'No running row yet — this is the first value') + '</div>' +
          '<div class="kv__k">Proposed amount</div><div class="kv__v">' + D.rp(pr.amt) + '</div>' +
          '<div class="kv__k">Effective from</div><div class="kv__v">' + F.fmtDate(pr.from) + '</div>' +
          '<div class="kv__k">Proposed by</div><div class="kv__v">' + D.ACTOR[pr.by].name + ' · ' + F.fmtDate(pr.at) + '</div></div>' +
          (same ? '<div class="note note--danger"><i data-lucide="alert-triangle"></i><span>You raised this proposal — deciding it yourself returns <code>403</code>.</span></div>' : '') +
          '<div class="fld"><label class="fld__label">Rejection reason <span style="font-weight:500;color:var(--fg-4)">(required only when rejecting)</span></label>' +
          '<div class="ctl ctl--area"><textarea id="indivReason" rows="3" placeholder="Why this proposal is turned down"></textarea></div></div>';
        document.getElementById('indivApprove').disabled = same;
        if (window.lucide) window.lucide.createIcons();
        F.openModal('mIndiv'); return;
      }
      if (t.hasAttribute('data-bdet')) { drawBatchDetail(); return; }
      if (t.hasAttribute('data-bdecide')) {
        F.closeModal('mBatchDet');
        var b = D.BATCH, isApprover = b.escApprover === ME;
        document.getElementById('batchDecideBody').innerHTML =
          '<div class="kv"><div class="kv__k">Batch</div><div class="kv__v">' + b.id + ' · ' + b.name + '</div>' +
          '<div class="kv__k">Affected employees</div><div class="kv__v">' + b.impact.affected_count + '</div>' +
          '<div class="kv__k">Net cost shift</div><div class="kv__v">' + D.rp(b.impact.net_cost_shift_amount) + ' per month</div>' +
          '<div class="kv__k">Escalation</div><div class="kv__v">' + (b.esc ? 'Required — ' + D.ACTOR[b.escApprover].name : 'Not required') + '</div></div>' +
          '<div class="pd-check">' + D.chk(isApprover, isApprover
            ? 'You are the named escalation approver.'
            : 'Approval is locked — only ' + D.ACTOR[b.escApprover].name + ' may approve this batch (<code>403</code>). Rejection stays open to you.') + '</div>' +
          '<div class="fld"><label class="fld__label">Rejection reason <span style="font-weight:500;color:var(--fg-4)">(required only when rejecting)</span></label>' +
          '<div class="ctl ctl--area"><textarea id="batchReason" rows="3" placeholder="Why this batch is turned down"></textarea></div></div>';
        document.getElementById('batchApprove').disabled = !isApprover;
        if (window.lucide) window.lucide.createIcons();
        F.openModal('mBatch'); return;
      }
    });

    // ---- decisions
    document.getElementById('traitApprove').addEventListener('click', function () {
      D.COMPONENTS.forEach(function (c) {
        if (c.id === actId) { c.prop.decided = 'DISETUJUI'; c.prop.decBy = ME; c.prop.decAt = TODAY; }
      });
      F.closeModal('mTrait');
      F.toast('Approved. proposal_state stays MENUNGGU_PERSETUJUAN — the daily scheduler promotes the traits on the effective date.', 'ok');
      drawTrait(); drawQueue();
    });
    document.getElementById('traitReject').addEventListener('click', function () {
      D.COMPONENTS.forEach(function (c) { if (c.id === actId) { c.ps = 'AKTIF'; c.prop = null; } });
      F.closeModal('mTrait'); F.toast('Rejected — proposed_* cleared to NULL, proposal_state back to AKTIF. No reason is recorded by contract.', 'info'); drawTrait(); drawQueue();
    });
    document.getElementById('indivApprove').addEventListener('click', function () {
      D.PROPOSALS.forEach(function (p) { if (p.id === actId) { p.st = 'DISETUJUI'; p.dec = [ME, TODAY]; } });
      F.closeModal('mIndiv'); F.toast('Proposal approved — the new value becomes current on its effective date.', 'ok'); drawQueue();
    });
    document.getElementById('indivReject').addEventListener('click', function () {
      var r = document.getElementById('indivReason').value.trim();
      if (!r) { F.toast('422 — rejection_reason is mandatory.', 'error'); return; }
      D.PROPOSALS.forEach(function (p) { if (p.id === actId) { p.st = 'DITOLAK'; p.dec = [ME, TODAY]; p.rej = r; } });
      F.closeModal('mIndiv'); F.toast('Proposal rejected.', 'info'); drawQueue();
    });
    document.getElementById('batchApprove').addEventListener('click', function () {
      D.BATCH.status = 'DISETUJUI';
      F.closeModal('mBatch'); F.toast('Batch approved.', 'ok'); drawBatch(); drawQueue();
    });
    document.getElementById('batchReject').addEventListener('click', function () {
      var r = document.getElementById('batchReason').value.trim();
      if (!r) { F.toast('422 — rejection_reason is mandatory.', 'error'); return; }
      D.BATCH.status = 'DITOLAK';
      F.closeModal('mBatch'); F.toast('Batch rejected.', 'info'); drawBatch(); drawQueue();
    });

    // ---- re-export
    document.getElementById('rexOpen').addEventListener('click', function () { paintRexGates(); F.openModal('mRex'); });
    document.getElementById('rexPeriod').addEventListener('select', function (e) { rexPid = e.detail.value; paintRexGates(); });
    document.getElementById('rexGo').addEventListener('click', function () {
      var r = document.getElementById('rexReason').value.trim();
      if (!r) { F.toast('422 — reason_text is mandatory.', 'error'); return; }
      D.HO_REEXPORT.push({ id: 'RX-000' + (D.HO_REEXPORT.length + 1), p: rexPid, by: ME, at: TODAY + ' 09:00', gate: 'DISETUJUI', reason: r });
      document.getElementById('rexReason').value = '';
      F.closeModal('mRex'); F.toast('201 — lines copied again into the bridge table.', 'ok'); drawHandover();
    });
  });
})();
