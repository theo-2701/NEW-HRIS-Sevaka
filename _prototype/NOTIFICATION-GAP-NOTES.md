# NOTIFICATION — GAP NOTES (design vs FSD-001-NOTIFICATION-0.1 / UIC-001-NOTIFICATION-0.1)

Sumber: `uploads/FSD-001-NOTIFICATION-0.1.md`, `uploads/UIC-001-NOTIFICATION-0.1.md`.
Kontrak service: **2 endpoint client-facing**, 1 menu (`Company Management → Notification`), Read + Update-lite. Nol Create/Delete (baris lahir dari event Kafka, backend-only).

## Halaman
| File | Kedudukan |
| :-- | :-- |
| `notification-inbox.html` (baru, + `js/notification-inbox.js`) | **Contract-faithful.** Semua elemen berjangkar FSD §1.1/§1.2 + UIC §2. Ini yang dipakai sebagai acuan build. |
| `inbox.html` (lama, dipertahankan) | Desain 3-pane rich (referensi Figma/Talenta). **Banyak elemen tanpa jangkar kontrak** — didaftar di bawah. Tidak dihapus. |

## Elemen di `inbox.html` yang TIDAK punya jangkar dokumen (GAP, kandidat dibuang)
1. **Rail kategori (20+ kategori: Approvals, Time Off, Payroll, …)** — `notification_type` adalah *katalog terbuka* (~50 nilai, TSD §6.1.5). Kontrak tidak mendefinisikan pengelompokan kategori; grid merender tiap baris dengan struktur sama (FSD §1.4). Filter yang ada di kontrak hanya `is_read` + `sort_by/sort_direction`.
2. **Delete / trash message** — nol endpoint delete. `is_read` tidak pernah kembali ke false, dan baris tidak bisa dihapus dari UI.
3. **Mark all as read** — kontrak hanya `PUT .../inbox/{id}/read` per baris (path variable tunggal, tanpa body/bulk).
4. **Preferences / Approval list buttons** — nol endpoint.
5. **Search messages / filter category** — nol query param pencarian teks (UIC §1.5: nol field tekstual bebas).
6. **Checkbox multi-select + bulk toolbar** — konsekuensi #3.
7. **Badge jumlah belum-dibaca di navbar bell + dot** — dinyatakan eksplisit sebagai larangan di FSD §2 ("badge jumlah belum-dibaca di navbar" = elemen liar). Di halaman baru, hitungan unread hanya ditampilkan sebagai teks toolbar dari data grid yang sudah dimuat, bukan endpoint counter tersendiri.
8. **Footnote retensi "2 tahun"** — nol jangkar kontrak.
9. **Detail pane 3-kolom (baca isi penuh + reply/action)** — kontrak nol endpoint detail per notifikasi; judul+isi sudah dirangkai backend dan dikirim di grid.

## Keputusan yang menyimpang dari CLAUDE.md, disengaja (dokumen menang)
- **Baris tanpa `reference_type`/`reference_id`** dirender sebagai teks "No linked record", **bukan** tombol disabled — FSD §1.1 eksplisit: "baris tanpa tautan, bukan tombol mati". Standar row-action rumah (disabled `.rowbtn`) dikalahkan kontrak di kasus ini.
- **Nol badge "kabar penting/alarm"** untuk golongan kabar penopang uang & hak (7 jenis, TSD §6.9.6) — perlakuan istimewa golongan ini backend-only (TSD §9.8); merendernya menyiratkan mekanisme UI yang tidak ada.
- **Nol kolom NIK/employee_id** — kotak masuk = data diri sendiri (STD §21.4).

## Yang ada di halaman baru & jangkarnya
| Elemen | Jangkar |
| :-- | :-- |
| Grid: Notification (judul+isi), Type, Received, Status, linked record | FSD §1.1 (mapping komponen → `notification_inbox.*`) |
| Filter **Status** (All / Unread / Read) | query `is_read` (opsional) |
| **Sort** (Newest/Oldest/Unread first/Read first) | whitelist `sort_by` = `created_at` \| `is_read` + `sort_direction`; nilai luar whitelist → 422 |
| Paginasi `.ph-foot` | query `page`/`size`, STD §11.1 |
| Klik baris (di luar tombol tautan) → toast "200 — marked read" | `PUT .../inbox/{id}/read`, `{notification-id}` **CARRIED** dari kolom `id` baris |
| Klik baris yang sudah dibaca → toast "200 — returned as-is (idempotent)" | TSD §2.3 aturan tambahan #1 — **dilarang** `ALREADY_READ` |
| Kolom `read_at` + timezone di badge Read | `read_at`/`read_at_timezone`, NULL selama `is_read=false` |
| Note scope `notification:inbox:read` / `:write`, seluruh role, `†` | UIC §2 gate mapping |

## Bell popover di top-nav (terhubung ke kontrak)
Sumber data tunggal: `window.SevakaNotif` di `js/shell.js` (3 baris `notification_inbox`, status dibaca dipersist ke localStorage). Popover dan `notification-inbox.html` membaca store yang sama — tandai-dibaca di salah satu langsung tercermin di keduanya.
- Item popover: judul + isi + `notification_type` + `created_at` + state unread.
- Klik item = `PUT .../inbox/{id}/read` (id CARRIED), toast 200 / 200-idempoten.
- Tab **All / Unread** = query `is_read`. Tab **Mentions** dibuang (nol jangkar).
- Tombol **Mark all read** dibuang (nol endpoint bulk); badge **"N new"** dibuang (elemen liar per FSD §2).
- Titik merah pada ikon bell dipertahankan tetapi kini didorong data (hilang saat nol unread) — indikator biner, bukan badge hitungan; dicatat sebagai keputusan sadar.
- CTA footer → `notification-inbox.html`.

## Tabel/kontrak tanpa layar (bukan gap)
`notification_delivery` — fully machine-driven, nol endpoint client-facing (UIC §3). Nol layar, disengaja.

## Bahasa
Halaman baru berbahasa **Inggris** mengikuti standar project (CLAUDE.md), sedangkan contoh screenshot dokumen berbahasa Indonesia. Konten kalimat notifikasi sendiri dirangkai backend (~50 cetakan, di luar cakupan FSD) — teks di grid adalah placeholder yang meniru dataset skenario positif.
