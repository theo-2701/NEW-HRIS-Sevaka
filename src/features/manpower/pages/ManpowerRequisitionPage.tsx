import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead, StatCard } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import type { RowAction } from '@/components/RowActions';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDateRange } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note, RequisitionStatusBadge } from '@/features/manpower/components/ManpowerBits';
import { PlanCard } from '@/features/manpower/components/PlanCard';
import { CreatePlanModal } from '@/features/manpower/components/CreatePlanModal';
import {
  CloseRequisitionDialog,
  CreateRequisitionModal,
  ReviewRequisitionModal,
} from '@/features/manpower/components/RequisitionModals';
import {
  useCancelRequisition,
  useManpowerPlans,
  useRequisitions,
} from '@/features/manpower/hooks/useManpower';
import {
  CURRENT_USER,
  PARENT_POSITION_OPTIONS,
  TERMINAL_REQUISITION,
  UNIT_OPTIONS,
  isRequisitionChecker,
  isRequisitionMaker,
  labelOf,
  planTotals,
} from '@/features/manpower/types';
import type { Requisition } from '@/features/manpower/types';

type Tab = 'plans' | 'requisitions';

/**
 * Manpower & Requisition — port `_prototype/manpower-requisition.html`
 * (FSD §3 · UIC §3). Rencana menetapkan target; requisition mengubah gap
 * menjadi kursi yang disetujui.
 */
