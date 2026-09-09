// mass-resignation.js — MR-DASH(9 states) + MR-CREATE(dry-run) + MR-APPROVE + MR-PROCESS + MR-HALT + MR-RESUME
(function () {
  'use strict';
  var F = window.Flow;
  var ME = 'Tony Stark';
  var THRESHOLD = 15;

  var BADGE = {
    DRAFT:       ['sb--grey',  'Draft'],
    IN_APPROVAL: ['sb--blue',  'In approval'],
    APPROVED:    ['sb--blue',  'Approved'],
    PROCESSING:  ['sb--amber is-pulse', 'Processing'],
    HALTED:      ['sb--orange','Halted'],
    PROCESSED:   ['sb--green', 'Processed'],
    PARTIAL:     ['sb--amber', 'Partial'],
    FAILED:      ['sb--red',   'Failed'],
    CANCELLED:   ['sb--grey',  'Cancelled']
  };

  function hash() {
    var s = 'sha256:'; var h = 'abcdef0123456789';
    for (var i = 0; i < 24; i++) s += h[Math.floor(Math.random() * 16)];
    return s;
  }

  var batches = [
    { id: 'MR-0042', reason: 'Layoff', leave: '2026-08-15', total: 12, done: 12, status: 'PROCESSING', maker: 'Rina Hartono', hash: hash(), corr: 'corr-9f2a11', progress: 8 },
    { id: 'MR-0041', reason: 'Layoff', leave: '2026-08-01', total: 9,  done: 0,  status: 'HALTED', maker: 'Dewi Anggraini', hash: hash(), corr: 'corr-7b3c02', progress: 4 },
    { id: 'MR-0040', reason: 'Contract end', leave: '2026-07-31', total: 6, done: 0, status: 'APPROVED', maker: 'Rina Hartono', hash: hash(), corr: null, progress: 0 },
    { id: 'MR-0039', reason: 'Retirement', leave: '2026-07-20', total: 4, done: 0, status: 'IN_APPROVAL', maker: 'Bagus Pratama', hash: null, corr: null, progress: 0 },
    { id: 'MR-0038', reason: 'Layoff', leave: '2026-06-30', total: 10, done: 10, status: 'PROCESSED', maker: 'Rina Hartono', hash: hash(), corr: 'corr-4a1d88', progress: 10 },
    { id: 'MR-0037', reason: 'Termination (with cause)', leave: '2026-06-10', total: 5, done: 3, status: 'PARTIAL', maker: 'Dewi Anggraini', hash: hash(), corr: 'corr-2e9f45', progress: 3 }
  ];

  var TERMINAL = { PROCESSED: 1, PARTIAL: 1, FAILED: 1, CANCELLED: 1 };

  function badge(k) { var b = BADGE[k]; return '<span class="sb ' + b[0] + '"><span class="sb__dot"></span>' + b[1] + '</span>'; }

  function actionFor(b, i) {
    switch (b.status) {
      case 'DRAFT':       return '<button class="rowbtn" data-submit="' + i + '">Submit</button>';
      case 'IN_APPROVAL': return '<button class="rowbtn" data-approve="' + i + '">Review</button>';
      case 'APPROVED':    return '<button class="rowbtn" data-process="' + i + '">Process</button>';
      case 'PROCESSING':  return '<button class="rowbtn" data-halt="' + i + '">Halt</button>';
      case 'HALTED':      return '<button class="rowbtn" data-resume="' + i + '">Resume</button>';
      default:            return '<button class="rowbtn rowbtn--ghost" disabled>No action</button>';
    }
  }

  var pgMr = F.pager('pgMr', 10, function () { render(); }, 'batches');
  function render() {
    document.getElementById('batchBody').innerHTML = pgMr.slice(batches).map(function (b) {
      var i = batches.indexOf(b);
      var p = b.total ? Math.round(b.progress / b.total * 100) : 0;
      var progCell = (b.status === 'IN_APPROVAL' || b.status === 'DRAFT' || b.status === 'APPROVED')
        ? '<span class="cell-dim">—</span>'
        : '<div style="display:flex;align-items:center;gap:8px"><div class="impact__bar" style="width:80px"><span style="width:' + p + '%"></span></div><span class="cell-dim">' + b.progress + '/' + b.total + '</span></div>';
      return '<tr>' +
        '<td class="cell-strong">' + b.id + '</td>' +
        '<td>' + b.reason + '</td>' +
        '<td class="cell-dim">' + F.fmtDate(b.leave) + '</td>' +
        '<td class="ta-c cell-strong">' + b.total + '</td>' +
        '<td>' + progCell + '</td>' +
        '<td>' + badge(b.status) + '</td>' +
        '<td class="cell-dim">' + b.maker + '</td>' +
        '<td class="ta-r">' + actionFor(b, i) + '</td>' +
      '</tr>';
    }).join('');
    document.getElementById('batchCount').textContent = batches.length;
    pgMr.paint();
    document.getElementById('kpiActive').textContent = batches.filter(function (b) { return !TERMINAL[b.status]; }).length;
    document.getElementById('kpiProc').textContent = batches.filter(function (b) { return b.status === 'PROCESSING'; }).length;
    document.getElementById('kpiHalt').textContent = batches.filter(function (b) { return b.status === 'HALTED'; }).length;
    bind();
    if (window.lucide) window.lucide.createIcons();
  }

  function bind() {
    var body = document.getElementById('batchBody');
    body.querySelectorAll('[data-submit]').forEach(function (el) { el.onclick = function () { var b = batches[+el.dataset.submit]; b.status = 'IN_APPROVAL'; render(); F.toast(b.id + ' submitted for approval.', 'info'); }; });
    body.querySelectorAll('[data-approve]').forEach(function (el) { el.onclick = function () { openApprove(+el.dataset.approve); }; });
    body.querySelectorAll('[data-process]').forEach(function (el) { el.onclick = function () { openProcess(+el.dataset.process); }; });
    body.querySelectorAll('[data-halt]').forEach(function (el) { el.onclick = function () { openHalt(+el.dataset.halt); }; });
    body.querySelectorAll('[data-resume]').forEach(function (el) { el.onclick = function () { openResume(+el.dataset.resume); }; });
  }

  function kvRow(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  // ---------- MR-APPROVE ----------
  var apIdx = null;
  function openApprove(i) {
    apIdx = i; var b = batches[i];
    document.getElementById('mrApproveKv').innerHTML =
      kvRow('Batch', b.id) + kvRow('Reason', b.reason) + kvRow('Leave date', F.fmtDate(b.leave)) +
      kvRow('Selected', b.total + ' employees') + kvRow('Maker', b.maker) + kvRow('Status', badge(b.status));
    document.getElementById('mrApproveNote').value = '';
    document.getElementById('mrApproveBtn').disabled = true;
    F.openModal('mrApprove');
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('mrApproveNote').addEventListener('input', function () { document.getElementById('mrApproveBtn').disabled = this.value.trim().length === 0; });
  document.getElementById('mrApproveBtn').onclick = function () {
    var b = batches[apIdx];
    if (b.maker === ME) { F.toast('409 — maker cannot approve their own batch (SoD).', 'danger'); return; }
    if (!document.getElementById('mrApproveNote').value.trim()) { F.toast('Approver note is required.', 'warn'); return; }
    b.status = 'APPROVED'; b.hash = hash();
    F.closeModal('mrApprove'); render();
    F.toast(b.id + ' approved. Selection frozen as hash.', 'ok');
  };
  document.getElementById('mrRejectBtn').onclick = function () {
    var b = batches[apIdx]; b.status = 'CANCELLED';
    F.closeModal('mrApprove'); render(); F.toast(b.id + ' rejected and cancelled.', 'warn');
  };

  // ---------- MR-PROCESS ----------
  var prIdx = null;
  function openProcess(i) {
    prIdx = i; var b = batches[i];
    document.getElementById('mrProcessKv').innerHTML = kvRow('Batch', b.id) + kvRow('Reason', b.reason) + kvRow('Selected', b.total + ' employees');
    document.getElementById('mrHashVal').textContent = b.hash;
    F.openModal('mrProcess');
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('mrProcessBtn').onclick = function () {
    var b = batches[prIdx];
    b.status = 'PROCESSING'; b.corr = 'corr-' + Math.random().toString(16).slice(2, 8); b.progress = 0;
    F.closeModal('mrProcess'); render();
    F.toast(b.id + ' processing — throttled offboarding spawned (' + b.corr + ').', 'info');
    // simulate throttled progress
    var t = setInterval(function () {
      if (b.status !== 'PROCESSING') { clearInterval(t); return; }
      b.progress++;
      if (b.progress >= b.total) { b.progress = b.total; b.done = b.total; b.status = 'PROCESSED'; clearInterval(t); F.toast(b.id + ' processed — all ' + b.total + ' offboardings complete.', 'ok'); }
      render();
    }, 1400);
  };

  // ---------- MR-HALT ----------
  var haltIdx = null;
  function openHalt(i) { haltIdx = i; document.getElementById('haltReason').value = ''; document.getElementById('haltBtn').disabled = true; F.openModal('mrHalt'); }
  document.getElementById('haltReason').addEventListener('input', function () { document.getElementById('haltBtn').disabled = this.value.trim().length === 0; });
  document.getElementById('haltBtn').onclick = function () {
    var b = batches[haltIdx];
    if (b.maker === ME) { F.toast('409 — maker cannot halt their own batch (SoD).', 'danger'); return; }
    b.status = 'HALTED';
    F.closeModal('mrHalt'); render();
    F.toast(b.id + ' halted at ' + b.progress + '/' + b.total + '. Running instances suspended by ' + b.corr + '.', 'warn');
  };

  // ---------- MR-RESUME ----------
  var reIdx = null, resumeAction = 'RESUME';
  function openResume(i) {
    reIdx = i; var b = batches[i]; resumeAction = 'RESUME';
    document.getElementById('mrResumeKv').innerHTML = kvRow('Batch', b.id) + kvRow('Processed so far', b.progress + ' / ' + b.total) + kvRow('Remaining', (b.total - b.progress) + ' employees');
    document.querySelectorAll('#resumeSeg .rb').forEach(function (o) { o.classList.toggle('is-on', o.dataset.val === 'RESUME'); });
    document.getElementById('resumeNote').value = '';
    setResumeBtn();
    F.openModal('mrResume');
    if (window.lucide) window.lucide.createIcons();
  }
  document.querySelectorAll('#resumeSeg .rb').forEach(function (rb) {
    rb.addEventListener('click', function () {
      document.querySelectorAll('#resumeSeg .rb').forEach(function (x) { x.classList.remove('is-on'); });
      rb.classList.add('is-on');
      resumeAction = rb.dataset.val;
      setResumeBtn();
    });
  });
  document.getElementById('resumeNote').addEventListener('input', setResumeBtn);
  function setResumeBtn() {
    var btn = document.getElementById('resumeBtn');
    var hasNote = document.getElementById('resumeNote').value.trim().length > 0;
    if (resumeAction === 'RESUME') { btn.className = 'btn btn--primary'; btn.innerHTML = '<i data-lucide="play"></i>Resume batch'; }
    else { btn.className = 'btn btn--danger'; btn.innerHTML = '<i data-lucide="square"></i>Cancel remaining'; }
    btn.disabled = !hasNote;
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('resumeBtn').onclick = function () {
    var b = batches[reIdx];
    if (b.maker === ME) { F.toast('409 — maker cannot check their own batch (SoD).', 'danger'); return; }
    if (!document.getElementById('resumeNote').value.trim()) { F.toast('Approver note is required.', 'warn'); return; }
    if (resumeAction === 'RESUME') {
      b.status = 'PROCESSING';
      F.closeModal('mrResume'); render();
      F.toast(b.id + ' resumed processing.', 'info');
      var t = setInterval(function () {
        if (b.status !== 'PROCESSING') { clearInterval(t); return; }
        b.progress++;
        if (b.progress >= b.total) { b.progress = b.total; b.done = b.total; b.status = 'PROCESSED'; clearInterval(t); F.toast(b.id + ' processed.', 'ok'); }
        render();
      }, 1400);
    } else {
      b.status = 'PARTIAL'; b.done = b.progress;
      F.closeModal('mrResume'); render();
      F.toast(b.id + ' finished as partial — ' + b.progress + '/' + b.total + ' processed, remainder cancelled.', 'warn');
    }
  };

  // ---------- MR-CREATE + dry-run ----------
  var POOL = [
    { name: 'Agus Salim', unit: 'BR-Jakarta', pos: 'Ops Staff' },
    { name: 'Bunga Citra', unit: 'BR-Jakarta', pos: 'Ops Staff' },
    { name: 'Candra Wijaya', unit: 'BR-Surabaya', pos: 'Sales Rep' },
    { name: 'Tony Stark', unit: 'HQ', pos: 'Administrator', self: true },
    { name: 'Dewi Lestari', unit: 'BR-Bandung', pos: 'CS Agent' },
    { name: 'Eko Prasetyo', unit: 'BR-Bandung', pos: 'CS Agent' },
    { name: 'Fitri Handayani', unit: 'HQ', pos: 'Analyst' },
    { name: 'Gilang Ramadhan', unit: 'BR-Surabaya', pos: 'Sales Rep' },
    { name: 'Hana Pertiwi', unit: 'BR-Jakarta', pos: 'Warehouse' },
    { name: 'Indra Kusuma', unit: 'BR-Jakarta', pos: 'Warehouse' }
  ];
  var selected = {}, dryDone = false;
  document.getElementById('newBatchBtn').onclick = function () {
    selected = {}; dryDone = false;
    document.getElementById('selBody').innerHTML = POOL.map(function (e, i) {
      return '<tr class="' + (e.self ? 'is-self' : '') + '"><td><label class="check-sm"><input type="checkbox" data-sel="' + i + '"' + (e.self ? ' disabled' : '') + '><span class="check-sm__box"></span></label></td>' +
        '<td>' + e.name + (e.self ? ' <span class="sel-lock"><i data-lucide="lock"></i>you</span>' : '') + '</td><td>' + e.unit + '</td><td>' + e.pos + '</td></tr>';
    }).join('');
    document.querySelectorAll('#selBody [data-sel]').forEach(function (cb) {
      cb.addEventListener('change', function () { if (cb.checked) selected[cb.dataset.sel] = 1; else delete selected[cb.dataset.sel]; updateSel(); });
    });
    document.getElementById('mrNotes').value = '';
    document.getElementById('mrDate').value = '';
    resetDry();
    updateSel();
    F.openModal('mrCreate');
    if (window.lucide) window.lucide.createIcons();
  };
  var reasonPicked = false;
  document.getElementById('mrReason').addEventListener('select', function () { reasonPicked = true; syncSave(); });
  document.getElementById('mrDate').addEventListener('change', syncSave);
  function updateSel() { document.getElementById('selCount').textContent = Object.keys(selected).length; dryDone = false; resetDry(); syncSave(); }
  function resetDry() {
    document.getElementById('dryCount').textContent = '0';
    document.getElementById('dryBar').classList.remove('is-over');
    document.getElementById('dryPanel').classList.remove('is-over');
    document.getElementById('dryBar').querySelector('span').style.width = '0%';
    document.getElementById('dryNote').className = 'note note--info';
    document.getElementById('dryNote').querySelector('span').textContent = 'Run the dry-run to compute how many employees this batch would offboard.';
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('dryBtn').onclick = function () {
    var n = Object.keys(selected).length;
    if (n < 1) { F.toast('Select at least one employee first.', 'warn'); return; }
    dryDone = true;
    var over = n > THRESHOLD;
    document.getElementById('dryCount').textContent = n;
    var pct = Math.min(100, Math.round(n / THRESHOLD * 100));
    var bar = document.getElementById('dryBar');
    bar.querySelector('span').style.width = pct + '%';
    bar.classList.toggle('is-over', over);
    document.getElementById('dryPanel').classList.toggle('is-over', over);
    var note = document.getElementById('dryNote');
    note.className = 'note ' + (over ? 'note--danger' : 'note--info');
    note.querySelector('span').innerHTML = over
      ? '<strong>Exceeds threshold (' + THRESHOLD + ').</strong> This batch needs elevated sign-off before it can process.'
      : 'Within the safe threshold of ' + THRESHOLD + '. Ready to save as draft.';
    note.querySelector('svg') && note.querySelector('svg').remove();
    note.insertAdjacentHTML('afterbegin', over ? '<i data-lucide="triangle-alert"></i>' : '<i data-lucide="check-circle-2"></i>');
    syncSave();
    if (window.lucide) window.lucide.createIcons();
  };
  function syncSave() {
    document.getElementById('mrSaveBtn').disabled = !(reasonPicked && document.getElementById('mrDate').value && Object.keys(selected).length >= 1 && dryDone);
  }
  document.getElementById('mrSaveBtn').onclick = function () {
    var n = Object.keys(selected).length;
    var reason = document.getElementById('mrReason').querySelector('.ctl__value').textContent;
    var id = 'MR-00' + (43 + Math.floor(Math.random() * 40));
    batches.unshift({ id: id, reason: reason, leave: document.getElementById('mrDate').value, total: n, done: 0, status: 'DRAFT', maker: ME, hash: null, corr: null, progress: 0 });
    F.closeModal('mrCreate'); render();
    F.toast(id + ' saved as draft with ' + n + ' employees.', 'ok');
    reasonPicked = false;
    var v = document.getElementById('mrReason').querySelector('.ctl__value'); v.textContent = 'Select reason'; v.style.color = 'var(--fg-4)';
  };

  render();
})();
