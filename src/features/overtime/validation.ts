import * as Yup from 'yup';

/**
 * Form pengajuan lembur (UIC §8.1.1). Alasan wajib hanya untuk pengajuan
 * susulan — dan apakah sebuah tanggal susulan atau bukan diputuskan server,
 * jadi kewajibannya ikut `submissionMode` hasil pratinjau, bukan ketikan user.
 */
export const overtimeSchema = (isRetroactive: boolean) =>
  Yup.object({
    overtimeDate: Yup.string().required('Overtime date is required.'),
    requestedHours: Yup.number()
      .typeError('Requested hours are required.')
      .positive('Requested hours must be greater than zero.')
      .required('Requested hours are required.'),
    requestReason: isRetroactive
      ? Yup.string().trim().required('A retroactive request needs a written reason.')
      : Yup.string(),
  });

/** Form keputusan Setuju — jam boleh dipangkas, tidak pernah dinaikkan. */
export const approveSchema = (requestedHours: number) =>
  Yup.object({
    approvedHours: Yup.number()
      .typeError('Approved hours are required.')
      .positive('Approved hours must be greater than zero.')
      .max(requestedHours, 'Approved hours can be trimmed, never raised above the request.')
      .required('Approved hours are required.'),
  });
