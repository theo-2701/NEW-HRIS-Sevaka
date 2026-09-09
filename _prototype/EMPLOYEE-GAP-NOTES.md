# Catatan GAP — Modul EMPLOYEE (Figma vs Build)

> **Tujuan.** Merangkum semua **selisih (gap)** di modul Employee — khususnya **perbedaan antara desain Figma dan build (halaman jadi)** — beserta **apa yang berbeda dan kenapa**.
>
> **Penegasan utama (baca ini dulu).** **Build saat ini TIDAK menyimpang dari dokumen.** Acuan kebenaran adalah **FSD-001-EMPLOYEE-0.1** + **UIC-001-EMPLOYEE-0.1** (turunan TSD/ERD). Figma adalah **referensi sekunder** untuk ide layout, **bukan** sumber bentuk data. Setiap tempat build "berbeda" dari Figma, perbedaan itu justru **untuk mengikuti kontrak** (FSD/UIC) atau **standar Design System** — bukan penyimpangan. Gap yang belum punya backing kontrak **tidak dirender sebagai fitur jadi**; ia ditandai **GAP** di layar dan diangkat ke jalur meeting.
>
> **Dasar catatan.** Analisis Figma↔kontrak sudah dilakukan di dokumen (FSD §7 & Ringkasan GAP, UIC §13); catatan ini mengonsolidasikannya + menautkan ke bukti anotasi yang sudah tampil di dalam build.

---

## 0. Prinsip yang dipakai (dari CLAUDE.md project)

- **Dokumen = source of truth.** Field, status, dan flow mengikuti FSD (fungsional) + UIC (kontrak UI). Bila Figma dan kontrak berbeda → **kontrak menang**.
- **Figma = referensi sekunder.** Kalau Figma menambah field di luar kontrak → **di-flag, bukan diam-diam ditambahkan**.
- **Fungsional-ekuivalen boleh beda tampilan.** Bila build berbeda dari Figma tetapi setara fungsinya (mengikuti kontrak lebih setia), build dipertahankan dan alasannya dicatat — bukan menyamakan buta ke Figma.

---

## A. GAP KONTRAK — elemen ada di desain, backing kontrak belum penuh

Ini kategori gap paling penting: elemen yang **muncul/tersirat di desain UI** tetapi **belum punya kontrak endpoint/data penuh** di TSD §7. Di build, elemen ini **tetap digambar** (agar cerita layar utuh) namun **ditandai GAP** dan **tidak diperlakukan sebagai fitur final**. Sumber: FSD §7 (Ringkasan GAP) + UIC §13.

| ID | Menu / Screen | Apa yang berbeda / kurang | Kenapa (alasan gap) | Bagaimana ditangani di build |
| :-- | :-- | :-- | :-- | :-- |
| `PROB-FRONTEND-002` | Employee Directory › DIR-GRID / DIR-DETAIL | Kolom **Name** dan **Unit/Branch** **bukan** kolom `emp_work_detail` — hasil **join projection** lintas-service (auth + company). | Ketersediaan field proyeksi bergantung **kontrak read gabungan** yang belum ditegaskan. | Kolom tetap tampil; diberi **GAP legend "GAP · PROB-FRONTEND-002"** + tag `projection` di blok Position & identity detail. Tidak diklaim sebagai kolom employee. |
| `PROB-FRONTEND-005` | Manpower & Requisition › MP-OVERVIEW | Kolom **Actual** & **Gap** headcount = **hasil hitung** (target − posisi aktual), bukan kolom tabel. | Perhitungan butuh **agregasi posisi dari company-service**; kontrak read agregat belum ditegaskan. | Kolom Actual/Gap tampil dengan **note info** eksplisit: "computed against the live position count in company-service". |
| `PROB-FRONTEND-004` | New Joiner › NJ-LIST | Daftar calon (filter/pagination) ditampilkan, tapi **kontrak read/list `NJ-LIST` belum ditegaskan** sebagai endpoint. | Endpoint list new joiner belum ada di §7 (yang ada: create/approve/materialize). | List dirender dari data contoh; struktur mengikuti pola envelope grid UIC §1.5 agar siap saat endpoint di-spesifikasi. |
| `PROB-FRONTEND-003` | Transition › TASK-CARD / TR-CLEARANCE | Aksi **Waive task** (`task_status = WAIVED`, kontrol D3 STANDARD/ELEVATED) **jelas di model data**, tapi **endpoint waive belum eksplisit** di TSD §7.6. | Perilaku ada di TSD §6.6/§12, endpoint belum di-spesifikasi. | Tuas waive digambar sebagai arsitektur siap (kontrol + audit), ditandai **GAP kontrak** (UIC §13 poin 1). |
| *(type-setting)* | Reprimand › RP-TYPE-SETTING | **CRU** `cnf_reprimand_category` / `cnf_reprimand_policy` (dual-mode **DIRECT/ACCUMULATIVE**) **belum di-spesifikasi sebagai endpoint** di TSD §7.7. | Kebutuhan UI ada, kontrak endpoint belum. | Bagian ACCUMULATIVE dirender **"arsitektur siap · enforcement ditunda"**; halaman memasang **note "GAP — CRU endpoints …"** di atas form. |

