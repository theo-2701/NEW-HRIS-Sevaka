---
name: ats-recruitment-build
description: Melengkapi produk ATS / Recruitment Sevaka (menu yang belum jadi: Candidates, Talent Pool, Assessments, Calendar, Activity Log, Reports, Settings, pipeline kandidat) dengan acuan referensi Theo atau Talenta Recruitment. Aktif saat pengguna minta "bereskan ATS", "lanjut recruitment", "menu ATS belum jadi", "pipeline kandidat", atau melanjutkan tugas nomor 2 dari handoff 3 Nov 2026.
---

# ATS / Recruitment build (tugas #2 handoff 3 Nov 2026)

## Konteks

Baca dulu: `docs/MOM-2026-10-28.md` (ringkasan MOM HR).

- Roadmap (MOM 28 Okt 2026): **Core HRIS → ATS → Payroll**. HR ingin end-to-end: lamar → HRIS → payroll.
- Alur yang DISEPAKATI (MOM *Alur New Joiner #2*): **requisition → approval → pencarian kandidat →
  interview & pemilihan oleh user (requestor) → validasi HR → kontrak digital → provisioning**.
- Pemilihan kandidat (MOM): requestor/interviewer memilih kandidat + hasil & alasan interview → kandidat
  masuk **bucket HRD** dengan notifikasi; kandidat lain otomatis tereliminasi. Sebelum ATS jadi ada bypass.
- PDP (MOM): **consent sekali di awal (tahap ATS)**, diisi kandidat sendiri; data pribadi tidak ditarik sebelum consent.
- Role rekrutmen saat ini: Administrator, HR Manager, HR Staff; role baru bisa ditambah.

## Yang sudah ada

- Produk Recruitment: `productForPath('/recruitment…')`, nav `NAV_RECRUITMENT` di `src/config/nav.ts`.
- Fitur `src/features/recruitment/`: Home (`RecruitmentHomePage`), Job Listings (list/create-edit wizard
  `JobFormSteps`/`jobForm.ts`/detail), Import Logs (+detail), Add Candidate; service mock
  `recruitment.service.ts` (`jobs`, `overview`, `interviews`, `save`, `duplicate`, `importJobs`, `addCandidate`).
- Prototype acuan: `_prototype/recruitment-*.html` + `_prototype/js/recruitment-shell.js`.
- Sisi HRIS yang terkait (jangan dibangun ulang): `src/features/ats-bridge/` (undangan kandidat, portal
  kandidat publik `/candidate/:companyCode`, Create Employee), `new-joiner/`, `manpower/` (Requisition).

## Menu yang belum jadi (baris tanpa `path` di `NAV_RECRUITMENT` / nav Recruitment)

Talent Pool · Candidates · Assessments · Calendar · Activity Log · Reports · Settings.

## Cara kerja

1. **Minta referensi dulu.** Tanya Theo (`AskUserQuestion`) apakah ada desain/Figma/FSD untuk menu itu.
   Bila tidak ada, acuan = **Talenta Recruitment**: Job vacancy → Candidates pipeline per tahap
   (Applied, Screening, Interview, Offering, Hired, Rejected) → kartu kandidat (CV, catatan, skor, riwayat),
   Talent pool (kandidat tersimpan lintas lowongan), jadwal interview (calendar), assessment/test,
   activity log, laporan funnel (time to hire, source, conversion), settings (tahap pipeline, template
   email, form lamaran, sumber kandidat).
2. Satu menu per iterasi: types → service mock (`MOCK` blok) → hooks React Query → page → route di
   `src/app/routes.tsx` + `IMPLEMENTED_PATHS` → beri `path`/`status: 'done'` di nav. Ikuti skill
   `scaffold-feature` dan `ponytail`.
3. **Pipeline Candidates adalah pusatnya** — bangun ini lebih dulu. Tahap pipeline dibaca dari
   `HiringProcess`/`HiringStage` di `types.ts` (sudah ada di wizard job listing) — jangan buat model kedua.
4. Keputusan "kandidat terpilih" oleh requestor + alasan → status `SELECTED` → muncul di bucket HRD
   (inilah titik sambung ke HRIS, lihat skill `ats-hris-integration`).
5. Settings Recruitment: letakkan di produk Recruitment (leaf Settings), dikelompokkan seperti Talenta;
   jangan dicampur ke `NAV_SETTINGS` HRIS kecuali Theo minta.
6. Setiap layar: satu bahasa (Inggris untuk layar baru), tanpa emoji, ikuti `docs/UI-STANDARDS.md`
   (filter kiri/search kanan, `<Pagination>`, 1 aksi = tombol, ≥2 = Action ▾, modal footer kanan).

## Selesai bila

- Semua baris nav Recruitment punya `path` (atau sengaja ditunda dan dicatat di `docs/MODULE-TRACKER.md`).
- Tes unit service per menu, `npm run lint`, `npm run build` hijau; layar diperiksa dengan Playwright.
- Catat sumber acuan (Talenta / referensi Theo) di komentar JSDoc halaman dan di `docs/CONTRACT-AUDIT.md`.

## Jangan

- Jangan membuat consent kedua di HRIS bila kandidat sudah consent di ATS (MOM PDP #1).
- Jangan menyalin teks/branding Talenta mentah — ambil pola alurnya saja.
