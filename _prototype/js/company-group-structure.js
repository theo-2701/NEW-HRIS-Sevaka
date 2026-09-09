// ============================================================
// SEVAKA HRIS — Company · Group Structure (Group / Level / Position)
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;

  var GROUPS = [
    { name:'Struktur Utama', def:true, approver:'Bpk. Wibowo — Dirut (D001)', active:true },
    { name:'Struktur Operasional', def:false, approver:'Ibu Sari — Wadirut (D002)', active:true },
    { name:'Default Group', def:false, approver:'—', active:false }
  ];
  var LEVELS = [
    { order:1, name:'Direksi', group:'Struktur Utama' }, { order:2, name:'Divisi', group:'Struktur Utama' },
    { order:3, name:'Departemen', group:'Struktur Utama' }, { order:4, name:'Seksi', group:'Struktur Utama' },
    { order:1, name:'Direktorat', group:'Struktur Operasional' }, { order:2, name:'Divisi Ops', group:'Struktur Operasional' }
  ];
  // Positions form an approval chain: parent = ID of another POSITION (not employee).
  var POSITIONS = [
    { id:'p1', name:'Direktur Utama', level:'Direksi', emp:'Bpk. Wibowo (D001)', parent:null, group:'Struktur Utama' },
    { id:'p2', name:'Direktur Keuangan', level:'Direksi', emp:'Ibu Sari (D002)', parent:'p1', group:'Struktur Utama' },
    { id:'p3', name:'Manager Keuangan', level:'Divisi', emp:null, parent:'p2', group:'Struktur Utama' },
    { id:'p4', name:'Staff Akuntansi', level:'Departemen', emp:'Budi Santoso (E001)', parent:'p3', group:'Struktur Utama' },
    { id:'p5', name:'Direktur Operasional', level:'Direksi', emp:'Andi Wijaya (E003)', parent:'p1', group:'Struktur Utama' },
    { id:'p6', name:'Manager Operasional', level:'Divisi', emp:'Sari Melati (E002)', parent:'p5', group:'Struktur Utama' },
    { id:'p7', name:'Supervisor Operasional', level:'Departemen', emp:null, parent:'p6', group:'Struktur Utama' },
    { id:'p8', name:'Staff Operasional', level:'Seksi', emp:'Dedi Kurnia (E004)', parent:'p7', group:'Struktur Utama' }
  ];
  var HIST = [
    { act:'I', detail:'Position created — "Manager Keuangan", parent "Direktur Keuangan"', when:'02 Jul 2026 09:14' },
    { act:'U', detail:'Employee assigned — Budi Santoso (E001)', when:'02 Jul 2026 10:02' },
    { act:'U', detail:'Employee resigned — slot returned to vacant', when:'14 Jul 2026 16:40' }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function $(id){ return document.getElementById(id); }

  // ---- pagination helpers ----
  var gPage=1, gSize=10, lPage=1, lSize=10, lGroupSel='Struktur Utama', pGroupSel='Struktur Utama';
  var expanded = {};          // collapsed by default — only roots visible
  var pEditMode = false;
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

  function renderGroups(){
    var q=($('gSearch').value||'').toLowerCase();
    var rows=GROUPS.filter(function(g){ return g.name.toLowerCase().indexOf(q)>-1; });
    var info=pageSlice(rows,gPage,gSize); gPage=info.page;
    $('gCount').textContent=GROUPS.length;
    $('gBody').innerHTML=info.slice.map(function(g){
      var gi=GROUPS.indexOf(g);
      return '<tr>' +
        '<td class="cell-strong">'+esc(g.name)+'</td>' +
        '<td class="ta-c">'+(g.def?'<span class="sb sb--blue"><span class="sb__dot"></span>Default</span>':'<span class="cell-dim">—</span>')+'</td>' +
        '<td class="cell-dim">'+esc(g.approver)+'</td>' +
        '<td class="ta-c"><span class="sb '+(g.active?'sb--green':'sb--grey')+'"><span class="sb__dot"></span>'+(g.active?'Active':'Inactive')+'</span></td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" data-gedit="'+gi+'">Edit</button></div></td>' +
      '</tr>';
    }).join('');
    setFoot('g', info, 'groups');
  }
  function renderLevels(){
    var q=($('lSearch').value||'').toLowerCase();
    var rows=LEVELS.filter(function(l){ return l.group===lGroupSel && l.name.toLowerCase().indexOf(q)>-1; });
    var info=pageSlice(rows,lPage,lSize); lPage=info.page;
    $('lCount').textContent=LEVELS.filter(function(l){return l.group===lGroupSel;}).length;
    $('lBody').innerHTML=info.slice.map(function(l){
      var li=LEVELS.indexOf(l);
      var menu=F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-ledit="'+li+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-ldel="'+li+'"', danger:true }
      ]);
      return '<tr><td class="ta-c cell-strong">'+l.order+'</td><td>'+esc(l.name)+'</td><td class="ta-r">'+menu+'</td></tr>';
    }).join('');
    setFoot('l', info, 'levels');
    if (window.lucide) window.lucide.createIcons();
  }

  // ---- collapsible position tree (parent = position) ----
  function childrenOf(id){ return POSITIONS.filter(function(p){ return p.parent===id && p.group===pGroupSel; }); }
  function visibleNodes(){
    var out=[];
    (function walk(list, depth){
      list.forEach(function(n){
        out.push({ node:n, depth:depth });
        if (expanded[n.id]) walk(childrenOf(n.id), depth+1);
      });
    })(POSITIONS.filter(function(p){ return p.parent===null && p.group===pGroupSel; }), 0);
    return out;
  }
  function renderTree(){
    $('pCount').textContent = POSITIONS.filter(function(p){ return p.group===pGroupSel; }).length;
    var caretPath = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    $('pTree').innerHTML = visibleNodes().map(function(row){
      var p=row.node, vacant=!p.emp, kids=childrenOf(p.id).length>0, open=!!expanded[p.id];
      var toggle = kids
        ? '<button class="co-node__toggle'+(open?' is-open':'')+'" type="button" data-toggle="'+p.id+'" aria-label="Toggle children">'+caretPath+'</button>'
        : '<span class="co-node__toggle co-node__toggle--leaf">'+caretPath+'</span>';
      var badge = vacant
        ? '<span class="sb sb--amber"><span class="sb__dot"></span>Vacant</span>'
        : '<span class="sb sb--green"><span class="sb__dot"></span>Filled</span>';
      var menu = F.rowMenu(vacant ? [
        { label:'Assign employee', icon:'user-plus', attr:'data-assign="'+p.id+'"' },
        { label:'Edit', icon:'pencil', attr:'data-pedit="'+p.id+'"' },
        { label:'History', icon:'history', attr:'data-hist="'+p.id+'"' }
      ] : [
        { label:'Edit', icon:'pencil', attr:'data-pedit="'+p.id+'"' },
        { label:'Unassign (resign)', icon:'user-minus', attr:'data-unassign="'+p.id+'"' },
        { label:'History', icon:'history', attr:'data-hist="'+p.id+'"' }
      ]);
      return '<div class="co-node'+(vacant?' co-node--vacant':'')+'" style="margin-left:'+(row.depth*26)+'px">' +
        toggle +
        '<span class="co-node__rail"></span>' +
        '<div class="co-node__main"><span class="co-node__name">'+esc(p.name)+'</span>' +
        '<span class="co-node__meta"><b>'+esc(p.level)+'</b>'+(p.emp?' · '+esc(p.emp):' · no employee')+'</span></div>' +
        '<div class="co-node__end">'+badge+menu+'</div></div>';
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  }
  function renderHist(){
    var badge = { I:'sb--green', U:'sb--blue', D:'sb--red' };
    var label = { I:'Created', U:'Updated', D:'Deleted' };
    $('hBody').innerHTML = HIST.map(function(h){
      return '<tr><td class="ta-c"><span class="sb '+badge[h.act]+'"><span class="sb__dot"></span>'+label[h.act]+'</span></td><td>'+esc(h.detail)+'</td><td class="cell-dim">'+esc(h.when)+'</td></tr>';
    }).join('');
  }

  function posById(id){ for (var i=0;i<POSITIONS.length;i++) if (POSITIONS[i].id===id) return POSITIONS[i]; return null; }

  // ---- searchable list-of-values (employee picker; handles long lists) ----
  var EMPLOYEES = [
    'Budi Santoso · NIK 30011', 'Sari Melati · NIK 30012', 'Andi Wijaya · NIK 30013',
    'Rina Kartika · NIK 30044', 'Dedi Kurnia · NIK 30052', 'Wahyu Pratama · NIK 30061',
    'Siti Nurhaliza · NIK 30078', 'Bagus Setiawan · NIK 30083', 'Lestari Dewi · NIK 30090',
    'Fajar Ramadhan · NIK 30101', 'Maya Anggraini · NIK 30112', 'Yoga Perdana · NIK 30125',
    'Ika Puspita · NIK 30138', 'Rendra Saputra · NIK 30147'
  ];
  function initLov(rootId, opts, allowVacant){
    var root=$(rootId); if(!root) return;
    var trg=root.querySelector('.lov__trigger'), val=root.querySelector('.lov__val');
    var search=root.querySelector('.lov__search input'), list=root.querySelector('.lov__list');
    var full = allowVacant ? ['— Vacant (no employee) —'].concat(opts) : opts;
    function paint(f){ f=(f||'').toLowerCase();
      var rows=full.filter(function(o){ return o.toLowerCase().indexOf(f)>-1; });
      list.innerHTML = rows.length
        ? rows.map(function(o){ return '<div class="lov__opt'+(root.dataset.value===o?' is-sel':'')+'" data-o="'+esc(o)+'">'+esc(o)+'</div>'; }).join('')
        : '<div class="lov__empty">No employee matches your search.</div>';
    }
    trg.addEventListener('click', function(e){ e.stopPropagation();
      var open=root.classList.toggle('is-open');
      if(open){ search.value=''; paint(''); setTimeout(function(){ search.focus(); },0); }
    });
    search.addEventListener('input', function(){ paint(search.value); });
    search.addEventListener('click', function(e){ e.stopPropagation(); });
    list.addEventListener('click', function(e){ var o=e.target.closest('[data-o]'); if(!o) return;
      var v=o.getAttribute('data-o');
      var vacant = allowVacant && v.indexOf('Vacant')>-1;
      root.dataset.value = vacant ? '' : v;
      val.textContent = vacant ? 'Vacant (no employee)' : v;
      trg.classList.toggle('is-placeholder', !allowVacant && vacant);
      if(!allowVacant) trg.classList.remove('is-placeholder');
      root.classList.remove('is-open');
    });
    document.addEventListener('click', function(e){ if(!e.target.closest('#'+rootId)) root.classList.remove('is-open'); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderGroups(); renderLevels(); renderTree(); renderHist();
    initLov('aEmp', EMPLOYEES, false);
    initLov('pEmp', EMPLOYEES, true);

    $('gAdd').addEventListener('click', function(){ $('gTitle').textContent='Add group'; F.openModal('gEdit'); });
    $('lAdd').addEventListener('click', function(){ $('lTitle').textContent='Add level'; F.openModal('lEdit'); });
    $('pAdd').addEventListener('click', function(){ pEditMode=false; $('pTitle').textContent='Add position'; $('pSave').textContent='Save position'; F.openModal('pEdit'); });

    // search
    $('gSearch').addEventListener('input', function(){ gPage=1; renderGroups(); });
    $('lSearch').addEventListener('input', function(){ lPage=1; renderLevels(); });

    // group filters
    $('lGroup').addEventListener('select', function(e){ lGroupSel=e.detail.value; lPage=1; renderLevels(); });
    $('pGroup').addEventListener('select', function(e){ pGroupSel=e.detail.value.replace(/^Group:\s*/,''); expanded={}; renderTree(); });

    // pagination
    $('gPrev').addEventListener('click', function(){ if(gPage>1){gPage--;renderGroups();} });
    $('gNext').addEventListener('click', function(){ gPage++; renderGroups(); });
    $('gPageSize').addEventListener('change', function(){ gSize=+this.value; gPage=1; renderGroups(); });
    $('lPrev').addEventListener('click', function(){ if(lPage>1){lPage--;renderLevels();} });
    $('lNext').addEventListener('click', function(){ lPage++; renderLevels(); });
    $('lPageSize').addEventListener('change', function(){ lSize=+this.value; lPage=1; renderLevels(); });

    // row actions
    $('gBody').addEventListener('click', function(e){ if (e.target.closest('[data-gedit]')){ $('gTitle').textContent='Edit group'; F.openModal('gEdit'); } });
    $('lBody').addEventListener('click', function(e){
      if (e.target.closest('[data-ledit]')){ $('lTitle').textContent='Edit level'; F.openModal('lEdit'); }
      else if (e.target.closest('[data-ldel]')){ var i=+e.target.closest('[data-ldel]').dataset.ldel; LEVELS.splice(i,1); renderLevels(); F.toast('Level deleted.','ok'); }
    });
    $('pTree').addEventListener('click', function(e){
      var tg=e.target.closest('[data-toggle]');
      if (tg){ var id=tg.dataset.toggle; expanded[id]=!expanded[id]; renderTree(); return; }
      if (e.target.closest('[data-pedit]')){ pEditMode=true; $('pTitle').textContent='Edit position'; $('pSave').textContent='Update position'; F.openModal('pEdit'); }
      else if (e.target.closest('[data-assign]')){ F.openModal('aEdit'); }
      else if (e.target.closest('[data-unassign]')){ var p=posById(e.target.closest('[data-unassign]').dataset.unassign); if(p){ p.emp=null; renderTree(); F.toast('Employee unassigned · slot vacant · log activity U.','ok'); } }
      else if (e.target.closest('[data-hist]')){ F.openModal('hView'); }
    });

    $('gSave').addEventListener('click', function(){ F.closeModal('gEdit'); F.toast('Group saved.','ok'); });
    $('lSave').addEventListener('click', function(){ F.closeModal('lEdit'); F.toast('Level saved.','ok'); });
    $('pSave').addEventListener('click', function(){ F.closeModal('pEdit'); F.toast(pEditMode ? 'Position updated · log activity U.' : 'Position saved · log activity I.','ok'); });
    $('aSave').addEventListener('click', function(){ F.closeModal('aEdit'); F.toast('Employee assigned · log activity U.','ok'); });
  });
})();
