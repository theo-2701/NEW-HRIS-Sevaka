import { useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { TabMenu } from '@/components/TabMenu';
import { Segmented } from '@/components/Segmented';
import { Card, CardHead } from '@/components/Card';
import { DataTable, CellIdentity } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { TableToolbar } from '@/components/TableToolbar';
import { FilterModal } from '@/components/FilterModal';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/button';
import { RowActions, RowButton } from '@/components/RowActions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePagedRows } from '@/hooks/usePagedRows';
import { Note } from '@/features/time-off/components/TimeOffBits';
import {
  AttendanceStatusBadge,
  CorrectionStatusBadge,
  ExcusedCell,
  FlagsCell,
  Minutes,
  RadiusCell,
} from '@/features/attendance/components/AttendanceBits';
import { PunchConsole, PunchSavedModal, TapModal } from '@/features/attendance/components/PunchConsole';
import type { TapSubmission } from '@/features/attendance/components/PunchConsole';
import {
  CorrectionDecisionModal,
  CorrectionDetailModal,
  CorrectionFormModal,
  WithdrawCorrectionModal,
} from '@/features/attendance/components/CorrectionModals';
import {
  CorrectionFilterFields,
  DayFilterFields,
  TapFilterFields,
} from '@/features/attendance/components/AttendanceFilters';
import {
  EMPTY_CORRECTION_FILTER,
  EMPTY_DAY_FILTER,
  EMPTY_TAP_FILTER,
  countActive,
  summarizeCorrectionFilter,
  summarizeDayFilter,
  summarizeTapFilter,
  type CorrectionFilterState,
  type DayFilterState,
  type TapFilterState,
} from '@/features/attendance/attendanceFilters';
import {
  useAttendanceDays,
  useCorrections,
  useRecordPunch,
  useTapHistory,
  useTodayPunches,
} from '@/features/attendance/hooks/useAttendance';
import { ATTENDANCE_TODAY, VIEWERS, employeeName } from '@/features/attendance/mock-data';
import {
  arrangementToday,
  eligibleDays,
  newIdempotencyKey,
  nextPunchType,
  resolveGeofence,
  selfieRequiredAtTap,
} from '@/features/attendance/rules';
import {
  ARRANGEMENT_LABEL,
  ATTENDANCE_STATUS_LABEL,
  CORRECTION_REASON_LABEL,
  DAY_TYPE_LABEL,
  canApproveCorrection,
  canCreateCorrection,
  canSearchPunch,
  isSelfScoped,
} from '@/features/attendance/types';
import type { AttendanceDay, AttendanceSession, Correction, Punch } from '@/features/attendance/types';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'punch' | 'history' | 'correction';
type SubTab = 'daily' | 'taps';

/**
 * Time › Attendance — port `_prototype/time-attendance.html`
 * (FSD-001-TIME §5 · UIC-001-TIME §6).
 *
 * Tap adalah bukti: append-only, tanpa ubah dan tanpa hapus di mana pun di layar
 * ini. Ringkasan harian adalah putusan mesin dengan nol endpoint tulis. Satu-
 * satunya jalur sah menggeser penilaian sebuah hari adalah pengajuan koreksi —
 * dan pengajunya tidak pernah bisa jadi penyetujunya.
 */
export function AttendancePage() {
  const [session, setSession] = useState<AttendanceSession>(VIEWERS[0]);
  const [tab, setTab] = useState<Tab>('punch');
  const [subTab, setSubTab] = useState<SubTab>('daily');

  const [dayFilter, setDayFilter] = useState<DayFilterState>(EMPTY_DAY_FILTER);
  const [tapFilter, setTapFilter] = useState<TapFilterState>(EMPTY_TAP_FILTER);
  const [correctionFilter, setCorrectionFilter] = useState<CorrectionFilterState>(EMPTY_CORRECTION_FILTER);
  const [dayFilterOpen, setDayFilterOpen] = useState(false);
  const [tapFilterOpen, setTapFilterOpen] = useState(false);
  const [correctionFilterOpen, setCorrectionFilterOpen] = useState(false);

  /** Satu `Idempotency-Key` per percobaan tap — lahir saat modal dibuka, dipakai ulang saat kirim ulang. */
  const [tapKey, setTapKey] = useState<string | null>(null);
  const [punchResult, setPunchResult] = useState<PunchResult | null>(null);

  const [filing, setFiling] = useState(false);
  const [detail, setDetail] = useState<Correction | null>(null);
  const [withdrawing, setWithdrawing] = useState<Correction | null>(null);
  const [deciding, setDeciding] = useState<{ row: Correction; kind: 'APPROVED' | 'REJECTED' } | null>(null);

  const dayQuery = useMemo(
    () => ({
      attendanceStatus: dayFilter.attendanceStatus === 'ALL' ? undefined : dayFilter.attendanceStatus,
      dayType: dayFilter.dayType === 'ALL' ? undefined : dayFilter.dayType,
      excused: dayFilter.excused === 'ALL' ? undefined : (dayFilter.excused as 'YES' | 'NO'),
      employeeId: dayFilter.employeeId === 'ALL' ? undefined : dayFilter.employeeId,
    }),
    [dayFilter],
  );

  const tapQuery = useMemo(
    () => ({
      punchType: tapFilter.punchType === 'ALL' ? undefined : tapFilter.punchType,
      geofence: tapFilter.geofence === 'ALL' ? undefined : (tapFilter.geofence as 'IN' | 'OUT' | 'UNKNOWN'),
      mockLocation: tapFilter.mockLocation === 'ALL' ? undefined : (tapFilter.mockLocation as 'YES' | 'NO'),
      employeeId: tapFilter.employeeId === 'ALL' ? undefined : tapFilter.employeeId,
    }),
    [tapFilter],
  );

  const correctionQuery = useMemo(
    () => ({
      correctionStatus: correctionFilter.correctionStatus === 'ALL' ? undefined : correctionFilter.correctionStatus,
      correctionReasonType:
        correctionFilter.correctionReasonType === 'ALL' ? undefined : correctionFilter.correctionReasonType,
      employeeId: correctionFilter.employeeId === 'ALL' ? undefined : correctionFilter.employeeId,
    }),
    [correctionFilter],
  );

  const { data: today = [] } = useTodayPunches(session);
  const { data: days = [], isLoading: daysLoading } = useAttendanceDays(session, dayQuery);
  const { data: taps = [], isLoading: tapsLoading } = useTapHistory(session, tapQuery);
  const { data: corrections = [], isLoading: correctionsLoading } = useCorrections(session, correctionQuery);
  const { data: allDays = [] } = useAttendanceDays(session, {});
  const { data: allCorrections = [] } = useCorrections(session, {});

  const pagedDays = usePagedRows(days);
  const pagedTaps = usePagedRows(taps);
  const pagedCorrections = usePagedRows(corrections);

  const punch = useRecordPunch(session);
  const geofence = resolveGeofence(session.employeeId);
  const selfieRequired = selfieRequiredAtTap(geofence);
  const next = nextPunchType(session.employeeId, today);
  const tappedIn = today.find((row) => row.punchType === 'IN');
  const todayRow = allDays.find((row) => row.employeeId === session.employeeId && row.workDate === ATTENDANCE_TODAY);
  const formDays = eligibleDays(session, allDays, allCorrections);

  const approver = canApproveCorrection(session);
  const creator = canCreateCorrection(session);
  // EMPLOYEE hanya melihat barisnya sendiri — kolom dan pemilih orang tidak berarti baginya.
  const self = isSelfScoped(session);

  const doPunch = async (submission: TapSubmission) => {
    if (!tapKey || !next) return;
    try {
      const result = await punch.mutateAsync({ ...submission, punchType: next, idempotencyKey: tapKey });
      setTapKey(null);
      setPunchResult(result);
    } catch {
      // Penolakan sudah tampil; modal tetap terbuka dengan isinya supaya bisa dikirim ulang.
    }
  };

  const correctionActions = (row: Correction) => {
    const actions = [];
    if (row.correctionStatus === 'PENDING_APPROVAL') {
      if (row.employeeId === session.employeeId) {
        actions.push({ label: 'Withdraw', danger: true, onSelect: () => setWithdrawing(row) });
      } else if (approver) {
        actions.push({ label: 'Approve', onSelect: () => setDeciding({ row, kind: 'APPROVED' as const }) });
        actions.push({ label: 'Reject', danger: true, onSelect: () => setDeciding({ row, kind: 'REJECTED' as const }) });
      }
    }
    if (!actions.length) return <RowButton onClick={() => setDetail(row)}>View Detail</RowButton>;
    return <RowActions actions={[...actions, { label: 'View Detail', onSelect: () => setDetail(row) }]} />;
  };

  const dayOf = (id: string) => allDays.find((row) => row.id === id);

  const filterButton = (active: number, onClick: () => void) => (
    <Button variant="secondary" onClick={onClick}>
      {active > 0 ? `Filter (${active})` : 'Filter'}
    </Button>
  );

  return (
    <>
      <PageShell
        crumbs={[{ label: 'Time Management' }, { label: 'Attendance' }]}
        title="Attendance"
        description="Your daily taps and attendance summary. To fix a day's record, submit a correction request."
        actions={
          tab === 'correction' && creator ? (
            <Button onClick={() => setFiling(true)}>
              {session.role === 'HR_STAFF' ? 'File on behalf' : 'New correction'}
            </Button>
          ) : undefined
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-body text-xs font-medium text-fg-3">Viewing as</span>
            <Select
              value={session.employeeId}
              onValueChange={(value) => {
                const nextSession = VIEWERS.find((row) => row.employeeId === value);
                if (nextSession) {
                  setSession(nextSession);
                  // Filter orang/mock milik peran sebelumnya tidak berlaku bagi sesi berlingkup diri sendiri.
                  setDayFilter(EMPTY_DAY_FILTER);
                  setTapFilter(EMPTY_TAP_FILTER);
                  setCorrectionFilter(EMPTY_CORRECTION_FILTER);
                  pagedDays.resetPage();
                  pagedTaps.resetPage();
                  pagedCorrections.resetPage();
                }
              }}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEWERS.map((viewer) => (
                  <SelectItem key={viewer.employeeId} value={viewer.employeeId}>
                    {employeeName(viewer.employeeId)} — {viewer.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabMenu<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'punch', label: 'Punch' },
              { value: 'history', label: 'History & Summary', count: days.length },
              { value: 'correction', label: 'Correction', count: corrections.length },
            ]}
          />

          {tab === 'punch' && (
            <PunchConsole
              workDate={ATTENDANCE_TODAY}
              geofence={geofence}
              selfieRequired={selfieRequired}
              nextType={next}
              today={today}
              day={todayRow}
              onStart={() => setTapKey(newIdempotencyKey())}
            />
          )}

          {tab === 'history' && (
            <div className="flex flex-col gap-5">
              <Segmented<SubTab>
                value={subTab}
                onChange={setSubTab}
                options={[
                  { value: 'daily', label: 'Daily summary' },
                  { value: 'taps', label: 'Tap history' },
                ]}
              />

              {subTab === 'daily' && (
                <Card>
                  <CardHead
                    title="Daily summary"
                    sub={self ? 'Your attendance verdict per day' : 'Attendance verdict per employee per day'}
                  />
                  <div className="flex flex-col">
                    <TableToolbar
                      filters={filterButton(countActive(dayFilter), () => setDayFilterOpen(true))}
                      summary={summarizeDayFilter(dayFilter)}
                    />
                    <DataTable<AttendanceDay>
                      rows={pagedDays.rows}
                      rowKey={(row) => row.id}
                      loading={daysLoading}
                      empty="No day matches these criteria."
                      columns={[
                        {
                          key: 'date',
                          header: 'Date',
                          strong: true,
                          nowrap: true,
                          render: (row) => formatDate(row.workDate),
                        },
                        ...(self
                          ? []
                          : [
                              {
                                key: 'employee',
                                header: 'Employee',
                                render: (row: AttendanceDay) => (
                                  <CellIdentity
                                    name={employeeName(row.employeeId)}
                                    leading={<Avatar name={employeeName(row.employeeId)} size="sm" />}
                                  />
                                ),
                              },
                            ]),
                        { key: 'dayType', header: 'Day Type', muted: true, render: (row) => DAY_TYPE_LABEL[row.dayType] },
                        {
                          key: 'arrangement',
                          header: 'Arrangement',
                          muted: true,
                          render: (row) => ARRANGEMENT_LABEL[row.workArrangement],
                        },
                        {
                          key: 'expected',
                          header: 'Expected (snapshot)',
                          nowrap: true,
                          render: (row) =>
                            row.expectedIn ? (
                              `${row.expectedIn} – ${row.expectedOut}`
                            ) : (
                              <span className="text-fg-4">Not scheduled</span>
                            ),
                        },
                        {
                          key: 'tolerance',
                          header: 'Tolerance',
                          align: 'right',
                          render: (row) => <Minutes value={row.appliedLateToleranceMinutes} />,
                        },
                        {
                          key: 'status',
                          header: 'Status',
                          render: (row) => <AttendanceStatusBadge status={row.attendanceStatus} />,
                        },
                        {
                          key: 'worked',
                          header: 'Worked',
                          align: 'right',
                          render: (row) => <Minutes value={row.workedMinutes} />,
                        },
                        {
                          key: 'late',
                          header: 'Late',
                          align: 'right',
                          render: (row) => <Minutes value={row.lateMinutes} negative />,
                        },
                        {
                          key: 'undertime',
                          header: 'Undertime',
                          align: 'right',
                          render: (row) => <Minutes value={row.undertimeMinutes} negative />,
                        },
                        { key: 'excused', header: 'Excused', render: (row) => <ExcusedCell day={row} /> },
                      ]}
                    />
                    <Pagination
                      page={pagedDays.page}
                      pageSize={pagedDays.pageSize}
                      total={pagedDays.total}
                      noun="days"
                      onPageChange={pagedDays.setPage}
                      onPageSizeChange={pagedDays.setPageSize}
                    />
                  </div>
                </Card>
              )}

              {subTab === 'taps' && (
                <Card>
                  <CardHead title="Tap history" sub={self ? 'Every tap you have recorded' : 'Every recorded tap'} />
                  {!canSearchPunch(session) ? (
                    <Note tone="warn" icon={<Lock />}>You don&rsquo;t have access to the tap history.</Note>
                  ) : (
                    <div className="flex flex-col">
                      <TableToolbar
                        filters={filterButton(countActive(tapFilter), () => setTapFilterOpen(true))}
                        summary={summarizeTapFilter(tapFilter)}
                      />
                      <DataTable<Punch>
                        rows={pagedTaps.rows}
                        rowKey={(row) => row.id}
                        loading={tapsLoading}
                        empty="No tap matches these criteria."
                        columns={[
                          {
                            key: 'time',
                            header: 'Tap Time',
                            strong: true,
                            nowrap: true,
                            render: (row) => formatDateTime(row.punchAt),
                          },
                          ...(self
                            ? []
                            : [{ key: 'employee', header: 'Employee', render: (row: Punch) => employeeName(row.employeeId) }]),
                          {
                            key: 'type',
                            header: 'Type',
                            render: (row) => (row.punchType === 'IN' ? 'Tap in' : 'Tap out'),
                          },
                          { key: 'date', header: 'Work Date', muted: true, render: (row) => formatDate(row.workDate) },
                          {
                            key: 'arrangement',
                            header: 'Work Type',
                            render: (row) => row.workArrangement ?? <span className="text-fg-4">—</span>,
                          },
                          { key: 'radius', header: 'Radius', render: (row) => <RadiusCell punch={row} /> },
                          { key: 'note', header: 'Note', muted: true, render: (row) => row.note ?? <span className="text-fg-4">—</span> },
                          { key: 'flags', header: 'Flags', render: (row) => <FlagsCell punch={row} /> },
                        ]}
                      />
                      <Pagination
                        page={pagedTaps.page}
                        pageSize={pagedTaps.pageSize}
                        total={pagedTaps.total}
                        noun="taps"
                        onPageChange={pagedTaps.setPage}
                        onPageSizeChange={pagedTaps.setPageSize}
                      />
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {tab === 'correction' && (
            <Card>
              <CardHead title="Correction" sub="One live correction per day; the filer is never the approver" />
              <div className="flex flex-col">
                <TableToolbar
                  filters={filterButton(countActive(correctionFilter), () => setCorrectionFilterOpen(true))}
                  summary={summarizeCorrectionFilter(correctionFilter)}
                />
                <DataTable<Correction>
                  rows={pagedCorrections.rows}
                  rowKey={(row) => row.id}
                  loading={correctionsLoading}
                  empty="No correction matches these criteria."
                  columns={[
                    { key: 'id', header: 'Correction', strong: true, nowrap: true, render: (row) => row.id },
                    ...(self
                      ? []
                      : [{ key: 'filer', header: 'Filed by', render: (row: Correction) => employeeName(row.employeeId) }]),
                    {
                      key: 'day',
                      header: 'Corrected Day',
                      nowrap: true,
                      render: (row) => {
                        const day = dayOf(row.attendanceDailyId);
                        return day ? (
                          <>
                            {formatDate(day.workDate)}{' '}
                            <span className="text-fg-4">· {ATTENDANCE_STATUS_LABEL[day.attendanceStatus]}</span>
                          </>
                        ) : (
                          '—'
                        );
                      },
                    },
                    ...(self
                      ? []
                      : [
                          {
                            key: 'owner',
                            header: 'Day owner',
                            muted: true,
                            render: (row: Correction) => {
                              const day = dayOf(row.attendanceDailyId);
                              return day ? employeeName(day.employeeId) : '—';
                            },
                          },
                        ]),
                    {
                      key: 'reason',
                      header: 'Reason Type',
                      render: (row) => CORRECTION_REASON_LABEL[row.correctionReasonType],
                    },
                    { key: 'in', header: 'Proposed In', render: (row) => row.requestedIn ?? '—' },
                    { key: 'out', header: 'Proposed Out', render: (row) => row.requestedOut ?? '—' },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (row) => <CorrectionStatusBadge status={row.correctionStatus} />,
                    },
                  ]}
                  actions={correctionActions}
                />
                <Pagination
                  page={pagedCorrections.page}
                  pageSize={pagedCorrections.pageSize}
                  total={pagedCorrections.total}
                  noun="corrections"
                  onPageChange={pagedCorrections.setPage}
                  onPageSizeChange={pagedCorrections.setPageSize}
                />
              </div>
            </Card>
          )}
        </div>
      </PageShell>

      <FilterModal
        open={dayFilterOpen}
        title="Filter daily summary"
        description="Narrow the list with the criteria below."
        onOpenChange={setDayFilterOpen}
        onReset={() => {
          setDayFilter(EMPTY_DAY_FILTER);
          pagedDays.resetPage();
        }}
      >
        <DayFilterFields
          selfOnly={self}
          value={dayFilter}
          onChange={(next) => {
            setDayFilter(next);
            pagedDays.resetPage();
          }}
        />
      </FilterModal>

      <FilterModal
        open={tapFilterOpen}
        title="Filter tap history"
        description="Narrow the list with the criteria below."
        onOpenChange={setTapFilterOpen}
        onReset={() => {
          setTapFilter(EMPTY_TAP_FILTER);
          pagedTaps.resetPage();
        }}
      >
        <TapFilterFields
          selfOnly={self}
          value={tapFilter}
          onChange={(next) => {
            setTapFilter(next);
            pagedTaps.resetPage();
          }}
        />
      </FilterModal>

      <FilterModal
        open={correctionFilterOpen}
        title="Filter corrections"
        description="Narrow the list with the criteria below."
        onOpenChange={setCorrectionFilterOpen}
        onReset={() => {
          setCorrectionFilter(EMPTY_CORRECTION_FILTER);
          pagedCorrections.resetPage();
        }}
      >
        <CorrectionFilterFields
          selfOnly={self}
          value={correctionFilter}
          onChange={(next) => {
            setCorrectionFilter(next);
            pagedCorrections.resetPage();
          }}
        />
      </FilterModal>

      {next && (
        <TapModal
          open={Boolean(tapKey)}
          type={next}
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

      <CorrectionFormModal open={filing} session={session} days={formDays} onClose={() => setFiling(false)} />

      <CorrectionDetailModal
        correction={detail}
        day={detail ? dayOf(detail.attendanceDailyId) : undefined}
        onClose={() => setDetail(null)}
      />

      <WithdrawCorrectionModal
        correction={withdrawing}
        day={withdrawing ? dayOf(withdrawing.attendanceDailyId) : undefined}
        session={session}
        onClose={() => setWithdrawing(null)}
      />

      <CorrectionDecisionModal
        correction={deciding?.row ?? null}
        kind={deciding?.kind ?? 'APPROVED'}
        day={deciding ? dayOf(deciding.row.attendanceDailyId) : undefined}
        session={session}
        onClose={() => setDeciding(null)}
      />
    </>
  );
}
