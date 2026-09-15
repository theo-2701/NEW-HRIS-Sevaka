/**
 * Mode data dummy — **satu saklar** untuk seluruh aplikasi.
 *
 * Selama backend belum siap, setiap service membaca/menulis data dummy di memori
 * dan `api` (axios) menolak setiap panggilan sebelum request keluar, jadi tidak
 * ada satu pun HTTP call yang terkirim walau `VITE_API_BASE_URL` terisi.
 *
 * Saat backend siap: ubah ke `false`. Cabang `api.*` di tiap service sudah
 * mengikuti bentuk endpoint kontrak UIC.
 */
export const MOCK: boolean = true;
