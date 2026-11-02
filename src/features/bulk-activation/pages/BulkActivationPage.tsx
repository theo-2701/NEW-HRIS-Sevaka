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
import { EditAccountModal, InvitationBadge, SendSummaryModal } from '@/features/bulk-activation/components/BulkActivationModals';
import { usePendingAccounts, useSendInvitations } from '@/features/bulk-activation/hooks/useBulkActivation';
import { INVITATION_LABEL, MAX_SEND, canResend } from '@/features/bulk-activation/types';
import type { InvitationStatus, PendingAccount, SendSummary } from '@/features/bulk-activation/types';
import { formatDate } from '@/lib/format';
import { toast } from '@/store/ui.store';

/**
 * Employee Directory › Bulk Account Activation (TSD-001-AUTH 0.167 §14.2.1,
 * CATATAN-PERUBAHAN 12 Okt 2026). Pilihan dipertahankan lintas halaman (maks 500).
 */
export function BulkActivationPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<InvitationStatus | 'ALL'>('ALL');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ ids: string[]; force: boolean } | null>(null);
  const [summary, setSummary] = useState<SendSummary | null>(null);
  const [editing, setEditing] = useState<PendingAccount | null>(null);

  const query = usePendingAccounts({ search, status: status === 'ALL' ? undefined : status });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const paged = usePagedRows(rows);
  const send = useSendInvitations();
  const names = useMemo(() => Object.fromEntries(rows.map((row) => [row.employeeId, row.name])), [rows]);

  const pageIds = paged.rows.map((row) => row.employeeId);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));
  const toggle = (id: string, next: boolean) => {
    if (next && selected.length >= MAX_SEND) return toast(`Up to ${MAX_SEND} accounts per send.`, 'warn');
    setSelected(next ? [...selected, id] : selected.filter((item) => item !== id));
  };
  const togglePage = (next: boolean) =>
    setSelected(next ? [...new Set([...selected, ...pageIds])].slice(0, MAX_SEND) : selected.filter((id) => !pageIds.includes(id)));

  const doSend = () => {
    if (!confirm) return;
    send.mutate(confirm, {
      onSuccess: (data) => {
        setSummary(data);
        if (confirm.ids.length > 1) setSelected([]);
      },
      onSettled: () => setConfirm(null),
    });
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Employee Directory' }, { label: 'Bulk Account Activation' }]}
      title="Bulk Account Activation"
      description="Accounts created by Bulk Import wait here until their owner activates them. Send the activation link, fix a wrong email or phone, or resend an expired link."
    >
      <Card>
        <CardHead title="Pending accounts" sub="An account leaves this list once activated" />
        <div className="flex flex-col">
          <TableToolbar
            filters={
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as InvitationStatus | 'ALL');
                  paged.resetPage();
                }}
              >
                <SelectTrigger className="w-[180px]" aria-label="Invitation status filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {(Object.keys(INVITATION_LABEL) as InvitationStatus[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {INVITATION_LABEL[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            summary={selected.length ? `${selected.length} selected (max ${MAX_SEND})` : undefined}
            search={{
              value: search,
              onChange: (next) => {
                setSearch(next);
                paged.resetPage();
              },
              placeholder: 'Search name or email',
            }}
            actions={
              <Button disabled={!selected.length} onClick={() => setConfirm({ ids: selected, force: false })}>
                Send invitation ({selected.length})
              </Button>
            }
          />
          <DataTable<PendingAccount>
            rows={paged.rows}
            rowKey={(row) => row.employeeId}
            loading={query.isLoading}
            empty={search || status !== 'ALL' ? 'No account matches these criteria.' : 'No account is waiting for activation.'}
            columns={[
              {
                key: 'pick',
                header: <Checkbox aria-label="Select all on this page" checked={allOnPage} onCheckedChange={(next) => togglePage(next === true)} />,
                width: 'w-[52px]',
                render: (row) => (
                  <Checkbox
                    aria-label={`Select ${row.name}`}
                    checked={selected.includes(row.employeeId)}
                    onCheckedChange={(next) => toggle(row.employeeId, next === true)}
                  />
                ),
              },
              { key: 'name', header: 'Name', strong: true, render: (row) => row.name },
              { key: 'username', header: 'Username', muted: true, render: (row) => row.username },
              { key: 'email', header: 'Email', render: (row) => row.email },
              { key: 'phone', header: 'Phone', muted: true, render: (row) => row.phoneNumber },
              { key: 'status', header: 'Invitation', render: (row) => <InvitationBadge row={row} /> },
              {
                key: 'sent',
                header: 'Sent At',
                nowrap: true,
                muted: true,
                render: (row) => (row.invitationSentAt ? formatDate(row.invitationSentAt) : '—'),
              },
            ]}
            actions={(row) => (
              <RowActions
                actions={[
                  { label: 'Edit email or phone', onSelect: () => setEditing(row) },
                  ...(canResend(row.invitationStatus)
                    ? [{ label: 'Resend', onSelect: () => setConfirm({ ids: [row.employeeId], force: true }) }]
                    : []),
                ]}
              />
            )}
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="accounts"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.force
            ? `Resend the activation link to ${names[confirm.ids[0]] ?? 'this account'}?`
            : `Send activation links to ${confirm?.ids.length ?? 0} account(s)?`
        }
        description={
          confirm?.force
            ? 'The current link stops working and a new one is issued.'
            : 'Accounts whose current invitation is still valid are skipped — use Resend on those rows.'
        }
        confirmLabel={confirm?.force ? 'Resend' : 'Send'}
        cancelLabel="Cancel"
        tone="primary"
        loading={send.isPending}
        onOpenChange={(next) => !next && setConfirm(null)}
        onConfirm={doSend}
      />
      <SendSummaryModal summary={summary} names={names} onClose={() => setSummary(null)} />
      <EditAccountModal row={editing} onClose={() => setEditing(null)} />
    </PageShell>
  );
}
