// unlock-account.js — "Buka Kunci Akun" modal (Admin unlock of locked accounts)
// Positive-flow demo data: accounts locked after failed_count >= 5.
(function () {

  var LOCKED = [
    { id: 'emp-8842', name: 'Ahmad Direktur',    email: 'ahmad.d@ptdika.co.id',   ident: 'ahmad.d',            type: 'USERNAME',     fails: 6, remain: '11 mnt',  color: '#0284c7' },
    { id: 'emp-3190', name: 'Siti Rahmawati',     email: 'siti.r@ptdika.co.id',    ident: 'siti.r@ptdika.co.id', type: 'EMAIL',       fails: 5, remain: '4 mnt',   color: '#0e9488' }
  ];

  var overlay   = document.getElementById('unlockOverlay');
  if (!overlay) return;
  var openBtn   = document.getElementById('openUnlockModal');
  var closeBtn  = document.getElementById('unlockClose');
  var tbody     = document.getElementById('unlockTbody');
  var emptyEl   = document.getElementById('unlockEmpty');
  var searchEl  = document.getElementById('unlockSearch');
  var successEl = document.getElementById('unlockSuccess');
  var successTx = document.getElementById('unlockSuccessText');
  var listCount = document.getElementById('uaListCount');
  var cardCount = document.getElementById('lockedCount');
  var cardPill  = document.getElementById('lockedCountPill');

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function initials(n) { return n.split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase(); }

  function rowHTML(a) {
    return (
      '<tr data-id="' + a.id + '">' +
        '<td>' +
          '<div class="ua-name">' +
            '<span class="ua-avatar" style="background:' + a.color + '">' + initials(a.name) + '</span>' +
            '<span class="ua-name__text">' +
              '<span class="ua-name__full">' + esc(a.name) + '</span>' +
              '<span class="ua-name__email">' + esc(a.email) + '</span>' +
            '</span>' +
          '</div>' +
        '</td>' +
        '<td>' +
          '<div class="ua-id">' +
            '<span class="ua-id__value">' + esc(a.ident) + '</span>' +
            '<span class="ua-id__type">' + a.type + '</span>' +
          '</div>' +
        '</td>' +
        '<td class="ua-num"><span class="ua-fail">' + a.fails + '</span></td>' +
        '<td><span class="ua-lock"><i data-lucide="clock"></i>' + a.remain + '</span></td>' +
        '<td style="text-align:right">' +
          '<button class="ua-unlock-btn" type="button" data-unlock="' + a.id + '"><i data-lucide="key-round"></i>Buka Kunci</button>' +
        '</td>' +
      '</tr>'
    );
  }

  function visibleList() {
    var q = (searchEl.value || '').trim().toLowerCase();
    return LOCKED.filter(function (a) {
      if (!q) return true;
      return (a.name + ' ' + a.email + ' ' + a.ident).toLowerCase().indexOf(q) !== -1;
    });
  }

  function renderCardBadge() {
    if (cardCount) cardCount.textContent = LOCKED.length;
    if (cardPill) cardPill.style.display = LOCKED.length ? '' : 'none';
  }

  function render() {
    var list = visibleList();
    tbody.innerHTML = list.map(rowHTML).join('');
    listCount.textContent = LOCKED.length;
    emptyEl.hidden = LOCKED.length !== 0;
    document.querySelector('.ua-table').style.display = list.length ? '' : (LOCKED.length ? '' : 'none');
    if (window.lucide) window.lucide.createIcons();
    bindRows();
  }

  function bindRows() {
    tbody.querySelectorAll('[data-unlock]').forEach(function (btn) {
      btn.addEventListener('click', function () { doUnlock(btn.getAttribute('data-unlock')); });
    });
  }

  function doUnlock(id) {
    var acct = LOCKED.filter(function (a) { return a.id === id; })[0];
    if (!acct) return;
    var row = tbody.querySelector('tr[data-id="' + id + '"]');
    // Simulate POST /api/v1/auth/unlock-account → failed_count=0, locked_until=null
    if (row) {
      row.classList.add('is-removing');
      setTimeout(finish, 220);
    } else { finish(); }
    function finish() {
      LOCKED = LOCKED.filter(function (a) { return a.id !== id; });
      successTx.textContent = 'Akun "' + acct.name + '" berhasil dibuka. User dapat login kembali.';
      successEl.hidden = false;
      renderCardBadge();
      render();
      clearTimeout(doUnlock._t);
      doUnlock._t = setTimeout(function () { successEl.hidden = true; }, 4500);
    }
  }

  function open() {
    successEl.hidden = true;
    searchEl.value = '';
    render();
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(function () { searchEl.focus(); }, 60);
  }
  function close() {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
  }

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && overlay.classList.contains('is-open')) close(); });
  searchEl.addEventListener('input', render);

  renderCardBadge();
})();
