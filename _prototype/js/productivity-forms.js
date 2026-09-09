// productivity-forms.js — Forms: composer + HR reading surfaces (F4.01–F4.20)
(function () {
  'use strict';
  var F = window.Flow, D = window.PROD;
  var persona = 'HESTI';                        // HESTI = HR Manager · SARI = HR Staff · RINA = Dept Manager
  var pg = F.pager('pgFm', 10, redraw, 'forms');
  var QTYPES = ['PILIHAN_SATU', 'PILIHAN_BANYAK', 'ISIAN_TEKS', 'ANGKA', 'TANGGAL'];
  var TODAY = '2026-08-13';
  function isChoice(t) { return t === 'PILIHAN_SATU' || t === 'PILIHAN_BANYAK'; }
  function esc(s) { return String(s).replace(/"/g, '&quot;'); }
  function isHR() { return persona === 'HESTI' || persona === 'SARI'; }
  function isManagerHR() { return persona === 'HESTI'; }

  function regime() {
    document.getElementById('fmNewBtn').style.display = isManagerHR() ? '' : 'none';
    document.getElementById('fmRegimeMsg').innerHTML =
      persona === 'HESTI' ? 'HR Manager — you compose, edit and close forms, read raw answers, monitor compliance and open per-person windows.'
      : persona === 'SARI' ? 'HR Staff — you <strong>read</strong> answers on non-sensitive forms. Composing, editing and closing belong to the HR Manager; a sensitive form is closed to you entirely.'
      : 'Dept Manager — <strong>aggregate only</strong>. Raw answers and the compliance list are closed to you; a sensitive form has no aggregate at all.';
    redraw();
  }

  document.getElementById('fmPersona').addEventListener('click', function (e) {
    var b = e.target.closest('[data-persona]');
    if (!b) return;
    this.querySelectorAll('[data-persona]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    persona = b.getAttribute('data-persona');
    regime();
    F.toast('Acting as ' + D.empName(persona) + ' (' + D.EMP[persona].role + ').', 'info');
  });

  // ---------------- filter (F4.04) + free-text search above the grid ----------------
  var flt = { title: '', state: '', obligation: '', identity: '', audience: '', sensitive: '' };
  document.getElementById('fmSrch').addEventListener('input', function () { flt.title = this.value.trim(); pg.reset(); redraw(); });
  [['ffState', 'state'], ['ffOb', 'obligation'], ['ffId', 'identity'], ['ffAud', 'audience'], ['ffSens', 'sensitive']].forEach(function (p) {
    var el = document.getElementById(p[0]);
    el.addEventListener('select', function (e) { flt[p[1]] = e.detail.value; pg.reset(); redraw(); });
  });
  document.getElementById('ffReset').addEventListener('click', function () {
    flt.state = flt.obligation = flt.identity = flt.audience = flt.sensitive = '';
    ['ffState', 'ffOb', 'ffId', 'ffAud', 'ffSens'].forEach(function (id) {
      var c = document.getElementById(id), v = c.querySelector('.ctl__value');
      v.textContent = 'Any'; v.style.color = 'var(--fg-4)';
      c.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
    });
    pg.reset(); redraw();
  });
  function match(f) {
    if (flt.title && f.form_title.toLowerCase().indexOf(flt.title.toLowerCase()) < 0) return false;
    if (flt.state && f.state !== flt.state) return false;
    if (flt.obligation && f.obligation !== flt.obligation) return false;
    if (flt.identity && f.identity_mode !== flt.identity) return false;
    if (flt.audience && f.audience_scope !== flt.audience) return false;
    if (flt.sensitive !== '' && String(f.is_sensitive ? 1 : 0) !== flt.sensitive) return false;
    return true;
  }

  // ---------------- row actions ----------------
  function actions(f) {
    var anon = f.identity_mode === 'ANONIM';
    if (persona === 'RINA') {
      return f.is_sensitive
        ? '<div class="rowacts"><button class="rowbtn" type="button" disabled title="A sensitive form has no aggregate surface">Aggregate</button></div>'
        : '<div class="rowacts"><button class="rowbtn" type="button" data-agg="' + f.code + '">Aggregate</button></div>';
    }
    var items = [];
    items.push(anon ? { label: 'Anonymous view', icon: 'eye-off', attr: 'data-anon="' + f.code + '"' }
                    : { label: 'View Detail', icon: 'list', attr: 'data-detail="' + f.code + '"' });
    if (!f.is_sensitive) items.push({ label: 'Aggregate', icon: 'bar-chart-3', attr: 'data-agg="' + f.code + '"' });
    if (isManagerHR()) {
      items.push({ label: 'Edit form', icon: 'pencil', attr: 'data-edit="' + f.code + '"' });
      if (f.state === 'TERBUKA') items.push({ label: 'Close form', icon: 'lock', attr: 'data-close-form="' + f.code + '"' });
      items.push({ label: 'Delete form', icon: 'trash-2', attr: 'data-del="' + f.code + '"', danger: true });
    }
    if (items.length === 1) {
      var only = items[0];
      return '<div class="rowacts"><button class="rowbtn" type="button" ' + only.attr + '>' + only.label + '</button></div>';
    }
    return '<div class="rowacts">' + F.rowMenu(items) + '</div>';
  }

  function redraw() {
    var all = D.FORMS.filter(match), view = pg.slice(all);
    document.getElementById('fmBody').innerHTML = view.length ? view.map(function (f) {
      return '<tr><td class="cell-strong">' + f.form_title + '<br><span class="cell-dim" style="font-weight:500">' + f.code + '</span></td>' +
        '<td>' + D.badge(f.obligation === 'WAJIB' ? 'orange' : 'grey', f.obligation) + '</td>' +
        '<td>' + D.badge(f.identity_mode === 'ANONIM' ? 'indigo' : 'blue', f.identity_mode) + '</td>' +
        '<td>' + f.audience_scope + (f.audience_positions.length ? '<br><span class="cell-dim">' + f.audience_positions.join(', ') + '</span>' : '') + '</td>' +
        '<td>' + (f.is_sensitive ? D.badge('red', 'SENSITIVE') : '<span class="cell-dim">no</span>') + '</td>' +
        '<td>' + (f.response_due_date ? D.stampDate(f.response_due_date) : '<span class="cell-dim">—</span>') + '</td>' +
        '<td>' + D.badge(f.state === 'TERBUKA' ? 'green' : 'grey', f.state) + '</td>' +
        '<td class="ta-c">' + f.submission_count + '</td>' +
        '<td class="ta-r">' + actions(f) + '</td></tr>';
    }).join('') : '<tr><td colspan="9"><div class="muted-empty">No form matches this filter.</div></td></tr>';
    pg.paint();
    if (window.lucide) window.lucide.createIcons();
  }

  // ---------------- composer ----------------
  var nf = { identity: 'BER_IDENTITAS', obligation: 'SUKARELA', scope: 'SELURUH_KARYAWAN', positions: [], sensitive: 0, questions: [{ type: 'ISIAN_TEKS', text: '', choices: [] }] };

  // multi-select position picker: audience_position_ids is an array, so the control is too
  function wireMultiPos(id, get) {
    document.getElementById(id).addEventListener('change', function (e) {
      var c = e.target.closest('input[type=checkbox]');
      if (!c) return;
      var list = get(), at = list.indexOf(c.value);
      if (c.checked && at < 0) list.push(c.value);
      if (!c.checked && at > -1) list.splice(at, 1);
      nfSync();
    });
  }
  function paintMultiPos(id, list) {
    document.getElementById(id).querySelectorAll('input[type=checkbox]').forEach(function (c) { c.checked = list.indexOf(c.value) > -1; });
  }
  function radioWire(id, obj, key, after) {
    document.getElementById(id).addEventListener('change', function (e) {
      var r = e.target.closest('input[type=radio]');
      if (!r) return;
      obj()[key] = key === 'sensitive' ? +r.value : r.value;
      if (after) after();
    });
  }
  function radioSet(id, val) {
    document.getElementById(id).querySelectorAll('input[type=radio]').forEach(function (r) { r.checked = r.value === String(val); });
  }
  function radioLock(id, locked, onlyValue) {
    document.getElementById(id).querySelectorAll('input[type=radio]').forEach(function (r) {
      var lock = locked && (onlyValue === undefined || r.value === String(onlyValue));
      r.disabled = lock;
      r.closest('.radio').style.opacity = lock && !r.checked ? '.45' : '';
    });
  }

  function drawQuestions() {
    document.getElementById('nfQCount').textContent = nf.questions.length;
    document.getElementById('nfQuestions').innerHTML = nf.questions.map(function (q, i) {
      return '<div class="pv-qcard">' +
        '<div class="pv-qcard__head"><span class="pv-qcard__n">Question ' + (i + 1) + '</span><span class="pv-qcard__sp"></span>' +
          '<button class="pv-del" type="button" data-qdel="' + i + '" aria-label="Remove question">&times;</button></div>' +
        '<div class="pv-qcard__grid">' +
          '<div class="fld"><label class="fld__label">Question <span class="req">*</span></label><div class="ctl"><input type="text" data-qtext="' + i + '" value="' + esc(q.text || '') + '" placeholder="Question text"></div></div>' +
          '<div class="fld"><label class="fld__label">Answer type</label>' +
            D.selectHTML('nfQT' + i, q.type, QTYPES.map(function (t) { return D.opt(t); })).replace('style="color:var(--fg-4)"', '') + '</div>' +
        '</div>' +
        (isChoice(q.type) ? '<div class="pv-qcard__opts"><label class="fld__label">Options <span class="req">*</span></label>' +
          '<div style="margin-top:6px">' + q.choices.map(function (c, j) {
            return '<div class="pv-optrow"><span class="pv-optrow__n">' + (j + 1) + '</span>' +
              '<div class="ctl" style="flex:1"><input type="text" data-qopt="' + i + '.' + j + '" value="' + esc(c) + '" placeholder="Option"></div>' +
              '<button class="pv-del" type="button" data-qoptdel="' + i + '.' + j + '" aria-label="Remove option">&times;</button></div>';
          }).join('') + '</div>' +
          '<button class="add-filter" type="button" data-qoptadd="' + i + '" style="margin-top:10px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>Add option</button>' +
          '<span class="fld__hint">A choice question with no option is refused — <code>ck_mst_form_question_choices_required</code>.</span></div>' : '') +
        '</div>';
    }).join('');
    var root = document.getElementById('nfQuestions');
    nf.questions.forEach(function (q, i) {
      var c = document.getElementById('nfQT' + i);
      c.querySelector('.ctl__value').textContent = q.type;
      c.addEventListener('select', function (e) {
        var qq = nf.questions[i];
        qq.type = e.detail.value;
        if (isChoice(qq.type) && !qq.choices.length) qq.choices = ['', ''];
        if (!isChoice(qq.type)) qq.choices = [];
        drawQuestions();
      });
    });
    F.wireSelects(root);
    root.querySelectorAll('[data-qtext]').forEach(function (i) {
      i.addEventListener('input', function () { nf.questions[+i.getAttribute('data-qtext')].text = i.value; nfSync(); });
    });
    root.querySelectorAll('[data-qopt]').forEach(function (i) {
      i.addEventListener('input', function () {
        var p = i.getAttribute('data-qopt').split('.');
        nf.questions[+p[0]].choices[+p[1]] = i.value; nfSync();
      });
    });
    root.querySelectorAll('[data-qoptdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-qoptdel').split('.'), q = nf.questions[+p[0]];
        if (q.choices.length === 1) { F.toast('A choice question keeps at least one option.', 'warn'); return; }
        q.choices.splice(+p[1], 1); drawQuestions();
      });
    });
    root.querySelectorAll('[data-qoptadd]').forEach(function (b) {
      b.addEventListener('click', function () { nf.questions[+b.getAttribute('data-qoptadd')].choices.push(''); drawQuestions(); });
    });
    root.querySelectorAll('[data-qdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (nf.questions.length === 1) { F.toast('A form needs at least one question.', 'warn'); return; }
        nf.questions.splice(+b.getAttribute('data-qdel'), 1); drawQuestions();
      });
    });
    nfSync();
  }

  function nfSync() {
    var ok = !!document.getElementById('nfTitle').value.trim();
    nf.questions.forEach(function (q) {
      if (!q.text.trim()) ok = false;
      if (isChoice(q.type) && !q.choices.filter(function (c) { return c.trim(); }).length) ok = false;
    });
    if (nf.scope === 'PER_BAGIAN' && !nf.positions.length) ok = false;
    if (nf.obligation === 'WAJIB' && !document.getElementById('nfDue').dataset.iso) ok = false;
    if (nf.sensitive && !document.getElementById('nfRet').value) ok = false;
    document.getElementById('nfSave').disabled = !ok;
  }

  function applyConditionals() {
    document.getElementById('nfDueFld').style.display = nf.obligation === 'WAJIB' ? '' : 'none';
    document.getElementById('nfRetFld').style.display = nf.sensitive ? '' : 'none';
    document.getElementById('nfPosFld').style.display = nf.scope === 'PER_BAGIAN' ? '' : 'none';
    document.getElementById('nfGateNote').style.display = nf.identity === 'ANONIM' ? '' : 'none';
    radioLock('nfObligation', nf.identity === 'ANONIM', 'WAJIB');
    document.getElementById('nfObHint').textContent = nf.identity === 'ANONIM'
      ? 'Locked to SUKARELA while the form is anonymous.'
      : 'Mandatory forms require a response due date.';
    nfSync();
  }

  function nfObj() { return nf; }
  radioWire('nfIdentity', nfObj, 'identity', function () {
    if (nf.identity === 'ANONIM' && nf.obligation === 'WAJIB') {
      nf.obligation = 'SUKARELA';
      radioSet('nfObligation', 'SUKARELA');
      F.toast('Obligation forced to SUKARELA — an anonymous form can never be mandatory.', 'warn');
    }
    applyConditionals();
  });
  radioWire('nfObligation', nfObj, 'obligation', applyConditionals);
  radioWire('nfSensitive', nfObj, 'sensitive', applyConditionals);
  document.getElementById('nfScope').addEventListener('select', function (e) { nf.scope = e.detail.value; applyConditionals(); });
  wireMultiPos('nfPos', function () { return nf.positions; });
  document.getElementById('nfTitle').addEventListener('input', nfSync);
  document.getElementById('nfDue').addEventListener('datechange', nfSync);
  document.getElementById('nfRet').addEventListener('input', nfSync);
  document.getElementById('nfAddQ').addEventListener('click', function () {
    nf.questions.push({ type: 'ISIAN_TEKS', text: '', choices: [] });
    drawQuestions();
  });

  document.getElementById('fmNewBtn').addEventListener('click', function () {
    nf = { identity: 'BER_IDENTITAS', obligation: 'SUKARELA', scope: 'SELURUH_KARYAWAN', positions: [], sensitive: 0, questions: [{ type: 'ISIAN_TEKS', text: '', choices: [] }] };
    paintMultiPos('nfPos', nf.positions);
    document.getElementById('nfTitle').value = '';
    document.getElementById('nfRet').value = '';
    F.setDate('nfDue', '');
    radioSet('nfIdentity', 'BER_IDENTITAS'); radioSet('nfObligation', 'SUKARELA'); radioSet('nfSensitive', '0');
    document.getElementById('nfScope').querySelector('.ctl__value').textContent = 'SELURUH_KARYAWAN';
    drawQuestions(); applyConditionals();
    F.openModal('fmForm');
  });

  document.getElementById('nfSave').addEventListener('click', function () {
    var n = D.FORMS.length + 1;
    D.FORMS.push({
      code: 'FRM-' + ('000' + n).slice(-4), form_title: document.getElementById('nfTitle').value.trim(),
      identity_mode: nf.identity, obligation: nf.obligation, audience_scope: nf.scope,
      audience_positions: nf.scope === 'PER_BAGIAN' ? nf.positions.slice() : [], is_sensitive: !!nf.sensitive,
      response_due_date: nf.obligation === 'WAJIB' ? document.getElementById('nfDue').dataset.iso : null,
      retention_months: nf.sensitive ? +document.getElementById('nfRet').value : null,
      state: 'TERBUKA', submission_count: 0, attributes_locked: false, created_at: TODAY,
      affordance: nf.identity === 'ANONIM' ? 'ANON' : 'DETAIL',
      questions: nf.questions.map(function (q, i) {
        return { order: i + 1, question_type: q.type, question_text: q.text.trim(), question_choices: q.choices.map(function (s) { return s.trim(); }).filter(Boolean) };
      }),
      submissions: [], pending: [], grants: [], respondent_count: 0, aggregate: []
    });
    F.closeModal('fmForm'); pg.reset(); redraw();
    F.toast('201 Created — form saved as TERBUKA, one notification per targeted person.', 'ok');
  });

  // ---------------- edit form (F4.03) ----------------
  var ef = null, efForm = null;
  function efConditionals() {
    var locked = efForm.submission_count > 0;
    document.getElementById('efLockNote').style.display = locked ? '' : 'none';
    document.getElementById('efDueFld').style.display = ef.obligation === 'WAJIB' ? '' : 'none';
    document.getElementById('efRetFld').style.display = ef.sensitive ? '' : 'none';
    document.getElementById('efPosFld').style.display = ef.scope === 'PER_BAGIAN' ? '' : 'none';
    radioLock('efIdentity', locked);
    radioLock('efSensitive', locked);
    radioLock('efObligation', ef.identity === 'ANONIM', 'WAJIB');
    document.getElementById('efObHint').textContent = ef.identity === 'ANONIM'
      ? 'Locked to SUKARELA while the form is anonymous.' : 'Mandatory forms require a response due date.';
  }
  function efObj() { return ef; }
  radioWire('efIdentity', efObj, 'identity', efConditionals);
  radioWire('efObligation', efObj, 'obligation', efConditionals);
  radioWire('efSensitive', efObj, 'sensitive', efConditionals);
  document.getElementById('efScope').addEventListener('select', function (e) { ef.scope = e.detail.value; efConditionals(); });
  wireMultiPos('efPos', function () { return ef.positions; });

  function openEdit(f) {
    efForm = f;
    ef = { identity: f.identity_mode, obligation: f.obligation, scope: f.audience_scope, positions: (f.audience_positions || []).slice(), sensitive: f.is_sensitive ? 1 : 0 };
    document.getElementById('efHeading').textContent = 'Edit — ' + f.form_title;
    document.getElementById('efTitle').value = f.form_title;
    document.getElementById('efRet').value = f.retention_months || '';
    F.setDate('efDue', f.response_due_date || '');
    var pairs = [['efIdentity', ef.identity], ['efObligation', ef.obligation], ['efSensitive', String(ef.sensitive)]];
    pairs.forEach(function (p) { radioSet(p[0], p[1]); });
    var sc = document.getElementById('efScope').querySelector('.ctl__value'); sc.textContent = ef.scope; sc.style.color = 'var(--fg-1)';
    paintMultiPos('efPos', ef.positions);
    efConditionals();
    F.openModal('fmEdit');
  }
  document.getElementById('efSave').addEventListener('click', function () {
    var title = document.getElementById('efTitle').value.trim();
    if (!title) { F.toast('A form title is required.', 'warn'); return; }
    if (ef.scope === 'PER_BAGIAN' && !ef.positions.length) { F.toast('422 VALIDATION_ERROR — ck_mst_form_audience_target: a per-section form needs its positions.', 'danger'); return; }
    if (ef.obligation === 'WAJIB' && !document.getElementById('efDue').dataset.iso) { F.toast('422 VALIDATION_ERROR — ck_mst_form_due_date_required.', 'danger'); return; }
    if (ef.sensitive && !document.getElementById('efRet').value) { F.toast('422 VALIDATION_ERROR — ck_mst_form_retention_required.', 'danger'); return; }
    efForm.form_title = title;
    efForm.identity_mode = ef.identity;
    efForm.obligation = ef.obligation;
    efForm.audience_scope = ef.scope;
    efForm.audience_positions = ef.scope === 'PER_BAGIAN' ? ef.positions.slice() : [];
    efForm.is_sensitive = !!ef.sensitive;
    efForm.response_due_date = ef.obligation === 'WAJIB' ? document.getElementById('efDue').dataset.iso : null;
    efForm.retention_months = ef.sensitive ? +document.getElementById('efRet').value : null;
    F.closeModal('fmEdit'); redraw();
    F.toast('200 OK — form updated.', 'ok');
  });

  // ---------------- detail (4 panels) ----------------
  var cur = null;
  document.getElementById('fgEmpDD').innerHTML = Object.keys(D.EMP).map(function (k) { return D.opt(k, D.EMP[k].name); }).join('');
  var grantEmp = '';
  document.getElementById('fgEmp').addEventListener('select', function (e) { grantEmp = e.detail.value; });

  function drawQPanel() {
    document.getElementById('fdQCount').textContent = cur.questions.length;
    document.getElementById('fdQAdd').style.display = isManagerHR() ? '' : 'none';
    document.getElementById('fdGrantOpen').style.display = isHR() ? '' : 'none';
    document.getElementById('fdQBody').innerHTML = cur.questions.map(function (q, i) {
      var acts = isManagerHR()
        ? '<div class="rowacts">' + F.rowMenu([
            { label: 'Edit question', icon: 'pencil', attr: 'data-qedit="' + i + '"' },
            { label: 'Delete question', icon: 'trash-2', attr: 'data-qdrop="' + i + '"', danger: true }
          ]) + '</div>'
        : '<div class="rowacts"><button class="rowbtn" type="button" disabled title="HR Manager only">HR Manager only</button></div>';
      return '<tr><td class="cell-dim">' + q.order + '</td><td class="cell-strong">' + q.question_text + '</td>' +
        '<td>' + D.badge('grey', q.question_type) + '</td>' +
        '<td>' + (q.question_choices.length ? q.question_choices.join(' · ') : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r">' + acts + '</td></tr>';
    }).join('');
  }

  function drawDetail() {
    document.getElementById('fdTitle').textContent = cur.form_title;
    drawQPanel();
    var subs = cur.submissions || [];
    document.getElementById('fdABody').innerHTML = subs.length ? subs.map(function (s) {
      var acts = s.code ? '<div class="rowacts"><button class="rowbtn" type="button" data-sub="' + s.code + '">View Detail</button></div>'
        : '<div class="rowacts"><button class="rowbtn" type="button" disabled title="Anonymous submissions carry no per-record surface">View Detail</button></div>';
      return '<tr><td class="cell-dim">' + (s.code || '—') + '</td><td class="cell-strong">' + (s.respondent ? D.empName(s.respondent) : '<span class="pv-tag">ANONYMOUS</span>') + '</td>' +
        '<td>' + D.stampTime(s.submitted_at) + '</td><td class="ta-c">' + s.item_count + '</td>' +
        '<td class="ta-r">' + acts + '</td></tr>';
    }).join('') : '<tr><td colspan="5"><div class="muted-empty">No answer has come in yet.</div></td></tr>';
    var pend = cur.pending || [];
    document.getElementById('fdPBody').innerHTML = cur.obligation === 'WAJIB' && cur.identity_mode === 'BER_IDENTITAS'
      ? (pend.length ? pend.map(function (p) { return '<tr><td class="cell-strong">' + D.empName(p.emp) + '</td><td>' + D.EMP[p.emp].position + '</td></tr>'; }).join('')
        : '<tr><td colspan="2"><div class="muted-empty">Everyone targeted has answered.</div></td></tr>')
      : '<tr><td colspan="2"><div class="muted-empty">Not applicable — this list only exists for an identified, mandatory form.</div></td></tr>';
    document.getElementById('fgGrant').style.display = isManagerHR() ? '' : 'none';
    drawGrants();
  }
  function drawGrants() {
    var g = cur.grants || [];
    document.getElementById('fdGBody').innerHTML = g.length ? g.map(function (r) {
      return '<tr><td class="cell-strong">' + D.empName(r.target) + '</td><td>' + r.grant_reason + '</td>' +
        '<td>' + D.empName(r.granted_by) + '</td><td>' + D.stampTime(r.granted_at) + '</td></tr>';
    }).join('') : '<tr><td colspan="4"><div class="muted-empty">No window has been opened for this form.</div></td></tr>';
  }

  document.getElementById('fdGrantOpen').addEventListener('click', function () {
    if (cur.identity_mode === 'ANONIM') { F.toast('422 PROD_FORM_ANONYMOUS_IMMUTABLE — an anonymous form takes no window grant: there is no identity to reopen it for.', 'danger'); return; }
    document.getElementById('fgHeading').textContent = 'Reopen window — ' + cur.form_title;
    drawGrants();
    F.openModal('fmGrant');
    if (window.lucide) window.lucide.createIcons();
  });

  document.getElementById('fgGrant').addEventListener('click', function () {
    var reason = document.getElementById('fgReason').value.trim();
    if (cur.identity_mode === 'ANONIM') { F.toast('422 PROD_FORM_ANONYMOUS_IMMUTABLE — an anonymous form takes no window grant.', 'danger'); return; }
    if (!grantEmp || !reason) { F.toast('Employee and reason are both required.', 'warn'); return; }
    (cur.grants || (cur.grants = [])).unshift({ target: grantEmp, grant_reason: reason, granted_by: persona, granted_at: TODAY + 'T10:30:00+07:00' });
    document.getElementById('fgReason').value = '';
    drawGrants();
    F.toast('201 Created — window opened for ' + D.empName(grantEmp) + '. Only they may write their answers.', 'ok');
  });

  // ---------------- question add/edit (F4.06–F4.08) ----------------
  var qmIdx = -1, qmType = 'ISIAN_TEKS', qmChoices = [];
  function drawOpts() {
    document.getElementById('qmOpts').innerHTML = qmChoices.map(function (c, i) {
      return '<div style="display:flex;align-items:center;gap:8px"><span class="cell-dim" style="width:14px">' + (i + 1) + '</span>' +
        '<div class="ctl" style="flex:1"><input type="text" data-opt="' + i + '" value="' + esc(c) + '" placeholder="Option"></div>' +
        '<button class="pv-del" type="button" data-optdel="' + i + '" aria-label="Remove option">&times;</button></div>';
    }).join('');
    document.getElementById('qmOpts').querySelectorAll('[data-opt]').forEach(function (i) {
      i.addEventListener('input', function () { qmChoices[+i.getAttribute('data-opt')] = i.value; drawPreview(); });
    });
    document.getElementById('qmOpts').querySelectorAll('[data-optdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (qmChoices.length === 1) { F.toast('A choice question keeps at least one option.', 'warn'); return; }
        qmChoices.splice(+b.getAttribute('data-optdel'), 1); drawOpts();
      });
    });
    drawPreview();
  }
  function drawPreview() {
    var txt = document.getElementById('qmText').value.trim() || '[Question]', body;
    if (isChoice(qmType)) {
      var single = qmType === 'PILIHAN_SATU';
      body = '<div style="display:flex;flex-direction:column;gap:9px;margin-top:6px">' + qmChoices.map(function (c, i) {
        return single
          ? '<label class="radio"><input type="radio" name="qmPrev" disabled><span class="radio__dot"></span>' + (c.trim() || 'Option ' + (i + 1)) + '</label>'
          : '<label class="checkbox"><input type="checkbox" disabled><span class="checkbox__box"></span>' + (c.trim() || 'Option ' + (i + 1)) + '</label>';
      }).join('') + '</div>' + (single ? '' : '<span class="fld__hint">Choose as many as you like.</span>');
    } else if (qmType === 'ANGKA') {
      body = '<div class="ctl"><input type="number" placeholder="0" disabled></div>';
    } else if (qmType === 'TANGGAL') {
      body = '<div class="ctl ctl--date"><input type="text" placeholder="Select date" disabled>' +
        '<svg class="ctl__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>';
    } else {
      body = '<div class="ctl ctl--area"><textarea rows="2" placeholder="Your answer" disabled></textarea></div>';
    }
    document.getElementById('qmPreview').innerHTML = '<div class="fld" style="pointer-events:none"><label class="fld__label">' + txt + '</label>' + body + '</div>';
  }
  function qmConditionals() {
    document.getElementById('qmChoicesFld').style.display = isChoice(qmType) ? '' : 'none';
    if (isChoice(qmType) && !qmChoices.length) qmChoices = ['', ''];
    drawOpts();
  }
  document.getElementById('qmType').addEventListener('select', function (e) { qmType = e.detail.value; qmConditionals(); });
  document.getElementById('qmText').addEventListener('input', drawPreview);
  document.getElementById('qmAddOpt').addEventListener('click', function () { qmChoices.push(''); drawOpts(); });
  function openQ(idx) {
    qmIdx = idx;
    var q = idx > -1 ? cur.questions[idx] : null;
    qmType = q ? q.question_type : 'ISIAN_TEKS';
    qmChoices = q && q.question_choices.length ? q.question_choices.slice() : [];
    document.getElementById('qmHeading').textContent = q ? 'Edit question ' + q.order : 'Add question';
    var tv = document.getElementById('qmType').querySelector('.ctl__value'); tv.textContent = qmType; tv.style.color = 'var(--fg-1)';
    document.getElementById('qmText').value = q ? q.question_text : '';
    qmConditionals();
    F.openModal('fmQ');
    if (window.lucide) window.lucide.createIcons();
  }
  document.getElementById('fdQAdd').addEventListener('click', function () { openQ(-1); });
  document.getElementById('qmSave').addEventListener('click', function () {
    var text = document.getElementById('qmText').value.trim();
    var list = qmChoices.map(function (s) { return s.trim(); }).filter(Boolean);
    if (!text) { F.toast('Question text is required.', 'warn'); return; }
    if (isChoice(qmType) && !list.length) {
      F.toast('422 VALIDATION_ERROR — ck_mst_form_question_choices_required: a choice question needs its options.', 'danger'); return;
    }
    if (!isChoice(qmType)) list = [];
    if (qmIdx > -1) {
      var q = cur.questions[qmIdx];
      q.question_type = qmType; q.question_text = text; q.question_choices = list;
      F.toast('200 OK — question updated. Answers already given keep their frozen copy.', 'ok');
    } else {
      cur.questions.push({ order: cur.questions.length + 1, question_type: qmType, question_text: text, question_choices: list });
      F.toast('201 Created — question added.', 'ok');
    }
    F.closeModal('fmQ'); drawQPanel(); redraw();
    if (window.lucide) window.lucide.createIcons();
  });
  document.getElementById('fdQBody').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-qedit]'), dr = e.target.closest('[data-qdrop]');
    if (ed) openQ(+ed.getAttribute('data-qedit'));
    if (dr) {
      if (cur.questions.length === 1) { F.toast('A form keeps at least one question.', 'warn'); return; }
      cur.questions.splice(+dr.getAttribute('data-qdrop'), 1);
      cur.questions.forEach(function (q, i) { q.order = i + 1; });
      drawQPanel();
      F.toast('200 OK — question soft-deleted. Answers already given are untouched.', 'ok');
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // ---------------- one submission, HR read (F4.15 + F4.16) ----------------
  document.getElementById('fdABody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sub]');
    if (!b) return;
    var rec = D.byCode(D.MY_SUBMISSIONS, b.getAttribute('data-sub'));
    var row = (cur.submissions || []).filter(function (s) { return s.code === b.getAttribute('data-sub'); })[0];
    document.getElementById('fsTitle').textContent = cur.form_title + ' — ' + b.getAttribute('data-sub');
    document.getElementById('fsDesc').textContent = 'Submitted by ' + D.empName(row.respondent) + ' on ' + D.stampTime(row.submitted_at) + '. Read-only — question wording is the copy frozen with the answer.';
    document.getElementById('fsBody').innerHTML = (rec ? rec.items : []).map(function (it) {
      return '<tr><td class="cell-strong">' + it.question_text_snapshot + '</td><td>' + D.badge('grey', it.question_type_snapshot) + '</td>' +
        '<td>' + (it.answer_value || '<span class="cell-dim">—</span>') + '</td></tr>';
    }).join('') || '<tr><td colspan="3"><div class="muted-empty">No item on this submission.</div></td></tr>';
    document.getElementById('fsHist').innerHTML = (rec && rec.changes || []).length ? rec.changes.map(function (r) {
      return '<div class="pv-row"><span class="pv-row__k">' + D.stampTime(r.created_at) + '</span><span class="pv-row__v">' + r.old_value + ' → ' + r.new_value + '</span></div>';
    }).join('') : '<div class="pv-row"><span class="pv-row__k">Never edited</span><span class="pv-row__v">This log carries no reason column, and it dies with its parent record.</span></div>';
    F.openModal('fmSub');
    if (window.lucide) window.lucide.createIcons();
  });

  function drawAgg() {
    document.getElementById('faTitle').textContent = cur.form_title + ' — aggregate';
    document.getElementById('faCount').textContent = cur.respondent_count;
    document.getElementById('faBody').innerHTML = cur.questions.map(function (q, i) {
      var a = (cur.aggregate || [])[i];
      if (!a) return '';
      var rows;
      if (q.question_type === 'ISIAN_TEKS') {
        rows = '<div class="pv-row"><span class="pv-row__k">Answers counted</span><span class="pv-row__v">' + a.aggregate.count + ' <span class="pv-tag">TEXT NEVER SHOWN</span></span></div>';
      } else {
        rows = Object.keys(a.aggregate).map(function (k) {
          return '<div class="pv-row"><span class="pv-row__k">Option ' + k + '</span><span class="pv-row__v">' + a.aggregate[k] + '</span></div>';
        }).join('');
      }
      return '<div class="pv-panel" style="margin-bottom:12px"><div class="pv-panel__head"><i data-lucide="bar-chart-3"></i>' + q.question_text + '</div>' + rows + '</div>';
    }).join('');
  }

  document.getElementById('fmBody').addEventListener('click', function (e) {
    var d = e.target.closest('[data-detail]'), a = e.target.closest('[data-agg]'), an = e.target.closest('[data-anon]'),
        ed = e.target.closest('[data-edit]'), cl = e.target.closest('[data-close-form]'), dl = e.target.closest('[data-del]');
    if (d || an) {
      var f = D.byCode(D.FORMS, (d || an).getAttribute(d ? 'data-detail' : 'data-anon'));
      if (f.is_sensitive && persona === 'SARI') { F.toast('403 PROD_FORM_SENSITIVE_READ_DENIED — a sensitive form is read by the HR Manager or the health-data officer, never by HR Staff.', 'danger'); return; }
      cur = f;
      if (d) { drawDetail(); F.wireSelects(document.getElementById('fmDetail')); F.openModal('fmDetail'); }
      else {
        document.getElementById('fnTitle').textContent = cur.form_title;
        document.getElementById('fnBody').innerHTML = (cur.submissions || []).map(function (s) {
          return '<tr><td>' + D.stampTime(s.submitted_at) + '</td><td class="ta-c">' + s.item_count + '</td></tr>';
        }).join('') || '<tr><td colspan="2"><div class="muted-empty">No answer yet.</div></td></tr>';
        F.openModal('fmAnon');
      }
      if (window.lucide) window.lucide.createIcons();
    }
    if (a) {
      cur = D.byCode(D.FORMS, a.getAttribute('data-agg'));
      if (cur.is_sensitive) { F.toast('403 PROD_FORM_AGGREGATE_SENSITIVE_DENIED — a sensitive form has no aggregate surface.', 'danger'); return; }
      if ((cur.respondent_count || 0) < 5) { F.toast('422 PROD_FORM_AGGREGATE_BELOW_THRESHOLD — too few respondents. The message never states the real count.', 'danger'); return; }
      drawAgg(); F.openModal('fmAgg'); if (window.lucide) window.lucide.createIcons();
    }
    if (ed) openEdit(D.byCode(D.FORMS, ed.getAttribute('data-edit')));
    if (cl) {
      var cf = D.byCode(D.FORMS, cl.getAttribute('data-close-form'));
      cf.state = 'DITUTUP'; redraw();
      F.toast('200 OK — ' + cf.code + ' closed. It travels one way: reopening happens per person, never at form level.', 'ok');
    }
    if (dl) {
      var df = D.byCode(D.FORMS, dl.getAttribute('data-del'));
      if (df.submission_count > 0) { F.toast('409 PROD_FORM_HAS_SUBMISSION — this form already has answers. Close it instead of deleting.', 'danger'); return; }
      D.FORMS.splice(D.FORMS.indexOf(df), 1); pg.reset(); redraw();
      F.toast('200 OK — ' + df.code + ' soft-deleted; it had no answer to protect.', 'ok');
    }
  });

  regime();
  if (window.lucide) window.lucide.createIcons();
})();
