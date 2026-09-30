import { useQuery } from '@tanstack/react-query';
import { monitorService } from '@/features/performance/services/monitor.service';
import type { AccessLogSearch, PerfActor, ReportKey } from '@/features/performance/types';

/* Menu 6 baca-saja: nol mutasi. Kunci memakai employeeId karena cakupan baca terikat identitas. */

export const monitorKeys = {
  all: ['performance', 'monitor'] as const,
  roster: (who: string) => ['performance', 'monitor', 'roster', who] as const,
  board: (who: string, subject: string, period: string) => ['performance', 'monitor', 'board', who, subject, period] as const,
  history: (who: string, subject: string, all: boolean) => ['performance', 'monitor', 'history', who, subject, all] as const,
  snapshot: (who: string, id: string) => ['performance', 'monitor', 'snapshot', who, id] as const,
  report: (who: string, key: ReportKey, params: object) => ['performance', 'monitor', 'report', who, key, params] as const,
  access: (who: string, query: AccessLogSearch) => ['performance', 'monitor', 'access', who, query] as const,
};

export const useRoster = (actor: PerfActor) =>
  useQuery({ queryKey: monitorKeys.roster(actor.employeeId), queryFn: () => monitorService.roster(actor) });

/** `subject` null = SELF (`/me/...`). */
export const useSignalBoard = (actor: PerfActor, subject: string | null, periodId: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: monitorKeys.board(actor.employeeId, subject ?? 'self', periodId ?? 'default'),
    queryFn: () => monitorService.signalBoard(actor, subject, periodId),
    enabled,
    retry: false,
  });

export const useReviewHistory = (actor: PerfActor, subject: string | null, includeRevisions: boolean, enabled: boolean) =>
  useQuery({
    queryKey: monitorKeys.history(actor.employeeId, subject ?? 'self', includeRevisions),
    queryFn: () => monitorService.reviewHistory(actor, subject, includeRevisions),
    enabled,
    retry: false,
  });

export const useSnapshot = (actor: PerfActor, id: string | null) =>
  useQuery({
    queryKey: monitorKeys.snapshot(actor.employeeId, id ?? ''),
    queryFn: () => monitorService.snapshot(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

const useReport = <T>(actor: PerfActor, key: ReportKey, params: object, run: () => Promise<T>, enabled: boolean) =>
  useQuery({ queryKey: monitorKeys.report(actor.employeeId, key, params), queryFn: run, enabled, retry: false });

// Laporan HR `PL-06`..`PL-12` — satu hook per laporan supaya bentuk barisnya tetap bertipe.

export const useTaskDistribution = (actor: PerfActor, periodId: string, enabled: boolean) =>
  useReport(actor, 'task-distribution', { periodId }, () => monitorService.taskDistribution(actor, periodId), enabled);

export const useTargetMix = (actor: PerfActor, periodId: string, enabled: boolean) =>
  useReport(actor, 'kpi-item-target-type-mix', { periodId }, () => monitorService.targetTypeMix(actor, periodId), enabled);

export const useInactiveKpi = (actor: PerfActor, query: { jobGradeId?: string; page: number; size: number }, enabled: boolean) =>
  useReport(actor, 'kpi-item-inactive', query, () => monitorService.inactiveKpi(actor, query), enabled);

export const useAdditionalRatio = (actor: PerfActor, periodId: string, enabled: boolean) =>
  useReport(actor, 'additional-item-ratio', { periodId }, () => monitorService.additionalRatio(actor, periodId), enabled);

export const useReasonReport = (
  actor: PerfActor,
  kind: 'not-yet-assessable' | 'excluded-from-assessment',
  periodId: string,
  enabled: boolean,
) =>
  useReport(
    actor,
    kind,
    { periodId },
    () => (kind === 'not-yet-assessable' ? monitorService.notYetAssessable(actor, periodId) : monitorService.excluded(actor, periodId)),
    enabled,
  );

export const useBlankInput = (actor: PerfActor, periodId: string, enabled: boolean) =>
  useReport(actor, 'blank-input-ratio', { periodId }, () => monitorService.blankInput(actor, periodId), enabled);

export const usePendingObjectionReport = (actor: PerfActor, enabled: boolean) =>
  useReport(actor, 'pending-objections', {}, () => monitorService.pendingObjections(actor), enabled);

export const useAccessLogs = (actor: PerfActor, query: AccessLogSearch, enabled: boolean) =>
  useQuery({
    queryKey: monitorKeys.access(actor.employeeId, query),
    queryFn: () => monitorService.accessLogs(actor, query),
    enabled,
  });
