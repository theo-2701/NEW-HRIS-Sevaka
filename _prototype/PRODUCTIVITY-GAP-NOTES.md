# PRODUCTIVITY — Gap Notes (Project Active · Project Archive · Tasks)

Sumber kontrak: `FSD-001-PRODUCTIVITY-0.1` §1–§3 · `UIC-001-PRODUCTIVITY-0.1` §2 (FT1.01–FT1.18).
Yang dicek: screenshot referensi ("Mythos HRIS · Productivity", 12 frame). Dokumen = acuan; screenshot = referensi.

## A. Gap kontrak (WAJIB diikuti dokumen)

### Project — Active
| # | Gap | Kontrak |
|:--|:--|:--|
| A1 | **Tidak ada kontrol "Tambah Anggota"** di modal B3 — hanya daftar + "Keluarkan". Endpoint `POST /projects/{id}/members` jadi yatim. | FSD §1.2 (Panel Anggota — tambah), UIC FT1.06 (upsert 201/200/no-op) |
| A2 | Field **Status di B3 tampil sebagai input teks**, bukan dropdown `AKTIF`/`ARSIP`. | FSD §1.2 "Dropdown Status" |
| A3 | Gerbang 422 `PROD_PROJECT_ARCHIVE_HAS_OPEN_TASK` dirender sebagai **modal dialog**, kontrak menyebut **banner** di dalam konteks B5. | FSD §1 tabel screen (`B5` Banner 422) |
| A4 | Filter grid hanya nama. Kontrak menyediakan `state`, `owner_employee_id`, `start_date`/`end_date` (created_at BETWEEN) + `sort_by` (`created_at`/`project_name`/`state`). | UIC FT1.04 |
| A5 | Toast **201/200** (screen A4/B4) tidak terlihat di frame mana pun — perlu ada, terminal state resmi. | FSD §1 A4/B4 |
| A6 | Form Create Project (`A3`, 1 field `project_name`, wajib non-blank ≤150) tidak ada framenya. | FSD §1.1 |

### Project — Archive
| # | Gap | Kontrak |
|:--|:--|:--|
| B1 | Kolom grid: kontrak = Nama + **Diarsipkan Sejak** (`archived_at`); kolom Owner/Status boleh, tapi `sort_by` & empty-state ("baris hilang setelah restore") belum ditunjukkan. | FSD §2.1 A2/A4 |
| B2 | Modal restore benar (archived_at + timezone read-only, tombol Kembalikan). **Sesuai** — tidak perlu diubah. | FSD §2.1 |
| B3 | 422 `PROD_PROJECT_ARCHIVED` di sini adalah **referensi silang** dari alur Tasks — harus ditandai eksplisit sebagai demo, bukan aksi menu Archive. | FSD §2.1 A5 |

### Tasks
| # | Gap | Kontrak |
|:--|:--|:--|
| C1 | **Aksi baris "Hapus" pada task tidak ada di kontrak** — FT1 hanya punya `POST`/`GET`/`PATCH`/`search`/`history` untuk task (poin 9–13). Harus dihapus dari UI (bukan sekadar disabled). | UIC §2.4, FSD §3.6 |
| C2 | **Panel Riwayat (`log_task_change`) tidak ada** — `GET /tasks/{id}/history` yatim. Wajib: `changed_field`/`old_value`/`new_value`/`change_reason`/`created_by`/`created_at`, sort `created_at DESC`. | FSD §3.2 B4, UIC FT1.13 |
| C3 | Modal Detail/Edit **tidak punya Judul, Deskripsi, dan Kategori** — padahal ketiganya field mutable (Kategori menulis `log_task_change` `TASK_CATEGORY`). | FSD §3.2 |
| C4 | Filter grid hanya judul + status. Kontrak: `priority` IN, `project_id`, **`has_project`**, `task_category_id`, `assignee_employee_id`, rentang `due_date`. Catatan "has_project" sudah disebut di footnote tapi belum jadi kontrol. | UIC FT1.12 |
| C5 | **Sub-cerita Kategori Task belum jadi tab di dalam page Tasks** — frame "Kategori Baru" berdiri sendiri; grid Master Kategori (`C2`, 6 baris seed, 3 Hapus enabled / 3 disabled) tidak ada. | FSD §3 (C1–C4), §3.5 |
| C6 | Toggle `is_active` kategori (mode Ubah, `PATCH /task-categories/{id}`) hanya disebut di teks, belum ada kontrolnya. | UIC FT1.17 |
| C7 | Toast 201 + Banner 409 `PROD_TASK_CATEGORY_IN_USE` (screen C4) belum ada. | FSD §3.5 |
| C8 | Persona: page Tasks butuh **dua aktor** — Dedi (self, A-flow) dan Hesti/HR (C-flow kategori). Perlu switch persona agar wewenang HR-saja terbaca. | FSD §3 tabel screen |

