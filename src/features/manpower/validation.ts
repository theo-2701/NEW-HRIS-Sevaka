import * as Yup from 'yup';

/** Skema REQ-CREATE (FSD §3.2 · UIC §3.2). */
export const requisitionSchema = Yup.object({
  planId: Yup.string(),
  positionMode: Yup.string().oneOf(['NEW', 'EXISTING']).required(),
  positionId: Yup.string().when('positionMode', {
    is: 'EXISTING',
    then: (schema) => schema.required('Select the existing position.'),
  }),
  unitId: Yup.string().required('Select a unit.'),
  parentPositionId: Yup.string().required('Select who this position reports to.'),
  title: Yup.string().trim().required('Position title is required.').max(150, 'Maximum 150 characters.'),
  headcount: Yup.number()
    .typeError('Headcount must be a number.')
    .required('Headcount is required.')
    .integer('Headcount must be a whole number.')
    .min(1, 'Headcount must be at least 1.'),
  reason: Yup.string().trim().required('Justification is required.').max(150, 'Maximum 150 characters.'),
  activeFrom: Yup.string().required('Start date is required.'),
  // Notulen 12 Okt 2026 #2: mulai 12 Okt, selesai 11 Okt harus ditolak.
  activeUntil: Yup.string()
    .required('End date is required.')
    .test('after-from', 'End date cannot be earlier than the start date.', function (value) {
      const { activeFrom } = this.parent as { activeFrom?: string };
      return !value || !activeFrom || value >= activeFrom;
    }),
});

/** Skema MP-CREATE — rencana headcount per unit (FSD §3.1). */
export const planSchema = Yup.object({
  title: Yup.string().trim().required('Judul rencana wajib diisi.').max(150, 'Maksimal 150 karakter.'),
  periodStart: Yup.string().required('Awal periode wajib diisi.'),
  periodEnd: Yup.string()
    .required('Akhir periode wajib diisi.')
    .test('after-start', 'Akhir periode harus sama atau setelah awal periode.', function (value) {
      const { periodStart } = this.parent as { periodStart?: string };
      return !value || !periodStart || value >= periodStart;
    }),
  lines: Yup.array()
    .of(
      Yup.object({
        unitId: Yup.string().required('Unit wajib dipilih.'),
        target: Yup.number()
          .typeError('Target harus berupa angka.')
          .required('Target wajib diisi.')
          .integer('Target harus bilangan bulat.')
          .min(0, 'Target tidak boleh negatif.'),
      }),
    )
    .min(1, 'Tambahkan minimal satu baris target.'),
});
