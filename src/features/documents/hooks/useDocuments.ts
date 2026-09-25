import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentService } from '@/features/documents/services/document.service';
import { toast } from '@/store/ui.store';
import type { DocActor, DocumentSearch, TemplateDraft } from '@/features/documents/types';

export const documentKeys = {
  all: ['documents'] as const,
  categories: (actor: DocActor) => ['documents', 'categories', actor.employeeId, actor.role] as const,
  manageable: (actor: DocActor) => ['documents', 'manageable-categories', actor.role] as const,
  search: (actor: DocActor, query: DocumentSearch) =>
    ['documents', 'search', actor.employeeId, actor.role, query] as const,
  detail: (actor: DocActor, id: string) => ['documents', 'detail', actor.employeeId, actor.role, id] as const,
  templates: (actor: DocActor) => ['documents', 'templates', actor.role] as const,
  template: (actor: DocActor, id: string) => ['documents', 'template', actor.role, id] as const,
  issuable: (actor: DocActor) => ['documents', 'issuable', actor.employeeId, actor.role] as const,
};

export const useSelectableCategories = (actor: DocActor) =>
  useQuery({ queryKey: documentKeys.categories(actor), queryFn: () => documentService.selectableCategories(actor) });

export const useManageableCategories = (actor: DocActor, enabled = true) =>
  useQuery({
    queryKey: documentKeys.manageable(actor),
    queryFn: () => documentService.manageableCategories(actor),
    enabled,
  });

export const useDocumentSearch = (actor: DocActor, query: DocumentSearch, enabled = true) =>
  useQuery({
    queryKey: documentKeys.search(actor, query),
    queryFn: () => documentService.search(actor, query),
    enabled,
    retry: false,
  });

export const useDocumentDetail = (actor: DocActor, id: string | null) =>
  useQuery({
    queryKey: documentKeys.detail(actor, id ?? ''),
    queryFn: () => documentService.detail(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useTemplates = (actor: DocActor) =>
  useQuery({ queryKey: documentKeys.templates(actor), queryFn: () => documentService.templates(actor), retry: false });

export const useTemplate = (actor: DocActor, id: string | null) =>
  useQuery({
    queryKey: documentKeys.template(actor, id ?? ''),
    queryFn: () => documentService.template(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useIssuableTemplates = (actor: DocActor, enabled = true) =>
  useQuery({
    queryKey: documentKeys.issuable(actor),
    queryFn: () => documentService.issuableTemplates(actor),
    enabled,
  });

function useDocMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  message: (result: TResult) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      toast(message(result), 'ok');
      void queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

export const useCreateTemplate = () =>
  useDocMutation(
    ({ actor, draft }: { actor: DocActor; draft: TemplateDraft }) => documentService.createTemplate(actor, draft),
    (row) => `201 — ${row.templateName} saved; version 1 is pending approval.`,
  );

export const useAddTemplateVersion = () =>
  useDocMutation(
    ({ actor, id, body }: { actor: DocActor; id: string; body: string }) => documentService.addVersion(actor, id, body),
    (result) => `201 — version ${result.versionNo} submitted for approval. The active version is unchanged.`,
  );

export const useDeactivateTemplate = () =>
  useDocMutation(
    ({ actor, id }: { actor: DocActor; id: string }) => documentService.deactivate(actor, id),
    (result) => (result.changed ? '200 — template deactivated.' : '200 — template was already inactive.'),
  );

export const useDecideTemplate = () =>
  useDocMutation(
    ({
      actor,
      id,
      versionNo,
      decision,
      rejectReason,
    }: {
      actor: DocActor;
      id: string;
      versionNo: number;
      decision: 'DISETUJUI' | 'DITOLAK';
      rejectReason?: string;
    }) => documentService.decide(actor, id, versionNo, decision, rejectReason),
    (result) => `200 — version ${result.versionNo} ${result.state === 'DISETUJUI' ? 'approved' : 'rejected'}.`,
  );

export const useRequestLetter = () =>
  useDocMutation(
    ({ actor, templateId }: { actor: DocActor; templateId: string }) =>
      documentService.requestLetter(actor, templateId),
    (result) =>
      result.letterIssuanceState === 'TERBIT'
        ? `201 — letter ${result.letterNo} issued and added to your files.`
        : '201 — letter request submitted and waiting for approval.',
  );
