import { beforeEach, describe, expect, it } from 'vitest';
import { assetService, resetAssetMocks } from '@/features/assets/services/asset.service';
import { ASSET_VIEWERS } from '@/features/assets/mock-data';
import type { AssetActor, AssetDraft, DisposalDraft } from '@/features/assets/types';

const GA = ASSET_VIEWERS.find((row) => row.role === 'ROLE_GA_STAFF') as AssetActor;
const HR_MANAGER = ASSET_VIEWERS.find((row) => row.role === 'ROLE_HR_MANAGER') as AssetActor;

const OWNED: AssetDraft = {
  assetCode: 'AS-0100',
  assetName: 'Laptop Baru',
  serialNumber: 'SN-0100',
  assetCategoryId: 'cat-it',
  branchId: 'br-jkt',
  ownershipType: 'OWNED',
  photo1: 'doc-photo-baru',
  purchaseDate: '2026-09-01',
  purchasePrice: '15000000',
  purchaseInvoiceNumber: 'INV-2026-0087',
  leaseAmount: '',
  leaseStartDate: '',
  leaseEndDate: '',
  leaseContractNumber: '',
  vendorId: '',
};

const OUTSIDER: DisposalDraft = {
  assetStatus: 'SOLD',
  disposalNominal: '3000000',
  disposalFileAttached: true,
  photoAttached: true,
  isEmployee: false,
  employeeId: '',
  fullName: 'Andi Wijaya',
  idCardNumber: '3171021505900001',
  email: '',
  phone: '081234567890',
};

beforeEach(() => resetAssetMocks());

describe('Matriks peran §7.0', () => {
  it('HR Manager hanya lihat — semua tulis ditolak 403', async () => {
    await expect(assetService.register(HR_MANAGER, OWNED)).rejects.toThrow(/403/);
    await expect(assetService.saveCategory(HR_MANAGER, { name: 'Baru', maintenanceIntervalDays: '' })).rejects.toThrow(
      /403/,
    );
    await expect(assetService.dispose(HR_MANAGER, 'as-0002', OUTSIDER)).rejects.toThrow(/403/);
    expect(await assetService.assets()).not.toHaveLength(0);
  });
});

describe('Register — dua cabang ownership + blocker NOT_AVAILABLE (§7.3)', () => {
  it('aset lengkap lahir AVAILABLE', async () => {
    const row = await assetService.register(GA, OWNED);
    expect(row.lastAssetStatus).toBe('AVAILABLE');
  });

  it('serial number wajib (0.35)', async () => {
    await expect(assetService.register(GA, { ...OWNED, serialNumber: ' ' })).rejects.toThrow(/serial/);
  });

  it('foto kosong tetap tersimpan (201) tetapi NOT_AVAILABLE, lalu naik AVAILABLE setelah foto menyusul', async () => {
    const row = await assetService.register(GA, { ...OWNED, photo1: '' });
    expect(row.lastAssetStatus).toBe('NOT_AVAILABLE');
    const after = await assetService.uploadPhoto(GA, row.id);
    expect(after.lastAssetStatus).toBe('AVAILABLE');
  });

  it('blok pembelian tidak lengkap menolak 422 (Mandatory-by-Value OWNED)', async () => {
    await expect(assetService.register(GA, { ...OWNED, purchasePrice: '' })).rejects.toThrow(/422/);
  });

  it('LEASED wajib vendor dan tidak menerima berkas kontrak saat registrasi', async () => {
    const leased: AssetDraft = {
      ...OWNED,
      assetCode: 'AS-0101',
      ownershipType: 'LEASED',
      leaseAmount: '5000000',
      leaseStartDate: '2026-01-01',
      leaseEndDate: '2026-12-31',
      leaseContractNumber: 'SWA-9',
      vendorId: '',
    };
    await expect(assetService.register(GA, leased)).rejects.toThrow(/vendor/);
    const row = await assetService.register(GA, { ...leased, vendorId: 'vd-sumber' });
    expect(row.currentLeaseContractFile).toBeNull();
  });

  it('kode aset kembar ditolak 409', async () => {
    await expect(assetService.register(GA, { ...OWNED, assetCode: 'AS-0001' })).rejects.toThrow(/409/);
  });
});

