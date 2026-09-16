# Tracker Konversi per Modul

Urutan yang disarankan untuk dikerjakan bertahap ("dicicil"). Setiap modul =
satu batch kerja yang berdiri sendiri: selesai, lint bersih, build hijau, commit.

Centang di sini + ubah `status` di `src/config/nav.ts` setiap kali satu layar
selesai, lalu regenerasi `docs/PAGE-INVENTORY.md`.

---

## Batch 0 — Fondasi ✅ selesai

- [x] Scaffold Vite + React 19 + TS + Tailwind v4 + ShadCN
- [x] Token design system → `@theme` + font self-hosted
- [x] Shell aplikasi (topnav, sidebar multi-level, company switcher, product picker)
- [x] Komponen rumah: `DataTable`, `Pagination`, `Modal`, `RowActions`,
      `TableToolbar`, `Segmented`, `StatusBadge`, `PageShell`, `Card`, `Toaster`,
      abstraksi form Formik
- [x] API layer + Zustand store + React Query provider + route guard
- [x] **Auth** — 10 layar (`auth.html`)
- [x] **Dashboard** — (`index.html`)

## Batch 1 — Employee Management (inti operasional)

Paling banyak dipakai dan paling padat pola tabel. Setelah ini, modul lain tinggal
mengikuti.

- [x] `/employees/directory` + `/employees/organization` — `employee-directory.html` (search berkriteria, masking PII, DIR-DETAIL)
- [x] `/me/profile` (7 seksi) — `employee-profile.html` (CRUD keluarga/training/pengalaman, reveal PII, field terkunci HR)
- [x] `/employees/new-joiner` + `/employees/new-joiner/add` — `new-joiner.html`, `add-employee.html` (draft-first, MbV identitas, SoD maker≠checker, seat reservation + auto-reject saingan, materialize ber-Idempotency-Key, wizard 4 langkah)
- [x] `/employees/transfer` + `/employees/transfer/dashboard` — `transition.html`, `transition-dashboard.html` (3 tipe transisi, 7 status task utuh, `timed_out_at` sebagai flag, konfirmasi dua pihak, waive D3 = GAP `PROB-FRONTEND-003`, clearance gate + force-release teraudit)
- [x] `/employees/mass-resignation` — `mass-resignation.html` (draft-first, dry-run blast-radius + ambang 15, SoD/rank-guard, selection hash beku → mismatch 409, circuit-breaker halt/resume/partial dengan correlation id, baris diri terkunci)
- [x] `/employees/ptkp-adjustment` — `ptkp-adjustment.html` (atestasi wajib → 422, verifier ≠ pemohon → 403, backdate tahun pajak terkunci ditolak, periode berjalan ditutup H-1, riwayat append-only, dokumen sebagai id buram)
- [x] `/employees/manpower/requisition` — `manpower-requisition.html` (draft-first: Save draft vs Submit; SoD maker≠checker → 409; rencana headcount per unit dengan Actual/Gap hasil hitung = GAP `PROB-FRONTEND-005`)
- [x] `/employees/reprimand` + `/employees/reprimand/type-setting` — `reprimand.html`, `reprimand-type-setting.html` (snapshot server-authoritative, checker ≠ maker ≠ subjek, `reason` PII disembunyikan di grid, standing derive-on-read + proyeksi, type-setting CRU dual-mode = GAP endpoint)

Baca dulu: `_prototype/EMPLOYEE-GAP-NOTES.md`.

## Batch 2 — Time Management

