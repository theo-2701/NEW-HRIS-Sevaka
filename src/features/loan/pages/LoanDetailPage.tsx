import { useSearchParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import {
  InstallmentStatusBadge,
  LoanStatusBadge,
  Money,
  ReservationBadge,
  RoomCards,
} from '@/features/loan/components/LoanBits';
import { useLoan, useLoanInstallments } from '@/features/loan/hooks/useLoan';
import { employeeOf, gradeName } from '@/features/loan/mock-data';
import { reservationStateOf } from '@/features/loan/rules';
import { RESERVATION_LABEL, SCHEDULE_SOURCE_LABEL } from '@/features/loan/types';
import type { Installment } from '@/features/loan/types';
import { formatCurrency, formatDate } from '@/lib/format';

/**
 * Finance › Loan › Detail — port `_prototype/finance-loan-detail.html` (LN-S1
 * detail, `GET /loans/{id}`).
 *
 * Baca saja: permintaannya sebagaimana dikirim, jadwal yang diterima dari pihak
 * pemberi dana, dan rencana angsurannya. Tidak ada pintu "atas nama" di Loan —
 * finance officer pun tidak bisa mengubah pokok/tenor atau membatalkan di sini.
 */
export function LoanDetailPage() {
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';

  const { data: loan, isLoading } = useLoan(id);
  const { data: installments = [] } = useLoanInstallments(id);

  const employee = loan ? employeeOf(loan.employeeId) : undefined;

  if (!isLoading && !loan) {
    return (
      <PageShell
        crumbs={[{ label: 'Finance' }, { label: 'Loan', to: '/finance/loan' }, { label: 'Detail' }]}
        title="Loan detail"
        description="Layar detail ini dibuka dari sebuah baris di halaman Loan."
      >
        <EmptyState
          title="Request not found"
          description="Permintaan yang dibuat selama sesi ini hanya hidup di memori halaman Loan."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      crumbs={[
        { label: 'Finance' },
        { label: 'Loan', to: '/finance/loan' },
        { label: loan?.requestNo ?? 'Detail' },
      ]}
      title={loan?.requestNo ?? 'Loan detail'}
      description={
        employee
          ? `${employee.name} · ${employee.unit} · ${gradeName(employee.gradeId)} — tampilan baca-saja permintaan sebagaimana dikirim, plus rencana angsurannya.`
          : 'Tampilan baca-saja satu permintaan: rinciannya saat dikirim, jadwal dari pihak pemberi dana, dan rencana angsurannya.'
      }
    >
      {loan && (
        <div className="flex flex-col gap-5">
          <RoomCards
            items={[
              {
                label: 'Principal',
                value: formatCurrency(loan.principalAmount),
                foot: `Tenor ${loan.tenorMonths} bulan · reservasi ${RESERVATION_LABEL[reservationStateOf(loan.status)]}.`,
                hero: true,
              },
              {
                label: 'Interest',
                value: loan.interestAmount === null ? '—' : formatCurrency(loan.interestAmount),
                foot: 'Tidak pernah dihitung HRIS — ia datang dari pihak pemberi dana.',
              },
              {
                label: 'Total obligation',
                value: loan.totalObligation === null ? '—' : formatCurrency(loan.totalObligation),
                foot: 'Pokok + bunga sebagaimana diakui.',
              },
              {
                label: 'Status',
                value: <LoanStatusBadge status={loan.status} />,
                foot: 'Ditetapkan proses approval, bukan disunting di sini.',
              },
            ]}
          />

          <Card>
            <CardHead title="Request information" sub="Dicatat saat pengajuan dan tidak berubah lagi" />

            <div className="flex flex-wrap items-center gap-2">
              <LoanStatusBadge status={loan.status} />
              <ReservationBadge state={reservationStateOf(loan.status)} />
            </div>

            <KeyValueList>
              <KeyValueRow label="Employee">
                {employee ? `${employee.name} · ${employee.nik}` : '—'}
              </KeyValueRow>
              <KeyValueRow label="Submitted">{formatDate(loan.submittedAt)}</KeyValueRow>
              <KeyValueRow label="Scheme">
                {loan.interestBearingSnapshot ? 'Interest-bearing' : 'Interest-free'}
              </KeyValueRow>
              <KeyValueRow label="Schedule source">
                {loan.scheduleSource ? SCHEDULE_SOURCE_LABEL[loan.scheduleSource] : '—'}
              </KeyValueRow>
              <KeyValueRow label="Bank account">
                {loan.bankAccountSnapshot.bankCode} {loan.bankAccountSnapshot.accountNumber} ·{' '}
                {loan.bankAccountSnapshot.accountHolderName}
              </KeyValueRow>
              <KeyValueRow label="Cost center">
                {loan.costCenterIdSnapshot ?? (
                  <span className="font-normal text-fg-3">null — snapshot diambil saat pengajuan (GAP-2)</span>
                )}
              </KeyValueRow>
              <KeyValueRow label="Reservation">
                {formatCurrency(loan.principalAmount)} · {RESERVATION_LABEL[reservationStateOf(loan.status)]}
              </KeyValueRow>
              <KeyValueRow label="Workflow instance">{loan.workflowInstanceId}</KeyValueRow>
            </KeyValueList>
          </Card>

          <Card>
            <CardHead
              title="Installment plan"
              sub="Urut nomor angsuran — tanggal mulai dan penanganan tunggakan mengikuti jadwal, tidak diubah di sini"
            />

            <DataTable<Installment>
              rows={installments}
              rowKey={(row) => String(row.sequenceNo)}
              empty="No installment plan yet — jadwalnya terbit setelah pinjaman mencapai APPROVED."
              columns={[
                { key: 'seq', header: '#', align: 'center', render: (row) => row.sequenceNo },
                {
                  key: 'period',
                  header: 'Payroll Period',
                  nowrap: true,
                  render: (row) => formatDate(row.payrollPeriodRef),
                },
                {
                  key: 'due',
                  header: 'Due Amount',
                  align: 'right',
                  render: (row) => <Money value={row.dueAmount} />,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => <InstallmentStatusBadge status={row.status} />,
                },
              ]}
            />

            <Note icon={<Lock />}>
              <strong>Baca saja.</strong> Finance officer tidak bisa mengubah pokok atau tenor di sini, dan tidak bisa
              membatalkan atau menarik atas nama karyawan — Loan tidak punya pintu "atas nama".
            </Note>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
