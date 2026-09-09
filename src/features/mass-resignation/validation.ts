import * as Yup from 'yup';

/**
 * Skema MR-CREATE (FSD §7.1 · UIC §6.1). Draft-first: batch selalu disimpan
 * sebagai DRAFT dulu, dan dry-run wajib dijalankan sebelum bisa disimpan
 * supaya blast-radius selalu terlihat lebih dulu.
 */
export const batchSchema = Yup.object({
  reason: Yup.string().required('Alasan wajib dipilih.'),
  leaveDate: Yup.string().required('Tanggal efektif keluar wajib diisi.'),
  employeeIds: Yup.array(Yup.string()).min(1, 'Pilih minimal satu karyawan.'),
  notes: Yup.string().max(150, 'Maksimal 150 karakter.'),
});

/** Catatan checker wajib — masuk audit bersama keputusannya (UIC §6.2). */
export const approverNoteSchema = Yup.object({
  note: Yup.string().trim().required('Catatan approver wajib diisi.').max(150, 'Maksimal 150 karakter.'),
});

/** Alasan halt wajib — circuit-breaker tercatat di audit log (UIC §6.4). */
export const haltSchema = Yup.object({
  reason: Yup.string().trim().required('Alasan halt wajib diisi.').max(150, 'Maksimal 150 karakter.'),
});

/** Keputusan pada batch yang di-halt: lanjutkan atau sudahi sebagian. */
export const resumeSchema = Yup.object({
  action: Yup.string().oneOf(['RESUME', 'CANCEL']).required(),
  note: Yup.string().trim().required('Catatan approver wajib diisi.').max(150, 'Maksimal 150 karakter.'),
});
