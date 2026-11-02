import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bulkActivationService as svc, resetBulkActivationMocks } from '@/features/bulk-activation/services/bulk-activation.service';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  resetBulkActivationMocks();
});
afterEach(() => vi.useRealTimers());

const run = async <T,>(promise: Promise<T>) => {
  await vi.runOnlyPendingTimersAsync();
  return promise;
};
const statusOf = async (id: string) => (await run(svc.list())).find((row) => row.employeeId === id)?.invitationStatus;

describe('Bulk Account Activation (TSD-AUTH §14.2.1)', () => {
  it('Send melewati undangan yang masih berlaku; Resend menerbitkan ulang', async () => {
    const result = await run(svc.send(['emp-b1', 'emp-b5'], false));
    expect(result).toMatchObject({ sent: 1, skipped: 1 });
    expect(result.results[1].reason).toMatch(/use Resend/);
    expect((await run(svc.send(['emp-b5'], true))).sent).toBe(1);
  });

  it('undangan berpindah Sending lalu Sent/Failed menurut kabar kirim', async () => {
    await run(svc.send(['emp-b1', 'emp-b3'], true));
    await vi.advanceTimersByTimeAsync(3000);
    expect(await statusOf('emp-b1')).toBe('SENT');
    expect(await statusOf('emp-b3')).toBe('FAILED');
  });

  it('edit menolak nomor tak sah dan email kembar; berhasil kirim ulang', async () => {
    await expect(svc.update('emp-b3', 'x@ptdika.co.id', '12345')).rejects.toThrow(/422/);
    const clash = expect(svc.update('emp-b3', 'hana.prasetyo@ptdika.co.id', '081299990000')).rejects.toThrow(/409/);
    await vi.runOnlyPendingTimersAsync();
    await clash;
    const row = await run(svc.update('emp-b3', 'joko.susilo@ptdika.co.id', '081299990000'));
    expect(row).toMatchObject({ phoneNumber: '+6281299990000', invitationStatus: 'SENDING' });
  });
});