- [x] Time Off **Request** — `time-off-request.html` (empat gerbang submit, cuti sakit AUTO_APPROVED + jendela tolak beku, SoD 403, penarikan → CANCELLED, delegasi §3.2, jejak akses surat dokter 403/410)
- [x] Time Off **Balance** — `time-off-balance.html` (saldo dijumlahkan dari ledger, ledger append-only, HR adjustment create-only dengan sumber terkunci + refId kosong, delta bertanda ≠ 0, proyeksi bukan gerbang)
- [x] Time Off **Settings** — `time-off-settings.html` (katalog jenis cuti + statutory terkunci, unpaid×deducts ditolak, kode unik 409, satu kebijakan akrual hidup per jenis × jenis kepegawaian, berhenti hanya lewat tanggal akhir, blackout wajib bertanggal akhir)
- [x] **Attendance** — `time-attendance.html` (tap append-only + gerbang selfie 422, `Idempotency-Key` per percobaan di-scope (karyawan, key), ringkasan harian nol endpoint tulis, `attendance-summary:search` bukan scope EMPLOYEE, audit tap investigatif HR_MANAGER-only, satu koreksi hidup per hari 409, pengaju ≠ penyetuju 403, setuju hanya menyalakan `is_excused` + `excused_reason` turunan)
- [x] Attendance **Settings** — `time-attendance-settings.html` (satu sumber daya `cnf_attendance_geofence`; nama unik hanya di antara baris aktif pada cabang yang sama 409 dan sengaja tidak dicek saat Ubah, radius kecil = peringatan bukan penolakan, matriks empat baris eksplisit terkunci sistem, Deactivate satu langkah tanpa dialog, Hapus ditolak 409 lewat banner di atas List)
- [x] **Overtime** — `time-overtime.html` (mode/kategori/pemicu lapis diturunkan server, susulan wajib beralasan + jendela 7 hari, satu pending per karyawan×tanggal 409, jam disetujui boleh dipangkas tak pernah dinaikkan, SoD 403, penarikan soft-delete, ringkasan harian nol endpoint tulis dengan payable = MIN(aktual, pagu))
- [x] **Calendar** — `time-calendar.html` (dua lapis libur: nasional disemai sistem + regional/company lewat maker–checker, slot tanggal × tipe × scope dipegang baris hidup apa pun termasuk yang ditolak 409, tanggal/tipe/scope beku pasca-simpan, pola kerja berlaku ke depan dengan tujuh sakelar hari beku, pola company aktif terakhir tak bisa dihapus, kalender efektif FC-01 roster → unit/lokasi → company dengan libur ditimpakan terakhir)
- [x] **Scheduler** — `time-scheduler-index.html` + `time-scheduler-schedule.html` (Index proyeksi baca murni nol tulis; katalog shift dengan kode unik antar pola aktif 409, `crosses_midnight` turunan server, siklus berjeda 0 dan tak pernah bisa dipasang ke roster, pola yang dirujuk roster tak bisa dihapus 409; satu baris roster per karyawan × tanggal 409; bulk melangkahi baris individual/swap dan menulis ulang baris bulk; tukar hanya sepanggal, roster baru bergerak setelah disetujui sebagai satu paket, pengaju ≠ pemutus 403, penarikan menyisakan jejak Cancelled)
- [x] **On Call** — `time-oncall.html` + `time-oncall-activity.html` (jendela siaga = otorisasi di muka; pagu > plafon harian menaikkan ke lapis HR bukan menolak, rentang bertindih per karyawan 409, Ubah hanya selagi pending, pembuat ≠ pemutus 403, batal menyisakan baris; Activity bacaan tersaring nol tulis dengan sisi Requested selalu kosong dan Approved salinan pagu)

Baca dulu: `_prototype/TIME-GAP-NOTES.md`.

## Batch 3 — Finance

- [x] **Benefit Reimbursement** — `finance-benefit-reimbursement.html` (klaim menahan hak `HELD` → `CONSUMED`/`RELEASED`, keputusan approver 202 Accepted status ditulis belakangan, penahanan sengketa memblokir persetujuan 409, penolakan wajib beralasan + akui peringatan kemiripan, peringatan kemiripan tak pernah terlihat pengaju, lampiran data kesehatan terkunci, beneficiary satu baris per kerabat per periode dan tak pernah dihapus keras)
- [x] **Loan** — `finance-loan.html` + `finance-loan-detail.html` (modul yang dimatikan per company menolak 403 FIN_MODULE_DISABLED, maksimal dua pinjaman aktif 422 FIN_ACTIVE_LOAN_COUNT_EXCEEDED, pokok di atas ruang pinjam 422 FIN_LOAN_LIMIT_EXCEEDED; bunga & jadwal tidak pernah dihitung HRIS pada company berbunga; keputusan atasan 202 Accepted status ditulis belakangan, penahanan sengketa memblokir keputusan 409, antrean atasan tak pernah memuat barisnya sendiri; tiga pintu keluar terpisah — Cancel hanya SUBMITTED, Withdraw setelah AWAITING_CALCULATION, DECLINE cabang acknowledgement 422 FIN_LOAN_NOT_AWAITING_ACKNOWLEDGEMENT; ACK menyalin tawaran pihak pemberi dana dan menerbitkan jadwal angsuran)
  - Audit 15 Sep 2026 terhadap UIC §4/TSD §14.3: FIN_MODULE_DISABLED 422 (bukan 403), FIN_TENOR_INVALID, cancel 409 FIN_ALREADY_DECIDED, withdraw 422 FIN_LOAN_WITHDRAWAL_NOT_ELIGIBLE, keputusan satu endpoint `/decisions` dengan 409 FIN_ALREADY_DECIDED, dispute hold tidak lagi memblokir keputusan (kontraknya menggerbang pencairan FT5), enum `tenor_mode`/`tenor_choice_pattern`/`installment_status` sesuai TSD.
