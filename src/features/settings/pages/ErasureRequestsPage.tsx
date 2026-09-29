import { useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead, EmptyState } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { DatePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { Pagination } from '@/components/Pagination';
import { AddButton } from '@/components/RowActions';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, SelectRow } from '@/features/company/components/CompanyBits';
import {
  ErasureDetailModal,
  ErasureFormModal,
  ErasureStatusBadge,
  SubjectCell,
} from '@/features/settings/components/ErasureModals';
import { useErasureRequests, useErasureSubjects } from '@/features/settings/hooks/useSettings';
import { SETTINGS_VIEWERS } from '@/features/settings/mock-data';
import { canManageErasure } from '@/features/settings/rules';
import type { ErasureRow, ErasureStatus, SettingsActor } from '@/features/settings/types';
import { formatDate, formatDateTime } from '@/lib/format';
import { ApiError } from '@/services/api';

const STATUSES: ErasureStatus[] = ['REQUESTED', 'IN_PROGRESS', 'COMPLETED'];

/**
 * System › Settings › Personal Data Erasure — FSD-001-SETTINGS-0.21 §10 · UIC-001-SETTINGS-0.12 §4 (`A5`–`A7`).
 *
 * Satu-satunya cerita Insert + Read di settings-service: HR mencatat permintaan dari surat subjek, lalu memantau
 * ketuntasan per service penitip. Ringkasan angka di daftar, rincian di detail. NOL tombol "tandai selesai" dan nol
 * kolom Aksi — kenaikan status murni pekerjaan mesin.
 */
export function ErasureRequestsPage() {
  const [actor, setActor] = useState<SettingsActor>(SETTINGS_VIEWERS[0]);
  const [status, setStatus] = useState<'' | ErasureStatus>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const subjects = useErasureSubjects();
  const list = useErasureRequests(actor, {
    requestStatus: status || undefined,
    requestedAtFrom: from || undefined,
    requestedAtTo: to || undefined,
    employeeId: subjectId || undefined,
    page,
    size,
  });
  const allowed = canManageErasure(actor.role);
  const forbidden = !allowed || (list.error instanceof ApiError && list.error.status === 403);

  const touch =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value);
      setPage(1);
    };
  const subjectName = subjects.data?.find((row) => row.employeeId === subjectId)?.nama;
  const summary = [
    status,
    (from || to) && `Letter ${from ? formatDate(from) : '…'} – ${to ? formatDate(to) : '…'}`,
    subjectName,
  ]
    .filter(Boolean)
    .join(' · ');
  const active = [status, from || to, subjectId].filter(Boolean).length;

  return (
    <PageShell
      crumbs={[{ label: 'System' }, { label: 'Settings' }, { label: 'Personal Data Erasure' }]}
      title="Personal Data Erasure"
      description="Record erasure requests received from data subjects and follow how far each service has erased the data."
      actions={
        <Select
          value={actor.id}
          onValueChange={(id) => {
            const next = SETTINGS_VIEWERS.find((row) => row.id === id);
            if (next) {
              setActor(next);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="h-10 w-[300px]" aria-label="Viewing as">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_VIEWERS.map((viewer) => (
              <SelectItem key={viewer.id} value={viewer.id}>
                {viewer.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {forbidden ? (
        <Card>
          <EmptyState
            title="403 — Forbidden"
            description="Only HR Manager and Super Admin can record or read erasure requests."
          />
        </Card>
      ) : (
        <Card>
          <CardHead title="Erasure requests" sub="Newest letter date first · click a row to see the tracker" />
          <div>
            <TableToolbar
              filters={
                <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                  {active > 0 ? `Filter (${active})` : 'Filter'}
                </Button>
              }
              summary={summary || undefined}
              actions={<AddButton onClick={() => setFormOpen(true)}>Record request</AddButton>}
            />
            <DataTable<ErasureRow>
              rows={list.data?.data ?? []}
              rowKey={(row) => row.id}
              loading={list.isLoading}
              empty={list.error ? list.error.message : 'No erasure request matches this filter.'}
              onRowClick={(row) => setDetailId(row.id)}
              columns={[
                { key: 'subject', header: 'Subject', render: (row) => <SubjectCell nama={row.nama} nik={row.nik} /> },
                { key: 'status', header: 'Status', render: (row) => <ErasureStatusBadge value={row.requestStatus} /> },
                {
                  key: 'letter',
                  header: 'Letter date',
                  nowrap: true,
                  render: (row) => (
                    <span className="flex flex-col gap-0.5">
                      <span>{formatDate(row.requestedAt)}</span>
                      <span className="text-xs text-fg-3">{row.requestedAtTimezone}</span>
                    </span>
                  ),
                },
                {
                  key: 'recorded',
                  header: 'Recorded',
                  nowrap: true,
                  render: (row) => (
                    <span className="flex flex-col gap-0.5">
                      <span>{formatDateTime(row.createdAt)}</span>
                      <span className="text-xs text-fg-3">{row.createdBy.nama}</span>
                    </span>
                  ),
                },
                {
                  key: 'completed',
                  header: 'Completed',
                  nowrap: true,
                  render: (row) => formatDateTime(row.completedAt),
                },
                {
                  key: 'progress',
                  header: 'Services',
                  render: (row) => (
                    <span className="flex flex-col gap-0.5">
                      <span className="font-bold text-fg-1">
                        {row.completedService}/{row.totalService} completed
                      </span>
                      {row.heldService > 0 && (
                        <span className="text-xs font-semibold text-warning-800">{row.heldService} held</span>
                      )}
                    </span>
                  ),
                },
              ]}
            />
            <Pagination
              page={page}
              pageSize={size}
              total={list.data?.totalData ?? 0}
              noun="requests"
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setSize(next);
                setPage(1);
              }}
            />
          </div>
        </Card>
      )}

      <FilterModal
        open={filterOpen}
        title="Filter erasure requests"
        onOpenChange={setFilterOpen}
        onReset={() => {
          setStatus('');
          setFrom('');
          setTo('');
          setSubjectId('');
          setPage(1);
        }}
      >
        <SelectRow
          label="Status"
          allowEmpty
          emptyLabel="All status"
          value={status}
          onChange={(value) => touch(setStatus)(value as '' | ErasureStatus)}
          options={STATUSES.map((value) => ({ value, label: value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Letter date from">
            <DatePicker value={from} max={to || undefined} onChange={touch(setFrom)} />
          </Field>
          <Field label="Letter date to">
            <DatePicker value={to} min={from || undefined} onChange={touch(setTo)} />
          </Field>
        </div>
        <SelectRow
          label="Subject"
          allowEmpty
          emptyLabel="All subjects"
          value={subjectId}
          onChange={touch(setSubjectId)}
          options={(subjects.data ?? []).map((row) => ({ value: row.employeeId, label: `${row.nama} · ${row.nik}` }))}
        />
      </FilterModal>

      <ErasureFormModal
        actor={actor}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onOpenDetail={(id) => setDetailId(id)}
      />
      <ErasureDetailModal actor={actor} id={detailId} onClose={() => setDetailId(null)} />
    </PageShell>
  );
}
