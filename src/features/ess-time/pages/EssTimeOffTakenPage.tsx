import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { useMyLeaveRequests, useMyLedger } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import { leaveTypeOf } from '@/features/time-off/mock-data';
import { MUTATION_SOURCE_LABEL } from '@/features/time-off/types';
import type { LedgerEntry } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';

/**
 * ESS › Time Management › Time Off › Time Off Taken — cuti yang sudah terpakai.
 *
 * Dua sisi dari peristiwa yang sama: daftar cuti yang benar-benar disetujui, dan riwayat mutasi
 * saldo milik sendiri — padanan `POST /leave-balance-ledgers/me-search` (UIC-TIME §4.1.3).
 * Kriterianya sengaja nol memuat `employeeId`: alamat me-search memang hanya menjawab baris
 * pemanggil, jadi layar ini tidak menawarkan pemilih karyawan sama sekali.
 */
type Tab = 'taken' | 'ledger';

export function EssTimeOffTakenPage() {
  const [tab, setTab] = useState<Tab>('taken');
  const [actor, setActor] = useState(ESS_VIEWERS[0]);
  const ledger = useMyLedger(actor);
  const requests = useMyLeaveRequests(actor);

  const taken = useMemo(
    () => (requests.data ?? []).filter((row) => row.status === 'APPROVED' || row.status === 'AUTO_APPROVED'),
    [requests.data],
  );
  const rows = useMemo(() => ledger.data ?? [], [ledger.data]);
  const paged = usePagedRows(rows);
  const usedDays = taken.reduce((sum, row) => sum + row.totalDays, 0);

  return (
    <PageShell
      crumbs={[
        { label: 'Employee Self-Service' },
        { label: 'Time Management' },
        { label: 'Time Off' },
        { label: 'Time Off Taken' },
      ]}
      title="Time Off Taken"
      description="Leave you have used and the history of your balance mutations."
      actions={<EssActorPicker actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'taken', label: 'Leave taken', count: taken.length },
            { value: 'ledger', label: 'Balance history', count: rows.length },
          ]}
        />

        {tab === 'taken' && (
          <Card>
            <CardHead
              title="Leave taken"
              sub={`${taken.length} approved requests · ${usedDays} days in total`}
            />
            <DataTable
              rows={taken}
              rowKey={(row) => row.id}
              loading={requests.isLoading}
              empty="No approved leave yet."
              columns={[
                {
                  key: 'type',
                  header: 'Type',
                  strong: true,
                  render: (row) => leaveTypeOf(row.leaveTypeId)?.name ?? row.leaveTypeId,
                },
                {
                  key: 'range',
                  header: 'Date',
                  nowrap: true,
                  render: (row) =>
                    row.startDate === row.endDate
                      ? formatDate(row.startDate)
                      : `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
                },
                {
                  key: 'days',
                  header: 'Jumlah',
                  align: 'right',
                  render: (row) => <span className="tabular-nums">{row.totalDays} days</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (row) => (
                    <StatusBadge tone="ok">{row.status === 'AUTO_APPROVED' ? 'Auto-approved' : 'Approved'}</StatusBadge>
                  ),
                },
              ]}
            />
          </Card>
        )}

        {tab === 'ledger' && (
          <Card>
            <CardHead
              title="Balance mutation history"
              sub="Each row is one event; old rows are never changed, corrections are always written as new rows"
            />
            <div>
              <DataTable<LedgerEntry>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={ledger.isLoading}
                empty="No balance mutation yet."
                columns={[
                  { key: 'date', header: 'Mutation date', strong: true, nowrap: true, render: (row) => formatDate(row.mutationDate) },
                  {
                    key: 'type',
                    header: 'Leave type',
                    render: (row) => leaveTypeOf(row.leaveTypeId)?.name ?? row.leaveTypeId,
                  },
                  {
                    key: 'delta',
                    header: 'Change',
                    align: 'right',
                    render: (row) => (
                      <span className={row.deltaDays < 0 ? 'tabular-nums text-error-600' : 'tabular-nums text-success-800'}>
                        {row.deltaDays > 0 ? '+' : ''}
                        {row.deltaDays} days
                      </span>
                    ),
                  },
                  { key: 'source', header: 'Sumber', render: (row) => MUTATION_SOURCE_LABEL[row.source] },
                  { key: 'reason', header: 'Reason', muted: true, render: (row) => row.reason || '—' },
                ]}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="mutations"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