- [x] **Cash Advance** — `finance-cash-advance.html` (dicocokkan langsung ke FSD §4 · UIC §5 · TSD §14.4 · ERD §6.6–§6.7: dua pintu pengajuan, atas nama hanya Finance Officer 403; 422 FIN_MODULE_DISABLED / FIN_CASH_ADVANCE_AMOUNT_EXCEEDED / FIN_CASH_ADVANCE_LIMIT_EXCEEDED; cancel di luar SUBMITTED 409 FIN_ALREADY_DECIDED; bantahan hanya penerima pada pintu atas nama yang belum cair; pembatalan dinas tanpa gerbang persetujuan, sebab wajib; tahap pertanggungjawaban `[request_no]#[stage]`, nota bentrok 409 FIN_DUPLICATE_RECEIPT, peringatan kemiripan wajib diakui; review Finance Officer bukan pembuat atas nama → 200 UNDER_REVIEW; keputusan atasan langsung penerima 202 lalu `workflow.process.completed` menulis status + selisih; SURPLUS butuh cara pengembalian, SHORTFALL besar menyalakan lapis tambahan oleh atasan berikutnya. Enum prototype diluruskan ke ERD: selisih `OUTSTANDING` → `OPEN`, lapis tambahan = uang muka + kekurangan > batas jenis)
- [x] **Disbursement & Receivables** — `finance-disbursement.html` (dicocokkan langsung ke FSD §5 · UIC §6.2 · TSD §6.5/§14.5 · ERD §6.8: daftar Pencairan diturunkan hidup dari Benefit/Loan/Cash Advance lewat anti-join dua tingkat, bukan seed payable; HR Manager baca saja (tombol disembunyikan), Employee/Dept Manager 403; preview menampilkan baris gagal gerbang; mark-paid atomik 201 dengan 422 FIN_DISPUTE_HOLD_ACTIVE / FIN_PAYROLL_CONFIRMATION_REQUIRED; tanda CASH_ADVANCE menutup bantahan, tanda SHORTFALL menuntaskan selisih; reverse 409 FIN_REVERSAL_TARGET_ALREADY_REVERSED; declare-settled Finance Officer + HR Manager, 409 FIN_OUTSTANDING_ALREADY_RESOLVED)
- [x] **Finance Settings** — `finance-settings.html` (FSD §1 · UIC §2 · TSD §6.1/§14.1 · ERD §6.4/§6.6/§6.9: Loan Limit CRUD — satu baris per golongan 409, nominal ≥0, golongan read-only saat edit, soft-delete, plafon aktif dibaca Loan saat pengajuan; Advance Purpose Type & Rejection Reasons papan baca dengan kontrak CRUD penuh di service — reason kondisional 422 FIN_REASON_REQUIRED + riwayat, hapus bawaan 422 FIN_REJECTION_REASON_SYSTEM_DEFAULT; jenis keperluan dibaca Cash Advance)
- [x] **Finance Security** — `finance-security.html` (FSD §6 · UIC §7 · TSD §18.3–§18.5 · ERD §6.9: dispute hold satu sumber `holds-store` dibaca Benefit/Loan/Pencairan — pasang tanpa sebab 201, target 404, hold aktif ganda 409 FIN_DISPUTE_HOLD_ALREADY_ACTIVE; cabut PATCH wajib bersebab, is_active true 422, 409 FIN_DISPUTE_HOLD_ALREADY_RELEASED, pelepas Finance Officer mengabari HR Manager; ekspor Finance Officer/Super Admin, isi dari modul sumber, jejak ditulis bersama, 422 FIN_EXPORT_SCOPE_INVALID; jejak medis ditinjau HR Manager/Super Admin, pembuka HR Manager/Health Data Officer menulis jejak)
- [x] `/me/finance` (ESS) — `finance-ess.html` (FSD §7.2: hub baca tiga tab tanpa endpoint baru — Reimbursement = `POST /benefit-claims/search` milik sendiri termasuk yang belum final, detail tanpa peringatan kemiripan; Reimbursement Taken = GAP `PROB-FRONTEND-016`, dummy membaca penanda Pencairan dipersempit ke diri sendiri; Loan = `POST /loans/search` milik sendiri, View Detail ke Loan Detail. Tanpa form: New claim / New loan request membawa ke layar Benefit Reimbursement / Loan (G4). Balance cards, Beneficiaries, dan Cash Advance sengaja tidak dibawa)

