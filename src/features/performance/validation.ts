import * as Yup from 'yup';

/** Bobot `numeric(6,2)` 0–9999.99 — dipakai Daftar Induk dan baris tambahan lembar. */
const weight = () =>
  Yup.number()
    .typeError('Bobot harus berupa angka.')
    .required('Bobot mentah wajib diisi.')
    .min(0, 'Bobot tidak boleh negatif.')
    .max(9999.99, 'Maksimal 9999.99.')
    .test('two-decimals', 'Maksimal dua angka desimal.', (value) => {
      if (value === undefined) return true;
      const cents = value * 100;
      return Math.abs(Math.round(cents) - cents) < 1e-6;
    });

const text = (label: string, max: number) =>
  Yup.string().trim().required(`${label} wajib diisi.`).max(max, `Maksimal ${max} karakter.`);

/** KPM-2/KPM-3 (FSD-001-PERFORMANCE §2.2–§2.3). Bobot tidak wajib berjumlah 100. */
export const kpiSchema = Yup.object({
  itemName: text('Nama item', 255),
  jobGradeId: Yup.string().required('Golongan jabatan wajib dipilih.'),
  targetType: Yup.string().required('Jenis target wajib dipilih.').oneOf(['NUMERIC', 'NARRATIVE']),
  rawWeight: weight(),
  isActive: Yup.boolean(),
});

// Menu 3 — Lembar Penilaian (FSD §3.1–§3.4)
export const selfAssessmentSchema = Yup.object({ content: text('Isian penilaian diri', 5000) });
export const objectionNoteSchema = Yup.object({ note: text('Catatan keberatan', 1000) });
export const valueSchema = Yup.object({ value: text('Nilai', 500) });

export const masterLineSchema = Yup.object({
  jobGradeId: Yup.string().required('Golongan jabatan wajib dipilih.'),
  masterItemId: Yup.string().required('Item daftar induk wajib dipilih.'),
  target: text('Target', 500),
});

export const additionalLineSchema = Yup.object({
  itemNameSnapshot: text('Nama item', 255),
  targetTypeSnapshot: Yup.string().required('Jenis target wajib dipilih.').oneOf(['NUMERIC', 'NARRATIVE']),
  rawWeight: weight(),
  target: text('Target', 500),
});

export const editLineSchema = (weightEditable: boolean) =>
  Yup.object({
    target: text('Target', 500),
    rawWeight: weightEditable ? weight() : Yup.mixed(),
  });
