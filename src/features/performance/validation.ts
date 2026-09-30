import * as Yup from 'yup';

/** KPM-2/KPM-3 (FSD-001-PERFORMANCE §2.2–§2.3). Bobot `numeric(6,2)`, tidak wajib berjumlah 100. */
export const kpiSchema = Yup.object({
  itemName: Yup.string().trim().required('Nama item wajib diisi.').max(255, 'Maksimal 255 karakter.'),
  jobGradeId: Yup.string().required('Golongan jabatan wajib dipilih.'),
  targetType: Yup.string().required('Jenis target wajib dipilih.').oneOf(['NUMERIC', 'NARRATIVE']),
  rawWeight: Yup.number()
    .typeError('Bobot harus berupa angka.')
    .required('Bobot mentah wajib diisi.')
    .min(0, 'Bobot tidak boleh negatif.')
    .max(9999.99, 'Maksimal 9999.99.')
    .test('two-decimals', 'Maksimal dua angka desimal.', (value) => {
      if (value === undefined) return true;
      const cents = value * 100;
      return Math.abs(Math.round(cents) - cents) < 1e-6;
    }),
  isActive: Yup.boolean(),
});