describe('Lifecycle (§8.3)', () => {
  it('assign is_complete=false → INCOMPLETE (tetap dipegang, bukan NOT_AVAILABLE)', async () => {
    const row = await assetService.assign(GA, 'as-0002', { employeeId: 'emp-dimas', isComplete: false, note: '' });
    expect(row.lastAssetStatus).toBe('INCOMPLETE');
    expect(row.employeeInfo?.nama).toBe('Dimas Pratama');
  });

  it('aset terblokir tidak bisa diserahkan', async () => {
    await expect(
      assetService.assign(GA, 'as-0004', { employeeId: 'emp-dimas', isComplete: true, note: '' }),
    ).rejects.toThrow(/terblokir/);
  });

  it('return wajib lokasi; EMPLOYEE_NEGLIGENCE terminal dan melepas pemegang', async () => {
    const payload = { assetStatus: 'EMPLOYEE_NEGLIGENCE' as const, assetLocation: '', note: 'Rusak' };
    await expect(assetService.returnAsset(GA, 'as-0001', payload)).rejects.toThrow(/lokasi/);
    const row = await assetService.returnAsset(GA, 'as-0001', { ...payload, assetLocation: 'Gudang IT' });
    expect(row.lastAssetStatus).toBe('EMPLOYEE_NEGLIGENCE');
    expect(row.employeeId).toBeNull();
    const history = await assetService.history('as-0001');
    expect(history.handovers[0].assetLocation).toBe('Gudang IT');
  });

  it('transfer = SATU event antar-branch; pemegang dan riwayat serah-terima tidak berubah', async () => {
    const payload = {
      toBranchId: 'br-bdg',
      transferReason: 'Pindah proyek',
      transferDate: '2026-09-20',
      photoAttached: true,
    };
    await expect(assetService.transfer(GA, 'as-0001', { ...payload, toBranchId: 'br-jkt' })).rejects.toThrow(/sama/);
    await expect(assetService.transfer(GA, 'as-0001', { ...payload, photoAttached: false })).rejects.toThrow(/foto/);
    const before = await assetService.history('as-0001');
    const row = await assetService.transfer(GA, 'as-0001', payload);
    expect(row.branchId).toBe('br-bdg');
    expect(row.employeeId).toBe('emp-rudi');
    const after = await assetService.history('as-0001');
    expect(after.handovers).toHaveLength(before.handovers.length);
    expect(after.transfers).toHaveLength(1);
    expect(after.transfers[0].fromBranchId).toBe('br-jkt');
  });

  it('maintenance SCHEDULED menggeser jadwal berikutnya, UNSCHEDULED tidak', async () => {
    const scheduled = await assetService.maintain(GA, 'as-0002', {
      maintenanceType: 'SCHEDULED',
      maintenanceDate: '2026-09-01',
      cost: '',
      note: '',
    });
    expect(scheduled.nextMaintenanceDate).toBe('2027-02-28');
    const unscheduled = await assetService.maintain(GA, 'as-0002', {
      maintenanceType: 'UNSCHEDULED',
      maintenanceDate: '2026-09-15',
      cost: '',
      note: '',
    });
    expect(unscheduled.nextMaintenanceDate).toBe('2027-02-28');
  });

  it('aksi sewa ditolak untuk aset milik sendiri; aset sewaan wajib foto dan menulis log sewa', async () => {
    const payload = { vendorId: 'vd-sumber', leaseContractNumber: 'SWA-2027-001', photoAttached: true };
    await expect(assetService.lease(GA, 'as-0002', payload)).rejects.toThrow(/422/);
    await expect(assetService.lease(GA, 'as-0003', { ...payload, photoAttached: false })).rejects.toThrow(/foto/);
    const row = await assetService.lease(GA, 'as-0003', payload);
    expect(row.currentLeaseContractFile).not.toBeNull();
    expect((await assetService.history('as-0003')).leases).toHaveLength(1);
  });

  it('nilai residu menulis log residu', async () => {
    const row = await assetService.setResidual(GA, 'as-0002', '3500000');
    expect(row.currentResidualValue).toBe(3500000);
    expect((await assetService.history('as-0002')).residuals[0].residualValue).toBe(3500000);
  });
});

describe('Disposal (§9, UIC 0.25)', () => {
  it('hanya dari AVAILABLE; nominal, berkas, foto wajib; pihak luar wajib KTP 16 digit', async () => {
    await expect(assetService.dispose(GA, 'as-0001', OUTSIDER)).rejects.toThrow(/Tersedia/);
    await expect(assetService.dispose(GA, 'as-0002', { ...OUTSIDER, disposalNominal: '' })).rejects.toThrow(/nominal/);
    await expect(assetService.dispose(GA, 'as-0002', { ...OUTSIDER, disposalFileAttached: false })).rejects.toThrow(
      /berkas/,
    );
    await expect(assetService.dispose(GA, 'as-0002', { ...OUTSIDER, photoAttached: false })).rejects.toThrow(/foto/);
    await expect(assetService.dispose(GA, 'as-0002', { ...OUTSIDER, idCardNumber: '123' })).rejects.toThrow(/KTP/);
    const row = await assetService.dispose(GA, 'as-0002', OUTSIDER);
    expect(row.lastAssetStatus).toBe('SOLD');
  });

  it('GRANTED juga wajib nominal; AUCTION ditolak 422', async () => {
    await expect(
      assetService.dispose(GA, 'as-0002', { ...OUTSIDER, assetStatus: 'GRANTED', disposalNominal: '' }),
    ).rejects.toThrow(/nominal/);
    await expect(
      assetService.dispose(GA, 'as-0002', { ...OUTSIDER, assetStatus: 'AUCTION' as unknown as 'SOLD' }),
    ).rejects.toThrow(/422/);
    const row = await assetService.dispose(GA, 'as-0002', { ...OUTSIDER, assetStatus: 'GRANTED' });
    expect(row.lastAssetStatus).toBe('GRANTED');
  });
});
