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
}

export interface NavSection {
  section: string;
  note?: string;
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
          { label: 'Attendance' },
          {
            label: 'Time Off',
            children: [{ label: 'Time Off' }, { label: 'Delegation' }, { label: 'Time Off Taken' }],
          },
          { label: 'Overtime' },
        ],
      },
      {
        label: 'Payroll',
        icon: 'wallet',
        children: [
          { label: 'Payroll Info', path: '/me/payroll', source: 'payroll-doc-ess.html', status: 'todo' },
          { label: 'Payslip', path: '/me/payslip', source: 'payroll-doc-payslip.html', status: 'todo' },
        ],
      },
      { label: 'Finance', icon: 'hand-coins', path: '/me/finance', source: 'finance-ess.html', status: 'todo' },
      { label: 'Files', icon: 'folder', path: '/me/files', source: 'document-ess-files.html', status: 'todo' },
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
          // Detail transisi (`/employees/transfer/dashboard`) sengaja TIDAK ada di
          // menu: layar itu selalu dibuka lewat "View Detail" dari daftar transfer.
          { label: 'Employee Transfer', path: '/employees/transfer', source: 'transition.html', status: 'done' },
          { label: 'Mass Resignation', path: '/employees/mass-resignation', source: 'mass-resignation.html', status: 'done' },
          { label: 'Import/Export Prorate' },
          { label: 'PTKP Status Adjustment', path: '/employees/ptkp-adjustment', source: 'ptkp-adjustment.html', status: 'done' },
        ],
      },
      {
        label: 'Manpower Planning',
        icon: 'clipboard-list',
        children: [
          { label: 'Overview' },
          { label: 'Planning History' },
          { label: 'Requisition', path: '/employees/manpower/requisition', source: 'manpower-requisition.html', status: 'done' },
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
      {
        label: 'Onboarding',
        icon: 'user-check',
        children: [{ label: 'Onboarding Dashboard' }, { label: 'Offboarding Dashboard' }],
      },
      {
        label: 'Reprimand',
        icon: 'alert-triangle',
        children: [
          { label: 'Reprimand List', path: '/employees/reprimand', source: 'reprimand.html', status: 'done' },
          {
            label: 'Type Setting',
            path: '/employees/reprimand/type-setting',
            source: 'reprimand-type-setting.html',
            status: 'done',
          },
        ],
      },
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
          { label: 'Settings', path: '/time/time-off/settings', source: 'time-off-settings.html', status: 'done' },
        ],
      },
      {
        label: 'Attendance',
        icon: 'fingerprint',
        children: [
          { label: 'Attendance', path: '/time/attendance', source: 'time-attendance.html', status: 'done' },
          { label: 'Settings', path: '/time/attendance/settings', source: 'time-attendance-settings.html', status: 'done' },
        ],
      },
      { label: 'Overtime', icon: 'timer', path: '/time/overtime', source: 'time-overtime.html', status: 'done' },
      { label: 'Calendar', icon: 'calendar', path: '/time/calendar', source: 'time-calendar.html', status: 'done' },
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
        status: 'todo',
      },
      { label: 'Loan', icon: 'landmark', path: '/finance/loan', source: 'finance-loan.html', status: 'todo' },
      { label: 'Cash Advance', icon: 'banknote', path: '/finance/cash-advance', source: 'finance-cash-advance.html', status: 'todo' },
      {
        label: 'Disbursement & Receivables',
        icon: 'coins',
        path: '/finance/disbursement',
        source: 'finance-disbursement.html',
        status: 'todo',
      },
      {
        label: 'Finance Settings',
        icon: 'sliders-horizontal',
        path: '/finance/settings',
        source: 'finance-settings.html',
        status: 'todo',
      },
      { label: 'Finance Security', icon: 'shield-alert', path: '/finance/security', source: 'finance-security.html', status: 'todo' },
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
        status: 'todo',
      },
      {
        label: 'Authorization & Handover',
        icon: 'shield-check',
        path: '/payroll/authorization',
        source: 'payroll-doc-authorization.html',
        status: 'todo',
      },
      {
        label: 'Salary Settings',
        icon: 'sliders-horizontal',
        path: '/payroll/salary-settings',
        source: 'payroll-doc-settings.html',
        status: 'todo',
      },
      { label: 'Payroll Allocation', icon: 'split' },
      { label: 'Reports', icon: 'bar-chart-3' },
    ],
  },

  {
    section: 'Productivity',
    children: [
      {
        label: 'Project & Task',
        icon: 'square-kanban',
        children: [
          { label: 'Project', path: '/productivity/projects', source: 'productivity-projects.html', status: 'todo' },
          { label: 'Tasks', path: '/productivity/tasks', source: 'productivity-tasks.html', status: 'todo' },
          {
            label: 'Timesheet',
            children: [
              { label: 'Time Tracker', path: '/productivity/timesheet/tracker', source: 'productivity-time-tracker.html', status: 'todo' },
              { label: 'Activities', path: '/productivity/timesheet/activities', source: 'productivity-activities.html', status: 'todo' },
              { label: 'Summary', path: '/productivity/timesheet/summary', source: 'productivity-summary.html', status: 'todo' },
              {
                label: 'Tracker Report',
                path: '/productivity/timesheet/report',
                source: 'productivity-tracker-report.html',
                status: 'todo',
              },
            ],
          },
          {
            label: 'Group for Payroll',
            children: [
              { label: 'Task List', path: '/productivity/payroll-group/tasks', source: 'productivity-task-list.html', status: 'todo' },
              { label: 'Group List', path: '/productivity/payroll-group/groups', source: 'productivity-group-list.html', status: 'todo' },
            ],
          },
        ],
      },
      {
        label: 'Forms & Survey',
        icon: 'clipboard-check',
        children: [
          { label: 'Forms', path: '/productivity/forms', source: 'productivity-forms.html', status: 'todo' },
          {
            label: 'My Submissions',
            path: '/productivity/forms/my-submissions',
            source: 'productivity-my-submissions.html',
            status: 'todo',
          },
        ],
      },
      { label: 'Document Templates', icon: 'file-text' },
    ],
  },

  {
    section: 'Company',
    children: [
      { label: 'Branch', icon: 'git-fork', path: '/company/branch', source: 'company-branch.html', status: 'todo' },
      {
        label: 'Group Structure',
        icon: 'network',
        path: '/company/group-structure',
        source: 'company-group-structure.html',
        status: 'todo',
      },
      { label: 'Grade & Class', icon: 'layers', path: '/company/grade-class', source: 'company-grade-class.html', status: 'todo' },
      { label: 'Cost Center', icon: 'wallet-cards', path: '/company/cost-center', source: 'company-cost-center.html', status: 'todo' },
      { label: 'SBU', icon: 'building-2', path: '/company/sbu', source: 'company-sbu.html', status: 'todo' },
      { label: 'Vendor', icon: 'truck', path: '/company/vendor', source: 'company-vendor.html', status: 'todo' },
    ],
  },

  {
    section: 'Company Management',
    children: [
      {
        label: 'Assets',
        icon: 'box',
        children: [
          { label: 'Asset List', path: '/company-management/assets', source: 'company-assets.html', status: 'todo' },
          { label: 'Assigned Assets', path: '/company-management/assets/assigned', source: 'company-assets.html', status: 'todo' },
          { label: 'Asset Category', path: '/company-management/assets/category', source: 'company-assets.html', status: 'todo' },
          { label: 'Disposal', path: '/company-management/assets/disposal', source: 'company-disposal.html', status: 'todo' },
        ],
      },
      { label: 'Announcement', icon: 'megaphone' },
      { label: 'Activity Log', icon: 'activity' },
      {
        label: 'Notification',
        icon: 'bell',
        path: '/company-management/notifications',
        source: 'notification-inbox.html',
        status: 'todo',
      },
      { label: 'Notification (rich inbox)', icon: 'inbox', path: '/company-management/inbox', source: 'inbox.html', status: 'todo' },
      {
        label: 'Files',
        icon: 'folder',
        note: 'FSD-001-DOCUMENT §1: Files berisi tepat empat baris (3 layar file + Document Templates).',
        children: [
          { label: 'Company Files', path: '/company-management/files/company', source: 'document-company-files.html', status: 'todo' },
          { label: 'Employee Files', path: '/company-management/files/employee', source: 'document-employee-files.html', status: 'todo' },
          { label: 'Other Files', path: '/company-management/files/other', source: 'document-other-files.html', status: 'todo' },
          { label: 'Document Templates', path: '/company-management/files/templates', source: 'document-templates.html', status: 'todo' },
        ],
      },
    ],
  },

  {
    section: 'Document — no menu row yet',
    note: 'Layar lengkap secara kontrak tapi belum punya baris menu (PROB-SERVICE-356 / -407). Verifikasi publik memang tanpa menu (DOC-80).',
    children: [
      { label: 'Letter Issuance', icon: 'mail-plus', path: '/documents/letter-issuance', source: 'document-letter-issuance.html', status: 'todo' },
      {
        label: 'Category Settings',
        icon: 'sliders-horizontal',
        path: '/documents/categories',
        source: 'document-categories.html',
        status: 'todo',
      },
      {
        label: 'Document Access Trail',
        icon: 'scroll-text',
        path: '/documents/access-trail',
        source: 'document-access-log.html',
        status: 'todo',
      },
      { label: 'Public Letter Verification', icon: 'badge-check', path: '/verify', source: 'document-verify.html', status: 'todo' },
    ],
  },

  {
    section: 'System',
    children: [
      { label: 'Applications', icon: 'layout-grid' },
      { label: 'Integrations', icon: 'shuffle' },
      {
        label: 'Settings',
        icon: 'settings',
        note: 'FSD-001-SETTINGS: delapan setting berbagi satu pintu baca & satu pintu tulis (A1/A2) — jadi tab dari satu halaman, bukan delapan halaman.',
        children: [
          { label: 'Time', path: '/settings/configuration/time', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Finance', path: '/settings/configuration/finance', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Payroll', path: '/settings/configuration/payroll', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Performance', path: '/settings/configuration/performance', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Productivity', path: '/settings/configuration/productivity', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Document', path: '/settings/configuration/document', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Organization', path: '/settings/configuration/organization', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Employee', path: '/settings/configuration/employee', source: 'settings-configuration.html', status: 'todo' },
          { label: 'Change History', path: '/settings/change-history', source: 'settings-change-history.html', status: 'todo' },
        ],
      },
    ],
  },

  {
    section: 'Authentication',
    children: [{ label: 'Login & Authentication', icon: 'log-in', children: [{ label: 'Login' }] }],
  },

  {
    section: 'Settings — no menu row yet',
    note: 'Menu home belum diputuskan (PROB-FRONTEND-033) — dirutekan agar layar tetap bisa dibuka.',
    children: [
      {
        label: 'Personal Data Erasure',
        icon: 'user-x',
        path: '/settings/erasure-requests',
        source: 'settings-erasure-requests.html',
        status: 'todo',
      },
    ],
  },
];

