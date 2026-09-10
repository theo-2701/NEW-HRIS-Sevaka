import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Modal } from '@/components/Modal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { AdjustmentModal } from '@/features/time-off/components/AdjustmentModal';
import { useBalanceYears, useBalances, useLedger } from '@/features/time-off/hooks/useBalance';
import { EMPLOYEES, LEAVE_TYPES, VIEWERS, employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
import { MUTATION_SOURCE_LABEL } from '@/features/time-off/types';
import type { LeaveBalance, LedgerEntry, MutationSource } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

type Tab = 'balances' | 'ledger';

/** Angka hari — negatif diberi warna, delta selalu bertanda. */
function DayNumber({ value, signed }: { value: number; signed?: boolean }) {
  return (
    <span className={cn('font-body text-[13px] font-bold tabular-nums', value < 0 ? 'text-error-600' : 'text-fg-1')}>
      {signed && value > 0 ? '+' : ''}
      {value.toFixed(2)}
    </span>
  );
}

/**
 * Time Off Balance — port `_prototype/time-off-balance.html`
 * (FSD-001-TIME §3 · UIC-001-TIME §4).
 *
 * Saldo tidak pernah diketik: ia jumlah seluruh mutasi di ledger. Grid-nya
 * read-only dua arah, dan satu-satunya jalur manusia adalah HR adjustment yang
 * bersifat create-only.
 */
export function TimeOffBalancePage() {
  const [tab, setTab] = useState<Tab>('balances');
  const [adjusting, setAdjusting] = useState(false);
  const [detail, setDetail] = useState<LeaveBalance | null>(null);

  const [balEmployee, setBalEmployee] = useState('ALL');
  const [balType, setBalType] = useState('ALL');
  const [balYear, setBalYear] = useState('ALL');

  const [ledEmployee, setLedEmployee] = useState('ALL');
  const [ledSource, setLedSource] = useState('ALL');
  const [ledType, setLedType] = useState('ALL');

  const balanceFilter = useMemo(
    () => ({
      employeeId: balEmployee === 'ALL' ? undefined : balEmployee,
      leaveTypeId: balType === 'ALL' ? undefined : balType,
      periodYear: balYear === 'ALL' ? undefined : Number(balYear),
    }),
    [balEmployee, balType, balYear],
  );

  const ledgerFilter = useMemo(
    () => ({
      employeeId: ledEmployee === 'ALL' ? undefined : ledEmployee,
      leaveTypeId: ledType === 'ALL' ? undefined : ledType,
      source: ledSource === 'ALL' ? undefined : (ledSource as MutationSource),
    }),
    [ledEmployee, ledType, ledSource],
  );

  const { data: balances = [], isLoading: balancesLoading } = useBalances(balanceFilter);
  const { data: ledger = [], isLoading: ledgerLoading } = useLedger(ledgerFilter);
  const { data: years = [] } = useBalanceYears();

  const pagedBalances = usePagedRows(balances);
  const pagedLedger = usePagedRows(ledger);

  /** Berapa entri ledger yang menyusun satu baris saldo. */
  const entriesBehind = (row: LeaveBalance) =>
    ledger.filter(
      (entry) =>
        entry.employeeId === row.employeeId &&
        entry.leaveTypeId === row.leaveTypeId &&
        entry.periodYear === row.periodYear,
    ).length;

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Time Off Balance' }]}
        title="Time Off Balance"
        description="Saldo tidak pernah tersimpan sebagai angka yang diketik seseorang — ia jumlah setiap mutasi di ledger bawah. Grid-nya read-only dua arah; satu-satunya jalur bertangan manusia adalah HR adjustment, dan itu pun create-only."
        actions={<Button onClick={() => setAdjusting(true)}>New HR adjustment</Button>}
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'balances', label: 'Balances', count: balances.length },
              { value: 'ledger', label: 'Mutation ledger', count: ledger.length },
            ]}
          />

          {tab === 'balances' && (
            <Card>
              <CardHead title="Balances" sub="Dijumlahkan dari ledger, bukan disimpan" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Select
                        value={balEmployee}
                        onValueChange={(value) => {
                          setBalEmployee(value);
                          pagedBalances.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All employees</SelectItem>
                          {EMPLOYEES.map((row) => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={balType}
                        onValueChange={(value) => {
                          setBalType(value);
                          pagedBalances.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[190px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All leave types</SelectItem>
                          {LEAVE_TYPES.map((row) => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={balYear}
                        onValueChange={(value) => {
                          setBalYear(value);
                          pagedBalances.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All years</SelectItem>
                          {years.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  }
                />

                <DataTable<LeaveBalance>
                  rows={pagedBalances.rows}
                  rowKey={(row) => `${row.employeeId}-${row.leaveTypeId}-${row.periodYear}`}
                  loading={balancesLoading}
                  empty="Tidak ada baris saldo yang cocok dengan filter ini."
                  columns={[
                    {
                      key: 'employee',
                      header: 'Employee',
                      render: (row) => (
                        <CellIdentity
                          name={employeeName(row.employeeId)}
                          leading={<Avatar name={employeeName(row.employeeId)} size="sm" />}
                        />
                      ),
                    },
                    {
                      key: 'type',
                      header: 'Leave type',
                      render: (row) => leaveTypeOf(row.leaveTypeId)?.name ?? row.leaveTypeId,
                    },
                    { key: 'year', header: 'Year', muted: true, render: (row) => row.periodYear },
                    {
                      key: 'balance',
                      header: 'Running balance',
                      align: 'right',
                      render: (row) => <DayNumber value={row.balanceDays} />,
                    },
                    {
                      key: 'projection',
                      header: 'Year-end projection',
                      align: 'right',
                      render: (row) => <DayNumber value={row.projectedDays} />,
                    },
                  ]}
                  actions={(row) => <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>}
                />

                <Pagination
                  page={pagedBalances.page}
                  pageSize={pagedBalances.pageSize}
                  total={pagedBalances.total}
                  noun="balances"
                  onPageChange={pagedBalances.setPage}
                  onPageSizeChange={pagedBalances.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'ledger' && (
            <Card>
              <CardHead title="Mutation ledger" sub="Append-only — tidak ada ubah atau hapus" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Select
                        value={ledEmployee}
                        onValueChange={(value) => {
                          setLedEmployee(value);
                          pagedLedger.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All employees</SelectItem>
                          {EMPLOYEES.map((row) => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={ledSource}
                        onValueChange={(value) => {
                          setLedSource(value);
                          pagedLedger.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[220px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All mutation sources</SelectItem>
                          {(Object.keys(MUTATION_SOURCE_LABEL) as MutationSource[]).map((source) => (
                            <SelectItem key={source} value={source}>
                              {MUTATION_SOURCE_LABEL[source]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={ledType}
                        onValueChange={(value) => {
                          setLedType(value);
                          pagedLedger.resetPage();
                        }}
                      >
                        <SelectTrigger className="h-10 w-[190px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All leave types</SelectItem>
                          {LEAVE_TYPES.map((row) => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  }
                />

                <DataTable<LedgerEntry>
                  rows={pagedLedger.rows}
                  rowKey={(row) => row.id}
                  loading={ledgerLoading}
                  empty="Tidak ada entri ledger yang cocok dengan filter ini."
                  columns={[
                    {
                      key: 'date',
                      header: 'Mutation date',
                      strong: true,
                      nowrap: true,
                      render: (row) => formatDate(row.mutationDate),
                    },
                    { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                    {
                      key: 'type',
                      header: 'Leave type',
                      muted: true,
                      render: (row) => leaveTypeOf(row.leaveTypeId)?.name ?? row.leaveTypeId,
                    },
                    {
                      key: 'source',
                      header: 'Source',
                      render: (row) => (
                        <StatusBadge tone={row.source === 'HR_ADJUSTMENT' ? 'warn' : 'info'}>
                          {MUTATION_SOURCE_LABEL[row.source]}
                        </StatusBadge>
                      ),
                    },
                    {
                      key: 'delta',
                      header: 'Delta (days)',
                      align: 'right',
                      render: (row) => <DayNumber value={row.deltaDays} signed />,
                    },
                    {
                      key: 'reason',
                      header: 'Reason',
                      muted: true,
                      render: (row) => row.reason || 'Accrual otomatis — tanpa alasan',
                    },
                  ]}
                />

                <Pagination
                  page={pagedLedger.page}
                  pageSize={pagedLedger.pageSize}
                  total={pagedLedger.total}
                  noun="entries"
                  onPageChange={pagedLedger.setPage}
                  onPageSizeChange={pagedLedger.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <AdjustmentModal open={adjusting} session={VIEWERS[0]} onClose={() => setAdjusting(false)} />

      <Modal
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        title="Leave balance detail"
        description="Read-only — layar ini tidak mengubah apa pun."
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <KeyValueList>
              <KeyValueRow label="Karyawan">{employeeName(detail.employeeId)}</KeyValueRow>
              <KeyValueRow label="Jenis cuti">{leaveTypeOf(detail.leaveTypeId)?.name}</KeyValueRow>
              <KeyValueRow label="Tahun hak">{detail.periodYear}</KeyValueRow>
              <KeyValueRow label="Saldo berjalan">
                <DayNumber value={detail.balanceDays} /> hari
              </KeyValueRow>
              <KeyValueRow label="Proyeksi akhir tahun">
                <DayNumber value={detail.projectedDays} /> hari
              </KeyValueRow>
              <KeyValueRow label="Entri ledger di belakangnya">{entriesBehind(detail)}</KeyValueRow>
            </KeyValueList>

            <Note icon={<Info />}>
              Proyeksi akhir tahun adalah saldo berjalan ditambah accrual yang masih akan jatuh tahun ini. Angka itu
              untuk perencanaan saja — <strong>tidak pernah</strong> dipakai sebagai gerbang saat pengajuan cuti baru
              masuk.
            </Note>
          </div>
        )}
      </Modal>
    </>
  );
}
