// ============================================================
// SEVAKA HRIS — Company · Vendor (flat master)
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;
  var TYPE = { COMPANY:'Company', INDIVIDUAL:'Individual', STORE:'Store', OTHER:'Other' };

  var VENDORS = [
    { name:'PT Bina Karya Logistik', type:'COMPANY', phone:'021 555 1234', tel:'021 555 0000', pic:'Andi', pos:'Sales', addr:'Jl. Industri No.5, Bekasi', active:true },
    { name:'CV Sumber Jaya', type:'STORE', phone:'0812 3450 0000', tel:'022 200 0000', pic:'Rina', pos:'Owner', addr:'Jl. Merdeka No.1, Bandung', active:true },
    { name:'Pak Slamet (Perorangan)', type:'INDIVIDUAL', phone:'0856 7788 1122', tel:'—', pic:'Slamet', pos:'Owner', addr:'Jl. Kenanga No.12, Surabaya', active:false }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function $(id){ return document.getElementById(id); }

  // ---- pagination + filter state ----
  var vPage=1, vSize=10, vStatus='', vQ='';
  function pageSlice(rows, page, size){
    var total=rows.length, pages=Math.max(1, Math.ceil(total/size));
    if (page>pages) page=pages;
    return { slice: rows.slice((page-1)*size, page*size), total:total, pages:pages, page:page,
             from: total?(page-1)*size+1:0, to: Math.min(page*size,total) };
  }
  function matchStatus(active, f){ return !f || (f==='Active') === (active!==false); }

  function render(){
    var rows = VENDORS.filter(function(v){ return matchStatus(v.active, vStatus) && v.name.toLowerCase().indexOf(vQ)>-1; });
    var info=pageSlice(rows,vPage,vSize); vPage=info.page;
    document.getElementById('vBody').innerHTML = info.slice.map(function(v){
      var i=VENDORS.indexOf(v);
      var acts = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-vedit="'+i+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-vdel="'+i+'"', danger:true }
      ]);
      return '<tr><td>'+esc(v.name)+'</td>' +
        '<td><span class="sb sb--blue"><span class="sb__dot"></span>'+esc(TYPE[v.type]||v.type)+'</span></td>' +
        '<td>'+esc(v.phone)+'</td><td class="cell-dim">'+esc(v.tel)+'</td>' +
        '<td>'+esc(v.pic)+' <span class="cell-dim">· '+esc(v.pos)+'</span></td>' +
        '<td class="cell-dim">'+esc(v.addr)+'</td>' +
        '<td class="ta-c">'+(v.active===false?'<span class="sb sb--grey"><span class="sb__dot"></span>Inactive</span>':'<span class="sb sb--green"><span class="sb__dot"></span>Active</span>')+'</td>' +
        '<td class="ta-r">'+acts+'</td></tr>';
    }).join('');
    var f=info; $('vShowing').textContent = f.total ? ('Showing '+f.from+'\u2013'+f.to+' of '+f.total+' vendors') : 'Showing 0 of 0 vendors';
    $('vPageBox').textContent = f.page; $('vPageOf').textContent = 'of '+f.pages;
    $('vPrev').disabled = f.page<=1; $('vNext').disabled = f.page>=f.pages;
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', function(){
    render();
    var delTarget = null;
    function openV(edit, v){
      document.getElementById('vTitle').textContent = edit?'Edit vendor':'Add vendor';
      var act=document.getElementById('vActive');
      act.checked = v ? v.active !== false : true;
      document.getElementById('vActiveLabel').textContent = act.checked ? 'Active — shown in the vendor dropdown' : 'Inactive — hidden from the vendor dropdown';
      F.openModal('vEdit');
    }
    document.getElementById('vActive').addEventListener('change', function(){ document.getElementById('vActiveLabel').textContent = this.checked ? 'Active — shown in the vendor dropdown' : 'Inactive — hidden from the vendor dropdown'; });
    document.getElementById('vAdd').addEventListener('click', function(){ openV(false); });
    document.getElementById('vSearch').addEventListener('input', function(){ vQ=this.value.toLowerCase(); vPage=1; render(); });
    document.getElementById('vStatus').addEventListener('select', function(e){ vStatus=(e.detail.value==='All status')?'':e.detail.value; vPage=1; render(); });
    $('vPrev').addEventListener('click', function(){ if(vPage>1){vPage--;render();} });
    $('vNext').addEventListener('click', function(){ vPage++; render(); });
    $('vPageSize').addEventListener('change', function(){ vSize=+this.value; vPage=1; render(); });
    document.getElementById('vBody').addEventListener('click', function(e){
      var ed=e.target.closest('[data-vedit]'), d=e.target.closest('[data-vdel]');
      if (ed){ openV(true, VENDORS[+ed.dataset.vedit]); }
      else if (d){ var i=+d.dataset.vdel; delTarget=i; document.getElementById('delMsg').textContent='Delete vendor "'+VENDORS[i].name+'"?'; F.openModal('delConfirm'); }
    });
    document.getElementById('vSave').addEventListener('click', function(){ F.closeModal('vEdit'); F.toast('Vendor saved.','ok'); });
    document.getElementById('delConfirmBtn').addEventListener('click', function(){
      if (delTarget!==null){ VENDORS.splice(delTarget,1); render(); }
      F.closeModal('delConfirm'); F.toast('Vendor deleted (soft).','ok'); delTarget=null;
    });
  });
})();
