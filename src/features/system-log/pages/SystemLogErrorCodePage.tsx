import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
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
import { defaultRange, errorCodeError, isLoadError, logTime, normalizeErrorCode, rangeErrors } from '@/features/system-log/rules';
import { systemLogService } from '@/features/system-log/services/system-log.service';
import {
  SystemLogAccessNote,
  SystemLogLoadError,
  SystemLogSummary,
} from '@/features/system-log/components/SystemLogBits';
import { useLoadErrorDialog } from '@/features/system-log/hooks/useLoadErrorDialog';
import type { LogEntry } from '@/features/system-log/types';

interface Criteria {
  code: string;
  from: string;
  to: string;
  /** Menekan Search dengan nilai sama tetap mencari ulang. */
  run: number;
}

const FieldError = ({ text }: { text?: string | null }) =>
  text ? <span className="font-body text-xs font-medium text-error-600">{text}</span> : null;

/**
 * Company Management › System Log › Error Code — FSD-AUTH 0.22 §7B (`EC-1`..`EC-5`).
 * Kejadian satu kode galat dalam rentang ≤ 24 jam (7 hari terakhir), terbaru dulu; Trace ID tiap baris membuka
 * menu Trace ID. Tanpa tautan dokumen petunjuk kode galat (dokumen internal tim pengembang).
 */
export function SystemLogErrorCodePage() {
  const superAdmin = useAuthStore((s) => s.user?.role) === 'ROLE_SUPER_ADMIN';
  const [code, setCode] = useState('');
  const [range, setRange] = useState(() => defaultRange());
  const [errors, setErrors] = useState<{ code?: string | null; from?: string; to?: string }>({});
  const [criteria, setCriteria] = useState<Criteria | null>(null);

  const query = useQuery({
    queryKey: ['system-log', 'error-code', criteria],
    queryFn: () =>
      systemLogService.errorCodeSearch(criteria?.code ?? '', new Date(criteria?.from ?? ''), new Date(criteria?.to ?? '')),
    enabled: superAdmin && Boolean(criteria),
    retry: false,
  });
  useLoadErrorDialog(query.error, query.errorUpdatedAt);
  const paged = usePagedRows(query.data?.rows ?? [], 50);

  const serverMessage = query.error instanceof Error ? query.error.message : '';
  const loadError = isLoadError(query.error);
  const forbidden = !superAdmin || serverMessage.startsWith('403');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = { code: errorCodeError(code), ...rangeErrors(new Date(range.from), new Date(range.to)) };
    setErrors(next);
    if (next.code || next.from || next.to) return;
    paged.resetPage();
    setCriteria((prev) => ({ code: normalizeErrorCode(code), from: range.from, to: range.to, run: (prev?.run ?? 0) + 1 }));
  };

  return (
    <PageShell
      crumbs={[{ label: 'Company Management' }, { label: 'System Log' }, { label: 'Error Code' }]}
      title="Error Code"
      description="Every occurrence of one error code in a time range. Open a Trace ID to see that request's full flow."
    >
      {forbidden ? (
        <SystemLogAccessNote />
      ) : (
        <Card>
          <div className="flex flex-col gap-4">
            <form noValidate onSubmit={submit} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex w-[220px] flex-col gap-1">
                  <Label htmlFor="error-code">
                    Error Code<em>*</em>
                  </Label>
                  <Input
                    id="error-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="e.g. EMP-AUZ-724"
                    aria-invalid={Boolean(errors.code)}
                    spellCheck={false}
                    autoComplete="off"
                    className="font-mono uppercase"
                  />
                  <FieldError text={errors.code} />
                </div>
                <div className="flex w-[220px] flex-col gap-1">
                  <Label htmlFor="log-from">
                    From<em>*</em>
                  </Label>
                  <Input
                    id="log-from"
                    type="datetime-local"
                    value={range.from}
                    onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
                    aria-invalid={Boolean(errors.from)}
                  />
                  <FieldError text={errors.from} />
                </div>
                <div className="flex w-[220px] flex-col gap-1">
                  <Label htmlFor="log-to">
                    To<em>*</em>
                  </Label>
                  <Input
                    id="log-to"
                    type="datetime-local"
                    value={range.to}
                    onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
                    aria-invalid={Boolean(errors.to)}
                  />
                  <FieldError text={errors.to} />
                </div>
                <Button type="submit" className="mt-[23px]" disabled={query.isFetching}>
                  {query.isFetching ? 'Searching…' : 'Search'}
                </Button>
              </div>
              <span className="font-body text-xs font-medium text-fg-3">
                Up to 24 hours per search, within the last 7 days. Defaults to the last hour.
              </span>
            </form>

            {criteria && (
              <div className="flex flex-col gap-3">
                {loadError && <SystemLogLoadError onRetry={() => void query.refetch()} retrying={query.isFetching} />}
                {query.data && (
                  <SystemLogSummary
                    grid={query.data}
                    truncatedText="Only the latest 500 occurrences are shown. Narrow the time range to see the rest."
                  />
                )}
                <div className="flex flex-col">
                  <DataTable<LogEntry>
                    rows={paged.rows}
                    rowKey={(row) => row.id}
                    loading={query.isFetching}
                    empty={loadError ? '' : 'No occurrences of this error code in the selected time range.'}
                    columns={[
                      { key: 'time', header: 'Time', nowrap: true, render: (row) => <span className="font-mono text-xs">{logTime(row.occurredAt)}</span> },
                      { key: 'service', header: 'Service', nowrap: true, render: (row) => <span title={row.instance}>{row.service}</span> },
                      {
                        key: 'message',
                        header: 'Message',
                        render: (row) => <span className="block min-w-[360px] whitespace-pre-wrap break-words font-mono text-xs">{row.message}</span>,
                      },
                      {
                        key: 'trace',
                        header: 'Trace ID',
                        nowrap: true,
                        render: (row) =>
                          row.traceId ? (
                            <Link
                              to={`/company-management/system-log/trace-id?trace_id=${row.traceId}`}
                              className="rounded font-mono text-xs font-semibold text-secondary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500/30"
                            >
                              {row.traceId}
                            </Link>
                          ) : (
                            '—'
                          ),
                      },
                    ]}
                  />
                  <Pagination
                    page={paged.page}
                    pageSize={paged.pageSize}
                    total={paged.total}
                    noun="occurrences"
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
