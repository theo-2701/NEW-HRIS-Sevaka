# TIME-GAP-NOTES

Catatan build modul **Time Management** terhadap `FSD-001-TIME-0.1` dan `UIC-001-TIME-0.1`.
Format sama dengan `EMPLOYEE-GAP-NOTES.md` / `FINANCE-GAP-NOTES.md`.

## Halaman yang dibangun

| Menu (FSD) | File | Resource |
| :--- | :--- | :--- |
| §1 Calendar | `time-calendar.html` | `mst_holiday`, `cnf_work_calendar` (+ kalender efektif, komputasi) |
| §2 Time Off Request | `time-off-request.html` | `emp_leave_request`, `emp_leave_delegation`, `log_medical_document_access` |
| §3 Time Off Balance | `time-off-balance.html` | `emp_leave_balance`, `log_leave_balance_ledger` |
| §4 Time Off Settings | `time-off-settings.html` | `cnf_leave_type`, `cnf_leave_accrual_policy`, `cnf_leave_blackout_period` |
| §5 Attendance | `time-attendance.html` | `log_attendance_punch`, `emp_attendance_daily`, `emp_attendance_correction` |
| §6 Attendance Settings | `time-attendance-settings.html` | `cnf_attendance_geofence` |
| §7 Overtime | `time-overtime.html` | `emp_overtime_request`, `emp_overtime_daily` |
| §8 Scheduler Index | `time-scheduler-index.html` | proyeksi baca `emp_shift_assignment` |
| §9 Scheduler Schedule | `time-scheduler-schedule.html` | `cnf_shift`, `emp_shift_assignment`, `emp_shift_swap_request` |
| §10 + §11 On Call | `time-oncall.html` | `emp_oncall_assignment` + jendela pandang tersaring atas `emp_overtime_request` |

Aset bersama: `js/time-data.js` (dataset skenario positif dari kedua dokumen) dan `css/time.css`
(hanya komponen baru: chip hari kerja, kalender efektif, konsol punch, matriks kanal, grid roster).
Sisanya memakai standar yang sudah ada (`employee-flows.css`, `form-standard.css`,
`pagination-standard.css`, `finance.css`) sesuai `CLAUDE.md`.

## Keputusan build (bukan gap)

1. **§10 + §11 digabung dalam satu halaman bertab.** FSD memisahkan On Call Schedule dan On Call
   Activity sebagai dua menu, tetapi §11 secara eksplisit menyatakan Activity bukan resource
   tersendiri — hanya jendela pandang tersaring atas `emp_overtime_request`. Dua tab pada satu
   halaman menjaga item sidebar tetap dua sesuai peta menu, tanpa menduplikasi shell.
   Item sidebar "On Call Activity" menuju `time-oncall.html#activity`.
2. **Sub-tab segmented, bukan dua tabel bertumpuk.** Calendar (Working patterns / Effective
   calendar) dan Attendance (Daily summary / Tap history) memakai `.subtabs` + `.seg`, sesuai
   aturan "jangan menumpuk dua tabel dalam satu panel" di `CLAUDE.md`.
3. **Modal, bukan halaman penuh.** Seluruh form pada modul ini transaksional-pendek (satu
   keputusan, satu penetapan), jadi memakai `.ovl` standar. Tidak ada alur bertahap panjang
   seperti New Joiner yang menuntut full-page stepper.
4. **Bahasa Inggris.** Konsisten dengan seluruh build (`CLAUDE.md` › Language). Nilai data dari
   dokumen (nama hari libur, alasan cuti, catatan) tetap apa adanya dalam Bahasa Indonesia karena
   itu isi data, bukan label UI.
5. **`emp-hendra` sebagai aktor sesi.** Dipakai agar SoD terlihat hidup: baris miliknya sendiri
   menyembunyikan tombol keputusan, baris orang lain menampilkan Review. Satu baris holiday
   (`hol-4`) sengaja dibuat oleh `emp-rina` supaya jalur checker dapat dicoba.
