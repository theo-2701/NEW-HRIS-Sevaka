# Hand-off: prototype HTML/JS → HRIS Sevaka UI (React + TypeScript)

Dokumen ini menjelaskan **apa yang sudah jadi**, **apa yang belum**, dan **cara
melanjutkan** konversi per modul. Baca ini lebih dulu sebelum menyentuh kode.

---

## 1. Ringkas

| | |
|---|---|
| Sumber | `HR Information System_v.27082026` (prototype HTML/CSS/JS) — disalin apa adanya ke `_prototype/` |
| Target | Standar **Sevaka UI**: React 19 · TypeScript · Vite · Tailwind v4 · ShadCN · React Query · Formik + Yup · Zustand |
| Node | 22.17.0 (`.nvmrc`) |
| Sudah dikonversi | **Auth** (10 layar), **Dashboard**, **Employee Directory**, **Employee Profile** (7 seksi), **New Joiner** (list + Add Employee), **Employee Transfer** (list + dashboard), **Mass Resignation**, **PTKP Adjustment**, **Manpower & Requisition**, **Reprimand** (+ Type Setting) — Batch 1 selesai, plus **Time Off** lengkap — Request, Balance, Settings — dan **Attendance** (+ Settings) (Batch 2 berjalan) |
| Belum | Sisa layar — semua sudah punya route + `PlaceholderPage`, tinggal diisi |

Status per layar: `docs/PAGE-INVENTORY.md`. Urutan pengerjaan: `docs/MODULE-TRACKER.md`.

## 2. Menjalankan

```bash
npm install
npm run dev        # http://localhost:5173
npm run lint       # wajib bersih sebelum commit
npm run build
npm run test
```

Login: backend belum ada, jadi service memakai jalur **mock** selama
`VITE_API_BASE_URL` kosong (lihat `.env.example`). Di layar masuk, isi email +
password apa saja, centang Turnstile, lalu tekan "Simulasikan klik tautan" pada
layar berikutnya untuk masuk ke dashboard.

## 3. Struktur

```
_design-system/        # design system resmi SEVAKA (token, README, ICONOGRAPHY) — ACUAN
_prototype/            # prototype HTML/CSS/JS asli — ACUAN, jangan diedit
docs/                  # hand-off, inventaris halaman, standar UI, peta komponen
scripts/               # generator docs/PAGE-INVENTORY.md dari src/config/nav.ts
src/
├─ app/                # router, providers, route guard
├─ components/         # komponen lintas fitur (PascalCase)
│  ├─ ui/              # komponen ShadCN (lowercase: button.tsx, dialog.tsx, …)
│  └─ form/            # abstraksi form Formik (TextField, PasswordField, …)
├─ config/nav.ts       # PETA NAVIGASI — single source of truth route + status
├─ features/           # modul per domain
│  ├─ auth/            # ← pola acuan #1 (form, service, store, alur multi-layar)
│  └─ dashboard/       # ← pola acuan #2 (kartu, chart, tabel, modal)
├─ layouts/            # AppLayout (topnav+sidebar), AuthLayout
├─ lib/                # utils, format (rupiah/tanggal Indonesia)
├─ services/api.ts     # satu instance axios + interceptor
├─ store/              # Zustand global (auth, ui/toast)
├─ styles/             # tokens.css + index.css (@theme Tailwind v4)
└─ types/
```

Anatomi satu fitur (ikuti persis):

```
features/<modul>/
├─ components/         # komponen khusus modul
├─ hooks/              # React Query (useX, useCreateX, …)
├─ pages/              # komponen halaman yang dipasang di router
├─ services/           # pemanggilan API modul ini
├─ store/              # (opsional) Zustand khusus modul
├─ types.ts            # interface & tipe kontrak
└─ validation.ts       # skema Yup
```

## 4. Cara mengonversi satu layar

