// ============================================================
// SEVAKA HRIS — Time › Time Off Balance (emp_leave_balance + ledger)
// FSD-001-TIME §3 · UIC-001-TIME §4
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var BAL = T.LEAVE_BALANCES.map(function (b) { return Object.assign({}, b); });
  var LED = T.LEDGER.map(function (l) { return Object.assign({}, l); });
  var fb = { emp: '', type: '', year: '' }, fl = { emp: '', source: '', type: '', year: '' };
  var $ = function (id) { return document.getElementById(id); };
  var pgBal = F.pager('pgBal', 10, function () { drawBal(); }, 'balances');
  var pgLed = F.pager('pgLed', 10, function () { drawLed(); }, 'entries');

  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function numCell(n, dec) {
    var cls = n < 0 ? 'tm-num tm-num--neg' : 'tm-num';
    return '<span class="' + cls + '">' + (n > 0 && dec === 'signed' ? '+' : '') + T.num(n, 2) + '</span>';
  }

  function drawBal() {
    var all = BAL.filter(function (b) {
      if (fb.emp && b.employee_id !== fb.emp) return false;
      if (fb.type && b.leave_type_id !== fb.type) return false;
      if (fb.year && b.period_year !== +fb.year) return false;
      return true;
    });
    var view = pgBal.slice(all);
    $('cntBal').textContent = BAL.length;
    $('balBody').innerHTML = view.length ? view.map(function (b) {
      return '<tr>' +
        '<td>' + T.person(b.employee_id) + '</td>' +
        '<td>' + T.lt(b.leave_type_id).leave_name + '</td>' +
        '<td>' + b.period_year + '</td>' +
        '<td class="ta-r">' + numCell(b.balance_days) + '</td>' +
        '<td class="ta-r">' + numCell(b.projected_days) + '</td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" data-det="' + b.id + '">View Detail</button></div></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty"><div class="tempty__t">No balance row matches these filters.</div></div></td></tr>';
    pgBal.paint();
  }

  function drawLed() {
    var all = LED.filter(function (l) {
      if (fl.emp && l.employee_id !== fl.emp) return false;
      if (fl.source && l.mutation_source !== fl.source) return false;
      if (fl.type && l.leave_type_id !== fl.type) return false;
      if (fl.year && l.period_year !== +fl.year) return false;
      return true;
    }).sort(function (a, b) { return a.mutation_date < b.mutation_date ? 1 : -1; });
    var view = pgLed.slice(all);
    $('cntLed').textContent = LED.length;
    $('ledBody').innerHTML = view.length ? view.map(function (l) {
      var reason = l.reason
        ? '<span class="tm-trunc" title="' + l.reason.replace(/"/g, '&quot;') + '">' + l.reason + '</span>'
        : '<span class="cell-dim">Automatic accrual — no reason required</span>';
      return '<tr>' +
        '<td class="cell-strong">' + T.d(l.mutation_date) + '</td>' +
        '<td>' + T.emp(l.employee_id).name + '</td>' +
        '<td>' + T.lt(l.leave_type_id).leave_name + '</td>' +
        '<td>' + T.badge(l.mutation_source, T.LABEL.mutation) + '</td>' +
        '<td class="ta-r">' + numCell(l.delta_days, 'signed') + '</td>' +
        '<td>' + reason + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><div class="tempty"><div class="tempty__t">No ledger entry matches these filters.</div></div></td></tr>';
    pgLed.paint();
  }

  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || ''; v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var empOpts = T.EMPLOYEES.filter(function (e) { return e.id !== 'emp-sys'; });
    var empAll = '<div class="dropdown__opt is-sel" data-val="">All employees</div>' +
      empOpts.map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + '</div>'; }).join('');
    T.fillSelect('fltEmp', empAll);
    T.fillSelect('lfEmp', empAll);
    T.fillSelect('afEmp', empOpts.map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + e.name + '</div>'; }).join(''));
    var typeAll = '<div class="dropdown__opt is-sel" data-val="">All leave types</div>' +
      T.LEAVE_TYPES.map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.leave_name + '</div>'; }).join('');
    T.fillSelect('fltType', typeAll);
    T.fillSelect('lfType', typeAll);
    var years = [];
    BAL.concat(LED).forEach(function (r) { if (years.indexOf(r.period_year) < 0) years.push(r.period_year); });
    years.sort(function (a, b) { return b - a; });
    var yearAll = '<div class="dropdown__opt is-sel" data-val="">All years</div>' +
      years.map(function (y) { return '<div class="dropdown__opt" data-val="' + y + '">' + y + '</div>'; }).join('');
    T.fillSelect('fltYear', yearAll);
    T.fillSelect('lfYear', yearAll);
    T.fillSelect('afType', T.LEAVE_TYPES.map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + t.leave_name + '</div>'; }).join(''));
    T.fillSelect('lfSource', '<div class="dropdown__opt is-sel" data-val="">All mutation sources</div>' +
      Object.keys(T.LABEL.mutation).map(function (k) { return '<div class="dropdown__opt" data-val="' + k + '">' + T.LABEL.mutation[k] + '</div>'; }).join(''));
    drawBal(); drawLed();

    $('fltEmp').addEventListener('select', function (e) { fb.emp = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgBal.reset(); drawBal(); });
    $('fltType').addEventListener('select', function (e) { fb.type = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgBal.reset(); drawBal(); });
    $('fltYear').addEventListener('select', function (e) { fb.year = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgBal.reset(); drawBal(); });
    $('lfEmp').addEventListener('select', function (e) { fl.emp = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgLed.reset(); drawLed(); });
    $('lfSource').addEventListener('select', function (e) { fl.source = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgLed.reset(); drawLed(); });
    $('lfType').addEventListener('select', function (e) { fl.type = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgLed.reset(); drawLed(); });
    $('lfYear').addEventListener('select', function (e) { fl.year = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgLed.reset(); drawLed(); });

    $('balBody').addEventListener('click', function (e) {
      var b = e.target.closest('[data-det]'); if (!b) return;
      var row = T.byId(BAL, b.getAttribute('data-det'));
      var entries = LED.filter(function (l) { return l.employee_id === row.employee_id && l.leave_type_id === row.leave_type_id && l.period_year === row.period_year; });
      $('bdKv').innerHTML = kv([
        ['Employee', T.emp(row.employee_id).name], ['Leave type', T.lt(row.leave_type_id).leave_name],
        ['Entitlement year', row.period_year],
        ['Running balance', numCell(row.balance_days) + ' days'],
        ['Year-end projection', numCell(row.projected_days) + ' days'],
        ['Ledger entries behind it', entries.length]
      ]);
      F.openModal('balDetail');
    });

    $('newAdjBtn').addEventListener('click', function () {
      setSel('afEmp', '', 'Select employee'); setSel('afType', '', 'Select leave type');
      $('afYear').value = 2026; F.setDate($('afDate'), ''); $('afDelta').value = ''; $('afReason').value = '';
      F.openModal('adjForm');
    });
    $('afEmp').addEventListener('select', function (e) { $('afEmp').dataset.val = e.detail.value; });
    $('afType').addEventListener('select', function (e) { $('afType').dataset.val = e.detail.value; });

    $('afSave').addEventListener('click', function () {
      var emp = $('afEmp').dataset.val, type = $('afType').dataset.val;
      var year = +$('afYear').value, date = $('afDate').dataset.iso;
      var delta = parseFloat($('afDelta').value), reason = $('afReason').value.trim();
      if (!emp || !type || !date || !year) { F.toast('422 — employee, leave type, year and mutation date are all required.', 'danger'); return; }
      if (year < 2000 || year > 2999) { F.toast('422 — the entitlement year must be between 2000 and 2999.', 'danger'); return; }
      if (isNaN(delta) || delta === 0) { F.toast('422 — the delta is required and may not be zero.', 'danger'); return; }
      if (!reason) { F.toast('422 — a reason is mandatory for a manual adjustment.', 'danger'); return; }
      LED.push({
        id: 'ledger-' + (LED.length + 10), employee_id: emp, leave_type_id: type, period_year: year,
        mutation_date: date, delta_days: delta, mutation_source: 'HR_ADJUSTMENT', ref_id: null,
        reason: reason, created_at: new Date().toISOString(), created_by: T.ME
      });
      var row = BAL.filter(function (b) { return b.employee_id === emp && b.leave_type_id === type && b.period_year === year; })[0];
      if (row) { row.balance_days += delta; row.projected_days += delta; }
      else BAL.push({ id: 'bal-' + (BAL.length + 10), employee_id: emp, leave_type_id: type, period_year: year, balance_days: delta, projected_days: delta });
      F.closeModal('adjForm'); pgLed.reset(); drawLed(); drawBal();
      F.toast('201 — adjustment written; the running balance is re-summed from the ledger.', 'ok');
    });
  });
})();
