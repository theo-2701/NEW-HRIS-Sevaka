import { beforeEach, describe, expect, it } from 'vitest';
import { mastersService, resetMasterMocks } from '@/features/employee-masters/services/masters.service';
import { WORK_STATUSES } from '@/features/employee-masters/mock-data';

beforeEach(() => resetMasterMocks());

describe('Email Domain (§7.19)', () => {
  it('disimpan huruf kecil dan selalu aktif saat tambah', async () => {
    const row = await mastersService.saveEmailDomain('HR_MANAGER', { domainName: ' Sevaka.CO.ID ', isActive: false });
    expect(row).toMatchObject({ domainName: 'sevaka.co.id', isActive: true });
  });

  it('menolak format tak sah, nama kembar, dan HR Staff', async () => {
    await expect(mastersService.saveEmailDomain('HR_MANAGER', { domainName: 'ptdika', isActive: true })).rejects.toThrow(/422/);
    await expect(mastersService.saveEmailDomain('HR_MANAGER', { domainName: 'PTDIKA.com', isActive: true })).rejects.toThrow(/409/);
    await expect(mastersService.saveEmailDomain('HR_STAFF', { domainName: 'baru.id', isActive: true })).rejects.toThrow(/403/);
  });

  it('filter aktif memisahkan baris nonaktif', async () => {
    expect((await mastersService.emailDomains({ active: 'INACTIVE' })).map((row) => row.domainName)).toEqual(['juaracoding.co.id']);
  });
});

describe('Work Status (§7.13.3)', () => {
  const draftOf = (id: string) => {
    const { id: _id, activeEmployeeCount: _count, ...draft } = WORK_STATUSES.find((row) => row.id === id)!;
    return draft;
  };

  it('nama kembar tanpa beda huruf ditolak 409', async () => {
    await expect(
      mastersService.saveWorkStatus('HR_MANAGER', { ...draftOf('ws-3'), workStatusName: 'contract' }),
    ).rejects.toThrow(/EMP-CNF-574/);
  });

  it('menonaktifkan baris yang masih dipegang pegawai ditolak 409; yang kosong boleh', async () => {
    await expect(mastersService.saveWorkStatus('HR_MANAGER', { ...draftOf('ws-1'), isActive: false }, 'ws-1')).rejects.toThrow(
      /EMP-CNF-575/,
    );
    const row = await mastersService.saveWorkStatus('HR_MANAGER', { ...draftOf('ws-3'), isActive: false }, 'ws-3');
    expect(row.isActive).toBe(false);
  });
});
