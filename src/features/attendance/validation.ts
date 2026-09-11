import * as Yup from 'yup';

/**
 * Form pengajuan koreksi (UIC §6.3.1).
 * Catatan alasan wajib **hanya** saat alasannya Other; koreksi tanpa satu pun
 * jam usulan tidak mengoreksi apa pun, jadi ditolak di sini juga.
 */
export const correctionSchema = Yup.object({
  attendanceDailyId: Yup.string().required('Pilih hari yang akan dikoreksi.'),
  correctionReasonType: Yup.string().required('Pilih alasan koreksi.'),
  reasonNote: Yup.string().when('correctionReasonType', {
    is: 'OTHER',
    then: (schema) => schema.trim().required('Catatan alasan wajib diisi bila alasannya Other.'),
    otherwise: (schema) => schema,
  }),
  requestedIn: Yup.string(),
  requestedOut: Yup.string().test(
    'at-least-one-time',
    'Usulkan minimal satu jam — koreksi tanpa keduanya tidak mengoreksi apa pun.',
    function (value) {
      const { requestedIn } = this.parent as { requestedIn?: string };
      return Boolean(value || requestedIn);
    },
  ),
});

/**
 * Form titik kerja (UIC §7.1/§7.3). Radius kecil bukan urusan schema —
 * itu peringatan yang datang dari server, bukan penolakan.
 */
export const geofenceSchema = Yup.object({
  geofenceName: Yup.string().trim().min(3, 'Nama titik minimal 3 karakter.').max(150, 'Nama titik maksimal 150 karakter.').required('Nama titik wajib diisi.'),
  scopeRef: Yup.string().required('Pilih cabang pemilik titik ini.'),
  centerLatitude: Yup.number()
    .typeError('Lintang wajib diisi.')
    .min(-90, 'Lintang harus di dalam ±90.')
    .max(90, 'Lintang harus di dalam ±90.')
    .required('Lintang wajib diisi.'),
  centerLongitude: Yup.number()
    .typeError('Bujur wajib diisi.')
    .min(-180, 'Bujur harus di dalam ±180.')
    .max(180, 'Bujur harus di dalam ±180.')
    .required('Bujur wajib diisi.'),
  radiusMeters: Yup.number()
    .typeError('Radius wajib diisi.')
    .integer('Radius harus bilangan bulat meter.')
    .positive('Radius harus lebih besar dari nol.')
    .required('Radius wajib diisi.'),
});
