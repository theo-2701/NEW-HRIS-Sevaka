# SEVAKA HRIS — Prototype Conventions

Catatan standardisasi untuk **prototype HTML** di project ini. Tujuannya: setiap halaman tampil & berperilaku konsisten tanpa duplikasi markup. (Untuk codebase produksi React, lihat `SKILL.md`.)

---

## 1. Struktur file

```
index.html              # Dashboard
inbox.html              # Inbox (email-style, view-only)
css/
  colors_and_type.css   # Token design system (warna, tipe, spacing, radius, shadow)
  app.css               # Primitive bersama (topnav, sidebar, button, menu, chip)
  dashboard.css         # Style khusus dashboard
  inbox.css             # Style khusus inbox
  notifications.css     # Dropdown lonceng (dipakai semua halaman)
js/
  shell.js              # ⭐ SUMBER TUNGGAL topnav + sidebar (data-driven)
  dashboard.js          # Wiring interaksi shell (sidebar, menu, notif, dll.)
  inbox.js              # Logika halaman inbox (kategori, list, detail)
```

**Penamaan:** file & folder **lowercase** (`inbox.html`, `css/`, `js/`). Konsisten dengan konvensi tim.

---

## 2. Shell bersama (topnav + sidebar)

Topnav dan sidebar **tidak ditulis ulang** di tiap halaman. Keduanya dirender oleh `js/shell.js` dari data terpusat (`NAV`, `NOTIFS`, `PRODUCTS`). Ubah satu array → semua halaman ikut berubah.

### Cara memakai di halaman baru

```html
<div class="app">
  <header class="topnav" id="sevakaTopnav"></header>   <!-- mount point -->
  <div class="app__body">
    <aside class="sidebar" id="sidebar"></aside>        <!-- mount point -->
    <main class="app__main">
      <div class="app__scroll"> … konten halaman … </div>
    </main>
  </div>
</div>

<!-- Scripts: urutan WAJIB -->
<script>window.SEVAKA_PAGE = { dashboardActive: false, bellActive: false, notifDot: true };</script>
<script src="js/shell.js"></script>       <!-- isi mount point -->
<script src="js/dashboard.js"></script>   <!-- wiring interaksi -->
<!-- script khusus halaman (mis. inbox.js) di sini -->
```

### Konfigurasi per halaman (`window.SEVAKA_PAGE`)

| Key | Tipe | Arti |
|---|---|---|
| `dashboardActive` | boolean | Tile **Dashboard** di sidebar ditandai aktif (`is-on`). Jika `false`, tile jadi link ke `index.html`. |
| `bellActive` | boolean | Ikon lonceng diberi tint "halaman aktif" (`is-active-page`). |
| `notifDot` | boolean | Tampilkan titik merah unread di lonceng (default `true`). |
| `activeGroup` | string | ID grup sidebar yang dibuka & ditandai aktif saat load (mis. `'payroll'`). Cocokkan dengan `group` di array `NAV`. |
| `activeItem` | string | Label submenu yang di-highlight (`is-on`) di dalam `activeGroup` (mis. `'Payroll processing'`). |

Contoh nyata:
- `index.html` → `{ dashboardActive: true,  bellActive: false }`
- `inbox.html` → `{ dashboardActive: false, bellActive: true, activeGroup: 'company', activeItem: 'Notification' }`
- `payroll-processing.html` → `{ activeGroup: 'payroll', activeItem: 'Payroll processing' }`
- `payroll-compliance.html` → `{ activeGroup: 'payroll', activeItem: 'Compliance' }`

### Routing antar halaman (sidebar)

Sidebar adalah **satu komponen** (`js/shell.js`). Item submenu yang punya halaman nyata didaftarkan di map `ROUTES` (format key `'groupId::Label Submenu'`):

```js
var ROUTES = {
  'employees::Employee Directory':    'employee-directory.html',
  'employees::New Joiner Submission': 'add-employee.html',
  'payroll::Payroll processing':      'payroll-processing.html',
  'payroll::Payroll components':      'payroll-components.html',
  'payroll::Tax simulation':          'payroll-tax-simulation.html',
  'payroll::Compliance':              'payroll-compliance.html',
  'company::Notification':            'inbox.html'
};
```

Item yang ada di `ROUTES` otomatis jadi link (klik → pindah halaman). Item lain tetap placeholder (hanya accordion). **Untuk menghubungkan halaman baru:** tambahkan satu baris di `ROUTES` — tidak perlu menyentuh tiap halaman.

---

## 3. Aturan visual (ringkas — detail di design system)

