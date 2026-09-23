import type { EssActor } from '@/features/ess-time/types';

/**
 * Tiga identitas untuk mencoba layar ESS Time. Rina karyawan biasa (nol peran approver),
 * Budi manajer departemen yang juga karyawan (punya task approval untuk didelegasikan), dan
 * Sari rekan yang menerima titipan kewenangan pada dataset contoh.
 */
export const ESS_VIEWERS: EssActor[] = [
  { employeeId: 'emp-rina', label: 'Rina — Karyawan', isApprover: false },
  { employeeId: 'emp-budi', label: 'Budi — Dept Manager (juga karyawan)', isApprover: true },
  { employeeId: 'emp-sari', label: 'Sari — Penerima delegasi', isApprover: true },
];

export const essName = (id: string) =>
  ({
    'emp-rina': 'Rina',
    'emp-budi': 'Budi',
    'emp-sari': 'Sari',
    'emp-hendra': 'Hendra',
  })[id] ?? id;
