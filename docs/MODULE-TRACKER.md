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
- [ ] Loan (+ detail `:id`), Cash Advance
- [ ] Disbursement & Receivables
- [ ] Finance Settings, Finance Security
- [ ] `/me/finance` (ESS)

Baca dulu: `_prototype/FINANCE-GAP-NOTES.md`.

## Batch 4 — Payroll

Paling berat: stepper multi-tahap + tabel lebar + banyak modal.

- [ ] Salary Processing (`payroll-doc-processing.html`) + Payroll Run (`payroll-processing.html`)
- [ ] Payroll Components, Tax Simulation, Compliance
- [ ] Authorization & Handover, Salary Settings
- [ ] ESS: `/me/payroll`, `/me/payslip`

Baca dulu: `PAYROLL-GAP-NOTES.md`, `PAYROLL-AUTH-GAP-NOTES.md`,
`PAYROLL-SETTINGS-GAP-NOTES.md`.

## Batch 5 — Company & Company Management

- [ ] Branch, Group Structure, Grade & Class, Cost Center, SBU, Vendor, Integration Contact
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
