// ============================================================
// SEVAKA HRIS — Company · Asset Detail & lifecycle
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;

  var HANDOVER = [
    { event:'GIVING', cls:'sb--blue', emp:'Budi Santoso (E001)', loc:'Meja 12', complete:true, notes:'Serah laptop kondisi baik', date:'02 Jul 2026' },
    { event:'RECEIVE', cls:'sb--green', emp:'Andi Wijaya (E003)', loc:'—', complete:true, notes:'Kembali lengkap', date:'28 Jun 2026' },
    { event:'GIVING', cls:'sb--amber', emp:'Andi Wijaya (E003)', loc:'Ruang IT', complete:false, notes:'Charger belum diserahkan', date:'10 May 2026' }
  ];
  var MAINT = [
    { type:'SCHEDULED', cls:'sb--blue', desc:'Servis berkala & pembersihan', cost:'Rp 500.000', vendor:'PT Bina Karya', date:'02 Jun 2026', next:'02 Dec 2026' },
    { type:'UNSCHEDULED', cls:'sb--amber', desc:'Ganti baterai', cost:'Rp 1.200.000', vendor:'CV Sumber Jaya', date:'14 Apr 2026', next:'— (unchanged)' }
  ];
  var TRANSFER = [
    { from:'Kantor Surabaya', to:'Kantor Bandung', reason:'Relokasi staf', date:'20 Mar 2026' }
  ];

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function render(){
    document.getElementById('hoBody').innerHTML = HANDOVER.map(function(h){
      return '<tr><td class="ta-c"><span class="sb '+h.cls+'"><span class="sb__dot"></span>'+h.event+'</span></td>' +
        '<td>'+esc(h.emp)+'</td><td class="cell-dim">'+esc(h.loc)+'</td>' +
        '<td class="ta-c">'+(h.complete?'<span class="sb sb--green"><span class="sb__dot"></span>Yes</span>':'<span class="sb sb--amber"><span class="sb__dot"></span>No</span>')+'</td>' +
        '<td class="cell-dim">'+esc(h.notes)+'</td><td class="cell-dim">'+esc(h.date)+'</td></tr>';
    }).join('');
    document.getElementById('mtBody').innerHTML = MAINT.map(function(m){
      return '<tr><td class="ta-c"><span class="sb '+m.cls+'"><span class="sb__dot"></span>'+m.type+'</span></td>' +
        '<td>'+esc(m.desc)+'</td><td class="ta-r">'+esc(m.cost)+'</td><td class="cell-dim">'+esc(m.vendor)+'</td>' +
        '<td class="cell-dim">'+esc(m.date)+'</td><td class="cell-dim">'+esc(m.next)+'</td></tr>';
    }).join('');
    document.getElementById('trBody').innerHTML = TRANSFER.map(function(t){
      return '<tr><td>'+esc(t.from)+'</td><td class="cell-strong">'+esc(t.to)+'</td><td class="cell-dim">'+esc(t.reason)+'</td><td class="cell-dim">'+esc(t.date)+'</td></tr>';
    }).join('');
  }

  var MODAL = { assign:'mAssign', return:'mReturn', transfer:'mTransfer', maintenance:'mMaint', lease:'mLease', residual:'mResidual' };

  document.addEventListener('DOMContentLoaded', function(){
    render();
    document.querySelectorAll('[data-act]').forEach(function(b){
      b.addEventListener('click', function(){ var id=MODAL[b.dataset.act]; if(id) F.openModal(id); });
    });
    document.querySelectorAll('[data-save]').forEach(function(b){
      b.addEventListener('click', function(){ F.closeModal(b.closest('.ovl')); F.toast(b.dataset.save,'ok'); });
    });
  });
})();
