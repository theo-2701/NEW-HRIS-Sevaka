import { useState } from 'react';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { DateRangePicker } from '@/components/DatePicker';
import { FilterModal } from '@/components/FilterModal';
import { InfoButton } from '@/components/InfoButton';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { displayName } from '@/features/performance/format';
import { useAccessLogs } from '@/features/performance/hooks/useMonitor';
import { PERF_DIRECTORY } from '@/features/performance/mock-data';
import type { AccessLogRow, PerfActor } from '@/features/performance/types';
import { formatDate, formatDateTime } from '@/lib/format';

const ANY = 'ANY';

/** Ejaan peran kontrak → label tampil. */
const ROLE_NAME: Record<string, string> = {
  ROLE_HR_MANAGER: 'HR Manager',
  ROLE_HR_STAFF: 'HR Staff',
  ROLE_DEPARTMENT_MANAGER: 'Dept Manager',
  ROLE_EMPLOYEE: 'Employee',
  ROLE_SUPER_ADMIN: 'Super Admin',
};

/** J2 — empat pintu lintas-modul yang menulis baris jejak; dokumentasi, bukan kolom tersimpan. */
const TRIGGERS = [
  { door: 'Membuka papan pantau orang lain', owner: 'Monitor & Reports', source: 'Rekap sinyal' },
  { door: 'Membuka riwayat beku orang lain', owner: 'Monitor & Reports', source: 'Snapshot lembar penilaian' },
  { door: 'Membuka lembar bawahan dari persetujuan atau rantai atasan', owner: 'Review Sheets / Score Approvals', source: 'Lembar penilaian' },
  { door: 'HR membuka detail sanggahan orang lain', owner: 'Objections', source: 'Sanggahan' },
];

interface Filter {
  subject: string;
  reader: string;
  startDate: string;
  endDate: string;
}
const EMPTY: Filter = { subject: ANY, reader: ANY, startDate: '', endDate: '' };

function PersonSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Siapa saja</SelectItem>
          {Object.entries(PERF_DIRECTORY)
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([employeeId, name]) => (
              <SelectItem key={employeeId} value={employeeId}>
                {name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Sub Menu 3 — Jejak Akses (`J1`/`J2`). HR saja; persis enam kolom kontrak, urut `created_at` terbaru
 * (tetap, bukan pilihan), append-only tanpa aksi.
 */
export function AccessLogPanel({ actor }: { actor: PerfActor }) {
  const [filter, setFilter] = useState<Filter>(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);
  const [triggersOpen, setTriggersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const { data, isLoading } = useAccessLogs(
    actor,
    {
      subjectEmployeeId: filter.subject === ANY ? undefined : filter.subject,
      readerEmployeeId: filter.reader === ANY ? undefined : filter.reader,
      startDate: filter.startDate || undefined,
      endDate: filter.endDate || undefined,
      page,
      size,
    },
    true,
  );
  const change = (patch: Partial<Filter>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };
  const active = [
    filter.subject !== ANY && `Subjek: ${displayName(filter.subject)}`,
    filter.reader !== ANY && `Pembaca: ${displayName(filter.reader)}`,
    (filter.startDate || filter.endDate) &&
      `Tanggal: ${filter.startDate ? formatDate(filter.startDate) : '…'} – ${filter.endDate ? formatDate(filter.endDate) : '…'}`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHead title="Jejak akses" sub="Siapa membaca data siapa — subjek maupun pembaca tidak melihat jejaknya sendiri" />
        <div className="flex flex-col">
          <TableToolbar
            filters={
              <Button variant="secondary" onClick={() => setFilterOpen(true)}>
                {active.length > 0 ? `Filter (${active.length})` : 'Filter'}
              </Button>
            }
            summary={active.length > 0 ? active.join(' · ') : undefined}
            actions={
              <>
                <span className="inline-flex h-10 items-center rounded-pill bg-vapor px-3.5 font-body text-[12px] font-semibold text-fg-2">
                  Urut: terbaru dicatat
                </span>
                <InfoButton label="Titik pemicu pencatatan" onClick={() => setTriggersOpen(true)} />
              </>
            }
          />
          <DataTable<AccessLogRow>
            rows={data?.rows ?? []}
            rowKey={(row) => row.id}
            loading={isLoading}
            empty="Tidak ada jejak akses pada kriteria ini."
            columns={[
              {
                key: 'id',
                header: 'ID',
                nowrap: true,
                /* Ekor acak uuid v7 — awalannya timestamp, sehingga baris dalam menit yang sama berawalan identik. */
                render: (row) => (
                  <span title={row.id} className="font-mono text-[12px] text-fg-2">
                    …{row.id.slice(-8)}
                  </span>
                ),
              },
              { key: 'reader', header: 'Pembaca', strong: true, render: (row) => displayName(row.readerEmployeeId) },
              { key: 'subject', header: 'Subjek', render: (row) => displayName(row.subjectEmployeeId) },
              {
                key: 'by',
                header: 'Dicatat atas nama',
                render: (row) => `${row.createdBy.name} · ${ROLE_NAME[row.createdBy.role] ?? row.createdBy.role}`,
              },
              { key: 'at', header: 'Waktu', nowrap: true, render: (row) => formatDateTime(row.createdAt) },
              { key: 'activity', header: 'Aktivitas', render: (row) => <StatusBadge tone="mute" dot={false}>{row.activity}</StatusBadge> },
            ]}
          />
          <Pagination
            page={page}
            pageSize={size}
            total={data?.totalData ?? 0}
            noun="entries"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setSize(next);
              setPage(1);
            }}
          />
        </div>
      </Card>

      <Modal
        open={triggersOpen}
        onOpenChange={setTriggersOpen}
        title="Titik pemicu pencatatan"
        description="Baca yang ditolak tidak menulis apa pun; baca yang berhasil menulis tepat satu baris. Membaca data sendiri tidak dicatat."
        size="wide"
        footer={
          <Button variant="secondary" onClick={() => setTriggersOpen(false)}>
            Close
          </Button>
        }
      >
        <DataTable
          rows={TRIGGERS}
          rowKey={(row) => row.door}
          columns={[
            { key: 'door', header: 'Titik pemicu', strong: true, render: (row) => row.door },
            { key: 'owner', header: 'Menu pemilik', render: (row) => row.owner },
            { key: 'source', header: 'Data yang dibuka (dokumentasi, bukan kolom tersimpan)', muted: true, render: (row) => row.source },
          ]}
        />
      </Modal>

      <FilterModal
        open={filterOpen}
        title="Filter jejak akses"
        description="Tiga kriteria sesuai kontrak: subjek, pembaca, dan rentang tanggal pencatatan."
        onOpenChange={setFilterOpen}
        onReset={() => {
          setFilter(EMPTY);
          setPage(1);
        }}
      >
        <div className="grid gap-4">
          <PersonSelect id="log-subject" label="Subjek" value={filter.subject} onChange={(value) => change({ subject: value })} />
          <PersonSelect id="log-reader" label="Pembaca" value={filter.reader} onChange={(value) => change({ reader: value })} />
          <div className="flex flex-col gap-1">
            <Label>Tanggal</Label>
            <DateRangePicker
              value={{ from: filter.startDate, to: filter.endDate }}
              onChange={(range) => change({ startDate: range.from, endDate: range.to })}
            />
          </div>
        </div>
      </FilterModal>
    </div>
  );
}
