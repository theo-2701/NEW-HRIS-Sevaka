// Add Candidate — repeatable Education & Work Experience entries.
// Loads AFTER flow-common.js.
(function () {
  'use strict';

  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function monthYear(iso) { if (!iso) return ''; var d = new Date(iso); return isNaN(d) ? '' : MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function spanChip(fromIso, toIso, current) {
    if (!fromIso) return '';
    var a = new Date(fromIso), b = current || !toIso ? new Date() : new Date(toIso);
    if (isNaN(a) || isNaN(b)) return '';
    var m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (m < 1) return '1 MO';
    var y = Math.floor(m / 12), r = m % 12;
    return (y ? y + ' YR' + (y > 1 ? 'S' : '') + (r ? ' ' : '') : '') + (r || !y ? r + ' MOS' : '');
  }

  var CFG = {
    formal: { modal: 'mAcFormal', list: 'acFormalList', empty: 'acFormalEmpty',
      title: function (d) { return d.institution; },
      sub: function (d) { return [d.degree, d.field].filter(Boolean).join(', '); },
      when: function (d) { return [d.startYear, d.endYear].filter(Boolean).join(' - '); },
      chip: function (d) { return d.grade ? { text: 'Grade: ' + d.grade } : null; },
      req: ['institution', 'degree', 'startYear', 'endYear'] },
    informal: { modal: 'mAcInformal', list: 'acInformalList', empty: 'acInformalEmpty',
      title: function (d) { return d.name; },
      sub: function (d) { return d.org; },
      when: function (d) { return d.issueDate ? 'Issued ' + d.issueDate + (d.expDate ? ' - ' + d.expDate : '') : ''; },
      chip: function (d) { return d.duration ? { text: d.duration + ' ' + String(d.durationUnit || 'Day(s)').replace(/\(s\)/, 's'), icon: 'clock' } : null; },
      req: ['name', 'org', 'issueDate', 'expDate'] },
    work: { modal: 'mAcWork', list: 'acWorkList', empty: 'acWorkEmpty',
      title: function (d) { return d.position; },
      sub: function (d) { return d.company; },
      when: function (d) { return [monthYear(d.startDateIso), d.current ? 'Present' : monthYear(d.endDateIso)].filter(Boolean).join(' - '); },
      chip: function (d) { var t = spanChip(d.startDateIso, d.endDateIso, d.current); return t ? { text: t, icon: 'clock' } : null; },
      req: ['position', 'company', 'startDate'] }
  };

  var store = { formal: [], informal: [], work: [] };
  var editing = null; // { kind, id }
  var seq = 0;

  // --- field helpers (work on the [data-form] block inside each modal) ---
  function form(kind) { return document.querySelector('#' + CFG[kind].modal + ' [data-form]'); }
  function fields(kind) { return form(kind).querySelectorAll('[data-f]'); }

  function readForm(kind) {
    var out = {};
    fields(kind).forEach(function (el) {
      var k = el.getAttribute('data-f');
      if (el.classList.contains('ctl--select')) {
        var v = el.querySelector('.ctl__value');
        out[k] = (v && v.style.color !== 'var(--fg-4)') ? v.textContent.trim() : (el.classList.contains('ac-dur__unit') ? v.textContent.trim() : '');
      } else if (el.type === 'checkbox') out[k] = el.checked;
      else { out[k] = el.value.trim(); if (el.dataset.iso) out[k + 'Iso'] = el.dataset.iso; }
    });
    return out;
  }

  function writeForm(kind, d) {
    fields(kind).forEach(function (el) {
      var k = el.getAttribute('data-f'), val = d ? d[k] : '';
      if (el.classList.contains('ctl--select')) {
        var v = el.querySelector('.ctl__value');
        var ph = el.getAttribute('data-ph') || v.textContent;
        if (!el.getAttribute('data-ph')) el.setAttribute('data-ph', ph);
        el.querySelectorAll('.dropdown__opt').forEach(function (o) { o.classList.remove('is-sel'); });
        if (val) {
          v.textContent = val; v.style.color = 'var(--fg-1)';
          el.querySelectorAll('.dropdown__opt').forEach(function (o) { if (o.textContent.trim() === val) o.classList.add('is-sel'); });
        } else if (el.classList.contains('ac-dur__unit')) {
          v.textContent = 'Day(s)'; v.style.color = 'var(--fg-2)';
        } else {
          v.textContent = el.getAttribute('data-ph'); v.style.color = 'var(--fg-4)';
        }
      } else if (el.type === 'checkbox') el.checked = !!val;
      else el.value = val || '';
    });
    var end = form(kind).querySelector('[data-f=endDate]');
    if (end) toggleEnd(kind);
  }

  function toggleEnd(kind) {
    var f = form(kind), cur = f.querySelector('[data-f=current]'), end = f.querySelector('[data-f=endDate]');
    if (!cur || !end) return;
    var box = end.closest('.cj-fld');
    end.disabled = cur.checked;
    if (cur.checked) { end.value = ''; }
    box.style.opacity = cur.checked ? '.55' : '';
    box.style.pointerEvents = cur.checked ? 'none' : '';
  }

  // --- list rendering ---
  function render(kind) {
    var c = CFG[kind], host = document.getElementById(c.list), empty = document.getElementById(c.empty);
    host.innerHTML = store[kind].map(function (d) {
      var chip = c.chip(d), sub = c.sub(d), when = c.when(d);
      return '<div class="ac-item" data-id="' + d._id + '"><div class="ac-item__main">' +
        '<span class="ac-item__title">' + esc(c.title(d)) + '</span>' +
        (sub ? '<span class="ac-item__sub">' + esc(sub) + '</span>' : '') +
        (when ? '<span class="ac-item__when">' + esc(when) + '</span>' : '') +
        (chip ? '<span class="ac-chip">' + esc(chip.text) + (chip.icon ? '<i data-lucide="' + chip.icon + '"></i>' : '') + '</span>' : '') +
        '</div>' + kebab(kind) + '</div>';
    }).join('');
    empty.hidden = store[kind].length > 0;
    if (window.lucide) window.lucide.createIcons();
  }
  function kebab(kind) {
    return '<div class="rowmenu"><button type="button" class="rowmenu__trigger" aria-label="Entry actions"><i data-lucide="ellipsis-vertical"></i></button>' +
      '<div class="rowmenu__pop">' +
      '<button type="button" class="rowmenu__item" data-edit="' + kind + '"><i data-lucide="pencil"></i>Edit</button>' +
      '<button type="button" class="rowmenu__item rowmenu__item--danger" data-del="' + kind + '"><i data-lucide="trash-2"></i>Delete</button>' +
      '</div></div>';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]; }); }

  // --- year dropdowns ---
  function fillYears() {
    var now = new Date().getFullYear(), html = '';
    for (var y = now + 6; y >= 1975; y--) html += '<button class="dropdown__opt" type="button">' + y + '</button>';
    document.querySelectorAll('[data-years] .dropdown').forEach(function (d) { d.innerHTML = html; });
  }

  function open(kind, id) {
    var m = document.getElementById(CFG[kind].modal);
    var t = m.querySelector('.ovl__title');
    editing = id ? { kind: kind, id: id } : null;
    t.textContent = t.getAttribute(id ? 'data-title-edit' : 'data-title-add');
    writeForm(kind, id ? store[kind].filter(function (r) { return r._id === id; })[0] : null);
    window.Flow.openModal(CFG[kind].modal);
  }

  fillYears(); // before flow-common's DOMContentLoaded wireSelects() stamps the year selects

  document.addEventListener('DOMContentLoaded', function () {
    window.Flow.wireSelects();
    Object.keys(CFG).forEach(function (k) { render(k); });

    document.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add]');
      if (add) { open(add.getAttribute('data-add')); return; }

      var ed = e.target.closest('[data-edit]');
      if (ed && ed.closest('.ac-item')) { open(ed.getAttribute('data-edit'), ed.closest('.ac-item').getAttribute('data-id')); return; }

      var del = e.target.closest('[data-del]');
      if (del) {
        var kind = del.getAttribute('data-del'), id = del.closest('.ac-item').getAttribute('data-id');
        store[kind] = store[kind].filter(function (r) { return r._id !== id; });
        render(kind); window.Flow.toast('Entry removed.', 'info');
        return;
      }

      var sv = e.target.closest('[data-save]');
      if (sv) {
        var k = sv.getAttribute('data-save');
        if (!CFG[k]) return;
        var d = readForm(k);
        var missing = CFG[k].req.filter(function (f) { return !d[f]; });
        if (k === 'work' && !d.current && !d.endDate) missing.push('endDate');
        if (missing.length) { window.Flow.toast('Please complete every required field.', 'error'); return; }
        if (editing && editing.kind === k) {
          store[k] = store[k].map(function (r) { return r._id === editing.id ? Object.assign(d, { _id: r._id }) : r; });
        } else {
          d._id = 'e' + (++seq); store[k].push(d);
        }
        editing = null;
        render(k);
        window.Flow.closeModal(CFG[k].modal);
        window.Flow.toast('Entry saved.', 'success');
        return;
      }

      if (e.target.closest('#acGuide')) { window.Flow.toast('Guidebook opens here.', 'info'); return; }

      if (e.target.closest('#acSave')) {
        var again = document.getElementById('acAnother');
        window.Flow.toast(again && again.checked ? 'Candidate saved. Form cleared for the next candidate.' : 'Candidate saved to this job listing.', 'success');
      }
    });

    // residential address mirrors the citizen ID address
    var same = document.getElementById('acSameAddr');
    if (same) same.addEventListener('change', function () {
      var src = document.getElementById('acCitizenAddr'), dst = document.getElementById('acResAddr');
      dst.disabled = same.checked;
      dst.closest('.ctl').style.opacity = same.checked ? '.6' : '';
      if (same.checked) dst.value = src.value;
    });

    // portfolio: file upload vs online link
    document.querySelectorAll('input[name=acPortfolio]').forEach(function (r) {
      r.addEventListener('change', function () {
        var link = r.value === 'link';
        document.getElementById('acPortFile').hidden = link;
        document.getElementById('acPortLink').hidden = !link;
      });
    });

    var cur = document.querySelector('[data-f=current]');
    if (cur) cur.addEventListener('change', function () { toggleEnd('work'); });

    // file name reflection
    document.querySelectorAll('.file-ctl input[type=file]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var n = inp.closest('.file-ctl').querySelector('.file-ctl__name');
        if (inp.files && inp.files[0]) { n.textContent = inp.files[0].name; n.classList.add('has-file'); }
      });
    });
  });
})();
