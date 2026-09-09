// SEVAKA HRIS — Payroll › Employee Self-Service › Payslip (document version).
// Two actors on one page: Dewi Lestari (ROLE_EMPLOYEE) and Maya Anggraini (ROLE_HR_MANAGER).
(function () {
  var F = window.Flow, D = window.PD;
  var ME = 'E1', HR = 'MAYA', NOW = '30 July 2026 09:12';
  var qs = (location.search.match(/period=([a-z0-9]+)/) || [])[1];
  var myPid = window.PD.period(qs) ? qs : 'p7', hrPid = 'p7', hrOpen = null, clock = 12;

  function slipHTML(pid, empKey, opts) {
    var s = D.SLIPS[pid + '-' + empKey], e = D.emp(empKey), p = D.period(pid);
    if (!s) return '<div class="tempty">No payslip prepared for this period.</div>';
    var gross = 0, minus = 0;
    var groups = s.groups.map(function (g) {
      if (!g.rows.length && g.k !== 'group_potongan') return '';
      var body = g.rows.length ? g.rows.map(function (r) {
        if (r.d === 'MINUS') minus += r.a; else gross += r.a;
        return '<div class="pd-slip__row"><div><span class="pd-slip__nm">' + r.n + '</span>' +
          (r.c ? '<span class="pd-slip__cz">' + r.c + '</span>' : '') + '</div>' +
          '<div class="pd-slip__am' + (r.d === 'MINUS' ? ' pd-slip__am--minus' : '') + '">' + (r.d === 'MINUS' ? '−' : '') + D.rp(r.a) + '</div></div>';
      }).join('') : '<div class="pd-slip__row"><div class="pd-slip__cz">No line in this group for this period.</div><div class="pd-slip__am">' + D.rp(0) + '</div></div>';
      var sum = g.rows.reduce(function (a, r) { return a + (r.d === 'MINUS' ? -r.a : r.a); }, 0);
      return '<div class="pd-slip__grp"><div class="pd-slip__gt">' + g.label + '</div>' + body +
        '<div class="pd-slip__sub"><div>Subtotal ' + g.label.toLowerCase() + '</div><div style="text-align:right">' + (sum < 0 ? '−' : '') + D.rp(Math.abs(sum)) + '</div></div></div>';
    }).join('');
    return '<div class="pd-slip">' +
      '<div class="pd-slip__head"><div style="display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap">' +
        '<div><div class="pd-card__t">' + e.name + '</div>' +
        '<div class="pd-card__s">NIK ' + e.nik + ' · Branch ' + e.branch + ' · ' + (e.cc || 'No cost center assigned') + ' · ' + (e.sbu || 'No SBU assigned') + '</div>' +
        '<div class="pd-card__s" style="margin-top:6px">Job title is not printed — <code>job_title</code> is not declared in the payslip contract.</div>' +
        (s.prorate ? '<div class="pd-card__s" style="margin-top:6px">Prepared partially — ' + s.prorate + '% of the full basis, following the work status recorded in this period.</div>' : '') + '</div>' +
        '<div style="text-align:right"><div class="pd-card__t">' + D.plabel(p) + '</div>' +
        '<div class="pd-card__s">' + D.pname(p) + '</div></div>' +
      '</div></div>' + groups +
      '<div class="pd-slip__foot"><div class="pd-enc">' +
        '<strong>Net prepared</strong> — this amount is <em>prepared</em> and handed to the company payroll system; it is not a statement that the money has been received. Payment is made and confirmed outside this system.' +
        '<div style="margin-top:8px">' + D.badge('amber', 'NOT YET REPORTED') + '</div></div>' +
        '<div style="text-align:right"><div class="pd-stat__k">Net prepared</div><div class="pd-net">' + D.rp(s.net) + '</div>' +
        '<div class="pd-card__s">Earnings ' + D.rp(gross) + ' · Deductions −' + D.rp(minus) + '</div></div>' +
      '</div></div>' +
      (opts && opts.foot ? opts.foot : '');
  }

  function drawMine() { document.getElementById('mySlip').innerHTML = '<div style="margin-top:16px">' + slipHTML(myPid, ME) + '</div>'; }

  var UUID = { E1: '9f21ab00-0010-7000-8000-000000000010', E2: '9f21ab00-0011-7000-8000-000000000011' };
  var pgHr = F.pager('pgHr', 10, drawHr, 'employees');

  function drawHr() {
    var q = (document.getElementById('hrSearch').value || '').toLowerCase();
    var all = (D.RESULTS[hrPid] || []).filter(function (r) { return D.emp(r.e).name.toLowerCase().indexOf(q) >= 0; });
    var rows = pgHr.slice(all);
    document.getElementById('hrBody').innerHTML = rows.length ? rows.map(function (r) {
      return '<tr><td>' + D.empCell(r.e) + '</td>' +
        '<td class="cell-mono">' + (UUID[r.e] || r.e) + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(r.net) + '</span></td>' +
        '<td class="ta-c">' + (r.openFinding ? D.badge('amber', 'YES') : D.badge('green', 'NONE')) + '</td>' +
        '<td class="ta-r">' + F.rowMenu([
          { label: 'View Detail', icon: 'eye', attr: 'data-hrslip="' + r.e + '"' },
          { label: 'Download slip (PDF)', icon: 'download', attr: 'data-hrrowdl="' + r.e + '"' }
        ]) + '</td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="tempty">No result row matches this search.</div></td></tr>';
    pgHr.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  function logAccess(empKey, channel) {
    clock += 2;
    D.ACCESSLOG.unshift({ at: '30 July 2026 09:' + clock, e: empKey, p: hrPid, ch: channel, by: HR });
    drawLog();
  }
  function drawLog() {
    document.getElementById('logBody').innerHTML = D.ACCESSLOG.length ? D.ACCESSLOG.map(function (l) {
      return '<tr><td>' + l.at + ' <span class="pv-tag">WIB</span></td><td>' + D.emp(l.e).name + '</td>' +
        '<td>' + D.plabel(D.period(l.p)) + '</td><td class="ta-c">' + D.sb(l.ch) + '</td><td>' + D.ACTOR[l.by].name + '</td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="tempty">No access recorded in this session yet — open someone\'s payslip and the trail appears here.</div></td></tr>';
  }

  function drawHrSlip() {
    var host = document.getElementById('hrSlip');
    if (!hrOpen) { host.innerHTML = ''; return; }
    document.getElementById('hrSlipTitle').textContent = 'Payslip — ' + D.emp(hrOpen).name;
    host.innerHTML = slipHTML(hrPid, hrOpen);
    F.openModal('mHrSlip');
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', function () {
    drawMine(); drawHr(); drawLog();
    if (F.standardizeModals) F.standardizeModals();

    document.getElementById('myPeriod').addEventListener('select', function (e) { myPid = e.detail.value; drawMine(); });
    document.getElementById('hrPeriod').addEventListener('select', function (e) { hrPid = e.detail.value; hrOpen = null; pgHr.reset(); drawHr(); });
    document.getElementById('hrSearch').addEventListener('input', function () { pgHr.reset(); drawHr(); });
    document.getElementById('openTrail').addEventListener('click', function () { F.openModal('mTrail'); });
    document.getElementById('myDownload').addEventListener('click', function () {
      F.toast('Your payslip was downloaded — reading your own slip leaves no access trail.', 'ok');
    });

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-hrslip],[data-hrrowdl],[data-hrdl]');
      if (!t) return;
      if (t.hasAttribute('data-hrslip')) { hrOpen = t.getAttribute('data-hrslip'); logAccess(hrOpen, 'LAYAR'); drawHrSlip(); return; }
      if (t.hasAttribute('data-hrrowdl')) {
        logAccess(t.getAttribute('data-hrrowdl'), 'UNDUHAN');
        F.toast('Slip downloaded — an UNDUHAN access entry was written, treated exactly like a screen view.', 'ok'); return;
      }
      if (t.hasAttribute('data-hrdl')) {
        logAccess(hrOpen, 'UNDUHAN');
        F.toast('Slip downloaded — an UNDUHAN access entry was written, treated exactly like a screen view.', 'ok'); return;
      }
    });
  });
})();
