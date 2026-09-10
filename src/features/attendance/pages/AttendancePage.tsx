import { useMemo, useState } from 'react';
import { Lock, UserRound } from 'lucide-react';
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
import { PunchConsole, PunchSavedModal, SelfieModal } from '@/features/attendance/components/PunchConsole';
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
import { captureChannel, eligibleDays, newIdempotencyKey, nextPunchType } from '@/features/attendance/rules';
import {
  ARRANGEMENT_LABEL,
  ATTENDANCE_STATUS_LABEL,
  CORRECTION_REASON_LABEL,
  DAY_TYPE_LABEL,
  canApproveCorrection,
  canCreateCorrection,
  canSearchPunch,
  canSearchSummary,
} from '@/features/attendance/types';
import type { AttendanceDay, AttendanceSession, Correction, Punch } from '@/features/attendance/types';
import type { PunchResult } from '@/features/attendance/services/attendance.service';
import { formatDate, formatDateTime } from '@/lib/format';

type Tab = 'punch' | 'history' | 'correction';
type SubTab = 'daily' | 'taps';

const hhmm = (iso: string) => iso.slice(11, 16);

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

  const [selfieOpen, setSelfieOpen] = useState(false);
  const [selfieCaptured, setSelfieCaptured] = useState(false);
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

  const pagedToday = usePagedRows(today);
  const pagedDays = usePagedRows(days);
  const pagedTaps = usePagedRows(taps);
  const pagedCorrections = usePagedRows(corrections);

  const punch = useRecordPunch(session);
  const channel = captureChannel(session, allDays);
  const next = nextPunchType(session.employeeId, today);
  const tappedIn = today.find((row) => row.punchType === 'IN');
  const formDays = eligibleDays(session, allDays, allCorrections);

  const approver = canApproveCorrection(session);
  const creator = canCreateCorrection(session);

  const doPunch = async () => {
    try {
      const result = await punch.mutateAsync({
        selfieCaptured,
        // Satu kunci per percobaan tap; dipakai ulang apa adanya bila ditekan lagi.
        idempotencyKey: newIdempotencyKey(),
      });
      setSelfieCaptured(false);
      setPunchResult(result);
    } catch {
      // Penolakan gerbang sudah muncul sebagai toast; frame selfie sengaja
      // dipertahankan supaya percobaan ulang tidak perlu memotret lagi.
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
        description="A tap is evidence: append-only, with no edit and no delete anywhere on this screen. The daily summary is a machine verdict with zero write endpoints at all. The one lawful way to move a day's assessment is a correction request — and its author can never be its approver."
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
            <span className="font-body text-xs font-medium text-fg-3">Dev only — signed in as</span>
            <Select
              value={session.employeeId}
              onValueChange={(value) => {
                const nextSession = VIEWERS.find((row) => row.employeeId === value);
                if (nextSession) {
                  setSession(nextSession);
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

          <Note icon={<UserRound />}>
            {session.role === 'EMPLOYEE' ? (
              <>
                <strong>ESS mode.</strong> Rows are narrowed from the identity claim, not by a second screen.{' '}
                <code>attendance-summary:search</code> is not an EMPLOYEE scope, so the daily grid shows only your own
                days; the tap audit search is investigative and closed to you altogether — today&rsquo;s taps are
                visible on the Punch tab.
              </>
            ) : session.role === 'HR_STAFF' ? (
              <>
                <strong>HR staff.</strong> May file a correction on behalf of a field employee and read the daily
                summary grid — but holds neither the approval scope nor the investigative tap audit search.
              </>
            ) : (
              <>
                <strong>Checker.</strong> Holds the approval scope and the investigative tap audit.{' '}
                <code>attendance-correction:create</code> is not an HR_MANAGER scope, so filing is unavailable in this
                session.
              </>
            )}
          </Note>

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
            <div className="flex flex-col gap-5">
              <PunchConsole
                workDate={ATTENDANCE_TODAY}
                channel={channel}
                nextType={next}
                hasTaps={today.length > 0}
                tappedInAt={tappedIn ? hhmm(tappedIn.punchAt) : null}
                selfieCaptured={selfieCaptured}
                onTakeSelfie={() => setSelfieOpen(true)}
                onPunch={doPunch}
                busy={punch.isPending}
              />

              <Card>
                <CardHead title="Today's taps" sub="Append-only — tidak ada ubah dan tidak ada hapus" />
                <div className="flex flex-col">
                  <DataTable<Punch>
                    rows={pagedToday.rows}
                    rowKey={(row) => row.id}
                    empty="Nothing tapped yet today."
                    columns={[
                      {
                        key: 'type',
                        header: 'Type',
                        strong: true,
                        render: (row) => (row.punchType === 'IN' ? 'Tap in' : 'Tap out'),
                      },
                      { key: 'time', header: 'Tap Time', nowrap: true, render: (row) => hhmm(row.punchAt) },
                      { key: 'date', header: 'Work Date', muted: true, render: (row) => formatDate(row.workDate) },
                      { key: 'radius', header: 'Radius', render: (row) => <RadiusCell punch={row} /> },
                      { key: 'flags', header: 'Flags', render: (row) => <FlagsCell punch={row} /> },
                    ]}
                  />
                  <Pagination
                    page={pagedToday.page}
                    pageSize={pagedToday.pageSize}
                    total={pagedToday.total}
                    noun="taps"
                    onPageChange={pagedToday.setPage}
                    onPageSizeChange={pagedToday.setPageSize}
                  />
                </div>
              </Card>
            </div>
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
                    sub="Putusan mesin — layar ini tidak punya satu pun endpoint tulis"
                  />
                  {!canSearchSummary(session) && (
                    <Note icon={<Lock />}>
                      <code>attendance-summary:search</code> bukan scope EMPLOYEE — barisnya dipersempit ke hari milik{' '}
                      <strong>{employeeName(session.employeeId)}</strong> dari klaim identitas.
                    </Note>
                  )}
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
                        {
                          key: 'employee',
                          header: 'Employee',
                          render: (row) => (
                            <CellIdentity
                              name={employeeName(row.employeeId)}
                              leading={<Avatar name={employeeName(row.employeeId)} size="sm" />}
                            />
                          ),
                        },
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
                  <CardHead title="Tap history" sub="Audit mentah — kewenangan penyelidikan" />
                  {!canSearchPunch(session) ? (
                    <Note tone="warn" icon={<Lock />}>
                      The raw tap audit (<code>attendance-punch:search</code>) is an investigative authority held by
                      HR_MANAGER and SUPER_ADMIN only — a DEPT_MANAGER holding <code>:read</code> still does not hold
                      it. Nothing is loaded here in this session.
                    </Note>
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
                          { key: 'employee', header: 'Employee', render: (row) => employeeName(row.employeeId) },
                          {
                            key: 'type',
                            header: 'Type',
                            render: (row) => (row.punchType === 'IN' ? 'Tap in' : 'Tap out'),
                          },
                          { key: 'date', header: 'Work Date', muted: true, render: (row) => formatDate(row.workDate) },
                          { key: 'radius', header: 'Radius', render: (row) => <RadiusCell punch={row} /> },
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
              <CardHead title="Correction" sub="Satu koreksi hidup per hari; pengaju tidak pernah jadi penyetuju" />
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
                    { key: 'filer', header: 'Filed by', render: (row) => employeeName(row.employeeId) },
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
                    {
                      key: 'owner',
                      header: 'Day owner',
                      muted: true,
                      render: (row) => {
                        const day = dayOf(row.attendanceDailyId);
                        return day ? employeeName(day.employeeId) : '—';
                      },
                    },
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
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setDayFilterOpen}
        onReset={() => {
          setDayFilter(EMPTY_DAY_FILTER);
          pagedDays.resetPage();
        }}
      >
        <DayFilterFields
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
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setTapFilterOpen}
        onReset={() => {
          setTapFilter(EMPTY_TAP_FILTER);
          pagedTaps.resetPage();
        }}
      >
        <TapFilterFields
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
        description="Hanya field yang diterima kontrak pencarian."
        onOpenChange={setCorrectionFilterOpen}
        onReset={() => {
          setCorrectionFilter(EMPTY_CORRECTION_FILTER);
          pagedCorrections.resetPage();
        }}
      >
        <CorrectionFilterFields
          value={correctionFilter}
          onChange={(next) => {
            setCorrectionFilter(next);
            pagedCorrections.resetPage();
          }}
        />
      </FilterModal>

      <SelfieModal open={selfieOpen} onClose={() => setSelfieOpen(false)} onCaptured={() => setSelfieCaptured(true)} />

      <PunchSavedModal result={punchResult} selfieRequired={channel.selfie} onClose={() => setPunchResult(null)} />

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
