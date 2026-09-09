# /fixing — mendiagnosis & memperbaiki bug

Gunakan saat ada perilaku salah, error runtime, atau tampilan menyimpang dari
prototype. Jangan pakai untuk menambah fitur (pakai `/feature`).

## Langkah

### 1. Reproduksi
Catat: route, aksi, hasil yang diharapkan vs yang terjadi. Jalankan `npm run dev`
dan buka route-nya. Cek console browser dan Network.

### 2. Persempit lapisan
Tentukan bug ada di lapisan mana sebelum mengubah kode:

| Gejala | Lapisan | Tempat memeriksa |
|---|---|---|
| Data salah/kosong | service / React Query | `features/*/services`, query key di `hooks/` |
| Form tidak submit / error tidak muncul | Formik + Yup | `validation.ts`, `components/form/*` |
| Nilai tidak tersimpan antar layar | Zustand | `src/store/*`, `features/*/store/*` |
| Route tidak ketemu / placeholder muncul padahal sudah dibuat | router | `IMPLEMENTED_PATHS` di `src/app/routes.tsx` |
| Menu tidak menyala / breadcrumb salah | peta nav | `src/config/nav.ts` |
| Warna/spacing meleset | token | `src/styles/index.css`, bandingkan ke `_prototype/css/*` |
| Kolom tabel tidak beku / header "Action" muncul | komponen tabel | `src/components/DataTable.tsx` + prop `actions` |

### 3. Bandingkan dengan prototype
Kalau bug-nya visual/perilaku UI, buka file prototype terkait. Prototype adalah
acuan; nilai px, urutan kolom, dan label diambil dari sana.

### 4. Perbaiki di akarnya
- Perbaiki di lapisan yang benar, bukan menambal di komponen halaman.
- Kalau bug muncul karena aturan rumah dilanggar (mis. pager buatan sendiri),
  ganti ke komponen rumah, jangan menambal pager-nya.
- Jangan mematikan lint rule untuk melewati error.

### 5. Cegah kambuh
Tambahkan test kalau logikanya bisa diuji (lihat `/test`). Minimal: satu kasus yang
gagal sebelum perbaikan dan lulus sesudahnya.

### 6. Verifikasi
```bash
npm run lint
npm run build
npm run test
```

## Jebakan yang sudah diketahui

- **Formik `setTouched` memvalidasi dari snapshot lama** → pesan error sempat muncul
  kembali. Pakai `setTouched(true, false)` sebelum `setValue` (lihat `TurnstileField`).
- **Placeholder menang atas halaman baru** kalau path lupa dimasukkan ke
  `IMPLEMENTED_PATHS`.
- **Utility Tailwind tidak muncul** kalau nama kelas dirangkai dinamis
  (`` `bg-${x}-500` ``). Tulis kelas lengkap, atau pakai peta objek.
- **Ikon Lucide tidak muncul** kalau namanya belum terdaftar di
  `src/components/NavIcon.tsx` (fallback: lingkaran).
