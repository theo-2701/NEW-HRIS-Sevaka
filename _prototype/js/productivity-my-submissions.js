// productivity-my-submissions.js — My Submissions: self surface (F4.09–F4.13, F4.16)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var ME = 'DEDI', cur = null;

  function grantedToMe(f) {
    return (f.grants || []).some(function (g) { return g.target === ME; });
  }
  function distributions() {
    // identified forms that are open — or closed but reopened for me by a per-person window grant.
    // Anonymous forms never enter this list: there is no "my status" to show for them.
    return D.FORMS.filter(function (f) {
      return f.identity_mode === 'BER_IDENTITAS' && (f.state === 'TERBUKA' || grantedToMe(f));
    });
  }
  function mySub(formCode) {
    return D.MY_SUBMISSIONS.filter(function (s) { return s.form === formCode; })[0] || null;
  }

  function draw() {
    var list = distributions();
    document.getElementById('msCount').textContent = list.length;
    document.getElementById('msBody').innerHTML = list.map(function (f) {
      var s = mySub(f.code);
      var late = f.response_due_date && f.response_due_date < '2026-08-13' && !(s && s.already_submitted);
      return '<tr><td class="cell-strong">' + f.form_title + '<br><span class="cell-dim" style="font-weight:500">' + f.code + '</span></td>' +
        '<td>' + D.badge(f.obligation === 'WAJIB' ? 'orange' : 'grey', f.obligation) + '</td>' +
        '<td>' + (f.response_due_date ? D.stampDate(f.response_due_date) + (late ? ' <span class="pv-tag">PASSED</span>' : '') : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + (s && s.already_submitted ? D.badge('green', 'SUBMITTED') : D.badge('amber', 'NOT SUBMITTED')) +
          (f.state === 'DITUTUP' && grantedToMe(f) ? ' ' + D.badge('blue', 'WINDOW GRANTED') : '') + '</td>' +
        '<td>' + (s && s.submitted_at ? D.stampTime(s.submitted_at) : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r"><div class="rowacts"><button class="rowbtn" type="button" data-open="' + f.code + '">' + (s && s.already_submitted ? 'Edit answers' : 'Fill in') + '</button></div></td></tr>';
    }).join('');
    if (window.lucide) window.lucide.createIcons();
  }

  function fieldFor(item, i) {
    var t = item.question_type_snapshot;
    var label = '<label class="fld__label">' + item.question_text_snapshot + '</label>';
    if (t === 'PILIHAN_SATU' || t === 'PILIHAN_BANYAK') {
      return '<div class="fld">' + label +
        D.selectHTML('meQ' + i, item.answer_value || 'Select an option', (item.question_choices_snapshot || []).map(function (c) { return D.opt(c); })) +
        '<span class="fld__hint">' + t + ' · frozen question copy</span></div>';
    }
    if (t === 'ANGKA') return '<div class="fld">' + label + '<div class="ctl"><input type="number" data-ans="' + i + '" value="' + (item.answer_value || '') + '"></div></div>';
    if (t === 'TANGGAL') return '<div class="fld">' + label + '<div class="ctl ctl--date"><input type="date" data-ans="' + i + '" data-iso="' + (item.answer_value || '') + '">' +
      '<svg class="ctl__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div></div>';
    return '<div class="fld">' + label + '<div class="ctl ctl--area"><textarea rows="2" data-ans="' + i + '">' + (item.answer_value || '') + '</textarea></div></div>';
  }

  function openMine(formCode) {
    var f = D.byCode(D.FORMS, formCode);
    if (f.state !== 'TERBUKA' && !grantedToMe(f)) {
      F.toast('403 PROD_WINDOW_GRANT_REQUIRED — this form is closed. Writing needs a window opened for you by HR.', 'danger');
      return;
    }
    cur = mySub(formCode);
    if (!cur) {
      cur = {
        code: 'SUB-000' + (D.MY_SUBMISSIONS.length + 1), form: formCode, already_submitted: false, window_granted: false, submitted_at: null,
        items: f.questions.map(function (q) {
          return { question_text_snapshot: q.question_text, question_type_snapshot: q.question_type, question_choices_snapshot: q.question_choices, answer_value: '' };
        }), changes: []
      };
      D.MY_SUBMISSIONS.push(cur);
    }
    document.getElementById('meTitle').textContent = f.form_title;
    document.getElementById('meBody').innerHTML = cur.items.map(fieldFor).join('');
    cur.items.forEach(function (item, i) {
      var c = document.getElementById('meQ' + i);
      if (c) {
        var v = c.querySelector('.ctl__value');
        if (item.answer_value) { v.textContent = item.answer_value; v.style.color = 'var(--fg-1)'; }
        c.addEventListener('select', function (e) { c.dataset.pick = e.detail.value; });
      }
    });
    document.getElementById('meHist').innerHTML = (cur.changes || []).length ? cur.changes.map(function (r) {
      return '<div class="pv-row"><span class="pv-row__k">' + D.stampTime(r.created_at) + '</span>' +
        '<span class="pv-row__v">' + r.old_value + ' → ' + r.new_value + '</span></div>';
    }).join('') : '<div class="pv-row"><span class="pv-row__k">No edit yet</span><span class="pv-row__v">This log carries no reason column.</span></div>';
    F.wireSelects(document.getElementById('msEdit'));
    F.setupDates(document.getElementById('msEdit'));
    F.openModal('msEdit');
  }

  document.getElementById('meSave').addEventListener('click', function () {
    var changed = 0;
    cur.items.forEach(function (item, i) {
      var c = document.getElementById('meQ' + i), val;
      if (c) val = c.dataset.pick || item.answer_value;
      else {
        var el = document.querySelector('#meBody [data-ans="' + i + '"]');
        val = el ? (el.dataset.iso || el.value) : item.answer_value;
      }
      if (val !== item.answer_value) {
        (cur.changes || (cur.changes = [])).unshift({ changed_field: 'answer_value', old_value: item.answer_value || '(empty)', new_value: val, created_at: '2026-08-13T11:00:00+07:00' });
        item.answer_value = val;
        changed++;
      }
    });
    var first = !cur.already_submitted;
    if (first) { cur.already_submitted = true; cur.submitted_at = '2026-08-13T11:00:00+07:00'; }
    var f = D.byCode(D.FORMS, cur.form);
    if (first) f.submission_count += 1;
    F.closeModal('msEdit'); draw();
    F.toast(first ? '201 Created — answers submitted.' :
      (changed ? '200 OK — ' + changed + ' item(s) rewritten; submitted_at unchanged.' : '200 OK — nothing changed, so nothing was logged.'),
      changed || first ? 'ok' : 'info');
  });

  document.getElementById('msBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-open]');
    if (b) openMine(b.getAttribute('data-open'));
  });

  // ---------- anonymous fill (kept outside the list) ----------
  var anonForm = D.FORMS.filter(function (f) { return f.identity_mode === 'ANONIM'; })[0];
  if (anonForm) document.getElementById('anTitle').textContent = anonForm.form_title;
  document.getElementById('anOpen').addEventListener('click', function () {
    document.getElementById('maTitle').textContent = anonForm.form_title;
    document.getElementById('maBody').innerHTML = anonForm.questions.map(function (q, i) {
      if (q.question_type === 'PILIHAN_SATU' || q.question_type === 'PILIHAN_BANYAK') {
        return '<div class="fld"><label class="fld__label">' + q.question_text + '</label>' +
          D.selectHTML('maQ' + i, 'Select an option', q.question_choices.map(function (c) { return D.opt(c); })) +
          '<span class="fld__hint">' + q.question_type + '</span></div>';
      }
      return '<div class="fld"><label class="fld__label">' + q.question_text + '</label><div class="ctl ctl--area"><textarea rows="2"></textarea></div></div>';
    }).join('');
    F.wireSelects(document.getElementById('msAnon'));
    F.openModal('msAnon');
  });
  document.getElementById('maSend').addEventListener('click', function () {
    (anonForm.submissions || (anonForm.submissions = [])).unshift({ code: null, respondent: null, submitted_at: '2026-08-13T11:10:00+07:00', item_count: anonForm.questions.length });
    anonForm.submission_count += 1;
    F.closeModal('msAnon');
    F.toast('201 Created — sent anonymously. No respondent is stored, and it cannot be edited.', 'ok');
  });

  draw();
  if (window.lucide) window.lucide.createIcons();
})();
