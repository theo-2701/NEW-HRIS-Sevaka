// ============================================================
// SEVAKA HRIS — Payroll Component › Ex-Employee Allowance
// List of allowance transactions, Add/Edit full-page form with an
// employee table (IDR amount per row), an "Add Ex-Employee" selection
// modal, and a Delete confirm dialog. Reuses the standardized shell,
// tables, fields and modal primitives already loaded on the page.
// ============================================================
(function () {
  'use strict';

  /* ===================== DATA ===================== */
  // Pool of resigned employees that can be added to an allowance.
  var EXPOOL = [
    { id: 'CP032', name: 'Rina Hartono',     resign: '28 Feb 2026' },
    { id: 'CP027', name: 'Doni Saputra',     resign: '15 Feb 2026' },
    { id: 'CP019', name: 'Maya Lestari',     resign: '31 Jan 2026' },
    { id: 'CP044', name: 'Hendra Wijaya',    resign: '20 Jan 2026' },
    { id: 'CP051', name: 'Putri Anggraini',  resign: '10 Jan 2026' },
    { id: 'CP038', name: 'Agus Salim',       resign: '31 Dec 2025' },
    { id: 'CP022', name: 'Citra Dewi',       resign: '05 Dec 2025' },
    { id: 'CP013', name: 'Bambang Sutrisno', resign: '30 Nov 2025' }
  ];

  // Allowance transactions shown in the list.
  var exaList = [
    { id: 'TRX-EXA-260301', month: 'March',    year: '2026', taxable: true,
      desc: 'Sisa tunjangan transport & THR pro-rata karyawan resign Maret 2026.',
      rows: [
        { id: 'CP032', name: 'Rina Hartono',    resign: '28 Feb 2026', amount: 2500000 },
        { id: 'CP027', name: 'Doni Saputra',    resign: '15 Feb 2026', amount: 1750000 },
        { id: 'CP019', name: 'Maya Lestari',    resign: '31 Jan 2026', amount: 3200000 }
      ] },
    { id: 'TRX-EXA-260201', month: 'February', year: '2026', taxable: false,
      desc: 'Penyesuaian tunjangan akhir untuk karyawan resign Februari 2026.',
      rows: [
        { id: 'CP044', name: 'Hendra Wijaya',   resign: '20 Jan 2026', amount: 1200000 },
        { id: 'CP051', name: 'Putri Anggraini', resign: '10 Jan 2026', amount: 900000 }
      ] },
    { id: 'TRX-EXA-260101', month: 'January',  year: '2026', taxable: true,
      desc: 'Pembayaran sisa komponen payroll karyawan resign akhir 2025.',
      rows: [
        { id: 'CP038', name: 'Agus Salim',       resign: '31 Dec 2025', amount: 4100000 },
        { id: 'CP022', name: 'Citra Dewi',       resign: '05 Dec 2025', amount: 2750000 },
        { id: 'CP013', name: 'Bambang Sutrisno', resign: '30 Nov 2025', amount: 1500000 }
      ] }
  ];

  var YEARS  = ['2024', '2025', '2026'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  /* ===================== HELPERS ===================== */
  function rupiah(n) { return Number(n || 0).toLocaleString('id-ID'); }
  function parseAmt(s) { return parseInt(String(s).replace(/[^\d]/g, ''), 10) || 0; }
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }
  function checkbox(extraClass) {
    return '<label class="pp-check exa-check' + (extraClass ? ' ' + extraClass : '') + '">' +
      '<input type="checkbox"><span class="pp-check__box"></span></label>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var view = document.querySelector('[data-pcview="exalw"]');
    if (!view) return;

    var listPanel = view.querySelector('[data-exastate="list"]');
    var formPanel = view.querySelector('[data-exastate="form"]');
    var ppShell   = document.querySelector('.pp-shell');

    /* ===================== LIST ===================== */
    function renderList(rows) {
      var html = rows.map(function (r, i) {
        return (
          '<tr data-id="' + r.id + '">' +
            '<td><span class="exa-cell">' + (i + 1) + '</span></td>' +
            '<td><span class="exa-id" data-exa-open>' + r.id + '</span></td>' +
            '<td><span class="exa-cell">' + r.month + '</span></td>' +
            '<td><span class="exa-cell">' + r.year + '</span></td>' +
            '<td><span class="exa-cell exa-cell--strong">' + r.rows.length + ' employees</span></td>' +
            '<td><span class="exa-tax ' + (r.taxable ? 'exa-tax--yes' : 'exa-tax--no') + '">' +
              (r.taxable ? 'YES' : 'NO') + '</span></td>' +
            '<td class="pp-cell-act"><div class="exa-rowacts">' +
              '<button class="exa-iconbtn exa-iconbtn--edit" type="button" data-exa-edit aria-label="Edit">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>' +
              '</button>' +
              '<button class="exa-iconbtn exa-iconbtn--del" type="button" data-exa-del aria-label="Delete">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>' +
              '</button>' +
            '</div></td>' +
          '</tr>'
        );
      }).join('');
      document.getElementById('exaListRows').innerHTML = html ||
        '<tr><td colspan="7" class="exa-empty">No ex-employee allowance found.</td></tr>';
      document.getElementById('exaListShowing').textContent =
        rows.length ? ('Showing 1–' + rows.length + ' of ' + rows.length) : 'Showing 0 of 0';
      refreshIcons();
    }
    renderList(exaList);

    var listSearch = document.getElementById('exaListSearch');
    listSearch.addEventListener('input', function () {
      var q = listSearch.value.trim().toLowerCase();
      renderList(exaList.filter(function (r) {
        return (r.id + ' ' + r.month + ' ' + r.year).toLowerCase().indexOf(q) !== -1;
      }));
    });

    /* ===================== FORM (Add / Edit) ===================== */
    var formRows = [];
    var editingId = null;

    function showForm(mode, record) {
      editingId = mode === 'edit' && record ? record.id : null;
      document.getElementById('exaFormTitle').textContent =
        editingId ? 'Edit Ex-Employee Allowance' : 'Add Ex-Employee Allowance';
      document.getElementById('exaAddEmpBtn').textContent =
        editingId ? 'Add Employee' : 'Add Ex-Employee';

      // prefill — Add defaults to the current real-time year & month
      // (the "[Year]/[Month]" placeholders are dynamic values, not literals)
      var now = new Date();
      setSelect('year', record ? record.year : String(now.getFullYear()));
      setSelect('month', record ? record.month : MONTHS[now.getMonth()]);
      document.getElementById('exaTaxable').checked = record ? !!record.taxable : false;
      document.getElementById('exaDesc').value = record ? (record.desc || '') : '';
      formRows = record ? record.rows.map(function (r) { return Object.assign({}, r); }) : [];
      renderForm(formRows);

      listPanel.classList.add('is-hidden');
      formPanel.classList.remove('is-hidden');
      formPanel.querySelector('.pc-formbody').scrollTop = 0;
      if (ppShell) ppShell.classList.add('is-working');
    }
    function showList() {
      formPanel.classList.add('is-hidden');
      listPanel.classList.remove('is-hidden');
      if (ppShell) ppShell.classList.remove('is-working');
    }

    function renderForm(rows) {
      var html = rows.map(function (r, i) {
        return (
          '<tr data-fi="' + i + '">' +
            '<td class="exa-checkcell">' + checkbox() + '</td>' +
            '<td><span class="exa-cell">' + (i + 1) + '</span></td>' +
            '<td><span class="exa-cell exa-cell--strong">' + r.id + '</span></td>' +
            '<td><span class="exa-cell">' + r.name + '</span></td>' +
            '<td><span class="exa-resign">' + r.resign + '</span></td>' +
            '<td><span class="pc-newamt"><span class="pc-newamt__cur">IDR</span>' +
              '<input type="text" inputmode="numeric" data-amt value="' + rupiah(r.amount) + '"></span></td>' +
            '<td class="pp-cell-act"><button class="exa-iconbtn exa-iconbtn--del" type="button" data-delrow aria-label="Remove row">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>' +
            '</button></td>' +
          '</tr>'
        );
      }).join('');
      document.getElementById('exaFormRows').innerHTML = html ||
        '<tr><td colspan="7" class="exa-empty">No ex-employee added yet. Use “Add Ex-Employee” to begin.</td></tr>';
      document.getElementById('exaFormShowing').textContent =
        rows.length ? ('Showing 1–' + rows.length + ' of ' + rows.length) : 'Showing 0 of 0';
      var head = document.getElementById('exaFormCheckAll');
      if (head) head.checked = false;
      refreshIcons();
    }

    // sync amount inputs back into the model
    document.getElementById('exaFormRows').addEventListener('input', function (e) {
      var inp = e.target.closest('[data-amt]');
      if (!inp) return;
      var tr = inp.closest('tr');
      var idx = parseInt(tr.getAttribute('data-fi'), 10);
      if (!isNaN(idx) && formRows[idx]) formRows[idx].amount = parseAmt(inp.value);
    });
    // remove a row
    document.getElementById('exaFormRows').addEventListener('click', function (e) {
      var del = e.target.closest('[data-delrow]');
      if (!del) return;
      var idx = parseInt(del.closest('tr').getAttribute('data-fi'), 10);
      if (!isNaN(idx)) formRows.splice(idx, 1);
      renderForm(formRows);
    });
    // header select-all (visual)
    var formCheckAll = document.getElementById('exaFormCheckAll');
    if (formCheckAll) formCheckAll.addEventListener('change', function () {
      document.querySelectorAll('#exaFormRows .exa-check input').forEach(function (c) { c.checked = formCheckAll.checked; });
    });
    // form table search
    document.getElementById('exaFormSearch').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      var filtered = formRows.filter(function (r) {
        return (r.id + ' ' + r.name).toLowerCase().indexOf(q) !== -1;
      });
      // render filtered without losing model: map back via id
      var html = filtered.map(function (r) {
        var idx = formRows.indexOf(r);
        return (
          '<tr data-fi="' + idx + '">' +
            '<td class="exa-checkcell">' + checkbox() + '</td>' +
            '<td><span class="exa-cell">' + (idx + 1) + '</span></td>' +
            '<td><span class="exa-cell exa-cell--strong">' + r.id + '</span></td>' +
            '<td><span class="exa-cell">' + r.name + '</span></td>' +
            '<td><span class="exa-resign">' + r.resign + '</span></td>' +
            '<td><span class="pc-newamt"><span class="pc-newamt__cur">IDR</span>' +
              '<input type="text" inputmode="numeric" data-amt value="' + rupiah(r.amount) + '"></span></td>' +
            '<td class="pp-cell-act"><button class="exa-iconbtn exa-iconbtn--del" type="button" data-delrow aria-label="Remove row">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>' +
            '</button></td>' +
          '</tr>'
        );
      }).join('');
      document.getElementById('exaFormRows').innerHTML = html ||
        '<tr><td colspan="7" class="exa-empty">No match.</td></tr>';
      refreshIcons();
    });

    /* ----- Custom selects (year / month) ----- */
    function setSelect(which, value) {
      var sel = view.querySelector('[data-exa-select="' + which + '"]');
      var val = sel.querySelector('.ctl__value');
      if (value) { val.textContent = value; val.classList.add('has-value'); }
      else {
        val.textContent = which === 'year' ? '[Year]' : '[Month]';
        val.classList.remove('has-value');
      }
    }
    function buildSelect(which, options) {
      var sel = view.querySelector('[data-exa-select="' + which + '"]');
      var dd = sel.querySelector('.dropdown');
      dd.innerHTML = options.map(function (o) {
        return '<div class="dropdown__opt" data-opt="' + o + '">' + o + '</div>';
      }).join('');
      sel.addEventListener('click', function (e) {
        e.stopPropagation();
        var opt = e.target.closest('.dropdown__opt');
        if (opt) {
          setSelect(which, opt.getAttribute('data-opt'));
          sel.classList.remove('is-open');
          return;
        }
        var open = !sel.classList.contains('is-open');
        view.querySelectorAll('.ctl--select.is-open').forEach(function (s) { s.classList.remove('is-open'); });
        sel.classList.toggle('is-open', open);
      });
    }
    buildSelect('year', YEARS);
    buildSelect('month', MONTHS);
    document.addEventListener('click', function () {
      view.querySelectorAll('.ctl--select.is-open').forEach(function (s) { s.classList.remove('is-open'); });
    });

    /* ----- Buttons ----- */
    document.getElementById('exaAddBtn').addEventListener('click', function () { showForm('add'); });
    document.getElementById('exaFormCancel').addEventListener('click', showList);
    document.getElementById('exaFormCrumb').addEventListener('click', showList);

    document.getElementById('exaFormSave').addEventListener('click', function () {
      var year  = view.querySelector('[data-exa-select="year"] .ctl__value').textContent;
      var month = view.querySelector('[data-exa-select="month"] .ctl__value').textContent;
      var taxable = document.getElementById('exaTaxable').checked;
      var desc = document.getElementById('exaDesc').value.trim();
      var rows = formRows.map(function (r) { return Object.assign({}, r); });

      if (editingId) {
        var rec = exaList.filter(function (x) { return x.id === editingId; })[0];
        if (rec) {
          rec.year = /^\d{4}$/.test(year) ? year : rec.year;
          rec.month = MONTHS.indexOf(month) > -1 ? month : rec.month;
          rec.taxable = taxable; rec.desc = desc; rec.rows = rows;
        }
        showToast('Ex-employee allowance updated.');
      } else {
        exaList.unshift({
          id: 'TRX-EXA-' + Date.now().toString().slice(-6),
          month: MONTHS.indexOf(month) > -1 ? month : 'March',
          year: /^\d{4}$/.test(year) ? year : '2026',
          taxable: taxable, desc: desc, rows: rows
        });
        showToast('Ex-employee allowance saved.');
      }
      listSearch.value = '';
      renderList(exaList);
      showList();
    });

    /* ----- List row actions (open / edit / delete) ----- */
    listPanel.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-id]');
      if (!tr) return;
      var rec = exaList.filter(function (x) { return x.id === tr.getAttribute('data-id'); })[0];
      if (e.target.closest('[data-exa-edit]') || e.target.closest('[data-exa-open]')) {
        if (rec) showForm('edit', rec);
      } else if (e.target.closest('[data-exa-del]')) {
        if (rec) openDelete(rec);
      }
    });

    /* ===================== DELETE confirm ===================== */
    var delScrim = document.getElementById('exaDeleteScrim');
    var pendingDelete = null;
    function openDelete(rec) { pendingDelete = rec; delScrim.classList.add('is-open'); }
    function closeDelete() { delScrim.classList.remove('is-open'); pendingDelete = null; }
    delScrim.querySelectorAll('[data-close-exadel]').forEach(function (b) { b.addEventListener('click', closeDelete); });
    delScrim.addEventListener('click', function (e) { if (e.target === delScrim) closeDelete(); });
    document.getElementById('exaDeleteConfirm').addEventListener('click', function () {
      if (pendingDelete) {
        var idx = exaList.indexOf(pendingDelete);
        if (idx > -1) exaList.splice(idx, 1);
        renderList(exaList);
      }
      closeDelete();
      showToast('Ex-employee allowance deleted.');
    });

    /* ===================== ADD EX-EMPLOYEE selection modal ===================== */
    var selScrim = document.getElementById('exaSelScrim');
    var selState = {}; // id -> true (checked)

    function renderSelModal(q) {
      q = (q || '').trim().toLowerCase();
      var list = EXPOOL.filter(function (e) {
        return (e.id + ' ' + e.name).toLowerCase().indexOf(q) !== -1;
      });
      var inForm = {};
      formRows.forEach(function (r) { inForm[r.id] = true; });
      var html = list.map(function (e, i) {
        var disabled = inForm[e.id];
        return (
          '<tr data-eid="' + e.id + '"' + (disabled ? ' class="is-added"' : '') + '>' +
            '<td class="exa-checkcell"><label class="pp-check exa-check">' +
              '<input type="checkbox" data-selchk' + (disabled ? ' checked disabled' : (selState[e.id] ? ' checked' : '')) + '>' +
              '<span class="pp-check__box"></span></label></td>' +
            '<td><span class="exa-cell">' + (i + 1) + '</span></td>' +
            '<td><span class="exa-cell exa-cell--strong">' + e.id + '</span></td>' +
            '<td><span class="exa-cell">' + e.name + '</span></td>' +
            '<td><span class="exa-resign">' + e.resign + '</span></td>' +
          '</tr>'
        );
      }).join('');
      document.getElementById('exaSelRows').innerHTML = html ||
        '<tr><td colspan="5" class="exa-empty">No ex-employee found.</td></tr>';
      document.getElementById('exaSelShowing').textContent =
        list.length ? ('Showing 1–' + list.length + ' of ' + list.length) : 'Showing 0 of 0';
    }

    function openSelModal() {
      selState = {};
      document.getElementById('exaSelSearch').value = '';
      var head = document.getElementById('exaSelCheckAll');
      if (head) head.checked = false;
      renderSelModal('');
      selScrim.classList.add('is-open');
    }
    function closeSelModal() { selScrim.classList.remove('is-open'); }

    document.getElementById('exaAddEmpBtn').addEventListener('click', openSelModal);
    selScrim.querySelectorAll('[data-close-exasel]').forEach(function (b) { b.addEventListener('click', closeSelModal); });
    selScrim.addEventListener('click', function (e) { if (e.target === selScrim) closeSelModal(); });

    document.getElementById('exaSelRows').addEventListener('change', function (e) {
      var chk = e.target.closest('[data-selchk]');
      if (!chk || chk.disabled) return;
      var id = chk.closest('tr').getAttribute('data-eid');
      if (chk.checked) selState[id] = true; else delete selState[id];
    });
    var selCheckAll = document.getElementById('exaSelCheckAll');
    if (selCheckAll) selCheckAll.addEventListener('change', function () {
      document.querySelectorAll('#exaSelRows [data-selchk]:not([disabled])').forEach(function (c) {
        c.checked = selCheckAll.checked;
        var id = c.closest('tr').getAttribute('data-eid');
        if (selCheckAll.checked) selState[id] = true; else delete selState[id];
      });
    });
    document.getElementById('exaSelSearch').addEventListener('input', function () { renderSelModal(this.value); });

    document.getElementById('exaSelSubmit').addEventListener('click', function () {
      var existing = {};
      formRows.forEach(function (r) { existing[r.id] = true; });
      var added = 0;
      Object.keys(selState).forEach(function (id) {
        if (existing[id]) return;
        var e = EXPOOL.filter(function (x) { return x.id === id; })[0];
        if (e) { formRows.push({ id: e.id, name: e.name, resign: e.resign, amount: 0 }); added++; }
      });
      renderForm(formRows);
      closeSelModal();
      if (added) showToast(added + ' ex-employee' + (added > 1 ? 's' : '') + ' added.');
    });

    /* ===================== Toast ===================== */
    function showToast(msg) {
      var toast = document.getElementById('pcToast');
      if (!toast) return;
      document.getElementById('pcToastMsg').textContent = msg;
      toast.classList.add('is-shown');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function () { toast.classList.remove('is-shown'); }, 2600);
    }

    /* Escape closes the modals */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeSelModal(); closeDelete();
    });

    refreshIcons();
  });
})();
