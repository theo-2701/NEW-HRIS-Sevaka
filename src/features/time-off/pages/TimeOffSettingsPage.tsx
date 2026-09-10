import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  AccrualPolicyModal,
  BlackoutModal,
  EndPolicyModal,
  LeaveTypeModal,
} from '@/features/time-off/components/SettingsModals';
import {
  useAccrualPolicies,
  useBlackouts,
  useDeleteBlackout,
  useDeleteLeaveType,
  useSettingsLeaveTypes,
} from '@/features/time-off/hooks/useSettings';
import { CARRY_OVER_LABEL } from '@/features/time-off/types';
import type { AccrualPolicy, Blackout, LeaveType } from '@/features/time-off/types';
import { formatDate } from '@/lib/format';

type Tab = 'types' | 'accrual' | 'blackout';

/** Kumpulan flag jenis cuti sebagai chip ringkas. */
function TypeFlags({ row }: { row: LeaveType }) {
  const flags: { label: string; on: boolean }[] = [
    { label: 'Paid', on: row.isPaid },
    { label: 'Deducts balance', on: row.affectsBalance },
    { label: 'Document', on: row.requiresDocument },
    { label: 'Maker–checker', on: row.requiresApproval },
    { label: 'Extra layer', on: Boolean(row.allowsExtraApproval) },
  ];

  return (
    <span className="flex flex-wrap gap-1.5">
      {flags
        .filter((flag) => flag.on)
        .map((flag) => (
          <span
            key={flag.label}
            className="inline-flex h-6 items-center rounded-pill bg-vapor px-2.5 font-body text-[10.5px] font-bold uppercase tracking-[0.04em] text-fg-2"
          >
            {flag.label}
          </span>
        ))}
      {!row.isActive && <StatusBadge tone="mute">Inactive</StatusBadge>}
    </span>
  );
}

/**
 * Time Off Settings — port `_prototype/time-off-settings.html`
 * (FSD-001-TIME §4 · UIC-001-TIME §5).
 *
 * Tiga aturan yang dipakai menakar tiap pengajuan: katalog jenis cuti,
 * kebijakan akrual yang memberi hak bulan demi bulan, dan periode blackout yang
 * menahan pengajuan. Jenis statutory disemai sistem dan kebal kedua mode
 * blackout.
 */
