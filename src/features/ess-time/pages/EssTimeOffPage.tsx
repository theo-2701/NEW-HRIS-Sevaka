import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { AddButton, RowActions } from '@/components/RowActions';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { RequestFormModal } from '@/features/time-off/components/RequestFormModal';
import { WithdrawModal } from '@/features/time-off/components/RequestModals';
import { TableToolbar } from '@/components/TableToolbar';
import { essReadSession } from '@/features/ess-time/types';
import { useMyBalances, useMyLeaveRequests } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import { leaveTypeOf } from '@/features/time-off/mock-data';
import { REQUEST_STATUS_LABEL, SESSION_LABEL } from '@/features/time-off/types';
import type { LeaveBalance, LeaveRequest, RequestStatus } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';

type Tab = 'requests' | 'balance';

const TONE: Record<RequestStatus, 'ok' | 'warn' | 'err' | 'info' | 'mute'> = {
  PENDING_APPROVAL: 'warn',
  AUTO_APPROVED: 'ok',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

/**
 * ESS › Time Management › Time Off — pengajuan cuti/sakit milik sendiri (UIC-TIME §3.1).
 *
 * Kriteria layar ini nol memuat pemilih karyawan: service dipanggil dengan peran
 * `ROLE_EMPLOYEE` saja sehingga hanya baris pemanggil yang kembali. Pengajuan dan saldo
 * dipisah dua tab supaya satu layar hanya menampilkan satu tabel.
 */
export function EssTimeOffPage() {
  const [tab, setTab] = useState<Tab>('requests');
  const [actor, setActor] = useState(ESS_VIEWERS[0]);
  const session = essReadSession(actor);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState<LeaveRequest | null>(null);
  const requests = useMyLeaveRequests(actor);
  const balances = useMyBalances(actor);

  const rows = useMemo(() => requests.data ?? [], [requests.data]);
  const paged = usePagedRows(rows);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self-Service' }, { label: 'Time Management' }, { label: 'Time Off' }]}
      title="Time Off"
      description="Pengajuan cuti dan sakit Anda beserta sisa saldo per jenis cuti."
      actions={<EssActorPicker actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'requests', label: 'Pengajuan saya', count: rows.length },
            { value: 'balance', label: 'Saldo cuti', count: balances.data?.length ?? 0 },
          ]}
        />

        {tab === 'balance' && (
          <Card>
            <CardHead title="Saldo cuti" sub="Proyeksi memperhitungkan akrual yang belum jatuh, jadi bisa lebih besar dari saldo" />
            <DataTable<LeaveBalance>
              rows={balances.data ?? []}
              rowKey={(row) => `${row.leaveTypeId}-${row.periodYear}`}
              loading={balances.isLoading}
              empty="Belum ada saldo cuti pada periode ini."
              columns={[
                {
                  key: 'type',
                  header: 'Jenis cuti',
                  strong: true,
                  render: (row) => leaveTypeOf(row.leaveTypeId)?.name ?? row.leaveTypeId,
                },
                { key: 'year', header: 'Periode', muted: true, render: (row) => row.periodYear },
                {
                  key: 'balance',
                  header: 'Saldo',
                  align: 'right',
                  render: (row) => (
                    <span className={row.balanceDays < 0 ? 'tabular-nums text-error-600' : 'tabular-nums'}>
                      {row.balanceDays} hari
                    </span>
                  ),
                },
                {
                  key: 'projected',
                  header: 'Proyeksi',
                  align: 'right',
                  muted: true,
                  render: (row) => <span className="tabular-nums">{row.projectedDays} hari</span>,
                },
              ]}
            />
          </Card>
        )}

        {tab === 'requests' && (
          <Card>
            <CardHead title="Pengajuan saya" sub="Seluruh pengajuan cuti dan sakit yang Anda buat" />
            <div>
              <TableToolbar actions={<AddButton onClick={() => setForm(true)}>Ajukan cuti</AddButton>} />
              <DataTable<LeaveRequest>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={requests.isLoading}
                empty="Belum ada pengajuan."
                columns={[
                  {
                    key: 'type',
                    header: 'Jenis',
                    strong: true,
                    render: (row) => leaveTypeOf(row.leaveTypeId)?.name ?? row.leaveTypeId,
                  },
                  {
                    key: 'range',
                    header: 'Tanggal',
                    nowrap: true,
                    render: (row) =>
                      row.startDate === row.endDate
                        ? formatDate(row.startDate)
                        : `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
                  },
                  { key: 'session', header: 'Sesi', muted: true, render: (row) => SESSION_LABEL[row.daySession] },
                  {
                    key: 'days',
                    header: 'Jumlah',
                    align: 'right',
                    render: (row) => <span className="tabular-nums">{row.totalDays} hari</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => <StatusBadge tone={TONE[row.status]}>{REQUEST_STATUS_LABEL[row.status]}</StatusBadge>,
                  },
                  { key: 'reason', header: 'Alasan', muted: true, render: (row) => row.reason || '—' },
                ]}
                actions={(row) => {
                  const actions = [];
                  if (row.status === 'PENDING_APPROVAL') {
                    actions.push({
                      label: 'Ubah',
                      onSelect: () => {
                        setEditing(row);
                        setForm(true);
                      },
                    });
                  }
                  if (row.status === 'PENDING_APPROVAL' || row.status === 'APPROVED' || row.status === 'AUTO_APPROVED') {
                    actions.push({ label: 'Tarik pengajuan', danger: true, onSelect: () => setWithdrawing(row) });
                  }
                  return actions.length ? <RowActions actions={actions} /> : null;
                }}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="requests"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        )}
      </div>

      <RequestFormModal
        open={form}
        session={session}
        editing={editing}
        onClose={() => {
          setForm(false);
          setEditing(null);
        }}
      />
      <WithdrawModal request={withdrawing} session={session} onClose={() => setWithdrawing(null)} />
    </PageShell>
  );
}
