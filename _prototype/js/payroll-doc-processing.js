// SEVAKA HRIS — Payroll › Salary Processing (document version). Actor: Rudi Hartono, ROLE_PAYROLL_OFFICER.
(function () {
  var F = window.Flow, D = window.PD;
  var ME = 'RUDI';

  // ---------------------------------------------------------------- periods
  var perF = { status: 'ALL', q: '' }, selPeriod = null;
  var pgPer = F.pager('pgPer', 10, drawPeriods, 'periods');

  function periodRows() {
    return D.PERIODS.filter(function (p) {
      if (perF.status !== 'ALL' && p.status !== perF.status) return false;
      if (perF.q && (D.plabel(p) + ' ' + D.pname(p)).toLowerCase().indexOf(perF.q) < 0) return false;
      return true;
    });
  }
  function perActions(p) {
    if (p.status === 'CALCULATED') {
      return F.rowMenu([
        { label: 'Review', icon: 'check-circle', attr: 'data-review="' + p.id + '"' },
        { label: 'Recalculate', icon: 'refresh-cw', attr: 'data-recalc="' + p.id + '"' },
        { label: 'View Detail', icon: 'eye', attr: 'data-pdet="' + p.id + '"' }
      ]);
    }
    return '<div class="rowacts"><button class="rowbtn" data-pdet="' + p.id + '">View Detail</button></div>';
  }
  function drawPeriods() {
    var all = periodRows();
    pgPer.total = all.length;
    var view = pgPer.slice(all);
    document.getElementById('perBody').innerHTML = view.length ? view.map(function (p) {
      return '<tr' + (selPeriod === p.id ? ' class="is-sel"' : '') + '>' +
        '<td class="cell-mono">' + D.plabel(p) + '<div class="person__sub">' + D.pname(p) + '</div></td>' +
        '<td class="ta-c">' + D.sb(p.status) + '</td>' +
        '<td>' + D.gate(!!p.g1, p.g1 ? F.fmtDate(p.g1) : 'Not completed') + '</td>' +
        '<td>' + D.gate(!!p.g2, p.g2 ? F.fmtDate(p.g2) : 'Not completed') + '</td>' +
        '<td>' + D.gate(D.gate3(p), '10/10 frozen') + '</td>' +
        '<td>' + D.stamp(p.calc) + '</td>' +
        '<td>' + D.stamp(p.rev) + '</td>' +
        '<td class="ta-r">' + perActions(p) + '</td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tempty"><span class="tempty__t">No period matches the filter.</span>Clear the status filter or search another year/month.</div></td></tr>';
    document.getElementById('cntPer').textContent = D.PERIODS.length;
    pgPer.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---- A3/A5/A6/A7 detail card
  function paramRows() {
    return D.PARAMS.map(function (r) {
      return '<tr><td class="cell-mono">' + r.k + '</td><td>' + D.sb(r.c) + '</td><td class="cell-strong">' + r.v + '</td>' +
        '<td>' + (r.src ? F.fmtDate(r.src) : '<span class="cell-dim">— (only REGULATION rows carry one)</span>') + '</td></tr>';
    }).join('');
  }
  function findSummary(pid) {
    var rows = D.FINDINGS.filter(function (f) { return f.p === pid; }).slice(0, 3);
    if (!rows.length) return '<div class="tempty">Zero findings raised for this period.</div>';
    return '<table class="dtable"><thead><tr><th>Finding</th><th>Type</th><th>Employee</th><th class="ta-c">Final state</th></tr></thead><tbody>' +
      rows.map(function (f) {
        return '<tr><td class="cell-mono">' + f.id + '</td><td>' + D.badge('indigo', f.t) + '</td><td>' + D.empCell(f.e) + '</td><td class="ta-c">' + D.fstate(f.fs) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }
  function timeline(pid) {
    return (D.HISTORY[pid] || []).map(function (h) {
      return '<div class="pd-tl__i"><div class="pd-tl__d">' + F.fmtDate(h.at) + '<div>' + D.ACTOR[h.by].name + '</div></div>' +
        '<div><div class="pd-tl__b">' + (h.from ? h.from + ' → ' + h.to : 'Period created → ' + h.to) + '</div>' +
        (h.reason ? '<div class="pd-tl__r">Reopen reason — ' + h.reason + '</div>' : '') + '</div></div>';
    }).join('');
  }
  function drawDetail() {
    var host = document.getElementById('perDetail');
    if (!selPeriod) { host.innerHTML = ''; return; }
    var p = D.period(selPeriod);
    var acts = p.status === 'CALCULATED'
      ? '<button class="btn btn--secondary" data-recalc="' + p.id + '">Recalculate</button><button class="btn btn--primary" data-review="' + p.id + '">Review</button>'
      : '<span class="pd-card__s">Read-only here — locking, reopening and handover authorisation live in Authorization &amp; Handover.</span>';
    host.innerHTML = '<div class="pd-card">' +
      '<div class="pd-card__head"><div><div class="pd-card__t">' + D.plabel(p) + ' · ' + D.pname(p) + ' ' + D.sb(p.status) + '</div>' +
      '<div class="pd-card__s">Frozen parameters, findings summary and status history below. Gates 1 and 2 are only evaluated when the checker locks the period — nothing blocks here.</div></div>' +
      '<div class="pd-acts">' + acts + '</div></div>' +
      '<div class="pd-grid pd-grid--4" style="margin-bottom:16px">' +
        '<div class="pd-stat"><div class="pd-stat__k">Calculated</div><div class="pd-stat__n" style="margin-top:8px">' + (p.calc ? D.ACTOR[p.calc[0]].name + ' · ' + F.fmtDate(p.calc[1]) : '—') + '</div></div>' +
        '<div class="pd-stat"><div class="pd-stat__k">Reviewed</div><div class="pd-stat__n" style="margin-top:8px">' + (p.rev ? D.ACTOR[p.rev[0]].name + ' · ' + F.fmtDate(p.rev[1]) : 'Not reviewed yet') + '</div></div>' +
        '<div class="pd-stat"><div class="pd-stat__k">Locked</div><div class="pd-stat__n" style="margin-top:8px">' + (p.lock ? D.ACTOR[p.lock[0]].name + ' · ' + F.fmtDate(p.lock[1]) : 'Not locked yet') + '</div></div>' +
        '<div class="pd-stat"><div class="pd-stat__k">Handed over</div><div class="pd-stat__n" style="margin-top:8px">' + (p.hand ? D.ACTOR[p.hand[0]].name + ' · ' + F.fmtDate(p.hand[1]) : 'Not handed over yet') + '</div></div>' +
      '</div>' +
      '<div class="subtabs"><span class="seg">' +
        '<button class="seg__btn is-on" type="button" data-sub="par">Frozen parameters</button>' +
        '<button class="seg__btn" type="button" data-sub="fnd">Findings summary</button>' +
        '<button class="seg__btn" type="button" data-sub="his">Status history</button>' +
      '</span></div>' +
      '<div class="subpanel is-on" data-subpanel="par"><div class="pd-card__s" style="margin:10px 0 12px">Ten parameters frozen the moment the period was run. Read <code>param_category</code> to interpret the shape of <code>param_value</code> — scalar, table or list.</div>' +
        '<div class="dtable-wrap dtable-wrap--scroll"><table class="dtable"><thead><tr><th>Parameter</th><th>Category</th><th>Value</th><th>Source effective date</th></tr></thead><tbody>' + paramRows() + '</tbody></table></div></div>' +
      '<div class="subpanel" data-subpanel="fnd"><div class="pd-card__s" style="margin:10px 0 12px">A curated subset of the same search that powers the Findings tab — three examples, not a separate endpoint.</div>' +
        '<div class="dtable-wrap dtable-wrap--scroll">' + findSummary(p.id) + '</div></div>' +
      '<div class="subpanel" data-subpanel="his"><div style="margin-top:10px">' + timeline(p.id) + '</div></div>' +
      '</div>';
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------------------------------------------------------- findings
  var fF = { p: 'p9', t: 'ALL', s: 'ALL' }, picked = {};
  var pgFind = F.pager('pgFind', 10, drawFindings, 'findings');
  var PLBL = {}; D.PERIODS.forEach(function (p) { PLBL[D.plabel(p)] = p.id; });

  function findingRows() {
    return D.FINDINGS.filter(function (f) {
      if (f.p !== fF.p) return false;
      if (fF.t !== 'ALL' && f.t !== fF.t) return false;
      if (fF.s === 'Terbuka' && f.fs) return false;
      if (fF.s === 'Diperbaiki' && f.fs !== 'DIPERBAIKI') return false;
      if (fF.s === 'Diterima' && f.fs !== 'DITERIMA') return false;
      return true;
    });
  }
  function drawFindings() {
    var all = findingRows();
    pgFind.total = all.length;
    var view = pgFind.slice(all);
    document.getElementById('fBody').innerHTML = view.length ? view.map(function (f) {
      var acts = f.fs
        ? '<div class="rowacts"><button class="rowbtn" data-fdet="' + f.id + '">View Detail</button></div>'
        : F.rowMenu([
            { label: 'Resolve', icon: 'check-circle', attr: 'data-fres="' + f.id + '"' },
            { label: 'View Detail', icon: 'eye', attr: 'data-fdet="' + f.id + '"' }
          ]);
      return '<tr><td>' + (f.fs ? '' : '<input type="checkbox" data-fpick="' + f.id + '"' + (picked[f.id] ? ' checked' : '') + '>') + '</td>' +
        '<td class="cell-mono">' + f.id + '</td>' +
        '<td>' + D.badge('indigo', f.t) + '</td>' +
        '<td>' + D.empCell(f.e) + '</td>' +
        '<td class="ta-c">' + D.fstate(f.fs) + '</td>' +
        '<td>' + F.fmtDate(f.at) + '</td>' +
        '<td>' + (f.by ? D.ACTOR[f.by].name + '<div class="person__sub">' + F.fmtDate(f.rat) + '</div>' : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r">' + acts + '</td></tr>';
    }).join('') : '<tr><td colspan="8"><div class="tempty"><span class="tempty__t">No finding matches this filter.</span>Zero open findings means the period is ready to be authorised for handover.</div></td></tr>';
    document.getElementById('cntFind').textContent = D.FINDINGS.filter(function (f) { return !f.fs; }).length;
    pgFind.paint();
    paintSel();
    if (window.lucide) window.lucide.createIcons();
  }
  function pickedIds() { return Object.keys(picked).filter(function (k) { return picked[k]; }); }
  function paintSel() {
    var n = pickedIds().length;
    document.getElementById('fSelInfo').textContent = n ? n + ' selected' : '';
    document.getElementById('fBulk').disabled = n === 0;
  }

  // ---------------------------------------------------------------- imports
  var impF = { v: 'ALL', q: '' };
  var pgImp = F.pager('pgImp', 10, drawImports, 'imports');
  function importRows() {
    return D.IMPORTS.filter(function (r) {
      if (impF.v === 'Verified' && !r.ver) return false;
      if (impF.v === 'Not verified' && r.ver) return false;
      if (impF.q && (D.emp(r.e).name + ' ' + r.my).toLowerCase().indexOf(impF.q) < 0) return false;
      return true;
    });
  }
  function drawImports() {
    var all = importRows();
    pgImp.total = all.length;
    var view = pgImp.slice(all);
    document.getElementById('impBody').innerHTML = view.length ? view.map(function (r) {
      return '<tr><td class="cell-mono">' + r.id + '</td>' +
        '<td>' + D.empCell(r.e) + '</td>' +
        '<td>' + D.my(r.my) + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(r.gross) + '</span></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(r.pph) + '</span></td>' +
        '<td class="ta-r"><span class="money">' + D.rp(r.bpjs) + '</span></td>' +
        '<td><span class="pv-tag">LEGACY_SYSTEM_IMPORT</span></td>' +
        '<td>' + D.stamp(r.sub) + '</td>' +
        '<td>' + (r.ver ? D.stamp(r.ver) : D.badge('amber', 'NOT VERIFIED')) + '</td>' +
        '<td class="ta-r">' + (r.ver
          ? '<div class="rowacts"><button class="rowbtn" data-iver="' + r.id + '">View Detail</button></div>'
          : F.rowMenu([
              { label: 'Verify', icon: 'badge-check', attr: 'data-iver="' + r.id + '"' },
              { label: 'Correct', icon: 'pencil', attr: 'data-iedit="' + r.id + '"' }
            ])) + '</td></tr>';
    }).join('') : '<tr><td colspan="10"><div class="tempty">No import row matches this filter.</div></td></tr>';
    document.getElementById('cntImp').textContent = D.IMPORTS.length;
    pgImp.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------------------------------------------------------- static fills
  function fillStatic() {
    document.getElementById('encBody').innerHTML = D.FTYPES.map(function (t, i) {
      return '<tr><td>' + D.badge('indigo', t.t) + '<div class="person__sub">#' + (i + 1) + '</div></td>' +
        '<td>' + t.subj + '</td><td>' + t.born + '</td><td style="max-width:340px">' + t.mean + '</td>' +
        '<td><code class="pd-mono">' + t.schema + '</code></td></tr>';
    }).join('');
    document.getElementById('fTypeOpts').innerHTML = '<div class="dropdown__opt is-sel">All finding types</div>' +
      D.FTYPES.map(function (t) { return '<div class="dropdown__opt">' + t.t + '</div>'; }).join('');
    document.getElementById('runMonthOpts').innerHTML = D.MONTHS.map(function (m, i) {
      return '<div class="dropdown__opt' + (i === 9 ? ' is-sel' : '') + '" data-val="' + (i + 1) + '">' + m + '</div>';
    }).join('');
    document.getElementById('impEmpOpts').innerHTML = Object.keys(D.EMP).map(function (k, i) {
      return '<div class="dropdown__opt' + (k === 'E6' ? ' is-sel' : '') + '" data-val="' + k + '">' + D.EMP[k].name + '</div>';
    }).join('');
    F.wireSelects();
  }

  // ---------------------------------------------------------------- run modal
  var runSel = { y: 2026, m: 10 };
  function paintBranch() {
    var exists = D.PERIODS.some(function (p) { return p.y === runSel.y && p.m === runSel.m; });
    document.querySelector('#runBranch span').innerHTML = exists
      ? 'Branch <strong>Recalculate</strong> — PP-' + runSel.y + '-' + String(runSel.m).padStart(2, '0') + ' already exists, the server answers <code>200</code> and recomputes it in place.'
      : 'Branch <strong>Insert</strong> — no period exists for this year/month, the server answers <code>201</code> and freezes ten parameters at once.';
  }

  // ---------------------------------------------------------------- resolve modal
  var resId = null, resState = 'DIPERBAIKI';
  function openResolve(id) {
    var f = null; D.FINDINGS.forEach(function (x) { if (x.id === id) f = x; });
    if (!f) return;
    resId = id;
    var blocked = f.t === 'PERIOD_NOT_PICKED_UP';
    resState = blocked ? 'DITERIMA' : 'DIPERBAIKI';
    document.getElementById('resDesc').innerHTML = f.id + ' · ' + f.t + (f.e ? ' · ' + D.emp(f.e).name : '');
    document.getElementById('resBody').innerHTML =
      (blocked ? '<div class="note note--warn"><i data-lucide="alert-triangle"></i><span><strong>Diperbaiki is locked for PERIOD_NOT_PICKED_UP.</strong> Only the client system\'s own pickup closes this row — a manual fix is rejected with <code>422 PAY_FINDING_PERIOD_NOT_PICKED_UP_MANUAL_FIX</code>.</span></div>' : '') +
      '<div class="fld"><label class="fld__label">Final state <span class="req">*</span></label><div class="pd-radios">' +
        '<label class="pd-radio' + (blocked ? ' is-off' : '') + '"><input type="radio" name="resfs" value="DIPERBAIKI"' + (blocked ? ' disabled' : ' checked') + '><span>Diperbaiki<span class="pd-radio__h">The underlying cause has been corrected. Reason optional.</span></span></label>' +
        '<label class="pd-radio"><input type="radio" name="resfs" value="DITERIMA"' + (blocked ? ' checked' : '') + '><span>Diterima<span class="pd-radio__h">Accepted as-is. A written reason is mandatory.</span></span></label>' +
      '</div></div>' +
      '<div class="fld" id="resReasonFld" style="display:' + (blocked ? 'block' : 'none') + '"><label class="fld__label">Resolution reason <span class="req">*</span></label>' +
      '<div class="ctl ctl--area"><textarea id="resReason" rows="3" placeholder="Free text — why this finding is accepted as it stands"></textarea></div>' +
      '<span class="fld__hint" style="font:400 12px/1.4 var(--font-body);color:var(--fg-3)">Empty on Diterima returns <code>422 PAY_FINDING_RESOLUTION_REASON_REQUIRED</code>.</span></div>';
    if (window.lucide) window.lucide.createIcons();
    F.openModal('mResolve');
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('DOMContentLoaded', function () {
    fillStatic(); drawPeriods(); drawFindings(); drawImports();

    document.getElementById('perStatus').addEventListener('select', function (e) {
      perF.status = e.detail.value === 'All statuses' ? 'ALL' : e.detail.value; drawPeriods();
    });
    document.getElementById('perSearch').addEventListener('input', function (e) { perF.q = e.target.value.toLowerCase(); drawPeriods(); });
    document.getElementById('fPeriod').addEventListener('select', function (e) { fF.p = PLBL[e.detail.value]; picked = {}; drawFindings(); });
    document.getElementById('fType').addEventListener('select', function (e) { fF.t = e.detail.value === 'All finding types' ? 'ALL' : e.detail.value; drawFindings(); });
    document.getElementById('fState').addEventListener('select', function (e) { fF.s = e.detail.value === 'All states' ? 'ALL' : e.detail.value; drawFindings(); });
    document.getElementById('fltFindReset').addEventListener('click', function () {
      fF = { p: 'p9', t: 'ALL', s: 'ALL' }; picked = {};
      document.querySelector('#fPeriod .ctl__value').textContent = 'PP-2026-09';
      document.querySelector('#fType .ctl__value').textContent = 'All finding types';
      document.querySelector('#fState .ctl__value').textContent = 'All states';
      drawFindings(); F.paintFilterSums();
    });
    document.getElementById('impVer').addEventListener('select', function (e) { impF.v = e.detail.value === 'All verification states' ? 'ALL' : e.detail.value; drawImports(); });
    document.getElementById('impSearch').addEventListener('input', function (e) { impF.q = e.target.value.toLowerCase(); drawImports(); });

    // --- run period
    document.getElementById('runOpen').addEventListener('click', function () { paintBranch(); F.openModal('mRun'); });
    document.getElementById('runYear').addEventListener('select', function (e) { runSel.y = parseInt(e.detail.value, 10); paintBranch(); });
    document.getElementById('runMonth').addEventListener('select', function (e) { runSel.m = parseInt(e.detail.value, 10); paintBranch(); });
    document.getElementById('runGo').addEventListener('click', function () {
      var ex = null; D.PERIODS.forEach(function (p) { if (p.y === runSel.y && p.m === runSel.m) ex = p; });
      var label = 'PP-' + runSel.y + '-' + String(runSel.m).padStart(2, '0');
      if (ex) {
        if (ex.status !== 'CALCULATED') {
          F.toast('422 — ' + label + ' is ' + ex.status + '. Only a CALCULATED period can be recalculated; a later state must be reopened by the checker first.', 'error');
          return;
        }
        // Recalculate re-runs the numbers in place — status stays CALCULATED, so no state-change row.
        ex.calc = [ME, '2026-09-30'];
        F.toast('200 Recalculate — ' + label + ' recomputed in place, parameters re-frozen.', 'ok');
      } else {
        var id = 'p' + Date.now();
        D.PERIODS.unshift({ id: id, y: runSel.y, m: runSel.m, status: 'CALCULATED', g1: null, g2: null, employees: 34,
          calc: [ME, '2026-09-30'], rev: null, lock: null, hand: null, openFindings: 0 });
        D.HISTORY[id] = [{ from: null, to: 'CALCULATED', by: ME, at: '2026-09-30', reason: null }];
        F.toast('201 Insert — ' + label + ' created, ten parameters frozen.', 'ok');
      }
      F.closeModal('mRun'); selPeriod = null; drawPeriods(); drawDetail();
    });

    // --- review
    var reviewId = null;
    function openReview(id) {
      reviewId = id;
      var p = D.period(id);
      document.getElementById('reviewBody').innerHTML =
        '<div class="kv"><div class="kv__k">Period</div><div class="kv__v">' + D.plabel(p) + ' · ' + D.pname(p) + '</div>' +
        '<div class="kv__k">Current status</div><div class="kv__v">' + D.sb(p.status) + '</div>' +
        '<div class="kv__k">After this step</div><div class="kv__v">REVIEWED — waiting for the checker in Authorization &amp; Handover</div></div>' +
        '<div class="note note--info" style="margin-top:14px"><i data-lucide="info"></i><span>Guard: the period must be <code>CALCULATED</code>, otherwise the server answers <code>422</code>.</span></div>';
      if (window.lucide) window.lucide.createIcons();
      F.openModal('mReview');
    }
    document.getElementById('reviewGo').addEventListener('click', function () {
      var p = D.period(reviewId);
      if (!p || p.status !== 'CALCULATED') { F.toast('422 — only a CALCULATED period can be reviewed.', 'error'); return; }
      p.status = 'REVIEWED'; p.rev = [ME, '2026-09-27'];
      D.HISTORY[p.id].push({ from: 'CALCULATED', to: 'REVIEWED', by: ME, at: '2026-09-27', reason: null });
      F.closeModal('mReview'); F.toast(D.plabel(p) + ' reviewed — handed to the checker.', 'ok');
      drawPeriods(); drawDetail();
    });

    // --- delegated table/card clicks
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-pdet],[data-review],[data-recalc],[data-fres],[data-fdet],[data-iver],[data-iedit]');
      if (!t) return;
      if (t.hasAttribute('data-pdet')) { selPeriod = t.getAttribute('data-pdet'); drawPeriods(); drawDetail(); return; }
      if (t.hasAttribute('data-review')) { openReview(t.getAttribute('data-review')); return; }
      if (t.hasAttribute('data-recalc')) {
        var p = D.period(t.getAttribute('data-recalc'));
        runSel = { y: p.y, m: p.m };
        document.querySelector('#runYear .ctl__value').textContent = p.y;
        document.querySelector('#runMonth .ctl__value').textContent = D.MONTHS[p.m - 1];
        paintBranch(); F.openModal('mRun'); return;
      }
      if (t.hasAttribute('data-fres')) { openResolve(t.getAttribute('data-fres')); return; }
      if (t.hasAttribute('data-fdet')) {
        var id = t.getAttribute('data-fdet'), f = null;
        D.FINDINGS.forEach(function (x) { if (x.id === id) f = x; });
        document.getElementById('findTitle').textContent = f.id + ' · ' + f.t;
        document.getElementById('findBody').innerHTML =
          '<div class="kv"><div class="kv__k">Period</div><div class="kv__v">' + D.plabel(D.period(f.p)) + '</div>' +
          '<div class="kv__k">Subject</div><div class="kv__v">' + (f.e ? D.emp(f.e).name + ' · ' + D.emp(f.e).nik : 'Period-level — employee_id NULL') + '</div>' +
          '<div class="kv__k">Raised</div><div class="kv__v">' + F.fmtDate(f.at) + '</div>' +
          '<div class="kv__k">Final state</div><div class="kv__v">' + D.fstate(f.fs) + '</div>' +
          (f.reason ? '<div class="kv__k">Resolution reason</div><div class="kv__v">' + f.reason + '</div>' : '') + '</div>' +
          '<div class="pd-card__s" style="margin:16px 0 8px"><code>detail</code> — shape belongs to this finding type alone</div>' + D.json(f.detail);
        F.openModal('mFind'); return;
      }
      if (t.hasAttribute('data-iver')) {
        var r = null, rid = t.getAttribute('data-iver');
        D.IMPORTS.forEach(function (x) { if (x.id === rid) r = x; });
        var sameMaker = r.sub[0] === ME, done = !!r.ver;
        document.getElementById('verBody').innerHTML =
          '<div class="kv"><div class="kv__k">Import</div><div class="kv__v">' + r.id + '</div>' +
          '<div class="kv__k">Employee</div><div class="kv__v">' + D.emp(r.e).name + '</div>' +
          '<div class="kv__k">Month</div><div class="kv__v">' + D.my(r.my) + '</div>' +
          '<div class="kv__k">Gross taxable</div><div class="kv__v">' + D.rp(r.gross) + '</div>' +
          '<div class="kv__k">PPh21 withheld</div><div class="kv__v">' + D.rp(r.pph) + '</div>' +
          '<div class="kv__k">BPJS contribution</div><div class="kv__v">' + D.rp(r.bpjs) + '</div>' +
          '<div class="kv__k">Submitted by</div><div class="kv__v">' + D.ACTOR[r.sub[0]].name + ' · ' + F.fmtDate(r.sub[1]) + '</div>' +
          '<div class="kv__k">Verified by</div><div class="kv__v">' + (r.ver ? D.ACTOR[r.ver[0]].name + ' · ' + F.fmtDate(r.ver[1]) : 'Not verified yet') + '</div></div>' +
          '<div class="note note--' + (done || sameMaker ? 'warn' : 'info') + '" style="margin-top:14px"><i data-lucide="' + (done || sameMaker ? 'alert-triangle' : 'info') + '"></i><span>' +
          (done ? 'Already verified — a second attempt returns <code>409 PAY_HISTORY_IMPORT_ALREADY_VERIFIED</code>.'
                : sameMaker ? 'You submitted this row. The checker must be a different person — verifying it yourself returns <code>403 PAY_MAKER_CHECKER_VIOLATION</code>.'
                : 'Ready to verify.') + '</span></div>';
        document.getElementById('verGo').disabled = done || sameMaker;
        if (window.lucide) window.lucide.createIcons();
        F.openModal('mVerify'); return;
      }
      if (t.hasAttribute('data-iedit')) {
        var e2 = null, eid = t.getAttribute('data-iedit');
        D.IMPORTS.forEach(function (x) { if (x.id === eid) e2 = x; });
        document.getElementById('impTitle').textContent = 'Correct import ' + e2.id;
        document.querySelector('#impEmp .ctl__value').textContent = D.emp(e2.e).name;
        document.getElementById('impMonth').value = e2.my;
        document.getElementById('impGross').value = e2.gross;
        document.getElementById('impPph').value = e2.pph;
        document.getElementById('impBpjs').value = e2.bpjs;
        F.openModal('mImp'); return;
      }
    });

    // --- finding selection
    document.getElementById('fBody').addEventListener('change', function (e) {
      var cb = e.target.closest('[data-fpick]');
      if (!cb) return;
      picked[cb.getAttribute('data-fpick')] = cb.checked;
      paintSel();
    });
    document.getElementById('fAll').addEventListener('change', function (e) {
      findingRows().forEach(function (f) { if (!f.fs) picked[f.id] = e.target.checked; });
      drawFindings();
    });

    // --- resolve submit
    document.getElementById('resBody').addEventListener('change', function (e) {
      if (e.target.name !== 'resfs') return;
      resState = e.target.value;
      document.getElementById('resReasonFld').style.display = resState === 'DITERIMA' ? 'block' : 'none';
    });
    document.getElementById('resGo').addEventListener('click', function () {
      var ta = document.getElementById('resReason');
      if (resState === 'DITERIMA' && (!ta || !ta.value.trim())) {
        F.toast('422 PAY_FINDING_RESOLUTION_REASON_REQUIRED — a written reason is mandatory.', 'error'); return;
      }
      D.FINDINGS.forEach(function (f) {
        if (f.id !== resId) return;
        f.fs = resState; f.by = ME; f.rat = '2026-09-27';
        f.reason = resState === 'DITERIMA' ? ta.value.trim() : null;
      });
      delete picked[resId];
      F.closeModal('mResolve'); F.toast(resId + ' closed as ' + (resState === 'DITERIMA' ? 'Diterima' : 'Diperbaiki') + '.', 'ok');
      drawFindings(); drawDetail();
    });

    // --- bulk resolve
    document.getElementById('fBulk').addEventListener('click', function () {
      var ids = pickedIds();
      var rows = D.FINDINGS.filter(function (f) { return ids.indexOf(f.id) >= 0; });
      var open = rows.filter(function (f) { return !f.fs; }), skipped = rows.length - open.length;
      var cross = {}; rows.forEach(function (f) { cross[f.p] = 1; });
      document.getElementById('bulkBody').innerHTML =
        (Object.keys(cross).length > 1 ? '<div class="note note--danger"><i data-lucide="alert-triangle"></i><span>Rows come from more than one period — the server rejects this with <code>422 PAY_BULK_RESOLVE_CROSS_PERIOD</code>.</span></div>' : '') +
        '<div class="fld"><label class="fld__label">Final state</label><div class="ctl"><input type="text" value="DITERIMA — locked for bulk resolve" disabled></div></div>' +
        '<div class="fld"><label class="fld__label">Shared resolution reason <span class="req">*</span></label><div class="ctl ctl--area"><textarea id="bulkReason" rows="3" placeholder="One reason covering every selected row"></textarea></div></div>' +
        '<div class="pd-card__s">' + open.length + ' row(s) will be closed' + (skipped ? ' · ' + skipped + ' already closed and reported back in <code>skipped[]</code>' : '') + ': <span class="pd-mono">' + open.map(function (f) { return f.id; }).join(', ') + '</span></div>';
      if (window.lucide) window.lucide.createIcons();
      F.openModal('mBulk');
    });
    document.getElementById('bulkGo').addEventListener('click', function () {
      var ta = document.getElementById('bulkReason');
      if (!ta.value.trim()) { F.toast('422 PAY_FINDING_RESOLUTION_REASON_REQUIRED — one shared reason is mandatory.', 'error'); return; }
      var ids = pickedIds(), n = 0;
      D.FINDINGS.forEach(function (f) {
        if (ids.indexOf(f.id) < 0 || f.fs) return;
        f.fs = 'DITERIMA'; f.reason = ta.value.trim(); f.by = ME; f.rat = '2026-09-27'; n++;
      });
      picked = {};
      F.closeModal('mBulk'); F.toast(n + ' finding(s) closed as Diterima.', 'ok');
      drawFindings(); drawDetail();
    });

    // --- import submit
    document.getElementById('impAdd').addEventListener('click', function () {
      document.getElementById('impTitle').textContent = 'Submit payroll history import';
      document.getElementById('impForm').reset();
      document.querySelector('#impEmp .ctl__value').textContent = 'Cahyo Prasetyo';
      F.openModal('mImp');
    });
    document.getElementById('impSave').addEventListener('click', function () {
      var m = document.getElementById('impMonth').value.trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) { F.toast('Month must be written as YYYY-MM.', 'error'); return; }
      if (m >= '2026-06') { F.toast('422 PAY_HISTORY_IMPORT_MONTH_ALREADY_RUN — ' + m + ' is on or after the first period run.', 'error'); return; }
      F.closeModal('mImp'); F.toast('Import submitted — waiting for a different person to verify it.', 'ok');
    });
    document.getElementById('verGo').addEventListener('click', function () {
      F.closeModal('mVerify'); F.toast('Verified.', 'ok'); drawImports();
    });
  });
})();
