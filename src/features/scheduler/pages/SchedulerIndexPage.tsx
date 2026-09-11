import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import { TmFlag } from '@/features/attendance/components/AttendanceBits';
import { RosterCell, ShiftHours, SourceBadge } from '@/features/scheduler/components/SchedulerBits';
import { EMPLOYEES, WEEK_OPTIONS, employeeName } from '@/features/scheduler/mock-data';
import { assignmentOn, weekDates } from '@/features/scheduler/rules';
import { useAssignments, useShifts } from '@/features/scheduler/hooks/useScheduler';
import { ASSIGNMENT_SOURCE_LABEL } from '@/features/scheduler/types';
import type { AssignmentSource, ShiftAssignment } from '@/features/scheduler/types';
import { formatDate } from '@/lib/format';

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type View = 'grid' | 'rows';

/**
 * Time › Scheduler Index — port `_prototype/time-scheduler-index.html`
 * (FSD-001-TIME §8 · UIC-001-TIME §10).
 *
 * Proyeksi baca murni: roster sebagai grid tanggal × karyawan. Tidak ada
 * create, update, atau delete sama sekali di layar ini — setiap tulisan ke
 * roster hidup di Scheduler Schedule.
 */
export function SchedulerIndexPage() {
  const [weekStart, setWeekStart] = useState(WEEK_OPTIONS[0].value);
  const [source, setSource] = useState('ALL');
  // Dua bentuk atas data yang sama — satu panel, satu tabel (standar rumah).
  const [view, setView] = useState<View>('grid');

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const filter = useMemo(
    () => ({
      from: dates[0],
      to: dates[dates.length - 1],
      assignmentSource: source === 'ALL' ? undefined : source,
    }),
    [dates, source],
  );

  const { data: rows = [], isLoading } = useAssignments(filter);
  const { data: shifts = [] } = useShifts();

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) =>
        a.workDate === b.workDate ? (a.employeeId < b.employeeId ? -1 : 1) : a.workDate < b.workDate ? -1 : 1,
      ),
    [rows],
  );
  const paged = usePagedRows(sorted);

  const activeShifts = shifts.filter((row) => row.isActive);

  return (
    <PageShell
      crumbs={[{ label: 'Time Management' }, { label: 'Scheduler' }, { label: 'Index' }]}
      title="Scheduler Index"
      description="Proyeksi baca murni atas roster sebagai grid tanggal × karyawan. Tidak ada create, update, atau delete sama sekali di layar ini — setiap tulisan ke roster hidup di Scheduler Schedule."
      actions={
        <Button variant="secondary" asChild>
          <Link to="/time/scheduler/schedule">Go to Scheduler Schedule</Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        <Note icon={<Lock />}>
          Tampilan baca-saja. Setiap sel di sini adalah hasil akhir penugasan yang dibuat di tempat lain — penyesuaian
          individual, bulk assignment, atau tukar shift yang sudah disetujui.
        </Note>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={weekStart}
            onValueChange={(value) => {
              setWeekStart(value);
              paged.resetPage();
            }}
          >
            <SelectTrigger className="h-10 w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEEK_OPTIONS.map((row) => (
                <SelectItem key={row.value} value={row.value}>
                  {row.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={source}
            onValueChange={(value) => {
              setSource(value);
              paged.resetPage();
            }}
          >
            <SelectTrigger className="h-10 w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sources</SelectItem>
              {(Object.keys(ASSIGNMENT_SOURCE_LABEL) as AssignmentSource[]).map((item) => (
                <SelectItem key={item} value={item}>
                  {ASSIGNMENT_SOURCE_LABEL[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'grid', label: 'Roster grid' },
            { value: 'rows', label: 'Roster rows' },
          ]}
        />

        {view === 'grid' && (
        <Card>
          <CardHead title="Roster grid" sub="Hasil akhir per karyawan per tanggal" />

          <div className="scroll-thin overflow-x-auto rounded-lg border border-border-1 bg-bg-surface">
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-border-1 bg-mist px-4 py-2.5 text-left font-body text-[11px] font-bold uppercase tracking-[0.04em] text-fg-3">
                    Employee
                  </th>
                  {dates.map((iso) => (
                    <th
                      key={iso}
                      className="whitespace-nowrap border-b border-border-1 bg-mist px-3 py-2.5 text-center font-body text-[11px] font-bold uppercase tracking-[0.04em] text-fg-3"
                    >
                      {WEEKDAY[new Date(`${iso}T00:00:00`).getDay()]}
                      <br />
                      {formatDate(iso).slice(0, 6)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map((person) => (
                  <tr key={person.id}>
                    <th className="sticky left-0 z-10 border-b border-border-1 bg-bg-surface px-4 py-2.5 text-left font-body text-[13px] font-semibold text-fg-1">
                      {person.name}
                      <br />
                      <span className="font-medium text-fg-4">{person.unit}</span>
                    </th>
                    {dates.map((iso) => (
                      <td key={iso} className="border-b border-border-1 px-3 py-2.5 text-center">
                        <RosterCell assignment={assignmentOn(rows, person.id, iso)} shifts={shifts} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {activeShifts.map((shift) => (
              <span key={shift.id} className="inline-flex items-center gap-1.5 font-body text-[11.5px] font-medium text-fg-3">
                <RosterCell
                  assignment={{
                    id: `legend-${shift.id}`,
                    employeeId: '',
                    workDate: '',
                    shiftId: shift.id,
                    isOffDay: false,
                    assignmentSource: 'BULK',
                  }}
                  shifts={shifts}
                />
                {shift.startTime ? `${shift.startTime}–${shift.endTime}` : 'no fixed hours'}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 font-body text-[11.5px] font-medium text-fg-3">
              <span className="inline-flex h-6 items-center rounded-md border border-border-1 bg-vapor px-2 font-body text-[11px] font-bold text-fg-3">
                OFF
              </span>
              hari libur terjadwal — barisnya ada dan menyatakan orangnya tidak bekerja
            </span>
            <span className="inline-flex items-center gap-1.5 font-body text-[11.5px] font-medium text-fg-3">
              <span className="text-fg-4">— not assigned</span>
              tidak ada baris roster sama sekali; ini <em>bukan</em> hari libur
            </span>
          </div>
        </Card>
        )}

        {view === 'rows' && (
        <Card>
          <CardHead title="Roster rows" sub="Baris mentah minggu ini" />

          <div className="flex flex-col">
            <TableToolbar summary={`${sorted.length} baris pada minggu terpilih`} />

            <DataTable<ShiftAssignment>
              rows={paged.rows}
              rowKey={(row) => row.id}
              loading={isLoading}
              empty="No roster row in this week."
              columns={[
                {
                  key: 'date',
                  header: 'Work Date',
                  strong: true,
                  nowrap: true,
                  render: (row) => formatDate(row.workDate),
                },
                { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                {
                  key: 'shift',
                  header: 'Shift',
                  render: (row) => {
                    const shift = shifts.find((item) => item.id === row.shiftId);
                    return shift ? (
                      <>
                        {shift.shiftName} <span className="text-fg-4">· {shift.shiftCode}</span>
                      </>
                    ) : (
                      '—'
                    );
                  },
                },
                {
                  key: 'hours',
                  header: 'Hours',
                  nowrap: true,
                  render: (row) => {
                    const shift = shifts.find((item) => item.id === row.shiftId);
                    return shift ? <ShiftHours shift={shift} /> : '—';
                  },
                },
                {
                  key: 'off',
                  header: 'Off Day',
                  render: (row) => (row.isOffDay ? <TmFlag>Off day</TmFlag> : <span className="text-fg-4">No</span>),
                },
                {
                  key: 'source',
                  header: 'Source',
                  render: (row) => <SourceBadge source={row.assignmentSource} />,
                },
              ]}
            />

            <Pagination
              page={paged.page}
              pageSize={paged.pageSize}
              total={paged.total}
              noun="roster rows"
              onPageChange={paged.setPage}
              onPageSizeChange={paged.setPageSize}
            />
          </div>
        </Card>
        )}
      </div>
    </PageShell>
  );
}
