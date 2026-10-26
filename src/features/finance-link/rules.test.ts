import { describe, expect, it } from 'vitest';
import { financeOpenTarget } from '@/features/finance-link/rules';

describe('Pendarat tautan surel kabar finance (UIC-FINANCE 0.32 §12)', () => {
  it('uang muka: petugas ke layar Finance, karyawan ke tab ESS-6 — keduanya membawa viewId', () => {
    expect(financeOpenTarget('cash-advance', 'adv-78', 'ROLE_FINANCE_OFFICER')).toEqual({
      path: '/finance/cash-advance',
      state: { viewId: 'adv-78' },
    });
    expect(financeOpenTarget('cash-advance', 'adv-78', 'ROLE_EMPLOYEE')).toEqual({
      path: '/me/finance',
      state: { viewId: 'adv-78', tab: 'cash-advance' },
    });
  });

  it('klaim dan pinjaman punya tujuannya sendiri; jenis asing atau id kosong ke beranda', () => {
    expect(financeOpenTarget('benefit-claim', 'clm-1', 'ROLE_EMPLOYEE').state).toEqual({ viewId: 'clm-1', tab: 'reimbursement' });
    expect(financeOpenTarget('loan', 'ln-1', 'ROLE_EMPLOYEE').path).toBe('/finance/loan/detail?id=ln-1');
    expect(financeOpenTarget('payslip', 'x', 'ROLE_SUPER_ADMIN')).toEqual({ path: '/' });
    expect(financeOpenTarget('loan', '', 'ROLE_SUPER_ADMIN')).toEqual({ path: '/' });
  });
});
