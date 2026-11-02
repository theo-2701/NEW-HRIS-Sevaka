import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccessNote, LoadErrorBanner, RolePicker } from '@/features/system-log/components/SystemLogBits';
import { useErrorCodeSearch } from '@/features/system-log/hooks/useSystemLog';
import { HOUR, errorCodeProblem } from '@/features/system-log/types';
import type { LogRow, SystemLogRole } from '@/features/system-log/types';
import { ApiError } from '@/services/api';

/** Nilai `datetime-local` waktu setempat (tanpa detik). */
const local = (date: Date) => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
};

/**
 * Company Management › System Log › Error Code (TSD-AUTH §14.6). Kode + rentang ≤ 24 jam
 * (bawaan 1 jam terakhir, ≤ 7 hari lalu) ⇒ kejadian terbaru di atas, maks 500; Trace ID
 * tertaut ke menu Trace ID.
 */
export function ErrorCodePage() {
  const [role, setRole] = useState<SystemLogRole>('SUPER_ADMIN');
  const [code, setCode] = useState('');
  const [from, setFrom] = useState(() => local(new Date(Date.now() - HOUR)));
  const [to, setTo] = useState(() => local(new Date()));
  const [problem, setProblem] = useState<string | null>(null);
  const [criteria, setCriteria] = useState<{ code: string; from: string; to: string } | null>(null);
  const query = useErrorCodeSearch(role, role === 'SUPER_ADMIN' ? criteria : null);
  const loadError = query.error instanceof ApiError && ![403, 422].includes(query.error.status);

  const search = () => {
    const issue = errorCodeProblem(code, new Date(from), new Date(to));
    setProblem(issue);
    if (!issue) setCriteria({ code: code.trim().toUpperCase(), from, to });
  };

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'System Log' }, { label: 'Error Code' }]}
      title="Error Code"
      description="Find where an error code occurred. The range is at most 24 hours and no older than 7 days."
      actions={<RolePicker value={role} onChange={setRole} />}
    >
      {role !== 'SUPER_ADMIN' ? (
        <AccessNote />
      ) : (
        <Card>
          <CardHead title="Occurrences" sub="Newest first · up to 500 · open a Trace ID to read the whole flow" />
          <form
            className="mb-4 flex flex-col gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              search();
            }}
          >
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="flex w-[200px] flex-col gap-1">
                <Label htmlFor="error-code">
                  Error code<em>*</em>
                </Label>
                <Input
                  id="error-code"
                  value={code}
                  autoComplete="off"
                  className="font-mono uppercase"
                  placeholder="e.g. EMP-DEP-725"
                  aria-invalid={Boolean(problem)}
                  aria-describedby={problem ? 'error-code-desc' : undefined}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              <div className="flex w-[220px] flex-col gap-1">
                <Label htmlFor="from">From</Label>
                <Input id="from" type="datetime-local" value={from} onChange={(event) => setFrom(event.target.value)} />
              </div>
              <div className="flex w-[220px] flex-col gap-1">
                <Label htmlFor="to">To</Label>
                <Input id="to" type="datetime-local" value={to} onChange={(event) => setTo(event.target.value)} />
              </div>
              <Button type="submit" disabled={query.isFetching}>
                {query.isFetching ? 'Searching…' : 'Search'}
              </Button>
            </div>
            {problem && (
              <span id="error-code-desc" role="alert" className="font-body text-xs font-medium text-error-600">
                {problem}
              </span>
            )}
          </form>

          {loadError && <LoadErrorBanner onRetry={() => void query.refetch()} retrying={query.isFetching} />}
          {query.data?.isTruncated && (
            <p className="mb-2 font-body text-xs font-medium text-fg-3">Showing the newest 500 occurrences only.</p>
          )}
          {criteria && (
            <DataTable<LogRow>
              rows={query.data?.rows ?? []}
              rowKey={(row) => `${row.occurredAt}-${row.instance}-${row.message}`}
              loading={query.isLoading}
              empty={loadError ? null : 'No occurrences of this error code in the selected range.'}
              columns={[
                { key: 'at', header: 'Time', nowrap: true, render: (row) => row.occurredAt.replace('T', ' ').slice(0, 19) },
                { key: 'service', header: 'Service', nowrap: true, render: (row) => row.service },
                {
                  key: 'message',
                  header: 'Message',
                  render: (row) => <span className="block w-[420px] whitespace-normal break-all font-mono text-xs">{row.message}</span>,
                },
                {
                  key: 'trace',
                  header: 'Trace ID',
                  nowrap: true,
                  render: (row) =>
                    row.traceId ? (
                      <Link
                        to={`/company-management/system-log/trace-id?trace_id=${row.traceId}`}
                        className="font-mono text-xs text-secondary-600 underline-offset-2 hover:underline"
                      >
                        {row.traceId}
                      </Link>
                    ) : (
                      '—'
                    ),
                },
              ]}
            />
          )}
        </Card>
      )}
    </PageShell>
  );
}
