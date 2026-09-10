# HRIS Sevaka UI — instruksi untuk AI coding assistant

Repo ini adalah konversi prototype HTML/JS SEVAKA HRIS ke standar **Sevaka UI**
(React 19 · TypeScript · Vite · Tailwind v4 · ShadCN · React Query · Formik + Yup ·
Zustand).

## Baca ini dulu

| Kebutuhan | File |
|---|---|
| Design system resmi (sumber kebenaran visual) | `_design-system/README.md` |
| Aturan arsitektur & kode (WAJIB, global) | `.agents/rules/sevaka-rules.md` |
| Aturan visual & interaksi (WAJIB sebelum membuat layar) | `docs/UI-STANDARDS.md` |
| Status konversi & cara melanjutkan | `docs/HANDOFF.md` |
| Layar mana → route mana → prototype mana | `docs/PAGE-INVENTORY.md` |
| Kelas prototype → komponen React | `docs/COMPONENT-MAP.md` |
| Urutan pengerjaan modul | `docs/MODULE-TRACKER.md` |

Workflow: `@[/feature]` (modul baru), `@[/fixing]` (bug), `@[/test]` (pengujian).
Skill: `scaffold feature <nama>`, `caveman mode`.

## Konteks singkat

- `_prototype/` = arsip prototype asli (HTML/CSS/JS + catatan gap per modul).
  **Acuan, jangan diedit.**
- `src/config/nav.ts` = single source of truth navigasi + status konversi. Router
  otomatis memasang `PlaceholderPage` untuk leaf yang belum dikonversi, jadi menu
  tidak pernah mati.
- Sudah dikonversi: **Auth** (10 layar), **Dashboard**, dan seluruh **Batch 1 —
  Employee Management** (Directory, Profile ESS, New Joiner + Add Employee,
  Employee Transfer, Mass Resignation, PTKP Adjustment, Manpower & Requisition,
  Reprimand + Type Setting). Auth dan Dashboard tetap jadi pola acuan struktur;
  modul Batch 1 adalah contoh terbaru untuk pola tabel, modal, dan maker→checker.
- Backend belum ada: setiap service punya blok `MOCK` yang aktif selama
  `VITE_API_BASE_URL` kosong.

## Aturan yang paling sering dilanggar

1. Tombol **tanpa ikon**, kecuali pembuka dropdown (caret) dan "Add …" dalam form (+).
2. Footer modal 2 tombol = **rata kanan berdampingan**.
3. Freeze kolom tabel **hanya** kalau ada kolom Action; header kolom Action kosong.
4. 1 aksi baris = tombol inline; ≥ 2 aksi = dropdown "Action ▾".
5. Paginasi memakai `<Pagination>`, filter kiri / search kanan.
6. Draft-first: "Save as draft" dan "Submit" adalah dua aksi berbeda.
7. Tanpa hex hardcode — semua warna lewat token Tailwind. Field 36 px + border
   Silver (bukan inset-rim), label 16/700, isi 12/500, ikon stroke 1.75.
8. `[...]` di mockup adalah data dinamis, bukan teks literal.
9. Satu bahasa per layar, tanpa emoji.

## Sebelum commit

```bash
npm run lint
npm run build
```
