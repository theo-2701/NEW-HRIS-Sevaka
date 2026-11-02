import type { ContactVerification } from '@/features/contact-verification/types';

/** Karyawan hasil materialisasi yang kontaknya belum terbukti. */
export const CONTACT_VERIFICATIONS: ContactVerification[] = [
  { id: 'cv-1', employeeId: 'emp-andi', employeeName: 'Andi Saputra', companyEmail: 'andi.saputra@ptdika.co.id', phoneMasked: '+62 812-****-7890', emailStatus: 'LINK_SENT', phoneStatus: 'NOT_SENT', joinDate: '2026-11-09' },
  { id: 'cv-2', employeeId: 'emp-dewi', employeeName: 'Dewi Lestari', companyEmail: 'dewi.lestari@ptdika.co.id', phoneMasked: '+62 813-****-1122', emailStatus: 'NOT_SENT', phoneStatus: 'LINK_EXPIRED', joinDate: '2026-11-16' },
  { id: 'cv-3', employeeId: 'emp-fajar', employeeName: 'Fajar Nugroho', companyEmail: 'fajar.nugroho@ptdika.com', phoneMasked: '+62 857-****-4410', emailStatus: 'VERIFIED', phoneStatus: 'LINK_SENT', joinDate: '2026-11-02' },
  { id: 'cv-4', employeeId: 'emp-gita', employeeName: 'Gita Permata', companyEmail: 'gita.permata@ptdika.co.id', phoneMasked: null, emailStatus: 'NOT_SENT', phoneStatus: 'NOT_REQUIRED', joinDate: '2026-12-01' },
];
