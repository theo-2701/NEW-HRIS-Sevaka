// ============================================================
// SEVAKA HRIS — Document Service · shared dataset
// Source: FSD-001-DOCUMENT-0.1 + UIC-001-DOCUMENT-0.1 (Dataset Skenario Positif, company PTDIKA)
// Enum values are kept VERBATIM from the contract (uppercase Indonesian);
// labels around them are English (one language per screen, project standard).
// ============================================================
(function () {
  'use strict';

  var EMP = {
    e1: { id:'0198a1b2-0001-7a10-9c00-000000000001', nama:'Dedi Kurniawan',  nik:'20240117', role:'ROLE_HR_STAFF',   dept:'Human Capital' },
    e2: { id:'0198a1b2-0002-7a10-9c00-000000000002', nama:'Budi Santoso',    nik:'20180204', role:'ROLE_DEPT_MANAGER', dept:'Operations' },
    e3: { id:'0198a1b2-0003-7a10-9c00-000000000003', nama:'Rina Amelia',     nik:'20210715', role:'ROLE_SUPER_ADMIN', dept:'Corporate' },
    e4: { id:'0198a1b2-0004-7a10-9c00-000000000004', nama:'Hesti Wulandari', nik:'20220301', role:'ROLE_HR_MANAGER',  dept:'Human Capital' },
    e5: { id:'0198a1b2-0005-7a10-9c00-000000000005', nama:'Nurul Aini',      nik:'20230508', role:'ROLE_GA_STAFF',    dept:'General Affair' },
    e6: { id:'0198a1b2-0006-7a10-9c00-000000000006', nama:'Wawan Setiadi',   nik:'20170103', role:'ROLE_SYSTEM_ADMIN', dept:'IT' },
    e7: { id:'0198a1b2-0007-7a10-9c00-000000000007', nama:'dr. Prasetyo Adi',nik:'20200622', role:'ROLE_HEALTH_DATA_OFFICER', dept:'Clinic' },
    e8: { id:'0198a1b2-0008-7a10-9c00-000000000008', nama:'Yanti Prasetya',  nik:'20190912', role:'ROLE_EMPLOYEE',    dept:'Finance' }
  };

  // mst_document_category (A6a). Kontrak Vendor markers are not exemplified in the
  // UIC — the numbers below are illustrative and flagged on the Category page.
  var CATS = [
    { id:'0198c3d4-0001-7b20-8e00-000000000001', category_code:'employment_certificate', category_name:'Surat Keterangan Kerja',
      category_origin:'INDUK', confidentiality_class:'BIASA', retention_regime:'TEMPORARY', retention_days:1095,
      max_file_size_bytes:5242880, allowed_mime_types:['application/pdf'],
      is_replaceable:true, is_regenerable:true, shown_in_self_service:true, is_active:true, has_pending_change:false,
      readers:['ROLE_HR_MANAGER','ROLE_HR_STAFF','ROLE_SUPER_ADMIN'], impact:4112 },
    { id:'0198c3d4-0002-7b20-8e00-000000000002', category_code:'doctor_note', category_name:'Surat Dokter',
      category_origin:'INDUK', confidentiality_class:'SENSITIF', retention_regime:'PERMANENT', retention_days:null,
      max_file_size_bytes:10485760, allowed_mime_types:['application/pdf','image/jpeg','image/png'],
      is_replaceable:false, is_regenerable:false, shown_in_self_service:true, is_active:true, has_pending_change:false,
      readers:['ROLE_HR_MANAGER','ROLE_HEALTH_DATA_OFFICER','ROLE_SUPER_ADMIN'], impact:1 },
    { id:'0198c3d4-0003-7b20-8e00-000000000003', category_code:'vendor_contract', category_name:'Kontrak Vendor',
      category_origin:'PERUSAHAAN', confidentiality_class:'BIASA', retention_regime:'TEMPORARY', retention_days:1825,
      max_file_size_bytes:10485760, allowed_mime_types:['application/pdf'],
      is_replaceable:true, is_regenerable:false, shown_in_self_service:false, is_active:true, has_pending_change:false,
      readers:['ROLE_GA_STAFF','ROLE_SUPER_ADMIN'], impact:37, illustrative:true },
    { id:'0198c3d4-0004-7b20-8e00-000000000004', category_code:'berkas_serah_terima_aset', category_name:'Berkas Serah Terima Aset',
      category_origin:'PERUSAHAAN', confidentiality_class:'BIASA', retention_regime:'TEMPORARY', retention_days:730,
      max_file_size_bytes:5242880, allowed_mime_types:['application/pdf'],
      is_replaceable:false, is_regenerable:false, shown_in_self_service:true, is_active:false, has_pending_change:false,
      readers:['ROLE_GA_STAFF'], impact:0 }
  ];

  // mst_document + mst_document_version (A3 grid item shape / A4 detail shape)
  var DOCS = [
    { document_id:'0198e5f6-0001-7c30-9a00-000000000001', tag:'DOK-1',
      category_id:CATS[2].id, category_name:'Kontrak Vendor', origin:'DIUNGGAH',
      owner_type:'PERUSAHAAN', owner_object_kind:null, owner_id:null, owner_caption:'PTDIKA',
      confidentiality_class_effective:'BIASA', catalog_state:'AKTIF',
      created_at:'2026-03-11T09:12:44+07:00', updated_at:null,
      active_version_id:'0198f9a1-0001-7e50-9c00-000000000001',
      versions:[ { version_id:'0198f9a1-0001-7e50-9c00-000000000001', version_no:1,
        original_filename:'peraturan-perusahaan-2026.pdf', size_bytes:842013, detected_mime:'application/pdf',
        scan_state:'BERSIH', storage_tier:'PANAS', scanned_at:'2026-03-11T09:13:00+07:00',
        scanned_at_timezone:'Asia/Jakarta', archived_at:null, created_at:'2026-03-11T09:12:44+07:00' } ],
      letter:null },
    { document_id:'0198e5f6-0002-7c30-9a00-000000000002', tag:'DOK-2',
      category_id:CATS[1].id, category_name:'Surat Dokter', origin:'DIUNGGAH',
      owner_type:'KARYAWAN', owner_object_kind:null, owner_id:EMP.e8.id, owner_caption:'KARYAWAN',
      confidentiality_class_effective:'SENSITIF', catalog_state:'AKTIF',
      created_at:'2026-07-28T08:41:12+07:00', updated_at:'2026-07-30T10:02:55+07:00',
      active_version_id:'0198f7a8-0002-7c30-9a00-000000000002',
      versions:[
        { version_id:'0198f7a8-0001-7c30-9a00-000000000001', version_no:1,
          original_filename:'surat-dokter.pdf', size_bytes:512400, detected_mime:'application/pdf',
          scan_state:'BERSIH', storage_tier:'PANAS', scanned_at:'2026-07-28T08:42:00+07:00',
          scanned_at_timezone:'Asia/Jakarta', archived_at:null, created_at:'2026-07-28T08:41:12+07:00' },
        { version_id:'0198f7a8-0002-7c30-9a00-000000000002', version_no:2,
          original_filename:'surat-dokter-revisi.pdf', size_bytes:598221, detected_mime:'application/pdf',
          scan_state:'BERSIH', storage_tier:'PANAS', scanned_at:'2026-07-30T10:03:40+07:00',
          scanned_at_timezone:'Asia/Jakarta', archived_at:null, created_at:'2026-07-30T10:02:55+07:00' } ],
      letter:null },
    { document_id:'0198e5f6-0003-7c30-9a00-000000000003', tag:'DOK-3',
      category_id:CATS[2].id, category_name:'Kontrak Vendor', origin:'DIUNGGAH',
      owner_type:'OBJEK_LAIN', owner_object_kind:'VENDOR', owner_id:'0198b7c8-0002-7d40-8b00-000000000002',
      owner_caption:'VENDOR \u00b7 CV Mitra Sejahtera',
      confidentiality_class_effective:'BIASA', catalog_state:'AKTIF',
      created_at:'2026-06-02T11:20:05+07:00', updated_at:null,
      active_version_id:'0198f9a1-0003-7e50-9c00-000000000003',
      versions:[ { version_id:'0198f9a1-0003-7e50-9c00-000000000003', version_no:1,
        original_filename:'kontrak-cv-mitra-sejahtera.pdf', size_bytes:456789, detected_mime:'application/pdf',
        scan_state:'BERSIH', storage_tier:'PANAS', scanned_at:'2026-06-02T11:21:00+07:00',
        scanned_at_timezone:'Asia/Jakarta', archived_at:null, created_at:'2026-06-02T11:20:05+07:00' } ],
      letter:null },
    { document_id:'0198e5f6-0004-7c30-8a00-000000000004', tag:'DOK-4',
      category_id:CATS[0].id, category_name:'Surat Keterangan Kerja', origin:'DILAHIRKAN_SISTEM',
      owner_type:'KARYAWAN', owner_object_kind:null, owner_id:EMP.e8.id, owner_caption:'KARYAWAN',
      confidentiality_class_effective:'BIASA', catalog_state:'AKTIF',
      created_at:'2026-08-05T14:22:10+07:00', updated_at:null, is_new:false,
      active_version_id:'0198f9a1-0004-7e50-9c00-000000000004',
      versions:[ { version_id:'0198f9a1-0004-7e50-9c00-000000000004', version_no:1,
        original_filename:'skk-yanti-prasetya.pdf', size_bytes:214880, detected_mime:'application/pdf',
        scan_state:'BERSIH', storage_tier:'PANAS', scanned_at:'2026-08-05T14:22:30+07:00',
        scanned_at_timezone:'Asia/Jakarta', archived_at:null, created_at:'2026-08-05T14:22:10+07:00' } ],
      letter:{ letter_id:'0198f0a1-0001-7a70-9b00-000000000001', letter_no:'001/HRD/VIII/2026',
        letter_target:'PERORANGAN', letter_issuance_state:'TERBIT', letter_state:'BERLAKU',
        issued_at:'2026-08-05T14:22:10+07:00', template_id:'0198d2e3-0001-7f60-8a00-000000000001',
        template_version_id:'0198d2e3-0011-7f60-8a00-000000000011', subject_employee_id:EMP.e8.id, branch_id:null,
        verification_code:'K7M2-P4QX-9WTB' } }
  ];

  // mst_letter_template + versions (A8a / A8e)
  var TPL = [
    { id:'0198d2e3-0001-7f60-8a00-000000000001', template_name:'Surat Keterangan Kerja',
      category_id:CATS[0].id, category_name:'Surat Keterangan Kerja', category_retention_regime:'TEMPORARY',
      letter_target:'PERORANGAN', signer_scope:'CABANG', is_self_requestable:true, requires_approval:false,
      is_active:true, active_version_id:'0198d2e3-0011-7f60-8a00-000000000011', active_version_no:2,
      created_at:'2026-08-06T09:12:00Z',
      versions:[
        { version_id:'0198d2e3-0010-7f60-8a00-000000000010', version_no:1, template_version_state:'DISETUJUI', is_active_version:false,
          body:'SURAT KETERANGAN KERJA\nNomor: {{letter_no}}\n\nYang bertanda tangan di bawah ini menerangkan bahwa:\nNama: %%nama_karyawan%%\nNIK: %%nik%%\nJabatan: %%jabatan%%\n\n...(naskah versi 1)...',
          created_by:EMP.e4, created_at:'2026-08-01T09:00:00Z', approved_by:EMP.e3, approved_at:'2026-08-01T11:00:00+07:00' },
        { version_id:'0198d2e3-0011-7f60-8a00-000000000011', version_no:2, template_version_state:'DISETUJUI', is_active_version:true,
          body:'SURAT KETERANGAN KERJA\nNomor: {{letter_no}}\n\nYang bertanda tangan di bawah ini menerangkan bahwa:\nNama: %%nama_karyawan%%\nNIK: %%nik%%\nJabatan: %%jabatan%%\nMasa kerja: %%masa_kerja%%\n\n...(naskah versi 2, kop resmi)...',
          created_by:EMP.e4, created_at:'2026-08-04T08:10:00Z', approved_by:EMP.e3, approved_at:'2026-08-04T10:30:00+07:00' },
        { version_id:'0198d2e3-0012-7f60-8a00-000000000012', version_no:3, template_version_state:'MENUNGGU_PERSETUJUAN', is_active_version:false,
          body:'SURAT KETERANGAN KERJA\nNomor: {{letter_no}}\n\n...(naskah versi 3, kop diperbarui)...',
          created_by:EMP.e4, created_at:'2026-08-07T08:30:00Z', approved_by:null, approved_at:null } ] },
    { id:'0198d2e3-0002-7f60-8a00-000000000002', template_name:'Surat Peringatan',
      category_id:CATS[0].id, category_name:'Surat Keterangan Kerja', category_retention_regime:'TEMPORARY',
      letter_target:'PERORANGAN', signer_scope:'KANTOR_PUSAT', is_self_requestable:false, requires_approval:true,
      is_active:true, active_version_id:null, active_version_no:null,
      created_at:'2026-08-06T09:20:00Z',
      versions:[
        { version_id:'0198d2e3-0020-7f60-8a00-000000000020', version_no:1, template_version_state:'MENUNGGU_PERSETUJUAN', is_active_version:false,
          body:'SURAT PERINGATAN\nNomor: {{letter_no}}\n\n...(naskah versi 1, diajukan)...',
          created_by:EMP.e4, created_at:'2026-08-06T09:20:00Z', approved_by:null, approved_at:null } ] }
  ];

  // mst_letter (A10 / A11 / A12 — executed from A4, demonstrated on Letter Issuance)
  var LETTERS = [
    { letter_id:'0198f0a1-0001-7a70-9b00-000000000001', letter_no:'001/HRD/VIII/2026', letter_type:'Surat Keterangan Kerja',
      letter_target:'PERORANGAN', letter_issuance_state:'TERBIT', letter_state:'BERLAKU',
      verification_code:'K7M2-P4QX-9WTB', subject:EMP.e8, issued_at:'2026-08-05T14:22:10+07:00',
      document_id:'0198e5f6-0004-7c30-8a00-000000000004', cancelled_at:null, cancel_reason:null },
    { letter_id:'0198f0a1-0002-7a70-9b00-000000000002', letter_no:'002/HRD/VIII/2026', letter_type:'Surat Keterangan Kerja',
      letter_target:'PERORANGAN', letter_issuance_state:'TERBIT', letter_state:'DIBATALKAN',
      verification_code:'R3F8-T1LM-6QZD', subject:EMP.e1, issued_at:'2026-07-20T10:05:00+07:00',
      document_id:null, cancelled_at:'2026-08-06T09:40:00+07:00',
      cancel_reason:'Penerima keliru, terbit atas nama yang salah' },
    // illustrative: the dataset holds no EDARAN letter, and C2c needs one to prove that a
    // circular's number lands on the same blind "no match" as every other cause.
    { letter_id:'0198f0a1-0009-7a70-9b00-000000000009', letter_no:'010/HRD/VIII/2026', letter_type:'Pengumuman Libur Bersama',
      letter_target:'EDARAN', letter_issuance_state:'TERBIT', letter_state:'BERLAKU', illustrative:true,
      verification_code:'W9XC-2NRK-5HBD', subject:EMP.e8, issued_at:'2026-08-02T09:00:00+07:00',
      document_id:null, cancelled_at:null, cancel_reason:null }
  ];

  // mst_letter_batch + map_letter_batch_item (A13a / A13b / A13c / A14)
  var BATCHES = [
    { id:'0198fb12-0001-7b80-9d00-000000000001', code:'BATCH-1',
      template_id:TPL[0].id, template_name:'Surat Keterangan Kerja',
      template_version_id:'0198d2e3-0011-7f60-8a00-000000000011',
      batch_state:'SELESAI', recipient_count:3,
      submitted_at:'2026-08-06T10:15:00+07:00', created_by:EMP.e1,
      approved_at:'2026-08-06T10:40:00+07:00', approved_by:EMP.e4,
      finished_at:'2026-08-06T10:47:33+07:00',
      summary:{ waiting:0, succeeded:2, failed:1 },
      items:[
        { subject:EMP.e8, batch_item_state:'BERHASIL', letter_id:'0198f0a1-0003-7a70-9b00-000000000003', letter_no:'003/HRD/VIII/2026', failure_reason:null },
        { subject:EMP.e1, batch_item_state:'BERHASIL', letter_id:'0198f0a1-0004-7a70-9b00-000000000004', letter_no:'004/HRD/VIII/2026', failure_reason:null },
        { subject:EMP.e2, batch_item_state:'GAGAL', letter_id:null,
          failure_reason:'Data pengisi surat tidak lengkap: jabatan formal belum ditetapkan' } ] },
    { id:'0198fb12-0002-7b80-9d00-000000000002', code:'BATCH-2',
      template_id:TPL[0].id, template_name:'Surat Keterangan Kerja',
      template_version_id:'0198d2e3-0011-7f60-8a00-000000000011',
      batch_state:'DITOLAK', recipient_count:5,
      submitted_at:'2026-08-04T16:20:00+07:00', created_by:EMP.e1,
      approved_at:'2026-08-04T17:02:00+07:00', approved_by:EMP.e4, finished_at:null,
      summary:{ waiting:0, succeeded:0, failed:0 }, items:[] },
    // Illustrative row (not in the FSD dataset) so the A14 decision path can be
    // exercised — a batch still sitting in MENUNGGU_PERSETUJUAN.
    { id:'0198fb12-0003-7b80-9d00-000000000003', code:'BATCH-3',
      template_id:TPL[0].id, template_name:'Surat Keterangan Kerja',
      template_version_id:'0198d2e3-0011-7f60-8a00-000000000011',
      batch_state:'MENUNGGU_PERSETUJUAN', recipient_count:2,
      submitted_at:'2026-08-07T09:05:00+07:00', created_by:EMP.e1,
      approved_at:null, approved_by:null, finished_at:null,
      summary:{ waiting:2, succeeded:0, failed:0 },
      items:[
        { subject:EMP.e8, batch_item_state:'MENUNGGU', letter_id:null, failure_reason:null },
        { subject:EMP.e2, batch_item_state:'MENUNGGU', letter_id:null, failure_reason:null } ] }
  ];

  // log_document_access (A5) — two row shapes, never flattened (G3)
  var ACCESS = [
    { id:'0198fb00-0005-7c90-9e00-000000000005', access_granularity:'PER_PERMINTAAN',
      document_ids:null, document_count:214, accessed_at:'2026-08-06T13:48:56+07:00',
      source_ip:'10.0.3.134', flagged_unreasonable:true, accessed_by:EMP.e1 },
    { id:'0198fb00-0004-7c90-9e00-000000000004', access_granularity:'PER_PEMBUKAAN',
      document_id:'0198e5f6-0002-7c30-9a00-000000000002', version_id:'0198f7a8-0002-7c30-9a00-000000000002',
      document_name:'surat-dokter-revisi.pdf', version_no:2, document_count:1,
      accessed_at:'2026-08-06T11:12:04+07:00', source_ip:'10.0.3.134',
      flagged_unreasonable:false, accessed_by:EMP.e7 },
    { id:'0198fb00-0003-7c90-9e00-000000000003', access_granularity:'PER_PEMBUKAAN',
      document_id:'0198e5f6-0002-7c30-9a00-000000000002', version_id:'0198f7a8-0002-7c30-9a00-000000000002',
      document_name:'surat-dokter-revisi.pdf', version_no:2, document_count:1,
      accessed_at:'2026-08-06T09:31:47+07:00', source_ip:'10.0.3.134',
      flagged_unreasonable:false, accessed_by:EMP.e4 },
    { id:'0198fb00-0002-7c90-9e00-000000000002', access_granularity:'PER_PEMBUKAAN',
      document_id:'0198e5f6-0004-7c30-8a00-000000000004', version_id:'0198f9a1-0004-7e50-9c00-000000000004',
      document_name:'skk-yanti-prasetya.pdf', version_no:1, document_count:1,
      accessed_at:'2026-08-05T15:04:19+07:00', source_ip:'10.0.3.134',
      flagged_unreasonable:false, accessed_by:EMP.e8, owner_open:true },
    { id:'0198fb00-0001-7c90-9e00-000000000001', access_granularity:'PER_PEMBUKAAN',
      document_id:null, version_id:null, document_name:null, version_no:null, document_count:1,
      accessed_at:'2026-08-03T16:22:00+07:00', source_ip:'10.0.3.134',
      flagged_unreasonable:false, accessed_by:EMP.e4, swept:true },
    { id:'0198fb00-0000-7c90-9e00-000000000000', access_granularity:'PER_PERMINTAAN',
      document_ids:null, document_count:12, accessed_at:'2026-08-02T08:59:31+07:00',
      source_ip:'10.0.3.134', flagged_unreasonable:false, accessed_by:EMP.e5 }
  ];

  var ROLE_REGISTRY = ['ROLE_SUPER_ADMIN','ROLE_SYSTEM_ADMIN','ROLE_HR_MANAGER','ROLE_HR_STAFF',
    'ROLE_DEPT_MANAGER','ROLE_FINANCE_OFFICER','ROLE_GA_STAFF','ROLE_HEALTH_DATA_OFFICER',
    'ROLE_RECRUITER','ROLE_EMPLOYEE'];

  // ---------- formatting + badge helpers ----------
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
  function dt(iso, withTime) {
    if (!iso) return '\u2014';
    var d = new Date(iso);
    var s = d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear();
    if (withTime) s += ', ' + ('0'+d.getHours()).slice(-2) + ':' + ('0'+d.getMinutes()).slice(-2);
    return s;
  }
  function bytes(n) { return n === null || n === undefined ? '\u2014' : String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' B'; }
  function mb(n) { return (n / 1048576).toFixed(0) + ' MB'; }
  function sb(kind, text) { return '<span class="sb sb--' + kind + '"><span class="sb__dot"></span>' + esc(text) + '</span>'; }

  var TONE = {
    BERSIH:'green', MENUNGGU_PEMERIKSAAN:'amber', KOTOR:'red', TIDAK_DIPERIKSA:'grey',
    PANAS:'orange', DINGIN:'blue',
    BIASA:'grey', SENSITIF:'red',
    DIUNGGAH:'blue', DILAHIRKAN_SISTEM:'indigo',
    MENUNGGU_PERSETUJUAN:'amber', DISETUJUI:'green', DITOLAK:'red',
    BERJALAN:'indigo', SELESAI:'green', TERBIT:'green',
    MENUNGGU:'amber', BERHASIL:'green', GAGAL:'red',
    BERLAKU:'green', DIBATALKAN:'red',
    PERORANGAN:'blue', EDARAN:'indigo',
    KANTOR_PUSAT:'grey', CABANG:'grey',
    INDUK:'indigo', PERUSAHAAN:'blue',
    PERMANENT:'indigo', TEMPORARY:'blue',
    ASET:'blue', VENDOR:'indigo', CABANG_OBJ:'grey',
    PER_PEMBUKAAN:'indigo', PER_PERMINTAAN:'blue'
  };
  function enumBadge(v) { return v ? sb(TONE[v] || 'grey', v) : '\u2014'; }

  // Generic "Reset" inside a filter modal: clear every select back to its first
  // option and every date range, then let the page's own listeners react.
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter-reset]');
    if (!b) return;
    var m = document.getElementById(b.getAttribute('data-filter-reset'));
    if (!m) return;
    m.querySelectorAll('.ctl--select').forEach(function (c) {
      var first = c.querySelector('.dropdown__opt');
      if (!first) return;
      c.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
      first.classList.add('is-sel');
      var v = c.querySelector('.ctl__value');
      if (v) { v.textContent = first.textContent; v.style.color = ''; }
      c.dispatchEvent(new CustomEvent('select', { bubbles: true, detail: {
        value: first.hasAttribute('data-val') ? first.getAttribute('data-val') : first.textContent.trim()
      } }));
    });
    m.querySelectorAll('.rng').forEach(function (r) {
      var val = r.querySelector('.rng__val');
      if (val) { val.textContent = r.getAttribute('data-placeholder') || ''; val.classList.add('is-empty'); }
      r.dispatchEvent(new CustomEvent('rangechange', { bubbles: true, detail: { from: '', to: '' } }));
    });
    // Checkbox criteria (multi-value enums, boolean flags) clear too, and each one
    // fires change so the page recomputes its state and resets the pager.
    m.querySelectorAll('input[type="checkbox"]').forEach(function (c) {
      if (!c.checked) return;
      c.checked = false;
      c.dispatchEvent(new Event('change', { bubbles: true }));
    });
    if (window.Flow) window.Flow.paintFilterSums();
  });

  // wireSelects() falls back to the option label when data-val is empty, so an
  // "All …" option arrives as its own text. Normalise it back to "" here.
  function filterValue(ctl, raw) {
    var first = ctl && ctl.querySelector('.dropdown__opt');
    if (first && first.hasAttribute('data-val') && first.getAttribute('data-val') === '' &&
        raw === first.textContent.trim()) return '';
    return raw || '';
  }

  window.DocData = {
    filterValue: filterValue,
    COMPANY:'PTDIKA', EMP:EMP, EMPLIST:[EMP.e8, EMP.e1, EMP.e2],
    CATS:CATS, DOCS:DOCS, TPL:TPL, LETTERS:LETTERS, BATCHES:BATCHES, ACCESS:ACCESS,
    ROLE_REGISTRY:ROLE_REGISTRY,
    esc:esc, dt:dt, bytes:bytes, mb:mb, sb:sb, enumBadge:enumBadge,
    cat: function (id) { for (var i=0;i<CATS.length;i++) if (CATS[i].id===id) return CATS[i]; return null; },
    doc: function (id) { for (var i=0;i<DOCS.length;i++) if (DOCS[i].document_id===id) return DOCS[i]; return null; },
    activeVersion: function (d) {
      for (var i=0;i<d.versions.length;i++) if (d.versions[i].version_id===d.active_version_id) return d.versions[i];
      return d.versions[d.versions.length-1];
    }
  };
})();
