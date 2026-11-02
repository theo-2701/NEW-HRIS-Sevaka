import { beforeEach, describe, expect, it } from 'vitest';
import {
  contactVerificationService as svc,
  resetContactVerificationMocks,
} from '@/features/contact-verification/services/contact-verification.service';
import { CONTACT_VERIFICATIONS } from '@/features/contact-verification/mock-data';

beforeEach(() => resetContactVerificationMocks());
const tokenOf = (id: string, kind: 'EMAIL' | 'PHONE') => svc.demoLink(id, kind)!.split('#t=')[1];

describe('Email and Phone Verification (§7.20)', () => {
  it('kirim massal melewati yang sudah terverifikasi / tanpa nomor', async () => {
    const result = await svc.sendLinks('PHONE', ['cv-1', 'cv-4']);
    expect(result).toMatchObject({ sent: 1, skipped: 1 });
    expect(result.results.find((row) => row.id === 'cv-4')?.reason).toBe('NO_PHONE');
    await expect(svc.sendLinks('EMAIL', [])).rejects.toThrow(/422/);
  });

  it('kirim ulang mematikan token lama; token sekali pakai', async () => {
    await svc.sendLinks('EMAIL', ['cv-2']);
    const old = tokenOf('cv-2', 'EMAIL');
    await svc.sendLinks('EMAIL', ['cv-2']);
    await expect(svc.confirm(old)).rejects.toThrow(/404/);
    const fresh = tokenOf('cv-2', 'EMAIL');
    await svc.confirm(fresh);
    await expect(svc.confirm(fresh)).rejects.toThrow(/404/);
  });

  it('dua saluran terbukti ⇒ baris keluar dari antrean', async () => {
    await svc.sendLinks('PHONE', ['cv-3']);
    const done = await svc.confirm(tokenOf('cv-3', 'PHONE'));
    expect(done.allVerified).toBe(true);
    expect((await svc.search()).some((row) => row.id === 'cv-3')).toBe(false);
  });
});

describe('Cancel access (§7.21)', () => {
  it('OTHER wajib beralasan; berhasil menutup baris', async () => {
    const row = CONTACT_VERIFICATIONS[0];
    await expect(svc.cancelAccess(row, 'OTHER', ' ')).rejects.toThrow(/EMP-VAL-643/);
    await expect(svc.cancelAccess(row, '', '')).rejects.toThrow(/EMP-VAL-642/);
    const result = await svc.cancelAccess(row, 'CANDIDATE_WITHDREW', '');
    expect(result.effectiveDate >= new Date().toISOString().slice(0, 10)).toBe(true);
    expect((await svc.search()).some((item) => item.id === row.id)).toBe(false);
  });
});
