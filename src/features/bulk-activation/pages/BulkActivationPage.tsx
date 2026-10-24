import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Lock } from 'lucide-react';
import { Card, CardHead } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { DataTable, SelectionBar } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge, type BadgeTone } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import {
  useActivationAccounts,
  useSendInvitations,
  useUpdateInvitation,
} from '@/features/bulk-activation/hooks/useBulkActivation';
import {
  INVITATION_STATUS_LABEL,
  INVITATION_STATUS_MEANING,
  MAX_PER_SEND,
  PHONE_PATTERN,
  canResend,
  type ActivationAccount,
  type InvitationStatus,
  type SendResult,
} from '@/features/bulk-activation/types';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';

const TONE: Record<InvitationStatus, BadgeTone> = {
  NOT_SENT: 'mute',
  SENDING: 'info',
  SENT: 'ok',
  FAILED: 'err',
  EXPIRED: 'warn',
};

const STATUSES = Object.keys(INVITATION_STATUS_LABEL) as InvitationStatus[];

function InvitationBadge({ row }: { row: Pick<ActivationAccount, 'invitationStatus' | 'failureReason'> }) {
  return (
    <span title={row.invitationStatus === 'FAILED' ? (row.failureReason ?? undefined) : undefined}>
      <StatusBadge tone={TONE[row.invitationStatus]}>{INVITATION_STATUS_LABEL[row.invitationStatus]}</StatusBadge>
    </span>
  );
}

const editSchema = Yup.object({
  email: Yup.string().trim().email('Enter a valid email address.').required('Email is required.'),
  phoneNumber: Yup.string()
    .trim()
    .matches(PHONE_PATTERN, 'Use +62 followed by 8–13 digits, without spaces.')
    .required('Phone number is required.'),
});

