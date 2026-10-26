import { useMemo, useState } from 'react';
import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { ExternalLink, Lock, TriangleAlert } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHead } from '@/components/Card';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CellIdentity, DataTable, SelectionBar } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { PageShell } from '@/components/PageShell';
import { Pagination } from '@/components/Pagination';
import { RowActions, RowButton } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { SelectField } from '@/components/form/SelectField';
import { TextAreaField } from '@/components/form/TextAreaField';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { formatDateTime } from '@/lib/format';
import { Note } from '@/features/time-off/components/TimeOffBits';
import {
  contactVerificationService,
  previewVerificationLink,
} from '@/features/contact-verification/services/contact-verification.service';
import {
  CANCEL_REASON_LABEL,
  CHANNEL_LABEL,
  CHANNEL_MEANING,
  CHANNEL_TONE,
  MAX_PER_SEND,
  canSend,
  canVerifyContacts,
} from '@/features/contact-verification/types';
import type {
  CancelReason,
  Channel,
  ChannelStatus,
  ContactVerification,
  SendResult,
  VerificationShow,
} from '@/features/contact-verification/types';
import { MOCK } from '@/services/mock';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/store/ui.store';

const KEYS = ['contact-verification'] as const;
const CHANNEL_NAME: Record<Channel, string> = { EMAIL: 'email', PHONE: 'WhatsApp' };

function ChannelBadge({ status, expiresAt }: { status: ChannelStatus; expiresAt: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <StatusBadge tone={CHANNEL_TONE[status]}>{CHANNEL_LABEL[status]}</StatusBadge>
      {status === 'SENT' && expiresAt && (
        <span className="font-body text-[11.5px] font-medium text-fg-3">Until {formatDateTime(expiresAt)}</span>
      )}
    </div>
  );
}

function StatusReference({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Verification statuses"
      size="wide"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <DataTable<{ status: ChannelStatus }>
        rows={(Object.keys(CHANNEL_LABEL) as ChannelStatus[]).map((status) => ({ status }))}
        rowKey={(item) => item.status}
        columns={[
          {
            key: 'status',
            header: 'Status',
            nowrap: true,
            render: (item) => <StatusBadge tone={CHANNEL_TONE[item.status]}>{CHANNEL_LABEL[item.status]}</StatusBadge>,
          },
          { key: 'meaning', header: 'Meaning', render: (item) => CHANNEL_MEANING[item.status] },
        ]}
      />
    </Modal>
  );
}

/** Hasil kirim: "Links sent: N. Skipped: M." + alasan; mode dummy menyertakan pratinjau tautan. */
function ResultModal({
  result,
  onClose,
}: {
  result: (SendResult & { channel: Channel; ids: string[] }) | null;
  onClose: () => void;
}) {
  const preview = MOCK && result?.ids.length === 1 && result.sent === 1 ? previewVerificationLink(result.ids[0], result.channel) : null;
  return (
    <Modal open={Boolean(result)} onOpenChange={(next) => !next && onClose()} title="Links sent" footer={<Button onClick={onClose}>Close</Button>}>
      {result && (
        <div className="flex flex-col gap-3">
          <p className="m-0 font-body text-[13px] leading-[1.5] text-fg-2">
            Links sent: {result.sent}. Skipped: {result.skipped.length}.
          </p>
          {result.skipped.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {result.skipped.map((item) => (
                <li key={item.id} className="font-body text-[13px] leading-[1.45] text-fg-2">
                  <strong className="font-semibold text-fg-1">{item.name}</strong> — {item.reason}
                </li>
              ))}
            </ul>
          )}
          {preview && (
            <Note icon={<ExternalLink />}>
              Demo mode: the employee receives this link.{' '}
              <a href={preview} target="_blank" rel="noreferrer" className="font-semibold underline">
                Open the verification page
              </a>
            </Note>
          )}
        </div>
      )}
    </Modal>
  );
}

const cancelSchema = Yup.object({
  reason: Yup.string().required('Choose the reason.'),
  details: Yup.string()
    .max(500, 'At most 500 characters.')
    .when('reason', {
      is: 'OTHER',
      then: (schema) => schema.trim().required('Required when the reason is Other.'),
      otherwise: (schema) => schema,
    }),
});

