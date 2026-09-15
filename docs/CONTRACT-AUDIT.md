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
| Auth | 0.2 | 0.8 | 0.23 | 0.11 | `auth`, unlock di `dashboard` |
| Employee | 0.2 | 0.9 | 0.13 | 0.9 | `employees`, `manpower`, `new-joiner`, `transitions`, `mass-resignation`, `reprimand`, `ptkp` |
| Employee Profile | 0.2 | 0.2 | — | 0.2 | `profile` |
| Time | 0.1 | 0.1 | 0.6 | 0.4 | `calendar`, `time-off`, `attendance`, `overtime`, `scheduler`, `oncall` |
| Finance | 0.2 | 0.2 | 0.3 | 0.2 | `benefit`, `loan`, `cash-advance` |

Dashboard tidak punya dokumen kontrak tersendiri (shell aplikasi bersama).

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

## 5. Koneksi antar modul (tanpa API)

| Dari | Ke | Pemicu |
| :--- | :--- | :--- |
| Time Off Request | Time Off Balance (ledger) | Cuti disetujui → `LEAVE_TAKEN`; ditarik / sakit ditolak → `LEAVE_REVERSED` |
| New Joiner | Employee Directory + Transition | Materialisasi → karyawan baru (`WAITING` bila join belum tiba) + transisi Onboarding |
| Benefit Claim | Benefit ledger + daftar pencairan | Workflow disetujui → `USAGE`, slot keluarga terkunci, payable `UNMARKED` |

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
| Dataset FSD Cash Advance | Cash Advance | ADV-78: nota < uang muka tertulis SHORTFALL, definisi ERD = SURPLUS — seed tidak diubah |

## 7. Setelan skenario yang berbeda dari bawaan TSD

| Setelan | Bawaan TSD | Dipakai dummy | Alasan |
| :--- | :--- | :--- | :--- |
| `finance.loan.max_active_count` | 1 | 2 | Seed memegang dua pinjaman aktif untuk Budi |
| `finance.cash_advance.max_outstanding_count` | 1 | 3 | Seed memegang dua uang muka terbuka untuk Budi |
| `finance.cash_advance.enabled` | false | true | Dataset menyalakan modul |
