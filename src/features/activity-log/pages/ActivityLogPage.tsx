import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { DatePicker } from '@/components/DatePicker';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActivityLog } from '@/features/activity-log/hooks/useActivityLog';
import {
  ACTIVITY_FAMILY_OPTIONS,
  IDENTIFIER_TYPE_LABEL,
  LOGOUT_SCOPE_LABEL,
  type ActivityFamily,
  type ActivityLogRow,
  type ForceLogoutLog,
  type LoginAttemptLog,
  type OtpAttemptLog,
  type SwitchCompanyLog,
} from '@/features/activity-log/types';
import { formatDateTime } from '@/lib/format';

const EMPTY = 'No activity logs found.';
const dash = (value: string | null) => value || '—';

function ResultBadge({ success }: { success: boolean }) {
  return <StatusBadge tone={success ? 'ok' : 'err'}>{success ? 'Success' : 'Failed'}</StatusBadge>;
}

const LOGIN_COLUMNS: Column<LoginAttemptLog>[] = [
  { key: 'at', header: 'Attempted At', nowrap: true, render: (row) => formatDateTime(row.attemptedAt) },
  { key: 'identifier', header: 'Identifier', strong: true, render: (row) => row.attemptedIdentifier },
  { key: 'type', header: 'Type', muted: true, render: (row) => IDENTIFIER_TYPE_LABEL[row.identifierType] },
  { key: 'company', header: 'Company', render: (row) => row.companyCode },
  { key: 'result', header: 'Result', render: (row) => <ResultBadge success={row.isSuccess} /> },
  { key: 'reason', header: 'Failure Reason', muted: true, render: (row) => dash(row.failureReason) },
  { key: 'ip', header: 'IP Address', muted: true, nowrap: true, render: (row) => dash(row.ipAddress) },
];

const OTP_COLUMNS: Column<OtpAttemptLog>[] = [
  { key: 'at', header: 'Created At', nowrap: true, render: (row) => formatDateTime(row.createdAt) },
  { key: 'identifier', header: 'Identifier', strong: true, render: (row) => row.identifier },
  { key: 'channel', header: 'Channel', render: (row) => (row.channel === 'EMAIL' ? 'Email' : 'WhatsApp') },
  { key: 'type', header: 'OTP Type', muted: true, render: (row) => row.otpType },
  {
    key: 'status',
    header: 'Status',
    render: (row) => (
      <StatusBadge tone={row.notificationStatus === 'SENT' ? 'ok' : 'err'}>{row.notificationStatus}</StatusBadge>
    ),
  },
  { key: 'reason', header: 'Failure Reason', muted: true, render: (row) => dash(row.failureReason) },
];

const SWITCH_COLUMNS: Column<SwitchCompanyLog>[] = [
  { key: 'at', header: 'Switched At', nowrap: true, render: (row) => formatDateTime(row.switchedAt) },
  { key: 'from', header: 'From', strong: true, render: (row) => row.fromCompanyCode },
  { key: 'to', header: 'To', strong: true, render: (row) => row.toCompanyCode },
  { key: 'result', header: 'Result', render: (row) => <ResultBadge success={row.isSuccess} /> },
  { key: 'reason', header: 'Failure Reason', muted: true, render: (row) => dash(row.failureReason) },
];

const FORCE_LOGOUT_COLUMNS: Column<ForceLogoutLog>[] = [
  { key: 'at', header: 'Triggered At', nowrap: true, render: (row) => formatDateTime(row.triggeredAt) },
  { key: 'by', header: 'Triggered By', render: (row) => dash(row.triggeredByName) },
  { key: 'target', header: 'Target Employee', strong: true, render: (row) => row.targetEmployeeId },
  { key: 'scope', header: 'Scope', render: (row) => LOGOUT_SCOPE_LABEL[row.logoutScope] },
  { key: 'reason', header: 'Reason', muted: true, render: (row) => row.reason },
];

function FamilyTable({ family, rows, loading }: { family: ActivityFamily; rows: ActivityLogRow[]; loading: boolean }) {
  const shared = { rowKey: (row: { id: string }) => row.id, loading, empty: EMPTY };
  switch (family) {
    case 'login-attempts':
      return <DataTable<LoginAttemptLog> {...shared} columns={LOGIN_COLUMNS} rows={rows as LoginAttemptLog[]} />;
    case 'otp-attempts':
      return <DataTable<OtpAttemptLog> {...shared} columns={OTP_COLUMNS} rows={rows as OtpAttemptLog[]} />;
    case 'switch-company-logs':
      return <DataTable<SwitchCompanyLog> {...shared} columns={SWITCH_COLUMNS} rows={rows as SwitchCompanyLog[]} />;
    case 'force-logout-logs':
      return <DataTable<ForceLogoutLog> {...shared} columns={FORCE_LOGOUT_COLUMNS} rows={rows as ForceLogoutLog[]} />;
  }
}

/**
 * Company Management › Activity Log (FSD-001-AUTH §5 · UIC-001-AUTH §8).
 *
 * Satu layar untuk empat famili log: dropdown Jenis mengganti alamat
 * `POST /audit/{family}/search` sekaligus kolom tabel. Famili kelima
 * (`access-menu-history`) sengaja tidak dijangkau layar ini.
 */
export function ActivityLogPage() {
  const [family, setFamily] = useState<ActivityFamily>('login-attempts');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const { data, isLoading } = useActivityLog(family, {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    size,
  });

  const familyLabel = ACTIVITY_FAMILY_OPTIONS.find((option) => option.value === family)?.label ?? '';
  const hasDateFilter = Boolean(startDate || endDate);

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'Activity Log' }]}
      title="Activity Log"
      description="Riwayat percobaan login, pengiriman OTP, perpindahan perusahaan, dan force logout di perusahaan ini."
    >
      <Card>
        <CardHead title={familyLabel} sub="Terbaru di atas" />

        <div className="flex flex-col">
          <TableToolbar
            filters={
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex w-[200px] flex-col gap-1">
                  <Label htmlFor="activity-family">Jenis</Label>
                  <Select
                    value={family}
                    onValueChange={(value) => changeFilter(() => setFamily(value as ActivityFamily))}
                  >
                    <SelectTrigger id="activity-family">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_FAMILY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex w-[180px] flex-col gap-1">
                  <Label>Dari Tanggal</Label>
                  <DatePicker
                    value={startDate}
                    max={endDate || undefined}
                    placeholder="Tanggal awal"
                    onChange={(value) => changeFilter(() => setStartDate(value))}
                  />
                </div>
                <div className="flex w-[180px] flex-col gap-1">
                  <Label>Sampai Tanggal</Label>
                  <DatePicker
                    value={endDate}
                    min={startDate || undefined}
                    placeholder="Tanggal akhir"
                    onChange={(value) => changeFilter(() => setEndDate(value))}
                  />
                </div>
                {hasDateFilter && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      changeFilter(() => {
                        setStartDate('');
                        setEndDate('');
                      })
                    }
                  >
                    Reset
                  </Button>
                )}
              </div>
            }
          />

          <FamilyTable family={family} rows={data?.rows ?? []} loading={isLoading} />

          <Pagination
            page={page}
            pageSize={size}
            total={data?.totalData ?? 0}
            noun="logs"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setSize(next);
              setPage(1);
            }}
          />
        </div>
      </Card>
    </PageShell>
  );
}
