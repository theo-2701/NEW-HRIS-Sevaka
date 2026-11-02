import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AccessNote, LevelBadge, LoadErrorBanner, RolePicker } from '@/features/system-log/components/SystemLogBits';
import { useTraceSearch } from '@/features/system-log/hooks/useSystemLog';
import { TRACE_ID_PATTERN } from '@/features/system-log/types';
import type { LogRow, SystemLogRole } from '@/features/system-log/types';
import { ApiError } from '@/services/api';

/**
 * Company Management › System Log › Trace ID (TSD-AUTH §14.6). Tempel nomor dari dialog galat ⇒
 * seluruh baris satu alur lintas service, 7 hari terakhir, waktu naik, maks 1.000 baris.
 * `?trace_id=` di URL langsung mencari.
 */
export function TraceIdPage() {
  const [params, setParams] = useSearchParams();
  const submitted = params.get('trace_id')?.trim() ?? '';
  const [role, setRole] = useState<SystemLogRole>('SUPER_ADMIN');
  const [value, setValue] = useState(submitted);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const query = useTraceSearch(role, role === 'SUPER_ADMIN' ? submitted : '');
  const loadError = query.error instanceof ApiError && ![403, 422].includes(query.error.status);

  const search = () => {
    const next = value.trim();
    if (!next) return setFieldError('Enter a trace ID.');
    if (!TRACE_ID_PATTERN.test(next)) return setFieldError('A trace ID is 16 or 32 hexadecimal characters.');
    setFieldError(null);
    setParams({ trace_id: next.toLowerCase() });
  };

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'System Log' }, { label: 'Trace ID' }]}
      title="Trace ID"
      description="Paste the Trace ID from an error dialog to read every log line of that flow across services (last 7 days)."
      actions={<RolePicker value={role} onChange={setRole} />}
    >
      {role !== 'SUPER_ADMIN' ? (
        <AccessNote />
      ) : (
        <Card>
          <CardHead title="Log lines" sub="Oldest first · up to 1,000 lines · messages are masked by the server" />
          <form
            className="mb-4 flex flex-wrap items-start gap-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              search();
            }}
          >
            <div className="flex min-w-[320px] flex-1 flex-col gap-1">
              <Label htmlFor="trace-id">
                Trace ID<em>*</em>
              </Label>
              <Input
                id="trace-id"
                value={value}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
                placeholder="e.g. 4bf92f3577b34da6a3ce929d0e0e4736"
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? 'trace-id-desc' : undefined}
                onChange={(event) => setValue(event.target.value)}
              />
              {fieldError && (
                <span id="trace-id-desc" role="alert" className="font-body text-xs font-medium text-error-600">
                  {fieldError}
                </span>
              )}
            </div>
            <Button type="submit" className="mt-[26px]" disabled={query.isFetching}>
              {query.isFetching ? 'Searching…' : 'Search'}
            </Button>
          </form>

          {loadError && <LoadErrorBanner onRetry={() => void query.refetch()} retrying={query.isFetching} />}
          {query.data?.isTruncated && (
            <p className="mb-2 font-body text-xs font-medium text-fg-3">Showing the first 1,000 lines only.</p>
          )}
          {submitted && (
            <DataTable<LogRow>
              rows={query.data?.rows ?? []}
              rowKey={(row) => `${row.occurredAt}-${row.instance}-${row.message}`}
              loading={query.isLoading}
              empty={loadError ? null : 'No log entries found for this Trace ID in the last 7 days.'}
              columns={[
                { key: 'at', header: 'Time', nowrap: true, render: (row) => row.occurredAt.replace('T', ' ').slice(0, 19) },
                { key: 'service', header: 'Service', nowrap: true, render: (row) => row.service },
                { key: 'level', header: 'Level', render: (row) => <LevelBadge level={row.level} /> },
                { key: 'code', header: 'Error Code', nowrap: true, muted: true, render: (row) => row.errorCode ?? '—' },
                {
                  key: 'message',
                  header: 'Message',
                  render: (row) => <span className="block w-[520px] whitespace-normal break-all font-mono text-xs">{row.message}</span>,
                },
              ]}
            />
          )}
        </Card>
      )}
    </PageShell>
  );
}
