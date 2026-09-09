import type { ActorScope } from '@/features/employees/types';

/**
 * Masking PII — UIC §1.8. Backend yang menegakkan; ini menyamakan tampilan
 * supaya layar tidak pernah memperlihatkan data yang tidak berhak dilihat.
 *
 * Aturan:
 *  • NIK  — utuh hanya untuk scope HR atau saat melihat data diri sendiri.
 *  • Nomor rekening — selalu hanya 4 digit terakhir pada data subjek lain.
 *  • Nama pemilik rekening — hanya nama depan pada data subjek lain.
 */

export function maskNik(nik: string, scope: ActorScope, isSelf: boolean): string {
  if (scope === 'HR' || isSelf) return nik;
  return nik.replace(/(.{4}).*(.{2})$/, (_, head: string, tail: string) => `${head}••••${tail}`);
}

export function maskAccountNumber(accountNumber: string, isSelf: boolean): string {
  if (isSelf) return accountNumber;
  return `•••• •••• ${accountNumber.slice(-4)}`;
}

export function maskAccountHolder(holder: string, isSelf: boolean): string {
  if (isSelf) return holder;
  return `${holder.split(' ')[0]} •••`;
}
