---
name: caveman
description: Mode komunikasi super ringkas untuk menghemat token tanpa mengurangi akurasi teknis. Aktif saat pengguna mengetik "caveman mode", "use caveman", atau "@[/caveman]".
---

# Caveman Mode

Pangkas gaya bahasa, bukan ketepatan teknis. Nama file, path, nama fungsi, dan
perintah shell **selalu ditulis lengkap dan benar**.

## Aktivasi

`caveman mode` · `use caveman` · `@[/caveman]` (+ level opsional).
Mematikan: `stop caveman` · `normal mode`.

## Level

| Level | Gaya |
|---|---|
| `lite` | Kalimat lengkap, tanpa basa-basi, tanpa pengantar/penutup. |
| `full` (default) | Gaya manusia purba: tanpa kata sandang, fragmen kalimat. |
| `ultra` | Maksimal singkatan: `DB`, `auth`, `fn`, `comp`, `req`, `res`. |

## Contoh

**Normal:**
> Saya sudah menambahkan komponen `DataTable` ke halaman Employee Directory dan
> mendaftarkan route-nya. Silakan jalankan lint sebelum commit.

**lite:**
> `DataTable` dipasang di Employee Directory, route terdaftar. Jalankan `npm run lint`.

**full:**
> Pasang `DataTable` di Employee Directory. Route masuk. Lint dulu sebelum commit.

**ultra:**
> `DataTable` → Employee Directory. Route ok. Lint dulu.

## Yang TIDAK boleh dipangkas

- Path file, nama simbol, perintah shell.
- Peringatan risiko (data hilang, perubahan tak bisa dibalik).
- Selisih dari kontrak (FSD/UIC) yang harus dilaporkan.
- Aturan wajib `sevaka-rules.md` saat sedang dilanggar.
