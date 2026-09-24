import { describe, expect, it } from 'vitest';
import { canSeeCompanyLayer, dayLine, daysUntil, greetingFor, monthLabel } from '@/features/dashboard/home/homeRules';

describe('Home — aturan tampilan', () => {
  it('sapaan mengikuti jam', () => {
    expect(greetingFor(new Date(2026, 8, 24, 8))).toBe('Selamat pagi');
    expect(greetingFor(new Date(2026, 8, 24, 13))).toBe('Selamat siang');
    expect(greetingFor(new Date(2026, 8, 24, 16))).toBe('Selamat sore');
    expect(greetingFor(new Date(2026, 8, 24, 20))).toBe('Selamat malam');
  });

  it('lapis Perusahaan hanya untuk HR/manajemen (FSD-AUTH §2.9)', () => {
    expect(canSeeCompanyLayer('Administrator')).toBe(true);
    expect(canSeeCompanyLayer('HR Manager')).toBe(true);
    expect(canSeeCompanyLayer('Employee')).toBe(false);
    expect(canSeeCompanyLayer(undefined)).toBe(false);
  });

  it('sisa hari dihitung per tanggal kalender, bukan jam', () => {
    const now = new Date(2026, 8, 24, 23, 30);
    expect(daysUntil('2026-09-24', now)).toBe(0);
    expect(daysUntil('2026-09-30', now)).toBe(6);
    expect(daysUntil('2026-09-20', now)).toBe(-4);
  });

  it('label tanggal & bulan berbahasa Indonesia', () => {
    expect(dayLine(new Date(2026, 8, 24))).toBe('Kamis, 24 September 2026');
    expect(monthLabel('2026-07')).toBe('Juli 2026');
  });
});
