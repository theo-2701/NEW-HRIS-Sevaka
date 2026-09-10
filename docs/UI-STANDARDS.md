# Standar UI SEVAKA HRIS (versi React)

Aturan visual & interaksi yang **wajib** diikuti setiap layar. Sumbernya:

1. **`_design-system/`** — SEVAKA HRIS Design System resmi (rekonstruksi dari
   Figma `UI HRIS_V1.0`). Ini **sumber kebenaran tertinggi** untuk token,
   ukuran field, tombol, ikon, dan elevasi. Baca `_design-system/README.md`.
2. `_prototype/CLAUDE.md` + `_prototype/PROTOTYPE.md` — aturan produk hasil
   pembangunan prototype (aturan tabel, modal, draft-first, dsb.).

Kalau keduanya berbeda, **design system menang untuk urusan visual**; prototype
menang untuk urusan alur/produk. Selisih yang sudah diputuskan dicatat di
`docs/HANDOFF.md` §7.

---

## 1. Dokumen adalah sumber kebenaran

- Bangun sesuai **FSD** (fungsional) + **UIC** (kontrak UI). Field, status, dan alur
  harus cocok dengan kontrak.
- Screenshot Figma = referensi **sekunder** untuk layout, bukan untuk bentuk data.
  Kalau Figma menambah field di luar kontrak, **laporkan** — jangan diam-diam
  menambahkannya.
- Kalau implementasi berbeda dari Figma tapi setara secara fungsi, pertahankan dan
  jelaskan alasannya.

## 2. Token, bukan hex

Semua warna/tipografi/spacing lewat utility Tailwind yang dipetakan di
`src/styles/index.css` (`@theme`).

| Kebutuhan | Pakai | Jangan |
|---|---|---|
| CTA / aksi | `bg-secondary-500`, `text-secondary-700` | `bg-[#0284c7]` |
| Background app | `bg-bg-app` (Mist) | `bg-slate-50` |
| Teks utama / body / helper | `text-fg-1` / `text-fg-2` / `text-fg-3` | `text-gray-900` |
| Garis | `border-border-1` | `border-gray-200` |
| Radius | `rounded-md` 8px · `rounded-lg` 12px · `rounded-pill` | `rounded-[7px]` |
| Bayangan | `shadow-card-sm`, `shadow-overlay`, `shadow-inset-rim` | `shadow-md` |
| Font | `font-display` (heading), `font-body` (UI) | `font-sans` bawaan |

Spacing memakai grid 8 pt: `gap-2` 8px · `gap-4` 16px · `gap-6` 24px · `p-8` 32px.

### Ikon

Lucide, grid 24×24, **stroke 1.75** (bawaan Lucide 2 px terlalu tebal). Bobot
ini sudah dipasang global lewat `.lucide { stroke-width: 1.75 }` di
`src/styles/index.css` — jangan menimpanya per komponen. Ukuran lazim: 14 px di
tombol aksi tabel, 16 px di tombol, 18–20 px di ikon nav/topnav, 22 px di rail
sidebar. Tanpa emoji, dan jangan memakai karakter Unicode (`→`, `✓`, `▼`)
sebagai ikon.

### Logo & merek

Aset ada di `public/brand/`:

| Bagian | Bentuk | Dipakai di |
|---|---|---|
| Burung | `public/brand/sevaka-mark.svg` (satu warna, latar transparan) | favicon, ruang sempit, `<SevakaMark>` |
| Wordmark | **teks**, bukan gambar — `LOGO_TEXT` = `SEVΛKΛ` | `<SevakaWordmark>` |
| Lockup | burung + wordmark | `<SevakaLogo size="sm\|md\|lg">` — topnav (`md`) & kartu auth (`lg`) |

Aturan:

- Selalu lewat komponen `@/components/brand/SevakaLogo` — jangan menaruh
  `<img src="/brand/...">` atau menulis "SEVAKA" manual di halaman.
