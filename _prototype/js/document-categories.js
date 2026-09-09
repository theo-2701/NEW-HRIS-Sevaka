// SEVAKA HRIS — Document Category Settings (A6a · A6b · A6c · A6d · A7)
(function () {
  'use strict';
  var F = window.Flow, D = window.DocData;
  var esc = D.esc, eb = D.enumBadge;
  var current = null, decision = 'SETUJU', includeInactive = false, pager = null, proposed = null;

  function $(id) { return document.getElementById(id); }
  function kvRow(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }
  function yn(b) { return b ? D.sb('green', 'true') : D.sb('grey', 'false'); }

  function render() {
    var rows = D.CATS.filter(function (c) { return includeInactive || c.is_active; })
      .sort(function (a, b) { return a.category_name.localeCompare(b.category_name); });
    var slice = pager ? pager.slice(rows) : rows;
    $('ctBody').innerHTML = slice.map(function (c) {
      var items = [
        { label:'Tighten (immediate)', icon:'arrow-down-narrow-wide', attr:'data-tighten="' + c.id + '"' },
        { label:'Loosen (proposal)', icon:'arrow-up-wide-narrow', attr:'data-loosen="' + c.id + '"' },
        { label:'Reader roles', icon:'users', attr:'data-readers="' + c.id + '"' }
      ];
      if (c.has_pending_change) items.unshift({ label:'Review', icon:'gavel', attr:'data-decide="' + c.id + '"' });
      return '<tr' + (c.is_active ? '' : ' style="opacity:.62"') + '>' +
        '<td><span class="idlink" data-readers="' + c.id + '">' + esc(c.category_name) + '</span>' +
        '<div class="cell-dim"><code>' + esc(c.category_code) + '</code></div></td>' +
        '<td>' + eb(c.category_origin) + '</td>' +
        '<td>' + eb(c.confidentiality_class) + '</td>' +
        '<td>' + eb(c.retention_regime) + '<div class="cell-dim">' + (c.retention_days ? c.retention_days + ' days' : 'no limit') + '</div></td>' +
        '<td class="cell-dim">' + D.mb(c.max_file_size_bytes) + '</td>' +
        '<td class="cell-dim">' + esc(c.allowed_mime_types.join(', ')) + '</td>' +
        '<td>' + yn(c.shown_in_self_service) + '</td>' +
        '<td>' + (c.has_pending_change ? D.sb('amber', 'Awaiting approval') : (c.is_active ? '\u2014' : D.sb('grey', 'INACTIVE'))) + '</td>' +
        '<td class="ta-r"><div class="rowacts">' + F.rowMenu(items) + '</div></td></tr>';
    }).join('');
    if (pager) pager.paint();
    if (window.lucide) window.lucide.createIcons();
  }
  function pick(id) { for (var i = 0; i < D.CATS.length; i++) if (D.CATS[i].id === id) return D.CATS[i]; return null; }

  document.addEventListener('DOMContentLoaded', function () {
    F.wireSelects();
    pager = F.pager('ctFoot', 10, render, 'categories');
    render();

    $('ctInactive').addEventListener('select', function (e) {
      includeInactive = e.detail.value === 'true';
      pager.reset(); render();
    });
    $('ctNew').addEventListener('click', function () { F.openModal('ctCreate'); });
    $('ccRegime').addEventListener('change', function (e) {
      $('ccDaysFld').style.display = e.target.value === 'TEMPORARY' ? '' : 'none';
    });
    $('ccSave').addEventListener('click', function () {
      if (!$('ccCode').value.trim() || !$('ccName').value.trim()) { F.toast('Category code and name are required.', 'err'); return; }
      F.closeModal('ctCreate');
      F.toast('201 Created \u2014 category_origin=PERUSAHAAN, confidentiality_class=BIASA (forced by constraint). Event: KATEGORI_DIBUAT.', 'ok');
    });

    document.addEventListener('click', function (e) {
      var ti = e.target.closest('[data-tighten]'), lo = e.target.closest('[data-loosen]'),
          rd = e.target.closest('[data-readers]'), de = e.target.closest('[data-decide]');
      if (ti) {
        current = pick(ti.getAttribute('data-tighten'));
        $('ttTitle').textContent = 'Tighten \u00b7 ' + current.category_name;
        $('ttActive').checked = !current.is_active;
        F.openModal('ctTighten');
      } else if (lo) {
        current = pick(lo.getAttribute('data-loosen'));
        $('tlTitle').textContent = 'Loosen \u00b7 ' + current.category_name;
        $('tlCurrent').value = current.retention_days ? current.retention_days + ' days' : 'PERMANENT — no limit';
        $('tlImpact').textContent = current.impact.toLocaleString('en-US');
        F.openModal('ctLoosen');
      } else if (rd) {
        current = pick(rd.getAttribute('data-readers'));
        $('crTitle').textContent = 'Reader roles \u00b7 ' + current.category_name;
        $('crImpact').textContent = current.impact.toLocaleString('en-US');
        var sensitive = current.confidentiality_class === 'SENSITIF';
        $('crRoles').innerHTML = D.ROLE_REGISTRY.map(function (r) {
          return '<label class="doc-role"><input type="checkbox"' +
            (current.readers.indexOf(r) > -1 ? ' checked' : '') + (sensitive ? ' disabled' : '') + '>' + r + '</label>';
        }).join('');
        $('crGuard').innerHTML = sensitive
          ? '<div class="doc-note doc-note--hard"><div class="doc-note__h"><i data-lucide="shield-x"></i>403 — a SENSITIF category cannot have its reader list changed</div>' +
            '<p>The button is disabled <strong>and</strong> the server refuses anyway: <code>"Kategori berkelas SENSITIF tidak dapat diubah daftar pembacanya"</code>. Two fences, neither replacing the other.</p></div>'
          : '<div class="doc-note"><div class="doc-note__h"><i data-lucide="list-checks"></i>Ten canonical roles, whole-list replacement</div>' +
            '<p>The list is pre-filled with the roles in force. Submitting sends every checked role as <code>role_codes</code>; a role outside the canonical registry or a duplicate member is a <code>422</code>.</p></div>';
        $('crSave').disabled = sensitive;
        F.openModal('ctReaders');
        if (window.lucide) window.lucide.createIcons();
      } else if (de) {
        current = pick(de.getAttribute('data-decide'));
        $('cdKv').innerHTML =
          kvRow('Category', esc(current.category_name)) +
          kvRow('Proposal', 'retention_days ' + current.retention_days + ' \u2192 ' + (current.proposed_days || proposed || 730)) +
          kvRow('Proposed by', 'Hesti Wulandari \u00b7 NIK 20220301') +
          kvRow('Impact (must match)', '<strong>' + current.impact.toLocaleString('en-US') + '</strong> documents');
        decision = 'SETUJU';
        F.openModal('ctDecide');
      }
    });

    $('ttSave').addEventListener('click', function () {
      var off = $('ttActive').checked;
      current.is_active = !off;
      F.closeModal('ctTighten');
      render();
      F.toast('200 \u2014 applied immediately. One log_document_category_change row per moved attribute + event KATEGORI_DIUBAH.', 'ok');
    });
    $('tlSave').addEventListener('click', function () {
      if (current.has_pending_change) { F.toast('409 \u2014 "Kategori sedang memikul usulan yang menunggu persetujuan".', 'err'); return; }
      var v = parseInt(($('tlDays').value || '').replace(/\D/g, ''), 10);
      if (!v) { F.toast('422 \u2014 the proposed retention_days is required on a loosening change.', 'err'); return; }
      proposed = v;
      current.proposed_days = v;
      current.has_pending_change = true;
      F.closeModal('ctLoosen');
      render();
      F.toast('200 \u2014 proposal raised. The response still carries the values in force; zero log rows are born yet.', 'ok');
    });
    $('cdDecision').addEventListener('change', function (e) {
      decision = e.target.value;
      $('cdReasonFld').style.display = decision === 'TOLAK' ? '' : 'none';
    });
    $('cdSubmit').addEventListener('click', function () {
      if (decision === 'TOLAK' && !$('cdReason').value.trim()) { F.toast('A rejection reason is required when TOLAK.', 'err'); return; }
      current.has_pending_change = false;
      if (decision === 'SETUJU') current.retention_days = current.proposed_days || proposed || 730;
      current.proposed_days = null;
      F.closeModal('ctDecide');
      render();
      F.toast(decision === 'SETUJU'
        ? '200 \u2014 values applied, flag cleared, one log row per attribute (created_by=proposer, approved_by=approver).'
        : '200 \u2014 proposal discarded, flag cleared, zero rows born. The reason is echoed once and never stored.', 'ok');
    });
    $('crSave').addEventListener('click', function () {
      if (current.has_pending_change) { F.toast('409 \u2014 another proposal on this category is already waiting.', 'err'); return; }
      current.has_pending_change = true;
      F.closeModal('ctReaders');
      render();
      F.toast('200 \u2014 the list in force is echoed back, has_pending_change=true. It moves only when A6d approves.', 'ok');
    });
  });
})();
