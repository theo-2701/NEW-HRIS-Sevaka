---
name: ponytail-review
description: Review diff yang KHUSUS mencari over-engineering — apa yang bisa dihapus, diganti bawaan JS/browser, atau diganti komponen rumah. Satu baris per temuan. Aktif saat pengguna menulis "ponytail-review", "review for over-engineering", "apa yang bisa dihapus", atau "is this over-engineered". Melengkapi review kebenaran, bukan menggantikannya.
---

# Ponytail Review

Review diff untuk kompleksitas yang tidak perlu. Hasil terbaik sebuah diff adalah menjadi lebih pendek.
Diadaptasi dari [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT, lihat
`.agents/skills/ponytail/LICENSE`).

## Format

`L<baris>: <tag> <apa>. <pengganti>.` — atau `<file>:L<baris>: ...` untuk diff banyak file.

Tag (tetap bahasa Inggris supaya mudah di-grep):

- `delete:` kode mati, fleksibilitas tak terpakai, fitur spekulatif. Pengganti: tidak ada.
- `stdlib:` buatan sendiri padahal bawaan JS/TS ada. Sebut fungsinya.
- `native:` kode/dependensi yang dikerjakan browser/CSS — atau komponen rumah di `src/components`
  yang sudah ada. Sebut fiturnya.
- `yagni:` abstraksi berimplementasi tunggal, config yang tak pernah diisi, lapisan dengan satu pemanggil.
- `shrink:` logika sama, baris lebih sedikit. Tunjukkan bentuk pendeknya.

## Contoh

- `ContohPage.tsx:L40-71: native: tabel + pager buatan sendiri. <DataTable> + <Pagination>.`
- `format.ts:L12-30: stdlib: formatter rupiah manual. Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).`
- `L18: yagni: useCallback untuk handler yang tidak diteruskan ke anak ter-memo. Hapus.`
- `L52-60: shrink: loop membangun map. Object.fromEntries(rows.map((r) => [r.id, r])).`

## Jangan ditandai

- Cabang `api` + mapper snake_case di samping blok `MOCK` (jalur integrasi backend).
- Gerbang peran, kode error, `Idempotency-Key`, dan validasi yang diwajibkan kontrak FSD/UIC.
- Satu file `*.test.ts` per modul — itu minimum, bukan bloat.
- Pola yang diwajibkan `docs/UI-STANDARDS.md` / `sevaka-rules.md`.

## Skor

Akhiri dengan `net: -<N> baris mungkin.` Tidak ada yang bisa dipotong: `Sudah ramping. Kirim.`

## Batas

Hanya over-engineering. Bug kebenaran, keamanan, dan performa di luar cakupan — arahkan ke review
biasa. Hanya mendaftar, tidak menerapkan perbaikan. `stop ponytail-review` / `normal mode` untuk kembali.
