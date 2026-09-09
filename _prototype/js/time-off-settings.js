// ============================================================
// SEVAKA HRIS — Time › Time Off Settings
// FSD-001-TIME §4 · UIC-001-TIME §5–§7
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var TYPES = T.LEAVE_TYPES.map(function (t) { return Object.assign({}, t); });
  var POL = T.ACCRUAL_POLICIES.map(function (p) { return Object.assign({}, p); });
  var BO = T.BLACKOUTS.map(function (b) { return Object.assign({}, b); });
  var editType = null, endPol = null, editBo = null, pendingDel = null;
  var $ = function (id) { return document.getElementById(id); };
  var flt = { tActive: '', tStat: '', tQ: '', pType: '', pElig: '', bMode: '', bQ: '' };
  var pgType, pgPol, pgBo;
  function tri(v, b) { return v === '' || (v === '1') === !!b; }

  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function flag(on, label) { return '<span class="tm-flag' + (on ? '' : ' tm-flag--off') + '">' + label + '</span>'; }
  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || ''; v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }

  // ---------------- leave types ----------------
  function drawTypes() {
    $('cntType').textContent = TYPES.length;
    var q = flt.tQ.toLowerCase();
    var rows = TYPES.filter(function (t) {
      return tri(flt.tActive, t.is_active) && tri(flt.tStat, t.is_statutory) &&
        (!q || t.leave_code.toLowerCase().indexOf(q) > -1 || t.leave_name.toLowerCase().indexOf(q) > -1);
    });
    $('typeBody').innerHTML = pgType.slice(rows).map(function (t) {
      var acts = F.rowMenu([{ label: 'Edit', icon: 'pencil', attr: 'data-tedit="' + t.id + '"' }, { label: 'Delete', icon: 'trash-2', attr: 'data-tdel="' + t.id + '"', danger: true }]);
      return '<tr>' +
        '<td class="cell-mono">' + t.leave_code + '</td>' +
        '<td class="cell-strong">' + t.leave_name + '</td>' +
        '<td><div class="tm-flags">' +
          flag(t.is_paid, 'Paid') + flag(t.affects_balance, 'Deducts balance') + flag(t.requires_document, 'Document') +
          flag(t.requires_approval, t.requires_approval ? 'Maker–checker' : 'Auto-approve') +
          flag(t.requires_extra_approval, 'Extra layer') + flag(t.is_active, 'Active') +
        '</div></td>' +
        '<td class="ta-r"><span class="tm-num">' + t.min_advance_days + '</span></td>' +
        '<td>' + (t.is_statutory ? '<span class="tm-flag">Statutory</span>' : '<span class="cell-dim">Tenant-defined</span>') + '</td>' +
        '<td>' + acts + '</td>' +
        '</tr>';
    }).join('');
    pgType.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function openTypeForm(t) {
    editType = t || null;
    $('tfTitle').textContent = t ? 'Edit leave type' : 'New leave type';
    $('tfCode').value = t ? t.leave_code : '';
    $('tfName').value = t ? t.leave_name : '';
    $('tfPaid').checked = t ? t.is_paid : false;
    $('tfBalance').checked = t ? t.affects_balance : false;
    $('tfDoc').checked = t ? t.requires_document : false;
    $('tfApproval').checked = t ? t.requires_approval : true;
    $('tfExtra').checked = t ? t.requires_extra_approval : false;
    $('tfActive').checked = t ? t.is_active : true;
    $('tfAdvance').value = t ? t.min_advance_days : 0;
    $('tfStatutory').value = t && t.is_statutory ? 'Yes — system-seeded, immutable' : 'No';
    $('tfStatBanner').classList.toggle('is-hidden', !(t && t.is_statutory));
    // leave_code is immutable once the row exists (UIC §5.1.3)
    $('tfCode').readOnly = !!t;
    $('tfCodeCtl').classList.toggle('ctl--ro', !!t);
    $('tfCodeHint').textContent = t
      ? 'Immutable once the type exists — a code is only set when the row is created.'
      : '2–30 characters, capitals and digits, hyphen allowed. Unique among active rows.';
    F.openModal('typeForm');
  }

  function saveType() {
    var code = editType ? editType.leave_code : $('tfCode').value.trim().toUpperCase();
    var name = $('tfName').value.trim();
    var paid = $('tfPaid').checked, bal = $('tfBalance').checked, adv = parseInt($('tfAdvance').value, 10);
    if (!/^[A-Z0-9][A-Z0-9-]{1,29}$/.test(code)) { F.toast('422 — the code must be 2–30 characters of capitals, digits and hyphens.', 'danger'); return; }
    if (name.length < 3) { F.toast('422 — the leave name must be at least 3 characters.', 'danger'); return; }
    if (!paid && bal) { F.toast('422 — unpaid and deducts-balance cannot both be on; that would charge the same day twice.', 'danger'); return; }
    if (isNaN(adv) || adv < 0) { F.toast('422 — minimum advance days must be a whole number of 0 or more.', 'danger'); return; }
    var clash = TYPES.filter(function (x) { return x.is_active && x.leave_code === code && x !== editType; })[0];
    if (clash) { F.toast('409 — that leave code is already used by an active type.', 'danger'); return; }
    var patch = {
      leave_code: code, leave_name: name, is_paid: paid, affects_balance: bal,
      requires_document: $('tfDoc').checked, requires_approval: $('tfApproval').checked,
      requires_extra_approval: $('tfExtra').checked, is_active: $('tfActive').checked, min_advance_days: adv
    };
    if (editType) { Object.assign(editType, patch); F.toast('200 — leave type updated; tightened rules apply only to requests filed from now on.', 'ok'); }
    else { TYPES.push(Object.assign({ id: 'lt-' + (TYPES.length + 10), is_statutory: false }, patch)); F.toast('201 — leave type saved and immediately selectable on the request form.', 'ok'); }
    F.closeModal('typeForm'); drawTypes();
  }

  // ---------------- accrual policies ----------------
  function drawPol() {
    $('cntPol').textContent = POL.length;
    var rows = POL.filter(function (p) {
      return (!flt.pType || p.leave_type_id === flt.pType) && tri(flt.pElig, p.is_eligible);
    });
    $('polBody').innerHTML = pgPol.slice(rows).map(function (p) {
      var items = [];
      if (!p.effective_until) items.push({ label: 'End policy', icon: 'calendar-x', attr: 'data-pend="' + p.id + '"' });
      items.push({ label: 'Delete', icon: 'trash-2', attr: 'data-pdel="' + p.id + '"', danger: true });
      var acts = items.length === 1
        ? '<div class="rowacts"><button class="rowbtn rowbtn--danger" data-pdel="' + p.id + '">Delete</button></div>'
        : F.rowMenu(items);
      var carry = T.LABEL.carry[p.carry_over_policy] +
        (p.carry_over_policy === 'CARRY_CAPPED' ? ' <span class="cell-dim">· max ' + p.carry_over_max_days + ' d, expires ' + p.carry_over_expiry_month_day + '</span>' : '');
      return '<tr>' +
        '<td class="cell-strong">' + T.lt(p.leave_type_id).leave_name + '</td>' +
        '<td>' + p.work_status + '</td>' +
        '<td>' + (p.is_eligible ? '<span class="tm-flag">Entitled</span>' : '<span class="tm-flag tm-flag--off">Not entitled</span>') + '</td>' +
        '<td class="ta-r"><span class="tm-num">' + (p.is_eligible ? T.num(p.rate_per_month, 2) : '—') + '</span></td>' +
        '<td class="ta-r"><span class="tm-num">' + (p.max_balance_days || '<span class="cell-dim">No cap</span>') + '</span></td>' +
        '<td>' + carry + '</td>' +
        '<td>' + T.d(p.effective_from) + '</td>' +
        '<td>' + (p.effective_until ? T.d(p.effective_until) : '<span class="cell-dim">Still running</span>') + '</td>' +
        '<td>' + acts + '</td>' +
        '</tr>';
    }).join('');
    pgPol.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function savePol() {
    var type = $('pfType').dataset.val, elig = $('pfEligible').checked;
    var rate = $('pfRate').value === '' ? null : parseFloat($('pfRate').value);
    var cap = $('pfCap').value === '' ? null : parseFloat($('pfCap').value);
    var carry = $('pfCarry').dataset.val || 'FORFEIT';
    var cmax = $('pfCarryMax').value === '' ? null : parseInt($('pfCarryMax').value, 10);
    var cexp = $('pfCarryExp').value.trim();
    var from = $('pfFrom').dataset.iso;
    if (!type || !from) { F.toast('422 — leave type and the start date are required.', 'danger'); return; }
    if (elig && (rate === null || rate < 0)) { F.toast('422 — an entitled policy needs a rate per month of 0 or more.', 'danger'); return; }
    if (!elig && rate !== null) { F.toast('422 — the rate must be empty when the group is not entitled.', 'danger'); return; }
    if (cap !== null && cap <= 0) { F.toast('422 — the balance cap must be greater than zero when filled.', 'danger'); return; }
    if (carry === 'CARRY_CAPPED' && (!cmax || !/^\d{2}-\d{2}$/.test(cexp))) { F.toast('422 — carry capped needs both the maximum days and an MM-DD expiry.', 'danger'); return; }
    if (carry !== 'CARRY_CAPPED' && (cmax || cexp)) { F.toast('422 — the carry-over fields must be empty unless the policy is carry capped.', 'danger'); return; }
    var overlap = POL.filter(function (p) {
      if (p.leave_type_id !== type || p.work_status !== 'Tetap') return false;
      return !(p.effective_until && p.effective_until < from);
    })[0];
    if (overlap) { F.toast('409 — a live policy already covers this leave type × employment type over an overlapping range.', 'danger'); return; }
    POL.push({
      id: 'policy-' + (POL.length + 10), leave_type_id: type, work_status: 'Tetap', is_eligible: elig,
      rate_per_month: rate, max_balance_days: cap, carry_over_policy: carry,
      carry_over_max_days: carry === 'CARRY_CAPPED' ? cmax : null,
      carry_over_expiry_month_day: carry === 'CARRY_CAPPED' ? cexp : null,
      effective_from: from, effective_until: null
    });
    F.closeModal('polForm'); drawPol();
    F.toast('201 — accrual policy saved; the monthly process starts reading it from its start date.', 'ok');
  }

  // ---------------- blackout ----------------
  function drawBo() {
    $('cntBo').textContent = BO.length;
    var q = flt.bQ.toLowerCase();
    var rows = BO.filter(function (b) {
      return (!flt.bMode || b.blackout_mode === flt.bMode) && (!q || b.blackout_name.toLowerCase().indexOf(q) > -1);
    });
    $('boBody').innerHTML = pgBo.slice(rows).map(function (b) {
      return '<tr>' +
        '<td class="cell-strong">' + b.blackout_name + '</td>' +
        '<td>' + T.range(b.start_date, b.end_date) + '</td>' +
        '<td>' + (b.blackout_mode === 'HARD'
          ? '<span class="sb sb--red"><span class="sb__dot"></span>Machine-rejected</span>'
          : '<span class="sb sb--amber"><span class="sb__dot"></span>Extra approval</span>') + '</td>' +
        '<td class="cell-dim">' + (b.scope_ref ? T.scopeName('UNIT', b.scope_ref) : 'Company-wide') + '</td>' +
        '<td class="cell-dim"><span class="tm-trunc" title="' + (b.blackout_reason || '').replace(/"/g, '&quot;') + '">' + (b.blackout_reason || '—') + '</span></td>' +
        '<td>' + F.rowMenu([
          { label: 'Edit', icon: 'pencil', attr: 'data-bedit="' + b.id + '"' },
          { label: 'Delete', icon: 'trash-2', attr: 'data-bdel="' + b.id + '"', danger: true }
        ]) + '</td>' +
        '</tr>';
    }).join('');
    pgBo.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function openBoForm(b) {
    editBo = b || null;
    $('bfTitle').textContent = b ? 'Edit blackout period' : 'New blackout period';
    $('bfName').value = b ? b.blackout_name : '';
    $('bfReason').value = b ? (b.blackout_reason || '') : '';
    F.setDate($('bfStart'), b ? b.start_date : '');
    F.setDate($('bfEnd'), b ? b.end_date : '');
    setSel('bfMode', b ? b.blackout_mode : 'HARD', b && b.blackout_mode === 'SOFT' ? 'Extra approval' : 'Machine-rejected');
    $('bfScoped').checked = !!(b && b.scope_ref);
    $('bfScopeWrap').classList.toggle('is-hidden', !(b && b.scope_ref));
    setSel('bfScope', b && b.scope_ref ? b.scope_ref : '', b && b.scope_ref ? T.scopeName('UNIT', b.scope_ref) : 'Select unit');
    F.openModal('boForm');
  }
  function saveBo() {
    var name = $('bfName').value.trim(), reason = $('bfReason').value.trim();
    var s = $('bfStart').dataset.iso, e = $('bfEnd').dataset.iso;
    var mode = $('bfMode').dataset.val || 'HARD';
    var scoped = $('bfScoped').checked, scope = $('bfScope').dataset.val || null;
    if (name.length < 3) { F.toast('422 — the period name must be at least 3 characters.', 'danger'); return; }
    if (reason && (reason.length < 5)) { F.toast('422 — the reason must be 5–300 characters when filled.', 'danger'); return; }
    if (!s || !e) { F.toast('422 — both the start and the end date are mandatory.', 'danger'); return; }
    if (e < s) { F.toast('422 — the end date cannot precede the start date.', 'danger'); return; }
    if (scoped && !scope) { F.toast('422 — pick the unit this period is limited to.', 'danger'); return; }
    var patch = { blackout_name: name, blackout_reason: reason, start_date: s, end_date: e, blackout_mode: mode, scope_ref: scoped ? scope : null };
    if (editBo) { Object.assign(editBo, patch); F.toast('200 — blackout period updated.', 'ok'); }
    else { BO.push(Object.assign({ id: 'blackout-' + (BO.length + 10) }, patch)); F.toast('201 — blackout period saved; the submit gate reads it from now on.', 'ok'); }
    F.closeModal('boForm'); drawBo();
  }

  // ---------------- wiring ----------------
  document.addEventListener('DOMContentLoaded', function () {
    pgType = F.pager('pgType', 10, drawTypes, 'leave types');
    pgPol = F.pager('pgPol', 10, drawPol, 'policies');
    pgBo = F.pager('pgBo', 10, drawBo, 'periods');
    T.fillSelect('fltPType', '<div class="dropdown__opt is-sel" data-val="">All leave types</div>' +
      TYPES.map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.leave_name + '</div>'; }).join(''));
    T.fillSelect('pfType', TYPES.filter(function (t) { return t.affects_balance; })
      .map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.leave_name + '</div>'; }).join(''));
    T.fillSelect('bfScope', T.UNITS.map(function (u) { return '<div class="dropdown__opt" data-val="' + u.id + '">' + u.name + '</div>'; }).join(''));
    drawTypes(); drawPol(); drawBo();

    $('setTabs').addEventListener('tabchange', function (e) {
      $('newTypeBtn').classList.toggle('is-hidden', e.detail.value !== 'types');
      $('newPolicyBtn').classList.toggle('is-hidden', e.detail.value !== 'accrual');
      $('newBlackoutBtn').classList.toggle('is-hidden', e.detail.value !== 'blackout');
    });
    $('newTypeBtn').addEventListener('click', function () { openTypeForm(null); });
    $('newBlackoutBtn').addEventListener('click', function () { openBoForm(null); });
    $('newPolicyBtn').addEventListener('click', function () {
      setSel('pfType', '', 'Select leave type'); setSel('pfWork', 'Tetap', 'Tetap');
      setSel('pfCarry', 'FORFEIT', 'Forfeit');
      $('pfEligible').checked = false; $('pfRate').value = ''; $('pfRate').disabled = true;
      $('pfRateStar').style.display = 'none';
      $('pfCap').value = ''; $('pfCarryMax').value = ''; $('pfCarryExp').value = '';
      $('pfCarryWrap').classList.add('is-hidden');
      F.setDate($('pfFrom'), '');
      F.openModal('polForm');
    });

    $('fltTActive').addEventListener('select', function (e) { flt.tActive = e.detail.value; drawTypes(); });
    $('fltTStat').addEventListener('select', function (e) { flt.tStat = e.detail.value; drawTypes(); });
    $('fltTQ').addEventListener('input', function () { flt.tQ = this.value.trim(); drawTypes(); });
    $('fltPType').addEventListener('select', function (e) { flt.pType = e.detail.value; drawPol(); });
    $('fltPElig').addEventListener('select', function (e) { flt.pElig = e.detail.value; drawPol(); });
    $('fltBMode').addEventListener('select', function (e) { flt.bMode = e.detail.value; drawBo(); });
    $('fltBQ').addEventListener('input', function () { flt.bQ = this.value.trim(); drawBo(); });

    $('tfSave').addEventListener('click', saveType);
    $('pfSave').addEventListener('click', savePol);
    $('bfSave').addEventListener('click', saveBo);

    $('pfEligible').addEventListener('change', function () {
      $('pfRate').disabled = !this.checked;
      $('pfRateStar').style.display = this.checked ? '' : 'none';
      if (!this.checked) $('pfRate').value = '';
    });
    $('pfCarry').addEventListener('select', function (e) {
      $('pfCarry').dataset.val = e.detail.value;
      var capped = e.detail.value === 'CARRY_CAPPED';
      $('pfCarryWrap').classList.toggle('is-hidden', !capped);
      if (!capped) { $('pfCarryMax').value = ''; $('pfCarryExp').value = ''; }
    });
    $('pfType').addEventListener('select', function (e) { $('pfType').dataset.val = e.detail.value; });
    $('bfMode').addEventListener('select', function (e) { $('bfMode').dataset.val = e.detail.value; });
    $('bfScope').addEventListener('select', function (e) { $('bfScope').dataset.val = e.detail.value; });
    $('bfScoped').addEventListener('change', function () {
      $('bfScopeWrap').classList.toggle('is-hidden', !this.checked);
      if (!this.checked) setSel('bfScope', '', 'Select unit');
    });

    $('typeBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-tedit],[data-tdel]'); if (!t) return;
      var row = T.byId(TYPES, t.getAttribute('data-tedit') || t.getAttribute('data-tdel'));
      if (t.hasAttribute('data-tedit')) openTypeForm(row);
      else if (row.is_statutory) F.toast('422 — a statutory leave type cannot be deleted, not even softly. Switch off Active instead.', 'danger');
      else if (POL.filter(function (p) { return p.leave_type_id === row.id; }).length ||
        T.LEAVE_REQUESTS.filter(function (r) { return r.leave_type_id === row.id; }).length ||
        T.LEDGER.filter(function (l) { return l.leave_type_id === row.id; }).length ||
        T.LEAVE_BALANCES.filter(function (b) { return b.leave_type_id === row.id; }).length) {
        F.toast('409 — this type is still referenced by a policy, a request or a balance row. Switch off Active to retire it from new use.', 'danger');
      } else {
        pendingDel = { kind: 'type', row: row };
        $('sdTitle').textContent = 'Delete this leave type?';
        $('sdDesc').textContent = 'Soft delete — only for a row created by mistake.';
        $('sdKv').innerHTML = kv([['Code', row.leave_code], ['Name', row.leave_name]]);
        F.openModal('setDelete');
      }
    });

    $('polBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-pend],[data-pdel]'); if (!t) return;
      var row = T.byId(POL, t.getAttribute('data-pend') || t.getAttribute('data-pdel'));
      if (t.hasAttribute('data-pend')) {
        endPol = row;
        $('peKv').innerHTML = kv([
          ['Leave type', T.lt(row.leave_type_id).leave_name], ['Employment type', row.work_status],
          ['Rate / month', T.num(row.rate_per_month, 2)], ['Effective from', T.d(row.effective_from)]
        ]);
        F.setDate($('peUntil'), '');
        F.openModal('polEnd');
      } else {
        pendingDel = { kind: 'pol', row: row };
        $('sdTitle').textContent = 'Delete this accrual policy?';
        $('sdDesc').textContent = 'Only for a row created in error that the accrual process has never used.';
        $('sdKv').innerHTML = kv([['Leave type', T.lt(row.leave_type_id).leave_name], ['Effective from', T.d(row.effective_from)]]);
        F.openModal('setDelete');
      }
    });

    $('peSave').addEventListener('click', function () {
      var until = $('peUntil').dataset.iso;
      if (!until) { F.toast('422 — pick the date the policy stops applying.', 'danger'); return; }
      if (until < endPol.effective_from) { F.toast('422 — the end date cannot precede the start date.', 'danger'); return; }
      endPol.effective_until = until;
      F.closeModal('polEnd'); drawPol();
      F.toast('200 — policy ended; accrual stops reading it from the following month.', 'ok');
    });

    $('boBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-bedit],[data-bdel]'); if (!t) return;
      var row = T.byId(BO, t.getAttribute('data-bedit') || t.getAttribute('data-bdel'));
      if (t.hasAttribute('data-bedit')) openBoForm(row);
      else {
        pendingDel = { kind: 'bo', row: row };
        $('sdTitle').textContent = 'Delete this blackout period?';
        $('sdDesc').textContent = 'Soft delete — it withdraws a period previously declared critical.';
        $('sdKv').innerHTML = kv([['Period', row.blackout_name], ['Dates', T.range(row.start_date, row.end_date)]]);
        F.openModal('setDelete');
      }
    });

    $('sdConfirm').addEventListener('click', function () {
      var list = pendingDel.kind === 'type' ? TYPES : pendingDel.kind === 'pol' ? POL : BO;
      list.splice(list.indexOf(pendingDel.row), 1);
      F.closeModal('setDelete');
      drawTypes(); drawPol(); drawBo();
      F.toast('200 — row deleted.', 'ok');
    });
  });
})();
