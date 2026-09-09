import * as Yup from 'yup';
import { LOCKED_TAX_YEAR_UNTIL } from '@/features/ptkp/types';

/**
 * Skema PTKP-ADJUST (FSD §2.2 · UIC §8.1).
 *
 *  • `attestation` harus `true` — server menolak 422 tanpa itu, jadi tombol
 *    simpan pun dikunci sampai dicentang.
 *  • Backdate melewati tahun pajak terkunci ditolak.
 */
export const ptkpAdjustmentSchema = Yup.object({
  code: Yup.string().required('Kode PTKP wajib dipilih.'),
  effectiveFrom: Yup.string()
    .required('Tanggal mulai berlaku wajib diisi.')
    .test(
      'not-locked',
      `Backdate melewati tahun pajak terkunci (sampai ${LOCKED_TAX_YEAR_UNTIL}) ditolak.`,
      (value) => !value || value > LOCKED_TAX_YEAR_UNTIL,
    ),
  eventDate: Yup.string(),
  remarks: Yup.string().max(300, 'Maksimal 300 karakter.'),
  documentName: Yup.string(),
  attestation: Yup.boolean().oneOf([true], 'Atestasi wajib dicentang sebelum menyimpan.'),
});
