/* ===========================================================================
   auth.js — SEVAKA HRIS auth flow controller (FSD-001-AUTH-0.2 / UIC-001-AUTH-0.4)
   Three standalone login pages + 2FA per channel:
     email / username  → MAGIC_LINK  (MLS → auto-verify → Home)
     whatsapp          → LOGIN_OTP   (6-digit, TTL 5 min)
   Reset password: RP1 → RP-SENT → RP2 → RP-DONE.
   Exposes window.AUTH for inline handlers and the Tweaks panel.
   ========================================================================== */
(function () {
  'use strict';

  var stage   = document.getElementById('stage');
  var intro   = document.getElementById('intro');
  var DASHBOARD_URL = 'index.html';

  /* ---------------- i18n ------------------------------------------------- */
  var COPY = {
    id: {
      // Login Email
      'lemail.title': 'Masuk',
      'lemail.lead': 'Gunakan email terdaftar Anda untuk masuk ke SEVAKA.',
      // Login Username
      'luser.title': 'Masuk dengan Username',
      'luser.lead': 'Tautan masuk akan dikirim ke email terdaftar akun Anda.',
      'hint.username': 'Huruf kecil, diawali huruf.',
      // Login WhatsApp
      'lwa.title': 'Masuk dengan WhatsApp',
      'lwa.lead': 'Kode verifikasi 6 digit akan dikirim ke WhatsApp Anda.',
      // shared fields
      'f.email': 'Email', 'f.password': 'Password', 'f.username': 'Username',
      'f.phone': 'Nomor Handphone', 'f.newpw': 'Password Baru', 'f.confirmpw': 'Konfirmasi Password',
      'ph.email': 'Masukkan email Anda', 'ph.password': 'Masukkan password',
      'ph.username': 'Masukkan username',
      'ph.newpw': 'Masukkan password baru', 'ph.confirmpw': 'Ulangi password baru',
      'ts.verify': 'Verifikasi Anda manusia',
      'btn.masuk': 'Masuk',
      'link.forgot': 'Lupa Password?', 'link.backLogin': '← Kembali ke halaman masuk',
      'switch.or': 'atau masuk dengan', 'switch.email': 'Email',
      'switch.username': 'Username', 'switch.wa': 'WhatsApp',
      // Magic-Link Sent
      'mls.title': 'Cek email Anda',
      'mls.lead': 'Kami mengirim tautan masuk ke <b>s***@ptdika.co.id</b>. Buka email dan klik tautan untuk melanjutkan. Tautan berlaku 15 menit.',
      'mls.simulate': 'Simulasikan klik tautan',
      // Auto-verify
      'av.title': 'Memverifikasi tautan masuk',
      'av.lead': 'Mohon tunggu, kami sedang memverifikasi identitas Anda…',
      // OTP
      'otp.title': 'Masukkan kode OTP',
      'otp.lead': 'Kami mengirim kode 6 digit ke WhatsApp <b>0812****7890</b>. Kode berlaku 5 menit.',
      'btn.verify': 'Verifikasi',
      'otp.resendIn': 'Kirim ulang dalam', 'otp.resendNow': 'Kirim ulang OTP',
      'otp.limit': 'Maksimal 3 permintaan per 15 menit.',
      // Reset password
      'rp1.title': 'Lupa Password',
      'rp1.lead': 'Masukkan email terdaftar Anda. Kami akan mengirim tautan untuk mengatur ulang password.',
      'btn.sendReset': 'Kirim Tautan Reset',
      'rpsent.title': 'Cek email Anda',
      'rpsent.lead': 'Bila email terdaftar, tautan reset (berlaku 15 menit) telah dikirim. Semua sesi aktif Anda akan keluar setelah password diubah.',
      'rpsent.simulate': 'Simulasikan klik tautan',
      'rp2.title': 'Atur Password Baru',
      'rp2.lead': 'Password minimal 8 karakter dengan huruf besar, huruf kecil, angka, dan simbol.',
      'btn.save': 'Simpan',
      'pw.weak': 'Lemah', 'pw.fair': 'Sedang', 'pw.good': 'Baik', 'pw.strong': 'Kuat',
      'pw.mismatch': 'Password tidak cocok.',
      'rpdone.title': 'Password berhasil diubah',
      'rpdone.lead': 'Semua sesi Anda telah keluar. Silakan masuk kembali dengan password baru.',
      'btn.toLogin': 'Ke Halaman Masuk',
      // footer
      'foot.privacy': 'Kebijakan privasi', 'foot.terms': 'Ketentuan penggunaan', 'foot.about': 'Tentang Sevaka'
    },
    en: {
      'lemail.title': 'Sign in',
      'lemail.lead': 'Use your registered email to sign in to SEVAKA.',
      'luser.title': 'Sign in with Username',
      'luser.lead': "A sign-in link will be sent to your account's registered email.",
      'hint.username': 'Lowercase, must start with a letter.',
      'lwa.title': 'Sign in with WhatsApp',
      'lwa.lead': 'A 6-digit verification code will be sent to your WhatsApp.',
      'f.email': 'Email', 'f.password': 'Password', 'f.username': 'Username',
      'f.phone': 'Phone Number', 'f.newpw': 'New Password', 'f.confirmpw': 'Confirm Password',
      'ph.email': 'Enter your email', 'ph.password': 'Enter your password',
      'ph.username': 'Enter your username',
      'ph.newpw': 'Enter new password', 'ph.confirmpw': 'Repeat new password',
      'ts.verify': 'Verify you are human',
      'btn.masuk': 'Sign In',
      'link.forgot': 'Forgot Password?', 'link.backLogin': '← Back to sign in',
      'switch.or': 'or sign in with', 'switch.email': 'Email',
      'switch.username': 'Username', 'switch.wa': 'WhatsApp',
      'mls.title': 'Check your email',
      'mls.lead': 'We sent a sign-in link to <b>s***@ptdika.co.id</b>. Open your email and click the link to continue. The link is valid for 15 minutes.',
      'mls.simulate': 'Simulate clicking the link',
      'av.title': 'Verifying your sign-in link',
      'av.lead': 'Please wait, we are verifying your identity…',
      'otp.title': 'Enter OTP code',
      'otp.lead': 'We sent a 6-digit code to WhatsApp <b>0812****7890</b>. The code is valid for 5 minutes.',
      'btn.verify': 'Verify',
      'otp.resendIn': 'Resend in', 'otp.resendNow': 'Resend OTP',
      'otp.limit': 'Maximum 3 requests per 15 minutes.',
      'rp1.title': 'Forgot Password',
      'rp1.lead': 'Enter your registered email. We will send a link to reset your password.',
      'btn.sendReset': 'Send Reset Link',
      'rpsent.title': 'Check your email',
      'rpsent.lead': 'If the email is registered, a reset link (valid for 15 minutes) has been sent. All your active sessions will be logged out after the password is changed.',
      'rpsent.simulate': 'Simulate clicking the link',
      'rp2.title': 'Set New Password',
      'rp2.lead': 'Password must be at least 8 characters with uppercase, lowercase, number, and symbol.',
      'btn.save': 'Save',
      'pw.weak': 'Weak', 'pw.fair': 'Fair', 'pw.good': 'Good', 'pw.strong': 'Strong',
      'pw.mismatch': 'Passwords do not match.',
      'rpdone.title': 'Password changed successfully',
      'rpdone.lead': 'All your sessions have been logged out. Please sign in again with your new password.',
      'btn.toLogin': 'Go to Sign In',
      'foot.privacy': 'Privacy policy', 'foot.terms': 'Terms of use', 'foot.about': 'About Sevaka'
    }
  };

  function applyLang(lang) {
    var dict = COPY[lang] || COPY.id;
    document.body.dataset.lang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k] != null) el.innerHTML = dict[k];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph');
      if (dict[k] != null) el.placeholder = dict[k];
    });
    // strength label reflects current level after a language switch
    paintStrength();
  }

  /* ---------------- Screen routing --------------------------------------- */
  var avTimer = null;
  function go(name) {
    if (name === 'dashboard') { window.location.href = DASHBOARD_URL; return; }
    var target = document.querySelector('[data-auth="' + name + '"]');
    if (!target) return;
    document.querySelectorAll('.auth-screen').forEach(function (s) { s.classList.remove('is-active'); });
    target.classList.add('is-active');
    // focus first input
    var first = target.querySelector('input:not([type="checkbox"])');
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 60);

    if (name === 'otp') { resetOtp(); startOtpTimer(); }
    if (name === 'av') {
      if (avTimer) clearTimeout(avTimer);
      avTimer = setTimeout(function () { window.location.href = DASHBOARD_URL; }, 1900);
    }
  }

  /* ---------------- Password eye toggles --------------------------------- */
  document.querySelectorAll('[data-eye]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var input = btn.parentElement.querySelector('.field__input');
      if (!input) return;
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = '<i data-lucide="' + (show ? 'eye-off' : 'eye') + '"></i>';
      if (window.lucide) lucide.createIcons();
    });
  });

  /* ---------------- Turnstile mock (managed challenge) ------------------- */
  document.querySelectorAll('[data-turnstile]').forEach(function (w) {
    function verify() {
      if (w.classList.contains('is-verified') || w.classList.contains('is-checking')) return;
      w.classList.add('is-checking');
      setTimeout(function () {
        w.classList.remove('is-checking');
        w.classList.add('is-verified');
        w.setAttribute('aria-checked', 'true');
      }, 650);
    }
    w.addEventListener('click', verify);
    w.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); verify(); }
    });
  });

  /* ---------------- OTP box behaviour ------------------------------------ */
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.otp-box'));
  var otpVerifyBtn = document.getElementById('otpVerify');
  function refreshOtpBtn() {
    if (!otpVerifyBtn) return;
    var full = boxes.every(function (b) { return b.value.length === 1; });
    otpVerifyBtn.disabled = !full;
  }
  boxes.forEach(function (box, i) {
    box.addEventListener('input', function () {
      box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
      box.classList.toggle('is-filled', !!box.value);
      if (box.value && boxes[i + 1]) boxes[i + 1].focus();
      refreshOtpBtn();
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !box.value && boxes[i - 1]) { boxes[i - 1].focus(); }
      if (e.key === 'ArrowLeft' && boxes[i - 1]) boxes[i - 1].focus();
      if (e.key === 'ArrowRight' && boxes[i + 1]) boxes[i + 1].focus();
    });
    box.addEventListener('paste', function (e) {
      e.preventDefault();
      var data = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      for (var j = 0; j < boxes.length && j < data.length; j++) {
        boxes[j].value = data[j]; boxes[j].classList.add('is-filled');
      }
      var next = Math.min(data.length, boxes.length - 1);
      if (boxes[next]) boxes[next].focus();
      refreshOtpBtn();
    });
  });
  function resetOtp() {
    boxes.forEach(function (b) { b.value = ''; b.classList.remove('is-filled'); });
    refreshOtpBtn();
    if (boxes[0]) setTimeout(function () { try { boxes[0].focus(); } catch (e) {} }, 80);
  }

  /* ---------------- OTP resend countdown (TTL 5 min) --------------------- */
  var otpTimer = null;
  function startOtpTimer() {
    var secs = 300;                       // 5 minutes TTL
    var wrap  = document.getElementById('otpResendWrap');
    var btn   = document.getElementById('otpResendBtn');
    var count = document.getElementById('otpCount');
    if (!count) return;
    if (otpTimer) clearInterval(otpTimer);
    wrap.hidden = false; btn.hidden = true; btn.disabled = true;
    function paint() {
      var m = Math.floor(secs / 60), s = secs % 60;
      count.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
    paint();
    otpTimer = setInterval(function () {
      secs--;
      if (secs <= 0) {
        clearInterval(otpTimer); otpTimer = null;
        wrap.hidden = true; btn.hidden = false; btn.disabled = false;
      } else { paint(); }
    }, 1000);
  }
  function resendOtp() { resetOtp(); startOtpTimer(); }

  /* ---------------- Password strength meter (RP2, UI-only) --------------- */
  var pwInput   = document.getElementById('rpNewPw');
  var pwConfirm = document.getElementById('rpConfirmPw');
  var pwMeter   = document.getElementById('pwStrength');
  var pwLabelEl = document.getElementById('pwStrengthLabel');
  var matchHint = document.getElementById('rpMatchHint');
  var pwLevel = 0;
  function scorePw(v) {
    if (!v) return 0;
    var n = 0;
    if (v.length >= 8) n++;
    if (/[A-Z]/.test(v)) n++;
    if (/[a-z]/.test(v)) n++;
    if (/[0-9]/.test(v)) n++;
    if (/[^A-Za-z0-9]/.test(v)) n++;
    // map 0..5 checks → level 1..4
    if (n <= 1) return 1;
    if (n === 2 || n === 3) return 2;
    if (n === 4) return 3;
    return 4;
  }
  function paintStrength() {
    if (!pwMeter || !pwLabelEl) return;
    pwMeter.setAttribute('data-level', String(pwLevel));
    var dict = COPY[document.body.dataset.lang] || COPY.id;
    var keys = ['pw.weak', 'pw.weak', 'pw.fair', 'pw.good', 'pw.strong'];
    pwLabelEl.textContent = pwLevel ? dict[keys[pwLevel]] : dict['pw.weak'];
    pwMeter.style.visibility = pwLevel ? 'visible' : 'hidden';
  }
  function checkMatch() {
    if (!matchHint || !pwConfirm) return;
    var mismatch = pwConfirm.value.length > 0 && pwConfirm.value !== (pwInput ? pwInput.value : '');
    matchHint.hidden = !mismatch;
    pwConfirm.classList.toggle('is-error', mismatch);
  }
  if (pwInput) {
    pwInput.addEventListener('input', function () { pwLevel = scorePw(pwInput.value); paintStrength(); checkMatch(); });
    paintStrength();
  }
  if (pwConfirm) pwConfirm.addEventListener('input', checkMatch);

  /* ---------------- Intro splash ----------------------------------------- */
  function playIntro() {
    var letters = document.querySelectorAll('#introWord span');
    letters.forEach(function (s, i) { s.style.animationDelay = (200 + i * 70) + 'ms'; });

    intro.classList.remove('is-leaving');
    intro.style.display = '';
    stage.classList.add('intro-pending');
    stage.classList.remove('reveal');

    var speed = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--intro-speed')) || 1;
    var hold = 2100 / speed;

    var leaveTimer = setTimeout(leave, hold);
    function leave() {
      clearTimeout(leaveTimer);
      intro.removeEventListener('click', leave);
      intro.classList.add('is-leaving');
      stage.classList.remove('intro-pending');
      stage.classList.add('reveal');
      setTimeout(function () { intro.style.display = 'none'; }, 480 / speed);
    }
    intro.addEventListener('click', leave);
  }

  function skipIntro() {
    intro.style.display = 'none';
    stage.classList.remove('intro-pending');
  }

  function shouldPlay() {
    if (document.body.dataset.intro === 'off') return false;
    if (document.body.dataset.introReplay === 'once') {
      if (sessionStorage.getItem('sevaka_intro_seen')) return false;
      sessionStorage.setItem('sevaka_intro_seen', '1');
    }
    return true;
  }

  /* ---------------- Public API ------------------------------------------- */
  window.AUTH = {
    go: go,
    resendOtp: resendOtp,
    setLang: applyLang,
    replayIntro: function () { playIntro(); }
  };

  /* ---------------- Boot ------------------------------------------------- */
  function boot() {
    if (window.lucide) lucide.createIcons();
    applyLang(document.body.dataset.lang || 'id');
    refreshOtpBtn();
    if (shouldPlay()) playIntro(); else skipIntro();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
