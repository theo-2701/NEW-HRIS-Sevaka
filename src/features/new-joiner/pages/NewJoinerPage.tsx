import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, StatCard } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import type { RowAction as RowActionItem } from '@/components/RowActions';
import { useAuthStore } from '@/store/auth.store';
import { useRequisitions } from '@/features/manpower/hooks/useManpower';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePagedRows } from '@/hooks/usePagedRows';
import { CandidateStatusBadge, StatusTabs, type StatusTab } from '@/features/new-joiner/components/CandidateBits';
import { CandidateFormModal } from '@/features/new-joiner/components/CandidateFormModal';
import { ReviewCandidateModal } from '@/features/new-joiner/components/ReviewCandidateModal';
import { MaterializeModal } from '@/features/new-joiner/components/MaterializeModal';
import {
  useCancelCandidate,
  useCandidates,
  useDeleteCandidate,
  useSubmitCandidate,
} from '@/features/new-joiner/hooks/useNewJoiner';
import { rivalsOf } from '@/features/new-joiner/services/new-joiner.service';
import {
  NATIONALITY_LABEL,
  POSITION_OPTIONS,
  STATUS_LABEL,
  STATUS_ORDER,
  isNjChecker,
  isNjMaker,
  labelOf,
} from '@/features/new-joiner/types';
import type { Candidate, CandidateStatus } from '@/features/new-joiner/types';
import { formatDate } from '@/lib/format';

type Filter = CandidateStatus | 'ALL';

/** Kandidat yang kursinya kedaluwarsa dalam 7 hari ke depan. */
function expiringSoon(rows: Candidate[]): number {
  const limit = new Date();
  limit.setDate(limit.getDate() + 7);
  const limitIso = limit.toISOString().slice(0, 10);
  return rows.filter((row) => row.status === 'APPROVED' && row.seatExpiry && row.seatExpiry <= limitIso).length;
}

/**
 * New Joiner Submission — port `_prototype/new-joiner.html`
 * (FSD §4 · UIC §4). Satu layar memuat NJ-LIST + tiga overlay: NJ-CREATE,
 * NJ-APPROVE, dan NJ-MATERIALIZE.
 */
