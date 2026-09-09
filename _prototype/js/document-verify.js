// SEVAKA — Public letter verification (Regime C: C2a · C2b · C2c). Zero token.
(function () {
  'use strict';
  var F = window.Flow, D = window.DocData;
  var esc = D.esc, dt = D.dt;
  var mode = 'code';

  function $(id) { return document.getElementById(id); }

  function shape1(l) {
    var cancelled = l.letter_state === 'DIBATALKAN';
    return '<div class="vf-res">' +
      '<div class="vf-res__ic vf-res__ic--ok"><i data-lucide="badge-check"></i></div>' +
      '<div class="vf-res__t">Letter verified</div>' +
      '<p class="vf-sub">This letter was issued by PTDIKA and the name matches.</p>' +
      '</div>' +
      '<div class="kv">' +
      kv('Letter type', esc(l.letter_type)) +
      kv('Issued at', dt(l.issued_at) + ' <span class="cell-dim">Asia/Jakarta</span>') +
      kv('Letter state', D.enumBadge(l.letter_state)) +
      (cancelled ? kv('Cancelled at', dt(l.cancelled_at) + ' <span class="cell-dim">Asia/Jakarta</span>') : '') +
      '</div>' +
      '<div class="doc-note">' +
      '<div class="doc-note__h"><i data-lucide="eye-off"></i>' + (cancelled ? 'Cancelled — and that is all you get' : 'Four fields, and only four') + '</div>' +
      '<p>' + (cancelled
        ? 'The same shape as a valid letter plus <code>cancelled_at</code> — not a new shape. The <strong>cancellation reason is forbidden</strong> on this page; it exists only inside the HRIS.'
        : 'Letter type, issue date and state. The original sheet, the subject’s data and the document itself are never handed over.') +
      '</p></div>';
  }
  function shape2() {
    return '<div class="vf-res">' +
      '<div class="vf-res__ic vf-res__ic--no"><i data-lucide="circle-slash"></i></div>' +
      '<div class="vf-res__t">No match</div>' +
      '<p class="vf-sub"><code>{ "matched": false }</code> — and not a single other field.</p>' +
      '</div>' +
      '<div class="doc-note"><div class="doc-note__h"><i data-lucide="equal"></i>Five causes, one answer</div>' +
      '<p>The key never existed · it belongs to another company · the letter is not issued yet · the number belongs to an <code>EDARAN</code> letter · the name does not match. This page cannot tell you which — by design, and no <code>404</code> is ever used.</p></div>';
  }
  function kv(k, v) { return '<div class="kv__k">' + k + '</div><div class="kv__v">' + v + '</div>'; }

  function show(html) {
    $('vfResult').innerHTML = html +
      '<button class="btn btn--secondary" id="vfBack" style="height:40px">Verify another letter</button>';
    $('vfForm').style.display = 'none';
    $('vfResult').style.display = 'flex';
    $('vfBack').addEventListener('click', function () {
      $('vfResult').style.display = 'none';
      $('vfForm').style.display = 'flex';
    });
    if (window.lucide) window.lucide.createIcons();
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('vfMode').addEventListener('click', function (e) {
      var tab = e.target.closest('.vf-tab');
      if (!tab) return;
      this.querySelectorAll('.vf-tab').forEach(function (t) { t.classList.toggle('is-on', t === tab); });
      mode = tab.getAttribute('data-val');
      $('vfCodePane').style.display = mode === 'code' ? 'flex' : 'none';
      $('vfNoPane').style.display = mode === 'no' ? 'flex' : 'none';
    });

    $('vfCheck').addEventListener('click', function () {
      var name = ($('vfName').value || '').trim();
      if (name.length < 2) { F.toast('422 \u2014 the name on the letter is required (2\u2013100 characters).', 'err'); return; }
      var hit = null;
      if (mode === 'code') {
        var code = ($('vfCode').value || '').trim().toUpperCase();
        D.LETTERS.forEach(function (l) {
          if (l.verification_code === code && l.subject.nama.toLowerCase() === name.toLowerCase()) hit = l;
        });
      } else {
        var no = ($('vfNo').value || '').trim();
        if (no.length < 2) { F.toast('422 \u2014 the letter number is required (2\u201360 characters).', 'err'); return; }
        D.LETTERS.forEach(function (l) {
          // A circular's number lands on the same blind "no match" as every other cause.
          if (l.letter_target === 'EDARAN') return;
          if (l.letter_no === no && l.subject.nama.toLowerCase() === name.toLowerCase()) hit = l;
        });
      }
      show(hit ? shape1(hit) : shape2());
    });
  });
})();
