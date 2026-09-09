// ============================================================
// SEVAKA HRIS — Payroll Component
// Pill tabs (Update / Ex-Employee / Settings), sub-tabs
// (Update History / Employee History), data rendering, toolbar
// dropdowns, per-row action menus, and the Update Component modal.
// ============================================================
(function () {
  'use strict';

  /* ===================== DATA ===================== */
  var TYPE_META = {
    'Allowance':           'pc-typetag--allowance',
    'Additional Earnings': 'pc-typetag--addition',
    'Deduction':           'pc-typetag--deduction',
    'Benefit':             'pc-typetag--benefit',
    'Basic Salary':        'pc-typetag--basic'
  };

  var updateRows = [
    { id: 'TRX-PC-260301', type: 'Allowance',           date: '01 Mar 2026', by: 'Tony Stark',       emps: 12, comp: 'Transport Allowance +2', status: 'Active' },
    { id: 'TRX-PC-260228', type: 'Deduction',           date: '01 Mar 2026', by: 'Natasha Romanoff', emps: 48, comp: 'BPJS Kesehatan',         status: 'Active' },
    { id: 'TRX-PC-260215', type: 'Additional Earnings', date: '15 Feb 2026', by: 'Tony Stark',       emps: 6,  comp: 'Overtime',               status: 'Active' },
    { id: 'TRX-PC-260201', type: 'Benefit',             date: '01 Feb 2026', by: 'Pepper Potts',     emps: 23, comp: 'Healthcare Benefit',     status: 'Active' },
    { id: 'TRX-PC-260120', type: 'Basic Salary',        date: '01 Feb 2026', by: 'Tony Stark',       emps: 5,  comp: 'Basic Salary',           status: 'Expired' },
    { id: 'TRX-PC-260105', type: 'Allowance',           date: '05 Jan 2026', by: 'Natasha Romanoff', emps: 18, comp: 'Communication Allowance', status: 'Active' }
  ];

  var empRows = [
    { id: 'TRX-EC-260301', emp: 'CP060 - Mitsui Tiga',    sub: 'Jakarta | IT Staff - SQA',     dino: true,  comp: 'Transport Allowance',     type: 'Allowance',    last: 500000,  next: 750000,  eff: '01 Mar 2026', end: '—' },
    { id: 'TRX-EC-260301', emp: 'CP060 - Mitsui Tiga',    sub: 'Jakarta | IT Staff - SQA',     dino: true,  comp: 'Meal Allowance',          type: 'Allowance',    last: 600000,  next: 660000,  eff: '01 Mar 2026', end: '—' },
    { id: 'TRX-EC-260228', emp: 'CP041 - Bayu Pratama',   sub: 'Jakarta | Finance - Staff',    init: 'BP',  comp: 'BPJS Kesehatan',          type: 'Deduction',    last: 120000,  next: 140000,  eff: '01 Mar 2026', end: '—' },
    { id: 'TRX-EC-260215', emp: 'CP028 - Sari Wulandari', sub: 'Bandung | HR - Officer',       init: 'SW',  comp: 'Position Allowance',      type: 'Allowance',    last: 1500000, next: 2000000, eff: '15 Feb 2026', end: '31 Dec 2026' },
    { id: 'TRX-EC-260201', emp: 'CP015 - Andi Nugroho',   sub: 'Surabaya | Sales - Supervisor',init: 'AN',  comp: 'Communication Allowance', type: 'Allowance',    last: 300000,  next: 250000,  eff: '01 Feb 2026', end: '—' },
    { id: 'TRX-EC-260120', emp: 'CP060 - Mitsui Tiga',    sub: 'Jakarta | IT Staff - SQA',     dino: true,  comp: 'Basic Salary',            type: 'Basic Salary', last: 9000000, next: 9500000, eff: '01 Feb 2026', end: '—' }
  ];

  /* ===================== HELPERS ===================== */
  function rupiah(n) {
    return 'Rp ' + n.toLocaleString('id-ID');
  }

  var dinoSeq = 0;
  function dinoAvatar() {
    var gid = 'pcAv' + (++dinoSeq);
    return (
      '<span class="pp-emp__avatar" style="background:none">' +
        '<svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg" style="width:46px;height:46px;border-radius:50%">' +
          '<defs><linearGradient id="' + gid + '" x1="0" x2="0" y1="0" y2="1">' +
            '<stop offset="0%" stop-color="#a8d479"/><stop offset="100%" stop-color="#6ba23f"/>' +
          '</linearGradient></defs>' +
          '<rect width="42" height="42" fill="url(#' + gid + ')"/>' +
          '<ellipse cx="21" cy="18" rx="9" ry="10" fill="#f0c39a"/>' +
          '<path d="M14 12 q7 -8 14 0 q1 4 -2 6 q-3 -4 -10 -4 q-3 0 -4 4 q-2 -2 2 -6z" fill="#3d2415"/>' +
          '<path d="M14 22 q1 6 7 7 q6 -1 7 -7 q-3 2 -7 2 q-4 0 -7 -2z" fill="#3d2415"/>' +
          '<path d="M6 42 q3 -10 15 -10 q12 0 15 10z" fill="#1f4a26"/>' +
        '</svg>' +
      '</span>'
    );
  }
  function initialAvatar(init) {
    return '<span class="pp-emp__avatar" style="font:700 16px/1 var(--font-body)">' + init + '</span>';
  }

  function empCell(r) {
    return (
      '<div class="pp-emp">' +
        (r.dino ? dinoAvatar() : initialAvatar(r.init)) +
        '<div class="pp-emp__meta">' +
          '<div class="pp-emp__name">' + r.emp + '</div>' +
          '<div class="pp-emp__sub">' + r.sub + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function typeTag(type) {
    return '<span class="pc-typetag ' + (TYPE_META[type] || 'pc-typetag--basic') + '">' + type + '</span>';
  }

  function statusPill(status) {
    var cls = String(status).toLowerCase() === 'expired' ? 'pc-status--expired' : 'pc-status--active';
    return '<span class="pc-status ' + cls + '">' + String(status).toUpperCase() + '</span>';
  }

  function actionCell() {
    return (
      '<td class="pp-cell-act">' +
        '<div class="pc-actwrap">' +
          '<button class="pc-actbtn" type="button" data-actbtn>Action' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
          '</button>' +
          '<div class="pc-actmenu" data-actmenu>' +
            '<button class="pc-menu__item" type="button" data-act="view"><i data-lucide="eye"></i>View detail</button>' +
            '<button class="pc-menu__item" type="button" data-act="edit"><i data-lucide="pencil"></i>Edit</button>' +
            '<button class="pc-menu__item is-danger" type="button" data-act="delete"><i data-lucide="trash-2"></i>Delete</button>' +
          '</div>' +
        '</div>' +
      '</td>'
    );
  }

  /* ===================== RENDER ===================== */
  function renderUpdate(rows) {
    var html = rows.map(function (r) {
      return (
        '<tr>' +
          '<td><span class="pc-idlink">' + r.id + '</span></td>' +
          '<td>' + typeTag(r.type) + '</td>' +
          '<td>' + r.date + '</td>' +
          '<td>' + r.by + '</td>' +
          '<td><span class="pc-view"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>View</span></td>' +
          '<td><span class="pc-emps">' + r.emps + ' employees</span></td>' +
          '<td>' + r.comp + '</td>' +
          '<td>' + statusPill(r.status) + '</td>' +
          actionCell() +
        '</tr>'
      );
    }).join('');
    document.getElementById('pcUpdRows').innerHTML = html ||
      '<tr><td colspan="9" style="text-align:center;color:var(--fg-4);padding:32px 0">No transactions found.</td></tr>';
    setShowing('pcUpdShowing', rows.length);
    refreshIcons();
  }

  function renderEmp(rows) {
    var html = rows.map(function (r) {
      var delta = r.next - r.last;
      var deltaCls = delta >= 0 ? 'pc-amt__delta--up' : 'pc-amt__delta--down';
      var deltaTxt = (delta >= 0 ? '+' : '−') + rupiah(Math.abs(delta)).replace('Rp ', 'Rp ');
      return (
        '<tr>' +
          '<td><span class="pc-idlink">' + r.id + '</span></td>' +
          '<td>' + empCell(r) + '</td>' +
          '<td>' + r.comp + '</td>' +
          '<td>' + typeTag(r.type) + '</td>' +
          '<td><span class="pc-amt pc-amt--dim">' + rupiah(r.last) + '</span></td>' +
          '<td><span class="pc-amt pc-amt--new">' + rupiah(r.next) + '</span>' +
            '<span class="pc-amt__delta ' + deltaCls + '">' + deltaTxt + '</span></td>' +
          '<td>' + r.eff + '</td>' +
          '<td>' + (r.end === '—' ? '<span class="pc-amt--dim">—</span>' : r.end) + '</td>' +
        '</tr>'
      );
    }).join('');
    document.getElementById('pcEmpRows').innerHTML = html ||
      '<tr><td colspan="8" style="text-align:center;color:var(--fg-4);padding:32px 0">No records found.</td></tr>';
    setShowing('pcEmpShowing', rows.length);
    refreshIcons();
  }

  function setShowing(id, n) {
    var el = document.getElementById(id);
    if (el) el.textContent = n ? ('Showing 1–' + n + ' of ' + n) : 'Showing 0 of 0';
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  /* ===================== MENU UTILITIES ===================== */
  function closeAllPcMenus(except) {
    document.querySelectorAll('.pc-menu.is-open, .pc-actmenu.is-open').forEach(function (m) {
      if (m !== except) m.classList.remove('is-open');
    });
    document.querySelectorAll('.pc-period.is-open, .pc-select.is-open, .pc-actbtn.is-open').forEach(function (b) {
      if (b !== except) b.classList.remove('is-open');
    });
  }

  function bindToggle(trigger, menu, openMarker) {
    if (!trigger || !menu) return;
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !menu.classList.contains('is-open');
      closeAllPcMenus();
      // also close shell menus
      document.querySelectorAll('.menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      if (willOpen) {
        menu.classList.add('is-open');
        if (openMarker) openMarker.classList.add('is-open');
      }
    });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
  }

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', function () {
    renderUpdate(updateRows);
    renderEmp(empRows);

    /* ----- Pill tabs (Update / Ex-Employee / Settings) ----- */
    var pcTabs = document.getElementById('pcTabs');
    pcTabs.querySelectorAll('.tab-pill').forEach(function (tab) {
      tab.addEventListener('click', function () {
        pcTabs.querySelectorAll('.tab-pill').forEach(function (t) { t.classList.remove('is-on'); });
        tab.classList.add('is-on');
        var which = tab.getAttribute('data-pctab');
        document.querySelectorAll('[data-pcview]').forEach(function (v) {
          v.classList.toggle('is-hidden', v.getAttribute('data-pcview') !== which);
        });
      });
    });

    /* ----- Sub-tabs (Update History / Employee History) ----- */
    var subtabs = document.getElementById('pcSubtabs');
    subtabs.querySelectorAll('.pc-subtab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        subtabs.querySelectorAll('.pc-subtab').forEach(function (t) { t.classList.remove('is-on'); });
        tab.classList.add('is-on');
        var which = tab.getAttribute('data-pcsub');
        document.querySelectorAll('[data-pcsubview]').forEach(function (v) {
          v.classList.toggle('is-active', v.getAttribute('data-pcsubview') === which);
        });
      });
    });

    /* ----- Search filters ----- */
    var updSearch = document.getElementById('pcUpdSearch');
    updSearch.addEventListener('input', function () {
      var q = updSearch.value.trim().toLowerCase();
      renderUpdate(updateRows.filter(function (r) {
        return (r.id + ' ' + r.type + ' ' + r.date + ' ' + r.by).toLowerCase().indexOf(q) !== -1;
      }));
    });
    var empSearch = document.getElementById('pcEmpSearch');
    empSearch.addEventListener('input', function () {
      var q = empSearch.value.trim().toLowerCase();
      renderEmp(empRows.filter(function (r) {
        return (r.id + ' ' + r.emp + ' ' + r.sub + ' ' + r.comp + ' ' + r.type).toLowerCase().indexOf(q) !== -1;
      }));
    });

    /* ----- More menu ----- */
    bindToggle(document.getElementById('pcMoreBtn'), document.getElementById('pcMoreMenu'));
    document.getElementById('pcMoreMenu').querySelectorAll('[data-more]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var act = opt.getAttribute('data-more');
        closeAllPcMenus();
        if (act === 'settings') {
          var sTab = pcTabs.querySelector('[data-pctab="settings"]');
          if (sTab) sTab.click();
        } else if (act === 'export') {
          showToast('Exporting component list…');
        }
      });
    });

    /* ----- Period menu ----- */
    var period = document.getElementById('pcPeriod');
    var periodMenu = document.getElementById('pcPeriodMenu');
    bindToggle(period, periodMenu, period);
    periodMenu.querySelectorAll('[data-period]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        period.querySelector('.pc-period__val').textContent = opt.getAttribute('data-period');
        closeAllPcMenus();
      });
    });

    /* ----- Component select menu ----- */
    var compSel = document.getElementById('pcCompSelect');
    var compMenu = document.getElementById('pcCompMenu');
    bindToggle(compSel, compMenu, compSel);
    compMenu.querySelectorAll('[data-comp]').forEach(function (opt) {
      opt.addEventListener('click', function () {
        var val = opt.getAttribute('data-comp');
        compSel.querySelector('.pc-select__val').textContent = val;
        closeAllPcMenus();
        if (val === 'All payroll components') { renderEmp(empRows); return; }
        renderEmp(empRows.filter(function (r) { return r.type === val; }));
      });
    });

    /* ----- Toast helper ----- */
    function showToast(msg) {
      var toast = document.getElementById('pcToast');
      document.getElementById('pcToastMsg').textContent = msg;
      toast.classList.add('is-shown');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function () { toast.classList.remove('is-shown'); }, 2600);
    }

    /* ======================================================
       UPDATE COMPONENT FORM
       ====================================================== */
    var updateView = document.querySelector('[data-pcview="update"]');
    var listPanel  = updateView.querySelector('[data-pcstate="list"]');
    var formPanel  = updateView.querySelector('[data-pcstate="form"]');
    var ppShell    = document.querySelector('.pp-shell');

    function showForm() {
      listPanel.classList.add('is-hidden');
      if (typeof detailPanel !== 'undefined' && detailPanel) detailPanel.classList.add('is-hidden');
      formPanel.classList.remove('is-hidden');
      formPanel.querySelector('.pc-formbody').scrollTop = 0;
      if (ppShell) ppShell.classList.add('is-working');
      closeAllPcMenus();
    }
    function showList() {
      formPanel.classList.add('is-hidden');
      if (detailPanel) detailPanel.classList.add('is-hidden');
      listPanel.classList.remove('is-hidden');
      if (ppShell) ppShell.classList.remove('is-working');
    }

    document.getElementById('pcUpdateBtn').addEventListener('click', showForm);
    document.getElementById('pcFormCancel').addEventListener('click', showList);

    /* ----- Type radios: Adjustment shows applicable-date + attachment ----- */
    function applyType() {
      var expired = formPanel.querySelector('input[name="pcFormType"]:checked').value === 'expired';
      formPanel.querySelectorAll('[data-adjust-only]').forEach(function (el) {
        el.classList.toggle('is-hidden', expired);
      });
      // End date field only when adjustment + checkbox ticked
      if (!expired) {
        var on = document.getElementById('pcEndDateChk').checked;
        document.getElementById('pcEndDateField').classList.toggle('is-hidden', !on);
      }
    }
    formPanel.querySelectorAll('input[name="pcFormType"]').forEach(function (r) {
      r.addEventListener('change', applyType);
    });
    document.getElementById('pcEndDateChk').addEventListener('change', applyType);
    applyType();

    /* ----- Description counter ----- */
    var desc = document.getElementById('pcDesc');
    desc.addEventListener('input', function () {
      document.getElementById('pcDescCount').textContent = desc.value.length;
    });

    /* ----- Attachment file name ----- */
    var attachInput = document.getElementById('pcAttachInput');
    attachInput.addEventListener('change', function () {
      var box = document.getElementById('pcAttachBox');
      var name = document.getElementById('pcAttachName');
      if (attachInput.files && attachInput.files.length) {
        name.textContent = attachInput.files[0].name;
        box.classList.add('is-filled');
      } else {
        name.textContent = 'No file selected';
        box.classList.remove('is-filled');
      }
    });

    /* ----- Manage employee component table ----- */
    var managePool = [
      { emp: 'CP060 - Mitsui Tiga',    sub: 'Jakarta | IT Staff - SQA',      dino: true, comp: 'Transport Allowance',     type: 'Allowance',  current: 500000,  next: 750000 },
      { emp: 'CP060 - Mitsui Tiga',    sub: 'Jakarta | IT Staff - SQA',      dino: true, comp: 'Meal Allowance',          type: 'Allowance',  current: 600000,  next: 660000 },
      { emp: 'CP060 - Mitsui Tiga',    sub: 'Jakarta | IT Staff - SQA',      dino: true, comp: 'BPJS Kesehatan',          type: 'Deduction',  current: 120000,  next: 140000 }
    ];
    var addPool = [
      { emp: 'CP041 - Bayu Pratama',   sub: 'Jakarta | Finance - Staff',     init: 'BP', comp: 'Position Allowance',      type: 'Allowance',  current: 1500000, next: 2000000 },
      { emp: 'CP028 - Sari Wulandari', sub: 'Bandung | HR - Officer',        init: 'SW', comp: 'Communication Allowance', type: 'Allowance',  current: 300000,  next: 350000 },
      { emp: 'CP015 - Andi Nugroho',   sub: 'Surabaya | Sales - Supervisor', init: 'AN', comp: 'Overtime',                type: 'Additional Earnings', current: 0, next: 450000 }
    ];
    var compPool = [
      { comp: 'Healthcare Benefit',    type: 'Benefit',    current: 250000, next: 300000 },
      { comp: 'Pulsa Allowance',       type: 'Allowance',  current: 100000, next: 150000 },
      { comp: 'Late Penalty',          type: 'Deduction',  current: 50000,  next: 75000 }
    ];
    var manageRows = managePool.slice();
    var addIdx = 0, compIdx = 0;

    function renderForm(rows) {
      var html = rows.map(function (r, i) {
        return (
          '<tr data-fi="' + i + '">' +
            '<td>' + empCell(r) + '</td>' +
            '<td>' + r.comp + '</td>' +
            '<td>' + typeTag(r.type) + '</td>' +
            '<td><span class="pc-amt pc-amt--dim">' + (r.current ? rupiah(r.current) : '—') + '</span></td>' +
            '<td><span class="pc-newamt"><span class="pc-newamt__cur">RP</span>' +
              '<input type="text" inputmode="numeric" value="' + (r.next || 0).toLocaleString('id-ID') + '"></span></td>' +
            '<td class="pp-cell-act"><button class="pc-delrow" type="button" data-delrow aria-label="Remove row">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
            '</button></td>' +
          '</tr>'
        );
      }).join('');
      document.getElementById('pcFormRows').innerHTML = html ||
        '<tr><td colspan="6" style="text-align:center;color:var(--fg-4);padding:32px 0">No employees added. Use “Add Employee” to begin.</td></tr>';
      setShowing('pcFormShowing', rows.length);
      refreshIcons();
    }
    renderForm(manageRows);

    document.getElementById('pcAddEmp').addEventListener('click', function () {
      if (window.PCModals && window.PCModals.openSelectEmployee) window.PCModals.openSelectEmployee();
    });
    document.getElementById('pcAddComp').addEventListener('click', function () {
      if (window.PCModals && window.PCModals.openSelectComponent) window.PCModals.openSelectComponent();
    });

    // Delete row (delegated)
    document.getElementById('pcFormRows').addEventListener('click', function (e) {
      var del = e.target.closest('[data-delrow]');
      if (!del) return;
      var tr = del.closest('tr');
      var idx = parseInt(tr.getAttribute('data-fi'), 10);
      if (!isNaN(idx)) manageRows.splice(idx, 1);
      renderForm(manageRows);
    });

    // Form table search
    document.getElementById('pcFormSearch').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      renderForm(manageRows.filter(function (r) {
        return (r.emp + ' ' + r.comp + ' ' + r.type).toLowerCase().indexOf(q) !== -1;
      }));
    });

    /* ----- Next: record the update and return to history ----- */
    document.getElementById('pcFormNext').addEventListener('click', function () {
      var typeVal = formPanel.querySelector('input[name="pcFormType"]:checked').value;
      var typeLabel = typeVal === 'expired' ? 'Expired' : 'Adjustment';
      // derive a representative component type from the first row
      var firstType = manageRows.length ? manageRows[0].type : 'Allowance';
      updateRows.unshift({
        id: 'TRX-PC-' + Date.now().toString().slice(-6),
        type: firstType,
        date: '20 Dec 2025',
        by: 'Tony Stark'
      });
      updSearch.value = '';
      renderUpdate(updateRows);
      subtabs.querySelector('[data-pcsub="history"]').click();
      showList();
      showToast(typeLabel + ' update saved to history.');
    });

    /* ======================================================
       VIEW DETAIL panel
       ====================================================== */
    var detailPanel = updateView.querySelector('[data-pcstate="detail"]');
    var pcdTypeMeta = { Adjustment: '01 Feb 2026', Expired: '—' };

    var detailSample = [
      { emp: 'CP060 - Mitsui Tiga', sub: 'Jakarta | IT Staff - SQA', dino: true, comp: 'Transport Allowance', type: 'Allowance', current: 500000, next: 750000 },
      { emp: 'CP058 - Mitsui Satu', sub: 'Jakarta | IT Staff - SQA', dino: true, comp: 'Meal Allowance',      type: 'Allowance', current: 600000, next: 660000 },
      { emp: 'CP059 - Mitsui Dua',  sub: 'Jakarta | IT Staff - SQA', dino: true, comp: 'Communication Allowance', type: 'Allowance', current: 300000, next: 350000 }
    ];

    function renderDetailRows(rows) {
      var html = rows.map(function (r) {
        return (
          '<tr>' +
            '<td>' + empCell(r) + '</td>' +
            '<td>' + r.comp + '</td>' +
            '<td>' + typeTag(r.type) + '</td>' +
            '<td><span class="pc-amt pc-amt--dim">' + rupiah(r.current) + '</span></td>' +
            '<td><span class="pc-amt pc-amt--new">' + rupiah(r.next) + '</span></td>' +
          '</tr>'
        );
      }).join('');
      document.getElementById('pcdRows').innerHTML = html;
      setShowing('pcdShowing', rows.length);
      refreshIcons();
    }

    function showDetail(trx) {
      trx = trx || {};
      document.getElementById('pcdTitle').textContent = trx.id || 'TRX-PC-260301';
      document.getElementById('pcdTrx').textContent = trx.id || 'TRX-PC-260301';
      var typeLabel = trx.formType || (trx.type === 'Basic Salary' ? 'Adjustment' : 'Adjustment');
      document.getElementById('pcdType').textContent = typeLabel;
      document.getElementById('pcdDesc').textContent = trx.desc || 'Penyesuaian komponen ' + (trx.type || 'payroll') + ' periode berjalan.';
      document.getElementById('pcdEff').textContent = trx.date || '01 Mar 2026';
      document.getElementById('pcdEnd').textContent = '—';
      document.getElementById('pcdBackpay').textContent = pcdTypeMeta[typeLabel] || '01 Feb 2026';
      document.getElementById('pcdBy').textContent = trx.by ? ('CP060 - ' + trx.by) : 'CP060 - Tony Stark';
      document.getElementById('pcdAt').textContent = (trx.date || '01 Mar 2026') + ' 09:24';
      var rows = detailSample.map(function (r) {
        return Object.assign({}, r, { type: trx.type || r.type });
      });
      renderDetailRows(rows);
      listPanel.classList.add('is-hidden');
      formPanel.classList.add('is-hidden');
      detailPanel.classList.remove('is-hidden');
      detailPanel.querySelector('.pc-detailbody').scrollTop = 0;
      if (ppShell) ppShell.classList.add('is-working');
      closeAllPcMenus();
    }

    var crumbBack = document.getElementById('pcdCrumb');
    if (crumbBack) crumbBack.addEventListener('click', showList);
    var formCrumb = document.getElementById('pcFormCrumb');
    if (formCrumb) formCrumb.addEventListener('click', showList);

    /* Detail-page Action dropdown */
    var pcdActionBtn = document.getElementById('pcdActionBtn');
    var pcdActionMenu = document.getElementById('pcdActionMenu');
    pcdActionBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !pcdActionMenu.classList.contains('is-open');
      closeAllPcMenus();
      if (willOpen) { pcdActionMenu.classList.add('is-open'); pcdActionBtn.classList.add('is-open'); }
    });
    pcdActionMenu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-pcd-act]');
      if (!item) return;
      e.stopPropagation();
      closeAllPcMenus();
      if (item.getAttribute('data-pcd-act') === 'edit') { detailPanel.classList.add('is-hidden'); showForm(); }
      else { openDeleteModal(null); }
    });

    /* ======================================================
       DELETE confirm modal
       ====================================================== */
    var deleteScrim = document.getElementById('pcDeleteScrim');
    var pendingDeleteRow = null;
    function openDeleteModal(row) {
      pendingDeleteRow = row || null;
      deleteScrim.classList.add('is-open');
      closeAllPcMenus();
    }
    function closeDeleteModal() { deleteScrim.classList.remove('is-open'); pendingDeleteRow = null; }
    deleteScrim.querySelectorAll('[data-close-delete]').forEach(function (b) {
      b.addEventListener('click', closeDeleteModal);
    });
    deleteScrim.addEventListener('click', function (e) { if (e.target === deleteScrim) closeDeleteModal(); });
    document.getElementById('pcDeleteConfirm').addEventListener('click', function () {
      if (pendingDeleteRow) {
        pendingDeleteRow.remove();
        setShowing('pcUpdShowing', document.querySelectorAll('#pcUpdRows tr').length);
        setShowing('pcEmpShowing', document.querySelectorAll('#pcEmpRows tr').length);
      } else {
        // deleted from the detail page → go back to history
        showList();
      }
      closeDeleteModal();
      showToast('Transaction update deleted.');
    });

    /* Transaction-ID links open the detail page */
    document.querySelector('.pc-body').addEventListener('click', function (e) {
      var link = e.target.closest('.pc-idlink');
      if (!link) return;
      var tr = link.closest('tr');
      var id = link.textContent.trim();
      var match = updateRows.concat(empRows).filter(function (r) { return r.id === id; })[0] || { id: id };
      showDetail(match);
    });

    /* ----- Per-row action menus (event delegation) ----- */
    document.querySelector('.pc-body').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-actbtn]');
      if (btn) {
        e.stopPropagation();
        var menu = btn.parentElement.querySelector('[data-actmenu]');
        var willOpen = !menu.classList.contains('is-open');
        closeAllPcMenus();
        if (willOpen) { menu.classList.add('is-open'); btn.classList.add('is-open'); }
        return;
      }
      var item = e.target.closest('[data-act]');
      if (item) {
        e.stopPropagation();
        var act = item.getAttribute('data-act');
        var row = item.closest('tr');
        if (act === 'delete' && row) {
          openDeleteModal(row);
        } else if (act === 'edit') {
          showForm();
        } else {
          var idEl = row && row.querySelector('.pc-idlink');
          var id = idEl ? idEl.textContent.trim() : null;
          var match = id ? (updateRows.concat(empRows).filter(function (r) { return r.id === id; })[0] || { id: id }) : {};
          showDetail(match);
        }
        closeAllPcMenus();
      }
    });

    /* ----- Public API for the modals module ----- */
    window.PC = {
      addEmployeeRows: function (emps) {
        emps.forEach(function (e) {
          manageRows.push({
            emp: e.name, sub: e.sub, dino: true,
            comp: '[Component Name]', type: '[Type]',
            current: 0, next: 0, _placeholder: true
          });
        });
        renderForm(manageRows);
        showToast(emps.length + ' employee' + (emps.length > 1 ? 's' : '') + ' added to the update.');
      },
      applyComponents: function (comps) {
        if (!comps.length) return;
        var ci = 0;
        // fill placeholder rows first
        manageRows.forEach(function (r) {
          if (r._placeholder) {
            var c = comps[ci % comps.length]; ci++;
            r.comp = c.name; r.type = c.type; r.current = c.current; r.next = c.next; r._placeholder = false;
          }
        });
        // if no placeholders were waiting, append the components onto the first employee
        if (ci === 0) {
          var base = manageRows[0] || { emp: 'CP060 - Mitsui Tiga', sub: 'Jakarta | IT Staff - SQA', dino: true };
          comps.forEach(function (c) {
            manageRows.push({ emp: base.emp, sub: base.sub, dino: true, comp: c.name, type: c.type, current: c.current, next: c.next });
          });
        }
        renderForm(manageRows);
        showToast(comps.length + ' component' + (comps.length > 1 ? 's' : '') + ' applied.');
      }
    };

    /* ----- Outside click / Escape closes all custom menus ----- */
    document.addEventListener('click', function () { closeAllPcMenus(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeAllPcMenus(); }
    });

    refreshIcons();
  });
})();
