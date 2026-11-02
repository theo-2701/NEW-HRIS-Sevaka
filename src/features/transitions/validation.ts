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
  employeeId: Yup.string().required('Employee is required.'),
  subtype: Yup.string().when('type', {
    is: 'TRANSFER',
    then: (schema) => schema.required('Transfer subtype is required.'),
    otherwise: (schema) => schema,
  }),
  destinationPositionId: Yup.string().when('type', {
    is: 'TRANSFER',
    then: (schema) => schema.required('Destination seat is required.'),
    otherwise: (schema) => schema,
  }),
  targetJobGradeId: Yup.string().when('subtype', {
    is: (value: string) => GRADE_REQUIRED_SUBTYPES.includes(value),
    then: (schema) => schema.required('Target grade is required for promotion and demotion.'),
    otherwise: (schema) => schema,
  }),
  reason: Yup.string().when('type', {
    is: 'OFFBOARDING',
    then: (schema) => schema.required('Reason is required.'),
    otherwise: (schema) => schema,
  }),
  effectiveDate: Yup.string().required('Effective date is required.'),
  facilityProvidedNote: Yup.string().max(500, 'At most 500 characters.'),
  facilityWithdrawnNote: Yup.string().max(500, 'At most 500 characters.'),
});

/** Skema waive task (kontrol D3) — alasan wajib karena masuk audit log. */
export const waiveSchema = Yup.object({
  control: Yup.string().oneOf(['STANDARD', 'ELEVATED']).required(),
  reason: Yup.string().trim().required('Alasan waive wajib diisi.').max(150, 'Maksimal 150 karakter.'),
});
