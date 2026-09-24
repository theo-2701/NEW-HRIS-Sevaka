import { TERMINAL_STATUSES } from '@/features/assets/types';
import type { Asset, AssetRole, AssetStatus, ReturnStatus } from '@/features/assets/types';

/** Matriks peran §7.0 (FSD 0.34): HR_MANAGER dan DEPARTMENT_MANAGER hanya lihat. */
export const canWriteAssets = (role: AssetRole) =>
  role === 'ROLE_SUPER_ADMIN' || role === 'ROLE_SYSTEM_ADMIN' || role === 'ROLE_GA_STAFF';

/**
 * Blocker NOT_AVAILABLE (§7.3, `K2` `CMP-245`): branch, kategori, **atau foto** kosong. Aset
 * tetap tersimpan (201), tetapi tidak masuk pool assign sampai ketiganya terisi.
 */
export function blockerReasons(asset: Pick<Asset, 'branchId' | 'assetCategoryId' | 'photo1'>): string[] {
  const reasons: string[] = [];
  if (!asset.branchId) reasons.push('Branch belum diisi');
  if (!asset.assetCategoryId) reasons.push('Kategori belum diisi');
  if (!asset.photo1) reasons.push('Foto belum diunggah');
  return reasons;
}

export const isTerminal = (status: AssetStatus) => TERMINAL_STATUSES.includes(status);

/** Hanya aset AVAILABLE yang masuk pool assign — INCOMPLETE/ASSIGNED sudah dipegang orang. */
export const canAssign = (asset: Asset) => asset.lastAssetStatus === 'AVAILABLE';

/** Return hanya dari aset yang sedang dipegang — ASSIGNED maupun INCOMPLETE. */
export const canReturn = (asset: Asset) =>
  asset.lastAssetStatus === 'ASSIGNED' || asset.lastAssetStatus === 'INCOMPLETE';

/** Disposal hanya dari AVAILABLE (UIC 0.24 §3.3). */
export const canDispose = (asset: Asset) => asset.lastAssetStatus === 'AVAILABLE';

/**
 * Transfer = SATU event antar-branch (FSD/UIC 0.35/0.25) — tidak menyentuh pemegang, jadi sah
 * untuk aset mana pun yang belum terminal, dipegang maupun tidak.
 */
export const canTransfer = (asset: Asset) => !isTerminal(asset.lastAssetStatus);

/** Aksi Sewa hanya untuk aset LEASED — OWNED tidak punya kontrak sewa. */
export const canLease = (asset: Asset) => asset.ownershipType === 'LEASED' && !isTerminal(asset.lastAssetStatus);

/** Status master hasil Return — tiga cabang berbeda, bukan satu layar seragam (§8.3). */
export const statusAfterReturn = (status: ReturnStatus): AssetStatus => status;

/** SCHEDULED menggeser `next_maintenance_date` sejauh interval kategori; UNSCHEDULED tidak. */
export function nextMaintenanceDate(fromDate: string, intervalDays: number | null): string | null {
  if (!intervalDays) return null;
  // Hitung di UTC: tanggal lokal (mis. WIB +7) yang diubah ke ISO akan mundur sehari.
  const date = new Date(`${fromDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + intervalDays);
  return date.toISOString().slice(0, 10);
}

export function parseAmount(value: string): number | null {
  const clean = value.trim().replace(/[.\s]/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Number(clean);
}
