/**
 * =============================================================================
 * SEVAKA HRIS — Peta navigasi (single source of truth)
 * -----------------------------------------------------------------------------
 * Port dari `_prototype/js/shell.js` (array NAV). Setiap leaf membawa:
 *   path   → route aplikasi React
 *   source → file prototype asalnya (acuan konversi, ada di /_prototype)
 *   status → 'done' bila sudah dikonversi, 'todo' bila masih placeholder
 *
 * Menambah halaman = tambah satu leaf di sini. Router (`src/app/routes.tsx`)
 * otomatis membuat placeholder untuk setiap leaf ber-`path` yang belum punya
 * komponen, jadi navigasi tidak pernah mati saat konversi masih berjalan.
 * =============================================================================
 */

export type NavStatus = 'done' | 'todo';

export interface NavLeaf {
  label: string;
  icon?: string;
  path?: string;
  /** File prototype asal — dipakai PlaceholderPage & dokumen hand-off. */
  source?: string;
  status?: NavStatus;
  children?: NavLeaf[];
  /** Menu belum diputuskan di kontrak (lihat catatan PROB-* di prototype). */
  note?: string;
  /**
   * Baris "pintu" ke halaman Settings modul — dirender seperti hyperlink (kecil, redup, ikon panah),
   * bukan menu kerja HR. Lihat `NAV_SETTINGS` (keputusan Theo 3 Nov 2026, masukan HR).
   */
  settingsLink?: boolean;
}

export interface NavSection {
  section: string;
  note?: string;
  /**
   * Produk satu-section: menu tampil langsung tanpa judul section yang bisa dilipat. Pohon
   * menunya tetap sama — hanya judulnya yang tidak dirender (disetujui Theo, 1 Okt 2026).
   */
  flat?: boolean;
  children: NavLeaf[];
}