6. **Keputusan asinkron (`200 diterima`).** Setiap drawer keputusan (holiday, cuti, koreksi,
   lembur, siaga) menampilkan toast "accepted and forwarded" lebih dulu, lalu status final
   menyusul ±1,4 detik kemudian — meniru kontrak "200 bukan berarti baris sudah berpindah".
7. **Nol tombol tulis di layar baca-saja.** Scheduler Index, Overtime Daily Summary, Attendance
   Daily Summary/Tap History, dan On Call Activity tidak punya kolom Action sama sekali —
   sesuai kontrak, bukan kelalaian.

## Cek gap — Time Off Request (§2 FSD / §3 UIC)

Hasil perbandingan build ⟷ dokumen ⟷ screenshot Figma. Dokumen menang; Figma hanya penguat.

**Diperbaiki (build menyimpang dari dokumen)**

1. **Status penarikan `WITHDRAWN` → `CANCELLED`.** UIC §3.1.5 mengembalikan `request_status: "CANCELLED"`;
   penarikan adalah transisi status, bukan soft-delete. Label grid/filter ikut berubah
   ("Cancelled — withdrawn").
2. **Riwayat Akses Dokumen Medis dipindah ke dalam Detail.** FSD §2.1 `F3` menyatakan ini
   **sub-view di Detail**, bukan menu/tab tingkat halaman. Sekarang: Detail modal punya sub-tab
   segmented `Detail | Medical Document Access`, tersaring ke pengajuan itu saja, dan sub-tab hanya
   muncul bila pengajuan punya lampiran. Tab tingkat halaman dihapus (tinggal Requests + Delegation
   = `A2` + `G2`).
3. **Dua sudut pandang list (`A2` vs `D2`) lewat identitas, bukan checkbox filter.** Checkbox
   "My requests only" diganti pemilih **Signed in as** (Hendra HR_MANAGER · Budi DEPT_MANAGER ·
   Rina EMPLOYEE) yang menggerakkan sesi. Peran non-approver → mode ESS: baris tersaring ke miliknya
   sendiri, nol aksi keputusan, tab Delegation tertutup — sesuai catatan #2 Peta Menu ("layar sama,
   dibatasi baris dari klaim identitas").
4. **Gerbang blackout keras memakai `422`, bukan `409`.** UIC §3.1.1: blackout → `422` (baris tak
   pernah terbentuk); `409` hanya untuk tumpang tindih tanggal.
5. **`requires_extra_approval_reason` kini mengikuti pemicunya** (`NEGATIVE_BALANCE`,
   `SOFT_BLACKOUT`, `UNPAID_TYPE`, `LONG_DURATION`) — sebelumnya selalu ditulis `LONG_DURATION`.
6. **Enum `access_purpose`** `DSR` → `DATA_SUBJECT_REQUEST` (UIC §3.1.8).
7. **Otorisasi buka surat dokter ditegakkan di layar.** Hanya sesi ber-`ROLE_HR_MANAGER`
   (calon `ROLE_HEALTH_DATA_OFFICER`) dapat menekan Buka Surat Dokter; peran lain melihat penjelasan
   `403` dan **tidak** menghasilkan baris jejak. Jalur `410` sekarang dapat didemokan lewat
   `leave-6` (`doctor_note_purged: true`) — mencabut catatan "belum bisa didemokan" di bawah.
8. **Cakupan delegasi tidak lagi mengarang enum.** Pilihan `LEAVE_ONLY`/`ATTENDANCE_ONLY` dibuang;
   tinggal `{ scope: "ALL_APPROVALS" }` dan "tidak diisi = seluruh task tertahan" sesuai §3.2.1.
9. **Delegasi hanya untuk pemegang peran approver** (§3.2): tombol Register substitute tertutup bagi
   sesi EMPLOYEE; daftar "delegated leave" menyaring cuti hidup milik sendiri yang belum punya
   delegasi hidup (mencegah `409`); ganti pengganti hanya selagi `PENDING_APPROVAL`.
