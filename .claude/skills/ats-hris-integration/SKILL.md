---
name: ats-hris-integration
description: Menyambungkan ATS/Recruitment dengan HRIS Sevaka, terutama modul Employee (Requisition, New Joiner, ATS Bridge, Directory, Transition) dan Company (Branch, Group Structure/posisi, Grade & Class). Aktif saat pengguna minta "konekin ATS dan HRIS", "kandidat terpilih masuk HR", "requisition jadi lowongan", "hire jadi karyawan", atau melanjutkan tugas nomor 3 dari handoff 3 Nov 2026.
---

# Integrasi ATS ↔ HRIS (tugas #3 handoff 3 Nov 2026)

## Alur target (MOM 28 Okt 2026 — `docs/MOM-2026-10-28.md`)

```
[HRIS Employee] Requisition (posisi dari Company, maker≠checker, approval berjenjang)
      │ APPROVED
      ▼
[ATS] Job Listing (judul, posisi, level, jobdesk, kualifikasi, gaji, tenggat = active_from/until)
      │ kandidat melamar / diundang → consent SEKALI di ATS
      ▼
[ATS] Pipeline → interview → requestor memilih kandidat + alasan  (kandidat lain tereliminasi)
      │ SELECTED → notifikasi
      ▼
[HRIS Employee] bucket HRD = New Joiner (status WAITING/DRAFT dari data kandidat, HR hanya validasi)
      │ kontrak digital (OTP + selfie) → Process Candidate (materialize)
      ▼
[HRIS Employee] Directory (karyawan WAITING/ACTIVE) → Transition onboarding → provisioning sekali aktivasi
```

## Titik sambung yang SUDAH ada (mode dummy, panggilan fungsi antar service)

- `src/features/manpower/` — Requisition (kaskade Unit → Supervisor → Requestor → posisi kosong,
  `position_ids`), `manpowerService`.
- `src/features/ats-bridge/` — jembatan kandidat: `atsBridgeService.invite/materialize`, portal kandidat
  publik (`candidatePortalService`), `atsAvailableForNewJoiner`, `releaseAtsFromNewJoiner`.
- `src/features/new-joiner/` — `newJoinerService` (invite, approve, materialize, correctContact),
  `startOnboardingForNewJoiner` (transitions), `registerMaterializedEmployee` (employees),
  `queueContactVerification` (contact-verification).
- `src/features/company/` — master Branch, Group Structure (posisi/kursi), Grade & Class, Cost Center, SBU.
- `src/features/recruitment/` — Job Listings, Add Candidate (belum tersambung ke HRIS).

## Yang harus dibangun

1. **Requisition → Job Listing**: tombol "Create job listing" pada requisition `APPROVED`
   (`ManpowerRequisitionPage`), prefill dari posisi Company (departemen, jabatan, level/grade, jobdesk,
   kualifikasi, gaji — MOM *Requisition #2*: data sudah ada di Position Setting tapi belum tampil).
   Simpan `requisitionId` di `JobListing`; job listing tidak boleh membuka kursi lebih dari `position_ids`.
2. **Kandidat terpilih → New Joiner**: aksi "Select candidate" di pipeline ATS (oleh requestor) →
   satu fungsi `handoffToHris(candidate, requisitionId)` yang membuat baris New Joiner (pakai service
   new-joiner, jangan duplikasi logika) dan mengeliminasi kandidat lain di lowongan itu. HR mendapat
   notifikasi (pakai modul notification bila ada; minimal badge/antrean "Awaiting HR validation").
3. **Data otomatis** (MOM *Data Karyawan Baru #2*): Grade dari golongan posisi, posisi & role dari mapping
   — HR tidak mengisi ulang. Bank & rekening diisi kandidat (portal), HR memvalidasi.
   Company email **tidak wajib** bagi HR (wewenang IT, MOM #4).
4. **Master Company sebagai sumber tunggal**: dropdown posisi/branch/grade di ATS membaca
   `companyService` — jangan buat daftar statis baru.
5. **Status sinkron dua arah**: hire di HRIS (materialize sukses) → kandidat ATS `HIRED`; requisition
   `filled_count` bertambah; requisition `FULFILLED` saat penuh → job listing otomatis `CLOSED`.

## Cara kerja

- Satu titik sambung per commit; tulis tes service yang membuktikan alur ujung-ke-ujung di mode dummy
  (requisition approve → job → select → new joiner → materialize → directory).
- Sambungan lintas modul = **panggilan fungsi service** (pola repo), bukan HTTP, selama `MOCK = true`.
  Bentuk `api.*` mengikuti endpoint backend lokal (skill `hris-local-backend`).
- Ikuti `ponytail`: pakai fungsi yang sudah ada; bila perlu fungsi baru, letakkan di service pemilik data.
- Bila aturan bisnis bertentangan dengan dokumen kontrak, MOM 28 Okt + keputusan Theo menang — catat di
  `docs/CONTRACT-AUDIT.md`.

## Pertanyaan yang perlu ditanyakan ke Theo (jangan ditebak)

- Bypass sementara (MOM): selama ATS belum lengkap, apakah undangan email (ATS Bridge) tetap jalur utama?
- Siapa yang memilih kandidat bila requestor tidak punya akun HRIS?
- Approval requisition berjenjang (penggantian vs penambahan) — butuh halaman Approval Rules di Settings
  (Users & Access) lebih dulu?
