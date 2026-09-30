import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timesheetService } from '@/features/productivity/services/timesheet.service';
import type { ManualWorklogDraft, ProdActor, WorklogPatch, WorklogSearch } from '@/features/productivity/types';
import { toast } from '@/store/ui.store';

const ROOT = ['productivity'] as const;

export const timesheetKeys = {
  activityTypes: ['productivity', 'activity-types'] as const,
  running: (actor: ProdActor) => ['productivity', 'timer', actor.employeeId] as const,
  worklogs: (actor: ProdActor, search: WorklogSearch) =>
    ['productivity', 'worklogs', actor.employeeId, search] as const,
  report: (actor: ProdActor, search: WorklogSearch) =>
    ['productivity', 'tracker-report', actor.employeeId, search] as const,
  changes: (actor: ProdActor, id: string) => ['productivity', 'worklog-changes', actor.employeeId, id] as const,
  periods: (actor: ProdActor, employeeId: string) => ['productivity', 'periods', actor.employeeId, employeeId] as const,
  groups: ['productivity', 'paid-groups'] as const,
  mappings: (activeOnly: boolean) => ['productivity', 'mappings', activeOnly] as const,
};

export const useActivityTypes = () =>
  useQuery({ queryKey: timesheetKeys.activityTypes, queryFn: () => timesheetService.activityTypes() });

export const useRunningTimer = (actor: ProdActor) =>
  useQuery({ queryKey: timesheetKeys.running(actor), queryFn: () => timesheetService.runningTimer(actor) });

export const useWorklogs = (actor: ProdActor, search: WorklogSearch) =>
  useQuery({
    queryKey: timesheetKeys.worklogs(actor, search),
    queryFn: () => timesheetService.search(actor, search),
    retry: false,
  });

export const useTrackerReport = (actor: ProdActor, search: WorklogSearch) =>
  useQuery({
    queryKey: timesheetKeys.report(actor, search),
    queryFn: () => timesheetService.trackerReport(actor, search),
    retry: false,
  });

export const useWorklogChanges = (actor: ProdActor, id: string | null) =>
  useQuery({
    queryKey: timesheetKeys.changes(actor, id ?? ''),
    queryFn: () => timesheetService.changes(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const usePeriods = (actor: ProdActor, employeeId: string) =>
  useQuery({
    queryKey: timesheetKeys.periods(actor, employeeId),
    queryFn: () => timesheetService.periods(actor, employeeId),
    retry: false,
  });

export const usePaidGroups = () =>
  useQuery({ queryKey: timesheetKeys.groups, queryFn: () => timesheetService.groups() });

export const useMappings = (activeOnly: boolean) =>
  useQuery({ queryKey: timesheetKeys.mappings(activeOnly), queryFn: () => timesheetService.mappings(activeOnly) });

function useTsMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  success: (result: TResult) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      toast(success(result));
      void queryClient.invalidateQueries({ queryKey: ROOT });
    },
  });
}

export const useStartTimer = () =>
  useTsMutation(
    ({ actor, taskId, activityTypeId }: { actor: ProdActor; taskId: string; activityTypeId: string }) =>
      timesheetService.startTimer(actor, taskId, activityTypeId),
    (result) => `201 Created — timer ${result.worklog.code} started`,
  );

export const useStopTimer = () =>
  useTsMutation(
    ({ actor }: { actor: ProdActor }) => timesheetService.stopTimer(actor),
    (row) => `200 OK — ${row.code} saved, ${row.durationMinutes} minutes`,
  );

export const useCreateManual = () =>
  useTsMutation(
    ({ actor, draft }: { actor: ProdActor; draft: ManualWorklogDraft }) => timesheetService.createManual(actor, draft),
    (row) => `201 Created — ${row.code}, ${row.durationMinutes} minutes typed`,
  );

export const useUpdateWorklog = () =>
  useTsMutation(
    ({ actor, id, patch }: { actor: ProdActor; id: string; patch: WorklogPatch }) =>
      timesheetService.update(actor, id, patch),
    (row) => `200 OK — ${row.code} updated`,
  );

export const useDeleteWorklog = () =>
  useTsMutation(
    ({ actor, id }: { actor: ProdActor; id: string; code: string }) => timesheetService.remove(actor, id),
    () => 'Time entry deleted',
  );

export const useAcceptSystemStop = () =>
  useTsMutation(
    ({ actor, id }: { actor: ProdActor; id: string }) => timesheetService.acceptSystemStop(actor, id),
    () => '200 OK — accepted as is, duration unchanged',
  );

export const useGrantWindow = () =>
  useTsMutation(
    ({
      actor,
      input,
    }: {
      actor: ProdActor;
      input: { targetEmployeeId: string; windowStartDate: string; windowEndDate: string; grantReason: string };
    }) => timesheetService.grantWindow(actor, input),
    (grant) => `201 Created — entry window opened ${grant.windowStartDate} to ${grant.windowEndDate}`,
  );

export const useSubmitPeriod = () =>
  useTsMutation(
    ({ actor, id }: { actor: ProdActor; id: string }) => timesheetService.submitPeriod(actor, id),
    () => '200 OK — timesheet submitted for approval',
  );

export const useReopenPeriod = () =>
  useTsMutation(
    ({ actor, id, reason }: { actor: ProdActor; id: string; reason: string }) =>
      timesheetService.reopenPeriod(actor, id, reason),
    () => '200 OK — timesheet returned to the owner',
  );

export const useSaveGroup = () =>
  useTsMutation(
    ({ actor, input, id }: { actor: ProdActor; input: { groupName: string; isActive?: boolean }; id?: string }) =>
      timesheetService.saveGroup(actor, input, id),
    (row) => `${row.code} ${row.groupName} saved`,
  );

export const useCreateMapping = () =>
  useTsMutation(
    ({
      actor,
      taskCategoryId,
      paidWorkGroupId,
    }: {
      actor: ProdActor;
      taskCategoryId: string;
      paidWorkGroupId: string;
    }) => timesheetService.createMapping(actor, taskCategoryId, paidWorkGroupId),
    () => '201 Created — category mapped',
  );

export const useDeactivateMapping = () =>
  useTsMutation(
    ({ actor, id, reason }: { actor: ProdActor; id: string; reason: string }) =>
      timesheetService.deactivateMapping(actor, id, reason),
    () => 'Mapping deactivated — recorded hours are unchanged',
  );
