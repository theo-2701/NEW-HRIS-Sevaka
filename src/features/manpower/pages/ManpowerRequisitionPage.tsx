import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, StatCard } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { RowButton } from '@/components/RowActions';
import { usePagedRows } from '@/hooks/usePagedRows';
import { RequisitionStatusBadge } from '@/features/manpower/components/ManpowerBits';
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
} from '@/features/manpower/types';
import type { Requisition } from '@/features/manpower/types';

/**
 * Manpower Planning › Requisition — port `_prototype/manpower-requisition.html`
 * (FSD §3 · UIC §3). Sejak keputusan USER 11 Oktober 2026 (E9/E10) layar ini hanya
 * Permintaan Posisi; rencana ada di menu Planning / Planning History.
 */
export function ManpowerRequisitionPage() {
  const { data: plans = [] } = useManpowerPlans();
  const { data: requisitions = [], isLoading: reqLoading } = useRequisitions();
  const submit = useSubmitRequisition();

  const [creatingReq, setCreatingReq] = useState(false);
  const [reviewing, setReviewing] = useState<Requisition | null>(null);

  const paged = usePagedRows(requisitions);

  const activePlans = useMemo(() => plans.filter((plan) => plan.status === 'ACTIVE').length, [plans]);
  const openRequisitions = requisitions.filter((row) => !TERMINAL_REQUISITION.includes(row.status)).length;
  const inApproval = requisitions.filter((row) => row.status === 'IN_APPROVAL');
  /** Yang benar-benar bisa Anda putuskan — pengajuan sendiri tidak dihitung. */
  const awaitingMyReview = inApproval.filter((row) => row.maker !== CURRENT_USER).length;

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Manpower Planning' }, { label: 'Requisition' }]}
        title="Requisition"
        description="Raise position requests through maker→checker review. An approved requisition opens a seat downstream."
        actions={<Button onClick={() => setCreatingReq(true)}>New requisition</Button>}
      >
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Active plans"
              value={activePlans}
              footer={<Foot>Requisitions are raised against an active plan</Foot>}
            />
            <StatCard
              label="Open requisitions"
              value={openRequisitions}
              footer={<Foot>{inApproval.length} awaiting approval</Foot>}
            />
            <StatCard
              label="Awaiting your review"
              value={awaitingMyReview}
              footer={<Foot>As checker — your own requests excluded</Foot>}
            />
          </div>

          <Card>
            <CardHead title="Requisitions" sub="Maker→checker — the maker never decides their own request" />

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
        </div>
      </PageShell>

      <CreateRequisitionModal open={creatingReq} plans={plans} onClose={() => setCreatingReq(false)} />
      <ReviewRequisitionModal requisition={reviewing} onClose={() => setReviewing(null)} />
    </>
  );
}

function Foot({ children }: { children: React.ReactNode }) {
  return <span className="font-body text-[11.5px] font-medium leading-[1.4] text-fg-3">{children}</span>;
}
