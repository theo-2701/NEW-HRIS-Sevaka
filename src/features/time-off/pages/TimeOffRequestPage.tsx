import { useMemo, useState } from 'react';
import { UserRound } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton, PanelActionButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  DelegationStatusBadge,
  ExtraLayerTag,
  Note,
  RequestStatusBadge,
  StatStrip,
} from '@/features/time-off/components/TimeOffBits';
import { RequestFormModal } from '@/features/time-off/components/RequestFormModal';
import {
  DecisionModal,
  RequestDetailModal,
  SickRejectModal,
  WithdrawModal,
} from '@/features/time-off/components/RequestModals';
import { DelegationModal } from '@/features/time-off/components/DelegationModal';
import {
  useCancelDelegation,
  useDelegations,
  useLeaveRequests,
  useLeaveTypes,
} from '@/features/time-off/hooks/useTimeOff';
import { sickWindowOpen } from '@/features/time-off/services/time-off.service';
import { VIEWERS, employeeName, leaveTypeOf } from '@/features/time-off/mock-data';
import {
  DEMO_NOW,
  REQUEST_STATUS_LABEL,
  SESSION_LABEL,
  isApprover,
} from '@/features/time-off/types';
import type { Delegation, LeaveRequest, RequestStatus, Session } from '@/features/time-off/types';
import { formatDate, toIsoDate } from '@/lib/format';

type Tab = 'requests' | 'delegation';

const STATUS_FILTERS: (RequestStatus | 'ALL')[] = [
  'ALL',
  'PENDING_APPROVAL',
  'AUTO_APPROVED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
];

/**
 * Time Off Request — port `_prototype/time-off-request.html`
 * (FSD-001-TIME §2 · UIC-001-TIME §3).
 *
 * Satu layar, satu endpoint: approver melihat span-of-control-nya, peran lain
 * melihat barisnya sendiri. Pemilih identitas di bawah judul menggantikan login
 * sungguhan supaya kedua sudut pandang bisa dicoba.
 */