10. **Field "Requester" read-only** ditambahkan di form pengajuan (sesuai frame Figma "Pengaju"),
    menegaskan `employee_id` diambil dari token dan tak dapat diisi.

**Dataset diselaraskan ke Dataset Skenario Positif UIC**

- `leave-2` → 24 Jul 2026, `submitted_at` 07:30 (sebelumnya 23 Jul); tenggat tolak tetap
  25 Jul 23:59:59 → jam demo 24 Jul 09:00 tetap berada di dalam jendela.
- `leave-3` → satu hari 10 Agu 2026, `HALF_AM`, `0.5` hari, alasan "Mengurus dokumen keluarga."
  (persis contoh `POST /leave-requests` §3.1.1).
- `leave-4` → milik **`emp-hendra`**, `APPROVED` (disetujui `emp-budi`, SoD terlihat) karena
  `deleg-1` di §3.2.1/§3.2.2 berinduk pada `leave-4` dengan `employee_id: emp-hendra`.
  Baris cuti setengah hari `emp-sari` bersaldo minus dipindah ke `leave-8`.
- `deleg-1` → `leave-4`, hendra → sari, `APPROVED`; `deleg-2` → `leave-7`, hendra → budi,
  `PENDING_APPROVAL` (jalur ubah/batalkan tetap dapat dicoba).
- Jejak akses medis → `access-1` 24 Jul 2026 10:15 `VERIFICATION` oleh `emp-hendra`.

**Beda dari Figma yang dipertahankan (fungsional setara)**

- Bahasa Inggris (`CLAUDE.md` › Language) sementara frame Figma berbahasa Indonesia.
- Form & keputusan memakai modal `.ovl` standar, bukan halaman penuh — aksi transaksional pendek
  (`CLAUDE.md` › Container choice). Panel "Keputusan Approval" pada frame Figma berada di dalam
  halaman detail; di sini menjadi modal keputusan dengan isi yang sama (termasuk catatan SoD dan
  alasan wajib untuk tolak).
- Aksi baris ≥2 dikumpulkan ke dropdown "Action ▾" (standar tabel), bukan ikon lepas seperti frame.

**Tambahan yang perlu dikonfirmasi**

6. **Scope pencarian jejak akses medis = `SUPER_ADMIN`** (§3.3), sengaja bukan pemegang
   `medical-document:read`. Di prototipe grid jejak tetap terlihat oleh sesi HR agar sub-view `F3`
   dapat didemokan, dengan catatan kontrak tertulis di layar. Bila pemisahan itu harus terlihat
   keras, perlu satu sesi `SUPER_ADMIN` pada dataset.

## Cek gap — Time Off Settings (§4 FSD / §5 UIC)

**Diperbaiki (build menyimpang dari dokumen)**

1. **Banner peringatan Statutory di Form Edit Leave Type.** FSD §4.1 `B3` mensyaratkan banner tampil bila
   baris yang dibuka berstatus Statutory. Sebelumnya hanya ada field read-only "Statutory: Yes".
2. **`leave_code` immutable pasca-insert** (UIC §5.1.3: subset field yang boleh diubah **kecuali**
   `leave_code` dan `is_statutory`). Form Edit kini menampilkan kode sebagai read-only dengan hint,
   dan `saveType` memakai kode lama, bukan isi input.
3. **Gerbang `409` hapus jenis cuti diperluas** ke `emp_leave_request`, `log_leave_balance_ledger`, dan
   `emp_leave_balance` (UIC §5.1.4) — sebelumnya hanya memeriksa `cnf_leave_accrual_policy`.
4. **Filter/search grid mengikuti kontrak search.** Leave Type: `leave_code`/`leave_name` (LIKE),
   `is_active`, `is_statutory` (§5.1.5); Accrual Policy: `leave_type_id`, `is_eligible` (§5.2.5);
   Blackout: `blackout_name` (LIKE), `blackout_mode` (§5.3.5). Sebelumnya nol filter.
