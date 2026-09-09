// ============================================================
// SEVAKA HRIS — Company · SBU (Group + List) — no budget
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;

  var GROUPS = [ { name:'Retail' }, { name:'Distribusi' }, { name:'Manufaktur' } ];
  var SBUS = [
    { code:'SBU-RTL-01', name:'Toko Bandung', group:'Retail', parent:'Retail Jakarta', pic:'Budi Santoso (EMP-0012)', active:true },
    { code:'SBU-DST-01', name:'Distribusi Jawa', group:'Distribusi', parent:'—', pic:'Sari Melati (EMP-0021)', active:true },
    { code:'SBU-MFG-01', name:'Pabrik Karawang', group:'Manufaktur', parent:'—', pic:'—', active:false }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function $(id){ return document.getElementById(id); }

  // ---- pagination + filter state ----
  var sbuPage=1, sbuSize=10, sbuStatus='', sbuQ='';
  var sgPage=1, sgSize=10;
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

  function renderSbu(){
    var rows = SBUS.filter(function(s){ return matchStatus(s.active, sbuStatus) && (s.code+s.name).toLowerCase().indexOf(sbuQ)>-1; });
    var info=pageSlice(rows,sbuPage,sbuSize); sbuPage=info.page;
    document.getElementById('sbuCount').textContent = SBUS.length;
    document.getElementById('sbuBody').innerHTML = info.slice.map(function(s){
      var i=SBUS.indexOf(s);
      var acts = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-sedit="'+i+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-sdel="'+i+'"', danger:true }
      ]);
      return '<tr><td class="cell-mono">'+esc(s.code)+'</td><td>'+esc(s.name)+'</td>' +
        '<td>'+esc(s.group)+'</td><td class="cell-dim">'+esc(s.parent)+'</td><td class="cell-dim">'+esc(s.pic)+'</td>' +
        '<td class="ta-c">'+(s.active===false?'<span class="sb sb--grey"><span class="sb__dot"></span>Inactive</span>':'<span class="sb sb--green"><span class="sb__dot"></span>Active</span>')+'</td>' +
        '<td class="ta-r">'+acts+'</td></tr>';
    }).join('');
    setFoot('sbu', info, 'SBUs');
    if (window.lucide) window.lucide.createIcons();
  }
  function renderGroups(){
    var info=pageSlice(GROUPS,sgPage,sgSize); sgPage=info.page;
    document.getElementById('sgCount').textContent = GROUPS.length;
    document.getElementById('sgBody').innerHTML = info.slice.map(function(g){
      var i=GROUPS.indexOf(g);
      var acts = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-gedit="'+i+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-gdel="'+i+'"', danger:true }
      ]);
      return '<tr><td>'+esc(g.name)+'</td>' +
        '<td class="ta-c"><span class="sb sb--green"><span class="sb__dot"></span>Active</span></td>' +
        '<td class="ta-r">'+acts+'</td></tr>';
    }).join('');
    setFoot('sg', info, 'groups');
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderSbu(); renderGroups();
    var delTarget = null;

    function openSbu(edit, s){
      document.getElementById('sbuTitle').textContent = edit?'Edit SBU':'Add SBU';
      var act=document.getElementById('sbuActive');
      act.checked = s ? s.active !== false : true;
      document.getElementById('sbuActiveLabel').textContent = act.checked ? 'Active — assignable to employees' : 'Inactive — history is kept';
      F.openModal('sbuEdit');
    }
    document.getElementById('sbuActive').addEventListener('change', function(){ document.getElementById('sbuActiveLabel').textContent = this.checked ? 'Active — assignable to employees' : 'Inactive — history is kept'; });
    document.getElementById('sbuAdd').addEventListener('click', function(){ openSbu(false); });
    document.getElementById('sgAdd').addEventListener('click', function(){ document.getElementById('sgTitle').textContent='Add group'; F.openModal('sgEdit'); });
    document.getElementById('sbuSearch').addEventListener('input', function(){ sbuQ=this.value.toLowerCase(); sbuPage=1; renderSbu(); });
    document.getElementById('sbuStatus').addEventListener('select', function(e){ sbuStatus=(e.detail.value==='All status')?'':e.detail.value; sbuPage=1; renderSbu(); });
    $('sbuPrev').addEventListener('click', function(){ if(sbuPage>1){sbuPage--;renderSbu();} });
    $('sbuNext').addEventListener('click', function(){ sbuPage++; renderSbu(); });
    $('sbuPageSize').addEventListener('change', function(){ sbuSize=+this.value; sbuPage=1; renderSbu(); });
    $('sgPrev').addEventListener('click', function(){ if(sgPage>1){sgPage--;renderGroups();} });
    $('sgNext').addEventListener('click', function(){ sgPage++; renderGroups(); });
    $('sgPageSize').addEventListener('change', function(){ sgSize=+this.value; sgPage=1; renderGroups(); });

    document.getElementById('sbuBody').addEventListener('click', function(e){
      var ed=e.target.closest('[data-sedit]'), d=e.target.closest('[data-sdel]');
      if (ed){ openSbu(true, SBUS[+ed.dataset.sedit]); }
      else if (d){ var i=+d.dataset.sdel; delTarget={a:SBUS,i:i,r:renderSbu}; document.getElementById('delMsg').textContent='Delete SBU "'+SBUS[i].name+'"?'; F.openModal('delConfirm'); }
    });
    document.getElementById('sgBody').addEventListener('click', function(e){
      var ed=e.target.closest('[data-gedit]'), d=e.target.closest('[data-gdel]');
      if (ed){ document.getElementById('sgTitle').textContent='Edit group'; F.openModal('sgEdit'); }
      else if (d){ var i=+d.dataset.gdel; delTarget={a:GROUPS,i:i,r:renderGroups}; document.getElementById('delMsg').textContent='Delete group "'+GROUPS[i].name+'"?'; F.openModal('delConfirm'); }
    });

    document.getElementById('sbuSave').addEventListener('click', function(){ F.closeModal('sbuEdit'); F.toast('SBU saved.','ok'); });
    document.getElementById('sgSave').addEventListener('click', function(){ F.closeModal('sgEdit'); F.toast('Group saved.','ok'); });
    document.getElementById('delConfirmBtn').addEventListener('click', function(){
      if (delTarget){ delTarget.a.splice(delTarget.i,1); delTarget.r(); }
      F.closeModal('delConfirm'); F.toast('Record deleted (soft).','ok'); delTarget=null;
    });
  });
})();
