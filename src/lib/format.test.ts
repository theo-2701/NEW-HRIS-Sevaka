import { describe, expect, it } from 'vitest';
import { formatCountdown, formatCurrency, formatDate, initials, maskEmail, maskPhone } from '@/lib/format';

describe('format', () => {
  it('menulis tanggal dengan gaya dd Mmm yyyy', () => {
    expect(formatDate('2026-09-30')).toBe('30 Sep 2026');
  });

  it('mengembalikan em dash untuk tanggal kosong', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('memformat rupiah dengan pemisah ribuan Indonesia', () => {
    expect(formatCurrency(1234567)).toBe('Rp 1.234.567');
  });

  it('mengambil dua inisial pertama', () => {
    expect(initials('Budi Santoso')).toBe('BS');
  });

  it('memasking email dan nomor telepon', () => {
    expect(maskEmail('budi.santoso@ptdika.co.id')).toBe('b***@ptdika.co.id');
    expect(maskPhone('081234567890')).toBe('0812****7890');
  });

  it('menampilkan hitung mundur mm:ss', () => {
    expect(formatCountdown(300)).toBe('05:00');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});
