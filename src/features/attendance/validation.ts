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
