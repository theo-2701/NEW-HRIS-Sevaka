/* Settings — Configuration (menus 1–8, contracts A1 read / A2 write).
   One engine for all eight menus: the contract is identical, only the setup_code subset
   the screen renders and sends differs. FSD-001-SETTINGS-0.2 §1–§8, UIC §1–§2. */
(function () {
  var S = window.SettingsData, F = window.Flow;
  var st = { role: 'ROLE_HR_MANAGER', menu: 'time', sub: 0, q: '', edits: {} };

  var BASEVER = {};
  S.VERSIONS.forEach(function (v) { BASEVER[v.code] = Math.max(BASEVER[v.code] || 0, v.ver); });

  var NOTES = {
    time: [
      ['info', 'Seven sub-menus derived from the <strong>setup_code prefix</strong> — not from a column of their own. Tab order follows the frozen menu map; row order inside a tab is fixed by the server (<code>setup_code</code> ascending) and the client cannot ask for anything else.'],
      ['gap', 'Three rows are pick-lists (<code>leave.approval_extra_tier_approver</code>, <code>leave.joint_leave_deducts_annual</code>, <code>sick.doctor_note_required</code>); the rest are bounded numbers. Two shapes of control, deliberately not flattened into one uniform box.'],
      ['gap', 'The contract counts <strong>23 INTERVAL + 3 DAFTAR</strong> and names the three pick-lists explicitly. <code>leave.carryover_mode</code> is not one of them, yet nothing in the corpus gives it bounds or a unit either — it is carried here as an offer that was never drawn up rather than forced into either shape.'],
      ['gap', 'The time-service documents also name <code>leave.carryover_expiry</code> as a Time Settings surface. Counting it would make the <code>leave.</code> group six rows against a contract count of five — a cross-document tension carried here as-is rather than resolved on a screen.']
    ],
    finance: [
      ['info', 'Four sub-menus out of five candidate prefix levels: <code>finance.retention.</code> holds a single key, so it is <strong>dropped</strong> and its key falls back into the plain <code>finance.</code> tab. Stopping one level higher would give one tab of 27 rows; grouping every level would give a fifth tab of one.'],
      ['gap', 'Values come from the <strong>finance-service</strong> document (its own settings register), because the settings-side guardian file has not been generated: bounds are therefore still missing on 13 of the 14 <code>INTERVAL</code> rows and the descriptions are empty on all 27. Only <code>reminder_escalation_threshold_days</code> (1–14) and <code>retention.years</code> (2 and up) have written bounds; nothing else is invented here.'],
      ['gap', 'Four rows are <strong>deliberately empty</strong> rather than unfilled — interest, the early-settlement fee amount and unit, the tenor pattern. Empty means deny-by-default or does-not-apply, which is a decision, and the screen has to say which of the two (same shape, different meanings — PROB-FRONTEND-037).'],
      ['gap', 'One <code>jenis</code>, two controls: <code>tenor_custom_list</code> holds <code>[6,12,24]</code> and needs a repeating control, while <code>tenor_min_months</code>/<code>tenor_max_months</code> hold one member each. Nothing in the contract says a setting may hold many values — the conclusion is drawn from what happens to be stored (PROB-FRONTEND-036).']
    ],
    payroll: [
      ['info', 'No sub-menu: all eight keys share the prefix <code>payroll.</code>, so the deepest level holding more than one key is that prefix itself.'],
      ['gap', 'Three kinds of emptiness with opposite meanings arrive in the <strong>same shape</strong> (<code>[]</code>): a decision that escalation does not apply, a conditionally-valid blank, and a default nobody has ever written. The screen labels them from the code plus the state of the value — no server field carries this (PROB-FRONTEND-037).'],
      ['gap', 'Two rows are marked <strong>DEFAULT DISPUTED</strong>: the payroll document writes <code>work_minutes_rounding = 0</code> and <code>past_period_recheck_months = 3</code>, and it names the suspension modes <code>PREPARED_FULL/PREPARED_PARTIAL/CALCULATED_ZERO</code> where the settings dataset says <code>FULL/PARTIAL/NONE</code>. Two final documents disagree over the same eight keys (PROB-SERVICE-441); this screen shows the settings side and names the other.'],
      ['gap', 'A ninth key — <code>payroll.send_deadline_days</code>, how many days after closing a period must be handed over — was decided on 03 August 2026 and then lost in reconciliation: it exists in no register, so it cannot appear as a row here. The menu counts eight.'],
      ['hard', '<code>[]</code> passes all seven write checks on <em>any</em> setup_code — sending an empty array to <code>payroll.closing_day_of_month</code> saves 200 and three other services read that key on every request, with no cache (PROB-SERVICE-440).']
    ],
    performance: [
      ['gap', '<code>assessment_structure_id</code> is a pointer: the setting screen can neither display the pointed-at name nor offer a picker for it, so the control is a free text box where a named picker belongs (PROB-FRONTEND-038, waiting on PROB-SERVICE-371).'],
      ['gap', 'No performance-service document sits in this corpus, so every bound and unit on this menu is unwritten: the seven rows carry the values the settings dataset quotes and nothing more.'],
      ['gap', 'Four of the seven are <strong>frozen where they are used</strong> — copied onto a cycle row when it is created — and two carry a provisionally-approved default. This screen cannot say when a change starts to apply (PROB-FRONTEND-039).']
    ],
    productivity: [
      ['info', 'No sub-menu, but by a different route than Organization or Employee: both keys do share a dotted prefix, and the derivation yields exactly one group.'],
      ['gap', 'Two settings, four gates, two modules — and the screen cannot say so to the HR manager changing them (PROB-FRONTEND-041). <code>task_due_reminder_days</code> rides the task key for form deadlines too; 18 proposed new keys were refused to hold the namespace down.']
    ],
    document: [
      ['hard', 'Both key names are <strong>provisional</strong> (DUMMY-CONFIG-002). The split of the old <code>document.storage_quota</code> was decided; the names are not locked in any document, so they must not be quoted as final contract.'],
      ['hard', 'Value <em>and</em> offer kind are both unbuilt: the Current Value column shows <code>—</code> and the control column says so in words instead of guessing between a number box and a pick-list. The Save button consequently has nothing valid to send today.'],
      ['gap', 'The only menu of the eight with no second answer class: the read-limited class is derived from a <code>Document</code> column in the permission matrix that does not exist yet. Not a gap invented here — a fact of the documents.']
    ],
    organization: [
      ['info', 'No sub-menu by a third route: all three codes are <code>UPPER_SNAKE_CASE</code> with no dotted segment, so the derivation stops one step earlier than in the dotted menus.'],
      ['gap', 'Two of three rows follow the <strong>R/O/D</strong> pattern with three distinct behaviours: OPTIONAL is always accepted · DISABLED needs an explicit confirmation · REQUIRED is refused while any employee is unassigned, and the refusal must name the number. <code>BRANCH_HIERARCHY_MODE</code> is not R/O/D even though one of its values is called DISABLED.'],
      ['hard', 'TSD and ERD, both final, forbid each other over the mechanism behind the REQUIRED gate (PROB-SERVICE-442). The behaviour drawn here follows the technical documents as written; a decision either way may reshape it. Historical Cost Center assignments are <strong>not</strong> deleted when the mode goes to DISABLED.']
    ],
    employee: [
      ['info', 'The smallest menu in the service: one setting, <code>REPRIMAND_RULE</code>. Two named values, and — like <code>BRANCH_HIERARCHY_MODE</code> — that resemblance does not make it an R/O/D setting. No <code>confirm_transition</code>, ever.'],
      ['gap', 'Two screens in the corpus disagree about this company\'s value today: this one shows the probed <code>NON-ACTIVE</code>, the employee-service screen hard-codes <code>ACTIVE</code> (PROB-FRONTEND-042).']
    ]
  };

  var GENERIC = [
    ['gap', 'Row labels are still machine names (<code>setup_code</code>): there is no human display dictionary yet (PROB-FRONTEND-034).'],
    ['gap', 'The reach of the Save button is not contracted (PROB-FRONTEND-035). One write door accepts rows from any menu in one transaction; nothing states whether Save sends the current tab, the current menu, or every edited row across menus. This build sends <strong>every edited row across every menu</strong> and says so.'],
    ['info', 'Rows the platform owns (<code>' + S.LOCKED_CODE + '</code>) are <strong>absent from the read answer entirely</strong> — not sent and then hidden. Retired rows do stay, flagged, with their offer already withdrawn upstream. Four fields are deliberately missing everywhere: the technical <code>id</code>, <code>is_locked</code>, the created/updated actors, and the created/updated timestamps.'],
    ['hard', 'The dev server has been unreachable since 03 August 2026 and the gateway auto-sync for this service is still open (PROB-INFRA-023): not one call on this screen has ever run against a real database. The contract shapes are final; the deployment is not.']
  ];

  function role() { return S.ROLES.filter(function (r) { return r.id === st.role; })[0]; }
  function menu() { return S.menu(st.menu); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function fmtVal(v) { return v === null ? null : JSON.stringify(v); }
  function nowIso() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds()) + '+07:00';
  }
  function cur(r) { return st.edits[r.code] !== undefined ? st.edits[r.code] : r.val; }

  /* ---------- role picker ---------- */
  document.getElementById('asRoleDd').innerHTML = S.ROLES.map(function (r) {
    var who = r.person ? r.person + ' — ' : '';
    return '<div class="dropdown__opt' + (r.id === st.role ? ' is-sel' : '') + '" data-val="' + r.id + '">' + who + r.id + '</div>';
  }).join('');
  F.wireSelects(document);
  document.getElementById('asRole').addEventListener('select', function (e) {
    st.role = e.detail.value; st.edits = {}; render();
  });

  /* ---------- menu selection lives in the sidebar ----------
     The eight menus are sidebar leaves (settings-configuration.html#<menu>); the
     in-page tab bar carries the sub-menus of the selected menu. Because a leaf
     click only changes the hash, the sidebar highlight is re-synced by hand. */
  function syncSidebar() {
    var want = 'settings-configuration.html#' + st.menu;
    document.querySelectorAll('.sidebar .sb-row--leaf').forEach(function (r) {
      var h = (r.getAttribute('data-href') || '').toLowerCase();
      if (h.indexOf('settings-configuration.html#') === 0) r.classList.toggle('is-on', h === want);
    });
  }

  document.getElementById('q').addEventListener('input', function () { st.q = this.value.trim().toLowerCase(); paintTable(); });

  /* ---------- render ---------- */
  function render() {
    var r = role(), m = menu();
    syncSidebar();
    document.getElementById('crumbMenu').textContent = m.label;
    document.title = 'SEVAKA HRIS — Settings · ' + m.label;
    document.getElementById('menuHistory').href = 'settings-change-history.html#' + st.menu;
    document.querySelector('#asRole .ctl__value').textContent = (r.person ? r.person + ' — ' : '') + r.id;

    var msg = r.cls === 'FULL' ? 'Answer class FULL — ' + r.rows + ' rows, offers and descriptions included, may write.'
      : r.cls === 'R' ? 'Answer class R‡ — ' + r.rows + ' rows, offers omitted (not null), no write door.'
        : 'Holds no setting — refused at the gate before any query runs.';
    document.getElementById('asMsg').textContent = msg + (r.person ? '' : ' No persona for this role in the positive-scenario dataset (PROB-FRONTEND-040).');

    var noAccess = r.cls === 'NONE';
    document.getElementById('gate').classList.toggle('is-hidden', !noAccess);
    document.getElementById('menuWrap').classList.toggle('is-hidden', noAccess);
    document.getElementById('saveBtn').classList.toggle('is-hidden', r.cls !== 'FULL');
    document.getElementById('menuHistory').classList.toggle('is-hidden', r.cls !== 'FULL');
    if (noAccess) { paintNotes(); return; }

    var multi = m.subs.length > 1;
    document.getElementById('subTabs').innerHTML = multi ? m.subs.map(function (s, i) {
      return '<button class="tabnav__tab' + (i === st.sub ? ' is-on' : '') + '" type="button" data-sub="' + i + '">' + s.key + '<span class="tabnav__count">' + s.count + '</span></button>';
    }).join('') : '';
    document.getElementById('subTabs').classList.toggle('is-hidden', !multi);
    paintTable(); paintNotes();
    if (window.lucide) lucide.createIcons();
  }

  document.getElementById('subTabs').addEventListener('click', function (e) {
    var b = e.target.closest('[data-sub]'); if (!b) return;
    st.sub = +b.getAttribute('data-sub');
    this.querySelectorAll('[data-sub]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    paintTable();
  });

  function ctlHtml(r) {
    var v = cur(r), o = r.opt;
    if (!o) return '<span class="st-noctl">no control — nothing to base its shape on</span>';
    if (o.jenis === 'DAFTAR') {
      if (!o.pilihan) return '<span class="st-noctl">pick-list, options not drawn up by the meaning owner</span>';
      var sel = v && v.length ? String(v[0]) : '';
      return '<div class="ctl ctl--select st-ctl st-ctl--wide" data-code="' + r.code + '"><span class="ctl__value' + (sel ? '' : ' is-empty') + '">' + (sel || 'Select value') + '</span>' +
        '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>' +
        '<div class="dropdown">' + o.pilihan.map(function (p) { return '<div class="dropdown__opt' + (String(p) === sel ? ' is-sel' : '') + '" data-val="' + p + '">' + p + '</div>'; }).join('') + '</div></div>';
    }
    if (o.jenis === 'TEKS') {
      var tv = v && v.length ? String(v[0]) : '';
      return '<div class="st-num"><div class="ctl st-ctl st-ctl--wide' + (tv ? '' : ' st-ctl--empty') + '"><input type="text" data-txt="' + r.code + '" value="' + tv + '" placeholder="no value to show"></div>' +
        (o.satuan ? '<span class="st-unit">' + o.satuan + '</span>' : '') + '</div>';
    }
    if (r.multi) {
      return '<div class="st-chips" data-chips="' + r.code + '">' + (v || []).map(function (n, i) {
        return '<span class="st-chip">' + n + '<button type="button" data-chipdel="' + i + '" aria-label="Remove ' + n + '">×</button></span>';
      }).join('') + '<input class="ctl st-ctl" style="width:64px;height:28px;padding:0 8px" type="number" data-chipadd="' + r.code + '" placeholder="+ add"></div>';
    }
    var num = v && v.length ? v[0] : '';
    var bad = o.min !== undefined && num !== '' && (num < o.min || (o.max !== undefined && num > o.max));
    return '<div class="st-num"><div class="ctl st-ctl' + (bad ? ' is-bad' : '') + (num === '' ? ' st-ctl--empty' : '') + '"><input type="number" data-num="' + r.code + '" value="' + num + '"' +
      (o.min !== undefined ? ' min="' + o.min + '"' + (o.max !== undefined ? ' max="' + o.max + '"' : '') : '') + ' placeholder="' + (v === null ? 'no value to show' : '—') + '"></div>' +
      (o.satuan ? '<span class="st-unit">' + o.satuan + '</span>' : '') +
      (bad ? '<span class="st-bad">Outside the offer (' + o.min + (o.max === undefined ? ' and up' : '–' + o.max) + '). The server refuses it — SETUP_VALUE_NOT_OFFERED.</span>' : '') + '</div>';
  }

  function offerHtml(o) {
    if (!o) return '<span class="st-none">not drawn up</span>';
    if (o.jenis === 'DAFTAR') return '<span class="st-offer">DAFTAR · ' + (o.pilihan ? o.pilihan.join(' | ') : 'options not drawn up') + '</span>';
    if (o.jenis === 'TEKS') return '<span class="st-offer">Free text · no branch of the offer covers it' + (o.satuan ? ' (' + o.satuan + ')' : '') + '</span>';
    if (o.min !== undefined) return '<span class="st-offer">INTERVAL · ' + (o.max === undefined ? o.min + ' and up' : o.min + '–' + o.max) + ' ' + (o.satuan || '') + '</span>';
    return '<span class="st-offer">INTERVAL · bounds not drawn up' + (o.satuan ? ' (' + o.satuan + ')' : '') + '</span>';
  }

  function paintTable() {
    var r = role(), m = menu(), full = r.cls === 'FULL';
    var holds = full || (r.menus && r.menus.indexOf(m.id) > -1);
    var sub = m.subs[Math.min(st.sub, m.subs.length - 1)];

    document.getElementById('thead').innerHTML = full
      ? '<tr><th>Setup Code</th><th>Current Value</th><th>Value Control</th><th>Offer</th><th>Description</th><th></th></tr>'
      : '<tr><th>Setup Code</th><th>Current Value</th><th>Description</th></tr>';

    var body = '', shown = 0, cols = full ? 6 : 3;
    /* Row order inside a tab is fixed by the server: setup_code ascending, no client sort. */
    var ordered = sub.rows.slice().sort(function (a, b) { return a.code < b.code ? -1 : a.code > b.code ? 1 : 0; });
    if (!holds) {
      body = '<tr class="st-strip"><td colspan="' + cols + '"><span class="st-strip__in"><i data-lucide="eye-off"></i>All ' + m.count +
        ' rows of this menu are <strong>absent</strong> for this caller — ' + (76 - r.rows) + ' of the 76 rows are, on the same grounds. Absent because of <em>who is asking</em>, which is a different reason from a locked row (absent for everyone).</span></td></tr>';
    } else {
      ordered.forEach(function (row) {
        if (st.q && row.code.toLowerCase().indexOf(st.q) < 0) return;
        shown++;
        var v = cur(row), dirty = st.edits[row.code] !== undefined;
        var tags = (row.badges || []).map(function (b) { return '<span class="st-tag st-tag--' + b.k + '">' + b.t + '</span>'; });
        if (row.rod) tags.unshift('<span class="st-tag st-tag--indigo">R/O/D</span>');
        if (row.retired) tags.unshift('<span class="st-tag st-tag--grey">RETIRED</span>');
        var code = '<span class="st-code">' + row.code + '</span>' + (tags.length ? '<span class="st-tags">' + tags.join('') + '</span>' : '') +
          (row.note ? '<span class="st-sub">' + row.note + '</span>' : '');
        var val = v === null ? '<span class="st-none">—</span>' : (v.length === 0 ? '<span class="st-val">[]</span>' : '<span class="st-val">' + fmtVal(v) + '</span>');
        body += '<tr' + (dirty ? ' class="st-dirty"' : '') + '><td>' + code + '</td><td>' + val + '</td>' +
          (full ? '<td>' + (row.retired ? '<span class="st-noctl">retired row — no edit control is rendered, the offer was withdrawn upstream</span>' : ctlHtml(row)) + '</td><td>' + (row.retired ? '<span class="st-none">—</span>' : offerHtml(row.opt)) + '</td>' : '') +
          '<td>' + (row.desc ? '<span class="st-offer">' + esc(row.desc) + '</span>' : '<span class="st-none">not filled by the daily sweep</span>') + '</td>' +
          (full ? '<td><div class="rowacts"><a class="rowbtn" href="settings-change-history.html?code=' + encodeURIComponent(row.code) + '#' + st.menu + '">History</a></div></td>' : '') +
          '</tr>';
      });
      var unnamed = sub.count - sub.rows.length;
      if (unnamed > 0 && !st.q) {
        body += '<tr class="st-strip"><td colspan="' + cols + '"><span class="st-strip__in"><i data-lucide="help-circle"></i>' +
          unnamed + ' more row' + (unnamed > 1 ? 's' : '') + ' in this ' + (sub.key ? 'sub-menu' : 'menu') + ' per the contract count (' + sub.count +
          ' total). <strong>No source document names their setup_code</strong>, so they are counted here rather than invented.</span></td></tr>';
      }
      if (!shown && st.q) body += '<tr><td colspan="' + cols + '"><span class="st-none">No setup code matches “' + esc(st.q) + '” in this ' + (sub.key ? 'sub-menu' : 'menu') + '. This filters rows already received — the read door takes no criteria at all.</span></td></tr>';
    }
    document.getElementById('tbody').innerHTML = body;
    var n = Object.keys(st.edits).length;
    document.getElementById('saveBtn').textContent = n ? 'Save changes (' + n + ')' : 'Save changes';
    F.wireSelects(document.getElementById('tbody'));
    if (window.lucide) lucide.createIcons();
  }

  function paintNotes() {
    var r = role(), list = (NOTES[st.menu] || []).concat(GENERIC);
    if (r.cls === 'R') list = [['info', 'Read-limited class: the offer field is <strong>omitted</strong> by the server — not sent as null. So there is no offer column, no picking control and no Save button. This is a separate screen, not the full screen with things switched off.']].concat(list);
    document.getElementById('menuNotes').innerHTML = list.map(function (n) {
      var cls = n[0] === 'info' ? 'note note--info' : n[0] === 'gap' ? 'note note--warn' : 'note note--danger';
      var ico = n[0] === 'info' ? 'info' : n[0] === 'gap' ? 'alert-triangle' : 'alert-octagon';
      return '<div class="' + cls + '"><i data-lucide="' + ico + '"></i><span>' + n[1] + '</span></div>';
    }).join('');
    if (window.lucide) lucide.createIcons();
  }

  /* ---------- edits ---------- */
  document.getElementById('tbody').addEventListener('select', function (e) {
    var ctl = e.target.closest('[data-code]'); if (!ctl) return;
    st.edits[ctl.getAttribute('data-code')] = [e.detail.value];
    paintTable();
  });
  document.getElementById('tbody').addEventListener('change', function (e) {
    var add = e.target.closest('[data-chipadd]');
    if (add) {
      if (add.value === '' || isNaN(Number(add.value))) return;
      var c = add.getAttribute('data-chipadd'), rw = findRow(c), v = (cur(rw) || []).slice();
      v.push(Number(add.value)); st.edits[c] = v; paintTable(); return;
    }
    var t = e.target.closest('[data-txt]');
    if (t) { st.edits[t.getAttribute('data-txt')] = t.value === '' ? [] : [t.value]; paintTable(); return; }
    var n = e.target.closest('[data-num]'); if (!n) return;
    var code = n.getAttribute('data-num');
    st.edits[code] = n.value === '' ? [] : [Number(n.value)];
    paintTable();
  });
  document.getElementById('tbody').addEventListener('click', function (e) {
    var del = e.target.closest('[data-chipdel]');
    if (del) {
      var wrap = del.closest('[data-chips]'), c = wrap.getAttribute('data-chips'), rw = findRow(c), vv = (cur(rw) || []).slice();
      vv.splice(+del.getAttribute('data-chipdel'), 1); st.edits[c] = vv; paintTable();
    }
  });

  function findRow(code) {
    var out = null;
    S.MENUS.forEach(function (m) { m.subs.forEach(function (s) { s.rows.forEach(function (r) { if (r.code === code) out = r; }); }); });
    return out;
  }

  /* ---------- A2 write door ---------- */
  document.getElementById('saveBtn').addEventListener('click', function () {
    var codes = Object.keys(st.edits);
    if (!codes.length) { F.toast('Nothing edited — only edited rows travel.', 'err'); return; }
    var rod = null;
    var rows = codes.map(function (c) {
      var r = findRow(c); if (r.rod) rod = r;
      return { code: c, before: r.val, sent: st.edits[c], row: r };
    });
    document.getElementById('rvBody').innerHTML = rows.map(function (x) {
      return '<tr><td><span class="st-code">' + x.code + '</span></td><td>' + (x.before === null ? '<span class="st-none">—</span>' : '<span class="st-val">' + fmtVal(x.before) + '</span>') +
        '</td><td><span class="st-val">' + fmtVal(x.sent) + '</span></td></tr>';
    }).join('');
    var body = { settings: rows.map(function (x) { return { setup_code: x.code, setup_value: x.sent }; }) };
    document.getElementById('rvJson').textContent = JSON.stringify(body, null, 2);
    var rodTo = rod ? String(st.edits[rod.code][0]) : null;
    var showRod = !!rod && rodTo === 'DISABLED';
    document.getElementById('rvRod').classList.toggle('is-hidden', !showRod);
    document.getElementById('rvConfirm').checked = false;
    var others = showRod ? codes.filter(function (c) { return !findRow(c).rod; }) : [];
    var nonRod = document.getElementById('rvNonRod');
    nonRod.classList.toggle('is-hidden', !others.length);
    if (others.length) document.getElementById('rvNonRodMsg').innerHTML = 'The confirmation travels <strong>with its own row</strong>, not with the request. ' +
      others.map(function (c) { return '<code>' + c + '</code>'; }).join(', ') + ' ' + (others.length > 1 ? 'are' : 'is') +
      ' not an R/O/D setting — carrying <code>confirm_transition</code> on that row is refused <code>422 VALIDATION_ERROR</code> even when the value happens to be named DISABLED.';
    if (showRod) document.getElementById('rvRodMsg').innerHTML = '<code>' + rod.code + '</code> follows the R/O/D pattern and is moving to <strong>DISABLED</strong>. The contract demands an explicit confirmation for that move — without it the transaction is refused 422. Historical assignments are not deleted.';
    F.openModal('reviewOvl');
  });

  document.getElementById('rvSend').addEventListener('click', function () {
    var codes = Object.keys(st.edits), refusals = [];
    var rodReq = null;
    codes.forEach(function (c) {
      var r = findRow(c), v = st.edits[c];
      if (r.opt && r.opt.jenis === 'INTERVAL' && r.opt.min !== undefined) {
        v.forEach(function (n) {
          if (n < r.opt.min || n > r.opt.max) refusals.push({ f: c, k: 'SETUP_VALUE_NOT_OFFERED', m: 'nilai ' + n + ' di luar penawaran; rentang yang ditawarkan ' + r.opt.min + ' s.d. ' + r.opt.max + ' ' + (r.opt.satuan || '') + '.' });
        });
      }
      if (r.rod && String(v[0]) === 'DISABLED' && !document.getElementById('rvConfirm').checked) {
        refusals.push({ f: c, k: 'VALIDATION_ERROR', m: 'Transisi ke DISABLED menuntut konfirmasi eksplisit (confirm_transition: true).' });
      }
      if (r.rod && String(v[0]) === 'REQUIRED') rodReq = r;
    });
    F.closeModal('reviewOvl');
    if (refusals.length) {
      var hard = refusals.filter(function (x) { return x.k === 'SETUP_CODE_LOCKED'; }).length ? '403 — SETUP_CODE_LOCKED'
        : refusals.filter(function (x) { return x.k === 'SETUP_VALUE_NOT_OFFERED'; }).length ? '422 — SETUP_VALUE_NOT_OFFERED' : '422 — VALIDATION_ERROR';
      document.getElementById('noTitle').textContent = hard;
      document.getElementById('noDesc').textContent = refusals.length + ' dari ' + codes.length + ' setelan ditolak; nol setelan berubah.';
      document.getElementById('noBody').innerHTML = refusals.map(function (x) {
        return '<tr><td><span class="st-code">' + x.f + '</span></td><td><span class="st-tag st-tag--red">' + x.k + '</span></td><td><span class="st-offer">' + esc(x.m) + '</span></td></tr>';
      }).join('');
      F.openModal('noOvl');
      return;
    }
    if (rodReq) {
      document.getElementById('err500Msg').innerHTML = 'Switching <code>' + rodReq.code + '</code> to <strong>REQUIRED</strong> answers <code>500</code> for <em>every</em> company today: the gap view <code>setup.vw_employee_assignment_gap</code> has not been provisioned anywhere, so the completeness check cannot run — at a gap of ' + rodReq.gap + ' as much as at any other. Nothing changed.';
      F.openModal('err500Ovl'); return;
    }

    var when = nowIso(), okRows = [];
    codes.forEach(function (c) {
      var r = findRow(c), v = st.edits[c];
      var changed = JSON.stringify(r.val) !== JSON.stringify(v);
      var ver = changed ? (BASEVER[c] || 1) + 1 : null;
      if (changed) { BASEVER[c] = ver; r.val = v; }
      okRows.push({ c: c, v: v, changed: changed, ver: ver, at: changed ? when : '2026-01-05T02:00:00+07:00' });
    });
    st.edits = {};
    document.getElementById('okDesc').textContent = okRows.length + ' rows sent, ' + okRows.filter(function (x) { return x.changed; }).length + ' changed — one transaction, no second approver, no event published, no cache to clear.';
    document.getElementById('okBody').innerHTML = okRows.map(function (x) {
      return '<tr><td><span class="st-code">' + x.c + '</span></td><td><span class="st-val">' + fmtVal(x.v) + '</span></td>' +
        '<td>' + (x.changed ? '<span class="sb sb--green"><span class="sb__dot"></span>true</span>' : '<span class="sb sb--grey"><span class="sb__dot"></span>false</span>') + '</td>' +
        '<td><span class="st-val">' + (x.ver === null ? '—' : x.ver) + '</span></td><td><span class="st-offer">' + x.at + '</span></td></tr>';
    }).join('');
    F.openModal('okOvl');
    paintTable();
    if (window.lucide) lucide.createIcons();
  });

  function fromHash() {
    var h = (location.hash || '').replace('#', '');
    if (!h || !S.menu(h) || h === st.menu) return;
    st.menu = h; st.sub = 0; st.q = '';
    document.getElementById('q').value = '';
    render();
  }
  window.addEventListener('hashchange', fromHash);
  var h0 = (location.hash || '').replace('#', '');
  if (h0 && S.menu(h0)) st.menu = h0;
  render();
})();