5. **Pagination `.ph-foot`** dipasang pada ketiga grid (`CLAUDE.md` › Tables) — ketiganya tumbuh
   tak berbatas (jenis tambahan company, policy per periode, periode blackout per tahun).

**Sudah sesuai dokumen (nol perubahan)** — enam flag independen tanpa diratakan; tolak `422` kombinasi
tak-dibayar + potong-saldo; `is_statutory` read-only & tak dapat dihapus; dropdown Jenis Cuti pada
policy dibatasi ke flag Potong Saldo; `rate_per_month` wajib/kosong mengikuti `is_eligible`; field
carry-over kondisional wajib-berpasangan hanya pada `CARRY_CAPPED`; tombol **Akhiri** hanya selagi
`effective_until` kosong dan mengisi tanggal (bukan edit rate); gerbang `409` tumpang tindih
jenis×kepegawaian; blackout wajib dua tanggal, tumpang tindih sengaja diizinkan, `HARD` menang atas
`SOFT`, banner kekebalan statutory di layar.

**Beda dari Figma yang dipertahankan** — Bahasa Inggris; form memakai modal `.ovl` standar (screenshot
Figma memakai drawer kanan) dengan isi field identik; aksi baris ≥2 dikumpulkan ke dropdown
"Action ▾" alih-alih ikon pensil/tong sampah lepas.

## Cek gap — Attendance (§5 FSD / §6 UIC)

**Diperbaiki (build menyimpang dari dokumen)**

1. **Enum `correction_reason_type` salah.** Build memakai `DEVICE_ERROR`/`OFFICIAL_DUTY`; UIC §6.3.1
   mengunci `FORGOT_PUNCH | APP_ERROR | OFFICIAL_TRAVEL | OTHER`. Dropdown, label, dan dataset
   diselaraskan.
2. **Approval menulis ulang penilaian hari — dilarang.** Build lama menyetel
   `attendance_status='PRESENT'`, `late_minutes=0`, `undertime_minutes=0` saat koreksi disetujui.
   UIC §6.3.4 + §1.7: yang berubah **hanya** `is_excused=true` + `excused_reason`; angka mentah tetap
   apa adanya. Sekarang persis itu.
3. **`excused_reason` kini enum, bukan kalimat.** Peta resmi `FORGOT_PUNCH`/`OTHER` →
   `APPROVED_CORRECTION`, `APP_ERROR` → `APP_ERROR`, `OFFICIAL_TRAVEL` → `OFFICIAL_TRAVEL` —
   diturunkan sistem, **tidak** dipilih approver. Drawer keputusan menampilkan nilai yang akan
   terisi sebelum tombol ditekan.
4. **Scope peran ditegakkan lewat pemilih identitas** (pola sama Time Off Request). Sesi lama
   `emp-hendra` (HR_MANAGER) memfilekan koreksinya sendiri — padahal `attendance-correction:create`
   hanya dipegang `HR_STAFF` · `EMPLOYEE` (§6.3.1). Sekarang: Rina (EMPLOYEE, default) ·
   Sari (HR_STAFF, mengajukan atas nama) · Hendra (HR_MANAGER, checker; tombol ajukan tertutup).
5. **`attendance-summary:search` bukan scope EMPLOYEE** (§6.2.2) — pada sesi EMPLOYEE grid Ringkasan
   Harian tersaring ke hari miliknya sendiri, dengan keterangan di layar.
6. **`attendance-punch:search` adalah kewenangan penyelidikan** (§6.1.3, SUPER_ADMIN · HR_MANAGER —
   `DEPT_MANAGER` pemegang `:read` pun tidak). Tab Riwayat Tap kini tertutup total selain sesi
   HR_MANAGER; tap hari ini tetap terlihat di tab Punch.
7. **Gerbang selfie `422` dapat didemokan.** Kanal capture dihitung dari persilangan
   `work_arrangement` × aturan titik geofence (dataset `geo-1`: WFO → radius + selfie wajib).
   Bila kanal mewajibkan selfie dan tak terlampir, tap ditolak `422` dan baris tak lahir
   (FSD §5.2 baris "Foto Swafoto"). Mekanisme unggah berkas masih menyusul — field mencatat
   *ketersediaan*, dinyatakan di helper text.