export const NAV: NavSection[] = [
  {
    section: 'Employee Profile',
    children: [
      {
        label: 'General',
        icon: 'user',
        children: [
          {
            label: 'Personal',
            children: [
              { label: 'Basic Info', path: '/me/profile', source: 'employee-profile.html', status: 'done' },
              { label: 'Family', path: '/me/profile/family', source: 'employee-profile.html', status: 'done' },
              {
                label: 'Emergency Contact',
                path: '/me/profile/emergency-contact',
                source: 'employee-profile.html',
                status: 'done',
              },
            ],
          },
          { label: 'Employment' },
          {
            label: 'Education & Experience',
            children: [
              { label: 'Formal Education', path: '/me/profile/formal-education', source: 'employee-profile.html', status: 'done' },
              { label: 'Informal Education', path: '/me/profile/informal-education', source: 'employee-profile.html', status: 'done' },
              { label: 'Working Experience', path: '/me/profile/working-experience', source: 'employee-profile.html', status: 'done' },
            ],
          },
          { label: 'Additional Info', path: '/me/profile/additional-info', source: 'employee-profile.html', status: 'done' },
        ],
      },
      {
        label: 'Time Management',
        icon: 'clock',
        children: [
          { label: 'Attendance', path: '/me/time/attendance', source: 'time-attendance.html', status: 'done' },
          {
            label: 'Time Off',
            children: [
              { label: 'Time Off', path: '/me/time/time-off', source: 'time-off-request.html', status: 'done' },
              { label: 'Delegation', path: '/me/time/time-off/delegation', source: 'time-off-request.html', status: 'done' },
              { label: 'Time Off Taken', path: '/me/time/time-off/taken', source: 'time-off-balance.html', status: 'done' },
            ],
          },
          { label: 'Overtime', path: '/me/time/overtime', source: 'time-overtime.html', status: 'done' },
        ],
      },
      {
        label: 'Payroll',
        icon: 'wallet',
        children: [
          { label: 'Payroll Info', path: '/me/payroll', source: 'payroll-doc-ess.html', status: 'done' },
          { label: 'Payslip', path: '/me/payslip', source: 'payroll-doc-payslip.html', status: 'done' },
        ],
      },
      { label: 'Finance', icon: 'hand-coins', path: '/me/finance', source: 'finance-ess.html', status: 'done' },
      { label: 'Files', icon: 'folder', path: '/me/files', source: 'document-ess-files.html', status: 'done' },
      { label: 'My Transition', icon: 'git-fork', path: '/me/transition', source: 'FSD-001-EMPLOYEE §20', status: 'done' },
      { label: 'Assets', icon: 'box' },
      {
        label: 'History',
        icon: 'history',
        children: [{ label: 'Adjustment' }, { label: 'Transfer' }, { label: 'NPP' }, { label: 'Reprimand' }],
      },
    ],
  },

  {
    section: 'Employee Management',
    children: [
      {
        label: 'Employee Directory',
        icon: 'users',
        children: [
          {
            label: 'Employee List',
            icon: 'list',
            children: [
              { label: 'Directory', path: '/employees/directory', source: 'employee-directory.html', status: 'done' },
              { label: 'Organization', path: '/employees/organization', source: 'employee-directory.html', status: 'done' },
            ],
          },
          // "Employee Transfer" disembunyikan sejak FSD-001-EMPLOYEE 0.83 §19 (diganti menu Transition);
          // rutenya tetap ada dan dialihkan ke /employees/transition.
          { label: 'Mass Resignation', path: '/employees/mass-resignation', source: 'mass-resignation.html', status: 'done' },
          { label: 'Employee Bulk Import', path: '/employees/bulk-import', source: 'FSD-001-EMPLOYEE §8', status: 'done' },
          { label: 'Import/Export Prorate' },
          { label: 'PTKP Status Adjustment', path: '/employees/ptkp-adjustment', source: 'ptkp-adjustment.html', status: 'done' },
          // FSD-001-EMPLOYEE 0.83 §10–§14 (disetujui Theo, 24 Okt 2026).
          {
            label: 'Temporary Assignment',
            path: '/employees/temporary-assignment',
            source: 'FSD-001-EMPLOYEE §10',
            status: 'done',
          },
        ],
      },
      {
        label: 'Manpower Planning',
        icon: 'clipboard-list',
        children: [
          { label: 'Overview', path: '/employees/manpower/planning', source: 'manpower-requisition.html', status: 'done' },
          { label: 'Planning History', path: '/employees/manpower/history', source: 'manpower-requisition.html', status: 'done' },
          { label: 'Requisition', path: '/employees/manpower/requisition', source: 'manpower-requisition.html', status: 'done' },
          // FSD-001-EMPLOYEE 0.46 §4A (disetujui Theo, 24 Okt 2026).
          { label: 'ATS Bridge', path: '/employees/manpower/ats-bridge', source: 'FSD-001-EMPLOYEE §4A', status: 'done' },
        ],
      },
      // `add-employee.html` sengaja TIDAK punya baris menu di prototype; layarnya
      // dibuka dari tombol di halaman New Joiner.
      {
        label: 'New Joiner Submission',
        icon: 'user-plus',
        path: '/employees/new-joiner',
        source: 'new-joiner.html',
        status: 'done',
      },
      // Task transisi milik PIC lintas transisi (disetujui Theo, 24 Okt 2026; aksi = UIC-EMPLOYEE §5.3).
      {
        label: 'My Transition Tasks',
        icon: 'list-checks',
        path: '/employees/my-transition-tasks',
        source: 'FSD-001-EMPLOYEE §18',
        status: 'done',
      },
      // FSD-001-EMPLOYEE 0.83 §19: satu menu Transition menggantikan Employee Transfer + dua dashboard
      // Onboarding/Offboarding (disembunyikan, bukan dihapus — disetujui Theo, 24 Okt 2026).
      { label: 'Transition', icon: 'split', path: '/employees/transition', source: 'FSD-001-EMPLOYEE §19', status: 'done' },
      {
        label: 'Onboarding',
        icon: 'user-check',
        children: [
          {
            label: 'Onboarding Closure',
            path: '/employees/onboarding/closure',
            source: 'FSD-001-EMPLOYEE §16',
            status: 'done',
          },
        ],
      },
      { label: 'Reprimand', icon: 'alert-triangle', path: '/employees/reprimand', source: 'reprimand.html', status: 'done' },
      settingsDoor('Employee settings', 'employee'),
    ],
  },

  {
    section: 'Time Management',
    children: [
      {
        label: 'Time Off',
        icon: 'palmtree',
        children: [
          { label: 'Time Off Request', path: '/time/time-off/requests', source: 'time-off-request.html', status: 'done' },
          { label: 'Time Off Balance', path: '/time/time-off/balance', source: 'time-off-balance.html', status: 'done' },
        ],
      },
      {
        label: 'Attendance',
        icon: 'fingerprint',
        children: [
          { label: 'Attendance', path: '/time/attendance', source: 'time-attendance.html', status: 'done' },
          {
            label: 'WFH Permission',
            path: '/time/attendance/wfh-permission',
            status: 'done',
            note: 'FSD-001-TIME 0.21 Peta Menu #12 + §11A; UIC-001-TIME 0.27 §6.4 (#99–#101)',
          },
        ],
      },
      { label: 'Overtime', icon: 'timer', path: '/time/overtime', source: 'time-overtime.html', status: 'done' },
      {
        label: 'Scheduler',
        icon: 'calendar-clock',
        children: [
          { label: 'Index', path: '/time/scheduler', source: 'time-scheduler-index.html', status: 'done' },
          { label: 'Schedule', path: '/time/scheduler/schedule', source: 'time-scheduler-schedule.html', status: 'done' },
        ],
      },
      {
        label: 'On Call',
        icon: 'phone-call',
        children: [
          { label: 'On Call Schedule', path: '/time/on-call', source: 'time-oncall.html', status: 'done' },
          { label: 'On Call Activity', path: '/time/on-call/activity', source: 'time-oncall-activity.html', status: 'done' },
        ],
      },
      settingsDoor('Time settings', 'time-management'),
    ],
  },

  {
    section: 'Finance',
    children: [
      {
        label: 'Benefit Reimbursement',
        icon: 'receipt',
        path: '/finance/benefit-reimbursement',
        source: 'finance-benefit-reimbursement.html',
        status: 'done',
      },
      { label: 'Loan', icon: 'landmark', path: '/finance/loan', source: 'finance-loan.html', status: 'done' },
      { label: 'Cash Advance', icon: 'banknote', path: '/finance/cash-advance', source: 'finance-cash-advance.html', status: 'done' },
      {
        label: 'Disbursement & Receivables',
        icon: 'coins',
        path: '/finance/disbursement',
        source: 'finance-disbursement.html',
        status: 'done',
      },
      settingsDoor('Finance settings', 'finance'),
    ],
  },

  {
    section: 'Payroll',
    children: [
      {
        label: 'Salary Processing',
        icon: 'wallet',
        path: '/payroll/salary-processing',
        source: 'payroll-doc-processing.html',
        status: 'done',
      },
      {
        label: 'Authorization & Handover',
        icon: 'shield-check',
        path: '/payroll/authorization',
        source: 'payroll-doc-authorization.html',
        status: 'done',
      },
      { label: 'Payroll Allocation', icon: 'split' },
      { label: 'Reports', icon: 'bar-chart-3' },
      settingsDoor('Payroll settings', 'payroll'),
    ],
  },

  {
    section: 'Productivity',
    children: [
      {
        label: 'Project & Task',
        icon: 'square-kanban',
        children: [
          { label: 'Project', path: '/productivity/projects', source: 'productivity-projects.html', status: 'done' },
          { label: 'Tasks', path: '/productivity/tasks', source: 'productivity-tasks.html', status: 'done' },
          {
            label: 'Timesheet',
            children: [
              { label: 'Time Tracker', path: '/productivity/timesheet/tracker', source: 'productivity-time-tracker.html', status: 'done' },
              { label: 'Activities', path: '/productivity/timesheet/activities', source: 'productivity-activities.html', status: 'done' },
              { label: 'Summary', path: '/productivity/timesheet/summary', source: 'productivity-summary.html', status: 'done' },
              {
                label: 'Tracker Report',
                path: '/productivity/timesheet/report',
                source: 'productivity-tracker-report.html',
                status: 'done',
              },
            ],
          },
          {
            label: 'Group for Payroll',
            children: [
              { label: 'Task List', path: '/productivity/payroll-group/tasks', source: 'productivity-task-list.html', status: 'done' },
              { label: 'Group List', path: '/productivity/payroll-group/groups', source: 'productivity-group-list.html', status: 'done' },
            ],
          },
        ],
      },
      {
        label: 'Forms & Survey',
        icon: 'clipboard-check',
        children: [
          { label: 'Forms', path: '/productivity/forms', source: 'productivity-forms.html', status: 'done' },
          {
            label: 'My Submissions',
            path: '/productivity/forms/my-submissions',
            source: 'productivity-my-submissions.html',
            status: 'done',
          },
        ],
      },
      { label: 'Document Templates', icon: 'file-text' },
    ],
  },

  {
    section: 'Company Management',
    children: [
      {
        label: 'Assets',
        icon: 'box',
        children: [
          { label: 'Asset List', path: '/company-management/assets', source: 'company-assets.html', status: 'done' },
          { label: 'Assigned Assets', path: '/company-management/assets/assigned', source: 'company-assets.html', status: 'done' },
          { label: 'Disposal', path: '/company-management/assets/disposal', source: 'company-disposal.html', status: 'done' },
        ],
      },
      { label: 'Announcement', icon: 'megaphone', path: '/company-management/announcements', status: 'done' },
      { label: 'Activity Log', icon: 'activity', path: '/company-management/activity-log', status: 'done' },
      {
        label: 'Notification',
        icon: 'bell',
        path: '/company-management/notifications',
        source: 'notification-inbox.html',
        status: 'done',
      },
      // "Notification (rich inbox)" (inbox.html) disembunyikan dulu atas permintaan Theo, 25 Sep 2026 —
      // banyak elemennya tanpa jangkar FSD-NOTIFICATION (lihat _prototype/NOTIFICATION-GAP-NOTES.md).
      {
        label: 'Files',
        icon: 'folder',
        note: 'FSD-001-DOCUMENT §1: Files berisi tepat empat baris (3 layar file + Document Templates).',
        children: [
          { label: 'Company Files', path: '/company-management/files/company', source: 'document-company-files.html', status: 'done' },
          { label: 'Employee Files', path: '/company-management/files/employee', source: 'document-employee-files.html', status: 'done' },
          { label: 'Other Files', path: '/company-management/files/other', source: 'document-other-files.html', status: 'done' },
        ],
      },
      settingsDoor('Company settings', 'company'),
    ],
  },

  {
    section: 'Document — no menu row yet',
    note: 'Layar lengkap secara kontrak tapi belum punya baris menu (PROB-SERVICE-356 / -407). Verifikasi publik memang tanpa menu (DOC-80).',
    children: [
      { label: 'Letter Issuance', icon: 'mail-plus', path: '/documents/letter-issuance', source: 'document-letter-issuance.html', status: 'done' },
      {
        label: 'Document Access Trail',
        icon: 'scroll-text',
        path: '/documents/access-trail',
        source: 'document-access-log.html',
        status: 'done',
      },
      { label: 'Public Letter Verification', icon: 'badge-check', path: '/verify', source: 'document-verify.html', status: 'done' },
    ],
  },

  {
    section: 'Settings',
    flat: true,
    children: [{ label: 'Settings', icon: 'settings', path: '/settings', status: 'done' }],
  },

  {
    section: 'Authentication',
    children: [{ label: 'Login & Authentication', icon: 'log-in', children: [{ label: 'Login' }] }],
  },
];

