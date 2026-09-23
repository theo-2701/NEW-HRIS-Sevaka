import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { AddButton, RowActions } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { OvertimeFormModal, OvertimeWithdrawModal } from '@/features/overtime/components/OvertimeModals';
import { useMyOvertime } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import type { OvertimeRequest, OvertimeStatus } from '@/features/overtime/types';
import { formatDate } from '@/lib/format';

const STATUS_LABEL: Record<OvertimeStatus, string> = {
  PENDING_APPROVAL: 'Menunggu persetujuan',
  AUTO_APPROVED: 'Disetujui otomatis',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
};

const TONE: Record<OvertimeStatus, 'ok' | 'warn' | 'err' | 'mute'> = {
  PENDING_APPROVAL: 'warn',
  AUTO_APPROVED: 'ok',
  APPROVED: 'ok',
  REJECTED: 'err',
  CANCELLED: 'mute',
};

const CATEGORY_LABEL = {
  WORKDAY: 'Hari kerja',
  WEEKLY_REST: 'Istirahat mingguan',
  PUBLIC_HOLIDAY: 'Libur nasional',
} as const;

/**
 * ESS › Time Management › Overtime — lembur milik sendiri.
 *
 * `submissionMode` dan `overtimeCategory` diturunkan server dari tanggal dan kalender, jadi
 * ditampilkan apa adanya sebagai keterangan — bukan pilihan pengaju. Jam yang disetujui bisa
 * berbeda dari yang diajukan; keduanya ditampilkan berdampingan supaya selisihnya terbaca.
 */
export function EssOvertimePage() {
  const [actor, setActor] = useState(ESS_VIEWERS[0]);
  /* Lembur adalah scope EMPLOYEE — tidak pernah diajukan atas nama orang lain. */
  const session = { employeeId: actor.employeeId, role: 'EMPLOYEE' as const };
  const overtime = useMyOvertime(actor);
  const [form, setForm] = useState(false);
  const [editing, setEditing] = useState<OvertimeRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState<OvertimeRequest | null>(null);

  const rows = useMemo(() => overtime.data ?? [], [overtime.data]);
  const paged = usePagedRows(rows);
  const approvedHours = rows.reduce((sum, row) => sum + (row.approvedHours ?? 0), 0);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self-Service' }, { label: 'Time Management' }, { label: 'Overtime' }]}
      title="Overtime"
      description="Pengajuan lembur Anda beserta jam yang disetujui approver."
      actions={<EssActorPicker actor={actor} onChange={setActor} />}
    >
      <Card>
        <CardHead title="Lembur saya" sub={`Total jam disetujui: ${approvedHours.toFixed(1)} jam`} />
        <div>
          <TableToolbar actions={<AddButton onClick={() => setForm(true)}>Ajukan lembur</AddButton>} />
          <DataTable<OvertimeRequest>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={overtime.isLoading}
            empty="Belum ada pengajuan lembur."
            columns={[
              { key: 'date', header: 'Tanggal', strong: true, nowrap: true, render: (row) => formatDate(row.overtimeDate) },
              {
                key: 'category',
                header: 'Kategori',
                render: (row) => CATEGORY_LABEL[row.overtimeCategory],
              },
              {
                key: 'mode',
                header: 'Cara ajukan',
                muted: true,
                render: (row) => (row.submissionMode === 'PRE' ? 'Sebelum lembur' : 'Setelah lembur'),
              },
              {
                key: 'requested',
                header: 'Diajukan',
                align: 'right',
                render: (row) =>
                  row.requestedHours === null ? (
                    <span className="text-fg-4">— (dari deteksi on-call)</span>
                  ) : (
                    <span className="tabular-nums">{row.requestedHours} jam</span>
                  ),
              },
              {
                key: 'approved',
                header: 'Disetujui',
                align: 'right',
                render: (row) =>
                  row.approvedHours === null ? (
                    <span className="text-fg-4">—</span>
                  ) : (
                    <span className="tabular-nums">{row.approvedHours} jam</span>
                  ),
              },
              {
                key: 'status',
                header: 'Status',
                render: (row) => (
                  <StatusBadge tone={TONE[row.overtimeStatus]}>{STATUS_LABEL[row.overtimeStatus]}</StatusBadge>
                ),
              },
              { key: 'reason', header: 'Alasan', muted: true, render: (row) => row.requestReason || '—' },
            ]}
            actions={(row) =>
              row.overtimeStatus === 'PENDING_APPROVAL' ? (
                <RowActions
                  actions={[
                    {
                      label: 'Ubah',
                      onSelect: () => {
                        setEditing(row);
                        setForm(true);
                      },
                    },
                    { label: 'Tarik pengajuan', danger: true, onSelect: () => setWithdrawing(row) },
                  ]}
                />
              ) : null
            }
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

      <OvertimeFormModal
        open={form}
        session={session}
        rows={rows}
        editing={editing}
        onClose={() => {
          setForm(false);
          setEditing(null);
        }}
      />
      <OvertimeWithdrawModal row={withdrawing} session={session} onClose={() => setWithdrawing(null)} />
    </PageShell>
  );
}
