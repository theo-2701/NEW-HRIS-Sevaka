// ============================================================
// SEVAKA Recruitment — Job Listing Detail
// Renders the summary block + five tab panels, each with a
// read view and an inline edit view (pencil toggles between them).
// Loads AFTER flow-common.js.
// ============================================================
(function () {
  'use strict';

  var ic = function (n, cls) { return '<i data-lucide="' + n + '"' + (cls ? ' class="' + cls + '"' : '') + '></i>'; };
  var chev = '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var req = ' <span class="req">*</span>';

  function sel(val, opts, dim, extra) {
    return '<div class="ctl ctl--select"' + (extra || '') + '><span class="ctl__value"' + (dim ? ' style="color:var(--fg-4)"' : '') + '>' + val + '</span>' + chev +
      '<div class="dropdown">' + opts.map(function (o) {
        return '<button class="dropdown__opt' + (o === val ? ' is-sel' : '') + '" type="button" data-val="' + o + '">' + o + '</button>';
      }).join('') + '</div></div>';
  }
  function fld(label, body, extraCls) {
    return '<div class="cj-fld' + (extraCls ? ' ' + extraCls : '') + '"><label class="cj-fld__label">' + label + '</label>' + body + '</div>';
  }
  function tg(on, locked, sm) {
    return '<label class="cj-tg' + (sm ? ' cj-tg--sm' : '') + '"><input type="checkbox"' + (on ? ' checked' : '') + (locked ? ' disabled' : '') + '><span class="cj-tg__track"></span></label>';
  }
  function ck(on, locked, label) {
    return '<label class="cj-inline-check' + (locked ? ' cj-locked' : '') + '" style="margin-top:0">' +
      '<span class="checkbox"><input type="checkbox"' + (on ? ' checked' : '') + (locked ? ' disabled' : '') +
      '><span class="checkbox__box"></span></span>' + label + '</label>';
  }
  function foot(id) {
    return '<div class="jd-foot"><button class="btn btn--secondary" type="button" data-cancel="' + id + '">Cancel</button>' +
      '<button class="btn btn--primary" type="button" data-save="' + id + '">Save Changes</button></div>';
  }

  // ---------- option sets ----------
  var O = {
    status: ['Draft', 'Published', 'Unpublished', 'Closed'],
    branch: ['Jakarta HQ', 'Bandung', 'Surabaya', 'Bekasi'],
    province: ['DKI Jakarta', 'Jawa Barat', 'Jawa Timur'],
    city: ['Jakarta Selatan', 'Bandung', 'Surabaya'],
    org: ['Engineering', 'Product', 'Commercial', 'Finance'],
    emp: ['Permanent', 'Contract', 'Internship', 'Freelance'],
    work: ['On-site', 'Hybrid', 'Remote'],
    edu: ['SMA / SMK', 'D3', 'S1', 'S2'],
    exp: ['Entry level', 'Associate', 'Mid-senior', 'Director'],
    gender: ['Any', 'Male', 'Female'],
    people: ['CP060 - Mitsui Tiga', 'CP061 - Rina Andini', 'CP074 - Bagas Prakoso', 'CP088 - Sarah Wijaya', 'CP092 - Daniel Kurniawan'],
    fileCat: ['Employment contract', 'Identity document', 'Certificate', 'Photo', 'Other'],
    customField: ['Emergency contact', 'T-shirt size', 'Referral source', 'Driving licence no.'],
    assessment: ['Cognitive ability test', 'English proficiency', 'Personality profile', 'Technical screening'],
    stageName: ['Assessment', 'Interview', 'Portfolio review', 'Reference check', 'Background check']
  };

  // ===================== summary block =====================
  var SUM = [
    { k: 'Status', pill: 'PUBLISHED' },
    { k: 'Job listing ID', v: 'JL-1042' },
    { k: 'Job listing title', v: 'Senior Backend Engineer' },
    { k: 'Job position', v: 'Backend Engineer' },
    { k: 'Branch location', v: 'Jakarta HQ' },
    { k: 'Province', v: 'DKI Jakarta' },
    { k: 'City', v: 'Jakarta Selatan' },
    { k: 'Organization', v: 'Engineering' },
    { k: 'Employment type', v: 'Permanent' },
    { k: 'Workplace type', v: 'Hybrid' },
    { k: 'Headcount needed', v: '2 headcount', note: 'Only recruiter can see this information' },
    { k: 'Salary range', v: 'IDR 18.000.000 - 26.000.000' },
    { k: 'Salary description', v: 'Gross monthly, excluding performance bonus', note: 'Candidate and recruiter can see this information' },
    { k: 'Published date', v: '12 Jul 2026' },
    { k: 'Valid until', v: '29 Jul 2026' },
    { k: 'Created by', person: { name: 'CP060 - Mitsui Tiga', meta: 'Jakarta | IT Staff - SQA', init: 'MT' } }
  ];

  function summaryView() {
    return '<div class="jd-grid">' + SUM.map(function (f) {
      var body;
      if (f.pill) body = '<span class="jd-pill jd-pill--published">' + f.pill + '</span>';
      else if (f.person) body = '<div class="jd-person"><span class="jd-person__av">' + f.person.init + '</span>' +
        '<span><span class="jd-person__name">' + f.person.name + '</span><span class="jd-person__meta">' + f.person.meta + '</span></span></div>';
      else body = '<span class="jd-f__value">' + f.v + '</span>' + (f.note ? '<span class="jd-f__note">' + f.note + '</span>' : '');
      return '<div><span class="jd-f__label">' + f.k + '</span>' + body + '</div>';
    }).join('') + '</div>';
  }

  function summaryEdit() {
    var g = '<div class="cj-grid">' +
      fld('Status' + req, sel('Published', O.status)) +
      fld('Job listing ID' + req, '<div class="ctl"><input type="text" value="" placeholder="[Job Listing ID]" disabled></div>') +
      fld('Job listing title', '<div class="ctl"><input type="text" value="[Job Listing Title]" maxlength="255"></div>') +
      fld('Job position', '<div class="ctl"><input type="text" placeholder="[Job Position]" disabled></div>') +
      fld('Branch location' + req, sel('[Branch Location]', O.branch, true)) +
      fld('Province' + req, sel('[Province]', O.province, true)) +
      fld('City' + req, sel('[City]', O.city, true)) +
      fld('Organization' + req, sel('[Organization]', O.org, true)) +
      fld('Employment type' + req, sel('[Employment Type]', O.emp, true)) +
      fld('Workplace type' + req, sel('[Workplace Type]', O.work, true)) +
      fld('Headcount needed' + req,
        '<div class="ctl"><input type="number" min="1" placeholder="[Total of Headcount Needed]"><span class="ctl__suffix">Headcount</span></div>' +
        ck(0, 0, 'Show headcount needed to public')) +
      fld('Salary range' + req,
        '<div class="cj-range"><div class="ctl"><span class="ctl__prefix">IDR</span><input type="text" value="10.000.000"></div>' +
        '<span class="cj-range__dash">—</span><div class="ctl"><span class="ctl__prefix">IDR</span><input type="text" value="20.000.000"></div></div>') +
      '<div class="cj-fld cj-full"><label class="cj-fld__label">Salary description' + req + '</label><span class="cj-count" id="jdCntSal">0/50</span>' +
        '<div class="ctl ctl--area"><textarea rows="3" maxlength="50" data-count="jdCntSal" placeholder="[Salary Description]"></textarea></div></div>' +
      fld('Published date' + req, '<div class="ctl ctl--date"><input type="date"></div>') +
      fld('Valid until', '<div class="ctl ctl--date"><input type="date"></div>') +
      '</div>';
    var checks = '<div class="jd-checks">' +
      ck(0, 0, 'No closing date') +
      ck(1, 0, 'Automatically close the job listing after the required headcounts is fullfilled') +
      ck(1, 0, 'Restrict to one application per candidate') +
      '<div class="cj-reapp" id="jdReapp"><span class="cj-reapp__label">Re-application period</span>' +
        '<div class="cj-reapp__row">' + sel('After a set period', ['After a set period', 'Never']) + sel('6 months', ['1 month', '3 months', '6 months', '12 months']) + '</div></div>' +
      '</div>';
    var made = '<div class="cj-grid" style="margin-top:20px">' + fld('Created by' + req, sel('CP060 - Mitsui Tiga', O.people)) + '</div>';
    return g + checks + made + foot('sum');
  }

  // ===================== tab 1 — job information =====================
  var LOREM = 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.';
  var REQ_HTML = '<p>' + LOREM + '</p><ul>' +
    ['Proin nec ipsum vel augue tristique mattis sit amet sit amet diam.',
     'Aliquam congue sem vitae risus sollicitudin, a porta tellus tempor.',
     'Aliquam sodales ligula eu augue porta ullamcorper.',
     'Suspendisse in turpis id tellus mattis lobortis non non tortor.'].map(function (l) { return '<li>' + l + '</li>'; }).join('') +
    '</ul><p>It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.</p>';
  var BEN_HTML = '<ul>' + ['Nulla pharetra lorem in malesuada vestibulum.', 'Donec varius tortor sed libero tempor malesuada.',
    'Morbi accumsan justo eget sagittis tincidunt.', 'Cras pellentesque odio eget finibus vulputate.',
    'Nam blandit ipsum quis porta placerat.'].map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';

  var JOB_ROWS = [
    ['Job description', '<p>' + LOREM + '</p>'],
    ['Job requirements', REQ_HTML],
    ['Benefit', BEN_HTML],
    ['Job summary', '<p>' + LOREM + '</p>'],
    ['Education', '[Education Level]'],
    ['Experience level', '[Experience level]'],
    ['Minimum experience', '[Minimum Experience] years'],
    ['Gender', '[Male/Female]'],
    ['Age range', '[Age Range] years']
  ];

  function jobView() {
    return '<div class="jd-rows">' + JOB_ROWS.map(function (r) {
      return '<div class="jd-rows__k">' + r[0] + '</div><div class="jd-rows__v">' + r[1] + '</div>';
    }).join('') + '</div>';
  }

  function rte(label, cntId, html) {
    return '<div class="cj-fld" style="margin-top:22px"><label class="cj-fld__label">' + label + req + '</label>' +
      '<span class="cj-count" id="' + cntId + '">0/2500</span>' +
      '<div class="cj-rte" data-rte="Input text here" data-count="' + cntId + '" data-max="2500" data-html="' + encodeURIComponent(html) + '"></div></div>';
  }
  function jobEdit() {
    return rte('Job description', 'jdCntDesc', '<p>' + LOREM + '</p>') +
      rte('Job requirements', 'jdCntReq', REQ_HTML) +
      rte('Benefits', 'jdCntBen', BEN_HTML) +
      '<div class="cj-fld" style="margin-top:22px"><label class="cj-fld__label">Job summary' + req + '</label>' +
        '<span class="cj-count" id="jdCntSum">0/150</span>' +
        '<div class="ctl ctl--area"><textarea rows="3" maxlength="150" data-count="jdCntSum">' + LOREM.slice(0, 120) + '</textarea></div></div>' +
      '<div class="cj-grid" style="margin-top:24px">' +
        fld('Educations' + req, sel('[Education Level]', O.edu, true)) +
        fld('Experience level' + req, sel('[Experience level]', O.exp, true)) +
        fld('Min. experience' + req, '<div class="ctl"><input type="number" min="0" placeholder="[Minimum Experience]"><span class="ctl__suffix">Years</span></div>') +
        fld('Gender' + req, sel('[Male/Female]', O.gender, true)) +
        fld('Age range' + req, '<div class="cj-range"><div class="ctl"><input type="number" value="1"><span class="ctl__suffix">Years</span></div>' +
          '<span class="cj-range__dash">—</span><div class="ctl"><input type="number" value="31"><span class="ctl__suffix">Years</span></div></div>') +
      '</div>' + foot('job');
  }

  // ===================== tab 2 — application form =====================
  var FORM_GROUPS = [
    { title: 'Personal Information', fields: [
      { n: 'First name', t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1 },
      { n: 'Last name', t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1 },
      { n: 'Email address', t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1 },
      { n: 'Phone number', t: 'Short answer', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1 },
      { n: 'Place of birth', t: 'Short answer', on: 1, m: 1, lock: 1 },
      { n: 'Date of birth', t: 'Short answer', on: 1, m: 1, lock: 1 },
      { n: 'Gender', t: 'Multiple choice', on: 1, m: 1 },
      { n: 'Marital status', t: 'Dropdown', on: 1, m: 1 },
      { n: 'Blood type', t: 'Dropdown', on: 1, m: 1 },
      { n: 'Religion', t: 'Dropdown', on: 1, m: 1 }
    ] },
    { title: 'Identity & Address', fields: [
      { n: 'NIK (NPWP 16 digits)', t: 'Short answer', on: 1, m: 1, lock: 1 },
      { n: 'Passport number', t: 'Short answer', on: 0, lock: 1 },
      { n: 'Passport expiration date', t: 'Date', on: 0 },
      { n: 'Postal code', t: 'Short answer', on: 0 },
      { n: 'Citizen ID address', t: 'Paragraph', on: 1, m: 1, lock: 1 },
      { n: 'Residential address', t: 'Paragraph', on: 1, m: 1, lock: 1 }
    ] },
    { title: 'Education & Work Experience', fields: [
      { n: 'Formal education', t: 'Candidate can input more than one data', info: 1, on: 1, m: 0 },
      { n: 'Informal education', t: 'Candidate can input more than one data', info: 1, on: 1, m: 0 },
      { n: 'Work experience', t: 'Candidate can input more than one data', info: 1, on: 1, m: 0 }
    ] },
    { title: 'Compensation', fields: [
      { n: 'Current salary per month', t: 'Short answer', on: 1, m: 0, lock: 1 },
      { n: 'Expected salary per month', t: 'Short answer', on: 1, m: 1, lock: 1 }
    ] },
    { title: 'Attachment', fields: [
      { n: 'Profile picture', t: 'File upload', on: 1, m: 1, lock: 1, map: 1 },
      { n: 'Portofolio', t: 'File upload', info: 1, on: 1, m: 0, map: 1 },
      { n: 'Resume', t: 'File upload', on: 1, lockOn: 1, m: 1, mLock: 1, lock: 1, map: 1 }
    ] }
  ];

  function formView() {
    return FORM_GROUPS.map(function (g) {
      return '<div class="jd-grp">' + g.title + '</div>' + g.fields.map(function (f) {
        return '<div class="jd-frow"><div>' +
          '<span class="jd-frow__name">' + f.n + (f.lock ? ic('lock') : '') + '</span>' +
          '<span class="jd-frow__type">' + f.t + (f.info ? ic('info') : '') + '</span>' +
          (f.on && f.m !== undefined ? '<span class="jd-frow__req">' + (f.m ? 'Mandatory' : 'Optional') + '</span>' : '') +
          '</div>' +
          (f.on ? '<span class="jd-state jd-state--on">' + ic('square-check-big') + 'Enabled</span>'
                : '<span class="jd-state jd-state--off">' + ic('square-x') + 'Disabled</span>') +
        '</div>';
      }).join('');
    }).join('') +
    '<div class="jd-grp">Custom questions</div><p class="jd-empty">No custom question</p>';
  }

  function formEdit() {
    var rows = FORM_GROUPS.map(function (g) {
      return '<div class="cj-grp">' + g.title + '</div>' + g.fields.map(function (f) {
        var mand = (f.m === undefined) ? '' : ck(f.m, f.mLock, 'Mandatory');
        var map = f.map ? '<label class="cj-inline-check" data-map-toggle style="margin-top:2px">' +
          '<span class="checkbox"><input type="checkbox"><span class="checkbox__box"></span></span>Map to employee file category</label>' +
          '<div class="cj-map" data-map-panel hidden><span class="cj-map__label">File category to map</span>' + sel('Select file category', O.fileCat, true) + '</div>' : '';
        return '<div class="cj-row' + (f.on ? '' : ' is-off') + '"><div class="cj-row__main">' +
          '<span class="cj-row__name">' + f.n + (f.lock ? ic('lock') : '') + '</span>' +
          '<span class="cj-row__type">' + f.t + (f.info ? ic('info') : '') + '</span>' + mand + map + '</div>' +
          '<div class="cj-row__side">' + tg(f.on, f.lockOn) + '<span class="cj-row__state">' + (f.on ? 'Enabled' : 'Disabled') + '</span></div></div>';
      }).join('');
    }).join('');
    return rows +
      '<div class="cj-grp">Custom questions</div>' +
      '<p class="cj-sec__desc" style="margin:0 0 12px">Create custom questions to get more information from the candidate.</p>' +
      '<div id="jdQList"></div>' +
      '<div class="cj-addwrap"><button class="add-filter" type="button" id="jdAddQuestion">' + ic('circle-plus') + 'Add Question</button></div>' +
      foot('form');
  }

  // ---- custom question card (edit mode only) ----
  var Q_TYPES = ['Short Answer', 'Paragraph', 'Yes/No', 'Dropdown', 'Multiple Choice', 'Checkbox', 'Date', 'Number', 'File Upload'];
  var qSeq = 0;
  function questionHTML() {
    qSeq++;
    return '<div class="cj-q" data-q="' + qSeq + '">' +
      '<div class="cj-q__grab">' + ic('grip-vertical', 'cj-drag') + '</div>' +
      '<div class="cj-q__top"><div class="ctl"><input type="text" placeholder="Question"></div>' + sel('Select answer type', Q_TYPES, true) + '</div>' +
      '<div class="ctl ctl--area cj-q__desc"><textarea rows="3" placeholder="Description (Optional)"></textarea></div>' +
      '<div class="cj-q__foot"><div class="cj-q__flags">' +
        '<label class="cj-tgline">' + tg(1, 0, 1) + 'Required</label>' +
        '<label class="cj-tgline" data-cf-toggle>' + tg(0, 0, 1) + 'Map to employee custom field' + ic('info') + '</label>' +
        '<div class="cj-map" data-cf-panel hidden><span class="cj-map__label">Custom field to map</span>' + sel('Select custom field', O.customField, true) + '</div>' +
      '</div><div class="cj-q__acts">' +
        '<button class="cj-iconbtn cj-iconbtn--danger" type="button" data-qdel aria-label="Delete question">' + ic('trash-2') + '</button>' +
      '</div></div></div>';
  }

  // ===================== tab 3 — hiring stages =====================
  var STAGE_DATA = [
    { t: 'New candidates', d: 'A preliminary phase where recent applicant profiles are compiled.',
      s: [{ n: 'New candidates', d: 'Compolation of new applied candidates', chip: 'Move stage', hub: 1 }] },
    { t: 'Screening', d: 'A preliminary stage where recent candidate profiles are reviewed.',
      s: [{ n: 'Candidate review', d: 'Review of the candidate\u2019s CV', chip: 'Move stage' }] },
    { t: 'In process', d: 'A stage where shortlisted candidates are assessed and interviewed.',
      proc: [
        { name: 'Assessment', s: [
          { n: 'Personality test', d: 'Personal characteristics assessment', chip: 'Invite for assestment', assign: 1 },
          { n: 'Skill test', d: 'Knowledge & job skills assessment', chip: 'Invite for assestment', assign: 1 },
          { n: 'Medical checkup', d: 'Pre employment health check', chip: 'Invite for assestment', assign: 1 }] },
        { name: 'Interview', s: [
          { n: 'HR interview', d: 'First-round interview screening', chip: 'Schedule interview', assign: 1 },
          { n: 'User interview', d: 'Second-round in-depth interview', chip: 'Schedule interview', assign: 1 },
          { n: 'Manager interview', d: 'High-level evaluation', chip: 'Schedule interview', assign: 1 }] }
      ] },
    { t: 'Job offer', d: 'The process where job offers are drafted, negotiated, and finalized with candidates.',
      s: [{ n: 'Awaiting offer', d: 'Preparing the job offer for the candidate', chip: 'Create offer' },
          { n: 'Offer sent', d: 'Job offer sent to the candidate', chip: 'Move stage' },
          { n: 'Offer accepted', d: 'Candidate has accepted the job offer', chip: 'Move stage' }] },
    { t: 'Final status', d: 'The stage where final decisions on candidates are made.', nonum: 1,
      s: [{ n: 'Hired', d: 'Candidate successfully hired' }, { n: 'Rejected', d: 'Candidate not selected' },
          { n: 'Archived', d: 'Candidate archived for future reference' }, { n: 'Spam', d: 'Application marked as spam' },
          { n: 'Blocked', d: 'Candidate blocked from further consideration' },
          { n: 'Withdrawn', d: 'Candidate has withdrawn from the process' }] }
  ];

  // ---- read view ----
  function hubReadRows() {
    return '<div class="jd-stage__rules">' +
      '<div class="jd-rule"><label class="cj-tgline">' + tg(0, 1, 1) + 'Assign assessment to this stage</label>' +
        '<span class="jd-rule__k">Assigned assesment</span><span class="jd-rule__v">Recruitment Test</span></div>' +
      '<div class="jd-rule"><label class="cj-tgline">' + tg(0, 1, 1) + 'Auto-reject by AI score</label>' +
        '<p class="jd-rule__note">Candidates with an AI Candidate Score below your set threshold will be automatically <strong>rejected</strong>.</p></div>' +
      '<div class="jd-rule"><label class="cj-tgline">' + tg(0, 1, 1) + 'Auto-reject by test score</label>' +
        '<p class="jd-rule__note">Automatically reject candidates who do not meet the minimum required assessment score.</p></div>' +
    '</div>';
  }
  function readCard(s, num) {
    return '<div class="jd-stagecard' + (s.hub ? ' jd-stagecard--hub' : '') + '">' +
      (num ? '<span class="jd-badge">Stage ' + num + '</span>' : '<span class="jd-badge jd-badge--blank"></span>') +
      '<div class="jd-stagecard__body"><span class="jd-stagecard__name">' + s.n + '</span>' +
      (s.d ? '<p class="jd-stagecard__desc">' + s.d + '</p>' : '') +
      (s.chip ? '<span class="cj-chip">' + s.chip + '</span>' : '') +
      (s.hub ? hubReadRows() : '') + '</div></div>';
  }

  // ---- edit view ----
  function hubEditCard() {
    return '<div class="cj-stage"><div class="cj-stage__body">' +
      '<span class="cj-stage__name">New candidates</span>' +
      '<p class="cj-stage__desc">Compolation of new applied candidates</p>' +
      '<span class="cj-chip">Move stage</span>' +
      '<div class="cj-stage__opt"><label class="cj-tgline">' + tg(1, 0, 1) + 'Assign assessment to this stage</label>' +
        '<span class="cj-map__label" style="margin-top:4px">Assessment name' + req + '</span>' +
        sel('[Assessment name]', O.assessment, true) + '</div>' +
      '<div class="cj-stage__opt"><div class="cj-stage__optrow"><div>' +
        '<label class="cj-tgline">' + tg(1, 0, 1) + 'Auto-reject by test score</label>' +
        '<p class="cj-stage__desc" style="margin:5px 0 0 28px">Automatically reject candidates who do not meet the minimum required assessment score.</p>' +
        '<div class="cj-subline" style="margin-top:7px">' + ic('gauge') + '<span>If the candidate\u2019s score is <strong>less than 70%</strong></span></div>' +
        '<div class="cj-subline" style="margin-top:5px">' + ic('mail') + '<span><strong>Send rejection email</strong> automatically</span></div>' +
      '</div><button class="rowbtn" type="button" data-manage-reject>Manage</button></div></div>' +
    '</div></div>';
  }
  function editCard(s) {
    return '<div class="cj-stage">' + ic('grip-vertical', 'cj-drag') + '<div class="cj-stage__body">' +
      '<span class="cj-stage__name">' + s.n + '</span>' +
      (s.d ? '<p class="cj-stage__desc">' + s.d + '</p>' : '') +
      (s.chip ? '<span class="cj-chip">' + s.chip + '</span>' : '') +
      (s.assign ? '<div class="cj-stage__opt"><label class="cj-tgline">' + tg(0, 0, 1) + 'Assign assessment to this stage</label></div>' : '') +
    '</div></div>';
  }
  function procHTML(p) {
    return '<div class="cj-proc"><div class="cj-proc__head">' + ic('grip-vertical', 'cj-drag') +
      '<span class="cj-proc__name">' + p.name + '</span>' + ic('chevron-up', 'cj-proc__chev') + '</div>' +
      '<div class="cj-proc__body">' + p.s.map(editCard).join('') +
      '<div class="cj-addwrap"><button class="add-filter" type="button" data-addstage>' + ic('circle-plus') + 'Add Stage</button></div>' +
      '</div></div>';
  }

  function stagesHTML(edit) {
    var num = 0;
    return STAGE_DATA.map(function (g) {
      var body;
      if (g.proc) {
        body = edit
          ? g.proc.map(procHTML).join('') +
            '<div class="cj-addwrap" style="margin-top:12px"><button class="add-filter" type="button" data-addprocess>' + ic('circle-plus') + 'Add Process</button></div>'
          : g.proc.map(function (p) {
              return '<span class="jd-proclabel">' + p.name + '</span>' +
                p.s.map(function (s) { num++; return readCard(s, num); }).join('');
            }).join('');
      } else {
        body = g.s.map(function (s) {
          if (edit) return s.hub ? hubEditCard() : editCard(s);
          if (g.nonum) return readCard(s, 0);
          num++; return readCard(s, num);
        }).join('');
      }
      return '<section class="cj-stagegrp"><span class="cj-stagegrp__title">' + g.t + '</span>' +
        '<p class="cj-stagegrp__desc">' + g.d + '</p>' + body + '</section>';
    }).join('') + (edit ? foot('stages') : '');
  }
  function emptyStage() {
    return '<div class="cj-stage">' + ic('grip-vertical', 'cj-drag') + '<div class="cj-stage__body">' +
      sel('Select stage name', O.stageName, true) +
      '<div class="cj-stage__opt"><label class="cj-tgline">' + tg(0, 0, 1) + 'Assign assessment to this stage</label></div></div></div>';
  }

  // ===================== tab 4 — hiring team =====================
  var ROLES = [
    { label: 'Recruiter', btn: 'Add Recruiter', people: [{ n: 'CP060 - Mitsui Tiga', m: 'Jakarta | IT Staff - SQA' }] },
    { label: 'Hiring Manager', btn: 'Add Hiring Manager', people: [{ n: 'CP060 - Mitsui Tiga', m: 'Jakarta | IT Staff - SQA' }] },
    { label: 'Interviewer', btn: 'Add Interviewer', people: [{ n: 'CP060 - Mitsui Tiga', m: 'Jakarta | IT Staff - SQA' }] }
  ];
  function initials(n) {
    var p = String(n).split(' - ').pop().split(' ');
    return ((p[0] || '')[0] || '') + ((p[1] || '')[0] || '');
  }
  function teamHTML(edit) {
    return ROLES.map(function (r) {
      if (!edit) {
        return '<div class="jd-teamread">' +
          '<span class="jd-teamread__role">' + r.label + '</span>' +
          '<div class="jd-teamread__people">' + r.people.map(function (p) {
            return '<div class="jd-person"><span class="jd-person__av">' + initials(p.n) + '</span>' +
              '<span><span class="jd-person__name">' + p.n + '</span><span class="jd-person__meta">' + p.m + '</span></span></div>';
          }).join('') + '</div></div>';
      }
      return '<section class="cj-teamgrp"><span class="cj-teamgrp__label">' + r.label + '</span>' +
        '<div class="cj-teamrows" data-rows>' + r.people.map(function (p) {
          return '<div class="cj-teamrow"><div class="cj-person"><span class="cj-av">' + initials(p.n) + '</span>' + p.n + '</div>' +
            '<button class="pc-delrow" type="button" data-teamdel aria-label="Remove member">' + ic('x') + '</button></div>';
        }).join('') + '</div>' +
        '<button class="add-filter" type="button" data-addmember>' + ic('circle-plus') + r.btn + '</button></section>';
    }).join('') + (edit ? foot('team') : '');
  }
  function pickerRow() {
    return '<div class="cj-teamrow">' + sel('Select employee', O.people, true) +
      '<button class="pc-delrow" type="button" data-teamdel aria-label="Remove member">' + ic('x') + '</button></div>';
  }

  // ===================== tab 5 — publication platform =====================
  var PLATFORMS = [{ n: 'Career page', on: 1 }, { n: 'LinkedIn', on: 1 }, { n: 'JobStreet', on: 1 }, { n: 'Indeed', on: 1 }];
  var PROMO = '<div class="cj-promo" id="jdPromo">' +
    '<div class="cj-promo__art">Illustration — publication platforms</div>' +
    '<div><h3 class="cj-promo__title">Attract more candidates by integrating with publication platforms</h3>' +
    '<p class="cj-promo__text">Integrate your job platforms with SEVAKA Recruitment to attract more candidates and improve your hiring process.</p></div>' +
    '<button class="cj-promo__x" type="button" data-promo-x aria-label="Dismiss">' + ic('x') + '</button></div>';
  function platHTML(edit) {
    var rows = PLATFORMS.map(function (p) {
      if (!edit) {
        return '<div class="jd-plat"><span class="jd-plat__name">' + p.n + '</span>' +
          (p.on ? '<span class="jd-state jd-state--on">' + ic('square-check-big') + 'Enabled</span>'
                : '<span class="jd-state jd-state--off">' + ic('square-x') + 'Disabled</span>') + '</div>';
      }
      return '<div class="cj-plat"><span class="cj-plat__name">' + p.n + '</span>' +
        '<div class="cj-plat__side">' + tg(p.on, 0) + '<span class="cj-plat__state">' + (p.on ? 'Enabled' : 'Disabled') + '</span></div></div>';
    }).join('');
    return (edit ? PROMO : '') + rows + (edit ? foot('plat') : '');
  }

  // ===================== rich-text editor =====================
  var RTE_BAR = [
    { c: 'undo', cmd: 'undo' }, { c: 'redo', cmd: 'redo' }, { s: 1 },
    { pick: 'Normal text' }, { pickIcon: 'align-left' }, { color: 1 }, { s: 1 },
    { c: 'bold', cmd: 'bold' }, { c: 'italic', cmd: 'italic' }, { c: 'underline', cmd: 'underline' },
    { c: 'strikethrough', cmd: 'strikeThrough' }, { c: 'code', cmd: '' }, { c: 'remove-formatting', cmd: 'removeFormat' }, { s: 1 },
    { c: 'list', cmd: 'insertUnorderedList' }, { c: 'list-ordered', cmd: 'insertOrderedList' }, { s: 1 },
    { c: 'link', cmd: '' }, { c: 'image', cmd: '' }, { c: 'code-xml', cmd: '' }, { c: 'quote', cmd: '' }, { c: 'minus', cmd: 'insertHorizontalRule' }
  ];
  function expandRTE(scope) {
    scope.querySelectorAll('.cj-rte[data-rte]').forEach(function (r) {
      var bar = RTE_BAR.map(function (b) {
        if (b.s) return '<span class="cj-rte__sep"></span>';
        if (b.pick) return '<button class="cj-rte__pick" type="button">' + b.pick + ic('chevron-down') + '</button>';
        if (b.pickIcon) return '<button class="cj-rte__pick" type="button">' + ic(b.pickIcon) + ic('chevron-down') + '</button>';
        if (b.color) return '<button class="cj-rte__pick" type="button"><span class="cj-rte__swatch"></span>' + ic('chevron-down') + '</button>';
        return '<button class="cj-rte__btn" type="button"' + (b.cmd ? ' data-cmd="' + b.cmd + '"' : '') + '>' + ic(b.c) + '</button>';
      }).join('');
      var cnt = r.getAttribute('data-count'), html = r.getAttribute('data-html');
      r.innerHTML = '<div class="cj-rte__bar">' + bar + '</div>' +
        '<div class="cj-rte__area" contenteditable="true" data-ph="' + r.getAttribute('data-rte') + '"' +
        (cnt ? ' data-count="' + cnt + '" data-max="' + r.getAttribute('data-max') + '"' : '') + '>' +
        (html ? decodeURIComponent(html) : '') + '</div>';
      r.removeAttribute('data-count'); r.removeAttribute('data-rte');
      var area = r.querySelector('.cj-rte__area');
      r.querySelectorAll('[data-cmd]').forEach(function (b) {
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { area.focus(); document.execCommand(b.getAttribute('data-cmd')); });
      });
    });
  }

  // ===================== block plumbing =====================
  var BLOCKS = {
    sum: { host: 'jdSummary', view: summaryView, edit: summaryEdit },
    job: { host: 'jdJobBody', view: jobView, edit: jobEdit },
    form: { host: 'jdFormBody', view: formView, edit: formEdit },
    stages: { host: 'jdStagesBody', view: function () { return stagesHTML(0); }, edit: function () { return stagesHTML(1); } },
    team: { host: 'jdTeamBody', view: function () { return teamHTML(0); }, edit: function () { return teamHTML(1); } },
    plat: { host: 'jdPlatBody', view: function () { return platHTML(0); }, edit: function () { return platHTML(1); } }
  };

  function render(key, mode) {
    var b = BLOCKS[key], host = document.getElementById(b.host);
    if (!host) return;
    host.innerHTML = mode === 'edit' ? b.edit() : b.view();
    host.setAttribute('data-mode', mode);
    var btn = document.querySelector('[data-edit="' + key + '"]');
    if (btn) btn.hidden = mode === 'edit';
    expandRTE(host);
    window.Flow.wireSelects(host);
    // character counters
    host.querySelectorAll('[data-count]').forEach(function (el) {
      var out = document.getElementById(el.getAttribute('data-count'));
      if (!out) return;
      var max = el.getAttribute('maxlength') || el.getAttribute('data-max');
      var upd = function () {
        var len = el.value !== undefined ? el.value.length : el.textContent.length;
        out.textContent = len + '/' + max;
      };
      el.addEventListener('input', upd); upd();
    });
    if (window.lucide) window.lucide.createIcons();
  }

  function wire() {
    Object.keys(BLOCKS).forEach(function (k) { render(k, 'view'); });

    // tabs
    document.querySelectorAll('.jd-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        var id = t.getAttribute('data-tab');
        document.querySelectorAll('.jd-tab').forEach(function (x) { x.classList.toggle('is-on', x === t); });
        document.querySelectorAll('.jd-panel').forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-tab') === id); });
      });
    });

    document.addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]');
      if (ed) { render(ed.getAttribute('data-edit'), 'edit'); return; }
      var cn = e.target.closest('[data-cancel]');
      if (cn) { render(cn.getAttribute('data-cancel'), 'view'); return; }
      var sv = e.target.closest('[data-save]');
      if (sv) { render(sv.getAttribute('data-save'), 'view'); window.Flow.toast('Changes saved.', 'ok'); return; }
      var q = e.target.closest('#jdAddQuestion');
      if (q) {
        var list = document.getElementById('jdQList');
        list.insertAdjacentHTML('beforeend', questionHTML());
        window.Flow.wireSelects(list.lastElementChild);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      var qd = e.target.closest('[data-qdel]');
      if (qd) { qd.closest('.cj-q').remove(); return; }
      var ap = e.target.closest('[data-addprocess]');
      if (ap) {
        ap.parentNode.insertAdjacentHTML('beforebegin', procHTML({ name: 'New process', s: [] }));
        window.Flow.wireSelects(ap.parentNode.previousElementSibling);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      if (e.target.closest('[data-promo-x]')) { document.getElementById('jdPromo').remove(); return; }
      if (e.target.closest('[data-manage-reject]')) { window.Flow.toast('Auto-rejection settings open here.', 'info'); return; }
      var ph = e.target.closest('.cj-proc__head');
      if (ph) { ph.parentNode.classList.toggle('is-collapsed'); return; }
      var as = e.target.closest('[data-addstage]');
      if (as) {
        as.parentNode.insertAdjacentHTML('beforebegin', emptyStage());
        window.Flow.wireSelects(as.parentNode.previousElementSibling);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      var td = e.target.closest('[data-teamdel]');
      if (td) {
        var rows = td.closest('[data-rows]');
        if (rows.children.length === 1) { window.Flow.toast('At least one member is required for this role.', 'info'); return; }
        td.closest('.cj-teamrow').remove(); return;
      }
      var am = e.target.closest('[data-addmember]');
      if (am) {
        var h = am.previousElementSibling;
        h.insertAdjacentHTML('beforeend', pickerRow());
        window.Flow.wireSelects(h.lastElementChild);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      if (e.target.closest('#jdAddCandidate')) { window.location.href = 'recruitment-add-candidate.html'; return; }
      if (e.target.closest('#jdPreview')) { window.Flow.toast('Opening the public preview of this listing.', 'info'); return; }
    });

    // toggles inside edit views
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t.type !== 'checkbox') return;
      var side = t.closest('.cj-row__side');
      if (side) {
        side.closest('.cj-row').classList.toggle('is-off', !t.checked);
        side.querySelector('.cj-row__state').textContent = t.checked ? 'Enabled' : 'Disabled';
        return;
      }
      var mapT = t.closest('[data-map-toggle]');
      if (mapT) { mapT.parentNode.querySelector('[data-map-panel]').hidden = !t.checked; return; }
      var plat = t.closest('.cj-plat__side');
      if (plat) { plat.querySelector('.cj-plat__state').textContent = t.checked ? 'Enabled' : 'Disabled'; return; }
      var cfT = t.closest('[data-cf-toggle]');
      if (cfT) { cfT.parentNode.querySelector('[data-cf-panel]').hidden = !t.checked; return; }
    });

    if (window.lucide) window.lucide.createIcons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
