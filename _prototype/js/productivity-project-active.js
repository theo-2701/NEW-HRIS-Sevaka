// productivity-project-active.js — Project — Active (FT1.01–FT1.08)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var ME = 'DEDI';
  var filters = { name: '', owner: '', from: '', to: '', sort: 'created_at' };
  var pg = F.pager('pgPrj', 10, redraw, 'projects');

  function openTasks(code) {
    return D.TASKS.filter(function (t) {
      return t.project === code && ['BELUM_DIKERJAKAN', 'SEDANG_DIKERJAKAN', 'TERTAHAN'].indexOf(t.status) >= 0;
    });
  }
  function members(code) { return (D.MEMBERS[code] || []).filter(function (m) { return m.is_active; }); }

  function rows() {
    var out = D.PROJECTS.filter(function (p) { return p.state === 'AKTIF'; });
    if (filters.name) out = out.filter(function (p) { return p.project_name.toLowerCase().indexOf(filters.name.toLowerCase()) > -1; });
    if (filters.owner) out = out.filter(function (p) { return p.owner === filters.owner; });
    if (filters.from) out = out.filter(function (p) { return p.created_at >= filters.from && p.created_at <= filters.to; });
    return out.sort(function (a, b) {
      if (filters.sort === 'project_name') return a.project_name < b.project_name ? -1 : 1;
      if (filters.sort === 'state') return a.state < b.state ? -1 : 1;
      return a.created_at < b.created_at ? -1 : 1;
    });
  }

  function redraw() {
    var all = rows(), view = pg.slice(all);
    document.getElementById('prjBody').innerHTML = view.length ? view.map(function (p) {
      var open = openTasks(p.code).length;
      return '<tr>' +
        '<td class="cell-strong"><span class="pv-link" data-detail="' + p.code + '">' + p.project_name + '</span></td>' +
        '<td>' + D.empName(p.owner) + '</td>' +
        '<td>' + D.badge('green', 'AKTIF') + '</td>' +
        '<td>' + D.stampDate(p.created_at) + '</td>' +
        '<td class="ta-r">' + F.rowMenu([
          { label: 'View Detail', icon: 'eye', attr: 'data-detail="' + p.code + '"' },
          { label: 'Delete', icon: 'trash-2', attr: 'data-del="' + p.code + '"', danger: true }
        ]) + '</td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="muted-empty">No active project matches this filter.</div></td></tr>';
    pg.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  document.getElementById('prjBody').addEventListener('click', function (e) {
    var d = e.target.closest('[data-detail]'), x = e.target.closest('[data-del]');
    if (d) openDetail(d.getAttribute('data-detail'));
    if (x) {
      var code = x.getAttribute('data-del'), p = D.byCode(D.PROJECTS, code);
      p.state = '__DELETED__';
      F.toast(code + ' soft-deleted. No business gate applies to delete — only archive is gated.', 'warn');
      redraw();
    }
  });

  // ---------- filter ----------
  document.getElementById('fOwnerDD').innerHTML = D.opt('', 'All owners') +
    Object.keys(D.EMP).map(function (k) { return D.opt(k, D.EMP[k].name); }).join('');
  document.getElementById('fName').addEventListener('input', function () { filters.name = this.value; pg.reset(); redraw(); });
  document.getElementById('fOwner').addEventListener('select', function (e) { filters.owner = e.detail.value; pg.reset(); redraw(); });
  document.getElementById('fSort').addEventListener('select', function (e) { filters.sort = e.detail.value; redraw(); });
  document.getElementById('fFrom').addEventListener('datechange', function (e) { filters.from = e.detail.iso; pg.reset(); redraw(); });
  document.getElementById('fTo').addEventListener('datechange', function (e) { filters.to = e.detail.iso; pg.reset(); redraw(); });
  document.getElementById('fReset').addEventListener('click', function () {
    filters = { name: '', owner: '', from: '', to: '', sort: 'created_at' };
    document.getElementById('fName').value = '';
    F.setDate('fFrom', ''); F.setDate('fTo', '');
    ['fOwner', 'fSort'].forEach(function (id) {
      var c = document.getElementById(id), first = c.querySelector('.dropdown__opt');
      c.querySelector('.ctl__value').textContent = first.textContent;
    });
    pg.reset(); redraw(); F.toast('Filter reset.', 'info');
  });

  // ---------- create ----------
  var cName = document.getElementById('cName'), cSave = document.getElementById('cSave');
  document.getElementById('cOwner').textContent = D.empName(ME);
  document.getElementById('prjNewBtn').addEventListener('click', function () { cName.value = ''; cSave.disabled = true; document.getElementById('cNameCount').textContent = '0'; F.openModal('prjCreate'); });
  cName.addEventListener('input', function () {
    document.getElementById('cNameCount').textContent = cName.value.length;
    cSave.disabled = !cName.value.trim();
  });
  cSave.addEventListener('click', function () {
    var n = D.PROJECTS.length + 1;
    var code = 'PRJ-' + ('000' + n).slice(-4);
    D.PROJECTS.push({ code: code, id: 'c1000000-000' + n, project_name: cName.value.trim(), state: 'AKTIF', owner: ME, created_at: '2026-08-13', archived_at: null });
    D.MEMBERS[code] = [{ emp: ME, owner: true, is_active: true }];
    F.closeModal('prjCreate'); pg.reset(); redraw();
    F.toast('201 Created — ' + code + ' saved as AKTIF, owner ' + D.empName(ME) + '.', 'ok');
  });

  // ---------- detail / edit ----------
  var cur = null;
  function renderMembers() {
    var list = members(cur.code);
    document.getElementById('dMemCount').textContent = list.length;
    document.getElementById('dMemBody').innerHTML = list.map(function (m) {
      return '<tr><td class="cell-strong">' + D.empName(m.emp) + '</td>' +
        '<td>' + (m.owner ? '<span class="pv-tag">OWNER</span>' : 'Reviewer') + '</td>' +
        '<td class="ta-r">' + (m.owner ? '<span class="cell-dim">—</span>' :
          '<div class="rowacts"><button class="rowbtn rowbtn--danger" type="button" data-rm="' + m.emp + '">Remove</button></div>') + '</td></tr>';
    }).join('');
    var taken = list.map(function (m) { return m.emp; });
    document.getElementById('dAddDD').innerHTML = Object.keys(D.EMP).filter(function (k) { return taken.indexOf(k) < 0; })
      .map(function (k) { return D.opt(k, D.EMP[k].name + ' — ' + D.EMP[k].position); }).join('') || '<div class="dropdown__opt">Everyone is already a member</div>';
    var sel = document.getElementById('dAddSel');
    sel.querySelector('.ctl__value').textContent = 'Select employee';
    sel.querySelector('.ctl__value').style.color = 'var(--fg-4)';
    sel.dataset.pick = '';
    F.wireSelects(document.getElementById('prjDetail'));
    if (window.lucide) window.lucide.createIcons();
  }

  function openDetail(code) {
    cur = D.byCode(D.PROJECTS, code);
    document.getElementById('dTitle').textContent = cur.project_name;
    document.getElementById('dName').value = cur.project_name;
    document.getElementById('dCode').textContent = cur.id;
    document.getElementById('dOwner').textContent = D.empName(cur.owner);
    document.getElementById('dCreated').textContent = D.stampDate(cur.created_at);
    var open = openTasks(cur.code);
    document.getElementById('dOpen').textContent = open.length ? open.length + ' (' + open.map(function (t) { return t.code; }).join(', ') + ')' : '0';
    document.getElementById('dGate').style.display = 'none';
    renderMembers();
    F.openModal('prjDetail');
  }

  document.getElementById('dAddOpen').addEventListener('click', function () {
    var sel = document.getElementById('dAddSel');
    delete sel.dataset.pick;
    sel.querySelector('.ctl__value').textContent = 'Select employee';
    sel.querySelector('.ctl__value').style.color = 'var(--fg-4)';
    F.wireSelects(document.getElementById('prjAddMem'));
    F.openModal('prjAddMem');
  });
  document.getElementById('dAddSel').addEventListener('select', function (e) { this.dataset.pick = e.detail.value; });

  document.getElementById('dAddBtn').addEventListener('click', function () {
    var sel = document.getElementById('dAddSel'), emp = sel.dataset.pick;
    if (!emp) { F.toast('Pick an employee first.', 'warn'); return; }
    F.closeModal('prjAddMem');
    var list = D.MEMBERS[cur.code] || (D.MEMBERS[cur.code] = []);
    var found = null;
    list.forEach(function (m) { if (m.emp === emp) found = m; });
    if (found && found.is_active) F.toast('200 OK — ' + D.empName(emp) + ' is already an active member (idempotent no-op, not a 409).', 'info');
    else if (found) { found.is_active = true; F.toast('200 OK — membership row restored (is_active back to true).', 'ok'); }
    else { list.push({ emp: emp, owner: false, is_active: true }); F.toast('201 Created — ' + D.empName(emp) + ' added as reviewer.', 'ok'); }
    renderMembers(); redraw();
  });

  document.getElementById('dMemBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rm]');
    if (!b) return;
    var emp = b.getAttribute('data-rm');
    (D.MEMBERS[cur.code] || []).forEach(function (m) { if (m.emp === emp) m.is_active = false; });
    F.toast(D.empName(emp) + ' removed — the row stays, is_active is now false.', 'warn');
    renderMembers(); redraw();
  });

  document.getElementById('dSave').addEventListener('click', function () {
    var name = document.getElementById('dName').value.trim();
    if (!name) { F.toast('Project name cannot be blank.', 'warn'); return; }
    cur.project_name = name;
    F.closeModal('prjDetail'); redraw();
    F.toast('200 OK — ' + cur.code + ' updated.', 'ok');
  });

  document.getElementById('dArchive').addEventListener('click', function () {
    var open = openTasks(cur.code);
    if (open.length) {
      document.getElementById('dGateMsg').innerHTML = 'Masih ada task berstatus BELUM_DIKERJAKAN / SEDANG_DIKERJAKAN / TERTAHAN di dalam proyek ini: ' +
        open.map(function (t) { return '<strong>' + t.code + '</strong> (' + t.status + ')'; }).join(', ') +
        '. Close or cancel those tasks yourself first — the system never changes a task status on your behalf.';
      document.getElementById('dGate').style.display = '';
      return;
    }
    var name = document.getElementById('dName').value.trim();
    if (name) cur.project_name = name;
    cur.state = 'ARSIP';
    cur.archived_at = '2026-08-13T09:30:00+07:00';
    F.closeModal('prjDetail'); pg.reset(); redraw();
    document.dispatchEvent(new CustomEvent('prjdatachange'));
    F.toast('200 OK — ' + cur.code + ' archived. It now lives on the Archive tab.', 'ok');
  });

  document.addEventListener('prjdatachange', function () { pg.reset(); redraw(); });

  redraw();
  if (window.lucide) window.lucide.createIcons();
})();
