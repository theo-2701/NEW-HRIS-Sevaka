import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { useMyBalances, useMyLeaveRequests } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import { leaveTypeOf } from '@/features/time-off/mock-data';
import { REQUEST_STATUS_LABEL, SESSION_LABEL } from '@/features/time-off/types';
import type { LeaveBalance, LeaveRequest, RequestStatus } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';

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
 * `ROLE_EMPLOYEE` saja sehingga hanya baris pemanggil yang kembali. Saldo ditampilkan
 * berdampingan supaya pengaju tahu sisa haknya sebelum mengajukan.
 */
export function EssTimeOffPage() {
  const [actor, setActor] = useState(ESS_VIEWERS[0]);
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

        <Card>
          <CardHead title="Pengajuan saya" sub="Seluruh pengajuan cuti dan sakit yang Anda buat" />
          <div>
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
      </div>
    </PageShell>
  );
}
