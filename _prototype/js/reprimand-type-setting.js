// reprimand-type-setting.js — RP-TYPE-SETTING page (CRU SP categories + dual-mode policy · GAP deferred)
(function () {
  'use strict';
  var F = window.Flow;

  // frozen server snapshots per category (mirror of reprimand.js CAT seed)
  var CAT = {
    VERBAL: { label: 'Verbal warning', point: 0, validity: 3, level: 0, terminal: false },
    SP1:    { label: 'SP1', point: 1, validity: 6, level: 1, terminal: false },
    SP2:    { label: 'SP2', point: 2, validity: 6, level: 2, terminal: false },
    SP3:    { label: 'SP3', point: 3, validity: 6, level: 3, terminal: true }
  };
  var policyMode = 'DIRECT';
  var savedMode = 'DIRECT';
  function applyMode(mode) {
    policyMode = mode;
    var r = document.querySelector('#policyMode input[value="' + mode + '"]');
    if (r) r.checked = true;
    var acc = mode === 'ACCUMULATIVE';
    document.getElementById('thresholdBlock').classList.toggle('is-hidden', !acc);
    document.getElementById('policyHint').textContent = acc
      ? 'Accumulative — standing is derived by summing active demerit points against the thresholds below.'
      : 'Direct — the standing equals the highest active SP level; each category maps straight to a level. No extra configuration needed.';
  }

  function renderCatTable() {
    var order = Object.keys(CAT).sort(function (a, b) { return CAT[a].level - CAT[b].level; });
    document.getElementById('catBody').innerHTML = order.map(function (code) {
      var c = CAT[code];
      return '<tr data-code="' + code + '">' +
        '<td class="cell-strong">' + code + '</td>' +
        '<td class="ta-c">' + c.point + '</td>' +
        '<td class="ta-c">' + c.validity + '</td>' +
        '<td class="ta-c">' + c.level + '</td>' +
        '<td class="ta-c">' + (c.terminal ? '<span class="sb sb--red"><span class="sb__dot"></span>Terminal</span>' : '<span class="cell-dim">—</span>') + '</td>' +
        '<td class="ta-r">' + F.rowMenu([
          { label: 'Edit', icon: 'pencil', attr: 'data-catedit="' + code + '"' },
          { label: 'Remove', icon: 'trash-2', attr: 'data-catdel="' + code + '"', danger: true }
        ]) + '</td>' +
      '</tr>';
    }).join('');
    document.querySelectorAll('#catBody [data-catedit]').forEach(function (b) {
      b.addEventListener('click', function () { openCatEditor(b.dataset.catedit); });
    });
    if (window.lucide) window.lucide.createIcons();
    document.querySelectorAll('#catBody [data-catdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var code = b.dataset.catdel;
        if (Object.keys(CAT).length <= 1) { F.toast('At least one category must remain.', 'warn'); return; }
        delete CAT[code]; renderCatTable();
        F.toast(code + ' removed (soft — no hard-delete on the server).', 'warn');
      });
    });
  }

  // ----- category editor modal (create / update) -----
  var editingCode = null, catTerminal = 0;
  var codeInput = document.getElementById('catCode');
  var saveBtn = document.getElementById('catSave');
  function catSync() {
    var code = codeInput.value.trim().toUpperCase();
    var valid = /^[A-Z0-9_]+$/.test(code);
    var dupe = code && code !== editingCode && CAT[code];
    var hint = document.getElementById('catCodeHint');
    if (dupe) { hint.textContent = 'Code “' + code + '” already exists.'; hint.style.color = 'var(--color-error-600)'; }
    else { hint.textContent = 'Uppercase letters, digits and underscore only. Must be unique.'; hint.style.color = ''; }
    saveBtn.disabled = !(valid && !dupe);
  }
  codeInput.addEventListener('input', catSync);
  document.getElementById('catTerminal').querySelectorAll('input[name="catTerminal"]').forEach(function (r) {
    r.addEventListener('change', function () { catTerminal = +r.value; });
  });
  function setTerminalSeg(v) {
    catTerminal = v;
    var r = document.querySelector('#catTerminal input[value="' + v + '"]');
    if (r) r.checked = true;
  }
  function openCatEditor(code) {
    editingCode = code || null;
    document.getElementById('catEditTitle').textContent = code ? 'Edit ' + code : 'Add category';
    if (code) {
      var c = CAT[code];
      codeInput.value = code; codeInput.disabled = true;
      document.getElementById('catPoint').value = c.point;
      document.getElementById('catValidity').value = c.validity;
      document.getElementById('catLevel').value = c.level;
      setTerminalSeg(c.terminal ? 1 : 0);
    } else {
      codeInput.value = ''; codeInput.disabled = false;
      document.getElementById('catPoint').value = 0;
      document.getElementById('catValidity').value = 6;
      document.getElementById('catLevel').value = Object.keys(CAT).length;
      setTerminalSeg(0);
    }
    catSync();
    F.openModal('catEdit');
  }
  document.getElementById('catAddBtn').addEventListener('click', function () { openCatEditor(null); });
  saveBtn.addEventListener('click', function () {
    var code = editingCode || codeInput.value.trim().toUpperCase();
    CAT[code] = {
      label: code,
      point: +document.getElementById('catPoint').value || 0,
      validity: +document.getElementById('catValidity').value || 0,
      level: +document.getElementById('catLevel').value || 0,
      terminal: catTerminal === 1
    };
    var was = editingCode;
    F.closeModal('catEdit'); renderCatTable();
    F.toast(was ? code + ' updated.' : code + ' created.', 'ok');
  });
  document.getElementById('policyMode').querySelectorAll('input[name="policyMode"]').forEach(function (r) {
    r.addEventListener('change', function () { applyMode(r.value); });
  });
  document.getElementById('rpTypeReset').addEventListener('click', function () {
    applyMode(savedMode);
    F.toast('Policy reset to the last saved value (' + savedMode.toLowerCase() + ').', 'info');
  });
  document.getElementById('rpTypeSave').addEventListener('click', function () {
    savedMode = policyMode;
    F.toast('Type settings saved (' + policyMode.toLowerCase() + ' policy). Standing recomputes from snapshots on next read.', 'ok');
  });

  renderCatTable();
  if (window.lucide) window.lucide.createIcons();
})();