- **Warna:** pakai token `var(--color-*)`. Ocean `--color-secondary-500` untuk aksi/aktif; Sky `--color-primary-*` untuk aksen; Mist `--color-mist` untuk background app. Jangan hardcode hex baru.
- **Tipografi:** Plus Jakarta Sans (heading), Inter (body/UI). Tanpa emoji.
- **Spacing:** 8-point grid.
- **Radius:** 8px button/field/chip · 10–12px card/popover · 999px pill.
- **Elevation:** `--shadow-inset-rim` pada field/secondary button · `--shadow-press` untuk hover/active (soft-press, bukan darken).
- **Bahasa:** satu bahasa per layar; default Bahasa Indonesia untuk surface end-user.

---

## 4. Menambah notifikasi / menu

- **Notifikasi lonceng** → tambah objek di array `NOTIFS` (`js/shell.js`). Sinkronkan dengan data Inbox (`js/inbox.js` → `messages`).
- **Item sidebar** → tambah di array `NAV` (`js/shell.js`). Gunakan nama ikon **Lucide**.
- **Kategori Inbox** → tambah tombol `.cat[data-cat]` di `inbox.html` + entri di `catMeta`/`messages` (`js/inbox.js`).

---

## 5. Checklist sebelum menambah halaman

- [ ] Pakai dua mount point (`#sevakaTopnav`, `#sidebar`) — jangan salin markup shell.
- [ ] Set `window.SEVAKA_PAGE` sesuai halaman.
- [ ] Urutan script: `shell.js` → `dashboard.js` → script halaman.
- [ ] Link CSS: `colors_and_type.css` → `app.css` → css khusus halaman → `notifications.css`.
- [ ] Gunakan token design system, bukan nilai hardcode.

---

## 6. Tanda `[...]` = nilai dinamis (`{}`)

Pada mockup/desain, teks dalam kurung siku — `[Year]`, `[Month]`, `[Transaction ID]`, `[Full Name]`, `[Resign Date]`, `[ID]`, dst. — **bukan teks literal**. Itu adalah **placeholder untuk nilai dinamis** (`{}`) yang harus diisi data nyata saat di-render.

**Aturan saat membangun prototype:**

- **Jangan render `[...]` apa adanya.** Ganti dengan data contoh yang realistis & konsisten dengan tone project (nama Indonesia, ID `CP0xx`, tanggal `dd Mmm yyyy`, mata uang Rupiah `1.234.567`).
- **Field periode/tanggal default ke real-time saat ini.** `[Year]` → tahun berjalan, `[Month]` → bulan berjalan (mis. `new Date().getFullYear()` / `MONTHS[new Date().getMonth()]`). Form "Add" muncul sudah terisi periode sekarang; form "Edit" memakai nilai record.
- **Placeholder input kosong** tetap pakai gaya placeholder standar (Silver `--fg-4`) — mis. `Input text here`, `Search here` — itu memang teks placeholder, beda dari `[...]` data.
- Saat data benar-benar belum ada (empty state), tampilkan kalimat empty-state yang jelas, **bukan** `[...]`.

---

## 7. Catatan per-halaman (log standardisasi)

Ringkasan struktur tiap halaman + komponen/CSS yang dipakai-ulang. Saat membuat
halaman baru, cek di sini dulu agar konsisten (jangan bikin komponen baru kalau
sudah ada).

### Finance service (FT1 · FT2 · FT3 · FT4 · FT5 · FT8 + ESS) — 7 halaman
Dibangun dari `uploads/FSD-001-FINANCE-0.2.md` + `UIC-001-FINANCE-0.2.md` (+ ERD). Semua halaman
memakai shell standar (`#sevakaTopnav`/`#sidebar`), `pg-shell` + `crumbs`, `tabnav`/`tabpanel`,
`dtable`, `sb--*` badge, `ovl` modal standar, dan `Flow.toast` untuk kode respons (201/200/202/422/409).

- **Files:** `finance-settings.html` · `finance-benefit-reimbursement.html` · `finance-loan.html` ·
  `finance-cash-advance.html` · `finance-disbursement.html` · `finance-security.html` · `finance-ess.html`;
  CSS unik di `css/finance.css`; dataset bersama di `js/finance-data.js` (aktor & angka = Dataset
  Skenario Positif: Budi Santoso / Sinta Dewi / Rahmat Hidayat / Ari Wibowo / Maya Puspita, `PTDIKA`);
  logika per halaman di `js/finance-*.js`.
