// new-joiner.js — NJ-LIST + NJ-CREATE + NJ-APPROVE + NJ-MATERIALIZE
(function () {
  'use strict';
  var F = window.Flow;
  var ME = 'Tony Stark';

  var BADGE = {
    DRAFT:        ['sb--grey',  'Draft'],
    SUBMITTED:    ['sb--blue',  'Submitted'],
    IN_APPROVAL:  ['sb--blue',  'In approval'],
    APPROVED:     ['sb--green', 'Approved'],
    REJECTED:     ['sb--red',   'Rejected'],
    MATERIALIZED: ['sb--green', 'Materialised'],
    CANCELLED:    ['sb--grey',  'Cancelled'],
    EXPIRED:      ['sb--orange','Expired']
  };
  var ORDER = ['SUBMITTED','IN_APPROVAL','APPROVED','MATERIALIZED','DRAFT','REJECTED','EXPIRED','CANCELLED'];

  var cands = [
    { name: 'Putri Maharani', init: 'PM', pos: 'Backend Engineer — Engineering HQ', nat: 'CITIZEN',   join: '2026-08-01', status: 'SUBMITTED',    maker: 'Rina Hartono',   email: 'putri.m@email.com' },
    { name: 'James Okafor',   init: 'JO', pos: 'Backend Engineer — Engineering HQ', nat: 'FOREIGNER', join: '2026-08-01', status: 'SUBMITTED',    maker: 'Rina Hartono',   email: 'j.okafor@email.com' },
    { name: 'Andi Wijaya',    init: 'AW', pos: 'Staff Finance — BR-Papua',          nat: 'CITIZEN',   join: '2026-07-28', status: 'IN_APPROVAL',  maker: 'Dewi Anggraini', email: 'andi.w@email.com' },
    { name: 'Siti Nurhaliza', init: 'SN', pos: 'HRBP — People Ops HQ',              nat: 'CITIZEN',   join: '2026-07-20', status: 'APPROVED',     maker: 'Rina Hartono',   email: 'siti.n@email.com', expiry: '2026-07-24' },
    { name: 'Rudi Santoso',   init: 'RS', pos: 'Sales Executive — BR-Surabaya',     nat: 'CITIZEN',   join: '2026-07-18', status: 'APPROVED',     maker: 'Bagus Pratama',  email: 'rudi.s@email.com', expiry: '2026-07-30' },
    { name: 'Maya Kusuma',    init: 'MK', pos: 'Staff Finance — BR-Papua',          nat: 'CITIZEN',   join: '2026-06-15', status: 'MATERIALIZED', maker: 'Rina Hartono',   email: 'maya.k@email.com' },
    { name: 'Bima Sakti',     init: 'BS', pos: 'Sales Executive — BR-Surabaya',     nat: 'CITIZEN',   join: '2026-06-10', status: 'REJECTED',     maker: 'Bagus Pratama',  email: 'bima.s@email.com' },
    { name: 'Clara Dubois',   init: 'CD', pos: 'HRBP — People Ops HQ',              nat: 'FOREIGNER', join: '2026-05-30', status: 'EXPIRED',      maker: 'Dewi Anggraini', email: 'clara.d@email.com' },
    { name: 'Yoga Pratama',   init: 'YP', pos: 'Backend Engineer — Engineering HQ', nat: 'CITIZEN',   join: '2026-09-01', status: 'DRAFT',        maker: 'Tony Stark',     email: 'yoga.p@email.com' }
  ];

  function badge(k) { var b = BADGE[k]; return '<span class="sb ' + b[0] + '"><span class="sb__dot"></span>' + b[1] + '</span>'; }
  var AVCOL = ['#026395','#0284c7','#0369a1','#075985','#7ab9d4'];
  function av(c, i) { return '<span class="avatar avatar--sm" style="background:' + AVCOL[i % AVCOL.length] + '">' + c.init + '</span>'; }

  var pgNj = F.pager('pgNj', 10, function () { renderList(); }, 'candidates');
  var TABS = [['ALL','All'],['SUBMITTED','Submitted'],['IN_APPROVAL','In approval'],['APPROVED','Approved'],['MATERIALIZED','Materialised'],['REJECTED','Rejected'],['EXPIRED','Expired'],['CANCELLED','Cancelled'],['DRAFT','Draft']];
  var filter = 'ALL';

  function renderTabs() {
    document.getElementById('njTabs').innerHTML = TABS.map(function (t) {
      var n = t[0] === 'ALL' ? cands.length : cands.filter(function (c) { return c.status === t[0]; }).length;
      if (t[0] !== 'ALL' && n === 0) return '';
      return '<button class="nj-tab' + (filter === t[0] ? ' is-on' : '') + '" data-tab="' + t[0] + '">' + t[1] + ' <span class="nj-tab__n">' + n + '</span></button>';
    }).join('');
    document.querySelectorAll('#njTabs .nj-tab').forEach(function (b) {
      b.addEventListener('click', function () { filter = b.dataset.tab; renderTabs(); renderList(); });
    });
  }

  function renderList() {
    var rows = cands.filter(function (c) { return filter === 'ALL' || c.status === filter; });
    rows.sort(function (a, b) { return ORDER.indexOf(a.status) - ORDER.indexOf(b.status); });
    var body = document.getElementById('njBody');
    if (!rows.length) { body.innerHTML = '<tr><td colspan="7"><div class="muted-empty">No candidates in this state.</div></td></tr>'; pgNj.slice(rows); pgNj.paint(); return; }
    body.innerHTML = pgNj.slice(rows).map(function (c) {
      var i = cands.indexOf(c);
      var action = '';
      if (c.status === 'DRAFT') action = F.rowMenu([
        { label: 'Submit', icon: 'send', attr: 'data-ajukan="' + i + '"' },
        { label: 'Edit', icon: 'pencil', attr: 'data-edit="' + i + '"' },
        { label: 'Delete', icon: 'trash-2', attr: 'data-del="' + i + '"', danger: true }
      ]);
      else if (c.status === 'SUBMITTED' || c.status === 'IN_APPROVAL') action = '<button class="rowbtn" data-review="' + i + '">Review</button>';
      else if (c.status === 'APPROVED') action = F.rowMenu([
        { label: 'Materialise', icon: 'user-round-check', attr: 'data-mat="' + i + '"' },
        { label: 'Cancel', icon: 'x-circle', attr: 'data-cancel="' + i + '"', danger: true }
      ]);
      else if (c.status === 'MATERIALIZED') action = '<a class="rowbtn" href="transition.html">To Onboarding</a>';
      else action = '<button class="rowbtn rowbtn--ghost" disabled>No action</button>';
      var expiryNote = c.status === 'APPROVED' && c.expiry ? '<div class="person__sub" style="color:var(--color-warning-800)">Seat held until ' + F.fmtDate(c.expiry) + '</div>' : '';
      return '<tr>' +
        '<td><div class="person">' + av(c, i) + '<div class="person__meta"><span class="person__name">' + c.name + '</span><span class="person__sub">' + c.email + '</span></div></div></td>' +
        '<td class="cell-dim">' + c.pos + '</td>' +
        '<td>' + (c.nat === 'CITIZEN' ? 'Citizen' : 'Foreigner') + '</td>' +
        '<td class="cell-dim">' + F.fmtDate(c.join) + '</td>' +
        '<td>' + badge(c.status) + expiryNote + '</td>' +
        '<td class="cell-dim">' + c.maker + '</td>' +
        '<td class="ta-r">' + action + '</td>' +
      '</tr>';
    }).join('');
    body.querySelectorAll('[data-review]').forEach(function (b) { b.addEventListener('click', function () { openApprove(+b.dataset.review); }); });
    body.querySelectorAll('[data-mat]').forEach(function (b) { b.addEventListener('click', function () { openMat(+b.dataset.mat); }); });
    body.querySelectorAll('[data-ajukan]').forEach(function (b) { b.addEventListener('click', function () {
      var c = cands[+b.dataset.ajukan]; c.status = 'SUBMITTED'; renderTabs(); renderList();
      F.toast(c.name + ' submitted. Awaiting checker approval.', 'info');
    }); });
    body.querySelectorAll('[data-del]').forEach(function (b) { b.addEventListener('click', function () {
      var c = cands[+b.dataset.del]; cands.splice(cands.indexOf(c), 1); renderTabs(); renderList();
      F.toast(c.name + ' draft deleted.', 'warn');
    }); });
    body.querySelectorAll('[data-cancel]').forEach(function (b) { b.addEventListener('click', function () {
      var c = cands[+b.dataset.cancel]; c.status = 'CANCELLED'; delete c.expiry; renderTabs(); renderList();
      F.toast(c.name + ' cancelled before contract sign. Seat released.', 'warn');
    }); });
    body.querySelectorAll('[data-edit]').forEach(function (b) { b.addEventListener('click', function () {
      F.toast('Edit draft — opens NJ-CREATE prefilled (demo).', 'info');
    }); });
    pgNj.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function kvRow(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  // ---------- NJ-APPROVE ----------
  var apIdx = null;
  function openApprove(i) {
    apIdx = i; var c = cands[i];
    document.getElementById('njApproveKv').innerHTML =
      kvRow('Candidate', c.name) + kvRow('Position', c.pos) +
      kvRow('Nationality', c.nat === 'CITIZEN' ? 'Citizen (WNI)' : 'Foreigner (WNA)') +
      kvRow('Intended join', F.fmtDate(c.join)) + kvRow('Maker', c.maker) + kvRow('Status', badge(c.status));
    var rivals = cands.filter(function (x) { return x.pos === c.pos && x !== c && (x.status === 'SUBMITTED' || x.status === 'IN_APPROVAL'); });
    var note = document.getElementById('njSibNote');
    if (rivals.length) { note.classList.remove('is-hidden'); note.querySelector('span').innerHTML = '<strong>' + rivals.length + ' rival candidate' + (rivals.length > 1 ? 's' : '') + '</strong> on this position will be auto-rejected on approval.'; }
    else { note.classList.add('is-hidden'); }
    F.openModal('njApprove');
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('njApproveBtn').addEventListener('click', function () {
    var c = cands[apIdx];
    if (c.maker === ME) { F.toast('409 — you submitted this candidate and cannot approve it.', 'danger'); return; }
    c.status = 'APPROVED';
    var d = new Date(); d.setDate(d.getDate() + 14);
    c.expiry = d.toISOString().slice(0, 10);
    var rivals = cands.filter(function (x) { return x.pos === c.pos && x !== c && (x.status === 'SUBMITTED' || x.status === 'IN_APPROVAL'); });
    rivals.forEach(function (x) { x.status = 'REJECTED'; });
    F.closeModal('njApprove'); renderTabs(); renderList();
    F.toast(c.name + ' approved — seat reserved. ' + (rivals.length ? rivals.length + ' rival(s) auto-rejected.' : ''), 'ok');
  });
  document.getElementById('njRejectBtn').addEventListener('click', function () {
    var c = cands[apIdx];
    if (c.maker === ME) { F.toast('409 — you submitted this candidate and cannot decide on it.', 'danger'); return; }
    c.status = 'REJECTED';
    F.closeModal('njApprove'); renderTabs(); renderList();
    F.toast(c.name + ' rejected.', 'warn');
  });

  // ---------- NJ-MATERIALIZE ----------
  var matIdx = null, matFileOk = false, matGradePicked = false;
  function openMat(i) {
    matIdx = i; var c = cands[i]; matFileOk = false; matGradePicked = false;
    document.getElementById('njMatKv').innerHTML = kvRow('Candidate', c.name) + kvRow('Position', c.pos) + kvRow('Seat held until', F.fmtDate(c.expiry));
    var gv = document.getElementById('njMatGrade').querySelector('.ctl__value');
    gv.textContent = 'Select job grade'; gv.style.color = 'var(--fg-4)';
    F.setDate('njMatDate', c.join);
    document.getElementById('njMatFileName').textContent = 'No file selected';
    document.getElementById('njMatFile').value = '';
    syncMat();
    F.openModal('njMat');
  }
  document.getElementById('njMatFile').addEventListener('change', function () {
    var f = this.files && this.files[0];
    matFileOk = !!f;
    document.getElementById('njMatFileName').textContent = f ? f.name : 'No file selected';
    syncMat();
  });
  document.getElementById('njMatGrade').addEventListener('select', function () { matGradePicked = true; syncMat(); });
  document.getElementById('njMatDate').addEventListener('datechange', syncMat);
  function syncMat() { document.getElementById('njMatBtn').disabled = !(matFileOk && matGradePicked && document.getElementById('njMatDate').value); }
  document.getElementById('njMatBtn').addEventListener('click', function () {
    var c = cands[matIdx];
    var grade = document.getElementById('njMatGrade').querySelector('.ctl__value').textContent;
    c.status = 'MATERIALIZED'; c.grade = grade; c.join = document.getElementById('njMatDate').dataset.iso || document.getElementById('njMatDate').value; delete c.expiry;
    F.closeModal('njMat'); renderTabs(); renderList();
    F.toast(c.name + ' materialised on ' + grade + '. Account invitation sent; employee is now in WAITING.', 'ok');
  });

  // ---------- NJ-CREATE ----------
  document.getElementById('newCandBtn').addEventListener('click', function () {
    var today = new Date().toISOString().slice(0, 10);
    document.getElementById('njJoin').min = today;
    F.openModal('njCreate');
  });
  var nat = 'CITIZEN';
  document.querySelectorAll('#njForm .rb').forEach(function (rb) {
    rb.addEventListener('click', function () {
      document.querySelectorAll('#njForm .rb').forEach(function (x) { x.classList.remove('is-on'); });
      rb.classList.add('is-on');
      nat = rb.dataset.nat;
      document.getElementById('branchCitizen').classList.toggle('is-hidden', nat !== 'CITIZEN');
      document.getElementById('branchForeigner').classList.toggle('is-hidden', nat !== 'FOREIGNER');
      syncCreate();
    });
  });
  var ktp = document.getElementById('njKtp');
  ktp.addEventListener('input', function () {
    ktp.value = ktp.value.replace(/\D/g, '').slice(0, 16);
    document.getElementById('ktpCount').textContent = ktp.value.length;
    syncCreate();
  });
  var pass = document.getElementById('njPass');
  pass.addEventListener('input', function () { pass.value = pass.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15); syncCreate(); });
  var posPicked = false;
  document.getElementById('njPos').addEventListener('select', function () { posPicked = true; syncCreate(); });
  ['njName','njEmail','njJoin'].forEach(function (id) { document.getElementById(id).addEventListener('input', syncCreate); document.getElementById(id).addEventListener('change', syncCreate); });
  function syncCreate() {
    var name = document.getElementById('njName').value.trim();
    var email = document.getElementById('njEmail').value.trim();
    var join = document.getElementById('njJoin').value;
    var idOk = nat === 'CITIZEN' ? ktp.value.length === 16 : /^[A-Z0-9]{6,15}$/.test(pass.value);
    var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    document.getElementById('njSubmit').disabled = !(posPicked && name && idOk && emailOk && join);
    document.getElementById('njSubmitNow').disabled = document.getElementById('njSubmit').disabled;
  }
  function createCand(submitNow) {
    var name = document.getElementById('njName').value.trim();
    var pos = document.getElementById('njPos').querySelector('.ctl__value').textContent;
    var init = name.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    cands.unshift({ name: name, init: init, pos: pos, nat: nat, join: document.getElementById('njJoin').value, status: submitNow ? 'SUBMITTED' : 'DRAFT', maker: ME, email: document.getElementById('njEmail').value.trim() });
    F.closeModal('njCreate'); filter = 'ALL'; renderTabs(); renderList();
    F.toast(submitNow
      ? name + ' submitted for approval. A different HR Manager decides (SoD).'
      : name + ' saved as draft. Use Submit to send for approval.', submitNow ? 'info' : 'ok');
    document.getElementById('njForm').reset();
    document.getElementById('ktpCount').textContent = '0';
    posPicked = false;
    var pv = document.getElementById('njPos').querySelector('.ctl__value'); pv.textContent = 'Select open position'; pv.style.color = 'var(--fg-4)';
    document.getElementById('njSubmit').disabled = true;
    document.getElementById('njSubmitNow').disabled = true;
  }
  document.getElementById('njSubmit').addEventListener('click', function () { createCand(false); });
  document.getElementById('njSubmitNow').addEventListener('click', function () { createCand(true); });

  renderTabs(); renderList();
})();