> Kelima butir ini sudah/akan tercatat di jalur `prepare-4-meeting/` (kategori `frontend`/`service`). Resolusi = tambah kontrak di TSD §7 dulu, lalu UIC & build menyusul.

---

## B. Perbedaan Build vs Figma yang DISENGAJA (demi kesetiaan kontrak)

Hal-hal berikut adalah tempat build **tampak menambah / mengubah** dari mock Figma. Semua dilakukan **karena kontrak (FSD/UIC) menuntutnya** — jadi ini **kesetiaan**, bukan penyimpangan. Bila Figma tidak menampilkannya, itu karena Figma memang lebih ringkas / belum meng-cover aturan data.

| Menu / Screen | Yang berbeda dari mock Figma | Kenapa (rujukan kontrak) |
| :-- | :-- | :-- |
| Employee Directory | **Masking PII**: `account_number`/`account_holder_name` hanya 4 digit terakhir; `nik` termasking sebagian; `id_card_number`/`passport_number` tak muncul di grid. Blok Position & identity ditandai proyeksi. | UIC §1.8 (masking wajib ditegakkan backend); FSD §1.1. Akses PII subjek lain memicu **read-audit**. |
| Employee Directory | Search = **form kriteria (body `POST /employees/search`)**, bukan query-string; tiap field menolak `<`,`>`/kutip skrip. | UIC §1.3/§1.4/§9 (search = POST, validasi regex). |
| PTKP Adjustment | **Checkbox atestasi wajib** mengunci simpan; **verifier ≠ pemohon**; basis pajak **immutable** (server-authoritative, log append-only). | FSD §2.1/§2.2; UIC §8.1 (`attestation` harus `true`, 403 bila verifier = pemohon, log immutable CD-016). |
| Manpower & Requisition | Requisition **DRAFT-first**: create → `DRAFT`, lalu **Submit/Approve** terpisah (maker→checker, SoD). | FSD §3.2/§3.3; UIC §3.2; CLAUDE.md "Draft-first maker/checker". |
| New Joiner | **DRAFT-first** ("Save as draft"); field **bercabang `nationality` (MbV)** — KTP 16 digit *atau* paspor, tak muncul bersamaan; KTP dikirim **transient (never persisted raw)**; **approve → sibling auto-REJECTED**; **Idempotency-Key** saat materialize. | FSD §4.1–4.3; UIC §4.1–4.3 & §1.7 (MbV, transient, dedup identitas, idempotensi). |
| Transition | **State task 7 varian** (bukan diratakan); **clearance gating** menahan terminal offboarding; **force-release** teraudit; flag **timed_out_at** = badge "lewat tenggat" tanpa mengubah state. | FSD §5.1–5.4; UIC §5.2/§5.3 (`timed_out_at` flag pendamping, clearance blocking, VAL-HRIS-119). |
| Reprimand | **Snapshot server-authoritative** — client **tidak** kirim `point/validity/level_order/is_terminal`; **checker ≠ maker ≠ subjek**; teks `reason` **disembunyikan** di grid lintas-subjek; standing **derive-on-read** dari snapshot. | FSD §6.1/§6.2; UIC §1.9/§7.1–7.3 (server-authoritative, PII, VAL-HRIS-116/123). |
| Mass Resignation | **DRAFT-first** ("Save batch as draft"); **dry-run blast-radius**; **selection_hash** dibekukan saat approve, **mismatch → 409**; **rank-guard** + **larang self-resign** (baris diri terkunci); **circuit-breaker** halt/resume + **batch correlation id**. | FSD §7.1–7.3; UIC §6.1–6.5 (anti-TOCTOU hash, rank-guard, CD-015). |

