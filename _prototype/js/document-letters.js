// SEVAKA HRIS — Letter Issuance (A15 · A10 · A12 · A13a · A13b · A13c · A14)
(function () {
  'use strict';
  var F = window.Flow, D = window.DocData;
  var esc = D.esc, eb = D.enumBadge, dt = D.dt;
  var state = { batch:[], tpl:'', by:'' };
  var pager = null, tplPicked = null, batchPicked = null, decision = 'DISETUJUI';

  function $(id) { return document.getElementById(id); }
  function kvRow(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  // A15 — staff path: is_active + owns an active version.
  function issuable() {
    return D.TPL.filter(function (t) { return t.is_active && t.active_version_id; }).map(function (t) {
      return { id:t.id, template_name:t.template_name, letter_target:t.letter_target,
        effective_requires_approval: t.category_retention_regime === 'PERMANENT' || t.requires_approval,
        active_version_no:t.active_version_no };
    });
  }

  function renderBatches() {
    var rows = D.BATCHES.filter(function (b) {
      if (state.batch.length && state.batch.indexOf(b.batch_state) < 0) return false;
      if (state.tpl && b.template_id !== state.tpl) return false;
      if (state.by && b.created_by.id !== state.by) return false;
      return true;
    });
    var slice = pager ? pager.slice(rows) : rows;
    $('liBody').innerHTML = slice.length ? slice.map(function (b) {
      var items = [{ label:'View Detail', icon:'file-search', attr:'data-report="' + b.id + '"' }];
      if (b.batch_state === 'MENUNGGU_PERSETUJUAN') items.unshift({ label:'Review', icon:'gavel', attr:'data-decide="' + b.id + '"' });
      return '<tr' + (b.fresh ? ' class="row-fresh"' : '') + '><td><span class="idlink" data-report="' + b.id + '">' + esc(b.code) + '</span></td>' +
        '<td>' + esc(b.template_name) + '<div class="cell-dim">frozen at ' + esc(b.template_version_id.slice(-4)) + '</div></td>' +
        '<td class="cell-dim">' + b.recipient_count + '</td>' +
        '<td>' + eb(b.batch_state) + '</td>' +
        '<td class="cell-dim">' + dt(b.submitted_at, true) + '<div class="cell-dim">' + esc(b.created_by.nama) + ' · NIK ' + esc(b.created_by.nik) + '</div></td>' +
        '<td class="cell-dim">' + (b.approved_by ? esc(b.approved_by.nama) + '<div class="cell-dim">NIK ' + esc(b.approved_by.nik) + '</div>' : '\u2014') + '</td>' +
        '<td class="ta-r"><div class="rowacts">' + F.rowMenu(items) + '</div></td></tr>';
    }).join('') : '<tr><td colspan="7" class="tempty">No batches match. An empty grid is <code>200</code> with <code>data:[]</code>.</td></tr>';
    if (pager) pager.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function openReport(id) {
    var b = null;
    for (var i = 0; i < D.BATCHES.length; i++) if (D.BATCHES[i].id === id) b = D.BATCHES[i];
    if (!b) return;
    $('brTitle').textContent = 'Batch report \u00b7 ' + b.code;
    $('brStats').innerHTML =
      stat('Waiting', b.summary.waiting, 'batch_item_state = MENUNGGU') +
      stat('Succeeded', b.summary.succeeded, 'letter born, catalogued') +
      stat('Failed', b.summary.failed, 'reason recorded per task');
    $('brKv').innerHTML =
      kvRow('Batch state', eb(b.batch_state)) +
      kvRow('Recipients', b.recipient_count) +
      kvRow('Submitted', dt(b.submitted_at, true) + ' \u00b7 ' + esc(b.created_by.nama) + ' (NIK ' + esc(b.created_by.nik) + ')') +
      kvRow('Approved', b.approved_at ? dt(b.approved_at, true) + ' \u00b7 ' + esc(b.approved_by.nama) + ' (NIK ' + esc(b.approved_by.nik) + ')' : '\u2014') +
      kvRow('Finished', b.finished_at ? dt(b.finished_at, true) + ' <span class="cell-dim">Asia/Jakarta</span>' : '\u2014');
    $('brItems').innerHTML = b.items.length ? b.items.map(function (it) {
      return '<tr><td>' + esc(it.subject.nama) + ' <span class="cell-dim">NIK ' + esc(it.subject.nik) + '</span></td>' +
        '<td>' + eb(it.batch_item_state) + '</td>' +
        '<td class="cell-dim">' + (it.letter_no ? esc(it.letter_no) : '\u2014') + '</td>' +
        '<td class="cell-dim">' + (it.failure_reason ? esc(it.failure_reason) : '\u2014') + '</td></tr>';
    }).join('') : '<tr><td colspan="4" class="tempty">Rejected batch — zero tasks were ever born, so there is nothing to report per recipient.</td></tr>';
    F.openModal('liReportM');
  }
  function stat(t, v, f) {
    return '<div class="doc-stat"><div class="doc-stat__t">' + t + '</div><div class="doc-stat__v">' + v + '</div><div class="doc-stat__f">' + f + '</div></div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var list = issuable();
    function tplLabel(t) {
      return esc(t.template_name) + ' \u2014 draft v' + t.active_version_no;
    }
    var opts = list.map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + tplLabel(t) + '</div>'; }).join('');
    $('isTplDD').innerHTML = opts;
    $('mbTplDD').innerHTML = list.filter(function (t) { return t.letter_target === 'PERORANGAN'; })
      .map(function (t) { return '<div class="dropdown__opt" data-val="' + t.id + '">' + tplLabel(t) + '</div>'; }).join('');
    $('liTplDD').innerHTML = '<div class="dropdown__opt is-sel" data-val="">All templates</div>' + opts;
    $('isSubjectDD').innerHTML = D.EMPLIST.map(function (e) {
      return '<div class="dropdown__opt" data-val="' + e.id + '">' + esc(e.nama) + ' \u00b7 NIK ' + esc(e.nik) + '</div>';
    }).join('');
    $('liByDD').innerHTML = '<div class="dropdown__opt is-sel" data-val="">Submitted by anyone</div>' +
      [D.EMP.e1, D.EMP.e4].map(function (e) { return '<div class="dropdown__opt" data-val="' + e.id + '">' + esc(e.nama) + '</div>'; }).join('');
    $('isReissueDD').innerHTML = '<div class="dropdown__opt is-sel" data-val="">None</div>' +
      D.DOCS.filter(function (d) { return d.origin === 'DILAHIRKAN_SISTEM'; }).map(function (d) {
        return '<div class="dropdown__opt" data-val="' + d.document_id + '">' + esc(D.activeVersion(d).original_filename) + '</div>';
      }).join('');
    $('mbRecipients').innerHTML = D.EMPLIST.map(function (e, i) {
      return '<tr><td><label class="fchk"><input type="checkbox" class="mbChk" data-i="' + i + '"' + (i < 3 ? ' checked' : '') + '><span class="fchk__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></label></td>' +
        '<td>' + esc(e.nama) + '</td><td class="cell-dim">' + esc(e.nik) + '</td><td class="cell-dim">' + esc(e.dept) + '</td></tr>';
    }).join('');
    F.wireSelects();
    pager = F.pager('liFoot', 10, renderBatches, 'batches');
    renderBatches();

    $('liState').addEventListener('change', function (e) {
      var boxes = document.querySelectorAll('.liSt');
      if (e.target.id === 'liStAll') {
        boxes.forEach(function (c) { c.checked = e.target.checked; });
      }
      state.batch = Array.prototype.map.call(document.querySelectorAll('.liSt:checked'), function (c) { return c.value; });
      var all = $('liStAll');
      all.checked = state.batch.length === boxes.length;
      all.indeterminate = state.batch.length > 0 && state.batch.length < boxes.length;
      pager.reset(); renderBatches();
      if (window.Flow) window.Flow.paintFilterSums();
    });
    $('liTpl').addEventListener('select', function (e) { state.tpl = D.filterValue(this, e.detail.value); pager.reset(); renderBatches(); });
    $('liBy').addEventListener('select', function (e) { state.by = D.filterValue(this, e.detail.value); pager.reset(); renderBatches(); });

    $('liIssue').addEventListener('click', function () { F.openModal('liIssueM'); });
    $('liCancelDemo').addEventListener('click', function () { F.openModal('liCancelM'); });
    $('liMass').addEventListener('click', function () { F.openModal('liMassM'); });

    function paintRecipientCount() {
      var n = document.querySelectorAll('.mbChk:checked').length;
      $('mbCount').innerHTML = n + ' recipient' + (n === 1 ? '' : 's') + ' selected \u2014 the minimum is two.' +
        (n < 2 ? ' <strong>Submitting now answers <code>422</code>.</strong>' : '');
    }
    $('mbRecipients').addEventListener('change', paintRecipientCount);
    paintRecipientCount();

    $('isTpl').addEventListener('select', function (e) {
      tplPicked = null;
      for (var i = 0; i < list.length; i++) if (list[i].id === e.detail.value) tplPicked = list[i];
      if (!tplPicked) return;
      var per = tplPicked.letter_target === 'PERORANGAN';
      $('isSubject').style.opacity = per ? '1' : '.45';
      $('isSubject').style.pointerEvents = per ? '' : 'none';
      $('isBranch').style.opacity = per ? '.45' : '1';
      $('isBranch').style.pointerEvents = per ? 'none' : '';
      // A greyed control must say why it is greyed, not just fade.
      if (!per) $('isSubject').querySelector('.ctl__value').innerHTML = '<span style="color:var(--fg-4)">\u2014 not applicable, this template is a circular</span>';
      if (per) $('isBranch').querySelector('.ctl__value').innerHTML = '<span style="color:var(--fg-4)">\u2014 not applicable, this template targets one person</span>';
      $('isGate').innerHTML = '<div class="doc-note"><div class="doc-note__h"><i data-lucide="' +
        (tplPicked.effective_requires_approval ? 'shield-alert' : 'zap') + '"></i>' +
        (tplPicked.effective_requires_approval ? 'Gate ON \u2014 the letter will be saved as MENUNGGU_PERSETUJUAN' : 'Gate OFF \u2014 the letter is born immediately') +
        '</div><p>Target <strong>' + tplPicked.letter_target + '</strong>, active draft v' + tplPicked.active_version_no +
        '. The gate is the formula “category PERMANENT <strong>OR</strong> requires_approval”.</p></div>';
      if (window.lucide) window.lucide.createIcons();
    });

    $('isSubmit').addEventListener('click', function () {
      if (!tplPicked) { F.toast('template_id is always required.', 'err'); return; }
      F.closeModal('liIssueM');
      var gate = tplPicked.effective_requires_approval;
      $('liResult').innerHTML = '<div class="doc-note" style="background:#fff;margin-bottom:12px">' +
        '<div class="doc-note__h"><i data-lucide="check-circle-2"></i>201 Created \u2014 branch ' + (gate ? 'MENUNGGU_PERSETUJUAN' : 'TERBIT') + '</div>' +
        '<div class="kv" style="margin-top:8px">' +
        kvRow('letter_issuance_state', eb(gate ? 'MENUNGGU_PERSETUJUAN' : 'TERBIT')) +
        kvRow('letter_state', eb(gate ? null : 'BERLAKU')) +
        kvRow('letter_no', gate ? '<span class="cell-dim">null</span>' : '<strong>001/HRD/VIII/2026</strong>') +
        kvRow('verification_code', gate ? '<span class="cell-dim">null</span>' : '<code>K7M2-P4QX-9WTB</code>') +
        kvRow('issued_at', gate ? '<span class="cell-dim">null</span>' : dt('2026-08-05T14:22:10+07:00', true) + ' <span class="cell-dim">Asia/Jakarta</span>') +
        kvRow('document_id', gate ? '<span class="cell-dim">null</span>' : '<code>\u20260004</code> <span class="cell-dim">catalogued</span>') +
        '</div><p style="margin-top:8px">' + (gate
          ? 'Side effect: one <code>mst_letter</code> row plus the event <code>SURAT_DIAJUKAN</code>. Approval happens on the document detail screen (<code>A11</code>).'
          : 'Side effect: the RustFS object is written first, then one transaction — catalogue + version + <code>mst_letter</code> (TERBIT) + event <code>SURAT_TERBIT</code>. Zero Kafka.') + '</p></div>';
      F.toast('201 Created \u2014 ' + (gate ? 'awaiting approval.' : 'letter issued.'), 'ok');
      if (window.lucide) window.lucide.createIcons();
    });

    $('lcDo').addEventListener('click', function () {
      if (!($('lcReason').value || '').trim()) { F.toast('cancel_reason is always required.', 'err'); return; }
      F.closeModal('liCancelM');
      F.toast('Reference form only \u2014 in the real application this runs from A4 (document detail).', 'ok');
    });

    $('mbSubmit').addEventListener('click', function () {
      var picked = Array.prototype.map.call(document.querySelectorAll('.mbChk:checked'), function (c) { return D.EMPLIST[+c.getAttribute('data-i')]; });
      if (picked.length < 2) { F.toast('422 \u2014 at least two unique recipients are required.', 'err'); return; }
      var tpl = tplPicked && tplPicked.letter_target === 'PERORANGAN' ? tplPicked : list[0];
      var n = D.BATCHES.length + 1;
      D.BATCHES.forEach(function (b) { b.fresh = false; });
      D.BATCHES.unshift({ id:'batch-new-' + Date.now(), code:'BATCH-' + n, fresh:true,
        template_id:tpl.id, template_name:tpl.template_name,
        template_version_id:tpl.id.slice(-4) + '-frozen',
        batch_state:'MENUNGGU_PERSETUJUAN', recipient_count:picked.length,
        submitted_at:new Date().toISOString(), created_by:D.EMP.e4,
        approved_by:null, approved_at:null, finished_at:null,
        summary:{ waiting:picked.length, succeeded:0, failed:0 },
        items:picked.map(function (p) { return { subject:p, batch_item_state:'MENUNGGU', letter_id:null, letter_no:null, failure_reason:null }; }) });
      F.closeModal('liMassM');
      pager.reset();
      renderBatches();
      $('liMassCount').textContent = D.BATCHES.length;
      F.toast('201 Created \u2014 batch MENUNGGU_PERSETUJUAN with ' + picked.length + ' tasks (all MENUNGGU). Event: KUMPULAN_DIAJUKAN.', 'ok');
    });

    $('bdDecision').addEventListener('segchange', function (e) { decision = e.detail.value; });
    $('bdSubmit').addEventListener('click', function () {
      F.closeModal('liDecideM');
      if (!batchPicked) return;
      D.BATCHES.forEach(function (b) { b.fresh = false; });
      batchPicked.fresh = true;
      if (decision === 'DISETUJUI') {
        batchPicked.batch_state = 'DISETUJUI';
        batchPicked.approved_by = D.EMP.e3 || D.EMP.e1;
        batchPicked.approved_at = new Date().toISOString();
        renderBatches();
        F.toast('200 \u2014 KUMPULAN_DISETUJUI. Recipients frozen; the background worker is now eligible to run.', 'ok');
        var b = batchPicked;
        setTimeout(function () { b.batch_state = 'BERJALAN'; renderBatches(); }, 900);
        setTimeout(function () {
          b.batch_state = 'SELESAI';
          b.finished_at = new Date().toISOString();
          b.summary = { waiting:0, succeeded:b.recipient_count, failed:0 };
          b.items.forEach(function (it, i) {
            it.batch_item_state = 'BERHASIL';
            it.letter_no = String(100 + i) + '/HRD/VIII/2026';
          });
          renderBatches();
          F.toast('The worker finished \u2014 batch SELESAI. The report stays openable for good.', 'ok');
        }, 2200);
      } else {
        batchPicked.batch_state = 'DITOLAK';
        batchPicked.approved_by = D.EMP.e3 || D.EMP.e1;
        batchPicked.approved_at = new Date().toISOString();
        batchPicked.items = [];
        batchPicked.summary = { waiting:0, succeeded:0, failed:0 };
        renderBatches();
        F.toast('200 \u2014 KUMPULAN_DITOLAK. Zero tasks, zero letters \u2014 findable only through this grid.', 'ok');
      }
    });

    document.addEventListener('click', function (e) {
      var rp = e.target.closest('[data-report]'), de = e.target.closest('[data-decide]');
      if (rp) openReport(rp.getAttribute('data-report'));
      else if (de) {
        for (var i = 0; i < D.BATCHES.length; i++) if (D.BATCHES[i].id === de.getAttribute('data-decide')) batchPicked = D.BATCHES[i];
        $('bdKv').innerHTML = kvRow('Batch', esc(batchPicked.code)) +
          kvRow('Template', esc(batchPicked.template_name)) +
          kvRow('Recipients', batchPicked.recipient_count + ' <span class="cell-dim">carried impact</span>') +
          kvRow('Submitted by', esc(batchPicked.created_by.nama) + ' \u00b7 NIK ' + esc(batchPicked.created_by.nik));
        decision = 'DISETUJUI';
        F.openModal('liDecideM');
      }
    });
  });
})();