- **Komponen baru (`css/finance.css`):** `fin-filters` (bar filter di atas grid), `fin-search`,
  `fin-cards`/`fcard`(+`--hero`), `ubar`/`ulegend` (entitled/used/reserved), `money`, `tick`,
  `fin-toggle`/`fin-switch`, `fchk` (checkbox), `gapbox` (state GAP terdokumentasi), `items`/`item`
  (baris nota repeatable), `ref` (tabel referensi statis), `drawer` (panel detail di bawah grid),
  `sumbox` (ringkasan read-only di modal), `idlink`, `tempty`, `k9` (callout keputusan≠status).
- **Pola kontrak yang wajib terlihat:** keputusan `approve`/`reject`/`decisions`/`decision` memberi
  toast **202 "diteruskan"** (status belum berubah); nilai server-authoritative tidak pernah jadi input;
  `remaining`/`mark_status`/`sisa plafon` ditandai *derived*; gerbang gagal muncul sebagai pesan error
  di modal, bukan layar terpisah.
- **GAP ditampilkan apa adanya, tidak dikarang:** `BR-S3` Disbursement History & `ESS-4` Reimbursement
  Taken → `gapbox` PROB-FRONTEND-016; kontradiksi akses `loan-limits` → note PROB-FRONTEND-018;
  posisi menu Keamanan Finance → note PROB-FRONTEND-014; date-change Cash Advance → note gap visual.
- **Sidebar:** section `Finance` di `js/shell.js` diperluas (Benefit Reimbursement / Loan / Cash Advance /
  Disbursement & Receivables / Finance Settings / Finance Security) + Employee Profile › Finance → ESS.
  Deep-link tab memakai hash (`#approval`, `#balance`, `#settings`, dst.) yang di-klik ulang saat load.

### Time Management — 9 halaman (`FSD-001-TIME-0.1` + `UIC-001-TIME-0.1`)
- **Files:** `time-calendar.html` · `time-off-request.html` · `time-off-balance.html` ·
  `time-off-settings.html` · `time-attendance.html` · `time-attendance-settings.html` ·
  `time-overtime.html` · `time-scheduler-index.html` · `time-scheduler-schedule.html` ·
  `time-oncall.html`; dataset bersama `js/time-data.js`, CSS unik `css/time.css`,
  logika per halaman `js/time-*.js`. Catatan build: `TIME-GAP-NOTES.md`.
- **Komponen baru (`css/time.css`):** `tm-days` (chip pola hari kerja read-only) & `tm-dayrow`/
  `tm-daytog` (editor 7 hari), `tm-cal` (kalender efektif bulanan + `tm-legend`), `tm-flags`/
  `tm-flag` (badge boolean katalog), `tm-lock` (penanda field terkunci di form), `tm-strip`
  (ringkasan angka di atas grid), `tm-num` (angka tabular, merah bila negatif), `tm-derived`
  (kotak pratinjau turunan-server di dalam form), `tm-punch*` (konsol tap gradien Sky→Ocean),
  `tm-matrix` (matriks kanal capture 4×2), `tm-roster`/`tm-cell` (grid roster tanggal×karyawan),
  `fchk--bare`, `dropdown__empty`.
- **Pola kontrak yang wajib terlihat:** setiap drawer keputusan memberi toast **200 "accepted and
  forwarded"** dulu, status final menyusul ±1,4 dtk (keputusan ≠ status); nilai turunan-server
  (Total Hari, Mode, Kategori, `crosses_midnight`, `assignment_source`, seluruh badge status)
  tampil sebagai `ctl--ro` atau `tm-derived`, tak pernah jadi input; field yang beku pasca-create
  memakai `tm-lock` + pointer-events off; layar baca-saja (Scheduler Index, Overtime Daily,
  Attendance Daily/Tap History, On Call Activity) **tanpa kolom Action sama sekali**.
- **SoD hidup:** aktor sesi `TimeData.ME = 'emp-hendra'`. Baris miliknya sendiri tidak pernah
  menampilkan Review/Approve; baris orang lain menampilkan. `hol-4` sengaja dibuat `emp-rina`
  agar jalur checker holiday bisa dicoba.
- **Sub-tab segmented** dipakai di Calendar (Working patterns / Effective calendar) dan Attendance
  (Daily summary / Tap history) agar tak ada dua tabel bertumpuk dalam satu panel.
- **Sidebar:** section `Time Management` di `js/shell.js` diberi route nyata; "On Call Activity"
  menuju `time-oncall.html#activity` (§11 bukan resource tersendiri, hanya jendela pandang
  tersaring atas `emp_overtime_request`).

