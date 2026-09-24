/**
 * Company Management › Assets — FSD-001-COMPANY-0.32 §7 (List/Category/Register), §8 (Detail &
 * Lifecycle), §9 (Disposal) · UIC-001-COMPANY-0.22 §3.2.
 *
 * `purchase_date` diperlakukan sebagai kolom asli: FSD 0.32 §7.2 masih memasang banner GAP,
 * tetapi UIC 0.20 mengembalikannya ke RESOLVED (`CMP-241` CLOSE, dipetakan dan teruji live) —
 * kontrak API menang atas prosa FSD yang tertinggal.
 */

/** 9 nilai `last_asset_status`. INCOMPLETE ≠ NOT_AVAILABLE ditegakkan eksplisit. */
export type AssetStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'INCOMPLETE'
  | 'NOT_AVAILABLE'
  | 'AUCTION'
  | 'SOLD'
  | 'ACCIDENTALLY_LOST'
  | 'GRANTED'
  | 'EMPLOYEE_NEGLIGENCE';

export const ASSET_STATUSES: AssetStatus[] = [
  'AVAILABLE',
  'ASSIGNED',
  'INCOMPLETE',
  'NOT_AVAILABLE',
  'AUCTION',
  'SOLD',
  'ACCIDENTALLY_LOST',
  'GRANTED',
  'EMPLOYEE_NEGLIGENCE',
];

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  AVAILABLE: 'Tersedia',
  ASSIGNED: 'Dipegang',
  INCOMPLETE: 'Dipegang — belum lengkap',
  NOT_AVAILABLE: 'Tidak tersedia',
  AUCTION: 'Dilelang',
  SOLD: 'Terjual',
  ACCIDENTALLY_LOST: 'Hilang (insiden)',
  GRANTED: 'Dihibahkan',
  EMPLOYEE_NEGLIGENCE: 'Rusak/hilang (kelalaian)',
};

/** Status terminal: aset keluar dari siklus, tidak bisa di-assign lagi. AUCTION bukan terminal. */
export const TERMINAL_STATUSES: AssetStatus[] = ['SOLD', 'ACCIDENTALLY_LOST', 'GRANTED', 'EMPLOYEE_NEGLIGENCE'];

export type OwnershipType = 'OWNED' | 'LEASED';
export type HandoverStatus = 'NONE' | 'GIVING' | 'RECEIVE';

export interface PersonSnapshot {
  employeeId: string;
  nama: string;
  nik: string;
}

/** `cnf_asset_category` — soft-delete, nama unik antar baris aktif. */
export interface AssetCategory {
  id: string;
  name: string;
  maintenanceIntervalDays: number | null;
  createdAt: string;
}

/** `mst_asset`. Dua bentuk registrasi menurut `ownershipType` — tidak diratakan. */
export interface Asset {
  id: string;
  assetCode: string;
  assetName: string;
  serialNumber: string | null;
  assetCategoryId: string | null;
  branchId: string | null;
  ownershipType: OwnershipType;
  /** Diisi saat registrasi atau menyusul lewat pintu relay `POST /assets/{id}/files`. */
  photo1: string | null;
  photo1Note: string | null;
  // OWNED — Mandatory-by-Value
  purchaseDate: string | null;
  purchasePrice: number | null;
  purchaseInvoiceNumber: string | null;
  purchaseInvoiceFile: string | null;
  // LEASED — Mandatory-by-Value; berkas kontrak TIDAK diisi saat registrasi (asimetri §7.3)
  leaseAmount: number | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  leaseContractNumber: string | null;
  vendorId: string | null;
  currentLeaseContractFile: string | null;
  lastAssetStatus: AssetStatus;
  currentHandoverStatus: HandoverStatus;
  employeeId: string | null;
  employeeInfo: PersonSnapshot | null;
  currentResidualValue: number | null;
  nextMaintenanceDate: string | null;
  createdAt: string;
}

export interface AssetDraft {
  assetCode: string;
  assetName: string;
  serialNumber: string;
  assetCategoryId: string;
  branchId: string;
  ownershipType: OwnershipType;
  photo1: string;
  purchaseDate: string;
  purchasePrice: string;
  purchaseInvoiceNumber: string;
  leaseAmount: string;
  leaseStartDate: string;
  leaseEndDate: string;
  leaseContractNumber: string;
  vendorId: string;
}

export type HandoverEvent = 'GIVING' | 'RECEIVE';
export type ReturnStatus = 'AVAILABLE' | 'ACCIDENTALLY_LOST' | 'EMPLOYEE_NEGLIGENCE';

/** `log_asset_handover` — append-only. */
export interface HandoverLog {
  id: string;
  assetId: string;
  event: HandoverEvent;
  employeeInfo: PersonSnapshot | null;
  isComplete: boolean | null;
  assetStatus: ReturnStatus | null;
  note: string | null;
  createdAt: string;
}

export type MaintenanceType = 'SCHEDULED' | 'UNSCHEDULED';

export interface MaintenanceLog {
  id: string;
  assetId: string;
  maintenanceType: MaintenanceType;
  maintenanceDate: string;
  cost: number | null;
  note: string | null;
  createdAt: string;
}

export interface TransferLog {
  id: string;
  assetId: string;
  fromBranchId: string | null;
  toBranchId: string;
  fromEmployeeInfo: PersonSnapshot | null;
  toEmployeeInfo: PersonSnapshot | null;
  createdAt: string;
}

export type DisposalType = 'SOLD' | 'AUCTION' | 'GRANTED';

export const DISPOSAL_TYPE_LABEL: Record<DisposalType, string> = {
  SOLD: 'Dijual',
  AUCTION: 'Dilelang',
  GRANTED: 'Dihibahkan',
};

/** `log_asset_disposal` — penerima employee vs pihak luar (Mandatory-by-Value `is_employee`). */
export interface DisposalLog {
  id: string;
  assetId: string;
  disposalType: DisposalType;
  disposalNominal: number | null;
  isEmployee: boolean;
  employeeInfo: PersonSnapshot | null;
  fullName: string | null;
  idCardNumber: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface DisposalDraft {
  disposalType: DisposalType;
  disposalNominal: string;
  isEmployee: boolean;
  employeeId: string;
  fullName: string;
  idCardNumber: string;
  email: string;
  phone: string;
}