export function TimeOffRequestPage() {
  const [session, setSession] = useState<Session>(VIEWERS[0]);
  const [tab, setTab] = useState<Tab>('requests');

  const { data: requests = [], isLoading } = useLeaveRequests(session);
  const { data: delegations = [] } = useDelegations();
  const { data: leaveTypes = [] } = useLeaveTypes();
  const cancelDelegation = useCancelDelegation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [detail, setDetail] = useState<LeaveRequest | null>(null);
  const [deciding, setDeciding] = useState<LeaveRequest | null>(null);
  const [sickRejecting, setSickRejecting] = useState<LeaveRequest | null>(null);
  const [withdrawing, setWithdrawing] = useState<LeaveRequest | null>(null);
  const [delegationOpen, setDelegationOpen] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<Delegation | null>(null);
  const [cancellingDelegation, setCancellingDelegation] = useState<Delegation | null>(null);

  const [status, setStatus] = useState<RequestStatus | 'ALL'>('ALL');
  const [typeId, setTypeId] = useState<string>('ALL');
  const [query, setQuery] = useState('');

  const approver = isApprover(session);
  const todayIso = toIsoDate(DEMO_NOW);

  const filtered = useMemo(
    () =>
      requests.filter((row) => {
        if (status !== 'ALL' && row.status !== status) return false;
        if (typeId !== 'ALL' && row.leaveTypeId !== typeId) return false;
        const keyword = query.trim().toLowerCase();
        if (keyword && !employeeName(row.employeeId).toLowerCase().includes(keyword)) return false;
        return true;
      }),
    [requests, status, typeId, query],
  );

  const paged = usePagedRows(filtered);

  const mine = requests.filter((row) => row.employeeId === session.employeeId);
  const awaitingMe = approver
    ? requests.filter((row) => row.status === 'PENDING_APPROVAL' && row.employeeId !== session.employeeId).length
    : 0;
  const sickOpen = requests.filter((row) => sickWindowOpen(row, DEMO_NOW)).length;
  const extraLayer = requests.filter((row) => Boolean(row.extraApprovalReason)).length;

  const openForm = (row: LeaveRequest | null) => {
    setEditing(row);
    setFormOpen(true);
  };

  const rowActions = (row: LeaveRequest) => {
    const isMine = row.employeeId === session.employeeId;
    const actions = [];

    if (isMine) {
      if (row.status === 'PENDING_APPROVAL') actions.push({ label: 'Edit', onSelect: () => openForm(row) });
      const withdrawable =
        row.status === 'PENDING_APPROVAL' ||
        row.status === 'AUTO_APPROVED' ||
        (row.status === 'APPROVED' && row.startDate > todayIso);
      if (withdrawable) {
        actions.push({ label: 'Withdraw', danger: true, onSelect: () => setWithdrawing(row) });
      }
    } else if (approver) {
      if (row.status === 'PENDING_APPROVAL') actions.push({ label: 'Review', onSelect: () => setDeciding(row) });
      if (sickWindowOpen(row, DEMO_NOW)) {
        actions.push({ label: 'Reject sick leave', danger: true, onSelect: () => setSickRejecting(row) });
      }
    }

    if (actions.length === 0) return <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>;
    actions.push({ label: 'View Detail', onSelect: () => setDetail(row) });
    return <RowActions actions={actions} />;
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Time Off Request' }]}
        title="Time Off Request"
        description="Cuti selalu diajukan untuk diri sendiri. Cuti biasa menunggu keputusan dan belum mengubah apa pun sampai diputuskan; cuti sakit berlaku seketika dan sebagai gantinya membuka jendela terbatas untuk ditolak. Setiap pengajuan melewati empat gerbang sebelum barisnya dibuat."
        actions={<Button onClick={() => openForm(null)}>New request</Button>}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
            <Select
              value={session.employeeId}
              onValueChange={(value) => {
                const next = VIEWERS.find((row) => row.employeeId === value);
                if (next) {
                  setSession(next);
                  paged.resetPage();
                }
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWERS.map((viewer) => (
                  <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                    {employeeName(viewer.employeeId)} — {viewer.roles[viewer.roles.length - 1].replace('ROLE_', '')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Note icon={<UserRound />}>
            {approver ? (
              <>
                Tampilan approver — setiap pengajuan dalam rentang kendali Anda terdaftar. Baris milik Anda sendiri
                tidak punya aksi keputusan: pemisahan tugas ditegakkan di server (<code>403</code>), bukan sekadar
                disembunyikan di sini.
              </>
            ) : (
              <>
                Mode ESS — layar dan endpoint yang sama; barisnya dipersempit ke{' '}
                <strong>{employeeName(session.employeeId)}</strong> dari klaim identitas, dan tidak ada aksi
                keputusan untuk Anda.
              </>
            )}
          </Note>

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'requests', label: 'Requests', count: requests.length },
              { value: 'delegation', label: 'Delegation', count: delegations.length },
            ]}
          />

          {tab === 'requests' && (
            <div className="flex flex-col gap-5">
              <StatStrip
                items={[
                  {
                    label: 'Awaiting my decision',
                    value: awaitingMe,
                    foot: 'Baris yang boleh Anda putuskan — pengajuan sendiri dikecualikan oleh pemisahan tugas.',
                  },
                  {
                    label: 'Sick — reject window open',
                    value: sickOpen,
                    foot: 'Sudah berlaku; hanya bisa ditolak sampai tenggat yang dibekukan.',
                  },
                  {
                    label: 'Extra approval layer',
                    value: extraLayer,
                    foot: 'Terangkat otomatis saat submit — mengangkat pengajuan, tidak pernah memblokirnya.',
                  },
                  { label: 'My requests', value: mine.length, foot: 'Bisa diubah hanya selagi masih menunggu.' },
                ]}
              />

              <Card>
                <CardHead title="Requests" sub="Disaring dari klaim identitas — layar dan endpoint yang sama" />

                <div className="flex flex-col">
                  <TableToolbar
                    filters={
                      <>
                        <Select
                          value={status}
                          onValueChange={(value) => {
                            setStatus(value as RequestStatus | 'ALL');
                            paged.resetPage();
                          }}
                        >
                          <SelectTrigger className="h-10 w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_FILTERS.map((value) => (
                              <SelectItem key={value} value={value}>
                                {value === 'ALL' ? 'All statuses' : REQUEST_STATUS_LABEL[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={typeId}
                          onValueChange={(value) => {
                            setTypeId(value);
                            paged.resetPage();
                          }}
                        >
                          <SelectTrigger className="h-10 w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All leave types</SelectItem>
                            {leaveTypes.map((row) => (
                              <SelectItem key={row.id} value={row.id}>
                                {row.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    }
                    search={{
                      value: query,
                      onChange: (value) => {
                        setQuery(value);
                        paged.resetPage();
                      },
                      placeholder: 'Cari karyawan…',
                    }}
                  />

                  <DataTable<LeaveRequest>
                    rows={paged.rows}
                    rowKey={(row) => row.id}
                    loading={isLoading}
                    empty="Tidak ada pengajuan yang cocok dengan filter."
                    columns={[
                      { key: 'id', header: 'Request', strong: true, nowrap: true, render: (row) => row.id },
                      {
                        key: 'employee',
                        header: 'Employee',
                        render: (row) => (
                          <CellIdentity
                            name={employeeName(row.employeeId)}
                            leading={<Avatar name={employeeName(row.employeeId)} size="sm" />}
                          />
                        ),
                      },
                      {
                        key: 'type',
                        header: 'Leave type',
                        render: (row) => leaveTypeOf(row.leaveTypeId)?.name ?? row.leaveTypeId,
                      },
                      {
                        key: 'dates',
                        header: 'Dates',
                        muted: true,
                        nowrap: true,
                        render: (row) => `${formatDate(row.startDate)} – ${formatDate(row.endDate)}`,
                      },
                      {
                        key: 'session',
                        header: 'Session',
                        muted: true,
                        render: (row) => SESSION_LABEL[row.daySession],
                      },
                      { key: 'days', header: 'Days', align: 'right', strong: true, render: (row) => row.totalDays },
                      {
                        key: 'extra',
                        header: 'Extra layer',
                        render: (row) => <ExtraLayerTag reason={row.extraApprovalReason} />,
                      },
                      { key: 'status', header: 'Status', render: (row) => <RequestStatusBadge status={row.status} /> },
                    ]}
                    actions={rowActions}
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
            </div>
          )}

          {tab === 'delegation' && (
            <Card>
              <CardHead
                title="Approval delegation"
                sub="Hanya diajukan pemegang peran approver atas cuti hidup miliknya sendiri"
                action={
                  approver ? (
                    <PanelActionButton
                      onClick={() => {
                        setEditingDelegation(null);
                        setDelegationOpen(true);
                      }}
                    >
                      Register substitute
                    </PanelActionButton>
                  ) : undefined
                }
              />

              {!approver && (
                <Note tone="warn" icon={<UserRound />}>
                  Anda tidak memegang peran approver, jadi tidak ada task persetujuan yang bisa didelegasikan.
                </Note>
              )}

              <DataTable<Delegation>
                rows={delegations}
                rowKey={(row) => row.id}
                empty="Belum ada delegasi."
                columns={[
                  { key: 'id', header: 'Delegation', strong: true, nowrap: true, render: (row) => row.id },
                  { key: 'leave', header: 'Delegated leave', muted: true, render: (row) => row.leaveRequestId },
                  { key: 'delegator', header: 'Delegator', render: (row) => employeeName(row.delegatorId) },
                  { key: 'substitute', header: 'Substitute', render: (row) => employeeName(row.substituteId) },
                  { key: 'scope', header: 'Scope', muted: true, render: (row) => row.scope },
                  { key: 'status', header: 'Status', render: (row) => <DelegationStatusBadge status={row.status} /> },
                ]}
                actions={(row) =>
                  row.status === 'PENDING_APPROVAL' && row.delegatorId === session.employeeId ? (
                    <RowActions
                      actions={[
                        {
                          label: 'Ganti pengganti',
                          onSelect: () => {
                            setEditingDelegation(row);
                            setDelegationOpen(true);
                          },
                        },
                        { label: 'Cancel', danger: true, onSelect: () => setCancellingDelegation(row) },
                      ]}
                    />
                  ) : (
                    <span className="font-body text-xs font-medium text-fg-4">Tidak ada aksi</span>
                  )
                }
              />
            </Card>
          )}
        </div>
      </PageShell>

      <RequestFormModal
        open={formOpen}
        session={session}
        editing={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
      <RequestDetailModal request={detail} session={session} onClose={() => setDetail(null)} />
      <DecisionModal request={deciding} session={session} onClose={() => setDeciding(null)} />
      <SickRejectModal request={sickRejecting} session={session} onClose={() => setSickRejecting(null)} />
      <WithdrawModal request={withdrawing} session={session} onClose={() => setWithdrawing(null)} />
      <DelegationModal
        open={delegationOpen}
        session={session}
        editing={editingDelegation}
        onClose={() => {
          setDelegationOpen(false);
          setEditingDelegation(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(cancellingDelegation)}
        title="Batalkan delegasi ini?"
        description="Hanya boleh selagi delegasi masih menunggu persetujuan."
        confirmLabel="Cancel delegation"
        loading={cancelDelegation.isPending}
        onOpenChange={(open) => !open && setCancellingDelegation(null)}
        onConfirm={() =>
          cancellingDelegation &&
          cancelDelegation.mutate(
            { id: cancellingDelegation.id },
            { onSuccess: () => setCancellingDelegation(null) },
          )
        }
      />
    </>
  );
}
