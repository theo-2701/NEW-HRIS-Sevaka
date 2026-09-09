// SEVAKA HRIS — Payroll › Employee Self-Service › Payroll Info (document version).
// Dewi Lestari (ROLE_EMPLOYEE) — a plain list of the periods whose payslip is ready.
(function () {
  var D = window.PD, ME = 'E1';

  function drawInfo() {
    var rows = Object.keys(D.RESULTS).map(function (pid) {
      var r = D.RESULTS[pid].filter(function (x) { return x.e === ME; })[0];
      return r ? { pid: pid, r: r } : null;
    }).filter(Boolean).filter(function (x) { return D.period(x.pid).status === 'HANDED_OVER'; });
    document.getElementById('infoBody').innerHTML = rows.length ? rows.map(function (x) {
      var p = D.period(x.pid);
      return '<tr><td class="cell-mono">' + D.plabel(p) + '</td><td class="cell-strong">' + D.pname(p) + '</td>' +
        '<td class="ta-r"><span class="money">' + D.rp(x.r.net) + '</span></td>' +
        '<td class="ta-r"><div class="rowacts"><a class="rowbtn" href="payroll-doc-payslip.html?period=' + x.pid + '">View Detail</a></div></td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="tempty"><span class="tempty__t">No payslip available yet.</span>A period shows up here once it has been handed over.</div></td></tr>';
  }

  document.addEventListener('DOMContentLoaded', drawInfo);
})();
