import { useMemo, useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { TableToolbar } from '@/components/TableToolbar';
import { StatusBadge } from '@/components/StatusBadge';
import { RowActions } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { Money } from '@/features/cash-advance/components/CashAdvanceBits';
import { DeleteLoanLimitModal, LoanLimitFormModal } from '@/features/finance-settings/components/LoanLimitModals';
import {
  useLoanLimits,
  usePurposeTypeBoard,
  useRejectionReasonBoard,
} from '@/features/finance-settings/hooks/useFinanceSettings';
import { JOB_GRADES, VIEWERS, gradeName } from '@/features/finance-settings/mock-data';
import { canWriteSettings } from '@/features/finance-settings/rules';
import type { Actor, LoanLimit, LoanLimitFilter, PurposeTypeRow, RejectionReason } from '@/features/finance-settings/types';

type Tab = 'loanlimit' | 'purpose' | 'rejection';

function YesNo({ value }: { value: boolean }) {
  return (
    <StatusBadge tone={value ? 'ok' : 'mute'} dot={false}>
      {value ? 'Yes' : 'No'}
    </StatusBadge>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return <StatusBadge tone={active ? 'ok' : 'mute'}>{active ? 'Active' : 'Inactive'}</StatusBadge>;
}

/**
 * Finance › Finance Settings — port `_prototype/finance-settings.html`
 * (FSD §1 · UIC §2 · TSD §14.1 · ERD §6.4/§6.6/§6.9).
 *
 * Loan Limit dikelola penuh di layar; plafon aktif langsung dibaca layar Loan untuk
 * pengajuan berikutnya. Advance Purpose Type dan Rejection Reasons adalah layar baca
 * sesuai batas skop FSD §1 — kontrak CRUD-nya tetap penuh di service.
 */
export function FinanceSettingsPage() {
  const [tab, setTab] = useState<Tab>('loanlimit');
  const [actor, setActor] = useState<Actor>(VIEWERS[0]);
  const writable = canWriteSettings(actor.role);

  const [grade, setGrade] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LoanLimit | null>(null);
  const [deleting, setDeleting] = useState<LoanLimit | null>(null);

  const limitFilter = useMemo<LoanLimitFilter>(
    () => ({
      jobGradeId: grade === 'ALL' ? undefined : grade,
      isActive: status === 'ALL' ? undefined : status === 'ACTIVE',
    }),
    [grade, status],
  );

  const limits = useLoanLimits(actor, limitFilter);
  const allLimits = useLoanLimits(actor);
  const purposes = usePurposeTypeBoard(actor);
  const reasons = useRejectionReasonBoard(actor);

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Finance' }, { label: 'Finance Settings' }]}
        title="Cross-Module Finance Settings"
        description="Data induk yang dipakai bersama Benefit Reimbursement, Loan, dan Cash Advance. Loan Limit dikelola di sini; Advance Purpose Type dan Rejection Reasons hanya ditampilkan."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={actor.employeeId}
              onValueChange={(value) => {
                const next = VIEWERS.find((row) => row.employeeId === value);
                if (next) setActor(next);
              }}
            >
              <SelectTrigger className="h-10 w-[280px]" aria-label="Viewing as">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWERS.map((viewer) => (
                  <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                    {viewer.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tab === 'loanlimit' && writable && <Button onClick={() => setFormOpen(true)}>New loan limit</Button>}
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'loanlimit', label: 'Loan Limit', count: allLimits.data?.length ?? 0 },
              { value: 'purpose', label: 'Advance Purpose Type', count: purposes.data?.length ?? 0 },
              { value: 'rejection', label: 'Rejection Reasons', count: reasons.data?.length ?? 0 },
            ]}
          />

          {tab === 'loanlimit' && (
            <Card>
              <CardHead
                title="Loan limit per job grade"
                sub={writable ? 'Dibaca layar Loan saat pengajuan berikutnya' : 'Baca saja — penulisan milik Finance Officer dan Super Admin'}
              />

              <Note icon={<Info />}>
                Perubahan plafon <strong>tidak berlaku surut</strong> — pinjaman yang sudah berjalan tetap memakai plafon saat diajukan. Satu golongan hanya punya satu baris.
              </Note>

              <div className="flex flex-col">
                <TableToolbar
                  filters={
                    <>
                      <Select value={grade} onValueChange={setGrade}>
                        <SelectTrigger className="h-10 w-[220px]" aria-label="Job grade">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All grades</SelectItem>
                          {JOB_GRADES.map((row) => (
                            <SelectItem key={row.id} value={row.id}>
                              {row.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-10 w-[160px]" aria-label="Status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All status</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  }
                />

                {limits.error && (
                  <Note tone="danger" icon={<TriangleAlert />}>
                    {limits.error.message}
                  </Note>
                )}

                <DataTable<LoanLimit>
                  rows={limits.data ?? []}
                  rowKey={(row) => row.id}
                  loading={limits.isLoading}
                  empty="No loan limit matches the current filter."
                  columns={[
                    { key: 'grade', header: 'Job Grade', strong: true, render: (row) => gradeName(row.jobGradeId) },
                    { key: 'amount', header: 'Limit Amount', align: 'right', render: (row) => <Money value={row.limitAmount} /> },
                    { key: 'status', header: 'Status', render: (row) => <ActiveBadge active={row.isActive} /> },
                  ]}
                  actions={
                    writable
                      ? (row) => (
                          <RowActions
                            actions={[
                              {
                                label: 'Edit',
                                onSelect: () => {
                                  setEditing(row);
                                  setFormOpen(true);
                                },
                              },
                              { label: 'Delete', danger: true, onSelect: () => setDeleting(row) },
                            ]}
                          />
                        )
                      : undefined
                  }
                />
              </div>
            </Card>
          )}

          {tab === 'purpose' && (
            <Card>
              <CardHead
                title="Advance purpose type"
                sub="Papan baca — CRUD penuh (create / update / delete / history) tetap di kontrak API F1.36–F1.42"
              />

              <DataTable<PurposeTypeRow>
                rows={purposes.data ?? []}
                rowKey={(row) => row.id}
                loading={purposes.isLoading}
                empty="No purpose type yet."
                columns={[
                  { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
                  { key: 'travel', header: 'Official Travel', render: (row) => <YesNo value={row.isOfficialTravel} /> },
                  {
                    key: 'max',
                    header: 'Max Amount',
                    align: 'right',
                    render: (row) =>
                      row.maxAmount !== null ? (
                        <Money value={row.maxAmount} />
                      ) : (
                        <span className="font-body text-[12px] font-medium text-fg-3">
                          {row.isUnlimitedAck ? 'Unlimited (acknowledged)' : 'Not set — cannot be selected'}
                        </span>
                      ),
                  },
                  { key: 'status', header: 'Status', render: (row) => <ActiveBadge active={row.isActive} /> },
                ]}
              />

              <Note icon={<Info />}>
                Jenis tanpa batas nominal yang belum ditandai &quot;unlimited&quot; <strong>tidak bisa dipilih</strong> saat mengajukan uang muka. Mengubah penanda perjalanan dinas wajib disertai alasan.
              </Note>
            </Card>
          )}

          {tab === 'rejection' && (
            <Card>
              <CardHead title="Rejection reasons" sub="Dipakai bersama penolakan Benefit Reimbursement, Loan, dan Cash Advance — papan baca F1.43–F1.47" />

              <DataTable<RejectionReason>
                rows={reasons.data ?? []}
                rowKey={(row) => row.id}
                loading={reasons.isLoading}
                empty="No rejection reason yet."
                columns={[
                  { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
                  { key: 'free', header: 'Requires Free-Text', render: (row) => <YesNo value={row.requiresFreeText} /> },
                  {
                    key: 'system',
                    header: 'System Default',
                    render: (row) =>
                      row.isSystemDefault ? (
                        <StatusBadge tone="brand">System default</StatusBadge>
                      ) : (
                        <span className="text-fg-4">—</span>
                      ),
                  },
                ]}
              />

              <Note icon={<Info />}>
                Baris bawaan sistem (&quot;Other&quot;) tidak bisa diubah atau dihapus.
              </Note>
            </Card>
          )}
        </div>
      </PageShell>

      <LoanLimitFormModal
        actor={actor}
        open={formOpen}
        limit={editing}
        limits={allLimits.data ?? []}
        onClose={closeForm}
      />
      <DeleteLoanLimitModal actor={actor} limit={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
