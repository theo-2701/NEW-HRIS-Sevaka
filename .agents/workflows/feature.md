# /feature — membuat modul/fitur baru

Gunakan saat membuat modul baru atau mengonversi satu layar prototype menjadi
fitur React. Jangan pakai untuk perbaikan kecil (pakai `/fixing`).

## Langkah

### 1. Pahami sumbernya
- Cari layarnya di `docs/PAGE-INVENTORY.md` → catat file prototype-nya.
- Buka `_prototype/<file>.html` dan `_prototype/js/<file>.js`. Perhatikan:
  struktur panel, kolom tabel, aksi baris, modal, status, dan validasi.
- Buka catatan gap modul terkait (`_prototype/<MODUL>-GAP-NOTES.md`) — di situ ada
  field tanpa endpoint dan keputusan yang menyimpang dari kontrak.

### 2. Rencanakan kontrak data
Tulis `features/<modul>/types.ts` lebih dulu: entitas, enum status, payload
request/response. Nama field mengikuti kontrak backend, bukan tampilan.

### 3. Validasi
`features/<modul>/validation.ts` — skema Yup per form. Pesan error Bahasa Indonesia,
kalimat lengkap, diakhiri titik.

### 4. Service layer
`features/<modul>/services/<nama>.service.ts`:
- pakai `api` dari `@/services/api`;
- sediakan blok `MOCK` (aktif saat `VITE_API_BASE_URL` kosong) berisi data contoh
  realistis — nama Indonesia, ID `CP0xx`, tanggal `dd Mmm yyyy`, rupiah;
- tulis endpoint aslinya walau backend belum ada.

### 5. Hooks React Query
`features/<modul>/hooks/use<Modul>.ts`: query keys terpusat, `useQuery` untuk baca,
`useMutation` + `invalidateQueries` untuk tulis, `toast()` untuk umpan balik.

### 6. Komponen & halaman
- Susun halaman dari komponen rumah (`docs/COMPONENT-MAP.md`). **Cek dulu sebelum
  membuat komponen baru.**
- Halaman dibungkus `<PageShell>` dengan breadcrumb.
- Patuhi `docs/UI-STANDARDS.md` (ikon tombol, freeze kolom, footer modal, draft-first).

### 7. Daftarkan route
`src/app/routes.tsx`: impor halaman → tambahkan ke `IMPLEMENTED` → tambahkan
path-nya ke `IMPLEMENTED_PATHS`.

### 8. Perbarui peta & dokumen
- `src/config/nav.ts`: ubah `status` leaf jadi `'done'`.
- Regenerasi inventaris:
  ```bash
  node scripts/gen-inventory.mjs . && node scripts/gen-page-inventory.mjs && rm docs/_inventory.json
  ```
- Centang di `docs/MODULE-TRACKER.md`.

### 9. Verifikasi
```bash
npm run lint
npm run build
```
Jalankan `npm run dev`, buka route-nya, cek: tabel scroll horizontal dengan kolom
Action tetap terlihat, paginasi jalan, modal hanya body-nya yang scroll, form
menampilkan error validasi.

## Yang membuat review ditolak

- Komponen baru yang menduplikasi komponen rumah.
- Hex/warna hardcode.
- Tombol beri ikon di luar dua pengecualian.
- Tabel tanpa aksi tapi kolomnya dibekukan.
- `any`, `console.log` tertinggal, atau lint tidak bersih.
- Field ditambah/dihapus tanpa dasar kontrak.
