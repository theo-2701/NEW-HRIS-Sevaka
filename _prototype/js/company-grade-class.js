// ============================================================
// SEVAKA HRIS — Company · Grade & Class (self-ref, 2 tiers)
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;
  var fmt = function(n){ return n ? n.toLocaleString('id-ID') : null; };

  var GRADES = [
    { name:'G-1 Executive', code:'G1', from:40000000, to:80000000, active:true },
    { name:'G-2 Manager', code:'G2', from:20000000, to:35000000, active:true },
    { name:'G-3 Staff', code:'G3', from:null, to:null, active:false }
  ];
  var CLASSES = [
    { name:'Manager 1', code:'M.1', parent:'G-2 Manager', from:30000000, to:35000000, active:true },
    { name:'Manager 2', code:'M.2', parent:'G-2 Manager', from:20000000, to:29000000, active:true },
    { name:'G-3A', code:'G3A', parent:'G-3 Staff', from:5000000, to:7000000, active:true }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function $(id){ return document.getElementById(id); }
  function range(f,t){ return (f&&t) ? 'Rp '+fmt(f)+' – '+fmt(t) : '<span class="cell-dim">—</span>'; }

  // ---- pagination + filter state ----
  var grPage=1, grSize=10, grStatus='', grQ='';
  var clPage=1, clSize=10, clStatus='', clQ='';
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
  function matchStatus(active, f){ return !f || (f==='Active') === active; }

  function renderGrades(){
    var rows = GRADES.filter(function(g){
      return matchStatus(g.active, grStatus) && (g.name.toLowerCase().indexOf(grQ)>-1 || g.code.toLowerCase().indexOf(grQ)>-1);
    });
    var info=pageSlice(rows,grPage,grSize); grPage=info.page;
    $('grCount').textContent = GRADES.length;
    $('grBody').innerHTML = info.slice.map(function(g){
      var i=GRADES.indexOf(g);
      return '<tr><td class="cell-strong">'+esc(g.name)+'</td><td class="cell-mono">'+esc(g.code)+'</td>' +
        '<td class="ta-r">'+range(g.from,g.to)+'</td>' +
        '<td class="ta-c"><span class="sb '+(g.active?'sb--green':'sb--grey')+'"><span class="sb__dot"></span>'+(g.active?'Active':'Inactive')+'</span></td>' +
        '<td class="ta-r">'+F.rowMenu([{label:'Edit',icon:'pencil',attr:'data-gedit="'+i+'"'},{label:'Delete',icon:'trash-2',attr:'data-gdel="'+i+'"',danger:true}])+'</td></tr>';
    }).join('');
    setFoot('gr', info, 'grades');
    if (window.lucide) window.lucide.createIcons();
  }
  function renderClasses(){
    var rows = CLASSES.filter(function(c){
      return matchStatus(c.active, clStatus) && (c.name.toLowerCase().indexOf(clQ)>-1 || c.code.toLowerCase().indexOf(clQ)>-1);
    });
    var info=pageSlice(rows,clPage,clSize); clPage=info.page;
    $('clCount').textContent = CLASSES.length;
    $('clBody').innerHTML = info.slice.map(function(c){
      var i=CLASSES.indexOf(c);
      return '<tr><td class="cell-strong">'+esc(c.name)+'</td><td class="cell-mono">'+esc(c.code)+'</td>' +
        '<td class="cell-dim">'+esc(c.parent)+'</td>' +
        '<td class="ta-r">'+range(c.from,c.to)+'</td>' +
        '<td class="ta-c"><span class="sb '+(c.active?'sb--green':'sb--grey')+'"><span class="sb__dot"></span>'+(c.active?'Active':'Inactive')+'</span></td>' +
        '<td class="ta-r">'+F.rowMenu([{label:'Edit',icon:'pencil',attr:'data-cedit="'+i+'"'},{label:'Delete',icon:'trash-2',attr:'data-cdel="'+i+'"',danger:true}])+'</td></tr>';
    }).join('');
    setFoot('cl', info, 'classes');
    if (window.lucide) window.lucide.createIcons();
  }

  var isClass = false, editMode = false;
  function setMode(cls){
    isClass = cls;
    ['gcFromReq','gcToReq','gcParentReq'].forEach(function(id){ $(id).style.display = cls?'inline':'none'; });
    $('gcParentOpt').style.display = cls?'none':'inline';
    // Parent Grade is immutable when editing an existing Class (UIC self-ref rule)
    var lockParent = cls && editMode;
    $('gcParentLock').classList.toggle('is-hidden', !lockParent);
    var pctl = $('gcParent');
    pctl.style.pointerEvents = lockParent ? 'none' : '';
    pctl.style.opacity = lockParent ? '.55' : '';
  }

  document.addEventListener('DOMContentLoaded', function(){
    renderGrades(); renderClasses();
    var addMenu = $('addMenu'), addBtn = $('addBtn'), delTarget = null;
    function onClassTab(){ return document.querySelector('#gcTabs .tabnav__tab.is-on').dataset.tab==='class'; }
    function syncAddLabel(){ var c=onClassTab(); addBtn.childNodes[0].nodeValue = c?'Add class':'Add grade'; $('addSingleLbl').textContent = c?'Add class':'Add grade'; }

    $('gcTabs').addEventListener('tabchange', syncAddLabel);
    syncAddLabel();

    // split Add menu
    addBtn.addEventListener('click', function(e){ e.stopPropagation(); addMenu.classList.toggle('is-open'); });
    document.addEventListener('click', function(e){ if(!e.target.closest('#addMenu')) addMenu.classList.remove('is-open'); });
    addMenu.querySelectorAll('[data-add]').forEach(function(item){
      item.addEventListener('click', function(){
        addMenu.classList.remove('is-open');
        if (item.dataset.add==='bulk'){ F.openModal('gcBulk'); return; }
        openEdit(onClassTab(), onClassTab()?'Add class':'Add grade');
      });
    });

    function openEdit(cls, title){
      editMode = /Edit/.test(title);
      $('gcTitle').textContent = title;
      $('gcErr').classList.add('is-hidden');
      $('gcSave').textContent = editMode ? 'Update' : 'Save';
      setMode(cls);
      F.openModal('gcEdit');
    }

    $('gcParent').addEventListener('select', function(e){ if(!editMode) setMode(!!e.detail.value); });

    // search
    $('grSearch').addEventListener('input', function(){ grQ=this.value.toLowerCase(); grPage=1; renderGrades(); });
    $('clSearch').addEventListener('input', function(){ clQ=this.value.toLowerCase(); clPage=1; renderClasses(); });
    // status filter
    $('grStatus').addEventListener('select', function(e){ grStatus=(e.detail.value==='All statuses')?'':e.detail.value; grPage=1; renderGrades(); });
    $('clStatus').addEventListener('select', function(e){ clStatus=(e.detail.value==='All statuses')?'':e.detail.value; clPage=1; renderClasses(); });
    // pagination
    $('grPrev').addEventListener('click', function(){ if(grPage>1){grPage--;renderGrades();} });
    $('grNext').addEventListener('click', function(){ grPage++; renderGrades(); });
    $('grPageSize').addEventListener('change', function(){ grSize=+this.value; grPage=1; renderGrades(); });
    $('clPrev').addEventListener('click', function(){ if(clPage>1){clPage--;renderClasses();} });
    $('clNext').addEventListener('click', function(){ clPage++; renderClasses(); });
    $('clPageSize').addEventListener('change', function(){ clSize=+this.value; clPage=1; renderClasses(); });

    // row actions
    $('grBody').addEventListener('click', function(e){
      if (e.target.closest('[data-gedit]')) openEdit(false,'Edit grade');
      else if (e.target.closest('[data-gdel]')){ var i=+e.target.closest('[data-gdel]').dataset.gdel; delTarget={a:GRADES,i:i,r:renderGrades}; $('delMsg').textContent='Delete grade "'+GRADES[i].name+'"?'; F.openModal('delConfirm'); }
    });
    $('clBody').addEventListener('click', function(e){
      if (e.target.closest('[data-cedit]')) openEdit(true,'Edit class');
      else if (e.target.closest('[data-cdel]')){ var i=+e.target.closest('[data-cdel]').dataset.cdel; delTarget={a:CLASSES,i:i,r:renderClasses}; $('delMsg').textContent='Delete class "'+CLASSES[i].name+'"?'; F.openModal('delConfirm'); }
    });

    // save
    $('gcSave').addEventListener('click', function(){
      if (isClass){
        var f = parseInt(($('gcFrom').value||'').replace(/\D/g,''),10);
        var t = parseInt(($('gcTo').value||'').replace(/\D/g,''),10);
        if (!f || !t || t < f){ $('gcErr').classList.remove('is-hidden'); if(window.lucide)window.lucide.createIcons(); return; }
      }
      F.closeModal('gcEdit');
      F.toast((editMode?'Updated':'Saved')+' '+(isClass?'class':'grade')+(editMode?' · log activity U.':'.'),'ok');
    });

    // bulk import
    var bi=$('gcBulkInput'), bn=$('gcBulkName'), bb=$('gcBulkBox'), bc=$('gcBulkClear');
    bi.addEventListener('change', function(){ if(bi.files&&bi.files.length){ bn.textContent=bi.files[0].name; bn.classList.add('has-file'); bb.classList.add('is-filled'); bc.classList.remove('is-hidden'); } });
    bc.addEventListener('click', function(e){ e.preventDefault(); bi.value=''; bn.textContent='No file selected'; bb.classList.remove('is-filled'); bc.classList.add('is-hidden'); });
    $('gcBulkSave').addEventListener('click', function(){ F.closeModal('gcBulk'); F.toast('Records imported (bulk).','ok'); });
    $('gcTplLink').addEventListener('click', function(){ F.toast('Template downloaded.','info'); });

    // delete
    $('delConfirmBtn').addEventListener('click', function(){
      if (delTarget){ delTarget.a.splice(delTarget.i,1); delTarget.r(); }
      F.closeModal('delConfirm'); F.toast('Record deleted (soft).','ok'); delTarget=null;
    });
  });
})();
