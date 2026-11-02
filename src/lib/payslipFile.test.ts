import { describe, expect, it } from 'vitest';
import { fileNameFrom, payslipFileName, textPdf } from '@/lib/payslipFile';

describe('payslipFile (CATATAN 16 Okt, payslip PDF)', () => {
  it('reads the file name from Content-Disposition, falls back otherwise', () => {
    expect(fileNameFrom('attachment; filename="payslip-october-2026.pdf"', 'x.pdf')).toBe('payslip-october-2026.pdf');
    expect(fileNameFrom(undefined, 'x.pdf')).toBe('x.pdf');
  });

  it('names the file in English from an Indonesian or English period label', () => {
    expect(payslipFileName('Oktober 2026')).toBe('payslip-october-2026.pdf');
    expect(payslipFileName('July 2026')).toBe('payslip-july-2026.pdf');
  });

  it('builds a PDF blob', () => {
    expect(textPdf(['Hello']).type).toBe('application/pdf');
  });
});
