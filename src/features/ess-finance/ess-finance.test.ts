import { describe, expect, it } from 'vitest';
import { benefitService } from '@/features/benefit/services/benefit.service';
import { ME as BENEFIT_ME } from '@/features/benefit/mock-data';
import { loanService } from '@/features/loan/services/loan.service';
import { ME as LOAN_ME } from '@/features/loan/mock-data';
import { ownClaims, ownLoans, ownPayables } from '@/features/ess-finance/rules';

describe('ESS Finance — hub baca milik sendiri (FSD-FINANCE §7.2)', () => {
  it('Benefit dan Loan memakai identitas pemanggil yang sama', () => {
    expect(BENEFIT_ME).toBe(LOAN_ME);
  });

  it('ESS-3 hanya memuat klaim milik sendiri, termasuk yang belum final', async () => {
    const all = await benefitService.claims();
    const mine = ownClaims(all, BENEFIT_ME);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((row) => row.employeeId === BENEFIT_ME)).toBe(true);
    expect(all.some((row) => row.employeeId !== BENEFIT_ME)).toBe(true);
  });

  it('ESS-3 menyaring nomor pengajuan dan mengurutkan terbaru di atas', async () => {
    const mine = ownClaims(await benefitService.claims(), BENEFIT_ME);
    const dates = mine.map((row) => row.submittedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    const target = mine[0].requestNo;
    expect(ownClaims(mine, BENEFIT_ME, target.toLowerCase()).map((row) => row.requestNo)).toContain(target);
    expect(ownClaims(mine, BENEFIT_ME, 'tidak-ada-nomor-ini')).toHaveLength(0);
  });

  it('ESS-4 hanya membaca payable milik sendiri', async () => {
    const mine = ownPayables(await benefitService.disbursements(), BENEFIT_ME);
    expect(mine.every((row) => row.employeeId === BENEFIT_ME)).toBe(true);
  });

  it('ESS-5 hanya memuat pinjaman milik sendiri', async () => {
    const all = await loanService.loans();
    const mine = ownLoans(all, LOAN_ME);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((row) => row.employeeId === LOAN_ME)).toBe(true);
  });
});
