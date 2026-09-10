# Sevaka UI — Rules

Aturan arsitektur dan standar kode yang **HARUS** diikuti di repo ini. Bersifat
global: berlaku tanpa perlu di-mention. Mention (`@[sevaka-rules.md]`) hanya untuk
mempertajam fokus.

---

## 1. Stack (tidak boleh diganti tanpa keputusan tim)

React 19 · TypeScript · Vite · Tailwind CSS v4 · ShadCN UI · React Query ·
Formik + Yup · Zustand. Node **22.17.0**.

Dilarang menambahkan: library form lain (react-hook-form), library state lain
(Redux/Jotai), UI kit lain (MUI/AntD), atau CSS-in-JS. Untuk kebutuhan tabel/tanggal
yang belum ada, tanyakan dulu sebelum menambah dependency.

## 2. Arsitektur

- **Feature-based**: kode dikelompokkan per domain di `src/features/<modul>/`,
  bukan per tipe file.
- **Modular UI**: komponen yang dipakai ≥ 2 fitur naik ke `src/components/`.
- **API service layer**: komponen TIDAK memanggil `axios` langsung. Semua lewat
  `features/<modul>/services/*.service.ts` yang memakai `api` dari
  `src/services/api.ts`.
- **Form abstraction**: semua input lewat `src/components/form/*` (Formik).
  Dilarang `<input>` telanjang di halaman fitur.
- **Server state = React Query. Client/UI state = Zustand.** Jangan menyimpan hasil
  API di Zustand.

Anatomi fitur:

```
features/<modul>/
├─ components/   ├─ hooks/   ├─ pages/
├─ services/     ├─ store/ (opsional)
├─ types.ts      └─ validation.ts
```

## 3. Penamaan

| Target | Konvensi | Contoh |
|---|---|---|
| Komponen UI bawaan ShadCN | **lowercase** | `button.tsx`, `dialog.tsx` |
| File di luar komponen UI | **PascalCase** | `TextField.tsx`, `EmployeeTable.tsx` |
| Folder | **lowercase** | `components/`, `features/` |
| Hook | `use…` camelCase | `useEmployeeList.ts` |
| Service | `<domain>.service.ts` | `payroll.service.ts` |
| Store | `<domain>.store.ts` | `auth.store.ts` |

Import memakai alias `@/` (bukan `../../..`).

## 4. Styling

- **Hanya utility Tailwind bertoken.** Dilarang hex baru, dilarang `style={{}}` untuk
  warna/spacing (kecuali nilai dinamis seperti lebar bar chart atau warna perusahaan).
- Token ada di `src/styles/index.css` (`@theme`). Kalau butuh token baru, tambahkan
  di situ — jangan hardcode di komponen.
- Detail aturan visual: `docs/UI-STANDARDS.md` (WAJIB dibaca sebelum membuat layar).
- Sumber kebenaran visual tertinggi: **`_design-system/`** (design system resmi
  SEVAKA HRIS). Field 36 px + border Silver, label 16/700, isi 12/500, ikon
  Lucide stroke 1.75, hover/press = soft-press, gradien hanya tiga yang sah.
  Kalau design system dan prototype berbeda soal visual, design system menang.

## 5. Aturan produk yang sering dilanggar

1. **Tombol tanpa ikon**, kecuali pembuka dropdown (caret) dan "Add …" dalam form (+).
2. **Footer modal 2 tombol = rata kanan berdampingan**, bukan space-between.
3. **Freeze kolom tabel hanya kalau ada kolom Action**; header kolom Action kosong.
4. **1 aksi baris = tombol inline; ≥ 2 aksi = dropdown "Action ▾".**
5. **Paginasi memakai `<Pagination>`** (`.ph-foot`), bukan pager buatan sendiri.
6. **Filter kiri, search kanan**; > 2 filter → modal filter + ringkasan filter aktif.
7. **Draft-first**: kalau kontrak menyebut DRAFT, "Save as draft" dan "Submit" adalah
   dua aksi berbeda.
8. **`[...]` di mockup = data dinamis**, bukan teks. Isi data contoh realistis.
9. **Satu bahasa per layar. Tanpa emoji.**

## 6. TypeScript

- `strict` menyala. Dilarang `any` (pakai `unknown` + penyempitan tipe).
- Tipe kontrak (respons API) ditulis di `features/<modul>/types.ts`, bukan inline.
- Import tipe memakai `import type { … }` (`verbatimModuleSyntax` aktif).

## 7. Sebelum commit

```bash
npm run lint     # wajib 0 error
npm run build    # wajib hijau
```

Jangan commit: `node_modules/`, `dist/`, `.env`, atau perubahan di `_prototype/`
(folder itu arsip acuan, read-only).

## 8. Saat mengonversi layar dari prototype

Ikuti `docs/HANDOFF.md` §4. Ringkas:
baca `_prototype/<file>.html` → cek `docs/COMPONENT-MAP.md` → patuhi
`docs/UI-STANDARDS.md` → buat modul → daftarkan di `src/app/routes.tsx`
(termasuk `IMPLEMENTED_PATHS`) → ubah `status` di `src/config/nav.ts` → regenerasi
`docs/PAGE-INVENTORY.md` → lint + build.

## 9. Batas keputusan

Kalau prototype dan kontrak (FSD/UIC atau `_prototype/*-GAP-NOTES.md`) bertabrakan:
**ikuti kontrak dan laporkan selisihnya**. Jangan diam-diam menambah atau menghapus
field.

## Sidebar terkunci

Pohon menu sidebar berasal dari kontrak dan sudah dibekukan di
`_prototype/js/shell.js` (`NAV`) — plus `recruitment-shell.js` dan
`performance-shell.js` untuk nav produk. `src/config/nav.ts` **hanya menyalin**
pohon itu dan menambahkan `path`, `source`, dan `status`.

Dilarang: menambah baris menu, mengganti nama label, memecah satu baris jadi
beberapa anak, atau membuat section baru. Layar yang tidak punya baris menu
(mis. `add-employee.html`, `transition-dashboard.html`) dibuka lewat tombol di
dalam halaman, dan otomatis tercatat di bagian "Belum masuk peta nav"
`docs/PAGE-INVENTORY.md` saat inventaris diregenerasi.
