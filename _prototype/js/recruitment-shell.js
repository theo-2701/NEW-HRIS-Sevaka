// ============================================================
// SEVAKA — Recruitment product shell
// Renders the shared TOPNAV (Recruitment active) + the Recruitment
// sidebar into mount points. Reuses the same topnav class/id contract
// as js/shell.js, so js/dashboard.js wires the product picker, notif
// popover and user menu automatically. The sidebar is Recruitment-
// specific (flat menu) and wires its own collapse + navigation here.
//
// Usage (end of <body>, BEFORE dashboard.js):
//   <header class="topnav" id="sevakaTopnav"></header>
//   <div class="app__body rc-body"> <aside class="rc-sidebar" id="rcSidebar"></aside> ... </div>
//   <script>window.RC_PAGE = { active: 'home' };</script>
//   <script src="js/recruitment-shell.js"></script>
//   <script src="js/dashboard.js"></script>
// ============================================================
(function () {
  'use strict';

  var cfg = window.RC_PAGE || {};
  var CURFILE = (location.pathname.split('/').pop() || 'recruitment-home.html').toLowerCase();

  // Multi-tenant: shared with the HRIS shell via the same localStorage key.
  var COMPANIES = [
    { id: 'DIKA',   short: 'DK', name: 'PT DIKA',               sub: '1.284 karyawan', color: '#0284c7' },
    { id: 'BAHARI', short: 'BH', name: 'PT Bahari Logistik',    sub: '642 karyawan',   color: '#0e9488' },
    { id: 'SINAR',  short: 'SA', name: 'PT Sinar Agro Lestari', sub: '389 karyawan',   color: '#d97706' }
  ];
  var storedCompany = null;
  try { storedCompany = localStorage.getItem('sevakaCompany'); } catch (e) {}
  var activeCompany = COMPANIES.filter(function (c) { return c.id === storedCompany; })[0] || COMPANIES[0];

  var PRODUCTS = [
    { id: 'HRIS',        icon: 'users',      name: 'HRIS',                   desc: 'Human Resource Information System', route: 'index.html' },
    { id: 'Recruitment', icon: 'briefcase',  name: 'Recruitment',            desc: 'Talent pipeline &amp; assessments' },
    { id: 'Performance', icon: 'award',      name: 'Performance Management', desc: 'Reviews, goals &amp; calibration', route: 'performance-cycles.html' },
    { id: 'Insights',    icon: 'line-chart', name: 'Insights',               desc: 'AI workforce analytics' }
  ];

  // Recruitment nav — flat menu. `route` navigates; `key` matches RC_PAGE.active.
  var NAV = [
    { key: 'home',        label: 'Home',         icon: 'home',           route: 'recruitment-home.html' },
    { key: 'jobs',        label: 'Job Listings', icon: 'briefcase',      route: 'recruitment-job-listings.html' },
    { key: 'talent',      label: 'Talent Pool',  icon: 'user-round' },
    { key: 'candidates',  label: 'Candidates',   icon: 'users' },
    { key: 'assessments', label: 'Assessments',  icon: 'clipboard-list' },
    { key: 'calendar',    label: 'Calendar',     icon: 'calendar' },
    { key: 'activity',    label: 'Activity Log', icon: 'book-open' },
    { key: 'reports',     label: 'Reports',      icon: 'bar-chart-3' }
  ];
  var SETTINGS = { key: 'settings', label: 'Settings', icon: 'settings' };

  var NOTIFS = [
    { cat: 'interview', icon: 'calendar-check', iconClass: 'notif-icon--mpp',       source: 'SEVAKA Recruitment', time: '10:05',  unread: true,  tag: 'Interview',   tagClass: 'tag-mpp',       msg: 'Interview <b>teknikal Backend Engineer</b> dengan Arif Wibowo dimulai dalam 30 menit.' },
    { cat: 'candidate', icon: 'user-plus',      iconClass: 'notif-icon--timeoff',   source: 'Career Page',        time: '09:12',  unread: true,  tag: 'Candidate',   tagClass: 'tag-timeoff',   msg: '<b>3 kandidat baru</b> melamar untuk posisi Sales Executive — siap ditinjau.' },
    { cat: 'offer',     icon: 'file-signature', iconClass: 'notif-icon--payroll',   source: 'SEVAKA Recruitment', time: 'Kemarin', unread: false, tag: 'Offering',    tagClass: 'tag-payroll',   msg: 'Kandidat <b>Dinda Maharani</b> menerima offering — lanjut ke onboarding.' }
  ];

  function tProductOpt(p, isOn) {
    return '<button class="product-opt' + (isOn ? ' is-on' : '') + '" data-product="' + p.id + '"' + (p.route ? ' data-route="' + p.route + '"' : '') + '>' +
      '<span class="product-opt__icon"><i data-lucide="' + p.icon + '"></i></span>' +
      '<span class="product-opt__text"><span class="product-opt__name">' + p.name + '</span>' +
      '<span class="product-opt__desc">' + p.desc + '</span></span>' +
      (isOn ? '<svg class="product-opt__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>' : '') +
      '</button>';
  }

  function tNotifItem(n) {
    return '<li class="notif-item' + (n.unread ? ' is-unread' : '') + '" data-cat="' + n.cat + '">' +
      '<span class="notif-item__icon ' + n.iconClass + '"><i data-lucide="' + n.icon + '"></i></span>' +
      '<div class="notif-item__body"><div class="notif-item__row">' +
      '<span class="notif-item__source">' + n.source + '</span>' +
      '<span class="notif-item__time">' + n.time + '</span></div>' +
      '<p class="notif-item__msg">' + n.msg + '</p>' +
      '<span class="notif-item__tag ' + n.tagClass + '">' + n.tag + '</span></div>' +
      '<span class="notif-item__unread" aria-label="unread"></span></li>';
  }

  function topnavHTML() {
    var unread = NOTIFS.filter(function (n) { return n.unread; }).length;
    return (
      '<div class="brand">' +
        '<div class="brand__s">S</div>' +
        '<div class="brand__text"><span class="brand__name">SEVAKA</span>' +
        '<span class="brand__sub">Human Resource Information System</span></div>' +
      '</div>' +
      '<div class="topnav__divider"></div>' +
      '<div class="product-picker" id="productPicker">' +
        '<button class="product-picker__btn" type="button" id="productPickerBtn" aria-haspopup="listbox">' +
          '<span class="product-picker__now" id="productNow">Recruitment</span>' +
          '<svg class="product-picker__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="product-menu" role="listbox">' +
          '<div class="product-menu__head">SEVAKA products</div>' +
          PRODUCTS.map(function (p) { return tProductOpt(p, p.id === 'Recruitment'); }).join('') +
        '</div>' +
      '</div>' +
      '<div class="topnav__spacer"></div>' +
      '<div class="topnav__right">' +
        '<button class="pill-ai" type="button"><i data-lucide="sparkles"></i>SUMMARIZE DATA</button>' +
        '<button class="icon-btn" aria-label="add"><i data-lucide="plus"></i></button>' +
        '<button class="icon-btn" aria-label="search"><i data-lucide="search"></i></button>' +
        '<div class="notif-wrap pos-rel">' +
          '<button class="icon-btn" id="notifBtn" aria-label="notifications"><i data-lucide="bell"></i><span class="dot"></span></button>' +
          '<div class="notif-pop" id="notifPop" role="dialog" aria-label="Notifications">' +
            '<div class="notif-pop__arrow" aria-hidden="true"></div>' +
            '<header class="notif-pop__head"><div class="notif-pop__heading">' +
              '<span class="notif-pop__title">Notifications</span>' +
              '<span class="notif-pop__badge" id="notifBadge">' + unread + ' new</span></div>' +
              '<button class="notif-pop__markread" type="button">Mark all read</button></header>' +
            '<div class="notif-pop__tabs" role="tablist">' +
              '<button class="notif-pop__tab is-on" data-notif-tab="all">All</button>' +
              '<button class="notif-pop__tab" data-notif-tab="unread">Unread</button>' +
              '<button class="notif-pop__tab" data-notif-tab="mentions">Mentions</button></div>' +
            '<ul class="notif-pop__list" id="notifPopList">' + NOTIFS.map(tNotifItem).join('') + '</ul>' +
            '<footer class="notif-pop__foot"><a class="notif-pop__cta" href="inbox.html">' +
              '<span>Lihat semua di Inbox</span><i data-lucide="arrow-right"></i></a></footer>' +
          '</div>' +
        '</div>' +
        '<button class="icon-btn" aria-label="apps"><i data-lucide="layout-grid"></i></button>' +
        '<div class="user-chip pos-rel">' +
          '<div class="user-chip__avatar" title="Tony Stark">' +
            '<svg viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">' +
              '<defs><linearGradient id="rcAvBg" x1="0" x2="0" y1="0" y2="1">' +
              '<stop offset="0%" stop-color="#a8d479"/><stop offset="100%" stop-color="#6ba23f"/></linearGradient></defs>' +
              '<rect width="42" height="42" fill="url(#rcAvBg)"/>' +
              '<ellipse cx="21" cy="18" rx="9" ry="10" fill="#f0c39a"/>' +
              '<path d="M14 12 q7 -8 14 0 q1 4 -2 6 q-3 -4 -10 -4 q-3 0 -4 4 q-2 -2 2 -6z" fill="#3d2415"/>' +
              '<path d="M14 22 q1 6 7 7 q6 -1 7 -7 q-3 2 -7 2 q-4 0 -7 -2z" fill="#3d2415"/>' +
              '<path d="M6 42 q3 -10 15 -10 q12 0 15 10z" fill="#1f4a26"/></svg>' +
          '</div>' +
          '<div class="user-chip__text"><span class="user-chip__name">Tony Stark</span>' +
          '<span class="user-chip__role">Administrator</span></div>' +
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

  function tNavRow(n) {
    var on = (cfg.active && n.key === cfg.active) ||
             (!cfg.active && n.route && n.route.toLowerCase() === CURFILE);
    return '<button class="rc-nav__item' + (on ? ' is-on' : '') + '" type="button"' +
      ' data-key="' + n.key + '"' + (n.route ? ' data-href="' + n.route + '"' : '') + '>' +
      '<i data-lucide="' + n.icon + '"></i><span class="rc-nav__label">' + n.label + '</span></button>';
  }

  function tCompanyOpt(c, isOn) {
    return '<button class="company-opt' + (isOn ? ' is-on' : '') + '" type="button"' +
      ' data-id="' + c.id + '" data-name="' + c.name + '" data-sub="' + c.sub + '"' +
      ' data-short="' + c.short + '" data-color="' + c.color + '">' +
      '<span class="company-opt__logo" style="background:' + c.color + '">' + c.short + '</span>' +
      '<span class="company-opt__text"><span class="company-opt__name">' + c.name + '</span>' +
      '<span class="company-opt__sub">' + c.sub + '</span></span>' +
      (isOn ? '<svg class="company-opt__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 13l4 4L19 7"/></svg>' : '') +
      '</button>';
  }
  function companySwitcherHTML() {
    return (
      '<div class="company-switcher" id="companySwitcher">' +
        '<button class="company-switcher__btn" id="companySwitcherBtn" type="button" aria-haspopup="listbox" title="Ganti perusahaan">' +
          '<span class="company-switcher__logo" style="background:' + activeCompany.color + '">' + activeCompany.short + '</span>' +
          '<span class="company-switcher__text">' +
            '<span class="company-switcher__name" id="companyNow">' + activeCompany.name + '</span>' +
            '<span class="company-switcher__sub" id="companySub">' + activeCompany.sub + '</span></span>' +
          '<svg class="company-switcher__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>' +
        '</button>' +
        '<div class="company-menu" role="listbox">' +
          '<div class="company-menu__head">Perusahaan Anda</div>' +
          COMPANIES.map(function (c) { return tCompanyOpt(c, c.id === activeCompany.id); }).join('') +
          '<div class="company-menu__foot"><button class="company-menu__add" type="button"><i data-lucide="plus"></i>Tambah Perusahaan</button></div>' +
        '</div>' +
      '</div>'
    );
  }

  function sidebarHTML() {
    return (
      '<div class="rc-sidebar__header">' +
        companySwitcherHTML() +
        '<button class="rc-collapse" id="rcCollapse" aria-label="Toggle sidebar"><i data-lucide="panel-left-close"></i></button>' +
      '</div>' +
      '<nav class="rc-nav">' + NAV.map(tNavRow).join('') + '</nav>' +
      '<div class="rc-nav__divider"></div>' +
      '<nav class="rc-nav">' + tNavRow(SETTINGS) + '</nav>' +
      '<footer class="rc-sidebar__footer">' +
        '<button class="rc-logout" aria-label="Logout"><i data-lucide="log-out"></i></button>' +
        '<span class="rc-sidebar__footer-text">Company ID: [ID]</span>' +
      '</footer>'
    );
  }

  function wireSidebar() {
    var body = document.querySelector('.rc-body');
    var toggle = document.getElementById('rcCollapse');
    if (localStorage.getItem('rcSidebarCollapsed') === 'true' && body) body.classList.add('is-collapsed');
    if (toggle && body) {
      toggle.addEventListener('click', function () {
        var c = body.classList.toggle('is-collapsed');
        localStorage.setItem('rcSidebarCollapsed', c);
      });
    }
    // While collapsed, clicking the company logo just expands the sidebar
    // (the switcher dropdown would overflow the rail). Runs before dashboard.js'
    // handler, so stopImmediatePropagation prevents the menu from opening.
    var csBtn = document.getElementById('companySwitcherBtn');
    if (csBtn && body) {
      csBtn.addEventListener('click', function (e) {
        if (body.classList.contains('is-collapsed')) {
          body.classList.remove('is-collapsed');
          localStorage.setItem('rcSidebarCollapsed', false);
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      });
    }
    document.querySelectorAll('.rc-nav__item').forEach(function (row) {
      row.addEventListener('click', function () {
        var href = row.getAttribute('data-href');
        if (href) { location.href = href; return; }
        document.querySelectorAll('.rc-nav__item.is-on').forEach(function (r) { r.classList.remove('is-on'); });
        row.classList.add('is-on');
      });
    });
  }

  function render() {
    var topnav = document.getElementById('sevakaTopnav');
    var sidebar = document.getElementById('rcSidebar');
    if (topnav) topnav.innerHTML = topnavHTML();
    if (sidebar) sidebar.innerHTML = sidebarHTML();
    // Cross-product routing via the topnav product picker.
    if (topnav) topnav.querySelectorAll('.product-opt[data-route]').forEach(function (opt) {
      opt.addEventListener('click', function () { location.href = opt.getAttribute('data-route'); });
    });
    wireSidebar();
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
  }

  window.RecruitmentShell = { render: render, NAV: NAV };
  render();
})();