export function TimeOffSettingsPage() {
  const [tab, setTab] = useState<Tab>('types');

  const { data: types = [], isLoading: typesLoading } = useSettingsLeaveTypes();
  const { data: policies = [], isLoading: policiesLoading } = useAccrualPolicies();
  const { data: blackouts = [], isLoading: blackoutsLoading } = useBlackouts();

  const deleteType = useDeleteLeaveType();
  const deleteBlackout = useDeleteBlackout();

  const [typeModal, setTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [deletingType, setDeletingType] = useState<LeaveType | null>(null);

  const [policyModal, setPolicyModal] = useState(false);
  const [endingPolicy, setEndingPolicy] = useState<AccrualPolicy | null>(null);

  const [blackoutModal, setBlackoutModal] = useState(false);
  const [editingBlackout, setEditingBlackout] = useState<Blackout | null>(null);
  const [deletingBlackout, setDeletingBlackout] = useState<Blackout | null>(null);

  const pagedTypes = usePagedRows(types);
  const pagedPolicies = usePagedRows(policies);
  const pagedBlackouts = usePagedRows(blackouts);

  const typeName = (id: string) => types.find((row) => row.id === id)?.name ?? id;

  const action =
    tab === 'types' ? (
      <Button
        onClick={() => {
          setEditingType(null);
          setTypeModal(true);
        }}
      >
        New leave type
      </Button>
    ) : tab === 'accrual' ? (
      <Button onClick={() => setPolicyModal(true)}>New accrual policy</Button>
    ) : (
      <Button
        onClick={() => {
          setEditingBlackout(null);
          setBlackoutModal(true);
        }}
      >
        New blackout period
      </Button>
    );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Time Off' }, { label: 'Settings' }]}
        title="Time Off Settings"
        description="Tiga aturan yang dipakai menakar sebuah pengajuan cuti: katalog jenis cuti, kebijakan akrual yang memberi hak bulan demi bulan, dan periode blackout yang menahan pengajuan. Jenis cuti statutory disemai sistem dan kebal terhadap kedua mode blackout."
        actions={action}
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'types', label: 'Leave type', count: types.length },
              { value: 'accrual', label: 'Accrual policy', count: policies.length },
              { value: 'blackout', label: 'Blackout period', count: blackouts.length },
            ]}
          />

          {tab === 'types' && (
            <Card>
              <CardHead title="Leave type" sub="Katalog yang dibaca form pengajuan" />

              <div className="flex flex-col">
                <DataTable<LeaveType>
                  rows={pagedTypes.rows}
                  rowKey={(row) => row.id}
                  loading={typesLoading}
                  empty="Belum ada jenis cuti."
                  columns={[
                    { key: 'code', header: 'Code', strong: true, nowrap: true, render: (row) => row.code },
                    { key: 'name', header: 'Leave name', render: (row) => row.name },
                    { key: 'flags', header: 'Flags', render: (row) => <TypeFlags row={row} /> },
                    {
                      key: 'advance',
                      header: 'Min advance',
                      align: 'right',
                      render: (row) => `${row.minAdvanceDays} hari`,
                    },
                    {
                      key: 'origin',
                      header: 'Origin',
                      render: (row) =>
                        row.isStatutory ? (
                          <StatusBadge tone="brand">Statutory</StatusBadge>
                        ) : (
                          <span className="font-body text-[13px] font-medium text-fg-3">Tenant</span>
                        ),
                    },
                  ]}
                  actions={(row) => (
                    <RowActions
                      actions={[
                        {
                          label: 'Edit',
                          onSelect: () => {
                            setEditingType(row);
                            setTypeModal(true);
                          },
                        },
                        {
                          label: 'Delete',
                          danger: true,
                          // Statutory tidak bisa dihapus — service menolak 422.
                          onSelect: () => setDeletingType(row),
                        },
                      ]}
                    />
                  )}
                />

                <Pagination
                  page={pagedTypes.page}
                  pageSize={pagedTypes.pageSize}
                  total={pagedTypes.total}
                  noun="leave types"
                  onPageChange={pagedTypes.setPage}
                  onPageSizeChange={pagedTypes.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'accrual' && (
            <Card>
              <CardHead title="Accrual policy" sub="Satu kebijakan hidup per jenis cuti × jenis kepegawaian" />

              <div className="flex flex-col">
                <DataTable<AccrualPolicy>
                  rows={pagedPolicies.rows}
                  rowKey={(row) => row.id}
                  loading={policiesLoading}
                  empty="Belum ada kebijakan akrual."
                  columns={[
                    { key: 'type', header: 'Leave type', strong: true, render: (row) => typeName(row.leaveTypeId) },
                    { key: 'employment', header: 'Employment type', render: (row) => row.employmentType },
                    {
                      key: 'eligible',
                      header: 'Entitled',
                      render: (row) =>
                        row.isEligible ? <StatusBadge tone="ok">Yes</StatusBadge> : <StatusBadge tone="mute">No</StatusBadge>,
                    },
                    {
                      key: 'rate',
                      header: 'Rate / month',
                      align: 'right',
                      render: (row) => (row.ratePerMonth === null ? '—' : row.ratePerMonth.toFixed(2)),
                    },
                    {
                      key: 'cap',
                      header: 'Balance cap',
                      align: 'right',
                      muted: true,
                      render: (row) => (row.maxBalanceDays === null ? 'Tanpa plafon' : row.maxBalanceDays),
                    },
                    {
                      key: 'carry',
                      header: 'Carry-over',
                      render: (row) => (
                        <span className="font-body text-[13px] font-medium text-fg-2">
                          {CARRY_OVER_LABEL[row.carryOverPolicy].split(' — ')[0]}
                          {row.carryOverMaxDays !== null && ` · ${row.carryOverMaxDays} hari`}
                          {row.carryOverExpiry && ` · s/d ${row.carryOverExpiry}`}
                        </span>
                      ),
                    },
                    {
                      key: 'from',
                      header: 'Effective from',
                      muted: true,
                      nowrap: true,
                      render: (row) => formatDate(row.effectiveFrom),
                    },
                    {
                      key: 'until',
                      header: 'Effective until',
                      muted: true,
                      nowrap: true,
                      render: (row) => (row.effectiveUntil ? formatDate(row.effectiveUntil) : 'Masih berjalan'),
                    },
                  ]}
                  actions={(row) =>
                    row.effectiveUntil ? (
                      <span className="font-body text-xs font-medium text-fg-4">Sudah berakhir</span>
                    ) : (
                      <RowButton onClick={() => setEndingPolicy(row)}>End policy</RowButton>
                    )
                  }
                />

                <Pagination
                  page={pagedPolicies.page}
                  pageSize={pagedPolicies.pageSize}
                  total={pagedPolicies.total}
                  noun="policies"
                  onPageChange={pagedPolicies.setPage}
                  onPageSizeChange={pagedPolicies.setPageSize}
                />
              </div>
            </Card>
          )}

          {tab === 'blackout' && (
            <Card>
              <CardHead title="Blackout period" sub="Dibaca gerbang submit saat pengajuan masuk" />

              <div className="flex flex-col">
                <DataTable<Blackout>
                  rows={pagedBlackouts.rows}
                  rowKey={(row) => row.id}
                  loading={blackoutsLoading}
                  empty="Belum ada periode blackout."
                  columns={[
                    { key: 'name', header: 'Period name', strong: true, render: (row) => row.name },
                    {
                      key: 'dates',
                      header: 'Dates',
                      muted: true,
                      nowrap: true,
                      render: (row) => `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
                    },
                    {
                      key: 'mode',
                      header: 'Mode',
                      render: (row) =>
                        row.mode === 'HARD' ? (
                          <StatusBadge tone="err">Machine-rejected</StatusBadge>
                        ) : (
                          <StatusBadge tone="warn">Extra approval</StatusBadge>
                        ),
                    },
                    { key: 'reason', header: 'Reason', muted: true, render: (row) => row.reason || '—' },
                  ]}
                  actions={(row) => (
                    <RowActions
                      actions={[
                        {
                          label: 'Edit',
                          onSelect: () => {
                            setEditingBlackout(row);
                            setBlackoutModal(true);
                          },
                        },
                        { label: 'Delete', danger: true, onSelect: () => setDeletingBlackout(row) },
                      ]}
                    />
                  )}
                />

                <Pagination
                  page={pagedBlackouts.page}
                  pageSize={pagedBlackouts.pageSize}
                  total={pagedBlackouts.total}
                  noun="periods"
                  onPageChange={pagedBlackouts.setPage}
                  onPageSizeChange={pagedBlackouts.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <LeaveTypeModal
        open={typeModal}
        editing={editingType}
        onClose={() => {
          setTypeModal(false);
          setEditingType(null);
        }}
      />

      <AccrualPolicyModal open={policyModal} leaveTypes={types} onClose={() => setPolicyModal(false)} />

      <EndPolicyModal policy={endingPolicy} onClose={() => setEndingPolicy(null)} />

      <BlackoutModal
        open={blackoutModal}
        editing={editingBlackout}
        onClose={() => {
          setBlackoutModal(false);
          setEditingBlackout(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingType)}
        title="Hapus jenis cuti ini?"
        description={`${deletingType?.name ?? ''} akan dihapus lunak. Jenis statutory dan yang masih dirujuk akan ditolak server.`}
        loading={deleteType.isPending}
        onOpenChange={(open) => !open && setDeletingType(null)}
        onConfirm={() =>
          deletingType && deleteType.mutate({ id: deletingType.id }, { onSuccess: () => setDeletingType(null) })
        }
      />

      <ConfirmDialog
        open={Boolean(deletingBlackout)}
        title="Hapus periode blackout ini?"
        description={`${deletingBlackout?.name ?? ''} tidak lagi dibaca gerbang submit.`}
        loading={deleteBlackout.isPending}
        onOpenChange={(open) => !open && setDeletingBlackout(null)}
        onConfirm={() =>
          deletingBlackout &&
          deleteBlackout.mutate({ id: deletingBlackout.id }, { onSuccess: () => setDeletingBlackout(null) })
        }
      />
    </>
  );
}