/** BAA-EDIT — menyimpan sekaligus mengirim ulang tautan ke email baru. */
function EditInvitationModal({ row, onClose }: { row: ActivationAccount | null; onClose: () => void }) {
  const update = useUpdateInvitation();
  return (
    <Formik
      initialValues={{ email: row?.email ?? '', phoneNumber: row?.phoneNumber ?? '' }}
      validationSchema={editSchema}
      enableReinitialize
      onSubmit={(values) => {
        if (row) update.mutate({ id: row.id, ...values }, { onSuccess: onClose });
      }}
    >
      {({ submitForm }) => (
        <Modal
          open={Boolean(row)}
          onOpenChange={(next) => !next && onClose()}
          title="Edit Invitation Details"
          description={row ? `${row.name} · ${row.username}` : undefined}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={submitForm} disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save & Resend'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <TextField name="email" type="email" label="Email" required placeholder="name@company.co.id" />
            <TextField
              name="phoneNumber"
              label="Phone Number"
              required
              placeholder="+628123456789"
              hint="+62 followed by 8–13 digits, without spaces or dashes."
            />
            <Note icon={<Lock />}>
              Saving sends a new activation link to this email right away. The previous link stops working.
            </Note>
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/** BAA-SEND-RESULT — cacah terkirim / dilewati + alasan dari server. */
function SendResultModal({ result, onClose }: { result: SendResult | null; onClose: () => void }) {
  return (
    <Modal
      open={Boolean(result)}
      onOpenChange={(next) => !next && onClose()}
      title="Invitation Results"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      {result && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Sent', result.sent],
              ['Skipped', result.skipped],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-border-1 bg-cloud px-4 py-3">
                <p className="m-0 font-body text-xs font-medium text-fg-3">{label}</p>
                <p className="m-0 font-display text-2xl font-bold tabular-nums text-fg-1">{value}</p>
              </div>
            ))}
          </div>
          {result.results.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="m-0 font-body text-[13px] font-bold text-fg-1">Skipped accounts</p>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {result.results.map((item) => (
                  <li key={item.id} className="font-body text-[13px] leading-[1.45] text-fg-2">
                    <strong className="font-semibold text-fg-1">{item.name}</strong> — {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/** Arti tiap status undangan — dibuka dari ikon ⓘ di header kolom. */
function StatusReferenceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Invitation statuses"
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <DataTable<{ status: InvitationStatus }>
        rows={STATUSES.map((status) => ({ status }))}
        rowKey={(row) => row.status}
        columns={[
          {
            key: 'status',
            header: 'Status',
            nowrap: true,
            render: (row) => <InvitationBadge row={{ invitationStatus: row.status, failureReason: null }} />,
          },
          { key: 'meaning', header: 'Meaning', render: (row) => INVITATION_STATUS_MEANING[row.status] },
        ]}
      />
    </Modal>
  );
}

/**
 * Employee Directory › Bulk Account Activation — FSD-001-EMPLOYEE 0.46 §9.
 * Aktor: HR Staff · HR Manager · Super Admin (peran lain tidak melihat menu, L6).
 */
export function BulkActivationPage() {
  const role = useAuthStore((s) => s.user?.role);
  const allowed = role === 'ROLE_HR_STAFF' || role === 'ROLE_HR_MANAGER' || role === 'ROLE_SUPER_ADMIN';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvitationStatus | 'ALL'>('ALL');
  const filter = useMemo(() => ({ search, status: status === 'ALL' ? undefined : status }), [search, status]);
  const { data, isLoading } = useActivationAccounts(filter);
  const rows = useMemo(() => data ?? [], [data]);
  const paged = usePagedRows(rows);

  const [picked, setPicked] = useState<string[]>([]);
  const pickable = paged.rows.filter((row) => row.invitationStatus !== 'SENDING');
  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  // Pilih semua = baris di halaman aktif saja (§9.1).
  const toggleAll = () =>
    setPicked((prev) => (pickable.every((row) => prev.includes(row.id)) ? [] : pickable.map((row) => row.id)));

  const send = useSendInvitations();
  const [confirmSend, setConfirmSend] = useState(false);
  const [resending, setResending] = useState<ActivationAccount | null>(null);
  const [editing, setEditing] = useState<ActivationAccount | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const runSend = (ids: string[], force: boolean) =>
    send.mutate(
      { ids, force },
      {
        onSuccess: (res) => {
          setPicked([]);
          setConfirmSend(false);
          setResending(null);
          setResult(res);
        },
      },
    );

  const tooMany = picked.length > MAX_PER_SEND;

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Bulk Account Activation' }]}
        title="Bulk Account Activation"
        description="Accounts created by Bulk Import that are not activated yet. Send activation invitations by email, and fix the email or phone number if needed. A row leaves the list once the employee has set their first password."
      >
        {!allowed ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Staff, HR Manager and Super Admin.
          </Note>
        ) : (
          <Card>
            <CardHead title="Waiting for activation" sub={`${rows.length} accounts`} />
            <div className="flex flex-col">
              <TableToolbar
                filters={
                  <Select value={status} onValueChange={(value) => { setStatus(value as InvitationStatus | 'ALL'); paged.resetPage(); }}>
                    <SelectTrigger className="h-10 w-[200px]" aria-label="Invitation status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      {STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {INVITATION_STATUS_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                }
                search={{
                  value: search,
                  // Maks 150 karakter; tanda < dan > ditolak di layar (§9.1).
                  onChange: (value) => {
                    setSearch(value.replace(/[<>]/g, '').slice(0, 150));
                    paged.resetPage();
                  },
                  placeholder: 'Search name, email, or username',
                }}
              />
              {tooMany && (
                <Note tone="warn" icon={<Lock />}>
                  At most {MAX_PER_SEND} accounts per send. Send the rest in the next round.
                </Note>
              )}
              <DataTable<ActivationAccount>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty="No accounts are waiting for activation."
                selectionBar={
                  picked.length > 0 ? (
                    <SelectionBar count={picked.length} total={pickable.length} onToggleAll={toggleAll}>
                      <Button variant="secondary" onClick={() => setPicked([])}>
                        Clear selection
                      </Button>
                      <Button disabled={tooMany} onClick={() => setConfirmSend(true)}>
                        Send Invitations ({picked.length})
                      </Button>
                    </SelectionBar>
                  ) : null
                }
                columns={[
                  {
                    key: 'name',
                    header: 'Name',
                    strong: true,
                    render: (row) => (
                      <span className="flex items-center gap-3">
                        {row.invitationStatus !== 'SENDING' && (
                          <Checkbox
                            aria-label={`Select ${row.name}`}
                            checked={picked.includes(row.id)}
                            onCheckedChange={() => toggle(row.id)}
                          />
                        )}
                        {row.name}
                      </span>
                    ),
                  },
                  { key: 'username', header: 'Username', muted: true, render: (row) => row.username },
                  { key: 'email', header: 'Email', render: (row) => row.email },
                  { key: 'phone', header: 'Phone Number', nowrap: true, render: (row) => row.phoneNumber },
                  {
                    key: 'status',
                    header: 'Invitation Status',
                    info: { label: 'Status reference', onClick: () => setLegendOpen(true) },
                    render: (row) => <InvitationBadge row={row} />,
                  },
                  {
                    key: 'last',
                    header: 'Last Sent',
                    muted: true,
                    nowrap: true,
                    render: (row) => (row.lastSentAt ? formatDateTime(row.lastSentAt) : '—'),
                  },
                ]}
                actions={(row) =>
                  canResend(row.invitationStatus) ? (
                    <RowActions
                      actions={[
                        { label: 'Edit', onSelect: () => setEditing(row) },
                        { label: 'Resend', onSelect: () => setResending(row) },
                      ]}
                    />
                  ) : (
                    <RowButton onClick={() => setEditing(row)}>Edit</RowButton>
                  )
                }
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="accounts"
                onPageChange={(page) => {
                  setPicked([]);
                  paged.setPage(page);
                }}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        )}
      </PageShell>

      <ConfirmDialog
        open={confirmSend}
        title="Send Activation Invitations?"
        description={`${picked.length} selected account${picked.length === 1 ? '' : 's'} will receive an activation email. Emails are really sent and cannot be cancelled.`}
        confirmLabel="Send"
        tone="primary"
        loading={send.isPending}
        onConfirm={() => runSend(picked, false)}
        onOpenChange={setConfirmSend}
      />

      <ConfirmDialog
        open={Boolean(resending)}
        title="Resend Invitation?"
        description={
          resending
            ? `A new activation link will be sent to ${resending.email} (${resending.name}). The previous link stops working.`
            : undefined
        }
        confirmLabel="Resend"
        tone="primary"
        loading={send.isPending}
        onConfirm={() => resending && runSend([resending.id], true)}
        onOpenChange={(open) => !open && setResending(null)}
      />

      <EditInvitationModal row={editing} onClose={() => setEditing(null)} />
      <SendResultModal result={result} onClose={() => setResult(null)} />
      <StatusReferenceModal open={legendOpen} onClose={() => setLegendOpen(false)} />
    </>
  );
}
