import { useState } from 'react';
import { DatePicker } from '@/components/DatePicker';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Modal } from '@/components/Modal';
import { RowButton } from '@/components/RowActions';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { KeyValueList, KeyValueRow } from '@/features/time-off/components/TimeOffBits';
import { WfhStatusBadge } from '@/features/attendance/components/AttendanceBits';
import { useDecideWfh, useWfhPermissions } from '@/features/attendance/hooks/useAttendance';
import { employeeName } from '@/features/attendance/mock-data';
import { WFH_STATUS_LABEL, canDecideWfh } from '@/features/attendance/types';
import type { AttendanceSession, WfhPermission, WfhStatus } from '@/features/attendance/types';
import { formatDate, formatDateTime } from '@/lib/format';

/**
 * Izin WFH (FSD-TIME §11A · UIC-TIME §6.4). Bukan form pengajuan: barisnya lahir
 * otomatis saat karyawan berprofil WFO memilih Work from home di layar Punch.
 * Approve/Reject tampil hanya bila pemanggil boleh memutus (`can_decide`).
 */
export function WfhPermissionPanel({ session }: { session: AttendanceSession }) {
  const [status, setStatus] = useState<WfhStatus | 'ALL'>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState<WfhPermission | null>(null);
  const { data: rows = [], isLoading } = useWfhPermissions(session, {
    requestStatus: status === 'ALL' ? undefined : status,
    from,
    to,
  });
  const paged = usePagedRows(rows);

  return (
    <>
      <Card>
        <CardHead title="WFH Permission" sub="Lahir dari tap WFH berprofil WFO — absen tetap sah apa pun keputusannya" />
        <div className="flex flex-col">
          <TableToolbar
            filters={
              <>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    setStatus(value as WfhStatus | 'ALL');
                    paged.resetPage();
                  }}
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    {(Object.keys(WFH_STATUS_LABEL) as WfhStatus[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {WFH_STATUS_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Satu filter rentang tanggal kerja — dua kotak. */}
                <DatePicker
                  className="w-[170px]"
                  value={from}
                  max={to || undefined}
                  placeholder="Work date from"
                  onChange={(value) => {
                    setFrom(value);
                    paged.resetPage();
                  }}
                />
                <DatePicker
                  className="w-[170px]"
                  value={to}
                  min={from || undefined}
                  placeholder="Work date to"
                  onChange={(value) => {
                    setTo(value);
                    paged.resetPage();
                  }}
                />
              </>
            }
          />
          <DataTable<WfhPermission>
            rows={paged.rows}
            rowKey={(row) => row.id}
            loading={isLoading}
            empty="No WFH permission yet. One is opened when a WFO-profile employee taps from home."
            columns={[
              { key: 'date', header: 'Work Date', nowrap: true, render: (row) => formatDate(row.workDate) },
              { key: 'employee', header: 'Employee', strong: true, render: (row) => employeeName(row.employeeId) },
              { key: 'status', header: 'Status', render: (row) => <WfhStatusBadge status={row.requestStatus} /> },
              { key: 'due', header: 'Due At', nowrap: true, muted: true, render: (row) => formatDateTime(row.dueAt) },
              {
                key: 'decided',
                header: 'Decided At',
                nowrap: true,
                muted: true,
                render: (row) => (row.decidedAt ? formatDateTime(row.decidedAt) : '—'),
              },
            ]}
            actions={(row) => <RowButton onClick={() => setOpen(row)}>View Detail</RowButton>}
          />
          <Pagination
            page={paged.page}
            pageSize={paged.pageSize}
            total={paged.total}
            noun="permissions"
            onPageChange={paged.setPage}
            onPageSizeChange={paged.setPageSize}
          />
        </div>
      </Card>

      <WfhDetailModal row={open} session={session} onClose={() => setOpen(null)} />
    </>
  );
}

function WfhDetailModal({
  row,
  session,
  onClose,
}: {
  row: WfhPermission | null;
  session: AttendanceSession;
  onClose: () => void;
}) {
  const decide = useDecideWfh(session);
  if (!row) return null;
  const canDecide = canDecideWfh(session, row);
  const submit = (decision: 'APPROVED' | 'REJECTED') =>
    decide.mutate({ id: row.id, decision }, { onSuccess: onClose });

  return (
    <Modal
      open
      onOpenChange={(next) => !next && onClose()}
      title={`WFH permission — ${employeeName(row.employeeId)}`}
      description="Satu atasan setuju sudah cukup; Reject baru final bila semua atasan menolak. Tanpa keputusan dalam tiga hari, izin habis waktu."
      footer={
        canDecide ? (
          <>
            <Button variant="danger" disabled={decide.isPending} onClick={() => submit('REJECTED')}>
              Reject
            </Button>
            <Button disabled={decide.isPending} onClick={() => submit('APPROVED')}>
              {decide.isPending ? 'Memproses…' : 'Approve'}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        )
      }
    >
      <KeyValueList>
        <KeyValueRow label="Employee">{employeeName(row.employeeId)}</KeyValueRow>
        <KeyValueRow label="Work date">{formatDate(row.workDate)}</KeyValueRow>
        <KeyValueRow label="Status">
          <WfhStatusBadge status={row.requestStatus} />
        </KeyValueRow>
        <KeyValueRow label="Due at">{formatDateTime(row.dueAt)}</KeyValueRow>
        <KeyValueRow label="Decided">
          {row.decidedAt ? `${formatDateTime(row.decidedAt)} · ${employeeName(row.decidedBy ?? '')}` : '—'}
        </KeyValueRow>
        <KeyValueRow label="Punch">{row.punchId}</KeyValueRow>
      </KeyValueList>
    </Modal>
  );
}
