---
name: SEVAKA HRIS — Frontend
description: Frontend engineering guide for the SEVAKA HRIS web app — stack, setup, architecture, and conventions. Use this when scaffolding features, adding components, or onboarding to the SEVAKA HRIS codebase.
---

# SEVAKA HRIS — Frontend

> **"Your Intelligent HR Companion."**
> Frontend untuk platform SEVAKA HRIS — Human Resource Information System yang mencakup seluruh siklus hidup karyawan: rekrutmen, onboarding, data personalia, absensi & cuti, payroll, dan performance.

Dokumen ini adalah panduan engineering untuk sisi **frontend**. Untuk aturan visual (warna, tipografi, spacing, komponen), ikuti **SEVAKA HRIS Design System** (`colors_and_type.css` + `README.md` design system).

---

## 1. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | **React 19** |
| Bahasa | **TypeScript** |
| Build tool | **Vite** |
| Styling | **Tailwind CSS v4** |
| UI components | **ShadCN UI** |
| Data fetching / cache | **React Query** (TanStack Query) |
| Forms & validation | **Formik + Yup** |
| State management | **Zustand** |

---

## 2. Requirements

Gunakan Node.js versi:

```
22.17.0
```

Cek versi Node:

```bash
node -v
```

> Disarankan menggunakan version manager (`nvm`, `fnm`, atau `volta`) agar versi Node konsisten antar developer. Contoh: `nvm use 22.17.0`.

---

## 3. Menjalankan Project

Install dependencies:

```bash
npm install
```

Run development:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

---

## 4. Linting

Menjalankan pengecekan code:

```bash
npm run lint
```

> **Jalankan lint sebelum commit.** Kode yang gagal lint tidak boleh masuk ke branch utama.

---

## 5. ShadCN UI

Dokumentasi resmi: <https://ui.shadcn.com/>

Menambahkan komponen:

```bash
npx shadcn@latest add tabs
```

Contoh lain:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add button
```

> Setelah menambahkan komponen ShadCN, sesuaikan token warna/spacing-nya dengan **SEVAKA HRIS Design System** (Ocean `#0284C7` untuk aksi, radius 8px untuk button/field, `shadow-inset-rim` pada secondary button, dst.). Jangan biarkan default ShadCN menimpa identitas visual SEVAKA.

---

## 6. Struktur Arsitektur

Project menggunakan pendekatan:

- **Feature-based architecture** — kode dikelompokkan per fitur/domain, bukan per tipe file.
- **Modular UI components** — komponen UI yang reusable dan terisolasi.
- **API service layer** — seluruh pemanggilan API dipusatkan di layer service.
- **Form abstraction (Formik)** — form dibungkus abstraksi di atas Formik agar konsisten.

### Contoh struktur folder

```
src/
├─ app/                  # entry, router, provider (React Query, Zustand)
├─ components/           # komponen UI reusable lintas fitur
│  ├─ ui/                # komponen bawaan ShadCN (button.tsx, dialog.tsx, ...)
│  └─ TextField.tsx      # komponen kustom (PascalCase)
├─ features/             # feature-based modules
│  ├─ payroll/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ services/       # API service layer fitur ini
│  │  └─ types.ts
│  ├─ attendance/
│  └─ employees/
├─ services/             # API client & service layer global
├─ store/                # Zustand stores
├─ hooks/                # shared hooks
├─ lib/                  # util, helpers, konfigurasi
└─ types/                # tipe global
```

---

## 7. Konvensi Penamaan

| Target | Konvensi | Contoh |
|---|---|---|
| File komponen UI (bawaan ShadCN) | **lowercase** | `button.tsx`, `dialog.tsx`, `tabs.tsx` |
| File di luar komponen UI | **PascalCase** | `TextField.tsx`, `EmployeeTable.tsx` |
| Folder | **lowercase** | `components/`, `features/`, `services/` |

> Komponen UI memakai lowercase karena itu bawaan dari library **ShadCN**. Komponen kustom di luar `components/ui/` memakai **PascalCase**.

---

## 8. Catatan & Aturan Tim

- Gunakan **lowercase** untuk file komponen UI bawaan ShadCN (`button.tsx`).
- Gunakan **PascalCase** untuk file di luar komponen UI (`TextField.tsx`).
- Gunakan **lowercase** untuk folder (`components/`, `features/`).
- **Jalankan lint sebelum commit:**

```bash
npm run lint
```

---

## 9. Selaras dengan Design System

Saat membangun UI, selalu rujuk **SEVAKA HRIS Design System**:

- **Warna** — Ocean `#0284C7` untuk CTA/aksi, Sky `#87CEEB` untuk aksen brand, Mist `#F3FAFD` untuk background app. Gunakan token (`--color-secondary-500`, dst.), jangan hardcode hex baru.
- **Tipografi** — Plus Jakarta Sans (heading), Inter (body/UI), Arial (wordmark saja).
- **Spacing** — 8-point grid (8 / 16 / 24 / 32 / 40 / 64).
- **Radius** — 8px (button/field/chip), 10px (card/dropdown), 999px (pill).
- **Elevation** — `shadow-inset-rim` pada input & secondary button; `shadow-press` untuk hover/active (soft-press, bukan flat darken).
- **Bahasa** — satu bahasa per layar; default **Bahasa Indonesia** untuk surface end-user, English untuk istilah HR. **Tanpa emoji.**

Map token Tailwind v4 ke variabel design system di `@theme` agar utility class (`bg-secondary-500`, `text-fg-1`, dll.) konsisten dengan `colors_and_type.css`.
