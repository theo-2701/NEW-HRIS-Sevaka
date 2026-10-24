import * as Yup from 'yup';
import { GRADE_REQUIRED_SUBTYPES } from '@/features/transitions/types';

/**
 * Skema TR-CREATE (FSD 0.83 §5.1 · §19.2). Field bercabang mengikuti tipe:
 *  • TRANSFER  → sub-tipe + posisi tujuan; target job grade hanya untuk
 *    Promotion/Demotion (posisi tujuan itu struktural, grade terpisah).
 *  • OFFBOARDING → alasan keluar (`reason_category`).
 *  • ONBOARDING → cukup karyawan + tanggal efektif.
 */
export const transitionSchema = Yup.object({
  type: Yup.string().oneOf(['ONBOARDING', 'TRANSFER', 'OFFBOARDING']).required(),
  employeeId: Yup.string().required('Choose the employee.'),
  subtype: Yup.string().when('type', {
    is: 'TRANSFER',
    then: (schema) => schema.required('Choose the sub-type.'),
    otherwise: (schema) => schema,
  }),
  // Kondisional, bukan wajib mutlak (FSD 0.24 §5.1): promosi/demosi boleh tanpa pindah jabatan.
  destinationPositionId: Yup.string(),
  targetJobGradeId: Yup.string().when('subtype', {
    is: (value: string) => GRADE_REQUIRED_SUBTYPES.includes(value),
    then: (schema) => schema.required('Choose the target grade for a promotion or demotion.'),
    otherwise: (schema) => schema,
  }),
  reason: Yup.string().when('type', {
    is: 'OFFBOARDING',
    then: (schema) => schema.required('Choose the reason.'),
    otherwise: (schema) => schema,
  }),
  effectiveDate: Yup.string().required('Choose the effective date.'),
  facilityProvided: Yup.string().max(500, 'At most 500 characters.'),
  facilityWithdrawn: Yup.string().max(500, 'At most 500 characters.'),
});

/** MTT-REJECT — alasan wajib (EMP-VAL-717). */
export const rejectSchema = Yup.object({
  reason: Yup.string().trim().required('Enter the reason.').max(500, 'At most 500 characters.'),
});

/** Skema waive task (kontrol D3) — alasan wajib karena masuk audit log. */
export const waiveSchema = Yup.object({
  control: Yup.string().oneOf(['STANDARD', 'ELEVATED']).required(),
  reason: Yup.string().trim().required('Enter the reason.').max(150, 'At most 150 characters.'),
});
