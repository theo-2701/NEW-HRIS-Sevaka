# Audit Kontrak — Modul Terbangun vs FSD/UIC/TSD/ERD

> Audit 15 September 2026. Setiap modul yang sudah dikonversi dicocokkan langsung
> ke dokumen kontrak, **bukan** hanya ke prototype `_prototype/` dan `*-GAP-NOTES.md`.
> Prinsip: **dokumen menang** atas prototype dan Figma.

## 1. Sumber dokumen

Dokumen kontrak **tidak** ikut di zip `HR Information System_v.27082026` (zip itu
hanya membawa GAP notes, `PROTOTYPE.md`, `SKILL.md`). Salinan terbaru ada di:

```
HR Information System_v.21082026/uploads/
```

File bersufiks hash (mis. `FSD-001-EMPLOYEE-0.2-d9e38cf9.md`) identik byte-per-byte
dengan versi tanpa sufiks — diabaikan.

| Service | FSD | UIC | TSD | ERD | Modul di repo |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Auth | 0.7 | 0.14 | 0.23 | 0.11 | `auth`, unlock di `dashboard` |
| Employee | 0.12 | 0.27 | 0.13 | 0.9 | `employees`, `manpower`, `new-joiner`, `transitions`, `mass-resignation`, `reprimand`, `ptkp` |
| Employee Profile | 0.4 | 0.6 | — | 0.2 | `profile` |
| Time | 0.3 | 0.6 | 0.6 | 0.4 | `calendar`, `time-off`, `attendance`, `overtime`, `scheduler`, `oncall` |
| Finance | 0.2 | 0.2 | 0.3 | 0.2 | `benefit`, `loan`, `cash-advance`, `disbursement`, `finance-settings`, `finance-security` |

FSD/UIC Auth, Employee, Profile, dan Time memakai rilis **FE-terusan 15 September 2026**
(`HRIS-docs/New Source of Truth Docs - New Version/Dokumen HRIS/09_September/(150926)-FE-terusan/`);
TSD/ERD dan Finance tetap versi di atas. Company (FSD/UIC 0.9) ikut rilis itu tetapi modulnya belum dibangun.
Home/Dashboard kini dikontrakkan FSD-AUTH §2.9 (lima kartu HOME).

## 2. Mode data dummy

- `src/services/mock.ts` — satu saklar `MOCK = true`. Seluruh service memakainya.
- `src/services/api.ts` — interceptor axios **menolak setiap request sebelum keluar**
  selama `MOCK = true`, jadi tidak ada HTTP call walau `VITE_API_BASE_URL` terisi.
- Cabang `api.*` di setiap service ditulis mengikuti bentuk endpoint UIC
  (`POST …/search`, `PUT`, `…/approval`, `DELETE`) supaya siap dinyalakan nanti.
- CRUD berjalan di memori modul; reload halaman mengembalikan data dummy awal.

## 3. Pola yang ditegakkan lintas modul

| Pola | Kontrak | Implementasi dummy |
| :--- | :--- | :--- |
| **K9 — keputusan ≠ penulisan status** | Endpoint keputusan menjawab 200/202 "diterima"; status ditulis saat `workflow.process.completed` dikonsumsi | Service `decide*` hanya memvalidasi; `complete*Workflow` (mock) menulis status. Hook memainkan dua toast berurutan |
| Guard state | Aksi di luar status sah | TIME & Finance: 422 / 409 `FIN_ALREADY_DECIDED` sesuai UIC; Employee: 409 (UIC-EMPLOYEE §1.6 "konflik state") |
| SoD maker ≠ checker | Beda kode per service | Time 403 (On Call 422), Employee 409, Finance 403 |
| Field server-authoritative | Status/snapshot/timestamp tidak diterima dari klien | Dibekukan di service saat create |

## 4. Temuan & perbaikan per modul

### Time (commit `f54c8c5`)

| Modul | Temuan | Perbaikan |
| :--- | :--- | :--- |
| Calendar | Tolak libur mewajibkan catatan (FSD §1.4: opsional); keputusan menulis status langsung; overlap pola kerja tidak memeriksa rentang masa depan | Catatan opsional; pola K9; irisan rentang penuh |
| Time Off | Ubah/putus/tarik di luar status → 409 (UIC: 422); purpose akses medis tanpa `DISPUTE` | 422; K9; `DISPUTE` |
| Time Off Settings | `leave_code` hanya dikunci untuk statutory (UIC §5.1.3: semua jenis); batas panjang minimum karangan | Kunci semua; nama ≤150, alasan blackout ≤300 |
| Attendance | Tap ketiga ditolak 409 (punch append-only, UIC §6.1: selalu 201); koreksi 409 | Tap selalu direkam; koreksi 422 + K9 |
| Geofence | Nama minimal 3 karakter (karangan) | Wajib, ≤150 |
| Scheduler | Enum `CYCLE`/`FLEX`/`INDIVIDUAL`/`BULK` | `ROTATING`/`FLEXIBLE`/`INDIVIDUAL_OVERRIDE`/`BULK_UNIT` + `SYSTEM_CYCLE`; tukar shift K9; override ke shift nonaktif 422 |
| On Call | Status `ACTIVE`; SoD 403 | `ACTIVATED`; SoD 422 (UIC §11.6); K9 |
| Overtime | Logika sudah sesuai | Path API saja |

### Employee (commit `e402cf7`)

| Modul | Temuan | Perbaikan |
| :--- | :--- | :--- |
| Manpower | Tanpa guard state; server tanpa field wajib | 409 submit/approve/reject; 422 `position_title`/`headcount`/`justification`, periode rencana |
| New Joiner | Create langsung SUBMITTED; tanpa guard; materialize tanpa 409/410/422 | Create selalu DRAFT; guard 409; materialize 409 sudah / 410 kedaluwarsa / 422 tanggal & golongan; MbV KTP 16 digit / paspor |
| Transition | Tanpa exclusion; enum `MUTUAL` | 409 satu transisi struktural terbuka (TRANSFER/OFFBOARDING); 422 golongan tujuan PROMOTION/DEMOTION; guard task; `MUTUAL_TRANSFER` |
| Mass Resignation | Tanpa guard state | 409 submit/approve/reject/process/halt/resume/cancel-remaining |
| Reprimand | Maker = subjek 403 | 409; approve hanya IN_APPROVAL, revoke hanya ACTIVE |
| PTKP, Directory | Sesuai (verifier ≠ pemohon 403, masking rekening 4 digit) | — |

### Profile & Auth (commit `190a420`)

| Modul | Temuan | Perbaikan |
| :--- | :--- | :--- |
| Profile | Path `/me/*`; field HR-restricted tidak dijaga server; MbV & CHECK hanya di form | Path UIC; 403 ESS ubah `nationality`/`marital_status`; 422 paspor, domisili, relative wajib-minimal, bulan-tahun kerja, enum training |
| Auth | Tiga path login, dua path verifikasi, path reset lama; logout tanpa `force-logout`; unlock `/security/…` | `POST /auth/login` + `identifier_type`; `POST /auth/verify-otp`; `reset-password/request|confirm`; `force-logout SELF_LOGOUT`; `POST /auth/unlock-account` |

### Finance

| Modul | Temuan | Perbaikan |
| :--- | :--- | :--- |
| Loan (`3dfa87e`) | `FIN_MODULE_DISABLED` 403; cancel/putus 422; dispute hold memblokir keputusan; enum tenor | 422; 409 `FIN_ALREADY_DECIDED`; `/decisions`; hold hanya menggerbang pencairan; `UNIFORM`/`EVERY_MONTH`/`CUSTOM_LIST` |
| Cash Advance (`3dfa87e`) | Dibangun langsung dari kontrak | Enum selisih `OUTSTANDING` → `OPEN`; lapis tambahan = uang muka + kekurangan > batas jenis |
| Benefit | Dispute hold memblokir approve; putus/cancel 422; tanpa gerbang window/duplikat/penerima/slot | Hold tidak memblokir; 409 `FIN_ALREADY_DECIDED`; 422 `FIN_CLAIM_WINDOW_EXPIRED` (90 hari), 409 `FIN_DUPLICATE_RECEIPT`, 422 `FIN_BENEFICIARY_NOT_LISTED`, 422 `FIN_FAMILY_BENEFICIARY_SLOT_FULL` (maks 5); K9 menulis USAGE/RELEASE |
| Finance Settings | Prototype menandai lima sebab penolakan sebagai bawaan; nominal plafon 0 ditolak; unik golongan hanya antar baris aktif | Tepat satu bawaan ("Other", ERD `uq_mst_rejection_reason_system_default`); `limit_amount ≥ 0` sesuai TSD; unik antar baris belum dihapus (ERD `WHERE deleted_by IS NULL`, termasuk nonaktif); CRUD jenis keperluan & sebab penolakan tersedia di service walau layar baca |
| Finance Security | Seed hold terduplikasi di Benefit & Loan (statis, tak bisa dipasang/dicabut); jumlah baris ekspor acak; cabut lewat `…/release` di jangkar Figma | Satu `holds-store` dibaca Benefit, Loan, Pencairan; baris ekspor dihitung dari data modul; `PATCH /dispute-holds/{id}` (PROB-FRONTEND-017); pemasangan ulang = baris baru |
| Disbursement & Receivables | Dibangun langsung dari kontrak | Daftar diturunkan hidup dari tabel sumber (prototype memakai seed payable terpisah); mark-paid atomik (prototype menandai sebagian); `WITH_PAYROLL` ditolak juga untuk non-LOAN (TSD §3.3 poin 2); Super Admin tidak boleh declare-settled (FD-112); kolom `exit_date` prototype dibuang (bukan kolom ERD) |

## 4A. Sinkronisasi rilis FE-terusan (15 September 2026)