/**
 * Nav produk Recruitment — rail datar, persis `_prototype/js/recruitment-shell.js`.
 * Layar detail (create / detail / import log) TIDAK punya baris menu di prototype.
 */
export const NAV_RECRUITMENT: NavSection[] = [
  {
    section: 'Recruitment',
    children: [
      { label: 'Home', icon: 'home', path: '/recruitment', source: 'recruitment-home.html', status: 'todo' },
      {
        label: 'Job Listings',
        icon: 'briefcase',
        path: '/recruitment/job-listings',
        source: 'recruitment-job-listings.html',
        status: 'todo',
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
    children: [
      {
        label: 'Cycles & Settings',
        icon: 'calendar-range',
        path: '/performance/cycles',
        source: 'performance-cycles.html',
        status: 'todo',
      },
      {
        label: 'KPI Master & Weight',
        icon: 'list-checks',
        path: '/performance/kpi-items',
        source: 'performance-kpi-items.html',
        status: 'todo',
      },
      {
        label: 'Review Sheets',
        icon: 'clipboard-list',
        path: '/performance/sheets',
        source: 'performance-sheets.html',
        status: 'todo',
      },
      {
        label: 'Score Approvals',
        icon: 'check-check',
        path: '/performance/approvals',
        source: 'performance-approvals.html',
        status: 'todo',
      },
      {
        label: 'Objections',
        icon: 'message-square-warning',
        path: '/performance/objections',
        source: 'performance-objections.html',
        status: 'todo',
      },
      {
        label: 'Monitor & Reports',
        icon: 'bar-chart-3',
        path: '/performance/reports',
        source: 'performance-reports.html',
        status: 'todo',
      },
      { label: 'Settings', icon: 'settings' },
    ],
  },
];

export const ALL_NAV: NavSection[] = [...NAV, ...NAV_RECRUITMENT, ...NAV_PERFORMANCE];

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
