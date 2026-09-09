// ============================================================
// SEVAKA HRIS — Company Management › Notification (Inbox)
// FSD-001-NOTIFICATION-0.1 §1 · UIC-001-NOTIFICATION-0.1 §2 (N1/N2)
// Read + update-lite only: GET .../inbox, PUT .../inbox/{id}/read (idempotent).
// ============================================================
(function () {
  'use strict';
  var F = window.Flow;
  var $ = function (id) { return document.getElementById(id); };

  // Rows come from the shared store in js/shell.js (window.SevakaNotif) — the SAME
  // notification_inbox rows the top-nav bell popover renders, so a row marked read
  // in either surface is read in both.
  var S = window.SevakaNotif;
  var ROWS = S.rows();

  var flt = { is_read: '', sort_by: 'created_at', sort_direction: 'desc' };
  var pgNt = F.pager('pgNt', 10, function () { draw(); }, 'notifications');

  var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function stamp(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.getDate() + ' ' + M[d.getMonth()] + ' ' + d.getFullYear() + ' · ' +
      ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  // Reference link is assembled by the service from (reference_type, reference_id) —
  // an opaque pointer pair, never a URL carried inside the message (TSD §6.9.1).
  // Only reference types whose screen exists in this build get a live button; a pointer
  // we cannot resolve is stated as text instead of a dead link.
  // The button names its destination, so the jump is never a surprise.
  var REF_ROUTE = { FINANCE_REQUEST: { href: 'finance-benefit-reimbursement.html', label: 'Open in Reimbursement' } };

  function draw() {
    var all = ROWS.filter(function (r) {
      if (flt.is_read === 'true' && !r.is_read) return false;
      if (flt.is_read === 'false' && r.is_read) return false;
      return true;
    }).slice().sort(function (a, b) {
      var av, bv;
      if (flt.sort_by === 'is_read') { av = a.is_read ? 1 : 0; bv = b.is_read ? 1 : 0; }
      else { av = a.created_at; bv = b.created_at; }
      if (av === bv) return a.created_at < b.created_at ? 1 : -1;
      return (av < bv ? -1 : 1) * (flt.sort_direction === 'asc' ? 1 : -1);
    });

    var unread = ROWS.filter(function (r) { return !r.is_read; }).length;
    $('ntUnread').textContent = unread + (unread === 1 ? ' unread' : ' unread');

    var view = pgNt.slice(all);
    $('ntBody').innerHTML = view.length ? view.map(function (r) {
      var status = r.is_read
        ? '<span class="sb sb--green"><span class="sb__dot"></span>Read</span><div class="nt-when" style="margin-top:4px"><small>' + stamp(r.read_at) + (r.read_at_timezone ? ' ' + r.read_at_timezone : '') + '</small></div>'
        : '<span class="sb sb--amber"><span class="sb__dot"></span>Unread</span>';
      // reference_type + reference_id are a paired pair; NULL on both = a row with no
      // linked record — rendered as an absence, not a dead button (FSD §1.1).
      var ref = REF_ROUTE[r.reference_type];
      var act = !r.reference_type ? '<span class="nt-none">No linked record</span>'
        : ref
          ? '<div class="rowacts"><a class="rowbtn" href="' + ref.href + '" data-ref="' + r.id + '" title="' + r.reference_type + ' · ' + r.reference_id + '">' + ref.label + '</a></div>'
          : '<span class="nt-none">' + r.reference_type + ' — screen not built yet</span>';
      return '<tr class="nt-row' + (r.is_read ? '' : ' is-unread') + '" data-row="' + r.id + '">' +
        '<td><div class="nt-msg__t">' + esc(r.title) + '</div><div class="nt-msg__b">' + esc(r.body) + '</div></td>' +
        '<td><span class="nt-type">' + r.notification_type + '</span></td>' +
        '<td><div class="nt-when">' + stamp(r.created_at) + '</div></td>' +
        '<td class="ta-c">' + status + '</td>' +
        '<td class="ta-r">' + act + '</td>' +
        '</tr>';
    }).join('') : '<tr><td colspan="5"><div class="tempty"><div class="tempty__t">No notification matches this filter.</div></div></td></tr>';
    pgNt.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // PUT .../inbox/{id}/read — notification-id is CARRIED from the clicked row's id.
  function markRead(id) {
    var res = S.markRead(id);
    if (res.status === 404) { F.toast('404 NOT_FOUND — notification not found.', 'err'); return; }
    if (!res.changed) {
      F.toast('200 — returned as-is (idempotent). is_read stays true, read_at unchanged (' + stamp(res.row.read_at) + ').', 'info');
      return;
    }
    F.toast('200 — marked read. is_read false → true · read_at ' + stamp(res.row.read_at) + ' Asia/Jakarta · updated_by Budi Santoso.', 'ok');
    if (window.renderNotifList) window.renderNotifList();
    draw();
  }

  function setFlt(id, key, cb) {
    $(id).addEventListener('select', function (e) { cb(e.detail.value); pgNt.reset && pgNt.reset(); draw(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setFlt('ntStatus', 'is_read', function (v) { flt.is_read = v; });
    setFlt('ntSort', 'sort', function (v) {
      var p = String(v).split(':'); flt.sort_by = p[0]; flt.sort_direction = p[1];
    });
    $('ntTable').addEventListener('click', function (e) {
      if (e.target.closest('[data-ref]')) return; // linked-record link: navigate, do not mark read
      var tr = e.target.closest('[data-row]');
      if (tr) markRead(tr.getAttribute('data-row'));
    });
    // Prototype affordance only (no contract endpoint): restore the positive-scenario
    // dataset so the mark-read / idempotent-second-click flow can be replayed.
    $('ntReset').addEventListener('click', function () {
      try { localStorage.removeItem('sevaka.notification.read.v1'); } catch (e) {}
      location.hash = '';
      location.reload();
    });
    draw();
    if (location.hash) focusRow(location.hash.slice(1));
    window.addEventListener('hashchange', function () { focusRow(location.hash.slice(1)); });
  });

  // Opened from the top-nav bell: scroll the carried row into view and flash it.
  function focusRow(id) {
    var tr = document.querySelector('[data-row="' + id + '"]');
    if (!tr) return;
    tr.classList.add('is-focus');
    setTimeout(function () { tr.classList.remove('is-focus'); }, 2200);
  }
  window.notifFocusRow = focusRow;
})();
