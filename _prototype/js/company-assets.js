// ============================================================
// SEVAKA HRIS — Company · Assets (List / Assigned / Category)
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;

  // status enum → badge class + label + description
  var STATUS = {
    AVAILABLE:           { cls:'sb--green',  label:'Available',           desc:'In the assignable pool.' },
    ASSIGNED:            { cls:'sb--blue',   label:'Assigned',            desc:'Currently held by an employee.' },
    INCOMPLETE:          { cls:'sb--amber',  label:'Incomplete',          desc:'Assigned but missing detail — non-blocking.' },
    NOT_AVAILABLE:       { cls:'sb--red',    label:'Not available',       desc:'Blocker — branch or category missing.' },
    AUCTION:             { cls:'sb--indigo', label:'Auction',             desc:'Marked for auction — may return to Available.' },
    SOLD:                { cls:'sb--grey',   label:'Sold',                desc:'Terminal — disposed by sale.' },
    ACCIDENTALLY_LOST:   { cls:'sb--orange', label:'Accidentally lost',   desc:'Terminal — incident, no claim.' },
    GRANTED:             { cls:'sb--grey',   label:'Granted',             desc:'Terminal — disposed by grant.' },
    EMPLOYEE_NEGLIGENCE: { cls:'sb--red',    label:'Employee negligence', desc:'Terminal — flagged for claim.' }
  };
  function badge(s){ var m=STATUS[s]||{cls:'sb--grey',label:s}; return '<span class="sb '+m.cls+'"><span class="sb__dot"></span>'+m.label+'</span>'; }

  var HAND = {
    NONE:    { cls:'sb--grey',  label:'None' },
    GIVING:  { cls:'sb--blue',  label:'Giving' },
    RECEIVE: { cls:'sb--green', label:'Receive' }
  };
  function handBadge(h){ var m=HAND[h]||HAND.NONE; return '<span class="sb '+m.cls+'"><span class="sb__dot"></span>'+m.label+'</span>'; }

  var ASSETS = [
    { code:'AST-0001', name:'Laptop Dell XPS 13', cat:'IT Equipment', branch:'Kantor Bandung', own:'OWNED', status:'ASSIGNED', hand:'GIVING', holder:'Budi Santoso (E001)' },
    { code:'AST-0002', name:'Forklift Toyota', cat:'Kendaraan', branch:'Gudang Bekasi', own:'LEASED', status:'AVAILABLE', hand:'RECEIVE', holder:null },
    { code:'AST-0003', name:'Meja Kerja Eksekutif', cat:'Furniture', branch:'Kantor Pusat Jakarta', own:'OWNED', status:'INCOMPLETE', hand:'GIVING', holder:'Sari Melati (E002)' },
    { code:'AST-0004', name:'Proyektor Epson', cat:'IT Equipment', branch:'Kantor Surabaya', own:'OWNED', status:'AVAILABLE', hand:'NONE', holder:null },
    { code:'AST-0005', name:'Printer Canon', cat:'—', branch:'—', own:'OWNED', status:'NOT_AVAILABLE', hand:'NONE', holder:null },
    { code:'AST-0006', name:'Mobil Operasional Avanza', cat:'Kendaraan', branch:'Kantor Bandung', own:'OWNED', status:'AUCTION', hand:'NONE', holder:null },
    { code:'AST-0007', name:'Laptop Lenovo T14', cat:'IT Equipment', branch:'Kantor Pusat Jakarta', own:'OWNED', status:'SOLD', hand:'NONE', holder:null }
  ];
  var CATS = [
    { name:'IT Equipment', interval:180 }, { name:'Kendaraan', interval:90 }, { name:'Furniture', interval:365 }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function $(id){ return document.getElementById(id); }
  var OWN = { OWNED:'Owned', LEASED:'Leased' };

  // ---- pagination (Branch pattern) ----
  var alPage = 1, alSize = 10;
  var agPage = 1, agSize = 10;
  var acPage = 1, acSize = 10;

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

  function kpis(){
    var c = function(s){ return ASSETS.filter(function(a){return a.status===s;}).length; };
    $('kAvail').textContent = c('AVAILABLE');
    $('kAssigned').textContent = c('ASSIGNED');
    $('kIncomplete').textContent = c('INCOMPLETE');
    $('kNa').textContent = c('NOT_AVAILABLE');
  }

  function renderList(){
    var q = ($('alSearch').value||'').toLowerCase();
    var rows = ASSETS.filter(function(a){ return (a.code+a.name).toLowerCase().indexOf(q)>-1; });
    $('alCount').textContent = ASSETS.length;
    var info = pageSlice(rows, alPage, alSize); alPage = info.page;
    $('alBody').innerHTML = info.slice.map(function(a){
      return '<tr><td class="cell-mono">'+esc(a.code)+'</td>' +
        '<td><a class="co-link" href="company-asset-detail.html">'+esc(a.name)+'</a></td>' +
        '<td'+(a.cat==='—'?' class="cell-dim"':'')+'>'+esc(a.cat)+'</td>' +
        '<td'+(a.branch==='—'?' class="cell-dim"':'')+'>'+esc(a.branch)+'</td>' +
        '<td>'+esc(OWN[a.own])+'</td><td class="ta-c">'+badge(a.status)+'</td>' +
        '<td class="ta-c">'+handBadge(a.hand)+'</td>' +
        '<td class="ta-r"><div class="rowacts"><a class="rowbtn" href="company-asset-detail.html">View Detail</a></div></td></tr>';
    }).join('');
    setFoot('al', info, 'assets');
  }

  function renderAssigned(){
    var q = ($('agSearch').value||'').toLowerCase();
    var all = ASSETS.filter(function(a){ return a.status==='ASSIGNED'||a.status==='INCOMPLETE'; });
    $('agCount').textContent = all.length;
    var rows = all.filter(function(a){ return (a.code+a.name).toLowerCase().indexOf(q)>-1; });
    var info = pageSlice(rows, agPage, agSize); agPage = info.page;
    $('agBody').innerHTML = info.slice.map(function(a){
      return '<tr><td class="cell-mono">'+esc(a.code)+'</td><td class="cell-strong">'+esc(a.name)+'</td>' +
        '<td>'+esc(a.holder||'—')+'</td><td>'+esc(a.branch)+'</td><td class="ta-c">'+badge(a.status)+'</td>' +
        '<td class="ta-r"><div class="rowacts"><a class="rowbtn" href="company-asset-detail.html">View Detail</a></div></td></tr>';
    }).join('');
    setFoot('ag', info, 'assigned');
  }

  function renderCats(){
    var q = ($('acSearch').value||'').toLowerCase();
    $('acCount').textContent = CATS.length;
    var rows = CATS.filter(function(c){ return c.name.toLowerCase().indexOf(q)>-1; });
    var info = pageSlice(rows, acPage, acSize); acPage = info.page;
    $('acBody').innerHTML = info.slice.map(function(c){
      var i = CATS.indexOf(c);
      var menu = F.rowMenu([
        { label:'Edit', icon:'pencil', attr:'data-acedit="'+i+'"' },
        { label:'Delete', icon:'trash-2', attr:'data-acdel="'+i+'"', danger:true }
      ]);
      return '<tr><td class="cell-strong">'+esc(c.name)+'</td><td class="ta-c">'+c.interval+'</td>' +
        '<td class="ta-c"><span class="sb sb--green"><span class="sb__dot"></span>Active</span></td>' +
        '<td class="ta-r">'+menu+'</td></tr>';
    }).join('');
    setFoot('ac', info, 'categories');
    if (window.lucide) window.lucide.createIcons();
  }

  function renderLegend(){
    $('legendGrid').innerHTML = Object.keys(STATUS).map(function(k){
      var m=STATUS[k];
      return '<div class="co-legend__row">'+badge(k)+'<div class="co-legend__txt"><b>'+m.label+'</b>'+esc(m.desc)+'</div></div>';
    }).join('');
  }

  document.addEventListener('DOMContentLoaded', function(){
    kpis(); renderList(); renderAssigned(); renderCats(); renderLegend();
    var delTarget = null;

    $('regBtn').addEventListener('click', function(){ F.openModal('regEdit'); });
    $('legendBtn').addEventListener('click', function(){ F.openModal('legendModal'); });
    $('acAdd').addEventListener('click', function(){ $('acTitle').textContent='Add category'; F.openModal('acEdit'); });

    // ---- search ----
    $('alSearch').addEventListener('input', function(){ alPage = 1; renderList(); });
    $('agSearch').addEventListener('input', function(){ agPage = 1; renderAssigned(); });
    $('acSearch').addEventListener('input', function(){ acPage = 1; renderCats(); });

    // ---- pagination ----
    $('alPrev').addEventListener('click', function(){ if(alPage>1){ alPage--; renderList(); } });
    $('alNext').addEventListener('click', function(){ alPage++; renderList(); });
    $('alPageSize').addEventListener('change', function(){ alSize = +this.value; alPage = 1; renderList(); });
    $('agPrev').addEventListener('click', function(){ if(agPage>1){ agPage--; renderAssigned(); } });
    $('agNext').addEventListener('click', function(){ agPage++; renderAssigned(); });
    $('agPageSize').addEventListener('change', function(){ agSize = +this.value; agPage = 1; renderAssigned(); });
    $('acPrev').addEventListener('click', function(){ if(acPage>1){ acPage--; renderCats(); } });
    $('acNext').addEventListener('click', function(){ acPage++; renderCats(); });
    $('acPageSize').addEventListener('change', function(){ acSize = +this.value; acPage = 1; renderCats(); });

    // ownership radios → toggle blocks
    $('rOwn').addEventListener('change', function(e){
      var leased = e.target.value==='LEASED';
      $('rOwnedBlock').classList.toggle('is-hidden', leased);
      $('rLeasedBlock').classList.toggle('is-hidden', !leased);
    });
    // branch/category empty → NOT_AVAILABLE note
    function checkNa(){
      var cat = document.querySelector('#rCat .ctl__value').textContent.indexOf('Select')===-1;
      var br = document.querySelector('#rBranch .ctl__value').textContent.indexOf('Select')===-1;
      $('rNaNote').classList.toggle('is-hidden', cat && br);
    }
    $('rCat').addEventListener('select', checkNa);
    $('rBranch').addEventListener('select', checkNa);

    $('acBody').addEventListener('click', function(e){
      var ed=e.target.closest('[data-acedit]'), d=e.target.closest('[data-acdel]');
      if (ed){ $('acTitle').textContent='Edit category'; F.openModal('acEdit'); }
      else if (d){ delTarget=+d.dataset.acdel; F.toast('Category deleted (soft).','ok'); }
    });

    $('regSave').addEventListener('click', function(){ F.closeModal('regEdit'); F.toast('Asset registered.','ok'); });
    $('acSave').addEventListener('click', function(){ F.closeModal('acEdit'); F.toast('Category saved.','ok'); });
  });
})();