- Wordmark ditulis **`SEVΛKΛ`** — huruf Yunani **Λ** (U+039B) menggantikan A,
  itu disengaja. Ambil dari konstanta `LOGO_TEXT`, jangan mengetik ulang.
- Wordmark dirender sebagai teks (Plus Jakarta Sans Bold, tracking 0,02em,
  `text-brand`) supaya tajam di semua ukuran dan bisa diwarnai lewat class.
  Warna merek `--color-brand` (#72B5DD) diambil dari file logo, bukan dari
  skala Sky design system.
- **Tagline "Human Resource Information System" sementara tidak ditampilkan.**
  Kalau nanti dipakai lagi, tambahkan sebagai teks di `SevakaLogo`, bukan aset
  hasil trace (trace-nya menghasilkan warna dan tebal huruf tidak rata).
- Ukuran terpasang: topnav `md` (burung 40 px + teks 22 px), kartu auth `lg`
  (burung 56 px + teks 30 px).
- Jangan menskalakan tidak proporsional, memutar, atau memberi bayangan.
- Logo ini **dummy/sementara**. Saat versi final keluar, timpa
  `public/brand/sevaka-mark.svg` — seluruh pemakaian ikut berubah tanpa sentuh
  kode.
- **Splash layar masuk** (`<AuthSplash>`): mark di kartu putih + wordmark
  (huruf masuk bertahap) + tagline **"Your Intelligent HR Companion"** di atas
  gradien auth. Tahan ~2,1 detik, bisa dilewati dengan klik, dan hanya diputar
  **sekali per sesi** (`sessionStorage`). Kartu login masuk dengan
  `animate-card-reveal` setelahnya. Tagline ini satu-satunya tempat kalimat
  deskripsi aplikasi muncul selama tagline HRIS diparkir.
- File asli (hasil trace, dengan latar putih) diarsipkan di
  `_design-system/assets/logo-dummy/`.
- **Favicon**: `index.html` memasang SVG (`sevaka-mark.svg`) plus PNG 32px
  (`sevaka-mark-32.png`) sebagai cadangan. Setiap kali berkas logonya diganti,
  **naikkan query `?v=`** di ketiga tautan ikon — browser menyimpan favicon
  sangat lama, jadi tanpa itu tab masih memakai ikon lama meski file sudah baru.

### Gradien

Hanya **tiga** gradien yang sah: hero Sky→Ocean, latar auth, dan pil AI
"Summarize Data". Selebihnya permukaan solid.

## 3. Tombol — `@/components/ui/button`

- **Tanpa ikon** secara default. Ikon hanya untuk:
  1. tombol pembuka **dropdown** → hanya caret `chevron-down` di kanan;
  2. tombol **"Add …" di dalam form** (sub-form di dalam modal) → ikon **outline
     circle-plus** di kiri (pakai `<AddButton>`; jangan kotak plus solid).
- Tombol **"Add …" di header panel/section** (aksi kartu, bukan sub-form) =
  **teks saja tanpa `+`** → pakai `<PanelActionButton>` (36 px). Keputusan
  Theo, 09 Sep 2026; menang atas aturan `.add-filter` di design system.
- Aksi level halaman, tombol footer modal, tombol aksi baris tabel (View Detail /
  Review / Submit / Process) = **teks saja**.
- Ikon yang memang seluruh fungsinya ikon (hapus baris `×`/trash) tetap boleh.
- Item di dalam menu dropdown boleh punya ikon — itu menu, bukan tombol.

Varian: `primary` (Ocean, recessed glow) · `secondary` (Cloud + inset rim) ·
`danger` · `ghost` · `light` (di atas hero).

### Tangga tinggi kontrol — HAFALKAN

Tinggi kontrol **tidak boleh** dikarang per halaman. Hanya ada tujuh:

| Tinggi | Untuk | Komponen |
|---|---|---|
| **44 px** | tile sidebar (rail & baris level-1) | `Sidebar` |
| **40 px** | kontrol toolbar (search, filter, date range) & tombol "Add …" | `TableToolbar`, `<AddButton>` |
| **36 px** | **tombol umum, semua field form, tombol ikon, tombol aksi panel** | `<Button>`, `<Input>`, `<Select>`, `<PanelActionButton>` |
| **32 px** | kontrol paginasi, ghost hapus baris | `<Pagination>`, `<RemoveRowButton>` |
| **30 px** | tombol **di dalam baris tabel** | `<RowButton>`, `<RowActions>` |
| **28 px** | pil tab, pil AI "Summarize Data" | tab card, topnav |
| **24 px** | chip status | `<StatusBadge>` |

Detail tombol turunan:

| Tombol | Komponen | Spesifikasi |
|---|---|---|
| Aksi di baris tabel | `<RowButton>` / `<RowActions>` | **30 px** · border 1 px Fog + `shadow-inset-rim` · 11.5/700 Secondary-700 · ikon 14 px · hover Vapor + soft-press |
| Aksi tingkat panel/toolbar | `<PanelActionButton>` | **36 px** · putih + inset-rim · 13/700 Secondary-700 |
| "Add …" | `<AddButton>` | **40 px** · putih + inset-rim · 14/700 · ikon **outline circle-plus** 18 px Ocean di kiri (jangan kotak solid) |
| Hapus baris | `<RemoveRowButton>` | **32 px** transparan · "×" 16 px Silver → Error-600 di atas tint Error-50 |

`<Button>` sengaja hanya punya dua ukuran (`default` 36 px dan `icon` 36 px).
Butuh ukuran lain → pakai komponen di tabel atas, jangan menambah varian dan
jangan menulis `h-…` sendiri di halaman.

Hover/press seluruh sistem memakai **soft-press** (`--shadow-press`) — tidak
pernah opacity-fade atau scale.

## 4. Modal — `@/components/Modal`

Semua modal memakai komponen ini, jadi bentuknya seragam:

- header bertint `primary-50`: judul + deskripsi + tombol X, ada divider di bawah;
- **hanya body yang scroll** (panel `overflow-hidden` supaya sudut tetap membulat
  dan scrollbar ada di dalam);
- footer Mist dengan divider di atas;
- **kalau ada 2 tombol footer, keduanya berdampingan rata kanan-bawah.** Jangan
  `space-between`.
- Lebar: default 540px, `size="wide"` 720px.

Scrim modal memakai **frosted glass** — `--bg-scrim` (`rgba(17,24,39,.22)`) +
`--blur-scrim` (`blur(8px) saturate(1.05)`), panel diangkat `--shadow-popup`.
Blur **hanya** boleh di sini, tidak pernah sebagai dekorasi halaman.

**Modal vs halaman penuh:** aksi transaksional pendek (approve, cancel, PTKP
adjust, form satu keputusan) → modal. Proses siklus panjang bertahap (New Joiner,
Transition) → halaman penuh + stepper.

**Breadcrumb / kembali.** Halaman daftar memakai `<Breadcrumbs>` (rantai
`Home / Modul / Layar`). Pemisahnya **garis miring `/`** warna Fog — bukan
chevron — dengan jarak **8px** rata antar item dan pemisah (`.crumbs`). Item
yang punya `to` bisa diklik dan bergaris bawah saat hover; item tanpa `to`
hanya teks, dan item terakhir selalu tebal tanpa tautan. Halaman detail boleh
memakai `<BackLink>` — standar
`.crumb` design system: 12/700 UPPERCASE Secondary-600, garis bawah saat hover,
tanpa ikon. Dengan `<BackLink>` tidak perlu tombol "Back" di bagian bawah.

## 5. Tabel — `@/components/DataTable`

**Ukuran (standar `.dtable`, `_prototype/css/employee-flows.css`) — sudah
dipasang di `DataTable`, jangan ditimpa per halaman:**

| Bagian | Spesifikasi |
|---|---|
| Kontainer | radius 12 px · border 1 px Fog · `overflow:hidden` (varian aksi: `overflow-x:auto`) |
| Header | **gradien Sky `#9bd5ef → #8ccbe9`** · teks **PUTIH 14 px / 700** · padding **13 / 16 px** · nowrap · tanpa garis bawah |
| Sel | padding **13 / 16 px** · **13 px / 500** line-height 1.4 · Obsidian |
| Pemisah | garis Vapor antarbaris; **baris terakhir tanpa garis**; hover baris → Mist |
| Sel beku | isi **Sky-50**, rim 1 px Fog, hover **Sky-100** |
| Kolom sekunder | `muted` → Steel (padanan `.cell-dim`) |
| Kolom penekanan | `strong` → tebal Obsidian (padanan `.cell-strong`) |

Header memakai **Title Case** ("File Name", "Total Contract Duration"), bukan
huruf kapital semua.

Pembekuan kolom (`_design-system/table-standard.css`):

- **Bekukan kolom hanya kalau ada kolom Action.** Beri prop `actions` → kolom
  pertama (identifier) beku di kiri, kolom aksi beku di kanan, keduanya bertanda
  rim 1 px Vapor, dan tint hover ikut menyala di sel beku. Tanpa `actions`,
  tabel hanya scroll horizontal (padanan `.dtable-wrap--plain`).
- Kolom di antara keduanya **memang** scroll horizontal saat tabel lebih lebar
  dari panel — itu tujuan pembekuan, bukan bug. Jangan mengecilkan font atau
  memaksa semua kolom muat.
- **Header kolom Action dikosongkan** — tidak ada teks "Action".
- **1 aksi** → satu `<RowButton>` inline (jangan teks polos atau "—"; keadaan
  nonaktif = `RowButton` disabled).
  **≥ 2 aksi** → satu dropdown `<RowActions actions={[…]} />` berlabel "Action ▾".
- Tombol detail selalu berlabel **"View Detail"**.
- Jangan menumpuk dua tabel dalam satu panel. Pakai `<Segmented>` supaya hanya satu
  tabel tampil (pola Directory ↔ Organization).
- Nama/identifier yang bisa diklik memakai `text-fg-link`, tanpa garis bawah saat
  diam, garis bawah saat hover.

**Kartu dalam grid.** Kartu yang berjajar dalam satu baris grid (mis. kartu task
Transition) memakai `h-full` dan mendorong blok aksinya dengan `mt-auto`, jadi
baris tombolnya rata di seluruh kartu — tanpa celah menggantung di bawah kartu
yang isinya lebih pendek. Tombol aksi di kartu memakai `<RowButton>` biasa
(bergaris, 30px); varian `ghost` disimpan untuk ikon-only atau aksi yang benar-benar sekunder di dalam baris tabel.

**Tab halaman vs segmented.** Berpindah antar **muka halaman** (mis. PTKP
Adjust ↔ History) memakai `<TabMenu>` — tab bergaris bawah, label UPPERCASE
13/700, tab aktif Ocean dengan garis 3px, boleh membawa angka pendamping.
Memilih isi **satu panel** (mis. Directory ↔ Organization) tetap memakai
`<Segmented>`. Jangan memakai keduanya di layar yang sama.

## 6. Paginasi — `@/components/Pagination`

Footer rumah: kiri "Showing x–y of n" + pemilih baris/halaman; kanan ‹ / kotak
halaman / "of N" / ›. Pasang tepat di bawah tabel, jarak **8 px** (`mt-2`) —
sama seperti jarak toolbar → tabel, supaya ketiganya satu blok. Kalau induknya
punya `gap`, bungkus toolbar + tabel + paginasi dalam satu `<div>`.

**Aturan: setiap tabel `<DataTable>` punya paginasi + pemilih limit.** Default
10 baris/halaman, pilihan 10/25/50/100. Ini berlaku juga untuk grid kecil di
halaman profil (Family, Emergency Contact, Training, Working Experience) supaya
kontrol tabel konsisten di semua modul.

- Data datang sekaligus (mock/array di memori) → pakai `usePagedRows()`
  (`@/hooks/usePagedRows`); panggil `resetPage()` setiap kali filter/pencarian
  berubah.
- Data dari endpoint berhalaman → kirim `page`/`size` ke server (pola Employee
  Directory), jangan potong di klien.

Pengecualian sempit: daftar kecil **tetap** yang bukan grid (beneficiary, matriks
entitlement, whitelist) dan tabel-pilih di dalam modal.

## 7. Toolbar tabel — `@/components/TableToolbar`

- Semua kontrol toolbar **40 px** (`.doc-tbar`). Kotak cari mengikuti
  `.co-search`: min-width 260 px · isi Cloud · border 1 px Silver · ikon 16 px ·
  teks 13/500 · fokus Ocean + ring 4 px.
- **Filter di kiri, pencarian di kanan.** Filter dan pencarian **bukan hal yang
  sama** — kotak cari tidak pernah dihitung sebagai filter dan tidak pernah ikut
  masuk modal.
- **≤ 2 filter** → kontrol inline di toolbar.
- **3 filter atau lebih** → satu tombol "Filter" (`<FilterModal>`) yang membuka
  modal, plus ringkasan filter aktif di sebelahnya (`summary`). Tombolnya
  membawa jumlah filter aktif, mis. `Filter (2)`.
- **Criteria search** (Employee Directory) adalah pola tersendiri dari kontrak —
  panel kriteria dengan tombol Search/Reset, bukan toolbar filter. Jangan
  disamakan dengan aturan di atas.
- Jarak toolbar ke tabel **8 px** (`mb-2`) supaya toolbar terbaca sebagai
  bagian dari tabel, bukan blok terpisah. Bungkus toolbar + tabel + paginasi
  dalam satu `<div className="flex flex-col">` supaya `gap` kartu induk
  (16 px) tidak menyisip di antaranya.
- Header section (judul + deskripsi + endpoint chip + tombol aksi) diakhiri
  **divider** `border-b border-border-1 pb-3`, isi kartu `pt-4` — lihat
  `SectionCard` di `@/features/profile/components/ProfileBits`.

**Pilihan bercabang.** Bila tiap pilihan perlu penjelasan sendiri (mis. Resume
vs Cancel pada batch Mass Resignation, atau cabang WNI/WNA), pakai
`<RadioBranch>` — radio klasik **tanpa kotak pembungkus**, dengan judul dan
deskripsi di sebelah kanan tombolnya, memakai `<input type="radio">` sungguhan.
`<Segmented>` hanya untuk pilihan pendek tanpa penjelasan (mis. sub-tab tabel).

**Tanggal.** Semua pemilihan tanggal memakai `<DateField>` — pemicu 36px
bergaya field standar + ikon kalender, dan popover kalender `<Calendar>`
(port `.dp`: lebar 228px, tampilan hari → bulan → tahun lewat judul, footer
"Set Date"). Nilainya disimpan ISO `YYYY-MM-DD`, yang tampil format rumah
`12 Agu 2026`. **Jangan** memakai `<input type="date">` bawaan browser:
tampilan dan bahasanya ikut sistem operasi, jadi tidak pernah seragam.
Batas rentang lewat prop `min`/`max` (tanggal di luar rentang tidak bisa
diklik), dan rentang dua tanggal saling mengunci — lihat `CreatedRange` di
Employee Directory.

**Lebar field.** Lebar field ditentukan **kolom grid-nya**, bukan dikunci per
field. Jangan menempel `max-w-[…]` pada satu field — kalau ingin field pendek,
taruh di grid `md:grid-cols-2` yang sama seperti baris di atasnya supaya
tepinya tetap sejajar.

**Tangga z-index.** modal **2500** · menu, select, dan popover **2600** ·
toast **3000**. Popover harus di atas scrim modal, kalau tidak date picker di
dalam modal ikut tertutup.

## 8. Form — `@/components/form/*`

**Standar field (`_design-system/form-standard.css`) — angka ini mengikat:**

| Bagian | Spesifikasi |
|---|---|
| Kotak input | **36 px** · isi Cloud `#FAFCFE` · **border 1 px Silver `#94A3B8`** · radius 8 px · padding-x 12 px |
| Label | 16 px / 700 / Slate; tanda wajib `*` Rose. Jarak label → kotak **4 px** |
| Isi & placeholder | 12 px / 500 · line-height 1.4 · placeholder **selalu** Silver (`text-fg-4`) — termasuk placeholder palsu di trigger select / date picker |
| Fokus | border → Ocean + ring 4 px `rgba(2,132,199,.16)` |
| Textarea | kotak sama, padding `9px 12px` |

`--shadow-inset-rim` **tidak lagi dipakai** pada field default — border yang
membawa tepinya. Inset-rim tetap dipakai di tombol sekunder, tombol aksi tabel,
dan search box.

- Semua field lewat `TextField` / `PasswordField` / `SelectField` (abstraksi
  Formik). Jangan `<input>` telanjang atau `<Field>` Formik mentah.
- Validasi memakai Yup, satu file `validation.ts` per fitur.
- Alur **maker/checker draft-first**: kalau kontrak menyebut status awal **DRAFT**
  (requisition, new joiner, plan), form simpan sebagai DRAFT ("Save as draft") dan
  **Submit** adalah aksi terpisah yang memindahkan ke status approval. Jangan
  melompati DRAFT. Tampilkan status awal sebagai field disabled bila kontrak
  mengunci ke DRAFT.

## 8b. Topnav

Ikon di topnav (tambah, cari, notifikasi, aplikasi) adalah **ikon telanjang** —
area klik 36 px, latar transparan, hanya tint Mist saat hover. Jangan memberi
`bg-cloud` + `shadow-inset-rim`: kotak itu khusus kontrol yang bisa diisi
(search box, field). Titik notifikasi tetap menempel di ikon lonceng.

## 9. Status & badge — `@/components/StatusBadge`

Chip mengikuti `.sb`: **24 px** · padding 0 11 px · radius pill ·
**10.5 px / 700 UPPERCASE** tracking .05em · **titik 6 px** di depan label
(matikan dengan `dot={false}` hanya bila memang tak relevan).

`toneForStatus('APPROVED')` memetakan status kontrak ke warna chip. Tambahkan
status baru di `STATUS_TONES` supaya satu status = satu warna di semua modul.

## 10. Umpan balik — `toast()` dari `@/store/ui.store`

Kode respons kontrak (201/200/202/422/409) diumpanbalikkan lewat toast, bukan
alert. `toast('Data tersimpan.', 'ok' | 'info' | 'warn' | 'danger')`.

## 11. Placeholder `[...]` = nilai dinamis

Teks dalam kurung siku pada mockup (`[Year]`, `[Full Name]`, `[ID]`) **bukan teks
literal** — itu slot data.

- Jangan render `[...]` apa adanya. Isi dengan data realistis: nama Indonesia,
  ID `CP0xx`, tanggal `dd Mmm yyyy`, rupiah `1.234.567` (pakai helper di
  `src/lib/format.ts`).
- Field periode/tanggal default ke waktu berjalan. Form "Add" muncul sudah terisi
  periode sekarang; form "Edit" memakai nilai record.
- Placeholder input kosong (`Input text here`, `Search here`) tetap gaya
  placeholder (`text-fg-4`) — itu beda dari `[...]`.
- Saat data memang belum ada, tampilkan `<EmptyState>`, bukan `[...]`.

## 12. Bahasa

Satu bahasa per layar. Build saat ini: surface end-user (auth, dashboard) memakai
**Bahasa Indonesia**; istilah HR/enterprise (nama menu, label kolom kontrak) tetap
Inggris seperti di prototype. Tanpa emoji.
