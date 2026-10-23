import * as Yup from 'yup';

/**
 * Form pengajuan koreksi (UIC §6.3.1).
 * Catatan alasan wajib **hanya** saat alasannya Other; koreksi tanpa satu pun
 * jam usulan tidak mengoreksi apa pun, jadi ditolak di sini juga.
 */
export const correctionSchema = Yup.object({
  attendanceDailyId: Yup.string().required('Choose the day to correct.'),
  correctionReasonType: Yup.string().required('Choose a correction reason.'),
  reasonNote: Yup.string().when('correctionReasonType', {
    is: 'OTHER',
    then: (schema) => schema.trim().required('A reason note is required when the reason is Other.'),
    otherwise: (schema) => schema,
  }),
  requestedIn: Yup.string(),
  requestedOut: Yup.string().test(
    'at-least-one-time',
    'Propose at least one time — a correction without either changes nothing.',
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
  geofenceName: Yup.string().trim().min(3, 'Point name must be at least 3 characters.').max(150, 'Point name can be at most 150 characters.').required('Point name is required.'),
  scopeRef: Yup.string().required('Choose the branch that owns this point.'),
  centerLatitude: Yup.number()
    .typeError('Latitude is required.')
    .min(-90, 'Lintang harus di dalam ±90.')
    .max(90, 'Lintang harus di dalam ±90.')
    .required('Latitude is required.'),
  centerLongitude: Yup.number()
    .typeError('Longitude is required.')
    .min(-180, 'Bujur harus di dalam ±180.')
    .max(180, 'Bujur harus di dalam ±180.')
    .required('Longitude is required.'),
  radiusMeters: Yup.number()
    .typeError('Radius is required.')
    .integer('Radius harus bilangan bulat meter.')
    .positive('Radius must be greater than zero.')
    .required('Radius is required.'),
});
