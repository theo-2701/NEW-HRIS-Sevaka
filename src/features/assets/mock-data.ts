import type {
  Asset,
  AssetActor,
  AssetCategory,
  HandoverLog,
  MaintenanceLog,
  TransferLog,
} from '@/features/assets/types';

/**
 * Dataset contoh Assets. Branch, vendor, dan karyawan memakai id yang sama dengan fitur
 * `company` (`br-*`, `vd-*`, `emp-*`) supaya dropdown dan snapshot tersambung ke master datanya.
 */
const at = (date: string, time = '10:00') => `${date}T${time}:00+07:00`;

export const CATEGORY_SEED: AssetCategory[] = [
  { id: 'cat-it', name: 'IT Equipment', maintenanceIntervalDays: 180, createdAt: at('2026-01-05') },
  { id: 'cat-vehicle', name: 'Kendaraan', maintenanceIntervalDays: 90, createdAt: at('2026-01-05') },
  { id: 'cat-furniture', name: 'Furnitur', maintenanceIntervalDays: null, createdAt: at('2026-01-05') },
];

const base = {
  serialNumber: null,
  photo1Note: null,
  purchaseDate: null,
  purchasePrice: null,
  purchaseInvoiceNumber: null,
  purchaseInvoiceFile: null,
  leaseAmount: null,
  leaseStartDate: null,
  leaseEndDate: null,
  leaseContractNumber: null,
  vendorId: null,
  currentLeaseContractFile: null,
  currentHandoverStatus: 'NONE' as const,
  employeeId: null,
  employeeInfo: null,
  currentResidualValue: null,
  nextMaintenanceDate: null,
};

export const ASSET_SEED: Asset[] = [
  {
    ...base,
    id: 'as-0001',
    assetCode: 'AS-0001',
    assetName: 'Laptop ThinkPad T14',
    serialNumber: 'PF3XK21A',
    assetCategoryId: 'cat-it',
    branchId: 'br-jkt',
    ownershipType: 'OWNED',
    photo1: 'doc-photo-0001',
    purchaseDate: '2026-01-10',
    purchasePrice: 15000000,
    purchaseInvoiceNumber: 'INV-2026-0012',
    lastAssetStatus: 'ASSIGNED',
    currentHandoverStatus: 'GIVING',
    employeeId: 'emp-rudi',
    employeeInfo: { employeeId: 'emp-rudi', nama: 'Rudi Hartono', nik: 'PTDIKA-0001' },
    currentResidualValue: 12500000,
    nextMaintenanceDate: '2026-07-10',
    createdAt: at('2026-01-10'),
  },
  {
    ...base,
    id: 'as-0002',
    assetCode: 'AS-0002',
    assetName: 'Monitor Dell 27"',
    serialNumber: 'CN0DLL27A',
    assetCategoryId: 'cat-it',
    branchId: 'br-jkt',
    ownershipType: 'OWNED',
    photo1: 'doc-photo-0002',
    purchaseDate: '2026-02-01',
    purchasePrice: 4200000,
    purchaseInvoiceNumber: 'INV-2026-0031',
    lastAssetStatus: 'AVAILABLE',
    nextMaintenanceDate: '2026-08-01',
    createdAt: at('2026-02-01'),
  },
  {
    ...base,
    id: 'as-0003',
    assetCode: 'AS-0003',
    assetName: 'Toyota Avanza — B 1234 XYZ',
    serialNumber: 'MHKA1BA3JKK012345',
    assetCategoryId: 'cat-vehicle',
    branchId: 'br-bdg',
    ownershipType: 'LEASED',
    photo1: 'doc-photo-0003',
    leaseAmount: 6500000,
    leaseStartDate: '2026-01-01',
    leaseEndDate: '2026-12-31',
    leaseContractNumber: 'SWA-2026-004',
    vendorId: 'vd-sumber',
    lastAssetStatus: 'INCOMPLETE',
    currentHandoverStatus: 'GIVING',
    employeeId: 'emp-maya',
    employeeInfo: { employeeId: 'emp-maya', nama: 'Maya Anggraini', nik: 'PTDIKA-0002' },
    nextMaintenanceDate: '2026-10-01',
    createdAt: at('2026-01-02'),
  },
  {
    ...base,
    id: 'as-0004',
    assetCode: 'AS-0004',
    assetName: 'Kursi Ergonomis',
    serialNumber: 'KE-2209-01',
    assetCategoryId: 'cat-furniture',
    branchId: 'br-smg',
    ownershipType: 'OWNED',
    photo1: null,
    purchaseDate: '2026-09-01',
    purchasePrice: 2750000,
    purchaseInvoiceNumber: 'INV-2026-0140',
    lastAssetStatus: 'NOT_AVAILABLE',
    createdAt: at('2026-09-01'),
  },
  {
    ...base,
    id: 'as-0005',
    assetCode: 'AS-0005',
    assetName: 'Proyektor Epson',
    serialNumber: 'EPX7Y12345',
    assetCategoryId: 'cat-it',
    branchId: 'br-bdg',
    ownershipType: 'OWNED',
    photo1: 'doc-photo-0005',
    purchaseDate: '2025-06-15',
    purchasePrice: 8900000,
    purchaseInvoiceNumber: 'INV-2025-0210',
    lastAssetStatus: 'SOLD',
    currentResidualValue: 3000000,
    createdAt: at('2025-06-15'),
  },
];

