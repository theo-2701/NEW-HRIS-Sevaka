// productivity-project-archive.js — Project — Archive (restore, FT1.02/FT1.03/FT1.04)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var filters = { name: '', owner: '', from: '', to: '', sort: 'created_at' };
  var pg = F.pager('pgAr', 10, redraw, 'projects');

  function rows() {
    var out = D.PROJECTS.filter(function (p) { return p.state === 'ARSIP'; });
    if (filters.name) out = out.filter(function (p) { return p.project_name.toLowerCase().indexOf(filters.name.toLowerCase()) > -1; });
    if (filters.owner) out = out.filter(function (p) { return p.owner === filters.owner; });
    if (filters.from) out = out.filter(function (p) { return (p.archived_at || '').slice(0, 10) >= filters.from; });
    if (filters.to) out = out.filter(function (p) { return (p.archived_at || '').slice(0, 10) <= filters.to; });
    return out.sort(function (a, b) {
      if (filters.sort === 'project_name') return a.project_name < b.project_name ? -1 : 1;
      if (filters.sort === 'archived_at') return a.archived_at < b.archived_at ? 1 : -1;
      return a.created_at < b.created_at ? -1 : 1;
    });
  }

  function redraw() {
    var all = rows(), view = pg.slice(all);
    document.getElementById('arBody').innerHTML = view.length ? view.map(function (p) {
      return '<tr>' +
        '<td class="cell-strong"><span class="pv-link" data-detail="' + p.code + '">' + p.project_name + '</span></td>' +
        '<td>' + D.empName(p.owner) + '</td>' +
        '<td>' + D.badge('grey', 'ARSIP') + '</td>' +
        '<td>' + D.stampTime(p.archived_at) + ' <span class="pv-tag">WIB</span></td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" type="button" data-detail="' + p.code + '">View Detail</button></div></td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="5"><div class="muted-empty">No archived project — every restored row leaves this grid.</div></td></tr>';
    pg.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  var cur = null;
  document.getElementById('arBody').addEventListener('click', function (e) {
    var d = e.target.closest('[data-detail]');
    if (!d) return;
    cur = D.byCode(D.PROJECTS, d.getAttribute('data-detail'));
    document.getElementById('arTitle').textContent = cur.project_name;
    document.getElementById('arName').textContent = cur.project_name;
    document.getElementById('arCode').textContent = cur.id;
    document.getElementById('arOwner').textContent = D.empName(cur.owner);
    document.getElementById('arAt').textContent = D.stampTime(cur.archived_at);
    var inside = D.TASKS.filter(function (t) { return t.project === cur.code; });
    document.getElementById('arTasks').textContent = inside.length ? inside.map(function (t) { return t.code + ' (' + t.status + ')'; }).join(', ') : 'None';
    F.openModal('arDetail');
  });

  document.getElementById('arRestore').addEventListener('click', function () {
    cur.state = 'AKTIF';
    cur.archived_at = null;
    F.closeModal('arDetail'); pg.reset(); redraw();
    document.dispatchEvent(new CustomEvent('prjdatachange'));
    F.toast('200 OK — ' + cur.code + ' restored to AKTIF. archived_at cleared; tasks inside kept their status.', 'ok');
  });

  document.getElementById('arDemoBtn').addEventListener('click', function () { F.openModal('arDemo'); });

  document.getElementById('afOwnerDD').innerHTML = D.opt('', 'All owners') +
    Object.keys(D.EMP).map(function (k) { return D.opt(k, D.EMP[k].name); }).join('');
  document.getElementById('afName').addEventListener('input', function () { filters.name = this.value; pg.reset(); redraw(); });
  document.getElementById('afOwner').addEventListener('select', function (e) { filters.owner = e.detail.value; pg.reset(); redraw(); });
  document.getElementById('afSort').addEventListener('select', function (e) { filters.sort = e.detail.value; redraw(); });
  document.getElementById('afFrom').addEventListener('datechange', function (e) { filters.from = e.detail.iso; pg.reset(); redraw(); });
  document.getElementById('afTo').addEventListener('datechange', function (e) { filters.to = e.detail.iso; pg.reset(); redraw(); });

  document.getElementById('afReset').addEventListener('click', function () {
    filters = { name: '', owner: '', from: '', to: '', sort: 'created_at' };
    F.setDate('afFrom', ''); F.setDate('afTo', '');
    document.getElementById('afName').value = '';
    ['afOwner', 'afSort'].forEach(function (id) {
      var c = document.getElementById(id);
      c.querySelector('.ctl__value').textContent = c.querySelector('.dropdown__opt').textContent;
    });
    pg.reset(); redraw(); F.toast('Filter reset.', 'info');
  });

  document.addEventListener('prjdatachange', function () { pg.reset(); redraw(); });

  redraw();
  if (window.lucide) window.lucide.createIcons();
})();
