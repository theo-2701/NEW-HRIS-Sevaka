import type { EssFinanceTab } from '@/features/ess-finance/pages/EssFinancePage';

/** Tujuan pendarat tautan surel kabar finance: alamat + `state` yang dibawa (`viewId` membuka modal detail). */
export interface FinanceOpenTarget {
  path: string;
  state?: { viewId: string; tab?: EssFinanceTab };
}

/** Peran yang mendarat di layar Finance; selain itu ke hub ESS Finance. */
const FINANCE_SCREEN_ROLES = ['ROLE_DEPT_MANAGER', 'ROLE_FINANCE_OFFICER', 'ROLE_HR_MANAGER', 'ROLE_SUPER_ADMIN'];

/**
 * UIC-FINANCE 0.32 §12 — `/finance/open/:kind/:id` bukan layar: ia berpindah ke layar keluarga pengajuan
 * menurut peran sesi. `kind` asing atau `id` kosong ⇒ beranda, tanpa alamat tebakan. Hak baca tetap dijaga
 * server di modal detail (id orang lain ⇒ 404 seragam).
 */
export function financeOpenTarget(kind: string | undefined, id: string | undefined, role: string | undefined): FinanceOpenTarget {
  if (!id) return { path: '/' };
  const viewId = id;
  const is = (roles: string[]) => Boolean(role && roles.includes(role));
  switch (kind) {
    case 'cash-advance':
      return is(FINANCE_SCREEN_ROLES)
        ? { path: '/finance/cash-advance', state: { viewId } }
        : { path: '/me/finance', state: { viewId, tab: 'cash-advance' } };
    case 'benefit-claim':
      return is(FINANCE_SCREEN_ROLES)
        ? { path: '/finance/benefit-reimbursement', state: { viewId } }
        : { path: '/me/finance', state: { viewId, tab: 'reimbursement' } };
    case 'loan':
      // Detail pinjaman di repo ini satu halaman bagi petugas maupun pemiliknya (UIC: FO/HR/SA vs pemilik).
      return { path: `/finance/loan/detail?id=${encodeURIComponent(viewId)}` };
    default:
      return { path: '/' };
  }
}
