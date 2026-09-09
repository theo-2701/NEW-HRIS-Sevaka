# HRIS Sevaka UI

Frontend project HRIS Sevaka, dibangun dengan:

* React 19
* TypeScript
* Vite
* Tailwind CSS v4
* ShadCN UI
* React Query
* Formik + Yup
* Zustand

Repo ini adalah hasil konversi prototype HTML/JS SEVAKA HRIS
(`HR Information System_v.27082026`) ke standar Sevaka UI. Prototype aslinya
tersimpan di `_prototype/` sebagai acuan konversi.

## Requirements

Gunakan Node.js versi:

```
22.17.0
```

Cek versi Node:

```
node -v
```

## Menjalankan Project

Install dependencies:

```
npm install
```

Run development:

```
npm run dev
```

Build production:

```
npm run build
```

Preview build:

```
npm run preview
```

## Linting

Menjalankan pengecekan code:

```
npm run lint
```

## Testing

```
npm run test
```

## Environment

Salin `.env.example` menjadi `.env`. Selama `VITE_API_BASE_URL` kosong, seluruh
service memakai data contoh (mode mock) sehingga aplikasi tetap bisa dijalankan
tanpa backend.

## ShadCN UI

Dokumentasi resmi: https://ui.shadcn.com/

Contoh menambahkan komponen:

```
npx shadcn@latest add tabs
```

Contoh lain:

```
npx shadcn@latest add dialog
npx shadcn@latest add button
```

Setelah menambahkan komponen ShadCN, sesuaikan token warna/spacing-nya dengan
SEVAKA HRIS Design System (Ocean `#0284C7` untuk aksi, radius 8px untuk
button/field, `shadow-inset-rim` pada secondary button). Token sudah tersedia
sebagai utility Tailwind — lihat `src/styles/index.css`.

## Struktur Arsitektur

Project menggunakan pendekatan:

* Feature-based architecture
* Modular UI components
* API service layer
* Form abstraction (Formik)

```
_design-system/        # design system resmi SEVAKA (acuan visual, read-only)
_prototype/            # prototype HTML/CSS/JS asli (acuan, read-only)
docs/                  # hand-off, inventaris halaman, standar UI, peta komponen
scripts/               # generator dokumen inventaris
src/
├─ app/                # router, provider, route guard
├─ components/         # komponen reusable lintas fitur
│  ├─ ui/              # komponen bawaan ShadCN (button.tsx, dialog.tsx, ...)
│  └─ form/            # abstraksi form Formik (TextField.tsx, ...)
├─ config/nav.ts       # peta navigasi + status konversi
├─ features/           # modul per domain (auth, dashboard, ...)
├─ layouts/            # AppLayout, AuthLayout
├─ lib/                # util & helper
├─ services/           # API client global
├─ store/              # Zustand store
├─ styles/             # token design system + tema Tailwind v4
└─ types/              # tipe global
```

## Catatan

* Gunakan lowercase untuk file component ui karena bawaan dari library ShadCN (`button.tsx`)
* Gunakan PascalCase untuk file di luar component UI (`TextField.tsx`)
* Gunakan lowercase untuk folder (`components/`, `features/`)
* Jalankan lint sebelum commit

```
npm run lint
```

## Agentic Development (AI Assistant)

Project ini dilengkapi panduan khusus untuk AI Coding Assistant.

### 1. Workflows (`.agents/workflows/`)

* `/feature` — membuat modul/fitur baru atau mengonversi layar prototype.
* `/fixing` — mendiagnosis dan memperbaiki bug.
* `/test` — pedoman pengujian (Vitest).

### 2. Rules (`.agents/rules/`)

File utama: `sevaka-rules.md`. Bersifat global dan otomatis dibaca AI; mention
(`@[sevaka-rules.md]`) hanya untuk mempertajam fokus.

### 3. Caveman Mode (`.agents/skills/caveman/`)

Mode komunikasi ringkas. Aktivasi: `caveman mode` · `use caveman` · `@[/caveman]`.
Level: `lite`, `full`, `ultra`. Matikan: `stop caveman`.

### 4. Scaffold Feature (`.agents/skills/scaffold-feature/`)

Aktivasi: `scaffold feature <nama-fitur>`. Membuat kerangka modul (types, validation,
service, hook, page) sesuai standar.

### Status konversi

Lihat `docs/HANDOFF.md` (ringkasan + cara melanjutkan),
`docs/PAGE-INVENTORY.md` (status per layar), dan `docs/MODULE-TRACKER.md`
(urutan batch pengerjaan).
