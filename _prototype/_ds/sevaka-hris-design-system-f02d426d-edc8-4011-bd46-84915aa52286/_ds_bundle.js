/* @ds-bundle: {"format":3,"namespace":"SEVAKAHRISDesignSystem_f02d42","components":[],"sourceHashes":{"ui_kits/app/kit.js":"e2c85d29bf12"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SEVAKAHRISDesignSystem_f02d42 = window.SEVAKAHRISDesignSystem_f02d42 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/app/kit.js
try { (() => {
// SEVAKA HRIS — UI kit prototype script

(function () {
  // ---------- product picker ----------
  const pickerEl = document.getElementById('productPicker');
  const pickerBtn = document.getElementById('productPickerBtn');
  const productNow = document.getElementById('productNow');
  function closePicker() {
    pickerEl && pickerEl.classList.remove('is-open');
  }
  if (pickerBtn) {
    pickerBtn.addEventListener('click', e => {
      e.stopPropagation();
      pickerEl.classList.toggle('is-open');
    });
    document.addEventListener('click', e => {
      if (!pickerEl.contains(e.target)) closePicker();
    });
    pickerEl.querySelectorAll('.product-opt:not([disabled])').forEach(opt => {
      opt.addEventListener('click', () => {
        pickerEl.querySelectorAll('.product-opt').forEach(o => o.classList.remove('is-on'));
        opt.classList.add('is-on');
        productNow.textContent = opt.dataset.product;
        closePicker();
      });
    });
  }

  // ---------- screen switcher ----------
  const VALID = ['signin', 'dashboard', 'employee', 'profile', 'time'];
  function goTo(name) {
    if (!VALID.includes(name)) name = 'dashboard';
    document.body.dataset.screen = name;
    document.querySelectorAll('[data-screen]').forEach(el => {
      if (el === document.body) return;
      const list = el.dataset.screen.split(',');
      const isActive = list.includes(name);
      // top-level wrapper section
      if (el.matches('section[data-screen]')) {
        el.classList.toggle('is-active', isActive);
      }
      // inner pages inside the app shell
      else if (el.matches('.app__scroll')) {
        el.style.display = isActive ? '' : 'none';
      }
    });

    // sidebar selected
    document.querySelectorAll('.sidebar__item[data-go]').forEach(b => {
      b.classList.toggle('is-on', b.dataset.go === name);
    });
    // topnav selected
    document.querySelectorAll('.topnav-link').forEach(a => {
      a.classList.toggle('is-on', a.dataset.go === name);
    });
    window.scrollTo(0, 0);
  }
  window.goTo = goTo;

  // wire all [data-go] elements
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-go]');
    if (t) {
      e.preventDefault();
      goTo(t.dataset.go);
    }
  });

  // ---------- employee table seed ----------
  const employees = [{
    name: 'Tessa Hartanto',
    id: 'EMP-2041',
    email: 'tessa.h@perusahaan.id',
    role: 'Senior Designer',
    dept: 'People Operations',
    status: 'ok',
    tag: 'Aktif',
    date: '12 Jan 2023',
    clr: '#87ceeb',
    fg: 'white'
  }, {
    name: 'Reza Maulana',
    id: 'EMP-1108',
    email: 'reza.m@perusahaan.id',
    role: 'Engineering Manager',
    dept: 'Engineering',
    status: 'warn',
    tag: 'Cuti',
    date: '04 Mar 2022',
    clr: '#fde68a',
    fg: '#72673e'
  }, {
    name: 'Anita Pranata',
    id: 'EMP-0892',
    email: 'anita.p@perusahaan.id',
    role: 'Finance Analyst',
    dept: 'Finance',
    status: 'ok',
    tag: 'Aktif',
    date: '20 Aug 2021',
    clr: '#34d399',
    fg: 'white'
  }, {
    name: 'Dimas Kurnia',
    id: 'EMP-3120',
    email: 'dimas.k@perusahaan.id',
    role: 'Account Executive',
    dept: 'Sales',
    status: 'info',
    tag: 'Probation',
    date: '02 May 2026',
    clr: '#0284c7',
    fg: 'white'
  }, {
    name: 'Surya Setiawan',
    id: 'EMP-1762',
    email: 'surya.s@perusahaan.id',
    role: 'Mobile Engineer',
    dept: 'Engineering',
    status: 'ok',
    tag: 'Aktif',
    date: '14 Jun 2022',
    clr: '#ef4444',
    fg: 'white'
  }, {
    name: 'Mawar Lestari',
    id: 'EMP-0455',
    email: 'mawar.l@perusahaan.id',
    role: 'Recruiter',
    dept: 'People Operations',
    status: 'ok',
    tag: 'Aktif',
    date: '08 Feb 2020',
    clr: '#7ab9d4',
    fg: 'white'
  }, {
    name: 'Bayu Pratama',
    id: 'EMP-2298',
    email: 'bayu.p@perusahaan.id',
    role: 'Product Manager',
    dept: 'Product',
    status: 'warn',
    tag: 'Cuti',
    date: '17 Sep 2023',
    clr: '#f59e0b',
    fg: 'white'
  }, {
    name: 'Citra Wibowo',
    id: 'EMP-3015',
    email: 'citra.w@perusahaan.id',
    role: 'Content Writer',
    dept: 'Marketing',
    status: 'err',
    tag: 'Resign',
    date: '22 Jan 2024',
    clr: '#94a3b8',
    fg: 'white'
  }];
  const tbody = document.getElementById('empTbody');
  if (tbody) {
    tbody.innerHTML = employees.map(e => `
      <tr>
        <td><label class="checkbox" style="margin:0"><input type="checkbox"><span class="checkbox__box"></span></label></td>
        <td>
          <div class="table-row-id" style="cursor:pointer" data-go="profile">
            <div class="avatar avatar--sm" style="background:${e.clr};color:${e.fg}">${initials(e.name)}</div>
            <div class="table-row-id__meta">
              <span class="table-row-id__name">${e.name}</span>
              <span class="table-row-id__sub">${e.id} · ${e.email}</span>
            </div>
          </div>
        </td>
        <td>${e.role}</td>
        <td class="dim">${e.dept}</td>
        <td><span class="chip chip--${e.status}">${e.tag}</span></td>
        <td class="dim">${e.date}</td>
        <td><button class="icon-btn" style="width:28px;height:28px;background:transparent;box-shadow:none"><i data-lucide="more-horizontal"></i></button></td>
      </tr>
    `).join('');
  }
  function initials(n) {
    return n.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
  }

  // ---------- calendar seed ----------
  const cal = document.getElementById('cal');
  if (cal) {
    // May 2026 starts on a Friday. Mon-leading grid.
    // Days before May 1: Apr 27, 28, 29, 30 (Mon-Thu)
    const cells = [];
    const beforeMay = [27, 28, 29, 30];
    beforeMay.forEach(d => cells.push({
      day: d,
      muted: true
    }));
    for (let d = 1; d <= 31; d++) cells.push({
      day: d
    });
    // 31 May is Sunday → no after cells
    const today = 21;
    const events = {
      4: ['leave'],
      5: ['leave'],
      11: ['pending'],
      13: ['leave', 'pending'],
      19: ['holiday'],
      22: ['holiday'],
      28: ['leave']
    };
    cal.innerHTML = cells.map(c => {
      if (c.muted) return `<div class="calendar__day calendar__day--muted">${c.day}</div>`;
      const isToday = c.day === today;
      const ev = events[c.day] || [];
      const dots = ev.map(t => {
        if (t === 'pending') return '<span class="dot amber"></span>';
        if (t === 'holiday') return '<span class="dot green"></span>';
        return '<span class="dot"></span>';
      }).join('');
      return `<div class="calendar__day${isToday ? ' calendar__day--today' : ''}">
                <span>${c.day}</span>
                <div class="dots">${dots}</div>
              </div>`;
    }).join('');
  }

  // ---------- init ----------
  function init() {
    // boot screen via URL hash
    const fromHash = (location.hash || '').replace('#', '');
    goTo(VALID.includes(fromHash) ? fromHash : 'dashboard');

    // re-render icons after DOM mutations
    if (window.lucide) lucide.createIcons({
      attrs: {
        'stroke-width': 1.75
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/kit.js", error: String((e && e.message) || e) }); }

})();