/**
 * =============================================================================
 * NAV_SETTINGS — area Settings terpisah dari pekerjaan harian HR
 * -----------------------------------------------------------------------------
 * Keputusan Theo 3 Nov 2026 (masukan HR: "saya pusing, bagian ini seharusnya diurus bagian lain"):
 * menu master/setting KELUAR dari sidebar kerja dan dikumpulkan di sini per modul, meniru pola
 * Talenta (Settings › Company / Employee / Time Management / Payroll / Finance …). Ini SENGAJA
 * melanggar kunci pohon menu kontrak (`_prototype/js/shell.js`) — catatannya di
 * `docs/SETTINGS-SPLIT.md`. URL halaman TIDAK berubah (tautan lama tetap jalan); produk aktif
 * ditentukan `productForPath`, bukan awalan URL saja.
 *
 * `slug` section = segmen URL `/settings/<slug>` (halaman ringkasan modul) dan target
 * `settingsDoor()` di sidebar kerja.
 * =============================================================================
 */
export interface SettingsSection extends NavSection {
  slug: string;
  /** Satu kalimat untuk kartu di beranda Settings. */
  blurb: string;
}

export const NAV_SETTINGS: SettingsSection[] = [
  {
    section: 'Company',
    slug: 'company',
    blurb: 'Branches, organization structure, grades, cost centers, SBUs and vendors.',
    children: [
      { label: 'Branch', icon: 'git-fork', path: '/company/branch', source: 'company-branch.html', status: 'done' },
      {
        label: 'Group Structure',
        icon: 'network',
        path: '/company/group-structure',
        source: 'company-group-structure.html',
        status: 'done',
      },
      { label: 'Grade & Class', icon: 'layers', path: '/company/grade-class', source: 'company-grade-class.html', status: 'done' },
      { label: 'Cost Center', icon: 'wallet-cards', path: '/company/cost-center', source: 'company-cost-center.html', status: 'done' },
      { label: 'SBU', icon: 'building-2', path: '/company/sbu', source: 'company-sbu.html', status: 'done' },
      { label: 'Vendor', icon: 'truck', path: '/company/vendor', source: 'company-vendor.html', status: 'done' },
      {
        label: 'Organization Configuration',
        icon: 'sliders-horizontal',
        path: '/settings/configuration/organization',
        source: 'settings-configuration.html',
        status: 'done',
      },
    ],
  },
  {
    section: 'Employee',
    slug: 'employee',
    blurb: 'Employment types, email domains, reprimand types and transition (materialization) setups.',
    children: [
      { label: 'Work Status', icon: 'id-card', path: '/employees/work-status', source: 'FSD-001-EMPLOYEE §11', status: 'done' },
      { label: 'Email Domain', icon: 'at-sign', path: '/employees/email-domain', source: 'FSD-001-EMPLOYEE §12', status: 'done' },
      {
        label: 'Reprimand Type',
        icon: 'alert-triangle',
        path: '/employees/reprimand/type-setting',
        source: 'reprimand-type-setting.html',
        status: 'done',
      },
      // FSD-001-EMPLOYEE 0.83 §17 + §21. Detail setup dibuka dari daftar, tanpa baris menu sendiri.
      { label: 'Materialization', icon: 'layers', path: '/employees/materialization', source: 'FSD-001-EMPLOYEE §17', status: 'done' },
      {
        label: 'Materialization Role Mapping',
        icon: 'users',
        path: '/employees/materialization/role-mapping',
        source: 'FSD-001-EMPLOYEE §21',
        status: 'done',
      },
      {
        label: 'Employee Configuration',
        icon: 'sliders-horizontal',
        path: '/settings/configuration/employee',
        source: 'settings-configuration.html',
        status: 'done',
      },
    ],
  },
  {
    // MOM 28 Okt 2026 «Pemisahan Menu System Admin dan HR»: verifikasi email & aktivasi akun = tugas
    // System Admin / IT, bukan HR. Aturan approval & watermark = Global Setting (MOM butir Requisition #3, PDP #2).
    section: 'Users & Access',
    slug: 'users-access',
    blurb: 'Account activation, email and phone verification, role rules and global approval settings — for System Admin / IT.',
    children: [
      {
        label: 'Email and Phone Verification',
        icon: 'badge-check',
        path: '/employees/email-phone-verification',
        source: 'FSD-001-EMPLOYEE §14',
        status: 'done',
      },
      {
        label: 'Bulk Account Activation',
        icon: 'user-check',
        path: '/employees/bulk-account-activation',
        source: 'FSD-001-EMPLOYEE §9',
        status: 'done',
      },
      { label: 'Role Grant Rules', icon: 'shield-check', path: '/employees/role-grant-rules', source: 'FSD-001-EMPLOYEE §13', status: 'done' },
      { label: 'Approval Rules', icon: 'list-checks', note: 'MOM 28 Okt 2026: aturan approval requisition configurable di Global Setting.' },
      { label: 'Watermark', icon: 'file-check', note: 'MOM 28 Okt 2026: watermark toggle on/off di Global Setting.' },
    ],
  },
  {
    section: 'Time Management',
    slug: 'time-management',
    blurb: 'Time off types and policies, attendance rules, work calendar and holidays.',
    children: [
      { label: 'Time Off', icon: 'palmtree', path: '/time/time-off/settings', source: 'time-off-settings.html', status: 'done' },
      { label: 'Attendance', icon: 'fingerprint', path: '/time/attendance/settings', source: 'time-attendance-settings.html', status: 'done' },
      { label: 'Calendar & Holidays', icon: 'calendar', path: '/time/calendar', source: 'time-calendar.html', status: 'done' },
      {
        label: 'Time Configuration',
        icon: 'sliders-horizontal',
        path: '/settings/configuration/time',
        source: 'settings-configuration.html',
        status: 'done',
      },
    ],
  },
  {
    section: 'Payroll',
    slug: 'payroll',
    blurb: 'Salary components, salary rules and payroll configuration.',
    children: [
      {
        label: 'Salary Settings',
        icon: 'wallet',
        path: '/payroll/salary-settings',
        source: 'payroll-doc-settings.html',
        status: 'done',
      },
      {
        label: 'Payroll Configuration',
        icon: 'sliders-horizontal',
        path: '/settings/configuration/payroll',
        source: 'settings-configuration.html',
        status: 'done',
      },
    ],
  },
  {
    section: 'Finance',
    slug: 'finance',
    blurb: 'Benefit, loan and cash advance policies, security rules and finance configuration.',
    children: [
      { label: 'Finance Settings', icon: 'hand-coins', path: '/finance/settings', source: 'finance-settings.html', status: 'done' },
      { label: 'Finance Security', icon: 'shield-alert', path: '/finance/security', source: 'finance-security.html', status: 'done' },
      {
        label: 'Finance Configuration',
        icon: 'sliders-horizontal',
        path: '/settings/configuration/finance',
        source: 'settings-configuration.html',
        status: 'done',
      },
    ],
  },
  {
    section: 'Documents & Assets',
    slug: 'documents-assets',
    blurb: 'Document templates, document categories and asset categories.',
    children: [
      { label: 'Document Templates', icon: 'file-text', path: '/company-management/files/templates', source: 'document-templates.html', status: 'done' },
      { label: 'Document Category', icon: 'folder', path: '/documents/categories', source: 'document-categories.html', status: 'done' },
      { label: 'Asset Category', icon: 'box', path: '/company-management/assets/category', source: 'company-assets.html', status: 'done' },
      {
        label: 'Document Configuration',
        icon: 'sliders-horizontal',
        path: '/settings/configuration/document',
        source: 'settings-configuration.html',
        status: 'done',
      },
    ],
  },
  {
    section: 'Other Modules',
    slug: 'other-modules',
    blurb: 'Configuration for Performance and Productivity.',
    children: [
      {
        label: 'Performance Configuration',
        icon: 'award',
        path: '/settings/configuration/performance',
        source: 'settings-configuration.html',
        status: 'done',
      },
      {
        label: 'Productivity Configuration',
        icon: 'square-kanban',
        path: '/settings/configuration/productivity',
        source: 'settings-configuration.html',
        status: 'done',
      },
    ],
  },
  {
    section: 'System',
    slug: 'system',
    blurb: 'System logs, change history, data erasure, applications and integrations.',
    children: [
      {
        label: 'System Log',
        icon: 'scroll-text',
        note: 'FSD-AUTH 0.22 §7A/§7B — Super Admin saja; anak diurut A→Z (Error Code sebelum Trace ID).',
        children: [
          { label: 'Error Code', path: '/company-management/system-log/error-code', status: 'done' },
          { label: 'Trace ID', path: '/company-management/system-log/trace-id', status: 'done' },
        ],
      },
      { label: 'Change History', icon: 'history', path: '/settings/change-history', source: 'settings-configuration.html', status: 'done' },
      {
        label: 'Personal Data Erasure',
        icon: 'user-x',
        path: '/settings/erasure-requests',
        source: 'settings-erasure-requests.html',
        status: 'done',
      },
      { label: 'Applications', icon: 'layout-grid' },
      { label: 'Integrations', icon: 'shuffle' },
    ],
  },
];

