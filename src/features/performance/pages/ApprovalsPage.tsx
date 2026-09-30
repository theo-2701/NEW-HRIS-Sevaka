import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { RowButton } from '@/components/RowActions';
import { TabMenu } from '@/components/TabMenu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DecideModal, RoundsTable } from '@/features/performance/components/ApprovalModals';
import { NoAccess, PerfActorPicker } from '@/features/performance/components/PerfBits';
import { cycleRound, formatDistribution } from '@/features/performance/format';
import { useApprovalRounds, usePendingApprovals } from '@/features/performance/hooks/useApprovals';
import { useSheets } from '@/features/performance/hooks/useSheets';
import { canScopeAllSheets, canSeeApprovalQueue } from '@/features/performance/rules';
import { usePerfActor } from '@/features/performance/store/perfActor.store';
import type { PendingApproval, PerfActor } from '@/features/performance/types';
import { formatDateTime } from '@/lib/format';

type Tab = 'queue' | 'history';

/** F1 — antrean milik-diri; identitas dari token, nol pencarian karyawan (kontrak). */
function ApprovalQueue({ actor }: { actor: PerfActor }) {
  const [dir, setDir] = useState<'ASC' | 'DESC'>('ASC');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [deciding, setDeciding] = useState<PendingApproval | null>(null);
  /* Putaran yang keputusannya sudah diteruskan (202) tapi alur kerjanya belum selesai. */
  const [forwarded, setForwarded] = useState<string[]>([]);
  const { data, isLoading } = usePendingApprovals(actor, { page, size, sortDirection: dir }, true);

  return (
    <Card>
      <CardHead title="Antrean persetujuan" sub="Lembar yang menunggu keputusan Anda — terlama diajukan di atas" />
      <div className="flex flex-col">
        <DataTable<PendingApproval>
          rows={data?.rows ?? []}
          rowKey={(row) => row.approvalRoundId}
          loading={isLoading}
          empty="Tidak ada lembar yang menunggu keputusan Anda."
          sort={{ by: 'created_at', dir }}
          onSortChange={() => setDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'))}
          columns={[
            { key: 'employee', header: 'Karyawan dinilai', strong: true, render: (row) => row.employee.name },
            { key: 'round', header: 'Siklus · Putaran', nowrap: true, render: (row) => cycleRound(row.cycleNo, row.roundNo) },
            {
              key: 'distribution',
              header: 'Sebaran nilai penilai',
              render: (row) => formatDistribution(row.assessorScoreDistribution),
            },
            {
              key: 'submitted',
              header: 'Diajukan',
              sortKey: 'created_at',
              nowrap: true,
              render: (row) => formatDateTime(row.submittedAt),
            },
          ]}
          actions={(row) =>
            forwarded.includes(row.approvalRoundId) ? (
              <RowButton disabled>Diteruskan</RowButton>
            ) : (
              <RowButton onClick={() => setDeciding(row)}>Putuskan</RowButton>
            )
          }
        />
        <Pagination
          page={page}
          pageSize={size}
          total={data?.totalData ?? 0}
          noun="sheets"
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setSize(next);
            setPage(1);
          }}
        />
      </div>
      <DecideModal
        item={deciding}
        onClose={() => setDeciding(null)}
        onForwarded={(roundId) => setForwarded((prev) => [...prev, roundId])}
      />
    </Card>
  );
}

/**
 * F4–F6 — riwayat per lembar. Pilihan lembar dari antrean lembar (`P3.02`: HR `ALL`, atasan
 * `ASSESSOR`) ditambah lembar yang sedang menunggu keputusan pemanggil.
 */
function RoundHistory({ actor }: { actor: PerfActor }) {
  const [sheetId, setSheetId] = useState('');
  const sheets = useSheets(
    actor,
    { dataScope: canScopeAllSheets(actor.role) ? 'ALL' : 'ASSESSOR', page: 1, size: 100 },
    true,
  );
  const pending = usePendingApprovals(actor, { page: 1, size: 100, sortDirection: 'ASC' }, true);
  const options = new Map<string, string>();
  for (const row of sheets.data?.rows ?? []) options.set(row.id, row.employeeNameDisplay);
  for (const row of pending.data?.rows ?? []) options.set(row.reviewSheetId, row.employee.name);
  const rounds = useApprovalRounds(actor, sheetId || undefined, Boolean(sheetId));

  return (
    <Card>
      <CardHead title="Riwayat putaran" sub="Seluruh putaran persetujuan satu lembar, urut waktu pengajuan" />
      <div className="flex w-[300px] flex-col gap-1">
        <Label htmlFor="round-sheet">Lembar</Label>
        <Select value={sheetId} onValueChange={setSheetId}>
          <SelectTrigger id="round-sheet">
            <SelectValue placeholder="Pilih lembar karyawan" />
          </SelectTrigger>
          <SelectContent>
            {[...options.entries()].map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {sheetId ? (
        <RoundsTable rows={rounds.data ?? []} loading={rounds.isLoading} />
      ) : (
        <EmptyState title="Pilih lembar" description="Riwayat putaran tampil setelah satu lembar dipilih." />
      )}
    </Card>
  );
}

/**
 * Performance › Score Approvals (FSD-001-PERFORMANCE §4 · UIC §5). Tombol Ajukan ada di Review Sheets;
 * halaman ini untuk penyetuju. HR Staff dan karyawan hanya berhak riwayat putaran, yang dibuka dari
 * detail lembar.
 */
export function ApprovalsPage() {
  const { actor } = usePerfActor();
  const [tab, setTab] = useState<Tab>('queue');
  const allowed = canSeeApprovalQueue(actor.role);

  return (
    <PageShell
      crumbs={[{ label: 'Performance Management' }, { label: 'Score Approvals' }]}
      title="Score Approvals"
      description="Setujui, kembalikan, atau tolak final lembar yang sudah diajukan penilai. Jatah pengembalian dibatasi per siklus."
      actions={<PerfActorPicker onChange={() => setTab('queue')} />}
    >
      {!allowed ? (
        <NoAccess description="Antrean persetujuan hanya untuk atasan dan HR Manager. Riwayat putaran sebuah lembar dibuka dari detail lembarnya." />
      ) : (
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'queue', label: 'Antrean persetujuan' },
              { value: 'history', label: 'Riwayat putaran' },
            ]}
          />
          {tab === 'queue' ? (
            <ApprovalQueue key={actor.employeeId} actor={actor} />
          ) : (
            <RoundHistory key={actor.employeeId} actor={actor} />
          )}
        </div>
      )}
    </PageShell>
  );
}
