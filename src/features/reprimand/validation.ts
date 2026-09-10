import * as Yup from 'yup';

/**
 * Skema RP-CREATE (FSD §6.1 · UIC §7.1).
 *
 * Perhatikan yang **tidak** ada di sini: `point`, `validity`, `levelOrder`, dan
 * `terminal`. Semua itu dibekukan server dari konfigurasi saat penerbitan —
 * klien tidak boleh mengirimnya.
 */
export const reprimandSchema = Yup.object({
  employeeId: Yup.string().required('Karyawan wajib dipilih.'),
  categoryCode: Yup.string().required('Kategori SP wajib dipilih.'),
  issuedDate: Yup.string()
    .required('Tanggal terbit wajib diisi.')
    .test('not-future', 'Tanggal terbit tidak boleh di masa depan.', (value) => {
      if (!value) return true;
      const today = new Date();
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      return value <= iso;
    }),
  reason: Yup.string().trim().required('Alasan wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  documentName: Yup.string(),
});

/** Skema kategori SP (`cnf_reprimand_category`) — CRU, tanpa hard-delete. */
export const categorySchema = Yup.object({
  code: Yup.string()
    .trim()
    .required('Kode wajib diisi.')
    .max(16, 'Maksimal 16 karakter.')
    .matches(/^[A-Z0-9_]+$/, 'Hanya huruf kapital, angka, dan garis bawah.'),
  label: Yup.string().trim().required('Nama kategori wajib diisi.').max(60, 'Maksimal 60 karakter.'),
  point: Yup.number()
    .typeError('Poin harus berupa angka.')
    .required('Poin demerit wajib diisi.')
    .integer('Poin harus bilangan bulat.')
    .min(0, 'Poin tidak boleh negatif.')
    .max(99, 'Maksimal 99.'),
  validityMonths: Yup.number()
    .typeError('Masa berlaku harus berupa angka.')
    .required('Masa berlaku wajib diisi.')
    .integer('Masa berlaku harus bilangan bulat.')
    .min(0, 'Masa berlaku tidak boleh negatif.')
    .max(120, 'Maksimal 120 bulan.'),
  levelOrder: Yup.number()
    .typeError('Urutan level harus berupa angka.')
    .required('Urutan level wajib diisi.')
    .integer('Urutan level harus bilangan bulat.')
    .min(0, 'Urutan level tidak boleh negatif.')
    .max(99, 'Maksimal 99.'),
  terminal: Yup.boolean(),
});
