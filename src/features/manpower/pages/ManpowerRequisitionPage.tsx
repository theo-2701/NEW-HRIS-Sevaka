import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead, StatCard } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note, RequisitionStatusBadge } from '@/features/manpower/components/ManpowerBits';
import { PlanCard } from '@/features/manpower/components/PlanCard';
import { CreatePlanModal } from '@/features/manpower/components/CreatePlanModal';
import {
  CreateRequisitionModal,
  ReviewRequisitionModal,
} from '@/features/manpower/components/RequisitionModals';
import {
  useManpowerPlans,
  useRequisitions,
  useSubmitRequisition,
} from '@/features/manpower/hooks/useManpower';
import {
  CURRENT_USER,
  PARENT_POSITION_OPTIONS,
  TERMINAL_REQUISITION,
  UNIT_OPTIONS,
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
  const submit = useSubmitRequisition();

  const [tab, setTab] = useState<Tab>('plans');
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [creatingReq, setCreatingReq] = useState(false);
  const [reviewing, setReviewing] = useState<Requisition | null>(null);

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
            <Button onClick={() => setCreatingReq(true)}>New requisition</Button>
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
                <strong>Actual</strong> dan <strong>Gap</strong> dihitung terhadap jumlah posisi hidup di
                company-service — employee-service tidak menyimpan kolom kapasitas.{' '}
                <strong>PROB-FRONTEND-005:</strong> kontrak read agregatnya belum dikonfirmasi (penegakan ditunda).
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
                    { key: 'status', header: 'Status', render: (row) => <RequisitionStatusBadge status={row.status} /> },
                    { key: 'maker', header: 'Maker', muted: true, render: (row) => row.maker },
                  ]}
                  actions={(row) =>
                    row.status === 'DRAFT' ? (
                      <RowButton onClick={() => submit.mutate({ id: row.id })}>Submit</RowButton>
                    ) : (
                      <RowButton onClick={() => setReviewing(row)}>
                        {row.status === 'IN_APPROVAL' ? 'Review' : 'View Detail'}
                      </RowButton>
                    )
                  }
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
      <CreateRequisitionModal open={creatingReq} plans={plans} onClose={() => setCreatingReq(false)} />
      <ReviewRequisitionModal requisition={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11.5px] font-medium leading-[1.4] text-fg-3">{children}</span>;
}
