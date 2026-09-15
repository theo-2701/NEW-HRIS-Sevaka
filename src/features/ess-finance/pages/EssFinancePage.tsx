import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
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
import { Note } from '@/features/time-off/components/TimeOffBits';
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
import { ownClaims, ownLoans, ownPayables } from '@/features/ess-finance/rules';
import { formatDate } from '@/lib/format';

type Tab = 'reimbursement' | 'taken' | 'loan';

const NO_FILTER = {};

/**
 * Employee Self-Service › Finance — port `_prototype/finance-ess.html` (FSD-001-FINANCE §7.2).
 *
 * Hub baca tiga tab atas transaksi milik sendiri: Reimbursement (ESS-3), Reimbursement
 * Taken (ESS-4), Loan (ESS-5). Nol endpoint baru dan nol form di sini — "New claim" dan
 * "New loan request" membawa ke layar Benefit Reimbursement / Loan tempat form itu
 * dikontrakkan (G4). Cash Advance tidak termasuk hub ini (PROB-FRONTEND-014).
 */
export function EssFinancePage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('reimbursement');
  const [claimSearch, setClaimSearch] = useState('');
  const [loanSearch, setLoanSearch] = useState('');
  const [detail, setDetail] = useState<BenefitClaim | null>(null);

  const { data: claims = [], isLoading: claimsLoading } = useClaims(NO_FILTER);
  const { data: payables = [], isLoading: payablesLoading } = useBenefitDisbursements();
  const { data: loans = [], isLoading: loansLoading } = useLoans();

  const myClaims = useMemo(() => ownClaims(claims, ME, claimSearch), [claims, claimSearch]);
  const myPayables = useMemo(() => ownPayables(payables, ME), [payables]);
  const myLoans = useMemo(() => ownLoans(loans, ME, loanSearch), [loans, loanSearch]);

  const pagedClaims = usePagedRows(myClaims);
  const pagedPayables = usePagedRows(myPayables);
  const pagedLoans = usePagedRows(myLoans);

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Self-Service' }, { label: 'Finance' }]}
        title="My Finance"
        description="Klaim benefit, pencairan klaim, dan pinjaman milik Anda dalam satu tempat. Pengajuan baru dibuat di menu Benefit Reimbursement dan Loan."
        actions={
          tab === 'reimbursement' ? (
            <Button onClick={() => navigate('/finance/benefit-reimbursement')}>New claim</Button>
          ) : tab === 'loan' ? (
            <Button onClick={() => navigate('/finance/loan')}>New loan request</Button>
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
            ]}
          />

          {tab === 'reimbursement' && (
            <Card>
              <CardHead title="My claims" sub="Termasuk klaim yang masih menunggu keputusan" />
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
              <CardHead title="Reimbursement taken" sub="Klaim yang sudah disetujui dan status pembayarannya" />
              <Note icon={<Info />}>
                <strong>GAP PROB-FRONTEND-016.</strong> Kontrak FT5 belum memberi ROLE_EMPLOYEE endpoint baca pencairan
                (FSD §7.2.1). Grid ini membaca penanda dummy yang sama dengan layar Pencairan &amp; Piutang, dipersempit
                ke data Anda.
              </Note>
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
              <CardHead title="My loans" sub="Pengakuan jadwal dan pembatalan dilakukan di menu Loan" />
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
        </div>
      </PageShell>

      <ClaimDetailModal claim={detail} asApprover={false} onClose={() => setDetail(null)} onReject={() => undefined} />
    </>
  );
}
