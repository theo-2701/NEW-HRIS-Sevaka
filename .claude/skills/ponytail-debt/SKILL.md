---
name: ponytail-debt
description: Kumpulkan semua komentar `ponytail:` di kode menjadi buku utang, supaya jalan pintas yang sengaja ditunda tetap terlacak dan tidak membusuk jadi "nanti = tidak pernah". Aktif saat pengguna menulis "ponytail-debt", "ponytail debt", "jalan pintas apa yang ditunda", atau "daftar shortcut". Laporan sekali jalan, tidak mengubah apa pun.
---

# Ponytail Debt

Setiap jalan pintas ponytail ditandai komentar `ponytail: <batas>, <jalur naik>`. Skill ini
mengumpulkannya ke satu buku utang. Diadaptasi dari
[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT, lihat
`.agents/skills/ponytail/LICENSE`).

## Pindai

```bash
grep -rnE '(//|/\*|\{/\*) ?ponytail:' src scripts
```

Awalan komentar menyaring prosa yang sekadar menyebut konvensi ini (mis. dokumen skill).

## Output

Satu baris per penanda, dikelompokkan per file:

`<file>:<baris>, <apa yang disederhanakan>. batas: <batas>. naik: <pemicu untuk ditinjau ulang>.`

Ambil batas dan pemicu langsung dari komentarnya. Perlu pemilik per baris? Tambahkan
`git blame -L<baris>,<baris> <file>`.

Penanda tanpa jalur naik/pemicu diberi tag `tanpa-pemicu` — itulah yang diam-diam membusuk.

Akhiri dengan `<N> penanda, <M> tanpa pemicu.` Tidak ada: `Tidak ada utang ponytail. Buku bersih.`

## Batas

Membaca dan melapor saja. Untuk menyimpannya, minta dan skill menulis `docs/PONYTAIL-DEBT.md`.
Sekali jalan.
