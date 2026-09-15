import type { BenefitClaim, Payable } from '@/features/benefit/types';
import type { Loan } from '@/features/loan/types';

/**
 * Aturan hub ESS Finance (FSD-001-FINANCE §7.2). Hub ini komposit baca: nol endpoint
 * baru, setiap grid memakai `search` milik FT2/FT3 dengan `employee_id` dipaksa server
 * ke pemanggil. Di mode dummy pemaksaan itu dilakukan di sini.
 */

const matches = (requestNo: string, query: string) => !query || requestNo.toLowerCase().includes(query);

/** ESS-3 — klaim milik sendiri, termasuk yang belum final (G6). Terbaru di atas. */
export function ownClaims(rows: BenefitClaim[], me: string, search = ''): BenefitClaim[] {
  const query = search.trim().toLowerCase();
  return rows
    .filter((row) => row.employeeId === me && matches(row.requestNo, query))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/**
 * ESS-4 — pencairan klaim milik sendiri. Kontrak FT5 tidak memberi ROLE_EMPLOYEE
 * endpoint baca (GAP PROB-FRONTEND-016); dummy membaca penanda yang sama dengan
 * layar Pencairan & Piutang, dipersempit ke pemanggil.
 */
export function ownPayables(rows: Payable[], me: string): Payable[] {
  return rows
    .filter((row) => row.employeeId === me)
    .sort((a, b) => (b.mark?.markedAt ?? b.submittedAt).localeCompare(a.mark?.markedAt ?? a.submittedAt));
}

/** ESS-5 — pinjaman milik sendiri. */
export function ownLoans(rows: Loan[], me: string, search = ''): Loan[] {
  const query = search.trim().toLowerCase();
  return rows
    .filter((row) => row.employeeId === me && matches(row.requestNo, query))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}
