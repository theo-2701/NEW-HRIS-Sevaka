import { beforeEach, describe, expect, it } from 'vitest';
import { accessLogStore, resetAccessLog } from '@/features/performance/services/access-log';
import { approvalService, flushWorkflow, resetApprovalMocks } from '@/features/performance/services/approval.service';
import { monitorService } from '@/features/performance/services/monitor.service';
import { objectionService, resetObjectionMocks } from '@/features/performance/services/objection.service';
import { resetPeriodMocks } from '@/features/performance/services/period.service';
import { resetKpiMocks } from '@/features/performance/services/kpi.service';
import { resetSheetMocks, sheetService } from '@/features/performance/services/sheet.service';
import { resetSnapshots } from '@/features/performance/services/snapshot-store';
import { PERF_ACTORS } from '@/features/performance/mock-data';

const who = (id: string) => PERF_ACTORS.find((row) => row.employeeId === id)!;
const HESTI = who('emp-hesti');
const LUKMAN = who('emp-lukman');
const BUDI = who('emp-budi-dm');
const RINA = who('emp-rina-amelia');
const DEDI = who('emp-dedi');
const YANTI = who('emp-yanti');
const PERIOD = 'rp-2026-s1';
const logCount = () => accessLogStore.all().length;

beforeEach(() => {
  resetPeriodMocks();
  resetKpiMocks();
  resetSheetMocks();
  resetApprovalMocks();
  resetObjectionMocks();
  resetSnapshots();
  resetAccessLog();
});

describe('Papan pantau (PL-01/PL-02)', () => {
  it('SELF tanpa jejak akses; empat bentuk kosong dibedakan; disclaimer selalu ada', async () => {
    const own = await monitorService.signalBoard(DEDI, null);
    expect(own).toMatchObject({ reviewPeriodName: 'Semester 1 2026', reviewPeriodPhase: 'SIGNING' });
    const byKey = Object.fromEntries(own.groups.map((row) => [row.groupKey, row]));
    expect(byKey.PRODUCTIVITY).toMatchObject({ emptyState: null, recap: { productivity_task_assigned_count: 5, productivity_task_ontime_count: 0 } });
    expect(byKey.PENDING_DECISION.emptyState).toBe('NO_RECORD');
    expect(byKey.REPRIMAND.emptyState).toBe('NOT_AVAILABLE');
    expect(own.reprimandDisclaimer).toBeTruthy();
    expect(logCount()).toBe(3);
    await expect(monitorService.signalBoard(BUDI, null)).rejects.toMatchObject({ status: 403 });
  });

  it('orang lain: HR & rantai sekarang; peer 404 tanpa baris; baca berhasil tepat satu baris', async () => {
    await monitorService.signalBoard(HESTI, 'emp-dedi');
    expect(logCount()).toBe(4);
    await monitorService.signalBoard(RINA, 'emp-dedi');
    expect(logCount()).toBe(5);
    await expect(monitorService.signalBoard(BUDI, 'emp-rina-amelia')).rejects.toMatchObject({ status: 404 });
    await expect(monitorService.signalBoard(YANTI, 'emp-dedi')).rejects.toMatchObject({ status: 404 });
    expect(logCount()).toBe(5);
    expect(accessLogStore.all()[0]).toMatchObject({ readerEmployeeId: 'emp-rina-amelia', subjectEmployeeId: 'emp-dedi', activity: 'I' });
  });
});

describe('Riwayat beku (PL-03..PL-05)', () => {
  it('field beku + field hidup yang menempel; rantai sekarang boleh, peer 404', async () => {
    const mine = await monitorService.reviewHistory(BUDI, 'emp-budi-dm').catch((error) => error);
    expect(mine).toMatchObject({ status: 404 });
    const rina = await monitorService.reviewHistory(RINA, 'emp-budi-dm');
    expect(rina.rows[0]).toMatchObject({ snapshotId: 'snap-0002-1', revisionNo: 1, employeeName: 'Budi Santoso' });
    const detail = await monitorService.snapshot(HESTI, 'snap-0002-1');
    expect(detail).toMatchObject({
      jobGradeNameSnapshot: 'Staff 2',
      scaleLength: 5,
      objectionDeadlineDaysFrozen: 14,
      reprimandStateSnapshot: { state: 'CLEAR' },
      objectionSummary: { status: 'SUBMITTED', objectionId: 'obj-0001' },
      currentIncidentRecapAvailable: true,
    });
    await objectionService.answer(RINA, 'obj-0001', 'Sudah sesuai.', 'k-answer');
    expect((await monitorService.snapshot(HESTI, 'snap-0002-1')).objectionSummary?.status).toBe('ANSWERED');
    await expect(monitorService.snapshot(DEDI, 'snap-0002-1')).rejects.toMatchObject({ status: 404 });
  });

  it('pengesahan K9 membentuk revisi beku baru untuk lembar itu', async () => {
    await sheetService.setInitialValue(BUDI, 'rs-0001', 'rsi-0001-2', 'Baik', 'k1');
    await sheetService.setInitialValue(BUDI, 'rs-0001', 'rsi-0001-3', 'Selesai', 'k2');
    await sheetService.submit(BUDI, 'rs-0001');
    await approvalService.decide(RINA, 'rs-0001', { decision: 'APPROVED' });
    await flushWorkflow();
    const own = await monitorService.reviewHistory(DEDI, null);
    expect(own.rows).toHaveLength(1);
    expect(own.rows[0]).toMatchObject({ reviewSheetId: 'rs-0001', revisionNo: 1, jobGradeNameSnapshot: 'Staff 2' });
  });
});

