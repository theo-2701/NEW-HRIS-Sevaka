---
name: hris-local-backend
description: Membuat backend lokal sederhana (tanpa auth, tidak harus persis dokumen kontrak) agar alur HRIS Sevaka + ATS berjalan dengan data tersimpan, menggantikan mode dummy di memori secara bertahap. Aktif saat pengguna minta "buat backend", "local database", "BE sederhana", "data jangan hilang saat refresh", atau melanjutkan tugas nomor 4 dari handoff 3 Nov 2026.
---

# Backend lokal sederhana (tugas #4 handoff 3 Nov 2026)

## Tujuan & batas

- Supaya alur **ATS → Employee → Company** (skill `ats-hris-integration`) berjalan dengan data yang
  bertahan antar refresh dan bisa dipakai beberapa layar/tab.
- **Tanpa auth** (Theo: "auth tidak perlu"). Tidak harus persis TSD; cukup bentuk yang sudah dipakai
  cabang `api.*` di service FE.
- Paling sederhana yang jalan (`ponytail`): satu proses Node, satu file database, tanpa ORM.

## Fakta repo yang penting

- Node **22** (`node -v`). FE: Vite (`npm run dev`, port 5173), axios di `src/services/api.ts`
  (`baseURL = VITE_API_BASE_URL ?? '/api/v1'`, `tenantPath()` menambah `/{COMPANY_CODE}` kecuali `/auth/`
  dan `/notifications`, header `x-b3-traceid`, galat dibaca dari `{ message, error_code, trace_id, errors }`).
- Saklar mock: `src/services/mock.ts` → `export const MOCK = true` (satu saklar untuk semua). Interceptor
  menolak semua request saat `MOCK` true.
- Tiap service punya blok `if (MOCK) { … }` lalu cabang `api.*` — cabang itulah kontrak backend lokal.

## Desain yang disarankan

```
server/
  index.mjs        # node:http, router kecil (method + pola path), JSON in/out
  db.mjs           # node:sqlite (DatabaseSync) ATAU file JSON; satu tabel/koleksi per resource
  seed.mjs         # isi awal dari data mock FE yang sama (impor ulang dari src/features/*/mock-data.ts tidak bisa langsung — salin seperlunya)
  data/            # file database (masuk .gitignore)
```

- Pilih **`node:sqlite`** bila tersedia tanpa flag di versi Node yang dipakai; bila tidak, JSON file
  (`fs.readFileSync`/`writeFileSync`) sudah cukup untuk demo.
- Script `package.json`: `"server": "node server/index.mjs"`; Vite proxy di `vite.config.ts`:
  `server.proxy['/api'] = 'http://localhost:3001'`.
- Abaikan segmen tenant: router menerima `/api/v1/:company/...` dan `/api/v1/...`.
- Respons galat: `{ status, message, error_code }` + HTTP status yang sama dengan mock (422/409/404).

## Migrasi bertahap (jangan big-bang)

1. Ganti saklar global jadi per-modul tanpa mengubah semua service: mis. `MOCK` tetap, tambah
   `export const LIVE = new Set((import.meta.env.VITE_LIVE_MODULES ?? '').split(','))` dan di service yang
   sudah punya backend pakai `if (MOCK && !LIVE.has('new-joiner'))`. Interceptor hanya menolak bila
   request berasal dari modul yang masih mock — paling sederhana: interceptor berhenti menolak saat
   `VITE_LIVE_MODULES` terisi.
2. Urutan modul (mengikuti alur MOM): `company` (master) → `manpower` (requisition) → `recruitment`
   (job listing, kandidat) → `ats-bridge` + `new-joiner` → `employees` (directory) → `transitions`.
3. Lintas modul yang di FE masih panggilan fungsi (mis. materialize → `registerMaterializedEmployee`)
   pindahkan ke server: satu handler mengerjakan semua efek dalam satu transaksi.
4. Setiap modul yang dipindah: tes FE tetap jalan di mode mock (`vitest` tidak butuh server); tambah
   satu skrip smoke `server/smoke.mjs` yang memanggil alur ujung-ke-ujung via `fetch`.

## Selesai bila

- `npm run server` + `npm run dev` → alur requisition → job listing → kandidat terpilih → new joiner →
  materialize → karyawan muncul di Directory, dan data tetap ada setelah refresh/restart.
- README singkat di `server/README.md` (cara jalan, reset data, daftar endpoint).
- `npm run lint`, `npm run build`, `npx vitest run` tetap hijau.

## Jangan

- Jangan menambah auth/JWT, Docker, atau framework besar tanpa permintaan Theo.
- Jangan mengubah bentuk data FE demi backend — backend yang menyesuaikan cabang `api.*`.
- Jangan commit file database.
