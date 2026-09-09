/* Settings — Personal Data Erasure Requests (A5 insert · A6 list · A7 detail).
   A8 is machine-only and has no screen. FSD-001-SETTINGS-0.2 §10 / UIC §4. */
(function () {
  var S = window.SettingsData, F = window.Flow;
  var rows = S.ERASURE.slice();
  var flt = { status: '', from: null, to: null, subj: '' };
  var form = { subj: null, date: null, tz: 'Asia/Jakarta' };

  var SB = { REQUESTED: 'sb--blue', IN_PROGRESS: 'sb--amber', COMPLETED: 'sb--green', PENDING: 'sb--grey', HELD: 'sb--red' };
  function badge(s) { return '<span class="sb ' + (SB[s] || 'sb--grey') + '"><span class="sb__dot"></span>' + s + '</span>'; }
  function d(iso) { return iso ? F.fmtDate(iso.slice(0, 10)) : '—'; }
  function dt(iso) { return iso ? iso.replace('T', ' ').slice(0, 16) : '—'; }

  var subjOpts = S.SUBJECTS.map(function (s) { return '<div class="dropdown__opt" data-val="' + s.id + '">' + s.nama + ' · NIK ' + s.nik + ' · ' + s.status + '</div>'; }).join('');
  document.getElementById('nSubjDd').innerHTML = subjOpts;
  document.getElementById('fSubjDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">Anyone</div>' + subjOpts;
  document.getElementById('nTzDd').innerHTML = S.TZ.map(function (t, i) { return '<div class="dropdown__opt' + (i === 0 ? ' is-sel' : '') + '" data-val="' + t + '">' + t + '</div>'; }).join('');
  F.wireSelects(document);

  document.getElementById('fStatus').addEventListener('select', function (e) { flt.status = e.detail.value; });
  document.getElementById('fSubj').addEventListener('select', function (e) { flt.subj = e.detail.value; });
  document.getElementById('fRange').addEventListener('rangechange', function (e) { flt.from = e.detail.from; flt.to = e.detail.to; });
  document.getElementById('fApply').addEventListener('click', function () { pg.reset(); F.closeModal('erFilter'); F.paintFilterSums(); paint(); });
  document.getElementById('nSubj').addEventListener('select', function (e) { form.subj = e.detail.value; });
  document.getElementById('nTz').addEventListener('select', function (e) { form.tz = e.detail.value; });
  document.getElementById('nDate').addEventListener('datechange', function (e) { form.date = e.detail.iso; });

  var pg = F.pager('erPg', 20, function () { paint(); }, 'requests');

  function sum(r) {
    var done = r.progress.filter(function (p) { return p.progress_status === 'COMPLETED'; }).length;
    var held = r.progress.filter(function (p) { return p.progress_status === 'HELD'; }).length;
    return { total: r.progress.length, done: done, held: held };
  }

  function paint() {
    var list = rows.filter(function (r) {
      if (flt.status && r.request_status !== flt.status) return false;
      if (flt.subj && r.employee_id !== flt.subj) return false;
      var day = r.requested_at.slice(0, 10);
      if (flt.from && day < flt.from) return false;
      if (flt.to && day > flt.to) return false;
      return true;
    });
    var view = pg.slice(list);
    document.getElementById('erBody').innerHTML = view.length ? view.map(function (r) {
      var s = sum(r);
      return '<tr><td><button class="idlink" type="button" data-det="' + r.id + '">' + r.nama + '</button><span class="st-sub">NIK ' + r.nik + '</span></td>' +
        '<td>' + badge(r.request_status) + '</td>' +
        '<td><span class="st-offer">' + d(r.requested_at) + '</span></td>' +
        '<td><span class="st-offer">' + d(r.recorded_at) + '</span></td>' +
        '<td><span class="st-offer">' + (r.completed_at ? d(r.completed_at) : '—') + '</span></td>' +
        '<td><span class="st-sum"><span class="sb sb--green"><span class="sb__dot"></span>' + s.done + ' of ' + s.total + ' done</span>' +
        (s.held ? '<span class="sb sb--red"><span class="sb__dot"></span>' + s.held + ' held</span>' : '') + '</span></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="6"><span class="st-none">No request matches this filter — a valid 200 with an empty list.</span></td></tr>';
    pg.paint();
    if (window.lucide) lucide.createIcons();
  }

  document.getElementById('erBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-det]'); if (!b) return;
    detail(b.getAttribute('data-det'));
  });

  function detail(id) {
    var r = rows.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    document.getElementById('dTitle').textContent = 'Erasure request — ' + r.nama;
    document.getElementById('dKv').innerHTML =
      kv('Subject', r.nama + ' · NIK ' + r.nik) +
      kv('Status', badge(r.request_status)) +
      kv('Letter date', d(r.requested_at) + ' <span class="st-sub">' + r.requested_at_timezone + '</span>') +
      kv('Recorded by', r.recorded_by.nama + ' · NIK ' + r.recorded_by.nik + ' <span class="st-sub">' + d(r.recorded_at) + '</span>') +
      kv('Completed at', r.completed_at ? dt(r.completed_at) : '<span class="st-none">— stays empty while any tracker row is short of COMPLETED</span>');
    document.getElementById('dBody').innerHTML = r.progress.map(function (p) {
      var hot = p.progress_status !== 'COMPLETED' && p.broadcast_count >= 9;
      return '<tr><td><span class="st-svc">' + p.service_code + '</span></td><td>' + badge(p.progress_status) + '</td>' +
        '<td class="ta-r"><span class="st-count' + (hot ? ' st-count--hot' : '') + '">' + p.broadcast_count + '</span></td>' +
        '<td><span class="st-offer">' + dt(p.last_broadcast_at) + (p.last_broadcast_at ? ' <span class="st-sub">Asia/Jakarta</span>' : '') + '</span></td>' +
        '<td><span class="st-offer">' + dt(p.completed_at) + '</span></td></tr>';
    }).join('');
    F.openModal('detOvl');
    if (window.lucide) lucide.createIcons();
  }
  function kv(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  /* ---------- A5 ---------- */
  document.getElementById('newBtn').addEventListener('click', function () {
    form = { subj: null, date: null, tz: 'Asia/Jakarta' };
    document.querySelector('#nSubj .ctl__value').textContent = 'Pick an employee…';
    document.getElementById('nDate').value = '';
    document.getElementById('nErr').classList.add('is-hidden');
    F.openModal('newOvl');
  });

  document.getElementById('nSave').addEventListener('click', function () {
    var err = document.getElementById('nErr'), msg = document.getElementById('nErrMsg');
    err.classList.add('is-hidden');
    if (!form.subj || !form.date) {
      msg.innerHTML = '<strong>422 VALIDATION_ERROR</strong> — subject and letter date are both mandatory.';
      err.classList.remove('is-hidden'); return;
    }
    if (form.date > new Date().toISOString().slice(0, 10)) {
      msg.innerHTML = '<strong>422 VALIDATION_ERROR</strong> — the letter date may not be in the future.';
      err.classList.remove('is-hidden'); return;
    }
    var open = rows.filter(function (r) { return r.employee_id === form.subj && r.request_status !== 'COMPLETED'; })[0];
    if (open) {
      msg.innerHTML = '<strong>409 ERASURE_REQUEST_ALREADY_OPEN</strong> — ' + open.nama + ' already has a request that is not finished. Enforced by the database, and only partial: once the first one completes, the same subject may ask again.';
      err.classList.remove('is-hidden'); return;
    }
    var s = S.SUBJECTS.filter(function (x) { return x.id === form.subj; })[0];
    var services = ['time-service', 'finance-service', 'payroll-proxy', 'performance-service', 'productivity-service', 'document-service', 'employee-service', 'notification-service', 'settings-service'];
    var rec = { id: 'e5f6a7b8-' + String(rows.length + 1).padStart(4, '0'), employee_id: s.id, nama: s.nama, nik: s.nik,
      request_status: 'REQUESTED', requested_at: form.date + 'T00:00:00+07:00', requested_at_timezone: form.tz,
      recorded_at: new Date().toISOString().slice(0, 19) + '+07:00', recorded_by: { nama: 'Hesti Wulandari', nik: '20190310' },
      completed_at: null, completed_at_timezone: null,
      progress: services.map(function (c) { return { service_code: c, progress_status: 'PENDING', broadcast_count: 0, last_broadcast_at: null, completed_at: null }; }) };
    rows.unshift(rec);
    F.closeModal('newOvl');
    document.getElementById('okKv').innerHTML =
      kv('Subject', rec.nama + ' · NIK ' + rec.nik) + kv('Status', badge('REQUESTED')) +
      kv('Letter date', d(rec.requested_at) + ' <span class="st-sub">' + rec.requested_at_timezone + '</span>') +
      kv('Recorded', d(rec.recorded_at)) + kv('Completed at', '<span class="st-none">null</span>');
    document.getElementById('okBody').innerHTML = rec.progress.map(function (p) {
      return '<tr><td><span class="st-svc">' + p.service_code + '</span></td><td>' + badge('PENDING') + '</td><td class="ta-r"><span class="st-count">0</span></td><td><span class="st-none">—</span></td></tr>';
    }).join('');
    F.openModal('okOvl');
    pg.reset(); paint();
    if (window.lucide) lucide.createIcons();
  });

  paint();
})();
