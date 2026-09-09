// ============================================================
// SEVAKA Recruitment — Create Job Listing wizard behaviour
// Renders step 2 (application form) + step 3 (hiring stage) from data,
// owns wizard navigation, custom questions, and the auto-rejection modal.
// Loads AFTER flow-common.js.
// ============================================================
(function () {
  'use strict';

  var ic = function (n, cls) { return '<i data-lucide="' + n + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>'; };
  var chev = '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

  function selectHTML(ph, opts, extra) {
    return '<div class="ctl ctl--select"' + (extra || '') + '><span class="ctl__value" style="color:var(--fg-4)">' + ph + '</span>' + chev +
      '<div class="dropdown">' + opts.map(function (o) {
        return '<button class="dropdown__opt" type="button" data-val="' + o + '">' + o + '</button>';
      }).join('') + '</div></div>';
  }
  function toggle(on, locked, sm) {
    return '<label class="cj-tg' + (sm ? ' cj-tg--sm' : '') + '"><input type="checkbox"' + (on ? ' checked' : '') +
      (locked ? ' disabled' : '') + '><span class="cj-tg__track"></span></label>';
  }
  function check(on, locked, label) {
    return '<label class="cj-inline-check' + (locked ? ' cj-locked' : '') + '" style="margin-top:0">' +
      '<span class="checkbox"><input type="checkbox"' + (on ? ' checked' : '') + (locked ? ' disabled' : '') +
      '><span class="checkbox__box"></span></span>' + label + '</label>';
  }

  // ---- rich-text editor: expand <div class="cj-rte" data-rte="placeholder" data-count="id" data-max="n">
  var RTE_BAR = [
    { c: 'undo', cmd: 'undo' }, { c: 'redo', cmd: 'redo' }, { s: 1 },
    { pick: 'Normal text' }, { pickIcon: 'align-left' }, { color: 1 }, { s: 1 },
    { c: 'bold', cmd: 'bold' }, { c: 'italic', cmd: 'italic' }, { c: 'underline', cmd: 'underline' },
    { c: 'strikethrough', cmd: 'strikeThrough' }, { c: 'code', cmd: '' }, { c: 'remove-formatting', cmd: 'removeFormat' }, { s: 1 },
    { c: 'list', cmd: 'insertUnorderedList' }, { c: 'list-ordered', cmd: 'insertOrderedList' }, { s: 1 },
    { c: 'link', cmd: '' }, { c: 'image', cmd: '' }, { c: 'code-xml', cmd: '' }, { c: 'quote', cmd: '' }, { c: 'minus', cmd: 'insertHorizontalRule' }
  ];
  function expandRTE() {
    document.querySelectorAll('.cj-rte[data-rte]').forEach(function (rte) {
      var ph = rte.getAttribute('data-rte');
      var bar = RTE_BAR.map(function (b) {
        if (b.s) return '<span class="cj-rte__sep"></span>';
        if (b.pick) return '<button class="cj-rte__pick" type="button">' + b.pick + ic('chevron-down') + '</button>';
        if (b.pickIcon) return '<button class="cj-rte__pick" type="button">' + ic(b.pickIcon) + ic('chevron-down') + '</button>';
        if (b.color) return '<button class="cj-rte__pick" type="button"><span class="cj-rte__swatch"></span>' + ic('chevron-down') + '</button>';
        return '<button class="cj-rte__btn" type="button"' + (b.cmd ? ' data-cmd="' + b.cmd + '"' : '') + '>' + ic(b.c) + '</button>';
      }).join('');
      var cnt = rte.getAttribute('data-count');
      rte.innerHTML = '<div class="cj-rte__bar">' + bar + '</div>' +
        '<div class="cj-rte__area" contenteditable="true" data-ph="' + ph + '"' +
        (cnt ? ' data-count="' + cnt + '" data-max="' + rte.getAttribute('data-max') + '"' : '') + '></div>';
      rte.removeAttribute('data-count');
    });
  }

  // ===================== STEP 2 — application form =====================
  var FILE_CATS = ['Employment contract', 'Identity document', 'Certificate', 'Photo', 'Other'];
  var CUSTOM_FIELDS = ['Emergency contact', 'T-shirt size', 'Referral source', 'Driving licence no.'];

  var FORM_GROUPS = [
    { title: 'Personal Information', fields: [
      { n: 'First name',    t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1 },
      { n: 'Last name',     t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1 },
      { n: 'Email address', t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1 },
      { n: 'Phone number',  t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1 },
      { n: 'Place of birth', t: 'Short answer', on: 1, m: 1, lock: 1 },
      { n: 'Date of birth',  t: 'Short answer', on: 1, m: 1, lock: 1 },
      { n: 'Gender',         t: 'Multiple choice', on: 1, m: 1 },
      { n: 'Marital status', t: 'Dropdown', on: 1, m: 1 },
      { n: 'Blood type',     t: 'Dropdown', on: 1, m: 1 },
      { n: 'Religion',       t: 'Dropdown', on: 1, m: 1 }
    ] },
    { title: 'Identity & Address', fields: [
      { n: 'NIK (NPWP 16 digits)', t: 'Short answer', on: 1, m: 1, lock: 1 },
      { n: 'Passport number',      t: 'Short answer', on: 0, lock: 1 },
      { n: 'Passport expiration date', t: 'Date', on: 0 },
      { n: 'Postal code',          t: 'Short answer', on: 0 },
      { n: 'Citizen ID address',   t: 'Paragraph', on: 1, m: 1, lock: 1 },
      { n: 'Residential address',  t: 'Paragraph', on: 1, m: 1, lock: 1 }
    ] },
    { title: 'Education & Work Experience', fields: [
      { n: 'Formal education',   t: 'Candidate can input more than one data', info: 1, on: 1, m: 0 },
      { n: 'Informal education', t: 'Candidate can input more than one data', info: 1, on: 1, m: 0 },
      { n: 'Work experience',    t: 'Candidate can input more than one data', info: 1, on: 1, m: 0 }
    ] },
    { title: 'Compensation', fields: [
      { n: 'Current salary per month',  t: 'Short answer', on: 1, m: 0, lock: 1 },
      { n: 'Expected salary per month', t: 'Short answer', on: 1, m: 1, lock: 1 }
    ] },
    { title: 'Attachment', fields: [
      { n: 'Profile picture', t: 'File upload', on: 1, m: 1, lock: 1, map: 1 },
      { n: 'Portofolio',      t: 'File upload', info: 1, on: 1, m: 0, map: 1 },
      { n: 'Resume',          t: 'File upload', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1, map: 1 }
    ] }
  ];

  function fieldRow(f) {
    var mand = (f.m === undefined) ? '' : check(f.m, f.mLock, 'Mandatory');
    var map = f.map ? '<label class="cj-inline-check" data-map-toggle style="margin-top:2px">' +
      '<span class="checkbox"><input type="checkbox"><span class="checkbox__box"></span></span>Map to employee file category</label>' +
      '<div class="cj-map" data-map-panel hidden><span class="cj-map__label">File category to map</span>' +
      selectHTML('Select file category', FILE_CATS) + '</div>' : '';
    return '<div class="cj-row' + (f.on ? '' : ' is-off') + '">' +
      '<div class="cj-row__main">' +
        '<span class="cj-row__name">' + f.n + (f.lock ? ic('lock') : '') + '</span>' +
        '<span class="cj-row__type">' + f.t + (f.info ? ic('info') : '') + '</span>' +
        mand + map +
      '</div>' +
      '<div class="cj-row__side">' + toggle(f.on, f.lockOn) +
        '<span class="cj-row__state">' + (f.on ? 'Enabled' : 'Disabled') + '</span></div>' +
    '</div>';
  }

  function renderStep2() {
    var host = document.getElementById('cjFormFields');
    if (!host) return;
    host.innerHTML = FORM_GROUPS.map(function (g) {
      return '<div class="cj-grp">' + g.title + '</div>' + g.fields.map(fieldRow).join('');
    }).join('');
  }

  // ---- custom questions ----
  // Every card shares the same default shape (question + type + description, with
  // Required / Map-to-custom-field in the footer). Only the choice types add an
  // option list — matching the Figma component set.
  var Q_TYPES = ['Short Answer', 'Paragraph', 'Yes/No', 'Dropdown', 'Multiple Choice', 'Checkbox', 'Date', 'Number', 'File Upload'];
  var OPT_TYPES = ['Dropdown', 'Multiple Choice', 'Checkbox'];
  var qSeq = 0;

  function optRow(i) {
    return '<div class="cj-q__opt">' +
      '<div class="ctl cj-q__optctl"><span class="cj-q__opt-n">' + i + '</span>' +
      '<input type="text" placeholder="Option"></div>' +
      '<button class="cj-q__optdel" type="button" data-optdel aria-label="Remove option">' + ic('circle-x') + '</button></div>';
  }
  function optionEditor() {
    return '<div class="cj-q__opts">' + optRow(1) + optRow(2) + optRow(3) +
      '<div class="cj-q__addrow">' + ic('circle-plus', 'cj-q__addicon') +
      '<button class="cj-q__link" type="button" data-addopt>Add Option</button>' +
      '<span class="cj-q__or">or</span>' +
      '<button class="cj-q__link" type="button" data-addother>Others</button></div></div>';
  }
  // Only the choice types add anything to the card — every other type keeps the
  // default question / type / description shape (its answer rules live server-side).
  function shapeHTML(type) { return OPT_TYPES.indexOf(type) === -1 ? '' : optionEditor(); }
  function setShape(q, type) {
    q.querySelector('[data-shape]').innerHTML = shapeHTML(type);
    if (window.lucide) window.lucide.createIcons();
  }

  function questionHTML() {
    qSeq++;
    return '<div class="cj-q" data-q="' + qSeq + '">' +
      '<div class="cj-q__grab">' + ic('grip-vertical', 'cj-drag') + '</div>' +
      '<div class="cj-q__top">' +
        '<div class="ctl"><input type="text" placeholder="Question"></div>' +
        selectHTML('Select answer type', Q_TYPES, ' data-qtype') +
      '</div>' +
      '<div class="ctl ctl--area cj-q__desc"><textarea rows="3" placeholder="Description (Optional)"></textarea></div>' +
      '<div data-shape></div>' +
      '<div class="cj-q__foot">' +
        '<div class="cj-q__flags">' +
          '<label class="cj-tgline">' + toggle(1, 0, 1) + 'Required</label>' +
          '<label class="cj-tgline" data-cf-toggle>' + toggle(0, 0, 1) + 'Map to employee custom field' + ic('info') + '</label>' +
          '<div class="cj-map" data-cf-panel hidden><span class="cj-map__label">Custom field to map</span>' +
            selectHTML('Select custom field', CUSTOM_FIELDS) + '</div>' +
        '</div>' +
        '<div class="cj-q__acts">' +
          '<button class="cj-iconbtn" type="button" data-qdup aria-label="Duplicate question">' + ic('copy') + '</button>' +
          '<button class="cj-iconbtn cj-iconbtn--danger" type="button" data-qdel aria-label="Delete question">' + ic('trash-2') + '</button>' +
        '</div>' +
      '</div></div>';
  }
  function addQuestion() {
    var list = document.getElementById('cjQList');
    list.insertAdjacentHTML('beforeend', questionHTML());
    var node = list.lastElementChild;
    window.Flow.wireSelects(node);
    if (window.lucide) window.lucide.createIcons();
    return node;
  }

  // ===================== STEP 3 — hiring stage =====================
  var ASSESSMENTS = ['Cognitive ability test', 'English proficiency', 'Personality profile', 'Technical screening'];
  var STAGE_NAMES = ['Assessment', 'Interview', 'Portfolio review', 'Reference check', 'Background check'];

  function stageCard(s) {
    var opt = '';
    if (s.assign !== undefined) {
      opt = '<div class="cj-stage__opt"><label class="cj-tgline">' + toggle(s.assign, 0, 1) + 'Assign assessment to this stage</label>' +
        (s.assign ? '<span class="cj-map__label" style="margin-top:4px">Assessment name</span>' + selectHTML('Select assessment', ASSESSMENTS) : '') + '</div>';
    }
    return '<div class="cj-stage">' + (s.drag ? ic('grip-vertical', 'cj-drag') : '') +
      '<div class="cj-stage__body"><span class="cj-stage__name">' + s.n + '</span>' +
      (s.d ? '<p class="cj-stage__desc">' + s.d + '</p>' : '') +
      (s.chip ? '<span class="cj-chip">' + s.chip + '</span>' : '') + opt + '</div></div>';
  }
  function emptyStage() {
    return '<div class="cj-stage">' + ic('grip-vertical', 'cj-drag') + '<div class="cj-stage__body">' +
      selectHTML('Select stage name', STAGE_NAMES) +
      '<div class="cj-stage__opt"><label class="cj-tgline">' + toggle(0, 0, 1) + 'Assign assessment to this stage</label></div>' +
      '</div></div>';
  }
  function addStageBtn() {
    return '<div class="cj-addwrap"><button class="add-filter" type="button" data-addstage>' + ic('circle-plus') + 'Add Stage</button></div>';
  }
  function processHTML(name, stages, withEmpty) {
    return '<div class="cj-proc"><div class="cj-proc__head">' + ic('grip-vertical', 'cj-drag') +
      '<span class="cj-proc__name">' + name + '</span>' + ic('chevron-up', 'cj-proc__chev') + '</div>' +
      '<div class="cj-proc__body">' + stages.map(stageCard).join('') +
      (withEmpty ? emptyStage() : '') + addStageBtn() + '</div></div>';
  }

  var NEW_CAND_CARD =
    '<div class="cj-stage"><div class="cj-stage__body">' +
      '<span class="cj-stage__name">New candidates</span>' +
      '<p class="cj-stage__desc">Compilation of new applied candidates</p>' +
      '<span class="cj-chip">Move stage</span>' +
      '<div class="cj-stage__opt"><label class="cj-tgline">' + toggle(1, 0, 1) + 'Assign assessment to this stage</label>' +
        '<span class="cj-map__label" style="margin-top:4px">Assessment name <span class="req" style="color:var(--color-error-500)">*</span></span>' +
        selectHTML('Select assessment', ASSESSMENTS) + '</div>' +
      '<div class="cj-stage__opt"><div class="cj-stage__optrow"><div>' +
        '<label class="cj-tgline">' + toggle(1, 0, 1) + 'Auto-reject by test score</label>' +
        '<p class="cj-stage__desc" style="margin:5px 0 0 28px">Automatically reject candidates who do not meet the minimum required assessment score.</p>' +
        '<div class="cj-subline" style="margin-top:7px">' + ic('gauge') + '<span>If the candidate\u2019s score is less than <strong id="cjRejPct">70%</strong></span></div>' +
        '<div class="cj-subline" style="margin-top:5px">' + ic('mail') + '<span id="cjRejMail">Send rejection email automatically</span></div>' +
      '</div><button class="rowbtn" type="button" id="cjManageReject">Manage</button></div></div>' +
    '</div></div>';

  var IN_PROCESS =
    processHTML('Assessment', [
      { drag: 1, n: 'Personality test', d: 'Personal characteristics assessment', chip: 'Invite for assessment', assign: 1 },
      { drag: 1, n: 'Skill test',       d: 'Knowledge &amp; job skills assessment', chip: 'Invite for assessment', assign: 1 },
      { drag: 1, n: 'Medical checkup',  d: 'Pre employment health check', chip: 'Invite for assessment', assign: 1 }
    ], true) +
    processHTML('Interview', [
      { drag: 1, n: 'HR interview',      d: 'First-round interview screening', chip: 'Schedule interview', assign: 0 },
      { drag: 1, n: 'User interview',    d: 'Second-round in-depth interview', chip: 'Schedule interview', assign: 0 },
      { drag: 1, n: 'Manager interview', d: 'High-level evaluation', chip: 'Schedule interview', assign: 0 }
    ]) +
    processHTML('Assessment', [], true);

  var STAGE_GROUPS = [
    { t: 'New candidates', d: 'A preliminary phase where recent applicant profiles are compiled.', html: NEW_CAND_CARD },
    { t: 'Screening', d: 'A preliminary stage where recent candidate profiles are reviewed.',
      html: stageCard({ n: 'Candidate review', d: 'Review of the candidate\u2019s CV', chip: 'Move stage' }) },
    { t: 'In process', d: 'A stage where shortlisted candidates are assessed and interviewed.',
      html: IN_PROCESS + '<div class="cj-addwrap" style="margin-top:12px"><button class="add-filter" type="button" id="cjAddProcess">' + ic('circle-plus') + 'Add Process</button></div>' },
    { t: 'Job offer', d: 'The process where job offers are drafted, negotiated, and finalized with candidates.',
      html: [
        { n: 'Awaiting offer', d: 'Preparing the job offer for the candidate', chip: 'Create offer' },
        { n: 'Offer sent',     d: 'Job offer sent to the candidate', chip: 'Move stage' },
        { n: 'Offer accepted', d: 'Candidate has accepted the job offer', chip: 'Move stage' }
      ].map(stageCard).join('') },
    { t: 'Final status', d: 'The stage where final decisions on candidates are made.',
      html: [
        { n: 'Hired', d: 'Candidate successfully hired' },
        { n: 'Rejected', d: 'Candidate not selected' },
        { n: 'Archived', d: 'Candidate archived for future reference' },
        { n: 'Spam', d: 'Application marked as spam' },
        { n: 'Blocked', d: 'Candidate blocked from further consideration' },
        { n: 'Withdrawn', d: 'Candidate has withdrawn from the process' }
      ].map(stageCard).join('') }
  ];

  function renderStep3() {
    var host = document.getElementById('cjStages');
    if (!host) return;
    host.innerHTML = STAGE_GROUPS.map(function (g) {
      return '<section class="cj-stagegrp"><span class="cj-stagegrp__title">' + g.t + '</span>' +
        '<p class="cj-stagegrp__desc">' + g.d + '</p>' + g.html + '</section>';
    }).join('');
  }

  // ===================== STEP 4 — hiring team =====================
  var EMPLOYEES = ['CP060 - Mitsui Tiga', 'CP061 - Rina Andini', 'CP074 - Bagas Prakoso', 'CP088 - Sarah Wijaya', 'CP092 - Daniel Kurniawan'];
  var ROLES = [
    { k: 'recruiter', label: 'Recruiter', btn: 'Add Recruiter',
      tip: 'Recruiters can move candidates, assume the role of an assessor, and send offers.' },
    { k: 'manager', label: 'Hiring Manager', btn: 'Add Hiring Manager',
      tip: 'Managers can be included as assessors for the job positions and the decision-making process.' },
    { k: 'interviewer', label: 'Interviewer', btn: 'Add Interviewer',
      tip: 'Interviewers can be assigned to conduct interviews for this job position.' }
  ];
  function initials(n) {
    var p = n.split(' - ').pop().split(' ');
    return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || '');
  }
  function personRow(name) {
    return '<div class="cj-teamrow"><div class="cj-person"><span class="cj-av">' + initials(name) + '</span>' + name + '</div>' +
      '<button class="pc-delrow" type="button" data-teamdel aria-label="Remove member">' + ic('x') + '</button></div>';
  }
  function pickerRow() {
    return '<div class="cj-teamrow">' + selectHTML('Select employee', EMPLOYEES) +
      '<button class="pc-delrow" type="button" data-teamdel aria-label="Remove member">' + ic('x') + '</button></div>';
  }
  function renderStep4() {
    var host = document.getElementById('cjTeam');
    if (!host) return;
    host.innerHTML = ROLES.map(function (r) {
      return '<section class="cj-teamgrp" data-role="' + r.k + '">' +
        '<span class="cj-teamgrp__label">' + r.label + '<span title="' + r.tip + '">' + ic('info') + '</span></span>' +
        '<div class="cj-teamrows" data-rows>' + personRow(EMPLOYEES[0]) + '</div>' +
        '<button class="add-filter" type="button" data-addmember>' + ic('circle-plus') + r.btn + '</button>' +
      '</section>';
    }).join('');
  }

  // ===================== STEP 5 — publication platforms =====================
  var PLATFORMS = ['Career page', 'LinkedIn', 'JobStreet', 'Indeed'];
  function renderStep5() {
    var host = document.getElementById('cjPlatforms');
    if (!host) return;
    host.innerHTML = PLATFORMS.map(function (p) {
      return '<div class="cj-plat"><span class="cj-plat__name">' + p + '</span>' +
        '<div class="cj-plat__side">' + toggle(1, 0) + '<span class="cj-plat__state">Enabled</span></div></div>';
    }).join('');
  }

  // ===================== wizard nav =====================
  var STEP_TOTAL = 5, cur = 1;
  function paintSteps() {
    document.querySelectorAll('.cj-step').forEach(function (s) {
      var n = +s.getAttribute('data-step');
      s.classList.toggle('is-on', n === cur);
      s.classList.toggle('is-done', n < cur);
      s.classList.toggle('is-future', n > cur);
    });
    document.querySelectorAll('.cj-line').forEach(function (l, i) { l.classList.toggle('is-done', i + 1 < cur); });
    document.querySelectorAll('.cj-panel').forEach(function (p) {
      p.classList.toggle('is-on', +p.getAttribute('data-panel') === cur);
    });
    document.getElementById('cjBack').hidden = cur === 1;
    document.getElementById('cjContinue').textContent = cur === STEP_TOTAL ? 'Publish' : 'Continue';
    document.querySelector('.app__scroll').scrollTop = 0;
  }
  function goStep(n) {
    if (n < 1 || n > STEP_TOTAL) return;
    cur = n; paintSteps();
  }

  // ===================== wiring =====================
  function wire() {
    expandRTE();
    renderStep2(); renderStep3(); renderStep4(); renderStep5();
    window.Flow.wireSelects();

    // character counters
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var out = document.getElementById(el.getAttribute('data-count'));
      var max = el.getAttribute('maxlength') || el.getAttribute('data-max');
      var upd = function () {
        var len = el.value !== undefined ? el.value.length : el.textContent.length;
        out.textContent = len + '/' + max;
      };
      el.addEventListener('input', upd); upd();
    });

    // rich-text toolbar (real execCommand on the sibling area)
    document.querySelectorAll('.cj-rte').forEach(function (rte) {
      var area = rte.querySelector('.cj-rte__area');
      rte.querySelectorAll('[data-cmd]').forEach(function (b) {
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { area.focus(); document.execCommand(b.getAttribute('data-cmd')); });
      });
    });

    // delegated: map-to-category toggles, custom questions, processes
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type !== 'checkbox') return;
      // Enabled toggle → dim the row + swap the state label
      var side = t.closest('.cj-row__side');
      if (side) {
        var row = side.closest('.cj-row');
        row.classList.toggle('is-off', !t.checked);
        side.querySelector('.cj-row__state').textContent = t.checked ? 'Enabled' : 'Disabled';
        return;
      }
      var mapT = t.closest('[data-map-toggle]');
      if (mapT) { mapT.parentNode.querySelector('[data-map-panel]').hidden = !t.checked; return; }
      // platform toggle → swap the state label
      var plat = t.closest('.cj-plat__side');
      if (plat) { plat.querySelector('.cj-plat__state').textContent = t.checked ? 'Enabled' : 'Disabled'; return; }
      if (t.id === 'pubRestrict') { document.getElementById('pubReapp').hidden = !t.checked; return; }
      var cfT = t.closest('[data-cf-toggle]');
      if (cfT) { cfT.parentNode.querySelector('[data-cf-panel]').hidden = !t.checked; return; }
    });

    document.addEventListener('click', function (e) {
      var del = e.target.closest('[data-optdel]');
      if (del) { del.closest('.cj-q__opt').remove(); return; }
      var add = e.target.closest('[data-addopt]');
      if (add) {
        var opts = add.closest('.cj-q__opts');
        var n = opts.querySelectorAll('.cj-q__opt').length + 1;
        opts.querySelector('.cj-q__addrow').insertAdjacentHTML('beforebegin', optRow(n));
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      var other = e.target.closest('[data-addother]');
      if (other) {
        var o2 = other.closest('.cj-q__opts');
        if (o2.querySelector('[data-other-row]')) return;
        var on = o2.querySelectorAll('.cj-q__opt').length + 1;
        o2.querySelector('.cj-q__addrow').insertAdjacentHTML('beforebegin',
          '<div class="cj-q__opt" data-other-row>' +
          '<div class="ctl cj-q__optctl"><span class="cj-q__opt-n">' + on + '</span>' +
          '<input type="text" value="Others" disabled></div>' +
          '<button class="cj-q__optdel" type="button" data-optdel aria-label="Remove option">' + ic('circle-x') + '</button></div>');
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      var qdel = e.target.closest('[data-qdel]');
      if (qdel) { qdel.closest('.cj-q').remove(); return; }
      var qdup = e.target.closest('[data-qdup]');
      if (qdup) {
        // Rebuild from the template and copy values across — cloneNode would carry
        // flow-common's data-wired / data-searchable guards, leaving the copy's
        // dropdowns permanently dead.
        var src = qdup.closest('.cj-q');
        src.insertAdjacentHTML('afterend', questionHTML());
        var copy = src.nextElementSibling;
        // give the copy the same shape, then match the option-row count
        var srcType = src.querySelector('[data-qtype] .dropdown__opt.is-sel');
        setShape(copy, srcType ? (srcType.dataset.val || srcType.textContent) : '');
        var srcOpts = src.querySelectorAll('.cj-q__opt'), copyOpts = copy.querySelectorAll('.cj-q__opt');
        var addRow = copy.querySelector('.cj-q__addrow');
        if (addRow) {
          for (var i = copyOpts.length; i < srcOpts.length; i++) addRow.insertAdjacentHTML('beforebegin', optRow(i + 1));
          for (var j = srcOpts.length; j < copyOpts.length; j++) copyOpts[j].remove();
        }
        // text inputs / textareas, in document order — skip the search input that
        // flow-common injects inside a long select's dropdown
        var fields = function (root) {
          return [].slice.call(root.querySelectorAll('input[type="text"],textarea')).filter(function (el) {
            return !el.closest('.dropdown');
          });
        };
        var sIn = fields(src), cIn = fields(copy);
        sIn.forEach(function (el, k) { if (cIn[k]) cIn[k].value = el.value; });
        // toggles + checkboxes
        var sCk = src.querySelectorAll('.cj-tg input'), cCk = copy.querySelectorAll('.cj-tg input');
        sCk.forEach(function (el, k) { if (cCk[k]) cCk[k].checked = el.checked; });
        // chosen select values + revealed panels
        var sSel = src.querySelectorAll('.ctl--select'), cSel = copy.querySelectorAll('.ctl--select');
        sSel.forEach(function (el, k) {
          var chosen = el.querySelector('.dropdown__opt.is-sel');
          if (!chosen || !cSel[k]) return;
          var val = chosen.dataset.val || chosen.textContent;
          var target = [].slice.call(cSel[k].querySelectorAll('.dropdown__opt')).filter(function (o) {
            return (o.dataset.val || o.textContent) === val;
          })[0];
          if (target) target.classList.add('is-sel');
          var v = cSel[k].querySelector('.ctl__value');
          if (v) { v.textContent = val; v.style.color = 'var(--fg-1)'; }
        });
        copy.querySelector('[data-cf-panel]').hidden = src.querySelector('[data-cf-panel]').hidden;
        window.Flow.wireSelects(copy);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      var tdel = e.target.closest('[data-teamdel]');
      if (tdel) {
        var rows = tdel.closest('[data-rows]');
        if (rows.children.length === 1) { window.Flow.toast('At least one member is required for this role.', 'info'); return; }
        tdel.closest('.cj-teamrow').remove(); return;
      }
      var addm = e.target.closest('[data-addmember]');
      if (addm) {
        var host4 = addm.previousElementSibling;
        host4.insertAdjacentHTML('beforeend', pickerRow());
        window.Flow.wireSelects(host4.lastElementChild);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      var head = e.target.closest('.cj-proc__head');
      if (head) { head.parentNode.classList.toggle('is-collapsed'); return; }
      var as = e.target.closest('[data-addstage]');
      if (as) {
        as.parentNode.insertAdjacentHTML('beforebegin', emptyStage());
        window.Flow.wireSelects(as.parentNode.previousElementSibling);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
    });

    // answer type → reshape the card body to match the type
    document.addEventListener('select', function (e) {
      var sel = e.target.closest('[data-qtype]');
      if (!sel) return;
      setShape(sel.closest('.cj-q'), e.detail.value);
    });

    document.getElementById('cjAddQuestion').addEventListener('click', addQuestion);
    document.getElementById('cjAddProcess').addEventListener('click', function () {
      var wrap = this.parentNode;
      wrap.insertAdjacentHTML('beforebegin', processHTML('New process', [], true));
      window.Flow.wireSelects(wrap.previousElementSibling);
      if (window.lucide) window.lucide.createIcons();
    });

    // auto-rejection modal
    var pct = document.getElementById('arPct'), num = document.getElementById('arNum');
    function paintSlider() {
      var v = +pct.value;
      pct.style.background = 'linear-gradient(90deg,var(--color-secondary-600) ' + v + '%,var(--color-vapor) ' + v + '%)';
      num.value = v;
    }
    pct.addEventListener('input', paintSlider);
    num.addEventListener('input', function () {
      var v = Math.max(0, Math.min(100, +num.value || 0));
      pct.value = v; paintSlider();
    });
    paintSlider();
    document.getElementById('cjManageReject').addEventListener('click', function () { window.Flow.openModal('autoRejectModal'); });
    document.getElementById('arSave').addEventListener('click', function () {
      document.getElementById('cjRejPct').textContent = pct.value + '%';
      document.getElementById('cjRejMail').textContent = document.getElementById('arEmail').checked
        ? 'Send rejection email automatically' : 'Rejection email not sent';
      window.Flow.closeModal('autoRejectModal');
      window.Flow.toast('Auto-rejection settings saved.', 'ok');
    });
    document.getElementById('arPreview').addEventListener('click', function () {
      window.Flow.toast('Email preview opens in the template editor.', 'info');
    });

    // nav
    document.getElementById('cjBack').addEventListener('click', function () { goStep(cur - 1); });
    document.getElementById('cjContinue').addEventListener('click', function () {
      if (cur === STEP_TOTAL) { window.Flow.openModal('publishedModal'); return; }
      goStep(cur + 1);
    });
    document.getElementById('cjCancel').addEventListener('click', function () { window.Flow.openModal('discardModal'); });
    document.getElementById('pubPromoX').addEventListener('click', function () { this.parentNode.remove(); });
    var vBtn = document.getElementById('cjViewPlat'), vMenu = document.getElementById('cjViewMenu');
    vBtn.addEventListener('click', function (e) { e.stopPropagation(); vMenu.classList.toggle('is-open'); });
    vMenu.addEventListener('click', function (e) {
      var o = e.target.closest('.dropdown__opt');
      if (!o) return;
      vMenu.classList.remove('is-open');
      window.Flow.toast('Opening the listing on ' + o.textContent + '.', 'info');
    });
    document.addEventListener('click', function () { vMenu.classList.remove('is-open'); });
    document.getElementById('cjDraft').addEventListener('click', function () {
      window.Flow.toast('Saved as DRAFT — submit it later from Job Listings.', 'ok');
    });
    document.querySelectorAll('.cj-step').forEach(function (s) {
      s.style.cursor = 'pointer';
      s.addEventListener('click', function () { goStep(+s.getAttribute('data-step')); });
    });

    paintSteps();
    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
