// productivity-task-list.js — Task List: category → paid work group mappings (#40–#42)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var persona = 'HESTI', pick = { cat: '', grp: '' }, cur = null;
  var state = 'active', filt = { key: '', grp: '', sort: 'created_at' };
  var pg = F.pager('pgTl', 10, draw, 'mappings');

  function hr() { return persona === 'HESTI'; }

  document.getElementById('tlPersona').addEventListener('click', function (e) {
    var b = e.target.closest('[data-persona]');
    if (!b) return;
    this.querySelectorAll('[data-persona]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    persona = b.getAttribute('data-persona');
    document.getElementById('tlNewBtn').style.display = hr() ? '' : 'none';
    document.getElementById('tlNote').textContent = hr()
      ? 'One active mapping per category — the uniqueness gate enforces it.'
      : 'Read-only: composing or changing a mapping is HR territory.';
    draw();
    F.toast('Acting as ' + D.empName(persona) + ' (' + D.EMP[persona].role + ').', 'info');
  });

  document.getElementById('tlState').addEventListener('click', function (e) {
    var b = e.target.closest('[data-st]');
    if (!b) return;
    this.querySelectorAll('[data-st]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    state = b.getAttribute('data-st');
    document.getElementById('tlTitle').textContent = state === 'active' ? 'Active mappings' : state === 'inactive' ? 'Deactivated mappings' : 'All mappings';
    pg.reset(); draw();
  });

  // ---------- filter ----------
  function fillFilterGroup() {
    document.getElementById('tfGrpDD').innerHTML = D.opt('', 'All groups') +
      D.PAID_GROUPS.map(function (g) { return D.opt(g.code, g.group_name); }).join('');
    F.wireSelects(document.getElementById('tlFilter'));
  }
  document.getElementById('tlSrch').addEventListener('input', function () { filt.key = this.value.trim().toLowerCase(); pg.reset(); draw(); });
  document.getElementById('tfGrp').addEventListener('select', function (e) { filt.grp = e.detail.value; pg.reset(); draw(); });
  document.getElementById('tfSort').addEventListener('select', function (e) { filt.sort = e.detail.value; draw(); });
  document.getElementById('tfClear').addEventListener('click', function () {
    filt.grp = ''; filt.sort = 'created_at';
    var g = document.getElementById('tfGrp').querySelector('.ctl__value'); g.textContent = 'All groups';
    var s = document.getElementById('tfSort').querySelector('.ctl__value'); s.textContent = 'created_at (default)';
    pg.reset(); draw();
    F.paintFilterSums && F.paintFilterSums();
  });

  function rows() {
    return D.MAPPINGS.filter(function (m) {
      if (state === 'active' && !m.is_active) return false;
      if (state === 'inactive' && m.is_active) return false;
      if (filt.grp && m.group !== filt.grp) return false;
      if (filt.key) {
        var hay = (D.catName(m.category) + ' ' + D.groupName(m.group)).toLowerCase();
        if (hay.indexOf(filt.key) < 0) return false;
      }
      return true;
    }).sort(function (a, b) {
      if (filt.sort === 'category') return D.catName(a.category).localeCompare(D.catName(b.category));
      if (filt.sort === 'group') return D.groupName(a.group).localeCompare(D.groupName(b.group));
      return b.created_at.localeCompare(a.created_at);
    });
  }

  function draw() {
    var all = rows();
    document.getElementById('tlCount').textContent = all.length;
    var view = pg.slice(all);
    document.getElementById('tlBody').innerHTML = view.length ? view.map(function (m) {
      var acts = !hr()
        ? '<div class="rowacts"><button class="rowbtn" type="button" disabled title="HR only">HR only</button></div>'
        : m.is_active
          ? '<div class="rowacts"><button class="rowbtn rowbtn--danger" type="button" data-off="' + m.code + '">Deactivate</button></div>'
          : '<div class="rowacts"><button class="rowbtn" type="button" disabled title="The row survives on purpose — map the category again to reactivate it">Deactivated</button></div>';
      return '<tr><td class="cell-strong">' + D.catName(m.category) + '</td>' +
        '<td>' + D.groupName(m.group) + '<div class="cell-dim">' + m.group + '</div></td>' +
        '<td>' + D.badge(m.is_active ? 'green' : 'grey', m.is_active ? 'Active' : 'Inactive') + '</td>' +
        '<td>' + D.stampDate(m.created_at) + '<div class="cell-dim">' + D.empName(m.created_by || 'HESTI') + '</div></td>' +
        '<td class="ta-r">' + acts + '</td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="muted-empty">' +
      (state === 'inactive' ? 'No deactivated mapping yet.' : 'No mapping matches — every hour under those categories settles as unpaid.') + '</div></td></tr>';
    pg.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------- create ----------
  function fillPickers() {
    document.getElementById('tlCatDD').innerHTML = D.CATEGORIES.filter(function (c) { return c.is_active; })
      .map(function (c) { return D.opt(c.code, c.name); }).join('');
    document.getElementById('tlGrpDD').innerHTML = D.PAID_GROUPS.filter(function (g) { return g.is_active; })
      .map(function (g) { return D.opt(g.code, g.group_name); }).join('');
    F.wireSelects(document.getElementById('tlForm'));
  }
  function sync() { document.getElementById('tlSave').disabled = !(pick.cat && pick.grp); }
  document.getElementById('tlCat').addEventListener('select', function (e) { pick.cat = e.detail.value; document.getElementById('tlGate').style.display = 'none'; sync(); });
  document.getElementById('tlGrp').addEventListener('select', function (e) { pick.grp = e.detail.value; sync(); });

  document.getElementById('tlNewBtn').addEventListener('click', function () {
    pick = { cat: '', grp: '' };
    fillPickers();
    ['tlCat', 'tlGrp'].forEach(function (id) {
      var v = document.getElementById(id).querySelector('.ctl__value');
      v.textContent = id === 'tlCat' ? 'Select category' : 'Select group';
      v.style.color = 'var(--fg-4)';
    });
    document.getElementById('tlGate').style.display = 'none';
    sync();
    F.openModal('tlForm');
  });

  document.getElementById('tlSave').addEventListener('click', function () {
    var clash = D.MAPPINGS.filter(function (m) { return m.is_active && m.category === pick.cat; })[0];
    if (clash) {
      document.getElementById('tlGateMsg').textContent = D.catName(pick.cat) + ' already maps to ' + D.groupName(clash.group) +
        ' (' + clash.code + '). Deactivate that mapping before pointing the category somewhere else.';
      document.getElementById('tlGate').style.display = '';
      return;
    }
    var n = D.MAPPINGS.length + 1;
    D.MAPPINGS.push({ code: 'MAP-' + ('000' + n).slice(-4), category: pick.cat, group: pick.grp, is_active: true, created_at: '2026-08-13', created_by: 'HESTI', deactivation_reason: null });
    F.closeModal('tlForm'); draw();
    F.toast('201 Created — ' + D.catName(pick.cat) + ' → ' + D.groupName(pick.grp) + '.', 'ok');
  });

  // ---------- deactivate ----------
  document.getElementById('tlBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-off]');
    if (!b) return;
    cur = D.byCode(D.MAPPINGS, b.getAttribute('data-off'));
    document.getElementById('offCat').textContent = D.catName(cur.category);
    document.getElementById('offGrp').textContent = D.groupName(cur.group);
    document.getElementById('offReason').value = '';
    F.openModal('tlOff');
  });

  document.getElementById('offConfirm').addEventListener('click', function () {
    cur.is_active = false;
    cur.deactivation_reason = document.getElementById('offReason').value.trim() || null;
    F.closeModal('tlOff'); draw();
    F.toast('200 OK — mapping deactivated. The row stays; recorded hours are untouched. Switch to “Inactive” to see it.', 'warn');
  });

  fillFilterGroup();
  draw();
  if (window.lucide) window.lucide.createIcons();
})();