## B. Gap standar rumah (CLAUDE.md / DS SEVAKA) — screenshot menyimpang

1. **Row action**: "Detail"/"Hapus" ditulis sebagai teks link. Standar: 1 aksi ⇒ satu `.rowbtn` ("View Detail"); ≥2 aksi ⇒ satu dropdown **"Action ▾"** (`F.rowMenu`). Header kolom Action dikosongkan.
2. **Pagination**: nol footer. Semua grid yang tumbuh (Project, Tasks) wajib `.ph-foot` + `F.pager(...)`.
3. **Freeze column**: kolom identifier (Nama/Judul) freeze kiri, kolom Action freeze kanan (`table-standard.css`).
4. **Modal standar**: header bertint tetap + X, hanya `.ovl__body` yang scroll, footer mist; **2 tombol menempel kanan-bawah** — screenshot memakai split (Batal kiri / Simpan kanan).
5. **Ikon tombol**: "+ Proyek Baru" / "+ Task Baru" memakai leading `+`; standar rumah: `+` hanya untuk "Add …" di dalam form → tombol page-level **teks saja**.
6. **Shell & brand**: topbar 64px + sidebar SEVAKA (84/264px), brand SEVAKA — screenshot memakai brand & nav lain.
7. **Scrim modal**: DS mensyaratkan `--bg-scrim` + `backdrop-filter: var(--blur-scrim)`; screenshot memakai abu-abu rata.
8. **Bahasa**: build ini English penuh; screenshot mencampur judul English + isi Bahasa Indonesia. Untuk halaman Productivity: ikut build = English (label enum tetap kode kontrak, mis. `SEDANG_DIKERJAKAN`).

## C. Yang sudah benar di screenshot (pertahankan saat build)
- Dua page terpisah Active vs Archive (bukan satu page + filter) — FSD §1.4.
- Badge status/prioritas + label `task_origin` sebagai badge kecil, bukan layar terpisah — FSD §3.4.
- "Tanpa Proyek" ditampilkan sebagai kelompok bernama (PD-35), bukan sel kosong.
- `archived_at` + timezone read-only di modal restore; restore mengosongkan `archived_at`.
- Kategori "Rapat & Koordinasi" sengaja tak-berbayar (fail-closed PD-95) diberi catatan.
- Alasan Perubahan wajib saat `due_date` mundur (422 `PROD_TASK_DUE_DATE_REASON_REQUIRED`).

