// ============================================================
// SEVAKA HRIS — Company · Disposal (type + is_employee MbV)
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;
  var TYPE = { SOLD:{cls:'sb--grey',label:'Sold'}, AUCTION:{cls:'sb--indigo',label:'Auction'}, GRANTED:{cls:'sb--grey',label:'Granted'} };

  var DISPOSALS = [
    { asset:'AST-0007 · Laptop Lenovo T14', type:'SOLD', recv:'CV Sumber Jaya (external)', nominal:'Rp 4.500.000', date:'12 Jun 2026' },
    { asset:'AST-0011 · Kursi Kantor (10)', type:'GRANTED', recv:'Yayasan Peduli (external)', nominal:'—', date:'02 May 2026' },
    { asset:'AST-0006 · Mobil Avanza', type:'AUCTION', recv:'—', nominal:'—', date:'20 Apr 2026' }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function $(id){ return document.getElementById(id); }
  var dPage = 1, dSize = 10;

  function render(){
    var q = ($('dSearch').value||'').toLowerCase();
    var rows = DISPOSALS.filter(function(d){ return (d.asset+d.recv).toLowerCase().indexOf(q)>-1; });
    var total = rows.length;
    var pages = Math.max(1, Math.ceil(total/dSize));
    if (dPage > pages) dPage = pages;
    var from = total ? (dPage-1)*dSize+1 : 0, to = Math.min(dPage*dSize, total);
    $('dBody').innerHTML = rows.slice((dPage-1)*dSize, dPage*dSize).map(function(d){
      var t=TYPE[d.type]||{cls:'sb--grey',label:d.type};
      return '<tr><td class="cell-strong">'+esc(d.asset)+'</td>' +
        '<td><span class="sb '+t.cls+'"><span class="sb__dot"></span>'+t.label+'</span></td>' +
        '<td class="cell-dim">'+esc(d.recv)+'</td><td class="ta-r">'+esc(d.nominal)+'</td>' +
        '<td class="ta-c"><span class="sb '+t.cls+'"><span class="sb__dot"></span>'+t.label+'</span></td>' +
        '<td class="cell-dim">'+esc(d.date)+'</td></tr>';
    }).join('');
    $('dShowing').textContent = total ? ('Showing '+from+'–'+to+' of '+total+' disposals') : 'Showing 0 of 0 disposals';
    $('dPageBox').textContent = dPage;
    $('dPageOf').textContent = 'of '+pages;
    $('dPrev').disabled = dPage<=1;
    $('dNext').disabled = dPage>=pages;
  }

  document.addEventListener('DOMContentLoaded', function(){
    render();
    document.getElementById('dispBtn').addEventListener('click', function(){ F.openModal('dispEdit'); });
    $('dSearch').addEventListener('input', function(){ dPage=1; render(); });
    $('dPrev').addEventListener('click', function(){ if(dPage>1){ dPage--; render(); } });
    $('dNext').addEventListener('click', function(){ dPage++; render(); });
    $('dPageSize').addEventListener('change', function(){ dSize=+this.value; dPage=1; render(); });

    // disposal type radios → nominal only for SOLD; update impact label
    Array.prototype.forEach.call(document.querySelectorAll('#dType input[name=dispType]'), function(r){
      r.addEventListener('change', function(){
        var v = this.value;
        document.getElementById('dNominalFld').classList.toggle('is-hidden', v!=='SOLD');
        var msg = document.getElementById('dImpactMsg');
        var note = document.getElementById('dImpact');
        if (v === 'AUCTION') {
          note.classList.remove('note--warn'); note.classList.add('note--info');
          msg.innerHTML = 'The asset will be marked for <strong>AUCTION</strong> — not terminal. If the auction is cancelled it can return to <strong>AVAILABLE</strong>.';
        } else {
          note.classList.remove('note--info'); note.classList.add('note--warn');
          msg.innerHTML = 'The asset will become terminal <strong>'+(TYPE[v]?TYPE[v].label.toUpperCase():v)+'</strong> and can no longer return to the pool.';
        }
      });
    });

    // is_employee toggle → employee vs external sub-form
    document.getElementById('dIsEmp').addEventListener('change', function(e){
      var emp = e.target.checked;
      document.getElementById('dEmpForm').classList.toggle('is-hidden', !emp);
      document.getElementById('dExtForm').classList.toggle('is-hidden', emp);
    });

    document.getElementById('dSave').addEventListener('click', function(){ F.closeModal('dispEdit'); F.toast('Asset disposed — terminal status set.','ok'); });
  });
})();
