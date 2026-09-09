// payroll-history.js — Payroll Processing tab switcher + Payroll History table.
// Runs AFTER payroll-processing.js (which exposes window.PP.openChecklist).
(function () {
  'use strict';

  /* ============ Sample data ============ */
  // Net pay stored as raw rupiah; formatted on render.
  // State model: each row carries independent `published` + `locked` booleans.
  // Only 3 combinations are reachable (Published+Unlocked is impossible):
  //   A) published:false locked:false  — Unpublished, Unlocked
  //   B) published:true  locked:true   — Published, Locked
  //   C) published:false locked:true   — Unpublished, Locked
  var DATA = {
    2026: [
      { period: 'March 2026',    cut: '1 Mar – 31 Mar 2026', sched: '25 Mar 2026', emp: 128, net: 1842500000, published: false, locked: false },
      { period: 'February 2026', cut: '1 Feb – 28 Feb 2026', sched: '25 Feb 2026', emp: 126, net: 1798200000, published: true,  locked: true },
      { period: 'January 2026',  cut: '1 Jan – 31 Jan 2026', sched: '25 Jan 2026', emp: 124, net: 1771040000, published: false, locked: true }
    ],
    2025: [
      { period: 'December 2025', cut: '1 Dec – 31 Dec 2025', sched: '23 Dec 2025', emp: 122, net: 2410880000, published: true, locked: true, note: 'incl. THR' },
      { period: 'November 2025', cut: '1 Nov – 30 Nov 2025', sched: '25 Nov 2025', emp: 121, net: 1702660000, published: true, locked: true },
      { period: 'October 2025',  cut: '1 Oct – 31 Oct 2025', sched: '24 Oct 2025', emp: 120, net: 1688400000, published: true, locked: true },
      { period: 'September 2025',cut: '1 Sep – 30 Sep 2025', sched: '25 Sep 2025', emp: 118, net: 1654120000, published: true, locked: true },
      { period: 'August 2025',   cut: '1 Aug – 31 Aug 2025', sched: '25 Aug 2025', emp: 117, net: 1640980000, published: true, locked: true }
    ],
    2024: [
      { period: 'December 2024', cut: '1 Dec – 31 Dec 2024', sched: '23 Dec 2024', emp: 110, net: 2188400000, published: true, locked: true, note: 'incl. THR' },
      { period: 'November 2024', cut: '1 Nov – 30 Nov 2024', sched: '25 Nov 2024', emp: 109, net: 1502200000, published: true, locked: true }
    ]
  };

  // Padlock glyphs for the lock toggle.
  var LOCK_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
  var LOCK_SHUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

  function rupiah(n) {
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  /* ============ History table rendering ============ */
  var state = { year: 2026, query: '' };
  var rendered = [];   // index -> row object currently shown (for action delegation)

  function rows() {
    var list = (DATA[state.year] || []).slice();
    if (state.query) {
      var q = state.query.toLowerCase();
      list = list.filter(function (r) { return r.period.toLowerCase().indexOf(q) !== -1; });
    }
    return list;
  }

  // Status pill is driven by publish state only; the padlock conveys lock state.
  function statusCell(r) {
    if (r.published) return '<span class="ph-status ph-status--published">Published</span>';
    return '<span class="ph-status ph-status--ready">Ready to Publish</span>';
  }

  // Action cell: primary publish/unpublish button + lock toggle + overflow menu.
  function actionCell(r, idx) {
    var primaryLabel = r.published ? 'Unpublish Payslip' : 'Publish Payslip';
    var lockGlyph = r.locked ? LOCK_SHUT : LOCK_OPEN;
    var lockLabel = r.locked ? 'Unlock payroll' : 'Lock payroll';
    return '<div class="ph-rowact">' +
      '<button class="ph-publish" type="button" data-act="primary" data-idx="' + idx + '">' + primaryLabel + '</button>' +
      '<button class="ph-iconact ph-lock' + (r.locked ? ' is-locked' : '') + '" type="button" data-act="lock" data-idx="' + idx + '" aria-label="' + lockLabel + '" title="' + lockLabel + '">' + lockGlyph + '</button>' +
      '<button class="ph-iconact ph-iconact--menu" type="button" data-act="menu" data-idx="' + idx + '" aria-label="More" title="More"><svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>' +
    '</div>';
  }

  function renderTable() {
    var tbody = document.getElementById('phRows');
    if (!tbody) return;
    var list = rows();
    rendered = list;
    tbody.innerHTML = '';

    if (!list.length) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="7" style="text-align:center; padding:54px 0; color:var(--fg-3); font-weight:500;">' +
        'No payroll runs found for ' + state.year + (state.query ? ' matching “' + state.query + '”' : '') + '.</td>';
      tbody.appendChild(tr);
    } else {
      list.forEach(function (r, idx) {
        var tr = document.createElement('tr');

        var periodCell = '<td><div class="pp-emp"><div class="pp-emp__meta">' +
          '<span class="pp-emp__name">' + r.period + (r.note ? ' <span style="color:var(--color-tertiary-700);font-weight:600;font-size:12px;">· ' + r.note + '</span>' : '') + '</span>' +
          '<span class="pp-emp__sub">' + r.cut + '</span></div></div></td>';

        tr.innerHTML =
          periodCell +
          '<td>' + r.sched + '</td>' +
          '<td>' + r.emp + ' employees</td>' +
          '<td><strong style="color:var(--fg-1);font-weight:700;">' + rupiah(r.net) + '</strong></td>' +
          '<td><a class="ph-view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>View</a></td>' +
          '<td>' + statusCell(r) + '</td>' +
          '<td class="ph-actcell">' + actionCell(r, idx) + '</td>';
        tbody.appendChild(tr);
      });
    }

    // Footer count
    var showing = document.getElementById('phShowing');
    if (showing) {
      showing.textContent = list.length
        ? 'Showing 1–' + list.length + ' of ' + list.length + ' payroll runs'
        : 'No payroll runs';
    }
  }

  /* ============ Publish / Lock state machine ============ */
  // Transitions (period stays in one of 3 reachable states):
  //   A Unpublished+Unlocked  --Publish-->  B Published+Locked   (auto-lock)
  //   A Unpublished+Unlocked  --Lock-->     C Unpublished+Locked
  //   C Unpublished+Locked    --Publish-->  B Published+Locked
  //   C Unpublished+Locked    --Unlock-->   A Unpublished+Unlocked
  //   B Published+Locked      --Unpublish-->C Unpublished+Locked
  //   B Published+Locked      --Unlock-->   A Unpublished+Unlocked (auto-unpublish)
  var plScrim, plTitle, plBody, plPrimary, plPending;

  function showConfirm(opts) {
    if (!plScrim) return;
    plTitle.textContent = opts.title;
    plBody.textContent = opts.body;
    plPrimary.textContent = opts.primary;
    plPrimary.classList.toggle('btn--danger', !!opts.danger);
    plPrimary.classList.toggle('btn--primary', !opts.danger);
    plPending = opts.onConfirm || null;
    plScrim.classList.add('is-open');
    plScrim.setAttribute('aria-hidden', 'false');
  }
  function closeConfirm() {
    if (!plScrim) return;
    plScrim.classList.remove('is-open');
    plScrim.setAttribute('aria-hidden', 'true');
    plPending = null;
  }

  function openPrimaryModal(r) {
    if (r.published) {
      // State B → Unpublish (stays locked → State C)
      showConfirm({
        title: 'Unpublish Payslip?',
        body: 'Payslip for period ' + r.period + ' will be unpublished to employees.',
        primary: 'Unpublish Payslip',
        onConfirm: function () { r.published = false; renderTable(); }
      });
    } else if (r.locked) {
      // State C → Publish (already locked)
      showConfirm({
        title: 'Publish Payslip?',
        body: 'Payslip for period ' + r.period + ' will be published to employees.',
        primary: 'Publish Payslip',
        onConfirm: function () { r.published = true; r.locked = true; renderTable(); }
      });
    } else {
      // State A → Publish (auto-lock)
      showConfirm({
        title: 'Publish Payslip?',
        body: 'If you publish payslip for ' + r.period + ' to employees, payroll in this period will be automatically locked.',
        primary: 'Lock & Publish Payslip',
        onConfirm: function () { r.published = true; r.locked = true; renderTable(); }
      });
    }
  }

  function openLockModal(r) {
    if (!r.locked) {
      // State A → Lock (stays unpublished → State C)
      showConfirm({
        title: 'Lock Payroll?',
        body: 'Payroll for period ' + r.period + ' will be locked.',
        primary: 'Lock Payroll',
        onConfirm: function () { r.locked = true; renderTable(); }
      });
    } else if (r.published) {
      // State B → Unlock (auto-unpublish → State A)
      showConfirm({
        title: 'Unlock Payroll?',
        body: 'Payroll for period ' + r.period + ' is published. Unlocking it will also unpublish the payslip from employees.',
        primary: 'Unlock & Unpublish Payslip',
        onConfirm: function () { r.locked = false; r.published = false; renderTable(); }
      });
    } else {
      // State C → Unlock (→ State A)
      showConfirm({
        title: 'Unlock Payroll?',
        body: 'Payroll for period ' + r.period + ' will be unlocked.',
        primary: 'Unlock Payroll',
        onConfirm: function () { r.locked = false; renderTable(); }
      });
    }
  }

  function setupConfirmModal() {
    plScrim = document.getElementById('plScrim');
    if (!plScrim) return;
    plTitle = document.getElementById('plTitle');
    plBody = document.getElementById('plBody');
    plPrimary = document.getElementById('plPrimary');

    plPrimary.addEventListener('click', function () {
      var fn = plPending;
      closeConfirm();
      if (fn) fn();
    });
    plScrim.querySelectorAll('[data-pl-close]').forEach(function (b) { b.addEventListener('click', closeConfirm); });
    plScrim.addEventListener('click', function (e) { if (e.target === plScrim) closeConfirm(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && plScrim.classList.contains('is-open')) closeConfirm();
    });

    // Delegate row-action clicks.
    var tbody = document.getElementById('phRows');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var r = rendered[+btn.getAttribute('data-idx')];
        if (!r) return;
        var act = btn.getAttribute('data-act');
        if (act === 'primary') openPrimaryModal(r);
        else if (act === 'lock') openLockModal(r);
        else if (act === 'menu') { e.stopPropagation(); openRowMenu(btn, r); }
      });
    }
  }

  /* ============ Per-row action menu (Download E-Banking / Disbursement) ============ */
  var rowMenu = null, rowMenuRow = null;

  function buildRowMenu() {
    rowMenu = document.createElement('div');
    rowMenu.className = 'ph-rowmenu';
    rowMenu.innerHTML =
      '<div class="ph-rowmenu__head"></div>' +
      '<button class="ph-rowmenu__item" type="button" data-menu="ebanking">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>' +
        'Download E-Banking</button>' +
      '<button class="ph-rowmenu__item" type="button" data-menu="disbursement">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/></svg>' +
        'Disbursement</button>';
    document.body.appendChild(rowMenu);
    rowMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var item = e.target.closest('[data-menu]');
      if (!item) return;
      var which = item.getAttribute('data-menu');
      var period = rowMenuRow ? rowMenuRow.period : null;
      closeRowMenu();
      if (which === 'ebanking' && window.EB && typeof window.EB.open === 'function') {
        window.EB.open(period);
      }
      // 'disbursement' — reserved for the Disbursement flow (not yet designed)
    });
  }

  function openRowMenu(btn, r) {
    if (!rowMenu) buildRowMenu();
    rowMenuRow = r;
    rowMenu.querySelectorAll('.ph-rowmenu__head').forEach(function (h) {
      h.textContent = r.period;
    });
    var rect = btn.getBoundingClientRect();
    rowMenu.classList.add('is-open');
    var w = rowMenu.offsetWidth || 232;
    rowMenu.style.top = (rect.bottom + window.scrollY + 6) + 'px';
    rowMenu.style.left = (rect.right + window.scrollX - w) + 'px';
  }
  function closeRowMenu() { if (rowMenu) rowMenu.classList.remove('is-open'); }

  /* ============ Year-only date picker ============ */
  var yp = null, ypBase = 2016;

  function buildYearPicker() {
    yp = document.createElement('div');
    yp.className = 'dp is-years';
    yp.style.width = '260px';
    yp.innerHTML =
      '<div class="dp__head">' +
        '<button class="dp__nav" type="button" data-yp="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<button class="dp__title" type="button" data-yp="title"></button>' +
        '<button class="dp__nav" type="button" data-yp="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</div>' +
      '<div class="dp__view dp__view--years"><div class="dp__cells" data-yp="years"></div></div>';
    document.body.appendChild(yp);
    yp.addEventListener('click', function (e) { e.stopPropagation(); });
    yp.querySelector('[data-yp="prev"]').addEventListener('click', function () { ypBase -= 12; renderYears(); });
    yp.querySelector('[data-yp="next"]').addEventListener('click', function () { ypBase += 12; renderYears(); });
  }

  function renderYears() {
    yp.querySelector('[data-yp="title"]').textContent = ypBase + ' – ' + (ypBase + 11);
    var yc = yp.querySelector('[data-yp="years"]');
    yc.innerHTML = '';
    var thisYear = new Date().getFullYear();
    for (var y = ypBase; y < ypBase + 12; y++) {
      (function (year) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'dp__cell';
        c.textContent = year;
        if (year === state.year) c.classList.add('is-sel');
        if (year > thisYear) c.classList.add('is-out');
        c.addEventListener('click', function () {
          state.year = year;
          var yearEl = document.getElementById('phYear');
          if (yearEl) yearEl.value = year;
          renderTable();
          closeYearPicker();
        });
        yc.appendChild(c);
      })(y);
    }
  }

  function openYearPicker(anchor) {
    if (!yp) buildYearPicker();
    ypBase = state.year - (state.year % 12);
    renderYears();
    var r = anchor.getBoundingClientRect();
    yp.classList.add('is-open');
    yp.style.top = (r.bottom + window.scrollY + 6) + 'px';
    yp.style.left = (r.left + window.scrollX) + 'px';
  }
  function closeYearPicker() { if (yp) yp.classList.remove('is-open'); }

  function setupYearPicker() {
    var pick = document.querySelector('.ph-yearpick');
    if (!pick) return;
    pick.addEventListener('click', function (e) {
      e.stopPropagation();
      if (yp && yp.classList.contains('is-open')) { closeYearPicker(); return; }
      openYearPicker(pick);
    });
  }

  // Global dismissers for both popovers.
  function setupPopoverDismiss() {
    document.addEventListener('click', function () { closeYearPicker(); closeRowMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeYearPicker(); closeRowMenu(); }
    });
    window.addEventListener('resize', function () { closeYearPicker(); closeRowMenu(); });
  }

  /* ============ History controls ============ */
  function setupHistory() {
    var yearEl = document.getElementById('phYear');
    var prev = document.getElementById('phYearPrev');
    var next = document.getElementById('phYearNext');
    var search = document.getElementById('phSearch');

    function applyYear() {
      if (yearEl) yearEl.value = state.year;
      renderTable();
    }
    if (prev) prev.addEventListener('click', function () { state.year -= 1; applyYear(); });
    if (next) next.addEventListener('click', function () { state.year += 1; applyYear(); });
    if (search) search.addEventListener('input', function () { state.query = search.value.trim(); renderTable(); });

    renderTable();
  }

  /* ============ Tab switching across views ============ */
  function setupTabs() {
    var tabbar = document.querySelector('.pp-tabs[data-tabgroup="payroll"]');
    if (!tabbar) return;
    var views = document.querySelectorAll('.pp-view');

    function show(name) {
      tabbar.querySelectorAll('.tab-pill').forEach(function (p) {
        p.classList.toggle('is-on', p.getAttribute('data-tab') === name);
      });
      views.forEach(function (v) {
        v.classList.toggle('is-hidden', v.getAttribute('data-view') !== name);
      });
      if (window.lucide) window.lucide.createIcons();
      // Entering Run Payroll surfaces the pre-flight checklist.
      if (name === 'run' && window.PP && typeof window.PP.openChecklist === 'function') {
        window.PP.openChecklist();
      }
    }

    tabbar.querySelectorAll('.tab-pill').forEach(function (pill) {
      pill.addEventListener('click', function () { show(pill.getAttribute('data-tab')); });
    });

    // History-view buttons that jump to Run Payroll.
    ['phRun', 'phRunLink'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function (e) { e.preventDefault(); show('run'); });
    });

    window.PP = window.PP || {};
    window.PP.showView = show;
  }

  function init() {
    // Expose a flat list of every period for the E-Banking modal's Period select.
    var all = [];
    Object.keys(DATA).sort().reverse().forEach(function (y) {
      (DATA[y] || []).forEach(function (r) { all.push(r.period); });
    });
    window.EB_PERIODS = all;

    setupHistory();
    setupTabs();
    setupConfirmModal();
    setupYearPicker();
    setupPopoverDismiss();
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
