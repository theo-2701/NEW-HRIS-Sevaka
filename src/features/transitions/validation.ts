import * as Yup from 'yup';
import { GRADE_REQUIRED_SUBTYPES } from '@/features/transitions/types';

/**
 * Skema TR-CREATE (FSD §5.1 · UIC §5.2). Field bercabang mengikuti tipe:
 *  • TRANSFER  → sub-tipe + posisi tujuan; target job grade hanya untuk
 *    Promotion/Demotion (posisi tujuan itu struktural, grade terpisah).
 *  • OFFBOARDING → alasan keluar (`reason_category`).
 *  • ONBOARDING → cukup karyawan + tanggal efektif.
 */
export const transitionSchema = Yup.object({
  type: Yup.string().oneOf(['ONBOARDING', 'TRANSFER', 'OFFBOARDING']).required(),
  employeeId: Yup.string().required('Karyawan wajib dipilih.'),
  subtype: Yup.string().when('type', {
    is: 'TRANSFER',
    then: (schema) => schema.required('Sub-tipe transfer wajib dipilih.'),
    otherwise: (schema) => schema,
  }),
  destinationPositionId: Yup.string().when('type', {
    is: 'TRANSFER',
    then: (schema) => schema.required('Posisi tujuan wajib dipilih.'),
    otherwise: (schema) => schema,
  }),
  targetJobGradeId: Yup.string().when('subtype', {
    is: (value: string) => GRADE_REQUIRED_SUBTYPES.includes(value),
    then: (schema) => schema.required('Target job grade wajib diisi untuk promosi dan demosi.'),
    otherwise: (schema) => schema,
  }),
  reason: Yup.string().when('type', {
    is: 'OFFBOARDING',
    then: (schema) => schema.required('Alasan keluar wajib dipilih.'),
    otherwise: (schema) => schema,
  }),
  effectiveDate: Yup.string().required('Tanggal efektif wajib diisi.'),
});

/** Skema waive task (kontrol D3) — alasan wajib karena masuk audit log. */
export const waiveSchema = Yup.object({
  control: Yup.string().oneOf(['STANDARD', 'ELEVATED']).required(),
  reason: Yup.string().trim().required('Alasan waive wajib diisi.').max(150, 'Maksimal 150 karakter.'),
});
