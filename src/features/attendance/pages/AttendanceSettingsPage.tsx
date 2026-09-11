import { useMemo, useState } from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { RowActions } from '@/components/RowActions';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import { GeofenceFormModal } from '@/features/attendance/components/GeofenceFormModal';
import {
  useDeleteGeofence,
  useGeofences,
  useToggleGeofence,
} from '@/features/attendance/hooks/useGeofences';
import { BRANCHES, branchName } from '@/features/attendance/mock-data';
import { ARRANGEMENTS } from '@/features/attendance/types';
import type { Geofence } from '@/features/attendance/types';

/** Matriks capture sebagai deretan chip — kosong berarti tanpa syarat apa pun. */
function MatrixCell({ row }: { row: Geofence }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ARRANGEMENTS.map((arrangement) => {
        const rule = row.rules[arrangement];
        const bits = [rule.radius && 'radius', rule.selfie && 'selfie'].filter(Boolean);
        return (
          <TmFlag key={arrangement} off={!bits.length}>
            {arrangement}: {bits.length ? bits.join(' + ') : 'none'}
          </TmFlag>
        );
      })}
    </div>
  );
}

/**
 * Time › Attendance Settings — port `_prototype/time-attendance-settings.html`
 * (FSD-001-TIME §6 · UIC-001-TIME §7).
 *
 * Satu sumber daya: titik kerja yang jadi acuan pengukuran tap — radius
 * toleransinya dan matriks capture yang menyatakan, per pengaturan kerja,
 * apakah berada di dalam radius dan apakah selfie diwajibkan. Mengubah titik
 * tidak pernah menulis ulang tap yang sudah dinilai; aturan baru mulai berlaku
 * pada tap berikutnya.
 *
 * Dua aksi barisnya sengaja tanpa dialog perantara: Deactivate satu langkah dan
 * tidak pernah ditolak (§6.4); Hapus memeriksa gerbang rujukan seketika dan
 * penolakannya muncul sebagai banner di atas List, bukan dialog (§6.5).
 */
export function AttendanceSettingsPage() {
  const [branch, setBranch] = useState('ALL');
  const [active, setActive] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Geofence | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [banner, setBanner] = useState('');

  const filter = useMemo(
    () => ({
      scopeRef: branch === 'ALL' ? undefined : branch,
      name: search.trim() || undefined,
      isActive: active === 'ALL' ? undefined : active === 'ACTIVE',
    }),
    [branch, active, search],
  );

  const { data: rows = [], isLoading } = useGeofences(filter);
  const paged = usePagedRows(rows);

  const toggle = useToggleGeofence();
  const remove = useDeleteGeofence(setBanner);

  const openForm = (row: Geofence | null) => {
    setBanner('');
    setEditing(row);
    setFormOpen(true);
  };

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Attendance' }, { label: 'Settings' }]}
        title="Attendance Settings"
        description="One resource: the work points a tap is measured against — their tolerance radius and the capture matrix that says, per work arrangement, whether being inside the radius and whether a selfie are required. Changing a point never rewrites a tap that was already assessed; the new rule starts with the next tap."
        actions={<Button onClick={() => openForm(null)}>New work point</Button>}
      >
        <div className="flex flex-col gap-5">
          {banner && (
            <Note tone="warn" icon={<TriangleAlert />}>
              {banner}
            </Note>
          )}

          <Card>
            <CardHead title="Work points" sub="cnf_attendance_geofence" />

            <div className="flex flex-col">
              <TableToolbar
                filters={
                  <>
                    <Select
                      value={branch}
                      onValueChange={(value) => {
                        setBranch(value);
                        paged.resetPage();
                      }}
                    >
                      <SelectTrigger className="h-10 w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All branches</SelectItem>
                        {BRANCHES.map((row) => (
                          <SelectItem key={row.id} value={row.id}>
                            {row.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={active}
                      onValueChange={(value) => {
                        setActive(value);
                        paged.resetPage();
                      }}
                    >
                      <SelectTrigger className="h-10 w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                }
                search={{
                  value: search,
                  onChange: (value) => {
                    setSearch(value);
                    paged.resetPage();
                  },
                  placeholder: 'Search work point name',
                }}
              />

              <DataTable<Geofence>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={isLoading}
                empty="No work point in this branch."
                columns={[
                  { key: 'name', header: 'Work Point', strong: true, render: (row) => row.geofenceName },
                  { key: 'branch', header: 'Branch', render: (row) => branchName(row.scopeRef) },
                  {
                    key: 'coords',
                    header: 'Coordinates',
                    nowrap: true,
                    render: (row) => (
                      <span className="font-mono text-xs">
                        {row.centerLatitude.toFixed(6)}, {row.centerLongitude.toFixed(6)}
                      </span>
                    ),
                  },
                  {
                    key: 'radius',
                    header: 'Radius',
                    align: 'right',
                    nowrap: true,
                    render: (row) => (
                      <span className="font-body text-[13px] font-semibold tabular-nums text-fg-1">
                        {row.radiusMeters} m
                      </span>
                    ),
                  },
                  { key: 'matrix', header: 'Capture Matrix', render: (row) => <MatrixCell row={row} /> },
                  {
                    key: 'active',
                    header: 'Active',
                    render: (row) => (
                      <StatusBadge tone={row.isActive ? 'ok' : 'mute'}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </StatusBadge>
                    ),
                  },
                ]}
                actions={(row) => (
                  <RowActions
                    actions={[
                      { label: 'Edit', onSelect: () => openForm(row) },
                      {
                        label: row.isActive ? 'Deactivate' : 'Reactivate',
                        onSelect: () => {
                          setBanner('');
                          toggle.mutate({ id: row.id });
                        },
                      },
                      {
                        label: 'Delete',
                        danger: true,
                        onSelect: () => remove.mutate({ id: row.id }),
                      },
                    ]}
                  />
                )}
              />

              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="work points"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>

          <Note icon={<Info />}>
            All four work arrangements must be filled in explicitly — there is no implied default, and no fifth row can
            be added: the list is system-locked. Deleting a point is refused as soon as a single tap has ever
            referenced it; the lawful way to retire one is the Active toggle.
          </Note>
        </div>
      </PageShell>

      <GeofenceFormModal open={formOpen} editing={editing} onClose={() => setFormOpen(false)} />
    </>
  );
}