## D2. Status build (13 Agustus 2026) — 11 halaman selesai
Seluruh 11 menu FSD dibangun, memakai standar rumah (topbar/sidebar SEVAKA, `.ph-foot` + `F.pager`, freeze column, modal `.ovl` standar, row-action 1 tombol / "Action ▾", tombol teks-saja, English):
`productivity-project-active` · `-project-archive` · `-tasks` (sub-tab My Tasks | Task Category + switch persona Dedi/Hesti) · `-time-tracker` · `-activities` (persona owner/atasan) · `-summary` · `-tracker-report` · `-task-list` · `-group-list` · `-forms` (composer + Detail 4-panel + Agregat + Anonim) · `-my-submissions`.
Data bersama: `js/productivity-data.js` (Dataset Skenario Positif, nol field uang). Gaya tambahan: `css/productivity.css`. Rute sidebar Productivity sudah ditautkan di `js/shell.js`.
Perbaikan bersama: `js/flow-common.js` — `wireSelects()` kini bisa dijalankan ulang (opsi dropdown yang diisi ulang saat modal dibuka ikut terpasang), guard pindah dari kontrol ke opsi.
Gap A1–A6 · B1–B3 · C1–C8 dan seluruh butir standar rumah §B sudah ditutup di build ini; dua gap dokumen (`PROB-FRONTEND-019` Document Templates, `PROB-SECURITY-076` ambang agregat) tetap terbuka dan ditandai eksplisit di layar.

## D3. Cek gap dokumen naik versi — Time Tracker (14 Agustus 2026)

Dokumen yang naik versi & relevan ke layar Time Tracker: `TSD-001-PRODUCTIVITY` 0.1→0.2, `ERD-001-PRODUCTIVITY` 0.1→0.3, dan `TSD-001-TIME` 0.4→0.6 (rujukan: `uploads/Ringkasan-Changelog-Semua-Modul.md`).

Hasil: **nol dampak UI/fungsi di layar Time Tracker — nol perubahan dibuat.**

| Delta versi | Isi perubahan | Dampak ke `productivity-time-tracker.html` |
| :--- | :--- | :--- |
| TSD-PRODUCTIVITY 0.2 | `productivity.task_due_reminder_days` naik status jadi "DISAHKAN sementara" (nilai tetap 3); `setup_value` jadi array `jsonb`; `setup_category` dibuang | Nol. Ketiganya config/status internal; §5.3–§5.5 (timer start/stop, catat manual) tak berubah — `task_id` wajib, `activity_type_id` opsional (PD-95), durasi menit apa adanya tanpa pembulatan (PD-25), `Idempotency-Key` wajib, `PROD_TASK_NOT_ELIGIBLE` / `PROD_ENTRY_WINDOW_CLOSED` / `PROD_DAILY_DURATION_EXCEEDED` tetap. Nilai reminder tenggat task tidak dirender di layar ini (milik Tasks). |
| ERD-PRODUCTIVITY 0.3 | Bawaan `emp_timesheet_period.period_end` dikoreksi: "akhir bulan kalender" → **25** (fallback akhir bulan untuk 29/30/31) | Nol **di layar ini** — Time Tracker tidak menampilkan/menjelaskan tanggal tutup periode; jendela mundur yang dipakai di sini adalah `productivity.entry_window_days` = 7, key berbeda dan tak tersentuh. (Teks "akhir bulan" perlu dicek di layar Summary/pengesahan, bukan Time Tracker — tidak ditemukan di build.) |
| TSD-TIME 0.5–0.6 | Kepemilikan `payroll.closing_day_of_month` (default tetap 25), `setup_category` dibuang, bentuk config `jsonb`, koreksi teks "92→91 route" | Nol. Modul time-service tidak dipanggil layar ini — `PD-34` justru melarang silang ke absensi. |

Kesimpulan: tidak ada field, enum, endpoint, atau kode error baru yang perlu dirender. `productivity-time-tracker.html` dibiarkan apa adanya.

## D4. Cek gap — Activities (14 Agustus 2026)

Acuan: `FSD-001-PRODUCTIVITY-0.1` §5 (AC-A1–A4, AC-B1–B5) · `UIC` §3.7–§3.9, §3.16. Referensi: 5 screenshot "Mythos HRIS · Productivity / Activities".

