import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { PunchConsole, PunchSavedModal, TapModal } from '@/features/attendance/components/PunchConsole';
import type { TapSubmission } from '@/features/attendance/components/PunchConsole';
import { useRecordPunch } from '@/features/attendance/hooks/useAttendance';
import {
  arrangementToday,
  newIdempotencyKey,
  nextPunchType,
  resolveGeofence,
  selfieRequiredAtTap,
} from '@/features/attendance/rules';
import { ATTENDANCE_TODAY } from '@/features/attendance/mock-data';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import { useMyAttendanceDays, useMyPunchesToday } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import { ARRANGEMENT_LABEL, ATTENDANCE_STATUS_LABEL, DAY_TYPE_LABEL } from '@/features/attendance/types';
import type { AttendanceDay, AttendanceStatus } from '@/features/attendance/types';
import { formatDate } from '@/lib/format';

type Tone = 'ok' | 'warn' | 'err' | 'info' | 'mute';

const TONE: Record<AttendanceStatus, Tone> = {
  PRESENT: 'ok',
  LATE: 'warn',
  INCOMPLETE: 'warn',
  ABSENT: 'err',
  ON_LEAVE: 'info',
  SICK: 'info',
  NOT_SCHEDULED: 'mute',
};

/**
 * ESS › Time Management › Attendance — kehadiran milik sendiri.
 *
 * Cakupannya selalu pemanggil: service dipanggil dengan peran `EMPLOYEE`, jadi layar ini nol
 * punya pemilih karyawan. Tap hari ini ditampilkan apa adanya (append-only, satu baris per tap
 * — tap ketiga dan seterusnya tetap tercatat, bukan ditolak).
 */
type Tab = 'today' | 'history';

export function EssAttendancePage() {
  const [tab, setTab] = useState<Tab>('today');
  const [actor, setActor] = useState(ESS_VIEWERS[0]);
  const session = { employeeId: actor.employeeId, role: 'EMPLOYEE' as const };
  const days = useMyAttendanceDays(actor);
  const punches = useMyPunchesToday(actor);

  const punch = useRecordPunch(session);
  /** Satu `Idempotency-Key` per percobaan tap — lahir saat modal dibuka, dipakai ulang saat kirim ulang. */
  const [tapKey, setTapKey] = useState<string | null>(null);
  const [punchResult, setPunchResult] = useState<PunchResult | null>(null);

  const today = punches.data ?? [];
  const allDays = days.data ?? [];
  const geofence = resolveGeofence(session.employeeId);
  const selfieRequired = selfieRequiredAtTap(geofence);
  const nextType = nextPunchType(session.employeeId, today);
  const tappedIn = today.find((row) => row.punchType === 'IN');
  const todayRow = allDays.find((row) => row.workDate === ATTENDANCE_TODAY);

  const doPunch = async (submission: TapSubmission) => {
    if (!tapKey || !nextType) return;
    try {
      const result = await punch.mutateAsync({ ...submission, punchType: nextType, idempotencyKey: tapKey });
      setTapKey(null);
      setPunchResult(result);
    } catch {
      // Penolakan sudah tampil; modal tetap terbuka dengan isinya supaya bisa dikirim ulang.
    }
  };

  const rows = useMemo(() => days.data ?? [], [days.data]);
  const paged = usePagedRows(rows);

  return (
    <PageShell
      crumbs={[{ label: 'Employee Self-Service' }, { label: 'Time Management' }, { label: 'Attendance' }]}
      title="Attendance"
      description="Rekap kehadiran harian Anda beserta tap masuk/pulang hari ini."
      actions={<EssActorPicker actor={actor} onChange={setActor} />}
    >
      <div className="flex flex-col gap-5">
        <TabMenu<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'today', label: 'Hari ini' },
            { value: 'history', label: 'Rekap harian', count: rows.length },
          ]}
        />

        {tab === 'today' && (
          <>
            <PunchConsole
              workDate={ATTENDANCE_TODAY}
              geofence={geofence}
              selfieRequired={selfieRequired}
              nextType={nextType}
              today={today}
              day={todayRow}
              onStart={() => setTapKey(newIdempotencyKey())}
            />
          </>
        )}

        {tab === 'history' && (
          <Card>
            <CardHead title="Rekap harian" sub="Hasil penilaian kehadiran per tanggal" />
            <div>
              <DataTable<AttendanceDay>
                rows={paged.rows}
                rowKey={(row) => row.id}
                loading={days.isLoading}
                empty="Belum ada rekap kehadiran."
                columns={[
                  { key: 'date', header: 'Tanggal', strong: true, nowrap: true, render: (row) => formatDate(row.workDate) },
                  { key: 'dayType', header: 'Jenis hari', muted: true, render: (row) => DAY_TYPE_LABEL[row.dayType] },
                  { key: 'arrangement', header: 'Pola kerja', render: (row) => ARRANGEMENT_LABEL[row.workArrangement] },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <StatusBadge tone={TONE[row.attendanceStatus]}>
                        {ATTENDANCE_STATUS_LABEL[row.attendanceStatus]}
                      </StatusBadge>
                    ),
                  },
                  {
                    key: 'worked',
                    header: 'Jam kerja',
                    align: 'right',
                    render: (row) => <span className="tabular-nums">{(row.workedMinutes / 60).toFixed(1)} jam</span>,
                  },
                  {
                    key: 'late',
                    header: 'Terlambat',
                    align: 'right',
                    render: (row) =>
                      row.lateMinutes > 0 ? (
                        <span className="tabular-nums text-warning-700">{row.lateMinutes} mnt</span>
                      ) : (
                        <span className="text-fg-4">—</span>
                      ),
                  },
                ]}
              />
              <Pagination
                page={paged.page}
                pageSize={paged.pageSize}
                total={paged.total}
                noun="days"
                onPageChange={paged.setPage}
                onPageSizeChange={paged.setPageSize}
              />
            </div>
          </Card>
        )}
      </div>

      {nextType && (
        <TapModal
          open={Boolean(tapKey)}
          type={nextType}
          geofence={geofence}
          selfieRequired={selfieRequired}
          defaultArrangement={arrangementToday(session.employeeId, allDays)}
          inheritedArrangement={tappedIn?.workArrangement ?? null}
          busy={punch.isPending}
          onSubmit={doPunch}
          onClose={() => setTapKey(null)}
        />
      )}
      <PunchSavedModal result={punchResult} onClose={() => setPunchResult(null)} />
    </PageShell>
  );
}
