// SEVAKA HRIS — Payroll › Salary Settings (document version). Actor: Rudi Hartono, ROLE_PAYROLL_OFFICER.
(function () {
  var F = window.Flow, D = window.PD;
  var ME = 'RUDI', TODAY = '2026-09-28', EFF = '2026-10-01';
  var ESC_THRESHOLD = 5; // payroll.bulk_change_escalation_count (setup.cnf_company_setup, read at submit)

  // ---------------------------------------------------------------- catalog
  var catF = { st: 'ALL', q: '' }, actId = null;
  var pgCat = F.pager('pgCat', 10, drawCat, 'components');
  function yn(v) { return v ? D.badge('green', 'YA') : D.badge('grey', 'TIDAK'); }
  function drawCat() {
    var all = D.COMPONENTS.filter(function (c) {
      if (catF.st !== 'ALL' && c.ps !== catF.st) return false;
      if (catF.q && (c.code + ' ' + c.name).toLowerCase().indexOf(catF.q) < 0) return false;
      return true;
    });
    pgCat.total = all.length;
    var view = pgCat.slice(all);
    document.getElementById('catBody').innerHTML = view.length ? view.map(function (c) {
      var items = [{ label: 'Rename', icon: 'pencil', attr: 'data-ren="' + c.id + '"' }];
      if (c.ps === 'AKTIF') items.push({ label: 'Propose trait change', icon: 'git-pull-request', attr: 'data-prop="' + c.id + '"' });
      items.push({ label: 'Delete', icon: 'trash-2', attr: 'data-del="' + c.id + '"', danger: true });
      return '<tr><td class="cell-mono">' + c.code + '</td><td class="cell-strong">' + c.name + '</td>' +
        '<td class="ta-c">' + yn(c.fixed) + '</td><td class="ta-c">' + yn(c.ot) + '</td>' +
        '<td class="ta-c">' + yn(c.tax) + '</td><td class="ta-c">' + yn(c.bpjs) + '</td>' +
        '<td class="ta-r">' + c.used + '</td>' +
        '<td class="ta-c">' + D.sb(c.ps) + (c.prop ? '<div class="person__sub">efektif ' + F.fmtDate(c.prop.eff) + '</div>' : '') + '</td>' +
        '<td class="ta-r">' + F.rowMenu(items) + '</td></tr>';
    }).join('') : '<tr><td colspan="9"><div class="tempty">No component matches this filter.</div></td></tr>';
    document.getElementById('cntCat').textContent = D.COMPONENTS.length;
    pgCat.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function comp(id) { var r = null; D.COMPONENTS.forEach(function (c) { if (c.id === id) r = c; }); return r; }
  function compByCode(code) { var r = null; D.COMPONENTS.forEach(function (c) { if (c.code === code) r = c; }); return r; }

  // ---------------------------------------------------------------- per-employee values
  var valEmp = 'E4';
  function rowsFor(e) {
    var base = D.EMPVALS.filter(function (v) { return v.e === e; });
    D.PROPOSALS.forEach(function (p) {
      if (p.e === e && p.st === 'MENUNGGU_PERSETUJUAN') base.push({ id: p.id, e: e, c: p.c, amt: p.amt, from: p.from, until: null, st: 'MENUNGGU_PERSETUJUAN', ch: 'CHANGE' });
    });
    return base;
  }
  function isCurrent(v) { return v.until === null && v.st === 'DISETUJUI'; }
  function currentAmt(e, code) {
    var hit = rowsFor(e).filter(function (v) { return v.c === code && isCurrent(v); })[0];
    return hit ? hit.amt : 0;
  }
  // salary_base_compared = gaji pokok + every fixed component (ERD §6.3), with one component overridden.
  function salaryBase(e, overrideCode, overrideAmt) {
    var sum = 0;
    rowsFor(e).forEach(function (v) {
      if (!isCurrent(v)) return;
      var c = compByCode(v.c);
      if (!c || !c.fixed) return;
      sum += (overrideCode && v.c === overrideCode) ? overrideAmt : v.amt;
    });
    if (overrideCode && !rowsFor(e).some(function (v) { return v.c === overrideCode && isCurrent(v); })) {
      var oc = compByCode(overrideCode);
      if (oc && oc.fixed) sum += overrideAmt;
    }
    return sum;
  }
  function umpOf(e) { return D.UMP[D.emp(e).branch] || 0; }

  function drawVal() {
    var e = D.emp(valEmp), rows = rowsFor(valEmp), ump = umpOf(valEmp), base = salaryBase(valEmp);
    var hasCurrent = rows.some(isCurrent);
    document.getElementById('valHead').innerHTML = '<div class="pd-card" style="margin:0 0 16px">' +
      '<div class="pd-card__head" style="margin:0"><div><div class="pd-card__t">' + e.name + '</div>' +
      '<div class="pd-card__s">' + e.nik + ' · ' + e.pos + ' · Cabang ' + e.branch + ' · ' + (e.cc || 'Cost center belum ditetapkan') + '</div></div>' +
      '<div class="pd-acts"><span class="pd-card__s">' + rows.filter(isCurrent).length + ' baris berjalan · ' + rows.length + ' baris riwayat<br>' +
      (hasCurrent
        ? 'Dasar UMP: ' + D.rp(base) + ' vs UMP cabang ' + D.rp(ump) + (base < ump ? ' — <strong style="color:var(--color-error-600)">di bawah UMP</strong>' : '')
        : 'Dasar UMP belum terbentuk — belum ada baris nilai berjalan · UMP cabang ' + D.rp(ump)) +
      '</span></div></div></div>';
    document.getElementById('valBody').innerHTML = rows.length ? rows.map(function (v) {
      return '<tr><td class="cell-strong">' + v.c + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(v.amt) + '</span></td>' +
        '<td>' + F.fmtDate(v.from) + '</td>' +
        '<td>' + (v.until ? F.fmtDate(v.until) : '<span class="cell-dim">— (terbuka)</span>') + '</td>' +
        '<td class="ta-c">' + D.sb(v.st) + '</td>' +
        '<td class="ta-c">' + D.sb(v.ch) + '</td>' +
        '<td class="ta-c">' + (isCurrent(v) ? D.badge('green', 'BERJALAN') : '<span class="cell-dim">—</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty">This employee has no salary component row yet.</div></td></tr>';
    document.getElementById('cntVal').textContent = D.EMPVALS.length;
  }

  // UMP attestation gate — PY-13 §3: when the proposed value leaves the salary base below the
  // branch UMP the check must be answered from the closed 4-value list before the flow continues.
  function paintUmpGate() {
    var host = document.getElementById('valUmp');
    var code = valCompSel ? comp(valCompSel).code : null;
    var amt = parseInt(String(document.getElementById('valAmt').value).replace(/\D/g, ''), 10) || 0;
    if (!code || !amt) { host.innerHTML = ''; return; }
    var ump = umpOf(valEmp), base = salaryBase(valEmp, code, amt);
    var first = !rowsFor(valEmp).some(isCurrent);
    if (base >= ump) {
      host.innerHTML = '<div class="note note--info"><i data-lucide="shield-check"></i><span>Salary base after this change ' +
        D.rp(base) + ' ≥ UMP ' + D.rp(ump) + ' — the attestation row records <code>is_below_ump = false</code>, no reason needed.</span></div>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    if (host.dataset.gate === code + '|' + amt) return;
    host.dataset.gate = code + '|' + amt;
    host.innerHTML = '<div class="note note--danger" style="margin-bottom:14px"><i data-lucide="alert-triangle"></i><span>' +
      (first ? 'This is the first value row for ' + D.emp(valEmp).name + ' — the salary base it establishes, ' : 'Salary base after this change ') +
      D.rp(base) + ', is <strong>below the branch UMP</strong> ' + D.rp(ump) + '. The check point <code>PENETAPAN_ATAU_PERUBAHAN</code> is written to the attestation log and a reason from the closed list is required before the proposal can be submitted.</span></div>' +
      '<div class="co-grid2">' +
      '<div class="fld"><label class="fld__label">Reason <span class="req">*</span></label>' +
      '<div class="ctl ctl--select" id="umpReason"><span class="ctl__value" style="color:var(--fg-4)">Select reason</span>' +
      '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
      '<div class="dropdown">' + D.UMP_REASONS.map(function (r) { return '<div class="dropdown__opt" data-val="' + r + '">' + r + '</div>'; }).join('') + '</div></div>' +
      '<span class="fld__hint" style="font:400 12px/1.4 var(--font-body);color:var(--fg-3)">Closed list of four — a free-text reason is deliberately impossible.</span></div>' +
      '<div class="fld"><label class="fld__label">Reason note <span id="umpNoteReq" style="font-weight:500;color:var(--fg-4)">(optional)</span></label>' +
      '<div class="ctl"><input type="text" id="umpNote" placeholder="Recorded next to the reason" maxlength="200"></div></div>' +
      '</div>';
    umpReasonSel = null;
    F.wireSelects(host);
    document.getElementById('umpReason').addEventListener('select', function (ev) {
      umpReasonSel = ev.detail.value;
      document.getElementById('umpNoteReq').textContent = umpReasonSel === 'LAINNYA' ? '(required for LAINNYA)' : '(optional)';
    });
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------------------------------------------------------- bulk
  var bulkF = { st: 'ALL' }, bulkId = null;
  var pgBulk = F.pager('pgBulk', 10, drawBulk, 'batches');
  function batch(id) { var r = null; D.BATCHES.forEach(function (b) { if (b.id === id) r = b; }); return r; }
  function drawBulk() {
    var all = D.BATCHES.filter(function (b) { return bulkF.st === 'ALL' || b.status === bulkF.st; });
    pgBulk.total = all.length;
    document.getElementById('bulkBody').innerHTML = pgBulk.slice(all).map(function (b) {
      var acts;
      if (b.status === 'DRAFT') {
        acts = F.rowMenu([
          { label: 'Add member', icon: 'user-plus', attr: 'data-bitem="' + b.id + '"' },
          { label: 'Lock & submit', icon: 'lock', attr: 'data-bsub="' + b.id + '"' },
          { label: 'View Detail', icon: 'eye', attr: 'data-bdet="' + b.id + '"' },
          { label: 'Delete draft', icon: 'trash-2', attr: 'data-bdel="' + b.id + '"', danger: true }
        ]);
      } else {
        acts = '<div class="rowacts"><button class="rowbtn" data-bdet="' + b.id + '">View Detail</button></div>';
      }
      return '<tr><td class="cell-mono">' + b.id + '</td><td class="cell-strong">' + b.name + '</td>' +
        '<td class="ta-c">' + D.sb(b.status) + '</td><td class="ta-r">' + b.members.length + '</td>' +
        '<td class="ta-c">' + (b.status === 'DRAFT' ? '<span class="cell-dim">— (dihitung saat submit)</span>'
          : b.esc ? D.badge('amber', 'PERLU ESKALASI') : D.badge('grey', 'TIDAK')) + '</td>' +
        '<td>' + (b.by ? D.ACTOR[b.by].name + '<div class="person__sub">' + F.fmtDate(b.at) + '</div>'
          : '<span class="cell-dim">— (masih DRAFT)</span>') + '</td>' +
        '<td class="ta-r">' + acts + '</td></tr>';
    }).join('');
    document.getElementById('cntBulk').textContent = D.BATCHES.length;
    pgBulk.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function drawBulkDetail(id) {
    var host = document.getElementById('bulkDetail');
    if (!id) { host.innerHTML = ''; F.closeModal('mBulkDetail'); return; }
    var b = batch(id), draft = b.status === 'DRAFT';
    document.getElementById('bdTitle').innerHTML = b.id + ' · ' + b.name + ' ' + D.sb(b.status);
    document.getElementById('bdDesc').innerHTML = draft
      ? 'Still being assembled — members can be added or removed, and the impact summary does not exist yet.'
      : 'Impact summary frozen at submit time — the decision is taken in Authorization &amp; Handover' + (b.esc ? ', by the escalation approver ' + D.ACTOR[b.escApprover].name : '') + '.';
    document.getElementById('bdFoot').innerHTML = draft
      ? '<button class="btn btn--secondary" data-bitem="' + b.id + '">Add member</button><button class="btn btn--primary" data-bsub="' + b.id + '">Lock &amp; submit</button>'
      : '<button class="btn btn--secondary" data-close>Close</button><a class="btn btn--primary" href="payroll-doc-authorization.html">Open in Authorization</a>';
    host.innerHTML =
      (b.impact ? D.impactBlock(b.impact) : '') +
      '<div class="dtable-wrap" style="margin-top:' + (b.impact ? '14px' : '0') + '"><table class="dtable">' +
      '<thead><tr><th>Employee</th><th>Component</th><th class="ta-r">Change</th>' + (draft ? '<th class="ta-r"></th>' : '') + '</tr></thead><tbody>' +
      (b.members.length ? b.members.map(function (m, i) {
        return '<tr><td>' + D.empCell(m.e) + '</td><td>' + m.c + '</td>' +
          '<td class="ta-r"><span class="money">' + (m.delta < 0 ? '− ' + D.rp(-m.delta) : '+ ' + D.rp(m.delta)) + '</span></td>' +
          (draft ? '<td class="ta-r"><div class="rowacts"><button class="rowbtn rowbtn--danger" data-brm="' + b.id + '|' + i + '">Remove</button></div></td>' : '') + '</tr>';
      }).join('') : '<tr><td colspan="' + (draft ? 4 : 3) + '"><div class="tempty">No member yet — a batch cannot be submitted while it is empty.</div></td></tr>') +
      '</tbody></table></div>';
    if (window.lucide) window.lucide.createIcons();
    F.openModal('mBulkDetail');
  }
  function computeImpact(b) {
    var emps = {}, net = 0, dec = [], below = [], miss = [];
    b.members.forEach(function (m) {
      emps[m.e] = 1; net += m.delta;
      var e = D.emp(m.e);
      if (m.delta < 0 && dec.indexOf(e.name) < 0) dec.push(e.name);
      var c = compByCode(m.c);
      if (c && c.fixed) {
        var after = salaryBase(m.e, m.c, currentAmt(m.e, m.c) + m.delta);
        if (after < umpOf(m.e) && below.indexOf(e.name) < 0) below.push(e.name);
      }
      if ((!e.cc || !e.sbu) && miss.indexOf(e.name) < 0) miss.push(e.name);
    });
    return { affected_count: Object.keys(emps).length, net_cost_shift_amount: net,
      salary_decrease_list: dec, below_ump_after_change_list: below, missing_cost_center_or_sbu_list: miss };
  }

  // ---------------------------------------------------------------- UMP log
  var umpF = { cp: 'ALL', below: 'ALL' };
  var pgUmp = F.pager('pgUmp', 10, drawUmp, 'attestations');
  function drawUmp() {
    var all = D.ATTEST.filter(function (a) {
      if (umpF.cp !== 'ALL' && a.cp !== umpF.cp) return false;
      if (umpF.below === 'Below UMP' && !a.below) return false;
      if (umpF.below === 'Safe' && a.below) return false;
      return true;
    });
    pgUmp.total = all.length;
    document.getElementById('umpBody').innerHTML = all.length ? pgUmp.slice(all).map(function (a) {
      return '<tr><td class="cell-mono">' + a.id +
        '<div class="person__sub">' + F.fmtDate(a.at) + ' · ' + D.ACTOR[a.by].name + '</div></td>' +
        '<td>' + D.empCell(a.e) + '</td>' +
        '<td>' + D.sb(a.cp) + (a.p ? '<div class="person__sub">' + D.plabel(D.period(a.p)) + '</div>' : '') + '</td>' +
        '<td class="ta-c">' + (a.below ? D.badge('red', 'DI BAWAH UMP') : D.badge('green', 'AMAN')) + '</td>' +
        '<td class="ta-r" style="white-space:nowrap"><span class="money">' + D.rp(a.ump) + '</span>' +
        '<div class="person__sub">dasar ' + D.rp(a.base) + '</div></td>' +
        '<td>' + (a.reason ? '<span class="pv-tag">' + a.reason + '</span>' + (a.note ? '<div class="person__sub">' + a.note + '</div>' : '')
          : '<span class="cell-dim">— (NULL kecuali titik penetapan/perubahan di bawah UMP)</span>') + '</td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty">No attestation row matches this filter.</div></td></tr>';
    document.getElementById('cntUmp').textContent = D.ATTEST.length;
    pgUmp.paint();
  }

  // ---------------------------------------------------------------- init
  var valCompSel = null, umpReasonSel = null, itemEmpSel = null, itemCompSel = null;
  document.addEventListener('DOMContentLoaded', function () {
    var empOpts = Object.keys(D.EMP).map(function (k) {
      return '<div class="dropdown__opt" data-val="' + k + '">' + D.EMP[k].name + '</div>';
    }).join('');
    document.getElementById('valEmpOpts').innerHTML = Object.keys(D.EMP).map(function (k) {
      return '<div class="dropdown__opt' + (k === valEmp ? ' is-sel' : '') + '" data-val="' + k + '">' + D.EMP[k].name + '</div>';
    }).join('');
    document.getElementById('itemEmpOpts').innerHTML = empOpts;
    var compOpts = D.COMPONENTS.map(function (c) {
      return '<div class="dropdown__opt" data-val="' + c.id + '">' + c.code + ' · ' + c.name + '</div>';
    }).join('');
    document.getElementById('valCompOpts').innerHTML = compOpts;
    document.getElementById('itemCompOpts').innerHTML = compOpts;
    F.wireSelects();
    drawCat(); drawVal(); drawBulk(); drawUmp();

    document.getElementById('catState').addEventListener('select', function (e) {
      catF.st = e.detail.value === 'All proposal states' ? 'ALL' : e.detail.value; pgCat.page = 1; drawCat();
    });
    document.getElementById('catSearch').addEventListener('input', function (e) { catF.q = e.target.value.toLowerCase(); pgCat.page = 1; drawCat(); });
    document.getElementById('valEmp').addEventListener('select', function (e) { valEmp = e.detail.value; drawVal(); });
    document.getElementById('bulkState').addEventListener('select', function (e) {
      bulkF.st = e.detail.value === 'All statuses' ? 'ALL' : e.detail.value; pgBulk.page = 1; drawBulk(); drawBulkDetail(null);
    });
    document.getElementById('umpCp').addEventListener('select', function (e) {
      umpF.cp = e.detail.value === 'All check points' ? 'ALL' : e.detail.value; pgUmp.page = 1; drawUmp();
    });
    document.getElementById('umpBelow').addEventListener('select', function (e) {
      umpF.below = e.detail.value === 'Any result' ? 'ALL' : e.detail.value; pgUmp.page = 1; drawUmp();
    });

    // ---- create component (is_overtime_basis follows is_fixed until it is touched)
    var otTouched = false;
    document.getElementById('tFixed').addEventListener('change', function () {
      if (!otTouched) document.getElementById('tOt').checked = this.checked;
    });
    document.getElementById('tOt').addEventListener('change', function () {
      otTouched = true;
      document.getElementById('tOtHint').textContent = 'Sent explicitly — no longer derived from “tetap”.';
    });
    document.getElementById('catAdd').addEventListener('click', function () {
      document.getElementById('compForm').reset();
      document.getElementById('tFixed').checked = true;
      document.getElementById('tOt').checked = true;
      document.getElementById('tTax').checked = true;
      otTouched = false;
      document.getElementById('tOtHint').innerHTML = 'Left untouched it follows “tetap” — the field is optional and the server derives it from <code>is_fixed</code>.';
      F.openModal('mComp');
    });
    document.getElementById('compSave').addEventListener('click', function () {
      var code = document.getElementById('compCode').value.trim(), name = document.getElementById('compName').value.trim();
      if (!code || !name) { F.toast('Code and name are both required.', 'error'); return; }
      if (D.COMPONENTS.some(function (c) { return c.code.toLowerCase() === code.toLowerCase(); })) {
        F.toast('422 — that component code already exists.', 'error'); return;
      }
      D.COMPONENTS.push({ id: code, code: code, name: name,
        fixed: document.getElementById('tFixed').checked, ot: document.getElementById('tOt').checked,
        tax: document.getElementById('tTax').checked, bpjs: document.getElementById('tBpjs').checked,
        ps: 'AKTIF', used: 0 });
      F.closeModal('mComp'); F.toast(code + ' created — published as AKTIF.', 'ok'); drawCat();
    });

    // ---- rename
    document.getElementById('renameSave').addEventListener('click', function () {
      var v = document.getElementById('renameName').value.trim();
      if (!v) { F.toast('The name cannot be empty.', 'error'); return; }
      D.COMPONENTS.forEach(function (c) { if (c.id === actId) c.name = v; });
      F.closeModal('mRename'); F.toast('Name updated.', 'ok'); drawCat();
    });

    // ---- propose trait change
    document.getElementById('propSave').addEventListener('click', function () {
      var c = comp(actId);
      var next = {
        fixed: document.getElementById('pFixed').checked, ot: document.getElementById('pOt').checked,
        tax: document.getElementById('pTax').checked, bpjs: document.getElementById('pBpjs').checked
      };
      if (next.fixed === c.fixed && next.ot === c.ot && next.tax === c.tax && next.bpjs === c.bpjs) {
        F.toast('422 — at least one trait must differ from the active one.', 'error'); return;
      }
      c.ps = 'MENUNGGU_PERSETUJUAN';
      c.prop = { fixed: next.fixed, ot: next.ot, tax: next.tax, bpjs: next.bpjs, by: ME, at: TODAY, eff: EFF };
      F.closeModal('mPropose'); F.toast('Proposal submitted — the active traits stay as they are until the checker decides.', 'ok'); drawCat();
    });

    // ---- delete
    document.getElementById('delGo').addEventListener('click', function () {
      var c = comp(actId);
      if (c.used > 0) { F.toast('422 PAY_COMPONENT_IN_USE — ' + c.used + ' employee rows reference this component.', 'error'); return; }
      D.COMPONENTS = D.COMPONENTS.filter(function (x) { return x.id !== actId; });
      window.PD.COMPONENTS = D.COMPONENTS;
      F.closeModal('mDel'); F.toast(c.code + ' deleted.', 'ok'); drawCat();
    });

    // ---- propose value change
    document.getElementById('valComp').addEventListener('select', function (e) { valCompSel = e.detail.value; paintUmpGate(); });
    document.getElementById('valAmt').addEventListener('input', paintUmpGate);
    document.getElementById('valAdd').addEventListener('click', function () {
      document.getElementById('valEmpName').value = D.emp(valEmp).name;
      document.getElementById('valAmt').value = '';
      valCompSel = null; umpReasonSel = null;
      var host = document.getElementById('valUmp'); host.innerHTML = ''; host.dataset.gate = '';
      document.querySelector('#valComp .ctl__value').textContent = 'Select component';
      document.querySelector('#valComp .ctl__value').style.color = 'var(--fg-4)';
      F.openModal('mVal');
    });
    document.getElementById('valSave').addEventListener('click', function () {
      var amt = parseInt(String(document.getElementById('valAmt').value).replace(/\D/g, ''), 10);
      if (!valCompSel || !amt) { F.toast('Component and amount are both required.', 'error'); return; }
      var c = comp(valCompSel);
      // anti-stack is per employee-component pair, not per employee.
      if (D.PROPOSALS.some(function (p) { return p.e === valEmp && p.c === c.code && p.st === 'MENUNGGU_PERSETUJUAN'; })) {
        F.toast('422 — ' + D.emp(valEmp).name + ' already has a ' + c.code + ' row waiting for approval.', 'error'); return;
      }
      var base = salaryBase(valEmp, c.code, amt), ump = umpOf(valEmp), below = base < ump;
      var note = document.getElementById('umpNote') ? document.getElementById('umpNote').value.trim() : '';
      if (below && !umpReasonSel) { F.toast('The UMP check must be answered — pick a reason before submitting.', 'error'); return; }
      if (below && umpReasonSel === 'LAINNYA' && !note) { F.toast('A reason note is required when the reason is LAINNYA.', 'error'); return; }
      var cur = currentAmt(valEmp, c.code);
      D.PROPOSALS.push({ id: 'PRP-00' + (D.PROPOSALS.length + 2), e: valEmp, c: c.code, amt: amt, from: EFF,
        st: 'MENUNGGU_PERSETUJUAN', by: ME, at: TODAY, prev: cur || null });
      D.ATTEST.push({ id: 'ATT-000' + (D.ATTEST.length + 1), e: valEmp, cp: 'PENETAPAN_ATAU_PERUBAHAN',
        below: below, ump: ump, base: base, reason: below ? umpReasonSel : null, note: below ? (note || null) : null,
        at: TODAY, by: ME, p: null });
      F.closeModal('mVal');
      F.toast('Proposal submitted — queued for the checker' + (below ? ', UMP attestation recorded with reason ' + umpReasonSel + '.' : '.'), 'ok');
      drawVal(); drawUmp();
    });

    // ---- batch: create draft
    document.getElementById('bulkAdd').addEventListener('click', function () {
      document.getElementById('bulkForm').reset(); F.openModal('mBulkNew');
    });
    document.getElementById('bulkSave').addEventListener('click', function () {
      var n = document.getElementById('bulkName').value.trim();
      if (!n) { F.toast('A batch name is required.', 'error'); return; }
      var id = 'BATCH-000' + (D.BATCHES.length + 1);
      D.BATCHES.unshift({ id: id, name: n, status: 'DRAFT', esc: false, escApprover: null, by: null, at: null, impact: null, members: [] });
      F.closeModal('mBulkNew'); F.toast(id + ' saved as DRAFT — add members, then lock & submit it.', 'ok');
      drawBulk(); drawBulkDetail(id);
    });

    // ---- batch: add / remove member
    document.getElementById('itemEmp').addEventListener('select', function (e) { itemEmpSel = e.detail.value; });
    document.getElementById('itemComp').addEventListener('select', function (e) { itemCompSel = e.detail.value; });
    document.getElementById('itemSave').addEventListener('click', function () {
      var amt = parseInt(String(document.getElementById('itemAmt').value).replace(/\D/g, ''), 10);
      if (!itemEmpSel || !itemCompSel || !amt) { F.toast('Employee, component and amount are all required.', 'error'); return; }
      var b = batch(bulkId), c = comp(itemCompSel);
      if (b.members.some(function (m) { return m.e === itemEmpSel && m.c === c.code; })) {
        F.toast('422 — that employee-component pair is already a member of this batch.', 'error'); return;
      }
      b.members.push({ e: itemEmpSel, c: c.code, delta: amt - currentAmt(itemEmpSel, c.code) });
      F.closeModal('mBulkItem'); F.toast('Member added to ' + b.id + '.', 'ok'); drawBulk(); drawBulkDetail(b.id);
    });

    // ---- batch: lock & submit
    document.getElementById('submitGo').addEventListener('click', function () {
      var b = batch(bulkId);
      if (!b.members.length) { F.toast('422 — an empty batch cannot be submitted.', 'error'); return; }
      b.impact = computeImpact(b);
      b.esc = b.members.length > ESC_THRESHOLD;
      b.escApprover = b.esc ? 'HESTI' : null;
      b.status = 'MENUNGGU_PERSETUJUAN'; b.by = ME; b.at = TODAY;
      F.closeModal('mBulkSubmit');
      F.toast(b.id + ' locked — impact summary frozen' + (b.esc ? ', escalation required (' + b.members.length + ' > ' + ESC_THRESHOLD + ').' : '.'), 'ok');
      drawBulk(); drawBulkDetail(b.id);
    });

    // ---- delegated row actions
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-ren],[data-prop],[data-del],[data-bdet],[data-bitem],[data-bsub],[data-bdel],[data-brm]');
      if (!t) return;
      if (t.hasAttribute('data-bdet')) { drawBulkDetail(t.getAttribute('data-bdet')); return; }
      if (t.hasAttribute('data-bitem')) {
        bulkId = t.getAttribute('data-bitem');
        F.closeModal('mBulkDetail');
        document.getElementById('itemForm').reset();
        document.getElementById('itemBatch').value = batch(bulkId).id + ' · ' + batch(bulkId).name;
        itemEmpSel = null; itemCompSel = null;
        ['itemEmp', 'itemComp'].forEach(function (id) {
          var v = document.querySelector('#' + id + ' .ctl__value');
          v.textContent = id === 'itemEmp' ? 'Select employee' : 'Select component';
          v.style.color = 'var(--fg-4)';
        });
        F.openModal('mBulkItem'); return;
      }
      if (t.hasAttribute('data-bsub')) {
        bulkId = t.getAttribute('data-bsub');
        F.closeModal('mBulkDetail');
        var b = batch(bulkId), im = computeImpact(b);
        document.getElementById('submitBody').innerHTML =
          '<div class="kv"><div class="kv__k">Batch</div><div class="kv__v">' + b.id + ' · ' + b.name + '</div>' +
          '<div class="kv__k">Members</div><div class="kv__v">' + b.members.length + ' rows</div>' +
          '<div class="kv__k">Escalation</div><div class="kv__v">' + (b.members.length > ESC_THRESHOLD
            ? b.members.length + ' &gt; threshold ' + ESC_THRESHOLD + ' — <strong>required</strong>, decided by Hesti Wulandari (Direktur SDM)'
            : b.members.length + ' ≤ threshold ' + ESC_THRESHOLD + ' — not required, ROLE_HR_MANAGER decides') + '</div>' +
          '<div class="kv__k">Effective from</div><div class="kv__v">' + F.fmtDate(EFF) + ' — computed by the system</div></div>' +
          (b.members.length ? '' : '<div class="note note--danger" style="margin-top:14px"><i data-lucide="alert-triangle"></i><span>The batch is empty — the server refuses with <code>422</code>.</span></div>');
        document.getElementById('submitGo').disabled = !b.members.length;
        if (window.lucide) window.lucide.createIcons();
        F.openModal('mBulkSubmit'); return;
      }
      if (t.hasAttribute('data-bdel')) {
        var db = batch(t.getAttribute('data-bdel'));
        if (db.status !== 'DRAFT') { F.toast('422 — only a DRAFT batch can be deleted.', 'error'); return; }
        D.BATCHES = D.BATCHES.filter(function (x) { return x.id !== db.id; });
        window.PD.BATCHES = D.BATCHES;
        F.toast(db.id + ' draft deleted.', 'ok'); drawBulk(); drawBulkDetail(null); return;
      }
      if (t.hasAttribute('data-brm')) {
        var parts = t.getAttribute('data-brm').split('|'), rb = batch(parts[0]);
        rb.members.splice(parseInt(parts[1], 10), 1);
        F.toast('Member removed from the draft.', 'ok'); drawBulk(); drawBulkDetail(rb.id); return;
      }
      actId = t.getAttribute('data-ren') || t.getAttribute('data-prop') || t.getAttribute('data-del');
      var c = comp(actId);
      if (t.hasAttribute('data-ren')) { document.getElementById('renameName').value = c.name; F.openModal('mRename'); return; }
      if (t.hasAttribute('data-prop')) {
        document.getElementById('propTitle').textContent = 'Propose trait change · ' + c.code;
        document.getElementById('propBody').innerHTML =
          '<div class="kv"><div class="kv__k">Component</div><div class="kv__v">' + c.code + ' · ' + c.name + '</div>' +
          '<div class="kv__k">Effective from</div><div class="kv__v">' + F.fmtDate(EFF) + ' — computed by the system</div>' +
          '<div class="kv__k">Employees affected</div><div class="kv__v">' + c.used + '</div></div>' +
          '<div class="fld"><label class="fld__label">Proposed traits</label><div style="display:flex;flex-direction:column;gap:12px;margin-top:4px">' +
          '<label class="co-switch"><input type="checkbox" id="pFixed"' + (c.fixed ? ' checked' : '') + '><span class="co-switch__track"></span><span class="co-switch__label">Tetap</span></label>' +
          '<label class="co-switch"><input type="checkbox" id="pOt"' + (c.ot ? ' checked' : '') + '><span class="co-switch__track"></span><span class="co-switch__label">Ikut basis lembur</span></label>' +
          '<label class="co-switch"><input type="checkbox" id="pTax"' + (c.tax ? ' checked' : '') + '><span class="co-switch__track"></span><span class="co-switch__label">Kena pajak</span></label>' +
          '<label class="co-switch"><input type="checkbox" id="pBpjs"' + (c.bpjs ? ' checked' : '') + '><span class="co-switch__track"></span><span class="co-switch__label">Kena BPJS</span></label>' +
          '</div></div>' +
          '<div class="note note--warn"><i data-lucide="clock"></i><span>While the proposal is <code>MENUNGGU_PERSETUJUAN</code> the four active traits stay untouched — the running period keeps using the old values, and only one proposal can be open per component.</span></div>';
        if (window.lucide) window.lucide.createIcons();
        F.openModal('mPropose'); return;
      }
      if (t.hasAttribute('data-del')) {
        var safe = c.used === 0;
        document.getElementById('delBody').innerHTML =
          '<div class="kv"><div class="kv__k">Component</div><div class="kv__v">' + c.code + ' · ' + c.name + '</div>' +
          '<div class="kv__k">Employees using</div><div class="kv__v">' + c.used + '</div></div>' +
          '<div class="note note--' + (safe ? 'info' : 'danger') + '" style="margin-top:14px"><i data-lucide="' + (safe ? 'info' : 'alert-triangle') + '"></i><span>' +
          (safe ? 'No employee row references this component — the soft-delete is safe.'
                : 'The foreign key is <code>ON DELETE RESTRICT</code>: the server refuses with <code>422 PAY_COMPONENT_IN_USE</code>.') + '</span></div>';
        document.getElementById('delGo').disabled = !safe;
        if (window.lucide) window.lucide.createIcons();
        F.openModal('mDel'); return;
      }
    });
  });
})();