### Document service — 9 halaman (`FSD-001-DOCUMENT-0.1` + `UIC-001-DOCUMENT-0.1`)
- **Aturan yang berlaku umum (hasil review):** filter >2 kontrol → satu tombol **Filter**
  (`data-filter-open="modalId"` + `data-filter-sum`) di **kiri** atas tabel, **search di kanan**,
  terpisah dari panel tabel; filter ≤2 boleh inline di kiri. Reset di dalam modal filter
  ditangani `[data-filter-reset]` (generik, di `js/document-data.js`).
  **Freeze column hanya untuk tabel yang punya kolom Action** (`dtable-wrap--act`); tabel
  tanpa aksi (riwayat versi, tugas per-penerima, picker penerima, grid audit) pakai
  `dtable-wrap--plain` (`css/document.css`) — scroll horizontal tanpa freeze. `dtable-wrap`
  polos = `overflow:hidden` (kolom terakhir terpotong) dan `--scroll` justru mem-freeze
  kolom pertama/terakhir di `finance.css`. Form field pilihan 2 opsi memakai **radio** (`radio-row`/`radio`),
  bukan segmented — segmented mudah tertukar dengan tombol. Tab besar memakai `tabnav`.
  Satu layar = **satu** primary button.
- **Files:** `document-company-files.html` · `document-employee-files.html` ·
  `document-other-files.html` · `document-templates.html` · `document-letter-issuance.html` ·
  `document-ess-files.html` · `document-categories.html` · `document-access-log.html` ·
  `document-verify.html` (publik, Rezim C — tanpa shell/topnav/sidebar, tanpa token).
  Dataset bersama `js/document-data.js`, CSS unik `css/document.css`, catatan build
  `DOCUMENT-GAP-NOTES.md`.
- **Satu mesin untuk empat layar berkas:** `js/document-files.js` melayani Company /
  Employee / Other / ESS Files — kontrak `A3`/`A4`/`A2` identik, yang berbeda hanya
  `owner_type`(+`owner_id`) dan kolom yang sengaja dikurangi per layar. Jangan bikin varian
  kedua modal Detail/Isi Berkas.
- **Komponen baru (`css/document.css`):** `doc-note` (+`--gap` kuning untuk `PROB-*`,
  `--hard` merah untuk batas keras), `doc-stats`/`doc-stat` (3 stat card laporan kumpulan),
  `doc-heads` (blok header respons gelap), `doc-viewer`(+`--inapp`), `doc-body` (naskah
  templat), `doc-roles`/`doc-role` (10 peran kanonik `A7`), `doc-tbar`, `doc-ctx` (strip
  karyawan terpilih), `vf-*` (halaman pemeriksaan publik).
- **Pola kontrak yang wajib terlihat:** `A3`/`A4` nol jejak akses, hanya `A2` menulis;
  `201` pada kedua cabang `A10`; `A11`/`A12` dieksekusi dari blok `letter` di `A4`;
  MENGETAT (seketika) vs MELONGGARKAN (usulan `has_pending_change`) = dua modal berbeda;
  `A7` pada kategori `SENSITIF` tombol mati **dan** `403`; dua bentuk baris jejak akses
  tidak diratakan; halaman publik nol `404` dan nol `cancel_reason`.
- **Sidebar:** grup `Company Management › Files` diisi 7 route; ESS `Employee Profile ›
  Files` → `document-ess-files.html`. Tiga layar yang menurut kontrak **belum punya baris
  menu** (`PROB-SERVICE-356`/`-407`) tetap dirutekan agar prototype bisa dibuka, dan
  masing-masing membuka dengan banner yang menyatakan utang itu apa adanya.

