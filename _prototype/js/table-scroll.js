// ============================================================
// SEVAKA HRIS — Table horizontal-scroll helpers (mouse users)
// Attaches to every .pp-table-wrap / .emp-table-wrap:
//   • Click + drag ("press") anywhere on the table to pan sideways
//   • Shift + mouse wheel to slide horizontally while hovering
// Touchpad two-finger scroll already works natively and is untouched.
// Interactive targets (buttons, links, inputs, the Action menu, amount
// fields) never start a drag, and a real drag suppresses the stray click.
// ============================================================
(function () {
  'use strict';

  var INTERACTIVE = 'button, a, input, select, textarea, label, [data-actbtn], .pc-actmenu, .pc-newamt, .pc-delrow';
  var DRAG_THRESHOLD = 4; // px before a press counts as a drag

  function isScrollable(el) { return el.scrollWidth - el.clientWidth > 1; }

  function refreshState(el) {
    el.classList.toggle('is-draggable', isScrollable(el));
  }

  function attach(el) {
    if (el.dataset.hscroll === '1') return;
    el.dataset.hscroll = '1';

    refreshState(el);
    el.addEventListener('mouseenter', function () { refreshState(el); });
    window.addEventListener('resize', function () { refreshState(el); });

    /* ---- Shift + wheel → horizontal ---- */
    el.addEventListener('wheel', function (e) {
      if (!isScrollable(el)) return;
      if (!e.shiftKey) return;
      var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!d) return;
      el.scrollLeft += d;
      e.preventDefault();
    }, { passive: false });

    /* ---- Click + drag to pan (yields to text selection so copy still works) ---- */
    var down = false, panning = false, moved = false, startX = 0, startScroll = 0;

    el.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      moved = false;    // clear stale drag state before any early-return
      panning = false;
      if (!isScrollable(el)) return;
      if (e.target.closest(INTERACTIVE)) return;
      down = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
    });

    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      var dx = e.pageX - startX;
      if (!panning) {
        if (Math.abs(dx) <= DRAG_THRESHOLD) return;
        // If the user is selecting text, let them — so the content stays copyable.
        var sel = window.getSelection && window.getSelection();
        if (sel && sel.toString().length > 0) { down = false; return; }
        panning = true;
        moved = true;
        el.classList.add('is-grabbing');
      }
      el.scrollLeft = startScroll - dx;
      e.preventDefault();
    });

    window.addEventListener('mouseup', function () {
      if (!down && !panning) return;
      down = false;
      panning = false;
      el.classList.remove('is-grabbing');
    });

    // Swallow the click that fires at the end of a real pan so rows/links
    // don't trigger when the user was only panning.
    el.addEventListener('click', function (e) {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    }, true);
  }

  function init() {
    document.querySelectorAll('.pp-table-wrap, .emp-table-wrap').forEach(attach);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
