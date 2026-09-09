// ============================================================
// SEVAKA HRIS — Payroll · Compliance · PKWT Compensation
// Self-contained page logic. Reuses shell.js topnav/sidebar +
// design-system field / table / modal primitives.
// ============================================================
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- shared green "dino" avatar (matches source mockups) ----------
  var dinoSeq = 0;
  function dinoSvg() {
    var gid = 'cmpDino' + (++dinoSeq);
    return (
      '<svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1">' +
          '<stop offset="0%" stop-color="#a8d479"/><stop offset="100%" stop-color="#6ba23f"/>' +
        '</linearGradient></defs>' +
        '<rect width="42" height="42" fill="url(#' + gid + ')"/>' +
        '<ellipse cx="21" cy="18" rx="9" ry="10" fill="#f0c39a"/>' +
        '<path d="M14 12 q7 -8 14 0 q1 4 -2 6 q-3 -4 -10 -4 q-3 0 -4 4 q-2 -2 2 -6z" fill="#3d2415"/>' +
        '<path d="M14 22 q1 6 7 7 q6 -1 7 -7 q-3 2 -7 2 q-4 0 -7 -2z" fill="#3d2415"/>' +
        '<path d="M6 42 q3 -10 15 -10 q12 0 15 10z" fill="#1f4a26"/>' +
      '</svg>'
    );
  }

  // ---------- modal helpers ----------
  function openModal(scrim) { if (scrim) { scrim.classList.add('is-open'); scrim.setAttribute('aria-hidden', 'false'); } }
  function closeModal(scrim) { if (scrim) { scrim.classList.remove('is-open'); scrim.setAttribute('aria-hidden', 'true'); } }

  // ---------- toast ----------
  var toastTimer;
  function toast(msg) {
    var t = $('#compToast');
    if (!t) return;
    $('#compToastMsg').textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  // =========================================================================
  // DATA
  // =========================================================================
  // Whole employee pool (used by the Select Employee modal too)
  var POOL = [
    { id: 'CP060', name: 'Mitsui Tiga' },    { id: 'CP061', name: 'Mitsui Empat' },
    { id: 'CP062', name: 'Mitsui Lima' },    { id: 'CP063', name: 'Mitsui Enam' },
    { id: 'CP064', name: 'Mitsui Tujuh' },   { id: 'CP065', name: 'Mitsui Delapan' },
    { id: 'CP066', name: 'Mitsui Sembilan' },{ id: 'CP067', name: 'Mitsui Sepuluh' },
    { id: 'CP068', name: 'Mitsui Sebelas' }, { id: 'CP069', name: 'Mitsui Dua Belas' }
  ];
  var BRANCH = 'Jakarta', ROLE = 'IT Staff - SQA';

  // PKWT compensation rows currently shown in the table
  var ROWS = [
    { id: 'CP060', name: 'Mitsui Tiga',  start: '01 Jan 2024', end: '31 Dec 2024', months: 12, amount: '4.500.000', period: 'Jan 2025' },
    { id: 'CP061', name: 'Mitsui Empat', start: '01 Mar 2024', end: '28 Feb 2025', months: 12, amount: '5.200.000', period: 'Mar 2025' },
    { id: 'CP062', name: 'Mitsui Lima',  start: '15 Jun 2023', end: '14 Jun 2025', months: 24, amount: '9.800.000', period: 'Jun 2025' },
    { id: 'CP063', name: 'Mitsui Enam',  start: '01 Sep 2024', end: '31 Aug 2025', months: 12, amount: '4.750.000', period: 'Sep 2025' },
    { id: 'CP064', name: 'Mitsui Tujuh', start: '01 Nov 2023', end: '31 Oct 2025', months: 24, amount: '10.400.000', period: 'Nov 2025' },
    { id: 'CP065', name: 'Mitsui Delapan', start: '01 Feb 2025', end: '31 Jul 2025', months: 6, amount: '2.600.000', period: 'Aug 2025' }
  ];

  // =========================================================================
  // TABS (PKWT Compensation built; others are stubs)
  // =========================================================================
  function initTabs() {
    $$('#compTabs .comp-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('#compTabs .comp-pill').forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        var t = btn.getAttribute('data-comptab');
        $$('.comp-view').forEach(function (v) { v.classList.toggle('is-hidden', v.getAttribute('data-compview') !== t); });
      });
    });
  }

  // =========================================================================
  // TABLE
  // =========================================================================
  function rowHTML(r, i) {
    return '' +
      '<tr data-id="' + r.id + '">' +
        '<td>' +
          '<div class="comp-emp">' +
            '<span class="comp-emp__avatar">' + dinoSvg() + '</span>' +
            '<span class="comp-emp__meta">' +
              '<span class="comp-emp__name">' + r.id + ' - ' + r.name + '</span>' +
              '<span class="comp-emp__sub">' + BRANCH + ' | ' + ROLE + '</span>' +
            '</span>' +
          '</div>' +
        '</td>' +
        '<td>' + r.start + '</td>' +
        '<td>' + r.end + '</td>' +
        '<td>' + r.months + ' months</td>' +
        '<td>IDR ' + r.amount + '</td>' +
        '<td>' + r.period + '</td>' +
        '<td class="pp-cell-act">' +
          '<div class="comp-actwrap" data-row="' + i + '">' +
            '<button class="action-btn" type="button" data-act-btn>Action' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
            '</button>' +
            '<div class="comp-actmenu">' +
              '<button class="comp-actmenu__item" type="button" data-act="view"><i data-lucide="eye"></i>View detail</button>' +
              '<button class="comp-actmenu__item" type="button" data-act="edit"><i data-lucide="pencil"></i>Edit</button>' +
              '<button class="comp-actmenu__item is-danger" type="button" data-act="delete"><i data-lucide="trash-2"></i>Delete</button>' +
            '</div>' +
          '</div>' +
        '</td>' +
      '</tr>';
  }

  function renderTable() {
    var body = $('#compRows');
    body.innerHTML = ROWS.map(rowHTML).join('');
    $('#compShowingTotal').textContent = ROWS.length;
    if (window.lucide) window.lucide.createIcons();
    wireActionMenus();
  }

  function closeAllActMenus() { $$('.comp-actwrap.is-open').forEach(function (w) { w.classList.remove('is-open'); }); }

  function wireActionMenus() {
    $$('.comp-actwrap').forEach(function (wrap) {
      var btn = $('[data-act-btn]', wrap);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = wrap.classList.contains('is-open');
        closeAllActMenus();
        if (!open) wrap.classList.add('is-open');
      });
      $$('[data-act]', wrap).forEach(function (item) {
        item.addEventListener('click', function (e) {
          e.stopPropagation();
          var act = item.getAttribute('data-act');
          var id = wrap.closest('tr').getAttribute('data-id');
          closeAllActMenus();
          if (act === 'delete') { pendingDeleteId = id; openModal($('#compDeleteScrim')); }
          else if (act === 'view') toast('Opening compensation detail for ' + id + '.');
          else if (act === 'edit') toast('Editing PKWT compensation for ' + id + '.');
        });
      });
    });
  }

  // =========================================================================
  // CREATE / EDIT FORM (editable per-employee compensation table)
  // =========================================================================
  var FORMROWS = []; // { id, name, status, start, end, months, amount }

  function showState(state) {
    var list = $('[data-compstate="list"]');
    var form = $('[data-compstate="form"]');
    if (list) list.classList.toggle('is-hidden', state !== 'list');
    if (form) form.classList.toggle('is-hidden', state !== 'form');
  }

  var CAL = '<svg class="ctl__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';

  function formRowHTML(r, i) {
    return '' +
      '<tr data-idx="' + i + '">' +
        '<td class="comp-fcheckcol"><label class="check-red"><input type="checkbox" class="comp-frow-check"><span class="check-red__box"></span></label></td>' +
        '<td>' +
          '<div class="comp-emp">' +
            '<span class="comp-emp__avatar">' + dinoSvg() + '</span>' +
            '<span class="comp-emp__meta">' +
              '<span class="comp-emp__name">' + r.id + ' - ' + r.name + '</span>' +
              '<span class="comp-emp__sub">' + BRANCH + ' | ' + ROLE + '</span>' +
            '</span>' +
          '</div>' +
        '</td>' +
        '<td><span class="comp-fstatus">' + (r.status || 'PKWT (Contract)') + '</span></td>' +
        '<td class="comp-fcell"><div class="ctl ctl--date" data-date><input type="text" readonly placeholder="Select date" value="' + (r.start || '') + '">' + CAL + '</div></td>' +
        '<td class="comp-fcell"><div class="ctl ctl--date" data-date><input type="text" readonly placeholder="Select date" value="' + (r.end || '') + '">' + CAL + '</div></td>' +
        '<td><div class="comp-monthfld"><input type="text" inputmode="numeric" placeholder="0" value="' + (r.months || '') + '"><span class="comp-monthfld__suf">Month</span></div></td>' +
        '<td><div class="pp-money"><span class="pp-money__cur">IDR</span><input type="text" inputmode="numeric" placeholder="0" value="' + (r.amount || '') + '"></div></td>' +
        '<td class="pp-cell-act"><button class="comp-rowdel" type="button" data-row-del aria-label="Remove row">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button></td>' +
      '</tr>';
  }

  function renderForm() {
    var body = $('#compFormRows');
    var empty = $('#compFormEmpty');
    body.innerHTML = FORMROWS.map(formRowHTML).join('');
    if (empty) empty.classList.toggle('is-hidden', FORMROWS.length > 0);
    $('#compFormTotal').textContent = FORMROWS.length;
    var all = $('#compFormCheckAll'); if (all) { all.checked = false; }
    if (window.lucide) window.lucide.createIcons();
    wireFormRows();
  }

  function wireFormRows() {
    $$('#compFormRows tr').forEach(function (tr) {
      $('[data-row-del]', tr).addEventListener('click', function () {
        var idx = parseInt(tr.getAttribute('data-idx'), 10);
        FORMROWS.splice(idx, 1);
        renderForm();
      });
      // date cells open the date-picker modal
      $$('[data-date]', tr).forEach(function (d) {
        d.addEventListener('click', function () { openDatePicker($('input', d)); });
      });
      // work duration is constrained to 1–12
      var month = $('.comp-monthfld input', tr);
      if (month) month.addEventListener('input', function () { clampMonth(month); });
    });
  }

  function clampMonth(inp) {
    var v = (inp.value || '').replace(/[^\d]/g, '');
    if (v === '') { inp.value = ''; return; }
    var n = parseInt(v, 10);
    if (n < 1) n = 1;
    if (n > 12) n = 12;
    inp.value = String(n);
  }

  function addEmployeesToForm(list) {
    list.forEach(function (e) {
      if (FORMROWS.some(function (r) { return r.id === e.id; })) return;
      FORMROWS.push({ id: e.id, name: e.name, status: 'PKWT (Contract)', start: '', end: '', months: '', amount: '' });
    });
    renderForm();
  }

  function initForm() {
    $('#compCreateNew').addEventListener('click', function () {
      FORMROWS = [];
      $('#compFormTitle').textContent = 'Create PKWT Compensation';
      renderForm();
      showState('form');
    });
    $('#compFormCancel').addEventListener('click', function () { showState('list'); });
    $('#compFormCrumb').addEventListener('click', function () { showState('list'); });
    $('#compFormSave').addEventListener('click', function () {
      if (!FORMROWS.length) { toast('Add at least one employee first.'); return; }
      showState('list');
      toast(FORMROWS.length + ' PKWT compensation record(s) saved.');
    });
    $('#compFormBulk').addEventListener('click', function () { openModal($('#compBulkScrim')); });
    $('#compFormCheckAll').addEventListener('change', function () {
      var on = this.checked;
      $$('#compFormRows .comp-frow-check').forEach(function (c) { c.checked = on; });
    });
  }

  // =========================================================================
  // DATE PICKER MODAL (form contract dates)
  // =========================================================================
  var MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var dpInput = null, dpYear, dpMonth, dpSelKey = null;

  function parseDate(str) {
    var m = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec((str || '').trim());
    if (!m) return null;
    var mi = MONTHS_ABBR.indexOf(m[2]);
    if (mi < 0) return null;
    return { d: +m[1], mo: mi, y: +m[3] };
  }

  function renderDateGrid() {
    $('#compDateLabel').textContent = MONTHS_FULL[dpMonth] + ' ' + dpYear;
    var first = new Date(dpYear, dpMonth, 1).getDay();
    var days = new Date(dpYear, dpMonth + 1, 0).getDate();
    var html = '';
    for (var i = 0; i < first; i++) html += '<span></span>';
    for (var d = 1; d <= days; d++) {
      var sel = dpSelKey === (dpYear + '-' + dpMonth + '-' + d);
      html += '<button class="dp__day' + (sel ? ' is-sel' : '') + '" type="button" data-day="' + d + '">' + d + '</button>';
    }
    var grid = $('#compDateGrid');
    grid.innerHTML = html;
    $$('.dp__day', grid).forEach(function (b) {
      b.addEventListener('click', function () {
        var d = parseInt(b.getAttribute('data-day'), 10);
        var val = (d < 10 ? '0' + d : d) + ' ' + MONTHS_ABBR[dpMonth] + ' ' + dpYear;
        if (dpInput) dpInput.value = val;
        closeModal($('#compDateScrim'));
      });
    });
  }

  function openDatePicker(input) {
    dpInput = input;
    var p = parseDate(input.value);
    var now = new Date();
    dpYear = p ? p.y : now.getFullYear();
    dpMonth = p ? p.mo : now.getMonth();
    dpSelKey = p ? (p.y + '-' + p.mo + '-' + p.d) : null;
    renderDateGrid();
    openModal($('#compDateScrim'));
  }

  function initDatePicker() {
    $('#compDatePrev').addEventListener('click', function () { dpMonth--; if (dpMonth < 0) { dpMonth = 11; dpYear--; } renderDateGrid(); });
    $('#compDateNext').addEventListener('click', function () { dpMonth++; if (dpMonth > 11) { dpMonth = 0; dpYear++; } renderDateGrid(); });
    $$('[data-close-date]').forEach(function (b) { b.addEventListener('click', function () { closeModal($('#compDateScrim')); }); });
  }

  // =========================================================================
  // PERIOD MENU (All Period)
  // =========================================================================
  function initPeriod() {
    var period = $('#compPeriod');
    if (!period) return;
    period.addEventListener('click', function (e) {
      e.stopPropagation();
      period.classList.toggle('is-open');
    });
    $$('.pc-menu__item', period).forEach(function (it) {
      it.addEventListener('click', function (e) {
        e.stopPropagation();
        $('.pc-period__val', period).textContent = it.getAttribute('data-period');
        period.classList.remove('is-open');
      });
    });
  }

  // =========================================================================
  // GENERIC CUSTOM SELECTS (export modal)
  // =========================================================================
  function initSelect(ctl, opts, placeholder) {
    if (!ctl) return;
    var valEl = $('.ctl__value', ctl);
    var dd = $('.dropdown', ctl);
    dd.innerHTML = opts.map(function (o) { return '<div class="dropdown__opt" data-val="' + o + '">' + o + '</div>'; }).join('');
    ctl.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = ctl.classList.contains('is-open');
      $$('.ctl--select.is-open').forEach(function (c) { c.classList.remove('is-open'); });
      if (!open) ctl.classList.add('is-open');
    });
    $$('.dropdown__opt', dd).forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        valEl.textContent = opt.getAttribute('data-val');
        valEl.classList.add('has-value');
        $$('.dropdown__opt', dd).forEach(function (o) { o.classList.remove('is-sel'); });
        opt.classList.add('is-sel');
        ctl.classList.remove('is-open');
      });
    });
  }

  // =========================================================================
  // ALL FILTER modal (Status / Employment status / Branch / Organization)
  // =========================================================================
  var FILTER_DEFS = [
    { key: 'status',       title: 'Status',            sub: 'Selected Status',            items: ['Active', 'Expiring Soon', 'Expired', 'Renewed', 'Compensated'] },
    { key: 'employment',   title: 'Employment status', sub: 'Selected Employment Status', items: ['PKWT (Contract)', 'PKWTT (Permanent)', 'Probation', 'Internship', 'Daily Worker'] },
    { key: 'branch',       title: 'Branch',            sub: 'Selected Branch',            items: ['Head Office — Jakarta', 'Branch — Surabaya', 'Branch — Bandung', 'Branch — Medan', 'Branch — Bali'] },
    { key: 'organization', title: 'Organization',      sub: 'Selected Organization',      items: ['Engineering', 'Information Technology', 'Human Resources', 'Finance', 'Operations'] }
  ];
  function defByKey(k) { return FILTER_DEFS.filter(function (d) { return d.key === k; })[0]; }
  var addedKeys = [];

  function blockHTML(def) {
    var opts = def.items.map(function (it) {
      return '<label class="check-red filter-opt"><input type="checkbox"><span class="check-red__box"></span><span class="filter-opt__txt">' + it + '</span></label>';
    }).join('');
    return '' +
      '<div class="filter-block" data-key="' + def.key + '">' +
        '<div class="filter-block__head">' +
          '<span class="filter-block__title">' + def.title + '</span>' +
          '<button class="filter-block__remove" type="button" data-filter-remove aria-label="Remove filter">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M15 9l-6 6M9 9l6 6"/></svg>' +
          '</button>' +
          '<button class="filter-block__chev" type="button" data-filter-collapse aria-label="Collapse">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="filter-block__sub">is any of [' + def.sub + ']</div>' +
        '<div class="filter-block__body">' +
          '<div class="filter-search">' +
            '<input type="text" placeholder="Search...">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '</div>' +
          '<div class="filter-opts">' +
            '<label class="check-red filter-opt filter-opt--all"><input type="checkbox" data-filter-all><span class="check-red__box"></span><span class="filter-opt__txt">All</span></label>' +
            opts +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function wireBlock(block) {
    var key = block.getAttribute('data-key');
    $('[data-filter-remove]', block).addEventListener('click', function () {
      addedKeys = addedKeys.filter(function (x) { return x !== key; });
      renderFilter();
    });
    $('[data-filter-collapse]', block).addEventListener('click', function () {
      block.classList.toggle('is-collapsed');
    });
    var all = $('[data-filter-all]', block);
    all.addEventListener('change', function () {
      $$('.filter-opt:not(.filter-opt--all) input', block).forEach(function (c) {
        if (c.closest('.filter-opt').style.display === 'none') return;
        c.checked = all.checked;
      });
    });
    var search = $('.filter-search input', block);
    search.addEventListener('input', function () {
      var q = search.value.trim().toLowerCase();
      $$('.filter-opt:not(.filter-opt--all)', block).forEach(function (opt) {
        var t = $('.filter-opt__txt', opt).textContent.toLowerCase();
        opt.style.display = t.indexOf(q) !== -1 ? '' : 'none';
      });
    });
  }

  function renderFilter() {
    var empty = $('#compFilterEmpty');
    var filled = $('#compFilterFilled');
    var reset = $('#compFilterReset');
    var list = $('#compFilterList');
    if (!addedKeys.length) {
      empty.classList.remove('is-hidden');
      filled.classList.add('is-hidden');
      reset.classList.add('is-hidden');
      return;
    }
    empty.classList.add('is-hidden');
    filled.classList.remove('is-hidden');
    reset.classList.remove('is-hidden');
    list.innerHTML = addedKeys.map(function (k) { return blockHTML(defByKey(k)); }).join('');
    $$('.filter-block', list).forEach(wireBlock);
  }

  // simple "Add Filter" popover listing the unused filter defs
  function buildAddMenu(anchor) {
    var existing = $('#compFilterAddMenu');
    if (existing) { existing.remove(); return; }
    var avail = FILTER_DEFS.filter(function (d) { return addedKeys.indexOf(d.key) === -1; });
    if (!avail.length) { toast('All filters already added.'); return; }
    var menu = document.createElement('div');
    menu.id = 'compFilterAddMenu';
    menu.className = 'pc-menu pc-menu--left is-open';
    menu.style.cssText = 'position:absolute;z-index:80;min-width:200px;';
    menu.innerHTML = avail.map(function (d) { return '<button class="pc-menu__item" type="button" data-add="' + d.key + '">' + d.title + '</button>'; }).join('');
    anchor.style.position = 'relative';
    anchor.appendChild(menu);
    var r = anchor.getBoundingClientRect();
    menu.style.top = (anchor.offsetHeight + 6) + 'px';
    menu.style.left = '0';
    $$('[data-add]', menu).forEach(function (it) {
      it.addEventListener('click', function (e) {
        e.stopPropagation();
        addedKeys.push(it.getAttribute('data-add'));
        menu.remove();
        renderFilter();
      });
    });
  }

  function initFilterModal() {
    var scrim = $('#compFilterScrim');
    $('#compFilterBtn').addEventListener('click', function () { renderFilter(); openModal(scrim); });
    $('#compFilterAddEmpty').addEventListener('click', function (e) { e.stopPropagation(); buildAddMenu(e.currentTarget.parentNode); });
    $('#compFilterAddMore').addEventListener('click', function (e) { e.stopPropagation(); buildAddMenu(e.currentTarget.parentNode); });
    $('#compFilterReset').addEventListener('click', function () { addedKeys = []; renderFilter(); });
    $('#compFilterApply').addEventListener('click', function () {
      closeModal(scrim);
      toast(addedKeys.length ? 'Filter applied.' : 'Filter cleared.');
    });
  }

  // =========================================================================
  // SELECT EMPLOYEE modal (Create New)
  // =========================================================================
  function initSelectEmployee() {
    var scrim = $('#compEmpScrim');
    if (!scrim) return;
    var selected = {}; // id -> true (preselected a few to mirror the mockup)

    function empRowHTML(e, side) {
      var on = !!selected[e.id];
      return '<div class="ae-emp' + (on ? ' ae-emp--assigned' : '') + '" data-id="' + e.id + '" data-side="' + side + '">' +
        '<span class="ae-emp__avatar dino-av">' + dinoSvg() + '</span>' +
        '<span class="ae-emp__meta">' +
          '<span class="ae-emp__name">' + e.id + ' - ' + e.name + '</span>' +
          '<span class="ae-emp__sub">' + BRANCH + ' | ' + ROLE + '</span>' +
        '</span>' +
        '<span class="ae-emp__act"><i data-lucide="' + (side === 'right' ? 'x' : (on ? 'check' : 'plus')) + '"></i></span>' +
      '</div>';
    }

    function render() {
      var leftSearch = ($('#compEmpSearch').value || '').toLowerCase();
      var left = POOL.filter(function (e) {
        return (e.id + ' ' + e.name).toLowerCase().indexOf(leftSearch) !== -1;
      });
      $('#compEmpLeftList').innerHTML = left.map(function (e) { return empRowHTML(e, 'left'); }).join('');
      var sel = POOL.filter(function (e) { return selected[e.id]; });
      var rightSearch = ($('#compEmpSelSearch').value || '').toLowerCase();
      var selFiltered = sel.filter(function (e) { return (e.id + ' ' + e.name).toLowerCase().indexOf(rightSearch) !== -1; });
      $('#compEmpRightList').innerHTML = selFiltered.map(function (e) { return empRowHTML(e, 'right'); }).join('');
      $('#compEmpViewShown').textContent = left.length;
      $('#compEmpViewTotal').textContent = POOL.length;
      $('#compEmpSelCount').textContent = sel.length;
      if (window.lucide) window.lucide.createIcons();
      wireRows();
    }
    function wireRows() {
      $$('.ae-emp', scrim).forEach(function (row) {
        row.addEventListener('click', function () {
          var id = row.getAttribute('data-id');
          if (row.getAttribute('data-side') === 'right') delete selected[id];
          else if (selected[id]) delete selected[id];
          else selected[id] = true;
          render();
        });
      });
    }

    function open() {
      selected = {};
      // mirror the mockup: start with three preselected employees
      ['CP060', 'CP061', 'CP062'].forEach(function (id) { selected[id] = true; });
      $('#compEmpSearch').value = ''; $('#compEmpSelSearch').value = '';
      showPane('list');
      render();
      openModal(scrim);
    }

    // pane toggle (list / filter) — only the left column has switchable panes
    function showPane(name) {
      $$('[data-emppane]', scrim).forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-emppane') === name);
      });
    }

    $('#compFormAddEmp').addEventListener('click', open);
    $$('[data-close-compemp]', scrim).forEach(function (b) { b.addEventListener('click', function () { closeModal(scrim); }); });
    $('#compEmpSearch').addEventListener('input', render);
    $('#compEmpSelSearch').addEventListener('input', render);
    $('#compEmpSelectAll').addEventListener('click', function () { POOL.forEach(function (e) { selected[e.id] = true; }); render(); });
    $('#compEmpClear').addEventListener('click', function () { selected = {}; render(); });
    $('#compEmpFilterBtn').addEventListener('click', function () { showPane('filter'); });
    $('#compEmpFilterBack').addEventListener('click', function () { showPane('list'); });
    $('#compEmpFilterApply').addEventListener('click', function () { showPane('list'); });
    $('#compEmpFilterReset').addEventListener('click', function () {
      $$('[data-emp-filter] .ctl__value', scrim).forEach(function (v) { v.classList.remove('has-value'); });
      $$('[data-emp-filter]', scrim).forEach(function (ctl) {
        var ph = ctl.getAttribute('data-ph'); if (ph) $('.ctl__value', ctl).textContent = ph;
      });
    });
    $('#compEmpSubmit').addEventListener('click', function () {
      var sel = POOL.filter(function (e) { return selected[e.id]; });
      closeModal(scrim);
      if (sel.length) addEmployeesToForm(sel);
      else toast('No employee selected.');
    });

    // wire the filter-pane selects
    initSelect($('[data-emp-filter="branch"]', scrim), ['Head Office — Jakarta', 'Branch — Surabaya', 'Branch — Bandung'], 'Select branch');
    initSelect($('[data-emp-filter="org"]', scrim), ['Engineering', 'Information Technology', 'Human Resources'], 'Select organization');
    initSelect($('[data-emp-filter="level"]', scrim), ['Staff', 'Supervisor', 'Manager'], 'Select job level');
    initSelect($('[data-emp-filter="position"]', scrim), ['IT Staff - SQA', 'Software Engineer', 'QA Engineer'], 'Select job position');
    initSelect($('[data-emp-filter="status"]', scrim), ['PKWT (Contract)', 'PKWTT (Permanent)', 'Probation'], 'Select employment status');
    initSelect($('[data-emp-filter="endrange"]', scrim), ['This month', 'Next 3 months', 'Next 6 months', 'This year'], 'Select end employment status range');
  }

  // =========================================================================
  // EXPORT modal
  // =========================================================================
  function initExportModal() {
    var scrim = $('#compExportScrim');
    $('#compExportBtn').addEventListener('click', function () { openModal(scrim); });
    $$('[data-close-export]', scrim).forEach(function (b) { b.addEventListener('click', function () { closeModal(scrim); }); });
    $('#compExportSubmit').addEventListener('click', function () { closeModal(scrim); toast('Export started. Your file will be ready shortly.'); });

    var d = $('#compExportPeriod');
    if (d) d.addEventListener('click', function () {
      var v = $('input', d);
      v.value = 'Jun 2026';
    });
    initSelect($('[data-export-select="position"]', scrim), ['IT Staff - SQA', 'Software Engineer', 'QA Engineer'], 'Select job position');
    initSelect($('[data-export-select="org"]', scrim), ['Engineering', 'Information Technology', 'Human Resources'], 'Select organization');
    initSelect($('[data-export-select="branch"]', scrim), ['Head Office — Jakarta', 'Branch — Surabaya', 'Branch — Bandung'], 'Select branch');
    initSelect($('[data-export-select="status"]', scrim), ['1 selected status', 'Active', 'Expiring Soon', 'Expired'], 'Select status');
    initSelect($('[data-export-select="pkwt"]', scrim), ['Compensated', 'Not Compensated', 'Pending'], 'select PKWT status');
  }

  // =========================================================================
  // BULK UPDATE / ADD modal
  // =========================================================================
  function initBulkModal() {
    var scrim = $('#compBulkScrim');
    $('#compBulkBtn').addEventListener('click', function () { openModal(scrim); });
    $$('[data-close-bulk]', scrim).forEach(function (b) { b.addEventListener('click', function () { closeModal(scrim); }); });
    $('#compBulkDownload').addEventListener('click', function () { toast('Template_pkwt_compensation.xlsx downloaded.'); });
    var box = $('#compBulkUpload');
    var input = $('#compBulkInput');
    var name = $('#compBulkName');
    box.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      if (input.files && input.files.length) {
        name.textContent = input.files[0].name;
        box.classList.add('is-filled');
      } else { name.textContent = 'No file selected'; box.classList.remove('is-filled'); }
    });
    $('#compBulkSubmit').addEventListener('click', function () {
      closeModal(scrim);
      toast('Spreadsheet uploaded. We will validate the rows.');
    });
  }

  // =========================================================================
  // DELETE confirm
  // =========================================================================
  var pendingDeleteId = null;
  function initDelete() {
    var scrim = $('#compDeleteScrim');
    $$('[data-close-delete]', scrim).forEach(function (b) { b.addEventListener('click', function () { closeModal(scrim); }); });
    $('#compDeleteConfirm').addEventListener('click', function () {
      ROWS = ROWS.filter(function (r) { return r.id !== pendingDeleteId; });
      closeModal(scrim);
      renderTable();
      toast('PKWT compensation deleted.');
    });
  }

  // =========================================================================
  // GLOBAL dismiss
  // =========================================================================
  function initGlobal() {
    document.addEventListener('click', function () {
      closeAllActMenus();
      $$('.ctl--select.is-open').forEach(function (c) { c.classList.remove('is-open'); });
      var p = $('#compPeriod'); if (p) p.classList.remove('is-open');
      var am = $('#compFilterAddMenu'); if (am) am.remove();
    });
    $$('.modal-scrim').forEach(function (s) {
      s.addEventListener('click', function (e) { if (e.target === s) closeModal(s); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') $$('.modal-scrim.is-open').forEach(closeModal);
    });
  }

  // =========================================================================
  // INIT
  // =========================================================================
  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    renderTable();
    initForm();
    initDatePicker();
    initPeriod();
    initFilterModal();
    initSelectEmployee();
    initExportModal();
    initBulkModal();
    initDelete();
    initGlobal();
  });
})();