Baca dulu: `_prototype/FINANCE-GAP-NOTES.md`.

## Batch 4 — Payroll

Paling berat: stepper multi-tahap + tabel lebar + banyak modal.

- [x] **Salary Processing** — `payroll-doc-processing.html` (FSD §1 · UIC §2 · TSD-0.25 §15.2/§15.7: run satu form dua cabang — 201 Insert / 200 Recalculate hanya selagi CALCULATED, lewat itu 422, Idempotency-Key per pembukaan modal; review CALCULATED→REVIEWED menulis riwayat status; detail gerbang 1·2·3 + sepuluh parameter beku + ringkasan temuan + riwayat; temuan dengan filter `OPEN`, resolve Diterima wajib beralasan 422, 409 sudah tertutup, PERIOD_NOT_PICKED_UP tidak bisa Diperbaiki manual, bulk hanya Diterima satu periode dengan `skipped[]`, `repeat_count` dihitung saat baca; impor riwayat sebelum periode gaji pertama 422, koreksi maker berbeda 403 dan menonaktifkan baris lama, verifikasi HR Manager ≠ pengimpor 403 / 409 sekali. HR Manager baca saja di menu ini)
- [ ] Payroll Run (`payroll-processing.html`) — prototype lama tanpa baris menu; ditinjau ulang terhadap FSD sebelum dikonversi
- [ ] Payroll Components, Tax Simulation, Compliance
- [x] **Authorization & Handover** — `payroll-doc-authorization.html` (FSD §2 · UIC §3 · TSD-0.25 §12/§15.1/§15.6: kunci periode dengan tiga gerbang berurutan + maker-checker `locked_by ≠ calculated_by`; buka kembali hanya oleh pemegang kunci baris itu, alasan 10–2000 karakter, tujuan mundur; otorisasi penyerahan ditahan temuan terbuka bersubjek karyawan (PERIOD_NOT_PICKED_UP dikecualikan) lalu menulis baris jembatan; tiga pola keputusan usulan — sifat komponen tanpa field alasan dan promosi ditunda ke tanggal berlaku, individual wajib beralasan saat menolak, kumpulan massal dengan asimetri gerbang eskalasi (setuju hanya penyetuju eskalasi, tolak tetap HR Manager); penyerahan: daftar menunggu, riwayat pengambilan mesin klien, ekspor ulang dua gerbang yang alasannya tetap tercatat meski ditolak. Riwayat usulan individual = GAP PROB-SERVICE-358, dirakit dari data yang sama)
- [x] **Salary Settings** — `payroll-doc-settings.html` (FSD §3 · UIC §4 · TSD-0.25 §15.1: katalog komponen CRU + soft-delete bersyarat 422 PAY_COMPONENT_IN_USE, dasar lembur diturunkan dari sifat tetap bila tidak dikirim, nama satu-satunya field yang bisa diubah langsung; usulan sifat wajib beda minimal satu sifat, anti tumpuk, tanggal berlaku dihitung sistem; nilai per karyawan dengan is_current turunan, usulan anti tumpuk per (karyawan, komponen), gerbang UMP wajib beralasan dari daftar tertutup dan jawabannya menulis jejak atestasi; kumpulan massal siklus draft penuh — buat, tambah/hapus anggota, kunci & ajukan dengan impact_summary dibekukan dan eskalasi dihitung dari jumlah anggota, batalkan hanya selagi DRAFT. Katalog, usulan, dan kumpulan memakai store yang sama dengan Authorization & Handover)
- [x] **ESS Payroll & Payslip** — `payroll-doc-ess.html` + `payroll-doc-payslip.html` (FSD §4 · UIC §5 · TSD-0.25 §15.5: Payroll Info daftar sederhana periode HANDED_OVER milik pemanggil; slip sendiri nol jejak akses, periode belum diserahkan 404; slip orang lain hanya HR Manager — baris ada tapi belum diserahkan 422 PAY_PAYSLIP_NOT_YET_AVAILABLE, penyajian berhasil menulis jejak LAYAR dan unduhan menulis UNDUHAN; jalur unduhan ketat 422 PAY_PAYSLIP_ASSEMBLY_INCOMPLETE tanpa meninggalkan jejak, layar tetap toleran; slip tidak pernah memuat employee_id dan grid HR satu-satunya tempat id itu tampil; jabatan memang tidak ada di kontrak. Jejak akses seutuhnya (#45) milik Super Admin dan belum punya layar = PROB-FRONTEND-025)

Baca dulu: `PAYROLL-GAP-NOTES.md`, `PAYROLL-AUTH-GAP-NOTES.md`,
`PAYROLL-SETTINGS-GAP-NOTES.md`.

## Batch 5 — Company & Company Management

- [x] **Branch, Group Structure, Grade & Class, Cost Center, SBU, Vendor** — `company-branch.html`, `company-group-structure.html`, `company-grade-class.html`, `company-cost-center.html`, `company-sbu.html`, `company-vendor.html` (FSD-001-COMPANY-0.9 §1 · UIC-001-COMPANY-0.9 §2.1–§2.7: satu fitur `company` untuk enam menu. Branch — kode unik antar cabang aktif 409 dan terkunci saat diubah, provinsi/kota/zona waktu diturunkan dari snapshot kode pos (kode pos asing 422), kategori cabang lengkap dengan urutan level unik dan izin melihat data turunan, tab kategori serta pilihan cabang induk hanya muncul saat `BRANCH_HIERARCHY_MODE` menyala (403 di service). Group Structure — `parent_id` menunjuk posisi bukan karyawan, level induk tidak boleh lebih dalam dari anaknya, penjagaan siklus, posisi lowong tetap sah, mengosongkan pengisi melepas snapshot atasan pada anaknya, dan setiap I/U/D menulis `log_group_struct_pos` otomatis. Grade & Class — self-ref dua tingkat, rentang gaji wajib untuk Class dan dilarang untuk Grade, `to ≥ from`, Grade yang masih memayungi Class tidak bisa dihapus. Cost Center & SBU — `code` unik antar baris aktif dan (cost center) tidak bisa diubah, hierarki bebas siklus, dan menu tertutup 403 saat `COST_CENTER_ASSIGNMENT_MODE` / `SBU_ASSIGNMENT_MODE` dimatikan. Vendor — `vendor_type` dan `pic_position` dua daftar tertutup; kontrak tidak punya kolom surel, jadi kontak hanya telepon dan alamat)
- [ ] Integration Contact, Notice, Announcement (COMPANY 0.9 menambah dua menu terakhir)
- [ ] Assets (list, detail `:id`, disposal)
- [ ] Notification inbox + rich inbox
- [ ] Files: company / employee / other / templates

Baca dulu: `COMPANY-GAP-NOTES.md`, `ASSET-GAP-NOTES.md`, `NOTIFICATION-GAP-NOTES.md`.

## Batch 6 — Document

- [ ] Letter Issuance, Category Settings, Access Trail
- [ ] `/verify` (publik, tanpa login, tanpa baris menu — DOC-80)
- [ ] `/me/files` (ESS)

Baca dulu: `_prototype/DOCUMENT-GAP-NOTES.md`.

## Batch 7 — Productivity

- [ ] Project, Tasks
- [ ] Timesheet: tracker / activities / summary / report
- [ ] Group for Payroll: task list / group list
- [ ] Forms & Survey + My Submissions

Baca dulu: `_prototype/PRODUCTIVITY-GAP-NOTES.md`.

## Batch 8 — System & Settings

- [ ] `/settings/configuration/:tab` (8 tab, SATU halaman — satu pintu baca/tulis)
- [ ] Change History
- [ ] Personal Data Erasure

Baca dulu: `_prototype/SETTINGS-GAP-NOTES.md`.

## Batch 9 — Produk lain (product picker)

- [ ] Recruitment: home, job listings (+ create, + detail `:id`), add candidate, import logs (+ detail)
- [ ] Performance: cycles, KPI items, sheets, approvals, objections, reports

## Batch 10 — Pengerasan

- [ ] Route `React.lazy` + code splitting
- [ ] Integrasi backend nyata (hapus blok `MOCK` di setiap service)
- [ ] Cloudflare Turnstile asli
- [ ] Test suite per modul (`.agents/workflows/test.md`)
- [ ] Audit aksesibilitas (fokus, label, kontras)
