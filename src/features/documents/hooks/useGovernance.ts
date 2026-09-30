import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  accessTrailService,
  categoryAdminService,
  letterService,
  malwareService,
  verifyService,
} from '@/features/documents/services/document.service';
import type {
  AccessTrailSearch,
  BatchSearch,
  CategoryAttributes,
  CategoryDraft,
  DocActor,
  LetterDraft,
  MalwareSearch,
} from '@/features/documents/types';
import { toast } from '@/store/ui.store';

/** Seluruh kunci berakar 'documents' supaya mutasi apa pun menyegarkan katalog Files juga. */
const ROOT = ['documents'] as const;
const opts = { retry: false } as const;

export const govKeys = {
  issuable: (actor: DocActor) => [...ROOT, 'gov-issuable', actor.employeeId, actor.role] as const,
  pending: (actor: DocActor) => [...ROOT, 'pending-letters', actor.employeeId, actor.role] as const,
  batches: (actor: DocActor, search: BatchSearch) =>
    [...ROOT, 'batches', actor.employeeId, actor.role, search] as const,
  report: (actor: DocActor, id: string) => [...ROOT, 'batch-report', actor.role, id] as const,
  letter: (id: string) => [...ROOT, 'letter', id] as const,
  categories: (actor: DocActor, includeInactive: boolean) =>
    [...ROOT, 'category-admin', actor.employeeId, actor.role, includeInactive] as const,
  trail: (actor: DocActor, search: AccessTrailSearch) => [...ROOT, 'trail', actor.role, search] as const,
  malware: (actor: DocActor, search: MalwareSearch) => [...ROOT, 'malware', actor.role, search] as const,
};

export const useOfficerTemplates = (actor: DocActor) =>
  useQuery({ queryKey: govKeys.issuable(actor), queryFn: () => letterService.issuableTemplates(actor), ...opts });

export const usePendingLetters = (actor: DocActor) =>
  useQuery({ queryKey: govKeys.pending(actor), queryFn: () => letterService.pendingLetters(actor), ...opts });

export const useBatches = (actor: DocActor, search: BatchSearch) =>
  useQuery({ queryKey: govKeys.batches(actor, search), queryFn: () => letterService.batches(actor, search), ...opts });

export const useBatchReport = (actor: DocActor, id: string | null) =>
  useQuery({
    queryKey: govKeys.report(actor, id ?? ''),
    queryFn: () => letterService.batchReport(actor, id!),
    enabled: Boolean(id),
    ...opts,
  });

export const useLetter = (id: string | null) =>
  useQuery({ queryKey: govKeys.letter(id ?? ''), queryFn: () => letterService.letter(id!), enabled: Boolean(id) });

export const useCategoryAdmin = (actor: DocActor, includeInactive: boolean) =>
  useQuery({
    queryKey: govKeys.categories(actor, includeInactive),
    queryFn: () => categoryAdminService.list(actor, includeInactive),
    ...opts,
  });

export const useAccessTrail = (actor: DocActor, search: AccessTrailSearch) =>
  useQuery({
    queryKey: govKeys.trail(actor, search),
    queryFn: () => accessTrailService.search(actor, search),
    ...opts,
  });

export const useMalwareAlerts = (actor: DocActor, search: MalwareSearch) =>
  useQuery({ queryKey: govKeys.malware(actor, search), queryFn: () => malwareService.search(actor, search), ...opts });

/** Galat gerbang ditampilkan di modal (banner); hanya sukses yang di-toast. */
function useGovMutation<TVars, TResult>(
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

export const useIssueLetter = () =>
  useGovMutation(
    ({ actor, draft }: { actor: DocActor; draft: LetterDraft }) => letterService.issue(actor, draft),
    (letter) =>
      letter.letterIssuanceState === 'TERBIT'
        ? `201 Created — ${letter.letterNo} issued`
        : '201 Created — waiting for approval before a number is given',
  );

export const useApproveLetter = () =>
  useGovMutation(
    ({
      actor,
      letterId,
      approved,
      reason,
    }: {
      actor: DocActor;
      letterId: string;
      approved: boolean;
      reason?: string;
    }) => letterService.approve(actor, letterId, approved, reason),
    (letter) =>
      letter.letterIssuanceState === 'TERBIT' ? `200 OK — ${letter.letterNo} issued` : '200 OK — letter rejected',
  );

export const useCancelLetter = () =>
  useGovMutation(
    ({ actor, letterId, reason }: { actor: DocActor; letterId: string; reason: string }) =>
      letterService.cancel(actor, letterId, reason),
    (letter) => `200 OK — ${letter.letterNo} cancelled`,
  );

export const useSubmitBatch = () =>
  useGovMutation(
    ({ actor, templateId, recipientIds }: { actor: DocActor; templateId: string; recipientIds: string[] }) =>
      letterService.submitBatch(actor, templateId, recipientIds),
    (batch) => `201 Created — ${batch.code} waiting for approval`,
  );

export const useDecideBatch = () =>
  useGovMutation(
    ({ actor, id, decision }: { actor: DocActor; id: string; decision: 'DISETUJUI' | 'DITOLAK' }) =>
      letterService.decideBatch(actor, id, decision),
    (batch) => `200 OK — ${batch.code} ${batch.batchState === 'DITOLAK' ? 'rejected' : 'approved and run'}`,
  );

export const useCreateCategory = () =>
  useGovMutation(
    ({ actor, draft }: { actor: DocActor; draft: CategoryDraft }) => categoryAdminService.create(actor, draft),
    (row) => `201 Created — ${row.categoryName}`,
  );

export const useUpdateCategory = () =>
  useGovMutation(
    ({ actor, id, patch, ack }: { actor: DocActor; id: string; patch: Partial<CategoryAttributes>; ack?: number }) =>
      categoryAdminService.update(actor, id, patch, ack),
    (result) =>
      result.mode === 'PROPOSED'
        ? '200 OK — proposal waiting for the second person; current values still apply'
        : `200 OK — ${result.category.categoryName} updated`,
  );

export const useSetReaders = () =>
  useGovMutation(
    ({ actor, id, roles, ack }: { actor: DocActor; id: string; roles: string[]; ack?: number }) =>
      categoryAdminService.setReaders(actor, id, roles, ack),
    () => '200 OK — reader roles proposal waiting for the second person',
  );

export const useDecideCategory = () =>
  useGovMutation(
    ({
      actor,
      id,
      decision,
      ack,
      reason,
    }: {
      actor: DocActor;
      id: string;
      decision: 'SETUJU' | 'TOLAK';
      ack?: number;
      reason?: string;
    }) => categoryAdminService.decide(actor, id, decision, { acknowledgedImpactCount: ack, rejectReason: reason }),
    (row) =>
      'rejectReason' in row && row.rejectReason ? '200 OK — proposal rejected' : `200 OK — ${row.categoryName} changed`,
  );

export const useHandleMalware = () =>
  useGovMutation(
    ({ actor, id, note }: { actor: DocActor; id: string; note: string }) => malwareService.handle(actor, id, note),
    () => '200 OK — file deleted and alert marked handled',
  );

export const useVerifyByCode = () =>
  useMutation({ mutationFn: ({ code, name }: { code: string; name: string }) => verifyService.byCode(code, name) });

export const useVerifyByNumber = () =>
  useMutation({
    mutationFn: ({ letterNo, name }: { letterNo: string; name: string }) => verifyService.byNumber(letterNo, name),
  });