/** EPV-CANCEL — Cancel access (FSD 0.83 §14.4). */
function CancelAccessModal({ row, onClose }: { row: ContactVerification | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: ({ reason, details }: { reason: CancelReason; details: string }) =>
      contactVerificationService.cancelAccess(row!.id, reason, details),
    onSuccess: () => {
      toast(`Access of ${row?.name} was cancelled. An offboarding was started for approval.`, 'ok');
      void queryClient.invalidateQueries({ queryKey: KEYS });
      onClose();
    },
    onError: (error: Error) => toast(error.message || 'The access could not be cancelled.', 'danger'),
  });
  return (
    <Formik<{ reason: CancelReason | ''; details: string }>
      initialValues={{ reason: '', details: '' }}
      enableReinitialize
      validationSchema={cancelSchema}
      onSubmit={(values) => cancel.mutate({ reason: values.reason as CancelReason, details: values.details })}
    >
      {({ submitForm, values }) => (
        <Modal
          open={Boolean(row)}
          onOpenChange={(next) => !next && onClose()}
          title="Cancel access"
          description={row?.name}
          footer={
            <>
              <Button variant="secondary" onClick={onClose}>
                Keep access
              </Button>
              <Button variant="danger" onClick={submitForm} disabled={cancel.isPending}>
                {cancel.isPending ? 'Cancelling…' : 'Cancel access'}
              </Button>
            </>
          }
        >
          <Form className="flex flex-col gap-4">
            <Note tone="warn" icon={<TriangleAlert />}>
              This ends the employee's access to SEVAKA right away and starts an offboarding for them. The offboarding
              follows the normal approval, and any verification link that is still open stops working. This cannot be
              undone from this screen.
            </Note>
            <SelectField
              name="reason"
              label="Reason"
              required
              placeholder="Select a reason"
              options={(Object.keys(CANCEL_REASON_LABEL) as CancelReason[]).map((value) => ({ value, label: CANCEL_REASON_LABEL[value] }))}
            />
            <TextAreaField
              name="details"
              label="Details"
              required={values.reason === 'OTHER'}
              rows={4}
              maxLength={500}
              hint={values.reason === 'OTHER' ? 'Required when the reason is Other.' : 'Optional.'}
            />
          </Form>
        </Modal>
      )}
    </Formik>
  );
}

/**
 * Employee Directory › Email and Phone Verification — FSD-001-EMPLOYEE 0.83 §14. Aktor: HR Staff · HR Manager.
 * Karyawan baru masuk dengan email pribadi; email kantor dan nomor HP baru dipakai masuk sesudah terbukti.
 */
