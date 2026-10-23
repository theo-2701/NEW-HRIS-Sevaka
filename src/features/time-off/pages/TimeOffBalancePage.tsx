import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Modal } from '@/components/Modal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { KeyValueList, KeyValueRow, Note } from '@/features/time-off/components/TimeOffBits';
import { AdjustmentModal } from '@/features/time-off/components/AdjustmentModal';
import { BalanceFilterFields, LedgerFilterFields } from '@/features/time-off/components/BalanceFilters';
import {
  EMPTY_BALANCE_FILTER,
  EMPTY_LEDGER_FILTER,
  countActive,
  summarizeFilter,
  type BalanceFilterState,
  type LedgerFilterState,
} from '@/features/time-off/balanceFilters';
import { useBalanceYears, useBalances, useLedger } from '@/features/time-off/hooks/useBalance';
import { VIEWERS, employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
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
 *
 * Kedua grid punya ≥ 3 filter, jadi filternya masuk modal (standar toolbar).
 */
export function TimeOffBalancePage() {
  const [tab, setTab] = useState<Tab>('balances');
  const [adjusting, setAdjusting] = useState(false);
  const [detail, setDetail] = useState<LeaveBalance | null>(null);

  const [balanceFilterOpen, setBalanceFilterOpen] = useState(false);
  const [ledgerFilterOpen, setLedgerFilterOpen] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilterState>(EMPTY_BALANCE_FILTER);
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilterState>(EMPTY_LEDGER_FILTER);

  const balanceQuery = useMemo(
    () => ({
      employeeId: balanceFilter.employeeId === 'ALL' ? undefined : balanceFilter.employeeId,
      leaveTypeId: balanceFilter.leaveTypeId === 'ALL' ? undefined : balanceFilter.leaveTypeId,
      periodYear: balanceFilter.periodYear === 'ALL' ? undefined : Number(balanceFilter.periodYear),
    }),
    [balanceFilter],
  );

  const ledgerQuery = useMemo(
    () => ({
      employeeId: ledgerFilter.employeeId === 'ALL' ? undefined : ledgerFilter.employeeId,
      leaveTypeId: ledgerFilter.leaveTypeId === 'ALL' ? undefined : ledgerFilter.leaveTypeId,
      periodYear: ledgerFilter.periodYear === 'ALL' ? undefined : Number(ledgerFilter.periodYear),
      source: ledgerFilter.source === 'ALL' ? undefined : (ledgerFilter.source as MutationSource),
    }),
    [ledgerFilter],
  );

  const { data: balances = [], isLoading: balancesLoading } = useBalances(balanceQuery);
  const { data: ledger = [], isLoading: ledgerLoading } = useLedger(ledgerQuery);
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

  const filterButton = (active: number, onClick: () => void) => (
    <Button variant="secondary" onClick={onClick}>
      {active > 0 ? `Filter (${active})` : 'Filter'}
    </Button>
  );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Time Off Balance' }]}
        title="Time Off Balance"
        description="A balance is never stored as a number someone typed — it is the sum of every mutation in the ledger below. The grid is read-only both ways; the only human path is HR adjustment, and even that is create-only."
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
              <CardHead title="Balances" sub="Summed from the ledger, not stored" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={filterButton(countActive(balanceFilter), () => setBalanceFilterOpen(true))}
                  summary={summarizeFilter(balanceFilter)}
                />

                <DataTable<LeaveBalance>
                  rows={pagedBalances.rows}
                  rowKey={(row) => `${row.employeeId}-${row.leaveTypeId}-${row.periodYear}`}
                  loading={balancesLoading}
                  empty="No balance row matches this filter."
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
              <CardHead title="Mutation ledger" sub="Append-only — no edit or delete" />

              <div className="flex flex-col">
                <TableToolbar
                  filters={filterButton(countActive(ledgerFilter), () => setLedgerFilterOpen(true))}
                  summary={summarizeFilter(ledgerFilter)}
                />

                <DataTable<LedgerEntry>
                  rows={pagedLedger.rows}
                  rowKey={(row) => row.id}
                  loading={ledgerLoading}
                  empty="No ledger entry matches this filter."
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
                      render: (row) => row.reason || 'Automatic accrual — no reason',
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

      <FilterModal
        open={balanceFilterOpen}
        title="Filter balances"
        description="Narrow the list with the criteria below."
        onOpenChange={setBalanceFilterOpen}
        onReset={() => {
          setBalanceFilter(EMPTY_BALANCE_FILTER);
          pagedBalances.resetPage();
        }}
      >
        <BalanceFilterFields
          value={balanceFilter}
          years={years}
          onChange={(next) => {
            setBalanceFilter(next);
            pagedBalances.resetPage();
          }}
        />
      </FilterModal>

      <FilterModal
        open={ledgerFilterOpen}
        title="Filter ledger"
        description="Narrow the list with the criteria below."
        onOpenChange={setLedgerFilterOpen}
        onReset={() => {
          setLedgerFilter(EMPTY_LEDGER_FILTER);
          pagedLedger.resetPage();
        }}
      >
        <LedgerFilterFields
          value={ledgerFilter}
          years={years}
          onChange={(next) => {
            setLedgerFilter(next);
            pagedLedger.resetPage();
          }}
        />
      </FilterModal>

      <AdjustmentModal open={adjusting} session={VIEWERS[0]} onClose={() => setAdjusting(false)} />

      <Modal
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        title="Leave balance detail"
        description="Read-only — this screen doesn't change anything."
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Close
          </Button>
        }
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <KeyValueList>
              <KeyValueRow label="Employee">{employeeName(detail.employeeId)}</KeyValueRow>
              <KeyValueRow label="Leave type">{leaveTypeOf(detail.leaveTypeId)?.name}</KeyValueRow>
              <KeyValueRow label="Entitlement year">{detail.periodYear}</KeyValueRow>
              <KeyValueRow label="Running balance">
                <DayNumber value={detail.balanceDays} /> days
              </KeyValueRow>
              <KeyValueRow label="Year-end projection">
                <DayNumber value={detail.projectedDays} /> days
              </KeyValueRow>
              <KeyValueRow label="Ledger entries behind it">{entriesBehind(detail)}</KeyValueRow>
            </KeyValueList>

            <Note icon={<Info />}>
              The year-end projection is the running balance plus accrual still due this year. It is for planning only — <strong>never</strong> used as a gate when a new leave request comes in.
            </Note>
          </div>
        )}
      </Modal>
    </>
  );
}
