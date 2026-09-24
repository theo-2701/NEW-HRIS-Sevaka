import { beforeEach, describe, expect, it } from 'vitest';
import { assetService, resetAssetMocks } from '@/features/assets/services/asset.service';
import type { AssetDraft, DisposalDraft } from '@/features/assets/types';

const OWNED: AssetDraft = {
  assetCode: 'AS-0100',
  assetName: 'Laptop Baru',
  serialNumber: '',
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
  disposalType: 'SOLD',
  disposalNominal: '3000000',
  isEmployee: false,
  employeeId: '',
  fullName: 'Andi Wijaya',
  idCardNumber: '3171021505900001',
  email: '',
  phone: '081234567890',
};

beforeEach(() => resetAssetMocks());

describe('Register — dua cabang ownership + blocker NOT_AVAILABLE (§7.3)', () => {
  it('aset lengkap lahir AVAILABLE', async () => {
    const row = await assetService.register(OWNED);
    expect(row.lastAssetStatus).toBe('AVAILABLE');
  });

  it('foto kosong tetap tersimpan (201) tetapi NOT_AVAILABLE, lalu naik AVAILABLE setelah foto menyusul', async () => {
    const row = await assetService.register({ ...OWNED, photo1: '' });
    expect(row.lastAssetStatus).toBe('NOT_AVAILABLE');
    const after = await assetService.uploadPhoto(row.id);
    expect(after.lastAssetStatus).toBe('AVAILABLE');
  });

  it('blok pembelian tidak lengkap menolak 422 (Mandatory-by-Value OWNED)', async () => {
    await expect(assetService.register({ ...OWNED, purchasePrice: '' })).rejects.toThrow(/422/);
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
    await expect(assetService.register(leased)).rejects.toThrow(/vendor/);
    const row = await assetService.register({ ...leased, vendorId: 'vd-sumber' });
    expect(row.currentLeaseContractFile).toBeNull();
  });

  it('kode aset kembar ditolak 409', async () => {
    await expect(assetService.register({ ...OWNED, assetCode: 'AS-0001' })).rejects.toThrow(/409/);
  });
});

describe('Lifecycle (§8.3)', () => {
  it('assign is_complete=false → INCOMPLETE (tetap dipegang, bukan NOT_AVAILABLE)', async () => {
    const row = await assetService.assign('as-0002', { employeeId: 'emp-dimas', isComplete: false, note: '' });
    expect(row.lastAssetStatus).toBe('INCOMPLETE');
    expect(row.employeeInfo?.nama).toBe('Dimas Pratama');
  });

  it('aset terblokir tidak bisa diserahkan', async () => {
    await expect(assetService.assign('as-0004', { employeeId: 'emp-dimas', isComplete: true, note: '' })).rejects.toThrow(
      /terblokir/,
    );
  });

  it('return EMPLOYEE_NEGLIGENCE menjadi terminal dan melepas pemegang', async () => {
    const row = await assetService.returnAsset('as-0001', { assetStatus: 'EMPLOYEE_NEGLIGENCE', note: 'Rusak' });
    expect(row.lastAssetStatus).toBe('EMPLOYEE_NEGLIGENCE');
    expect(row.employeeId).toBeNull();
  });

  it('transfer menulis DUA event serah-terima: RECEIVE lalu GIVING', async () => {
    await assetService.transfer('as-0001', { toBranchId: 'br-bdg', toEmployeeId: 'emp-hesti' });
    const history = await assetService.history('as-0001');
    const events = history.handovers.slice(0, 2).map((row) => row.event).sort();
    expect(events).toEqual(['GIVING', 'RECEIVE']);
    expect(history.transfers).toHaveLength(1);
  });

  it('maintenance SCHEDULED menggeser jadwal berikutnya, UNSCHEDULED tidak', async () => {
    const scheduled = await assetService.maintain('as-0002', {
      maintenanceType: 'SCHEDULED',
      maintenanceDate: '2026-09-01',
      cost: '',
      note: '',
    });
    expect(scheduled.nextMaintenanceDate).toBe('2027-02-28');
    const unscheduled = await assetService.maintain('as-0002', {
      maintenanceType: 'UNSCHEDULED',
      maintenanceDate: '2026-09-15',
      cost: '',
      note: '',
    });
    expect(unscheduled.nextMaintenanceDate).toBe('2027-02-28');
  });

  it('aksi sewa ditolak untuk aset milik sendiri', async () => {
    await expect(assetService.lease('as-0002', { vendorId: 'vd-sumber', leaseContractNumber: 'X' })).rejects.toThrow(/422/);
  });
});

describe('Disposal (§9)', () => {
  it('hanya dari AVAILABLE; SOLD wajib nominal; pihak luar wajib KTP 16 digit', async () => {
    await expect(assetService.dispose('as-0001', OUTSIDER)).rejects.toThrow(/Tersedia/);
    await expect(assetService.dispose('as-0002', { ...OUTSIDER, disposalNominal: '' })).rejects.toThrow(/nominal/);
    await expect(assetService.dispose('as-0002', { ...OUTSIDER, idCardNumber: '123' })).rejects.toThrow(/KTP/);
    const row = await assetService.dispose('as-0002', OUTSIDER);
    expect(row.lastAssetStatus).toBe('SOLD');
  });

  it('AUCTION bisa kembali AVAILABLE, sedangkan SOLD terminal', async () => {
    const auction = await assetService.dispose('as-0002', { ...OUTSIDER, disposalType: 'AUCTION' });
    expect(auction.lastAssetStatus).toBe('AUCTION');
    const back = await assetService.cancelAuction('as-0002');
    expect(back.lastAssetStatus).toBe('AVAILABLE');
  });
});
