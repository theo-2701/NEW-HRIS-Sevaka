import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mastersService } from '@/features/employee-masters/services/masters.service';
import type { MasterFilter } from '@/features/employee-masters/services/masters.service';
import type { EmailDomainDraft, MasterRole, WorkStatusDraft } from '@/features/employee-masters/types';
import { toast } from '@/store/ui.store';

export const masterKeys = {
  all: ['employee-masters'] as const,
  domains: (filter: MasterFilter) => ['employee-masters', 'email-domains', filter] as const,
  statuses: (filter: MasterFilter) => ['employee-masters', 'work-statuses', filter] as const,
};

export const useEmailDomains = (filter: MasterFilter) =>
  useQuery({ queryKey: masterKeys.domains(filter), queryFn: () => mastersService.emailDomains(filter) });

export const useWorkStatuses = (filter: MasterFilter) =>
  useQuery({ queryKey: masterKeys.statuses(filter), queryFn: () => mastersService.workStatuses(filter) });

function useMasterMutation<TVars>(fn: (vars: TVars) => Promise<unknown>, message: (vars: TVars) => string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_result, vars) => {
      toast(message(vars), 'ok');
      void queryClient.invalidateQueries({ queryKey: masterKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useSaveEmailDomain = (role: MasterRole) =>
  useMasterMutation<{ draft: EmailDomainDraft; id?: string }>(
    ({ draft, id }) => mastersService.saveEmailDomain(role, draft, id),
    ({ id }) => (id ? 'Email domain updated.' : 'Email domain added.'),
  );

export const useSaveWorkStatus = (role: MasterRole) =>
  useMasterMutation<{ draft: WorkStatusDraft; id?: string }>(
    ({ draft, id }) => mastersService.saveWorkStatus(role, draft, id),
    ({ id }) => (id ? 'Work status updated.' : 'Work status added.'),
  );
