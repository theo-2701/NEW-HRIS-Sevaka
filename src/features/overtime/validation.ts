import * as Yup from 'yup';

/**
 * Form pengajuan lembur (UIC §8.1.1). Alasan wajib hanya untuk pengajuan
 * susulan — dan apakah sebuah tanggal susulan atau bukan diputuskan server,
 * jadi kewajibannya ikut `submissionMode` hasil pratinjau, bukan ketikan user.
 */
export const overtimeSchema = (isRetroactive: boolean) =>
  Yup.object({
    overtimeDate: Yup.string().required('Tanggal lembur wajib diisi.'),
    requestedHours: Yup.number()
      .typeError('Jam yang diminta wajib diisi.')
      .positive('Jam yang diminta harus lebih besar dari nol.')
      .required('Jam yang diminta wajib diisi.'),
    requestReason: isRetroactive
      ? Yup.string().trim().required('Pengajuan susulan butuh alasan tertulis.')
      : Yup.string(),
  });

/** Form keputusan Setuju — jam boleh dipangkas, tidak pernah dinaikkan. */
export const approveSchema = (requestedHours: number) =>
  Yup.object({
    approvedHours: Yup.number()
      .typeError('Jam yang disetujui wajib diisi.')
      .positive('Jam yang disetujui harus lebih besar dari nol.')
      .max(requestedHours, 'Jam yang disetujui boleh dipangkas, tidak pernah dinaikkan di atas permintaan.')
      .required('Jam yang disetujui wajib diisi.'),
  });