| Service | Perubahan dokumen | Penyesuaian di repo |
| :--- | :--- | :--- |
| Auth (FSD 0.7) | HOME: empat kartu grafik tanpa kontrak dihapus, diganti **lima kartu angka dua lapis** dengan alamat FINAL; sapaan dari `GET /auth/me` | `HomeStatCards`: lapis Milik Saya (sisa cuti tahunan #95, kehadiran bulan berjalan #96) + lapis Perusahaan untuk HR/manajemen (karyawan aktif §7.17, hadir & sedang cuti hari ini #97); gagal-sebagian tampil "—"; sapaan via `getMe` |
| Time (UIC 0.4–0.6, FSD 0.2) | Enam pintu persetujuan membalas baris saat ini + `decision_received: true`; grid Tukar Shift + `approved_by`, Roster Siaga + `created_by`/`approved_by`; dataset `corr-1` APPROVED | `DecisionAck<T>` di Holiday, Time Off, Koreksi Absen, Overtime, Tukar Shift, On Call; **Overtime dipecah K9** (`completeOvertimeWorkflow`); kolom Approved/Composed By; `cor-1` APPROVED + `day-rina-27` `APPROVED_CORRECTION` |
| Profile (UIC 0.3–0.6, FSD 0.3) | Path `/{employee-id}` (bukan `/me`); +`bpjs_tenaga_kerja_number`/`bpjs_kesehatan_number` ter-mask, penuh via reveal | Path & `reveal()` (read-audit); BPJS di detail/form, 422 bila bukan angka ≤20 |
| Employee (UIC 0.10–0.27, FSD 0.3–0.12) | NJ `candidate_phone` wajib (+62); PTKP `is_primary_employer` wajib + `dependent_claims` ≤3; MR `batch_title`; Type Setting kategori CRU (+`performance_weight`) & policy append-only (ACCUMULATIVE 422); waive `/transition-tasks/{id}/waive`; alamat search NJ/MR | Semua field & gerbang di atas; tanggungan PTKP dibaca dari keluarga Employee Profile; aksi Deactivate kategori dihapus (tak ada di kontrak); riwayat versi policy tampil |

**Belum dikerjakan dari rilis ini (dicatat, bukan dikarang):**

| Butir | Alasan |
| :--- | :--- |
| Bulk Import Karyawan (FSD-EMPLOYEE §8, 4 layar) | Menu baru — tidak ada baris sidebar (sidebar dikunci); perlu keputusan penempatan |
| Company (FSD/UIC 0.9) | Modul belum dibangun |
| Directory: `join_date`/`leave_date` di-omit untuk Dept Manager | Layar Directory belum punya pemilih peran |
| Picker unit/posisi (`group_struct_main_id`, `parent_pos_id`, `group_struct_pos_id`, `target_pos_id`) | UIC-EMPLOYEE G7 sendiri GAGAL — company-service belum mengontrakkan alamat lookup |
| Pintu baca HR atas keluarga karyawan lain untuk `dependent_claims` | `employee-relatives/search` terkunci ke pemilik token (UIC-PROFILE §3.3) |
| Kategori SP `level_order` ≥ 1 | Seed `VERBAL` memakai level 0; validasi form belum dinaikkan |

## 5. Koneksi antar modul (tanpa API)

| Dari | Ke | Pemicu |
| :--- | :--- | :--- |
| Time Off Request | Time Off Balance (ledger) | Cuti disetujui → `LEAVE_TAKEN`; ditarik / sakit ditolak → `LEAVE_REVERSED` |
| New Joiner | Employee Directory + Transition | Materialisasi → karyawan baru (`WAITING` bila join belum tiba) + transisi Onboarding |
| Benefit Claim | Benefit ledger + daftar pencairan | Workflow disetujui → `USAGE`, slot keluarga terkunci, payable `UNMARKED` |
| Benefit / Loan / Cash Advance | Pencairan & Piutang | Status `APPROVED` di modul sumber → baris `UNMARKED`; hold sengketa (dataset FT8) menggerbang penandaan |
| Finance Settings | Loan | Plafon aktif golongan dibaca saat pengajuan (`exposure.limitAmount`); nonaktif/hapus ⇒ ruang pinjam 0 untuk pengajuan baru |
| Finance Settings | Cash Advance | Daftar & gerbang jenis keperluan dibaca dari store Settings — jenis nonaktif ditolak 422 saat pengajuan |
| Finance Security | Benefit, Loan, Pencairan & Piutang | Hold dipasang/dicabut di layar ini → penanda di grid & modal Benefit, modal keputusan Loan, gerbang 422 `FIN_DISPUTE_HOLD_ACTIVE` mark-paid |
| Benefit, Loan, Cash Advance, Pencairan | Finance Security (ekspor) | Isi & `row_count` berkas dibaca dari data modul sumber / penanda pencairan |
| Employee Profile | PTKP Adjustment | `dependent_claims` divalidasi terhadap keluarga karyawan di Profile (422 bila bukan miliknya) |
| Time Off, Attendance, Employee | Home/Dashboard | Lima kartu HOME membaca saldo cuti, ringkasan kehadiran, dan cacah karyawan aktif |
| Pencairan & Piutang | Benefit (Disbursement History) | Tab riwayat membaca penanda yang sama (`marks-store`) — tidak ada seed payable kedua |
| Pencairan & Piutang | Cash Advance | Tanda `CASH_ADVANCE` → `disbursementMarked` (bantahan tertutup; dibalik → terbuka lagi); tanda `CASH_ADVANCE_SHORTFALL` → selisih `APPROVED` → `SETTLED` |

Hook keputusan memanggil `invalidateQueries()` tanpa kunci supaya layar modul
tujuan ikut memuat ulang.

## 6. GAP kontrak yang dibiarkan (tercatat, tidak dikarang)

| ID / sumber | Modul | Isi |
| :--- | :--- | :--- |
| `PROB-FRONTEND-049` | Transition | Endpoint waive task belum eksplisit; aksi waive/force-release dipertahankan |
| `PROB-SERVICE-056` | Reprimand | CRU kategori/policy (Type Setting) belum dispesifikasi |
| `PROB-FRONTEND-047` | New Joiner | Kontrak list NJ-LIST belum ditegaskan |
| `PROB-FRONTEND-048` | Manpower | Agregasi gap posisi dari company-service |
| UIC-EMPLOYEE §3.2 / §6 | Manpower, Mass Resignation | Endpoint reject tidak ada (status REJECTED/CANCELLED ada) |
| FSD-AUTH §2.5 | Auth | Kirim ulang OTP tanpa endpoint di UIC §3 |
| `PROB-FRONTEND-016` | Benefit | Disbursement History tanpa endpoint untuk ROLE_EMPLOYEE (label di tab) |
| UIC-FINANCE §5.7/5.8 | Cash Advance | Perubahan tanggal pulang tanpa frame FSD |
| `PROB-FRONTEND-018` | Finance Settings | Akses baca `ROLE_EMPLOYEE` atas `/loan-limits` kontradiktif (§6.1.5 tabel vs narasi & §14.1.9) — mock mengikuti tabel ringkasan |
| TSD §14.1.7 / §14.1.8 | Finance Settings | Seed-sample jenis keperluan tanpa daftar contoh baku dan seeding lima sebab bawaan belum dispesifikasi — tidak dibangun |
| Rejection reasons lintas modul | Benefit, Loan, Cash Advance | Modal tolak masih membaca seed sebab milik modul masing-masing; store Settings belum disambungkan karena layar Settings baca saja |
| `PROB-FRONTEND-014` | Finance Security | Menu belum ditempatkan di peta navigasi SAD §4.6 — posisi sidebar sementara |
| ERD §6.9 `log_export_download` | Finance Security | ERD tanpa kolom `scope`, padahal FSD KM-S1 menampilkan badge Scope — mock menyimpannya sebagai medan terpisah |
| TSD §18.5.4 poin 2 | Pencairan & Piutang | declare-settled wajib cek hold pada target yang sama, tetapi status tanggungan menunjuk karyawan, bukan pengajuan — pemetaan target belum dispesifikasi |
| TSD §18.3.1 | Benefit | Endpoint pembuka lampiran medis tersedia di service FT8 tetapi belum ada tombol di modal klaim Benefit |
| FSD §5.5 | Disbursement | Reverse tanpa frame FSD — dibangun dari UIC §6.2 op 5 sebagai aksi baris; efek balik atas selisih SHORTFALL yang sudah `SETTLED` tidak dispesifikasi (tidak dikembalikan) |
| TSD §6.5.5 `OUTSTANDING` | Disbursement | Peristiwa keluar karyawan (OF5) belum berkontrak — baris status tanggungan hanya dari dataset |
| Dataset FT5 vs FT4 | Cash Advance, Disbursement | `dif-78` diluruskan ke `APPROVED` (FT5 masih memuatnya sebagai payable); `adv-78` `disbursementMarked=true` tanpa baris tanda di dataset FT5 |
| Dataset FSD Cash Advance | Cash Advance | ADV-78: nota < uang muka tertulis SHORTFALL, definisi ERD = SURPLUS — seed tidak diubah |

## 7. Setelan skenario yang berbeda dari bawaan TSD

| Setelan | Bawaan TSD | Dipakai dummy | Alasan |
| :--- | :--- | :--- | :--- |
| `finance.loan.max_active_count` | 1 | 2 | Seed memegang dua pinjaman aktif untuk Budi |
| `finance.cash_advance.max_outstanding_count` | 1 | 3 | Seed memegang dua uang muka terbuka untuk Budi |
| `finance.cash_advance.enabled` | false | true | Dataset menyalakan modul |

---

## 8. Audit Company 23 September 2026 — repo 0.9/0.9 vs arsip terbaru 0.32/0.22/0.39/0.21

Company dibangun (Batch 5) memakai `FSD/UIC-001-COMPANY-0.9` — versi itu satu-satunya yang
ada saat modul dikerjakan. Belakangan ditemukan `HRIS-docs/.../September Handoff (Delivery)/`
menyimpan rilis jauh lebih baru yang belum pernah dibaca: `FE-220926` (22 September, FSD 0.32/
UIC 0.22) dan `BE/BE`+`BE-Fixing-Diagram-4th` (TSD 0.39/ERD 0.21). Metode: baca tabel
**Changelog** tiap dokumen dari versi yang dipakai repo sampai versi terbaru (dokumennya
sendiri terlalu besar dibaca utuh — FSD 271 KB, TSD 373 KB); setiap temuan diverifikasi ke ERD
untuk memastikan bukan sekadar rumusan dokumen yang berubah tanpa dampak kode.

**Enam delta ditemukan, keenamnya sudah diperbaiki di kode yang sama sesi ini:**

| # | Temuan | Sumber | Perbaikan |
| :--- | :--- | :--- | :--- |
| C1 | Cost Center & SBU menolak mode `DISABLED` dengan `403`, kontrak `422` (`VAL-HRIS-069`/`070`) | UIC 0.10 | `requireMode` di `company.service.ts` diganti jadi `422` |
| C2 | Branch Group menolak `403` saat `BRANCH_HIERARCHY_MODE=DISABLED` — janji itu **dicabut**; API tetap hidup berapa pun modenya, hanya visibilitas menu yang diatur mode | UIC 0.16 | Tiga panggilan `requireMode` di `branchGroups`/`saveBranchGroup`/`deleteBranchGroup` dihapus total |
| C3 | `BRANCH_GAP_FIELDS` mencantumkan Tax (NPWP/NITKU/KLU) dan Attendance Radius/Mobile sebagai GAP — keduanya `RESOLVED` sejak ERD 0.3 (04 Agustus 2026), kolom asli di `mst_branch` | ERD 0.21 §7.6 | `Branch`/`BranchDraft` dapat lima field baru; `BRANCH_GAP_FIELDS` menyusut jadi `['FAX']` saja (Signature/Logo bukan lagi konsep Branch — logo kini satu per perusahaan di Auth, tanda tangan surat diresolusi dari pemegang posisi ber-`can_sign_letter`, lihat §9 di bawah) |
| C4 | `zip.province`/`zip.city` dihitung ulang di FE tiap render (`deriveZip` dipanggil dari komponen tampilan) — kontrak menjadikannya kunci snapshot sendiri yang dibekukan saat baris dibuat | UIC 0.11, `PROB-SERVICE-787` | `ZipSnapshot` dapat field `province`/`city`; `deriveZip` hanya dipakai saat *menyusun* snapshot di `saveBranch`, `branchProvince`/`branchCity` membaca langsung dari snapshot |
| C5 | `mst_vendor.email` `RESOLVED` sejak ERD 0.3 — dokumentasi lama "kontrak tidak punya kolom surel" sudah usang | ERD 0.21 §7.13 | `Vendor`/`VendorDraft` dapat `email` (opsional, divalidasi format), kolom baru di `VendorPage` |
| C6 | `grade_code` dibangun sebagai field input klien wajib unik — sejak `T49` field itu **server-generated** `<level>.<huruf>` (level = kedalaman, huruf = peringkat `sort_order` ASC basis-26), dihitung ulang untuk seluruh saudara sekandung tiap create/reparent/reorder/soft-delete; duplikat lintas subtree disengaja | TSD 0.27 §7.3/§7.4, ERD §7.7.1 | `gradeCode` dikeluarkan dari `JobGradeDraft`, diganti `sortOrder`; `company.service.ts` menambah `recomputeGradeCodes()` yang dipanggil di `saveJobGrade`/`deleteJobGrade`; `rules.ts` menambah `letterFromRank`/`computeGradeCode` |

19 pengujian baru/diperbarui di `company.test.ts` (total 22, semuanya lulus).

### 8.1 Susulan 23 September 2026 — GS-11 dan `can_sign_letter` dibangun terhadap 0.32/0.22

Dua butir yang tadinya ditandai "belum dikerjakan" sudah dibangun di giliran yang sama, terhadap
versi terbaru (0.32/0.22) — **bukan** menyalin worktree Kiro yang memakai rilis lebih lama:

- **GS-11 "Pemetaan Modul → Struktur"** (FSD §2.1.1, UIC §2.3.1) — tab kedua baru di
  `GroupStructurePage` (disederhanakan dari "tab keempat" kontrak karena repo memang belum
  memisah Group/Level/Position jadi tab tersendiri; enam baris tetap TIME/FINANCE/PERFORMANCE/
  PRODUCTIVITY/DOCUMENT/EMPLOYEE, nol tombol tambah/hapus, baris kosong tetap terlihat, tulis
  hanya Super Admin/System Admin — `ModuleMappingCard.tsx`, `moduleGroupStructMaps`/
  `saveModuleGroupStructMap`/`clearModuleGroupStructMap` di `company.service.ts`).
- **`can_sign_letter` + Approver Kedua** (FSD §2.1.2, UIC §2.3.2) — field baru di `GroupPosition`,
  gerbang dua-tangan MENYALAKAN (`second_approver_employee_id` wajib, ≠ pemanggil, harus admin)
  dan satu-tangan MEMATIKAN, keduanya hanya Super Admin/System Admin; picker Approver Kedua
  hanya muncul saat menggeser `false→true` pada sesi edit yang sama dan tidak dipersistenkan.
  Field ini juga yang meresolusi tanda tangan surat menggantikan gambar per-cabang lama (C3).
- Pemilih "Viewing as" ditambahkan ke `GroupStructurePage` (`COMPANY_VIEWERS` di `mock-data.ts`,
  4 peran) supaya gerbang peran bisa dicoba dari UI — pola yang sama dipakai modul lain
  (Salary Settings, ESS Payroll).

7 pengujian baru (gerbang can_sign_letter 1 kasus multi-assert, GS-11 3 kasus) — total 26 di
`company.test.ts`, semuanya lulus. Worktree Kiro (`… - clean`) yang sempat membangun dua butir
ini terhadap rilis lebih lama (`FE-Fixing-5-Service`, FSD 0.18/UIC 0.14) sudah ditimpa oleh
merge `main` ke `ui/clean-dev-notes`; backup diff-nya disimpan di luar repo
(`HRIS/kiro-wip-backup-2609/`) atas permintaan pengguna.

**Masih belum dikerjakan** (giliran berikutnya):

- **Impor Excel + Bulk Edit** untuk Branch & Job Grade/Class, dan **impor JSON all-or-nothing**
  untuk Cost Center/SBU (FSD §1.4–§1.8/§3.4–§3.8/§4.4–§4.5/§5.4–§5.5, UIC sudah mengontrakkan
  delapan endpoint sejak `0.14`, FSD baru menyusul `0.20`, keputusan USER 21 September 2026:
  impor/bulk **mengikat**, bukan dicabut) — layar baru per menu, di luar cakupan enam menu yang
  sudah ada; belum digambar di Figma juga (dinyatakan eksplisit di kontrak).
- **Assets, Notice, Announcement, Integration Contact** — empat menu Company lain di luar
  Batch 5 giliran ini (lihat `docs/MODULE-TRACKER.md`).

### 8.2 Update tabel §1 (Company baris terakhir sudah usang, dibaca ulang di sini)

Baris Company pada tabel §1 di atas ("FSD/UIC 0.9 ikut rilis 15 September tetapi modulnya belum
dibangun") tidak diperbarui langsung supaya tetap terbaca sebagai catatan sejarah persis seperti
konvensi §1A yang sudah dipakai di audit-audit sebelumnya. Versi yang berlaku sekarang: **FSD
0.32 · UIC 0.22 · TSD 0.39 · ERD 0.21** (rilis 22 September 2026, `September Handoff
(Delivery)/FE-220926/` + `BE/BE/`).

---

## 9. Audit Employee 23 September 2026 — repo 0.12/0.27/0.13/0.9 vs arsip terbaru 0.14/0.32/0.69/0.32

Sama seperti Company (§8): repo Employee dibangun memakai kontrak terlama yang tersedia saat itu.
Rilis `FE-Fixing-5-Service` (17 September, FSD 0.14/UIC 0.32) dan `BE-Fixing-Diagram-4th`
(10 September, TSD 0.69/ERD 0.32) belum pernah dibaca. Metode sama: changelog dari versi repo
sampai terbaru, verifikasi hanya untuk baris yang menjanjikan dampak kode nyata.

**Hasil FSD 0.12→0.14:** dua bump murni Figma/path (menu Bulk Import disusulkan ke Main-Frame,
tiga path gambar dibetulkan) — nol dampak layar yang sudah dibangun.

**Hasil UIC 0.27→0.32:** 0.28–0.31 murni koreksi status dokumentasi (klaim "belum ada route" yang
sebenarnya sudah live — `/me`, `reprimand-categories/policies`, `mass-resignations/search`,
Idempotency-Key); nol dampak kode FE. 0.32 menambah **4 section baru** (`menu-tree` §8B — sidebar
dari server, `roles` §8C, `work-statuses/lookup` §8D, `active-count` §8E) — endpoint tambahan
untuk layar yang belum ada/dropdown yang saat ini masih enum lokal; sudah dicatat sebagai D11/D12
di §8.3 lama, tetap sebagai keputusan arsitektur terpisah, bukan dikerjakan giliran ini.

**Hasil TSD 0.13→0.69 (56 versi) + ERD 0.9→0.32 (22 versi):** disaring dengan grep changelog,
diverifikasi hanya kandidat yang menjanjikan drift nyata pada tujuh fitur yang sudah dibangun
(`employees`, `manpower`, `new-joiner`, `transitions`, `mass-resignation`, `reprimand`, `ptkp`).
Mayoritas kandidat **sudah benar** di kode — dicek langsung, bukan diasumsikan:

| Kandidat | Kontrak | Keadaan repo (diverifikasi) |
| :--- | :--- | :--- |
| Mass Resignation `batch_title` | UIC §6.1 (`0.27`) | ✅ Sudah ada — `batchTitle` di `types.ts`/`service`/form/test |
| Transition `waive_control_class` (STANDARD/ELEVATED) | TSD §6.8 (`0.44`) | ✅ Sudah ada — `waiveControl` di `types.ts` + `WaiveTaskModal` |
| Employee Directory `keyword` = `nik` ATAU `name` (replika lokal, boleh basi/`null`) | TSD §7.2.1 (`0.36`) | ✅ Sudah benar — `search()` mencocokkan `name` maupun `nik` |
| PTKP `is_primary_employer` + `dependent_claims` (maks 3) | TSD §7.8.1 (`0.21`) | ✅ Sudah ada — `DependentClaimsField.tsx` |
| Employee Transition `PROMOTION` dicabut dari `transition_type` | TSD §6.5 (`0.5`/ERD `0.5`) | ✅ Tidak pernah dibangun — repo memang tidak punya opsi ini |

**Satu delta nyata ditemukan dan diperbaiki** — Manpower Requisition memakai field `justification`
padahal kontrak mengganti namanya jadi `reason` sejak **TSD `0.17`** (`PROB-SERVICE-778`, keputusan
USER 17 Agustus 2026) dan **ERD `0.10`** menyusul: identifier `justification` diganti `reason` di
seluruh `src/features/manpower/` (`types.ts`, `validation.ts`, `manpower.service.ts`,
`RequisitionModals.tsx`, test) — label UI "Justifikasi" tidak diubah, murni nama field.

**Dua penguatan validasi New Joiner** dari `TSD-EMPLOYEE 0.26` (`PROB-SERVICE-998`, tiga
kontradiksi validasi New Joiner↔auth, satu bump): `candidate_phone` diketatkan dari regex longgar
`/^[0-9+][0-9]{6,19}$/` ke pola persis kontrak `/^(\+62|0)8[0-9]{7,12}$/` (field itu sendiri
sudah wajib sebelumnya — cuma polanya kurang ketat); `candidate_name` yang sebelumnya hanya
dicek panjang, sekarang juga ditegakkan pola subset `full_name` auth
(`/^[A-Za-z][A-Za-z\s'.,-]{1,148}[A-Za-z.]$/`, huruf/spasi/`'.,-` saja). Butir ketiga di bump yang
sama (algoritma `username` turunan `candidate_name`) murni pekerjaan `auth-service` saat
materialize — nol dampak form New Joiner, sengaja tidak dikerjakan.

4 pengujian baru (2 Manpower lulus dari sebelumnya, 2 New Joiner) — total repo tetap hijau.

**Belum diperiksa** (di luar cakupan giliran ini, volume terlalu besar untuk satu sesi): sisa
ERD-EMPLOYEE 0.32 selain yang disebut di atas (mayoritas tabel backend-internal —
`map_notified_menu`, `log_pii_access`, `outbox_event`, keputusan `nik` sequence — nol tampak di
FE); audit setara untuk **Auth** dan **Finance** (TSD/ERD keduanya juga jauh tertinggal, lihat §1A
lama) masih menunggu giliran.

---

## 10. Audit Auth 24 September 2026 — repo FSD 0.7 / UIC 0.14 vs FE-220926 FSD 0.10 / UIC 0.17

Sumber: `FE-220926/` (rilis 22 September 2026, FSD/UIC saja — TSD/ERD Auth tidak ikut rilis ini,
jadi TSD/ERD tetap versi §1). Metode sama dengan §8/§9: changelog dari versi repo sampai terbaru,
lalu verifikasi ke kode.

| Versi | Isi changelog | Dampak ke repo |
| :--- | :--- | :--- |
| FSD `0.8` | §5 BARU — layar **Activity Log** (Company Management ▸ Activity Log): satu filter panel (Dari/Sampai Tanggal + Jenis, 4 opsi tertutup) + satu tabel yang kolomnya berganti per famili (`AL-1`..`AL-4`), state Loading/Empty (`AL-5`/`AL-6`) | **Dibangun** — fitur `src/features/activity-log/`, route `/company-management/activity-log` mengisi baris menu yang sudah ada (pohon menu tidak diubah) |
| FSD `0.9` | `POST /auth/refresh` berjalan otomatis di latar, tanpa layar | Nol dampak selama `MOCK = true` (tidak ada sesi server) |
| FSD `0.10` | Perpanjangan sesi GAGAL → toast generik *"Sesi berakhir, silakan masuk lagi"* lalu dialihkan ke login setelah ±2 detik (dulu senyap) | **Diterapkan** di `services/api.ts` — `expireSession()` dipanggil pada respons `401`: toast sekali (anti-dobel), sesi dibuang setelah `SESSION_EXPIRED_REDIRECT_DELAY_MS = 2000` |
| UIC `0.15` | Blockquote cakupan §6 (endpoint global auth-service ditunda) | Nol dampak — repo memang tidak memanggilnya |
| UIC `0.16` | §8.1 Matriks G7 layar Activity Log: FE hanya mengirim `{family}`/`start_date`/`end_date`/`page`/`size`; 13 filter kriteria lain sengaja tidak diexpose UI | Diikuti persis di `activity-log.service.ts` |
| UIC `0.17` | §7.2 `POST /master-info/jkk` (token platform-level) | Nol dampak — bukan layar tenant |

Catatan implementasi Activity Log:

- Famili `access-menu-history` **sengaja tidak** dijangkau (FSD §5: pembacanya `ROLE_SUPER_ADMIN`
  saja, datanya di DB tenant).
- Halaman direset ke 1 setiap Jenis/rentang tanggal berubah; ukuran default 10 (FSD §5.1).
- `AL-5` memakai state loading bawaan `DataTable` ("Memuat data…"), bukan skeleton lima baris —
  komponen rumah dipertahankan supaya seragam dengan tabel lain.
- Otoritas SUPER_ADMIN/HR_MANAGER ditegakkan backend/gateway (FSD §5); layar tidak menyaring peran.

5 pengujian baru (`activity-log.test.ts`: paginasi, urutan terbaru, rentang inklusif, empty,
toast sesi berakhir + jeda).

---

## 11. Audit Employee Profile 24 September 2026 — repo FSD 0.4 / UIC 0.6 vs FSD 0.10 / UIC 0.12

Sumber: FSD `FE-220926/FSD-001-PROFILE-0.10.md`; UIC/TSD/ERD `FE-Profile/` (UIC 0.12, TSD 0.19,
ERD 0.12 — 18 September 2026). Pembanding versi lama: `(150926)-FE-terusan/`.

| Versi | Isi changelog | Dampak ke repo |
| :--- | :--- | :--- |
| FSD `0.6` / `0.9`, UIC `0.10` / `0.11` | Reveal PII jadi alur dua layar: `R1` modal konfirmasi (daftar field + peringatan read-audit) → `R2` field tampil penuh + banner read-audit + tombol **Sembunyikan** per field. Field yang dibuka kini **enam**: `id_card_number`, `mother_maiden_name`, `npwp`, `bpjs_tenaga_kerja_number`, `bpjs_kesehatan_number`, `passport_number`; `npwp` & `passport_number` ter-mask di Detail | **Diterapkan.** Sebelumnya Reveal langsung membuka 4 field tanpa konfirmasi, NPWP dan paspor tampil utuh. Kini `SensitiveValue` + `RevealConfirmModal` di `BasicInfoSection.tsx`; `ProfileReveal` 6 field; mask NPWP `01.234.567.8-••••-000` |
| FSD `0.8` / `0.9` (§1.0 Matriks Peran BARU) | Reveal hanya HR Manager / Super Admin (HR Staff nol scope `employee:profile:reveal`); ubah `nationality`/`marital_status` hanya HR Manager ke atas (gerbang `isHrPlus`) — HR Staff ter-strip sama seperti ESS | **Diterapkan.** `ProfileActor` `'ESS' \| 'HR'` → `'ESS' \| 'HR_STAFF' \| 'HR_MANAGER'` + helper `canRevealPii`/`canUpdateRestricted`/`canManageBiodata`; service menolak 403 (reveal tanpa scope tidak menulis read-audit); pemilih aktor di kartu identitas jadi tiga pil |
| FSD `0.10` | Dua pintu masuk HR ke biodata karyawan: **Pintu 1** tombol "Kelola Biodata Karyawan" di Basic Info milik sendiri (hanya peran HR) → modal `P1` **Pilih Karyawan** (cari nama/NIK, debounce 300 ms, hasil nama + NIK + cabang); **Pintu 2** tombol "Biodata" di Employee Detail | **Dibangun.** `EmployeePickerModal.tsx` memakai pencarian Employee Directory; tombol Employee Detail dilabeli "Biodata" dan membuka profil sebagai HR Manager |
| UIC `0.7` / `0.12` | Tautan dokumen profil = `…/documents/{id}/content` (bukan URL bertanda tangan); `document_id` asing 422, milik orang lain 403 | Nol dampak — repo belum menampilkan/mengunggah berkas dokumen profil (foto/sertifikat hanya penanda ADA) |
| UIC `0.8` / `0.9` | Matriks G7; `GET /employee-relatives` dicabut (pakai `POST …/search`) | Nol dampak — repo tidak memanggil `GET /employee-relatives` |

**Belum dikerjakan (tercatat):** cabang `Profil ada? = Belum → Form Create HR` pada FSD §1.3 — dataset
dummy selalu memuat satu profil, jadi form create HR untuk karyawan tanpa profil belum punya layar.
Kartu identitas masih menampilkan identitas pengguna login walau membuka profil karyawan lain
(dataset dummy satu orang). TSD 0.19 / ERD 0.12 tidak diaudit baris per baris — perubahan yang
berdampak FE sudah dicerminkan UIC/FSD di atas.

3 pengujian baru di `profile.test.ts` (HR Staff ditolak ubah field khusus HR tapi boleh field umum,
reveal enam field + read-audit, ESS/HR Staff reveal 403 tanpa read-audit).

---

## 12. Employee Management & Company Management — 24 September 2026

**Employee Management:** nol selisih. Dokumen Employee di laptop ini (`(150926)-FE-terusan` 0.12/0.27,
arsip Juli 0.1) semuanya **lebih lama** dari versi yang sudah diaudit §9 (FSD 0.14 / UIC 0.32 / TSD 0.69 /
ERD 0.32), dan `FE-220926` tidak membawa Employee. Satu-satunya perubahan lintas modul yang menyentuh
menu ini — tombol **Biodata** di Employee Detail (FSD-PROFILE 0.10 Pintu 2) — sudah dikerjakan §11.

**Company Management (FSD-001-COMPANY 0.32 · UIC-001-COMPANY 0.22):** enam menu master data sudah
sejajar (§8). Sisa kontrak yang belum punya layar, dikerjakan bertahap:

| Bagian kontrak | Status |
| :--- | :--- |
| Announcement (FSD §11, UIC §3C) | **Dibangun** — lihat di bawah |
| Assets: List, Category, Register, Detail & Lifecycle, Disposal (FSD §7–§9, UIC §3) | Belum |
| Notice — Notice List, Release, Compliance, Notice Gate (FSD §10, UIC §3B) | Belum |
| Integration Contact (FSD §13, UIC §3D) | Belum |
| Impor Excel/JSON + Bulk Edit, delapan endpoint (FSD §14) | Belum |

### 12.1 Announcement

- **Admin** `/company-management/announcements` mengisi baris menu Company Management › Announcement
  yang sudah ada: grid rancangan + terbit (filter status/kategori, cari judul), modal Susun/Sunting
  (`category` daftar tertutup `POLICY`/`HOLIDAY`/`EVENT`/`GENERAL` tanpa nilai bawaan, `recipient_role`
  boleh kosong selama rancangan), halaman detail (Kelola Lampiran + tab Jejak Terbit), dialog Terbitkan
  dengan peringatan tetap "tidak dapat ditarik".
- **Aturan yang ditegakkan service** (dan diuji): sesudah terbit keempat medan beku → `422` menyebut
  medannya; terbit tanpa `recipient_role` → `422` dan tetap `DRAFT`; terbit ulang → `422`; terbit menulis
  jejak dengan sidik SHA-256 atas empat medan; lampiran = menautkan berkas Company Files (bukan unggah),
  tetap boleh sesudah terbit, duplikat `409`, berkas tak dikenal `422`, cabut = soft-delete.
- **ESS** `/me/announcements`: hanya terbit + peran pemanggil, terbaru di atas; salah sasaran/rancangan
  `404` (anti-enumerasi). **Baris menu ESS belum dipasang** — FSD §11.8 memutuskannya, tetapi aturan
  repo melarang menambah baris sidebar tanpa persetujuan; sementara dijangkau dari tab Announcement
  Dashboard (lima terbaru + "Lihat semua").
- **Penyederhanaan sadar:** "editor teks kaya" diwujudkan textarea multi-paragraf yang dikirim sebagai
  HTML `<p>` ter-escape (nol dependensi editor baru) dan ditampilkan sebagai teks, bukan `innerHTML`.
  Direktori Company Files dibaca lewat `POST /documents/search` `owner_type=PERUSAHAAN`
  (UIC-001-DOCUMENT §2.1); mock memakai lima berkas contoh.

11 pengujian baru di `announcement.test.ts`.

---

## 13. Audit Time Management 24 September 2026 — repo FSD 0.3 / UIC 0.6 vs FSD 0.4 / UIC 0.12

Sumber: `FE-220926/` (FSD-001-TIME-0.4, UIC-001-TIME-0.12). Pembanding: `(150926)-FE-terusan/`.

| Versi | Isi changelog | Dampak ke repo |
| :--- | :--- | :--- |
| UIC `0.7`, FSD `0.4` | `reject_reason` teks bebas → **enum 15 nilai wajib** + `reject_note` opsional (≤500) pada tolak cuti biasa (`#65`, cabang `REJECTED`) dan tolak cuti sakit (`#66`). `note` hanya dibaca cabang `APPROVED`. FSD: panel keputusan `D3` = dropdown alasan + catatan tambahan; frame baru `E4` = detail sakit dengan jendela tolak **masih terbuka** (banner info + panel tolak, tanpa Setujui) | **Diterapkan.** `RejectReasonCode` + label Indonesia, `rejectNote` di `LeaveRequest`; `DecisionModal` & `SickRejectModal` memakai `RejectFields` (Reject nonaktif sampai alasan dipilih, penghitung 0/500); detail menampilkan label alasan + catatan terpisah. **Cabang API dibetulkan** — sebelumnya catatan dikirim sebagai `reject_reason` teks; kini `APPROVED → {decision, note}`, `REJECTED → {decision, reject_reason, reject_note}` |
| UIC `0.8` | Empat alamat "milik saya": `#95` `leave-balances/me-summary`, `#96` `attendance-summaries/me-monthly`, `#97` `today-overview`, `#98` `leave-balance-ledgers/me-search` | Nol dampak — keempatnya sudah dipakai (kartu HOME, ESS Time Off Taken) |
| UIC `0.9`–`0.10` | Bump kosong / pembersihan catatan dokumen | Nol dampak |
| UIC `0.11`–`0.12` | Proyeksi grid `POST /leave-requests/search` diperlebar: `requires_extra_approval_reason` + `reject_deadline_at` | Nol dampak — kolom Extra layer dan jendela tolak sakit sudah dibaca dari baris yang sama |

3 pengujian baru di `time-off.test.ts` (kode di luar enum / catatan >500 → 422, penolakan menyimpan
kode + catatan terpisah, tolak sakit di dalam jendela memakai enum dengan catatan kosong).

## 14. Rilis FE-230926 (23 September 2026) — Auth, Profile, Employee, Company, Time

Sumber: `HRIS-docs/.../September Handoff (Delivery)/FE-230926/FE-230926/`. Dibaca lewat changelog.

| Area | Dokumen | Perubahan kontrak | Tindakan di repo |
|---|---|---|---|
| Auth | FSD-AUTH 0.12 §2.3 (`AUT-105` Q8, `KA-17`) | Prefiks statis "+62" dicabut; satu field nomor bebas `inputmode="tel"`, bentuk `081…`/`62…`/`+62…` dikirim apa adanya, klien dilarang menolak | `LoginWhatsappPage` satu field, `loginWhatsappSchema` hanya wajib isi, mask OTP menormalkan `+62`/`62` → `0` |
| Company › Assets | FSD-COMPANY 0.34/0.35 · UIC 0.24/0.25 (`CMP-330`) | Matriks peran §7.0 (HR_MANAGER/DEPT_MANAGER lihat saja) · `serial_number` wajib · Transfer = SATU event `log_asset_transfer` antar-branch (alasan, tanggal, foto; pemegang tidak berubah) · Return wajib `asset_location` · Lease wajib foto + `log_asset_lease` · Residual menulis `log_asset_residual` · Dispose hanya `SOLD`/`GRANTED` (AUCTION 422), nominal + berkas + foto wajib | Service/hooks/modal/halaman diselaraskan; pemilih identitas `ASSET_VIEWERS` di empat layar; tombol tulis disembunyikan untuk peran lihat saja; "Batalkan lelang" dihapus; tab riwayat Transfer/Sewa/Nilai residu |
| Time › Scheduler | FSD-TIME 0.5 §9/§9.5 (`TIM-171`) | Assign Massal (Bulk) hanya `SUPER_ADMIN`/`HR_MANAGER`; `HR_STAFF` tetap boleh Assign Individu | `canBulkAssign`, `runBulk` 403 untuk HR_STAFF, tombol Bulk disembunyikan; pemilih peran di Schedule |
| Time › Attendance | UIC-TIME 0.13 §6.1.1 (`TIM-164`) | Body tap memuat `selfie_base64` (kondisional, PROVISIONAL) + `selfie_content_type` (default image/jpeg); galat document-service `503` | Cabang API `recordPunch` mengirim `punch_type`/`punch_at`/`punch_at_timezone` + pasangan selfie; cabang mock tidak berubah |
| Employee Profile | FSD 0.10 / UIC 0.12 | Tidak berubah dari FE-Profile | — |
| Employee | UIC 0.33 | Koreksi redaksional; filter New Joiner tetap satu status | — |
| Notification | FSD 0.4 / UIC 0.2 (baru) | Dokumen baru | Dipakai saat membangun Company Management › Notification (belum dikerjakan) |

## 15. Company Management › Notification — FSD-NOTIFICATION 0.4 / UIC 0.2 (25 September 2026)

Dibangun di `src/features/notification/` (route `/company-management/notifications`). Satu layar kotak masuk,
dua endpoint: `N1` `GET /notifications/inbox` (filter `is_read`, whitelist `sort_by` `created_at`|`is_read`,
bawaan terbaru di atas) dan `N2` `PUT /notifications/inbox/{id}/read` (klik baris, idempoten: panggilan kedua
200 apa adanya, `read_at` tidak bergeser).

- Tautan "Lihat Perkara": dirakit FE dari `reference_type` + `reference_id`. Hanya `ANNOUNCEMENT` yang target
  layarnya berkontrak → ESS Announcement (`/me/announcements?id=`). `NULL` dan nilai tak dikenal → tanpa
  tautan (bukan tombol mati). `FINANCE_REQUEST`/`PRODUCTIVITY_RECAP` dikenal, targetnya belum berkontrak.
- Koneksi antar modul: Announcement terbit → `notificationService.deliver()` menitip kabar
  `ANNOUNCEMENT_PUBLISHED` (pengganti event Kafka; judul pengumuman tidak dimuat).
- Titik di ikon bell kini biner mengikuti ada/tidaknya kabar belum dibaca (bukan badge hitungan — dilarang §2).
- Sengaja tidak ada: tandai-semua, hapus, pencarian teks, kategori, badge kabar penting, kolom NIK.
- **GAP:** contoh DTO `N1` tidak memuat teks judul/isi, padahal FSD §1.1 menampilkan "judul+isi dirangkai
  backend". Dimodelkan opsional (`title`/`body`); bila kosong layar memakai label kode jenis.
- "Notification (rich inbox)" (`inbox.html`) dihapus dari sidebar atas permintaan Theo (25 Sep 2026).

## 16. Company Management › Files + ESS › Files — FSD-DOCUMENT 0.8 / UIC-DOCUMENT 0.6 (25 September 2026)

Dibangun di `src/features/documents/` — lima layar: Company Files, Employee Files, Other Files, Document
Templates (`/company-management/files/*`) dan ESS Files (`/me/files`).

- **Satu katalog, satu pintu baca** (`A3`/`A4`/`A2`/`A16`) dipakai empat layar berkas lewat komponen
  `DocumentCatalog`; pembedanya hanya `owner_type`(+`owner_id`). Nol tombol unggah dan nol hapus.
- **Hak baca per baris** (baris tak berhak tidak muncul): HR Staff tanpa berkas SENSITIF, Health Data Officer
  hanya SENSITIF, Dept Manager hanya unit yang dipimpin (fail-closed), GA Staff hanya aset & vendor.
  Isi SENSITIF hanya HR Manager / Health Data Officer / Super Admin / pemilik (ESS); lainnya `404` seragam.
- **`A2` lewat satu komponen bersama** (`DocumentViewer`): byte ditarik via service lalu ditampilkan dari blob
  URL yang dilepas saat ditutup; SENSITIF hanya penampil dalam-aplikasi. Grid/detail nol jejak akses, isi
  berkas menulis satu baris `log_document_access` (PER_PEMBUKAAN / PER_PERMINTAAN).
- **Employee Files** wajib pilih karyawan (`EF-1`) lebih dulu; kolom Asal sengaja dikurangi.
- **Document Templates**: HR Manager buat / naskah versi baru / nonaktifkan (idempoten, tanpa aktifkan
  kembali); Super Admin orang kedua (setuju/tolak + alasan, penilai ≠ penyunting). Penunjuk versi aktif hanya
  bergeser saat versi DISETUJUI terbaru. HR Staff nol akses.
- **ESS Minta Surat** (`A15` + `A10` jalur mandiri): hanya templat bisa-diminta-sendiri berkategori TEMPORARY;
  `subject_employee_id` tidak dikirim. Tanpa gerbang → TERBIT seketika, berkas lahir di katalog (badge New).
- Koneksi: lima berkas Company Files memakai `documentId` yang sama dengan lampiran Announcement; Other Files
  memakai id aset/vendor/cabang dari fitur Assets/Company.
- **Di luar cakupan menu** (baris menunya belum ada di sidebar kontrak): Letter Issuance, Pengaturan Kategori,
  Jejak Akses Dokumen, Malware Alerts, dan halaman publik Pemeriksaan Keaslian.
- **Asumsi**: regex nama templat dan daftar "ungkapan mesin templat" belum dikutip dari TSD §18 — dipakai
  pendekatan (`${`, `<%`, `{%` ditolak; `%%penanda%%` dan `{{letter_no}}` sah).

## 17. Rilis FE-240926 (24 September 2026)

Sumber: `HRIS-docs/.../September Handoff (Delivery)/FE-240926/FE-240926/`. Berubah: FSD/UIC AUTH 0.14/0.19,
FSD/UIC EMPLOYEE 0.16/0.35, FSD/UIC NOTIFICATION 0.5/0.3, FSD/UIC TIME 0.10/0.14, UIC COMPANY 0.27, UIC INSIGHT 0.4
(baru). Dokumen berversi sama dicek md5 — isinya identik.

| Area | Perubahan kontrak | Tindakan di repo |
|---|---|---|
| Auth | FSD 0.13 §5 Aktivasi Akun (`POST /auth/activate`, 401/422/502 dibedakan) | Halaman publik `/auth/activate` (AA-1/AA-ERR/AA-DONE); 502 menyatakan tautan masih hidup |
| Auth | FSD 0.13 §6 Kirim Ulang Undangan (`POST /auth/resend-invitation`, 422 → paksa `force_invalidate`) | Modal dari antrean Dashboard "Akun menunggu aktivasi"; RI-CONFIRM = ConfirmDialog "Kirim Ulang Paksa". **GAP:** alamat daftar akun menunggu aktivasi belum berkontrak — data contoh |
| Auth | FSD 0.14 §2.1 footer Kebijakan/Ketentuan/Tentang tanpa tautan aktif (halaman belum ada) | Footer login jadi teks biasa |
| Company / Notification | UIC-COMPANY 0.27: `my-announcements` daftar = array BARE; UIC/FSD-NOTIFICATION 0.3/0.5: alamat tenant-scoped wajib `/api/v1/{COMPANY_CODE}/…` | `myList` membaca array bare; interceptor axios merakit prefix `{COMPANY_CODE}` untuk semua service kecuali global (`/auth`, `/notifications`); baseURL `/api/v1` |
| Employee | UIC 0.34/0.35 + FSD 0.16: requisition `reason`; regex `candidate_name` §8.9 | Sudah sesuai sejak audit 23 Sep — tanpa perubahan |
| Employee | FSD 0.15 §5.1: Force-release = `POST /transition-tasks/{id}/waive` `waive_control_class=ELEVATED` | `forceRelease` mem-waive tiap task blocking (status WAIVED, bukan COMPLETED); `waiveTask` mengirim `waive_control_class` |
| Time | UIC 0.14 §3.2.4: menu ESS Delegation = yang SAYA titipkan (`employee_id` pemberi) | Tab "Dititipkan ke saya" dihapus; satu daftar pemberi; Hendra ditambah ke pemilih identitas ESS |
| Time | UIC 0.14 §3.1.5: APPROVED boleh ditarik selama `start_date` belum tiba | Tombol Tarik di ESS Time Off mengikuti aturan ini (service & HR sudah sesuai) |
| Time | FSD 0.6 §1.1: baris Draft Holiday punya dua simpan — Simpan (tetap Draft) & Simpan & Ajukan | Footer modal Holiday Draft kini dua tombol; service `saveHoliday(…, submit)` |
| Time | UIC 0.14 §10.2.2: bulk roster `employee_ids[]` ATAU `scope_level`+`scope_ref`, plus `is_off_day` | Body API dipetakan ke `employee_ids`; opsi "Mass day off" di modal bulk |
| Time | FSD 0.6: Scheduler penempatan = peran HR saja; Overtime Tarik = dialog kustom | Sudah sesuai — tanpa perubahan |
| Time | FSD 0.7–0.10 | Hanya perapian repositori gambar — tanpa dampak kode |

## 18. System › Settings › Time & Employee — FSD-SETTINGS 0.21 / UIC-SETTINGS 0.12 (28 September 2026)

Dibangun di `src/features/settings/` (route `/settings/configuration/time` dan `/employee`). Satu pintu baca
`A1 GET /settings` dan satu pintu tulis `A2 PUT /settings` dipakai kedua Menu; layar menyaring subset `setup_code`.

- **Waktu:** 26 setelan dalam 7 tab awalan (`attendance.` 5 · `leave.` 5 · `overtime.` 6 · `sick.` 4 · `schedule.` 3 ·
  `oncall.` 2 · `outbox.` 1). Nama, default, dan domain nilai diambil dari katalog `TSD-001-TIME-1.23` (dokumen FE
  hanya menamai sebagian). 3 baris DAFTAR (`leave.approval_extra_tier_approver` HIGHER_MANAGER/HR/HIGHER_MANAGER,HR ·
  `leave.joint_leave_deducts_annual` · `sick.doctor_note_required`), sisanya INTERVAL.
- **Karyawan:** satu enum `REPRIMAND_RULE` (ACTIVE/NON-ACTIVE), bukan pola R/O/D.
- **Kelas akses:** HR Manager/Super Admin PENUH (ubah); HR Staff R‡ (baca-saja, penawaran di-omit, tanpa Save);
  peran lain tanpa setelan → 403 di gerbang. Baris terkunci (`settings.identity_retention_days`) tidak pernah tampil.
- **Tulis:** Save mengirim hanya baris tersunting pada Menu ini (lintas tab), satu transaksi; seluruh baris dinilai,
  satu ditolak ⇒ nol berubah, kode paling keras menang (modal WKT-7); sukses menampilkan Changed?/versi baru (WKT-6).
  Pindah Menu dengan suntingan belum tersimpan meminta konfirmasi.
- **Koneksi:** Reprimand Type Setting menampilkan `REPRIMAND_RULE` sebagai spanduk baca-saja dari Settings — satu
  sumber nilai (menutup selisih PROB-FRONTEND-042 di aplikasi ini).
- **Asumsi:** `label`/`label_awalan` diisi di data contoh (fallback ke kode/awalan mentah tetap berjalan, mis. tab
  `outbox.`); batas `min`/`max` hanya yang disebut dokumen — sisanya terbuka.

## 19. System › Settings › enam Menu sisa + Riwayat Perubahan + Penghapusan Data — FSD-SETTINGS 0.21 / UIC-SETTINGS 0.12 (29 September 2026)

Satu halaman `SettingsConfigurationPage` kini melayani kedelapan Menu setelan (`/settings/configuration/{menu}`);
dua halaman baru: `/settings/change-history` (`A3`) dan `/settings/erasure-requests` (`A5`/`A6`/`A7`).

- **Katalog 76 baris** (26 Waktu · 27 Keuangan · 8 Penggajian · 7 Kinerja · 2 Produktivitas · 2 Dokumen · 3 Organisasi
  · 1 Karyawan, cocok UIC §7). Bawaan Keuangan dari `TSD-001-FINANCE-0.45` (keputusan USER); Kinerja dari
  `TSD-001-PERFORMANCE-0.35` §14; Penggajian/Produktivitas/Dokumen/Organisasi dari FSD §3/§5/§6/§7 + UIC §2.4.
- **Penurunan Sub Menu mekanis** (FSD §2.5): Keuangan 4 tab (`finance.benefit.` 6 · `finance.loan.` 14 ·
  `finance.cash_advance.` 4 · `finance.` 3 — `finance.retention.years` gugur ke `finance.`); Waktu 7 tab; Menu lain nol tab.
- **Kelas akses (UIC §7):** R‡ HR Staff 29 baris (Waktu+Produktivitas+Karyawan), Finance Officer 27, Payroll Officer 8,
  Department Manager 7, System Admin 3; Dokumen nol kelas R‡. Pemilih "Viewing as" memuat persona kelima peran.
- **Bentuk kontrol (G3):** deretan majemuk `finance.loan.tenor_custom_list` = chip berulang (tidak pernah dipipihkan —
  PROB-FRONTEND-036, daftar dipegang layar); enum bernama yang pilihannya belum disusun = dropdown terkunci berisi nilai
  berlaku saja; penawaran `null` = tanpa kontrol (Dokumen), kecuali penunjuk `performance.assessment_structure_id` =
  isian bebas (PROB-FRONTEND-038); `finance.benefit.period_close_date` = isian `MM-DD`.
- **Medan turunan `A1`:** `keadaan_nilai` (+`pasangan_key`) dirender sebagai lencana + kalimat sikap layar
  (Penggajian: kosong-sah, bersyarat bergantung `payroll.suspension_pay_mode`); `jangkauan` Produktivitas
  ("Drives 3/2 gates") hanya kelas PENUH. Lencana Kinerja (Frozen/Temporary/Pointer) dan Produktivitas dinyatakan
  sebagai keterangan turunan dokumen sumber, bukan medan server.
- **Gerbang R/O/D (UIC §2.4):** hanya CC/SBU; `confirm_transition` pada baris lain → 422; transisi ke DISABLED
  ditanya dulu lewat ConfirmDialog lalu dikirim `confirm_transition:true` (keputusan layar atas PROB-FRONTEND-046);
  transisi ke REQUIRED hari ini → 500 (VIEW gap belum digelar, ORG-6); proyeksi setelah digelar (CC gap 37 → 422
  `ASSIGNMENT_GAP_BLOCKS_REQUIRED`, SBU gap 0 lolos) diuji lewat saklar `ASSIGNMENT_GAP.viewProvisioned`.
- **Hasil tulis Penggajian (GAJ-5):** modal sukses menambah kolom "Partner state" bila pasangan wajib-bersyarat masih
  kosong. `[]` lolos hampa tetap diterima (PROB-SERVICE-440 — perilaku kontrak apa adanya).
- **Riwayat Perubahan:** tepat dua peran (R‡ tetap 403); badan NESTED; filter Modul (9 checkbox — sembilan/nol
  dicentang ⇒ `setup_code_prefixes` tidak dikirim, SET-130), Setelan, Pelaku, Kelas pelaku 3-keadaan, rentang tanggal;
  grid 8 kolom, baris ANONIM tetap tampil saat mesin dibuang, baris TERKUNCI tampil berlencana, `Before` kosong di
  versi 1; nol tombol; deep-link `?setup_code=` (tombol "History" per baris setelan) dan `?menu=` ("Menu history").
- **Penghapusan Data:** daftar berhalaman (ringkasan angka, subjek nama/NIK fail-open, ANONYMIZED apa adanya), form tiga
  medan (subjek dari PICKER termasuk mantan karyawan, tanggal surat ≤ hari ini, zona IANA), 201 → ringkasan 14 pelacak
  PENDING/0 siaran, 409 bila subjek masih punya permintaan terbuka, detail dengan tanggal surat & pencatatan
  berdampingan + tabel pelacak ber-`broadcast_count`; nol tombol "tandai selesai".
- **Asumsi:** `label` diisi di data contoh (fallback tetap berjalan); nilai Kinerja `period_length_days`/`scale_length`
  dan riwayat awal (versi 2+) adalah contoh; persona NIK di luar dokumen dikarang untuk tampilan.
- **Belum dikerjakan:** menu "Personal Data Erasure" masih di bagian nav "Settings — no menu row yet" — FSD 0.21 sudah
  memutuskan ia Menu ke-10 Group `Pengaturan` (Jalan A), tetapi pohon sidebar dikunci; menunggu keputusan pemilik repo.

## 20. Productivity — FSD-PRODUCTIVITY 0.2 / UIC-PRODUCTIVITY 0.4 / TSD-PRODUCTIVITY 0.18 (30 September 2026)

Dibangun di `src/features/productivity/` — 10 baris nav: Project (+ `/productivity/projects/archive` tanpa baris
menu), Tasks (+ tab Kategori), Time Tracker, Activities, Summary, Tracker Report, Task List, Group List, Forms,
My Submissions. Pemilih "Viewing as" dibagi ke seluruh layar (Dedi pengerja · Rina atasan berjenjang · Hesti HR
Manager · Lukman HR Staff · Fajar · Nadia Health Data Officer).

- **Project:** Active & Archive = dua URL (keputusan granularitas SAD §4.6, sidebar hanya punya satu baris
  "Project" → dihubungkan tab). Lahir AKTIF dengan pemilik dari token; arsip ditolak `PROD_PROJECT_ARCHIVE_HAS_OPEN_TASK`
  selama ada task terbuka; restore mengosongkan `archived_at`; keanggotaan upsert (baru/dipulihkan/no-op, bukan 409).
- **Tasks:** `task_origin` ditentukan server; penugasan hanya ke bawahan berjenjang/anggota proyek yang dipimpin
  (`PROD_TASK_ASSIGN_NOT_AUTHORIZED`); tenggat task DITUGASKAN hanya penugas/atasan, mundur wajib beralasan; riwayat
  `log_task_change` terbaru dulu. **Selisih dokumen:** diagram status FSD 0.2 §3.3 masih menggambar buka-kembali
  `SELESAI/DIBATALKAN → SEDANG_DIKERJAKAN` dan menyebut `BELUM→SELESAI` tidak sah; TSD 0.18 (PROB-SERVICE-298)
  mengoreksi: `BELUM→TERTAHAN` yang tidak sah, dan keadaan akhir hanya saling berpindah `SELESAI ↔ DIBATALKAN` dalam
  jendela. Aplikasi mengikuti TSD. Jendela membaca `productivity.entry_window_days` dari Settings (koneksi modul).
- **Time Tracker:** penghitung lama dihentikan otomatis + panel pemberitahuan; catat manual tanpa jam, jendela 7 hari,
  batas 1440 menit/hari lintas-origin; `paid_work_group_id_snapshot` dibekukan dari pemetaan kategori saat pencatatan.
- **Activities:** sunting/hapus pemilik saja (atasan & HR ditolak); koreksi baris DIHENTIKAN_SISTEM → DIKOREKSI_PEMILIK;
  atasan berjenjang "Accept as is" (durasi tetap, SoD menolak pemilik); pembukaan jendela oleh atasan/HR (TS-11,
  ditolak bila menyentuh periode DISAHKAN); periode DISAHKAN beku (`PROD_PERIOD_ALREADY_APPROVED`).
- **Summary:** rekap per bulan (total, per task, komposisi origin, menit task dibatalkan, baris menggantung);
  pengajuan digerbangi `PROD_PENDING_SYSTEM_STOP`; reopen oleh atasan langsung/HR beralasan; payroll lock permanen.
  Juli 2026 Dedi = 780 menit (240+60+300+180) sesuai dataset. Transisi MENUNGGU→DISAHKAN/DIKEMBALIKAN hanya lewat
  workflow — tidak ada tombolnya di sini.
- **Tracker Report:** atasan/HR saja, baris detail, unduh CSV sisi klien.
- **Group for Payroll:** Task List (satu kategori satu pemetaan aktif, nonaktifkan bukan hapus) dan Group List (nama
  unik, "Delete" dinonaktifkan dengan alasan, catatan Anti-Kompresi saat menonaktifkan kelompok).
- **Forms:** composer 7 field + pertanyaan dinamis (Anonim×Wajib terkunci); detail bertab (Pertanyaan · Jawaban ·
  Belum mengisi · Dibuka untuk · Agregat) menggantikan tiga affordance baris FSD; gerbang sensitif (HR Staff 403,
  Health Data Officer boleh); agregat angka-saja dengan ambang interim 5 (PROB-SECURITY-076); anonim tanpa kolom
  responden dan tanpa grant. Form D (sensitif) adalah contoh hipotetis — dataset positif tidak memuatnya.
- **My Submissions:** formulir berindentitas (isi/sunting pemilik saja, pertanyaan dari salinan beku, riwayat sunting);
  formulir anonim di kartu terpisah, tidak dapat disunting.
- **Asumsi:** penanda "mendekati batas harian" = ≥ 1296 menit (90% dari 1440, tidak disebut dokumen); persona Nadia
  Putri (Health Data Officer), Lukman Hakim, Sinta Maharani, dan NIK di luar dataset dikarang untuk tampilan;
  baris Timesheet Agustus–September ditambahkan agar alur koreksi/pengajuan dapat dicoba di dalam jendela.
- **Belum:** "Document Templates" di grup Productivity tetap tanpa layar (PROB-FRONTEND-019, milik company-service);
  master jenis kegiatan (TS-01) dan audit jejak akses (F5.01) tidak punya layar di FSD — hanya dipakai sebagai data.

## 21. Document — Letter Issuance, Category Settings, Access Trail, Malware Alerts, Public Verification — FSD-DOCUMENT 0.8 / UIC-DOCUMENT 0.6 (30 September 2026)

Empat baris di bagian nav "Document — no menu row yet" kini berlayar penuh, ditambah Malware Alerts (route
`/company-management/files/malware-alerts`, tanpa baris menu — lihat catatan di bawah). State berbagi satu service
(`document.service.ts`) dengan katalog Files, sehingga surat yang terbit langsung masuk Employee Files dan pembukaan
berkas langsung muncul di jejak akses.

- **Letter Issuance (§5, `A10`–`A15`):** tab Surat satuan & Penerbitan massal. `A10` jalur petugas (HR Staff/HR Manager;
  Super Admin tidak menerbitkan): PERORANGAN wajib karyawan, EDARAN tanpa karyawan + cabang opsional; gerbang efektif
  (kategori PERMANENT atau `requires_approval`) ⇒ `201` MENUNGGU tanpa nomor/berkas, selain itu `201` TERBIT + nomor
  `NNN/HRD/<bulan romawi>/<tahun>` + kode periksa + berkas di katalog. Kartu "Waiting for approval" memuat surat bergerbang
  untuk diputus (`A11`, penyetuju ≠ pengaju; tolak beralasan 1–100) — **penyimpangan kecil:** FSD menyebut `A11` dieksekusi
  dari `A4`, tetapi surat bergerbang belum punya berkas sehingga tak terjangkau dari detail dokumen; daftar kerja ini
  bukan grid pencarian surat. `A12` batal dijalankan dari detail dokumen Files (tombol "Cancel letter", status + alasan
  tampil di A4). Massal: `A13a` ≥2 penerima unik, templat perorangan; `A14` penyetuju ≠ pengaju; setuju ⇒ tugas dijalankan
  (mock seketika) dengan gagal per orang ("jabatan formal belum ditetapkan", skenario `BATCH-1`); `A13b` laporan 3 angka +
  tugas per penerima tetap dapat dibuka.
- **Category Settings (§7, `A6a`–`A6d`, `A7`):** HR Manager membuat (kode unik 409, SVG/arsip ditolak, asal PERUSAHAAN +
  kelas BIASA dipaksa) dan mengubah; MENGETAT (menonaktifkan, memperpanjang simpan, mempersempit) berlaku seketika;
  MELONGGARKAN menjadi usulan yang wajib mengakui angka dokumen terdampak — respons tetap nilai lama + penanda "Awaiting
  approval"; usulan kedua 409. Pembaca peran = penggantian seluruh daftar dari 10 peran kanonik, kategori SENSITIF 403.
  Super Admin memutus (berbeda orang dari pengusul, angka dampak wajib sama, tolak beralasan).
- **Access Trail (§8, `A5`):** tepat HR Manager & Super Admin (Health Data Officer 403); dua bentuk baris (per pembukaan
  nama+versi / per permintaan "N files") tidak diratakan; penanda "Unreasonable"; kolom alamat dilabeli alamat gerbang,
  bukan alamat pengakses (PROB-INFRA-047); catatan pengawasan saling-mengawasi ditampilkan.
- **Malware Alerts (§8A, `A17`/`A18`):** kalimat peringatan kontrak tampil dua kali (kepala grid & modal); nol nama berkas
  (penunjuk saja); tombol "Delete file & mark handled" hanya pada baris belum-ditangani; catatan tindakan wajib 1–1000;
  hapus objek dulu lalu tandai — gagal hapus ⇒ 500, baris tetap AKTIF; kirim ulang atas baris DITANGANI = 200 apa adanya;
  nol orang kedua. **Rumah menu:** FSD 0.8 menyatakan baris `Company Management › Files › Malware Alerts` sudah aktif
  (menu_order 7), tetapi pohon sidebar di repo dikunci empat baris Files — route dipasang tanpa baris menu, menunggu izin.
- **Public verification (§9, `C2a`–`C2c`):** `/verify` (nomor surat) dan `/verify/:code` (dari QR, kode terkunci), tanpa
  login dan tanpa menu; jawaban hanya cocok/tidak cocok; lima sebab gagal satu bentuk; surat dibatalkan tampil dengan
  tanggal batal tanpa alasan; nama tidak disimpan. Pembatasan laju (§7.4) belum diterapkan — dokumen menandainya
  rancangan yang belum diuji (PROB-SERVICE-437).
- **Asumsi:** templat tambahan "Surat Tugas Dinas" (bergerbang) dan "Surat Edaran Libur Nasional" untuk mencoba kedua
  cabang; atribut kelola kategori (kode, batas ukuran, jenis berkas, peran pembaca) dan NIK persona di luar dataset
  dikarang; angka dampak = cacah dokumen di katalog contoh; pemetaan peran pembaca belum memengaruhi penyaring katalog
  Files (penyaring baca tetap aturan kelas yang ada).

---

## 22. Performance › Menu 1 Siklus & Setelan — FSD-001-PERFORMANCE 0.11 / UIC-001-PERFORMANCE 0.12 (30 September 2026)

Sumber: `FE-220926/` (FE-240926 tidak mengubah dokumen Performance). Produk terpisah: sidebar kini memilih pohon
`NAV_PERFORMANCE` / `NAV_RECRUITMENT` menurut URL (`navForPath`) — sebelumnya sidebar selalu merender pohon HRIS di
halaman `/performance/*`; label produk di Topnav ikut diturunkan dari URL. Pohon menu sendiri tidak berubah.

- **Peran** mengikuti §Matriks Menu/Tab → Peran (tabel C): grid periode (`#3`) HRM/HRS/SA; buka · mulai pengesahan ·
  tutup (`#1`/`#6`/`#7`) HRM/SA; detail (`#2`) + DM; daftar ketidaklayakan (`#4`/`#5`) HRM/HRS/SA. `ROLE_SUPER_ADMIN`
  = superset. Pemilih "Viewing as" dibagi ke seluruh layar Performance (`usePerfActor`).
- **`A1`–`A3`:** grid + filter fase (whitelist), badge tiga warna; modal satu field `period_name` (1–100) dengan
  pratinjau `P1.04`; ringkasan `eligibility_summary` tampil sesudah `201` (dihitung, tidak disimpan).
- **Gerbang `P1.01`:** periode `FILLING` lain → `422 PERIOD_PHASE_INVALID` menyebut periode penahan; setelan
  `performance.scale_length` & `performance.assessment_structure_id` dibaca terkini dari modul Settings lalu dibekukan;
  skala `< 2` → `SCALE_LENGTH_INVALID`; penunjuk struktur tak dikenal → `VALIDATION_ERROR`.
- **`B1`–`B5`:** tombol transisi hanya dirender bila sah (Filling → Mulai pengesahan, Signing → Tutup periode, Closed →
  nol tombol + catatan terminal); dua tabel ketidaklayakan terpisah sebagai tab (HR saja, periode belum ditutup).
  `NOT_INCLUDED_MID_PERIOD` hanya untuk periode yang dibuka sebelum tanggal bergabung.
- **Asumsi:** nama struktur penilaian diresolusi dari tabel kecil di data Performance (penunjuk setelan belum ada di
  data Company); Lukman Hakim (HR Staff) dan akun Administrator (Super Admin) melengkapi aktor dataset kontrak.

10 pengujian baru di `performance/period.test.ts`.

## 23. Performance › Menu 2 Daftar Induk & Bobot — FSD-001-PERFORMANCE 0.11 §2 / UIC-001-PERFORMANCE 0.12 §3 (30 September 2026)

Satu halaman `/performance/kpi-items`, dua tab: **Kelola daftar induk** (`KPM-1`) dan **Browsing atasan** (`KPM-5` —
mode/filter di List yang sama, bukan layar terpisah). DM masuk langsung ke tab Browsing; Employee nol akses.

- **Peran:** baca (`#11`/`#12`/lookup golongan) HRM · HRS · DM · SA; buat · ubah · nonaktifkan (`#8`–`#10`) HRM · SA.
  HR Staff melihat grid tanpa kolom aksi dan tanpa tombol "Buat item".
- **`KPM-1`:** kolom ID (chip 8 karakter, tooltip uuid penuh), Nama Item, Golongan (`job_grade_name_snapshot`, bukan
  cermin hidup), Jenis Target, Bobot (kanan, dua desimal), Status. Tiga filter (golongan/jenis/status) → tombol
  "Filter" + modal sesuai standar rumah; dua aksi baris → "Action ▾" (kontrak menyebut ikon per baris). Nol kolom
  `used_in_sheet_count` di grid — angka itu hanya di modal Ubah/Nonaktifkan (`P2.04`).
- **`KPM-2`/`KPM-3`:** `Idempotency-Key` baru per pembukaan modal (kunci terpakai ulang → `409 DUPLICATE_CONFLICT`);
  bobot `numeric(6,2)` 0–9999,99, bebas (tidak wajib berjumlah 100). Ubah = parsial: hanya field yang berubah
  dikirim, tombol simpan mati selama form belum berubah (payload kosong → `422`); snapshot golongan ditulis ulang
  hanya bila golongan ikut dikirim.
- **`KPM-4`:** soft-delete (`deleted_at`), **tidak** menyentuh `is_active`; pemakaian di lembar informasional, tombol
  tetap aktif; baris keluar dari grid, hapus dobel → `404`. Teks dialog membedakannya dari status Nonaktif.
- **`KPM-5`:** golongan wajib dipilih manual (belum terisi otomatis dari profil bawahan), pill "Status terkunci:
  aktif", kolom Status tidak tampil. Menyalin baris ke lembar = cakupan Menu 3.
- **Asumsi / deviasi:** badge `NARRATIVE` memakai tone `brand` — design system tidak punya token ungu; daftar
  golongan diambil dari modul Company (`companyService.jobGrades()`), diurutkan per nama; ID mock berbentuk uuid v7
  (awalan timestamp) supaya potongan 8 karakter tidak kembar.

7 pengujian baru di `performance/kpi.test.ts`.

## 24. Performance › Menu 3 Lembar Penilaian — FSD-001-PERFORMANCE 0.11 §3 / UIC-001-PERFORMANCE 0.12 §4 (30 September 2026)

`/performance/sheets` (tab **Lembar saya** `D1` untuk EMP, **Antrean lembar** `E1` untuk DM/HR; Super Admin melihat
keduanya) + `/performance/sheets/detail?id=` (`E2`–`E6`). Store lembar (`sheet.service.ts` → `sheetStore`) sekaligus
menyimpan putaran persetujuan supaya Menu 4 membaca data yang sama.

- **Rezim baca `PF-10`:** grid DM dipaksa `ASSESSOR`; HR memilih `ALL`/`ASSESSOR` (Segmented) + filter periode (grid
  periode hanya HR). Detail: HR, pemegang kursi, dan rantai di atas penilai; lainnya `404` anti-enumerasi. EMP tanpa
  route daftar — mode dummy meniru tautan notifikasi dengan mencari lembar terbaru miliknya (`resolveMine`); pada API
  sungguhan `D1` dibuka lewat `?id=`. Kolom grid mengikuti FSD (Karyawan/Periode/Status) + `has_revision`; kolom
  Penilai di prototipe tidak dipasang karena `P3.02` tidak mengirim nama penilai.
- **G5:** karyawan pemilik tidak pernah menerima `initial_value`/`submitted_value` — field dibuang di service, bukan
  kolom tersembunyi. Yang tersisa hanya stempel `initial_value_recorded_at` untuk mengunci tombol "Ubah isian".
- **Gerbang `PF-37`:** banner amber TERKUNCI (n/m nilai awal) vs hijau TERBUKA; `GET self-assessment` ditolak
  `403 INITIAL_VALUE_LOCKED` sampai SELURUH baris terisi, lalu terbuka tanpa tombol. Nilai awal tidak dapat ditimpa;
  isian diri terkunci begitu satu nilai awal tercatat. HR tidak membaca isian diri (`#24` DM · SA).
- **CRUD `E4`/`E4a`/`E4b`:** dua modal berbeda. MASTER: golongan dipilih manual (sama seperti `KPM-5`), item aktif,
  target — nama/jenis/bobot disalin sistem, bobot terkunci (`403 MASTER_WEIGHT_LOCKED`). ADDITIONAL: form bebas,
  porsi dihitung termasuk baris baru terhadap `performance.additional_item_max_ratio` dari modul Settings
  (`422 ADDITIONAL_ITEM_QUOTA_EXCEEDED`). Tombol hapus baris MASTER tidak dirender. Tambah/ubah baris mereset tanda
  baca seluruh baris (`employee_read_reset_count`).
- **Karyawan `D1`:** "Tandai dibaca" lewat konfirmasi yang menyebut "bukan persetujuan" (`PF-21 k6`); catatan keberatan
  menyebut tidak menahan apa pun dan merujuk menu Objections.
- **`E6` / `P4.01`:** tombol Ajukan / Ajukan ulang untuk pemegang kursi (termasuk HR Manager yang menjadi penilai,
  `PF-19`); `WEIGHT_SUM_ZERO` sebelum resolusi rantai; penyetuju = atasan penilai, penadah terakhir HR Manager;
  porsi beku ditulis sekali; siklus/putaran naik untuk lembar dikembalikan. Tiga "kartu narasi respons" prototipe
  diganti toast hasil sungguhan.
- **Asumsi / deviasi:** status lembar lima warna (`IN_PROGRESS` info, `PENDING_APPROVAL` brand,
  `RETURNED_TO_ASSESSOR` warn, `APPROVED` ok, `REJECTED_FINAL` err) — tidak ada token oranye; badge asal `ADDITIONAL`
  memakai tone `brand` seperti `NARRATIVE`. `P3.01` (HR memasukkan karyawan susulan) tidak punya layar (kontrak).
  Pencatatan `access_log` tiap pembacaan belum dipasang — menyusul bersama Jejak Akses (Menu 6).

14 pengujian baru di `performance/sheet.test.ts`.

## 25. Performance › Menu 4 Persetujuan Nilai — FSD-001-PERFORMANCE 0.11 §4 / UIC-001-PERFORMANCE 0.12 §5 (30 September 2026)

`/performance/approvals` — tab **Antrean persetujuan** (`F1`) dan **Riwayat putaran** (`F4`–`F6`). Riwayat juga tampil
sebagai tab di detail lembar dan kartu di "Lembar saya" (`#29` untuk HRS/EMP dibuka dari lembar, bukan dari menu).

- **Peran:** antrean + putuskan (`#30`/`#28`) DM · HRM · SA; HRS & EMP melihat NoAccess yang menunjuk ke detail
  lembar. Riwayat (`#29`): HR seluruh company, penilai/penyetuju terlibat, karyawan hanya lembarnya — service yang
  memutuskan, tab di detail lembar hanya muncul bila server mengizinkan.
- **`F1`:** kolom Karyawan dinilai / Siklus · Putaran / Sebaran nilai penilai / Diajukan (urut terlama, bisa dibalik);
  satu aksi "Putuskan". Sebaran nilai **dikutip** — rata-rata dari data Menu 6 bila ada, selain itu "—" (tidak
  dihitung ulang di layar ini).
- **`F2`/`F3`:** modal dengan RadioBranch Setujui / Kembalikan / Tolak final; field alasan tidak dirender untuk Setujui,
  wajib untuk dua lainnya. Pill jatah amber "Sisa jatah kembalikan: n dari q" vs merah "Jatah kembalikan habis";
  saat habis opsi Kembalikan mati dengan alasannya. Kuota dibaca dari `performance.return_quota` (Settings).
- **Pola `K9`:** `decide` menjawab `202 FORWARDED` tanpa mengubah status; mode dummy menyelesaikan "alur kerja"
  1,5 detik kemudian (outcome putaran + status lembar), baris antrean tampil "Diteruskan" sampai itu terjadi, lalu
  antrean dibaca ulang. Gerbang lokal: alasan wajib (`422 VALIDATION_ERROR`), jatah (`422 RETURN_QUOTA_EXCEEDED`),
  assignee = principal (`403`).
- **Deviasi kontrak yang dicatat:** UIC menulis jatah habis bila "`round_no` berjalan ≥ `return_quota`", tetapi
  dataset `RS-0004` (kuota 1) dikembalikan di putaran 1. Yang dipakai FSD §4.3 F3: jumlah putaran `RETURNED` pada
  siklus berjalan ≥ kuota — cocok dengan dataset. Perlu dikonfirmasi ke pemilik UIC.
- **Catatan dev server:** setelah banyak edit HMR, Vite sempat memuat dua instans `sheet.service` (antrean kosong
  padahal lembar sudah diajukan). Restart `npm run dev` membereskannya; build produksi tidak terdampak.

6 pengujian baru di `performance/approval.test.ts`.