/** Baris paling atas sidebar Settings — kembali ke beranda Settings (Dashboard tile = kembali ke HRIS). */
const SETTINGS_HOME: NavSection = {
  section: 'Settings home',
  flat: true,
  children: [{ label: 'All settings', icon: 'layout-grid', path: '/settings', status: 'done' }],
};

/** Baris pintu di sidebar kerja → ringkasan Settings modul itu (`/settings/<slug>`). */
function settingsDoor(label: string, slug: string): NavLeaf {
  return { label, icon: 'settings', path: `/settings/${slug}`, status: 'done', settingsLink: true };
}

/**
 * Nav produk Recruitment — rail datar, persis `_prototype/js/recruitment-shell.js`.
 * Layar detail (create / detail / import log) TIDAK punya baris menu di prototype.
 */
export const NAV_RECRUITMENT: NavSection[] = [
  {
    section: 'Recruitment',
    children: [
      { label: 'Home', icon: 'home', path: '/recruitment', source: 'recruitment-home.html', status: 'done' },
      {
        label: 'Job Listings',
        icon: 'briefcase',
        path: '/recruitment/job-listings',
        source: 'recruitment-job-listings.html',
        status: 'done',
      },
      { label: 'Talent Pool', icon: 'user-round' },
      { label: 'Candidates', icon: 'users' },
      { label: 'Assessments', icon: 'clipboard-list' },
      { label: 'Calendar', icon: 'calendar' },
      { label: 'Activity Log', icon: 'book-open' },
      { label: 'Reports', icon: 'bar-chart-3' },
      { label: 'Settings', icon: 'settings' },
    ],
  },
];