export function ContactVerificationPage() {
  const role = useAuthStore((s) => s.user?.role);
  const allowed = canVerifyContacts(role);
  const queryClient = useQueryClient();

  const [keyword, setKeyword] = useState('');
  const [show, setShow] = useState<VerificationShow>('ALL');
  const filter = useMemo(() => ({ keyword, show }), [keyword, show]);
  const { data, isLoading, isError } = useQuery({
    queryKey: [...KEYS, filter],
    queryFn: () => contactVerificationService.search(filter),
    enabled: allowed,
  });
  const rows = useMemo(() => data ?? [], [data]);
  const paged = usePagedRows(rows);
  const filtered = keyword || show !== 'ALL';

  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) => setPicked((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  const toggleAll = () =>
    setPicked((prev) => (paged.rows.every((row) => prev.includes(row.id)) ? [] : paged.rows.map((row) => row.id)));
  const tooMany = picked.length > MAX_PER_SEND;

  const [confirm, setConfirm] = useState<{ channel: Channel; ids: string[]; label: string } | null>(null);
  const [result, setResult] = useState<(SendResult & { channel: Channel; ids: string[] }) | null>(null);
  const [cancelling, setCancelling] = useState<ContactVerification | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);

  const send = useMutation({
    mutationFn: ({ channel, ids }: { channel: Channel; ids: string[] }) => contactVerificationService.send(channel, ids),
    onSuccess: (res, vars) => {
      setPicked([]);
      setConfirm(null);
      setResult({ ...res, ...vars });
      void queryClient.invalidateQueries({ queryKey: KEYS });
    },
    onError: (error: Error) => {
      setConfirm(null);
      toast(error.message, 'danger');
    },
  });

  const askSend = (channel: Channel, ids: string[]) => {
    const one = ids.length === 1 ? rows.find((row) => row.id === ids[0]) : null;
    setConfirm({ channel, ids, label: one ? one.name : `${ids.length} employees` });
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Email and Phone Verification' }]}
        title="Email and Phone Verification"
        description="New employees sign in with their personal email until they prove their company email and phone number. Send each of them a link; a row leaves the list once both are verified."
      >
        {!allowed ? (
          <Note tone="warn" icon={<Lock />}>
            This menu is available to HR Staff and HR Manager.
          </Note>
        ) : (
          <Card>
            <CardHead title="Waiting for verification" sub={`${rows.length} employees · newest first`} />
            <div className="flex flex-col">
              <TableToolbar
                filters={
                  <Select
                    value={show}
                    onValueChange={(value) => {
                      setShow(value as VerificationShow);
                      paged.resetPage();
                    }}
                  >
                    <SelectTrigger className="h-10 w-[250px]" aria-label="Show">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All unverified</SelectItem>
                      <SelectItem value="EMAIL_PENDING">Company email not verified</SelectItem>
                      <SelectItem value="PHONE_PENDING">Phone number not verified</SelectItem>
                    </SelectContent>
                  </Select>
                }
                search={{
                  value: keyword,
                  onChange: (value) => {
                    setKeyword(value.slice(0, 100));
                    paged.resetPage();
                  },
                  placeholder: 'Search name, NIK, username or company email',
                }}
              />
              {tooMany && (
                <Note tone="warn" icon={<Lock />}>
                  {picked.length} selected. Send at most {MAX_PER_SEND} at a time.
                </Note>
              )}
              <DataTable<ContactVerification>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty={
                  isError
                    ? 'The verification list could not be loaded.'
                    : filtered
                      ? 'No employees match the current filter.'
                      : 'No employees are waiting for verification.'
                }
                selectionBar={
                  picked.length > 0 ? (
                    <SelectionBar count={picked.length} total={paged.rows.length} onToggleAll={toggleAll}>
                      <RowButton variant="primary" disabled={tooMany} onClick={() => askSend('EMAIL', picked)}>
                        Send Email Links
                      </RowButton>
                      <RowButton disabled={tooMany} onClick={() => askSend('PHONE', picked)}>
                        Send WhatsApp Links
                      </RowButton>
                      <RowButton onClick={() => setPicked([])}>Clear Selection</RowButton>
                    </SelectionBar>
                  ) : null
                }
                columns={[
                  {
                    key: 'employee',
                    header: 'Employee',
                    render: (row) => (
                      <span className="flex items-center gap-3">
                        <Checkbox aria-label={`Select ${row.name}`} checked={picked.includes(row.id)} onCheckedChange={() => toggle(row.id)} />
                        <CellIdentity name={row.name} sub={`${row.nik} · ${row.username}`} />
                      </span>
                    ),
                  },
                  { key: 'email', header: 'Company Email', render: (row) => row.companyEmail },
                  {
                    key: 'emailStatus',
                    header: 'Email Status',
                    info: { label: 'Status reference', onClick: () => setLegendOpen(true) },
                    render: (row) => <ChannelBadge status={row.emailStatus} expiresAt={row.emailExpiresAt} />,
                  },
                  { key: 'phone', header: 'Phone Number', nowrap: true, muted: true, render: (row) => row.phoneMasked },
                  {
                    key: 'phoneStatus',
                    header: 'Phone Status',
                    render: (row) => <ChannelBadge status={row.phoneStatus} expiresAt={row.phoneExpiresAt} />,
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      ...(canSend(row.emailStatus)
                        ? [{ label: row.emailStatus === 'NOT_SENT' ? 'Send Email Link' : 'Resend Email Link', onSelect: () => askSend('EMAIL', [row.id]) }]
                        : []),
                      ...(canSend(row.phoneStatus)
                        ? [{ label: row.phoneStatus === 'NOT_SENT' ? 'Send WhatsApp Link' : 'Resend WhatsApp Link', onSelect: () => askSend('PHONE', [row.id]) }]
                        : []),
                      { label: 'Cancel Access', danger: true, onSelect: () => setCancelling(row) },
                    ]}
                  />
                )}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="employees"
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
        open={Boolean(confirm)}
        title={confirm ? `Send ${CHANNEL_NAME[confirm.channel]} link${confirm.ids.length > 1 ? 's' : ''}?` : ''}
        description={
          confirm
            ? `A ${CHANNEL_NAME[confirm.channel]} verification link is sent to ${confirm.label}. The link works for 24 hours. A link sent earlier stops working.`
            : undefined
        }
        confirmLabel="Send"
        tone="primary"
        loading={send.isPending}
        onOpenChange={(open) => !open && setConfirm(null)}
        onConfirm={() => confirm && send.mutate({ channel: confirm.channel, ids: confirm.ids })}
      />
      <ResultModal result={result} onClose={() => setResult(null)} />
      <CancelAccessModal row={cancelling} onClose={() => setCancelling(null)} />
      <StatusReference open={legendOpen} onClose={() => setLegendOpen(false)} />
    </>
  );
}
