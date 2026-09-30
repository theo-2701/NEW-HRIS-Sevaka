import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formsService } from '@/features/productivity/services/forms.service';
import type { FormDraft, FormState, ProdActor } from '@/features/productivity/types';
import { toast } from '@/store/ui.store';

const ROOT = ['productivity', 'forms'] as const;

export const formKeys = {
  list: (actor: ProdActor, keyword: string) => [...ROOT, 'list', actor.employeeId, keyword] as const,
  submissions: (actor: ProdActor, formId: string) => [...ROOT, 'submissions', actor.employeeId, formId] as const,
  aggregate: (actor: ProdActor, formId: string) => [...ROOT, 'aggregate', actor.employeeId, formId] as const,
  pending: (actor: ProdActor, formId: string) => [...ROOT, 'pending', actor.employeeId, formId] as const,
  grants: (actor: ProdActor, formId: string) => [...ROOT, 'grants', actor.employeeId, formId] as const,
  distributions: (actor: ProdActor) => [...ROOT, 'distributions', actor.employeeId] as const,
  respondentForm: (actor: ProdActor, formId: string) => [...ROOT, 'respondent-form', actor.employeeId, formId] as const,
  mySubmission: (actor: ProdActor, id: string) => [...ROOT, 'my-submission', actor.employeeId, id] as const,
  changes: (actor: ProdActor, id: string) => [...ROOT, 'changes', actor.employeeId, id] as const,
};

const opts = { retry: false } as const;

export const useForms = (actor: ProdActor, keyword: string) =>
  useQuery({ queryKey: formKeys.list(actor, keyword), queryFn: () => formsService.forms(actor, keyword), ...opts });

export const useFormSubmissions = (actor: ProdActor, formId: string, enabled: boolean) =>
  useQuery({
    queryKey: formKeys.submissions(actor, formId),
    queryFn: () => formsService.submissions(actor, formId),
    enabled,
    ...opts,
  });

export const useFormAggregate = (actor: ProdActor, formId: string, enabled: boolean) =>
  useQuery({
    queryKey: formKeys.aggregate(actor, formId),
    queryFn: () => formsService.aggregate(actor, formId),
    enabled,
    ...opts,
  });

export const usePendingRespondents = (actor: ProdActor, formId: string, enabled: boolean) =>
  useQuery({
    queryKey: formKeys.pending(actor, formId),
    queryFn: () => formsService.pendingRespondents(actor, formId),
    enabled,
    ...opts,
  });

export const useFormGrants = (actor: ProdActor, formId: string, enabled: boolean) =>
  useQuery({
    queryKey: formKeys.grants(actor, formId),
    queryFn: () => formsService.grants(actor, formId),
    enabled,
    ...opts,
  });

export const useDistributions = (actor: ProdActor) =>
  useQuery({ queryKey: formKeys.distributions(actor), queryFn: () => formsService.distributions(actor), ...opts });

export const useRespondentForm = (actor: ProdActor, formId: string | null) =>
  useQuery({
    queryKey: formKeys.respondentForm(actor, formId ?? ''),
    queryFn: () => formsService.formForRespondent(actor, formId!),
    enabled: Boolean(formId),
    ...opts,
  });

export const useMySubmission = (actor: ProdActor, id: string | null) =>
  useQuery({
    queryKey: formKeys.mySubmission(actor, id ?? ''),
    queryFn: () => formsService.mySubmission(actor, id!),
    enabled: Boolean(id),
    ...opts,
  });

export const useSubmissionChanges = (actor: ProdActor, id: string | null) =>
  useQuery({
    queryKey: formKeys.changes(actor, id ?? ''),
    queryFn: () => formsService.submissionChanges(actor, id!),
    enabled: Boolean(id),
    ...opts,
  });

function useFormMutation<TVars, TResult>(
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

export const useCreateForm = () =>
  useFormMutation(
    ({ actor, draft }: { actor: ProdActor; draft: FormDraft }) => formsService.createForm(actor, draft),
    (row) => `201 Created — ${row.code} ${row.formTitle} is open`,
  );

export const useSetFormState = () =>
  useFormMutation(
    ({ actor, id, state }: { actor: ProdActor; id: string; state: FormState }) =>
      formsService.setFormState(actor, id, state),
    (row) => `200 OK — ${row.code} ${row.state === 'DITUTUP' ? 'closed' : 'opened'}`,
  );

export const useDeleteForm = () =>
  useFormMutation(
    ({ actor, id }: { actor: ProdActor; id: string }) => formsService.deleteForm(actor, id),
    () => 'Form deleted',
  );

export const useFormGrant = () =>
  useFormMutation(
    ({
      actor,
      formId,
      targetEmployeeId,
      reason,
    }: {
      actor: ProdActor;
      formId: string;
      targetEmployeeId: string;
      reason: string;
    }) => formsService.grantWindow(actor, formId, targetEmployeeId, reason),
    () => '201 Created — window opened for one person',
  );

export const useSubmitForm = () =>
  useFormMutation(
    ({ actor, formId, answers }: { actor: ProdActor; formId: string; answers: Record<string, string[]> }) =>
      formsService.submit(actor, formId, answers),
    (result) => `201 Created — ${result.itemCount} answers sent`,
  );

export const useEditSubmission = () =>
  useFormMutation(
    ({ actor, id, answers }: { actor: ProdActor; id: string; answers: Record<string, string[]> }) =>
      formsService.editSubmission(actor, id, answers),
    (changed) =>
      changed ? `200 OK — ${changed} answer${changed === 1 ? '' : 's'} changed` : '200 OK — nothing changed',
  );
