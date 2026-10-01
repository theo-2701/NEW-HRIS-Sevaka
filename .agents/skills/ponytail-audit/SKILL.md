---
name: ponytail-audit
description: Audit over-engineering untuk seluruh repo (bukan satu diff) — daftar berperingkat apa yang bisa dihapus, disederhanakan, atau diganti bawaan JS/browser/komponen rumah. Aktif saat pengguna menulis "ponytail-audit", "audit over-engineering", "apa yang bisa dihapus dari repo ini", atau "cari bloat". Laporan sekali jalan, tidak menerapkan perbaikan.
---

# Ponytail Audit

`ponytail-review` untuk seluruh repo. Pindai pohon kode, urutkan temuan dari potongan terbesar.
Diadaptasi dari [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT, lihat
`.agents/skills/ponytail/LICENSE`).

## Cakupan

Pindai `src/` dan `scripts/`. Lewati `node_modules/`, `dist/`, `.git/`, `_prototype/` (arsip acuan),
`_design-system/` (sumber kebenaran visual), dan `docs/`.

## Tag

Sama dengan `ponytail-review`: `delete:` · `stdlib:` · `native:` · `yagni:` · `shrink:`.

## Buru

- Helper/komponen yang menduplikasi yang sudah ada di `src/components`, `src/components/form`, atau
  `src/lib` (cek `docs/COMPONENT-MAP.md`).
- Dependensi yang bisa diganti bawaan JS/browser.
- Interface berimplementasi tunggal, factory satu produk, wrapper yang hanya meneruskan, flag/config mati,
  `export` yang tak pernah diimpor.

## Jangan ditandai

Cabang `api` di samping blok `MOCK` (sampai Batch 10 integrasi backend), gerbang dan kode error yang
diwajibkan kontrak FSD/UIC, satu `*.test.ts` per modul, dan pola wajib `docs/UI-STANDARDS.md`.

## Output

Satu baris per temuan, berperingkat: `<tag> <apa yang dipotong>. <pengganti>. [path]`.
Akhiri dengan `net: -<N> baris, -<M> dependensi mungkin.` Tidak ada: `Sudah ramping. Kirim.`

## Batas

Hanya over-engineering dan kompleksitas; bug kebenaran, keamanan, dan performa di luar cakupan.
Mendaftar saja, tidak menerapkan apa pun. Sekali jalan.
