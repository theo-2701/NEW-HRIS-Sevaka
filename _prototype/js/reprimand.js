// reprimand.js — RP-STANDING + RP-CREATE (server snapshot) + RP-APPROVE (standing projection)
(function () {
  'use strict';
  var F = window.Flow;
  var ME = 'Tony Stark';

  var STATUS = {
    IN_APPROVAL: ['sb--blue','In approval', false],
    ACTIVE:      ['sb--green','Active', false],
    EXPIRED:     ['sb--grey','Expired', false],
    REVOKED:     ['sb--red','Revoked', true],
    CANCELLED:   ['sb--grey','Cancelled', true]
  };

  // frozen server snapshots per category
  var CAT = {
    VERBAL: { label: 'Verbal warning', point: 0, validity: 3, level: 0, terminal: false },
    SP1:    { label: 'SP1', point: 1, validity: 6, level: 1, terminal: false },
    SP2:    { label: 'SP2', point: 2, validity: 6, level: 2, terminal: false },
    SP3:    { label: 'SP3', point: 3, validity: 6, level: 3, terminal: true }
  };

  var reprimands = [
    { emp: 'Eka Saputra',   init: 'ES', unit: 'BR-Papua',    cat: 'SP1', issued: '2026-03-02', status: 'ACTIVE',      maker: 'Rina Hartono' },
    { emp: 'Eka Saputra',   init: 'ES', unit: 'BR-Papua',    cat: 'SP2', issued: '2026-05-18', status: 'ACTIVE',      maker: 'Rina Hartono' },
    { emp: 'Dimas Prabowo', init: 'DP', unit: 'HQ',          cat: 'SP3', issued: '2026-06-01', status: 'ACTIVE',      maker: 'Dewi Anggraini' },
    { emp: 'Nadia Rahman',  init: 'NR', unit: 'BR-Surabaya', cat: 'VERBAL', issued: '2026-06-20', status: 'ACTIVE',   maker: 'Bagus Pratama' },
    { emp: 'Fajar Nugroho', init: 'FN', unit: 'BR-Jakarta',  cat: 'SP1', issued: '2026-07-01', status: 'IN_APPROVAL', maker: 'Rina Hartono' },
    { emp: 'Nadia Rahman',  init: 'NR', unit: 'BR-Surabaya', cat: 'SP1', issued: '2025-11-10', status: 'REVOKED',     maker: 'Bagus Pratama' }
  ];

  function expiry(r) {
    var c = CAT[r.cat]; var d = new Date(r.issued + 'T00:00:00'); d.setMonth(d.getMonth() + c.validity);
    return d.toISOString().slice(0, 10);
  }
  function isActiveNow(r) { return r.status === 'ACTIVE'; }

  function standingOf(emp) {
    var pts = reprimands.filter(function (r) { return r.emp === emp && isActiveNow(r); }).reduce(function (s, r) { return s + CAT[r.cat].point; }, 0);
    var terminal = reprimands.some(function (r) { return r.emp === emp && isActiveNow(r) && CAT[r.cat].terminal; });
    return { pts: pts, terminal: terminal };
  }
  function standingBadge(st) {
    if (st.terminal || st.pts >= 3) return '<span class="standing-pill standing--final"><i data-lucide="octagon-alert" style="width:13px;height:13px"></i>Final warning</span>';
    if (st.pts === 2) return '<span class="standing-pill standing--sp2">Level SP2</span>';
    if (st.pts === 1) return '<span class="standing-pill standing--sp1">Level SP1</span>';
    return '<span class="standing-pill standing--clean">Clean</span>';
  }
  function statusBadge(k) { var s = STATUS[k]; return '<span class="sb ' + s[0] + (s[2] ? ' sb--strike' : '') + '"><span class="sb__dot"></span>' + s[1] + '</span>'; }

  var AVCOL = ['#026395','#0284c7','#0369a1','#075985'];
  function av(init, i) { return '<span class="avatar avatar--sm" style="background:' + AVCOL[i % AVCOL.length] + '">' + init + '</span>'; }

  function renderStanding() {
    var emps = {};
    reprimands.forEach(function (r) { if (!emps[r.emp]) emps[r.emp] = { emp: r.emp, init: r.init, unit: r.unit, latest: r.issued }; else if (r.issued > emps[r.emp].latest) emps[r.emp].latest = r.issued; });
    var list = Object.keys(emps).map(function (k) { return emps[k]; });
    document.getElementById('standingBody').innerHTML = list.map(function (e, i) {
      var st = standingOf(e.emp);
      return '<tr>' +
        '<td><div class="person">' + av(e.init, i) + '<div class="person__meta"><span class="person__name">' + e.emp + '</span></div></div></td>' +
        '<td class="cell-dim">' + e.unit + '</td>' +
        '<td class="ta-c cell-strong">' + st.pts + '</td>' +
        '<td>' + standingBadge(st) + '</td>' +
        '<td class="cell-dim">' + F.fmtDate(e.latest) + '</td>' +
      '</tr>';
    }).join('');
    document.getElementById('kpiFinal').textContent = list.filter(function (e) { var s = standingOf(e.emp); return s.terminal || s.pts >= 3; }).length;
    if (window.lucide) window.lucide.createIcons();
  }

  var pgRp = F.pager('pgRp', 10, function () { renderHistory(); }, 'reprimands');
  function renderHistory() {
    document.getElementById('rpBody').innerHTML = pgRp.slice(reprimands).map(function (r) {
      var i = reprimands.indexOf(r);
      var strike = STATUS[r.status][2];
      var action = r.status === 'IN_APPROVAL' ? '<button class="rowbtn" data-rev="' + i + '">Review</button>' : '<button class="rowbtn rowbtn--ghost" disabled>No action</button>';
      return '<tr' + (strike ? ' style="opacity:.7"' : '') + '>' +
        '<td><div class="person">' + av(r.init, i) + '<div class="person__meta"><span class="person__name"' + (strike ? ' style="text-decoration:line-through"' : '') + '>' + r.emp + '</span></div></div></td>' +
        '<td class="cell-strong">' + CAT[r.cat].label + '</td>' +
        '<td class="cell-dim">' + F.fmtDate(r.issued) + '</td>' +
        '<td class="cell-dim">' + (CAT[r.cat].point === 0 && r.cat === 'VERBAL' ? F.fmtDate(expiry(r)) : F.fmtDate(expiry(r))) + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '<td class="cell-dim">' + r.maker + '</td>' +
        '<td class="ta-r">' + action + '</td>' +
      '</tr>';
    }).join('');
    document.getElementById('rpCount').textContent = reprimands.length;
    document.getElementById('kpiActive').textContent = reprimands.filter(function (r) { return r.status === 'ACTIVE'; }).length;
    document.getElementById('kpiApproval').textContent = reprimands.filter(function (r) { return r.status === 'IN_APPROVAL'; }).length;
    document.querySelectorAll('#rpBody [data-rev]').forEach(function (b) { b.addEventListener('click', function () { openApprove(+b.dataset.rev); }); });
    if (window.lucide) window.lucide.createIcons();
    pgRp.paint();
  }

  function kvRow(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  // ---------- RP-APPROVE ----------
  var apIdx = null;
  function openApprove(i) {
    apIdx = i; var r = reprimands[i]; var c = CAT[r.cat];
    document.getElementById('rpApproveKv').innerHTML =
      kvRow('Employee', r.emp) + kvRow('Category', c.label) + kvRow('Issued', F.fmtDate(r.issued)) +
      kvRow('Snapshot', c.point + ' pt · ' + c.validity + ' mo · level ' + c.level + (c.terminal ? ' · terminal' : '')) +
      kvRow('Maker', r.maker) + kvRow('Status', statusBadge(r.status));
    var before = standingOf(r.emp);
    // projected: this reprimand becomes active
    var afterPts = before.pts + c.point;
    var afterTerminal = before.terminal || c.terminal;
    document.getElementById('projFrom').innerHTML = standingBadge(before);
    document.getElementById('projTo').innerHTML = standingBadge({ pts: afterPts, terminal: afterTerminal });
    F.openModal('rpApprove');
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('rpApproveBtn').addEventListener('click', function () {
    var r = reprimands[apIdx];
    if (r.maker === ME) { F.toast('409 — you are the maker and cannot approve this reprimand.', 'danger'); return; }
    r.status = 'ACTIVE';
    F.closeModal('rpApprove'); renderHistory(); renderStanding();
    F.toast('Reprimand approved and active. Standing emitted to performance-service.', 'ok');
  });
  document.getElementById('rpRevokeBtn').addEventListener('click', function () {
    var r = reprimands[apIdx];
    r.status = 'REVOKED';
    F.closeModal('rpApprove'); renderHistory(); renderStanding();
    F.toast('Reprimand revoked. It cannot be re-activated.', 'warn');
  });

  // ---------- RP-CREATE ----------
  document.getElementById('newRpBtn').addEventListener('click', function () { document.getElementById('rpDate').max = new Date().toISOString().slice(0, 10); F.openModal('rpCreate'); });
  var empPicked = false, catVal = null;
  document.getElementById('rpEmp').addEventListener('select', function () { empPicked = true; sync(); });
  document.getElementById('rpCat').addEventListener('select', function (e) {
    catVal = e.detail.value; var c = CAT[catVal];
    document.getElementById('rpSnap').style.display = 'block';
    document.getElementById('snapPoint').textContent = c.point + (c.point === 1 ? ' point' : ' points');
    document.getElementById('snapValidity').textContent = c.validity + ' months';
    document.getElementById('snapLevel').textContent = 'Level ' + c.level;
    document.getElementById('snapTerminal').innerHTML = c.terminal ? '<span style="color:var(--color-error-700)">Yes — terminal</span>' : 'No';
    updateSnapExpiry();
    if (window.lucide) window.lucide.createIcons();
    sync();
  });
  function updateSnapExpiry() {
    var d = document.getElementById('rpDate').value;
    if (catVal && d) {
      document.getElementById('snapExpiry').textContent = F.fmtDate(expiry({ cat: catVal, issued: d }));
    } else {
      document.getElementById('snapExpiry').innerHTML = '<span style="color:var(--fg-4);font-weight:500">Set issued date</span>';
    }
  }
  var reason = document.getElementById('rpReason');
  reason.addEventListener('input', function () { document.getElementById('rpReasonCount').textContent = reason.value.length; sync(); });
  document.getElementById('rpDate').addEventListener('change', function () { updateSnapExpiry(); sync(); });
  document.getElementById('rpFile').addEventListener('change', function () { var f = this.files && this.files[0]; document.getElementById('rpFileName').textContent = f ? f.name : 'No file selected'; });
  function sync() { document.getElementById('rpSubmit').disabled = !(empPicked && catVal && reason.value.trim() && document.getElementById('rpDate').value); }
  document.getElementById('rpSubmit').addEventListener('click', function () {
    var empText = document.getElementById('rpEmp').querySelector('.ctl__value').textContent;
    var emp = empText.split(' — ')[0], unit = (empText.split(', ')[1] || '');
    var init = emp.split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    reprimands.unshift({ emp: emp, init: init, unit: unit, cat: catVal, issued: document.getElementById('rpDate').value, status: 'IN_APPROVAL', maker: ME });
    F.closeModal('rpCreate'); renderHistory(); renderStanding();
    F.toast('Reprimand submitted. Snapshot frozen; awaiting checker approval.', 'info');
    document.getElementById('rpForm').reset();
    document.getElementById('rpReasonCount').textContent = '0';
    document.getElementById('rpSnap').style.display = 'none';
    document.getElementById('rpFileName').textContent = 'No file selected';
    empPicked = false; catVal = null;
    ['rpEmp','rpCat'].forEach(function (id) { var v = document.getElementById(id).querySelector('.ctl__value'); v.textContent = id === 'rpEmp' ? 'Select employee' : 'Select SP category'; v.style.color = 'var(--fg-4)'; document.getElementById(id).querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); }); });
    document.getElementById('rpSubmit').disabled = true;
  });

  renderStanding(); renderHistory();
})();
