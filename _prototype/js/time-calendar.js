// ============================================================
// SEVAKA HRIS — Time › Calendar (mst_holiday + cnf_work_calendar)
// FSD-001-TIME §1 · UIC-001-TIME §2
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var HOL = T.HOLIDAYS.map(function (h) { return Object.assign({}, h); });
  var WC = T.WORK_CALENDARS.map(function (w) { return Object.assign({}, w, { working_days: Object.assign({}, w.working_days) }); });
  var DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  var DAYLBL = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  var flt = { status: '', type: '', name: '', from: '', to: '' };
  var wflt = { scope: '', name: '' };
  var editHol = null, decideHol = null, delHol = null, editWc = null, delWc = null;
  var effEmp = 'emp-rina', effView = new Date(2026, 6, 1);

  var $ = function (id) { return document.getElementById(id); };
  var pgHol = F.pager('pgHol', 10, function () { drawHol(); }, 'holidays');
  var pgWc = F.pager('pgWc', 10, function () { drawWc(); }, 'patterns');

  // ---------------- holiday grid ----------------
  function holRows() {
    return HOL.filter(function (h) {
      if (flt.status && h.approval_status !== flt.status) return false;
      if (flt.type && h.holiday_type !== flt.type) return false;
      if (flt.name && h.holiday_name.toLowerCase().indexOf(flt.name.toLowerCase()) < 0) return false;
      if (flt.from && h.holiday_date < flt.from) return false;
      if (flt.to && h.holiday_date > flt.to) return false;
      return true;
    }).sort(function (a, b) { return a.holiday_date < b.holiday_date ? -1 : 1; });
  }

  function holActions(h) {
    if (h.is_system) return '<div class="rowacts"><button class="rowbtn" data-view="' + h.id + '">View Detail</button></div>';
    if (h.approval_status === 'DRAFT') {
      return F.rowMenu([
        { label: 'Edit & submit', icon: 'pencil', attr: 'data-edit="' + h.id + '"' },
        { label: 'View Detail', icon: 'eye', attr: 'data-view="' + h.id + '"' },
        { label: 'Delete', icon: 'trash-2', attr: 'data-del="' + h.id + '"', danger: true }
      ]);
    }
    if (h.approval_status === 'PENDING_APPROVAL') {
      if (h.created_by === T.ME) {
        return '<div class="rowacts"><button class="rowbtn" data-view="' + h.id + '">View Detail</button></div>';
      }
      return F.rowMenu([
        { label: 'Review', icon: 'gavel', attr: 'data-decide="' + h.id + '"' },
        { label: 'View Detail', icon: 'eye', attr: 'data-view="' + h.id + '"' }
      ]);
    }
    return F.rowMenu([
      { label: 'View Detail', icon: 'eye', attr: 'data-view="' + h.id + '"' },
      { label: 'Edit', icon: 'pencil', attr: 'data-edit="' + h.id + '"' },
      { label: 'Delete', icon: 'trash-2', attr: 'data-del="' + h.id + '"', danger: true }
    ]);
  }

  function drawHol() {
    var all = holRows(), view = pgHol.slice(all);
    $('cntHol').textContent = HOL.length;
    $('holBody').innerHTML = view.length ? view.map(function (h) {
      var tags = '';
      if (h.is_system) tags += ' <span class="tm-flag">System</span>';
      if (h.is_joint_leave) tags += ' <span class="tm-flag">Joint leave</span>';
      return '<tr>' +
        '<td class="cell-strong">' + T.d(h.holiday_date) + '</td>' +
        '<td>' + h.holiday_name + tags + '</td>' +
        '<td>' + T.LABEL.holiday_type[h.holiday_type] + '</td>' +
        '<td class="cell-dim">' + T.scopeName(h.scope_level, h.scope_ref) + '</td>' +
        '<td class="cell-dim"><span class="tm-trunc">' + (h.source || '—') + '</span></td>' +
        '<td>' + T.badge(h.approval_status, T.LABEL.approval) + '</td>' +
        '<td>' + holActions(h) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty"><div class="tempty__t">No holiday matches these filters.</div></div></td></tr>';
    pgHol.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- work calendar grid ----------------
  function wcActions(w) {
    return F.rowMenu([
      { label: 'Edit', icon: 'pencil', attr: 'data-wedit="' + w.id + '"' },
      { label: 'Delete', icon: 'trash-2', attr: 'data-wdel="' + w.id + '"', danger: true }
    ]);
  }
  function wcRows() {
    return WC.filter(function (w) {
      if (wflt.scope && w.scope_level !== wflt.scope) return false;
      if (wflt.name && w.calendar_name.toLowerCase().indexOf(wflt.name.toLowerCase()) < 0) return false;
      return true;
    });
  }
  function drawWc() {
    var all = wcRows(), view = pgWc.slice(all);
    $('cntWc').textContent = WC.length;
    $('wcBody').innerHTML = (view.length ? view.map(function (w) {
      return '<tr>' +
        '<td class="cell-strong">' + w.calendar_name + '</td>' +
        '<td>' + T.LABEL.scope_level[w.scope_level] + (w.scope_ref ? ' · ' + T.scopeName(w.scope_level, w.scope_ref) : '') + '</td>' +
        '<td>' + T.days(w.working_days) + '</td>' +
        '<td>' + T.d(w.effective_from) + '</td>' +
        '<td>' + (w.effective_until ? T.d(w.effective_until) : '<span class="cell-dim">Open-ended</span>') + '</td>' +
        '<td>' + wcActions(w) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty"><div class="tempty__t">No work pattern matches these filters.</div></div></td></tr>');
    pgWc.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- effective calendar ----------------
  function patternFor(empId, iso) {
    var e = T.emp(empId);
    var unit = T.UNITS.filter(function (u) { return u.name === e.unit; })[0];
    var cands = WC.filter(function (w) {
      if (w.effective_from > iso) return false;
      if (w.effective_until && w.effective_until < iso) return false;
      if (w.scope_level === 'UNIT') return unit && w.scope_ref === unit.id;
      if (w.scope_level === 'LOCATION') return w.scope_ref === e.branch;
      return true;
    });
    var rank = { LOCATION: 0, UNIT: 1, COMPANY: 2 };
    cands.sort(function (a, b) { return rank[a.scope_level] - rank[b.scope_level]; });
    return cands[0] || null;
  }
  function holidayOn(empId, iso) {
    var e = T.emp(empId), unit = T.UNITS.filter(function (u) { return u.name === e.unit; })[0];
    return HOL.filter(function (h) {
      if (h.holiday_date !== iso || h.approval_status !== 'APPROVED') return false;
      if (h.holiday_type === 'REGIONAL') {
        if (h.scope_level === 'LOCATION') return h.scope_ref === e.branch;
        if (h.scope_level === 'UNIT') return unit && h.scope_ref === unit.id;
        return false;
      }
      return true;
    })[0] || null;
  }
  function rosterOn(empId, iso) {
    return T.ASSIGN.filter(function (a) { return a.employee_id === empId && a.work_date === iso; })[0] || null;
  }
  // FC-01 resolution (UIC §2.2.6): roster > unit/location > company, with an APPROVED
  // holiday overlaid last — a holiday always wins over the pattern that day.
  function resolveDay(empId, dd, iso) {
    var r = { working: false, source: '—', label: 'No calendar resolved' };
    var as = rosterOn(empId, iso), pat = patternFor(empId, iso);
    if (as) {
      var sh = as.shift_id ? T.byId(T.SHIFTS, as.shift_id) : null;
      r = { working: !as.is_off_day, source: 'ROSTER', label: as.is_off_day ? 'Roster off day' : (sh ? sh.shift_name : 'Rostered') };
    } else if (pat) {
      var on = !!pat.working_days[DAYS[(dd.getDay() + 6) % 7]];
      r = { working: on, source: pat.scope_level, label: on ? 'Working day' : 'Weekly rest' };
    }
    var hol = holidayOn(empId, iso);
    if (hol) r = { working: false, source: 'HOLIDAY', label: hol.holiday_name };
    return r;
  }
  function drawEff() {
    var y = effView.getFullYear(), m = effView.getMonth();
    var pat = patternFor(effEmp, T.isoOf(new Date(y, m, 15)));
    var lead = (new Date(y, m, 1).getDay() + 6) % 7, start = new Date(y, m, 1 - lead);
    var cells = '';
    for (var i = 0; i < 42; i++) {
      var dd = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      var iso = T.isoOf(dd), out = dd.getMonth() !== m;
      var r = resolveDay(effEmp, dd, iso);
      var cls = 'tm-cal__c' + (out ? ' is-out' : '');
      if (r.source === 'HOLIDAY') cls += ' is-holiday';
      else if (r.source === 'ROSTER') cls += r.working ? ' is-roster' : ' is-rest';
      else if (r.working) cls += ' is-work';
      else cls += ' is-rest';
      cells += '<div class="' + cls + '"><span class="tm-cal__n">' + dd.getDate() + '</span>' +
        '<span class="tm-cal__t">' + r.label + '</span>' +
        '<span class="tm-cal__s">' + r.source + '</span></div>';
    }
    $('effCal').innerHTML =
      '<div class="tm-cal__bar"><button class="tm-cal__nav" type="button" data-eff="-1"><i data-lucide="chevron-left"></i></button>' +
      '<span class="tm-cal__ttl">' + ['January','February','March','April','May','June','July','August','September','October','November','December'][m] + ' ' + y + '</span>' +
      '<button class="tm-cal__nav" type="button" data-eff="1"><i data-lucide="chevron-right"></i></button>' +
      '<span class="tm-cal__sp"></span>' +
      '<span class="sec-head__note">' + T.emp(effEmp).name + ' · pattern in force: <strong>' + (pat ? pat.calendar_name : 'none resolved') + '</strong></span></div>' +
      '<div class="tm-cal__wd">' + ['Mo','Tu','We','Th','Fr','Sa','Su'].map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
      '<div class="tm-cal__grid">' + cells + '</div>' +
      '<div class="tm-legend"><span><i class="i-work"></i>Working day (calendar pattern)</span><span><i class="i-roster"></i>Rostered shift</span><span><i class="i-rest"></i>Non-working day</span><span><i class="i-holiday"></i>Holiday in force</span>' +
      '<span class="tm-cal__sp"></span><span>Each cell names the winning layer — ROSTER · UNIT · LOCATION · COMPANY · HOLIDAY. Approved leave is not part of this resolution.</span></div>';
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- holiday form ----------------
  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || '';
    v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }
  function fillScopeRef(level) {
    var src = level === 'UNIT' ? T.UNITS : T.BRANCHES;
    T.fillSelect('hfScopeRef', src.map(function (s) { return '<div class="dropdown__opt" data-val="' + s.id + '">' + s.name + '</div>'; }).join(''));
  }
  function openHolForm(h) {
    editHol = h || null;
    $('hfTitle').textContent = h ? 'Edit holiday' : 'New holiday';
    $('hfDesc').textContent = h
      ? 'Only the name and the source are open for editing. Saving a Draft row also submits it for approval.'
      : 'Regional and company holidays only — the national layer is seeded by the system and cannot be created here.';
    ['hfDateLock', 'hfTypeLock', 'hfScopeLock'].forEach(function (id) { $(id).classList.toggle('is-hidden', !h); });
    $('hfDateCtl').style.pointerEvents = h ? 'none' : '';
    $('hfDateCtl').style.opacity = h ? '.65' : '';
    ['hfType', 'hfScopeLevel', 'hfScopeRef'].forEach(function (id) {
      $(id).style.pointerEvents = h ? 'none' : '';
      $(id).style.opacity = h ? '.65' : '';
    });
    if (h) {
      F.setDate($('hfDate'), h.holiday_date);
      setSel('hfType', h.holiday_type, T.LABEL.holiday_type[h.holiday_type]);
      $('hfName').value = h.holiday_name;
      $('hfSource').value = h.source || '';
      $('hfStatusBadge').innerHTML = T.badge(h.approval_status, T.LABEL.approval);
      $('hfJoint').checked = !!h.is_joint_leave; $('hfJoint').disabled = true;
      $('hfScopeWrap').classList.toggle('is-hidden', h.holiday_type !== 'REGIONAL');
      if (h.holiday_type === 'REGIONAL') {
        fillScopeRef(h.scope_level);
        setSel('hfScopeLevel', h.scope_level, T.LABEL.scope_level[h.scope_level]);
        setSel('hfScopeRef', h.scope_ref, T.scopeName(h.scope_level, h.scope_ref));
      }
      $('hfSave').textContent = h.approval_status === 'DRAFT' ? 'Save & submit for approval' : 'Save changes';
    } else {
      F.setDate($('hfDate'), '');
      setSel('hfType', '', 'Select type');
      setSel('hfScopeLevel', '', 'Select scope level');
      setSel('hfScopeRef', '', 'Select scope level first');
      $('hfName').value = ''; $('hfSource').value = ''; $('hfStatusBadge').innerHTML = '';
      $('hfJoint').checked = false; $('hfJoint').disabled = false;
      $('hfScopeWrap').classList.add('is-hidden');
      $('hfSave').textContent = 'Save as draft';
    }
    F.openModal('holForm');
  }

  function saveHol() {
    var name = $('hfName').value.trim(), iso = $('hfDate').dataset.iso;
    var type = $('hfType').dataset.val, lvl = $('hfScopeLevel').dataset.val, ref = $('hfScopeRef').dataset.val;
    if (editHol) {
      if (!name) { F.toast('422 — holiday name is required.', 'danger'); return; }
      editHol.holiday_name = name; editHol.source = $('hfSource').value.trim();
      if (editHol.approval_status === 'DRAFT') {
        editHol.approval_status = 'PENDING_APPROVAL';
        F.toast('200 — saved and submitted; the row is now waiting for a checker.', 'ok');
      } else F.toast('200 — changes saved; the approval status is untouched.', 'ok');
    } else {
      if (!iso || !name || !type) { F.toast('422 — date, name and holiday type are required.', 'danger'); return; }
      if (type === 'REGIONAL' && (!lvl || !ref)) { F.toast('422 — a regional holiday needs both a scope level and a scope.', 'danger'); return; }
      // §2.1.1: the slot is date × type × scope and ANY live row holds it — a rejected one included.
      var clash = HOL.filter(function (h) {
        return h.holiday_date === iso && h.holiday_type === type &&
          (h.scope_ref || null) === (type === 'REGIONAL' ? ref : null);
      })[0];
      if (clash) { F.toast('409 — the ' + T.LABEL.approval[clash.approval_status].toLowerCase() + ' row “' + clash.holiday_name + '” already holds this date × type × scope slot. Delete it first.', 'danger'); return; }
      F.toast('201 — holiday saved as Draft. Open Edit & submit to start the approval.', 'ok');
      HOL.push({
        id: 'hol-' + (HOL.length + 10), holiday_date: iso, holiday_name: name, holiday_type: type,
        scope_level: type === 'REGIONAL' ? lvl : null, scope_ref: type === 'REGIONAL' ? ref : null,
        is_joint_leave: $('hfJoint').checked, is_system: false, source: $('hfSource').value.trim(),
        approval_status: 'DRAFT', created_by: T.ME
      });
      F.toast('201 — holiday saved as Draft. Open Edit & submit to start the approval.', 'ok');
    }
    F.closeModal('holForm'); pgHol.reset(); drawHol(); drawEff();
  }

  // ---------------- decision ----------------
  function openDecision(h) {
    decideHol = h;
    $('hdKv').innerHTML = kv([
      ['Date', T.d(h.holiday_date)], ['Holiday', h.holiday_name],
      ['Type', T.LABEL.holiday_type[h.holiday_type]], ['Scope', T.scopeName(h.scope_level, h.scope_ref)],
      ['Source', h.source || '—'], ['Submitted by', T.emp(h.created_by).name]
    ]);
    $('hdNote').value = '';
    F.openModal('holDecision');
  }
  function decide(kind) {
    var note = $('hdNote').value.trim();
    if (kind === 'REJECTED' && !note) { F.toast('422 — a rejection needs a reason.', 'danger'); return; }
    var row = decideHol;
    F.closeModal('holDecision');
    F.toast('200 — decision accepted and forwarded; the status is written once the process completes.', 'info');
    setTimeout(function () {
      row.approval_status = kind;
      row.approved_by = T.ME;
      row.approved_at = new Date().toISOString();
      drawHol(); drawEff();
      F.toast(kind === 'APPROVED' ? 'Approval process finished — the date is now a holiday in force.' : 'Approval process finished — the row is Rejected and keeps holding its slot.', kind === 'APPROVED' ? 'ok' : 'warn');
    }, 1400);
  }

  function kv(rows) {
    return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join('');
  }

  // ---------------- work calendar form ----------------
  function dayToggles(wd, locked) {
    $('wfDays').innerHTML = DAYS.map(function (k) {
      return '<button type="button" class="tm-daytog' + (wd[k] ? ' is-on' : '') + '" data-day="' + k + '"' + (locked ? ' disabled' : '') + '>' +
        '<span>' + DAYLBL[k] + '</span><small>' + (wd[k] ? 'Working' : 'Rest') + '</small></button>';
    }).join('');
  }
  function openWcForm(w) {
    editWc = w || null;
    $('wfTitle').textContent = w ? 'Edit work pattern' : 'New work pattern';
    ['wfScopeLock', 'wfDaysLock', 'wfFromLock'].forEach(function (id) { $(id).classList.toggle('is-hidden', !w); });
    ['wfScopeLevel', 'wfScopeRef'].forEach(function (id) {
      $(id).style.pointerEvents = w ? 'none' : ''; $(id).style.opacity = w ? '.65' : '';
    });
    $('wfFromCtl').style.pointerEvents = w ? 'none' : '';
    $('wfFromCtl').style.opacity = w ? '.65' : '';
    var onlyCompany = w && w.scope_level === 'COMPANY' && WC.filter(function (x) { return x.scope_level === 'COMPANY' && !x.effective_until; }).length === 1;
    $('wfLastCompany').classList.toggle('is-hidden', !onlyCompany);
    if (w) {
      $('wfName').value = w.calendar_name;
      setSel('wfScopeLevel', w.scope_level, T.LABEL.scope_level[w.scope_level]);
      $('wfScopeRefWrap').classList.toggle('is-hidden', w.scope_level === 'COMPANY');
      if (w.scope_level === 'COMPANY') setSel('wfScopeRef', '', 'Company-wide');
      else {
        fillWcScopeRef(w.scope_level);
        setSel('wfScopeRef', w.scope_ref, T.scopeName(w.scope_level, w.scope_ref));
      }
      dayToggles(w.working_days, true);
      F.setDate($('wfFrom'), w.effective_from);
      F.setDate($('wfUntil'), w.effective_until || '');
    } else {
      $('wfName').value = '';
      setSel('wfScopeLevel', '', 'Select scope level');
      setSel('wfScopeRef', '', 'Company-wide');
      dayToggles({ mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false }, false);
      F.setDate($('wfFrom'), ''); F.setDate($('wfUntil'), '');
      $('wfScopeRefWrap').classList.add('is-hidden');
    }
    F.openModal('wcForm');
  }
  function fillWcScopeRef(level) {
    var src = level === 'UNIT' ? T.UNITS : T.BRANCHES;
    T.fillSelect('wfScopeRef', src.map(function (s) { return '<div class="dropdown__opt" data-val="' + s.id + '">' + s.name + '</div>'; }).join(''));
  }
  function saveWc() {
    var name = $('wfName').value.trim(), lvl = $('wfScopeLevel').dataset.val;
    // the ref is meaningless at company level — read it from the level, never from the (hidden) control
    var ref = lvl === 'COMPANY' ? null : ($('wfScopeRef').dataset.val || null);
    var from = $('wfFrom').dataset.iso, until = $('wfUntil').dataset.iso || null;
    if (editWc) {
      if (!name) { F.toast('422 — pattern name is required.', 'danger'); return; }
      if (until && until < editWc.effective_from) { F.toast('422 — the end date cannot precede the start date.', 'danger'); return; }
      if (until && editWc.scope_level === 'COMPANY' && WC.filter(function (x) { return x.scope_level === 'COMPANY' && !x.effective_until; }).length === 1) {
        F.toast('422 — the last active company pattern cannot be ended without a replacement.', 'danger'); return;
      }
      editWc.calendar_name = name; editWc.effective_until = until;
      F.toast('200 — pattern updated.', 'ok');
    } else {
      if (!name || !lvl || !from) { F.toast('422 — name, scope level and start date are required.', 'danger'); return; }
      if (lvl !== 'COMPANY' && !ref) { F.toast('422 — a unit or location pattern needs a scope.', 'danger'); return; }
      var wd = {}; $('wfDays').querySelectorAll('.tm-daytog').forEach(function (b) { wd[b.dataset.day] = b.classList.contains('is-on'); });
      var overlap = WC.filter(function (x) {
        if (x.scope_level !== lvl || (x.scope_ref || null) !== ref) return false;
        return !(x.effective_until && x.effective_until < from);
      })[0];
      if (overlap) { F.toast('409 — an active pattern already covers this scope over an overlapping period.', 'danger'); return; }
      WC.push({ id: 'wc-' + (WC.length + 10), calendar_name: name, scope_level: lvl, scope_ref: ref, working_days: wd, effective_from: from, effective_until: until, created_by: T.ME });
      F.toast('201 — work pattern saved; it applies forward from its start date.', 'ok');
    }
    F.closeModal('wcForm'); drawWc(); drawEff();
  }

  // ---------------- wiring ----------------
  document.addEventListener('DOMContentLoaded', function () {
    T.fillSelect('effEmp', T.EMPLOYEES.filter(function (e) { return e.id !== 'emp-sys'; })
      .map(function (e) { return '<div class="dropdown__opt' + (e.id === effEmp ? ' is-sel' : '') + '" data-val="' + e.id + '">' + e.name + '</div>'; }).join(''));
    drawHol(); drawWc(); drawEff();

    $('fltHolStatus').addEventListener('select', function (e) { flt.status = e.detail.value === 'All statuses' ? '' : e.detail.value; pgHol.reset(); drawHol(); });
    $('fltHolType').addEventListener('select', function (e) { flt.type = e.detail.value === 'All types' ? '' : e.detail.value; pgHol.reset(); drawHol(); });
    $('fltHolName').addEventListener('input', function () { flt.name = this.value.trim(); pgHol.reset(); drawHol(); });
    $('fltHolFrom').addEventListener('datechange', function () { flt.from = this.dataset.iso || ''; pgHol.reset(); drawHol(); });
    $('fltHolTo').addEventListener('datechange', function () { flt.to = this.dataset.iso || ''; pgHol.reset(); drawHol(); });
    $('fltHolReset').addEventListener('click', function () {
      flt.status = ''; flt.type = ''; flt.from = ''; flt.to = '';
      setSel('fltHolStatus', '', 'All statuses'); setSel('fltHolType', '', 'All types');
      ['fltHolFrom', 'fltHolTo'].forEach(function (id) { var i = $(id); i.value = ''; i.dataset.iso = ''; i.classList.remove('has-value'); });
      pgHol.reset(); drawHol();
    });
    $('fltWcScope').addEventListener('select', function (e) { wflt.scope = e.detail.value === 'All scope levels' ? '' : e.detail.value; pgWc.reset(); drawWc(); });
    $('fltWcName').addEventListener('input', function () { wflt.name = this.value.trim(); pgWc.reset(); drawWc(); });
    $('effEmp').addEventListener('select', function (e) { effEmp = e.detail.value; drawEff(); });
    $('effCal').addEventListener('click', function (e) {
      var b = e.target.closest('[data-eff]'); if (!b) return;
      effView.setMonth(effView.getMonth() + (+b.getAttribute('data-eff'))); drawEff();
    });

    $('calTabs').addEventListener('tabchange', function (e) {
      $('newHolidayBtn').classList.toggle('is-hidden', e.detail.value !== 'holiday');
      $('newWcBtn').classList.toggle('is-hidden', e.detail.value !== 'workcal');
    });
    $('newHolidayBtn').addEventListener('click', function () { openHolForm(null); });
    $('newWcBtn').addEventListener('click', function () { openWcForm(null); });

    $('holBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-view],[data-edit],[data-del],[data-decide]');
      if (!t) return;
      var id = t.getAttribute('data-view') || t.getAttribute('data-edit') || t.getAttribute('data-del') || t.getAttribute('data-decide');
      var h = T.byId(HOL, id);
      if (t.hasAttribute('data-view')) {
        $('hxKv').innerHTML = kv([
          ['Date', T.d(h.holiday_date)], ['Holiday', h.holiday_name],
          ['Type', T.LABEL.holiday_type[h.holiday_type]], ['Scope', T.scopeName(h.scope_level, h.scope_ref)],
          ['Joint leave', h.is_joint_leave ? 'Yes' : 'No'], ['System row', h.is_system ? 'Yes — seeded, locked' : 'No'],
          ['Source', h.source || '—'], ['Status', T.badge(h.approval_status, T.LABEL.approval)],
          ['Created by', T.emp(h.created_by).name], ['Decided by', h.approved_by ? T.emp(h.approved_by).name : '—']
        ]);
        F.openModal('holDetail');
      } else if (t.hasAttribute('data-edit')) openHolForm(h);
      else if (t.hasAttribute('data-decide')) openDecision(h);
      else if (t.hasAttribute('data-del')) {
        delHol = h;
        $('hdelKv').innerHTML = kv([['Date', T.d(h.holiday_date)], ['Holiday', h.holiday_name], ['Status', T.badge(h.approval_status, T.LABEL.approval)]]);
        F.openModal('holDelete');
      }
    });

    $('wcBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-wedit],[data-wdel]'); if (!t) return;
      var w = T.byId(WC, t.getAttribute('data-wedit') || t.getAttribute('data-wdel'));
      if (t.hasAttribute('data-wedit')) openWcForm(w);
      else {
        delWc = w;
        $('wdelKv').innerHTML = kv([['Pattern', w.calendar_name], ['Scope', T.LABEL.scope_level[w.scope_level]], ['Effective from', T.d(w.effective_from)]]);
        F.openModal('wcDelete');
      }
    });

    $('hfSave').addEventListener('click', saveHol);
    $('hdApprove').addEventListener('click', function () { decide('APPROVED'); });
    $('hdReject').addEventListener('click', function () { decide('REJECTED'); });
    $('hdelConfirm').addEventListener('click', function () {
      // §2.1.4: 422 on a system row; 409 while a scored attendance day still points at the date.
      if (delHol.is_system) { F.closeModal('holDelete'); F.toast('422 — a national row is seeded by the system and cannot be deleted here.', 'danger'); return; }
      var used = T.DAILY.filter(function (d) { return d.work_date === delHol.holiday_date; }).length;
      if (delHol.approval_status === 'APPROVED' && used) {
        F.closeModal('holDelete');
        F.toast('409 — ' + used + ' scored attendance day(s) still reference this date; the holiday cannot be deleted.', 'danger');
        return;
      }
      HOL.splice(HOL.indexOf(delHol), 1);
      F.closeModal('holDelete'); drawHol(); drawEff();
      F.toast('200 — holiday deleted; its date slot is free again.', 'ok');
    });
    $('wdelConfirm').addEventListener('click', function () {
      // §2.2.4: the last active company pattern may not be removed — nothing would resolve.
      if (delWc.scope_level === 'COMPANY' && WC.filter(function (x) { return x.scope_level === 'COMPANY' && !x.effective_until; }).length === 1) {
        F.closeModal('wcDelete');
        F.toast('422 — the last active company pattern cannot be deleted; create a replacement first.', 'danger');
        return;
      }
      WC.splice(WC.indexOf(delWc), 1);
      F.closeModal('wcDelete'); pgWc.reset(); drawWc(); drawEff();
      F.toast('200 — work pattern deleted.', 'ok');
    });
    $('wfSave').addEventListener('click', saveWc);

    $('hfType').addEventListener('select', function (e) {
      var v = e.detail.value;
      $('hfType').dataset.val = v;
      $('hfScopeWrap').classList.toggle('is-hidden', v !== 'REGIONAL');
    });
    $('hfScopeLevel').addEventListener('select', function (e) {
      $('hfScopeLevel').dataset.val = e.detail.value;
      fillScopeRef(e.detail.value);
      setSel('hfScopeRef', '', 'Select scope');
    });
    $('hfScopeRef').addEventListener('select', function (e) { $('hfScopeRef').dataset.val = e.detail.value; });
    $('wfScopeLevel').addEventListener('select', function (e) {
      var v = e.detail.value;
      $('wfScopeLevel').dataset.val = v;
      $('wfScopeRefWrap').classList.toggle('is-hidden', v === 'COMPANY');
      if (v !== 'COMPANY') { fillWcScopeRef(v); setSel('wfScopeRef', '', 'Select scope'); }
      else setSel('wfScopeRef', '', 'Company-wide');
    });
    $('wfScopeRef').addEventListener('select', function (e) { $('wfScopeRef').dataset.val = e.detail.value; });
    $('wfDays').addEventListener('click', function (e) {
      var b = e.target.closest('.tm-daytog'); if (!b || b.disabled) return;
      b.classList.toggle('is-on');
      b.querySelector('small').textContent = b.classList.contains('is-on') ? 'Working' : 'Rest';
    });
    $('hdNote').addEventListener('input', function () {});
  });
})();
