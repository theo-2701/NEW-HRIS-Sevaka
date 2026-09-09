// SEVAKA HRIS — Document Templates (A8a · A8e · A8b · A8c · A8d · A9)
(function () {
  'use strict';
  var F = window.Flow, D = window.DocData;
  var esc = D.esc, eb = D.enumBadge, dt = D.dt;
  var current = null, currentVersion = null, decision = 'DISETUJUI';

  function $(id) { return document.getElementById(id); }
  function kvRow(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }
  function yn(b) { return b ? D.sb('green', 'true') : D.sb('grey', 'false'); }

  var pager = null;

  function render() {
    // A8a lists is_active=true only, ordered by template_name ascending.
    var rows = D.TPL.filter(function (t) { return t.is_active; })
      .sort(function (a, b) { return a.template_name.localeCompare(b.template_name); });
    var slice = pager ? pager.slice(rows) : rows;
    $('tplBody').innerHTML = slice.map(function (t) {
      var acts = F.rowMenu([
        { label:'View Detail', icon:'file-search', attr:'data-td="' + t.id + '"' },
        { label:'New draft version', icon:'file-plus', attr:'data-tv="' + t.id + '"' },
        { label:'Deactivate', icon:'x-circle', attr:'data-to="' + t.id + '"', danger:true }
      ]);
      return '<tr><td><span class="idlink" data-td="' + t.id + '">' + esc(t.template_name) + '</span></td>' +
        '<td>' + eb(t.letter_target) + '</td><td>' + eb(t.signer_scope) + '</td>' +
        '<td>' + yn(t.is_self_requestable) + '</td><td>' + yn(t.requires_approval) + '</td>' +
        '<td>' + (t.active_version_no ? D.sb('blue', 'v' + t.active_version_no)
          : D.sb('amber', 'Cannot issue yet')) + '</td>' +
        '<td class="ta-r"><div class="rowacts">' + acts + '</div></td></tr>';
    }).join('');
    if (pager) pager.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function openDetail(id) {
    var t = pick(id); if (!t) return;
    current = t;
    $('tdTitle').textContent = t.template_name;
    var gate = t.category_retention_regime === 'PERMANENT' || t.requires_approval;
    $('tdKv').innerHTML =
      kvRow('Category', esc(t.category_name)) +
      kvRow('Category retention regime', eb(t.category_retention_regime)) +
      kvRow('Letter target', eb(t.letter_target)) +
      kvRow('Signer scope', eb(t.signer_scope)) +
      kvRow('Self-requestable', yn(t.is_self_requestable)) +
      kvRow('Requires approval', yn(t.requires_approval)) +
      kvRow('Effective issuance gate', (gate ? D.sb('amber', 'ON') : D.sb('grey', 'OFF')) +
        ' <span class="cell-dim">category PERMANENT <strong>OR</strong> requires_approval</span>') +
      kvRow('Active version', t.active_version_no ? 'v' + t.active_version_no : '\u2014 <span class="cell-dim">cannot issue yet</span>');

    $('tdVersions').innerHTML = t.versions.slice().reverse().map(function (v) {
      var author = v.created_by ? v.created_by.nama + ' \u00b7 NIK ' + v.created_by.nik : '\u2014';
      var appr = v.approved_by ? v.approved_by.nama + ' \u00b7 NIK ' + v.approved_by.nik + ' \u00b7 ' + dt(v.approved_at, true) : '\u2014';
      return '<div class="doc-note" style="background:#fff">' +
        '<div class="doc-note__h" style="justify-content:space-between">' +
          '<span style="display:inline-flex;align-items:center;gap:8px">Version ' + v.version_no + ' ' + eb(v.template_version_state) +
          (v.is_active_version ? ' ' + D.sb('blue', 'ACTIVE') : '') + '</span>' +
          (v.template_version_state === 'MENUNGGU_PERSETUJUAN'
            ? '<button class="rowbtn" data-decide="' + v.version_no + '">Decide</button>' : '') +
        '</div>' +
        '<p>Author ' + esc(author) + ' \u00b7 ' + dt(v.created_at, true) + ' &nbsp;|&nbsp; Approver ' + esc(appr) + '</p>' +
        '<div class="doc-body"><pre>' + esc(v.body) + '</pre></div></div>';
    }).join('');
    F.openModal('tplDetail');
    if (window.lucide) window.lucide.createIcons();
  }
  function pick(id) { for (var i = 0; i < D.TPL.length; i++) if (D.TPL[i].id === id) return D.TPL[i]; return null; }

  // S4 — a new version carries the WHOLE body, so it starts from the text in force.
  function openVersion() {
    var t = current; if (!t) return;
    var last = t.versions[t.versions.length - 1];
    var act = null;
    for (var i = 0; i < t.versions.length; i++) if (t.versions[i].is_active_version) act = t.versions[i];
    var next = last.version_no + 1;
    $('tvBody').value = (act || last).body;
    $('tvInfo').innerHTML = '<p>Will be born as <strong>version ' + next + '</strong>, state <strong>MENUNGGU_PERSETUJUAN</strong>. ' +
      (act ? 'Version ' + act.version_no + ' stays in force and keeps issuing letters until version ' + next + ' is approved \u2014 issuance in flight is undisturbed.'
           : 'This template still has no approved version, so it cannot issue letters either way.') +
      ' The box is pre-filled with the text in force: edit it whole, never as a patch.</p>';
    F.openModal('tplVersion');
  }

  document.addEventListener('DOMContentLoaded', function () {
    pager = F.pager('tplFoot', 10, render, 'templates');
    render();
    $('tcCatDD').innerHTML = D.CATS.filter(function (c) { return c.is_active; })
      .map(function (c) { return '<div class="dropdown__opt" data-val="' + c.id + '">' + esc(c.category_name) + '</div>'; }).join('');
    F.wireSelects();

    document.addEventListener('click', function (e) {
      var td = e.target.closest('[data-td]'), tv = e.target.closest('[data-tv]'),
          to = e.target.closest('[data-to]'), de = e.target.closest('[data-decide]');
      if (td) openDetail(td.getAttribute('data-td'));
      else if (tv) { current = pick(tv.getAttribute('data-tv')); openVersion(); }
      else if (to) {
        current = pick(to.getAttribute('data-to'));
        $('toMsg').textContent = 'Deactivate "' + current.template_name + '"? Issuance from it stops, it disappears from this grid, and no address can bring it back.';
        F.openModal('tplOff');
      } else if (de) {
        var no = +de.getAttribute('data-decide');
        currentVersion = null;
        for (var i = 0; i < current.versions.length; i++) if (current.versions[i].version_no === no) currentVersion = current.versions[i];
        $('taTitle').textContent = current.template_name + ' \u00b7 version ' + no;
        $('taBody').innerHTML = '<pre>' + esc(currentVersion.body) + '</pre>';
        $('taHands').innerHTML =
          '<div class="doc-hand"><div class="doc-hand__t">First pair of hands \u2014 author</div>' +
          '<p>Wrote this draft. It was born MENUNGGU_PERSETUJUAN and cannot issue a single letter until a second person decides.</p>' +
          '<div class="doc-hand__w">' + esc(currentVersion.created_by ? currentVersion.created_by.nama + ' \u00b7 NIK ' + currentVersion.created_by.nik : '\u2014') +
          ' \u00b7 ' + dt(currentVersion.created_at, true) + '</div></div>' +
          '<div class="doc-hand"><div class="doc-hand__t">Second pair of hands \u2014 decider</div>' +
          '<p>Reads the full body, then decides here. The server rejects a decision made by the author (<code>422</code>).</p>' +
          '<div class="doc-hand__w">' + esc(D.EMP.e3.nama) + ' \u00b7 ROLE_SUPER_ADMIN \u00b7 NIK ' + esc(D.EMP.e3.nik) + '</div></div>';
        decision = 'DISETUJUI';
        F.closeModal('tplDetail');
        F.openModal('tplApprove');
      }
    });

    $('taDecision').addEventListener('change', function (e) {
      decision = e.target.value;
      $('taReasonFld').style.display = decision === 'DITOLAK' ? '' : 'none';
    });
    $('tcSelf').addEventListener('change', function () { if (this.checked) $('tcReq').checked = false; });
    $('tcReq').addEventListener('change', function () { if (this.checked) $('tcSelf').checked = false; });

    $('tplNew').addEventListener('click', function () { F.openModal('tplCreate'); });
    $('tdNewVersion').addEventListener('click', function () { F.closeModal('tplDetail'); openVersion(); });

    $('tcSave').addEventListener('click', function () {
      if (!$('tcName').value.trim() || !$('tcBody').value.trim()) { F.toast('Template name and draft body are required.', 'err'); return; }
      F.closeModal('tplCreate');
      F.toast('201 Created \u2014 version 1 is MENUNGGU_PERSETUJUAN, active_version_id stays NULL. Event: NASKAH_DIBUAT.', 'ok');
    });
    $('tvSubmit').addEventListener('click', function () {
      if (!$('tvBody').value.trim()) { F.toast('The body is required — a new version carries the whole draft.', 'err'); return; }
      F.closeModal('tplVersion');
      F.toast('201 Created \u2014 new version MENUNGGU_PERSETUJUAN. The active pointer did not move. Event: NASKAH_VERSI_BARU.', 'ok');
    });
    $('taSubmit').addEventListener('click', function () {
      if (decision === 'DITOLAK' && !$('taReason').value.trim()) { F.toast('reject_reason is required when DITOLAK (and forbidden when DISETUJUI).', 'err'); return; }
      F.closeModal('tplApprove');
      F.toast(decision === 'DISETUJUI'
        ? '200 \u2014 DISETUJUI. Approval fields filled, active_version_id shifted. Event: NASKAH_DISETUJUI.'
        : '200 \u2014 DITOLAK. Approval fields stay NULL, the pointer does not move. Event: NASKAH_DITOLAK.', 'ok');
    });
    $('toDo').addEventListener('click', function () {
      F.closeModal('tplOff');
      F.toast('200 \u2014 is_active=false. Idempotent: deactivating again returns 200 with zero second event.', 'ok');
    });
  });
})();
