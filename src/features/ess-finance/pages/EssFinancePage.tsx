import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { ClaimStatusBadge, Money } from '@/features/benefit/components/BenefitBits';
import { ClaimDetailModal } from '@/features/benefit/components/ClaimModals';
import { useBenefitDisbursements, useClaims } from '@/features/benefit/hooks/useBenefit';
import { benefitService } from '@/features/benefit/services/benefit.service';
import { ME } from '@/features/benefit/mock-data';
import { PAYMENT_METHOD_LABEL } from '@/features/benefit/types';
import type { BenefitClaim, Payable } from '@/features/benefit/types';
import { LoanStatusBadge, Money as LoanMoney } from '@/features/loan/components/LoanBits';
import { useLoans } from '@/features/loan/hooks/useLoan';
import type { Loan } from '@/features/loan/types';
import { CashAdvanceRequests } from '@/features/cash-advance/pages/CashAdvancePage';
import { AdvanceFormModal } from '@/features/cash-advance/components/AdvanceModals';
import { useAdvances } from '@/features/cash-advance/hooks/useCashAdvance';
import type { Actor } from '@/features/cash-advance/types';
import { ownClaims, ownLoans, ownPayables } from '@/features/ess-finance/rules';
import { formatDate } from '@/lib/format';

export type EssFinanceTab = 'reimbursement' | 'taken' | 'loan' | 'cash-advance';
type Tab = EssFinanceTab;

const NO_FILTER = {};
/** Karyawan pemilik hub — pintu dibuka per identitas (FSD-FINANCE 0.35); Ajukan hanya `ROLE_EMPLOYEE`. */
const ESS_ACTOR: Actor = { employeeId: ME, role: 'ROLE_EMPLOYEE' };

/**
 * Employee Self-Service › Finance — port `_prototype/finance-ess.html` (FSD-001-FINANCE §7.2).
 *
 * Hub empat tab atas transaksi milik sendiri: Reimbursement (ESS-3), Reimbursement Taken (ESS-4),
 * Loan (ESS-5), dan Cash Advance (ESS-6, FSD-FINANCE 0.34 — layar + aksi Menu 4 tanpa tab petugas;
 * `/finance/cash-advance` tetap tertutup bagi Employee). Nol endpoint baru. "New claim" dan
 * "New loan request" membawa ke layar Benefit Reimbursement / Loan tempat form itu dikontrakkan (G4).
 * `state.tab` + `state.viewId` = pendarat tautan surel (UIC-FINANCE §12).
 */