| # | Gap | Sumber | Tindakan |
|:--|:--|:--|:--|
| E1 | **Panel Riwayat (`log_worklog_change`) tidak ada di list** — hanya sub-tab di dalam modal. AC-A4 = "List updated + Toast 200 + **Riwayat**" (screenshot juga menaruhnya di bawah grid). | FSD §5.1 AC-A4 | Riwayat dipindah ke panel inline di bawah grid (`Field/Old/New/Activity/By/When` + catatan nol `change_reason`); sub-tab modal dihapus (nol duplikasi). |
| E2 | **Panel jejak `log_system_stop_acceptance` (AC-B4) tidak ada** — hanya toast. | FSD §5.2 AC-B4, UIC §3.16 | Panel inline "Acceptance trail" (`worklog_id`/origin tetap/`duration_minutes` unchanged/`created_by`/`created_at`), append-only. |
| E3 | **Gerbang 403 SoD (AC-B5) tak terjangkau** — persona pemilik nol tombol Terima, jadi skenario pentest tak bisa didemokan; kontrak menyebut **banner**, build hanya toast. | FSD §5.2 AC-B5 | Persona pemilik kini punya menu "Accept as it stands" pada baris `DIHENTIKAN_SISTEM` → gagal-tertutup jadi **banner** `403 PROD_SELF_ACCEPTANCE_FORBIDDEN` di atas grid (+ toast). |
| E4 | **Gerbang `422 PROD_ENTRY_WINDOW_CLOSED` tidak ada** pada sunting; panel jendela statis (teks hiasan). | FSD §5.1 AC-A3, UIC §3.8 | Jendela dihitung: 7 hari mundur dari "kini" naratif `2026-07-24`, **kecuali** ada `log_worklog_window_grant` aktif (Rina, **10–12 Jul** — digeser dari tanggal literal UIC 18–19 Jul yang justru masih di dalam jendela 7 hari, sehingga cabang grant tak pernah terpakai). Panel jadi read-only tapi hidup; ganti tanggal → status jendela ikut berubah. |
| E5 | Dataset kontradiktif: `WORKLOG_HISTORY['WLG-0003']` sudah berisi `480→300` padahal barisnya masih 480 & `correction_mode IS NULL`. | FSD §5.1 contoh kasus | Seed dibuang — entri lahir dari alur koreksi (`created_by` = pemilik, tanpa `change_reason`). |
| E6 | `422 PROD_NOT_SYSTEM_STOPPED_WORKLOG` / `PROD_ALREADY_CORRECTED` nol jejak di layar. | UIC §4.4 | Ditegaskan sebagai catatan syarat di modal Terima (tombol tetap hanya muncul pada baris yang memenuhi syarat — fail-closed di UI). |
| E7 | Aksi baris: 2 aksi ditulis sebagai dua tombol/teks. | CLAUDE.md | ≥2 aksi ⇒ satu **"Action ▾"** (`F.rowMenu`): Edit · Accept as it stands · Change history · Acceptance trail; 1 aksi ⇒ satu `.rowbtn`. |

Sengaja **tidak** mengikuti screenshot: kotak "Cari task / rentang tanggal" tunggal (kontrak minta filter `task_id`/`project_id`/`origin`/rentang `work_date` + `sort_by` whitelist ⇒ tetap modal Filter); kolom Aksi "—" untuk baris tanpa wewenang (standar rumah ⇒ `.rowbtn` disabled "Owner only"); Bahasa Indonesia (build English penuh, label enum tetap kode kontrak); shell & brand SEVAKA.

## D5. Cek gap — Task List & Group List (18 Agustus 2026)

