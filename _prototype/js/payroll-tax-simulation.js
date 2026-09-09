// ============================================================
// SEVAKA HRIS — Payroll · Tax Simulation · Salary Tax Calculator
// Single-page calculator. Reuses shell.js topnav/sidebar +
// design-system field/checkbox/radio/modal primitives.
// ============================================================
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ---------- Money helpers (Indonesian thousands = ".") ----------
  function fmt(n) {
    n = Math.round(n || 0);
    return n.toLocaleString('id-ID');
  }
  function idr(n) { return 'IDR ' + fmt(n); }
  function parseMoney(el) {
    if (!el) return 0;
    var d = (el.value || '').replace(/[^\d]/g, '');
    return d ? parseInt(d, 10) : 0;
  }

  // ---------- Reference data ----------
  var PTKP = {
    'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000,
    'K/0':  58500000, 'K/1':  63000000, 'K/2':  67500000, 'K/3':  72000000
  };
  // TER category by PTKP status (PMK 168/2023)
  var TER_CAT = {
    'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A',
    'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B',
    'K/3':  'C'
  };
  var JP_CAP  = 11086300;   // JP wage ceiling
  var KES_CAP = 12000000;   // BPJS Kesehatan wage ceiling

  var PTKP_OPTS   = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'];
  var CONFIG_OPTS = ['Gross', 'Gross Up', 'Nett'];

  // ---------- TER monthly rate table (Category A, PMK 168/2023) ----------
  // [upper bound inclusive, rate]. Category B / C derived with a small offset.
  var TER_A = [
    [5400000,0],[5650000,0.0025],[5950000,0.005],[6300000,0.0075],[6750000,0.01],
    [7500000,0.0125],[8550000,0.015],[9650000,0.0175],[10050000,0.02],[10350000,0.0225],
    [10700000,0.025],[11050000,0.03],[11600000,0.035],[12500000,0.04],[13750000,0.05],
    [15100000,0.06],[16950000,0.07],[19750000,0.08],[24150000,0.09],[26450000,0.10],
    [28000000,0.11],[30050000,0.12],[32400000,0.13],[35400000,0.14],[39100000,0.15],
    [43850000,0.16],[47800000,0.17],[51400000,0.18],[56300000,0.19],[62200000,0.20],
    [68600000,0.21],[77500000,0.22],[89000000,0.23],[103000000,0.24],[125000000,0.25],
    [157000000,0.26],[206000000,0.27],[337000000,0.28],[454000000,0.29],[550000000,0.30],
    [695000000,0.31],[910000000,0.32],[1400000000,0.33],[Infinity,0.34]
  ];
  function terRate(cat, monthly) {
    var rate = 0.34;
    for (var i = 0; i < TER_A.length; i++) { if (monthly <= TER_A[i][0]) { rate = TER_A[i][1]; break; } }
    if (cat === 'B') rate = Math.max(0, rate - 0.005);
    if (cat === 'C') rate = Math.max(0, rate - 0.01);
    return rate;
  }

  // ---------- Progressive annual PPh21 (Non TER) ----------
  function progressive(pkp) {
    var b = [[60000000,0.05],[250000000,0.15],[500000000,0.25],[5000000000,0.30],[Infinity,0.35]];
    var tax = 0, prev = 0;
    for (var i = 0; i < b.length; i++) {
      if (pkp > prev) { tax += (Math.min(pkp, b[i][0]) - prev) * b[i][1]; prev = b[i][0]; }
      else break;
    }
    return tax;
  }

  // =========================================================================
  // STATE
  // =========================================================================
  var state = { ptkp: '', config: '', join: '' };

  // =========================================================================
  // TABS
  // =========================================================================
  function initTabs() {
    var tabs = $('#tsTabs');
    var foot = $('#tsFoot');
    $$('#tsTabs .tab-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('#tsTabs .tab-pill').forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        var t = btn.getAttribute('data-tstab');
        $$('.ts-view').forEach(function (v) { v.classList.toggle('is-hidden', v.getAttribute('data-tsview') !== t); });
        if (foot) foot.classList.toggle('is-hidden', t !== 'calculator');
      });
    });
  }

  // =========================================================================
  // METHOD (TER / Non TER) -> Join date
  // =========================================================================
  function initMethod() {
    var joinField = $('#tsJoinField');
    $$('input[name="tsMethod"]').forEach(function (r) {
      r.addEventListener('change', function () {
        joinField.classList.toggle('is-hidden', r.value !== 'nonter' || !r.checked);
      });
    });
  }

  // =========================================================================
  // CUSTOM SELECTS (PTKP / Tax configuration)
  // =========================================================================
  function initSelects() {
    function build(name, opts, placeholder) {
      var ctl = $('[data-ts-select="' + name + '"]');
      if (!ctl) return;
      var valEl = $('.ctl__value', ctl);
      var dd = $('.dropdown', ctl);
      dd.innerHTML = opts.map(function (o) { return '<div class="dropdown__opt" data-val="' + o + '">' + o + '</div>'; }).join('');
      ctl.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = ctl.classList.contains('is-open');
        closeAll();
        if (!open) ctl.classList.add('is-open');
      });
      $$('.dropdown__opt', dd).forEach(function (opt) {
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          var v = opt.getAttribute('data-val');
          state[name] = v;
          valEl.textContent = v;
          valEl.classList.add('has-value');
          $$('.dropdown__opt', dd).forEach(function (o) { o.classList.remove('is-sel'); });
          opt.classList.add('is-sel');
          ctl.classList.remove('is-open');
        });
      });
    }
    build('ptkp', PTKP_OPTS, 'Select PTKP status');
    build('config', CONFIG_OPTS, 'Select tax configuration');

    function closeAll() { $$('.ctl--select.is-open').forEach(function (c) { c.classList.remove('is-open'); }); }
    document.addEventListener('click', function () { closeAll(); closeJoin(); });
  }

  // =========================================================================
  // JOIN-DATE month picker
  // =========================================================================
  var joinOpen = false;
  function closeJoin() { var f = $('#tsJoinDate'); if (f) f.classList.remove('is-open'); joinOpen = false; }
  function initJoinDate() {
    var field = $('#tsJoinDate');
    if (!field) return;
    var input = $('input', field);
    var now = new Date();
    var pickYear = now.getFullYear();
    var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

    var dd = document.createElement('div');
    dd.className = 'dropdown ts-monthdd';
    field.appendChild(dd);

    function render() {
      var grid = MONTHS.map(function (m, i) {
        return '<button type="button" class="ts-month" data-m="' + i + '">' + m.slice(0, 3) + '</button>';
      }).join('');
      dd.innerHTML =
        '<div class="ts-monthnav">' +
          '<button type="button" class="ts-monthnav__btn" data-yr="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
          '<span class="ts-monthnav__yr">' + pickYear + '</span>' +
          '<button type="button" class="ts-monthnav__btn" data-yr="1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
        '</div>' +
        '<div class="ts-monthgrid">' + grid + '</div>';
      $$('.ts-monthnav__btn', dd).forEach(function (b) {
        b.addEventListener('click', function (e) { e.stopPropagation(); pickYear += parseInt(b.getAttribute('data-yr'), 10); render(); });
      });
      $$('.ts-month', dd).forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var mi = parseInt(b.getAttribute('data-m'), 10);
          input.value = MONTHS[mi] + ' ' + pickYear;
          state.join = input.value;
          closeJoin();
        });
      });
    }
    render();

    field.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = field.classList.contains('is-open');
      $$('.ctl--select.is-open').forEach(function (c) { c.classList.remove('is-open'); });
      if (open) { closeJoin(); } else { field.classList.add('is-open'); joinOpen = true; }
    });
  }

  // =========================================================================
  // BPJS toggles
  // =========================================================================
  function initBpjsToggles() {
    var pairs = [['tsHasTk', 'tsTkBlock'], ['tsHasKes', 'tsKesBlock']];
    pairs.forEach(function (p) {
      var chk = $('#' + p[0]); var block = $('#' + p[1]);
      if (!chk || !block) return;
      chk.addEventListener('change', function () { block.classList.toggle('is-hidden', !chk.checked); });
    });
  }

  // =========================================================================
  // MONEY input formatting
  // =========================================================================
  function initMoney() {
    $$('input[data-money]').forEach(function (el) {
      el.addEventListener('input', function () {
        var d = el.value.replace(/[^\d]/g, '');
        el.value = d ? parseInt(d, 10).toLocaleString('id-ID') : '';
      });
    });
  }

  // =========================================================================
  // CALCULATE
  // =========================================================================
  function calculate() {
    var method = ($('input[name="tsMethod"]:checked') || {}).value || 'ter';
    var hasNpwp = $('#tsNpwp').checked;
    var hasTk   = $('#tsHasTk').checked;
    var hasKes  = $('#tsHasKes').checked;

    var basic   = parseMoney($('#tsBasic'));
    var alwTax  = parseMoney($('#tsAlwTax'));
    var dedTax  = parseMoney($('#tsDedTax'));
    var alwNon  = parseMoney($('#tsAlwNon'));
    var dedNon  = parseMoney($('#tsDedNon'));
    var thr     = parseMoney($('#tsThr'));
    var bonus   = parseMoney($('#tsBonus'));

    // ----- BPJS bases -----
    var tkBase  = hasTk ? (parseMoney($('#tsTkRate')) || basic) : 0;
    var kesBase = hasKes ? Math.min(parseMoney($('#tsKesRate')) || basic, KES_CAP) : 0;
    var jpBase  = Math.min(tkBase, JP_CAP);

    var jkkRate = parseFloat(($('input[name="tsJkk"]:checked') || {}).value || '0') / 100;
    var jpOn    = $('#tsJp').checked;            // 2% co & 1% emp
    var jhtCoOn = $('#tsJhtCo').checked;
    var jpCoOn  = $('#tsJpCo').checked;
    var kesCoOn = $('#tsKesCo').checked;

    // company-borne (allowance side)
    var jhtCo = hasTk ? tkBase * 0.037 : 0;
    var jkm   = hasTk ? tkBase * 0.003 : 0;
    var jkk   = hasTk ? tkBase * jkkRate : 0;
    var jpCo  = (hasTk && jpOn) ? jpBase * 0.02 : 0;
    var kesCo = hasKes ? kesBase * 0.04 : 0;

    // employee-borne (deduction side)
    var jhtEmp = hasTk ? tkBase * 0.02 : 0;
    var jpEmp  = (hasTk && jpOn) ? jpBase * 0.01 : 0;
    var kesEmp = hasKes ? kesBase * 0.01 : 0;

    // ----- Taxable monthly base -----
    // company-paid premiums treated as taxable allowance only when "by company" ticked
    var taxableMonthly = basic + alwTax - dedTax;
    if (jhtCoOn) taxableMonthly += jhtCo;
    if (jpCoOn)  taxableMonthly += jpCo;
    if (kesCoOn) taxableMonthly += kesCo;
    if (hasTk)   taxableMonthly += jkk + jkm;   // JKK / JKM premiums are employee benefits
    taxableMonthly = Math.max(0, taxableMonthly);

    var pph = 0, pphBonus = 0;
    var npwpMul = hasNpwp ? 1 : 1.2;

    if (method === 'ter') {
      var cat = TER_CAT[state.ptkp] || 'A';
      pph = taxableMonthly * terRate(cat, taxableMonthly) * npwpMul;
      var irr = thr + bonus;
      if (irr > 0) {
        pphBonus = irr * terRate(cat, taxableMonthly + irr) * npwpMul;
      }
    } else {
      var ptkpAmt = PTKP[state.ptkp] || PTKP['TK/0'];
      // deductible: occupational cost (5%, max 6jt/yr) + JHT/JP employee
      function annualTax(extra) {
        var grossAnnual = taxableMonthly * 12 + extra;
        var occ = Math.min(grossAnnual * 0.05, 6000000);
        var bpjsAnnual = (jhtEmp + jpEmp) * 12;
        var net = grossAnnual - occ - bpjsAnnual;
        var pkp = Math.max(0, Math.floor((net - ptkpAmt) / 1000) * 1000);
        return progressive(pkp) * npwpMul;
      }
      var taxReg = annualTax(0);
      var taxAll = annualTax(thr + bonus);
      pph = taxReg / 12;
      pphBonus = Math.max(0, taxAll - taxReg);
    }

    // ----- Totals -----
    var totalAlw = jhtCo + jpCo + kesCo + thr + bonus;
    var totalDed = jhtEmp + jpEmp + kesEmp + pph + pphBonus;

    var grossCash = basic + alwTax + alwNon + thr + bonus;
    var thp = grossCash - dedTax - dedNon - jhtEmp - jpEmp - kesEmp - pph - pphBonus;

    // ----- Populate modal -----
    $('#tcSalary').textContent  = idr(basic);
    $('#tcJhtCo').textContent   = idr(jhtCo);
    $('#tcJpCo').textContent    = idr(jpCo);
    $('#tcKesCo').textContent   = idr(kesCo);
    $('#tcThr').textContent     = idr(thr);
    $('#tcBonus').textContent   = idr(bonus);
    $('#tcTotalAlw').textContent= idr(totalAlw);

    $('#tcJhtEmp').textContent  = idr(jhtEmp);
    $('#tcJpEmp').textContent   = idr(jpEmp);
    $('#tcKesEmp').textContent  = idr(kesEmp);
    $('#tcPph').textContent     = idr(pph);
    $('#tcPphBonus').textContent= idr(pphBonus);
    $('#tcTotalDed').textContent= idr(totalDed);

    $('#tcThp').textContent     = idr(thp);

    openModal($('#tcScrim'));
  }

  // =========================================================================
  // MODALS + TOAST
  // =========================================================================
  function openModal(scrim) { if (scrim) { scrim.classList.add('is-open'); scrim.setAttribute('aria-hidden', 'false'); } }
  function closeModal(scrim) { if (scrim) { scrim.classList.remove('is-open'); scrim.setAttribute('aria-hidden', 'true'); } }

  var toastTimer;
  function toast(msg) {
    var t = $('#tsToast');
    $('#tsToastMsg').textContent = msg || 'Tax calculated.';
    t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  function initModals() {
    $$('[data-close-tc]').forEach(function (b) { b.addEventListener('click', function () { closeModal($('#tcScrim')); }); });
    $$('[data-close-reset]').forEach(function (b) { b.addEventListener('click', function () { closeModal($('#tsResetScrim')); }); });
    $$('.modal-scrim').forEach(function (s) {
      s.addEventListener('click', function (e) { if (e.target === s) closeModal(s); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') $$('.modal-scrim.is-open').forEach(closeModal);
    });

    $('#tsCalc').addEventListener('click', calculate);
    $('#tsReset').addEventListener('click', function () { openModal($('#tsResetScrim')); });
    $('#tsResetConfirm').addEventListener('click', function () { doReset(); closeModal($('#tsResetScrim')); toast('Calculator reset.'); });
  }

  // =========================================================================
  // RESET
  // =========================================================================
  function doReset() {
    $$('input[data-money]').forEach(function (el) { el.value = ''; });
    $$('input[type="checkbox"]').forEach(function (el) { el.checked = false; });
    var ter = $('input[name="tsMethod"][value="ter"]'); if (ter) ter.checked = true;
    $$('input[name="tsJkk"]').forEach(function (el) { el.checked = false; });
    $('#tsJoinField').classList.add('is-hidden');
    $('#tsTkBlock').classList.add('is-hidden');
    $('#tsKesBlock').classList.add('is-hidden');
    var ji = $('#tsJoinDate input'); if (ji) ji.value = '';
    ['ptkp', 'config'].forEach(function (n) {
      var ctl = $('[data-ts-select="' + n + '"]');
      var v = $('.ctl__value', ctl);
      v.textContent = n === 'ptkp' ? 'Select PTKP status' : 'Select tax configuration';
      v.classList.remove('has-value');
      $$('.dropdown__opt', ctl).forEach(function (o) { o.classList.remove('is-sel'); });
    });
    state = { ptkp: '', config: '', join: '' };
  }

  // =========================================================================
  // TAX RECALCULATE
  // =========================================================================
  var MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  var TR_EMP = [
    { id: 'CP057', name: 'Mitsui Nol',      loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP058', name: 'Mitsui Satu',     loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP059', name: 'Mitsui Dua',      loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP060', name: 'Mitsui Tiga',     loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP061', name: 'Mitsui Empat',    loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP062', name: 'Mitsui Lima',     loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP063', name: 'Mitsui Enam',     loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP064', name: 'Mitsui Tujuh',    loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP065', name: 'Mitsui Tujuh',    loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP066', name: 'Mitsui Delapan',  loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP067', name: 'Mitsui Sembilan', loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP068', name: 'Mitsui Sepuluh',  loc: 'Jakarta | IT Staff - SQA', sel: false },
    { id: 'CP069', name: 'Mitsui Sebelas',  loc: 'Jakarta | IT Staff - SQA', sel: false }
  ];
  var TR_AVATAR = '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="18" r="8" fill="#fff" opacity="0.92"/><path d="M10 42c1.5-9 7.5-13 14-13s12.5 4 14 13z" fill="#fff" opacity="0.92"/></svg>';
  var TR_PLUS  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>';
  var TR_MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>';

  var trState = { month: '', year: '' };

  function trEmpRow(e, selected) {
    return '<div class="ae-emp' + (selected ? ' ae-emp--assigned' : '') + '" data-id="' + e.id + '">' +
      '<span class="ae-emp__avatar">' + TR_AVATAR + '</span>' +
      '<span class="ae-emp__meta">' +
        '<span class="ae-emp__name">' + e.id + ' - ' + e.name + '</span>' +
        '<span class="ae-emp__sub">' + e.loc + '</span>' +
      '</span>' +
      '<span class="ae-emp__act">' + (selected ? TR_MINUS : TR_PLUS) + '</span>' +
    '</div>';
  }

  // --- Period selects (month / year) ---
  function initTrPeriod() {
    var YEARS = [];
    var nowY = new Date().getFullYear();
    for (var y = nowY + 1; y >= nowY - 3; y--) YEARS.push(String(y));

    function build(name, opts, placeholder) {
      var ctl = $('[data-tr-select="' + name + '"]');
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
          var v = opt.getAttribute('data-val');
          trState[name] = v;
          valEl.textContent = v;
          valEl.classList.add('has-value');
          $$('.dropdown__opt', dd).forEach(function (o) { o.classList.remove('is-sel'); });
          opt.classList.add('is-sel');
          ctl.classList.remove('is-open');
        });
      });
    }
    build('month', MONTHS_FULL, 'Select month');
    build('year', YEARS, 'Select year');

    // Filter selects (sample reference data, no live binding)
    var FILTER_OPTS = {
      branch:   ['Jakarta', 'Bandung', 'Surabaya'],
      org:      ['Information Technology', 'Finance', 'Human Resource'],
      level:    ['Staff', 'Supervisor', 'Manager'],
      position: ['IT Staff - SQA', 'IT Staff - Dev', 'Finance Staff'],
      status:   ['Permanent', 'Contract', 'Probation']
    };
    Object.keys(FILTER_OPTS).forEach(function (name) {
      var ctl = $('[data-tr-filter="' + name + '"]');
      if (!ctl) return;
      var valEl = $('.ctl__value', ctl);
      var dd = $('.dropdown', ctl);
      dd.innerHTML = FILTER_OPTS[name].map(function (o) { return '<div class="dropdown__opt" data-val="' + o + '">' + o + '</div>'; }).join('');
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
    });
  }

  // --- Select Employee modal ---
  function initTrEmpModal() {
    var scrim = $('#trEmpScrim');
    if (!scrim) return;

    var selBtn  = $('#trSelectBtn');
    var selAll  = $('#trSelAll');
    var leftList  = $('#trLeftList');
    var rightList = $('#trRightList');
    var selList   = $('#trSelList');
    var srch  = $('#trSearch');
    var srch2 = $('#trSearch2');
    var selSrch = $('#trSelSearch');

    function selectedAll() { return TR_EMP.filter(function (e) { return e.sel; }); }

    function updateMainBtn() {
      var n = selectedAll().length;
      selBtn.textContent = n > 0 ? 'Selected Employee (' + n + ')' : 'Select Employee';
      if (selAll) selAll.checked = n === TR_EMP.length && n > 0;
    }

    function render() {
      var q  = (srch.value || srch2.value || '').toLowerCase();
      var sq = (selSrch.value || '').toLowerCase();
      var avail = TR_EMP.filter(function (e) { return !e.sel; });
      var availShown = avail.filter(function (e) { return (e.id + ' ' + e.name).toLowerCase().indexOf(q) > -1; });
      var sel = selectedAll().filter(function (e) { return (e.id + ' ' + e.name).toLowerCase().indexOf(sq) > -1; });

      var availHTML = availShown.length
        ? availShown.map(function (e) { return trEmpRow(e, false); }).join('')
        : '<div class="ae-assign__empty">No employees to add.</div>';
      leftList.innerHTML = availHTML;
      rightList.innerHTML = availHTML;

      selList.innerHTML = sel.length
        ? sel.map(function (e) { return trEmpRow(e, true); }).join('')
        : '<div class="ae-assign__empty">No employees selected yet.<br>Pick from the list on the left.</div>';

      $('#trViewShown').textContent = availShown.length;
      $('#trViewTotal').textContent = avail.length;
      $('#trViewShown2').textContent = availShown.length;
      $('#trViewTotal2').textContent = avail.length;
      $('#trSelCount').textContent = selectedAll().length;
    }

    function open() {
      showPane('left', 'list');
      showPane('right', 'selected');
      render();
      openModal(scrim);
    }
    function close() { closeModal(scrim); }

    // pane toggle
    var panes = scrim.querySelectorAll('.ae-assign__pane');
    function showPane(side, name) {
      panes.forEach(function (p) {
        if (p.getAttribute('data-trside') !== side) return;
        p.classList.toggle('is-active', p.getAttribute('data-trpane') === name);
      });
    }

    selBtn.addEventListener('click', open);
    $$('[data-tr-close-emp]').forEach(function (b) { b.addEventListener('click', close); });

    // select / deselect
    function pick(e) {
      var row = e.target.closest('.ae-emp');
      if (!row) return;
      var emp = TR_EMP.find(function (x) { return x.id === row.getAttribute('data-id'); });
      if (emp) { emp.sel = true; render(); }
    }
    leftList.addEventListener('click', pick);
    rightList.addEventListener('click', pick);
    selList.addEventListener('click', function (e) {
      var row = e.target.closest('.ae-emp');
      if (!row) return;
      var emp = TR_EMP.find(function (x) { return x.id === row.getAttribute('data-id'); });
      if (emp) { emp.sel = false; render(); }
    });

    [srch, srch2, selSrch].forEach(function (i) { i.addEventListener('input', render); });

    $('#trSelectAllLink').addEventListener('click', function () { TR_EMP.forEach(function (e) { e.sel = true; }); render(); });
    $('#trSelectAllLink2').addEventListener('click', function () { TR_EMP.forEach(function (e) { e.sel = true; }); render(); });
    $('#trClearSelection').addEventListener('click', function () { TR_EMP.forEach(function (e) { e.sel = false; }); render(); });

    // filter sub-view
    $('#trOpenFilter').addEventListener('click', function () { showPane('left', 'filter'); showPane('right', 'list'); });
    $('#trBackToList').addEventListener('click', function () { showPane('left', 'list'); showPane('right', 'selected'); });
    $('#trApplyFilter').addEventListener('click', function () { showPane('left', 'list'); showPane('right', 'selected'); });
    $('#trResetFilter').addEventListener('click', function () {
      $$('[data-tr-filter]', scrim).forEach(function (ctl) {
        var v = $('.ctl__value', ctl);
        var ph = { branch: 'Select branch', org: 'Select organization', level: 'Select job level', position: 'Select job position', status: 'Select employment status' }[ctl.getAttribute('data-tr-filter')];
        v.textContent = ph;
        v.classList.remove('has-value');
        $$('.dropdown__opt', ctl).forEach(function (o) { o.classList.remove('is-sel'); });
      });
    });

    // submit / cancel reconcile button label
    $('#trEmpSubmit').addEventListener('click', function () {
      updateMainBtn();
      close();
      toast(selectedAll().length + ' employee(s) selected.');
    });

    // "Select all employee" on the main form
    if (selAll) {
      selAll.addEventListener('change', function () {
        TR_EMP.forEach(function (e) { e.sel = selAll.checked; });
        updateMainBtn();
      });
    }

    // Reset / Recalculate (main form)
    $('#trReset').addEventListener('click', function () {
      TR_EMP.forEach(function (e) { e.sel = false; });
      if (selAll) selAll.checked = false;
      $('#trDtp').checked = false;
      ['month', 'year'].forEach(function (n) {
        var ctl = $('[data-tr-select="' + n + '"]');
        var v = $('.ctl__value', ctl);
        v.textContent = n === 'month' ? 'Select month' : 'Select year';
        v.classList.remove('has-value');
        $$('.dropdown__opt', ctl).forEach(function (o) { o.classList.remove('is-sel'); });
      });
      trState = { month: '', year: '' };
      updateMainBtn();
      toast('Recalculation reset.');
    });
    $('#trRecalc').addEventListener('click', function () { openModal($('#trConfirmScrim')); });

    // confirm modal
    $$('[data-tr-close-confirm]').forEach(function (b) { b.addEventListener('click', function () { closeModal($('#trConfirmScrim')); }); });
    $('#trConfirmContinue').addEventListener('click', function () {
      closeModal($('#trConfirmScrim'));
      toast('Tax recalculated. Tax Detail Report updated.');
    });

    updateMainBtn();
  }

  // =========================================================================
  // INIT
  // =========================================================================
  function init() {
    initTabs();
    initMethod();
    initSelects();
    initJoinDate();
    initBpjsToggles();
    initMoney();
    initModals();
    initTrPeriod();
    initTrEmpModal();
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
