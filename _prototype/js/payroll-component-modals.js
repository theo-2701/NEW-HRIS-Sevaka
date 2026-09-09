// ============================================================
// SEVAKA HRIS — Payroll Component: Select Employee / Select
// Component modals. Reuses the .ae-assign two-pane shell.
// Talks back to payroll-components.js via window.PC.
// ============================================================
(function () {
  'use strict';

  /* ---------- shared green "dino" avatar (matches source mockups) ---------- */
  var dinoSeq = 0;
  function dinoSvg() {
    var gid = 'aeDino' + (++dinoSeq);
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
  var PLUS  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>';
  var MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>';

  function open(scrim)  { scrim.classList.add('is-open'); }
  function close(scrim) { scrim.classList.remove('is-open'); }

  /* =========================================================================
     SELECT EMPLOYEE
     ========================================================================= */
  function initSelectEmployee() {
    var scrim = document.getElementById('pcSelEmpScrim');
    if (!scrim) return;

    var EMP = [
      { id: 'CP057', name: 'Mitsui Nol',      assigned: true  },
      { id: 'CP058', name: 'Mitsui Satu',     assigned: true  },
      { id: 'CP059', name: 'Mitsui Dua',      assigned: false },
      { id: 'CP060', name: 'Mitsui Tiga',     assigned: false },
      { id: 'CP061', name: 'Mitsui Empat',    assigned: false },
      { id: 'CP062', name: 'Mitsui Lima',     assigned: false },
      { id: 'CP063', name: 'Mitsui Enam',     assigned: false },
      { id: 'CP064', name: 'Mitsui Tujuh',    assigned: false },
      { id: 'CP065', name: 'Mitsui Tujuh',    assigned: false },
      { id: 'CP066', name: 'Mitsui Delapan',  assigned: false },
      { id: 'CP067', name: 'Mitsui Sembilan', assigned: false },
      { id: 'CP068', name: 'Mitsui Sepuluh',  assigned: false },
      { id: 'CP069', name: 'Mitsui Sebelas',  assigned: false }
    ];
    var SUB = 'Jakarta | IT Staff - SQA';
    var mode = 'list';   // 'list' | 'filter'

    var availList   = document.getElementById('pcEmpAvail');
    var assignedList= document.getElementById('pcEmpAssigned');
    var availSearch = document.getElementById('pcEmpAvailSearch');
    var rightSearch = document.getElementById('pcEmpAssignedSearch');
    var rightTitle  = document.getElementById('pcEmpRightTitle');
    var rightLink   = document.getElementById('pcEmpRightLink');
    var listPane    = scrim.querySelector('[data-emppane="list"]');
    var filterPane  = scrim.querySelector('[data-emppane="filter"]');

    function rowHTML(e, assigned) {
      return '<div class="ae-emp' + (assigned ? ' ae-emp--assigned' : '') + '" data-id="' + e.id + '" data-key="' + e.id + '|' + e.name + '">' +
        '<span class="ae-emp__avatar dino-av">' + dinoSvg() + '</span>' +
        '<span class="ae-emp__meta">' +
          '<span class="ae-emp__name">' + e.id + ' - ' + e.name + '</span>' +
          '<span class="ae-emp__sub">' + SUB + '</span>' +
        '</span>' +
        '<span class="ae-emp__act">' + (assigned ? MINUS : PLUS) + '</span>' +
      '</div>';
    }

    function render() {
      var lq = (availSearch.value || '').trim().toLowerCase();
      var rq = (rightSearch.value || '').trim().toLowerCase();

      if (mode === 'list') {
        var avail = EMP.filter(function (e) { return !e.assigned && (e.id + ' ' + e.name).toLowerCase().indexOf(lq) > -1; });
        var asg   = EMP.filter(function (e) { return e.assigned && (e.id + ' ' + e.name).toLowerCase().indexOf(rq) > -1; });
        availList.innerHTML = avail.length ? avail.map(function (e) { return rowHTML(e, false); }).join('')
          : '<div class="ae-assign__empty">No employees to add.</div>';
        assignedList.innerHTML = asg.length ? asg.map(function (e) { return rowHTML(e, true); }).join('')
          : '<div class="ae-assign__empty">No employees assigned yet.<br>Pick from the list on the left.</div>';
        rightTitle.innerHTML = 'Assigned employees (<span id="pcEmpAssignedCount">' + EMP.filter(function (e) { return e.assigned; }).length + '</span>)';
        rightLink.textContent = 'Clear selection';
        rightSearch.placeholder = 'Search Employee';
      } else {
        // filter mode: right column is the candidate list
        var shown = EMP.filter(function (e) { return (e.id + ' ' + e.name).toLowerCase().indexOf(rq) > -1; });
        assignedList.innerHTML = shown.map(function (e) { return rowHTML(e, e.assigned); }).join('')
          || '<div class="ae-assign__empty">No employees match.</div>';
        rightTitle.textContent = 'View ' + shown.length + ' of ' + EMP.length + ' employee(s)';
        rightLink.textContent = 'Select all';
        rightSearch.placeholder = 'Select date';
      }
      if (window.lucide) window.lucide.createIcons();
    }

    function setMode(m) {
      mode = m;
      listPane.classList.toggle('is-active', m === 'list');
      filterPane.classList.toggle('is-active', m === 'filter');
      render();
    }

    // transfer clicks
    availList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-emp'); if (!row) return;
      var emp = EMP.filter(function (x) { return x.id === row.getAttribute('data-id'); })[0];
      if (emp) { emp.assigned = true; render(); }
    });
    assignedList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-emp'); if (!row) return;
      var emp = EMP.filter(function (x) { return x.id === row.getAttribute('data-id'); })[0];
      if (emp) { emp.assigned = !emp.assigned; render(); }
    });

    availSearch.addEventListener('input', render);
    rightSearch.addEventListener('input', render);

    document.getElementById('pcEmpSelectAll').addEventListener('click', function () {
      EMP.forEach(function (e) { e.assigned = true; }); render();
    });
    rightLink.addEventListener('click', function () {
      if (mode === 'list') { EMP.forEach(function (e) { e.assigned = false; }); }
      else { EMP.forEach(function (e) { e.assigned = true; }); }
      render();
    });

    // filter pane toggle
    document.getElementById('pcEmpFilterBtn').addEventListener('click', function () { setMode('filter'); });
    document.getElementById('pcEmpFilterBack').addEventListener('click', function () { setMode('list'); });
    document.getElementById('pcEmpFilterApply').addEventListener('click', function () { setMode('list'); });
    document.getElementById('pcEmpFilterReset').addEventListener('click', function () {
      scrim.querySelectorAll('.pcf-select__val').forEach(function (v) { v.classList.remove('has-value'); });
    });
    scrim.querySelectorAll('.pcf-select').forEach(function (sel) {
      sel.addEventListener('click', function () {
        sel.querySelector('.pcf-select__val').classList.toggle('has-value');
      });
    });

    // close + submit
    scrim.querySelectorAll('[data-close-selemp]').forEach(function (b) { b.addEventListener('click', function () { close(scrim); }); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(scrim); });
    document.getElementById('pcEmpSubmit').addEventListener('click', function () {
      var picked = EMP.filter(function (e) { return e.assigned; }).map(function (e) { return { name: e.id + ' - ' + e.name, sub: SUB }; });
      if (window.PC && window.PC.addEmployeeRows && picked.length) window.PC.addEmployeeRows(picked);
      close(scrim);
    });

    window.PCModals = window.PCModals || {};
    window.PCModals.openSelectEmployee = function () { setMode('list'); open(scrim); };
  }

  /* =========================================================================
     SELECT COMPONENT
     ========================================================================= */
  function initSelectComponent() {
    var scrim = document.getElementById('pcSelCompScrim');
    if (!scrim) return;

    var COMP = [
      { id: 'c1',  name: 'Transport Allowance',     type: 'Allowance',           period: 'Monthly',  current: 500000,  next: 750000,  picked: true  },
      { id: 'c2',  name: 'Meal Allowance',          type: 'Allowance',           period: 'Monthly',  current: 600000,  next: 660000,  picked: false },
      { id: 'c3',  name: 'Communication Allowance', type: 'Allowance',           period: 'Monthly',  current: 300000,  next: 350000,  picked: false },
      { id: 'c4',  name: 'Position Allowance',      type: 'Allowance',           period: 'Monthly',  current: 1500000, next: 2000000, picked: false },
      { id: 'c5',  name: 'Overtime',                type: 'Additional Earnings', period: 'One-time', current: 0,       next: 450000,  picked: false },
      { id: 'c6',  name: 'BPJS Kesehatan',          type: 'Deduction',           period: 'Monthly',  current: 120000,  next: 140000,  picked: false },
      { id: 'c7',  name: 'BPJS Ketenagakerjaan',    type: 'Deduction',           period: 'Monthly',  current: 90000,   next: 110000,  picked: false },
      { id: 'c8',  name: 'Healthcare Benefit',      type: 'Benefit',             period: 'Yearly',   current: 250000,  next: 300000,  picked: false },
      { id: 'c9',  name: 'Pulsa Allowance',         type: 'Allowance',           period: 'Monthly',  current: 100000,  next: 150000,  picked: false },
      { id: 'c10', name: 'Late Penalty',            type: 'Deduction',           period: 'One-time', current: 50000,   next: 75000,   picked: false }
    ];

    var availList = document.getElementById('pcCompAvail');
    var selList   = document.getElementById('pcCompSelected');
    var availSearch = document.getElementById('pcCompAvailSearch');
    var selSearch   = document.getElementById('pcCompSelSearch');
    var selCount    = document.getElementById('pcCompSelCount');
    var listPane    = scrim.querySelector('[data-comppane="list"]');
    var filterPane  = scrim.querySelector('[data-comppane="filter"]');

    function rowHTML(c, picked) {
      return '<div class="ae-comp' + (picked ? ' ae-comp--picked' : '') + '" data-id="' + c.id + '">' +
        '<span class="ae-comp__name">' + c.name + '</span>' +
        '<span class="ae-comp__sub">' + c.type + ' - ' + c.period + '</span>' +
      '</div>';
    }

    function render() {
      var lq = (availSearch.value || '').trim().toLowerCase();
      var rq = (selSearch.value || '').trim().toLowerCase();
      var avail = COMP.filter(function (c) { return !c.picked && (c.name + ' ' + c.type).toLowerCase().indexOf(lq) > -1; });
      var sel   = COMP.filter(function (c) { return c.picked && (c.name + ' ' + c.type).toLowerCase().indexOf(rq) > -1; });
      availList.innerHTML = avail.length ? avail.map(function (c) { return rowHTML(c, false); }).join('')
        : '<div class="ae-assign__empty">No components to add.</div>';
      selList.innerHTML = sel.length ? sel.map(function (c) { return rowHTML(c, true); }).join('')
        : '<div class="ae-assign__empty">No component selected yet.<br>Pick from the list on the left.</div>';
      selCount.textContent = COMP.filter(function (c) { return c.picked; }).length;
    }

    availList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-comp'); if (!row) return;
      var c = COMP.filter(function (x) { return x.id === row.getAttribute('data-id'); })[0];
      if (c) { c.picked = true; render(); }
    });
    selList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-comp'); if (!row) return;
      var c = COMP.filter(function (x) { return x.id === row.getAttribute('data-id'); })[0];
      if (c) { c.picked = false; render(); }
    });
    availSearch.addEventListener('input', render);
    selSearch.addEventListener('input', render);

    document.getElementById('pcCompSelectAll').addEventListener('click', function () { COMP.forEach(function (c) { c.picked = true; }); render(); });
    document.getElementById('pcCompClear').addEventListener('click', function () { COMP.forEach(function (c) { c.picked = false; }); render(); });

    function setMode(m) {
      listPane.classList.toggle('is-active', m === 'list');
      filterPane.classList.toggle('is-active', m === 'filter');
    }
    document.getElementById('pcCompFilterBtn').addEventListener('click', function () { setMode('filter'); });
    document.getElementById('pcCompFilterBack').addEventListener('click', function () { setMode('list'); });
    document.getElementById('pcCompFilterApply').addEventListener('click', function () { setMode('list'); });
    document.getElementById('pcCompFilterReset').addEventListener('click', function () {
      scrim.querySelectorAll('.pcf-select__val').forEach(function (v) { v.classList.remove('has-value'); });
    });
    scrim.querySelectorAll('.pcf-select').forEach(function (sel) {
      sel.addEventListener('click', function () { sel.querySelector('.pcf-select__val').classList.toggle('has-value'); });
    });

    scrim.querySelectorAll('[data-close-selcomp]').forEach(function (b) { b.addEventListener('click', function () { close(scrim); }); });
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(scrim); });
    document.getElementById('pcCompSubmit').addEventListener('click', function () {
      var picked = COMP.filter(function (c) { return c.picked; });
      if (window.PC && window.PC.applyComponents && picked.length) window.PC.applyComponents(picked);
      close(scrim);
    });

    window.PCModals = window.PCModals || {};
    window.PCModals.openSelectComponent = function () { setMode('list'); render(); open(scrim); };
  }

  /* ---------- Escape closes the open modal ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    ['pcSelEmpScrim', 'pcSelCompScrim'].forEach(function (id) {
      var s = document.getElementById(id); if (s) s.classList.remove('is-open');
    });
  });

  document.addEventListener('DOMContentLoaded', function () {
    initSelectEmployee();
    initSelectComponent();
    if (window.lucide) window.lucide.createIcons();
  });
})();