Acuan: `FSD-001-PRODUCTIVITY-0.1` §8 (TL-A1–A5) & §9 (GL-A1–A5) · `UIC` §4.2 (#36–39), §4.3 (#40–42). Referensi: 5 screenshot Figma "Mythos HRIS · Productivity / Task List · Group List".

| # | Gap | Sumber | Tindakan |
|:--|:--|:--|:--|
| F1 | **Nol kontrol pencarian/filter** di kedua grid — kontrak punya `keyword` + `is_active` + whitelist `sort_by`; Figma juga menampilkan kotak "Cari…". | UIC #37/#40, FSD §8.1 "Filter aktif" | Ditambah `.tbar` = segmented **Active · Inactive · All** + tombol **Filter** (modal standar rumah, bukan kotak inline Figma): keyword, Paid work group (Task List), Sort by. Ringkasan filter otomatis. |
| F2 | Grid hanya menampilkan baris **aktif**, jadi baris yang "wajib tetap ada selamanya" setelah Nonaktifkan **tak bisa dilihat** — kolom "Active" pun mati (selalu `is_active=true`). | FSD §8.1 (baris tetap ada), §8.3 | Segmented status; kolom jadi **Status** dengan badge Active/Inactive. Toast nonaktifkan mengarahkan ke tab Inactive. Baris inaktif: `.rowbtn` disabled "Deactivated". |
| F3 | **Nol pagination** di dua master yang tumbuh. | CLAUDE.md | `.ph-foot` + `F.pager` (`pgTl`, `pgGl`). |
| F4 | Aksi **"Hapus" Group List aktif** dan hanya melempar toast — kontrak: **disabled permanen dengan tooltip alasan** (Figma juga abu-abu). | FSD §9.1 (G5) | Item menu "Delete" kini `disabled` + `title` alasan; `F.rowMenu` diberi dukungan `disabled`/`reason`, plus gaya `.rowmenu__item[disabled]`. |
| F5 | Field **Status disembunyikan** saat buat kelompok baru — kontrak mematok lahir aktif; Figma menampilkannya sebagai field mati. | FSD §9.1, CLAUDE.md (status terpatok = field disabled) | Status selalu tampil; **disabled "Active"** saat create, aktif saat edit, hint berbeda per mode. |
| F6 | Kolom "Sejak"/"Dibuat" di Figma menyebut **aktor** (`created_at · created_by`); build hanya tanggal. | Figma (contract-faithful, ERD punya `created_by`) | Sel Created = tanggal + nama pembuat; `created_by` ditambahkan ke seed `PAID_GROUPS`/`MAPPINGS`. |
| F7 | Nama kelompok di grid Task List tanpa kode `PWG-…` (Figma menampilkannya). | Figma | Kode dirender sebagai sub-baris redup. |

Sengaja **tidak** mengikuti Figma: kotak pencarian inline (standar rumah = tombol Filter + modal, dipakai seluruh build); aksi baris berupa teks link "Ubah/Hapus" (→ "Action ▾" / `.rowbtn`); footer modal split Batal-kiri (→ dua tombol menempel kanan-bawah); brand & nav Mythos (→ shell SEVAKA); Bahasa Indonesia (→ build English).
Kolom di luar kontrak yang **dipertahankan** (join baca-saja, mendukung cerita Anti-Kompresi): Group List `Code` + `Referenced by a mapping`.

## D. Rencana build (3 halaman)
- `productivity-project-active.html` — grid + create form + modal detail/edit (nama, status dropdown, panel anggota **dengan Add**), gerbang 422 archive-has-open-task.
- `productivity-project-archive.html` — grid `state=ARSIP`, modal restore, demo 422 `PROD_PROJECT_ARCHIVED`.
- `productivity-tasks.html` — sub-tab segmented **My Tasks | Task Category**; grid task (filter lengkap), form create, modal detail/edit + **panel Riwayat**, gerbang 422 transition-invalid; grid kategori (6 seed) + form + 409 in-use; switch persona Dedi/Hesti.

## D6. Cek gap — Forms & Survey (Forms · My Submissions) (18 Agustus 2026)

Acuan: `FSD-001-PRODUCTIVITY-0.1` §10 (FRM-A1–A7) & §11 (MS-A1–A6) · `UIC-001-PRODUCTIVITY-0.1` §5.2–§5.14 (#51–#71). Referensi: 9 screenshot Figma "Mythos HRIS · Productivity / Forms · My Submissions".

### Gap dokumen yang ditutup di build ini
| # | Gap sebelum | Kontrak |
|:--|:--|:--|
| F1 | Nol filter/pencarian pada grid Forms — `POST /forms/search` punya `form_title`(LIKE)·`state`·`obligation`·`identity_mode`·`audience_scope`·`is_sensitive`. Ditutup: modal Filter rumah + ringkasan filter. | UIC §5.2 F4.04 |
| F2 | Nol aksi **Ubah/Tutup/Hapus** formulir padahal HR "susun+ubah+tutup". Ditutup: modal Edit form (PATCH), `state→DITUTUP` satu-arah, Delete dengan 409 `PROD_FORM_HAS_SUBMISSION`. | UIC §5.2 F4.03/F4.05 |
| F3 | Kunci atribut `identity_mode`/`is_sensitive` sesudah jawaban pertama tak pernah terlihat. Ditutup: kedua toggle nonaktif + callout 422 `PROD_FORM_ATTRIBUTE_LOCKED` di modal Edit. | UIC §5.2 |
| F4 | Panel Pertanyaan read-only. Ditutup: Add/Edit/Delete pertanyaan + narasi "aman meski sudah berjawaban" + 422 `ck_mst_form_question_choices_required`. | UIC §5.3 F4.06–F4.08 |
| F5 | Grid Jawaban Masuk tanpa affordance baris (screenshot: "Lihat →"). Ditutup: "View Detail" per baris → detail satu pengiriman (item dari snapshot beku) + riwayat sunting + catatan `log_data_access` sebagai prasyarat baca. | UIC §5.7 F4.15/F4.16 |
| F6 | Persona hanya HR Manager/Dept Manager, jadi gerbang sensitivitas ("wewenang dievaluasi terhadap `is_sensitive`, bukan peran") tak terbukti. Ditutup: persona **Sari · HR Staff** — baca formulir sensitif ⇒ 403 `PROD_FORM_SENSITIVE_READ_DENIED`, nol susun/ubah/tutup. | UIC §5.7, FSD §10 |
| F7 | My Submissions hanya memuat `state='TERBUKA'`. Ditutup: **atau grant aktif** untuk pemanggil (badge WINDOW GRANTED), dan menyunting formulir tertutup tanpa grant ⇒ 403 `PROD_WINDOW_GRANT_REQUIRED`. | UIC §5.4/§5.6 gerbang `PD-59` |
| F8 | Kolom "Status Saya" menampilkan nama field mentah (`already_submitted=true`). Ditutup: badge SUBMITTED / NOT SUBMITTED (UX: kolom status bukan tempat nama field). | FSD §11.1 |

### Sengaja **tidak** mengikuti screenshot
1. **Aksi baris**: screenshot memakai teks-link tunggal ("Agregat"/"Detail"/"Anonim"). Standar rumah: 1 aksi ⇒ satu `.rowbtn`; ≥2 aksi ⇒ satu **"Action ▾"** (`F.rowMenu`). Baris HR kini punya View Detail/Aggregate/Edit/Close/Delete ⇒ dropdown; Dept Manager tetap satu tombol "Aggregate". Semangat FSD §10.2 ("satu affordance per baris") tetap terjaga — tetap satu kontrol terlihat per baris.
2. **Detail 4 panel**: screenshot menumpuk 4 tabel dalam satu panel. Standar rumah melarang dua tabel bertumpuk ⇒ segmented sub-tab (Questions | Answers in | Not yet answered | Reopen window).
3. **Anotasi teknis di layar** (nama kolom/endpoint/kode error sebagai helper text di bawah tiap field) tidak dipindah apa adanya; dipadatkan jadi callout produk pada titik keputusan (gate Anonim×Wajib, kunci atribut, ambang agregat interim, batas pohon posisi).
4. **Bahasa**: layar tetap English penuh (label enum tetap kode kontrak: `TERBUKA`, `WAJIB`, `BER_IDENTITAS`).

### Tetap terbuka (bukan gap build)
- `PROB-SECURITY-076` — ambang minimum agregat 5 responden, ditandai INTERIM di layar Agregat.
- `PROB-FRONTEND-019` — "Document Templates" tetap item mati berbadge GAP.
- Formulir `is_sensitive=true` tidak ada di dataset (G6 positive-flow-only); gerbang sensitif dibuktikan lewat formulir sensitif yang dibuat sendiri dari composer.
