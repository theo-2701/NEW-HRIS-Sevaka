import { describe, expect, it } from 'vitest';
import { authService } from '@/features/auth/services/auth.service';
import { ApiError } from '@/services/api';

const status = async (promise: Promise<unknown>) => {
  try {
    await promise;
    return 200;
  } catch (error) {
    return error instanceof ApiError ? error.status : -1;
  }
};

describe('Aktivasi Akun (FSD-AUTH 0.14 §5, UIC 0.19 §5.1)', () => {
  const base = { aid: 'otp-1', token: 'tok-1', password: 'Rahasia#2026', passwordConfirmation: 'Rahasia#2026' };

  it('tiga kelas galat dibedakan: 401 tautan tak berlaku, 422 masukan, 502 gangguan (tautan masih hidup)', async () => {
    expect(await status(authService.activate(base))).toBe(200);
    expect(await status(authService.activate({ ...base, token: 'expired' }))).toBe(401);
    expect(await status(authService.activate({ ...base, aid: '' }))).toBe(401);
    expect(await status(authService.activate({ ...base, passwordConfirmation: 'Lain#2026x' }))).toBe(422);
    expect(await status(authService.activate({ ...base, token: 'idp-down' }))).toBe(502);
  });
});

describe('Kirim Ulang Undangan (FSD-AUTH 0.14 §6, UIC 0.19 §5.2)', () => {
  it('tautan aktif masih berlaku → 422; paksa → tautan baru terbit', async () => {
    const rows = await authService.pendingInvitations();
    const active = rows.find((row) => new Date(row.expiresAt).getTime() > Date.now())!;
    expect(await status(authService.resendInvitation(active.employeeId))).toBe(422);
    const fresh = await authService.resendInvitation(active.employeeId, true);
    expect(new Date(fresh.sentAt).getTime()).toBeGreaterThan(new Date(active.sentAt).getTime());
  });

  it('tautan sudah kedaluwarsa → langsung terbit tanpa konfirmasi', async () => {
    const rows = await authService.pendingInvitations();
    const expired = rows.find((row) => new Date(row.expiresAt).getTime() <= Date.now())!;
    const fresh = await authService.resendInvitation(expired.employeeId);
    expect(new Date(fresh.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });
});