export const HANDOVER_SEED: HandoverLog[] = [
  {
    id: 'ho-0001',
    assetId: 'as-0001',
    event: 'GIVING',
    employeeInfo: { employeeId: 'emp-rudi', nama: 'Rudi Hartono', nik: 'PTDIKA-0001' },
    isComplete: true,
    assetStatus: null,
    assetLocation: null,
    note: 'Laptop kerja lengkap dengan charger dan tas.',
    createdAt: at('2026-01-12'),
  },
  {
    id: 'ho-0002',
    assetId: 'as-0003',
    event: 'GIVING',
    employeeInfo: { employeeId: 'emp-maya', nama: 'Maya Anggraini', nik: 'PTDIKA-0002' },
    isComplete: false,
    assetStatus: null,
    assetLocation: null,
    note: 'STNK asli masih di kantor pusat.',
    createdAt: at('2026-01-05'),
  },
];

export const MAINTENANCE_SEED: MaintenanceLog[] = [
  {
    id: 'mt-0001',
    assetId: 'as-0003',
    maintenanceType: 'SCHEDULED',
    maintenanceDate: '2026-07-01',
    cost: 850000,
    note: 'Servis berkala 10.000 km.',
    createdAt: at('2026-07-01'),
  },
];

export const TRANSFER_SEED: TransferLog[] = [];

export const EMPLOYEE_OPTIONS = [
  { employeeId: 'emp-rudi', nama: 'Rudi Hartono', nik: 'PTDIKA-0001' },
  { employeeId: 'emp-maya', nama: 'Maya Anggraini', nik: 'PTDIKA-0002' },
  { employeeId: 'emp-hesti', nama: 'Hesti Wulandari', nik: 'PTDIKA-0003' },
  { employeeId: 'emp-dimas', nama: 'Dimas Pratama', nik: 'PTDIKA-0004' },
];

/** Identitas untuk mencoba matriks peran §7.0 — dua peran terakhir hanya lihat. */
export const ASSET_VIEWERS: AssetActor[] = [
  { employeeId: 'emp-hesti', label: 'Hesti Wulandari — Super Admin', role: 'ROLE_SUPER_ADMIN' },
  { employeeId: 'emp-dimas', label: 'Dimas Pratama — GA Staff', role: 'ROLE_GA_STAFF' },
  { employeeId: 'emp-rudi', label: 'Rudi Hartono — System Admin', role: 'ROLE_SYSTEM_ADMIN' },
  { employeeId: 'emp-maya', label: 'Maya Anggraini — HR Manager (lihat saja)', role: 'ROLE_HR_MANAGER' },
];
