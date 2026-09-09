/* ===== SEVAKA HRIS — Import Payroll tab =====
   Choose-file / reset / submit wiring for the Import Payroll view.
   Mirrors the modal + interaction conventions used in payroll-processing.js. */
(function () {
  'use strict';

  function init() {
    var fileInput = document.getElementById('impFileInput');
    if (!fileInput) return;

    var box      = document.getElementById('impUploadBox');
    var nameEl   = document.getElementById('impFileName');
    var clearBtn = document.getElementById('impClear');
    var resetBtn = document.getElementById('impReset');
    var submitBtn= document.getElementById('impSubmit');
    var download = document.getElementById('impDownload');

    /* ---------- Choose / clear file ---------- */
    function setFile(name) {
      if (name) {
        nameEl.textContent = name;
        box.classList.add('is-filled');
        clearBtn.classList.remove('is-hidden');
      } else {
        fileInput.value = '';
        nameEl.textContent = 'No file selected';
        box.classList.remove('is-filled');
        clearBtn.classList.add('is-hidden');
      }
    }

    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      setFile(f ? f.name : '');
    });

    clearBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();   // keep the file dialog from re-opening via the <label>
      setFile('');
    });

    /* ---------- Download template (prototype: brief feedback) ---------- */
    if (download) {
      download.addEventListener('click', function () {
        var dl = download.querySelector('.imp-file__dl');
        if (!dl || dl.dataset.busy) return;
        dl.dataset.busy = '1';
        dl.style.opacity = '0.45';
        setTimeout(function () { dl.style.opacity = ''; delete dl.dataset.busy; }, 900);
      });
    }

    /* ---------- Reset ---------- */
    if (resetBtn) resetBtn.addEventListener('click', function () { setFile(''); });

    /* ---------- Submit → success modal ---------- */
    var scrim = document.getElementById('impScrim');
    function openModal() {
      scrim.classList.add('is-open');
      scrim.setAttribute('aria-hidden', 'false');
    }
    function closeModal() {
      scrim.classList.remove('is-open');
      scrim.setAttribute('aria-hidden', 'true');
    }

    if (submitBtn) submitBtn.addEventListener('click', function () {
      // Nudge the user to pick a file first.
      if (!fileInput.files || !fileInput.files.length) {
        box.classList.add('imp-upload--shake');
        box.style.borderColor = 'var(--color-error-500)';
        setTimeout(function () {
          box.classList.remove('imp-upload--shake');
          box.style.borderColor = '';
        }, 600);
        return;
      }
      openModal();
    });

    if (scrim) {
      scrim.querySelectorAll('[data-imp-close]').forEach(function (b) {
        b.addEventListener('click', function () { closeModal(); setFile(''); });
      });
      scrim.addEventListener('click', function (e) { if (e.target === scrim) closeModal(); });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && scrim.classList.contains('is-open')) closeModal();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
