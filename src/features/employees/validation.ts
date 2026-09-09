import * as Yup from 'yup';

/**
 * Validasi kriteria pencarian — UIC §1.3/§1.4/§9.
 * Setiap field menolak `<`, `>`, kutip, dan kata `script` sebelum dirangkai
 * menjadi query. Backend tetap memvalidasi ulang; ini lapis pertama.
 */
export const UNSAFE_INPUT = /[<>'"`;]|script/i;

export const employeeSearchSchema = Yup.object({
  keyword: Yup.string()
    .max(150, 'Kata kunci maksimal 150 karakter.')
    .test(
      'no-unsafe-chars',
      'Karakter < > dan kutip skrip tidak diperbolehkan.',
      (value) => !value || !UNSAFE_INPUT.test(value),
    ),
  branchId: Yup.string(),
  createdFrom: Yup.string(),
  createdTo: Yup.string().test(
    'range-order',
    'Tanggal akhir tidak boleh mendahului tanggal awal.',
    function (value) {
      const { createdFrom } = this.parent as { createdFrom?: string };
      if (!value || !createdFrom) return true;
      return value >= createdFrom;
    },
  ),
  employmentStatus: Yup.array().of(Yup.string()),
});
