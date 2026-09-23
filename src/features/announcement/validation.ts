import * as Yup from 'yup';
import { CATEGORY_OPTIONS } from '@/features/announcement/types';

/** Susun/Sunting rancangan (FSD-001-COMPANY §11.5). Peran penerima boleh kosong selama rancangan. */
export const announcementSchema = Yup.object({
  title: Yup.string()
    .trim()
    .required('Judul wajib diisi.')
    .max(200, 'Maksimal 200 karakter.')
    .matches(/^[^<>]*$/, 'Judul tidak boleh memuat karakter < atau >.'),
  category: Yup.string()
    .required('Kategori wajib dipilih.')
    .oneOf(CATEGORY_OPTIONS.map((option) => option.value), 'Kategori tidak dikenal.'),
  recipientRole: Yup.string(),
  content: Yup.string().trim().required('Isi pengumuman wajib diisi.').max(10_000, 'Maksimal 10.000 karakter.'),
});