> Anotasi bantu di build (chip endpoint, scope banner, GAP legend, note kontrak) adalah **penanda keterlacakan build contract-driven** — bukan bagian UI produksi. Boleh disembunyikan tanpa mengubah fungsi layar.

---

## C. Selisih Design System vs Figma/guide (memengaruhi tampilan layar Employee)

Ini bukan gap konten Employee, tetapi **selisih komponen Design System** yang sudah dibakukan di project dan dipakai di semua layar Employee. Sudah terekonsiliasi dan didokumentasikan lengkap di **`DS-UPDATE-REQUEST.md`**. Ringkas:

- **Form field**: build pakai **36px + border Silver + fill Cloud** (DS lama menyebut 42px + inset-rim). Mengikuti spec Figma terbaru → DS perlu diselaraskan (*konflik, sudah diajukan*).
- **Komponen baru** yang belum ada di DS: choose-file, input uang "RP", tombol Action tabel, tombol "Add…", tombol remove ghost, breadcrumb, tab underline, freeze-column table. Semua sudah dipakai di layar Employee.
- **Modal scrim frosted-glass**: build memakainya (konflik dengan guide lama yang melarang blur) — sudah di-flag untuk diresmikan.
- **Navbar 64px** (ikut kit) vs README DS 92px — minta dikunci satu angka.

> Semua butir C mengikuti **Figma sebagai acuan utama** (sesuai ReadME Figma: "UI Figma lebih update dari FSD"). Jadi layar Employee **tetap setia ke Figma** untuk visual, dan selisihnya adalah **DS yang perlu menyusul** — bukan build yang menyimpang.

---

## D. Penegasan kesetiaan per menu (build ↔ dokumen)

| Menu | Screen (Figma) | Dokumen acuan | Status build |
| :-- | :-- | :-- | :-- |
| Employee Directory | HOME · DIR-GRID · DIR-DETAIL | FSD §1 · UIC §2 | **Setia** (masking + join-projection di-flag) |
| PTKP Adjustment | PTKP-ADJUST | FSD §2 · UIC §8 | **Setia** |
| Manpower & Requisition | MP-OVERVIEW · MP-CREATE · REQ-CREATE · REQ-APPROVE | FSD §3 · UIC §3 | **Setia** (gap hitung di-flag) |
| New Joiner | NJ-LIST · NJ-CREATE · NJ-APPROVE · NJ-MATERIALIZE | FSD §4 · UIC §4 | **Setia** (list contract di-flag) |
| Transition | TR-CREATE-* · TR-DASHBOARD · TASK-CARD · TR-CLEARANCE | FSD §5 · UIC §5 | **Setia** (endpoint waive = gap) |
| Reprimand | RP-CREATE · RP-APPROVE · RP-STANDING · RP-TYPE-SETTING | FSD §6 · UIC §7 | **Setia** (type-setting CRU = gap) |
| Mass Resignation | MR-DASH · MR-CREATE · MR-APPROVE · MR-APPROVED · MR-PROCESS · MR-HALT · MR-RESUME | FSD §7 · UIC §6 | **Setia** |

**Kesimpulan.** Tidak ada layar Employee yang menyimpang dari FSD/UIC. Selisih terhadap Figma seluruhnya masuk salah satu dari: **(A)** gap kontrak yang sengaja ditandai dan tidak dijadikan fitur final, **(B)** penyesuaian demi mengikuti kontrak, atau **(C)** selisih Design System yang perlu diselaraskan ke Figma. Semuanya sudah tercatat & diangkat lewat jalur perubahan dokumen, bukan ditambal di layar.

---

## Changelog

| Versi | Tanggal | Perubahan |
| :-- | :-- | :-- |
| `0.1` | 16 Juli 2026 | Rilis awal catatan GAP Employee. Konsolidasi 5 gap kontrak (FSD §7 / UIC §13), 7 perbedaan build↔Figma yang disengaja demi kontrak, selisih DS (rujuk DS-UPDATE-REQUEST.md), + penegasan kesetiaan per menu. |