export function NewJoinerPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useCandidates();
  const rows = useMemo(() => data ?? [], [data]);

  const [filter, setFilter] = useState<Filter>('ALL');
  const [creating, setCreating] = useState(false);
  const [reviewing, setReviewing] = useState<Candidate | null>(null);
  const [materializing, setMaterializing] = useState<Candidate | null>(null);
  const [cancelling, setCancelling] = useState<Candidate | null>(null);
  const [deleting, setDeleting] = useState<Candidate | null>(null);
  const [editing, setEditing] = useState<Candidate | null>(null);
  const role = useAuthStore((s) => s.user?.role);
  const maker = isNjMaker(role);
  const checker = isNjChecker(role);
  const { data: requisitions = [] } = useRequisitions();

  const submit = useSubmitCandidate();
  const cancel = useCancelCandidate();
  const remove = useDeleteCandidate();

  const tabs: StatusTab[] = useMemo(() => {
    const counted: StatusTab[] = STATUS_ORDER.map((status) => ({
      value: status,
      label: STATUS_LABEL[status],
      count: rows.filter((row) => row.status === status).length,
    })).filter((tab) => tab.count > 0);
    return [{ value: 'ALL', label: 'All', count: rows.length }, ...counted];
  }, [rows]);

  const filtered = useMemo(() => {
    const list = filter === 'ALL' ? rows : rows.filter((row) => row.status === filter);
    return [...list].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
  }, [rows, filter]);

  const paged = usePagedRows(filtered);

  const inPipeline = rows.filter((row) => row.status === 'SUBMITTED' || row.status === 'IN_APPROVAL').length;
  const approved = rows.filter((row) => row.status === 'APPROVED').length;
  const materialized = rows.filter((row) => row.status === 'MATERIALIZED').length;

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'New Joiner' }]}
        title="New Joiner"
        description="Ajukan kandidat atas sebuah posisi, setujui lewat checker, lalu materialisasi menjadi karyawan begitu kontrak ditandatangani. Persetujuan menahan kursi sampai masa berlakunya habis."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link to="/employees/new-joiner/add">Add employee manually</Link>
            </Button>
            {maker && <Button onClick={() => setCreating(true)}>Add candidate</Button>}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="In pipeline" value={inPipeline} footer={<CardFoot>Diajukan &amp; dalam persetujuan</CardFoot>} />
            <StatCard label="Approved · awaiting sign" value={approved} footer={<CardFoot>Kursi ditahan sampai kedaluwarsa</CardFoot>} />
            <StatCard label="Materialised" value={materialized} footer={<CardFoot>Kini karyawan berstatus WAITING</CardFoot>} />
            <StatCard label="Expiring in 7d" value={expiringSoon(rows)} footer={<CardFoot>Tandatangani kontrak untuk menahan kursi</CardFoot>} />
          </div>

          <Card>
            <header className="flex flex-wrap items-center gap-3 border-b border-border-1 pb-3">
              <h2 className="m-0 font-body text-sm font-bold text-fg-1">Candidates</h2>
              <div className="ml-auto">
                <StatusTabs tabs={tabs} value={filter} onChange={(next) => { setFilter(next); paged.resetPage(); }} />
              </div>
            </header>

            <div className="flex flex-col pt-4">
              <DataTable<Candidate>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty="Tidak ada kandidat pada status ini."
                columns={[
                  {
                    key: 'candidate',
                    header: 'Candidate',
                    render: (row) => (
                      <CellIdentity name={row.name} sub={row.email} leading={<Avatar name={row.name} size="sm" />} />
                    ),
                  },
                  {
                    key: 'position',
                    header: 'Position',
                    muted: true,
                    render: (row) => labelOf(POSITION_OPTIONS, row.positionId),
                  },
                  {
                    key: 'requisition',
                    header: 'Requisition',
                    render: (row) => {
                      const req = requisitions.find((item) => item.id === row.requisitionId);
                      return <CellIdentity name={req?.title ?? row.requisitionId} sub={req?.maker} />;
                    },
                  },
                  {
                    key: 'nationality',
                    header: 'Nationality',
                    render: (row) => NATIONALITY_LABEL[row.nationality],
                  },
                  {
                    key: 'join',
                    header: 'Intended join',
                    muted: true,
                    nowrap: true,
                    render: (row) => formatDate(row.intendedJoinDate),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <div className="flex flex-col gap-1">
                        <CandidateStatusBadge status={row.status} />
                        {row.status === 'APPROVED' && row.seatExpiry && (
                          <span className="font-body text-[11.5px] font-semibold text-warning-800">
                            Kursi ditahan sampai {formatDate(row.seatExpiry)}
                          </span>
                        )}
                      </div>
                    ),
                  },
                  { key: 'maker', header: 'Maker', muted: true, render: (row) => row.maker },
                ]}
                actions={(row) => <RowAction row={row} />}
              />

              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="candidates"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        </div>
      </PageShell>

      <CandidateFormModal
        open={creating || Boolean(editing)}
        editing={editing}
        onClose={() => (setCreating(false), setEditing(null))}
        onEdit={(row) => (setCreating(false), setEditing(row))}
        onDelete={setDeleting}
      />

      <ReviewCandidateModal
        candidate={reviewing}
        rivals={reviewing ? rivalsOf(rows, reviewing).length : 0}
        canDecide={checker && (reviewing?.status === 'SUBMITTED' || reviewing?.status === 'IN_APPROVAL')}
        onClose={() => setReviewing(null)}
      />

      <MaterializeModal candidate={materializing} onClose={() => setMaterializing(null)} />

      <ConfirmDialog
        open={Boolean(cancelling)}
        title="Batalkan kandidat?"
        description={`Kursi untuk ${cancelling?.name ?? ''} akan dilepas dan pengajuan ditutup.`}
        confirmLabel="Cancel submission"
        loading={cancel.isPending}
        onOpenChange={(open) => !open && setCancelling(null)}
        onConfirm={() =>
          cancelling &&
          cancel.mutate({ id: cancelling.id, name: cancelling.name }, { onSuccess: () => setCancelling(null) })
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Hapus draft kandidat?"
        description={`Draft ${deleting?.name ?? ''} akan dihapus.`}
        loading={remove.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() =>
          deleting && remove.mutate({ id: deleting.id, name: deleting.name }, { onSuccess: () => setDeleting(null) })
        }
      />
    </>
  );

  /**
   * Aksi baris per `nj_status` × peran (FSD 0.24 §4.3; L1 sembunyikan yang tak berhak).
   * Pembuat tidak diketahui klien — Ubah/Batalkan tampil per peran, server menjawab 403.
   * 1 aksi = tombol inline, ≥ 2 aksi = dropdown "Action ▾".
   */
  function RowAction({ row }: { row: Candidate }) {
    const draft = row.status === 'DRAFT';
    const pendingDecision = row.status === 'SUBMITTED' || row.status === 'IN_APPROVAL';
    const actions: RowActionItem[] = [
      { label: pendingDecision && checker ? 'Setujui' : 'Detail', onSelect: () => setReviewing(row) },
      ...(draft && maker ? [{ label: 'Ajukan', onSelect: () => submit.mutate({ id: row.id, name: row.name }) }] : []),
      ...(draft && maker ? [{ label: 'Ubah', onSelect: () => setEditing(row) }] : []),
      ...(row.status === 'APPROVED' && maker ? [{ label: 'Materialize', onSelect: () => setMaterializing(row) }] : []),
      ...(row.status === 'MATERIALIZED' ? [{ label: 'View employee', onSelect: () => navigate('/employees/directory') }] : []),
      ...((draft || pendingDecision) && (maker || checker)
        ? [{ label: 'Batalkan', danger: true, onSelect: () => setCancelling(row) }]
        : []),
      ...(draft && (maker || checker) ? [{ label: 'Hapus', danger: true, onSelect: () => setDeleting(row) }] : []),
    ];
    if (actions.length === 1) return <RowButton onClick={actions[0].onSelect}>{actions[0].label}</RowButton>;
    return <RowActions actions={actions} />;
  }
}

function CardFoot({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11.5px] font-medium leading-[1.4] text-fg-3">{children}</span>;
}
