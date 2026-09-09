// ebanking.js — "Download E-Banking" modal for the Payroll History tab.
// Opened from the header "Download E-Banking" button or a period's 3-dot menu.
// Flow (per Mekari help-centre logic): pick salary type → period → bank, which
// reveals file-type / format / transfer-date / transfer-to, then optional
// per-field filters, then Download (CSV/TXT e-banking file).
(function () {
  'use strict';

  var BANKS = [
    'Bank Central Asia (BCA)', 'Bank Mandiri', 'Bank Negara Indonesia (BNI)',
    'Bank Rakyat Indonesia (BRI)', 'CIMB Niaga', 'Bank Permata',
    'Bank Danamon', 'Bank Tabungan Negara (BTN)', 'OCBC NISP', 'Bank Syariah Indonesia (BSI)'
  ];

  // Filter field definitions (from the design + help-centre filter list).
  var FILTER_TYPES = [
    { key: 'branch',      label: 'Branch',            ph: 'Select branch',            values: ['Head Office', 'Bandung Branch', 'Surabaya Branch', 'Medan Branch'] },
    { key: 'organization',label: 'Organization',      ph: 'Select organization',      values: ['Finance', 'Engineering', 'People & Culture', 'Sales', 'Operations'] },
    { key: 'jobposition', label: 'Job position',      ph: 'Select job position',      values: ['Staff', 'Supervisor', 'Manager', 'Director'] },
    { key: 'joblevel',    label: 'Job level',         ph: 'Select job level',         values: ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'] },
    { key: 'employees',   label: 'Employees',         ph: 'Select employees',         values: ['Tony Stark', 'Steve Rogers', 'Natasha Romanoff', 'Bruce Banner', 'Wanda Maximoff'] },
    { key: 'empstatus',   label: 'Employment status', ph: 'Select employment status', values: ['Permanent', 'Contract', 'Probation', 'Intern'] },
    { key: 'periodsched', label: 'Period schedules',  ph: 'Select period schedules',  values: ['Monthly (25th)', 'End of month', 'Bi-weekly'] },
    { key: 'bankname',    label: 'Bank name',         ph: 'Select bank name',         values: BANKS },
    { key: 'costcenter',  label: 'Cost center',       ph: 'Select cost center',       values: ['CC-100 · HQ', 'CC-200 · Sales', 'CC-300 · Ops'] }
  ];

  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function fallbackPeriods() {
    var out = [];
    for (var i = 0; i < 12; i++) out.push(MONTHS[11 - i] + ' 2026');
    return out;
  }

  var scrim, periodSel, bankSel, bankDeps, filterList, addBtn, dateInput;
  var filters = [];          // [{ typeKey, value }]
  var dp = null;             // shared day picker for transfer date

  /* ---------- Generic custom dropdown ---------- */
  // ctl: the .ctl--select element; opts: array of strings; onPick(value).
  function fillDropdown(ctl, opts, current, onPick) {
    var dd = ctl.querySelector('.dropdown');
    var valueEl = ctl.querySelector('.ctl__value');
    dd.innerHTML = '';
    opts.forEach(function (txt) {
      var o = document.createElement('div');
      o.className = 'dropdown__opt' + (txt === current ? ' is-sel' : '');
      o.textContent = txt;
      o.addEventListener('click', function (e) {
        e.stopPropagation();
        valueEl.textContent = txt;
        valueEl.classList.add('has-value');
        ctl.classList.remove('is-open', 'is-muted');
        if (onPick) onPick(txt);
      });
      dd.appendChild(o);
    });
  }

  function wireToggle(ctl) {
    if (ctl.dataset.toggle) return;
    ctl.dataset.toggle = '1';
    ctl.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !ctl.classList.contains('is-open');
      document.querySelectorAll('.ctl--select.is-open').forEach(function (s) { s.classList.remove('is-open'); });
      ctl.classList.toggle('is-open', willOpen);
    });
  }

  /* ---------- Transfer-date day picker ---------- */
  var dpYear, dpMonth, dpSel;
  function buildDayPicker() {
    dp = document.createElement('div');
    dp.className = 'dp is-days';
    dp.style.width = '280px';
    dp.innerHTML =
      '<div class="dp__head">' +
        '<button class="dp__nav" type="button" data-dp="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<button class="dp__title" type="button" data-dp="title"></button>' +
        '<button class="dp__nav" type="button" data-dp="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</div>' +
      '<div class="dp__view dp__view--days">' +
        '<div class="dp__weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>' +
        '<div class="dp__grid" data-dp="grid"></div>' +
      '</div>';
    document.body.appendChild(dp);
    dp.addEventListener('click', function (e) { e.stopPropagation(); });
    dp.querySelector('[data-dp="prev"]').addEventListener('click', function () { dpMonth--; if (dpMonth < 0) { dpMonth = 11; dpYear--; } renderDays(); });
    dp.querySelector('[data-dp="next"]').addEventListener('click', function () { dpMonth++; if (dpMonth > 11) { dpMonth = 0; dpYear++; } renderDays(); });
  }
  function renderDays() {
    dp.querySelector('[data-dp="title"]').textContent = MONTHS[dpMonth] + ' ' + dpYear;
    var grid = dp.querySelector('[data-dp="grid"]');
    grid.innerHTML = '';
    var first = new Date(dpYear, dpMonth, 1).getDay();
    var days = new Date(dpYear, dpMonth + 1, 0).getDate();
    var today = new Date();
    for (var b = 0; b < first; b++) { var sp = document.createElement('span'); grid.appendChild(sp); }
    for (var d = 1; d <= days; d++) {
      (function (day) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'dp__day';
        c.textContent = day;
        if (today.getFullYear() === dpYear && today.getMonth() === dpMonth && today.getDate() === day) c.classList.add('is-today');
        if (dpSel && dpSel.y === dpYear && dpSel.m === dpMonth && dpSel.d === day) c.classList.add('is-sel');
        c.addEventListener('click', function () {
          dpSel = { y: dpYear, m: dpMonth, d: day };
          if (dateInput) dateInput.value = day + ' ' + MONTHS_SHORT[dpMonth] + ' ' + dpYear;
          closeDayPicker();
        });
        grid.appendChild(c);
      })(d);
    }
  }
  function openDayPicker(anchor) {
    if (!dp) buildDayPicker();
    var base = dpSel ? new Date(dpSel.y, dpSel.m, 1) : new Date();
    dpYear = base.getFullYear();
    dpMonth = base.getMonth();
    renderDays();
    var r = anchor.getBoundingClientRect();
    dp.classList.add('is-open');
    dp.style.top = (r.bottom + window.scrollY + 6) + 'px';
    var left = r.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - 292;
    dp.style.left = Math.min(left, maxLeft) + 'px';
  }
  function closeDayPicker() { if (dp) dp.classList.remove('is-open'); }

  /* ---------- Filters ---------- */
  function usedKeys(except) {
    return filters.filter(function (f, i) { return i !== except; }).map(function (f) { return f.typeKey; });
  }
  function nextUnusedType() {
    var used = usedKeys(-1);
    for (var i = 0; i < FILTER_TYPES.length; i++) {
      if (used.indexOf(FILTER_TYPES[i].key) === -1) return FILTER_TYPES[i].key;
    }
    return null;
  }
  function typeDef(key) {
    return FILTER_TYPES.filter(function (t) { return t.key === key; })[0];
  }

  function renderFilters() {
    filterList.innerHTML = '';
    filters.forEach(function (f, idx) {
      var def = typeDef(f.typeKey);
      var row = document.createElement('div');
      row.className = 'eb-filterrow';

      // available type options: unused types + this row's current type
      var used = usedKeys(idx);
      var typeOpts = FILTER_TYPES.filter(function (t) { return used.indexOf(t.key) === -1; }).map(function (t) { return t.label; });

      row.innerHTML =
        '<div class="ctl ctl--select eb-ctl eb-type"><span class="ctl__value has-value">' + def.label + '</span>' +
          '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg><div class="dropdown"></div></div>' +
        '<span class="eb-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>' +
        '<div class="ctl ctl--select eb-ctl eb-val"><span class="ctl__value' + (f.value ? ' has-value' : '') + '" data-placeholder="' + def.ph + '">' + (f.value || def.ph) + '</span>' +
          '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg><div class="dropdown"></div></div>' +
        '<button class="eb-filterremove" type="button" aria-label="Remove filter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';

      var typeCtl = row.querySelector('.eb-type');
      var valCtl = row.querySelector('.eb-val');

      wireToggle(typeCtl);
      wireToggle(valCtl);
      fillDropdown(typeCtl, typeOpts, def.label, function (label) {
        var picked = FILTER_TYPES.filter(function (t) { return t.label === label; })[0];
        f.typeKey = picked.key;
        f.value = null;
        renderFilters();
      });
      fillDropdown(valCtl, def.values, f.value, function (val) { f.value = val; });

      row.querySelector('.eb-filterremove').addEventListener('click', function () {
        filters.splice(idx, 1);
        renderFilters();
      });

      filterList.appendChild(row);
    });

    addBtn.disabled = filters.length >= FILTER_TYPES.length;
  }

  /* ---------- "Add Filter" LOV popover (lists available filter types) ---------- */
  var ebLov = null;
  function ensureLov() {
    if (ebLov) return ebLov;
    ebLov = document.createElement('div');
    ebLov.className = 'lov-menu';
    ebLov.addEventListener('click', function (e) { e.stopPropagation(); });
    document.body.appendChild(ebLov);
    return ebLov;
  }
  function closeLov() { if (ebLov) ebLov.classList.remove('is-open'); }
  function positionLov(btn) {
    var r = btn.getBoundingClientRect();
    var mh = ebLov.offsetHeight, mw = ebLov.offsetWidth;
    var spaceBelow = window.innerHeight - r.bottom;
    var top = (spaceBelow < mh + 16 && r.top > mh + 16) ? (r.top - mh - 8) : (r.bottom + 8);
    var left = Math.min(r.left, window.innerWidth - mw - 8);
    ebLov.style.top = Math.max(8, top) + 'px';
    ebLov.style.left = Math.max(8, left) + 'px';
  }
  function openLov(btn) {
    var menu = ensureLov();
    var used = filters.map(function (f) { return f.typeKey; });
    var avail = FILTER_TYPES.filter(function (t) { return used.indexOf(t.key) === -1; });
    if (!avail.length) {
      menu.innerHTML = '<div class="lov-menu__empty">All filters have been added</div>';
    } else {
      menu.innerHTML =
        '<div class="lov-menu__search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="text" placeholder="Search filter">' +
        '</div>' +
        '<div class="lov-menu__list">' +
          avail.map(function (t) { return '<button class="lov-menu__item" type="button" data-add="' + t.key + '">' + t.label + '</button>'; }).join('') +
          '<div class="lov-menu__noresult">No matching filter</div>' +
        '</div>';
      menu.querySelectorAll('[data-add]').forEach(function (b) {
        b.addEventListener('click', function () {
          filters.push({ typeKey: b.getAttribute('data-add'), value: null });
          closeLov();
          renderFilters();
        });
      });
      var s = menu.querySelector('.lov-menu__search input');
      var items = [].slice.call(menu.querySelectorAll('.lov-menu__item'));
      var nores = menu.querySelector('.lov-menu__noresult');
      s.addEventListener('input', function () {
        var q = s.value.trim().toLowerCase();
        var any = false;
        items.forEach(function (it) {
          var show = it.textContent.toLowerCase().indexOf(q) !== -1;
          it.style.display = show ? '' : 'none';
          if (show) any = true;
        });
        nores.style.display = any ? 'none' : 'block';
        positionLov(btn);
      });
      setTimeout(function () { s.focus(); }, 0);
    }
    menu.classList.add('is-open');
    positionLov(btn);
  }

  /* ---------- Open / close ---------- */
  function resetForm(presetPeriod) {
    // Salary type
    var salary = scrim.querySelector('input[name="ebSalary"][value="Salary"]');
    if (salary) salary.checked = true;

    // Period
    var periods = (window.EB_PERIODS && window.EB_PERIODS.length) ? window.EB_PERIODS : fallbackPeriods();
    var periodVal = periodSel.querySelector('.ctl__value');
    fillDropdown(periodSel, periods, presetPeriod || null, null);
    if (presetPeriod) {
      periodVal.textContent = presetPeriod;
      periodVal.classList.add('has-value');
      periodSel.classList.remove('is-muted');
    } else {
      periodVal.textContent = periodVal.getAttribute('data-placeholder');
      periodVal.classList.remove('has-value');
      periodSel.classList.add('is-muted');
    }

    // Bank
    var bankVal = bankSel.querySelector('.ctl__value');
    bankVal.textContent = bankVal.getAttribute('data-placeholder');
    bankVal.classList.remove('has-value');
    fillDropdown(bankSel, BANKS, null, function () { bankDeps.classList.remove('is-hidden'); });
    bankDeps.classList.add('is-hidden');

    // Bank-dependent defaults
    var txt = scrim.querySelector('input[name="ebFile"][value="txt"]'); if (txt) txt.checked = true;
    var old = scrim.querySelector('input[name="ebFormat"][value="old"]'); if (old) old.checked = true;
    if (dateInput) dateInput.value = '';
    dpSel = null;
    var ob = document.getElementById('ebOtherBank'); if (ob) ob.checked = false;

    // Filters
    filters = [];
    renderFilters();
  }

  function open(presetPeriod) {
    if (!scrim) return;
    resetForm(presetPeriod);
    scrim.classList.add('is-open');
    scrim.setAttribute('aria-hidden', 'false');
  }
  function close() {
    if (!scrim) return;
    scrim.classList.remove('is-open');
    scrim.setAttribute('aria-hidden', 'true');
    closeDayPicker();
    closeLov();
  }

  function init() {
    scrim = document.getElementById('ebScrim');
    if (!scrim) return;
    periodSel = document.getElementById('ebPeriod');
    bankSel = document.getElementById('ebBank');
    bankDeps = document.getElementById('ebBankDeps');
    filterList = document.getElementById('ebFilterList');
    addBtn = document.getElementById('ebAddFilter');
    dateInput = scrim.querySelector('#ebDate input');

    wireToggle(periodSel);
    wireToggle(bankSel);

    // Transfer-date picker
    var dateCtl = document.getElementById('ebDate');
    if (dateCtl) {
      dateCtl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (dp && dp.classList.contains('is-open')) { closeDayPicker(); return; }
        openDayPicker(dateCtl);
      });
    }

    addBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (addBtn.disabled) return;
      var isOpen = ebLov && ebLov.classList.contains('is-open');
      closeLov();
      if (!isOpen) openLov(addBtn);
    });

    document.getElementById('ebDownload').addEventListener('click', close);
    scrim.querySelectorAll('[data-eb-close]').forEach(function (b) { b.addEventListener('click', close); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('is-open')) { closeDayPicker(); closeLov(); close(); }
    });
    document.addEventListener('click', function (e) {
      closeDayPicker();
      if (!e.target.closest('.lov-menu') && e.target !== addBtn && !addBtn.contains(e.target)) closeLov();
    });
    window.addEventListener('resize', function () { closeDayPicker(); closeLov(); });

    // Header "Download E-Banking" button.
    var headBtn = document.getElementById('phEbanking');
    if (headBtn) headBtn.addEventListener('click', function () { open(null); });

    window.EB = { open: open, close: close };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
