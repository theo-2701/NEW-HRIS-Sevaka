import { beforeEach, describe, expect, it } from 'vitest';
import { atsBridgeService as svc, resetAtsMocks } from '@/features/ats-bridge/services/ats-bridge.service';
import {
  contactVerificationService,
  resetContactVerificationMocks,
} from '@/features/contact-verification/services/contact-verification.service';

beforeEach(() => {
  resetAtsMocks();
  resetContactVerificationMocks();
});

describe('ATS Bridge (§7.4.12)', () => {
  it('undangan ganda pada email yang masih menunggu ditolak 409', async () => {
    await expect(svc.invite('nadia.putri@gmail.com', 'emp-hendra')).rejects.toThrow(/409/);
    const row = await svc.invite('baru@gmail.com', 'emp-hendra');
    expect(row).toMatchObject({ atsStatus: 'WAITING_CANDIDATE', source: 'ATS', linkSendCount: 1 });
  });

  it('resend hanya saat menunggu; HR Staff dan baris USED tidak bisa dihapus', async () => {
    expect((await svc.resendLink('ats-1')).linkSendCount).toBe(2);
    await expect(svc.resendLink('ats-2')).rejects.toThrow(/409/);
    await expect(svc.remove('HR_STAFF', 'ats-1')).rejects.toThrow(/403/);
    await expect(svc.remove('HR_MANAGER', 'ats-4')).rejects.toThrow(/409/);
  });

  it('materialisasi Bulk Import: USED, sandi 20 karakter, masuk antrean verifikasi', async () => {
    const draft = { joinDate: '2026-11-16', jobGradeId: 'gr-3a', nik: 'NIK-0120', username: 'omar.fadil', companyEmail: 'omar.fadil@ptdika.co.id' };
    await expect(svc.materialize('ats-3', draft, 'k')).rejects.toThrow(/422/);
    const result = await svc.materialize('ats-2', draft, 'k');
    expect(result.mailboxInitialPassword).toHaveLength(20);
    expect(result.mailboxInitialPassword).not.toMatch(/[0Oo1lI]/);
    expect((await svc.search()).find((row) => row.id === 'ats-2')?.atsStatus).toBe('USED');
    expect((await contactVerificationService.search()).some((row) => row.companyEmail === 'omar.fadil@ptdika.co.id')).toBe(true);
    await expect(svc.materialize('ats-2', draft, 'k')).rejects.toThrow(/409/);
  });
});
