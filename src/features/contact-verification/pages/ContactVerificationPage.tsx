import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActions } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import {
  CancelAccessModal,
  ChannelBadge,
  SendResultModal,
} from '@/features/contact-verification/components/ContactModals';
import { useContactQueue, useSendLinks } from '@/features/contact-verification/hooks/useContactVerification';
import { KIND_LABEL, MAX_SELECTION, isPending } from '@/features/contact-verification/types';
import type { ContactKind, ContactVerification, QueueFilter, SendResult } from '@/features/contact-verification/types';
import { formatDate } from '@/lib/format';
import { toast } from '@/store/ui.store';

const FILTER_LABEL: Record<QueueFilter, string> = {
  ALL: 'All pending',
  EMAIL_PENDING: 'Email pending',
  PHONE_PENDING: 'Phone pending',
};

/**
 * Employee Directory › Email and Phone Verification (TSD-001-EMPLOYEE 0.212 §7.20,
 * CATATAN-PERUBAHAN 22 Okt 2026 T60). Antrean karyawan baru yang email kantor /
 * nomor HP-nya belum terbukti; baris hilang sendiri setelah keduanya terbukti.
 */
export function ContactVerificationPage() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<QueueFilter>('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmSend, setConfirmSend] = useState<{ kind: ContactKind; ids: string[] } | null>(null);
  const [result, setResult] = useState<{ kind: ContactKind; data: SendResult } | null>(null);
  const [cancelling, setCancelling] = useState<ContactVerification | null>(null);

  const query = useContactQueue({ keyword, status });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const paged = usePagedRows(rows);
  const send = useSendLinks();
  const names = useMemo(() => Object.fromEntries(rows.map((row) => [row.id, row.employeeName])), [rows]);

  // Pilihan yang sudah tak ada di antrean (terverifikasi/dibatalkan) dibuang otomatis.
  const live = selected.filter((id) => rows.some((row) => row.id === id));
  const pageIds = paged.rows.map((row) => row.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => live.includes(id));

  const toggle = (id: string, next: boolean) => {
    if (next && live.length >= MAX_SELECTION) {
      toast(`You can select up to ${MAX_SELECTION} employees per send.`, 'warn');
      return;
    }
    setSelected(next ? [...live, id] : live.filter((item) => item !== id));
  };
  const togglePage = (next: boolean) =>
    setSelected(next ? [...new Set([...live, ...pageIds])].slice(0, MAX_SELECTION) : live.filter((id) => !pageIds.includes(id)));

  const doSend = () => {
    if (!confirmSend) return;
    const { kind, ids } = confirmSend;
    send.mutate(
      { kind, ids },
      {
        onSuccess: (data) => {
          setResult({ kind, data });
          setSelected([]);
        },
        onSettled: () => setConfirmSend(null),
      },
    );
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Email and Phone Verification' }]}
      title="Email and Phone Verification"
      description="New employees whose company email or phone number is not proven yet. The owner confirms each one through a link; an employee leaves this list once both are verified."
    >
      <Card>
        <CardHead title="Verification queue" sub="Phone numbers are always masked" />
        <div className="flex flex-col">
          <TableToolbar
            filters={
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as QueueFilter);
                  paged.resetPage();
                }}
              >
                <SelectTrigger className="w-[180px]" aria-label="Status filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FILTER_LABEL) as QueueFilter[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {FILTER_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            summary={live.length ? `${live.length} selected (max ${MAX_SELECTION})` : undefined}
            search={{
              value: keyword,
              onChange: (next) => {
                setKeyword(next);
                paged.resetPage();
              },
              placeholder: 'Search name or email',
            }}
            actions={
              <>
                <Button variant="secondary" disabled={!live.length} onClick={() => setConfirmSend({ kind: 'EMAIL', ids: live })}>
                  Send email link ({live.length})
                </Button>
                <Button variant="secondary" disabled={!live.length} onClick={() => setConfirmSend({ kind: 'PHONE', ids: live })}>
                  Send WhatsApp link ({live.length})
                </Button>
              </>
            }
          />
          <DataTable<ContactVerification>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={query.isLoading}
            empty={keyword || status !== 'ALL' ? 'No employee matches these criteria.' : 'Everyone is verified. Nothing waiting.'}
            columns={[
              {
                key: 'pick',
                header: (
                  <Checkbox
                    aria-label="Select all on this page"
                    checked={allOnPage}
                    onCheckedChange={(next) => togglePage(next === true)}
                  />
                ),
                width: 'w-[52px]',
                render: (row) => (
                  <Checkbox
                    aria-label={`Select ${row.employeeName}`}
                    checked={live.includes(row.id)}
                    onCheckedChange={(next) => toggle(row.id, next === true)}
                  />
                ),
              },
              { key: 'name', header: 'Employee', strong: true, render: (row) => row.employeeName },
              { key: 'email', header: 'Company Email', render: (row) => row.companyEmail ?? '—' },
              { key: 'emailStatus', header: 'Email', render: (row) => <ChannelBadge status={row.emailStatus} /> },
              { key: 'phone', header: 'Phone', muted: true, render: (row) => row.phoneMasked ?? '—' },
              { key: 'phoneStatus', header: 'WhatsApp', render: (row) => <ChannelBadge status={row.phoneStatus} /> },
              { key: 'join', header: 'Join Date', nowrap: true, render: (row) => formatDate(row.joinDate) },
            ]}
            actions={(row) => (
              <RowActions
                actions={[
                  ...(isPending(row.emailStatus)
                    ? [{ label: row.emailStatus === 'NOT_SENT' ? 'Send email link' : 'Resend email link', onSelect: () => setConfirmSend({ kind: 'EMAIL' as const, ids: [row.id] }) }]
                    : []),
                  ...(isPending(row.phoneStatus)
                    ? [{ label: row.phoneStatus === 'NOT_SENT' ? 'Send WhatsApp link' : 'Resend WhatsApp link', onSelect: () => setConfirmSend({ kind: 'PHONE' as const, ids: [row.id] }) }]
                    : []),
                  { label: 'Cancel access', danger: true, onSelect: () => setCancelling(row) },
                ]}
              />
            )}
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="employees"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(confirmSend)}
        title={confirmSend ? `Send ${KIND_LABEL[confirmSend.kind]} to ${confirmSend.ids.length} employee(s)?` : ''}
        description="Any earlier link for the same channel stops working immediately. Employees already verified on that channel are skipped."
        confirmLabel="Send"
        cancelLabel="Cancel"
        tone="primary"
        loading={send.isPending}
        onOpenChange={(next) => !next && setConfirmSend(null)}
        onConfirm={doSend}
      />
      <SendResultModal result={result?.data ?? null} kind={result?.kind ?? 'EMAIL'} names={names} onClose={() => setResult(null)} />
      <CancelAccessModal row={cancelling} onClose={() => setCancelling(null)} />
    </PageShell>
  );
}
