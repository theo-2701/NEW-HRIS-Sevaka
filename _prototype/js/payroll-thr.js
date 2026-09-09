// payroll-thr.js — Run THR wizard (Setup → Review → Summary).
// Self-contained: own employee selection, assign modal, filter engine,
// date pickers, stepper and progress. Runs after payroll-processing.js.
(function () {
  'use strict';

  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WEEKDAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  var AVATAR = '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="18" r="8" fill="#fff" opacity="0.92"/><path d="M10 42c1.5-9 7.5-13 14-13s12.5 4 14 13z" fill="#fff" opacity="0.92"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>';
  var MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>';

  var RELIGIONS = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
  var SERVICE = ['1 yr 2 mo', '3 yr 0 mo', '2 yr 7 mo', '5 yr 4 mo', '8 mo', '4 yr 1 mo'];

  var EMPLOYEES = [
    { id: 'CP057', name: 'Mitsui Nol',      loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP058', name: 'Mitsui Satu',     loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP059', name: 'Mitsui Dua',      loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP060', name: 'Mitsui Tiga',     loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP061', name: 'Mitsui Empat',    loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP062', name: 'Mitsui Lima',     loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP063', name: 'Mitsui Enam',     loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP064', name: 'Mitsui Tujuh',    loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP065', name: 'Mitsui Tujuh',    loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP066', name: 'Mitsui Delapan',  loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP067', name: 'Mitsui Sembilan', loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP068', name: 'Mitsui Sepuluh',  loc: 'Jakarta | IT Staff - SQA', assigned: false },
    { id: 'CP069', name: 'Mitsui Sebelas',  loc: 'Jakarta | IT Staff - SQA', assigned: false }
  ];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function selected() { return EMPLOYEES.filter(function (e) { return e.assigned; }); }

  /* ===================== DATE / MONTH PICKER ===================== */
  var dp = null, dpInput = null, dpMode = 'day', dpView = 'days';
  var dpYear = 2026, dpMonth = 2, dpDay = null, dpSel = null;

  function buildPicker() {
    dp = document.createElement('div');
    dp.className = 'dp';
    dp.innerHTML =
      '<div class="dp__head">' +
        '<button class="dp__nav" type="button" data-dp="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<button class="dp__title" type="button" data-dp="title"></button>' +
        '<button class="dp__nav" type="button" data-dp="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</div>' +
      '<div class="dp__view dp__view--days">' +
        '<div class="dp__weekdays">' + WEEKDAYS.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="dp__grid" data-dp="days"></div>' +
      '</div>' +
      '<div class="dp__view dp__view--months"><div class="dp__cells" data-dp="months"></div></div>' +
      '<div class="dp__view dp__view--years"><div class="dp__cells" data-dp="years"></div></div>';
    document.body.appendChild(dp);
    dp.addEventListener('click', function (e) { e.stopPropagation(); });
    dp.querySelector('[data-dp="prev"]').addEventListener('click', function () { step(-1); });
    dp.querySelector('[data-dp="next"]').addEventListener('click', function () { step(1); });
    dp.querySelector('[data-dp="title"]').addEventListener('click', function () {
      if (dpMode === 'month') { dpView = dpView === 'months' ? 'years' : 'months'; }
      else { dpView = dpView === 'days' ? 'months' : (dpView === 'months' ? 'years' : 'months'); }
      render();
    });
  }

  function step(dir) {
    if (dpView === 'days') {
      dpMonth += dir;
      if (dpMonth < 0) { dpMonth = 11; dpYear--; }
      else if (dpMonth > 11) { dpMonth = 0; dpYear++; }
    } else if (dpView === 'months') {
      dpYear += dir;
    } else {
      dpYear += dir * 12;
    }
    render();
  }

  function commitDay(y, m, d) {
    dpSel = { y: y, m: m, d: d };
    if (dpInput) dpInput.value = d + ' ' + MONTHS_SHORT[m] + ' ' + y;
    close();
    THR.refreshSummary();
  }
  function commitMonth(y, m) {
    dpSel = { y: y, m: m, d: null };
    if (dpInput) dpInput.value = MONTHS_SHORT[m] + ' ' + y;
    close();
    THR.refreshSummary();
  }

  function render() {
    dp.classList.remove('is-days', 'is-months', 'is-years');
    dp.classList.add('is-' + dpView);
    var title = dp.querySelector('[data-dp="title"]');

    if (dpView === 'days') {
      title.textContent = MONTHS_SHORT[dpMonth] + ' ' + dpYear;
      var grid = dp.querySelector('[data-dp="days"]');
      grid.innerHTML = '';
      var first = new Date(dpYear, dpMonth, 1).getDay();
      var daysIn = new Date(dpYear, dpMonth + 1, 0).getDate();
      var prevDays = new Date(dpYear, dpMonth, 0).getDate();
      for (var i = 0; i < first; i++) {
        var od = prevDays - first + 1 + i;
        grid.appendChild(dayCell(od, true, dpMonth - 1));
      }
      for (var d = 1; d <= daysIn; d++) {
        grid.appendChild(dayCell(d, false, dpMonth));
      }
      var total = first + daysIn;
      var trail = (7 - (total % 7)) % 7;
      for (var t = 1; t <= trail; t++) {
        grid.appendChild(dayCell(t, true, dpMonth + 1));
      }
    } else if (dpView === 'months') {
      title.textContent = dpYear;
      var mc = dp.querySelector('[data-dp="months"]');
      mc.innerHTML = '';
      MONTHS_SHORT.forEach(function (name, idx) {
        var c = document.createElement('button');
        c.type = 'button'; c.className = 'dp__cell'; c.textContent = name;
        if (dpSel && dpSel.y === dpYear && dpSel.m === idx) c.classList.add('is-sel');
        c.addEventListener('click', function () {
          dpMonth = idx;
          if (dpMode === 'month') commitMonth(dpYear, idx);
          else { dpView = 'days'; render(); }
        });
        mc.appendChild(c);
      });
    } else {
      var yStart = dpYear - (dpYear % 12);
      title.textContent = yStart + ' - ' + (yStart + 11);
      var yc = dp.querySelector('[data-dp="years"]');
      yc.innerHTML = '';
      for (var yr = yStart; yr < yStart + 12; yr++) {
        (function (year) {
          var c = document.createElement('button');
          c.type = 'button'; c.className = 'dp__cell'; c.textContent = year;
          if (dpSel && dpSel.y === year) c.classList.add('is-sel');
          c.addEventListener('click', function () { dpYear = year; dpView = 'months'; render(); });
          yc.appendChild(c);
        })(yr);
      }
    }
  }

  function dayCell(day, out, monthIdx) {
    var c = document.createElement('button');
    c.type = 'button';
    c.className = 'dp__day' + (out ? ' is-out' : '');
    c.textContent = day;
    var y = dpYear, m = monthIdx;
    if (m < 0) { m = 11; y--; }
    else if (m > 11) { m = 0; y++; }
    if (!out && dpSel && dpSel.d === day && dpSel.m === m && dpSel.y === y) c.classList.add('is-sel');
    c.addEventListener('click', function () { commitDay(y, m, day); });
    return c;
  }

  function open(input, ctl, mode) {
    if (!dp) buildPicker();
    dpInput = input;
    dpMode = mode;
    dpView = mode === 'month' ? 'months' : 'days';
    if (dpSel) { dpYear = dpSel.y; dpMonth = dpSel.m; }
    else { dpYear = 2026; dpMonth = 2; }
    // each field keeps its own selection
    dpSel = input._dpSel || null;
    if (dpSel) { dpYear = dpSel.y; dpMonth = dpSel.m == null ? dpMonth : dpSel.m; }
    render();
    var r = ctl.getBoundingClientRect();
    dp.style.top = (r.bottom + window.scrollY + 6) + 'px';
    var w = mode === 'month' ? 280 : 300;
    dp.style.width = w + 'px';
    var left = r.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - w - 12;
    dp.style.left = Math.min(left, maxLeft) + 'px';
    dp.classList.add('is-open');
  }
  function close() {
    if (dpInput) dpInput._dpSel = dpSel;
    if (dp) dp.classList.remove('is-open');
  }

  function setupPickers() {
    document.querySelectorAll('[data-thr-pick]').forEach(function (ctl) {
      var input = ctl.querySelector('input');
      var mode = ctl.getAttribute('data-mode') || 'day';
      ctl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (dp && dp.classList.contains('is-open') && dpInput === input) { close(); return; }
        // restore this field's saved selection before opening
        dpSel = input._dpSel || null;
        open(input, ctl, mode);
      });
    });
    document.addEventListener('click', close);
    window.addEventListener('resize', close);
    var body = document.querySelectorAll('.pp-view[data-view="thr"] .pp-body');
    body.forEach(function (b) { b.addEventListener('scroll', close); });
  }

  /* ===================== FILTER ENGINE (scoped to THR scrim) ===================== */
  var FILTER_DEFS = [
    { key: 'branch',       title: 'Branch',            items: ['Head Office — Jakarta', 'Branch — Surabaya', 'Branch — Bandung', 'Branch — Medan', 'Branch — Bali', 'Branch — Makassar', 'Branch — Semarang'] },
    { key: 'organization', title: 'Organization',      items: ['Engineering', 'Human Resources', 'Finance', 'Marketing', 'Operations', 'Sales', 'Legal', 'Product'] },
    { key: 'position',     title: 'Job Position',      items: ['Software Engineer', 'HR Specialist', 'Accountant', 'Product Manager', 'Sales Executive', 'UI/UX Designer', 'QA Engineer', 'Data Analyst'] },
    { key: 'level',        title: 'Job Level',         items: ['Staff', 'Supervisor', 'Manager', 'Senior Manager', 'Director', 'Vice President', 'C-Level'] },
    { key: 'employment',   title: 'Employment Status', items: ['Permanent', 'Contract (PKWT)', 'Probation', 'Internship', 'Outsource', 'Freelance'] },
    { key: 'payroll',      title: 'Payroll Status',    items: ['Active', 'On Hold', 'Excluded', 'Already Processed'] },
    { key: 'schedule',     title: 'Payment Schedule',  items: ['Default (25th)', 'End of month', 'Custom date'] }
  ];
  function defByKey(k) { return FILTER_DEFS.filter(function (d) { return d.key === k; })[0]; }
  var addedKeys = [], activeKey = null, selections = {};

  function filterBlockHtml(def) {
    var chosen = selections[def.key] || [];
    var opts = def.items.map(function (it) {
      var on = chosen.indexOf(it) !== -1 ? ' checked' : '';
      return '<label class="check-red filter-opt"><input type="checkbox"' + on + '><span class="check-red__box"></span><span class="filter-opt__txt">' + esc(it) + '</span></label>';
    }).join('');
    return '' +
      '<div class="filter-block" data-key="' + def.key + '">' +
        '<div class="filter-block__head">' +
          '<span class="filter-block__title">' + esc(def.title) + '</span>' +
          '<button class="filter-block__remove" type="button" data-filter-remove aria-label="Remove filter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
          '<button class="filter-block__chev" type="button" data-filter-collapse aria-label="Collapse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></button>' +
        '</div>' +
        '<div class="filter-block__sub">is any of <span class="filter-block__selected" data-noun="' + esc(def.title) + '">…</span></div>' +
        '<div class="filter-block__body">' +
          '<div class="filter-search"><input type="text" placeholder="Search ' + esc(def.title.toLowerCase()) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></div>' +
          '<div class="filter-opts">' +
            '<label class="check-red filter-opt filter-opt--all"><input type="checkbox" data-filter-all><span class="check-red__box"></span><span class="filter-opt__txt">Select all</span></label>' +
            opts +
          '</div>' +
          '<div class="filter-noresult">No matching results</div>' +
        '</div>' +
      '</div>';
  }

  function updateSub(block) {
    var key = block.getAttribute('data-key');
    var checks = [].slice.call(block.querySelectorAll('.filter-opts input[type="checkbox"]:not([data-filter-all])'));
    var sel = checks.filter(function (c) { return c.checked; })
                    .map(function (c) { return c.closest('.filter-opt').querySelector('.filter-opt__txt').textContent; });
    selections[key] = sel;
    var span = block.querySelector('.filter-block__selected');
    if (!sel.length) { span.textContent = '…'; span.classList.remove('has-sel'); }
    else { span.textContent = sel.join(', '); span.classList.add('has-sel'); }
    var all = block.querySelector('[data-filter-all]');
    if (all) {
      all.checked = sel.length === checks.length && checks.length > 0;
      all.indeterminate = sel.length > 0 && sel.length < checks.length;
    }
  }

  function wireBlock(block) {
    var key = block.getAttribute('data-key');
    block.querySelector('[data-filter-remove]').addEventListener('click', function () {
      addedKeys = addedKeys.filter(function (x) { return x !== key; });
      selections[key] = [];
      if (activeKey === key) activeKey = addedKeys[addedKeys.length - 1] || null;
      if (!addedKeys.length) showFilterState('empty');
      else renderFilterList();
    });
    block.querySelector('[data-filter-collapse]').addEventListener('click', function () {
      var list = $('thrFilterList');
      var willOpen = block.classList.contains('is-collapsed');
      list.querySelectorAll('.filter-block').forEach(function (b) { b.classList.add('is-collapsed'); });
      if (willOpen) { block.classList.remove('is-collapsed'); activeKey = key; }
      else { activeKey = null; }
    });
    block.querySelectorAll('.filter-opts input[type="checkbox"]:not([data-filter-all])').forEach(function (c) {
      c.addEventListener('change', function () { updateSub(block); });
    });
    var all = block.querySelector('[data-filter-all]');
    if (all) all.addEventListener('change', function () {
      block.querySelectorAll('.filter-opts .filter-opt:not(.filter-opt--all)').forEach(function (opt) {
        if (opt.style.display === 'none') return;
        opt.querySelector('input[type="checkbox"]').checked = all.checked;
      });
      updateSub(block);
    });
    var search = block.querySelector('.filter-search input');
    var nores = block.querySelector('.filter-noresult');
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      var any = false;
      block.querySelectorAll('.filter-opts .filter-opt:not(.filter-opt--all)').forEach(function (opt) {
        var t = opt.querySelector('.filter-opt__txt').textContent.toLowerCase();
        var show = t.indexOf(q) !== -1;
        opt.style.display = show ? '' : 'none';
        if (show) any = true;
      });
      nores.style.display = any ? 'none' : 'block';
    });
    updateSub(block);
  }

  function renderFilterList() {
    var list = $('thrFilterList');
    if (!list) return;
    list.innerHTML = addedKeys.map(function (k) { return filterBlockHtml(defByKey(k)); }).join('');
    list.querySelectorAll('.filter-block').forEach(function (block) {
      wireBlock(block);
      if (activeKey && block.getAttribute('data-key') !== activeKey) block.classList.add('is-collapsed');
    });
  }

  function showFilterState(state) {
    var empty = $('thrFilterEmpty'), filled = $('thrFilterFilled'), reset = $('thrResetFilter');
    if (state === 'filled') {
      renderFilterList();
      empty.classList.add('is-hidden');
      filled.classList.remove('is-hidden');
      if (reset) reset.classList.remove('is-hidden');
    } else {
      empty.classList.remove('is-hidden');
      filled.classList.add('is-hidden');
      if (reset) reset.classList.add('is-hidden');
    }
  }

  /* LOV "Add Filter" popover */
  var lovMenu = null, lovAnchor = null;
  function ensureLov() {
    if (lovMenu) return lovMenu;
    lovMenu = document.createElement('div');
    lovMenu.className = 'lov-menu';
    lovMenu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.body.appendChild(lovMenu);
    return lovMenu;
  }
  function closeLov() { if (lovMenu) lovMenu.classList.remove('is-open'); lovAnchor = null; }
  function positionLov(btn) {
    var r = btn.getBoundingClientRect();
    var mh = lovMenu.offsetHeight, mw = lovMenu.offsetWidth;
    var spaceBelow = window.innerHeight - r.bottom;
    var top = (spaceBelow < mh + 16 && r.top > mh + 16) ? (r.top - mh - 8) : (r.bottom + 8);
    var left = Math.min(r.left, window.innerWidth - mw - 8);
    if (left < 8) left = 8;
    lovMenu.style.top = Math.max(8, top) + 'px';
    lovMenu.style.left = left + 'px';
  }
  function openLov(btn) {
    var menu = ensureLov();
    lovAnchor = btn;
    var avail = FILTER_DEFS.filter(function (d) { return addedKeys.indexOf(d.key) === -1; });
    if (!avail.length) {
      menu.innerHTML = '<div class="lov-menu__empty">All filters have been added</div>';
    } else {
      menu.innerHTML = '' +
        '<div class="lov-menu__search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input type="text" placeholder="Search filter"></div>' +
        '<div class="lov-menu__list">' +
          avail.map(function (d) { return '<button class="lov-menu__item" type="button" data-add="' + d.key + '">' + esc(d.title) + '</button>'; }).join('') +
          '<div class="lov-menu__noresult">No matching filter</div>' +
        '</div>';
      menu.querySelectorAll('[data-add]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-add');
          addedKeys.push(k); activeKey = k;
          closeLov(); showFilterState('filled');
        });
      });
      var s = menu.querySelector('.lov-menu__search input');
      var items = [].slice.call(menu.querySelectorAll('.lov-menu__item'));
      var nores = menu.querySelector('.lov-menu__noresult');
      s.addEventListener('input', function () {
        var q = s.value.trim().toLowerCase(); var any = false;
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

  function setupFilterEngine() {
    document.querySelectorAll('#thrAssignScrim .add-filter').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = lovMenu && lovMenu.classList.contains('is-open') && lovAnchor === btn;
        closeLov();
        if (!isOpen) openLov(btn);
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.lov-menu') && !e.target.closest('#thrAssignScrim .add-filter')) closeLov();
    });
    var scroller = $('thrFilterScroll');
    if (scroller) scroller.addEventListener('scroll', function () { if (lovAnchor) positionLov(lovAnchor); });
    window.addEventListener('resize', closeLov);
  }

  /* ===================== ASSIGN EMPLOYEE MODAL ===================== */
  function empRowHTML(e, assigned) {
    return '<div class="ae-emp' + (assigned ? ' ae-emp--assigned' : '') + '" data-id="' + e.id + '">' +
      '<span class="ae-emp__avatar">' + AVATAR + '</span>' +
      '<span class="ae-emp__meta"><span class="ae-emp__name">' + e.id + ' - ' + e.name + '</span><span class="ae-emp__sub">' + e.loc + '</span></span>' +
      '<span class="ae-emp__act">' + (assigned ? MINUS : PLUS) + '</span>' +
    '</div>';
  }

  function setupAssign() {
    var scrim = $('thrAssignScrim');
    if (!scrim) return;
    var empList = $('thrEmpList'), assignedList = $('thrAssignedList'), assignedCount = $('thrAssignedCount');
    var empSearch = $('thrEmpSearch'), assignedSearch = $('thrAssignedSearch');
    var selectAll = $('thrSelectAll');

    function render() {
      var q = (empSearch.value || '').toLowerCase();
      var aq = (assignedSearch.value || '').toLowerCase();
      var avail = EMPLOYEES.filter(function (e) { return !e.assigned && (e.id + ' ' + e.name).toLowerCase().indexOf(q) > -1; });
      var asg = EMPLOYEES.filter(function (e) { return e.assigned && (e.id + ' ' + e.name).toLowerCase().indexOf(aq) > -1; });
      empList.innerHTML = avail.length ? avail.map(function (e) { return empRowHTML(e, false); }).join('')
        : '<div class="ae-assign__empty">No employees to add.</div>';
      assignedList.innerHTML = asg.length ? asg.map(function (e) { return empRowHTML(e, true); }).join('')
        : '<div class="ae-assign__empty">No employees assigned yet.<br>Pick from the list on the left.</div>';
      assignedCount.textContent = EMPLOYEES.filter(function (e) { return e.assigned; }).length;
    }

    empList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-emp'); if (!row) return;
      var emp = EMPLOYEES.find(function (x) { return x.id === row.getAttribute('data-id'); });
      if (emp) { emp.assigned = true; render(); }
    });
    assignedList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-emp'); if (!row) return;
      var emp = EMPLOYEES.find(function (x) { return x.id === row.getAttribute('data-id'); });
      if (emp) { emp.assigned = false; render(); }
    });
    empSearch.addEventListener('input', render);
    assignedSearch.addEventListener('input', render);
    $('thrAddAll').addEventListener('click', function () { EMPLOYEES.forEach(function (e) { e.assigned = true; }); render(); });
    $('thrClearSelection').addEventListener('click', function () { EMPLOYEES.forEach(function (e) { e.assigned = false; }); render(); });

    /* Filter sub-view */
    var panes = scrim.querySelectorAll('.ae-assign__pane');
    function showPane(name) {
      panes.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-pane') === name); });
    }
    $('thrOpenFilter').addEventListener('click', function () {
      showFilterState(addedKeys.length ? 'filled' : 'empty');
      showPane('filter');
    });
    $('thrBackToList').addEventListener('click', function () { closeLov(); showPane('list'); });
    $('thrApplyFilter').addEventListener('click', function () { closeLov(); showPane('list'); });
    $('thrResetFilter').addEventListener('click', function () {
      addedKeys = []; activeKey = null; selections = {}; showFilterState('empty');
    });

    function open() { render(); showPane('list'); scrim.classList.add('is-open'); scrim.setAttribute('aria-hidden', 'false'); }
    function close() { scrim.classList.remove('is-open'); scrim.setAttribute('aria-hidden', 'true'); }

    function updateNote() {
      var total = EMPLOYEES.filter(function (e) { return e.assigned; }).length;
      var note = $('thrSelNote'), count = $('thrSelCount'), err = $('thrSelError');
      if (total > 0) {
        count.textContent = total;
        note.classList.remove('is-hidden');
        if (err) err.classList.add('is-hidden');
      } else {
        note.classList.add('is-hidden');
      }
      if (selectAll) selectAll.checked = total === EMPLOYEES.length;
    }

    var selectBtn = $('thrSelectEmployee');
    if (selectBtn) selectBtn.addEventListener('click', open);
    var viewBtn = $('thrViewSelected');
    if (viewBtn) viewBtn.addEventListener('click', function (e) { e.preventDefault(); open(); });

    scrim.querySelectorAll('[data-thr-close-assign]').forEach(function (b) { b.addEventListener('click', close); });
    $('thrAssignSubmit').addEventListener('click', function () { updateNote(); close(); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('is-open')) close();
    });

    if (selectAll) selectAll.addEventListener('change', function () {
      EMPLOYEES.forEach(function (e) { e.assigned = selectAll.checked; });
      updateNote();
    });

    THR._updateNote = updateNote;
  }

  /* ===================== STEPPER + REVIEW ===================== */
  function thrEmpCount() {
    var n = selected().length;
    document.querySelectorAll('[data-thr-empcount]').forEach(function (el) {
      el.textContent = n + (n === 1 ? ' employee' : ' employees');
    });
    return n;
  }

  function setStep(n) {
    document.querySelectorAll('.pp-view[data-view="thr"] .pp-step').forEach(function (s) {
      s.classList.toggle('is-hidden', s.getAttribute('data-step-view') !== String(n));
    });
    [1, 2, 3].forEach(function (i) {
      var st = document.querySelector('#thrStepper .step[data-step="' + i + '"]');
      if (!st) return;
      st.classList.remove('is-done', 'is-current');
      if (i < n) st.classList.add('is-done');
      else if (i === n) st.classList.add('is-current');
    });
    var foot = $('thrShellFoot');
    if (foot) foot.classList.toggle('is-hidden', n !== 3);
    var main = document.querySelector('.app__main');
    if (main) main.scrollTop = 0;
  }

  function empCellHTML(e) {
    return '<div class="pp-emp"><span class="pp-emp__avatar">' + AVATAR + '</span>' +
      '<span class="pp-emp__meta"><span class="pp-emp__name">' + e.id + ' - ' + e.name + '</span>' +
      '<span class="pp-emp__sub">' + e.loc + '</span></span></div>';
  }

  function renderReview() {
    var rows = selected();
    var body = $('thrReviewBody');
    if (body) {
      body.innerHTML = rows.map(function (e, i) {
        return '<tr>' +
          '<td class="pp-table__emp">' + empCellHTML(e) + '</td>' +
          '<td><span class="pp-placeholder">[Total Allowance]</span></td>' +
          '<td>' + SERVICE[i % SERVICE.length] + '</td>' +
          '<td><div class="thr-money"><span class="thr-money__cur">IDR</span><input type="text" inputmode="numeric" value="0"></div></td>' +
          '<td>' + RELIGIONS[i % RELIGIONS.length] + '</td>' +
        '</tr>';
      }).join('');
    }
    thrEmpCount();
  }

  /* ===================== PROGRESS RING ===================== */
  var timer = null;
  function showSub(name) {
    document.querySelectorAll('.pp-step[data-step-view="3"] [data-thr-sub]').forEach(function (el) {
      el.classList.toggle('is-hidden', el.getAttribute('data-thr-sub') !== name);
    });
  }
  function runProgress(done) {
    var total = selected().length;
    var fill = document.querySelector('.pp-step[data-step-view="3"] .pp-ring__fill');
    var pct = $('thrPct'), title = $('thrProgTitle');
    var CIRC = 691.15, p = 0;
    showSub('progress');
    if (fill) fill.style.strokeDashoffset = String(CIRC);
    if (pct) pct.textContent = '0%';
    if (title) title.textContent = 'Processing your THR (0/' + total + ' employee)';
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      p += 4; if (p > 100) p = 100;
      if (pct) pct.textContent = p + '%';
      if (fill) fill.style.strokeDashoffset = String(CIRC * (1 - p / 100));
      var procDone = Math.round((p / 100) * total);
      if (title) title.textContent = 'Processing your THR (' + procDone + '/' + total + ' employee)';
      if (p >= 100) { clearInterval(timer); timer = null; setTimeout(function () { if (done) done(); }, 600); }
    }, 90);
  }
  function goSummary() {
    if (timer) { clearInterval(timer); timer = null; }
    showSub('summary');
    if (window.lucide) window.lucide.createIcons();
  }

  /* ===================== PUBLIC + WIRING ===================== */
  var THR = {
    refreshSummary: function () {
      var pay = ($('thrPaymentDate') || {}).value || '—';
      var thrd = ($('thrDate') || {}).value || '—';
      var tax = ($('thrTaxPeriod') || {}).value || '—';
      document.querySelectorAll('[data-thr-sum="payment"]').forEach(function (el) { el.textContent = pay; });
      document.querySelectorAll('[data-thr-sum="thrdate"]').forEach(function (el) { el.textContent = thrd; });
      document.querySelectorAll('[data-thr-sum="tax"]').forEach(function (el) { el.textContent = tax; });
    }
  };

  /* ===================== THR CHECKLIST MODAL ===================== */
  var THR_SKIP_KEY = 'thr_skip_checklist';
  function setupChecklist() {
    var scrim = $('thrChecklistScrim');
    if (!scrim) return;
    var dontShow = $('thrDontShowChecklist');

    function open() {
      scrim.classList.add('is-open');
      scrim.setAttribute('aria-hidden', 'false');
      if (window.lucide) window.lucide.createIcons();
    }
    function close() {
      if (dontShow && dontShow.checked) {
        try { localStorage.setItem(THR_SKIP_KEY, 'true'); } catch (e) {}
      }
      scrim.classList.remove('is-open');
      scrim.setAttribute('aria-hidden', 'true');
    }

    scrim.querySelectorAll('[data-thr-close-checklist]').forEach(function (b) { b.addEventListener('click', close); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('is-open')) close();
    });

    // "here" link on the setup screen reopens the checklist
    var link = $('thrOpenChecklist');
    if (link) link.addEventListener('click', function (e) { e.preventDefault(); open(); });

    // Reflect saved preference
    var skip = false;
    try { skip = localStorage.getItem(THR_SKIP_KEY) === 'true'; } catch (e) {}
    if (dontShow) dontShow.checked = skip;

    // Auto-open the first time the user enters the Run THR tab (unless skipped)
    var thrPill = document.querySelector('.pp-tabs .tab-pill[data-tab="thr"]');
    if (thrPill) thrPill.addEventListener('click', function () {
      var s = false;
      try { s = localStorage.getItem(THR_SKIP_KEY) === 'true'; } catch (e) {}
      if (!s) setTimeout(open, 0);
    });

    // If THR is already the active view on load, surface it
    var thrView = document.querySelector('.pp-view[data-view="thr"]');
    if (thrView && !thrView.classList.contains('is-hidden') && !skip) open();
  }

  function setup() {
    setupPickers();
    setupAssign();
    setupFilterEngine();
    setupChecklist();

    var cancel = $('thrCancel');
    if (cancel) cancel.addEventListener('click', function () { window.location.href = 'index.html'; });

    var next = $('thrNext');
    if (next) next.addEventListener('click', function () {
      if (selected().length === 0) {
        var err = $('thrSelError');
        if (err) err.classList.remove('is-hidden');
        var btn = $('thrSelectEmployee'); if (btn) btn.focus();
        return;
      }
      var err = $('thrSelError'); if (err) err.classList.add('is-hidden');
      THR.refreshSummary();
      renderReview();
      setStep(2);
      if (window.lucide) window.lucide.createIcons();
    });

    var back = $('thrBack');
    if (back) back.addEventListener('click', function () { setStep(1); });

    // Continue modal → progress → summary
    var scrim = $('thrContinueScrim');
    if (scrim) {
      var openC = function () { scrim.classList.add('is-open'); scrim.setAttribute('aria-hidden', 'false'); };
      var closeC = function () { scrim.classList.remove('is-open'); scrim.setAttribute('aria-hidden', 'true'); };
      var runBtn = $('thrRunBtn');
      if (runBtn) runBtn.addEventListener('click', openC);
      scrim.querySelectorAll('[data-thr-close-continue]').forEach(function (b) { b.addEventListener('click', closeC); });
      scrim.addEventListener('click', function (e) { if (e.target === scrim) closeC(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && scrim.classList.contains('is-open')) closeC();
      });
      var run = $('thrContinueRun');
      if (run) run.addEventListener('click', function () {
        closeC();
        THR.refreshSummary();
        setStep(3);
        runProgress(goSummary);
      });
    }

    var min = $('thrMinimize');
    if (min) min.addEventListener('click', goSummary);
    var goP = $('thrGoPayroll');
    if (goP) goP.addEventListener('click', function () { window.location.href = 'index.html'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
  else setup();
})();
