import { useEffect, useMemo, useState } from 'react';

/**
 * Paginasi sisi klien untuk daftar yang sudah ada di memori.
 *
 * Dipakai grid yang datanya datang sekaligus (daftar keluarga, pelatihan,
 * riwayat kerja). Grid yang datanya dari endpoint berhalaman TIDAK memakai ini
 * — kirim `page`/`size` ke server, seperti Employee Directory.
 *
 * Halaman otomatis mundur bila baris berkurang (mis. setelah menghapus atau
 * setelah filter dipersempit) supaya tabel tidak pernah tampil kosong.
 */
export function usePagedRows<T>(rows: T[], initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize],
  );

  return {
    rows: paged,
    total: rows.length,
    page,
    pageSize,
    setPage,
    setPageSize: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
    /** Panggil saat filter/pencarian berubah supaya kembali ke halaman 1. */
    resetPage: () => setPage(1),
  };
}
