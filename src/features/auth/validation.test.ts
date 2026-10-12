import { describe, expect, it } from 'vitest';
import { loginEmailSchema, resetPasswordSchema } from '@/features/auth/validation';
import { authService } from '@/features/auth/services/auth.service';

const firstError = async (password: string) => {
  try {
    await loginEmailSchema.validateAt('password', { password });
    return null;
  } catch (error) {
    return (error as Error).message;
  }
};

describe('Password login — satu pesan, aturan pertama yang gagal (FSD-AUTH 0.17)', () => {
  it('mengikuti urutan min 8 → kecil → kapital → angka → spesial', async () => {
    expect(await firstError('')).toBe('Password wajib diisi');
    expect(await firstError('Ab1!')).toBe('Minimal 8 karakter');
    expect(await firstError('ABCDEFGH')).toBe('Harus mengandung huruf kecil');
    expect(await firstError('abcdefgh')).toBe('Harus mengandung huruf kapital');
    expect(await firstError('Abcdefgh')).toBe('Harus mengandung angka');
    expect(await firstError('Abcdefg1')).toBe('Harus mengandung karakter spesial');
    expect(await firstError('Sevaka@2026')).toBeNull();
  });

  it('RP2: konfirmasi berbeda ⇒ "Password tidak cocok"', async () => {
    await expect(
      resetPasswordSchema.validateAt('passwordConfirmation', { password: 'Sevaka@2026', passwordConfirmation: 'x' }),
    ).rejects.toThrow('Password tidak cocok');
  });
});

describe('Pemicu demo galat (FSD-AUTH 0.18)', () => {
  it('login gagal 401 generik, OTP salah satu pesan seragam, tautan basi 401', async () => {
    await expect(
      authService.loginWithEmail({ email: 'a@b.co', password: 'Salah@123', turnstileToken: 't' }),
    ).rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
    await expect(authService.verifyOtp({ code: '000000' })).rejects.toMatchObject({ status: 401 });
    await expect(authService.verifyMagicLink('expired')).rejects.toMatchObject({ status: 401 });
  });
});
