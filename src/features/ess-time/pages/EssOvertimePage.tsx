import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
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
  const overtime = useMyOvertime(actor);

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
    </PageShell>
  );
}
