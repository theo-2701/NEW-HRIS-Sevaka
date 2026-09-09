// add-employee.js — Add Employee wizard
// Runs AFTER shell.js + dashboard.js. Handles: sidebar active state,
// 4-step navigation, custom selects, residential-address sync, SBU add/remove.
(function () {
  'use strict';

  /* ===================== SIDEBAR STATE ===================== */
  function setSidebarState() {
    var sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.add('is-expanded');
    var dash = sidebar.querySelector('.sidebar__dashboard');
    if (dash) dash.classList.remove('is-on');
    var group = sidebar.querySelector('.sidebar__group[data-group="employees"]');
    if (group) {
      group.classList.add('is-open');
      var btn = group.querySelector('.sidebar__menu-btn');
      if (btn) btn.classList.add('is-on');
      group.querySelectorAll('.sidebar__submenu-item').forEach(function (it) {
        if (it.textContent.trim() === 'Employee Directory') it.classList.add('is-on');
      });
    }
  }

  /* ===================== STEP NAVIGATION ===================== */
  var current = 1;
  var TOTAL = 4;

  function renderStepper() {
    document.querySelectorAll('.step').forEach(function (s) {
      var n = parseInt(s.getAttribute('data-step'), 10);
      s.classList.remove('is-done', 'is-current', 'is-clickable');
      var dot = s.querySelector('.step__dot');
      var numSpan = s.querySelector('.step__num');
      if (n < current) {
        s.classList.add('is-done', 'is-clickable');
        if (numSpan) numSpan.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
      } else {
        if (numSpan) numSpan.textContent = String(n);
        if (n === current) s.classList.add('is-current');
      }
    });
  }

  function showStep(n) {
    current = Math.max(1, Math.min(TOTAL, n));
    document.querySelectorAll('.ae-step-pane').forEach(function (p) {
      p.classList.toggle('is-active', parseInt(p.getAttribute('data-pane'), 10) === current);
    });
    renderStepper();
    updateFooter();
    // scroll body to top
    var body = document.querySelector('.ae-body');
    if (body) body.scrollTop = 0;
    if (window.lucide) window.lucide.createIcons();
  }

  function updateFooter() {
    var stepFoot = document.getElementById('footStep');
    var finalFoot = document.getElementById('footFinal');
    if (!stepFoot || !finalFoot) return;
    var isLast = current === TOTAL;
    stepFoot.classList.toggle('is-hidden', isLast);
    finalFoot.classList.toggle('is-hidden', !isLast);
    var back = document.getElementById('btnBack');
    if (back) back.classList.toggle('is-hidden', current <= 1);
  }

  function setupNav() {
    var nextBtn = document.getElementById('btnNext');
    if (nextBtn) nextBtn.addEventListener('click', function () { showStep(current + 1); });

    // Back returns to the previous step
    ['btnBack', 'btnBackFinal'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function () { showStep(current - 1); });
    });

    // Cancel returns to directory
    document.querySelectorAll('[data-cancel]').forEach(function (b) {
      b.addEventListener('click', function () { window.location.href = 'employee-directory.html'; });
    });

    // Submit / Submit & Add Another open the confirmation modal
    var submit = document.getElementById('btnSubmit');
    if (submit) submit.addEventListener('click', openConfirm);
    var submitAdd = document.getElementById('btnSubmitAdd');
    if (submitAdd) submitAdd.addEventListener('click', openConfirm);

    // Clicking a completed step goes back to it
    document.querySelectorAll('.step').forEach(function (s) {
      s.addEventListener('click', function () {
        var n = parseInt(s.getAttribute('data-step'), 10);
        if (n < current) showStep(n);
      });
    });
  }

  /* ===================== CUSTOM SELECTS ===================== */
  function setupSelects() {
    document.querySelectorAll('.ctl--select').forEach(function (sel) {
      if (sel.classList.contains('is-disabled')) return;
      var value = sel.querySelector('.ctl__value');
      var dd = sel.querySelector('.dropdown');
      if (!value || !dd) return;

      sel.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = sel.classList.contains('is-open');
        closeAllSelects();
        if (!open) sel.classList.add('is-open');
      });

      dd.querySelectorAll('.dropdown__opt').forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          dd.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
          opt.classList.add('is-sel');
          value.textContent = opt.textContent;
          value.classList.add('has-value');
          sel.classList.remove('is-open');
        });
      });
    });
    document.addEventListener('click', closeAllSelects);
  }
  function closeAllSelects() {
    document.querySelectorAll('.ctl--select.is-open').forEach(function (s) { s.classList.remove('is-open'); });
  }

  /* ===================== RESIDENTIAL ADDRESS SYNC ===================== */
  function setupResidential() {
    var cb = document.getElementById('useResidential');
    var citizen = document.getElementById('citizenAddr');
    var resWrap = document.getElementById('resAddrCtl');
    var res = document.getElementById('resAddr');
    if (!cb || !res) return;
    cb.addEventListener('change', function () {
      if (cb.checked) {
        if (citizen) res.value = citizen.value;
        res.setAttribute('readonly', 'readonly');
        if (resWrap) resWrap.classList.add('is-disabled');
      } else {
        res.removeAttribute('readonly');
        if (resWrap) resWrap.classList.remove('is-disabled');
      }
    });
    if (citizen) {
      citizen.addEventListener('input', function () {
        if (cb.checked) res.value = citizen.value;
      });
    }
  }

  /* ===================== SBU ADD / REMOVE ===================== */
  function setupSBU() {
    var list = document.getElementById('sbuList');
    var addBtn = document.getElementById('addOther');
    if (!list || !addBtn) return;

    function wireRemove(row) {
      var rm = row.querySelector('.sbu-remove');
      if (rm) rm.addEventListener('click', function () {
        if (list.querySelectorAll('.sbu-row').length > 1) row.remove();
      });
    }
    list.querySelectorAll('.sbu-row').forEach(wireRemove);

    addBtn.addEventListener('click', function () {
      var first = list.querySelector('.sbu-row');
      var clone = first.cloneNode(true);
      // reset selects in clone
      clone.querySelectorAll('.ctl__value').forEach(function (v) {
        v.classList.remove('has-value');
        v.textContent = v.getAttribute('data-placeholder') || 'Select';
      });
      clone.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
      clone.querySelectorAll('.ctl--select').forEach(function (s) { s.classList.remove('is-open'); });
      list.appendChild(clone);
      wireRemove(clone);
      // re-wire selects for the clone
      clone.querySelectorAll('.ctl--select').forEach(function (sel) {
        var value = sel.querySelector('.ctl__value');
        var dd = sel.querySelector('.dropdown');
        sel.addEventListener('click', function (e) {
          e.stopPropagation();
          var open = sel.classList.contains('is-open');
          closeAllSelects();
          if (!open) sel.classList.add('is-open');
        });
        dd.querySelectorAll('.dropdown__opt').forEach(function (opt) {
          opt.addEventListener('click', function (e) {
            e.stopPropagation();
            dd.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
            opt.classList.add('is-sel');
            value.textContent = opt.textContent;
            value.classList.add('has-value');
            sel.classList.remove('is-open');
          });
        });
      });
    });
  }

  /* ===================== RADIO GROUPS ===================== */
  // Native radios already work; nothing extra needed.

  /* ===================== MODALS ===================== */
  var confirmModal, successModal;

  function openConfirm() { if (confirmModal) confirmModal.classList.add('is-open'); }
  function closeConfirm() { if (confirmModal) confirmModal.classList.remove('is-open'); }
  function openSuccess() { if (successModal) successModal.classList.add('is-open'); }
  function closeSuccess() { if (successModal) successModal.classList.remove('is-open'); }

  function setupModals() {
    confirmModal = document.getElementById('confirmModal');
    successModal = document.getElementById('successModal');

    // Confirm: Submit -> success modal
    var confirmSubmit = document.getElementById('confirmSubmit');
    if (confirmSubmit) confirmSubmit.addEventListener('click', function () {
      closeConfirm();
      openSuccess();
    });

    // Close buttons / Cancel
    document.querySelectorAll('[data-close-confirm]').forEach(function (b) {
      b.addEventListener('click', closeConfirm);
    });
    document.querySelectorAll('[data-close-success]').forEach(function (b) {
      b.addEventListener('click', closeSuccess);
    });

    // Success actions
    var goDir = document.getElementById('goDirectory');
    if (goDir) goDir.addEventListener('click', function () { window.location.href = 'employee-directory.html'; });
    var addAnother = document.getElementById('addAnother');
    if (addAnother) addAnother.addEventListener('click', function () {
      closeSuccess();
      showStep(1);
    });

    // Click scrim (outside the card) closes
    [confirmModal, successModal].forEach(function (m) {
      if (!m) return;
      m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('is-open'); });
    });
    // ESC closes whichever is open
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeConfirm(); closeSuccess(); closePicker(); }
    });
  }

  /* ===================== DATE PICKER ===================== */
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WEEKDAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

  var dp = null;          // popover element
  var dpInput = null;     // currently bound input
  var dpView = new Date();// month being displayed
  var dpSel = null;       // selected Date
  var dpMode = 'days';

  function fmt(d) {
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    return dd + ' / ' + mm + ' / ' + d.getFullYear();
  }
  function sameDay(a, b) {
    return a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  }

  function buildPicker() {
    dp = document.createElement('div');
    dp.className = 'dp is-days';
    dp.innerHTML =
      '<div class="dp__head">' +
        '<button class="dp__nav" type="button" data-dp="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<button class="dp__title" type="button" data-dp="title"></button>' +
        '<button class="dp__nav" type="button" data-dp="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</div>' +
      '<div class="dp__view dp__view--days">' +
        '<div class="dp__weekdays">' + WEEKDAYS.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="dp__grid" data-dp="grid"></div>' +
      '</div>' +
      '<div class="dp__view dp__view--months"><div class="dp__cells" data-dp="months"></div></div>' +
      '<div class="dp__view dp__view--years"><div class="dp__cells" data-dp="years"></div></div>' +
      '<div class="dp__foot">' +
        '<span class="dp__value" data-dp="value"></span>' +
        '<button class="dp__set" type="button" data-dp="set">Set Date</button>' +
      '</div>';
    document.body.appendChild(dp);

    dp.addEventListener('click', function (e) { e.stopPropagation(); });

    dp.querySelector('[data-dp="prev"]').addEventListener('click', function () { step(-1); });
    dp.querySelector('[data-dp="next"]').addEventListener('click', function () { step(1); });
    dp.querySelector('[data-dp="title"]').addEventListener('click', function () {
      dpMode = dpMode === 'days' ? 'months' : 'years';
      renderPicker();
    });
    dp.querySelector('[data-dp="set"]').addEventListener('click', function () {
      if (dpSel && dpInput) dpInput.value = fmt(dpSel);
      closePicker();
    });
  }

  function step(dir) {
    if (dpMode === 'days') dpView.setMonth(dpView.getMonth() + dir);
    else if (dpMode === 'months') dpView.setFullYear(dpView.getFullYear() + dir);
    else dpView.setFullYear(dpView.getFullYear() + dir * 12);
    renderPicker();
  }

  function renderPicker() {
    dp.classList.remove('is-days', 'is-months', 'is-years');
    dp.classList.add('is-' + dpMode);
    var title = dp.querySelector('[data-dp="title"]');
    var today = new Date();

    if (dpMode === 'days') {
      title.textContent = MONTHS[dpView.getMonth()] + ' ' + dpView.getFullYear();
      var grid = dp.querySelector('[data-dp="grid"]');
      grid.innerHTML = '';
      var y = dpView.getFullYear(), m = dpView.getMonth();
      var first = new Date(y, m, 1);
      var startIdx = (first.getDay() + 6) % 7;       // Monday-first
      var start = new Date(y, m, 1 - startIdx);
      for (var i = 0; i < 42; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dp__day';
        btn.textContent = d.getDate();
        if (d.getMonth() !== m) btn.classList.add('is-out');
        if (sameDay(d, today)) btn.classList.add('is-today');
        if (sameDay(d, dpSel)) btn.classList.add('is-sel');
        (function (dd) {
          btn.addEventListener('click', function () {
            dpSel = dd;
            dpView = new Date(dd.getFullYear(), dd.getMonth(), 1);
            renderPicker();
          });
        })(d);
        grid.appendChild(btn);
      }
    } else if (dpMode === 'months') {
      title.textContent = dpView.getFullYear();
      var mc = dp.querySelector('[data-dp="months"]');
      mc.innerHTML = '';
      MONTHS_SHORT.forEach(function (name, idx) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'dp__cell';
        c.textContent = name;
        if (dpSel && dpSel.getFullYear() === dpView.getFullYear() && dpSel.getMonth() === idx) c.classList.add('is-sel');
        c.addEventListener('click', function () {
          dpView.setMonth(idx);
          dpMode = 'days';
          renderPicker();
        });
        mc.appendChild(c);
      });
    } else {
      var yStart = dpView.getFullYear() - (dpView.getFullYear() % 12);
      title.textContent = yStart + ' - ' + (yStart + 11);
      var yc = dp.querySelector('[data-dp="years"]');
      yc.innerHTML = '';
      for (var yr = yStart; yr < yStart + 12; yr++) {
        (function (year) {
          var c = document.createElement('button');
          c.type = 'button';
          c.className = 'dp__cell';
          c.textContent = year;
          if (dpSel && dpSel.getFullYear() === year) c.classList.add('is-sel');
          c.addEventListener('click', function () {
            dpView.setFullYear(year);
            dpMode = 'months';
            renderPicker();
          });
          yc.appendChild(c);
        })(yr);
      }
    }

    // footer value
    var val = dp.querySelector('[data-dp="value"]');
    if (dpSel) { val.textContent = fmt(dpSel); val.classList.remove('is-empty'); }
    else { val.textContent = 'DD / MM / YYYY'; val.classList.add('is-empty'); }
  }

  function parseVal(str) {
    var m = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(str || '');
    if (!m) return null;
    return new Date(+m[3], +m[2] - 1, +m[1]);
  }

  function openPicker(input, ctl) {
    if (!dp) buildPicker();
    dpInput = input;
    dpSel = parseVal(input.value);
    dpView = dpSel ? new Date(dpSel.getFullYear(), dpSel.getMonth(), 1) : new Date();
    dpMode = 'days';
    renderPicker();
    // position under the control
    var r = ctl.getBoundingClientRect();
    dp.style.top = (r.bottom + window.scrollY + 6) + 'px';
    var left = r.left + window.scrollX;
    var maxLeft = window.scrollX + document.documentElement.clientWidth - 300 - 12;
    dp.style.left = Math.min(left, maxLeft) + 'px';
    dp.classList.add('is-open');
  }

  function closePicker() { if (dp) dp.classList.remove('is-open'); }

  function setupDatePicker() {
    document.querySelectorAll('input[data-date]').forEach(function (input) {
      var ctl = input.closest('.ctl');
      if (!ctl) return;
      ctl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (dp && dp.classList.contains('is-open') && dpInput === input) { closePicker(); return; }
        openPicker(input, ctl);
      });
    });
    document.addEventListener('click', closePicker);
    var body = document.querySelector('.ae-body');
    if (body) body.addEventListener('scroll', closePicker);
    window.addEventListener('resize', closePicker);
  }

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', function () {
    setSidebarState();
    setupNav();
    setupSelects();
    setupResidential();
    setupSBU();
    setupModals();
    setupDatePicker();
    showStep(1);
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  });

})();
