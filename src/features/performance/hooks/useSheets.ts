import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sheetService } from '@/features/performance/services/sheet.service';
import { toast } from '@/store/ui.store';
import type { ItemDraft, ItemPatch, PerfActor, SheetSearch } from '@/features/performance/types';

export const sheetKeys = {
  all: ['performance', 'sheets'] as const,
  list: (who: string, query: SheetSearch) => ['performance', 'sheets', 'list', who, query] as const,
  mine: (who: string) => ['performance', 'sheets', 'mine', who] as const,
  detail: (who: string, id: string) => ['performance', 'sheets', 'detail', who, id] as const,
  history: (who: string, id: string) => ['performance', 'sheets', 'history', who, id] as const,
  self: (who: string, id: string) => ['performance', 'sheets', 'self', who, id] as const,
};

/* Cakupan baca ditentukan identitas (pemegang kursi, pemilik), bukan hanya peran — kunci pakai employeeId. */

export const useSheets = (actor: PerfActor, query: SheetSearch, enabled: boolean) =>
  useQuery({
    queryKey: sheetKeys.list(actor.employeeId, query),
    queryFn: () => sheetService.search(actor, query),
    enabled,
  });

export const useMySheetId = (actor: PerfActor, enabled: boolean) =>
  useQuery({ queryKey: sheetKeys.mine(actor.employeeId), queryFn: () => sheetService.resolveMine(actor), enabled });

export const useSheet = (actor: PerfActor, id: string | null | undefined) =>
  useQuery({
    queryKey: sheetKeys.detail(actor.employeeId, id ?? ''),
    queryFn: () => sheetService.get(actor, id!),
    enabled: Boolean(id),
    retry: false,
  });

export const useSupervisorHistory = (actor: PerfActor, id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: sheetKeys.history(actor.employeeId, id ?? ''),
    queryFn: () => sheetService.supervisorHistory(actor, id!),
    enabled: enabled && Boolean(id),
    retry: false,
  });

export const useSelfAssessment = (actor: PerfActor, id: string | undefined, enabled: boolean) =>
  useQuery({
    queryKey: sheetKeys.self(actor.employeeId, id ?? ''),
    queryFn: () => sheetService.readSelfAssessment(actor, id!),
    enabled: enabled && Boolean(id),
    retry: false,
  });

function useSheetMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>, success?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      if (success) toast(success, 'ok');
      void queryClient.invalidateQueries({ queryKey: sheetKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['performance', 'approvals'] });
    },
    onError: (error: Error) => toast(error.message, 'danger'),
  });
}

type Keyed = { idempotencyKey: string };

export const useSaveSelfAssessment = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(
    ({ content, idempotencyKey }: { content: string } & Keyed) =>
      sheetService.saveSelfAssessment(actor, sheetId, content, idempotencyKey),
    'Isian penilaian diri disimpan.',
  );

export const useMarkRead = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(
    ({ itemId, idempotencyKey }: { itemId: string } & Keyed) =>
      sheetService.markRead(actor, sheetId, itemId, idempotencyKey),
    'Baris ditandai sudah dibaca.',
  );

export const useSaveObjectionNote = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(
    ({ itemId, note, idempotencyKey }: { itemId: string; note: string } & Keyed) =>
      sheetService.saveObjectionNote(actor, sheetId, itemId, note, idempotencyKey),
    'Catatan keberatan disimpan.',
  );

export const useAddItem = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(
    ({ draft, idempotencyKey }: { draft: ItemDraft } & Keyed) => sheetService.addItem(actor, sheetId, draft, idempotencyKey),
    'Baris nilai ditambahkan.',
  );

export const useUpdateItem = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(
    ({ itemId, patch, idempotencyKey }: { itemId: string; patch: ItemPatch } & Keyed) =>
      sheetService.updateItem(actor, sheetId, itemId, patch, idempotencyKey),
    'Baris nilai diperbarui.',
  );

export const useDeleteItem = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(
    ({ itemId, idempotencyKey }: { itemId: string } & Keyed) =>
      sheetService.deleteItem(actor, sheetId, itemId, idempotencyKey),
    'Baris nilai dihapus.',
  );

export const useSetValue = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(
    ({ kind, itemId, value, idempotencyKey }: { kind: 'initial' | 'submitted'; itemId: string; value: string } & Keyed) =>
      kind === 'initial'
        ? sheetService.setInitialValue(actor, sheetId, itemId, value, idempotencyKey)
        : sheetService.setSubmittedValue(actor, sheetId, itemId, value, idempotencyKey),
    'Nilai disimpan.',
  );

/** Toast sukses ditulis pemanggil — isinya memakai nama penyetuju dari respons. */
export const useSubmitSheet = (actor: PerfActor, sheetId: string) =>
  useSheetMutation(() => sheetService.submit(actor, sheetId));