### `payroll-compliance.html` — Payroll › Compliance › PKWT Compensation
- **Shell:** `SEVAKA_PAGE = { activeGroup:'payroll', activeItem:'Compliance' }`. Route ditambah di `js/shell.js`.
- **Header:** `pp-head` + pill-tabs `comp-tabs/.comp-pill` (PKWT Compensation aktif; NPP Transaction / PPH 21 DTP / BPJS New Rate = stub `comp-stub`).
- **Tabel:** `pp-table comp-table` — header **sky-gradient putih** (khas halaman ini), kolom Employee beku-kiri + Action beku-kanan (sel beku di-override jadi putih). Kolom: Employee · Start/End Contract Date · Work Duration (Month) · **Amount** · **Payroll Period** · Action. Tombol baris `.action-btn` + menu `.comp-actmenu` (View detail / Edit / Delete).
- **Create form:** `comp-formpanel` (state `data-compstate="form"`, toggle via `showState`). Tabel editable `comp-table comp-formtable` (header sky, kolom checkbox+Employee ID beku-kiri 2 kolom, `×` beku-kanan): checkbox merah, Employee ID, Employment Status, Start/End date (`ctl--date` → buka **modal date-picker** `#compDateScrim`, reuse `.dp__*`), Work Duration (`comp-monthfld` input dibatasi **1\u201312** via `clampMonth`), Amount (`pp-money` IDR), tombol hapus **merah penuh** `comp-rowdel` (mengikuti mockup, bukan ghost). "Add Employee" → Select Employee modal → isi baris. Create New → buka form kosong.
- **Toolbar:** `pc-period` (All Period + menu), `btn--secondary` Filter, `pc-iconbtn` (export=`file-output`, bulk=`file-input`), `pc-help`, `pc-search`.
- **Footer:** `comp-foot` custom — "Showing [select] from N row" + pager first/prev/page/next/last.
- **Modal (semua reuse):**
  - All Filter → `modal--sheet modal--filter` + `filter-block`/`check-red`/`add-filter` (employee-modals.css). Blok: Status, Employment status, Branch, Organization. Empty-state funnel + Add Filter.
  - Select Employee (dari Create New) → `ae-assign` 2 kolom (kiri list/filter pane, kanan selected) — pola sama dgn tax-simulation `trEmpScrim`.
  - Export Payment Compensation Simulation → `modal--sheet modal--export`, field `fld`/`ctl--select`/`ctl--date`.
  - Bulk Update/Add Compensation → `modal--sheet modal--bulk`, `imp-file` (template) + `imp-upload` (choose file).
  - Delete confirm → `modal--confirm` + `btn--danger`.
- **File:** `css/payroll-compliance.css` (hanya bit unik), `js/payroll-compliance.js` (self-contained: dino avatar, openModal/closeModal, toast, table render, semua wiring modal).
- **Catatan:** header tabel sky-gradient adalah pola visual **khusus Compliance** (sesuai mockup) — tabel modul lain tetap header polos `pp-table`.

### Settings service — 3 halaman (`FSD-001-SETTINGS-0.2` + `UIC-001-SETTINGS`)
- **Files:** `settings-configuration.html` (menu 1–8, kontrak `A1` baca / `A2` tulis) ·
  `settings-change-history.html` · `settings-erasure-requests.html`. Dataset bersama
  `js/settings-data.js`, engine `js/settings-configuration.js`, CSS unik `css/settings.css`.
- **Satu mesin untuk delapan menu:** kontrak `A1`/`A2` identik di semua menu; yang berbeda
  hanya **subset `setup_code`** yang dirender & dikirim. Jangan bikin varian kedua tabel
  konfigurasi — tambah entri di `S.MENUS` (`js/settings-data.js`) saja.
- **Sub-menu diturunkan dari prefix `setup_code`,** bukan dari kolom tersendiri. Urutan tab
  mengikuti peta menu yang dibekukan; urutan baris di dalam tab dikunci oleh urutan
  `setup_code`. Menu `organization` sengaja tanpa sub-menu (kode `UPPER_SNAKE_CASE`, tak
  bertitik) — derivasi berhenti satu langkah lebih awal.
- **Tab menu** memakai `tabnav`/`tabnav__tab` + `tabnav__count`; sub-menu memakai segmented
  `.seg`/`.seg__btn[data-sub]` (standar CLAUDE.md: tak pernah dua tabel bertumpuk).
- **Gate peran (`#gate`):** kelas peran `FULL` melihat semua menu; peran terbatas hanya menu
  pada `r.menus` — sisanya menampilkan panel gate, bukan tabel kosong. Baris milik platform
  (`S.LOCKED_CODE`) **tidak dikirim sama sekali** oleh `A1` (bukan dikirim lalu disembunyikan);
  baris pensiun tetap dikirim dengan penanda.
- **Utang kontrak ditampilkan apa adanya** lewat `doc-note` (`info` / `gap` kuning / `hard`
  merah), per-menu di `NOTES` + `GENERIC` untuk yang berlaku umum: `PROB-FRONTEND-034`
  (label baris masih machine name), `PROB-FRONTEND-035` (jangkauan tombol Save tak
  terkontrak), `PROB-SERVICE-442` (TSD vs ERD saling menolak soal gate `REQUIRED`),
  `PROB-INFRA-023` (dev server tak terjangkau sejak 03 Agu 2026 — belum ada panggilan nyata).
- **Sidebar:** `SEVAKA_PAGE = { activeGroup:'settings', activeItem:'Time' }`; tautan riwayat
  per-menu ke `settings-change-history.html#<menu>`.