1. **Baca prototype-nya.** Nama filenya ada di `docs/PAGE-INVENTORY.md` dan di
   layar placeholder-nya. Buka `_prototype/<file>.html` + `_prototype/js/<file>.js`.
2. **Cek padanan komponen** di `docs/COMPONENT-MAP.md`. Hampir semua pola sudah ada
   (tabel, modal, paginasi, toolbar, badge, form). Jangan bikin komponen baru kalau
   sudah ada padanannya.
3. **Patuhi `docs/UI-STANDARDS.md`.** Aturan ikon tombol, pembekuan kolom, footer
   modal, dan draft-first bukan preferensi — itu kontrak.
4. **Scaffold modulnya**: `types.ts` → `validation.ts` → `services/` → `hooks/` →
   `components/` → `pages/`. Data contoh masuk ke blok `MOCK` di service, mengikuti
   pola `features/dashboard/services/dashboard.service.ts`.
5. **Daftarkan route** di `src/app/routes.tsx`:
   - impor halamannya,
   - tambahkan ke array `IMPLEMENTED`,
   - tambahkan path-nya ke `IMPLEMENTED_PATHS` (kalau tidak, placeholder tetap menang).
6. **Ubah `status` leaf** terkait di `src/config/nav.ts` jadi `'done'`.
7. **Regenerasi inventaris**:
   ```bash
   node scripts/gen-inventory.mjs . && node scripts/gen-page-inventory.mjs && rm docs/_inventory.json
   ```
8. `npm run lint` + `npm run build`, lalu commit.

## 5. Keputusan yang sudah diambil (jangan diulang debatnya)

- **Token design system → `@theme` Tailwind v4.** `colors_and_type.css` diport ke
  `src/styles/index.css`; nilai non-utility (gradien tombol, soft-press) ke
  `src/styles/tokens.css`. Nama utility sengaja sama dengan nama token
  (`bg-secondary-500`, `text-fg-1`, `shadow-inset-rim`).
- **CSS prototype tidak dibawa ke produksi.** 11.800 baris CSS diganti utility
  bertoken + komponen. File aslinya tetap ada di `_prototype/` sebagai acuan angka.
- **Font di-self-host** dari `public/fonts` (Inter + Plus Jakarta Sans variable),
  bukan CDN Google Fonts.
- **Ikon**: `lucide-react`. Nama ikon di `nav.ts` tetap gaya kebab seperti prototype
  dan dipetakan eksplisit di `src/components/NavIcon.tsx` supaya tetap ter-tree-shake.
- **Navigasi data-driven.** `src/config/nav.ts` menggantikan array `NAV` + map
  `ROUTES` di `js/shell.js`. Router membuat `PlaceholderPage` otomatis untuk setiap
  leaf ber-`path` yang belum dikonversi, sehingga menu tidak pernah mati.
- **Panel tweaks prototype tidak diport** (`tweaks-*.jsx`) — itu alat desain.
- **Logo** (diperbarui 9 Sep 2026): burung dummy dari tim desain di
  `public/brand/sevaka-mark.svg` — hasil trace `LOGO_NEWEST (1).svg` yang sudah
  dibersihkan (68 path noise dibuang, warna diseragamkan, viewBox dipotong pas
  artwork). Wordmark bukan gambar melainkan **teks `SEVΛKΛ`** (konstanta
  `LOGO_TEXT`). Tagline HRIS sementara tidak ditampilkan. Aset trace lama
  (wordmark + tagline) diarsipkan di `_design-system/assets/logo-dummy/`.

## 6. Yang perlu diperhatikan saat lanjut

- **Detail page belum berbentuk `:id`.** `company-asset-detail.html`,
  `recruitment-job-listing-detail.html`, `recruitment-import-log-detail.html`
  sementara didaftarkan sebagai path statis; `finance-loan-detail.html` belum
  masuk nav sama sekali. Ubah ke `:id` saat modulnya dikerjakan.