8. **`Idempotency-Key` ditampilkan** pada konfirmasi tap dan dijelaskan sebagai per-percobaan-tap,
   dipakai ulang apa adanya saat retry (§6.1.1) — sebelumnya tak muncul sama sekali.
9. **Gerbang `409` satu koreksi aktif per hari** ditegakkan di form (sebelumnya hanya disaring lewat
   dropdown; kini juga ditolak di submit).
10. **Dua drawer keputusan, bukan satu drawer tiga tombol.** FSD §5.1 memisahkan `D3` (Setuju) dan
    `D5` (Tolak); footer kini dua tombol sesuai standar. "View Detail" pindah ke modal detail
    baca-saja sendiri.
11. **Field "Filed by" read-only** di form pengajuan — `employee_id` dari token, dan **pengaju boleh
    berbeda dari pemilik hari** (§6.3.1); kolom "Day owner" ditambahkan ke grid koreksi supaya
    pasangan itu terbaca.
12. **Filter grid mengikuti kontrak search** (sebelumnya nol filter): Ringkasan Harian
    (`attendance_status`, `day_type`, `is_excused`, karyawan), Riwayat Tap (`punch_type`,
    `is_within_geofence`, `is_mock_location_suspected`, karyawan), Koreksi (`correction_status`,
    `correction_reason_type`, pengaju). Kolom `day_type` juga ditambahkan ke tabel harian.

**Dataset diselaraskan ke Dataset Skenario Positif UIC**

- `day-rina-27` (27 Jul, `PRESENT`, `worked 547`, `late 5`, `is_excused: true`,
  `excused_reason: APP_ERROR`) dan `day-rina-26` (26 Jul, `ABSENT`, `undertime 540`, belum punya
  koreksi) ditambahkan persis §6.2.1/§6.2.2 — hari 26 Juli sengaja dibiarkan bersih sebagai jalur
  demo pengajuan baru.
- `cor-1` → milik `emp-rina` atas `day-rina-27`, `FORGOT_PUNCH`, `requested_out 17:05`,
  catatan dan `submitted_at` persis §6.3.1.
- `cor-2` → pengaju `emp-sari` (HR_STAFF) atas hari milik `emp-hendra` — memperlihatkan pengaju ≠
  pemilik hari; `cor-3` `OFFICIAL_TRAVEL` disetujui `emp-hendra`; `cor-4` `OTHER` `CANCELLED`.
