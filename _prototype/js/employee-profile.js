/* =========================================================================
   SEVAKA HRIS — Employee Profile (ESS self-service)
   Self-contained logic for all 7 menus. Simulates the doc contracts against
   the "Budi Santoso" positive-flow dataset (FSD/UIC/TSD-001-PROFILE).
   Runs AFTER shell.js + dashboard.js + flow-common.js.
   ========================================================================= */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function icons(){ if (window.lucide) window.lucide.createIcons(); }
  var F = window.Flow;

  // ---- enums (value → label) ----------------------------------------------
  var ENUM = {
    nationality:   [['CITIZEN','Citizen (WNI)'],['FOREIGNER','Foreigner (WNA)']],
    gender:        [['MALE','Male'],['FEMALE','Female']],
    last_education:[['ELEMENTARY','Elementary (SD)'],['JUNIOR_HIGH','Junior High (SMP)'],['SENIOR_HIGH','Senior High (SMA/SMK)'],['DIPLOMA','Diploma (D1–D4)'],['BACHELOR','Bachelor (S1)'],['MASTER','Master (S2)'],['DOCTORATE','Doctorate (S3)'],['PROFESSOR','Professor']],
    blood_type:    [['A','A'],['B','B'],['AB','AB'],['O','O'],['OTHER','Other']],
    religion:      [['ISLAM','Islam'],['CHRISTIAN','Christian'],['CATHOLIC','Catholic'],['HINDU','Hindu'],['BUDDHA','Buddha'],['CONFUCIAN','Confucian'],['OTHER','Other']],
    home_ownership_status:[['OWNED','Owned'],['RENTED','Rented'],['BOARDING_HOUSE','Boarding house'],['WITH_PARENTS','With parents']],
    disability_status:[['NONE','None'],['PHYSICAL','Physical'],['SENSORY','Sensory'],['MENTAL','Mental'],['INTELLECTUAL','Intellectual']],
    marital_status:[['SINGLE','Single'],['MARRIED','Married'],['DIVORCED','Divorced'],['WIDOWED','Widowed']],
    relationship_type:[['SPOUSE','Spouse'],['CHILD','Child'],['PARENT','Parent'],['SIBLING','Sibling'],['OTHER','Other']],
    job:[['CIVIL_SERVANT','Pegawai Negeri (PNS)'],['PRIVATE_EMPLOYEE','Pegawai Swasta'],['ENTREPRENEUR','Wiraswasta'],['PROFESSIONAL','Profesional'],['STUDENT','Pelajar / Mahasiswa'],['RETIRED','Pensiunan'],['HOMEMAKER','Ibu Rumah Tangga'],['OTHER','Other']],
    training_category:[['TECHNICAL','Technical'],['SOFT_SKILL','Soft Skill'],['LEADERSHIP','Leadership'],['COMPLIANCE','Compliance'],['CERTIFICATION','Certification'],['OTHER','Other']]
  };
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function enumLabel(k, v){ var f = (ENUM[k]||[]).filter(function(o){ return o[0]===v; })[0]; return f ? f[1] : (v||'—'); }

  // ---- dataset (positive-flow: Budi Santoso) ------------------------------
  var profile = {
    // HOT — mst_employee_profile
    nationality:'CITIZEN', npwp:'01.234.567.8-901.000', npwp_name:'Budi Santoso',
    is_domicile_same_as_id_card:true,
    id_card_address:'Jl. Merdeka No. 1, Bandung', domicile_address:'Jl. Merdeka No. 1, Bandung',
    id_card_zip:{zip:'40111',timezone:'Asia/Jakarta'}, domicile_zip:{zip:'40111',timezone:'Asia/Jakarta'},
    photo_ref:'7c1f9b6e-doc', id_card_number:'3171021505900012',
    // COLD — mst_employee_personal
    passport_number:'', mother_maiden_name:'Siti Aminah',
    date_of_birth:'1990-05-12', place_of_birth:'Bandung',
    gender:'MALE', last_education:'BACHELOR', blood_type:'O', religion:'ISLAM',
    home_ownership_status:'OWNED', disability_status:'NONE', marital_status:'SINGLE',
    personal_phone:'081234567890', personal_email:'budi.santoso@mail.com',
    signature:'', other_nik:''
  };

  var relatives = [
    { id:'r1', name:'Ani Santoso',     relationship_type:'SPOUSE', phone_number:'081299990000', email:'ani.santoso@mail.com', date_of_birth:'1992-03-04', job_id:'PRIVATE_EMPLOYEE', address:'Jl. Merdeka No. 1, Bandung', is_emergency_contact:true },
    { id:'r2', name:'Suryadi Santoso', relationship_type:'PARENT', phone_number:'081277778888', email:'',                     date_of_birth:'1962-08-20', job_id:'ENTREPRENEUR',     address:'Jl. Cihampelas No. 5, Bandung', is_emergency_contact:true },
    { id:'r3', name:'Dedi Santoso',    relationship_type:'CHILD',  phone_number:'081200003333', email:'',                     date_of_birth:'2015-06-10', job_id:'STUDENT',          address:'Jl. Merdeka No. 1, Bandung', is_emergency_contact:false }
  ];

  var trainings = [
    { id:'t1', training_name:'AWS Solutions Architect', training_sponsor:'Amazon Web Services', training_category:'CERTIFICATION', graduation_score:'92.50', graduation_grade:'A', training_cost:'5000000', start_year:'2023', end_year:'2023', certificate_expiry_date:'2026-06-30', training_certificate:'doc-aws' },
    { id:'t2', training_name:'K3 Dasar (Basic OHS)',    training_sponsor:'Kemnaker RI',        training_category:'COMPLIANCE',    graduation_score:'', graduation_grade:'B', training_cost:'1500000', start_year:'2024', end_year:'2024', certificate_expiry_date:'2028-06-30', training_certificate:'doc-k3' },
    { id:'t3', training_name:'Leadership Dasar',        training_sponsor:'LMA Indonesia',      training_category:'LEADERSHIP',    graduation_score:'', graduation_grade:'', training_cost:'', start_year:'2022', end_year:'2022', certificate_expiry_date:'', training_certificate:'' }
  ];

  var works = [
    { id:'w1', company_name:'PT Maju Jaya',        position:'Backend Engineer',   join_date:'2018-03-01', leave_date:'2020-06-01', job_description:'Built and maintained internal REST APIs.', employment_certificate:'doc-mj' },
    { id:'w2', company_name:'PT Nusantara Digital', position:'Staff Administrasi', join_date:'2015-08-01', leave_date:'2017-06-01', job_description:'', employment_certificate:'' }
  ];

  var actor = 'ESS';                                   // ESS | HR
  var revealed = false;                                // PII reveal state
  var HR_RESTRICTED = ['nationality','marital_status'];

  // ---- formatting ---------------------------------------------------------
  function fmtDate(iso){ return F.fmtDate(iso); }
  function fmtMonthYear(iso){ if(!iso) return '—'; var p=iso.split('-'); return MONTHS[+p[1]-1]+' '+p[0]; }
  function money(v){ if(v===''||v==null) return '—'; return 'Rp ' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g,'.'); }
  function maskId(n){ if(!n) return '—'; return n.slice(0,4) + '••••••••' + n.slice(-4); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function isExpired(iso){ if(!iso) return false; return new Date(iso) < new Date(); }

  // =========================================================================
  //  FIELD BUILDER — standard .fld / .ctl markup from a config object
  // =========================================================================
  function chev(){ return '<svg class="ctl__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>'; }
  function errEl(msg){ return '<span class="fld__err"><i data-lucide="alert-circle"></i>'+(msg||'This field is required.')+'</span>'; }

  function field(cfg){
    var cls = 'fld' + (cfg.wide ? ' fld--wide' : '') + (cfg.locked ? ' is-locked' : '');
    var req = cfg.req ? ' <span class="req">*</span>' : '';
    var lock = cfg.locked ? ' <span class="ep-locked-note"><i data-lucide="lock"></i>HR only</span>' : '';
    var help = cfg.help ? '<span class="ep-code" style="margin-top:5px;font-weight:500;color:var(--fg-4)">'+cfg.help+'</span>' : '';
    var inner = '';
    var v = cfg.value == null ? '' : cfg.value;

    if (cfg.type === 'select') {
      var opts = (cfg.opts || ENUM[cfg.field] || []).map(function(o){
        return '<div class="dropdown__opt'+(o[0]===v?' is-sel':'')+'" data-val="'+esc(o[0])+'">'+esc(o[1])+'</div>';
      }).join('');
      var lbl = v ? enumLabelFor(cfg, v) : (cfg.placeholder || 'Select');
      inner = '<div class="ctl ctl--select" data-field="'+cfg.field+'"><span class="ctl__value'+(v?' has-value':'')+'" data-placeholder="'+(cfg.placeholder||'Select')+'">'+esc(lbl)+'</span>'+chev()+'<div class="dropdown">'+opts+'</div></div>';
    } else if (cfg.type === 'textarea') {
      inner = '<div class="ctl ctl--area"><textarea data-field="'+cfg.field+'" rows="3" placeholder="'+(cfg.placeholder||'')+'">'+esc(v)+'</textarea></div>';
    } else if (cfg.type === 'money') {
      inner = '<div class="pp-money" data-field="'+cfg.field+'"><span class="pp-money__cur">RP</span><input type="text" inputmode="numeric" value="'+esc(v)+'" placeholder="'+(cfg.placeholder||'0')+'"></div>';
    } else if (cfg.type === 'file') {
      var has = v ? ' has-file' : '';
      inner = '<div class="file-ctl" data-field="'+cfg.field+'" data-doc="'+esc(v)+'"><span class="file-ctl__btn">Choose file</span><span class="file-ctl__name'+has+'">'+(v?esc(cfg.filename||'document.pdf'):(cfg.placeholder||'No file chosen'))+'</span></div>';
    } else if (cfg.type === 'toggle') {
      return '<div class="ep-toggle fld--wide" data-fld="'+cfg.field+'"><div class="ep-toggle__text"><div class="ep-toggle__t">'+cfg.label+'</div><div class="ep-toggle__d">'+(cfg.help||'')+'</div></div><button type="button" class="ep-switch'+(v?' is-on':'')+'" data-field="'+cfg.field+'" data-toggle aria-pressed="'+(v?'true':'false')+'"></button></div>';
    } else if (cfg.type === 'monthyear') {
      var mo = v ? String(+v.split('-')[1]) : '';
      var yr = v ? v.split('-')[0] : '';
      var moOpts = MONTHS.map(function(m,i){ return '<div class="dropdown__opt'+((i+1)===+mo?' is-sel':'')+'" data-val="'+(i+1)+'">'+m+'</div>'; }).join('');
      inner = '<div class="ep-monthyear" data-field="'+cfg.field+'" data-my>'+
        '<div class="ctl ctl--select" data-part="month"><span class="ctl__value'+(mo?' has-value':'')+'" data-placeholder="Month">'+(mo?MONTHS[+mo-1]:'Month')+'</span>'+chev()+'<div class="dropdown">'+moOpts+'</div></div>'+
        '<div class="ctl"><input type="text" inputmode="numeric" maxlength="4" data-part="year" value="'+esc(yr)+'" placeholder="Year"></div></div>';
    } else { // text
      inner = '<div class="ctl"><input type="'+(cfg.inputType||'text')+'" data-field="'+cfg.field+'" value="'+esc(v)+'" placeholder="'+(cfg.placeholder||'')+'"'+(cfg.maxlength?' maxlength="'+cfg.maxlength+'"':'')+'></div>';
    }
    return '<div class="'+cls+'" data-fld="'+cfg.field+'"><label class="fld__label">'+cfg.label+req+lock+'</label>'+inner+help+errEl(cfg.errMsg)+'</div>';
  }
  function enumLabelFor(cfg, v){ if (cfg.opts){ var f=cfg.opts.filter(function(o){return o[0]===v;})[0]; return f?f[1]:v; } return enumLabel(cfg.field, v); }

  // read one form's values keyed by data-field
  function readForm(formEl){
    var out = {};
    $$('[data-fld]', formEl).forEach(function(fld){
      var key = fld.getAttribute('data-fld');
      var my = fld.matches('.ep-monthyear') ? fld : fld.querySelector('.ep-monthyear[data-field]');
      var ctl = fld.querySelector('[data-field]');
      if (my) {
        var mSel = my.querySelector('[data-part="month"] .dropdown__opt.is-sel');
        var yr = (my.querySelector('[data-part="year"]')||{}).value || '';
        var mo = mSel ? mSel.getAttribute('data-val') : '';
        out[key] = (mo && yr) ? (yr + '-' + String(mo).padStart(2,'0') + '-01') : '';
      } else if (fld.matches('.ep-toggle')) {
        out[key] = fld.querySelector('.ep-switch').classList.contains('is-on');
      } else if (ctl && ctl.classList.contains('ctl--select')) {
        var sel = ctl.querySelector('.dropdown__opt.is-sel');
        out[key] = sel ? sel.getAttribute('data-val') : '';
      } else if (ctl && ctl.classList.contains('pp-money')) {
        out[key] = (ctl.querySelector('input').value || '').replace(/\D/g,'');
      } else if (ctl && ctl.classList.contains('file-ctl')) {
        out[key] = ctl.getAttribute('data-doc') || '';
      } else if (ctl) {
        out[key] = (ctl.value || '').trim();
      }
    });
    return out;
  }
  function markErr(formEl, key, on){ var f = $('[data-fld="'+key+'"]', formEl); if (f) f.classList.toggle('is-err', !!on); }
  function clearErrs(formEl){ $$('.fld.is-err', formEl).forEach(function(f){ f.classList.remove('is-err'); }); }

  // populate a modal form, wire its selects/files/toggles, open it
  function mountForm(formId, html){
    var form = $('#'+formId);
    form.innerHTML = html;
    icons();
    F.wireSelects(form);
    wireFiles(form); wireToggles(form);
    return form;
  }
  function wireFiles(root){
    $$('.file-ctl', root).forEach(function(fc){
      if (fc.dataset.wired) return; fc.dataset.wired='1';
      fc.addEventListener('click', function(){
        fc.setAttribute('data-doc','doc-'+Date.now());
        var nm = fc.querySelector('.file-ctl__name'); nm.textContent = 'certificate.pdf'; nm.classList.add('has-file');
      });
    });
  }
  function wireToggles(root){
    $$('.ep-switch[data-toggle]', root).forEach(function(sw){
      if (sw.dataset.wired) return; sw.dataset.wired='1';
      sw.addEventListener('click', function(){ sw.classList.toggle('is-on'); sw.setAttribute('aria-pressed', sw.classList.contains('is-on')); });
    });
  }

  // =========================================================================
  //  SECTION SWITCHING
  // =========================================================================
  // group = subgroup under the sidebar's "General" umbrella (mirrors shell.js taxonomy)
  var SEC_META = {
    'basic-info':        { group:'Personal', leaf:'Basic Info' },
    'family':            { group:'Personal', leaf:'Family' },
    'emergency-contact': { group:'Personal', leaf:'Emergency Contact' },
    'formal-education':  { group:'Education & Experience', leaf:'Formal Education' },
    'informal-education':{ group:'Education & Experience', leaf:'Informal Education' },
    'working-experience':{ group:'Education & Experience', leaf:'Working Experience' },
    'additional-info':   { group:'Additional Info', leaf:'Additional Info' }
  };
  function showSection(sec, updateHash){
    if (!SEC_META[sec]) sec = 'basic-info';
    $$('.ep-sec').forEach(function(s){ s.classList.toggle('is-on', s.getAttribute('data-section')===sec); });
    $$('.ep-nav__item').forEach(function(b){ b.classList.toggle('is-on', b.getAttribute('data-sec')===sec); });
    var m = SEC_META[sec];
    $('#crumbGroup').textContent = m.group; $('#crumbLeaf').textContent = m.leaf;
    // Additional Info has no distinct subgroup — hide the extra crumb segment
    var subSep = $('#crumbSubSep'); if (subSep) subSep.style.display = (sec==='additional-info') ? 'none' : '';
    if (sec==='additional-info') $('#crumbGroup').style.display = 'none'; else $('#crumbGroup').style.display = '';
    // sync the global sidebar highlight to the matching leaf hash
    $$('.sidebar .sb-row--leaf').forEach(function(r){
      var h = (r.getAttribute('data-href')||'').toLowerCase();
      r.classList.toggle('is-on', h === ('employee-profile.html#'+sec));
    });
    if (updateHash) history.replaceState(null, '', '#'+sec);
    var scroll = document.querySelector('.app__scroll'); if (scroll) scroll.scrollTop = 0;
  }
  $('#epNav') && $('#epNav').addEventListener('click', function(e){
    var b = e.target.closest('.ep-nav__item'); if (!b) return;
    showSection(b.getAttribute('data-sec'), true);
  });

  // actor toggle (ESS ↔ HR) — affects HR-restricted locks
  $$('.scope-pill').forEach(function(p){
    p.addEventListener('click', function(){
      $$('.scope-pill').forEach(function(x){ x.classList.remove('is-on'); });
      p.classList.add('is-on'); actor = p.getAttribute('data-actor');
      F.toast(actor==='HR' ? 'Acting as HR Manager — restricted fields unlocked.' : 'Acting as Employee (self) — nationality & marital status are locked.', 'info');
    });
  });

  // =========================================================================
  //  1. BASIC INFO
  // =========================================================================
  function kvRow(k, v, cls){ return '<div class="kv__k">'+k+'</div><div class="kv__v '+(cls||'')+'">'+v+'</div>'; }
  function renderBasic(){
    var idCell = revealed
      ? '<span class="mono-val">'+profile.id_card_number+'</span> <span class="ep-code" style="color:var(--color-success-700)">· revealed</span>'
      : '<span class="mono-val">'+maskId(profile.id_card_number)+'</span> <button class="ep-reveal" id="biReveal" type="button"><i data-lucide="eye"></i>Reveal</button>';
    var motherCell = revealed
      ? '<span class="mono-val">'+esc(profile.mother_maiden_name)+'</span>'
      : '<span class="pii-hidden">hidden (KBA secret)</span>';
    $('#biHot').innerHTML =
      kvRow('Nationality', '<span class="sb sb--blue"><span class="sb__dot"></span>'+enumLabel('nationality',profile.nationality)+'</span>') +
      kvRow('KTP number', idCell, 'mono-val') +
      kvRow('NPWP', profile.npwp ? '<span class="mono-val">'+esc(profile.npwp)+'</span>' : '—') +
      kvRow('NPWP name', esc(profile.npwp_name)||'—') +
      kvRow('Domicile = KTP address', profile.is_domicile_same_as_id_card ? 'Yes' : 'No') +
      kvRow('KTP address', esc(profile.id_card_address)) +
      kvRow('Domicile address', esc(profile.domicile_address)) +
      kvRow('KTP postal code', '<span class="mono-val">'+esc(profile.id_card_zip.zip)+'</span> · '+esc(profile.id_card_zip.timezone)) +
      kvRow('Domicile postal code', '<span class="mono-val">'+esc(profile.domicile_zip.zip)+'</span> · '+esc(profile.domicile_zip.timezone)) +
      kvRow('Profile photo', profile.photo_ref ? '<span class="ep-cert"><i data-lucide="image"></i>uploaded</span>' : '<span class="ep-cert ep-cert--none">none</span>');
    $('#biCold').innerHTML =
      kvRow('Passport number', profile.passport_number ? '<span class="mono-val">'+esc(profile.passport_number)+'</span>' : '<span style="color:var(--fg-4)">— (only for foreigners)</span>') +
      kvRow('Mother’s maiden name', motherCell) +
      kvRow('Date of birth', fmtDate(profile.date_of_birth)) +
      kvRow('Place of birth', esc(profile.place_of_birth)) +
      kvRow('Gender', enumLabel('gender',profile.gender)) +
      kvRow('Last education', enumLabel('last_education',profile.last_education)) +
      kvRow('Blood type', profile.blood_type) +
      kvRow('Religion', enumLabel('religion',profile.religion)) +
      kvRow('Home ownership', enumLabel('home_ownership_status',profile.home_ownership_status)) +
      kvRow('Disability status', enumLabel('disability_status',profile.disability_status)) +
      kvRow('Marital status', '<span class="sb sb--blue"><span class="sb__dot"></span>'+enumLabel('marital_status',profile.marital_status)+'</span>') +
      kvRow('Personal phone', '<span class="mono-val">'+esc(profile.personal_phone)+'</span>') +
      kvRow('Personal email', esc(profile.personal_email)||'—') +
      kvRow('Other NIK', profile.other_nik ? '<span class="mono-val">'+esc(profile.other_nik)+'</span>' : '—');
    icons();
    var rb = $('#biReveal');
    if (rb) rb.addEventListener('click', function(){
      revealed = true; renderBasic();
      F.toast('Sensitive values revealed — one append-only read-audit row written (§6.6).', 'warn');
    });
  }

  function openBasicEdit(){
    var lockNat = actor === 'ESS';
    var isForeigner = profile.nationality === 'FOREIGNER';
    var html =
      field({field:'nationality', label:'Nationality', type:'select', req:true, value:profile.nationality, locked:lockNat}) +
      field({field:'marital_status', label:'Marital status', type:'select', req:true, value:profile.marital_status, locked:lockNat}) +
      field({field:'npwp', label:'NPWP', value:profile.npwp, placeholder:'01.234.567.8-901.000'}) +
      field({field:'npwp_name', label:'NPWP name', value:profile.npwp_name}) +
      field({field:'passport_number', label:'Passport number', value:profile.passport_number, placeholder:'A1234567', help:'Required when nationality = Foreigner (MbV).', errMsg:'Passport is required for a foreigner.'}) +
      field({field:'mother_maiden_name', label:'Mother’s maiden name', value:profile.mother_maiden_name}) +
      field({field:'date_of_birth', label:'Date of birth', inputType:'date', value:profile.date_of_birth, req:true}) +
      field({field:'place_of_birth', label:'Place of birth', value:profile.place_of_birth, req:true}) +
      field({field:'gender', label:'Gender', type:'select', req:true, value:profile.gender}) +
      field({field:'last_education', label:'Last education', type:'select', req:true, value:profile.last_education}) +
      field({field:'blood_type', label:'Blood type', type:'select', req:true, value:profile.blood_type}) +
      field({field:'religion', label:'Religion', type:'select', req:true, value:profile.religion}) +
      field({field:'home_ownership_status', label:'Home ownership', type:'select', req:true, value:profile.home_ownership_status}) +
      field({field:'disability_status', label:'Disability status', type:'select', req:true, value:profile.disability_status}) +
      field({field:'id_card_address', label:'KTP address', type:'textarea', req:true, value:profile.id_card_address, wide:true}) +
      field({field:'is_domicile_same_as_id_card', label:'Domicile same as KTP address', type:'toggle', value:profile.is_domicile_same_as_id_card, help:'When on, the domicile address mirrors the KTP address.'}) +
      field({field:'domicile_address', label:'Domicile address', type:'textarea', value:profile.domicile_address, wide:true}) +
      field({field:'personal_phone', label:'Personal phone', value:profile.personal_phone, placeholder:'0812…', help:'Contact only — not an auth/OTP channel.'}) +
      field({field:'personal_email', label:'Personal email', value:profile.personal_email, placeholder:'name@mail.com'}) +
      field({field:'other_nik', label:'Other NIK', value:profile.other_nik, placeholder:'Special-case dept only'});
    var form = mountForm('fBasic', html);
    // MbV: passport required only when FOREIGNER
    function syncMbV(){
      var natSel = form.querySelector('[data-fld="nationality"] .dropdown__opt.is-sel');
      var val = natSel ? natSel.getAttribute('data-val') : profile.nationality;
      $('[data-fld="passport_number"] .req', form) || (val==='FOREIGNER' && $('[data-fld="passport_number"] .fld__label', form));
      var lbl = $('[data-fld="passport_number"] .fld__label', form);
      if (lbl && val==='FOREIGNER' && !lbl.querySelector('.req')) lbl.insertAdjacentHTML('beforeend',' <span class="req">*</span>');
      if (lbl && val!=='FOREIGNER'){ var r=lbl.querySelector('.req'); if(r) r.remove(); }
    }
    syncMbV();
    var natCtl = $('[data-fld="nationality"] .ctl--select', form);
    if (natCtl) natCtl.addEventListener('select', syncMbV);
    F.openModal('mBasic');
  }
  $('#biEdit').addEventListener('click', openBasicEdit);

  // =========================================================================
  //  2/3. FAMILY + EMERGENCY CONTACT (mst_relative)
  // =========================================================================
  function relBadge(r){ return '<span class="ep-tag">'+enumLabel('relationship_type', r.relationship_type)+'</span>'; }

  var famQuery = '', famRel = '', ecQuery = '';
  function renderFamily(){
    var head = '<thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th><th class="ta-c">Emergency?</th><th class="ta-r"></th></tr></thead>';
    var rows = relatives.filter(function(r){
      return (!famQuery || r.name.toLowerCase().indexOf(famQuery)>-1) && (!famRel || r.relationship_type===famRel);
    });
    var body = rows.map(function(r){
      return '<tr>'+
        '<td class="cell-strong">'+esc(r.name)+'</td>'+
        '<td>'+relBadge(r)+'</td>'+
        '<td class="cell-mono">'+esc(r.phone_number)+'</td>'+
        '<td class="'+(r.email?'':'cell-dim')+'">'+(r.email?esc(r.email):'—')+'</td>'+
        '<td class="ta-c">'+(r.is_emergency_contact?'<span class="ep-tag ep-tag--ec">Yes</span>':'<span class="cell-dim">No</span>')+'</td>'+
        '<td class="ta-r">'+F.rowMenu([{label:'Edit',icon:'pencil',attr:'data-fam-edit="'+r.id+'"'},{label:'Delete',icon:'trash-2',attr:'data-fam-del="'+r.id+'"',danger:true}])+'</td>'+
      '</tr>';
    }).join('');
    var empty = (famQuery||famRel)
      ? emptyRow(6,'search-x','No matches','No family member matches your search or filter.')
      : emptyRow(6,'users','No family members yet','Use “Add Family Member” to register a relative or dependant.');
    $('#famTable').innerHTML = head + '<tbody>' + (body || empty) + '</tbody>';
    updateCounts(); icons();
  }
  function renderEc(){
    var ec = relatives.filter(function(r){ return r.is_emergency_contact && (!ecQuery || r.name.toLowerCase().indexOf(ecQuery)>-1); });
    var head = '<thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th class="ta-r"></th></tr></thead>';
    var body = ec.map(function(r){
      return '<tr>'+
        '<td class="cell-strong">'+esc(r.name)+'</td>'+
        '<td>'+relBadge(r)+'</td>'+
        '<td class="cell-mono">'+esc(r.phone_number)+'</td>'+
        '<td class="ta-r">'+F.rowMenu([{label:'Edit',icon:'pencil',attr:'data-ec-edit="'+r.id+'"'},{label:'Release',icon:'user-minus',attr:'data-ec-release="'+r.id+'"',danger:true}])+'</td>'+
      '</tr>';
    }).join('');
    var empty = ecQuery
      ? emptyRow(4,'search-x','No matches','No emergency contact matches your search.')
      : emptyRow(4,'phone-off','No emergency contacts','Tick “Emergency contact” on a family member to list them here.');
    $('#ecTable').innerHTML = head + '<tbody>' + (body || empty) + '</tbody>';
    updateCounts(); icons();
  }
  function emptyRow(cols, ic, t, s){
    return '<tr><td colspan="'+cols+'"><div class="ep-empty"><span class="ep-empty__ic"><i data-lucide="'+ic+'"></i></span><div class="ep-empty__t">'+t+'</div><div class="ep-empty__s">'+s+'</div></div></td></tr>';
  }

  function familyFormHtml(r){
    return field({field:'name', label:'Name', req:true, value:r?r.name:'', placeholder:'Full name', wide:true}) +
      field({field:'relationship_type', label:'Relationship', type:'select', req:true, value:r?r.relationship_type:'', placeholder:'Select relationship'}) +
      field({field:'phone_number', label:'Phone number', req:true, value:r?r.phone_number:'', placeholder:'0812…'}) +
      field({field:'email', label:'Email', value:r?r.email:'', placeholder:'name@mail.com', wide:true}) +
      field({field:'date_of_birth', label:'Date of birth', inputType:'date', value:r?r.date_of_birth:''}) +
      field({field:'job_id', label:'Occupation', type:'select', field_enum:'job', opts:ENUM.job, value:r?r.job_id:'', placeholder:'Select occupation'}) +
      field({field:'address', label:'Address', type:'textarea', value:r?r.address:'', wide:true, placeholder:'Street, city (optional)'}) +
      field({field:'is_emergency_contact', label:'Emergency contact', type:'toggle', value:r?r.is_emergency_contact:false, help:'List this person under Emergency Contact.'});
  }
  var famEditId = null, famMode = 'create', famReturn = 'family';
  function openFamily(mode, id, from){
    famMode = mode; famEditId = id || null; famReturn = from || 'family';
    var r = id ? relatives.filter(function(x){return x.id===id;})[0] : null;
    var ecEdit = from === 'emergency-contact';
    $('#mFamilyTitle').textContent = mode==='create' ? 'Add Family Member' : (ecEdit ? 'Edit Emergency Contact' : 'Edit Family Member');
    $('#mFamilyDesc').textContent = ecEdit ? 'Same form as Family — changes apply to the shared relative record.' : 'Name, relationship and phone number are the minimum required fields.';
    $('#mFamilySave').textContent = mode==='create' ? 'Save' : 'Save changes';
    mountForm('fFamily', familyFormHtml(r));
    F.openModal('mFamily');
  }
  $('#famAdd').addEventListener('click', function(){ openFamily('create'); });
  $('#famTable').addEventListener('click', function(e){
    var ed = e.target.closest('[data-fam-edit]'); var del = e.target.closest('[data-fam-del]');
    if (ed) openFamily('edit', ed.getAttribute('data-fam-edit'), 'family');
    if (del) confirmDeleteFamily(del.getAttribute('data-fam-del'));
  });
  $('#ecTable').addEventListener('click', function(e){
    var ed = e.target.closest('[data-ec-edit]'); var rel = e.target.closest('[data-ec-release]');
    if (ed) openFamily('edit', ed.getAttribute('data-ec-edit'), 'emergency-contact');
    if (rel) confirmRelease(rel.getAttribute('data-ec-release'));
  });

  function confirmDeleteFamily(id){
    var r = relatives.filter(function(x){return x.id===id;})[0]; if(!r) return;
    openConfirm({
      title:'Delete family member', desc:'Soft-delete — the record is kept for audit.',
      noteType:'note--danger', noteIcon:'trash-2',
      noteHtml:'Remove <strong>'+esc(r.name)+'</strong> ('+enumLabel('relationship_type',r.relationship_type)+') from your family list? This sets <code class="ep-code">deleted_by</code> (soft-delete) — the row is filtered out of the grid but retained for audit.',
      okLabel:'Delete', danger:true,
      onOk:function(){ relatives = relatives.filter(function(x){return x.id!==id;}); renderFamily(); renderEc(); F.toast('Family member deleted (soft-delete · 200).', 'ok'); }
    });
  }
  function confirmRelease(id){
    var r = relatives.filter(function(x){return x.id===id;})[0]; if(!r) return;
    openConfirm({
      title:'Release emergency contact', desc:'This is an UPDATE, not a delete.',
      noteType:'note--warn', noteIcon:'user-minus',
      noteHtml:'Set <code class="ep-code">is_emergency_contact = false</code> for <strong>'+esc(r.name)+'</strong>. They will drop off this list but <strong>stay in Family</strong>. No data is deleted.',
      okLabel:'Release', danger:false,
      onOk:function(){ r.is_emergency_contact = false; renderEc(); renderFamily(); F.toast('Emergency contact released (UPDATE · 200).', 'ok'); }
    });
  }

  // =========================================================================
  //  4. FORMAL EDUCATION
  // =========================================================================
  function renderFormal(){ $('#feVal').innerHTML = '<span class="ep-jenjang"><i data-lucide="graduation-cap" style="width:15px;height:15px"></i>'+enumLabel('last_education',profile.last_education)+'</span>'; icons(); }
  $('#feEdit').addEventListener('click', function(){
    mountForm('fFormal', field({field:'last_education', label:'Highest education level', type:'select', req:true, value:profile.last_education, wide:true}));
    F.openModal('mFormal');
  });

  // =========================================================================
  //  5. INFORMAL EDUCATION (mst_training)
  // =========================================================================
  function renderTraining(){
    var head = '<thead><tr><th>Training</th><th>Sponsor</th><th>Activity</th><th>Category</th><th class="ta-c">Year</th><th>Expiry</th><th class="ta-c">Cert</th><th class="ta-r"></th></tr></thead>';
    var body = trainings.map(function(t){
      var exp = t.certificate_expiry_date
        ? '<span class="'+(isExpired(t.certificate_expiry_date)?'ep-expired':'')+'">'+fmtDate(t.certificate_expiry_date)+(isExpired(t.certificate_expiry_date)?' · expired':'')+'</span>'
        : '<span class="cell-dim">—</span>';
      var yr = t.start_year ? (t.start_year + (t.end_year && t.end_year!==t.start_year ? '–'+t.end_year : '')) : '—';
      return '<tr>'+
        '<td class="cell-strong">'+esc(t.training_name||'—')+'</td>'+
        '<td class="cell-dim">'+esc(t.training_sponsor||'—')+'</td>'+
        '<td class="cell-dim">'+esc(t.training_activity||'—')+'</td>'+
        '<td>'+relCat(t.training_category)+'</td>'+
        '<td class="ta-c">'+yr+'</td>'+
        '<td>'+exp+'</td>'+
        '<td class="ta-c">'+(t.training_certificate?'<span class="ep-cert"><i data-lucide="paperclip"></i></span>':'<span class="ep-cert ep-cert--none">—</span>')+'</td>'+
        '<td class="ta-r">'+F.rowMenu([{label:'Edit',icon:'pencil',attr:'data-tr-edit="'+t.id+'"'},{label:'Delete',icon:'trash-2',attr:'data-tr-del="'+t.id+'"',danger:true}])+'</td>'+
      '</tr>';
    }).join('');
    $('#trTable').innerHTML = head + '<tbody>' + (body || emptyRow(8,'book-open','No trainings yet','Add a training or certification you have completed.')) + '</tbody>';
    updateCounts(); icons();
  }
  function relCat(v){ return '<span class="ep-tag">'+enumLabel('training_category',v)+'</span>'; }
  function trainingFormHtml(t){
    return field({field:'training_name', label:'Training name', value:t?t.training_name:'', wide:true, placeholder:'e.g. AWS Solutions Architect'}) +
      field({field:'training_sponsor', label:'Sponsor / organiser', value:t?t.training_sponsor:'', placeholder:'e.g. Amazon Web Services'}) +
      field({field:'training_activity', label:'Training activity', value:t?t.training_activity:'', placeholder:'e.g. Workshop, bootcamp, in-house class', maxlength:150}) +
      field({field:'training_category', label:'Category', type:'select', req:true, value:t?t.training_category:'', placeholder:'Select category', errMsg:'Category must be a valid value.'}) +
      field({field:'graduation_score', label:'Score', value:t?t.graduation_score:'', placeholder:'0–100'}) +
      field({field:'graduation_grade', label:'Grade', value:t?t.graduation_grade:'', placeholder:'e.g. A', maxlength:10}) +
      field({field:'training_cost', label:'Cost', type:'money', value:t?t.training_cost:''}) +
      field({field:'start_year', label:'Start year', value:t?t.start_year:'', placeholder:'YYYY', maxlength:4}) +
      field({field:'end_year', label:'End year', value:t?t.end_year:'', placeholder:'YYYY', maxlength:4}) +
      field({field:'certificate_expiry_date', label:'Certificate expiry', inputType:'date', value:t?t.certificate_expiry_date:''}) +
      field({field:'training_certificate', label:'Certificate', type:'file', value:t?t.training_certificate:'', filename:'certificate.pdf'});
  }
  var trEditId = null, trMode='create';
  $('#trAdd').addEventListener('click', function(){ trMode='create'; trEditId=null; $('#mTrainingTitle').textContent='Add Training'; $('#mTrainingSave').textContent='Save'; mountForm('fTraining', trainingFormHtml(null)); F.openModal('mTraining'); });
  $('#trTable').addEventListener('click', function(e){
    var ed = e.target.closest('[data-tr-edit]'); var del = e.target.closest('[data-tr-del]');
    if (ed){ trMode='edit'; trEditId=ed.getAttribute('data-tr-edit'); var t=trainings.filter(function(x){return x.id===trEditId;})[0]; $('#mTrainingTitle').textContent='Edit Training'; $('#mTrainingSave').textContent='Save changes'; mountForm('fTraining', trainingFormHtml(t)); F.openModal('mTraining'); }
    if (del){ var id=del.getAttribute('data-tr-del'); var tt=trainings.filter(function(x){return x.id===id;})[0];
      openConfirm({ title:'Delete training', desc:'Soft-delete — kept for audit.', noteType:'note--danger', noteIcon:'trash-2',
        noteHtml:'Delete <strong>'+esc(tt.training_name||'this training')+'</strong>? Sets <code class="ep-code">deleted_by</code> (soft-delete).', okLabel:'Delete', danger:true,
        onOk:function(){ trainings = trainings.filter(function(x){return x.id!==id;}); renderTraining(); F.toast('Training deleted (soft-delete · 204 No Content).','ok'); } });
    }
  });

  // =========================================================================
  //  6. WORKING EXPERIENCE (mst_work_experience)
  // =========================================================================
  function renderWork(){
    var head = '<thead><tr><th>Company</th><th>Position</th><th>Period (month-year)</th><th class="ta-c">Cert</th><th class="ta-r"></th></tr></thead>';
    var sorted = works.slice().sort(function(a,b){ return b.join_date < a.join_date ? -1 : 1; });
    var body = sorted.map(function(w){
      return '<tr>'+
        '<td class="cell-strong">'+esc(w.company_name)+'</td>'+
        '<td>'+esc(w.position)+'</td>'+
        '<td class="cell-dim">'+fmtMonthYear(w.join_date)+' – '+fmtMonthYear(w.leave_date)+'</td>'+
        '<td class="ta-c">'+(w.employment_certificate?'<span class="ep-cert"><i data-lucide="paperclip"></i></span>':'<span class="ep-cert ep-cert--none">—</span>')+'</td>'+
        '<td class="ta-r">'+F.rowMenu([{label:'Edit',icon:'pencil',attr:'data-we-edit="'+w.id+'"'},{label:'Delete',icon:'trash-2',attr:'data-we-del="'+w.id+'"',danger:true}])+'</td>'+
      '</tr>';
    }).join('');
    $('#weTable').innerHTML = head + '<tbody>' + (body || emptyRow(5,'briefcase','No experience yet','Add a previous employer and your role there.')) + '</tbody>';
    updateCounts(); icons();
  }
  function workFormHtml(w){
    return field({field:'company_name', label:'Company name', req:true, value:w?w.company_name:'', placeholder:'e.g. PT Maju Jaya', wide:true}) +
      field({field:'position', label:'Position', req:true, value:w?w.position:'', placeholder:'e.g. Backend Engineer', wide:true}) +
      field({field:'join_date', label:'Join (month-year)', type:'monthyear', req:true, value:w?w.join_date:''}) +
      field({field:'leave_date', label:'Leave (month-year)', type:'monthyear', req:true, value:w?w.leave_date:'', errMsg:'Leave date must be on/after the join date.'}) +
      field({field:'job_description', label:'Job description', type:'textarea', value:w?w.job_description:'', wide:true, placeholder:'What you did there (optional)'}) +
      field({field:'employment_certificate', label:'Employment certificate', type:'file', value:w?w.employment_certificate:'', filename:'certificate.pdf'});
  }
  var weEditId=null, weMode='create';
  $('#weAdd').addEventListener('click', function(){ weMode='create'; weEditId=null; $('#mWorkTitle').textContent='Add Working Experience'; $('#mWorkSave').textContent='Save'; mountForm('fWork', workFormHtml(null)); F.openModal('mWork'); });
  $('#weTable').addEventListener('click', function(e){
    var ed = e.target.closest('[data-we-edit]'); var del = e.target.closest('[data-we-del]');
    if (ed){ weMode='edit'; weEditId=ed.getAttribute('data-we-edit'); var w=works.filter(function(x){return x.id===weEditId;})[0]; $('#mWorkTitle').textContent='Edit Working Experience'; $('#mWorkSave').textContent='Save changes'; mountForm('fWork', workFormHtml(w)); F.openModal('mWork'); }
    if (del){ var id=del.getAttribute('data-we-del'); var ww=works.filter(function(x){return x.id===id;})[0];
      openConfirm({ title:'Delete experience', desc:'Soft-delete — kept for audit.', noteType:'note--danger', noteIcon:'trash-2',
        noteHtml:'Delete <strong>'+esc(ww.company_name)+'</strong> ('+esc(ww.position)+')? Sets <code class="ep-code">deleted_by</code> (soft-delete).', okLabel:'Delete', danger:true,
        onOk:function(){ works = works.filter(function(x){return x.id!==id;}); renderWork(); F.toast('Working experience deleted (soft-delete · 204 No Content).','ok'); } });
    }
  });

  // =========================================================================
  //  7. ADDITIONAL INFO
  // =========================================================================
  function renderAdditional(){
    $('#aiKv').innerHTML =
      kvRow('Other NIK', profile.other_nik ? '<span class="mono-val">'+esc(profile.other_nik)+'</span>' : '<span style="color:var(--fg-4)">—</span>') +
      kvRow('Blood type', profile.blood_type) +
      kvRow('Religion', enumLabel('religion',profile.religion)) +
      kvRow('Home ownership', enumLabel('home_ownership_status',profile.home_ownership_status)) +
      kvRow('Disability status', enumLabel('disability_status',profile.disability_status));
  }
  $('#aiEdit').addEventListener('click', function(){
    var html =
      field({field:'other_nik', label:'Other NIK', value:profile.other_nik, placeholder:'Special-case dept only', wide:true}) +
      field({field:'blood_type', label:'Blood type', type:'select', req:true, value:profile.blood_type}) +
      field({field:'religion', label:'Religion', type:'select', req:true, value:profile.religion}) +
      field({field:'home_ownership_status', label:'Home ownership', type:'select', req:true, value:profile.home_ownership_status}) +
      field({field:'disability_status', label:'Disability status', type:'select', req:true, value:profile.disability_status});
    mountForm('fAdditional', html);
    F.openModal('mAdditional');
  });

  // =========================================================================
  //  GENERIC CONFIRM
  // =========================================================================
  var confirmCb = null;
  function openConfirm(cfg){
    $('#mConfirmTitle').textContent = cfg.title;
    $('#mConfirmDesc').textContent = cfg.desc || '';
    var note = $('#mConfirmNote');
    note.className = 'note ' + (cfg.noteType || 'note--info');
    note.innerHTML = '<i data-lucide="'+(cfg.noteIcon||'info')+'"></i><span>'+cfg.noteHtml+'</span>';
    var ok = $('#mConfirmOk');
    ok.textContent = cfg.okLabel || 'Confirm';
    ok.className = 'btn ' + (cfg.danger ? 'btn--danger' : 'btn--primary');
    confirmCb = cfg.onOk;
    icons(); F.openModal('mConfirm');
  }
  $('#mConfirmOk').addEventListener('click', function(){ F.closeModal('mConfirm'); if (confirmCb) confirmCb(); confirmCb = null; });

  // =========================================================================
  //  SAVE HANDLERS (validation + persist + toast)
  // =========================================================================
  document.addEventListener('click', function(e){
    var btn = e.target.closest('[data-save]'); if (!btn) return;
    var which = btn.getAttribute('data-save');
    if (which === 'basic') return saveBasic();
    if (which === 'family') return saveFamily();
    if (which === 'formal') return saveFormal();
    if (which === 'training') return saveTraining();
    if (which === 'work') return saveWork();
    if (which === 'additional') return saveAdditional();
  });

  function saveBasic(){
    var form = $('#fBasic'); var v = readForm(form); clearErrs(form);
    var ok = true;
    ['date_of_birth','place_of_birth','id_card_address'].forEach(function(k){ if(!v[k]){ markErr(form,k,true); ok=false; } });
    if (v.nationality === 'FOREIGNER' && !v.passport_number){ markErr(form,'passport_number',true); ok=false; }
    if (!ok){ F.toast('Validation failed (422) — check the highlighted fields.', 'danger'); return; }
    // ESS may not change HR-restricted fields — strip them (keep prior value)
    if (actor === 'ESS'){ HR_RESTRICTED.forEach(function(k){ v[k] = profile[k]; }); }
    ['nationality','npwp','npwp_name','passport_number','mother_maiden_name','date_of_birth','place_of_birth','gender','last_education','blood_type','religion','home_ownership_status','disability_status','marital_status','id_card_address','domicile_address','personal_phone','personal_email','other_nik'].forEach(function(k){ if (v[k]!==undefined) profile[k]=v[k]; });
    profile.is_domicile_same_as_id_card = !!v.is_domicile_same_as_id_card;
    if (profile.is_domicile_same_as_id_card) profile.domicile_address = profile.id_card_address;
    renderBasic(); renderFormal(); renderAdditional();
    F.closeModal('mBasic');
    F.toast(actor==='ESS' ? 'Basic info updated (200). HR-restricted fields were left unchanged.' : 'Basic info updated (200).', 'ok');
  }

  function saveFamily(){
    var form = $('#fFamily'); var v = readForm(form); clearErrs(form);
    var ok = true;
    ['name','relationship_type','phone_number'].forEach(function(k){ if(!v[k]){ markErr(form,k,true); ok=false; } });
    if (!ok){ F.toast('Validation failed (422) — name, relationship and phone are required.', 'danger'); return; }
    if (famMode === 'create'){
      relatives.push({ id:'r'+Date.now(), name:v.name, relationship_type:v.relationship_type, phone_number:v.phone_number, email:v.email||'', date_of_birth:v.date_of_birth||'', job_id:v.job_id||'', address:v.address||'', is_emergency_contact:!!v.is_emergency_contact });
      F.toast('Family member added (201).', 'ok');
    } else {
      var r = relatives.filter(function(x){return x.id===famEditId;})[0];
      if (r){ r.name=v.name; r.relationship_type=v.relationship_type; r.phone_number=v.phone_number; r.email=v.email||''; r.date_of_birth=v.date_of_birth||''; r.job_id=v.job_id||''; r.address=v.address||''; r.is_emergency_contact=!!v.is_emergency_contact; }
      F.toast('Family member updated (200).', 'ok');
    }
    renderFamily(); renderEc(); F.closeModal('mFamily');
  }

  function saveFormal(){
    var v = readForm($('#fFormal'));
    if (!v.last_education){ F.toast('Select a level first.', 'danger'); return; }
    profile.last_education = v.last_education;
    renderFormal(); renderBasic();
    F.closeModal('mFormal'); F.toast('Education level updated (200).', 'ok');
  }

  function saveTraining(){
    var form = $('#fTraining'); var v = readForm(form); clearErrs(form);
    if (!v.training_category){ markErr(form,'training_category',true); F.toast('Validation failed (422) — category is required.', 'danger'); return; }
    if (trMode==='create'){
      trainings.push({ id:'t'+Date.now(), training_name:v.training_name, training_sponsor:v.training_sponsor, training_activity:v.training_activity, training_category:v.training_category, graduation_score:v.graduation_score, graduation_grade:v.graduation_grade, training_cost:v.training_cost, start_year:v.start_year, end_year:v.end_year, certificate_expiry_date:v.certificate_expiry_date, training_certificate:v.training_certificate });
      F.toast('Training added (201).', 'ok');
    } else {
      var t = trainings.filter(function(x){return x.id===trEditId;})[0];
      if (t) Object.keys(v).forEach(function(k){ t[k]=v[k]; });
      F.toast('Training updated (200).', 'ok');
    }
    renderTraining(); F.closeModal('mTraining');
  }

  function saveWork(){
    var form = $('#fWork'); var v = readForm(form); clearErrs(form);
    var ok = true;
    ['company_name','position','join_date','leave_date'].forEach(function(k){ if(!v[k]){ markErr(form,k,true); ok=false; } });
    if (ok && v.join_date && v.leave_date && v.leave_date < v.join_date){ markErr(form,'leave_date',true); ok=false; F.toast('Validation failed (422) — leave date is before join date.', 'danger'); }
    else if (!ok){ F.toast('Validation failed (422) — company, position and both periods are required.', 'danger'); return; }
    if (!ok) return;
    if (weMode==='create'){
      works.push({ id:'w'+Date.now(), company_name:v.company_name, position:v.position, join_date:v.join_date, leave_date:v.leave_date, job_description:v.job_description||'', employment_certificate:v.employment_certificate||'' });
      F.toast('Working experience added (201).', 'ok');
    } else {
      var w = works.filter(function(x){return x.id===weEditId;})[0];
      if (w) Object.keys(v).forEach(function(k){ w[k]=v[k]; });
      F.toast('Working experience updated (200).', 'ok');
    }
    renderWork(); F.closeModal('mWork');
  }

  function saveAdditional(){
    var v = readForm($('#fAdditional'));
    ['other_nik','blood_type','religion','home_ownership_status','disability_status'].forEach(function(k){ if (v[k]!==undefined && v[k]!=='') profile[k]=v[k]; else if(k==='other_nik') profile[k]=v[k]; });
    renderAdditional(); renderBasic();
    F.closeModal('mAdditional'); F.toast('Additional info updated (200).', 'ok');
  }

  // =========================================================================
  //  COUNTS + INIT
  // =========================================================================
  function updateCounts(){
    var set = function(id,n){ var el=$('#'+id); if(el) el.textContent=n; };
    set('cntFamily', relatives.length);
    set('cntEc', relatives.filter(function(r){return r.is_emergency_contact;}).length);
    set('cntTraining', trainings.length);
    set('cntWork', works.length);
  }

  // ---- search + filter wiring (Family + Emergency Contact) ----
  var famSearch = $('#famSearch'); if (famSearch) famSearch.addEventListener('input', function(){ famQuery = (this.value||'').trim().toLowerCase(); renderFamily(); });
  var ecSearch = $('#ecSearch'); if (ecSearch) ecSearch.addEventListener('input', function(){ ecQuery = (this.value||'').trim().toLowerCase(); renderEc(); });
  var famRelFilter = $('#famRelFilter');
  if (famRelFilter){ F.wireSelects(famRelFilter); famRelFilter.addEventListener('select', function(e){ famRel = (e.detail && e.detail.opt && e.detail.opt.getAttribute('data-val')) || ''; renderFamily(); }); }

  renderBasic(); renderFamily(); renderEc(); renderFormal(); renderTraining(); renderWork(); renderAdditional();
  showSection((location.hash || '').replace('#','') || 'basic-info', false);
  window.addEventListener('hashchange', function(){ showSection((location.hash||'').replace('#',''), false); });
  icons();
})();
