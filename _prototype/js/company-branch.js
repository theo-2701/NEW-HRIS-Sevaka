// ============================================================
// SEVAKA HRIS — Company · Branch (list + group tabs)
// Runs after shell.js + dashboard.js + flow-common.js.
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;

  var BRANCHES = [
    { name:'Kantor Pusat Jakarta', code:'BR-HQ-01', cat:'Head Quarter', parent:'—', prov:'DKI Jakarta', city:'Jakarta Selatan', emp:412 },
    { name:'Kantor Bandung', code:'BR-BDG-01', cat:'Regional', parent:'Kantor Pusat Jakarta', prov:'Jawa Barat', city:'Bandung', emp:186 },
    { name:'Kantor Surabaya', code:'BR-SBY-01', cat:'Regional', parent:'Kantor Pusat Jakarta', prov:'Jawa Timur', city:'Surabaya', emp:203 },
    { name:'Gudang Bekasi', code:'BR-BKS-02', cat:'Sub Branch', parent:'Kantor Bandung', prov:'Jawa Barat', city:'Bekasi', emp:57 },
    { name:'Kantor Jayapura', code:'BR-JPR-01', cat:'Sub Branch', parent:'Kantor Surabaya', prov:'Papua', city:'Jayapura', emp:24 },
    { name:'Gudang Cikarang', code:'BR-CKR-03', cat:'Sub Branch', parent:'Kantor Bandung', prov:'Jawa Barat', city:'Cikarang', emp:41 },
    { name:'Kantor Medan', code:'BR-MDN-01', cat:'Regional', parent:'Kantor Pusat Jakarta', prov:'Sumatera Utara', city:'Medan', emp:96 },
    { name:'Kantor Semarang', code:'BR-SMG-01', cat:'Regional', parent:'Kantor Pusat Jakarta', prov:'Jawa Tengah', city:'Semarang', emp:78 },
    { name:'Kantor Denpasar', code:'BR-DPS-01', cat:'Sub Branch', parent:'Kantor Surabaya', prov:'Bali', city:'Denpasar', emp:33 },
    { name:'Kantor Makassar', code:'BR-MKS-01', cat:'Regional', parent:'Kantor Pusat Jakarta', prov:'Sulawesi Selatan', city:'Makassar', emp:64 },
    { name:'Gudang Tangerang', code:'BR-TGR-02', cat:'Sub Branch', parent:'Kantor Pusat Jakarta', prov:'Banten', city:'Tangerang', emp:52 },
    { name:'Kantor Balikpapan', code:'BR-BPP-01', cat:'Sub Branch', parent:'Kantor Makassar', prov:'Kalimantan Timur', city:'Balikpapan', emp:29 }
  ];
  var GROUPS = [
    { name:'Head Quarter', order:1, child:true, active:true },
    { name:'Regional', order:2, child:true, active:true },
    { name:'Sub Branch', order:3, child:false, active:true }
  ];

  var ZIP = { '40115':['Jawa Barat','Bandung','Asia/Jakarta'], '10110':['DKI Jakarta','Jakarta Pusat','Asia/Jakarta'], '60111':['Jawa Timur','Surabaya','Asia/Jakarta'], '99111':['Papua','Jayapura','Asia/Jayapura'] };

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function $(id){ return document.getElementById(id); }

  // ---- pagination state ----
  var brPage = 1, brSize = 10, brProv = '';
  var bgPage = 1, bgSize = 10;

  function pageSlice(rows, page, size){
    var total = rows.length;
    var pages = Math.max(1, Math.ceil(total / size));
    if (page > pages) page = pages;
    var from = total ? (page - 1) * size + 1 : 0;
    var to = Math.min(page * size, total);
    return { slice: rows.slice((page-1)*size, page*size), total: total, pages: pages, page: page, from: from, to: to };
  }
  function setFoot(pre, info, noun){
    $(pre+'Showing').textContent = info.total ? ('Showing ' + info.from + '\u2013' + info.to + ' of ' + info.total + ' ' + noun) : ('Showing 0 of 0 ' + noun);
    $(pre+'PageBox').textContent = info.page;
    $(pre+'PageOf').textContent = 'of ' + info.pages;
    $(pre+'Prev').disabled = info.page <= 1;
    $(pre+'Next').disabled = info.page >= info.pages;
  }

  function renderBranches() {
    var q = ($('brSearch').value || '').toLowerCase();
    var rows = BRANCHES.filter(function(b){
      return b.name.toLowerCase().indexOf(q) > -1 && (!brProv || b.prov === brProv);
    });
    var info = pageSlice(rows, brPage, brSize); brPage = info.page;
    $('brCount').textContent = rows.length;
    $('brBody').innerHTML = info.slice.map(function(b){
      var gi = BRANCHES.indexOf(b);
      var menu = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-edit="'+gi+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-del="'+gi+'"', danger:true }
      ]);
      return '<tr>' +
        '<td><a class="co-link" data-view="'+gi+'">'+esc(b.name)+'</a></td>' +
        '<td class="cell-mono">'+esc(b.code)+'</td>' +
        '<td>'+esc(b.cat)+'</td>' +
        '<td class="cell-dim">'+esc(b.parent)+'</td>' +
        '<td>'+esc(b.prov)+' <span class="cell-dim">\u00b7 '+esc(b.city)+'</span></td>' +
        '<td class="ta-c cell-strong">'+b.emp+'</td>' +
        '<td class="ta-r">'+menu+'</td>' +
      '</tr>';
    }).join('');
    setFoot('br', info, 'branches');
    if (window.lucide) window.lucide.createIcons();
  }

  function renderGroups() {
    var q = ($('bgSearch').value || '').toLowerCase();
    var rows = GROUPS.filter(function(g){ return g.name.toLowerCase().indexOf(q) > -1; });
    var info = pageSlice(rows, bgPage, bgSize); bgPage = info.page;
    $('bgCount').textContent = rows.length;
    $('bgBody').innerHTML = info.slice.map(function(g){
      var gi = GROUPS.indexOf(g);
      var menu = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-gedit="'+gi+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-gdel="'+gi+'"', danger:true }
      ]);
      return '<tr>' +
        '<td class="cell-strong">'+esc(g.name)+'</td>' +
        '<td class="ta-c">'+g.order+'</td>' +
        '<td class="ta-c">'+(g.child ? '<span class="sb sb--green"><span class="sb__dot"></span>Yes</span>' : '<span class="sb sb--grey"><span class="sb__dot"></span>No</span>')+'</td>' +
        '<td class="ta-c"><span class="sb '+(g.active?'sb--green':'sb--grey')+'"><span class="sb__dot"></span>'+(g.active?'Active':'Inactive')+'</span></td>' +
        '<td class="ta-r">'+menu+'</td>' +
      '</tr>';
    }).join('');
    setFoot('bg', info, 'categories');
    if (window.lucide) window.lucide.createIcons();
  }

  // --- derive province/city/timezone from zip ---
  function wireZip() {
    var zip = $('brZip');
    zip.addEventListener('input', function(){
      var d = ZIP[zip.value.trim()];
      var p = $('brDerProv'), c = $('brDerCity'), t = $('brDerTz');
      if (d) { p.textContent = d[0]; c.textContent = d[1]; t.textContent = d[2]; [p,c,t].forEach(function(e){e.classList.remove('co-derived--empty');}); }
      else { p.textContent='\u2014 derived from zip'; c.textContent='\u2014 derived from zip'; t.textContent='\u2014 derived from zip'; [p,c,t].forEach(function(e){e.classList.add('co-derived--empty');}); }
    });
  }

  function openBranch(edit, b) {
    $('brEditTitle').textContent = edit ? 'Edit branch' : 'Add branch';
    // branch_code is immutable on edit (UIC §2.2) — lock the field
    var codeInput = $('brCode');
    codeInput.disabled = !!edit;
    codeInput.closest('.ctl').style.opacity = edit ? '.6' : '';
    $('brSave').textContent = edit ? 'Update branch' : 'Save branch';
    F.openModal('brEdit');
  }

  var delTarget = null;
  document.addEventListener('DOMContentLoaded', function(){
    renderBranches(); renderGroups(); wireZip();

    // ---- split "Add" menu (Add branch / Add bulk branch) ----
    var addMenu = $('addMenu');
    $('addBtn').addEventListener('click', function(e){ e.stopPropagation(); addMenu.classList.toggle('is-open'); });
    document.addEventListener('click', function(e){ if (!e.target.closest('#addMenu')) addMenu.classList.remove('is-open'); });
    addMenu.querySelectorAll('[data-add]').forEach(function(item){
      item.addEventListener('click', function(){
        addMenu.classList.remove('is-open');
        if (item.dataset.add === 'bulk') F.openModal('brBulk');
        else openBranch(false);
      });
    });

    $('bgAddBtn').addEventListener('click', function(){ $('bgEditTitle').textContent='Add category'; F.openModal('bgEdit'); });

    // ---- search ----
    $('brSearch').addEventListener('input', function(){ brPage = 1; renderBranches(); });
    $('bgSearch').addEventListener('input', function(){ bgPage = 1; renderGroups(); });

    // ---- province filter ----
    $('brProvince').addEventListener('select', function(e){
      var v = e.detail.value; brProv = (v === 'All provinces') ? '' : v; brPage = 1; renderBranches();
    });

    // ---- pagination ----
    $('brPrev').addEventListener('click', function(){ if (brPage>1){ brPage--; renderBranches(); } });
    $('brNext').addEventListener('click', function(){ brPage++; renderBranches(); });
    $('brPageSize').addEventListener('change', function(){ brSize = +this.value; brPage = 1; renderBranches(); });
    $('bgPrev').addEventListener('click', function(){ if (bgPage>1){ bgPage--; renderGroups(); } });
    $('bgNext').addEventListener('click', function(){ bgPage++; renderGroups(); });
    $('bgPageSize').addEventListener('change', function(){ bgSize = +this.value; bgPage = 1; renderGroups(); });

    // ---- row actions ----
    $('brBody').addEventListener('click', function(e){
      var v = e.target.closest('[data-view]'), ed = e.target.closest('[data-edit]'), d = e.target.closest('[data-del]');
      if (ed) openBranch(true, BRANCHES[+ed.dataset.edit]);
      else if (v) openBranch(true, BRANCHES[+v.dataset.view]);
      else if (d) { delTarget = { type:'branch', i:+d.dataset.del }; document.querySelector('#delConfirm .ovl__title').textContent='Delete branch'; $('delMsg').textContent = 'Delete "'+BRANCHES[delTarget.i].name+'"? It will be hidden from the grid but kept for audit.'; F.openModal('delConfirm'); }
    });
    $('bgBody').addEventListener('click', function(e){
      var ed = e.target.closest('[data-gedit]'), d = e.target.closest('[data-gdel]');
      if (ed) { $('bgEditTitle').textContent='Edit category'; F.openModal('bgEdit'); }
      else if (d) { delTarget = { type:'group', i:+d.dataset.gdel }; document.querySelector('#delConfirm .ovl__title').textContent='Delete category'; $('delMsg').textContent='Delete "'+GROUPS[delTarget.i].name+'"?'; F.openModal('delConfirm'); }
    });

    // ---- bulk import file chooser ----
    var bulkInput = $('brBulkInput'), bulkName = $('brBulkName'), bulkBox = $('brBulkBox'), bulkClear = $('brBulkClear');
    bulkInput.addEventListener('change', function(){
      if (bulkInput.files && bulkInput.files.length){ bulkName.textContent = bulkInput.files[0].name; bulkName.classList.add('has-file'); bulkBox.classList.add('is-filled'); bulkClear.classList.remove('is-hidden'); }
    });
    bulkClear.addEventListener('click', function(e){ e.preventDefault(); bulkInput.value=''; bulkName.textContent='No file selected'; bulkBox.classList.remove('is-filled'); bulkClear.classList.add('is-hidden'); });
    $('brBulkSave').addEventListener('click', function(){ F.closeModal('brBulk'); F.toast('Branches imported (bulk).', 'ok'); });
    $('brTplLink').addEventListener('click', function(){ F.toast('Template downloaded.', 'info'); });

    // ---- save / delete ----
    $('brSave').addEventListener('click', function(){ F.closeModal('brEdit'); F.toast('Branch saved.', 'ok'); });
    $('bgSave').addEventListener('click', function(){ F.closeModal('bgEdit'); F.toast('Category saved.', 'ok'); });
    $('delConfirmBtn').addEventListener('click', function(){
      if (delTarget) {
        if (delTarget.type==='branch'){ BRANCHES.splice(delTarget.i,1); renderBranches(); } else { GROUPS.splice(delTarget.i,1); renderGroups(); }
      }
      F.closeModal('delConfirm'); F.toast('Record deleted (soft).', 'ok'); delTarget=null;
    });
  });
})();
