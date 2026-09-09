// ============================================================
// SEVAKA HRIS — App Shell (single source of truth)
// Renders the shared TOPNAV + SIDEBAR into mount points so every
// page stays standardized automatically. Data-driven: edit the
// NAV / NOTIFS / PRODUCTS arrays below and all pages update.
//
// Usage (in each page, end of <body>, BEFORE dashboard.js):
//   <header class="topnav" id="sevakaTopnav"></header>
//   ...
//   <aside class="sidebar" id="sidebar"></aside>
//   <script>window.SEVAKA_PAGE = { dashboardActive:true, bellActive:false, notifDot:true };</script>
//   <script src="js/shell.js"></script>
//   <script src="js/dashboard.js"></script>
// ============================================================
(function () {
  'use strict';

  var cfg = window.SEVAKA_PAGE || {};

  // ----------------------------------------------------------
  // DATA — single source of truth
  // ----------------------------------------------------------
  // Multi-tenant: one account can hold several companies. The switcher in the
  // sidebar header lets an admin move between the companies they belong to.
  var COMPANIES = [
    { id: 'DIKA',   short: 'DK', name: 'PT DIKA',              sub: '1.284 karyawan', color: '#0284c7' },
    { id: 'BAHARI', short: 'BH', name: 'PT Bahari Logistik',   sub: '642 karyawan',   color: '#0e9488' },
    { id: 'SINAR',  short: 'SA', name: 'PT Sinar Agro Lestari', sub: '389 karyawan',  color: '#d97706' }
  ];
  var storedCompany = null;
  try { storedCompany = localStorage.getItem('sevakaCompany'); } catch (e) {}
  var activeCompany = COMPANIES.filter(function (c) { return c.id === storedCompany; })[0] || COMPANIES[0];

  var PRODUCTS = [
    { id: 'HRIS',        icon: 'users',      name: 'HRIS',                   desc: 'Human Resource Information System', route: 'index.html' },
    { id: 'Recruitment', icon: 'briefcase',  name: 'Recruitment',            desc: 'Talent pipeline &amp; assessments', route: 'recruitment-home.html' },
    { id: 'Performance', icon: 'award',      name: 'Performance Management', desc: 'Reviews, goals &amp; calibration', route: 'performance-cycles.html' },
    { id: 'Insights',    icon: 'line-chart', name: 'Insights',               desc: 'AI workforce analytics' }
  ];

  // Multi-level nav tree (section → menu → sub-menu → sub-sub-menu).
  // A node with `children` renders as an expandable group; a node with a
  // `route` navigates. Active state is derived automatically from the current
  // page filename matching a node's `route` (ancestors auto-expand).
  var NAV = [
    { section:"Employee Profile", children:[
      { label:"General", icon:"user", children:[
        { label:"Personal", children:[
          { label:"Basic Info",        route:"employee-profile.html#basic-info" },
          { label:"Family",            route:"employee-profile.html#family" },
          { label:"Emergency Contact", route:"employee-profile.html#emergency-contact" }
        ] },
        { label:"Employment" },
        { label:"Education & Experience", children:[
          { label:"Formal Education",   route:"employee-profile.html#formal-education" },
          { label:"Informal Education", route:"employee-profile.html#informal-education" },
          { label:"Working Experience", route:"employee-profile.html#working-experience" }
        ] },
        { label:"Additional Info", route:"employee-profile.html#additional-info" }
      ] },
      { label:"Time Management", icon:"clock", children:[
        { label:"Attendance" },
        { label:"Time Off", children:[
          { label:"Time Off" },
          { label:"Delegation" },
          { label:"Time Off Taken" }
        ] },
        { label:"Overtime" }
      ] },
      { label:"Payroll", icon:"wallet", children:[
        { label:"Payroll Info", route:"payroll-doc-ess.html" },
        { label:"Payslip", route:"payroll-doc-payslip.html" }
      ] },
      { label:"Finance", icon:"hand-coins", route:"finance-ess.html" },
      { label:"Files", icon:"folder", route:"document-ess-files.html" },
      { label:"Assets", icon:"box" },
      { label:"History", icon:"history", children:[
        { label:"Adjustment" },
        { label:"Transfer" },
        { label:"NPP" },
        { label:"Reprimand" }
      ] }
    ] },
    { section:"Employee Management", children:[
      { label:"Employee Directory", icon:"users", children:[
        { label:"Employee List", icon:"list", children:[
          { label:"Directory", route:"employee-directory.html" },
          { label:"Organization" }
        ] },
        { label:"Employee Transfer", route:"transition.html" },
        { label:"Mass Resignation", route:"mass-resignation.html" },
        { label:"Import/Export Prorate" },
        { label:"PTKP Status Adjustment", route:"ptkp-adjustment.html" }
      ] },
      { label:"Manpower Planning", icon:"clipboard-list", children:[
        { label:"Overview" },
        { label:"Planning History" },
        { label:"Requisition", route:"manpower-requisition.html" }
      ] },
      { label:"New Joiner Submission", icon:"user-plus", route:"new-joiner.html" },
      { label:"Onboarding", icon:"user-check", children:[
        { label:"Onboarding Dashboard" },
        { label:"Offboarding Dashboard" }
      ] },
      { label:"Reprimand", icon:"alert-triangle", children:[
        { label:"Reprimand List", route:"reprimand.html" },
        { label:"Type Setting", route:"reprimand-type-setting.html" }
      ] }
    ] },
    { section:"Time Management", children:[
      { label:"Time Off", icon:"palmtree", children:[
        { label:"Time Off Request", route:"time-off-request.html" },
        { label:"Time Off Balance", route:"time-off-balance.html" },
        { label:"Settings", route:"time-off-settings.html" }
      ] },
      { label:"Attendance", icon:"fingerprint", children:[
        { label:"Attendance", route:"time-attendance.html" },
        { label:"Settings", route:"time-attendance-settings.html" }
      ] },
      { label:"Overtime", icon:"timer", route:"time-overtime.html" },
      { label:"Calendar", icon:"calendar", route:"time-calendar.html" },
      { label:"Scheduler", icon:"calendar-clock", children:[
        { label:"Index", route:"time-scheduler-index.html" },
        { label:"Schedule", route:"time-scheduler-schedule.html" }
      ] },
      { label:"On Call", icon:"phone-call", children:[
        { label:"On Call Schedule", route:"time-oncall.html" },
        { label:"On Call Activity", route:"time-oncall-activity.html" }
      ] }
    ] },
    { section:"Finance", children:[
      { label:"Benefit Reimbursement", icon:"receipt", route:"finance-benefit-reimbursement.html" },
      { label:"Loan", icon:"landmark", route:"finance-loan.html" },
      { label:"Cash Advance", icon:"banknote", route:"finance-cash-advance.html" },
      { label:"Disbursement & Receivables", icon:"coins", route:"finance-disbursement.html" },
      { label:"Finance Settings", icon:"sliders-horizontal", route:"finance-settings.html" },
      { label:"Finance Security", icon:"shield-alert", route:"finance-security.html" }
    ] },
    { section:"Payroll", children:[
      { label:"Salary Processing", icon:"wallet", route:"payroll-doc-processing.html" },
      { label:"Authorization & Handover", icon:"shield-check", route:"payroll-doc-authorization.html" },
      { label:"Salary Settings", icon:"sliders-horizontal", route:"payroll-doc-settings.html" },
      { label:"Payroll Allocation", icon:"split" },
      { label:"Reports", icon:"bar-chart-3" }
    ] },
    { section:"Productivity", children:[
      { label:"Project & Task", icon:"square-kanban", children:[
        { label:"Project", route:"productivity-projects.html" },
        { label:"Tasks", route:"productivity-tasks.html" },
        { label:"Timesheet", children:[
          { label:"Time Tracker", route:"productivity-time-tracker.html" },
          { label:"Activities", route:"productivity-activities.html" },
          { label:"Summary", route:"productivity-summary.html" },
          { label:"Tracker Report", route:"productivity-tracker-report.html" }
        ] },
        { label:"Group for Payroll", children:[
          { label:"Task List", route:"productivity-task-list.html" },
          { label:"Group List", route:"productivity-group-list.html" }
        ] }
      ] },
      { label:"Forms & Survey", icon:"clipboard-check", children:[
        { label:"Forms", route:"productivity-forms.html" },
        { label:"My Submissions", route:"productivity-my-submissions.html" }
      ] },
      { label:"Document Templates", icon:"file-text" }
    ] },
    { section:"Company", children:[
      { label:"Branch", icon:"git-fork", route:"company-branch.html" },
      { label:"Group Structure", icon:"network", route:"company-group-structure.html" },
      { label:"Grade & Class", icon:"layers", route:"company-grade-class.html" },
      { label:"Cost Center", icon:"wallet-cards", route:"company-cost-center.html" },
      { label:"SBU", icon:"building-2", route:"company-sbu.html" },
      { label:"Vendor", icon:"truck", route:"company-vendor.html" }
    ] },
    { section:"Company Management", children:[
      { label:"Assets", icon:"box", children:[
        { label:"Asset List", route:"company-assets.html" },
        { label:"Assigned Assets", route:"company-assets.html#assigned" },
        { label:"Asset Category", route:"company-assets.html#category" },
        { label:"Disposal", route:"company-disposal.html" }
      ] },
      { label:"Announcement", icon:"megaphone" },
      { label:"Activity Log", icon:"activity" },
      { label:"Notification", icon:"bell", route:"notification-inbox.html" },
      { label:"Notification (rich inbox)", icon:"inbox", route:"inbox.html" },
      // FSD-001-DOCUMENT §1: "Company Management › Files › Company Files — Sub Menu
      // ke-1 dari 4", i.e. Files holds exactly four rows (3 file screens + Document
      // Templates). Letter Issuance / Category Settings / Access Trail have NO menu row
      // in the contract (PROB-SERVICE-356 / -407) — they live in the holding section below.
      { label:"Files", icon:"folder", children:[
        { label:"Company Files", route:"document-company-files.html" },
        { label:"Employee Files", route:"document-employee-files.html" },
        { label:"Other Files", route:"document-other-files.html" },
        { label:"Document Templates", route:"document-templates.html" }
      ] }
    ] },
    // Prototype-only holding area — NOT a menu proposal. These screens are complete as
    // contracts but have no registered menu row (PROB-SERVICE-356 / PROB-SERVICE-407);
    // the public verification page is permanently menu-less by design (DOC-80).
    { section:"Document — no menu row yet", children:[
      { label:"Letter Issuance", icon:"mail-plus", route:"document-letter-issuance.html" },
      { label:"Category Settings", icon:"sliders-horizontal", route:"document-categories.html" },
      { label:"Document Access Trail", icon:"scroll-text", route:"document-access-log.html" },
      { label:"Public Letter Verification", icon:"badge-check", route:"document-verify.html" }
    ] },
    { section:"System", children:[
      { label:"Applications", icon:"layout-grid" },
      { label:"Integrations", icon:"shuffle" },
      // FSD-001-SETTINGS §Peta Menu: one group menu "Settings" holding 8 setting menus
      // + Change History. All eight share ONE read door and ONE write door (A1/A2), so
      // they are tabs of a single page keyed by hash, not eight separate files.
      { label:"Settings", icon:"settings", children:[
        { label:"Time", route:"settings-configuration.html#time" },
        { label:"Finance", route:"settings-configuration.html#finance" },
        { label:"Payroll", route:"settings-configuration.html#payroll" },
        { label:"Performance", route:"settings-configuration.html#performance" },
        { label:"Productivity", route:"settings-configuration.html#productivity" },
        { label:"Document", route:"settings-configuration.html#document" },
        { label:"Organization", route:"settings-configuration.html#organization" },
        { label:"Employee", route:"settings-configuration.html#employee" },
        { label:"Change History", route:"settings-change-history.html" }
      ] }
    ] },
    // Menu home not decided yet (PROB-FRONTEND-033) — routed so the prototype opens.
    { section:"Settings — no menu row yet", children:[
      { label:"Personal Data Erasure", icon:"user-x", route:"settings-erasure-requests.html" }
    ] },
    { section:"Authentication", children:[
      { label:"Login & Authentication", icon:"log-in", children:[
        { label:"Login" }
      ] }
    ] }
  ];

  // Current page filename + hash, used to auto-highlight the matching leaf.
  // Routes may carry a hash (e.g. employee-profile.html#family) so several
  // sidebar leaves can point at one page's in-page sections.
  var CURFILE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var CURHASH = (location.hash || '').toLowerCase();

  // ----------------------------------------------------------
  // NOTIFICATION STORE — single source of truth for the bell popover AND the
  // Notification Inbox page (notification-inbox.html). Contract: notification_inbox
  // (FSD-001-NOTIFICATION-0.1 §1 / UIC-001-NOTIFICATION-0.1 §2). Read + mark-read only:
  // no create, no delete, no bulk mark-all (nol endpoint). Rows follow the Dataset
  // Skenario Positif (Budi Santoso, company_code COMPANY001).
  // ----------------------------------------------------------
  var NOTIF_ROWS = [
    { id: '0198e2a0-0004-7c40-9b00-000000000004', notification_type: 'PROD_RECAP_PENDING_APPROVAL',
      title: 'Your productivity recap is awaiting approval',
      body: 'The productivity recap for the July 2026 period is awaiting your approval.',
      reference_type: 'PRODUCTIVITY_RECAP', reference_id: '0198e2a0-0005-7c40-9b00-000000000005',
      is_read: false, read_at: null, read_at_timezone: null, created_at: '2026-08-08T08:00:00+07:00' },
    { id: '0198e2a0-0003-7c40-9b00-000000000003', notification_type: 'LOGIN_OTP',
      title: 'Sign-in link sent',
      body: 'A single-use sign-in link was sent to your email address on 08 August 2026 at 07:40 WIB.',
      reference_type: null, reference_id: null,
      is_read: false, read_at: null, read_at_timezone: null, created_at: '2026-08-08T07:40:00+07:00' },
    { id: '0198e2a0-0001-7c40-9b00-000000000001', notification_type: 'FINANCE_REQUEST_REJECTED',
      title: 'Your reimbursement request was rejected',
      body: 'Your reimbursement request dated 05 August 2026 was rejected by your approver. The resubmission window still applies.',
      reference_type: 'FINANCE_REQUEST', reference_id: '0198e2a0-0002-7c40-9b00-000000000002',
      is_read: true, read_at: '2026-08-07T09:15:00+07:00', read_at_timezone: 'Asia/Jakarta', created_at: '2026-08-06T14:02:00+07:00' }
  ];
  var NOTIF_KEY = 'sevaka.notification.read.v1';
  var notifSubs = [];
  function notifLoad() {
    try {
      var raw = JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}');
      NOTIF_ROWS.forEach(function (r) {
        var s = raw[r.id];
        if (s && s.is_read) { r.is_read = true; r.read_at = s.read_at; r.read_at_timezone = s.read_at_timezone || 'Asia/Jakarta'; }
      });
    } catch (e) {}
  }
  function notifSave() {
    var out = {};
    NOTIF_ROWS.forEach(function (r) { if (r.is_read) out[r.id] = { is_read: true, read_at: r.read_at, read_at_timezone: r.read_at_timezone }; });
    try { localStorage.setItem(NOTIF_KEY, JSON.stringify(out)); } catch (e) {}
  }
  notifLoad();
  var NotifStore = {
    rows: function () { return NOTIF_ROWS; },
    get: function (id) { return NOTIF_ROWS.filter(function (r) { return r.id === id; })[0] || null; },
    unread: function () { return NOTIF_ROWS.filter(function (r) { return !r.is_read; }).length; },
    // PUT /api/v1/notifications/inbox/{id}/read — idempotent: a second call returns the
    // row as-is (200), never an error, and is_read never returns to false.
    markRead: function (id) {
      var r = this.get(id);
      if (!r) return { status: 404, error: 'NOT_FOUND', row: null, changed: false };
      if (r.is_read) return { status: 200, row: r, changed: false, idempotent: true };
      r.is_read = true;
      r.read_at = '2026-08-08T08:12:30+07:00';
      r.read_at_timezone = 'Asia/Jakarta';
      notifSave();
      notifSubs.forEach(function (fn) { try { fn(); } catch (e) {} });
      return { status: 200, row: r, changed: true };
    },
    subscribe: function (fn) { notifSubs.push(fn); },
    notify: function () { notifSubs.forEach(function (fn) { try { fn(); } catch (e) {} }); }
  };
  window.SevakaNotif = NotifStore;

  var NOTIF_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function notifStamp(iso) {
    if (!iso) return '\u2014';
    var d = new Date(iso);
    return d.getDate() + ' ' + NOTIF_MONTHS[d.getMonth()] + ' \u00b7 ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  // ----------------------------------------------------------
  // TEMPLATES
  // ----------------------------------------------------------
  function tProductOpt(p, isOn) {
    return (
      '<button class="product-opt' + (isOn ? ' is-on' : '') + '" data-product="' + p.id + '"' + (p.route ? ' data-route="' + p.route + '"' : '') + '>' +
        '<span class="product-opt__icon"><i data-lucide="' + p.icon + '"></i></span>' +
        '<span class="product-opt__text">' +
          '<span class="product-opt__name">' + p.name + '</span>' +
          '<span class="product-opt__desc">' + p.desc + '</span>' +
        '</span>' +
        (isOn ? '<svg class="product-opt__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>' : '') +
      '</button>'
    );
  }

  function tNotifItem(n) {
    return (
      '<li class="notif-item' + (n.is_read ? '' : ' is-unread') + '" data-notif="' + n.id + '">' +
        '<span class="notif-item__icon notif-icon--default"><i data-lucide="bell"></i></span>' +
        '<div class="notif-item__body">' +
          '<div class="notif-item__row">' +
            '<span class="notif-item__source">' + n.title + '</span>' +
            '<span class="notif-item__time">' + notifStamp(n.created_at) + '</span>' +
          '</div>' +
          '<p class="notif-item__msg">' + n.body + '</p>' +
          '<span class="notif-item__tag tag-default">' + n.notification_type + '</span>' +
        '</div>' +
        '<span class="notif-item__unread" aria-label="unread"></span>' +
      '</li>'
    );
  }

  // Repaint the popover list from the store (called after any mark-read).
  function renderNotifList() {
    var list = document.getElementById('notifPopList');
    if (!list) return;
    var tab = document.querySelector('.notif-pop__tab.is-on');
    var only = tab ? tab.getAttribute('data-notif-tab') : 'all';
    var rows = NOTIF_ROWS.slice().sort(function (a, b) { return a.created_at < b.created_at ? 1 : -1; })
      .filter(function (r) { return only === 'unread' ? !r.is_read : true; });
    list.innerHTML = rows.length ? rows.map(tNotifItem).join('')
      : '<li class="notif-item notif-item--empty"><div class="notif-item__body"><p class="notif-item__msg">Nothing unread.</p></div></li>';
    document.querySelectorAll('#notifBtn .dot').forEach(function (d) { d.style.display = NotifStore.unread() ? '' : 'none'; });
    if (window.lucide) window.lucide.createIcons();
  }
  window.renderNotifList = renderNotifList;

  function topnavHTML() {
    return (
      '<div class="brand">' +
        '<div class="brand__s">S</div>' +
        '<div class="brand__text">' +
          '<span class="brand__name">SEVAKA</span>' +
          '<span class="brand__sub">Human Resource Information System</span>' +
        '</div>' +
      '</div>' +

      '<div class="topnav__divider"></div>' +

      '<div class="product-picker" id="productPicker">' +
        '<button class="product-picker__btn" type="button" id="productPickerBtn" aria-haspopup="listbox">' +
          '<span class="product-picker__now" id="productNow">HRIS</span>' +
          '<svg class="product-picker__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="product-menu" role="listbox">' +
          '<div class="product-menu__head">SEVAKA products</div>' +
          PRODUCTS.map(function (p, i) { return tProductOpt(p, i === 0); }).join('') +
        '</div>' +
      '</div>' +

      '<div class="topnav__right">' +
        '<button class="pill-ai" type="button"><i data-lucide="sparkles"></i>SUMMARIZE DATA</button>' +
        '<button class="icon-btn" aria-label="add"><i data-lucide="plus"></i></button>' +
        '<button class="icon-btn" aria-label="search"><i data-lucide="search"></i></button>' +

        '<div class="notif-wrap pos-rel">' +
          '<button class="icon-btn' + (cfg.bellActive ? ' is-active-page' : '') + '" id="notifBtn" aria-label="notifications">' +
            '<i data-lucide="bell"></i>' +
            (cfg.notifDot !== false ? '<span class="dot"></span>' : '') +
          '</button>' +
          '<div class="notif-pop" id="notifPop" role="dialog" aria-label="Notifications">' +
            '<div class="notif-pop__arrow" aria-hidden="true"></div>' +
            '<header class="notif-pop__head">' +
              '<div class="notif-pop__heading">' +
                '<span class="notif-pop__title">Notifications</span>' +
              '</div>' +
            '</header>' +
            '<div class="notif-pop__tabs" role="tablist">' +
              '<button class="notif-pop__tab is-on" data-notif-tab="all">All</button>' +
              '<button class="notif-pop__tab" data-notif-tab="unread">Unread</button>' +
            '</div>' +
            '<ul class="notif-pop__list" id="notifPopList">' +

            '</ul>' +
            '<footer class="notif-pop__foot">' +
              '<a class="notif-pop__cta" href="notification-inbox.html">' +
                '<span>View all in Inbox</span><i data-lucide="arrow-right"></i>' +
              '</a>' +
            '</footer>' +
          '</div>' +
        '</div>' +

        '<button class="icon-btn" aria-label="apps"><i data-lucide="layout-grid"></i></button>' +

        '<div class="user-chip pos-rel">' +
          '<div class="user-chip__avatar" title="' + (cfg.user ? cfg.user.name : 'Tony Stark') + '">' +
            '<svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">' +
              '<defs><linearGradient id="avBg" x1="0" x2="0" y1="0" y2="1">' +
                '<stop offset="0%" stop-color="#a8d479"/><stop offset="100%" stop-color="#6ba23f"/>' +
              '</linearGradient></defs>' +
              '<rect width="42" height="42" fill="url(#avBg)"/>' +
              '<ellipse cx="21" cy="18" rx="9" ry="10" fill="#f0c39a"/>' +
              '<path d="M14 12 q7 -8 14 0 q1 4 -2 6 q-3 -4 -10 -4 q-3 0 -4 4 q-2 -2 2 -6z" fill="#3d2415"/>' +
              '<path d="M14 22 q1 6 7 7 q6 -1 7 -7 q-3 2 -7 2 q-4 0 -7 -2z" fill="#3d2415"/>' +
              '<path d="M6 42 q3 -10 15 -10 q12 0 15 10z" fill="#1f4a26"/>' +
            '</svg>' +
          '</div>' +
          '<div class="user-chip__text">' +
            '<span class="user-chip__name">' + (cfg.user ? cfg.user.name : 'Tony Stark') + '</span>' +
            '<span class="user-chip__role">' + (cfg.user ? cfg.user.role : 'Administrator') + '</span>' +
          '</div>' +
          '<button class="icon-btn" aria-label="user menu" data-menu-trigger="#userMenu" style="background:transparent;width:24px;height:24px"><i data-lucide="chevron-down"></i></button>' +
          '<div class="menu" id="userMenu">' +
            '<button class="menu__item"><i data-lucide="user"></i>My profile</button>' +
            '<button class="menu__item"><i data-lucide="settings"></i>Account settings</button>' +
            '<button class="menu__item"><i data-lucide="help-circle"></i>Help &amp; support</button>' +
            '<div class="menu__divider"></div>' +
            '<button class="menu__item" style="color:var(--color-error-600)"><i data-lucide="log-out"></i>Sign out</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  // Recursive nav node. depth 1 = top-level "menu" (icon-bearing, the only
  // level shown when the sidebar is collapsed); deeper levels are sub-menus.
  function esc(s) { return String(s).replace(/"/g, '&quot;'); }

  function tNavNode(node, depth, parentPath) {
    var path = parentPath ? parentPath + '/' + node.label : node.label;
    var hasKids = node.children && node.children.length;
    var iconHTML = node.icon ? '<i data-lucide="' + node.icon + '" class="sb-row__icon"></i>' : '';
    var labelHTML = '<span class="sb-row__label">' + node.label + '</span>';

    if (hasKids) {
      return (
        '<div class="sb-node sb-node--group" data-depth="' + depth + '" data-path="' + esc(path) + '">' +
          '<button class="sb-row sb-row--group" data-depth="' + depth + '" type="button">' +
            iconHTML + labelHTML +
            '<svg class="sb-row__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
          '</button>' +
          '<div class="sb-children">' +
            node.children.map(function (c) { return tNavNode(c, depth + 1, path); }).join('') +
          '</div>' +
        '</div>'
      );
    }

    var route = node.route;
    var isOn = false;
    if (route) {
      var rp = route.toLowerCase().split('#');
      var rfile = rp[0], rhash = rp[1] ? '#' + rp[1] : '';
      if (rfile === CURFILE) {
        // no hash on the route → plain filename match; hashed route → also
        // match the current hash (falling back to the first hashed leaf when
        // the page loaded without a hash).
        isOn = rhash ? (CURHASH === rhash || (!CURHASH && route.toLowerCase() === (window.__sevakaDefaultHashRoute || ''))) : true;
      }
    }
    return (
      '<button class="sb-row sb-row--leaf' + (isOn ? ' is-on' : '') + '" data-depth="' + depth + '"' +
        ' data-path="' + esc(path) + '"' + (route ? ' data-href="' + route + '"' : '') + ' type="button">' +
        iconHTML + labelHTML +
      '</button>'
    );
  }

  function tCompanyOpt(c, isOn) {
    return (
      '<button class="company-opt' + (isOn ? ' is-on' : '') + '" type="button"' +
        ' data-id="' + c.id + '" data-name="' + esc(c.name) + '" data-sub="' + esc(c.sub) + '"' +
        ' data-short="' + c.short + '" data-color="' + c.color + '">' +
        '<span class="company-opt__logo" style="background:' + c.color + '">' + c.short + '</span>' +
        '<span class="company-opt__text">' +
          '<span class="company-opt__name">' + c.name + '</span>' +
          '<span class="company-opt__sub">' + c.sub + '</span>' +
        '</span>' +
        (isOn ? '<svg class="company-opt__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>' : '') +
      '</button>'
    );
  }

  function companySwitcherHTML() {
    return (
      '<div class="company-switcher" id="companySwitcher">' +
        '<button class="company-switcher__btn" id="companySwitcherBtn" type="button" aria-haspopup="listbox" title="Ganti perusahaan">' +
          '<span class="company-switcher__logo" style="background:' + activeCompany.color + '">' + activeCompany.short + '</span>' +
          '<span class="company-switcher__text">' +
            '<span class="company-switcher__name" id="companyNow">' + activeCompany.name + '</span>' +
            '<span class="company-switcher__sub" id="companySub">' + activeCompany.sub + '</span>' +
          '</span>' +
          '<svg class="company-switcher__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="company-menu" role="listbox">' +
          '<div class="company-menu__head">Perusahaan Anda</div>' +
          COMPANIES.map(function (c) { return tCompanyOpt(c, c.id === activeCompany.id); }).join('') +
          '<div class="company-menu__foot">' +
            '<button class="company-menu__add" type="button"><i data-lucide="plus"></i>Tambah Perusahaan</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  function tNavSection(sec) {
    return (
      '<div class="sb-section">' +
        '<div class="sb-section__label">' + sec.section + '</div>' +
        sec.children.map(function (c) { return tNavNode(c, 1, ''); }).join('') +
      '</div>'
    );
  }

  function sidebarHTML() {
    return (
      '<div class="sidebar__header">' +
        companySwitcherHTML() +
        '<button class="sidebar__toggle" id="sidebarToggle" aria-label="Toggle sidebar"><i data-lucide="panel-left"></i></button>' +
      '</div>' +

      '<button class="sidebar__dashboard' + (cfg.dashboardActive ? ' is-on' : '') + '" data-route="home"' +
        (cfg.dashboardActive ? '' : ' onclick="location.href=\'index.html\'"') + '>' +
        '<span class="sidebar__dashboard-label">Dashboard</span>' +
        '<i data-lucide="layout-grid" class="sidebar__dashboard-icon"></i>' +
      '</button>' +

      '<nav class="sidebar__nav">' +
        NAV.map(tNavSection).join('') +
      '</nav>' +

      '<footer class="sidebar__footer">' +
        '<button class="sidebar__logout" aria-label="Logout"><i data-lucide="log-out"></i></button>' +
        '<span class="sidebar__footer-text">Company ID: [ID]</span>' +
      '</footer>' +

      '<div class="sidebar__resizer" id="sidebarResizer" aria-hidden="true"></div>'
    );
  }

  // ----------------------------------------------------------
  // RENDER — runs immediately at load (mount points already parsed)
  // ----------------------------------------------------------
  function render() {
    var topnav = document.getElementById('sevakaTopnav');
    var sidebar = document.getElementById('sidebar');
    if (topnav) topnav.innerHTML = topnavHTML();
    if (sidebar) sidebar.innerHTML = sidebarHTML();
    // Cross-product routing via the topnav product picker.
    if (topnav) topnav.querySelectorAll('.product-opt[data-route]').forEach(function (opt) {
      opt.addEventListener('click', function () { location.href = opt.getAttribute('data-route'); });
    });
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // Expose for manual re-render if a page needs it
  window.SevakaShell = { render: render, NAV: NAV, NOTIFS: NOTIF_ROWS, PRODUCTS: PRODUCTS, COMPANIES: COMPANIES };

  render();
  renderNotifList();
})();
