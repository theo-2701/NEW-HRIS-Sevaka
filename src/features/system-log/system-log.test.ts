import { describe, expect, it } from 'vitest';
import { errorCodeError, isLoadError, rangeErrors, traceIdError } from '@/features/system-log/rules';
import { systemLogService } from '@/features/system-log/services/system-log.service';
import { DEMO_TRACE_ID, UNAVAILABLE_TRACE_ID } from '@/features/system-log/mock-data';

describe('System Log — validasi layar (FSD-AUTH 0.22 §7A.1/§7B.1)', () => {
  it('Trace ID: 16 atau 32 karakter heksadesimal, huruf besar diterima', () => {
    expect(traceIdError('')).toBe('This field is required.');
    expect(traceIdError('4BF92F3577B34DA6')).toBeNull();
    expect(traceIdError(DEMO_TRACE_ID)).toBeNull();
    expect(traceIdError('xyz')).toMatch(/16 or 32 characters/);
  });

  it('Error Code: bentuk ABC-DEF-123, huruf kecil diterima', () => {
    expect(errorCodeError('emp-auz-724')).toBeNull();
    expect(errorCodeError('EMP724')).toBe('Use the format ABC-DEF-123.');
  });

  it('rentang: akhir sesudah awal, ≤ 24 jam, ≤ 7 hari lalu, tidak di masa depan', () => {
    const now = new Date('2026-10-26T12:00:00+07:00');
    const at = (iso: string) => new Date(iso);
    expect(rangeErrors(at('2026-10-26T11:00:00+07:00'), at('2026-10-26T12:00:00+07:00'), now)).toEqual({});
    expect(rangeErrors(at('2026-10-26T12:00:00+07:00'), at('2026-10-26T11:00:00+07:00'), now).to).toMatch(/after the start/);
    expect(rangeErrors(at('2026-10-25T10:00:00+07:00'), at('2026-10-26T11:00:00+07:00'), now).to).toMatch(/24 hours/);
    expect(rangeErrors(at('2026-10-18T10:00:00+07:00'), at('2026-10-18T11:00:00+07:00'), now).from).toMatch(/7 days ago/);
    expect(rangeErrors(at('2026-10-26T11:30:00+07:00'), at('2026-10-26T13:00:00+07:00'), now).to).toMatch(/future/);
  });

  it('galat muat = selain 403/422 — spanduk + Try again, tanpa teks tabel kosong', () => {
    expect(isLoadError(new Error('503 AUT-DEP-326 — down'))).toBe(true);
    expect(isLoadError(new Error('422 AUT-VAL-318 — bad'))).toBe(false);
    expect(isLoadError(new Error('403 — no'))).toBe(false);
    expect(isLoadError(null)).toBe(false);
  });
});

describe('System Log — service mode dummy', () => {
  it('Trace ID mengembalikan alur urut waktu naik; trace tak dikenal = nol baris, bukan galat', async () => {
    const grid = await systemLogService.traceSearch(DEMO_TRACE_ID);
    expect(grid.rows.length).toBeGreaterThan(1);
    expect(grid.rows.map((row) => row.occurredAt)).toEqual([...grid.rows.map((row) => row.occurredAt)].sort());
    expect((await systemLogService.traceSearch('aaaaaaaaaaaaaaaa')).totalData).toBe(0);
    await expect(systemLogService.traceSearch(UNAVAILABLE_TRACE_ID)).rejects.toThrow(/^503 AUT-DEP-326/);
  });

  it('Error Code: kejadian dalam rentang, terbaru dulu', async () => {
    const to = new Date();
    const from = new Date(to.getTime() - 3_600_000);
    const grid = await systemLogService.errorCodeSearch('EMP-AUZ-724', from, to);
    expect(grid.rows.length).toBeGreaterThan(0);
    expect(grid.rows[0].occurredAt >= grid.rows.at(-1)!.occurredAt).toBe(true);
  });
});
