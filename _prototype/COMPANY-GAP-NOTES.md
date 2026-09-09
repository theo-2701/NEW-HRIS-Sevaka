# COMPANY — catatan gap & keputusan terbuka

## Integration Contact (usulan layar, BELUM ada di kontrak menu)

**Status: proposal, tidak dipasang di sidebar.**

- Sumber: `TSD-001-COMPANY-0.10` §6.12(a) + `ERD-001-COMPANY-0.5` (tabel `mst_company_integration_contact`).
- Kontrak yang ada: `GET`/`PUT /api/v1/company/integration-contact` — singleton per tenant, tanpa `{id}`, tanpa `POST`/`DELETE`. Body: `contact_name` (opsional), `contact_email` (opsional). GET saat kosong → `200` dengan nilai `null`, bukan `404`. Kosongkan data = `PUT` field kosong. Role baca **dan** tulis: `ROLE_SUPER_ADMIN` / `ROLE_SYSTEM_ADMIN`. Scope: `company-integration-contact:read` / `:write`.
- **Tidak ada dokumen yang menyatakan menu baru.** `FSD-001-COMPANY-0.1` (tidak naik versi) tetap mendefinisikan 9 menu Company: Branch, Group Structure, Grade & Class, Cost Center, SBU, Vendor, Assets, Asset Detail & Lifecycle, Disposal. TSD 0.10 hanya menulis endpoint ini "kemungkinan besar relevan buat layar admin FE **kalau ada** layar pengaturan kontak perusahaan" — kondisional, bukan instruksi menempatkan menu.
- Karena itu: layar `company-integration-contact.html` disimpan sebagai usulan (bisa dibuka langsung), **tanpa entri sidebar**, sampai FSD/UIC menetapkan penempatannya. Kandidat penempatan bila nanti diputuskan: (a) tab/section di layar Company Setup, (b) sub-menu di Settings → Company, (c) section di halaman Branch (kantor pusat).
- ⚠️ Service belum deploy — migrasi tabel maupun route belum live.

## my-position (tanpa dampak layar)

`UIC-001-COMPANY-0.2` §3A — `GET /{COMPANY_CODE}/company/my-position`, dipanggil paralel saat app load bersama dua alamat "data saya" lain, lalu digabung jadi satu objek. Bukan layar baru; hanya sumber data untuk header/profil. Belum ada route aktif di gateway.
