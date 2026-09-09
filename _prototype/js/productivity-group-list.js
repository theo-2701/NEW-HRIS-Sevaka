// productivity-group-list.js — Group List: mst_paid_work_group master (#36–#39)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var persona = 'HESTI', editing = null, gfActive = 1;
  var state = 'active', filt = { key: '', sort: 'created_at' };
  var pg = F.pager('pgGl', 10, draw, 'groups');

  function hr() { return persona === 'HESTI'; }

  document.getElementById('glPersona').addEventListener('click', function (e) {
    var b = e.target.closest('[data-persona]');
    if (!b) return;
    this.querySelectorAll('[data-persona]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    persona = b.getAttribute('data-persona');
    document.getElementById('glNewBtn').style.display = hr() ? '' : 'none';
    document.getElementById('glNote').textContent = hr()
      ? 'Two substantive attributes only: name and active flag.'
      : 'Read-only: only HR composes this master.';
    draw();
    F.toast('Acting as ' + D.empName(persona) + ' (' + D.EMP[persona].role + ').', 'info');
  });

  document.getElementById('glState').addEventListener('click', function (e) {
    var b = e.target.closest('[data-st]');
    if (!b) return;
    this.querySelectorAll('[data-st]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    state = b.getAttribute('data-st');
    document.getElementById('glTitle').textContent = state === 'active' ? 'Paid work groups' : state === 'inactive' ? 'Inactive groups' : 'All groups';
    pg.reset(); draw();
  });

  document.getElementById('glSrch').addEventListener('input', function () { filt.key = this.value.trim().toLowerCase(); pg.reset(); draw(); });
  document.getElementById('gflSort').addEventListener('select', function (e) { filt.sort = e.detail.value; paintSort(); draw(); });
  function paintSort() { document.getElementById('glSortSum').textContent = 'Sorted by ' + filt.sort; }
  document.getElementById('gflClear').addEventListener('click', function () {
    filt.sort = 'created_at';
    paintSort();
    document.getElementById('gflSort').querySelector('.ctl__value').textContent = 'created_at (default)';
    pg.reset(); draw();
    F.paintFilterSums && F.paintFilterSums();
  });
  F.wireSelects(document.getElementById('glFilter'));

  function mapped(code) { return D.MAPPINGS.filter(function (m) { return m.group === code && m.is_active; }).length; }

  function rows() {
    return D.PAID_GROUPS.filter(function (g) {
      if (state === 'active' && !g.is_active) return false;
      if (state === 'inactive' && g.is_active) return false;
      if (filt.key && g.group_name.toLowerCase().indexOf(filt.key) < 0) return false;
      return true;
    }).sort(function (a, b) {
      return filt.sort === 'group_name' ? a.group_name.localeCompare(b.group_name) : b.created_at.localeCompare(a.created_at);
    });
  }

  function draw() {
    var all = rows();
    document.getElementById('glCount').textContent = all.length;
    var view = pg.slice(all);
    document.getElementById('glBody').innerHTML = view.length ? view.map(function (g) {
      var n = mapped(g.code);
      var acts = hr() ? F.rowMenu([
        { label: 'Edit', icon: 'pencil', attr: 'data-gedit="' + g.code + '"' },
        { label: 'Delete', icon: 'trash-2', danger: true, disabled: true, reason: 'No delete endpoint exists for this master — set the group inactive via Edit instead.' }
      ]) : '<div class="rowacts"><button class="rowbtn" type="button" disabled title="HR only">HR only</button></div>';
      return '<tr><td class="cell-strong">' + g.group_name + '</td>' +
        '<td class="cell-dim">' + g.code + '</td>' +
        '<td>' + D.badge(g.is_active ? 'green' : 'grey', g.is_active ? 'Active' : 'Inactive') + '</td>' +
        '<td>' + (n ? D.badge('blue', n + ' mapping' + (n > 1 ? 's' : '')) : '<span class="cell-dim">none</span>') + '</td>' +
        '<td>' + D.stampDate(g.created_at) + '<div class="cell-dim">' + D.empName(g.created_by || 'HESTI') + '</div></td>' +
        '<td class="ta-r">' + acts + '</td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="muted-empty">No group matches this view.</div></td></tr>';
    pg.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  var gfName = document.getElementById('gfName'), gfSave = document.getElementById('gfSave');
  gfName.addEventListener('input', function () {
    document.getElementById('gfCount').textContent = gfName.value.length;
    document.getElementById('gfDup').style.display = 'none';
    gfSave.disabled = !gfName.value.trim();
  });
  document.getElementById('gfActive').addEventListener('click', function (e) {
    var b = e.target.closest('[data-active]');
    if (!b || b.disabled) return;
    this.querySelectorAll('[data-active]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    gfActive = +b.getAttribute('data-active');
  });

  function openForm(code) {
    editing = code || null;
    var g = code ? D.byCode(D.PAID_GROUPS, code) : null;
    document.getElementById('gfTitle').textContent = g ? 'Edit group' : 'New group';
    document.getElementById('gfDesc').textContent = g
      ? 'Change the name or the active flag; deactivating cascades to nothing.'
      : 'One substantive field — the name. A new group is born active.';
    gfName.value = g ? g.group_name : '';
    document.getElementById('gfCount').textContent = gfName.value.length;
    gfActive = g ? (g.is_active ? 1 : 0) : 1;
    document.getElementById('gfActiveFld').style.display = g ? '' : 'none';
    document.getElementById('gfActive').querySelectorAll('[data-active]').forEach(function (x) {
      x.classList.toggle('is-on', +x.getAttribute('data-active') === gfActive);
      x.disabled = false;
    });
    document.getElementById('gfActiveHint').textContent = 'Switching this off does not touch the mappings that point here.';
    document.getElementById('gfDup').style.display = 'none';
    gfSave.disabled = !gfName.value.trim();
    F.openModal('glForm');
  }
  document.getElementById('glNewBtn').addEventListener('click', function () { openForm(null); });

  gfSave.addEventListener('click', function () {
    var name = gfName.value.trim();
    if (D.PAID_GROUPS.filter(function (g) { return g.group_name.toLowerCase() === name.toLowerCase() && g.code !== editing; }).length) {
      document.getElementById('gfDup').style.display = '';
      return;
    }
    if (editing) {
      var g = D.byCode(D.PAID_GROUPS, editing);
      var was = g.is_active;
      g.group_name = name; g.is_active = gfActive === 1;
      F.closeModal('glForm'); draw();
      F.toast(was && !g.is_active
        ? '200 OK — group deactivated. Mappings pointing here keep applying (no cascade).'
        : '200 OK — group updated.', was && !g.is_active ? 'warn' : 'ok');
    } else {
      var n = D.PAID_GROUPS.length + 1;
      D.PAID_GROUPS.push({ code: 'PWG-' + ('000' + n).slice(-4), group_name: name, is_active: true, created_at: '2026-08-13', created_by: 'HESTI', mapped: false });
      F.closeModal('glForm'); draw();
      F.toast('201 Created — "' + name + '" is active from birth.', 'ok');
    }
  });

  document.getElementById('glBody').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-gedit]');
    if (ed) openForm(ed.getAttribute('data-gedit'));
  });

  paintSort();
  draw();
  if (window.lucide) window.lucide.createIcons();
})();
