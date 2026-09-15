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
