// ============================================================
// SEVAKA HRIS — Inbox page logic
// - Renders categories' counts
// - Filters/searches message list
// - Renders detail panel with category-specific templates
// ============================================================
(function () {
  'use strict';

  // ============================================================
  // Data model — 14 representative messages across categories.
  // ============================================================
  const messages = [
    {
      id: 1, cat: 'payroll', icon: 'wallet', source: 'SEVAKA Payroll',
      subject: 'Run Payroll', tag: 'Payroll', unread: true,
      date: '28 Mei 2026', time: '13:47',
      preview: 'Proses kalkulasi payroll periode 05/2026 telah selesai dan siap diproses lebih lanjut.',
      template: 'payroll-run'
    },
    {
      id: 2, cat: 'timeoff', icon: 'calendar-x-2', source: 'Lia Permata', subject: 'Permohonan Cuti Tahunan',
      tag: 'Time Off', unread: true,
      date: '28 Mei 2026', time: '11:20',
      preview: 'Mengajukan cuti tahunan selama 3 hari (10–12 Juni 2026). Menunggu persetujuan Anda.',
      template: 'timeoff-request',
      data: { name: 'Lia Permata', position: 'Product Designer', dates: '10–12 Juni 2026', days: 3, type: 'Cuti Tahunan', balance: 7, reason: 'Acara keluarga di luar kota.' }
    },
    {
      id: 3, cat: 'attendance', icon: 'clock-alert', source: 'SEVAKA Attendance', subject: 'Reminder: Clock-out',
      tag: 'Attendance', unread: true,
      date: '28 Mei 2026', time: '09:15',
      preview: 'Anda belum melakukan clock-out kemarin (27 Mei 2026). Mohon konfirmasi.',
      template: 'attendance-clockout',
      data: { clockIn: '08:14', clockOut: '—', date: '27 Mei 2026' }
    },
    {
      id: 4, cat: 'payroll', icon: 'wallet', source: 'SEVAKA Payroll', subject: 'Payslip Periode 04/2026 Tersedia',
      tag: 'Payroll', unread: true,
      date: '27 Mei 2026', time: '16:02',
      preview: 'Payslip Anda untuk periode April 2026 sudah dapat diunduh dari modul Payroll.',
      template: 'payroll-payslip'
    },
    {
      id: 5, cat: 'changedata', icon: 'user-cog', source: 'Andreas Wijaya', subject: 'Permohonan Ubah Data',
      tag: 'Change Data', unread: true,
      date: '27 Mei 2026', time: '14:30',
      preview: 'Mengajukan perubahan nomor rekening bank — menunggu persetujuan.',
      template: 'changedata-request',
      data: { name: 'Andreas Wijaya', field: 'Nomor Rekening Bank', before: '1234567890 (BCA)', after: '9876543210 (Mandiri)' }
    },
    {
      id: 6, cat: 'timeoff', icon: 'calendar-x-2', source: 'Bagas Pratama', subject: 'Cuti Sakit',
      tag: 'Time Off', unread: false,
      date: '27 Mei 2026', time: '10:05',
      preview: 'Mengajukan cuti sakit 1 hari dengan lampiran surat dokter.',
      template: 'timeoff-request',
      data: { name: 'Bagas Pratama', position: 'Backend Engineer', dates: '27 Mei 2026', days: 1, type: 'Cuti Sakit', balance: 11, reason: 'Demam, dengan lampiran surat dokter.' }
    },
    {
      id: 7, cat: 'reimbursement', icon: 'receipt', source: 'SEVAKA Finance', subject: 'Reimbursement Disetujui',
      tag: 'Reimbursement', unread: false,
      date: '26 Mei 2026', time: '17:44',
      preview: 'Reimbursement transportasi sebesar Rp 1.250.000 telah disetujui.',
      template: 'reimburse-approved',
      data: { amount: 'Rp 1.250.000', category: 'Transportasi', payoutDate: '31 Mei 2026' }
    },
    {
      id: 8, cat: 'overtime', icon: 'hourglass', source: 'Putu Sentana', subject: 'Pengajuan Lembur',
      tag: 'Overtime', unread: false,
      date: '26 Mei 2026', time: '15:10',
      preview: 'Pengajuan lembur 3 jam (Jumat, 30 Mei 2026) untuk proyek Q2 closing.',
      template: 'overtime-request',
      data: { name: 'Putu Sentana', date: '30 Mei 2026', hours: 3, project: 'Q2 Financial Close' }
    },
    {
      id: 9, cat: 'announcement', icon: 'megaphone', source: 'HRD SEVAKA', subject: 'Penyesuaian Hari Libur',
      tag: 'Announcement', unread: false,
      date: '26 Mei 2026', time: '09:30',
      preview: 'Pengumuman penyesuaian hari libur nasional periode Juni 2026.',
      template: 'announcement-generic',
      data: { headline: 'Penyesuaian Hari Libur Nasional — Juni 2026', body: 'Sehubungan dengan kalender pemerintah terbaru, hari libur 1 Juni (Hari Lahir Pancasila) jatuh pada hari Senin. Cuti bersama tidak diberlakukan.' }
    },
    {
      id: 10, cat: 'mpp', icon: 'users-round', source: 'Theodorus F.K.', subject: 'Update MPP Q3 2026',
      tag: 'MPP', unread: false,
      date: '25 Mei 2026', time: '11:00',
      preview: 'Manpower plan Q3 2026 telah diperbarui — harap tinjau alokasi divisi Engineering.',
      template: 'mpp-update'
    },
    {
      id: 11, cat: 'transfer', icon: 'users', source: 'SEVAKA Employees', subject: 'Mutasi Karyawan — Surabaya',
      tag: 'Transfer', unread: false,
      date: '24 Mei 2026', time: '13:48',
      preview: 'Sdr. Yota Rogers dimutasi dari Jakarta ke kantor cabang Surabaya per 1 Juli 2026.',
      template: 'transfer-notice',
      data: { name: 'Yota Rogers', from: 'Jakarta HQ', to: 'Cabang Surabaya', effective: '1 Juli 2026' }
    },
    {
      id: 12, cat: 'timeoff', icon: 'calendar-x-2', source: 'Made Adit', subject: 'Cuti Tahunan — Disetujui',
      tag: 'Time Off', unread: false,
      date: '23 Mei 2026', time: '09:11',
      preview: 'Cuti tahunan 2 hari (5–6 Juni) telah disetujui oleh atasan Anda.',
      template: 'timeoff-approved',
      data: { dates: '5–6 Juni 2026', days: 2 }
    },
    {
      id: 13, cat: 'attendance', icon: 'clock-alert', source: 'SEVAKA Attendance', subject: 'Live Attendance Aktif',
      tag: 'Attendance', unread: false,
      date: '22 Mei 2026', time: '07:55',
      preview: 'Fitur Live Attendance kini aktif. Pastikan lokasi Anda dalam radius kantor saat clock-in.',
      template: 'announcement-generic',
      data: { headline: 'Live Attendance — Aktif', body: 'Fitur Live Attendance dengan validasi GPS telah aktif untuk seluruh karyawan. Pastikan lokasi Anda dalam radius kantor saat melakukan clock-in dan clock-out.' }
    },
    {
      id: 14, cat: 'changedata', icon: 'user-cog', source: 'SEVAKA Profile', subject: 'Konfirmasi Email',
      tag: 'Change Data', unread: false,
      date: '21 Mei 2026', time: '16:25',
      preview: 'Perubahan email pada profil Anda telah dikonfirmasi.',
      template: 'changedata-confirm'
    }
  ];

  // ============================================================
  // Category meta (label + icon classes used for icon tiles)
  // ============================================================
  const catMeta = {
    payroll:      { label: 'Payroll',           tile: 'notif-icon--payroll',    tag: 'tag-payroll' },
    timeoff:      { label: 'Time Off',          tile: 'notif-icon--timeoff',    tag: 'tag-timeoff' },
    attendance:   { label: 'Attendance',        tile: 'notif-icon--attendance', tag: 'tag-attendance' },
    reimbursement:{ label: 'Reimbursement',     tile: 'notif-icon--reimburse',  tag: 'tag-reimburse' },
    mpp:          { label: 'MPP',               tile: 'notif-icon--mpp',        tag: 'tag-mpp' },
    overtime:     { label: 'Overtime',          tile: 'notif-icon--overtime',   tag: 'tag-overtime' },
    shift:        { label: 'Change Shift',      tile: 'notif-icon--shift',      tag: 'tag-shift' },
    changedata:   { label: 'Change Data',       tile: 'notif-icon--changedata', tag: 'tag-changedata' },
    addemp:       { label: 'Add Employee',      tile: 'notif-icon--addemp',     tag: 'tag-addemp' },
    transfer:     { label: 'Employee Transfer', tile: 'notif-icon--transfer',   tag: 'tag-transfer' },
    goal:         { label: 'Goal',              tile: 'notif-icon--goal',       tag: 'tag-goal' },
    reviews:      { label: 'Reviews',           tile: 'notif-icon--reviews',    tag: 'tag-reviews' },
    report:       { label: 'Report Builder',    tile: 'notif-icon--report',     tag: 'tag-report' },
    delegation:   { label: 'Delegation',        tile: 'notif-icon--delegation', tag: 'tag-delegation' },
    announcement: { label: 'Announcement',      tile: 'notif-icon--announcement', tag: 'tag-announcement' }
  };

  // ============================================================
  // State
  // ============================================================
  let activeCat = 'all';
  let selectedId = null;
  let searchTerm = '';

  // ============================================================
  // Util — get filtered message list
  // ============================================================
  function filtered() {
    return messages.filter(function (m) {
      // Approvals = anything that needs HR action (timeoff/overtime/changedata/reimbursement requests still unread)
      if (activeCat === 'approvals') {
        return ['timeoff', 'overtime', 'changedata', 'reimbursement'].indexOf(m.cat) !== -1 &&
               /Pengajuan|Permohonan|Permintaan|request/i.test(m.subject + ' ' + m.preview);
      }
      if (activeCat !== 'all' && m.cat !== activeCat) return false;
      if (searchTerm) {
        const hay = (m.source + ' ' + m.subject + ' ' + m.preview).toLowerCase();
        return hay.indexOf(searchTerm.toLowerCase()) !== -1;
      }
      return true;
    });
  }

  // ============================================================
  // Render — left rail counts
  // ============================================================
  function renderCounts() {
    // Total unread per category
    const totals = { all: 0, approvals: 0 };
    messages.forEach(function (m) {
      if (m.unread) totals.all++;
      totals[m.cat] = (totals[m.cat] || 0) + (m.unread ? 1 : 0);
    });
    // Approvals unread = unread timeoff/overtime/changedata requests
    messages.forEach(function (m) {
      if (m.unread && ['timeoff','overtime','changedata','reimbursement'].indexOf(m.cat) !== -1 &&
          /Pengajuan|Permohonan/i.test(m.subject)) {
        totals.approvals++;
      }
    });

    document.querySelectorAll('[data-count-cat]').forEach(function (el) {
      const k = el.getAttribute('data-count-cat');
      const v = totals[k] || 0;
      el.textContent = v;
      if (v === 0) el.classList.add('is-muted');
      else el.classList.remove('is-muted');
    });
  }

  // ============================================================
  // Render — message list
  // ============================================================
  function renderList() {
    const list = document.getElementById('inboxList');
    const items = filtered();

    // Heading
    const headingEl = document.getElementById('listHeading');
    const subEl     = document.getElementById('listSub');
    const labels = {
      all: 'All Messages', approvals: 'Approvals',
      announcement: 'Announcements', report: 'Report Builder'
    };
    const label = labels[activeCat] || (catMeta[activeCat] && catMeta[activeCat].label) || 'Messages';
    headingEl.textContent = label;
    const unreadCount = items.filter(function (m) { return m.unread; }).length;
    subEl.textContent = items.length + (items.length === 1 ? ' message' : ' messages') +
                        (unreadCount ? ' • ' + unreadCount + ' unread' : '');

    if (items.length === 0) {
      list.innerHTML =
        '<li class="inbox-list__empty">' +
          '<div class="inbox-list__empty-icon"><i data-lucide="inbox"></i></div>' +
          '<div class="inbox-list__empty-title">No messages here</div>' +
          '<p class="inbox-list__empty-sub">Belum ada pesan pada kategori ini. Notifikasi baru akan muncul di sini secara otomatis.</p>' +
        '</li>';
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    list.innerHTML = items.map(function (m) {
      const meta = catMeta[m.cat] || {};
      return (
        '<li class="msg ' + (m.unread ? 'is-unread ' : '') + (m.id === selectedId ? 'is-selected' : '') + '" data-id="' + m.id + '">' +
          '<label class="checkbox msg__check" onclick="event.stopPropagation()">' +
            '<input type="checkbox" data-msg-check="' + m.id + '">' +
            '<span class="checkbox__box"></span>' +
          '</label>' +
          '<span class="msg__icon ' + (meta.tile || '') + '"><i data-lucide="' + m.icon + '"></i></span>' +
          '<div class="msg__body">' +
            '<div class="msg__row">' +
              '<span class="msg__source">' + m.source + '</span>' +
              '<span class="msg__date">' + m.date + '</span>' +
            '</div>' +
            '<div class="msg__subject">' + m.subject + '</div>' +
            '<p class="msg__preview">' + m.preview + '</p>' +
            '<div class="msg__meta">' +
              '<span class="msg__tag ' + (meta.tag || '') + '">' + (m.tag || '') + '</span>' +
              '<span class="msg__unread-dot" aria-hidden="true"></span>' +
            '</div>' +
          '</div>' +
        '</li>'
      );
    }).join('');

    // wire row clicks
    list.querySelectorAll('.msg').forEach(function (row) {
      row.addEventListener('click', function () {
        const id = parseInt(row.getAttribute('data-id'), 10);
        selectMessage(id);
      });
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // ============================================================
  // Detail templates
  // ============================================================
  function detailEmpty() {
    return (
      '<div class="detail-empty">' +
        '<div class="detail-empty__art">' +
          '<svg class="lucide-icon-big" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>' +
          '</svg>' +
        '</div>' +
        '<h2 class="detail-empty__title">Pilih sebuah pesan</h2>' +
        '<p class="detail-empty__sub">Pilih satu pesan dari daftar di sebelah kiri untuk melihat detailnya — laporan, lampiran, dan langkah lanjutan akan muncul di sini.</p>' +
      '</div>'
    );
  }

  function detailHead(m, statusBadge) {
    const meta = catMeta[m.cat] || {};
    return (
      '<header class="detail__head">' +
        '<div class="detail__head-main">' +
          '<span class="detail__icon ' + (meta.tile || '') + '"><i data-lucide="' + m.icon + '"></i></span>' +
          '<div class="detail__head-text">' +
            '<span class="detail__source">' + m.source.toUpperCase() + '</span>' +
            '<span class="detail__subject">' + m.subject + '</span>' +
            (statusBadge ? '<div class="detail__meta">' + statusBadge + '</div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="detail__actions">' +
          '<div class="detail__actions-row">' +
            '<button class="detail-action"><i data-lucide="archive"></i>Archive</button>' +
            '<button class="detail-action is-danger"><i data-lucide="trash-2"></i>Delete</button>' +
          '</div>' +
          '<span class="detail__timestamp">' + m.date + ' • ' + m.time + '</span>' +
        '</div>' +
      '</header>'
    );
  }

  // --- Specific body renderers ---

  function bodyPayrollRun() {
    return (
      '<div class="detail__body">' +
        '<div class="detail__hero-art">' +
          '<div class="payroll-art">' +
            '<div class="payroll-art__tile">' +
              '<i data-lucide="file-text"></i>' +
              '<span class="payroll-art__check"><i data-lucide="check"></i></span>' +
            '</div>' +
            '<i data-lucide="chevron-right" class="payroll-art__arrow"></i>' +
            '<div class="payroll-art__tile">' +
              '<i data-lucide="wallet"></i>' +
              '<span class="payroll-art__clock"><i data-lucide="clock"></i></span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<p class="detail__intro">' +
          'Hai <b>Tony Stark</b>, proses kalkulasi <b>payroll periode 05/2026</b> telah selesai. ' +
          'Anda dapat <a href="#" onclick="event.preventDefault()">meminta persetujuan</a>, mengunci/membuka payroll, ' +
          'mempublikasikan slip gaji, mengunduh e-banking, serta melakukan disbursement melalui halaman <b>Payroll History</b>.' +
        '</p>' +

        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="bar-chart-3"></i>View Report</button>' +
          '<button class="btn-secondary">Go to Payroll history →</button>' +
        '</div>' +

        '<div class="detail__group">' +
          '<h4 class="detail__section-h">What\'s next after run payroll?</h4>' +
          '<div class="detail__followup">' +
            '<div class="detail__followup-thumb">' +
              '<i data-lucide="banknote"></i>' +
            '</div>' +
            '<div class="detail__followup-body">' +
              '<span class="detail__followup-title">Payroll Disbursement</span>' +
              '<p class="detail__followup-desc">Satu klik untuk mendistribusikan gaji karyawan Anda secara instan ke lebih dari 150 bank di Indonesia, tanpa biaya. <a href="#" onclick="event.preventDefault()" style="color:var(--color-secondary-500); font-weight:600">Pelajari</a></p>' +
              '<a class="detail__followup-link" href="#" onclick="event.preventDefault()">Request demo →</a>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="detail__group">' +
          '<span class="detail__alt-label">Alternative solution</span>' +
          '<div class="detail__followup">' +
            '<div class="detail__followup-thumb">' +
              '<i data-lucide="landmark"></i>' +
            '</div>' +
            '<div class="detail__followup-body">' +
              '<span class="detail__followup-title">E-Banking</span>' +
              '<p class="detail__followup-desc">Gunakan fitur e-banking untuk upload ke sistem bank yang dapat digunakan untuk pembayaran payroll. <a href="#" onclick="event.preventDefault()" style="color:var(--color-secondary-500); font-weight:600">Panduan</a></p>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyPayrollPayslip(m) {
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          'Payslip Anda untuk <b>periode April 2026</b> sudah tersedia. ' +
          'Anda dapat mengunduhnya dari modul Payroll atau menyalin ringkasannya ke email.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Periode</span><span class="detail__info-value">April 2026</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Net Pay</span><span class="detail__info-value">Rp 12.450.000</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Tanggal Cair</span><span class="detail__info-value">28 April 2026</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Rekening</span><span class="detail__info-value">BCA •••• 7890</span></div>' +
        '</div>' +
        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="download"></i>Download Payslip</button>' +
          '<button class="btn-secondary">View full payslip →</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyTimeOffRequest(m) {
    const d = m.data;
    return (
      '<div class="detail__body">' +
        '<div class="detail__hero-art">' +
          '<div class="req-avatar">' + (d.name || '?').split(' ').map(function (n) { return n[0]; }).slice(0,2).join('') + '</div>' +
        '</div>' +
        '<p class="detail__intro">' +
          '<b>' + d.name + '</b> (' + d.position + ') mengajukan <b>' + d.type + '</b> selama <b>' + d.days + ' hari</b> ' +
          'pada <b>' + d.dates + '</b>.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Tipe</span><span class="detail__info-value">' + d.type + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Tanggal</span><span class="detail__info-value">' + d.dates + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Durasi</span><span class="detail__info-value">' + d.days + ' hari</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Sisa Saldo Cuti</span><span class="detail__info-value">' + d.balance + ' hari</span></div>' +
          '<div class="detail__info-row" style="grid-column:1 / -1"><span class="detail__info-label">Alasan</span><span class="detail__info-value" style="font-weight:500">' + d.reason + '</span></div>' +
        '</div>' +
        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="external-link"></i>Open in Time Off module</button>' +
          '<button class="btn-secondary">Lihat riwayat cuti karyawan →</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyTimeOffApproved(m) {
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          'Cuti tahunan Anda selama <b>' + m.data.days + ' hari</b> pada <b>' + m.data.dates + '</b> telah <b>disetujui</b>.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Status</span><span class="detail__info-value"><span class="detail__status status--success">Disetujui</span></span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Persetujuan</span><span class="detail__info-value">Tony Stark — 23 Mei 2026</span></div>' +
        '</div>' +
        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="calendar"></i>Tambahkan ke kalender</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyAttendanceClockout(m) {
    const d = m.data;
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          'Anda <b>belum melakukan clock-out</b> pada hari ' + d.date + '. ' +
          'Mohon konfirmasi waktu keluar Anda agar catatan kehadiran tetap akurat.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Tanggal</span><span class="detail__info-value">' + d.date + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Clock-in</span><span class="detail__info-value">' + d.clockIn + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Clock-out</span><span class="detail__info-value" style="color:var(--color-warning-700)">' + d.clockOut + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Status</span><span class="detail__info-value"><span class="detail__status status--warning">Belum lengkap</span></span></div>' +
        '</div>' +
        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="log-out"></i>Konfirmasi clock-out</button>' +
          '<button class="btn-secondary">Buka halaman Attendance →</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyChangeDataRequest(m) {
    const d = m.data;
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          '<b>' + d.name + '</b> mengajukan perubahan pada <b>' + d.field + '</b>. Tinjau detail di bawah sebelum menyetujui.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Field</span><span class="detail__info-value">' + d.field + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Status</span><span class="detail__info-value"><span class="detail__status status--info">Menunggu</span></span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Sebelum</span><span class="detail__info-value" style="color:var(--fg-3); text-decoration:line-through">' + d.before + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Sesudah</span><span class="detail__info-value" style="color:var(--color-secondary-700)">' + d.after + '</span></div>' +
        '</div>' +
        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="external-link"></i>Tinjau di Employee Directory</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyChangeDataConfirm() {
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          'Email pada profil Anda telah berhasil diperbarui. Email baru kini menjadi identitas Anda di SEVAKA.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Status</span><span class="detail__info-value"><span class="detail__status status--success">Diperbarui</span></span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Field</span><span class="detail__info-value">Email</span></div>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyReimburseApproved(m) {
    const d = m.data;
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          'Reimbursement Anda untuk kategori <b>' + d.category + '</b> sebesar <b>' + d.amount + '</b> telah <b>disetujui</b> dan akan dibayarkan pada ' + d.payoutDate + '.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Kategori</span><span class="detail__info-value">' + d.category + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Jumlah</span><span class="detail__info-value">' + d.amount + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Status</span><span class="detail__info-value"><span class="detail__status status--success">Disetujui</span></span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Tanggal Cair</span><span class="detail__info-value">' + d.payoutDate + '</span></div>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyOvertimeRequest(m) {
    const d = m.data;
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          '<b>' + d.name + '</b> mengajukan lembur <b>' + d.hours + ' jam</b> pada <b>' + d.date + '</b> untuk proyek <b>' + d.project + '</b>.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Tanggal</span><span class="detail__info-value">' + d.date + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Durasi</span><span class="detail__info-value">' + d.hours + ' jam</span></div>' +
          '<div class="detail__info-row" style="grid-column:1 / -1"><span class="detail__info-label">Proyek</span><span class="detail__info-value">' + d.project + '</span></div>' +
        '</div>' +
        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="external-link"></i>Tinjau di modul Overtime</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyAnnouncementGeneric(m) {
    const d = m.data;
    return (
      '<div class="detail__body">' +
        '<h3 style="font:700 18px/1.3 var(--font-display); margin:0; color:var(--fg-1); letter-spacing:-0.01em">' + d.headline + '</h3>' +
        '<p style="font:400 14px/1.7 var(--font-body); color:var(--fg-2); margin:0">' + d.body + '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Penerbit</span><span class="detail__info-value">' + m.source + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Tanggal</span><span class="detail__info-value">' + m.date + '</span></div>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyMppUpdate() {
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          '<b>Manpower Plan Q3 2026</b> telah diperbarui. Alokasi untuk divisi <b>Engineering</b> meningkat sebesar 12% dibandingkan kuartal sebelumnya.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Periode</span><span class="detail__info-value">Q3 2026</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Divisi Terdampak</span><span class="detail__info-value">Engineering, Product</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Δ Headcount</span><span class="detail__info-value" style="color:var(--color-success-700)">+12%</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Status</span><span class="detail__info-value"><span class="detail__status status--info">Tinjauan</span></span></div>' +
        '</div>' +
        '<div class="detail__primary-cta">' +
          '<button class="btn-primary"><i data-lucide="external-link"></i>Buka MPP Dashboard</button>' +
        '</div>' +
      '</div>'
    );
  }

  function bodyTransferNotice(m) {
    const d = m.data;
    return (
      '<div class="detail__body">' +
        '<p class="detail__intro">' +
          '<b>' + d.name + '</b> akan dimutasi dari <b>' + d.from + '</b> ke <b>' + d.to + '</b> efektif <b>' + d.effective + '</b>.' +
        '</p>' +
        '<div class="detail__info-grid">' +
          '<div class="detail__info-row"><span class="detail__info-label">Karyawan</span><span class="detail__info-value">' + d.name + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Tanggal Efektif</span><span class="detail__info-value">' + d.effective + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Dari</span><span class="detail__info-value">' + d.from + '</span></div>' +
          '<div class="detail__info-row"><span class="detail__info-label">Ke</span><span class="detail__info-value" style="color:var(--color-secondary-700)">' + d.to + '</span></div>' +
        '</div>' +
      '</div>'
    );
  }

  // ============================================================
  // Render — detail panel
  // ============================================================
  function renderDetail() {
    const wrap = document.getElementById('inboxDetail');
    if (!wrap) return;

    if (selectedId == null) {
      wrap.innerHTML = detailEmpty();
      if (window.lucide) window.lucide.createIcons();
      return;
    }
    const m = messages.find(function (x) { return x.id === selectedId; });
    if (!m) {
      wrap.innerHTML = detailEmpty();
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    let body = '';
    switch (m.template) {
      case 'payroll-run':          body = bodyPayrollRun(); break;
      case 'payroll-payslip':      body = bodyPayrollPayslip(m); break;
      case 'timeoff-request':      body = bodyTimeOffRequest(m); break;
      case 'timeoff-approved':     body = bodyTimeOffApproved(m); break;
      case 'attendance-clockout':  body = bodyAttendanceClockout(m); break;
      case 'changedata-request':   body = bodyChangeDataRequest(m); break;
      case 'changedata-confirm':   body = bodyChangeDataConfirm(); break;
      case 'reimburse-approved':   body = bodyReimburseApproved(m); break;
      case 'overtime-request':     body = bodyOvertimeRequest(m); break;
      case 'announcement-generic': body = bodyAnnouncementGeneric(m); break;
      case 'mpp-update':           body = bodyMppUpdate(); break;
      case 'transfer-notice':      body = bodyTransferNotice(m); break;
      default: body = '<div class="detail__body"><p class="detail__intro">' + (m.preview || '') + '</p></div>';
    }

    wrap.innerHTML = '<div class="detail">' + detailHead(m) + body + '</div>';
    if (window.lucide) window.lucide.createIcons();
  }

  // ============================================================
  // Selection
  // ============================================================
  function selectMessage(id) {
    selectedId = id;
    // mark as read
    const m = messages.find(function (x) { return x.id === id; });
    if (m && m.unread) {
      m.unread = false;
      renderCounts();
    }
    renderList();
    renderDetail();
  }

  // ============================================================
  // Category click
  // ============================================================
  function setActiveCat(cat) {
    activeCat = cat;
    document.querySelectorAll('.cat').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-cat') === cat);
    });
    // keep selection if still in filtered set
    if (selectedId != null) {
      const m = messages.find(function (x) { return x.id === selectedId; });
      const list = filtered();
      if (!m || list.indexOf(m) === -1) selectedId = null;
    }
    renderList();
    renderDetail();
  }

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    // Category buttons
    document.querySelectorAll('.cat').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setActiveCat(btn.getAttribute('data-cat'));
      });
    });

    // Category filter (left rail search)
    const catFilter = document.getElementById('catFilter');
    if (catFilter) {
      catFilter.addEventListener('input', function () {
        const v = catFilter.value.toLowerCase();
        document.querySelectorAll('.cat').forEach(function (b) {
          const label = (b.querySelector('.cat__label').textContent || '').toLowerCase();
          b.style.display = label.indexOf(v) !== -1 ? '' : 'none';
        });
      });
    }

    // Message search
    const msgSearch = document.getElementById('msgSearch');
    if (msgSearch) {
      msgSearch.addEventListener('input', function () {
        searchTerm = msgSearch.value;
        renderList();
      });
    }

    // Select-all & toolbar buttons
    const selAll = document.getElementById('msgSelectAll');
    if (selAll) {
      selAll.addEventListener('change', function () {
        document.querySelectorAll('[data-msg-check]').forEach(function (c) { c.checked = selAll.checked; });
        document.getElementById('markReadBtn').disabled = !selAll.checked;
        document.getElementById('deleteBtn').disabled   = !selAll.checked;
      });
    }

    // Mark all read (page header button)
    const markAll = document.getElementById('markAllReadBtn');
    if (markAll) {
      markAll.addEventListener('click', function () {
        messages.forEach(function (m) { m.unread = false; });
        renderCounts();
        renderList();
      });
    }

    // Open with query string ?cat=...
    const qs = new URLSearchParams(window.location.search);
    const initCat = qs.get('cat');
    if (initCat && document.querySelector('[data-cat="' + initCat + '"]')) {
      setActiveCat(initCat);
    } else {
      renderCounts();
      renderList();
      renderDetail();
    }
  });
})();
