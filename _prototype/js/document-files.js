// ============================================================
// SEVAKA HRIS — Document Service · file catalogue (A3 / A4 / A2 / A16)
// ONE contract, four screens (Company · Employee · Other · ESS Files).
// The only difference is owner_type / owner_id each screen sends — the
// grid, detail and content panels are literally the same code (FSD §1–3, §6).
// ============================================================
(function () {
  'use strict';
  var F = window.Flow, D = window.DocData;
  var esc = D.esc, dt = D.dt, sb = D.sb, eb = D.enumBadge;

  var PAGE = document.body.getAttribute('data-doc-page');
  var CFG = {
    company:  { owner_type:'PERUSAHAAN', cols:['name','category','origin','class','scan','tier','size','created'] },
    employee: { owner_type:'KARYAWAN',   cols:['name','category','class','scan','tier','size','created'], needsPicker:true },
    other:    { owner_type:'OBJEK_LAIN', cols:['name','kind','category','class','scan','size','created'] },
    ess:      { owner_type:'KARYAWAN',   cols:['name','category','class','scan','size','created'], fromToken:true }
  }[PAGE];

  var HEAD = {
    name:'File Name', category:'Category', origin:'Origin', class:'Class', scan:'Scan',
    tier:'Storage', size:'Size', created:'Created', kind:'Object Kind'
  };

  var state = { q:'', category:'', origin:'', kind:'', objectId:'', from:'', to:'', owner:null };
  var pager = null, current = null, currentVersion = null;

  function $(id) { return document.getElementById(id); }

  function rows() {
    return D.DOCS.filter(function (d) {
      if (d.owner_type !== CFG.owner_type) return false;
      if (CFG.owner_type === 'KARYAWAN' && state.owner && d.owner_id !== state.owner.id) return false;
      if (state.category && d.category_id !== state.category) return false;
      if (state.origin && d.origin !== state.origin) return false;
      if (state.kind && d.owner_object_kind !== state.kind) return false;
      if (state.objectId && d.owner_id !== state.objectId) return false;
      if (state.q) {
        var v = D.activeVersion(d);
        if (v.original_filename.toLowerCase().indexOf(state.q) < 0) return false;
      }
      if (state.from && d.created_at.slice(0, 10) < state.from) return false;
      if (state.to && d.created_at.slice(0, 10) > state.to) return false;
      return true;
    });
  }

  function cell(key, d) {
    var v = D.activeVersion(d);
    switch (key) {
      case 'name': return '<td><span class="idlink" data-detail="' + d.document_id + '">' + esc(v.original_filename) + '</span>' +
        ' <span class="cell-dim">v' + v.version_no + '</span>' +
        (d.is_new && PAGE === 'ess' ? ' ' + sb('green', 'BARU') : '') + '</td>';
      case 'category': return '<td>' + esc(d.category_name) + '</td>';
      case 'origin':   return '<td>' + eb(d.origin) + '</td>';
      case 'kind':     return '<td>' + eb(d.owner_object_kind) + '<div class="cell-dim">' + esc(d.owner_caption) + '</div></td>';
      case 'class':    return '<td>' + eb(d.confidentiality_class_effective) + '</td>';
      case 'scan':     return '<td>' + eb(v.scan_state) + '</td>';
      case 'tier':     return '<td>' + eb(v.storage_tier) + '</td>';
      case 'size':     return '<td class="cell-dim">' + D.bytes(v.size_bytes) + '</td>';
      case 'created':  return '<td class="cell-dim">' + dt(d.created_at) + '</td>';
    }
    return '<td></td>';
  }

  function render() {
    var body = $('docBody');
    if (CFG.needsPicker && !state.owner) { return; }
    var all = rows();
    var slice = pager ? pager.slice(all) : all;
    body.innerHTML = slice.length ? slice.map(function (d) {
      var acts = F.rowMenu([
        { label:'View Detail', icon:'file-search', attr:'data-detail="' + d.document_id + '"' },
        { label:'Open File Content', icon:'external-link', attr:'data-open="' + d.document_id + '"' }
      ]);
      return '<tr>' + CFG.cols.map(function (k) { return cell(k, d); }).join('') +
        '<td class="ta-r"><div class="rowacts">' + acts + '</div></td></tr>';
    }).join('') : '<tr><td colspan="' + (CFG.cols.length + 1) + '" class="tempty">No documents. An empty grid is a <code>200</code> with <code>data:[]</code> — never a 404.</td></tr>';
    if (pager) pager.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------- A4 detail + version history ----------
  function openDetail(id) {
    var d = D.doc(id); if (!d) return;
    current = d;
    var v = D.activeVersion(d);
    $('dtTitle').textContent = v.original_filename;
    var kv =
      row('Category', esc(d.category_name)) +
      row('Origin', eb(d.origin)) +
      row('Owner type', eb(d.owner_type) + (d.owner_object_kind ? ' <span class="cell-dim">' + esc(d.owner_caption) + '</span>' : '')) +
      row('Effective class', eb(d.confidentiality_class_effective) + ' <span class="cell-dim">derived, never stored</span>') +
      row('Catalog state', eb(d.catalog_state)) +
      row('Created', dt(d.created_at, true) + ' <span class="cell-dim">Asia/Jakarta</span>') +
      row('Updated', d.updated_at ? dt(d.updated_at, true) : '\u2014');
    $('dtKv').innerHTML = kv;

    $('dtVersions').innerHTML = d.versions.slice().reverse().map(function (x) {
      return '<tr><td>v' + x.version_no + (x.version_id === d.active_version_id ? ' ' + sb('blue', 'ACTIVE') : '') + '</td>' +
        '<td>' + esc(x.original_filename) + '</td>' +
        '<td class="cell-dim">' + esc(x.detected_mime) + '</td>' +
        '<td class="cell-dim">' + D.bytes(x.size_bytes) + '</td>' +
        '<td>' + eb(x.scan_state) + '</td>' +
        '<td>' + eb(x.storage_tier) + '</td>' +
        '<td class="cell-dim">' + dt(x.created_at, true) + '</td></tr>';
    }).join('');

    var lt = d.letter, box = $('dtLetter');
    if (lt) {
      box.style.display = '';
      $('dtLetterKv').innerHTML =
        row('Letter no', '<strong>' + esc(lt.letter_no) + '</strong>') +
        row('Target', eb(lt.letter_target)) +
        row('Issuance state', eb(lt.letter_issuance_state)) +
        row('Letter state', eb(lt.letter_state)) +
        row('Issued at', dt(lt.issued_at, true) + ' <span class="cell-dim">Asia/Jakarta</span>') +
        row('Verification code', '<code>' + esc(lt.verification_code) + '</code>');
      // A11/A12 are HR levers — absent on the ESS screen (its 6 addresses stop at A10/A15).
      if ($('dtApprove')) $('dtApprove').style.display = lt.letter_issuance_state === 'MENUNGGU_PERSETUJUAN' ? '' : 'none';
      if ($('dtCancel')) $('dtCancel').style.display = (lt.letter_issuance_state === 'TERBIT' && lt.letter_state === 'BERLAKU') ? '' : 'none';
    } else { box.style.display = 'none'; }

    F.openModal('docDetail');
    if (window.lucide) window.lucide.createIcons();
  }
  function row(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  // ---------- A2 content ----------
  function openContent(id) {
    var d = D.doc(id); if (!d) return;
    current = d;
    var v = D.activeVersion(d);
    currentVersion = v;
    var sensitive = d.confidentiality_class_effective === 'SENSITIF';
    $('ctTitle').textContent = v.original_filename;
    $('ctDesc').textContent = 'GET /documents/{document-id}/content \u2014 ' +
      (sensitive ? 'class SENSITIF: in-app viewer is mandatory.' : 'class BIASA: the browser\u2019s built-in viewer is legitimate.');
    $('ctHeads').innerHTML = '<pre>HTTP/1.1 200 OK\nContent-Type: ' + esc(v.detected_mime) +
      '\nContent-Length: ' + v.size_bytes +
      '\nContent-Disposition: inline; filename="' + esc(v.original_filename) + '"' +
      '\nCache-Control: no-store\nPragma: no-cache\nX-Content-Type-Options: nosniff</pre>';
    $('ctViewer').className = 'doc-viewer' + (sensitive ? ' doc-viewer--inapp' : '');
    $('ctViewer').innerHTML =
      '<div class="doc-viewer__ic"><i data-lucide="' + (sensitive ? 'shield' : 'file-text') + '"></i></div>' +
      '<div class="doc-viewer__t">' + (sensitive ? 'In-app viewer' : 'Browser viewer') + ' \u00b7 ' + esc(v.original_filename) + '</div>' +
      '<div class="doc-viewer__s">' + (sensitive
        ? 'Bytes are pulled with an <code>Authorization: Bearer</code> header and painted from browser memory. <code>Content-Disposition: inline</code> is not a permission to hand the file to the native viewer (DOC-24 d).'
        : 'Bytes are pulled with an <code>Authorization: Bearer</code> header, then handed to the browser viewer. Never a plain <code>&lt;img src&gt;</code> / <code>&lt;a href&gt;</code> (PROB-FRONTEND-029).') +
      '</div>';
    $('ctLog').innerHTML = '<p>One <code>log_document_access</code> row was committed <strong>before the first byte</strong> was released \u2014 granularity <strong>' +
      (sensitive ? 'PER_PEMBUKAAN' : 'PER_PERMINTAAN') + '</strong> (effective class ' + d.confidentiality_class_effective +
      '). A failed commit means zero bytes flow and a uniform <code>404</code>.</p>';
    F.openModal('docContent');
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------- employee picker (Employee Files only) — EF-1, an in-page step ----------
  var pkQuery = '', pkPager = null;
  function paintPicker() {
    var b = $('pkBody'); if (!b) return;
    var all = D.EMPLIST.filter(function (e) {
      if (!pkQuery) return true;
      return (e.nama + ' ' + e.nik).toLowerCase().indexOf(pkQuery) >= 0;
    });
    var list = pkPager ? pkPager.slice(all) : all;
    b.innerHTML = list.length ? list.map(function (e) {
      var i = D.EMPLIST.indexOf(e);
      return '<tr><td><strong>' + esc(e.nik) + '</strong></td><td>' + esc(e.nama) + '</td><td class="cell-dim">' + esc(e.dept) + '</td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" data-pick="' + i + '">Select</button></div></td></tr>';
    }).join('') : '<tr><td colspan="4" class="tempty">No employee matches. The list comes from employee-service and is already scoped to what you may see.</td></tr>';
    if (pkPager) pkPager.paint();
  }
  function showStep(which) {
    var p = $('docPick'), g = $('docGrid');
    if (!p || !g) return;
    p.style.display = which === 'pick' ? '' : 'none';
    g.style.display = which === 'pick' ? 'none' : '';
  }
  function setOwner(e) {
    state.owner = e;
    var ctx = $('docCtx');
    if (ctx) {
      ctx.style.display = '';
      ctx.innerHTML = '<div class="doc-ctx__av">' + esc(e.nama.slice(0, 1)) + '</div>' +
        '<div><div class="doc-ctx__n">' + esc(e.nama) + '</div><div class="doc-ctx__m">NIK ' + esc(e.nik) + ' \u00b7 ' + esc(e.dept) +
        ' \u00b7 <code>owner_id</code> carried into every A3 call</div></div>' +
        '<div style="flex:1"></div><button class="btn btn--secondary" id="pkChange">Change employee</button>';
      $('pkChange').addEventListener('click', function () { showStep('pick'); });
    }
    showStep('grid');
    if (pager) pager.reset();
    render();
  }

  // ---------- category picker (A16) ----------
  function fillCategories() {
    var dd = document.querySelector('#docCategory .dropdown');
    if (!dd) return;
    var list = D.CATS.filter(function (c) {
      if (!c.is_active) return false;                       // server filter: is_active=true
      if (PAGE === 'ess' && !c.shown_in_self_service) return false; // second filter, ROLE_EMPLOYEE only
      return true;
    });
    dd.innerHTML = '<div class="dropdown__opt is-sel" data-val="">All categories</div>' +
      list.map(function (c) { return '<div class="dropdown__opt" data-val="' + c.id + '">' + esc(c.category_name) + '</div>'; }).join('');
  }

  document.addEventListener('DOMContentLoaded', function () {
    fillCategories();
    F.wireSelects();
    pager = F.pager('docFoot', 10, render, 'documents');

    var s = $('docSearch');
    if (s) s.addEventListener('input', function () { state.q = this.value.toLowerCase(); pager.reset(); render(); });
    var c = $('docCategory');
    if (c) c.addEventListener('select', function (e) { state.category = D.filterValue(this, e.detail.value); pager.reset(); render(); });
    var o = $('docOrigin');
    if (o) o.addEventListener('select', function (e) { state.origin = (e.detail.value === 'All origins') ? '' : e.detail.value; pager.reset(); render(); });
    var k = $('docKind');
    if (k) k.addEventListener('select', function (e) { state.kind = (e.detail.value === 'All object kinds') ? '' : e.detail.value; pager.reset(); render(); });
    var ob = $('docObject');
    if (ob) ob.addEventListener('select', function (e) { state.objectId = (e.detail.value === 'All objects') ? '' : e.detail.value; pager.reset(); render(); });
    var r = $('docRange');
    if (r) r.addEventListener('rangechange', function (e) { state.from = e.detail.from; state.to = e.detail.to; pager.reset(); render(); });

    if (CFG.needsPicker) {
      pkPager = F.pager('pkFoot', 10, paintPicker, 'employees');
      paintPicker();
      showStep('pick');
      var ps = $('pkSearch');
      if (ps) ps.addEventListener('input', function () { pkQuery = this.value.toLowerCase(); pkPager.reset(); paintPicker(); });
    }
    if (CFG.fromToken) setOwner(D.EMP.e8);

    document.addEventListener('click', function (e) {
      var det = e.target.closest('[data-detail]'), op = e.target.closest('[data-open]'), pk = e.target.closest('[data-pick]');
      if (det) { openDetail(det.getAttribute('data-detail')); }
      else if (op) { openContent(op.getAttribute('data-open')); }
      else if (pk) { setOwner(D.EMPLIST[+pk.getAttribute('data-pick')]); }
    });

    $('dtOpen').addEventListener('click', function () { F.closeModal('docDetail'); openContent(current.document_id); });
    var ca = $('dtCancel');
    if (ca) ca.addEventListener('click', function () { F.closeModal('docDetail'); F.openModal('docCancel'); });
    var ap = $('dtApprove');
    if (ap) ap.addEventListener('click', function () {
      F.closeModal('docDetail');
      F.toast('200 \u2014 letter approved, letter_issuance_state=TERBIT. Approver \u2260 submitter is enforced server-side.', 'ok');
    });
    var cd = $('docCancelDo');
    if (cd) cd.addEventListener('click', function () {
      var v = ($('ccReason').value || '').trim();
      if (v.length < 1) { F.toast('cancel_reason is always required (1\u2013500 characters).', 'err'); return; }
      F.closeModal('docCancel');
      F.toast('200 \u2014 letter_state=DIBATALKAN. The file itself is untouched.', 'ok');
    });
    document.addEventListener('doc-refresh', render);
    render();
  });
})();