/** Nav produk Performance Management — persis `_prototype/js/performance-shell.js`. */
export const NAV_PERFORMANCE: NavSection[] = [
  {
    section: 'Performance Management',
    flat: true,
    children: [
      {
        label: 'Cycles & Settings',
        icon: 'calendar-range',
        path: '/performance/cycles',
        source: 'performance-cycles.html',
        status: 'done',
      },
      {
        label: 'KPI Master & Weight',
        icon: 'list-checks',
        path: '/performance/kpi-items',
        source: 'performance-kpi-items.html',
        status: 'done',
      },
      {
        label: 'Review Sheets',
        icon: 'clipboard-list',
        path: '/performance/sheets',
        source: 'performance-sheets.html',
        status: 'done',
      },
      {
        label: 'Score Approvals',
        icon: 'check-check',
        path: '/performance/approvals',
        source: 'performance-approvals.html',
        status: 'done',
      },
      {
        label: 'Objections',
        icon: 'message-square-warning',
        path: '/performance/objections',
        source: 'performance-objections.html',
        status: 'done',
      },
      {
        label: 'Monitor & Reports',
        icon: 'bar-chart-3',
        path: '/performance/reports',
        source: 'performance-reports.html',
        status: 'done',
      },
      { label: 'Settings', icon: 'settings' },
    ],
  },
];

