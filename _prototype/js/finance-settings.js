// SEVAKA HRIS — Cross-Module Finance Settings (FT1 · SF-A2/A3/A4 · SF-B2/B3/B4 · SF-S1 · SF-S2)
(function () {
  'use strict';
  var F = window.Flow, D = window.FIN;
  var limits = D.LOAN_LIMITS.slice();
  var filter = { grade: '', active: '' };
  var editing = null, deleting = null;

  var $ = function (id) { return document.getElementById(id); };
  function icons() { if (window.lucide) window.lucide.createIcons(); }
  // Re-bind options injected after the initial wireSelects() (which early-returns on a
  // wired ctl). Never clear dataset.wired — that double-binds the ctl-level toggle.
  function bindOpts(ctl) { return D.bindOpts(ctl); }

  // ---------- Loan Limit grid ----------
  function renderLimits() {
    var rows = limits.filter(function (r) {
      if (filter.grade && r.job_grade_id !== filter.grade) return false;
      if (filter.active !== '' && String(r.is_active) !== filter.active) return false;
      return true;
    });
    $('cntLimit').textContent = limits.length;
    $('limitBody').innerHTML = rows.length ? rows.map(function (r) {
      return '<tr>' +
        '<td class="cell-strong">' + D.grade(r.job_grade_id) + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(r.limit_amount) + '</span></td>' +
        '<td>' + D.sb(r.is_active ? 'ACTIVE' : 'INACTIVE') + '</td>' +
        '<td class="ta-r"><span class="rowacts">' + F.rowMenu([
          { label: 'Edit', icon: 'pencil', attr: 'data-edit="' + r.id + '"' },
          { label: 'Delete', icon: 'trash-2', attr: 'data-del="' + r.id + '"', danger: true }
        ]) + '</span></td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="tempty">No loan limit matches the current filter.</div></td></tr>';
  }

  function renderPurpose() {
    $('cntPurpose').textContent = D.PURPOSE_TYPES.length;
    $('purposeBody').innerHTML = D.PURPOSE_TYPES.map(function (p) {
      var max = p.max_amount === null
        ? (p.is_unlimited_ack ? '<span class="cell-dim">Unlimited (acknowledged)</span>' : '<span class="cell-dim">Not set — cannot be selected</span>')
        : '<span class="money">' + D.rp(p.max_amount) + '</span>';
      return '<tr><td class="cell-strong">' + p.name + '</td>' +
        '<td class="ta-c">' + D.tick(p.is_official_travel) + '</td>' +
        '<td class="ta-r">' + max + '</td>' +
        '<td>' + D.sb(p.is_active ? 'ACTIVE' : 'INACTIVE') + '</td></tr>';
    }).join('');
  }

  function renderReasons() {
    $('cntReason').textContent = D.REJECTION_REASONS.length;
    $('reasonBody').innerHTML = D.REJECTION_REASONS.map(function (r) {
      return '<tr><td class="cell-strong">' + r.name + '</td>' +
        '<td class="ta-c">' + D.tick(r.requires_free_text) + '</td>' +
        '<td>' + (r.is_system_default ? '<span class="sb sb--indigo"><span class="sb__dot"></span>SYSTEM DEFAULT</span>' : '<span class="cell-dim">—</span>') + '</td></tr>';
    }).join('');
  }

  // ---------- filters ----------
  function gradeOptions(exclude) {
    return D.JOB_GRADES.filter(function (g) {
      return !exclude || !limits.some(function (l) { return l.is_active && l.job_grade_id === g.id; });
    });
  }
  function fillFilterGrades() {
    $('fltGradeDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All grades</div>' +
      D.JOB_GRADES.map(function (g) { return '<div class="dropdown__opt" data-val="' + g.id + '">' + g.name + '</div>'; }).join('');
  }

  // ---------- create ----------
  var ncGradeId = '';
  function openCreate() {
    ncGradeId = '';
    var free = gradeOptions(true);
    $('ncGradeDd').innerHTML = free.length
      ? free.map(function (g) { return '<div class="dropdown__opt" data-val="' + g.id + '">' + g.name + '</div>'; }).join('')
      : '<div class="dropdown__empty">Every job grade already has an active limit</div>';
    var v = $('ncGrade').querySelector('.ctl__value');
    v.textContent = 'Select job grade'; v.style.color = 'var(--fg-4)';
    $('ncAmount').value = '';
    $('ncSave').disabled = true;
    F.wireSelects($('limitCreate'));
    bindOpts($('ncGrade'));
    F.openModal('limitCreate');
  }
  function ncCheck() { $('ncSave').disabled = !(ncGradeId && D.parseRp($('ncAmount').value) > 0); }

  // ---------- edit ----------
  function openEdit(id) {
    editing = limits.filter(function (l) { return l.id === id; })[0];
    if (!editing) return;
    $('edGrade').value = D.grade(editing.job_grade_id);
    $('edAmount').value = D.thousands(String(editing.limit_amount));
    $('edActive').classList.toggle('is-on', !!editing.is_active);
    $('edDelta').innerHTML = '&nbsp;';
    F.openModal('limitEdit');
  }
  function edDelta() {
    if (!editing) return;
    var next = D.parseRp($('edAmount').value), diff = next - editing.limit_amount;
    $('edDelta').innerHTML = diff === 0 ? '&nbsp;'
      : 'Delta ' + (diff > 0 ? '+' : '−') + ' ' + D.rp(Math.abs(diff)).replace('Rp ', 'Rp ') + ' vs current ' + D.rp(editing.limit_amount) + '.';
  }

  // ---------- wiring ----------
  document.addEventListener('DOMContentLoaded', function () {
    fillFilterGrades();
    F.wireSelects(document);
    D.bindOpts('fltGrade');
    renderLimits(); renderPurpose(); renderReasons(); icons();

    $('fltGrade').addEventListener('select', function (e) { filter.grade = e.detail.value === 'All grades' ? '' : e.detail.value; renderLimits(); icons(); });
    $('fltActive').addEventListener('select', function (e) { filter.active = /^(true|false)$/.test(e.detail.value) ? e.detail.value : ''; renderLimits(); icons(); });

    $('newLimitBtn').addEventListener('click', openCreate);

    $('ncGrade').addEventListener('select', function (e) { ncGradeId = e.detail.value; ncCheck(); });
    $('ncAmount').addEventListener('input', function () { this.value = D.thousands(this.value); ncCheck(); });
    $('ncSave').addEventListener('click', function () {
      var amount = D.parseRp($('ncAmount').value);
      limits.unshift({ id: 'll-' + Date.now(), job_grade_id: ncGradeId, limit_amount: amount, is_active: true });
      F.closeModal('limitCreate');
      renderLimits(); icons();
      F.toast('201 Created — loan limit ' + D.grade(ncGradeId) + ' · ' + D.rp(amount) + ' saved.', 'ok');
    });

    $('edAmount').addEventListener('input', function () { this.value = D.thousands(this.value); edDelta(); });
    $('edActive').addEventListener('click', function () { this.classList.toggle('is-on'); });
    $('edSave').addEventListener('click', function () {
      if (!editing) return;
      var next = D.parseRp($('edAmount').value);
      if (next <= 0) { F.toast('422 — limit amount must be ≥ 0.', 'danger'); return; }
      var diff = next - editing.limit_amount;
      editing.limit_amount = next;
      editing.is_active = $('edActive').classList.contains('is-on');
      F.closeModal('limitEdit');
      renderLimits(); icons();
      F.toast('200 OK — ' + D.grade(editing.job_grade_id) + ' updated' + (diff ? ' (' + (diff > 0 ? '+' : '−') + ' ' + D.rp(Math.abs(diff)) + ')' : '') + '. Not retroactive.', 'ok');
    });

    $('limitBody').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
      if (ed) return openEdit(ed.getAttribute('data-edit'));
      if (dl) {
        deleting = limits.filter(function (l) { return l.id === dl.getAttribute('data-del'); })[0];
        if (!deleting) return;
        $('delKv').innerHTML = '<div class="kv__k">Job grade</div><div class="kv__v">' + D.grade(deleting.job_grade_id) + '</div>' +
          '<div class="kv__k">Limit amount</div><div class="kv__v">' + D.rp(deleting.limit_amount) + '</div>' +
          '<div class="kv__k">Status</div><div class="kv__v">' + (deleting.is_active ? 'ACTIVE' : 'INACTIVE') + '</div>';
        F.openModal('limitDelete');
      }
    });
    $('delConfirm').addEventListener('click', function () {
      if (!deleting) return;
      limits = limits.filter(function (l) { return l.id !== deleting.id; });
      F.closeModal('limitDelete');
      renderLimits(); icons();
      F.toast('200 OK — loan limit soft-deleted.', 'ok');
      deleting = null;
    });
  });
})();
