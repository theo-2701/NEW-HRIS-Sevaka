// SEVAKA HRIS — ESS · Request Letter (A10 self path + A15)
(function () {
  'use strict';
  var F = window.Flow, D = window.DocData;
  var picked = null;

  // A15, ROLE_EMPLOYEE filter: is_active + has an active version + is_self_requestable
  // + category retention_regime = TEMPORARY. Only one template survives layer 1.
  function issuable() {
    return D.TPL.filter(function (t) {
      return t.is_active && t.active_version_id && t.is_self_requestable && t.category_retention_regime === 'TEMPORARY';
    }).map(function (t) {
      return { id:t.id, template_name:t.template_name, letter_target:t.letter_target,
        effective_requires_approval: t.category_retention_regime === 'PERMANENT' || t.requires_approval,
        active_version_no:t.active_version_no };
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var list = issuable();
    var dd = document.getElementById('essTplDD');
    if (!dd) return;
    dd.innerHTML = list.length
      ? list.map(function (t) {
          return '<div class="dropdown__opt" data-val="' + t.id + '">' + D.esc(t.template_name) +
            '<span class="cell-dim"> · ' + (t.effective_requires_approval ? 'needs approval' : 'issued immediately') + '</span></div>';
        }).join('')
      : '<div class="dropdown__empty">No letter type can be self-requested.</div>';
    F.wireSelects();

    document.getElementById('essRequest').addEventListener('click', function () { F.openModal('essAsk'); });
    document.getElementById('essTpl').addEventListener('select', function (e) {
      picked = null;
      for (var i = 0; i < list.length; i++) if (list[i].id === e.detail.value) picked = list[i];
      document.getElementById('essGate').innerHTML = picked
        ? '<div class="doc-note"><div class="doc-note__h"><i data-lucide="zap"></i>' +
          (picked.effective_requires_approval ? 'Needs approval' : 'Issued immediately') + '</div>' +
          '<p><code>effective_requires_approval = ' + picked.effective_requires_approval + '</code> — the result of the formula “category PERMANENT <strong>OR</strong> requires_approval”. An indicator, not a promise: the server decides again on submit. Active draft: v' + picked.active_version_no + '.</p></div>'
        : '';
      if (window.lucide) window.lucide.createIcons();
    });

    var issued = 0;
    document.getElementById('essSubmit').addEventListener('click', function () {
      if (!picked) { F.toast('template_id is always required.', 'err'); return; }
      F.closeModal('essAsk');
      issued++;
      var no = (2 + issued);
      var seq = (no < 10 ? '00' : '0') + no;
      var now = new Date();
      var iso = now.toISOString().replace('Z', '+07:00');
      var vid = '0198f9a1-01' + seq + '-7e50-9c00-0000000' + seq;
      D.DOCS.unshift({
        document_id: '0198e5f6-01' + seq + '-7c30-8a00-0000000' + seq,
        category_id: D.CATS[0].id, category_name: 'Surat Keterangan Kerja', origin: 'DILAHIRKAN_SISTEM',
        owner_type: 'KARYAWAN', owner_object_kind: null, owner_id: D.EMP.e8.id, owner_caption: 'KARYAWAN',
        confidentiality_class_effective: 'BIASA', catalog_state: 'AKTIF',
        created_at: iso, updated_at: null, is_new: true,
        active_version_id: vid,
        versions: [{ version_id: vid, version_no: 1,
          original_filename: 'skk-yanti-prasetya-' + seq + '.pdf', size_bytes: 215104, detected_mime: 'application/pdf',
          scan_state: 'BERSIH', storage_tier: 'PANAS', scanned_at: iso, scanned_at_timezone: 'Asia/Jakarta',
          archived_at: null, created_at: iso }],
        letter: { letter_id: '0198f0a1-01' + seq + '-7a70-9b00-0000000' + seq, letter_no: seq + '/HRD/VIII/2026',
          letter_target: 'PERORANGAN', letter_issuance_state: 'TERBIT', letter_state: 'BERLAKU',
          issued_at: iso, template_id: picked.id, template_version_id: null,
          subject_employee_id: D.EMP.e8.id, branch_id: null, verification_code: 'N3PQ-' + seq + 'XK-8RTM' }
      });
      F.toast('201 Created \u2014 letter_issuance_state=TERBIT, letter_no ' + seq + '/HRD/VIII/2026. The new row is marked BARU; no manual refresh.', 'ok');
      document.dispatchEvent(new Event('doc-refresh'));
    });
  });
})();
