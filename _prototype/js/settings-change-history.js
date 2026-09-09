/* Settings — Change History (A3, POST /settings/versions/search). Read-only grid,
   zero buttons, pagination from birth. FSD-001-SETTINGS-0.2 §9 / UIC §3. */
(function () {
  var S = window.SettingsData, F = window.Flow;
  var st = { role: 'ROLE_HR_MANAGER', mods: [], code: '', sys: '', actor: '', from: null, to: null };

  var params = new URLSearchParams(location.search);
  var carried = params.get('code') || '';
  if (carried) {
    st.code = carried;
    document.getElementById('carried').classList.remove('is-hidden');
    document.getElementById('carriedCode').textContent = carried;
  }
  var hash = (location.hash || '').replace('#', '');
  if (hash && S.menu(hash)) {
    var pfx = { time: ['attendance.', 'leave.', 'overtime.', 'sick.'], finance: ['finance.'], payroll: ['payroll.'],
      performance: ['performance.'], productivity: ['productivity.'], document: ['document.'] }[hash];
    if (pfx) st.mods = pfx.slice();
    var cm = document.getElementById('crumbMenu');
    cm.textContent = S.menu(hash).label;
    cm.href = 'settings-configuration.html#' + hash;
    cm.classList.remove('is-hidden');
    document.getElementById('crumbMenuSep').classList.remove('is-hidden');
  }

  document.getElementById('asRoleDd').innerHTML = S.ROLES.map(function (r) {
    return '<div class="dropdown__opt' + (r.id === st.role ? ' is-sel' : '') + '" data-val="' + r.id + '">' + (r.person ? r.person + ' — ' : '') + r.id + '</div>';
  }).join('');
  document.getElementById('fMods').innerHTML = S.PREFIXES.map(function (p) {
    return '<label class="fchk"><input type="checkbox" data-mod="' + p.p + '"' + (st.mods.indexOf(p.p) > -1 ? ' checked' : '') + '><span class="fchk__box">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span>' +
      '<span class="fchk__lbl">' + p.label + '</span></label>';
  }).join('');
  var codes = S.VERSIONS.map(function (v) { return v.code; }).filter(function (c, i, a) { return a.indexOf(c) === i; }).sort();
  document.getElementById('fCodeDd').innerHTML = '<div class="dropdown__opt' + (st.code ? '' : ' is-sel') + '" data-val="">All settings</div>' +
    codes.map(function (c) { return '<div class="dropdown__opt' + (c === st.code ? ' is-sel' : '') + '" data-val="' + c + '">' + c + '</div>'; }).join('');
  if (st.code) document.querySelector('#fCode .ctl__value').textContent = st.code;
  var actors = S.VERSIONS.filter(function (v) { return !v.sys && !v.anon; }).map(function (v) { return v.by.nama + ' · ' + v.by.nik; })
    .filter(function (c, i, a) { return a.indexOf(c) === i; });
  document.getElementById('fActorDd').innerHTML = '<div class="dropdown__opt is-sel" data-val="">Anyone</div>' +
    actors.map(function (a) { return '<div class="dropdown__opt" data-val="' + a + '">' + a + '</div>'; }).join('');

  F.wireSelects(document);
  document.getElementById('asRole').addEventListener('select', function (e) { st.role = e.detail.value; render(); });
  document.getElementById('fCode').addEventListener('select', function (e) { st.code = e.detail.value; });
  document.getElementById('fSys').addEventListener('select', function (e) { st.sys = e.detail.value; });
  document.getElementById('fActor').addEventListener('select', function (e) { st.actor = e.detail.value; });
  document.getElementById('fRange').addEventListener('rangechange', function (e) { st.from = e.detail.from; st.to = e.detail.to; });
  document.getElementById('fApply').addEventListener('click', function () {
    st.mods = [].slice.call(document.querySelectorAll('[data-mod]')).filter(function (c) { return c.checked; }).map(function (c) { return c.getAttribute('data-mod'); });
    pg.reset(); F.closeModal('histFilter'); F.paintFilterSums(); paint();
  });

  var pg = F.pager('histPg', 25, function () { paint(); }, 'version rows');

  function match(v) {
    if (st.code && v.code !== st.code) return false;
    if (st.mods.length && !st.mods.some(function (p) { return v.code.indexOf(p) === 0; })) return false;
    if (st.sys === 'true' && !v.sys) return false;
    if (st.sys === 'false' && v.sys) return false;
    if (st.actor && (v.sys || v.anon || (v.by.nama + ' · ' + v.by.nik) !== st.actor)) return false;
    var d = v.at.slice(0, 10);
    if (st.from && d < st.from) return false;
    if (st.to && d > st.to) return false;
    return true;
  }

  function actorCell(v) {
    if (v.sys) return '<span class="sb sb--blue"><span class="sb__dot"></span>SYSTEM</span>';
    if (v.anon) return '<span class="sb sb--grey"><span class="sb__dot"></span>ANONYMIZED</span>';
    return '<span style="font:600 13px/1.4 var(--font-body);color:var(--fg-link, var(--color-secondary-600))">' + v.by.nama + '</span><span class="st-sub">NIK ' + v.by.nik + '</span>';
  }
  function noteCell(v) {
    var out = [];
    if (v.locked) out.push('Platform row — locked in the settings grids, visible here as the platform changing itself.');
    if (v.anon) out.push('Anonymised subject; the row stays as compliance evidence and still shows when system rows are dropped.');
    if (v.ver === 1) out.push('Version 1 — nothing before it, so Before is empty by construction.');
    return out.length ? '<span class="st-offer">' + out.join(' ') + '</span>' : '<span class="st-none">—</span>';
  }

  function paint() {
    var rows = S.VERSIONS.filter(match);
    var view = pg.slice(rows);
    document.getElementById('histBody').innerHTML = view.length ? view.map(function (v) {
      return '<tr><td><span class="st-code">' + v.code + '</span></td>' +
        '<td><span class="st-offer">' + S.menuOfCode(v.code) + '</span></td>' +
        '<td class="ta-r"><span class="st-val">' + v.ver + '</span></td>' +
        '<td>' + (v.before === null ? '<span class="st-none">—</span>' : '<span class="st-val">' + JSON.stringify(v.before) + '</span>') + '</td>' +
        '<td><span class="st-val">' + JSON.stringify(v.after) + '</span></td>' +
        '<td>' + actorCell(v) + '</td>' +
        '<td><span class="st-offer">' + v.at + '</span></td>' +
        '<td>' + noteCell(v) + '</td></tr>';
    }).join('') : '<tr><td colspan="8"><span class="st-none">No version row matches this filter. An empty result answers 200 with an empty list and total_page 0 — this menu never answers 404.</span></td></tr>';
    pg.paint();
    if (window.lucide) lucide.createIcons();
  }

  function render() {
    var r = S.ROLES.filter(function (x) { return x.id === st.role; })[0];
    var allowed = r.id === 'ROLE_SUPER_ADMIN' || r.id === 'ROLE_HR_MANAGER';
    document.querySelector('#asRole .ctl__value').textContent = (r.person ? r.person + ' — ' : '') + r.id;
    document.getElementById('asMsg').textContent = allowed ? 'One of the two roles that may read the change history.' : 'Not one of the two top roles — refused at the gate even over its own module.';
    document.getElementById('gate').classList.toggle('is-hidden', allowed);
    document.getElementById('grid').classList.toggle('is-hidden', !allowed);
    if (allowed) paint();
    if (window.lucide) lucide.createIcons();
  }

  render();
})();
