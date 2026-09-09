// ============================================================
// SEVAKA HRIS — Company · Cost Center (Category + List)
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;
  var fmt = function(n){ return n ? 'Rp '+n.toLocaleString('id-ID') : '<span class="cell-dim">—</span>'; };

  var CATS = [
    { name:'Operasional', desc:'Biaya operasional rutin', active:true },
    { name:'Pemasaran', desc:'Iklan & promosi', active:true },
    { name:'Administrasi', desc:'Biaya kantor & umum', active:true }
  ];
  var CCS = [
    { code:'CC-OPS-01', name:'Operasional Bandung', cat:'Operasional', parent:'—', pic:'Budi Santoso (EMP-0012)', budget:120000000, active:true },
    { code:'CC-MKT-01', name:'Pemasaran Nasional', cat:'Pemasaran', parent:'—', pic:'Sari Melati (EMP-0021)', budget:340000000, active:true },
    { code:'CC-ADM-02', name:'Administrasi Surabaya', cat:'Administrasi', parent:'CC-OPS-01', pic:'—', budget:null, active:false }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function $(id){ return document.getElementById(id); }

  // ---- pagination + filter state ----
  var ccPage=1, ccSize=10, ccStatus='', ccQ='';
  var catPage=1, catSize=10;
  function pageSlice(rows, page, size){
    var total=rows.length, pages=Math.max(1, Math.ceil(total/size));
    if (page>pages) page=pages;
    return { slice: rows.slice((page-1)*size, page*size), total:total, pages:pages, page:page,
             from: total?(page-1)*size+1:0, to: Math.min(page*size,total) };
  }
  function setFoot(pre, info, noun){
    $(pre+'Showing').textContent = info.total ? ('Showing '+info.from+'\u2013'+info.to+' of '+info.total+' '+noun) : ('Showing 0 of 0 '+noun);
    $(pre+'PageBox').textContent = info.page; $(pre+'PageOf').textContent = 'of '+info.pages;
    $(pre+'Prev').disabled = info.page<=1; $(pre+'Next').disabled = info.page>=info.pages;
  }
  function matchStatus(active, f){ return !f || (f==='Active') === (active!==false); }

  function renderCC(){
    var rows = CCS.filter(function(c){ return matchStatus(c.active, ccStatus) && (c.code+c.name).toLowerCase().indexOf(ccQ)>-1; });
    var info=pageSlice(rows,ccPage,ccSize); ccPage=info.page;
    document.getElementById('ccCount').textContent = CCS.length;
    document.getElementById('ccBody').innerHTML = info.slice.map(function(c){
      var i=CCS.indexOf(c);
      var acts = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-ccedit="'+i+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-ccdel="'+i+'"', danger:true }
      ]);
      return '<tr><td class="cell-mono">'+esc(c.code)+'</td><td>'+esc(c.name)+'</td>' +
        '<td>'+esc(c.cat)+'</td><td class="cell-dim">'+esc(c.parent)+'</td><td class="cell-dim">'+esc(c.pic)+'</td>' +
        '<td class="ta-r">'+fmt(c.budget)+'</td>' +
        '<td class="ta-c">'+(c.active===false?'<span class="sb sb--grey"><span class="sb__dot"></span>Inactive</span>':'<span class="sb sb--green"><span class="sb__dot"></span>Active</span>')+'</td>' +
        '<td class="ta-r">'+acts+'</td></tr>';
    }).join('');
    setFoot('cc', info, 'cost centers');
    if (window.lucide) window.lucide.createIcons();
  }
  function renderCat(){
    var info=pageSlice(CATS,catPage,catSize); catPage=info.page;
    document.getElementById('catCount').textContent = CATS.length;
    document.getElementById('catBody').innerHTML = info.slice.map(function(c){
      var i=CATS.indexOf(c);
      var acts = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-catedit="'+i+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-catdel="'+i+'"', danger:true }
      ]);
      return '<tr><td>'+esc(c.name)+'</td><td class="cell-dim">'+esc(c.desc)+'</td>' +
        '<td class="ta-c"><span class="sb sb--green"><span class="sb__dot"></span>Active</span></td>' +
        '<td class="ta-r">'+acts+'</td></tr>';
    }).join('');
    setFoot('cat', info, 'categories');
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderCC(); renderCat();
    var delTarget = null;
    var codeInput = document.getElementById('ccCode');

    function openCC(edit, c){
      document.getElementById('ccTitle').textContent = edit?'Edit cost center':'Add cost center';
      codeInput.disabled = !!edit;
      document.getElementById('ccCodeHint').textContent = edit ? 'Code is immutable and cannot be changed.' : 'Set once — cannot be changed later.';
      var act = document.getElementById('ccActive');
      act.checked = c ? c.active !== false : true;
      document.getElementById('ccActiveLabel').textContent = act.checked ? 'Active — assignable to employees' : 'Inactive — history is kept';
      if (c) codeInput.value = c.code;
      F.openModal('ccEdit');
    }

    document.getElementById('ccActive').addEventListener('change', function(){ document.getElementById('ccActiveLabel').textContent = this.checked ? 'Active — assignable to employees' : 'Inactive — history is kept'; });
    document.getElementById('ccAdd').addEventListener('click', function(){ codeInput.value=''; openCC(false); });
    document.getElementById('catAdd').addEventListener('click', function(){ document.getElementById('catTitle').textContent='Add category'; F.openModal('catEdit'); });

    document.getElementById('ccSearch').addEventListener('input', function(){ ccQ=this.value.toLowerCase(); ccPage=1; renderCC(); });
    document.getElementById('ccStatus').addEventListener('select', function(e){ ccStatus=(e.detail.value==='All status')?'':e.detail.value; ccPage=1; renderCC(); });
    $('ccPrev').addEventListener('click', function(){ if(ccPage>1){ccPage--;renderCC();} });
    $('ccNext').addEventListener('click', function(){ ccPage++; renderCC(); });
    $('ccPageSize').addEventListener('change', function(){ ccSize=+this.value; ccPage=1; renderCC(); });
    $('catPrev').addEventListener('click', function(){ if(catPage>1){catPage--;renderCat();} });
    $('catNext').addEventListener('click', function(){ catPage++; renderCat(); });
    $('catPageSize').addEventListener('change', function(){ catSize=+this.value; catPage=1; renderCat(); });

    document.getElementById('ccBody').addEventListener('click', function(e){
      var ed=e.target.closest('[data-ccedit]'), d=e.target.closest('[data-ccdel]');
      if (ed) openCC(true, CCS[+ed.dataset.ccedit]);
      else if (d){ var i=+d.dataset.ccdel; delTarget={a:CCS,i:i,r:renderCC}; document.getElementById('delMsg').textContent='Delete cost center "'+CCS[i].name+'"?'; F.openModal('delConfirm'); }
    });
    document.getElementById('catBody').addEventListener('click', function(e){
      var ed=e.target.closest('[data-catedit]'), d=e.target.closest('[data-catdel]');
      if (ed){ document.getElementById('catTitle').textContent='Edit category'; F.openModal('catEdit'); }
      else if (d){ var i=+d.dataset.catdel; delTarget={a:CATS,i:i,r:renderCat}; document.getElementById('delMsg').textContent='Delete category "'+CATS[i].name+'"?'; F.openModal('delConfirm'); }
    });

    document.getElementById('ccSave').addEventListener('click', function(){ F.closeModal('ccEdit'); F.toast('Cost center saved.','ok'); });
    document.getElementById('catSave').addEventListener('click', function(){ F.closeModal('catEdit'); F.toast('Category saved.','ok'); });
    document.getElementById('delConfirmBtn').addEventListener('click', function(){
      if (delTarget){ delTarget.a.splice(delTarget.i,1); delTarget.r(); }
      F.closeModal('delConfirm'); F.toast('Record deleted (soft).','ok'); delTarget=null;
    });
  });
})();
