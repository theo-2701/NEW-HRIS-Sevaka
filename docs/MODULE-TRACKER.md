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
- [ ] Time Off **Balance** — `time-off-balance.html`
- [ ] Time Off **Settings** — `time-off-settings.html`
- [ ] Attendance + settings
- [ ] Overtime, Calendar
- [ ] Scheduler (index + schedule)
- [ ] On Call (schedule + activity)

Baca dulu: `_prototype/TIME-GAP-NOTES.md`.

## Batch 3 — Finance

- [ ] Benefit Reimbursement, Loan (+ detail `:id`), Cash Advance
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
