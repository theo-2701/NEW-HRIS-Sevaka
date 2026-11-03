---
name: hris-settings-split
description: Memisahkan menu kerja HR dari menu master/setting HRIS Sevaka (pola Talenta) dan merawat area Settings per modul. Aktif saat pengguna minta "pisahkan setting", "menu setting jangan di depan", "tambah setting baru", "Settings per modul", "HR pusing lihat menu", atau melanjutkan tugas nomor 1 dari handoff 3 Nov 2026.
---

# HRIS Settings Split (tugas #1 handoff 3 Nov 2026)

## Latar

- HR (MOM 28 Okt 2026, ringkasan di `docs/MOM-2026-10-28.md`): "saya pusing kalau melihat semua ini, bagian ini
  seharusnya tidak terlihat oleh HR". MOM butir *Provisioning & Akses #2*: menu System Admin dan HR
  Admin dipisah; verifikasi email = tugas IT, bukan HR. *Requisition #3* dan *PDP #2*: aturan approval
  dan watermark masuk **Global Setting**.
- Theo memutuskan (3 Nov 2026) **melanggar kunci sidebar kontrak** untuk ini. Acuan: Talenta (Mekari) —
  Settings terpisah, dikelompokkan per modul.
- Status: **sudah dibangun** di branch `ui/hr-settings-split` (commit `feat(nav): pisahkan menu kerja HR…`).
  Baca `docs/SETTINGS-SPLIT.md` dulu — itu peta lengkapnya.

## Arsitektur (jangan diubah tanpa alasan)

| Bagian | Letak |
|---|---|
| Menu kerja HR | `NAV` di `src/config/nav.ts` — hanya pekerjaan harian |
| Master & setting | `NAV_SETTINGS: SettingsSection[]` (field `slug`, `blurb`) di `src/config/nav.ts` |
| Pintu di sidebar kerja | `settingsDoor('<Modul> settings', '<slug>')` → leaf `settingsLink: true`, dirender hyperlink di `src/layouts/Sidebar.tsx` |
| Pemilih sidebar | `productForPath()` → `isSettingsPath()`: `/settings/**` + semua path di `NAV_SETTINGS` (exact/anak) |
| Beranda & ringkasan modul | `src/features/settings/pages/SettingsHomePage.tsx` (`/settings`, `/settings/:module`), dibaca dari `NAV_SETTINGS` |
| Tautan di halaman kerja | `<PageShell settingsLink={{ label, to }}>` |
| Breadcrumb halaman setting | `Settings › <Modul> › <Halaman>` |

**URL halaman setting sengaja tidak dipindah** (mis. `/time/time-off/settings`, `/company/branch`) — tautan
lama dan tes tetap jalan. Jangan memindah URL kecuali Theo memintanya; bila diminta, tambahkan
`<Navigate replace>` dari URL lama di `src/app/routes.tsx`.

## Klasifikasi: kerja vs setting

Masuk **Settings** bila salah satu benar:
- katalog/master yang jarang berubah (cabang, struktur, grade, cost center, jenis cuti, kategori dokumen);
- kebijakan/aturan/konfigurasi yang dipakai modul lain (accrual, aturan absen, finance policy, workflow setup);
- tugas System Admin/IT (akun, aktivasi, verifikasi email/HP, role, log sistem, integrasi);
- Global Setting perusahaan (approval rules, watermark, masking).

Tetap di **menu kerja** bila HR memakainya harian: transaksi, antrean persetujuan, daftar karyawan,
laporan operasional, data per karyawan.

Ragu → tanya Theo dengan `AskUserQuestion`, jangan menebak.

## Langkah menambah / memindah setting

1. Pindahkan leaf dari `NAV` ke section yang tepat di `NAV_SETTINGS` (buat section baru hanya bila modul baru;
   isi `slug` kebab-case + `blurb` satu kalimat Inggris).
2. Bila modul itu belum punya pintu di `NAV`, tambahkan `settingsDoor(...)` sebagai anak terakhir section-nya.
3. Ubah breadcrumb halaman jadi `[{ label: 'Settings', to: '/settings' }, { label: '<Modul>', to: '/settings/<slug>' }, { label: '<Halaman>' }]`.
4. Halaman kerja terkait: tambah `settingsLink` di `PageShell`.
5. Ikon baru → daftarkan di `src/components/NavIcon.tsx` (tanpa itu jatuh ke `Circle`).
6. Perbarui tabel di `docs/SETTINGS-SPLIT.md`.
7. `npm run lint`, `npm run build`, `npx vitest run src/config src/app src/layouts src/features/settings`;
   cek layar `/settings`, satu halaman kerja, satu halaman setting (Playwright, lihat skill `run`).

## Pekerjaan lanjutan yang belum

- **Gating per role**: Settings saat ini hanya dipisah tampilannya. MOM: "dipisahkan per peran (Admin, HR,
  User)". Usul paling sederhana: field opsional `roles?: string[]` di `NavSection`/`NavLeaf`, disaring di
  `navForPath` memakai `useAuthStore` role; HR biasa tidak melihat section Users & Access / System.
- **Approval Rules** dan **Watermark** (Users & Access) baru baris menu tanpa halaman — butuh desain.
- **Istilah non-teknis** (MOM): ganti label teknis di halaman kerja HR (mis. "Materialization" →
  "Transition setup") — konfirmasi ke Theo dulu.
- Settings Recruitment/ATS: lihat skill `ats-recruitment-build` (Recruitment punya leaf "Settings" sendiri).

## Jangan

- Jangan menaruh setting baru di `NAV` "sementara".
- Jangan menghapus halaman/route — hanya pindahkan baris menu.
- Jangan pakai hex; ikuti `docs/UI-STANDARDS.md` (tombol tanpa ikon, dsb).
