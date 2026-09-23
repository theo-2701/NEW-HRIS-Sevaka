import { useMemo, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { Card, CardHead } from '@/components/Card';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { StatusBadge } from '@/components/StatusBadge';
import { usePagedRows } from '@/hooks/usePagedRows';
import { EssActorPicker } from '@/features/ess-time/components/EssActorPicker';
import { PunchConsole, PunchSavedModal, SelfieModal } from '@/features/attendance/components/PunchConsole';
import { useRecordPunch } from '@/features/attendance/hooks/useAttendance';
import { captureChannel, newIdempotencyKey, nextPunchType } from '@/features/attendance/rules';
import { ATTENDANCE_TODAY } from '@/features/attendance/mock-data';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import { useMyAttendanceDays, useMyPunchesToday } from '@/features/ess-time/hooks/useEssTime';
import { ESS_VIEWERS } from '@/features/ess-time/mock-data';
import { ARRANGEMENT_LABEL, ATTENDANCE_STATUS_LABEL, DAY_TYPE_LABEL } from '@/features/attendance/types';
import type { AttendanceDay, AttendanceStatus, Punch } from '@/features/attendance/types';
import { formatDate, formatDateTime } from '@/lib/format';

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
export function EssAttendancePage() {
  const [actor, setActor] = useState(ESS_VIEWERS[0]);
  const session = { employeeId: actor.employeeId, role: 'EMPLOYEE' as const };
  const days = useMyAttendanceDays(actor);
  const punches = useMyPunchesToday(actor);

  const punch = useRecordPunch(session);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
  const [selfieOpen, setSelfieOpen] = useState(false);
  const [punchResult, setPunchResult] = useState<PunchResult | null>(null);

  const today = punches.data ?? [];
  const channel = captureChannel(session, days.data ?? []);
  const nextType = nextPunchType(session.employeeId, today);
  const tappedIn = today.find((row) => row.punchType === 'IN');

  const doPunch = async () => {
    try {
      const result = await punch.mutateAsync({
        selfieCaptured,
        // Satu kunci per percobaan tap; ditekan ulang dengan kunci yang sama = baris yang sama.
        idempotencyKey: newIdempotencyKey(),
      });
      setSelfieCaptured(false);
      setPunchResult(result);
    } catch {
      // Penolakan gerbang sudah tampil sebagai toast; frame selfie sengaja dipertahankan.
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
        <PunchConsole
          workDate={ATTENDANCE_TODAY}
          channel={channel}
          nextType={nextType}
          hasTaps={today.length > 0}
          tappedInAt={tappedIn ? tappedIn.punchAt.slice(11, 16) : null}
          selfieCaptured={selfieCaptured}
          onTakeSelfie={() => setSelfieOpen(true)}
          onPunch={doPunch}
          busy={punch.isPending}
        />

        <Card>
          <CardHead title="Tap hari ini" sub="Setiap tap tercatat apa adanya — termasuk tap ulang" />
          <DataTable<Punch>
            rows={today}
            rowKey={(row) => row.id}
            loading={punches.isLoading}
            empty="Belum ada tap hari ini."
            columns={[
              { key: 'type', header: 'Jenis', strong: true, render: (row) => (row.punchType === 'IN' ? 'Masuk' : 'Pulang') },
              { key: 'at', header: 'Waktu', nowrap: true, render: (row) => formatDateTime(row.punchAt) },
              {
                key: 'geo',
                header: 'Dalam area',
                align: 'center',
                render: (row) =>
                  row.isWithinGeofence === null ? (
                    <StatusBadge tone="mute">Tak terbaca</StatusBadge>
                  ) : row.isWithinGeofence ? (
                    <StatusBadge tone="ok">Ya</StatusBadge>
                  ) : (
                    <StatusBadge tone="warn">Di luar</StatusBadge>
                  ),
              },
              {
                key: 'flag',
                header: 'Catatan',
                muted: true,
                render: (row) =>
                  row.isMockLocationSuspected
                    ? 'Lokasi terindikasi palsu'
                    : row.isWorkArrangementUnknown
                      ? 'Pola kerja belum diketahui'
                      : '—',
              },
            ]}
          />
        </Card>

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
      </div>

      <SelfieModal open={selfieOpen} onClose={() => setSelfieOpen(false)} onCaptured={() => setSelfieCaptured(true)} />
      <PunchSavedModal result={punchResult} selfieRequired={channel.selfie} onClose={() => setPunchResult(null)} />
    </PageShell>
  );
}
