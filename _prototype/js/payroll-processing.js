// payroll-processing.js — Run Payroll (Step 1) + Payroll Checklist modal.
// Runs AFTER shell.js (renders sidebar/topnav) and dashboard.js (sidebar wiring).
(function () {
  'use strict';

  var SKIP_KEY = 'pp_skip_checklist';

  /* ---------- Sidebar: expand + open Payroll group + mark active ---------- */
  function activateSidebar() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.add('is-expanded');

    var group = sidebar.querySelector('.sidebar__group[data-group="payroll"]');
    if (group) {
      // accordion: close siblings, open Payroll
      sidebar.querySelectorAll('.sidebar__group.is-open').forEach(function (g) { g.classList.remove('is-open'); });
      group.classList.add('is-open');

      // mark the "Payroll processing" submenu item active
      group.querySelectorAll('.sidebar__submenu-item').forEach(function (item) {
        if (item.textContent.trim().toLowerCase() === 'payroll processing') {
          item.classList.add('is-on');
        }
      });
    }
  }

  /* ---------- Checklist modal ---------- */
  function setupChecklist() {
    var scrim = document.getElementById('checklistScrim');
    if (!scrim) return;
    var dontShow = document.getElementById('dontShowChecklist');

    function isSkipped() {
      try { return localStorage.getItem(SKIP_KEY) === 'true'; } catch (e) { return false; }
    }
    function setSkipped(v) {
      try {
        if (v) localStorage.setItem(SKIP_KEY, 'true');
        else localStorage.setItem(SKIP_KEY, 'false');
      } catch (e) {}
    }

    function open() {
      // Always reflect the *current* saved preference when opening, so the
      // checkbox never carries a stale state between openings.
      if (dontShow) dontShow.checked = isSkipped();
      scrim.classList.add('is-open');
      scrim.setAttribute('aria-hidden', 'false');
      if (window.lucide) window.lucide.createIcons();
    }
    function close() {
      scrim.classList.remove('is-open');
      scrim.setAttribute('aria-hidden', 'true');
    }

    // Persist ONLY when the user actively toggles the checkbox — so the
    // checklist keeps appearing every time until they explicitly opt out
    // (and reappears again if they untick it).
    if (dontShow) {
      dontShow.addEventListener('change', function () {
        setSkipped(dontShow.checked);
      });
    }

    // Close affordances
    scrim.querySelectorAll('[data-close-checklist]').forEach(function (b) {
      b.addEventListener('click', close);
    });
    // Run Payroll → close modal, land on the Run Payroll setup screen
    var runBtn = document.getElementById('runPayrollBtn');
    if (runBtn) runBtn.addEventListener('click', close);
    // Click on scrim backdrop closes
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    // Esc closes
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('is-open')) close();
    });

    // The "here" link in the setup screen reopens the checklist
    var reopen = document.getElementById('openChecklist');
    if (reopen) reopen.addEventListener('click', function (e) { e.preventDefault(); open(); });

    // Reflect the saved "don't show again" preference in the checkbox.
    if (dontShow) dontShow.checked = isSkipped();

    // Expose an opener for the tab controller (fires when entering Run Payroll).
    window.PP = window.PP || {};
    window.PP.openChecklist = function () {
      if (!isSkipped()) open();
    };

    // Only auto-open on load if Run Payroll is the active view (History is default).
    var runView = document.querySelector('.pp-view[data-view="run"]');
    if (runView && !runView.classList.contains('is-hidden') && !isSkipped()) open();
  }

  /* ---------- Generic select dropdowns ---------- */
  function setupSelects() {
    document.querySelectorAll('[data-select]').forEach(function (sel) {
      var valueEl = sel.querySelector('.ctl__value');
      sel.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = !sel.classList.contains('is-open');
        document.querySelectorAll('.ctl--select.is-open').forEach(function (s) { s.classList.remove('is-open'); });
        if (willOpen) sel.classList.add('is-open');
      });
      sel.querySelectorAll('.dropdown__opt').forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          sel.querySelectorAll('.dropdown__opt.is-sel').forEach(function (o) { o.classList.remove('is-sel'); });
          opt.classList.add('is-sel');
          if (valueEl) { valueEl.textContent = opt.textContent; valueEl.classList.add('has-value'); }
          sel.classList.remove('is-open');
        });
      });
    });
    document.addEventListener('click', function () {
      document.querySelectorAll('.ctl--select.is-open').forEach(function (s) { s.classList.remove('is-open'); });
    });
  }

  /* ---------- Custom date for BPJS reveal ---------- */
  function setupBpjsReveal() {
    var cb = document.getElementById('customBpjs');
    var field = document.getElementById('bpjsDateField');
    if (!cb || !field) return;
    cb.addEventListener('change', function () {
      field.classList.toggle('is-hidden', !cb.checked);
    });
  }

  /* ---------- Month-year picker (Payroll period, BPJS date) ---------- */
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var mp = null, mpInput = null, mpYear = 2026, mpMonth = 2, mpMode = 'months'; // mpMonth 0-11

  function parseMonth(str) {
    var m = /^([A-Za-z]{3})\s+(\d{4})$/.exec((str || '').trim());
    if (!m) return null;
    var idx = MONTHS_SHORT.indexOf(m[1].slice(0, 3));
    if (idx < 0) return null;
    return { month: idx, year: +m[2] };
  }

  function buildMonthPicker() {
    mp = document.createElement('div');
    mp.className = 'dp is-months';
    mp.style.width = '280px';
    mp.innerHTML =
      '<div class="dp__head">' +
        '<button class="dp__nav" type="button" data-mp="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<button class="dp__title" type="button" data-mp="title"></button>' +
        '<button class="dp__nav" type="button" data-mp="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</div>' +
      '<div class="dp__view dp__view--months"><div class="dp__cells" data-mp="months"></div></div>' +
      '<div class="dp__view dp__view--years"><div class="dp__cells" data-mp="years"></div></div>';
    document.body.appendChild(mp);

    mp.addEventListener('click', function (e) { e.stopPropagation(); });
    mp.querySelector('[data-mp="prev"]').addEventListener('click', function () { mpStep(-1); });
    mp.querySelector('[data-mp="next"]').addEventListener('click', function () { mpStep(1); });
    mp.querySelector('[data-mp="title"]').addEventListener('click', function () {
      mpMode = mpMode === 'months' ? 'years' : 'months';
      renderMonthPicker();
    });
  }

  function mpStep(dir) {
    if (mpMode === 'months') mpYear += dir;
    else mpYear += dir * 12;
    renderMonthPicker();
  }

  function commitMonth(month, year) {
    if (mpInput) mpInput.value = MONTHS_SHORT[month] + ' ' + year;
    closeMonthPicker();
  }

  function renderMonthPicker() {
    mp.classList.remove('is-months', 'is-years');
    mp.classList.add('is-' + mpMode);
    var title = mp.querySelector('[data-mp="title"]');

    if (mpMode === 'months') {
      title.textContent = mpYear;
      var mc = mp.querySelector('[data-mp="months"]');
      mc.innerHTML = '';
      MONTHS_SHORT.forEach(function (name, idx) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'dp__cell';
        c.textContent = name;
        if (idx === mpMonth && mpYear === mpSelYear) c.classList.add('is-sel');
        c.addEventListener('click', function () { commitMonth(idx, mpYear); });
        mc.appendChild(c);
      });
    } else {
      var yStart = mpYear - (mpYear % 12);
      title.textContent = yStart + ' - ' + (yStart + 11);
      var yc = mp.querySelector('[data-mp="years"]');
      yc.innerHTML = '';
      for (var yr = yStart; yr < yStart + 12; yr++) {
        (function (year) {
          var c = document.createElement('button');
          c.type = 'button';
          c.className = 'dp__cell';
          c.textContent = year;
          if (year === mpSelYear) c.classList.add('is-sel');
          c.addEventListener('click', function () { mpYear = year; mpMode = 'months'; renderMonthPicker(); });
          yc.appendChild(c);
        })(yr);
      }
    }
  }

  var mpSelYear = 2026;
  function openMonthPicker(input, ctl) {
    if (!mp) buildMonthPicker();
    mpInput = input;
    var cur = parseMonth(input.value);
    mpMonth = cur ? cur.month : 2;
    mpYear = cur ? cur.year : 2026;
    mpSelYear = mpYear;
    mpMode = 'months';
    renderMonthPicker();
    var r = ctl.getBoundingClientRect();
    mp.style.top = (r.bottom + window.scrollY + 6) + 'px';
    var left = r.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - 280 - 12;
    mp.style.left = Math.min(left, maxLeft) + 'px';
    mp.classList.add('is-open');
  }
  function closeMonthPicker() { if (mp) mp.classList.remove('is-open'); }

  function setupMonthPickers() {
    document.querySelectorAll('input[data-month]').forEach(function (input) {
      var ctl = input.closest('.ctl');
      if (!ctl) return;
      ctl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (mp && mp.classList.contains('is-open') && mpInput === input) { closeMonthPicker(); return; }
        openMonthPicker(input, ctl);
      });
    });
    document.addEventListener('click', closeMonthPicker);
    var body = document.querySelector('.pp-body');
    if (body) body.addEventListener('scroll', closeMonthPicker);
    window.addEventListener('resize', closeMonthPicker);
  }

  /* ===================== ALL FILTER (ported from employee-directory) =====================
     Each filter field is a List-of-Values (LOV). Picking one from the "Add Filter"
     menu adds a filter block; each block has a searchable, scrollable checkbox list. */
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
  var addedKeys = [];   // ordered list of filter keys currently shown
  var activeKey = null; // only one block stays expanded at a time (accordion)
  var selections = {};  // key -> [selected value strings]

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

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
          '<button class="filter-block__remove" type="button" data-filter-remove aria-label="Remove filter">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
          '<button class="filter-block__chev" type="button" data-filter-collapse aria-label="Collapse">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="filter-block__sub">is any of <span class="filter-block__selected" data-noun="' + esc(def.title) + '">…</span></div>' +
        '<div class="filter-block__body">' +
          '<div class="filter-search">' +
            '<input type="text" placeholder="Search ' + esc(def.title.toLowerCase()) + '">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '</div>' +
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
      var list = document.getElementById('filterList');
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
    var list = document.getElementById('filterList');
    if (!list) return;
    list.innerHTML = addedKeys.map(function (k) { return filterBlockHtml(defByKey(k)); }).join('');
    list.querySelectorAll('.filter-block').forEach(function (block) {
      wireBlock(block);
      if (activeKey && block.getAttribute('data-key') !== activeKey) block.classList.add('is-collapsed');
    });
  }

  function showFilterState(state) {
    var empty = document.getElementById('ppFilterEmpty');
    var filled = document.getElementById('ppFilterFilled');
    var reset = document.getElementById('resetFilter');
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

  /* ----- "Add Filter" LOV menu (single body-level popover, never clipped) ----- */
  var lovMenu = null, lovAnchor = null;
  function ensureLovMenu() {
    if (lovMenu) return lovMenu;
    lovMenu = document.createElement('div');
    lovMenu.className = 'lov-menu';
    lovMenu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.body.appendChild(lovMenu);
    return lovMenu;
  }
  function closeAllLov() { if (lovMenu) lovMenu.classList.remove('is-open'); lovAnchor = null; }
  function positionLov(btn) {
    var menu = lovMenu;
    var r = btn.getBoundingClientRect();
    var mh = menu.offsetHeight, mw = menu.offsetWidth;
    var spaceBelow = window.innerHeight - r.bottom;
    var top = (spaceBelow < mh + 16 && r.top > mh + 16) ? (r.top - mh - 8) : (r.bottom + 8);
    var left = Math.min(r.left, window.innerWidth - mw - 8);
    if (left < 8) left = 8;
    menu.style.top = Math.max(8, top) + 'px';
    menu.style.left = left + 'px';
  }
  function openLov(btn) {
    var menu = ensureLovMenu();
    lovAnchor = btn;
    var avail = FILTER_DEFS.filter(function (d) { return addedKeys.indexOf(d.key) === -1; });
    if (!avail.length) {
      menu.innerHTML = '<div class="lov-menu__empty">All filters have been added</div>';
    } else {
      menu.innerHTML = '' +
        '<div class="lov-menu__search">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="text" placeholder="Search filter">' +
        '</div>' +
        '<div class="lov-menu__list">' +
          avail.map(function (d) { return '<button class="lov-menu__item" type="button" data-add="' + d.key + '">' + esc(d.title) + '</button>'; }).join('') +
          '<div class="lov-menu__noresult">No matching filter</div>' +
        '</div>';
      menu.querySelectorAll('[data-add]').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-add');
          addedKeys.push(k);
          activeKey = k;
          closeAllLov();
          showFilterState('filled');
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

  function setupFilterEngine() {
    document.querySelectorAll('#assignScrim .add-filter').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = lovMenu && lovMenu.classList.contains('is-open') && lovAnchor === btn;
        closeAllLov();
        if (!isOpen) openLov(btn);
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.lov-menu') && !e.target.closest('.add-filter')) closeAllLov();
    });
    var scroller = document.getElementById('filterScroll');
    if (scroller) scroller.addEventListener('scroll', function () { if (lovAnchor) positionLov(lovAnchor); });
    window.addEventListener('resize', closeAllLov);
  }

  /* ---------- Assign Employee modal ---------- */
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
  var AVATAR = '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="18" r="8" fill="#fff" opacity="0.92"/><path d="M10 42c1.5-9 7.5-13 14-13s12.5 4 14 13z" fill="#fff" opacity="0.92"/></svg>';
  var PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>';
  var MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>';

  function empRowHTML(e, assigned) {
    return '<div class="ae-emp' + (assigned ? ' ae-emp--assigned' : '') + '" data-id="' + e.id + '">' +
      '<span class="ae-emp__avatar">' + AVATAR + '</span>' +
      '<span class="ae-emp__meta">' +
        '<span class="ae-emp__name">' + e.id + ' - ' + e.name + '</span>' +
        '<span class="ae-emp__sub">' + e.loc + '</span>' +
      '</span>' +
      '<span class="ae-emp__act">' + (assigned ? MINUS : PLUS) + '</span>' +
    '</div>';
  }

  function setupAssign() {
    var scrim = document.getElementById('assignScrim');
    if (!scrim) return;
    var empList = document.getElementById('empList');
    var assignedList = document.getElementById('assignedList');
    var assignedCount = document.getElementById('assignedCount');
    var empSearch = document.getElementById('empSearch');
    var assignedSearch = document.getElementById('assignedSearch');
    var selNote = document.getElementById('selNote');
    var selCount = document.getElementById('selCount');
    var selectAll = document.getElementById('selectAll');

    function render() {
      var q = (empSearch.value || '').toLowerCase();
      var aq = (assignedSearch.value || '').toLowerCase();
      var avail = EMPLOYEES.filter(function (e) { return !e.assigned && (e.id + ' ' + e.name).toLowerCase().indexOf(q) > -1; });
      var asg = EMPLOYEES.filter(function (e) { return e.assigned && (e.id + ' ' + e.name).toLowerCase().indexOf(aq) > -1; });

      empList.innerHTML = avail.length ? avail.map(function (e) { return empRowHTML(e, false); }).join('')
        : '<div class="ae-assign__empty">No employees to add.</div>';
      assignedList.innerHTML = asg.length ? asg.map(function (e) { return empRowHTML(e, true); }).join('')
        : '<div class="ae-assign__empty">No employees assigned yet.<br>Pick from the list on the left.</div>';

      var total = EMPLOYEES.filter(function (e) { return e.assigned; }).length;
      assignedCount.textContent = total;
    }

    // Transfer on click
    empList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-emp');
      if (!row) return;
      var emp = EMPLOYEES.find(function (x) { return x.id === row.getAttribute('data-id'); });
      if (emp) { emp.assigned = true; render(); }
    });
    assignedList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-emp');
      if (!row) return;
      var emp = EMPLOYEES.find(function (x) { return x.id === row.getAttribute('data-id'); });
      if (emp) { emp.assigned = false; render(); }
    });

    empSearch.addEventListener('input', render);
    assignedSearch.addEventListener('input', render);

    document.getElementById('addAll').addEventListener('click', function () {
      EMPLOYEES.forEach(function (e) { e.assigned = true; }); render();
    });
    document.getElementById('clearSelection').addEventListener('click', function () {
      EMPLOYEES.forEach(function (e) { e.assigned = false; }); render();
    });

    /* ----- Filter sub-view (ported from employee-directory's canonical filter) ----- */
    var panes = scrim.querySelectorAll('.ae-assign__pane');
    function showPane(name) {
      panes.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-pane') === name); });
    }

    document.getElementById('openFilter').addEventListener('click', function () {
      showFilterState(addedKeys.length ? 'filled' : 'empty');
      showPane('filter');
    });
    document.getElementById('backToList').addEventListener('click', function () { closeAllLov(); showPane('list'); });
    document.getElementById('applyFilter').addEventListener('click', function () { closeAllLov(); showPane('list'); });
    document.getElementById('resetFilter').addEventListener('click', function () {
      addedKeys = []; activeKey = null; selections = {}; showFilterState('empty');
    });

    /* ----- Open / close / submit ----- */
    function open() {
      render();
      showPane('list');
      scrim.classList.add('is-open');
      scrim.setAttribute('aria-hidden', 'false');
    }
    function close() {
      scrim.classList.remove('is-open');
      scrim.setAttribute('aria-hidden', 'true');
    }
    function updateNote() {
      var total = EMPLOYEES.filter(function (e) { return e.assigned; }).length;
      if (total > 0) {
        selCount.textContent = total;
        selNote.classList.remove('is-hidden');
        var selError = document.getElementById('selError');
        if (selError) selError.classList.add('is-hidden');
      } else {
        selNote.classList.add('is-hidden');
      }
      // keep "Select all" checkbox in sync
      if (selectAll) selectAll.checked = total === EMPLOYEES.length;
    }

    var selectBtn = document.getElementById('selectEmployee');
    if (selectBtn) selectBtn.addEventListener('click', open);
    var viewBtn = document.getElementById('viewSelected');
    if (viewBtn) viewBtn.addEventListener('click', function (e) { e.preventDefault(); open(); });

    scrim.querySelectorAll('[data-close-assign]').forEach(function (b) { b.addEventListener('click', close); });
    document.getElementById('assignSubmit').addEventListener('click', function () { updateNote(); close(); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && scrim.classList.contains('is-open')) close();
    });

    // "Select all employees" checkbox on the setup screen
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        EMPLOYEES.forEach(function (e) { e.assigned = selectAll.checked; });
        updateNote();
      });
    }
  }

  /* ---------- Footer / misc ---------- */
  function setupActions() {
    var cancel = document.getElementById('ppCancel');
    if (cancel) cancel.addEventListener('click', function () { window.location.href = 'index.html'; });
  }

  /* ===================== STEP 2 — REVIEW ===================== */
  function getSelectedEmployees() {
    return EMPLOYEES.filter(function (e) { return e.assigned; });
  }

  function updateEmpCounts() {
    var n = getSelectedEmployees().length;
    document.querySelectorAll('[data-emp-count]').forEach(function (el) {
      el.textContent = n + (n === 1 ? ' employee' : ' employees');
    });
  }

  function empCellHTML(e) {
    return '<div class="pp-emp">' +
      '<span class="pp-emp__avatar">' + AVATAR + '</span>' +
      '<span class="pp-emp__meta">' +
        '<span class="pp-emp__name">' + e.id + ' - ' + e.name + '</span>' +
        '<span class="pp-emp__sub">' + e.loc + '</span>' +
      '</span>' +
    '</div>';
  }

  function renderReviewTables() {
    var rows = getSelectedEmployees();
    var ovBody = document.getElementById('overviewBody');
    var dtBody = document.getElementById('detailBody');
    if (ovBody) {
      ovBody.innerHTML = rows.map(function (e, i) {
        return '<tr>' +
          '<td class="pp-table__emp">' + empCellHTML(e) + '</td>' +
          '<td><span class="pp-placeholder">[Basic Salary]</span></td>' +
          '<td><span class="pp-placeholder">[Allowance]</span></td>' +
          '<td><span class="pp-placeholder">[Additional Earnings]</span></td>' +
          '<td><span class="pp-placeholder">[Deduction]</span></td>' +
          '<td><span class="pp-placeholder">[Benefit]</span></td>' +
          '<td><span class="pp-placeholder">[Total]</span></td>' +
          '<td class="pp-cell-act pp-table__act"><button class="pp-edit-btn" type="button" data-edit="' + i + '">Edit</button></td>' +
        '</tr>';
      }).join('');
    }
    if (dtBody) {
      dtBody.innerHTML = rows.map(function (e) {
        return '<tr>' +
          '<td class="pp-table__emp">' + empCellHTML(e) + '</td>' +
          '<td><span class="pp-placeholder">[Basic Salary]</span></td>' +
          '<td><span class="pp-placeholder">[Allowance]</span></td>' +
          '<td><span class="pp-placeholder">[Additional Earnings]</span></td>' +
          '<td><span class="pp-placeholder">[Total]</span></td>' +
        '</tr>';
      }).join('');
    }
    updateEmpCounts();
  }

  function setStep(n) {
    document.querySelectorAll('.pp-step').forEach(function (s) {
      s.classList.toggle('is-hidden', s.getAttribute('data-step-view') !== String(n));
    });
    [1, 2, 3].forEach(function (i) {
      var st = document.querySelector('.step[data-step="' + i + '"]');
      if (!st) return;
      st.classList.remove('is-done', 'is-current');
      if (i < n) st.classList.add('is-done');
      else if (i === n) st.classList.add('is-current');
    });
    var ext = document.getElementById('ppShellFoot');
    if (ext) ext.classList.toggle('is-hidden', n !== 3);
    var main = document.querySelector('.app__main');
    if (main) main.scrollTop = 0;
  }

  /* ---------- Step 3: progress ring + summary ---------- */
  var progressTimer = null;

  function showSub(name) {
    document.querySelectorAll('.pp-step[data-step-view="3"] [data-sub]').forEach(function (el) {
      el.classList.toggle('is-hidden', el.getAttribute('data-sub') !== name);
    });
  }

  function resetProgress() {
    var total = getSelectedEmployees().length;
    var fill = document.querySelector('.pp-ring__fill');
    var pct = document.getElementById('ppPct');
    var title = document.getElementById('ppProgTitle');
    if (fill) fill.style.strokeDashoffset = '691.15';
    if (pct) pct.textContent = '0%';
    if (title) title.textContent = 'Processing your payroll (0/' + total + ' employee)';
  }

  function runProgress(done) {
    var total = getSelectedEmployees().length;
    resetProgress();
    showSub('progress');
    var fill = document.querySelector('.pp-ring__fill');
    var pct = document.getElementById('ppPct');
    var title = document.getElementById('ppProgTitle');
    var CIRC = 691.15;
    var p = 0;
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = setInterval(function () {
      p += 4;
      if (p > 100) p = 100;
      if (pct) pct.textContent = p + '%';
      if (fill) fill.style.strokeDashoffset = String(CIRC * (1 - p / 100));
      var procDone = Math.round((p / 100) * total);
      if (title) title.textContent = 'Processing your payroll (' + procDone + '/' + total + ' employee)';
      if (p >= 100) {
        clearInterval(progressTimer);
        progressTimer = null;
        setTimeout(function () { if (done) done(); }, 600);
      }
    }, 90);
  }

  function goSummary() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    showSub('summary');
    if (window.lucide) window.lucide.createIcons();
  }

  function setupReview() {
    renderReviewTables();
    if (window.lucide) window.lucide.createIcons();

    // Step navigation
    var next = document.getElementById('ppNext');
    var selError = document.getElementById('selError');
    if (next) next.addEventListener('click', function () {
      if (getSelectedEmployees().length === 0) {
        if (selError) selError.classList.remove('is-hidden');
        var btn = document.getElementById('selectEmployee');
        if (btn) btn.focus();
        return;
      }
      if (selError) selError.classList.add('is-hidden');
      renderReviewTables();
      setStep(2);
    });
    var back = document.getElementById('ppBack');
    if (back) back.addEventListener('click', function () { setStep(1); });

    // Overview / Detail toggle
    var seg = document.querySelector('.pp-seg');
    if (seg) {
      seg.querySelectorAll('.pp-seg__btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          seg.querySelectorAll('.pp-seg__btn').forEach(function (b) { b.classList.remove('is-on'); });
          btn.classList.add('is-on');
          var which = btn.getAttribute('data-table');
          document.querySelectorAll('.pp-tableview').forEach(function (v) {
            v.classList.toggle('is-active', v.getAttribute('data-tableview') === which);
          });
        });
      });
    }

    // ----- Reset This Period modal -----
    var resetScrim = document.getElementById('resetScrim');
    if (resetScrim) {
      var openReset = function () { resetScrim.classList.add('is-open'); resetScrim.setAttribute('aria-hidden', 'false'); };
      var closeReset = function () { resetScrim.classList.remove('is-open'); resetScrim.setAttribute('aria-hidden', 'true'); };
      var resetBtn = document.getElementById('resetPeriod');
      if (resetBtn) resetBtn.addEventListener('click', openReset);
      resetScrim.querySelectorAll('[data-close-reset]').forEach(function (b) { b.addEventListener('click', closeReset); });
      var resetConfirm = document.getElementById('resetConfirm');
      if (resetConfirm) resetConfirm.addEventListener('click', closeReset);
      resetScrim.addEventListener('click', function (e) { if (e.target === resetScrim) closeReset(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && resetScrim.classList.contains('is-open')) closeReset();
      });
    }

    // ----- Edit Component modal -----
    var editScrim = document.getElementById('editScrim');
    if (editScrim) {
      var openEdit = function () { editScrim.classList.add('is-open'); editScrim.setAttribute('aria-hidden', 'false'); if (window.lucide) window.lucide.createIcons(); };
      var closeEdit = function () { editScrim.classList.remove('is-open'); editScrim.setAttribute('aria-hidden', 'true'); };
      var ovBody = document.getElementById('overviewBody');
      if (ovBody) ovBody.addEventListener('click', function (e) {
        if (e.target.closest('[data-edit]')) openEdit();
      });
      editScrim.querySelectorAll('[data-close-edit]').forEach(function (b) { b.addEventListener('click', closeEdit); });
      var editSave = document.getElementById('editSave');
      if (editSave) editSave.addEventListener('click', closeEdit);
      editScrim.addEventListener('click', function (e) { if (e.target === editScrim) closeEdit(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && editScrim.classList.contains('is-open')) closeEdit();
      });
    }

    // Run Payroll (step 2) → confirmation modal → progress → summary
    var continueScrim = document.getElementById('continueScrim');
    var runP = document.getElementById('ppRunPayroll');
    if (continueScrim) {
      var openContinue = function () { continueScrim.classList.add('is-open'); continueScrim.setAttribute('aria-hidden', 'false'); };
      var closeContinue = function () { continueScrim.classList.remove('is-open'); continueScrim.setAttribute('aria-hidden', 'true'); };
      if (runP) runP.addEventListener('click', openContinue);
      continueScrim.querySelectorAll('[data-close-continue]').forEach(function (b) { b.addEventListener('click', closeContinue); });
      continueScrim.addEventListener('click', function (e) { if (e.target === continueScrim) closeContinue(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && continueScrim.classList.contains('is-open')) closeContinue();
      });
      var continueRun = document.getElementById('continueRun');
      if (continueRun) continueRun.addEventListener('click', function () {
        closeContinue();
        setStep(3);
        runProgress(goSummary);
      });
    }

    // Minimize → skip the wait, jump to summary
    var minBtn = document.getElementById('ppMinimize');
    if (minBtn) minBtn.addEventListener('click', goSummary);

    // Step-3 footer / next links
    var goP = document.getElementById('goPayroll');
    if (goP) goP.addEventListener('click', function () { window.location.href = 'index.html'; });
    var goPH = document.getElementById('goPayrollHistory');
    if (goPH) goPH.addEventListener('click', function () { window.location.href = 'index.html'; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    activateSidebar();
    setupChecklist();
    setupSelects();
    setupBpjsReveal();
    setupMonthPickers();
    setupAssign();
    setupFilterEngine();
    setupActions();
    setupReview();
  });
})();
