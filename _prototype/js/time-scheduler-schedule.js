// ============================================================
// SEVAKA HRIS — Time › Scheduler Schedule (shift · roster · swap)
// FSD-001-TIME §9 · UIC-001-TIME §10
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var SH = T.SHIFTS.map(function (s) { return Object.assign({}, s); });
  var AS = T.ASSIGN.map(function (a) { return Object.assign({}, a); });
  var SW = T.SWAPS.map(function (s) { return Object.assign({}, s); });
  var editSh = null, editAs = null, decideSw = null, pendingDel = null;
  var $ = function (id) { return document.getElementById(id); };
  var pgAs = F.pager('pgAs', 10, function () { drawAs(); }, 'roster rows');
  var pgSw = F.pager('pgSw', 10, function () { drawSw(); }, 'swap requests');

  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || ''; v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }
  function rosterLabel(a) {
    if (!a) return '—';
    var s = T.byId(SH, a.shift_id);
    return T.d(a.work_date) + ' · ' + T.emp(a.employee_id).name + ' · ' + (a.is_off_day ? 'Off day' : (s ? s.shift_code : '—'));
  }

  // ---------------- shift catalogue ----------------
  function drawSh() {
    $('cntSh').textContent = SH.length;
    $('shBody').innerHTML = SH.map(function (s) {
      return '<tr>' +
        '<td class="cell-mono">' + s.shift_code + '</td>' +
        '<td class="cell-strong">' + s.shift_name + '</td>' +
        '<td>' + T.badge(s.shift_type, T.LABEL.shift_type) + '</td>' +
        '<td>' + (s.start_time ? s.start_time + ' – ' + s.end_time + (s.crosses_midnight ? ' <span class="tm-flag">Crosses midnight</span>' : '') : '<span class="cell-dim">No fixed hours</span>') + '</td>' +
        '<td class="ta-r"><span class="tm-num">' + s.break_minutes + '</span></td>' +
        '<td>' + (s.is_active
          ? '<span class="sb sb--green"><span class="sb__dot"></span>Active</span>'
          : '<span class="sb sb--grey"><span class="sb__dot"></span>Inactive</span>') + '</td>' +
        '<td>' + F.rowMenu([
          { label: 'Edit', icon: 'pencil', attr: 'data-sedit="' + s.id + '"' },
          { label: s.is_active ? 'Deactivate' : 'Reactivate', icon: 'power', attr: 'data-stog="' + s.id + '"' },
          { label: 'Delete', icon: 'trash-2', attr: 'data-sdel="' + s.id + '"', danger: true }
        ]) + '</td>' +
        '</tr>';
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  function shDerived() {
    var type = $('sfType').dataset.val, st = $('sfStart').value, en = $('sfEnd').value;
    var cross = type === 'FIXED' && st && en && en < st;
    $('sfDerived').innerHTML = '<div class="tm-derived__h">Server-derived</div>' +
      '<div class="tm-derived__r">Crosses midnight <b>' + (type === 'FIXED' ? (cross ? 'Yes' : 'No') : 'Not applicable') + '</b></div>' +
      '<div class="tm-derived__r">Selectable in the roster picker <b>' + (type === 'CYCLE' ? 'No — a cycle has no hours of its own' : 'Yes') + '</b></div>';
  }
  function shTypeUI(type) {
    $('sfTimeWrap').classList.toggle('is-hidden', type !== 'FIXED');
    $('sfCycleWrap').classList.toggle('is-hidden', type !== 'CYCLE');
    $('sfFlexWrap').classList.toggle('is-hidden', type !== 'FLEX');
    $('sfBreak').disabled = type === 'CYCLE';
    if (type === 'CYCLE') $('sfBreak').value = 0;
    shDerived();
  }
  function openShForm(s) {
    editSh = s || null;
    $('sfTitle').textContent = s ? 'Edit shift pattern' : 'New shift pattern';
    $('sfTypeLock').classList.toggle('is-hidden', !s);
    $('sfType').style.pointerEvents = s ? 'none' : '';
    $('sfType').style.opacity = s ? '.65' : '';
    $('sfCode').value = s ? s.shift_code : '';
    $('sfName').value = s ? s.shift_name : '';
    setSel('sfType', s ? s.shift_type : '', s ? T.LABEL.shift_type[s.shift_type] : 'Select shift type');
    $('sfStart').value = s && s.start_time ? s.start_time : '';
    $('sfEnd').value = s && s.end_time ? s.end_time : '';
    $('sfBreak').value = s ? s.break_minutes : 0;
    $('sfCycle').value = ''; $('sfFlex').value = '';
    shTypeUI(s ? s.shift_type : '');
    F.openModal('shForm');
  }
  function saveSh() {
    var code = $('sfCode').value.trim().toUpperCase(), name = $('sfName').value.trim();
    var type = $('sfType').dataset.val, st = $('sfStart').value, en = $('sfEnd').value;
    var brk = parseInt($('sfBreak').value, 10);
    if (!code || !name || !type) { F.toast('422 — code, name and shift type are required.', 'danger'); return; }
    if (type === 'FIXED' && (!st || !en)) { F.toast('422 — a fixed pattern needs both a start and an end time.', 'danger'); return; }
    if (type !== 'FIXED' && (st || en)) { F.toast('422 — start and end time must be empty for a non-fixed pattern.', 'danger'); return; }
    if (isNaN(brk) || brk < 0) { F.toast('422 — the break must be a whole number of minutes, 0 or more.', 'danger'); return; }
    if (type === 'CYCLE' && brk !== 0) { F.toast('422 — a cycle pattern must carry a break of 0.', 'danger'); return; }
    if (type === 'CYCLE' && !$('sfCycle').value.trim()) { F.toast('422 — a cycle pattern needs its cycle definition.', 'danger'); return; }
    if (type === 'FLEX' && !$('sfFlex').value.trim()) { F.toast('422 — a flexible pattern needs its band definition.', 'danger'); return; }
    var clash = SH.filter(function (x) { return x.is_active && x.shift_code === code && x !== editSh; })[0];
    if (clash) { F.toast('409 — that shift code is already used by an active pattern.', 'danger'); return; }
    var patch = {
      shift_code: code, shift_name: name, shift_type: type,
      start_time: type === 'FIXED' ? st : null, end_time: type === 'FIXED' ? en : null,
      crosses_midnight: type === 'FIXED' && en < st, break_minutes: brk
    };
    if (editSh) { Object.assign(editSh, patch); F.toast('200 — shift pattern updated.', 'ok'); }
    else { SH.push(Object.assign({ id: 'sh-' + (SH.length + 10), is_active: true, used_by_roster: false }, patch)); F.toast('201 — shift pattern saved into the catalogue.', 'ok'); }
    F.closeModal('shForm'); drawSh(); fillShiftPickers();
  }

  // ---------------- roster ----------------
  function drawAs() {
    var all = AS.slice().sort(function (a, b) { return a.work_date < b.work_date ? 1 : -1; });
    var view = pgAs.slice(all);
    $('cntAs').textContent = AS.length;
    $('asBody').innerHTML = view.map(function (a) {
      var s = T.byId(SH, a.shift_id);
      return '<tr>' +
        '<td class="cell-strong">' + T.d(a.work_date) + '</td>' +
        '<td>' + T.person(a.employee_id) + '</td>' +
        '<td>' + (s ? s.shift_name + ' <span class="cell-dim">· ' + (s.start_time ? s.start_time + '–' + s.end_time : 'no fixed hours') + '</span>' : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + (a.is_off_day ? '<span class="tm-flag">Off day</span>' : '<span class="cell-dim">No</span>') + '</td>' +
        '<td>' + T.badge(a.assignment_source, T.LABEL.assign_source) + '</td>' +
        '<td>' + F.rowMenu([
          { label: 'Override', icon: 'pencil', attr: 'data-aedit="' + a.id + '"' },
          { label: 'Delete', icon: 'trash-2', attr: 'data-adel="' + a.id + '"', danger: true }
        ]) + '</td>' +
        '</tr>';
    }).join('');
    pgAs.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function pickableShifts() { return SH.filter(function (s) { return s.is_active && s.shift_type !== 'CYCLE'; }); }
  function fillShiftPickers() {
    var opts = pickableShifts().map(function (s) { return '<div class="dropdown__opt" data-val="' + s.id + '">' + s.shift_name + ' · ' + s.shift_code + '</div>'; }).join('');
    T.fillSelect('afShift', opts); T.fillSelect('bkShift', opts);
  }
  function openAsForm(a) {
    editAs = a || null;
    $('afTitle').textContent = a ? 'Override roster row' : 'Assign roster';
    $('afEmpLock').classList.toggle('is-hidden', !a);
    $('afEmp').style.pointerEvents = a ? 'none' : '';
    $('afEmp').style.opacity = a ? '.65' : '';
    setSel('afEmp', a ? a.employee_id : '', a ? T.emp(a.employee_id).name : 'Select employee');
    F.setDate($('afDate'), a ? a.work_date : '');
    $('afOff').checked = a ? a.is_off_day : false;
    $('afShiftWrap').classList.toggle('is-hidden', a ? a.is_off_day : false);
    var s = a && a.shift_id ? T.byId(SH, a.shift_id) : null;
    setSel('afShift', s ? s.id : '', s ? s.shift_name + ' · ' + s.shift_code : 'Select shift pattern');
    F.openModal('asForm');
  }
  function saveAs() {
    var emp = $('afEmp').dataset.val, date = $('afDate').dataset.iso;
    var off = $('afOff').checked, shift = off ? null : ($('afShift').dataset.val || null);
    if (!emp || !date) { F.toast('422 — employee and work date are both required.', 'danger'); return; }
    if (!off && !shift) { F.toast('422 — pick a shift pattern, or mark the date as a scheduled off day.', 'danger'); return; }
    var clash = AS.filter(function (x) { return x.employee_id === emp && x.work_date === date && x !== editAs; })[0];
    if (clash) { F.toast('409 — that employee already has a roster row on this date.', 'danger'); return; }
    if (editAs) {
      Object.assign(editAs, { work_date: date, is_off_day: off, shift_id: shift, assignment_source: 'INDIVIDUAL' });
      F.toast('200 — roster row overridden and stamped as an individual adjustment.', 'ok');
    } else {
      AS.push({ id: 'as-' + (AS.length + 10), employee_id: emp, work_date: date, shift_id: shift, is_off_day: off, assignment_source: 'INDIVIDUAL' });
      F.toast('201 — roster row created; the next bulk run will step over it.', 'ok');
    }
    F.closeModal('asForm'); pgAs.reset(); drawAs();
  }

  // ---------------- bulk ----------------
  function bulkEmpIds() {
    var out = [];
    $('bkEmps').querySelectorAll('input[data-emp]:checked').forEach(function (i) { out.push(i.value); });
    return out;
  }
  function paintEmpSummary() {
    var ids = bulkEmpIds(), all = $('bkEmps').querySelectorAll('input[data-emp]').length;
    var v = $('bkEmpVal');
    v.textContent = !ids.length ? 'Select employees'
      : ids.length === all ? 'All employees (' + all + ')'
      : ids.length === 1 ? T.emp(ids[0]).name
      : ids.length + ' employees selected';
    v.style.color = ids.length ? 'var(--fg-1)' : 'var(--fg-4)';
    var chkAll = $('bkEmpAll');
    if (chkAll) { chkAll.checked = ids.length === all && all > 0; chkAll.indeterminate = ids.length > 0 && ids.length < all; }
  }
  function bulkTargets() {
    var emps = bulkEmpIds();
    var from = $('bkFrom').dataset.iso, to = $('bkTo').dataset.iso;
    var created = 0, overwritten = 0, skippedOverride = 0, skippedSwap = 0, dates = [];
    if (from && to && to >= from) {
      for (var d = new Date(from); d <= new Date(to); d.setDate(d.getDate() + 1)) dates.push(T.isoOf(d));
      emps.forEach(function (e) {
        dates.forEach(function (iso) {
          var ex = AS.filter(function (x) { return x.employee_id === e && x.work_date === iso; })[0];
          if (!ex) created++;
          else if (ex.assignment_source === 'INDIVIDUAL') skippedOverride++;
          else if (ex.assignment_source === 'SWAP' || swapBusy(ex.id)) skippedSwap++;
          else overwritten++;
        });
      });
    }
    return { emps: emps, dates: dates, created: created, overwritten: overwritten, skippedOverride: skippedOverride, skippedSwap: skippedSwap };
  }
  function bulkPreview() {
    var r = bulkTargets();
    $('bkPreview').innerHTML = '<div class="tm-derived__h">Result preview</div>' +
      '<div class="tm-derived__r">Rows that will be created <b>' + r.created + '</b></div>' +
      '<div class="tm-derived__r">Existing bulk / system rows that will be rewritten <b>' + r.overwritten + '</b></div>' +
      '<div class="tm-derived__r">Skipped — individual adjustment <b>' + r.skippedOverride + '</b></div>' +
      '<div class="tm-derived__r">Skipped — swap <b>' + r.skippedSwap + '</b></div>' +
      '<div class="tm-derived__r">Employees affected <b>' + r.emps.length + '</b></div>' +
      '<div class="tm-derived__r" style="color:var(--fg-3)">A row already locked by an individual adjustment or a swap is stepped over; a row that is merely the result of an earlier bulk run is rewritten.</div>';
  }

  // ---------------- swap ----------------
  function drawSw() {
    $('cntSw').textContent = SW.length;
    var view = pgSw.slice(SW.slice());
    $('swBody').innerHTML = view.map(function (s) {
      var a = T.byId(AS, s.requester_assignment_id), b = T.byId(AS, s.counterpart_assignment_id);
      var items = [];
      if (s.swap_status === 'PENDING_APPROVAL') {
        var mine = a && a.employee_id === T.ME;
        if (mine) items.push({ label: 'Withdraw', icon: 'undo-2', attr: 'data-swwd="' + s.id + '"', danger: true });
        else items.push({ label: 'Review', icon: 'gavel', attr: 'data-swdec="' + s.id + '"' });
      }
      items.push({ label: 'View Detail', icon: 'eye', attr: 'data-swview="' + s.id + '"' });
      var acts = '<div class="rowacts">' + (items.length === 1
        ? '<button class="rowbtn" data-swview="' + s.id + '">View Detail</button>'
        : F.rowMenu(items)) + '</div>';
      return '<tr>' +
        '<td class="cell-mono">' + s.id + '</td>' +
        '<td>' + rosterLabel(a) + '</td>' +
        '<td>' + rosterLabel(b) + '</td>' +
        '<td>' + (a ? T.d(a.work_date) : '—') + '</td>' +
        '<td>' + T.badge(s.swap_status, T.LABEL.swap) + '</td>' +
        '<td class="cell-dim">' + T.dt(s.submitted_at) + '</td>' +
        '<td>' + (s.approved_by ? T.emp(s.approved_by).name : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + acts + '</td>' +
        '</tr>';
    }).join('');
    pgSw.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function swapBusy(id) {
    return SW.filter(function (s) {
      return s.swap_status === 'PENDING_APPROVAL' && (s.requester_assignment_id === id || s.counterpart_assignment_id === id);
    }).length > 0;
  }

  document.addEventListener('DOMContentLoaded', function () {
    var people = T.EMPLOYEES.filter(function (e) { return e.id !== 'emp-sys'; });
    T.fillSelect('afEmp', people.map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + '</div>'; }).join(''));
    $('bkEmps').innerHTML = '<label class="fchk fchk--all"><input type="checkbox" id="bkEmpAll"><span class="fchk__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span class="fchk__lbl">All</span></label>' +
      people.map(function (e) {
        return '<label class="fchk" data-name="' + e.name.toLowerCase() + '"><input type="checkbox" data-emp value="' + e.id + '"><span class="fchk__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span class="fchk__lbl">' + e.name + '<span class="fchk__sub">' + (e.unit || '') + '</span></span></label>';
      }).join('');
    F.wireSelects(document);
    fillShiftPickers();
    drawSh(); drawAs(); drawSw();

    $('schTabs').addEventListener('tabchange', function (e) {
      $('newShiftBtn').classList.toggle('is-hidden', e.detail.value !== 'shifts');
      $('newAssignBtn').classList.toggle('is-hidden', e.detail.value !== 'roster');
      $('bulkBtn').classList.toggle('is-hidden', e.detail.value !== 'roster');
      $('newSwapBtn').classList.toggle('is-hidden', e.detail.value !== 'swap');
    });

    $('newShiftBtn').addEventListener('click', function () { openShForm(null); });
    $('newAssignBtn').addEventListener('click', function () { openAsForm(null); });
    $('sfSave').addEventListener('click', saveSh);
    $('afSave').addEventListener('click', saveAs);
    $('sfType').addEventListener('select', function (e) { $('sfType').dataset.val = e.detail.value; shTypeUI(e.detail.value); });
    ['sfStart', 'sfEnd'].forEach(function (id) { $(id).addEventListener('input', shDerived); });
    $('afEmp').addEventListener('select', function (e) { $('afEmp').dataset.val = e.detail.value; });
    $('afShift').addEventListener('select', function (e) { $('afShift').dataset.val = e.detail.value.split(' · ').pop(); });
    $('afOff').addEventListener('change', function () {
      $('afShiftWrap').classList.toggle('is-hidden', this.checked);
      if (this.checked) setSel('afShift', '', 'Select shift pattern');
    });

    $('shBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-sedit],[data-stog],[data-sdel]'); if (!t) return;
      var s = T.byId(SH, t.getAttribute('data-sedit') || t.getAttribute('data-stog') || t.getAttribute('data-sdel'));
      if (t.hasAttribute('data-sedit')) openShForm(s);
      else if (t.hasAttribute('data-stog')) {
        s.is_active = !s.is_active; drawSh(); fillShiftPickers();
        F.toast(s.is_active ? '200 — pattern reactivated.' : '200 — pattern retired; existing roster rows pointing at it stay valid.', 'ok');
      } else {
        var used = AS.filter(function (a) { return a.shift_id === s.id; }).length > 0;
        pendingDel = { kind: 'sh', row: s, blocked: used };
        $('xdTitle').textContent = 'Delete this shift pattern?';
        $('xdDesc').textContent = 'Only for a pattern no roster row points at.';
        $('xdKv').innerHTML = kv([['Code', s.shift_code], ['Name', s.shift_name], ['Referenced by roster', used ? 'Yes' : 'No']]);
        $('xdBlocked').classList.toggle('is-hidden', !used);
        $('xdBlockedTxt').innerHTML = 'This pattern is still referenced by one or more roster rows, so deleting it is refused with <code>409</code>. Deactivate it instead.';
        $('xdConfirm').disabled = used;
        F.openModal('schDelete');
      }
    });

    $('asBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-aedit],[data-adel]'); if (!t) return;
      var a = T.byId(AS, t.getAttribute('data-aedit') || t.getAttribute('data-adel'));
      if (t.hasAttribute('data-aedit')) openAsForm(a);
      else {
        var busy = swapBusy(a.id);
        pendingDel = { kind: 'as', row: a, blocked: busy };
        $('xdTitle').textContent = 'Delete this roster row?';
        $('xdDesc').textContent = 'Refused while the row is tied up in an undecided swap.';
        $('xdKv').innerHTML = kv([['Date', T.d(a.work_date)], ['Employee', T.emp(a.employee_id).name], ['Source', T.LABEL.assign_source[a.assignment_source]]]);
        $('xdBlocked').classList.toggle('is-hidden', !busy);
        $('xdBlockedTxt').innerHTML = 'This row is part of a swap request that has not been decided yet, so deleting it is refused with <code>409</code>.';
        $('xdConfirm').disabled = busy;
        F.openModal('schDelete');
      }
    });

    $('xdConfirm').addEventListener('click', function () {
      if (pendingDel.blocked) { F.toast('409 — this row is still referenced.', 'danger'); return; }
      var list = pendingDel.kind === 'sh' ? SH : AS;
      list.splice(list.indexOf(pendingDel.row), 1);
      F.closeModal('schDelete'); drawSh(); drawAs(); fillShiftPickers();
      F.toast('200 — row deleted.', 'ok');
    });

    // bulk
    $('bulkBtn').addEventListener('click', function () {
      $('bkEmps').querySelectorAll('input').forEach(function (i) { i.checked = false; i.indeterminate = false; });
      $('bkEmpSearch').value = '';
      $('bkEmps').querySelectorAll('.fchk[data-name]').forEach(function (l) { l.style.display = ''; });
      paintEmpSummary();
      F.setDate($('bkFrom'), ''); F.setDate($('bkTo'), '');
      setSel('bkShift', '', 'Select shift pattern');
      bulkPreview();
      F.openModal('bulkForm');
    });
    $('bkEmpDd').addEventListener('click', function (e) { e.stopPropagation(); });
    $('bkEmpSearch').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      var shown = 0;
      $('bkEmps').querySelectorAll('.fchk[data-name]').forEach(function (l) {
        var hit = !q || l.dataset.name.indexOf(q) >= 0;
        l.style.display = hit ? '' : 'none'; if (hit) shown++;
      });
      var all = $('bkEmpAll').closest('.fchk');
      all.style.display = q ? 'none' : '';
      var empty = $('bkEmps').querySelector('.msel__empty');
      if (!shown && !empty) $('bkEmps').insertAdjacentHTML('beforeend', '<div class="msel__empty">No employee matches that search.</div>');
      if (shown && empty) empty.remove();
    });
    $('bkEmps').addEventListener('change', function (e) {
      if (e.target.id === 'bkEmpAll') {
        var on = e.target.checked;
        $('bkEmps').querySelectorAll('input[data-emp]').forEach(function (i) { i.checked = on; });
      }
      paintEmpSummary(); bulkPreview();
    });
    ['bkFrom', 'bkTo'].forEach(function (id) { $(id).addEventListener('datechange', bulkPreview); });
    $('bkShift').addEventListener('select', function (e) { $('bkShift').dataset.val = e.detail.value.split(' · ').pop(); });
    $('bkSave').addEventListener('click', function () {
      var r = bulkTargets(), shift = $('bkShift').dataset.val;
      if (!r.emps.length) { F.toast('422 — pick at least one employee.', 'danger'); return; }
      if (!$('bkFrom').dataset.iso || !$('bkTo').dataset.iso) { F.toast('422 — both dates of the range are required.', 'danger'); return; }
      if ($('bkTo').dataset.iso < $('bkFrom').dataset.iso) { F.toast('422 — the end of the range cannot precede its start.', 'danger'); return; }
      if (!shift) { F.toast('422 — pick the shift pattern to apply.', 'danger'); return; }
      r.emps.forEach(function (e) {
        r.dates.forEach(function (iso) {
          var ex = AS.filter(function (x) { return x.employee_id === e && x.work_date === iso; })[0];
          if (ex) {
            if (ex.assignment_source === 'INDIVIDUAL' || ex.assignment_source === 'SWAP' || swapBusy(ex.id)) return;
            ex.shift_id = shift; ex.is_off_day = false; ex.assignment_source = 'BULK';
            return;
          }
          AS.push({ id: 'as-' + (AS.length + 100), employee_id: e, work_date: iso, shift_id: shift, is_off_day: false, assignment_source: 'BULK' });
        });
      });
      F.closeModal('bulkForm'); pgAs.reset(); drawAs();
      F.toast('200 — ' + r.created + ' created, ' + r.overwritten + ' rewritten, ' + (r.skippedOverride + r.skippedSwap) + ' skipped (' + r.skippedOverride + ' individual, ' + r.skippedSwap + ' swap) across ' + r.emps.length + ' employees.', 'ok');
    });

    // swap
    $('newSwapBtn').addEventListener('click', function () {
      var mine = AS.filter(function (a) { return a.employee_id === T.ME && !a.is_off_day && !swapBusy(a.id); });
      T.fillSelect('swMine', mine.length
        ? mine.map(function (a) { return '<div class="dropdown__opt" data-val="' + a.id + '">' + rosterLabel(a) + '</div>'; }).join('')
        : '<div class="dropdown__empty">You have no swappable rostered day.</div>');
      T.fillSelect('swOther', '<div class="dropdown__empty">Pick your row first.</div>');
      setSel('swMine', '', 'Select one of my rostered days');
      setSel('swOther', '', 'Pick your row first');
      F.openModal('swForm');
    });
    $('swMine').addEventListener('select', function (e) {
      var id = e.detail.value; $('swMine').dataset.val = id;
      var mine = T.byId(AS, id);
      var cands = AS.filter(function (a) {
        return mine && a.work_date === mine.work_date && a.employee_id !== mine.employee_id && !swapBusy(a.id);
      });
      T.fillSelect('swOther', cands.length
        ? cands.map(function (a) { return '<div class="dropdown__opt" data-val="' + a.id + '">' + rosterLabel(a) + '</div>'; }).join('')
        : '<div class="dropdown__empty">No eligible counterpart on that date.</div>');
      setSel('swOther', '', cands.length ? 'Select counterpart' : 'No eligible counterpart');
    });
    $('swOther').addEventListener('select', function (e) { $('swOther').dataset.val = e.detail.value; });
    $('swSave').addEventListener('click', function () {
      var a = $('swMine').dataset.val, b = $('swOther').dataset.val;
      if (!a || !b) { F.toast('422 — both roster rows are required.', 'danger'); return; }
      if (a === b) { F.toast('422 — the counterpart must be a different row.', 'danger'); return; }
      SW.push({ id: 'sw-' + (SW.length + 10), requester_assignment_id: a, counterpart_assignment_id: b, swap_status: 'PENDING_APPROVAL', submitted_at: new Date().toISOString(), approved_by: null });
      F.closeModal('swForm'); drawSw();
      F.toast('201 — swap requested; neither roster changes until a supervisor approves.', 'ok');
    });

    $('swBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-swview],[data-swdec],[data-swwd]'); if (!t) return;
      var s = T.byId(SW, t.getAttribute('data-swview') || t.getAttribute('data-swdec') || t.getAttribute('data-swwd'));
      if (t.hasAttribute('data-swwd')) {
        s.swap_status = 'CANCELLED'; drawSw();
        F.toast('200 — swap withdrawn (status CANCELLED); the request stays as a trace and no roster was touched.', 'ok');
        return;
      }
      decideSw = s;
      var a = T.byId(AS, s.requester_assignment_id), b = T.byId(AS, s.counterpart_assignment_id);
      $('sdKv').innerHTML = kv([
        ['Swap', s.id], ['Work date', a ? T.d(a.work_date) : '—'],
        ['Requester', a ? T.emp(a.employee_id).name : '—'], ['Requester row', rosterLabel(a)],
        ['Counterpart', b ? T.emp(b.employee_id).name : '—'], ['Counterpart row', rosterLabel(b)],
        ['Status', T.badge(s.swap_status, T.LABEL.swap)], ['Submitted', T.dt(s.submitted_at)]
      ]);
      var can = s.swap_status === 'PENDING_APPROVAL' && !(a && a.employee_id === T.ME);
      $('sdApprove').disabled = !can; $('sdReject').disabled = !can;
      F.openModal('swDecision');
    });
    $('sdApprove').addEventListener('click', function () {
      var s = decideSw, a = T.byId(AS, s.requester_assignment_id), b = T.byId(AS, s.counterpart_assignment_id);
      var pack = { shift_id: a.shift_id, is_off_day: a.is_off_day };
      a.shift_id = b.shift_id; a.is_off_day = b.is_off_day; a.assignment_source = 'SWAP';
      b.shift_id = pack.shift_id; b.is_off_day = pack.is_off_day; b.assignment_source = 'SWAP';
      s.swap_status = 'APPROVED'; s.approved_by = T.ME;
      F.closeModal('swDecision'); drawSw(); drawAs();
      F.toast('200 — swap approved; both roster rows exchanged their pattern as one package.', 'ok');
    });
    $('sdReject').addEventListener('click', function () {
      decideSw.swap_status = 'REJECTED'; decideSw.approved_by = T.ME;
      F.closeModal('swDecision'); drawSw();
      F.toast('200 — swap rejected; neither roster changed.', 'warn');
    });
  });
})();
