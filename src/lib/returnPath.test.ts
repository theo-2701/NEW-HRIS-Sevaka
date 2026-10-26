import { beforeEach, describe, expect, it } from 'vitest';
import { clearReturnPath, isSafeReturnPath, saveReturnPath, takeReturnPath } from '@/lib/returnPath';

beforeEach(() => {
  localStorage.clear();
});

describe('Alamat asal sesudah login (FSD-AUTH 0.21 §2)', () => {
  it('menolak open-redirect, pohon auth, dan beranda', () => {
    expect(isSafeReturnPath('/finance/open/cash-advance/adv-78')).toBe(true);
    expect(isSafeReturnPath('/me/time/attendance?tab=summary#top')).toBe(true);
    for (const path of ['//evil.example', '/\\evil', 'https://evil.example', '/', '/dashboard', '/auth/login', '/a\nb', '']) {
      expect(isSafeReturnPath(path)).toBe(false);
    }
    expect(isSafeReturnPath(`/${'a'.repeat(2048)}`)).toBe(false);
  });

  it('dipakai sekali, kedaluwarsa 15 menit, dan hilang saat Logout', () => {
    saveReturnPath('/finance/cash-advance', 0);
    expect(takeReturnPath(60_000)).toBe('/finance/cash-advance');
    expect(takeReturnPath(60_000)).toBeNull();

    saveReturnPath('/finance/cash-advance', 0);
    expect(takeReturnPath(15 * 60_000 + 1)).toBeNull();

    saveReturnPath('/finance/cash-advance');
    clearReturnPath();
    expect(takeReturnPath()).toBeNull();
  });

  it('isi penyimpanan yang dirusak tidak dipercaya', () => {
    localStorage.setItem('sevaka_return_path', JSON.stringify({ path: '//evil.example', savedAt: Date.now() }));
    expect(takeReturnPath()).toBeNull();
    localStorage.setItem('sevaka_return_path', 'not json');
    expect(takeReturnPath()).toBeNull();
  });
});
