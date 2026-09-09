import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, StatCard } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { BatchStatusBadge, ImpactBar } from '@/features/mass-resignation/components/BatchBits';
import { CreateBatchModal } from '@/features/mass-resignation/components/CreateBatchModal';
import {
  ApproveBatchModal,
  HaltBatchModal,
  ProcessBatchModal,
  ResumeBatchModal,
} from '@/features/mass-resignation/components/BatchModals';
import { useBatches, useSubmitBatch } from '@/features/mass-resignation/hooks/useMassResignation';
import { REASON_OPTIONS, isTerminal, labelOf } from '@/features/mass-resignation/types';
import type { MassBatch } from '@/features/mass-resignation/types';
import { formatDate } from '@/lib/format';

/**
 * Mass Resignation — port `_prototype/mass-resignation.html`
 * (FSD §7 · UIC §6). Satu layar memuat MR-DASH plus lima overlay: MR-CREATE
 * (dengan dry-run), MR-APPROVE, MR-PROCESS, MR-HALT, dan MR-RESUME.
 */
export function MassResignationPage() {
  const { data, isLoading } = useBatches();
  const rows = useMemo(() => data ?? [], [data]);
  const submit = useSubmitBatch();

  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState<MassBatch | null>(null);
  const [processing, setProcessing] = useState<MassBatch | null>(null);
  const [halting, setHalting] = useState<MassBatch | null>(null);
  const [resuming, setResuming] = useState<MassBatch | null>(null);

  const paged = usePagedRows(rows);

  const active = rows.filter((row) => !isTerminal(row.status)).length;
  const processingNow = rows.filter((row) => row.status === 'PROCESSING').length;
  const halted = rows.filter((row) => row.status === 'HALTED').length;
  const impacted = rows.reduce((total, row) => total + row.total, 0);

  /** Aksi baris mengikuti status — satu aksi per status, jadi tombol inline. */
  const actionFor = (row: MassBatch) => {
    switch (row.status) {
      case 'DRAFT':
        return <RowButton onClick={() => submit.mutate({ id: row.id })}>Submit</RowButton>;
      case 'IN_APPROVAL':
        return <RowButton onClick={() => setApproving(row)}>Review</RowButton>;
      case 'APPROVED':
        return <RowButton onClick={() => setProcessing(row)}>Process</RowButton>;
      case 'PROCESSING':
        return <RowButton onClick={() => setHalting(row)}>Halt</RowButton>;
      case 'HALTED':
        return <RowButton onClick={() => setResuming(row)}>Resume</RowButton>;
      default:
        return <span className="font-body text-xs font-medium text-fg-4">Tidak ada aksi</span>;
    }
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Mass Resignation' }]}
        title="Mass Resignation"
        description="Offboarding massal dengan kendali blast-radius. Dry-run memperlihatkan dampaknya lebih dulu, persetujuan membekukan seleksi sebagai hash, dan circuit-breaker bisa menghentikan lalu melanjutkan pemrosesan di tengah jalan."
        actions={<Button onClick={() => setCreating(true)}>New batch</Button>}
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Active batches" value={active} footer={<Foot>Belum terminal</Foot>} />
            <StatCard label="Processing now" value={processingNow} footer={<Foot>Offboarding ter-throttle</Foot>} />
            <StatCard label="Halted" value={halted} footer={<Foot>Perlu resume atau cancel</Foot>} />
            <StatCard label="Impacted" value={impacted} footer={<Foot>Di seluruh batch</Foot>} />
          </div>

          <Card>
            <CardHead title="Batches" sub={`${rows.length} batch`} />

            <div className="flex flex-col">
              <DataTable<MassBatch>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty="Belum ada batch."
                columns={[
                  { key: 'id', header: 'Batch', strong: true, nowrap: true, render: (row) => row.id },
                  { key: 'reason', header: 'Reason', render: (row) => labelOf(REASON_OPTIONS, row.reason) },
                  {
                    key: 'leave',
                    header: 'Leave date',
                    muted: true,
                    nowrap: true,
                    render: (row) => formatDate(row.leaveDate),
                  },
                  { key: 'total', header: 'Selected', align: 'center', strong: true, render: (row) => row.total },
                  {
                    key: 'progress',
                    header: 'Progress',
                    render: (row) =>
                      row.status === 'DRAFT' || row.status === 'IN_APPROVAL' || row.status === 'APPROVED' ? (
                        <span className="font-body text-[13px] font-medium text-fg-3">—</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ImpactBar value={row.total ? (row.progress / row.total) * 100 : 0} className="w-20" />
                          <span className="font-body text-xs font-medium text-fg-3">
                            {row.progress}/{row.total}
                          </span>
                        </span>
                      ),
                  },
                  { key: 'status', header: 'Status', render: (row) => <BatchStatusBadge status={row.status} /> },
                  { key: 'maker', header: 'Maker', muted: true, render: (row) => row.maker },
                ]}
                actions={actionFor}
              />

              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="batches"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        </div>
      </PageShell>

      <CreateBatchModal open={creating} onClose={() => setCreating(false)} />
      <ApproveBatchModal batch={approving} onClose={() => setApproving(null)} />
      <ProcessBatchModal batch={processing} onClose={() => setProcessing(null)} />
      <HaltBatchModal batch={halting} onClose={() => setHalting(null)} />
      <ResumeBatchModal batch={resuming} onClose={() => setResuming(null)} />
    </>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11.5px] font-medium leading-[1.4] text-fg-3">{children}</span>;
}
