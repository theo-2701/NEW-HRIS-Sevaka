// dashboard.js — sidebar collapse/expand, accordion, dropdowns, tabs, carousel
(function () {

  /* ===================== SIDEBAR TOGGLE + ACCORDION ===================== */
  function setupSidebar() {
    var sidebar = document.getElementById('sidebar');
    var toggleBtn = document.getElementById('sidebarToggle');
    if (!sidebar || !toggleBtn) return;

    // Restore saved collapsed/expanded state
    if (localStorage.getItem('sidebarExpanded') === 'true') {
      sidebar.classList.add('is-expanded');
    }

    // Restore saved drag-resized width (expanded rail only)
    var MIN_SIDEBAR_W = 264, MAX_SIDEBAR_W = 460;
    var savedW = parseInt(localStorage.getItem('sidebarWidth'), 10);
    if (savedW && savedW >= MIN_SIDEBAR_W && savedW <= MAX_SIDEBAR_W) {
      sidebar.style.setProperty('--sidebar-expanded-w', savedW + 'px');
    }
    var resizer = document.getElementById('sidebarResizer');
    if (resizer) {
      var dragging = false, dragStartX = 0, dragStartW = 0;
      resizer.addEventListener('mousedown', function (e) {
        if (!sidebar.classList.contains('is-expanded')) return;
        dragging = true;
        dragStartX = e.clientX;
        dragStartW = sidebar.getBoundingClientRect().width;
        sidebar.classList.add('is-resizing');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });
      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var w = dragStartW + (e.clientX - dragStartX);
        w = Math.max(MIN_SIDEBAR_W, Math.min(MAX_SIDEBAR_W, w));
        sidebar.style.setProperty('--sidebar-expanded-w', w + 'px');
      });
      document.addEventListener('mouseup', function () {
        if (!dragging) return;
        dragging = false;
        sidebar.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        var w = parseInt(sidebar.style.getPropertyValue('--sidebar-expanded-w'), 10);
        if (w) { try { localStorage.setItem('sidebarWidth', w); } catch (e) {} }
      });
    }

    // Persist the nav list's own scroll position across page loads, so
    // clicking a menu/sub-menu deep in the tree doesn't dump the user back
    // at the top of the sidebar on the next page.
    var navEl = sidebar.querySelector('.sidebar__nav');
    var SCROLL_KEY = 'sidebarNavScroll';

    function collapseAllGroups() {
      sidebar.querySelectorAll('.sb-node--group.is-open').forEach(function (g) { g.classList.remove('is-open'); });
    }

    // Toggle expand/collapse
    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var expanded = sidebar.classList.toggle('is-expanded');
      localStorage.setItem('sidebarExpanded', expanded);
      if (!expanded) {
        collapseAllGroups();
        // Close the company switcher dropdown when collapsing (it would overflow the rail)
        var cs = document.getElementById('companySwitcher');
        if (cs) cs.classList.remove('is-open');
      }
    });

    // Auto-open the branch that leads to the active leaf
    var active = sidebar.querySelector('.sb-row--leaf.is-on');
    if (active) {
      var p = active.parentElement;
      while (p && p !== sidebar) {
        if (p.classList && p.classList.contains('sb-node--group')) p.classList.add('is-open');
        p = p.parentElement;
      }
    }

    // Restore the scroll position saved just before the last navigation
    // (branches are already open above, so heights are final).
    if (navEl) {
      var savedScroll = parseInt(sessionStorage.getItem(SCROLL_KEY), 10);
      if (!isNaN(savedScroll)) navEl.scrollTop = savedScroll;
      var scrollSaveTimer;
      navEl.addEventListener('scroll', function () {
        clearTimeout(scrollSaveTimer);
        scrollSaveTimer = setTimeout(function () {
          try { sessionStorage.setItem(SCROLL_KEY, navEl.scrollTop); } catch (e) {}
        }, 80);
      });
    }

    // Group rows — toggle their own branch open/closed
    sidebar.querySelectorAll('.sb-row--group').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        var node = row.closest('.sb-node--group');
        if (!node) return;
        // If collapsed, expand the sidebar first, then open this branch
        if (!sidebar.classList.contains('is-expanded')) {
          sidebar.classList.add('is-expanded');
          localStorage.setItem('sidebarExpanded', 'true');
          node.classList.add('is-open');
          return;
        }
        node.classList.toggle('is-open');
      });
    });

    // Leaf rows — navigate if routed, otherwise mark active
    sidebar.querySelectorAll('.sb-row--leaf').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.stopPropagation();
        var href = row.getAttribute('data-href');
        if (href) {
          if (navEl) { try { sessionStorage.setItem(SCROLL_KEY, navEl.scrollTop); } catch (e) {} }
          window.location.href = href;
          return;
        }
        sidebar.querySelectorAll('.sb-row--leaf.is-on').forEach(function (r) { r.classList.remove('is-on'); });
        row.classList.add('is-on');
      });
    });

    // Dashboard tile — clears any active leaf (navigation handled by its onclick)
    var dashTile = sidebar.querySelector('.sidebar__dashboard');
    if (dashTile) {
      dashTile.addEventListener('click', function () {
        sidebar.querySelectorAll('.sb-row--leaf.is-on').forEach(function (r) { r.classList.remove('is-on'); });
      });
    }
  }

  /* ===================== DROPDOWN / MENU OPEN-CLOSE ===================== */
  function setupMenus() {
    document.querySelectorAll('[data-menu-trigger]').forEach(function (trigger) {
      var target = document.querySelector(trigger.getAttribute('data-menu-trigger'));
      if (!target) return;
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        document.querySelectorAll('.menu.is-open').forEach(function (m) {
          if (m !== target) m.classList.remove('is-open');
        });
        document.querySelectorAll('.product-picker.is-open').forEach(function (pp) { pp.classList.remove('is-open'); });
        target.classList.toggle('is-open');
      });
    });
    document.addEventListener('click', function () {
      document.querySelectorAll('.menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      document.querySelectorAll('.product-picker.is-open').forEach(function (pp) { pp.classList.remove('is-open'); });
      document.querySelectorAll('.company-switcher.is-open').forEach(function (cs) { cs.classList.remove('is-open'); });
    });
  }

  /* ===================== PRODUCT PICKER ===================== */
  function setupProductPicker() {
    var pp = document.getElementById('productPicker');
    if (!pp) return;
    var btn = pp.querySelector('.product-picker__btn');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      document.querySelectorAll('.menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      pp.classList.toggle('is-open');
    });
    pp.querySelectorAll('.product-opt').forEach(function (opt) {
      if (opt.disabled) return;
      opt.addEventListener('click', function () {
        pp.querySelectorAll('.product-opt').forEach(function (o) { o.classList.remove('is-on'); });
        opt.classList.add('is-on');
        var name = opt.querySelector('.product-opt__name').textContent.trim();
        document.getElementById('productNow').textContent = name;
        pp.classList.remove('is-open');
      });
    });
  }

  /* ===================== COMPANY SWITCHER (multi-tenant) ===================== */
  function setupCompanySwitcher() {
    var cs = document.getElementById('companySwitcher');
    if (!cs) return;
    var sidebar = document.getElementById('sidebar');
    var btn = cs.querySelector('.company-switcher__btn');

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      // Collapsed sidebar: expand first (menu needs room), don't open dropdown yet.
      if (sidebar && !sidebar.classList.contains('is-expanded')) {
        sidebar.classList.add('is-expanded');
        localStorage.setItem('sidebarExpanded', 'true');
        return;
      }
      document.querySelectorAll('.menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      document.querySelectorAll('.product-picker.is-open').forEach(function (pp) { pp.classList.remove('is-open'); });
      cs.classList.toggle('is-open');
    });

    cs.querySelectorAll('.company-opt').forEach(function (opt) {
      opt.addEventListener('click', function (e) {
        e.stopPropagation();
        cs.querySelectorAll('.company-opt').forEach(function (o) { o.classList.remove('is-on'); });
        opt.classList.add('is-on');
        document.getElementById('companyNow').textContent = opt.getAttribute('data-name');
        document.getElementById('companySub').textContent = opt.getAttribute('data-sub');
        var trigLogo = cs.querySelector('.company-switcher__logo');
        trigLogo.textContent = opt.getAttribute('data-short');
        trigLogo.style.background = opt.getAttribute('data-color');
        try { localStorage.setItem('sevakaCompany', opt.getAttribute('data-id')); } catch (err) {}
        cs.classList.remove('is-open');
      });
    });
  }

  /* ===================== TABS PILLS ===================== */
  function setupTabs() {
    document.querySelectorAll('[data-tabgroup]').forEach(function (group) {
      var tabs = group.querySelectorAll('.tab-pill');
      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) { t.classList.remove('is-on'); });
          tab.classList.add('is-on');
        });
      });
    });
  }

  /* ===================== BANNER CAROUSEL ===================== */
  function setupCarousel() {
    document.querySelectorAll('.banner__dot').forEach(function (dot) {
      dot.addEventListener('click', function () {
        document.querySelectorAll('.banner__dot').forEach(function (d) { d.classList.remove('is-on'); });
        dot.classList.add('is-on');
      });
    });
  }

  /* ===================== CHECKBOXES ===================== */
  function setupChecks() {
    var head = document.getElementById('headCheck');
    var rows = document.querySelectorAll('[data-rowcheck]');
    if (head) {
      head.addEventListener('change', function () {
        rows.forEach(function (r) { r.checked = head.checked; });
      });
    }
  }

  /* ===================== MORE REQUEST DROPDOWN ===================== */
  function setupMoreRequest() {
    var btn = document.getElementById('moreRequestBtn');
    var menu = document.getElementById('moreRequestMenu');
    if (!btn || !menu) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.classList.toggle('is-open');
    });
  }

  /* ===================== NOTIFICATION DROPDOWN ===================== */
  function setupNotifPop() {
    var btn = document.getElementById('notifBtn');
    var pop = document.getElementById('notifPop');
    if (!btn || !pop) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      // Close other open menus first
      document.querySelectorAll('.menu.is-open').forEach(function (m) { m.classList.remove('is-open'); });
      document.querySelectorAll('.product-picker.is-open').forEach(function (pp) { pp.classList.remove('is-open'); });
      pop.classList.toggle('is-open');
      if (pop.classList.contains('is-open') && window.lucide) window.lucide.createIcons();
    });

    // Click inside the pop should not close it
    pop.addEventListener('click', function (e) { e.stopPropagation(); });

    // Document click closes the popover
    document.addEventListener('click', function () {
      pop.classList.remove('is-open');
    });

    // Tabs = the is_read filter of GET /api/v1/notifications/inbox (All / Unread).
    pop.querySelectorAll('[data-notif-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        pop.querySelectorAll('[data-notif-tab]').forEach(function (t) { t.classList.remove('is-on'); });
        tab.classList.add('is-on');
        if (window.renderNotifList) window.renderNotifList();
      });
    });

    // Clicking an item = PUT /api/v1/notifications/inbox/{id}/read (idempotent).
    // The id is CARRIED from the clicked row; no bulk mark-all exists in the contract.
    pop.addEventListener('click', function (e) {
      var it = e.target.closest('[data-notif]');
      if (!it) return;
      var id = it.getAttribute('data-notif');
      var res = window.SevakaNotif && window.SevakaNotif.markRead(id);
      if (window.renderNotifList) window.renderNotifList();
      if (res && res.status === 404) {
        if (window.Flow && window.Flow.toast) window.Flow.toast('404 NOT_FOUND \u2014 notification not found.', 'err');
        return;
      }
      // …then open the row in the Inbox (the only detail surface in the contract).
      var here = (location.pathname.split('/').pop() || '').toLowerCase() === 'notification-inbox.html';
      if (here) {
        location.hash = id;
        if (window.notifFocusRow) window.notifFocusRow(id);
        pop.classList.remove('is-open');
      } else {
        location.href = 'notification-inbox.html#' + id;
      }
    });
  }

  /* ===================== LUCIDE ICONS ===================== */
  function renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }
  window.__dashRefreshIcons = renderIcons;

  /* ===================== INIT ===================== */
  document.addEventListener('DOMContentLoaded', function () {
    renderIcons();
    setupSidebar();
    setupCompanySwitcher();
    setupMenus();
    setupProductPicker();
    setupTabs();
    setupCarousel();
    setupChecks();
    setupMoreRequest();
    setupNotifPop();
  });

})();