export function EssFinancePage() {
  const navigate = useNavigate();
  const link = useLocation().state as { tab?: Tab; viewId?: string } | null;
  const [tab, setTab] = useState<Tab>(link?.tab ?? 'reimbursement');
  const [advanceForm, setAdvanceForm] = useState(false);
  const [claimSearch, setClaimSearch] = useState('');
  const [loanSearch, setLoanSearch] = useState('');
  const [detail, setDetail] = useState<BenefitClaim | null>(null);

  const { data: claims = [], isLoading: claimsLoading } = useClaims(NO_FILTER);
  const { data: payables = [], isLoading: payablesLoading } = useBenefitDisbursements();
  const { data: loans = [], isLoading: loansLoading } = useLoans();
  const { data: advances = [] } = useAdvances(ESS_ACTOR, NO_FILTER);

  const myClaims = useMemo(() => ownClaims(claims, ME, claimSearch), [claims, claimSearch]);
  const myPayables = useMemo(() => ownPayables(payables, ME), [payables]);
  const myLoans = useMemo(() => ownLoans(loans, ME, loanSearch), [loans, loanSearch]);

  const pagedClaims = usePagedRows(myClaims);
  const pagedPayables = usePagedRows(myPayables);
  const pagedLoans = usePagedRows(myLoans);

  // Tautan surel klaim: buka detailnya sekali begitu daftar klaim termuat.
  const openedClaim = useRef(false);
  useEffect(() => {
    if (openedClaim.current || link?.tab !== 'reimbursement' || !link.viewId) return;
    const claim = myClaims.find((row) => row.id === link.viewId);
    if (!claim) return;
    openedClaim.current = true;
    setDetail(benefitService.asApplicantView(claim));
  }, [link, myClaims]);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Self-Service' }, { label: 'Finance' }]}
        title="My Finance"
        description="Your benefit claims, claim payouts, loans, and cash advances in one place."
        actions={
          tab === 'reimbursement' ? (
            <Button onClick={() => navigate('/finance/benefit-reimbursement')}>New claim</Button>
          ) : tab === 'loan' ? (
            <Button onClick={() => navigate('/finance/loan')}>New loan request</Button>
          ) : tab === 'cash-advance' ? (
            <Button onClick={() => setAdvanceForm(true)}>Request cash advance</Button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'reimbursement', label: 'Reimbursement', count: myClaims.length },
              { value: 'taken', label: 'Reimbursement Taken', count: myPayables.length },
              { value: 'loan', label: 'Loan', count: myLoans.length },
              { value: 'cash-advance', label: 'Cash Advance', count: advances.length },
            ]}
          />

          {tab === 'reimbursement' && (
            <Card>
              <CardHead title="My claims" sub="Including claims still waiting for a decision" />
              <div className="flex flex-col">
                <TableToolbar
                  search={{
                    value: claimSearch,
                    onChange: (value) => {
                      setClaimSearch(value);
                      pagedClaims.resetPage();
                    },
                    placeholder: 'Search request no.',
                  }}
                />
                <DataTable<BenefitClaim>
                  rows={pagedClaims.rows}
                  rowKey={(row) => row.id}
                  loading={claimsLoading}
                  empty="You have no benefit claim yet."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                    },
                    { key: 'type', header: 'Benefit Type', render: (row) => row.benefitTypeName },
                    { key: 'amount', header: 'Amount', align: 'right', render: (row) => <Money value={row.totalAmount} /> },
                    { key: 'status', header: 'Status', render: (row) => <ClaimStatusBadge status={row.status} /> },
                    {
                      key: 'submitted',
                      header: 'Submitted',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.submittedAt),
                    },
                  ]}
                  actions={(row) => (
                    <RowButton onClick={() => setDetail(benefitService.asApplicantView(row))}>View Detail</RowButton>
                  )}
                />
                <Pagination
                  page={pagedClaims.page}
                  pageSize={pagedClaims.pageSize}
                  total={pagedClaims.total}
                  noun="claims"
                  onPageChange={pagedClaims.setPage}
                  onPageSizeChange={pagedClaims.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'taken' && (
            <Card>
              <CardHead title="Reimbursement taken" sub="Approved claims and their payment status" />
              <div className="flex flex-col">
                <DataTable<Payable>
                  rows={pagedPayables.rows}
                  rowKey={(row) => row.payableId}
                  loading={payablesLoading}
                  empty="No approved claim has reached disbursement yet."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                    },
                    { key: 'amount', header: 'Amount', align: 'right', render: (row) => <Money value={row.amount} /> },
                    {
                      key: 'method',
                      header: 'Payment Method',
                      render: (row) =>
                        row.mark ? (
                          <StatusBadge tone="info">{PAYMENT_METHOD_LABEL[row.mark.paymentMethod]}</StatusBadge>
                        ) : (
                          <span className="text-fg-4">—</span>
                        ),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) =>
                        row.mark ? <StatusBadge tone="ok">Paid</StatusBadge> : <StatusBadge tone="warn">Not paid yet</StatusBadge>,
                    },
                    {
                      key: 'paid',
                      header: 'Paid At',
                      muted: true,
                      nowrap: true,
                      render: (row) => (row.mark ? formatDate(row.mark.markedAt) : <span className="text-fg-4">—</span>),
                    },
                  ]}
                />
                <Pagination
                  page={pagedPayables.page}
                  pageSize={pagedPayables.pageSize}
                  total={pagedPayables.total}
                  noun="payables"
                  onPageChange={pagedPayables.setPage}
                  onPageSizeChange={pagedPayables.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'loan' && (
            <Card>
              <CardHead title="My loans" sub="Acknowledge schedules and cancel requests in the Loan menu" />
              <div className="flex flex-col">
                <TableToolbar
                  search={{
                    value: loanSearch,
                    onChange: (value) => {
                      setLoanSearch(value);
                      pagedLoans.resetPage();
                    },
                    placeholder: 'Search request no.',
                  }}
                />
                <DataTable<Loan>
                  rows={pagedLoans.rows}
                  rowKey={(row) => row.id}
                  loading={loansLoading}
                  empty="You have no loan request yet."
                  columns={[
                    {
                      key: 'no',
                      header: 'Request No.',
                      strong: true,
                      nowrap: true,
                      render: (row) => <span className="font-mono text-xs">{row.requestNo}</span>,
                    },
                    {
                      key: 'principal',
                      header: 'Principal',
                      align: 'right',
                      render: (row) => <LoanMoney value={row.principalAmount} />,
                    },
                    { key: 'tenor', header: 'Tenor', align: 'center', render: (row) => `${row.tenorMonths} mo` },
                    {
                      key: 'total',
                      header: 'Total Obligation',
                      align: 'right',
                      render: (row) => <LoanMoney value={row.totalObligation} />,
                    },
                    { key: 'status', header: 'Status', render: (row) => <LoanStatusBadge status={row.status} /> },
                    {
                      key: 'submitted',
                      header: 'Submitted',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.submittedAt),
                    },
                  ]}
                  actions={(row) => (
                    <RowButton onClick={() => navigate(`/finance/loan/detail?id=${row.id}`)}>View Detail</RowButton>
                  )}
                />
                <Pagination
                  page={pagedLoans.page}
                  pageSize={pagedLoans.pageSize}
                  total={pagedLoans.total}
                  noun="loans"
                  onPageChange={pagedLoans.setPage}
                  onPageSizeChange={pagedLoans.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'cash-advance' && (
            <CashAdvanceRequests
              actor={ESS_ACTOR}
              variant="ess"
              openId={link?.tab === 'cash-advance' ? (link.viewId ?? null) : null}
            />
          )}
        </div>
      </PageShell>

      <AdvanceFormModal open={advanceForm} actor={ESS_ACTOR} onClose={() => setAdvanceForm(false)} />
      <ClaimDetailModal claim={detail} asApprover={false} onClose={() => setDetail(null)} onReject={() => undefined} />
    </>
  );
}