export const ALL_NAV: NavSection[] = [...NAV, ...NAV_SETTINGS, ...NAV_RECRUITMENT, ...NAV_PERFORMANCE];

export type ProductId = 'HRIS' | 'Settings' | 'Recruitment' | 'Performance';

/** Produk aktif ditentukan URL — tiap produk punya shell sidebar sendiri di prototype. */
export function productForPath(path: string): ProductId {
  if (path.startsWith('/performance')) return 'Performance';
  if (path.startsWith('/recruitment')) return 'Recruitment';
  if (isSettingsPath(path)) return 'Settings';
  return 'HRIS';
}

export function navForPath(path: string): NavSection[] {
  const product = productForPath(path);
  if (product === 'Performance') return NAV_PERFORMANCE;
  if (product === 'Recruitment') return NAV_RECRUITMENT;
  if (product === 'Settings') return [SETTINGS_HOME, ...NAV_SETTINGS];
  return NAV;
}

/** Halaman milik area Settings: `/settings/**` atau halaman setting modul (URL lama dipertahankan). */
export function isSettingsPath(path: string): boolean {
  if (path === '/settings' || path.startsWith('/settings/')) return true;
  return flattenNav(NAV_SETTINGS).some((entry) => path === entry.path || path.startsWith(`${entry.path}/`));
}

export interface NavPathEntry {
  path: string;
  label: string;
  section: string;
  /** Rantai label dari section sampai leaf — dipakai breadcrumb. */
  trail: string[];
  source?: string;
  status: NavStatus;
}

/** Ratakan pohon nav jadi daftar route — dipakai router, breadcrumb, dan tracker. */
export function flattenNav(sections: NavSection[] = ALL_NAV): NavPathEntry[] {
  const out: NavPathEntry[] = [];
  const walk = (nodes: NavLeaf[], section: string, trail: string[]) => {
    for (const node of nodes) {
      const nextTrail = [...trail, node.label];
      if (node.path) {
        out.push({
          path: node.path,
          label: node.label,
          section,
          trail: nextTrail,
          source: node.source,
          status: node.status ?? 'todo',
        });
      }
      if (node.children) walk(node.children, section, nextTrail);
    }
  };
  for (const s of sections) walk(s.children, s.section, [s.section]);
  return out;
}

export const NAV_PATHS = flattenNav();

export function findNavByPath(path: string): NavPathEntry | undefined {
  return NAV_PATHS.find((entry) => entry.path === path);
}
