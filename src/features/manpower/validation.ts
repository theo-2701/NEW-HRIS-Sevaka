import * as Yup from 'yup';

/** Skema REQ-CREATE (FSD §3.2 · UIC §3.2). */
export const requisitionSchema = Yup.object({
  planId: Yup.string(),
  unitId: Yup.string().required('Organization unit is required.'),
  parentPositionId: Yup.string().required('Supervisor position is required.'),
  requestorId: Yup.string().required('Requestor is required.'),
  positionIds: Yup.array().of(Yup.string().required()).min(1, 'Tick at least one position to open.'),
  reason: Yup.string().trim().required('Justification is required.').max(150, 'At most 150 characters.'),
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