describe('Laporan HR (PL-06..PL-12)', () => {
  it('sebaran penugasan: null bukan nol; DM hanya dirinya', async () => {
    const all = await monitorService.taskDistribution(HESTI, PERIOD);
    const budi = all.find((row) => row.supervisorEmployeeId === 'emp-budi-dm')!;
    expect(budi.subordinates.map((row) => [row.employeeName, row.assignedTaskCount])).toEqual([
      ['Dedi Kurniawan', 5],
      ['Yanti Prasetya', null],
    ]);
    await expect(monitorService.taskDistribution(BUDI, PERIOD)).resolves.toHaveLength(1);
    await expect(monitorService.taskDistribution(BUDI, PERIOD, 'emp-rina-amelia')).rejects.toMatchObject({ status: 404 });
  });

  it('dua laporan HR Manager saja; HR Staff ditolak', async () => {
    await expect(monitorService.notYetAssessable(HESTI, PERIOD)).resolves.toEqual([
      expect.objectContaining({ employeeName: 'Ahmad Fauzi', reason: 'NO_ASSESSOR_IN_STRUCTURE' }),
    ]);
    await expect(monitorService.notYetAssessable(LUKMAN, PERIOD)).rejects.toMatchObject({ status: 403 });
    await expect(monitorService.inactiveKpi(LUKMAN, { page: 1, size: 20 })).rejects.toMatchObject({ status: 403 });
    await expect(monitorService.inactiveKpi(HESTI, { page: 1, size: 20 })).resolves.toMatchObject({ totalData: 1 });
    const excluded = await monitorService.excluded(LUKMAN, PERIOD);
    expect(excluded.map((row) => row.reason).sort()).toEqual(['APPROVER_CHAIN_EXHAUSTED', 'NOT_INCLUDED_MID_PERIOD']);
  });

  it('porsi tambahan berbasis bobot; proporsi isian & tanda baca; sanggahan belum dijawab', async () => {
    const ratio = await monitorService.additionalRatio(HESTI, PERIOD);
    expect(ratio.find((row) => row.supervisorEmployeeId === 'emp-budi-dm')).toMatchObject({
      additionalWeightRatio: 13,
      maxRatioThreshold: 30,
    });
    const blank = await monitorService.blankInput(HESTI, PERIOD);
    expect(blank.find((row) => row.supervisorEmployeeId === 'emp-budi-dm')).toMatchObject({
      blankSelfAssessmentRatio: 0,
      unreadItemRatio: 50,
    });
    const mix = await monitorService.targetTypeMix(LUKMAN, PERIOD);
    expect(mix.find((row) => row.jobGradeNameSnapshot === 'Staff 2')).toMatchObject({ numericCount: 2, narrativeCount: 2 });
    await expect(monitorService.pendingObjections(RINA)).resolves.toEqual([
      expect.objectContaining({ objectionId: 'obj-0001', currentHolderContext: 'PENILAI_ASLI' }),
    ]);
    await expect(monitorService.pendingObjections(BUDI, 'emp-rina-amelia')).rejects.toMatchObject({ status: 403 });
    await expect(monitorService.targetTypeMix(BUDI, PERIOD)).rejects.toMatchObject({ status: 403 });
  });
});

describe('Jejak akses (PL-13)', () => {
  it('HR saja, urut created_at DESC, tiga filter persis kontrak', async () => {
    const all = await monitorService.accessLogs(HESTI, { page: 1, size: 20 });
    expect(all.rows.map((row) => row.id)).toEqual(['al-0002', 'al-0001', 'al-0003']);
    const hesti = await monitorService.accessLogs(LUKMAN, { readerEmployeeId: 'emp-hesti', page: 1, size: 20 });
    expect(hesti.totalData).toBe(2);
    const july = await monitorService.accessLogs(HESTI, { startDate: '2026-07-01', endDate: '2026-07-10', page: 1, size: 20 });
    expect(july.rows.map((row) => row.id)).toEqual(['al-0001']);
    await expect(monitorService.accessLogs(DEDI, { page: 1, size: 20 })).rejects.toMatchObject({ status: 403 });
    await expect(monitorService.accessLogs(BUDI, { page: 1, size: 20 })).rejects.toMatchObject({ status: 403 });
  });

  it('titik pemicu lintas-menu: HR membuka lembar dan sanggahan orang lain', async () => {
    await sheetService.get(HESTI, 'rs-0001');
    await objectionService.get(HESTI, 'obj-0001');
    await sheetService.get(BUDI, 'rs-0001');
    expect(logCount()).toBe(5);
  });
});
