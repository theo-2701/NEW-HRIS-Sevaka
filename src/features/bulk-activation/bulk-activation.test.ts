import { beforeEach, describe, expect, it } from 'vitest';
import { bulkActivationService, resetBulkActivationMocks } from '@/features/bulk-activation/services/bulk-activation.service';

beforeEach(() => {
  resetBulkActivationMocks();
});

describe('Bulk Account Activation (FSD-001-EMPLOYEE §9)', () => {
  it('kirim massal hanya mengirimi yang belum pernah dikirimi; yang sudah keluar dilewati dengan alasan', async () => {
    const result = await bulkActivationService.send(['baa-01', 'baa-03']);
    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[0].reason).toMatch(/Resend/);
    const rows = await bulkActivationService.list({ status: 'SENDING' });
    expect(rows.map((row) => row.id)).toEqual(['baa-01']);
  });

  it('resend (force) mengirim ulang undangan yang kedaluwarsa', async () => {
    const result = await bulkActivationService.send(['baa-05'], true);
    expect(result.sent).toBe(1);
  });

  it('menolak lebih dari 500 akun per kirim', async () => {
    const ids = Array.from({ length: 501 }, (_, index) => `x-${index}`);
    await expect(bulkActivationService.send(ids)).rejects.toThrow(/500/);
  });

  it('edit menolak email/HP milik karyawan lain (409) dan format HP salah (422)', async () => {
    await expect(
      bulkActivationService.update('baa-01', { email: 'ayu.lestari@ptdika.co.id', phoneNumber: '+628131000099' }),
    ).rejects.toThrow(/409/);
    await expect(
      bulkActivationService.update('baa-01', { email: 'baru@ptdika.co.id', phoneNumber: '0812 345' }),
    ).rejects.toThrow(/422/);
  });

  it('edit menyimpan lalu otomatis mengirim ulang', async () => {
    const row = await bulkActivationService.update('baa-04', { email: 'citra.dewi@ptdika.co.id', phoneNumber: '+628131000005' });
    expect(row.invitationStatus).toBe('SENDING');
    expect(row.failureReason).toBeNull();
  });
});
