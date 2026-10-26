import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/PageShell';
import { Card } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePagedRows } from '@/hooks/usePagedRows';
import { useAuthStore } from '@/store/auth.store';
import { isLoadError, logTime, normalizeTraceId, traceIdError } from '@/features/system-log/rules';
import { systemLogService } from '@/features/system-log/services/system-log.service';
import {
  LevelBadge,
  SystemLogAccessNote,
  SystemLogLoadError,
  SystemLogSummary,
} from '@/features/system-log/components/SystemLogBits';
import { useLoadErrorDialog } from '@/features/system-log/hooks/useLoadErrorDialog';
import type { LogEntry } from '@/features/system-log/types';

/**
 * Company Management › System Log › Trace ID — FSD-AUTH 0.22 §7A (lima state `TR-1`..`TR-5`).
 * Seluruh baris log satu permintaan lintas service, 7 hari terakhir, urut waktu naik dari server.
 * Nilai yang dicari ditulis ke `?trace_id=` — alamat itu bisa dimuat ulang/dibagikan dan langsung mencari.
 */
export function SystemLogTracePage() {
  const superAdmin = useAuthStore((s) => s.user?.role) === 'ROLE_SUPER_ADMIN';
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get('trace_id') ?? '';
  const [input, setInput] = useState(fromUrl);
  const [localError, setLocalError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(() =>
    fromUrl && !traceIdError(fromUrl) ? normalizeTraceId(fromUrl) : null,
  );

  // Dibuka dari tautan Trace ID layar Error Code saat halaman ini sudah terbuka.
  useEffect(() => {
    if (!fromUrl || traceIdError(fromUrl)) return;
    setInput(fromUrl);
    setTraceId(normalizeTraceId(fromUrl));
  }, [fromUrl]);

  const query = useQuery({
    queryKey: ['system-log', 'trace', traceId],
    queryFn: () => systemLogService.traceSearch(traceId ?? ''),
    enabled: superAdmin && Boolean(traceId),
    retry: false,
  });
  useLoadErrorDialog(query.error, query.errorUpdatedAt);
  const rows = query.data?.rows ?? [];
  const paged = usePagedRows(rows, 50);

  const serverMessage = query.error instanceof Error ? query.error.message : '';
  const fieldError = localError ?? (serverMessage.startsWith('422') ? serverMessage.replace(/^422\S*\s*—?\s*/, '') : null);
  const loadError = isLoadError(query.error);
  const forbidden = !superAdmin || serverMessage.startsWith('403');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const error = traceIdError(input);
    setLocalError(error);
    if (error) return;
    const id = normalizeTraceId(input);
    setParams({ trace_id: id });
    paged.resetPage();
    // Nilai sama = cari ulang.
    if (id === traceId) void query.refetch();
    else setTraceId(id);
  };

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'System Log' }, { label: 'Trace ID' }]}
      title="Trace ID"
      description="Every log line of one request across services, from the last 7 days. Paste the Trace ID from an error dialog."
    >
      {forbidden ? (
        <SystemLogAccessNote />
      ) : (
        <Card>
          <div className="flex flex-col gap-4">
            <form noValidate onSubmit={submit} className="flex flex-wrap items-start gap-3">
              <div className="flex min-w-[280px] max-w-[460px] flex-1 flex-col gap-1">
                <Label htmlFor="trace-id">
                  Trace ID<em>*</em>
                </Label>
                <Input
                  id="trace-id"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="e.g. 4bf92f3577b34da6a3ce929d0e0e4736"
                  aria-invalid={Boolean(fieldError)}
                  spellCheck={false}
                  autoComplete="off"
                  className="font-mono"
                />
                {fieldError && <span className="font-body text-xs font-medium text-error-600">{fieldError}</span>}
              </div>
              <Button type="submit" className="mt-[23px]" disabled={query.isFetching}>
                {query.isFetching ? 'Searching…' : 'Search'}
              </Button>
            </form>

            {traceId && (
              <div className="flex flex-col gap-3">
                {loadError && <SystemLogLoadError onRetry={() => void query.refetch()} retrying={query.isFetching} />}
                {query.data && (
                  <SystemLogSummary
                    grid={query.data}
                    truncatedText="Only the first 1000 log entries are shown. The rest of this flow is not displayed."
                  />
                )}
                <div className="flex flex-col">
                  <DataTable<LogEntry>
                    rows={paged.rows}
                    rowKey={(row) => row.id}
                    loading={query.isFetching}
                    empty={loadError ? '' : 'No log entries found for this Trace ID in the last 7 days.'}
                    columns={[
                      { key: 'time', header: 'Time', nowrap: true, render: (row) => <span className="font-mono text-xs">{logTime(row.occurredAt)}</span> },
                      { key: 'service', header: 'Service', nowrap: true, render: (row) => <span title={row.instance}>{row.service}</span> },
                      { key: 'level', header: 'Level', render: (row) => <LevelBadge level={row.level} /> },
                      {
                        key: 'code',
                        header: 'Error Code',
                        nowrap: true,
                        render: (row) => (row.errorCode ? <span className="font-mono text-xs">{row.errorCode}</span> : '—'),
                      },
                      {
                        key: 'message',
                        header: 'Message',
                        render: (row) => <span className="block min-w-[360px] whitespace-pre-wrap break-words font-mono text-xs">{row.message}</span>,
                      },
                    ]}
                  />
                  <Pagination
                    page={paged.page}
                    pageSize={paged.pageSize}
                    total={paged.total}
                    noun="log entries"
                    onPageChange={paged.setPage}
                    onPageSizeChange={paged.setPageSize}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
