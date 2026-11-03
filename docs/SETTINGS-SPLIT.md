# Pemisahan menu kerja HR vs Settings

**Keputusan:** Theo, 3 November 2026 — menindaklanjuti masukan HR ("saya pusing kalau melihat semua ini,
bagian ini seharusnya tidak terlihat oleh HR") dan MOM 28 Oktober 2026 butir *Provisioning & Akses #2*
("Menu System Admin dan HR Admin perlu dipisah, field ditampilkan sesuai role, istilah teknis diganti
bahasa yang dipahami HR"). Acuan pola: Talenta (Mekari) — Settings terpisah, dikelompokkan per modul.

Ini **sengaja melanggar** kunci pohon menu kontrak (`_prototype/js/shell.js`). Dokumen kontrak belum
memisahkan menu setting/master dari menu kerja.

## Aturan

1. **Menu kerja** (`NAV` di `src/config/nav.ts`) hanya berisi pekerjaan harian HR: transaksi, antrean
   persetujuan, daftar karyawan, laporan.
2. **Master & setting** (katalog, kebijakan, aturan, konfigurasi, log sistem, akun & akses) tinggal di
   `NAV_SETTINGS`, satu section per modul (`slug` = `/settings/<slug>`).
3. Sidebar kerja boleh memuat **pintu** ke setting modulnya: `settingsDoor('<Modul> settings', '<slug>')`
   — dirender sebagai hyperlink kecil (ikon gear + panah), bukan menu.
4. Halaman kerja boleh menautkan setting-nya lewat `<PageShell settingsLink={{ label, to }}>`.
5. **URL halaman setting tidak diubah** (mis. `/time/time-off/settings`, `/company/branch`) supaya tautan
   lama tetap jalan. Sidebar Settings aktif karena `productForPath()` → `isSettingsPath()` mengenali path
   yang terdaftar di `NAV_SETTINGS` (exact atau anak path), bukan dari awalan `/settings` saja.
6. Breadcrumb halaman setting: `Settings › <Modul> › <Halaman>`.

## Peta perpindahan

| Section Settings (`slug`) | Isi | Asal di sidebar lama |
|---|---|---|
| Company (`company`) | Branch, Group Structure, Grade & Class, Cost Center, SBU, Vendor, Organization Configuration | section Company; System › Settings |
| Employee (`employee`) | Work Status, Email Domain, Reprimand Type, Materialization, Materialization Role Mapping, Employee Configuration | Employee Directory; Reprimand › Type Setting; Materialization |
| Users & Access (`users-access`) | Email and Phone Verification, Bulk Account Activation, Role Grant Rules, *Approval Rules (soon)*, *Watermark (soon)* | Employee Directory — tugas System Admin/IT (MOM #Provisioning 2), Global Setting (MOM Requisition #3, PDP #2) |
| Time Management (`time-management`) | Time Off, Attendance, Calendar & Holidays, Time Configuration | Time Off › Settings, Attendance › Settings, Calendar |
| Payroll (`payroll`) | Salary Settings, Payroll Configuration | Payroll |
| Finance (`finance`) | Finance Settings, Finance Security, Finance Configuration | Finance |
| Documents & Assets (`documents-assets`) | Document Templates, Document Category, Asset Category, Document Configuration | Company Management › Files/Assets; Document |
| Other Modules (`other-modules`) | Performance Configuration, Productivity Configuration | System › Settings |
| System (`system`) | System Log (Error Code, Trace ID), Change History, Personal Data Erasure, *Applications*, *Integrations* | Company Management › System Log; System |

Tetap di menu kerja (operasional HR): Directory, Organization, Mass Resignation, Bulk Import, PTKP
Adjustment, Temporary Assignment, Manpower Planning, New Joiner, Transition + tugas, Onboarding Closure,
Reprimand, Time Off Request/Balance, Attendance, WFH Permission, Overtime, Scheduler, On Call, Finance
transaksi, Salary Processing, Authorization, Productivity, Assets (list/assigned/disposal), Announcement,
Activity Log, Notification, Files.

## Menambah setting baru

1. Tambah leaf di section yang tepat di `NAV_SETTINGS` (bukan di `NAV`).
2. Beranda `/settings` dan ringkasan `/settings/<slug>` otomatis memuatnya.
3. Breadcrumb halaman: `[{ label: 'Settings', to: '/settings' }, { label: '<Modul>', to: '/settings/<slug>' }, { label: '<Halaman>' }]`.
4. Bila ada halaman kerja terkait, tambahkan `settingsLink` di `PageShell`-nya.

## Belum dikerjakan

- Pembatasan per role (Settings hanya untuk Admin) — sekarang hanya pemisahan tampilan. Menunggu matriks
  peran (MOM: "dipisahkan per peran Admin, HR, User").
- Approval Rules & Watermark (Global Setting) baru baris menu tanpa halaman.
- Settings Recruitment/ATS dan Performance masih di produk masing-masing.
