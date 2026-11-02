import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { transitionService } from '@/features/transitions/services/transition.service';
import { setupService } from '@/features/transitions/services/setup.service';
import type { MaterializationSetup } from '@/features/transitions/setup-types';
import { toast } from '@/store/ui.store';

/** Semua layar paket Transition berbagi data — satu invalidasi menyegarkan semuanya. */
function useHubMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, message: (result: TResult, vars: TVars) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, vars) => {
      toast(message(result, vars), 'ok');
      void queryClient.invalidateQueries();
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useMyTasks = (viewer: string, tab: 'handler' | 'approver') =>
  useQuery({ queryKey: ['transitions', 'my-tasks', viewer, tab], queryFn: () => transitionService.myTasks(viewer, tab) });

export const useEscalations = (enabled: boolean) =>
  useQuery({ queryKey: ['transitions', 'escalations'], queryFn: () => transitionService.escalations(), enabled });

export const useMyTransitions = (employeeId: string) =>
  useQuery({ queryKey: ['transitions', 'mine', employeeId], queryFn: () => transitionService.myTransitions(employeeId) });

export const useSetups = () => useQuery({ queryKey: ['transitions', 'setups'], queryFn: () => setupService.list() });

export const useSetupAudit = (setupId: string | null) =>
  useQuery({ queryKey: ['transitions', 'setup-audit', setupId], queryFn: () => setupService.audit(setupId!), enabled: Boolean(setupId) });

export const useMaterializeRoles = () => useQuery({ queryKey: ['transitions', 'roles'], queryFn: () => setupService.roles() });

export const useApproveTransition = () =>
  useHubMutation(
    (id: string) => transitionService.completeApprovalWorkflow(id),
    (row) => `${row.employee}: request approved — ${row.tasks.length} task(s) created from the setup.`,
  );

export const useApproveTask = (viewer: string) =>
  useHubMutation(
    ({ transitionId, taskId }: { transitionId: string; taskId: string }) => transitionService.approveTask(viewer, transitionId, taskId),
    () => 'Task approved and completed.',
  );

export const useRejectTask = (viewer: string) =>
  useHubMutation(
    ({ transitionId, taskId, reason }: { transitionId: string; taskId: string; reason: string }) =>
      transitionService.rejectTask(viewer, transitionId, taskId, reason),
    () => 'Task sent back to the handler; the employee confirms again if needed.',
  );

export const useCloseQueue = () =>
  useHubMutation(
    ({ transitionId, note }: { transitionId: string; note: string }) => transitionService.closeQueue(transitionId, note),
    (closed) => `Onboarding closed — ${closed} task(s) cleared from the queue.`,
  );

export const useSaveSetup = (role: 'HR_MANAGER' | 'HR_STAFF', actor: string) =>
  useHubMutation(
    (draft: MaterializationSetup) => setupService.save(role, draft, actor),
    (row) => `Setup saved as version ${row.version}. Running transitions keep their frozen version.`,
  );

export const useSetMaterializeRole = (role: 'HR_MANAGER' | 'HR_STAFF') =>
  useHubMutation(
    ({ accessId, value }: { accessId: string; value: boolean }) => setupService.setRole(role, accessId, value),
    (row) => (row.isMaterialize ? `${row.accessName} can now handle materialization tasks.` : `${row.accessName} removed from materialization.`),
  );
