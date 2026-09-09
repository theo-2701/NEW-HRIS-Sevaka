// ============================================================
// SEVAKA HRIS — Time › Attendance Settings (cnf_attendance_geofence)
// FSD-001-TIME §6 · UIC-001-TIME §7
// ============================================================
(function () {
  'use strict';
  var T = window.TimeData, F = window.Flow;
  var GEO = T.GEOFENCES.map(function (g) { return Object.assign({}, g, { rules: JSON.parse(JSON.stringify(g.rules)) }); });
  var ARR = ['WFO', 'HYBRID', 'WFH', 'MOBILE'];
  var editGeo = null, flt = { branch: '', name: '', active: '' };
  var $ = function (id) { return document.getElementById(id); };
  var pgGeo = F.pager('pgGeo', 10, function () { draw(); }, 'work points');

  function kv(rows) { return rows.map(function (r) { return '<div class="kv__k">' + r[0] + '</div><div class="kv__v">' + r[1] + '</div>'; }).join(''); }
  function matrixCell(g) {
    return '<div class="tm-flags">' + ARR.map(function (a) {
      var r = g.rules[a], bits = [];
      if (r.radius) bits.push('radius');
      if (r.selfie) bits.push('selfie');
      return '<span class="tm-flag' + (bits.length ? '' : ' tm-flag--off') + '">' + a + ': ' + (bits.length ? bits.join(' + ') : 'none') + '</span>';
    }).join('') + '</div>';
  }

  function banner(html) {
    var el = $('geoBanner');
    if (!html) { el.classList.add('is-hidden'); return; }
    $('geoBannerTxt').innerHTML = html;
    el.classList.remove('is-hidden');
  }
  function draw() {
    var all = GEO.filter(function (g) {
      if (flt.branch && g.scope_ref !== flt.branch) return false;
      if (flt.name && g.geofence_name.toLowerCase().indexOf(flt.name.toLowerCase()) < 0) return false;
      if (flt.active && String(g.is_active) !== flt.active) return false;
      return true;
    });
    var view = pgGeo.slice(all);
    $('geoBody').innerHTML = view.length ? view.map(function (g) {
      return '<tr>' +
        '<td class="cell-strong">' + g.geofence_name + '</td>' +
        '<td>' + T.scopeName('LOCATION', g.scope_ref) + '</td>' +
        '<td class="cell-mono">' + g.center_latitude.toFixed(6) + ', ' + g.center_longitude.toFixed(6) + '</td>' +
        '<td class="ta-r"><span class="tm-num">' + g.radius_meters + ' m</span></td>' +
        '<td>' + matrixCell(g) + '</td>' +
        '<td>' + (g.is_active
          ? '<span class="sb sb--green"><span class="sb__dot"></span>Active</span>'
          : '<span class="sb sb--grey"><span class="sb__dot"></span>Inactive</span>') + '</td>' +
        '<td>' + F.rowMenu([
          { label: 'Edit', icon: 'pencil', attr: 'data-gedit="' + g.id + '"' },
          { label: g.is_active ? 'Deactivate' : 'Reactivate', icon: 'power', attr: 'data-gtog="' + g.id + '"' },
          { label: 'Delete', icon: 'trash-2', attr: 'data-gdel="' + g.id + '"', danger: true }
        ]) + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="7"><div class="tempty"><div class="tempty__t">No work point in this branch.</div></div></td></tr>';
    pgGeo.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function setSel(id, val, text) {
    var ctl = $(id), v = ctl.querySelector('.ctl__value');
    ctl.dataset.val = val || ''; v.textContent = text;
    v.style.color = val ? 'var(--fg-1)' : 'var(--fg-4)';
    ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.toggle('is-sel', o.dataset.val === val); });
  }
  function paintMatrix(rules) {
    $('gfMatrix').querySelector('tbody').innerHTML = ARR.map(function (a) {
      var r = rules[a];
      return '<tr><td>' + T.LABEL.arrangement[a] + ' <span class="cell-dim">(' + a + ')</span></td>' +
        '<td><label class="fchk fchk--bare"><input type="checkbox" data-mx="' + a + '-radius"' + (r.radius ? ' checked' : '') + '><span class="fchk__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span></label></td>' +
        '<td><label class="fchk fchk--bare"><input type="checkbox" data-mx="' + a + '-selfie"' + (r.selfie ? ' checked' : '') + '><span class="fchk__box"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span></label></td></tr>';
    }).join('');
  }
  function readMatrix() {
    var out = {};
    ARR.forEach(function (a) {
      out[a] = {
        radius: $('gfMatrix').querySelector('[data-mx="' + a + '-radius"]').checked,
        selfie: $('gfMatrix').querySelector('[data-mx="' + a + '-selfie"]').checked
      };
    });
    return out;
  }

  function openForm(g) {
    editGeo = g || null;
    $('gfTitle').textContent = g ? 'Edit work point' : 'New work point';
    $('gfName').value = g ? g.geofence_name : '';
    setSel('gfBranch', g ? g.scope_ref : '', g ? T.scopeName('LOCATION', g.scope_ref) : 'Select branch');
    $('gfLat').value = g ? g.center_latitude : '';
    $('gfLng').value = g ? g.center_longitude : '';
    $('gfRadius').value = g ? g.radius_meters : '';
    $('gfActive').checked = g ? !!g.is_active : true;
    paintMatrix(g ? g.rules : { WFO: { radius: false, selfie: false }, HYBRID: { radius: false, selfie: false }, WFH: { radius: false, selfie: false }, MOBILE: { radius: false, selfie: false } });
    F.openModal('geoForm');
  }

  function save() {
    var name = $('gfName').value.trim(), branch = $('gfBranch').dataset.val;
    var lat = parseFloat($('gfLat').value), lng = parseFloat($('gfLng').value);
    var radius = parseInt($('gfRadius').value, 10);
    if (name.length < 3) { F.toast('422 — the point name must be 3–150 characters.', 'danger'); return; }
    if (!branch) { F.toast('422 — pick the branch this point belongs to.', 'danger'); return; }
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      F.toast('422 — latitude and longitude are required together, within ±90 and ±180.', 'danger'); return;
    }
    if (isNaN(radius) || radius <= 0) { F.toast('422 — the radius must be a positive whole number of metres.', 'danger'); return; }
    var clash = GEO.filter(function (x) { return x.is_active && x.scope_ref === branch && x.geofence_name.toLowerCase() === name.toLowerCase() && x !== editGeo; })[0];
    if (!editGeo && clash) { F.toast('409 — an active point in this branch already carries that name.', 'danger'); return; }
    var rules = readMatrix();
    if (editGeo) {
      Object.assign(editGeo, { geofence_name: name, scope_ref: branch, center_latitude: lat, center_longitude: lng, radius_meters: radius, is_active: $('gfActive').checked, rules: rules });
      F.toast('200 — point updated. Taps already assessed are untouched; the new rule starts with the next tap.', 'ok');
    } else {
      GEO.push({ id: 'geo-' + (GEO.length + 10), geofence_name: name, scope_ref: branch, center_latitude: lat, center_longitude: lng, radius_meters: radius, is_active: $('gfActive').checked, used_by_punch: false, rules: rules });
      F.toast('201 — point saved and immediately a candidate for the next tap in that branch.', 'ok');
    }
    if (radius < 50) F.toast('Radius below typical phone GPS accuracy — saved anyway, but taps may read as outside.', 'warn');
    F.closeModal('geoForm'); draw();
  }

  document.addEventListener('DOMContentLoaded', function () {
    T.fillSelect('fltBranch', '<div class="dropdown__opt is-sel" data-val="">All branches</div>' +
      T.BRANCHES.map(function (b) { return '<div class="dropdown__opt" data-val="' + b.id + '">' + b.name + '</div>'; }).join(''));
    T.fillSelect('gfBranch', T.BRANCHES.map(function (b) { return '<div class="dropdown__opt" data-val="' + b.id + '">' + b.name + '</div>'; }).join(''));
    T.fillSelect('fltActive', '<div class="dropdown__opt is-sel" data-val="">All statuses</div><div class="dropdown__opt" data-val="true">Active</div><div class="dropdown__opt" data-val="false">Inactive</div>');
    draw();

    $('fltBranch').addEventListener('select', function (e) { flt.branch = e.detail.value.indexOf('All') === 0 ? '' : e.detail.value; pgGeo.reset(); draw(); });
    $('fltActive').addEventListener('select', function (e) { flt.active = e.detail.value === 'Active' ? 'true' : e.detail.value === 'Inactive' ? 'false' : ''; pgGeo.reset(); draw(); });
    $('fltName').addEventListener('input', function () { flt.name = this.value.trim(); pgGeo.reset(); draw(); });
    $('gfBranch').addEventListener('select', function (e) { $('gfBranch').dataset.val = e.detail.value; });
    $('newGeoBtn').addEventListener('click', function () { openForm(null); });
    $('gfSave').addEventListener('click', save);

    $('geoBody').addEventListener('click', function (e) {
      var t = e.target.closest('[data-gedit],[data-gtog],[data-gdel]'); if (!t) return;
      var g = T.byId(GEO, t.getAttribute('data-gedit') || t.getAttribute('data-gtog') || t.getAttribute('data-gdel'));
      if (t.hasAttribute('data-gedit')) { banner(''); openForm(g); }
      else if (t.hasAttribute('data-gtog')) {
        // §6.4 — one step straight from the row: no dialog, no decision branch, never refused.
        g.is_active = !g.is_active;
        banner(''); draw();
        F.toast(g.is_active
          ? '200 — point reactivated; it is a candidate for new tap evaluation again.'
          : '200 — point deactivated; it leaves new tap evaluation and every recorded tap stays unchanged.', 'ok');
      } else {
        // §6.5 — delete checks the reference gate immediately; the refusal is a banner on the list, not a dialog.
        if (g.used_by_punch) {
          banner('<code>409</code> — “' + g.geofence_name + '” cannot be deleted: recorded taps still reference it. The lawful way to retire a point that has already validated a tap is the <strong>Deactivate</strong> toggle — the row and its history stay exactly as they are.');
          F.toast('409 — refused; this point is still referenced by recorded taps.', 'danger');
          return;
        }
        GEO.splice(GEO.indexOf(g), 1);
        banner(''); pgGeo.reset(); draw();
        F.toast('200 — work point deleted; it had never validated a single tap.', 'ok');
      }
    });
  });
})();