- **Ilustrasi hero dashboard disederhanakan** dari artwork SVG prototype. Kalau
  diminta persis, port ulang blok `.dash-hero__art` di `_prototype/index.html`.
- **Bundle 1 chunk (~700 kB).** Saat modul mulai banyak, ubah route jadi
  `React.lazy` + `Suspense` di `src/app/routes.tsx`.
- **Turnstile masih placeholder.** `TurnstileField` mensimulasikan verifikasi;
  ganti dengan script Cloudflare asli saat kunci tersedia.
- **Belum ada test.** Vitest + Testing Library sudah terpasang
  (`npm run test`), tinggal diisi mengikuti `.agents/workflows/test.md`.
- **Sumber kontrak (FSD/UIC) tidak ikut dalam paket ini.** Catatan gap per modul
  ada di `_prototype/*-GAP-NOTES.md` — baca yang relevan sebelum mengonversi modul
  tersebut.

## 7. Penyesuaian ke design system resmi

`_design-system/` berisi SEVAKA HRIS Design System (rekonstruksi dari Figma
`UI HRIS_V1.0`) — README, ICONOGRAPHY, token, `form-standard.css`,
`table-standard.css`, dan aset logo. **Screenshot dan folder preview sengaja
tidak disalin** ke repo.

Yang sudah diselaraskan ke dokumen itu:

| Hal | Sebelumnya | Sekarang |
|---|---|---|
| Kotak field | 42 px + `shadow-inset-rim` | **36 px + border 1 px Silver**, isi Cloud, radius 8 px |
| Label field | 14/500 | **16/700 Slate**, jarak ke kotak 4 px |
| Isi & placeholder field | 14/500 | **12/500**, placeholder selalu Silver |
| Tombol aksi tabel | 32 px / 12.5 px | **36 px / 13 px**, hover soft-press |
| Tombol "Add …" | belum ada | `<AddButton>` 40 px + circle-plus outline |
| Hapus baris | belum ada | `<RemoveRowButton>` 32 px ghost |
| Back-link `.crumb` | belum ada | `<BackLink>` uppercase 12/700 |
| Stroke ikon | 2 px (bawaan Lucide) | **1.75 px** global via `.lucide` |
| Lift modal | `shadow-overlay` | `--shadow-popup` |

Keputusan sadar yang **tidak** diikuti dari dokumen design system:

- **Latar auth** tetap `linear-gradient(140deg …)` seperti `_prototype/css/auth.css`
  (artefak lebih baru), bukan conic gradient yang disebut README design system.
- **Tinggi topnav 64 px** (nilai terkunci di design system), bukan 80 px seperti
  override di `_prototype/css/dashboard.css`.
- **Halaman yang scroll**, bukan kontainer — mengikuti keputusan eksplisit di
  `_prototype/css/app.css` yang menggantikan aturan lama "internal scroll".

## 8. Catatan gap yang ikut disalin

`_prototype/` memuat catatan analisis per modul yang dibuat saat prototype dibangun:

`ASSET-GAP-NOTES.md` · `COMPANY-GAP-NOTES.md` · `DOCUMENT-GAP-NOTES.md` ·
`EMPLOYEE-GAP-NOTES.md` · `FINANCE-GAP-NOTES.md` · `NOTIFICATION-GAP-NOTES.md` ·
`PAYROLL-GAP-NOTES.md` · `PAYROLL-AUTH-GAP-NOTES.md` ·
`PAYROLL-SETTINGS-GAP-NOTES.md` · `PRODUCTIVITY-GAP-NOTES.md` ·
`SETTINGS-GAP-NOTES.md` · `TIME-GAP-NOTES.md` · `DS-UPDATE-REQUEST.md`

Isinya: field yang belum ada endpoint-nya, nomor PROB-*, dan keputusan desain yang
menyimpang dari kontrak. **Baca sebelum mengonversi modul yang bersangkutan.**