export function ManpowerRequisitionPage() {
  const { data: plans = [], isLoading: plansLoading } = useManpowerPlans();
  const { data: requisitions = [], isLoading: reqLoading } = useRequisitions();
  const cancel = useCancelRequisition();
  const role = useAuthStore((s) => s.user?.role);
  const maker = isRequisitionMaker(role);
  const checker = isRequisitionChecker(role);

  const [tab, setTab] = useState<Tab>('plans');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingReq, setCreatingReq] = useState(false);
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [reviewing, setReviewing] = useState<Requisition | null>(null);
  const [cancelling, setCancelling] = useState<Requisition | null>(null);
  const [closing, setClosing] = useState<Requisition | null>(null);

  /** Aksi baris per status × peran (FSD 0.24 §3.1); yang tak berhak disembunyikan (L1). */
  const rowActions = (row: Requisition): RowAction[] => {
    const open = row.status === 'IN_APPROVAL';
    return [
      { label: open && checker ? 'Review' : 'View Detail', onSelect: () => setReviewing(row) },
      ...(open && maker
        ? [
            { label: 'Ubah', onSelect: () => setEditing(row) },
            { label: 'Batalkan', danger: true, onSelect: () => setCancelling(row) },
          ]
        : []),
      ...(row.status === 'APPROVED' && maker ? [{ label: 'Tutup', danger: true, onSelect: () => setClosing(row) }] : []),
    ];
  };

  const paged = usePagedRows(requisitions);

  const activePlan = useMemo(() => plans.find((plan) => plan.status === 'ACTIVE'), [plans]);
  const activeTotals = activePlan ? planTotals(activePlan) : null;
  const openRequisitions = requisitions.filter((row) => !TERMINAL_REQUISITION.includes(row.status)).length;
  const inApproval = requisitions.filter((row) => row.status === 'IN_APPROVAL');
  /** Yang benar-benar bisa Anda putuskan — pengajuan sendiri tidak dihitung. */
  const awaitingMyReview = inApproval.filter((row) => row.maker !== CURRENT_USER).length;

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Manpower & Requisition' }]}
        title="Manpower & Requisition"
        description="Rencanakan headcount per unit dan ajukan requisition posisi lewat tinjauan maker→checker. Requisition yang disetujui menyiapkan kursi terbuka di hilir."
        actions={
          <>
            <Button variant="secondary" onClick={() => setCreatingPlan(true)}>
              New plan
            </Button>
            {maker && <Button onClick={() => setCreatingReq(true)}>New requisition</Button>}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active plan"
              value={activePlan ? activePlan.periodStart.slice(0, 4) : '—'}
              footer={<Foot>{activePlan ? activePlan.title : 'Belum ada rencana aktif'}</Foot>}
            />
            <StatCard
              label="Target headcount"
              value={activeTotals?.target ?? '—'}
              footer={<Foot>{activePlan ? `Di ${activePlan.lines.length} unit` : 'Menunggu rencana aktif'}</Foot>}
            />
            <StatCard
              label="Open requisitions"
              value={openRequisitions}
              footer={<Foot>{inApproval.length} menunggu persetujuan</Foot>}
            />
            <StatCard
              label="Awaiting your review"
              value={awaitingMyReview}
              footer={<Foot>Sebagai checker (bukan pengajuan sendiri)</Foot>}
            />
          </div>

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'plans', label: 'Manpower plans', count: plans.length },
              { value: 'requisitions', label: 'Requisitions', count: requisitions.length },
            ]}
          />

          {tab === 'plans' && (
            <div className="flex flex-col gap-4">
              {plansLoading && (
                <p className="py-6 text-center font-body text-[13px] font-medium text-fg-3">Memuat rencana…</p>
              )}
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}

              <Note icon={<Info />}>
                <strong>Actual</strong> dan <strong>Gap</strong> dihitung dari jumlah posisi yang terisi di struktur organisasi.
              </Note>
            </div>
          )}

          {tab === 'requisitions' && (
            <Card>
              <CardHead title="Requisitions" sub="Maker→checker · SoD ditegakkan" />

              <div className="flex flex-col">
                <DataTable<Requisition>
                  rows={paged.rows}
                  rowKey={(row) => row.id}
                  loading={reqLoading}
                  empty="Belum ada requisition."
                  columns={[
                    { key: 'id', header: 'Requisition', strong: true, nowrap: true, render: (row) => row.id },
                    { key: 'title', header: 'Position title', render: (row) => row.title },
                    { key: 'unit', header: 'Unit', render: (row) => labelOf(UNIT_OPTIONS, row.unitId) },
                    {
                      key: 'parent',
                      header: 'Reports to',
                      muted: true,
                      render: (row) => labelOf(PARENT_POSITION_OPTIONS, row.parentPositionId),
                    },
                    { key: 'headcount', header: 'Headcount', align: 'center', strong: true, render: (row) => row.headcount },
                    {
                      key: 'filled',
                      header: 'Terisi',
                      align: 'center',
                      nowrap: true,
                      render: (row) => `${row.filledCount} / ${row.headcount}`,
                    },
                    {
                      key: 'active',
                      header: 'Masa Aktif',
                      nowrap: true,
                      render: (row) => formatDateRange(row.activeFrom, row.activeUntil),
                    },
                    { key: 'status', header: 'Status', render: (row) => <RequisitionStatusBadge status={row.status} /> },
                    { key: 'maker', header: 'Pengaju', muted: true, render: (row) => row.maker },
                  ]}
                  actions={(row) => {
                    const actions = rowActions(row);
                    return actions.length === 1 ? (
                      <RowButton onClick={actions[0].onSelect}>{actions[0].label}</RowButton>
                    ) : (
                      <RowActions actions={actions} />
                    );
                  }}
                />

                <Pagination
                  page={paged.page}
                  pageSize={paged.pageSize}
                  total={paged.total}
                  noun="requisitions"
                  onPageChange={paged.setPage}
                  onPageSizeChange={paged.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <CreatePlanModal open={creatingPlan} onClose={() => setCreatingPlan(false)} />
      <CreateRequisitionModal
        open={creatingReq || Boolean(editing)}
        plans={plans}
        editing={editing}
        onClose={() => (setCreatingReq(false), setEditing(null))}
      />
      <ReviewRequisitionModal requisition={reviewing} canCheck={checker} onClose={() => setReviewing(null)} />
      <CloseRequisitionDialog key={closing?.id} requisition={closing} onClose={() => setClosing(null)} />
      <ConfirmDialog
        open={Boolean(cancelling)}
        onOpenChange={(open) => !open && setCancelling(null)}
        title={`Batalkan ${cancelling?.id ?? ''}?`}
        description="Requisition berhenti menunggu keputusan checker dan menjadi CANCELLED."
        confirmLabel="Batalkan requisition"
        cancelLabel="Kembali"
        loading={cancel.isPending}
        onConfirm={() => cancelling && cancel.mutate({ id: cancelling.id }, { onSuccess: () => setCancelling(null) })}
      />
    </>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11.5px] font-medium leading-[1.4] text-fg-3">{children}</span>;
}
