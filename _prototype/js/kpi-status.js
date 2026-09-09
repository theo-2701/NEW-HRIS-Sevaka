/* SEVAKA — KPI status sync.
   Count-driven status tiles (danger / warning / success) only "light up"
   when their value is > 0. At 0 they fall back to a calm neutral white tile,
   so an empty state never cries wolf. Info tiles are labels (e.g. "2026"),
   never count-driven, so they keep their colour regardless.
   The tile always stays in the row — "0 Overdue" is a reassurance, not nothing. */
(function () {
  'use strict';
  var COUNT_VARIANTS = ['kpi__tile--danger', 'kpi__tile--warning', 'kpi__tile--success'];

  function intOf(el) {
    if (!el) return NaN;
    var m = (el.textContent || '').replace(/[^\d-]/g, '');
    return m === '' ? NaN : parseInt(m, 10);
  }

  function syncTile(tile) {
    var base = tile.dataset.kpiVariant;
    if (base === undefined) {
      base = COUNT_VARIANTS.filter(function (c) { return tile.classList.contains(c); })[0] || '';
      tile.dataset.kpiVariant = base;
    }
    if (!base) return; // not a count-driven tile
    var n = intOf(tile.querySelector('.kpi__value'));
    var lit = !isNaN(n) && n > 0;
    tile.classList.toggle(base, lit);
    tile.classList.toggle('kpi__tile--clear', !lit);
  }

  function syncAll() {
    document.querySelectorAll('.kpi__tile').forEach(syncTile);
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncAll();
    // keep in sync when a page script mutates a value
    var vals = document.querySelectorAll('.kpi__value');
    if (vals.length && window.MutationObserver) {
      var obs = new MutationObserver(function () { syncAll(); });
      vals.forEach(function (v) {
        obs.observe(v, { childList: true, characterData: true, subtree: true });
      });
    }
  });

  window.SEVAKA_syncKpi = syncAll;
})();
