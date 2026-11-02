import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RowActions, RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { employeeName } from '@/features/time-off/mock-data';
import {
  AtsDetailModal,
  AtsStatusBadge,
  InviteCandidateModal,
  MaterializeModal,
} from '@/features/ats-bridge/components/AtsModals';
import { useAtsCandidates, useDeleteAtsCandidate, useResendAtsLink } from '@/features/ats-bridge/hooks/useAtsBridge';
import { ATS_STATUS_LABEL, SOURCE_LABEL, canDelete, canMaterialize } from '@/features/ats-bridge/types';
import type { AtsCandidate, AtsRole, AtsSource, AtsStatus } from '@/features/ats-bridge/types';
import { formatDateTime } from '@/lib/format';

/**
 * Manpower Planning › ATS Bridge (TSD-001-EMPLOYEE 0.212 §7.4.12; CATATAN-PERUBAHAN
 * 19 Okt 2026 T6/T11/T40). Undang kandidat, kirim ulang tautan, hapus, dan jadikan
 * kandidat Bulk Import karyawan.
 */
export function AtsBridgePage() {
  const [role, setRole] = useState<AtsRole>('HR_MANAGER');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<AtsStatus | 'ALL'>('ALL');
  const [source, setSource] = useState<AtsSource | 'ALL'>('ALL');
  const [inviting, setInviting] = useState(false);
  const [detail, setDetail] = useState<AtsCandidate | null>(null);
  const [deleting, setDeleting] = useState<AtsCandidate | null>(null);
  const [materializing, setMaterializing] = useState<AtsCandidate | null>(null);

  const query = useAtsCandidates({
    keyword,
    status: status === 'ALL' ? undefined : status,
    source: source === 'ALL' ? undefined : source,
  });
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const paged = usePagedRows(rows);
  const resend = useResendAtsLink();
  const remove = useDeleteAtsCandidate(role);

  const rowActions = (row: AtsCandidate) => {
    const actions = [
      ...(canMaterialize(row) ? [{ label: 'Create employee', onSelect: () => setMaterializing(row) }] : []),
      ...(row.atsStatus === 'WAITING_CANDIDATE' ? [{ label: 'Resend link', onSelect: () => resend.mutate(row.id) }] : []),
      ...(canDelete(role, row) ? [{ label: 'Delete', danger: true, onSelect: () => setDeleting(row) }] : []),
    ];
    if (!actions.length) return <RowButton onClick={() => setDetail(row)}>Details</RowButton>;
    return <RowActions actions={[...actions, { label: 'Details', onSelect: () => setDetail(row) }]} />;
  };

  return (
    <PageShell
      crumbs={[{ label: 'Employee Management' }, { label: 'Manpower Planning' }, { label: 'ATS Bridge' }]}
      title="ATS Bridge"
      description="Candidates invited to fill in their own data, from ATS, New Joiner, or Bulk Import. Completed Bulk Import candidates become employees from here."
      actions={<Button onClick={() => setInviting(true)}>Invite candidate</Button>}
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
          <Select value={role} onValueChange={(value) => setRole(value as AtsRole)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
              <SelectItem value="HR_STAFF">HR Staff</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card>
          <CardHead title="Candidates" sub="Personal data is never shown on this screen" />
          <div className="flex flex-col">
            <TableToolbar
              filters={
                <>
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value as AtsStatus | 'ALL');
                      paged.resetPage();
                    }}
                  >
                    <SelectTrigger className="w-[210px]" aria-label="Status filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All statuses</SelectItem>
                      {(Object.keys(ATS_STATUS_LABEL) as AtsStatus[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {ATS_STATUS_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={source}
                    onValueChange={(value) => {
                      setSource(value as AtsSource | 'ALL');
                      paged.resetPage();
                    }}
                  >
                    <SelectTrigger className="w-[170px]" aria-label="Source filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All sources</SelectItem>
                      {(Object.keys(SOURCE_LABEL) as AtsSource[]).map((value) => (
                        <SelectItem key={value} value={value}>
                          {SOURCE_LABEL[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              }
              search={{
                value: keyword,
                onChange: (next) => {
                  setKeyword(next);
                  paged.resetPage();
                },
                placeholder: 'Search name or email',
              }}
            />
            <DataTable<AtsCandidate>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={query.isLoading}
              empty={keyword || status !== 'ALL' || source !== 'ALL' ? 'No candidate matches these criteria.' : 'No candidate yet.'}
              columns={[
                { key: 'email', header: 'Email', strong: true, render: (row) => row.candidateEmail },
                { key: 'name', header: 'Name', render: (row) => row.candidateName ?? '—' },
                { key: 'source', header: 'Source', muted: true, render: (row) => SOURCE_LABEL[row.source] },
                { key: 'status', header: 'Status', render: (row) => <AtsStatusBadge status={row.atsStatus} /> },
                {
                  key: 'consent',
                  header: 'Consent',
                  muted: true,
                  render: (row) => (row.consentStatus === 'AGREED' ? 'Agreed' : row.consentStatus === 'DECLINED' ? 'Declined' : '—'),
                },
                { key: 'requestor', header: 'Requestor', render: (row) => employeeName(row.requestorEmployeeId) },
                {
                  key: 'valid',
                  header: 'Link Valid Until',
                  nowrap: true,
                  muted: true,
                  render: (row) => (row.tokenExpiresAt ? formatDateTime(row.tokenExpiresAt) : '—'),
                },
              ]}
              actions={rowActions}
            />
            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="candidates"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
      </div>

      <InviteCandidateModal open={inviting} onClose={() => setInviting(false)} />
      <AtsDetailModal row={detail} onClose={() => setDetail(null)} />
      <MaterializeModal key={materializing?.id ?? 'none'} row={materializing} onClose={() => setMaterializing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this candidate?"
        description={
          deleting
            ? `${deleting.candidateEmail} — the link stops working. An email already received cannot be recalled.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={remove.isPending}
        onOpenChange={(next) => !next && setDeleting(null)}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSettled: () => setDeleting(null) })}
      />
    </PageShell>
  );
}