- Hari `SICK`/`ON_LEAVE` tidak lagi membawa kalimat bebas pada `excused_reason`
  (lihat "perlu dikonfirmasi" #6).

**Beda dari Figma yang dipertahankan (fungsional setara)** — Bahasa Inggris; keputusan checker lewat
modal `.ovl` standar; aksi baris ≥2 dikumpulkan ke dropdown "Action ▾"; penarikan memakai modal
konfirmasi standar, bukan `confirm()` bawaan browser seperti disebut FSD §5.5 (konsisten dengan
seluruh build).

**Perlu dikonfirmasi**

6. **Enum `excused_reason` untuk hari cuti/sakit.** Kontrak hanya menyebut tiga nilai turunan koreksi
   (`APPROVED_CORRECTION`, `APP_ERROR`, `OFFICIAL_TRAVEL`). Hari `ON_LEAVE`/`SICK` di prototipe
   karenanya `is_excused: false` — statusnya sendiri yang membawa fakta itu. Bila memang ada nilai
   resmi untuk cuti disetujui, perlu namanya.
7. **Titik geofence yang dipakai saat tap** diresolusi di layar dari cabang karyawan + `is_active`.
   Dokumen menyatakan `geofence_id` diturunkan server tanpa merinci aturan pemilihan bila satu
   cabang punya beberapa titik aktif.

## Cek gap — Overtime (§7 FSD / §8 UIC)

**Diperbaiki (build menyimpang dari dokumen)**

1. **Cakupan peran diperluas ke empat sesi sesuai scope kontrak.** Sebelumnya hanya Rina (EMPLOYEE) dan
   Hendra (HR_MANAGER). UIC §8.1 memisahkan tiga kewenangan berbeda: `:create` = **EMPLOYEE saja**,
   `:approve` = **HR_MANAGER · DEPT_MANAGER**, `:search` = kelima peran. Sekarang: Rina (EMPLOYEE) ·
   **Budi (DEPT_MANAGER)** · **Sari (HR_STAFF)** · Hendra (HR_MANAGER).
2. **Tombol "Request overtime" tertutup bagi sesi non-EMPLOYEE** (§8.1.1: `employee_id` diambil dari
   token, lembur tak dapat diajukan atas nama orang lain). Sebelumnya tombol selalu tampil di semua sesi.
3. **HR_STAFF = pembaca lintas-karyawan tanpa permukaan keputusan.** `:search` membuka seluruh antrean,
   tetapi `:approve` bukan miliknya — barisnya nol aksi. Sebelumnya baris lintas-karyawan hanya terbuka
   bagi pemutus, sehingga HR_STAFF salah tersaring ke mode ESS.
4. **Urutan kolom grid diselaraskan ke §7.2A** (dan frame Figma): … Jam Diminta · Jam Disetujui ·
   **Status** · **Pemicu Lapis** · Aksi. Sebelumnya Pemicu Lapis mendahului Status.
5. **Filter Ringkasan Harian mengikuti kontrak search §8.2.2** (`overtime_category`, `overtime_date`
   BETWEEN, `employee_id`) — sebelumnya tab itu nol filter meski gridnya tumbuh per tanggal.
6. **Baris call-out otomatis kini punya jalur baca.** Kolom Aksi tetap bertuliskan "Automatic" (§7.2A:
   teks, nol ikon tulis), tetapi `GET /overtime-requests/{id}` **memang** kontrak resmi untuk baris ini
   (§8.1.2/§12.1) — jadi tombol **View Detail** disandingkan; nol permukaan tulis, tetap.
7. **Detail baris melengkapi field kontrak §8.1.2**: `workflow_instance_id` (kosong pada baris call-out —
   ia tak menjalankan workflow), `created_by` = **SYSTEM** `00000000-…-000000000000` pada baris call-out,
   dan keterangan bahwa `approved_hours` 4,00 adalah **salinan beku** `max_callout_hours` jendela siaga,
   bukan dibaca ulang saat recompute.
8. **ID roster siaga diselaraskan ke kontrak**: `oc-1..oc-4` → `oncall-1..oncall-4`, sehingga
   `ot-2.oncall_assignment_id = "oncall-1"` persis §8.1.2 (sebelumnya `oc-1`, tautan benar tapi nama beda).

**Sudah sesuai dokumen (nol perubahan)** — lima nilai status berdiri sendiri (Pending / Auto-approved /
Approved / Rejected / Cancelled) tanpa diratakan; `CANCELLED` sebagai transisi soft-delete (§8.1.6),
bukan hard-delete; `submission_mode`/`overtime_category`/`requires_extra_approval_reason` diturunkan
server dan kotak Pratinjau menyatakan nilai kiriman client diabaikan; pemicu lapis **menaikkan, bukan
menolak** (banner di kedua drawer keputusan); `422` tanggal lewat tanpa alasan / di luar jendela susulan,
`409` satu pengajuan PENDING hidup per karyawan×tanggal; Ubah hanya selagi PENDING dan men-rerun
mode+plafon bila tanggal berubah; `approved_hours` wajib saat Setuju dan boleh dipangkas, `403` SoD;
Ringkasan Harian nol tombol tulis dengan `payable_hours = MIN(actual, approved_hours_total)` dan
`overtime_request_id` sebagai provenance, bukan sumber pagu; recompute dijalankan **setelah** keputusan
dan hanya bila fakta punch tanggal itu ada.

**Beda dari Figma yang dipertahankan (fungsional setara)**

- Badge status baris call-out: Figma menulis **"Auto Call-Out"**, kontrak menyimpan `AUTO_APPROVED` →
  label build **"Auto-approved"** (nilai enum yang menang), sementara sifat call-out-nya sudah terbaca dari
  kolom On-call window + teks Aksi "Automatic".
- Bahasa Inggris; dua resource dipisah **tab** (Requests / Daily Summary) alih-alih dua tabel bertumpuk
  seperti frame — `CLAUDE.md` › Tables melarang dua tabel dalam satu panel; isinya identik.
- Aksi baris ≥2 dikumpulkan ke dropdown "Action ▾" alih-alih ikon lepas (✎ ↩ ✓ ✗).
- **Tarik memakai modal konfirmasi standar**, bukan `confirm()` bawaan browser seperti disebut FSD §7.5 —
  konsisten dengan seluruh build (pola sama Attendance §5.5).

**Perlu dikonfirmasi**

9. **`overtime.retroactive_window_days`** di-hardcode **7 hari** (§8.1.1 menyebut namanya tanpa angka).
10. **Pembulatan `payable_hours`** masih murni `MIN(actual, ceiling)`; satuan pembulatan dan ambang
    minimum (§7.2D) belum berangka — sama dengan catatan #3 di bawah.
11. **Filter status single-select** sementara kontrak `overtime_status` memakai `IN` (multi). Bila
    pemutus perlu menyaring "Pending + Auto-approved" sekaligus, kontrolnya perlu jadi multi-select.

## Cek gap — Attendance Settings (§6 FSD / §7 UIC)

**Diperbaiki (build menyimpang dari dokumen)**

1. **Hapus tanpa dialog konfirmasi.** FSD §6.5 menyatakan eksplisit menu ini **berbeda** dari menu lain:
   Hapus **langsung** memeriksa gerbang "masih dirujuk?" tanpa dialog perantara, dan penolakan tampil
   sebagai **banner pada List** (`D3`), bukan dialog. Modal `geoDelete` dibuang; kini banner `409` di
   atas grid + toast, dan jalur sukses (`200`) langsung menghapus baris.
2. **Nonaktifkan adalah aksi satu-langkah dari baris.** FSD §6.2 ("diubah **langsung dari List**,
   bukan form terpisah") + §6.4 ("nol decision, nol cabang error — aksi ini tidak pernah ditolak").
   Modal konfirmasi `geoToggle` dibuang; item Action ▾ langsung membalik `is_active` + toast.
3. **Filter grid mengikuti kontrak search** (§7.5: `geofence_name` LIKE, `scope_ref` =, `is_active` =).
   Sebelumnya hanya ada filter cabang; kini + pencarian nama titik dan filter status.
4. **`is_active` hadir di form** (§7.1: opsional, default `true`; frame Figma juga menampilkannya
   sebagai checkbox). Sebelumnya titik baru selalu lahir aktif tanpa field, dan Ubah tak dapat
   menyentuh kolom itu meski §7.3 memasukkannya ke subset field yang boleh diubah.

**Dataset diselaraskan ke Dataset Skenario Positif UIC**

- `geo-1` = `geo-hq` §7.2 apa adanya: koordinat `-6.224700, 106.809200`, radius **150 m**,
  `MOBILE.enforce_radius: false`. Sebelumnya build menyimpan *state pasca-ubah* skenario FSD §6.3
  (radius 120, MOBILE wajib radius) sebagai baseline — sehingga alur Ubah tak lagi dapat didemokan
  dan radius `150` yang dirujuk contoh punch §6.1.1 hilang. Titik ini yang dirujuk tap → jalur
  penolakan `409` pada Hapus.
- `geo-3` = `geo-mks-1` §7.1 (nama lengkap "— Lobi Utama", `-5.147700, 119.432700`, radius 100,
  matriks WFO/HYBRID radius+swafoto · WFH/MOBILE swafoto saja, aktif). Sebelumnya nama dipotong,
  radius/matriks/`is_active`-nya karangan. Karena belum pernah memvalidasi tap, baris inilah jalur
  Hapus sukses (`200`).
- `geo-2` "Gedung B" tetap sebagai hasil skenario tambah FSD §6.3 (radius 100, matriks sesuai
  contoh), koordinat diselaraskan ke frame Figma.

**Sudah sesuai dokumen (nol perubahan)** — nama 3–150 karakter & unik hanya di antara baris aktif
**pada cabang yang sama** (`409`), cek bentrok nama sengaja **tidak** dijalankan pada Ubah (§6.3:
"tanpa pengecekan nama-bentrok"); koordinat wajib berpasangan ±90/±180 presisi 6 desimal; radius
bilangan bulat positif dengan radius kecil sebagai **peringatan, bukan penolakan**; matriks terkunci
empat baris × dua flag eksplisit tanpa default tersirat; mengubah radius/matriks tak menyentuh tap
yang sudah dinilai (dinyatakan di toast dan di layar).

**Beda dari Figma yang dipertahankan (fungsional setara)** — Bahasa Inggris; form memakai modal
`.ovl` standar (frame Figma memakai drawer kanan) dengan field identik; tiga aksi baris dikumpulkan
ke dropdown "Action ▾" alih-alih tiga ikon lepas (✎ ⏻ 🗑) — standar tabel `CLAUDE.md`.

**Perlu dikonfirmasi**

8. **Reaktivasi titik.** Dokumen hanya menjabarkan Nonaktifkan; menyalakan kembali `is_active`
   tersedia lewat §7.3 sehingga item Action ▾ berubah jadi "Reactivate" pada baris nonaktif.
   Bila memensiunkan titik harus permanen, item itu perlu dicabut.

---

## Batas dataset (dinyatakan dokumen, bukan gap)

- `cnf_shift.cycle_def` dan `flex_band` tidak tergambar di frame manapun. Field-nya tetap ada
  di form (kondisional per tipe) sebagai textarea JSON; dataset hanya memuat pola Tetap +
  satu pola Fleksibel dan satu Siklus nonaktif sebagai contoh katalog.
- `cnf_leave_accrual_policy.work_status_id` hanya mengenal satu nilai ("Tetap") — katalognya
  milik service kepegawaian lain.
- Mekanisme unggah berkas (surat dokter, foto swafoto) masih menyusul di seluruh HRIS. Form
  hanya mencatat *ketersediaan* lampiran, dinyatakan eksplisit di helper text.

## Yang perlu dikonfirmasi

1. **Plafon jam harian company** (dipakai untuk memicu lapis approval tambahan pada Overtime dan
   On Call) di-hardcode `8` jam pada `TimeData.DAILY_HOUR_CAP`. Dokumen menyebut "plafon jam kerja
   harian company" tanpa angka — perlu nilai riil atau sumber kolomnya.
2. **Ambang durasi cuti** yang memicu lapis tambahan (`LONG_DURATION`) juga tidak berangka di
   dokumen; sementara dipakai > 5 hari kerja.
3. **Pembulatan & ambang minimum jam lembur** pada `payable_hours` (§7.2 menyebut "dibulatkan
   turun ke satuan pembulatan yang berlaku dan dinolkan bila di bawah ambang minimum") — satuan
   dan ambangnya belum berangka; prototipe memakai `min(actual, ceiling)` tanpa pembulatan.
4. **Peran "pemegang data kesehatan"** pada Medical Access Log dimodelkan sebagai sesi HR yang
   sedang login. Bila ada peran terpisah dari HR Manager, perlu ditambahkan ke role gate.
5. **Retensi surat dokter** (jalur `410`) sekarang punya baris data (`leave-6`,
   `doctor_note_purged`) sehingga state-nya dapat didemokan; flag itu sendiri belum punya kolom di
   kontrak — perlu nama kolom/derivasi resmi (mis. dari masa retensi document-service).
