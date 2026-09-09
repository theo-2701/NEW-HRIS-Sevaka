// ============================================================
// SEVAKA HRIS — Employee flow pages: shared behaviours
// Runs AFTER shell.js + dashboard.js. Provides: toast(), modal open/close,
// custom-select wiring, segmented controls, hash copy. No page-specific logic.
// ============================================================
(function () {
  'use strict';

  var ICONS = {
    ok:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    info:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    warn:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>',
    danger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>'
  };

  var toastEl, toastTimer;
  function ensureToast() {
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.innerHTML = '<span class="toast__i"></span><span class="toast__msg"></span>';
    document.body.appendChild(toastEl);
    return toastEl;
  }
  function toast(msg, type) {
    type = type || 'ok';
    var el = ensureToast();
    el.className = 'toast toast--' + type;
    el.querySelector('.toast__i').innerHTML = ICONS[type] || ICONS.ok;
    el.querySelector('.toast__msg').textContent = msg;
    // reflow then show
    void el.offsetWidth;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 3600);
  }

  function openModal(id) {
    var m = document.getElementById(id);
    if (!m) return;
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(el) {
    var m = typeof el === 'string' ? document.getElementById(el) : el;
    if (!m) return;
    m.classList.remove('is-open');
    if (typeof closePicker === 'function') closePicker();
    document.body.style.overflow = '';
  }

  // Searchable dropdown: any select whose option list is long enough to scroll
  // gets a sticky search bar at the top that live-filters the options. Applied
  // automatically to every .ctl--select — no per-page markup needed.
  var SEARCH_MIN = 8; // show the search bar once there are this many options
  var SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
  function enhanceSelectSearch(ctl) {
    var dd = ctl.querySelector('.dropdown');
    if (!dd || dd.dataset.searchable) return;
    var opts = [].slice.call(dd.querySelectorAll('.dropdown__opt'));
    if (opts.length < SEARCH_MIN) return;
    dd.dataset.searchable = '1';
    var list = document.createElement('div');
    list.className = 'dropdown__list';
    opts.forEach(function (o) { list.appendChild(o); });
    var empty = document.createElement('div');
    empty.className = 'dropdown__empty';
    empty.textContent = 'No results found';
    empty.style.display = 'none';
    list.appendChild(empty);
    var head = document.createElement('div');
    head.className = 'dropdown__search';
    head.innerHTML = SEARCH_SVG + '<input type="text" placeholder="Search here">';
    dd.insertBefore(head, dd.firstChild);
    dd.appendChild(list);
    var input = head.querySelector('input');
    ['click', 'mousedown', 'keydown'].forEach(function (ev) {
      input.addEventListener(ev, function (e) { e.stopPropagation(); });
    });
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase(), any = false;
      opts.forEach(function (o) {
        var m = o.textContent.toLowerCase().indexOf(q) > -1;
        o.style.display = m ? '' : 'none';
        if (m) any = true;
      });
      empty.style.display = any ? 'none' : '';
    });
  }

  // A select inside a scrolling modal body would clip its popover (and hide the last
  // options behind the fixed footer). Inside .ovl__body the popover is re-anchored to
  // the viewport, capped in height and scrolled on its own — never the modal content.
  function placeDD(ctl) {
    var dd = ctl.querySelector('.dropdown');
    if (!dd || !ctl.closest('.ovl__body')) return;
    var r = ctl.getBoundingClientRect(), cap = 260;
    var below = window.innerHeight - r.bottom - 16, above = r.top - 16;
    dd.classList.add('dropdown--fixed');
    dd.style.position = 'fixed'; dd.style.left = r.left + 'px'; dd.style.width = r.width + 'px';
    dd.style.right = 'auto'; dd.style.overflowY = 'auto';
    if (below < 180 && above > below) {
      dd.style.top = 'auto'; dd.style.bottom = (window.innerHeight - r.top + 6) + 'px';
      dd.style.maxHeight = Math.min(cap, above) + 'px';
    } else {
      dd.style.bottom = 'auto'; dd.style.top = (r.bottom + 6) + 'px';
      dd.style.maxHeight = Math.min(cap, below) + 'px';
    }
  }
  function closeSelects() {
    document.querySelectorAll('.ctl--select.is-open').forEach(function (o) {
      o.classList.remove('is-open');
      var dd = o.querySelector('.dropdown--fixed');
      if (dd) { dd.classList.remove('dropdown--fixed'); dd.removeAttribute('style'); }
    });
  }
  document.addEventListener('scroll', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('ovl__body')) {
      closeSelects();
      document.querySelectorAll('.rng.is-open').forEach(function (o) { o.classList.remove('is-open'); var p = o.querySelector('.rng__pop'); if (p) p.style.cssText = ''; });
    }
  }, true);

  // custom selects: .ctl--select > .ctl__value + .dropdown > .dropdown__opt
  // Re-runnable: options injected into an already-wired control (a picker refilled when a
  // modal opens) are wired on the next call — the guard is per option, not per control.
  function wireSelects(root) {
    (root || document).querySelectorAll('.ctl--select').forEach(function (ctl) {
      var value = ctl.querySelector('.ctl__value');
      if (!ctl.dataset.wired) {
      ctl.dataset.wired = '1';
      enhanceSelectSearch(ctl);
      ctl.addEventListener('click', function (e) {
        if (e.target.closest('.dropdown__opt') || e.target.closest('.dropdown__search')) return;
        var open = ctl.classList.contains('is-open');
        closeSelects();
        if (!open) {
          ctl.classList.add('is-open');
          placeDD(ctl);
          var si = ctl.querySelector('.dropdown__search input');
          if (si) { si.value = ''; si.dispatchEvent(new Event('input')); setTimeout(function () { si.focus(); }, 0); }
        }
      });
      }
      ctl.querySelectorAll('.dropdown__opt').forEach(function (opt) {
        if (opt.dataset.wired) return;
        opt.dataset.wired = '1';
        opt.addEventListener('click', function (e) {
          e.stopPropagation();
          ctl.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
          opt.classList.add('is-sel');
          if (value) { value.textContent = opt.textContent; value.style.color = 'var(--fg-1)'; }
          closeSelects();
          ctl.dispatchEvent(new CustomEvent('select', { detail: { value: opt.dataset.val || opt.textContent, opt: opt }, bubbles: true }));
        });
      });
    });
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.ctl--select') && !e.target.closest('.dropdown--fixed')) closeSelects();
  });

  // segmented controls: .seg > .seg__opt[data-val]; fires 'segchange' on .seg
  function wireSegments(root) {
    (root || document).querySelectorAll('.seg').forEach(function (seg) {
      if (seg.dataset.wired) return;
      seg.dataset.wired = '1';
      seg.querySelectorAll('.seg__opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
          seg.querySelectorAll('.seg__opt').forEach(function (o) { o.classList.remove('is-on'); });
          opt.classList.add('is-on');
          seg.dispatchEvent(new CustomEvent('segchange', { detail: { value: opt.dataset.val || opt.textContent }, bubbles: true }));
        });
      });
    });
  }

  // Standardize every modal to the same shape (fixed head + scrolling body + fixed
  // foot) by wrapping the content between .ovl__head and .ovl__foot in .ovl__body.
  // Zero markup change needed per page. Panels with a custom body (e.g. .dd) have
  // no direct .ovl__head child and are skipped.
  function standardizeModals() {
    document.querySelectorAll('.ovl__panel').forEach(function (panel) {
      if (panel.querySelector(':scope > .ovl__body')) return;
      var head = panel.querySelector(':scope > .ovl__head');
      if (!head) return;
      var foot = panel.querySelector(':scope > .ovl__foot');
      var body = document.createElement('div');
      body.className = 'ovl__body';
      var n = head.nextSibling;
      while (n && n !== foot) { var next = n.nextSibling; body.appendChild(n); n = next; }
      if (foot) panel.insertBefore(body, foot); else panel.appendChild(body);
    });
  }

  function wireModals() {
    document.querySelectorAll('.ovl').forEach(function (m) {
      m.addEventListener('click', function (e) {
        if (e.target.classList.contains('ovl__scrim') || e.target.closest('[data-close]')) closeModal(m);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') document.querySelectorAll('.ovl.is-open').forEach(function (m) { closeModal(m); });
    });
  }

  function wireHashCopy() {
    document.querySelectorAll('.hashchip__copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var chip = btn.closest('.hashchip');
        var val = chip ? chip.querySelector('.hashchip__val').textContent : '';
        if (navigator.clipboard) navigator.clipboard.writeText(val).catch(function () {});
        toast('Selection hash copied to clipboard.', 'info');
      });
    });
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    var M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var p = iso.split('-'); if (p.length !== 3) return iso;
    return String(+p[2]).padStart(2, '0') + ' ' + M[+p[1] - 1] + ' ' + p[0];
  }

  // ---------- role gating (STANDARD, handoff contract) ----------
  // Any element carrying data-roles="ROLE_A,ROLE_B" is REMOVED from the DOM unless
  // the signed-in session holds one of those roles. Tabs are removed together with
  // their [data-tabpanel]. The session is declared per page as
  //   window.SEVAKA_SESSION = { employee_id, roles: ['ROLE_EMPLOYEE', ...] }
  // and is the single point a developer wires to the real login token. Every user is
  // ROLE_EMPLOYEE first; managerial roles stack on top (an employee-only login
  // therefore loses the approval / administration tabs entirely).
  function applyRoleGate() {
    var roles = (window.SEVAKA_SESSION && window.SEVAKA_SESSION.roles) || ['ROLE_EMPLOYEE'];
    document.querySelectorAll('[data-roles]').forEach(function (el) {
      var need = el.getAttribute('data-roles').split(',').map(function (s) { return s.trim(); });
      var ok = need.some(function (r) { return roles.indexOf(r) >= 0; });
      if (ok) return;
      if (el.classList.contains('tabnav__tab')) {
        var id = el.dataset.tab, scope = el.parentNode.parentNode;
        var panel = scope.querySelector('[data-tabpanel="' + id + '"]');
        if (panel) panel.remove();
      }
      el.remove();
    });
    document.querySelectorAll('.tabnav').forEach(function (nav) {
      var tabs = nav.querySelectorAll('.tabnav__tab');
      if (tabs.length && !nav.querySelector('.tabnav__tab.is-on')) {
        tabs[0].classList.add('is-on');
        var p = nav.parentNode.querySelector('[data-tabpanel="' + tabs[0].dataset.tab + '"]');
        if (p) p.classList.add('is-on');
      }
    });
  }

  // tab nav (STANDARD): .tabnav > .tabnav__tab[data-tab]; panels [data-tabpanel]
  // live in the tabnav's parent. Fires 'tabchange' on .tabnav.
  function wireTabs(root) {
    (root || document).querySelectorAll('.tabnav').forEach(function (nav) {
      if (nav.dataset.wired) return;
      nav.dataset.wired = '1';
      var scope = nav.parentNode;
      nav.querySelectorAll('.tabnav__tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
          var id = tab.dataset.tab;
          nav.querySelectorAll('.tabnav__tab').forEach(function (t) { t.classList.toggle('is-on', t === tab); });
          scope.querySelectorAll('[data-tabpanel]').forEach(function (p) { p.classList.toggle('is-on', p.getAttribute('data-tabpanel') === id); });
          nav.dispatchEvent(new CustomEvent('tabchange', { detail: { value: id }, bubbles: true }));
        });
      });
    });
  }

  // ===================== DATE PICKER (branded, SEVAKA standard) =====================
  // Wires every .ctl--date to the branded .dp picker. Native <input type="date">
  // fields are converted to the branded picker so all date fields look/behave the
  // same. ISO value is kept on input.dataset.iso for form logic; the field shows
  // DD / MM / YYYY. Skips [data-thr-pick] / [data-month] (owned by payroll pages).
  var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var WEEKDAYS = ['Mo','Tu','We','Th','Fr','Sa','Su'];
  var dp = null, dpInput = null, dpView = new Date(), dpSel = null, dpMode = 'days';

  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDMY(d) { return d.getDate() + ' ' + MONTHS_SHORT[d.getMonth()] + ' ' + d.getFullYear(); }
  function isoOf(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function sameDay(a, b) { return a && b && a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear(); }
  function parseDMY(str) { var m = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(str || ''); return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null; }
  function parseISO(str) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function seedFrom(input) {
    if (input.dataset.iso) { var d = new Date(input.dataset.iso); if (!isNaN(d)) return d; }
    return parseDMY(input.value) || parseISO(input.value);
  }
  // Set a date field from an ISO string (YYYY-MM-DD) using the standard display
  // format. Use this instead of assigning input.value = iso directly.
  function setDate(input, iso) {
    if (typeof input === 'string') input = document.getElementById(input);
    if (!input) return;
    var d = iso ? new Date(iso) : null;
    if (d && !isNaN(d)) { input.value = fmtDMY(d); input.dataset.iso = isoOf(d); input.classList.add('has-value'); }
    else { input.value = ''; delete input.dataset.iso; input.classList.remove('has-value'); }
  }
  function buildPicker() {
    dp = document.createElement('div');
    dp.className = 'dp is-days';
    dp.innerHTML =
      '<div class="dp__head">' +
        '<button class="dp__nav" type="button" data-dp="prev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
        '<button class="dp__title" type="button" data-dp="title"></button>' +
        '<button class="dp__nav" type="button" data-dp="next"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>' +
      '</div>' +
      '<div class="dp__view dp__view--days">' +
        '<div class="dp__weekdays">' + WEEKDAYS.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
        '<div class="dp__grid" data-dp="grid"></div>' +
      '</div>' +
      '<div class="dp__view dp__view--months"><div class="dp__cells" data-dp="months"></div></div>' +
      '<div class="dp__view dp__view--years"><div class="dp__cells" data-dp="years"></div></div>' +
      '<div class="dp__foot"><span class="dp__value" data-dp="value"></span><button class="dp__set" type="button" data-dp="set">Set Date</button></div>';
    document.body.appendChild(dp);
    dp.addEventListener('click', function (e) { e.stopPropagation(); });
    dp.querySelector('[data-dp="prev"]').addEventListener('click', function () { step(-1); });
    dp.querySelector('[data-dp="next"]').addEventListener('click', function () { step(1); });
    dp.querySelector('[data-dp="title"]').addEventListener('click', function () { dpMode = dpMode === 'days' ? 'months' : 'years'; renderPicker(); });
    dp.querySelector('[data-dp="set"]').addEventListener('click', function () { commitDate(); closePicker(); });
  }
  function commitDate() {
    if (!dpSel || !dpInput) return;
    dpInput.value = fmtDMY(dpSel);
    dpInput.dataset.iso = isoOf(dpSel);
    dpInput.classList.add('has-value');
    dpInput.dispatchEvent(new CustomEvent('datechange', { detail: { iso: dpInput.dataset.iso }, bubbles: true }));
  }
  function step(dir) {
    if (dpMode === 'days') dpView.setMonth(dpView.getMonth() + dir);
    else if (dpMode === 'months') dpView.setFullYear(dpView.getFullYear() + dir);
    else dpView.setFullYear(dpView.getFullYear() + dir * 12);
    renderPicker();
  }
  function renderPicker() {
    dp.classList.remove('is-days', 'is-months', 'is-years');
    dp.classList.add('is-' + dpMode);
    var title = dp.querySelector('[data-dp="title"]'), today = new Date();
    if (dpMode === 'days') {
      title.textContent = MONTHS[dpView.getMonth()] + ' ' + dpView.getFullYear();
      var grid = dp.querySelector('[data-dp="grid"]'); grid.innerHTML = '';
      var y = dpView.getFullYear(), m = dpView.getMonth();
      var startIdx = (new Date(y, m, 1).getDay() + 6) % 7;
      var start = new Date(y, m, 1 - startIdx);
      for (var i = 0; i < 42; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'dp__day'; btn.textContent = d.getDate();
        if (d.getMonth() !== m) btn.classList.add('is-out');
        if (sameDay(d, today)) btn.classList.add('is-today');
        if (sameDay(d, dpSel)) btn.classList.add('is-sel');
        (function (dd) { btn.addEventListener('click', function () { dpSel = dd; dpView = new Date(dd.getFullYear(), dd.getMonth(), 1); renderPicker(); commitDate(); }); })(d);
        grid.appendChild(btn);
      }
    } else if (dpMode === 'months') {
      title.textContent = dpView.getFullYear();
      var mc = dp.querySelector('[data-dp="months"]'); mc.innerHTML = '';
      MONTHS_SHORT.forEach(function (name, idx) {
        var c = document.createElement('button');
        c.type = 'button'; c.className = 'dp__cell'; c.textContent = name;
        if (dpSel && dpSel.getFullYear() === dpView.getFullYear() && dpSel.getMonth() === idx) c.classList.add('is-sel');
        c.addEventListener('click', function () { dpView.setMonth(idx); dpMode = 'days'; renderPicker(); });
        mc.appendChild(c);
      });
    } else {
      var yStart = dpView.getFullYear() - (dpView.getFullYear() % 12);
      title.textContent = yStart + ' - ' + (yStart + 11);
      var yc = dp.querySelector('[data-dp="years"]'); yc.innerHTML = '';
      for (var yr = yStart; yr < yStart + 12; yr++) {
        (function (year) {
          var c = document.createElement('button');
          c.type = 'button'; c.className = 'dp__cell'; c.textContent = year;
          if (dpSel && dpSel.getFullYear() === year) c.classList.add('is-sel');
          c.addEventListener('click', function () { dpView.setFullYear(year); dpMode = 'months'; renderPicker(); });
          yc.appendChild(c);
        })(yr);
      }
    }
    var val = dp.querySelector('[data-dp="value"]');
    if (dpSel) { val.textContent = fmtDMY(dpSel); val.classList.remove('is-empty'); }
    else { val.textContent = 'DD MMM YYYY'; val.classList.add('is-empty'); }
  }
  function openPicker(input, ctl) {
    if (!dp) buildPicker();
    dpInput = input;
    dpSel = seedFrom(input);
    dpView = dpSel ? new Date(dpSel.getFullYear(), dpSel.getMonth(), 1) : new Date();
    dpMode = 'days';
    renderPicker();
    dp.classList.add('is-open');
    var r = ctl.getBoundingClientRect();
    var h = dp.offsetHeight || 300, w = dp.offsetWidth || 236, gap = 6, vh = window.innerHeight;
    // never scrolls: pick the side it fits, else clamp inside the viewport
    var top = (r.bottom + gap + h <= vh - 8) ? r.bottom + gap
      : (r.top - gap - h >= 8) ? r.top - h - gap
      : Math.max(8, vh - 8 - h);
    var left = r.left;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - 8 - w;
    dp.style.top = top + 'px';
    dp.style.left = Math.max(8, left) + 'px';
  }
  function closePicker() { if (dp) dp.classList.remove('is-open'); }
  function setupDates(root) {
    (root || document).querySelectorAll('.ctl--date').forEach(function (ctl) {
      if (ctl.dataset.wiredDp) return;
      if (ctl.hasAttribute('data-thr-pick')) return;
      var input = ctl.querySelector('input');
      if (!input || input.hasAttribute('data-month')) return;
      ctl.dataset.wiredDp = '1';
      var iso = input.dataset.iso || (input.type === 'date' ? input.value : '');
      if (input.type === 'date') input.type = 'text';
      input.readOnly = true; input.setAttribute('readonly', '');
      input.style.pointerEvents = 'none';
      if (iso) { var d = new Date(iso); if (!isNaN(d)) { input.value = fmtDMY(d); input.dataset.iso = iso; input.classList.add('has-value'); } }
      if (!input.placeholder) input.placeholder = 'DD MMM YYYY';
      ctl.style.cursor = 'pointer';
      ctl.addEventListener('click', function (e) {
        e.stopPropagation();
        if (dp && dp.classList.contains('is-open') && dpInput === input) { closePicker(); return; }
        openPicker(input, ctl);
      });
    });
  }
  document.addEventListener('click', function () { closePicker(); });
  window.addEventListener('scroll', closePicker, true);
  window.addEventListener('resize', closePicker);

  // Inject the supporting CSS once, so the searchable dropdown + branded date
  // picker work on every flow-common page regardless of which stylesheets it links.
  function injectUI() {
    if (document.getElementById('flow-common-ui')) return;
    var css =
      '@keyframes fcDpIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}' +
      '.dropdown--fixed{z-index:4000;box-shadow:var(--shadow-overlay,0 8px 24px rgba(16,24,40,.14))}' +
      '.dropdown[data-searchable]{padding:0;overflow:hidden}' +
      '.dropdown--fixed[data-searchable]{overflow:auto}' +
      '.dropdown__search{position:sticky;top:0;z-index:1;display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border-1);background:#fff}' +
      '.dropdown__search svg{width:16px;height:16px;color:var(--fg-3);flex-shrink:0}' +
      '.dropdown__search input{flex:1;min-width:0;border:none;outline:none;background:transparent;font:500 13px/1.4 var(--font-body);color:var(--fg-1)}' +
      '.dropdown__search input::placeholder{color:var(--fg-4)}' +
      '.dropdown__list{max-height:224px;overflow-y:auto;padding:4px}' +
      '.dropdown__empty{padding:14px 12px;text-align:center;color:var(--fg-4);font:500 12px/1.4 var(--font-body)}' +
      /* branded date picker — mirrors the add-employee.css .dp standard, self-contained */
      '.dp{position:fixed;z-index:2600;width:228px;overflow:hidden;background:#fff;border:1px solid var(--border-1);border-radius:var(--radius-lg,16px);box-shadow:var(--shadow-overlay,0 8px 24px rgba(16,24,40,.16));padding:8px;display:none;animation:fcDpIn var(--duration-1,140ms) var(--ease-standard,cubic-bezier(.2,0,0,1))}' +
      '.dp.is-open{display:block}' +
      '.dp__head{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px}' +
      '.dp__nav{width:24px;height:24px;flex-shrink:0;border:1px solid var(--border-1);border-radius:var(--radius-md,8px);background:#fff;color:var(--color-secondary-600);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:background .18s,border-color .18s}' +
      '.dp__nav:hover{background:var(--color-mist);border-color:var(--color-secondary-200)}' +
      '.dp__nav svg{width:14px;height:14px}' +
      '.dp__title{flex:1;border:none;background:transparent;font:700 13px/1.2 var(--font-body);color:var(--fg-1);cursor:pointer;border-radius:var(--radius-sm,6px);padding:2px 0;transition:color .18s}' +
      '.dp__title:hover{color:var(--color-secondary-600)}' +
      '.dp.is-months .dp__title,.dp.is-years .dp__title{color:var(--fg-3)}' +
      '.dp__weekdays{display:grid;grid-template-columns:repeat(7,1fr);margin-bottom:4px}' +
      '.dp__weekdays span{text-align:center;font:700 9px/1 var(--font-body);color:var(--fg-3);padding:4px 0}' +
      '.dp__grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}' +
      '.dp__day{aspect-ratio:1;border:none;background:transparent;border-radius:50%;font:500 11px/1 var(--font-body);color:var(--fg-1);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .12s,color .12s}' +
      '.dp__day:hover{background:var(--color-secondary-100)}' +
      '.dp__day.is-out{color:var(--fg-4)}' +
      '.dp__day.is-today{box-shadow:inset 0 0 0 1.5px var(--color-secondary-500);color:var(--color-secondary-600)}' +
      '.dp__day.is-sel{background:var(--color-secondary-500);color:#fff}' +
      '.dp__day.is-sel:hover{background:var(--color-secondary-600)}' +
      '.dp__cells{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}' +
      '.dp__cell{border:none;background:transparent;border-radius:var(--radius-md,8px);padding:10px 0;font:600 12px/1 var(--font-body);color:var(--fg-1);cursor:pointer;transition:background .12s,color .12s}' +
      '.dp__cell:hover{background:var(--color-secondary-100)}' +
      '.dp__cell.is-sel{color:var(--color-secondary-600);font-weight:700}' +
      '.dp__view{display:none}' +
      '.dp.is-days .dp__view--days{display:block}.dp.is-months .dp__view--months{display:block}.dp.is-years .dp__view--years{display:block}' +
      '.dp__foot{display:flex;align-items:center;gap:6px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-1)}' +
      '.dp__value{flex:1;min-width:0;height:28px;display:inline-flex;align-items:center;padding:0 8px;border:1px solid var(--border-1);border-radius:var(--radius-md,8px);font:700 11px/1 var(--font-body);color:var(--color-secondary-600)}' +
      '.dp__value.is-empty{color:var(--fg-4);font-weight:500}' +
      '.dp__set{flex-shrink:0;height:28px;min-width:76px;padding:0 10px;border:none;border-radius:var(--radius-md,8px);color:var(--color-cloud,#fafcfe);background:var(--bg-primary-btn,var(--color-secondary-500));box-shadow:var(--shadow-primary);font:700 12px/1 var(--font-body);letter-spacing:.01em;cursor:pointer;transition:background .18s,box-shadow .18s}' +
      '.dp__set:hover{background:var(--bg-primary-btn-hover,var(--color-secondary-600))}';
    var s = document.createElement('style');
    s.id = 'flow-common-ui';
    s.textContent = css;
    document.head.appendChild(s);
  }

  document.addEventListener('DOMContentLoaded', function () {
    injectUI();
    applyRoleGate(); standardizeModals(); wireSelects(); wireSegments(); wireModals(); wireHashCopy(); wireTabs(); setupDates(); wireRanges();
    if (window.lucide) window.lucide.createIcons();
  });

  // Row action dropdown — STANDARD for rows with 3+ actions.
  // rowMenu([{label,icon,attr,href,danger}]) -> HTML string. `attr` is raw markup
  // for the data-attribute the page already listens for (e.g. 'data-del="3"').
  function rowMenu(items, label) {
    var caret = '<svg class="rowmenu__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
    var body = items.map(function (it) {
      var ic = it.icon ? '<i data-lucide="' + it.icon + '"></i>' : '';
      var cls = 'rowmenu__item' + (it.danger ? ' rowmenu__item--danger' : '');
      if (it.href) return '<a class="' + cls + '" href="' + it.href + '">' + ic + (it.label || '') + '</a>';
      var dis = it.disabled ? ' disabled' + (it.reason ? ' title="' + it.reason + '"' : '') : '';
      return '<button type="button" class="' + cls + '"' + dis + ' ' + (it.attr || '') + '>' + ic + (it.label || '') + '</button>';
    }).join('');
    return '<div class="rowmenu"><button type="button" class="rowmenu__trigger">' +
      (label || 'Action') + caret + '</button><div class="rowmenu__pop">' + body + '</div></div>';
  }
  // delegated open/close for every .rowmenu
  // The pop is positioned FIXED off the trigger rect so it never gets clipped by a
  // table's overflow / frozen Action column, and flips up when there's no room below.
  // The pop is positioned FIXED off the trigger rect so it escapes a table's overflow /
  // frozen Action column, and flips up when there's no room below. (No portal: pages bind
  // row-action delegation on the table element, so the pop must stay inside .rowmenu.)
  function positionRowPop(menu) {
    var trg = menu.querySelector('.rowmenu__trigger');
    var pop = menu.querySelector('.rowmenu__pop');
    if (!trg || !pop) return;
    var r = trg.getBoundingClientRect();
    pop.style.position = 'fixed';
    pop.style.top = 'auto'; pop.style.bottom = 'auto'; pop.style.left = 'auto'; pop.style.right = 'auto';
    var ph = pop.offsetHeight, pw = pop.offsetWidth;
    var gap = 6, vh = window.innerHeight, vw = window.innerWidth;
    var spaceBelow = vh - r.bottom;
    var top = (spaceBelow < ph + gap + 8 && r.top > ph + gap + 8) ? (r.top - ph - gap) : (r.bottom + gap);
    var left = r.right - pw;               // right-align to the trigger
    if (left < 8) left = 8;
    if (left + pw > vw - 8) left = vw - 8 - pw;
    pop.style.top = Math.max(8, top) + 'px';
    pop.style.left = left + 'px';
  }
  function closeRowMenu() {
    var open = document.querySelector('.rowmenu.is-open');
    if (open) open.classList.remove('is-open');
  }
  document.addEventListener('click', function (e) {
    var trg = e.target.closest('.rowmenu__trigger');
    var open = document.querySelector('.rowmenu.is-open');
    if (open && (!trg || open !== trg.parentNode)) open.classList.remove('is-open');
    if (trg) {
      e.stopPropagation();
      var menu = trg.parentNode;
      var nowOpen = !menu.classList.contains('is-open');
      menu.classList.toggle('is-open');
      if (nowOpen) positionRowPop(menu);
    }
    // a menu item click closes the menu after its own handler runs
    if (e.target.closest('.rowmenu__item')) { var m = e.target.closest('.rowmenu'); if (m) m.classList.remove('is-open'); }
  });
  // any scroll (tables scroll internally) or resize dismisses the open menu to avoid a detached popup
  window.addEventListener('scroll', closeRowMenu, true);
  window.addEventListener('resize', closeRowMenu);

  // ---------- segmented sub-tabs inside a tab panel (STANDARD) ----------
  // <div class="subtabs"><span class="seg"><button class="seg__btn is-on" data-sub="a">A</button>…</span></div>
  // <div class="subpanel is-on" data-subpanel="a">…</div>  (siblings of .subtabs)
  document.addEventListener('click', function (e) {
    var pill = e.target.closest('.subtabs [data-sub]');
    if (!pill) return;
    var bar = pill.closest('.subtabs'), host = bar.parentNode, k = pill.getAttribute('data-sub');
    bar.querySelectorAll('[data-sub]').forEach(function (x) { x.classList.toggle('is-on', x === pill); });
    Array.prototype.forEach.call(host.children, function (x) {
      if (x.classList.contains('subpanel')) x.classList.toggle('is-on', x.getAttribute('data-subpanel') === k);
    });
    bar.dispatchEvent(new CustomEvent('subchange', { bubbles: true, detail: { value: k } }));
  });

  // ---------- client-side pagination (house .ph-foot standard) ----------
  // markup: <div class="ph-foot" id="pgAll"></div> right after the table wrap
  // var pg = Flow.pager('pgAll', 10, redraw);
  // in redraw():  var view = pg.slice(allRows); …render view…; pg.paint();
  var CHEV_D = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
  function pager(mountId, size, onChange, noun) {
    var st = { page: 1, size: size || 10, total: 0 };
    var mount = document.getElementById(mountId);
    if (mount && !mount.dataset.wired) {
      mount.dataset.wired = '1';
      mount.addEventListener('click', function (e) {
        var b = e.target.closest('[data-pg]');
        if (!b || b.disabled) return;
        st.page = +b.getAttribute('data-pg');
        onChange();
      });
      mount.addEventListener('change', function (e) {
        if (e.target.hasAttribute('data-pgsize')) { st.size = +e.target.value; st.page = 1; onChange(); }
      });
    }
    return {
      state: st,
      reset: function () { st.page = 1; },
      slice: function (rows) {
        st.total = rows.length;
        var pages = Math.max(1, Math.ceil(st.total / st.size));
        if (st.page > pages) st.page = pages;
        return rows.slice((st.page - 1) * st.size, st.page * st.size);
      },
      paint: function () {
        if (!mount) return;
        var pages = Math.max(1, Math.ceil(st.total / st.size));
        var from = st.total ? (st.page - 1) * st.size + 1 : 0, to = Math.min(st.total, st.page * st.size);
        mount.innerHTML =
          '<div class="ph-showing"><span>Showing ' + from + '–' + to + ' of ' + st.total + (noun ? ' ' + noun : '') + '</span>' +
          '<div class="ph-pagesize"><select data-pgsize aria-label="Rows per page">' +
          [10, 20, 50].concat(st.size).filter(function (n, i, a) { return a.indexOf(n) === i; }).sort(function (a, b) { return a - b; }).map(function (n) { return '<option' + (n === st.size ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
          '</select>' + CHEV_D + '</div><span class="ph-pager__from">rows / page</span></div>' +
          '<div class="ph-pager">' +
          '<button class="ph-pager__btn" type="button" data-pg="' + (st.page - 1) + '"' + (st.page <= 1 ? ' disabled' : '') + ' aria-label="Previous page">' + CHEV_L + '</button>' +
          '<span class="ph-pagebox">' + st.page + '</span>' +
          '<span class="ph-pager__from">of ' + pages + '</span>' +
          '<button class="ph-pager__btn" type="button" data-pg="' + (st.page + 1) + '"' + (st.page >= pages ? ' disabled' : '') + ' aria-label="Next page">' + CHEV_R + '</button>' +
          '</div>';
      }
    };
  }

  // ---------- date-range control (.rng) ----------
  // markup: <div class="rng" data-placeholder="…"><button class="rng__ctl">…</button></div>
  // the popup is built here; the element emits 'rangechange' with {from,to} ISO or ''
  var RWD = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  var RMN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dmy(s) { var p = s.split('-'); return (+p[2]) + ' ' + MONTHS_SHORT[+p[1] - 1] + ' ' + p[0]; }
  function calHtml(y, m, first, sel) {
    var head = '<div class="rng__head">' +
      '<button type="button" class="rng__nav" data-shift="-1" aria-label="Previous month">' + CHEV_L + '</button>' +
      '<span class="rng__title">' + RMN[m] + ' ' + y + '</span>' +
      '<button type="button" class="rng__nav" data-shift="1" aria-label="Next month">' + CHEV_R + '</button></div>';
    var wd = '<div class="rng__wd">' + RWD.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>';
    var start = new Date(y, m, 1), lead = (start.getDay() + 6) % 7, cells = '';
    for (var i = 0; i < 42; i++) {
      var d = new Date(y, m, 1 - lead + i), v = iso(d), out = d.getMonth() !== m, cl = ['rng__d'];
      if (out) cl.push('is-out');
      if (sel.from && sel.to && v > sel.from && v < sel.to) cl.push('is-in');
      if (v === sel.from || v === sel.to) {
        cl.push('is-sel');
        if (sel.from && sel.to && sel.from !== sel.to) cl.push('is-edge', v === sel.from ? 'is-edge--s' : 'is-edge--e');
      }
      cells += '<button type="button" class="' + cl.join(' ') + '" data-day="' + v + '">' + d.getDate() + '</button>';
    }
    return '<div class="rng__cal" data-cal="' + first + '">' + head + wd + '<div class="rng__grid">' + cells + '</div></div>';
  }
  function wireRanges(root) {
    (root || document).querySelectorAll('.rng').forEach(function (el) {
      if (el.dataset.wiredRng) return;
      el.dataset.wiredRng = '1';
      var ph = el.dataset.placeholder || 'Select date range';
      var committed = { from: '', to: '' }, draft = { from: '', to: '' };
      var view = new Date(); view.setDate(1);
      var pop = document.createElement('div');
      pop.className = 'rng__pop' + (el.dataset.align === 'right' ? ' rng__pop--right' : '');
      el.appendChild(pop);
      var ctl = el.querySelector('.rng__ctl'), val = el.querySelector('.rng__val');

      function paintLabel() {
        var has = committed.from && committed.to;
        val.textContent = has ? dmy(committed.from) + '  \u2013  ' + dmy(committed.to) : ph;
        val.classList.toggle('is-empty', !has);
      }
      function paintPop() {
        var y = view.getFullYear(), m = view.getMonth(), n = new Date(y, m + 1, 1);
        pop.innerHTML = '<div class="rng__months">' + calHtml(y, m, 0, draft) + calHtml(n.getFullYear(), n.getMonth(), 1, draft) + '</div>' +
          '<div class="rng__foot"><div class="rng__boxes">' +
          '<span class="rng__box' + (draft.from ? '' : ' is-empty') + '">' + (draft.from ? dmy(draft.from) : '\u2013') + '</span>' +
          '<span class="rng__sep">To</span>' +
          '<span class="rng__box' + (draft.to ? '' : ' is-empty') + '">' + (draft.to ? dmy(draft.to) : '\u2013') + '</span>' +
          '</div><div class="rng__acts">' +
          (committed.from ? '<button type="button" class="rng__clear" data-rng-clear>Clear</button>' : '') +
          '<button type="button" class="btn btn--secondary" data-rng-cancel>Cancel</button>' +
          '<button type="button" class="btn btn--primary" data-rng-set' + (draft.from ? '' : ' disabled') + '>Set Date</button>' +
          '</div></div>';
      }
      function placeRng() {
        if (!el.closest('.ovl__body')) return;
        var r = ctl.getBoundingClientRect();
        pop.style.position = 'fixed'; pop.style.zIndex = '2600';
        pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = r.left + 'px'; pop.style.right = 'auto';
        if (r.left + pop.offsetWidth > window.innerWidth - 16) pop.style.left = Math.max(16, window.innerWidth - 16 - pop.offsetWidth) + 'px';
        if (r.bottom + 6 + pop.offsetHeight > window.innerHeight - 16) pop.style.top = Math.max(16, r.top - 6 - pop.offsetHeight) + 'px';
      }
      function open() {
        draft = { from: committed.from, to: committed.to };
        if (committed.from) { var p = committed.from.split('-'); view = new Date(+p[0], +p[1] - 1, 1); }
        el.classList.add('is-open'); paintPop(); placeRng();
      }
      function close() { el.classList.remove('is-open'); pop.style.cssText = ''; }
      function fire() { el.dispatchEvent(new CustomEvent('rangechange', { detail: { from: committed.from, to: committed.to } })); }

      ctl.addEventListener('click', function (e) { e.stopPropagation(); if (el.classList.contains('is-open')) close(); else { document.querySelectorAll('.rng.is-open').forEach(function (o) { o.classList.remove('is-open'); }); open(); } });
      pop.addEventListener('click', function (e) {
        e.stopPropagation();
        var sh = e.target.closest('[data-shift]');
        if (sh) { view.setMonth(view.getMonth() + (+sh.getAttribute('data-shift'))); paintPop(); return; }
        var d = e.target.closest('[data-day]');
        if (d) {
          var v = d.getAttribute('data-day');
          if (!draft.from || draft.to) { draft.from = v; draft.to = ''; }
          else if (v < draft.from) { draft.to = draft.from; draft.from = v; }
          else { draft.to = v; }
          paintPop(); placeRng(); return;
        }
        if (e.target.closest('[data-rng-cancel]')) { close(); return; }
        if (e.target.closest('[data-rng-clear]')) { committed = { from: '', to: '' }; paintLabel(); close(); fire(); return; }
        if (e.target.closest('[data-rng-set]')) {
          committed = { from: draft.from, to: draft.to || draft.from };
          paintLabel(); close(); fire();
        }
      });
      document.addEventListener('click', function () { close(); });
      paintLabel();
    });
  }

  // ---- Filter-in-a-modal: one visible "Filter" button per grid ----------------
  // Markup contract: <button data-filter-open="modalId">Filter</button>
  //                  <span data-filter-sum="modalId"></span>   (auto summary)
  // The filter controls keep their own ids inside the modal, so page wiring is untouched.
  function paintFilterSums() {
    document.querySelectorAll('[data-filter-sum]').forEach(function (sp) {
      var m = document.getElementById(sp.getAttribute('data-filter-sum'));
      if (!m) return;
      var parts = [];
      m.querySelectorAll('.ctl--select').forEach(function (c) {
        var opts = c.querySelectorAll('.dropdown__opt'); if (!opts.length) return;
        if (c.hasAttribute('data-nosum')) return;   // sort order and the like are not filters
        var shown = (c.querySelector('.ctl__value') || {}).textContent;
        shown = shown ? shown.trim() : '';
        // Trust what the control renders (a page's own Reset may not maintain .is-sel).
        var opt = null;
        opts.forEach(function (o) { if (!opt && o.textContent.trim() === shown) opt = o; });
        opt = opt || c.querySelector('.dropdown__opt.is-sel');
        if (!opt) return;
        // "Active" = the option carries a value; an empty data-val is the all/any default.
        var val = opt.getAttribute('data-val');
        var active = val === null ? opt !== opts[0] : val !== '';
        if (active) parts.push(opt.textContent.trim());
      });
      m.querySelectorAll('.ctl--date input, .ctl > input[type="text"], .ctl > input[type="number"]').forEach(function (i) {
        if (i.value.trim()) parts.push(i.value.trim());
      });
      // Date-range controls report their committed label (empty = no range set).
      m.querySelectorAll('.rng').forEach(function (r) {
        var v = r.querySelector('.rng__val');
        if (v && !v.classList.contains('is-empty') && v.textContent.trim()) parts.push(v.textContent.trim());
      });
      // Checkbox criteria (multi-value enums, boolean flags) summarise by their label.
      m.querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
        if (c.hasAttribute('data-nosum')) return;   // "select all" and the like are not criteria
        var lb = c.closest('label'), t = lb ? (lb.querySelector('.fchk__lbl') || lb).textContent.trim() : '';
        if (t) parts.push(t);
      });
      sp.textContent = parts.length ? parts.join(' \u00b7 ') : 'No filter applied';
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter-open]');
    if (b) openModal(b.getAttribute('data-filter-open'));
  });
  // Reset every criterion inside a filter modal back to its default, firing the same
  // events a manual change would so the page's own state handlers stay in step.
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter-reset]'); if (!b) return;
    var m = document.getElementById(b.getAttribute('data-filter-reset')); if (!m) return;
    m.querySelectorAll('.ctl--select').forEach(function (c) {
      if (c.hasAttribute('data-nosum')) return;
      var first = c.querySelector('.dropdown__opt'); if (!first) return;
      c.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
      first.classList.add('is-sel');
      var v = c.querySelector('.ctl__value');
      if (v) { v.textContent = first.textContent.trim(); v.classList.remove('is-empty'); }
      c.dispatchEvent(new CustomEvent('select', { bubbles: true, detail: { value: first.getAttribute('data-val') || '', label: first.textContent.trim() } }));
    });
    m.querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
      c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true }));
    });
    m.querySelectorAll('.ctl--date input, .ctl > input[type="text"], .ctl > input[type="number"]').forEach(function (i) {
      if (!i.value) return; i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true }));
    });
    m.querySelectorAll('.rng').forEach(function (r) {
      var v = r.querySelector('.rng__val');
      if (!v || v.classList.contains('is-empty')) return;
      var ctl = r.querySelector('.rng__ctl'); if (!ctl) return;
      if (!r.classList.contains('is-open')) ctl.click();
      var clear = r.querySelector('[data-rng-clear]');
      if (clear) clear.click(); else ctl.click();
    });
    setTimeout(paintFilterSums, 0);
  });
  ['select', 'datechange', 'rangechange', 'input'].forEach(function (ev) {
    document.addEventListener(ev, paintFilterSums, true);
  });
  // A page's own Reset/Apply button inside the modal repaints too (after its handler ran).
  document.addEventListener('click', function (e) {
    if (e.target.closest('.ovl__panel')) setTimeout(paintFilterSums, 0);
  });
  document.addEventListener('DOMContentLoaded', paintFilterSums);

  window.Flow = { wireRanges: wireRanges, paintFilterSums: paintFilterSums, applyRoleGate: applyRoleGate, toast: toast, openModal: openModal, closeModal: closeModal, wireSelects: wireSelects, wireSegments: wireSegments, wireTabs: wireTabs, setupDates: setupDates, setDate: setDate, fmtDate: fmtDate, rowMenu: rowMenu, pager: pager };
})();
